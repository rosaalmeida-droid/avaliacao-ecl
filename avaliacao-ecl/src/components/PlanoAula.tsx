import React, { useState } from 'react';
import {
  getPlanosAulaPorTurma,
  addOrUpdatePlanoAula,
  arquivarPlanoAula,
  desarquivarPlanoAula,
  eliminarPlanoAulaDefinitivamente,
  proximoNumeroPlano,
  gerarCodigoPlano,
  getPlanosArquivados,
  getFichasProducao,
  getAlunos, publicarNoClassroom } from '../backend';
import { fmtDataCurta, fmtData } from '../datas';
import { modulosDaTurma } from '../cronograma';
import { PlanoAula as TPlanoAula } from '../types';
import { Card } from './ui';
import ProfessorView from './ProfessorView';
import { ModalPauta } from './ModalPauta';

const TIPOS_ATIVIDADE = [
  'Aula prática','Almoço pedagógico','Jantar pedagógico','Brunch',
  'Pequeno-almoço','Coffee break','Serviço real à carta','Catering',
  'Buffet','Evento externo','Outro',
];

// COMP_PERM e COMP_OPC removidos — sistema de avaliação antigo substituído por OBR/SUB/APP/KNW/ATI

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

function parsearDataPlano(dataStr?: string): Date {
  try {
    if (!dataStr || dataStr === 'undefined') throw new Error();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
      return new Date(dataStr + 'T12:00:00');
    }
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) throw new Error();
    return d;
  } catch {
    return new Date();
  }
}

function limparHora(h?: string): string {
  if (!h) return '';
  return h.includes('T')
    ? new Date(h).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : h.substring(0, 5);
}

// ── ALTERAÇÃO 1: Helper para ler eventos do EventosWizard ─────────────────
function getEventosDaTurma(turmaId: string) {
  try {
    const todos = JSON.parse(localStorage.getItem('ecl_eventos_v3') || '[]');
    return todos.filter((e: any) => e.turmaId === turmaId);
  } catch { return []; }
}

