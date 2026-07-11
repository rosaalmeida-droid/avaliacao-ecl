import React, { useMemo, useState } from 'react';
import { Atividade, TipoAtividade, FichaProducao, PlanoAula } from '../types';
import type { RegistoPresenca } from '../backend';
import { getTurmas, getAlunos, getValidacoes, getSelecoes, getComandas, getAtividades, addOrUpdateAtividade, getRecuperacoesPorTurma, getPerfilProfissionalAluno, alterarPinAluno, sincronizarAlunosDaSheet, save, getFichasProducao, getPlanosAulaPorTurma, getPresencas } from '../backend';
import { Aluno } from '../types';
import { construirHistorico, alertaEquilibrioModo, calcularProgressoUCs, calcularParticipacaoExtra } from '../progresso';
import { UCS_COZINHA } from './PlanoAula';
import { Card, Button, Field, Badge } from './ui';
import { CentroAvisos } from './CentroAvisos';
import { GuiaProducao } from './GuiaProducao';
import { CronogramaTab } from './CronogramaTab';
import { DicionarioComp } from './DicionarioComp';
import { coresDaTurma } from '../cores';

export function CoordenadoraView() {
  const [tab, setTab] = useState<'avisos' | 'presencas' | 'fichas' | 'planos' | 'ranking' | 'atividades' | 'pedagogico' | 'alunos' | 'config' | 'cronograma' | 'dicionario'>('avisos');

  const TABS_COORD = [
    { id:'avisos',      emoji:'🔔', label:'Avisos',      cor:'#e63946' },
    { id:'presencas',   emoji:'👤', label:'Presenças',   cor:'#2ec4b6' },
    { id:'fichas',      emoji:'🗂️', label:'Fichas',      cor:'#f4a900' },
    { id:'planos',      emoji:'📅', label:'Planos',      cor:'#1d6fa4' },
    { id:'cronograma',  emoji:'📆', label:'Cronograma',  cor:'#5C3D8F' },
    { id:'ranking',     emoji:'🏆', label:'Ranking',     cor:'#9b59b6' },
    { id:'atividades',  emoji:'🎯', label:'Eventos',     cor:'#e67e22' },
    { id:'pedagogico',  emoji:'📊', label:'Pedagógico',  cor:'#27ae60' },
    { id:'alunos',      emoji:'👥', label:'Alunos',      cor:'#2980b9' },
    { id:'config',      emoji:'⚙️', label:'Config',      cor:'#8e44ad' },
    { id:'dicionario',  emoji:'📖', label:'Dicionário',  cor:'#0f766e' },
  ] as const;

  return (
    <div>
      {/* Cabeçalho roxo com abas coloridas */}
      <div style={{ background:'#6d28d9', padding:'14px 16px 0' }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', fontWeight:700,
          textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
          Avaliação ECL
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:'#fff', marginBottom:12 }}>
          Coordenadora 👋
        </div>
        <div style={{ overflowX:'auto', display:'flex', gap:6, paddingBottom:14 }}>
          {TABS_COORD.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{
              whiteSpace:'nowrap', flexShrink:0, padding:'8px 12px',
              border:'none', cursor:'pointer', fontSize:12, fontWeight:800,
              borderRadius:10,
              background: tab === t.id ? t.cor : 'rgba(255,255,255,0.15)',
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.55)',
              transition:'all 0.15s',
            }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'avisos' && (
        <div style={{ marginTop: 12 }}>
          <CentroAvisos perfil="coordenadora" />
        </div>
      )}
      {tab === 'presencas' && <PresencasTab />}
      {tab === 'fichas' && <BibliotecaFichasTab />}
      {tab === 'planos' && <BibliotecaPlanosTab />}
      {tab === 'cronograma' && <CronogramaTab />}
      {tab === 'dicionario' && <DicionarioComp perfil="coordenadora" />}
      {tab === 'ranking' && <RankingTab />}
      {tab === 'atividades' && <AtividadesTab />}
      {tab === 'pedagogico' && <VisaoPedagogicaTab />}
      {tab === 'alunos' && <GestaoAlunosTab />}
      {tab === 'config' && <ConfigTab />}
    </div>
  );
}

// ── Etiqueta de nível de medidas ─────────────────────────────
function BadgeNivel({ nivel }: { nivel?: 1|2|3 }) {
  if (!nivel || nivel === 1) return <span style={{ fontSize:12, color:'rgba(26,23,20,0.4)' }}>Nível 1 — Universal</span>;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 10px',
      borderRadius:100, fontSize:12, fontWeight:700,
      background: nivel === 3 ? '#fdf0ef' : '#fdf0e6',
      color: nivel === 3 ? '#c0392b' : '#b5651d',
      border: `1px solid ${nivel === 3 ? '#c0392b40' : '#b5651d40'}` }}>
      {nivel === 3 ? '🔴 Nível 3 — Medidas Adicionais' : '🟡 Nível 2 — Medidas Seletivas'}
    </span>
  );
}



