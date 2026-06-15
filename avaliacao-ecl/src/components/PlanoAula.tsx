import React, { useState } from 'react';
import {
  getPlanosAulaPorTurma,
  addOrUpdatePlanoAula,
  getFichasProducao,
  getAlunos,
  addOrUpdateDistribuicaoFicha,
} from '../backend';
import { PlanoAula as TPlanoAula, DistribuicaoFicha } from '../types';

// ── Constantes ────────────────────────────────────────────────
const TIPOS_ATIVIDADE = [
  'Aula prática','Almoço pedagógico','Jantar pedagógico','Brunch',
  'Pequeno-almoço','Coffee break','Serviço real à carta','Catering',
  'Buffet','Evento externo','Outro',
];
const COMP_PERM = [
  'Responsabilidade pelas suas ações',
  'Sentido de organização',
  'Higiene e segurança alimentar',
  'Disponibilidade para aprender',
  'Respeito pelas regras',
  'Segurança e saúde no trabalho',
];
const COMP_OPC = [
  'Autonomia','Iniciativa','Autocontrolo','Assertividade','Empatia',
  'Escuta ativa','Cooperação','Empenho e persistência',
  'Flexibilidade e adaptabilidade','Sustentabilidade',
  'Respeito pelo bem-estar dos outros','Autoconfiança',
  'Postura profissional','Sentido crítico',
  'Respeito pelas diferenças individuais','Cuidado com a apresentação pessoal',
];

// ── Estilos base ──────────────────────────────────────────────
const S = {
  card: { background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:'14px 16px', marginBottom:8 } as React.CSSProperties,
  muted: { color:'var(--color-text-secondary)', fontSize:11 } as React.CSSProperties,
  lbl: { fontSize:11, fontWeight:500, color:'var(--color-text-secondary)', marginBottom:4, display:'block' } as React.CSSProperties,
  inp: { width:'100%', padding:'9px 11px', borderRadius:8, border:'0.5px solid var(--color-border-tertiary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)', fontSize:13, boxSizing:'border-box' } as React.CSSProperties,
  btnVerde: (dis=false): React.CSSProperties => ({ width:'100%', padding:'11px', background:dis?'var(--color-background-secondary)':'#1D9E75', color:dis?'var(--color-text-secondary)':'white', border:'none', borderRadius:10, fontSize:13, fontWeight:500, cursor:dis?'not-allowed':'pointer', marginTop:8 }),
  btnGhost: { width:'100%', padding:'9px', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, fontSize:12, color:'var(--color-text-secondary)', cursor:'pointer', marginTop:6 } as React.CSSProperties,
  badge: (bg:string,color:string): React.CSSProperties => ({ fontSize:10, padding:'3px 9px', borderRadius:20, background:bg, color, fontWeight:500, flexShrink:0 }),
};

