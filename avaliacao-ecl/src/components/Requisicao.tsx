import React, { useState } from 'react';
import { getPlanosAulaPorTurma, getFichasProducao, addOrUpdateRequisicao } from '../backend';
import { PlanoAula, FichaProducao } from '../types';
import { encontrarMateriaPrima } from '../materiasPrimasBase';
import {
  processarIngrediente,
  obterRendimento,
} from '../requisicaoLogica';

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxs2Fn0xWPNsfxw1Kx4J62eOYX_nEq1zbwIKeLlUAwOzuxmbU_xlijaLGFzV7AIaBb3Ig/exec';

// ── Linha da requisição ───────────────────────────────────────
interface Linha {
  id: string;
  produto: string;
  und: string;
  // Quantidades
  qt1pax: number;        // qty por 1 dose (base de cálculo)
  qtReceita: number;     // qty total receita base (soma das fichas)
  qtEncomenda: number;   // qty para o nº doses pedido (editável)
  // Preços
  precoUnitario: string; // €/kg ou €/un (editável)
  precoReceita: number;  // precoUnitario × qtReceita
  preco1pax: number;     // precoUnitario × qt1pax
  precoEncomenda: number; // precoUnitario × qtEncomenda
  // Meta
  fichas: string[];
  daBD: boolean;
  avisos: string[];
  isQB: boolean;
  perguntarProfessor: boolean;
  decisaoProfessor?: 'comprar' | 'produzir';
}

function recalc(l: Linha): Linha {
  const p = parseFloat(l.precoUnitario) || 0;
  return { ...l, precoReceita: p * l.qtReceita, preco1pax: p * l.qt1pax, precoEncomenda: p * l.qtEncomenda };
}

// ── Agregação central ─────────────────────────────────────────
function agregarIngredientes(fichas: FichaProducao[], paxPorFicha: Record<string, number>): Linha[] {
  const mapa = new Map<string, Linha>();

  fichas.forEach(f => {
    const paxBase = parseFloat(f.numPorcoes) || 1;
    const paxPedido = paxPorFicha[f.id] || paxBase;
    const fator = paxPedido / paxBase;

    f.ingredientes.forEach(ing => {
      if (!ing.produto?.trim()) return;

      const proc = processarIngrediente(ing.produto, ing.qt, ing.un, f.nomePrato);
      if (proc.excluir) return;

      const qtReceitaBase = proc.qtKg;
      const qt1pax = paxBase > 0 ? qtReceitaBase / paxBase : 0;
      const qtEncomenda = qt1pax * paxPedido;

      // ── Chave de consolidação ──────────────────────────────
      // Regra 1: QB e quantidade normal do MESMO produto juntam-se
      //   → usar und da unidade base (kg/un/l), nunca 'q.b.' na chave
      // Regra 2: manteiga c/sal ≠ manteiga s/sal (palavras distintas)
      //   → preservar "com sal" / "sem sal" no nome do produto
      const produtoChave = proc.produto.toLowerCase().trim();
      const undChave = proc.isQB ? (proc.und === 'un' ? 'un' : 'kg') : proc.und;
      const chave = `${produtoChave}__${undChave}`;

      // Verificar se existe uma linha normal (não QB) com este produto
      // Se sim, juntar mesmo que a actual seja QB
      const chaveNormal = `${produtoChave}__${proc.und === 'un' ? 'un' : 'kg'}`;

      const mp = encontrarMateriaPrima(proc.produto);
      const precoUnitario = (mp && mp.precoKg > 0) ? mp.precoKg.toFixed(2) : '';

      // Aviso: unidade 'un' que não é ovo
      const avisos = [...proc.avisos];
      if (proc.und === 'un' && !/(ov[oa]|egg)/i.test(proc.produto)) {
        avisos.push(`⚠️ "${proc.produto}" ficou em unidades — verificar se é correcto`);
      }

      const chaveUsada = mapa.has(chaveNormal) ? chaveNormal : chave;

      if (mapa.has(chaveUsada)) {
        const l = mapa.get(chaveUsada)!;
        // QB soma como quantidade mínima estimada
        l.qtReceita += qtReceitaBase;
        l.qt1pax += qt1pax;
        l.qtEncomenda += qtEncomenda;
        // Se tinha QB e agora tem quantidade real, marcar como não-QB
        if (!proc.isQB) l.isQB = false;
        l.precoReceita = (parseFloat(l.precoUnitario)||0) * l.qtReceita;
        l.preco1pax = (parseFloat(l.precoUnitario)||0) * l.qt1pax;
        l.precoEncomenda = (parseFloat(l.precoUnitario)||0) * l.qtEncomenda;
        if (!l.fichas.includes(f.nomePrato)) l.fichas.push(f.nomePrato);
        if (avisos.length > 0) l.avisos.push(...avisos.filter(a => !l.avisos.includes(a)));
      } else {
        const p = parseFloat(precoUnitario) || 0;
        mapa.set(chaveUsada, {
          id: chaveUsada,
          produto: proc.produto,
          und: proc.isQB ? (proc.und === 'un' ? 'un' : 'kg') : proc.und,
          qt1pax,
          qtReceita: qtReceitaBase,
          qtEncomenda,
          precoUnitario,
          precoReceita: p * qtReceitaBase,
          preco1pax: p * qt1pax,
          precoEncomenda: p * qtEncomenda,
          fichas: [f.nomePrato],
          daBD: !!mp,
          avisos,
          isQB: proc.isQB,
          perguntarProfessor: proc.perguntarProfessor,
        });
      }
    });
  });

  return Array.from(mapa.values()).sort((a, b) => {
    if (a.isQB !== b.isQB) return a.isQB ? 1 : -1;
    return a.produto.localeCompare(b.produto, 'pt');
  });
}

