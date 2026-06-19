import React, { useState } from 'react';
import {
  getPlanosAulaPorTurma,
  addOrUpdatePlanoAula,
  getFichasProducao,
  getAlunos,
} from '../backend';
import { PlanoAula as TPlanoAula } from '../types';
import { Card } from './ui';
import ProfessorView from './ProfessorView';

const TIPOS_ATIVIDADE = [
  'Aula prática','Almoço pedagógico','Jantar pedagógico','Brunch',
  'Pequeno-almoço','Coffee break','Serviço real à carta','Catering',
  'Buffet','Evento externo','Outro',
];

const COMP_PERM = [
  'Responsabilidade pelas suas acoes',
  'Autonomia no ambito das suas funcoes',
  'Respeito pelas normas de higiene e seguranca alimentar',
  'Sentido de organizacao',
  'Respeito pelas regras e normas definidas',
  'Respeito pelas normas de seguranca e saude no trabalho',
];

const COMP_OPC = [
  'Empatia','Empenho e persistencia na resolucao de problemas','Escuta ativa',
  'Cooperacao com a equipa','Assertividade','Cuidado com a apresentacao pessoal',
  'Flexibilidade e adaptabilidade','Iniciativa','Autocontrolo',
  'Disponibilidade para aprender','Respeito pela sensibilidade e bem-estar dos outros',
  'Respeito pelos principios da sustentabilidade','Sentido critico',
  'Autoconfianca','Postura profissional','Respeito pelas diferencas individuais',
];

