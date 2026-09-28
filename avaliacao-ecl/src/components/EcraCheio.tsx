// ════════════════════════════════════════════════════════════
// ECRÃ CHEIO — o aluno faz uma coisa de cada vez
// ════════════════════════════════════════════════════════════
// Abre por cima da aplicação, com fundo lilás (mais escuro do que o
// branco, que fica para o que se escolhe). Em cima, «✕ Sair» e o nome;
// em baixo, Anterior / Seguinte sempre à vista. Usado nos passos da aula,
// na farda e na autoavaliação final da UC — como na autoavaliação da aula.
import React, { useEffect } from 'react';

export const FUNDO_ECRA = '#E2D8EE';
const V = '#6B3FA0';

export function EcraCheio({ titulo, onSair, children }: {
  titulo: string; onSair: () => void; children: React.ReactNode;
}) {
  // A página por baixo não se mexe enquanto o ecrã está aberto.
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} style={{ position: 'fixed', inset: 0, zIndex: 2000,
      background: FUNDO_ECRA, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: V, color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
        paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
        <button onClick={onSair} style={{ padding: '8px 12px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.5)', background: 'transparent', color: '#fff', fontSize: 14,
          fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>✕ Sair</button>
        <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 40px' }}>{children}</div>
      </div>
    </div>
  );
}

/** Onde estou: nome do ecrã, «3 de 6» e a barra. */
export function ProgressoSlides({ nome, idx, total }: { nome: string; idx: number; total: number }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: V }}>{nome}</span>
        <span style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>{idx + 1} de {total}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 3,
            background: i < idx ? V : i === idx ? '#B98FD9' : 'rgba(255,255,255,0.7)' }} />
        ))}
      </div>
    </div>
  );
}

/** Anterior / Seguinte, sempre à vista em baixo. */
export function NavSlides({ onAnterior, onSeguinte, pode = true, textoSeguinte = 'Seguinte', fundo = FUNDO_ECRA }: {
  onAnterior?: () => void; onSeguinte: () => void; pode?: boolean; textoSeguinte?: string;
  /** A cor por trás dos botões (branco quando estão dentro de um cartão). */
  fundo?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 18, position: 'sticky', bottom: 0,
      background: fundo, padding: '10px 0 max(10px, env(safe-area-inset-bottom))' }}>
      {onAnterior && (
        <button onClick={onAnterior} style={{ minHeight: 52, padding: '0 18px', borderRadius: 12,
          border: '1px solid #E4E1E8', background: '#fff', color: 'rgba(26,23,20,0.7)',
          fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Anterior
        </button>
      )}
      <button onClick={onSeguinte} disabled={!pode} style={{ flex: 1, minHeight: 52,
        borderRadius: 12, border: 'none', fontSize: 16.5, fontWeight: 700, fontFamily: 'inherit',
        background: pode ? V : 'rgba(26,23,20,0.08)', color: pode ? '#fff' : 'rgba(26,23,20,0.3)',
        cursor: pode ? 'pointer' : 'not-allowed' }}>
        {textoSeguinte}
      </button>
    </div>
  );
}
