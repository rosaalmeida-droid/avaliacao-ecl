// As horas de cada UC em curso, na página inicial do professor (Rosa, 5/out/2026).
import React from 'react';
import { horasDasUCsEmCurso, fraseDasHorasDaUC } from '../horasDaUC';

export function HorasDasUCs({ turmaId, professor }: { turmaId?: string; professor?: string }) {
  if (!turmaId) return null;
  let lista: ReturnType<typeof horasDasUCsEmCurso> = [];
  try { lista = horasDasUCsEmCurso(turmaId, professor); } catch { lista = []; }
  if (!lista.length) return null;
  const cor = { certo: ['#3E7A31', '#EEF6EA'], faltam: ['#A23A2E', '#FDF0EF'], sobram: ['#B5651D', '#FFF7E6'] } as const;
  return (
    <div style={{ marginBottom: 16 }}>
      {lista.map(h => {
        const f = fraseDasHorasDaUC(h);
        const [c, fundo] = cor[f.estado];
        return (
          <div key={h.ucId} style={{ padding: '12px 16px', borderRadius: 14, border: `2px solid ${c}`, background: fundo, marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: c }}>
              {f.estado === 'certo' ? '✓' : '⚠️'} {h.inicio > new Date().toISOString().slice(0, 10) ? `A próxima UC, a começar a ${h.inicio.slice(8, 10)}/${h.inicio.slice(5, 7)}: ` : ''}As horas da {h.ucId}{h.nome ? ` (${h.nome})` : ''}, {h.turmaId}
            </div>
            <div style={{ fontSize: 14, color: '#333', marginTop: 4, lineHeight: 1.5 }}>{f.frase}</div>
          </div>
        );
      })}
    </div>
  );
}
