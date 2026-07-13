// ============================================================
// CriteriosComp.tsx
// Accordion reutilizável para critérios observáveis.
// Resolve: PERF-xxx (perfis), SUB-xxx (subtécnicas),
//          APP-xxx (aparelhos), ATT_xx (atitudes), OBR_xx
// ============================================================

import React, { useState } from 'react';
import { encontrarMicro, encontrarAtitude, encontrarSubtecnica, encontrarAparelho, nomeCompetencia } from '../compatECL';

interface Props {
  compId: string;
  cor?: string;
  abertaInicial?: boolean;
  criteriosCongelados?: Record<string, { criterio: string; como?: string }[]>;
}

export function CriteriosComp({ compId, cor = 'var(--copper)', abertaInicial = false, criteriosCongelados }: Props) {
  const [aberta, setAberta] = useState(abertaInicial);

  // ── Resolver o item pelo tipo do ID ──────────────────────
  let criterios: { criterio: string; como?: string }[] = [];
  let nomeItem = compId;
  let descricao = '';

  // 1. Critérios congelados do plano têm sempre prioridade
  if (criteriosCongelados?.[compId]) {
    criterios = criteriosCongelados[compId];
  }

  if (criterios.length === 0) {
    if (compId.startsWith('SUB-')) {
      const sub = encontrarSubtecnica(compId);
      nomeItem = sub?.nome || compId;
      descricao = sub?.definicao || '';
      if (sub?.resultado_esperado) {
        criterios = [{ criterio: sub.resultado_esperado, como: 'Resultado observável final' }];
      }
    } else if (compId.startsWith('KNW-')) {
      const lib = getLibrary();
      const knw = (lib.conhecimentos as any[]).find(k => k.id === compId);
      nomeItem = knw?.nome || compId;
      descricao = knw?.definicao || '';
      // Conhecimentos não têm critérios — a definição É o critério
    } else if (compId.startsWith('APP-')) {
      const app = encontrarAparelho(compId);
      nomeItem = app?.nome || compId;
      descricao = app?.definicao || '';
      if ((app as any)?.ambito_profissional) {
        criterios = [
          { criterio: `Preparação correcta: ${(app as any).ambito_profissional}`, como: 'Âmbito profissional' },
        ];
      }
    } else {
      const micro = encontrarMicro(compId);
      const atitude = !micro ? encontrarAtitude(compId) : null;
      nomeItem = micro?.nome || atitude?.nome || compId;
      criterios = micro?.criterios || [];
    }
  }

  if (criterios.length === 0 && !descricao) return null;

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
        {aberta ? 'Esconder' : criterios.length > 0 ? `Ver ${criterios.length} critérios observáveis` : 'Ver descrição'}
      </button>

      {aberta && (
        <div style={{
          marginTop: 6, padding: '8px 12px',
          background: 'rgba(0,0,0,0.03)', borderRadius: 8,
          borderLeft: `3px solid ${cor}`,
        }}>
          {descricao && (
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 6, fontStyle: 'italic' }}>
              {descricao}
            </div>
          )}
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
