import React, { useState } from 'react';
import { getPlanosAulaPorTurma, getFichasProducao, addOrUpdateRequisicao } from '../backend';
import { PlanoAula, FichaProducao } from '../types';
import { encontrarMateriaPrima } from '../materiasPrimasBase';
import { converterUnidadeParaPeso } from '../pesosMedios';

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbz2cG3QNBEZhb-kOms-GdwSewBSsYobITfWevftLylckjfRmYW1GbCNIzqjSxch6ik/exec';

// ── Converter para unidade base (kg, l, un) ───────────────────
function converterParaUnidadeBase(qt: number, und: string): { qt: number; und: string } {
  const u = (und||'').toLowerCase().trim();
  // gramas → kg
  if (['g','gr','gramas','grama'].includes(u)) return { qt: qt/1000, und: 'kg' };
  if (['mg'].includes(u)) return { qt: qt/1000000, und: 'kg' };
  // mililitros → litros
  if (['ml','ml'].includes(u)) return { qt: qt/1000, und: 'l' };
  if (['dl'].includes(u)) return { qt: qt/10, und: 'l' };
  if (['cl'].includes(u)) return { qt: qt/100, und: 'l' };
  // colheres → kg (aproximado)
  if (['cs','c.s.','colher de sopa','colheres de sopa'].includes(u)) return { qt: qt*0.015, und: 'kg' };
  if (['cc','c.c.','colher de chá','colheres de chá'].includes(u)) return { qt: qt*0.005, und: 'kg' };
  // já em unidade base
  if (['kg'].includes(u)) return { qt, und: 'kg' };
  if (['l','lt','litro','litros'].includes(u)) return { qt, und: 'l' };
  // unidades contáveis
  if (['un','unidade','unidades','und','dente','dentes','folha','folhas','fatia','fatias','ramo','ramos','un.'].includes(u)) return { qt, und: 'un' };
  // q.b. e desconhecido
  if (!u || u === 'q.b.' || u === 'qb') return { qt: 0, und: 'q.b.' };
  // default — manter como está
  return { qt, und: und||'un' };
}

interface LinhaAgregada {
  produto: string;
  und: string;       // unidade base (kg/l/un)
  qtTotal: number;   // em unidade base
  preco: string;     // preço por kg/l/un
  custoLinha: number;
  fichas: string[];
  daBD: boolean;
}

// Agrega ingredientes de várias fichas, cada uma com o seu próprio fator de pax
function agregarIngredientes(
  fichas: FichaProducao[],
  paxPorFicha: Record<string, number>
): LinhaAgregada[] {
  const mapa = new Map<string, LinhaAgregada>();

  fichas.forEach(f => {
    const paxBase = parseFloat(f.numPorcoes) || 1;
    const paxPretendido = paxPorFicha[f.id] || paxBase;
    const fator = paxPretendido / paxBase;

    f.ingredientes.forEach(ing => {
      if (!ing.produto?.trim()) return;
      const qtRaw = parseFloat(String(ing.qt||'0').replace(',','.')) || 0;
      if (qtRaw === 0 && !/q\.?b\.?/i.test(String(ing.qt))) return;

      // Tentar converter unidades não-padrão pelo peso médio
      const conversaoPeso = converterUnidadeParaPeso(qtRaw * fator, ing.un||'', ing.produto);
      const { qt: qtBase, und: undBase } = conversaoPeso
        ? conversaoPeso
        : converterParaUnidadeBase(qtRaw * fator, ing.un||'');
      const chave = `${ing.produto.toLowerCase().trim()}__${undBase}`;

      // Preço da base de dados — preço por unidade base
      const mp = encontrarMateriaPrima(ing.produto);
      let precoUnitBase = '';
      if (mp) {
        // precoUnitario é por unidadeCompra, fatorConversao é quantas unidadeReceita há numa unidadeCompra
        // preço por kg = precoUnitario / (fatorConversao / 1000) se unidadeReceita = g
        if (mp.unidadeReceita === 'g') {
          precoUnitBase = (mp.precoUnitario / (mp.fatorConversao / 1000)).toFixed(4);
        } else if (mp.unidadeReceita === 'ml') {
          precoUnitBase = (mp.precoUnitario / (mp.fatorConversao / 1000)).toFixed(4);
        } else {
          precoUnitBase = (mp.precoUnitario / mp.fatorConversao).toFixed(4);
        }
        // Usar precoKg se disponível (mais direto)
        if (mp.precoKg > 0) precoUnitBase = mp.precoKg.toFixed(4);
      }

      if (mapa.has(chave)) {
        const l = mapa.get(chave)!;
        l.qtTotal += qtBase;
        if (!l.fichas.includes(f.nomePrato)) l.fichas.push(f.nomePrato);
        l.custoLinha = (parseFloat(l.preco)||0) * l.qtTotal;
      } else {
        const preco = precoUnitBase;
        mapa.set(chave, {
          produto: ing.produto,
          und: undBase,
          qtTotal: qtBase,
          preco,
          custoLinha: (parseFloat(preco)||0) * qtBase,
          fichas: [f.nomePrato],
          daBD: !!mp,
        });
      }
    });
  });

  return Array.from(mapa.values()).sort((a,b) => a.produto.localeCompare(b.produto));
}

