// ============================================================
// Grupos — o lado do aluno
// ============================================================
// Ao entrar na aula, o aluno forma o grupo: cria um ou junta-se a um que
// já exista. O professor valida (ou muda) e dá uma ficha a cada grupo.
// No fim da autoavaliação, o aluno avalia os colegas do grupo — só o
// professor vê, e não conta para nota nenhuma.
// ============================================================
import React, { useEffect, useState } from 'react';
import type { Aluno, PlanoAula } from '../types';
import {
  gruposDaAula, grupoDoAluno, entrarNoGrupo, sincronizarGrupos, guardarAvaliacaoPar, getAvaliacoesPares,
  getAlunos, getFichasProducao,
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
const primeiroNome = (n: string) => String(n || '').trim().split(/\s+/)[0] || 'aluno';

export function PassoGrupo({ aluno, plano, onConcluido }: { aluno: Aluno; plano: PlanoAula; onConcluido: () => void }) {
  const [, redesenhar] = useState(0);
  const [aMudar, setAMudar] = useState(false);
  const { tamanho } = configGrupos(plano);

  useEffect(() => {
    let vivo = true;
    const ver = () => sincronizarGrupos(aluno.turmaId).catch(() => {}).finally(() => { if (vivo) redesenhar(n => n + 1); });
    ver();
    const t = setInterval(ver, 5000);
    return () => { vivo = false; clearInterval(t); };
  }, [aluno.turmaId, plano.id]);

  const grupos = gruposDaAula(plano.id);
  const meu = grupoDoAluno(plano.id, aluno.id);

  function entrar(grupoId: string, grupoNome: string) {
    entrarNoGrupo({ planoAulaId: plano.id, turmaId: plano.turmaId || aluno.turmaId, alunoId: aluno.id,
      nomeAluno: aluno.nome, grupoId, grupoNome, definidoPor: 'aluno' });
    setAMudar(false);
    redesenhar(n => n + 1);
  }

  if (meu && !aMudar) {
    const colegas = meu.membros.filter(m => m.alunoId !== aluno.id);
    const ficha = meu.fichaId ? getFichasProducao().find(f => f.id === meu.fichaId) : undefined;
    return (
      <div style={cartao}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999' }}>O teu grupo</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: V, margin: '4px 0 8px' }}>{meu.nome}</div>
        <div style={{ fontSize: 15, color: '#444', lineHeight: 1.6 }}>
          {colegas.length ? <>Com: <b>{colegas.map(c => c.nomeAluno || nomeDe(c.alunoId)).join(', ')}</b></> : 'Ainda estás sozinho/a neste grupo.'}
        </div>
        {ficha && <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#f3eef8', fontSize: 15 }}>🧾 A ficha do teu grupo: <b>{ficha.nomePrato}</b></div>}
        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: meu.validado ? '#3E7A31' : '#B5651D' }}>
          {meu.validado ? '✓ O professor validou os grupos' : '⏳ O professor ainda vai validar os grupos (pode mudar-te de grupo).'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: meu.validado ? '1fr' : '1fr 1fr', gap: 8, marginTop: 14 }}>
          {!meu.validado && <button onClick={() => setAMudar(true)} style={botao()}>Mudar de grupo</button>}
          <button onClick={onConcluido} style={botao(V)}>Continuar →</button>
        </div>
      </div>
    );
  }

  const podeCriar = true;
  return (
    <div style={cartao}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#222' }}>Hoje trabalhas em grupo</div>
      <div style={{ fontSize: 14.5, color: '#666', margin: '4px 0 14px', lineHeight: 1.5 }}>
        Junta-te a um grupo ou cria um novo. Grupos até {tamanho} pessoas. O professor depois valida.
      </div>
      {grupos.length === 0 && <div style={{ fontSize: 14.5, color: '#888', marginBottom: 12 }}>Ainda não há grupos. Cria o primeiro.</div>}
      {grupos.map(g => {
        const cheio = g.membros.length >= tamanho;
        const souDeste = g.membros.some(m => m.alunoId === aluno.id);
        return (
          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '1px solid #eee' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{g.nome} <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>({g.membros.length}/{tamanho})</span></div>
              <div style={{ fontSize: 13.5, color: '#666' }}>{g.membros.map(m => m.nomeAluno || nomeDe(m.alunoId)).join(', ')}</div>
            </div>
            {souDeste ? <span style={{ fontSize: 13.5, color: V, fontWeight: 700 }}>És deste</span>
              : <button disabled={cheio || g.validado} onClick={() => entrar(g.id, g.nome)}
                  style={{ ...botao(), minHeight: 40, padding: '8px 14px', fontSize: 14, opacity: cheio || g.validado ? 0.45 : 1 }}>
                  {cheio ? 'Cheio' : 'Entrar'}</button>}
          </div>
        );
      })}
      {podeCriar && (
        <button onClick={() => entrar(`g_${plano.id}_${aluno.id}_${Date.now()}`, `Grupo de ${primeiroNome(aluno.nome || '')}`)}
          style={{ ...botao(V), width: '100%', marginTop: 12 }}>+ Criar um grupo novo</button>
      )}
      {aMudar && <button onClick={() => setAMudar(false)} style={{ ...botao(), width: '100%', marginTop: 8 }}>Cancelar</button>}
    </div>
  );
}

// ── Avaliar os colegas do grupo ─────────────────────────────────
const PERGUNTAS: { chave: 'colabora' | 'ouve' | 'flexivel' | 'conflito'; texto: string; opcoes: [string, string, string] }[] = [
  { chave: 'colabora', texto: 'Colaborou com o grupo?', opcoes: ['Pouco', 'Às vezes', 'Muito'] },
  { chave: 'ouve', texto: 'Ouviu os outros?', opcoes: ['Pouco', 'Às vezes', 'Muito'] },
  { chave: 'flexivel', texto: 'Aceitou outras ideias (foi flexível)?', opcoes: ['Pouco', 'Às vezes', 'Muito'] },
  { chave: 'conflito', texto: 'Nos problemas do grupo…', opcoes: ['Criou conflitos', 'Nem uma coisa nem outra', 'Ajudou a resolver'] },
];

export function AvaliarColegas({ aluno, plano }: { aluno: Aluno; plano: PlanoAula }) {
  const meu = grupoDoAluno(plano.id, aluno.id);
  const colegas = (meu?.membros || []).filter(m => m.alunoId !== aluno.id);
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

export default PassoGrupo;
