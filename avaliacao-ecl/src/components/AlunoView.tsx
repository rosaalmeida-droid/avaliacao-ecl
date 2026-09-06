import React, { useState, useRef, useEffect } from 'react';
import { ModalFullscreen } from './ModalFullscreen';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
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
import { Aluno, PlanoAula, FichaProducao, INICIATIVA_FRASES, calcularNotaPlano, PESOS_AULA } from '../types';
import {
  getPlanosAulaPorTurma, getFichasPorPlano, getRequisicaoPorPlano,
  getDistribuicoesPorPlano, getChecklistAlunoFicha, addOrUpdateChecklistAluno,
  addOrUpdateSelecao, getHistoricoAlunoMicro, addRegistoAvaliacao, addRegistoPresenca,
  getHistoricoAluno, registarHigieneKitchenFlow, registarTemperaturaKitchenFlow,
  registarNaoConformidadeKitchenFlow, abrirKitchenFlow, KITCHENFLOW_APP_URL, getPresencas,
  sincronizarEvidenciasKitchenFlow, extrairRegistosObrigatorios, EvidenciaKitchenFlow,
  sincronizarDoSheets, calcularPontosRegularidade, getSelecoes, getValidacoes,
  addAviso, getAtividades, inscreverEmAtividade, registarBalancoAtividade,
} from '../backend';
import {
  MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS, PARAMETROS_AVALIACAO,
  microsPorUC, microsPorFamilia, jaTeveSucesso, estaEmRegressao,
  encontrarAparelho, encontrarSubtecnica, aparelhosPermitidos,
  nomeCompetencia, encontrarConhecimento, dicaRecuperacaoAtitude, nivelComplexidadeAtitude, getAtitudeDetalhada,
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
import { PainelAluno, DestinoAluno, CabecalhoEcra, IconesFarda, CORES } from './PainelAluno';
import { ManuaisAluno } from './ManuaisAluno';
import { EcraAvaliarMe, EcraNotaProgressiva } from './EcrasPercurso';
import { EcraMinhaNota, EcraAtividades } from './EcraNotaAtividades';
import { estadoDoNivel, opcoesDeEscolhaDoAluno } from '../motorAvaliacao';
import { FRASES_ATITUDES, NOTAS_FRASES } from '../frases_atitudes';
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
      background:bg, color:cor, fontSize:12, fontWeight:700, letterSpacing:'0.02em' }}>
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
          <div key={d} style={{ textAlign:'center', padding:'8px 0', fontSize:11,
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

          return (
            <div key={dia}
              onClick={() => aulas.length && onAbrirPlano(aulas[0])}
              style={{
                position:'relative', aspectRatio:'1', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', borderRadius:12,
                cursor: temAula ? 'pointer' : 'default',
                background: eHoje ? T.copper : temAula ? T.sageP : 'transparent',
                border: eHoje ? `2px solid ${T.copper}` : temAula ? `1.5px solid ${T.sage}40` : 'none',
                transition:'all 0.15s',
              }}>
              <span style={{ fontSize:15, fontWeight: eHoje||temAula ? 700 : 400,
                color: eHoje ? '#fff' : temAula ? T.sage : 'rgba(26,23,20,0.5)' }}>
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
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'rgba(26,23,20,0.5)' }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:T.copper, display:'inline-block' }}/>
          Hoje
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'rgba(26,23,20,0.5)' }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:T.sage, display:'inline-block' }}/>
          Aula
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE — Card de aula na lista
// ─────────────────────────────────────────────────────────────
function CardAula({ plano, onAbrir }: { plano: PlanoAula; onAbrir: () => void }) {
  const hoje = isHoje(plano.data);
  const futuro = isFuturo(plano.data);
  const dias = diasParaData(plano.data);
  const d = parseDataSegura(plano.data) || new Date();

  // Card de aula passada — compacto
  if (!hoje && !futuro) {
    return (
      <div onClick={onAbrir} style={{
        display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
        borderRadius:14, background:'#fff',
        border:'1px solid rgba(26,23,20,0.08)',
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
          <div style={{ fontSize:12, fontWeight:600, color:'rgba(26,23,20,0.55)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {plano.numeroPlan ? rotuloPlano(plano) : (plano.titulo || 'Plano de aula')}
          </div>
          {(plano.ucId || plano.ucNome) && (
            <div style={{ fontSize:12.5, color:T.copper, fontWeight:700, marginTop:2 }}>{ucAncora(plano.ucId, plano.ucNome)}</div>
          )}
        </div>
        <ChipEstado texto="Passada" cor="rgba(26,23,20,0.4)" bg="rgba(26,23,20,0.06)" />
        <span style={{ fontSize:18, color:'rgba(26,23,20,0.2)', flexShrink:0 }}>›</span>
      </div>
    );
  }

  // Card de aula de hoje ou futura — grande e colorido
  const corFundo = hoje ? T.copper : '#2563eb';
  const diasLabel = dias === 1 ? 'AMANHÃ' : dias <= 7 ? `em ${dias} dias` : '';

  return (
    <div onClick={onAbrir} style={{
      borderRadius:20, overflow:'hidden', cursor:'pointer', marginBottom:12,
      boxShadow: hoje ? '0 8px 24px rgba(181,101,29,0.35)' : '0 4px 16px rgba(37,99,235,0.2)',
    }}>
      {/* Faixa colorida */}
      <div style={{ background:`linear-gradient(135deg, ${corFundo}, ${corFundo}dd)`,
        padding:'16px 18px' }}>
        {hoje && (
          <div style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.65)',
            textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:4 }}>
            🔥 Aula de hoje
          </div>
        )}
        {!hoje && diasLabel && (
          <div style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.65)',
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
        {plano.horaInicio && (
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>
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
function PercursoUC({ aluno, ucId }: { aluno: { id:string; turmaId:string }; ucId: string }) {
  if (!ucId) return null;
  const planos = getPlanosAulaPorTurma(aluno.turmaId)
    .filter(p => p.ucId === ucId && p.estado !== 'arquivado')
    .sort((a,b) => String(a.data||'').localeCompare(String(b.data||'')));
  if (planos.length === 0) return null;
  const selecoes = getSelecoes().filter(s => s.alunoId === aluno.id);
  const validacoes = getValidacoes().filter(v => v.alunoId === aluno.id);
  const linhas = planos.map(p => {
    const sel = selecoes.find(s => s.planoAulaId === p.id);
    const val = sel ? validacoes.find(v => (v as any).selecaoId === sel.id) : undefined;
    const estado = val ? 'validado' : (sel ? 'aguarda' : 'por_avaliar');
    const nota20 = val ? ((val as any).notaMedia20 != null ? (val as any).notaMedia20 : null) : null;
    return { p, estado, nota20 };
  });
  const validados = linhas.filter(l => l.estado === 'validado').length;
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--copper)' }}>O meu percurso nesta UC</div>
        <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)' }}>{validados} de {planos.length} validados</div>
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
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)' }}>{dataCurtaPU(p.data)}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:st.texto }}>{st.etiqueta}</span>
                  {estado === 'validado' && nota20 != null && (
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

export function AlunoView({ aluno }: { aluno: Aluno }) {
  const [planoAtivo, setPlanoAtivo] = useState<PlanoAula | null>(null);
  const [aba, setAba] = useState<'hoje' | 'calendario' | 'perfil'>('hoje');
  const [destino, setDestino] = useState<DestinoAluno | null>(null);
  const [mesVisivel, setMesVisivel] = useState(new Date().getMonth());
  const [anoVisivel, setAnoVisivel] = useState(new Date().getFullYear());
  const [planos, setPlanos] = useState<PlanoAula[]>(() =>
    getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado')
  );

  useEffect(() => {
    sincronizarDoSheets(aluno.turmaId).then(() => {
      setPlanos(getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado'));
    }).catch(() => {});
  }, [aluno.turmaId]);

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
      return { id, nome: r.replace(/\.$/, ''), nivel };
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

  const conhecimentosDaUC = (() => {
    const ref = ucAtual ? getReferencialUC(ucAtual) : undefined;
    const lista = ref?.conhecimentos?.length ? ref.conhecimentos : ref?.criteriosDesempenho;
    if (!lista?.length) return [];
    return lista.map((c, i) => {
      const id = `${ucAtual}_C${i + 1}`;
      return { id, nome: c.replace(/\.$/, ''), nivel: nivelDe(id) };
    });
  })();

  const atitudesDaUC = ATITUDES
    .filter(at => opcoesDeEscolhaDoAluno(aluno.ano ?? 1).includes(at.id))
    .map(at => ({ id: at.id, nome: at.nome, nivel: nivelDe(at.id) }));

  // Aulas marcadas a partir de hoje — o aluno tem de as ver sem
  // depender do calendário.
  const hojeISO = new Date().toISOString().slice(0, 10);
  const aulasFuturas = planosOrdenados.filter(p => p.data >= hojeISO && p.id !== planoHoje?.id);

  const [refreshAtiv, setRefreshAtiv] = useState(0);
  const atividades = React.useMemo(
    () => getAtividades().filter(x => x.turmaId === aluno.turmaId),
    [aluno.turmaId, refreshAtiv]
  );
  const atividadesAbertas = atividades.filter(
    x => !x.fechada && x.data >= new Date().toISOString().slice(0, 10)
  ).length;

  const tudoAvaliavel = [...competenciasDaUC, ...conhecimentosDaUC, ...atitudesDaUC];
  const porAvaliar = tudoAvaliavel.filter(c => estadoDoNivel(c.nivel) === 'por_avaliar').length;
  const competenciasFracas = tudoAvaliavel.filter(c => estadoDoNivel(c.nivel) === 'desenvolvimento').length;

  // Que bloco o aluno está a ver no "Avaliar-me"
  const [blocoAvaliar, setBlocoAvaliar] = useState<'realizacoes'|'conhecimentos'|'atitudes'>('realizacoes');
  const listaDoBloco = blocoAvaliar === 'realizacoes' ? competenciasDaUC
                     : blocoAvaliar === 'conhecimentos' ? conhecimentosDaUC
                     : atitudesDaUC;

  // Nota progressiva: média das aulas já validadas nesta UC
  const validacoesAluno = getSelecoes()
    .filter(s => s.alunoId === aluno.id)
    .map(s => {
      const v = getValidacoes().find(x => (x as any).selecaoId === s.id);
      const plano = planos.find(p => p.id === s.planoAulaId);
      return { plano, nota20: v ? ((v as any).notaMedia20 ?? null) : null, validada: !!v };
    })
    .filter(x => x.plano);

  const notasValidas = validacoesAluno.map(v => v.nota20).filter((n): n is number => n != null);
  const notaProgressiva = notasValidas.length
    ? Math.round((notasValidas.reduce((s, n) => s + n, 0) / notasValidas.length) * 10) / 10
    : null;

  // Módulos com nota negativa = por recuperar
  const recuperacoesPendentes = validacoesAluno
    .filter(v => v.validada && v.nota20 != null && v.nota20 < 10).length;

  const historialUC = validacoesAluno
    .sort((a, b) => (b.plano!.data).localeCompare(a.plano!.data))
    .map(v => ({
      planoId: v.plano!.id,
      titulo: v.plano!.titulo || 'Aula',
      data: fmtDataCurta(v.plano!.data),
      numeroAula: planosOrdenados.findIndex(p => p.id === v.plano!.id) + 1,
      nota20: v.nota20,
      validada: v.validada,
    }));

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>

      {/* Plano de aula aberto — mostra-se num modal quase-fullscreen por
          cima do ecrã do aluno, em vez de o substituir por completo. */}
      {planoAtivo && (
        <ModalFullscreen
          titulo={planoAtivo.titulo || 'Plano de Aula'}
          subtitulo={aluno.turmaId}
          onFechar={() => setPlanoAtivo(null)}
        >
          {(() => {
            const sel = getSelecoes().find(s => s.alunoId === aluno.id && s.planoAulaId === planoAtivo.id);
            const val = sel ? getValidacoes().find(v => (v as any).selecaoId === sel.id) : undefined;
            const nota20 = val ? ((val as any).notaMedia20 ?? null) : null;
            if (nota20 == null) return null;
            const cor = nota20 >= 16 ? '#0369a1' : nota20 >= 12 ? '#5a7a4e' : nota20 >= 8 ? '#b5651d' : '#c0392b';
            return (
              <div style={{ margin:'16px 16px 0', padding:'14px 18px', borderRadius:14, background:cor+'14', border:'1.5px solid '+cor+'44', display:'flex', alignItems:'center', gap:14 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'rgba(26,23,20,0.5)' }}>Nota desta aula</div>
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)' }}>Validada pelo professor</div>
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

      {/* ── CABEÇALHO ─────────────────────────────────────── */}
      <div style={{ background:'#6d28d9', padding:'20px 20px 0' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', fontWeight:600,
                textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
                Avaliação ECL · {aluno.turmaId}
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
                    <span style={{ fontSize:11, fontWeight:700, color:'rgba(247,241,230,0.85)' }}>
                      Regularidade {LABEL[pr.nivel]} · {pr.pontos} pts
                    </span>
                  </div>
                );
              })()}
              {aluno.nivelMedidas && aluno.nivelMedidas > 1 && (
                <div style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:6,
                  padding:'4px 12px', borderRadius:100,
                  background: aluno.nivelMedidas === 3 ? 'rgba(192,57,43,0.25)' : 'rgba(181,101,29,0.25)',
                  border: `1px solid ${aluno.nivelMedidas === 3 ? 'rgba(192,57,43,0.5)' : 'rgba(181,101,29,0.5)'}` }}>
                  <span style={{ fontSize:14 }}>{aluno.nivelMedidas === 3 ? '🔴' : '🟡'}</span>
                  <span style={{ fontSize:12, fontWeight:700,
                    color: aluno.nivelMedidas === 3 ? '#ff9a9a' : '#ffd0a0' }}>
                    {aluno.nivelMedidas === 3 ? 'Medidas Adicionais (Nível 3)' : 'Medidas Seletivas (Nível 2)'}
                  </span>
                </div>
              )}
            </div>
            {/* Resumo rápido */}
            <div style={{ display:'flex', gap:10 }}>
              <div style={{ background:'rgba(247,241,230,0.08)', borderRadius:14,
                padding:'10px 16px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700,
                  color:'#faf7f2', lineHeight:1 }}>{historicoAluno.length}</div>
                <div style={{ fontSize:11, color:'rgba(247,241,230,0.45)', marginTop:3 }}>avaliações</div>
              </div>
              <div style={{ background:'rgba(247,241,230,0.08)', borderRadius:14,
                padding:'10px 16px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700,
                  color:'#faf7f2', lineHeight:1 }}>{planos.length}</div>
                <div style={{ fontSize:11, color:'rgba(247,241,230,0.45)', marginTop:3 }}>aulas</div>
              </div>
            </div>
          </div>

          {/* Tabs coloridas */}
          <div style={{ display:'flex', gap:6, paddingBottom:14 }}>
            {([
              { id:'hoje',      emoji:'🏠', label:'Início',      cor:'#f4a900' },
              { id:'calendario',emoji:'📅', label:'Calendário',  cor:'#2ec4b6' },
              { id:'perfil',    emoji:'🪪', label:'O meu perfil',cor:'#1d6fa4' },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setAba(tab.id)} style={{
                flex:1, padding:'9px 4px', border:'none', cursor:'pointer',
                fontSize:12, fontWeight:800, borderRadius:10,
                background: aba === tab.id ? tab.cor : 'rgba(255,255,255,0.15)',
                color: aba === tab.id ? '#fff' : 'rgba(255,255,255,0.55)',
                transition:'all 0.15s',
              }}>
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ──────────────────────────────────────── */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 20px 48px' }}>

        {/* ── ABA INÍCIO ── */}
        {/* ── ECRÃ INICIAL: grelha de cartões ── */}
        {aba === 'hoje' && !destino && (
          <PainelAluno
            nomeAluno={aluno.nome || `Aluno ${aluno.numero}`}
            turmaId={aluno.turmaId}
            numeroAluno={aluno.numero}
            ucId={ucAtual}
            ucNome={ucNomeOficial}
            planoHoje={planoHoje}
            numeroPlano={numeroPlanoHoje}
            totalPlanos={planosOrdenados.length}
            fichasAtribuidas={fichasAtribuidas}
            autoavaliacoesPorFazer={porAvaliar}
            notaProgressiva={notaProgressiva}
            competenciasFracas={competenciasFracas}
            recuperacoesPendentes={recuperacoesPendentes}
            proximasAulas={aulasFuturas.length}
            atividadesAbertas={atividadesAbertas}
            onAbrir={(d) => {
              if (d === 'entrar' || d === 'fichas' || d === 'guiao' || d === 'requisicao') {
                // Só se entra numa aula que exista. Sem plano de aula não há
                // onde registar nada — o professor tem de o criar primeiro.
                if (planoHoje) setPlanoAtivo(planoHoje);
                return;
              }
              if (d === 'avisar_professor') {
                addAviso({
                  tipo: 'outro',
                  titulo: 'Aula sem plano criado',
                  descricao: `${aluno.nome || `Aluno nº ${aluno.numero}`} (${aluno.turmaId}) `
                    + `quis entrar na aula de hoje e não há plano de aula criado.`,
                  contexto: { tabDestino: 'planos' },
                } as any);
                alert('O professor foi avisado de que não há plano de aula para hoje.');
                return;
              }
              if (d === 'kitchenflow') {
                abrirKitchenFlow(undefined, {
                  turma: aluno.turmaId, numero: aluno.numero,
                  pin: aluno.pin, tipo: 'aluno',
                  ucId: ucAtual,
                  planoData: planoHoje?.data,
                  planoHoraInicio: planoHoje?.horaInicio,
                  planoHoraFim: planoHoje?.horaFim,
                } as any);
                return;
              }
              if (d === 'calendario' || d === 'proximas') { setAba('calendario'); return; }
              setDestino(d);
            }}
          />
        )}

        {/* ── Ecrãs do percurso ── */}
        {aba === 'hoje' && destino && (
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
                notaPossivel={notaProgressiva != null ? Math.min(20, notaProgressiva + 2) : null}
              />
            )}

            {destino === 'atividades' && (
              <EcraAtividades
                atividades={atividades}
                alunoId={aluno.id}
                onInscrever={(id) => { inscreverEmAtividade(id, aluno.id, true); setRefreshAtiv(n => n + 1); }}
                onCancelar={(id) => { inscreverEmAtividade(id, aluno.id, false); setRefreshAtiv(n => n + 1); }}
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

            {destino === 'manual' && <ManuaisAluno />}
          </div>
        )}

        {aba === 'calendario' && (
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
                      <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                        letterSpacing:'0.06em', color:'#6B3FA0', marginBottom:10 }}>
                        Hoje
                      </div>
                      {deHoje.map(p => (
                        <CardAula key={p.id} plano={p} onAbrir={() => setPlanoAtivo(p)} />
                      ))}
                      <div style={{ height: 18 }} />
                    </>
                  )}

                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
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
        {aba === 'perfil' && (
          <div>
            <PerfilProfissionalAluno aluno={aluno} />
            <div style={{ marginTop:24 }}>
              <RecuperacaoModulosAluno aluno={aluno} />
            </div>
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
              <DicionarioComp perfil="professor" turmaId={aluno.turmaId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// VISTA DE UM PLANO — acordeão com os 4 passos
// ═════════════════════════════════════════════════════════════
function VistaDePlanoAluno({ plano, aluno, onVoltar }: {
  plano: PlanoAula; aluno: Aluno; onVoltar: () => void;
}) {
  const [secAberta, setSecAberta] = React.useState<string>('orientacao');
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
  const [fichaConcluida, setFichaConcluida] = React.useState(() => _load('ficha'));
  const [guiaoConcluido, setGuiaoConcluido] = React.useState(() => _load('guia'));
  const [avaliacaoConcluida, setAvaliacaoConcluida] = React.useState(() => {
    try { return !!localStorage.getItem(`avaliacao_submetida_${plano.id}_${aluno.id}`); } catch { return false; }
  });

  const fichas = getFichasPorPlano(plano.id);
  const requisicao = getRequisicaoPorPlano(plano.id);

  // Os passos falam com o aluno: "Entrei na aula", não "Entrada e Higiene".
  // O `agora` é o que ele lê em grande quando o passo está ativo.
  const V = '#6B3FA0';
  const PASSOS = [
    { id:'orientacao', label:'Vi o que vamos fazer',   agora:'Ver a aula',    cor:V },
    { id:'entrada',    label:'Entrei na aula',          agora:'Entrar',        cor:V },
    { id:'ficha',      label:'Produzi',                 agora:'Produzir',      cor:V },
    ...(fichas.some((f:any) => f.textoGuia)
      ? [{ id:'guia', label:'Consultei o guião', agora:'Ver o guião', cor:V }] : []),
    { id:'requisicao', label:'Fiz a requisição',        agora:'Requisitar',    cor:V },
    { id:'avaliacao',  label:'Avaliei-me',              agora:'Avaliar-me',    cor:V },
  ];

  const estadoPasso = (id: string): 'concluido'|'ativo'|'pendente' => {
    if (id==='orientacao' && orientacaoConcluida) return 'concluido';
    if (id==='entrada' && entradaConcluida) return 'concluido';
    if (id==='ficha' && fichaConcluida) return 'concluido';
    if (id==='guia' && guiaoConcluido) return 'concluido';
    if (id==='requisicao' && requisicao) return 'concluido';
    if (id==='avaliacao' && avaliacaoConcluida) return 'concluido';
    if (id===secAberta) return 'ativo';
    return 'pendente';
  };

  const totalPassos = PASSOS.length;
  const passosConcluidos = PASSOS.filter(p => estadoPasso(p.id) === 'concluido').length;
  const pctProgresso = Math.round(passosConcluidos / totalPassos * 100);
  const passoActivo = PASSOS.find(p => p.id === secAberta);

  return (
    <div style={{ height:'100vh', background:'#f0f4f8', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* TOPO */}
      <div style={{ background:'linear-gradient(135deg,#1a1714,#2d2520)',
        padding:'10px 14px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={onVoltar} style={{ background:'rgba(255,255,255,0.1)',
            border:'none', borderRadius:9, padding:'7px 12px',
            color:'rgba(247,241,230,0.8)', fontSize:13, cursor:'pointer',
            fontWeight:700, flexShrink:0 }}>←</button>
          <div style={{ flex:1, minWidth:0 }}>
            {plano.ucId && (
              <div style={{ fontSize:12.5, color:'rgba(247,241,230,0.55)', marginBottom:2,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {plano.ucId}{plano.ucNome ? ` · ${plano.ucNome}` : ''}
              </div>
            )}
            <div style={{ fontSize:17, fontWeight:800, color:'#faf7f2', lineHeight:1.25,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {plano.titulo}
            </div>
            <div style={{ fontSize:13, color:'rgba(247,241,230,0.5)', marginTop:2 }}>
              {fmtData(plano.data)}{plano.horaInicio && ` · ${plano.horaInicio}–${plano.horaFim}`}
            </div>
          </div>
          <div style={{ background: pctProgresso===100 ? '#22c55e' : 'rgba(255,255,255,0.12)',
            borderRadius:100, padding:'5px 11px', flexShrink:0 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>
              {pctProgresso===100 ? '🎉' : `${passosConcluidos}/${totalPassos}`}
            </div>
          </div>
        </div>
      </div>

      {/* CORPO — um passo de cada vez.
          A fita horizontal de separadores obrigava o aluno a perceber um
          mapa antes de fazer o que quer que fosse. Passa a haver uma
          frase que lhe diz o que fazer agora, um botão principal só, e a
          lista dos passos em baixo para saber onde está. */}
      <div style={{ flex:1, overflowY:'auto', background:'#F3F2F5', minHeight:0 }}>
        <div style={{ padding:14, maxWidth:640, margin:'0 auto' }}>

          {/* Barra de progresso: vê-se em meio segundo quantos faltam. */}
          <div style={{ background:'#6B3FA0', borderRadius:16, padding:'15px 17px', marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
              <div style={{ fontSize:13, color:'#DCCFF0', overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {plano.ucId}{plano.ucNome ? ` · ${plano.ucNome}` : ''}
              </div>
              <div style={{ fontSize:13, color:'#DCCFF0', flexShrink:0 }}>
                {new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:'#fff', marginTop:5, lineHeight:1.25 }}>
              {plano.titulo}
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

              {/* A ficha do aluno fica sempre à vista: não tem de se
                  lembrar do que lhe calhou. */}
              {fichas.length > 0 && (secAberta==='ficha' || secAberta==='guia') && (
                <div style={{ background:'#FAF9FB', borderRadius:12, padding:14, marginTop:15 }}>
                  <div style={{ fontSize:13, color:'#777', marginBottom:5 }}>
                    {fichas.length === 1 ? 'A tua ficha' : 'As tuas fichas'}
                  </div>
                  {fichas.map((f:any) => (
                    <div key={f.id} style={{ fontSize:17, fontWeight:600, color:'#1A1A1A' }}>
                      {f.nomePrato}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => abrirKitchenFlow(undefined, {
              turma:aluno.turmaId, numero:aluno.numero,
              pin:aluno.pin, tipo:'aluno',
              ucId:plano.ucId, ucNome:plano.ucNome,
              pratos:fichas.map((f:any) => f.nomePrato).filter(Boolean),
              planoHoraInicio:plano.horaInicio,
              planoHoraFim:plano.horaFim, planoData:plano.data,
            })} style={{ width:'100%', padding:'11px', borderRadius:11, marginBottom:16,
            border:'1px solid rgba(14,116,144,0.4)', background:'rgba(14,116,144,0.08)',
            color:'#0e7490', fontSize:14, fontWeight:700, cursor:'pointer',
            fontFamily:'inherit' }}>
            🔗 Abrir KitchenFlow
          </button>

            {secAberta==='orientacao' && (
              <PainelOrientacao plano={plano} fichas={fichas} aluno={aluno}
                onContinuar={() => { setOrientacaoConcluida(true); _save('orientacao'); setSecAberta('entrada'); }} />
            )}
            {secAberta==='entrada' && (
              <SecaoEntrada aluno={aluno} plano={plano}
                onConcluido={() => { setEntradaConcluida(true); _save('entrada'); setSecAberta('ficha'); }} />
            )}
            {secAberta==='ficha' && (
              <SecaoFichas fichas={fichas} plano={plano} aluno={aluno}
                onConcluido={() => { setFichaConcluida(true); _save('ficha');
                  setSecAberta(fichas.some((f:any)=>f.textoGuia) ? 'guia' : 'requisicao'); }} />
            )}
            {secAberta==='guia' && (
              <SecaoGuiao fichas={fichas} plano={plano}
                onConcluido={() => { setGuiaoConcluido(true); _save('guia'); setSecAberta('requisicao'); }} />
            )}
            {secAberta==='requisicao' && (
              <SecaoRequisicao requisicao={requisicao}
                onConcluido={() => setSecAberta('avaliacao')} />
            )}
            {secAberta==='avaliacao' && (
              <SecaoAvaliacao fichas={fichas} plano={plano} aluno={aluno}
                onConcluido={() => setAvaliacaoConcluida(true)} />
            )}

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
                  onClick={() => podeIr && setSecAberta(p.id)}
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
  // Os quadrados começam todos marcados: o aluno cumpridor confirma num
  // toque, e quem tem alguma coisa em falta desmarca só esse. Ao
  // contrário, obrigava toda a gente a nove toques.
  const [ok, setOk] = useState<Record<string, boolean>>(
    Object.fromEntries(ITENS_FARDA.map(i => [i.id, true]))
  );

  // O atraso é calculado, não perguntado — a app sabe as horas.
  const minutosAtraso = (() => {
    if (!plano.horaInicio) return 0;
    const now = new Date();
    const [h, m] = plano.horaInicio.split(':').map(Number);
    if (isNaN(h)) return 0;
    return Math.max(0, (now.getHours()*60 + now.getMinutes()) - (h*60 + m));
  })();
  const TOLERANCIA = 5;
  const atrasado = minutosAtraso > TOLERANCIA;

  const emFalta = ITENS_FARDA.filter(i => !ok[i.id]);
  const impedido = emFalta.some(i => IMPEDEM.includes(i.id));

  async function gravar() {
    if (atrasado) incHist(`ecl_atrasos_${aluno.id}`);
    const nomes = emFalta.map(i => i.label);
    const fardamentoOk = nomes.length === 0;

    addRegistoPresenca({
      alunoId: aluno.id, turmaId: aluno.turmaId, planoAulaId: plano.id,
      presente: true, atrasado, atrasadoMins: minutosAtraso, fardamentoOk,
      observacao: nomes.length ? `Assumiu à entrada — em falta: ${nomes.join(', ')}` : '',
    });

    const agora = new Date().toISOString();
    const reg = (suf: string, comp: string, nota: number) => addRegistoAvaliacao({
      id: `${plano.id}_${aluno.id}_${suf}_${Date.now()}`, alunoId: aluno.id,
      turmaId: aluno.turmaId, planoAulaId: plano.id, fichaId: '',
      ucId: plano.ucId || '', microcompetenciaId: comp, nota,
      data: agora, validadoPor: 'aluno',
    });

    // Pontualidade e apresentação são independentes: uma não mascara a outra.
    reg('pont', 'OBR_03', !atrasado ? 5 : minutosAtraso >= 20 ? 2 : 3);
    // Apresentação: impeditivo vai ao mínimo; o resto desce por item.
    reg('farda', 'OBR_01', impedido ? 1 : Math.max(1, 5 - nomes.length));
    // Assumir a falha é a ATI-001 — é a atitude que se pede.
    if (nomes.length) reg('resp', 'ATI-001', 3);

    registarHigieneKitchenFlow(
      aluno.turmaId, aluno.id, aluno.nome || `Aluno ${aluno.numero}`, fardamentoOk
    ).catch(() => {});
    onConcluido();
  }

  const V = '#6B3FA0', VS = '#F0EBF7';

  return (
    <div>
      {/* Hora de entrada — calculada */}
      <div style={{
        background:'#fff', borderRadius:16, padding:16, marginBottom:12,
        display:'flex', alignItems:'center', gap:13,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          width:44, height:44, borderRadius:'50%', flexShrink:0,
          background: atrasado ? '#FDF0E8' : '#E8F3E5',
          display:'flex', alignItems:'center', justifyContent:'center',
          color: atrasado ? '#B5651D' : '#3E7A31',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </div>
        <div>
          <div style={{ fontSize:17, fontWeight:700, color:'#1A1A1A' }}>
            {atrasado ? `Chegaste ${minutosAtraso} min atrasado/a` : 'Chegaste a horas'}
          </div>
          {plano.horaInicio && (
            <div style={{ fontSize:14, color:'#666', marginTop:1 }}>
              a aula começou às {plano.horaInicio}
            </div>
          )}
        </div>
      </div>

      {/* Confirmação do fardamento */}
      <div style={{
        background:'#fff', borderRadius:16, padding:18,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize:19, fontWeight:700, color:'#1A1A1A' }}>Confirma o que tens</div>
        <div style={{ fontSize:14, color:'#777', marginTop:4, marginBottom:15 }}>
          Toca no que te falta para desmarcar. O que ficar marcado conta como feito.
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:9, marginBottom:16 }}>
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
                  podes entrar na cozinha. Hoje não há nota nas técnicas — não é zero, é que não
                  houve como avaliar. Fala com o professor sobre um trabalho a partir da ficha de hoje.</>
              : <>Assumir os próprios erros é uma das atitudes que estás a desenvolver — responsabilidade
                  pelas tuas ações. Ao dizeres o que falta, é essa competência que estás a mostrar.</>}
          </div>
        )}

        <button onClick={gravar} style={{
          width:'100%', background:V, color:'#fff', border:'none', borderRadius:12,
          padding:17, fontSize:18, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
        }}>
          {emFalta.length === 0
            ? 'Confirmar — está tudo'
            : `Confirmar — falta-me ${emFalta.length}`}
        </button>
      </div>
    </div>
  );
}

function PainelKitchenFlow({ fichas, aluno, plano }: {
  fichas: any[]; aluno: any; plano: any;
}) {
  const [aberto, setAberto] = useState(false);
  const [regTemp, setRegTemp] = useState<{prato:string;tipo:'quente'|'frio';temp:string}|null>(null);
  const [regNC, setRegNC] = useState<{zona:string;desc:string;acao:string}|null>(null);
  const [enviado, setEnviado] = useState<string[]>([]);
  const nomeAluno = aluno.nome || `Aluno ${aluno.numero}`;

  // Extrair registos obrigatórios do campo kitchenflow das fichas
  const registosTexto = fichas.map(f => f.kitchenflow || '').filter(Boolean).join('\n');
  const temTemperatura = /temperatura.*servi|temperatura de servi/i.test(registosTexto);
  const temOleos = /controlo.*óleo|controlo de óleo/i.test(registosTexto);
  const temConservacao = /conserva[cç]/i.test(registosTexto);
  const temTestemunho = /amostra.*testemunho/i.test(registosTexto);

  const registos = [
    { id:'higiene', emoji:'🧼', label:'Higiene Pessoal', desc:'Registado automaticamente na entrada', auto:true },
    ...(temTemperatura ? [{ id:'temp', emoji:'🌡️', label:'Temperatura de Serviço', desc:'Registar temperatura do prato antes de servir', auto:false }] : []),
    ...(temOleos ? [{ id:'oleos', emoji:'🛢️', label:'Controlo de Óleos', desc:'Registar controlo de óleos de fritura', auto:false }] : []),
    ...(temConservacao ? [{ id:'conservacao', emoji:'📦', label:'Conservação de Produtos', desc:'Registar produtos que sobram', auto:false }] : []),
    { id:'nc', emoji:'⚠️', label:'Não Conformidades', desc:'Registar qualquer problema detetado', auto:false },
    ...(temTestemunho ? [{ id:'testemunho', emoji:'🧪', label:'Amostra Testemunho', desc:'Recolher amostra se houver serviço a clientes', auto:false }] : []),
  ];

  async function enviarTemperatura() {
    if (!regTemp || !regTemp.prato || !regTemp.temp) return;
    await registarTemperaturaKitchenFlow(
      aluno.turmaId, aluno.id, nomeAluno,
      regTemp.prato, regTemp.tipo, Number(regTemp.temp)
    );
    setEnviado(p => [...p, 'temp']);
    setRegTemp(null);
  }

  async function enviarNC() {
    if (!regNC || !regNC.desc) return;
    await registarNaoConformidadeKitchenFlow(
      aluno.turmaId, aluno.id, nomeAluno,
      regNC.zona || 'Cozinha', regNC.desc, regNC.acao || 'A definir'
    );
    setEnviado(p => [...p, 'nc']);
    setRegNC(null);
  }

  return (
    <div style={{ marginBottom:16, borderRadius:14, overflow:'hidden',
      border:`1.5px solid #0e7490`, background:'#f0f9ff' }}>
      <button onClick={() => setAberto(a => !a)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:12,
        padding:'12px 16px', background:'#0e7490', border:'none', cursor:'pointer',
      }}>
        <span style={{ fontSize:20 }}>🏭</span>
        <div style={{ flex:1, textAlign:'left' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>KitchenFlow ECL</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)' }}>
            {registos.filter(r => enviado.includes(r.id) || r.auto).length}/{registos.length} registos concluídos
          </div>
        </div>
        <span style={{ fontSize:18, color:'rgba(255,255,255,0.7)',
          transform:aberto?'rotate(90deg)':'none', transition:'0.2s' }}>›</span>
      </button>

      {aberto && (
        <div style={{ padding:'12px 14px' }}>
          {registos.map(reg => {
            const feito = enviado.includes(reg.id) || reg.auto;
            return (
              <div key={reg.id} style={{ marginBottom:8, padding:'10px 12px',
                borderRadius:10, background:feito?'#d1fae5':'#fff',
                border:`1px solid ${feito?'#6ee7b7':'rgba(14,116,144,0.2)'}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>{feito ? '✅' : reg.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700,
                      color:feito?'#065f46':'#0e7490' }}>{reg.label}</div>
                    <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginTop:1 }}>
                      {feito ? 'Registado ✓' : reg.desc}
                    </div>
                  </div>
                  {!feito && !reg.auto && reg.id !== 'temp' && reg.id !== 'nc' && (
                    <button onClick={() => abrirKitchenFlow(reg.id)} style={{
                      padding:'6px 12px', borderRadius:8, border:'none',
                      background:'#0e7490', color:'#fff', fontSize:12,
                      fontWeight:700, cursor:'pointer', flexShrink:0,
                    }}>
                      Registar →
                    </button>
                  )}
                  {!feito && reg.id === 'nc' && !regNC && (
                    <button onClick={() => setRegNC({zona:'Cozinha',desc:'',acao:''})} style={{
                      padding:'6px 12px', borderRadius:8, border:'none',
                      background:'#dc2626', color:'#fff', fontSize:12,
                      fontWeight:700, cursor:'pointer', flexShrink:0,
                    }}>
                      Registar →
                    </button>
                  )}
                  {!feito && reg.id === 'temp' && !regTemp && (
                    <button onClick={() => setRegTemp({prato:fichas[0]?.nomePrato||'',tipo:'quente',temp:''})} style={{
                      padding:'6px 12px', borderRadius:8, border:'none',
                      background:'#0e7490', color:'#fff', fontSize:12,
                      fontWeight:700, cursor:'pointer', flexShrink:0,
                    }}>
                      Registar →
                    </button>
                  )}
                </div>

                {/* Formulário Temperatura */}
                {reg.id === 'temp' && regTemp && (
                  <div style={{ marginTop:10, padding:'10px', background:'#e0f2fe',
                    borderRadius:8, display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ display:'flex', gap:6 }}>
                      {(['quente','frio'] as const).map(t => (
                        <button key={t} onClick={() => setRegTemp(p => p?{...p,tipo:t}:null)} style={{
                          flex:1, padding:'6px', borderRadius:6, cursor:'pointer',
                          border:`2px solid ${regTemp.tipo===t?'#0e7490':'rgba(14,116,144,0.3)'}`,
                          background:regTemp.tipo===t?'#0e7490':'#fff',
                          color:regTemp.tipo===t?'#fff':'#0e7490', fontSize:12, fontWeight:700,
                        }}>{t==='quente'?'🔥 Quente':'❄️ Frio'}</button>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <input type="number" value={regTemp.temp}
                        onChange={e => setRegTemp(p => p?{...p,temp:e.target.value}:null)}
                        placeholder="°C" style={{ flex:1, padding:'8px', borderRadius:6,
                          border:'1px solid rgba(14,116,144,0.3)', fontSize:15, textAlign:'center' }} />
                      <span style={{ fontSize:12, color:'#0e7490', fontWeight:600 }}>
                        {regTemp.tipo==='quente'?'mín. 63°C':'máx. 4°C'}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={enviarTemperatura} style={{ flex:1, padding:'8px',
                        borderRadius:8, border:'none', background:'#0e7490', color:'#fff',
                        fontSize:13, fontWeight:700, cursor:'pointer' }}>
                        ✓ Confirmar
                      </button>
                      <button onClick={() => setRegTemp(null)} style={{ padding:'8px 12px',
                        borderRadius:8, border:'1px solid rgba(14,116,144,0.3)',
                        background:'#fff', color:'#0e7490', fontSize:13, cursor:'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Formulário Não Conformidade */}
                {reg.id === 'nc' && regNC && (
                  <div style={{ marginTop:10, padding:'10px', background:'#fef2f2',
                    borderRadius:8, display:'flex', flexDirection:'column', gap:8 }}>
                    <input value={regNC.zona} onChange={e => setRegNC(p => p?{...p,zona:e.target.value}:null)}
                      placeholder="Zona (ex: Cozinha fria)" style={{ padding:'8px', borderRadius:6,
                        border:'1px solid rgba(220,38,38,0.3)', fontSize:13 }} />
                    <textarea value={regNC.desc} onChange={e => setRegNC(p => p?{...p,desc:e.target.value}:null)}
                      placeholder="Descreve o problema..." rows={2} style={{ padding:'8px', borderRadius:6,
                        border:'1px solid rgba(220,38,38,0.3)', fontSize:13, resize:'none' }} />
                    <input value={regNC.acao} onChange={e => setRegNC(p => p?{...p,acao:e.target.value}:null)}
                      placeholder="Ação corretiva tomada" style={{ padding:'8px', borderRadius:6,
                        border:'1px solid rgba(220,38,38,0.3)', fontSize:13 }} />
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={enviarNC} style={{ flex:1, padding:'8px',
                        borderRadius:8, border:'none', background:'#dc2626', color:'#fff',
                        fontSize:13, fontWeight:700, cursor:'pointer' }}>
                        ✓ Registar NC
                      </button>
                      <button onClick={() => setRegNC(null)} style={{ padding:'8px 12px',
                        borderRadius:8, border:'1px solid rgba(220,38,38,0.3)',
                        background:'#fff', color:'#dc2626', fontSize:13, cursor:'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(14,116,144,0.08)',
            borderRadius:8, fontSize:12, color:'#0e7490', display:'flex', alignItems:'center', gap:8 }}>
            <span>🔗</span>
            <span>Abrir KitchenFlow ECL completo:</span>
            <button onClick={() => abrirKitchenFlow()} style={{ padding:'4px 10px',
              borderRadius:6, border:'none', background:'#0e7490', color:'#fff',
              fontSize:12, fontWeight:700, cursor:'pointer' }}>
              Abrir →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECÇÃO 2 — Fichas de Produção (mantida da versão anterior)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// SECÇÃO GUIÃO — Guião de Apoio à Produção para o aluno
// ─────────────────────────────────────────────────────────────
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
              fontSize:12, fontWeight:700,
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
      {/* Painel KitchenFlow — registos obrigatórios desta produção */}
      <PainelKitchenFlow fichas={fichas} aluno={aluno} plano={plano} />

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
                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.05em', color:'#2980b9', marginBottom:8 }}>Ingredientes</div>
                  {f.ingredientes.map((ing,i) => {
                    const marcado = checklist[f.id]?.ing.has(i)||false;
                    return (
                      <label key={i} style={{ display:'flex', alignItems:'center', gap:10,
                        padding:'10px 12px', borderRadius:10, border:`1px solid ${T.border}`,
                        marginBottom:5, background:marcado?T.sageP:'#fff', cursor:'pointer' }}>
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
                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.05em', color:'#2980b9', marginBottom:8 }}>Preparação</div>
                  {f.preparacao.map((p,i) => {
                    const marcado = checklist[f.id]?.passo.has(i)||false;
                    return (
                      <label key={i} style={{ display:'flex', alignItems:'flex-start', gap:10,
                        padding:'10px 12px', borderRadius:10, border:`1px solid ${T.border}`,
                        marginBottom:5, background:marcado?T.sageP:'#fff', cursor:'pointer' }}>
                        <input type="checkbox" checked={marcado} style={{ accentColor:T.sage, width:18, height:18, marginTop:2, flexShrink:0 }}
                          onChange={() => {
                            const cur = checklist[f.id]?.passo||new Set<number>();
                            const n = new Set<number>(cur);
                            n.has(i)?n.delete(i):n.add(i);
                            guardar(f.id,undefined,n);
                          }} />
                        <div style={{ fontSize:14, textDecoration:marcado?'line-through':'none', lineHeight:1.4 }}>
                          <strong>{p.num}.</strong> {p.descricao}
                          {p.temperatura&&<span style={{ color:'#2980b9', marginLeft:6, fontSize:12 }}>🌡 {p.temperatura}</span>}
                          {p.haccp&&<div style={{ color:T.danger, fontSize:12, marginTop:2 }}>⚠️ {p.haccp}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

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
function SecaoAvaliacao({ plano, aluno, fichas, onConcluido }: {
  plano: PlanoAula; aluno: Aluno; fichas: FichaProducao[]; onConcluido: () => void;
}) {
  const ucId = plano.ucId||'';
  const compRemovidas: string[] = (plano as any).compRemovidas||[];

  // Evidências do KitchenFlow — carregadas automaticamente
  const [evidenciasKF, setEvidenciasKF] = useState<EvidenciaKitchenFlow[]>([]);
  const [kfCarregado, setKfCarregado] = useState(false);

  useEffect(() => {
    // Ir buscar registos KitchenFlow do aluno nesta data
    const data = plano.data ? String(plano.data).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const registosObrig = fichas.flatMap(f => extrairRegistosObrigatorios(f as any));
    const tiposUnicos = Array.from(new Set(registosObrig));

    sincronizarEvidenciasKitchenFlow(aluno.turmaId, aluno.id, data, tiposUnicos)
      .then(ev => { setEvidenciasKF(ev); setKfCarregado(true); })
      .catch(() => setKfCarregado(true));
  }, [plano.id]);

  // Verificar se uma competência tem evidência no KitchenFlow
  function temEvidenciaKF(compId: string): boolean {
    return evidenciasKF.some(e => e.competenciaId === compId);
  }

  // ── Iniciativa (aulas teóricas) ──────────────────────────────
  function SecaoIniciativa() {
    if (tipoPlanAula !== 'teorico') return null;
    return (
      <div style={{ marginTop:16, padding:'14px 16px', borderRadius:12,
        background:'rgba(181,101,29,0.05)', border:'1px solid rgba(181,101,29,0.2)' }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>💡 Iniciativa</div>
        <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginBottom:12 }}>
          Como avalias a tua iniciativa hoje na cozinha?
        </div>
        {INICIATIVA_FRASES.map(f => (
          <button key={f.nivel} onClick={() => setNivelIniciativa(f.nivel)}
            style={{ width:'100%', textAlign:'left', padding:'10px 12px', marginBottom:6,
              borderRadius:10, cursor:'pointer', fontSize:13,
              border:`2px solid ${nivelIniciativa===f.nivel ? '#b5651d' : 'rgba(26,23,20,0.08)'}`,
              background: nivelIniciativa===f.nivel ? 'rgba(181,101,29,0.08)' : '#fff',
              fontWeight: nivelIniciativa===f.nivel ? 700 : 400 }}>
            <span style={{ display:'inline-block', width:20, height:20, borderRadius:'50%',
              background: nivelIniciativa===f.nivel ? '#b5651d' : 'rgba(26,23,20,0.1)',
              color: nivelIniciativa===f.nivel ? '#fff' : 'rgba(26,23,20,0.4)',
              fontSize:11, fontWeight:800, textAlign:'center', lineHeight:'20px',
              marginRight:8, flexShrink:0 }}>{f.nivel}</span>
            {f.texto}
          </button>
        ))}
      </div>
    );
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
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
            {nEvidencias} registo{nEvidencias !== 1 ? 's' : ''} do KitchenFlow verificado{nEvidencias !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)', marginTop: 1 }}>
            As competências marcadas com 🍳 têm evidência no KitchenFlow
          </div>
        </div>
      </div>
    );
  };

  // ── Competências desta aula — usa SUB-xxx e APP-xxx da ficha ─
  function _nivelPermitido(nivel: number): boolean {
    if (!aluno.nivelMedidas || aluno.nivelMedidas === 1) return true;
    if (aluno.nivelMedidas === 2) return nivel <= 2;
    if (aluno.nivelMedidas === 3) return nivel === 1;
    return true;
  }

  // SUB-xxx: subtécnicas da biblioteca
  const subIdsRaw = fichas.flatMap((f: any) => (f.tecnicasSugeridas || []).filter((id: string) => id.startsWith('SUB-')));
  const subIdsFiltrados = [...new Set(subIdsRaw)].filter((id: string) => !compRemovidas.includes(id));

  // APP-xxx: aparelhos filtrados pelo nível de medidas
  const appIdsRaw = fichas.flatMap((f: any) => ((f as any).aparelhosDetectados || []).filter((id: string) => id.startsWith('APP-')));
  const appIdsFiltrados = [...new Set(appIdsRaw)].filter((id: string) => {
    if (compRemovidas.includes(id)) return false;
    const app = encontrarAparelho(id);
    return app ? _nivelPermitido(app.nivel) : true;
  });

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

  // Subtécnicas como objectos para display
  const subsSug = subIdsFiltrados.slice(0, 6).map((id: string) => {
    const sub = encontrarSubtecnica(id);
    const hist = getHistoricoAlunoMicro(aluno.id, id);
    const avs = hist.map(h => ({nota: h.nota, data: h.data}));
    const emReg = estaEmRegressao(avs);
    const estado = emReg ? '⚠️ Em regressão' : avs.length === 0 ? '★ Nunca avaliada' : !jaTeveSucesso(avs) ? '↑ Em desenvolvimento' : '✓ Consolidada';

    // Técnica-mãe: SUB-COR-030-001 → TEC-COR-030
    const mm = id.match(/^SUB-([A-Z]+)-(\d+)/);
    const tecMae = mm ? encontrarSubtecnica(`TEC-${mm[1]}-${mm[2]}`) : null;
    const nomeSub = sub?.nome || '';
    const produto = nomeSub ? produtoPara(nomeSub) : undefined;

    return {
      id,
      // Nunca o código: se não houver nome, é melhor "Técnica" do que "SUB-COR-030-001".
      nome: nomeSub || tecMae?.nome || 'Técnica',
      // Onde esta técnica se encaixa e sobre o quê.
      contexto: [tecMae?.nome, produto].filter(Boolean).join(' · '),
      // Por ordem: a definição da subtécnica, depois a da técnica-mãe,
      // e só em último a dos dados — que é circular em 63% dos casos
      // ("Variante profissional de cozer: Cozer massa al dente").
      descricao: definicaoDaSubtecnica(id)?.definicao
        || definicaoDaTecnica(tecMae?.nome || '')?.definicao
        || (sub as any)?.definicao || '',
      resultadoEsperado: definicaoDaSubtecnica(id)?.resultado
        || definicaoDaTecnica(tecMae?.nome || '')?.resultado || '',
      motivo: estado,
    };
  });

  // Aparelhos como objectos para display
  const aparelhosSug = appIdsFiltrados.slice(0, 4).map((id: string) => {
    const app = encontrarAparelho(id);
    const hist = getHistoricoAlunoMicro(aluno.id, id);
    const avs = hist.map(h => ({nota: h.nota, data: h.data}));
    const emReg = estaEmRegressao(avs);
    const estado = emReg ? '⚠️ Em regressão' : avs.length === 0 ? '★ Nunca preparado' : !jaTeveSucesso(avs) ? '↑ Em desenvolvimento' : '✓ Consolidado';
    return {
      id,
      nome: app?.nome || 'Preparação',
      contexto: (app as any)?.categoria || '',
      descricao: definicaoDaTecnica(app?.nome || '')?.definicao || (app as any)?.definicao || '',
      nivel: app?.nivel || 1,
      categoria: app?.categoria || '',
      motivo: estado,
    };
  });

  // Fallback — se não há SUB/APP da ficha, usar sistema antigo
  const usarFallback = subsSug.length === 0 && aparelhosSug.length === 0;
  const familia1 = fichas.length > 0 ? (fichas[0] as any).familia1 : undefined;
  const familia2 = fichas.length > 0 ? (fichas[0] as any).familia2 : undefined;
  const etiquetas = fichas.flatMap((f: any) => f.etiquetas || []);
  const microsDaUCEsp = usarFallback ? ((familia1 || familia2)
    ? microsPorFamilia(familia1, familia2, etiquetas, ucId)
    : ucId ? microsPorUC(ucId) : []) : [];
  const microsEstr = MICROCOMPETENCIAS.filter(m => m.prioridade==='A');
  const microsDaUC = microsDaUCEsp.length>=3
    ? microsDaUCEsp
    : [...microsDaUCEsp,...microsEstr.filter(m=>!microsDaUCEsp.find(x=>x.id===m.id))].slice(0,8);
  const microsSug = usarFallback ? microsDaUC
    .filter(m => !compRemovidas.includes(m.id)).slice(0,6)
    .map(m => {
      const hist = getHistoricoAlunoMicro(aluno.id, m.id);
      const avs = hist.map(h=>({nota:h.nota,data:h.data}));
      const emReg = estaEmRegressao(avs);
      const motivo = emReg?'⚠️ Em regressão':avs.length===0?'★ Nunca avaliada':!jaTeveSucesso(avs)?'↑ Em desenvolvimento':'✓ Consolidada';
      return {...m, motivo};
    }) : [];

  // ── Conhecimentos — visíveis em planos teóricos ou mistos ──
  const tipoPlanAula = (plano as any).tipoPlanAula || (subIdsFiltrados.length === 0 && appIdsFiltrados.length === 0 ? 'teorico' : 'pratico');
  const knwIds = (plano.compAdicionadas || []).filter((id: string) => id.startsWith('KNW-'));
  // Em plano teórico: mostrar KNW das compAdicionadas (professor acrescenta via VistaDePlano)
  const conhecimentosSug = (tipoPlanAula === 'teorico' || tipoPlanAula === 'misto') ? knwIds
    .filter((id: string) => !compRemovidas.includes(id))
    .slice(0, 6)
    .map((id: string) => {
      const knw = encontrarConhecimento(id);
      const hist = getHistoricoAlunoMicro(aluno.id, id);
      const avs = hist.map(h => ({nota: h.nota, data: h.data}));
      const emReg = estaEmRegressao(avs);
      const motivo = emReg ? '⚠️ Em regressão' : avs.length === 0 ? '★ Nunca avaliado' : !jaTeveSucesso(avs) ? '↑ Em desenvolvimento' : '✓ Consolidado';
      return { id, nome: knw?.nome || id, definicao: knw?.definicao || '', motivo };
    }) : [];

  const [nivelHigiene, setNivelHigiene] = useState<string|null>(null);
  const [nivelHaccp, setNivelHaccp] = useState<string|null>(null);
  const [notasMicro, setNotasMicro] = useState<Record<string,string|null>>({});
  const [microAberta, setMicroAberta] = useState<string|null>(null);
  const [atitudeEscolhida, setAtitudeEscolhida] = useState<string|null>(null);
  // Posição da frase escolhida (0-3). A nota sai daqui, não de um valor fixo.
  const [nivelAtitudeFrase, setNivelAtitudeFrase] = useState<number|null>(null);
  const [nivelIniciativa, setNivelIniciativa] = useState<number>(0); // 0 = não avaliado
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [submetido, setSubmetido] = useState(() => {
    try { return !!localStorage.getItem(`avaliacao_submetida_${plano.id}_${aluno.id}`); } catch { return false; }
  });

  const OPCOES = [
    { v:'nf',  nota:1, label:'Ainda não fiz',                           cor:'#c8cfd6', corTxt:'#4a5568' },
    { v:'tp',  nota:2, label:'Tentei mas ainda preciso de mais prática', cor:'#96a4b0', corTxt:'#2d3748' },
    { v:'ca',  nota:3, label:'Consegui com ajuda',                       cor:'#647a8a', corTxt:'#ffffff' },
    { v:'fs',  nota:4, label:'Faço sozinho/a',                           cor:'#3d5a6e', corTxt:'#ffffff' },
    { v:'mbr', nota:5, label:'Faço com muito bom resultado',             cor:'#1e3a4a', corTxt:'#ffffff' },
  ];

  const prontoParaSubmeter = nivelHigiene!==null && nivelHaccp!==null;

  function submeterDefinitivo() {
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
    // Converter nota 1-5 para /20 (×4)
    const para20 = (n: number): number => Math.min(20, Math.round(n * 4));
    // Guardar OBR com escala 1-4
    if (nivelHigiene) addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_hig_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:'OBR_01',nota:paraNota(nivelHigiene),data:agora,validadoPor:'aluno'});
    // OBR_02 depende de evidência REAL no KitchenFlow — se o aluno não
    // registou lá (mesmo tendo feito a técnica correctamente), a competência
    // de registo fica a 1 (mínimo), independentemente do que auto-declarou
    // aqui. A técnica em si (SUB) nunca é afectada por isto — só o registo.
    if (nivelHaccp) {
      const notaAutoDeclarada = paraNota(nivelHaccp);
      const notaFinalHaccp = temEvidenciaKF('OBR_02') ? notaAutoDeclarada : 1;
      addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_hac_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:'OBR_02',nota:notaFinalHaccp,data:agora,validadoPor:'aluno'});
    }
    // Guardar todas as competências com escala 1-4
    Object.entries(notasMicro).forEach(([mId,v])=>{if(v)addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_${mId}_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:mId,nota:paraNota(v as string),data:agora,validadoPor:'aluno'});});
    // Guardar atitude escolhida
    // A nota da atitude vem da frase que o aluno escolheu, não de um valor
    // fixo: NOTAS_FRASES é 5/10/15/20 em escala /20, aqui converte-se para 1-5.
    const notaDaAtitude = nivelAtitudeFrase != null
      ? Math.round(NOTAS_FRASES[nivelAtitudeFrase] / 4)
      : 3;
    if (atitudeEscolhida) addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_${atitudeEscolhida}_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:atitudeEscolhida,nota:notaDaAtitude,data:agora,validadoPor:'aluno'});
    // Guardar SelecaoAluno com autoavaliacoes preenchidas para o professor validar
    const todasAutoavaliacoes = [
      ...(nivelHigiene?[{competenciaId:'OBR_01',nivel:nivelHigiene as string,nota:paraNota(nivelHigiene)}]:[]),
      ...(nivelHaccp?[{competenciaId:'OBR_02',nivel:nivelHaccp as string,nota:paraNota(nivelHaccp)}]:[]),
      ...Object.entries(notasMicro).filter(([,v])=>v).map(([mId,v])=>({competenciaId:mId,nivel:v as string,nota:paraNota(v as string)})),
      ...(atitudeEscolhida?[{competenciaId:atitudeEscolhida,nivel:'sozinho',nota:notaDaAtitude}]:[]),
      ...(tipoPlanAula==='teorico'&&nivelIniciativa>0?[{competenciaId:'INI-001',nivel:`ini_${nivelIniciativa}`,nota:nivelIniciativa}]:[]),
    ];
    addOrUpdateSelecao({id:`sel_${plano.id}_${aluno.id}`,comandaId:plano.id,planoAulaId:plano.id,fichaId:'',alunoId:aluno.id,turmaId:aluno.turmaId,tecnicas:Object.keys(notasMicro),atitudes:atitudeEscolhida?[atitudeEscolhida]:[],responsabilidades:[],autoavaliacoes:todasAutoavaliacoes as any,criadaEm:agora});
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
          {dataSubmissao && (
            <div style={{ fontSize:12, color:'rgba(26,23,20,0.45)', marginTop:4 }}>
              {fmtDataHora(dataSubmissao)}
            </div>
          )}
          <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginTop:6 }}>O professor vai confirmar o teu registo.</div>
        </div>

        {/* Mostrar o que foi submetido */}
        {autoavsSubmetidas.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:10 }}>
              O que submeteste
            </div>
            {autoavsSubmetidas.map((av: any, i: number) => {
              const nivel = av.nivel || '';
              const emoji = nivel==='autonomia'||nivel==='superei'?'🌟':nivel==='sozinho'||nivel==='atingi'?'✅':nivel==='ajuda'||nivel==='desenvolvimento'?'🤝':'📖';
              const label = nivel==='autonomia'?'Faço com muito bom resultado':nivel==='sozinho'||nivel==='atingi'?'Faço sozinho/a':nivel==='ajuda'||nivel==='desenvolvimento'?'Consegui com ajuda':'Não consegui';
              const nomeComp = av.competenciaId?.startsWith('OBR_01')?'Higiene pessoal':av.competenciaId?.startsWith('OBR_02')?'Higiene e segurança alimentar':av.competenciaId || '';
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'#fff', border:`1px solid ${T.border}`, marginBottom:6 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{emoji}</span>
                  <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{nomeComp}</div>
                  <span style={{ fontSize:12, fontWeight:600, color:'rgba(26,23,20,0.5)' }}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Bloquear re-submissão para aulas passadas */}
        {(() => {
          // Ver se o professor já validou
          const vals = (() => { try { return JSON.parse(localStorage.getItem('ecl_validacoes') || '[]'); } catch { return []; } })();
          const val = vals.find((v: any) => v.planoAulaId === plano.id && v.alunoId === aluno.id);
          if (val && val.notaMedia) {
            // Calcular nota com pesos por categoria
            const notasComCat = (val.notas || []).map((n: any) => {
              const cat = n.competenciaId?.startsWith('OBR_') ? 'OBR'
                : n.competenciaId?.startsWith('SUB-') || n.competenciaId?.startsWith('APP-') ? 'SUB'
                : n.competenciaId?.startsWith('KNW-') ? 'KNW'
                : n.competenciaId?.startsWith('INI-') ? 'INI'
                : 'ATI';
              return { categoria: cat as 'OBR'|'SUB'|'KNW'|'ATI'|'INI', nota: n.nota };
            });
            const tipoPlano = (plano as any).tipoPlanAula || 'pratico';
            const { nota20, porCategoria, detalhes } = calcularNotaPlano(notasComCat, tipoPlano);
            const notaFinal = val.notaMedia;
            const cor = nota20 >= 16 ? '#0369a1' : nota20 >= 12 ? '#5a7a4e' : nota20 >= 8 ? '#b5651d' : '#c0392b';
            const label = nota20 >= 16 ? 'Muito Bom' : nota20 >= 14 ? 'Bom' : nota20 >= 10 ? 'Suficiente' : 'Insuficiente';

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
                <div style={{ fontSize:12, fontWeight:700, color:'rgba(26,23,20,0.5)', textTransform:'uppercase', marginBottom:8 }}>
                  ✅ Professor confirmou
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:900, color:cor }}>{notaFinal.toFixed(1)}</span>
                  <span style={{ fontSize:14, color:'rgba(26,23,20,0.4)' }}>/4</span>
                  <span style={{ fontSize:14, color:'rgba(26,23,20,0.4)', marginLeft:4 }}>→</span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, color:cor, marginLeft:4 }}>{nota20}</span>
                  <span style={{ fontSize:14, color:'rgba(26,23,20,0.4)' }}>/20</span>
                  <span style={{ marginLeft:'auto', fontSize:14, fontWeight:700, color:cor }}>{label}</span>
                </div>
                {detalhes && (
                  <div style={{ marginTop:10, fontSize:11, color:'rgba(26,23,20,0.45)',
                    padding:'6px 10px', borderRadius:8, background:'rgba(26,23,20,0.03)',
                    fontFamily:'monospace' }}>
                    {detalhes}
                  </div>
                )}
                {comparacoes.length > 0 && (
                  <details style={{ marginTop:8 }}>
                    <summary style={{ fontSize:10, color:'rgba(26,23,20,0.35)', cursor:'pointer', userSelect:'none' }}>
                      A tua autoavaliação
                    </summary>
                    <div style={{ marginTop:6, paddingTop:6 }}>
                      {comparacoes.map(c => (
                        <div key={c.competenciaId} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'2px 0', color:'rgba(26,23,20,0.4)' }}>
                          <span>{c.competenciaId}</span>
                          <span>Tu: {c.alunoDisse} · Professor: {c.professorValidou}</span>
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
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div>
      {/* ── Aviso de recuperação ── */}
      {(() => {
        const idsAtitudes = (plano.compAdicionadas || []).filter((id: string) => id.startsWith('ATI-'));
        const atitudesEmRecup = idsAtitudes.filter((id: string) => {
          const hist = getHistoricoAlunoMicro(aluno.id, id);
          if (!hist.length) return false;
          return hist[hist.length - 1].nota < 3;
        });
        if (!atitudesEmRecup.length) return null;
        return (
          <div style={{ margin:'0 0 16px', padding:'12px 14px', borderRadius:10,
            background:'rgba(192,57,43,0.06)', border:'2px solid rgba(192,57,43,0.3)' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#c0392b', marginBottom:8 }}>
              🔁 Tens competências em recuperação nesta aula
            </div>
            {atitudesEmRecup.map((id: string) => {
              const a = getAtitudeDetalhada(id);
              const dica = dicaRecuperacaoAtitude(id, 1);
              const nivel = nivelComplexidadeAtitude(id, 1);
              return (
                <div key={id} style={{ marginBottom:8, padding:'8px 10px', borderRadius:8,
                  background:'rgba(192,57,43,0.04)', border:'1px solid rgba(192,57,43,0.15)' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#c0392b' }}>🔁 {a?.nome ?? id}</div>
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.6)', marginTop:4, lineHeight:1.5 }}>
                    <strong>Tens de mostrar que melhoraste.</strong> {dica}
                  </div>
                  {nivel && (
                    <div style={{ fontSize:11, color:'rgba(26,23,20,0.45)', marginTop:4, fontStyle:'italic' }}>
                      {nivel ? `Nível esperado: ${nivel}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Obrigatórias */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
          letterSpacing:'0.06em', color:T.sage, marginBottom:12 }}>🔒 Sempre avaliadas</div>
        {[
          { id:'hig', label:'Higiene pessoal', val:nivelHigiene, set:setNivelHigiene },
          { id:'hac', label:'Higiene e Segurança Alimentar', val:nivelHaccp, set:setNivelHaccp },
        ].map(obr => (
          <div key={obr.id} style={{ marginBottom:12, padding:'14px', borderRadius:14,
            background:T.sageP, border:`1px solid ${T.sage}30` }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>{obr.label}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {OPCOES.map(op => (
                <button key={op.v} onClick={() => obr.set(op.v)} style={{
                  padding:'12px 6px', borderRadius:10, border:`2px solid ${obr.val===op.v?op.cor:T.border}`,
                  background:obr.val===op.v?op.cor:'#fff', color:obr.val===op.v?op.cor:'rgba(26,23,20,0.5)',
                  fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'center',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                }}>
                  <span style={{ fontSize:24 }}>{op.nota}</span>
                  {op.label}
                </button>
              ))}
            </div>
            {obr.id === 'hac' && obr.val && !temEvidenciaKF('OBR_02') && (
              <div style={{ marginTop:10, padding:'8px 10px', borderRadius:8, fontSize:11,
                background:'rgba(181,101,29,0.1)', color:'#8a4a15' }}>
                ⚠️ Não encontrámos registo teu no KitchenFlow para esta aula — mesmo que
                tenhas feito tudo bem, esta competência fica ao mínimo até haver registo.
                Regista no KitchenFlow para esta nota reflectir o que fizeste.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Subtécnicas (SUB-xxx) */}
      {subsSug.length>0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.06em', color:T.copper, marginBottom:12 }}>🔬 Técnicas desta aula</div>
          {subsSug.map(m => (
            <div key={m.id} style={{ marginBottom:8, borderRadius:14, overflow:'hidden',
              border:`1.5px solid ${microAberta===m.id?T.copper:T.border}` }}>
              <button onClick={() => setMicroAberta(s=>s===m.id?null:m.id)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                background:microAberta===m.id?T.copperP:'#fff', border:'none', cursor:'pointer', textAlign:'left',
              }}>
                <div style={{ flex:1 }}>
                  {(m as any).contexto && (
                    <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.05em',
                      textTransform:'uppercase', color:T.copper, marginBottom:2 }}>
                      {(m as any).contexto}
                    </div>
                  )}
                  <div style={{ fontWeight:700, fontSize:15.5 }}>{m.nome}</div>
                  {(m as any).descricao && (
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.65)', marginTop:3, lineHeight:1.45 }}>
                      {(m as any).descricao}
                    </div>
                  )}
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginTop:4 }}>{m.motivo}</div>
                </div>
                {notasMicro[m.id] && <span style={{ fontSize:24 }}>{notasMicro[m.id]==='sozinho'?'💪':notasMicro[m.id]==='ajuda'?'🤝':'📖'}</span>}
                <span style={{ fontSize:18, color:T.copper, transform:microAberta===m.id?'rotate(90deg)':'none', transition:'0.2s' }}>›</span>
              </button>
              {microAberta===m.id && (
                <div style={{ padding:'12px 16px', borderTop:`2px solid ${T.copper}`, background:'#fdfcfb' }}>
                  <CriteriosComp compId={m.id} cor={T.copper} abertaInicial={true} />
                  {notasMicro[m.id] && (() => {
                    const frases = getFrasesParaCompetencia(m.id, m.nome);
                    const idx = ['nao','ajuda','sozinho','autonomia'].indexOf(notasMicro[m.id] as string);
                    return idx >= 0 ? (
                      <div style={{ margin:'10px 0', padding:'10px 12px', borderRadius:8,
                        background:'rgba(181,101,29,0.06)', fontSize:12, color:'rgba(26,23,20,0.7)', fontStyle:'italic' }}>
                        "{frases[idx]}"
                      </div>
                    ) : null;
                  })()}
                  <div style={{ marginTop:12 }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {OPCOES.map(op => (
                      <button key={op.v} onClick={() => setNotasMicro(p=>({...p,[m.id]:p[m.id]===op.v?null:op.v}))} style={{
                        padding:'10px 6px', borderRadius:10, border:`2px solid ${notasMicro[m.id]===op.v?op.cor:T.border}`,
                        background:notasMicro[m.id]===op.v?op.cor:'#fff', color:notasMicro[m.id]===op.v?op.cor:'rgba(26,23,20,0.5)',
                        fontSize:11, fontWeight:700, cursor:'pointer', textAlign:'center',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      }}>
                        <span style={{ fontSize:20 }}>{op.nota}</span>{op.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Aparelhos (APP-xxx) — preparações base, filtradas pelo nível de medidas */}
      {aparelhosSug.length>0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.06em', color:'#5B67EA', marginBottom:12 }}>🧪 Preparações base desta aula</div>
          {aluno.nivelMedidas === 3 && (
            <div style={{ fontSize:11, color:'rgba(26,23,20,0.45)', marginBottom:8, padding:'6px 10px',
              background:'rgba(181,101,29,0.06)', borderRadius:8 }}>
              ℹ️ Só são apresentadas preparações de Nível 1 (adequadas ao teu plano de estudos)
            </div>
          )}
          {aluno.nivelMedidas === 2 && (
            <div style={{ fontSize:11, color:'rgba(26,23,20,0.45)', marginBottom:8, padding:'6px 10px',
              background:'rgba(181,101,29,0.06)', borderRadius:8 }}>
              ℹ️ São apresentadas preparações de Nível 1 e 2 (adequadas ao teu plano de estudos)
            </div>
          )}
          {aparelhosSug.map(m => (
            <div key={m.id} style={{ marginBottom:8, borderRadius:14, overflow:'hidden',
              border:`1.5px solid ${microAberta===m.id?'#5B67EA':T.border}` }}>
              <button onClick={() => setMicroAberta(s=>s===m.id?null:m.id)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                background:microAberta===m.id?'rgba(91,103,234,0.06)':'#fff', border:'none', cursor:'pointer', textAlign:'left',
              }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{m.nome}</div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:100,
                      background: m.nivel===1?'rgba(90,122,78,0.15)':m.nivel===2?'rgba(181,101,29,0.15)':'rgba(192,57,43,0.15)',
                      color: m.nivel===1?'#5a7a4e':m.nivel===2?'#b5651d':'#c0392b' }}>N{m.nivel}</span>
                  </div>
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginTop:2 }}>{m.categoria} · {m.motivo}</div>
                </div>
                {notasMicro[m.id] && <span style={{ fontSize:24 }}>{notasMicro[m.id]==='sozinho'?'💪':notasMicro[m.id]==='ajuda'?'🤝':'📖'}</span>}
                <span style={{ fontSize:18, color:'#5B67EA', transform:microAberta===m.id?'rotate(90deg)':'none', transition:'0.2s' }}>›</span>
              </button>
              {microAberta===m.id && (
                <div style={{ padding:'12px 16px', borderTop:'2px solid #5B67EA', background:'#fdfcfb' }}>
                  <CriteriosComp compId={m.id} cor='#5B67EA' abertaInicial={true} />
                  <div style={{ marginTop:12 }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    {OPCOES.map(op => (
                      <button key={op.v} onClick={() => setNotasMicro(p=>({...p,[m.id]:p[m.id]===op.v?null:op.v}))} style={{
                        padding:'12px 6px', borderRadius:10, border:`2px solid ${notasMicro[m.id]===op.v?op.cor:T.border}`,
                        background:notasMicro[m.id]===op.v?op.cor:'#fff', color:notasMicro[m.id]===op.v?op.cor:'rgba(26,23,20,0.5)',
                        fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'center',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      }}>
                        <span style={{ fontSize:24 }}>{op.nota}</span>{op.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Conhecimentos (KNW-xxx) — plano teórico ou misto */}
      {conhecimentosSug.length>0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.06em', color:'#0369a1', marginBottom:12 }}>📚 Conhecimentos desta aula</div>
          {conhecimentosSug.map(m => (
            <div key={m.id} style={{ marginBottom:8, borderRadius:14, overflow:'hidden',
              border:`1.5px solid ${microAberta===m.id?'#0369a1':T.border}` }}>
              <button onClick={() => setMicroAberta(s=>s===m.id?null:m.id)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                background:microAberta===m.id?'rgba(3,105,161,0.06)':'#fff', border:'none', cursor:'pointer', textAlign:'left',
              }}>
                <div style={{ flex:1 }}>
                  {(m as any).contexto && (
                    <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.05em',
                      textTransform:'uppercase', color:T.copper, marginBottom:2 }}>
                      {(m as any).contexto}
                    </div>
                  )}
                  <div style={{ fontWeight:700, fontSize:15.5 }}>{m.nome}</div>
                  {(m as any).descricao && (
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.65)', marginTop:3, lineHeight:1.45 }}>
                      {(m as any).descricao}
                    </div>
                  )}
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginTop:4 }}>{m.motivo}</div>
                </div>
                {notasMicro[m.id] && <span style={{ fontSize:24 }}>{notasMicro[m.id]==='sozinho'?'💪':notasMicro[m.id]==='ajuda'?'🤝':'📖'}</span>}
                <span style={{ fontSize:18, color:'#0369a1', transform:microAberta===m.id?'rotate(90deg)':'none', transition:'0.2s' }}>›</span>
              </button>
              {microAberta===m.id && (
                <div style={{ padding:'12px 16px', borderTop:'2px solid #0369a1', background:'#fdfcfb' }}>
                  {m.definicao && (
                    <div style={{ fontSize:12, color:'rgba(26,23,20,0.6)', marginBottom:12, padding:'8px', background:'rgba(3,105,161,0.05)', borderRadius:8 }}>
                      {m.definicao}
                    </div>
                  )}
                  <div style={{ marginTop:12 }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    {OPCOES.map(op => (
                      <button key={op.v} onClick={() => setNotasMicro(p=>({...p,[m.id]:p[m.id]===op.v?null:op.v}))} style={{
                        padding:'12px 6px', borderRadius:10, border:`2px solid ${notasMicro[m.id]===op.v?op.cor:T.border}`,
                        background:notasMicro[m.id]===op.v?op.cor:'#fff', color:notasMicro[m.id]===op.v?op.cor:'rgba(26,23,20,0.5)',
                        fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'center',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      }}>
                        <span style={{ fontSize:24 }}>{op.nota}</span>{op.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fallback — sistema antigo quando não há SUB/APP */}
      {microsSug.length>0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.06em', color:T.copper, marginBottom:12 }}>🔬 Técnicas desta aula</div>
          {microsSug.map(m => (
            <div key={m.id} style={{ marginBottom:8, borderRadius:14, overflow:'hidden',
              border:`1.5px solid ${microAberta===m.id?T.copper:T.border}` }}>
              <button onClick={() => setMicroAberta(s=>s===m.id?null:m.id)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                background:microAberta===m.id?T.copperP:'#fff', border:'none', cursor:'pointer', textAlign:'left',
              }}>
                <div style={{ flex:1 }}>
                  {(m as any).contexto && (
                    <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.05em',
                      textTransform:'uppercase', color:T.copper, marginBottom:2 }}>
                      {(m as any).contexto}
                    </div>
                  )}
                  <div style={{ fontWeight:700, fontSize:15.5 }}>{m.nome}</div>
                  {(m as any).descricao && (
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.65)', marginTop:3, lineHeight:1.45 }}>
                      {(m as any).descricao}
                    </div>
                  )}
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginTop:4 }}>{m.motivo}</div>
                </div>
                {notasMicro[m.id] && <span style={{ fontSize:24 }}>{notasMicro[m.id]==='sozinho'?'💪':notasMicro[m.id]==='ajuda'?'🤝':'📖'}</span>}
                <span style={{ fontSize:18, color:T.copper, transform:microAberta===m.id?'rotate(90deg)':'none', transition:'0.2s' }}>›</span>
              </button>
              {microAberta===m.id && (
                <div style={{ padding:'12px 16px', borderTop:`2px solid ${T.copper}`, background:'#fdfcfb' }}>
                  <CriteriosComp compId={m.id} cor={T.copper} abertaInicial={true} />
                  <div style={{ marginTop:12 }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    {OPCOES.map(op => (
                      <button key={op.v} onClick={() => setNotasMicro(p=>({...p,[m.id]:p[m.id]===op.v?null:op.v}))} style={{
                        padding:'12px 6px', borderRadius:10, border:`2px solid ${notasMicro[m.id]===op.v?op.cor:T.border}`,
                        background:notasMicro[m.id]===op.v?op.cor:'#fff', color:notasMicro[m.id]===op.v?op.cor:'rgba(26,23,20,0.5)',
                        fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'center',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      }}>
                        <span style={{ fontSize:24 }}>{op.nota}</span>{op.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Percurso do aluno ao longo da UC — estado (validado/aguarda/por avaliar) plano a plano */}
      <PercursoUC aluno={aluno} ucId={ucId} />

      {/* Atitude — AUTOPROPOSTA do aluno: só atitudes de maturidade (as que ele reconhece em si) */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
          letterSpacing:'0.06em', color:'#7d4f8c', marginBottom:4 }}>💡 Propõe-te a uma atitude</div>
        <div style={{ fontSize:12, color:'rgba(26,23,20,0.55)', marginBottom:12 }}>
          Escolhe uma atitude que reconheces em ti hoje. Fica como proposta tua — o professor valida.</div>
        <div>
          {(() => {
            // Progressão por ano: 1ºACP 8 atitudes, 2ºACP 16, 3ºACP 22.
            // Inclui as do ano seguinte — um aluno pode querer propor-se a
            // uma atitude mais avançada do que o seu ano exige.
            // Substitui a lista fixa de 7 que era igual para toda a gente.
            const permitidas = opcoesDeEscolhaDoAluno(aluno.ano ?? 1);
            const opcoes = ATITUDES.filter(
              a => permitidas.includes(a.id) && !compRemovidas.includes(a.id)
            );
            if (opcoes.length === 0) return null;

            return opcoes.map(a => {
              const escolhida = atitudeEscolhida === a.id;
              const frases = FRASES_ATITUDES.find(f => f.competenciaId === a.id)?.frases;
              return (
                <div key={a.id} style={{ marginBottom:8 }}>
                  <button
                    onClick={() => { setAtitudeEscolhida(escolhida ? null : a.id); setNivelAtitudeFrase(null); }}
                    style={{
                      width:'100%', padding:'13px 14px', borderRadius:12, fontSize:14.5,
                      fontWeight:700, cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                      border:`1.5px solid ${escolhida ? '#7d4f8c' : T.border}`,
                      background: escolhida ? 'rgba(125,79,140,0.08)' : '#fff',
                      color: escolhida ? '#7d4f8c' : 'rgba(26,23,20,0.75)',
                    }}>
                    {escolhida ? '✓ ' : ''}{a.nome}
                  </button>

                  {/* Frases: só aparecem depois de escolher a atitude. O aluno
                      lê descrições de si próprio, não números — se visse as
                      notas escolhia a que quer, não a que o descreve. */}
                  {escolhida && frases && (
                    <div style={{ marginTop:7, paddingLeft:10 }}>
                      <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginBottom:7 }}>
                        Qual destas te descreve melhor?
                      </div>
                      {frases.map((fr, i) => {
                        const sel = nivelAtitudeFrase === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setNivelAtitudeFrase(sel ? null : i)}
                            style={{
                              width:'100%', display:'block', textAlign:'left',
                              padding:'12px 13px', marginBottom:6, borderRadius:11,
                              fontSize:14, lineHeight:1.5, cursor:'pointer', fontFamily:'inherit',
                              border:`1.5px solid ${sel ? '#7d4f8c' : T.border}`,
                              background: sel ? 'rgba(125,79,140,0.08)' : '#fff',
                              color: sel ? '#7d4f8c' : 'rgba(26,23,20,0.75)',
                              fontWeight: sel ? 700 : 400,
                            }}>
                            {fr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {!prontoParaSubmeter && (
        <div style={{ padding:'12px 14px', background:T.copperP, borderRadius:10,
          fontSize:13, color:T.copper, marginBottom:12 }}>
          ⚠️ Preenche pelo menos as duas competências obrigatórias para poderes submeter.
        </div>
      )}

      <button onClick={() => setModalConfirmar(true)} disabled={!prontoParaSubmeter} style={{
        width:'100%', padding:'16px', borderRadius:14, border:'none', fontSize:16, fontWeight:700,
        background:prontoParaSubmeter?T.sage:'rgba(26,23,20,0.08)',
        color:prontoParaSubmeter?'#fff':'rgba(26,23,20,0.3)',
        cursor:prontoParaSubmeter?'pointer':'not-allowed',
        boxShadow:prontoParaSubmeter?`0 4px 16px ${T.sage}40`:'none', transition:'all 0.2s',
      }}>
        ✓ Submeter autoavaliação
      </button>

      {/* Modal confirmação */}
      {modalConfirmar && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,23,20,0.7)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:24, padding:'28px 24px', maxWidth:380, width:'100%' }}>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>🎯</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, marginBottom:6 }}>
                Confirmas o teu registo?
              </div>
              <div style={{ fontSize:14, color:'rgba(26,23,20,0.55)' }}>
                Depois de submeter não podes alterar.
              </div>
            </div>
            <div style={{ background:T.cream, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:14 }}>
              <div>🔒 Higiene: {nivelHigiene==='sozinho'?'💪 Sozinho/a':nivelHigiene==='ajuda'?'🤝 Consegui com ajuda':'📖 A aprender'}</div>
              <div style={{ marginTop:4 }}>🔒 HACCP: {nivelHaccp==='sozinho'?'💪 Sozinho/a':nivelHaccp==='ajuda'?'🤝 Consegui com ajuda':'📖 A aprender'}</div>
              {atitudeEscolhida && <div style={{ marginTop:4 }}>💡 {ATITUDES.find(a=>a.id===atitudeEscolhida)?.nome}</div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={submeterDefinitivo} style={{ padding:'15px', borderRadius:14, border:'none',
                background:T.sage, color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer' }}>
                ✓ Sim, confirmo!
              </button>
              <button onClick={() => setModalConfirmar(false)} style={{ padding:'12px', borderRadius:12,
                border:`1px solid ${T.border}`, background:'#fff', color:'rgba(26,23,20,0.6)',
                fontSize:14, fontWeight:600, cursor:'pointer' }}>
                Voltar e rever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
