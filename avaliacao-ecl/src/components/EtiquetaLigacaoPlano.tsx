import React from 'react';
import { getPlanosAula } from '../backend';

// Etiqueta reutilizável — mostra se um item (Ficha, Guia, Requisição) está
// ligado a um Plano de Aula ou foi criado solto (a partir das tabs globais
// do menu principal, fora de qualquer plano). Evita confusão entre os dois
// caminhos paralelos de criação que coexistem na app.
export function EtiquetaLigacaoPlano({ planoAulaId }: { planoAulaId?: string }) {
  if (!planoAulaId) {
    return (
      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>⚪</span><span>Solta (sem plano)</span>
      </div>
    );
  }
  const plano = getPlanosAula().find(p => p.id === planoAulaId);
  return (
    <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>🔗</span><span>Ligada ao plano: {plano?.titulo || plano?.data || planoAulaId.slice(0, 8)}</span>
    </div>
  );
}

export default EtiquetaLigacaoPlano;
