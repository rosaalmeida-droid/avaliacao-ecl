import React, { useState, useRef, useEffect } from 'react';
import { Aluno, PlanoAula, FichaProducao } from '../types';
import {
  getPlanosAulaPorTurma, getFichasPorPlano, getRequisicaoPorPlano,
  getDistribuicoesPorPlano, getChecklistAlunoFicha, addOrUpdateChecklistAluno,
  addOrUpdateSelecao, getHistoricoAlunoMicro, addRegistoAvaliacao, addRegistoPresenca,
  getHistoricoAluno, registarHigieneKitchenFlow, registarTemperaturaKitchenFlow,
  registarNaoConformidadeKitchenFlow, abrirKitchenFlow, KITCHENFLOW_APP_URL, getPresencas,
  sincronizarEvidenciasKitchenFlow, extrairRegistosObrigatorios, EvidenciaKitchenFlow,
} from '../backend';
import {
  MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS, PARAMETROS_AVALIACAO,
  microsPorUC, microsPorFamilia, jaTeveSucesso, estaEmRegressao,
} from '../competenciasECL';
import { GuiaProducao } from './GuiaProducao';
import { CriteriosComp } from './CriteriosComp';
import { ManualCozinheiro } from './ManualCozinheiro';
import { RecuperacaoModulosAluno } from './RecuperacaoModulos';
import { PerfilProfissionalAluno } from './PerfilProfissional';

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

