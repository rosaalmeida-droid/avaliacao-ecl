import React, { useState } from 'react';
import { Perfil } from '../types';
import { Button, Card, Field } from './ui';
import { getTurmas, getOrCreateAluno } from '../backend';
import logoEcl from '../assets/logo_ecl.png';

const PINS: Record<Exclude<Perfil, 'aluno'>, string> = {
  professor: '1111',
  coordenadora: '1006',
};

export function Login({ onLogin }: { onLogin: (perfil: Perfil, alunoId?: string, turmaId?: string) => void }) {
  const [modo, setModo] = useState<Perfil | null>(null);
  const [turmaId, setTurmaId] = useState(getTurmas()[0]?.id || '');
  const [numero, setNumero] = useState('');
  const [ano, setAno] = useState<1 | 2 | 3>(1);
  const [pinAluno, setPinAluno] = useState('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');

  const turmas = getTurmas();

  function entrarAluno() {
    if (!numero || pinAluno !== '1234') { setErro('Número ou PIN incorretos.'); return; }
    const aluno = getOrCreateAluno(turmaId, Number(numero), ano);
    onLogin('aluno', aluno.id, turmaId);
  }

  function entrarStaff(perfil: Exclude<Perfil, 'aluno'>) {
    if (pin !== PINS[perfil]) { setErro('PIN incorreto.'); return; }
    onLogin(perfil, undefined, perfil === 'professor' ? turmaId : undefined);
  }

  /* ── Cabeçalho com logo ── */
  const Cabecalho = () => (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <img src={logoEcl} alt="Escola de Comércio de Lisboa" style={{ height: 72, width: 'auto', marginBottom: 16, objectFit: 'contain' }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
        Avaliação ECL
      </div>
      <div className="muted">Comanda de competências — Cozinha</div>
    </div>
  );

  if (!modo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 20, background: 'var(--cream)' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <Cabecalho />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary btn-block btn-lg" onClick={() => setModo('aluno')}>
              Sou Aluno
            </button>
            <button className="btn btn-secondary btn-block btn-lg" onClick={() => setModo('professor')}>
              Sou Professor
            </button>
            <button className="btn btn-ghost btn-block btn-lg" onClick={() => setModo('coordenadora')}>
              Sou Coordenadora
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'rgba(26,23,20,0.3)' }}>
            Escola de Comércio de Lisboa © 2026
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 20, background: 'var(--cream)' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <Cabecalho />
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--charcoal)' }}>
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
              <Field label="Ano do curso">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3].map(a => (
                    <button key={a} type="button" className={`chip${ano === a ? ' selected' : ''}`} onClick={() => setAno(a as 1 | 2 | 3)}>
                      {a}º ano
                    </button>
                  ))}
                </div>
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
          <Button block variant="ghost" onClick={() => { setModo(null); setErro(''); }}>← Voltar</Button>
        </div>
      </div>
    </div>
  );
}

