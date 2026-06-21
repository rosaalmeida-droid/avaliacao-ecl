import React, { useState, useEffect } from 'react';
import { getAvisosPendentes, resolverAviso } from '../backend';
import { Aviso } from '../types';

// Painel lateral em gaveta — fica encostado à borda direita do ecrã,
// sempre presente em ecrãs largos (computador/tablet), escondido em
// telemóvel. Lista avisos transversais a toda a app (ingredientes sem
// preço confirmado, etc.) e fica vazio/verde quando tudo está resolvido.
export function CentroAvisos({ onNavegar }: { onNavegar?: (aviso: Aviso) => void }) {
  const [aberto, setAberto] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>(() => getAvisosPendentes());
  const [isLargo, setIsLargo] = useState(typeof window !== 'undefined' && window.innerWidth >= 900);

  useEffect(() => {
    function onResize() { setIsLargo(window.innerWidth >= 900); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Recarregar avisos periodicamente — outras partes da app criam avisos
  // (ex: Requisição) sem nenhum canal de eventos central, então um
  // intervalo simples garante que o painel não fica desatualizado.
  useEffect(() => {
    const id = setInterval(() => setAvisos(getAvisosPendentes()), 2000);
    return () => clearInterval(id);
  }, []);

  if (!isLargo) return null; // escondido em telemóvel, como combinado

  const tudoOk = avisos.length === 0;

  function resolver(id: string) {
    resolverAviso(id);
    setAvisos(getAvisosPendentes());
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', zIndex: 500, display: 'flex', pointerEvents: 'none' }}>
      {/* Aba/separador sempre visível, encostada à borda */}
      <button onClick={() => setAberto(!aberto)}
        style={{
          pointerEvents: 'auto',
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          background: tudoOk ? 'var(--sage)' : 'var(--copper)',
          color: 'white', border: 'none', borderRadius: '10px 0 0 10px',
          padding: '16px 8px', cursor: 'pointer', fontWeight: 700, fontSize: 12,
          alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '-2px 2px 8px rgba(0,0,0,0.15)',
        }}>
        <span>{tudoOk ? '✓ Tudo em dia' : `⚠ ${avisos.length} aviso${avisos.length !== 1 ? 's' : ''}`}</span>
      </button>

      {/* Gaveta expansível */}
      {aberto && (
        <div style={{
          pointerEvents: 'auto', width: 320, height: '100vh', background: '#fff',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', overflowY: 'auto', padding: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Centro de Avisos</div>
            <button onClick={() => setAberto(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'rgba(26,23,20,0.4)' }}>✕</button>
          </div>

          {tudoOk ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--sage)' }}>Tudo em dia!</div>
              <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginTop: 4 }}>Não há avisos pendentes.</div>
            </div>
          ) : (
            avisos.map(a => {
              const ehOperacional = a.id.startsWith('op_');
              return (
              <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 10, background: 'var(--copper-pale)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{a.titulo}</div>
                <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>{a.descricao}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {onNavegar && (
                    <button onClick={() => onNavegar(a)}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                      Ir corrigir →
                    </button>
                  )}
                  {!ehOperacional && (
                    <button onClick={() => resolver(a.id)}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                      Dispensar
                    </button>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default CentroAvisos;
