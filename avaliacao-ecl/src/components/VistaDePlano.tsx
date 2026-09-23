import React, { useState } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { PlanoAula, FichaProducao } from '../types';
import {
  addOrUpdatePlanoAula, getFichasProducao, addOrUpdateFichaProducao, getHistoricoAvaliacoes, getSelecoes, getValidacoes,
  getRequisicaoPorPlano, getRequisicoesPorPlano, getAlunos, getPlanosAula, eliminarRequisicaoDefinitivamente, getPresencas, publicarNoClassroom , getSessaoAula, estadoTolerancia, abrirSessaoAula,
  estadoDaTurmaNaAula, resumoDaTurmaNaAula,
  presencasPorDecidir, decidirFalta, LABEL_DECISAO,
  definirLiderKF, liderKFdoGrupo , requisicaoDesatualizada , publicarPlanoParaAlunos } from '../backend';
import { rotuloPlano, avisoFimUC } from '../rotuloPlano';
import { TurmaNaAula } from './TurmaNaAula';
import {
  MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS,
  microsPorUC, encontrarAparelho, encontrarSubtecnica,
  nomeCompetencia, aparelhosPermitidos,
  ATITUDES_DETALHADAS, atitudesDoTrimestre, todasAtitudesAteAno,
  dicaRecuperacaoAtitude, nivelComplexidadeAtitude, getAtitudeDetalhada,
} from '../compatECL';
import { getLibrary } from '../libraryService';
import ProfessorView from './ProfessorView';
import Requisicao from './Requisicao';
import { ValidacaoView } from './ValidacaoView';
import { EditarPlano } from './EditarPlano';
import { AvisoAvaliacaoAnterior } from './AvisoAvaliacaoAnterior';
import { PinTemporarioPanel } from './PinTemporarioPanel';

