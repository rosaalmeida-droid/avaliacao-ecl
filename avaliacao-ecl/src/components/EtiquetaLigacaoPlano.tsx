import React from 'react';
import { getPlanosAula } from '../backend';

// Etiqueta reutilizável — mostra se um item (ficha, guião, requisição) está
// ligado a um plano de aula ou foi criado solto.
//
// A associação pode estar de dois lados: a ficha aponta para o plano
// (planoAulaId), ou o plano aponta para a ficha (fichasIds). A etiqueta só
// olhava para o primeiro — por isso uma ficha associada pelo plano aparecia
// como "Solta (sem plano)" mesmo a ser mostrada dentro desse plano.
export function EtiquetaLigacaoPlano({ planoAulaId, fichaId }: {
  planoAulaId?: string;
  /** Id da ficha, para procurar também do lado dos planos. */
  fichaId?: string;
}) {
  const planos = getPlanosAula();

  // Primeiro o que a ficha diz; depois os planos que a incluem.
  let plano = planoAulaId ? planos.find(p => p.id === planoAulaId) : undefined;
  if (!plano && fichaId) {
    plano = planos.find(p => p.fichasIds?.includes(fichaId));
  }

  if (!plano) {
    return (
      <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.4)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>⚪</span><span>Solta (sem plano)</span>
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12.5, color: 'var(--sage)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>🔗</span>
      <span>Ligada a: {plano.titulo || plano.data || plano.id.slice(0, 8)}</span>
    </div>
  );
}

export default EtiquetaLigacaoPlano;
