import React, { useState, useCallback, useEffect } from 'react';
import { inicializarCompat } from './compatECL';
import { loadLibrary } from './libraryService';
import { Perfil, Aluno, PlanoAula as TPlanoAula } from './types';
import { Login } from './components/Login';
import { ManualCozinheiro } from './components/ManualCozinheiro';
import { Header, LayoutProfessor, VistaProf } from './components/Header';
import ProfessorView from './components/ProfessorView';
import { AlunoView } from './components/AlunoView';
import { ValidacaoView } from './components/ValidacaoView';
import { CoordenadoraView } from './components/CoordenadoraView';
import PlanoAula from './components/PlanoAula';
import { VistaDePlano } from './components/VistaDePlano';
import { AvaliacaoPorUC } from './components/AvaliacaoPorUC';
import { MomentosAvaliacao } from './components/MomentosAvaliacao';
import Requisicao from './components/Requisicao';

// Wrapper Orçamentos — fichas e requisições sem plano
function OrcamentosView({ turmaId, nomeProfessor, onAlteracao, onGuardado }: {
  turmaId: string; nomeProfessor: string;
  onAlteracao: () => void; onGuardado: () => void;
}) {
  const [tab, setTab] = React.useState<'fichas' | 'requisicoes'>('fichas');
  return (
    <div>
      <div style={{ background: '#fff7ed', borderRadius: 14, padding: '14px 16px',
        marginBottom: 14, border: '1.5px solid #fcd34d' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e', marginBottom: 4 }}>💰 Orçamentos</div>
        <div style={{ fontSize: 13, color: '#78350f' }}>
          Fichas e requisições <strong>sem ligação a plano de aula</strong> — para calcular custos e preparar produções.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {([
          { id: 'fichas',      label: '📄 Fichas Técnicas' },
          { id: 'requisicoes', label: '🛒 Requisições' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
              background: tab === t.id ? '#b5651d' : 'rgba(26,23,20,0.06)',
              color: tab === t.id ? '#fff' : 'rgba(26,23,20,0.6)' }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'fichas' && (
        <ProfessorView turmaId={turmaId} nomeProfessor={nomeProfessor}
          onAlteracao={onAlteracao} onGuardado={onGuardado} />
      )}
      {tab === 'requisicoes' && (
        <Requisicao nomeProfessor={nomeProfessor} turmaId={turmaId} />
      )}
    </div>
  );
}
import { FichaRegistoUC } from './components/FichaRegistoUC';

// Wrapper que combina Historial + Momentos + Ficha de Registo
function HistorialView({ turmaId }: { turmaId: string }) {
  const [tab, setTab] = React.useState<'historial' | 'momentos' | 'ficha'>('historial');
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {([
          { id: 'historial', label: '📊 Historial' },
          { id: 'momentos',  label: '📐 Momentos' },
          { id: 'ficha',     label: '📋 Ficha de Registo' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: tab === t.id ? 700 : 400, minWidth: 80,
              background: tab === t.id ? '#b5651d' : 'rgba(26,23,20,0.06)',
              color: tab === t.id ? '#fff' : 'rgba(26,23,20,0.6)' }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'historial' && <AvaliacaoPorUC turmaId={turmaId} />}
      {tab === 'momentos'  && <MomentosAvaliacao turmaId={turmaId} />}
      {tab === 'ficha'     && <FichaRegistoUC turmaId={turmaId} />}
    </div>
  );
}
import { CopiaSegurancaView } from './components/CopiaSeguranca';
import { GestaoRecuperacoes } from './components/GestaoRecuperacoes';
import { MapaCompetencias } from './components/MapaCompetencias';
import { CentroAvisos } from './components/CentroAvisos';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EventosWizard } from './components/EventosWizard';
import { CronogramaTab } from './components/CronogramaTab';
import { sincronizarDoSheets, getEstadoSync, addAluno, seedHistorialTeste, seedPlanoTeste, getTurmas, seedAlunosReais } from './backend';

function ModalGuardar({ mensagem, onGuardar, onDescartar, onCancelar }: {
  mensagem: string; onGuardar: () => void; onDescartar: () => void; onCancelar: () => void;
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,23,20,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:340, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>⚠️</div>
        <div style={{ fontWeight:700, fontSize:16, textAlign:'center', marginBottom:8 }}>Tens alterações por guardar</div>
        <div style={{ fontSize:13, color:'rgba(26,23,20,0.6)', textAlign:'center', marginBottom:20 }}>{mensagem}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <button onClick={onGuardar} style={{ padding:'12px', borderRadius:10, border:'none', background:'var(--sage)', color:'white', fontWeight:700, fontSize:14, cursor:'pointer' }}>✓ Guardar antes de sair</button>
          <button onClick={onDescartar} style={{ padding:'10px', borderRadius:10, border:'1px solid var(--border)', background:'#fff', color:'var(--danger)', fontWeight:600, fontSize:13, cursor:'pointer' }}>Descartar alterações</button>
          <button onClick={onCancelar} style={{ padding:'10px', borderRadius:10, border:'none', background:'transparent', color:'rgba(26,23,20,0.5)', fontSize:13, cursor:'pointer' }}>Cancelar — ficar aqui</button>
        </div>
      </div>
    </div>
  );
}

function AppInterno() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmaId, setTurmaId] = useState<string>('1º ACP');
  const [nomeProfessor, setNomeProfessor] = useState<string>('');
  const [planoAberto, setPlanoAberto] = useState<TPlanoAula | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [planoEmPausa, setPlanoEmPausa] = useState<TPlanoAula | null>(null);
  const [vistaGlobal, setVistaGlobal] = useState<VistaProf>('planos');
  const [planoIdAlvo, setPlanoIdAlvo] = useState<string | null>(null);
  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<(() => void) | null>(null);
  const [guardarCallback, setGuardarCallback] = useState<(() => void) | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalMensagem, setModalMensagem] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'offline'>('idle');

  function atualizarDados() {
    if (!turmaId) return;
    setSyncStatus('syncing');
    sincronizarDoSheets(turmaId)
      .then(() => { setSyncStatus('ok'); setRefreshKey(k => k + 1); })
      .catch(() => setSyncStatus('offline'));
  }

  useEffect(() => {
    // Carregar biblioteca pedagógica V10 e inicializar compatECL
    loadLibrary()
      .then(() => {
        inicializarCompat();
        console.log('[App] Biblioteca V10 carregada.');
      })
      .catch(e => console.error('[App] Erro ao carregar biblioteca:', e));
    getTurmas();
    // Sincronizar dados do Sheets ao arrancar — garante dados actualizados em qualquer dispositivo
    sincronizarDoSheets(turmaId).catch(e => console.warn('[App] Sync inicial falhou:', e));
    seedAlunosReais(); // popula alunos reais se ainda não existirem
    // seedAlunosTeste/seedHistorialTeste/seedPlanoTeste removidos — não injectar dados de teste em produção
  }, []);

  useEffect(() => {
    if (perfil === 'professor' && turmaId) {
      const { temSheets } = getEstadoSync();
      if (temSheets) atualizarDados();
    }
  }, [perfil, turmaId]);

  const registarAlteracao = useCallback((guardar?: () => void) => {
    setTemAlteracoes(true);
    if (guardar) setGuardarCallback(() => guardar);
  }, []);

  const limparAlteracoes = useCallback(() => {
    setTemAlteracoes(false);
    setGuardarCallback(null);
  }, []);

  function navegarCom(acao: () => void, mensagem?: string) {
    if (temAlteracoes) {
      setAcaoPendente(() => acao);
      setModalMensagem(mensagem || 'Se saíres agora perdes o que estás a preencher.');
      setModalAberto(true);
    } else {
      acao();
    }
  }

  function abrirPlano(plano: TPlanoAula) {
    navegarCom(() => { setPlanoAberto(plano); setPlanoEmPausa(null); limparAlteracoes(); });
  }

  function fecharPlano() {
    navegarCom(() => { setPlanoAberto(null); setPlanoEmPausa(null); limparAlteracoes(); setVistaGlobal('planos'); });
  }

  function irPara(vista: VistaProf) {
    if (vista === vistaGlobal && !planoAberto) return;
    navegarCom(() => {
      if (planoAberto) setPlanoEmPausa(planoAberto);
      setPlanoAberto(null);
      limparAlteracoes();
      setVistaGlobal(vista);
    });
  }

  function handleLogin(perfilRecebido: Perfil, alunoId?: string, turmaIdRecebida?: string, nomeUser?: string) {
    setPerfil(perfilRecebido);
    if (turmaIdRecebida) {
      setTurmaId(turmaIdRecebida);
      // Sincronizar dados desta turma ao fazer login
      sincronizarDoSheets(turmaIdRecebida).catch(() => {});
    }
    if (nomeUser) setNomeProfessor(nomeUser);
    if (perfilRecebido === 'aluno' && alunoId) {
      const partes = alunoId.split('-');
      const numero = parseInt(partes[partes.length - 1], 10) || 0;
      const tId = turmaIdRecebida || turmaId || '1º ACP';
      // Derivar ano do turmaId — '1º ACP' → 1, '2º ACP' → 2, '3º ACP' → 3
      const anoMatch = tId.match(/[123]/);
      const ano = anoMatch ? (parseInt(anoMatch[0]) as 1|2|3) : 1;
      const novoAluno: Aluno = { id: alunoId, turmaId: tId, numero, ano };
      setAluno(novoAluno);
      addAluno(novoAluno);
    }
  }

  function sair() {
    navegarCom(() => {
      setPerfil(null); setAluno(null); setNomeProfessor('');
      setPlanoAberto(null); setVistaGlobal('planos'); limparAlteracoes();
    }, 'Se saíres agora perdes o que estás a preencher.');
  }

  if (!perfil) return <Login onLogin={handleLogin} />;

  // ── Vista Professor ──────────────────────────────────────────────────────
  if (perfil === 'professor') {
    return (
      <LayoutProfessor
        vistaAtiva={vistaGlobal}
        onNavegar={irPara}
        nomeProfessor={nomeProfessor}
        onSair={sair}
        syncStatus={syncStatus}
        onAtualizar={atualizarDados}
        contextoPainel={{
          turmaId,
          nomeProfessor,
          plano: planoAberto || undefined,
          ucId: planoAberto?.ucId,
        }}
      >
        {modalAberto && (
          <ModalGuardar mensagem={modalMensagem}
            onGuardar={() => { setModalAberto(false); if (guardarCallback) guardarCallback(); limparAlteracoes(); if (acaoPendente) acaoPendente(); setAcaoPendente(null); }}
            onDescartar={() => { setModalAberto(false); limparAlteracoes(); if (acaoPendente) acaoPendente(); setAcaoPendente(null); }}
            onCancelar={() => { setModalAberto(false); setAcaoPendente(null); }}
          />
        )}

        {/* Plano em pausa */}
        {planoEmPausa && !planoAberto && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#fef3c7', borderRadius:10, marginBottom:12, border:'1px solid #fcd34d' }}>
            <span style={{ fontSize:13, color:'#92400e', flex:1 }}>
              📋 Tens o plano "{planoEmPausa.titulo}" em pausa
            </span>
            <button onClick={() => setPlanoAberto(planoEmPausa)}
              style={{ fontSize:12, padding:'5px 12px', borderRadius:8, border:'none', background:'#f59e0b', color:'white', fontWeight:600, cursor:'pointer' }}>
              ← Voltar ao plano
            </button>
          </div>
        )}

        {/* Conteúdo da vista activa */}
        {planoAberto ? (
          <VistaDePlano
            key={refreshKey}
            plano={planoAberto}
            turmaId={turmaId}
            nomeProfessor={nomeProfessor}
            onVoltar={fecharPlano}
            onPlanoActualizado={(p: any) => setPlanoAberto(p)}
            onAlteracao={registarAlteracao}
            onGuardado={limparAlteracoes}
          />
        ) : (
          <>
            {vistaGlobal === 'planos' && (
              <PlanoAula key={refreshKey} turmaId={turmaId} nomeProfessor={nomeProfessor}
                onAlteracao={registarAlteracao}
                onGuardado={(p?: TPlanoAula) => { limparAlteracoes(); if (p) abrirPlano(p); }}
                planoIdInicial={planoIdAlvo || undefined}
                onPlanoIdInicialUsado={() => setPlanoIdAlvo(null)} />
            )}
            {vistaGlobal === 'ficha' && (
              <ProfessorView turmaId={turmaId} nomeProfessor={nomeProfessor}
                onAlteracao={registarAlteracao} onGuardado={limparAlteracoes} />
            )}
            {vistaGlobal === 'guia' && (
              <ProfessorView turmaId={turmaId} nomeProfessor={nomeProfessor}
                modoGuia={true} onAlteracao={registarAlteracao} onGuardado={limparAlteracoes} />
            )}
            {vistaGlobal === 'requisicao' && <Requisicao nomeProfessor={nomeProfessor} turmaId={turmaId} />}
            {/* Novos items do menu */}
            {vistaGlobal === 'orcamentos' && (
              <OrcamentosView turmaId={turmaId} nomeProfessor={nomeProfessor}
                onAlteracao={registarAlteracao} onGuardado={limparAlteracoes} />
            )}
            {vistaGlobal === 'historial' && <HistorialView turmaId={turmaId} />}
            {vistaGlobal === 'ajuda' && <AjudaProfessor />}
            {vistaGlobal === 'validacao' && <ValidacaoView turmaId={turmaId} />}
            {vistaGlobal === 'manual' && <ManualCozinheiro modoProf={true} nomeProfessor={nomeProfessor} />}
            {vistaGlobal === 'biblioteca' && (
              <ProfessorView turmaId={turmaId} nomeProfessor={nomeProfessor}
                onAlteracao={registarAlteracao} onGuardado={limparAlteracoes} />
            )}
            {vistaGlobal === 'avaliacao_uc' && <AvaliacaoPorUC turmaId={turmaId} />}
            {vistaGlobal === 'copia_seguranca' && <CopiaSegurancaView />}
            {vistaGlobal === 'gestao_recuperacoes' && <GestaoRecuperacoes turmaId={turmaId} nomeProfessor={nomeProfessor} />}
            {vistaGlobal === 'mapa_competencias' && <MapaCompetencias turmaId={turmaId} />}
            {vistaGlobal === 'eventos' && <EventosWizard turmaId={turmaId} nomeProfessor={nomeProfessor} />}
            {vistaGlobal === 'cronograma' && <CronogramaTab turmaId={turmaId} />}
            {/* Dicionário movido para o ecrã do aluno */}
          </>
        )}

        <div className="no-print">
          <CentroAvisos
            perfil="professor"
            onNavegar={(aviso) => {
              const tab = (aviso.contexto?.tabDestino as VistaProf) || 'planos';
              const planoId = aviso.contexto?.planoId;
              irPara(tab);
              if (planoId) setPlanoIdAlvo(planoId);
            }}
          />
        </div>
      </LayoutProfessor>
    );
  }

  // ── Aluno e Coordenadora ─────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <div className="no-print">
        <Header perfil={perfil} onSair={sair} nomeProfessor={nomeProfessor} syncStatus={syncStatus} onAtualizar={atualizarDados} />
      </div>
      {perfil === 'aluno' && aluno && <AlunoView key={refreshKey} aluno={aluno} />}
      {perfil === 'coordenadora' && <CoordenadoraView />}
    </div>
  );
}