export const UCS_COZINHA = [
  { id:'UC03576', nome:'Planear e organizar a producao de cozinha' },
  { id:'UC01999', nome:'Preparar e executar confecoes de cozinha' },
  { id:'UC03577', nome:'Preparar e confecionar molhos e fundos' },
  { id:'UC02002', nome:'Preparar e confecionar sopas, acepipes, ovos e massas' },
  { id:'UC02003', nome:'Preparar e confecionar peixes, mariscos e guarnicoes' },
  { id:'UC02004', nome:'Preparar e confecionar carnes, aves, caca e guarnicoes' },
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

function FichaSelector({ todasFichas, fichasSel, onChange }: {
  todasFichas: any[]; fichasSel: string[]; onChange: (ids: string[]) => void;
}) {
  const [pesquisa, setPesquisa] = useState('');
  const fichasFiltradas = todasFichas.filter(f =>
    !pesquisa || (f.nomePrato||'').toLowerCase().includes(pesquisa.toLowerCase()) ||
    (f.classificacao||'').toLowerCase().includes(pesquisa.toLowerCase())
  );
  return (
    <div>
      {fichasSel.length > 0 && (
        <div style={{marginBottom:8,padding:'8px 10px',background:'var(--copper-pale)',borderRadius:8,fontSize:12,color:'var(--copper)',fontWeight:600}}>
          {fichasSel.length} ficha{fichasSel.length>1?'s':''} selecionada{fichasSel.length>1?'s':''}
        </div>
      )}
      <input
        className="input"
        value={pesquisa}
        onChange={e=>setPesquisa(e.target.value)}
        placeholder="Pesquisar fichas por nome ou tipo..."
        style={{marginBottom:8}}
      />
      <div style={{maxHeight:280,overflowY:'auto',border:'1px solid var(--border)',borderRadius:10,padding:6}}>
        {fichasFiltradas.length===0&&<div className="muted" style={{padding:10,textAlign:'center'}}>Sem resultados para "{pesquisa}"</div>}
        {fichasFiltradas.map(f=>{
          const sel = fichasSel.includes(f.id);
          return (
            <div key={f.id} onClick={()=>onChange(sel?fichasSel.filter(x=>x!==f.id):[...fichasSel,f.id])}
              style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,marginBottom:4,cursor:'pointer',background:sel?'var(--copper-pale)':'#fff',border:'1px solid '+(sel?'var(--copper)':'transparent')}}>
              <div style={{width:20,height:20,borderRadius:5,border:'1.5px solid '+(sel?'var(--copper)':'var(--border)'),background:sel?'var(--copper)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'white',fontSize:12,fontWeight:700}}>
                {sel&&'✓'}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{f.nomePrato}</div>
                <div className="muted" style={{fontSize:13}}>{f.classificacao} · {f.numPorcoes} doses{f.data?' · '+f.data:''}</div>
              </div>
              {f.ucsAssociadas?.length>0&&<span style={{fontSize:13,color:'var(--copper)',fontWeight:600}}>{f.ucsAssociadas[0]}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Acc({ num, icon, title, desc, status, open, locked, onToggle, children }: {
  num: number; icon: string; title: string; desc: string;
  status: 'done'|'active'|'pending'; open: boolean; locked: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  const statusStyles = {
    done:    { bg:'rgba(107,124,94,0.15)',  color:'var(--sage)' },
    active:  { bg:'rgba(181,101,29,0.12)', color:'var(--copper)' },
    pending: { bg:'rgba(31,27,22,0.06)',   color:'rgba(31,27,22,0.4)' },
  }[status];
  return (
    <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:10 }}>
      <div onClick={() => !locked && onToggle()} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:locked?'default':'pointer' }}>
        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, background: status==='done'?'rgba(107,124,94,0.15)' : status==='active'?'var(--copper)' : 'rgba(31,27,22,0.06)' }}>
          {status==='done' ? '✓' : icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:14 }}>{title}</div>
          <div className="muted" style={{ fontSize:12, marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{desc}</div>
        </div>
        <span className="badge" style={{ ...statusStyles, fontSize:13 }}>
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

export default function PlanoAula({ turmaId, nomeProfessor, onAlteracao, onGuardado }: {
  turmaId: string; nomeProfessor?: string;
  onAlteracao?: (guardar?: () => void) => void;
  onGuardado?: (plano?: TPlanoAula) => void;
}) {
  const [vista, setVista] = useState<'lista'|'criar'|'detalhe'>('lista');
  const [planoAtivo, setPlanoAtivo] = useState<TPlanoAula|null>(null);
  const planos = getPlanosAulaPorTurma(turmaId);

  if (vista==='criar') return <CriarPlano turmaId={turmaId} nomeProfessor={nomeProfessor} onConcluido={p => {
    onGuardado?.(p);
  }} onVoltar={()=>setVista('lista')} onAlteracao={onAlteracao} onGuardado={onGuardado} />;

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
        // Corrigir data que pode vir em vários formatos
        let d: Date;
        try {
          if (!p.data || p.data === 'undefined') throw new Error();
          // Formato ISO: 2026-07-09
          if (/^\d{4}-\d{2}-\d{2}$/.test(p.data)) {
            d = new Date(p.data + 'T12:00:00');
          // Formato com hora: 2026-07-09T...
          } else if (p.data.includes('T')) {
            d = new Date(p.data);
          } else {
            d = new Date(p.data);
          }
          if (isNaN(d.getTime())) throw new Error();
        } catch {
          d = new Date();
        }
        // Hora limpa
        const horaI = (p.horaInicio||'').includes('T')
          ? new Date(p.horaInicio).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})
          : (p.horaInicio||'').substring(0,5);
        const horaF = (p.horaFim||'').includes('T')
          ? new Date(p.horaFim).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})
          : (p.horaFim||'').substring(0,5);

        return (
          <div key={p.id} className="option-card" onClick={() => onGuardado?.(p)}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ background:'var(--copper)', borderRadius:10, padding:'8px 10px', textAlign:'center', flexShrink:0, minWidth:48 }}>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:22, fontWeight:700, color:'white', lineHeight:1 }}>{d.getDate().toString().padStart(2,'0')}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)', textTransform:'uppercase' }}>{d.toLocaleDateString('pt-PT',{month:'short'})}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>{d.getFullYear()}</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>
                  {p.numeroPlan ? <span style={{ color:'var(--copper)', marginRight:6 }}>Plano {p.numeroPlan}</span> : null}
                  {p.titulo || 'Plano de aula'}
                </div>
                {p.ucId && (
                  <div style={{ fontSize:13, color:'var(--copper)', fontWeight:600, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {p.ucId} {p.ucNome ? '- ' + p.ucNome : ''}
                  </div>
                )}
                <div className="muted" style={{ fontSize:13 }}>
                  {horaI && horaF ? horaI+'-'+horaF+' ' : ''}{p.turmaId}{(p.fichasIds?.length||0) > 0 ? ' - '+p.fichasIds.length+' ficha'+(p.fichasIds.length!==1?'s':'') : ''}
                </div>
              </div>
              <span style={{ fontSize:13, padding:'3px 10px', borderRadius:20, fontWeight:700, flexShrink:0,
                background:p.estado==='publicado'?'rgba(90,122,78,0.15)':'rgba(181,101,29,0.12)',
                color:p.estado==='publicado'?'var(--sage)':'var(--copper)',
                border:'1px solid '+(p.estado==='publicado'?'rgba(90,122,78,0.3)':'rgba(181,101,29,0.3)'),
              }}>
                {p.estado==='publicado'?'Publicado':'Rascunho'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CriarPlano({ turmaId, nomeProfessor, onConcluido, onVoltar, onAlteracao, onGuardado }: {
  turmaId:string; nomeProfessor?:string; onConcluido:(p:TPlanoAula)=>void;
  onVoltar:()=>void; onAlteracao?:(guardar?:()=>void)=>void; onGuardado?:()=>void;
}) {
  const [dados, setDados] = useState({
    data: new Date().toISOString().split('T')[0],
    horaInicio: '08:30',
    horaFim: '17:30',
    ucId: '',
    titulo: '',
    professor: nomeProfessor || '',
    tipoAtividade: 'Aula prática',
  });

  function setD(k: string, v: string) { setDados(p => ({ ...p, [k]: v })); onAlteracao?.(); }

  function guardar() {
    const now = new Date().toISOString();
    const ucSel = UCS_COZINHA.find(u => u.id === dados.ucId);
    const planosExistentes = getPlanosAulaPorTurma(turmaId);
    const numeroPlan = planosExistentes.length + 1;
    const titulo = dados.titulo || `Plano ${numeroPlan} — ${dados.tipoAtividade} — ${dados.data}`;
    const p: TPlanoAula = {
      id: 'plano_' + Date.now(), turmaId,
      professor: dados.professor,
      data: dados.data,
      horaInicio: dados.horaInicio,
      horaFim: dados.horaFim,
      titulo,
      observacoes: '', fichasIds: [],
      estado: 'rascunho',
      criadoEm: now, atualizadoEm: now,
      ucId: dados.ucId,
      ucNome: ucSel?.nome || '',
      numeroPlan,
    } as TPlanoAula;
    addOrUpdatePlanoAula(p);
    onGuardado?.();
    onConcluido(p);
  }

  const podeGuardar = !!dados.data && !!dados.ucId;

  return (
    <div>
      <div style={{ background: 'var(--charcoal)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
        <button onClick={onVoltar} style={{ background: 'rgba(247,241,230,0.1)', border: '1px solid rgba(247,241,230,0.2)', borderRadius: 8, padding: '5px 12px', color: 'rgba(247,241,230,0.7)', fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
          ← Voltar
        </button>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: 'var(--cream)' }}>
          Novo Plano de Aula
        </div>
        <div style={{ fontSize: 13, color: 'rgba(247,241,230,0.5)', marginTop: 3 }}>ECL · {turmaId}</div>
      </div>

      <Card>
        {/* UC — campo mais importante */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label className="field-label" style={{ fontSize: 14, fontWeight: 700, color: 'var(--copper)', marginBottom: 6, display: 'block' }}>
            Unidade de Competência <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select className="input" value={dados.ucId}
            onChange={e => setD('ucId', e.target.value)}
            style={{ border: !dados.ucId ? '2px solid var(--danger)' : undefined, fontSize: 14 }}>
            <option value="">— Selecciona a UC desta aula —</option>
            {UCS_COZINHA.map(u => <option key={u.id} value={u.id}>{u.id} — {u.nome}</option>)}
          </select>
          {!dados.ucId && (
            <div style={{ fontSize: 13, color: 'var(--danger)', marginTop: 4 }}>Obrigatório — define as competências da aula</div>
          )}
          {dados.ucId && (
            <div style={{ fontSize: 13, color: 'var(--sage)', marginTop: 4, fontWeight: 600 }}>
              ✓ {UCS_COZINHA.find(u => u.id === dados.ucId)?.nome}
            </div>
          )}
        </div>

        {/* Data e horas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div className="field">
            <label className="field-label">Data</label>
            <input type="date" className="input" value={dados.data} onChange={e => setD('data', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Início</label>
            <input type="time" className="input" value={dados.horaInicio} onChange={e => setD('horaInicio', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Fim</label>
            <input type="time" className="input" value={dados.horaFim} onChange={e => setD('horaFim', e.target.value)} />
          </div>
        </div>

        {/* Tipo */}
        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-label">Tipo de actividade</label>
          <select className="input" value={dados.tipoAtividade} onChange={e => setD('tipoAtividade', e.target.value)}>
            {TIPOS_ATIVIDADE.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Título — opcional */}
        <div className="field" style={{ marginBottom: 20 }}>
          <label className="field-label">Título (opcional)</label>
          <input className="input" value={dados.titulo}
            onChange={e => setD('titulo', e.target.value)}
            placeholder={`Plano — ${dados.tipoAtividade} — ${dados.data}`} />
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)', marginTop: 4 }}>
            Se não preencheres, o título é gerado automaticamente com número sequencial
          </div>
        </div>

        <button
          className="btn btn-primary btn-block"
          disabled={!podeGuardar}
          onClick={guardar}
          style={{ fontSize: 15, padding: '14px', opacity: podeGuardar ? 1 : 0.4 }}>
          {podeGuardar ? 'Criar plano e começar →' : 'Selecciona a UC para continuar'}
        </button>
      </Card>
    </div>
  );
}


function DetalhePlano({ plano, turmaId, onVoltar, onEditar, onIrParaFicha }: {
  plano:TPlanoAula; turmaId:string; onVoltar:()=>void; onEditar:()=>void; onIrParaFicha?:()=>void;
}) {
  const fichas = getFichasProducao().filter(f=>plano.fichasIds.includes(f.id));
  const todasFichas = getFichasProducao();
  const fichasDisponiveis = todasFichas.filter(f=>!plano.fichasIds.includes(f.id));
  const alunos = getAlunos().filter(a=>a.turmaId===turmaId);
  const [grelhaAberta, setGrelhaAberta] = useState(false);
  const [mostrarAdicionarFicha, setMostrarAdicionarFicha] = useState(false);
  const temFichas = fichas.length > 0;
  const publicado = plano.estado === 'publicado';

  function adicionarFicha(fichaId: string) {
    addOrUpdatePlanoAula({...plano, fichasIds:[...plano.fichasIds,fichaId], atualizadoEm:new Date().toISOString()});
    setMostrarAdicionarFicha(false);
  }

  type Nota='S'|'A'|'R'|null;
  const comps = COMP_PERM.map(n=>({id:n,abrev:n.split(' ').slice(0,2).join(' ')}));
  const [notas,setNotas]=useState<Record<string,Record<string,Nota>>>(()=>
    Object.fromEntries(alunos.map(a=>[a.id,Object.fromEntries(comps.map(c=>[c.id,null]))]))
  );
  const [compExtra,setCompExtra]=useState('');
  const [compExtraAtiva,setCompExtraAtiva]=useState<string|null>(null);
  const [notasExtra,setNotasExtra]=useState<Record<string,Nota>>({});
  const COR={
    S:{bg:'rgba(107,124,94,0.15)',color:'var(--sage)',border:'var(--sage)'},
    A:{bg:'rgba(31,27,22,0.06)',color:'var(--charcoal)',border:'var(--charcoal)'},
    R:{bg:'rgba(179,65,58,0.1)',color:'var(--danger)',border:'var(--danger)'}
  };

  return (
    <div>
      <div style={{background:'var(--charcoal)',borderRadius:14,padding:'18px',marginBottom:12}}>
        <button onClick={onVoltar} className="btn" style={{fontSize:13,padding:'5px 10px',background:'rgba(247,241,230,0.6)',color:'rgba(247,241,230,0.7)',border:'1px solid rgba(247,241,230,0.6)',marginBottom:10}}>← Planos</button>
        <div className="display" style={{fontSize:18,color:'var(--cream)'}}>{plano.titulo}</div>
        <div style={{fontSize:12,color:'rgba(247,241,230,0.5)',marginTop:2}}>{plano.data} · {plano.horaInicio}–{plano.horaFim} · {plano.turmaId}</div>
        {plano.ucId && (
          <div style={{marginTop:8,padding:'6px 10px',background:'rgba(181,101,29,0.25)',borderRadius:8,display:'inline-block'}}>
            <span style={{fontSize:13,color:'rgba(247,241,230,0.6)',textTransform:'uppercase',letterSpacing:'0.05em'}}>UC </span>
            <span style={{fontSize:12,color:'var(--cream)',fontWeight:600}}>{plano.ucId} - {plano.ucNome}</span>
          </div>
        )}
        <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
          <span style={{fontSize:13,padding:'3px 10px',borderRadius:20,background:publicado?'rgba(107,124,94,0.3)':'rgba(181,101,29,0.3)',color:'var(--cream)'}}>{publicado?'Publicado':'Rascunho'}</span>
          <span style={{fontSize:13,color:'rgba(247,241,230,0.4)'}}>☁️ Guardado no Sheets</span>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--charcoal)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.04em'}}>Estado do plano</div>
        {[
          [temFichas, fichas.length+' ficha'+(fichas.length!==1?'s':'')+' de producao', 'Sem fichas de producao'],
          [publicado, 'Aula publicada para alunos', 'Nao publicado ainda'],
        ].map(([ok,sim,nao],i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:16,flexShrink:0}}>{ok?'✅':'⚪'}</span>
            <span style={{fontSize:12,color:ok?'var(--charcoal)':'rgba(26,23,20,0.4)'}}>{ok?String(sim):String(nao)}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--copper)',textTransform:'uppercase',letterSpacing:'0.04em'}}>Fichas de producao</div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setMostrarAdicionarFicha(!mostrarAdicionarFicha)}>{mostrarAdicionarFicha?'Fechar':'+ Adicionar ficha'}</button>
        </div>
        {fichas.length===0&&<div className="muted">Sem fichas associadas.</div>}
        {fichas.map(f=>(
          <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{width:36,height:36,borderRadius:8,background:'var(--copper-pale)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>📄</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{f.nomePrato}</div>
              <div className="muted">{f.classificacao} · {f.numPorcoes} doses</div>
            </div>
          </div>
        ))}
        {mostrarAdicionarFicha&&(
          <div style={{marginTop:12,padding:12,background:'var(--cream-dark)',borderRadius:10}}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:8}}>Fichas disponiveis</div>
            {fichasDisponiveis.length===0&&<div className="muted">Sem fichas disponiveis.</div>}
            {fichasDisponiveis.map(f=>(
              <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{f.nomePrato}</div><div className="muted">{f.classificacao}</div></div>
                <button className="btn btn-primary btn-sm" onClick={()=>adicionarFicha(f.id)}>Adicionar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {plano.estado==='publicado'&&(
        <div style={{border:'1.5px solid '+(grelhaAberta?'var(--copper)':'var(--border)'),borderRadius:14,overflow:'hidden',marginTop:10}}>
          <div onClick={()=>setGrelhaAberta(!grelhaAberta)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',cursor:'pointer',background:grelhaAberta?'var(--copper-pale)':'#fff'}}>
            <div style={{width:36,height:36,borderRadius:10,background:grelhaAberta?'var(--copper)':'var(--cream-dark)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>📊</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>Grelha de avaliacao</div>
              <div className="muted" style={{fontSize:13}}>Competencias atitudinais durante a aula</div>
            </div>
            <span style={{fontSize:18,color:'var(--copper)'}}>{grelhaAberta?'▲':'▼'}</span>
          </div>
          {grelhaAberta&&(
            <div style={{borderTop:'1px solid var(--border)',padding:'14px 16px',background:'#fff'}}>
              <div style={{padding:'8px 12px',background:'var(--copper-pale)',borderRadius:8,fontSize:12,color:'var(--copper)',marginBottom:12}}>
                Registo do professor sobre as atitudes dos alunos — nao a autoavaliacao.
              </div>
              {alunos.length>0&&(
                <>
                  <div style={{overflowX:'auto',marginBottom:10}}>
                    <table style={{borderCollapse:'collapse',width:'100%',minWidth:400,fontSize:12}}>
                      <thead>
                        <tr style={{background:'var(--charcoal)',color:'var(--cream)'}}>
                          <th style={{padding:'8px 10px',textAlign:'left',fontWeight:500,minWidth:90}}>Aluno</th>
                          {comps.map(c=><th key={c.id} style={{padding:'6px 4px',fontWeight:500,textAlign:'center',fontSize:13,minWidth:60}}>{c.abrev}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {alunos.map((a,ai)=>(
                          <tr key={a.id} style={{background:ai%2===0?'#fff':'var(--cream)'}}>
                            <td style={{padding:'7px 10px',fontWeight:500,borderBottom:'1px solid var(--border)'}}>{a.nome||'Aluno '+a.numero}</td>
                            {comps.map(c=>{
                              const v=notas[a.id]?.[c.id]||null;
                              return(
                                <td key={c.id} style={{padding:'3px 2px',textAlign:'center',borderBottom:'1px solid var(--border)'}}>
                                  <div style={{display:'flex',gap:2,justifyContent:'center'}}>
                                    {(['S','A','R'] as Nota[]).map(bv=>(
                                      <button key={String(bv)} onClick={()=>setNotas(p=>({...p,[a.id]:{...p[a.id],[c.id]:p[a.id][c.id]===bv?null:bv}}))} className="btn" style={{width:22,height:22,padding:0,fontSize:12,fontWeight:700,background:v===bv?COR[bv!].bg:'transparent',color:v===bv?COR[bv!].color:'rgba(31,27,22,0.2)',border:'1px solid '+(v===bv?COR[bv!].border:'var(--border)'),borderRadius:5}}>{bv}</button>
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
                  <button className="btn btn-primary btn-block" style={{background:'var(--charcoal)',marginBottom:12}} onClick={()=>alert('Guardado!')}>Guardar avaliacoes</button>
                  <div style={{padding:'12px 14px',background:'rgba(90,122,78,0.08)',borderRadius:10,border:'1px solid rgba(90,122,78,0.2)'}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--sage)',marginBottom:6}}>+ Competencia extra de observacao</div>
                    <div style={{fontSize:13,color:'rgba(26,23,20,0.5)',marginBottom:8}}>Nao entra na avaliacao formal.</div>
                    {!compExtraAtiva?(
                      <div style={{display:'flex',gap:6}}>
                        <input className="input" value={compExtra} onChange={e=>setCompExtra(e.target.value)} placeholder="ex: Cooperacao, Iniciativa..." style={{flex:1,fontSize:12}}/>
                        <button className="btn btn-ghost" onClick={()=>{if(compExtra.trim()){setCompExtraAtiva(compExtra.trim());setNotasExtra({});}}}>Activar</button>
                      </div>
                    ):(
                      <div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                          <div style={{fontWeight:600,fontSize:13,color:'var(--sage)'}}>{compExtraAtiva}</div>
                          <button onClick={()=>{setCompExtraAtiva(null);setCompExtra('');}} style={{fontSize:13,color:'rgba(26,23,20,0.4)',background:'none',border:'none',cursor:'pointer'}}>Remover</button>
                        </div>
                        <table style={{borderCollapse:'collapse',width:'100%',fontSize:12}}>
                          <thead><tr style={{background:'var(--sage)',color:'white'}}><th style={{padding:'6px 10px',textAlign:'left'}}>Aluno</th><th style={{padding:'6px 4px',textAlign:'center'}}>S</th><th style={{padding:'6px 4px',textAlign:'center'}}>A</th><th style={{padding:'6px 4px',textAlign:'center'}}>R</th></tr></thead>
                          <tbody>
                            {alunos.map((a,ai)=>{
                              const v=notasExtra[a.id]||null;
                              return(
                                <tr key={a.id} style={{background:ai%2===0?'#fff':'var(--cream)'}}>
                                  <td style={{padding:'7px 10px'}}>{a.nome||'Aluno '+a.numero}</td>
                                  {(['S','A','R'] as Nota[]).map(bv=>(
                                    <td key={String(bv)} style={{textAlign:'center',padding:'3px 2px'}}>
                                      <button onClick={()=>setNotasExtra(p=>({...p,[a.id]:p[a.id]===bv?null:bv}))} style={{width:22,height:22,padding:0,fontSize:12,fontWeight:700,background:v===bv?COR[bv!].bg:'transparent',color:v===bv?COR[bv!].color:'rgba(31,27,22,0.2)',border:'1px solid '+(v===bv?COR[bv!].border:'var(--border)'),borderRadius:5,cursor:'pointer'}}>{bv}</button>
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
