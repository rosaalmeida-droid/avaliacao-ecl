import React, { useState, useMemo } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { getHistoricoAvaliacoes, getAlunos, getPlanosAulaPorTurma, getPlanosAula, RegistoAvaliacao, calcularBonusAssiduidadeUC } from '../backend';
import { OBRIGATORIAS, encontrarMicro, encontrarAtitude, encontrarSubtecnica, encontrarAparelho, encontrarConhecimento, getAtitudeDetalhada } from '../compatECL';
import { modulosDaTurma } from '../cronograma';
import { calcularNotaPlano } from '../types';

// ── Helpers ───────────────────────────────────────────────────
function getNomeComp(id: string): string {
  if (id.startsWith('OBR_')) return OBRIGATORIAS.find(o => o.id === id)?.nome || id;
  if (id.startsWith('ATI-')) return getAtitudeDetalhada(id)?.nome || encontrarAtitude(id)?.nome || id;
  if (id.startsWith('SUB-')) return encontrarSubtecnica(id)?.nome || id;
  if (id.startsWith('APP-')) return encontrarAparelho(id)?.nome || id;
  if (id.startsWith('KNW-')) return encontrarConhecimento(id)?.nome || id;
  if (id.startsWith('ATT_')) return encontrarAtitude(id)?.nome || id;
  return encontrarMicro(id)?.nome || id;
}

function labelNota(nota: number): { emoji: string; label: string; cor: string } {
  if (nota >= 4)   return { emoji: '🌟', label: 'Faço com muito bom resultado', cor: '#0369a1' };
  if (nota >= 3)   return { emoji: '✅', label: 'Faz sozinho/a',     cor: '#5a7a4e' };
  if (nota >= 2)   return { emoji: '🤝', label: 'Consegui com ajuda',     cor: '#b5651d' };
  if (nota >= 1)   return { emoji: '📖', label: 'Não conseguiu', cor: '#c0392b' };
  return { emoji: '—', label: '—', cor: 'rgba(26,23,20,0.3)' };
}

