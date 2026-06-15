import React, { useState } from 'react';
import { Aluno, Comanda } from '../types';
import { getComandas, getSelecoes, addOrUpdateSelecao } from '../backend';
import { ATITUDES_22, getCompetenciasPermanentes, getCompetenciasContexto, EstadoProgressao, ESTADO_LABEL, ESTADO_COR, CompetenciaAtitudinal } from '../progressaoAtitudes';

// ── Fardamento ────────────────────────────────────────────────
const FARD = ['Touca','Avental','Sapatos segurança','Farda','Sem unhas postiças','Sem fones','Mãos limpas','Cabelo preso'];

function getHist(key: string): number {
  try { return parseInt(localStorage.getItem(key) || '0'); } catch { return 0; }
}
function incHist(key: string) {
  try { localStorage.setItem(key, String(getHist(key) + 1)); } catch {}
}

// ── Estilos ───────────────────────────────────────────────────
const card: React.CSSProperties = { background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:'12px 14px', marginBottom:10 };
const muted: React.CSSProperties = { color:'var(--color-text-secondary)', fontSize:11 };
const btn = (active=false, bg='#1D9E75', color='white'): React.CSSProperties => ({
  padding:'8px 10px', borderRadius:8, border:`0.5px solid ${active?bg:'var(--color-border-tertiary)'}`,
  background:active?bg:'var(--color-background-secondary)', color:active?color:'var(--color-text-secondary)',
  cursor:'pointer', fontSize:11, fontWeight:active?500:400, transition:'all 0.1s',
});
const btnPrimary = (disabled=false): React.CSSProperties => ({
  width:'100%', padding:'10px 14px', borderRadius:8, border:'none',
  background:disabled?'var(--color-background-secondary)':'#1D9E75',
  color:disabled?'var(--color-text-secondary)':'white',
  fontWeight:500, fontSize:13, marginTop:6, cursor:disabled?'not-allowed':'pointer',
});

type Nivel = 'inicial'|'em_desenvolvimento'|'consolidado'|'avancado'|null;

