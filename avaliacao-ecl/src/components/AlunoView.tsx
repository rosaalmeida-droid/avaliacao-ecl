import React, { useState } from 'react';
import { Aluno, PlanoAula, FichaProducao, RequisicaoAula } from '../types';
import {
  getPlanosAulaPorTurma,
  getFichasPorPlano,
  getRequisicaoPorPlano,
  getDistribuicoesPorPlano,
  getChecklistAlunoFicha,
  addOrUpdateChecklistAluno,
  addOrUpdateSelecao,
} from '../backend';
import {
  getCompetenciasPermanentes,
  getCompetenciasContexto,
  EstadoProgressao,
  ESTADO_LABEL,
  ESTADO_COR,
  CompetenciaAtitudinal,
} from '../progressaoAtitudes';

// ── Estilos ───────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--color-background-primary)',
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: 12, padding: '12px 14px', marginBottom: 10,
};
const muted: React.CSSProperties = { color: 'var(--color-text-secondary)', fontSize: 11 };
const btnPrimary = (disabled = false): React.CSSProperties => ({
  width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
  background: disabled ? 'var(--color-background-secondary)' : '#1D9E75',
  color: disabled ? 'var(--color-text-secondary)' : 'white',
  fontWeight: 600, fontSize: 13, marginTop: 6, cursor: disabled ? 'not-allowed' : 'pointer',
});

// ── Fardamento ────────────────────────────────────────────────
const FARD_ITEMS = [
  'Touca', 'Avental limpo', 'Sapatos segurança', 'Farda completa',
  'Sem unhas postiças', 'Sem fones/adornos', 'Mãos limpas', 'Cabelo preso',
];

function getHist(key: string): number {
  try { return parseInt(localStorage.getItem(key) || '0'); } catch { return 0; }
}
function incHist(key: string) {
  try { localStorage.setItem(key, String(getHist(key) + 1)); } catch {}
}

