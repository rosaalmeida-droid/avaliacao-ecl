import { categoriaDaNota } from '../compatECL';
import { BotaoPCC } from './BotaoPCC';
import { ManuaisDoAluno, BotaoManualDaUC } from './BibliotecaManuais';
import { conhecimentosDaAula } from '../compatECL';
import React, { useState, useRef, useEffect } from 'react';
import { lerAula, aulaRapidaDisponivel, contadorDaTurma, getPlanosAula } from '../backend';
import { PassoGrupo, AvaliarColegas, configGrupos } from './GruposAluno';
import { PrecosConsulta } from './EventosOrcamentos';
import { grupoDoAluno, marcarTemaNoGrupo, temasDosColegas, getPlanosFaltadosPorUC, bonusPorAtividade, type BonusDaAtividade } from '../backend';
import { ModalFullscreen } from './ModalFullscreen';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa, trimestreAtual } from '../datas';
import { rotuloPlano } from '../rotuloPlano';

// Âncora: nº da UC no referencial 811RA144 + data com dia da semana
const NUM_UC_AL: Record<string, number> = {
  UC03576:1, UC01999:2, UC03577:3, UC02002:4, UC02003:5, UC02004:6, UC02005:7,
  UC03578:8, UC00596:9, UC03579:10, UC03580:11, UC03581:12, UC03582:13, UC00039:14,
  UC00056:15, UC00034:16, UC00054:17, UC03583:18, UC00038:19, UC03584:20, UC00031:21,
  UC00032:22, UC00035:23, UC00595:24, UC00069:25, UC00068:26,
};
function ucAncora(ucId?: string, ucNome?: string): string {
  if (!ucId) return ucNome || '';
  return (NUM_UC_AL[ucId] ? NUM_UC_AL[ucId] + ' · ' : '') + ucId + (ucNome ? ' — ' + ucNome : '');
}
import { Aluno, PlanoAula, FichaProducao, calcularNotaPlano, PESOS_AULA, classificacao20, notaPara20, nivelPara20, nivelDe20 } from '../types';
import { atitudesAnteriores, idsAtitudesAnteriores, atitudesQueFaltam, ehTurmaTransicao } from '../transicaoReferencial';
import {
  getPlanosAulaPorTurma, getFichasPorPlano, getRequisicaoPorPlano,
  getDistribuicoesPorPlano, getChecklistAlunoFicha, addOrUpdateChecklistAluno,
  addOrUpdateSelecao, getHistoricoAlunoMicro, addRegistoAvaliacao, addRegistoPresenca,
  getHistoricoAluno, registarHigieneKitchenFlow, registarTemperaturaKitchenFlow,
  registarNaoConformidadeKitchenFlow, abrirKitchenFlow, KITCHENFLOW_APP_URL, getPresencas,
  sincronizarEvidenciasKitchenFlow, extrairRegistosObrigatorios, EvidenciaKitchenFlow,
  sincronizarDoSheets, juntarDaBase, calcularPontosRegularidade, getSelecoes, getValidacoes,
  addAviso, getAtividades, inscreverEmAtividade, registarBalancoAtividade,
  getSessaoAula, estadoTolerancia, podeRegistar, marcarPresenca,
  ehLiderKF, liderKFdoGrupo, getAlunos, sincronizarSessoes,
  situacaoRecuperacaoUC, getNotaFinalPublicadaUC, previsaoNota , leituraDePlanosFalhou , vigiarAlteracoes , diagnosticoDetalhado, type CausaAulaEmFalta , aparelhoSemEspaco, pedirAjudaAoProfessor, validacaoDaSelecao, ultimaResposta, reabertaPorResponder, aulaDoDiaDaAtividade, rotuloDoPlano, partesDoPlanoParaOAluno, atitudesNoPlanoDaTurma, selecaoJaValidada, notaFinalUC, eventoForaDoHorario, modoParticipacao, notaDaAulaValidada, calculoDaAulaValidada, validacaoDaAula, contaNaNotaDaAula, contextoDoPlano, participantesDoEvento, eventosComoAtividades, inscreverNoEvento, selecaoPorConfirmar, confirmarEReenviar } from '../backend';
import {
  MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS, PARAMETROS_AVALIACAO,
  microsPorUC, microsPorFamilia, jaTeveSucesso, estaEmRegressao,
  encontrarAparelho, encontrarSubtecnica, aparelhosPermitidos,
  codigoDaLinha, codigosDasLinhas, ramoDaCompetencia, caminhoDoRamo,
  nomeCompetencia, encontrarConhecimento, dicaRecuperacaoAtitude,
  nivelComplexidadeAtitude, getAtitudeDetalhada, atitudesDoTrimestre,
  tecnicasDeRecurso,
} from '../compatECL';
import { definicaoDaTecnica } from '../definicoesTecnicas';
import { definicaoDaSubtecnica } from '../definicoesSubtecnicas';
import { getLibrary } from '../libraryService';
import { getFrasesParaCompetencia } from '../frases_subtecnicas';
import { GuiaProducao } from './GuiaProducao';
import { gerarPDFGuiao } from './GerarPDFGuiao';
import { CriteriosComp } from './CriteriosComp';
import { ManualCozinheiro } from './ManualCozinheiro';
import { RecuperacaoModulosAluno } from './RecuperacaoModulos';
import { PerfilProfissionalAluno } from './PerfilProfissional';
import { getReferencialUC } from '../referencial811RA144';
import {
  InicioAluno, NavegacaoAluno, CabecalhoAluno, CabecalhoEcra,
  IconesFarda, CORES, type DestinoAluno, type SeparadorAluno, type AvisoAluno,
} from './InicioAluno';
import { temOrganizacao, organizacaoDe, funcoesDoAluno } from '../organizacaoAula';
import { QuadroOrganizacional, CartaoMinhaFuncao, PassoMinhaFuncao } from './PlanoOrganizacional';
import { perguntasDaAula, notaTriagem, perguntaSeguinte, perguntaPorId, CL_SEMPRE, type Triagem5C } from '../triagem5c';
import { EcraCheio, FUNDO_ECRA, ProgressoSlides, NavSlides } from './EcraCheio';
import { LavarMaos } from './QuadroMaos';
import { kfFaseCompleta, getHistoricoAvaliacoes, ucsParaAutoavaliacaoFinal, guardarTriagemDaAula, registarMaosLavadas, registarFardaNaPresenca, perguntaCODaAula, perguntaCRDaAula } from '../backend';
import { TEC_EVENTO, NOME_TEC_EVENTO, OPCOES_TEC_EVENTO, ATITUDES_FIXAS_EVENTO } from '../eventosAvaliacao';
import { ManuaisAluno } from './ManuaisAluno';
import { modulosDaTurma as modulosDaTurmaAluno } from '../cronograma';
import { AutoavaliacaoFinalUC, CartaoAutoavaliacaoFinal, CartaoNotasFinais } from './AutoavaliacaoFinalUC';
import { EcraAvaliarMe, EcraNotaProgressiva } from './EcrasPercurso';
import { EcraMinhaNota, EcraAtividades } from './EcraNotaAtividades';
import { estadoDoNivel, opcoesDeEscolhaDoAluno } from '../motorAvaliacao';
import { pedidoDeExemplo, OPCOES_SIMPLES } from '../frases_simples';
import { perguntasDe, NAO_ACONTECEU, temPerguntas, atitudeRespondida as respondidaAtitude, nivelDaAtitude, textoDasRespostas,
  perguntasAplicaveis, atitudeAplicavel, respostasEfetivas } from '../perguntas_atitudes';
import { CINCO_C, triagemDoPlano, type Letra5CAluno } from '../contextoAula';
import { capituloDoCampo } from '../bancoManuais';
import { ouvirTurmaNaBase, TIPOS_DO_ALUNO } from '../baseDeDados';
import { regrasDaAutoavaliacao, ecrasDoAluno, type EcraDoAluno } from '../autoavaliacaoDaAula';
import { fraseDaAula } from './PlanoGuiado';
import { sumarioDoPlano } from '../sumarioAutomatico';
import { criterioTrabalho } from '../criteriosTrabalho';
import { DicionarioComp } from './DicionarioComp';
import { AvaliacaoPorUC } from './AvaliacaoPorUC';

// ─────────────────────────────────────────────────────────────
// TOKENS — tudo derivado das CSS vars do projeto
// ─────────────────────────────────────────────────────────────
const T = {
  cream:   '#faf7f2',
  charcoal:'#1a1714',
  copper:  '#b5651d',
  copperP: '#fdf0e6',
  sage:    '#5a7a4e',
  sageP:   '#eef4eb',
  danger:  '#c0392b',
  dangerP: '#fdf0ef',
  info:    '#2563eb',
  infoP:   '#eff6ff',
  border:  'rgba(26,23,20,0.10)',
};

const FARD_ITEMS = [
  { id:'touca',    label:'Touca',              emoji:'👒' },
  { id:'avental',  label:'Avental limpo',       emoji:'🧥' },
  { id:'sapatos',  label:'Sapatos de segurança',emoji:'👟' },
  { id:'farda',    label:'Farda completa',      emoji:'👔' },
  { id:'unhas',    label:'Sem unhas postiças',  emoji:'✋' },
  { id:'fones',    label:'Sem fones/adornos',   emoji:'🎧' },
  { id:'maos',     label:'Mãos limpas',         emoji:'🫧' },
  { id:'cabelo',   label:'Cabelo preso',         emoji:'💇' },
];

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────
function getHist(key: string): number { try { return parseInt(localStorage.getItem(key)||'0'); } catch { return 0; } }
function incHist(key: string) { try { localStorage.setItem(key, String(getHist(key)+1)); } catch {} }

function parseDataSegura(iso: string): Date | null {
  if (!iso) return null;
  // Ignorar datas inválidas do Google Sheets (1899, 1970, etc.)
  if (iso.startsWith('1899') || iso.startsWith('1900') || iso.startsWith('1970')) return null;
  // Formato YYYY-MM-DD
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const ano = parseInt(match[1]);
  if (ano < 2020 || ano > 2099) return null;
  return new Date(iso.slice(0,10) + 'T12:00:00');
}

// formatarData → importado de ../datas

function isHoje(iso: string): boolean {
  if (!parseDataSegura(iso)) return false;
  return iso.slice(0,10) === new Date().toISOString().slice(0,10);
}

function isFuturo(iso: string): boolean {
  return iso > new Date().toISOString().slice(0,10);
}

