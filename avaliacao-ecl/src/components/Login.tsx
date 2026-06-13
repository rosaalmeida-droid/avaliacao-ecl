import React, { useState } from 'react';
import { Perfil } from '../types';
import { Button, Card, Field } from './ui';
import { getTurmas, getOrCreateAluno } from '../backend';

const PINS: Record<Exclude<Perfil, 'aluno'>, string> = {
  professor: '1111',
  coordenadora: '1006',
};

export function Login({ onLogin }: { onLogin: (perfil: Perfil, alunoId?: string, turmaId?: string) => void }) {
  const [modo, setModo] = useState<Perfil | null>(null);
  const [turmaId, setTurmaId] = useState(getTurmas()[0]?.id || '');
  const [numero, setNumero] = useState('');
  const [pinAluno, setPinAluno] = useState('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');

  const turmas = getTurmas();

  function entrarAluno() {
    if (!numero || pinAluno !== '1234') {
      setErro('Número ou PIN incorretos.');
      return;
    }
    const aluno = getOrCreateAluno(turmaId, Number(numero));
    onLogin('aluno', aluno.id, turmaId);
  }

  function entrarStaff(perfil: Exclude<Perfil, 'aluno'>) {
    if (pin !== PINS[perfil]) {
      setErro('PIN incorreto.');
      return;
    }
    onLogin(perfil, undefined, perfil === 'professor' ? turmaId : undefined);
  }

  if (!modo) {
    return (
      <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="display" style={{ fontSize: 30, fontWeight: 700 }}>📋 Avaliação ECL</div>
          <div className="muted">Comanda de competências — Cozinha</div>
        </div>
        <Card>
          <Button block variant="primary" onClick={() => setModo('aluno')}>Sou Aluno</Button>
        </Card>
        <Card>
          <Button block variant="secondary" onClick={() => setModo('professor')}>Sou Professor</Button>
        </Card>
        <Card>
          <Button block variant="ghost" onClick={() => setModo('coordenadora')}>Sou Coordenadora</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <Card>
        <div className="display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
          {modo === 'aluno' ? 'Login do Aluno' : modo === 'professor' ? 'Login do Professor' : 'Login da Coordenadora'}
        </div>

        {modo === 'aluno' && (
          <>
            <Field label="Turma">
              <select className="input" value={turmaId} onChange={e => setTurmaId(e.target.value)}>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Field>
            <Field label="Número">
              <input className="input" type="number" value={numero} onChange={e => setNumero(e.target.value)} placeholder="ex: 12" />
            </Field>
            <Field label="PIN pessoal">
              <input className="input" type="password" value={pinAluno} onChange={e => setPinAluno(e.target.value)} placeholder="••••" />
            </Field>
            {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
            <Button block onClick={entrarAluno}>Entrar</Button>
          </>
        )}

        {modo === 'professor' && (
          <>
            <Field label="Turma">
              <select className="input" value={turmaId} onChange={e => setTurmaId(e.target.value)}>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Field>
            <Field label="PIN">
              <input className="input" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" />
            </Field>
            {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
            <Button block onClick={() => entrarStaff('professor')}>Entrar</Button>
          </>
        )}

        {modo === 'coordenadora' && (
          <>
            <Field label="PIN">
              <input className="input" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" />
            </Field>
            {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
            <Button block onClick={() => entrarStaff('coordenadora')}>Entrar</Button>
          </>
        )}

        <div className="divider" />
        <Button block variant="ghost" onClick={() => { setModo(null); setErro(''); }}>Voltar</Button>
      </Card>
    </div>
  );
}
