import React, { useState, useMemo } from 'react';
import { getHistoricoAvaliacoes, getAlunos, RegistoAvaliacao } from '../backend';
import { OBRIGATORIAS, encontrarMicro, encontrarAtitude } from '../competenciasECL';
import { UCS_COZINHA } from './PlanoAula';

function getNomeComp(id: string): string {
  if (id.startsWith('OBR_')) return OBRIGATORIAS.find(o => o.id === id)?.nome || id;
  if (id.startsWith('ATT_')) return encontrarAtitude(id)?.nome || id;
  return encontrarMicro(id)?.nome || id;
}

interface LinhaComp {
  compId: string;
  nome: string;
  registos: RegistoAvaliacao[];
  n: number;
  media: number;
}

interface LinhaAluno {
  alunoId: string;
  nome: string;
  numero: number;
  competencias: LinhaComp[];
  mediaGeral: number;
  totalAvaliacoes: number;
}

export function AvaliacaoPorUC({ turmaId }: { turmaId: string }) {
  const [ucId, setUcId] = useState('');
  const [filtroAluno, setFiltroAluno] = useState<string>('todos');
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set()); // ids de registos excluídos
  const [vistaPor, setVistaPor] = useState<'aluno' | 'competencia'>('aluno');

  const alunos = useMemo(() => getAlunos().filter(a => a.turmaId === turmaId).sort((a, b) => a.numero - b.numero), [turmaId]);
  const todosRegistos = useMemo(() => getHistoricoAvaliacoes(), []);

  // Registos filtrados por UC (e aluno, se aplicável)
  const registosUC = useMemo(() => {
    if (!ucId) return [];
    return todosRegistos.filter(r =>
      r.ucId === ucId &&
      (filtroAluno === 'todos' || r.alunoId === filtroAluno) &&
      !excluidos.has(r.id)
    );
  }, [todosRegistos, ucId, filtroAluno, excluidos]);

  // Agrupar por aluno → competência
  const porAluno: LinhaAluno[] = useMemo(() => {
    const alunosAlvo = filtroAluno === 'todos' ? alunos : alunos.filter(a => a.id === filtroAluno);
    return alunosAlvo.map(a => {
      const regsAluno = registosUC.filter(r => r.alunoId === a.id);
      const porComp = new Map<string, RegistoAvaliacao[]>();
      regsAluno.forEach(r => {
        const arr = porComp.get(r.microcompetenciaId) || [];
        arr.push(r);
        porComp.set(r.microcompetenciaId, arr);
      });
      const competencias: LinhaComp[] = Array.from(porComp.entries()).map(([compId, regs]) => ({
        compId, nome: getNomeComp(compId), registos: regs,
        n: regs.length, media: regs.reduce((s, r) => s + r.nota, 0) / regs.length,
      })).sort((x, y) => x.nome.localeCompare(y.nome));
      const totalAvaliacoes = regsAluno.length;
      const mediaGeral = totalAvaliacoes > 0 ? regsAluno.reduce((s, r) => s + r.nota, 0) / totalAvaliacoes : 0;
      return { alunoId: a.id, nome: (a as any).nome || `Aluno ${a.numero}`, numero: a.numero, competencias, mediaGeral, totalAvaliacoes };
    }).filter(l => l.totalAvaliacoes > 0 || filtroAluno !== 'todos');
  }, [alunos, registosUC, filtroAluno]);

  // Agrupar por competência → todos os alunos
  const porCompetencia = useMemo(() => {
    const porComp = new Map<string, RegistoAvaliacao[]>();
    registosUC.forEach(r => {
      const arr = porComp.get(r.microcompetenciaId) || [];
      arr.push(r);
      porComp.set(r.microcompetenciaId, arr);
    });
    return Array.from(porComp.entries()).map(([compId, regs]) => ({
      compId, nome: getNomeComp(compId), registos: regs,
      n: regs.length, media: regs.reduce((s, r) => s + r.nota, 0) / regs.length,
      nAlunos: new Set(regs.map(r => r.alunoId)).size,
    })).sort((x, y) => x.nome.localeCompare(y.nome));
  }, [registosUC]);

  function toggleExcluir(id: string) {
    setExcluidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function limparExclusoes() {
    setExcluidos(new Set());
  }

  const ucNome = UCS_COZINHA.find(u => u.id === ucId)?.nome || '';

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        Avaliação por Unidade de Competência
      </div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)', marginBottom: 16 }}>
        Filtra por UC para ver médias, frequências e ajustar o que entra no cálculo.
      </div>

      {/* Filtro UC */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">Unidade de Competência</label>
        <select className="input" value={ucId} onChange={e => { setUcId(e.target.value); setExcluidos(new Set()); }}>
          <option value="">— Selecciona a UC —</option>
          {UCS_COZINHA.map(u => <option key={u.id} value={u.id}>{u.id} — {u.nome}</option>)}
        </select>
        {ucNome && (
          <div style={{ fontSize: 12, color: 'var(--copper)', marginTop: 4, fontWeight: 600 }}>
            ✓ {ucId} — {ucNome}
          </div>
        )}
      </div>

      {ucId && (
        <>
          {/* Filtro aluno — decisão principal: toda a turma ou um aluno */}
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label" style={{ fontSize: 14, fontWeight: 700, color: 'var(--copper)', marginBottom: 6, display: 'block' }}>
              Aplicar a
            </label>
            <select className="input" value={filtroAluno} onChange={e => setFiltroAluno(e.target.value)} style={{ fontSize: 14 }}>
              <option value="todos">👥 Toda a turma ({alunos.length} alunos)</option>
              {alunos.map(a => <option key={a.id} value={a.id}>👤 {a.numero} — {(a as any).nome || `Aluno ${a.numero}`}</option>)}
            </select>
            {filtroAluno !== 'todos' && (
              <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 4, fontWeight: 600 }}>
                ✓ A mostrar só: {alunos.find(a => a.id === filtroAluno)?.numero} — {(alunos.find(a => a.id === filtroAluno) as any)?.nome || ''}
              </div>
            )}
          </div>

          {/* Vista */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <button onClick={() => setVistaPor('aluno')} style={{ flex: 1, padding: '10px 14px', border: 'none', background: vistaPor === 'aluno' ? 'var(--copper)' : '#fff', color: vistaPor === 'aluno' ? '#fff' : 'rgba(26,23,20,0.6)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Por aluno</button>
              <button onClick={() => setVistaPor('competencia')} style={{ flex: 1, padding: '10px 14px', border: 'none', background: vistaPor === 'competencia' ? 'var(--copper)' : '#fff', color: vistaPor === 'competencia' ? '#fff' : 'rgba(26,23,20,0.6)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Por competência</button>
            </div>
          </div>

          {excluidos.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--copper-pale)', borderRadius: 8, marginBottom: 12, fontSize: 13, color: 'var(--copper)' }}>
              <span style={{ flex: 1 }}>{excluidos.size} avaliação{excluidos.size !== 1 ? 'ões' : ''} excluída{excluidos.size !== 1 ? 's' : ''} do cálculo</span>
              <button onClick={limparExclusoes} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--copper)', background: '#fff', color: 'var(--copper)', cursor: 'pointer', fontWeight: 600 }}>Repor todas</button>
            </div>
          )}

          {registosUC.length === 0 && excluidos.size === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(26,23,20,0.4)' }}>
              Sem avaliações registadas para esta UC{filtroAluno !== 'todos' ? ' e este aluno' : ''}.
            </div>
          )}

          {/* VISTA POR ALUNO */}
          {vistaPor === 'aluno' && porAluno.map(la => (
            <div key={la.alunoId} style={{ marginBottom: 14, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: 'var(--charcoal)', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--copper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{la.numero}</div>
                <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{la.nome}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{la.mediaGeral.toFixed(1)}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{la.totalAvaliacoes} avaliações</div>
                </div>
              </div>
              <div style={{ padding: '10px 14px' }}>
                {la.competencias.map(c => (
                  <div key={c.compId} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                      <div style={{ fontSize: 13, color: c.media >= 12 ? 'var(--sage)' : 'var(--danger)', fontWeight: 700 }}>{c.media.toFixed(1)}</div>
                      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)' }}>({c.n}x)</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.registos.map(r => (
                        <button key={r.id} onClick={() => toggleExcluir(r.id)}
                          title={`${new Date(r.data).toLocaleDateString('pt-PT')} — clica para excluir`}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: 'rgba(26,23,20,0.6)', cursor: 'pointer' }}>
                          {r.nota} · {new Date(r.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {la.competencias.length === 0 && <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)' }}>Sem avaliações nesta UC.</div>}
              </div>
            </div>
          ))}

          {/* VISTA POR COMPETÊNCIA */}
          {vistaPor === 'competencia' && porCompetencia.map(c => (
            <div key={c.compId} style={{ marginBottom: 10, border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{c.nome}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: c.media >= 12 ? 'var(--sage)' : 'var(--danger)' }}>{c.media.toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)' }}>{c.n} avaliações · {c.nAlunos} alunos</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {c.registos.map(r => {
                  const aluno = alunos.find(a => a.id === r.alunoId);
                  return (
                    <button key={r.id} onClick={() => toggleExcluir(r.id)}
                      title="clica para excluir"
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', color: 'rgba(26,23,20,0.6)', cursor: 'pointer' }}>
                      #{aluno?.numero || '?'} · {r.nota} ✕
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default AvaliacaoPorUC;