// ── Step bar ──────────────────────────────────────────────────
function StepBar({steps,current}:{steps:string[];current:number}) {
  return (
    <div style={{display:'grid',gridTemplateColumns:`repeat(${steps.length},1fr)`,borderRadius:10,overflow:'hidden',border:'0.5px solid var(--color-border-tertiary)',marginBottom:12}}>
      {steps.map((s,i)=>(
        <div key={i} style={{padding:'6px 2px',textAlign:'center',fontSize:9,borderRight:i<steps.length-1?'0.5px solid var(--color-border-tertiary)':'none',
          background:i<current?'#EAF3DE':i===current?'#1D9E75':'var(--color-background-secondary)',
          color:i<current?'#3B6D11':i===current?'white':'var(--color-text-secondary)',
          fontWeight:i===current?500:400}}>
          {i<current?'✓ ':''}{s}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export function AlunoView({aluno}:{aluno:Aluno}) {
  const comandas = getComandas();
  const selecoes = getSelecoes();
  const pendentes = comandas.filter(c=>c.alunosIds.includes(aluno.id) && !selecoes.some(s=>s.comandaId===c.id&&s.alunoId===aluno.id));
  const [ativa, setAtiva] = useState<Comanda|null>(null);

  if (ativa) return <Fluxo comanda={ativa} aluno={aluno} onVoltar={()=>setAtiva(null)} />;

  return (
    <div>
      <div style={card}>
        <div style={{fontSize:15,fontWeight:500}}>Olá, {aluno.nome||`Aluno ${aluno.numero}`}!</div>
        <div style={muted}>{aluno.turmaId} · {aluno.ano}º ano</div>
      </div>
      <div style={card}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:8}}>Aulas para avaliar</div>
        {pendentes.length===0 && <div style={muted}>Sem aulas pendentes.</div>}
        {pendentes.map(c=>(
          <div key={c.id} onClick={()=>setAtiva(c)} style={{padding:'10px 12px',border:'0.5px solid var(--color-border-tertiary)',borderRadius:8,marginBottom:6,cursor:'pointer'}}>
            <div style={{fontSize:13,fontWeight:500}}>{c.titulo}</div>
            <div style={muted}>{c.data} · {c.modo==='grupo'?'Grupo':'Individual'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
function Fluxo({comanda,aluno,onVoltar}:{comanda:Comanda;aluno:Aluno;onVoltar:()=>void}) {
  const STEPS = ['Entrada','Ficha','Avaliação','Pares','Fim'];
  const [passo, setPasso] = useState(0);

  // Pontualidade
  const [pontVal, setPontVal] = useState<'sim'|'atras'|null>(null);
  const [pontHora, setPontHora] = useState('');
  const [pontMins, setPontMins] = useState(0);
  const histAtrasos = getHist(`ecl_atr_${aluno.id}`);

  function registarPont(v:'sim'|'atras') {
    setPontVal(v);
    const now = new Date();
    setPontHora(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`);
    if (v==='atras') setPontMins(Math.max(1, now.getHours()*60+now.getMinutes()-9*60));
  }

  // Fardamento
  const [fard, setFard] = useState<Record<string,boolean|null>>(Object.fromEntries(FARD.map(f=>[f,null])));
  const fardOk = Object.values(fard).every(v=>v!==null);
  const entradaOk = pontVal!==null && fardOk;

  function toggleFard(item:string) {
    setFard(p=>({...p,[item]:p[item]===null?true:p[item]===true?false:null}));
  }

  // Competências
  const tipoAtividade = comanda.tipoServico||'normal';
  const contexto = tipoAtividade==='normal'||tipoAtividade==='buffet'?'equipa' as const:'individual' as const;
  const permanentes = getCompetenciasPermanentes();
  const contextuais = getCompetenciasContexto(contexto);
  const todasComps = [...permanentes, ...contextuais];

  const [niveis, setNiveis] = useState<Record<string,Nivel>>(Object.fromEntries(todasComps.map(c=>[c.id,null])));
  const [aberta, setAberta] = useState<string|null>(todasComps[0]?.id||null);
  const feitas = todasComps.filter(c=>niveis[c.id]!==null).length;
  const avaliacaoOk = feitas===todasComps.length;

  function setNivel(id:string, v:Nivel) {
    setNiveis(p=>({...p,[id]:p[id]===v?null:v}));
    const idx = todasComps.findIndex(c=>c.id===id);
    if (idx<todasComps.length-1) setTimeout(()=>setAberta(todasComps[idx+1].id),250);
    else setAberta(null);
  }

  // Pares
  const colegas = comanda.alunosIds.filter(id=>id!==aluno.id).slice(0,4);
  const [pares, setPares] = useState<Record<string,{coop:Nivel;emp:Nivel}>>(
    Object.fromEntries(colegas.map(id=>[id,{coop:null,emp:null}]))
  );
  const paresOk = colegas.length===0||colegas.every(id=>pares[id].coop&&pares[id].emp);

  function setPar(id:string, campo:'coop'|'emp', v:Nivel) {
    setPares(p=>({...p,[id]:{...p[id],[campo]:p[id][campo]===v?null:v}}));
  }

  function guardar() {
    if (pontVal==='atras') incHist(`ecl_atr_${aluno.id}`);
    FARD.forEach(item=>{ if(fard[item]===false) incHist(`ecl_frd_${aluno.id}_${item}`); });
    addOrUpdateSelecao({
      id:`${comanda.id}__${aluno.id}`,
      comandaId:comanda.id, alunoId:aluno.id, turmaId:aluno.turmaId,
      tecnicas:[], atitudes:todasComps.map(c=>c.id), responsabilidades:[],
      autoavaliacoes:todasComps.map(c=>({competenciaId:c.id, nivel:niveis[c.id]==='avancado'?'superei':niveis[c.id]==='consolidado'?'atingi':niveis[c.id]==='em_desenvolvimento'?'desenvolvimento':'nao_atingi'})),
      criadaEm:new Date().toISOString(),
    });
    setPasso(4);
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div>
      <StepBar steps={STEPS} current={passo} />

      {/* 0 — ENTRADA */}
      {passo===0 && (
        <div>
          <div style={card}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:8}}>Pontualidade</div>
            <div style={{display:'flex',gap:6,marginBottom:pontHora?8:0}}>
              <button onClick={()=>registarPont('sim')} style={{...btn(pontVal==='sim','#1D9E75','white'),flex:1,padding:'12px 6px',fontSize:11,borderRadius:10}}>
                <div style={{fontSize:18,marginBottom:2}}>✓</div>A horas
              </button>
              <button onClick={()=>registarPont('atras')} style={{...btn(pontVal==='atras','#EF9F27','white'),flex:1,padding:'12px 6px',fontSize:11,borderRadius:10}}>
                <div style={{fontSize:18,marginBottom:2}}>◷</div>Atrasado/a
              </button>
            </div>
            {pontHora && (
              <div style={{padding:'8px 10px',background:pontVal==='sim'?'#EAF3DE':'#FAEEDA',borderRadius:8}}>
                <div style={{fontSize:10,color:pontVal==='sim'?'#3B6D11':'#854F0B'}}>Registado às</div>
                <div style={{fontSize:16,fontWeight:500,color:pontVal==='sim'?'#3B6D11':'#854F0B'}}>{pontHora}{pontVal==='atras'&&` · ${pontMins} min atraso`}</div>
              </div>
            )}
            {pontVal==='atras' && histAtrasos+1>=3 && (
              <div style={{marginTop:8,padding:'8px 10px',background:histAtrasos+1>=4?'#FCEBEB':'#FAEEDA',borderRadius:8,border:`0.5px solid ${histAtrasos+1>=4?'#F7C1C1':'#FAC775'}`}}>
                <div style={{fontSize:11,fontWeight:500,color:histAtrasos+1>=4?'#A32D2D':'#854F0B'}}>{histAtrasos+1}ª vez atrasado/a</div>
                <div style={{fontSize:10,color:histAtrasos+1>=4?'#791F1F':'#633806',marginTop:2}}>{histAtrasos+1>=4?'O professor foi alertado.':'O professor está a ser informado.'}</div>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:6}}>Fardamento e higiene</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
              {FARD.map(item=>{
                const v=fard[item];
                const hist=getHist(`ecl_frd_${aluno.id}_${item}`);
                return (
                  <div key={item} onClick={()=>toggleFard(item)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 9px',borderRadius:8,cursor:'pointer',fontSize:11,border:'0.5px solid var(--color-border-tertiary)',
                    background:v===true?'#EAF3DE':v===false?'#FCEBEB':'var(--color-background-secondary)',
                    color:v===true?'#27500A':v===false?'#791F1F':'var(--color-text-secondary)'}}>
                    <div style={{width:9,height:9,borderRadius:'50%',flexShrink:0,background:v===true?'#639922':v===false?'#E24B4A':'var(--color-border-secondary)'}}/>
                    <span style={{flex:1}}>{item}</span>
                    {v===false && hist+1>=3 && <span style={{fontSize:9,background:'#FCEBEB',color:'#A32D2D',borderRadius:10,padding:'1px 4px'}}>{hist+1}x</span>}
                  </div>
                );
              })}
            </div>
            {FARD.filter(item=>fard[item]===false&&getHist(`ecl_frd_${aluno.id}_${item}`)+1>=3).map(item=>(
              <div key={item} style={{marginTop:5,padding:'6px 9px',background:'#FAEEDA',borderRadius:8,fontSize:10,color:'#854F0B'}}>
                {getHist(`ecl_frd_${aluno.id}_${item}`)+1}ª vez sem {item.toLowerCase()} — professor informado.
              </div>
            ))}
          </div>
          <button style={btnPrimary(!entradaOk)} disabled={!entradaOk} onClick={()=>setPasso(1)}>Continuar →</button>
        </div>
      )}

      {/* 1 — FICHA */}
      {passo===1 && (
        <div>
          <div style={{...card,background:'#085041',color:'white'}}>
            <div style={{fontSize:14,fontWeight:500}}>{comanda.titulo}</div>
            <div style={{fontSize:11,opacity:0.85,marginTop:2}}>{comanda.data}</div>
          </div>
          <div style={card}>
            <div style={{fontSize:12,fontWeight:500,marginBottom:6,color:'#085041'}}>Lê a ficha técnica antes de começar</div>
            <div style={{padding:'8px 10px',background:'#FAEEDA',borderRadius:8,border:'0.5px solid #FAC775',fontSize:11,color:'#633806'}}>
              Verifica temperaturas, frescura e pontos críticos de controlo.
            </div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button style={{...btnPrimary(),flex:0,padding:'10px 12px',background:'var(--color-background-secondary)',color:'var(--color-text-secondary)',border:'0.5px solid var(--color-border-tertiary)'}} onClick={()=>setPasso(0)}>←</button>
            <button style={{...btnPrimary(),flex:1,marginTop:0}} onClick={()=>setPasso(2)}>Li a ficha →</button>
          </div>
        </div>
      )}

      {/* 2 — AVALIAÇÃO */}
      {passo===2 && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={muted}>Avalia todas as competências</span>
            <span style={{fontSize:12,fontWeight:500,color:'#1D9E75'}}>{feitas}/{todasComps.length}</span>
          </div>

          {/* Permanentes */}
          <div style={{...muted,fontSize:10,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5}}>Permanentes</div>
          {permanentes.map(c=>(<CompCard key={c.id} comp={c} nivel={niveis[c.id]} aberta={aberta===c.id} onToggle={()=>setAberta(aberta===c.id?null:c.id)} onNivel={v=>setNivel(c.id,v)}/>))}

          {/* Contexto */}
          <div style={{...muted,fontSize:10,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.05em',margin:'8px 0 5px'}}>{contexto==='equipa'?'Trabalho em equipa':'Trabalho individual'}</div>
          {contextuais.map(c=>(<CompCard key={c.id} comp={c} nivel={niveis[c.id]} aberta={aberta===c.id} onToggle={()=>setAberta(aberta===c.id?null:c.id)} onNivel={v=>setNivel(c.id,v)}/>))}

          <div style={{display:'flex',gap:6,marginTop:4}}>
            <button style={{...btnPrimary(),flex:0,padding:'10px 12px',background:'var(--color-background-secondary)',color:'var(--color-text-secondary)',border:'0.5px solid var(--color-border-tertiary)'}} onClick={()=>setPasso(1)}>←</button>
            <button style={{...btnPrimary(!avaliacaoOk),flex:1,marginTop:0}} disabled={!avaliacaoOk} onClick={()=>setPasso(3)}>Continuar →</button>
          </div>
        </div>
      )}

      {/* 3 — PARES */}
      {passo===3 && (
        <div>
          <div style={{...card,marginBottom:8}}>
            <div style={{fontSize:12,fontWeight:500,marginBottom:2}}>Avaliação dos colegas</div>
            <div style={muted}>Confidencial — o colega não vê o que escreveste.</div>
          </div>
          {colegas.length===0 && <div style={card}><div style={muted}>Aula individual — sem colegas para avaliar.</div></div>}
          {colegas.map(id=>(
            <div key={id} style={card}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'#9FE1CB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:500,color:'#085041'}}>{id.slice(-2)}</div>
                <span style={{fontSize:13,fontWeight:500}}>{id}</span>
                {pares[id].coop&&pares[id].emp&&<span style={{marginLeft:'auto',fontSize:10,background:'#EAF3DE',color:'#3B6D11',padding:'2px 8px',borderRadius:20}}>completo</span>}
              </div>
              {(['coop','emp'] as const).map(campo=>(
                <div key={campo} style={{marginBottom:campo==='coop'?10:0}}>
                  <div style={{fontSize:11,fontWeight:500,marginBottom:2}}>{campo==='coop'?'Cooperação':'Empenho e persistência'}</div>
                  <div style={{fontSize:10,color:'var(--color-text-secondary)',fontStyle:'italic',marginBottom:5}}>{campo==='coop'?'"Ajudou quando foi preciso?"':'"Trabalhou de verdade?"'}</div>
                  <NivelBtns valor={pares[id][campo]} onChange={v=>setPar(id,campo,v)} />
                </div>
              ))}
            </div>
          ))}
          <div style={{display:'flex',gap:6}}>
            <button style={{...btnPrimary(),flex:0,padding:'10px 12px',background:'var(--color-background-secondary)',color:'var(--color-text-secondary)',border:'0.5px solid var(--color-border-tertiary)'}} onClick={()=>setPasso(2)}>←</button>
            <button style={{...btnPrimary(!paresOk),flex:1,marginTop:0}} disabled={!paresOk} onClick={guardar}>Submeter →</button>
          </div>
        </div>
      )}

      {/* 4 — FIM */}
      {passo===4 && (
        <div>
          <div style={{...card,textAlign:'center',padding:'20px 14px'}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:'#EAF3DE',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',fontSize:20,color:'#3B6D11'}}>✓</div>
            <div style={{fontSize:15,fontWeight:500,marginBottom:4}}>Avaliação completa!</div>
            <div style={muted}>O professor irá validar.</div>
          </div>
          <div style={card}>
            {[
              ['Pontualidade', pontVal==='sim'?'A horas':`Atrasado/a ${pontMins} min`, pontVal==='sim'?'#639922':'#854F0B'],
              ['Fardamento', Object.values(fard).every(v=>v===true)?'Completo':'Incompleto', Object.values(fard).every(v=>v===true)?'#639922':'#854F0B'],
              ['Competências', `${feitas}/${todasComps.length}`, '#1D9E75'],
            ].map(([l,v,c])=>(
              <div key={l as string} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'4px 0',borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
                <span style={muted}>{l as string}</span>
                <span style={{fontWeight:500,color:c as string}}>{v as string}</span>
              </div>
            ))}
          </div>
          <button style={btnPrimary()} onClick={onVoltar}>Voltar ao início</button>
        </div>
      )}
    </div>
  );
}

// ── Componente de competência ─────────────────────────────────
function CompCard({comp,nivel,aberta,onToggle,onNivel}:{comp:CompetenciaAtitudinal;nivel:Nivel;aberta:boolean;onToggle:()=>void;onNivel:(v:Nivel)=>void}) {
  const estados: EstadoProgressao[] = ['inicial','em_desenvolvimento','consolidado','avancado'];
  return (
    <div style={{border:'0.5px solid var(--color-border-tertiary)',borderRadius:10,marginBottom:6,overflow:'hidden'}}>
      <div onClick={onToggle} style={{padding:'9px 12px',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:500}}>{comp.nome}</div>
          {nivel && <div style={{fontSize:10,marginTop:1,...ESTADO_COR[nivel],borderRadius:20,padding:'1px 7px',display:'inline-block'}}>{ESTADO_LABEL[nivel]}</div>}
        </div>
        <div style={{width:9,height:9,borderRadius:'50%',flexShrink:0,
          background:nivel?ESTADO_COR[nivel].color:'var(--color-border-secondary)',
          border:nivel?'none':'0.5px solid var(--color-border-secondary)'}}/>
      </div>
      {aberta && (
        <div style={{padding:'9px 12px',background:'var(--color-background-secondary)',borderTop:'0.5px solid var(--color-border-tertiary)'}}>
          <div style={{fontSize:10,color:'var(--color-text-secondary)',marginBottom:7}}>{comp.definicao}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:8}}>
            <div style={{background:'#EAF3DE',borderRadius:6,padding:'5px 7px'}}>
              <div style={{fontSize:9,fontWeight:500,color:'#3B6D11',marginBottom:2}}>✓ Observo quando</div>
              {comp.observar.slice(0,2).map(s=><div key={s} style={{fontSize:9,color:'#27500A',lineHeight:1.4}}>· {s}</div>)}
            </div>
            <div style={{background:'#FCEBEB',borderRadius:6,padding:'5px 7px'}}>
              <div style={{fontSize:9,fontWeight:500,color:'#A32D2D',marginBottom:2}}>✗ Sinal de alerta</div>
              {comp.naoObservar.slice(0,2).map(s=><div key={s} style={{fontSize:9,color:'#791F1F',lineHeight:1.4}}>· {s}</div>)}
            </div>
          </div>
          <div style={{fontSize:10,fontWeight:500,marginBottom:5}}>Como me avalio hoje?</div>
          <NivelBtns valor={nivel} onChange={onNivel} mostrarDescritores comp={comp} />
        </div>
      )}
    </div>
  );
}

// ── Botões de nível ───────────────────────────────────────────
function NivelBtns({valor,onChange,mostrarDescritores=false,comp}:{valor:Nivel;onChange:(v:Nivel)=>void;mostrarDescritores?:boolean;comp?:CompetenciaAtitudinal}) {
  const estados: {v:EstadoProgressao;label:string;bg:string;border:string;color:string}[] = [
    {v:'inicial',label:'Inicial',bg:'#F1EFE8',border:'#B4B2A9',color:'#5F5E5A'},
    {v:'em_desenvolvimento',label:'Em dev.',bg:'#FAEEDA',border:'#FAC775',color:'#854F0B'},
    {v:'consolidado',label:'Consolidado',bg:'#E6F1FB',border:'#B5D4F4',color:'#185FA5'},
    {v:'avancado',label:'Avançado',bg:'#EAF3DE',border:'#C0DD97',color:'#3B6D11'},
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:3}}>
      {estados.map(e=>(
        <button key={e.v} onClick={()=>onChange(valor===e.v?null:e.v)} style={{
          padding:'5px 3px', borderRadius:6, fontSize:9, cursor:'pointer', textAlign:'center', lineHeight:1.3,
          border:`0.5px solid ${valor===e.v?e.border:'var(--color-border-tertiary)'}`,
          background:valor===e.v?e.bg:'var(--color-background-primary)',
          color:valor===e.v?e.color:'var(--color-text-secondary)',
          fontWeight:valor===e.v?500:400,
        }}>
          {e.label}
          {mostrarDescritores && comp && <div style={{fontSize:8,lineHeight:1.2,marginTop:2,opacity:0.85}}>{comp.descritores[e.v].substring(0,30)}…</div>}
        </button>
      ))}
    </div>
  );
}