function diasParaData(iso: string): number {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const alvo = new Date(iso + 'T00:00:00'); alvo.setHours(0,0,0,0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

// ─────────────────────────────────────────────────────────────
// HOOK — scroll suave para elemento
// ─────────────────────────────────────────────────────────────
function useScrollTo() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTo = () => ref.current?.scrollIntoView({ behavior:'smooth', block:'start' });
  return { ref, scrollTo };
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE — Botão grande acessível
// ─────────────────────────────────────────────────────────────
function BotaoGrande({ onClick, cor, corTexto, emoji, label, sublabel, disabled, outline }: {
  onClick: () => void; cor: string; corTexto?: string; emoji: string;
  label: string; sublabel?: string; disabled?: boolean; outline?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width:'100%', display:'flex', alignItems:'center', gap:16,
        padding:'18px 20px', borderRadius:16, cursor: disabled ? 'not-allowed' : 'pointer',
        border: outline ? `2.5px solid ${cor}` : 'none',
        background: disabled ? 'rgba(26,23,20,0.05)' : outline ? '#fff' : cor,
        color: disabled ? 'rgba(26,23,20,0.3)' : outline ? cor : (corTexto || '#fff'),
        opacity: disabled ? 0.5 : 1,
        boxShadow: disabled ? 'none' : `0 4px 16px ${cor}30`,
        transition:'all 0.15s', textAlign:'left',
      }}
    >
      <span style={{ fontSize:36, lineHeight:1, flexShrink:0 }}>{emoji}</span>
      <div>
        <div style={{ fontSize:17, fontWeight:700, lineHeight:1.2 }}>{label}</div>
        {sublabel && <div style={{ fontSize:13, opacity:0.75, marginTop:2 }}>{sublabel}</div>}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE — Chip de estado
// ─────────────────────────────────────────────────────────────
function ChipEstado({ texto, cor, bg }: { texto:string; cor:string; bg:string }) {
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:100,
      background:bg, color:cor, fontSize:13, fontWeight:700, letterSpacing:'0.02em' }}>
      {texto}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE — Card de aviso
// ─────────────────────────────────────────────────────────────
function CardAviso({ emoji, titulo, corpo, cor, bg }: {
  emoji:string; titulo:string; corpo:string; cor:string; bg:string;
}) {
  return (
    <div style={{ display:'flex', gap:14, padding:'14px 16px', borderRadius:14,
      background:bg, border:`1.5px solid ${cor}40`, marginBottom:10 }}>
      <span style={{ fontSize:28, flexShrink:0, marginTop:2 }}>{emoji}</span>
      <div>
        <div style={{ fontWeight:700, fontSize:14, color:cor }}>{titulo}</div>
        <div style={{ fontSize:13, color:T.charcoal, opacity:0.75, marginTop:2 }}>{corpo}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE — Calendário do aluno
// ─────────────────────────────────────────────────────────────
function CalendarioAluno({ planos, onAbrirPlano, onMudarMes }: {
  planos: PlanoAula[];
  onAbrirPlano: (p: PlanoAula) => void;
  /** A lista ao lado tem de acompanhar o mês que está a ser visto. */
  onMudarMes?: (mes: number, ano: number) => void;
}) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  useEffect(() => { onMudarMes?.(mes, ano); }, [mes, ano]);

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes+1, 0).getDate();

  const planosPorData: Record<string, PlanoAula[]> = {};
  planos.forEach(p => {
    if (!planosPorData[p.data]) planosPorData[p.data] = [];
    planosPorData[p.data].push(p);
  });

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAno(a => a-1); }
    else setMes(m => m-1);
  }
  function proximoMes() {
    if (mes === 11) { setMes(0); setAno(a => a+1); }
    else setMes(m => m+1);
  }

  const celulas: (number|null)[] = Array(primeiroDia).fill(null);
  for (let d=1; d<=diasNoMes; d++) celulas.push(d);

  return (
    <div style={{ background:'#fff', borderRadius:20, border:`1px solid ${T.border}`,
      boxShadow:'0 2px 12px rgba(26,23,20,0.06)', overflow:'hidden' }}>
      {/* Cabeçalho do mês */}
      <div style={{ background:T.charcoal, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={mesAnterior} style={{ background:'rgba(255,255,255,0.15)', border:'none',
          borderRadius:10, width:36, height:36, fontSize:18, color:'#fff', cursor:'pointer' }}>‹</button>
        <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#fff' }}>
          {MESES[mes]} {ano}
        </div>
        <button onClick={proximoMes} style={{ background:'rgba(255,255,255,0.15)', border:'none',
          borderRadius:10, width:36, height:36, fontSize:18, color:'#fff', cursor:'pointer' }}>›</button>
      </div>

      {/* Dias da semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)',
        background:'rgba(26,23,20,0.04)', borderBottom:`1px solid ${T.border}` }}>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{ textAlign:'center', padding:'8px 0', fontSize:12.5,
            fontWeight:700, color:'rgba(26,23,20,0.4)', letterSpacing:'0.05em' }}>{d}</div>
        ))}
      </div>

      {/* Grelha de dias */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, padding:8 }}>
        {celulas.map((dia, i) => {
          if (!dia) return <div key={`v${i}`} />;
          const isoDate = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
          const temAula = !!planosPorData[isoDate];
          const eHoje = isHoje(isoDate);
          const aulas = planosPorData[isoDate] || [];
          const temEvento = aulas.some((p: any) => p.tipoEvento);

          return (
            <div key={dia}
              onClick={() => aulas.length && onAbrirPlano(aulas[0])}
              style={{
                position:'relative', aspectRatio:'1', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', borderRadius:12,
                cursor: temAula ? 'pointer' : 'default',
                background: eHoje ? T.copper : temEvento ? '#6B3FA0' : temAula ? T.sageP : 'transparent',
                border: eHoje ? `2px solid ${T.copper}` : temEvento ? '2px solid #6B3FA0' : temAula ? `1.5px solid ${T.sage}40` : 'none',
                transition:'all 0.15s',
              }}>
              <span style={{ fontSize:15, fontWeight: eHoje||temAula ? 700 : 400,
                color: eHoje || temEvento ? '#fff' : temAula ? T.sage : 'rgba(26,23,20,0.5)' }}>
                {dia}
              </span>
              {temAula && (
                <span style={{ width:6, height:6, borderRadius:'50%', marginTop:2,
                  background: eHoje ? 'rgba(255,255,255,0.8)' : T.sage }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div style={{ display:'flex', gap:16, padding:'10px 16px 14px', borderTop:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'rgba(26,23,20,0.5)' }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:T.copper, display:'inline-block' }}/>
          Hoje
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'rgba(26,23,20,0.5)' }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:T.sage, display:'inline-block' }}/>
          Aula
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'rgba(26,23,20,0.5)' }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#6B3FA0', display:'inline-block' }}/>
          Evento — autoavalia-te
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE — Card de aula na lista
// ─────────────────────────────────────────────────────────────
function CardAula({ plano, onAbrir }: { plano: PlanoAula; onAbrir: () => void }) {
  // Data por extenso. Sem isto o aluno abre um plano futuro pelo
  // calendário e sabe as horas mas não o dia.
  const dataLonga = new Date(plano.data + 'T00:00:00').toLocaleDateString('pt-PT',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hoje = isHoje(plano.data);
  const futuro = isFuturo(plano.data);
  const dias = diasParaData(plano.data);
  const d = parseDataSegura(plano.data) || new Date();
  // Evento ou concurso: roxo e bem destacado — o aluno também se autoavalia.
  const evento = !!(plano as any).tipoEvento;
  const ROXO = '#6B3FA0';

  // Card de aula passada — compacto
  if (!hoje && !futuro) {
    return (
      <div onClick={onAbrir} style={{
        display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
        borderRadius:14, background: evento ? '#F3ECFA' : '#fff',
        border: evento ? `2px solid ${ROXO}` : '1px solid rgba(26,23,20,0.08)',
        cursor:'pointer', marginBottom:8,
      }}>
        <div style={{ background:'rgba(26,23,20,0.06)', borderRadius:10,
          padding:'8px 10px', textAlign:'center', flexShrink:0, minWidth:44 }}>
          <div style={{ fontSize:18, fontWeight:700, color:T.charcoal, lineHeight:1 }}>
            {d.getDate().toString().padStart(2,'0')}
          </div>
          <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
            color:'rgba(26,23,20,0.4)', marginTop:1 }}>
            {d.toLocaleDateString('pt-PT',{month:'short'})}
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'rgba(26,23,20,0.55)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {plano.numeroPlan ? rotuloPlano(plano) : (plano.titulo || 'Plano de aula')}
          </div>
          {(plano.ucId || plano.ucNome) && (
            <div style={{ fontSize:12.5, color:T.copper, fontWeight:700, marginTop:2 }}>{ucAncora(plano.ucId, plano.ucNome)}</div>
          )}
        </div>
        {evento
          ? <ChipEstado texto="🏅 Evento · autoavalia-te" cor="#fff" bg={ROXO} />
          : <ChipEstado texto="Passada" cor="rgba(26,23,20,0.4)" bg="rgba(26,23,20,0.06)" />}
        <span style={{ fontSize:18, color:'rgba(26,23,20,0.2)', flexShrink:0 }}>›</span>
      </div>
    );
  }

  // Card de aula de hoje ou futura — grande e colorido
  const corFundo = evento ? '#6B3FA0' : hoje ? T.copper : '#2563eb';
  const diasLabel = dias === 1 ? 'AMANHÃ' : dias <= 7 ? `em ${dias} dias` : '';

  return (
    <div onClick={onAbrir} style={{
      borderRadius:20, overflow:'hidden', cursor:'pointer', marginBottom:12,
      boxShadow: hoje ? '0 8px 24px rgba(181,101,29,0.35)' : '0 4px 16px rgba(37,99,235,0.2)',
    }}>
      {/* Faixa colorida */}
      <div style={{ background:`linear-gradient(135deg, ${corFundo}, ${corFundo}dd)`,
        padding:'16px 18px' }}>
        {evento && (
          <div style={{ fontSize:12.5, fontWeight:800, color:'#fff', textTransform:'uppercase',
            letterSpacing:'0.1em', marginBottom:4 }}>
            🏅 {(plano as any).tipoEvento === 'concurso' ? 'Concurso' : 'Evento'} — também te autoavalias
          </div>
        )}
        {hoje && !evento && (
          <div style={{ fontSize:12.5, fontWeight:800, color:'rgba(255,255,255,0.65)',
            textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:4 }}>
            🔥 Aula de hoje
          </div>
        )}
        {!hoje && diasLabel && (
          <div style={{ fontSize:12.5, fontWeight:800, color:'rgba(255,255,255,0.65)',
            textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>
            📅 {diasLabel}
          </div>
        )}
        <div style={{ fontSize:18, fontWeight:800, color:'#fff', lineHeight:1.3,
          marginBottom:2 }}>
          {plano.numeroPlan ? rotuloPlano(plano) : (plano.titulo || 'Plano de aula')}
        </div>
        {(plano.ucId || plano.ucNome) && (
          <div style={{ fontSize:13, fontWeight:700, color:'#fff', opacity:0.95, marginBottom:6 }}>{ucAncora(plano.ucId, plano.ucNome)}</div>
        )}
        <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.85)', marginBottom:3 }}>
          {dataLonga}
        </div>
        {plano.horaInicio && (
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>
            🕗 {plano.horaInicio}–{plano.horaFim}
          </div>
        )}
      </div>
      {/* Botão entrar */}
      <div style={{ background: hoje ? '#8b4513' : '#1d4ed8',
        padding:'13px 18px', display:'flex', alignItems:'center',
        justifyContent:'center', gap:8 }}>
        <span style={{ fontSize:16, fontWeight:800, color:'#fff', letterSpacing:'0.02em' }}>
          {hoje ? '🚀 Entrar na aula' : '📋 Ver plano'}
        </span>
        <span style={{ fontSize:20, color:'rgba(255,255,255,0.7)' }}>→</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// VISTA PRINCIPAL DO ALUNO
// ═════════════════════════════════════════════════════════════
// ── Percurso do aluno ao longo da UC (embutido, sem ficheiro externo) ──
function dataCurtaPU(iso?: string) {
  if (!iso) return '';
  const d = /^\d{4}-\d{2}-\d{2}/.test(iso) ? new Date(iso.slice(0,10)+'T12:00:00') : new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return dd+'-'+mm+' · '+d.toLocaleDateString('pt-PT',{weekday:'short'});
}
const EST_PU: Record<string, { dot:string; fundo:string; texto:string; etiqueta:string }> = {
  por_avaliar: { dot:'#c8cdd4', fundo:'#f4f2ee', texto:'rgba(26,23,20,0.5)', etiqueta:'Por autoavaliar' },
  aguarda:     { dot:'#b0692b', fundo:'rgba(181,101,29,0.10)', texto:'#8a4f1e', etiqueta:'Aguarda validação do professor' },
  validado:    { dot:'#5a7a4e', fundo:'rgba(90,122,78,0.12)', texto:'#4e6a25', etiqueta:'Validado' },
};
/** semNotas: durante a autoavaliação não se mostram notas — o aluno responderia
 *  a pensar na nota e não no que fez (Rosa, set/2026). */
function PercursoUC({ aluno, ucId, semNotas = false }: { aluno: { id:string; turmaId:string }; ucId: string; semNotas?: boolean }) {
  if (!ucId) return null;
  const planos = getPlanosAulaPorTurma(aluno.turmaId)
    .filter(p => p.ucId === ucId && p.estado !== 'arquivado')
    .sort((a,b) => String(a.data||'').localeCompare(String(b.data||'')));
  if (planos.length === 0) return null;
  const selecoes = getSelecoes().filter(s => s.alunoId === aluno.id);
  const validacoes = getValidacoes().filter(v => v.alunoId === aluno.id);
  const linhas = planos.map(p => {
    const sel = ultimaResposta(aluno.id, p.id, selecoes);
    const val = sel ? validacaoDaSelecao(sel, validacoes as any) : undefined;
    const estado = val ? 'validado' : (sel ? 'aguarda' : 'por_avaliar');
    const nota20 = val ? notaDaAulaValidada(validacaoDaAula(aluno.id, p.id, validacoes as any)) : null;
    return { p, estado, nota20 };
  });
  const validados = linhas.filter(l => l.estado === 'validado').length;
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--copper)' }}>O meu percurso nesta UC</div>
        <div style={{ fontSize:13, color:'rgba(26,23,20,0.5)' }}>{validados} de {planos.length} validados</div>
      </div>
      <div>
        {linhas.map(({ p, estado, nota20 }, i) => {
          const st = EST_PU[estado];
          return (
            <div key={p.id} style={{ display:'flex', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:st.dot, marginTop:14, flexShrink:0 }} />
                {i < linhas.length-1 && <div style={{ width:2, flex:1, background:'#e5e1d8' }} />}
              </div>
              <div style={{ flex:1, background:st.fundo, borderRadius:10, padding:'10px 13px', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, fontSize:13.5, fontWeight:700, color:'var(--charcoal)' }}>{rotuloPlano(p)}</div>
                  <div style={{ fontSize:13, color:'rgba(26,23,20,0.5)' }}>{dataCurtaPU(p.data)}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:st.texto }}>{st.etiqueta}</span>
                  {estado === 'validado' && nota20 != null && !semNotas && (
                    <span style={{ marginLeft:'auto', fontSize:13, fontWeight:800, color:'#4e6a25' }}>{nota20}/20</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** versaoDados muda quando chegam dados novos: redesenha sem recriar. */
/** As 4 respostas de uma técnica ou conhecimento: coisas que se veem
 *  (Rosa, set/2026). Da mais fraca para a mais forte. */
/** O formato de um trabalho sobre o manual: o que se vê na entrega ou na apresentação. */
const FRASES_FORMATO: Record<string, string[]> = {
  oral: ['Não apresentei, ou li tudo sem olhar para a turma.', 'Apresentei, mas a ler quase tudo ou com ajuda.',
    'Apresentei sem ler e expliquei o tema.', 'Apresentei sem ler, expliquei o tema e respondi às perguntas.'],
  escrito: ['Entreguei incompleto ou copiado.', 'Entreguei completo, mas copiado do manual ou com erros.',
    'Entreguei completo, com as minhas palavras.', 'Entreguei completo, com as minhas palavras e exemplos da cozinha.'],
  digital: ['Fiz só com texto copiado.', 'Fiz, mas com muito texto e pouco organizado.',
    'Fiz claro, com imagens e pouco texto.', 'Fiz claro, com imagens, e usei-o para explicar sem ler.'],
  pratico: ['Comecei a demonstração, mas não a acabei.', 'Fiz a demonstração, mas precisei de ajuda.',
    'Fiz a demonstração sozinho e expliquei o que fazia.', 'Fiz sozinho, expliquei o que fazia e respondi às perguntas.'],
};

function frasesVisiveis(c: { id?: string; rotulo: string; resultado?: string; manual?: boolean }): string[] {
  const crit = c.id ? criterioTrabalho(c.id) : undefined;
  if (crit) return crit.frases;
  if (c.id?.startsWith('KNW-P-F-') && FRASES_FORMATO[c.id.slice(8)]) return FRASES_FORMATO[c.id.slice(8)];
  // Campos do manual («Explicar…», «Executar…», «Identificar…»): o aluno diz
  // se já o sabe fazer, e com que ajuda (Rosa, out/2026). Sem os exercícios
  // dos manuais, que não são bons.
  if (c.rotulo === 'Conhecimento' && c.manual) return [
    'Ainda não sei: só uma parte, e com erros.',
    'Sei, mas preciso do manual ou da ajuda do professor.',
    'Sei sozinho, sem olhar para o manual.',
    'Sei sozinho e consigo explicar a um colega, com um exemplo da cozinha.',
  ];
  if (c.rotulo === 'Conhecimento') return [
    'Sei explicar só uma parte, e com erros.',
    'Sei explicar, mas a olhar para o caderno ou com a ajuda do professor.',
    'Sei explicar sozinho, sem olhar.',
    'Sei explicar sozinho e dar um exemplo da cozinha.',
  ];
  const comoNaFicha = c.resultado ? 'ficou como diz o «bem feito é»' : 'ficou como na ficha';
  return [
    'Não consegui: o professor ou um colega teve de fazer por mim.',
    'Fiz, mas o professor teve de me corrigir ou mostrar outra vez.',
    `Fiz sozinho e ${comoNaFicha}.`,
    `Fiz sozinho, ${comoNaFicha} à primeira, e ajudei ou expliquei a um colega.`,
  ];
}

/** O aluno já enviou a autoavaliação desta aula? Não conta a que foi enviada
 *  antes de o professor mudar as perguntas e pedir para responder outra vez. */
function jaSubmeteuAutoavaliacao(plano: any, alunoId: string): boolean {
  try {
    const em = localStorage.getItem(`avaliacao_submetida_${plano.id}_${alunoId}`);
    // O professor reabriu a autoavaliação só deste aluno: está por fazer
    // até ele responder outra vez.
    if (reabertaPorResponder(plano, alunoId)) return false;
    const pedido = plano?.pedirDeNovoEm;
    // Depois de o professor pedir outra vez, só conta uma resposta à versão
    // nova do plano (não a hora do telemóvel, que pode estar errada).
    if (pedido) return !!ultimaResposta(alunoId, plano.id);
    return !!em;
  } catch { return false; }
}

export function AlunoView({ aluno }: { aluno: Aluno; versaoDados?: number }) {
  const [planoAtivo, setPlanoAtivo] = useState<PlanoAula | null>(null);
  /** Atividade aberta só para ver (o aluno não esteve nela). */
  const [planoConsulta, setPlanoConsulta] = useState<PlanoAula | null>(null);
  // Cinco separadores, como a especificação: Início, Aula, Percurso,
  // Recursos, Perfil. A navegação é a mesma dentro e fora da aula.
  const [aba, setAba] = useState<SeparadorAluno>('inicio');
  const [destino, setDestino] = useState<DestinoAluno | null>(null);
  const [mesVisivel, setMesVisivel] = useState(new Date().getMonth());
  const [anoVisivel, setAnoVisivel] = useState(new Date().getFullYear());
  const [planosBrutos, setPlanos] = useState<PlanoAula[]>(() =>
    getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado')
  );
  // Evento fora do horário com inscrição: só aparece a quem o professor aceitou.
  const planos = planosBrutos.filter(p => !eventoForaDoHorario(p) || modoParticipacao(p) === 'turma'
    || participantesDoEvento(p).includes(aluno.id));

  const [falhouLigacao, setFalhouLigacao] = useState(false);
  const [aLigar, setALigar] = useState(false);
  // Autoavaliação final: obrigatória em cada UC que terminou.
  const [ucFinal, setUcFinal] = useState<string | null>(null);
  const [versaoFinal, setVersaoFinal] = useState(0);
  const ucsFinais = React.useMemo(() => { try { return ucsParaAutoavaliacaoFinal(aluno); } catch { return []; } },
    [aluno.id, aluno.turmaId, planos, versaoFinal]);

  function irBuscarAulas() {
    setALigar(true);
    sincronizarDoSheets(aluno.turmaId).then(() => {
      setPlanos(getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado'));
      setFalhouLigacao(leituraDePlanosFalhou());
    }).catch(() => setFalhouLigacao(true)).finally(() => setALigar(false));
  }

  useEffect(() => { irBuscarAulas(); }, [aluno.turmaId]);

  // "Não vejo a aula": vai buscar outra vez e, se continuar sem aula hoje,
  // descobre porquê e explica numa frase.
  const EXPLICA_AULA: Record<CausaAulaEmFalta, { titulo: string; texto: string; avisar: boolean }> = {
    sem_rede: { titulo: 'Sem ligação', avisar: false,
      texto: 'Não consegui falar com a escola. Verifica a internet e tenta outra vez.' },
    resposta_estranha: { titulo: 'A escola não respondeu bem', avisar: true,
      texto: 'Tenta outra vez daqui a um minuto. Se continuar, avisa o professor.' },
    nada_no_arquivo: { titulo: 'Ainda não há aulas para a tua turma', avisar: true,
      texto: 'O professor ainda não criou planos de aula para a tua turma.' },
    nao_publicada: { titulo: 'A aula ainda não foi publicada', avisar: true,
      texto: 'O professor já preparou o plano, mas ainda não carregou em Publicar. Assim que o fizer, aparece aqui.' },
    sem_aula_hoje: { titulo: 'Não há aula marcada para hoje', avisar: false,
      texto: 'As aulas publicadas são para outros dias. Vê o calendário.' },
    nao_chegou: { titulo: 'A aula ainda não chegou a este telemóvel', avisar: false,
      texto: 'Existe, mas ainda não foi descarregada. Tenta outra vez daqui a pouco.' },
    outra_turma: { titulo: 'A aula foi publicada para outra turma', avisar: true,
      texto: 'Avisa o professor para confirmar a turma do plano.' },
    ok: { titulo: 'Não encontrei nenhum problema', avisar: true,
      texto: 'Tenta atualizar outra vez. Se a aula continuar sem aparecer, avisa o professor.' },
  };
  const [mensagemAula, setMensagemAula] = useState<{ titulo: string; texto: string; avisar: boolean } | null>(null);
  /** O relatório do último «Não vejo a aula», para ir com o aviso ao professor. */
  const linhasDiagnostico = React.useRef<string[]>([]);
  /** O que o telemóvel tem: vai com o pedido de ajuda (o professor não vê o telemóvel do aluno). */
  const relatorioDoTelemovel = (): string[] => {
    const locais = getPlanosAulaPorTurma(aluno.turmaId);
    return [
      `Aluno: ${aluno.nome} · código ${aluno.id} · turma "${aluno.turmaId}"`,
      `Planos neste telemóvel: ${locais.length} · publicados ${locais.filter(p => p.estado === 'publicado').length} · de hoje ${locais.filter(p => p.estado === 'publicado' && isHoje(p.data)).length}`,
      `Hora do telemóvel: ${new Date().toLocaleString('pt-PT')}`,
      `Espaço no telemóvel: ${aparelhoSemEspaco() ? 'CHEIO (guarda só enquanto a aplicação está aberta)' : 'ok'}`,
      `Ligação ao arquivo: ${leituraDePlanosFalhou() ? 'FALHOU na última leitura' : 'ok'}`,
      `Telemóvel/navegador: ${typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : '?'}`,
    ];
  };
  async function verificarAula() {
    setALigar(true);
    setMensagemAula(null);
    try {
      await sincronizarDoSheets(aluno.turmaId, { forcar: true });
      const ps = getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado');
      setPlanos(ps);
      setFalhouLigacao(leituraDePlanosFalhou());
      if (ps.some(p => isHoje(p.data))) return;
      const { causa, linhas } = await diagnosticoDetalhado(aluno.turmaId);
      linhasDiagnostico.current = [`O aluno viu: ${EXPLICA_AULA[causa].titulo}`, ...linhas];
      setMensagemAula(EXPLICA_AULA[causa]);
    } catch {
      setFalhouLigacao(true);
      setMensagemAula(EXPLICA_AULA.sem_rede);
    } finally {
      setALigar(false);
    }
  }

  // O professor pode corrigir a aula depois de a publicar — trocar a
  // ficha, mudar a hora. Em vez de ir buscar tudo de minuto a minuto,
  // pergunta de 15 em 15 segundos se houve alterações, e só vai buscar
  // quando houve: é rápido e não gasta quase nada.
  //
  // A abertura da aula vem primeiro e mostra-se logo: ir buscar tudo o
  // resto (fichas, avaliações, presenças…) leva meio minuto, e o aluno
  // ficava esse tempo todo sem saber que a aula já estava aberta.
  const ultimaCompleta = React.useRef(0);
  // A aula (plano, fichas, abertura, grupos) num só pedido leve, de 3 em
  // 3 segundos, enquanto a aplicação está à vista (script v19).
  useEffect(() => {
    let vivo = true;
    const mostrar = () => setPlanos(getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado'));
    let contadorVisto = '';
    const tique = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (!aulaRapidaDisponivel()) return;
      lerAula(aluno.turmaId).then(ok => {
        if (!vivo || !ok) return;
        mostrar();
        // Houve alterações (notas, validações…): o resto vem no máximo de
        // 2 em 2 minutos, e cada telemóvel num momento diferente.
        const c = contadorDaTurma(aluno.turmaId);
        if (c && contadorVisto && c !== contadorVisto && Date.now() - ultimaCompleta.current > 120000) {
          ultimaCompleta.current = Date.now();
          setTimeout(() => { sincronizarDoSheets(aluno.turmaId).then(mostrar).catch(() => {}); }, Math.random() * 15000);
        }
        if (c) contadorVisto = c;
      }).catch(() => {});
    };
    tique();
    const t = setInterval(tique, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, [aluno.turmaId]);

  // Com a base de dados: o plano, as fichas, a abertura da aula e as notas
  // chegam ao telemóvel no momento em que o professor os grava.
  useEffect(() => {
    let t: any = null;
    const parar = ouvirTurmaNaBase(aluno.turmaId, (tipo, dados) => {
      juntarDaBase(tipo, dados);
      clearTimeout(t);
      t = setTimeout(() => setPlanos(getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado')), 300);
    }, TIPOS_DO_ALUNO);
    return () => { clearTimeout(t); parar(); };
  }, [aluno.turmaId]);

  // O resto (notas, validações…) quando há novidades — no máximo de
  // minuto e meio em minuto e meio, e cada telemóvel num momento
  // diferente. Eram 14 pedidos por telemóvel a cada novidade, e a turma
  // toda entupia o script. Com um script antigo (sem a aula rápida), a
  // abertura, os planos e as fichas continuam a vir logo.
  useEffect(() => vigiarAlteracoes(aluno.turmaId, () => {
    const mostrar = () => setPlanos(getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado'));
    const completa = Date.now() - ultimaCompleta.current > 90000;
    if (completa) ultimaCompleta.current = Date.now();
    if (!completa && aulaRapidaDisponivel()) return;
    setTimeout(() => {
      (aulaRapidaDisponivel() ? Promise.resolve() : sincronizarSessoes(aluno.turmaId).then(mostrar))
        .catch(() => {})
        .then(() => sincronizarDoSheets(aluno.turmaId, { leve: !completa }))
        .then(mostrar)
        .catch(() => {});
    }, Math.random() * (completa ? 8000 : 2000));
  }, 10), [aluno.turmaId]);

  const historicoAluno = getHistoricoAluno(aluno.id);
  const planoHoje = planos.find(p => isHoje(p.data));
  const proximasAulas = planos.filter(p => isFuturo(p.data)).sort((a,b) => a.data.localeCompare(b.data)).slice(0, 5);
  const aulasPassadas = planos.filter(p => !isFuturo(p.data) && !isHoje(p.data)).sort((a,b) => b.data.localeCompare(a.data)).slice(0, 5);

  // Avisos para o aluno
  const avisos: { emoji:string; titulo:string; corpo:string; cor:string; bg:string }[] = [];

  if (planoHoje) {
    avisos.push({ emoji:'🔔', titulo:'Tens aula hoje!',
      corpo:`${planoHoje.titulo} · ${planoHoje.horaInicio}–${planoHoje.horaFim}`,
      cor:T.copper, bg:T.copperP });
  }
  const atrasos = getHist(`ecl_atrasos_${aluno.id}`);
  if (atrasos >= 3) {
    avisos.push({ emoji:'⏰', titulo:`${atrasos} atrasos registados`,
      corpo:'Tenta chegar a horas — isso conta na tua avaliação de atitudes.',
      cor:T.danger, bg:T.dangerP });
  }
  if (proximasAulas[0]) {
    const dias = diasParaData(proximasAulas[0].data);
    if (dias === 1) {
      avisos.push({ emoji:'📅', titulo:'Aula amanhã!',
        corpo:`${proximasAulas[0].titulo} · ${proximasAulas[0].horaInicio}`,
        cor:T.info, bg:T.infoP });
    }
  }
  if (historicoAluno.length === 0 && !planoHoje) {
    avisos.push({ emoji:'✨', titulo:'Bem-vindo/a à Avaliação ECL!',
      corpo:'Ainda não tens avaliações. Quando o professor publicar uma aula, aparece aqui.',
      cor:T.sage, bg:T.sageP });
  }

  // ── Dados do painel inicial ──────────────────────────────────
  const planosOrdenados = [...planos].sort((a,b) => a.data.localeCompare(b.data));
  const numeroPlanoHoje = planoHoje
    ? planosOrdenados.findIndex(p => p.id === planoHoje.id) + 1
    : undefined;

  const ucDoPlano = planoHoje ? (planoHoje as any).ucId as string | undefined : undefined;
  const ucAtual = ucDoPlano ?? (planosOrdenados.length
    ? (planosOrdenados[planosOrdenados.length - 1] as any).ucId as string | undefined
    : undefined);

  const fichasDoPlanoHoje = planoHoje ? getFichasPorPlano(planoHoje.id) : [];
  const distribuicoes = planoHoje ? getDistribuicoesPorPlano(planoHoje.id) : [];
  const fichasAtribuidas = distribuicoes.filter(d =>
    Array.isArray((d as any).alunosIds) && (d as any).alunosIds.includes(aluno.id)
  ).length || fichasDoPlanoHoje.length;

  // Competências da UC, tiradas do REFERENCIAL — as realizações que o
  // curso define para esta unidade. Não os resultados esperados dos
  // perfis técnicos ("fundo limpo, aromático e sem amargor"), que são
  // o resultado de uma prática e não uma competência. Esses aparecem
  // mais abaixo, quando o aluno se avalia numa ficha concreta.
  const ucNomeOficial = ucAtual ? getReferencialUC(ucAtual)?.nome : undefined;

  const competenciasDaUC = (() => {
    const ref = ucAtual ? getReferencialUC(ucAtual) : undefined;
    if (!ref?.realizacoes?.length) return [];
    return ref.realizacoes.map((r, i) => {
      const id = `${ucAtual}_R${i + 1}`;
      const h = getHistoricoAlunoMicro(aluno.id, id);
      const nivel = Array.isArray(h) && h.length
        ? Math.max(...h.map((x: any) => x.nivel ?? x.nota ?? 0))
        : null;
      return { id, nome: r.replace(/\.$/, ''), nivel, consolidada: jaTeveSucesso(h) };
    });
  })();

  // Conhecimentos e atitudes vêm do mesmo referencial. Sem ficha técnica
  // nem trabalho no plano, aparece tudo — é o que a aplicação assume
  // estar a ser trabalhado. Com ficha, entra a triagem.
  const nivelDe = (id: string) => {
    const h = getHistoricoAlunoMicro(aluno.id, id);
    return Array.isArray(h) && h.length
      ? Math.max(...h.map((x: any) => x.nivel ?? x.nota ?? 0))
      : null;
  };
  // Consolidada só com sucesso em 2 aulas diferentes (regra da escola).
  const consolidadaDe = (id: string) => jaTeveSucesso(getHistoricoAlunoMicro(aluno.id, id));

  const conhecimentosDaUC = (() => {
    const ref = ucAtual ? getReferencialUC(ucAtual) : undefined;
    const lista = ref?.conhecimentos?.length ? ref.conhecimentos : ref?.criteriosDesempenho;
    if (!lista?.length) return [];
    return lista.map((c, i) => {
      const id = `${ucAtual}_C${i + 1}`;
      return { id, nome: c.replace(/\.$/, ''), nivel: nivelDe(id), consolidada: consolidadaDe(id) };
    });
  })();

  // Nas turmas ACP (transição de referencial), as atitudes dos anos
  // anteriores saem desta lista: apareciam como "por avaliar" e o aluno
  // achava que tinha falhado. Vão para um grupo próprio, como trabalho a
  // apanhar.
  const anterioresIds = idsAtitudesAnteriores(aluno);
  const atitudesAnterioresDoAluno = atitudesAnteriores(aluno);
  const atitudesDaUC = ATITUDES
    .filter(at => opcoesDeEscolhaDoAluno(aluno.ano ?? 1).includes(at.id))
    .filter(at => !anterioresIds.has(at.id))
    .map(at => ({ id: at.id, nome: at.nome, nivel: nivelDe(at.id), consolidada: consolidadaDe(at.id) }));

  // Aulas marcadas a partir de hoje — o aluno tem de as ver sem
  // depender do calendário.
  const hojeISO = new Date().toISOString().slice(0, 10);
  const aulasFuturas = planosOrdenados.filter(p => p.data >= hojeISO && p.id !== planoHoje?.id);

  const [refreshAtiv, setRefreshAtiv] = useState(0);
  const atividades = React.useMemo(
    () => [...getAtividades().filter(x => x.turmaId === aluno.turmaId), ...eventosComoAtividades(aluno.turmaId)],
    [aluno.turmaId, refreshAtiv, planosBrutos]
  );
  // Evento do plano: a inscrição segue para o professor; atividade antiga: fica como estava.
  function inscreverOuEvento(id: string, sim: boolean) {
    if (id.startsWith('ev_')) {
      const pl = planosBrutos.find(x => x.id === id.slice(3)) || getPlanosAulaPorTurma(aluno.turmaId, true).find(x => x.id === id.slice(3));
      if (pl) inscreverNoEvento(pl, aluno, sim);
    } else inscreverEmAtividade(id, aluno.id, sim);
  }
  const atividadesAbertas = atividades.filter(
    x => !x.fechada && x.data >= new Date().toISOString().slice(0, 10)
  ).length;

  const tudoAvaliavel = [...competenciasDaUC, ...conhecimentosDaUC, ...atitudesDaUC];
  const porAvaliar = tudoAvaliavel.filter(c => estadoDoNivel(c.nivel, c.consolidada) === 'por_avaliar').length;
  const competenciasFracas = tudoAvaliavel.filter(c => estadoDoNivel(c.nivel, c.consolidada) === 'desenvolvimento').length;

  // Que bloco o aluno está a ver no "Avaliar-me"
  const [blocoAvaliar, setBlocoAvaliar] = useState<'realizacoes'|'conhecimentos'|'atitudes'>('realizacoes');
  // Numa aula atitudinal o aluno trabalha atitudes. Antes de entrar no
  // formulário via as técnicas da UC e ficava baralhado.
  const aulaDeHojeAtitudinal = String((planoHoje as any)?.tipoPlanAula || '').startsWith('atitudinal');
  const listaDoBloco = aulaDeHojeAtitudinal ? atitudesDaUC
    : blocoAvaliar === 'realizacoes' ? competenciasDaUC
                     : blocoAvaliar === 'conhecimentos' ? conhecimentosDaUC
                     : atitudesDaUC;

  // Nota progressiva: média das aulas já validadas nesta UC
  // Uma linha por aula (não por resposta): quem respondeu duas vezes via a
  // mesma aula duas vezes, uma delas com a nota antiga. A nota é a da
  // validação mais recente — a mesma do «Professor confirmou» e da UC.
  const selecoesDoAluno = getSelecoes().filter(s => s.alunoId === aluno.id);
  const validacoesAluno = [...new Set(selecoesDoAluno.map(s => s.planoAulaId || ''))]
    .map(planoId => {
      const plano = planos.find(p => p.id === planoId);
      const validada = selecoesDoAluno.some(s => s.planoAulaId === planoId && !!validacaoDaSelecao(s));
      return { plano, nota20: validada ? notaDaAulaValidada(validacaoDaAula(aluno.id, planoId)) : null, validada };
    })
    .filter(x => x.plano);

  // A nota que o aluno vê é UMA só, em todos os ecrãs: a da UC em curso,
  // calculada como nas «Notas da UC» do professor (e na pauta). Antes o
  // início mostrava a média das aulas de TODAS as UCs misturadas (9,3) e
  // outro ecrã a nota da UC com bónus (11).
  // Primeiro a da pauta (a que o professor vê em «Notas da UC»); sem pauta,
  // a nota final da UC calculada pelos registos.
  // Durante a UC, só a média das aulas em /20 (com as faltas a 0). Os níveis
  // da pauta (2 a 6) e os 5 C só entram no fecho, na pauta (Rosa, set/2026);
  // depois de publicada, conta a nota final publicada.
  const publicadaDaUC = ucAtual ? getNotaFinalPublicadaUC(aluno.id, ucAtual) : null;
  const notaDaUC = publicadaDaUC ? { final: publicadaDaUC.nota }
    : ucAtual ? notaFinalUC(aluno.id, aluno.turmaId, ucAtual) : null;
  const notasValidas = validacoesAluno.filter(v => !ucAtual || v.plano!.ucId === ucAtual)
    .map(v => v.nota20).filter((n): n is number => n != null);
  const notaProgressiva = notaDaUC?.final != null ? Math.round(notaDaUC.final * 10) / 10
    : notasValidas.length
      ? Math.round((notasValidas.reduce((s, n) => s + n, 0) / notasValidas.length) * 10) / 10
      : null;

  // Módulos a recuperar — só pelos dois critérios: faltas acima de 10%
  // das horas do módulo, ou módulo terminado sem positiva. Antes contava
  // cada AULA validada abaixo de 10: uma aula fraca a meio do módulo
  // punha o aluno "em recuperação".
  const ucsDoAluno = [...new Set(planos.map(p => p.ucId).filter(Boolean) as string[])];
  const recuperacoesPendentes = ucsDoAluno
    .filter(ucId => situacaoRecuperacaoUC(aluno.id, aluno.turmaId, ucId).precisa).length;

  // Avisos calculados a partir do estado real — presenças, registos,
  // prazos e inscrições. Nunca texto guardado à mão.
  /** As aulas cuja autoavaliação falta (para o aviso abrir logo a primeira). */
  const aulasPorAutoavaliar = React.useRef<PlanoAula[]>([]);
  const avisosCalculados: AvisoAluno[] = (() => {
    const av: AvisoAluno[] = [];
    const hojeISO = new Date().toISOString().slice(0, 10);

    // Ecrã vazio por não se conseguir ligar: o aluno tem de perceber que o
    // problema não é dele, e o professor tem de saber que a aula não chegou.
    if (falhouLigacao) {
      av.push({
        id: 'sem-ligacao',
        titulo: 'Não consegui ir buscar as aulas',
        detalhe: 'A aula pode existir e não estar a chegar a este telemóvel. Toca aqui para tentar outra vez; se continuar, avisa o professor.',
        destino: 'inicio' as any,
        urgente: true,
      });
    }

    if (planoHoje) {
      const sessao = getSessaoAula(planoHoje.id);
      const entrou = getPresencas().some(
        p => p.alunoId === aluno.id && p.planoAulaId === planoHoje.id
      );
      if (sessao?.abertaEm && !entrou) {
        const t = estadoTolerancia(planoHoje.id);
        av.push({
          id: 'entrada',
          titulo: t.foraDeTempo ? 'Ainda não entraste na aula' : 'Entrada aberta',
          detalhe: t.foraDeTempo
            ? 'Entra na mesma — o professor decide sobre a falta.'
            : `Faltam ${t.minutosRestantes} min de tolerância.`,
          destino: 'entrar',
          urgente: t.foraDeTempo,
        });
      }
    }

    // O professor mudou as perguntas e pediu à turma para responder outra vez.
    const deNovo = planosOrdenados.filter((p: any) => p.pedirDeNovoEm
      && (getPresencas().some(x => x.alunoId === aluno.id && x.planoAulaId === p.id)
        || getValidacoes().some(v => v.alunoId === aluno.id && v.planoAulaId === p.id))
      && !getSelecoes().some(s => s.alunoId === aluno.id && s.planoAulaId === p.id));
    // O professor reabriu a autoavaliação só deste aluno (sem PIN novo).
    const reabertas = planosOrdenados.filter((p: any) => reabertaPorResponder(p, aluno.id) && !deNovo.includes(p));
    if (reabertas.length > 0) {
      av.push({
        id: 'reaberta',
        titulo: 'O professor reabriu a tua autoavaliação',
        detalhe: `Podes responder outra vez a ${reabertas.map(p => `«${p.titulo}» (${String(p.data).slice(8, 10)}/${String(p.data).slice(5, 7)})`).join(', ')}. `
          + 'Até responderes, conta o que respondeste antes.',
        destino: 'autoavaliar_pendente' as any,
        urgente: true,
      });
    }
    aulasPorAutoavaliar.current = [...deNovo, ...reabertas];
    if (deNovo.length > 0) {
      av.push({
        id: 'responder_de_novo',
        titulo: 'O professor quer ouvir-te outra vez',
        detalhe: `Há perguntas novas, mais claras, na autoavaliação de ${deNovo.map(p => `«${p.titulo}» (${String(p.data).slice(8, 10)}/${String(p.data).slice(5, 7)})`).join(', ')}. `
          + 'É a tua oportunidade de mostrar o que fizeste bem e o que queres melhorar. Leva 2 minutos. Até responderes, conta a nota que tinhas.',
        // Abre logo a autoavaliação dessa aula (antes ia para o resumo da UC).
        destino: 'autoavaliar_pendente' as any,
        urgente: true,
      });
    }

    // Aceite numa atividade a que se candidatou: parabéns e o compromisso.
    const hojeAceite = new Date().toISOString().slice(0, 10);
    getPlanosAula().filter((p: any) => p.turmaId === aluno.turmaId && eventoForaDoHorario(p) && p.estado !== 'arquivado'
      && modoParticipacao(p) === 'inscricao' && String(p.data || '').slice(0, 10) >= hojeAceite
      && participantesDoEvento(p).includes(aluno.id))
      .forEach((p: any) => av.push({
        id: 'aceite_' + p.id,
        titulo: `Foste aceite: ${p.titulo || 'atividade'}`,
        detalhe: `Parabéns! O professor escolheu-te para esta atividade (${String(p.data).slice(8, 10)}/${String(p.data).slice(5, 7)}${p.horaInicio ? `, ${p.horaInicio}` : ''}). `
          + 'Agora é contigo: assumes o compromisso de estar lá à hora, com a farda impecável, e dar o teu máximo do princípio ao fim. Vais representar a escola.',
        destino: 'atividades',
        urgente: false,
      }));

    // Atividade que já aconteceu e onde o professor o pôs (ou aceitou): tem de
    // se autoavaliar nela (Rosa, out/2026). Antes não havia aviso nenhum
    // para uma atividade passada.
    const atividadesPorAvaliar = getPlanosAula().filter((p: any) => p.turmaId === aluno.turmaId && eventoForaDoHorario(p)
      && p.estado === 'publicado' && String(p.data || '').slice(0, 10) <= hojeAceite
      && participantesDoEvento(p).includes(aluno.id) && !ultimaResposta(aluno.id, p.id));
    if (atividadesPorAvaliar.length > 0) {
      const dia = (p: any) => new Date(String(p.data).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: '2-digit' });
      av.push({
        id: 'atividade_por_avaliar',
        titulo: atividadesPorAvaliar.length === 1 ? `Estiveste na atividade «${atividadesPorAvaliar[0].titulo}»` : `Estiveste em ${atividadesPorAvaliar.length} atividades`,
        detalhe: atividadesPorAvaliar.map((p: any) => {
          const aula: any = aulaDoDiaDaAtividade(p);
          return `«${p.titulo}» (${dia(p)})`
            + (aula ? (p.tambemRespondemAula === false ? ' — respondes só à atividade, não ao plano da turma desse dia.' : ` — e respondes também ao plano da turma desse dia (${rotuloDoPlano(aula)}).`) : '.');
        }).join(' ') + ' Autoavalia-te: leva 2 minutos e conta para a tua nota.',
        destino: 'autoavaliar_pendente' as any,
        urgente: true,
      });
      aulasPorAutoavaliar.current = [...atividadesPorAvaliar, ...(aulasPorAutoavaliar.current || [])];
    }

    // Autoavaliação submetida que ainda não se sabe se chegou ao professor
    // (o aluno fechou a aplicação logo a seguir): vai outra vez sozinha.
    const aCaminho = getSelecoes().filter(s => s.alunoId === aluno.id && selecaoPorConfirmar(s.id)).length;
    if (aCaminho > 0) {
      av.push({
        id: 'autoavaliacao_a_caminho',
        titulo: 'A tua autoavaliação ainda está a caminho do professor',
        detalhe: 'Deixa a aplicação aberta um minuto, com rede: volta a ser enviada sozinha.',
        destino: 'inicio' as any,
        urgente: true,
      });
    }

    // Aulas passadas em que esteve e não se autoavaliou.
    const semAuto = planosOrdenados.filter(p =>
      p.data < hojeISO &&
      getPresencas().some(x => x.alunoId === aluno.id && x.planoAulaId === p.id) &&
      !getSelecoes().some(s => s.alunoId === aluno.id && s.planoAulaId === p.id)
    );
    aulasPorAutoavaliar.current = [...aulasPorAutoavaliar.current, ...semAuto.filter(p => !aulasPorAutoavaliar.current.includes(p))];
    if (semAuto.length > 0) {
      av.push({
        id: 'autoavaliacao',
        titulo: 'A tua voz conta: autoavalia-te',
        detalhe: `${semAuto.length} aula${semAuto.length > 1 ? 's' : ''} à espera da tua opinião. Quem se autoavalia mostra ao professor o que fez bem — e o professor tem isso em conta. Leva 2 minutos.`,
        destino: 'autoavaliar_pendente' as any,
        urgente: true,
      });
    }

    if (recuperacoesPendentes > 0) {
      av.push({
        id: 'recuperacoes',
        titulo: 'Tens módulos por recuperar',
        detalhe: `${recuperacoesPendentes} módulo${recuperacoesPendentes > 1 ? 's' : ''} — por faltas ou por ter terminado sem positiva.`,
        destino: 'recuperacoes',
        urgente: true,
      });
    }

    // Atividades já passadas onde se inscreveu e ainda não disse como correu.
    const porFechar = atividades.filter(x =>
      x.data < hojeISO &&
      (x.inscritosIds ?? []).includes(aluno.id) &&
      !(x.balancos ?? []).some(b => b.alunoId === aluno.id)
    );
    if (porFechar.length > 0) {
      av.push({
        id: 'atividades',
        titulo: 'Diz como correu a atividade',
        detalhe: `${porFechar.length} por confirmar. Só conta depois de dizeres que foste.`,
        destino: 'atividades',
      });
    }

    return av;
  })();


  const historialUC = validacoesAluno
    .sort((a, b) => (b.plano!.data).localeCompare(a.plano!.data))
    .map(v => ({
      planoId: v.plano!.id,
      titulo: v.plano!.titulo || 'Aula',
      data: fmtDataCurta(v.plano!.data),
      numeroAula: planosOrdenados.findIndex(p => p.id === v.plano!.id) + 1,
      nota20: v.nota20,
      validada: v.validada,
      ucId: v.plano!.ucId,
      evento: !!(v.plano as any).tipoEvento,
    }));
  // Como se chega à nota da UC: as aulas, as faltas (0), a média e o bónus de
  // cada atividade — o aluno tem de perceber as notas que foi tendo (Rosa, set/2026).
  const calcUC = ucAtual ? notaFinalUC(aluno.id, aluno.turmaId, ucAtual) : null;
  const detalheNota = ucAtual && calcUC ? {
    faltas: getPlanosFaltadosPorUC(aluno.id, ucAtual, aluno.turmaId)
      .map(p => ({ titulo: p.titulo || 'Aula', data: fmtDataCurta(p.data) })),
    media: calcUC.base,
    bonus: bonusPorAtividade(aluno.id, aluno.turmaId, ucAtual, calcUC.base),
    bonusTotal: calcUC.bonusParticipacao,
    teto: calcUC.limitadaPorTeto,
    motivoTeto: calcUC.motivoTeto || '',
    final: calcUC.final,
    publicada: !!publicadaDaUC,
  } : null;

  return (
    <div style={{ minHeight:'100vh', background:T.cream, paddingBottom:72 }}>

      {/* Plano de aula aberto — mostra-se num modal quase-fullscreen por
          cima do ecrã do aluno, em vez de o substituir por completo. */}
      {planoAtivo && (
        <ModalFullscreen
          titulo={planoAtivo.titulo || 'Plano de Aula'}
          subtitulo={aluno.turmaId}
          onFechar={() => setPlanoAtivo(null)}
        >
          {(() => {
            const sel = ultimaResposta(aluno.id, planoAtivo.id);
            const val = sel ? validacaoDaSelecao(sel) : undefined;
            const nota20 = val ? notaDaAulaValidada(validacaoDaAula(aluno.id, planoAtivo.id)) : null;
            if (nota20 == null) return null;
            const cor = nota20 >= 17 ? '#0369a1' : nota20 >= 12 ? '#5a7a4e' : nota20 >= 8 ? '#b5651d' : '#c0392b';
            return (
              <div style={{ margin:'16px 16px 0', padding:'14px 18px', borderRadius:14, background:cor+'14', border:'1.5px solid '+cor+'44', display:'flex', alignItems:'center', gap:14 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'rgba(26,23,20,0.5)' }}>Nota desta aula</div>
                  <div style={{ fontSize:13, color:'rgba(26,23,20,0.5)' }}>Validada pelo professor</div>
                </div>
                <div style={{ marginLeft:'auto', fontFamily:'var(--font-display)', fontSize:34, fontWeight:900, color:cor, lineHeight:1 }}>
                  {nota20}<span style={{ fontSize:18 }}>/20</span>
                </div>
              </div>
            );
          })()}
          <VistaDePlanoAluno plano={planoAtivo} aluno={aluno} onVoltar={() => setPlanoAtivo(null)} />
        </ModalFullscreen>
      )}

      {planoConsulta && (
        <ModalFullscreen titulo={planoConsulta.titulo || 'Atividade'} subtitulo="Só para ver" onFechar={() => setPlanoConsulta(null)}>
          <VistaDePlanoAluno plano={planoConsulta} aluno={aluno} soConsulta onVoltar={() => setPlanoConsulta(null)} />
        </ModalFullscreen>
      )}

      {ucFinal && (
        // Abre no seu próprio ecrã cheio, uma coisa de cada vez.
        <AutoavaliacaoFinalUC aluno={aluno} ucId={ucFinal}
          ucNome={ucsFinais.find(u => u.ucId === ucFinal)?.nome || ucFinal}
          onFechar={() => setUcFinal(null)}
          onFeito={() => { setUcFinal(null); setVersaoFinal(v => v + 1); }} />
      )}

      {/* ── CABEÇALHO ─────────────────────────────────────── */}
      {/* A margem de baixo «fugia» da faixa roxa (sem padding em baixo) e a
          linha «3º ano · Nº 2» ficava cortada na orla. */}
      <div style={{ background:'#6d28d9', padding:'18px 20px 18px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', fontWeight:600,
                textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
                {aluno.turmaId}
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700,
                color:'#faf7f2', lineHeight:1.1 }}>
                Olá, {aluno.nome?.split(' ')[0] || `Aluno ${aluno.numero}`}! 👋
              </div>
              <div style={{ fontSize:13, color:'rgba(247,241,230,0.45)', marginTop:4 }}>
                {aluno.ano}º ano · Nº {aluno.numero}
              </div>
              {(() => {
                const pr = calcularPontosRegularidade(aluno.id);
                if (pr.nivel === 'sem_nivel') return null;
                const EMOJI: Record<string,string> = { bronze:'🥉', prata:'🥈', ouro:'🥇' };
                const LABEL: Record<string,string> = { bronze:'Bronze', prata:'Prata', ouro:'Ouro' };
                return (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:8,
                    padding:'4px 10px', borderRadius:99, background:'rgba(247,241,230,0.12)' }}>
                    <span style={{ fontSize:15 }}>{EMOJI[pr.nivel]}</span>
                    <span style={{ fontSize:12.5, fontWeight:700, color:'rgba(247,241,230,0.85)' }}>
                      Regularidade {LABEL[pr.nivel]} · {pr.pontos} pts
                    </span>
                  </div>
                );
              })()}
              {/* O aluno nunca é identificado com as medidas (decisão da escola):
                  as medidas mudam o trabalho do professor, não o que o aluno vê
                  sobre si. Havia aqui um letreiro «Medidas Seletivas (Nível 2)». */}
            </div>
            {/* Resumo rápido */}
            <div style={{ display:'flex', gap:10 }}>
              {/* O contador de "avaliações" saiu: contava registos internos
                  (farda, higiene…) e não as aulas avaliadas — enganava. */}
              <div style={{ background:'rgba(247,241,230,0.08)', borderRadius:14,
                padding:'10px 16px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700,
                  color:'#faf7f2', lineHeight:1 }}>{planos.length}</div>
                <div style={{ fontSize:12.5, color:'rgba(247,241,230,0.45)', marginTop:3 }}>{planos.length === 1 ? 'aula' : 'aulas'}</div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* ── CONTEÚDO ──────────────────────────────────────── */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 20px 48px' }}>

        {/* ── ABA INÍCIO ── */}
        {/* ── INÍCIO: a aula de hoje como ação principal ── */}
        {aba === 'inicio' && !destino && aparelhoSemEspaco() && (
          <div style={{ margin: '0 0 12px', padding: '12px 14px', borderRadius: 12, background: '#fdf0ef', border: '1.5px solid #c0392b',
            color: '#8e2418', fontSize: 14, lineHeight: 1.5 }}>
            <b>Este telemóvel não tem espaço para guardar a aplicação.</b> Consegues ver as aulas agora, mas ao fechar a
            aplicação voltam a ser descarregadas. Liberta espaço no telemóvel (fotografias, vídeos, aplicações) ou usa outro navegador.
          </div>
        )}
        {aba === 'inicio' && !destino && (
          <>
            <CartaoAutoavaliacaoFinal ucs={ucsFinais} onAbrir={setUcFinal} />
            <CartaoNotasFinais key={versaoFinal} aluno={aluno}
              ucNome={id => (modulosDaTurmaAluno(aluno.turmaId).find((m: any) => m.id === id) as any)?.nome || id} />
          </>
        )}
        {aba === 'inicio' && !destino && (
          <InicioAluno
            nomeAluno={aluno.nome || `Aluno ${aluno.numero}`}
            turmaId={aluno.turmaId}
            ucId={ucAtual}
            ucNome={ucNomeOficial}
            planoHoje={planoHoje}
            numeroPlano={numeroPlanoHoje}
            sessaoAberta={!!planoHoje && !!getSessaoAula(planoHoje.id)?.abertaEm}
            minhaFuncao={planoHoje && temOrganizacao(planoHoje)
              ? funcoesDoAluno(organizacaoDe(planoHoje), aluno.id).map(f => f.nome).join(' + ') || undefined : undefined}
            jaEntrou={!!planoHoje && getPresencas().some(
              p => p.alunoId === aluno.id && p.planoAulaId === planoHoje.id
            )}
            jaAvaliou={!!planoHoje && getSelecoes().some(
              s => s.alunoId === aluno.id && s.planoAulaId === planoHoje.id
            )}
            proximasAulas={aulasFuturas.length}
            avisos={avisosCalculados}
            onTentarOutraVez={falhouLigacao || !planoHoje ? verificarAula : undefined}
            aLigar={aLigar}
            mensagemAula={mensagemAula}
            fichasAtribuidas={fichasAtribuidas}
            notaProgressiva={notaProgressiva}
            recuperacoesPendentes={recuperacoesPendentes}
            atividadesAbertas={atividadesAbertas}
            ultimaAula={(() => {
              const limite = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
              const u = aulasPassadas.find(p => String(p.data || '').slice(0, 10) >= limite);
              if (!u) return null;
              const sel = ultimaResposta(aluno.id, u.id);
              const validada = !!sel && selecaoJaValidada(sel);
              return { titulo: u.titulo, data: u.data, estado: validada ? 'validada' : sel ? 'enviada' : 'por_avaliar', podeAvaliar: true };
            })()}
            onAbrirUltimaAula={() => { if (aulasPassadas[0]) setPlanoAtivo(aulasPassadas[0]); }}
            onAbrir={(d: DestinoAluno) => {
              if ((d as string) === 'autoavaliar_pendente') {
                const p = aulasPorAutoavaliar.current[0];
                if (p) setPlanoAtivo(p);
                return;
              }
              if (d === 'entrar' || d === 'consultar_plano' || d === 'fichas'
                  || d === 'guiao' || d === 'requisicao') {
                if (planoHoje) setPlanoAtivo(planoHoje);
                return;
              }
              if (d === 'avisar_professor') {
                // Chega mesmo ao professor, com o relatório do telemóvel.
                pedirAjudaAoProfessor(aluno, planoHoje ? 'precisa de ajuda na aula' : 'não vê a aula de hoje',
                  [...relatorioDoTelemovel(), ...linhasDiagnostico.current]);
                addAviso({
                  tipo: 'outro',
                  titulo: 'Aula sem plano criado',
                  descricao: `${aluno.nome || `Aluno nº ${aluno.numero}`} (${aluno.turmaId}) `
                    + `quis entrar na aula de hoje e não há plano de aula criado.`,
                  contexto: { tabDestino: 'planos' },
                } as any);
                alert('O professor foi avisado. Vai receber também o que o teu telemóvel mostra, para perceber o problema.');
                return;
              }
              if (d === 'kitchenflow') {
                abrirKitchenFlow(undefined, {
                  turma: aluno.turmaId, numero: aluno.numero,
                  pin: aluno.pin, tipo: 'aluno', ucId: ucAtual,
                  planoData: planoHoje?.data,
                  planoHoraInicio: planoHoje?.horaInicio,
                  planoHoraFim: planoHoje?.horaFim,
                } as any);
                return;
              }
              if (d === 'calendario' || d === 'proximas') { setAba('aula'); return; }
              setDestino(d);
            }}
          />
        )}

        {/* ── Ecrãs do percurso ── */}
        {aba === 'inicio' && destino && (
          <div style={{ background:'#F3F2F5', minHeight:'100%' }}>
            <button
              onClick={() => setDestino(null)}
              style={{ background:'transparent', border:'none', cursor:'pointer',
                fontSize:15, color:'#6B3FA0', fontWeight:700, padding:'12px 16px 4px',
                fontFamily:'inherit', display:'flex', alignItems:'center', gap:7 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth={2.4} strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              Voltar
            </button>

            {destino === 'avaliar' && (
              <EcraAvaliarMe
                ucId={ucAtual}
                ucNome={ucNomeOficial}
                temAulaHoje={!!planoHoje}
                bloco={blocoAvaliar}
                onMudarBloco={setBlocoAvaliar}
                substantivo={blocoAvaliar === 'conhecimentos' ? 'conhecimento'
                           : blocoAvaliar === 'atitudes' ? 'atitude' : 'competência'}
                competencias={listaDoBloco}
                anteriores={(aulaDeHojeAtitudinal || blocoAvaliar === 'atitudes') ? atitudesAnterioresDoAluno : undefined}
                blocos={aulaDeHojeAtitudinal ? ['atitudes'] : undefined}
                onAvaliar={() => { if (planoHoje) { setDestino(null); setPlanoAtivo(planoHoje); } }}
              />
            )}

            {destino === 'nota' && (
              <EcraMinhaNota
                ucId={ucAtual}
                ucNome={ucNomeOficial}
                nota={notaProgressiva}
                aulas={historialUC
                  .filter(h => h.nota20 != null)
                  .sort((a, b) => (a.numeroAula ?? 0) - (b.numeroAula ?? 0))
                  .map(h => ({
                    numero: h.numeroAula ?? 0,
                    titulo: h.titulo,
                    data: h.data,
                    nota20: h.nota20 as number,
                  }))}
                competenciasPorAvaliar={porAvaliar}
                notaPossivel={null}
              />
            )}

            {destino === 'atividades' && (
              <EcraAtividades
                onVer={(id) => { const p = getPlanosAula().find(x => x.id === id); if (p) setPlanoConsulta(p); }}
                atividades={atividades}
                alunoId={aluno.id}
                onInscrever={(id) => { inscreverOuEvento(id, true); setRefreshAtiv(n => n + 1); }}
                onCancelar={(id) => { inscreverOuEvento(id, false); setRefreshAtiv(n => n + 1); }}
                onBalanco={(id, participou, resultado) => {
                  registarBalancoAtividade(id, aluno.id, participou, resultado);
                  setRefreshAtiv(n => n + 1);
                }}
              />
            )}

            {destino === 'perfil' && (
              <div style={{ padding:14, maxWidth:620, margin:'0 auto' }}>
                <CabecalhoEcra ucId={ucAtual} ucNome={ucNomeOficial} titulo="O meu perfil profissional" onVoltar={() => setDestino(null)} />
                <div style={{ background:'#fff', borderRadius:16, padding:16,
                  boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                  <PerfilProfissionalAluno aluno={aluno} semTitulo />
                </div>
              </div>
            )}

            {destino === 'recuperacoes' && <RecuperacaoModulosAluno aluno={aluno} />}

            {destino === 'manual' && <><ManuaisDoAluno turmaId={aluno.turmaId} ucAtual={ucAtual} /><ManuaisAluno soLeitura /></>}
          </div>
        )}

        {aba === 'aula' && (
          <div style={{ display:'grid', gap:24,
            gridTemplateColumns: 'window' in globalThis && window.innerWidth >= 900 ? '380px 1fr' : '1fr' }}>
            <div>
              <CalendarioAluno planos={planos} onAbrirPlano={p => setPlanoAtivo(p)}
                onMudarMes={(m, y) => { setMesVisivel(m); setAnoVisivel(y); }} />
            </div>
            <div>
              {(() => {
                // Só as aulas do mês que está aberto no calendário. Antes
                // aparecia o ano inteiro, e a de hoje perdia-se no meio.
                const doMes = planos.filter(p => {
                  const d = new Date(p.data + 'T00:00:00');
                  return d.getMonth() === mesVisivel && d.getFullYear() === anoVisivel;
                });
                const hojeISO = new Date().toISOString().slice(0, 10);
                const deHoje = doMes.filter(p => p.data === hojeISO);
                const outras = doMes
                  .filter(p => p.data !== hojeISO)
                  .sort((a, b) => a.data.localeCompare(b.data));
                const nomeMes = new Date(anoVisivel, mesVisivel, 1)
                  .toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

                return (<>
                  {deHoje.length > 0 && (
                    <>
                      <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
                        letterSpacing:'0.06em', color:'#6B3FA0', marginBottom:10 }}>
                        Hoje
                      </div>
                      {deHoje.map(p => (
                        <CardAula key={p.id} plano={p} onAbrir={() => setPlanoAtivo(p)} />
                      ))}
                      <div style={{ height: 18 }} />
                    </>
                  )}

                  <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:12 }}>
                    {nomeMes}
                  </div>

                  {outras.length === 0 && deHoje.length === 0 ? (
                    <div style={{ background:'#fff', borderRadius:16, padding:'28px 20px',
                      textAlign:'center', border:`1px solid ${T.border}`,
                      color:'rgba(26,23,20,0.5)', fontSize:14.5 }}>
                      Sem aulas em {nomeMes}.
                    </div>
                  ) : (
                    outras.map(p => (
                      <CardAula key={p.id} plano={p} onAbrir={() => setPlanoAtivo(p)} />
                    ))
                  )}
                </>);
              })()}
            </div>
          </div>
        )}

        {/* ── ABA PERFIL ── */}
        {aba === 'percurso' && !destino && (
          <div style={{ background:'#F3F2F5', minHeight:'100%', padding:14 }}>
            <div style={{ maxWidth:620, margin:'0 auto' }}>
              <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.09em',
                textTransform:'uppercase', color:'#777', marginBottom:9 }}>
                A tua evolução
              </div>
              {([
                ['nota', 'Avaliação progressiva', notaProgressiva != null
                  ? `${notaProgressiva.toFixed(1).replace('.', ',')} valores` : 'ainda sem nota'],
                ['avaliar', 'Avaliar-me', porAvaliar > 0
                  ? `${porAvaliar} por avaliar` : 'tudo avaliado'],
                ['recuperacoes', 'Recuperações', recuperacoesPendentes > 0
                  ? `${recuperacoesPendentes} por recuperar` : 'nada em atraso'],
                ['atividades', 'Atividades e concursos', atividadesAbertas > 0
                  ? `${atividadesAbertas} aberta${atividadesAbertas > 1 ? 's' : ''}` : 'oportunidades'],
              ] as [DestinoAluno, string, string][]).map(([d, t, sub]) => (
                <button key={d} onClick={() => setDestino(d)} style={{
                  width:'100%', background:'#fff', border:'none', borderRadius:14,
                  padding:'15px 16px', marginBottom:9, textAlign:'left', minHeight:44,
                  cursor:'pointer', fontFamily:'inherit', boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  <span style={{ flex:1 }}>
                    <span style={{ display:'block', fontSize:16, fontWeight:700, color:'#1A1A1A' }}>{t}</span>
                    <span style={{ display:'block', fontSize:13.5, color:'#777' }}>{sub}</span>
                  </span>
                  <span style={{ color:'#777', fontSize:20 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(aba === 'percurso' || aba === 'recursos') && destino && (
          <div style={{ background:'#F3F2F5', minHeight:'100%' }}>
            <button onClick={() => setDestino(null)} style={{ background:'transparent',
              border:'none', cursor:'pointer', fontSize:15, color:'#6B3FA0', fontWeight:700,
              padding:'12px 16px 4px', fontFamily:'inherit', display:'flex',
              alignItems:'center', gap:7 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2.4} strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              Voltar
            </button>
            {destino === 'avaliar' && (
              <EcraAvaliarMe ucId={ucAtual} ucNome={ucNomeOficial} temAulaHoje={!!planoHoje}
                bloco={blocoAvaliar} onMudarBloco={setBlocoAvaliar}
                substantivo={blocoAvaliar === 'conhecimentos' ? 'conhecimento'
                           : blocoAvaliar === 'atitudes' ? 'atitude' : 'competência'}
                competencias={listaDoBloco}
                anteriores={(aulaDeHojeAtitudinal || blocoAvaliar === 'atitudes') ? atitudesAnterioresDoAluno : undefined}
                blocos={aulaDeHojeAtitudinal ? ['atitudes'] : undefined} />
            )}
            {destino === 'nota' && (
              <EcraMinhaNota ucId={ucAtual} ucNome={ucNomeOficial} nota={notaProgressiva}
                detalhe={detalheNota}
                aulas={historialUC.filter(h => h.nota20 != null && !h.evento && (!ucAtual || h.ucId === ucAtual))
                  .sort((a, b) => (a.numeroAula ?? 0) - (b.numeroAula ?? 0))
                  .map(h => ({ numero: h.numeroAula ?? 0, titulo: h.titulo,
                    data: h.data, nota20: h.nota20 as number }))}
                competenciasPorAvaliar={porAvaliar}
                notaPossivel={null} />
            )}
            {destino === 'recuperacoes' && <RecuperacaoModulosAluno aluno={aluno} />}
            {destino === 'precos' && <div style={{ padding:'4px 14px 24px' }}><PrecosConsulta /></div>}
            {destino === 'manual' && <><ManuaisDoAluno turmaId={aluno.turmaId} ucAtual={ucAtual} /><ManuaisAluno soLeitura /></>}
            {destino === 'atividades' && (
              <EcraAtividades atividades={atividades} alunoId={aluno.id}
                onVer={(id) => { const p = getPlanosAula().find(x => x.id === id); if (p) setPlanoConsulta(p); }}
                onInscrever={(id) => { inscreverOuEvento(id, true); setRefreshAtiv(n => n + 1); }}
                onCancelar={(id) => { inscreverOuEvento(id, false); setRefreshAtiv(n => n + 1); }}
                onBalanco={(id, p, r) => { registarBalancoAtividade(id, aluno.id, p, r); setRefreshAtiv(n => n + 1); }} />
            )}
            {(destino === 'fichas' || destino === 'guiao' || destino === 'kitchenflow') && (
              <div style={{ padding:20, textAlign:'center', color:'#777', fontSize:15 }}>
                {planoHoje
                  ? 'Abre pela aula de hoje.'
                  : 'Sem aula hoje — estes materiais ficam disponíveis quando houver aula.'}
              </div>
            )}
          </div>
        )}

        {aba === 'perfil' && (
          <div>
            <PerfilProfissionalAluno aluno={aluno} />
            {/* As recuperações estão no Percurso: aqui repetiam-se. */}
            <div style={{ marginTop:24 }}>
              <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:10 }}>
                📊 O meu historial de avaliações
              </div>
              <AvaliacaoPorUC turmaId={aluno.turmaId} alunoId={aluno.id} />
            </div>
            <div style={{ marginTop:24 }}>
              <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:10 }}>
                📖 Dicionário de Cozinha
              </div>
              <DicionarioComp perfil="aluno" turmaId={aluno.turmaId} />
            </div>
          </div>
        )}

        {/* Recursos: manual, fichas e guiões */}
        {aba === 'recursos' && (
          <div style={{ background:'#F3F2F5', minHeight:'100%', padding:14 }}>
            <div style={{ maxWidth:620, margin:'0 auto' }}>
              <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.09em',
                textTransform:'uppercase', color:'#777', marginBottom:9 }}>
                Recursos
              </div>
              {([
                ['manual', 'Manual da unidade', 'em leitura'],
                ['fichas', 'As minhas fichas', 'da aula de hoje'],
                ['guiao', 'Guiões de produção', 'apoio às fichas'],
                ['kitchenflow', 'KitchenFlow', 'registos de higiene'],
                ['precos', 'Preços das matérias-primas', 'quanto custa cada produto'],
              ] as [DestinoAluno, string, string][]).map(([d, t, sub]) => (
                <button key={d} onClick={() => setDestino(d)} style={{
                  width:'100%', background:'#fff', border:'none', borderRadius:14,
                  padding:'15px 16px', marginBottom:9, textAlign:'left', minHeight:44,
                  cursor:'pointer', fontFamily:'inherit', boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  <span style={{ flex:1 }}>
                    <span style={{ display:'block', fontSize:16, fontWeight:700, color:'#1A1A1A' }}>{t}</span>
                    <span style={{ display:'block', fontSize:13.5, color:'#777' }}>{sub}</span>
                  </span>
                  <span style={{ color:'#777', fontSize:20 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navegação permanente — igual dentro e fora da aula. */}
      <NavegacaoAluno ativo={aba} onNavegar={(s) => { setAba(s); setDestino(null); }} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// VISTA DE UM PLANO — acordeão com os 4 passos
// ═════════════════════════════════════════════════════════════
function VistaDePlanoAluno({ plano: planoAberto, aluno, onVoltar, soConsulta = false }: {
  plano: PlanoAula; aluno: Aluno; onVoltar: () => void;
  /** Atividade em que o aluno não esteve: só vê o que se fez, a ficha técnica
   *  e o guião; não se inscreve nem se avalia (Rosa, out/2026). */
  soConsulta?: boolean;
}) {
  // Sempre a versão mais recente do plano. Antes ficava a que estava quando
  // o aluno abriu a aula: se o professor corrigisse o plano (o manual todo
  // em vez de um conteúdo, por exemplo), o aluno continuava com as
  // perguntas antigas até fechar e voltar a abrir (Rosa, out/2026).
  const plano = getPlanosAula().find(p => p.id === planoAberto.id) || planoAberto;
  const versao = String((plano as any).atualizadoEm || '');
  const versaoAoAbrir = React.useRef(versao);
  const mudouDesdeQueAbriu = !!versaoAoAbrir.current && versao !== versaoAoAbrir.current;
  // Esteve numa atividade ligada a esta aula e o professor disse que
  // responde só à atividade (Rosa, out/2026).
  const soAtividade: any = getPlanosAula().find((a: any) => eventoForaDoHorario(a) && a.tambemRespondemAula === false && aulaDoDiaDaAtividade(a)?.id === plano.id
    && participantesDoEvento(a).includes(aluno.id));
  const [secAberta, setSecAberta] = React.useState<string>('orientacao');
  /** O passo abre num ecrã cheio, por cima da aula; ao acabar, segue para o próximo. */
  const [ecra, setEcra] = React.useState(false);
  // Chegou à autoavaliação vindo do ecrã cheio: ela abre o seu próprio ecrã.
  React.useEffect(() => { if (secAberta === 'avaliacao' && ecra) setEcra(false); }, [secAberta, ecra]);
  // Estados persistentes — sobrevivem a saídas e reentradas do aluno no plano
  const _key = (s: string) => `ecl_passo_${plano.id}_${aluno.id}_${s}`;
  const _load = (s: string) => { try { return !!localStorage.getItem(_key(s)); } catch { return false; } };
  const _save = (s: string) => { try { localStorage.setItem(_key(s), '1'); } catch {} };

  const [orientacaoConcluida, setOrientacaoConcluida] = React.useState(() => _load('orientacao'));
  const [entradaConcluida, setEntradaConcluida] = React.useState(() => {
    // Verificar também nas presenças guardadas
    const presencas = getPresencas();
    const jaEntrou = presencas.some(p => p.alunoId === aluno.id && p.planoAulaId === plano.id);
    return _load('entrada') || jaEntrou;
  });
  // A função de cada um nesta aula (plano organizacional). Lê-se o plano
  // guardado, que o telemóvel atualiza de poucos em poucos segundos: uma
  // substituição feita pelo professor aparece logo.
  const planoVivo = getPlanosAula().find(p => p.id === plano.id) || plano;
  const orgAula = temOrganizacao(planoVivo) ? organizacaoDe(planoVivo) : null;
  const minhasFuncoes = funcoesDoAluno(orgAula, aluno.id);
  const [funcaoInicioFeita, setFuncaoInicioFeita] = React.useState(() => _load('funcao_inicio'));
  const [funcaoFimFeita, setFuncaoFimFeita] = React.useState(() => _load('funcao_fim'));
  const [verQuadro, setVerQuadro] = React.useState(false);
  const [fichaConcluida, setFichaConcluida] = React.useState(() => _load('ficha'));
  const [guiaoConcluido, setGuiaoConcluido] = React.useState(() => _load('guia'));
  const [avaliacaoConcluida, setAvaliacaoConcluida] = React.useState(() => {
    return jaSubmeteuAutoavaliacao(plano, aluno.id);
  });

  // Em grupo, com ficha dada pelo professor: o aluno vê a ficha do seu grupo.
  const comGrupos = configGrupos(plano).ativo;
  const fichaDoGrupo = comGrupos ? grupoDoAluno(plano.id, aluno.id)?.fichaId : undefined;
  const fichasTodas = getFichasPorPlano(plano.id);
  const fichas = fichaDoGrupo && fichasTodas.some((f: any) => f.id === fichaDoGrupo)
    ? fichasTodas.filter((f: any) => f.id === fichaDoGrupo) : fichasTodas;
  const requisicao = getRequisicaoPorPlano(plano.id);
  const [temGrupo, setTemGrupo] = React.useState(() => !!grupoDoAluno(plano.id, aluno.id));

  // O KitchenFlow abre já com o aluno e a aula (é lá que se registam as funções).
  const abrirKF = () => abrirKitchenFlow(undefined, {
    turma: aluno.turmaId, numero: aluno.numero, pin: aluno.pin,
    tipo: 'aluno', ucId: plano.ucId, ucNome: plano.ucNome,
    pratos: fichas.map((f: any) => f.nomePrato).filter(Boolean),
    planoData: plano.data, planoHoraInicio: plano.horaInicio,
    planoHoraFim: plano.horaFim,
  } as any);

  // Os passos falam com o aluno: "Entrei na aula", não "Entrada e Higiene".
  // O `agora` é o que ele lê em grande quando o passo está ativo.
  const V = '#6B3FA0';
  // Sequência da especificação: entrada, farda, KF inicial, produção,
  // KF final, autoavaliação. O KitchenFlow deixou de ser um atalho geral
  // — são dois pontos de controlo dentro do fluxo da aula.
  // Aula atitudinal: sem farda, KitchenFlow, produção nem requisição.
  const PASSOS = soConsulta ? [
    { id:'orientacao', label:'Vi o que se fez',            agora:'Ver a atividade',  cor:V },
    ...(fichas.length ? [{ id:'ficha', label:'Vi a ficha técnica', agora:'Ver a ficha técnica', cor:V }] : []),
    ...(fichas.some((f:any) => f.textoGuia) ? [{ id:'guia', label:'Vi o guião', agora:'Ver o guião', cor:V }] : []),
  ] : String((plano as any).tipoPlanAula || '').startsWith('atitudinal') ? [
    { id:'orientacao', label:'Vi o que vamos fazer',      agora:'Ver a aula',       cor:V },
    { id:'entrada',    label:'Entrei na aula',             agora:'Entrar',           cor:V },
    ...(comGrupos ? [{ id:'grupo', label:'Estou num grupo', agora:'O meu grupo', cor:V }] : []),
    { id:'avaliacao',  label:'Avaliei-me',                 agora:'Avaliar-me',       cor:V },
  ] : [
    { id:'orientacao', label:'Vi o que vamos fazer',      agora:'Ver a aula',       cor:V },
    { id:'entrada',    label:'Entrei na aula',             agora:'Entrar',           cor:V },
    ...(comGrupos ? [{ id:'grupo', label:'Estou num grupo', agora:'O meu grupo', cor:V }] : []),
    // A função de cada um (plano organizacional): o que fazer antes de produzir.
    ...(minhasFuncoes.some(f => f.inicio.length) ? [{ id:'funcao_inicio', label:'Fiz a minha função (início)', agora:'A tua função: início', cor:V }] : []),
    { id:'ficha',      label:'Produzi',                    agora:'Produzir',         cor:V },
    ...(fichas.some((f:any) => f.textoGuia)
      ? [{ id:'guia', label:'Consultei o guião', agora:'Ver o guião', cor:V }] : []),
    // A requisição é do professor: o aluno só a consulta, e só se existir.
    // Antes o passo aparecia sempre, com "Nenhuma requisição criada".
    ...(requisicao ? [{ id:'requisicao', label:'Vi a requisição', agora:'Ver a requisição', cor:V }] : []),
    // E antes da autoavaliação: a função tem de ficar completa. Quem não tem
    // função pode dizer como ajudou os colegas.
    ...(orgAula ? [minhasFuncoes.length
      ? { id:'funcao_fim', label:'Fiz a minha função (fim)', agora:'A tua função: fim', cor:V }
      : { id:'funcao_fim', label:'Ajudei os colegas', agora:'Ajudaste os colegas?', cor:V }] : []),
    { id:'avaliacao',  label:'Avaliei-me',                 agora:'Avaliar-me',       cor:V },
  ];

  const estadoPasso = (id: string): 'concluido'|'ativo'|'pendente' => {
    if (id==='orientacao' && orientacaoConcluida) return 'concluido';
    if (id==='entrada' && entradaConcluida) return 'concluido';
    if (id==='grupo' && temGrupo && secAberta !== 'grupo') return 'concluido';
    if (id==='funcao_inicio' && funcaoInicioFeita) return 'concluido';
    if (id==='ficha' && fichaConcluida) return 'concluido';
    if (id==='guia' && guiaoConcluido) return 'concluido';
    if (id==='requisicao' && requisicao) return 'concluido';
    if (id==='funcao_fim' && funcaoFimFeita) return 'concluido';
    if (id==='avaliacao' && avaliacaoConcluida) return 'concluido';
    if (id===secAberta) return 'ativo';
    return 'pendente';
  };

  // Depois da entrada (e do grupo): a função de início, se houver; senão, produzir.
  const depoisDaEntrada = () => String((plano as any).tipoPlanAula || '').startsWith('atitudinal') ? 'avaliacao'
    : PASSOS.some(p => p.id === 'funcao_inicio') ? 'funcao_inicio' : 'ficha';
  // Depois de produzir: a função de fim, se houver; senão, a autoavaliação.
  const antesDaAvaliacao = () => PASSOS.some(p => p.id === 'funcao_fim') ? 'funcao_fim' : 'avaliacao';

  const totalPassos = PASSOS.length;
  const passosConcluidos = PASSOS.filter(p => estadoPasso(p.id) === 'concluido').length;
  const pctProgresso = Math.round(passosConcluidos / totalPassos * 100);
  const passoActivo = PASSOS.find(p => p.id === secAberta);

  // Ao voltar à aula, abre no passo onde o aluno ficou (e, com tudo feito,
  // no que enviou). Abria sempre no passo 1, "Vamos começar", mesmo com a
  // aula acabada e a nota já dada.
  const _abriuNoPasso = React.useRef(false);
  React.useEffect(() => {
    if (_abriuNoPasso.current) return;
    _abriuNoPasso.current = true;
    if (soConsulta) { setSecAberta('orientacao'); return; }
    const falta = PASSOS.find(p => estadoPasso(p.id) !== 'concluido');
    setSecAberta(falta ? falta.id : PASSOS[PASSOS.length - 1].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ background:'#f0f4f8', display:'flex', flexDirection:'column' }}>

      {/* O topo escuro (← título, data, 0/7) saiu: repetia o cabeçalho da
          janela (Voltar e o título) e o cartão roxo em baixo — no
          telemóvel, três cabeçalhos com o mesmo título ocupavam metade do
          ecrã antes de o aluno ver o que tinha de fazer. */}

      {/* CORPO — um passo de cada vez.
          A fita horizontal de separadores obrigava o aluno a perceber um
          mapa antes de fazer o que quer que fosse. Passa a haver uma
          frase que lhe diz o que fazer agora, um botão principal só, e a
          lista dos passos em baixo para saber onde está. */}
      <div style={{ background:'#F3F2F5' }}>
        <div style={{ padding:14, maxWidth:640, margin:'0 auto' }}>

          {soConsulta && (
            <div style={{ background:'#f3eefa', border:'1.5px solid #6B3FA0', borderRadius:14, padding:'12px 14px', marginBottom:14, fontSize:14.5, lineHeight:1.5 }}>
              <b>Só para ver.</b> Não estiveste nesta atividade: podes ver o que se fez, a ficha técnica e o guião, para aprender.
              Não te inscreves nem te autoavalias nela.
            </div>
          )}
          {/* A função de hoje: a primeira coisa que o aluno vê ao abrir a aula. */}
          {orgAula && !soConsulta && <CartaoMinhaFuncao plano={planoVivo} alunoId={aluno.id} onVerQuadro={() => setVerQuadro(true)} />}

          {/* Barra de progresso: vê-se em meio segundo quantos faltam. */}
          <div style={{ background:'#6B3FA0', borderRadius:16, padding:'15px 17px', marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
              <div style={{ fontSize:13, color:'#DCCFF0', overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {plano.ucId}{plano.ucNome ? ` · ${plano.ucNome}` : ''}
              </div>
            </div>
            {/* O título já está no cabeçalho da janela: aqui, a data e a hora. */}
            <div style={{ fontSize:17, fontWeight:700, color:'#fff', marginTop:5, lineHeight:1.25 }}>
              {fmtData(plano.data)}{plano.horaInicio && ` · ${plano.horaInicio}–${plano.horaFim}`}
            </div>
            <div style={{ display:'flex', gap:5, marginTop:14 }}>
              {PASSOS.map(p => {
                const est = estadoPasso(p.id);
                return <div key={p.id} style={{ flex:1, height:6, borderRadius:3,
                  background: est==='concluido' ? '#fff'
                            : secAberta===p.id ? '#B98FD9' : 'rgba(255,255,255,0.25)' }} />;
              })}
            </div>
            <div style={{ fontSize:13, color:'#DCCFF0', marginTop:8 }}>
              Passo {PASSOS.findIndex(p => p.id === secAberta) + 1} de {totalPassos}
              {passosConcluidos > 0 && ` · ${pctProgresso === 100 ? 'tudo feito 🎉' : `${passosConcluidos} feito${passosConcluidos > 1 ? 's' : ''}`}`}
            </div>
          </div>

          {/* O que fazer agora — uma frase, não um separador. */}
          {passoActivo && (
            <div style={{ background:'#fff', borderRadius:16, padding:'18px 17px',
              marginBottom:12, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:52, height:52, borderRadius:14, background:'#F0EBF7',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  fontSize:26, color:'#6B3FA0', fontWeight:700 }}>
                  {PASSOS.findIndex(p => p.id === secAberta) + 1}
                </div>
                <div>
                  <div style={{ fontSize:13, color:'#777' }}>Agora vais</div>
                  <div style={{ fontSize:22, fontWeight:700, color:'#1A1A1A', lineHeight:1.2 }}>
                    {(passoActivo as any).agora || passoActivo.label}
                  </div>
                </div>
              </div>

              {/* O passo abre num ecrã só dele. A autoavaliação tem o seu próprio botão, em baixo. */}
              {secAberta !== 'avaliacao' && (
                <button onClick={() => setEcra(true)} style={{ width:'100%', marginTop:14, minHeight:54,
                  borderRadius:12, border:'none', background:'#6B3FA0', color:'#fff', fontSize:17,
                  fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}>
                  Abrir →
                </button>
              )}
            </div>
          )}

            {ecra && secAberta !== 'avaliacao' && passoActivo && (
              <EcraCheio titulo={`Passo ${PASSOS.findIndex(p => p.id === secAberta) + 1} de ${totalPassos} · ${passoActivo.label}`}
                onSair={() => setEcra(false)}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, marginBottom:12 }}>
                  {(passoActivo as any).agora || passoActivo.label}
                </div>
            {secAberta==='orientacao' && (
              <PainelOrientacao plano={plano} fichas={fichas} aluno={aluno}
                onContinuar={() => { if (soConsulta) { setSecAberta(fichas.length ? 'ficha' : 'orientacao'); return; }
                  setOrientacaoConcluida(true); _save('orientacao'); setSecAberta('entrada'); }} />
            )}
            {secAberta==='entrada' && (
              <SecaoEntrada aluno={aluno} plano={plano}
                onConcluido={() => { setEntradaConcluida(true); _save('entrada');
                  setSecAberta(comGrupos ? 'grupo' : depoisDaEntrada()); }} />
            )}
            {secAberta==='grupo' && (
              <PassoGrupo aluno={aluno} plano={plano}
                onConcluido={() => { setTemGrupo(true);
                  setSecAberta(depoisDaEntrada()); }} />
            )}
            {secAberta==='funcao_inicio' && (
              <PassoMinhaFuncao plano={planoVivo} alunoId={aluno.id} momento="inicio"
                onVerQuadro={() => setVerQuadro(true)}
                onAbrirKitchenFlow={abrirKF}
                onConcluido={() => { setFuncaoInicioFeita(true); _save('funcao_inicio'); setSecAberta('ficha'); }} />
            )}
            {secAberta==='ficha' && (
              <SecaoFichas fichas={fichas} plano={plano} aluno={aluno}
                onConcluido={() => { if (soConsulta) { setSecAberta(fichas.some((f:any)=>f.textoGuia) ? 'guia' : 'orientacao'); return; }
                  setFichaConcluida(true); _save('ficha');
                  // Sem registos (retirados pelo professor), vai direto à autoavaliação.
                  setSecAberta(fichas.some((f:any)=>f.textoGuia) ? 'guia' : requisicao ? 'requisicao'
                    : antesDaAvaliacao()); }} />
            )}
            {secAberta==='guia' && (
              <SecaoGuiao fichas={fichas} plano={plano}
                onConcluido={() => { if (soConsulta) { setSecAberta('orientacao'); return; }
                  setGuiaoConcluido(true); _save('guia'); setSecAberta(requisicao ? 'requisicao'
                  : antesDaAvaliacao()); }} />
            )}
            {secAberta==='requisicao' && (
              <SecaoRequisicao requisicao={requisicao}
                onConcluido={() => setSecAberta(antesDaAvaliacao())} />
            )}
            {secAberta==='funcao_fim' && (
              <PassoMinhaFuncao plano={planoVivo} alunoId={aluno.id} momento="fim"
                onVerQuadro={() => setVerQuadro(true)}
                onAbrirKitchenFlow={abrirKF}
                onConcluido={() => { setFuncaoFimFeita(true); _save('funcao_fim'); setSecAberta('avaliacao'); }} />
            )}
              </EcraCheio>
            )}
            {secAberta==='avaliacao' && mudouDesdeQueAbriu && (
              <div style={{ margin:'0 0 12px', padding:'12px 14px', borderRadius:12, background:'#fff7e6', border:'1.5px solid #b5651d', fontSize:14, color:'#7a4310', fontWeight:600 }}>
                O professor atualizou esta aula. As perguntas abaixo já são as novas.
              </div>
            )}
            {secAberta==='avaliacao' && soAtividade && (
              <div style={{ padding:'14px 16px', borderRadius:12, background:'#f3eefa', border:'1.5px solid #6B3FA0', fontSize:15, lineHeight:1.5 }}>
                <b>Hoje estiveste na atividade «{soAtividade.titulo}».</b> O professor disse que respondes só à atividade:
                encontra-a em «Atividades e concursos». Não precisas de responder a esta aula.
              </div>
            )}
            {secAberta==='avaliacao' && !soAtividade && (() => {
              const pt = partesDoPlanoParaOAluno(plano, aluno.id);
              if (pt.tecnicas && pt.conhecimentos && pt.atitudes) return null;
              const quais = [pt.tecnicas && 'às técnicas', pt.conhecimentos && 'aos conhecimentos', pt.atitudes && 'às atitudes'].filter(Boolean).join(' e ');
              return (
                <div style={{ margin:'0 0 12px', padding:'12px 14px', borderRadius:12, background:'#f3eefa', border:'1.5px solid #6B3FA0', fontSize:14.5, lineHeight:1.5 }}>
                  Hoje estiveste numa atividade. Nesta aula respondes só {quais}: o resto já se avalia na atividade.
                </div>
              );
            })()}
            {secAberta==='avaliacao' && !soAtividade && (
              <SecaoAvaliacao key={versao} fichas={fichas} plano={plano} aluno={aluno} abrirLogo={ecra}
                onConcluido={() => setAvaliacaoConcluida(true)} />
            )}

          {/* O manual da UC, à mão durante a aula (Rosa, set/2026). */}
          <BotaoManualDaUC turmaId={aluno.turmaId} ucId={(plano as any).ucId} />

          {/* Onde estou no percurso. Verbos na primeira pessoa, e só se
              volta atrás — não se salta para a frente. */}
          <div style={{ background:'#fff', borderRadius:16, padding:'15px 17px', marginTop:18,
            boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:12.5, fontWeight:600, letterSpacing:'0.05em',
              textTransform:'uppercase', color:'#999', marginBottom:12 }}>
              Os passos da aula
            </div>
            {PASSOS.map(p => {
              const est = estadoPasso(p.id);
              const ativo = secAberta === p.id;
              const podeIr = est === 'concluido' || ativo;
              return (
                <button key={p.id}
                  onClick={() => { if (!podeIr) return; setSecAberta(p.id); setEcra(p.id !== 'avaliacao'); }}
                  disabled={!podeIr}
                  style={{ display:'flex', alignItems:'center', gap:11, width:'100%',
                    padding: ativo ? '9px 0' : '7px 0', background:'transparent', border:'none',
                    textAlign:'left', fontFamily:'inherit',
                    cursor: podeIr && !ativo ? 'pointer' : 'default' }}>
                  {est === 'concluido' && !ativo ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3E7A31"
                      strokeWidth={2.5} strokeLinecap="round" style={{ flexShrink:0 }}>
                      <path d="M20 6L9 17l-5-5"/></svg>
                  ) : ativo ? (
                    <span style={{ width:20, height:20, borderRadius:'50%', background:'#6B3FA0',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'#fff' }} />
                    </span>
                  ) : (
                    <span style={{ width:20, height:20, borderRadius:'50%',
                      border:'2px solid #DDD', flexShrink:0 }} />
                  )}
                  <span style={{ flex:1,
                    fontSize: ativo ? 16.5 : 15,
                    fontWeight: ativo ? 700 : 400,
                    color: ativo ? '#6B3FA0' : est==='concluido' ? '#777' : '#AAA' }}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {verQuadro && (
        <EcraCheio titulo={`Plano organizacional · ${plano.titulo || 'aula'}`} onSair={() => setVerQuadro(false)}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, marginBottom:10 }}>Quem faz o quê hoje</div>
          <QuadroOrganizacional plano={planoVivo} alunoId={aluno.id} modo="aluno" />
        </EcraCheio>
      )}
    </div>
  );
}

/**
 * Ao abrir a aula, o aluno percebe como ela é (onde, se cozinha, se é em
 * grupo) e a que vai responder no fim — e que cada pergunta trabalha um
 * dos 5 C (Rosa, out/2026). As perguntas vêm das mesmas regras da
 * autoavaliação e do plano do professor.
 */
function OQueVaisResponder({ plano, fichas, aluno }: { plano: PlanoAula; fichas: any[]; aluno: Aluno }) {
  const t = triagemDoPlano(plano);
  let ecras: EcraDoAluno[] = [];
  try {
    ecras = ecrasDoAluno(plano, fichas, contextoDoPlano(plano), perguntaCODaAula(plano.id), perguntaCRDaAula(plano.id), aluno.ano ?? 1, atitudesNoPlanoDaTurma(plano)).ecras;
  } catch { return null; }
  if (!ecras.length && !t) return null;
  const cs = (['cp', 'cl', 'cr', 'co'] as Letra5CAluno[]).filter(c => ecras.some(e => e.c === c));
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'14px 18px', marginBottom:12, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
      {t && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:12.5, fontWeight:800, letterSpacing:'0.05em', textTransform:'uppercase', color:'#6B3FA0', marginBottom:4 }}>
            Como é esta aula
          </div>
          <div style={{ fontSize:15.5, fontWeight:700, lineHeight:1.45 }}>{fraseDaAula(t)}</div>
        </div>
      )}
      <div style={{ fontSize:12.5, fontWeight:800, letterSpacing:'0.05em', textTransform:'uppercase', color:'#6B3FA0', marginBottom:4 }}>
        No fim, vais responder a {ecras.length} pergunta{ecras.length === 1 ? '' : 's'}
      </div>
      <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.65)', marginBottom:8, lineHeight:1.45 }}>
        Cada uma trabalha um dos teus 5 C: {cs.map(c => `${CINCO_C[c].sigla} ${CINCO_C[c].nome}`).join(' · ')}.
        Entregar a autoavaliação conta para o {CINCO_C.cm.sigla} {CINCO_C.cm.nome}.
      </div>
      {ecras.map((e, i) => (
        <div key={i} style={{ display:'flex', alignItems:'baseline', gap:8, padding:'6px 0',
          borderTop: i ? '1px solid rgba(26,23,20,0.08)' : 'none', fontSize:14.5, lineHeight:1.4 }}>
          <span style={{ color:'rgba(26,23,20,0.5)', minWidth:16 }}>{i + 1}</span>
          <span style={{ flex:1 }}>
            <span style={{ color:'rgba(26,23,20,0.6)' }}>{e.rotulo}{e.tipo === 'escolhe' ? ' (escolhes uma)' : ''}: </span>
            <b>{e.tipo === 'escolhe' ? e.nome.replace(/^Escolhe 1: /, '') : e.nome}</b>
          </span>
          <span style={{ fontSize:11.5, fontWeight:800, padding:'2px 8px', borderRadius:100, whiteSpace:'nowrap',
            background: CINCO_C[e.c].fundo, color: CINCO_C[e.c].cor }}>{CINCO_C[e.c].sigla}</span>
        </div>
      ))}
    </div>
  );
}

function PainelOrientacao({ plano, fichas, aluno, onContinuar }: {
  plano: PlanoAula; fichas: FichaProducao[]; aluno: Aluno; onContinuar: () => void;
}) {
  // Uma aula tem cinco a sete horas e muitas vezes já há um evento à
  // espera. O aluno tem de saber em segundos o que vai fazer — por isso
  // aqui só ficam as fichas e o botão de começar.
  //
  // Alergénios, alertas HACCP e KitchenFlow são importantes mas não são
  // o primeiro passo: passam para um painel que abre do cabeçalho.
  const [infoAberta, setInfoAberta] = useState(false);

  const alertasHACCP: string[] = [];
  fichas.forEach(f => {
    (f.preparacao || []).forEach((p: any) => {
      if (p.haccp?.trim()) alertasHACCP.push(p.haccp.trim());
    });
  });

  const alergenios = Array.from(new Set(
    fichas.flatMap(f => Array.isArray(f.alergenicos) ? f.alergenicos : [])
  )).filter(Boolean);

  const temInfo = alergenios.length > 0 || alertasHACCP.length > 0;
  const V = '#6B3FA0';

  return (
    <div>
      {/* Barra de informação — fora do caminho, mas sempre à mão. */}
      {temInfo && (
        <button onClick={() => setInfoAberta(true)} style={{
          width:'100%', display:'flex', alignItems:'center', gap:11,
          background:'#fff', border:'none', borderRadius:14, padding:'13px 15px',
          marginBottom:12, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <span style={{ width:34, height:34, borderRadius:10, background:'#FDF0E8',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#B5651D"
              strokeWidth={2.2} strokeLinecap="round">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.3 3.9L2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <span style={{ flex:1 }}>
            <span style={{ display:'block', fontSize:14.5, fontWeight:700, color:'#1A1A1A' }}>
              A ter em atenção nesta aula
            </span>
            <span style={{ display:'block', fontSize:13, color:'rgba(26,23,20,0.55)' }}>
              {[
                alergenios.length ? `${alergenios.length} alergénio${alergenios.length > 1 ? 's' : ''}` : '',
                alertasHACCP.length ? `${alertasHACCP.length} ponto${alertasHACCP.length > 1 ? 's' : ''} crítico${alertasHACCP.length > 1 ? 's' : ''}` : '',
              ].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span style={{ fontSize:20, color:'rgba(26,23,20,0.3)' }}>›</span>
        </button>
      )}

      {/* O sumário que o professor escreveu ou ditou. */}
      {sumarioDoPlano(plano, fichas) && (
        <div style={{ background:'#F0EBF7', borderRadius:16, padding:'14px 18px', marginBottom:12,
          border:'1px solid #D9CCEB' }}>
          <div style={{ fontSize:12.5, fontWeight:800, letterSpacing:'0.05em', textTransform:'uppercase',
            color:'#6B3FA0', marginBottom:5 }}>Sumário da aula</div>
          <div style={{ fontSize:15, lineHeight:1.55, color:'#2A1745', whiteSpace:'pre-wrap' }}>{sumarioDoPlano(plano, fichas)}</div>
        </div>
      )}

      {/* Como é a aula e o que vais responder no fim — o mesmo que o professor vê. */}
      <OQueVaisResponder plano={plano} fichas={fichas} aluno={aluno} />

      {/* O que vais fazer — é isto que interessa. */}
      <div style={{ background:'#fff', borderRadius:16, padding:18, marginBottom:12,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize:13, color:'rgba(26,23,20,0.5)' }}>
          {fichas.length === 0 ? 'Sem fichas atribuídas'
            : fichas.length === 1 ? 'Hoje vais fazer' : `Hoje vais fazer ${fichas.length} fichas`}
        </div>
        {fichas.length === 0 ? (
          <div style={{ fontSize:15.5, color:'rgba(26,23,20,0.6)', marginTop:8, lineHeight:1.55 }}>
            O professor ainda não te atribuiu nenhuma ficha para esta aula.
            Pergunta-lhe o que vais trabalhar.
          </div>
        ) : (
          fichas.map((f:any, n:number) => (
            <div key={f.id} style={{ marginTop: n === 0 ? 8 : 14 }}>
              <div style={{ fontSize:21, fontWeight:700, color:'#1A1A1A', lineHeight:1.25 }}>
                {f.nomePrato}
              </div>
              {f.numPorcoes && (
                <div style={{ fontSize:14, color:'rgba(26,23,20,0.55)', marginTop:3 }}>
                  {f.numPorcoes} doses
                  {f.tempoPrep ? ` · ${f.tempoPrep} de preparação` : ''}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Começar. Um botão, grande, sem nada a competir com ele. */}
      <button onClick={onContinuar} style={{
        width:'100%', background:V, border:'none', borderRadius:16,
        padding:'20px 18px', cursor:'pointer', fontFamily:'inherit',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
      }}>
        <span style={{ fontSize:20, fontWeight:700, color:'#fff' }}>Vamos começar</span>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff"
          strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>

      {/* Painel de informação — abre por cima, não ocupa o ecrã. */}
      {infoAberta && (
        <div onClick={() => setInfoAberta(false)} style={{
          position:'fixed', inset:0, background:'rgba(26,23,20,0.55)', zIndex:9998,
          display:'flex', alignItems:'flex-end', justifyContent:'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'#F3F2F5', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:620,
            maxHeight:'80vh', overflowY:'auto', padding:'8px 16px 28px',
          }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'#D8D3E0',
              margin:'8px auto 18px' }} />

            {alergenios.length > 0 && (
              <div style={{ background:'#fff', borderRadius:16, padding:16, marginBottom:12 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#1A1A1A', marginBottom:10 }}>
                  Alergénios nesta aula
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                  {alergenios.map((al:any, k:number) => (
                    <span key={k} style={{ padding:'7px 13px', borderRadius:100,
                      background:'#FDF0E8', color:'#B5651D', fontSize:14, fontWeight:600 }}>
                      {al}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {alertasHACCP.length > 0 && (
              <div style={{ background:'#fff', borderRadius:16, padding:16, marginBottom:12 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#1A1A1A', marginBottom:10 }}>
                  Pontos críticos
                </div>
                {alertasHACCP.map((h, k) => (
                  <div key={k} style={{ fontSize:14.5, color:'rgba(26,23,20,0.75)',
                    padding:'8px 0', borderBottom: k < alertasHACCP.length-1 ? '1px solid #EEE' : 'none',
                    lineHeight:1.5 }}>
                    {h}
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => abrirKitchenFlow(undefined, {
                turma:aluno.turmaId, numero:aluno.numero, pin:aluno.pin, tipo:'aluno',
                ucId:plano.ucId, planoData:plano.data,
                planoHoraInicio:plano.horaInicio, planoHoraFim:plano.horaFim,
              } as any)}
              style={{ width:'100%', background:'#fff', border:'none', borderRadius:16,
                padding:16, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <span style={{ width:38, height:38, borderRadius:11, background:'rgba(14,116,144,0.1)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#0e7490"
                  strokeWidth={2} strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h10" /><circle cx="19" cy="18" r="3" />
                </svg>
              </span>
              <span style={{ flex:1 }}>
                <span style={{ display:'block', fontSize:15.5, fontWeight:700, color:'#1A1A1A' }}>
                  Abrir o KitchenFlow
                </span>
                <span style={{ display:'block', fontSize:13, color:'rgba(26,23,20,0.55)' }}>
                  registos de higiene e temperaturas
                </span>
              </span>
            </button>

            <button onClick={() => setInfoAberta(false)} style={{
              width:'100%', background:'transparent', border:'none', padding:14,
              fontSize:15, color:'rgba(26,23,20,0.5)', cursor:'pointer', fontFamily:'inherit',
            }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const ITENS_FARDA = [
  { id: 'farda',   label: 'Farda' },
  { id: 'avental', label: 'Avental' },
  { id: 'sapatos', label: 'Sapatos' },
  { id: 'touca',   label: 'Touca' },
  { id: 'cabelo',  label: 'Cabelo preso' },
  { id: 'maos',    label: 'Mãos lavadas' },
  { id: 'fones',   label: 'Sem fones' },
  { id: 'adornos', label: 'Sem adornos' },
  { id: 'unhas',   label: 'Unhas curtas' },
];

/** Itens que impedem de entrar na cozinha. Farda, avental e sapatos
 *  estão ao mesmo nível: sem qualquer um deles não há produção. */
const IMPEDEM = ['farda', 'avental', 'sapatos'];

function SecaoEntrada({ aluno, plano, onConcluido }: {
  aluno: Aluno; plano: PlanoAula; onConcluido: () => void;
}) {
  // A aula só abre quando o professor autoriza. Até lá o aluno consulta
  // mas não grava nada — e os dez minutos de tolerância contam da
  // abertura, não da hora prevista no plano.
  const [, forcarRender] = useState(0);
  // Se o aluno já entrou nesta aula, o ecrã tem de o saber. Começava
  // sempre do zero: ele voltava a "Entrar" e a preencher a farda, e
  // ficava um registo de farda novo de cada vez.
  const [entrada, setEntrada] = useState<
    { foraDeTempo: boolean; minutosAposAbertura: number; jaExistia: boolean } | null
  >(() => {
    const p: any = getPresencas().find(
      x => x.alunoId === aluno.id && x.planoAulaId === plano.id);
    return p ? { foraDeTempo: !!p.atrasado, minutosAposAbertura: p.atrasadoMins || 0, jaExistia: true } : null;
  });
  // A farda em dois tempos: primeiro a pergunta, e só quem tem algo em
  // falta é que abre a lista dos nove itens.
  const [fardaModo, setFardaModo] = useState<'perguntar' | 'detalhe'>('perguntar');
  const [fardaSub, setFardaSub] = useState(0);
  // Depois da farda: lavar bem as mãos antes de começar (com o quadro dos passos).
  const [lavarMaos, setLavarMaos] = useState(false);
  // Vazios: confirmar a farda tem de ser um ato do aluno. Quem diz que
  // está tudo completo marca-os todos de uma vez, mas é uma escolha
  // sua — não o estado por omissão.
  const [ok, setOk] = useState<Record<string, boolean>>(
    Object.fromEntries(ITENS_FARDA.map(i => [i.id, false]))
  );

  const t = estadoTolerancia(plano.id);
  const sessao = getSessaoAula(plano.id);

  // Relógio para a contagem decrescente.
  useEffect(() => {
    if (!t.aberta || entrada) return;
    const id = setInterval(() => forcarRender(n => n + 1), 15000);
    return () => clearInterval(id);
  }, [t.aberta, entrada]);

  // Enquanto espera, pergunta ao Sheets se a aula já abriu. O professor
  // abre no computador dele e isto é o que faz a notícia chegar ao
  // tablet do aluno. Dez segundos de atraso, no pior caso.
  //
  // Só corre neste ecrã e pára assim que a aula abre: não faz sentido
  // estar a consultar o Sheets durante as sete horas de aula.
  useEffect(() => {
    if (t.aberta) return;
    let vivo = true;
    const perguntar = () => {
      sincronizarSessoes(aluno.turmaId)
        .then(() => { if (vivo) forcarRender(n => n + 1); })
        .catch(() => {});
    };
    perguntar();
    // De 10 em 10 segundos (antes 30): é só enquanto o aluno espera.
    const id = setInterval(perguntar, 10000);
    return () => { vivo = false; clearInterval(id); };
  }, [t.aberta, aluno.turmaId]);

  const V = '#6B3FA0', VS = '#F0EBF7';
  const emFalta = ITENS_FARDA.filter(i => !ok[i.id]);
  // Sem farda completa, o aluno assume o erro: três perguntas (Rosa, set/2026).
  const [refl, setRefl] = useState<{ porque: string; resolver: string; evitar: string }>({ porque: '', resolver: '', evitar: '' });
  const reflexaoFeita = !!refl.porque && !!refl.resolver && refl.evitar.trim().length >= 5;
  const impedido = emFalta.some(i => IMPEDEM.includes(i.id));

  function entrar() {
    const r = marcarPresenca(aluno.id, plano.id, aluno.turmaId, plano.ucId);
    if (r) {
      setEntrada(r);
      // Aula atitudinal: conta a presença e a hora de entrada, mas não há
      // farda nem registos do KitchenFlow.
      // O mesmo quando o professor tirou a farda desta aula.
      // Sem farda nesta aula, as mãos lavam-se na mesma antes de começar.
      if (String((plano as any).tipoPlanAula || '').startsWith('atitudinal')) onConcluido();
      else if (((plano as any).compRemovidas || []).includes('OBR_01')) setLavarMaos(true);
    }
  }

  async function gravarFarda(faltas = emFalta) {
    const impedido = faltas.some(i => IMPEDEM.includes(i.id));
    const nomes = faltas.map(i => i.label);
    const agora = new Date().toISOString();
    const reg = (suf: string, comp: string, nota: number) => addRegistoAvaliacao({
      id: `${plano.id}_${aluno.id}_${suf}_${Date.now()}`, alunoId: aluno.id,
      turmaId: aluno.turmaId, planoAulaId: plano.id, fichaId: '',
      ucId: plano.ucId || '', microcompetenciaId: comp, nota,
      data: agora, validadoPor: 'aluno',
    });
    reg('farda', 'OBR_01', impedido ? 1 : Math.max(1, 5 - nomes.length));
    // A reflexão sobre a farda chega ao professor na validação (vai com a autoavaliação).
    if (nomes.length) {
      try { localStorage.setItem(`ecl_farda_reflexao_${plano.id}_${aluno.id}`, JSON.stringify({ ...refl, emFalta: nomes })); } catch { /* */ }
    }
    if (nomes.length) reg('resp', 'ATI-001', 3);

    registarHigieneKitchenFlow(
      aluno.turmaId, aluno.id, aluno.nome || `Aluno ${aluno.numero}`, nomes.length === 0
    ).catch(() => {});
    registarFardaNaPresenca(aluno.id, plano.id, nomes);
    setLavarMaos(true);
  }

  // ── Depois da farda: lavar as mãos ──
  if (lavarMaos) return <LavarMaos simples={(aluno.nivelMedidas || 1) >= 2}
    onFeito={seg => { registarMaosLavadas(aluno.id, plano.id, seg); onConcluido(); }} />;

  // ── Antes de o professor abrir ──
  if (!t.aberta) {
    return (
      <div style={{ background:'#fff', borderRadius:16, padding:20,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06)', textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:VS, margin:'0 auto 14px',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={V}
            strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </div>
        <div style={{ fontSize:19, fontWeight:700, color:'#1A1A1A' }}>
          Espera pelo professor
        </div>
        <div style={{ fontSize:15, color:'rgba(26,23,20,0.6)', marginTop:8, lineHeight:1.6 }}>
          A entrada na aula ainda não foi aberta. Podes consultar o plano, a
          tua ficha e o guião enquanto esperas.
        </div>
      </div>
    );
  }

  // ── Aberta, mas ainda não entrou ──
  // Já entrou: não repete a entrada nem a farda.
  if (entrada?.jaExistia) {
    const p: any = getPresencas().find(
      x => x.alunoId === aluno.id && x.planoAulaId === plano.id);
    const hora = String(p?.horaEntrada || '').slice(0, 5);
    return (
      <div style={{ background:'#eef4eb', border:'1.5px solid var(--sage, #5a7a4e)',
        borderRadius:14, padding:'16px 18px' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#2d4a22' }}>
          Já entraste nesta aula{hora ? ` — ${hora}` : ''}
        </div>
        <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', marginTop:4, lineHeight:1.5 }}>
          A tua entrada e a farda já ficaram registadas. Não precisas de repetir.
        </div>
        <button onClick={onConcluido} style={{
          marginTop:12, width:'100%', padding:13, borderRadius:11, border:'none',
          background:'var(--sage, #5a7a4e)', color:'#fff', fontSize:15, fontWeight:700,
          cursor:'pointer', fontFamily:'inherit',
        }}>
          Continuar
        </button>
      </div>
    );
  }

  if (!entrada) {
    return (
      <div>
        <div style={{
          background: t.foraDeTempo ? '#FDF0E8' : '#E8F3E5',
          border: `1px solid ${t.foraDeTempo ? '#B5651D' : '#3E7A31'}`,
          borderRadius:16, padding:18, marginBottom:12,
        }}>
          <div style={{ fontSize:17, fontWeight:700, color: t.foraDeTempo ? '#B5651D' : '#3E7A31' }}>
            {t.foraDeTempo ? 'A tolerância terminou' : 'Entrada aberta'}
          </div>
          {!t.foraDeTempo && (
            <div style={{ fontSize:38, fontWeight:700, color:'#3E7A31', marginTop:8, lineHeight:1 }}>
              {t.minutosRestantes} <span style={{ fontSize:16, fontWeight:400 }}>min</span>
            </div>
          )}
          <div style={{ fontSize:14, color: t.foraDeTempo ? '#8A4E15' : 'rgba(26,23,20,0.65)',
            marginTop:8, lineHeight:1.55 }}>
            {t.foraDeTempo
              ? 'Se entrares agora fica registada falta de atraso. Entra na mesma — a presença conta.'
              : `O professor abriu às ${new Date(sessao!.abertaEm!).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}. Entra antes de acabar o tempo.`}
          </div>
        </div>

        <button onClick={entrar} style={{
          width:'100%', background:V, color:'#fff', border:'none', borderRadius:14,
          padding:18, fontSize:18, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
        }}>
          Entrar na aula
        </button>
      </div>
    );
  }

  // ── Entrou: confirmar a farda ──
  return (
    <div>
      <div style={{ background:'#fff', borderRadius:16, padding:'14px 16px', marginBottom:12,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ width:38, height:38, borderRadius:'50%', flexShrink:0,
          background: entrada.foraDeTempo ? '#FDF0E8' : '#E8F3E5',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={entrada.foraDeTempo ? '#B5651D' : '#3E7A31'}
            strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        </span>
        <div>
          <div style={{ fontSize:15.5, fontWeight:700, color:'#1A1A1A' }}>
            Presença registada
          </div>
          {/* A aplicação não decide a falta: regista a hora e sinaliza.
              Quem decide é o professor. */}
          <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', lineHeight:1.5 }}>
            {entrada.foraDeTempo
              ? `Entraste ${entrada.minutosAposAbertura} min depois da abertura. O professor vai decidir se conta como falta.`
              : 'A horas'}
          </div>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:16, padding:18,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize:19, fontWeight:700, color:'#1A1A1A' }}>A tua farda</div>

        {fardaModo === 'perguntar' ? (
          <>
            <div style={{ fontSize:14.5, color:'#777', marginTop:5, marginBottom:16,
              lineHeight:1.55 }}>
              Casaco e calças, avental, sapatos de segurança, touca, cabelo
              preso, sem adornos, unhas curtas, mãos lavadas.
            </div>
            {/* Honestidade: o aluno declara, o professor verifica sempre. */}
            <div style={{ background:'#FDF0E8', border:'1px solid #E8C9A8', borderRadius:12,
              padding:'11px 13px', marginBottom:14, fontSize:14, color:'#7A4515', lineHeight:1.5 }}>
              <b>Olha para ti antes de responder.</b> O professor confirma sempre a farda de cada aluno.
              Ser verdadeiro e assumir quando falta alguma coisa é uma competência profissional
              que também é avaliada — dizer que está completa quando não está conta contra ti.
            </div>
            <button
              // Um toque só: antes pedia outra vez "Confirmar — está tudo".
              onClick={() => gravarFarda([])}
              style={{ width:'100%', background:V, color:'#fff', border:'none',
                borderRadius:12, padding:17, fontSize:17.5, fontWeight:600,
                cursor:'pointer', fontFamily:'inherit', marginBottom:10 }}>
              A minha farda está completa
            </button>
            <button
              // Começa com tudo marcado: o aluno toca só no que lhe falta.
              // Antes começava com tudo em falta e o aviso "não podes
              // entrar na cozinha" aparecia logo, antes de tocar em nada.
              onClick={() => {
                setOk(Object.fromEntries(ITENS_FARDA.map(i => [i.id, true])));
                setFardaSub(0);
                setFardaModo('detalhe');
              }}
              style={{ width:'100%', background:'transparent', border:`2px solid ${V}`,
                color:V, borderRadius:12, padding:15, fontSize:16, fontWeight:600,
                cursor:'pointer', fontFamily:'inherit' }}>
              Tenho algo em falta
            </button>
          </>
        ) : (() => {
          // Uma coisa de cada vez: o que falta, depois uma pergunta por ecrã.
          const OPC_REFL = {
            porque: ['Esqueci-me', 'Não preparei a farda na véspera', 'A farda estava suja ou estragada', 'Outra razão'],
            resolver: ['Pedi para ma trazerem', 'Pedi emprestado', 'Não consegui resolver hoje'],
          } as const;
          const total = emFalta.length ? 4 : 1;
          const nomes = ['O que te falta', 'O que aconteceu?', 'O que fizeste para resolver?', 'Para não voltar a acontecer'];
          const opcao = (k: 'porque' | 'resolver', o: string) => (
            <button key={o} onClick={() => setRefl(r => ({ ...r, [k]: o }))} style={{ width:'100%', display:'block',
              textAlign:'left', padding:'13px 14px', marginBottom:8, borderRadius:12, fontSize:15, cursor:'pointer',
              fontFamily:'inherit', border:`2px solid ${refl[k] === o ? V : '#E4E1E8'}`,
              background: refl[k] === o ? VS : '#fff', color: refl[k] === o ? V : '#333',
              fontWeight: refl[k] === o ? 700 : 500 }}>{o}</button>
          );
          return (
        <>
        <ProgressoSlides nome={nomes[fardaSub]} idx={fardaSub} total={total} />
        {fardaSub === 0 && (
        <>
        <div style={{ fontSize:14, color:'#777', marginTop:4, marginBottom:15 }}>
          Toca no que te falta (fica a cinzento).
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:9,
          marginBottom:16 }}>
          {ITENS_FARDA.map(it => {
            const marcado = ok[it.id];
            return (
              <button key={it.id}
                onClick={() => setOk(p => ({ ...p, [it.id]: !p[it.id] }))}
                style={{
                  background: marcado ? VS : '#fff',
                  border: `2px solid ${marcado ? V : '#DDD'}`,
                  borderRadius:12, padding:'14px 6px', textAlign:'center',
                  cursor:'pointer', fontFamily:'inherit',
                  color: marcado ? V : '#BBB',
                  WebkitTapHighlightColor:'transparent',
                }}>
                {IconesFarda[it.id]?.()}
                <div style={{ fontSize:13.5, fontWeight:600, marginTop:6,
                  color: marcado ? V : '#999' }}>{it.label}</div>
              </button>
            );
          })}
        </div>

        {emFalta.length > 0 && (
          <div style={{
            background: impedido ? '#FDF0E8' : '#FFF8E8',
            border:`1px solid ${impedido ? '#B5651D' : '#D9A441'}`,
            borderRadius:12, padding:14, marginBottom:14,
            fontSize:14.5, lineHeight:1.6, color: impedido ? '#B5651D' : '#8A6516',
          }}>
            {impedido
              ? <>Sem {emFalta.filter(i=>IMPEDEM.includes(i.id)).map(i=>i.label.toLowerCase()).join(', ')} não
                  podes entrar na cozinha. </>
              : null}
            Sem a farda completa, <b>as técnicas de hoje contam 0</b>. Se conseguires resolver
            (alguém te trazer a farda, ou emprestada), fala com o professor. As atitudes contam
            na mesma — incluindo a forma como ajudas na aula. Assumir o que aconteceu é ser profissional.
          </div>
        )}

        </>
        )}
        {fardaSub === 1 && <>
          <div style={{ fontSize:20, fontWeight:800, marginBottom:12 }}>O que aconteceu?</div>
          {OPC_REFL.porque.map(o => opcao('porque', o))}
        </>}
        {fardaSub === 2 && <>
          <div style={{ fontSize:20, fontWeight:800, marginBottom:12 }}>O que fizeste para resolver?</div>
          {OPC_REFL.resolver.map(o => opcao('resolver', o))}
        </>}
        {fardaSub === 3 && <>
          <div style={{ fontSize:20, fontWeight:800, marginBottom:12 }}>O que vais fazer para não voltar a acontecer?</div>
          <input value={refl.evitar} onChange={e => setRefl(r => ({ ...r, evitar: e.target.value }))}
            placeholder="Uma frase" style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:12,
              border:'1.5px solid #DDD', fontSize:15.5, fontFamily:'inherit' }} />
        </>}
        <NavSlides
          onAnterior={() => fardaSub === 0 ? setFardaModo('perguntar') : setFardaSub(n => n - 1)}
          pode={fardaSub === 0 ? true : fardaSub === 1 ? !!refl.porque : fardaSub === 2 ? !!refl.resolver : reflexaoFeita}
          textoSeguinte={emFalta.length === 0 ? 'Confirmar — está tudo'
            : fardaSub < 3 ? 'Seguinte' : `Confirmar — falta-me ${emFalta.length}`}
          onSeguinte={() => emFalta.length === 0 || fardaSub === 3 ? gravarFarda() : setFardaSub(n => n + 1)}
          fundo="#fff" />
        </>
          );
        })()}
      </div>
    </div>
  );
}

function SecaoGuiao({ fichas, plano, onConcluido }: {
  fichas: FichaProducao[]; plano: PlanoAula; onConcluido: () => void;
}) {
  const fichasComGuiao = fichas.filter((f: any) => f.textoGuia);
  const [fichaActiva, setFichaActiva] = useState(fichasComGuiao[0]?.id || '');

  if (fichasComGuiao.length === 0) {
    return (
      <div>
        <div style={{ textAlign:'center', padding:'32px 20px',
          color:'rgba(26,23,20,0.4)', fontSize:14 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📖</div>
          O professor ainda não criou o guião para esta aula.
        </div>
        <button onClick={onConcluido} style={{ width:'100%', padding:'14px',
          borderRadius:12, border:'none', background:'#1a6b5a', color:'#fff',
          fontSize:15, fontWeight:700, cursor:'pointer', marginTop:6 }}>
          Continuar →
        </button>
      </div>
    );
  }

  const fichaGuiao = fichasComGuiao.find((f: any) => f.id === fichaActiva) || fichasComGuiao[0];

  return (
    <div>
      {/* Selector de ficha se houver mais do que uma com guião */}
      {fichasComGuiao.length > 1 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          {fichasComGuiao.map((f: any) => (
            <button key={f.id} onClick={() => setFichaActiva(f.id)} style={{
              padding:'6px 14px', borderRadius:100, border:'none', cursor:'pointer',
              fontSize:13, fontWeight:700,
              background: fichaActiva === f.id ? '#1a6b5a' : 'rgba(26,106,90,0.08)',
              color: fichaActiva === f.id ? '#fff' : '#1a6b5a',
            }}>{f.nomePrato}</button>
          ))}
        </div>
      )}

      {/* Botão PDF no topo */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
        <button
          onClick={() => {
            const guia = (fichaGuiao as any).guiaParsed || { secoes: [], equilibrioSensorial: [] };
            gerarPDFGuiao({
              nomePrato: fichaGuiao.nomePrato || '',
              ucId: plano.ucId,
              ucNome: plano.ucNome,
              guia,
              textoOriginal: (fichaGuiao as any).textoGuia || '',
            });
          }}
          style={{ padding:'8px 16px', borderRadius:10, border:'none',
            background:'#b5651d', color:'#fff', fontSize:13,
            fontWeight:700, cursor:'pointer', display:'flex',
            alignItems:'center', gap:6 }}>
          ⬇ PDF do Guião
        </button>
      </div>

      {/* Guião completo — todas as secções com scroll */}
      <GuiaProducao
        textoGuia={(fichaGuiao as any).textoGuia}
        nomePrato={fichaGuiao.nomePrato || ''}
        ucId={plano.ucId}
        ucNome={plano.ucNome}
      />

      <button onClick={onConcluido} style={{ width:'100%', padding:'18px',
        borderRadius:16, border:'none',
        background:'linear-gradient(135deg, #1a6b5a, #0f4a3d)',
        color:'#fff', fontSize:17, fontWeight:800, cursor:'pointer',
        marginTop:16, boxShadow:'0 6px 20px rgba(26,107,90,0.4)',
        display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
        <span style={{ fontSize:22 }}>📖</span>
        Li o guião — Continuar
        <span style={{ fontSize:20 }}>→</span>
      </button>
    </div>
  );
}

function SecaoFichas({ fichas, plano, aluno, onConcluido }: {
  fichas: FichaProducao[]; plano: PlanoAula; aluno: Aluno; onConcluido: () => void;
}) {
  const [fichaAberta, setFichaAberta] = useState<string|null>(fichas[0]?.id||null);
  const [checklist, setChecklist] = useState<Record<string,{ing:Set<number>;passo:Set<number>}>>(() => {
    const init: Record<string,{ing:Set<number>;passo:Set<number>}> = {};
    fichas.forEach(f => {
      const ex = getChecklistAlunoFicha(plano.id, f.id, aluno.id);
      init[f.id] = {
        ing: new Set((ex?.ingredientesConfirmados||[]).map(Number)),
        passo: new Set((ex?.passosConcluidos||[]).map(Number)),
      };
    });
    return init;
  });

  function guardar(fichaId: string, novoIng?: Set<number>, novoPasso?: Set<number>) {
    setChecklist(prev => {
      const cur = prev[fichaId]||{ing:new Set<number>(),passo:new Set<number>()};
      const next = { ing: novoIng||cur.ing, passo: novoPasso||cur.passo };
      addOrUpdateChecklistAluno({
        id:`chk_${plano.id}_${fichaId}_${aluno.id}`, planoAulaId:plano.id, fichaId,
        alunoId:aluno.id, pontualidade:'a_horas', fardamento:true, itensFardamento:[],
        ingredientesConfirmados:Array.from(next.ing).map(String),
        passosConcluidos:Array.from(next.passo).map(String),
        haccpConfirmado:[], haccpRegistado:false, atualizadoEm:new Date().toISOString(),
      });
      return {...prev,[fichaId]:next};
    });
  }

  if (fichas.length===0) {
    return (
      <div>
        <div style={{ textAlign:'center', padding:'20px', color:'rgba(26,23,20,0.5)', fontSize:14 }}>
          📄 Não há fichas de produção para esta aula.
        </div>
        <button onClick={onConcluido} style={{ width:'100%', padding:'14px', borderRadius:12,
          border:'none', background:T.sage, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
          Continuar →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* O painel do KitchenFlow que estava aqui saiu: repetia os registos
          iniciais e finais, que já são passos próprios da aula, e contava
          outros ("1/2 registos concluídos") — o aluno não sabia qual valia. */}

      {fichas.map(f => (
        <div key={f.id} style={{ marginBottom:12 }}>
          <button onClick={() => setFichaAberta(fichaAberta===f.id?null:f.id)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
            borderRadius:12, border:`1.5px solid ${fichaAberta===f.id?'#2980b9':T.border}`,
            background: fichaAberta===f.id ? '#e8f4fd' : '#fff', cursor:'pointer', textAlign:'left',
          }}>
            <span style={{ fontSize:22 }}>📄</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>{f.nomePrato}</div>
              <div style={{ fontSize:13, color:'rgba(26,23,20,0.5)' }}>{f.classificacao} · {f.numPorcoes} doses</div>
            </div>
            <span style={{ fontSize:18, color:'#2980b9' }}>{fichaAberta===f.id?'▲':'▼'}</span>
          </button>

          {fichaAberta===f.id && (
            <div style={{ padding:'14px', background:'#fdfcfb', borderRadius:'0 0 12px 12px',
              border:'1px solid #2980b920', borderTop:'none' }}>
              {(f as any).htmlCompleto && (
                <button style={{ width:'100%', padding:'10px', borderRadius:10, border:`1px solid ${T.border}`,
                  background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:12 }}
                  onClick={() => {
                    const win=window.open('','_blank');
                    if(win){win.document.write((f as any).htmlCompleto);win.document.close();}
                  }}>
                  🖨️ Ver / Imprimir Ficha Completa
                </button>
              )}

              {f.ingredientes?.length>0 && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.05em', color:'#2980b9', marginBottom:8 }}>Ingredientes</div>
                  {f.ingredientes.map((ing,i) => {
                    const marcado = checklist[f.id]?.ing.has(i)||false;
                    return (
                      <label key={i} style={{ display:'flex', alignItems:'center', gap:10,
                        padding:'10px 12px', borderRadius:10, border:`1px solid ${T.border}`,
                        marginBottom:5, background:marcado?T.sageP:(i % 2 ? '#EFEDEA' : '#fff'), cursor:'pointer' }}>
                        <input type="checkbox" checked={marcado} style={{ accentColor:T.sage, width:18, height:18 }}
                          onChange={() => {
                            const cur = checklist[f.id]?.ing||new Set<number>();
                            const n = new Set<number>(cur);
                            n.has(i)?n.delete(i):n.add(i);
                            guardar(f.id,n);
                          }} />
                        <span style={{ fontSize:14, textDecoration:marcado?'line-through':'none' }}>
                          <strong>{ing.qt} {ing.un}</strong> {ing.produto}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {f.preparacao?.length>0 && (
                <div>
                  <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.05em', color:'#2980b9', marginBottom:8 }}>Preparação</div>
                  {f.preparacao.map((p,i) => {
                    const marcado = checklist[f.id]?.passo.has(i)||false;
                    return (
                      <label key={i} style={{ display:'flex', alignItems:'flex-start', gap:10,
                        padding:'10px 12px', borderRadius:10, border:`1px solid ${T.border}`,
                        marginBottom:5, background:marcado?T.sageP:(i % 2 ? '#EFEDEA' : '#fff'), cursor:'pointer' }}>
                        <input type="checkbox" checked={marcado} style={{ accentColor:T.sage, width:18, height:18, marginTop:2, flexShrink:0 }}
                          onChange={() => {
                            const cur = checklist[f.id]?.passo||new Set<number>();
                            const n = new Set<number>(cur);
                            n.has(i)?n.delete(i):n.add(i);
                            guardar(f.id,undefined,n);
                          }} />
                        <div style={{ fontSize:14, textDecoration:marcado?'line-through':'none', lineHeight:1.4 }}>
                          <strong>{p.num}.</strong> {p.descricao}
                          {p.temperatura&&<span style={{ color:'#2980b9', marginLeft:6, fontSize:13 }}>🌡 {p.temperatura}</span>}
                          {p.haccp&&<div style={{ color:T.danger, fontSize:13, marginTop:2 }}>⚠️ {p.haccp}</div>}
                          {p.haccp && <BotaoPCC texto={p.haccp} prato={f.nomePrato || ''} aluno={aluno} plano={plano} />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* No fim de cada ficha, bem à vista: a amostra testemunho (procedimento do KitchenFlow). */}
              <div style={{ marginTop:14, padding:'14px 15px', borderRadius:12, background:'#fdecea',
                border:'2px solid #c0392b', color:'#7a1f14', lineHeight:1.55 }}>
                <div style={{ fontSize:15.5, fontWeight:800 }}>⚠️ Não te esqueças da amostra testemunho</div>
                <div style={{ fontSize:14, marginTop:4 }}>
                  <b>Quantidade:</b> mínimo 150 g de cada prato servido.<br />
                  <b>Onde:</b> no frigorífico dedicado, de 0 °C a 3 °C.<br />
                  <b>Quanto tempo:</b> guarda-se 72 horas depois do serviço; depois destrói-se.<br />
                  Serve para analisar a comida se houver suspeita de intoxicação alimentar.
                </div>
                <BotaoPCC texto="" forcar="testemunho" prato={f.nomePrato || ''} aluno={aluno} plano={plano} />
              </div>

              {/* O guião NÃO aparece aqui. Tem passo próprio, e mostrá-lo
                  dentro da ficha punha o aluno a ler o mesmo texto duas
                  vezes — e a ficha ficava um documento interminável. */}
            </div>
          )}
        </div>
      ))}
      <button onClick={onConcluido} style={{ width:'100%', padding:'16px', borderRadius:14,
        border:'none', background:'#6B3FA0', color:'#fff', fontSize:17, fontWeight:600,
        cursor:'pointer', marginTop:10, fontFamily:'inherit' }}>
        Concluí a ficha → Continuar
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECÇÃO 3 — Requisição
// ─────────────────────────────────────────────────────────────
function SecaoRequisicao({ requisicao, onConcluido }: { requisicao: any; onConcluido: () => void }) {
  if (!requisicao) {
    return (
      <div>
        <div style={{ fontSize:14, color:'rgba(26,23,20,0.6)', marginBottom:14, padding:'14px', background:'var(--cream-dark)', borderRadius:10 }}>
          🛒 Nenhuma requisição criada para esta aula ainda.
        </div>
        <button onClick={onConcluido} style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'#7d4f8c', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', marginTop:6 }}>
          Continuar →
        </button>
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize:14, color:'rgba(26,23,20,0.6)', marginBottom:14 }}>
        🛒 Ingredientes a requisitar para esta aula.
      </div>
      <div style={{ overflowX:'auto', marginBottom:16 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:'#7d4f8c', color:'#fff' }}>
              <th style={{ padding:'10px 12px', textAlign:'left', borderRadius:'8px 0 0 0' }}>Produto</th>
              <th style={{ padding:'10px 8px', textAlign:'right' }}>Quantidade</th>
              <th style={{ padding:'10px 8px', textAlign:'left', borderRadius:'0 8px 0 0' }}>Un.</th>
            </tr>
          </thead>
          <tbody>
            {(requisicao.linhas||[]).map((l: any, i: number) => (
              <tr key={l.id||i} style={{ background:i%2===0?'#fff':T.cream, borderBottom:`1px solid ${T.border}` }}>
                <td style={{ padding:'10px 12px' }}>{l.produto}</td>
                <td style={{ padding:'10px 8px', textAlign:'right', fontWeight:700 }}>{l.quantidadeTotal}</td>
                <td style={{ padding:'10px 8px', color:'rgba(26,23,20,0.5)' }}>{l.unidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display:'flex', borderRadius:14, overflow:'hidden', cursor:'pointer', marginTop:10 }}
        onClick={onConcluido}>
        <div style={{ width:64, background:'#5b21b6', display:'flex',
          alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>🎯</div>
        <div style={{ flex:1, background:'#6d28d9', padding:'14px',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>Continuar para a Avaliação</div>
          <span style={{ fontSize:28, color:'rgba(255,255,255,0.5)' }}>›</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECÇÃO 4 — Autoavaliação (mantida da versão anterior)
// ─────────────────────────────────────────────────────────────
/**
 * O aluno submete e fecha logo a aplicação, e a autoavaliação não chegava
 * (Rosa, set/2026). Enquanto não se confirma no Sheets que chegou, diz-lhe
 * para não fechar e vai conferindo; quando chega, diz que chegou.
 */
function EstadoDoEnvio({ selecaoId }: { selecaoId: string }) {
  const [pendente, setPendente] = useState(() => selecaoPorConfirmar(selecaoId));
  useEffect(() => {
    if (!pendente) return;
    let vivo = true;
    const ver = () => confirmarEReenviar().catch(() => null)
      .then(() => { if (vivo) setPendente(selecaoPorConfirmar(selecaoId)); });
    const t0 = setTimeout(ver, 4000);
    const t = setInterval(ver, 10000);
    return () => { vivo = false; clearTimeout(t0); clearInterval(t); };
  }, [selecaoId, pendente]);
  return pendente ? (
    <div style={{ marginTop:10, background:'#FFF4E0', border:'1.5px solid #E8A33D', borderRadius:12, padding:'10px 12px',
      fontSize:14.5, fontWeight:700, color:'#8a5a12', lineHeight:1.45 }}>
      ⏳ A enviar ao professor… Não feches a aplicação até aparecer «Chegou ao professor».
    </div>
  ) : (
    <div style={{ marginTop:10, fontSize:14.5, fontWeight:800, color:'#3E7A31' }}>✓ Chegou ao professor.</div>
  );
}

function SecaoAvaliacao({ plano, aluno, fichas, onConcluido, abrirLogo }: {
  abrirLogo?: boolean;
  plano: PlanoAula; aluno: Aluno; fichas: FichaProducao[]; onConcluido: () => void;
}) {
  const ucId = plano.ucId||'';
  const compRemovidas: string[] = (plano as any).compRemovidas||[];

  // Evidências do KitchenFlow — carregadas automaticamente
  const [evidenciasKF, setEvidenciasKF] = useState<EvidenciaKitchenFlow[]>([]);
  const [kfCarregado, setKfCarregado] = useState(false);
  /** Houve registos obrigatórios a procurar no KitchenFlow nesta aula. */
  const [kfHaTipos, setKfHaTipos] = useState(false);

  useEffect(() => {
    // Ir buscar registos KitchenFlow do aluno nesta data
    const data = plano.data ? String(plano.data).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const registosObrig = fichas.flatMap(f => extrairRegistosObrigatorios(f as any));
    const tiposUnicos = Array.from(new Set(registosObrig));
    setKfHaTipos(tiposUnicos.length > 0);

    sincronizarEvidenciasKitchenFlow(aluno.turmaId, aluno.id, data, tiposUnicos)
      .then(ev => { setEvidenciasKF(ev); setKfCarregado(true); })
      .catch(() => setKfCarregado(true));
  }, [plano.id]);

  // Verificar se uma competência tem evidência no KitchenFlow
  function temEvidenciaKF(compId: string): boolean {
    return evidenciasKF.some(e => e.competenciaId === compId);
  }

  /**
   * A higiene e segurança alimentar fica a 1 por falta de registo no
   * KitchenFlow só quando o registo era deste aluno. Antes ficava a 1
   * também para quem não é o líder do grupo — a quem a aplicação diz que
   * "é o colega que faz os registos pelo grupo" — e nas aulas sem nenhum
   * registo obrigatório a procurar. O professor confirma na validação.
   */
  function hsaSemRegisto(): boolean {
    // A nota já não sai do KitchenFlow (decisão da Rosa, set/2026): os
    // registos são de quem tem a função no plano organizacional, e a
    // higiene e segurança alimentar vai ter uma avaliação nova. Até lá,
    // conta o que o aluno responde e o professor confirma.
    return false;
  }

  // Badge KF — mostra ao aluno que os seus registos do KitchenFlow foram verificados
  const BadgeKF = () => {
    if (!kfCarregado) return null;
    const nEvidencias = evidenciasKF.length;
    if (nEvidencias === 0) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderRadius: 10, background: 'rgba(3,105,161,0.08)', border: '1px solid rgba(3,105,161,0.2)',
        marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>🍳</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
            {nEvidencias} registo{nEvidencias !== 1 ? 's' : ''} do KitchenFlow verificado{nEvidencias !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.5)', marginTop: 1 }}>
            As competências marcadas com 🍳 têm evidência no KitchenFlow
          </div>
        </div>
      </div>
    );
  };

  // ── Competências desta aula — usa SUB-xxx e APP-xxx da ficha ─
  // SUB-xxx: subtécnicas da biblioteca
  // As linhas da ficha trazem o nome e o ramo («SUB-… — Nome | APP-… | componente»):
  // conta só o código. Um retirado pelo professor com a linha inteira também sai.
  // As regras do que se pergunta vêm de um sítio só (autoavaliacaoDaAula):
  // o professor vê no plano exatamente o que o aluno vai responder.
  // Como é a aula (o professor diz no plano): só se pergunta o que faz
  // sentido hoje. As perguntas que não se fazem ficam «não se aplica».
  const ctxAula = contextoDoPlano(plano);
  const fardaIncompletaRegisto = getHistoricoAvaliacoes().some((r: any) =>
    r.alunoId === aluno.id && r.planoAulaId === plano.id && r.microcompetenciaId === 'OBR_01' && Number(r.nota) < 5);
  // Trabalho sobre o manual: o tema (conteúdo) que o aluno escolheu.
  // Num trabalho que continua o da aula anterior, vem já escolhido o tema
  // que o aluno disse nessa aula (Rosa, out/2026); pode sempre mudar.
  const [temaEscolhido, setTemaEscolhido] = useState<number | null>(() => {
    const de = (triagemDoPlano(plano) as any)?.continuaDe;
    if (!de) return null;
    const sel = getSelecoes().filter(s => s.alunoId === aluno.id && s.planoAulaId === de)
      .sort((a: any, b: any) => String(b.criadaEm || '').localeCompare(String(a.criadaEm || '')))[0];
    for (const a of (sel?.autoavaliacoes || [])) {
      const cap = capituloDoCampo(a.competenciaId);
      if (cap) return cap.capitulo.n;
    }
    return null;
  });
  const regras = regrasDaAutoavaliacao(plano, fichas, { ctx: ctxAula, ano: aluno.ano ?? 1, fardaIncompleta: fardaIncompletaRegisto, temaEscolhido, atitudesNoPlanoDaTurma: atitudesNoPlanoDaTurma(plano) });
  // Esteve numa atividade do mesmo dia: responde só às partes do plano da
  // turma que o professor autorizou (Rosa, out/2026) — por exemplo, as
  // técnicas e os conhecimentos, mas não as atitudes, já avaliadas na atividade.
  const partes = partesDoPlanoParaOAluno(plano, aluno.id);
  const subIdsFiltrados = regras.subIds;
  // APP-xxx: aparelhos da ficha. Nada sai para os alunos com medidas (Rosa,
  // set/2026): avaliam o mesmo, com uma explicação simples do que é cada um.
  const appIdsFiltrados = regras.appIds;

  // O aluno nunca vê códigos. "SUB-COR-030-001" não lhe diz nada, e
  // "Rodelas" sozinho também não — rodelas de quê? A pergunta tem de
  // trazer a técnica-mãe e a matéria-prima:
  //    Cortar · Rodelas · cenoura
  const produtosDaFicha: string[] = [...new Set(
    fichas.flatMap((f: any) => (f.ingredientes || [])
      .map((i: any) => i?.nome || i?.designacao || '')
      .filter(Boolean))
  )] as string[];

  /** Produto da ficha mais provável para uma subtécnica, pelo nome. */
  function produtoPara(nomeSub: string): string | undefined {
    const n = nomeSub.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return produtosDaFicha.find(p => {
      const pn = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return n.includes(pn.split(' ')[0]) || pn.includes(n.split(' ')[0]);
    });
  }

  // Subtécnicas como objectos para display.
  // Numa aula atitudinal não há técnicas: trabalham-se dinâmicas de grupo
  // e atitudes. As fichas do plano, se as houver, não entram na avaliação.
  const subsSug = (String((plano as any).tipoPlanAula || '').startsWith('atitudinal') && !regras.tecnicasNaAtividade ? [] : subIdsFiltrados)
    .slice(0, 8).map((id: string) => {
    const sub = encontrarSubtecnica(id);
    const hist = getHistoricoAlunoMicro(aluno.id, id);
    const avs = hist.map(h => ({nota: h.nota, data: h.data, planoAulaId: h.planoAulaId}));
    const emReg = estaEmRegressao(avs);
    const estado = emReg ? '⚠️ Em regressão' : avs.length === 0 ? '★ Nunca avaliada' : !jaTeveSucesso(avs) ? '↑ Em desenvolvimento' : '✓ Consolidada';

    // O ramo completo: prato → aparelho → técnica-mãe → esta subtécnica.
    // (Antes procurava-se a técnica-mãe entre as subtécnicas — nunca a achava.)
    const ramo = ramoDaCompetencia(id, fichas as any[]);
    const tecMae = ramo.tecnica ? { nome: ramo.tecnica } : null;
    const nomeSub = sub?.nome || ramo.nome || '';
    // Sem prato na ficha, pelo menos a matéria-prima: «Cortar · cenoura».
    const produto = !ramo.prato && nomeSub ? produtoPara(nomeSub) : undefined;

    return {
      id,
      // O que o aluno fez neste prato, escrito na ficha («Escalfar o bacalhau
      // no leite»). Sem isso, o nome da lista — nunca o código.
      nome: ramo.fazes || nomeSub || tecMae?.nome || 'Técnica',
      aparelhoId: ramo.aparelhoId,
      comoDaFicha: !!ramo.como,
      // Onde esta técnica se encaixa e sobre o quê.
      // Se não houver técnica-mãe identificada, diz-se pelo menos que é
      // uma técnica — "Rodelas" solto não diz ao aluno o que avaliar.
      contexto: caminhoDoRamo(ramo) ? [caminhoDoRamo(ramo), ramo.fazes ? nomeSub : produto].filter(Boolean).join(' · ')
        : [tecMae?.nome || 'Técnica', produto].filter(Boolean).join(' · '),
      // Por ordem: a definição da subtécnica, depois a da técnica-mãe,
      // e só em último a dos dados — que é circular em 63% dos casos
      // ("Variante profissional de cozer: Cozer massa al dente").
      // Primeiro o «como se faz» da ficha deste prato (curto, com o utensílio:
      // «mexes com as varas»); só sem ele a definição da lista da escola.
      descricao: ramo.como || definicaoDaSubtecnica(id)?.definicao
        || definicaoDaTecnica(tecMae?.nome || '')?.definicao
        || (sub as any)?.definicao || '',
      // «Bem feito é»: a mesma frase que o professor vê (a da lista da escola),
      // para o aluno não se avaliar por uma frase e ser avaliado por outra.
      resultadoEsperado: ramo.resultado
        || definicaoDaSubtecnica(id)?.resultado
        || definicaoDaTecnica(tecMae?.nome || '')?.resultado || '',
      motivo: estado,
    };
  });

  // Aparelhos como objectos para display
  const aparelhosSug = (String((plano as any).tipoPlanAula || '').startsWith('atitudinal') && !regras.tecnicasNaAtividade ? [] : appIdsFiltrados)
    .slice(0, 4).map((id: string) => {
    const app = encontrarAparelho(id);
    const hist = getHistoricoAlunoMicro(aluno.id, id);
    const avs = hist.map(h => ({nota: h.nota, data: h.data, planoAulaId: h.planoAulaId}));
    const emReg = estaEmRegressao(avs);
    const estado = emReg ? '⚠️ Em regressão' : avs.length === 0 ? '★ Nunca preparado' : !jaTeveSucesso(avs) ? '↑ Em desenvolvimento' : '✓ Consolidado';
    const ramoApp = ramoDaCompetencia(id, fichas as any[]);
    return {
      id,
      nome: app?.nome || 'Preparação',
      // «Lasanha → preparação base» — o aparelho deste prato, não um qualquer.
      contexto: [ramoApp.prato, 'Preparação base'].filter(Boolean).join(' → '),
      // Como fica o aparelho acabado, escrito na ficha deste prato.
      resultado: ramoApp.resultado || '',
      descricao: ramoApp.como || definicaoDaTecnica(app?.nome || '')?.definicao || (app as any)?.definicao || '',
      comoDaFicha: !!ramoApp.como,
      nivel: app?.nivel || 1,
      categoria: app?.categoria || '',
      motivo: estado,
    };
  });

  // Fallback — se não há SUB/APP da ficha, usar sistema antigo
  const usarFallback = subsSug.length === 0 && aparelhosSug.length === 0;
  // A mesma regra que o professor vê nas Competências do plano.
  // Sem fichas não há técnicas: numa aula de conhecimentos apareciam
  // técnicas «de recurso» da UC (massa folhada…) sem razão nenhuma.
  void usarFallback;
  const microsSug = regras.recursoIds.length === 0 ? []
    : tecnicasDeRecurso(ucId, fichas as any[]).filter(m => regras.recursoIds.includes(m.id))
    .map(m => {
      const hist = getHistoricoAlunoMicro(aluno.id, m.id);
      const avs = hist.map(h=>({nota:h.nota,data:h.data,planoAulaId:h.planoAulaId}));
      const emReg = estaEmRegressao(avs);
      const motivo = emReg?'⚠️ Em regressão':avs.length===0?'★ Nunca avaliada':!jaTeveSucesso(avs)?'↑ Em desenvolvimento':'✓ Consolidada';
      return {...m, motivo};
    });

  // ── Conhecimentos: os do referencial (aulas teóricas ou mistas) e os
  // escritos pelo professor para esta aula (menos na atitudinal).
  const tipoPlanAula = regras.tipoPlanAula;
  const conhecimentosSug = regras.conhecimentos.map(k => {
    if (!k.id.startsWith('KNW-')) return { ...k, motivo: '' };
    const avs = getHistoricoAlunoMicro(aluno.id, k.id).map(h => ({nota: h.nota, data: h.data, planoAulaId: h.planoAulaId}));
    const motivo = estaEmRegressao(avs) ? '⚠️ Em regressão' : avs.length === 0 ? '★ Nunca avaliado' : !jaTeveSucesso(avs) ? '↑ Em desenvolvimento' : '✓ Consolidado';
    return { ...k, motivo };
  });

  const [nivelHigiene, setNivelHigiene] = useState<string|null>(null);
  const [nivelHaccp, setNivelHaccp] = useState<string|null>(null);
  const [notasMicro, setNotasMicro] = useState<Record<string,string|null>>({});
  const [microAberta, setMicroAberta] = useState<string|null>(null);
  const [atitudeEscolhida, setAtitudeEscolhida] = useState<string|null>(null);
  const [verTodasAtitudes, setVerTodasAtitudes] = useState(false);
  /** Quantas atitudes se mostram antes de o aluno pedir a lista toda. */
  const MAX_ATITUDES_MOSTRADAS = 3;
  // Posição da frase escolhida (0-3). A nota sai daqui, não de um valor fixo.
  // As respostas às duas perguntas de cada atitude (posição 0-3, ou «não aconteceu»).
  const [respAti, setRespAti] = useState<Record<string, (number | null)[]>>({});
  // Num evento ou concurso, as atitudes fixas perguntam o compromisso (treino, hora, farda, até ao fim).
  const ehDeEvento = !!(plano as any).tipoEvento;
  // Como é a aula (o professor diz no plano): só se pergunta o que faz
  // sentido hoje. As perguntas que não se fazem ficam «não se aplica».
  const respDe = (id: string) => respostasEfetivas(id, respAti[id], ctxAula, ehDeEvento);
  const aplicavel = (id: string) => atitudeAplicavel(id, ctxAula, ehDeEvento);
  const atiOk = (id: string) => respondidaAtitude(id, respDe(id), ehDeEvento);
  const notaAti = (id: string) => nivelDaAtitude(respDe(id));
  // Turmas ACP: a segunda atitude, só entre as dos anos anteriores que faltam.
  const [atitudeApanhar, setAtitudeApanhar] = useState<string|null>(null);
  const [verTodasApanhar, setVerTodasApanhar] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  /** Em que passo da autoavaliação está o aluno. */
  const [passoIdx, setPassoIdx] = useState(0);
  /** A autoavaliação abre num ecrã só dela, por cima da aula: uma pergunta de cada vez.
   *  Abre logo quando o aluno vem do passo anterior no ecrã cheio. */
  const [aberto, setAberto] = useState(!!abrirLogo);
  const topoRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => { topoRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [passoIdx]);
  /** Trava de submissão — protege de dois toques seguidos. */
  const aSubmeter = React.useRef(false);
  const [submetido, setSubmetido] = useState(() => {
    return jaSubmeteuAutoavaliacao(plano, aluno.id);
  });

  const OPCOES = [
    { v:'nf',  nota:1, label:'Ainda não fiz',                           cor:'#c8cfd6', corTxt:'#4a5568' },
    { v:'tp',  nota:2, label:'Tentei mas ainda preciso de mais prática', cor:'#96a4b0', corTxt:'#2d3748' },
    { v:'ca',  nota:3, label:'Consegui com ajuda',                       cor:'#647a8a', corTxt:'#ffffff' },
    { v:'fs',  nota:4, label:'Faço sozinho/a',                           cor:'#3d5a6e', corTxt:'#ffffff' },
    { v:'mbr', nota:5, label:'Faço com muito bom resultado',             cor:'#1e3a4a', corTxt:'#ffffff' },
  ].map(o => (aluno.nivelMedidas || 1) >= 2 ? { ...o, label: OPCOES_SIMPLES[o.v] || o.label } : o);

  // Só o HACCP: a higiene pessoal vem da entrada na aula.
  // Aula atitudinal: o aluno avalia-se nas atitudes que o professor marcou.
  const ehAtitudinal = String(tipoPlanAula || '').startsWith('atitudinal');
  // O professor pode ter incluído a higiene e a farda nesta dinâmica.
  const comObrigatorias = tipoPlanAula === 'atitudinal_obr';
  // Sem as que o professor tirou, sem repetidas, e só as que têm frases:
  // uma atitude sem frases não se podia responder e prendia o «Enviar».
  // As atitudes a que todos respondem (regrasDaAutoavaliacao): na aula
  // atitudinal, as marcadas no plano ou as do trimestre; no evento, as 3
  // fixas; sem farda completa à entrada, «Cuidado com a apresentação
  // pessoal». Só as que têm uma pergunta que faça sentido nesta aula.
  const fardaIncompletaHoje = !ehAtitudinal && fardaIncompletaRegisto;
  void fardaIncompletaHoje;
  const atitudesDaAula: string[] = partes.atitudes ? regras.atitudesDaAula : [];
  // Medidas seletivas (2) ou adicionais (3): as mesmas perguntas, mais fáceis de ler.
  const simples = (aluno.nivelMedidas || 1) >= 2;
  // Um exemplo concreto de hoje (opcional).
  const [exemplos, setExemplos] = useState<Record<string, string>>({});
  // Escrever é opcional (Rosa, set/2026): o aluno escolhe; o exemplo ajuda, mas não obriga.
  // Evento: uma pergunta de técnica geral e o que correu menos bem.
  const ehEvento = (plano as any).tipoEvento === 'evento';
  // O professor tirou os registos (HACCP/KitchenFlow) desta aula: não se pergunta.
  // A higiene e segurança alimentar só se avalia quando há produção (aulas
  // práticas e mistas): nas teóricas e nas dinâmicas não conta (Rosa, set/2026).
  // O aluno já não responde à higiene e segurança alimentar: a farda foi
  // verificada à entrada e os registos do KitchenFlow marca-os o professor,
  // pelo relatório do KitchenFlow (Rosa, set/2026).
  const semRegistos = true;
  const [tecEvento, setTecEvento] = useState<number | null>(null);
  /** O que o aluno fez, quando não teve oportunidade em nenhuma técnica. */
  const [outraTarefa, setOutraTarefa] = useState('');
  const [tecMenosBem, setTecMenosBem] = useState('');
  const tecEventoFeito = !ehEvento || tecEvento !== null;
  // Triagem do Colaborativo e do Criativo: responde-se sempre, em todas as aulas.
  // O Consciente e o Criativo têm uma pergunta do dia, igual para a turma toda.
  // Colaborativo pela triagem da aula (Rosa, out/2026): com colegas, a
  // pergunta de sempre; sozinho na cozinha, a do espaço e do material que
  // partilha; sozinho fora da cozinha (visita, sala) não se pergunta.
  const clNaoSePergunta = regras.clNaoSePergunta;
  const [triagem, setTriagem] = useState<Triagem5C>(() => ({
    cl: clNaoSePergunta || !partes.atitudes ? 'sem' : null, cr: !partes.atitudes ? 'sem' : null, co: !partes.atitudes ? 'sem' : null, problema: '',
    ...(regras.clSempre ? { clId: CL_SEMPRE.id } : {}),
    coId: perguntaCODaAula(plano.id), crId: perguntaCRDaAula(plano.id) }));
  const perguntasTriagem = perguntasDaAula(triagem.coId, triagem.crId, triagem.clId);
  // Basta escolher uma resposta; escrever o que foi mais difícil é opcional.
  const triagemFeita = (chave: 'cl' | 'cr' | 'co') => triagem[chave] != null;
  const triagemCompleta = triagemFeita('cl') && triagemFeita('cr') && triagemFeita('co');
  const prontoBase = triagemCompleta && (ehAtitudinal
    ? atitudesDaAula.length > 0 && atitudesDaAula.every(id => atiOk(id))
      && (!comObrigatorias || semRegistos || nivelHaccp !== null) && tecEventoFeito
    : (semRegistos || nivelHaccp !== null) && atitudesDaAula.every(id => atiOk(id)) && tecEventoFeito);

  const fmtN = (x: number) => (Math.round(x * 10) / 10).toString().replace('.', ',');

  function submeterDefinitivo() {
    // Um toque só. Dois toques rápidos passavam à frente da marca de
    // "já submetido" e criavam duas autoavaliações da mesma aula.
    if (aSubmeter.current || submetido) return;
    aSubmeter.current = true;
    setTimeout(() => { aSubmeter.current = false; }, 4000);

    const agora = new Date().toISOString();
    // Converter nível da autoavaliação para nota 1-5
    const paraNota = (v:string|null): number => {
      if (v==='mbr' || v==='autonomia' || v==='superei') return 5;
      if (v==='fs'  || v==='sozinho'   || v==='atingi')  return 4;
      if (v==='ca'  || v==='ajuda'     || v==='desenvolvimento') return 3;
      if (v==='tp')  return 2;
      if (v==='nf'  || v==='nao'       || v==='nao_atingi') return 1;
      return 0;
    };
    // Converter nota 1-5 para /20 (0-5-10-15-20)
    const para20 = (n: number): number => notaPara20(n);
    // Guardar OBR com escala 1-4
    // A higiene pessoal (OBR_01) NÃO se grava aqui. Já foi avaliada à
    // entrada da aula, com os nove itens da farda à frente — que é o
    // momento em que se verifica de facto. Gravar outra vez criava dois
    // registos da mesma competência e o aluno respondia duas vezes.
    // OBR_02 depende de evidência REAL no KitchenFlow — se o aluno não
    // registou lá (mesmo tendo feito a técnica correctamente), a competência
    // de registo fica a 1 (mínimo), independentemente do que auto-declarou
    // aqui. A técnica em si (SUB) nunca é afectada por isto — só o registo.
    if (nivelHaccp) {
      const notaAutoDeclarada = paraNota(nivelHaccp);
      const notaFinalHaccp = !hsaSemRegisto() ? notaAutoDeclarada : 1;
      addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_hac_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:'OBR_02',nota:notaFinalHaccp,data:agora,validadoPor:'aluno'});
    }
    // Guardar todas as competências com escala 1-4
    // «Não tive oportunidade» não se grava como nota: fica por avaliar.
    Object.entries(notasMicro).forEach(([mId,v])=>{if(v && v !== 'nop')addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_${mId}_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:mId,nota:paraNota(v as string),data:agora,validadoPor:'aluno'});});
    // Guardar atitude escolhida
    // A nota da atitude vem da frase que o aluno escolheu, não de um valor
    // fixo: NOTAS_FRASES é 5/10/15/20 em escala /20, aqui converte-se para 1-5.
    const notaDaAtitude = (atitudeEscolhida ? notaAti(atitudeEscolhida) : null) ?? 3;
    if (atitudeEscolhida) addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_${atitudeEscolhida}_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:atitudeEscolhida,nota:notaDaAtitude,data:agora,validadoPor:'aluno'});
    // Aula atitudinal: uma autoavaliação por atitude marcada pelo professor.
    atitudesDaAula.forEach(id => {
      if (!atiOk(id) || notaAti(id) == null) return;
      addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_${id}_${Date.now()}_aula`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:id,nota:notaAti(id)!,data:agora,validadoPor:'aluno'});
    });
    // Turmas ACP: a segunda atitude, do ano anterior.
    const notaApanhar = (atitudeApanhar ? notaAti(atitudeApanhar) : null) ?? 3;
    if (atitudeApanhar) addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_${atitudeApanhar}_${Date.now()}_ap`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:atitudeApanhar,nota:notaApanhar,data:agora,validadoPor:'aluno'});
    // Guardar SelecaoAluno com autoavaliacoes preenchidas para o professor validar
    // A farda entra sempre na nota do plano (obrigatórias). Não se pergunta:
    // leva a nota da verificação à entrada, e o professor confirma.
    const regFarda = getHistoricoAvaliacoes()
      .filter((r: any) => r.alunoId === aluno.id && r.planoAulaId === plano.id && r.microcompetenciaId === 'OBR_01')
      .sort((a: any, b: any) => String(b.data).localeCompare(String(a.data)))[0];
    const contaObrigatorias = (!ehAtitudinal || comObrigatorias) && !compRemovidas.includes('OBR_01');
    const todasAutoavaliacoes = [
      ...(regFarda && contaObrigatorias ? [{ competenciaId: 'OBR_01', nivel: 'entrada', nota: Number(regFarda.nota) || 1, daEntrada: true,
        reflexaoFarda: (() => { try { return JSON.parse(localStorage.getItem(`ecl_farda_reflexao_${plano.id}_${aluno.id}`) || 'null') || undefined; } catch { return undefined; } })() }] : []),
      // HACCP: sem registo no KitchenFlow, a proposta chega ao professor
      // com 1 — ele decide. Antes o 1 só ia para o histórico, que já não
      // conta para nota nenhuma; a regra perdia-se.
      ...(nivelHaccp?[{competenciaId:'OBR_02',nivel:nivelHaccp as string,
        nota: !hsaSemRegisto() ? paraNota(nivelHaccp) : 1,
        semRegistoKF: hsaSemRegisto()}]:[]),
      ...Object.entries(notasMicro).filter(([,v])=>v).map(([mId,v])=>(v === 'nop'
        // Não teve oportunidade: vai ao professor para confirmar; sem nota.
        ? {competenciaId:mId,nivel:'nop',nota:0,semOportunidade:true}
        : {competenciaId:mId,nivel:v as string,nota:paraNota(v as string)})),
      ...(atitudeEscolhida?[{competenciaId:atitudeEscolhida,nivel:'sozinho',nota:notaDaAtitude,respostas:textoDasRespostas(atitudeEscolhida, respDe(atitudeEscolhida), ehDeEvento),respIdx:respDe(atitudeEscolhida),exemplo:(exemplos[atitudeEscolhida]||'').trim()||undefined}]:[]),
      ...(atitudeApanhar?[{competenciaId:atitudeApanhar,nivel:'sozinho',nota:notaApanhar}]:[]),
      ...atitudesDaAula.filter(id => atiOk(id) && notaAti(id) != null)
        .map(id => ({competenciaId:id,nivel:'sozinho',nota:notaAti(id)!,respostas:textoDasRespostas(id, respDe(id), ehDeEvento),respIdx:respDe(id),exemplo:(exemplos[id]||'').trim()||undefined})),
      ...(todasSemOport && outraTarefa.trim() ? [{ competenciaId: 'SUB-OUTRA', nivel: 'outra', nota: 0, texto: outraTarefa.trim() }] : []),
      ...(ehEvento && tecEvento !== null ? [{ competenciaId: TEC_EVENTO, nivel: 'evento', nota: tecEvento,
        texto: OPCOES_TEC_EVENTO.find(o => o.nota === tecEvento)?.texto, comentario: tecMenosBem.trim() }] : []),
    ];
    addOrUpdateSelecao({id:`sel_${plano.id}_${aluno.id}`,comandaId:plano.id,planoAulaId:plano.id,fichaId:'',alunoId:aluno.id,turmaId:aluno.turmaId,tecnicas:Object.keys(notasMicro),atitudes:[atitudeEscolhida, atitudeApanhar, ...atitudesDaAula.filter(id => atiOk(id))].filter(Boolean) as string[],responsabilidades:[],autoavaliacoes:todasAutoavaliacoes as any,triagem5c:{ ...triagem, problema: (triagem.problema||'').trim() || undefined },criadaEm:agora,
      // A versão do plano a que o aluno respondeu: se o professor o mudar
      // depois, sabe-se que esta resposta é da versão anterior.
      versaoPlano:String((plano as any).atualizadoEm || '')} as any);
    guardarTriagemDaAula(aluno.id, aluno.turmaId, plano.id,
      { ...triagem, problema: (triagem.problema || '').trim() || undefined }, 'aluno');
    try { localStorage.setItem(`avaliacao_submetida_${plano.id}_${aluno.id}`, agora); } catch {}
    setSubmetido(true); setModalConfirmar(false); onConcluido();
  }

  if (submetido) {
    // Buscar o que o aluno submeteu para mostrar feedback
    const historicoSubmissao: any[] = [];
    const selecaoSubmetida = (() => {
      try {
        const sels = JSON.parse(localStorage.getItem('ecl_selecoes') || '[]');
        return sels.find((s: any) => s.planoAulaId === plano.id && s.alunoId === aluno.id);
      } catch { return null; }
    })();
    const autoavsSubmetidas: any[] = selecaoSubmetida?.autoavaliacoes || [];
    const dataSubmissao = (() => {
      try { return localStorage.getItem(`avaliacao_submetida_${plano.id}_${aluno.id}`) || ''; } catch { return ''; }
    })();
    const isPassada = new Date(plano.data) < new Date(new Date().toDateString());
    
    return (
      <div style={{ padding:'16px' }}>
        <div style={{ background:T.sageP, borderRadius:14, padding:'16px', textAlign:'center', marginBottom:16, border:`1px solid rgba(90,122,78,0.2)` }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
          <div style={{ fontSize:16, fontWeight:700, color:T.sage }}>Autoavaliação enviada!</div>
          {/* Uma palavra de reconhecimento: responder com verdade também é trabalho. */}
          <div style={{ fontSize:14.5, color:'#3f5e34', marginTop:8, lineHeight:1.55, fontWeight:600 }}>
            {(plano as any).tipoEvento
              ? 'Obrigado por teres participado! Aqui o que conta é o teu esforço e o teu compromisso — e deste a cara pela escola.'
              : [
                  'Obrigado pela tua sinceridade. Olhar para o próprio trabalho com verdade é o primeiro passo para melhorar.',
                  'Bom trabalho! Cada aula é um passo. Amanhã fazes ainda melhor.',
                  'Obrigado! Saber o que correu bem e o que falta é o que faz um bom profissional.',
                ][(aluno.numero + String(plano.id).length) % 3]}
          </div>
          {dataSubmissao && (
            <div style={{ fontSize:13, color:'rgba(26,23,20,0.45)', marginTop:4 }}>
              {fmtDataHora(dataSubmissao)}
            </div>
          )}
          <EstadoDoEnvio selecaoId={`sel_${plano.id}_${aluno.id}`} />
          <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginTop:6 }}>
            {getValidacoes().some(v => v.alunoId === aluno.id && v.planoAulaId === plano.id)
              ? 'O professor já validou. A nota desta aula está no topo.'
              : 'O professor vai confirmar o teu registo.'}
          </div>
        </div>

        {/* Em grupo: avaliar os colegas (só o professor vê; não conta para nota). */}
        <AvaliarColegas aluno={aluno} plano={plano} />

        {/* Mostrar o que foi submetido */}
        {autoavsSubmetidas.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:10 }}>
              O que submeteste
            </div>
            {autoavsSubmetidas.map((av: any, i: number) => {
              // Pela nota (1-5), que é o que se grava. Os nomes antigos dos
              // níveis (sozinho, ajuda…) já não batiam: tudo aparecia como
              // "Não consegui", e a competência aparecia pelo código.
              const nota = Number(av.nota) || OPCOES.find(o => o.v === av.nivel)?.nota || 0;
              const emoji = nota >= 5 ? '🌟' : nota >= 4 ? '✅' : nota >= 3 ? '🤝' : '📖';
              const ehAtitude = String(av.competenciaId || '').startsWith('ATI-');
              // Sempre em /20, como a nota da aula: níveis soltos (1 a 5) ao lado
              // de notas em /20 pareciam não bater certo.
              const label = av.semOportunidade || av.nivel === 'nop' ? 'Não tive oportunidade'
                : `${classificacao20(notaPara20(nota))} · ${notaPara20(nota)}/20`;
              void ehAtitude;
              const nomeComp = av.competenciaId?.startsWith('OBR_01') ? 'Higiene pessoal'
                : av.competenciaId?.startsWith('OBR_02') ? 'Higiene e segurança alimentar'
                : ATITUDES.find(x => x.id === av.competenciaId)?.nome || nomeCompetencia(av.competenciaId || '');
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'#fff', border:`1px solid ${T.border}`, marginBottom:6 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{emoji}</span>
                  <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{nomeComp}</div>
                  <span style={{ fontSize:13, fontWeight:600, color:'rgba(26,23,20,0.5)' }}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Bloquear re-submissão para aulas passadas */}
        {(() => {
          // Ver se o professor já validou
          // A validação mais recente desta aula, e a mesma conta de todos os
          // outros ecrãs (e do professor): calculoDaAulaValidada.
          const val: any = validacaoDaAula(aluno.id, plano.id);
          const calculo = val ? calculoDaAulaValidada(val) : null;
          if (val && calculo) {
            const { nota20, detalhes } = calculo;
            const cor = nota20 >= 17 ? '#0369a1' : nota20 >= 12 ? '#5a7a4e' : nota20 >= 8 ? '#b5651d' : '#c0392b';
            const label = classificacao20(nota20);

            // Comparação com a autoavaliação — não conta para a nota, mas ajuda o
            // aluno a perceber se se avalia acima ou abaixo do que o professor observa.
            const selecaoOriginal = getSelecoes().find(s => s.id === (val as any).selecaoId);
            const comparacoes = (selecaoOriginal?.autoavaliacoes || []).map((auto: any) => {
              const notaProfDaCompetencia = (val.notas || []).find((n: any) => n.competenciaId === auto.competenciaId)?.nota;
              const notaAlunoProposta = auto.nota || (
                auto.nivel === 'mbr' || auto.nivel === 'autonomia' || auto.nivel === 'superei' ? 5 :
                auto.nivel === 'fs'  || auto.nivel === 'sozinho'   || auto.nivel === 'atingi'  ? 4 :
                auto.nivel === 'ca'  || auto.nivel === 'ajuda'     || auto.nivel === 'desenvolvimento' ? 3 :
                auto.nivel === 'tp' ? 2 : 1
              );
              return { competenciaId: auto.competenciaId, alunoDisse: notaAlunoProposta, professorValidou: notaProfDaCompetencia };
            }).filter(c => c.professorValidou != null);
            const diferencaMedia = comparacoes.length
              ? comparacoes.reduce((s, c) => s + (c.alunoDisse - (c.professorValidou as number)), 0) / comparacoes.length
              : 0;

            return (
              <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(90,122,78,0.06)', border:'1.5px solid rgba(90,122,78,0.2)' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'rgba(26,23,20,0.5)', textTransform:'uppercase', marginBottom:8 }}>
                  ✅ Professor confirmou
                </div>
                {/* Disse «não aconteceu» e o professor viu que aconteceu: o aluno fica a saber. */}
                {(Array.isArray((val as any).naoReparou) ? (val as any).naoReparou : []).map((x: any, i: number) => (
                  <div key={i} style={{ marginBottom:10, padding:'10px 12px', borderRadius:10, background:'#fdf0e6',
                    color:'#8a4a15', fontSize:13.5, lineHeight:1.5 }}>
                    <b>Aconteceu hoje e não reparaste:</b> {x.pergunta}
                    {x.proxima && <div>➡️ <b>Para a próxima:</b> {x.proxima}</div>}
                  </div>
                ))}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:900, color:cor }}>{nota20}</span>
                  <span style={{ fontSize:14, color:'rgba(26,23,20,0.4)' }}>/20</span>
                  <span style={{ marginLeft:'auto', fontSize:14, fontWeight:700, color:cor }}>{label}</span>
                </div>
                {detalhes && (
                  <div style={{ marginTop:10, fontSize:12.5, color:'rgba(26,23,20,0.45)',
                    padding:'6px 10px', borderRadius:8, background:'rgba(26,23,20,0.03)',
                    fontFamily:'monospace' }}>
                    {detalhes}
                  </div>
                )}
                {comparacoes.length > 0 && (
                  <details style={{ marginTop:8 }}>
                    <summary style={{ fontSize:12.5, color:'rgba(26,23,20,0.35)', cursor:'pointer', userSelect:'none' }}>
                      A tua autoavaliação
                    </summary>
                    <div style={{ marginTop:6, paddingTop:6 }}>
                      {comparacoes.map(c => (
                        <div key={c.competenciaId} style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, padding:'2px 0', color:'rgba(26,23,20,0.4)' }}>
                          <span>{c.competenciaId === 'INI-001' ? 'Iniciativa' : ATITUDES.find(x => x.id === c.competenciaId)?.nome || nomeCompetencia(c.competenciaId)}</span>
                          <span>Tu: {notaPara20(c.alunoDisse)}/20 · Professor: {notaPara20(c.professorValidou as number)}/20</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          }
          return isPassada ? (
            <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(26,23,20,0.04)', border:`1px solid ${T.border}`, textAlign:'center' }}>
              <div style={{ fontSize:13, color:'rgba(26,23,20,0.4)' }}>Esta aula já foi encerrada. Não é possível alterar a avaliação.</div>
            </div>
          ) : (
            <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(26,23,20,0.04)', border:`1px solid ${T.border}`, textAlign:'center' }}>
              <div style={{ fontSize:13, color:'rgba(26,23,20,0.4)' }}>Aguarda a confirmação do professor.</div>
              {(() => {
                const sel = getSelecoes().find((s: any) => s.planoAulaId === plano.id && s.alunoId === aluno.id);
                const p = sel ? previsaoNota(((sel as any).autoavaliacoes || [])
                  .map((x: any) => ({ competenciaId: x.competenciaId, nota: Number(x.nota) || 0 })),
                  ((plano as any).tipoPlanAula || 'pratico')) : null;
                if (!p) return null;
                return (
                  <div style={{ fontSize:14, color:'#7d4f8c', fontWeight:700, marginTop:6 }}>
                    A tua proposta dá {fmtN(p.nota)} — deve ficar entre {fmtN(p.min)} e {fmtN(p.max)}.
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Nota progressiva da UC — a especificação pede que o aluno
            termine sabendo como esta aula contribui para a unidade,
            não só a nota isolada. */}
        {(() => {
          const historico = getHistoricoAvaliacoes().filter((r: any) =>
            r.alunoId === aluno.id && r.ucId === plano.ucId && r.validadoPor === 'professor'
          );
          if (!historico.length) return null;
          const media = historico.reduce((s: number, r: any) => s + r.nota, 0) / historico.length;
          const nota20 = Math.round(nivelPara20(media) * 10) / 10;
          return (
            <div style={{ background:'#6B3FA0', borderRadius:14, padding:16, marginTop:12 }}>
              <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.06em',
                textTransform:'uppercase', color:'#DCCFF0', marginBottom:6 }}>
                Progressão na UC
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:7 }}>
                <span style={{ fontSize:28, fontWeight:700, color:'#fff' }}>
                  {nota20.toFixed(1).replace('.', ',')}
                </span>
                <span style={{ fontSize:13.5, color:'#DCCFF0' }}>valores</span>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ── A autoavaliação passo a passo ─────────────────────────────
  // Uma coisa de cada vez: cada técnica no seu ecrã, depois a higiene e
  // segurança alimentar, a atitude, e no fim um ecrã para rever e enviar.
  // As regras e as contas são as mesmas do submeterDefinitivo.
  const V = '#6B3FA0';
  const notaDoNivel = (v: string | null | undefined) => OPCOES.find(o => o.v === v)?.nota ?? 0;
  // As quatro frases de cada técnica correspondem aos níveis 2 a 5;
  // "Ainda não fiz" é o nível 1.
  const NIVEIS_FRASES = ['tp', 'ca', 'fs', 'mbr'];

  // Por ordem do prato: cada preparação base com as técnicas feitas dentro
  // dela, e no fim como ficou; depois as técnicas feitas no próprio prato
  // (Rosa, set/2026: prato → aparelho → técnicas → o que se vê).
  const itemTec = (m: typeof subsSug[number]) => ({ id: m.id, nome: m.nome, contexto: m.contexto, descricao: m.descricao,
    resultado: m.resultadoEsperado, rotulo: 'Técnica', frases: true, como: m.comoDaFicha });
  const idsApp = new Set(aparelhosSug.map(a => a.id));
  const itensPratica = [
    ...aparelhosSug.flatMap(a => [
      ...subsSug.filter(m => m.aparelhoId === a.id).map(itemTec),
      { id: a.id, nome: a.nome, contexto: a.contexto, descricao: a.descricao,
        resultado: a.resultado, rotulo: 'Preparação base', frases: !!a.resultado, como: a.comoDaFicha },
    ]),
    ...subsSug.filter(m => !m.aparelhoId || !idsApp.has(m.aparelhoId)).map(itemTec),
  ];
  const itensComp: { id: string; nome: string; contexto: string; descricao: string;
    resultado: string; rotulo: string; frases: boolean; como?: boolean; manual?: boolean }[] = [
    ...(partes.tecnicas ? itensPratica : []),
    // Um campo do manual leva o capítulo por cima («Manual, cap. 21 — O bacalhau: demolha e cozedura»).
    ...(partes.conhecimentos ? conhecimentosSug : []).map(m => ({ id: m.id, nome: m.nome,
      contexto: m.capitulo || (regras.manual ? 'Conhecimento · no manual' : 'Conhecimento'),
      descricao: m.definicao, resultado: '', rotulo: 'Conhecimento', frases: false,
      manual: regras.manual || m.id.startsWith('KNW-P-M-') })),
    ...(partes.tecnicas ? microsSug : []).map(m => ({ id: m.id, nome: (m as any).nome || 'Técnica', contexto: (m as any).contexto || '',
      descricao: (m as any).descricao || '', resultado: '', rotulo: 'Técnica', frases: false })),
  ];

  // Atitudes: a do trimestre, a que está a melhorar e as do plano, no máximo três.
  const atitudesPermitidas = opcoesDeEscolhaDoAluno(aluno.ano ?? 1);
  const atitudesDoPlano = (plano.compAdicionadas || []).filter((id: string) => id.startsWith('ATI-'));
  const idsDoTrimestre = atitudesDoTrimestre((aluno.ano ?? 1) as 1|2|3,
    trimestreAtual(new Date(plano.data + 'T00:00:00'))).map((x: any) => x.id);
  const atitudesEmRecup = atitudesDoPlano.filter((id: string) => {
    const hist = getHistoricoAlunoMicro(aluno.id, id);
    return hist.length > 0 && hist[hist.length - 1].nota < 3;
  });
  // Só as que fazem sentido nesta aula: numa visita não se escolhe a
  // cooperação com a equipa nem a higiene dos alimentos.
  const atitudesSugeridas = regras.atitudesParaEscolher;
  const opcoesAtitude = !partes.atitudes ? [] : ATITUDES.filter(a =>
    (verTodasAtitudes ? atitudesPermitidas.includes(a.id) : atitudesSugeridas.includes(a.id))
    && !compRemovidas.includes(a.id) && aplicavel(a.id));
  // Numa aula prática sem atitudes marcadas pelo professor, a atitude que o
  // aluno escolhe é a única avaliada. Era opcional: dava para enviar com
  // «Nenhuma escolhida» e a aula ficava sem atitudes (25% da nota iam para o resto).
  const atitudeObrigatoria = !ehAtitudinal && atitudesDaAula.filter(id => id !== 'ATI-003').length === 0 && opcoesAtitude.length > 0;
  const atitudeRespondida = !!atitudeEscolhida && atiOk(atitudeEscolhida);
  // «Não tive oportunidade» em TODAS as técnicas de uma aula prática ou mista:
  // alguma coisa o aluno fez. Escreve o quê, e o professor dá a nota a isso
  // (conta como a técnica de hoje). Sem isto, a farda e a atitude valiam a aula toda.
  const tecnicasComp = itensComp.filter(c => c.rotulo !== 'Conhecimento');
  const todasSemOport = ['pratico', 'misto'].includes(String(tipoPlanAula || 'pratico'))
    && tecnicasComp.length > 0 && tecnicasComp.every(c => notasMicro[c.id] === 'nop');
  const outraTarefaOk = !todasSemOport || outraTarefa.trim().length >= 10;
  const prontoParaSubmeter = prontoBase && (!atitudeObrigatoria || atitudeRespondida) && outraTarefaOk;
  const porqueAtitude = (id: string) =>
    atitudesEmRecup.includes(id) ? 'Para melhorar'
    : idsDoTrimestre.includes(id) ? 'A do trimestre'
    : atitudesDoPlano.includes(id) ? 'Desta aula' : 'Proposta tua';

  // O passo «Atitude do ano anterior» (atitudes do 1.º e 2.º ano) saiu:
  // baralhava a autoavaliação e não interessa à professora.
  const faltamApanhar: { id: string; nome: string; ano: number }[] = [];

  type Passo = { id: string; tipo: 'tema' | 'comp' | 'outra' | 'haccp' | 'atiAula' | 'tecEvento' | 'atitude' | 'apanhar' | 'triagem' | 'rever';
    comp?: typeof itensComp[number]; atiId?: string; chave?: 'cl' | 'cr' | 'co' };
  const passos: Passo[] = [
    // Trabalho sobre o manual: primeiro o tema; depois os indicadores desse tema.
    ...(regras.escolheTema && partes.conhecimentos ? [{ id: 'tema', tipo: 'tema' as const }] : []),
    ...itensComp.map(c => ({ id: 'c_' + c.id, tipo: 'comp' as const, comp: c })),
    ...(todasSemOport ? [{ id: 'outra', tipo: 'outra' as const }] : []),
    ...((!ehAtitudinal || comObrigatorias) && !semRegistos ? [{ id: 'haccp', tipo: 'haccp' as const }] : []),
    ...(ehAtitudinal
      ? atitudesDaAula.map(id => ({ id: 'a_' + id, tipo: 'atiAula' as const, atiId: id }))
      : [...atitudesDaAula.map(id => ({ id: 'a_' + id, tipo: 'atiAula' as const, atiId: id })),
         ...(opcoesAtitude.length > 0 ? [{ id: 'atitude', tipo: 'atitude' as const }] : [])]),
    ...(ehEvento ? [{ id: 'tecEvento', tipo: 'tecEvento' as const }] : []),
    ...(faltamApanhar.length > 0 ? [{ id: 'apanhar', tipo: 'apanhar' as const }] : []),
    // Uma pergunta por ecrã: Colaborativo, Criativo e Consciente.
    ...(['cl', 'cr', 'co'] as const).filter(chave => partes.atitudes && (chave !== 'cl' || !clNaoSePergunta))
      .map(chave => ({ id: 'tri_' + chave, tipo: 'triagem' as const, chave })),
    { id: 'rever', tipo: 'rever' as const },
  ];
  const idx = Math.min(passoIdx, passos.length - 1);
  const passo = passos[idx];
  const nPerguntas = passos.length - 1;
  const podeAvancar =
    passo.tipo === 'tema' ? temaEscolhido != null
    : passo.tipo === 'comp' ? !!notasMicro[passo.comp!.id]
    : passo.tipo === 'haccp' ? nivelHaccp !== null
    : passo.tipo === 'atiAula' ? atiOk(passo.atiId!)
    : passo.tipo === 'tecEvento' ? tecEventoFeito
    : passo.tipo === 'atitude' ? (atitudeObrigatoria ? atitudeRespondida
      : (!atitudeEscolhida || atiOk(atitudeEscolhida)))
    : passo.tipo === 'apanhar' ? (!atitudeApanhar || atiOk(atitudeApanhar))
    : passo.tipo === 'outra' ? outraTarefaOk
    : passo.tipo === 'triagem' ? triagemFeita(passo.chave!)
    : true;
  const irPara = (i: number) => setPassoIdx(Math.max(0, Math.min(i, passos.length - 1)));
  const tituloPasso = (p: Passo) =>
    p.tipo === 'tema' ? 'O teu tema'
    : p.tipo === 'comp' ? p.comp!.rotulo
    : p.tipo === 'outra' ? 'O que fizeste hoje'
    : p.tipo === 'haccp' ? 'Higiene e segurança alimentar'
    : p.tipo === 'atiAula' || p.tipo === 'atitude' ? 'Atitude'
    : p.tipo === 'tecEvento' ? 'Técnica no evento'
    : p.tipo === 'apanhar' ? 'Atitude do ano anterior'
    : p.tipo === 'triagem' ? (p.chave === 'cl' ? 'Trabalho com os colegas' : p.chave === 'cr' ? 'Criativo' : 'Consciente')
    : 'Rever e enviar';
  /** O C dos 5 C que este passo trabalha — o aluno tem de o saber (Rosa,
   *  out/2026). Técnicas, conhecimentos e atitudes fazem a nota da aula
   *  (Competente); o evento conta para o Colaborativo. */
  const cDoPasso = (p: Passo): Letra5CAluno | null =>
    p.tipo === 'rever' ? null
    : p.tipo === 'triagem' ? p.chave!
    : p.tipo === 'tecEvento' ? 'cl'
    : 'cp';
  const chipC = (c: Letra5CAluno | null) => c ? (
    <span style={{ fontSize:12, fontWeight:800, padding:'3px 9px', borderRadius:100,
      background: CINCO_C[c].fundo, color: CINCO_C[c].cor, whiteSpace:'nowrap' }}>
      {CINCO_C[c].sigla} · {CINCO_C[c].nome}
    </span>
  ) : null;

  const estiloOpcao = (sel: boolean): React.CSSProperties => ({
    width:'100%', display:'flex', alignItems:'center', gap:12, textAlign:'left',
    padding:'12px 14px', marginBottom:8, borderRadius:12, cursor:'pointer', fontFamily:'inherit',
    border: sel ? `2px solid ${V}` : `1.5px solid ${T.border}`,
    background: sel ? '#F0EBF7' : '#fff', fontSize:14.5, lineHeight:1.45,
    color: sel ? '#2A1745' : 'rgba(26,23,20,0.8)', fontWeight: sel ? 600 : 400,
  });
  const circulo = (conteudo: React.ReactNode, sel: boolean) => (
    <span style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
      background: sel ? V : '#EEE9F5', color: sel ? '#fff' : V,
      fontSize:13.5, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {conteudo}
    </span>
  );
  /** Bolinha de escolha, sem número: o aluno escolhe o que fez, não a nota. */
  const radio = (sel: boolean) => (
    <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, boxSizing:'border-box',
      border: sel ? `6px solid ${V}` : '2px solid #CFC6DB' }} />
  );
  const rotuloSecao = (texto: string) => (
    <div style={{ fontSize:15, fontWeight:700, margin:'16px 0 10px' }}>{texto}</div>
  );

  /** O exemplo concreto de hoje — pedido nos níveis de cima. O professor vê-o na validação. */
  const campoExemplo = (id: string, idx: number | null | undefined) => (idx != null && idx >= 2) ? (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#8a4a15', marginBottom: 4 }}>{pedidoDeExemplo(aluno.nivelMedidas)}</div>
      <textarea value={exemplos[id] || ''} maxLength={200} rows={2}
        onChange={e => setExemplos(x => ({ ...x, [id]: e.target.value }))}
        style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:10,
          border:`1.5px solid ${T.border}`, fontSize:14, fontFamily:'inherit' }} />
    </div>
  ) : null;

  /** Escolher atitude + frase — o mesmo ecrã para a atitude e para a do ano anterior. */
  /** As duas perguntas de uma atitude, uma situação de hoje cada. Depois de
   *  responder, o aluno vê o que se espera dele (ou o que fazer para a próxima). */
  const perguntasAtitude = (id: string) => {
    const ps = perguntasDe(id, ehDeEvento);
    if (!ps) return null;
    const r = respAti[id] || [];
    const responder = (q: number, v: number) => setRespAti(x => {
      const n = [...(x[id] || [null, null])]; n[q] = v; return { ...x, [id]: n };
    });
    const radio = (on: boolean) => (
      <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, boxSizing:'border-box',
        border: on ? `6px solid ${V}` : '2px solid #CFC6DB' }} />
    );
    const algumaNaoConta = r.some(x => x === NAO_ACONTECEU);
    // Só as perguntas que fazem sentido nesta aula. Ficando uma só, não há
    // «não aconteceu»: é ela que dá a nota da atitude.
    const aplica = perguntasAplicaveis(id, ctxAula, ehDeEvento);
    const umaSo = aplica.filter(Boolean).length === 1;
    let numero = 0;
    return (
      <>
        {ps.map((q, qi) => {
          if (!aplica[qi]) return null;
          const v = r[qi];
          numero++;
          return (
            <div key={qi} style={{ marginTop: numero > 1 ? 18 : 6 }}>
              <div style={{ fontSize:15.5, fontWeight:700, lineHeight:1.4, margin:'8px 0 10px' }}>
                {umaSo ? '' : `${numero}. `}{q.pergunta}
              </div>
              {q.respostas.map((t, i) => (
                <button key={i} onClick={() => responder(qi, i)} style={estiloOpcao(v === i)}>
                  {radio(v === i)}{t}
                </button>
              ))}
              {q.naoAconteceu && !umaSo && (
                <button onClick={() => responder(qi, NAO_ACONTECEU)} style={{ ...estiloOpcao(v === NAO_ACONTECEU), fontStyle:'italic' }}>
                  {radio(v === NAO_ACONTECEU)}{q.naoAconteceu}
                </button>
              )}
              {v != null && (
                <div style={{ marginTop:4, padding:'9px 12px', borderRadius:10, fontSize:13.5, lineHeight:1.45,
                  background: v === NAO_ACONTECEU ? '#f3f0f7' : v >= 2 ? '#eef4eb' : T.copperP,
                  color: v === NAO_ACONTECEU ? 'rgba(26,23,20,0.7)' : v >= 2 ? '#3f5e34' : '#8a4a15' }}>
                  {v === NAO_ACONTECEU
                    ? 'Esta resposta não conta para a nota. A outra pergunta passa a valer esta atitude toda.'
                    : v >= 2 ? '✅ É isto que se espera de ti.'
                    : <>➡️ <b>Para a próxima:</b> {q.respostas[2]}</>}
                </div>
              )}
            </div>
          );
        })}
        {algumaNaoConta && (
          <div style={{ marginTop:10, fontSize:13, color:'rgba(26,23,20,0.6)', lineHeight:1.45 }}>
            O que não aconteceu não baixa a tua nota: as respostas que contam valem os 20 valores da aula.
          </div>
        )}
        {campoExemplo(id, Math.max(-1, ...r.map(x => x ?? -1)))}
      </>
    );
  };

  /** Escolher atitude e responder às duas perguntas — o mesmo ecrã para a atitude e para a do ano anterior. */
  const blocoAtitude = (
    lista: { id: string; nome: string; etiqueta: string }[],
    escolhida: string | null, escolher: (id: string | null) => void,
  ) => (
      <>
        {lista.map(a => {
          const sel = escolhida === a.id;
          return (
            <button key={a.id} onClick={() => escolher(sel ? null : a.id)}
              style={{ ...estiloOpcao(sel), flexDirection:'column', alignItems:'flex-start', gap:2 }}>
              <span style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.05em',
                textTransform:'uppercase', color: sel ? V : 'rgba(26,23,20,0.5)' }}>{a.etiqueta}</span>
              <span style={{ fontSize:15, fontWeight:700 }}>{a.nome}</span>
            </button>
          );
        })}
        {/* O aluno lê comportamentos de hoje, não números — se visse as
            notas escolhia a que quer, não a que o descreve. */}
        {escolhida && perguntasAtitude(escolhida)}
      </>
  );

  /** Uma linha do ecrã de rever. */
  const linhasRever: { nome: string; resposta: string; nota: number | null; passo: number }[] = [];
  passos.forEach((p, i) => {
    if (p.tipo === 'tema') {
      const t = regras.temasPossiveis.find(x => x.capitulo.n === temaEscolhido)?.capitulo;
      linhasRever.push({ nome: 'O teu tema', resposta: t ? `${t.n}. ${t.titulo}` : 'Por escolher', nota: null, passo: i });
    } else if (p.tipo === 'comp') {
      const v = notasMicro[p.comp!.id];
      const fi = NIVEIS_FRASES.indexOf(v as string);
      const resposta = !v ? 'Por responder'
        : v === 'nop' ? 'Não tive oportunidade hoje (o professor confirma)'
        : v === 'nf' ? (p.comp!.rotulo === 'Conhecimento' ? (p.comp!.manual ? 'Não sei' : 'Não sei explicar') : 'Não fiz')
        : fi >= 0 ? frasesVisiveis(p.comp!)[fi]
        : OPCOES.find(o => o.v === v)?.label || '';
      linhasRever.push({ nome: p.comp!.nome, resposta, nota: v ? notaDoNivel(v) : null, passo: i });
    } else if (p.tipo === 'outra') {
      linhasRever.push({ nome: 'O que fizeste em vez das técnicas',
        resposta: outraTarefa.trim() || 'Por responder', nota: null, passo: i });
    } else if (p.tipo === 'haccp') {
      const semKF = hsaSemRegisto();
      linhasRever.push({ nome: 'Higiene e segurança alimentar',
        resposta: !nivelHaccp ? 'Por responder'
          : semKF ? 'Sem registo no KitchenFlow: fica a 1' : OPCOES.find(o => o.v === nivelHaccp)?.label || '',
        nota: nivelHaccp ? (semKF ? 1 : notaDoNivel(nivelHaccp)) : null, passo: i });
    } else if (p.tipo === 'atiAula') {
      linhasRever.push({ nome: ATITUDES.find(x => x.id === p.atiId)?.nome ?? 'Atitude',
        resposta: !atiOk(p.atiId!) ? 'Por responder' : textoDasRespostas(p.atiId!, respDe(p.atiId!), ehDeEvento)
          .filter(x => !x.resposta.startsWith('Não se perguntou')).map(x => x.resposta).join(' · '),
        nota: atiOk(p.atiId!) ? notaAti(p.atiId!) : null, passo: i });
    } else if (p.tipo === 'tecEvento') {
      linhasRever.push({ nome: NOME_TEC_EVENTO,
        resposta: tecEvento === null ? 'Por responder' : OPCOES_TEC_EVENTO.find(o => o.nota === tecEvento)?.texto || '',
        nota: tecEvento, passo: i });
    } else if (p.tipo === 'atitude' || p.tipo === 'apanhar') {
      const id = p.tipo === 'atitude' ? atitudeEscolhida : atitudeApanhar;
      linhasRever.push({ nome: id ? (ATITUDES.find(x => x.id === id)?.nome ?? 'Atitude') : tituloPasso(p),
        resposta: !id ? 'Nenhuma escolhida' : !atiOk(id) ? 'Por responder'
          : textoDasRespostas(id, respDe(id), ehDeEvento)
            .filter(x => !x.resposta.startsWith('Não se perguntou')).map(x => x.resposta).join(' · '),
        nota: id && atiOk(id) ? notaAti(id) : null, passo: i });
    } else if (p.tipo === 'triagem') {
      perguntasTriagem.filter(q => q.chave === p.chave).forEach(q => {
        const r = triagem[q.chave] ?? null;
        linhasRever.push({ nome: q.titulo,
          resposta: r === null ? 'Por responder' : r === 'sem' ? (simples ? q.semOcasiaoSimples : q.semOcasiao) : (simples ? q.frasesSimples : q.frases)[r],
          // «Não houve ocasião» também é uma resposta: aparece como respondida.
          nota: r === 'sem' ? 0 : notaTriagem(r), passo: i });
      });
    }
  });

  // Fechada: só o botão para abrir. Ao sair a meio, as respostas ficam.
  if (!aberto) return (
    <div style={{ background:'#fff', borderRadius:14, border:`1px solid ${T.border}`, padding:'16px 16px 18px' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:19, fontWeight:800 }}>Autoavaliação desta aula</div>
      <div style={{ fontSize:14, color:'rgba(26,23,20,0.65)', margin:'4px 0 14px', lineHeight:1.5 }}>
        {nPerguntas} perguntas, uma de cada vez. Responde pelo que fizeste hoje.
      </div>
      {/* As perguntas trabalham os 5 C: o aluno vê quais, antes de começar. */}
      <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.7)', marginBottom:6 }}>Estas perguntas trabalham os teus 5 C:</div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
        {(['cp', 'cl', 'cr', 'co'] as Letra5CAluno[]).filter(c => passos.some(p => cDoPasso(p) === c)).map(c => (
          <React.Fragment key={c}>{chipC(c)}</React.Fragment>
        ))}
        {chipC('cm')}
      </div>
      <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.6)', marginBottom:14, lineHeight:1.45 }}>
        Entregar a autoavaliação conta para o {CINCO_C.cm.sigla} · {CINCO_C.cm.nome}.
      </div>
      <button onClick={() => setAberto(true)} style={{ width:'100%', minHeight:54, borderRadius:12, border:'none',
        background:V, color:'#fff', fontSize:17, fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}>
        {passoIdx > 0 ? 'Continuar a autoavaliação' : 'Começar a autoavaliação'}
      </button>
    </div>
  );

  return (
    <EcraCheio titulo={`Autoavaliação · ${plano.titulo}`} onSair={() => setAberto(false)}>
    <div ref={topoRef}>
      {/* De que aula se trata — numa aula que já passou, o aluno lembra-se. */}
      {idx === 0 && (
        <div style={{ background:'#F0EBF7', borderRadius:12, padding:'10px 14px', marginBottom:14,
          fontSize:13.5, lineHeight:1.5, color:'#2A1745' }}>
          <b>{plano.titulo}</b>{' · '}{String(plano.data || '').slice(0, 10).split('-').reverse().join('/')}
          {sumarioDoPlano(plano, fichas as any) && <div style={{ marginTop:4, whiteSpace:'pre-wrap' }}>{sumarioDoPlano(plano, fichas as any)}</div>}
        </div>
      )}
      {/* Onde estou */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
          <span style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:700, color:V }}>{tituloPasso(passo)}</span>
            {/* Que C desta pergunta trabalha. */}
            {chipC(cDoPasso(passo))}
          </span>
          <span style={{ fontSize:12.5, color:'rgba(26,23,20,0.55)' }}>
            {passo.tipo === 'rever' ? 'Último passo' : `${idx + 1} de ${nPerguntas}`}
          </span>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {passos.slice(0, -1).map((p, i) => (
            <div key={p.id} style={{ flex:1, height:5, borderRadius:3,
              background: i < idx || passo.tipo === 'rever' ? V : i === idx ? '#B98FD9' : '#E4E1E8' }} />
          ))}
        </div>
      </div>

      {/* ── Uma técnica, preparação ou conhecimento ── */}
      {passo.tipo === 'comp' && (() => {
        const c = passo.comp!;
        const v = notasMicro[c.id];
        // Frases de coisas que se veem (Rosa, set/2026): quem fez, se o professor
        // teve de corrigir, se ficou como o «bem feito é», se ajudou alguém.
        const ehConhecimento = c.rotulo === 'Conhecimento';
        const frases = frasesVisiveis(c);
        // Nas aulas teóricas não há «não tive oportunidade» nos conhecimentos:
        // a matéria foi dada à turma toda (Rosa, set/2026).
        const semNop = ehConhecimento && String(tipoPlanAula || '') === 'teorico';
        const escolher = (nivel: string) => setNotasMicro(p => ({ ...p, [c.id]: nivel }));
        return (
          <div>
            {c.contexto && (
              <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:V }}>
                {c.contexto}
              </div>
            )}
            <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, marginTop:2 }}>{c.nome}</div>
            {c.descricao && (
              <div style={{ fontSize:14, color:'rgba(26,23,20,0.7)', marginTop:4, lineHeight:1.5 }}>
                {/* Numa preparação base (aparelho) diz-se sempre o que é: o sabayon,
                    o béchamel… Com medidas, mais uma frase a explicar a ideia. */}
                {(c as any).como ? <b>Como se faz: </b> : c.rotulo === 'Preparação base' && <b>O que é: </b>}{c.descricao}
                {c.rotulo === 'Preparação base' && !(c as any).como && simples && (
                  <div style={{ marginTop:4 }}>É uma preparação que fazes primeiro e que depois entra no prato.</div>
                )}
              </div>
            )}
            {c.resultado && (
              <div style={{ marginTop:12, padding:'11px 13px', borderRadius:12, background:'#fff',
                border:`1px solid ${T.border}`, fontSize:13.5, lineHeight:1.45 }}>
                <strong>Bem feito é:</strong> {c.resultado}
              </div>
            )}
            <div style={{ marginTop:10 }}>
              <CriteriosComp compId={c.id} cor={V} abertaInicial={false} />
            </div>
            {rotuloSecao(c.id.startsWith('KNW-P-F-') ? 'Como correu?'
              : ehConhecimento && c.manual ? 'Depois da aula de hoje, já sabes isto?'
              : ehConhecimento ? 'Hoje, o que consegues fazer com isto?' : 'Hoje, o que aconteceu quando fizeste isto?')}
            {NIVEIS_FRASES.map((nivel, i) => (
              <button key={nivel} onClick={() => escolher(nivel)} style={estiloOpcao(v === nivel)}>
                {/* Sem números: o aluno escolhia o número, não o que fez. */}
                <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, boxSizing:'border-box',
                  border: v === nivel ? `6px solid ${V}` : '2px solid #CFC6DB' }} />
                <span>{frases[i]}</span>
              </button>
            ))}
            {/* Duas coisas diferentes (Rosa): não ter tido oportunidade não
                conta para a nota (o professor confirma); não ter feito vale 0. */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0 14px' }}>
              {([['nop', simples ? 'Hoje não tive oportunidade' : 'Não tive oportunidade de fazer esta hoje'],
                 ['nf', c.id.startsWith('KNW-P-F-') ? 'Não fiz' : ehConhecimento && c.manual ? 'Não sei' : ehConhecimento ? 'Não sei explicar' : 'Não fiz']] as const)
                .filter(([nv]) => !(semNop && nv === 'nop')).map(([nv, texto]) => (
                <button key={nv} onClick={() => escolher(nv)} style={{ ...estiloOpcao(v === nv),
                  ...(v === nv ? {} : { border:'none', background:'transparent', textDecoration:'underline',
                    color:'rgba(26,23,20,0.6)', fontWeight:600, width:'auto', padding:'10px 4px' }) }}>
                  {v === nv && radio(true)}
                  {texto}
                </button>
              ))}
            </div>
            {v === 'nop' && (
              <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', lineHeight:1.5, marginTop:2 }}>
                Esta não conta para a nota de hoje e volta noutra aula. O professor confirma.
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Trabalho sobre o manual: o tema que o aluno escolheu ── */}
      {passo.tipo === 'tema' && (
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, lineHeight:1.3 }}>
            Que tema do manual escolheste?
          </div>
          <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', margin:'6px 0 12px', lineHeight:1.5 }}>
            Escolhe o conteúdo que trabalhaste{ctxAula.equipa ? ' com o teu grupo' : ''}. A seguir dizes o que já sabes dele.
          </div>
          {regras.temasPossiveis.map(({ capitulo: c }, k) => {
            const novaParte = k === 0 || regras.temasPossiveis[k - 1].capitulo.parte !== c.parte;
            return (
              <React.Fragment key={c.n}>
                {novaParte && c.parte && (
                  <div style={{ fontSize:12, fontWeight:800, letterSpacing:'0.05em', textTransform:'uppercase', color:'rgba(26,23,20,0.5)', margin:'12px 0 6px' }}>
                    {c.parte}
                  </div>
                )}
                <button onClick={() => { const n = temaEscolhido === c.n ? null : c.n; setTemaEscolhido(n); marcarTemaNoGrupo(plano.id, aluno.id, n); }} style={estiloOpcao(temaEscolhido === c.n)}>
                  {radio(temaEscolhido === c.n)}
                  <span><span style={{ color:'rgba(26,23,20,0.5)' }}>{c.n}. </span>{c.titulo}</span>
                </button>
              </React.Fragment>
            );
          })}
          {/* No mesmo grupo, o mesmo tema (Rosa, out/2026). */}
          {(() => {
            const colegas = temasDosColegas(plano.id, aluno.id);
            const outro = colegas.find(x => x.tema !== temaEscolhido);
            if (!outro || temaEscolhido == null) return null;
            const cap = regras.temasPossiveis.find(t => t.capitulo.n === outro.tema)?.capitulo;
            return (
              <div style={{ marginTop:14, padding:'12px 14px', borderRadius:12, background:'#fdf0ef', border:'2px solid #c0392b' }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#8e2418' }}>
                  O teu colega {outro.nome} escolheu outro tema: {outro.tema}. {cap?.titulo || ''}
                </div>
                <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.75)', marginTop:4, lineHeight:1.5 }}>
                  No mesmo grupo, o tema é o mesmo. Tens a certeza do tema que escolheste? Se não estiver certo, fala com o professor.
                </div>
                {cap && (
                  <button onClick={() => { setTemaEscolhido(outro.tema); marcarTemaNoGrupo(plano.id, aluno.id, outro.tema); }}
                    style={{ marginTop:10, padding:'9px 14px', borderRadius:10, border:'1px solid #c0392b', background:'#fff', color:'#c0392b',
                      fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    Escolher o mesmo tema do {outro.nome}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Não teve oportunidade em nenhuma técnica: o que fez, então ── */}
      {passo.tipo === 'outra' && (
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:800, lineHeight:1.3 }}>
            Disseste que não tiveste oportunidade de fazer nenhuma das técnicas. O que fizeste hoje na cozinha?
          </div>
          <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', margin:'6px 0 10px', lineHeight:1.5 }}>
            Alguma coisa fizeste: escreve o quê (por exemplo, «descasquei e cortei as batatas para a sopa»).
            O professor lê e dá a nota. Conta como a técnica de hoje.
          </div>
          <textarea value={outraTarefa} onChange={e => setOutraTarefa(e.target.value)} rows={3} maxLength={300}
            style={{ width:'100%', boxSizing:'border-box', padding:10, borderRadius:10, border:`1.5px solid ${T.border}`,
              fontSize:14.5, fontFamily:'inherit' }} />
          {!outraTarefaOk && (
            <div style={{ fontSize:13, color:T.copper, marginTop:4 }}>Escreve pelo menos uma frase.</div>
          )}
        </div>
      )}

      {/* ── Higiene e segurança alimentar ── */}
      {passo.tipo === 'haccp' && (
        <div>
          {/* A higiene pessoal não se pergunta aqui: foi verificada à
              entrada, com os itens da farda à frente. */}
          <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800 }}>Higiene e segurança alimentar</div>
          <div style={{ fontSize:14, color:'rgba(26,23,20,0.7)', marginTop:4, lineHeight:1.5 }}>
            Registos no KitchenFlow, temperaturas, contaminações. É obrigatória.
          </div>
          {rotuloSecao('Como correu hoje?')}
          {/* A mesma ordem das técnicas (do mais fraco ao melhor, e o «não fiz»
              à parte), sem números: o aluno escolhe o que fez, não a nota. */}
          {OPCOES.filter(op => op.v !== 'nf').map(op => (
            <button key={op.v} onClick={() => setNivelHaccp(op.v)} style={estiloOpcao(nivelHaccp === op.v)}>
              {radio(nivelHaccp === op.v)}
              <span>{op.label}</span>
            </button>
          ))}
          <button onClick={() => setNivelHaccp('nf')} style={{ ...estiloOpcao(nivelHaccp === 'nf'),
            ...(nivelHaccp === 'nf' ? {} : { border:'none', background:'transparent', textDecoration:'underline',
              color:'rgba(26,23,20,0.6)', fontWeight:600, width:'auto', padding:'10px 4px' }) }}>
            {nivelHaccp === 'nf' && radio(true)}
            Ainda não fiz
          </button>
          {nivelHaccp && hsaSemRegisto() && (
            <div style={{ marginTop:4, padding:'10px 12px', borderRadius:10, fontSize:13.5, lineHeight:1.5,
              background:T.copperP, color:'#8a4a15' }}>
              Não encontrei registo teu no KitchenFlow para esta aula. Mesmo que tenhas feito
              tudo bem, fica no nível mais baixo até haver registo. O professor decide.
            </div>
          )}
        </div>
      )}

      {/* ── Aula atitudinal: uma atitude marcada pelo professor ── */}
      {passo.tipo === 'atiAula' && (() => {
        const id = passo.atiId!;
        const primeira = passos.findIndex(p => p.tipo === 'atiAula') === idx;
        return (
          <div>
            {/* No evento, o que se avalia é o esforço e o compromisso — diz-se logo no início. */}
            {ehDeEvento && primeira && (
              <div style={{ marginBottom:14, padding:'12px 14px', borderRadius:12, background:'#f3f0f7',
                fontSize:14.5, lineHeight:1.55, color:'#2A1745' }}>
                <b>Aqui o que conta é o teu esforço e o teu compromisso</b> — se treinaste, se chegaste a horas,
                se vieste preparado e se ficaste até ao fim. Responde com verdade: o professor também viu.
              </div>
            )}
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:V }}>
              {ehDeEvento ? 'O teu compromisso no evento' : 'Atitude desta aula'}
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, marginTop:2 }}>
              {ATITUDES.find(x => x.id === id)?.nome ?? 'Atitude'}
            </div>
            {perguntasAtitude(id)}
          </div>
        );
      })()}

      {/* ── Evento: técnica geral. Um cenário concreto, e o aluno sabe que
          o chef também responde — assim não se dá 5 a si próprio de caras. ── */}
      {passo.tipo === 'tecEvento' && (
        <div>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:V }}>
            Técnica no evento
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:800, lineHeight:1.3, marginTop:4 }}>
            Se amanhã o chef te pusesse sozinho/a a fazer exatamente o mesmo que fizeste no evento, sem ninguém para ajudar, o que acontecia?
          </div>
          <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', margin:'6px 0 10px' }}>
            O chef também responde a esta pergunta sobre ti.
          </div>
          {OPCOES_TEC_EVENTO.map(o => (
            <button key={o.nota} onClick={() => setTecEvento(o.nota)} style={estiloOpcao(tecEvento === o.nota)}>
              <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, boxSizing:'border-box',
                border: tecEvento === o.nota ? `6px solid ${V}` : '2px solid #CFC6DB' }} />
              {o.texto}
            </button>
          ))}
          {rotuloSecao('O que é que correu menos bem na tua parte?')}
          <textarea value={tecMenosBem} onChange={e => setTecMenosBem(e.target.value)} rows={3}
            placeholder="Há sempre alguma coisa. Escreve o que farias diferente."
            style={{ width:'100%', boxSizing:'border-box', padding:10, borderRadius:10, border:`1.5px solid ${T.border}`,
              fontSize:14.5, fontFamily:'inherit' }} />
        </div>
      )}

      {/* ── A atitude que o aluno se propõe ── */}
      {passo.tipo === 'atitude' && (
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, lineHeight:1.25, marginBottom:10 }}>
            Em que atitude trabalhaste hoje?
          </div>
          {/* Não é recuperação — essa palavra fica só para faltas acima de
              10% ou módulo terminado sem positiva. */}
          {atitudesEmRecup.length > 0 && (
            <div style={{ marginBottom:12, padding:'10px 12px', borderRadius:10, background:T.copperP,
              fontSize:13.5, color:'#8a4a15', lineHeight:1.5 }}>
              {atitudesEmRecup.map((id: string) => (
                <div key={id}><strong>{getAtitudeDetalhada(id)?.nome ?? 'Atitude'}:</strong> da última vez ficaste
                  abaixo de 3. {dicaRecuperacaoAtitude(id, 1)}</div>
              ))}
            </div>
          )}
          {blocoAtitude(
            opcoesAtitude.map(a => ({ id: a.id, nome: a.nome, etiqueta: porqueAtitude(a.id) })),
            atitudeEscolhida, setAtitudeEscolhida)}
          {!verTodasAtitudes && (
            <button onClick={() => setVerTodasAtitudes(true)} style={{ background:'transparent', border:'none',
              padding:'10px 4px', fontSize:14, color:V, fontWeight:700, cursor:'pointer',
              fontFamily:'inherit', textDecoration:'underline' }}>
              Quero propor outra atitude
            </button>
          )}
        </div>
      )}

      {/* ── Turmas ACP: uma atitude dos anos anteriores ── */}
      {passo.tipo === 'apanhar' && (() => {
        const mostrar = verTodasApanhar ? faltamApanhar : faltamApanhar.slice(0, MAX_ATITUDES_MOSTRADAS);
        const anos = [...new Set(faltamApanhar.map(x => x.ano))].sort().map(n => `${n}º`).join(' e ');
        return (
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, lineHeight:1.25 }}>
              Apanha uma do {anos} ano
            </div>
            <div style={{ fontSize:14, color:'rgba(26,23,20,0.65)', margin:'4px 0 12px', lineHeight:1.5 }}>
              Ainda te faltam {faltamApanhar.length}. Escolhe uma que reconheces em ti hoje, ou passa à frente.
            </div>
            {blocoAtitude(
              mostrar.map(x => ({ id: x.id, nome: x.nome, etiqueta: `${x.ano}º ano` })),
              atitudeApanhar, setAtitudeApanhar)}
            {!verTodasApanhar && faltamApanhar.length > mostrar.length && (
              <button onClick={() => setVerTodasApanhar(true)} style={{ background:'transparent', border:'none',
                padding:'10px 4px', fontSize:14, color:V, fontWeight:700, cursor:'pointer',
                fontFamily:'inherit', textDecoration:'underline' }}>
                Ver as {faltamApanhar.length} que faltam
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Colaborativo, Criativo e Consciente: uma pergunta por ecrã ── */}
      {/* Sem números: o aluno escolhe a frase que o descreve. */}
      {passo.tipo === 'triagem' && (() => {
        const q = perguntasTriagem.find(x => x.chave === passo.chave)!;
        const r = triagem[q.chave] ?? null;
        const idDe = (chave: string, t: Triagem5C) => chave === 'cl' ? (t.clId || 'cl01') : chave === 'co' ? (t.coId || '') : (t.crId || '');
        const campoId = q.chave === 'cl' ? 'clId' : q.chave === 'co' ? 'coId' : 'crId';
        const antes = triagem.semAntes?.[q.chave] || [];
        // «Não aconteceu»: aparece logo outra pergunta, uma que acontece sempre.
        const escolher = (v: number | 'sem') => {
          if (v === 'sem') {
            const vistas = [...antes, idDe(q.chave, triagem)];
            const nova = perguntaSeguinte(q.chave, vistas, !ctxAula.producao);
            setTriagem(t => ({ ...t, [q.chave]: null, [campoId]: nova.id, semAntes: { ...(t.semAntes || {}), [q.chave]: vistas } }));
            return;
          }
          setTriagem(t => ({ ...t, [q.chave]: t[q.chave] === v ? null : v }));
        };
        const voltarAtras = () => setTriagem(t => ({ ...t, [q.chave]: null, [campoId]: antes[antes.length - 1],
          semAntes: { ...(t.semAntes || {}), [q.chave]: antes.slice(0, -1) } }));
        const anterior = antes.length ? perguntaPorId(antes[antes.length - 1]) : undefined;
        return (
          <div>
            {anterior && (
              <div style={{ marginBottom:12, padding:'10px 12px', borderRadius:10, background:'#f3f0f7', fontSize:13.5, lineHeight:1.5 }}>
                Disseste que hoje não aconteceu: «{simples ? anterior.perguntaSimples : anterior.pergunta}»
                Então responde a esta, que acontece em todas as aulas.
                <button onClick={voltarAtras} style={{ display:'block', marginTop:4, background:'none', border:'none', padding:0,
                  color:V, fontWeight:700, textDecoration:'underline', cursor:'pointer', fontFamily:'inherit', fontSize:13.5 }}>
                  Afinal aconteceu: voltar à pergunta anterior
                </button>
              </div>
            )}
            <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, lineHeight:1.3 }}>
              {simples ? q.perguntaSimples : q.pergunta}
            </div>
            <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', margin:'6px 0 14px', lineHeight:1.5 }}>
              Escolhe o que fizeste hoje. O professor confirma.
            </div>
            {(simples ? q.frasesSimples : q.frases).map((fr, i) => (
              <button key={i} onClick={() => escolher(i)} style={estiloOpcao(r === i)}>
                {radio(r === i)}
                {fr}
              </button>
            ))}
            {/* O professor disse que hoje se trabalha com os colegas: não há «era individual». */}
            {(simples ? q.semOcasiaoSimples : q.semOcasiao) && !(q.chave === 'cl' && ctxAula.definido && ctxAula.colegas) && (
              <button onClick={() => escolher('sem')} style={{ ...estiloOpcao(r === 'sem'), fontStyle:'italic' }}>
                {radio(r === 'sem')}
                {simples ? q.semOcasiaoSimples : q.semOcasiao}
              </button>
            )}
            {q.chave === 'cr' && (
              <>
                {rotuloSecao(simples ? 'O que foi mais difícil hoje?' : 'O que foi mais difícil hoje e o que fizeste?')}
                <textarea value={triagem.problema || ''} maxLength={200} rows={3}
                  onChange={e => setTriagem(t => ({ ...t, problema: e.target.value }))}
                  placeholder={simples ? 'Se quiseres, escreve aqui' : 'Se quiseres, escreve aqui (opcional)'}
                  style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:10,
                    border:`1.5px solid ${T.border}`, fontSize:14.5, fontFamily:'inherit', resize:'vertical', background:'#fff' }} />
              </>
            )}
          </div>
        );
      })()}

      {/* ── Rever e enviar ── */}
      {passo.tipo === 'rever' && (
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800 }}>Rever antes de enviar</div>
          <div style={{ fontSize:13.5, color:'rgba(26,23,20,0.6)', margin:'2px 0 12px' }}>Toca numa linha para mudar.</div>
          <div style={{ background:'#fff', borderRadius:14, border:`1px solid ${T.border}`, overflow:'hidden' }}>
            {linhasRever.map((l, i) => (
              <button key={i} onClick={() => irPara(l.passo)} style={{ width:'100%', display:'flex',
                alignItems:'center', gap:10, textAlign:'left', padding:'12px 14px', border:'none',
                borderBottom: i < linhasRever.length - 1 ? `1px solid ${T.border}` : 'none',
                background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                <span style={{ flex:1, minWidth:0 }}>
                  <span style={{ display:'block', fontSize:14.5, fontWeight:700 }}>{l.nome}</span>
                  <span style={{ display:'block', fontSize:12.5, color:'rgba(26,23,20,0.6)', marginTop:1 }}>{l.resposta}</span>
                </span>
                {/* Sem números durante a autoavaliação: só se está respondido. */}
                {circulo(l.nota != null ? '✓' : '—', false)}
              </button>
            ))}
          </div>

          {nivelHaccp && hsaSemRegisto() && (
            <div style={{ marginTop:12, padding:'10px 12px', borderRadius:10, background:T.copperP,
              fontSize:13.5, color:'#8a4a15', lineHeight:1.5 }}>
              <strong>Higiene e segurança alimentar:</strong> não encontrei o teu registo no KitchenFlow.
              Fica a 1 até haver registo. O professor decide.
            </div>
          )}

          {/* Sem nota antes de enviar: o aluno ia mexer nas respostas só
              para a fazer subir. Vê a proposta depois de enviar. */}
          <div style={{ marginTop:12, padding:'10px 12px', borderRadius:10, border:'1px dashed #CFC6DB',
            fontSize:13.5, color:'rgba(26,23,20,0.65)', lineHeight:1.5 }}>
            A nota só aparece depois de enviares. Responde pelo que fizeste, não pela nota.
          </div>

          {/* O que falta, pelo nome, e um toque leva lá. Antes dizia só
              «escolhe uma frase em cada atitude» — e se o professor tinha
              acrescentado uma atitude a meio, o aluno não sabia qual era. */}
          {!prontoParaSubmeter && (
            <div style={{ marginTop:12, padding:'10px 12px', background:T.copperP, borderRadius:10,
              fontSize:13.5, color:T.copper }}>
              <div style={{ fontWeight:700, marginBottom:6 }}>Para poderes enviar, falta responder:</div>
              {passos.map((p, i) => {
                const falta = (p.tipo === 'atiAula' && !atiOk(p.atiId!))
                  || (p.tipo === 'outra' && !outraTarefaOk)
                  || (p.tipo === 'atitude' && atitudeObrigatoria && !atitudeRespondida)
                  || (p.tipo === 'tecEvento' && !tecEventoFeito)
                  || (p.tipo === 'haccp' && nivelHaccp === null)
                  || (p.tipo === 'triagem' && !triagemFeita(p.chave!));
                if (!falta) return null;
                const nome = p.tipo === 'atiAula'
                  ? (ATITUDES.find(x => x.id === p.atiId)?.nome || p.atiId)
                  : tituloPasso(p);
                return (
                  <button key={p.id} onClick={() => irPara(i)} style={{ display:'block', width:'100%',
                    textAlign:'left', padding:'9px 12px', marginTop:6, borderRadius:9, cursor:'pointer',
                    border:`1.5px solid ${T.copper}`, background:'#fff', color:T.copper,
                    fontSize:14, fontWeight:700, fontFamily:'inherit' }}>
                    {nome} — responder →
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={submeterDefinitivo} disabled={!prontoParaSubmeter || submetido} style={{
            width:'100%', marginTop:14, minHeight:54, borderRadius:12, border:'none', fontSize:17, fontWeight:700,
            fontFamily:'inherit', background: prontoParaSubmeter ? T.sage : 'rgba(26,23,20,0.08)',
            color: prontoParaSubmeter ? '#fff' : 'rgba(26,23,20,0.3)',
            cursor: prontoParaSubmeter ? 'pointer' : 'not-allowed' }}>
            Enviar ao professor
          </button>
          <div style={{ fontSize:12.5, color:'rgba(26,23,20,0.55)', textAlign:'center', marginTop:6 }}>
            Depois de enviar já não podes mudar.
          </div>

          <div style={{ marginTop:20 }}>
            <PercursoUC aluno={aluno} ucId={ucId} semNotas />
          </div>
        </div>
      )}

      {/* Anterior / Seguinte — sempre à vista, em baixo do ecrã. */}
      {passo.tipo !== 'rever' && (
        <div style={{ display:'flex', gap:10, marginTop:18, position:'sticky', bottom:0,
          background:FUNDO_ECRA, padding:'10px 0 max(10px, env(safe-area-inset-bottom))' }}>
          {idx > 0 && (
            <button onClick={() => irPara(idx - 1)} style={{ minHeight:52, padding:'0 18px', borderRadius:12,
              border:`1px solid ${T.border}`, background:'#fff', color:'rgba(26,23,20,0.7)',
              fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Anterior
            </button>
          )}
          <button onClick={() => irPara(idx + 1)} disabled={!podeAvancar} style={{ flex:1, minHeight:52,
            borderRadius:12, border:'none', fontSize:16.5, fontWeight:700, fontFamily:'inherit',
            background: podeAvancar ? V : 'rgba(26,23,20,0.08)', color: podeAvancar ? '#fff' : 'rgba(26,23,20,0.3)',
            cursor: podeAvancar ? 'pointer' : 'not-allowed' }}>
            {passos[idx + 1]?.tipo === 'rever' ? 'Rever antes de enviar' : 'Seguinte'}
          </button>
        </div>
      )}
    </div>
    </EcraCheio>
  );
}
