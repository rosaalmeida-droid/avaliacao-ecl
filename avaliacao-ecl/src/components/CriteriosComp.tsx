// ============================================================
// CriteriosComp.tsx
// Accordion reutilizável para mostrar critérios observáveis
// de uma microcompetência ou competência.
//
// Usado em: AlunoView, GestaoRecuperacoes, AvaliacaoPorUC,
//           VistaDePlano (professor)
// ============================================================

import React, { useState } from 'react';
import { encontrarMicro, encontrarAtitude } from '../compatECL';

interface Props {
  /** ID da competência (ex: 'M0065', 'ATT_01', 'OBR_01') */
  compId: string;
  /** Cor de destaque — adapta ao contexto (cobre para técnicas, roxo para atitudes) */
  cor?: string;
  /** Se true, abre imediatamente (útil quando já está num accordion pai) */
  abertaInicial?: boolean;
  /** Critérios congelados do plano (quando aula já foi realizada) — têm prioridade */
  criteriosCongelados?: Record<string, { criterio: string; como?: string }[]>;
}

export function CriteriosComp({ compId, cor = 'var(--copper)', abertaInicial = false, criteriosCongelados }: Props) {
  const [aberta, setAberta] = useState(abertaInicial);

  // Resolver a competência — micro, atitude ou subtécnica direta
  const micro   = encontrarMicro(compId);
  const atitude = !micro ? encontrarAtitude(compId) : null;

  // Prioridade: 1º critérios congelados do plano (aula realizada), 2º critérios do código
  const criterios: { criterio: string; como?: string }[] =
    (criteriosCongelados?.[compId]) || micro?.criterios || [];

  if (criterios.length === 0) return null;

  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={() => setAberta(a => !a)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: cor, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0',
        }}
      >
        <span style={{ fontSize: 10, transform: aberta ? 'rotate(90deg)' : 'none', transition: '0.15s', display: 'inline-block' }}>▶</span>
        {aberta ? 'Esconder' : `Ver ${criterios.length} critérios observáveis`}
      </button>

      {aberta && (
        <div style={{
          marginTop: 6, padding: '8px 12px',
          background: 'rgba(0,0,0,0.03)', borderRadius: 8,
          borderLeft: `3px solid ${cor}`,
        }}>
          {criterios.map((cr, i) => (
            <div key={i} style={{
              fontSize: 12, color: 'rgba(26,23,20,0.75)',
              padding: '4px 0',
              borderBottom: i < criterios.length - 1 ? '1px solid rgba(26,23,20,0.06)' : 'none',
            }}>
              <span style={{ color: cor, fontWeight: 700, marginRight: 6 }}>✓</span>
              {cr.criterio}
              {cr.como && (
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginTop: 2, marginLeft: 18 }}>
                  {cr.como}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