function formatarData(iso: string): string {
  const d = parseDataSegura(iso);
  if (!d) return '—';
  return d.toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long' });
}

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
function CalendarioAluno({ planos, onAbrirPlano }: {
  planos: PlanoAula[];
  onAbrirPlano: (p: PlanoAula) => void;
}) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

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
          <div style={{ fontSize:13, fontWeight:700, color:T.charcoal,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {plano.titulo}
          </div>
          {plano.ucNome && (
            <div style={{ fontSize:11, color:T.copper, marginTop:2 }}>{plano.ucNome}</div>
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
          marginBottom:6 }}>
          {plano.titulo}
        </div>
        {plano.horaInicio && (
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>
            🕗 {plano.horaInicio}–{plano.horaFim}
            {plano.ucId && <span style={{ marginLeft:8, background:'rgba(255,255,255,0.2)',
              padding:'1px 8px', borderRadius:100, fontSize:11 }}>{plano.ucId}</span>}
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
export function AlunoView({ aluno }: { aluno: Aluno }) {
  const [planoAtivo, setPlanoAtivo] = useState<PlanoAula | null>(null);
  const [aba, setAba] = useState<'hoje' | 'calendario' | 'manual' | 'perfil'>('hoje');
  const [planos, setPlanos] = useState<PlanoAula[]>(() =>
    getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado')
  );

  useEffect(() => {
    import('../backend').then(({ sincronizarDoSheets }) => {
      sincronizarDoSheets(aluno.turmaId).then(() => {
        setPlanos(getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado'));
      }).catch(() => {});
    });
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

  if (planoAtivo) {
    return <VistaDePlanoAluno plano={planoAtivo} aluno={aluno} onVoltar={() => setPlanoAtivo(null)} />;
  }

  return (
    <div style={{ minHeight:'100vh', background:T.cream }}>

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
              { id:'manual',    emoji:'📖', label:'Manual',      cor:'#e63946' },
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
        {aba === 'hoje' && (
          <div style={{ display:'grid', gap:24,
            gridTemplateColumns: 'window' in globalThis && window.innerWidth >= 900 ? '1fr 1fr' : '1fr' }}>

            {/* Coluna esquerda — avisos + aula de hoje */}
            <div>
              {/* Avisos */}
              {avisos.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:10 }}>
                    📢 Avisos
                  </div>
                  {avisos.map((a,i) => <CardAviso key={i} {...a} />)}
                </div>
              )}

              {/* Aula de hoje — botão grande */}
              {planoHoje ? (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:10 }}>
                    🍳 Aula de hoje
                  </div>
                  <div style={{ background:T.copper, borderRadius:20, padding:'20px',
                    boxShadow:`0 8px 32px ${T.copper}40` }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)',
                      textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>
                      {planoHoje.horaInicio}–{planoHoje.horaFim}
                      {planoHoje.ucNome && ` · ${planoHoje.ucNome}`}
                    </div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700,
                      color:'#fff', marginBottom:16 }}>{planoHoje.titulo}</div>
                    <button onClick={() => setPlanoAtivo(planoHoje)} style={{
                      width:'100%', padding:'14px', borderRadius:12, border:'none',
                      background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:16,
                      fontWeight:700, cursor:'pointer', backdropFilter:'blur(4px)',
                    }}>
                      Entrar na aula →
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ borderRadius:20, overflow:'hidden', marginBottom:20,
                  border:'2px dashed rgba(26,23,20,0.12)' }}>
                  <div style={{ padding:'24px 20px', textAlign:'center',
                    background:'rgba(26,23,20,0.03)' }}>
                    <div style={{ fontSize:48, marginBottom:8 }}>😴</div>
                    <div style={{ fontWeight:800, fontSize:17, color:'rgba(26,23,20,0.6)' }}>
                      Sem aula hoje
                    </div>
                    <div style={{ fontSize:13, color:'rgba(26,23,20,0.4)', marginTop:4 }}>
                      {proximasAulas[0]
                        ? `Próxima aula: ${formatarData(proximasAulas[0].data)}`
                        : 'Sem aulas agendadas próximas.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Ações rápidas */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:2 }}>
                  ⚡ Ações rápidas
                </div>
                <button onClick={() => setAba('calendario')} style={{
                  display:'flex', alignItems:'center', gap:14, padding:'16px 18px',
                  borderRadius:16, border:'2px solid #2563eb',
                  background:'#eff6ff', cursor:'pointer', textAlign:'left',
                }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'#2563eb',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:22, flexShrink:0 }}>📅</div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#1d4ed8' }}>Ver calendário</div>
                    <div style={{ fontSize:12, color:'#3b82f6', marginTop:1 }}>Todas as tuas aulas</div>
                  </div>
                  <span style={{ fontSize:22, color:'#2563eb', marginLeft:'auto' }}>→</span>
                </button>
                <button onClick={() => setAba('perfil')} style={{
                  display:'flex', alignItems:'center', gap:14, padding:'16px 18px',
                  borderRadius:16, border:'2px solid #15803d',
                  background:'#f0fdf4', cursor:'pointer', textAlign:'left',
                }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'#15803d',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:22, flexShrink:0 }}>📊</div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#15803d' }}>O meu progresso</div>
                    <div style={{ fontSize:12, color:'#16a34a', marginTop:1 }}>Competências e avaliações</div>
                  </div>
                  <span style={{ fontSize:22, color:'#15803d', marginLeft:'auto' }}>→</span>
                </button>
              </div>
            </div>

            {/* Coluna direita — próximas aulas + passadas */}
            <div>
              {proximasAulas.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:10 }}>
                    🗓️ Próximas aulas
                  </div>
                  {proximasAulas.map(p => (
                    <CardAula key={p.id} plano={p} onAbrir={() => setPlanoAtivo(p)} />
                  ))}
                </div>
              )}

              {aulasPassadas.length > 0 && (
                <div>
                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:10 }}>
                    📚 Aulas anteriores
                  </div>
                  {aulasPassadas.map(p => (
                    <CardAula key={p.id} plano={p} onAbrir={() => setPlanoAtivo(p)} />
                  ))}
                </div>
              )}

              {proximasAulas.length === 0 && aulasPassadas.length === 0 && (
                <div style={{ background:'#fff', borderRadius:16, padding:'32px 20px',
                  textAlign:'center', border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
                  <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>Sem aulas ainda</div>
                  <div style={{ fontSize:13, color:'rgba(26,23,20,0.5)' }}>
                    O professor ainda não publicou aulas para a tua turma.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABA CALENDÁRIO ── */}
        {aba === 'calendario' && (
          <div style={{ display:'grid', gap:24,
            gridTemplateColumns: 'window' in globalThis && window.innerWidth >= 900 ? '380px 1fr' : '1fr' }}>
            <div>
              <CalendarioAluno planos={planos} onAbrirPlano={p => setPlanoAtivo(p)} />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.06em', color:'rgba(26,23,20,0.4)', marginBottom:14 }}>
                📋 Todas as aulas
              </div>
              {planos.length === 0 ? (
                <div style={{ background:'#fff', borderRadius:16, padding:'32px 20px',
                  textAlign:'center', border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
                  <div style={{ fontWeight:600 }}>Sem aulas publicadas</div>
                </div>
              ) : (
                [...planos].sort((a,b) => b.data.localeCompare(a.data)).map(p => (
                  <CardAula key={p.id} plano={p} onAbrir={() => setPlanoAtivo(p)} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── ABA MANUAL ── */}
        {aba === 'manual' && (
          <ManualCozinheiro modoProf={false} />
        )}

        {/* ── ABA PERFIL ── */}
        {aba === 'perfil' && (
          <div>
            <PerfilProfissionalAluno aluno={aluno} />
            <div style={{ marginTop:24 }}>
              <RecuperacaoModulosAluno aluno={aluno} />
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
  const [orientacaoConcluida, setOrientacaoConcluida] = React.useState(false);
  const [entradaConcluida, setEntradaConcluida] = React.useState(false);
  const [fichaConcluida, setFichaConcluida] = React.useState(false);
  const [guiaoConcluido, setGuiaoConcluido] = React.useState(false);
  const [avaliacaoConcluida, setAvaliacaoConcluida] = React.useState(false);

  const fichas = getFichasPorPlano(plano.id);
  const requisicao = getRequisicaoPorPlano(plano.id);

  const PASSOS = [
    { id:'orientacao', emoji:'🚀', label:'Orientação',            cor:T.copper },
    { id:'entrada',    emoji:'🪪', label:'Entrada e Higiene',     cor:'#b5651d' },
    { id:'ficha',      emoji:'📄', label:'Ficha de Produção',     cor:'#2563eb' },
    ...(fichas.some((f:any) => f.textoGuia) ? [{ id:'guia', emoji:'📖', label:'Guião', cor:'#15803d' }] : []),
    { id:'requisicao', emoji:'🛒', label:'Requisição',            cor:'#7c3aed' },
    { id:'avaliacao',  emoji:'🎯', label:'Autoavaliação',         cor:T.sage },
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
            <div style={{ fontSize:14, fontWeight:800, color:'#faf7f2',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {plano.titulo}
            </div>
            <div style={{ fontSize:10, color:'rgba(247,241,230,0.4)', marginTop:1 }}>
              {formatarData(plano.data)}{plano.horaInicio && ` · ${plano.horaInicio}–${plano.horaFim}`}
            </div>
          </div>
          <div style={{ background: pctProgresso===100 ? '#22c55e' : 'rgba(255,255,255,0.12)',
            borderRadius:100, padding:'5px 11px', flexShrink:0 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>
              {pctProgresso===100 ? '🎉' : `${passosConcluidos}/${totalPassos}`}
            </div>
          </div>
        </div>
        <div style={{ height:3, background:'rgba(255,255,255,0.1)',
          borderRadius:2, marginTop:8, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pctProgresso}%`,
            background:'linear-gradient(90deg,#b5651d,#22c55e)',
            borderRadius:2, transition:'width 0.5s ease' }} />
        </div>
      </div>

      {/* CORPO: sidebar + conteúdo + contexto */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

        {/* SIDEBAR */}
        <div style={{ width:96, background:'#1a1714', display:'flex',
          flexDirection:'column', flexShrink:0 }}>
          <div style={{ padding:'8px 5px 5px', borderBottom:'1px solid rgba(255,255,255,0.06)',
            textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(247,241,230,0.75)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', padding:'0 2px' }}>
              {aluno.nome || `Nº ${aluno.numero}`}
            </div>
            <div style={{ fontSize:9, color:'rgba(247,241,230,0.3)', marginTop:1 }}>
              {aluno.turmaId}
            </div>
          </div>

          <div style={{ flex:1, padding:'6px 4px', display:'flex',
            flexDirection:'column', gap:1, overflowY:'auto' }}>
            {PASSOS.map((p, idx) => {
              const est = estadoPasso(p.id);
              const ativo = secAberta === p.id;
              return (
                <React.Fragment key={p.id}>
                  <button onClick={() => setSecAberta(p.id)} style={{
                    width:'100%', padding:'7px 4px', borderRadius:9, border:'none',
                    cursor:'pointer', textAlign:'center', transition:'all 0.2s',
                    background: ativo ? 'rgba(255,255,255,0.14)'
                      : est==='concluido' ? 'rgba(34,197,94,0.15)' : 'transparent',
                    position:'relative',
                  }}>
                    {ativo && <div style={{ position:'absolute', left:0, top:'20%',
                      height:'60%', width:3, background:p.cor,
                      borderRadius:'0 3px 3px 0' }} />}
                    <div style={{ fontSize:19, lineHeight:1 }}>
                      {est==='concluido' ? '✅' : p.emoji}
                    </div>
                    <div style={{ fontSize:8, fontWeight:700, marginTop:3, lineHeight:1.3,
                      color: ativo ? '#fff' : est==='concluido' ? '#4ade80' : 'rgba(247,241,230,0.4)' }}>
                      {p.label}
                    </div>
                  </button>
                  {idx < PASSOS.length-1 && (
                    <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'0 5px' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <button onClick={() => abrirKitchenFlow(undefined, {
              turma:aluno.turmaId, numero:aluno.numero,
              pin:aluno.pin, tipo:'aluno',
              ucId:plano.ucId, ucNome:plano.ucNome,
              pratos:fichas.map((f:any) => f.nomePrato).filter(Boolean),
              planoHoraInicio:plano.horaInicio,
              planoHoraFim:plano.horaFim, planoData:plano.data,
            })} style={{ margin:'5px', padding:'6px 4px', borderRadius:7,
            border:'1px solid rgba(14,116,144,0.5)',
            background:'rgba(14,116,144,0.15)', color:'#67e8f9',
            fontSize:8, fontWeight:700, cursor:'pointer', textAlign:'center' }}>
            🔗 KitchenFlow
          </button>

          <div style={{ padding:'7px 5px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ height:3, background:'rgba(255,255,255,0.1)',
              borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pctProgresso}%`,
                background:'linear-gradient(90deg,#b5651d,#22c55e)',
                borderRadius:2, transition:'width 0.4s' }} />
            </div>
            <div style={{ fontSize:10, fontWeight:800, color:'#fff',
              textAlign:'center', marginTop:3 }}>
              {passosConcluidos}/{totalPassos}
            </div>
          </div>
        </div>

        {/* ÁREA CENTRAL */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>

          {/* Banner do passo */}
          {passoActivo && (
            <div style={{ background:`linear-gradient(135deg,${passoActivo.cor},${passoActivo.cor}cc)`,
              padding:'10px 14px', flexShrink:0 }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.08em', color:'rgba(255,255,255,0.6)', marginBottom:2 }}>
                Passo {PASSOS.indexOf(passoActivo)+1} de {totalPassos}
              </div>
              <div style={{ fontSize:16, fontWeight:900, color:'#fff', lineHeight:1.2 }}>
                {passoActivo.emoji} {passoActivo.label}
              </div>
            </div>
          )}

          {/* Conteúdo */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 80px' }}>
            {secAberta==='orientacao' && (
              <PainelOrientacao plano={plano} fichas={fichas} aluno={aluno}
                onContinuar={() => { setOrientacaoConcluida(true); setSecAberta('entrada'); }} />
            )}
            {secAberta==='entrada' && (
              <SecaoEntrada aluno={aluno} plano={plano}
                onConcluido={() => { setEntradaConcluida(true); setSecAberta('ficha'); }} />
            )}
            {secAberta==='ficha' && (
              <SecaoFichas fichas={fichas} plano={plano} aluno={aluno}
                onConcluido={() => { setFichaConcluida(true);
                  setSecAberta(fichas.some((f:any)=>f.textoGuia) ? 'guia' : 'requisicao'); }} />
            )}
            {secAberta==='guia' && (
              <SecaoGuiao fichas={fichas} plano={plano}
                onConcluido={() => { setGuiaoConcluido(true); setSecAberta('requisicao'); }} />
            )}
            {secAberta==='requisicao' && (
              <SecaoRequisicao requisicao={requisicao}
                onConcluido={() => setSecAberta('avaliacao')} />
            )}
            {secAberta==='avaliacao' && (
              <SecaoAvaliacao fichas={fichas} plano={plano} aluno={aluno}
                onConcluido={() => setAvaliacaoConcluida(true)} />
            )}
          </div>
        </div>

        {/* PAINEL DE CONTEXTO */}
        <div style={{ width:115, background:'#fff',
          borderLeft:'0.5px solid rgba(26,23,20,0.08)',
          padding:'10px 8px', overflowY:'auto',
          display:'flex', flexDirection:'column', gap:10, flexShrink:0 }}>

          <div>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.08em', color:'rgba(26,23,20,0.3)', marginBottom:4 }}>
              Aula
            </div>
            {plano.horaInicio && (
              <div style={{ fontSize:10, padding:'3px 6px', background:'#eff6ff',
                color:'#1d4ed8', borderRadius:5, marginBottom:3, fontWeight:500 }}>
                🕗 {plano.horaInicio}–{plano.horaFim}
              </div>
            )}
            {plano.ucId && (
              <div style={{ fontSize:9, padding:'3px 6px', background:'#fff7ed',
                color:'#b5651d', borderRadius:5, fontWeight:700 }}>
                {plano.ucId}
              </div>
            )}
          </div>

          {fichas.length > 0 && (
            <div>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.08em', color:'rgba(26,23,20,0.3)', marginBottom:4 }}>
                Produzes
              </div>
              {fichas.map((f:any, i:number) => (
                <div key={i} style={{ fontSize:10, padding:'3px 6px', background:'#f8fafc',
                  color:'rgba(26,23,20,0.7)', borderRadius:5, marginBottom:3,
                  fontWeight:500, lineHeight:1.3 }}>
                  🍽️ {f.nomePrato}
                </div>
              ))}
            </div>
          )}

          <div>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.08em', color:'rgba(26,23,20,0.3)', marginBottom:4 }}>
              Estado
            </div>
            {PASSOS.map(p => {
              const est = estadoPasso(p.id);
              return (
                <div key={p.id} style={{ fontSize:9, padding:'3px 6px',
                  background: est==='concluido' ? '#f0fdf4' : '#fef2f2',
                  color: est==='concluido' ? '#15803d' : '#dc2626',
                  borderRadius:5, marginBottom:2, fontWeight:600 }}>
                  {est==='concluido' ? '✓' : '✗'} {p.label.split(' ')[0]}
                </div>
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
  // Extrair alertas HACCP das fichas
  const alertasHACCP: string[] = [];
  fichas.forEach(f => {
    (f.preparacao || []).forEach((p: any) => {
      if (p.haccp?.trim()) alertasHACCP.push(p.haccp.trim());
    });
  });

  // Alergénios de todas as fichas
  const alergenios = Array.from(new Set(
    fichas.flatMap(f => Array.isArray(f.alergenicos) ? f.alergenicos : [])
  )).filter(Boolean);

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>

      {/* Cabeçalho da aula — bloco roxo */}
      <div style={{ display:'flex', borderRadius:14, overflow:'hidden', marginBottom:10 }}>
        <div style={{ width:64, background:'rgba(109,40,217,0.8)', display:'flex',
          alignItems:'center', justifyContent:'center', fontSize:32, flexShrink:0 }}>📋</div>
        <div style={{ flex:1, background:'#6d28d9', padding:'14px 14px' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.6)',
            textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>Plano de hoje</div>
          <div style={{ fontSize:16, fontWeight:800, color:'#fff', lineHeight:1.25 }}>{plano.titulo}</div>
          {plano.ucId && <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:3 }}>
            {plano.ucId}{plano.ucNome ? ` — ${plano.ucNome}` : ''}
            {plano.horaInicio && ` · ${plano.horaInicio}–${plano.horaFim}`}
          </div>}
        </div>
      </div>

      {/* Aviso de alteração pelo professor após publicação */}
      {(plano as any).ultimaAlteracao && (
        <div style={{
          margin: '8px 0', padding: '12px 14px', borderRadius: 12,
          background: '#FFF3D6', border: '1.5px solid #FBC02D',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#5A3E00', marginBottom: 2 }}>
              O professor atualizou este plano
            </div>
            <div style={{ fontSize: 12, color: '#7A5500' }}>
              {(plano as any).ultimaAlteracao.descricao} ·{' '}
              {new Date((plano as any).ultimaAlteracao.em).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(90,62,0,0.6)', marginTop: 4 }}>
              Verifica as fichas, guia e requisição antes de começar.
            </div>
          </div>
        </div>
      )}

      {/* O que vamos produzir — bloco amarelo */}
      {fichas.length > 0 && fichas.map((f, i) => (
        <div key={i} style={{ display:'flex', borderRadius:14, overflow:'hidden', marginBottom:8 }}>
          <div style={{ width:64, background:'#c47f00', display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:30, flexShrink:0 }}>🍽️</div>
          <div style={{ flex:1, background:'#f4a900', padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.6)',
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Produção {i+1}</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{f.nomePrato}</div>
            {(f.numPorcoes || f.tempoPrep) && <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:2 }}>
              {f.numPorcoes && `${f.numPorcoes} doses`}{f.tempoPrep && ` · ${f.tempoPrep}`}
            </div>}
          </div>
        </div>
      ))}

      {/* Alertas HACCP — bloco coral */}
      {alertasHACCP.length > 0 && (
        <div style={{ display:'flex', borderRadius:14, overflow:'hidden', marginBottom:8 }}>
          <div style={{ width:64, background:'#b5291e', display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:30, flexShrink:0 }}>⚠️</div>
          <div style={{ flex:1, background:'#e63946', padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.65)',
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
              Pontos críticos — lê antes de começar!
            </div>
            {alertasHACCP.slice(0,3).map((a,i) => (
              <div key={i} style={{ fontSize:12, color:'#fff', marginBottom:3 }}>▸ {a}</div>
            ))}
          </div>
        </div>
      )}

      {/* Alergénios — bloco âmbar */}
      {alergenios.length > 0 && (
        <div style={{ display:'flex', borderRadius:14, overflow:'hidden', marginBottom:8 }}>
          <div style={{ width:64, background:'#c47f00', display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:30, flexShrink:0 }}>🏷️</div>
          <div style={{ flex:1, background:'#f4a900', padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.65)',
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Alergénios presentes</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {alergenios.map((a,i) => (
                <span key={i} style={{ padding:'2px 8px', borderRadius:100,
                  background:'rgba(255,255,255,0.25)', fontSize:11, fontWeight:800, color:'#fff' }}>{a}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KitchenFlow — bloco turquesa */}
      <div style={{ display:'flex', borderRadius:14, overflow:'hidden', marginBottom:10,
        cursor:'pointer' }} onClick={() => abrirKitchenFlow(undefined, {
          turma:aluno.turmaId, numero:aluno.numero, pin:aluno.pin, tipo:'aluno',
          ucId:plano.ucId, ucNome:plano.ucNome,
          pratos:fichas.map((f:any) => f.nomePrato).filter(Boolean),
          planoHoraInicio:plano.horaInicio, planoHoraFim:plano.horaFim, planoData:plano.data,
        })}>
        <div style={{ width:64, background:'#1a9e94', display:'flex',
          alignItems:'center', justifyContent:'center', fontSize:30, flexShrink:0 }}>🏭</div>
        <div style={{ flex:1, background:'#2ec4b6', padding:'12px 14px' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.65)',
            textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>KitchenFlow ECL</div>
          <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>Abrir registos iniciais →</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.65)', marginTop:2 }}>Higiene pessoal registada automaticamente</div>
        </div>
      </div>

      {/* Botão continuar — bloco roxo grande */}
      <div style={{ display:'flex', borderRadius:14, overflow:'hidden', cursor:'pointer' }}
        onClick={onContinuar}>
        <div style={{ width:64, background:'#5b21b6', display:'flex',
          alignItems:'center', justifyContent:'center', fontSize:32, flexShrink:0 }}>🚀</div>
        <div style={{ flex:1, background:'#6d28d9', padding:'16px 14px',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.6)',
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Ação principal</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>Vamos começar!</div>
          </div>
          <span style={{ fontSize:30, color:'rgba(255,255,255,0.5)' }}>›</span>
        </div>
      </div>
    </div>
  );
}

function SecaoEntrada({ aluno, plano, onConcluido }: {
  aluno: Aluno; plano: PlanoAula; onConcluido: () => void;
}) {
  const [pontVal, setPontVal] = useState<'sim'|'atras'|null>(null);
  const [fardState, setFardState] = useState<Record<string, boolean|null>>(
    Object.fromEntries(FARD_ITEMS.map(f => [f.id, null]))
  );
  const fardCompleto = Object.values(fardState).every(v => v !== null);
  const entradaOk = pontVal !== null && fardCompleto;

  function calcularMinutosAtraso(): number {
    const now = new Date();
    const [h,m] = plano.horaInicio.split(':').map(Number);
    return Math.max(1, (now.getHours()*60+now.getMinutes())-(h*60+m));
  }

  function setPont(v: 'sim'|'atras') {
    setPontVal(v);
  }

  function toggleFard(id: string) {
    setFardState(prev => {
      const cur = prev[id];
      return { ...prev, [id]: cur===null ? true : cur===true ? false : null };
    });
  }

  async function confirmar() {
    if (pontVal==='atras') incHist(`ecl_atrasos_${aluno.id}`);
    const fardamentoOk = Object.values(fardState).every(v => v===true);
    addRegistoPresenca({
      alunoId: aluno.id, turmaId: aluno.turmaId, planoAulaId: plano.id,
      presente: true, atrasado: pontVal==='atras',
      atrasadoMins: pontVal==='atras' ? calcularMinutosAtraso() : 0, fardamentoOk,
    });
    // Enviar automaticamente para o KitchenFlow — o aluno não precisa de fazer nada
    const nomeAluno = aluno.nome || `Aluno ${aluno.numero}`;
    registarHigieneKitchenFlow(aluno.turmaId, aluno.id, nomeAluno, fardamentoOk)
      .catch(() => {}); // falha silenciosa
    onConcluido();
  }

  return (
    <div>
      {/* Pontualidade — blocos coloridos */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', borderRadius:14, overflow:'hidden', marginBottom:8 }}>
          <div style={{ width:64, background:'#5b21b6', display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>⏰</div>
          <div style={{ flex:1, background:'#6d28d9', padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.6)',
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Passo 1</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>Chegaste a horas?</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {(['sim','atras'] as const).map(v => (
            <button key={v} onClick={() => setPont(v)} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:8,
              padding:'18px 12px', borderRadius:14, fontSize:14, fontWeight:800, cursor:'pointer',
              border:'none',
              background: pontVal===v ? (v==='sim'?'#2ec4b6':'#e63946') : 'rgba(26,23,20,0.07)',
              color: pontVal===v ? '#fff' : 'rgba(26,23,20,0.5)',
              transition:'all 0.15s',
            }}>
              <span style={{ fontSize:36 }}>{v==='sim'?'✅':'⏳'}</span>
              {v==='sim' ? 'Sim, a horas' : 'Não, atrasado/a'}
            </button>
          ))}
        </div>
        {pontVal==='atras' && (
          <div style={{ marginTop:8, display:'flex', borderRadius:12, overflow:'hidden' }}>
            <div style={{ width:48, background:'#b5291e', display:'flex',
              alignItems:'center', justifyContent:'center', fontSize:22 }}>⚠️</div>
            <div style={{ flex:1, background:'#e63946', padding:'10px 12px' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>Atraso registado automaticamente</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:2 }}>
                Aula começou às {plano.horaInicio}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fardamento — blocos coloridos */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', borderRadius:14, overflow:'hidden', marginBottom:8 }}>
          <div style={{ width:64, background:'#1a9e94', display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>👔</div>
          <div style={{ flex:1, background:'#2ec4b6', padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.6)',
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Passo 2</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>Fardamento e higiene</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.65)', marginTop:1 }}>Toca em cada item para confirmar</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {FARD_ITEMS.map(item => {
            const v = fardState[item.id];
            return (
              <button key={item.id} onClick={() => toggleFard(item.id)} style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                padding:'14px 10px', borderRadius:12, cursor:'pointer',
                fontSize:13, fontWeight:800, border:'none',
                background: v===true ? '#2ec4b6' : v===false ? '#e63946' : 'rgba(26,23,20,0.07)',
                color: v!==null ? '#fff' : 'rgba(26,23,20,0.5)',
                transition:'all 0.15s',
              }}>
                <span style={{ fontSize:28 }}>{item.emoji}</span>
                <span style={{ textAlign:'center', lineHeight:1.2, fontSize:12 }}>{item.label}</span>
                <span style={{ fontSize:20, fontWeight:900 }}>
                  {v===true ? '✓' : v===false ? '✗' : '?'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display:'flex', borderRadius:14, overflow:'hidden',
        cursor: entradaOk ? 'pointer' : 'not-allowed', opacity: entradaOk ? 1 : 0.45 }}
        onClick={entradaOk ? confirmar : undefined}>
        <div style={{ width:64, background: entradaOk ? '#c47f00' : 'rgba(26,23,20,0.15)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
          {entradaOk ? '✅' : '⏳'}
        </div>
        <div style={{ flex:1, background: entradaOk ? '#f4a900' : 'rgba(26,23,20,0.1)',
          padding:'14px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:15, fontWeight:800, color: entradaOk ? '#fff' : 'rgba(26,23,20,0.4)' }}>
            {entradaOk ? 'Confirmar e continuar' : 'Preenche todos os campos primeiro'}
          </div>
          <span style={{ fontSize:28, color: entradaOk ? 'rgba(255,255,255,0.6)' : 'rgba(26,23,20,0.2)' }}>›</span>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// PAINEL KITCHENFLOW — registos obrigatórios da ficha
// ─────────────────────────────────────────────────────────────
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
            import('./GerarPDFGuiao').then(({ gerarPDFGuiao }) => {
              const guia = (fichaGuiao as any).guiaParsed || { secoes: [], equilibrioSensorial: [] };
              gerarPDFGuiao({
                nomePrato: fichaGuiao.nomePrato || '',
                ucId: plano.ucId,
                ucNome: plano.ucNome,
                guia,
                textoOriginal: (fichaGuiao as any).textoGuia || '',
              });
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

              {(f as any).textoGuia && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.05em', color:T.sage, marginBottom:8 }}>📚 Guia de Apoio</div>
                  <GuiaProducao textoGuia={(f as any).textoGuia} nomePrato={f.nomePrato||''} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <button onClick={onConcluido} style={{ width:'100%', padding:'14px', borderRadius:12,
        border:'none', background:'#2980b9', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', marginTop:6 }}>
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

  // Usar família das fichas como filtro principal — mais preciso que filtro por UC
  // Combina família1 + família2 + etiquetas de todas as fichas do plano
  const familia1 = fichas.length > 0 ? (fichas[0] as any).familia1 : undefined;
  const familia2 = fichas.length > 0 ? (fichas[0] as any).familia2 : undefined;
  const etiquetas = fichas.flatMap((f: any) => f.etiquetas || []);
  const microsDaUCEsp = (familia1 || familia2)
    ? microsPorFamilia(familia1, familia2, etiquetas, ucId)
    : ucId ? microsPorUC(ucId) : [];
  const microsEstr = MICROCOMPETENCIAS.filter(m => m.prioridade==='A');
  const microsDaUC = microsDaUCEsp.length>=3
    ? microsDaUCEsp
    : [...microsDaUCEsp,...microsEstr.filter(m=>!microsDaUCEsp.find(x=>x.id===m.id))].slice(0,8);
  const microsSug = microsDaUC
    .filter(m => !compRemovidas.includes(m.id)).slice(0,6)
    .map(m => {
      const hist = getHistoricoAlunoMicro(aluno.id, m.id);
      const avs = hist.map(h=>({nota:h.nota,data:h.data}));
      const emReg = estaEmRegressao(avs);
      const motivo = emReg?'⚠️ Em regressão':avs.length===0?'★ Nunca avaliada':!jaTeveSucesso(avs)?'↑ Em desenvolvimento':'✓ Consolidada';
      return {...m, motivo};
    });

  const [nivelHigiene, setNivelHigiene] = useState<string|null>(null);
  const [nivelHaccp, setNivelHaccp] = useState<string|null>(null);
  const [notasMicro, setNotasMicro] = useState<Record<string,string|null>>({});
  const [microAberta, setMicroAberta] = useState<string|null>(null);
  const [atitudeEscolhida, setAtitudeEscolhida] = useState<string|null>(null);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [submetido, setSubmetido] = useState(() => {
    try { return !!localStorage.getItem(`avaliacao_submetida_${plano.id}_${aluno.id}`); } catch { return false; }
  });

  const OPCOES = [
    { v:'sozinho', label:'Consigo sozinho/a', emoji:'💪', cor:T.sage,   bg:T.sageP },
    { v:'ajuda',   label:'Com ajuda',          emoji:'🤝', cor:T.copper, bg:T.copperP },
    { v:'nao',     label:'Ainda não consigo',  emoji:'📖', cor:T.danger, bg:T.dangerP },
  ];

  const prontoParaSubmeter = nivelHigiene!==null && nivelHaccp!==null;

  function submeterDefinitivo() {
    const agora = new Date().toISOString();
    const paraNivel = (v:string|null): 'nao_atingi'|'desenvolvimento'|'atingi'|'superei' =>
      v==='sozinho'?'atingi':v==='ajuda'?'desenvolvimento':'nao_atingi';
    if (nivelHigiene) addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_hig_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:'OBR_01',nota:nivelHigiene==='sozinho'?15:nivelHigiene==='ajuda'?10:5,data:agora,validadoPor:'aluno'});
    if (nivelHaccp) addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_hac_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:'OBR_02',nota:nivelHaccp==='sozinho'?15:nivelHaccp==='ajuda'?10:5,data:agora,validadoPor:'aluno'});
    Object.entries(notasMicro).forEach(([mId,v])=>{if(v)addRegistoAvaliacao({id:`${plano.id}_${aluno.id}_${mId}_${Date.now()}`,alunoId:aluno.id,turmaId:aluno.turmaId,planoAulaId:plano.id,fichaId:'',ucId,microcompetenciaId:mId,nota:v==='sozinho'?15:v==='ajuda'?10:5,data:agora,validadoPor:'aluno'});});
    addOrUpdateSelecao({id:`sel_${plano.id}_${aluno.id}`,comandaId:plano.id,planoAulaId:plano.id,fichaId:'',alunoId:aluno.id,turmaId:aluno.turmaId,tecnicas:Object.keys(notasMicro),atitudes:atitudeEscolhida?[atitudeEscolhida]:[],responsabilidades:[],autoavaliacoes:[],criadaEm:agora});
    try { localStorage.setItem(`avaliacao_submetida_${plano.id}_${aluno.id}`, agora); } catch {}
    setSubmetido(true); setModalConfirmar(false); onConcluido();
  }

  if (submetido) return (
    <div style={{ textAlign:'center', padding:'24px' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
      <div style={{ fontSize:17, fontWeight:700, color:T.sage }}>Autoavaliação enviada!</div>
      <div style={{ fontSize:14, color:'rgba(26,23,20,0.55)', marginTop:6 }}>O professor vai validar o teu registo.</div>
    </div>
  );

  return (
    <div>
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
                  background:obr.val===op.v?op.bg:'#fff', color:obr.val===op.v?op.cor:'rgba(26,23,20,0.5)',
                  fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'center',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                }}>
                  <span style={{ fontSize:24 }}>{op.emoji}</span>
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Técnicas */}
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
                  <div style={{ fontWeight:700, fontSize:14 }}>{m.nome}</div>
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginTop:2 }}>{m.motivo}</div>
                </div>
                {notasMicro[m.id] && <span style={{ fontSize:24 }}>
                  {notasMicro[m.id]==='sozinho'?'💪':notasMicro[m.id]==='ajuda'?'🤝':'📖'}
                </span>}
                <span style={{ fontSize:18, color:T.copper, transform:microAberta===m.id?'rotate(90deg)':'none', transition:'0.2s' }}>›</span>
              </button>
              {microAberta===m.id && (
                <div style={{ padding:'12px 16px', borderTop:`2px solid ${T.copper}`, background:'#fdfcfb' }}>
                  <CriteriosComp compId={m.id} cor={T.copper} abertaInicial={true} />
                  <div style={{ marginTop: 12 }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    {OPCOES.map(op => (
                      <button key={op.v} onClick={() => setNotasMicro(p=>({...p,[m.id]:p[m.id]===op.v?null:op.v}))} style={{
                        padding:'12px 6px', borderRadius:10, border:`2px solid ${notasMicro[m.id]===op.v?op.cor:T.border}`,
                        background:notasMicro[m.id]===op.v?op.bg:'#fff', color:notasMicro[m.id]===op.v?op.cor:'rgba(26,23,20,0.5)',
                        fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'center',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      }}>
                        <span style={{ fontSize:24 }}>{op.emoji}</span>
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Atitude */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase',
          letterSpacing:'0.06em', color:'#7d4f8c', marginBottom:12 }}>💡 A tua atitude — escolhe uma</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {ATITUDES.filter(a=>!compRemovidas.includes(a.id)).slice(0,12).map(a => (
            <button key={a.id} onClick={() => setAtitudeEscolhida(a.id===atitudeEscolhida?null:a.id)} style={{
              padding:'12px', borderRadius:12, fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left',
              border:`1.5px solid ${atitudeEscolhida===a.id?'#7d4f8c':T.border}`,
              background:atitudeEscolhida===a.id?'rgba(125,79,140,0.08)':'#fff',
              color:atitudeEscolhida===a.id?'#7d4f8c':'rgba(26,23,20,0.7)',
            }}>
              {atitudeEscolhida===a.id?'✓ ':''}{a.nome}
            </button>
          ))}
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
              <div>🔒 Higiene: {nivelHigiene==='sozinho'?'💪 Sozinho/a':nivelHigiene==='ajuda'?'🤝 Com ajuda':'📖 A aprender'}</div>
              <div style={{ marginTop:4 }}>🔒 HACCP: {nivelHaccp==='sozinho'?'💪 Sozinho/a':nivelHaccp==='ajuda'?'🤝 Com ajuda':'📖 A aprender'}</div>
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
