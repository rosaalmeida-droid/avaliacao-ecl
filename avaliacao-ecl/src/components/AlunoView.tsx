import React, { useState } from 'react';
import { Aluno, PlanoAula, FichaProducao, RequisicaoAula } from '../types';
import {
  getPlanosAulaPorTurma,
  getFichasPorPlano,
  getRequisicaoPorPlano,
  getDistribuicoesPorPlano,
  getChecklistAlunoFicha,
  addOrUpdateChecklistAluno,
  addOrUpdateSelecao,
} from '../backend';
import {
  getCompetenciasPermanentes,
  getCompetenciasContexto,
  EstadoProgressao,
  ESTADO_LABEL,
  ESTADO_COR,
  CompetenciaAtitudinal,
} from '../progressaoAtitudes';

const card: React.CSSProperties = {
  background: 'var(--color-background-primary)',
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: 12,
  padding: '12px 14px',
  marginBottom: 10,
};

const muted: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 11,
};

const btnPrimary = (disabled = false): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: 'none',
  background: disabled ? 'var(--color-background-secondary)' : '#1D9E75',
  color: disabled ? 'var(--color-text-secondary)' : 'white',
  fontWeight: 600,
  fontSize: 13,
  marginTop: 6,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

type Nivel = 'inicial' | 'em_desenvolvimento' | 'consolidado' | 'avancado' | null;

