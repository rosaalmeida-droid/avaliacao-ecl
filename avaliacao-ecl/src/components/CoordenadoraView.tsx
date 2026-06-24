import React, { useMemo, useState } from 'react';
import { Atividade, TipoAtividade } from '../types';
import { getTurmas, getAlunos, getValidacoes, getSelecoes, getComandas, getAtividades, addOrUpdateAtividade, getRecuperacoesPorTurma, getPerfilProfissionalAluno, alterarPinAluno, sincronizarAlunosDaSheet, save } from '../backend';
import { Aluno } from '../types';
import { construirHistorico, alertaEquilibrioModo, calcularProgressoUCs, calcularParticipacaoExtra } from '../progresso';
import { UCS_COZINHA } from './PlanoAula';
import { Card, Button, Field, Badge } from './ui';

export function CoordenadoraView() {
  const [tab, setTab] = useState<'ranking' | 'atividades' | 'pedagogico' | 'alunos'>('ranking');

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant={tab === 'ranking' ? 'primary' : 'ghost'} onClick={() => setTab('ranking')}>Ranking</Button>
          <Button variant={tab === 'atividades' ? 'primary' : 'ghost'} onClick={() => setTab('atividades')}>Eventos/Concursos</Button>
          <Button variant={tab === 'pedagogico' ? 'primary' : 'ghost'} onClick={() => setTab('pedagogico')}>📊 Visão Pedagógica</Button>
          <Button variant={tab === 'alunos' ? 'primary' : 'ghost'} onClick={() => setTab('alunos')}>👥 Gestão de Alunos</Button>
        </div>
      </Card>
      {tab === 'ranking' && <RankingTab />}
      {tab === 'atividades' && <AtividadesTab />}
      {tab === 'pedagogico' && <VisaoPedagogicaTab />}
      {tab === 'alunos' && <GestaoAlunosTab />}
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
