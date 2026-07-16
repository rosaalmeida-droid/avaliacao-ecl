import React, { useState } from 'react';
import { PainelContextual, ContextoPainel } from './PainelContextual';

// Calcula progresso real do ano letivo 2026-2027
// Datas fixas do cronograma ECL: 17 set 2026 → 1 jun 2027
function calcularAnoLetivo(): { anoLetivo: string; semestre: string; percentagem: number } {
  const hoje = new Date();
  const inicio = new Date('2026-09-17');
  const fim    = new Date('2027-06-01');
  const total  = fim.getTime() - inicio.getTime();
  const decorrido = Math.max(0, Math.min(hoje.getTime() - inicio.getTime(), total));
  const pct = Math.round((decorrido / total) * 100);
  const mes = hoje.getMonth(); // 0=jan
  // Trimestres pedagógicos reais ECL
  // 1º Trimestre: set(8)-dez(11) | 2º Trimestre: jan(0)-mar(2) | 3º Trimestre: abr(3)-jun(5)
  // Fora do ano lectivo: jul(6)-ago(7)
  let periodo: string;
  if (mes >= 8 && mes <= 11)      periodo = '1º Trimestre em curso';
  else if (mes >= 0 && mes <= 2)  periodo = '2º Trimestre em curso';
  else if (mes >= 3 && mes <= 5)  periodo = '3º Trimestre em curso';
  else                             periodo = 'Férias de Verão';
  return {
    anoLetivo: '2026/27',
    semestre: periodo,
    percentagem: pct < 0 ? 0 : pct > 100 ? 100 : pct,
  };
}
import { Perfil } from '../types';
import { LOGO_ECL as logoEcl } from '../logo_ecl';

// ── Paleta exacta do Figma Make ───────────────────────────────
const SIDEBAR_BG   = '#5B67EA';
const SIDEBAR_TXT  = 'rgba(255,255,255,0.80)';
const SIDEBAR_ACT  = 'rgba(255,255,255,0.15)';
const SIDEBAR_HVR  = 'rgba(255,255,255,0.08)';
const SIDEBAR_BDR  = 'rgba(255,255,255,0.10)';
const APP_BG       = '#F2F5FF';
const CARD_BG      = '#ffffff';
const FG           = '#1C1F3A';
const MUTED        = '#7880A8';
const BORDER       = 'rgba(91,103,234,0.12)';
const PRIMARY      = '#5B67EA';
const ACCENT       = '#00B8A9';
const WHITE        = '#ffffff';

// ── Tipo de vistas ─────────────────────────────────────────────
export type VistaProf = 'planos' | 'ficha' | 'guia' | 'requisicao' | 'validacao' | 'biblioteca' | 'avaliacao_uc' | 'copia_seguranca' | 'gestao_recuperacoes' | 'mapa_competencias' | 'manual' | 'eventos' | 'cronograma' | 'orcamentos' | 'historial' | 'ajuda';

// ── Ícones SVG inline ─────────────────────────────────────────
const Icons = {
  planos:     <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  ficha:      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  guia:       <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  req:        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  eventos:    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  validacao:  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  avaliacao:  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  mapa:       <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  recuper:    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
  biblioteca: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  manual:     <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  backup:     <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  dicionario: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  cronograma: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/></svg>,
  menu:       <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  sair:       <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chef:       <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>,
  chevron:    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
  sync:       <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
};

// ── Itens de navegação ────────────────────────────────────────
interface NavItem { id: VistaProf; label: string; icon: JSX.Element; secao: string }

const NAV: NavItem[] = [
  // ── DIA A DIA ──────────────────────────────────────────
  { id: 'planos',              label: 'Planos de Aula',       icon: Icons.planos,      secao: 'Dia a dia' },
  { id: 'eventos',             label: 'Eventos',              icon: Icons.eventos,     secao: 'Dia a dia' },
  { id: 'orcamentos',          label: 'Orçamentos',           icon: Icons.req,         secao: 'Dia a dia' },
  // ── AVALIAÇÃO ──────────────────────────────────────────
  { id: 'historial',           label: 'Historial',            icon: Icons.avaliacao,   secao: 'Avaliação' },
  { id: 'avaliacao_uc',        label: 'Avaliação por UC',     icon: Icons.avaliacao,   secao: 'Avaliação' },
  { id: 'mapa_competencias',   label: 'Mapa de Competências', icon: Icons.mapa,      secao: 'Avaliação' },
  { id: 'gestao_recuperacoes', label: 'Recuperações',         icon: Icons.recuper,   secao: 'Avaliação' },
  { id: 'manual',              label: 'Manual do Cozinheiro', icon: Icons.manual,    secao: 'Recursos' },
  { id: 'copia_seguranca',     label: 'Cópia de Segurança',   icon: Icons.backup,    secao: 'Recursos' },
];

