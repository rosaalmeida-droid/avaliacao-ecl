import React, { useMemo, useState } from 'react';
import { Atividade, TipoAtividade } from '../types';
import { getTurmas, getAlunos, getValidacoes, getSelecoes, getComandas, getAtividades, addOrUpdateAtividade } from '../backend';
import { construirHistorico, alertaEquilibrioModo, calcularProgressoUCs, calcularParticipacaoExtra } from '../progresso';
import { Card, Button, Field, Badge } from './ui';

export function CoordenadoraView() {
  const [tab, setTab] = useState<'ranking' | 'atividades'>('ranking');

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant={tab === 'ranking' ? 'primary' : 'ghost'} onClick={() => setTab('ranking')}>Ranking</Button>
          <Button variant={tab === 'atividades' ? 'primary' : 'ghost'} onClick={() => setTab('atividades')}>Eventos/Concursos</Button>
        </div>
      </Card>
      {tab === 'ranking' ? <RankingTab /> : <AtividadesTab />}
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
