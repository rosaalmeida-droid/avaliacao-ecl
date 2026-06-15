import React, { useState } from 'react';
import { getAlunos } from '../backend';

// ── Competências para a grelha ────────────────────────────────
const COMPS_PERM = [
  { id:'A01', abrev:'Responsab.', sim:'Reconhece erro · Termina tarefas', nao:'Culpa colegas · Abandona' },
  { id:'A11', abrev:'Organização', sim:'Mise en place · Posto arrumado', nao:'Procura utensílios a meio' },
  { id:'A16', abrev:'Higiene/SA', sim:'Lava mãos · Separa crus', nao:'Toca rosto · Ignora temps.' },
];
const COMPS_CTX_EQUIPA = [
  { id:'A09', abrev:'Cooperação', sim:'Ajuda equipa · Partilha info', nao:'Só a sua tarefa · Tensão' },
  { id:'A08', abrev:'Escuta ativa', sim:'Ouve · Segue 1ª vez', nao:'Precisa repetir · Distrai-se' },
  { id:'A06', abrev:'Assertividade', sim:'Diz o que pensa · Aceita feedback', nao:'Silêncio com dúvidas · Agressivo' },
];
const COMPS_CTX_IND = [
  { id:'A02', abrev:'Autonomia', sim:'Toma iniciativa · Resolve sozinho', nao:'Espera instruções constantes' },
  { id:'A04', abrev:'Iniciativa', sim:'Age antes de ser pedido', nao:'Espera sempre que digam' },
  { id:'A10', abrev:'Empenho', sim:'Persiste quando difícil', nao:'Desiste ao 1º obstáculo' },
];

const TIPO_ATIVIDADE = ['Trabalho em equipa', 'Trabalho individual', 'Serviço real', 'Coordenação'];

type NotaProf = 's' | 'a' | 'r' | null;

interface PlanoState {
  data: string;
  turma: string;
  tipo: string;
  receitas: string[];
  grupos: Record<string, string[]>;
  horaInicio: string;
}

const PLANO_VAZIO: PlanoState = {
  data: new Date().toISOString().split('T')[0],
  turma: '',
  tipo: 'Trabalho em equipa',
  receitas: ['', '', ''],
  grupos: {},
  horaInicio: '09:00',
};

const card: React.CSSProperties = {
  background: 'var(--color-background-primary)',
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: 12, padding: '12px 14px', marginBottom: 10,
};
const muted: React.CSSProperties = { color: 'var(--color-text-secondary)', fontSize: 11 };
const btnPrimary = (disabled = false): React.CSSProperties => ({
  width: '100%', padding: '9px 14px', borderRadius: 8, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? 'var(--color-background-secondary)' : '#1D9E75',
  color: disabled ? 'var(--color-text-secondary)' : 'white',
  fontWeight: 500, fontSize: 13, marginTop: 6,
});

