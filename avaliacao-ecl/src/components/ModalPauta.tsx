import React, { useState, useMemo, useEffect } from 'react';
import {
  getPlanosAulaPorTurma, getAlunos, getHistoricoAvaliacoes,
  gerarPautaFCTViaScript,
} from '../backend';
import { fmtDataCurta } from '../datas';
import { PlanoAula } from '../types';

// ── Tipos ─────────────────────────────────────────────────────
interface NotaAluno {
  alunoId: string;
  nome: string;
  numero: number;
  cm: number;   // Comportamento e Motivação (atitudes)
  cp: number;   // Conhecimentos e Procedimentos (técnica)
  cl: number;   // Comunicação e Linguagem
  co: number;   // Cooperação e Organização
  cr: number;   // Criatividade e Resolução
  notaFinal: number;
  ajustada: boolean;
}

interface Props {
  turmaId: string;
  nomeProfessor: string;
  onFechar: () => void;
}

// ── Helpers ───────────────────────────────────────────────────
function mediaNotas(notas: number[]): number {
  if (!notas.length) return 0;
  return Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10;
}

function notaParaEscala20(nota1a5: number): number {
  // 1→4, 2→8, 3→12, 4→16, 5→20
  return Math.min(20, Math.max(0, Math.round(nota1a5 * 4)));
}

function calcularNotaPropostaAluno(alunoId: string, planosIds: string[]): {
  cm: number; cp: number; cl: number; co: number; cr: number; notaFinal: number;
} {
  const hist = getHistoricoAvaliacoes().filter(
    r => r.alunoId === alunoId && planosIds.includes(r.planoAulaId || '')
  );
  // CP — média das notas de avaliação de competências técnicas
  const notasCP = hist.filter(r => r.microcompetenciaId && !r.microcompetenciaId.startsWith('ATT_'))
    .map(r => r.nota);
  // CM — média das notas de atitudes
  const notasCM = hist.filter(r => r.microcompetenciaId?.startsWith('ATT_'))
    .map(r => r.nota);

  const cp = notaParaEscala20(mediaNotas(notasCP) || 3);
  const cm = notaParaEscala20(mediaNotas(notasCM) || 3);
  const cl = 12; // sem dados → proposta média
  const co = 12;
  const cr = 12;
  const notaFinal = Math.round((cm * 0.2 + cp * 0.4 + cl * 0.15 + co * 0.15 + cr * 0.1) * 10) / 10;

  return { cm, cp, cl, co, cr, notaFinal };
}

