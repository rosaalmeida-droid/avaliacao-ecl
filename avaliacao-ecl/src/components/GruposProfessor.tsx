// ============================================================
// Grupos — o lado do professor
// ============================================================
// Liga «os alunos formam os grupos», vê-os a formar-se, muda alunos de
// grupo, dá uma ficha a cada grupo e valida. Em baixo, o que os colegas
// disseram uns dos outros — só para o professor, não conta para nota.
// Serve para apanhar quem cria conflito sem dar nas vistas.
// ============================================================
import React, { useEffect, useState } from 'react';
import type { PlanoAula } from '../types';
import {
  gruposDaAula, entrarNoGrupo, guardarInfoGrupo, sincronizarGrupos, getAvaliacoesPares, getAlunos,
  getFichasProducao, addOrUpdatePlanoAula, getMembrosGrupo, type AvaliacaoPar,
} from '../backend';
import { configGrupos } from './GruposAluno';

const V = '#6B3FA0';
const cartao: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, border: '1px solid rgba(26,23,20,0.1)' };
const pequeno = (ativo?: boolean): React.CSSProperties => ({ padding: '7px 12px', borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'inherit', border: `1.5px solid ${ativo ? V : 'rgba(26,23,20,0.18)'}`, background: ativo ? V : '#fff', color: ativo ? '#fff' : '#333' });

