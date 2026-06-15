import React, { useState, useEffect } from 'react';
import { getPlanosAulaPorTurma, getFichasProducao, addOrUpdateRequisicao } from '../backend';
import { PlanoAula, FichaProducao } from '../types';
import { encontrarMateriaPrima } from '../materiasPrimasBase';
import { converterUnidadeParaPeso } from '../pesosMedios';

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxs2Fn0xWPNsfxw1Kx4J62eOYX_nEq1zbwIKeLlUAwOzuxmbU_xlijaLGFzV7AIaBb3Ig/exec';

// ── Remover marcas ────────────────────────────────────────────
const MARCAS = ['knorr','sidul','seara','continente','pingo doce','vaqueiro','mimosa','parmalat','compal','sumol','bom petisco','terra do bacalhau','pescanova','iglo','findus','campofrio','salsicharia','lusiteca','imperial','nobre','dias','matinal','predilecta','gallo','oliveira da serra'];
function limparMarca(nome: string): string {
  let n = nome.trim();
  for (const m of MARCAS) {
    n = n.replace(new RegExp(`\\b${m}\\b`, 'gi'), '').replace(/\s+/g, ' ').trim();
  }
  return n || nome.trim();
}

// ── Converter unidades para base kg/l/un ─────────────────────
function converterBase(qt: number, und: string): { qt: number; und: string } {
  const u = (und||'').toLowerCase().trim();
  if (['g','gr','gramas','grama'].includes(u)) return { qt: qt/1000, und: 'kg' };
  if (['mg'].includes(u)) return { qt: qt/1000000, und: 'kg' };
  if (['ml'].includes(u)) return { qt: qt/1000, und: 'l' };
  if (['dl'].includes(u)) return { qt: qt/10, und: 'l' };
  if (['cl'].includes(u)) return { qt: qt/100, und: 'l' };
  if (['cs','c.s.','colher de sopa'].includes(u)) return { qt: qt*0.015, und: 'kg' };
  if (['cc','c.c.','colher de cha'].includes(u)) return { qt: qt*0.005, und: 'kg' };
  if (['kg'].includes(u)) return { qt, und: 'kg' };
  if (['l','lt','litro','litros'].includes(u)) return { qt, und: 'l' };
  if (['dente','dentes'].includes(u)) return { qt: qt*0.006, und: 'kg' };
  if (['folha','folhas'].includes(u)) return { qt: qt*0.001, und: 'kg' };
  if (['ramo','ramos'].includes(u)) return { qt: qt*0.015, und: 'kg' };
  if (!u || u === 'q.b.' || u === 'qb') return { qt: 0, und: 'q.b.' };
  return { qt, und: und||'un' };
}

// ── Linha da requisição ───────────────────────────────────────
interface Linha {
  id: string;
  produto: string;
  und: string;
  qtPorFicha: Record<string, number>; // qty base por ficha
  qtReceita: number;   // qty total na receita base (soma de todas fichas * fator_base)
  qt1pax: number;      // qty por 1 pax (qtReceita / paxBase)
  qtEncomenda: number; // qty para o pax pedido (editável)
  precoUnitario: string; // €/kg ou €/un (editável)
  precoReceita: number;  // custo para qtReceita
  preco1pax: number;     // custo por 1 pax
  precoEncomenda: number; // custo total encomenda
  fichas: string[];
  daBD: boolean;
  aviso?: string;
}

function calcLinhas(linhas: Linha[]): Linha[] {
  return linhas.map(l => {
    const p = parseFloat(l.precoUnitario) || 0;
    return {
      ...l,
      precoReceita: p * l.qtReceita,
      preco1pax: p * l.qt1pax,
      precoEncomenda: p * l.qtEncomenda,
    };
  });
}

