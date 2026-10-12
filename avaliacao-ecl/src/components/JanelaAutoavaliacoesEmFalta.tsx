// ============================================================
// Logo à entrada: as autoavaliações que o aluno tem de fazer
// ============================================================
// Rosa, 12/out/2026: «Obriga os alunos a responder outra vez, e tem de ser
// logo, de chapa, permitindo-os na mesma circular pela aplicação. Se não se
// avaliam, estão a perder.» A janela aparece sempre que o aluno abre a
// aplicação, até responder a tudo. «Agora não» fecha-a e deixa-o usar a
// aplicação; o aviso continua no topo do Início.
// ============================================================
import React from 'react';

const COBRE = '#B5651D';

export interface AulaEmFalta { id: string; titulo: string; data: string; motivo: string }

export function JanelaAutoavaliacoesEmFalta({ aulas, onResponder, onFechar }: {
  aulas: AulaEmFalta[];
  /** Abre a primeira por responder. */
  onResponder: () => void;
  onFechar: () => void;
}) {
  if (!aulas.length) return null;
  const dia = (iso: string) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
  const uma = aulas.length === 1;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="janela-em-falta-titulo"
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(26,23,20,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto',
        padding: '20px 18px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: COBRE }}>Obrigatório</div>
        <div id="janela-em-falta-titulo" style={{ fontSize: 21, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.25, marginTop: 4 }}>
          {uma ? 'Tens uma autoavaliação por fazer' : `Tens ${aulas.length} autoavaliações por fazer`}
        </div>
        <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.7)', marginTop: 6, lineHeight: 1.5 }}>
          Enquanto não respondes, estás a perder na nota. Leva 2 minutos{uma ? '' : ' cada uma'}.
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {aulas.map(a => (
            <div key={a.id} style={{ border: '1px solid #F0D2BC', background: '#FDF0E8', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
                {a.titulo}{a.data && !a.titulo.includes(dia(a.data)) ? ` · ${dia(a.data)}` : ''}
              </div>
              <div style={{ fontSize: 13.5, color: '#8A4E15', marginTop: 2 }}>{a.motivo.charAt(0).toUpperCase() + a.motivo.slice(1)}.</div>
            </div>
          ))}
        </div>
        <button onClick={onResponder} style={{ width: '100%', marginTop: 16, minHeight: 52, borderRadius: 12, border: 'none',
          background: COBRE, color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          Responder agora
        </button>
        <button onClick={onFechar} style={{ width: '100%', marginTop: 8, minHeight: 44, borderRadius: 12,
          border: '1.5px solid rgba(26,23,20,0.2)', background: '#fff', color: 'rgba(26,23,20,0.75)', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit' }}>
          Agora não
        </button>
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.5)', marginTop: 8, textAlign: 'center', lineHeight: 1.45 }}>
          Esta janela volta sempre que abrires a aplicação, até responderes.
        </div>
      </div>
    </div>
  );
}
