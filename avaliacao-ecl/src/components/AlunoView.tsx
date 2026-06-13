import React, { useMemo, useState } from 'react';
import { Aluno, Comanda, SelecaoAluno, AutoavaliacaoCompetencia, Categoria, NivelAuto, MINIMO_POR_ANO } from '../types';
import { TECNICAS, ATITUDES, RESPONSABILIDADES, getCompetencia } from '../competencias';
import { opcoesAutoavaliacao } from '../frases';
import { construirHistoricoProvisorio, analisarCategoria, badgeCompetencia, calcularProgressoUCs } from '../progresso';
import { getComandas, getSelecoes, getValidacoes, addOrUpdateSelecao } from '../backend';
import { Card, Button, Chip, Badge, ProgressBar } from './ui';

const CATEGORIAS: { id: Categoria; label: string }[] = [
  { id: 'TECNICAS', label: 'Técnicas' },
  { id: 'ATITUDES', label: 'Atitudes' },
  { id: 'RESPONSABILIDADES', label: 'Responsabilidades' },
];

function listaCategoria(cat: Categoria) {
  switch (cat) {
    case 'TECNICAS': return TECNICAS;
    case 'ATITUDES': return ATITUDES;
    case 'RESPONSABILIDADES': return RESPONSABILIDADES;
  }
}

export function AlunoView({ aluno }: { aluno: Aluno }) {
  const validacoes = getValidacoes();
  const selecoes = getSelecoes();
  const comandas = getComandas();

  const historico = useMemo(
    () => construirHistoricoProvisorio(aluno.id, validacoes, selecoes, selecoes, comandas),
    [aluno.id]
  );

  const comandasDoAluno = comandas.filter(c => c.alunosIds.includes(aluno.id));
  const comandasPendentes = comandasDoAluno.filter(c => !selecoes.some(s => s.comandaId === c.id && s.alunoId === aluno.id));

  const [comandaAtiva, setComandaAtiva] = useState<Comanda | null>(null);

  if (comandaAtiva) {
    return <SelecaoView comanda={comandaAtiva} aluno={aluno} historico={historico} onVoltar={() => setComandaAtiva(null)} />;
  }

  const progressoUC = calcularProgressoUCs(historico);
  const proximaUC = progressoUC.filter(p => p.nivel !== 'concluida').slice(-3); // as menos avançadas
  const ucsConcluidas = progressoUC.filter(p => p.nivel === 'concluida');
  const ucsQuaseLa = progressoUC.filter(p => p.nivel === 'quase_la');

  return (
    <div>
      <Card>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>O teu progresso</div>
        <div className="muted" style={{ marginBottom: 12 }}>
          {historico.totalAvaliacoes} avaliações registadas · média geral {historico.mediaGeral.toFixed(1)}
        </div>

        {ucsConcluidas.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <Badge tipo="dominada">🏆 {ucsConcluidas.length} unidade(s) de competência dominada(s)</Badge>
          </div>
        )}
        {ucsQuaseLa.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <Badge tipo="desenvolvimento">⭐ {ucsQuaseLa.length} unidade(s) quase concluída(s) (≥70%)</Badge>
          </div>
        )}

        <div className="muted" style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}>Unidades em que estás a trabalhar:</div>
        {proximaUC.map(p => (
          <div key={p.uc} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
              <span className="mono">{p.uc}</span>
              <span className="mono">{p.dominadas}/{p.totalCompetencias} · {p.percentagem}%</span>
            </div>
            <ProgressBar percent={p.percentagem} />
          </div>
        ))}
      </Card>

      <Card>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Comandas para avaliar</div>
        {comandasPendentes.length === 0 && <div className="muted">Sem comandas pendentes. 🎉</div>}
        {comandasPendentes.map(c => (
          <div key={c.id} className="option-card" onClick={() => setComandaAtiva(c)}>
            <div style={{ fontWeight: 600 }}>{c.titulo}</div>
            <div className="muted">{c.data} · {c.modo === 'grupo' ? 'Grupo' : 'Individual'}</div>
          </div>
        ))}
        <div className="mono muted" style={{ fontSize: 10, marginTop: 10 }}>
          O teu ID: {aluno.id} · Comandas no sistema: {comandas.length} · Atribuídas a ti: {comandasDoAluno.length}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Seleção de competências + autoavaliação para uma comanda
