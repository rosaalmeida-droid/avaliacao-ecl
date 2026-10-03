// ============================================================
// Alunos com UC / módulo em atraso — sempre à vista do professor
// ============================================================
// Assim que um aluno chega aos 10% de faltas (sobre o total de horas da UC
// numa UC), a UC fica em atraso. O professor tem de ver isto sem ir
// procurar aluno a aluno: fica um contador num canto do ecrã, em todos
// os ecrãs. Ao tocar, vê quem está em atraso, em que UC, a percentagem
// de faltas e o que falta fazer — e decide logo o plano de recuperação.
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  ucsEmAtraso, criarPlanoRecuperacao, registarResultadoRecuperacao, MODALIDADES_RECUPERACAO,
  adiarRecuperacaoParaDepoisDaUC, faltasDaUC,
  atividadesParaRecuperar, ligarRecuperacaoAAtividade, resultadoSugeridoDaRecuperacao, atividadeDaRecuperacao,
  type UCEmAtraso,
} from '../backend';

const h1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const dataPT = (iso?: string) => iso ? new Date(iso).toLocaleDateString('pt-PT') : '';

/** As faltas do aluno na UC, aula a aula: dia, aula, tipo e horas. */
export function ListaFaltasUC({ alunoId, turmaId, ucId }: { alunoId: string; turmaId: string; ucId: string }) {
  const faltas = faltasDaUC(alunoId, turmaId, ucId);
  if (!faltas.length) return null;
  const total = faltas.reduce((s, f) => s + f.horas, 0);
  const dia = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  return (
    <div style={{ marginTop: 8, border: '1px solid rgba(26,23,20,0.1)', borderRadius: 10, overflow: 'hidden', fontSize: 13 }}>
      {faltas.map(f => (
        <div key={f.planoId + f.tipo} style={{ display: 'flex', gap: 8, padding: '6px 10px', borderBottom: '1px solid rgba(26,23,20,0.07)',
          background: f.tipo === 'falta' ? '#fdf0ef' : f.tipo === 'parcial' ? '#fdf6e8' : '#fff' }}>
          <span style={{ fontWeight: 700, minWidth: 42 }}>{dia(f.data)}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            {f.titulo} · <span style={{ color: 'rgba(26,23,20,0.65)' }}>{f.descricao}
              {f.minutosAtraso ? ` (${f.minutosAtraso} min)` : ''}</span>
          </span>
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', color: f.horas ? '#c0392b' : 'rgba(26,23,20,0.5)' }}>
            {f.horas ? `${h1(f.horas)} h` : '0 h'}
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', padding: '6px 10px', fontWeight: 800, background: 'rgba(26,23,20,0.04)' }}>
        <span style={{ flex: 1 }}>Total</span><span>{h1(total)} h</span>
      </div>
    </div>
  );
}

export function ContadorUCEmAtraso({ turmaId, nomeProfessor, isMobile, onAbrirRecuperacoes }: {
  turmaId?: string; nomeProfessor?: string; isMobile?: boolean;
  /** Vai ao separador Recuperações (tudo o que há para recuperar num sítio). */
  onAbrirRecuperacoes?: () => void;
}) {
  const [lista, setLista] = useState<UCEmAtraso[]>([]);
  const [aberto, setAberto] = useState(false);
  const [versao, setVersao] = useState(0);

  // Recalcula quando há dados novos (sincronização, presenças) e de 30 em 30 s.
  useEffect(() => {
    if (!turmaId) return;
    const conta = () => { try { setLista(ucsEmAtraso(turmaId)); } catch { /* */ } };
    conta();
    const t = setInterval(conta, 30000);
    window.addEventListener('focus', conta);
    return () => { clearInterval(t); window.removeEventListener('focus', conta); };
  }, [turmaId, versao]);

  if (!turmaId) return null;
  // No alerta entram os que ainda pedem ação agora: por decidir ou com o
  // plano em curso. Os que ficaram para depois da UC já estão decididos.
  const porRecuperar = lista.filter(l => l.estado === 'sem_plano' || l.estado === 'em_curso');
  const alunos = new Set(porRecuperar.map(l => l.alunoId)).size;
  const adiados = new Set(lista.filter(l => l.estado === 'adiado').map(l => l.alunoId)).size;
  // Sem ninguém em atraso, o botão não aparece: tapava o canto do ecrã com «0».
  if (alunos === 0 && adiados === 0) return null;

  return (
    <>
      <button onClick={() => setAberto(true)} className="no-print" style={{
        position: 'fixed', zIndex: 160, right: 14, bottom: isMobile ? 86 : 16,
        padding: '10px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
        border: alunos ? '1.5px solid #c0392b' : '1px solid rgba(26,23,20,0.15)',
        background: alunos ? '#fdf0ef' : '#fff', color: alunos ? '#8e2418' : 'rgba(26,23,20,0.6)',
        fontSize: 14, fontWeight: 800, boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      }}>
        Alunos com UC/módulo em atraso: {alunos}
        {adiados > 0 && <span style={{ fontWeight: 600, fontSize: 12.5 }}> · {adiados} para depois da UC</span>}
      </button>
      {aberto && (
        <PainelUCEmAtraso lista={lista} nomeProfessor={nomeProfessor}
          onFechar={() => setAberto(false)} onMudou={() => setVersao(v => v + 1)}
          onAbrirRecuperacoes={onAbrirRecuperacoes ? () => { setAberto(false); onAbrirRecuperacoes(); } : undefined} />
      )}
    </>
  );
}

export function PainelUCEmAtraso({ lista, nomeProfessor, onFechar, onMudou, onAbrirRecuperacoes }: {
  lista: UCEmAtraso[]; nomeProfessor?: string; onFechar: () => void; onMudou: () => void;
  onAbrirRecuperacoes?: () => void;
}) {
  const [aEditar, setAEditar] = useState<string | null>(null);   // chave aluno|uc
  const chave = (l: UCEmAtraso) => `${l.alunoId}|${l.ucId}`;

  return (
    <div onClick={onFechar} style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(26,23,20,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20,
        width: '100%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>Alunos com UC/módulo em atraso</div>
          {onAbrirRecuperacoes && (
            <button onClick={onAbrirRecuperacoes} style={{ border: '1.5px solid #7B2233', background: '#fff', color: '#7B2233', borderRadius: 10,
              padding: '7px 12px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Todas as recuperações ›</button>
          )}
          <button onClick={onFechar} style={{ border: 'none', background: 'transparent', fontSize: 14,
            fontWeight: 700, cursor: 'pointer', color: 'rgba(26,23,20,0.6)', fontFamily: 'inherit' }}>Fechar</button>
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.6)', margin: '4px 0 14px', lineHeight: 1.5 }}>
          Uma UC fica em atraso quando as faltas chegam a 10% do total de horas da UC. Cada aula faltada conta 0
          até o aluno fazer a recuperação. Podes recuperar já, em aula, ou deixar a UC seguir (com a nota que
          tiver, e «a)» se for negativa) e recuperar depois.
        </div>

        {lista.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(26,23,20,0.55)' }}>
            Nenhum aluno com UC/módulo em atraso.
          </div>
        ) : lista.map(l => (
          <div key={chave(l)} style={{ border: '1px solid rgba(26,23,20,0.12)', borderRadius: 12, padding: '12px 14px',
            marginBottom: 8, background: l.estado === 'recuperado' ? '#f4f8f1' : l.estado === 'adiado' ? '#f7f5f2' : '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{l.numero}. {l.nome}</div>
                <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.65)' }}>{l.ucId} — {l.ucNome}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 130 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#c0392b' }}>{l.percentagem}% de faltas</div>
                <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)' }}>{h1(l.horasFaltadas)} h de faltas em {h1(l.horasUC)} h da UC</div>
                <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)' }}>já foram dadas {h1(l.horasDadas)} h · limite {h1(l.horasUC * 0.1)} h</div>
              </div>
            </div>

            {/* Em que aulas faltou, de que tipo, e quantas horas. */}
            <ListaFaltasUC alunoId={l.alunoId} turmaId={l.turmaId} ucId={l.ucId} />

            {/* A situação e o que falta fazer */}
            <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.5 }}>
              {l.estado === 'sem_plano' && <span style={{ color: '#8e2418', fontWeight: 700 }}>Sem plano de recuperação: decida agora.</span>}
              {l.estado === 'adiado' && (
                <span><b>Fica para depois da UC.</b> Na pauta, a UC fica com a nota que tiver (com «a)» se for negativa).
                  Quando quiser, crie o plano de recuperação.</span>
              )}
              {l.estado === 'em_curso' && l.plano && (
                <span><b>Plano em curso:</b> {MODALIDADES_RECUPERACAO.find(m => m.id === l.plano!.modalidade)?.nome || 'recuperação'}
                  {l.plano.descricaoPlano ? ` — ${l.plano.descricaoPlano}` : ''}
                  {l.plano.dataLimite ? ` · até ${dataPT(l.plano.dataLimite)}` : ''}. Falta registar a realização e o resultado.
                  {(() => {
                    const a: any = atividadeDaRecuperacao(l.plano);
                    return a ? <><br /><b>Recupera na atividade «{a.titulo}»</b> ({dataPT(a.data)}). Só conta se confirmares que participou.</> : null;
                  })()}</span>
              )}
              {l.estado === 'recuperado' && l.plano && (
                <span style={{ color: '#3E7A31', fontWeight: 700 }}>Recuperado{typeof l.plano.resultadoNota === 'number' ? ` com ${h1(l.plano.resultadoNota)} valores` : ''}
                  {l.plano.realizadaEm ? ` em ${dataPT(l.plano.realizadaEm)}` : ''}.</span>
              )}
            </div>

            {l.estado !== 'recuperado' && aEditar !== chave(l) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <button onClick={() => setAEditar(chave(l))} style={{ padding: '8px 14px', borderRadius: 9,
                  border: 'none', background: l.estado === 'sem_plano' ? '#c0392b' : 'var(--sage, #5a7a4e)', color: '#fff',
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {l.estado === 'sem_plano' ? 'Recuperar já, em aula'
                    : l.estado === 'adiado' ? 'Criar plano de recuperação' : 'Registar realização e resultado'}
                </button>
                {l.estado === 'sem_plano' && (
                  <button onClick={() => {
                    if (!confirm(`Deixar a recuperação de ${l.nome} para depois da UC?\n\nAs aulas faltadas continuam a contar 0 e a UC fica com a nota que tiver (com «a)» se for negativa).`)) return;
                    adiarRecuperacaoParaDepoisDaUC(l.alunoId, l.turmaId, l.ucId); onMudou();
                  }} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(26,23,20,0.25)',
                    background: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Deixar para depois da UC
                  </button>
                )}
              </div>
            )}
            {aEditar === chave(l) && (l.estado === 'sem_plano' || l.estado === 'adiado'
              ? <FormPlano l={l} onFeito={() => { setAEditar(null); onMudou(); }} onCancelar={() => setAEditar(null)} />
              : <FormResultado l={l} nomeProfessor={nomeProfessor} onFeito={() => { setAEditar(null); onMudou(); }} onCancelar={() => setAEditar(null)} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

const campo: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 9, border: '1px solid rgba(26,23,20,0.2)',
  fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };

function FormPlano({ l, onFeito, onCancelar }: { l: UCEmAtraso; onFeito: () => void; onCancelar: () => void }) {
  const [modalidade, setModalidade] = useState<'pratico' | 'teorico' | 'atividade' | 'outra'>('pratico');
  const [descricao, setDescricao] = useState(MODALIDADES_RECUPERACAO[0].sugestao);
  const [prazo, setPrazo] = useState(() => new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10));
  const atividades = atividadesParaRecuperar(l.turmaId);
  const [atividadeId, setAtividadeId] = useState('');
  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#f7f5f2' }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Plano de recuperação: escolha a modalidade</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 6 }}>
        {MODALIDADES_RECUPERACAO.map(m => (
          <label key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 9,
            cursor: 'pointer', border: modalidade === m.id ? '2px solid var(--sage, #5a7a4e)' : '1px solid rgba(26,23,20,0.15)',
            background: '#fff', fontSize: 13.5 }}>
            <input type="radio" checked={modalidade === m.id} onChange={() => { setModalidade(m.id); setDescricao(m.sugestao === 'Definida pelo professor.' ? '' : m.sugestao); }} />
            <span><b>{m.nome}</b><br /><span style={{ color: 'rgba(26,23,20,0.6)', fontSize: 12.5 }}>{m.sugestao}</span></span>
          </label>
        ))}
      </div>
      {modalidade === 'atividade' && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Em que atividade?</div>
          {atividades.length === 0
            ? <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)' }}>Esta turma ainda não tem atividades extra. Pode criar o plano e associar a atividade mais tarde, ou aceitar o aluno quando ele se candidatar.</div>
            : <select value={atividadeId} onChange={e => setAtividadeId(e.target.value)} style={campo}>
                <option value="">— Escolher depois —</option>
                {atividades.map((a: any) => <option key={a.id} value={a.id}>{dataPT(a.data)} · {a.titulo}</option>)}
              </select>}
          <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)', marginTop: 4, lineHeight: 1.5 }}>
            O aluno entra na atividade marcado «a recuperar». Só recupera se confirmares que participou. Não dá bónus.
          </div>
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, margin: '10px 0 4px' }}>O que o aluno tem de fazer</div>
      <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} style={campo} />
      <div style={{ fontSize: 13, fontWeight: 700, margin: '10px 0 4px' }}>Prazo</div>
      <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} style={{ ...campo, width: 180 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onCancelar} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(26,23,20,0.18)',
          background: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        <button onClick={() => {
          if (!descricao.trim()) { alert('Escreva o que o aluno tem de fazer.'); return; }
          const rec = criarPlanoRecuperacao(l.alunoId, l.turmaId, l.ucId, modalidade, descricao.trim(), prazo);
          if (modalidade === 'atividade' && atividadeId) ligarRecuperacaoAAtividade(rec.id, atividadeId);
          onFeito();
        }} style={{ padding: '9px 14px', borderRadius: 9, border: 'none', background: 'var(--sage, #5a7a4e)', color: '#fff',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar o plano</button>
      </div>
    </div>
  );
}

function FormResultado({ l, nomeProfessor, onFeito, onCancelar }: {
  l: UCEmAtraso; nomeProfessor?: string; onFeito: () => void; onCancelar: () => void;
}) {
  const sugestao = l.plano ? resultadoSugeridoDaRecuperacao(l.plano) : { nota: null, porque: '' };
  const [nota, setNota] = useState(sugestao.nota != null ? String(sugestao.nota) : '');
  const [obs, setObs] = useState(sugestao.nota != null && sugestao.atividade ? `Recuperou na atividade «${sugestao.atividade.titulo}».` : '');
  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#f7f5f2' }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Realização da recuperação</div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 8, lineHeight: 1.5 }}>
        O resultado substitui o zero das aulas faltadas nesta UC, na nota e na pauta.
      </div>
      {sugestao.porque && (
        <div style={{ fontSize: 13, marginBottom: 8, padding: '8px 10px', borderRadius: 9, lineHeight: 1.5,
          background: sugestao.nota != null ? '#eaf3e6' : '#fdf3e0' }}>
          {sugestao.nota != null ? <><b>Resultado sugerido: {h1(sugestao.nota)} valores.</b> {sugestao.porque} Confirma ou corrige.</>
            : <><b>Ainda não há resultado para sugerir.</b> {sugestao.porque}</>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ fontSize: 13, fontWeight: 700 }}>Resultado (0 a 20)<br />
          <input type="number" min={0} max={20} step={0.5} value={nota} onChange={e => setNota(e.target.value)}
            style={{ ...campo, width: 110, marginTop: 4 }} /></label>
        <label style={{ fontSize: 13, fontWeight: 700, flex: '1 1 260px' }}>Observação<br />
          <input value={obs} onChange={e => setObs(e.target.value)} style={{ ...campo, marginTop: 4 }}
            placeholder="Como correu" /></label>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onCancelar} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(26,23,20,0.18)',
          background: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        <button onClick={() => {
          const n = Number(nota.replace(',', '.'));
          if (nota === '' || isNaN(n) || n < 0 || n > 20) { alert('Escreva o resultado, de 0 a 20.'); return; }
          if (l.plano) registarResultadoRecuperacao(l.plano.id, n, obs.trim(), nomeProfessor);
          onFeito();
        }} style={{ padding: '9px 14px', borderRadius: 9, border: 'none', background: 'var(--sage, #5a7a4e)', color: '#fff',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar o resultado</button>
      </div>
    </div>
  );
}

/**
 * Dentro do plano (preparar e validar): os alunos desta turma com esta UC em
 * atraso por faltas, a vermelho, onde o professor está a trabalhar
 * (Rosa, set/2026). Diz quanto faltou, o estado da recuperação e deixa
 * decidir ali mesmo.
 */
export function UCEmAtrasoNoPlano({ plano, nomeProfessor }: { plano: { turmaId: string; ucId?: string }; nomeProfessor?: string }) {
  const [aberto, setAberto] = useState(false);
  const [versao, setVersao] = useState(0);
  void versao;
  if (!plano?.turmaId || !plano.ucId) return null;
  let lista: UCEmAtraso[] = [];
  try { lista = ucsEmAtraso(plano.turmaId).filter(l => l.ucId === plano.ucId); } catch { lista = []; }
  if (!lista.length) return null;
  const ESTADO: Record<string, string> = {
    sem_plano: 'por decidir', em_curso: 'a recuperar em aula — avalia também a recuperação',
    adiado: 'recupera depois da UC', recuperado: 'já recuperou',
  };
  const porDecidir = lista.filter(l => l.estado === 'sem_plano').length;
  return (
    <div className="no-print" style={{ background: '#fdf0ef', border: '2px solid #c0392b', borderRadius: 14, padding: '14px 16px', margin: '0 0 14px' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#8e2418' }}>
        ⚠️ {lista.length} aluno{lista.length > 1 ? 's' : ''} com esta UC em atraso por faltas{porDecidir ? ` · ${porDecidir} por decidir` : ''}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.65)', margin: '3px 0 8px' }}>
        Faltas a partir de 10% do total de horas da UC. Cada aula faltada conta 0 até recuperar.
      </div>
      {lista.map(l => (
        <div key={l.alunoId} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid rgba(192,57,43,0.15)', fontSize: 14 }}>
          <span style={{ flex: '1 1 180px', minWidth: 0 }}><b>{l.numero}. {l.nome}</b></span>
          <span style={{ fontWeight: 800, color: '#c0392b' }}>{l.percentagem}%</span>
          <span style={{ color: 'rgba(26,23,20,0.6)', fontSize: 13 }}>{h1(l.horasFaltadas)} h em {h1(l.horasUC)} h</span>
          <span style={{ fontWeight: 700, color: l.estado === 'sem_plano' ? '#c0392b' : l.estado === 'recuperado' ? '#3E7A31' : '#b5651d', fontSize: 13 }}>{ESTADO[l.estado]}</span>
        </div>
      ))}
      <button onClick={() => setAberto(true)} style={{ marginTop: 10, width: '100%', minHeight: 44, borderRadius: 10, border: 'none',
        background: '#c0392b', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Ver as faltas e decidir</button>
      {aberto && <PainelUCEmAtraso lista={lista} nomeProfessor={nomeProfessor} onFechar={() => setAberto(false)} onMudou={() => setVersao(v => v + 1)} />}
    </div>
  );
}
