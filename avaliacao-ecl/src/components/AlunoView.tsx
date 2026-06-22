import React, { useState, useRef, useEffect } from 'react';
import { Aluno, PlanoAula, FichaProducao } from '../types';
import {
  getPlanosAulaPorTurma, getFichasPorPlano, getRequisicaoPorPlano,
  getDistribuicoesPorPlano, getChecklistAlunoFicha, addOrUpdateChecklistAluno,
  addOrUpdateSelecao, getHistoricoAlunoMicro, addRegistoAvaliacao, addRegistoPresenca,
} from '../backend';
import {
  MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS, PARAMETROS_AVALIACAO,
  microsPorUC, jaTeveSucesso, estaEmRegressao,
} from '../competenciasECL';
import { GuiaProducao } from './GuiaProducao';
import { RecuperacaoModulosAluno } from './RecuperacaoModulos';
import { PerfilProfissionalAluno } from './PerfilProfissional';

// ── Estilos ───────────────────────────────────────────────────
const S = {
  card: { background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:'16px', marginBottom:10 } as React.CSSProperties,
  muted: { fontSize:12, color:'rgba(26,23,20,0.5)' } as React.CSSProperties,
  verde: { background:'var(--sage)', color:'white', border:'none', borderRadius:10, padding:'12px 16px', fontWeight:700, cursor:'pointer', width:'100%', marginTop:8, fontSize:14 } as React.CSSProperties,
  cinza: { background:'rgba(26,23,20,0.08)', color:'rgba(26,23,20,0.6)', border:'none', borderRadius:10, padding:'10px 16px', fontWeight:600, cursor:'pointer', width:'100%', marginTop:6, fontSize:13 } as React.CSSProperties,
};

const FARD_ITEMS = ['Touca','Avental limpo','Sapatos seguranca','Farda completa','Sem unhas postiças','Sem fones/adornos','Maos limpas','Cabelo preso'];
function getHist(key: string): number { try { return parseInt(localStorage.getItem(key)||'0'); } catch { return 0; } }
function incHist(key: string) { try { localStorage.setItem(key, String(getHist(key)+1)); } catch {} }

// ── Hook scroll para topo de secção ──────────────────────────
function useScrollTo() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTo = () => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  return { ref, scrollTo };
}

