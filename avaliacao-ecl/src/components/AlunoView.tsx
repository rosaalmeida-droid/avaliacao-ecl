import React, { useState } from 'react';
import { Aluno, PlanoAula, FichaProducao } from '../types';
import {
  getPlanosAulaPorTurma, getFichasPorPlano, getRequisicaoPorPlano,
  getDistribuicoesPorPlano, getChecklistAlunoFicha, addOrUpdateChecklistAluno,
  addOrUpdateSelecao, getHistoricoAlunoMicro, addRegistoAvaliacao,
} from '../backend';
import { MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS, PARAMETROS_AVALIACAO,
  microsPorUC, jaTeveSucesso, estaEmRegressao, MicroCompetencia,
} from '../competenciasECL';
import { GuiaProducao } from './GuiaProducao';

// ── Estilos ───────────────────────────────────────────────────
const S = {
  card: { background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:'16px', marginBottom:10, boxShadow:'var(--shadow-sm)' } as React.CSSProperties,
  muted: { fontSize:12, color:'rgba(26,23,20,0.5)' } as React.CSSProperties,
  verde: { background:'#1D9E75', color:'white', border:'none', borderRadius:10, padding:'10px 16px', fontWeight:600, cursor:'pointer', width:'100%', marginTop:8, fontSize:13 } as React.CSSProperties,
  cinza: { background:'rgba(26,23,20,0.08)', color:'rgba(26,23,20,0.6)', border:'none', borderRadius:10, padding:'10px 16px', fontWeight:600, cursor:'pointer', width:'100%', marginTop:6, fontSize:13 } as React.CSSProperties,
};

const FARD_ITEMS = ['Touca','Avental limpo','Sapatos seguranca','Farda completa','Sem unhas postiças','Sem fones/adornos','Maos limpas','Cabelo preso'];

function getHist(key: string): number { try { return parseInt(localStorage.getItem(key)||'0'); } catch { return 0; } }
function incHist(key: string) { try { localStorage.setItem(key, String(getHist(key)+1)); } catch {} }

