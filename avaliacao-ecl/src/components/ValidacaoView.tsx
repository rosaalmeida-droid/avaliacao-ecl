import React, { useState } from 'react';
import { SelecaoAluno, NotaCompetencia, Validacao, NIVEL_AUTO_NOTA, NIVEL_AUTO_LABEL } from '../types';
import { getCompetencia } from '../competencias';
import { getComandas, getSelecoes, getValidacoes, addOrUpdateValidacao } from '../backend';
import { Card, Button, Field } from './ui';

export function ValidacaoView({ turmaId }: { turmaId: string }) {
  const comandas = getComandas().filter(c => c.turmaId === turmaId);
  const validacoes = getValidacoes();
  const selecoes = getSelecoes().filter(s => s.turmaId === turmaId);

  const pendentes = selecoes.filter(s => !validacoes.some(v => v.selecaoId === s.id));

  const [ativa, setAtiva] = useState<SelecaoAluno | null>(null);

  if (ativa) {
    return <ValidarSelecao selecao={ativa} comanda={comandas.find(c => c.id === ativa.comandaId)!} onVoltar={() => setAtiva(null)} />;
  }

  return (
    <Card>
      <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Validações pendentes</div>
      {pendentes.length === 0 && <div className="muted">Sem avaliações pendentes. ✅</div>}
      {pendentes.map(s => {
        const comanda = comandas.find(c => c.id === s.comandaId);
        return (
          <div key={s.id} className="option-card" onClick={() => setAtiva(s)}>
            <div style={{ fontWeight: 600 }}>{comanda?.titulo || s.comandaId}</div>
            <div className="muted">Aluno {s.alunoId.split('-').pop()} · {s.tecnicas.length + s.atitudes.length + s.responsabilidades.length} competências</div>
          </div>
        );
      })}
    </Card>
  );
}

function ValidarSelecao({
  selecao, comanda, onVoltar,
}: {
  selecao: SelecaoAluno;
  comanda: { titulo: string };
  onVoltar: () => void;
}) {
  const [notas, setNotas] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const auto of selecao.autoavaliacoes) {
      init[auto.competenciaId] = NIVEL_AUTO_NOTA[auto.nivel];
    }
    return init;
  });
  const [comentario, setComentario] = useState('');

  const todasComps = [...selecao.tecnicas, ...selecao.atitudes, ...selecao.responsabilidades];

  function guardar() {
    const notasFinais: NotaCompetencia[] = todasComps.map(id => {
      const auto = selecao.autoavaliacoes.find(a => a.competenciaId === id);
      const notaAuto = auto ? NIVEL_AUTO_NOTA[auto.nivel] : 0;
      const notaFinal = notas[id];
      return {
        competenciaId: id,
        nota: notaFinal,
        origem: notaFinal === notaAuto ? 'auto' : 'professor',
      };
    });

    const validacao: Validacao = {
      id: selecao.id,
      selecaoId: selecao.id,
      comandaId: selecao.comandaId,
      alunoId: selecao.alunoId,
      turmaId: selecao.turmaId,
      notas: notasFinais,
      comentarioGeral: comentario || undefined,
      validadoPor: 'Professor',
      validadoEm: new Date().toISOString(),
    };
    addOrUpdateValidacao(validacao);
    onVoltar();
  }

  return (
    <div>
      <Card>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{comanda.titulo}</div>
        <div className="muted">Aluno {selecao.alunoId.split('-').pop()} — confirma ou ajusta a nota (0-20) de cada competência.</div>
      </Card>

      {todasComps.map(id => {
        const comp = getCompetencia(id);
        const auto = selecao.autoavaliacoes.find(a => a.competenciaId === id);
        return (
          <Card key={id}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{comp?.nome}</div>
            {auto && (
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Autoavaliação do aluno: <strong>{NIVEL_AUTO_LABEL[auto.nivel]}</strong> (sugestão: {NIVEL_AUTO_NOTA[auto.nivel]})
              </div>
            )}
            <input
              className="input"
              type="number"
              min={0}
              max={20}
              value={notas[id] ?? ''}
              onChange={e => setNotas(prev => ({ ...prev, [id]: Number(e.target.value) }))}
            />
          </Card>
        );
      })}

      <Card>
        <Field label="Comentário geral (opcional)">
          <textarea className="input" value={comentario} onChange={e => setComentario(e.target.value)} />
        </Field>
        <Button block variant="ghost" onClick={onVoltar}>← Voltar</Button>
        <div style={{ height: 8 }} />
        <Button block onClick={guardar}>Validar</Button>
      </Card>
    </div>
  );
}
