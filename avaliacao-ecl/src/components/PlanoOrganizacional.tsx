// ════════════════════════════════════════════════════════════
// PLANO ORGANIZACIONAL DA AULA — o que cada aluno vê e o professor gere
// ════════════════════════════════════════════════════════════
// · QuadroOrganizacional: todas as funções e quem as faz. Todos o veem
//   (o líder precisa dele para verificar). O professor distribui, volta a
//   sortear antes da aula e substitui quem falta.
// · CartaoMinhaFuncao: a primeira coisa que o aluno vê ao abrir a aula.
// · PassoMinhaFuncao: no início (antes de produzir) e no fim (antes da
//   autoavaliação), a lista do que tem de fazer, para não se esquecer de
//   nada, com o sítio do KitchenFlow onde regista.
import React, { useState } from 'react';
import type { PlanoAula } from '../types';
import { getSessaoAula, guardarColaboracao, colaboracoesDaAula } from '../backend';
import {
  organizacaoDe, quadroDaAula, funcoesDoAluno, lugaresDoAluno, distribuirFuncoes, substituirAluno,
  candidatos, entraramNaAula, nomeDoAluno, alunosDaTurma, TAREFA_DE_TODOS, KF_TAREFA_DE_TODOS,
  REGISTAR_QUANDO_DETETAS, type FuncaoAula,
} from '../organizacaoAula';
import { NavSlides } from './EcraCheio';

const V = '#6B3FA0';
const VS = '#F0EBF7';

// ── Quadro (todos veem) ─────────────────────────────────────