function StepBar({ steps, current }: { steps:string[]; current:number }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${steps.length},1fr)`, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', marginBottom:12 }}>
      {steps.map((s,i)=>(
        <div key={i} style={{
          padding:'6px 2px', textAlign:'center', fontSize:9,
          borderRight: i<steps.length-1?'1px solid var(--border)':'none',
          background: i<current?'var(--sage-pale)':i===current?'var(--copper)':'var(--cream-dark)',
          color: i<current?'var(--sage)':i===current?'white':'rgba(26,23,20,0.4)',
          fontWeight: i===current?700:400,
        }}>
          {i<current?'✓ ':''}{s}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export function AlunoView({ aluno }: { aluno: Aluno }) {
  const planos = getPlanosAulaPorTurma(aluno.turmaId).filter(p=>p.estado==='publicado');
  const [planoAtivo, setPlanoAtivo] = useState<PlanoAula|null>(null);

  if (planoAtivo) return <FluxoPlano plano={planoAtivo} aluno={aluno} onVoltar={()=>setPlanoAtivo(null)} />;

  return (
    <div>
      <div style={S.card}>
        <div style={{ fontSize:16, fontWeight:700 }}>Olá, {aluno.nome||`Aluno ${aluno.numero}`}!</div>
        <div style={S.muted}>{aluno.turmaId} · {aluno.ano}º ano</div>
      </div>
      <div style={S.card}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Aulas disponíveis</div>
        {planos.length===0&&<div style={S.muted}>Ainda não há aulas publicadas pelo professor.</div>}
        {planos.map(p=>{
          const d = new Date(p.data+'T12:00:00');
          return (
            <div key={p.id} onClick={()=>setPlanoAtivo(p)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)', marginBottom:6, cursor:'pointer', background:'#fff' }}>
              <div style={{ background:'var(--copper-pale)', borderRadius:8, padding:'6px 8px', textAlign:'center', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--copper)', lineHeight:1 }}>{d.getDate().toString().padStart(2,'0')}</div>
                <div style={{ fontSize:9, color:'var(--copper)', textTransform:'uppercase', fontWeight:600 }}>{d.toLocaleDateString('pt-PT',{month:'short'})}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{p.titulo}</div>
                <div style={S.muted}>{p.horaInicio}–{p.horaFim}{p.ucId?` · ${p.ucId}`:''}</div>
              </div>
              <span style={{ fontSize:11, color:'var(--copper)', fontWeight:600 }}>→</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLUXO COMPLETO
// ═══════════════════════════════════════════════════════════════
function FluxoPlano({ plano, aluno, onVoltar }: { plano:PlanoAula; aluno:Aluno; onVoltar:()=>void }) {
  const STEPS = ['Entrada','Ficha','Requisição','Autoavaliação','Pares','Fim'];
  const [passo, setPasso] = useState(0);
  const fichas = getFichasPorPlano(plano.id);
  const requisicao = getRequisicaoPorPlano(plano.id);
  const distribuicoes = getDistribuicoesPorPlano(plano.id);

  const fichasDoAluno = fichas.filter(f=>{
    const dist = distribuicoes.find(d=>d.fichaId===f.id);
    if (!dist||dist.modo==='todos') return true;
    return dist.alunosIds.includes(aluno.id)||dist.grupos.some(g=>g.alunosIds.includes(aluno.id));
  });

  const [fichaAtiva, setFichaAtiva] = useState<FichaProducao|null>(fichasDoAluno[0]||null);

  // Entrada
  const [pontVal, setPontVal] = useState<'sim'|'atras'|null>(null);
  const [pontMins, setPontMins] = useState(0);
  const [pontHora, setPontHora] = useState('');
  const [fardState, setFardState] = useState<Record<string,boolean|null>>(Object.fromEntries(FARD_ITEMS.map(f=>[f,null])));
  const histAtrasos = getHist(`ecl_atrasos_${aluno.id}`);
  const fardCompleto = Object.values(fardState).every(v=>v!==null);
  const entradaOk = pontVal!==null&&fardCompleto;

  function setPont(v:'sim'|'atras') {
    setPontVal(v);
    const now = new Date();
    setPontHora(now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0'));
    if (v==='atras') {
      const [h,m] = plano.horaInicio.split(':').map(Number);
      setPontMins(Math.max(1,(now.getHours()*60+now.getMinutes())-(h*60+m)));
    }
  }

  function toggleFard(item:string) {
    setFardState(prev=>{const v=prev[item]; return {...prev,[item]:v===null?true:v===true?false:null};});
  }

  function confirmarEntrada() {
    if (pontVal==='atras') incHist(`ecl_atrasos_${aluno.id}`);
    FARD_ITEMS.forEach(item=>{if(fardState[item]===false) incHist(`ecl_fard_${aluno.id}_${item}`);});
    setPasso(1);
  }

  return (
    <div>
      <StepBar steps={STEPS} current={passo} />

      {/* PASSO 0 — ENTRADA */}
      {passo===0&&(
        <div>
          <div style={{...S.card, background:'var(--charcoal)', color:'var(--cream)'}}>
            <div style={{ fontSize:15, fontWeight:700 }}>{plano.titulo}</div>
            <div style={{ fontSize:11, opacity:0.7 }}>{plano.data} · {plano.horaInicio}–{plano.horaFim}</div>
            {plano.ucId&&(
              <div style={{ marginTop:8, padding:'6px 10px', background:'rgba(181,101,29,0.25)', borderRadius:8 }}>
                <div style={{ fontSize:9, color:'rgba(247,241,230,0.5)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Unidade de Competência</div>
                <div style={{ fontSize:12, color:'var(--cream)', fontWeight:700 }}>{plano.ucId}</div>
                <div style={{ fontSize:11, color:'rgba(247,241,230,0.7)', marginTop:2 }}>{plano.ucNome}</div>
              </div>
            )}
          </div>

          <div style={S.card}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Pontualidade</div>
            <div style={{ display:'flex', gap:6 }}>
              {(['sim','atras'] as const).map(v=>(
                <button key={v} onClick={()=>setPont(v)} style={{
                  flex:1, padding:'12px 6px', borderRadius:10, fontSize:12, cursor:'pointer', textAlign:'center',
                  border:'1px solid var(--border)',
                  background:pontVal===v?(v==='sim'?'var(--sage-pale)':'var(--copper-pale)'):'#fff',
                  color:pontVal===v?(v==='sim'?'var(--sage)':'var(--copper)'):'rgba(26,23,20,0.5)',
                  fontWeight:600,
                }}>
                  <div style={{ fontSize:20, marginBottom:3 }}>{v==='sim'?'✓':'◷'}</div>
                  {v==='sim'?'Cheguei a horas':'Cheguei atrasado/a'}
                </button>
              ))}
            </div>
            {pontHora&&(
              <div style={{ marginTop:8, padding:'8px 10px', background:pontVal==='sim'?'var(--sage-pale)':'var(--copper-pale)', borderRadius:8 }}>
                <div style={S.muted}>Registado às</div>
                <div style={{ fontSize:18, fontWeight:700, color:pontVal==='sim'?'var(--sage)':'var(--copper)' }}>{pontHora}</div>
                {pontVal==='atras'&&pontMins>0&&<div style={{ fontSize:11, marginTop:2, color:'var(--danger)' }}>{pontMins} minutos de atraso</div>}
              </div>
            )}
            {pontVal==='atras'&&histAtrasos+1>=3&&(
              <div style={{ marginTop:8, padding:'9px 10px', background:'var(--danger-pale)', borderRadius:8, border:'1px solid rgba(192,57,43,0.2)' }}>
                <div style={{ fontWeight:600, fontSize:12, color:'var(--danger)' }}>{histAtrasos+1}ª vez atrasado/a</div>
                <div style={{ fontSize:11, color:'var(--danger)', opacity:0.8, marginTop:2 }}>O professor foi informado. A pontualidade é avaliada.</div>
              </div>
            )}
          </div>

          <div style={S.card}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:6 }}>Fardamento e higiene pessoal</div>
            <div style={S.muted}>Confirma cada item honestamente.</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginTop:8 }}>
              {FARD_ITEMS.map(item=>{
                const v = fardState[item];
                return (
                  <div key={item} onClick={()=>toggleFard(item)} style={{
                    display:'flex', alignItems:'center', gap:6, padding:'7px 9px', borderRadius:8, cursor:'pointer', fontSize:11,
                    border:'1px solid var(--border)',
                    background:v===true?'var(--sage-pale)':v===false?'var(--danger-pale)':'var(--cream-dark)',
                    color:v===true?'var(--sage)':v===false?'var(--danger)':'rgba(26,23,20,0.5)',
                  }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:v===true?'var(--sage)':v===false?'var(--danger)':'rgba(26,23,20,0.2)' }}/>
                    <span style={{ flex:1 }}>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button style={{...S.verde, opacity:entradaOk?1:0.4}} disabled={!entradaOk} onClick={confirmarEntrada}>Continuar →</button>
          <button style={S.cinza} onClick={onVoltar}>← Voltar</button>
        </div>
      )}

      {/* PASSO 1 — FICHA */}
      {passo===1&&(
        <div>
          <div style={S.card}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Fichas de produção desta aula</div>
            {fichasDoAluno.length===0&&<div style={S.muted}>Não tens fichas atribuídas neste plano.</div>}
            {fichasDoAluno.map(f=>(
              <div key={f.id} onClick={()=>setFichaAtiva(f)} style={{
                padding:10, borderRadius:8, border:`1.5px solid ${fichaAtiva?.id===f.id?'var(--copper)':'var(--border)'}`,
                marginBottom:6, background:fichaAtiva?.id===f.id?'var(--copper-pale)':'#fff', cursor:'pointer',
              }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{f.nomePrato||'Ficha sem nome'}</div>
                <div style={S.muted}>{f.classificacao} · {f.numPorcoes} doses</div>
              </div>
            ))}
          </div>
          {fichaAtiva&&<FichaAluno ficha={fichaAtiva} plano={plano} aluno={aluno} onNext={()=>setPasso(2)} onBack={()=>setPasso(0)}/>}
          {!fichaAtiva&&<button style={S.cinza} onClick={()=>setPasso(0)}>← Voltar</button>}
        </div>
      )}

      {/* PASSO 2 — REQUISIÇÃO */}
      {passo===2&&(
        <div>
          <div style={S.card}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Requisição da aula</div>
            {!requisicao&&<div style={S.muted}>A requisição ainda não está disponível.</div>}
            {requisicao&&(
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'var(--charcoal)', color:'var(--cream)' }}>
                    <th style={{ padding:'7px 10px', textAlign:'left' }}>Produto</th>
                    <th style={{ padding:'7px 6px', textAlign:'right' }}>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {requisicao.linhas.map((l,i)=>(
                    <tr key={l.id} style={{ background:i%2===0?'#fff':'var(--cream)', borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'7px 10px' }}>{l.produto}</td>
                      <td style={{ padding:'7px 6px', textAlign:'right' }}>{l.quantidadeTotal} {l.unidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button style={{...S.cinza, flex:0, width:44}} onClick={()=>setPasso(1)}>←</button>
            <button style={{...S.verde, flex:1, marginTop:0}} onClick={()=>setPasso(3)}>Continuar →</button>
          </div>
        </div>
      )}

      {/* PASSO 3 — AUTOAVALIAÇÃO */}
      {passo===3&&fichaAtiva&&(
        <AutoavaliacaoAluno ficha={fichaAtiva} plano={plano} aluno={aluno} onBack={()=>setPasso(2)} onFinish={()=>setPasso(4)}/>
      )}

      {/* PASSO 4 — PARES */}
      {passo===4&&(
        <div>
          <div style={S.card}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>Avaliação dos colegas</div>
            <div style={S.muted}>Confidencial — o colega não vê o que escreveste.</div>
          </div>
          <div style={{ display:'flex', gap:6, marginTop:10 }}>
            <button style={{...S.cinza, flex:0, width:44}} onClick={()=>setPasso(3)}>←</button>
            <button style={{...S.verde, flex:1, marginTop:0}} onClick={()=>setPasso(5)}>Submeter →</button>
          </div>
        </div>
      )}

      {/* PASSO 5 — FIM */}
      {passo===5&&(
        <div>
          <div style={{...S.card, textAlign:'center', padding:24}}>
            <div style={{ fontSize:40, marginBottom:10 }}>✓</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:6 }}>Avaliação completa!</div>
            <div style={S.muted}>O professor irá validar as tuas escolhas.</div>
          </div>
          <div style={S.card}>
            <div style={{ fontWeight:600, fontSize:12, marginBottom:8 }}>Registo desta aula</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={S.muted}>Pontualidade</span>
              <span style={{ fontWeight:600, color:pontVal==='sim'?'var(--sage)':'var(--copper)' }}>
                {pontVal==='sim'?'A horas':`Atrasado/a ${pontMins} min`}
              </span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0' }}>
              <span style={S.muted}>Fardamento</span>
              <span style={{ fontWeight:600, color:Object.values(fardState).every(v=>v===true)?'var(--sage)':'var(--copper)' }}>
                {Object.values(fardState).every(v=>v===true)?'Completo':'Incompleto'}
              </span>
            </div>
          </div>
          <button style={S.verde} onClick={onVoltar}>Voltar ao início</button>
        </div>
      )}
    </div>
  );
}

// ── Ficha do aluno ────────────────────────────────────────────
function FichaAluno({ ficha, plano, aluno, onNext, onBack }: { ficha:FichaProducao; plano:PlanoAula; aluno:Aluno; onNext:()=>void; onBack:()=>void }) {
  const existente = getChecklistAlunoFicha(plano.id, ficha.id, aluno.id);
  const [ingredientesConfirmados, setIngConf] = useState<string[]>(existente?.ingredientesConfirmados||[]);
  const [passosConcluidos, setPassosConcl] = useState<string[]>(existente?.passosConcluidos||[]);
  const [haccpConfirmado, setHaccpConf] = useState<string[]>(existente?.haccpConfirmado||[]);
  const [comentario, setComentario] = useState(existente?.comentario||'');

  function toggle(list:string[], setList:(v:string[])=>void, id:string) {
    setList(list.includes(id)?list.filter(x=>x!==id):[...list,id]);
  }

  function continuar() {
    addOrUpdateChecklistAluno({
      id: existente?.id||`check_${plano.id}_${ficha.id}_${aluno.id}`,
      planoAulaId:plano.id, fichaId:ficha.id, alunoId:aluno.id,
      ingredientesConfirmados, passosConcluidos, haccpConfirmado,
      comentario, atualizadoEm:new Date().toISOString(),
    });
    onNext();
  }

  return (
    <div>
      <div style={{...S.card, background:'var(--charcoal)', color:'var(--cream)'}}>
        <div style={{ fontWeight:700, fontSize:15 }}>{ficha.nomePrato||'Ficha de Producao'}</div>
        <div style={{ fontSize:11, opacity:0.7 }}>{ficha.classificacao} · {ficha.numPorcoes} doses</div>
      </div>

      {/* Ingredientes */}
      <div style={S.card}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Ingredientes</div>
        {ficha.ingredientes?.map(ing=>(
          <label key={ing.id} style={{ display:'block', padding:8, borderRadius:8, border:'1px solid var(--border)', marginBottom:5, background:ingredientesConfirmados.includes(ing.id)?'var(--sage-pale)':'#fff', cursor:'pointer' }}>
            <input type="checkbox" checked={ingredientesConfirmados.includes(ing.id)} onChange={()=>toggle(ingredientesConfirmados,setIngConf,ing.id)} style={{ accentColor:'var(--sage)' }}/>{' '}
            <strong>{ing.qt} {ing.un}</strong> {ing.produto}
            {ing.obs&&<span style={{ fontSize:10, color:'var(--copper)', marginLeft:6 }}>{ing.obs}</span>}
          </label>
        ))}
      </div>

      {/* Passos */}
      <div style={S.card}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Passos da produção</div>
        {ficha.preparacao?.map(p=>(
          <label key={p.id} style={{ display:'block', padding:8, borderRadius:8, border:'1px solid var(--border)', marginBottom:5, background:passosConcluidos.includes(p.id)?'var(--sage-pale)':'#fff', cursor:'pointer' }}>
            <input type="checkbox" checked={passosConcluidos.includes(p.id)} onChange={()=>toggle(passosConcluidos,setPassosConcl,p.id)} style={{ accentColor:'var(--sage)' }}/>{' '}
            <strong>{p.num}.</strong> {p.descricao}
            {(p.temperatura||p.tempo)&&<div style={{...S.muted,fontSize:10}}>{p.temperatura} {p.tempo}</div>}
          </label>
        ))}
      </div>

      {/* HACCP */}
      {ficha.preparacao?.filter(p=>p.haccp).length>0&&(
        <div style={S.card}>
          <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Pontos HACCP — verificar</div>
          {ficha.preparacao.filter(p=>p.haccp).map(p=>(
            <label key={p.id} style={{ display:'block', padding:8, borderRadius:8, border:'1px solid var(--border)', marginBottom:5, background:haccpConfirmado.includes(p.id)?'var(--sage-pale)':'var(--copper-pale)', cursor:'pointer' }}>
              <input type="checkbox" checked={haccpConfirmado.includes(p.id)} onChange={()=>toggle(haccpConfirmado,setHaccpConf,p.id)} style={{ accentColor:'var(--copper)' }}/>{' '}
              ⚠️ {p.haccp}
            </label>
          ))}
        </div>
      )}

      {/* Observação */}
      <div style={S.card}>
        <div style={{ fontWeight:600, fontSize:12, marginBottom:6 }}>Observação (opcional)</div>
        <textarea style={{ width:'100%', minHeight:60, borderRadius:8, border:'1px solid var(--border)', padding:8, fontSize:12, fontFamily:'var(--font-body)' }}
          value={comentario} onChange={e=>setComentario(e.target.value)}
          placeholder="Ex: ingrediente em falta, substituição feita, dúvida..."/>
      </div>

      {/* GUIA DE APOIO À PRODUÇÃO — separado da ficha */}
      {(ficha as any).textoGuia && (
        <div style={S.card}>
          <GuiaProducao textoGuia={(ficha as any).textoGuia} nomePrato={ficha.nomePrato || ''} />
        </div>
      )}

      <div style={{ display:'flex', gap:6 }}>
        <button style={{...S.cinza, flex:0, width:44, marginTop:0}} onClick={onBack}>←</button>
        <button style={{...S.verde, flex:1, marginTop:0}} onClick={continuar}>Guardar e continuar →</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUTOAVALIAÇÃO — com microcompetências da UC + critérios observáveis
// ═══════════════════════════════════════════════════════════════
function AutoavaliacaoAluno({ ficha, plano, aluno, onBack, onFinish }: {
  ficha:FichaProducao; plano:PlanoAula; aluno:Aluno; onBack:()=>void; onFinish:()=>void;
}) {
  // Buscar microcompetências da UC desta aula
  const ucId = plano.ucId || '';
  const microsDaUC = ucId ? microsPorUC(ucId) : MICROCOMPETENCIAS.filter(m=>m.prioridade==='A');

  // Verificar histórico do aluno para cada microcompetência
  const microsSugeridas = microsDaUC.slice(0, 8).map(m => {
    const hist = getHistoricoAlunoMicro(aluno.id, m.id);
    // converter para {nota, data} para as funções do motor
    const avaliacoes = hist.map(h=>({ nota: h.nota, data: h.data }));
    const consolidada = jaTeveSucesso(avaliacoes);
    const emRegressao = estaEmRegressao(avaliacoes);
    const nunca = avaliacoes.length === 0;
    const notasSimples = avaliacoes.map(a=>a.nota);

    let prioridade = 5;
    let motivo = '';
    if (emRegressao) { prioridade = 1; motivo = '⚠️ Em regressao — notas a descer'; }
    else if (avaliacoes.length>=3 && !consolidada) { prioridade = 2; motivo = '→ Sem evolucao significativa'; }
    else if (nunca) { prioridade = 3; motivo = '★ Nunca avaliada nesta UC'; }
    else if (!consolidada) { prioridade = 4; motivo = '↑ Ainda em desenvolvimento'; }
    else { motivo = '✓ Consolidada'; }

    const mediaRecente = notasSimples.length>0 ? notasSimples.slice(-3).reduce((s,n)=>s+n,0)/Math.min(3,notasSimples.length) : 0;
    return { ...m, prioridade, motivo, consolidada, avaliacoes, mediaRecente };
  }).sort((a,b)=>a.prioridade-b.prioridade);

  // Microcompetências obrigatórias (sempre presentes)
  const [nivelHigiene, setNivelHigiene] = useState<number|null>(null);
  const [nivelHaccp, setNivelHaccp] = useState<number|null>(null);

  // Selecção do aluno (1 adicional)
  const [microEscolhida, setMicroEscolhida] = useState<string|null>(null);
  const [microAberta, setMicroAberta] = useState<string|null>(null);
  const [avisoEscolha, setAvisoEscolha] = useState('');

  // Avaliações das microcompetências sugeridas (numéricas)
  const [notas, setNotas] = useState<Record<string,number|null>>({});
  // Avaliações dos critérios observáveis (string: 'sozinho'/'ajuda'/'nao')
  const [criteriosResp, setCriteriosResp] = useState<Record<string,string|null>>({});

  function escolherMicro(id: string) {
    const m = MICROCOMPETENCIAS.find(x=>x.id===id);
    if (!m) return;
    const hist = getHistoricoAlunoMicro(aluno.id, id);
    const avaliacoes = hist.map(h=>({ nota: h.nota, data: h.data }));
    if (jaTeveSucesso(avaliacoes)) {
      setAvisoEscolha(PARAMETROS_AVALIACAO.mensagemBloqueioAluno);
      return;
    }
    setAvisoEscolha('');
    setMicroEscolhida(id===microEscolhida?null:id);
  }

  const NIVEIS = [
    { v:5,  label:'Ainda não consigo', cor:'var(--danger-pale)', txt:'var(--danger)' },
    { v:10, label:'Consigo com ajuda',  cor:'var(--copper-pale)', txt:'var(--copper)' },
    { v:15, label:'Consigo sozinho/a',  cor:'var(--sage-pale)',   txt:'var(--sage)' },
    { v:18, label:'Faço com segurança', cor:'rgba(37,99,235,0.08)', txt:'var(--info)' },
  ];

  const prontoParaSubmeter = nivelHigiene!==null && nivelHaccp!==null;

  function submeter() {
    const agora = new Date().toISOString();
    // Registar obrigatórias
    if (nivelHigiene!==null) addRegistoAvaliacao({ id:`${plano.id}_${ficha.id}_${aluno.id}_higiene`, alunoId:aluno.id, turmaId:aluno.turmaId, planoAulaId:plano.id, fichaId:ficha.id, ucId:plano.ucId||'', microcompetenciaId:'OBR_01', nota:nivelHigiene, data:agora, validadoPor:'aluno' });
    if (nivelHaccp!==null) addRegistoAvaliacao({ id:`${plano.id}_${ficha.id}_${aluno.id}_haccp`, alunoId:aluno.id, turmaId:aluno.turmaId, planoAulaId:plano.id, fichaId:ficha.id, ucId:plano.ucId||'', microcompetenciaId:'OBR_02', nota:nivelHaccp, data:agora, validadoPor:'aluno' });
    // Registar técnicas
    Object.entries(notas).forEach(([microId,nota])=>{
      if (nota!==null) addRegistoAvaliacao({ id:`${plano.id}_${ficha.id}_${aluno.id}_${microId}`, alunoId:aluno.id, turmaId:aluno.turmaId, planoAulaId:plano.id, fichaId:ficha.id, ucId:plano.ucId||'', microcompetenciaId:microId, nota, data:agora, validadoPor:'aluno' });
    });
    // Guardar selecção
    addOrUpdateSelecao({ id:`${plano.id}_${ficha.id}_${aluno.id}`, comandaId:`${plano.id}_${ficha.id}`, planoAulaId:plano.id, fichaId:ficha.id, alunoId:aluno.id, turmaId:aluno.turmaId, tecnicas:Object.keys(notas), atitudes:[], responsabilidades:[], autoavaliacoes:Object.entries(notas).filter(([,n])=>n!==null).map(([competenciaId,nota])=>({competenciaId,nivel:nota!>=17?'superei':nota!>=14?'atingi':nota!>=10?'desenvolvimento':'nao_atingi'})), criadaEm:agora });
    onFinish();
  }

  return (
    <div>
      {/* OBRIGATÓRIAS */}
      <div style={S.card}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:2, color:'var(--sage)' }}>Competências obrigatórias</div>
        <div style={S.muted}>Sempre presentes — não contam para o limite de 5.</div>

        {[
          { id:'OBR_01', nome:'Higiene pessoal', desc:'Fardamento, maos, apresentacao', val:nivelHigiene, set:setNivelHigiene },
          { id:'OBR_02', nome:'Higiene e Seguranca Alimentar / Registos KitchenFlow', desc:'HACCP, PCC, registos', val:nivelHaccp, set:setNivelHaccp },
        ].map(obr=>(
          <div key={obr.id} style={{ marginTop:10, padding:'10px 12px', borderRadius:10, background:'var(--sage-pale)', border:'1px solid rgba(90,122,78,0.2)' }}>
            <div style={{ fontWeight:600, fontSize:12, marginBottom:6 }}>{obr.nome}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
              {NIVEIS.map(n=>(
                <button key={n.v} onClick={()=>obr.set(n.v)} style={{ padding:'5px 2px', borderRadius:7, border:`1.5px solid ${obr.val===n.v?n.txt:'var(--border)'}`, background:obr.val===n.v?n.cor:'#fff', color:obr.val===n.v?n.txt:'rgba(26,23,20,0.5)', fontSize:9, fontWeight:600, cursor:'pointer', textAlign:'center' }}>
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MICROCOMPETÊNCIAS SUGERIDAS */}
      <div style={S.card}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>Competências técnicas — esta aula</div>
        <div style={S.muted}>Sugeridas com base na UC {plano.ucId||''} e no teu historial. Avalia as que praticaste.</div>

        {microsSugeridas.map(m=>(
          <div key={m.id} style={{ border:`1.5px solid ${microAberta===m.id?'var(--copper)':'var(--border)'}`, borderRadius:10, marginTop:8, overflow:'hidden' }}>
            {/* Cabeçalho da microcompetência */}
            <div onClick={()=>setMicroAberta(microAberta===m.id?null:m.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer', background:microAberta===m.id?'var(--copper-pale)':'#fff' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{m.nome}</div>
                <div style={{ fontSize:10, marginTop:2, color:m.prioridade<=2?'var(--danger)':m.prioridade===3?'var(--copper)':'rgba(26,23,20,0.4)' }}>{m.motivo}</div>
              </div>
              {m.avaliacoes.length>0&&(
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--copper)' }}>{m.mediaRecente.toFixed(1)}</div>
                  <div style={{ fontSize:9, color:'rgba(26,23,20,0.4)' }}>media</div>
                </div>
              )}
              <span style={{ fontSize:14, color:'var(--copper)' }}>{microAberta===m.id?'▲':'▼'}</span>
            </div>

            {/* Critérios observáveis — expandível */}
            {microAberta===m.id&&(
              <div style={{ borderTop:'1px solid var(--border)', padding:'10px 12px', background:'var(--cream-dark)' }}>
                {m.criterios.length>0&&(
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6, color:'var(--charcoal)' }}>O que é observado</div>
                    {m.criterios.map((c,i)=>{
                      const keyC = `${m.id}_c${i}`;
                      const valC = criteriosResp[keyC];
                      return (
                        <div key={i} style={{ marginBottom:8, padding:'8px 10px', borderRadius:8, background:'#fff', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:11, color:'rgba(26,23,20,0.8)', marginBottom:6 }}>· {c.criterio}</div>
                          {c.como&&<div style={{ fontSize:9, color:'rgba(26,23,20,0.4)', marginBottom:6 }}>{c.como}</div>}
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
                            {[
                              { v:'sozinho', label:'Consigo sozinho/a', cor:'var(--sage-pale)', txt:'var(--sage)' },
                              { v:'ajuda',   label:'Consigo com ajuda', cor:'var(--copper-pale)', txt:'var(--copper)' },
                              { v:'nao',     label:'Ainda não consigo', cor:'var(--danger-pale)', txt:'var(--danger)' },
                            ].map(op=>(
                              <button key={op.v} onClick={()=>setCriteriosResp(p=>({...p,[keyC]:p[keyC]===op.v?null:op.v}))} style={{ padding:'5px 2px', borderRadius:7, border:`1.5px solid ${valC===op.v?op.txt:'var(--border)'}`, background:valC===op.v?op.cor:'#fff', color:valC===op.v?op.txt:'rgba(26,23,20,0.5)', fontSize:8, fontWeight:600, cursor:'pointer', textAlign:'center' }}>
                                {op.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>A tua autoavaliacao</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
                  {NIVEIS.map(n=>(
                    <button key={n.v} onClick={()=>setNotas(p=>({...p,[m.id]:p[m.id]===n.v?null:n.v}))} style={{ padding:'6px 3px', borderRadius:7, border:`1.5px solid ${notas[m.id]===n.v?n.txt:'var(--border)'}`, background:notas[m.id]===n.v?n.cor:'#fff', color:notas[m.id]===n.v?n.txt:'rgba(26,23,20,0.5)', fontSize:9, fontWeight:600, cursor:'pointer', textAlign:'center' }}>
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ESCOLHA DO ALUNO — 1 atitude adicional */}
      <div style={S.card}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>A tua escolha — 1 atitude para trabalhar hoje</div>
        <div style={S.muted}>Escolhe uma atitude que queiras demonstrar e desenvolver nesta aula.</div>
        {avisoEscolha&&<div style={{ marginTop:8, padding:'8px 10px', background:'var(--danger-pale)', borderRadius:8, fontSize:12, color:'var(--danger)' }}>{avisoEscolha}</div>}
        <div style={{ marginTop:8, maxHeight:200, overflowY:'auto' }}>
          {ATITUDES.map(a=>(
            <div key={a.id} onClick={()=>{
              setAvisoEscolha('');
              setMicroEscolhida(a.id===microEscolhida?null:a.id);
            }} style={{ padding:'8px 10px', borderRadius:8, border:`1.5px solid ${microEscolhida===a.id?'var(--copper)':'var(--border)'}`, marginBottom:4, cursor:'pointer', background:microEscolhida===a.id?'var(--copper-pale)':'#fff', fontSize:12 }}>
              {a.nome}
            </div>
          ))}
        </div>
      </div>

          {Object.keys(notas).length>0&&(
            <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--cream-dark)', border:'1px solid var(--border)', marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, marginBottom:4 }}>O que isto significa</div>
              {(()=>{
                const vals = Object.values(notas).filter(v=>v!==null);
                const media = vals.length>0 ? (vals as number[]).reduce((s,v)=>s+(v as number),0)/vals.length : 0;
                const txt = media>=17 ? 'Consigo realizar esta tarefa com autonomia e segurança. Óptimo trabalho!'
                  : media>=14 ? 'Já consigo realizar a maior parte das tarefas com segurança.'
                  : media>=10 ? 'Já consigo realizar algumas tarefas, mas ainda preciso de apoio em algumas etapas.'
                  : 'Ainda preciso de muito acompanhamento. Não desistas — é assim que se aprende!';
                const cor = media>=17?'var(--sage)':media>=14?'var(--sage)':media>=10?'var(--copper)':'var(--danger)';
                return <div style={{ fontSize:12, color:cor }}>{txt}</div>;
              })()}
            </div>
          )}
      {!prontoParaSubmeter&&<div style={{ padding:'8px 12px', background:'var(--copper-pale)', borderRadius:8, fontSize:12, color:'var(--copper)', marginBottom:10 }}>Preenche as competências obrigatórias antes de submeter.</div>}

      <div style={{ display:'flex', gap:6 }}>
        <button style={{...S.cinza, flex:0, width:44, marginTop:0}} onClick={onBack}>←</button>
        <button style={{...S.verde, flex:1, marginTop:0, opacity:prontoParaSubmeter?1:0.4}} disabled={!prontoParaSubmeter} onClick={submeter}>Submeter autoavaliacao →</button>
      </div>
    </div>
  );
}

