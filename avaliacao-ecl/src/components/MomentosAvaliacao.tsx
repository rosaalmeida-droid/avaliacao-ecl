import React, { useState } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { getPlanosAulaPorTurma, getHistoricoAvaliacoes, getAlunos } from '../backend';
import { modulosDaTurma } from '../cronograma';

interface MomentoAval {
  id: string;
  ucId: string;
  nome: string;
  planIds: string[];
  fechado: boolean;
  criadoEm: string;
}

const KEY_MOMENTOS = 'ecl_momentos_avaliacao';

function getMomentos(): MomentoAval[] {
  try { return JSON.parse(localStorage.getItem(KEY_MOMENTOS) || '[]'); } catch { return []; }
}
function saveMomentos(m: MomentoAval[]) {
  localStorage.setItem(KEY_MOMENTOS, JSON.stringify(m));
}

function para20(n: number): number { return n > 0 ? Math.min(20, Math.round(n * 4)) : 0; }

function labelNota(n: number) {
  if (n >= 4) return { emoji: '🌟', cor: '#0369a1', label: 'Faço com muito bom resultado' };
  if (n >= 3) return { emoji: '✅', cor: '#5a7a4e', label: 'Bom' };
  if (n >= 2) return { emoji: '🤝', cor: '#b5651d', label: 'Suficiente' };
  return { emoji: '📖', cor: '#c0392b', label: 'Insuficiente' };
}