export function QuadroOrganizacional({ plano, alunoId, modo, onPlanoMudou }: {
  plano: PlanoAula;
  /** O aluno que está a ver: a sua linha fica destacada. */
  alunoId?: string;
  modo: 'aluno' | 'professor';
  onPlanoMudou?: (p: PlanoAula) => void;
}) {
  const o = organizacaoDe(plano);
  const aberta = !!getSessaoAula(plano.id)?.abertaEm;
  const entraram = entraramNaAula(plano.id);
  // O professor escolhe o substituto: a aplicação propõe e ele vai carregando em «Outro».
  const [aSubstituir, setASubstituir] = useState<{ chave: string; i: number } | null>(null);

  if (!o) {
    if (modo === 'aluno') return (
      <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.65)', lineHeight: 1.5 }}>
        O professor ainda não distribuiu as funções desta aula.
      </div>
    );
    return (
      <div>
        <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.65)', lineHeight: 1.5, marginBottom: 10 }}>
          Cada aluno fica com uma função nesta aula. A aplicação dá cada função a quem a fez menos vezes.
        </div>
        <button onClick={() => onPlanoMudou?.(distribuirFuncoes(plano))} style={botaoPrincipal}>
          Distribuir as funções
        </button>
      </div>
    );
  }

  const estadoAluno = (id: string) => {
    if (!aberta) return null;
    return entraram.has(id) ? { t: 'entrou', cor: '#3E7A31' } : { t: 'ainda não entrou', cor: '#B5651D' };
  };

  return (
    <div>
      {modo === 'professor' && !aberta && (
        <button onClick={() => {
            if (window.confirm('Sortear as funções outra vez? Os alunos passam a ver a nova distribuição.'))
              onPlanoMudou?.(distribuirFuncoes(plano));
          }}
          style={{ ...botaoSecundario, marginBottom: 10 }}>
          Sortear outra vez
        </button>
      )}
      {modo === 'professor' && !aberta && (
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 8, lineHeight: 1.5 }}>
          Quem faltar substitui-se com a aula aberta, quando já sabes quem está.
        </div>
      )}
      <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', marginBottom: 8, lineHeight: 1.5 }}>
        <b>Todos:</b> {TAREFA_DE_TODOS.charAt(0).toLowerCase() + TAREFA_DE_TODOS.slice(1)}
      </div>
      {quadroDaAula(o).map(({ funcao, lugares }) => (
        <div key={funcao.id} style={{ background: '#fff', border: `1px solid ${funcao.id === 'lider' ? V : '#E4E1E8'}`,
          borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: funcao.id === 'lider' ? V : '#1A1A1A' }}>{funcao.nome}</div>
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', lineHeight: 1.45, margin: '2px 0 6px' }}>{funcao.resumo}</div>
          {lugares.map(l => {
            const eu = l.alunoId === alunoId;
            const est = modo === 'professor' ? estadoAluno(l.alunoId) : null;
            const escolhendo = aSubstituir?.chave === l.chave;
            const lista = escolhendo ? candidatos(plano, l.chave) : [];
            const proposto = escolhendo ? lista[aSubstituir!.i % Math.max(lista.length, 1)] : undefined;
            return (
              <div key={l.chave} style={{ padding: '6px 0', borderTop: '1px solid #F1EEF4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: eu ? 800 : 600, color: eu ? V : '#1A1A1A' }}>
                    {nomeDoAluno(l.alunoId)}{eu ? ' (tu)' : ''}
                  </span>
                  {l.substituiu && (
                    <span style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>substitui {nomeDoAluno(l.substituiu)}</span>
                  )}
                  {est && <span style={{ fontSize: 12.5, fontWeight: 700, color: est.cor }}>{est.t}</span>}
                  {/* Só com a aula a decorrer: é quando se sabe quem está. */}
                  {modo === 'professor' && aberta && !escolhendo && (
                    <button onClick={() => setASubstituir({ chave: l.chave, i: 0 })}
                      style={{ marginLeft: 'auto', ...botaoPequeno }}>Substituir</button>
                  )}
                </div>
                {escolhendo && (
                  <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 10, background: VS }}>
                    {proposto ? (
                      <>
                        <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>
                          Passa para <b>{nomeDoAluno(proposto)}</b> (está na aula)
                          {lugaresDoAluno(o, proposto).length > 0 && (
                            <> · fica também com: {funcoesDoAluno(o, proposto).map(f => f.nome).join(', ')}</>
                          )}
                        </div>
                        {funcao.id === 'lider' && lugaresDoAluno(o, proposto).length > 0 && (
                          <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
                            O líder não acumula: a função dele passa para outro colega.
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => { onPlanoMudou?.(substituirAluno(plano, l.chave, proposto)); setASubstituir(null); }}
                            style={botaoPequenoCheio}>Confirmar</button>
                          <button onClick={() => setASubstituir({ chave: l.chave, i: aSubstituir!.i + 1 })}
                            style={botaoPequeno}>Outro →</button>
                          <button onClick={() => setASubstituir(null)} style={botaoPequeno}>Cancelar</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13.5 }}>Não há mais ninguém na aula que possa ficar com esta função.
                        <button onClick={() => setASubstituir(null)} style={{ ...botaoPequeno, marginLeft: 8 }}>Fechar</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {(() => {
        const comFuncao = new Set(o.lugares.map(l => l.alunoId));
        const sem = alunosDaTurma(plano.turmaId).filter(a => !comFuncao.has(a));
        if (!sem.length) return null;
        const ajudas = new Map(colaboracoesDaAula(plano.id).map(c => [c.alunoId, c.texto]));
        return (
          <div style={{ background: '#fff', border: '1px dashed #CFC6DB', borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>Sem função hoje</div>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', lineHeight: 1.45, margin: '2px 0 6px' }}>
              Podem colaborar e ajudar os colegas, e dizer na aplicação o que fizeram.
            </div>
            {sem.map(a => (
              <div key={a} style={{ padding: '5px 0', borderTop: '1px solid #F1EEF4', fontSize: 14.5,
                fontWeight: a === alunoId ? 800 : 600, color: a === alunoId ? V : '#1A1A1A' }}>
                {nomeDoAluno(a)}{a === alunoId ? ' (tu)' : ''}
                {modo === 'professor' && aberta && (
                  <span style={{ fontSize: 12.5, fontWeight: 700, marginLeft: 8,
                    color: entraram.has(a) ? '#3E7A31' : '#B5651D' }}>{entraram.has(a) ? 'entrou' : 'ainda não entrou'}</span>
                )}
                {modo === 'professor' && ajudas.get(a) && (
                  <div style={{ fontSize: 13, fontWeight: 400, fontStyle: 'italic', color: 'rgba(26,23,20,0.7)' }}>
                    Ajudou: «{ajudas.get(a)}»</div>
                )}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ── Cartão «A tua função hoje» (a primeira coisa na aula) ───

export function CartaoMinhaFuncao({ plano, alunoId, onVerQuadro }: {
  plano: PlanoAula; alunoId: string; onVerQuadro: () => void;
}) {
  const o = organizacaoDe(plano);
  if (!o) return null;
  const funcoes = funcoesDoAluno(o, alunoId);
  const substitui = lugaresDoAluno(o, alunoId).filter(l => l.substituiu && l.substituiu !== alunoId);
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '16px 17px', marginBottom: 12,
      border: `2px solid ${V}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: V }}>
        A tua função hoje
      </div>
      {funcoes.length === 0 ? (
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6, lineHeight: 1.4 }}>
          Hoje não tens nenhuma função, mas podes colaborar e ajudar os colegas.
        </div>
      ) : funcoes.map(f => (
        <div key={f.id} style={{ marginTop: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.25 }}>{f.nome}</div>
          <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.7)', lineHeight: 1.5, marginTop: 2 }}>{f.resumo}</div>
        </div>
      ))}
      {substitui.length > 0 && (
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: '#FDF0E8', color: '#8A4E15',
          fontSize: 14, lineHeight: 1.45 }}>
          Hoje substituis {[...new Set(substitui.map(l => nomeDoAluno(l.substituiu!)))].join(' e ')}.
        </div>
      )}
      {!funcoes.some(f => f.id === 'lider') && (
        <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.6)', marginTop: 8, lineHeight: 1.45 }}>
          E, como todos: {TAREFA_DE_TODOS.charAt(0).toLowerCase() + TAREFA_DE_TODOS.slice(1)}
        </div>
      )}
      <button onClick={onVerQuadro} style={{ ...botaoSecundario, marginTop: 12 }}>
        Ver o plano organizacional (quem faz o quê)
      </button>
    </div>
  );
}

// ── Passo «A minha função» (início e fim) ───────────────────

/** A lista de verificação do aluno num momento da aula. */
export function itensDaFuncao(funcoes: FuncaoAula[], momento: 'inicio' | 'fim', comBancada: boolean): { id: string; texto: string; kf?: boolean }[] {
  const itens: { id: string; texto: string; kf?: boolean }[] = [];
  for (const f of funcoes) {
    (momento === 'inicio' ? f.inicio : f.fim).forEach((t, i) => itens.push({ id: `${f.id}-${momento}-${i}`, texto: t }));
    const kf = momento === 'inicio' ? f.kfInicio : f.kfFim;
    if (kf) itens.push({ id: `${f.id}-${momento}-kf`, texto: `Registei no KitchenFlow: ${kf}.`, kf: true });
  }
  if (momento === 'fim' && comBancada) {
    itens.push({ id: `todos-fim-0`, texto: TAREFA_DE_TODOS });
    itens.push({ id: `todos-fim-kf`, texto: `Registei no KitchenFlow: ${KF_TAREFA_DE_TODOS}.`, kf: true });
  }
  return itens;
}

export function PassoMinhaFuncao({ plano, alunoId, momento, onConcluido, onAbrirKitchenFlow, onVerQuadro }: {
  plano: PlanoAula; alunoId: string; momento: 'inicio' | 'fim';
  onConcluido: () => void; onAbrirKitchenFlow: () => void; onVerQuadro: () => void;
}) {
  const o = organizacaoDe(plano);
  const funcoes = funcoesDoAluno(o, alunoId);
  const lider = funcoes.some(f => f.id === 'lider');
  const itens = itensDaFuncao(funcoes, momento, !lider);
  const chave = `ecl_funcao_${plano.id}_${alunoId}_${momento}`;
  const [feitos, setFeitos] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(chave) || '{}'); } catch { return {}; }
  });
  const marcar = (id: string) => setFeitos(x => {
    const n = { ...x, [id]: !x[id] };
    try { localStorage.setItem(chave, JSON.stringify(n)); } catch { /* */ }
    return n;
  });
  const tudo = itens.length > 0 && itens.every(i => feitos[i.id]);
  const [ajuda, setAjuda] = useState(() => {
    try { return localStorage.getItem(chave + '_ajuda') || ''; } catch { return ''; }
  });

  // Sem função: pode colaborar e dizer como ajudou (não é obrigatório).
  if (funcoes.length === 0) return (
    <div>
      <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>
        Hoje não tens nenhuma função, mas podes colaborar e ajudar os colegas.
      </div>
      {momento === 'fim' ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, margin: '10px 0 6px' }}>Queres registar aqui o que fizeste?</div>
          <textarea value={ajuda} onChange={e => setAjuda(e.target.value)} rows={3} maxLength={300}
            placeholder="Por exemplo: ajudei a arrumar o economato."
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
              border: '1.5px solid #DDD', fontSize: 15, fontFamily: 'inherit', resize: 'vertical', background: '#fff' }} />
          <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.7)', lineHeight: 1.5, marginTop: 10 }}>
            {TAREFA_DE_TODOS} {REGISTAR_QUANDO_DETETAS}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.7)', lineHeight: 1.5 }}>{TAREFA_DE_TODOS}</div>
      )}
      <button onClick={onVerQuadro} style={{ ...botaoSecundario, marginTop: 12 }}>
        Ver o plano organizacional (quem faz o quê)
      </button>
      <NavSlides pode onSeguinte={() => {
          const t = ajuda.trim();
          try { localStorage.setItem(chave + '_ajuda', t); } catch { /* */ }
          if (momento === 'fim' && t) guardarColaboracao(alunoId, plano.turmaId, plano.id, t);
          onConcluido();
        }}
        textoSeguinte={momento === 'fim' && ajuda.trim() ? 'Guardar e continuar' : 'Continuar'} />
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: V }}>
        {momento === 'inicio' ? 'Antes de começar a produzir' : 'Antes de te avaliares'}
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.25, margin: '4px 0 2px' }}>
        {funcoes.map(f => f.nome).join(' + ') || 'A tua função'}
      </div>
      <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.65)', lineHeight: 1.5, marginBottom: 12 }}>
        {momento === 'inicio'
          ? 'Faz isto antes de começares a produzir e marca cada coisa quando estiver feita.'
          : lider
            ? 'Verifica tudo antes de fechares a aula. Marca cada coisa quando estiver feita.'
            : 'A tua função tem de ficar completa antes de te avaliares. Marca cada coisa quando estiver feita.'}
      </div>
      {itens.map(i => (
        <button key={i.id} onClick={() => marcar(i.id)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '12px 14px', marginBottom: 8, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          border: `2px solid ${feitos[i.id] ? V : '#E4E1E8'}`, background: feitos[i.id] ? VS : '#fff',
          fontSize: 15, lineHeight: 1.45, color: '#1A1A1A', fontWeight: i.kf ? 700 : 500 }}>
          <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 1,
            border: `2px solid ${feitos[i.id] ? V : '#CCC'}`, background: feitos[i.id] ? V : 'transparent', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{feitos[i.id] ? '✓' : ''}</span>
          <span>{i.texto}</span>
        </button>
      ))}
      {momento === 'fim' && (
        <div style={{ fontSize: 14, color: '#8A4E15', background: '#FDF0E8', border: '1px solid #E8C9A8', borderRadius: 12,
          padding: '10px 12px', margin: '4px 0 8px', lineHeight: 1.5 }}>{REGISTAR_QUANDO_DETETAS}</div>
      )}
      <button onClick={onAbrirKitchenFlow} style={{ width: '100%', marginTop: 6, background: 'rgba(14,116,144,0.08)',
        border: '1px solid rgba(14,116,144,0.35)', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700,
        color: '#0e7490', cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 }}>
        Abrir o KitchenFlow
      </button>
      <button onClick={onVerQuadro} style={{ ...botaoSecundario, marginTop: 8 }}>
        Ver o plano organizacional (quem faz o quê)
      </button>
      <NavSlides pode={tudo} onSeguinte={onConcluido}
        textoSeguinte={tudo ? (momento === 'inicio' ? 'Feito — começar a produzir' : lider ? 'Aula verificada e fechada' : 'A minha função está completa')
          : 'Marca tudo o que fizeste'} />
    </div>
  );
}

const botaoPrincipal: React.CSSProperties = { width: '100%', minHeight: 50, borderRadius: 12, border: 'none', background: V,
  color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const botaoSecundario: React.CSSProperties = { width: '100%', minHeight: 46, borderRadius: 12, border: `2px solid ${V}`,
  background: '#fff', color: V, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const botaoPequeno: React.CSSProperties = { padding: '6px 10px', borderRadius: 8, border: `1px solid ${V}`, background: '#fff',
  color: V, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const botaoPequenoCheio: React.CSSProperties = { ...botaoPequeno, background: V, color: '#fff' };
