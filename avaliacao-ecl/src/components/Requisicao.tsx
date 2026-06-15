import React, { useState, useEffect } from 'react';
import { getPlanosAulaPorTurma, getFichasProducao, addOrUpdateRequisicao, getRequisicaoPorPlano } from '../backend';
import { PlanoAula, FichaProducao } from '../types';

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbz2cG3QNBEZhb-kOms-GdwSewBSsYobITfWevftLylckjfRmYW1GbCNIzqjSxch6ik/exec';

interface LinhaAgregada {
  produto: string;
  und: string;
  qtTotal: number;
  preco: string;
  fichas: string[];
}

function agregarIngredientes(fichas: FichaProducao[], paxTotal: number): LinhaAgregada[] {
  const mapa = new Map<string, LinhaAgregada>();
  fichas.forEach(f => {
    const paxBase = parseFloat(f.numPorcoes) || 1;
    const fator = paxTotal / paxBase;
    f.ingredientes.forEach(ing => {
      if (!ing.produto) return;
      const chave = `${ing.produto.toLowerCase().trim()}__${(ing.un||'').toLowerCase()}`;
      const qt = (parseFloat(String(ing.qt).replace(',','.')) || 0) * fator;
      if (mapa.has(chave)) {
        const l = mapa.get(chave)!;
        l.qtTotal += qt;
        if (!l.fichas.includes(f.nomePrato)) l.fichas.push(f.nomePrato);
      } else {
        mapa.set(chave, { produto: ing.produto, und: ing.un||'', qtTotal: qt, preco: '', fichas: [f.nomePrato] });
      }
    });
  });
  return Array.from(mapa.values());
}

// ── Estilos ───────────────────────────────────────────────────
const card: React.CSSProperties = { background:'#fff', border:'1px solid rgba(31,27,22,0.12)', borderRadius:14, padding:'18px', marginBottom:14, boxShadow:'0 2px 12px rgba(31,27,22,0.08)' };
const muted: React.CSSProperties = { fontSize:13, opacity:0.6 };
const inp: React.CSSProperties = { width:'100%', fontFamily:'Inter,sans-serif', fontSize:14, padding:'9px 12px', borderRadius:10, border:'1px solid rgba(31,27,22,0.12)', background:'#f7f1e6', color:'#1f1b16', boxSizing:'border-box' };
const btnP: React.CSSProperties = { padding:'10px 18px', borderRadius:10, border:'none', background:'#b5651d', color:'white', fontWeight:600, fontSize:14, cursor:'pointer' };
const btnG: React.CSSProperties = { padding:'10px 18px', borderRadius:10, border:'1px solid rgba(31,27,22,0.12)', background:'transparent', color:'#1f1b16', fontWeight:600, fontSize:14, cursor:'pointer' };