// ── Calendário mensal ─────────────────────────────────────────────────────
function CalendarioMensal({ planos, onAbrirPlano, onPlanoEliminado }: { planos: TPlanoAula[]; onAbrirPlano: (p: TPlanoAula) => void; onPlanoEliminado?: () => void }) {
  const hoje = new Date();
  const [modoVista, setModoVista] = useState<'semana' | 'mes' | '2meses'>('mes');
  const [dataReferencia, setDataReferencia] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(hoje);
  const [modoSelecaoCal, setModoSelecaoCal] = useState(false);
  const [planosSelecionadosCal, setPlanosSelecionadosCal] = useState<Set<string>>(new Set());

  const planosPorDia = new Map<string, TPlanoAula[]>();
  planos.forEach(p => {
    const d = parsearDataPlano(p.data);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!planosPorDia.has(chave)) planosPorDia.set(chave, []);
    planosPorDia.get(chave)!.push(p);
  });

  function chaveDia(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function ehMesmoDia(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function navegar(direcao: 1 | -1) {
    const nova = new Date(dataReferencia);
    if (modoVista === 'semana') nova.setDate(nova.getDate() + direcao * 7);
    else if (modoVista === 'mes') nova.setMonth(nova.getMonth() + direcao);
    else nova.setMonth(nova.getMonth() + direcao * 2);
    setDataReferencia(nova);
  }

  function irParaHoje() {
    setDataReferencia(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
    setDiaSelecionado(hoje);
  }

  const diasSemana = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

  function gerarMes(ano: number, mes: number) {
    const primeiroDiaSemana = (new Date(ano, mes, 1).getDay() + 6) % 7;
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const celulas: (Date | null)[] = [];
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
    for (let d = 1; d <= diasNoMes; d++) celulas.push(new Date(ano, mes, d));
    return celulas;
  }

  function gerarSemana(ref: Date) {
    const diaSemana = (ref.getDay() + 6) % 7;
    const inicio = new Date(ref);
    inicio.setDate(ref.getDate() - diaSemana);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }

  function CelulaDia({ data }: { data: Date | null }) {
    if (!data) return <div />;
    const chave = chaveDia(data);
    const planosNesteDia = planosPorDia.get(chave) || [];
    const ehHoje = ehMesmoDia(data, hoje);
    const selecionado = diaSelecionado && ehMesmoDia(data, diaSelecionado);
    return (
      <button onClick={() => setDiaSelecionado(selecionado ? null : data)}
        style={{
          aspectRatio: '1', maxHeight: 34, borderRadius: 6, border: ehHoje ? '1.5px solid var(--copper)' : '1px solid var(--border)',
          background: selecionado ? 'var(--copper)' : (planosNesteDia.length > 0 ? 'var(--copper-pale)' : '#fff'),
          color: selecionado ? 'white' : (ehHoje ? 'var(--copper)' : 'var(--charcoal)'),
          cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 1, position: 'relative', fontSize: 11,
        }}>
        <span style={{ fontSize: 11, fontWeight: ehHoje || selecionado ? 700 : 500 }}>{data.getDate()}</span>
        {planosNesteDia.length > 0 && (
          <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
            {planosNesteDia.slice(0, 3).map((_, idx) => (
              <div key={idx} style={{ width: 3, height: 3, borderRadius: '50%', background: selecionado ? 'white' : 'var(--copper)' }} />
            ))}
          </div>
        )}
      </button>
    );
  }

  function GrelhaMes({ ano, mes, mostrarTitulo }: { ano: number; mes: number; mostrarTitulo?: boolean }) {
    const celulas = gerarMes(ano, mes);
    const nomeMes = new Date(ano, mes, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        {mostrarTitulo && (
          <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 6, textTransform: 'capitalize', color: 'rgba(26,23,20,0.6)' }}>{nomeMes}</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 3 }}>
          {diasSemana.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, color: 'rgba(26,23,20,0.4)' }}>{d[0]}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {celulas.map((dia, i) => <CelulaDia key={i} data={dia} />)}
        </div>
      </div>
    );
  }

  const ano = dataReferencia.getFullYear();
  const mes = dataReferencia.getMonth();
  const tituloAtual = modoVista === 'semana'
    ? `Semana de ${gerarSemana(dataReferencia)[0].toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`
    : modoVista === 'mes'
    ? dataReferencia.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    : `${dataReferencia.toLocaleDateString('pt-PT', { month: 'short' })} – ${new Date(ano, mes + 1, 1).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}`;

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {(['semana', 'mes', '2meses'] as const).map(m => (
          <button key={m} onClick={() => setModoVista(m)}
            style={{ flex: 1, padding: '5px 6px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: modoVista === m ? 'none' : '1px solid var(--border)',
              background: modoVista === m ? 'var(--copper)' : '#fff',
              color: modoVista === m ? 'white' : 'rgba(26,23,20,0.6)' }}>
            {m === 'semana' ? 'Semana' : m === 'mes' ? 'Mês' : '2 Meses'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={() => navegar(-1)}
          style={{ background: 'var(--cream-dark)', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 13 }}>‹</button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{tituloAtual}</div>
        <button onClick={() => navegar(1)}
          style={{ background: 'var(--cream-dark)', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 13 }}>›</button>
      </div>
      <button onClick={irParaHoje}
        style={{ width: '100%', marginBottom: 10, padding: '5px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', fontSize: 11, color: 'var(--copper)', fontWeight: 600, cursor: 'pointer' }}>
        Hoje
      </button>

      {modoVista === 'semana' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
            {diasSemana.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(26,23,20,0.4)' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 14 }}>
            {gerarSemana(dataReferencia).map((d, i) => <CelulaDia key={i} data={d} />)}
          </div>
        </div>
      )}
      {modoVista === 'mes' && (
        <div style={{ marginBottom: 14 }}>
          <GrelhaMes ano={ano} mes={mes} />
        </div>
      )}
      {modoVista === '2meses' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <GrelhaMes ano={ano} mes={mes} mostrarTitulo />
          <GrelhaMes ano={mes === 11 ? ano + 1 : ano} mes={(mes + 1) % 12} mostrarTitulo />
        </div>
      )}

      {diaSelecionado !== null && (() => {
        const chave = chaveDia(diaSelecionado);
        const planosDoDia = planosPorDia.get(chave) || [];
        const nomeDia = diaSelecionado.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {nomeDia}
              </div>
              {planosDoDia.length > 0 && (
                <button onClick={() => { setModoSelecaoCal(!modoSelecaoCal); setPlanosSelecionadosCal(new Set()); }}
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--copper)', background: 'none', border: '1px solid var(--copper)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                  {modoSelecaoCal ? '✕ Cancelar' : '☑ Selecionar'}
                </button>
              )}
            </div>
            {modoSelecaoCal && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--danger-pale)', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, flex: 1 }}>
                  {planosSelecionadosCal.size} selecionado(s)
                </span>
                <button onClick={() => {
                  if (planosSelecionadosCal.size === 0) return;
                  if (confirm(`Eliminar DEFINITIVAMENTE ${planosSelecionadosCal.size} plano(s)?`)) {
                    planosSelecionadosCal.forEach(id => eliminarPlanoAulaDefinitivamente(id));
                    setPlanosSelecionadosCal(new Set());
                    setModoSelecaoCal(false);
                    onPlanoEliminado?.();
                  }
                }} disabled={planosSelecionadosCal.size === 0}
                  style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'var(--danger)', color: 'white', fontWeight: 700, fontSize: 11, cursor: planosSelecionadosCal.size === 0 ? 'default' : 'pointer', opacity: planosSelecionadosCal.size === 0 ? 0.4 : 1 }}>
                  🗑️ Eliminar
                </button>
              </div>
            )}
            {planosDoDia.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)', fontSize: 13 }}>
                Sem aulas planeadas neste dia.
              </div>
            )}
            {planosDoDia.map(p => {
              const horaI = limparHora(p.horaInicio);
              const horaF = limparHora(p.horaFim);
              return (
                <div key={p.id} className="option-card" onClick={() => {
                  if (modoSelecaoCal) {
                    setPlanosSelecionadosCal(prev => {
                      const novo = new Set(prev);
                      if (novo.has(p.id)) novo.delete(p.id); else novo.add(p.id);
                      return novo;
                    });
                    return;
                  }
                  onAbrirPlano(p);
                }} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {modoSelecaoCal && (
                      <div style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid var(--copper)', background: planosSelecionadosCal.has(p.id) ? 'var(--copper)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: 'white' }}>
                        {planosSelecionadosCal.has(p.id) && '✓'}
                      </div>
                    )}
                    <div style={{ background: 'var(--copper)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', minWidth: 50 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{horaI || '--:--'}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.titulo || 'Plano de aula'}</div>
                      {p.ucId && <div style={{ fontSize: 12, color: 'var(--copper)', fontWeight: 600 }}>{p.ucId}{p.numeroPlan ? ' · Plano ' + p.numeroPlan : ''}{p.ucNome ? ' — ' + p.ucNome : ''}</div>}
                      <div className="muted" style={{ fontSize: 12 }}>{p.data ? fmtDataCurta(p.data) + ' · ' : ''}{horaI && horaF ? `${horaI}-${horaF}` : ''} {p.turmaId ? '· ' + p.turmaId : ''}</div>
                    </div>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                      background: p.estado === 'publicado' ? 'rgba(90,122,78,0.15)' : 'rgba(181,101,29,0.12)',
                      color: p.estado === 'publicado' ? 'var(--sage)' : 'var(--copper)' }}>
                      {p.estado === 'publicado' ? 'Publicado' : 'Rascunho'}
                    </span>
                    {!modoSelecaoCal && (
                      <button onClick={(e) => {
                        e.stopPropagation();
                        const escolha = window.prompt(
                          `O que queres fazer com "${p.titulo || 'este plano'}"?\n\n` +
                          `Escreve 1 para ARQUIVAR\nEscreve 2 para ELIMINAR DEFINITIVAMENTE\n\nOu cancela.`
                        );
                        if (escolha === '1') { arquivarPlanoAula(p.id); onPlanoEliminado?.(); }
                        else if (escolha === '2') {
                          if (confirm(`Eliminar DEFINITIVAMENTE "${p.titulo || 'este plano'}"?`)) {
                            eliminarPlanoAulaDefinitivamente(p.id); onPlanoEliminado?.();
                          }
                        }
                      }} style={{ background: 'none', border: 'none', color: 'rgba(26,23,20,0.3)', fontSize: 16, cursor: 'pointer', padding: '4px 6px', flexShrink: 0 }}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

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
      <input className="input" value={pesquisa} onChange={e=>setPesquisa(e.target.value)}
        placeholder="Pesquisar fichas por nome ou tipo..." style={{marginBottom:8}} />
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

export default function PlanoAula({ turmaId, nomeProfessor, onAlteracao, onGuardado, planoIdInicial, onPlanoIdInicialUsado }: {
  turmaId: string; nomeProfessor?: string;
  onAlteracao?: (guardar?: () => void) => void;
  onGuardado?: (plano?: TPlanoAula) => void;
  planoIdInicial?: string;
  onPlanoIdInicialUsado?: () => void;
}) {
  const [vista, setVista] = useState<'lista'|'criar'|'detalhe'|'calendario'|'arquivo'>('calendario');
  const [planoAtivo, setPlanoAtivo] = useState<TPlanoAula|null>(null);

  React.useEffect(() => {
    if (!planoIdInicial) return;
    const todos = getPlanosAulaPorTurma(turmaId, true);
    const plano = todos.find(p => p.id === planoIdInicial);
    if (plano) { setPlanoAtivo(plano); setVista('detalhe'); }
    else console.warn('PlanoAula: planoIdInicial não encontrado:', planoIdInicial);
    onPlanoIdInicialUsado?.();
  }, [planoIdInicial]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [modoSelecaoPlanos, setModoSelecaoPlanos] = useState(false);
  const [mostrarModalPauta, setMostrarModalPauta] = useState(false);
  const [planosSelecionadosIds, setPlanosSelecionadosIds] = useState<Set<string>>(new Set());
  const planos = getPlanosAulaPorTurma(turmaId);

  if (vista==='criar') return <CriarPlano turmaId={turmaId} nomeProfessor={nomeProfessor} onConcluido={p => { onGuardado?.(p); }} onVoltar={()=>setVista('lista')} onAlteracao={onAlteracao} onGuardado={onGuardado} />;

  // DetalhePlano unificado — usar VistaDePlano via onGuardado
  if (vista==='detalhe' && planoAtivo) { onGuardado?.(planoAtivo); return null; }

  if (vista==='calendario') return (
    <div>
      <div className="header-bar">
        <h2 className="display" style={{ margin:0 }}>Planos de Aula</h2>
        <button className="btn btn-primary" onClick={()=>setVista('criar')} style={{ background: 'var(--copper)', fontWeight: 700, fontSize: 14, padding: '10px 18px' }}>📋 + Novo Plano de Aula</button>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        <button onClick={()=>setVista('calendario')} className="tab-btn active" style={{ flex:1 }}>📅 Calendário</button>
        <button onClick={()=>setVista('lista')} className="tab-btn" style={{ flex:1 }}>📋 Lista</button>
        <button onClick={()=>setVista('arquivo')} className="tab-btn" style={{ flex:1 }}>🗄️ Arquivo</button>
      </div>
      <div style={{ maxWidth: 420 }}>
        <CalendarioMensal planos={planos} onAbrirPlano={p => onGuardado?.(p)} onPlanoEliminado={() => setRefreshKey(k => k + 1)} key={refreshKey} />
      </div>
    </div>
  );

  if (vista==='arquivo') {
    const arquivados = getPlanosArquivados(turmaId);
    return (
      <div>
        <div className="header-bar">
          <h2 className="display" style={{ margin:0 }}>Arquivo</h2>
          <button className="btn btn-primary" onClick={()=>setVista('criar')} style={{ background: 'var(--copper)', fontWeight: 700, fontSize: 14, padding: '10px 18px' }}>📋 + Novo Plano de Aula</button>
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          <button onClick={()=>setVista('calendario')} className="tab-btn" style={{ flex:1 }}>📅 Calendário</button>
          <button onClick={()=>setVista('lista')} className="tab-btn" style={{ flex:1 }}>📋 Lista</button>
          <button onClick={()=>setVista('arquivo')} className="tab-btn active" style={{ flex:1 }}>🗄️ Arquivo</button>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginBottom: 14 }}>
          Planos arquivados não aparecem no calendário nem na lista. Podes sempre trazê-los de volta.
        </div>
        {arquivados.length === 0 && <div style={{ padding: '30px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>O arquivo está vazio.</div>}
        {arquivados.map(p => {
          const horaI = limparHora(p.horaInicio);
          const horaF = limparHora(p.horaFim);
          return (
            <div key={p.id} className="option-card" style={{ marginBottom: 8, opacity: 0.75 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.titulo || 'Plano de aula'}</div>
                  {p.ucId && <div style={{ fontSize: 12, color: 'var(--copper)', fontWeight: 600 }}>{p.ucId}{p.numeroPlan ? ' · Plano ' + p.numeroPlan : ''}{p.ucNome ? ' — ' + p.ucNome : ''}</div>}
                  <div className="muted" style={{ fontSize: 12 }}>{p.data} · {horaI && horaF ? `${horaI}-${horaF}` : ''} · {p.turmaId}</div>
                </div>
                <button onClick={() => { desarquivarPlanoAula(p.id); setRefreshKey(k => k + 1); }} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--sage)', background: '#fff', color: 'var(--sage)', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>↩️ Restaurar</button>
                <button onClick={() => { if (confirm(`Eliminar DEFINITIVAMENTE "${p.titulo || 'este plano'}"?`)) { eliminarPlanoAulaDefinitivamente(p.id); setRefreshKey(k => k + 1); } }} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--danger)', background: '#fff', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>🗑️ Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--copper-pale)', borderRadius: 16, padding: 16 }}>
      <div style={{ background: 'var(--copper)', borderRadius: 14, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 className="display" style={{ margin:0, color: 'white' }}>Planos de Aula</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMostrarModalPauta(true)}
            style={{ padding: '8px 14px', borderRadius: 9, border: 'none',
              background: 'rgba(255,255,255,0.2)', color: 'white',
              fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📊 Gerar Pauta
          </button>
          {vista === 'lista' && (
            <button className="btn btn-ghost" onClick={() => { setModoSelecaoPlanos(!modoSelecaoPlanos); setPlanosSelecionadosIds(new Set()); }}
              style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)', color: 'white' }}>
              {modoSelecaoPlanos ? '✕ Cancelar' : '☑ Selecionar'}
            </button>
          )}
          <button className="btn btn-primary" onClick={()=>setVista('criar')} style={{ background: 'white', color: 'var(--copper)', fontWeight: 700, fontSize: 14, padding: '10px 18px' }}>📋 + Novo Plano de Aula</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        <button onClick={()=>setVista('calendario')} className="tab-btn" style={{ flex:1 }}>📅 Calendário</button>
        <button onClick={()=>setVista('lista')} className="tab-btn active" style={{ flex:1 }}>📋 Lista</button>
        <button onClick={()=>setVista('arquivo')} className="tab-btn" style={{ flex:1 }}>🗄️ Arquivo</button>
      </div>
      {modoSelecaoPlanos && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--danger-pale)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, flex: 1 }}>{planosSelecionadosIds.size} plano(s) selecionado(s)</span>
          <button onClick={() => {
            if (planosSelecionadosIds.size === 0) return;
            if (confirm(`Eliminar DEFINITIVAMENTE ${planosSelecionadosIds.size} plano(s)?`)) {
              planosSelecionadosIds.forEach(id => eliminarPlanoAulaDefinitivamente(id));
              setPlanosSelecionadosIds(new Set()); setModoSelecaoPlanos(false); setRefreshKey(k => k + 1);
            }
          }} disabled={planosSelecionadosIds.size === 0}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--danger)', color: 'white', fontWeight: 700, fontSize: 12, cursor: planosSelecionadosIds.size === 0 ? 'default' : 'pointer', opacity: planosSelecionadosIds.size === 0 ? 0.4 : 1 }}>
            🗑️ Eliminar Selecionados
          </button>
        </div>
      )}
      {planos.length===0 && (
        <div className="card" style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
          <div className="display" style={{ fontSize:18, marginBottom:6 }}>Ainda não há planos</div>
          <p className="muted">Cria o primeiro plano de aula para começar.</p>
        </div>
      )}
      {planos.map(p=>{
        let d: Date;
        try {
          if (!p.data || p.data === 'undefined') throw new Error();
          if (/^\d{4}-\d{2}-\d{2}$/.test(p.data)) d = new Date(p.data + 'T12:00:00');
          else if (p.data.includes('T')) d = new Date(p.data);
          else d = new Date(p.data);
          if (isNaN(d.getTime())) throw new Error();
        } catch { d = new Date(); }
        const horaI = (p.horaInicio||'').includes('T') ? new Date(p.horaInicio).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}) : (p.horaInicio||'').substring(0,5);
        const horaF = (p.horaFim||'').includes('T') ? new Date(p.horaFim).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}) : (p.horaFim||'').substring(0,5);

        return (
          <div key={p.id} className="option-card" onClick={() => {
            if (modoSelecaoPlanos) { setPlanosSelecionadosIds(prev => { const novo = new Set(prev); if (novo.has(p.id)) novo.delete(p.id); else novo.add(p.id); return novo; }); return; }
            onGuardado?.(p);
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              {modoSelecaoPlanos && (
                <div style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid var(--copper)', background: planosSelecionadosIds.has(p.id) ? 'var(--copper)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: 'white' }}>
                  {planosSelecionadosIds.has(p.id) && '✓'}
                </div>
              )}
              <div style={{ background:'var(--copper)', borderRadius:10, padding:'8px 10px', textAlign:'center', flexShrink:0, minWidth:48 }}>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:22, fontWeight:700, color:'white', lineHeight:1 }}>{d.getDate().toString().padStart(2,'0')}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)', textTransform:'uppercase' }}>{d.toLocaleDateString('pt-PT',{month:'short'})}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>{d.getFullYear()}</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{p.titulo || 'Plano de aula'}</div>
                {p.ucId && (
                  <div style={{ fontSize:12, color:'var(--copper)', fontWeight:600, marginBottom:2, lineHeight:1.4 }}>
                    {p.ucId}{p.numeroPlan ? ` · Plano ${p.numeroPlan}` : ''}
                    {p.ucNome && <div style={{ fontSize:12, color:'var(--copper)', fontWeight:500, opacity:0.85 }}>{p.ucNome}</div>}
                  </div>
                )}
                <div className="muted" style={{ fontSize:13 }}>
                  {p.data ? fmtDataCurta(p.data) + ' · ' : ''}{horaI && horaF ? horaI+'-'+horaF+' ' : ''}{p.turmaId}{(p.fichasIds?.length||0) > 0 ? ' - '+p.fichasIds.length+' ficha'+(p.fichasIds.length!==1?'s':'') : ''}
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
    tipoPlanAula: 'pratico' as 'pratico' | 'teorico' | 'misto',
  });

  function setD(k: string, v: string) { setDados(p => ({ ...p, [k]: v })); onAlteracao?.(); }

  function guardar() {
    const now = new Date().toISOString();
    const modulos = modulosDaTurma(turmaId);
    const ucSel = modulos.find(m => m.id === dados.ucId) || UCS_COZINHA.find(u => u.id === dados.ucId);
    const numeroPlan = proximoNumeroPlano();
    const codigoPlano = gerarCodigoPlano(turmaId, dados.ucId, numeroPlan);
    const titulo = dados.titulo || `${codigoPlano} — ${dados.tipoAtividade}`;
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
    // Guardar tipoPlanAula no plano
    (p as any).tipoPlanAula = dados.tipoPlanAula;
    addOrUpdatePlanoAula(p);
    onGuardado?.();
    if (window.confirm('📚 Publicar este plano de aula no Google Classroom?')) {
      publicarNoClassroom('plano', turmaId, {
        titulo: p.titulo, data: p.data, horaInicio: p.horaInicio, horaFim: p.horaFim,
        ucId: p.ucId, ucNome: p.ucNome, pratos: [], observacoes: (p as any).observacoes || '',
      }).then(res => { if (res.ok) alert('✅ Plano publicado no Classroom!'); else console.warn('Classroom:', res.erro); });
    }
    onConcluido(p);
  }

  const podeGuardar = !!dados.data && !!dados.ucId;

  return (
    <div>
      <div style={{ background: 'var(--charcoal)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
        <button onClick={onVoltar} style={{ background: 'rgba(247,241,230,0.1)', border: '1px solid rgba(247,241,230,0.2)', borderRadius: 8, padding: '5px 12px', color: 'rgba(247,241,230,0.7)', fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>← Voltar</button>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: 'var(--cream)' }}>Novo Plano de Aula</div>
        <div style={{ fontSize: 13, color: 'rgba(247,241,230,0.5)', marginTop: 3 }}>ECL · {turmaId}</div>
      </div>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div className="field">
            <label className="field-label" style={{ fontSize: 14, fontWeight: 700, color: 'var(--copper)' }}>Data <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="date" className="input" value={dados.data} onChange={e => setD('data', e.target.value)} style={{ border: !dados.data ? '2px solid var(--danger)' : undefined, fontSize: 14 }} />
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
        <div className="field" style={{ marginBottom: 16 }}>
          <label className="field-label" style={{ fontSize: 14, fontWeight: 700, color: 'var(--copper)', marginBottom: 6, display: 'block' }}>
            {modulosDaTurma(turmaId).some(m => m.tipo === 'UFCD') ? 'UFCD' : 'Unidade de Competência'} <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          {(() => {
            // Módulos do cronograma para esta turma — UC ou UFCD conforme o referencial
            const modulos = modulosDaTurma(turmaId);
            const isUFCD = modulos.some(m => m.tipo === 'UFCD');
            const label = isUFCD ? 'UFCD' : 'UC';
            const selNome = modulos.find(m => m.id === dados.ucId)?.nome || UCS_COZINHA.find(u => u.id === dados.ucId)?.nome || '';
            return (<>
              <select className="input" value={dados.ucId} onChange={e => setD('ucId', e.target.value)} style={{ border: !dados.ucId ? '2px solid var(--danger)' : undefined, fontSize: 14 }}>
                <option value="">— Selecciona a {label} desta aula —</option>
                {modulos.length > 0
                  ? modulos.map(m => <option key={m.id} value={m.id}>{m.id} — {m.nome}</option>)
                  : UCS_COZINHA.map(u => <option key={u.id} value={u.id}>{u.id} — {u.nome}</option>)
                }
              </select>
              {!dados.ucId && <div style={{ fontSize: 13, color: 'var(--danger)', marginTop: 4 }}>Obrigatório — define as competências da aula</div>}
              {dados.ucId && <div style={{ fontSize: 13, color: 'var(--sage)', marginTop: 4, fontWeight: 600 }}>✓ {selNome}</div>}
            </>);
          })()}
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-label" style={{ fontSize: 13, fontWeight: 700 }}>Tipo de aula</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { v: 'pratico',  label: '🔪 Prática',  desc: 'Produção em cozinha' },
              { v: 'misto',    label: '📚+🔪 Mista',  desc: 'Teoria + produção' },
              { v: 'teorico',  label: '📚 Teórica',  desc: 'Só conhecimentos' },
            ] as const).map(opt => (
              <button key={opt.v} type="button" onClick={() => setD('tipoPlanAula', opt.v)}
                style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${dados.tipoPlanAula === opt.v ? 'var(--copper)' : 'var(--border)'}`,
                  background: dados.tipoPlanAula === opt.v ? 'var(--copper-pale)' : '#fff',
                  color: dados.tipoPlanAula === opt.v ? 'var(--copper)' : 'rgba(26,23,20,0.5)',
                  fontSize: 12, fontWeight: dados.tipoPlanAula === opt.v ? 700 : 400, textAlign: 'center' }}>
                <div>{opt.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-label">Tipo de actividade</label>
          <select className="input" value={dados.tipoAtividade} onChange={e => setD('tipoAtividade', e.target.value)}>
            {TIPOS_ATIVIDADE.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label className="field-label">Título (opcional)</label>
          <input className="input" value={dados.titulo} onChange={e => setD('titulo', e.target.value)} placeholder={`Plano — ${dados.tipoAtividade} — ${dados.data}`} />
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)', marginTop: 4 }}>Se não preencheres, o título é gerado automaticamente com número sequencial</div>
        </div>
        <button className="btn btn-primary btn-block" disabled={!podeGuardar} onClick={guardar} style={{ fontSize: 15, padding: '14px', opacity: podeGuardar ? 1 : 0.4 }}>
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
  // ALTERAÇÃO 2: estado para evento seleccionado
  const [eventoSel, setEventoSel] = useState<string>(plano.eventoId || '');
  const temFichas = fichas.length > 0;
  const publicado = plano.estado === 'publicado';

  function adicionarFicha(fichaId: string) {
    addOrUpdatePlanoAula({...plano, fichasIds:[...plano.fichasIds,fichaId], atualizadoEm:new Date().toISOString()});
    setMostrarAdicionarFicha(false);
  }

  type Nota='S'|'A'|'R'|null;
  // Grelha antiga removida — avaliação agora via sistema OBR/SUB/APP/KNW/ATI
  const comps: {id:string;abrev:string}[] = [];
  const [notas,setNotas]=useState<Record<string,Record<string,Nota>>>({});
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

      {/* Estado do plano */}
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

      {/* ALTERAÇÃO 3: card Evento Pedagógico */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--copper)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.04em'}}>🎯 Evento Pedagógico</div>
        {(() => {
          const eventos = getEventosDaTurma(turmaId);
          return (
            <div>
              {plano.eventoId && (
                <div style={{padding:'8px 10px',background:'var(--copper-pale)',borderRadius:8,marginBottom:8,fontSize:13,color:'var(--copper)',fontWeight:600}}>
                  ✅ Associado a: {eventos.find((e: any) => e.id === plano.eventoId)?.nome || 'Evento'}
                </div>
              )}
              {eventos.length === 0 ? (
                <div className="muted">Nenhum evento criado para esta turma ainda.</div>
              ) : (
                <>
                  <select className="input" value={eventoSel} onChange={e => setEventoSel(e.target.value)} style={{fontSize:13,marginBottom:8}}>
                    <option value="">— Sem evento associado —</option>
                    {eventos.map((e: any) => (
                      <option key={e.id} value={e.id}>{e.nome} ({e.dias?.length || 0} dia(s))</option>
                    ))}
                  </select>
                  <button className="btn btn-primary btn-sm"
                    onClick={() => {
                      addOrUpdatePlanoAula({ ...plano, eventoId: eventoSel || undefined, atualizadoEm: new Date().toISOString() });
                      alert(eventoSel ? '✅ Plano associado ao evento!' : '✅ Associação removida.');
                    }}
                    style={{background:'var(--copper)',color:'white'}}>
                    {eventoSel ? 'Guardar associação' : 'Remover associação'}
                  </button>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Fichas de produção */}
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
      {mostrarModalPauta && (
        <ModalPauta
          turmaId={turmaId}
          nomeProfessor={nomeProfessor || 'Professor'}
          onFechar={() => setMostrarModalPauta(false)}
        />
      )}
    </div>
  );
}