// ── Formatadores ──────────────────────────────────────────────
const fE = (n: number) => n > 0 ? `${n.toFixed(2)} €` : '—';
const fQ = (n: number, und: string) => {
  if (und === 'q.b.' || n === 0) return 'q.b.';
  if (und === 'un') return `${Math.round(n)} un`;
  return n >= 1 ? `${n.toFixed(3)} ${und}` : `${(n * 1000).toFixed(0)} g`; // <1kg mostrar em g
};
const fQn = (n: number, und: string) => {
  if (n === 0) return '';
  if (und === 'un') return String(Math.round(n));
  return n >= 1 ? n.toFixed(3) : n.toFixed(4);
};

// ── Estilos ───────────────────────────────────────────────────
const S = {
  card: { background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '18px', marginBottom: 12, boxShadow: 'var(--shadow-sm)' } as React.CSSProperties,
  muted: { fontSize: 12, color: 'rgba(26,23,20,0.5)' } as React.CSSProperties,
  lbl: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block', marginBottom: 4, color: 'rgba(26,23,20,0.5)' },
  inp: { fontFamily: 'var(--font-body)', fontSize: 12, padding: '6px 8px', borderRadius: 7, border: '1.5px solid rgba(26,23,20,0.15)', background: '#fff', color: '#1a1714', boxSizing: 'border-box' as const },
  btnP: { padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  btnG: { padding: '10px 18px', borderRadius: 10, border: '1.5px solid rgba(26,23,20,0.15)', background: 'transparent', color: '#1a1714', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
};

// ═══════════════════════════════════════════════════════════════
export default function Requisicao({ nomeProfessor }: { nomeProfessor?: string }) {
  const [fase, setFase] = useState<'escolher' | 'editar'>('escolher');

  const planos = getPlanosAulaPorTurma('CP1');
  const [planoSel, setPlanoSel] = useState<PlanoAula | null>(planos[0] || null);
  const [fichasSel, setFichasSel] = useState<string[]>(planos[0]?.fichasIds || []);
  const [paxPorFicha, setPaxPorFicha] = useState<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    planos[0]?.fichasIds.forEach(fid => {
      const f = getFichasProducao().find(x => x.id === fid);
      if (f) r[fid] = parseFloat(f.numPorcoes) || 4;
    });
    return r;
  });
  const [quebras, setQuebras] = useState(10);
  const [bevCost, setBevCost] = useState(20);
  const [consumo, setConsumo] = useState({ bar: false, rest: true, interno: false, convidados: false });
  const [responsavel, setResponsavel] = useState('');
  const [atividade, setAtividade] = useState('');
  const [familia, setFamilia] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [msg, setMsg] = useState('');

  const todasFichas = getFichasProducao();
  const fichasDisp = planoSel ? todasFichas.filter(f => planoSel.fichasIds.includes(f.id)) : [];
  const fichasExtra = todasFichas.filter(f => !fichasDisp.find(fd => fd.id === f.id));
  const fichasSelecionadas = todasFichas.filter(f => fichasSel.includes(f.id));

  const paxBaseTotal = fichasSelecionadas.reduce((s, f) => s + (parseFloat(f.numPorcoes) || 1), 0) || 1;
  const paxEncTotal = fichasSelecionadas.reduce((s, f) => s + (paxPorFicha[f.id] || parseFloat(f.numPorcoes) || 1), 0) || 1;
  const nomeReceita = fichasSelecionadas.map(f => f.nomePrato).join(' + ') || 'Requisicao';

  function selecionarPlano(p: PlanoAula) {
    setPlanoSel(p);
    setFichasSel(p.fichasIds);
    const r: Record<string, number> = {};
    p.fichasIds.forEach(fid => {
      const f = todasFichas.find(x => x.id === fid);
      if (f) r[fid] = parseFloat(f.numPorcoes) || 4;
    });
    setPaxPorFicha(r);
  }

  function toggleFicha(id: string) {
    setFichasSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const f = todasFichas.find(x => x.id === id);
    if (f && !paxPorFicha[id]) setPaxPorFicha(p => ({ ...p, [id]: parseFloat(f.numPorcoes) || 4 }));
  }

  function gerarLinhas() {
    setLinhas(agregarIngredientes(fichasSelecionadas, paxPorFicha));
    setFase('editar');
  }

  function setL(i: number, campo: string, v: string | number) {
    setLinhas(prev => { const n = [...prev]; n[i] = recalc({ ...n[i], [campo]: v }); return n; });
  }

  function setQtEnc(i: number, v: number) {
    setLinhas(prev => { const n = [...prev]; n[i] = recalc({ ...n[i], qtEncomenda: v }); return n; });
  }

  function setDecisao(i: number, d: 'comprar' | 'produzir') {
    setLinhas(prev => { const n = [...prev]; n[i] = { ...n[i], decisaoProfessor: d, perguntarProfessor: false }; return n; });
  }

  // Totais
  const linhasAtivas = linhas.filter(l => l.decisaoProfessor !== 'produzir');
  const totEnc = linhasAtivas.reduce((s, l) => s + l.precoEncomenda, 0);
  const qbVal = totEnc * (quebras / 100);
  const crTotal = totEnc + qbVal;
  const cr1pax = paxEncTotal > 0 ? crTotal / paxEncTotal : 0;
  const pvs = bevCost > 0 ? cr1pax / (bevCost / 100) : 0;
  const pvp = pvs * 1.13;
  const todosAvisos = linhas.flatMap(l => l.avisos).filter(Boolean);
  const linhasNormais = linhas.filter(l => !l.isQB && !l.perguntarProfessor);
  const linhasQB = linhas.filter(l => l.isQB);
  const linhasPergunta = linhas.filter(l => l.perguntarProfessor);

  // Envio Sheets — estrutura exacta do template ECL
  async function enviarSheets() {
    setMsg('A enviar para Google Sheets...');
    try {
      const payload = {
        nomeReceita, familia,
        paxTotal: paxEncTotal,   // H7 — Encomendas
        paxReceita: paxBaseTotal, // L7 — Receita para
        turma: planoSel?.turmaId || '',
        dataAula: planoSel?.data || '',
        formador: nomeProfessor || planoSel?.professor || '',
        responsavel,  // N42
        atividade,    // K47
        preparacao: '',
        consumo: { bar: consumo.bar, rest: consumo.rest, interno: consumo.interno, convidados: consumo.convidados },
        // Ingredientes → linhas 16+ do Sheets
        // A=qty1pax | B=qtReceita | C=nome | H=und | J=precoUnitario
        ingredientes: linhasAtivas.filter(l => !l.isQB).map(l => ({
          nome: l.produto,
          qty1pax: fQn(l.qt1pax, l.und),
          qtReceita: fQn(l.qtReceita, l.und),
          und: l.und,
          preco: l.precoUnitario || '0',
        })),
      };
      const form = new FormData();
      form.append('dados', JSON.stringify(payload));
      await fetch(SHEETS_URL, { method: 'POST', mode: 'no-cors', body: form });
      setMsg('✓ Enviado para o Google Sheets!');
    } catch (e) { setMsg('Erro: ' + String(e)); }
    setTimeout(() => setMsg(''), 6000);
  }

  // ── FASE 1 — ESCOLHER ─────────────────────────────────────
  if (fase === 'escolher') {
    return (
      <div>
        <div style={S.card}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Nova Requisicao</div>
          <div style={S.muted}>Seleciona o plano, as fichas de producao e o numero de doses.</div>
        </div>

        {/* 1. Plano */}
        <div style={S.card}>
          <label style={S.lbl}>1. Plano de aula</label>
          {planos.length === 0 && <div style={S.muted}>Sem planos criados. Cria primeiro um plano de aula.</div>}
          {planos.map(p => {
            const d = new Date(p.data + 'T12:00:00');
            return (
              <div key={p.id} onClick={() => selecionarPlano(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${planoSel?.id === p.id ? 'var(--copper)' : 'var(--border)'}`, background: planoSel?.id === p.id ? 'var(--copper-pale)' : '#fff', marginBottom: 6, cursor: 'pointer' }}>
                <div style={{ background: 'var(--copper-pale)', borderRadius: 8, padding: '6px 8px', textAlign: 'center', flexShrink: 0, minWidth: 40 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--copper)', lineHeight: 1 }}>{d.getDate().toString().padStart(2, '0')}</div>
                  <div style={{ fontSize: 9, color: 'var(--copper)', textTransform: 'uppercase', fontWeight: 600 }}>{d.toLocaleDateString('pt-PT', { month: 'short' })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.titulo}</div>
                  <div style={S.muted}>{p.turmaId} · {p.fichasIds.length} fichas</div>
                </div>
                {planoSel?.id === p.id && <span style={{ color: 'var(--copper)' }}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* 2. Fichas e doses */}
        {planoSel && (
          <div style={S.card}>
            <label style={S.lbl}>2. Fichas de producao e doses</label>
            <div style={{ ...S.muted, marginBottom: 10 }}>Seleciona as fichas e define as doses pretendidas para cada uma.</div>
            {[...fichasDisp, ...fichasExtra].map(f => (
              <div key={f.id} style={{ border: `1.5px solid ${fichasSel.includes(f.id) ? 'var(--copper)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 6, background: fichasSel.includes(f.id) ? 'var(--copper-pale)' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div onClick={() => toggleFicha(f.id)} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', border: `1.5px solid ${fichasSel.includes(f.id) ? 'var(--copper)' : 'rgba(26,23,20,0.2)'}`, background: fichasSel.includes(f.id) ? 'var(--copper)' : 'transparent' }}>
                    {fichasSel.includes(f.id) && 'v'}
                  </div>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleFicha(f.id)}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nomePrato}</div>
                    <div style={S.muted}>{f.classificacao} · receita base: {f.numPorcoes} doses</div>
                  </div>
                  {fichasSel.includes(f.id) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: 'var(--copper)', fontWeight: 600 }}>Doses:</span>
                      <input type="number" min={1} value={paxPorFicha[f.id] || parseFloat(f.numPorcoes) || 4}
                        onChange={e => setPaxPorFicha(p => ({ ...p, [f.id]: Number(e.target.value) }))}
                        style={{ ...S.inp, width: 60, textAlign: 'center' }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Dados adicionais */}
        {planoSel && fichasSel.length > 0 && (
          <div style={S.card}>
            <label style={S.lbl}>3. Dados adicionais</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div><label style={S.lbl}>Familia / Classificacao</label><input style={{ ...S.inp, width: '100%' }} value={familia} onChange={e => setFamilia(e.target.value)} placeholder="ex: Peixe, Sobremesa..." /></div>
              <div><label style={S.lbl}>Quebras (%)</label><input style={{ ...S.inp, width: '100%' }} type="number" value={quebras} onChange={e => setQuebras(Number(e.target.value))} /></div>
              <div><label style={S.lbl}>Beverage Cost (%)</label><input style={{ ...S.inp, width: '100%' }} type="number" value={bevCost} onChange={e => setBevCost(Number(e.target.value))} /></div>
              <div><label style={S.lbl}>Responsavel compras</label><input style={{ ...S.inp, width: '100%' }} value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome" /></div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={S.lbl}>Atividade</label>
              <input style={{ ...S.inp, width: '100%' }} value={atividade} onChange={e => setAtividade(e.target.value)} placeholder="ex: Almoco dos Pais · ECL Restaurante" />
            </div>
            <div>
              <label style={S.lbl}>Consumo</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {([['bar', 'ECL BAR'], ['rest', 'ECL Restaurante'], ['interno', 'Consumo Interno'], ['convidados', 'Convidados']] as const).map(([k, l]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${consumo[k] ? 'var(--copper)' : 'var(--border)'}`, background: consumo[k] ? 'var(--copper-pale)' : '#fff', cursor: 'pointer', fontSize: 12 }}>
                    <input type="checkbox" checked={consumo[k]} onChange={e => setConsumo(p => ({ ...p, [k]: e.target.checked }))} style={{ accentColor: 'var(--copper)' }} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {planoSel && fichasSel.length > 0 && (
          <button style={{ ...S.btnP, width: '100%' }} onClick={gerarLinhas}>
            Gerar requisicao — {fichasSel.length} ficha{fichasSel.length > 1 ? 's' : ''} · {paxEncTotal} doses →
          </button>
        )}
      </div>
    );
  }

  // ── FASE 2 — EDITAR E ENVIAR ──────────────────────────────
  return (
    <div>
      <button style={{ ...S.btnG, marginBottom: 12 }} onClick={() => setFase('escolher')}>← Voltar</button>

      {/* Cabecalho tipo ficha ECL */}
      <div style={{ background: 'var(--charcoal)', borderRadius: 14, padding: '18px', marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>{nomeReceita}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[['Familia', familia || '—'], ['Encomendas', `${paxEncTotal} doses`], ['Receita para', `${paxBaseTotal} doses`], ['Turma', planoSel?.turmaId || '—'], ['Data aula', planoSel?.data || '—'], ['Formador', planoSel?.professor || '—']].map(([l, v]) => (
            <div key={l}><div style={{ fontSize: 9, color: 'rgba(247,241,230,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div><div style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 500 }}>{v}</div></div>
          ))}
        </div>
        {atividade && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(247,241,230,0.7)' }}>Atividade: {atividade}</div>}
        {responsavel && <div style={{ fontSize: 11, color: 'rgba(247,241,230,0.6)' }}>Resp. compras: {responsavel}</div>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {fichasSelecionadas.map(f => (
            <span key={f.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(247,241,230,0.1)', color: 'var(--cream)' }}>
              {f.nomePrato} · {paxPorFicha[f.id] || parseFloat(f.numPorcoes) || 1} doses
            </span>
          ))}
        </div>
      </div>

      {/* Decisao produzir/comprar */}
      {linhasPergunta.length > 0 && (
        <div style={{ ...S.card, border: '1.5px solid var(--copper)', background: 'var(--copper-pale)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--copper)', marginBottom: 8 }}>Decisao necessaria — produzir ou comprar?</div>
          {linhasPergunta.map(l => {
            const i = linhas.indexOf(l);
            return (
              <div key={l.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(181,101,29,0.2)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{l.produto}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['comprar', 'produzir'] as const).map(d => (
                    <button key={d} onClick={() => setDecisao(i, d)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1.5px solid ${l.decisaoProfessor === d ? (d === 'comprar' ? 'var(--copper)' : 'var(--sage)') : 'var(--border)'}`, background: l.decisaoProfessor === d ? (d === 'comprar' ? 'var(--copper)' : 'var(--sage)') : '#fff', color: l.decisaoProfessor === d ? 'white' : 'var(--charcoal)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      {d === 'comprar' ? 'Comprar' : 'Produzir em aula'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conversoes automaticas */}
      {todosAvisos.length > 0 && (
        <div style={{ ...S.card, background: 'var(--info-pale)', border: '1px solid rgba(37,99,235,0.2)' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--info)', marginBottom: 6 }}>Conversoes automaticas aplicadas</div>
          {todosAvisos.map((a, i) => <div key={i} style={{ fontSize: 11, color: 'var(--info)', marginBottom: 2 }}>→ {a}</div>)}
        </div>
      )}

      {/* Resumo financeiro */}
      <div style={S.card}>
        <label style={S.lbl}>Resumo financeiro</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center', marginBottom: 10 }}>
          {[['CR/dose', fE(cr1pax)], ['PVS s/IVA', fE(pvs)], ['PVP c/IVA 13%', fE(pvp)], ['Bev.Cost', `${bevCost}%`]].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--copper-pale)', borderRadius: 10, padding: '10px 4px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--copper)' }}>{v}</div>
              <div style={S.muted}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
          {[['Total Encomenda', fE(totEnc)], [`Quebras ${quebras}%`, fE(qbVal)], ['Custo Real Total', fE(crTotal)]].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              <div style={S.muted}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela ingredientes — editavel */}
      <div style={S.card}>
        <label style={S.lbl}>Ingredientes — {linhasNormais.length} produtos · todos editaveis</label>
        <div style={S.muted}>Produto, unidade, quantidade e preco podem ser corrigidos. Agua excluida automaticamente.</div>
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--charcoal)', color: 'var(--cream)' }}>
                <th style={{ padding: '7px 8px', textAlign: 'left', minWidth: 130 }}>Produto</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 55, fontSize: 9 }}>Qt/pax</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 55, fontSize: 9 }}>Qt Receita</th>
                <th style={{ padding: '7px 4px', textAlign: 'left', minWidth: 38 }}>Und</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 65, fontSize: 9 }}>Qt Enc.</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 58, fontSize: 9 }}>€/kg</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 55, fontSize: 9 }}>€ Enc.</th>
              </tr>
            </thead>
            <tbody>
              {linhasNormais.map(l => {
                const i = linhas.indexOf(l);
                const rend = obterRendimento(l.produto);
                return (
                  <tr key={l.id} style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '3px 4px' }}>
                      <input value={l.produto} onChange={e => setL(i, 'produto', e.target.value)} style={{ ...S.inp, width: '100%', fontSize: 11 }} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        {l.daBD && <span style={{ fontSize: 9, color: 'var(--sage)' }}>BD</span>}
                        {rend && <span style={{ fontSize: 8, color: 'rgba(26,23,20,0.35)' }}>Rend. {Math.round(rend.rendimento * 100)}%</span>}
                      </div>
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', color: 'rgba(26,23,20,0.4)', fontSize: 10 }}>{fQn(l.qt1pax, l.und)}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', color: 'rgba(26,23,20,0.4)', fontSize: 10 }}>{fQn(l.qtReceita, l.und)}</td>
                    <td style={{ padding: '3px 3px' }}>
                      <select value={l.und} onChange={e => setL(i, 'und', e.target.value)} style={{ ...S.inp, width: 45, padding: '4px 3px', fontSize: 11 }}>
                        <option>kg</option><option>l</option><option>un</option><option>q.b.</option>
                      </select>
                    </td>
                    <td style={{ padding: '3px 3px' }}>
                      <input type="number" step="0.001" value={l.qtEncomenda.toFixed(3)}
                        onChange={e => setQtEnc(i, parseFloat(e.target.value) || 0)}
                        style={{ ...S.inp, width: 65, textAlign: 'right', fontSize: 11 }} />
                    </td>
                    <td style={{ padding: '3px 3px' }}>
                      <input value={l.precoUnitario} onChange={e => setL(i, 'precoUnitario', e.target.value)}
                        style={{ ...S.inp, width: 58, textAlign: 'right', fontSize: 11, background: l.daBD ? 'var(--sage-pale)' : '#fff' }}
                        placeholder="0.00" />
                    </td>
                    <td style={{ padding: '3px 5px', textAlign: 'right', fontWeight: l.precoEncomenda > 0 ? 600 : 400, color: l.precoEncomenda > 0 ? 'var(--copper)' : 'rgba(26,23,20,0.2)' }}>
                      {l.precoEncomenda > 0 ? fE(l.precoEncomenda) : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--copper-pale)', fontWeight: 700 }}>
                <td colSpan={6} style={{ padding: '8px 8px', fontSize: 12 }}>Total Encomenda</td>
                <td style={{ padding: '8px 5px', textAlign: 'right', color: 'var(--copper)', fontSize: 12 }}>{fE(totEnc)}</td>
              </tr>
              <tr style={{ background: 'var(--cream-dark)' }}>
                <td colSpan={6} style={{ padding: '6px 8px', fontSize: 11 }}>Quebras {quebras}%</td>
                <td style={{ padding: '6px 5px', textAlign: 'right', fontSize: 11 }}>{fE(qbVal)}</td>
              </tr>
              <tr style={{ background: 'var(--danger-pale)', fontWeight: 700 }}>
                <td colSpan={6} style={{ padding: '8px 8px', fontSize: 12 }}>Custo Real Total</td>
                <td style={{ padding: '8px 5px', textAlign: 'right', color: 'var(--danger)', fontSize: 12 }}>{fE(crTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* QB */}
      {linhasQB.length > 0 && (
        <div style={S.card}>
          <label style={S.lbl}>Ingredientes q.b. — quantidade minima estimada</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {linhasQB.map(l => (
              <div key={l.id} style={{ padding: '5px 10px', borderRadius: 8, background: 'var(--cream-dark)', border: '1px solid var(--border)', fontSize: 11 }}>
                <span style={{ fontWeight: 600 }}>{l.produto}</span>
                <span style={S.muted}> · {fQ(l.qtEncomenda, l.und)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consumo */}
      <div style={{ ...S.card, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
          {responsavel && <span><strong>Resp. compras:</strong> {responsavel}</span>}
          {atividade && <span><strong>Atividade:</strong> {atividade}</span>}
          <span><strong>Consumo:</strong> {Object.entries(consumo).filter(([, v]) => v).map(([k]) => k === 'bar' ? 'ECL BAR' : k === 'rest' ? 'ECL Restaurante' : k === 'interno' ? 'Consumo Interno' : 'Convidados').join(', ') || '—'}</span>
        </div>
      </div>

      {msg && <div style={{ padding: '10px 14px', background: 'var(--sage-pale)', borderRadius: 10, fontSize: 13, color: 'var(--sage)', marginBottom: 10, fontWeight: 600 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={S.btnP} onClick={enviarSheets}>Enviar para Google Sheets</button>
        <button style={S.btnG} onClick={() => {
          if (!planoSel) return;
          addOrUpdateRequisicao({
            id: `req_${planoSel.id}`, planoAulaId: planoSel.id, turmaId: planoSel.turmaId,
            dataAula: planoSel.data, professor: planoSel.professor, fichasIds: fichasSel,
            linhas: linhas.map((l, i) => ({ id: `l${i}`, produto: l.produto, unidade: l.und, quantidadeTotal: l.qtEncomenda, precoUnitario: parseFloat(l.precoUnitario) || undefined, custoTotal: l.precoEncomenda, obs: '' })),
            custoTotal: crTotal, estado: 'rascunho', criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString(),
          });
          setMsg('Guardado!'); setTimeout(() => setMsg(''), 2000);
        }}>Guardar</button>
        <button style={S.btnG} onClick={() => window.print()}>Imprimir</button>
      </div>
    </div>
  );
}

