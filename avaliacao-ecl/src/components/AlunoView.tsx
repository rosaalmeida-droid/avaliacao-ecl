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
