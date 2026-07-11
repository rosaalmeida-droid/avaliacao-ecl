// ============================================================
// AvisoAvaliacaoAnterior.tsx
// Mostra aviso quando um aluno já foi avaliado numa competência
// nesta UC/UFCD e dá ao professor 3 opções:
//   1. Voltar a avaliar (nova avaliação nesta aula)
//   2. Considerar feito — usar nota anterior (conta para média)
//   3. Considerar feito — só registo (não conta para média)
// ============================================================

import React, { useState, useEffect } from 'react';
import { mapaAvaliacoesAnteriores, addRegistoAvaliacao, RegistoAvaliacao } from '../backend';
import { encontrarMicro, OBRIGATORIAS } from '../competenciasECL';
import { Aluno, PlanoAula } from '../types';
import { ucsEquivalentes } from '../cronograma';

interface Props {
  plano: PlanoAula;
  alunos: Aluno[];
  microIds: string[];       // ids das competências a avaliar neste plano
  nomeProfessor: string;
  onDecisao?: (alunoId: string, microId: string, decisao: 'reavaliar' | 'feito_nota' | 'feito_registo') => void;
}

interface Decisao {
  tipo: 'reavaliar' | 'feito_nota' | 'feito_registo' | null;
}

function formatarData(iso: string) {
  try { return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return iso; }
}

function NotaBadge({ nota }: { nota: number }) {
  const cor = nota >= 16 ? '#15803d' : nota >= 12 ? '#1d6fa4' : '#c0392b';
  const bg  = nota >= 16 ? '#f0fdf4'  : nota >= 12 ? '#e8f1fb'  : '#fef2f2';
  return (
    <span style={{ background: bg, color: cor, fontWeight: 800, fontSize: 13, padding: '2px 8px', borderRadius: 6, display: 'inline-block' }}>
      {nota}
    </span>
  );
}