// ── Estilos ───────────────────────────────────────────────────
const S = {
  card: { background:'#fff', border:'1px solid rgba(31,27,22,0.12)', borderRadius:14, padding:'18px', marginBottom:12, boxShadow:'0 2px 12px rgba(31,27,22,0.08)' } as React.CSSProperties,
  muted: { fontSize:12, opacity:0.6 } as React.CSSProperties,
  inp: { fontFamily:'Inter,sans-serif', fontSize:13, padding:'8px 10px', borderRadius:8, border:'1px solid rgba(31,27,22,0.12)', background:'#f7f1e6', color:'#1f1b16', boxSizing:'border-box' as const },
  btnP: { padding:'10px 18px', borderRadius:10, border:'none', background:'#b5651d', color:'white', fontWeight:600, fontSize:13, cursor:'pointer' } as React.CSSProperties,
  btnG: { padding:'10px 18px', borderRadius:10, border:'1px solid rgba(31,27,22,0.12)', background:'transparent', color:'#1f1b16', fontWeight:600, fontSize:13, cursor:'pointer' } as React.CSSProperties,
};

function fmt(n:number) { return n>0?`${n.toFixed(2)} €`:'—'; }
function fmtQt(n:number) { return n < 0.001 ? 'q.b.' : n >= 1 ? n.toFixed(3) : n.toFixed(4); }

