import React, { useMemo, useState } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { Atividade, TipoAtividade, FichaProducao, PlanoAula } from '../types';
import type { RegistoPresenca, PreviewReset } from '../backend';
import { getTurmas, getAlunos, getValidacoes, getSelecoes, getComandas, getAtividades, addOrUpdateAtividade, getRecuperacoesPorTurma, getPerfilProfissionalAluno, alterarPinAluno, sincronizarAlunosDaSheet, save, getFichasProducao, getPlanosAulaPorTurma, getPresencas, descarregarCopiaSeguranca, previewResetInicioAno, resetInicioAnoLetivo, backupRecente } from '../backend';
import { Aluno } from '../types';
import { construirHistorico, alertaEquilibrioModo, calcularProgressoUCs, calcularParticipacaoExtra } from '../progresso';
import { UCS_COZINHA } from './PlanoAula';
import { Card, Button, Field, Badge } from './ui';
import { CentroAvisos } from './CentroAvisos';
import { GuiaProducao } from './GuiaProducao';
import { CronogramaTab } from './CronogramaTab';
import { DicionarioComp } from './DicionarioComp';
import { coresDaTurma } from '../cores';
import { EventosWizard } from './EventosWizard';
import { ManualCoordenador } from './ManualCoordenador';
import { GestaoAlunosExternos } from './AlunosExternos';

export function CoordenadoraView() {
  const [tab, setTab] = useState<'avisos' | 'presencas' | 'planos' | 'ranking' | 'atividades' | 'pedagogico' | 'alunos' | 'config' | 'cronograma' | 'manual'>('avisos');

  const TABS_COORD = [
    { id:'avisos',      emoji:'🔔', label:'Avisos',      cor:'#e63946' },
    { id:'presencas',   emoji:'👤', label:'Presenças',   cor:'#2ec4b6' },
    { id:'pedagogico',  emoji:'📊', label:'Pedagógico',  cor:'#27ae60' },
    { id:'alunos',      emoji:'👥', label:'Alunos',      cor:'#2980b9' },
    { id:'ranking',     emoji:'🏆', label:'Ranking',     cor:'#9b59b6' },
    { id:'planos',      emoji:'📅', label:'Planos',      cor:'#1d6fa4' },
    { id:'cronograma',  emoji:'📆', label:'Cronograma',  cor:'#5C3D8F' },
    { id:'atividades',  emoji:'🎯', label:'Eventos',     cor:'#e67e22' },
    { id:'config',      emoji:'⚙️', label:'Config',      cor:'#8e44ad' },
    { id:'manual',      emoji:'📋', label:'Manual',      cor:'#b5651d' },
    { id:'externos',    emoji:'🌍', label:'Externos',    cor:'#0f766e' },
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
      {tab === 'planos' && <BibliotecaPlanosTab />}
      {tab === 'cronograma' && <CronogramaTab />}
      {tab === 'manual' && <ManualCoordenador turmaId={getTurmas()[0]?.id || '1º ACP'} />}
      {tab === 'externos' && <GestaoAlunosExternos />}
      {tab === 'ranking' && <RankingTab />}
      {tab === 'atividades' && (
        <div>
          {getTurmas().map((t: any) => (
            <div key={t.id} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'rgba(26,23,20,0.4)', marginBottom: 10 }}>
                {t.nome}
              </div>
              <EventosWizard turmaId={t.id} />
            </div>
          ))}
        </div>
      )}
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