// ═══════════════════════════════════════════════════════════════
export default function Requisicao() {
  const [fase, setFase] = useState<'escolher'|'editar'>('escolher');
  const [planos] = useState(() => getPlanosAulaPorTurma('CP1').filter(p => p.estado === 'publicado' || p.estado === 'fichas_pendentes' || p.estado === 'rascunho'));
  const [planoSel, setPlanoSel] = useState<PlanoAula|null>(null);
  const [fichasSel, setFichasSel] = useState<string[]>([]);
  const [paxTotal, setPaxTotal] = useState(15);
  const [quebras, setQuebras] = useState(10);
  const [bevCost, setBevCost] = useState(20);
  const [consumo, setConsumo] = useState({ bar:false, rest:true, interno:false, convidados:false });
  const [responsavelCompras, setResponsavelCompras] = useState('');
  const [atividade, setAtividade] = useState('');
  const [linhas, setLinhas] = useState<LinhaAgregada[]>([]);
  const [msg, setMsg] = useState('');

  const todasFichas = getFichasProducao();

  function gerarLinhas() {
    const fichas = todasFichas.filter(f => fichasSel.includes(f.id));
    setLinhas(agregarIngredientes(fichas, paxTotal));
    setFase('editar');
  }

  function setPreco(i: number, v: string) {
    setLinhas(prev => { const n=[...prev]; n[i]={...n[i],preco:v}; return n; });
  }

  // Cálculos
  const totReceita = linhas.reduce((s,l)=>{
    const p=parseFloat(l.preco)||0;
    return s + p*l.qtTotal;
  },0);
  const qbVal = totReceita*(quebras/100);
  const crTotal = totReceita+qbVal;
  const cr1pax = paxTotal>0 ? crTotal/paxTotal : 0;
  const pvs = bevCost>0 ? cr1pax/(bevCost/100) : 0;
  const pvp = pvs*1.13;

  async function enviarSheets() {
    setMsg('A enviar...');
    const form = new FormData();
    form.append('dados', JSON.stringify({
      nomeReceita: planoSel?.titulo||'',
      familia:'', paxTotal, paxReceita:1,
      bevCost, quebras, consumo,
      turma: planoSel?.turmaId||'',
      dataAula: planoSel?.data||'',
      formador: planoSel?.professor||'',
      atividade, preparacao:'',
      responsavelCompras,
      ingredientes: linhas.map(l=>({ qtReceita:l.qtTotal.toFixed(3), nome:l.produto, und:l.und, preco:l.preco })),
    }));
    try {
      await fetch(SHEETS_URL, { method:'POST', mode:'no-cors', body:form });
      setMsg('✓ Enviado para Google Sheets!');
    } catch { setMsg('Erro de ligação'); }
    setTimeout(()=>setMsg(''),4000);
  }

  function guardarLocal() {
    if(!planoSel) return;
    addOrUpdateRequisicao({
      id:`req_${planoSel.id}`,
      planoAulaId:planoSel.id,
      turmaId:planoSel.turmaId,
      dataAula:planoSel.data,
      professor:planoSel.professor,
      fichasIds:fichasSel,
      linhas:linhas.map((l,i)=>({id:`l${i}`,produto:l.produto,unidade:l.und,quantidadeTotal:l.qtTotal,precoUnitario:parseFloat(l.preco)||undefined,custoTotal:(parseFloat(l.preco)||0)*l.qtTotal,obs:''})),
      custoTotal:crTotal,
      estado:'rascunho',
      criadaEm:new Date().toISOString(),
      atualizadaEm:new Date().toISOString(),
    });
    setMsg('✓ Guardado!');
    setTimeout(()=>setMsg(''),2000);
  }

  // ── FASE 1 — ESCOLHER PLANO E FICHAS ─────────────────────
  if (fase==='escolher') {
    const fichasDisponiveis = planoSel
      ? todasFichas.filter(f => planoSel.fichasIds.includes(f.id))
      : [];
    const fichasLivres = todasFichas.filter(f => !fichasDisponiveis.find(fd=>fd.id===f.id));

    return (
      <div>
        <div style={{...card}}>
          <div style={{fontFamily:'Fraunces,serif',fontSize:20,fontWeight:700,marginBottom:4}}>📋 Nova Requisição</div>
          <div style={muted}>Escolhe um plano de aula e as fichas a incluir.</div>
        </div>

        {/* Escolher plano */}
        <div style={card}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:10,color:'#b5651d'}}>1. Plano de aula</div>
          {planos.length===0 && <div style={muted}>Sem planos criados. Cria um plano primeiro.</div>}
          {planos.map(p=>(
            <div key={p.id} onClick={()=>{setPlanoSel(p);setFichasSel(p.fichasIds);setAtividade('');}} style={{
              padding:'10px 12px',borderRadius:10,border:`1.5px solid ${planoSel?.id===p.id?'#b5651d':'rgba(31,27,22,0.12)'}`,
              background:planoSel?.id===p.id?'rgba(181,101,29,0.06)':'#fff',marginBottom:6,cursor:'pointer',
            }}>
              <div style={{fontWeight:600,fontSize:14}}>{p.titulo}</div>
              <div style={muted}>{p.data} · {p.fichasIds.length} fichas · {p.turmaId}</div>
            </div>
          ))}
        </div>

        {/* Escolher fichas */}
        {planoSel && (
          <div style={card}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:6,color:'#b5651d'}}>2. Fichas a incluir</div>
            <div style={{...muted,marginBottom:10}}>Seleciona as fichas cujos ingredientes vão entrar na requisição.</div>

            {fichasDisponiveis.length>0 && (
              <>
                <div style={{fontSize:12,fontWeight:600,color:'#6b7c5e',marginBottom:6}}>Do plano selecionado</div>
                {fichasDisponiveis.map(f=>(
                  <div key={f.id} onClick={()=>setFichasSel(p=>p.includes(f.id)?p.filter(x=>x!==f.id):[...p,f.id])} style={{
                    display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,
                    border:`1px solid ${fichasSel.includes(f.id)?'#b5651d':'rgba(31,27,22,0.12)'}`,
                    background:fichasSel.includes(f.id)?'rgba(181,101,29,0.06)':'#fff',marginBottom:5,cursor:'pointer',
                  }}>
                    <div style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${fichasSel.includes(f.id)?'#b5651d':'rgba(31,27,22,0.2)'}`,background:fichasSel.includes(f.id)?'#b5651d':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'white',fontSize:11}}>
                      {fichasSel.includes(f.id)&&'✓'}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500}}>{f.nomePrato}</div>
                      <div style={muted}>{f.classificacao} · {f.numPorcoes} porções</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {fichasLivres.length>0 && (
              <>
                <div style={{fontSize:12,fontWeight:600,color:'#6b7c5e',margin:'10px 0 6px'}}>Outras fichas disponíveis</div>
                {fichasLivres.map(f=>(
                  <div key={f.id} onClick={()=>setFichasSel(p=>p.includes(f.id)?p.filter(x=>x!==f.id):[...p,f.id])} style={{
                    display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,
                    border:`1px solid ${fichasSel.includes(f.id)?'#b5651d':'rgba(31,27,22,0.12)'}`,
                    background:fichasSel.includes(f.id)?'rgba(181,101,29,0.06)':'#f7f1e6',marginBottom:5,cursor:'pointer',
                  }}>
                    <div style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${fichasSel.includes(f.id)?'#b5651d':'rgba(31,27,22,0.2)'}`,background:fichasSel.includes(f.id)?'#b5651d':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'white',fontSize:11}}>
                      {fichasSel.includes(f.id)&&'✓'}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500}}>{f.nomePrato}</div>
                      <div style={muted}>{f.classificacao} · {f.numPorcoes} porções</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Pax e dados */}
        {planoSel && fichasSel.length>0 && (
          <div style={card}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:10,color:'#b5651d'}}>3. Dados da requisição</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Nº de doses (pax total)</label><input style={inp} type="number" value={paxTotal} onChange={e=>setPaxTotal(Number(e.target.value))}/></div>
              <div><label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Quebras (%)</label><input style={inp} type="number" value={quebras} onChange={e=>setQuebras(Number(e.target.value))}/></div>
              <div><label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Beverage Cost (%)</label><input style={inp} type="number" value={bevCost} onChange={e=>setBevCost(Number(e.target.value))}/></div>
              <div><label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Responsável compras</label><input style={inp} value={responsavelCompras} onChange={e=>setResponsavelCompras(e.target.value)} placeholder="Nome"/></div>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Atividade</label>
              <input style={inp} value={atividade} onChange={e=>setAtividade(e.target.value)} placeholder="ex: Almoço Erasmus — 2ºARB e 2ºACP"/>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:6}}>Consumo</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[['bar','ECL BAR'],['rest','ECL Restaurante'],['interno','Consumo Interno'],['convidados','Convidados']].map(([k,l])=>(
                  <label key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,border:`1px solid ${consumo[k as keyof typeof consumo]?'#b5651d':'rgba(31,27,22,0.12)'}`,background:consumo[k as keyof typeof consumo]?'rgba(181,101,29,0.06)':'#fff',cursor:'pointer',fontSize:13}}>
                    <input type="checkbox" checked={consumo[k as keyof typeof consumo]} onChange={e=>setConsumo(p=>({...p,[k]:e.target.checked}))} style={{accentColor:'#b5651d'}}/>
                    {l}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {planoSel && fichasSel.length>0 && (
          <button style={{...btnP,width:'100%'}} onClick={gerarLinhas}>
            Gerar requisição com {fichasSel.length} ficha{fichasSel.length>1?'s':''} →
          </button>
        )}
      </div>
    );
  }

  // ── FASE 2 — EDITAR E ENVIAR ──────────────────────────────
  const fmt = (n:number) => n>0?`${n.toFixed(2)} €`:'—';

  return (
    <div>
      <button style={{...btnG,marginBottom:12}} onClick={()=>setFase('escolher')}>← Voltar</button>

      {/* Cabeçalho */}
      <div style={{...card,background:'#1f1b16',color:'#f7f1e6'}}>
        <div style={{fontFamily:'Fraunces,serif',fontSize:18,fontWeight:700,marginBottom:4}}>{planoSel?.titulo||'Requisição'}</div>
        <div style={{fontSize:12,opacity:0.6}}>{planoSel?.data} · {planoSel?.turmaId} · {planoSel?.professor}</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
          {todasFichas.filter(f=>fichasSel.includes(f.id)).map(f=>(
            <span key={f.id} style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(247,241,230,0.15)',color:'#f7f1e6'}}>{f.nomePrato}</span>
          ))}
        </div>
      </div>

      {/* Totais */}
      <div style={{...card}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center'}}>
          {[['Custo Real/pax',fmt(cr1pax)],['PVS s/IVA',fmt(pvs)],['PVP c/IVA',fmt(pvp)]].map(([l,v])=>(
            <div key={l} style={{background:'rgba(181,101,29,0.06)',borderRadius:10,padding:'10px 6px'}}>
              <div style={{fontFamily:'Fraunces,serif',fontSize:18,fontWeight:700,color:'#b5651d'}}>{v}</div>
              <div style={{...muted,fontSize:11}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ingredientes agregados */}
      <div style={card}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:10,color:'#b5651d'}}>Ingredientes consolidados</div>
        <div style={{fontSize:11,opacity:0.5,marginBottom:8}}>Quantidades calculadas para {paxTotal} doses. Preenche os preços unitários.</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'#1f1b16',color:'#f7f1e6'}}>
                <th style={{padding:'8px 10px',textAlign:'left',fontWeight:500}}>Ingrediente</th>
                <th style={{padding:'8px 6px',textAlign:'right',fontWeight:500,whiteSpace:'nowrap'}}>Qt. Total</th>
                <th style={{padding:'8px 6px',textAlign:'left',fontWeight:500}}>Und</th>
                <th style={{padding:'8px 6px',textAlign:'right',fontWeight:500,whiteSpace:'nowrap'}}>Preço/un €</th>
                <th style={{padding:'8px 6px',textAlign:'right',fontWeight:500}}>Total</th>
                <th style={{padding:'8px 6px',textAlign:'left',fontWeight:500,fontSize:10}}>Fichas</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l,i)=>{
                const p=parseFloat(l.preco)||0;
                const tot=p*l.qtTotal;
                return(
                  <tr key={i} style={{background:i%2===0?'#fff':'#f7f1e6',borderBottom:'1px solid rgba(31,27,22,0.06)'}}>
                    <td style={{padding:'7px 10px',fontWeight:500}}>{l.produto}</td>
                    <td style={{padding:'7px 6px',textAlign:'right'}}>{l.qtTotal.toFixed(3)}</td>
                    <td style={{padding:'7px 6px'}}>{l.und}</td>
                    <td style={{padding:'4px 6px'}}>
                      <input value={l.preco} onChange={e=>setPreco(i,e.target.value)} style={{...inp,padding:'4px 6px',fontSize:12,textAlign:'right',width:70}} placeholder="0.00"/>
                    </td>
                    <td style={{padding:'7px 6px',textAlign:'right',fontWeight:tot>0?500:400,color:tot>0?'#b5651d':'rgba(31,27,22,0.3)'}}>{tot>0?fmt(tot):'—'}</td>
                    <td style={{padding:'7px 6px',fontSize:10,opacity:0.5}}>{l.fichas.join(', ')}</td>
                  </tr>
                );
              })}
              <tr style={{background:'rgba(181,101,29,0.06)',fontWeight:700}}>
                <td colSpan={4} style={{padding:'8px 10px'}}>Total Custo Receita</td>
                <td style={{padding:'8px 6px',textAlign:'right',color:'#b5651d'}}>{fmt(totReceita)}</td>
                <td/>
              </tr>
              <tr style={{background:'rgba(181,101,29,0.04)'}}>
                <td colSpan={4} style={{padding:'6px 10px'}}>Quebras {quebras}%</td>
                <td style={{padding:'6px 6px',textAlign:'right'}}>{fmt(qbVal)}</td>
                <td/>
              </tr>
              <tr style={{background:'rgba(179,65,58,0.06)',fontWeight:700}}>
                <td colSpan={4} style={{padding:'8px 10px'}}>Custo Real</td>
                <td style={{padding:'8px 6px',textAlign:'right',color:'#b3413a'}}>{fmt(crTotal)}</td>
                <td/>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Consumo e atividade */}
      <div style={card}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div>
            <div style={{fontWeight:600,fontSize:12,marginBottom:6}}>Consumo</div>
            {[['bar','ECL BAR'],['rest','ECL Restaurante'],['interno','Consumo Interno'],['convidados','Convidados']].map(([k,l])=>(
              <div key={k} style={{fontSize:12,padding:'3px 0',color:consumo[k as keyof typeof consumo]?'#b5651d':'rgba(31,27,22,0.4)'}}>
                {consumo[k as keyof typeof consumo]?'✓':'○'} {l}
              </div>
            ))}
          </div>
          <div>
            <div style={{fontWeight:600,fontSize:12,marginBottom:4}}>Turma</div>
            <div style={{fontSize:13}}>{planoSel?.turmaId}</div>
            <div style={{fontWeight:600,fontSize:12,marginTop:8,marginBottom:4}}>Data aula</div>
            <div style={{fontSize:13}}>{planoSel?.data}</div>
            <div style={{fontWeight:600,fontSize:12,marginTop:8,marginBottom:4}}>Formador</div>
            <div style={{fontSize:13}}>{planoSel?.professor||'—'}</div>
            <div style={{fontWeight:600,fontSize:12,marginTop:8,marginBottom:4}}>Resp. Compras</div>
            <div style={{fontSize:13}}>{responsavelCompras||'—'}</div>
          </div>
        </div>
        {atividade&&<div style={{marginTop:10,padding:'8px 10px',background:'#f7f1e6',borderRadius:8,fontSize:13}}><strong>Atividade:</strong> {atividade}</div>}
      </div>

      {/* Ações */}
      {msg&&<div style={{padding:'10px 14px',background:'rgba(107,124,94,0.1)',borderRadius:10,fontSize:13,color:'#6b7c5e',marginBottom:10,fontWeight:500}}>{msg}</div>}
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button style={btnP} onClick={enviarSheets}>📊 Enviar para Sheets</button>
        <button style={btnG} onClick={guardarLocal}>💾 Guardar</button>
        <button style={btnG} onClick={()=>window.print()}>🖨️ Imprimir</button>
      </div>
    </div>
  );
}

