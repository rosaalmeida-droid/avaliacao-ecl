// ════════════════════════════════════════════════════════════
// LAVAGEM DAS MÃOS — antes de começar a produzir
// ════════════════════════════════════════════════════════════
// Aparece à entrada, depois da farda: o aluno vê como se lavam bem as
// mãos e confirma que o fez. Os passos seguem a técnica recomendada pela
// DGS/OMS (40 a 60 segundos). Cada passo tem um desenho simples.
import React from 'react';

const V = '#6B3FA0';

// Desenhos simples, só em traço: uma mão (ou duas) e o gesto.
const traco = { fill: 'none', stroke: V, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const mao = (x: number, y: number, rot = 0, esp = false) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) ${esp ? 'scale(-1 1)' : ''}`}>
    <path {...traco} d="M-9 14 L-9 -2 M-9 -2 Q-9 -8 -6 -8 Q-3 -8 -3 -2 L-3 -12 Q-3 -16 0 -16 Q3 -16 3 -12 L3 -2 L3 -10 Q3 -13 6 -13 Q9 -13 9 -10 L9 6 Q9 14 1 16 L-5 16 Q-9 16 -9 14 Z" />
  </g>
);

const PASSOS: { texto: string; desenho: React.ReactNode }[] = [
  { texto: 'Tira anéis, pulseiras e relógio. Molha as mãos com água.',
    desenho: <>{mao(24, 26)}<path {...traco} d="M18 4 v6 M26 2 v6 M34 4 v6" /></> },
  { texto: 'Põe sabão suficiente para cobrir as mãos todas.',
    desenho: <>{mao(24, 28)}<circle cx="24" cy="8" r="4" fill={V} opacity="0.35" /><path {...traco} d="M24 12 v3" /></> },
  { texto: 'Esfrega as palmas uma na outra.',
    desenho: <>{mao(18, 26, -12)}{mao(30, 26, 12, true)}<path {...traco} d="M12 44 q12 6 24 0" /></> },
  { texto: 'Palma direita sobre as costas da mão esquerda, com os dedos entrelaçados. Depois ao contrário.',
    desenho: <>{mao(20, 26, -20)}{mao(28, 28, 20, true)}<path {...traco} d="M8 10 l6 4 M40 10 l-6 4" /></> },
  { texto: 'Palma com palma, com os dedos entrelaçados.',
    desenho: <>{mao(20, 26, -8)}{mao(28, 26, 8, true)}<path {...traco} d="M20 14 l8 6 M20 20 l8 6" /></> },
  { texto: 'Costas dos dedos contra a palma da outra mão, com os dedos presos.',
    desenho: <>{mao(24, 26, 90)}<path {...traco} d="M10 40 q14 -8 28 0" /></> },
  { texto: 'Esfrega cada polegar, rodando dentro da outra mão.',
    desenho: <>{mao(24, 26)}<path {...traco} d="M12 16 a10 10 0 1 0 6 -8" /><path {...traco} d="M18 8 l0 -4 l4 2" /></> },
  { texto: 'Esfrega as pontas dos dedos e as unhas na palma da outra mão, a rodar.',
    desenho: <>{mao(24, 30)}<path {...traco} d="M16 8 a8 8 0 1 0 12 -2" /><path {...traco} d="M28 6 l3 -3 l1 5" /></> },
  { texto: 'Passa bem por água.',
    desenho: <>{mao(24, 30)}<path {...traco} d="M16 2 v8 M24 0 v10 M32 2 v8" /></> },
  { texto: 'Seca com um toalhete descartável e fecha a torneira com o toalhete.',
    desenho: <>{mao(20, 28)}<rect x="28" y="10" width="14" height="20" rx="2" {...traco} /></> },
];

/** O quadro dos passos, com desenho e texto. */
export function QuadroLavagemMaos() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      {PASSOS.map((p, i) => (
        <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '10px 10px 12px',
          border: '1px solid #E4E1E8', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ alignSelf: 'flex-start', width: 24, height: 24, borderRadius: '50%', background: V, color: '#fff',
            fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
          <svg width="64" height="64" viewBox="0 0 48 48" aria-hidden="true" style={{ marginTop: -6 }}>{p.desenho}</svg>
          <div style={{ fontSize: 13.5, lineHeight: 1.4, color: '#2A1745', marginTop: 4 }}>{p.texto}</div>
        </div>
      ))}
    </div>
  );
}

/** Ecrã da entrada: aviso, quadro e confirmação. */
export function LavarMaos({ onFeito }: { onFeito: () => void }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, color: '#1A1A1A' }}>
        Antes de começar, lava bem as mãos
      </div>
      <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.7)', margin: '6px 0 14px', lineHeight: 1.55 }}>
        As mãos são a principal forma de passar bactérias para a comida. Lavá-las bem demora
        <b> 40 a 60 segundos</b>. Segue os passos:
      </div>
      <QuadroLavagemMaos />
      <div style={{ fontSize: 13.5, color: '#8A4E15', background: '#FDF0E8', border: '1px solid #E8C9A8',
        borderRadius: 12, padding: '10px 12px', marginTop: 12, lineHeight: 1.5 }}>
        Volta a lavar as mãos sempre que mudares de tarefa: depois de mexer em cru, no lixo, no telemóvel,
        na cara ou no cabelo, e depois de ires à casa de banho.
      </div>
      <button onClick={onFeito} style={{ width: '100%', marginTop: 14, minHeight: 54, borderRadius: 12, border: 'none',
        background: V, color: '#fff', fontSize: 17, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
        Já lavei as mãos
      </button>
    </div>
  );
}