export function GruposProfessor({ plano, onPlanoActualizado }: { plano: PlanoAula; onPlanoActualizado?: (p: PlanoAula) => void }) {
  const [, redesenhar] = useState(0);
  const [aMover, setAMover] = useState<string | null>(null);
  const cfg = configGrupos(plano);
  const turmaId = plano.turmaId;

  useEffect(() => {
    let vivo = true;
    const ver = () => sincronizarGrupos(turmaId, true).catch(() => {}).finally(() => { if (vivo) redesenhar(n => n + 1); });
    ver();
    const t = setInterval(ver, 5000);
    return () => { vivo = false; clearInterval(t); };
  }, [turmaId, plano.id]);

  function mudarConfig(x: Partial<{ ativo: boolean; tamanho: number }>) {
    const p = { ...plano, gruposAlunos: { ...cfg, ...x }, atualizadoEm: new Date().toISOString() } as any;
    addOrUpdatePlanoAula(p);
    onPlanoActualizado?.(p);
  }

  const grupos = gruposDaAula(plano.id);
  const alunos = getAlunos().filter(a => a.turmaId === turmaId && a.ativo !== false).sort((a, b) => (a.numero || 0) - (b.numero || 0));
  const comGrupo = new Set(getMembrosGrupo(plano.id).filter(m => m.grupoId).map(m => m.alunoId));
  const semGrupo = alunos.filter(a => !comGrupo.has(a.id));
  const fichas = getFichasProducao().filter(f => (plano.fichasIds || []).includes(f.id));
  const todosValidados = grupos.length > 0 && grupos.every(g => g.validado);

  function mover(alunoId: string, grupoId: string, grupoNome: string) {
    const a = alunos.find(x => x.id === alunoId);
    entrarNoGrupo({ planoAulaId: plano.id, turmaId, alunoId, nomeAluno: a?.nome, grupoId, grupoNome, definidoPor: 'professor' });
    setAMover(null); redesenhar(n => n + 1);
  }
  function novoGrupoCom(alunoId: string) {
    mover(alunoId, `g_${plano.id}_prof_${Date.now()}`, `Grupo ${grupos.length + 1}`);
  }
  function darFicha(g: { id: string; nome: string; validado: boolean }, fichaId: string) {
    guardarInfoGrupo({ id: g.id, planoAulaId: plano.id, turmaId, grupoNome: g.nome, fichaId: fichaId || undefined, validado: g.validado });
    redesenhar(n => n + 1);
  }
  function validarTodos() {
    grupos.forEach(g => guardarInfoGrupo({ id: g.id, planoAulaId: plano.id, turmaId, grupoNome: g.nome, fichaId: g.fichaId, validado: true }));
    redesenhar(n => n + 1);
  }

  // ── Configuração ────────────────────────────────────────────
  const config = (
    <div style={{ ...cartao, border: `1.5px solid ${cfg.ativo ? V : 'rgba(26,23,20,0.1)'}` }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>Trabalho em grupo</div>
      <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.6)', margin: '4px 0 10px', lineHeight: 1.5 }}>
        Os alunos formam os grupos ao entrar na aula. Depois o professor valida (ou muda) e dá uma ficha a cada grupo.
        A autoavaliação continua individual.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => mudarConfig({ ativo: !cfg.ativo })} style={pequeno(cfg.ativo)}>
          {cfg.ativo ? '✓ Os alunos formam os grupos' : 'Os alunos formam os grupos'}
        </button>
        {cfg.ativo && <span style={{ fontSize: 13.5, color: '#555', marginLeft: 6 }}>Até</span>}
        {cfg.ativo && [2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => mudarConfig({ tamanho: n })} style={pequeno(cfg.tamanho === n)}>{n}</button>
        ))}
        {cfg.ativo && <span style={{ fontSize: 13.5, color: '#555' }}>por grupo</span>}
      </div>
    </div>
  );
  if (!cfg.ativo) return config;

  // ── O que os colegas disseram ────────────────────────────────
  const pares = getAvaliacoesPares(plano.id);
  const porAvaliado = new Map<string, AvaliacaoPar[]>();
  pares.forEach(p => porAvaliado.set(p.avaliadoId, [...(porAvaliado.get(p.avaliadoId) || []), p]));
  const media = (l: AvaliacaoPar[], k: 'colabora' | 'ouve' | 'flexivel' | 'conflito') => l.reduce((s, x) => s + (x[k] || 0), 0) / l.length;
  const nomeAl = (id: string) => { const a = alunos.find(x => x.id === id) || getAlunos().find(x => x.id === id); return a?.nome || `Aluno nº ${a?.numero ?? '?'}`; };
  const txt = (v: number) => v >= 2.5 ? 'muito' : v >= 1.75 ? 'às vezes' : 'pouco';

  return (
    <div>
      {config}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 2px 10px' }}>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(26,23,20,0.5)' }}>
          Grupos ({grupos.length}) · {semGrupo.length} sem grupo
        </div>
        {grupos.length > 0 && (
          <button onClick={validarTodos} disabled={todosValidados}
            style={{ ...pequeno(!todosValidados), background: todosValidados ? '#3E7A31' : V, color: '#fff', border: 'none' }}>
            {todosValidados ? '✓ Grupos validados' : 'Validar grupos'}
          </button>
        )}
      </div>

      {grupos.map(g => (
        <div key={g.id} style={{ ...cartao, border: `1.5px solid ${g.validado ? '#3E7A31' : 'rgba(26,23,20,0.12)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, fontSize: 16, fontWeight: 800, color: V }}>{g.nome}
              <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}> · {g.membros.length}/{cfg.tamanho}</span></div>
            {g.validado && <span style={{ fontSize: 13, fontWeight: 700, color: '#3E7A31' }}>✓ validado</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
            {g.membros.map(m => (
              <button key={m.alunoId} onClick={() => setAMover(aMover === m.alunoId ? null : m.alunoId)}
                title="Mudar de grupo" style={pequeno(aMover === m.alunoId)}>
                {m.nomeAluno || nomeAl(m.alunoId)}{m.definidoPor === 'professor' ? ' ✎' : ''}
              </button>
            ))}
          </div>
          {fichas.length > 0 && (
            <label style={{ fontSize: 13.5, color: '#555', display: 'flex', gap: 8, alignItems: 'center' }}>
              Ficha:
              <select value={g.fichaId || ''} onChange={e => darFicha(g, e.target.value)}
                style={{ flex: 1, padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontFamily: 'inherit', fontSize: 14 }}>
                <option value="">— todas as fichas do plano —</option>
                {fichas.map(f => <option key={f.id} value={f.id}>{f.nomePrato}</option>)}
              </select>
            </label>
          )}
        </div>
      ))}

      {/* Mudar o aluno escolhido para outro grupo */}
      {aMover && (
        <div style={{ ...cartao, background: '#f3eef8', border: `1.5px solid ${V}` }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 8 }}>Mudar {nomeAl(aMover)} para:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {grupos.filter(g => !g.membros.some(m => m.alunoId === aMover)).map(g => (
              <button key={g.id} onClick={() => mover(aMover, g.id, g.nome)} style={pequeno()}>{g.nome}</button>
            ))}
            <button onClick={() => novoGrupoCom(aMover)} style={pequeno()}>+ Grupo novo</button>
            <button onClick={() => mover(aMover, '', '')} style={pequeno()}>Tirar do grupo</button>
            <button onClick={() => setAMover(null)} style={pequeno()}>Cancelar</button>
          </div>
        </div>
      )}

      {semGrupo.length > 0 && (
        <div style={cartao}>
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 8 }}>Sem grupo ({semGrupo.length}) — toque para pôr num grupo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {semGrupo.map(a => (
              <button key={a.id} onClick={() => setAMover(a.id)} style={pequeno(aMover === a.id)}>{a.nome || `nº ${a.numero}`}</button>
            ))}
          </div>
        </div>
      )}

      {/* O que os colegas disseram — só para o professor */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(26,23,20,0.5)', margin: '16px 2px 8px' }}>
        O que os colegas disseram · só o professor vê · não conta para nota
      </div>
      {porAvaliado.size === 0 && <div style={{ ...cartao, fontSize: 14, color: '#777' }}>Ainda não há avaliações entre colegas. Aparecem quando os alunos acabam a autoavaliação.</div>}
      {[...porAvaliado.entries()].map(([id, l]) => {
        const conflitos = l.filter(x => x.conflito === 1).length;
        const alerta = conflitos >= 2 || (l.length >= 2 && media(l, 'conflito') < 1.75) || (l.length >= 2 && media(l, 'ouve') < 1.5);
        const comentarios = l.map(x => x.comentario).filter(Boolean);
        return (
          <div key={id} style={{ ...cartao, border: `1.5px solid ${alerta ? '#C0392B' : 'rgba(26,23,20,0.1)'}`, background: alerta ? '#FDF0EF' : '#fff' }}>
            <div style={{ fontSize: 15.5, fontWeight: 800 }}>{alerta ? '⚠ ' : ''}{nomeAl(id)}
              <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}> · {l.length} colega{l.length === 1 ? '' : 's'} responderam</span></div>
            <div style={{ fontSize: 13.5, color: '#444', marginTop: 4, lineHeight: 1.6 }}>
              Colabora {txt(media(l, 'colabora'))} · ouve os outros {txt(media(l, 'ouve'))} · flexível {txt(media(l, 'flexivel'))}
              {conflitos > 0 && <> · <b style={{ color: '#C0392B' }}>{conflitos} disse{conflitos === 1 ? '' : 'ram'} que criou conflitos</b></>}
            </div>
            {alerta && <div style={{ fontSize: 13, color: '#C0392B', marginTop: 4 }}>Vale a pena observar este aluno no grupo.</div>}
            {comentarios.length > 0 && <div style={{ fontSize: 13, color: '#666', marginTop: 6, fontStyle: 'italic' }}>«{comentarios.join('» · «')}»</div>}
          </div>
        );
      })}
    </div>
  );
}

export default GruposProfessor;
