import React, { useState } from 'react';
import {
  getPlanosAulaPorTurma,
  addOrUpdatePlanoAula,
  getFichasProducao,
  getAlunos,
  addOrUpdateDistribuicaoFicha,
} from '../backend';
import { PlanoAula as TPlanoAula, DistribuicaoFicha } from '../types';

// ── Constantes ────────────────────────────────────────────────
const TIPOS_ATIVIDADE = [
  'Aula prática',
  'Almoço pedagógico',
  'Jantar pedagógico',
  'Brunch',
  'Pequeno-almoço',
  'Coffee break',
  'Serviço real à carta',
  'Catering',
  'Buffet',
  'Evento externo',
  'Outro',
];

const COMP_PERM = [
  'Responsabilidade pelas suas ações',
  'Sentido de organização',
  'Higiene e segurança alimentar',
  'Disponibilidade para aprender',
  'Respeito pelas regras',
  'Segurança e saúde no trabalho',
];

// ── Estilos ───────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--color-background-primary, #fff)',
  border: '0.5px solid var(--color-border-tertiary, #e0e0e0)',
  borderRadius: 12, padding: '14px 16px', marginBottom: 12,
};
const muted: React.CSSProperties = { color: '#888', fontSize: 12 };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4, display: 'block' };
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: '#fff', color: '#222', boxSizing: 'border-box' };
const select: React.CSSProperties = { ...input };
const btnVerde = (disabled = false): React.CSSProperties => ({
  padding: '10px 16px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? '#e0e0e0' : '#1D9E75', color: disabled ? '#999' : 'white', width: '100%', marginTop: 8,
});
const btnCinza: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', color: '#555', fontWeight: 500, fontSize: 12, cursor: 'pointer' };
const tag = (cor: string, bg: string): React.CSSProperties => ({ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: bg, color: cor, fontWeight: 500 });

// ── Step bar ──────────────────────────────────────────────────
const STEPS = ['Dados', 'Fichas', 'Grupos', 'Competências', 'Publicar'];