function StepBar({ steps, current, onClick }: { steps: string[]; current: number; onClick: (i: number) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length},1fr)`, borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--color-border-tertiary)', marginBottom: 12 }}>
      {steps.map((s, i) => (
        <div key={i} onClick={() => i <= current && onClick(i)} style={{
          padding: '6px 2px', textAlign: 'center', fontSize: 9, cursor: i <= current ? 'pointer' : 'default',
          borderRight: i < steps.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
          background: i < current ? '#EAF3DE' : i === current ? '#1D9E75' : 'var(--color-background-secondary)',
          color: i < current ? '#3B6D11' : i === current ? 'white' : 'var(--color-text-secondary)',
          fontWeight: i === current ? 500 : 400,
        }}>{i < current ? '✓ ' : ''}{s}</div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function PlanoAula({ turmaId }: { turmaId: string }) {
  const [view, setView] = useState<'plano' | 'avaliar'>('plano');
  const [passo, setPasso] = useState(0);
  const [plano, setPlano] = useState<PlanoState>({ ...PLANO_VAZIO, turma: turmaId });
  const [publicado, setPublicado] = useState(false);

  const alunos = getAlunos().filter(a => a.turmaId === turmaId);
  const compsAtivas = plano.tipo === 'Trabalho em equipa' || plano.tipo === 'Serviço real'
    ? COMPS_CTX_EQUIPA : COMPS_CTX_IND;
  const todasComps = [...COMPS_PERM, ...compsAtivas];

  // Grelha de avaliação
  const [notas, setNotas] = useState<Record<string, Record<string, NotaProf>>>(() =>
    Object.fromEntries(alunos.map(a => [a.id, Object.fromEntries(todasComps.map(c => [c.id, null]))]))
  );

  function toggleNota(alunoId: string, compId: string, v: NotaProf) {
    setNotas(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], [compId]: prev[alunoId][compId] === v ? null : v } }));
  }

  const STEPS = ['Dados', 'Fichas', 'Grupos', 'Competências', 'Publicar'];

  if (view === 'avaliar') {
    return <GrelhaAvaliacao turmaId={turmaId} plano={plano} notas={notas} todasComps={todasComps} alunos={alunos} onToggle={toggleNota} onVoltar={() => setView('plano')} />;
  }

  return (
    <div>
      <StepBar steps={STEPS} current={passo} onClick={setPasso} />

      {/* PASSO 0 — DADOS */}
      {passo === 0 && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Dados da aula</div>
            {[
              { label: 'Data', content: <input type="date" value={plano.data} onChange={e => setPlano(p => ({ ...p, data: e.target.value }))} style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} /> },
              { label: 'Hora início', content: <input type="time" value={plano.horaInicio} onChange={e => setPlano(p => ({ ...p, horaInicio: e.target.value }))} style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} /> },
              { label: 'Tipo de atividade', content: (
                <select value={plano.tipo} onChange={e => setPlano(p => ({ ...p, tipo: e.target.value }))} style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}>
                  {TIPO_ATIVIDADE.map(t => <option key={t}>{t}</option>)}
                </select>
              )},
            ].map(({ label, content }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ ...muted, marginBottom: 3 }}>{label}</div>
                {content}
              </div>
            ))}
          </div>
          <button style={btnPrimary()} onClick={() => setPasso(1)}>Continuar →</button>
        </div>
      )}

      {/* PASSO 1 — FICHAS */}
      {passo === 1 && (
        <div>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Fichas técnicas</span>
              <button onClick={() => setPlano(p => ({ ...p, receitas: [...p.receitas, ''] }))} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>+ Adicionar</button>
            </div>
            {plano.receitas.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--color-text-secondary)', flexShrink: 0 }}>{i+1}</div>
                <input value={r} onChange={e => { const rs = [...plano.receitas]; rs[i] = e.target.value; setPlano(p => ({ ...p, receitas: rs })); }} placeholder={`Receita ${i+1}...`} style={{ flex: 1, fontSize: 12, padding: '6px 8px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                <select style={{ fontSize: 10, padding: '5px 6px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}>
                  <option>Gr. A</option><option>Gr. B</option><option>Todos</option>
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...btnPrimary(), flex: 0, padding: '9px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-tertiary)' }} onClick={() => setPasso(0)}>←</button>
            <button style={{ ...btnPrimary(), flex: 1, marginTop: 0 }} onClick={() => setPasso(2)}>Continuar →</button>
          </div>
        </div>
      )}

      {/* PASSO 2 — GRUPOS */}
      {passo === 2 && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Distribuição de grupos</div>
            {alunos.length === 0 && <div style={muted}>Sem alunos registados nesta turma.</div>}
            {alunos.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < alunos.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#085041' }}>{a.numero}</div>
                <span style={{ flex: 1, fontSize: 12 }}>{a.nome || `Aluno ${a.numero}`}</span>
                <select style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}>
                  <option>Grupo A</option><option>Grupo B</option><option>Individual</option>
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...btnPrimary(), flex: 0, padding: '9px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-tertiary)' }} onClick={() => setPasso(1)}>←</button>
            <button style={{ ...btnPrimary(), flex: 1, marginTop: 0 }} onClick={() => setPasso(3)}>Continuar →</button>
          </div>
        </div>
      )}

      {/* PASSO 3 — COMPETÊNCIAS */}
      {passo === 3 && (
        <div>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Permanentes</span>
              <span style={{ fontSize: 10, background: '#FAEEDA', color: '#854F0B', padding: '2px 8px', borderRadius: 20 }}>sempre</span>
            </div>
            {COMPS_PERM.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <div style={{ width: 28, height: 16, borderRadius: 8, background: '#1D9E75', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: 14, width: 12, height: 12, borderRadius: '50%', background: 'white' }} />
                </div>
                <span style={{ flex: 1, fontSize: 11 }}>{c.abrev}</span>
                <span style={{ fontSize: 10, background: '#FAEEDA', color: '#854F0B', padding: '1px 6px', borderRadius: 20 }}>obrigatória</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Contexto — {plano.tipo}</span>
              <span style={{ fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '2px 8px', borderRadius: 20 }}>auto</span>
            </div>
            {compsAtivas.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < compsAtivas.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                <div style={{ width: 28, height: 16, borderRadius: 8, background: '#1D9E75', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: 14, width: 12, height: 12, borderRadius: '50%', background: 'white' }} />
                </div>
                <span style={{ flex: 1, fontSize: 11 }}>{c.abrev}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...btnPrimary(), flex: 0, padding: '9px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-tertiary)' }} onClick={() => setPasso(2)}>←</button>
            <button style={{ ...btnPrimary(), flex: 1, marginTop: 0 }} onClick={() => setPasso(4)}>Continuar →</button>
          </div>
        </div>
      )}

      {/* PASSO 4 — PUBLICAR */}
      {passo === 4 && (
        <div>
          <div style={{ ...card, textAlign: 'center', padding: '16px 14px' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Pronto a publicar</div>
            <div style={muted}>{plano.data} · {plano.turma} · {plano.tipo}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              {[
                ['Fichas', plano.receitas.filter(r => r).length.toString()],
                ['Alunos', alunos.length.toString()],
                ['Permanentes', COMPS_PERM.length.toString()],
                ['Contexto', compsAtivas.length.toString()],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>{v}</div>
                  <div style={muted}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <button style={btnPrimary()} onClick={() => { setPublicado(true); setView('avaliar'); }}>
            Publicar e abrir grelha de avaliação
          </button>
          <button style={{ ...btnPrimary(), background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-tertiary)', marginTop: 6 }} onClick={() => alert('Guardado como rascunho')}>
            Guardar rascunho
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GRELHA DE AVALIAÇÃO DO PROFESSOR
// ═══════════════════════════════════════════════════════════════
function GrelhaAvaliacao({ turmaId, plano, notas, todasComps, alunos, onToggle, onVoltar }: {
  turmaId: string;
  plano: PlanoState;
  notas: Record<string, Record<string, NotaProf>>;
  todasComps: { id: string; abrev: string; sim: string; nao: string }[];
  alunos: ReturnType<typeof getAlunos>;
  onToggle: (alunoId: string, compId: string, v: NotaProf) => void;
  onVoltar: () => void;
}) {
  const [alunoDetalhe, setAlunoDetalhe] = useState<string | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button onClick={onVoltar} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>← Plano</button>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Grelha de avaliação · {plano.tipo}</span>
      </div>

      {/* TABELA */}
      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${todasComps.length},1fr)`, background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ padding: '6px 8px', fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Aluno</div>
          {todasComps.map((c, i) => (
            <div key={c.id} style={{ padding: '5px 3px', borderLeft: '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: 2 }}>{c.abrev}</div>
              <div style={{ fontSize: 7, background: '#EAF3DE', color: '#27500A', padding: '1px 3px', borderRadius: 3, marginBottom: 1, lineHeight: 1.3 }}>✓ {c.sim.split('·')[0].trim()}</div>
              <div style={{ fontSize: 7, background: '#FCEBEB', color: '#791F1F', padding: '1px 3px', borderRadius: 3, lineHeight: 1.3 }}>✗ {c.nao.split('·')[0].trim()}</div>
            </div>
          ))}
        </div>

        {/* Linhas de alunos */}
        {alunos.map((a, ai) => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: `80px repeat(${todasComps.length},1fr)`, borderBottom: ai < alunos.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
            <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, color: '#085041', flexShrink: 0 }}>{a.numero}</div>
              <span style={{ fontSize: 10, color: 'var(--color-text-primary)' }}>{(a.nome || `Aluno ${a.numero}`).split(' ')[0]}</span>
            </div>
            {todasComps.map(c => {
              const v = notas[a.id]?.[c.id] || null;
              return (
                <div key={c.id} style={{ padding: '4px 2px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderLeft: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {(['s','a','r'] as NotaProf[]).map(bv => (
                      <button key={bv!} onClick={() => onToggle(a.id, c.id, bv)} style={{
                        width: 20, height: 20, borderRadius: 4, fontSize: 9, fontWeight: 500, cursor: 'pointer',
                        border: `0.5px solid ${v === bv ? (bv==='s'?'#639922':bv==='a'?'#378ADD':'#E24B4A') : 'var(--color-border-tertiary)'}`,
                        background: v === bv ? (bv==='s'?'#EAF3DE':bv==='a'?'#E6F1FB':'#FCEBEB') : 'var(--color-background-secondary)',
                        color: v === bv ? (bv==='s'?'#3B6D11':bv==='a'?'#0C447C':'#A32D2D') : 'var(--color-text-secondary)',
                      }}>{bv!.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
        {[['#639922','S — dentro do esperado'],['#378ADD','A — acima'],['#E24B4A','R — necessita reforço']].map(([cor,l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, display: 'inline-block' }} />{l}
          </span>
        ))}
      </div>

      <button style={{ width: '100%', padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#1D9E75', color: 'white', fontWeight: 500, fontSize: 13 }} onClick={() => alert('Avaliações guardadas!')}>
        Guardar avaliações
      </button>
    </div>
  );
}