// ============================================================
function SelecaoView({
  comanda, aluno, historico, onVoltar,
}: {
  comanda: Comanda;
  aluno: Aluno;
  historico: ReturnType<typeof construirHistoricoProvisorio>;
  onVoltar: () => void;
}) {
  const fixas: Record<Categoria, string[]> = {
    TECNICAS: comanda.tecnicasFixas || [],
    ATITUDES: comanda.atitudesFixas || [],
    RESPONSABILIDADES: comanda.responsabilidadesFixas || [],
  };

  const minBase = MINIMO_POR_ANO[aluno.ano] || 3;
  const minPorCategoria: Record<Categoria, number> = {
    TECNICAS: Math.min(minBase, TECNICAS.length),
    ATITUDES: Math.min(minBase, ATITUDES.length),
    RESPONSABILIDADES: Math.min(minBase, RESPONSABILIDADES.length),
  };

  const [selecionados, setSelecionados] = useState<Record<Categoria, string[]>>({
    TECNICAS: [...fixas.TECNICAS],
    ATITUDES: [...fixas.ATITUDES],
    RESPONSABILIDADES: [...fixas.RESPONSABILIDADES],
  });
  const [autoavaliacoes, setAutoavaliacoes] = useState<Record<string, NivelAuto>>({});
  const [passo, setPasso] = useState<'selecionar' | 'autoavaliar'>('selecionar');

  const sugeridas: Record<Categoria, string[]> = {
    TECNICAS: comanda.tecnicasSugeridas,
    ATITUDES: comanda.atitudesSugeridas,
    RESPONSABILIDADES: comanda.responsabilidadesSugeridas,
  };

  function toggle(cat: Categoria, id: string) {
    if (fixas[cat].includes(id)) return; // obrigatória — não pode ser removida
    setSelecionados(prev => {
      const atual = prev[cat];
      if (atual.includes(id)) return { ...prev, [cat]: atual.filter(x => x !== id) };
      return { ...prev, [cat]: [...atual, id] };
    });
  }

  const todosMinimos = CATEGORIAS.every(c => selecionados[c.id].length >= minPorCategoria[c.id]);
  const todosIdsSelecionados = [...selecionados.TECNICAS, ...selecionados.ATITUDES, ...selecionados.RESPONSABILIDADES];
  const todosAutoavaliados = todosIdsSelecionados.every(id => autoavaliacoes[id]);

  function guardar() {
    const auto: AutoavaliacaoCompetencia[] = todosIdsSelecionados.map(id => ({ competenciaId: id, nivel: autoavaliacoes[id] }));
    const selecao: SelecaoAluno = {
      id: `${comanda.id}__${aluno.id}`,
      comandaId: comanda.id,
      alunoId: aluno.id,
      turmaId: aluno.turmaId,
      tecnicas: selecionados.TECNICAS,
      atitudes: selecionados.ATITUDES,
      responsabilidades: selecionados.RESPONSABILIDADES,
      autoavaliacoes: auto,
      criadaEm: new Date().toISOString(),
    };
    addOrUpdateSelecao(selecao);
    onVoltar();
  }

  if (passo === 'autoavaliar') {
    return (
      <div>
        <Card>
          <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Como correu?</div>
          <div className="muted" style={{ marginBottom: 12 }}>{comanda.titulo} — escolhe a frase que melhor descreve o que aconteceu em cada competência.</div>
        </Card>

        {todosIdsSelecionados.map(id => {
          const comp = getCompetencia(id);
          if (!comp) return null;
          const opcoes = opcoesAutoavaliacao(id);
          return (
            <Card key={id}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{comp.nome}</div>
              {opcoes.map(op => (
                <div
                  key={op.nivel}
                  className={`option-card ${autoavaliacoes[id] === op.nivel ? 'selected' : ''}`}
                  onClick={() => setAutoavaliacoes(prev => ({ ...prev, [id]: op.nivel }))}
                >
                  {op.frase}
                </div>
              ))}
            </Card>
          );
        })}

        <Card>
          <Button block onClick={() => setPasso('selecionar')} variant="ghost">← Voltar à seleção</Button>
          <div style={{ height: 8 }} />
          <Button block onClick={guardar} disabled={!todosAutoavaliados}>Guardar avaliação</Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{comanda.titulo}</div>
        <div className="muted" style={{ marginBottom: 8 }}>{comanda.modo === 'grupo' ? 'Trabalho em grupo' : 'Trabalho individual'}{comanda.fatorConversao ? ` · fator de conversão ×${comanda.fatorConversao}` : ''}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          Escolhe pelo menos {minBase} em cada categoria ({aluno.ano}º ano). As destacadas (★) são sugestões para esta receita — mas podes escolher outras, sobretudo se ainda não as treinaste.
        </div>
      </Card>

      {CATEGORIAS.map(cat => {
        const lista = listaCategoria(cat.id);
        const { dominadas, novas } = analisarCategoria(historico, cat.id);
        return (
          <Card key={cat.id}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{cat.label} <span className="muted">(mín. {minPorCategoria[cat.id]} · selecionadas: {selecionados[cat.id].length})</span></div>
            <div>
              {lista.map(comp => {
                const isSelected = selecionados[cat.id].includes(comp.id);
                const isSuggested = sugeridas[cat.id].includes(comp.id);
                const isFixa = fixas[cat.id].includes(comp.id);
                const badge = badgeCompetencia(historico, comp.id);
                return (
                  <div key={comp.id} style={{ display: 'inline-block', marginRight: 4, marginBottom: 6 }}>
                    <Chip selected={isSelected} suggested={isSuggested} onClick={() => toggle(cat.id, comp.id)}>
                      {isFixa ? '🔒 ' : isSuggested ? '★ ' : ''}{comp.nome}
                    </Chip>
                    {isSelected && (
                      <div style={{ marginTop: 2 }}>
                        <Badge tipo={badge.tipo}>{isFixa ? 'Obrigatória · ' : ''}{badge.texto}</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {novas.length > 0 && dominadas.length > 0 && (
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                💡 Já dominas {dominadas.length} competência(s) nesta categoria — experimenta uma das {novas.length} que ainda não treinaste.
              </div>
            )}
          </Card>
        );
      })}

      <Card>
        <Button block variant="ghost" onClick={onVoltar}>← Voltar</Button>
        <div style={{ height: 8 }} />
        <Button block onClick={() => setPasso('autoavaliar')} disabled={!todosMinimos}>Continuar para autoavaliação</Button>
      </Card>
    </div>
  );
}