// ── Componente de Ajuda ────────────────────────────────────────
function AjudaProfessor() {
  const faqs = [
    { q: 'Como crio um plano de aula?', r: 'Em "Planos de Aula", clica no botão + no canto. Preenche a data, selecciona a UC/UFCD e o tipo de aula.' },
    { q: 'Qual a diferença entre Prática, Mista e Teórica?', r: 'Prática: avalia subtécnicas e aparelhos. Teórica: avalia só conhecimentos da UC. Mista: avalia os dois.' },
    { q: 'O aluno esqueceu o PIN. O que faço?', r: 'Dentro do plano, vai ao tab "PIN temp." e gera um PIN temporário. A coordenadora será avisada.' },
    { q: 'Porque vejo um aviso de "sem cruzamento" na aula?', r: 'A ficha técnica não cruza com a UC activa. Muda para aula Mista e adiciona conhecimentos da UC.' },
    { q: 'Onde vejo as autoavaliações dos alunos?', r: 'Dentro do plano, no tab "Autoavaliações". Vês quem submeteu e as notas por componente.' },
    { q: 'Como vejo a evolução de um aluno?', r: 'Em "Historial" no menu. Filtra por UC, trimestre ou aluno.' },
    { q: 'O que são Orçamentos?', r: 'Fichas técnicas e requisições sem ligação a uma aula — para calcular custos ou preparar fichas.' },
    { q: 'Como fecho um trimestre?', r: 'No Historial, filtra pelo trimestre e UC. Verifica o equilíbrio antes de lançar a nota.' },
  ];
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 4 }}>
      <div style={{ background: '#1a1714', borderRadius: 14, padding: '16px 18px', marginBottom: 16, color: '#faf7f2' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>❓ Ajuda</h2>
        <div style={{ fontSize: 12, opacity: 0.5 }}>Respostas às dúvidas mais frequentes</div>
      </div>
      {faqs.map((f, i) => (
        <details key={i} style={{ marginBottom: 8, borderRadius: 10, border: '1px solid rgba(26,23,20,0.08)', overflow: 'hidden', background: '#fff' }}>
          <summary style={{ padding: '12px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 14, listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#b5651d', fontWeight: 800 }}>Q</span> {f.q}
          </summary>
          <div style={{ padding: '10px 14px 14px', fontSize: 13, color: 'rgba(26,23,20,0.7)', lineHeight: 1.6, borderTop: '1px solid rgba(26,23,20,0.06)', background: '#faf7f2' }}>
            {f.r}
          </div>
        </details>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInterno />
    </ErrorBoundary>
  );
}