// ── Componente acordeão ───────────────────────────────────────
function AccSection({ icon, title, desc, status, statusColor, statusBg, open, onToggle, done, children }: {
  icon: string; title: string; desc: string;
  status: string; statusColor: string; statusBg: string;
  open: boolean; onToggle: () => void; done?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ border:`0.5px solid ${open?'#1D9E75':'var(--color-border-tertiary)'}`, borderRadius:12, marginBottom:8, overflow:'hidden', boxShadow:open?'0 0 0 3px rgba(29,158,117,0.08)':'none' }}>
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px', cursor:'pointer', background:'var(--color-background-primary)' }}>
        <div style={{ width:36, height:36, borderRadius:10, background:done?'#EAF3DE':open?'#085041':'var(--color-background-secondary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
          {done ? '✓' : icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:500 }}>{title}</div>
          <div style={S.muted}>{desc}</div>
        </div>
        <span style={S.badge(statusBg, statusColor)}>{status}</span>
      </div>
      {open && (
        <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', padding:'14px', background:'var(--color-background-primary)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function PlanoAula({ turmaId }: { turmaId: string }) {
  const [vista, setVista] = useState<'lista'|'criar'|'grelha'>('lista');
  const [planoAtivo, setPlanoAtivo] = useState<TPlanoAula|null>(null);
  const planos = getPlanosAulaPorTurma(turmaId);

  if (vista === 'criar') return <CriarPlano turmaId={turmaId} onConcluido={p => { setPlanoAtivo(p); setVista('grelha'); }} onVoltar={() => setVista('lista')} />;
  if (vista === 'grelha' && planoAtivo) return <GrelhaAvaliacao plano={planoAtivo} turmaId={turmaId} onVoltar={() => setVista('lista')} />;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:16, fontWeight:500 }}>Planos de Aula</div>
        <button onClick={() => setVista('criar')} style={{ padding:'8px 14px', borderRadius:8, border:'none', background:'#085041', color:'white', fontWeight:500, fontSize:13, cursor:'pointer' }}>+ Novo plano</button>
      </div>
      {planos.length === 0 && (
        <div style={{ ...S.card, textAlign:'center', padding:32 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
          <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Ainda não há planos</div>
          <div style={S.muted}>Cria o primeiro plano de aula.</div>
        </div>
      )}
      {planos.map(p => (
        <div key={p.id} style={{ ...S.card, cursor:'pointer' }} onClick={() => { setPlanoAtivo(p); setVista('grelha'); }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>{p.titulo}</div>
              <div style={S.muted}>{p.data} · {p.horaInicio}-{p.horaFim} · {p.fichasIds.length} fichas</div>
            </div>
            <span style={S.badge(p.estado==='publicado'?'#EAF3DE':'#FAEEDA', p.estado==='publicado'?'#3B6D11':'#854F0B')}>
              {p.estado==='publicado'?'Publicado':'Rascunho'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CRIAR PLANO — ACORDEÃO
// ═══════════════════════════════════════════════════════════════
function CriarPlano({ turmaId, onConcluido, onVoltar }: { turmaId:string; onConcluido:(p:TPlanoAula)=>void; onVoltar:()=>void }) {
  const [secAberta, setSecAberta] = useState<number>(0);
  const [secFecha, setSecFecha] = useState<number[]>([]);
  const [dados, setDados] = useState({ titulo:'', data:new Date().toISOString().split('T')[0], horaInicio:'08:30', horaFim:'17:30', tipoAtividade:'Aula prática', tipoOutro:'', professor:'', observacoes:'' });
  const [fichasSel, setFichasSel] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<Record<string,Record<string,'A'|'B'|'C'|null>>>({});
  const [compOpc, setCompOpc] = useState<string[]>([]);
  const [plano, setPlano] = useState<TPlanoAula|null>(null);
  const [publicado, setPublicado] = useState(false);

  const todasFichas = getFichasProducao();
  const alunos = getAlunos().filter(a => a.turmaId === turmaId);

  function setD(k:string,v:string) { setDados(p=>({...p,[k]:v})); }
  function abrir(i:number) { setSecAberta(i); }
  function concluir(i:number) { setSecFecha(p=>[...p,i]); setSecAberta(i+1); }
  const feita = (i:number) => secFecha.includes(i);

  // Dados
  function guardarDados() {
    const now = new Date().toISOString();
    const p: TPlanoAula = {
      id:`plano_${Date.now()}`, turmaId, professor:dados.professor,
      data:dados.data, horaInicio:dados.horaInicio, horaFim:dados.horaFim,
      titulo:dados.titulo||`Plano ${dados.data}`, observacoes:dados.observacoes,
      fichasIds:[], estado:'rascunho', criadoEm:now, atualizadoEm:now,
    };
    addOrUpdatePlanoAula(p);
    setPlano(p);
    concluir(0);
  }

  // Fichas
  function toggleFicha(id:string) { setFichasSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]); }
  function guardarFichas() {
    if(!plano) return;
    const up = {...plano, fichasIds:fichasSel, estado:'fichas_pendentes' as const, atualizadoEm:new Date().toISOString()};
    addOrUpdatePlanoAula(up); setPlano(up);
    const g: Record<string,Record<string,'A'|'B'|'C'|null>> = {};
    fichasSel.forEach(fid => { g[fid]={}; alunos.forEach(a=>{g[fid][a.id]=null;}); });
    setGrupos(g); concluir(1);
  }

  // Grupos
  function setGrupo(fichaId:string,alunoId:string,g:'A'|'B'|'C'|null) {
    setGrupos(p=>({...p,[fichaId]:{...p[fichaId],[alunoId]:g}}));
  }
  function guardarGrupos() {
    if(!plano) return;
    fichasSel.forEach(fid => {
      const gs = grupos[fid]||{};
      const grupoA = alunos.filter(a=>gs[a.id]==='A').map(a=>a.id);
      const grupoB = alunos.filter(a=>gs[a.id]==='B').map(a=>a.id);
      const todos = alunos.filter(a=>!gs[a.id]).map(a=>a.id);
      const dist: DistribuicaoFicha = {
        id:`dist_${plano.id}_${fid}`, planoAulaId:plano.id, fichaId:fid,
        modo:todos.length===alunos.length?'todos':'grupo',
        tipoServico:'normal',
        alunosIds:[...grupoA,...grupoB,...todos],
        grupos:[
          ...(grupoA.length?[{id:`gr_A_${fid}`,fichaId:fid,planoAulaId:plano.id,nome:'Grupo A',alunosIds:grupoA}]:[]),
          ...(grupoB.length?[{id:`gr_B_${fid}`,fichaId:fid,planoAulaId:plano.id,nome:'Grupo B',alunosIds:grupoB}]:[]),
        ],
        tecnicasSelecionadas:[], atitudesSelecionadas:[], atitudesProfessor:[], publicada:false,
      };
      addOrUpdateDistribuicaoFicha(dist);
    });
    concluir(2);
  }

  // Competências
  function toggleComp(c:string) { setCompOpc(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c].slice(0,2)); }

  // Publicar
  function publicar() {
    if(!plano) return;
    const up = {...plano, estado:'publicado' as const, atualizadoEm:new Date().toISOString()};
    addOrUpdatePlanoAula(up); setPlano(up); setPublicado(true); onConcluido(up);
  }

  const resumoDados = dados.data ? `${dados.tipoAtividade} · ${dados.horaInicio}-${dados.horaFim}${dados.professor?` · ${dados.professor}`:''}` : '';
  const resumoFichas = fichasSel.length ? `${fichasSel.length} ficha${fichasSel.length>1?'s':''} selecionada${fichasSel.length>1?'s':''}` : 'Nenhuma ficha selecionada';
  const fichasSelecionadas = todasFichas.filter(f=>fichasSel.includes(f.id));

  return (
    <div>
      {/* CABEÇALHO VERDE ESCURO */}
      <div style={{ background:'#085041', borderRadius:12, padding:'16px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'6px 10px', color:'white', fontSize:12, cursor:'pointer' }}>← Voltar</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:500, color:'white' }}>{dados.titulo||'Novo Plano de Aula'}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:2 }}>Escola de Comércio de Lisboa · {turmaId}</div>
          </div>
        </div>
        {/* Progresso */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
          {['Dados','Fichas','Grupos','Compet.','Publicar'].map((s,i)=>(
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:feita(i)?'#9FE1CB':secAberta===i?'white':'rgba(255,255,255,0.2)', color:feita(i)?'#085041':secAberta===i?'#085041':'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, margin:'0 auto 3px', border:feita(i)?'none':secAberta===i?'none':'1px solid rgba(255,255,255,0.3)' }}>
                {feita(i)?'✓':(i+1)}
              </div>
              <div style={{ fontSize:9, color:feita(i)?'#9FE1CB':secAberta===i?'white':'rgba(255,255,255,0.5)', fontWeight:secAberta===i?500:400 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECÇÃO 0 — DADOS */}
      <AccSection icon="📅" title="Dados da aula" desc={feita(0)?resumoDados:'Preenche a data, hora e tipo de atividade'}
        status={feita(0)?'Completo':secAberta===0?'Em curso':'Pendente'}
        statusBg={feita(0)?'#EAF3DE':secAberta===0?'#E6F1FB':'var(--color-background-secondary)'}
        statusColor={feita(0)?'#3B6D11':secAberta===0?'#185FA5':'var(--color-text-secondary)'}
        open={secAberta===0} onToggle={()=>abrir(0)} done={feita(0)}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          <div><span style={S.lbl}>Data</span><input type="date" style={S.inp} value={dados.data} onChange={e=>setD('data',e.target.value)}/></div>
          <div><span style={S.lbl}>Professor</span><input style={S.inp} value={dados.professor} onChange={e=>setD('professor',e.target.value)} placeholder="Nome"/></div>
          <div><span style={S.lbl}>Hora início</span><input type="time" style={S.inp} value={dados.horaInicio} onChange={e=>setD('horaInicio',e.target.value)}/></div>
          <div><span style={S.lbl}>Hora fim</span><input type="time" style={S.inp} value={dados.horaFim} onChange={e=>setD('horaFim',e.target.value)}/></div>
        </div>
        <span style={S.lbl}>Tipo de atividade</span>
        <select style={S.inp} value={dados.tipoAtividade} onChange={e=>setD('tipoAtividade',e.target.value)}>
          {TIPOS_ATIVIDADE.map(t=><option key={t}>{t}</option>)}
        </select>
        {dados.tipoAtividade==='Outro'&&<input style={{...S.inp,marginTop:6}} value={dados.tipoOutro} onChange={e=>setD('tipoOutro',e.target.value)} placeholder="Descreve a atividade..."/>}
        <div style={{marginTop:8}}><span style={S.lbl}>Título (opcional)</span><input style={S.inp} value={dados.titulo} onChange={e=>setD('titulo',e.target.value)} placeholder={`ex: Almoço Erasmus — ${turmaId}`}/></div>
        <button style={S.btnVerde(!dados.data)} disabled={!dados.data} onClick={guardarDados}>Guardar e continuar →</button>
      </AccSection>

      {/* SECÇÃO 1 — FICHAS */}
      <AccSection icon="📄" title="Fichas de produção" desc={feita(1)?resumoFichas:'Seleciona as receitas para esta aula'}
        status={feita(1)?'Completo':secAberta===1?'Em curso':'Pendente'}
        statusBg={feita(1)?'#EAF3DE':secAberta===1?'#E6F1FB':'var(--color-background-secondary)'}
        statusColor={feita(1)?'#3B6D11':secAberta===1?'#185FA5':'var(--color-text-secondary)'}
        open={secAberta===1} onToggle={()=>feita(0)&&abrir(1)} done={feita(1)}>
        {todasFichas.length===0?(
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:11, color:'var(--color-text-secondary)', marginBottom:8 }}>Ainda não há fichas criadas.</div>
            <div style={{ padding:'10px 12px', background:'#EAF3DE', borderRadius:8, fontSize:11, color:'#3B6D11' }}>
              Vai ao tab <strong>Ficha de Produção</strong> para criar fichas, depois volta aqui.
            </div>
          </div>
        ):(
          todasFichas.map(f=>(
            <div key={f.id} onClick={()=>toggleFicha(f.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:`0.5px solid ${fichasSel.includes(f.id)?'#1D9E75':'var(--color-border-tertiary)'}`, background:fichasSel.includes(f.id)?'#EAF3DE':'var(--color-background-primary)', marginBottom:6, cursor:'pointer' }}>
              <div style={{ width:20, height:20, borderRadius:5, border:`1.5px solid ${fichasSel.includes(f.id)?'#1D9E75':'var(--color-border-tertiary)'}`, background:fichasSel.includes(f.id)?'#1D9E75':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'white', fontSize:11 }}>
                {fichasSel.includes(f.id)&&'✓'}
              </div>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{f.nomePrato}</div><div style={S.muted}>{f.classificacao} · {f.numPorcoes} porções</div></div>
            </div>
          ))
        )}
        <button style={S.btnVerde(fichasSel.length===0)} disabled={fichasSel.length===0} onClick={guardarFichas}>Continuar para grupos →</button>
      </AccSection>

      {/* SECÇÃO 2 — GRUPOS */}
      <AccSection icon="👥" title="Distribuição de grupos" desc={feita(2)?`${alunos.length} alunos distribuídos`:'Atribui alunos às fichas'}
        status={feita(2)?'Completo':secAberta===2?'Em curso':'Pendente'}
        statusBg={feita(2)?'#EAF3DE':secAberta===2?'#E6F1FB':'var(--color-background-secondary)'}
        statusColor={feita(2)?'#3B6D11':secAberta===2?'#185FA5':'var(--color-text-secondary)'}
        open={secAberta===2} onToggle={()=>feita(1)&&abrir(2)} done={feita(2)}>
        {fichasSelecionadas.map(f=>(
          <div key={f.id} style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:500,color:'#085041',marginBottom:6,padding:'6px 10px',background:'#EAF3DE',borderRadius:8}}>{f.nomePrato}</div>
            {alunos.length===0&&<div style={S.muted}>Sem alunos registados nesta turma.</div>}
            {alunos.map(a=>{
              const g = grupos[f.id]?.[a.id]||null;
              return (
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:'#9FE1CB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:500,color:'#085041',flexShrink:0}}>{a.numero}</div>
                  <span style={{flex:1,fontSize:12}}>{a.nome||`Aluno ${a.numero}`}</span>
                  <div style={{display:'flex',gap:4}}>
                    {(['A','B','C'] as const).map(gr=>(
                      <button key={gr} onClick={()=>setGrupo(f.id,a.id,g===gr?null:gr)} style={{padding:'3px 8px',borderRadius:20,border:'0.5px solid var(--color-border-tertiary)',background:g===gr?'#085041':'var(--color-background-secondary)',color:g===gr?'white':'var(--color-text-secondary)',fontSize:10,fontWeight:g===gr?500:400,cursor:'pointer'}}>Gr {gr}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {alunos.length===0&&fichasSelecionadas.length===0&&<div style={S.muted}>Seleciona fichas primeiro.</div>}
        <button style={S.btnVerde()} onClick={guardarGrupos}>Continuar para competências →</button>
      </AccSection>

      {/* SECÇÃO 3 — COMPETÊNCIAS */}
      <AccSection icon="⭐" title="Competências" desc={feita(3)?`${COMP_PERM.length} permanentes + ${compOpc.length} opcionais`:'Define o que vai ser avaliado'}
        status={feita(3)?'Completo':secAberta===3?'Em curso':'Pendente'}
        statusBg={feita(3)?'#EAF3DE':secAberta===3?'#E6F1FB':'var(--color-background-secondary)'}
        statusColor={feita(3)?'#3B6D11':secAberta===3?'#185FA5':'var(--color-text-secondary)'}
        open={secAberta===3} onToggle={()=>feita(2)&&abrir(3)} done={feita(3)}>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:500,color:'#854F0B',marginBottom:6}}>Permanentes — sempre avaliadas</div>
          {COMP_PERM.map(c=>(
            <div key={c} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:'#FAEEDA',marginBottom:4}}>
              <span style={{fontSize:12}}>🔒</span><span style={{fontSize:12,flex:1}}>{c}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:500,color:'#185FA5',marginBottom:6}}>Opcionais do professor — máx. 2</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
            {COMP_OPC.map(c=>{
              const sel=compOpc.includes(c);
              return(
                <div key={c} onClick={()=>toggleComp(c)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 9px',borderRadius:8,border:`0.5px solid ${sel?'#378ADD':'var(--color-border-tertiary)'}`,background:sel?'#E6F1FB':'var(--color-background-secondary)',cursor:'pointer',fontSize:11}}>
                  <span style={{color:sel?'#185FA5':'var(--color-text-secondary)',flexShrink:0}}>{sel?'✓':'+'}</span>
                  <span style={{color:sel?'#0C447C':'var(--color-text-secondary)',fontWeight:sel?500:400,lineHeight:1.3}}>{c}</span>
                </div>
              );
            })}
          </div>
          {compOpc.length>=2&&<div style={{fontSize:10,color:'#854F0B',marginTop:6,background:'#FAEEDA',padding:'5px 8px',borderRadius:6}}>Máximo de 2 competências opcionais atingido.</div>}
        </div>
        {fichasSelecionadas.some(f=>f.tecnicasSugeridas?.length>0)&&(
          <div style={{marginTop:12}}>
            <div style={{fontSize:11,fontWeight:500,color:'#534AB7',marginBottom:6}}>Técnicas das fichas selecionadas</div>
            {fichasSelecionadas.map(f=>f.tecnicasSugeridas?.length>0&&(
              <div key={f.id} style={{marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:500,marginBottom:3}}>{f.nomePrato}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {f.tecnicasSugeridas.map(t=><span key={t} style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:'#EEEDFE',color:'#534AB7'}}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
        <button style={S.btnVerde()} onClick={()=>concluir(3)}>Continuar para publicar →</button>
      </AccSection>

      {/* SECÇÃO 4 — PUBLICAR */}
      <AccSection icon="🚀" title="Publicar plano" desc="Tornar visível para os alunos"
        status={publicado?'Publicado':secAberta===4?'Pronto':'Pendente'}
        statusBg={publicado?'#EAF3DE':secAberta===4?'#EAF3DE':'var(--color-background-secondary)'}
        statusColor={publicado?'#3B6D11':secAberta===4?'#3B6D11':'var(--color-text-secondary)'}
        open={secAberta===4} onToggle={()=>feita(3)&&abrir(4)} done={publicado}>
        <div style={{textAlign:'center',padding:'10px 0'}}>
          <div style={{fontSize:36,marginBottom:8}}>📋</div>
          <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>{dados.titulo||`Plano ${dados.data}`}</div>
          <div style={S.muted}>{dados.data} · {dados.horaInicio}-{dados.horaFim}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:14}}>
            {[['Fichas',fichasSel.length],['Alunos',alunos.length],['Compet.',COMP_PERM.length+compOpc.length]].map(([l,v])=>(
              <div key={String(l)} style={{background:'var(--color-background-secondary)',borderRadius:8,padding:'8px 4px'}}>
                <div style={{fontSize:20,fontWeight:500,color:'#085041'}}>{v}</div>
                <div style={S.muted}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {!publicado&&<button style={{...S.btnVerde(),background:'#085041'}} onClick={publicar}>🚀 Publicar plano de aula</button>}
        {publicado&&<div style={{textAlign:'center',padding:'10px',background:'#EAF3DE',borderRadius:8,color:'#3B6D11',fontSize:13,fontWeight:500}}>✓ Plano publicado — os alunos já podem aceder</div>}
      </AccSection>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GRELHA DE AVALIAÇÃO
// ═══════════════════════════════════════════════════════════════
function GrelhaAvaliacao({ plano, turmaId, onVoltar }: { plano:TPlanoAula; turmaId:string; onVoltar:()=>void }) {
  const alunos = getAlunos().filter(a=>a.turmaId===turmaId);
  const fichas = getFichasProducao().filter(f=>plano.fichasIds.includes(f.id));
  const comps = COMP_PERM.slice(0,4).map(n=>({id:n,abrev:n.split(' ').slice(0,2).join(' ')}));
  type Nota='S'|'A'|'R'|null;
  const [notas,setNotas] = useState<Record<string,Record<string,Nota>>>(()=>Object.fromEntries(alunos.map(a=>[a.id,Object.fromEntries(comps.map(c=>[c.id,null]))])));
  const COR: Record<string,{bg:string;border:string;color:string}> = {S:{bg:'#EAF3DE',border:'#639922',color:'#3B6D11'},A:{bg:'#E6F1FB',border:'#378ADD',color:'#0C447C'},R:{bg:'#FCEBEB',border:'#E24B4A',color:'#A32D2D'}};

  return (
    <div>
      <div style={{background:'#085041',borderRadius:12,padding:'14px 16px',marginBottom:12}}>
        <button onClick={onVoltar} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:8,padding:'5px 10px',color:'white',fontSize:11,cursor:'pointer',marginBottom:8}}>← Planos</button>
        <div style={{fontSize:15,fontWeight:500,color:'white'}}>{plano.titulo}</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:2}}>{plano.data} · Grelha de avaliação</div>
      </div>
      {fichas.length>0&&(
        <div style={{...S.card,marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:500,color:'#085041',marginBottom:6}}>Fichas desta aula</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{fichas.map(f=><span key={f.id} style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:'#EAF3DE',color:'#085041'}}>{f.nomePrato}</span>)}</div>
        </div>
      )}
      <div style={{overflowX:'auto',marginBottom:10}}>
        <table style={{borderCollapse:'collapse',width:'100%',minWidth:400}}>
          <thead>
            <tr style={{background:'#085041',color:'white'}}>
              <th style={{padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:500,minWidth:90}}>Aluno</th>
              {comps.map(c=><th key={c.id} style={{padding:'6px 4px',fontSize:10,fontWeight:500,textAlign:'center',minWidth:70}}>{c.abrev}</th>)}
            </tr>
          </thead>
          <tbody>
            {alunos.map((a,ai)=>(
              <tr key={a.id} style={{background:ai%2===0?'var(--color-background-primary)':'var(--color-background-secondary)'}}>
                <td style={{padding:'8px 10px',fontSize:12,fontWeight:500,borderBottom:'0.5px solid var(--color-border-tertiary)'}}>{a.nome||`Aluno ${a.numero}`}</td>
                {comps.map(c=>{
                  const v=notas[a.id]?.[c.id]||null;
                  return(
                    <td key={c.id} style={{padding:'4px 3px',textAlign:'center',borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
                      <div style={{display:'flex',gap:2,justifyContent:'center'}}>
                        {(['S','A','R'] as Nota[]).map(bv=>(
                          <button key={String(bv)} onClick={()=>setNotas(p=>({...p,[a.id]:{...p[a.id],[c.id]:p[a.id][c.id]===bv?null:bv}}))} style={{width:22,height:22,borderRadius:5,fontSize:9,fontWeight:700,cursor:'pointer',border:`0.5px solid ${v===bv?COR[bv!].border:'var(--color-border-tertiary)'}`,background:v===bv?COR[bv!].bg:'var(--color-background-secondary)',color:v===bv?COR[bv!].color:'var(--color-text-secondary)'}}>{bv}</button>
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
      <div style={{display:'flex',gap:12,fontSize:11,color:'var(--color-text-secondary)',marginBottom:10}}>
        {[['#639922','S — dentro'],['#378ADD','A — acima'],['#E24B4A','R — reforço']].map(([cor,l])=>(
          <span key={l} style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:9,height:9,borderRadius:'50%',background:cor,display:'inline-block'}}/>{l}</span>
        ))}
      </div>
      <button style={{...S.btnVerde(),background:'#085041'}} onClick={()=>alert('Avaliações guardadas!')}>Guardar avaliações</button>
    </div>
  );
}