// ── Step bar ──────────────────────────────────────────────────
function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length},1fr)`, borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--color-border-tertiary)', marginBottom: 12 }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          padding: '6px 2px', textAlign: 'center', fontSize: 9,
          borderRight: i < steps.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
          background: i < current ? '#EAF3DE' : i === current ? '#1D9E75' : 'var(--color-background-secondary)',
          color: i < current ? '#3B6D11' : i === current ? 'white' : 'var(--color-text-secondary)',
          fontWeight: i === current ? 600 : 400,
        }}>
          {i < current ? '✓ ' : ''}{s}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISTA PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export function AlunoView({ aluno }: { aluno: Aluno }) {
  const planos = getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado');
  const [planoAtivo, setPlanoAtivo] = useState<PlanoAula | null>(null);

  if (planoAtivo) {
    return <FluxoPlano plano={planoAtivo} aluno={aluno} onVoltar={() => setPlanoAtivo(null)} />;
  }

  return (
    <div>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Olá, {aluno.nome || `Aluno ${aluno.numero}`}!</div>
        <div style={muted}>{aluno.turmaId} · {aluno.ano}º ano</div>
      </div>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Planos de aula disponíveis</div>
        {planos.length === 0 && <div style={muted}>Ainda não existem planos publicados.</div>}
        {planos.map(p => (
          <div key={p.id} onClick={() => setPlanoAtivo(p)} style={{ padding: '10px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.titulo}</div>
            <div style={muted}>{p.data} · {p.horaInicio}-{p.horaFim}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLUXO COMPLETO DO PLANO
// ═══════════════════════════════════════════════════════════════
function FluxoPlano({ plano, aluno, onVoltar }: { plano: PlanoAula; aluno: Aluno; onVoltar: () => void }) {
  const STEPS = ['Entrada', 'Ficha', 'Requisição', 'Avaliação', 'Pares', 'Fim'];
  const [passo, setPasso] = useState(0);

  const fichas = getFichasPorPlano(plano.id);
  const requisicao = getRequisicaoPorPlano(plano.id);
  const distribuicoes = getDistribuicoesPorPlano(plano.id);

  const fichasDoAluno = fichas.filter(f => {
    const dist = distribuicoes.find(d => d.fichaId === f.id);
    if (!dist) return true;
    if (dist.modo === 'todos') return true;
    return dist.alunosIds.includes(aluno.id) || dist.grupos.some(g => g.alunosIds.includes(aluno.id));
  });

  const [fichaAtiva, setFichaAtiva] = useState<FichaProducao | null>(fichasDoAluno[0] || null);

  // Estado da entrada
  const [pontVal, setPontVal] = useState<'sim' | 'atras' | null>(null);
  const [pontHora, setPontHora] = useState('');
  const [pontMins, setPontMins] = useState(0);
  const [fardState, setFardState] = useState<Record<string, boolean | null>>(
    Object.fromEntries(FARD_ITEMS.map(f => [f, null]))
  );

  const histAtrasos = getHist(`ecl_atrasos_${aluno.id}`);
  const fardCompleto = Object.values(fardState).every(v => v !== null);
  const entradaOk = pontVal !== null && fardCompleto;

  function setPont(v: 'sim' | 'atras') {
    setPontVal(v);
    const now = new Date();
    const hora = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    setPontHora(hora);
    if (v === 'atras') {
      const [h, m] = plano.horaInicio.split(':').map(Number);
      const diff = (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m);
      setPontMins(Math.max(1, diff));
    }
  }

  function toggleFard(item: string) {
    setFardState(prev => {
      const v = prev[item];
      return { ...prev, [item]: v === null ? true : v === true ? false : null };
    });
  }

  function confirmarEntrada() {
    if (pontVal === 'atras') incHist(`ecl_atrasos_${aluno.id}`);
    FARD_ITEMS.forEach(item => { if (fardState[item] === false) incHist(`ecl_fard_${aluno.id}_${item}`); });
    setPasso(1);
  }

  return (
    <div>
      <StepBar steps={STEPS} current={passo} />

      {/* PASSO 0 — ENTRADA */}
      {passo === 0 && (
        <div>
          <div style={{ ...card, background: '#085041', color: 'white' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{plano.titulo}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{plano.data} · {plano.horaInicio}-{plano.horaFim}</div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Pontualidade</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['sim', 'atras'] as const).map(v => (
                <button key={v} onClick={() => setPont(v)} style={{
                  flex: 1, padding: '12px 6px', borderRadius: 10, fontSize: 12, cursor: 'pointer', textAlign: 'center',
                  border: '0.5px solid var(--color-border-tertiary)',
                  background: pontVal === v ? (v === 'sim' ? '#EAF3DE' : '#FAEEDA') : 'var(--color-background-secondary)',
                  color: pontVal === v ? (v === 'sim' ? '#27500A' : '#854F0B') : 'var(--color-text-secondary)',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{v === 'sim' ? '✓' : '◷'}</div>
                  {v === 'sim' ? 'Cheguei a horas' : 'Cheguei atrasado/a'}
                </button>
              ))}
            </div>
            {pontHora && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: pontVal === 'sim' ? '#EAF3DE' : '#FAEEDA', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: pontVal === 'sim' ? '#3B6D11' : '#854F0B' }}>Registado automaticamente — não editável</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: pontVal === 'sim' ? '#3B6D11' : '#854F0B' }}>{pontHora}</div>
                {pontVal === 'atras' && pontMins > 0 && (
                  <div style={{ fontSize: 11, background: '#FCEBEB', color: '#A32D2D', borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginTop: 4 }}>{pontMins} min de atraso</div>
                )}
              </div>
            )}
            {pontVal === 'atras' && histAtrasos + 1 >= 3 && (
              <div style={{ marginTop: 8, padding: '9px 10px', background: histAtrasos + 1 >= 4 ? '#FCEBEB' : '#FAEEDA', border: `0.5px solid ${histAtrasos + 1 >= 4 ? '#F7C1C1' : '#FAC775'}`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: histAtrasos + 1 >= 4 ? '#A32D2D' : '#854F0B' }}>{histAtrasos + 1}ª vez atrasado/a</div>
                <div style={{ fontSize: 10, color: histAtrasos + 1 >= 4 ? '#791F1F' : '#633806', marginTop: 2 }}>
                  {histAtrasos + 1 >= 4 ? 'O professor foi alertado. A reincidência pode afetar a tua avaliação.' : 'O professor está a ser informado. A pontualidade é avaliada.'}
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Fardamento e higiene pessoal</div>
            <div style={muted}>Confirma cada item honestamente.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 8 }}>
              {FARD_ITEMS.map(item => {
                const v = fardState[item];
                const histItem = getHist(`ecl_fard_${aluno.id}_${item}`);
                const novoHist = v === false ? histItem + 1 : histItem;
                return (
                  <div key={item} onClick={() => toggleFard(item)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 11,
                    border: '0.5px solid var(--color-border-tertiary)',
                    background: v === true ? '#EAF3DE' : v === false ? '#FCEBEB' : 'var(--color-background-secondary)',
                    color: v === true ? '#27500A' : v === false ? '#791F1F' : 'var(--color-text-secondary)',
                  }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: v === true ? '#639922' : v === false ? '#E24B4A' : 'var(--color-border-secondary)' }} />
                    <span style={{ flex: 1 }}>{item}</span>
                    {v === false && novoHist > 0 && <span style={{ fontSize: 9, background: '#FCEBEB', color: '#A32D2D', borderRadius: 10, padding: '1px 5px' }}>{novoHist}x</span>}
                  </div>
                );
              })}
            </div>
            {FARD_ITEMS.filter(item => fardState[item] === false && getHist(`ecl_fard_${aluno.id}_${item}`) + 1 >= 3).map(item => {
              const total = getHist(`ecl_fard_${aluno.id}_${item}`) + 1;
              return (
                <div key={item} style={{ marginTop: 6, padding: '7px 9px', background: total >= 4 ? '#FCEBEB' : '#FAEEDA', border: `0.5px solid ${total >= 4 ? '#F7C1C1' : '#FAC775'}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: total >= 4 ? '#A32D2D' : '#854F0B' }}>{total}ª vez sem {item.toLowerCase()}</div>
                  <div style={{ fontSize: 10, color: total >= 4 ? '#791F1F' : '#633806', marginTop: 1 }}>{total >= 4 ? 'O professor foi alertado.' : 'O professor está a ser informado.'}</div>
                </div>
              );
            })}
          </div>

          <button style={btnPrimary(!entradaOk)} disabled={!entradaOk} onClick={confirmarEntrada}>Continuar →</button>
          <button style={{ ...btnPrimary(), background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onVoltar}>← Voltar</button>
        </div>
      )}

      {/* PASSO 1 — FICHA */}
      {passo === 1 && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Fichas de Produção atribuídas</div>
            {fichasDoAluno.length === 0 && <div style={muted}>Não tens fichas atribuídas neste plano.</div>}
            {fichasDoAluno.map(f => (
              <div key={f.id} onClick={() => setFichaAtiva(f)} style={{
                padding: 10, borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', marginBottom: 6,
                background: fichaAtiva?.id === f.id ? '#EAF3DE' : 'var(--color-background-primary)', cursor: 'pointer',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.nomePrato || 'Ficha sem nome'}</div>
                <div style={muted}>{f.classificacao || 'Sem classificação'} · {f.numPorcoes} porções</div>
              </div>
            ))}
          </div>
          {fichaAtiva && <FichaAluno ficha={fichaAtiva} plano={plano} aluno={aluno} onNext={() => setPasso(2)} onBack={() => setPasso(0)} />}
          {!fichaAtiva && <button style={btnPrimary()} onClick={() => setPasso(0)}>← Voltar</button>}
        </div>
      )}

      {/* PASSO 2 — REQUISIÇÃO */}
      {passo === 2 && (
        <RequisicaoAluno requisicao={requisicao} onNext={() => setPasso(3)} onBack={() => setPasso(1)} />
      )}

      {/* PASSO 3 — AVALIAÇÃO */}
      {passo === 3 && fichaAtiva && (
        <AvaliacaoAluno ficha={fichaAtiva} plano={plano} aluno={aluno} onBack={() => setPasso(2)} onFinish={() => setPasso(4)} />
      )}

      {/* PASSO 4 — PARES */}
      {passo === 4 && fichaAtiva && (
        <AvaliacaoPares plano={plano} aluno={aluno} fichasDoAluno={fichasDoAluno} onBack={() => setPasso(3)} onFinish={() => setPasso(5)} />
      )}

      {/* PASSO 5 — FIM */}
      {passo === 5 && (
        <div>
          <div style={{ ...card, textAlign: 'center', padding: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 20, color: '#3B6D11' }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Avaliação completa!</div>
            <div style={muted}>O professor irá validar.</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Registo desta aula</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <span style={muted}>Pontualidade</span>
              <span style={{ fontWeight: 600, color: pontVal === 'sim' ? '#639922' : '#854F0B' }}>{pontVal === 'sim' ? 'A horas' : `Atrasado/a ${pontMins} min`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <span style={muted}>Fardamento</span>
              <span style={{ fontWeight: 600, color: Object.values(fardState).every(v => v === true) ? '#639922' : '#854F0B' }}>
                {Object.values(fardState).every(v => v === true) ? 'Completo' : 'Incompleto'}
              </span>
            </div>
          </div>
          <button style={btnPrimary()} onClick={onVoltar}>Voltar ao início</button>
        </div>
      )}
    </div>
  );
}