function agregarIngredientes(
  fichas: FichaProducao[],
  paxPorFicha: Record<string, number>,
  paxEncomenda: number
): Linha[] {
  // mapa: chave -> linha
  const mapa = new Map<string, Linha>();

  fichas.forEach(f => {
    const paxBase = parseFloat(f.numPorcoes) || 1;
    const paxPed = paxPorFicha[f.id] || paxBase;
    const fatorEnc = paxPed / paxBase; // fator para encomenda
    const paxBaseTotal = paxBase; // pax base da receita

    f.ingredientes.forEach(ing => {
      if (!ing.produto?.trim()) return;
      const produtoLimpo = limparMarca(ing.produto);
      const qtRaw = parseFloat(String(ing.qt||'0').replace(',','.')) || 0;
      if (qtRaw === 0 && !/q\.?b\.?/i.test(String(ing.qt))) return;

      const eOvo = /\bovo[s]?\b|\begg[s]?\b/i.test(produtoLimpo);
      let qtBase: number, undBase: string, aviso: string | undefined;

      if (eOvo) {
        qtBase = qtRaw;
        undBase = 'un';
      } else {
        const convPeso = converterUnidadeParaPeso(qtRaw, ing.un||'', produtoLimpo);
        if (convPeso) {
          qtBase = convPeso.qt;
          undBase = convPeso.und;
        } else {
          const conv = converterBase(qtRaw, ing.un||'');
          qtBase = conv.qt;
          undBase = conv.und;
          if (undBase === 'un') {
            aviso = `"${qtRaw} un" de "${produtoLimpo}" — ajuste o peso`;
          }
        }
      }

      const chave = `${produtoLimpo.toLowerCase()}__${undBase}`;
      const mp = encontrarMateriaPrima(produtoLimpo);
      let precoUnitario = '';
      if (mp && mp.precoKg > 0) precoUnitario = mp.precoKg.toFixed(2);

      if (mapa.has(chave)) {
        const l = mapa.get(chave)!;
        l.qtReceita += qtBase;
        l.qt1pax = l.qtReceita / paxBaseTotal;
        l.qtEncomenda += qtBase * fatorEnc;
        l.qtPorFicha[f.id] = (l.qtPorFicha[f.id]||0) + qtBase;
        if (!l.fichas.includes(f.nomePrato)) l.fichas.push(f.nomePrato);
      } else {
        const qtEnc = qtBase * fatorEnc;
        mapa.set(chave, {
          id: chave,
          produto: produtoLimpo,
          und: undBase,
          qtPorFicha: { [f.id]: qtBase },
          qtReceita: qtBase,
          qt1pax: qtBase / paxBaseTotal,
          qtEncomenda: qtEnc,
          precoUnitario,
          precoReceita: (parseFloat(precoUnitario)||0) * qtBase,
          preco1pax: (parseFloat(precoUnitario)||0) * (qtBase / paxBaseTotal),
          precoEncomenda: (parseFloat(precoUnitario)||0) * qtEnc,
          fichas: [f.nomePrato],
          daBD: !!mp,
          aviso,
        });
      }
    });
  });

  return calcLinhas(Array.from(mapa.values()).sort((a,b) => a.produto.localeCompare(b.produto)));
}

// ── Formatadores ──────────────────────────────────────────────
function fmtEur(n: number) { return n > 0 ? `${n.toFixed(2)} €` : '—'; }
function fmtQt(n: number, und: string) {
  if (und === 'q.b.' || n === 0) return 'q.b.';
  if (und === 'un') return `${Math.round(n)} un`;
  return n >= 1 ? `${n.toFixed(3)} ${und}` : `${n.toFixed(4)} ${und}`;
}
function fmtQtNum(n: number, und: string) {
  if (und === 'q.b.' || n === 0) return '';
  if (und === 'un') return String(Math.round(n));
  return n >= 1 ? n.toFixed(3) : n.toFixed(4);
}

