import React, { useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// ModalFullscreen — padrão geral de "abrir quase todo o ecrã"
//
// Uso: envolve o conteúdo que queres mostrar em destaque. O resto
// da aplicação fica visível por trás, semi-transparente/desfocado,
// para dar contexto sem distrair. Fechar (X, Esc, ou clicar fora)
// chama onFechar — usa isso para gravar automaticamente antes de
// sair, se for caso disso.
//
// Exemplo:
//   const [aberto, setAberto] = useState(false);
//   ...
//   {aberto && (
//     <ModalFullscreen titulo="Ficha Técnica" onFechar={() => { guardar(); setAberto(false); }}>
//       <ConteudoDaFicha />
//     </ModalFullscreen>
//   )}
// ═══════════════════════════════════════════════════════════════

export function ModalFullscreen({
  titulo,
  subtitulo,
  onFechar,
  children,
  corDestaque = 'var(--copper, #b5651d)',
  largura = '1100px',
  temAlteracoes,
  aoGuardar,
  menuLateral,
}: {
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  children: React.ReactNode;
  corDestaque?: string;
  largura?: string;
  /** Menu do plano, à esquerda. Enquanto se está dentro de um plano, é
   *  ele que manda — o professor tem de ver a toda a hora em que plano
   *  está e que tudo o que cria fica lá dentro. */
  menuLateral?: React.ReactNode;
  /** true quando há trabalho por guardar. Fechar passa a perguntar. */
  temAlteracoes?: boolean;
  /** Chamado quando o professor escolhe guardar antes de sair. */
  aoGuardar?: () => void | Promise<void>;
}) {
  const [aGuardar, setAGuardar] = React.useState(false);

  /**
   * Sair com aviso.
   *
   * Antes, o ×, o Esc e um clique no fundo fechavam sem perguntar nada —
   * e o trabalho por guardar perdia-se sem o professor dar por isso.
   */
  async function sair() {
    if (!temAlteracoes) { onFechar(); return; }

    if (aoGuardar) {
      const querGuardar = confirm(
        'Tens alterações por guardar.\n\nGuardar antes de sair?\n\n'
        + 'OK para guardar e sair · Cancelar para continuar a editar'
      );
      if (!querGuardar) return;        // fica onde está
      setAGuardar(true);
      try { await aoGuardar(); } finally { setAGuardar(false); }
      onFechar();
      return;
    }

    // Sem forma de guardar: pelo menos avisar.
    if (confirm('Tens alterações por guardar.\n\nSair mesmo assim?')) onFechar();
  }

  // Fechar com Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') sair();
    }
    window.addEventListener('keydown', onKey);
    // Impedir scroll do fundo enquanto o modal está aberto
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowOriginal;
    };
  }, [onFechar]);

  return (
    <div
      onClick={sair}
      className="mf-fundo"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(26,23,20,0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '3vh 3vw',
        animation: 'modalFadeIn 0.15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mf-caixa"
        style={{
          background: '#faf7f2',
          borderRadius: 20,
          width: '100%',
          maxWidth: largura,
          height: '94vh',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          animation: 'modalSlideUp 0.2s ease-out',
        }}
      >
        {/* Cabeçalho fixo do modal */}
        <div className="mf-topo" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid rgba(26,23,20,0.08)',
          background: '#fff', flexShrink: 0,
        }}>
          {/* Voltar em texto, não um × pequeno no canto. É a saída, e
              tem de se ver. */}
          <button
            onClick={sair}
            disabled={aGuardar}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
              padding: '9px 15px', borderRadius: 10, marginRight: 14,
              border: '1px solid rgba(26,23,20,0.16)', background: '#fff',
              color: '#1a1714', fontSize: 14, fontWeight: 700,
              cursor: aGuardar ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: aGuardar ? 0.6 : 1,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"
              strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            {aGuardar ? 'A guardar…' : 'Voltar'}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mf-titulo" style={{ fontSize: 18, fontWeight: 800, color: '#1a1714', fontFamily: "'Nunito', sans-serif" }}>
              {titulo}
            </div>
            {subtitulo && (
              <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>{subtitulo}</div>
            )}
          </div>

          {/* Estado do trabalho: por guardar, ou guardado. */}
          {temAlteracoes ? (
            <span style={{
              flexShrink: 0, fontSize: 12.5, fontWeight: 700,
              padding: '6px 12px', borderRadius: 20,
              background: '#FFF4DC', color: '#7a4f00',
              border: '1px solid #F6A623',
            }}>
              por guardar
            </span>
          ) : (
            <span className="mf-guardado" style={{
              flexShrink: 0, fontSize: 12.5, fontWeight: 600,
              padding: '6px 12px', borderRadius: 20,
              background: 'rgba(90,122,78,0.12)', color: '#3E7A31',
            }}>
              guardado
            </span>
          )}
        </div>

        {/* Conteúdo — com o menu do plano à esquerda, quando existe */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {menuLateral && (
            <div style={{
              width: 196, flexShrink: 0, overflowY: 'auto',
              background: '#7B2233', color: '#fff',
            }}>
              {menuLateral}
            </div>
          )}
          <div className="mf-corpo" style={{ flex: 1, overflowY: 'auto', padding: 24, minWidth: 0 }}>
            {children}
          </div>
        </div>

        {/* Rodapé — indicação de que fechar grava */}
        <div className="mf-rodape" style={{
          padding: '10px 24px', borderTop: '1px solid rgba(26,23,20,0.06)',
          background: '#fff', flexShrink: 0, fontSize: 12.5, color: 'rgba(26,23,20,0.4)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: corDestaque }}>●</span>
          Ao fechar, o que fizeste aqui fica gravado automaticamente.
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        /* No telemóvel a janela ocupa o ecrã todo e o topo fica numa linha:
           o título em três linhas, o "guardado" e o rodapé comiam um terço
           do ecrã antes do conteúdo. */
        @media (max-width: 640px) {
          .mf-fundo { padding: 0 !important; }
          .mf-caixa { height: 100% !important; max-height: 100% !important; border-radius: 0 !important; }
          .mf-topo { padding: 10px 12px !important; }
          .mf-titulo { font-size: 15.5px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .mf-guardado, .mf-rodape { display: none !important; }
          .mf-corpo { padding: 12px !important; }
        }
      `}</style>
    </div>
  );
}
