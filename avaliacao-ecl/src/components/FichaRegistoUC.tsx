import React, { useState, useMemo } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { getAlunos, getHistoricoAvaliacoes, getPlanosAulaPorTurma } from '../backend';
import { OBRIGATORIAS, encontrarSubtecnica, encontrarAparelho, encontrarConhecimento, getAtitudeDetalhada } from '../compatECL';
import { modulosDaTurma } from '../cronograma';

function getNomeComp(id: string): string {
  if (id.startsWith('OBR_')) return OBRIGATORIAS.find(o => o.id === id)?.nome || id;
  if (id.startsWith('SUB-')) return encontrarSubtecnica(id)?.nome || id;
  if (id.startsWith('APP-')) return encontrarAparelho(id)?.nome || id;
  if (id.startsWith('KNW-')) return encontrarConhecimento(id)?.nome || id;
  if (id.startsWith('ATI-')) return getAtitudeDetalhada(id)?.nome || id;
  return id;
}

function corNota(n: number): string {
  if (n >= 4) return '#0369a1';
  if (n >= 3) return '#5a7a4e';
  if (n >= 2) return '#b5651d';
  if (n >= 1) return '#c0392b';
  return 'rgba(26,23,20,0.2)';
}

// Converter nota interna 1-4 para escala 0-20 (×5)
function para20(n: number): number { return Math.min(20, Math.round(n * 4)); }