function media(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatarData(iso: string): string {
  try { return fmtData(iso); }
  catch { return ''; }
}

// ── Trimestre actual ──────────────────────────────────────────
function trimestreActual(): 1 | 2 | 3 {
  const mes = new Date().getMonth() + 1; // 1=jan ... 12=dez
  // 1º Trimestre: set(9)-dez(12) | 2º Trimestre: jan(1)-mar(3) | 3º Trimestre: abr(4)-jun(6)
  // jul-ago (férias): assume 1º trimestre (próximo período)
  if (mes >= 9 && mes <= 12) return 1;
  if (mes >= 1 && mes <= 3)  return 2;
  if (mes >= 4 && mes <= 6)  return 3;
  return 1; // jul-ago → próximo ano lectivo começa no 1º trimestre
}

function datasDoTrimestre(tri: 1 | 2 | 3, ano = 2026): { inicio: string; fim: string } {
  if (tri === 1) return { inicio: `${ano}-09-01`,   fim: `${ano}-12-31` };
  if (tri === 2) return { inicio: `${ano + 1}-01-01`, fim: `${ano + 1}-04-15` };
  return { inicio: `${ano + 1}-04-16`, fim: `${ano + 1}-07-31` };
}

// ── Componente principal ──────────────────────────────────────
export function AvaliacaoPorUC({ turmaId }: { turmaId: string }) {
  const modulos = modulosDaTurma(turmaId);
  const alunos = getAlunos().filter(a => a.turmaId === turmaId).sort((a, b) => a.numero - b.numero);
  const todosRegistos = getHistoricoAvaliacoes();
  const planos = getPlanosAulaPorTurma(turmaId);

  // Filtros
  const [filtroUC, setFiltroUC] = useState('');
  const [filtroAluno, setFiltroAluno] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'tudo' | 'T1' | 'T2' | 'T3' | 'personalizado'>('tudo');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [vistaAluno, setVistaAluno] = useState<string | null>(null);

  // Datas do período seleccionado
  const datas = useMemo(() => {
    if (filtroPeriodo === 'tudo') return null;
    if (filtroPeriodo === 'personalizado') return dataInicio && dataFim ? { inicio: dataInicio, fim: dataFim } : null;
    const t = parseInt(filtroPeriodo[1]) as 1|2|3;
    return datasDoTrimestre(t);
  }, [filtroPeriodo, dataInicio, dataFim]);

  // Registos filtrados
  const registosFiltrados = useMemo(() => {
    let regs = todosRegistos.filter(r => r.turmaId === turmaId);
    if (filtroUC) regs = regs.filter(r => r.ucId === filtroUC);
    if (datas) regs = regs.filter(r => r.data >= datas.inicio && r.data <= datas.fim);
    return regs;
  }, [todosRegistos, turmaId, filtroUC, datas]);

  // Dados por aluno
  const dadosPorAluno = useMemo(() => {
    const alunosVisiveis = filtroAluno === 'todos' ? alunos : alunos.filter(a => a.id === filtroAluno);
    return alunosVisiveis.map(aluno => {
      const regs = registosFiltrados.filter(r => r.alunoId === aluno.id);
      const porComp = new Map<string, RegistoAvaliacao[]>();
      regs.forEach(r => {
        if (!porComp.has(r.microcompetenciaId)) porComp.set(r.microcompetenciaId, []);
        porComp.get(r.microcompetenciaId)!.push(r);
      });
      const comps = Array.from(porComp.entries()).map(([id, rs]) => ({
        id, nome: getNomeComp(id),
        n: rs.length,
        media: media(rs.map(r => r.nota)),
        ultima: rs.sort((a, b) => b.data.localeCompare(a.data))[0],
        todas: rs.sort((a, b) => b.data.localeCompare(a.data)),
      }));
      // Calcular nota ponderada usando calcularNotaPlano com pesos por categoria
      const planos = getPlanosAula();
      const notasComCat = regs.map(r => {
        const cat = r.microcompetenciaId?.startsWith('OBR_') ? 'OBR'
          : r.microcompetenciaId?.startsWith('SUB-') || r.microcompetenciaId?.startsWith('APP-') ? 'SUB'
          : r.microcompetenciaId?.startsWith('KNW-') ? 'KNW'
          : r.microcompetenciaId?.startsWith('INI-') ? 'INI'
          : 'ATI';
        return { categoria: cat as 'OBR'|'SUB'|'KNW'|'ATI'|'INI', nota: r.nota };
      });
      // Tipo de plano mais comum nas avaliações deste aluno
      const tiposPlano = regs.map(r => {
        const p = planos.find(pl => pl.id === r.planoAulaId);
        return (p as any)?.tipoPlanAula || 'pratico';
      });
      const tipoDominante = tiposPlano.filter(t => t === 'teorico').length > tiposPlano.length / 2
        ? 'teorico' : tiposPlano.filter(t => t === 'misto').length > tiposPlano.length / 2
        ? 'misto' : 'pratico';
      const { nota20 } = notasComCat.length > 0
        ? calcularNotaPlano(notasComCat, tipoDominante as 'pratico'|'misto'|'teorico')
        : { nota20: 0 };
      // Bónus de Assiduidade/Pontualidade/Fardamento (máx. 2 valores) — só faz
      // sentido somar quando se está a ver UMA UC específica (filtroUC activo),
      // porque o bónus é calculado por UC, não de forma genérica.
      const bonus = filtroUC ? calcularBonusAssiduidadeUC(aluno.id, turmaId, filtroUC) : null;
      const nota20ComBonus = bonus ? Math.min(20, nota20 + bonus.total) : nota20;
      return {
        aluno,
        comps,
        mediaGeral: nota20ComBonus,
        mediaGeralSemBonus: nota20,
        bonus,
        total: regs.length,
        consolidadas: comps.filter(c => c.media >= 3).length,
        emRecuperacao: comps.filter(c => c.media < 3 && c.n > 0).length,
      };
    });
  }, [registosFiltrados, alunos, filtroAluno]);

  // Análise de equilíbrio (para aviso ao professor)
  const analiseEquilibrio = useMemo(() => {
    if (!filtroUC) return null;
    const regsUC = registosFiltrados;
    const nSUB = regsUC.filter(r => r.microcompetenciaId.startsWith('SUB-')).length;
    const nAPP = regsUC.filter(r => r.microcompetenciaId.startsWith('APP-')).length;
    const nKNW = regsUC.filter(r => r.microcompetenciaId.startsWith('KNW-')).length;
    const nATI = regsUC.filter(r => r.microcompetenciaId.startsWith('ATI-')).length;
    const pratica = nSUB + nAPP;
    const teoria = nKNW;
    return { pratica, teoria, atitudes: nATI, temPratica: pratica > 0, temTeoria: teoria > 0 };
  }, [registosFiltrados, filtroUC]);

  const ucSelNome = modulos.find(m => m.id === filtroUC)?.nome || '';
  const T = {
    copper: '#b5651d', sage: '#5a7a4e', azul: '#0369a1',
    border: 'rgba(26,23,20,0.08)', cream: '#f8f6f2',
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ background: '#1a1714', borderRadius: 14, padding: '16px 18px', marginBottom: 16, color: '#faf7f2' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
          📊 Historial de Avaliações
        </h2>
        <div style={{ fontSize: 12, opacity: 0.5 }}>Consulta e filtra o que foi avaliado — por UC, período ou aluno</div>
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 14, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {/* UC/UFCD */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>
              {modulos.some(m => m.tipo === 'UFCD') ? 'UFCD' : 'UC'}
            </div>
            <select value={filtroUC} onChange={e => setFiltroUC(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }}>
              <option value="">Todas</option>
              {modulos.map(m => <option key={m.id} value={m.id}>{m.id} — {m.nome.slice(0, 35)}{m.nome.length > 35 ? '…' : ''}</option>)}
            </select>
          </div>
          {/* Aluno */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>Aluno</div>
            <select value={filtroAluno} onChange={e => setFiltroAluno(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }}>
              <option value="todos">Turma toda</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome || `Nº ${a.numero}`}</option>)}
            </select>
          </div>
        </div>
        {/* Período */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Período</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { v: 'tudo', label: 'Todo o ano' },
              { v: 'T1', label: '1º Trimestre' },
              { v: 'T2', label: '2º Trimestre' },
              { v: 'T3', label: '3º Trimestre' },
              { v: 'personalizado', label: '📅 Personalizado' },
            ] as const).map(opt => (
              <button key={opt.v} onClick={() => setFiltroPeriodo(opt.v)}
                style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: filtroPeriodo === opt.v ? T.copper : 'rgba(26,23,20,0.06)',
                  color: filtroPeriodo === opt.v ? '#fff' : 'rgba(26,23,20,0.5)' }}>
                {opt.label}
              </button>
            ))}
          </div>
          {filtroPeriodo === 'personalizado' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }} />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }} />
            </div>
          )}
        </div>
      </div>

      {/* Aviso de equilíbrio */}
      {analiseEquilibrio && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, border: '1.5px solid',
          borderColor: (!analiseEquilibrio.temPratica || !analiseEquilibrio.temTeoria) ? '#f59e0b' : 'rgba(90,122,78,0.3)',
          background: (!analiseEquilibrio.temPratica || !analiseEquilibrio.temTeoria) ? '#fffbeb' : 'rgba(90,122,78,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            {(!analiseEquilibrio.temPratica || !analiseEquilibrio.temTeoria) ? '⚠️ Avaliação desequilibrada' : '✅ Avaliação equilibrada'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span>🔪 Prática: <strong>{analiseEquilibrio.pratica}</strong> registos</span>
            <span>📚 Conhecimentos: <strong>{analiseEquilibrio.teoria}</strong> registos</span>
            <span>💡 Atitudes: <strong>{analiseEquilibrio.atitudes}</strong> registos</span>
          </div>
          {!analiseEquilibrio.temTeoria && (
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 6, fontWeight: 600 }}>
              Não foram avaliados conhecimentos desta {modulos.some(m=>m.tipo==='UFCD')?'UFCD':'UC'} — considera adicionar uma aula teórica ou mista.
            </div>
          )}
          {!analiseEquilibrio.temPratica && (
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 6, fontWeight: 600 }}>
              Não foram avaliadas técnicas práticas — o referencial exige evidências observáveis.
            </div>
          )}
        </div>
      )}

      {/* Resultados */}
      {dadosPorAluno.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(26,23,20,0.4)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 600 }}>Sem avaliações com estes filtros</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Tenta seleccionar uma UC/UFCD diferente ou alargar o período</div>
        </div>
      ) : (
        dadosPorAluno.map(({ aluno, comps, mediaGeral, total, consolidadas, emRecuperacao, bonus }) => {
          const aberto = vistaAluno === aluno.id;
          const { emoji, cor } = labelNota(mediaGeral);
          return (
            <div key={aluno.id} style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}` }}>
              {/* Cabeçalho do aluno */}
              <button onClick={() => setVistaAluno(aberto ? null : aluno.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: aberto ? 'rgba(181,101,29,0.06)' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: T.copper, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                  {aluno.numero}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{aluno.nome || `Aluno ${aluno.numero}`}</div>
                  <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.45)', marginTop: 2 }}>
                    {total} avaliações · {consolidadas} consolidadas
                    {emRecuperacao > 0 && <span style={{ color: '#c0392b', marginLeft: 6 }}>· {emRecuperacao} em recuperação</span>}
                  </div>
                </div>
                {mediaGeral > 0 && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: cor }}>{mediaGeral.toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: 'rgba(26,23,20,0.4)' }}>/20</div>
                    {bonus && bonus.total > 0 && (
                      <div style={{ fontSize: 9, color: 'var(--sage)', fontWeight: 700, marginTop: 2 }}
                        title={`Pontualidade +${bonus.pontualidade} · Assiduidade +${bonus.assiduidade} · Farda +${bonus.fardamento} (${bonus.detalhe.faltas} faltas, ${bonus.detalhe.atrasos} atrasos, ${bonus.detalhe.fardaIncompleta} farda incompleta)`}>
                        +{bonus.total} bónus
                      </div>
                    )}
                  </div>
                )}
                <span style={{ fontSize: 14, color: 'rgba(26,23,20,0.3)' }}>{aberto ? '▲' : '▼'}</span>
              </button>

              {/* Detalhe por competência */}
              {aberto && (
                <div style={{ padding: '12px 14px', borderTop: `1px solid ${T.border}` }}>
                  {comps.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.4)', textAlign: 'center', padding: '16px 0' }}>
                      Sem competências avaliadas com estes filtros
                    </div>
                  ) : (
                    comps.sort((a, b) => a.media - b.media).map(c => {
                      const { cor: cr } = labelNota(c.media);
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 8, marginBottom: 6,
                          background: c.media >= 3 ? 'rgba(90,122,78,0.05)' : c.media >= 2 ? 'rgba(181,101,29,0.05)' : 'rgba(192,57,43,0.05)',
                          border: `1px solid ${c.media >= 3 ? 'rgba(90,122,78,0.15)' : c.media >= 2 ? 'rgba(181,101,29,0.15)' : 'rgba(192,57,43,0.15)'}` }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}></span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                            <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.45)', marginTop: 2 }}>
                              {c.n} avaliação{c.n !== 1 ? 'ões' : ''} · última: {formatarData(c.ultima?.data || '')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: cr }}>{c.media.toFixed(1)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default AvaliacaoPorUC;