// ── Biblioteca de Planos e Fichas (Coordenadora) ─────────────
function BibliotecaPlanosTab() {
  const turmas = getTurmas();
  const [turmaFiltro, setTurmaFiltro] = useState<string>(turmas[0]?.id || '1º ACP');
  const [pesquisa, setPesquisa] = useState('');
  const [fichaAberta, setFichaAberta] = useState<FichaProducao | null>(null);

  const planos = useMemo(() => getPlanosAulaPorTurma(turmaFiltro, true), [turmaFiltro]);
  const fichas = useMemo(() => getFichasProducao(), []);

  const planosFiltrados = useMemo(() => {
    const q = pesquisa.toLowerCase().trim();
    if (!q) return planos;
    return planos.filter(p =>
      (p.titulo || '').toLowerCase().includes(q) ||
      (p.ucId || '').toLowerCase().includes(q) ||
      (p.ucNome || '').toLowerCase().includes(q)
    );
  }, [planos, pesquisa]);

  const fichasDoPlano = (p: PlanoAula) => fichas.filter(f => (p.fichasIds || []).includes(f.id));

  if (fichaAberta) {
    return (
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setFichaAberta(null)} style={{ marginBottom: 10, padding: '8px 14px',
          borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
          fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>← Voltar aos planos</button>
        {fichaAberta.textoGuia
          ? <GuiaProducao textoGuia={fichaAberta.textoGuia || ''} nomePrato={fichaAberta.nomePrato} ucId={fichaAberta.ucsAssociadas?.[0]} />
          : <div style={{ padding: 20, color: 'rgba(26,23,20,0.5)' }}>Esta ficha ainda não tem Guia gerado.</div>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={turmaFiltro} onChange={e => setTurmaFiltro(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)', fontSize: 13 }}>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
        </select>
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)}
          placeholder="Pesquisar por título ou UC..."
          style={{ flex: 1, minWidth: 160, padding: '8px 10px', borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.15)', fontSize: 13 }} />
      </div>

      {planosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'rgba(26,23,20,0.4)' }}>Sem planos nesta turma.</div>
      ) : planosFiltrados.map(p => (
        <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px',
          marginBottom: 8, border: '1px solid rgba(26,23,20,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.titulo || '(sem título)'}</div>
            <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', whiteSpace: 'nowrap' }}>{fmtDataCurta(p.data)}</div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.55)', marginTop: 2 }}>
            {p.ucId} · {p.ucNome} · <span style={{
              color: p.estado === 'publicado' ? '#15803d' : p.estado === 'arquivado' ? '#999' : '#b5651d',
              fontWeight: 600 }}>{p.estado}</span>
          </div>
          {fichasDoPlano(p).length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {fichasDoPlano(p).map(f => (
                <button key={f.id} onClick={() => setFichaAberta(f)}
                  style={{ padding: '4px 10px', borderRadius: 100, border: 'none',
                    background: 'var(--copper-pale)', color: 'var(--copper)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  🍽 {f.nomePrato}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CONFIG (Coordenadora) — RESET DE INÍCIO DE ANO LETIVO
//
// REESCRITO A 19/07/2026 depois do incidente em que a limpeza
// apagou os 45 alunos reais das turmas. A versão antiga fazia
// localStorage.removeItem às chaves principais (alunos, turmas,
// planos, fichas, requisições, avaliações) enquanto o texto
// prometia que "as fichas reais são preservadas". Foi REMOVIDA.
//
// Fluxo novo, obrigatório e por esta ordem:
//   1. Descarregar cópia de segurança (sem isto o resto fica
//      bloqueado — e o próprio backend recusa executar sem um
//      backup dos últimos 10 minutos, mesmo que a interface
//      fosse contornada)
//   2. Ver a lista NOMINAL do que vai ser apagado e do que
//      vai ser mantido
//   3. Escrever APAGAR para confirmar
// Só apaga o que corresponde POSITIVAMENTE a padrões de teste.
// ══════════════════════════════════════════════════════════════
function ConfigTab() {
  const [preview, setPreview] = useState<PreviewReset | null>(null);
  const [backupFeito, setBackupFeito] = useState<boolean>(backupRecente());
  const [confirmacao, setConfirmacao] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [resultadoOk, setResultadoOk] = useState(false);

  function fazerBackup() {
    descarregarCopiaSeguranca();
    setBackupFeito(true);
    setPreview(previewResetInicioAno());
  }

  function verPreview() {
    setPreview(previewResetInicioAno());
  }

  function executar() {
    if (confirmacao.trim().toUpperCase() !== 'APAGAR') return;
    const res = resetInicioAnoLetivo();
    setResultado(res.mensagem);
    setResultadoOk(res.ok);
    setConfirmacao('');
    if (res.ok) setTimeout(() => window.location.reload(), 2500);
  }

  const nadaParaApagar = preview !== null &&
    preview.alunosApagar.length === 0 && preview.planosApagar.length === 0 &&
    preview.fichasApagar.length === 0 && preview.requisicoesApagar.length === 0 &&
    preview.avaliacoesApagar === 0 && preview.presencasApagar === 0;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        🍂 Reset de Início de Ano Letivo
      </div>
      <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.55)', marginBottom: 14 }}>
        Esta operação existe apenas aqui, na área da Coordenadora. Apaga TODA a atividade de
        testes — avaliações, presenças, planos, fichas, tudo — e mantém apenas os alunos
        reais com os seus PINs, prontos para o ano letivo começar limpo.
      </div>

      {/* Passo 1 — Backup obrigatório */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
        border: `2px solid ${backupFeito ? '#15803d' : '#dc2626'}` }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6,
          color: backupFeito ? '#15803d' : '#dc2626' }}>
          {backupFeito ? '✅ Passo 1 — Cópia de segurança feita' : '1️⃣ Passo 1 — Cópia de segurança (OBRIGATÓRIO)'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 10 }}>
          Antes de apagar seja o que for, descarrega uma cópia de segurança completa.
          Sem um backup dos últimos 10 minutos, a limpeza recusa-se a executar.
          Guarda o ficheiro num sítio seguro (Drive, email).
        </div>
        <button onClick={fazerBackup}
          style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: backupFeito ? 'var(--sage)' : '#dc2626', color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          📥 {backupFeito ? 'Descarregar outra cópia' : 'Descarregar cópia de segurança'}
        </button>
      </div>

      {/* Passo 2 — Pré-visualização nominal */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
        border: '1px solid rgba(26,23,20,0.1)', opacity: backupFeito ? 1 : 0.45 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
          2️⃣ Passo 2 — Ver exatamente o que vai ser apagado
        </div>
        {!preview && (
          <button onClick={verPreview} disabled={!backupFeito}
            style={{ width: '100%', padding: '11px', borderRadius: 10,
              border: '1px solid rgba(26,23,20,0.2)', background: '#faf7f2',
              fontWeight: 600, fontSize: 13, cursor: backupFeito ? 'pointer' : 'not-allowed' }}>
            🔍 Mostrar lista do que seria apagado
          </button>
        )}
        {preview && nadaParaApagar && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--sage-pale)',
            color: 'var(--sage)', fontSize: 13, fontWeight: 600 }}>
            ✅ Não há dados de teste para apagar — está tudo limpo. Os {preview.alunosManter.length} alunos
            reais e todo o histórico ficam exatamente como estão.
          </div>
        )}
        {preview && !nadaParaApagar && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>
              VAI SER APAGADO:
            </div>
            {preview.alunosApagar.length > 0 && (
              <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {preview.alunosApagar.length} aluno(s) de teste (desaparecem):
                </div>
                {preview.alunosApagar.map(a => (
                  <div key={a.id} style={{ fontSize: 12, color: 'rgba(26,23,20,0.7)' }}>
                    · {a.nome || '(sem nome)'} — {a.id}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.7)', marginBottom: 8 }}>
              {preview.planosApagar.length} plano(s) · {preview.fichasApagar.length} ficha(s) · {preview.requisicoesApagar.length} requisição(ões) · {preview.avaliacoesApagar} avaliação(ões) · {preview.presencasApagar} presença(s)
              {preview.outrasContagens.filter(c => c.n > 0).map(c => ` · ${c.n} ${c.rotulo.toLowerCase()}`).join('')}
              {' '}· eventos, ingredientes custom, técnicas custom, manual e rascunhos — tudo apagado
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--sage-pale)',
              fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>
              ✅ SOBREVIVE APENAS ISTO: {preview.alunosManter.length} alunos reais com os seus PINs
              {preview.alunosManter.length > 0 && ` (${preview.alunosManter.slice(0, 3).map(a => a.nome || a.id).join(', ')}…)`}
              , e as turmas. Nada mais.
            </div>
          </div>
        )}
      </div>

      {/* Passo 3 — Confirmação escrita */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16,
        border: '1px solid rgba(26,23,20,0.1)',
        opacity: backupFeito && preview && !nadaParaApagar ? 1 : 0.45 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
          3️⃣ Passo 3 — Confirmar por escrito
        </div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>
          Escreve <strong>APAGAR</strong> (em maiúsculas) para executar o reset. Isto não tem volta — só o backup do Passo 1 recupera o que for apagado.
        </div>
        <input value={confirmacao} onChange={e => setConfirmacao(e.target.value)}
          placeholder="Escreve APAGAR"
          disabled={!backupFeito || !preview || nadaParaApagar}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.2)', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
        <button onClick={executar}
          disabled={confirmacao.trim().toUpperCase() !== 'APAGAR'}
          style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: confirmacao.trim().toUpperCase() === 'APAGAR' ? '#dc2626' : 'rgba(26,23,20,0.15)',
            color: '#fff', fontWeight: 700, fontSize: 14,
            cursor: confirmacao.trim().toUpperCase() === 'APAGAR' ? 'pointer' : 'not-allowed' }}>
          🍂 Apagar tudo e começar o ano letivo
        </button>
        {resultado && (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, fontSize: 13,
            background: resultadoOk ? 'var(--sage-pale)' : '#fef2f2',
            color: resultadoOk ? 'var(--sage)' : '#dc2626', fontWeight: 600 }}>
            {resultado}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gestão de Alunos (PINs, níveis de medidas) ───────────────
function GestaoAlunosTab() {
  const turmas = getTurmas();
  const [turmaSel, setTurmaSel] = useState<string>(turmas[0]?.id || '1º ACP');
  const [refresh, setRefresh] = useState(0);
  const [aSincronizar, setASincronizar] = useState(false);
  const alunos = useMemo(
    () => getAlunos().filter(a => a.turmaId === turmaSel).sort((a, b) => a.numero - b.numero),
    [turmaSel, refresh]
  );

  async function sincronizar() {
    setASincronizar(true);
    await sincronizarAlunosDaSheet();
    setASincronizar(false);
    setRefresh(r => r + 1);
  }

  function mudarPin(a: Aluno) {
    const novo = prompt(`Novo PIN para ${a.nome || 'aluno ' + a.numero} (4 dígitos):`, a.pin || '');
    if (novo && novo.length >= 4) { alterarPinAluno(a.id, novo); setRefresh(r => r + 1); }
  }

  function mudarNivel(a: Aluno) {
    const todos = getAlunos();
    const alvo = todos.find(x => x.id === a.id);
    if (!alvo) return;
    const proximo = ((alvo.nivelMedidas || 1) % 3 + 1) as 1|2|3;
    alvo.nivelMedidas = proximo;
    save('ecl_alunos', todos);
    setRefresh(r => r + 1);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)', fontSize: 13 }}>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
        </select>
        <button onClick={sincronizar} disabled={aSincronizar}
          style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--sage)',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {aSincronizar ? 'A sincronizar…' : '🔄 Sincronizar da Sheet'}
        </button>
        <span style={{ fontSize: 12, color: 'rgba(26,23,20,0.45)' }}>{alunos.length} alunos</span>
      </div>

      {alunos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'rgba(26,23,20,0.4)' }}>
          Sem alunos nesta turma. Usa a Cópia de Segurança para restaurar, ou sincroniza da Sheet.
        </div>
      ) : alunos.map(a => (
        <div key={a.id} style={{ background: '#fff', borderRadius: 12, padding: '10px 14px',
          marginBottom: 6, border: '1px solid rgba(26,23,20,0.08)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{a.numero}</div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{a.nome || '(sem nome)'}</div>
            <BadgeNivel nivel={a.nivelMedidas} />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)' }}>PIN: {a.pin || '—'}</div>
          <button onClick={() => mudarPin(a)} style={{ padding: '5px 10px', borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.15)', background: '#faf7f2', fontSize: 11,
            cursor: 'pointer', fontWeight: 600 }}>🔑 PIN</button>
          <button onClick={() => mudarNivel(a)} style={{ padding: '5px 10px', borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.15)', background: '#faf7f2', fontSize: 11,
            cursor: 'pointer', fontWeight: 600 }}>🎚 Nível</button>
        </div>
      ))}
    </div>
  );
}

