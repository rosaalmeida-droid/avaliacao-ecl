// O que vem aí no calendário escolar (feriados, interrupções e agenda da
// ECL), ao lado do calendário do professor (Rosa, 5/out/2026): para se
// lembrar quando organiza os planos de aula.
import React from 'react';
import { proximosDoCalendario, fraseDoCalendario } from '../calendarioEscolar';

export function ProximosNoCalendario({ dias = 21 }: { dias?: number }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const lista = proximosDoCalendario(hoje, dias);
  if (!lista.length) return null;
  return (
    <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, background: '#F7F2EC', border: '1px solid rgba(26,23,20,0.1)' }}>
      <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7B2233', marginBottom: 6 }}>
        Calendário escolar: o que vem aí
      </div>
      {lista.map((x, i) => (
        <div key={i} style={{ fontSize: 13.5, lineHeight: 1.45, padding: '5px 0', borderTop: i ? '1px solid rgba(26,23,20,0.07)' : 'none',
          color: x.tipo === 'agenda' ? '#333' : '#8e2418', fontWeight: x.tipo === 'agenda' ? 400 : 700 }}>
          {x.tipo === 'agenda' ? '📅 ' : '⛔ '}{fraseDoCalendario(x)}
        </div>
      ))}
    </div>
  );
}
