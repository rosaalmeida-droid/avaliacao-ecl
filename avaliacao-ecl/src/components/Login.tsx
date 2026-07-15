import React, { useState } from 'react';
import { Perfil } from '../types';
import { Button, Card, Field } from './ui';
import { getTurmas, getAlunos, validarLoginAluno } from '../backend';
import { LOGO_ECL as logoEcl } from '../logo_ecl';

const PINS: Record<Exclude<Perfil, 'aluno'>, string> = {
  professor: '1111',
  coordenadora: '1006',
};

export function Login({ onLogin }: { onLogin: (perfil: Perfil, alunoId?: string, turmaId?: string, nome?: string) => void }) {
  const [modo, setModo] = useState<Perfil | null>(null);
  const [turmaId, setTurmaId] = useState(getTurmas()[0]?.id || '');
  const [numero, setNumero] = useState('');
  const [ano, setAno] = useState<1 | 2 | 3>(1);
  const [pinAluno, setPinAluno] = useState('');
  const [pin, setPin] = useState('');
  const [nomeProfessor, setNomeProfessor] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const turmas = getTurmas();

  // Detecta se o aluno já tem PIN definido (primeiro acesso vs. regresso)
  const alunoExistente = numero
    ? getAlunos().find(a => a.id === `${turmaId}-${numero}`)
    : undefined;
  const primeiroAcesso = !alunoExistente?.pin;

  async function entrarAluno() {
    setErro('');
    if (!numero) { setErro('Introduz o teu número de aluno.'); return; }
    if (pinAluno.length < 4) { setErro('O PIN deve ter 4 dígitos.'); return; }
    setLoading(true);
    try {
      const resultado = await validarLoginAluno(turmaId, Number(numero), ano, pinAluno);
      if (!resultado.ok || !resultado.aluno) {
        setErro(resultado.erro || 'Número ou PIN incorretos.');
      } else {
        onLogin('aluno', resultado.aluno.id, turmaId);
      }
    } finally {
      setLoading(false);
    }
  }

  function entrarStaff(perfil: Exclude<Perfil, 'aluno'>) {
    if (pin !== PINS[perfil]) { setErro('PIN incorreto.'); return; }
    if (perfil === 'professor' && !nomeProfessor.trim()) { setErro('Por favor introduz o teu nome.'); return; }
    onLogin(perfil, undefined, perfil === 'professor' ? turmaId : undefined, nomeProfessor.trim() || undefined);
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
                <select className="input" value={turmaId} onChange={e => { setTurmaId(e.target.value); setNumero(''); }}>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </Field>
              <Field label="Número de aluno">
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

              {/* Mensagem diferente conforme primeiro acesso ou regresso */}
              {numero && (
                <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 8,
                  background: primeiroAcesso ? 'var(--copper-pale)' : 'var(--sage-pale)',
                  color: primeiroAcesso ? 'var(--copper)' : 'var(--sage)' }}>
                  {primeiroAcesso
                    ? '✦ Primeiro acesso — escolhe um PIN de 4 dígitos. Vai ser sempre o teu.'
                    : '✓ Bem-vindo/a de volta! Introduz o teu PIN.'}
                </div>
              )}

              <Field label={primeiroAcesso ? 'Escolhe um PIN (4 dígitos)' : 'PIN pessoal'}>
                <input
                  className="input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinAluno}
                  onChange={e => setPinAluno(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  onKeyDown={e => e.key === 'Enter' && entrarAluno()}
                />
              </Field>

              {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
              <Button block onClick={entrarAluno} disabled={loading}>
                {loading ? 'A verificar...' : primeiroAcesso ? 'Criar PIN e Entrar' : 'Entrar'}
              </Button>
            </>
          )}

          {modo === 'professor' && (
            <>
              <Field label="Turma">
                <select className="input" value={turmaId} onChange={e => setTurmaId(e.target.value)}>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </Field>
              <Field label="Nome (opcional)">
                <input className="input" type="text" value={nomeProfessor} onChange={e => setNomeProfessor(e.target.value)} placeholder="ex: Rosa Almeida" />
              </Field>
              <Field label="PIN">
                <input className="input" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••"
                  onKeyDown={e => e.key === 'Enter' && entrarStaff('professor')} />
              </Field>
              {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
              <Button block onClick={() => entrarStaff('professor')}>Entrar</Button>
            </>
          )}

          {modo === 'coordenadora' && (
            <>
              <Field label="PIN">
                <input className="input" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••"
                  onKeyDown={e => e.key === 'Enter' && entrarStaff('coordenadora')} />
              </Field>
              {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
              <Button block onClick={() => entrarStaff('coordenadora')}>Entrar</Button>
            </>
          )}

          <div className="divider" />
          <Button block variant="ghost" onClick={() => { setModo(null); setErro(''); setPinAluno(''); setPin(''); }}>← Voltar</Button>
        </div>
      </div>
    </div>
  );
}