function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${steps.length},1fr)`,
        borderRadius: 10,
        overflow: 'hidden',
        border: '0.5px solid var(--color-border-tertiary)',
        marginBottom: 12,
      }}
    >
      {steps.map((s, i) => (
        <div
          key={i}
          style={{
            padding: '6px 2px',
            textAlign: 'center',
            fontSize: 9,
            borderRight: i < steps.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
            background: i < current ? '#EAF3DE' : i === current ? '#1D9E75' : 'var(--color-background-secondary)',
            color: i < current ? '#3B6D11' : i === current ? 'white' : 'var(--color-text-secondary)',
            fontWeight: i === current ? 600 : 400,
          }}
        >
          {i < current ? '✓ ' : ''}
          {s}
        </div>
      ))}
    </div>
  );
}

export function AlunoView({ aluno }: { aluno: Aluno }) {
  const planos = getPlanosAulaPorTurma(aluno.turmaId).filter((p) => p.estado === 'publicado');
  const [planoAtivo, setPlanoAtivo] = useState<PlanoAula | null>(null);

  if (planoAtivo) {
    return <PlanoAluno plano={planoAtivo} aluno={aluno} onVoltar={() => setPlanoAtivo(null)} />;
  }

  return (
    <div>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Olá, {aluno.nome || `Aluno ${aluno.numero}`}!</div>
        <div style={muted}>{aluno.turmaId} · {aluno.ano}º ano</div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Planos de aula disponíveis</div>

        {planos.length === 0 && <div style={muted}>Ainda não existem planos publicados.</div>}

        {planos.map((p) => (
          <div
            key={p.id}
            onClick={() => setPlanoAtivo(p)}
            style={{
              padding: '10px 12px',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 8,
              marginBottom: 6,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.titulo}</div>
            <div style={muted}>
              {p.data} · {p.horaInicio}-{p.horaFim}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanoAluno({
  plano,
  aluno,
  onVoltar,
}: {
  plano: PlanoAula;
  aluno: Aluno;
  onVoltar: () => void;
}) {
  const STEPS = ['Plano', 'Ficha', 'Requisição', 'Avaliação', 'Fim'];
  const [passo, setPasso] = useState(0);
  const fichas = getFichasPorPlano(plano.id);
  const requisicao = getRequisicaoPorPlano(plano.id);
  const distribuicoes = getDistribuicoesPorPlano(plano.id);

  const fichasDoAluno = fichas.filter((f) => {
    const dist = distribuicoes.find((d) => d.fichaId === f.id);
    if (!dist) return true;
    if (dist.modo === 'todos') return true;
    return dist.alunosIds.includes(aluno.id) || dist.grupos.some((g) => g.alunosIds.includes(aluno.id));
  });

  const [fichaAtiva, setFichaAtiva] = useState<FichaProducao | null>(fichasDoAluno[0] || null);

  if (!fichaAtiva && fichasDoAluno.length > 0) {
    setFichaAtiva(fichasDoAluno[0]);
  }

  return (
    <div>
      <StepBar steps={STEPS} current={passo} />

      {passo === 0 && (
        <div>
          <div style={{ ...card, background: '#085041', color: 'white' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{plano.titulo}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>
              {plano.data} · {plano.horaInicio}-{plano.horaFim}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Fichas de Produção atribuídas</div>

            {fichasDoAluno.length === 0 && <div style={muted}>Não tens fichas atribuídas neste plano.</div>}

            {fichasDoAluno.map((f) => (
              <div
                key={f.id}
                onClick={() => setFichaAtiva(f)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: '0.5px solid var(--color-border-tertiary)',
                  marginBottom: 6,
                  background: fichaAtiva?.id === f.id ? '#EAF3DE' : 'var(--color-background-primary)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.nomePrato || 'Ficha sem nome'}</div>
                <div style={muted}>{f.classificacao || 'Sem classificação'} · {f.numPorcoes} porções</div>
              </div>
            ))}
          </div>

          <button style={btnPrimary(!fichaAtiva)} disabled={!fichaAtiva} onClick={() => setPasso(1)}>
            Abrir ficha de produção →
          </button>

          <button
            style={{ ...btnPrimary(), background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}
            onClick={onVoltar}
          >
            ← Voltar
          </button>
        </div>
      )}

      {passo === 1 && fichaAtiva && (
        <FichaAluno ficha={fichaAtiva} plano={plano} aluno={aluno} onNext={() => setPasso(2)} onBack={() => setPasso(0)} />
      )}

      {passo === 2 && (
        <RequisicaoAluno requisicao={requisicao} onNext={() => setPasso(3)} onBack={() => setPasso(1)} />
      )}

      {passo === 3 && fichaAtiva && (
        <AvaliacaoAluno
          ficha={fichaAtiva}
          plano={plano}
          aluno={aluno}
          onBack={() => setPasso(2)}
          onFinish={() => setPasso(4)}
        />
      )}

      {passo === 4 && (
        <div>
          <div style={{ ...card, textAlign: 'center', padding: 20 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#EAF3DE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                fontSize: 20,
                color: '#3B6D11',
              }}
            >
              ✓
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Trabalho submetido!</div>
            <div style={muted}>O professor irá validar a tua avaliação.</div>
          </div>

          <button style={btnPrimary()} onClick={onVoltar}>
            Voltar ao início
          </button>
        </div>
      )}
    </div>
  );
}

function FichaAluno({
  ficha,
  plano,
  aluno,
  onNext,
  onBack,
}: {
  ficha: FichaProducao;
  plano: PlanoAula;
  aluno: Aluno;
  onNext: () => void;
  onBack: () => void;
}) {
  const existente = getChecklistAlunoFicha(plano.id, ficha.id, aluno.id);

  const [ingredientesConfirmados, setIngredientesConfirmados] = useState<string[]>(
    existente?.ingredientesConfirmados || []
  );
  const [passosConcluidos, setPassosConcluidos] = useState<string[]>(existente?.passosConcluidos || []);
  const [haccpConfirmado, setHaccpConfirmado] = useState<string[]>(existente?.haccpConfirmado || []);
  const [comentario, setComentario] = useState(existente?.comentario || '');

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function guardarChecklist() {
    addOrUpdateChecklistAluno({
      id: existente?.id || `check_${plano.id}_${ficha.id}_${aluno.id}`,
      planoAulaId: plano.id,
      fichaId: ficha.id,
      alunoId: aluno.id,
      ingredientesConfirmados,
      passosConcluidos,
      haccpConfirmado,
      requisicaoVerificada: false,
      comentario,
      atualizadoEm: new Date().toISOString(),
    });
  }

  function continuar() {
    guardarChecklist();
    onNext();
  }

  return (
    <div>
      <div style={{ ...card, background: '#085041', color: 'white' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{ficha.nomePrato || 'Ficha de Produção'}</div>
        <div style={{ fontSize: 11, opacity: 0.85 }}>
          {ficha.classificacao || 'Sem classificação'} · {ficha.numPorcoes} porções
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ingredientes recebidos / disponíveis</div>

        {ficha.ingredientes.map((ing) => (
          <label
            key={ing.id}
            style={{
              display: 'block',
              padding: 8,
              borderRadius: 8,
              border: '0.5px solid var(--color-border-tertiary)',
              marginBottom: 5,
              background: ingredientesConfirmados.includes(ing.id) ? '#EAF3DE' : 'var(--color-background-primary)',
            }}
          >
            <input
              type="checkbox"
              checked={ingredientesConfirmados.includes(ing.id)}
              onChange={() => toggle(ingredientesConfirmados, setIngredientesConfirmados, ing.id)}
            />{' '}
            {ing.qt} {ing.un} {ing.produto}
          </label>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Passos da produção</div>

        {ficha.preparacao.map((p) => (
          <label
            key={p.id}
            style={{
              display: 'block',
              padding: 8,
              borderRadius: 8,
              border: '0.5px solid var(--color-border-tertiary)',
              marginBottom: 5,
              background: passosConcluidos.includes(p.id) ? '#EAF3DE' : 'var(--color-background-primary)',
            }}
          >
            <input
              type="checkbox"
              checked={passosConcluidos.includes(p.id)}
              onChange={() => toggle(passosConcluidos, setPassosConcluidos, p.id)}
            />{' '}
            <strong>{p.num}.</strong> {p.descricao}
            {(p.temperatura || p.tempo) && (
              <div style={muted}>
                {p.temperatura} {p.tempo}
              </div>
            )}
          </label>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Pontos HACCP / Registos</div>

        {ficha.preparacao.filter((p) => p.haccp).length === 0 && (
          <div style={muted}>Sem pontos HACCP específicos nesta ficha.</div>
        )}

        {ficha.preparacao
          .filter((p) => p.haccp)
          .map((p) => (
            <label
              key={p.id}
              style={{
                display: 'block',
                padding: 8,
                borderRadius: 8,
                border: '0.5px solid var(--color-border-tertiary)',
                marginBottom: 5,
                background: haccpConfirmado.includes(p.id) ? '#EAF3DE' : 'var(--color-background-primary)',
              }}
            >
              <input
                type="checkbox"
                checked={haccpConfirmado.includes(p.id)}
                onChange={() => toggle(haccpConfirmado, setHaccpConfirmado, p.id)}
              />{' '}
              {p.haccp}
            </label>
          ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Comentário / observação</div>
        <textarea
          style={{
            width: '100%',
            minHeight: 70,
            borderRadius: 8,
            border: '0.5px solid var(--color-border-tertiary)',
            padding: 8,
          }}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Ex: faltou ingrediente, substituição feita, dúvida, problema encontrado..."
        />
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ ...btnPrimary(), flex: 0, padding: '10px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onBack}>
          ←
        </button>
        <button style={{ ...btnPrimary(), flex: 1, marginTop: 0 }} onClick={continuar}>
          Guardar e continuar →
        </button>
      </div>
    </div>
  );
}

function RequisicaoAluno({
  requisicao,
  onNext,
  onBack,
}: {
  requisicao?: RequisicaoAula;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Requisição da aula</div>

        {!requisicao && <div style={muted}>A requisição ainda não está disponível.</div>}

        {requisicao && (
          <>
            <div style={muted}>Confirma os ingredientes e quantidades previstas para a aula.</div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 12 }}>
              <tbody>
                {requisicao.linhas.map((l) => (
                  <tr key={l.id}>
                    <td style={{ borderBottom: '0.5px solid #ddd', padding: 6 }}>{l.produto}</td>
                    <td style={{ borderBottom: '0.5px solid #ddd', padding: 6, textAlign: 'right' }}>
                      {l.quantidadeTotal} {l.unidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ ...btnPrimary(), flex: 0, padding: '10px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onBack}>
          ←
        </button>
        <button style={{ ...btnPrimary(), flex: 1, marginTop: 0 }} onClick={onNext}>
          Continuar →
        </button>
      </div>
    </div>
  );
}

function AvaliacaoAluno({
  ficha,
  plano,
  aluno,
  onBack,
  onFinish,
}: {
  ficha: FichaProducao;
  plano: PlanoAula;
  aluno: Aluno;
  onBack: () => void;
  onFinish: () => void;
}) {
  const distribuicoes = getDistribuicoesPorPlano(plano.id);
  const dist = distribuicoes.find((d) => d.fichaId === ficha.id);

  const contexto =
    dist?.modo === 'individual'
      ? 'individual'
      : dist?.tipoServico && dist.tipoServico !== 'normal'
        ? 'servico'
        : 'equipa';

  const permanentes = getCompetenciasPermanentes().slice(0, 4);
  const contextuais = getCompetenciasContexto(contexto as any).slice(0, 4);
  const todasComps = [...permanentes, ...contextuais].filter(
    (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
  ).slice(0, 8);

  const [niveis, setNiveis] = useState<Record<string, Nivel>>(
    Object.fromEntries(todasComps.map((c) => [c.id, null]))
  );
  const [aberta, setAberta] = useState<string | null>(todasComps[0]?.id || null);

  const feitas = todasComps.filter((c) => niveis[c.id] !== null).length;
  const avaliacaoOk = feitas === todasComps.length;

  function setNivel(id: string, v: Nivel) {
    setNiveis((p) => ({ ...p, [id]: p[id] === v ? null : v }));

    const idx = todasComps.findIndex((c) => c.id === id);
    if (idx < todasComps.length - 1) {
      setTimeout(() => setAberta(todasComps[idx + 1].id), 200);
    } else {
      setAberta(null);
    }
  }

  function guardar() {
    addOrUpdateSelecao({
      id: `${plano.id}_${ficha.id}_${aluno.id}`,
      comandaId: dist?.id || `${plano.id}_${ficha.id}`,
      planoAulaId: plano.id,
      fichaId: ficha.id,
      grupoId: undefined,
      alunoId: aluno.id,
      turmaId: aluno.turmaId,
      tecnicas: ficha.tecnicasSugeridas || [],
      atitudes: todasComps.map((c) => c.id),
      responsabilidades: [],
      autoavaliacoes: todasComps.map((c) => ({
        competenciaId: c.id,
        nivel:
          niveis[c.id] === 'avancado'
            ? 'superei'
            : niveis[c.id] === 'consolidado'
              ? 'atingi'
              : niveis[c.id] === 'em_desenvolvimento'
                ? 'desenvolvimento'
                : 'nao_atingi',
      })),
      criadaEm: new Date().toISOString(),
    });

    onFinish();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={muted}>Autoavaliação da ficha de produção</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1D9E75' }}>
          {feitas}/{todasComps.length}
        </span>
      </div>

      {todasComps.map((c) => (
        <CompCard
          key={c.id}
          comp={c}
          nivel={niveis[c.id]}
          aberta={aberta === c.id}
          onToggle={() => setAberta(aberta === c.id ? null : c.id)}
          onNivel={(v) => setNivel(c.id, v)}
        />
      ))}

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button style={{ ...btnPrimary(), flex: 0, padding: '10px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onBack}>
          ←
        </button>
        <button style={{ ...btnPrimary(!avaliacaoOk), flex: 1, marginTop: 0 }} disabled={!avaliacaoOk} onClick={guardar}>
          Submeter avaliação →
        </button>
      </div>
    </div>
  );
}

function CompCard({
  comp,
  nivel,
  aberta,
  onToggle,
  onNivel,
}: {
  comp: CompetenciaAtitudinal;
  nivel: Nivel;
  aberta: boolean;
  onToggle: () => void;
  onNivel: (v: Nivel) => void;
}) {
  return (
    <div
      style={{
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 10,
        marginBottom: 6,
        overflow: 'hidden',
      }}
    >
      <div onClick={onToggle} style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{comp.nome}</div>
          {nivel && (
            <div
              style={{
                fontSize: 10,
                marginTop: 1,
                color: ESTADO_COR[nivel].color,
                background: ESTADO_COR[nivel].bg,
                borderRadius: 20,
                padding: '1px 7px',
                display: 'inline-block',
              }}
            >
              {ESTADO_LABEL[nivel]}
            </div>
          )}
        </div>
      </div>

      {aberta && (
        <div
          style={{
            padding: '9px 12px',
            background: 'var(--color-background-secondary)',
            borderTop: '0.5px solid var(--color-border-tertiary)',
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 7 }}>
            {comp.definicao}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
            <div style={{ background: '#EAF3DE', borderRadius: 6, padding: '5px 7px' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#3B6D11', marginBottom: 2 }}>
                ✓ Observo quando
              </div>
              {comp.observar.slice(0, 2).map((s) => (
                <div key={s} style={{ fontSize: 9, color: '#27500A', lineHeight: 1.4 }}>
                  · {s}
                </div>
              ))}
            </div>

            <div style={{ background: '#FCEBEB', borderRadius: 6, padding: '5px 7px' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#A32D2D', marginBottom: 2 }}>
                ✗ Sinal de alerta
              </div>
              {comp.naoObservar.slice(0, 2).map((s) => (
                <div key={s} style={{ fontSize: 9, color: '#791F1F', lineHeight: 1.4 }}>
                  · {s}
                </div>
              ))}
            </div>
          </div>

          <NivelBtns valor={nivel} onChange={onNivel} comp={comp} />
        </div>
      )}
    </div>
  );
}

function NivelBtns({
  valor,
  onChange,
  comp,
}: {
  valor: Nivel;
  onChange: (v: Nivel) => void;
  comp?: CompetenciaAtitudinal;
}) {
  const estados: EstadoProgressao[] = ['inicial', 'em_desenvolvimento', 'consolidado', 'avancado'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3 }}>
      {estados.map((e) => (
        <button
          key={e}
          onClick={() => onChange(valor === e ? null : e)}
          style={{
            padding: '5px 3px',
            borderRadius: 6,
            fontSize: 9,
            cursor: 'pointer',
            textAlign: 'center',
            lineHeight: 1.3,
            border: `0.5px solid ${valor === e ? ESTADO_COR[e].color : 'var(--color-border-tertiary)'}`,
            background: valor === e ? ESTADO_COR[e].bg : 'var(--color-background-primary)',
            color: valor === e ? ESTADO_COR[e].color : 'var(--color-text-secondary)',
            fontWeight: valor === e ? 600 : 400,
          }}
        >
          {ESTADO_LABEL[e]}
          {comp && (
            <div style={{ fontSize: 8, lineHeight: 1.2, marginTop: 2, opacity: 0.85 }}>
              {comp.descritores[e].substring(0, 28)}…
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