// ── Estilos ───────────────────────────────────────────────────
const S = {
  card: { background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:'18px', marginBottom:12, boxShadow:'var(--shadow-sm)' } as React.CSSProperties,
  muted: { fontSize:12, color:'rgba(26,23,20,0.5)' } as React.CSSProperties,
  inp: { fontFamily:'var(--font-body)', fontSize:12, padding:'6px 8px', borderRadius:7, border:'1.5px solid rgba(26,23,20,0.15)', background:'#fff', color:'#1a1714', boxSizing:'border-box' as const },
  lbl: { fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.05em', display:'block', marginBottom:4, color:'rgba(26,23,20,0.5)' },
  btnP: { padding:'10px 18px', borderRadius:10, border:'none', background:'var(--copper)', color:'white', fontWeight:600, fontSize:13, cursor:'pointer' } as React.CSSProperties,
  btnG: { padding:'10px 18px', borderRadius:10, border:'1.5px solid rgba(26,23,20,0.15)', background:'transparent', color:'#1a1714', fontWeight:600, fontSize:13, cursor:'pointer' } as React.CSSProperties,
};

// ═══════════════════════════════════════════════════════════════
export default function Requisicao() {
  const [fase, setFase] = useState<'escolher'|'editar'>('escolher');

  // Dados plano/fichas
  const planos = getPlanosAulaPorTurma('CP1');
  const [planoSel, setPlanoSel] = useState<PlanoAula|null>(planos[0]||null);
  const [fichasSel, setFichasSel] = useState<string[]>(planos[0]?.fichasIds||[]);
  const [paxPorFicha, setPaxPorFicha] = useState<Record<string,number>>(() => {
    const r: Record<string,number> = {};
    planos[0]?.fichasIds.forEach(fid => {
      const f = getFichasProducao().find(x=>x.id===fid);
      if (f) r[fid] = parseFloat(f.numPorcoes)||4;
    });
    return r;
  });

  // Dados requisição
  const [quebras, setQuebras] = useState(10);
  const [bevCost, setBevCost] = useState(20);
  const [consumo, setConsumo] = useState({ bar:false, rest:true, interno:false, convidados:false });
  const [responsavel, setResponsavel] = useState('');
  const [atividade, setAtividade] = useState('');
  const [familia, setFamilia] = useState('');

  // Linhas
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [msg, setMsg] = useState('');

  const todasFichas = getFichasProducao();
  const fichasDisponiveis = planoSel ? todasFichas.filter(f => planoSel.fichasIds.includes(f.id)) : [];
  const fichasExtras = todasFichas.filter(f => !fichasDisponiveis.find(fd=>fd.id===f.id));
  const fichasSelecionadas = todasFichas.filter(f => fichasSel.includes(f.id));

  const paxBase = fichasSelecionadas.reduce((s,f)=>s+(parseFloat(f.numPorcoes)||1),0) || 1;
  const paxEncomenda = fichasSelecionadas.reduce((s,f)=>s+(paxPorFicha[f.id]||parseFloat(f.numPorcoes)||1),0) || 1;
  const nomeReceita = fichasSelecionadas.map(f=>f.nomePrato).join(' + ') || 'Requisicao';

  function selecionarPlano(p: PlanoAula) {
    setPlanoSel(p);
    setFichasSel(p.fichasIds);
    const r: Record<string,number> = {};
    p.fichasIds.forEach(fid => {
      const f = todasFichas.find(x=>x.id===fid);
      if (f) r[fid] = parseFloat(f.numPorcoes)||4;
    });
    setPaxPorFicha(r);
  }

  function toggleFicha(id: string) {
    setFichasSel(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
    const f = todasFichas.find(x=>x.id===id);
    if (f && !paxPorFicha[id]) setPaxPorFicha(p=>({...p,[id]:parseFloat(f.numPorcoes)||4}));
  }

  function gerarLinhas() {
    setLinhas(agregarIngredientes(fichasSelecionadas, paxPorFicha, paxEncomenda));
    setFase('editar');
  }

  // Edição de linhas
  function setL(i: number, campo: string, v: string|number) {
    setLinhas(prev => {
      const n = [...prev];
      const l = {...n[i], [campo]: v};
      const p = parseFloat(String(l.precoUnitario))||0;
      l.precoReceita = p * l.qtReceita;
      l.preco1pax = p * l.qt1pax;
      l.precoEncomenda = p * l.qtEncomenda;
      n[i] = l;
      return n;
    });
  }

  function setQtEnc(i: number, v: number) {
    setLinhas(prev => {
      const n = [...prev];
      const l = {...n[i], qtEncomenda: v};
      const p = parseFloat(String(l.precoUnitario))||0;
      l.precoEncomenda = p * v;
      n[i] = l;
      return n;
    });
  }

  // Totais
  const totReceita = linhas.reduce((s,l)=>s+l.precoReceita,0);
  const tot1pax = linhas.reduce((s,l)=>s+l.preco1pax,0);
  const totEncomenda = linhas.reduce((s,l)=>s+l.precoEncomenda,0);
  const qbVal = totEncomenda*(quebras/100);
  const crTotal = totEncomenda+qbVal;
  const cr1pax = paxEncomenda>0?crTotal/paxEncomenda:0;
  const pvs = bevCost>0?cr1pax/(bevCost/100):0;
  const pvp = pvs*1.13;
  const avisos = linhas.filter(l=>l.aviso);

  // Envio para Sheets — mapeamento exacto do Apps Script ECL
  async function enviarSheets() {
    setMsg('A enviar para Google Sheets...');
    try {
      // O Apps Script lê e.parameter.dados — tem que ser FormData
      const payload = {
        nomeReceita,
        familia,
        paxTotal: paxEncomenda,    // H7
        paxReceita: paxBase,       // L7
        turma: planoSel?.turmaId||'',
        dataAula: planoSel?.data||'',
        formador: planoSel?.professor||'',
        atividade,                 // K47
        preparacao: '',            // A35 — vazio por agora
        consumo: {
          bar: consumo.bar,
          rest: consumo.rest,
          interno: consumo.interno,
          convidados: consumo.convidados,
        },
        // Ingredientes: A=qty1pax, B=qtReceita, C=nome, H=und, J=precoUnitario
        ingredientes: linhas.map(l => ({
          nome: l.produto,
          qty1pax: fmtQtNum(l.qt1pax, l.und),
          qtReceita: fmtQtNum(l.qtReceita, l.und),
          und: l.und,
          preco: l.precoUnitario || '0',
        })),
      };

      const form = new FormData();
      form.append('dados', JSON.stringify(payload));

      await fetch(SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: form,
      });
      setMsg('✓ Enviado! Abre o Google Sheets para verificar.');
    } catch(e) {
      setMsg('Erro ao enviar: ' + String(e));
    }
    setTimeout(()=>setMsg(''), 6000);
  }

  // ── FASE 1 — ESCOLHER ─────────────────────────────────────
  if (fase === 'escolher') {
    return (
      <div>
        {/* Titulo */}
        <div style={S.card}>
          <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,marginBottom:4}}>Nova Requisicao</div>
          <div style={S.muted}>Escolhe o plano, as fichas e o numero de doses.</div>
        </div>

        {/* 1. Plano */}
        <div style={S.card}>
          <label style={S.lbl}>1. Plano de aula</label>
          {planos.length===0 && <div style={S.muted}>Sem planos criados. Cria primeiro um plano de aula.</div>}
          {planos.map(p => {
            const d = new Date(p.data+'T12:00:00');
            return (
              <div key={p.id} onClick={()=>selecionarPlano(p)} style={{
                display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:10,
                border:`1.5px solid ${planoSel?.id===p.id?'var(--copper)':'var(--border)'}`,
                background:planoSel?.id===p.id?'var(--copper-pale)':'#fff',marginBottom:6,cursor:'pointer',
              }}>
                <div style={{background:'var(--copper-pale)',borderRadius:8,padding:'6px 8px',textAlign:'center',flexShrink:0,minWidth:40}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:'var(--copper)',lineHeight:1}}>{d.getDate().toString().padStart(2,'0')}</div>
                  <div style={{fontSize:9,color:'var(--copper)',textTransform:'uppercase',fontWeight:600}}>{d.toLocaleDateString('pt-PT',{month:'short'})}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{p.titulo}</div>
                  <div style={S.muted}>{p.turmaId} · {p.fichasIds.length} fichas</div>
                </div>
                {planoSel?.id===p.id && <span style={{color:'var(--copper)',fontSize:16}}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* 2. Fichas e doses */}
        {planoSel && (
          <div style={S.card}>
            <label style={S.lbl}>2. Fichas e numero de doses</label>
            <div style={{...S.muted,marginBottom:10}}>Define quantas doses de cada ficha para esta encomenda.</div>

            {fichasDisponiveis.length > 0 && (
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--sage)',marginBottom:6}}>Do plano selecionado</div>
                {fichasDisponiveis.map(f => (
                  <div key={f.id} style={{
                    border:`1.5px solid ${fichasSel.includes(f.id)?'var(--copper)':'var(--border)'}`,
                    borderRadius:10,padding:'10px 12px',marginBottom:6,
                    background:fichasSel.includes(f.id)?'var(--copper-pale)':'#fff',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div onClick={()=>toggleFicha(f.id)} style={{
                        width:20,height:20,borderRadius:5,flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'white',
                        border:`1.5px solid ${fichasSel.includes(f.id)?'var(--copper)':'rgba(26,23,20,0.2)'}`,
                        background:fichasSel.includes(f.id)?'var(--copper)':'transparent',
                      }}>{fichasSel.includes(f.id)&&'✓'}</div>
                      <div style={{flex:1,cursor:'pointer'}} onClick={()=>toggleFicha(f.id)}>
                        <div style={{fontWeight:600,fontSize:13}}>{f.nomePrato}</div>
                        <div style={S.muted}>{f.classificacao} · receita base: {f.numPorcoes} doses</div>
                      </div>
                      {fichasSel.includes(f.id) && (
                        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                          <span style={{fontSize:11,color:'var(--copper)',fontWeight:600}}>Doses:</span>
                          <input type="number" min={1}
                            value={paxPorFicha[f.id]||parseFloat(f.numPorcoes)||4}
                            onChange={e=>setPaxPorFicha(p=>({...p,[f.id]:Number(e.target.value)}))}
                            style={{...S.inp,width:60,textAlign:'center'}}/>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fichasExtras.length > 0 && (
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--sage)',marginBottom:6}}>Outras fichas disponíveis</div>
                {fichasExtras.map(f => (
                  <div key={f.id} style={{
                    border:`1.5px solid ${fichasSel.includes(f.id)?'var(--copper)':'var(--border)'}`,
                    borderRadius:10,padding:'10px 12px',marginBottom:6,
                    background:fichasSel.includes(f.id)?'var(--copper-pale)':'var(--cream-dark)',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div onClick={()=>toggleFicha(f.id)} style={{
                        width:20,height:20,borderRadius:5,flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'white',
                        border:`1.5px solid ${fichasSel.includes(f.id)?'var(--copper)':'rgba(26,23,20,0.2)'}`,
                        background:fichasSel.includes(f.id)?'var(--copper)':'transparent',
                      }}>{fichasSel.includes(f.id)&&'✓'}</div>
                      <div style={{flex:1,cursor:'pointer'}} onClick={()=>toggleFicha(f.id)}>
                        <div style={{fontWeight:600,fontSize:13}}>{f.nomePrato}</div>
                        <div style={S.muted}>{f.classificacao} · base: {f.numPorcoes} doses</div>
                      </div>
                      {fichasSel.includes(f.id) && (
                        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                          <span style={{fontSize:11,color:'var(--copper)',fontWeight:600}}>Doses:</span>
                          <input type="number" min={1}
                            value={paxPorFicha[f.id]||parseFloat(f.numPorcoes)||4}
                            onChange={e=>setPaxPorFicha(p=>({...p,[f.id]:Number(e.target.value)}))}
                            style={{...S.inp,width:60,textAlign:'center'}}/>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Dados adicionais */}
        {planoSel && fichasSel.length > 0 && (
          <div style={S.card}>
            <label style={S.lbl}>3. Dados adicionais</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div><label style={S.lbl}>Familia / Classificacao</label><input style={{...S.inp,width:'100%'}} value={familia} onChange={e=>setFamilia(e.target.value)} placeholder="ex: Peixe, Carne..."/></div>
              <div><label style={S.lbl}>Quebras (%)</label><input style={{...S.inp,width:'100%'}} type="number" value={quebras} onChange={e=>setQuebras(Number(e.target.value))}/></div>
              <div><label style={S.lbl}>Beverage Cost (%)</label><input style={{...S.inp,width:'100%'}} type="number" value={bevCost} onChange={e=>setBevCost(Number(e.target.value))}/></div>
              <div><label style={S.lbl}>Responsavel compras</label><input style={{...S.inp,width:'100%'}} value={responsavel} onChange={e=>setResponsavel(e.target.value)} placeholder="Nome"/></div>
            </div>
            <div style={{marginBottom:8}}>
              <label style={S.lbl}>Atividade</label>
              <input style={{...S.inp,width:'100%'}} value={atividade} onChange={e=>setAtividade(e.target.value)} placeholder="ex: Almoco dos Pais · ECL Restaurante"/>
            </div>
            <div>
              <label style={S.lbl}>Consumo</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {([['bar','ECL BAR'],['rest','ECL Restaurante'],['interno','Consumo Interno'],['convidados','Convidados']] as const).map(([k,l])=>(
                  <label key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:`1.5px solid ${consumo[k]?'var(--copper)':'var(--border)'}`,background:consumo[k]?'var(--copper-pale)':'#fff',cursor:'pointer',fontSize:12}}>
                    <input type="checkbox" checked={consumo[k]} onChange={e=>setConsumo(p=>({...p,[k]:e.target.checked}))} style={{accentColor:'var(--copper)'}}/>
                    {l}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {planoSel && fichasSel.length > 0 && (
          <button style={{...S.btnP,width:'100%'}} onClick={gerarLinhas}>
            Gerar requisicao — {fichasSel.length} ficha{fichasSel.length>1?'s':''} · {paxEncomenda} doses →
          </button>
        )}
      </div>
    );
  }

  // ── FASE 2 — EDITAR E ENVIAR ──────────────────────────────
  return (
    <div>
      <button style={{...S.btnG,marginBottom:12}} onClick={()=>setFase('escolher')}>← Voltar</button>

      {/* Cabecalho escuro tipo ficha ECL */}
      <div style={{background:'var(--charcoal)',borderRadius:14,padding:'18px',marginBottom:12}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:'var(--cream)',marginBottom:6}}>{nomeReceita}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:8}}>
          {[
            ['Familia',familia||'—'],
            ['Encomendas',`${paxEncomenda} doses`],
            ['Receita para',`${paxBase} doses`],
            ['Turma',planoSel?.turmaId||'—'],
            ['Data',planoSel?.data||'—'],
            ['Formador',planoSel?.professor||'—'],
          ].map(([l,v])=>(
            <div key={l}>
              <div style={{fontSize:9,color:'rgba(247,241,230,0.4)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{l}</div>
              <div style={{fontSize:12,color:'var(--cream)',fontWeight:500}}>{v}</div>
            </div>
          ))}
        </div>
        {atividade&&<div style={{marginTop:8,fontSize:11,color:'rgba(247,241,230,0.6)'}}>📌 {atividade}</div>}
        {responsavel&&<div style={{fontSize:11,color:'rgba(247,241,230,0.6)'}}>🛒 Resp. compras: {responsavel}</div>}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
          {fichasSelecionadas.map(f=>(
            <span key={f.id} style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(247,241,230,0.1)',color:'var(--cream)'}}>
              {f.nomePrato} · {paxPorFicha[f.id]||parseFloat(f.numPorcoes)||1} doses
            </span>
          ))}
        </div>
      </div>

      {/* Financeiro — linha 12 do Sheets */}
      <div style={S.card}>
        <label style={S.lbl}>Resumo financeiro</label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,textAlign:'center',marginBottom:10}}>
          {[['CR/dose',fmtEur(cr1pax)],['PVS s/IVA',fmtEur(pvs)],['PVP c/IVA 13%',fmtEur(pvp)],['Bev.Cost',`${bevCost}%`]].map(([l,v])=>(
            <div key={l} style={{background:'var(--copper-pale)',borderRadius:10,padding:'10px 4px'}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,color:'var(--copper)'}}>{v}</div>
              <div style={S.muted}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center'}}>
          {[['Total receita',fmtEur(totReceita)],['Quebras '+quebras+'%',fmtEur(qbVal)],['Custo Real Total',fmtEur(crTotal)]].map(([l,v])=>(
            <div key={l} style={{background:'var(--cream-dark)',borderRadius:8,padding:'8px 4px'}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--charcoal)'}}>{v}</div>
              <div style={S.muted}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Avisos */}
      {avisos.length > 0 && (
        <div style={{...S.card,background:'var(--copper-pale)',border:'1.5px solid var(--copper)'}}>
          <div style={{fontWeight:700,fontSize:13,color:'var(--copper)',marginBottom:6}}>Verificar antes de enviar</div>
          {avisos.map(l=>(
            <div key={l.id} style={{fontSize:12,marginBottom:3}}>⚠️ {l.aviso}</div>
          ))}
        </div>
      )}

      {/* Tabela de ingredientes — estrutura do Sheets */}
      <div style={S.card}>
        <label style={S.lbl}>Ingredientes — todos os campos editaveis</label>
        <div style={S.muted}>Produto, quantidade e preco podem ser ajustados. Preco em euros por kg ou por litro.</div>
        <div style={{overflowX:'auto',marginTop:10}}>
          <table style={{borderCollapse:'collapse',width:'100%',fontSize:11}}>
            <thead>
              <tr style={{background:'var(--charcoal)',color:'var(--cream)'}}>
                <th style={{padding:'7px 8px',textAlign:'left',fontWeight:600,minWidth:140}}>Produto</th>
                <th style={{padding:'7px 5px',textAlign:'right',fontWeight:600,minWidth:55,fontSize:9}}>Qt/1 pax</th>
                <th style={{padding:'7px 5px',textAlign:'right',fontWeight:600,minWidth:55,fontSize:9}}>Qt Receita</th>
                <th style={{padding:'7px 4px',textAlign:'left',fontWeight:600,minWidth:40}}>Und</th>
                <th style={{padding:'7px 5px',textAlign:'right',fontWeight:600,minWidth:65,fontSize:9}}>Qt Encomenda</th>
                <th style={{padding:'7px 5px',textAlign:'right',fontWeight:600,minWidth:60,fontSize:9}}>€/kg ou €/un</th>
                <th style={{padding:'7px 5px',textAlign:'right',fontWeight:600,minWidth:55,fontSize:9}}>€ Receita</th>
                <th style={{padding:'7px 5px',textAlign:'right',fontWeight:600,minWidth:50,fontSize:9}}>€/pax</th>
                <th style={{padding:'7px 5px',textAlign:'right',fontWeight:600,minWidth:60,fontSize:9}}>€ Encomenda</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l,i)=>(
                <tr key={l.id} style={{background:i%2===0?'#fff':'var(--cream)',borderBottom:'1px solid var(--border)'}}>
                  {/* Produto — editável */}
                  <td style={{padding:'3px 4px'}}>
                    <input value={l.produto} onChange={e=>setL(i,'produto',e.target.value)}
                      style={{...S.inp,width:'100%',fontSize:11}}/>
                    {l.aviso && <div style={{fontSize:9,color:'var(--copper)',marginTop:1}}>⚠️ ajuste necessário</div>}
                    {l.daBD && <div style={{fontSize:9,color:'var(--sage)'}}>BD</div>}
                  </td>
                  {/* Qt/1pax — calculado */}
                  <td style={{padding:'3px 4px',textAlign:'right',color:'rgba(26,23,20,0.5)',fontSize:11}}>{fmtQtNum(l.qt1pax,l.und)}</td>
                  {/* Qt receita — calculado */}
                  <td style={{padding:'3px 4px',textAlign:'right',color:'rgba(26,23,20,0.5)',fontSize:11}}>{fmtQtNum(l.qtReceita,l.und)}</td>
                  {/* Und — editável */}
                  <td style={{padding:'3px 3px'}}>
                    <select value={l.und} onChange={e=>setL(i,'und',e.target.value)}
                      style={{...S.inp,width:48,padding:'4px 3px',fontSize:11}}>
                      <option value="kg">kg</option>
                      <option value="l">l</option>
                      <option value="un">un</option>
                      <option value="q.b.">q.b.</option>
                    </select>
                  </td>
                  {/* Qt encomenda — editável */}
                  <td style={{padding:'3px 3px'}}>
                    <input type="number" step="0.001" value={l.und==='q.b.'?'':l.qtEncomenda.toFixed(3)}
                      onChange={e=>setQtEnc(i,parseFloat(e.target.value)||0)}
                      style={{...S.inp,width:65,textAlign:'right',fontSize:11}}/>
                  </td>
                  {/* Preço unitário — editável */}
                  <td style={{padding:'3px 3px'}}>
                    <input value={l.precoUnitario} onChange={e=>setL(i,'precoUnitario',e.target.value)}
                      style={{...S.inp,width:60,textAlign:'right',fontSize:11,background:l.daBD?'var(--sage-pale)':'#fff'}}
                      placeholder="0.00"/>
                  </td>
                  {/* € Receita */}
                  <td style={{padding:'3px 5px',textAlign:'right',fontSize:11,color:l.precoReceita>0?'var(--copper)':'rgba(26,23,20,0.2)'}}>{l.precoReceita>0?l.precoReceita.toFixed(2):'—'}</td>
                  {/* € por pax */}
                  <td style={{padding:'3px 5px',textAlign:'right',fontSize:11,color:'rgba(26,23,20,0.5)'}}>{l.preco1pax>0?l.preco1pax.toFixed(3):'—'}</td>
                  {/* € encomenda */}
                  <td style={{padding:'3px 5px',textAlign:'right',fontSize:11,fontWeight:l.precoEncomenda>0?600:400,color:l.precoEncomenda>0?'var(--copper)':'rgba(26,23,20,0.2)'}}>{l.precoEncomenda>0?l.precoEncomenda.toFixed(2):'—'}</td>
                </tr>
              ))}
              {/* Totais */}
              <tr style={{background:'var(--copper-pale)',fontWeight:700}}>
                <td colSpan={6} style={{padding:'8px 8px',fontSize:12}}>Total</td>
                <td style={{padding:'8px 5px',textAlign:'right',color:'var(--copper)',fontSize:12}}>{totReceita.toFixed(2)}</td>
                <td style={{padding:'8px 5px',textAlign:'right',color:'rgba(26,23,20,0.5)',fontSize:11}}>{tot1pax.toFixed(3)}</td>
                <td style={{padding:'8px 5px',textAlign:'right',color:'var(--copper)',fontSize:12}}>{totEncomenda.toFixed(2)}</td>
              </tr>
              <tr style={{background:'var(--cream-dark)'}}>
                <td colSpan={8} style={{padding:'6px 8px',fontSize:11}}>Quebras {quebras}%</td>
                <td style={{padding:'6px 5px',textAlign:'right',fontSize:11}}>{qbVal.toFixed(2)}</td>
              </tr>
              <tr style={{background:'var(--danger-pale)',fontWeight:700}}>
                <td colSpan={8} style={{padding:'8px 8px',fontSize:12}}>Custo Real Total</td>
                <td style={{padding:'8px 5px',textAlign:'right',color:'var(--danger)',fontSize:12}}>{crTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Consumo e info */}
      <div style={{...S.card,padding:'12px 16px'}}>
        <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:12}}>
          {responsavel&&<span><strong>Resp. compras:</strong> {responsavel}</span>}
          {atividade&&<span><strong>Atividade:</strong> {atividade}</span>}
          <span><strong>Consumo:</strong> {Object.entries(consumo).filter(([,v])=>v).map(([k])=>k==='bar'?'ECL BAR':k==='rest'?'ECL Restaurante':k==='interno'?'Consumo Interno':'Convidados').join(', ')||'—'}</span>
        </div>
      </div>

      {/* Mensagem */}
      {msg && (
        <div style={{padding:'10px 14px',background:'var(--sage-pale)',borderRadius:10,fontSize:13,color:'var(--sage)',marginBottom:10,fontWeight:600}}>
          {msg}
        </div>
      )}

      {/* Acoes */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button style={S.btnP} onClick={enviarSheets}>📊 Enviar para Google Sheets</button>
        <button style={S.btnG} onClick={()=>{
          if(!planoSel) return;
          addOrUpdateRequisicao({
            id:`req_${planoSel.id}`,planoAulaId:planoSel.id,
            turmaId:planoSel.turmaId,dataAula:planoSel.data,
            professor:planoSel.professor,fichasIds:fichasSel,
            linhas:linhas.map((l,i)=>({
              id:`l${i}`,produto:l.produto,unidade:l.und,
              quantidadeTotal:l.qtEncomenda,
              precoUnitario:parseFloat(l.precoUnitario)||undefined,
              custoTotal:l.precoEncomenda,obs:'',
            })),
            custoTotal:crTotal,estado:'rascunho',
            criadaEm:new Date().toISOString(),
            atualizadaEm:new Date().toISOString(),
          });
          setMsg('Guardado localmente!');
          setTimeout(()=>setMsg(''),2000);
        }}>💾 Guardar</button>
        <button style={S.btnG} onClick={()=>window.print()}>🖨️ Imprimir</button>
      </div>
    </div>
  );
}

