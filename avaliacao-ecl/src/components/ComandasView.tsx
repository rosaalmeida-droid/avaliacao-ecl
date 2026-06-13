import React, { useState } from 'react';
import { Comanda } from '../types';
import { Card, Button } from './ui';
import { getComandas, updateComanda } from '../backend';
import { EditorComanda, comandaParaEstado, estadoParaComanda, EditorComandaState } from './EditorComanda';
import { TIPO_SERVICO_LABEL } from '../types';

export function ComandasView({ turmaId }: { turmaId: string }) {
  const [editando, setEditando] = useState<Comanda | null>(null);
  const [, force] = useState(0);

  const comandas = getComandas()
    .filter(c => c.turmaId === turmaId)
    .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));

  if (editando) {
    return (
      <EditorComanda
        turmaId={turmaId}
        estadoInicial={comandaParaEstado(editando)}
        onGuardar={(estado: EditorComandaState) => {
          const atualizada = estadoParaComanda(estado, turmaId, editando);
          updateComanda(atualizada);
          setEditando(null);
          force(x => x + 1);
        }}
        onCancelar={() => setEditando(null)}
        tituloBotao="Guardar alterações"
      />
    );
  }

  return (
    <Card>
      <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Comandas criadas</div>
      {comandas.length === 0 && <div className="muted">Ainda não criaste nenhuma comanda.</div>}
      {comandas.map(c => (
        <div key={c.id} className="option-card" onClick={() => setEditando(c)}>
          <div style={{ fontWeight: 600 }}>{c.titulo}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {c.data} · {c.modo === 'grupo' ? 'Grupo' : 'Individual'} · {TIPO_SERVICO_LABEL[c.tipoServico || 'normal']} · alunos: {c.alunosIds.map(id => id.split('-').pop()).join(', ')}
          </div>
        </div>
      ))}
    </Card>
  );
}
