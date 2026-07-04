import React, { useState } from 'react';
import { Perfil } from '../types';
import { LOGO_ECL as logoEcl } from '../logo_ecl';

// ─── Ícones SVG inline (sem dependências) ────────────────────────────────────
const Icon = {
  planos:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  ficha:      () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  guia:       () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  req:        () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  validacao:  () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  biblioteca: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  manual:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  avaliacao:  () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  backup:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  recuper:    () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
  mapa:       () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  eventos:    () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  sair:       () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  sync:       () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
  menu:       () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  chef:       () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>,
};

// ─── Paleta ──────────────────────────────────────────────────────────────────
const INDIGO = '#1e1b4b';
const INDIGO_MID = '#312e81';
const INDIGO_LIGHT = '#4338ca';
const INDIGO_ACTIVE_BG = 'rgba(255,255,255,0.12)';
const INDIGO_HOVER_BG = 'rgba(255,255,255,0.07)';
const TEXT_MAIN = '#1e293b';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';
const WHITE = '#ffffff';
const SURFACE = '#ffffff';

// ─── Tipos de navegação ──────────────────────────────────────────────────────
export type VistaProf = 'planos' | 'ficha' | 'guia' | 'requisicao' | 'validacao' | 'biblioteca' | 'avaliacao_uc' | 'copia_seguranca' | 'gestao_recuperacoes' | 'mapa_competencias' | 'manual' | 'eventos';

