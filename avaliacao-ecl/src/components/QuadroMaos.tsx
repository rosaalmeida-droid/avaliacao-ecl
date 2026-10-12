// ════════════════════════════════════════════════════════════
// LAVAGEM DAS MÃOS — antes de começar a produzir
// ════════════════════════════════════════════════════════════
// Aparece à entrada, depois da farda, e o aluno não avança sem passar
// por ela. (Rosa, 12/out/2026: «muito simples mesmo; os vídeos são uma
// seca».) Antes eram 4 ecrãs, com 10 passos que avançavam sozinhos de 5 em
// 5 segundos. Agora é um ecrã: o aluno lava as mãos e marca 4 coisas. A
// hora fica registada na presença e o professor vê-a.
// Imagens: OpenMoji (openmoji.org), licença CC BY-SA 4.0.
import React, { useRef, useState } from 'react';

const V = '#6B3FA0';
const VERDE = '#2F7D4F';
const img = (h: string) => `/imagens/higiene/${h}.svg`;

const ITENS: { imgs: string[]; texto: string }[] = [
  { imgs: ['1F48D', '231A'], texto: 'Sem anéis nem relógio' },
  { imgs: ['1F6B0', '1F9F4'], texto: 'Água e sabão' },
  { imgs: ['1F64F', '1F450', '1F485'], texto: 'Esfreguei tudo: palmas, dedos e unhas' },
  { imgs: ['1F9FB'], texto: 'Sequei com papel' },
];

export function LavarMaos({ onFeito }: {
  /** Recebe quantos segundos o aluno demorou neste ecrã. */
  onFeito: (segundos: number) => void;
  /** Frases mais curtas (medidas seletivas e adicionais): estas já são curtas para todos. */
  simples?: boolean;
}) {
  const [feito, setFeito] = useState<boolean[]>(ITENS.map(() => false));
  const inicio = useRef<number>(Date.now());
  const todos = feito.every(Boolean);

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, color: '#1A1A1A', marginBottom: 4 }}>Lavaste as mãos?</div>
      <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.65)', marginBottom: 12, lineHeight: 1.45 }}>
        Lava primeiro. Depois toca no que fizeste.
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {ITENS.map((it, i) => (
          <button key={it.texto} type="button" aria-pressed={feito[i]}
            onClick={() => setFeito(f => f.map((x, j) => j === i ? !x : x))}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 12px',
              borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, color: '#1A1A1A',
              border: `2px solid ${feito[i] ? VERDE : '#E4E1E8'}`, background: feito[i] ? '#E6F3EA' : '#fff' }}>
            <span style={{ display: 'flex', gap: 2, minWidth: 76, justifyContent: 'center', flexShrink: 0 }}>
              {it.imgs.map(h => <img key={h} src={img(h)} alt="" width={34} height={34} style={{ display: 'block' }} />)}
            </span>
            <span style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>{it.texto}</span>
            <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 900, color: '#fff', border: `2px solid ${feito[i] ? VERDE : '#CCC'}`,
              background: feito[i] ? VERDE : 'transparent' }}>{feito[i] ? '✓' : ''}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.6)', marginTop: 10, lineHeight: 1.45 }}>
        Só marques se for verdade: a hora fica registada e o professor vê.
      </div>
      <button onClick={() => onFeito(Math.round((Date.now() - inicio.current) / 1000))} disabled={!todos}
        style={{ width: '100%', marginTop: 14, minHeight: 54, borderRadius: 12, border: 'none',
          background: todos ? V : 'rgba(26,23,20,0.1)', color: todos ? '#fff' : 'rgba(26,23,20,0.35)',
          fontSize: 17, fontWeight: 700, fontFamily: 'inherit', cursor: todos ? 'pointer' : 'not-allowed' }}>
        {todos ? 'Sim, lavei as mãos' : `Falta${feito.filter(x => !x).length === 1 ? '' : 'm'} ${feito.filter(x => !x).length}`}
      </button>
      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', textAlign: 'center', marginTop: 10 }}>
        Imagens: OpenMoji, CC BY-SA 4.0
      </div>
    </div>
  );
}
