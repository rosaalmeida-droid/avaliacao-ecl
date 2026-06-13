import React, { useState } from 'react';
import { Comanda } from '../types';
import { Button, Card, Chip } from './ui';
import { getCompetencia } from '../competencias';
import { addComanda } from '../backend';
import { EditorComanda, ESTADO_VAZIO, estadoParaComanda, EditorComandaState } from './EditorComanda';

export function ProfessorView({ turmaId }: { turmaId: string }) {
  const [criada, setCriada] = useState<Comanda | null>(null);

  function guardar(estado: EditorComandaState) {
    const comanda = estadoParaComanda(estado, turmaId);
    addComanda(comanda);
    setCriada(comanda);
  }

  if (criada) {
    const todasFixas = [...criada.tecnicasFixas, ...criada.atitudesFixas, ...criada.responsabilidadesFixas];
    return (
      <Card>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>✅ Comanda criada</div>
        <div className="muted" style={{ marginBottom: 10 }}>{criada.titulo}</div>

        <div className="muted" style={{ marginBottom: 12 }}>
          Alunos atribuídos: {criada.alunosIds.length > 0 ? criada.alunosIds.map(id => id.split('-').pop()).join(', ') : 'nenhum (verificar números)'}
          <br />
          <span className="mono" style={{ fontSize: 11 }}>IDs: {criada.alunosIds.join(', ')}</span>
        </div>

        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Competências fixas (obrigatórias)</div>
        <div style={{ marginBottom: 12 }}>
          {todasFixas.length === 0 && <span className="muted">Nenhuma — o aluno escolhe tudo livremente.</span>}
          {todasFixas.map(id => (
            <Chip key={id} selected>🔒 {getCompetencia(id)?.nome}</Chip>
          ))}
        </div>

        <Button block onClick={() => setCriada(null)}>Criar outra comanda</Button>
      </Card>
    );
  }

  return (
    <EditorComanda
      turmaId={turmaId}
      estadoInicial={ESTADO_VAZIO}
      onGuardar={guardar}
      tituloBotao="Criar comanda"
    />
  );
}