function StepBar({ current, onClick }: { current: number; onClick: (i: number) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEPS.length},1fr)`, borderRadius: 10, overflow: 'hidden', border: '1px solid #e0e0e0', marginBottom: 16 }}>
      {STEPS.map((s, i) => (
        <div key={i} onClick={() => i < current && onClick(i)} style={{
          padding: '8px 4px', textAlign: 'center', fontSize: 11,
          borderRight: i < STEPS.length - 1 ? '1px solid #e0e0e0' : 'none',
          background: i < current ? '#EAF3DE' : i === current ? '#1D9E75' : '#f9f9f9',
          color: i < current ? '#3B6D11' : i === current ? 'white' : '#aaa',
          fontWeight: i === current ? 700 : 500,
          cursor: i < current ? 'pointer' : 'default',
        }}>{i < current ? '✓ ' : ''}{s}</div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function PlanoAula({ turmaId }: { turmaId: string }) {
  const [vista, setVista] = useState<'lista' | 'criar' | 'grelha'>('lista');
  const [planoAtivo, setPlanoAtivo] = useState<TPlanoAula | null>(null);
  const planos = getPlanosAulaPorTurma(turmaId);

  if (vista === 'criar') {
    return <CriarPlano turmaId={turmaId} onConcluido={(p) => { setPlanoAtivo(p); setVista('grelha'); }} onVoltar={() => setVista('lista')} />;
  }

  if (vista === 'grelha' && planoAtivo) {
    return <GrelhaAvaliacao plano={planoAtivo} turmaId={turmaId} onVoltar={() => setVista('lista')} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Planos de Aula</div>
        <button onClick={() => setVista('criar')} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1D9E75', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Novo plano</button>
      </div>

      {planos.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: 32, color: '#aaa' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ainda não há planos</div>
          <div style={muted}>Cria o primeiro plano de aula para começar.</div>
        </div>
      )}

      {planos.map(p => (
        <div key={p.id} style={{ ...card, cursor: 'pointer' }} onClick={() => { setPlanoAtivo(p); setVista('grelha'); }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{p.titulo}</div>
              <div style={muted}>{p.data} · {p.horaInicio}-{p.horaFim} · {p.fichasIds.length} fichas</div>
            </div>
            <span style={tag(p.estado === 'publicado' ? '#3B6D11' : '#854F0B', p.estado === 'publicado' ? '#EAF3DE' : '#FAEEDA')}>
              {p.estado === 'publicado' ? 'Publicado' : p.estado === 'rascunho' ? 'Rascunho' : p.estado}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CRIAR PLANO — 5 PASSOS
// ═══════════════════════════════════════════════════════════════
function CriarPlano({ turmaId, onConcluido, onVoltar }: { turmaId: string; onConcluido: (p: TPlanoAula) => void; onVoltar: () => void }) {
  const [passo, setPasso] = useState(0);
  const [dados, setDados] = useState({
    titulo: '',
    data: new Date().toISOString().split('T')[0],
    horaInicio: '09:00',
    horaFim: '17:30',
    tipoAtividade: 'Aula prática',
    tipoOutro: '',
    professor: '',
    observacoes: '',
  });
  const [fichasSelecionadas, setFichasSelecionadas] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<{ nome: string; fichaId: string; alunosIds: string[] }[]>([]);
  const [compOpcional1, setCompOpcional1] = useState('');
  const [compOpcional2, setCompOpcional2] = useState('');
  const [plano, setPlano] = useState<TPlanoAula | null>(null);

  const todasFichas = getFichasProducao();
  const alunos = getAlunos().filter(a => a.turmaId === turmaId);

  function setD(k: string, v: string) { setDados(p => ({ ...p, [k]: v })); }

  // PASSO 0 — Dados
  function criarRascunho() {
    const now = new Date().toISOString();
    const titulo = dados.titulo || `Plano ${dados.data}`;
    const p: TPlanoAula = {
      id: `plano_${Date.now()}`,
      turmaId,
      professor: dados.professor,
      data: dados.data,
      horaInicio: dados.horaInicio,
      horaFim: dados.horaFim,
      titulo,
      observacoes: dados.observacoes,
      fichasIds: [],
      estado: 'rascunho',
      criadoEm: now,
      atualizadoEm: now,
    };
    addOrUpdatePlanoAula(p);
    setPlano(p);
    setPasso(1);
  }

  // PASSO 1 — Fichas
  function toggleFicha(id: string) {
    setFichasSelecionadas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function guardarFichas() {
    if (!plano) return;
    const atualizado = { ...plano, fichasIds: fichasSelecionadas, estado: 'fichas_pendentes' as const };
    addOrUpdatePlanoAula(atualizado);
    setPlano(atualizado);
    // Inicializar grupos
    const gs = fichasSelecionadas.map(fid => {
      const ficha = todasFichas.find(f => f.id === fid);
      return { nome: ficha?.nomePrato || 'Grupo', fichaId: fid, alunosIds: [] };
    });
    setGrupos(gs);
    setPasso(2);
  }

  // PASSO 2 — Grupos
  function toggleAlunoGrupo(grupoIdx: number, alunoId: string) {
    setGrupos(prev => {
      const novo = [...prev];
      const g = { ...novo[grupoIdx] };
      g.alunosIds = g.alunosIds.includes(alunoId) ? g.alunosIds.filter(x => x !== alunoId) : [...g.alunosIds, alunoId];
      novo[grupoIdx] = g;
      return novo;
    });
  }

  function guardarGrupos() {
    if (!plano) return;
    grupos.forEach((g, i) => {
      const dist: DistribuicaoFicha = {
        id: `dist_${plano.id}_${g.fichaId}`,
        planoAulaId: plano.id,
        fichaId: g.fichaId,
        modo: g.alunosIds.length === 0 ? 'todos' : 'grupo',
        tipoServico: 'normal',
        alunosIds: g.alunosIds,
        grupos: g.alunosIds.length > 0 ? [{ id: `gr_${i}`, fichaId: g.fichaId, planoAulaId: plano.id, nome: g.nome, alunosIds: g.alunosIds }] : [],
        tecnicasSelecionadas: [],
        atitudesSelecionadas: [],
        atitudesProfessor: [],
        publicada: false,
      };
      addOrUpdateDistribuicaoFicha(dist);
    });
    setPasso(3);
  }

  // PASSO 4 — Publicar
  function publicar() {
    if (!plano) return;
    const atualizado = { ...plano, estado: 'publicado' as const, atualizadoEm: new Date().toISOString() };
    addOrUpdatePlanoAula(atualizado);
    setPlano(atualizado);
    onConcluido(atualizado);
  }

  const fichasSel = todasFichas.filter(f => fichasSelecionadas.includes(f.id));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onVoltar} style={btnCinza}>← Voltar</button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Novo Plano de Aula</div>
      </div>

      <StepBar current={passo} onClick={setPasso} />

      {/* PASSO 0 — DADOS */}
      {passo === 0 && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#085041' }}>📋 Dados da aula</div>
            <div style={{ marginBottom: 10 }}>
              <span style={label}>Título (opcional)</span>
              <input style={input} value={dados.titulo} onChange={e => setD('titulo', e.target.value)} placeholder="ex: Cozinha Asiática — CP2" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <span style={label}>Data</span>
                <input type="date" style={input} value={dados.data} onChange={e => setD('data', e.target.value)} />
              </div>
              <div>
                <span style={label}>Professor</span>
                <input style={input} value={dados.professor} onChange={e => setD('professor', e.target.value)} placeholder="Nome do professor" />
              </div>
              <div>
                <span style={label}>Hora início</span>
                <input type="time" style={input} value={dados.horaInicio} onChange={e => setD('horaInicio', e.target.value)} />
              </div>
              <div>
                <span style={label}>Hora fim</span>
                <input type="time" style={input} value={dados.horaFim} onChange={e => setD('horaFim', e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <span style={label}>Tipo de atividade</span>
              <select style={select} value={dados.tipoAtividade} onChange={e => setD('tipoAtividade', e.target.value)}>
                {TIPOS_ATIVIDADE.map(t => <option key={t}>{t}</option>)}
              </select>
              {dados.tipoAtividade === 'Outro' && (
                <input style={{ ...input, marginTop: 6 }} value={dados.tipoOutro} onChange={e => setD('tipoOutro', e.target.value)} placeholder="Descreve o tipo de atividade..." />
              )}
            </div>
            <div>
              <span style={label}>Observações (opcional)</span>
              <textarea style={{ ...input, minHeight: 60, resize: 'none' }} value={dados.observacoes} onChange={e => setD('observacoes', e.target.value)} placeholder="Notas para a aula..." />
            </div>
          </div>
          <button style={btnVerde(!dados.data)} disabled={!dados.data} onClick={criarRascunho}>Continuar — Fichas →</button>
        </div>
      )}

      {/* PASSO 1 — FICHAS */}
      {passo === 1 && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#085041' }}>📄 Fichas de Produção</div>
            <div style={{ ...muted, marginBottom: 12 }}>Seleciona as fichas para esta aula. Podes selecionar até 10.</div>
            {todasFichas.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: '#aaa' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                <div>Ainda não há fichas criadas.</div>
                <div style={muted}>Cria fichas no tab "Ficha de Produção" primeiro.</div>
              </div>
            )}
            {todasFichas.map(f => (
              <div key={f.id} onClick={() => toggleFicha(f.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, border: `1px solid ${fichasSelecionadas.includes(f.id) ? '#1D9E75' : '#e0e0e0'}`,
                background: fichasSelecionadas.includes(f.id) ? '#EAF3DE' : '#fff',
                marginBottom: 6, cursor: 'pointer',
              }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${fichasSelecionadas.includes(f.id) ? '#1D9E75' : '#ccc'}`, background: fichasSelecionadas.includes(f.id) ? '#1D9E75' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {fichasSelecionadas.includes(f.id) && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.nomePrato}</div>
                  <div style={muted}>{f.classificacao} · {f.numPorcoes} porções</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btnCinza, flex: 0 }} onClick={() => setPasso(0)}>←</button>
            <button style={{ ...btnVerde(fichasSelecionadas.length === 0), flex: 1, marginTop: 0 }} disabled={fichasSelecionadas.length === 0} onClick={guardarFichas}>Continuar — Grupos →</button>
          </div>
        </div>
      )}

      {/* PASSO 2 — GRUPOS */}
      {passo === 2 && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#085041' }}>👥 Distribuição de grupos</div>
            <div style={{ ...muted, marginBottom: 12 }}>Para cada ficha, seleciona os alunos que vão trabalhar nela. Se não seleccionares nenhum, é atribuída a todos.</div>

            {grupos.map((g, gi) => {
              const ficha = todasFichas.find(f => f.id === g.fichaId);
              return (
                <div key={gi} style={{ ...card, background: '#f9f9f9', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#085041' }}>
                    {ficha?.nomePrato || `Ficha ${gi + 1}`}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {alunos.length === 0 && <div style={muted}>Sem alunos registados nesta turma.</div>}
                    {alunos.map(a => (
                      <div key={a.id} onClick={() => toggleAlunoGrupo(gi, a.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                        border: `1px solid ${g.alunosIds.includes(a.id) ? '#1D9E75' : '#e0e0e0'}`,
                        background: g.alunosIds.includes(a.id) ? '#EAF3DE' : '#fff',
                      }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${g.alunosIds.includes(a.id) ? '#1D9E75' : '#ccc'}`, background: g.alunosIds.includes(a.id) ? '#1D9E75' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {g.alunosIds.includes(a.id) && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                        </div>
                        <span>{a.nome || `Aluno ${a.numero}`}</span>
                      </div>
                    ))}
                  </div>
                  {g.alunosIds.length === 0 && <div style={{ ...muted, marginTop: 6 }}>Nenhum selecionado → atribuída a todos</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btnCinza, flex: 0 }} onClick={() => setPasso(1)}>←</button>
            <button style={{ ...btnVerde(), flex: 1, marginTop: 0 }} onClick={guardarGrupos}>Continuar — Competências →</button>
          </div>
        </div>
      )}

      {/* PASSO 3 — COMPETÊNCIAS */}
      {passo === 3 && (
        <div>
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#085041' }}>⭐ Competências a avaliar</div>
            <div style={{ ...muted, marginBottom: 12 }}>As permanentes são sempre avaliadas. Podes escolher até 2 opcionais.</div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#854F0B', marginBottom: 6 }}>Permanentes — sempre avaliadas</div>
              {COMP_PERM.map(c => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: '#FAEEDA', marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <span style={{ fontSize: 12, flex: 1 }}>{c}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#185FA5', marginBottom: 6 }}>Opcionais do professor (máx. 2)</div>
              <div style={{ marginBottom: 6 }}>
                <span style={label}>Competência opcional 1</span>
                <select style={select} value={compOpcional1} onChange={e => setCompOpcional1(e.target.value)}>
                  <option value="">— nenhuma —</option>
                  <option>Autonomia</option>
                  <option>Iniciativa</option>
                  <option>Autocontrolo</option>
                  <option>Assertividade</option>
                  <option>Empatia</option>
                  <option>Escuta ativa</option>
                  <option>Cooperação</option>
                  <option>Empenho e persistência</option>
                  <option>Flexibilidade e adaptabilidade</option>
                  <option>Sustentabilidade</option>
                  <option>Respeito pelo bem-estar dos outros</option>
                  <option>Autoconfiança</option>
                  <option>Postura profissional</option>
                  <option>Sentido crítico</option>
                  <option>Respeito pelas diferenças individuais</option>
                  <option>Cuidado com a apresentação pessoal</option>
                </select>
              </div>
              <div>
                <span style={label}>Competência opcional 2</span>
                <select style={select} value={compOpcional2} onChange={e => setCompOpcional2(e.target.value)}>
                  <option value="">— nenhuma —</option>
                  <option>Autonomia</option>
                  <option>Iniciativa</option>
                  <option>Autocontrolo</option>
                  <option>Assertividade</option>
                  <option>Empatia</option>
                  <option>Escuta ativa</option>
                  <option>Cooperação</option>
                  <option>Empenho e persistência</option>
                  <option>Flexibilidade e adaptabilidade</option>
                  <option>Sustentabilidade</option>
                  <option>Respeito pelo bem-estar dos outros</option>
                  <option>Autoconfiança</option>
                  <option>Postura profissional</option>
                  <option>Sentido crítico</option>
                  <option>Respeito pelas diferenças individuais</option>
                  <option>Cuidado com a apresentação pessoal</option>
                </select>
              </div>
            </div>

            {fichasSel.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', marginBottom: 6 }}>Competências técnicas das fichas</div>
                {fichasSel.map(f => (
                  <div key={f.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{f.nomePrato}</div>
                    {f.tecnicasSugeridas && f.tecnicasSugeridas.length > 0
                      ? f.tecnicasSugeridas.map(t => (
                        <span key={t} style={{ ...tag('#534AB7', '#EEEDFE'), marginRight: 4, marginBottom: 4, display: 'inline-block' }}>{t}</span>
                      ))
                      : <span style={muted}>Sem técnicas detetadas</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btnCinza, flex: 0 }} onClick={() => setPasso(2)}>←</button>
            <button style={{ ...btnVerde(), flex: 1, marginTop: 0 }} onClick={() => setPasso(4)}>Continuar — Publicar →</button>
          </div>
        </div>
      )}

      {/* PASSO 4 — PUBLICAR */}
      {passo === 4 && plano && (
        <div>
          <div style={{ ...card, textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{plano.titulo}</div>
            <div style={muted}>{plano.data} · {plano.horaInicio}-{plano.horaFim}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
              {[
                ['Fichas', fichasSelecionadas.length],
                ['Alunos', alunos.length],
                ['Competências', COMP_PERM.length + (compOpcional1 ? 1 : 0) + (compOpcional2 ? 1 : 0)],
              ].map(([l, v]) => (
                <div key={String(l)} style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 6px' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75' }}>{v}</div>
                  <div style={muted}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...card, background: '#F0FBF7', border: '1px solid #9FE1CB' }}>
            <div style={{ fontSize: 12, color: '#085041' }}>
              Ao publicar, os alunos passam a ver este plano e as fichas de produção atribuídas.
            </div>
          </div>
          <button style={btnVerde()} onClick={publicar}>🚀 Publicar plano de aula</button>
          <button style={{ ...btnCinza, width: '100%', marginTop: 6, textAlign: 'center' }} onClick={() => setPasso(3)}>← Voltar</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GRELHA DE AVALIAÇÃO
// ═══════════════════════════════════════════════════════════════
function GrelhaAvaliacao({ plano, turmaId, onVoltar }: { plano: TPlanoAula; turmaId: string; onVoltar: () => void }) {
  const alunos = getAlunos().filter(a => a.turmaId === turmaId);
  const fichas = getFichasProducao().filter(f => plano.fichasIds.includes(f.id));
  const comps = [...COMP_PERM.map(n => ({ id: n, abrev: n.split(' ').slice(0, 2).join(' '), tipo: 'perm' }))];

  type Nota = 'S' | 'A' | 'R' | null;
  const [notas, setNotas] = useState<Record<string, Record<string, Nota>>>(() =>
    Object.fromEntries(alunos.map(a => [a.id, Object.fromEntries(comps.map(c => [c.id, null]))]))
  );

  function toggle(alunoId: string, compId: string, v: Nota) {
    setNotas(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], [compId]: prev[alunoId][compId] === v ? null : v } }));
  }

  const COR: Record<string, { bg: string; border: string; color: string }> = {
    S: { bg: '#EAF3DE', border: '#639922', color: '#3B6D11' },
    A: { bg: '#E6F1FB', border: '#378ADD', color: '#0C447C' },
    R: { bg: '#FCEBEB', border: '#E24B4A', color: '#A32D2D' },
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onVoltar} style={btnCinza}>← Planos</button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{plano.titulo}</div>
          <div style={muted}>{plano.data} · Grelha de avaliação</div>
        </div>
      </div>

      {/* Fichas */}
      {fichas.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#085041', marginBottom: 8 }}>Fichas de Produção</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {fichas.map(f => <span key={f.id} style={tag('#085041', '#E6F4F1')}>{f.nomePrato}</span>)}
          </div>
        </div>
      )}

      {/* Grelha */}
      <div style={{ overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#085041', color: 'white' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, minWidth: 100 }}>Aluno</th>
              {comps.map(c => (
                <th key={c.id} style={{ padding: '6px 4px', fontSize: 10, fontWeight: 600, textAlign: 'center', minWidth: 80 }}>
                  <div>{c.abrev}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alunos.map((a, ai) => (
              <tr key={a.id} style={{ background: ai % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 500, borderBottom: '1px solid #eee' }}>
                  {a.nome || `Aluno ${a.numero}`}
                </td>
                {comps.map(c => {
                  const v = notas[a.id]?.[c.id] || null;
                  return (
                    <td key={c.id} style={{ padding: '4px 3px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {(['S','A','R'] as Nota[]).map(bv => (
                          <button key={String(bv)} onClick={() => toggle(a.id, c.id, bv)} style={{
                            width: 24, height: 24, borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            border: `1px solid ${v === bv ? COR[bv!].border : '#ddd'}`,
                            background: v === bv ? COR[bv!].bg : '#f5f5f5',
                            color: v === bv ? COR[bv!].color : '#aaa',
                          }}>{bv}</button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#888', marginBottom: 12 }}>
        {[['#639922','S — dentro do esperado'],['#378ADD','A — acima do esperado'],['#E24B4A','R — necessita reforço']].map(([cor,l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: cor, display: 'inline-block' }} />{l}
          </span>
        ))}
      </div>

      <button style={btnVerde()} onClick={() => alert('Avaliações guardadas!')}>Guardar avaliações</button>
    </div>
  );
}