// ── Ficha para o aluno ────────────────────────────────────────
function FichaAluno({ ficha, plano, aluno, onNext, onBack }: { ficha: FichaProducao; plano: PlanoAula; aluno: Aluno; onNext: () => void; onBack: () => void }) {
  const existente = getChecklistAlunoFicha(plano.id, ficha.id, aluno.id);
  const [ingredientesConfirmados, setIngredientesConfirmados] = useState<string[]>(existente?.ingredientesConfirmados || []);
  const [passosConcluidos, setPassosConcluidos] = useState<string[]>(existente?.passosConcluidos || []);
  const [haccpConfirmado, setHaccpConfirmado] = useState<string[]>(existente?.haccpConfirmado || []);
  const [comentario, setComentario] = useState(existente?.comentario || '');

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }

  function continuar() {
    addOrUpdateChecklistAluno({
      id: existente?.id || `check_${plano.id}_${ficha.id}_${aluno.id}`,
      planoAulaId: plano.id, fichaId: ficha.id, alunoId: aluno.id,
      ingredientesConfirmados, passosConcluidos, haccpConfirmado,
      requisicaoVerificada: false, comentario,
      atualizadoEm: new Date().toISOString(),
    });
    onNext();
  }

  return (
    <div>
      <div style={{ ...card, background: '#085041', color: 'white' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{ficha.nomePrato || 'Ficha de Produção'}</div>
        <div style={{ fontSize: 11, opacity: 0.85 }}>{ficha.classificacao} · {ficha.numPorcoes} porções</div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ingredientes</div>
        {ficha.ingredientes.map(ing => (
          <label key={ing.id} style={{ display: 'block', padding: 8, borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', marginBottom: 5, background: ingredientesConfirmados.includes(ing.id) ? '#EAF3DE' : 'var(--color-background-primary)' }}>
            <input type="checkbox" checked={ingredientesConfirmados.includes(ing.id)} onChange={() => toggle(ingredientesConfirmados, setIngredientesConfirmados, ing.id)} />{' '}
            {ing.qt} {ing.un} {ing.produto}
          </label>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Passos da produção</div>
        {ficha.preparacao.map(p => (
          <label key={p.id} style={{ display: 'block', padding: 8, borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', marginBottom: 5, background: passosConcluidos.includes(p.id) ? '#EAF3DE' : 'var(--color-background-primary)' }}>
            <input type="checkbox" checked={passosConcluidos.includes(p.id)} onChange={() => toggle(passosConcluidos, setPassosConcluidos, p.id)} />{' '}
            <strong>{p.num}.</strong> {p.descricao}
            {(p.temperatura || p.tempo) && <div style={muted}>{p.temperatura} {p.tempo}</div>}
          </label>
        ))}
      </div>

      {ficha.preparacao.filter(p => p.haccp).length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Pontos HACCP</div>
          {ficha.preparacao.filter(p => p.haccp).map(p => (
            <label key={p.id} style={{ display: 'block', padding: 8, borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', marginBottom: 5, background: haccpConfirmado.includes(p.id) ? '#EAF3DE' : '#FFF8F0' }}>
              <input type="checkbox" checked={haccpConfirmado.includes(p.id)} onChange={() => toggle(haccpConfirmado, setHaccpConfirmado, p.id)} />{' '}
              ⚠️ {p.haccp}
            </label>
          ))}
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Observação (opcional)</div>
        <textarea style={{ width: '100%', minHeight: 60, borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', padding: 8, fontSize: 12 }}
          value={comentario} onChange={e => setComentario(e.target.value)}
          placeholder="Ex: ingrediente em falta, substituição feita, dúvida..." />
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ ...btnPrimary(), flex: 0, padding: '10px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onBack}>←</button>
        <button style={{ ...btnPrimary(), flex: 1, marginTop: 0 }} onClick={continuar}>Guardar e continuar →</button>
      </div>
    </div>
  );
}

// ── Requisição para o aluno ───────────────────────────────────
function RequisicaoAluno({ requisicao, onNext, onBack }: { requisicao?: RequisicaoAula; onNext: () => void; onBack: () => void }) {
  return (
    <div>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Requisição da aula</div>
        {!requisicao && <div style={muted}>A requisição ainda não está disponível.</div>}
        {requisicao && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {requisicao.linhas.map(l => (
                <tr key={l.id}>
                  <td style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', padding: 6 }}>{l.produto}</td>
                  <td style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', padding: 6, textAlign: 'right' }}>{l.quantidadeTotal} {l.unidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ ...btnPrimary(), flex: 0, padding: '10px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onBack}>←</button>
        <button style={{ ...btnPrimary(), flex: 1, marginTop: 0 }} onClick={onNext}>Continuar →</button>
      </div>
    </div>
  );
}

// ── Avaliação atitudinal ──────────────────────────────────────
function AvaliacaoAluno({ ficha, plano, aluno, onBack, onFinish }: { ficha: FichaProducao; plano: PlanoAula; aluno: Aluno; onBack: () => void; onFinish: () => void }) {
  const distribuicoes = getDistribuicoesPorPlano(plano.id);
  const dist = distribuicoes.find(d => d.fichaId === ficha.id);
  const contexto = dist?.modo === 'individual' ? 'individual' : dist?.tipoServico && dist.tipoServico !== 'normal' ? 'servico' : 'equipa';

  const permanentes = getCompetenciasPermanentes().slice(0, 4);
  const contextuais = getCompetenciasContexto(contexto as any).slice(0, 4);
  const todasComps = [...permanentes, ...contextuais].filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i).slice(0, 8);

  type Nivel = EstadoProgressao | null;
  const [niveis, setNiveis] = useState<Record<string, Nivel>>(Object.fromEntries(todasComps.map(c => [c.id, null])));
  const [aberta, setAberta] = useState<string | null>(todasComps[0]?.id || null);

  const feitas = todasComps.filter(c => niveis[c.id] !== null).length;
  const avaliacaoOk = feitas === todasComps.length;

  function setNivel(id: string, v: Nivel) {
    setNiveis(p => ({ ...p, [id]: p[id] === v ? null : v }));
    const idx = todasComps.findIndex(c => c.id === id);
    if (idx < todasComps.length - 1) setTimeout(() => setAberta(todasComps[idx + 1].id), 200);
    else setAberta(null);
  }

  function guardar() {
    addOrUpdateSelecao({
      id: `${plano.id}_${ficha.id}_${aluno.id}`,
      comandaId: dist?.id || `${plano.id}_${ficha.id}`,
      planoAulaId: plano.id, fichaId: ficha.id, alunoId: aluno.id, turmaId: aluno.turmaId,
      tecnicas: ficha.tecnicasSugeridas || [],
      atitudes: todasComps.map(c => c.id),
      responsabilidades: [],
      autoavaliacoes: todasComps.map(c => ({
        competenciaId: c.id,
        nivel: niveis[c.id] === 'avancado' ? 'superei' : niveis[c.id] === 'consolidado' ? 'atingi' : niveis[c.id] === 'em_desenvolvimento' ? 'desenvolvimento' : 'nao_atingi',
      })),
      criadaEm: new Date().toISOString(),
    });
    onFinish();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={muted}>Avalia todas as competências</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1D9E75' }}>{feitas}/{todasComps.length}</span>
      </div>
      {todasComps.map(c => (
        <CompCard key={c.id} comp={c} nivel={niveis[c.id]} aberta={aberta === c.id}
          onToggle={() => setAberta(aberta === c.id ? null : c.id)}
          onNivel={v => setNivel(c.id, v)} />
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button style={{ ...btnPrimary(), flex: 0, padding: '10px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onBack}>←</button>
        <button style={{ ...btnPrimary(!avaliacaoOk), flex: 1, marginTop: 0 }} disabled={!avaliacaoOk} onClick={guardar}>Continuar →</button>
      </div>
    </div>
  );
}

// ── Avaliação entre pares ─────────────────────────────────────
function AvaliacaoPares({ plano, aluno, fichasDoAluno, onBack, onFinish }: { plano: PlanoAula; aluno: Aluno; fichasDoAluno: FichaProducao[]; onBack: () => void; onFinish: () => void }) {
  const distribuicoes = getDistribuicoesPorPlano(plano.id);

  // Encontrar colegas do mesmo grupo
  const colegas: { id: string; label: string }[] = [];
  fichasDoAluno.forEach(f => {
    const dist = distribuicoes.find(d => d.fichaId === f.id);
    if (dist) {
      dist.grupos.forEach(g => {
        if (g.alunosIds.includes(aluno.id)) {
          g.alunosIds.filter(id => id !== aluno.id).forEach(id => {
            if (!colegas.find(c => c.id === id)) colegas.push({ id, label: id.split('-').pop() || id });
          });
        }
      });
    }
  });

  type ParNivel = 's' | 'a' | 'r' | null;
  const [paresState, setParesState] = useState<Record<string, { coop: ParNivel; emp: ParNivel }>>(
    Object.fromEntries(colegas.map(c => [c.id, { coop: null, emp: null }]))
  );

  const paresCompletos = colegas.length === 0 || colegas.every(c => paresState[c.id].coop && paresState[c.id].emp);

  function setPar(id: string, campo: 'coop' | 'emp', v: ParNivel) {
    setParesState(prev => ({ ...prev, [id]: { ...prev[id], [campo]: prev[id][campo] === v ? null : v } }));
  }

  const PAR_BTNS: { v: ParNivel; label: string; bg: string; border: string; color: string }[] = [
    { v: 's', label: 'Dentro', bg: '#EAF3DE', border: '#639922', color: '#27500A' },
    { v: 'a', label: 'Acima', bg: '#E6F1FB', border: '#378ADD', color: '#0C447C' },
    { v: 'r', label: 'Precisa melhorar', bg: '#FCEBEB', border: '#E24B4A', color: '#791F1F' },
  ];

  return (
    <div>
      <div style={{ ...card, marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Avaliação dos colegas</div>
        <div style={muted}>Confidencial — o colega não vê o que escreveste.</div>
      </div>

      {colegas.length === 0 && (
        <div style={card}><div style={muted}>Aula individual — sem colegas para avaliar.</div></div>
      )}

      {colegas.map(c => (
        <div key={c.id} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#085041' }}>{c.label}</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Aluno {c.label}</span>
            {paresState[c.id].coop && paresState[c.id].emp && <span style={{ marginLeft: 'auto', fontSize: 10, background: '#EAF3DE', color: '#3B6D11', padding: '2px 8px', borderRadius: 20 }}>✓ completo</span>}
          </div>
          {[{ campo: 'coop' as const, nome: 'Cooperação', hint: '"Ajudou quando foi preciso?"' }, { campo: 'emp' as const, nome: 'Empenho e persistência', hint: '"Trabalhou de verdade durante toda a aula?"' }].map(({ campo, nome, hint }) => (
            <div key={campo} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{nome}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: 5 }}>{hint}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                {PAR_BTNS.map(btn => {
                  const atual = paresState[c.id][campo];
                  return (
                    <button key={String(btn.v)} onClick={() => setPar(c.id, campo, btn.v)} style={{
                      padding: '6px 3px', borderRadius: 6, fontSize: 10, cursor: 'pointer', textAlign: 'center', lineHeight: 1.3,
                      border: `0.5px solid ${atual === btn.v ? btn.border : 'var(--color-border-tertiary)'}`,
                      background: atual === btn.v ? btn.bg : 'var(--color-background-primary)',
                      color: atual === btn.v ? btn.color : 'var(--color-text-secondary)',
                      fontWeight: atual === btn.v ? 600 : 400,
                    }}>{btn.label}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ ...btnPrimary(), flex: 0, padding: '10px 12px', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }} onClick={onBack}>←</button>
        <button style={{ ...btnPrimary(!paresCompletos), flex: 1, marginTop: 0 }} disabled={!paresCompletos} onClick={onFinish}>Submeter avaliação →</button>
      </div>
    </div>
  );
}

// ── CompCard ──────────────────────────────────────────────────
type Nivel = EstadoProgressao | null;

function CompCard({ comp, nivel, aberta, onToggle, onNivel }: { comp: CompetenciaAtitudinal; nivel: Nivel; aberta: boolean; onToggle: () => void; onNivel: (v: Nivel) => void }) {
  return (
    <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{comp.nome}</div>
          {nivel && (
            <div style={{ fontSize: 10, marginTop: 1, color: ESTADO_COR[nivel].color, background: ESTADO_COR[nivel].bg, borderRadius: 20, padding: '1px 7px', display: 'inline-block' }}>
              {ESTADO_LABEL[nivel]}
            </div>
          )}
        </div>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: nivel ? ESTADO_COR[nivel].color : 'var(--color-border-secondary)', flexShrink: 0 }} />
      </div>
      {aberta && (
        <div style={{ padding: '9px 12px', background: 'var(--color-background-secondary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 7 }}>{comp.definicao}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
            <div style={{ background: '#EAF3DE', borderRadius: 6, padding: '5px 7px' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#3B6D11', marginBottom: 2 }}>✓ Observo quando</div>
              {comp.observar.slice(0, 2).map(s => <div key={s} style={{ fontSize: 9, color: '#27500A', lineHeight: 1.4 }}>· {s}</div>)}
            </div>
            <div style={{ background: '#FCEBEB', borderRadius: 6, padding: '5px 7px' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#A32D2D', marginBottom: 2 }}>✗ Sinal de alerta</div>
              {comp.naoObservar.slice(0, 2).map(s => <div key={s} style={{ fontSize: 9, color: '#791F1F', lineHeight: 1.4 }}>· {s}</div>)}
            </div>
          </div>
          <NivelBtns valor={nivel} onChange={onNivel} comp={comp} />
        </div>
      )}
    </div>
  );
}

function NivelBtns({ valor, onChange, comp }: { valor: Nivel; onChange: (v: Nivel) => void; comp?: CompetenciaAtitudinal }) {
  const estados: EstadoProgressao[] = ['inicial', 'em_desenvolvimento', 'consolidado', 'avancado'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3 }}>
      {estados.map(e => (
        <button key={e} onClick={() => onChange(valor === e ? null : e)} style={{
          padding: '5px 3px', borderRadius: 6, fontSize: 9, cursor: 'pointer', textAlign: 'center', lineHeight: 1.3,
          border: `0.5px solid ${valor === e ? ESTADO_COR[e].color : 'var(--color-border-tertiary)'}`,
          background: valor === e ? ESTADO_COR[e].bg : 'var(--color-background-primary)',
          color: valor === e ? ESTADO_COR[e].color : 'var(--color-text-secondary)',
          fontWeight: valor === e ? 600 : 400,
        }}>
          {ESTADO_LABEL[e]}
          {comp && <div style={{ fontSize: 8, lineHeight: 1.2, marginTop: 2, opacity: 0.85 }}>{comp.descritores[e].substring(0, 28)}…</div>}
        </button>
      ))}
    </div>
  );
}