export function MomentosAvaliacao({ turmaId }: { turmaId: string }) {
  const [momentos, setMomentos] = useState<MomentoAval[]>(getMomentos);
  const [ucSel, setUcSel] = useState('');
  const [criar, setCriar] = useState(false);
  const [nomeMomento, setNomeMomento] = useState('');
  const [planosSel, setPlanosSel] = useState<Set<string>>(new Set());
  const [momentoAberto, setMomentoAberto] = useState<string | null>(null);

  const modulos = modulosDaTurma(turmaId);
  const planos = getPlanosAulaPorTurma(turmaId)
    .filter(p => !ucSel || p.ucId === ucSel)
    .sort((a, b) => b.data.localeCompare(a.data));
  const alunos = getAlunos().filter(a => a.turmaId === turmaId);
  const historico = getHistoricoAvaliacoes().filter(r => r.turmaId === turmaId);
  const momentosFiltrados = momentos.filter(m => !ucSel || m.ucId === ucSel);
  const isUFCD = modulos.some(m => m.tipo === 'UFCD');

  function save(m: MomentoAval[]) { setMomentos(m); saveMomentos(m); }

  function criarMomento() {
    if (!nomeMomento || !ucSel || planosSel.size === 0) return;
    const novo: MomentoAval = {
      id: `mom_${Date.now()}`, ucId: ucSel,
      nome: nomeMomento, planIds: Array.from(planosSel),
      fechado: false, criadoEm: new Date().toISOString(),
    };
    save([...momentos, novo]);
    setNomeMomento(''); setPlanosSel(new Set()); setCriar(false);
  }

  function toggleFechado(id: string) {
    save(momentos.map(m => m.id === id ? { ...m, fechado: !m.fechado } : m));
  }

  function eliminarMomento(id: string) {
    save(momentos.filter(m => m.id !== id));
  }

  // Calcular nota de um momento para um aluno
  function notaMomentoAluno(momento: MomentoAval, alunoId: string): number {
    const regs = historico.filter(r =>
      r.alunoId === alunoId && momento.planIds.includes(r.planoAulaId)
    );
    if (!regs.length) return 0;
    return regs.reduce((a, b) => a + b.nota, 0) / regs.length;
  }

  const T = { border: 'rgba(26,23,20,0.08)', copper: '#b5651d', sage: '#5a7a4e' };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ background: '#1a1714', borderRadius: 14, padding: '16px 18px', marginBottom: 16, color: '#faf7f2' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>📐 Momentos de Avaliação</h2>
        <div style={{ fontSize: 12, opacity: 0.5 }}>Agrupa planos de aula em momentos para calcular a nota da {isUFCD ? 'UFCD' : 'UC'}</div>
      </div>

      {/* Selector UC */}
      <div style={{ marginBottom: 14 }}>
        <select value={ucSel} onChange={e => { setUcSel(e.target.value); setCriar(false); }}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14 }}>
          <option value="">— Selecciona a {isUFCD ? 'UFCD' : 'UC'} —</option>
          {modulos.map(m => <option key={m.id} value={m.id}>{m.id} — {m.nome.slice(0, 40)}</option>)}
        </select>
      </div>

      {ucSel && (
        <>
          {/* Momentos existentes */}
          {momentosFiltrados.map(momento => {
            const aberto = momentoAberto === momento.id;
            const planosDoMomento = planos.filter(p => momento.planIds.includes(p.id));
            return (
              <div key={momento.id} style={{ marginBottom: 10, borderRadius: 12, overflow: 'hidden',
                border: `1.5px solid ${momento.fechado ? T.border : T.copper}`, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  background: momento.fechado ? 'rgba(26,23,20,0.03)' : 'rgba(181,101,29,0.04)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{momento.nome}</div>
                    <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.45)', marginTop: 2 }}>
                      {planosDoMomento.length} aula{planosDoMomento.length !== 1 ? 's' : ''} · {alunos.length} alunos
                      {momento.fechado && <span style={{ color: T.sage, marginLeft: 8 }}>🔒 Fechado</span>}
                    </div>
                  </div>
                  <button onClick={() => setMomentoAberto(aberto ? null : momento.id)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
                      background: 'transparent', cursor: 'pointer', fontSize: 12 }}>
                    {aberto ? '▲ Fechar' : '▼ Ver notas'}
                  </button>
                  {!momento.fechado && (
                    <button onClick={() => toggleFechado(momento.id)}
                      style={{ padding: '6px 12px', borderRadius: 8, border: 'none',
                        background: T.sage, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      🔒 Fechar
                    </button>
                  )}
                  {!momento.fechado && (
                    <button onClick={() => eliminarMomento(momento.id)}
                      style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid rgba(192,57,43,0.3)`,
                        background: 'transparent', color: '#c0392b', cursor: 'pointer', fontSize: 12 }}>
                      ✕
                    </button>
                  )}
                </div>
                {aberto && (
                  <div style={{ padding: '12px 14px', borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Notas por aluno
                    </div>
                    {alunos.map(aluno => {
                      const nota = notaMomentoAluno(momento, aluno.id);
                      const { emoji, cor, label } = labelNota(nota);
                      return (
                        <div key={aluno.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 10px', borderRadius: 8, background: 'rgba(26,23,20,0.02)',
                          marginBottom: 4, border: `1px solid ${T.border}` }}>
                          <span style={{ fontWeight: 700, fontSize: 13, minWidth: 24 }}>{aluno.numero}</span>
                          <span style={{ flex: 1, fontSize: 13 }}>{aluno.nome || `Aluno ${aluno.numero}`}</span>
                          {nota > 0 ? (
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontWeight: 800, fontSize: 16, color: cor }}>{nota.toFixed(1)}</span>
                              <span style={{ fontSize: 10, color: 'rgba(26,23,20,0.4)', marginLeft: 2 }}>/4</span>
                              <div style={{ fontSize: 13, fontWeight: 900, color: cor }}>{para20(nota)}<span style={{ fontSize: 10, color: 'rgba(26,23,20,0.4)' }}>/20</span></div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'rgba(26,23,20,0.3)' }}>sem dados</span>
                          )}
                          
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Criar novo momento */}
          {!criar ? (
            <button onClick={() => setCriar(true)}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: `2px dashed ${T.copper}`,
                background: 'transparent', color: T.copper, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
              + Criar novo momento de avaliação
            </button>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `1.5px solid ${T.copper}` }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Novo momento</div>
              <input value={nomeMomento} onChange={e => setNomeMomento(e.target.value)}
                placeholder="Nome (ex: Momento 1 — Outubro a Dezembro)"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
                  fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.5)', marginBottom: 8 }}>
                Selecciona as aulas a incluir neste momento:
              </div>
              {planos.filter(p => {
                const jaNoutroMomento = momentos.some(m => m.ucId === ucSel && m.planIds.includes(p.id));
                return !jaNoutroMomento;
              }).map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                  background: planosSel.has(p.id) ? 'rgba(181,101,29,0.06)' : 'rgba(26,23,20,0.02)',
                  border: `1px solid ${planosSel.has(p.id) ? T.copper : T.border}` }}>
                  <input type="checkbox" checked={planosSel.has(p.id)}
                    onChange={() => {
                      const novo = new Set(planosSel);
                      novo.has(p.id) ? novo.delete(p.id) : novo.add(p.id);
                      setPlanosSel(novo);
                    }} />
                  <span style={{ fontSize: 13, fontWeight: planosSel.has(p.id) ? 600 : 400 }}>
                    {fmtData(p.data)} — {p.titulo || p.ucId}
                  </span>
                </label>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={criarMomento} disabled={!nomeMomento || planosSel.size === 0}
                  style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                    background: !nomeMomento || planosSel.size === 0 ? 'rgba(26,23,20,0.1)' : T.copper,
                    color: !nomeMomento || planosSel.size === 0 ? 'rgba(26,23,20,0.4)' : '#fff',
                    cursor: !nomeMomento || planosSel.size === 0 ? 'default' : 'pointer',
                    fontSize: 14, fontWeight: 700 }}>
                  Criar momento
                </button>
                <button onClick={() => { setCriar(false); setNomeMomento(''); setPlanosSel(new Set()); }}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${T.border}`,
                    background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MomentosAvaliacao;