export function FichaRegistoUC({ turmaId }: { turmaId: string }) {
  const modulos = modulosDaTurma(turmaId);
  const alunos = getAlunos().filter(a => a.turmaId === turmaId).sort((a,b) => a.numero - b.numero);
  const historico = getHistoricoAvaliacoes().filter(r => r.turmaId === turmaId);
  const planos = getPlanosAulaPorTurma(turmaId);

  const [ucSel, setUcSel] = useState('');
  const [periodo, setPeriodo] = useState<'tudo'|'T1'|'T2'|'T3'>('tudo');
  const isUFCD = modulos.some(m => m.tipo === 'UFCD');

  function datasT(t: 1|2|3) {
    if (t===1) return { i:'2026-09-01', f:'2026-12-31' };
    if (t===2) return { i:'2027-01-01', f:'2027-04-15' };
    return { i:'2027-04-16', f:'2027-07-31' };
  }

  const regsFiltrados = useMemo(() => {
    let r = historico.filter(x => !ucSel || x.ucId === ucSel);
    if (periodo !== 'tudo') {
      const { i, f } = datasT(parseInt(periodo[1]) as 1|2|3);
      r = r.filter(x => x.data >= i && x.data <= f);
    }
    return r;
  }, [historico, ucSel, periodo]);

  // Competências avaliadas neste filtro
  const compsAvaliadas = useMemo(() => {
    const ids = new Set(regsFiltrados.map(r => r.microcompetenciaId));
    return Array.from(ids).sort((a,b) => a.localeCompare(b));
  }, [regsFiltrados]);

  // Nota de um aluno numa competência
  function notaAluno(alunoId: string, compId: string): number | null {
    const regs = regsFiltrados.filter(r => r.alunoId === alunoId && r.microcompetenciaId === compId);
    if (!regs.length) return null;
    return regs.reduce((a,b) => a + b.nota, 0) / regs.length;
  }

  // Média geral de um aluno
  function mediaAluno(alunoId: string): number {
    const regs = regsFiltrados.filter(r => r.alunoId === alunoId);
    if (!regs.length) return 0;
    return regs.reduce((a,b) => a + b.nota, 0) / regs.length;
  }

  const ucNome = modulos.find(m => m.id === ucSel)?.nome || '';
  const hoje = new Date().toLocaleDateString('pt-PT');

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Cabeçalho */}
      <div style={{ background: '#1a1714', borderRadius: 14, padding: '16px 18px', marginBottom: 14, color: '#faf7f2' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>📋 Ficha de Registo por {isUFCD ? 'UFCD' : 'UC'}</h2>
        <div style={{ fontSize: 12, opacity: 0.5 }}>Registo formal das avaliações por competência — para impressão ou exportação</div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <select value={ucSel} onChange={e => setUcSel(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(26,23,20,0.08)', fontSize: 13 }}>
          <option value="">Todas as {isUFCD ? 'UFCDs' : 'UCs'}</option>
          {modulos.map(m => <option key={m.id} value={m.id}>{m.id} — {m.nome.slice(0,35)}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['tudo','T1','T2','T3'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ flex:1, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                background: periodo === p ? '#b5651d' : 'rgba(26,23,20,0.06)',
                color: periodo === p ? '#fff' : 'rgba(26,23,20,0.5)' }}>
              {p === 'tudo' ? 'Ano' : p}
            </button>
          ))}
        </div>
      </div>

      {compsAvaliadas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(26,23,20,0.4)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
          <div>Sem avaliações com estes filtros</div>
        </div>
      ) : (
        <>
          {/* Info da ficha */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', marginBottom: 12,
            border: '1px solid rgba(26,23,20,0.08)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
            <span><strong>Turma:</strong> {turmaId}</span>
            {ucSel && <span><strong>{isUFCD ? 'UFCD' : 'UC'}:</strong> {ucSel} — {ucNome.slice(0,40)}</span>}
            <span><strong>Período:</strong> {periodo === 'tudo' ? 'Ano lectivo' : `${periodo.slice(1)}º Trimestre`}</span>
            <span><strong>Data:</strong> {hoje}</span>
            <span><strong>Alunos:</strong> {alunos.length}</span>
            <span><strong>Competências:</strong> {compsAvaliadas.length}</span>
          </div>

          {/* Tabela */}
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(26,23,20,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#1a1714', color: '#faf7f2' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', position: 'sticky', left: 0, background: '#1a1714', minWidth: 100 }}>
                    Aluno
                  </th>
                  {compsAvaliadas.map(cId => (
                    <th key={cId} style={{ padding: '10px 6px', textAlign: 'center', minWidth: 60, maxWidth: 80 }}>
                      <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2 }}>{cId.split('-').slice(0,2).join('-')}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>
                        {getNomeComp(cId).slice(0, 20)}{getNomeComp(cId).length > 20 ? '…' : ''}
                      </div>
                    </th>
                  ))}
                  <th style={{ padding: '10px 8px', textAlign: 'center', minWidth: 50, background: '#2d2a26' }}>
                    Média /4
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', minWidth: 50, background: '#1a1714' }}>
                    Nota /20
                  </th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, i) => {
                  const media = mediaAluno(aluno.id);
                  return (
                    <tr key={aluno.id} style={{ background: i%2===0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: 12,
                        position: 'sticky', left: 0, background: i%2===0 ? '#fff' : '#fafaf8',
                        borderRight: '2px solid rgba(26,23,20,0.08)' }}>
                        <span style={{ color: 'rgba(26,23,20,0.4)', marginRight: 4 }}>{aluno.numero}</span>
                        {aluno.nome || `Aluno ${aluno.numero}`}
                      </td>
                      {compsAvaliadas.map(cId => {
                        const nota = notaAluno(aluno.id, cId);
                        return (
                          <td key={cId} style={{ padding: '8px 4px', textAlign: 'center',
                            borderBottom: '1px solid rgba(26,23,20,0.04)' }}>
                            {nota !== null ? (
                              <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 20,
                                background: `${corNota(nota)}18`, color: corNota(nota),
                                fontWeight: 800, fontSize: 13 }}>
                                {nota.toFixed(1)}
                              </span>
                            ) : (
                              <span style={{ color: 'rgba(26,23,20,0.15)', fontSize: 16 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: '8px 8px', textAlign: 'center',
                        borderBottom: '1px solid rgba(26,23,20,0.04)',
                        background: media > 0 ? `${corNota(media)}10` : 'transparent' }}>
                        {media > 0 ? (
                          <span style={{ fontWeight: 800, fontSize: 14, color: corNota(media) }}>
                            {media.toFixed(1)}
                          </span>
                        ) : <span style={{ color: 'rgba(26,23,20,0.2)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
                {/* Linha de médias da turma */}
                <tr style={{ background: '#f0f0ec', fontWeight: 700 }}>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(26,23,20,0.6)',
                    position: 'sticky', left: 0, background: '#f0f0ec',
                    borderTop: '2px solid rgba(26,23,20,0.12)', borderRight: '2px solid rgba(26,23,20,0.08)' }}>
                    Média da turma
                  </td>
                  {compsAvaliadas.map(cId => {
                    const regs = regsFiltrados.filter(r => r.microcompetenciaId === cId);
                    const m = regs.length ? regs.reduce((a,b) => a + b.nota, 0) / regs.length : 0;
                    return (
                      <td key={cId} style={{ padding: '8px 4px', textAlign: 'center',
                        borderTop: '2px solid rgba(26,23,20,0.12)' }}>
                        {m > 0 ? (
                          <span style={{ fontWeight: 800, fontSize: 12, color: corNota(m) }}>{m.toFixed(1)}</span>
                        ) : <span style={{ color: 'rgba(26,23,20,0.2)' }}>—</span>}
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px 8px', textAlign: 'center',
                    borderTop: '2px solid rgba(26,23,20,0.12)' }}>
                    {(() => {
                      const m = regsFiltrados.length
                        ? regsFiltrados.reduce((a,b) => a+b.nota,0)/regsFiltrados.length : 0;
                      return m > 0 ? <span style={{ fontWeight: 800, fontSize: 14, color: corNota(m) }}>{m.toFixed(1)}</span> : '—';
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legenda */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', fontSize: 11 }}>
            {[
              { n: 4, label: '🌟 Faço com muito bom resultado', cor: '#0369a1' },
              { n: 3, label: '✅ Faz sozinho/a',      cor: '#5a7a4e' },
              { n: 2, label: '🤝 Consegui com ajuda',      cor: '#b5651d' },
              { n: 1, label: '📖 Não conseguiu',  cor: '#c0392b' },
            ].map(l => (
              <div key={l.n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 24, height: 16, borderRadius: 10,
                  background: `${l.cor}18`, color: l.cor, fontWeight: 800, fontSize: 10, textAlign: 'center', lineHeight: '16px' }}>
                  {l.n}
                </span>
                <span style={{ color: 'rgba(26,23,20,0.5)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default FichaRegistoUC;
