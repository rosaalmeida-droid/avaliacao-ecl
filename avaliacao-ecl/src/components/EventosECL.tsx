// ============================================================
// Eventos da ECL — o ecrã
// ============================================================
// O mesmo espírito do Início do professor: cartões grandes, uma coisa de
// cada vez, e a aplicação diz o que falta.
//   • Lista: cada evento com a data, a preparação e a próxima ação.
//   • Novo evento: perguntas grandes, uma de cada vez, respostas por toque.
//   • O evento: o cartão «AGORA» (responde-se ali mesmo) e cartões grandes
//     para cada parte — Pedido, Perguntas ao cliente, Local, Fichas e
//     orçamentos, Preparação, Material, Dia do evento, Fechar.
// A lógica está em ../eventos/modelo.ts.
// ============================================================
import { janelaConfirmar } from './janelaConfirmar';
import { eventosDosPlanosEmFalta, planosDoEvento, criarAvaliacaoDoEvento, passarParaInscricoes } from '../eventos/doPlano';
import { modulosAtivos } from '../cronograma';
import { EventosWizard } from './EventosWizard';
import React, { useEffect, useMemo, useState } from 'react';
import {
  getTurmas, gravarEvento, apagarEvento, lerEventosLocais, sincronizarEventos, proximoNumeroEvento,
  getFichasProducao, getRequisicoes, getPlanosAula, eventoForaDoHorario, modoParticipacao, inscritosNoEvento, participantesDoEvento,
  addOrUpdatePlanoAula,
} from '../backend';
import Requisicao, { custoDaFicha } from './Requisicao';
import { LOGO_ECL } from '../logo_ecl';
import { quantidadesDoMomento, divergenciasPorEscolher, DURACOES, tipoDoMomento, equivalenteAdulto } from '../eventos/capitacoes';
import {
  type EventoECL, type Resp3, type Tarefa, type OrcamentoEvento, type Acao, type ExtraOrcamento,
  MOMENTOS, nomeMomento, TIPOS_EVENTO, SERVICOS, NIVEIS, ESTILOS, PUBLICOS, NECESSIDADES, OUTRAS_AREAS,
  eventoNovo, classificar, perguntasAoCliente, perguntasEmFalta, tarefasDoEvento, dataDaTarefa, hojeISO,
  proximaAcao, preparacao, pendenciasDoLocal, precisaVisita, pronto, textoPerguntas, pedidoMenuIA, eFora,
  faltaNoPedido, faltaNoServico,
} from '../eventos/modelo';

// ── Aparência (a mesma do Início do professor) ─────────────────
const C = {
  fundo: '#F5F2F3', branco: '#FFFFFF', bordeaux: '#7B2233', bordeauxEscuro: '#5E1826',
  bordeauxSuave: '#F6ECEE', bordeauxClaro: '#EBCDD3', tinta: '#1A1A1A', texto: '#555555', suave: '#777777',
  sombra: '0 1px 3px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.04)',
  verde: '#3E7A31', verdeSuave: '#E8F3E5', ambar: '#B5651D', ambarSuave: '#FDF0E8', vermelho: '#C0392B', vermelhoSuave: '#FDF0EF',
};
const cartao: React.CSSProperties = { background: C.branco, borderRadius: 16, padding: 18, marginBottom: 12, boxShadow: C.sombra };
const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.suave, margin: '18px 2px 10px' };
const campo: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12,
  border: '1.5px solid #E4DDE0', fontSize: 16, fontFamily: 'inherit', background: '#fff', color: C.tinta };
const botao = (tipo: 'principal' | 'claro' | 'verde' | 'perigo' = 'claro'): React.CSSProperties => ({
  minHeight: 48, padding: '12px 18px', borderRadius: 12, fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  border: tipo === 'claro' ? `1.5px solid ${C.bordeauxClaro}` : tipo === 'perigo' ? `1.5px solid #F0C6C1` : 'none',
  background: tipo === 'principal' ? C.bordeaux : tipo === 'verde' ? C.verde : '#fff',
  color: tipo === 'principal' || tipo === 'verde' ? '#fff' : tipo === 'perigo' ? C.vermelho : C.bordeaux,
});
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const dataPT = (iso: string) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';
const diaSemana = (iso: string) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
const diasAte = (iso: string) => iso ? Math.round((new Date(iso + 'T12:00:00').getTime() - new Date(hojeISO() + 'T12:00:00').getTime()) / 86400000) : null;
const euros = (n?: number) => (n || 0).toFixed(2).replace('.', ',') + ' €';
const ESTADOS: Record<EventoECL['estado'], string> = {
  pedido: 'Pedido', proposta: 'Proposta enviada', confirmado: 'Confirmado', realizado: 'Realizado', fechado: 'Fechado', cancelado: 'Cancelado',
};
const ICONE_MOMENTO: Record<string, string> = { welcome: '🥂', pequeno_almoco: '🥐', coffee_manha: '☕', brunch: '🍳', almoco: '🍽️',
  coffee_tarde: '☕', lanche: '🧁', cocktail: '🍸', jantar: '🌙', meal_box: '🥡', outro: '✳️' };

function BlocoData({ iso, claro = false }: { iso: string; claro?: boolean }) {
  const d = iso ? new Date(iso + 'T12:00:00') : null;
  return (
    <div style={{ width: 58, minWidth: 58, height: 62, borderRadius: 14, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: claro ? 'rgba(255,255,255,0.16)' : C.bordeaux, color: '#fff' }}>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{d ? d.getDate() : '?'}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', marginTop: 3, opacity: 0.9 }}>{d ? MESES[d.getMonth()] : '—'}</div>
    </div>
  );
}

/** Botão grande de escolha — como no resto da aplicação. */
function Opcao({ ativo, onClick, icone, children, sub }: { ativo: boolean; onClick: () => void; icone?: string; children: React.ReactNode; sub?: string }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
      minHeight: 56, padding: '12px 16px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
      border: ativo ? 'none' : '1.5px solid #EDE6E9', background: ativo ? C.bordeaux : C.branco, color: ativo ? '#fff' : C.tinta,
      boxShadow: ativo ? '0 3px 10px rgba(123,34,51,0.25)' : C.sombra }}>
      {icone && <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{icone}</span>}
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{children}</span>
        {sub && <span style={{ display: 'block', fontSize: 13, opacity: ativo ? 0.85 : 0.6, marginTop: 1 }}>{sub}</span>}
      </span>
      {ativo && <span style={{ fontSize: 18, fontWeight: 800 }}>✓</span>}
    </button>
  );
}

/** Pastilha de escolha múltipla (turmas, estilos…). */
function Pastilha({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ minHeight: 46, padding: '10px 16px', borderRadius: 24, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
      fontWeight: ativo ? 800 : 600, border: ativo ? 'none' : '1.5px solid #EDE6E9', background: ativo ? C.bordeaux : C.branco,
      color: ativo ? '#fff' : C.tinta, boxShadow: ativo ? 'none' : C.sombra }}>
      {ativo ? '✓ ' : ''}{children}
    </button>
  );
}

const grelha = (min = 150): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 10 });

// ══════════════════════════════════════════════════════════════
// 1. A LISTA
// ══════════════════════════════════════════════════════════════