export function AvisoAvaliacaoAnterior({ plano, alunos, microIds, nomeProfessor, onDecisao }: Props) {
  const ucOuUfcd = plano.ucId || '';

  // Calcular quais alunos já foram avaliados em cada micro
  const mapa = React.useMemo(() => {
    if (!ucOuUfcd || !alunos.length || !microIds.length) return {};
    const alunoIds = alunos.map(a => a.id);
    return mapaAvaliacoesAnteriores(alunoIds, ucOuUfcd, microIds);
  }, [ucOuUfcd, alunos, microIds]);

  // Decisões já tomadas: { alunoId_microId: Decisao }
  const [decisoes, setDecisoes] = useState<Record<string, Decisao>>({});
  const [processando, setProcessando] = useState<string | null>(null);

  // Construir lista de conflitos (aluno × micro com avaliação anterior)
  const conflitos = React.useMemo(() => {
    const lista: { alunoId: string; microId: string; registos: RegistoAvaliacao[] }[] = [];
    for (const alunoId of Object.keys(mapa)) {
      for (const microId of Object.keys(mapa[alunoId])) {
        const regs = mapa[alunoId][microId];
        if (regs.length > 0) lista.push({ alunoId, microId, registos: regs });
      }
    }
    return lista;
  }, [mapa]);

  if (conflitos.length === 0) return null;

  const pendentes = conflitos.filter(c => !decisoes[`${c.alunoId}_${c.microId}`]?.tipo);

  function tomarDecisao(alunoId: string, microId: string, tipo: 'reavaliar' | 'feito_nota' | 'feito_registo', registos: RegistoAvaliacao[]) {
    const chave = `${alunoId}_${microId}`;
    setProcessando(chave);

    if (tipo === 'feito_nota' || tipo === 'feito_registo') {
      // Criar registo "considerado feito" baseado no mais recente
      const maisRecente = [...registos].sort((a, b) => b.data.localeCompare(a.data))[0];
      addRegistoAvaliacao({
        id: `${chave}_cf_${Date.now()}`,
        alunoId,
        turmaId: plano.turmaId,
        planoAulaId: plano.id,
        fichaId: '',
        ucId: ucOuUfcd,
        microcompetenciaId: microId,
        nota: tipo === 'feito_nota' ? maisRecente.nota : 0,
        data: new Date().toISOString().slice(0, 10),
        observacao: `Considerado feito — avaliado no plano ${maisRecente.planoAulaId} com nota ${maisRecente.nota}`,
        validadoPor: nomeProfessor,
        consideradoFeito: true,
        contaParaMedia: tipo === 'feito_nota',
      } as any);
    }

    setDecisoes(prev => ({ ...prev, [chave]: { tipo } }));
    setProcessando(null);
    onDecisao?.(alunoId, microId, tipo);
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Cabeçalho */}
      <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FFF3D6', border: '1.5px solid #FBC02D', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#5A3E00', marginBottom: 2 }}>
          ⚠️ {conflitos.length} competência{conflitos.length !== 1 ? 's' : ''} já avaliada{conflitos.length !== 1 ? 's' : ''} nesta UC
        </div>
        <div style={{ fontSize: 11, color: '#7A5500' }}>
          Decide o que fazer para cada aluno antes de avançar para a avaliação.
          {pendentes.length > 0 && ` · ${pendentes.length} por decidir`}
        </div>
      </div>

      {/* Lista de conflitos */}
      {conflitos.map(({ alunoId, microId, registos }) => {
        const aluno = alunos.find(a => a.id === alunoId);
        const micro = encontrarMicro(microId);
        const chave = `${alunoId}_${microId}`;
        const decisao = decisoes[chave];
        const maisRecente = [...registos].sort((a, b) => b.data.localeCompare(a.data))[0];
        const isProcessando = processando === chave;

        return (
          <div key={chave} style={{
            background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 6,
            border: `1px solid ${decisao?.tipo ? 'rgba(26,23,20,0.08)' : '#FBC02D'}`,
            opacity: decisao?.tipo ? 0.7 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {aluno?.nome || `Aluno ${aluno?.numero || '?'}`}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
                  {micro?.nome || microId}
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(26,23,20,0.35)', marginLeft: 6 }}>({microId})</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <NotaBadge nota={maisRecente.nota} />
                <div style={{ fontSize: 10, color: 'rgba(26,23,20,0.4)', marginTop: 2 }}>
                  {formatarData(maisRecente.data)}
                </div>
              </div>
            </div>

            {/* Histórico resumido */}
            {registos.length > 1 && (
              <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.45)', marginBottom: 8, paddingLeft: 4 }}>
                {registos.length} avaliações anteriores · média {(registos.reduce((s, r) => s + r.nota, 0) / registos.length).toFixed(1)}
              </div>
            )}

            {/* Decisão já tomada */}
            {decisao?.tipo && (
              <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>
                {decisao.tipo === 'reavaliar' && '🔄 Vai ser reavaliado nesta aula'}
                {decisao.tipo === 'feito_nota' && '✓ Considerado feito — nota anterior conta'}
                {decisao.tipo === 'feito_registo' && '✓ Considerado feito — só registo'}
              </div>
            )}

            {/* Botões de decisão */}
            {!decisao?.tipo && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => tomarDecisao(alunoId, microId, 'reavaliar', registos)}
                  disabled={!!isProcessando}
                  style={{ flex: 1, minWidth: 100, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #1d6fa4', background: 'white', color: '#1d6fa4', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  🔄 Reavaliar
                </button>
                <button
                  onClick={() => tomarDecisao(alunoId, microId, 'feito_nota', registos)}
                  disabled={!!isProcessando}
                  style={{ flex: 1, minWidth: 100, padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--sage)', background: 'white', color: 'var(--sage)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  ✓ Feito · nota {maisRecente.nota}
                </button>
                <button
                  onClick={() => tomarDecisao(alunoId, microId, 'feito_registo', registos)}
                  disabled={!!isProcessando}
                  style={{ flex: 1, minWidth: 100, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', background: 'white', color: 'rgba(26,23,20,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  ✓ Feito · só registo
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
