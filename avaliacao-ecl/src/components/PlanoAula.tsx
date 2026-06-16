import React, { useState } from 'react';
import {
  getPlanosAulaPorTurma,
  addOrUpdatePlanoAula,
  getFichasProducao,
  getAlunos,
  addOrUpdateDistribuicaoFicha,
} from '../backend';
import { PlanoAula as TPlanoAula, DistribuicaoFicha } from '../types';

const TIPOS_ATIVIDADE = [
  'Aula prática','Almoço pedagógico','Jantar pedagógico','Brunch',
  'Pequeno-almoço','Coffee break','Serviço real à carta','Catering',
  'Buffet','Evento externo','Outro',
];
const COMP_PERM = [
  'Responsabilidade','Organização','Higiene e segurança alimentar',
  'Disponibilidade para aprender','Respeito pelas regras','SST',
];
const COMP_OPC = [
  'Autonomia','Iniciativa','Autocontrolo','Assertividade','Empatia',
  'Escuta ativa','Cooperação','Empenho e persistência',
  'Flexibilidade','Sustentabilidade','Respeito pelo bem-estar',
  'Autoconfiança','Postura profissional','Sentido crítico',
  'Respeito pelas diferenças','Apresentação pessoal',
];

// Lista de UCs da componente tecnológica — cozinha
const UCS_COZINHA = [
  { id:'UC03576', nome:'Planear e organizar a producao de cozinha' },
  { id:'UC01999', nome:'Preparar e executar confecoes de cozinha' },
  { id:'UC03577', nome:'Preparar e confecionar molhos e fundos' },
  { id:'UC02002', nome:'Preparar e confecionar sopas, acepipes, ovos e massas' },
  { id:'UC02003', nome:'Preparar e confecionar peixes, mariscos e guarnições' },
  { id:'UC02004', nome:'Preparar e confecionar carnes, aves, caca e guarnições' },
  { id:'UC02005', nome:'Preparar e confecionar massas base, recheios, cremes e molhos de pastelaria' },
  { id:'UC03579', nome:'Gerir aprovisionamentos e controlar custos' },
  { id:'UC03584', nome:'Implementar regras de higiene e seguranca alimentar' },
  { id:'UC03585', nome:'Conservar materias-primas alimentares' },
  { id:'UC03586', nome:'Confecionar cozinha e docaria tradicional portuguesa' },
  { id:'UC03587', nome:'Preparar e confecionar pastelaria de sobremesa' },
  { id:'UC03588', nome:'Preparar e confecionar gastronomia do Mundo' },
  { id:'UC03589', nome:'Implementar novas tendencias na cozinha' },
  { id:'UC03590', nome:'Confecionar produtos sustentaveis' },
  { id:'UC03591', nome:'Planear e executar servicos especiais de cozinha' },
  { id:'UC03592', nome:'Planear e confecionar pastelaria internacional' },
  { id:'UC03593', nome:'Planear e confecionar massas basicas de panificacao' },
  { id:'UC03594', nome:'Planear e confecionar Cake Design' },
  { id:'UC03595', nome:'Planear e confecionar cozinha alternativa' },
  { id:'UC03596', nome:'Planear e confecionar cozinha criativa' },
  { id:'UC03597', nome:'Planear e confecionar massas especiais de panificacao' },
];


