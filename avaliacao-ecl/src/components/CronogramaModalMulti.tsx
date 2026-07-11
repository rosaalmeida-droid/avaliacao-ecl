// ============================================================
// CronogramaModalMulti.tsx
// Vista da Coordenadora — mostra os três modais em sequência:
//   1º ACP → CronogramaModalNovo  (referencial 811RA144, UCs)
//   2º ACP → CronogramaModalAntigo (referencial 811183, UFCDs)
//   3º ACP → CronogramaModalAntigo (referencial 811183, UFCDs)
//
// Cada turma avança só depois de a anterior ser fechada.
// ============================================================

import { useState } from 'react';
import { CronogramaModalNovo } from './CronogramaModalNovo';
import { CronogramaModalAntigo } from './CronogramaModalAntigo';

// Ordem de apresentação e qual modal usar
const SEQUENCIA: { turmaId: string; referencial: 'novo' | 'antigo' }[] = [
  { turmaId: '1º ACP', referencial: 'novo'   },
  { turmaId: '2º ACP', referencial: 'antigo' },
  { turmaId: '3º ACP', referencial: 'antigo' },
];

interface Props {
  onConcluido?: () => void;
}

export function CronogramaModalMulti({ onConcluido }: Props) {
  const [indice, setIndice] = useState(0);

  function avancar() {
    const proximo = indice + 1;
    if (proximo >= SEQUENCIA.length) {
      onConcluido?.();
    } else {
      setIndice(proximo);
    }
  }

  if (indice >= SEQUENCIA.length) return null;

  const { turmaId, referencial } = SEQUENCIA[indice];

  if (referencial === 'novo') {
    return <CronogramaModalNovo turmaId={turmaId} onFechar={avancar} />;
  }
  return <CronogramaModalAntigo turmaId={turmaId} onFechar={avancar} />;
}
