import React, { useState } from 'react';
import { PlanoAula, FichaProducao } from '../types';
import {
  addOrUpdatePlanoAula, getFichasProducao, addOrUpdateFichaProducao,
  getRequisicaoPorPlano, getRequisicoesPorPlano, getAlunos, getPlanosAula, eliminarRequisicaoDefinitivamente, getPresencas, publicarNoClassroom } from '../backend';
import {
  MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS,
  microsPorUC, encontrarAparelho, encontrarSubtecnica,
  nomeCompetencia, aparelhosPermitidos,
} from '../compatECL';
import { getLibrary } from '../libraryService';
import ProfessorView from './ProfessorView';
import Requisicao from './Requisicao';
import { ValidacaoView } from './ValidacaoView';
import { AvisoAvaliacaoAnterior } from './AvisoAvaliacaoAnterior';

type Modulo = 'inicio' | 'ficha' | 'guia' | 'requisicao' | 'validacao' | 'competencias' | 'registos';

interface Props {
  plano: PlanoAula;
  turmaId: string;
  nomeProfessor: string;
  onVoltar: () => void;
  onPlanoActualizado: (p: PlanoAula) => void;
  onAlteracao?: () => void;
  onGuardado?: () => void;
}

// ── NOVO: Associar plano a evento ────────────────────────────
function EventoAssociador({ plano, turmaId, onPlanoActualizado }: {
  plano: PlanoAula; turmaId: string; onPlanoActualizado: (p: PlanoAula) => void;
}) {
  const [eventoSel, setEventoSel] = useState<string>(plano.eventoId || '');

  // Sincronizar quando o plano muda externamente (navegação, recarregar)
  React.useEffect(() => {
    setEventoSel(plano.eventoId || '');
  }, [plano.id, plano.eventoId]);

  let eventos: any[] = [];
  try {
    eventos = JSON.parse(localStorage.getItem('ecl_eventos_v3') || '[]')
      .filter((e: any) => e.turmaId === turmaId);
  } catch {}
  const eventoAssociado = eventos.find((e: any) => e.id === plano.eventoId);
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(26,23,20,0.08)', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        🎯 Evento Pedagógico
      </div>
      {eventoAssociado && (
        <div style={{ padding: '8px 10px', background: 'var(--copper-pale)', borderRadius: 8, marginBottom: 8, fontSize: 13, color: 'var(--copper)', fontWeight: 600 }}>
          ✅ {eventoAssociado.nome} ({eventoAssociado.dias?.length || 0} dia(s))
        </div>
      )}
      {eventos.length === 0 ? (
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.4)' }}>Nenhum evento criado para esta turma ainda.</div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={eventoSel} onChange={e => setEventoSel(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13, background: '#fff' }}>
            <option value="">— Sem evento associado —</option>
            {eventos.map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <button onClick={() => {
            const p = { ...plano, eventoId: eventoSel || undefined, atualizadoEm: new Date().toISOString() };
            addOrUpdatePlanoAula(p as any);
            onPlanoActualizado(p as any);
            alert(eventoSel ? '✅ Associado ao evento!' : '✅ Associação removida.');
          }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}

// ── Cabeçalho do Plano ────────────────────────────────────────
function CabecalhoPlano({ plano, onVoltar, modulo, setModulo }: { plano: PlanoAula; onVoltar: () => void; modulo?: Modulo; setModulo?: (m: Modulo) => void }) {
  let d: Date;
  try {
    if (!plano.data || plano.data === 'undefined') throw new Error();
    d = /^\d{4}-\d{2}-\d{2}$/.test(plano.data)
      ? new Date(plano.data + 'T12:00:00')
      : new Date(plano.data);
    if (isNaN(d.getTime())) throw new Error();
  } catch { d = new Date(); }
  const diaSemana = d.toLocaleDateString('pt-PT', { weekday: 'long' });
  const horaI = (plano.horaInicio || '').includes('T')
    ? new Date(plano.horaInicio).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : (plano.horaInicio || '').substring(0, 5);
  const horaF = (plano.horaFim || '').includes('T')
    ? new Date(plano.horaFim).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : (plano.horaFim || '').substring(0, 5);

  return (
    <div style={{ background: 'var(--charcoal)', borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
      <button onClick={onVoltar} style={{ background: 'rgba(247,241,230,0.6)', border: 'none', borderRadius: 8, padding: '5px 12px', color: 'rgba(247,241,230,0.7)', fontSize: 12, cursor: 'pointer', marginBottom: 12 }}>
        ← Todos os planos
      </button>
      {modulo && setModulo && (
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
          {([
            { id: 'inicio', label: 'Resumo', icone: '📋' },
            { id: 'ficha', label: 'Ficha', icone: '📄' },
            { id: 'guia', label: 'Guia', icone: '📚' },
            { id: 'requisicao', label: 'Requisição', icone: '🛒' },
            { id: 'validacao', label: 'Validação', icone: '✓' },
            { id: 'competencias', label: 'Competências', icone: '🎯' },
            { id: 'registos', label: 'Reabrir', icone: '🔓' },
          ] as { id: Modulo; label: string; icone: string }[]).map(t => (
            <button key={t.id} onClick={() => setModulo(t.id)}
              style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '7px 12px', borderRadius: 8, border: 'none', background: modulo === t.id ? 'var(--copper)' : 'rgba(247,241,230,0.1)', color: modulo === t.id ? 'white' : 'rgba(247,241,230,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {t.icone} {t.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ background: 'var(--copper)', borderRadius: 12, padding: '10px 14px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'white', lineHeight: 1 }}>{d.getDate().toString().padStart(2, '0')}</div>
          <div style={{ fontSize:13, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontWeight: 600 }}>{d.toLocaleDateString('pt-PT', { month: 'short' })}</div>
          <div style={{ fontSize:13, color: 'rgba(255,255,255,0.6)' }}>{d.getFullYear()}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize:13, color: 'rgba(247,241,230,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            {plano.numeroPlan ? `Plano ${plano.numeroPlan} · ` : ''}{diaSemana} · {horaI && horaF ? `${horaI}–${horaF}` : ''} · {String(plano.turmaId ?? '')}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--cream)', lineHeight: 1.2, marginBottom: 6 }}>
            {String(plano.titulo || `Aula de ${plano.ucNome || plano.ucId || 'Cozinha'}`)}
          </div>
          {plano.ucId ? (
            <div style={{ background: 'var(--copper)', borderRadius: 8, padding: '6px 12px', marginTop: 4, display: 'inline-block' }}>
              <div style={{ fontSize:12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Unidade de Competência</div>
              <div style={{ fontSize: 13, color: 'white', fontWeight: 700, marginTop: 1 }}>{String(plano.ucId ?? '')}</div>
              <div style={{ fontSize:13, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>{String(plano.ucNome ?? '')}</div>
            </div>
          ) : (
            <div style={{ background: 'rgba(179,65,58,0.3)', borderRadius: 8, padding: '5px 10px', marginTop: 4, display: 'inline-block' }}>
              <span style={{ fontSize:13, color: 'var(--danger-light)', fontWeight: 600 }}>⚠️ UC não definida</span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize:13, padding: '4px 10px', borderRadius: 20, background: plano.estado === 'publicado' ? 'var(--sage)' : 'rgba(247,241,230,0.6)', color: 'white', fontWeight: 600 }}>
            {plano.estado === 'publicado' ? '✓ Publicado' : plano.estado === 'fichas_pendentes' ? 'Fichas pendentes' : 'Rascunho'}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarraUC({ plano }: { plano: PlanoAula }) {
  if (!plano.ucId) return null;
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--copper)', padding: '6px 16px', marginBottom: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize:12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, flexShrink: 0 }}>UC</div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, color: 'white', fontWeight: 700 }}>{String(plano.ucId ?? '')}</span>
        <span style={{ fontSize:13, color: 'rgba(255,255,255,0.8)', marginLeft: 8 }}>{String(plano.ucNome ?? '')}</span>
      </div>
    </div>
  );
}

function ModuloCard({ icone, titulo, descricao, estado, cor, onClick, desativado }: {
  icone: string; titulo: string; descricao: string;
  estado: 'pendente' | 'em_curso' | 'concluido' | 'bloqueado';
  cor: string; onClick: () => void; desativado?: boolean;
}) {
  const cores = {
    pendente: { bg: '#fff', border: 'var(--border)', icon: 'rgba(26,23,20,0.55)' },
    em_curso: { bg: `${cor}10`, border: cor, icon: cor },
    concluido: { bg: 'var(--sage-pale)', border: 'var(--sage)', icon: 'var(--sage)' },
    bloqueado: { bg: 'var(--cream-dark)', border: 'var(--border)', icon: 'rgba(26,23,20,0.55)' },
  };
  const c = cores[estado];
  return (
    <div onClick={desativado ? undefined : onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${c.border}`, background: c.bg, cursor: desativado ? 'not-allowed' : 'pointer', marginBottom: 10, opacity: estado === 'bloqueado' ? 0.5 : 1, transition: 'all 0.15s' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: estado === 'concluido' ? 'var(--sage)' : `${cor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {estado === 'concluido' ? '✓' : icone}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: estado === 'bloqueado' ? 'rgba(26,23,20,0.4)' : 'var(--charcoal)' }}>{titulo}</div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>{descricao}</div>
      </div>
      {estado !== 'bloqueado' && <span style={{ fontSize: 20, color: estado === 'concluido' ? 'var(--sage)' : cor }}>›</span>}
    </div>
  );
}

function ModalProximoPasso({ titulo, opcoes, onEscolha }: {
  titulo: string;
  opcoes: { label: string; icone: string; valor: string; destaque?: boolean }[];
  onEscolha: (valor: string) => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%' }}>
        <div style={{ fontWeight: 700, fontSize: 17, textAlign: 'center', marginBottom: 16 }}>{titulo}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {opcoes.map(op => (
            <button key={op.valor} onClick={() => onEscolha(op.valor)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${op.destaque ? 'var(--copper)' : 'var(--border)'}`, background: op.destaque ? 'var(--copper-pale)' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: op.destaque ? 700 : 500, color: op.destaque ? 'var(--copper)' : 'var(--charcoal)' }}>
              <span style={{ fontSize: 20 }}>{op.icone}</span>
              {op.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModalRequisicao({ plano, fichas, onSim, onNao }: {
  plano: PlanoAula; fichas: FichaProducao[];
  onSim: (fichasIds: string[]) => void; onNao: () => void;
}) {
  const [sel, setSel] = React.useState<string[]>(fichas.map(f => f.id));
  function toggle(id: string) { setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,23,20,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:24, maxWidth:380, width:'100%' }}>
        <div style={{ fontSize:32, textAlign:'center', marginBottom:8 }}>🛒</div>
        <div style={{ fontWeight:700, fontSize:17, textAlign:'center', marginBottom:6 }}>Guia guardado!</div>
        <div style={{ fontSize:14, color:'rgba(26,23,20,0.6)', textAlign:'center', marginBottom:20 }}>Queres criar agora a Requisição de ingredientes?</div>
        {fichas.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'rgba(26,23,20,0.5)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Fichas a incluir na requisição:</div>
            {fichas.map(f => (
              <div key={f.id} onClick={() => toggle(f.id)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:`1.5px solid ${sel.includes(f.id) ? 'var(--copper)' : 'var(--border)'}`, background: sel.includes(f.id) ? 'var(--copper-pale)' : '#fff', cursor:'pointer', marginBottom:6 }}>
                <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${sel.includes(f.id) ? 'var(--copper)' : 'var(--border)'}`, background: sel.includes(f.id) ? 'var(--copper)' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {sel.includes(f.id) && <span style={{ color:'white', fontSize:12, fontWeight:700 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{f.nomePrato}</div>
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)' }}>{f.numPorcoes} doses · {f.classificacao}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <button onClick={() => onSim(sel)} disabled={sel.length === 0}
            style={{ padding:'14px', borderRadius:12, border:'none', background: sel.length > 0 ? 'var(--copper)' : 'var(--border)', color:'white', fontWeight:700, fontSize:15, cursor: sel.length > 0 ? 'pointer' : 'not-allowed' }}>
            ✓ Sim — criar Requisição {sel.length > 0 ? `(${sel.length} ficha${sel.length > 1 ? 's' : ''})` : ''}
          </button>
          <button onClick={onNao}
            style={{ padding:'12px', borderRadius:12, border:'1px solid var(--border)', background:'#fff', color:'rgba(26,23,20,0.6)', fontWeight:600, fontSize:14, cursor:'pointer' }}>
            Não — voltar ao plano
          </button>
        </div>
      </div>
    </div>
  );
}

function RegistosAlunos({ plano, turmaId }: { plano: PlanoAula; turmaId: string }) {
  const [alunos, setAlunos] = React.useState<{ id: string; nome?: string; numero: number }[]>([]);
  const [reabrirConfirm, setReabrirConfirm] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    setAlunos(getAlunos().filter((a: any) => a.turmaId === turmaId).sort((a: any, b: any) => a.numero - b.numero));
  }, [turmaId]);

  function estaSubmetido(alunoId: string): { submetido: boolean; hora: string } {
    try {
      const v = localStorage.getItem(`avaliacao_submetida_${plano.id}_${alunoId}`);
      if (v) return { submetido: true, hora: new Date(v).toLocaleString('pt-PT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) };
    } catch {}
    return { submetido: false, hora: '' };
  }

  function reabrir(alunoId: string) {
    try { localStorage.removeItem(`avaliacao_submetida_${plano.id}_${alunoId}`); } catch {}
    setReabrirConfirm(null);
    setTick(t => t + 1);
  }

  return (
    <div>
      <div style={{ padding:'10px 14px', background:'rgba(22,160,133,0.08)', borderRadius:10, fontSize:13, color:'#16a085', marginBottom:14, border:'1px solid rgba(22,160,133,0.2)' }}>
        O histórico completo de cada aluno está no Google Sheets. Aqui só destrancas a autoavaliação se um aluno se enganou.
      </div>
      {alunos.length === 0 && <div style={{ textAlign:'center', padding:'30px 0', color:'rgba(26,23,20,0.4)' }}>Nenhum aluno encontrado para esta turma.</div>}
      {alunos.map(a => {
        const { submetido, hora } = estaSubmetido(a.id);
        return (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, border:`1.5px solid ${submetido ? 'rgba(90,122,78,0.3)' : 'var(--border)'}`, background: submetido ? 'var(--sage-pale)' : '#fff', marginBottom:8 }}>
            <div style={{ width:36, height:36, borderRadius:10, background: submetido ? 'var(--sage)' : 'var(--cream-dark)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color: submetido ? 'white' : 'rgba(26,23,20,0.4)', flexShrink:0 }}>{a.numero}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>{a.nome || `Aluno ${a.numero}`}</div>
              <div style={{ fontSize:12, color: submetido ? 'var(--sage)' : 'rgba(26,23,20,0.4)' }}>{submetido ? `✓ Submetido em ${hora}` : 'Ainda não submeteu'}</div>
            </div>
            {submetido && (
              <button onClick={() => setReabrirConfirm(a.id)}
                style={{ fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid var(--copper)', background:'#fff', color:'var(--copper)', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                🔓 Reabrir
              </button>
            )}
          </div>
        );
      })}
      {reabrirConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,23,20,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:24, maxWidth:340, width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔓</div>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Reabrir autoavaliação?</div>
            <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', marginBottom:20 }}>O aluno vai poder preencher novamente as competências desta aula.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={() => reabrir(reabrirConfirm)} style={{ padding:'12px', borderRadius:10, border:'none', background:'var(--copper)', color:'white', fontWeight:700, fontSize:14, cursor:'pointer' }}>✓ Sim, reabrir</button>
              <button onClick={() => setReabrirConfirm(null)} style={{ padding:'10px', borderRadius:10, border:'1px solid var(--border)', background:'#fff', color:'rgba(26,23,20,0.6)', fontSize:13, cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
export function VistaDePlano({ plano, turmaId, nomeProfessor, onVoltar, onPlanoActualizado, onAlteracao, onGuardado }: Props) {
  const [modulo, setModulo] = useState<Modulo>('inicio');
  const [modalProximo, setModalProximo] = useState<string | null>(null);
  const [fichasParaRequisicao, setFichasParaRequisicao] = React.useState<string[]>([]);
  const [tabInicio, setTabInicio] = useState<'orientacao' | 'resumo' | 'competencias'>('orientacao');
  const [compRemovidas, setCompRemovidas] = useState<string[]>(
    Array.isArray((plano as any).compRemovidas) ? (plano as any).compRemovidas : []
  );
  const [compAdicionadas, setCompAdicionadas] = useState<string[]>(
    Array.isArray((plano as any).compAdicionadas) ? (plano as any).compAdicionadas : []
  );
  // Accordion — id da competência expandida (null = todas fechadas)
  const [compAberta, setCompAberta] = useState<string | null>(null);
  function toggleComp(id: string) { setCompAberta(prev => prev === id ? null : id); }

  // Estado do botão de publicar atualização
  const [aPublicarAtualizacao, setAPublicarAtualizacao] = useState(false);
  const [atualizacaoPublicada, setAtualizacaoPublicada] = useState(false);

  const fichasDoPlano = getFichasProducao().filter(f => plano.fichasIds.includes(f.id));
  const requisicao = getRequisicaoPorPlano(plano.id);
  const todasRequisicoesDoPlano = getRequisicoesPorPlano(plano.id);
  const [modoSelecaoReq, setModoSelecaoReq] = useState(false);
  const [reqSelecionadasIds, setReqSelecionadasIds] = useState<Set<string>>(new Set());
  const temFichas = fichasDoPlano.length > 0;
  const temRequisicao = !!requisicao;
  const publicado = plano.estado === 'publicado';
  // ── Competências ────────────────────────────────────────────
  const compObrigatorias = OBRIGATORIAS;
  const IDS_JA_USADOS = new Set<string>(compObrigatorias.map(o => o.id));

  const IDS_ATITUDES_DUPLICAM = new Set([
    'ATT_03', 'ATT_16', 'ATT_17',
  ]);

  // Tipo de plano: 'pratico' (tem fichas) | 'teorico' (sem fichas)
  const tipoPlanAula = (plano as any).tipoPlanAula || (temFichas ? 'pratico' : 'teorico');

  // ── SUB-xxx: subtécnicas da ficha (plano prático) ──────────
  const subIdsRaw = fichasDoPlano.flatMap(f => (f.tecnicasSugeridas || []).filter((id: string) => id.startsWith('SUB-')));
  const compSub = [...new Set(subIdsRaw)]
    .filter(id => !compRemovidas.includes(id) && !IDS_JA_USADOS.has(id))
    .slice(0, 6)
    .map(id => {
      const sub = encontrarSubtecnica(id);
      return { id, nome: sub?.nome || id, criterios: [] as any[] };
    });
  compSub.forEach(s => IDS_JA_USADOS.add(s.id));

  // ── APP-xxx: aparelhos da ficha (plano prático) ────────────
  const appIdsRaw = fichasDoPlano.flatMap(f => ((f as any).aparelhosDetectados || []).filter((id: string) => id.startsWith('APP-')));
  const compApp = [...new Set(appIdsRaw)]
    .filter(id => !compRemovidas.includes(id) && !IDS_JA_USADOS.has(id))
    .slice(0, 4)
    .map(id => {
      const app = encontrarAparelho(id);
      return { id, nome: app?.nome || id, nivel: app?.nivel || 1, categoria: app?.categoria || '', criterios: [] as any[] };
    });
  compApp.forEach(a => IDS_JA_USADOS.add(a.id));

  // ── KNW-xxx: conhecimentos da UC (plano teórico ou misto) ──
  // Biblioteca pode ainda não estar carregada — proteger com try/catch
  let lib: ReturnType<typeof getLibrary> | null = null;
  try { lib = getLibrary(); } catch { lib = null; }
  const compConhecimentos = tipoPlanAula !== 'pratico' && plano.ucId && lib
    ? (lib.conhecimentos as any[])
        .filter((k: any) => !compRemovidas.includes(k.id) && !IDS_JA_USADOS.has(k.id))
        .slice(0, 6)
        .map((k: any) => ({ id: k.id, nome: k.nome, definicao: k.definicao, criterios: [] as any[] }))
    : [];
  compConhecimentos.forEach(k => IDS_JA_USADOS.add(k.id));

  // ── Fallback: sistema antigo (microsPorUC) se não há SUB/APP ─
  const usarFallback = compSub.length === 0 && compApp.length === 0 && tipoPlanAula === 'pratico';
  const microsDaUC = usarFallback
    ? (plano.ucId ? microsPorUC(plano.ucId) : MICROCOMPETENCIAS.filter(m => m.prioridade === 'A'))
    : [];
  const IDS_DUPLICAM_OBRIGATORIAS = new Set(['M0150', 'M0196']);
  const textoFichas = fichasDoPlano.map(f =>
    [f.nomePrato, ...(f.ingredientes || []).map((i: any) => i.produto)].join(' ')
  ).join(' ').toLowerCase();
  const compTecnicas = usarFallback ? microsDaUC
    .filter(m => {
      if (IDS_DUPLICAM_OBRIGATORIAS.has(m.id) || IDS_JA_USADOS.has(m.id)) return false;
      if (textoFichas.length > 10) {
        const palavras = m.nome.toLowerCase().split(/[\s\/]+/);
        return palavras.some((p: string) => p.length > 3 && textoFichas.includes(p));
      }
      return true;
    }).slice(0, 8).filter(m => !compRemovidas.includes(m.id)) : [];
  compTecnicas.forEach(m => IDS_JA_USADOS.add(m.id));

  // ── Atitudes ────────────────────────────────────────────────
  const compAtitudes = ATITUDES
    .filter(a => (a.prioridade === 'permanente' || a.prioridade === 'recorrente')
      && !IDS_ATITUDES_DUPLICAM.has(a.id)
      && !IDS_JA_USADOS.has(a.id))
    .slice(0, 4)
    .filter(a => !compRemovidas.includes(a.id));

  // ── Subtécnicas (fallback) ──────────────────────────────────
  const compSubtecnicas: any[] = [];

  const totalComp = compObrigatorias.length + compSub.length + compApp.length
    + compConhecimentos.length + compTecnicas.length + compAtitudes.length + compAdicionadas.length;

  function guardarCompetencias(removidas: string[], adicionadas: string[]) {
    setCompRemovidas(removidas);
    setCompAdicionadas(adicionadas);
    registarAlteracaoPublicado('competencias', 'Competências da aula atualizadas pelo professor');
    const p = { ...plano, compRemovidas: removidas, compAdicionadas: adicionadas, atualizadoEm: new Date().toISOString() } as any;
    addOrUpdatePlanoAula(p);
    onPlanoActualizado(p);
  }

  function estadoModulo(m: string) {
    if (m === 'ficha') return temFichas ? 'concluido' : 'pendente';
    if (m === 'guia') {
      if (!temFichas) return 'bloqueado';
      const temGuia = fichasDoPlano.some(f => (f as any).textoGuia);
      return temGuia ? 'concluido' : 'pendente';
    }
    if (m === 'requisicao') return !temFichas ? 'bloqueado' : temRequisicao ? 'concluido' : 'pendente';
    if (m === 'validacao') return !temFichas ? 'bloqueado' : 'pendente';
    return 'pendente';
  }

  function publicar() {
    const p = { ...plano, estado: 'publicado' as const, atualizadoEm: new Date().toISOString(), ultimaAlteracao: undefined };
    addOrUpdatePlanoAula(p);
    onPlanoActualizado(p);
  }

  /** Regista uma alteração num plano já publicado e propaga ao AlunoView */
  function registarAlteracaoPublicado(tipo: 'ficha' | 'guia' | 'requisicao' | 'competencias' | 'geral', descricao: string) {
    if (plano.estado !== 'publicado') return;
    const p = {
      ...plano,
      atualizadoEm: new Date().toISOString(),
      ultimaAlteracao: { tipo, descricao, em: new Date().toISOString() },
    };
    addOrUpdatePlanoAula(p);
    onPlanoActualizado(p);
  }

  /** Botão "Publicar atualização" — envia para Sheets + Classroom */
  async function publicarAtualizacao() {
    setAPublicarAtualizacao(true);
    const agora = new Date().toISOString();
    // 1. Atualizar o plano com ultimaAlteracao → Sheets (via addOrUpdatePlanoAula)
    const p = {
      ...plano,
      atualizadoEm: agora,
      ultimaAlteracao: {
        tipo: 'geral' as const,
        descricao: 'Plano de aula atualizado pelo professor',
        em: agora,
      },
    };
    addOrUpdatePlanoAula(p);
    onPlanoActualizado(p);

    // 2. Publicar no Classroom com mensagem de atualização
    const fichasActuais = getFichasProducao().filter(f => plano.fichasIds.includes(f.id));
    const requisicao = getRequisicaoPorPlano(plano.id);
    try {
      await publicarNoClassroom('plano', turmaId, {
        plano: p,
        fichas: fichasActuais,
        requisicao,
        isAtualizacao: true,
        mensagemAtualizacao: `⚠️ O professor atualizou o plano de aula "${plano.titulo}". Por favor refresca a app para ver as alterações.`,
      });
    } catch {}

    setAPublicarAtualizacao(false);
    setAtualizacaoPublicada(true);
    setTimeout(() => setAtualizacaoPublicada(false), 4000);
  }

  const [modalClassroom, setModalClassroom] = React.useState<{tipo: string; conteudo: any} | null>(null);
  const [classroomEnviado, setClassroomEnviado] = React.useState(false);

  async function enviarParaClassroom(tipo: string, conteudo: any) {
    const res = await publicarNoClassroom(tipo as any, turmaId, conteudo);
    setClassroomEnviado(res.ok);
    setModalClassroom(null);
  }

  function aposGuardarFicha() {
    registarAlteracaoPublicado('ficha', 'Ficha técnica atualizada pelo professor');
    const planoAtualizado = getPlanosAula().find(p => p.id === plano.id);
    if (planoAtualizado) onPlanoActualizado(planoAtualizado);
    onGuardado?.();
    setModalProximo('apos_ficha');
  }

  if (modalProximo === 'apos_ficha') {
    const fichasActuais = getFichasProducao().filter(f => plano.fichasIds.includes(f.id));
    const ordenadas = [...fichasActuais].sort((a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || ''));
    const ultimaFicha = ordenadas[ordenadas.length - 1];
    const nomePrato = ultimaFicha?.nomePrato || '';
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(26,23,20,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
        <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:360, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📚</div>
          <div style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Ficha guardada!</div>
          {nomePrato && <div style={{ fontSize:14, color:'var(--copper)', fontWeight:600, marginBottom:12 }}>{nomePrato}</div>}
          <div style={{ fontSize:14, color:'rgba(26,23,20,0.6)', marginBottom:24 }}>Queres criar agora o Guia de Apoio à Produção?</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={() => { setModalProximo(null); setModulo('guia'); }}
              style={{ padding:'14px', borderRadius:12, border:'none', background:'var(--sage)', color:'white', fontWeight:700, fontSize:15, cursor:'pointer' }}>
              ✓ Sim — criar o Guia agora
            </button>
            <button onClick={() => { setModalProximo(null); setModulo('inicio'); }}
              style={{ padding:'12px', borderRadius:12, border:'1px solid var(--border)', background:'#fff', color:'rgba(26,23,20,0.6)', fontWeight:600, fontSize:14, cursor:'pointer' }}>
              Não — voltar ao plano
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modulo === 'ficha') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} modulo={modulo} setModulo={setModulo} />
        <BarraUC plano={plano} />
        <div style={{ background: 'var(--copper-pale)', borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: 'var(--copper)', fontWeight: 600 }}>
          📄 A criar Ficha de Produção para este plano — será associada automaticamente
        </div>
        <ProfessorView turmaId={turmaId} nomeProfessor={nomeProfessor} planoId={plano.id} onAlteracao={onAlteracao} onGuardado={aposGuardarFicha} />
        {modalProximo === 'apos_ficha' && (
          <ModalProximoPasso
            titulo="Ficha guardada! Qual é o próximo passo?"
            opcoes={[
              { label: 'Criar Guia de Apoio à Produção', icone: '📚', valor: 'guia', destaque: true },
              { label: 'Criar outra Ficha de Produção', icone: '📄', valor: 'nova_ficha' },
              { label: 'Criar Requisição', icone: '🛒', valor: 'requisicao' },
              { label: 'Voltar ao Plano de Aula', icone: '←', valor: 'inicio' },
            ]}
            onEscolha={v => { setModalProximo(null); if (v === 'guia') setModulo('guia'); else if (v === 'nova_ficha') setModulo('ficha'); else if (v === 'requisicao') setModulo('requisicao'); else setModulo('inicio'); }}
          />
        )}
      </div>
    );
  }

  if (modulo === 'guia') {
    const fichasActuais = getFichasProducao().filter(f => plano.fichasIds.includes(f.id));
    const ordenadas = [...fichasActuais].sort((a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || ''));
    const ultimaFicha = ordenadas[ordenadas.length - 1];
    const nomePratoGuia = ultimaFicha?.nomePrato || '';
    return (
      <div>
        <div className="no-print">
          <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} modulo={modulo} setModulo={setModulo} />
          <BarraUC plano={plano} />
          {nomePratoGuia && (
            <div style={{ background: 'rgba(90,122,78,0.1)', borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontSize: 13, color: 'var(--sage)', fontWeight: 600 }}>
              📚 Guia de Apoio à Produção — <strong>{nomePratoGuia}</strong>
            </div>
          )}
        </div>
        <ProfessorView turmaId={turmaId} nomeProfessor={nomeProfessor} planoId={plano.id} modoGuia={true} nomePratoInicial={nomePratoGuia} onAlteracao={onAlteracao}
          onGuardado={() => { registarAlteracaoPublicado('guia', 'Guia de produção atualizado pelo professor'); onGuardado?.(); setModalProximo('apos_guia'); }} />
        {modalProximo === 'apos_guia' && (
          <ModalRequisicao plano={plano} fichas={fichasActuais}
            onSim={(ids) => { setFichasParaRequisicao(ids); setModalProximo(null); setModulo('requisicao'); }}
            onNao={() => { setModalProximo(null); setModulo('inicio'); }}
          />
        )}
      </div>
    );
  }

  if (modulo === 'requisicao') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} modulo={modulo} setModulo={setModulo} />
        <BarraUC plano={plano} />
        {todasRequisicoesDoPlano.length > 0 && (
          <div style={{ background: 'var(--sage-pale)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: modoSelecaoReq ? 8 : 0 }}>
              <span style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>✓ {todasRequisicoesDoPlano.length} requisição(ões) para este plano</span>
              {todasRequisicoesDoPlano.length > 1 && (
                <button onClick={() => { setModoSelecaoReq(!modoSelecaoReq); setReqSelecionadasIds(new Set()); }}
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--sage)', background: 'none', border: '1px solid var(--sage)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                  {modoSelecaoReq ? '✕ Cancelar' : '☑ Selecionar'}
                </button>
              )}
            </div>
            {modoSelecaoReq && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, flex: 1 }}>{reqSelecionadasIds.size} selecionada(s)</span>
                <button onClick={() => {
                  if (reqSelecionadasIds.size === 0) return;
                  if (confirm(`Eliminar DEFINITIVAMENTE ${reqSelecionadasIds.size} requisição(ões)?`)) {
                    reqSelecionadasIds.forEach(id => eliminarRequisicaoDefinitivamente(id));
                    setReqSelecionadasIds(new Set()); setModoSelecaoReq(false); onPlanoActualizado({ ...plano });
                  }
                }} disabled={reqSelecionadasIds.size === 0}
                  style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'var(--danger)', color: 'white', fontWeight: 700, fontSize: 11, cursor: reqSelecionadasIds.size === 0 ? 'default' : 'pointer', opacity: reqSelecionadasIds.size === 0 ? 0.4 : 1 }}>
                  🗑️ Eliminar
                </button>
              </div>
            )}
            {todasRequisicoesDoPlano.filter(r => r && r.id).map(r => (
              <div key={r.id} onClick={() => { if (!modoSelecaoReq) return; setReqSelecionadasIds(prev => { const novo = new Set(prev); if (novo.has(r.id)) novo.delete(r.id); else novo.add(r.id); return novo; }); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: '#fff', marginBottom: 4, cursor: modoSelecaoReq ? 'pointer' : 'default' }}>
                {modoSelecaoReq && (
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: '2px solid var(--sage)', background: reqSelecionadasIds.has(r.id) ? 'var(--sage)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: 'white' }}>
                    {reqSelecionadasIds.has(r.id) && '✓'}
                  </div>
                )}
                <span style={{ fontSize: 12, flex: 1 }}>
                  {r.criadaEm ? new Date(r.criadaEm).toLocaleDateString('pt-PT') + ' ' + new Date(r.criadaEm).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : r.id}
                  {' · '}{(r?.linhas || []).length} ingredientes
                </span>
                {!modoSelecaoReq && (
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('Eliminar DEFINITIVAMENTE esta requisição?')) { eliminarRequisicaoDefinitivamente(r.id); onPlanoActualizado({ ...plano }); } }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 14, cursor: 'pointer', padding: '2px 6px' }}>🗑️</button>
                )}
              </div>
            ))}
          </div>
        )}
        <Requisicao nomeProfessor={nomeProfessor} planoIdFixo={plano.id} turmaId={turmaId}
          fichasIniciais={fichasParaRequisicao.length ? fichasParaRequisicao : undefined}
          onGuardado={() => { registarAlteracaoPublicado('requisicao', 'Requisição atualizada pelo professor'); setModalProximo('apos_requisicao'); }} />
        {modalProximo === 'apos_requisicao' && (
          <div style={{ position:'fixed', inset:0, background:'rgba(26,23,20,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
            <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:360, width:'100%', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🚀</div>
              <div style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Requisição guardada!</div>
              <div style={{ fontSize:14, color:'rgba(26,23,20,0.6)', marginBottom:24 }}>Quer publicar agora este plano de aula para os alunos?</div>
              <div style={{ background:'var(--cream-dark)', borderRadius:10, padding:'10px 14px', marginBottom:20, fontSize:13, color:'rgba(26,23,20,0.6)', textAlign:'left' }}>
                Os alunos poderão ver as fichas, fazer a autoavaliação e registar a presença.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button onClick={() => { publicar(); setModalProximo(null); setModulo('inicio'); }}
                  style={{ padding:'14px', borderRadius:12, border:'none', background:'var(--sage)', color:'white', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                  ✓ Sim — publicar para os alunos
                </button>
                <button onClick={() => { setModalProximo(null); setModulo('competencias'); }}
                  style={{ padding:'12px', borderRadius:12, border:'1.5px solid var(--copper)', background:'var(--copper-pale)', color:'var(--copper)', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                  🎯 Antes, rever as Competências
                </button>
                <button onClick={() => { setModalProximo(null); setModulo('inicio'); }}
                  style={{ padding:'12px', borderRadius:12, border:'1px solid var(--border)', background:'#fff', color:'rgba(26,23,20,0.6)', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                  Guardar para mais tarde
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (modulo === 'competencias') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} modulo={modulo} setModulo={setModulo} />
        <BarraUC plano={plano} />
        <div style={{ padding:'10px 14px', background:'var(--copper-pale)', borderRadius:10, fontSize:13, color:'var(--copper)', marginBottom:14, border:'1px solid rgba(181,101,29,0.2)' }}>
          <strong>{totalComp} competências</strong> para esta aula. As obrigatórias não podem ser removidas.
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--sage)', marginBottom:8 }}>🔒 Obrigatórias — sempre presentes</div>
          {compObrigatorias.map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'var(--sage-pale)', marginBottom:6, border:'1px solid rgba(90,122,78,0.2)' }}>
              <span>✓</span>
              <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{c.nome}</div>
              <span style={{ fontSize:13, color:'var(--sage)', fontWeight:600 }}>SEMPRE</span>
            </div>
          ))}
        </div>
        {/* ── Subtécnicas da ficha (SUB-xxx) ── */}
        {compSub.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--copper)', marginBottom:8 }}>🔬 Técnicas desta aula</div>
            {compSub.map(m => {
              const removida = compRemovidas.includes(m.id);
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background: removida ? 'var(--cream-dark)' : 'var(--copper-pale)', marginBottom:6, opacity: removida ? 0.5 : 1 }}>
                  <span>{removida ? '○' : '●'}</span>
                  <div style={{ flex:1, fontSize:13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{m.nome}</div>
                  <button onClick={() => guardarCompetencias(removida ? compRemovidas.filter(x => x !== m.id) : [...compRemovidas, m.id], compAdicionadas)}
                    style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Aparelhos da ficha (APP-xxx) ── */}
        {compApp.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#5B67EA', marginBottom:8 }}>🧪 Preparações base</div>
            {compApp.map(m => {
              const removida = compRemovidas.includes(m.id);
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background: removida ? 'var(--cream-dark)' : 'rgba(91,103,234,0.06)', marginBottom:6, opacity: removida ? 0.5 : 1 }}>
                  <span>{removida ? '○' : '●'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{m.nome}</div>
                    <div style={{ fontSize:11, color:'rgba(26,23,20,0.45)' }}>
                      {m.categoria} ·
                      <span style={{ fontWeight:700, marginLeft:4, color: m.nivel===1?'#5a7a4e':m.nivel===2?'#b5651d':'#c0392b' }}>N{m.nivel}</span>
                    </div>
                  </div>
                  <button onClick={() => guardarCompetencias(removida ? compRemovidas.filter(x => x !== m.id) : [...compRemovidas, m.id], compAdicionadas)}
                    style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Conhecimentos da UC (aula teórica/mista) ── */}
        {compConhecimentos.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#0369a1', marginBottom:8 }}>📚 Conhecimentos da UC</div>
            {compConhecimentos.map(k => {
              const removida = compRemovidas.includes(k.id);
              return (
                <div key={k.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background: removida ? 'var(--cream-dark)' : 'rgba(3,105,161,0.06)', marginBottom:6, opacity: removida ? 0.5 : 1 }}>
                  <span>{removida ? '○' : '●'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{k.nome}</div>
                    {k.definicao && <div style={{ fontSize:11, color:'rgba(26,23,20,0.4)', marginTop:2 }}>{k.definicao.slice(0, 80)}{k.definicao.length > 80 ? '…' : ''}</div>}
                  </div>
                  <button onClick={() => guardarCompetencias(removida ? compRemovidas.filter(x => x !== k.id) : [...compRemovidas, k.id], compAdicionadas)}
                    style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Fallback sistema antigo (sem SUB/APP) ── */}
        {compTecnicas.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--copper)', marginBottom:8 }}>🔬 Técnicas — UC {plano.ucId}</div>
            {compTecnicas.map(m => {
              const removida = compRemovidas.includes(m.id);
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background: removida ? 'var(--cream-dark)' : 'var(--copper-pale)', marginBottom:6, opacity: removida ? 0.5 : 1 }}>
                  <span>{removida ? '○' : '●'}</span>
                  <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{m.nome}</div>{m.criterios.length > 0 && <div style={{ fontSize:12, color:'rgba(26,23,20,0.45)' }}>{m.criterios.length} critérios</div>}</div>
                  <button onClick={() => guardarCompetencias(removida ? compRemovidas.filter(x => x !== m.id) : [...compRemovidas, m.id], compAdicionadas)}
                    style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#8e44ad', marginBottom:8 }}>💡 Atitudes</div>
          {ATITUDES.filter(a => (a.prioridade === 'permanente' || a.prioridade === 'recorrente') && !IDS_ATITUDES_DUPLICAM.has(a.id)).slice(0, 5).map(a => {
            const removida = compRemovidas.includes(a.id);
            return (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background: removida ? 'var(--cream-dark)' : 'rgba(142,68,173,0.06)', marginBottom:6, opacity: removida ? 0.5 : 1 }}>
                <span>{removida ? '○' : '●'}</span>
                <div style={{ flex:1, fontSize:13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{a.nome}</div>
                <button onClick={() => guardarCompetencias(removida ? compRemovidas.filter(x => x !== a.id) : [...compRemovidas, a.id], compAdicionadas)}
                  style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
                  {removida ? '+ Incluir' : '− Remover'}
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ padding:'12px 14px', background:'var(--cream-dark)', borderRadius:10, textAlign:'center', marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:16 }}>Total: {totalComp} competências</div>
        </div>
        {!publicado && (
          <button onClick={() => { publicar(); setModulo('inicio'); }}
            style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'var(--sage)', color:'white', fontWeight:700, fontSize:15, cursor:'pointer' }}>
            🚀 Publicar para os alunos
          </button>
        )}
      </div>
    );
  }

  if (modulo === 'registos') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} modulo={modulo} setModulo={setModulo} />
        <BarraUC plano={plano} />
        <RegistosAlunos plano={plano} turmaId={turmaId} />
      </div>
    );
  }

  if (modulo === 'validacao') {
    const alunosDaTurma = getAlunos().filter(a => a.turmaId === turmaId);
    // Obrigatórias aparecem sempre — não faz sentido avisar que já foram avaliadas
    const todasMicros = [
      ...compSub.map(m => m.id),
      ...compApp.map(a => a.id),
      ...compConhecimentos.map(k => k.id),
      ...compTecnicas.map(m => m.id),
      ...compSubtecnicas.map(s => s.id),
      ...compAtitudes.map(a => a.id),
    ];
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} modulo={modulo} setModulo={setModulo} />
        <BarraUC plano={plano} />
        {plano.ucId && alunosDaTurma.length > 0 && todasMicros.length > 0 && (
          <AvisoAvaliacaoAnterior
            plano={plano}
            alunos={alunosDaTurma}
            microIds={todasMicros}
            nomeProfessor={nomeProfessor}
          />
        )}
        <ValidacaoView turmaId={turmaId} planoId={plano.id} />
      </div>
    );
  }

  // ── INÍCIO ───────────────────────────────────────────────────
  return (
    <div>
      <CabecalhoPlano plano={plano} onVoltar={onVoltar} modulo={modulo} setModulo={setModulo} />

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 10, flexWrap: 'wrap' }}>
        <button onClick={() => setTabInicio('orientacao')} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tabInicio === 'orientacao' ? '#0e7490' : 'transparent', color: tabInicio === 'orientacao' ? 'white' : 'rgba(26,23,20,0.5)' }}>🚦 Orientação</button>
        <button onClick={() => setTabInicio('resumo')} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tabInicio === 'resumo' ? 'var(--charcoal)' : 'transparent', color: tabInicio === 'resumo' ? 'white' : 'rgba(26,23,20,0.5)' }}>📋 Resumo</button>
        <button onClick={() => setTabInicio('competencias')} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tabInicio === 'competencias' ? 'var(--charcoal)' : 'transparent', color: tabInicio === 'competencias' ? 'white' : 'rgba(26,23,20,0.5)' }}>🎯 Competências ({totalComp})</button>
      </div>

      {/* TAB ORIENTAÇÃO */}
      {tabInicio === 'orientacao' && (
        <div>
          <div style={{ background: '#E6F1FB', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #B5D4F4', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0C447C', marginBottom: 10 }}>🚦 Antes de começar — verificar</div>
            {[
              { ok: temFichas, label: 'Fichas de produção criadas', acao: () => setModulo('ficha'), acaoLabel: 'Criar ficha →' },
              { ok: fichasDoPlano.some((f: any) => f.textoGuia), label: 'Guião de produção gerado', acao: () => setModulo('guia'), acaoLabel: 'Gerar guião →' },
              { ok: temRequisicao, label: 'Requisição enviada', acao: () => setModulo('requisicao'), acaoLabel: 'Fazer requisição →' },
              { ok: publicado, label: 'Plano publicado para os alunos', acao: null, acaoLabel: '' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, marginBottom: 6, background: item.ok ? '#EAF3DE' : '#fff', border: `1px solid ${item.ok ? '#C0DD97' : 'rgba(14,116,144,0.2)'}` }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.ok ? '✅' : '⭕'}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: item.ok ? 500 : 600, color: item.ok ? '#27500A' : '#0C447C' }}>{item.label}</span>
                {!item.ok && item.acao && (
                  <button onClick={item.acao} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: '#0e7490', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>{item.acaoLabel}</button>
                )}
              </div>
            ))}
          </div>

          {fichasDoPlano.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(26,23,20,0.08)', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>🍽️ Produção desta aula</div>
              {fichasDoPlano.map((f: any, i: number) => (
                <div key={i} style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 6, background: 'rgba(181,101,29,0.05)', border: '1px solid rgba(181,101,29,0.15)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{f.nomePrato}</div>
                  <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)' }}>
                    {f.numPorcoes && `${f.numPorcoes} doses`}
                    {f.alergenicos?.length > 0 && ` · ⚠️ ${Array.isArray(f.alergenicos) ? f.alergenicos.join(', ') : f.alergenicos}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(() => {
            const presencasHoje = getPresencas().filter((r: any) => r.planoAulaId === plano.id || r.data === plano.data?.slice(0,10));
            const alunosDaTurma = getAlunos().filter(a => a.turmaId === plano.turmaId);
            if (alunosDaTurma.length === 0) return null;
            return (
              <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(26,23,20,0.08)', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>👤 Presenças — {presencasHoje.length}/{alunosDaTurma.length} alunos</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {alunosDaTurma.map(a => {
                    const presente = presencasHoje.find((p: any) => p.alunoId === a.id);
                    return (
                      <div key={a.id} style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: presente ? '#f0fdf4' : 'rgba(26,23,20,0.05)', color: presente ? '#15803d' : 'rgba(26,23,20,0.4)', border: `1px solid ${presente ? '#bbf7d0' : 'rgba(26,23,20,0.08)'}` }}>
                        {presente ? '✓ ' : ''}{a.nome || a.id}{presente?.atrasado && <span style={{ color: '#dc2626' }}> ⚠</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div style={{ background: '#0e7490', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>🏭 KitchenFlow ECL</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 1.5 }}>Abre o KitchenFlow para verificar os registos da cozinha antes de começar a aula.</div>
            <button onClick={() => window.open('https://ecl-haccp.vercel.app/', '_blank')}
              style={{ padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              🔗 Abrir KitchenFlow ECL →
            </button>
          </div>

          {/* ── NOVO: Evento Pedagógico ── */}
          <EventoAssociador plano={plano} turmaId={turmaId} onPlanoActualizado={onPlanoActualizado} />

        </div>
      )}

      {/* TAB COMPETÊNCIAS */}
      {tabInicio === 'competencias' && (
        <div>
          <div style={{ padding: '10px 14px', background: 'var(--copper-pale)', borderRadius: 10, fontSize: 12, color: 'var(--copper)', marginBottom: 14, border: '1px solid rgba(181,101,29,0.2)' }}>
            <strong>{totalComp} competências</strong> no total para esta aula.
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sage)', marginBottom: 8 }}>🔒 Obrigatórias — sempre presentes</div>
            {compObrigatorias.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--sage-pale)', marginBottom: 6, border: '1px solid rgba(90,122,78,0.2)' }}>
                <span style={{ fontSize: 14 }}>✓</span>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.nome}</div>
                <span style={{ fontSize:13, color: 'var(--sage)', fontWeight: 600 }}>SEMPRE</span>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--copper)', marginBottom: 8 }}>🔬 Competências desta aula</div>
            {[...compSub, ...compApp, ...compConhecimentos, ...compTecnicas].slice(0, 8).map(m => {
              const removida = compRemovidas.includes(m.id);
              const aberta = compAberta === m.id;
              return (
                <div key={m.id} style={{ borderRadius: 8, background: removida ? 'var(--cream-dark)' : 'var(--copper-pale)', marginBottom: 6, border: `1px solid ${removida ? 'var(--border)' : 'rgba(181,101,29,0.2)'}`, opacity: removida ? 0.5 : 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                    <span style={{ fontSize: 14 }}>{removida ? '○' : '●'}</span>
                    <div style={{ flex: 1, cursor: (m as any).criterios?.length > 0 ? 'pointer' : 'default' }} onClick={() => (m as any).criterios?.length > 0 && toggleComp(m.id)}>
                      <div style={{ fontSize: 13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{m.nome}</div>
                      {(m as any).criterios?.length > 0 && (
                        <div style={{ fontSize: 12, color: 'rgba(181,101,29,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {(m as any).criterios?.length} critérios observáveis <span style={{ fontSize: 10 }}>{aberta ? '▲' : '▼'}</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { const novas = removida ? compRemovidas.filter(x => x !== m.id) : [...compRemovidas, m.id]; guardarCompetencias(novas, compAdicionadas); }}
                      style={{ fontSize:13, padding: '3px 10px', borderRadius: 6, border: `1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.55)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.4)', cursor: 'pointer', fontWeight: 600 }}>
                      {removida ? '+ Incluir' : '− Remover'}
                    </button>
                  </div>
                  {aberta && (m as any).criterios?.length > 0 && (
                    <div style={{ padding: '0 12px 10px 36px', borderTop: '1px solid rgba(181,101,29,0.12)' }}>
                      {((m as any).criterios || []).map((cr: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: 'rgba(26,23,20,0.7)', padding: '4px 0', borderBottom: i < (m as any).criterios?.length - 1 ? '1px solid rgba(181,101,29,0.08)' : 'none' }}>
                          <span style={{ color: 'var(--copper)', fontWeight: 600, marginRight: 6 }}>✓</span>
                          {cr.criterio}
                          {cr.como && <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginTop: 2, marginLeft: 16 }}>{cr.como}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {compSubtecnicas.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f766e', marginBottom: 8 }}>⚙️ Subtécnicas — da ficha e UC {plano.ucId}</div>
              {compSubtecnicas.map(s => {
                const removida = compRemovidas.includes(s.id);
                const aberta = compAberta === s.id;
                const criterios = (s as any).criterios || [];
                return (
                  <div key={s.id} style={{ borderRadius: 8, background: removida ? 'var(--cream-dark)' : 'rgba(15,118,110,0.06)', marginBottom: 6, border: `1px solid ${removida ? 'var(--border)' : 'rgba(15,118,110,0.18)'}`, opacity: removida ? 0.5 : 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                      <span style={{ fontSize: 14 }}>{removida ? '○' : '●'}</span>
                      <div style={{ flex: 1, cursor: criterios.length > 0 ? 'pointer' : 'default' }} onClick={() => criterios.length > 0 && toggleComp(s.id)}>
                        <div style={{ fontSize: 13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{s.nome}</div>
                        {criterios.length > 0 && (
                          <div style={{ fontSize: 11, color: '#0f766e', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {criterios.length} critérios <span style={{ fontSize: 9, transform: aberta ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: '0.15s' }}>▶</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => { const novas = removida ? compRemovidas.filter(x => x !== s.id) : [...compRemovidas, s.id]; guardarCompetencias(novas, compAdicionadas); }}
                        style={{ fontSize:13, padding: '3px 10px', borderRadius: 6, border: `1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.55)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.4)', cursor: 'pointer', fontWeight: 600 }}>
                        {removida ? '+ Incluir' : '− Remover'}
                      </button>
                    </div>
                    {aberta && criterios.length > 0 && (
                      <div style={{ padding: '0 12px 10px 36px', borderTop: '1px solid rgba(15,118,110,0.12)' }}>
                        {criterios.map((cr: any, i: number) => (
                          <div key={i} style={{ fontSize: 12, color: 'rgba(26,23,20,0.7)', padding: '4px 0', borderBottom: i < criterios.length-1 ? '1px solid rgba(15,118,110,0.08)' : 'none' }}>
                            <span style={{ color: '#0f766e', fontWeight: 700, marginRight: 6 }}>✓</span>
                            {cr.criterio}
                            {cr.como && <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginTop: 2, marginLeft: 16 }}>{cr.como}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8e44ad', marginBottom: 8 }}>💡 Atitudes — sugeridas para esta aula</div>
            {ATITUDES.filter(a => (a.prioridade === 'permanente' || a.prioridade === 'recorrente') && !IDS_ATITUDES_DUPLICAM.has(a.id)).slice(0, 5).map(a => {
              const removida = compRemovidas.includes(a.id);
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: removida ? 'var(--cream-dark)' : 'rgba(142,68,173,0.06)', marginBottom: 6, border: `1px solid ${removida ? 'var(--border)' : 'rgba(142,68,173,0.15)'}`, opacity: removida ? 0.5 : 1 }}>
                  <span style={{ fontSize: 14 }}>{removida ? '○' : '●'}</span>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{a.nome}</div>
                  <button onClick={() => { const novas = removida ? compRemovidas.filter(x => x !== a.id) : [...compRemovidas, a.id]; guardarCompetencias(novas, compAdicionadas); }}
                    style={{ fontSize:13, padding: '3px 10px', borderRadius: 6, border: `1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.55)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.4)', cursor: 'pointer', fontWeight: 600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '12px 14px', background: 'var(--cream-dark)', borderRadius: 10, fontSize: 12, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Total: {totalComp} competências</div>
            <div style={{ color: 'rgba(26,23,20,0.5)' }}>{compObrigatorias.length} obrigatórias · {compTecnicas.length} técnicas · {compSubtecnicas.length > 0 ? `${compSubtecnicas.length} subtécnicas · ` : ''}{compAtitudes.length} atitudes{compRemovidas.length > 0 && ` · ${compRemovidas.length} removida${compRemovidas.length > 1 ? 's' : ''}`}</div>
            {totalComp > 7 && <div style={{ color: 'var(--copper)', marginTop: 6, fontWeight: 600 }}>⚠️ São muitas competências para uma aula.</div>}
            {totalComp <= 5 && <div style={{ color: 'var(--sage)', marginTop: 6, fontWeight: 600 }}>✓ Número adequado para uma aula.</div>}
          </div>
        </div>
      )}

      {/* TAB RESUMO */}
      {tabInicio === 'resumo' && (<>
        {fichasDoPlano.length > 0 && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--cream-dark)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(26,23,20,0.4)', marginBottom: 8 }}>Fichas de Produção — {fichasDoPlano.length}</div>
            {fichasDoPlano.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nomePrato}</div>
                  <div style={{ fontSize:13, color: 'rgba(26,23,20,0.5)' }}>{f.classificacao} · {f.numPorcoes} doses</div>
                </div>
                {(f as any).textoGuia && <span style={{ fontSize:13, color: 'var(--sage)', fontWeight: 600 }}>+ Guia ✓</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(26,23,20,0.4)', marginBottom: 10 }}>Construir esta aula</div>
          <ModuloCard icone="🎯" titulo={`Competências (${totalComp})`} cor="var(--copper)" descricao={`${compObrigatorias.length} obrigatórias · ${compTecnicas.length} técnicas · ${compAtitudes.length} atitudes`} estado="pendente" onClick={() => setModulo('competencias')} />
          <ModuloCard icone="📄" titulo="Ficha de Produção" cor="var(--copper)" descricao={temFichas ? `${fichasDoPlano.length} ficha${fichasDoPlano.length > 1 ? 's' : ''} criada${fichasDoPlano.length > 1 ? 's' : ''}` : 'Criar ficha com ingredientes, preparação e HACCP'} estado={estadoModulo('ficha') as any} onClick={() => setModulo('ficha')} />
          <ModuloCard icone="📚" titulo="Guia de Apoio à Produção" cor="var(--sage)" descricao={!temFichas ? 'Cria primeiro uma Ficha de Produção' : 'Documento pedagógico com rendimentos, food cost e questões'} estado={estadoModulo('guia') as any} desativado={!temFichas} onClick={() => temFichas && setModulo('guia')} />
          <ModuloCard icone="🛒" titulo="Requisição" cor="#2980b9" descricao={!temFichas ? 'Cria primeiro uma Ficha de Produção' : temRequisicao ? 'Requisição criada — ver ou editar' : 'Consolidar ingredientes para a aula'} estado={estadoModulo('requisicao') as any} desativado={!temFichas} onClick={() => temFichas && setModulo('requisicao')} />
          <ModuloCard icone="✓" titulo="Validação e Avaliação" cor="#8e44ad" descricao={!temFichas ? 'Cria primeiro uma Ficha de Produção' : 'Validar autoavaliações dos alunos'} estado={estadoModulo('validacao') as any} desativado={!temFichas} onClick={() => temFichas && setModulo('validacao')} />
          <ModuloCard icone="🔓" titulo="Reabrir Autoavaliação" cor="#16a085" descricao="Aluno enganou-se? Destranca para ele corrigir" estado="pendente" onClick={() => setModulo('registos')} />
        </div>

        <div style={{ padding: '14px 16px', borderRadius: 14, border: `2px solid ${publicado ? 'var(--sage)' : 'var(--copper)'}`, background: publicado ? 'var(--sage-pale)' : 'var(--copper-pale)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: publicado ? 'var(--sage)' : 'var(--copper)' }}>{publicado ? '✓ Aula publicada para os alunos' : '🚀 Publicar para os alunos'}</div>
          {publicado && plano.atualizadoEm && (
            <div style={{ fontSize: 12, color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>
              Última publicação: {new Date(plano.atualizadoEm).toLocaleDateString('pt-PT', { day:'2-digit', month:'short', year:'numeric' })} às {new Date(plano.atualizadoEm).toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit' })}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 10 }}>{publicado ? 'Os alunos vêem sempre a versão mais recente.' : 'Quando estiver pronto, publica para os alunos poderem aceder.'}</div>
          {publicado ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(90,122,78,0.15)', fontSize:13, color:'var(--sage)', fontWeight:600, textAlign:'center' }}>
                ✓ Visível para os alunos
              </div>
              <button
                onClick={publicarAtualizacao}
                disabled={aPublicarAtualizacao}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 9, border: 'none',
                  background: atualizacaoPublicada ? 'var(--sage)' : '#1A5C7A',
                  color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  opacity: aPublicarAtualizacao ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {aPublicarAtualizacao ? '⏳ A publicar...'
                  : atualizacaoPublicada ? '✓ Atualização publicada!'
                  : '🔄 Publicar atualização para alunos e Classroom'}
              </button>
              {atualizacaoPublicada && (
                <div style={{ fontSize: 11, color: 'var(--sage)', textAlign: 'center' }}>
                  Sheets e Classroom notificados · Os alunos vêem o aviso ao refrescar a app
                </div>
              )}
            </div>
          ) : (
            <button onClick={publicar} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'var(--copper)', color:'white', fontWeight:700, fontSize:14, cursor:'pointer' }}>🚀 Publicar esta aula para os alunos</button>
          )}
        </div>
      </>)}
    </div>
  );
}

export default VistaDePlano;