// ═══════════════════════════════════════════════════════════════
export default function Requisicao() {
  const [fase, setFase] = useState<'escolher'|'editar'>('escolher');
  const [planos] = useState(() => getPlanosAulaPorTurma('CP1'));
  const [planoSel, setPlanoSel] = useState<PlanoAula|null>(null);
  const [fichasSel, setFichasSel] = useState<string[]>([]);
  // Pax por ficha — cada ficha tem o seu próprio número de doses
  const [paxPorFicha, setPaxPorFicha] = useState<Record<string,number>>({});
  const [quebras, setQuebras] = useState(10);
  const [bevCost, setBevCost] = useState(20);
  const [consumo, setConsumo] = useState({ bar:false, rest:true, interno:false, convidados:false });
  const [responsavelCompras, setResponsavelCompras] = useState('');
  const [atividade, setAtividade] = useState('');
  const [linhas, setLinhas] = useState<LinhaAgregada[]>([]);
  const [msg, setMsg] = useState('');

  const todasFichas = getFichasProducao();
  const fichasDisponiveis = planoSel ? todasFichas.filter(f => planoSel.fichasIds.includes(f.id)) : [];
  const fichasExtras = todasFichas.filter(f => !fichasDisponiveis.find(fd => fd.id === f.id));
  const fichasSelecionadas = todasFichas.filter(f => fichasSel.includes(f.id));

  function toggleFicha(id: string) {
    setFichasSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    // Inicializar pax com o valor da ficha
    const ficha = todasFichas.find(f => f.id === id);
    if (ficha && !paxPorFicha[id]) {
      setPaxPorFicha(p => ({ ...p, [id]: parseFloat(ficha.numPorcoes)||4 }));
    }
  }

  function gerarLinhas() {
    setLinhas(agregarIngredientes(fichasSelecionadas, paxPorFicha));
    setFase('editar');
  }

  function setPreco(i: number, v: string) {
    setLinhas(prev => {
      const n = [...prev];
      n[i] = { ...n[i], preco: v, custoLinha: (parseFloat(v)||0) * n[i].qtTotal };
      return n;
    });
  }

  // Cálculos financeiros
  const totReceita = linhas.reduce((s,l) => s + ((parseFloat(l.preco)||0) * l.qtTotal), 0);
  const qbVal = totReceita * (quebras/100);
  const crTotal = totReceita + qbVal;
  const paxTotalGeral = fichasSelecionadas.reduce((s,f) => s + (paxPorFicha[f.id]||parseFloat(f.numPorcoes)||1), 0);
  const cr1pax = paxTotalGeral > 0 ? crTotal / paxTotalGeral : 0;
  const pvs = bevCost > 0 ? cr1pax / (bevCost/100) : 0;
  const pvp = pvs * 1.13;

  const nomeRequisicao = fichasSelecionadas.map(f => f.nomePrato).join(' + ') || 'Requisição';

  async function enviarSheets() {
    setMsg('A enviar...');
    try {
      const payload = {
        nomeReceita: nomeRequisicao,
        atividade, turma: planoSel?.turmaId||'',
        dataAula: planoSel?.data||'',
        formador: planoSel?.professor||'',
        responsavelCompras,
        consumo: Object.entries(consumo).filter(([,v])=>v).map(([k])=>k).join(', '),
        quebras, bevCost,
        fichas: fichasSelecionadas.map(f => ({ nome: f.nomePrato, pax: paxPorFicha[f.id]||parseFloat(f.numPorcoes)||1 })),
        ingredientes: linhas.map(l => ({
          nome: l.produto,
          qt: fmtQt(l.qtTotal),
          und: l.und,
          precoKg: l.preco,
          custo: ((parseFloat(l.preco)||0) * l.qtTotal).toFixed(2),
        })),
        totais: {
          totReceita: totReceita.toFixed(2),
          quebras: qbVal.toFixed(2),
          crTotal: crTotal.toFixed(2),
          cr1pax: cr1pax.toFixed(2),
          pvs: pvs.toFixed(2),
          pvp: pvp.toFixed(2),
        },
      };
      await fetch(SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      setMsg('✓ Enviado para Google Sheets!');
    } catch (e) { setMsg('Erro: ' + String(e)); }
    setTimeout(() => setMsg(''), 5000);
  }

  // ── FASE 1 — ESCOLHER ─────────────────────────────────────
  if (fase === 'escolher') {
    return (
      <div>
        <div style={S.card}>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:700, marginBottom:4 }}>📋 Nova Requisição</div>
          <div style={S.muted}>Escolhe um plano de aula e as fichas a incluir.</div>
        </div>

        {/* 1. Plano */}
        <div style={S.card}>
          <div style={{ fontWeight:600, fontSize:13, marginBottom:8, color:'#b5651d' }}>1. Plano de aula</div>
          {planos.length === 0 && <div style={S.muted}>Sem planos criados.</div>}
          {planos.map(p => (
            <div key={p.id} onClick={() => { setPlanoSel(p); setFichasSel(p.fichasIds); setAtividade(''); }}
              style={{ padding:'10px 12px', borderRadius:10, border:`1.5px solid ${planoSel?.id===p.id?'#b5651d':'rgba(31,27,22,0.12)'}`, background:planoSel?.id===p.id?'rgba(181,101,29,0.06)':'#fff', marginBottom:6, cursor:'pointer' }}>
              <div style={{ fontWeight:600, fontSize:13 }}>{p.titulo}</div>
              <div style={S.muted}>{p.data} · {p.turmaId} · {p.professor}</div>
            </div>
          ))}
        </div>

        {/* 2. Fichas */}
        {planoSel && (
          <div style={S.card}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:'#b5651d' }}>2. Fichas a incluir</div>
            <div style={{ ...S.muted, marginBottom:10 }}>Para cada ficha define o número de doses pretendido.</div>

            {fichasDisponiveis.length > 0 && (
              <>
                <div style={{ fontSize:11, fontWeight:600, color:'#6b7c5e', marginBottom:6 }}>Do plano selecionado</div>
                {fichasDisponiveis.map(f => (
                  <div key={f.id} style={{ border:`1px solid ${fichasSel.includes(f.id)?'#b5651d':'rgba(31,27,22,0.12)'}`, borderRadius:10, padding:'10px 12px', marginBottom:6, background:fichasSel.includes(f.id)?'rgba(181,101,29,0.04)':'#fff' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div onClick={() => toggleFicha(f.id)} style={{ width:20, height:20, borderRadius:5, border:`1.5px solid ${fichasSel.includes(f.id)?'#b5651d':'rgba(31,27,22,0.2)'}`, background:fichasSel.includes(f.id)?'#b5651d':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'white', fontSize:11, cursor:'pointer' }}>
                        {fichasSel.includes(f.id)&&'✓'}
                      </div>
                      <div style={{ flex:1, cursor:'pointer' }} onClick={() => toggleFicha(f.id)}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{f.nomePrato}</div>
                        <div style={S.muted}>{f.classificacao} · receita base: {f.numPorcoes} doses</div>
                      </div>
                      {fichasSel.includes(f.id) && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                          <span style={{ fontSize:11, color:'#b5651d', fontWeight:500 }}>Doses:</span>
                          <input type="number" min={1} value={paxPorFicha[f.id]||parseFloat(f.numPorcoes)||4}
                            onChange={e => setPaxPorFicha(p => ({ ...p, [f.id]: Number(e.target.value) }))}
                            style={{ ...S.inp, width:60, textAlign:'center', padding:'5px 8px' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {fichasExtras.length > 0 && fichasSel.length < 10 && (
              <>
                <div style={{ fontSize:11, fontWeight:600, color:'#6b7c5e', margin:'10px 0 6px' }}>Outras fichas disponíveis</div>
                {fichasExtras.map(f => (
                  <div key={f.id} style={{ border:`1px solid ${fichasSel.includes(f.id)?'#b5651d':'rgba(31,27,22,0.12)'}`, borderRadius:10, padding:'10px 12px', marginBottom:6, background:fichasSel.includes(f.id)?'rgba(181,101,29,0.04)':'#f7f1e6' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div onClick={() => toggleFicha(f.id)} style={{ width:20, height:20, borderRadius:5, border:`1.5px solid ${fichasSel.includes(f.id)?'#b5651d':'rgba(31,27,22,0.2)'}`, background:fichasSel.includes(f.id)?'#b5651d':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'white', fontSize:11, cursor:'pointer' }}>
                        {fichasSel.includes(f.id)&&'✓'}
                      </div>
                      <div style={{ flex:1, cursor:'pointer' }} onClick={() => toggleFicha(f.id)}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{f.nomePrato}</div>
                        <div style={S.muted}>{f.classificacao} · receita base: {f.numPorcoes} doses</div>
                      </div>
                      {fichasSel.includes(f.id) && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                          <span style={{ fontSize:11, color:'#b5651d', fontWeight:500 }}>Doses:</span>
                          <input type="number" min={1} value={paxPorFicha[f.id]||parseFloat(f.numPorcoes)||4}
                            onChange={e => setPaxPorFicha(p => ({ ...p, [f.id]: Number(e.target.value) }))}
                            style={{ ...S.inp, width:60, textAlign:'center', padding:'5px 8px' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* 3. Dados */}
        {planoSel && fichasSel.length > 0 && (
          <div style={S.card}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:10, color:'#b5651d' }}>3. Dados adicionais</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:600, display:'block', marginBottom:3 }}>Quebras (%)</label>
                <input style={{ ...S.inp, width:'100%' }} type="number" value={quebras} onChange={e => setQuebras(Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, display:'block', marginBottom:3 }}>Beverage Cost (%)</label>
                <input style={{ ...S.inp, width:'100%' }} type="number" value={bevCost} onChange={e => setBevCost(Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, display:'block', marginBottom:3 }}>Responsável compras</label>
                <input style={{ ...S.inp, width:'100%' }} value={responsavelCompras} onChange={e => setResponsavelCompras(e.target.value)} placeholder="Nome" />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, display:'block', marginBottom:3 }}>Atividade</label>
                <input style={{ ...S.inp, width:'100%' }} value={atividade} onChange={e => setAtividade(e.target.value)} placeholder="ex: Almoço Erasmus" />
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, display:'block', marginBottom:6 }}>Consumo</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {([['bar','ECL BAR'],['rest','ECL Restaurante'],['interno','Consumo Interno'],['convidados','Convidados']] as const).map(([k,l]) => (
                  <label key={k} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, border:`1px solid ${consumo[k]?'#b5651d':'rgba(31,27,22,0.12)'}`, background:consumo[k]?'rgba(181,101,29,0.06)':'#fff', cursor:'pointer', fontSize:12 }}>
                    <input type="checkbox" checked={consumo[k]} onChange={e => setConsumo(p => ({ ...p, [k]: e.target.checked }))} style={{ accentColor:'#b5651d' }} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {planoSel && fichasSel.length > 0 && (
          <button style={{ ...S.btnP, width:'100%' }} onClick={gerarLinhas}>
            Gerar requisição — {fichasSel.length} ficha{fichasSel.length>1?'s':''} →
          </button>
        )}
      </div>
    );
  }

  // ── FASE 2 — EDITAR ───────────────────────────────────────
  return (
    <div>
      <button style={{ ...S.btnG, marginBottom:12 }} onClick={() => setFase('escolher')}>← Voltar</button>

      {/* Cabeçalho escuro */}
      <div style={{ background:'#1f1b16', borderRadius:14, padding:'16px 18px', marginBottom:12 }}>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:16, fontWeight:700, color:'#f7f1e6', marginBottom:4 }}>{nomeRequisicao}</div>
        <div style={{ fontSize:11, color:'rgba(247,241,230,0.55)' }}>{planoSel?.data} · {planoSel?.turmaId} · {planoSel?.professor}</div>
        {atividade && <div style={{ fontSize:12, color:'rgba(247,241,230,0.7)', marginTop:4 }}>📌 {atividade}</div>}
        {/* Doses por ficha */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
          {fichasSelecionadas.map(f => (
            <span key={f.id} style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'rgba(247,241,230,0.12)', color:'#f7f1e6' }}>
              {f.nomePrato} · {paxPorFicha[f.id]||parseFloat(f.numPorcoes)||1} doses
            </span>
          ))}
        </div>
        {/* Consumo */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
          {Object.entries(consumo).filter(([,v])=>v).map(([k]) => (
            <span key={k} style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'rgba(181,101,29,0.4)', color:'#f7f1e6' }}>
              {k==='bar'?'ECL BAR':k==='rest'?'ECL Restaurante':k==='interno'?'Consumo Interno':'Convidados'}
            </span>
          ))}
        </div>
      </div>

      {/* Totais */}
      <div style={S.card}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, textAlign:'center' }}>
          {[['CR/dose',fmt(cr1pax)],['PVS s/IVA',fmt(pvs)],['PVP c/IVA 13%',fmt(pvp)],['Total CR',fmt(crTotal)]].map(([l,v]) => (
            <div key={l} style={{ background:'rgba(181,101,29,0.06)', borderRadius:10, padding:'10px 4px' }}>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:16, fontWeight:700, color:'#b5651d' }}>{v}</div>
              <div style={{ ...S.muted, fontSize:10 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela ingredientes */}
      <div style={S.card}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:'#b5651d' }}>Ingredientes consolidados</div>
        <div style={{ ...S.muted, marginBottom:10 }}>Quantidades em kg/l/un. Preços por kg ou l. "BD" = preço da base de dados.</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#1f1b16', color:'#f7f1e6' }}>
                <th style={{ padding:'8px 10px', textAlign:'left', fontWeight:500 }}>Ingrediente</th>
                <th style={{ padding:'8px 6px', textAlign:'right', fontWeight:500 }}>Quantidade</th>
                <th style={{ padding:'8px 6px', textAlign:'left', fontWeight:500 }}>Un</th>
                <th style={{ padding:'8px 6px', textAlign:'right', fontWeight:500 }}>€/kg ou €/un</th>
                <th style={{ padding:'8px 6px', textAlign:'right', fontWeight:500 }}>Total €</th>
                <th style={{ padding:'8px 6px', textAlign:'left', fontWeight:500, fontSize:10 }}>Fichas</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => {
                const custo = (parseFloat(l.preco)||0) * l.qtTotal;
                return (
                  <tr key={i} style={{ background:i%2===0?'#fff':'#f7f1e6', borderBottom:'1px solid rgba(31,27,22,0.06)' }}>
                    <td style={{ padding:'7px 10px', fontWeight:500 }}>{l.produto}</td>
                    <td style={{ padding:'7px 6px', textAlign:'right', fontFamily:'monospace' }}>{fmtQt(l.qtTotal)}</td>
                    <td style={{ padding:'7px 6px', color:'#6b7c5e', fontWeight:500 }}>{l.und}</td>
                    <td style={{ padding:'4px 6px', textAlign:'right' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
                        {l.daBD && <span style={{ fontSize:9, color:'#6b7c5e', fontWeight:600, background:'rgba(107,124,94,0.1)', padding:'1px 4px', borderRadius:4 }}>BD</span>}
                        <input value={l.preco} onChange={e => setPreco(i, e.target.value)}
                          style={{ ...S.inp, width:70, textAlign:'right', padding:'4px 6px', fontSize:12, background:l.daBD?'rgba(107,124,94,0.08)':'#f7f1e6' }}
                          placeholder="0.00" />
                      </div>
                    </td>
                    <td style={{ padding:'7px 6px', textAlign:'right', fontWeight:custo>0?600:400, color:custo>0?'#b5651d':'rgba(31,27,22,0.3)' }}>{custo>0?fmt(custo):'—'}</td>
                    <td style={{ padding:'7px 6px', fontSize:10, color:'#6b7c5e' }}>{l.fichas.join(', ')}</td>
                  </tr>
                );
              })}
              <tr style={{ background:'rgba(181,101,29,0.06)', fontWeight:700 }}>
                <td colSpan={4} style={{ padding:'8px 10px' }}>Total Custo Receita</td>
                <td style={{ padding:'8px 6px', textAlign:'right', color:'#b5651d' }}>{fmt(totReceita)}</td>
                <td />
              </tr>
              <tr style={{ background:'rgba(181,101,29,0.04)' }}>
                <td colSpan={4} style={{ padding:'6px 10px' }}>Quebras {quebras}%</td>
                <td style={{ padding:'6px 6px', textAlign:'right' }}>{fmt(qbVal)}</td>
                <td />
              </tr>
              <tr style={{ background:'rgba(179,65,58,0.06)', fontWeight:700 }}>
                <td colSpan={4} style={{ padding:'8px 10px' }}>Custo Real Total</td>
                <td style={{ padding:'8px 6px', textAlign:'right', color:'#b3413a' }}>{fmt(crTotal)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Resp compras */}
      {responsavelCompras && (
        <div style={{ ...S.card, padding:'12px 16px' }}>
          <div style={{ fontSize:12 }}><strong>Responsável pelas compras:</strong> {responsavelCompras}</div>
        </div>
      )}

      {msg && <div style={{ padding:'10px 14px', background:'rgba(107,124,94,0.1)', borderRadius:10, fontSize:13, color:'#6b7c5e', marginBottom:10, fontWeight:500 }}>{msg}</div>}

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button style={S.btnP} onClick={enviarSheets}>📊 Enviar para Sheets</button>
        <button style={S.btnG} onClick={() => {
          if (!planoSel) return;
          addOrUpdateRequisicao({
            id:`req_${planoSel.id}`, planoAulaId:planoSel.id, turmaId:planoSel.turmaId,
            dataAula:planoSel.data, professor:planoSel.professor, fichasIds:fichasSel,
            linhas:linhas.map((l,i) => ({ id:`l${i}`, produto:l.produto, unidade:l.und, quantidadeTotal:l.qtTotal, precoUnitario:parseFloat(l.preco)||undefined, custoTotal:(parseFloat(l.preco)||0)*l.qtTotal, obs:'' })),
            custoTotal:crTotal, estado:'rascunho', criadaEm:new Date().toISOString(), atualizadaEm:new Date().toISOString(),
          });
          setMsg('✓ Guardado!'); setTimeout(() => setMsg(''), 2000);
        }}>💾 Guardar</button>
        <button style={S.btnG} onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>
    </div>
  );
}

