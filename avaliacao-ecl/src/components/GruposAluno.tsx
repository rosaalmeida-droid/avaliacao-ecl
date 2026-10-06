// ============================================================
// Grupos — o lado do aluno
// ============================================================
// O professor faz os grupos no plano (Rosa, 6/out/2026): o aluno já não
// cria nem escolhe grupo. Vê o seu grupo na comanda, por cima da aula
// (AulaDoAluno.tsx), desde que abre a aplicação. No fim da autoavaliação,
// avalia os colegas do grupo — só o professor vê, e não conta para nota.
// ============================================================
import React, { useState } from 'react';
import type { Aluno, PlanoAula } from '../types';
import {
  grupoDoAluno, guardarAvaliacaoPar, getAvaliacoesPares, getAlunos, podemAvaliarSe,
} from '../backend';

const V = '#6B3FA0';
const cartao: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 18, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const botao = (cor?: string): React.CSSProperties => ({ minHeight: 48, padding: '11px 16px', borderRadius: 12, fontSize: 15.5, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit', border: cor ? 'none' : `1.5px solid ${V}`, background: cor || '#fff', color: cor ? '#fff' : V });

export function configGrupos(plano: PlanoAula): { ativo: boolean; tamanho: number } {
  const g = (plano as any).gruposAlunos;
  return { ativo: !!g?.ativo, tamanho: Number(g?.tamanho) || 4 };
}

const nomeDe = (id: string) => { const a = getAlunos().find(x => x.id === id); return a?.nome || `Aluno nº ${a?.numero ?? '?'}`; };

// ── Avaliar os colegas do grupo ─────────────────────────────────
const PERGUNTAS: { chave: 'colabora' | 'ouve' | 'flexivel' | 'conflito'; texto: string; opcoes: [string, string, string] }[] = [
  { chave: 'colabora', texto: 'Colaborou com o grupo?', opcoes: ['Pouco', 'Às vezes', 'Muito'] },
  { chave: 'ouve', texto: 'Ouviu os outros?', opcoes: ['Pouco', 'Às vezes', 'Muito'] },
  { chave: 'flexivel', texto: 'Aceitou outras ideias (foi flexível)?', opcoes: ['Pouco', 'Às vezes', 'Muito'] },
  { chave: 'conflito', texto: 'Nos problemas do grupo…', opcoes: ['Criou conflitos', 'Nem uma coisa nem outra', 'Ajudou a resolver'] },
];

export function AvaliarColegas({ aluno, plano }: { aluno: Aluno; plano: PlanoAula }) {
  const meu = grupoDoAluno(plano.id, aluno.id);
  // Os alunos de teste ficam fora da avaliação dos colegas verdadeiros.
  const colegas = (meu?.membros || []).filter(m => m.alunoId !== aluno.id && podemAvaliarSe(aluno.id, m.alunoId));
  const jaFeitas = new Set(getAvaliacoesPares(plano.id).filter(p => p.avaliadorId === aluno.id).map(p => p.avaliadoId));
  const [i, setI] = useState(() => Math.max(0, colegas.findIndex(c => !jaFeitas.has(c.alunoId))));
  const [resp, setResp] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState('');
  const [fim, setFim] = useState(colegas.length > 0 && colegas.every(c => jaFeitas.has(c.alunoId)));
  if (!meu || !colegas.length) return null;

  if (fim) {
    return (
      <div style={{ ...cartao, background: '#f3eef8' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: V }}>✓ Avaliaste os colegas do grupo</div>
        <div style={{ fontSize: 14, color: '#555', marginTop: 4 }}>Só o professor vê o que respondeste.</div>
      </div>
    );
  }
  const c = colegas[i];
  const completo = PERGUNTAS.every(p => resp[p.chave]);
  function guardar() {
    guardarAvaliacaoPar({ planoAulaId: plano.id, turmaId: plano.turmaId || aluno.turmaId, grupoId: meu!.id, avaliadorId: aluno.id,
      avaliadoId: c.alunoId, nomeAvaliado: c.nomeAluno, colabora: resp.colabora, ouve: resp.ouve, flexivel: resp.flexivel,
      conflito: resp.conflito, comentario: comentario.trim() || undefined });
    setResp({}); setComentario('');
    if (i + 1 < colegas.length) setI(i + 1); else setFim(true);
  }
  return (
    <div style={cartao}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999' }}>
        Os colegas do grupo · {i + 1} de {colegas.length}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: V, margin: '4px 0 2px' }}>{c.nomeAluno || nomeDe(c.alunoId)}</div>
      <div style={{ fontSize: 13.5, color: '#777', marginBottom: 12 }}>Sê justo/a. Só o professor vê — o colega não sabe o que disseste. Não conta para a nota.</div>
      {PERGUNTAS.map(p => (
        <div key={p.chave} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{p.texto}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {p.opcoes.map((o, k) => {
              const v = k + 1, ativo = resp[p.chave] === v;
              return (
                <button key={o} onClick={() => setResp({ ...resp, [p.chave]: v })}
                  style={{ minHeight: 46, padding: '8px 6px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1.5px solid ${ativo ? V : '#ddd'}`, background: ativo ? V : '#fff', color: ativo ? '#fff' : '#444' }}>{o}</button>
              );
            })}
          </div>
        </div>
      ))}
      <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={2} placeholder="Queres dizer mais alguma coisa ao professor? (opcional)"
        style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1.5px solid #ddd', fontSize: 14.5, fontFamily: 'inherit' }} />
      <button disabled={!completo} onClick={guardar} style={{ ...botao(V), width: '100%', marginTop: 10, opacity: completo ? 1 : 0.5 }}>
        {i + 1 < colegas.length ? 'Guardar e seguinte →' : 'Guardar'}
      </button>
    </div>
  );
}

