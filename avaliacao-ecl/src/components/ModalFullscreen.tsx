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
}: {
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  children: React.ReactNode;
  corDestaque?: string;
  largura?: string;
}) {
  // Fechar com Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
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
      onClick={onFechar}
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
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid rgba(26,23,20,0.08)',
          background: '#fff', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1714', fontFamily: "'Nunito', sans-serif" }}>
              {titulo}
            </div>
            {subtitulo && (
              <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>{subtitulo}</div>
            )}
          </div>
          <button
            onClick={onFechar}
            title="Fechar (guarda automaticamente)"
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none',
              background: 'rgba(26,23,20,0.06)', color: '#1a1714',
              fontSize: 18, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Conteúdo — scroll interno próprio */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </div>

        {/* Rodapé — indicação de que fechar grava */}
        <div style={{
          padding: '10px 24px', borderTop: '1px solid rgba(26,23,20,0.06)',
          background: '#fff', flexShrink: 0, fontSize: 11, color: 'rgba(26,23,20,0.4)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: corDestaque }}>●</span>
          Ao fechar, o que fizeste aqui fica gravado automaticamente.
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