type Modulo = 'inicio' | 'ficha' | 'guia' | 'requisicao' | 'validacao' | 'competencias' | 'registos' | 'editar';

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
      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(26,23,20,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
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
            const p = { ...(getPlanosAula().find(x => x.id === plano.id) || plano), eventoId: eventoSel || undefined, atualizadoEm: new Date().toISOString() };
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
  // Só o que não está no menu da esquerda. Tinha aqui os mesmos atalhos
  // (Fichas, Guião, Requisição, Competências) e ainda uma segunda fila de
  // separadores — três navegações para os mesmos sítios.
  if (plano.estado === 'publicado') return null;
  return (
    <div style={{ background: 'var(--charcoal)', borderRadius: 16, padding: '14px 16px',
      marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#faf7f2' }}>
          Esta aula ainda não está publicada
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(247,241,230,0.65)', marginTop: 2 }}>
          Os alunos só a veem depois de publicares.
        </div>
      </div>
      <button onClick={() => {
        const semFicha = (plano.fichasIds?.length || 0) === 0;
        if (semFicha && !confirm(
          'Este plano ainda não tem ficha técnica.\n\n'
          + 'Publicar assim mesmo? O aluno passa a ver a aula no calendário '
          + 'e podes associar a ficha mais tarde.'
        )) return;
        publicarPlanoParaAlunos(plano.id).then(r => {
          alert(r.ok
            ? 'Publicado. A aula está no Sheets e os alunos já a veem.'
            : 'ATENÇÃO — os alunos ainda NÃO veem esta aula.\n\n' + (r.erro || ''));
        });
      }}
        style={{ padding: '10px 16px', borderRadius: 10, border: 'none',
          background: 'var(--sage)', color: '#fff', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>
        ✓ Publicar aula
      </button>
    </div>
  );
}

/** A unidade está no menu da esquerda; esta barra repetia-a em cada módulo. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BarraUC({ plano }: { plano: PlanoAula }) {
  if (!plano.ucId) return null;
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--copper)', padding: '6px 16px', marginBottom: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize:13, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, flexShrink: 0 }}>UC</div>
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
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>{descricao}</div>
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

function ModalRequisicao({ plano, fichas, onSim, onNao, onNovaFicha }: {
  plano: PlanoAula; fichas: FichaProducao[];
  onSim: (fichasIds: string[]) => void; onNao: () => void;
  /** Leva o professor a criar outra ficha antes de fechar a requisição. */
  onNovaFicha?: () => void;
}) {
  const [sel, setSel] = React.useState<string[]>(fichas.map(f => f.id));
  function toggle(id: string) { setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,23,20,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:24, maxWidth:380, width:'100%' }}>
        <div style={{ fontSize:32, textAlign:'center', marginBottom:8 }}>🛒</div>
        <div style={{ fontWeight:700, fontSize:17, textAlign:'center', marginBottom:6 }}>Guia guardado!</div>
        <div style={{ fontSize:14, color:'rgba(26,23,20,0.6)', textAlign:'center', marginBottom:20 }}>Queres criar agora a Requisição de ingredientes?</div>
        {/* Sem fichas no plano não há nada para requisitar. O botão ficava
            cinzento e não havia como perceber porquê. */}
        {fichas.length === 0 && (
          <div style={{ background:'var(--copper-pale, #fdf0e6)', border:'1px solid var(--copper)',
            borderRadius:12, padding:16, marginBottom:16, fontSize:14.5,
            color:'var(--copper)', lineHeight:1.6 }}>
            <b>Este plano ainda não tem fichas técnicas.</b><br />
            A requisição é feita a partir dos ingredientes das fichas — sem
            elas não há o que requisitar. Associa primeiro uma ficha ao plano.
          </div>
        )}

        {fichas.length === 0 && (
          <div style={{ padding:'14px 16px', borderRadius:12, marginBottom:16,
            background:'var(--copper-pale, #fdf0e6)', border:'1px solid var(--copper)',
            fontSize:14, color:'var(--copper)', lineHeight:1.55 }}>
            Este plano ainda não tem nenhuma ficha técnica associada. A
            requisição sai das fichas — sem elas não há ingredientes a pedir.
            Cria a ficha primeiro e volta aqui.
          </div>
        )}
        {fichas.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'rgba(26,23,20,0.5)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Fichas a incluir na requisição:</div>
            <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginBottom:10, lineHeight:1.5 }}>
              Escolhe as que entram nesta requisição. Se faltar alguma,
              podes criá-la antes e voltar aqui.
            </div>
            {fichas.map(f => (
              <div key={f.id} onClick={() => toggle(f.id)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:`1.5px solid ${sel.includes(f.id) ? 'var(--copper)' : 'var(--border)'}`, background: sel.includes(f.id) ? 'var(--copper-pale)' : '#fff', cursor:'pointer', marginBottom:6 }}>
                <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${sel.includes(f.id) ? 'var(--copper)' : 'var(--border)'}`, background: sel.includes(f.id) ? 'var(--copper)' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {sel.includes(f.id) && <span style={{ color:'white', fontSize:13, fontWeight:700 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{f.nomePrato}</div>
                  <div style={{ fontSize:13, color:'rgba(26,23,20,0.5)' }}>{f.numPorcoes} doses · {f.classificacao}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {/* Só aparece quando há fichas. Um botão permanentemente
              desativado não diz nada a quem está à espera de o usar. */}
          {fichas.length > 0 && (
            <button onClick={() => onSim(sel)} disabled={sel.length === 0}
              style={{ padding:'14px', borderRadius:12, border:'none',
                background: sel.length > 0 ? 'var(--copper)' : 'var(--border)',
                color:'white', fontWeight:700, fontSize:15,
                cursor: sel.length > 0 ? 'pointer' : 'not-allowed' }}>
              {sel.length > 0
                ? `✓ Sim — criar Requisição (${sel.length} ficha${sel.length > 1 ? 's' : ''})`
                : 'Escolhe pelo menos uma ficha'}
            </button>
          )}
          <button onClick={onNao}
            style={{ padding:'12px', borderRadius:12, border:'1px solid var(--border)', background:'#fff', color:'rgba(26,23,20,0.6)', fontWeight:600, fontSize:14, cursor:'pointer' }}>
            {fichas.length === 0 ? 'Voltar ao plano' : 'Não — voltar ao plano'}
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
    setAlunos(getAlunos().filter((a: any) => a.turmaId === turmaId && a.ativo !== false).sort((a: any, b: any) => a.numero - b.numero));
  }, [turmaId]);

  function estaSubmetido(alunoId: string): { submetido: boolean; hora: string } {
    try {
      const v = localStorage.getItem(`avaliacao_submetida_${plano.id}_${alunoId}`);
      if (v) return { submetido: true, hora: fmtDataHora(v) };
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
              <div style={{ fontSize:13, color: submetido ? 'var(--sage)' : 'rgba(26,23,20,0.4)' }}>{submetido ? `✓ Submetido em ${hora}` : 'Ainda não submeteu'}</div>
            </div>
            {submetido && (
              <button onClick={() => setReabrirConfirm(a.id)}
                style={{ fontSize:13, padding:'6px 12px', borderRadius:8, border:'1px solid var(--copper)', background:'#fff', color:'var(--copper)', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
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
export function VistaDePlano({ plano, turmaId, nomeProfessor, onVoltar, onPlanoActualizado, onAlteracao, onGuardado, aoMudarModulo, moduloPedido }: Props & {
  /** Avisa o pai de onde estamos, para o menu do plano se marcar. */
  aoMudarModulo?: (m: string) => void;
  /** O pai pede para ir a um módulo — é assim que o menu navega. */
  moduloPedido?: string | null;
}) {
  const [modulo, setModulo] = useState<Modulo>('inicio');

  // Manter o menu do plano a par de onde estamos, e obedecer-lhe quando
  // ele pede para ir a outro sítio. A lógica de cada módulo não muda.
  React.useEffect(() => { aoMudarModulo?.(modulo); }, [modulo]);

  // Veio do aviso de eliminação com "Corrigir o plano" — abrir o editor.
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem('ecl_abrir_editor') === plano.id) {
        sessionStorage.removeItem('ecl_abrir_editor');
        setModulo('editar');
      }
      if (sessionStorage.getItem('ecl_abrir_turma') === plano.id) {
        sessionStorage.removeItem('ecl_abrir_turma');
        setModulo('inicio');
        setTabInicio('turma');
      }
    } catch { /* */ }
  }, []);
  React.useEffect(() => {
    if (!moduloPedido) return;
    if (moduloPedido === 'turma') { setModulo('inicio'); setTabInicio('turma'); }
    else if (moduloPedido === 'competencias') { setModulo('inicio'); setTabInicio('competencias'); }
    else if (moduloPedido === 'inicio') { setModulo('inicio'); setTabInicio('resumo'); }
    else setModulo(moduloPedido as Modulo);
  }, [moduloPedido]);
  const [incluirSubApp, setIncluirSubApp] = useState(true);
  /** Ficha que está a ser editada; null = criar nova. */
  const [fichaEmEdicao, setFichaEmEdicao] = useState<string | null>(null);
  /** Mostra a confirmação durante uns segundos depois de abrir a aula. */
  const [acabouDeAbrir, setAcabouDeAbrir] = useState(false);
  /** A abrir — o botão fica bloqueado para não haver duas aberturas. */
  const [aAbrir, setAAbrir] = useState(false);
  /** true quando vem do plano com "Ir buscar uma ficha". */
  const [irParaBiblioteca, setIrParaBiblioteca] = useState(false);
  /** Aluno a validar, vindo da vista de turma. */
  const [alunoParaValidar, setAlunoParaValidar] = useState<string | null>(null);
  const [modalProximo, setModalProximo] = useState<string | null>(null);
  const [fichasParaRequisicao, setFichasParaRequisicao] = React.useState<string[]>([]);
  // A turma entra como separador do plano: é onde o professor está
  // durante a aula, e antes tinha de sair do plano para ver quem chegou
  // ou para validar seja o que for.
  // Três separadores, um por momento do professor: preparar a aula,
  // dar a aula, e a árvore de competências.
  //
  // Eram quatro, e dois deles — Orientação e Resumo — mostravam a mesma
  // coisa com arranjos diferentes. Sobra de termos construído o novo sem
  // apagar o velho.
  const [tabInicio, setTabInicio] = useState<'resumo' | 'competencias' | 'turma'>('resumo');
  /** Conhecimentos marcados para retirar/incluir, à espera de confirmação. */
  const [knwPendentes, setKnwPendentes] = useState<Set<string>>(new Set());
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
  // Aula atitudinal: sem farda, sem KitchenFlow, sem técnicas nem
  // conhecimentos. Só as atitudes que o professor marcou.
  const ehAtitudinal = (plano as any).tipoPlanAula === 'atitudinal';
  const compObrigatorias = ehAtitudinal ? [] : OBRIGATORIAS;
  const IDS_JA_USADOS = new Set<string>(compObrigatorias.map(o => o.id));

  const IDS_ATITUDES_DUPLICAM = new Set([
    'ATT_03', 'ATT_16', 'ATT_17',
  ]);

  // Tipo de plano: 'pratico' (tem fichas) | 'teorico' (sem fichas)
  const tipoPlanAula = (plano as any).tipoPlanAula || (temFichas ? 'pratico' : 'teorico');

  // ── SUB-xxx: subtécnicas da ficha (plano prático) ──────────
  const subIdsRaw = incluirSubApp ? fichasDoPlano.flatMap(f => (f.tecnicasSugeridas || []).filter((id: string) => id.startsWith('SUB-'))) : [];
  const compSub = ehAtitudinal ? [] : [...new Set(subIdsRaw)]
    .filter(id => !compRemovidas.includes(id) && !IDS_JA_USADOS.has(id))
    .slice(0, 6)
    .map(id => {
      const sub = encontrarSubtecnica(id);
      return { id, nome: sub?.nome || id, criterios: [] as any[] };
    });
  compSub.forEach(s => IDS_JA_USADOS.add(s.id));

  // ── APP-xxx: aparelhos da ficha (plano prático) ────────────
  const appIdsRaw = incluirSubApp ? fichasDoPlano.flatMap(f => ((f as any).aparelhosDetectados || []).filter((id: string) => id.startsWith('APP-'))) : [];
  const compApp = ehAtitudinal ? [] : [...new Set(appIdsRaw)]
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
  // Os sugeridos são escolhidos ANTES de tirar os retirados. Antes, o
  // filtro de retirados vinha primeiro: retirar um fazia entrar outro no
  // lugar, sem aviso, e o retirado desaparecia da lista — não havia como
  // o voltar a incluir.
  const conhecimentosSugeridos = !ehAtitudinal && tipoPlanAula !== 'pratico' && plano.ucId && lib
    ? (lib.conhecimentos as any[])
        .filter((k: any) => !IDS_JA_USADOS.has(k.id))
        .slice(0, 6)
        .map((k: any) => ({ id: k.id, nome: k.nome, definicao: k.definicao, criterios: [] as any[] }))
    : [];
  const compConhecimentos = conhecimentosSugeridos.filter(k => !compRemovidas.includes(k.id));
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
  const compTecnicas = ehAtitudinal ? [] : (usarFallback && temFichas) ? microsDaUC
    .filter(m => {
      if (IDS_DUPLICAM_OBRIGATORIAS.has(m.id) || IDS_JA_USADOS.has(m.id)) return false;
      if (textoFichas.length > 10) {
        const palavras = m.nome.toLowerCase().split(/[\s\/]+/);
        return palavras.some((p: string) => p.length > 3 && textoFichas.includes(p));
      }
      return true;
    }).slice(0, 8).filter(m => !compRemovidas.includes(m.id)) : [];
  compTecnicas.forEach(m => IDS_JA_USADOS.add(m.id));

  // ── Determinar ano do curso pela turma ─────────────────────
  const anoTurma = turmaId?.includes('1') ? 1 : turmaId?.includes('3') ? 3 : 2;
  // Trimestre actual — alinhado com calendário pedagógico ECL
  const mesActual = new Date().getMonth() + 1; // 1=jan ... 12=dez
  const trimestreActual: 1 | 2 | 3 = mesActual >= 9 ? 1 : mesActual <= 3 ? 2 : mesActual <= 6 ? 3 : 1;
  // 1º Trimestre: set(9)-dez(12) | 2º Trimestre: jan(1)-mar(3) | 3º Trimestre: abr(4)-jun(6) | jul-ago → assume 1
  // Atitude do trimestre para este ano/turma
  const atitudesActivas = ATITUDES_DETALHADAS.filter(
    a => a.ano === anoTurma && a.trimestre === trimestreActual
  );
  const atitudeTrimestreId = atitudesActivas.length > 0
    ? atitudesActivas[Math.floor(Math.random() * atitudesActivas.length)].id
    : null;

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
    const p = { ...planoFresco(), compRemovidas: removidas, compAdicionadas: adicionadas, atualizadoEm: new Date().toISOString() } as any;
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

  const [aPublicar, setAPublicar] = useState(false);

  /** Publica e confirma no Sheets — é de lá que o aluno lê. */
  async function publicar() {
    setAPublicar(true);
    try {
      const r = await publicarPlanoParaAlunos(plano.id);
      const p = planoFresco();
      onPlanoActualizado({ ...p, ultimaAlteracao: undefined } as any);
      if (r.ok) alert('Publicado. Os alunos já veem esta aula.');
      else alert('Atenção: ' + r.erro);
    } finally { setAPublicar(false); }
  }

  /** Regista uma alteração num plano já publicado e propaga ao AlunoView */
  /**
   * O plano tal como está GUARDADO, não a cópia que a vista tem em
   * memória. Entre abrir o ecrã e gravar, pode ter-se associado uma
   * ficha ou um guião — e gravar a cópia antiga apagava isso.
   */
  function planoFresco() {
    return getPlanosAula().find(p => p.id === plano.id) || plano;
  }

  function registarAlteracaoPublicado(tipo: 'ficha' | 'guia' | 'requisicao' | 'competencias' | 'geral', descricao: string) {
    if (plano.estado !== 'publicado') return;
    // Ler o plano do armazenamento, não usar o que está na memória.
    //
    // O `plano` desta vista foi carregado quando o ecrã abriu. Se entretanto
    // se criou uma ficha, ela foi associada ao plano no armazenamento — mas
    // a cópia em memória não a tem. Gravar essa cópia por cima APAGAVA a
    // associação, e a ficha desaparecia do plano.
    const atual = getPlanosAula().find(p => p.id === plano.id) || plano;
    const p = {
      ...atual,
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
    // Reler no fim: é aqui que a associação da ficha chega à vista.
    const planoAtualizado = getPlanosAula().find(p => p.id === plano.id);
    if (planoAtualizado) onPlanoActualizado(planoAtualizado);
    onGuardado?.();
    setFichaEmEdicao(null);
    setIrParaBiblioteca(false);
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
        <div style={{ background: 'var(--copper-pale)', borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontSize: 13, color: 'var(--copper)', fontWeight: 600 }}>
          📄 A criar Ficha de Produção para este plano — será associada automaticamente
        </div>
        <ProfessorView turmaId={turmaId} nomeProfessor={nomeProfessor} planoId={plano.id}
          fichaParaEditar={fichaEmEdicao}
          abrirBiblioteca={irParaBiblioteca}
          onAlteracao={onAlteracao} onGuardado={aposGuardarFicha} />
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
            {nomePratoGuia && (
            <div style={{ background: 'rgba(90,122,78,0.1)', borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontSize: 13, color: 'var(--sage)', fontWeight: 600 }}>
              📚 Guia de Apoio à Produção — <strong>{nomePratoGuia}</strong>
            </div>
          )}
        </div>
        <ProfessorView turmaId={turmaId} nomeProfessor={nomeProfessor} planoId={plano.id} modoGuia={true} nomePratoInicial={nomePratoGuia} onAlteracao={onAlteracao}
          onGuardado={() => { registarAlteracaoPublicado('guia', 'Guia de produção atualizado pelo professor'); onGuardado?.(); setModalProximo('apos_guia'); }} />
        {modalProximo === 'apos_guia' && (
          /* As fichas são lidas AGORA, não quando o ecrã abriu. Se o
             professor acabou de criar uma, ela tem de estar na lista —
             e antes não estava, porque `fichasActuais` era calculado
             uma única vez e ficava com a lista antiga. */
          <ModalRequisicao plano={plano}
            fichas={getFichasProducao().filter(f =>
              (plano.fichasIds || []).includes(f.id) || f.planoAulaId === plano.id
            )}
            onSim={(ids) => { setFichasParaRequisicao(ids); setModalProximo(null); setModulo('requisicao'); }}
            onNao={() => { setModalProximo(null); setModulo('inicio'); }}
            onNovaFicha={() => { setModalProximo(null); setModulo('ficha'); }}
          />
        )}
      </div>
    );
  }

  if (modulo === 'requisicao') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} modulo={modulo} setModulo={setModulo} />
        {todasRequisicoesDoPlano.length > 0 && (
          <div style={{ background: 'var(--sage-pale)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: modoSelecaoReq ? 8 : 0 }}>
              <span style={{ fontSize: 13, color: 'var(--sage)', fontWeight: 600 }}>✓ {todasRequisicoesDoPlano.length} requisição(ões) para este plano</span>
              {todasRequisicoesDoPlano.length > 1 && (
                <button onClick={() => { setModoSelecaoReq(!modoSelecaoReq); setReqSelecionadasIds(new Set()); }}
                  style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sage)', background: 'none', border: '1px solid var(--sage)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                  {modoSelecaoReq ? '✕ Cancelar' : '☑ Selecionar'}
                </button>
              )}
            </div>
            {modoSelecaoReq && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, flex: 1 }}>{reqSelecionadasIds.size} selecionada(s)</span>
                <button onClick={() => {
                  if (reqSelecionadasIds.size === 0) return;
                  if (confirm(`Eliminar DEFINITIVAMENTE ${reqSelecionadasIds.size} requisição(ões)?`)) {
                    reqSelecionadasIds.forEach(id => eliminarRequisicaoDefinitivamente(id));
                    setReqSelecionadasIds(new Set()); setModoSelecaoReq(false); onPlanoActualizado({ ...plano });
                  }
                }} disabled={reqSelecionadasIds.size === 0}
                  style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'var(--danger)', color: 'white', fontWeight: 700, fontSize: 12.5, cursor: reqSelecionadasIds.size === 0 ? 'default' : 'pointer', opacity: reqSelecionadasIds.size === 0 ? 0.4 : 1 }}>
                  🗑️ Eliminar
                </button>
              </div>
            )}
            {todasRequisicoesDoPlano.filter(r => r && r.id).map(r => (
              <div key={r.id} onClick={() => { if (!modoSelecaoReq) return; setReqSelecionadasIds(prev => { const novo = new Set(prev); if (novo.has(r.id)) novo.delete(r.id); else novo.add(r.id); return novo; }); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: '#fff', marginBottom: 4, cursor: modoSelecaoReq ? 'pointer' : 'default' }}>
                {modoSelecaoReq && (
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: '2px solid var(--sage)', background: reqSelecionadasIds.has(r.id) ? 'var(--sage)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12.5, color: 'white' }}>
                    {reqSelecionadasIds.has(r.id) && '✓'}
                  </div>
                )}
                <span style={{ fontSize: 13, flex: 1 }}>
                  {r.criadaEm ? fmtData(r.criadaEm) + ' ' + new Date(r.criadaEm).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : r.id}
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
        <div style={{ padding:'10px 14px', background:'var(--copper-pale)', borderRadius:10, fontSize:13, color:'var(--copper)', marginBottom:14, border:'1px solid rgba(181,101,29,0.2)' }}>
          <strong>{totalComp} competências</strong> para esta aula. As obrigatórias não podem ser removidas.
        </div>
        {/* ── Toggle SUB/APP ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, padding:'10px 12px',
          borderRadius:8, background:'rgba(91,103,234,0.06)', border:'1px solid rgba(91,103,234,0.2)' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#5B67EA', flex:1 }}>
            🔬 Incluir subtécnicas e aparelhos da ficha
          </span>
          <button onClick={() => setIncluirSubApp(v => !v)} style={{
            width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative',
            background: incluirSubApp ? '#5B67EA' : 'rgba(26,23,20,0.2)', transition:'background 0.2s',
          }}>
            <span style={{
              position:'absolute', top:3, left: incluirSubApp ? 23 : 3,
              width:18, height:18, borderRadius:9, background:'#fff', transition:'left 0.2s',
            }} />
          </button>
        </div>

        {/* ── Atitude do trimestre ── */}
        {atitudesActivas.length > 0 && (
          <div style={{ marginBottom:14, padding:'10px 12px', borderRadius:8,
            background:'rgba(3,105,161,0.06)', border:'1px solid rgba(3,105,161,0.2)' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0369a1', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              💡 Atitude activa — {trimestreActual}º trimestre · {anoTurma}º ano
            </div>
            {atitudesActivas.map(a => (
              <div key={a.id}>
                <div style={{ fontSize:13, fontWeight:600 }}>{a.nome} <span style={{ color:'rgba(26,23,20,0.4)', fontWeight:400 }}>{a.id}</span></div>
                <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginTop:3 }}>{a.nivelComplexidade[('n'+anoTurma) as 'n1'|'n2'|'n3']}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--sage)', marginBottom:8 }}>🔒 Obrigatórias — sempre presentes</div>
          {compObrigatorias.map(c => (
            <div key={c.id} style={{ padding:'8px 12px', borderRadius:8, background:'var(--sage-pale)', marginBottom:6, border:'1px solid rgba(90,122,78,0.2)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span>✓</span>
                <div style={{ flex:1, fontSize:13, fontWeight:600 }}>{c.nome}</div>
                <span style={{ fontSize:13, color:'var(--sage)', fontWeight:600 }}>SEMPRE</span>
              </div>
              {Array.isArray((c as any).criterios) && (c as any).criterios.length > 0 && (
                <ul style={{ margin:'6px 0 0 28px', padding:0 }}>
                  {(c as any).criterios.map((cr:any, i:number) => (
                    <li key={i} style={{ fontSize:13, color:'rgba(26,23,20,0.65)', marginBottom:2 }}>{cr.criterio}</li>
                  ))}
                </ul>
              )}
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
                    style={{ fontSize:13, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
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
                    <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.45)' }}>
                      {m.categoria} ·
                      <span style={{ fontWeight:700, marginLeft:4, color: m.nivel===1?'#5a7a4e':m.nivel===2?'#b5651d':'#c0392b' }}>N{m.nivel}</span>
                    </div>
                  </div>
                  <button onClick={() => guardarCompetencias(removida ? compRemovidas.filter(x => x !== m.id) : [...compRemovidas, m.id], compAdicionadas)}
                    style={{ fontSize:13, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Conhecimentos da UC (aula teórica/mista) ── */}
        {conhecimentosSugeridos.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#0369a1', marginBottom:8 }}>📚 Conhecimentos da UC</div>
            {conhecimentosSugeridos.map(k => {
              // Estado visível = o guardado, com as marcações por confirmar por cima.
              const removida = knwPendentes.has(k.id)
                ? !compRemovidas.includes(k.id)
                : compRemovidas.includes(k.id);
              return (
                <div key={k.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background: removida ? 'var(--cream-dark)' : 'rgba(3,105,161,0.06)', marginBottom:6, opacity: removida ? 0.5 : 1 }}>
                  <span>{removida ? '○' : '●'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{k.nome}</div>
                    {k.definicao && <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.4)', marginTop:2 }}>{k.definicao.slice(0, 80)}{k.definicao.length > 80 ? '…' : ''}</div>}
                  </div>
                  <button onClick={() => {
                      // Só marca. Nada se retira sem confirmação.
                      const n = new Set(knwPendentes);
                      if (n.has(k.id)) n.delete(k.id); else n.add(k.id);
                      setKnwPendentes(n);
                    }}
                    style={{ fontSize:13, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}

            {/* Alterações por confirmar — uma confirmação, com a lista toda. */}
            {knwPendentes.size > 0 && (() => {
              const aRetirar = conhecimentosSugeridos.filter(k => knwPendentes.has(k.id) && !compRemovidas.includes(k.id));
              const aIncluir = conhecimentosSugeridos.filter(k => knwPendentes.has(k.id) && compRemovidas.includes(k.id));
              return (
                <div style={{ marginTop:10, padding:'12px 14px', borderRadius:10,
                  background:'#fdf0e6', border:'1.5px solid var(--copper)' }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--copper)', marginBottom:8 }}>
                    {aRetirar.length > 0 && `${aRetirar.length} a retirar`}
                    {aRetirar.length > 0 && aIncluir.length > 0 && ' · '}
                    {aIncluir.length > 0 && `${aIncluir.length} a incluir`}
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button onClick={() => setKnwPendentes(new Set())}
                      style={{ flex:'1 1 110px', padding:10, borderRadius:9, border:'1px solid rgba(26,23,20,0.18)',
                        background:'#fff', fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Desfazer
                    </button>
                    <button onClick={() => {
                        if (aRetirar.length > 0 && !confirm(
                          'Está a excluir os seguintes conhecimentos deste plano de aula:\n\n'
                          + aRetirar.map(k => '· ' + k.nome).join('\n')
                          + '\n\nConfirma que pretende excluí-los?'
                        )) return;
                        let novas = [...compRemovidas];
                        aRetirar.forEach(k => { if (!novas.includes(k.id)) novas.push(k.id); });
                        novas = novas.filter(id => !aIncluir.some(k => k.id === id));
                        guardarCompetencias(novas, compAdicionadas);
                        setKnwPendentes(new Set());
                      }}
                      style={{ flex:'1 1 110px', padding:10, borderRadius:9, border:'none',
                        background:'var(--copper)', color:'#fff', fontSize:13.5, fontWeight:700,
                        cursor:'pointer', fontFamily:'inherit' }}>
                      Guardar alterações
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Fallback sistema antigo (sem SUB/APP) ── */}
        {usarFallback && !temFichas && (
          <div style={{ marginBottom:14, padding:'12px 14px', borderRadius:10, background:'var(--cream-dark)', border:'1px dashed rgba(26,23,20,0.2)' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'rgba(26,23,20,0.7)', marginBottom:2 }}>Ainda não há ficha técnica</div>
            <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.55)' }}>As competências específicas do prato (técnicas, aparelhos e micros) aparecem aqui depois de criares a ficha técnica desta aula.</div>
          </div>
        )}
        {compTecnicas.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--copper)', marginBottom:8 }}>🔬 Técnicas — UC {plano.ucId}</div>
            {compTecnicas.map(m => {
              const removida = compRemovidas.includes(m.id);
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background: removida ? 'var(--cream-dark)' : 'var(--copper-pale)', marginBottom:6, opacity: removida ? 0.5 : 1 }}>
                  <span>{removida ? '○' : '●'}</span>
                  <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{m.nome}</div>{m.criterios.length > 0 && <div style={{ fontSize:13, color:'rgba(26,23,20,0.45)' }}>{m.criterios.length} critérios</div>}</div>
                  <button onClick={() => guardarCompetencias(removida ? compRemovidas.filter(x => x !== m.id) : [...compRemovidas, m.id], compAdicionadas)}
                    style={{ fontSize:13, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {/* ── Atitudes do trimestre (sistema novo) ── */}
        {(() => {
          const anoTurmaLocal = anoTurma || 1;
          const atitudesTrim = atitudesDoTrimestre(trimestreActual as 1|2|3, anoTurmaLocal as 1|2|3);
          if (atitudesTrim.length === 0) return null;
          return (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#8e44ad', marginBottom:8 }}>
                💡 Atitudes — {trimestreActual}º trimestre · {anoTurmaLocal}º ano
              </div>
              {atitudesTrim.map(a => {
                const removida = compRemovidas.includes(a.id);
                const det = getAtitudeDetalhada(a.id);
                return (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background: removida ? 'var(--cream-dark)' : 'rgba(142,68,173,0.06)', marginBottom:6, opacity: removida ? 0.5 : 1, border: '1px solid rgba(142,68,173,0.15)' }}>
                    <span>{removida ? '○' : '●'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight: removida ? 400 : 600, textDecoration: removida ? 'line-through' : 'none' }}>{det?.nome || a.nome || a.id}</div>
                      {det && <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.4)', marginTop:2 }}>{det.nivelComplexidade?.[`n${anoTurmaLocal}` as 'n1'|'n2'|'n3'] || ''}</div>}
                    </div>
                    <button onClick={() => guardarCompetencias(removida ? compRemovidas.filter(x => x !== a.id) : [...compRemovidas, a.id], compAdicionadas)}
                      style={{ fontSize:13, padding:'3px 10px', borderRadius:6, border:`1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.3)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.5)', cursor:'pointer', fontWeight:600 }}>
                      {removida ? '+ Incluir' : '− Remover'}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}
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

  if (modulo === 'editar') {
    return (
      <div>
        <EditarPlano plano={plano}
          onGuardado={p => { onPlanoActualizado?.(p); setModulo('inicio'); }}
          onCancelar={() => setModulo('inicio')}
          onEliminado={onVoltar} />
      </div>
    );
  }

  if (modulo === 'registos') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} modulo={modulo} setModulo={setModulo} />
        <PinTemporarioPanel turmaId={turmaId} nomeProfessor={nomeProfessor} />
      </div>
    );
  }

  if (modulo === 'validacao') {
    const alunosDaTurma = getAlunos().filter((a) => a.turmaId === turmaId && a.ativo !== false);
    const historico = getHistoricoAvaliacoes().filter(r => r.planoAulaId === plano.id);
    const selecoes = getSelecoes().filter(s => s.planoAulaId === plano.id);
    const validacoes = getValidacoes().filter(v => v.planoAulaId === plano.id);

    // Tabela resumo da turma para este plano
    const resumoTurma = alunosDaTurma.map(aluno => {
      const regsAluno = historico.filter(r => r.alunoId === aluno.id);
      const selAluno = selecoes.find(s => s.alunoId === aluno.id);
      const valAluno = validacoes.find(v => v.alunoId === aluno.id);
      const submeteu = !!selAluno || regsAluno.length > 0;
      const validado = !!valAluno;
      // Notas por componente
      const notaOBR = regsAluno.filter(r => r.microcompetenciaId?.startsWith('OBR_')).map(r => r.nota);
      const notaSUB = regsAluno.filter(r => r.microcompetenciaId?.startsWith('SUB-')).map(r => r.nota);
      const notaAPP = regsAluno.filter(r => r.microcompetenciaId?.startsWith('APP-')).map(r => r.nota);
      const notaKNW = regsAluno.filter(r => r.microcompetenciaId?.startsWith('KNW-')).map(r => r.nota);
      const notaATI = regsAluno.filter(r => r.microcompetenciaId?.startsWith('ATI-')).map(r => r.nota);
      const media = (arr: number[]) => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : '—';
      return { aluno, submeteu, validado, notaOBR: media(notaOBR), notaSUB: media(notaSUB), notaAPP: media(notaAPP), notaKNW: media(notaKNW), notaATI: media(notaATI) };
    });

    const nSubmeteram = resumoTurma.filter(r => r.submeteu).length;
    const nValidados = resumoTurma.filter(r => r.validado).length;

    return (
      <div>
        <CabecalhoPlano plano={plano}
          onVoltar={() => {
            setModulo('inicio');
            // Volta ao sítio de onde veio, se veio da turma.
            if (alunoParaValidar) { setTabInicio('turma'); setAlunoParaValidar(null); }
          }}
          modulo={modulo} setModulo={setModulo} />

        {/* Resumo rápido */}
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          {[
            { label:'Submeteram', valor:nSubmeteram, total:alunosDaTurma.length, cor:'var(--sage)' },
            { label:'Validados', valor:nValidados, total:nSubmeteram, cor:'#0369a1' },
            { label:'Pendentes', valor:nSubmeteram-nValidados, total:alunosDaTurma.length, cor:'var(--copper)' },
          ].map(s => (
            <div key={s.label} style={{ flex:1, minWidth:80, padding:'10px 12px', borderRadius:10, background:'#fff', border:'1px solid var(--border)', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:800, color:s.cor }}>{s.valor}<span style={{ fontSize:13, color:'rgba(26,23,20,0.3)' }}>/{s.total}</span></div>
              <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.5)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabela de turma */}
        {alunosDaTurma.length > 0 && (
          <div style={{ overflowX:'auto', marginBottom:16 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--charcoal)', color:'var(--cream)' }}>
                  <th style={{ padding:'8px 10px', textAlign:'left', borderRadius:'8px 0 0 0' }}>Aluno</th>
                  <th style={{ padding:'8px 6px', textAlign:'center' }}>OBR</th>
                  <th style={{ padding:'8px 6px', textAlign:'center' }}>SUB</th>
                  <th style={{ padding:'8px 6px', textAlign:'center' }}>APP</th>
                  <th style={{ padding:'8px 6px', textAlign:'center' }}>KNW</th>
                  <th style={{ padding:'8px 6px', textAlign:'center' }}>ATI</th>
                  <th style={{ padding:'8px 10px', textAlign:'center', borderRadius:'0 8px 0 0' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {resumoTurma.map((r, i) => (
                  <tr key={r.aluno.id} style={{ background: i%2===0?'#fff':'#fafaf8', borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'8px 10px', fontWeight:600 }}>{r.aluno.nome || `Nº ${r.aluno.numero}`}</td>
                    <td style={{ padding:'8px 6px', textAlign:'center', color: r.notaOBR!=='—'&&Number(r.notaOBR)>=3?'var(--sage)':r.notaOBR!=='—'?'var(--copper)':'rgba(26,23,20,0.3)' }}>{r.notaOBR}</td>
                    <td style={{ padding:'8px 6px', textAlign:'center', color: r.notaSUB!=='—'&&Number(r.notaSUB)>=3?'var(--sage)':r.notaSUB!=='—'?'var(--copper)':'rgba(26,23,20,0.3)' }}>{r.notaSUB}</td>
                    <td style={{ padding:'8px 6px', textAlign:'center', color: r.notaAPP!=='—'&&Number(r.notaAPP)>=3?'var(--sage)':r.notaAPP!=='—'?'var(--copper)':'rgba(26,23,20,0.3)' }}>{r.notaAPP}</td>
                    <td style={{ padding:'8px 6px', textAlign:'center', color: r.notaKNW!=='—'&&Number(r.notaKNW)>=3?'var(--sage)':r.notaKNW!=='—'?'var(--copper)':'rgba(26,23,20,0.3)' }}>{r.notaKNW}</td>
                    <td style={{ padding:'8px 6px', textAlign:'center', color: r.notaATI!=='—'&&Number(r.notaATI)>=3?'var(--sage)':r.notaATI!=='—'?'var(--copper)':'rgba(26,23,20,0.3)' }}>{r.notaATI}</td>
                    <td style={{ padding:'8px 10px', textAlign:'center' }}>
                      {r.validado ? <span style={{ color:'var(--sage)', fontWeight:700 }}>✓ Validado</span>
                        : r.submeteu ? <span style={{ color:'var(--copper)', fontWeight:700 }}>⏳ Pendente</span>
                        : <span style={{ color:'rgba(26,23,20,0.3)' }}>— Sem resposta</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Validação individual */}
        <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'rgba(26,23,20,0.4)', marginBottom:10 }}>
          Validar individualmente
        </div>
        <ValidacaoView turmaId={turmaId} planoId={plano.id} />
      </div>
    );
  }

  // ── INÍCIO ───────────────────────────────────────────────────
  return (
    <div>
      {/* Enquanto não publicar, o aluno não vê a aula em lado nenhum —
          nem no calendário, nem nas próximas aulas. Isto tem de estar à
          frente, senão o professor marca a aula e ninguém a vê. */}

      {/* O aviso de "por publicar" está agora no painel de estado,
          em cima — não faz sentido repeti-lo aqui. */}

      {/* Abertura da aula. É daqui que contam os dez minutos de
          tolerância — não da hora prevista no plano. Enquanto não
          abrir, os alunos consultam mas não gravam nada. */}
      {plano.estado === 'publicado' && (() => {
        const sessao = getSessaoAula(plano.id);
        const t = estadoTolerancia(plano.id);

        if (!sessao?.abertaEm) {
          return (
            <div style={{ background:'var(--copper-pale, #fdf0e6)', border:'1px solid var(--copper)',
              borderRadius:14, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--charcoal, #1a1714)' }}>
                A aula ainda não está aberta
              </div>
              <div style={{ fontSize:14, color:'rgba(26,23,20,0.65)', marginTop:5, lineHeight:1.55 }}>
                Os alunos podem consultar o plano, as fichas e o guião, mas não
                conseguem marcar presença nem registar nada. Ao abrires, começam
                os dez minutos de tolerância.
              </div>
              <button disabled={aAbrir} onClick={() => {
                  // Um clique só. Abrir não se repete: a hora de abertura é
                  // a primeira, e a tolerância conta a partir dela.
                  if (aAbrir) return;
                  setAAbrir(true);
                  abrirSessaoAula(plano.id, turmaId, nomeProfessor || 'professor');
                  // Um objeto NOVO — com o mesmo, o ecrã não se redesenhava
                  // e o botão ficava à vista como se nada tivesse acontecido.
                  onPlanoActualizado?.({ ...plano });
                  setAcabouDeAbrir(true);
                  setTimeout(() => setAcabouDeAbrir(false), 6000);
                }}
                style={{ marginTop:12, width:'100%', padding:16, borderRadius:12, border:'none',
                  background:'var(--copper)', color:'#fff', fontSize:17, fontWeight:700,
                  cursor: aAbrir ? 'default' : 'pointer', fontFamily:'inherit',
                  opacity: aAbrir ? 0.6 : 1 }}>
                {aAbrir ? 'A abrir…' : 'Abrir a aula agora'}
              </button>
            </div>
          );
        }

        const porDecidir = presencasPorDecidir(plano.id);
        const alunos = getAlunos();
        const nomeDe = (id: string) => {
          const al = alunos.find(x => x.id === id);
          return al?.nome || `Aluno nº ${al?.numero ?? '?'}`;
        };

        return (
          <div style={{ marginBottom:14 }}>
            {/* Confirmação visível logo a seguir ao clique. */}
            {acabouDeAbrir && (
              <div style={{ background:'var(--sage)', color:'#fff', borderRadius:12,
                padding:'13px 16px', marginBottom:8, fontSize:15.5, fontWeight:700,
                display:'flex', alignItems:'center', gap:10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff"
                  strokeWidth={3} strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                Aula aberta. Os alunos já podem entrar.
              </div>
            )}
            <div style={{ background:'var(--sage-pale, #eef4eb)', border:'1px solid var(--sage)',
              borderRadius:14, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'var(--sage)' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15.5, fontWeight:700, color:'var(--sage)' }}>
                    Aula aberta às {new Date(sessao.abertaEm).toLocaleTimeString('pt-PT',
                      { hour:'2-digit', minute:'2-digit' })}
                  </div>
                  <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', marginTop:2 }}>
                    {t.foraDeTempo
                      ? 'A tolerância terminou.'
                      : `Faltam ${t.minutosRestantes} min de tolerância.`}
                  </div>
                </div>
              </div>
            </div>

            {/* A aplicação regista a hora, não decide a falta. Quem entrou
                fora da janela fica aqui à espera da decisão do professor. */}
            {porDecidir.length > 0 && (
              <div style={{ background:'var(--copper-pale, #fdf0e6)', border:'1px solid var(--copper)',
                borderRadius:14, padding:16, marginTop:10 }}>
                <div style={{ fontSize:15.5, fontWeight:700, color:'var(--copper)' }}>
                  {porDecidir.length} {porDecidir.length === 1 ? 'aluno entrou' : 'alunos entraram'} fora do tempo
                </div>
                <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.65)', marginTop:4,
                  marginBottom:12, lineHeight:1.5 }}>
                  A aplicação registou a hora. A falta é decisão tua.
                </div>
                {porDecidir.map(p => (
                  <div key={p.alunoId} style={{ background:'#fff', borderRadius:12,
                    padding:'12px 14px', marginBottom:8 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--charcoal, #1a1714)' }}>
                      {nomeDe(p.alunoId)}
                    </div>
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginTop:2,
                      marginBottom:10 }}>
                      Entrou {p.atrasadoMins} min depois da abertura
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                      {(['sem_falta','falta_atraso','falta_presenca'] as const).map(d => (
                        <button key={d}
                          onClick={() => {
                            decidirFalta(p.alunoId, plano.id, d, nomeProfessor || 'professor');
                            onPlanoActualizado?.(plano);
                          }}
                          style={{ padding:'10px 4px', borderRadius:9, cursor:'pointer',
                            border:'1px solid var(--border, rgba(26,23,20,0.15))',
                            background:'#fff', fontSize:12.5, fontWeight:700,
                            color: d === 'sem_falta' ? 'var(--sage)'
                                 : d === 'falta_atraso' ? 'var(--copper)' : 'var(--danger, #c0392b)',
                            fontFamily:'inherit' }}>
                          {LABEL_DECISAO[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}


      {/* TAB ORIENTAÇÃO */}
      {tabInicio === 'turma' && (
        <div>
          <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', marginBottom:12,
            lineHeight:1.55 }}>
            Quem entrou, o estado da farda, os registos e as autoavaliações.
            As decisões de falta fazem-se aqui.
          </div>
          <TurmaNaAula
            planoAulaId={plano.id}
            turmaId={plano.turmaId}
            nomeProfessor={nomeProfessor}
            onAtualizar={() => onPlanoActualizado({ ...plano })}
            onValidar={(alunoId: string) => { setAlunoParaValidar(alunoId); setModulo('validacao'); }}
          />
        </div>
      )}

      {/* TAB COMPETÊNCIAS */}
      {tabInicio === 'competencias' && (
        <div>
          {/* De onde vem cada grupo. O ecrã dava só o total — "22
              competências" — e o professor não percebia porque é que
              aparecem tantas num plano ainda sem fichas. */}
          <div style={{ background: 'var(--copper-pale)', borderRadius: 12,
            padding: '14px 16px', marginBottom: 14,
            border: '1px solid rgba(181,101,29,0.25)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--copper)',
              marginBottom: 8 }}>
              {totalComp} competências nesta aula
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.7)',
              lineHeight: 1.8 }}>
              <div>
                <b>{compObrigatorias.length}</b> obrigatórias
                <span style={{ color: 'rgba(26,23,20,0.5)' }}>
                  {' '}— higiene, HACCP e assiduidade. Em todas as aulas práticas.
                </span>
              </div>
              <div>
                <b>{compAtitudes.length}</b> atitudes
                <span style={{ color: 'rgba(26,23,20,0.5)' }}>
                  {' '}— em qualquer aula, com ou sem produção.
                </span>
              </div>
              <div>
                <b>{compConhecimentos.length}</b> conhecimentos
                <span style={{ color: 'rgba(26,23,20,0.5)' }}>
                  {' '}— da unidade em curso.
                </span>
              </div>
              <div>
                <b>{compSub.length + compApp.length + compTecnicas.length}</b> técnicas
                <span style={{ color: 'rgba(26,23,20,0.5)' }}>
                  {' '}— {temFichas ? 'das fichas desta aula.' : 'nenhuma: esta aula ainda não tem fichas.'}
                </span>
              </div>
            </div>

            {!temFichas && (
              <div style={{ marginTop: 11, paddingTop: 11,
                borderTop: '1px solid rgba(181,101,29,0.25)',
                fontSize: 13.5, color: 'rgba(26,23,20,0.65)', lineHeight: 1.6 }}>
                Uma aula pode não ter competências técnicas a avaliar — e
                isso é normal. O que não sair nesta unidade é avaliado ao
                longo do ano, noutras aulas.
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sage)', marginBottom: 8 }}>🔒 Obrigatórias — sempre presentes</div>
            {compObrigatorias.map(c => (
              <div key={c.id} style={{ padding:'8px 12px', borderRadius:8, background:'var(--sage-pale)', marginBottom:6, border:'1px solid rgba(90,122,78,0.2)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize: 14 }}>✓</span>
                  <div style={{ flex:1, fontSize:13, fontWeight:600 }}>{c.nome}</div>
                  <span style={{ fontSize:13, color:'var(--sage)', fontWeight:600 }}>SEMPRE</span>
                </div>
                {Array.isArray((c as any).criterios) && (c as any).criterios.length > 0 && (
                  <ul style={{ margin:'6px 0 0 28px', padding:0 }}>
                    {(c as any).criterios.map((cr:any, i:number) => (
                      <li key={i} style={{ fontSize:13, color:'rgba(26,23,20,0.65)', marginBottom:2 }}>{cr.criterio}</li>
                    ))}
                  </ul>
                )}
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
                        <div style={{ fontSize: 13, color: 'rgba(181,101,29,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {(m as any).criterios?.length} critérios observáveis <span style={{ fontSize: 12.5 }}>{aberta ? '▲' : '▼'}</span>
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
                        <div key={i} style={{ fontSize: 13, color: 'rgba(26,23,20,0.7)', padding: '4px 0', borderBottom: i < (m as any).criterios?.length - 1 ? '1px solid rgba(181,101,29,0.08)' : 'none' }}>
                          <span style={{ color: 'var(--copper)', fontWeight: 600, marginRight: 6 }}>✓</span>
                          {cr.criterio}
                          {cr.como && <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.4)', marginTop: 2, marginLeft: 16 }}>{cr.como}</div>}
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
                          <div style={{ fontSize: 12.5, color: '#0f766e', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                          <div key={i} style={{ fontSize: 13, color: 'rgba(26,23,20,0.7)', padding: '4px 0', borderBottom: i < criterios.length-1 ? '1px solid rgba(15,118,110,0.08)' : 'none' }}>
                            <span style={{ color: '#0f766e', fontWeight: 700, marginRight: 6 }}>✓</span>
                            {cr.criterio}
                            {cr.como && <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.4)', marginTop: 2, marginLeft: 16 }}>{cr.como}</div>}
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
          <div style={{ padding: '12px 14px', background: 'var(--cream-dark)', borderRadius: 10, fontSize: 13, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Total: {totalComp} competências</div>
            <div style={{ color: 'rgba(26,23,20,0.5)' }}>{compObrigatorias.length} obrigatórias · {compTecnicas.length} técnicas · {compSubtecnicas.length > 0 ? `${compSubtecnicas.length} subtécnicas · ` : ''}{compAtitudes.length} atitudes{compRemovidas.length > 0 && ` · ${compRemovidas.length} removida${compRemovidas.length > 1 ? 's' : ''}`}</div>
            {totalComp > 7 && <div style={{ color: 'var(--copper)', marginTop: 6, fontWeight: 600 }}>⚠️ São muitas competências para uma aula.</div>}
            {totalComp <= 5 && <div style={{ color: 'var(--sage)', marginTop: 6, fontWeight: 600 }}>✓ Número adequado para uma aula.</div>}
          </div>
        </div>
      )}

      {/* TAB PREPARAR — era o Resumo. Recebeu da Orientação o que não
          estava repetido: a lista de verificação e o evento. */}
      {tabInicio === 'resumo' && (<>
      {/* Requisição feita antes de mudar as fichas — o pedido ao economato
          já não corresponde à aula. */}
      {(() => {
        const dif = requisicaoDesatualizada(plano.id);
        if (!dif) return null;
        const nome = (id: string) => getFichasProducao().find(f => f.id === id)?.nomePrato || 'ficha';
        return (
          <div style={{ background:'#fdf0e6', border:'1.5px solid var(--copper)', borderRadius:12,
            padding:'14px 16px', marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--copper)' }}>
              A requisição está desatualizada
            </div>
            <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.7)', margin:'4px 0 10px', lineHeight:1.55 }}>
              Mudaste as fichas depois de fazer a requisição.
              {dif.faltam.length > 0 && <div>· Não tem: {dif.faltam.map(nome).join(', ')}</div>}
              {dif.sobram.length > 0 && <div>· Tem a mais: {dif.sobram.map(nome).join(', ')}</div>}
            </div>
            <button onClick={() => setModulo('requisicao')} style={{ padding:'10px 16px', borderRadius:9,
              border:'none', background:'var(--copper)', color:'#fff', fontSize:14, fontWeight:700,
              cursor:'pointer', fontFamily:'inherit' }}>
              Atualizar a requisição
            </button>
          </div>
        );
      })()}
      {/* Aula atitudinal — o professor escolhe as atitudes a trabalhar,
          de todas as do curso. São estas que o aluno se autoavalia. */}
      {(plano as any).tipoPlanAula === 'atitudinal' && (
        <div style={{ background:'#fff', borderRadius:14, padding:18, marginBottom:16,
          border:'1.5px solid rgba(125,79,140,0.35)' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#7d4f8c' }}>
            Atitudes a trabalhar nesta aula
          </div>
          <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', margin:'4px 0 12px', lineHeight:1.5 }}>
            Aula atitudinal: sem farda, sem KitchenFlow, sem técnicas. Marca as atitudes
            que vais trabalhar — o aluno autoavalia-se nelas e tu validas. Contam para a
            nota da UC.
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {ATITUDES.map((at: any) => {
              const marcada = compAdicionadas.includes(at.id);
              return (
                <button key={at.id}
                  onClick={() => guardarCompetencias(compRemovidas,
                    marcada ? compAdicionadas.filter(x => x !== at.id) : [...compAdicionadas, at.id])}
                  style={{ padding:'8px 12px', borderRadius:20, fontSize:13.5, cursor:'pointer',
                    fontFamily:'inherit', fontWeight: marcada ? 700 : 500,
                    border:`1.5px solid ${marcada ? '#7d4f8c' : 'rgba(26,23,20,0.15)'}`,
                    background: marcada ? '#7d4f8c' : '#fff', color: marcada ? '#fff' : 'rgba(26,23,20,0.75)' }}>
                  {marcada ? '✓ ' : ''}{at.nome}
                </button>
              );
            })}
          </div>
          {compAdicionadas.filter(x => x.startsWith('ATI-')).length === 0 && (
            <div style={{ fontSize:13, color:'var(--copper)', marginTop:10, fontWeight:600 }}>
              Ainda não marcaste nenhuma — sem isto o aluno não tem o que avaliar.
            </div>
          )}
        </div>
      )}
      {/* ═══ O QUE ESTE PLANO TEM ═══════════════════════════════
          Duas colunas, para o ecrã de computador onde o professor prepara
          as aulas: à esquerda as fichas, com espaço para as manejar; à
          direita o estado do resto, sempre à vista.

          Antes o professor abria um plano e não sabia que fichas lá
          estavam, se havia guião, se a requisição estava feita — e não
          tinha como tirar uma ficha ou juntar outra sem sair daqui. */}
      {(() => {
        const temGuiao = fichasDoPlano.filter((f: any) => f.textoGuia).length;
        const B = '#7B2233';

        const estado = (feito: boolean, titulo: string, detalhe: string,
                        accao?: { rotulo: string; ao: () => void }) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 0', borderBottom: '1px solid rgba(26,23,20,0.07)' }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
              background: feito ? 'var(--sage)' : 'transparent',
              border: feito ? 'none' : '2px dashed rgba(26,23,20,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {feito && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff"
                  strokeWidth={3.4} strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
              )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700,
                color: feito ? 'var(--charcoal, #1a1714)' : 'rgba(26,23,20,0.55)' }}>
                {titulo}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginTop: 1 }}>
                {detalhe}
              </div>
            </div>
            {accao && (
              <button onClick={accao.ao} style={{
                flexShrink: 0, padding: '6px 11px', borderRadius: 8, fontSize: 12.5,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: '#fff',
                border: `1px solid ${feito ? 'rgba(26,23,20,0.15)' : 'var(--copper)'}`,
                color: feito ? 'rgba(26,23,20,0.6)' : 'var(--copper)',
              }}>{accao.rotulo}</button>
            )}
          </div>
        );

        return (
          /* Uma coluna: o estado da aula e o botão de publicar passaram
             para o menu do plano, à esquerda. Aqui ficam só as fichas,
             que é o que o professor vem mexer. */
          <div style={{ marginBottom: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 18,
              border: '1px solid rgba(26,23,20,0.1)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'rgba(26,23,20,0.4)', marginBottom: 12 }}>
                Fichas desta aula — {fichasDoPlano.length}
              </div>

              {fichasDoPlano.length === 0 && (
                <div style={{ padding: '16px 14px', borderRadius: 10, marginBottom: 12,
                  background: 'var(--copper-pale, #fdf0e6)', border: '1px solid var(--copper)',
                  fontSize: 13.5, color: 'var(--copper)', lineHeight: 1.55 }}>
                  Ainda não há fichas nesta aula. A requisição e as competências
                  técnicas saem delas — sem fichas, escolhes as competências à mão.
                </div>
              )}

              {fichasDoPlano.map((f: any) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', border: '1px solid rgba(26,23,20,0.1)',
                  borderRadius: 10, marginBottom: 7, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{f.nomePrato}</div>
                    <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>
                      {f.classificacao || 'Sem classificação'} · {f.numPorcoes || '?'} doses
                      {' · '}{f.ingredientes?.length || 0} ingredientes
                    </div>
                    <div style={{ fontSize: 13, marginTop: 1,
                      color: f.textoGuia ? 'var(--sage)' : 'rgba(26,23,20,0.38)',
                      fontWeight: f.textoGuia ? 700 : 400 }}>
                      {f.textoGuia ? 'com guião' : 'sem guião'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => { setFichaEmEdicao(f.id); setIrParaBiblioteca(false); setModulo('ficha'); }}
                      style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12.5,
                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        border: '1px solid rgba(26,23,20,0.16)', background: '#fff',
                        color: 'rgba(26,23,20,0.7)' }}>
                      Abrir
                    </button>
                    <button onClick={() => {
                        if (!confirm(`Tirar "${f.nomePrato}" desta aula?\n\nA ficha continua na biblioteca — só deixa de estar neste plano.`)) return;
                        const p = {
                          ...planoFresco(),
                          fichasIds: (plano.fichasIds || []).filter((id: string) => id !== f.id),
                          atualizadoEm: new Date().toISOString(),
                        };
                        addOrUpdatePlanoAula(p);
                        onPlanoActualizado(p);
                      }}
                      style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12.5,
                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        border: '1px solid var(--danger, #c0392b)', background: '#fff',
                        color: 'var(--danger, #c0392b)' }}>
                      Tirar
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button onClick={() => { setFichaEmEdicao(null); setIrParaBiblioteca(false); setModulo('ficha'); }}
                  style={{ flex: '1 1 130px', padding: '12px', borderRadius: 10, border: 'none',
                    background: 'var(--copper)', color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit' }}>
                  Nova ficha
                </button>
                <button onClick={() => { setFichaEmEdicao(null); setIrParaBiblioteca(true); setModulo('ficha'); }}
                  style={{ flex: '1 1 150px', padding: '12px', borderRadius: 10,
                    border: '1.5px solid var(--copper)', background: '#fff',
                    color: 'var(--copper)', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit' }}>
                  Ir buscar à biblioteca
                </button>
              </div>
            </div>

          </div>
        );
      })()}

        {/* Lista de verificação — o que falta antes da aula */}
        <div style={{ background:'#E6F1FB', borderRadius:14, padding:'14px 16px',
          border:'1.5px solid #B5D4F4', marginBottom:14 }}>
          <div style={{ fontSize:13.5, fontWeight:700, color:'#0C447C', marginBottom:10 }}>
            Antes de começar
          </div>
          {[
            { ok: temFichas, label: 'Fichas de produção criadas',
              acao: () => setModulo('ficha'), acaoLabel: 'Criar' },
            { ok: fichasDoPlano.some((f: any) => f.textoGuia), label: 'Guião de produção',
              acao: () => setModulo('guia'), acaoLabel: 'Gerar' },
            { ok: temRequisicao, label: 'Requisição enviada',
              acao: () => setModulo('requisicao'), acaoLabel: 'Fazer' },
            { ok: publicado, label: 'Plano publicado para os alunos',
              acao: null, acaoLabel: '' },
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
              padding:'10px 12px', borderRadius:9, marginBottom:6,
              background: item.ok ? '#EAF3DE' : '#fff',
              border:`1px solid ${item.ok ? '#C0DD97' : 'rgba(14,116,144,0.2)'}` }}>
              <span style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                background: item.ok ? 'var(--sage)' : 'transparent',
                border: item.ok ? 'none' : '2px dashed rgba(26,23,20,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {item.ok && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff"
                    strokeWidth={3.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                )}
              </span>
              <span style={{ flex:1, fontSize:14,
                color: item.ok ? 'rgba(26,23,20,0.75)' : 'rgba(26,23,20,0.55)' }}>
                {item.label}
              </span>
              {!item.ok && item.acao && (
                <button onClick={item.acao} style={{ padding:'6px 12px', borderRadius:8,
                  border:'1px solid #0e7490', background:'#fff', color:'#0e7490',
                  fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {item.acaoLabel}
                </button>
              )}
            </div>
          ))}
        </div>


        {/* ═══ O QUE ESTE PLANO TEM ═══════════════════════════
            Duas colunas: à esquerda o que já está, à direita o que se
            pode juntar. Nada é obrigatório — mas o professor tem de
            perceber o que ganha e o que perde em cada escolha. */}
        {(() => {
          const B = '#7B2233', BS = '#F6ECEE';
          const temFicha = fichasDoPlano.length > 0;
          const temGuiao = fichasDoPlano.some((f: any) => f.textoGuia);
          const temReq = !!getRequisicaoPorPlano(plano.id);
          const pratico = (plano as any).tipoPlanAula !== 'teorico';

          const linha = (
            feito: boolean, titulo: string, detalhe: string,
            accao?: { texto: string; ao: () => void }
          ) => (
            <div style={{ display:'flex', alignItems:'flex-start', gap:11,
              padding:'12px 0', borderBottom:'1px solid rgba(26,23,20,0.07)' }}>
              <span style={{ width:22, height:22, borderRadius:7, flexShrink:0, marginTop:1,
                background: feito ? 'var(--sage)' : 'transparent',
                border: feito ? 'none' : '2px dashed rgba(26,23,20,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {feito && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff"
                    strokeWidth={3.2} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                )}
              </span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14.5, fontWeight:700,
                  color: feito ? 'var(--charcoal, #1a1714)' : 'rgba(26,23,20,0.55)' }}>
                  {titulo}
                </div>
                <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginTop:2,
                  lineHeight:1.5 }}>{detalhe}</div>
              </div>
              {accao && (
                <button onClick={accao.ao} style={{
                  flexShrink:0, padding:'7px 12px', borderRadius:9, fontSize:12.5,
                  fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  border:`1px solid ${feito ? 'rgba(26,23,20,0.15)' : B}`,
                  background:'#fff', color: feito ? 'rgba(26,23,20,0.6)' : B,
                }}>{accao.texto}</button>
              )}
            </div>
          );

          return (
            <div style={{ display:'grid', gap:14, marginBottom:18,
              gridTemplateColumns:'repeat(auto-fit, minmax(290px, 1fr))' }}>

              {/* ── Coluna 1: o que está no plano ── */}
              <div style={{ background:'#fff', borderRadius:14, padding:16,
                border:'1px solid rgba(26,23,20,0.08)' }}>
                <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.07em',
                  textTransform:'uppercase', color:B, marginBottom:10 }}>
                  O que este plano tem
                </div>

                {linha(temFicha,
                  temFicha ? `${fichasDoPlano.length} ficha${fichasDoPlano.length > 1 ? 's' : ''} técnica${fichasDoPlano.length > 1 ? 's' : ''}` : 'Sem ficha técnica',
                  temFicha
                    ? fichasDoPlano.map((f: any) => f.nomePrato).join(' · ')
                    : 'As competências técnicas vêm das fichas. Sem ficha, tens de as escolher à mão.',
                  { texto: temFicha ? 'Ver' : 'Criar', ao: () => setModulo('ficha') })}

                {linha(temGuiao,
                  temGuiao ? 'Guião de produção' : 'Sem guião',
                  temGuiao
                    ? 'O aluno tem o passo a passo e as explicações.'
                    : 'Opcional. Sem ele, o aluno segue só a ficha.',
                  { texto: temGuiao ? 'Ver' : 'Juntar', ao: () => setModulo('guia') })}

                {linha(temReq,
                  temReq ? 'Requisição feita' : 'Sem requisição',
                  temReq
                    ? 'Os ingredientes estão pedidos.'
                    : 'Opcional. Serve para pedir o que é preciso e saber o custo.',
                  { texto: temReq ? 'Ver' : 'Fazer', ao: () => setModulo('requisicao') })}

                <div style={{ marginTop:14, paddingTop:12,
                  borderTop:'1px solid rgba(26,23,20,0.07)' }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:'rgba(26,23,20,0.5)',
                    marginBottom:8 }}>
                    O que vai ser avaliado
                  </div>
                  <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.7)', lineHeight:1.7 }}>
                    <div>
                      <b>{compAtitudes.length}</b> atitudes
                      <span style={{ color:'rgba(26,23,20,0.45)' }}> — sempre, em qualquer aula</span>
                    </div>
                    {pratico && (
                      <div>
                        <b>{compObrigatorias.length}</b> obrigatórias
                        <span style={{ color:'rgba(26,23,20,0.45)' }}> — sempre, em aula prática</span>
                      </div>
                    )}
                    <div>
                      <b>{compTecnicas.length + compSubtecnicas.length}</b> técnicas
                      <span style={{ color:'rgba(26,23,20,0.45)' }}>
                        {temFicha ? ' — das fichas' : ' — escolhidas por ti'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Coluna 2: o que se pode juntar ── */}
              <div style={{ background:BS, borderRadius:14, padding:16,
                border:`1px solid ${B}22` }}>
                <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.07em',
                  textTransform:'uppercase', color:B, marginBottom:10 }}>
                  O que podes juntar
                </div>

                {!temFicha && (
                  <div style={{ background:'#fff', borderRadius:11, padding:13, marginBottom:9 }}>
                    <div style={{ fontSize:14.5, fontWeight:700 }}>Ficha técnica</div>
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', marginTop:3,
                      lineHeight:1.5, marginBottom:10 }}>
                      Traz as técnicas, os ingredientes e os alergénios. É o que
                      faz as competências aparecerem sozinhas.
                    </div>
                    <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                      <button onClick={() => { setFichaEmEdicao(null); setModulo('ficha'); }}
                        style={{ flex:1, minWidth:110, padding:'10px', borderRadius:9,
                          border:'none', background:B, color:'#fff', fontSize:13,
                          fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        Criar nova
                      </button>
                      <button onClick={() => { setFichaEmEdicao(null); setIrParaBiblioteca(true); setModulo('ficha'); }}
                        style={{ flex:1, minWidth:110, padding:'10px', borderRadius:9,
                          border:`1.5px solid ${B}`, background:'#fff', color:B,
                          fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        Ir buscar uma
                      </button>
                    </div>
                  </div>
                )}

                {temFicha && (
                  <div style={{ background:'#fff', borderRadius:11, padding:13, marginBottom:9 }}>
                    <div style={{ fontSize:14.5, fontWeight:700 }}>Outra ficha</div>
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', marginTop:3,
                      lineHeight:1.5, marginBottom:10 }}>
                      Uma aula pode ter várias produções.
                    </div>
                    <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                      <button onClick={() => { setFichaEmEdicao(null); setModulo('ficha'); }}
                        style={{ flex:1, minWidth:110, padding:'10px', borderRadius:9,
                          border:'none', background:B, color:'#fff', fontSize:13,
                          fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        Criar nova
                      </button>
                      <button onClick={() => { setFichaEmEdicao(null); setIrParaBiblioteca(true); setModulo('ficha'); }}
                        style={{ flex:1, minWidth:110, padding:'10px', borderRadius:9,
                          border:`1.5px solid ${B}`, background:'#fff', color:B,
                          fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        Ir buscar uma
                      </button>
                    </div>
                  </div>
                )}

                {!temGuiao && temFicha && (
                  <div style={{ background:'#fff', borderRadius:11, padding:13, marginBottom:9 }}>
                    <div style={{ fontSize:14.5, fontWeight:700 }}>Guião</div>
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', marginTop:3,
                      lineHeight:1.5, marginBottom:10 }}>
                      Explica o porquê de cada passo. Ajuda quem tem mais
                      dificuldade a seguir a produção sozinho.
                    </div>
                    <button onClick={() => setModulo('guia')}
                      style={{ width:'100%', padding:'10px', borderRadius:9,
                        border:`1.5px solid ${B}`, background:'#fff', color:B,
                        fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Escrever guião
                    </button>
                  </div>
                )}

                {!temReq && temFicha && (
                  <div style={{ background:'#fff', borderRadius:11, padding:13, marginBottom:9 }}>
                    <div style={{ fontSize:14.5, fontWeight:700 }}>Requisição</div>
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', marginTop:3,
                      lineHeight:1.5, marginBottom:10 }}>
                      Sai dos ingredientes das fichas. Dá o custo da aula e a
                      lista para o economato.
                    </div>
                    <button onClick={() => setModulo('requisicao')}
                      style={{ width:'100%', padding:'10px', borderRadius:9,
                        border:`1.5px solid ${B}`, background:'#fff', color:B,
                        fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Fazer requisição
                    </button>
                  </div>
                )}

                {!temFicha && (
                  <div style={{ background:'#fff', borderRadius:11, padding:13 }}>
                    <div style={{ fontSize:14.5, fontWeight:700 }}>Escolher competências à mão</div>
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', marginTop:3,
                      lineHeight:1.5, marginBottom:10 }}>
                      Se não vais usar ficha, define tu o que vai ser avaliado.
                      As atitudes e as obrigatórias já estão garantidas.
                    </div>
                    <button onClick={() => setTabInicio('competencias')}
                      style={{ width:'100%', padding:'10px', borderRadius:9,
                        border:`1.5px solid ${B}`, background:'#fff', color:B,
                        fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Escolher competências
                    </button>
                  </div>
                )}

                {temFicha && temGuiao && temReq && (
                  <div style={{ background:'rgba(90,122,78,0.1)', borderRadius:11, padding:14,
                    fontSize:13.5, color:'var(--sage)', lineHeight:1.55, fontWeight:600 }}>
                    Está tudo. Falta só publicar para os alunos verem a aula.
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {fichasDoPlano.length > 0 && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--cream-dark)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(26,23,20,0.4)', marginBottom: 8 }}>Fichas de Produção — {fichasDoPlano.length}</div>
            {/* Cada ficha com o que se pode fazer com ela. A lista só
                mostrava os nomes: não havia como tirar uma ficha do plano,
                abrir a que está errada, ou acrescentar outra sem sair
                daqui. */}
            {fichasDoPlano.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start',
                gap: 10, padding: '11px 0', borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{f.nomePrato}</div>
                  <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>
                    {f.classificacao} · {f.numPorcoes} doses
                    {(f as any).textoGuia
                      ? <b style={{ color: 'var(--sage)' }}> · com guião</b>
                      : ' · sem guião'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => { setFichaEmEdicao(f.id); setModulo('ficha'); }}
                    style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12.5,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
                      color: 'rgba(26,23,20,0.7)' }}>
                    Abrir
                  </button>
                  <button onClick={() => {
                      if (!confirm(`Tirar "${f.nomePrato}" deste plano?\n\nA ficha continua na biblioteca — só deixa de estar nesta aula.`)) return;
                      const p = {
                        ...planoFresco(),
                        fichasIds: (plano.fichasIds || []).filter((id: string) => id !== f.id),
                        atualizadoEm: new Date().toISOString(),
                      };
                      addOrUpdatePlanoAula(p);
                      onPlanoActualizado(p);
                    }}
                    style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12.5,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      border: '1px solid var(--danger, #c0392b)', background: '#fff',
                      color: 'var(--danger, #c0392b)' }}>
                    Tirar
                  </button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
              <button onClick={() => { setFichaEmEdicao(null); setIrParaBiblioteca(false); setModulo('ficha'); }}
                style={{ flex: '1 1 130px', padding: '11px', borderRadius: 10,
                  border: 'none', background: 'var(--copper)', color: '#fff',
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Nova ficha
              </button>
              <button onClick={() => { setFichaEmEdicao(null); setIrParaBiblioteca(true); setModulo('ficha'); }}
                style={{ flex: '1 1 130px', padding: '11px', borderRadius: 10,
                  border: '1.5px solid var(--copper)', background: '#fff',
                  color: 'var(--copper)', fontSize: 13.5, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit' }}>
                Biblioteca
              </button>
            </div>
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
            <div style={{ fontSize: 13, color: 'var(--sage)', marginBottom: 6, fontWeight: 600 }}>
              Última publicação: {fmtData(plano.atualizadoEm)} às {new Date(plano.atualizadoEm).toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit' })}
            </div>
          )}
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 10 }}>{publicado ? 'Os alunos vêem sempre a versão mais recente.' : 'Quando estiver pronto, publica para os alunos poderem aceder.'}</div>
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
                <div style={{ fontSize: 12.5, color: 'var(--sage)', textAlign: 'center' }}>
                  Sheets e Classroom notificados · Os alunos vêem o aviso ao refrescar a app
                </div>
              )}
            </div>
          ) : (
            <button onClick={publicar} disabled={aPublicar} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'var(--copper)', color:'white', fontWeight:700, fontSize:14, cursor: aPublicar ? 'default' : 'pointer', opacity: aPublicar ? 0.6 : 1 }}>
              {aPublicar ? 'A publicar e a confirmar…' : '🚀 Publicar esta aula para os alunos'}
            </button>
          )}
        </div>
        {/* Evento pedagógico — um almoço, uma mostra. */}
        <EventoAssociador plano={plano} turmaId={turmaId} onPlanoActualizado={onPlanoActualizado} />

      </>)}
    </div>
  );
}

export default VistaDePlano;