// ── Acordeão ─────────────────────────────────────────────────
function Acordeao({ id, aberto, titulo, icone, cor, estado, onClick, children }: {
  id: string; aberto: boolean; titulo: string; icone: string;
  cor: string; estado: 'pendente' | 'concluido' | 'em_curso';
  onClick: () => void; children: React.ReactNode;
}) {
  const { ref, scrollTo } = useScrollTo();

  useEffect(() => {
    if (aberto) setTimeout(scrollTo, 120);
  }, [aberto]);

  const corEstado = estado === 'concluido' ? 'var(--sage)' : estado === 'em_curso' ? cor : 'rgba(26,23,20,0.55)';
  const bgEstado = estado === 'concluido' ? 'var(--sage-pale)' : estado === 'em_curso' ? `${cor}15` : '#fff';

  return (
    <div ref={ref} style={{ borderRadius: 14, overflow: 'hidden', border: `1.5px solid ${aberto ? cor : 'var(--border)'}`, marginBottom: 10, boxShadow: aberto ? `0 4px 20px ${cor}20` : 'none' }}>
      <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: aberto ? `${cor}12` : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: estado === 'concluido' ? 'var(--sage)' : `${cor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: estado === 'concluido' ? 20 : 22, flexShrink: 0, color: estado === 'concluido' ? 'white' : cor }}>
          {estado === 'concluido' ? '✓' : icone}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--charcoal)' }}>{titulo}</div>
          <div style={{ fontSize:13, color: corEstado, fontWeight: 600, marginTop: 2 }}>
            {estado === 'concluido' ? '✓ Concluído' : estado === 'em_curso' ? 'Em curso...' : 'Por fazer'}
          </div>
        </div>
        <span style={{ fontSize: 20, color: cor, transform: aberto ? 'rotate(90deg)' : 'rotate(0)', transition: '0.2s' }}>›</span>
      </button>
      {aberto && (
        <div style={{ borderTop: `2px solid ${cor}`, padding: '14px 16px', background: '#fdfcfb' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// VISTA DO ALUNO — lista de aulas
// ════════════════════════════════════════════════════════════════
export function AlunoView({ aluno }: { aluno: Aluno }) {
  const [planoAtivo, setPlanoAtivo] = useState<PlanoAula | null>(null);
  const [vista, setVista] = useState<'aulas' | 'recuperacao' | 'perfil'>('aulas');
  const [planos, setPlanos] = useState<PlanoAula[]>(() =>
    getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado')
  );

  // Sincronizar com Sheets ao entrar — garante que o aluno vê sempre a versão mais recente
  useEffect(() => {
    import('../backend').then(({ sincronizarDoSheets }) => {
      sincronizarDoSheets(aluno.turmaId).then(() => {
        setPlanos(getPlanosAulaPorTurma(aluno.turmaId).filter(p => p.estado === 'publicado'));
      }).catch(() => {});
    });
  }, [aluno.turmaId]);

  if (planoAtivo) return <VistaDePlanoAluno plano={planoAtivo} aluno={aluno} onVoltar={() => setPlanoAtivo(null)} />;

  return (
    <div>
      <div style={S.card}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Olá, {aluno.nome || `Aluno ${aluno.numero}`}!</div>
        <div style={S.muted}>{aluno.turmaId} · {aluno.ano}º ano</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button onClick={() => setVista('aulas')} className={`tab-btn${vista === 'aulas' ? ' active' : ''}`} style={{ flex: 1 }}>
          📅 Aulas
        </button>
        <button onClick={() => setVista('recuperacao')} className={`tab-btn${vista === 'recuperacao' ? ' active' : ''}`} style={{ flex: 1 }}>
          🔄 Recuperação
        </button>
        <button onClick={() => setVista('perfil')} className={`tab-btn${vista === 'perfil' ? ' active' : ''}`} style={{ flex: 1 }}>
          🪪 Perfil
        </button>
      </div>

      {vista === 'recuperacao' ? (
        <RecuperacaoModulosAluno aluno={aluno} />
      ) : vista === 'perfil' ? (
        <PerfilProfissionalAluno aluno={aluno} />
      ) : (
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Aulas disponíveis</div>
          {planos.length === 0 && <div style={S.muted}>Ainda não há aulas publicadas.</div>}
          {planos.map(p => {
            const d = new Date(p.data + 'T12:00:00');
            return (
              <div key={p.id} onClick={() => setPlanoAtivo(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 6, cursor: 'pointer', background: '#fff' }}>
                <div style={{ background: 'var(--copper-pale)', borderRadius: 8, padding: '6px 8px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--copper)', lineHeight: 1 }}>{d.getDate().toString().padStart(2, '0')}</div>
                  <div style={{ fontSize:12, color: 'var(--copper)', textTransform: 'uppercase', fontWeight: 600 }}>{d.toLocaleDateString('pt-PT', { month: 'short' })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.titulo}</div>
                  <div style={S.muted}>{p.horaInicio}–{p.horaFim}{p.ucId ? ` · ${p.ucId}` : ''}</div>
                  {p.ucNome && <div style={{ fontSize:13, color: 'var(--copper)' }}>{p.ucNome}</div>}
                </div>
                <span style={{ fontSize:13, color: 'var(--copper)', fontWeight: 600 }}>→</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// VISTA DEDICADA — um plano de aula com acordeão
// ════════════════════════════════════════════════════════════════
function VistaDePlanoAluno({ plano, aluno, onVoltar }: { plano: PlanoAula; aluno: Aluno; onVoltar: () => void }) {
  const [secAberta, setSecAberta] = useState<string>('entrada');
  const fichas = getFichasPorPlano(plano.id);
  const requisicao = getRequisicaoPorPlano(plano.id);
  const [entradaConcluida, setEntradaConcluida] = useState(false);
  const [fichaConcluida, setFichaConcluida] = useState(false);
  const [avaliacaoConcluida, setAvaliacaoConcluida] = useState(false);

  function abrirFechar(id: string) {
    setSecAberta(s => s === id ? '' : id);
  }

  return (
    <div>
      {/* Cabeçalho do plano */}
      <div style={{ background: 'var(--charcoal)', borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
        <button onClick={onVoltar} style={{ background: 'rgba(247,241,230,0.6)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'rgba(247,241,230,0.6)', fontSize:13, cursor: 'pointer', marginBottom: 10 }}>
          ← Voltar
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--cream)' }}>{plano.titulo}</div>
        <div style={{ fontSize:13, color: 'rgba(247,241,230,0.5)', marginTop: 2 }}>{plano.data} · {plano.horaInicio}–{plano.horaFim}</div>
        {plano.ucId && (
          <div style={{ marginTop: 8, padding: '5px 10px', background: 'rgba(181,101,29,0.25)', borderRadius: 8, display: 'inline-block' }}>
            <span style={{ fontSize:13, color: 'rgba(247,241,230,0.5)', textTransform: 'uppercase' }}>UC </span>
            <span style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 700 }}>{plano.ucId}</span>
            {plano.ucNome && <span style={{ fontSize:13, color: 'rgba(247,241,230,0.6)', marginLeft: 6 }}>{plano.ucNome}</span>}
          </div>
        )}
      </div>

      {/* ── ACORDEÃO 1 — ENTRADA ────────────────────────── */}
      <Acordeao id="entrada" aberto={secAberta === 'entrada'} titulo="Entrada e Higiene" icone="🪪"
        cor="var(--copper)" estado={entradaConcluida ? 'concluido' : secAberta === 'entrada' ? 'em_curso' : 'pendente'}
        onClick={() => abrirFechar('entrada')}>
        <SecaoEntrada aluno={aluno} plano={plano} onConcluido={() => { setEntradaConcluida(true); setSecAberta('ficha'); }} />
      </Acordeao>

      {/* ── ACORDEÃO 2 — FICHA DE PRODUÇÃO ─────────────── */}
      <Acordeao id="ficha" aberto={secAberta === 'ficha'} titulo={`Ficha${fichas.length > 1 ? 's' : ''} de Produção (${fichas.length})`} icone="📄"
        cor="var(--copper)" estado={fichaConcluida ? 'concluido' : secAberta === 'ficha' ? 'em_curso' : 'pendente'}
        onClick={() => abrirFechar('ficha')}>
        <SecaoFichas fichas={fichas} plano={plano} aluno={aluno} onConcluido={() => { setFichaConcluida(true); setSecAberta('requisicao'); }} />
      </Acordeao>

      {/* ── ACORDEÃO 3 — REQUISIÇÃO ─────────────────────── */}
      <Acordeao id="requisicao" aberto={secAberta === 'requisicao'} titulo="Requisição da Aula" icone="🛒"
        cor="#2980b9" estado={requisicao ? 'concluido' : 'pendente'}
        onClick={() => abrirFechar('requisicao')}>
        {requisicao ? (
          <SecaoRequisicao requisicao={requisicao} onConcluido={() => setSecAberta('avaliacao')} />
        ) : (
          <div>
            <div style={S.muted}>A requisição ainda não foi criada pelo professor.</div>
            <button style={S.verde} onClick={() => setSecAberta('avaliacao')}>Continuar para a Avaliação →</button>
          </div>
        )}
      </Acordeao>

      {/* ── ACORDEÃO 4 — COMPETÊNCIAS E AUTOAVALIAÇÃO ───── */}
      <Acordeao id="avaliacao" aberto={secAberta === 'avaliacao'} titulo="Competências e Autoavaliação" icone="🎯"
        cor="#8e44ad" estado={avaliacaoConcluida ? 'concluido' : secAberta === 'avaliacao' ? 'em_curso' : 'pendente'}
        onClick={() => abrirFechar('avaliacao')}>
        <SecaoAvaliacao plano={plano} aluno={aluno} fichas={fichas} onConcluido={() => { setAvaliacaoConcluida(true); setSecAberta(''); }} />
      </Acordeao>

      {/* Resumo final */}
      {avaliacaoConcluida && (
        <div style={{ ...S.card, textAlign: 'center', padding: 24, background: 'var(--sage-pale)', border: '1px solid rgba(90,122,78,0.3)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--sage)', marginBottom: 4 }}>Aula concluída!</div>
          <div style={S.muted}>O professor vai validar a tua autoavaliação.</div>
          <button style={{ ...S.verde, marginTop: 12 }} onClick={onVoltar}>Voltar às aulas</button>
        </div>
      )}
    </div>
  );
}

// ── Secção 1 — Entrada ───────────────────────────────────────
function SecaoEntrada({ aluno, plano, onConcluido }: { aluno: Aluno; plano: PlanoAula; onConcluido: () => void }) {
  const [pontVal, setPontVal] = useState<'sim' | 'atras' | null>(null);
  const [pontMins, setPontMins] = useState(0);
  const [fardState, setFardState] = useState<Record<string, boolean | null>>(Object.fromEntries(FARD_ITEMS.map(f => [f, null])));
  const fardCompleto = Object.values(fardState).every(v => v !== null);
  const entradaOk = pontVal !== null && fardCompleto;

  function setPont(v: 'sim' | 'atras') {
    setPontVal(v);
    if (v === 'atras') {
      const now = new Date();
      const [h, m] = plano.horaInicio.split(':').map(Number);
      setPontMins(Math.max(1, (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m)));
    }
  }

  function confirmar() {
    if (pontVal === 'atras') incHist(`ecl_atrasos_${aluno.id}`);
    const fardamentoOk = Object.values(fardState).every(v => v === true);
    addRegistoPresenca({
      alunoId: aluno.id,
      turmaId: aluno.turmaId,
      planoAulaId: plano.id,
      presente: true,
      atrasado: pontVal === 'atras',
      atrasadoMins: pontVal === 'atras' ? pontMins : 0,
      fardamentoOk,
    });
    onConcluido();
  }

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Pontualidade</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['sim', 'atras'] as const).map(v => (
          <button key={v} onClick={() => setPont(v)} style={{ flex: 1, padding: '12px 6px', borderRadius: 10, fontSize: 12, cursor: 'pointer', textAlign: 'center', border: '1px solid var(--border)', background: pontVal === v ? (v === 'sim' ? 'var(--sage-pale)' : 'var(--copper-pale)') : '#fff', color: pontVal === v ? (v === 'sim' ? 'var(--sage)' : 'var(--copper)') : 'rgba(26,23,20,0.5)', fontWeight: 600 }}>
            <div style={{ fontSize: 22, marginBottom: 3 }}>{v === 'sim' ? '✓' : '◷'}</div>
            {v === 'sim' ? 'Cheguei a horas' : 'Cheguei atrasado/a'}
          </button>
        ))}
      </div>

      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Fardamento e higiene pessoal</div>
      <div style={S.muted}>Confirma cada item honestamente.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 8, marginBottom: 14 }}>
        {FARD_ITEMS.map(item => {
          const v = fardState[item];
          return (
            <div key={item} onClick={() => setFardState(p => { const vv = p[item]; return { ...p, [item]: vv === null ? true : vv === true ? false : null }; })} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', fontSize:13, border: '1px solid var(--border)', background: v === true ? 'var(--sage-pale)' : v === false ? 'var(--danger-pale)' : 'var(--cream-dark)', color: v === true ? 'var(--sage)' : v === false ? 'var(--danger)' : 'rgba(26,23,20,0.5)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: v === true ? 'var(--sage)' : v === false ? 'var(--danger)' : 'rgba(26,23,20,0.55)' }} />
              <span style={{ flex: 1 }}>{item}</span>
            </div>
          );
        })}
      </div>

      <button style={{ ...S.verde, opacity: entradaOk ? 1 : 0.4 }} disabled={!entradaOk} onClick={confirmar}>
        Confirmar entrada →
      </button>
    </div>
  );
}

// ── Secção 2 — Fichas de Produção ────────────────────────────
function SecaoFichas({ fichas, plano, aluno, onConcluido }: { fichas: FichaProducao[]; plano: PlanoAula; aluno: Aluno; onConcluido: () => void }) {
  const [fichaAberta, setFichaAberta] = useState<string | null>(fichas[0]?.id || null);
  // checklist[fichaId] = { ingredientesConfirmados: Set, passosConcluidos: Set }
  const [checklist, setChecklist] = useState<Record<string, { ing: Set<number>; passo: Set<number> }>>(() => {
    const inicial: Record<string, { ing: Set<number>; passo: Set<number> }> = {};
    fichas.forEach(f => {
      const existente = getChecklistAlunoFicha(plano.id, f.id, aluno.id);
      inicial[f.id] = {
        ing: new Set((existente?.ingredientesConfirmados || []).map(Number)),
        passo: new Set((existente?.passosConcluidos || []).map(Number)),
      };
    });
    return inicial;
  });

  function guardarChecklist(fichaId: string, novoIng?: Set<number>, novoPasso?: Set<number>) {
    setChecklist(prev => {
      const actual = prev[fichaId] || { ing: new Set<number>(), passo: new Set<number>() };
      const next = { ing: novoIng || actual.ing, passo: novoPasso || actual.passo };
      addOrUpdateChecklistAluno({
        id: `chk_${plano.id}_${fichaId}_${aluno.id}`,
        planoAulaId: plano.id,
        fichaId,
        alunoId: aluno.id,
        pontualidade: 'a_horas', // pontualidade real já registada separadamente via addRegistoPresenca
        fardamento: true, // idem — fardamento real já registado via addRegistoPresenca
        itensFardamento: [],
        ingredientesConfirmados: Array.from(next.ing).map(String),
        passosConcluidos: Array.from(next.passo).map(String),
        haccpConfirmado: [],
        haccpRegistado: false,
        atualizadoEm: new Date().toISOString(),
      });
      return { ...prev, [fichaId]: next };
    });
  }

  function toggleIngrediente(fichaId: string, idx: number) {
    const actual: { ing: Set<number>; passo: Set<number> } = checklist[fichaId] || { ing: new Set<number>(), passo: new Set<number>() };
    const novo = new Set<number>(actual.ing);
    if (novo.has(idx)) novo.delete(idx); else novo.add(idx);
    guardarChecklist(fichaId, novo, undefined);
  }

  function togglePasso(fichaId: string, idx: number) {
    const actual: { ing: Set<number>; passo: Set<number> } = checklist[fichaId] || { ing: new Set<number>(), passo: new Set<number>() };
    const novo = new Set<number>(actual.passo);
    if (novo.has(idx)) novo.delete(idx); else novo.add(idx);
    guardarChecklist(fichaId, undefined, novo);
  }

  if (fichas.length === 0) {
    return (
      <div>
        <div style={S.muted}>Não há fichas de produção para esta aula.</div>
        <button style={S.verde} onClick={onConcluido}>Continuar →</button>
      </div>
    );
  }

  return (
    <div>
      {fichas.map((f, fi) => (
        <div key={f.id} style={{ marginBottom: 10 }}>
          {/* Cabeçalho da ficha */}
          <button onClick={() => setFichaAberta(fichaAberta === f.id ? null : f.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${fichaAberta === f.id ? 'var(--copper)' : 'var(--border)'}`, background: fichaAberta === f.id ? 'var(--copper-pale)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 18 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{f.nomePrato}</div>
              <div style={{ fontSize:13, color: 'rgba(26,23,20,0.5)' }}>{f.classificacao} · {f.numPorcoes} doses</div>
            </div>
            <span style={{ fontSize: 16, color: 'var(--copper)' }}>{fichaAberta === f.id ? '▲' : '▼'}</span>
          </button>

          {fichaAberta === f.id && (
            <div style={{ padding: '12px 14px', background: '#fdfcfb', borderRadius: '0 0 10px 10px', border: '1px solid var(--border)', borderTop: 'none' }}>
              {/* Botão imprimir/ver ficha completa — sempre visível quando há HTML gerado */}
              {(f as any).htmlCompleto && (
                <button className="btn btn-ghost btn-block" style={{ marginBottom: 12 }}
                  onClick={() => {
                    const win = window.open('', '_blank');
                    if (win) { win.document.write((f as any).htmlCompleto); win.document.close(); }
                  }}>
                  🖨️ Ver / Imprimir Ficha Completa
                </button>
              )}
              {(!f.ingredientes || f.ingredientes.length === 0) && (!f.preparacao || f.preparacao.length === 0) && !(f as any).htmlCompleto && (
                <div style={{ padding: '10px 12px', background: 'var(--copper-pale)', borderRadius: 8, fontSize: 12, color: 'var(--copper)', marginBottom: 10 }}>
                  ⚠️ Esta ficha foi sincronizada sem os detalhes de ingredientes/preparação. Pede ao professor para confirmar no dispositivo onde a criou.
                </div>
              )}
              {/* Ingredientes */}
              {f.ingredientes?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, color: 'var(--copper)' }}>Ingredientes</div>
                  {f.ingredientes.map((ing, i) => {
                    const marcado = checklist[f.id]?.ing.has(i) || false;
                    return (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', marginBottom: 4, background: marcado ? 'var(--sage-pale)' : '#fff', cursor: 'pointer', fontSize: 12 }}>
                        <input type="checkbox" checked={marcado} onChange={() => toggleIngrediente(f.id, i)} style={{ accentColor: 'var(--sage)' }} />
                        <strong style={{ textDecoration: marcado ? 'line-through' : 'none' }}>{ing.qt} {ing.un}</strong> <span style={{ textDecoration: marcado ? 'line-through' : 'none' }}>{ing.produto}</span>
                        {ing.componente && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--sage)', background: 'var(--sage-pale)', borderRadius: 10, padding: '1px 7px', marginLeft: 'auto' }}>
                            {ing.componente}
                          </span>
                        )}
                        {ing.obs && <span style={{ fontSize:13, color: 'var(--copper)' }}>{ing.obs}</span>}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Passos */}
              {f.preparacao?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, color: 'var(--copper)' }}>Preparação</div>
                  {f.preparacao.map((p, i) => {
                    const marcado = checklist[f.id]?.passo.has(i) || false;
                    return (
                      <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px', borderRadius: 7, border: '1px solid var(--border)', marginBottom: 4, background: marcado ? 'var(--sage-pale)' : '#fff', cursor: 'pointer', fontSize: 12 }}>
                        <input type="checkbox" checked={marcado} onChange={() => togglePasso(f.id, i)} style={{ accentColor: 'var(--sage)', marginTop: 2, flexShrink: 0 }} />
                        <div style={{ textDecoration: marcado ? 'line-through' : 'none' }}>
                          <strong>{p.num}.</strong> {p.descricao}
                          {p.temperatura && <span style={{ fontSize:13, color: '#2980b9', marginLeft: 6 }}>🌡 {p.temperatura}</span>}
                          {p.haccp && <div style={{ fontSize:13, color: 'var(--danger)', marginTop: 2 }}>⚠️ {p.haccp}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Guia de Apoio */}
              {(f as any).textoGuia && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, color: 'var(--sage)' }}>📚 Guia de Apoio à Produção</div>
                  <GuiaProducao textoGuia={(f as any).textoGuia} nomePrato={f.nomePrato || ''} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button style={S.verde} onClick={onConcluido}>Concluí a ficha → Continuar</button>
    </div>
  );
}

// ── Secção 3 — Requisição ────────────────────────────────────
function SecaoRequisicao({ requisicao, onConcluido }: { requisicao: any; onConcluido: () => void }) {
  return (
    <div>
      <div style={S.muted}>Ingredientes a requisitar para esta aula.</div>
      <div style={{ overflowX: 'auto', marginTop: 10, marginBottom: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#2980b9', color: 'white' }}>
              <th style={{ padding: '7px 10px', textAlign: 'left' }}>Produto</th>
              <th style={{ padding: '7px 6px', textAlign: 'right' }}>Quantidade</th>
              <th style={{ padding: '7px 6px', textAlign: 'left' }}>Un.</th>
            </tr>
          </thead>
          <tbody>
            {(requisicao.linhas || []).map((l: any, i: number) => (
              <tr key={l.id || i} style={{ background: i % 2 === 0 ? '#fff' : 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '7px 10px' }}>{l.produto}</td>
                <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 600 }}>{l.quantidadeTotal}</td>
                <td style={{ padding: '7px 6px', color: 'rgba(26,23,20,0.5)' }}>{l.unidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button style={S.verde} onClick={onConcluido}>Continuar para a Avaliação →</button>
    </div>
  );
}

// ── Secção 4 — Competências e Autoavaliação ──────────────────
function SecaoAvaliacao({ plano, aluno, fichas, onConcluido }: { plano: PlanoAula; aluno: Aluno; fichas: FichaProducao[]; onConcluido: () => void }) {
  const ucId = plano.ucId || '';
  const compRemovidas: string[] = (plano as any).compRemovidas || [];

  const microsDaUCEspecificas = ucId ? microsPorUC(ucId) : [];
  const microsEstruturantes = MICROCOMPETENCIAS.filter(m => m.prioridade === 'A');
  const microsDaUC = microsDaUCEspecificas.length >= 3
    ? microsDaUCEspecificas
    : [...microsDaUCEspecificas, ...microsEstruturantes.filter(m => !microsDaUCEspecificas.find(x => x.id === m.id))].slice(0, 8);

  const microsSugeridas = microsDaUC
    .filter(m => !compRemovidas.includes(m.id))
    .slice(0, 6)
    .map(m => {
      const hist = getHistoricoAlunoMicro(aluno.id, m.id);
      const avaliacoes = hist.map(h => ({ nota: h.nota, data: h.data }));
      const consolidada = jaTeveSucesso(avaliacoes);
      const emRegressao = estaEmRegressao(avaliacoes);
      let prioridade = 4;
      let motivo = '';
      if (emRegressao) { prioridade = 1; motivo = '⚠️ Em regressão'; }
      else if (avaliacoes.length === 0) { prioridade = 2; motivo = '★ Nunca avaliada'; }
      else if (!consolidada) { prioridade = 3; motivo = '↑ Em desenvolvimento'; }
      else { motivo = '✓ Consolidada'; }
      const media = avaliacoes.length > 0 ? avaliacoes.slice(-3).reduce((s, a) => s + a.nota, 0) / Math.min(3, avaliacoes.length) : 0;
      return { ...m, prioridade, motivo, consolidada, avaliacoes, media };
    })
    .sort((a, b) => a.prioridade - b.prioridade);

  // Estados
  const [nivelHigiene, setNivelHigiene] = useState<string | null>(null);
  const [nivelHaccp, setNivelHaccp] = useState<string | null>(null);
  const [microAberta, setMicroAberta] = useState<string | null>(null);
  const [notasMicro, setNotasMicro] = useState<Record<string, string | null>>({});
  const [criteriosResp, setCriteriosResp] = useState<Record<string, string | null>>({});
  const [atitudeEscolhida, setAtitudeEscolhida] = useState<string | null>(null);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [submetido, setSubmetido] = useState(() => {
    try { return !!localStorage.getItem(`avaliacao_submetida_${plano.id}_${aluno.id}`); } catch { return false; }
  });

  const OPCOES_AUTO = [
    { v: 'sozinho', label: 'Consigo sozinho/a', cor: 'var(--sage-pale)', txt: 'var(--sage)', emoji: '💪' },
    { v: 'ajuda', label: 'Consigo com ajuda', cor: 'var(--copper-pale)', txt: 'var(--copper)', emoji: '🤝' },
    { v: 'nao', label: 'Ainda não consigo', cor: 'var(--danger-pale)', txt: 'var(--danger)', emoji: '📖' },
  ];

  const prontoParaSubmeter = nivelHigiene !== null && nivelHaccp !== null;

  function submeter() {
    const agora = new Date().toISOString();
    // Mapear nível do aluno (sozinho/ajuda/nao) → NivelAuto do sistema de validação
    const paraNivelAuto = (v: string | null): 'nao_atingi' | 'desenvolvimento' | 'atingi' | 'superei' =>
      v === 'sozinho' ? 'atingi' : v === 'ajuda' ? 'desenvolvimento' : 'nao_atingi';

    const autoavaliacoes: { competenciaId: string; nivel: 'nao_atingi' | 'desenvolvimento' | 'atingi' | 'superei' }[] = [];

    if (nivelHigiene) {
      addRegistoAvaliacao({ id: `${plano.id}_${aluno.id}_higiene_${Date.now()}`, alunoId: aluno.id, turmaId: aluno.turmaId, planoAulaId: plano.id, fichaId: '', ucId, microcompetenciaId: 'OBR_01', nota: nivelHigiene === 'sozinho' ? 15 : nivelHigiene === 'ajuda' ? 10 : 5, data: agora, validadoPor: 'aluno' });
      autoavaliacoes.push({ competenciaId: 'OBR_01', nivel: paraNivelAuto(nivelHigiene) });
    }
    if (nivelHaccp) {
      addRegistoAvaliacao({ id: `${plano.id}_${aluno.id}_haccp_${Date.now()}`, alunoId: aluno.id, turmaId: aluno.turmaId, planoAulaId: plano.id, fichaId: '', ucId, microcompetenciaId: 'OBR_02', nota: nivelHaccp === 'sozinho' ? 15 : nivelHaccp === 'ajuda' ? 10 : 5, data: agora, validadoPor: 'aluno' });
      autoavaliacoes.push({ competenciaId: 'OBR_02', nivel: paraNivelAuto(nivelHaccp) });
    }
    (Object.entries(notasMicro) as [string, string | null][]).forEach(([microId, v]) => {
      if (v) {
        addRegistoAvaliacao({ id: `${plano.id}_${aluno.id}_${microId}_${Date.now()}`, alunoId: aluno.id, turmaId: aluno.turmaId, planoAulaId: plano.id, fichaId: '', ucId, microcompetenciaId: microId, nota: v === 'sozinho' ? 15 : v === 'ajuda' ? 10 : 5, data: agora, validadoPor: 'aluno' });
        autoavaliacoes.push({ competenciaId: microId, nivel: paraNivelAuto(v) });
      }
    });
    if (atitudeEscolhida) {
      autoavaliacoes.push({ competenciaId: atitudeEscolhida, nivel: 'atingi' });
    }
    addOrUpdateSelecao({ id: `sel_${plano.id}_${aluno.id}`, comandaId: plano.id, planoAulaId: plano.id, fichaId: '', alunoId: aluno.id, turmaId: aluno.turmaId, tecnicas: Object.keys(notasMicro), atitudes: atitudeEscolhida ? [atitudeEscolhida] : [], responsabilidades: [], autoavaliacoes, criadaEm: agora });
    onConcluido();
  }

  function submeterDefinitivo() {
    submeter();
    try { localStorage.setItem(`avaliacao_submetida_${plano.id}_${aluno.id}`, new Date().toISOString()); } catch {}
    setSubmetido(true);
    setModalConfirmar(false);
  }

  // ── Se já submeteu — mostrar resumo bloqueado ─────────────────
  if (submetido) {
    const horaSubmissao = (() => {
      try {
        const d = localStorage.getItem(`avaliacao_submetida_${plano.id}_${aluno.id}`);
        if (d) return new Date(d).toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit' });
      } catch {}
      return '';
    })();
    return (
      <div>
        <div style={{ padding:'14px', background:'var(--sage-pale)', borderRadius:12, border:'1.5px solid rgba(90,122,78,0.3)', marginBottom:14, textAlign:'center' }}>
          <div style={{ fontSize:28, marginBottom:4 }}>✓</div>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--sage)' }}>Autoavaliação submetida{horaSubmissao ? ` às ${horaSubmissao}` : ''}</div>
          <div style={{ fontSize:13, color:'rgba(26,23,20,0.55)', marginTop:4 }}>O professor vai validar o teu registo.</div>
        </div>
        <div style={{ padding:'12px 14px', background:'var(--cream-dark)', borderRadius:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(26,23,20,0.5)', textTransform:'uppercase', marginBottom:8 }}>O teu registo (só leitura):</div>
          <div style={{ fontSize:13, color:'var(--sage)' }}>🔒 Higiene pessoal: {nivelHigiene === 'sozinho' ? '💪 Sozinho/a' : nivelHigiene === 'ajuda' ? '🤝 Com ajuda' : '📖 A aprender'}</div>
          <div style={{ fontSize:13, color:'var(--sage)', marginTop:4 }}>🔒 Higiene alimentar: {nivelHaccp === 'sozinho' ? '💪 Sozinho/a' : nivelHaccp === 'ajuda' ? '🤝 Com ajuda' : '📖 A aprender'}</div>
          {Object.entries(notasMicro).filter(([,v]) => v).map(([id, v]) => {
            const m = microsSugeridas.find(x => x.id === id);
            return m ? <div key={id} style={{ fontSize:13, marginTop:4 }}>🔬 {m.nome}: {v === 'sozinho' ? '💪 Sozinho/a' : v === 'ajuda' ? '🤝 Com ajuda' : '📖 A aprender'}</div> : null;
          })}
          {atitudeEscolhida && <div style={{ fontSize:13, marginTop:4 }}>💡 Atitude: {ATITUDES.find(a => a.id === atitudeEscolhida)?.nome}</div>}
        </div>
      </div>
    );
  }

  // ── Avaliação activa ──────────────────────────────────────────
  return (
    <div>
      {/* UC e resumo de competências */}
      <div style={{ padding:'12px 14px', background:'rgba(181,101,29,0.08)', borderRadius:10, marginBottom:16, border:'1px solid rgba(181,101,29,0.2)' }}>
        {plano.ucId && <div style={{ fontSize:13, fontWeight:700, color:'var(--copper)', marginBottom:8 }}>{plano.ucId} — {plano.ucNome}</div>}
        <div style={{ fontSize:12, fontWeight:700, color:'rgba(26,23,20,0.5)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Competências desta aula:</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ fontSize:13, color:'var(--sage)', fontWeight:600 }}>🔒 Higiene pessoal · Higiene alimentar · Assiduidade</div>
          {microsSugeridas.slice(0,4).map(m => (
            <div key={m.id} style={{ fontSize:13, color:'rgba(26,23,20,0.7)' }}>
              🔬 {m.nome}{m.motivo && <span style={{ fontSize:11, color:'rgba(26,23,20,0.4)', marginLeft:6 }}>{m.motivo}</span>}
            </div>
          ))}
          <div style={{ fontSize:13, color:'rgba(142,68,173,0.8)' }}>💡 1 atitude à tua escolha</div>
        </div>
      </div>

      {/* OBRIGATÓRIAS */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sage)', marginBottom: 8 }}>🔒 Competências obrigatórias</div>
        {[
          { id: 'higiene', label: 'Higiene pessoal', val: nivelHigiene, set: setNivelHigiene },
          { id: 'haccp', label: 'Higiene e Segurança Alimentar / Registos KitchenFlow', val: nivelHaccp, set: setNivelHaccp },
        ].map(obr => (
          <div key={obr.id} style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--sage-pale)', border: '1px solid rgba(90,122,78,0.2)' }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>{obr.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
              {OPCOES_AUTO.map(op => (
                <button key={op.v} onClick={() => obr.set(op.v)} style={{ padding: '7px 4px', borderRadius: 8, border: `1.5px solid ${obr.val === op.v ? op.txt : 'var(--border)'}`, background: obr.val === op.v ? op.cor : '#fff', color: obr.val === op.v ? op.txt : 'rgba(26,23,20,0.5)', fontSize:13, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{op.emoji}</div>
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* TÉCNICAS */}
      {microsSugeridas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--copper)', marginBottom: 8 }}>🔬 Competências técnicas</div>
          {microsSugeridas.map(m => (
            <div key={m.id} style={{ marginBottom: 8, borderRadius: 10, border: `1.5px solid ${microAberta === m.id ? 'var(--copper)' : 'var(--border)'}`, overflow: 'hidden' }}>
              <button onClick={() => setMicroAberta(s => s === m.id ? null : m.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: microAberta === m.id ? 'var(--copper-pale)' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{m.nome}</div>
                  <div style={{ fontSize:13, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>{m.motivo}</div>
                </div>
                {notasMicro[m.id] && <span style={{ fontSize: 18 }}>{notasMicro[m.id] === 'sozinho' ? '💪' : notasMicro[m.id] === 'ajuda' ? '🤝' : '📖'}</span>}
                <span style={{ fontSize: 16, color: 'var(--copper)', transform: microAberta === m.id ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>›</span>
              </button>
              {microAberta === m.id && (
                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: '#fdfcfb' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 10 }}>
                    {OPCOES_AUTO.map(op => (
                      <button key={op.v} onClick={() => setNotasMicro(p => ({ ...p, [m.id]: p[m.id] === op.v ? null : op.v }))} style={{ padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${notasMicro[m.id] === op.v ? op.txt : 'var(--border)'}`, background: notasMicro[m.id] === op.v ? op.cor : '#fff', color: notasMicro[m.id] === op.v ? op.txt : 'rgba(26,23,20,0.5)', fontSize:13, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, marginBottom: 2 }}>{op.emoji}</div>
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ATITUDE */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8e44ad', marginBottom: 8 }}>💡 A tua atitude — escolhe uma</div>
        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
          {ATITUDES.filter(a => !compRemovidas.includes(a.id)).map(a => (
            <div key={a.id} onClick={() => setAtitudeEscolhida(a.id === atitudeEscolhida ? null : a.id)} style={{ padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${atitudeEscolhida === a.id ? '#8e44ad' : 'transparent'}`, background: atitudeEscolhida === a.id ? 'rgba(142,68,173,0.08)' : '#fff', cursor: 'pointer', fontSize: 12, marginBottom: 4, fontWeight: atitudeEscolhida === a.id ? 600 : 400 }}>
              {a.nome}
            </div>
          ))}
        </div>
      </div>

      {!prontoParaSubmeter && (
        <div style={{ padding: '8px 12px', background: 'var(--copper-pale)', borderRadius: 8, fontSize: 12, color: 'var(--copper)', marginBottom: 10 }}>
          Preenche as competências obrigatórias antes de submeter.
        </div>
      )}

      <button style={{ ...S.verde, opacity: prontoParaSubmeter ? 1 : 0.4 }} disabled={!prontoParaSubmeter} onClick={() => setModalConfirmar(true)}>
        ✓ Submeter autoavaliação
      </button>

      {/* Modal de confirmação */}
      {modalConfirmar && (
        <div style={{ position:'fixed', inset:0, background:'rgba(26,23,20,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:24, maxWidth:360, width:'100%' }}>
            <div style={{ fontSize:32, textAlign:'center', marginBottom:8 }}>🎯</div>
            <div style={{ fontWeight:700, fontSize:17, textAlign:'center', marginBottom:6 }}>Confirmas o teu registo?</div>
            <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', textAlign:'center', marginBottom:16 }}>
              Depois de submeter não podes alterar. Queres rever alguma coisa?
            </div>
            <div style={{ background:'var(--cream-dark)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
              <div>🔒 Higiene: {nivelHigiene === 'sozinho' ? '💪' : nivelHigiene === 'ajuda' ? '🤝' : '📖'}</div>
              <div style={{ marginTop:4 }}>🔒 HACCP: {nivelHaccp === 'sozinho' ? '💪' : nivelHaccp === 'ajuda' ? '🤝' : '📖'}</div>
              {Object.entries(notasMicro).filter(([,v]) => v).map(([id, v]) => {
                const m = microsSugeridas.find(x => x.id === id);
                return m ? <div key={id} style={{ marginTop:4 }}>🔬 {m.nome}: {v === 'sozinho' ? '💪' : v === 'ajuda' ? '🤝' : '📖'}</div> : null;
              })}
              {atitudeEscolhida && <div style={{ marginTop:4 }}>💡 {ATITUDES.find(a => a.id === atitudeEscolhida)?.nome}</div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={submeterDefinitivo}
                style={{ padding:'14px', borderRadius:12, border:'none', background:'var(--sage)', color:'white', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                ✓ Sim, confirmo este registo
              </button>
              <button onClick={() => setModalConfirmar(false)}
                style={{ padding:'12px', borderRadius:12, border:'1px solid var(--border)', background:'#fff', color:'rgba(26,23,20,0.6)', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                Voltar e rever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