// ── Presenças e Historial de Entradas (Coordenadora) ─────────
function PresencasTab() {
  const turmas = getTurmas();
  const alunos = getAlunos();
  const [turmaFiltro, setTurmaFiltro] = React.useState<string>('todas');
  const [dataFiltro, setDataFiltro] = React.useState<string>('');
  const [alunoAberto, setAlunoAberto] = React.useState<string | null>(null);

  const presencas = React.useMemo(() => getPresencas(), []);

  const presencasFiltradas = React.useMemo(() => {
    let p = presencas;
    if (turmaFiltro !== 'todas') p = p.filter((r: RegistoPresenca) => r.turmaId === turmaFiltro);
    if (dataFiltro) p = p.filter((r: RegistoPresenca) => r.data?.slice(0,10) === dataFiltro);
    return p.sort((a: RegistoPresenca, b: RegistoPresenca) => (b.data||'').localeCompare(a.data||''));
  }, [presencas, turmaFiltro, dataFiltro]);

  // Agrupar por aluno para historial
  const porAluno = React.useMemo(() => {
    const mapa: Record<string, RegistoPresenca[]> = {};
    presencas.forEach((r: RegistoPresenca) => {
      if (!mapa[r.alunoId]) mapa[r.alunoId] = [];
      mapa[r.alunoId].push(r);
    });
    return mapa;
  }, [presencas]);

  const nomeAluno = (id: string) => alunos.find(a => a.id === id)?.nome || id;

  return (
    <div style={{ marginTop: 12 }}>
      {/* Cabeçalho */}
      <div style={{ background: '#1a1714', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#faf7f2', marginBottom: 10 }}>
          👤 Presenças e Entradas
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: '#faf7f2', fontSize: 13 }} />
          <select value={turmaFiltro} onChange={e => setTurmaFiltro(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: '#faf7f2', fontSize: 13 }}>
            <option value="todas">Todas as turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
          </select>
          {(dataFiltro || turmaFiltro !== 'todas') && (
            <button onClick={() => { setDataFiltro(''); setTurmaFiltro('todas'); }}
              style={{ padding: '7px 12px', borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.15)', color: '#faf7f2',
                fontSize: 12, cursor: 'pointer' }}>✕ Limpar</button>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(247,241,230,0.4)', marginTop: 6 }}>
          {presencasFiltradas.length} registo{presencasFiltradas.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lista de presenças */}
      {presencasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(26,23,20,0.4)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
          <div>Sem presenças registadas</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {presencasFiltradas.map((r: RegistoPresenca, i: number) => {
            const atrasado = r.atrasado;
            const fardOk = r.fardamentoOk !== false;
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 12,
                padding: '12px 14px', border: '1px solid rgba(26,23,20,0.08)',
                cursor: 'pointer' }}
                onClick={() => setAlunoAberto(alunoAberto === r.alunoId ? null : r.alunoId)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Estado geral */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                    background: atrasado || !fardOk ? '#fef2f2' : '#f0fdf4' }}>
                    {atrasado || !fardOk ? '⚠️' : '✅'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {nomeAluno(r.alunoId)}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)' }}>
                      {r.turmaId} · {r.data?.slice(0,10)} · {r.horaEntrada || '--:--'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {/* Pontualidade */}
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
                        background: atrasado ? '#fef2f2' : '#f0fdf4',
                        color: atrasado ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                        {atrasado ? `⚠ ${r.atrasadoMins || '?'} min atraso` : '✓ A tempo'}
                      </span>
                      {/* Fardamento */}
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
                        background: fardOk ? '#f0fdf4' : '#fef2f2',
                        color: fardOk ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                        {fardOk ? '✓ Fardamento OK' : '⚠ Fardamento incompleto'}
                      </span>
                      {/* Higiene */}
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
                        background: '#f0fdf4', color: '#15803d', fontWeight: 600 }}>
                        ✓ Higiene OK
                      </span>
                    </div>
                  </div>
                </div>

                {/* Historial do aluno quando expandido */}
                {alunoAberto === r.alunoId && porAluno[r.alunoId] && (
                  <div style={{ marginTop: 12, paddingTop: 12,
                    borderTop: '1px solid rgba(26,23,20,0.06)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700,
                      color: 'rgba(26,23,20,0.5)', marginBottom: 8,
                      textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Historial de {nomeAluno(r.alunoId)}
                    </div>
                    {porAluno[r.alunoId]
                      .sort((a: RegistoPresenca, b: RegistoPresenca) =>
                        (b.data||'').localeCompare(a.data||''))
                      .map((h: RegistoPresenca, hi: number) => (
                        <div key={hi} style={{ display: 'flex', gap: 8,
                          padding: '5px 8px', borderRadius: 6, marginBottom: 3,
                          background: hi % 2 === 0 ? 'rgba(26,23,20,0.02)' : '#fff',
                          fontSize: 12, alignItems: 'center' }}>
                          <span style={{ color: 'rgba(26,23,20,0.4)', minWidth: 80 }}>
                            {h.data?.slice(0,10)}
                          </span>
                          <span style={{ color: 'rgba(26,23,20,0.5)', minWidth: 45 }}>
                            {h.horaEntrada || '--:--'}
                          </span>
                          <span style={{ color: h.atrasado ? '#dc2626' : '#15803d',
                            fontWeight: 600 }}>
                            {h.atrasado ? `⚠ ${h.atrasadoMins}min` : '✓'}
                          </span>
                          <span style={{ color: h.fardamentoOk !== false ? '#15803d' : '#dc2626' }}>
                            {h.fardamentoOk !== false ? '👔✓' : '👔✗'}
                          </span>
                          {h.ucId && (
                            <span style={{ fontSize: 10, color: 'var(--copper)',
                              background: 'var(--copper-pale)', padding: '1px 6px',
                              borderRadius: 4 }}>{h.ucId}</span>
                          )}
                        </div>
                      ))}
                    {/* Estatísticas rápidas */}
                    <div style={{ marginTop: 8, padding: '8px 10px',
                      background: 'rgba(26,23,20,0.03)', borderRadius: 8,
                      display: 'flex', gap: 16, fontSize: 12 }}>
                      <span>📅 {porAluno[r.alunoId].length} aulas</span>
                      <span style={{ color: '#dc2626' }}>
                        ⚠ {porAluno[r.alunoId].filter((h: RegistoPresenca) => h.atrasado).length} atrasos
                      </span>
                      <span style={{ color: '#dc2626' }}>
                        👔 {porAluno[r.alunoId].filter((h: RegistoPresenca) => h.fardamentoOk === false).length} fardamento incompleto
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Biblioteca de Fichas Técnicas (Coordenadora) ─────────────
function BibliotecaFichasTab() {
  const [pesquisa, setPesquisa] = React.useState('');
  const [fichaAberta, setFichaAberta] = React.useState<FichaProducao | null>(null);
  const turmas = getTurmas();
  const [turmaFiltro, setTurmaFiltro] = React.useState<string>('todas');

  const todasFichas = React.useMemo(() => getFichasProducao(), []);

  const fichasFiltradas = React.useMemo(() => {
    let f = todasFichas;
    if (pesquisa.trim()) {
      const q = pesquisa.toLowerCase();
      f = f.filter((fi: FichaProducao) =>
        fi.nomePrato?.toLowerCase().includes(q) ||
        fi.classificacao?.toLowerCase().includes(q) ||
        fi.alergenicos?.toString().toLowerCase().includes(q) ||
        (fi as any).familia1?.toLowerCase().includes(q)
      );
    }
    return f.sort((a: FichaProducao, b: FichaProducao) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
  }, [todasFichas, pesquisa]);

  if (fichaAberta) {
    return (
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setFichaAberta(null)} style={{
          background: 'rgba(26,23,20,0.06)', border: 'none', borderRadius: 8,
          padding: '7px 14px', cursor: 'pointer', fontSize: 13,
          fontWeight: 600, marginBottom: 12,
        }}>← Voltar à biblioteca</button>

        <div style={{ background: '#fff', borderRadius: 14, padding: '16px',
          border: '1px solid rgba(26,23,20,0.1)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20,
            fontWeight: 700, marginBottom: 4 }}>{fichaAberta.nomePrato}</div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginBottom: 16 }}>
            {fichaAberta.classificacao}
            {(fichaAberta as any).familia1 && ` · ${(fichaAberta as any).familia1}`}
            {fichaAberta.numPorcoes && ` · ${fichaAberta.numPorcoes} doses`}
          </div>

          {/* Ingredientes */}
          {Array.isArray(fichaAberta.ingredientes) && fichaAberta.ingredientes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8,
                color: 'var(--copper)' }}>Ingredientes</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--copper)', color: '#fff' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Ingrediente</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Qtd</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Un</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Componente</th>
                  </tr>
                </thead>
                <tbody>
                  {fichaAberta.ingredientes.map((ing, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : 'rgba(181,101,29,0.04)',
                      borderBottom: '1px solid rgba(26,23,20,0.06)' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 500 }}>{ing.produto}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{ing.qt}</td>
                      <td style={{ padding: '6px 10px', color: 'rgba(26,23,20,0.5)' }}>{ing.un}</td>
                      <td style={{ padding: '6px 10px', color: 'rgba(26,23,20,0.5)',
                        fontSize: 11 }}>{ing.componente}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Alergénios */}
          {fichaAberta.alergenicos && (fichaAberta.alergenicos as any).length > 0 && (
            <div style={{ padding: '8px 12px', background: '#FCEBEB',
              borderRadius: 8, fontSize: 12, color: '#A32D2D' }}>
              ⚠️ Alergénios: {Array.isArray(fichaAberta.alergenicos)
                ? fichaAberta.alergenicos.join(', ')
                : fichaAberta.alergenicos}
            </div>
          )}

          {/* Etiquetas */}
          {(fichaAberta as any).etiquetas?.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(fichaAberta as any).etiquetas.map((et: string, i: number) => (
                <span key={i} style={{ padding: '2px 10px', borderRadius: 100,
                  background: 'var(--copper-pale)', color: 'var(--copper)',
                  fontSize: 11, fontWeight: 600 }}>{et}</span>
              ))}
            </div>
          )}

          {/* Guião de Apoio à Produção */}
          {(fichaAberta as any).textoGuia && (
            <div style={{ marginTop: 16, paddingTop: 16,
              borderTop: '1px solid rgba(26,23,20,0.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--copper)',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                📖 Guião de Apoio à Produção
              </div>
              <GuiaProducao
                textoGuia={(fichaAberta as any).textoGuia}
                nomePrato={fichaAberta.nomePrato || ''}
                ucId={(fichaAberta as any).ucId}
                ucNome={(fichaAberta as any).ucNome}
              />
            </div>
          )}

          {!(fichaAberta as any).textoGuia && (
            <div style={{ marginTop: 12, padding: '10px 14px',
              background: 'rgba(26,23,20,0.04)', borderRadius: 8,
              fontSize: 12, color: 'rgba(26,23,20,0.4)', textAlign: 'center' }}>
              Guião ainda não gerado para esta ficha.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ background: '#1a1714', borderRadius: 14,
        padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#faf7f2', marginBottom: 10 }}>
          🗂️ Biblioteca de Fichas Técnicas
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'rgba(247,241,230,0.4)' }}>🔍</span>
          <input value={pesquisa} onChange={e => setPesquisa(e.target.value)}
            placeholder="Pesquisar por nome, classificação, alergénio..."
            style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 8,
              border: 'none', background: 'rgba(255,255,255,0.1)',
              color: '#faf7f2', fontSize: 13 }} />
        </div>
        <div style={{ fontSize: 12, color: 'rgba(247,241,230,0.4)', marginTop: 6 }}>
          {fichasFiltradas.length} ficha{fichasFiltradas.length !== 1 ? 's' : ''} no sistema
        </div>
      </div>

      {fichasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(26,23,20,0.4)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗂️</div>
          <div>Nenhuma ficha encontrada</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fichasFiltradas.map((f: FichaProducao) => (
            <div key={f.id} onClick={() => setFichaAberta(f)} style={{
              background: '#fff', borderRadius: 12, padding: '12px 14px',
              border: '1px solid rgba(26,23,20,0.08)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 1px 4px rgba(26,23,20,0.04)',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'var(--copper-pale)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                🍽️
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  {f.nomePrato}</div>
                <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)' }}>
                  {f.classificacao}
                  {(f as any).familia1 && ` · ${(f as any).familia1}`}
                  {f.numPorcoes && ` · ${f.numPorcoes} doses`}
                </div>
                {f.alergenicos && (f.alergenicos as any).length > 0 && (
                  <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 2 }}>
                    ⚠️ {Array.isArray(f.alergenicos) ? f.alergenicos.join(', ') : f.alergenicos}
                  </div>
                )}
              </div>
              <span style={{ color: 'rgba(26,23,20,0.3)', fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Biblioteca de Planos de Aula (Coordenadora) ──────────────
function BibliotecaPlanosTab() {
  const turmas = getTurmas();
  const [turmaFiltro, setTurmaFiltro] = React.useState<string>('todas');
  const [pesquisa, setPesquisa] = React.useState('');
  const [planoAberto, setPlanoAberto] = React.useState<PlanoAula | null>(null);

  const todosPlanos = React.useMemo(() => {
    const planos: PlanoAula[] = [];
    turmas.forEach(t => {
      planos.push(...getPlanosAulaPorTurma(t.id, true));
    });
    return planos.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, []);

  const planosFiltrados = React.useMemo(() => {
    let p = todosPlanos;
    if (turmaFiltro !== 'todas') p = p.filter(pl => pl.turmaId === turmaFiltro);
    if (pesquisa.trim()) {
      const q = pesquisa.toLowerCase();
      p = p.filter(pl =>
        pl.titulo?.toLowerCase().includes(q) ||
        pl.ucId?.toLowerCase().includes(q) ||
        pl.ucNome?.toLowerCase().includes(q)
      );
    }
    return p;
  }, [todosPlanos, turmaFiltro, pesquisa]);

  if (planoAberto) {
    return (
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setPlanoAberto(null)} style={{
          background: 'rgba(26,23,20,0.06)', border: 'none', borderRadius: 8,
          padding: '7px 14px', cursor: 'pointer', fontSize: 13,
          fontWeight: 600, marginBottom: 12,
        }}>← Voltar à biblioteca</button>

        <div style={{ background: '#fff', borderRadius: 14, padding: '16px',
          border: '1px solid rgba(26,23,20,0.1)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11,
              fontWeight: 700, background: planoAberto.estado === 'publicado'
                ? '#EAF3DE' : 'rgba(26,23,20,0.06)',
              color: planoAberto.estado === 'publicado' ? '#27500A' : 'rgba(26,23,20,0.5)' }}>
              {planoAberto.estado === 'publicado' ? '✓ Publicado' : 'Rascunho'}
            </span>
            <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11,
              background: 'rgba(26,23,20,0.06)', color: 'rgba(26,23,20,0.6)' }}>
              {planoAberto.turmaId}
            </span>
            {planoAberto.numeroPlan && (
              <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11,
                background: 'var(--copper-pale)', color: 'var(--copper)', fontWeight: 700 }}>
                Plano {planoAberto.numeroPlan}
              </span>
            )}
          </div>

          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18,
            fontWeight: 700, marginBottom: 4 }}>{planoAberto.titulo}</div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginBottom: 12 }}>
            {planoAberto.data} · {planoAberto.horaInicio}–{planoAberto.horaFim}
          </div>

          {planoAberto.ucId && (
            <div style={{ padding: '8px 12px', background: 'var(--copper-pale)',
              borderRadius: 8, fontSize: 12, color: 'var(--copper)',
              fontWeight: 600, marginBottom: 12 }}>
              {planoAberto.ucId} — {planoAberto.ucNome}
            </div>
          )}

          {planoAberto.observacoes && (
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.7)',
              lineHeight: 1.6, marginBottom: 12 }}>
              {planoAberto.observacoes}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)' }}>
            {planoAberto.fichasIds?.length || 0} ficha(s) associada(s) ·
            Professor: {planoAberto.professor}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ background: '#1a1714', borderRadius: 14,
        padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#faf7f2', marginBottom: 10 }}>
          📅 Biblioteca de Planos de Aula
        </div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'rgba(247,241,230,0.4)' }}>🔍</span>
          <input value={pesquisa} onChange={e => setPesquisa(e.target.value)}
            placeholder="Pesquisar por título, UC..."
            style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 8,
              border: 'none', background: 'rgba(255,255,255,0.1)',
              color: '#faf7f2', fontSize: 13 }} />
        </div>
        {/* Filtro por turma */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setTurmaFiltro('todas')} style={{
            padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600,
            border: `1.5px solid ${turmaFiltro === 'todas' ? '#fff' : 'rgba(255,255,255,0.2)'}`,
            background: turmaFiltro === 'todas' ? '#fff' : 'transparent',
            color: turmaFiltro === 'todas' ? '#1a1714' : 'rgba(247,241,230,0.6)',
            cursor: 'pointer',
          }}>Todas as turmas</button>
          {turmas.map(t => (
            <button key={t.id} onClick={() => setTurmaFiltro(t.id)} style={{
              padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600,
              border: `1.5px solid ${turmaFiltro === t.id ? '#fff' : 'rgba(255,255,255,0.2)'}`,
              background: turmaFiltro === t.id ? '#fff' : 'transparent',
              color: turmaFiltro === t.id ? '#1a1714' : 'rgba(247,241,230,0.6)',
              cursor: 'pointer',
            }}>{t.id}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(247,241,230,0.4)', marginTop: 6 }}>
          {planosFiltrados.length} plano{planosFiltrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      {planosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(26,23,20,0.4)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <div>Nenhum plano encontrado</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {planosFiltrados.map(p => {
            const d = new Date((p.data || '') + 'T12:00:00');
            return (
              <div key={p.id} onClick={() => setPlanoAberto(p)} style={{
                background: '#fff', borderRadius: 12, padding: '12px 14px',
                border: '1px solid rgba(26,23,20,0.08)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 1px 4px rgba(26,23,20,0.04)',
              }}>
                <div style={{ background: 'var(--copper-pale)', borderRadius: 10,
                  padding: '8px 10px', textAlign: 'center', flexShrink: 0, minWidth: 44 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20,
                    fontWeight: 700, color: 'var(--copper)', lineHeight: 1 }}>
                    {d.getDate().toString().padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--copper)', fontWeight: 600,
                    textTransform: 'uppercase' }}>
                    {d.toLocaleDateString('pt-PT', { month: 'short' })}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 100,
                      background: 'rgba(26,23,20,0.06)',
                      color: 'rgba(26,23,20,0.5)', fontWeight: 600 }}>{p.turmaId}</span>
                    {p.estado === 'publicado' && (
                      <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 100,
                        background: '#EAF3DE', color: '#27500A', fontWeight: 600 }}>✓ Pub.</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.titulo}</div>
                  {p.ucId && (
                    <div style={{ fontSize: 12, color: 'var(--copper)', marginTop: 2 }}>
                      {p.ucId}{p.ucNome ? ` — ${p.ucNome.slice(0, 40)}${p.ucNome.length > 40 ? '...' : ''}` : ''}
                    </div>
                  )}
                </div>
                <span style={{ color: 'rgba(26,23,20,0.3)', fontSize: 18, flexShrink: 0 }}>›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Configurações (Coordenadora) ─────────────────────────────
function ConfigTab() {
  const [confirmando, setConfirmando] = React.useState(false);
  const [feito, setFeito] = React.useState(false);

  function limparDadosTeste() {
    // Remove só os dados de teste — mantém fichas e planos reais
    const chavesTeste = [
      'ecl_alunos', 'ecl_turmas', 'ecl_planos', 'ecl_fichas',
      'ecl_requisicoes', 'ecl_historico_avaliacoes', 'ecl_historico_presencas',
    ];
    chavesTeste.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    setFeito(true);
    setConfirmando(false);
    setTimeout(() => window.location.reload(), 1500);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>⚙️ Configurações</div>
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginBottom: 16 }}>
          Opções de administração da Avaliação ECL.
        </div>

        {/* Limpar dados de teste */}
        <div style={{ padding: '14px 16px', borderRadius: 12,
          border: '1.5px solid rgba(192,57,43,0.3)', background: '#fdf5f5' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#7b1b10', marginBottom: 4 }}>
            🗑️ Limpar dados de teste
          </div>
          <div style={{ fontSize: 13, color: '#A32D2D', marginBottom: 12, lineHeight: 1.5 }}>
            Remove os alunos, planos de aula, fichas e requisições criados automaticamente
            para testes. As fichas técnicas reais e o Manual do Cozinheiro são preservados.
            A app recarrega após limpar.
          </div>

          {feito ? (
            <div style={{ padding: '10px', borderRadius: 8, background: '#EAF3DE',
              color: '#27500A', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
              ✓ Dados de teste removidos — a recarregar...
            </div>
          ) : !confirmando ? (
            <button onClick={() => setConfirmando(true)} style={{
              padding: '10px 20px', borderRadius: 9, border: 'none',
              background: '#c0392b', color: '#fff', fontSize: 13,
              fontWeight: 700, cursor: 'pointer',
            }}>
              Limpar dados de teste
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7b1b10',
                marginBottom: 10 }}>
                Tens a certeza? Esta acção não pode ser desfeita.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={limparDadosTeste} style={{
                  padding: '10px 20px', borderRadius: 9, border: 'none',
                  background: '#c0392b', color: '#fff', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer',
                }}>
                  Sim, limpar tudo
                </button>
                <button onClick={() => setConfirmando(false)} style={{
                  padding: '10px 20px', borderRadius: 9,
                  border: '1px solid rgba(26,23,20,0.2)',
                  background: '#fff', fontSize: 13, cursor: 'pointer',
                }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Gestão de Alunos ─────────────────────────────────────────
function GestaoAlunosTab() {
  const turmas = getTurmas();
  const [turmaFiltro, setTurmaFiltro] = React.useState(turmas[0]?.id || '');
  const [alunos, setAlunos] = React.useState<Aluno[]>(() => getAlunos());
  const [aEditar, setAEditar] = React.useState<string | null>(null);
  const [novoPin, setNovoPin] = React.useState('');
  const [novoNivel, setNovoNivel] = React.useState<1|2|3>(1);
  const [novoNome, setNovoNome] = React.useState('');
  const [mensagem, setMensagem] = React.useState('');
  const [aSincronizar, setASincronizar] = React.useState(false);

  const alunosDaTurma = alunos.filter(a => a.turmaId === turmaFiltro)
    .sort((a, b) => a.numero - b.numero);

  async function sincronizar() {
    setASincronizar(true);
    await sincronizarAlunosDaSheet();
    setAlunos(getAlunos());
    setASincronizar(false);
    setMensagem('✓ Sincronizado com a Sheet.');
    setTimeout(() => setMensagem(''), 3000);
  }

  function iniciarEdicao(aluno: Aluno) {
    setAEditar(aluno.id);
    setNovoPin('');
    setNovoNivel(aluno.nivelMedidas || 1);
    setNovoNome(aluno.nome || '');
  }

  function guardar(aluno: Aluno) {
    // Atualizar nome e nível no localStorage
    const todos = getAlunos();
    const idx = todos.findIndex(a => a.id === aluno.id);
    if (idx >= 0) {
      if (novoNome) todos[idx].nome = novoNome;
      todos[idx].nivelMedidas = novoNivel;
      save('ecl_alunos', todos);
    }
    // Alterar PIN se preenchido
    if (novoPin && novoPin.length === 4) {
      alterarPinAluno(aluno.id, novoPin);
    }
    setAlunos(getAlunos());
    setAEditar(null);
    setMensagem('✓ Aluno atualizado.');
    setTimeout(() => setMensagem(''), 3000);
  }

  return (
    <div>
      {/* Toolbar */}
      <Card>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <select value={turmaFiltro} onChange={e => setTurmaFiltro(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)',
              fontSize:14, background:'#fff' }}>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <button onClick={sincronizar} disabled={aSincronizar}
            style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)',
              background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            {aSincronizar ? '⏳ A sincronizar...' : '🔄 Sincronizar com Sheet'}
          </button>
          {mensagem && <span style={{ fontSize:13, color:'var(--sage)', fontWeight:600 }}>{mensagem}</span>}
        </div>
      </Card>

      {/* Legenda dos níveis */}
      <Card>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>📋 Níveis de Medidas Educativas (DL 54/2018)</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ fontSize:13 }}>⚪ <strong>Nível 1 — Universal</strong> — todos os alunos. Plano de recuperação completo, linguagem técnica normal.</div>
          <div style={{ fontSize:13 }}>🟡 <strong>Nível 2 — Seletivas</strong> — aluno que precisa de mais orientação. Tarefas divididas em etapas, linguagem mais simples, exemplos resolvidos.</div>
          <div style={{ fontSize:13 }}>🔴 <strong>Nível 3 — Adicionais</strong> — adaptação significativa. Instruções passo a passo, vocabulário do dia-a-dia, menos escrita, evidências alternativas (foto, vídeo, oral).</div>
        </div>
      </Card>

      {/* Lista de alunos */}
      {alunosDaTurma.length === 0 ? (
        <Card><div style={{ color:'rgba(26,23,20,0.5)', fontSize:14 }}>
          Nenhum aluno registado nesta turma ainda. Os alunos aparecem aqui após o primeiro login.
        </div></Card>
      ) : (
        alunosDaTurma.map(aluno => (
          <Card key={aluno.id}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:15 }}>
                    Nº {aluno.numero} — {aluno.nome || <em style={{ color:'rgba(26,23,20,0.4)' }}>sem nome</em>}
                  </span>
                  <BadgeNivel nivel={aluno.nivelMedidas} />
                </div>
                <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)' }}>
                  {aluno.turmaId} · {aluno.ano}º ano · ID: {aluno.id}
                </div>
                {aluno.pin ? (
                  <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginTop:2 }}>
                    🔑 PIN definido
                    {aluno.pinCriadoEm && ` · criado ${new Date(aluno.pinCriadoEm).toLocaleDateString('pt-PT')} às ${new Date(aluno.pinCriadoEm).toLocaleTimeString('pt-PT', {hour:'2-digit',minute:'2-digit'})}`}
                    {aluno.pinAlteradoEm && ` · alterado ${new Date(aluno.pinAlteradoEm).toLocaleDateString('pt-PT')}`}
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:'var(--copper)', marginTop:2 }}>⚠️ Sem PIN — aluno ainda não fez login</div>
                )}
              </div>
              <button onClick={() => aEditar === aluno.id ? setAEditar(null) : iniciarEdicao(aluno)}
                style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)',
                  background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, flexShrink:0 }}>
                {aEditar === aluno.id ? 'Cancelar' : '✏️ Editar'}
              </button>
            </div>

            {/* Painel de edição */}
            {aEditar === aluno.id && (
              <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                <div style={{ display:'grid', gap:10 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Nome do aluno</div>
                    <input value={novoNome} onChange={e => setNovoNome(e.target.value)}
                      placeholder={aluno.nome || 'ex: Mariana Costa'}
                      style={{ width:'100%', padding:'9px 12px', borderRadius:8,
                        border:'1px solid var(--border)', fontSize:14 }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>
                      Nível de Medidas Educativas
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      {([1,2,3] as const).map(n => (
                        <button key={n} onClick={() => setNovoNivel(n)} style={{
                          flex:1, padding:'10px 6px', borderRadius:10, cursor:'pointer',
                          border:`2px solid ${novoNivel===n ? (n===3?'#c0392b':n===2?'#b5651d':'var(--sage)') : 'var(--border)'}`,
                          background: novoNivel===n ? (n===3?'#fdf0ef':n===2?'#fdf0e6':'var(--sage-pale)') : '#fff',
                          color: novoNivel===n ? (n===3?'#c0392b':n===2?'#b5651d':'var(--sage)') : 'rgba(26,23,20,0.5)',
                          fontSize:13, fontWeight:700,
                        }}>
                          {n===1?'⚪ Nível 1':n===2?'🟡 Nível 2':'🔴 Nível 3'}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize:12, color:'rgba(26,23,20,0.5)', marginTop:6 }}>
                      {novoNivel===1?'Universal — sem adaptações específicas.':novoNivel===2?'Medidas seletivas — tarefas por etapas, linguagem simples.':'Medidas adicionais — instruções passo a passo, evidências alternativas, validação acompanhada.'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>
                      Novo PIN (deixa em branco para não alterar)
                    </div>
                    <input type="password" inputMode="numeric" maxLength={4}
                      value={novoPin} onChange={e => setNovoPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                      placeholder="4 dígitos"
                      style={{ width:120, padding:'9px 12px', borderRadius:8,
                        border:'1px solid var(--border)', fontSize:16, letterSpacing:'0.2em' }} />
                    <span style={{ fontSize:12, color:'rgba(26,23,20,0.4)', marginLeft:8 }}>
                      {novoPin ? `${novoPin.length}/4 dígitos` : aluno.pin ? 'PIN atual mantido' : 'Sem PIN definido'}
                    </span>
                  </div>
                  <button onClick={() => guardar(aluno)}
                    style={{ padding:'12px', borderRadius:10, border:'none',
                      background:'var(--sage)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    ✓ Guardar alterações
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

// ── Ponto 38-39 do documento pedagógico: Interface do Coordenador ──
// Estado global da turma, competências críticas, alunos com muitas
// recuperações, e alertas automáticos.
function VisaoPedagogicaTab() {
  const [turmaFiltro, setTurmaFiltro] = useState('CP1');
  const turmas = getTurmas();
  const alunos = getAlunos().filter(a => a.turmaId === turmaFiltro);
  const recuperacoes = getRecuperacoesPorTurma(turmaFiltro);

  // Alertas automáticos (ponto 39)
  const alertas: { tipo: 'aluno' | 'uc' | 'geral'; texto: string; gravidade: 'alta' | 'media' }[] = [];

  // Alerta: aluno com muitas recuperações pendentes
  const porAluno = new Map<string, number>();
  recuperacoes.filter(r => r.estado !== 'concluida').forEach(r => {
    porAluno.set(r.alunoId, (porAluno.get(r.alunoId) || 0) + 1);
  });
  porAluno.forEach((n, alunoId) => {
    if (n >= 3) {
      const aluno = alunos.find(a => a.id === alunoId);
      alertas.push({ tipo: 'aluno', texto: `${aluno?.nome || alunoId} tem ${n} recuperações pendentes`, gravidade: 'alta' });
    }
  });

  // Alerta: recuperação submetida sem defesa oral feita
  recuperacoes.filter(r => r.estado === 'submetida' && !r.defesaOralRealizada).forEach(r => {
    const aluno = alunos.find(a => a.id === r.alunoId);
    alertas.push({ tipo: 'aluno', texto: `${aluno?.nome || r.alunoId} — recuperação de ${r.ucId} submetida há ${diasDesde(r.dataSubmissao)} dias, ainda sem defesa oral`, gravidade: 'media' });
  });

  // Alerta: aluno com muitas competências não observadas (perfil vazio)
  alunos.forEach(a => {
    const perfil = getPerfilProfissionalAluno(a.id);
    const total = perfil.tecnicas.length + perfil.responsabilidades.length + perfil.atitudes.length;
    if (total === 0) {
      alertas.push({ tipo: 'aluno', texto: `${a.nome || 'Aluno ' + a.numero} ainda sem nenhuma competência registada`, gravidade: 'media' });
    } else if (perfil.areasADesenvolver.length >= 5) {
      alertas.push({ tipo: 'aluno', texto: `${a.nome || 'Aluno ' + a.numero} tem ${perfil.areasADesenvolver.length} competências por desenvolver`, gravidade: 'media' });
    }
  });

  const alertasAlta = alertas.filter(a => a.gravidade === 'alta');
  const alertasMedia = alertas.filter(a => a.gravidade === 'media');

  return (
    <div>
      <Card>
        <Field label="Turma">
          <select className="input" value={turmaFiltro} onChange={e => setTurmaFiltro(e.target.value)}>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
            {turmas.length === 0 && <option value="CP1">CP1</option>}
          </select>
        </Field>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📌 Estado Global da Turma</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Estatistica label="Alunos" valor={alunos.length} />
          <Estatistica label="Recuperações activas" valor={recuperacoes.filter(r => r.estado !== 'concluida').length} />
          <Estatistica label="Recuperações concluídas" valor={recuperacoes.filter(r => r.estado === 'concluida').length} />
        </div>
      </Card>

      {alertasAlta.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--danger)', marginBottom: 8 }}>🔴 Alertas Prioritários</div>
          {alertasAlta.map((a, i) => (
            <div key={i} style={{ fontSize: 13, padding: '8px 10px', background: 'rgba(179,65,58,0.08)', borderRadius: 8, marginBottom: 6 }}>{a.texto}</div>
          ))}
        </Card>
      )}

      {alertasMedia.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--copper)', marginBottom: 8 }}>🟡 Alertas a Acompanhar</div>
          {alertasMedia.map((a, i) => (
            <div key={i} style={{ fontSize: 13, padding: '8px 10px', background: 'var(--copper-pale)', borderRadius: 8, marginBottom: 6 }}>{a.texto}</div>
          ))}
        </Card>
      )}

      {alertas.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(26,23,20,0.4)' }}>
            ✓ Sem alertas pendentes para esta turma.
          </div>
        </Card>
      )}

      <Card>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🗺️ UCs com mais recuperações pendentes</div>
        {(() => {
          const porUC = new Map<string, number>();
          recuperacoes.filter(r => r.estado !== 'concluida').forEach(r => porUC.set(r.ucId, (porUC.get(r.ucId) || 0) + 1));
          const ordenado = Array.from(porUC.entries()).sort((a, b) => b[1] - a[1]);
          if (ordenado.length === 0) return <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)' }}>Sem recuperações pendentes.</div>;
          return ordenado.map(([ucId, n]) => {
            const uc = UCS_COZINHA.find(u => u.id === ucId);
            return (
              <div key={ucId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{ucId} — {uc?.nome}</span>
                <strong>{n}</strong>
              </div>
            );
          });
        })()}
      </Card>
    </div>
  );
}

function diasDesde(dataIso?: string): number {
  if (!dataIso) return 0;
  const dif = Date.now() - new Date(dataIso).getTime();
  return Math.max(0, Math.floor(dif / (1000 * 60 * 60 * 24)));
}

function Estatistica({ label, valor }: { label: string; valor: number }) {
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--copper)' }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>{label}</div>
    </div>
  );
}

function RankingTab() {
  const turmas = getTurmas();
  const alunos = getAlunos();
  const validacoes = getValidacoes();
  const selecoes = getSelecoes();
  const comandas = getComandas();
  const atividades = getAtividades();

  return (
    <>
      {turmas.map(turma => {
        const alunosDaTurma = alunos.filter(a => a.turmaId === turma.id);
        const dados = alunosDaTurma.map(aluno => {
          const hist = construirHistorico(aluno.id, validacoes, selecoes, comandas);
          const progressoUC = calcularProgressoUCs(hist);
          const ucsConcluidas = progressoUC.filter(p => p.nivel === 'concluida').length;
          const alerta = alertaEquilibrioModo(hist);
          const participacao = calcularParticipacaoExtra(aluno.id, atividades.filter(a => a.turmaId === turma.id));
          return { aluno, hist, ucsConcluidas, alerta, participacao };
        }).sort((a, b) => b.hist.mediaGeral - a.hist.mediaGeral);

        return (
          <Card key={turma.id}>
            <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{turma.nome}</div>
            {dados.length === 0 && <div className="muted">Sem alunos registados ainda.</div>}
            {dados.map(({ aluno, hist, ucsConcluidas, alerta, participacao }, i) => (
              <div key={aluno.id} className="option-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600 }}>#{i + 1} · Aluno {aluno.numero}</div>
                  <div className="mono">{hist.mediaGeral > 0 ? hist.mediaGeral.toFixed(1) : '—'}</div>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {hist.totalAvaliacoes} avaliações · {ucsConcluidas} UC dominadas
                  {!participacao.elegivelAcimaDe17 && ' · sem participação em concurso (limite >17)'}
                </div>
                {alerta && (
                  <div style={{ marginTop: 6 }}>
                    <Badge tipo="desenvolvimento">{alerta}</Badge>
                  </div>
                )}
              </div>
            ))}
          </Card>
        );
      })}
    </>
  );
}

function AtividadesTab() {
  const turmas = getTurmas();
  const [turmaId, setTurmaId] = useState(turmas[0]?.id || '');
  const [tipo, setTipo] = useState<TipoAtividade>('evento');
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [participantes, setParticipantes] = useState(''); // números separados por vírgula
  const [, force] = useState(0);

  const atividades = getAtividades().filter(a => a.turmaId === turmaId);

  function criar() {
    const a: Atividade = {
      id: `${turmaId}-${tipo}-${Date.now()}`,
      turmaId,
      tipo,
      titulo,
      data,
      participantesIds: participantes.split(',').map(s => s.trim()).filter(Boolean).map(n => `${turmaId}-${n}`),
      criadaEm: new Date().toISOString(),
    };
    addOrUpdateAtividade(a);
    setTitulo('');
    setParticipantes('');
    force(x => x + 1);
  }

  return (
    <Card>
      <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Registar evento ou concurso</div>

      <Field label="Turma">
        <select className="input" value={turmaId} onChange={e => setTurmaId(e.target.value)}>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </Field>

      <Field label="Tipo">
        <select className="input" value={tipo} onChange={e => setTipo(e.target.value as TipoAtividade)}>
          <option value="evento">Evento extracurricular</option>
          <option value="concurso">Concurso de cozinha</option>
        </select>
      </Field>

      <Field label="Título">
        <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="ex: Jantar de Gala Hotel X" />
      </Field>

      <Field label="Data">
        <input className="input" type="date" value={data} onChange={e => setData(e.target.value)} />
      </Field>

      <Field label="Números dos alunos participantes (separados por vírgula)">
        <input className="input" value={participantes} onChange={e => setParticipantes(e.target.value)} placeholder="ex: 3,7,12" />
      </Field>

      <Button block onClick={criar} disabled={!titulo}>Registar</Button>

      <div className="divider" />
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Registos desta turma</div>
      {atividades.length === 0 && <div className="muted">Sem registos ainda.</div>}
      {atividades.map(a => (
        <div key={a.id} className="option-card">
          <div style={{ fontWeight: 600 }}>{a.tipo === 'concurso' ? '🏆 ' : '🎉 '}{a.titulo}</div>
          <div className="muted">{a.data} · {a.participantesIds.length} participante(s)</div>
        </div>
      ))}
    </Card>
  );
}
