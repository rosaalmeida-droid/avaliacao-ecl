import React, { useMemo, useState } from 'react';
import { Atividade, TipoAtividade } from '../types';
import { getTurmas, getAlunos, getValidacoes, getSelecoes, getComandas, getAtividades, addOrUpdateAtividade, getRecuperacoesPorTurma, getPerfilProfissionalAluno } from '../backend';
import { construirHistorico, alertaEquilibrioModo, calcularProgressoUCs, calcularParticipacaoExtra } from '../progresso';
import { UCS_COZINHA } from './PlanoAula';
import { Card, Button, Field, Badge } from './ui';

export function CoordenadoraView() {
  const [tab, setTab] = useState<'ranking' | 'atividades' | 'pedagogico'>('ranking');

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant={tab === 'ranking' ? 'primary' : 'ghost'} onClick={() => setTab('ranking')}>Ranking</Button>
          <Button variant={tab === 'atividades' ? 'primary' : 'ghost'} onClick={() => setTab('atividades')}>Eventos/Concursos</Button>
          <Button variant={tab === 'pedagogico' ? 'primary' : 'ghost'} onClick={() => setTab('pedagogico')}>📊 Visão Pedagógica</Button>
        </div>
      </Card>
      {tab === 'ranking' && <RankingTab />}
      {tab === 'atividades' && <AtividadesTab />}
      {tab === 'pedagogico' && <VisaoPedagogicaTab />}
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