// ── Sidebar ────────────────────────────────────────────────────
function Sidebar({ vistaAtiva, onNavegar, nomeProfessor, turmaId, onSair, aberta, isMobile, onFechar }: {
  vistaAtiva: VistaProf;
  onNavegar: (v: VistaProf) => void;
  nomeProfessor: string;
  turmaId?: string;
  onSair: () => void;
  aberta: boolean;
  isMobile: boolean;
  onFechar: () => void;
}) {
  const secoes = [...new Set(NAV.map(n => n.secao))];
  const iniciais = nomeProfessor
    ? nomeProfessor.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'P';

  return (
    <>
      {aberta && isMobile && (
        <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 199 }} />
      )}
      <aside className="ecl-sidebar" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
        background: SIDEBAR_BG,
        display: 'flex', flexDirection: 'column',
        zIndex: 200,
        transform: aberta ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '4px 0 32px rgba(91,103,234,0.18)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${SIDEBAR_BDR}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: WHITE }}>
              {Icons.chef}
            </div>
            <div>
              <div style={{ color: WHITE, fontWeight: 800, fontSize: 14, lineHeight: 1.2, fontFamily: "'Nunito', 'DM Sans', sans-serif" }}>Avaliação ECL</div>
              <div style={{ color: SIDEBAR_TXT, fontSize: 11, marginTop: 1 }}>Escola de Comércio</div>
            </div>
          </div>
        </div>

        {/* Perfil */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SIDEBAR_BDR}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: WHITE, flexShrink: 0 }}>
            {iniciais}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nomeProfessor || 'Professor'}
            </div>
            <div style={{ color: SIDEBAR_TXT, fontSize: 11 }}>Professor</div>
          </div>
        </div>

        {/* Navegação */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {secoes.map(secao => (
            <div key={secao} style={{ marginBottom: 10 }}>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '5px 10px 4px' }}>
                {secao}
              </div>
              {NAV.filter(n => n.secao === secao).map(item => {
                const ativo = vistaAtiva === item.id;
                return (
                  <button key={item.id} onClick={() => { onNavegar(item.id); if (isMobile) onFechar(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: ativo ? SIDEBAR_ACT : 'transparent',
                      color: ativo ? WHITE : SIDEBAR_TXT,
                      fontSize: 13, fontWeight: ativo ? 600 : 400,
                      textAlign: 'left', marginBottom: 1,
                      transition: 'all 0.13s',
                    }}
                    onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = SIDEBAR_HVR; }}
                    onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <span style={{ opacity: ativo ? 1 : 0.6, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {ativo && <span style={{ opacity: 0.5, display: 'flex' }}>{Icons.chevron}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Ano lectivo */}
        <div style={{ margin: '0 12px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.10)', padding: '12px 14px', border: `1px solid ${SIDEBAR_BDR}` }}>
          {(() => {
            const al = calcularAnoLetivo();
            return (<>
              <div style={{ color: WHITE, fontSize: 12, fontWeight: 700, marginBottom: 2, fontFamily: "'Nunito', sans-serif" }}>Ano Lectivo {al.anoLetivo}</div>
              {turmaId && <div style={{ color: WHITE, fontSize: 13, fontWeight: 800, marginBottom: 2 }}>🏫 {turmaId}</div>}
              <div style={{ color: SIDEBAR_TXT, fontSize: 11, marginBottom: 8 }}>{al.semestre}</div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${al.percentagem}%`, background: WHITE, borderRadius: 99, transition: 'width 0.4s' }} />
              </div>
              <div style={{ color: SIDEBAR_TXT, fontSize: 10, marginTop: 5 }}>{al.percentagem}% concluído</div>
            </>);
          })()}
        </div>

        {/* KitchenFlow */}
        <div style={{ padding: '0 10px 8px' }}>
          <button onClick={() => window.open('https://ecl-haccp.vercel.app/', '_blank')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)',
              fontSize: 13, fontWeight: 600, textAlign: 'left', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>🏭</span>
            <span>KitchenFlow ECL</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>↗</span>
          </button>
        </div>

        {/* Sair */}
        <div style={{ padding: '0 10px 14px' }}>
          <button onClick={onSair} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,255,255,0.45)',
            fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; }}
          >
            {Icons.sair}
            <span>Sair da sessão</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Topbar ─────────────────────────────────────────────────────
function Topbar({ nomeProfessor, syncStatus, onAtualizar, onAbrirMenu, perfil, subtitulo }: {
  nomeProfessor?: string;
  syncStatus?: 'idle' | 'syncing' | 'ok' | 'offline';
  onAtualizar?: () => void;
  onAbrirMenu: () => void;
  perfil: Perfil;
  subtitulo?: string;
}) {
  const syncInfo = syncStatus === 'syncing' ? { cor: '#F6A623', txt: 'A sincronizar' }
    : syncStatus === 'ok'      ? { cor: ACCENT,    txt: 'Guardado' }
    : syncStatus === 'offline' ? { cor: '#E53E3E', txt: 'Sem ligação' }
    : null;

  const perfilLabel: Record<Perfil, string> = { aluno: 'Aluno', professor: 'Professor', coordenadora: 'Coordenadora' };

  return (
    <header className="ecl-topbar" style={{
      height: 58,
      background: CARD_BG,
      borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      gap: 12,
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 4px rgba(91,103,234,0.07)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <button onClick={onAbrirMenu} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {Icons.menu}
      </button>

      <img src={logoEcl} alt="ECL" style={{ height: 30, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: FG, fontFamily: "'Nunito', 'DM Sans', sans-serif", lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitulo || 'Avaliação ECL'}
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
          {perfilLabel[perfil]}{nomeProfessor ? ` · ${nomeProfessor}` : ''}
        </div>
      </div>

      {syncInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '4px 10px', borderRadius: 20, background: syncInfo.cor + '15' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: syncInfo.cor, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: syncInfo.cor, fontWeight: 600, whiteSpace: 'nowrap' }}>{syncInfo.txt}</span>
        </div>
      )}

      {onAtualizar && (
        <button onClick={onAtualizar} disabled={syncStatus === 'syncing'}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD_BG, color: MUTED, fontSize: 12, fontWeight: 600, cursor: syncStatus === 'syncing' ? 'default' : 'pointer', opacity: syncStatus === 'syncing' ? 0.6 : 1, flexShrink: 0, transition: 'all 0.15s' }}>
          {Icons.sync}
        </button>
      )}
    </header>
  );
}

// ── Header simples (aluno / coordenadora) ──────────────────────
export function Header({ perfil, subtitulo, onSair, nomeProfessor, syncStatus, onAtualizar }: {
  perfil: Perfil;
  subtitulo?: string;
  onSair: () => void;
  nomeProfessor?: string;
  syncStatus?: 'idle' | 'syncing' | 'ok' | 'offline';
  onAtualizar?: () => void;
}) {
  return (
    <Topbar perfil={perfil} nomeProfessor={nomeProfessor} syncStatus={syncStatus}
      onAtualizar={onAtualizar} onAbrirMenu={() => {}} subtitulo={subtitulo} />
  );
}

// ── Layout completo do professor ────────────────────────────────
export function LayoutProfessor({ vistaAtiva, onNavegar, nomeProfessor, turmaId, onSair, syncStatus, onAtualizar, contextoPainel, children }: {
  vistaAtiva: VistaProf;
  onNavegar: (v: VistaProf) => void;
  nomeProfessor: string;
  turmaId?: string;
  onSair: () => void;
  syncStatus?: 'idle' | 'syncing' | 'ok' | 'offline';
  onAtualizar?: () => void;
  contextoPainel?: ContextoPainel;
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [sidebarAberta, setSidebarAberta] = useState(false);

  React.useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const aberta = isMobile ? sidebarAberta : true;
  const itemAtivo = NAV.find(n => n.id === vistaAtiva);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: APP_BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar
        vistaAtiva={vistaAtiva}
        onNavegar={onNavegar}
        nomeProfessor={nomeProfessor}
        turmaId={turmaId}
        onSair={onSair}
        aberta={aberta}
        isMobile={isMobile}
        onFechar={() => setSidebarAberta(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: isMobile ? 0 : 240, minWidth: 0, transition: 'margin-left 0.22s', background: APP_BG }}>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Área principal */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Topbar
              perfil="professor"
              nomeProfessor={nomeProfessor}
              syncStatus={syncStatus}
              onAtualizar={onAtualizar}
              onAbrirMenu={() => setSidebarAberta(s => !s)}
              subtitulo={itemAtivo?.label}
            />

            {/* Banner da secção activa */}
            <div style={{ padding: '20px 28px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: PRIMARY + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY }}>
                  {itemAtivo?.icon}
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: FG, fontFamily: "'Nunito', 'DM Sans', sans-serif", lineHeight: 1.2 }}>
                    {itemAtivo?.label || 'Avaliação ECL'}
                  </h1>
                  <p style={{ margin: 0, fontSize: 12, color: MUTED, marginTop: 2 }}>
                    Avaliação ECL · {nomeProfessor}
                  </p>
                </div>
              </div>
            </div>

            <main style={{ flex: 1, padding: '0 28px 36px', minWidth: 0, background: APP_BG }}>
              {children}
            </main>
          </div>

          {/* Painel contextual fixo à direita — só desktop */}
          {!isMobile && contextoPainel && (
            <PainelContextual contexto={contextoPainel} isMobile={isMobile} />
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        body { background: ${APP_BG} !important; }
        #root { background: ${APP_BG} !important; }
        .app-shell { background: ${APP_BG} !important; }
        @media print {
          .ecl-sidebar, .ecl-topbar { display: none !important; }
          body > div > div:last-child { margin-left: 0 !important; width: 100% !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