interface NavItem {
  id: VistaProf;
  label: string;
  IconComp: () => JSX.Element;
  secao?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'planos',              label: 'Planos de Aula',       IconComp: Icon.planos,    secao: 'Pedagógico' },
  { id: 'ficha',               label: 'Ficha Técnica',        IconComp: Icon.ficha,     secao: 'Pedagógico' },
  { id: 'guia',                label: 'Guia de Produção',     IconComp: Icon.guia,      secao: 'Pedagógico' },
  { id: 'requisicao',          label: 'Requisição',           IconComp: Icon.req,       secao: 'Pedagógico' },
  { id: 'eventos',             label: 'Eventos',              IconComp: Icon.eventos,   secao: 'Pedagógico' },
  { id: 'validacao',           label: 'Validação',            IconComp: Icon.validacao, secao: 'Avaliação' },
  { id: 'avaliacao_uc',        label: 'Avaliação por UC',     IconComp: Icon.avaliacao, secao: 'Avaliação' },
  { id: 'mapa_competencias',   label: 'Mapa de Competências', IconComp: Icon.mapa,      secao: 'Avaliação' },
  { id: 'gestao_recuperacoes', label: 'Recuperações',         IconComp: Icon.recuper,   secao: 'Avaliação' },
  { id: 'biblioteca',          label: 'Biblioteca',           IconComp: Icon.biblioteca,secao: 'Recursos' },
  { id: 'manual',              label: 'Manual do Cozinheiro', IconComp: Icon.manual,    secao: 'Recursos' },
  { id: 'copia_seguranca',     label: 'Cópia de Segurança',   IconComp: Icon.backup,    secao: 'Recursos' },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ vistaAtiva, onNavegar, nomeProfessor, onSair, aberta, onFechar }: {
  vistaAtiva: VistaProf;
  onNavegar: (v: VistaProf) => void;
  nomeProfessor: string;
  onSair: () => void;
  aberta: boolean;
  onFechar: () => void;
}) {
  const secoes = [...new Set(NAV_ITEMS.map(n => n.secao))];
  const iniciais = nomeProfessor ? nomeProfessor.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : 'P';

  return (
    <>
      {/* Overlay mobile */}
      {aberta && (
        <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }} />
      )}

      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 240,
        background: INDIGO,
        display: 'flex', flexDirection: 'column',
        zIndex: 200,
        transform: aberta ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: INDIGO_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon.chef />
            </div>
            <div>
              <div style={{ color: WHITE, fontWeight: 800, fontSize: 15, lineHeight: 1.2, fontFamily: "'Nunito', 'DM Sans', sans-serif" }}>Avaliação ECL</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 1 }}>Escola de Comércio</div>
            </div>
          </div>
        </div>

        {/* Perfil */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: INDIGO_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: WHITE, flexShrink: 0 }}>
            {iniciais}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nomeProfessor || 'Professor'}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Professor</div>
          </div>
        </div>

        {/* Navegação */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {secoes.map(secao => (
            <div key={secao} style={{ marginBottom: 8 }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 10px 4px' }}>
                {secao}
              </div>
              {NAV_ITEMS.filter(n => n.secao === secao).map(item => {
                const ativo = vistaAtiva === item.id;
                return (
                  <button key={item.id} onClick={() => { onNavegar(item.id); onFechar(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: ativo ? INDIGO_ACTIVE_BG : 'transparent',
                      color: ativo ? WHITE : 'rgba(255,255,255,0.55)',
                      fontSize: 13, fontWeight: ativo ? 600 : 400,
                      textAlign: 'left', marginBottom: 2,
                      transition: 'all 0.15s',
                      borderLeft: ativo ? '3px solid rgba(255,255,255,0.8)' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = INDIGO_HOVER_BG; }}
                    onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <span style={{ opacity: ativo ? 1 : 0.6, flexShrink: 0 }}><item.IconComp /></span>
                    <span style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sair */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={onSair} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,255,255,0.45)',
            fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <Icon.sair />
            <span>Sair da sessão</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Topbar (mobile + sync) ───────────────────────────────────────────────────
function Topbar({ nomeProfessor, syncStatus, onAtualizar, onAbrirMenu, perfil, onSair, subtitulo }: {
  nomeProfessor?: string;
  syncStatus?: 'idle' | 'syncing' | 'ok' | 'offline';
  onAtualizar?: () => void;
  onAbrirMenu: () => void;
  perfil: Perfil;
  onSair: () => void;
  subtitulo?: string;
}) {
  const syncInfo = syncStatus === 'syncing' ? { cor: '#f59e0b', txt: 'A sincronizar' }
    : syncStatus === 'ok' ? { cor: '#10b981', txt: 'Guardado' }
    : syncStatus === 'offline' ? { cor: '#ef4444', txt: 'Sem ligação' }
    : null;

  const perfilLabel: Record<Perfil, string> = { aluno: 'Aluno', professor: 'Professor', coordenadora: 'Coordenadora' };

  return (
    <header style={{
      height: 60,
      background: '#ffffff',
      borderBottom: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center',
      padding: '0 16px 0 20px',
      gap: 12,
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Botão menu (mobile) / Logo no desktop */}
      <button onClick={onAbrirMenu} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Icon.menu />
      </button>

      {/* Logo ECL */}
      <img src={logoEcl} alt="ECL" style={{ height: 32, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />

      {/* Título */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: TEXT_MAIN, fontFamily: "'Nunito', 'DM Sans', sans-serif", lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitulo || 'Avaliação ECL'}
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>
          {perfilLabel[perfil]}{nomeProfessor ? ` · ${nomeProfessor}` : ''}
        </div>
      </div>

      {/* Sync */}
      {syncInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: syncInfo.cor, flexShrink: 0, animation: syncStatus === 'syncing' ? 'pulse 1.5s infinite' : 'none' }} />
          <span style={{ fontSize: 11, color: TEXT_MUTED, whiteSpace: 'nowrap' }}>{syncInfo.txt}</span>
        </div>
      )}

      {/* Botão actualizar */}
      {onAtualizar && (
        <button onClick={onAtualizar} disabled={syncStatus === 'syncing'}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT_MUTED, fontSize: 12, fontWeight: 600, cursor: syncStatus === 'syncing' ? 'default' : 'pointer', opacity: syncStatus === 'syncing' ? 0.6 : 1, flexShrink: 0, transition: 'all 0.15s' }}>
          <Icon.sync />
          <span style={{ display: 'none' }}>Actualizar</span>
        </button>
      )}
    </header>
  );
}

// ─── Header principal (exportado) ────────────────────────────────────────────
// Nas vistas de professor, o Header.tsx agora exporta também a Sidebar e o layout
// Para que o App.tsx não precise de grande refactoring, exportamos:
//   - Header (topbar simples para aluno/coordenadora)
//   - LayoutProfessor (sidebar + topbar + conteúdo)

export function Header({ perfil, subtitulo, onSair, nomeProfessor, syncStatus, onAtualizar }: {
  perfil: Perfil;
  subtitulo?: string;
  onSair: () => void;
  nomeProfessor?: string;
  syncStatus?: 'idle' | 'syncing' | 'ok' | 'offline';
  onAtualizar?: () => void;
}) {
  return (
    <Topbar
      perfil={perfil}
      nomeProfessor={nomeProfessor}
      syncStatus={syncStatus}
      onAtualizar={onAtualizar}
      onAbrirMenu={() => {}}
      onSair={onSair}
      subtitulo={subtitulo}
    />
  );
}

// ─── Layout completo para professor (sidebar + topbar + slot de conteúdo) ────
export function LayoutProfessor({ vistaAtiva, onNavegar, nomeProfessor, onSair, syncStatus, onAtualizar, children }: {
  vistaAtiva: VistaProf;
  onNavegar: (v: VistaProf) => void;
  nomeProfessor: string;
  onSair: () => void;
  syncStatus?: 'idle' | 'syncing' | 'ok' | 'offline';
  onAtualizar?: () => void;
  children: React.ReactNode;
}) {
  const [sidebarAberta, setSidebarAberta] = useState(true);

  // No mobile começa fechada
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  React.useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const aberta = isMobile ? sidebarAberta : true;

  const itemAtivo = NAV_ITEMS.find(n => n.id === vistaAtiva);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <Sidebar
        vistaAtiva={vistaAtiva}
        onNavegar={onNavegar}
        nomeProfessor={nomeProfessor}
        onSair={onSair}
        aberta={aberta}
        onFechar={() => setSidebarAberta(false)}
      />

      {/* Área principal — com margem para a sidebar no desktop */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', marginLeft: isMobile ? 0 : 240, minWidth: 0, transition: 'margin-left 0.25s' }}>
        {/* Topbar */}
        <Topbar
          perfil="professor"
          nomeProfessor={nomeProfessor}
          syncStatus={syncStatus}
          onAtualizar={onAtualizar}
          onAbrirMenu={() => setSidebarAberta(s => !s)}
          onSair={onSair}
          subtitulo={itemAtivo?.label}
        />

        {/* Breadcrumb / título da secção */}
        <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: INDIGO + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INDIGO_LIGHT }}>
            {itemAtivo && <itemAtivo.IconComp />}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT_MAIN, fontFamily: "'Nunito', 'DM Sans', sans-serif", lineHeight: 1.2 }}>
              {itemAtivo?.label || 'Avaliação ECL'}
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
              Avaliação ECL · {nomeProfessor}
            </p>
          </div>
        </div>

        {/* Conteúdo */}
        <main style={{ flex: 1, padding: '16px 24px 32px', background: '#ffffff', minWidth: 0 }}>
          {children}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .app-shell { background: #ffffff !important; }
        body { background: #ffffff !important; }
        #root { background: #ffffff !important; }
      `}</style>
    </div>
  );
}