// ═════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════
export function ModalPauta({ turmaId, nomeProfessor, onFechar }: Props) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [ucSel, setUcSel] = useState('');
  const [planosSel, setPlanosSel] = useState<Set<string>>(new Set());
  const [alunosSel, setAlunosSel] = useState<Set<string>>(new Set());
  const [notas, setNotas] = useState<Record<string, NotaAluno>>({});
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultUrl, setResultUrl] = useState('');

  // Dados
  const todosPlanos = useMemo(() =>
    getPlanosAulaPorTurma(turmaId).filter(p => p.estado !== 'arquivado'),
    [turmaId]);
  const alunos = useMemo(() => getAlunos().filter(a => a.turmaId === turmaId), [turmaId]);

  // UCs disponíveis nos planos
  const ucsDosPlanos = useMemo(() => {
    const ucs = new Map<string, string>();
    todosPlanos.forEach(p => { if (p.ucId) ucs.set(p.ucId, p.ucNome || p.ucId); });
    return Array.from(ucs.entries()).map(([id, nome]) => ({ id, nome }));
  }, [todosPlanos]);

  // Planos filtrados pela UC seleccionada
  const planosFiltrados = useMemo(() =>
    ucSel ? todosPlanos.filter(p => p.ucId === ucSel) : todosPlanos,
    [todosPlanos, ucSel]);

  // Inicializar selecção de planos quando muda a UC
  useEffect(() => {
    setPlanosSel(new Set(planosFiltrados.map(p => p.id)));
  }, [ucSel, planosFiltrados.length]);

  // Inicializar selecção de alunos
  useEffect(() => {
    setAlunosSel(new Set(alunos.map(a => a.id)));
  }, [alunos.length]);

  // Calcular notas propostas quando avança para passo 3
  useEffect(() => {
    if (passo !== 3) return;
    const planosIds = Array.from(planosSel);
    const novasNotas: Record<string, NotaAluno> = {};
    alunos.filter(a => alunosSel.has(a.id)).forEach((a, idx) => {
      const proposta = calcularNotaPropostaAluno(a.id, planosIds);
      novasNotas[a.id] = {
        alunoId: a.id, nome: a.nome || '', numero: idx + 1,
        ...proposta, ajustada: false,
      };
    });
    setNotas(novasNotas);
  }, [passo]);

  function ajustarNota(alunoId: string, campo: keyof Pick<NotaAluno, 'cm' | 'cp' | 'cl' | 'co' | 'cr'>, valor: number) {
    setNotas(prev => {
      const n = { ...prev[alunoId], [campo]: valor, ajustada: true };
      n.notaFinal = Math.round((n.cm * 0.2 + n.cp * 0.4 + n.cl * 0.15 + n.co * 0.15 + n.cr * 0.1) * 10) / 10;
      return { ...prev, [alunoId]: n };
    });
  }

  async function gerarPauta() {
    setGerando(true);
    setErro('');
    try {
      const ucNome = ucsDosPlanos.find(u => u.id === ucSel)?.nome || ucSel;
      const planosSelecionados = planosFiltrados.filter(p => planosSel.has(p.id));
      const dataInicio = planosSelecionados.map(p => p.data).sort()[0] || '';
      const dataTermo  = planosSelecionados.map(p => p.data).sort().at(-1) || '';

      const resultado = await gerarPautaFCTViaScript({
        turma: turmaId,
        disciplina: 'Serviços de Cozinha-Pastelaria',
        formador: nomeProfessor,
        ucId: ucSel,
        uc: ucNome,
        dataInicio, dataTermo,
        evidencias: [
          { nome: 'Comportamento e Motivação (CM)', peso: 20 },
          { nome: 'Conhecimentos e Procedimentos (CP)', peso: 40 },
          { nome: 'Comunicação e Linguagem (CL)', peso: 15 },
          { nome: 'Cooperação e Organização (CO)', peso: 15 },
          { nome: 'Criatividade e Resolução (CR)', peso: 10 },
        ],
        alunos: Object.values(notas).map(n => ({
          numero: n.numero, nome: n.nome, numEvidencias: planosSel.size,
          notasProdutos: [n.cp], cm: n.cm, cl: n.cl, co: n.co, cr: n.cr,
          notaFinal: n.notaFinal,
        })),
      });

      if (resultado.ok && resultado.pdfUrl) {
        setResultUrl(resultado.pdfUrl);
      } else {
        setErro(resultado.mensagem || 'Erro ao gerar pauta.');
      }
    } catch (e) {
      setErro('Erro de ligação ao servidor.');
    } finally {
      setGerando(false);
    }
  }

  // ── Render ────────────────────────────────────────────────
  const COR = '#00796B';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%',
        maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Cabeçalho */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(26,23,20,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>📊 Gerar Pauta de Avaliação</div>
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>{turmaId}</div>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: 'rgba(26,23,20,0.4)' }}>✕</button>
        </div>

        {/* Indicador de passos */}
        <div style={{ display: 'flex', padding: '12px 20px', gap: 8, flexShrink: 0,
          borderBottom: '1px solid rgba(26,23,20,0.06)' }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                background: passo >= n ? COR : 'rgba(26,23,20,0.08)',
                color: passo >= n ? '#fff' : 'rgba(26,23,20,0.4)' }}>{n}</div>
              <div style={{ fontSize: 12, color: passo === n ? COR : 'rgba(26,23,20,0.4)',
                fontWeight: passo === n ? 700 : 400 }}>
                {n === 1 ? 'Planos' : n === 2 ? 'Alunos' : 'Notas'}
              </div>
              {n < 3 && <div style={{ color: 'rgba(26,23,20,0.2)', fontSize: 14 }}>›</div>}
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* ── PASSO 1 — Planos ── */}
          {passo === 1 && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                  display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  UC / UFCD
                </label>
                <select value={ucSel} onChange={e => setUcSel(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10,
                    border: '1.5px solid rgba(26,23,20,0.15)', fontSize: 14, background: '#fff' }}>
                  <option value=''>— Todas as UCs —</option>
                  {ucsDosPlanos.map(u => (
                    <option key={u.id} value={u.id}>{u.id} — {u.nome}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {planosFiltrados.length} plano{planosFiltrados.length !== 1 ? 's' : ''}
                  {' · '}{planosSel.size} seleccionado{planosSel.size !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPlanosSel(new Set(planosFiltrados.map(p => p.id)))}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7,
                      border: '1px solid rgba(26,23,20,0.15)', background: '#fff', cursor: 'pointer' }}>
                    Todos
                  </button>
                  <button onClick={() => setPlanosSel(new Set())}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7,
                      border: '1px solid rgba(26,23,20,0.15)', background: '#fff', cursor: 'pointer' }}>
                    Nenhum
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
                {planosFiltrados.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 24, color: 'rgba(26,23,20,0.4)', fontSize: 13 }}>
                    Nenhum plano{ucSel ? ' para esta UC' : ''}.
                  </div>
                )}
                {planosFiltrados.map(p => (
                  <div key={p.id} onClick={() => setPlanosSel(prev => {
                    const s = new Set(prev);
                    s.has(p.id) ? s.delete(p.id) : s.add(p.id);
                    return s;
                  })} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${planosSel.has(p.id) ? COR : 'rgba(26,23,20,0.1)'}`,
                    background: planosSel.has(p.id) ? '#e0f2f1' : '#fff' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${planosSel.has(p.id) ? COR : 'rgba(26,23,20,0.2)'}`,
                      background: planosSel.has(p.id) ? COR : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 700 }}>
                      {planosSel.has(p.id) && '✓'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#2E2A26' }}>
                        {p.titulo || 'Plano de aula'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>
                        {p.data ? fmtDataCurta(p.data) + ' · ' : ''}{p.ucId || ''}{p.ucNome ? ' — ' + p.ucNome : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                      background: p.estado === 'publicado' ? 'rgba(90,122,78,0.12)' : 'rgba(181,101,29,0.1)',
                      color: p.estado === 'publicado' ? '#5a7a4e' : 'var(--copper)' }}>
                      {p.estado === 'publicado' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PASSO 2 — Alunos ── */}
          {passo === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {alunos.length} aluno{alunos.length !== 1 ? 's' : ''}
                  {' · '}{alunosSel.size} seleccionado{alunosSel.size !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setAlunosSel(new Set(alunos.map(a => a.id)))}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7,
                      border: '1px solid rgba(26,23,20,0.15)', background: '#fff', cursor: 'pointer' }}>
                    Todos
                  </button>
                  <button onClick={() => setAlunosSel(new Set())}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7,
                      border: '1px solid rgba(26,23,20,0.15)', background: '#fff', cursor: 'pointer' }}>
                    Nenhum
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {alunos.map(a => (
                  <div key={a.id} onClick={() => setAlunosSel(prev => {
                    const s = new Set(prev);
                    s.has(a.id) ? s.delete(a.id) : s.add(a.id);
                    return s;
                  })} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${alunosSel.has(a.id) ? COR : 'rgba(26,23,20,0.1)'}`,
                    background: alunosSel.has(a.id) ? '#e0f2f1' : '#fff' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${alunosSel.has(a.id) ? COR : 'rgba(26,23,20,0.2)'}`,
                      background: alunosSel.has(a.id) ? COR : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 700 }}>
                      {alunosSel.has(a.id) && '✓'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.nome}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PASSO 3 — Notas ── */}
          {passo === 3 && (
            <div>
              {resultUrl ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Pauta gerada!</div>
                  <a href={resultUrl} target='_blank' rel='noreferrer'
                    style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 12,
                      background: COR, color: '#fff', fontWeight: 700, fontSize: 14,
                      textDecoration: 'none' }}>
                    📊 Abrir pauta no Google Sheets
                  </a>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginBottom: 12 }}>
                    Proposta calculada a partir do historial de avaliações. Ajusta antes de gerar.
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: COR, color: '#fff' }}>
                          <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700 }}>Aluno</th>
                          {['CM', 'CP', 'CL', 'CO', 'CR'].map(c => (
                            <th key={c} style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>{c}</th>
                          ))}
                          <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700 }}>Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(notas).map((n, ri) => (
                          <tr key={n.alunoId} style={{ background: ri % 2 === 0 ? '#e0f2f1' : '#fff' }}>
                            <td style={{ padding: '5px 8px', fontWeight: 600 }}>
                              {n.nome}
                              {n.ajustada && <span style={{ marginLeft: 4, fontSize: 10,
                                color: '#00796B', fontWeight: 700 }}>✎</span>}
                            </td>
                            {(['cm', 'cp', 'cl', 'co', 'cr'] as const).map(campo => (
                              <td key={campo} style={{ padding: '4px 4px', textAlign: 'center' }}>
                                <input type='number' min={0} max={20} step={1}
                                  value={n[campo]}
                                  onChange={e => ajustarNota(n.alunoId, campo, Math.max(0, Math.min(20, Number(e.target.value))))}
                                  style={{ width: 42, textAlign: 'center', padding: '3px 4px',
                                    borderRadius: 6, border: '1px solid rgba(26,23,20,0.2)', fontSize: 12 }} />
                              </td>
                            ))}
                            <td style={{ padding: '5px 8px', textAlign: 'center',
                              fontWeight: 700, fontSize: 13, color: n.notaFinal >= 10 ? COR : '#c0392b' }}>
                              {n.notaFinal}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginTop: 8 }}>
                    Ponderação: CM 20% · CP 40% · CL 15% · CO 15% · CR 10% · Escala 0–20
                  </div>
                  {erro && (
                    <div style={{ padding: '10px 14px', background: '#fdf0ef',
                      borderRadius: 8, color: '#c0392b', fontSize: 13, fontWeight: 600, marginTop: 12 }}>
                      ⚠️ {erro}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com navegação */}
        {!resultUrl && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(26,23,20,0.08)',
            display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <button onClick={() => passo > 1 ? setPasso((passo - 1) as 1 | 2 | 3) : onFechar()}
              style={{ padding: '10px 20px', borderRadius: 10,
                border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'rgba(26,23,20,0.6)' }}>
              {passo === 1 ? 'Cancelar' : '← Anterior'}
            </button>
            {passo < 3 ? (
              <button
                onClick={() => setPasso((passo + 1) as 2 | 3)}
                disabled={passo === 1 ? planosSel.size === 0 : alunosSel.size === 0}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: (passo === 1 ? planosSel.size === 0 : alunosSel.size === 0)
                    ? 'rgba(0,121,107,0.3)' : COR,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: (passo === 1 ? planosSel.size === 0 : alunosSel.size === 0) ? 'not-allowed' : 'pointer' }}>
                Seguinte →
              </button>
            ) : (
              <button onClick={gerarPauta} disabled={gerando || Object.keys(notas).length === 0}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: gerando ? 'rgba(0,121,107,0.3)' : COR,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: gerando ? 'not-allowed' : 'pointer' }}>
                {gerando ? '⏳ A gerar…' : '📊 Gerar Pauta'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
