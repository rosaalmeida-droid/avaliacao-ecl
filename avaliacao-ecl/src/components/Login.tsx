import React, { useState } from 'react';
import { Perfil } from '../types';
import { Button, Card, Field } from './ui';
import { getTurmas, getAlunos, validarLoginAluno, confirmarCodigo, enviarPinsParaOSheets } from '../backend';
import { LOGO_ECL as logoEcl } from '../logo_ecl';
import { PROFESSORES, professorPorNome } from '../professores';

const PIN_COORDENADORA = '1006';
/** Código comum da área «Eventos e orçamentos» (provisório — a Rosa escolhe o definitivo). */
const CODIGO_EVENTOS = '2026';

export function Login({ onLogin }: { onLogin: (perfil: Perfil, alunoId?: string, turmaId?: string, nome?: string) => void }) {
  const [modo, setModo] = useState<Perfil | null>(null);
  // Sem turma escolhida à partida: a primeira da lista vinha marcada e
  // era fácil entrar na turma errada.
  const [turmaId, setTurmaId] = useState('');
  const [numero, setNumero] = useState('');
  // Ano derivado automaticamente da turma — 1º ACP=1, 2º ACP=2, 3º ACP=3
  const ano: 1 | 2 | 3 = turmaId.startsWith('1') ? 1 : turmaId.startsWith('2') ? 2 : 3;
  const [pinAluno, setPinAluno] = useState('');
  const [pin, setPin] = useState('');
  const [nomeProfessor, setNomeProfessor] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const turmas = getTurmas();
  // Alunos da turma escolhida, para o aluno se encontrar pelo nome.
  const alunosDaTurma = getAlunos()
    .filter(a => a.turmaId === turmaId && a.ativo !== false)
    .sort((a, b) => a.numero - b.numero);
  const profEscolhido = professorPorNome(nomeProfessor);
  const turmasDoProf = turmas.filter(t => profEscolhido?.turmas.includes(t.id));

  // Detecta se o aluno já tem PIN definido (primeiro acesso vs. regresso)


  async function entrarAluno() {
    setErro('');
    if (!turmaId) { setErro('Escolhe a tua turma.'); return; }
    if (!numero) { setErro('Escolhe o teu nome.'); return; }
    if (pinAluno.length < 4) { setErro('O PIN deve ter 4 dígitos.'); return; }
    setLoading(true);
    try {
      const resultado = await validarLoginAluno(turmaId, Number(numero), ano, pinAluno);
      if (!resultado.ok || !resultado.aluno) {
        setErro(resultado.erro || 'Número ou PIN incorretos.');
      } else {
        if ((resultado as any).primeiraVezNesteTelemovel) {
          alert('Bem-vindo/a! O teu PIN ficou ligado a este telemóvel.\n\n'
            + 'A partir de agora, só entras com ele. Se mudares de telemóvel, '
            + 'pede ao professor que liberte o teu PIN.');
        }
        onLogin('aluno', resultado.aluno.id, turmaId);
      }
    } finally {
      setLoading(false);
    }
  }

  /** (v22) O código é confirmado pelo Sheets (folha CODIGOS). Enquanto lá
   *  não houver código novo para esta pessoa, vale o de antes. Devolve o erro, ou ''. */
  async function codigoCerto(quem: string, deAntes: string): Promise<string> {
    const r = await confirmarCodigo(quem, pin);
    if (r === 'entrou') return '';
    if (r === 'errado') return 'Código incorreto.';
    if (r === 'bloqueado') return 'Muitas tentativas erradas. Espera 10 minutos.';
    return pin === deAntes ? '' : 'Código incorreto.';
  }

  async function entrarStaff(perfil: Exclude<Perfil, 'aluno'>) {
    if (loading) return;
    setErro('');
    // Professor: o seu nome, o seu PIN e só as suas turmas.
    const turma = turmasDoProf.length === 1 ? turmasDoProf[0]?.id : turmaId;
    if (perfil === 'professor') {
      if (!profEscolhido) { setErro('Escolha o seu nome.'); return; }
      if (!turma || !profEscolhido.turmas.includes(turma)) { setErro('Escolha uma das suas turmas.'); return; }
    }
    setLoading(true);
    const quem = perfil === 'professor' ? profEscolhido!.nome : perfil;
    const deAntes = perfil === 'eventos' ? CODIGO_EVENTOS : perfil === 'coordenadora' ? PIN_COORDENADORA : profEscolhido!.pin;
    const erroCodigo = await codigoCerto(quem, deAntes);
    setLoading(false);
    if (erroCodigo) { setErro(erroCodigo); return; }
    // Eventos e orçamentos: só o código comum, sem nome (Rosa, out/2026).
    // O que se fizer aqui fica registado como «Eventos e orçamentos».
    if (perfil === 'eventos') { onLogin('eventos', undefined, undefined, 'Eventos e orçamentos'); return; }
    // O aparelho do professor ou da coordenação manda uma vez os PIN dos alunos
    // para o Sheets, para os PIN poderem sair da aplicação.
    enviarPinsParaOSheets();
    if (perfil === 'coordenadora') { onLogin('coordenadora'); return; }
    onLogin('professor', undefined, turma, profEscolhido!.nome);
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
            <button className="btn btn-ghost btn-block btn-lg" onClick={() => setModo('eventos')}>
              Eventos e orçamentos
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12.5, color: 'rgba(26,23,20,0.3)' }}>
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
            {modo === 'aluno' ? 'Login do Aluno' : modo === 'professor' ? 'Login do Professor' : modo === 'eventos' ? 'Eventos e orçamentos' : 'Login da Coordenadora'}
          </div>

          {modo === 'aluno' && (
            <>
              <Field label="Turma">
                <select className="input" value={turmaId} onChange={e => { setTurmaId(e.target.value); setNumero(''); }}>
                  <option value="">Escolhe a tua turma</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </Field>
              {turmaId && (
                <Field label="O teu nome">
                  <select className="input" value={numero} onChange={e => setNumero(e.target.value)}>
                    <option value="">Escolhe o teu nome</option>
                    {alunosDaTurma.map(a => (
                      <option key={a.id} value={String(a.numero)}>{a.numero}. {a.nome || `Aluno ${a.numero}`}</option>
                    ))}
                  </select>
                </Field>
              )}


              <Field label="PIN pessoal (4 dígitos)">
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
                {loading ? 'A verificar...' : 'Entrar'}
              </Button>
            </>
          )}

          {modo === 'professor' && (
            <>
              <Field label="Professor">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PROFESSORES.map(p => (
                    <button key={p.nome} type="button" onClick={() => { setNomeProfessor(p.nome); setTurmaId(''); setErro(''); }}
                      style={{ padding: '11px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 15, fontWeight: 700,
                        border: nomeProfessor === p.nome ? '2px solid var(--copper)' : '1px solid rgba(26,23,20,0.18)',
                        background: nomeProfessor === p.nome ? 'var(--copper-pale, #fdf0e6)' : '#fff' }}>
                      {p.nome}
                    </button>
                  ))}
                </div>
              </Field>
              {profEscolhido && turmasDoProf.length > 1 && (
                <Field label="Turma">
                  <select className="input" value={turmaId} onChange={e => setTurmaId(e.target.value)}>
                    <option value="">Escolha a turma</option>
                    {turmasDoProf.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </Field>
              )}
              {profEscolhido && turmasDoProf.length === 1 && (
                <div style={{ fontSize: 14, marginBottom: 10 }}>Turma: <b>{turmasDoProf[0].nome}</b></div>
              )}
              <Field label="PIN">
                <input className="input" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••"
                  onKeyDown={e => e.key === 'Enter' && entrarStaff('professor')} />
              </Field>
              {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
              <Button block onClick={() => entrarStaff('professor')}>{loading ? 'A confirmar…' : 'Entrar'}</Button>
            </>
          )}

          {modo === 'coordenadora' && (
            <>
              <Field label="PIN">
                <input className="input" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••"
                  onKeyDown={e => e.key === 'Enter' && entrarStaff('coordenadora')} />
              </Field>
              {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
              <Button block onClick={() => entrarStaff('coordenadora')}>{loading ? 'A confirmar…' : 'Entrar'}</Button>
            </>
          )}

          {modo === 'eventos' && (
            <>
              <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.65)', marginBottom: 12, lineHeight: 1.5 }}>
                Eventos, orçamentos, fichas técnicas e requisições.
              </div>
              <Field label="Código">
                <input className="input" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••"
                  onKeyDown={e => e.key === 'Enter' && entrarStaff('eventos')} />
              </Field>
              {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}
              <Button block onClick={() => entrarStaff('eventos')}>{loading ? 'A confirmar…' : 'Entrar'}</Button>
            </>
          )}

          <div className="divider" />
          <Button block variant="ghost" onClick={() => { setModo(null); setErro(''); setPinAluno(''); setPin(''); }}>← Voltar</Button>
        </div>
      </div>
    </div>
  );
}