export function EventosECL({ turmaId, nomeProfessor, onNovoPlano, onAbrirPlano, semAvaliacao }: {
  turmaId?: string; nomeProfessor?: string;
  /** Área «Eventos e orçamentos»: sem a avaliação dos alunos nem concursos e
   *  atividades (são planos de aula). Por omissão, desligado: o professor e a
   *  coordenação veem tudo como antes. */
  semAvaliacao?: boolean;
  /** Concurso ou outra atividade: cria-se o plano de avaliação (tipo de atividade). */
  onNovoPlano?: (tipoAtividade: string) => void;
  onAbrirPlano?: (plano: any) => void;
}) {
  const [escolherTipo, setEscolherTipo] = useState(false);
  const [versao, setVersao] = useState(0);
  const [aberto, setAberto] = useState<string | null>(null);
  const [emTriagem, setEmTriagem] = useState<EventoECL | null>(null);
  const [verTodos, setVerTodos] = useState(!turmaId);
  // Eventos do ecrã antigo: ficavam só neste aparelho. Continuam à vista.
  const [verAntigos, setVerAntigos] = useState(false);
  const antigos = useMemo(() => { try { return JSON.parse(localStorage.getItem('ecl_eventos_v3') || '[]').length as number; } catch { return 0; } }, []);
  const eventos = useMemo(() => lerEventosLocais<EventoECL>().filter(e => e.versao === 4)
    // Um evento gravado por uma versão anterior pode não ter todos os campos
    // (listas, perguntas, fecho…): completa-se com os de um evento novo.
    .map(e => { const base = eventoNovo(e.numero || 0, ''); return { ...base, ...e,
      local: { ...base.local, ...(e.local || {}) }, fecho: e.fecho || {}, perguntas: e.perguntas || {}, tarefas: e.tarefas || {},
      alteracoes: e.alteracoes || [], momentos: e.momentos || [], turmasIds: e.turmasIds || [], outrasAreas: e.outrasAreas || [],
      estilos: e.estilos || [], publico: e.publico || [], necessidadesQuais: e.necessidadesQuais || [],
      fichasIds: e.fichasIds || [], orcamentos: e.orcamentos || [] }; })
    .sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999')), [versao]);

  // Depois de ler os eventos da escola: os planos de evento sem evento
  // («Avaliar evento fora do horário») passam a aparecer aqui.
  useEffect(() => { sincronizarEventos().then(ok => { if (ok) { eventosDosPlanosEmFalta(); setVersao(v => v + 1); } }); }, []);
  const guardar = (e: EventoECL) => { gravarEvento({ ...e, atualizadoEm: new Date().toISOString() }); setVersao(v => v + 1); };

  const fundo = (filhos: React.ReactNode) => (
    <div style={{ background: C.fundo, minHeight: '100%', padding: '14px 12px 40px', borderRadius: 16 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>{filhos}</div>
    </div>
  );

  if (verAntigos) {
    return fundo(<>
      <button onClick={() => setVerAntigos(false)} style={{ ...botao(), marginBottom: 12 }}>← Voltar aos eventos</button>
      <EventosWizard turmaId={turmaId || ''} nomeProfessor={nomeProfessor} />
    </>);
  }
  if (escolherTipo) {
    const novoEvento = (onde: 'ecl' | 'fora') => { setEscolherTipo(false); setEmTriagem({ ...eventoNovo(proximoNumeroEvento(), nomeProfessor || ''), onde }); };
    const OPCOES: { icone: string; nome: string; sub: string; ir: () => void }[] = [
      { icone: '🚐', nome: 'Evento externo', sub: 'para fora da escola ou para uma entidade: catering e serviço', ir: () => novoEvento('fora') },
      { icone: '🏫', nome: 'Evento interno', sub: 'na ECL: catering e serviço', ir: () => novoEvento('ecl') },
      { icone: '🏆', nome: 'Concurso', sub: 'avalia-se a participação dos alunos', ir: () => { setEscolherTipo(false); onNovoPlano?.('Concurso'); } },
      { icone: '✳️', nome: 'Atividade extra', sub: 'visita, feira, outra atividade — na escola ou fora', ir: () => { setEscolherTipo(false); onNovoPlano?.('Atividade fora da escola'); } },
    ];
    return fundo(<>
      <button onClick={() => setEscolherTipo(false)} style={{ ...botao(), minHeight: 40, padding: '8px 14px', fontSize: 14, marginBottom: 12 }}>← Voltar</button>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.tinta, margin: '0 2px 6px' }}>O que é?</div>
      <div style={{ fontSize: 14.5, color: C.texto, margin: '0 2px 14px' }}>A seguir escolhes quem vai: a turma toda (obrigatório) ou os alunos candidatam-se e tu aceitas.</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {OPCOES.filter(o => o.nome.startsWith('Evento') || onNovoPlano).map(o => <Opcao key={o.nome} ativo={false} icone={o.icone} sub={o.sub} onClick={o.ir}>{o.nome}</Opcao>)}
      </div>
    </>);
  }
  if (emTriagem) {
    return fundo(<Triagem inicial={emTriagem} onCancelar={() => setEmTriagem(null)}
      onConcluir={(e) => { guardar(e); setEmTriagem(null); setAberto(e.id); }} />);
  }
  const ev = aberto ? eventos.find(e => e.id === aberto) : null;
  if (ev) {
    return fundo(<PainelEvento evento={ev} onVoltar={() => setAberto(null)} onGuardar={guardar}
      onEditar={() => setEmTriagem(ev)} nomeProfessor={nomeProfessor} semAvaliacao={semAvaliacao}
      onApagar={() => { apagarEvento(ev.id); setAberto(null); setVersao(v => v + 1); }} />);
  }

  const daTurma = (e: EventoECL) => !turmaId || e.turmasIds.includes(turmaId) || e.criadoPor === nomeProfessor;
  const ativos = eventos.filter(e => !['fechado', 'cancelado'].includes(e.estado) && (verTodos || daTurma(e)));
  const arquivo = eventos.filter(e => ['fechado', 'cancelado'].includes(e.estado));
  // Concursos e outras atividades: só o plano de avaliação (sem catering).
  const outras = (getPlanosAula() as any[]).filter(p => eventoForaDoHorario(p) && p.estado !== 'arquivado' && !p.eventoId
    && (verTodos || !turmaId || p.turmaId === turmaId))
    .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));

  return fundo(
    <>
      <button onClick={() => setEscolherTipo(true)} style={{
        width: '100%', background: C.bordeaux, color: '#fff', border: 'none', borderRadius: 18, padding: '22px 20px',
        display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        boxShadow: '0 4px 16px rgba(123,34,51,0.25)' }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.16)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 300 }}>+</span>
        <span>
          <span style={{ display: 'block', fontSize: 19, fontWeight: 800 }}>Nova atividade</span>
          <span style={{ display: 'block', fontSize: 14, color: C.bordeauxClaro, marginTop: 2 }}>Evento externo ou interno, concurso ou outra atividade.</span>
        </span>
      </button>

      <div style={{ ...rotulo, display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1 }}>Próximos eventos</span>
        {turmaId && (
          <button onClick={() => setVerTodos(!verTodos)} style={{ background: 'none', border: 'none', color: C.bordeaux, fontWeight: 700,
            fontSize: 12.5, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
            {verTodos ? `Só os do ${turmaId}` : 'Ver de todas as turmas'}
          </button>
        )}
      </div>

      {ativos.length === 0 && (
        <div style={{ ...cartao, textAlign: 'center', padding: 30, color: C.suave, fontSize: 15 }}>
          Ainda não há eventos{turmaId && !verTodos ? ` com o ${turmaId}` : ''}.
        </div>
      )}

      {ativos.map(e => {
        const prep = preparacao(e);
        const acao = proximaAcao(e);
        const faltam = diasAte(e.data);
        return (
          <button key={e.id} onClick={() => setAberto(e.id)} style={{ ...cartao, width: '100%', textAlign: 'left', cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', gap: 14, border: 'none', alignItems: 'stretch' }}>
            <BlocoData iso={e.data} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 17, fontWeight: 800, color: C.tinta }}>{e.nome || 'Evento sem nome'}</span>
              <span style={{ display: 'block', fontSize: 14, color: C.texto, marginTop: 2 }}>
                {[e.onde === 'ecl' ? 'Na ECL' : e.onde === 'fora' ? (e.morada || 'Fora da ECL') : 'Local por definir',
                  e.pessoas ? `${e.pessoas} pessoas` : '', faltam !== null && faltam >= 0 ? (faltam === 0 ? 'hoje' : `daqui a ${faltam} dias`) : '']
                  .filter(Boolean).join(' · ')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ flex: 1, height: 7, background: C.bordeauxSuave, borderRadius: 4, overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: 7, width: `${prep.pct}%`, background: prep.pct === 100 ? C.verde : C.bordeaux }} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.bordeaux }}>{prep.pct}%</span>
              </span>
              {acao && (
                <span style={{ display: 'block', fontSize: 14, marginTop: 8, color: acao.atrasada ? C.vermelho : C.tinta }}>
                  <b style={{ color: acao.atrasada ? C.vermelho : C.bordeaux }}>Agora ›</b> {acao.texto}
                </span>
              )}
            </span>
          </button>
        );
      })}

      {!semAvaliacao && outras.length > 0 && (<>
        <div style={rotulo}>Concursos e outras atividades</div>
        {outras.map(p => {
          const turma = modoParticipacao(p) === 'turma';
          const insc = turma ? 0 : inscritosNoEvento(p.id).length, aceites = turma ? 0 : participantesDoEvento(p).length;
          return (
            <button key={p.id} onClick={() => onAbrirPlano?.(p)} style={{ ...cartao, width: '100%', textAlign: 'left', cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', gap: 14, border: 'none', alignItems: 'center' }}>
              <BlocoData iso={String(p.data || '').slice(0, 10)} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 800, color: C.tinta }}>{p.tipoEvento === 'concurso' ? '🏆 ' : ''}{p.titulo || 'Atividade'}</span>
                <span style={{ display: 'block', fontSize: 14, color: C.texto, marginTop: 2 }}>
                  {[p.tipoAtividade, p.turmaId, turma ? 'Todos (obrigatório)' : `Candidaturas: ${insc} inscrito${insc === 1 ? '' : 's'}, ${aceites} aceite${aceites === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          );
        })}
      </>)}

      {arquivo.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary style={{ ...rotulo, cursor: 'pointer', margin: '0 2px 10px' }}>Fechados e cancelados ({arquivo.length})</summary>
          {arquivo.map(e => (
            <button key={e.id} onClick={() => setAberto(e.id)} style={{ ...cartao, width: '100%', textAlign: 'left', cursor: 'pointer',
              fontFamily: 'inherit', border: 'none', display: 'flex', gap: 12, alignItems: 'center', opacity: 0.75 }}>
              <BlocoData iso={e.data} />
              <span><b>{e.nome}</b><br /><span style={{ fontSize: 13.5, color: C.suave }}>{ESTADOS[e.estado]}</span></span>
            </button>
          ))}
        </details>
      )}

      {!semAvaliacao && antigos > 0 && (
        <button onClick={() => setVerAntigos(true)} style={{ background: 'none', border: 'none', color: C.suave, fontSize: 13.5,
          textDecoration: 'underline', cursor: 'pointer', marginTop: 14, fontFamily: 'inherit' }}>
          Eventos do ecrã antigo, guardados neste aparelho ({antigos})
        </button>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// 2. NOVO EVENTO — uma pergunta de cada vez
// ══════════════════════════════════════════════════════════════

interface PerguntaTriagem {
  id: string;
  titulo: string;
  ajuda?: string;
  mostrar?: (e: EventoECL) => boolean;
  feita: (e: EventoECL) => boolean;
  opcional?: boolean;
  corpo: (e: EventoECL, mudar: (p: Partial<EventoECL>) => void, avancar: () => void) => React.ReactNode;
}

const R3: { v: Resp3; t: string; i: string }[] = [{ v: 'sim', t: 'Sim', i: '👍' }, { v: 'nao', t: 'Não', i: '✋' }, { v: 'nao_sei', t: 'Não sei', i: '🤔' }];
const lista = (filhos: React.ReactNode) => <div style={{ display: 'grid', gap: 10 }}>{filhos}</div>;

function perguntaLocal(id: keyof EventoECL['local'], titulo: string, ajuda: string): PerguntaTriagem {
  return {
    id: 'local_' + id, titulo, ajuda, mostrar: eFora, feita: e => !!e.local[id],
    corpo: (e, mudar, avancar) => lista(R3.map(o => (
      <Opcao key={o.v} icone={o.i} ativo={e.local[id] === o.v} onClick={() => { mudar({ local: { ...e.local, [id]: o.v } }); avancar(); }}>{o.t}</Opcao>
    ))),
  };
}

const PERGUNTAS: PerguntaTriagem[] = [
  { id: 'nome', titulo: 'Como se chama o evento?', feita: e => !!e.nome.trim(),
    corpo: (e, mudar) => <input autoFocus value={e.nome} onChange={x => mudar({ nome: x.target.value })} placeholder="Ex.: Almoço dos Antigos Combatentes" style={{ ...campo, fontSize: 18 }} /> },
  { id: 'cliente', titulo: 'Quem está a pedir?', ajuda: 'A entidade e a pessoa com quem se fala.', feita: e => !!e.entidade.trim(),
    corpo: (e, mudar) => lista(<>
      <input autoFocus value={e.entidade} onChange={x => mudar({ entidade: x.target.value })} placeholder="Entidade (empresa, junta, associação…)" style={campo} />
      <input value={e.contactoNome} onChange={x => mudar({ contactoNome: x.target.value })} placeholder="Nome do contacto" style={campo} />
      <input value={e.contactoTel} onChange={x => mudar({ contactoTel: x.target.value })} placeholder="Telefone" inputMode="tel" style={campo} />
      <input value={e.contactoEmail} onChange={x => mudar({ contactoEmail: x.target.value })} placeholder="Email" inputMode="email" style={campo} />
    </>) },
  { id: 'quando', titulo: 'Quando é?', feita: e => !!e.data,
    corpo: (e, mudar) => lista(<>
      <input type="date" value={e.data} onChange={x => mudar({ data: x.target.value })} style={{ ...campo, fontSize: 18 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ fontSize: 13.5, color: C.suave }}>Começa<input type="time" value={e.horaInicio} onChange={x => mudar({ horaInicio: x.target.value })} style={campo} /></label>
        <label style={{ fontSize: 13.5, color: C.suave }}>Acaba<input type="time" value={e.horaFim} onChange={x => mudar({ horaFim: x.target.value })} style={campo} /></label>
      </div>
    </>) },
  { id: 'onde', titulo: 'Onde é?', feita: e => !!e.onde && (e.onde !== 'fora' || !!e.morada.trim()),
    corpo: (e, mudar, avancar) => lista(<>
      <Opcao icone="🏫" ativo={e.onde === 'ecl'} onClick={() => { mudar({ onde: 'ecl' }); avancar(); }}>Na ECL</Opcao>
      <Opcao icone="🚐" ativo={e.onde === 'fora'} onClick={() => mudar({ onde: 'fora' })} sub="é preciso transporte e montagem">Fora da ECL</Opcao>
      {e.onde === 'fora' && <input autoFocus value={e.morada} onChange={x => mudar({ morada: x.target.value })} placeholder="Nome do espaço e morada" style={campo} />}
      <Opcao icone="❔" ativo={e.onde === 'por_definir'} onClick={() => { mudar({ onde: 'por_definir' }); avancar(); }}>Ainda por definir</Opcao>
    </>) },
  { id: 'pessoas', titulo: 'Quantas pessoas?', ajuda: 'Basta um número aproximado; pode confirmá-lo mais tarde.', feita: e => e.pessoas > 0,
    corpo: (e, mudar) => lista(<>
      <input type="number" min={1} inputMode="numeric" value={e.pessoas || ''} onChange={x => mudar({ pessoas: Math.max(0, Number(x.target.value) || 0) })}
        placeholder="Nº de pessoas" style={{ ...campo, fontSize: 26, fontWeight: 800, textAlign: 'center', maxWidth: 220 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[20, 30, 40, 50, 60, 80, 100, 150, 200].map(n => <Pastilha key={n} ativo={e.pessoas === n} onClick={() => mudar({ pessoas: n })}>{n}</Pastilha>)}
      </div>
    </>) },
  { id: 'momentos', titulo: 'O que pretendem servir?', ajuda: 'Escolha um ou mais. Depois acerte a hora de cada um.', feita: e => e.momentos.length > 0,
    corpo: (e, mudar) => {
      const alternar = (tipo: string) => {
        const tem = e.momentos.some(m => m.tipo === tipo);
        const base = MOMENTOS.find(m => m.id === tipo)!;
        mudar({ momentos: tem ? e.momentos.filter(m => m.tipo !== tipo)
          : [...e.momentos, { id: tipo + '_' + Date.now(), tipo, hora: base.hora, pessoas: e.pessoas }] });
      };
      return lista(<>
        <div style={grelha(150)}>
          {MOMENTOS.map(m => {
            const tem = e.momentos.some(x => x.tipo === m.id);
            return (
              <button key={m.id} onClick={() => alternar(m.id)} style={{ minHeight: 84, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                border: tem ? 'none' : '1.5px solid #EDE6E9', background: tem ? C.bordeaux : C.branco, color: tem ? '#fff' : C.tinta,
                boxShadow: tem ? 'none' : C.sombra, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 26 }}>{ICONE_MOMENTO[m.id]}</span>
                <span style={{ fontSize: 14.5, fontWeight: 700 }}>{m.nome}</span>
              </button>
            );
          })}
        </div>
        {[...e.momentos].sort((a, b) => a.hora.localeCompare(b.hora)).map(m => (
          <div key={m.id} style={{ ...cartao, marginBottom: 0, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: 12 }}>
            <span style={{ fontSize: 22 }}>{ICONE_MOMENTO[m.tipo]}</span>
            <b style={{ flex: 1, minWidth: 130 }}>{nomeMomento(m.tipo)}</b>
            <input type="time" value={m.hora} onChange={x => mudar({ momentos: e.momentos.map(y => y.id === m.id ? { ...y, hora: x.target.value } : y) })} style={{ ...campo, width: 120, padding: '9px 10px' }} />
            <input type="number" value={m.pessoas || ''} onChange={x => mudar({ momentos: e.momentos.map(y => y.id === m.id ? { ...y, pessoas: Number(x.target.value) || 0 } : y) })} style={{ ...campo, width: 90, padding: '9px 10px' }} />
            <span style={{ fontSize: 13, color: C.suave }}>pessoas</span>
          </div>
        ))}
      </>);
    } },
  { id: 'tipo', titulo: 'Que tipo de evento é?', feita: e => !!e.tipoEvento,
    corpo: (e, mudar, avancar) => <div style={grelha(150)}>{TIPOS_EVENTO.map(t => <Opcao key={t} ativo={e.tipoEvento === t} onClick={() => { mudar({ tipoEvento: t }); avancar(); }}>{t}</Opcao>)}</div> },
  { id: 'servico', titulo: 'Como vai ser o serviço?', feita: e => !!e.servico,
    corpo: (e, mudar, avancar) => lista(SERVICOS.map(s => (
      <Opcao key={s.id} icone={({ buffet: '🍱', volante: '🧑‍🍳', sentado: '🪑', empratado: '🍽️', entrega: '📦', misto: '🔀' } as any)[s.id]}
        ativo={e.servico === s.id} sub={s.ajuda} onClick={() => { mudar({ servico: s.id }); avancar(); }}>{s.nome}</Opcao>
    ))) },
  { id: 'nivel', titulo: 'Que nível gastronómico?', ajuda: 'É diferente da dificuldade do evento: um coffee break na escola pode ser gourmet.', feita: e => !!e.nivel,
    corpo: (e, mudar, avancar) => lista(NIVEIS.map((n, k) => (
      <Opcao key={n.id} icone={'⭐'.repeat(k + 1)} ativo={e.nivel === n.id} sub={n.ajuda} onClick={() => { mudar({ nivel: n.id }); avancar(); }}>{n.nome}</Opcao>
    ))) },
  { id: 'estilos', titulo: 'Que experiência querem criar?', ajuda: 'Até três. Ajuda a pensar o menu.', opcional: true, feita: e => e.estilos.length > 0,
    corpo: (e, mudar) => <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{ESTILOS.map(s => {
      const tem = e.estilos.includes(s);
      return <Pastilha key={s} ativo={tem} onClick={() => mudar({ estilos: tem ? e.estilos.filter(x => x !== s) : e.estilos.length < 3 ? [...e.estilos, s] : e.estilos })}>{s}</Pastilha>;
    })}</div> },
  { id: 'publico', titulo: 'Quem são os convidados?', opcional: true, feita: e => e.publico.length > 0,
    corpo: (e, mudar) => <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{PUBLICOS.map(s => {
      const tem = e.publico.includes(s);
      return <Pastilha key={s} ativo={tem} onClick={() => mudar({ publico: tem ? e.publico.filter(x => x !== s) : [...e.publico, s] })}>{s}</Pastilha>;
    })}</div> },
  { id: 'necessidades', titulo: 'Há alergias ou dietas especiais?', ajuda: 'Os nomes das pessoas ficam para mais tarde.', feita: e => !!e.necessidades,
    corpo: (e, mudar, avancar) => lista(<>
      <Opcao icone="⚠️" ativo={e.necessidades === 'sim'} onClick={() => mudar({ necessidades: 'sim' })}>Sim</Opcao>
      {e.necessidades === 'sim' && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '2px 4px 6px' }}>{NECESSIDADES.map(s => {
        const tem = e.necessidadesQuais.includes(s);
        return <Pastilha key={s} ativo={tem} onClick={() => mudar({ necessidadesQuais: tem ? e.necessidadesQuais.filter(x => x !== s) : [...e.necessidadesQuais, s] })}>{s}</Pastilha>;
      })}</div>}
      <Opcao icone="✅" ativo={e.necessidades === 'nao'} onClick={() => { mudar({ necessidades: 'nao', necessidadesQuais: [] }); avancar(); }}>Não</Opcao>
      <Opcao icone="🤔" ativo={e.necessidades === 'nao_sei'} onClick={() => { mudar({ necessidades: 'nao_sei' }); avancar(); }}>Ainda não sabemos</Opcao>
    </>) },
  { id: 'protocolo', titulo: 'Há convidados protocolares ou VIP?', feita: e => !!e.protocolo,
    corpo: (e, mudar, avancar) => lista(R3.map(o => <Opcao key={o.v} icone={o.i} ativo={e.protocolo === o.v} onClick={() => { mudar({ protocolo: o.v }); avancar(); }}>{o.t}</Opcao>)) },
  { id: 'turmas', titulo: 'Que turmas e áreas trabalham no evento?', ajuda: 'Todas as que se envolvem: cozinha, pastelaria, restaurante/bar…', feita: e => e.turmasIds.length + e.outrasAreas.length > 0,
    corpo: (e, mudar) => lista(<>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{getTurmas().map(t => {
        const tem = e.turmasIds.includes(t.id);
        return <Pastilha key={t.id} ativo={tem} onClick={() => mudar({ turmasIds: tem ? e.turmasIds.filter(x => x !== t.id) : [...e.turmasIds, t.id] })}>{t.id}</Pastilha>;
      })}</div>
      <div style={{ fontSize: 13.5, color: C.suave, marginTop: 6 }}>Outras áreas da escola</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{OUTRAS_AREAS.map(a => {
        const tem = e.outrasAreas.includes(a);
        return <Pastilha key={a} ativo={tem} onClick={() => mudar({ outrasAreas: tem ? e.outrasAreas.filter(x => x !== a) : [...e.outrasAreas, a] })}>{a}</Pastilha>;
      })}</div>
      {e.turmasIds.length > 1 && (
        <select value={e.turmaResponsavel} onChange={x => mudar({ turmaResponsavel: x.target.value })} style={{ ...campo, marginTop: 6 }}>
          <option value="">Turma responsável…</option>
          {e.turmasIds.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      <input value={e.professorResponsavel} onChange={x => mudar({ professorResponsavel: x.target.value })} placeholder="Professor responsável" style={campo} />
    </>) },
  { id: 'orcamento', titulo: 'O cliente indicou um orçamento?', feita: e => !!e.orcamento,
    corpo: (e, mudar, avancar) => lista(<>
      <Opcao icone="💶" ativo={e.orcamento === 'sim'} onClick={() => mudar({ orcamento: 'sim' })}>Sim</Opcao>
      {e.orcamento === 'sim' && <input autoFocus value={e.orcamentoValor} onChange={x => mudar({ orcamentoValor: x.target.value })} placeholder="Ex.: 15 € por pessoa, ou 900 € no total" style={campo} />}
      <Opcao icone="➖" ativo={e.orcamento === 'nao'} onClick={() => { mudar({ orcamento: 'nao' }); avancar(); }}>Não</Opcao>
    </>) },
  { id: 'prazo', titulo: 'Até quando precisam da proposta?', opcional: true, feita: e => !!e.prazoProposta,
    corpo: (e, mudar) => <input type="date" value={e.prazoProposta} onChange={x => mudar({ prazoProposta: x.target.value })} style={{ ...campo, fontSize: 18, maxWidth: 260 }} /> },
  { id: 'sabe', titulo: 'O cliente já sabe o que quer comer?', feita: e => !!e.clienteSabe,
    corpo: (e, mudar, avancar) => lista(<>
      <Opcao icone="📝" ativo={e.clienteSabe === 'sim'} onClick={() => { mudar({ clienteSabe: 'sim' }); avancar(); }}>Sim, já disse o que quer</Opcao>
      <Opcao icone="〰️" ativo={e.clienteSabe === 'parcial'} onClick={() => { mudar({ clienteSabe: 'parcial' }); avancar(); }}>Mais ou menos</Opcao>
      <Opcao icone="👩‍🍳" ativo={e.clienteSabe === 'nao'} onClick={() => { mudar({ clienteSabe: 'nao' }); avancar(); }}>Não — quer uma proposta da ECL</Opcao>
    </>) },
  perguntaLocal('conhecemos', 'Já conhecemos o espaço?', 'Já lá fizemos um serviço, ou alguém da escola já o viu por dentro?'),
  perguntaLocal('apoio', 'O espaço tem zona de apoio ao catering?', 'Uma copa ou uma sala só para a equipa.'),
  perguntaLocal('aguaLuz', 'Há água e eletricidade junto ao serviço?', 'Para a máquina de café, os réchauds, lavar.'),
  perguntaLocal('carga', 'A carrinha pode parar junto à entrada?', 'Para carregar e descarregar.'),
  { id: 'exigencias', titulo: 'Mais alguma coisa importante?', ajuda: 'Tema, cores, pedidos especiais — o que o cliente disse e não coube nas perguntas.', opcional: true, feita: e => !!e.exigencias.trim(),
    corpo: (e, mudar) => <textarea value={e.exigencias} onChange={x => mudar({ exigencias: x.target.value })} rows={5} style={campo} placeholder="Opcional" /> },
];

function Triagem({ inicial, onCancelar, onConcluir }: { inicial: EventoECL; onCancelar: () => void; onConcluir: (e: EventoECL) => void }) {
  const [e, setE] = useState<EventoECL>(inicial);
  const [i, setI] = useState(0);
  const [fim, setFim] = useState(false);
  const perguntas = PERGUNTAS.filter(p => !p.mostrar || p.mostrar(e));
  const idx = Math.min(i, perguntas.length - 1);
  const p = perguntas[idx];
  const mudar = (x: Partial<EventoECL>) => setE(v => ({ ...v, ...x }));
  const seguinte = () => (idx + 1 >= perguntas.length ? setFim(true) : setI(idx + 1));
  const avancar = () => setTimeout(() => setI(k => { if (k + 1 >= perguntas.length) { setFim(true); return k; } return k + 1; }), 220);
  const novo = !inicial.nome;

  if (fim) {
    const cl = classificar(e);
    return (
      <>
        <div style={{ background: C.bordeaux, color: '#fff', borderRadius: 18, padding: 22, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', color: C.bordeauxClaro }}>{novo ? 'EVENTO CRIADO' : 'RESPOSTAS ATUALIZADAS'}</div>
          <div style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 4px' }}>{e.nome || 'Evento'}</div>
          <div style={{ fontSize: 15, opacity: 0.9 }}>{[diaSemana(e.data), e.pessoas ? `${e.pessoas} pessoas` : ''].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={cartao}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: C.bordeauxSuave, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.suave }}>COMPLEXIDADE</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.bordeaux }}>{cl.nivel}</div>
            </div>
            <div style={{ background: C.bordeauxSuave, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.suave }}>NÍVEL</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.bordeaux }}>{NIVEIS.find(n => n.id === e.nivel)?.nome || '—'}</div>
            </div>
          </div>
          <div style={{ fontSize: 13.5, color: C.texto, marginTop: 10, lineHeight: 1.5 }}>Porquê: {cl.razoes.join(' · ')}</div>
          {precisaVisita(e) && <div style={{ marginTop: 10, color: C.vermelho, fontWeight: 800 }}>⚠ Vai ser precisa uma visita técnica ao espaço</div>}
        </div>
        <button onClick={() => onConcluir(e)} style={{ ...botao('principal'), width: '100%', minHeight: 58, fontSize: 17 }}>Abrir o evento →</button>
        <button onClick={() => setFim(false)} style={{ ...botao(), width: '100%', marginTop: 8 }}>← Rever as respostas</button>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onCancelar} style={{ ...botao(), minHeight: 40, padding: '8px 14px', fontSize: 14 }}>✕ {novo ? 'Cancelar' : 'Fechar'}</button>
        <div style={{ flex: 1, textAlign: 'right', fontSize: 13.5, color: C.suave, fontWeight: 700 }}>{novo ? 'Novo evento' : e.nome} · {idx + 1} de {perguntas.length}</div>
      </div>
      <div style={{ height: 6, background: '#E9E1E4', borderRadius: 3, marginBottom: 22, overflow: 'hidden' }}>
        <div style={{ height: 6, width: `${((idx + 1) / perguntas.length) * 100}%`, background: C.bordeaux, transition: 'width .25s' }} />
      </div>
      <div style={{ fontSize: 25, fontWeight: 800, color: C.tinta, lineHeight: 1.25, padding: '0 2px' }}>{p.titulo}</div>
      {p.ajuda && <div style={{ fontSize: 15, color: C.texto, margin: '6px 2px 0', lineHeight: 1.5 }}>{p.ajuda}</div>}
      <div style={{ margin: '18px 0 22px' }}>{p.corpo(e, mudar, avancar)}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setI(Math.max(0, idx - 1))} disabled={idx === 0} style={{ ...botao(), opacity: idx === 0 ? 0.35 : 1 }}>←</button>
        {p.feita(e)
          ? <button onClick={seguinte} style={{ ...botao('principal'), flex: 1 }}>{idx + 1 >= perguntas.length ? 'Concluir' : 'Seguinte'}</button>
          : <button onClick={seguinte} style={{ ...botao(), flex: 1, color: C.suave, borderColor: '#E4DDE0' }}>{p.opcional ? 'Saltar' : 'Ainda não sei — seguinte'}</button>}
      </div>
      {!novo && <button onClick={() => setFim(true)} style={{ ...botao(), width: '100%', marginTop: 10 }}>Guardar e voltar ao evento</button>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// 3. O EVENTO
// ══════════════════════════════════════════════════════════════

type Secao = 'pedido' | 'perguntas' | 'local' | 'quantidades' | 'fichas' | 'preparacao' | 'material' | 'dia' | 'fecho';

/**
 * O evento organiza-se aqui; a nota dos alunos vem do plano de avaliação.
 * Sem ele o evento não conta para nada (Rosa, set/2026) — por isso se
 * cria daqui, ligado ao evento.
 */
function AvaliacaoDosAlunos({ e, nomeProfessor }: { e: EventoECL; nomeProfessor?: string }) {
  const [, redesenhar] = useState(0);
  const planos = planosDoEvento(e.id);
  const semPlano = getTurmas().map(t => t.id).filter(t => !planos.some(p => p.turmaId === t));
  // Várias turmas de uma vez (Rosa, out/2026): antes só se escolhia uma (vinha
  // a primeira, o 1.º BCR) e, criada essa, já não se podiam juntar as outras.
  // Cada turma com a sua forma (Rosa, out/2026): uma pode ir toda (obrigatório,
  // conta como aula) e as outras só por convite (inscrevem-se, não é obrigatório).
  type Modo = 'turma' | 'inscricao';
  const [modos, setModos] = useState<Record<string, Modo>>(() =>
    Object.fromEntries(e.turmasIds.filter(t => semPlano.includes(t)).map(t => [t, 'inscricao' as Modo])));
  const [maisTurmas, setMaisTurmas] = useState(false);
  const escolhidas = Object.keys(modos).filter(t => semPlano.includes(t));
  const criadas = planos.length > 0 && (
    <div style={{ marginBottom: semPlano.length ? 10 : 0 }}>
      {planos.some(p => p.tipoEvento) && (<>
        <b style={{ color: C.verde }}>✓ Atividade extra criada</b> — {planos.filter(p => p.tipoEvento).map(p => `${p.turmaId}${p0Modo(p)}`).join(', ')}.
        {' '}Os alunos autoavaliam-se na atividade, e conta como bónus na UC dessa data.<br />
        {planos.filter(p => p.tipoEvento && p.modoParticipacao !== 'inscricao').map(p => (
          <button key={p.id} onClick={() => { addOrUpdatePlanoAula({ ...p, modoParticipacao: 'inscricao', estado: 'publicado' }); redesenhar(n => n + 1); }}
            style={{ ...botao('claro'), margin: '6px 6px 0 0', minHeight: 38, fontSize: 13.5 }}>Abrir às inscrições dos alunos — {p.turmaId}</button>
        ))}
      </>)}
      {planos.some(p => !p.tipoEvento) && (<>
        <b style={{ color: C.verde }}>✓ O evento está no plano de aula da turma</b> — {planos.filter(p => !p.tipoEvento).map(p => p.turmaId).join(', ')}.
        {' '}Vai a turma toda dentro do ano letivo, por isso conta como aula. Abre-o em «Planos de aula» (se ainda estiver em rascunho, escolhe o tipo de aula e publica).
        <br />{planos.filter(p => !p.tipoEvento).map(p => (
          <button key={p.id} onClick={() => {
            if (!confirm(`O evento deixa de ser aula obrigatória do ${p.turmaId} e passa a atividade extra: os alunos inscrevem-se e tu aceitas quem vai. Não conta faltas.\n\nContinuar?`)) return;
            passarParaInscricoes(e, p, nomeProfessor || ''); redesenhar(n => n + 1);
          }} style={{ ...botao('claro'), margin: '6px 6px 0 0', minHeight: 38, fontSize: 13.5 }}>Não é obrigatório: abrir às inscrições — {p.turmaId}</button>
        ))}
      </>)}
    </div>
  );
  if (planos.length && (!semPlano.length || !maisTurmas)) return (
    <div style={{ ...cartao, fontSize: 14.5, lineHeight: 1.5 }}>
      {criadas}
      {semPlano.length > 0 && (
        <button onClick={() => setMaisTurmas(true)} style={{ ...botao('claro'), marginTop: 8 }}>+ Juntar outras turmas</button>
      )}
    </div>
  );
  function criar() {
    if (!escolhidas.length || !e.data) return;
    for (const t of escolhidas) criarAvaliacaoDoEvento(e, t, modos[t], nomeProfessor || '');
    setModos({}); setMaisTurmas(false); redesenhar(n => n + 1);
  }
  return (
    <div style={{ ...cartao, fontSize: 14.5, lineHeight: 1.5 }}>
      {criadas}
      <div style={{ fontWeight: 800, color: C.bordeaux }}>Avaliação dos alunos</div>
      <div style={{ color: C.suave, margin: '4px 0 10px' }}>
        Sem ela, o evento não conta para a nota. Os alunos autoavaliam-se (esforço e compromisso) e tu validas.
      </div>
      {!e.data && <div style={{ color: '#8e2418', fontWeight: 700 }}>Falta a data do evento.</div>}
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Que turmas vão, e como?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {semPlano.map(t => {
          const m = modos[t];
          const por = (v: Modo | null) => setModos(x => { const n = { ...x }; if (v) n[t] = v; else delete n[t]; return n; });
          const op = (v: Modo | null, txt: string) => (
            <button onClick={() => por(v)} style={{ ...botao((m ?? null) === v ? 'principal' : 'claro'), flex: '1 1 140px', minHeight: 40, fontSize: 13.5 }}>{txt}</button>
          );
          return (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <b style={{ minWidth: 70 }}>{t}</b>
              {op(null, 'Não vai')}
              {op('turma', 'A turma toda (obrigatório)')}
              {op('inscricao', 'Por convite (inscrevem-se)')}
            </div>
          );
        })}
      </div>
      {escolhidas.length > 0 && e.data && (
        <div style={{ color: C.suave, fontSize: 13.5, marginBottom: 8 }}>
          {escolhidas.map(t => `${t}: ${modos[t] === 'inscricao' ? 'convite — os alunos inscrevem-se e tu aceitas quem vai; dá bónus, não conta faltas'
            : modulosAtivos(t, e.data).length > 0 ? 'obrigatório — conta como aula (plano de aula com o evento lá dentro)'
            : 'obrigatório, fora do ano letivo — atividade extra, com bónus no plano de aula seguinte da UC'}`).join(' · ')}
        </div>
      )}
      <button disabled={!escolhidas.length || !e.data} onClick={criar}
        style={{ ...botao('principal'), width: '100%', opacity: !escolhidas.length || !e.data ? 0.5 : 1 }}>
        {escolhidas.length > 1 ? `Criar para ${escolhidas.length} turmas` : 'Criar a avaliação dos alunos'}
      </button>
    </div>
  );
}
const p0Modo = (p: any) => p?.modoParticipacao === 'inscricao' ? ' (só os inscritos que aceitares)' : ' (a turma toda)';

function PainelEvento({ evento, onVoltar, onGuardar, onEditar, onApagar, nomeProfessor, semAvaliacao }: {
  evento: EventoECL; onVoltar: () => void; onGuardar: (e: EventoECL) => void; onEditar: () => void; onApagar: () => void; nomeProfessor?: string;
  semAvaliacao?: boolean;
}) {
  const [secao, setSecao] = useState<Secao | null>(null);
  const e = evento;
  const mudar = (x: Partial<EventoECL>) => onGuardar({ ...e, ...x });
  const acao = proximaAcao(e);
  const prep = preparacao(e);
  const faltam = diasAte(e.data);

  const irPara = (onde: string) => {
    if (onde === 'triagem') { onEditar(); return; }
    const mapa: Record<string, Secao> = { resumo: 'pedido', perguntas: 'perguntas', local: 'local', menu: 'fichas', preparacao: 'preparacao', material: 'material', dia: 'dia', fecho: 'fecho' };
    setSecao(mapa[onde] || null);
  };

  if (secao) {
    const titulos: Record<Secao, string> = { pedido: 'O pedido', perguntas: 'Perguntas ao cliente', local: 'O local', quantidades: 'Quantidades por pessoa', fichas: 'Fichas e orçamentos',
      preparacao: 'Preparação', material: 'Material', dia: 'Dia do evento', fecho: 'Fechar o evento' };
    return (
      <>
        <button onClick={() => setSecao(null)} style={{ ...botao(), minHeight: 40, padding: '8px 14px', fontSize: 14, marginBottom: 12 }}>← {e.nome || 'Evento'}</button>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.tinta, margin: '0 2px 14px' }}>{titulos[secao]}</div>
        {secao === 'pedido' && <Pedido e={e} mudar={mudar} onEditar={onEditar} onApagar={onApagar} />}
        {secao === 'perguntas' && <PerguntasCliente e={e} mudar={mudar} />}
        {secao === 'local' && <Local e={e} mudar={mudar} onEditar={onEditar} />}
        {secao === 'quantidades' && <Quantidades e={e} mudar={mudar} />}
        {secao === 'fichas' && <FichasOrcamentos e={e} mudar={mudar} nomeProfessor={nomeProfessor} />}
        {secao === 'preparacao' && <ListaTarefas e={e} mudar={mudar} fases={['Decidir', 'Preparar', 'HACCP']} />}
        {secao === 'material' && <ListaTarefas e={e} mudar={mudar} fases={['Material']} />}
        {secao === 'dia' && <ListaTarefas e={e} mudar={mudar} fases={['Dia do evento']} />}
        {secao === 'fecho' && <Fecho e={e} mudar={mudar} />}
      </>
    );
  }

  // Os cartões grandes, com o que falta em cada um
  const pergFalta = perguntasEmFalta(e).length;
  const pendLocal = pendenciasDoLocal(e);
  const tarefasDe = (fases: Tarefa['fase'][]) => {
    const l = tarefasDoEvento(e).filter(t => fases.includes(t.fase) && !e.tarefas[t.id]?.naoAplica);
    return { feitas: l.filter(t => e.tarefas[t.id]?.feito).length, total: l.length };
  };
  const prp = tarefasDe(['Decidir', 'Preparar', 'HACCP']), mat = tarefasDe(['Material']), dia = tarefasDe(['Dia do evento']);
  const custos = e.orcamentos.filter(o => (o.custo || 0) > 0);
  const faltaPedido = faltaNoPedido(e).length + faltaNoServico(e).length;
  const quantBlocos = e.momentos.map(m => quantidadesDoMomento(m.tipo, e.servico, m.pessoas || e.pessoas, e.quantidades || {}, m.id));
  const quantFalta = divergenciasPorEscolher(quantBlocos).length;
  const quantSub = !e.momentos.length ? 'sem momentos de serviço' : quantFalta ? `${quantFalta} escolha${quantFalta > 1 ? 's' : ''} por fazer` : `${e.momentos.length} momento${e.momentos.length > 1 ? 's' : ''}`;
  const CARTOES: { id: Secao; icone: string; nome: string; sub: string; ok: boolean }[] = [
    { id: 'pedido', icone: '📋', nome: 'O pedido', sub: faltaPedido ? `faltam ${faltaPedido} respostas` : `${ESTADOS[e.estado]} · ${classificar(e).nivel}`, ok: !faltaPedido },
    { id: 'perguntas', icone: '💬', nome: 'Perguntas ao cliente', sub: pergFalta ? `${pergFalta} por fazer` : 'todas feitas', ok: !pergFalta },
    { id: 'local', icone: e.onde === 'fora' ? '🚐' : '🏫', nome: 'O local', sub: pendLocal.length ? pendLocal[0] : 'confirmado', ok: !pendLocal.length },
    { id: 'quantidades', icone: '⚖️', nome: 'Quantidades', sub: quantSub, ok: !quantFalta },
    { id: 'fichas', icone: '🧾', nome: 'Fichas e orçamentos', sub: `${e.fichasIds.length} ficha${e.fichasIds.length === 1 ? '' : 's'} · ${e.orcamentos.length} orçamento${e.orcamentos.length === 1 ? '' : 's'}${custos.length ? ` · ${euros(custos[0].custo)}` : ''}`, ok: e.fichasIds.length > 0 && custos.length > 0 },
    { id: 'preparacao', icone: '🗓️', nome: 'Preparação', sub: `${prp.feitas} de ${prp.total}`, ok: prp.feitas === prp.total },
    { id: 'material', icone: '🍴', nome: 'Material', sub: `${mat.feitas} de ${mat.total}`, ok: mat.feitas === mat.total },
    { id: 'dia', icone: '⏱️', nome: 'Dia do evento', sub: `${dia.feitas} de ${dia.total}`, ok: dia.feitas === dia.total },
    { id: 'fecho', icone: '🏁', nome: 'Fechar', sub: e.fecho.conforme ? 'fechado' : 'depois do evento', ok: !!e.fecho.conforme },
  ];

  return (
    <>
      <button onClick={onVoltar} style={{ ...botao(), minHeight: 40, padding: '8px 14px', fontSize: 14, marginBottom: 12 }}>← Todos os eventos</button>

      {/* O evento num relance */}
      <div style={{ background: C.bordeaux, color: '#fff', borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: '0 4px 16px rgba(123,34,51,0.25)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <BlocoData iso={e.data} claro />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.2 }}>{e.nome || 'Evento sem nome'}</div>
            <div style={{ fontSize: 14, color: C.bordeauxClaro, marginTop: 3 }}>
              {[e.horaInicio && e.horaFim ? `${e.horaInicio}–${e.horaFim}` : '', e.onde === 'ecl' ? 'Na ECL' : e.onde === 'fora' ? (e.morada || 'Fora da ECL') : 'Local por definir',
                e.pessoas ? `${e.pessoas} pessoas` : ''].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: 8, width: `${prep.pct}%`, background: '#fff' }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{pronto(e) ? '✓ Pronto' : `${prep.pct}% preparado`}</div>
        </div>
        <div style={{ fontSize: 13.5, color: C.bordeauxClaro, marginTop: 8 }}>
          {[ESTADOS[e.estado], faltam !== null ? (faltam > 0 ? `daqui a ${faltam} dias` : faltam === 0 ? 'é hoje' : `foi há ${-faltam} dias`) : '',
            [...e.turmasIds, ...e.outrasAreas].join(', ')].filter(Boolean).join(' · ')}
        </div>
      </div>

      {!semAvaliacao && <AvaliacaoDosAlunos e={e} nomeProfessor={nomeProfessor} />}

      {/* AGORA — uma coisa de cada vez, responde-se aqui */}
      {acao ? <CartaoAgora e={e} acao={acao} mudar={mudar} irPara={irPara} /> : (
        <div style={{ ...cartao, textAlign: 'center', color: C.verde, fontWeight: 800, fontSize: 16 }}>
          {e.estado === 'cancelado' ? 'Evento cancelado.' : '✓ Nada por fazer agora.'}
        </div>
      )}

      <div style={rotulo}>Tudo sobre o evento</div>
      <div style={grelha(160)}>
        {CARTOES.map(c => (
          <button key={c.id} onClick={() => setSecao(c.id)} style={{ position: 'relative', background: C.bordeaux, border: 'none', borderRadius: 16,
            padding: '20px 10px 16px', minHeight: 124, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>
            <span style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, fontSize: 12, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.ok ? '#8FD18A' : '#F5B971', color: C.bordeauxEscuro }}>
              {c.ok ? '✓' : '!'}</span>
            <span style={{ fontSize: 30 }}>{c.icone}</span>
            <span style={{ fontSize: 15.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{c.nome}</span>
            <span style={{ fontSize: 12.5, color: C.bordeauxClaro, textAlign: 'center', lineHeight: 1.3 }}>{c.sub}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/** O cartão «AGORA»: diz o que fazer e deixa fazê-lo ali mesmo. */
function CartaoAgora({ e, acao, mudar, irPara }: { e: EventoECL; acao: Acao; mudar: (x: Partial<EventoECL>) => void; irPara: (onde: string) => void }) {
  const [resp, setResp] = useState('');
  useEffect(() => setResp(''), [acao.ref, acao.tipo]);
  const marcarTarefa = (x: { feito?: boolean; naoAplica?: boolean }) => mudar({ tarefas: { ...e.tarefas, [acao.ref!]: { ...e.tarefas[acao.ref!], ...x } } });
  const marcarPergunta = (x: { feito?: boolean; naoAplica?: boolean; resposta?: string }) => mudar({ perguntas: { ...e.perguntas, [acao.ref!]: { ...e.perguntas[acao.ref!], ...x } } });
  const cor = acao.atrasada ? C.vermelho : C.bordeaux;
  return (
    <div style={{ ...cartao, border: `2px solid ${cor}`, padding: 20 }}>
      <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: '0.1em', color: cor }}>
        AGORA{acao.prazo ? ` · ATÉ ${dataPT(acao.prazo)}` : ''}{acao.atrasada ? ' · ATRASADO' : ''}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: C.tinta, margin: '6px 0 14px', lineHeight: 1.3 }}>{acao.texto}</div>
      {acao.quem && <div style={{ fontSize: 13.5, color: C.suave, margin: '-8px 0 14px' }}>{acao.quem}</div>}

      {acao.tipo === 'triagem' && <button onClick={() => irPara('triagem')} style={{ ...botao('principal'), width: '100%' }}>Responder →</button>}

      {acao.tipo === 'go' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 14, color: C.texto, marginTop: -6 }}>Há equipa, espaço de produção e transporte? É compatível com as aulas?</div>
          <button onClick={() => mudar({ viavel: 'sim', tarefas: { ...e.tarefas, go: { feito: true } } })} style={{ ...botao('verde'), width: '100%' }}>👍 Sim, é viável — avançar</button>
          <button onClick={() => { if (confirm('Marcar o evento como não viável? Fica cancelado.')) mudar({ viavel: 'nao', estado: 'cancelado' }); }} style={{ ...botao('perigo'), width: '100%' }}>Não é viável</button>
        </div>
      )}

      {acao.tipo === 'pergunta' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input value={resp} onChange={x => setResp(x.target.value)} placeholder="Resposta do cliente (opcional)" style={campo} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => marcarPergunta({ feito: true, resposta: resp })} style={{ ...botao('principal'), flex: 1 }}>✓ Feito</button>
            <button onClick={() => marcarPergunta({ naoAplica: true })} style={botao()}>Não se aplica</button>
          </div>
          <button onClick={() => irPara('perguntas')} style={{ background: 'none', border: 'none', color: C.bordeaux, fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
            Ver todas as perguntas · copiar para email →</button>
        </div>
      )}

      {acao.tipo === 'local' && acao.ref === 'sala' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={resp} onChange={x => setResp(x.target.value)} placeholder="Ex.: Restaurante pedagógico" style={campo} />
          <button disabled={!resp.trim()} onClick={() => mudar({ salaECL: resp.trim() })} style={botao('principal')}>✓</button>
        </div>
      )}
      {acao.tipo === 'local' && acao.ref !== 'sala' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {R3.map(o => <button key={o.v} onClick={() => mudar({ local: { ...e.local, [acao.ref!]: o.v } })}
            style={{ ...botao(o.v === 'sim' ? 'verde' : 'claro') }}>{o.i} {o.t}</button>)}
        </div>
      )}

      {acao.tipo === 'visita' && (
        <button onClick={() => mudar({ tarefas: { ...e.tarefas, visita: { feito: true } }, local: { ...e.local, conhecemos: 'sim' } })} style={{ ...botao('principal'), width: '100%' }}>✓ Visita feita</button>
      )}

      {acao.tipo === 'tarefa' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {acao.onde === 'menu' && <button onClick={() => irPara('menu')} style={{ ...botao(), width: '100%' }}>🧾 Abrir fichas e orçamentos</button>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => marcarTarefa({ feito: true })} style={{ ...botao('principal'), flex: 1 }}>✓ Feito</button>
            <button onClick={() => marcarTarefa({ naoAplica: true })} style={botao()}>Não se aplica</button>
          </div>
        </div>
      )}

      {acao.tipo === 'fecho' && <button onClick={() => irPara('fecho')} style={{ ...botao('principal'), width: '100%' }}>Fechar o evento →</button>}
    </div>
  );
}

// ── O pedido: resumo, estado, alterações ──────────────────────
function Pedido({ e, mudar, onEditar, onApagar }: { e: EventoECL; mudar: (x: Partial<EventoECL>) => void; onEditar: () => void; onApagar: () => void }) {
  const cl = classificar(e);
  const [alt, setAlt] = useState({ oQue: '', pedidoPor: '', impacto: '' });
  const linha = (t: string, v: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid #F1ECEE', fontSize: 15 }}>
      <span style={{ width: 140, flexShrink: 0, color: C.suave }}>{t}</span><span style={{ flex: 1, fontWeight: 600 }}>{v || '—'}</span>
    </div>
  );
  return (
    <>
      <div style={cartao}>
        {linha('Cliente', [e.entidade, e.contactoNome].filter(Boolean).join(' · '))}
        {linha('Contacto', [e.contactoTel, e.contactoEmail].filter(Boolean).join(' · '))}
        {linha('Tipo', e.tipoEvento)}
        {linha('Serviço', `${SERVICOS.find(s => s.id === e.servico)?.nome || '—'} · ${NIVEIS.find(n => n.id === e.nivel)?.nome || '—'}`)}
        {linha('Momentos', e.momentos.map(m => `${ICONE_MOMENTO[m.tipo]} ${nomeMomento(m.tipo)} ${m.hora}`).join('  ·  '))}
        {linha('Convidados', e.publico.join(', '))}
        {linha('Alergias / dietas', e.necessidades === 'sim' ? e.necessidadesQuais.join(', ') || 'sim' : e.necessidades === 'nao' ? 'nenhuma' : 'por saber')}
        {linha('Protocolo', e.protocolo === 'sim' ? 'sim' : e.protocolo === 'nao' ? 'não' : 'por saber')}
        {linha('Orçamento do cliente', e.orcamento === 'sim' ? e.orcamentoValor : 'não indicado')}
        {linha('Proposta até', dataPT(e.prazoProposta))}
        {linha('Responsável', [e.professorResponsavel, e.turmaResponsavel || e.turmasIds[0]].filter(Boolean).join(' · '))}
        {linha('Complexidade', `${cl.nivel} — ${cl.razoes.join(', ')}`)}
        {e.exigencias && linha('Notas', e.exigencias)}
        <button onClick={onEditar} style={{ ...botao('principal'), width: '100%', marginTop: 12 }}>✏️ Mudar as respostas</button>
      </div>

      <div style={rotulo}>Estado do evento</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(Object.keys(ESTADOS) as EventoECL['estado'][]).map(s => <Pastilha key={s} ativo={e.estado === s} onClick={() => mudar({ estado: s })}>{ESTADOS[s]}</Pastilha>)}
      </div>

      <div style={rotulo}>Alterações pedidas pelo cliente</div>
      <div style={cartao}>
        <div style={{ fontSize: 14, color: C.texto, marginBottom: 10 }}>Tudo o que muda depois da proposta fica aqui: o quê, quem pediu e o impacto no custo.</div>
        {e.alteracoes.map(a => (
          <div key={a.id} style={{ fontSize: 14.5, padding: '8px 0', borderTop: '1px solid #F1ECEE' }}>
            <b>{a.oQue}</b><span style={{ color: C.suave }}> · {a.pedidoPor || '—'} · {dataPT(a.em)}{a.impacto ? ` · ${a.impacto}` : ''}</span>
          </div>
        ))}
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <input value={alt.oQue} onChange={x => setAlt({ ...alt, oQue: x.target.value })} placeholder="O que mudou? Ex.: 60 → 80 pessoas" style={campo} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input value={alt.pedidoPor} onChange={x => setAlt({ ...alt, pedidoPor: x.target.value })} placeholder="Quem pediu" style={campo} />
            <input value={alt.impacto} onChange={x => setAlt({ ...alt, impacto: x.target.value })} placeholder="Impacto (ex.: +120 €)" style={campo} />
          </div>
          <button disabled={!alt.oQue.trim()} onClick={() => { mudar({ alteracoes: [...e.alteracoes, { id: 'alt_' + Date.now(), em: new Date().toISOString(), ...alt }] }); setAlt({ oQue: '', pedidoPor: '', impacto: '' }); }}
            style={{ ...botao(), opacity: alt.oQue.trim() ? 1 : 0.5 }}>+ Registar alteração</button>
        </div>
      </div>

      <button onClick={async () => { if (await janelaConfirmar({ titulo: `Quer mesmo apagar o evento «${e.nome}»?`, texto: 'Não se pode desfazer.', perigo: true, sim: 'Sim, apagar o evento' })) onApagar(); }} style={{ ...botao('perigo'), width: '100%', marginTop: 8 }}>Apagar o evento</button>
    </>
  );
}

// ── Perguntas ao cliente ───────────────────────────────────────
function PerguntasCliente({ e, mudar }: { e: EventoECL; mudar: (x: Partial<EventoECL>) => void }) {
  const todas = perguntasAoCliente(e);
  const grupos = [...new Set(todas.map(p => p.grupo))];
  const [copiado, setCopiado] = useState(false);
  const faltam = perguntasEmFalta(e).length;
  const marcar = (id: string, x: { feito?: boolean; naoAplica?: boolean; resposta?: string }) =>
    mudar({ perguntas: { ...e.perguntas, [id]: { ...e.perguntas[id], ...x } } });
  async function copiar() {
    try { await navigator.clipboard.writeText(textoPerguntas(e)); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }
    catch { alert('Não consegui copiar sozinho.'); }
  }
  function imprimir() {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>Perguntas — ${e.nome}</title><style>body{font-family:sans-serif;padding:24px;line-height:1.5}h2{margin-top:22px;font-size:15px;text-transform:uppercase}li{margin:8px 0}.r{border-bottom:1px solid #999;height:22px}</style></head><body>`
      + `<div style="display:flex;align-items:center;gap:12px;margin:0 0 12px"><img src="${LOGO_ECL}" alt="Escola de Comércio de Lisboa" style="height:50px;width:auto"/></div><h1>${e.nome}</h1><p>${e.entidade} · ${dataPT(e.data)} · ${e.pessoas} pessoas</p>`
      + grupos.map(g => `<h2>${g}</h2><ol>` + todas.filter(p => p.grupo === g).map(p => `<li>${p.texto}${e.perguntas[p.id]?.resposta ? `<br><b>${e.perguntas[p.id]!.resposta}</b>` : '<div class="r"></div>'}</li>`).join('') + '</ol>').join('')
      + '</body></html>');
    w.document.close(); w.print();
  }
  return (
    <>
      <div style={{ ...cartao, background: C.bordeauxSuave, boxShadow: 'none' }}>
        <div style={{ fontSize: 15, color: C.tinta, lineHeight: 1.5 }}>
          Só as perguntas que se aplicam a este evento. {faltam ? <b>Faltam {faltam} de {todas.length}.</b> : <b style={{ color: C.verde }}>Estão todas feitas ✓</b>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <button onClick={copiar} style={botao('principal')}>{copiado ? 'Copiado ✓' : '📋 Copiar para email'}</button>
          <button onClick={imprimir} style={botao()}>🖨️ Imprimir</button>
        </div>
      </div>
      {grupos.map(g => (
        <React.Fragment key={g}>
          <div style={rotulo}>{g}</div>
          {todas.filter(p => p.grupo === g).map(p => {
            const est = e.perguntas[p.id] || {};
            const feito = !!est.feito;
            return (
              <div key={p.id} style={{ ...cartao, padding: 14, opacity: est.naoAplica ? 0.5 : 1 }}>
                <button onClick={() => marcar(p.id, { feito: !feito })} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%',
                  background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: feito ? C.verde : '#fff', border: feito ? 'none' : '2px solid #D9CFD3', color: '#fff', fontWeight: 900 }}>{feito ? '✓' : ''}</span>
                  <span style={{ fontSize: 15.5, color: C.tinta, textDecoration: est.naoAplica ? 'line-through' : 'none', lineHeight: 1.4 }}>{p.texto}</span>
                </button>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, marginLeft: 38 }}>
                  <input value={est.resposta || ''} onChange={x => marcar(p.id, { resposta: x.target.value, feito: !!x.target.value || feito })}
                    placeholder="Resposta" style={{ ...campo, padding: '9px 12px', fontSize: 14.5 }} />
                  <button onClick={() => marcar(p.id, { naoAplica: !est.naoAplica })} style={{ ...botao(), minHeight: 40, padding: '6px 10px', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {est.naoAplica ? 'Aplica-se' : 'Não se aplica'}</button>
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </>
  );
}

// ── Local ──────────────────────────────────────────────────────
function Local({ e, mudar, onEditar }: { e: EventoECL; mudar: (x: Partial<EventoECL>) => void; onEditar: () => void }) {
  if (e.onde === 'ecl') {
    return (
      <div style={cartao}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>🏫 Na ECL</div>
        <div style={{ fontSize: 14.5, color: C.texto, margin: '6px 0 12px' }}>Sem transporte nem cargas. Só falta saber a sala.</div>
        <input value={e.salaECL} onChange={x => mudar({ salaECL: x.target.value })} placeholder="Sala ou espaço (ex.: Restaurante pedagógico)" style={campo} />
      </div>
    );
  }
  if (e.onde !== 'fora') {
    return <div style={cartao}><div style={{ fontSize: 16, fontWeight: 800 }}>Local por definir</div><button onClick={onEditar} style={{ ...botao('principal'), marginTop: 12 }}>Definir o local</button></div>;
  }
  const L: [keyof EventoECL['local'], string][] = [['conhecemos', 'Já conhecemos o espaço?'], ['apoio', 'Há zona de apoio ao catering?'], ['aguaLuz', 'Há água e eletricidade?'], ['carga', 'A carrinha pode parar junto à entrada?']];
  return (
    <>
      {precisaVisita(e) && (
        <div style={{ ...cartao, background: C.vermelhoSuave, boxShadow: 'none', border: `2px solid ${C.vermelho}` }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.vermelho }}>⚠ Visita técnica necessária</div>
          <div style={{ fontSize: 14.5, color: C.texto, margin: '6px 0 12px', lineHeight: 1.5 }}>Há dúvidas sobre o espaço. Na visita: fotografias, medidas, percurso da carrinha à sala, tomadas, água, copa, lixo.</div>
          <button onClick={() => mudar({ tarefas: { ...e.tarefas, visita: { feito: true } }, local: { ...e.local, conhecemos: 'sim' } })} style={{ ...botao('principal'), width: '100%' }}>✓ Visita feita</button>
        </div>
      )}
      <div style={cartao}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>🚐 {e.morada || 'Fora da ECL'}</div>
        {L.map(([k, t]) => (
          <div key={k} style={{ padding: '12px 0', borderTop: '1px solid #F1ECEE' }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 8 }}>{t}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {R3.map(o => {
                const ativo = e.local[k] === o.v;
                const cor = o.v === 'sim' ? C.verde : o.v === 'nao' ? C.vermelho : C.ambar;
                return <button key={o.v} onClick={() => mudar({ local: { ...e.local, [k]: o.v } })} style={{ minHeight: 44, borderRadius: 12, cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 14.5, border: ativo ? 'none' : '1.5px solid #EDE6E9',
                  background: ativo ? cor : '#fff', color: ativo ? '#fff' : C.tinta }}>{o.t}</button>;
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13.5, color: C.suave, padding: '0 4px' }}>Acessos, horários de montagem, frio, mesas e lixo estão em «Perguntas ao cliente».</div>
    </>
  );
}

// ── Fichas técnicas e orçamentos (requisições) ─────────────────
function FichasOrcamentos({ e, mudar, nomeProfessor }: { e: EventoECL; mudar: (x: Partial<EventoECL>) => void; nomeProfessor?: string }) {
  const todas = getFichasProducao();
  const [procurar, setProcurar] = useState(false);
  const [q, setQ] = useState('');
  const [novo, setNovo] = useState<OrcamentoEvento | null>(null);
  const [aberto, setAberto] = useState<OrcamentoEvento | null>(null);
  const [aviso, setAviso] = useState('');
  const fichasDoEvento = e.fichasIds.map(id => todas.find(f => f.id === id)).filter(Boolean) as any[];
  const reqs = getRequisicoes();
  const custoDe = (o: OrcamentoEvento) => reqs.find(r => r.id === o.requisicaoId)?.custoTotal ?? o.custo;

  if (aberto) {
    return (
      <>
        <button onClick={() => setAberto(null)} style={{ ...botao(), minHeight: 40, padding: '8px 14px', fontSize: 14, marginBottom: 12 }}>← Orçamentos</button>
        <div style={{ ...cartao, background: C.bordeauxSuave, boxShadow: 'none', fontSize: 15 }}>
          <b>{aberto.nome}</b> · {aberto.pessoas} pessoas · {aberto.fichasIds.length} ficha{aberto.fichasIds.length === 1 ? '' : 's'}
          <div style={{ fontSize: 13.5, color: C.texto, marginTop: 4 }}>É a requisição de sempre. Ao guardar, fica ligada a este orçamento e o custo aparece no evento.</div>
        </div>
        <Requisicao nomeProfessor={nomeProfessor} turmaId={e.turmaResponsavel || e.turmasIds[0]} fichasIniciais={aberto.fichasIds}
          evento={{ eventoId: e.id, orcamentoId: aberto.id, requisicaoId: aberto.requisicaoId, nome: `${e.nome} — ${aberto.nome}`,
            data: e.data, pessoas: aberto.pessoas, turmaId: e.turmaResponsavel || e.turmasIds[0],
            onGuardada: (_id, custo) => mudar({ orcamentos: e.orcamentos.map(o => o.id === aberto.id ? { ...o, custo } : o),
              tarefas: { ...e.tarefas, requisicao: { feito: true } } }) }} />
      </>
    );
  }

  async function ia(onde: 'chatgpt' | 'gemini') {
    const pedido = pedidoMenuIA(e);
    try { await navigator.clipboard.writeText(pedido); } catch { /* */ }
    window.open(onde === 'chatgpt' ? 'https://chatgpt.com/?q=' + encodeURIComponent(pedido) : 'https://gemini.google.com/app', '_blank', 'noopener');
    setAviso(onde === 'chatgpt' ? 'Abri o ChatGPT com as propostas. Crie as fichas das iguarias escolhidas e junte-as aqui.'
      : 'O pedido está copiado: cole-o no Gemini (Ctrl+V). Depois crie as fichas e junte-as aqui.');
  }

  const encontradas = todas.filter(f => !e.fichasIds.includes(f.id) && (!q.trim() || (f.nomePrato || '').toLowerCase().includes(q.toLowerCase()))).slice(0, 30);

  return (
    <>
      {/* 1. Fichas técnicas do evento */}
      <div style={{ ...rotulo, marginTop: 0 }}>Fichas técnicas do evento</div>
      <div style={cartao}>
        {fichasDoEvento.length === 0 && (
          <div style={{ fontSize: 14.5, color: C.texto, lineHeight: 1.5, marginBottom: 12 }}>
            Junte as fichas técnicas das iguarias do evento. Depois, em cada orçamento, escolha as que entram.
            {e.clienteSabe !== 'sim' && <> Não sabe ainda o menu? Peça propostas a uma IA:</>}
          </div>
        )}
        {fichasDoEvento.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #F1ECEE' }}>
            <span style={{ fontSize: 20 }}>🧾</span>
            <span style={{ flex: 1 }}><b style={{ fontSize: 15 }}>{f.nomePrato}</b><br /><span style={{ fontSize: 13, color: C.suave }}>{f.classificacao || ''}{f.numPorcoes ? ` · ${f.numPorcoes} doses` : ''}</span></span>
            <button onClick={() => mudar({ fichasIds: e.fichasIds.filter(x => x !== f.id) })} style={{ background: 'none', border: 'none', color: C.suave, fontSize: 18, cursor: 'pointer' }} title="Tirar do evento">✕</button>
          </div>
        ))}
        {!procurar ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <button onClick={() => setProcurar(true)} style={{ ...botao('principal'), width: '100%' }}>+ Juntar fichas da biblioteca</button>
            {e.clienteSabe !== 'sim' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => ia('chatgpt')} style={botao()}>✨ Propostas no ChatGPT</button>
                <button onClick={() => ia('gemini')} style={botao()}>✨ Propostas no Gemini</button>
              </div>
            )}
            {aviso && <div style={{ fontSize: 13.5, color: C.texto }}>{aviso}</div>}
            <div style={{ fontSize: 13, color: C.suave }}>Para criar uma ficha nova, use «Biblioteca de fichas» no menu; depois volte aqui e junte-a.</div>
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <input autoFocus value={q} onChange={x => setQ(x.target.value)} placeholder="Procurar ficha pelo nome…" style={campo} />
            <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 8 }}>
              {encontradas.map(f => (
                <button key={f.id} onClick={() => mudar({ fichasIds: [...e.fichasIds, f.id], menu: e.menu })}
                  style={{ display: 'flex', width: '100%', gap: 10, alignItems: 'center', padding: '11px 6px', background: 'none', border: 'none',
                    borderTop: '1px solid #F1ECEE', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 18, color: C.bordeaux, fontWeight: 800 }}>+</span>
                  <span><b style={{ fontSize: 15 }}>{f.nomePrato}</b><span style={{ fontSize: 13, color: C.suave }}> · {f.classificacao || ''}</span></span>
                </button>
              ))}
              {encontradas.length === 0 && <div style={{ fontSize: 14, color: C.suave, padding: 10 }}>Nenhuma ficha encontrada.</div>}
            </div>
            <button onClick={() => { setProcurar(false); setQ(''); }} style={{ ...botao(), width: '100%', marginTop: 8 }}>Pronto</button>
          </div>
        )}
      </div>

      {/* 2. Orçamentos */}
      <div style={rotulo}>Orçamentos</div>
      <div style={{ fontSize: 14, color: C.texto, margin: '-4px 4px 10px', lineHeight: 1.5 }}>
        No mesmo evento pode haver várias propostas. Cada orçamento tem as suas fichas e a sua requisição.
      </div>
      {e.orcamentos.map(o => {
        const custo = custoDe(o);
        return (
          <div key={o.id} style={{ ...cartao, border: o.escolhido ? `2px solid ${C.verde}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1 }}>
                <b style={{ fontSize: 16.5 }}>{o.nome}</b>{o.escolhido && <span style={{ color: C.verde, fontWeight: 800 }}> · escolhido ✓</span>}
                <div style={{ fontSize: 13.5, color: C.suave, marginTop: 2 }}>
                  {o.fichasIds.map(id => todas.find(f => f.id === id)?.nomePrato).filter(Boolean).join(' · ') || 'sem fichas'}
                </div>
              </span>
              <span style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: custo ? C.bordeaux : C.suave }}>{custo ? euros(custo) : '—'}</div>
                <div style={{ fontSize: 12.5, color: C.suave }}>{o.pessoas} pessoas{custo && o.pessoas ? ` · ${euros(custo / o.pessoas)}/pessoa` : ''}</div>
              </span>
            </div>
            <FolhaOrcamento e={e} o={o} custo={custo || 0}
              mudarOrc={(patch) => mudar({ orcamentos: e.orcamentos.map(x => x.id === o.id ? { ...x, ...patch } : x) })} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 12 }}>
              <button onClick={() => setAberto(o)} style={botao('principal')}>{custo ? 'Abrir a requisição' : 'Fazer a requisição →'}</button>
              <button onClick={() => mudar({ orcamentos: e.orcamentos.map(x => ({ ...x, escolhido: x.id === o.id ? !o.escolhido : false })),
                custoPrevisto: !o.escolhido && custo ? String(custo.toFixed(2)) : e.custoPrevisto })} style={botao(o.escolhido ? 'verde' : 'claro')}>
                {o.escolhido ? '✓ Escolhido' : 'Escolher'}</button>
            </div>
          </div>
        );
      })}

      {!novo ? (
        <button disabled={!e.fichasIds.length} onClick={() => setNovo({ id: 'orc_' + Date.now(), nome: `Proposta ${String.fromCharCode(65 + e.orcamentos.length)}`,
          fichasIds: [...e.fichasIds], pessoas: e.pessoas, requisicaoId: `req_ev_${e.id}_${Date.now()}` })}
          style={{ ...botao(), width: '100%', opacity: e.fichasIds.length ? 1 : 0.5 }}>
          + Novo orçamento{!e.fichasIds.length ? ' (junte primeiro as fichas)' : ''}
        </button>
      ) : (
        <div style={{ ...cartao, border: `2px solid ${C.bordeaux}` }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Novo orçamento</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
            <input value={novo.nome} onChange={x => setNovo({ ...novo, nome: x.target.value })} style={campo} />
            <input type="number" value={novo.pessoas || ''} onChange={x => setNovo({ ...novo, pessoas: Number(x.target.value) || 0 })} placeholder="Pessoas" style={campo} />
          </div>
          <div style={{ fontSize: 14, color: C.texto, margin: '12px 0 8px', fontWeight: 700 }}>Que fichas entram neste orçamento?</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {fichasDoEvento.map(f => (
              <Opcao key={f.id} ativo={novo.fichasIds.includes(f.id)} icone="🧾"
                onClick={() => setNovo({ ...novo, fichasIds: novo.fichasIds.includes(f.id) ? novo.fichasIds.filter(x => x !== f.id) : [...novo.fichasIds, f.id] })}>
                {f.nomePrato}</Opcao>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 14 }}>
            <button disabled={!novo.fichasIds.length} onClick={() => { const o = novo; mudar({ orcamentos: [...e.orcamentos, o] }); setNovo(null); setAberto(o); }}
              style={{ ...botao('principal'), opacity: novo.fichasIds.length ? 1 : 0.5 }}>Criar e fazer a requisição →</button>
            <button onClick={() => setNovo(null)} style={botao()}>Cancelar</button>
          </div>
        </div>
      )}

      {/* 3. Valor a propor */}
      <div style={rotulo}>Valor a propor ao cliente</div>
      <div style={cartao}>
        <div style={{ fontSize: 14, color: C.texto, marginBottom: 10, lineHeight: 1.5 }}>
          Ao custo da requisição juntam-se bebidas, descartáveis, lavandaria e transporte. A Direção decide o valor.
          {e.orcamento === 'sim' && <> O cliente indicou: <b>{e.orcamentoValor}</b>.</>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ fontSize: 13.5, color: C.suave }}>Custo previsto (€)<input value={e.custoPrevisto} onChange={x => mudar({ custoPrevisto: x.target.value })} inputMode="decimal" style={campo} /></label>
          <label style={{ fontSize: 13.5, color: C.suave }}>Valor proposto (€)<input value={e.precoProposto} onChange={x => mudar({ precoProposto: x.target.value })} inputMode="decimal" style={campo} /></label>
        </div>
      </div>
    </>
  );
}

// ── Listas de tarefas (preparação, material, dia do evento) ────
function ListaTarefas({ e, mudar, fases }: { e: EventoECL; mudar: (x: Partial<EventoECL>) => void; fases: Tarefa['fase'][] }) {
  const [tudo, setTudo] = useState(false);
  const todas = tarefasDoEvento(e).filter(t => fases.includes(t.fase));
  const hoje = hojeISO();
  const feita = (t: Tarefa) => !!e.tarefas[t.id]?.feito;
  const visiveis = tudo ? todas : todas.filter(t => !feita(t) && !e.tarefas[t.id]?.naoAplica);
  const marcar = (t: Tarefa, x: { feito?: boolean; naoAplica?: boolean; responsavel?: string }) =>
    mudar({ tarefas: { ...e.tarefas, [t.id]: { ...e.tarefas[t.id], ...x } } });
  const eDia = fases.includes('Dia do evento');
  const nFeitas = todas.filter(feita).length;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, fontSize: 15, color: C.texto }}>
          {eDia ? <>{diaSemana(e.data)} — <b>hora a hora</b></> : <><b>{nFeitas} de {todas.length}</b> feitas · aparece só o que falta</>}
        </div>
        <button onClick={() => setTudo(!tudo)} style={{ ...botao(), minHeight: 38, padding: '6px 12px', fontSize: 13 }}>{tudo ? 'Só o que falta' : 'Ver tudo'}</button>
      </div>
      {visiveis.length === 0 && <div style={{ ...cartao, textAlign: 'center', color: C.verde, fontWeight: 800, fontSize: 16 }}>✓ Está tudo feito</div>}
      {visiveis.map(t => {
        const prazo = dataDaTarefa(e, t.d);
        const atrasada = !feita(t) && !!prazo && prazo < hoje;
        const est = e.tarefas[t.id] || {};
        return (
          <div key={t.id} style={{ ...cartao, padding: 14, display: 'flex', gap: 12, alignItems: 'center', opacity: est.naoAplica ? 0.5 : 1,
            borderLeft: `5px solid ${feita(t) ? C.verde : atrasada ? C.vermelho : t.critica ? C.bordeaux : '#E4DDE0'}` }}>
            {eDia && t.hora && <div style={{ fontSize: 17, fontWeight: 800, color: C.bordeaux, width: 52, flexShrink: 0 }}>{t.hora}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, color: C.tinta, textDecoration: feita(t) || est.naoAplica ? 'line-through' : 'none', lineHeight: 1.35 }}>{t.texto}</div>
              <div style={{ fontSize: 13, color: atrasada ? C.vermelho : C.suave, marginTop: 3 }}>
                {est.responsavel || t.quem}{!eDia && prazo ? ` · até ${dataPT(prazo)}` : ''}{atrasada ? ' · atrasada' : ''}{t.critica && !feita(t) ? ' · importante' : ''}
              </div>
            </div>
            <button onClick={() => marcar(t, { feito: !feita(t) })} style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, cursor: 'pointer', fontSize: 20, fontWeight: 900,
              border: feita(t) ? 'none' : '2px solid #D9CFD3', background: feita(t) ? C.verde : '#fff', color: feita(t) ? '#fff' : C.bordeauxClaro }}>✓</button>
            <details style={{ flexShrink: 0 }}>
              <summary style={{ listStyle: 'none', cursor: 'pointer', fontSize: 22, color: C.suave, padding: '0 4px' }}>⋯</summary>
              <div style={{ position: 'absolute', right: 30, background: '#fff', boxShadow: C.sombra, borderRadius: 12, padding: 8, zIndex: 5, display: 'grid', gap: 6 }}>
                <button onClick={() => { const r = prompt('Quem fica responsável?', est.responsavel || ''); if (r !== null) marcar(t, { responsavel: r }); }} style={{ ...botao(), minHeight: 38, fontSize: 13.5 }}>👤 Responsável</button>
                <button onClick={() => marcar(t, { naoAplica: !est.naoAplica })} style={{ ...botao(), minHeight: 38, fontSize: 13.5 }}>{est.naoAplica ? 'Aplica-se' : 'Não se aplica'}</button>
              </div>
            </details>
          </div>
        );
      })}
    </>
  );
}

// ── Fechar ─────────────────────────────────────────────────────
function Fecho({ e, mudar }: { e: EventoECL; mudar: (x: Partial<EventoECL>) => void }) {
  const f = e.fecho;
  const set = (x: Partial<EventoECL['fecho']>) => mudar({ fecho: { ...f, ...x } });
  const SN = ({ k, t }: { k: 'conforme' | 'faltas' | 'desperdicio'; t: string }) => (
    <div style={{ padding: '12px 0', borderTop: '1px solid #F1ECEE' }}>
      <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 8 }}>{t}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => set({ [k]: 'sim' } as any)} style={botao(f[k] === 'sim' ? 'principal' : 'claro')}>Sim</button>
        <button onClick={() => set({ [k]: 'nao' } as any)} style={botao(f[k] === 'nao' ? 'principal' : 'claro')}>Não</button>
      </div>
    </div>
  );
  function relatorio() {
    const cl = classificar(e);
    const w = window.open('', '_blank'); if (!w) return;
    const todas = getFichasProducao();
    const linhas = tarefasDoEvento(e).map(t => `<tr><td>${t.fase}</td><td>${t.texto}</td><td>${e.tarefas[t.id]?.feito ? '✓' : e.tarefas[t.id]?.naoAplica ? 'n/a' : '—'}</td></tr>`).join('');
    w.document.write(`<html><head><title>Relatório — ${e.nome}</title><style>body{font-family:sans-serif;padding:24px}td{border-bottom:1px solid #ddd;padding:4px 8px;font-size:13px}</style></head><body>`
      + `<div style="display:flex;align-items:center;gap:12px;margin:0 0 12px"><img src="${LOGO_ECL}" alt="Escola de Comércio de Lisboa" style="height:50px;width:auto"/></div><h1>${e.nome}</h1><p>${e.entidade} · ${dataPT(e.data)} · ${e.pessoas} pessoas · ${e.onde === 'ecl' ? 'ECL' : e.morada}</p>`
      + `<p>Complexidade: ${cl.nivel} · Turmas: ${[...e.turmasIds, ...e.outrasAreas].join(', ')}</p>`
      + `<h2>Fichas</h2><p>${e.fichasIds.map(id => todas.find(x => x.id === id)?.nomePrato).filter(Boolean).join(' · ') || '—'}</p>`
      + `<h2>Orçamentos</h2><ul>${e.orcamentos.map(o => `<li>${o.nome}${o.escolhido ? ' (escolhido)' : ''}: ${o.custo ? euros(o.custo) : '—'} · ${o.pessoas} pessoas</li>`).join('')}</ul>`
      + `<p>Custo previsto: ${e.custoPrevisto || '—'} € · Valor proposto: ${e.precoProposto || '—'} €</p>`
      + `<h2>Fecho</h2><p>Correu conforme planeado: ${f.conforme || '—'} · Faltas/quebras: ${f.faltas || '—'} · Desperdício relevante: ${f.desperdicio || '—'}</p>`
      + `<p>Feedback do cliente: ${f.feedback || '—'}</p><p>Ocorrências: ${f.ocorrencias || '—'}</p>`
      + ((e.alteracoes || []).length ? `<h2>Alterações</h2><ul>${(e.alteracoes || []).map(a => `<li>${a.oQue} — ${a.pedidoPor} — ${a.impacto}</li>`).join('')}</ul>` : '')
      + `<h2>Tarefas</h2><table>${linhas}</table></body></html>`);
    w.document.close(); w.print();
  }
  return (
    <>
      <div style={cartao}>
        <div style={{ fontSize: 14.5, color: C.texto, marginBottom: 4 }}>Cinco perguntas. A aplicação faz o relatório.</div>
        <SN k="conforme" t="Correu conforme planeado?" />
        <SN k="faltas" t="Houve faltas ou quebras de material?" />
        <SN k="desperdicio" t="Houve desperdício relevante?" />
        <div style={{ padding: '12px 0', borderTop: '1px solid #F1ECEE' }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 8 }}>O que disse o cliente?</div>
          <textarea value={f.feedback || ''} onChange={x => set({ feedback: x.target.value })} rows={2} style={campo} />
        </div>
        <div style={{ padding: '12px 0', borderTop: '1px solid #F1ECEE' }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 8 }}>Ocorrências e o que melhorar para a próxima</div>
          <textarea value={f.ocorrencias || ''} onChange={x => set({ ocorrencias: x.target.value })} rows={3} style={campo} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={relatorio} style={botao()}>🖨️ Relatório</button>
        <button onClick={() => mudar({ estado: 'fechado' })} disabled={!f.conforme} style={{ ...botao('verde'), opacity: f.conforme ? 1 : 0.5 }}>✓ Fechar o evento</button>
      </div>
    </>
  );
}

export default EventosECL;


// ══════════════════════════════════════════════════════════════
// Folha de orçamento — custo da requisição + outros custos, e a
// folha que vai para o cliente (com o logótipo da escola).
// ══════════════════════════════════════════════════════════════
const EXTRAS_SUGERIDOS = ['Bebidas', 'Descartáveis', 'Lavandaria', 'Transporte', 'Alugueres', 'Outros'];

function valorExtra(x: ExtraOrcamento, pessoas: number): number {
  const v = parseFloat(String(x.valor || '').replace(',', '.')) || 0;
  return x.modo === 'pessoa' ? v * (pessoas || 0) : v;
}

function FolhaOrcamento({ e, o, custo, mudarOrc }: { e: EventoECL; o: OrcamentoEvento; custo: number;
  mudarOrc: (p: Partial<OrcamentoEvento>) => void }) {
  const extras = o.extras || [];
  const pessoas = o.pessoas || e.pessoas || 0;
  const totalExtras = extras.reduce((s, x) => s + valorExtra(x, pessoas), 0);
  const total = custo + totalExtras;
  const porPessoa = pessoas ? total / pessoas : 0;
  const valorPessoa = parseFloat(String(o.valorPessoa || '').replace(',', '.')) || 0;
  const setExtra = (id: string, p: Partial<ExtraOrcamento>) => mudarOrc({ extras: extras.map(x => x.id === id ? { ...x, ...p } : x) });
  const juntar = (nome: string) => mudarOrc({ extras: [...extras, { id: 'x' + Date.now(), nome, valor: '', modo: 'total' }] });

  function imprimir() {
    const w = window.open('', '_blank'); if (!w) return;
    const fichas = getFichasProducao().filter(f => o.fichasIds.includes(f.id));
    const linhasMenu = fichas.map(f => {
      const c = custoDaFicha(f, pessoas).total;
      return `<tr><td>${f.nomePrato}</td><td class="n">${o.semCustoPorPrato || !c ? '' : euros(c)}</td></tr>`;
    }).join('');
    const linhasExtras = extras.filter(x => valorExtra(x, pessoas) > 0)
      .map(x => `<tr><td>${x.nome}${x.modo === 'pessoa' ? ` (${x.valor} €/pessoa)` : ''}</td><td class="n">${euros(valorExtra(x, pessoas))}</td></tr>`).join('');
    // Sem valor da Direção, a folha não pode mostrar o custo como se fosse o
    // preço ao cliente: mostra o custo como custo e diz que o valor está por definir.
    const valorFinal = valorPessoa;
    w.document.write(`<html><head><title>Orçamento — ${e.nome}</title><style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1a1714;max-width:760px;margin:auto}
      header{display:flex;align-items:center;gap:18px;border-bottom:3px solid #7B2233;padding-bottom:14px;margin-bottom:18px}
      header img{height:70px} h1{font-size:22px;margin:0;color:#7B2233} h2{font-size:15px;margin:22px 0 6px;color:#7B2233;text-transform:uppercase;letter-spacing:.05em}
      table{width:100%;border-collapse:collapse} td{padding:6px 8px;border-bottom:1px solid #e6dde0;font-size:14px} td.n{text-align:right;white-space:nowrap}
      .tot td{font-weight:bold;border-top:2px solid #7B2233} .dest{margin-top:22px;padding:14px;background:#f7eef0;border-radius:8px;font-size:16px}
      .pe{margin-top:40px;font-size:12px;color:#777}</style></head><body>
      <header><img src="${LOGO_ECL}"/><div><h1>Proposta de orçamento — ${o.nome}</h1>
      <div>${e.nome || ''}${e.entidade ? ' · ' + e.entidade : ''}</div>
      <div>${dataPT(e.data)}${e.horaInicio ? ' · ' + e.horaInicio : ''} · ${e.onde === 'ecl' ? 'Escola de Comércio de Lisboa' : (e.morada || 'Local a definir')} · ${pessoas} pessoas</div></div></header>
      <h2>Menu</h2><table>${linhasMenu || '<tr><td>—</td></tr>'}</table>
      ${o.semCustoPorPrato ? '' : `<h2>Custos</h2><table>
        <tr><td>Matérias-primas (requisição)</td><td class="n">${euros(custo)}</td></tr>${linhasExtras}
        <tr class="tot"><td>Custo total</td><td class="n">${euros(total)}</td></tr></table>`}
      <div class="dest">${valorFinal
        ? `<b>Valor por pessoa: ${euros(valorFinal)}</b> · Total para ${pessoas} pessoas: <b>${euros(valorFinal * pessoas)}</b>`
        : `Custo por pessoa: <b>${euros(porPessoa)}</b> · <i>valor a propor ainda por definir pela Direção</i>`}</div>
      <div class="pe">Proposta válida por 15 dias. Escola de Comércio de Lisboa.</div>
      </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  }

  return (
    <details style={{ marginTop: 10, borderTop: '1px solid #F1ECEE', paddingTop: 8 }}>
      <summary style={{ cursor: 'pointer', fontSize: 14.5, fontWeight: 700, color: C.bordeaux }}>
        Folha de orçamento · total {euros(total)}{pessoas ? ` · ${euros(porPessoa)}/pessoa` : ''}
      </summary>
      <div style={{ fontSize: 13.5, color: C.suave, margin: '8px 0' }}>Matérias-primas (da requisição): <b style={{ color: C.tinta }}>{euros(custo)}</b></div>
      {extras.map(x => (
        <div key={x.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input value={x.nome} onChange={ev => setExtra(x.id, { nome: ev.target.value })} style={campo} />
          <input value={x.valor} onChange={ev => setExtra(x.id, { valor: ev.target.value })} inputMode="decimal" placeholder="€" style={campo} />
          <select value={x.modo} onChange={ev => setExtra(x.id, { modo: ev.target.value as any })} style={campo}>
            <option value="total">no total</option><option value="pessoa">por pessoa</option>
          </select>
          <button onClick={() => mudarOrc({ extras: extras.filter(y => y.id !== x.id) })} style={{ ...botao(), padding: '6px 10px' }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 10px' }}>
        {EXTRAS_SUGERIDOS.filter(n => !extras.some(x => x.nome === n)).map(n => (
          <button key={n} onClick={() => juntar(n)} style={{ ...botao(), padding: '6px 10px', fontSize: 13 }}>+ {n}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'end' }}>
        <label style={{ fontSize: 13.5, color: C.suave }}>Valor por pessoa a propor (Direção)
          <input value={o.valorPessoa || ''} onChange={ev => mudarOrc({ valorPessoa: ev.target.value })} inputMode="decimal"
            placeholder={porPessoa ? porPessoa.toFixed(2).replace('.', ',') : '€'} style={campo} /></label>
        <label style={{ fontSize: 13.5, color: C.texto, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={!!o.semCustoPorPrato} onChange={ev => mudarOrc({ semCustoPorPrato: ev.target.checked })} />
          Folha para o cliente: sem custos</label>
      </div>
      <button onClick={imprimir} style={{ ...botao(), width: '100%', marginTop: 10 }}>🖨️ Imprimir a folha de orçamento</button>
    </details>
  );
}

// ══════════════════════════════════════════════════════════════
// QUANTIDADES POR PESSOA — só valores dos manuais, com a fonte
// ══════════════════════════════════════════════════════════════
function Quantidades({ e, mudar }: { e: EventoECL; mudar: (x: Partial<EventoECL>) => void }) {
  const q = e.quantidades || {};
  const mudarQ = (x: Partial<NonNullable<EventoECL['quantidades']>>) => mudar({ quantidades: { ...q, ...x } });
  const temCriancas = e.publico.includes('Crianças') || e.publico.includes('Público misto') || (q.criancas || 0) > 0;
  const temBuffet = e.momentos.some(m => tipoDoMomento(m.tipo, e.servico) === 'refeicao') && !['sentado', 'empratado'].includes(e.servico);

  if (!e.momentos.length) return <div style={{ ...cartao, color: C.texto }}>Ainda não há momentos de serviço. Responde primeiro no «O pedido» (welcome drink, coffee break, almoço…).</div>;

  return (
    <>
      <div style={{ ...cartao, background: C.bordeauxSuave, boxShadow: 'none', fontSize: 14.5, color: C.tinta, lineHeight: 1.45 }}>
        Quantidades tiradas de manuais profissionais de catering. <b>✔</b> quer dizer que as fontes batem certo.
        Quando não batem, aparecem as duas e escolhes uma.
      </div>

      {temCriancas && (
        <div style={cartao}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.tinta, marginBottom: 8 }}>Quantas das {e.pessoas || '?'} pessoas são crianças?</div>
          <input type="number" min={0} max={e.pessoas || undefined} value={q.criancas || ''} placeholder="0"
            onChange={x => mudarQ({ criancas: Math.max(0, Number(x.target.value) || 0) })} style={{ ...campo, maxWidth: 160 }} />
          <div style={{ fontSize: 13, color: C.suave, marginTop: 6 }}>Cada criança conta 50–60% de um adulto (só os guias americanos dão este valor).</div>
        </div>
      )}

      {temBuffet && (
        <div style={cartao}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.tinta, marginBottom: 8 }}>Quantos pratos principais (carne + peixe) no buffet?</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[1, 2, 3].map(n => <Pastilha key={n} ativo={(q.pratos || 2) === n} onClick={() => mudarQ({ pratos: n })}>{n}</Pastilha>)}
          </div>
        </div>
      )}

      {e.momentos.map(m => {
        const t = tipoDoMomento(m.tipo, e.servico);
        const pessoas = m.pessoas || e.pessoas;
        const b = quantidadesDoMomento(m.tipo, e.servico, pessoas, q, m.id);
        const opDur = t === 'coffee' ? DURACOES.coffee : t === 'cocktail' ? DURACOES.cocktail : null;
        const durPadrao = t === 'coffee' ? 'curto' : (m.tipo === 'almoco' || m.tipo === 'jantar') ? 'substitui' : 'antes';
        const eq = equivalenteAdulto(pessoas, q.criancas);
        return (
          <div key={m.id} style={cartao}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.tinta }}>{ICONE_MOMENTO[m.tipo] || '✳️'} {nomeMomento(m.tipo)}{m.hora ? ` · ${m.hora}` : ''}</div>
            <div style={{ fontSize: 13.5, color: C.suave, marginBottom: 10 }}>
              {pessoas} pessoas{q.criancas ? ` (= ${Math.round(eq.min)}–${Math.round(eq.max)} adultos)` : ''}{t === 'refeicao' ? ` · ${SERVICOS.find(s => s.id === e.servico)?.nome || 'buffet'}` : ''}
            </div>
            {opDur && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {opDur.map(d => <Pastilha key={d.id} ativo={(q.duracao?.[m.id] || durPadrao) === d.id}
                  onClick={() => mudarQ({ duracao: { ...(q.duracao || {}), [m.id]: d.id } })}>{d.nome}</Pastilha>)}
              </div>
            )}
            {b.linhas.map((l, i) => (
              <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid #F0EAEC' : 'none' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <div style={{ flex: 1, fontSize: 15, color: C.tinta, fontWeight: 600 }}>{l.oQue}</div>
                  {!l.divergencia && <div style={{ fontSize: 15.5, fontWeight: 800, color: C.bordeaux, textAlign: 'right' }}>{l.quantidade}</div>}
                </div>
                <div style={{ fontSize: 12.5, color: C.suave, marginTop: 2 }}>
                  {l.acordo && !l.nota ? '✔ ' : ''}{l.base} · {l.fontes.join(' + ')}{l.nota ? ` · ${l.nota}` : ''}
                </div>
                {l.divergencia && (
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    <div style={{ fontSize: 13, color: C.ambar, fontWeight: 700 }}>As fontes não coincidem. Escolha uma:</div>
                    {l.divergencia.opcoes.map((op, k) => (
                      <Opcao key={k} ativo={l.divergencia!.escolhida === k} sub={op.fonte}
                        onClick={() => mudarQ({ escolha: { ...(q.escolha || {}), [l.divergencia!.id]: k as 0 | 1 } })}>{op.quantidade}</Opcao>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {b.notas.map((n, i) => <div key={i} style={{ fontSize: 13, color: C.texto, marginTop: 6 }}>• {n}</div>)}
          </div>
        );
      })}
    </>
  );
}
