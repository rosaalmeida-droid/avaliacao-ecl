import React, { useState } from 'react';
import {
  getSelecoes,
  getValidacoes,
  addOrUpdateValidacao,
  getAlunos,
  getPlanosAula,
  getFichasProducao,
} from '../backend';
import {
  SelecaoAluno,
  Validacao,
  NotaCompetencia,
  NIVEL_AUTO_NOTA,
} from '../types';
import { getCompetencia } from '../competencias';
import { getCompetenciaAtitudinal } from '../progressaoAtitudes';

const card: React.CSSProperties = {
  background: 'var(--color-background-primary)',
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: 12,
  padding: 14,
  marginBottom: 10,
};

const muted: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-secondary)',
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '0.5px solid var(--color-border-tertiary)',
  background: 'var(--color-background-primary)',
  fontSize: 13,
};

const btn: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  background: '#1D9E75',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSec: React.CSSProperties = {
  ...btn,
  background: 'var(--color-background-secondary)',
  color: 'var(--color-text-secondary)',
  border: '0.5px solid var(--color-border-tertiary)',
};

function nomeCompetencia(id: string): string {
  const tecnica = getCompetencia(id);
  if (tecnica) return tecnica.nome;

  const atitude = getCompetenciaAtitudinal(id);
  if (atitude) return atitude.nome;

  return id;
}

export function ValidacaoView() {
  const selecoes = getSelecoes();
  const validacoes = getValidacoes();
  const alunos = getAlunos();
  const planos = getPlanosAula();
  const fichas = getFichasProducao();

  const pendentes = selecoes.filter(
    (s) => !validacoes.some((v) => v.selecaoId === s.id)
  );

  const [ativa, setAtiva] = useState<SelecaoAluno | null>(null);

  if (ativa) {
    return (
      <ValidarSelecao
        selecao={ativa}
        onVoltar={() => setAtiva(null)}
      />
    );
  }

  return (
    <div>
      <div style={card}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Validação do Professor</h2>
        <div style={muted}>
          Autoavaliações dos alunos pendentes de validação.
        </div>
      </div>

      {pendentes.length === 0 && (
        <div style={card}>
          <div style={muted}>Não existem avaliações pendentes.</div>
        </div>
      )}

      {pendentes.map((s) => {
        const aluno = alunos.find((a) => a.id === s.alunoId);
        const plano = s.planoAulaId
          ? planos.find((p) => p.id === s.planoAulaId)
          : undefined;
        const ficha = s.fichaId
          ? fichas.find((f) => f.id === s.fichaId)
          : undefined;

        return (
          <div
            key={s.id}
            style={{
              ...card,
              cursor: 'pointer',
            }}
            onClick={() => setAtiva(s)}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {aluno?.nome || `Aluno ${aluno?.numero || s.alunoId}`}
            </div>

            <div style={muted}>
              {aluno?.turmaId || s.turmaId}
              {plano ? ` · ${plano.data}` : ''}
            </div>

            {plano && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Plano: <strong>{plano.titulo}</strong>
              </div>
            )}

            {ficha && (
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Ficha de produção: <strong>{ficha.nomePrato}</strong>
              </div>
            )}

            <div style={{ marginTop: 6, fontSize: 11, color: '#1D9E75' }}>
              {s.autoavaliacoes.length} competências submetidas
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ValidarSelecao({
  selecao,
  onVoltar,
}: {
  selecao: SelecaoAluno;
  onVoltar: () => void;
}) {
  const alunos = getAlunos();
  const planos = getPlanosAula();
  const fichas = getFichasProducao();

  const aluno = alunos.find((a) => a.id === selecao.alunoId);
  const plano = selecao.planoAulaId
    ? planos.find((p) => p.id === selecao.planoAulaId)
    : undefined;
  const ficha = selecao.fichaId
    ? fichas.find((f) => f.id === selecao.fichaId)
    : undefined;

  const [notas, setNotas] = useState<Record<string, number>>(
    Object.fromEntries(
      selecao.autoavaliacoes.map((a) => [
        a.competenciaId,
        NIVEL_AUTO_NOTA[a.nivel],
      ])
    )
  );

  const [comentarioGeral, setComentarioGeral] = useState('');

  function setNota(id: string, nota: number) {
    setNotas((p) => ({
      ...p,
      [id]: Math.max(0, Math.min(20, nota)),
    }));
  }

  function guardar() {
    const notasFinal: NotaCompetencia[] = Object.entries(notas).map(
      ([competenciaId, nota]) => {
        const auto = selecao.autoavaliacoes.find(
          (a) => a.competenciaId === competenciaId
        );
        const notaAuto = auto ? NIVEL_AUTO_NOTA[auto.nivel] : nota;

        return {
          competenciaId,
          nota,
          origem: nota === notaAuto ? 'auto' : 'professor',
        };
      }
    );

    const validacao: Validacao = {
      id: selecao.id,
      selecaoId: selecao.id,
      comandaId: selecao.comandaId,
      planoAulaId: selecao.planoAulaId,
      fichaId: selecao.fichaId,
      grupoId: selecao.grupoId,
      alunoId: selecao.alunoId,
      turmaId: selecao.turmaId,
      notas: notasFinal,
      comentarioGeral,
      validadoPor: 'Professor',
      validadoEm: new Date().toISOString(),
    };

    addOrUpdateValidacao(validacao);
    onVoltar();
  }

  return (
    <div>
      <div style={{ ...card, background: '#085041', color: 'white' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {aluno?.nome || `Aluno ${aluno?.numero || selecao.alunoId}`}
        </div>
        <div style={{ fontSize: 11, opacity: 0.85 }}>
          {aluno?.turmaId || selecao.turmaId}
          {plano ? ` · ${plano.data}` : ''}
        </div>
      </div>

      {plano && (
        <div style={card}>
          <div style={muted}>Plano de Aula</div>
          <div style={{ fontWeight: 700 }}>{plano.titulo}</div>
          <div style={muted}>
            {plano.data} · {plano.horaInicio}-{plano.horaFim}
          </div>
        </div>
      )}

      {ficha && (
        <div style={card}>
          <div style={muted}>Ficha de Produção</div>
          <div style={{ fontWeight: 700 }}>{ficha.nomePrato}</div>
          <div style={muted}>
            {ficha.classificacao || 'Sem classificação'} · {ficha.numPorcoes} porções
          </div>
        </div>
      )}

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Competências avaliadas</h3>

        {selecao.autoavaliacoes.map((a) => (
          <div
            key={a.competenciaId}
            style={{
              padding: 10,
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {nomeCompetencia(a.competenciaId)}
            </div>

            <div style={muted}>
              Autoavaliação: {a.nivel} → {NIVEL_AUTO_NOTA[a.nivel]}/20
            </div>

            <div style={{ marginTop: 6 }}>
              <label style={{ fontSize: 11 }}>Nota final do professor</label>
              <input
                style={input}
                type="number"
                min={0}
                max={20}
                value={notas[a.competenciaId] ?? 0}
                onChange={(e) =>
                  setNota(a.competenciaId, parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <label>Comentário geral do professor</label>
        <textarea
          style={{ ...input, minHeight: 80 }}
          value={comentarioGeral}
          onChange={(e) => setComentarioGeral(e.target.value)}
          placeholder="Observações, correções, pontos a melhorar..."
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btnSec} onClick={onVoltar}>
          ← Voltar
        </button>
        <button style={{ ...btn, flex: 1 }} onClick={guardar}>
          Validar avaliação
        </button>
      </div>
    </div>
  );
}