// ── Visão Pedagógica (progresso por turma) ───────────────────
function VisaoPedagogicaTab() {
  const turmas = getTurmas();
  const [turmaSel, setTurmaSel] = useState<string>(turmas[0]?.id || '1º ACP');
  const alunos = useMemo(
    () => getAlunos().filter(a => a.turmaId === turmaSel).sort((a, b) => a.numero - b.numero),
    [turmaSel]
  );
  const [alunoAberto, setAlunoAberto] = useState<string | null>(null);

  return (
    <div style={{ marginTop: 12 }}>
      <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)}
        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)',
          fontSize: 13, marginBottom: 12 }}>
        {turmas.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
      </select>

      {alunos.map(a => {
        const perfil = getPerfilProfissionalAluno(a.id);
        const aberto = alunoAberto === a.id;
        return (
          <div key={a.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px',
            marginBottom: 8, border: '1px solid rgba(26,23,20,0.08)', cursor: 'pointer' }}
            onClick={() => setAlunoAberto(aberto ? null : a.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{a.numero}. {a.nome || '(sem nome)'}</div>
              <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)' }}>
                💪 {perfil.pontosFortes.length} · 📈 {perfil.areasADesenvolver.length}
              </div>
            </div>
            {aberto && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(26,23,20,0.06)', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 4 }}>Pontos fortes</div>
                {perfil.pontosFortes.length === 0
                  ? <div style={{ color: 'rgba(26,23,20,0.4)', marginBottom: 8 }}>Ainda sem competências consolidadas.</div>
                  : <div style={{ marginBottom: 8 }}>{perfil.pontosFortes.join(' · ')}</div>}
                <div style={{ fontWeight: 700, color: '#b5651d', marginBottom: 4 }}>Áreas a desenvolver</div>
                {perfil.areasADesenvolver.length === 0
                  ? <div style={{ color: 'rgba(26,23,20,0.4)' }}>Nada assinalado.</div>
                  : <div>{perfil.areasADesenvolver.join(' · ')}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Ranking (participação e regularidade) ────────────────────
function RankingTab() {
  const turmas = getTurmas();
  const [turmaSel, setTurmaSel] = useState<string>(turmas[0]?.id || '1º ACP');
  const alunos = useMemo(
    () => getAlunos().filter(a => a.turmaId === turmaSel),
    [turmaSel]
  );

  const ranking = useMemo(() => {
    return alunos.map(a => {
      const ativs = getAtividades(); const extra = calcularParticipacaoExtra(a.id, ativs);
      return { aluno: a, pontos: extra.eventosParticipados + extra.concursosParticipados };
    }).sort((x, y) => y.pontos - x.pontos);
  }, [alunos]);

  const MEDALHAS = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ marginTop: 12 }}>
      <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)}
        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)',
          fontSize: 13, marginBottom: 12 }}>
        {turmas.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
      </select>
      {ranking.map((r, i) => (
        <div key={r.aluno.id} style={{ background: '#fff', borderRadius: 12, padding: '10px 14px',
          marginBottom: 6, border: '1px solid rgba(26,23,20,0.08)',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 18 : 13, fontWeight: 800 }}>
            {MEDALHAS[i] || i + 1}
          </div>
          <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{r.aluno.nome || `Aluno ${r.aluno.numero}`}</div>
          <div style={{ fontWeight: 800, color: 'var(--copper)' }}>{r.pontos} pts</div>
        </div>
      ))}
    </div>
  );
}