function Acc({ num, icon, title, desc, status, open, locked, onToggle, children }: {
  num: number; icon: string; title: string; desc: string;
  status: 'done'|'active'|'pending';
  open: boolean; locked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const statusStyles = {
    done:    { bg:'rgba(107,124,94,0.15)',  color:'var(--sage)' },
    active:  { bg:'rgba(181,101,29,0.12)', color:'var(--copper)' },
    pending: { bg:'rgba(31,27,22,0.06)',   color:'rgba(31,27,22,0.4)' },
  }[status];

  return (
    <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:10 }}>
      <div
        onClick={() => !locked && onToggle()}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:locked?'default':'pointer' }}
      >
        <div style={{
          width:36, height:36, borderRadius:10, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
          background: status==='done'?'rgba(107,124,94,0.15)' : status==='active'?'var(--copper)' : 'rgba(31,27,22,0.06)',
        }}>
          {status==='done' ? '✓' : icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:14 }}>{title}</div>
          <div className="muted" style={{ fontSize:12, marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{desc}</div>
        </div>
        <span className="badge" style={{ ...statusStyles, fontSize:11 }}>
          {status==='done'?'Feito' : status==='active'?'Em curso' : 'Pendente'}
        </span>
      </div>
      {open && (
        <div style={{ borderTop:'1px solid var(--border)', padding:'14px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function PlanoAula({ turmaId }: { turmaId: string }) {
  const [vista, setVista] = useState<'lista'|'criar'|'detalhe'>('lista');
  const [planoAtivo, setPlanoAtivo] = useState<TPlanoAula|null>(null);
  const planos = getPlanosAulaPorTurma(turmaId);

  if (vista==='criar') return <CriarPlano turmaId={turmaId} onConcluido={p=>{setPlanoAtivo(p);setVista('detalhe');}} onVoltar={()=>setVista('lista')} />;
  if (vista==='detalhe' && planoAtivo) return <DetalhePlano plano={planoAtivo} turmaId={turmaId} onVoltar={()=>setVista('lista')} onEditar={()=>setVista('lista')} />;

  return (
    <div>
      <div className="header-bar">
        <h2 className="display" style={{ margin:0 }}>Planos de Aula</h2>
        <button className="btn btn-primary" onClick={()=>setVista('criar')}>+ Novo plano</button>
      </div>

      {planos.length===0 && (
        <div className="card" style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
          <div className="display" style={{ fontSize:18, marginBottom:6 }}>Ainda não há planos</div>
          <p className="muted">Cria o primeiro plano de aula para começar.</p>
        </div>
      )}

      {planos.map(p=>{
        const d = new Date(p.data+'T12:00:00');
        return (
          <div key={p.id} className="option-card" onClick={()=>{setPlanoAtivo(p);setVista('detalhe');}}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ background:'rgba(181,101,29,0.1)', borderRadius:10, padding:'8px 10px', textAlign:'center', flexShrink:0, minWidth:48 }}>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:22, fontWeight:700, color:'var(--copper)', lineHeight:1 }}>
                  {d.getDate().toString().padStart(2,'0')}
                </div>
                <div style={{ fontSize:10, fontWeight:600, color:'var(--copper)', opacity:0.8, textTransform:'uppercase' }}>
                  {d.toLocaleDateString('pt-PT',{month:'short'})}
                </div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{p.titulo}</div>
                <div className="muted" style={{ marginTop:2, fontSize:12 }}>{p.horaInicio}–{p.horaFim} · {p.fichasIds.length} ficha{p.fichasIds.length!==1?'s':''} · {p.turmaId}</div>
              </div>
              <span className="stamp copper">{p.estado==='publicado'?'Publicado':'Rascunho'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CRIAR PLANO
// ═══════════════════════════════════════════════════════════════
function CriarPlano({ turmaId, onConcluido, onVoltar }: { turmaId:string; onConcluido:(p:TPlanoAula)=>void; onVoltar:()=>void }) {
  const [secAberta, setSecAberta] = useState(0);
  const [feitas, setFeitas] = useState<number[]>([]);
  const [dados, setDados] = useState({ titulo:'', data:new Date().toISOString().split('T')[0], horaInicio:'08:30', horaFim:'17:30', tipoAtividade:'Aula prática', tipoOutro:'', professor:'', ucId:'', ucNome:'' });
  const [fichasSel, setFichasSel] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<Record<string,Record<string,'A'|'B'|null>>>({});
  const [compOpc, setCompOpc] = useState<string[]>([]);
  const [plano, setPlano] = useState<TPlanoAula|null>(null);
  const [publicado, setPublicado] = useState(false);

  const todasFichas = getFichasProducao();
  const alunos = getAlunos().filter(a=>a.turmaId===turmaId);

  function setD(k:string,v:string) { setDados(p=>({...p,[k]:v})); }
  function concluir(i:number) { setFeitas(p=>[...new Set([...p,i])]); setSecAberta(i+1); }
  const feita = (i:number) => feitas.includes(i);
  const status = (i:number): 'done'|'active'|'pending' => feita(i)?'done':secAberta===i?'active':'pending';

  function guardarDados() {
    const now = new Date().toISOString();
    const ucSel = UCS_COZINHA.find(u => u.id === dados.ucId);
    const p: TPlanoAula = {
      id:`plano_${Date.now()}`, turmaId, professor:dados.professor,
      data:dados.data, horaInicio:dados.horaInicio, horaFim:dados.horaFim,
      titulo:dados.titulo||`${dados.tipoAtividade} — ${dados.data}`,
      observacoes:'', fichasIds:[], estado:'rascunho', criadoEm:now, atualizadoEm:now,
      ucId: dados.ucId, ucNome: ucSel?.nome || '',
    } as TPlanoAula;
    addOrUpdatePlanoAula(p); setPlano(p); concluir(0);
  }

  function guardarFichas() {
    if(!plano) return;
    const up={...plano,fichasIds:fichasSel,estado:'fichas_pendentes' as const,atualizadoEm:new Date().toISOString()};
    addOrUpdatePlanoAula(up); setPlano(up);
    const g:Record<string,Record<string,'A'|'B'|null>>={};
    fichasSel.forEach(fid=>{g[fid]={};alunos.forEach(a=>{g[fid][a.id]=null;});});
    setGrupos(g); concluir(1);
  }

  function guardarGrupos() {
    if(!plano) return;
    fichasSel.forEach(fid=>{
      const gs=grupos[fid]||{};
      const aA=alunos.filter(a=>gs[a.id]==='A').map(a=>a.id);
      const aB=alunos.filter(a=>gs[a.id]==='B').map(a=>a.id);
      const aTodos=alunos.filter(a=>!gs[a.id]).map(a=>a.id);
      const dist: DistribuicaoFicha = {
        id:`dist_${plano.id}_${fid}`,planoAulaId:plano.id,fichaId:fid,
        modo:aTodos.length===alunos.length?'todos':'grupo',tipoServico:'normal',
        alunosIds:[...aA,...aB,...aTodos],
        grupos:[
          ...(aA.length?[{id:`grA_${fid}`,fichaId:fid,planoAulaId:plano.id,nome:'Grupo A',alunosIds:aA}]:[]),
          ...(aB.length?[{id:`grB_${fid}`,fichaId:fid,planoAulaId:plano.id,nome:'Grupo B',alunosIds:aB}]:[]),
        ],
        tecnicasSelecionadas:[],atitudesSelecionadas:[],atitudesProfessor:[],publicada:false,
      };
      addOrUpdateDistribuicaoFicha(dist);
    });
    concluir(2);
  }

  function publicar() {
    if(!plano) return;
    const up={...plano,estado:'publicado' as const,atualizadoEm:new Date().toISOString()};
    addOrUpdatePlanoAula(up); setPlano(up); setPublicado(true); onConcluido(up);
  }

  const fichasSelecionadas = todasFichas.filter(f=>fichasSel.includes(f.id));
  const resumoFichas = fichasSel.length ? `${fichasSel.length} ficha${fichasSel.length>1?'s':''} selecionada${fichasSel.length>1?'s':''}` : 'Nenhuma ficha';

  return (
    <div>
      {/* CABEÇALHO VERDE ESCURO */}
      <div style={{ background:'#1f1b16', borderRadius:14, padding:'18px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={onVoltar} className="btn btn-ghost" style={{ fontSize:12, padding:'6px 12px', color:'rgba(247,241,230,0.7)', borderColor:'rgba(247,241,230,0.2)', background:'rgba(247,241,230,0.08)' }}>← Voltar</button>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:17, fontWeight:600, color:'var(--cream)' }}>{dados.titulo||'Novo Plano de Aula'}</div>
            <div style={{ fontSize:11, color:'rgba(247,241,230,0.55)', marginTop:2 }}>ECL · {turmaId}</div>
          </div>
        </div>
        {/* Barra de progresso */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
          {['Dados','Fichas','Grupos','Competências','Publicar'].map((s,i)=>(
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ width:28,height:28,borderRadius:'50%',margin:'0 auto 3px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,
                background:feita(i)?'var(--sage)':secAberta===i?'var(--copper)':'rgba(247,241,230,0.12)',
                color:feita(i)||secAberta===i?'white':'rgba(247,241,230,0.4)',
              }}>{feita(i)?'✓':(i+1)}</div>
              <div style={{ fontSize:9, color:feita(i)?'var(--sage-light)':secAberta===i?'var(--copper-light)':'rgba(247,241,230,0.35)' }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECÇÃO 0 — DADOS */}
      <Acc num={0} icon="📅" title="Dados da aula" desc={feita(0)?`${dados.tipoAtividade} · ${dados.horaInicio}–${dados.horaFim}${dados.professor?' · '+dados.professor:''}` : 'Data, hora e tipo de atividade'} status={status(0)} open={secAberta===0} locked={false} onToggle={()=>setSecAberta(0)}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div className="field"><label className="field-label">Data</label><input type="date" className="input" value={dados.data} onChange={e=>setD('data',e.target.value)}/></div>
          <div className="field"><label className="field-label">Professor</label><input className="input" value={dados.professor} onChange={e=>setD('professor',e.target.value)} placeholder="Nome"/></div>
          <div className="field"><label className="field-label">Hora início</label><input type="time" className="input" value={dados.horaInicio} onChange={e=>setD('horaInicio',e.target.value)}/></div>
          <div className="field"><label className="field-label">Hora fim</label><input type="time" className="input" value={dados.horaFim} onChange={e=>setD('horaFim',e.target.value)}/></div>
        </div>
        <div className="field">
          <label className="field-label">Tipo de atividade</label>
          <select className="input" value={dados.tipoAtividade} onChange={e=>setD('tipoAtividade',e.target.value)}>
            {TIPOS_ATIVIDADE.map(t=><option key={t}>{t}</option>)}
          </select>
          {dados.tipoAtividade==='Outro'&&<input className="input" style={{marginTop:6}} value={dados.tipoOutro} onChange={e=>setD('tipoOutro',e.target.value)} placeholder="Descreve a atividade..."/>}
        </div>
        <div className="field" style={{gridColumn:'1/-1'}}>
          <label className="field-label">UC desta aula <span style={{color:'var(--danger)'}}>*</span></label>
          <select className="input" value={dados.ucId} onChange={e=>setD('ucId',e.target.value)}
            style={{border:!dados.ucId?'1.5px solid var(--danger)':undefined}}>
            <option value="">— Seleciona a Unidade de Competência —</option>
            {UCS_COZINHA.map(u=><option key={u.id} value={u.id}>{u.id} · {u.nome}</option>)}
          </select>
          {!dados.ucId&&<div style={{fontSize:11,color:'var(--danger)',marginTop:4}}>Campo obrigatório — define as competências a avaliar nesta aula</div>}
        </div>
        <div className="field" style={{gridColumn:'1/-1'}}><label className="field-label">Título (opcional)</label><input className="input" value={dados.titulo} onChange={e=>setD('titulo',e.target.value)} placeholder={`ex: Cozinha Asiática — ${turmaId}`}/></div>
        <button className="btn btn-primary btn-block" style={{gridColumn:'1/-1'}} disabled={!dados.data||!dados.ucId} onClick={guardarDados}>Guardar e continuar →</button>
      </Acc>

      {/* SECÇÃO 1 — FICHAS */}
      <Acc num={1} icon="📄" title="Fichas de produção" desc={feita(1)?resumoFichas:'Seleciona as receitas para esta aula'} status={status(1)} open={secAberta===1} locked={!feita(0)&&secAberta!==1} onToggle={()=>feita(0)&&setSecAberta(1)}>
        {todasFichas.length===0?(
          <div style={{textAlign:'center',padding:'14px 0'}}>
            <p className="muted" style={{marginBottom:10}}>Ainda não há fichas criadas.</p>
            <div style={{padding:'10px 14px',background:'rgba(107,124,94,0.1)',borderRadius:10,fontSize:13,color:'var(--sage)'}}>
              Vai ao tab <strong>Ficha de Produção</strong> para criar fichas.
            </div>
          </div>
        ) : todasFichas.map(f=>(
          <div key={f.id} className="option-card" style={{marginBottom:6}} onClick={()=>setFichasSel(p=>p.includes(f.id)?p.filter(x=>x!==f.id):[...p,f.id])}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:20,height:20,borderRadius:5,border:`1.5px solid ${fichasSel.includes(f.id)?'var(--copper)':'var(--border)'}`,background:fichasSel.includes(f.id)?'var(--copper)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'white',fontSize:12}}>
                {fichasSel.includes(f.id)&&'✓'}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14}}>{f.nomePrato}</div>
                <div className="muted">{f.classificacao} · {f.numPorcoes} porções</div>
              </div>
            </div>
          </div>
        ))}
        <button className="btn btn-primary btn-block" disabled={fichasSel.length===0} onClick={guardarFichas} style={{marginTop:8}}>Continuar para grupos →</button>
      </Acc>

      {/* SECÇÃO 2 — GRUPOS */}
      <Acc num={2} icon="👥" title="Distribuição de grupos" desc={feita(2)?`${alunos.length} alunos distribuídos`:'Atribui alunos às fichas'} status={status(2)} open={secAberta===2} locked={!feita(1)} onToggle={()=>feita(1)&&setSecAberta(2)}>
        {fichasSelecionadas.map(f=>(
          <div key={f.id} style={{marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:13,color:'var(--copper)',marginBottom:8,padding:'6px 10px',background:'rgba(181,101,29,0.08)',borderRadius:8}}>{f.nomePrato}</div>
            {alunos.length===0&&<p className="muted">Sem alunos registados nesta turma.</p>}
            {alunos.map(a=>{
              const g=grupos[f.id]?.[a.id]||null;
              return(
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(107,124,94,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:'var(--sage)',flexShrink:0}}>{a.numero}</div>
                  <span style={{flex:1,fontSize:13}}>{a.nome||`Aluno ${a.numero}`}</span>
                  <div style={{display:'flex',gap:4}}>
                    {(['A','B'] as const).map(gr=>(
                      <button key={gr} onClick={()=>setGrupos(p=>({...p,[f.id]:{...p[f.id],[a.id]:g===gr?null:gr}}))} className="btn btn-ghost" style={{padding:'4px 10px',fontSize:11,fontWeight:600,background:g===gr?'var(--charcoal)':'transparent',color:g===gr?'var(--cream)':'var(--charcoal)',borderColor:g===gr?'var(--charcoal)':'var(--border)'}}>
                        {gr}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <button className="btn btn-primary btn-block" onClick={guardarGrupos} style={{marginTop:8}}>Continuar para competências →</button>
      </Acc>

      {/* SECÇÃO 3 — COMPETÊNCIAS */}
      <Acc num={3} icon="⭐" title="Competências" desc={feita(3)?`${COMP_PERM.length} permanentes + ${compOpc.length} opcionais`:'Define o que vai ser avaliado'} status={status(3)} open={secAberta===3} locked={!feita(2)} onToggle={()=>feita(2)&&setSecAberta(3)}>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:'var(--copper)',marginBottom:6}}>Permanentes — sempre avaliadas</div>
          {COMP_PERM.map(c=>(
            <div key={c} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:'rgba(181,101,29,0.06)',border:'1px solid rgba(181,101,29,0.15)',marginBottom:4}}>
              <span style={{fontSize:12,color:'var(--copper)'}}>🔒</span>
              <span style={{fontSize:13}}>{c}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--sage)',marginBottom:6}}>Opcionais do professor — máx. 2</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
            {COMP_OPC.map(c=>{
              const sel=compOpc.includes(c);
              return(
                <div key={c} onClick={()=>setCompOpc(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c].slice(0,2))} className={`option-card${sel?' selected':''}`} style={{padding:'7px 10px',marginBottom:0,display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:11,color:sel?'var(--copper)':'rgba(31,27,22,0.3)',flexShrink:0}}>{sel?'✓':'+'}</span>
                  <span style={{fontSize:12,lineHeight:1.3}}>{c}</span>
                </div>
              );
            })}
          </div>
          {compOpc.length>=2&&<p className="muted" style={{marginTop:6,fontSize:12}}>Máximo de 2 competências opcionais atingido.</p>}
        </div>
        <button className="btn btn-primary btn-block" onClick={()=>concluir(3)} style={{marginTop:10}}>Continuar para publicar →</button>
      </Acc>

      {/* SECÇÃO 4 — PUBLICAR */}
      <Acc num={4} icon="🚀" title="Publicar plano" desc="Tornar visível para os alunos" status={publicado?'done':status(4)} open={secAberta===4} locked={!feita(3)} onToggle={()=>feita(3)&&setSecAberta(4)}>
        <div style={{textAlign:'center',padding:'14px 0'}}>
          <div style={{fontSize:40,marginBottom:10}}>📋</div>
          <div className="display" style={{fontSize:18,marginBottom:4}}>{dados.titulo||`Plano ${dados.data}`}</div>
          <p className="muted">{dados.data} · {dados.horaInicio}–{dados.horaFim}</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,margin:'16px 0'}}>
            {[['Fichas',fichasSel.length],['Alunos',alunos.length],['Competências',COMP_PERM.length+compOpc.length]].map(([l,v])=>(
              <div key={String(l)} style={{background:'rgba(181,101,29,0.06)',border:'1px solid rgba(181,101,29,0.15)',borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
                <div style={{fontFamily:'Fraunces, serif',fontSize:24,fontWeight:700,color:'var(--copper)'}}>{v}</div>
                <div className="muted" style={{fontSize:12}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {!publicado
          ? <button className="btn btn-primary btn-block" onClick={publicar} style={{background:'var(--charcoal)'}}>🚀 Publicar plano de aula</button>
          : <div style={{textAlign:'center',padding:'12px',background:'rgba(107,124,94,0.12)',borderRadius:10,color:'var(--sage)',fontWeight:600}}>✓ Publicado — os alunos já podem aceder</div>
        }
      </Acc>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DETALHE DO PLANO
// ═══════════════════════════════════════════════════════════════
function DetalhePlano({ plano, turmaId, onVoltar, onEditar }: { plano:TPlanoAula; turmaId:string; onVoltar:()=>void; onEditar:()=>void }) {
  const fichas = getFichasProducao().filter(f=>plano.fichasIds.includes(f.id));
  const todasFichas = getFichasProducao();
  const fichasDisponiveis = todasFichas.filter(f=>!plano.fichasIds.includes(f.id));
  const alunos = getAlunos().filter(a=>a.turmaId===turmaId);
  const [grelhaAberta, setGrelhaAberta] = useState(false);
  const [mostrarAdicionarFicha, setMostrarAdicionarFicha] = useState(false);

  // Estado do plano
  const temFichas = fichas.length > 0;
  const temRequisicao = !!plano.requisicaoId;
  const publicado = plano.estado === 'publicado';

  // Adicionar ficha ao plano
  function adicionarFicha(fichaId: string) {
    const fichasIds = [...plano.fichasIds, fichaId];
    addOrUpdatePlanoAula({...plano, fichasIds, atualizadoEm: new Date().toISOString()});
    setMostrarAdicionarFicha(false);
  }

  // Grelha de avaliação
  type Nota='S'|'A'|'R'|null;
  const comps = COMP_PERM.map(n=>({id:n,abrev:n.split(' ').slice(0,2).join(' ')}));
  const [notas,setNotas]=useState<Record<string,Record<string,Nota>>>(()=>
    Object.fromEntries(alunos.map(a=>[a.id,Object.fromEntries(comps.map(c=>[c.id,null]))]))
  );
  const COR={
    S:{bg:'rgba(107,124,94,0.15)',color:'var(--sage)',border:'var(--sage)'},
    A:{bg:'rgba(31,27,22,0.06)',color:'var(--charcoal)',border:'var(--charcoal)'},
    R:{bg:'rgba(179,65,58,0.1)',color:'var(--danger)',border:'var(--danger)'}
  };

  return (
    <div>
      {/* Cabecalho */}
      <div style={{background:'var(--charcoal)',borderRadius:14,padding:'18px',marginBottom:12}}>
        <button onClick={onVoltar} className="btn" style={{fontSize:11,padding:'5px 10px',background:'rgba(247,241,230,0.1)',color:'rgba(247,241,230,0.7)',border:'1px solid rgba(247,241,230,0.15)',marginBottom:10}}>← Planos</button>
        <div className="display" style={{fontSize:18,color:'var(--cream)'}}>{plano.titulo}</div>
        <div style={{fontSize:12,color:'rgba(247,241,230,0.5)',marginTop:2}}>{plano.data} · {plano.horaInicio}–{plano.horaFim} · {plano.turmaId}</div>
        {plano.ucId && (
          <div style={{marginTop:8,padding:'6px 10px',background:'rgba(181,101,29,0.25)',borderRadius:8,display:'inline-block'}}>
            <span style={{fontSize:10,color:'rgba(247,241,230,0.6)',textTransform:'uppercase',letterSpacing:'0.05em'}}>UC · </span>
            <span style={{fontSize:12,color:'var(--cream)',fontWeight:600}}>{plano.ucId} — {plano.ucNome}</span>
          </div>
        )}
        <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
          <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:publicado?'rgba(107,124,94,0.3)':'rgba(181,101,29,0.3)',color:'var(--cream)'}}>{publicado?'Publicado':'Rascunho'}</span>
          {plano.professor&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(247,241,230,0.1)',color:'rgba(247,241,230,0.7)'}}>Prof. {plano.professor}</span>}
        </div>
      </div>

      {/* Estado do plano — checklist rápida */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--charcoal)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.04em'}}>Estado do plano</div>
        {[
          [temFichas, `${fichas.length} ficha${fichas.length!==1?'s':''} de producao associada${fichas.length!==1?'s':''}`, 'Sem fichas de producao — adiciona abaixo'],
          [temRequisicao, 'Requisicao criada', 'Requisicao pendente — cria no tab Requisicao'],
          [publicado, 'Aula publicada — alunos podem aceder', 'Nao publicado — publica no final do acordeao'],
        ].map(([ok, sim, nao], i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:16,flexShrink:0}}>{ok?'✅':'⚪'}</span>
            <span style={{fontSize:12,color:ok?'var(--charcoal)':'rgba(26,23,20,0.4)'}}>{ok?String(sim):String(nao)}</span>
          </div>
        ))}
      </div>

      {/* Fichas de producao */}
      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--copper)',textTransform:'uppercase',letterSpacing:'0.04em'}}>Fichas de producao</div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setMostrarAdicionarFicha(!mostrarAdicionarFicha)}>
            {mostrarAdicionarFicha?'Fechar':'+ Adicionar ficha'}
          </button>
        </div>
        {fichas.length===0&&<div className="muted">Sem fichas associadas.</div>}
        {fichas.map(f=>(
          <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{width:36,height:36,borderRadius:8,background:'var(--copper-pale)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>📄</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{f.nomePrato}</div>
              <div className="muted">{f.classificacao} · {f.numPorcoes} doses · {f.ingredientes?.length||0} ingredientes</div>
            </div>
            <span className="stamp copper">{f.classificacao}</span>
          </div>
        ))}

        {/* Adicionar ficha */}
        {mostrarAdicionarFicha&&(
          <div style={{marginTop:12,padding:12,background:'var(--cream-dark)',borderRadius:10}}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:8}}>Fichas disponiveis para adicionar</div>
            {fichasDisponiveis.length===0&&<div className="muted">Sem fichas disponiveis. Cria fichas no tab Ficha de Producao.</div>}
            {fichasDisponiveis.map(f=>(
              <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600}}>{f.nomePrato}</div>
                  <div className="muted">{f.classificacao} · {f.numPorcoes} doses</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>adicionarFicha(f.id)}>Adicionar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alunos */}
      {alunos.length>0&&(
        <div className="card">
          <div style={{fontSize:12,fontWeight:700,color:'var(--copper)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.04em'}}>Alunos da turma — {alunos.length}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {alunos.map(a=>(
              <span key={a.id} style={{fontSize:12,padding:'4px 10px',borderRadius:20,background:'var(--cream-dark)',border:'1px solid var(--border)'}}>
                {a.nome||`Aluno ${a.numero}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card" style={{background:'var(--info-pale)',border:'1px solid rgba(37,99,235,0.2)',marginBottom:12}}>
        <div style={{fontSize:12,color:'var(--info)'}}>
          A avaliacao e feita no tab <strong>Validacao</strong> apos os alunos completarem a sua autoavaliacao. A requisicao esta disponivel no tab <strong>Requisicao</strong>.
        </div>
      </div>

      {/* Grelha de avaliação — acordeão no final */}
      <div style={{border:`1.5px solid ${grelhaAberta?'var(--copper)':'var(--border)'}`,borderRadius:14,overflow:'hidden',boxShadow:grelhaAberta?'0 0 0 3px rgba(181,101,29,0.08)':'none'}}>
        <div onClick={()=>setGrelhaAberta(!grelhaAberta)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',cursor:'pointer',background:grelhaAberta?'var(--copper-pale)':'#fff'}}>
          <div style={{width:36,height:36,borderRadius:10,background:grelhaAberta?'var(--copper)':'var(--cream-dark)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
            📊
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14}}>Grelha de avaliacao</div>
            <div className="muted">Registo rapido por competencia · abre apos a aula</div>
          </div>
          <span style={{fontSize:18,color:'var(--copper)',transition:'transform 0.2s',transform:grelhaAberta?'rotate(180deg)':'rotate(0deg)'}}>›</span>
        </div>

        {grelhaAberta&&(
          <div style={{borderTop:'1px solid var(--border)',padding:'14px 16px',background:'#fff'}}>
            {alunos.length===0&&<div className="muted">Sem alunos registados nesta turma.</div>}
            {alunos.length>0&&(
              <>
                <div style={{overflowX:'auto',marginBottom:10}}>
                  <table style={{borderCollapse:'collapse',width:'100%',minWidth:400,fontSize:12}}>
                    <thead>
                      <tr style={{background:'var(--charcoal)',color:'var(--cream)'}}>
                        <th style={{padding:'8px 10px',textAlign:'left',fontWeight:500,minWidth:90}}>Aluno</th>
                        {comps.map(c=><th key={c.id} style={{padding:'6px 4px',fontWeight:500,textAlign:'center',fontSize:10,minWidth:60}}>{c.abrev}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {alunos.map((a,ai)=>(
                        <tr key={a.id} style={{background:ai%2===0?'#fff':'var(--cream)'}}>
                          <td style={{padding:'7px 10px',fontWeight:500,borderBottom:'1px solid var(--border)'}}>{a.nome||`Aluno ${a.numero}`}</td>
                          {comps.map(c=>{
                            const v=notas[a.id]?.[c.id]||null;
                            return(
                              <td key={c.id} style={{padding:'3px 2px',textAlign:'center',borderBottom:'1px solid var(--border)'}}>
                                <div style={{display:'flex',gap:2,justifyContent:'center'}}>
                                  {(['S','A','R'] as Nota[]).map(bv=>(
                                    <button key={String(bv)} onClick={()=>setNotas(p=>({...p,[a.id]:{...p[a.id],[c.id]:p[a.id][c.id]===bv?null:bv}}))}
                                      className="btn" style={{width:22,height:22,padding:0,fontSize:9,fontWeight:700,
                                        background:v===bv?COR[bv!].bg:'transparent',
                                        color:v===bv?COR[bv!].color:'rgba(31,27,22,0.2)',
                                        border:`1px solid ${v===bv?COR[bv!].border:'var(--border)'}`,
                                        borderRadius:5}}>{bv}</button>
                                  ))}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{display:'flex',gap:12,fontSize:11,color:'var(--charcoal)',opacity:0.5,marginBottom:10}}>
                  {[['var(--sage)','S — dentro'],['var(--charcoal)','A — acima'],['var(--danger)','R — reforco']].map(([cor,l])=>(
                    <span key={l} style={{display:'flex',alignItems:'center',gap:4}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:cor,display:'inline-block'}}/>{l}
                    </span>
                  ))}
                </div>
                <button className="btn btn-primary btn-block" style={{background:'var(--charcoal)'}} onClick={()=>alert('Avaliacoes guardadas!')}>Guardar avaliacoes</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

