import React, { useState, useCallback, useEffect } from 'react';
import { Perfil, Aluno, PlanoAula as TPlanoAula } from './types';
import { Login } from './components/Login';
import { Header } from './components/Header';
import ProfessorView from './components/ProfessorView';
import { AlunoView } from './components/AlunoView';
import { ValidacaoView } from './components/ValidacaoView';
import { CoordenadoraView } from './components/CoordenadoraView';
import Requisicao from './components/Requisicao';
import PlanoAula from './components/PlanoAula';
import { VistaDePlano } from './components/VistaDePlano';
import { AvaliacaoPorUC } from './components/AvaliacaoPorUC';
import { ErrorBoundary } from './components/ErrorBoundary';
import { sincronizarDoSheets, getEstadoSync, addAluno } from './backend';

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

// Tipo para a vista global do professor
type VistaProf = 'planos' | 'ficha' | 'guia' | 'requisicao' | 'validacao' | 'biblioteca' | 'avaliacao_uc';

function AppInterno() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmaId, setTurmaId] = useState<string>('CP1');
  const [nomeProfessor, setNomeProfessor] = useState<string>('');
  const [planoAberto, setPlanoAberto] = useState<TPlanoAula | null>(null);
  const [planoEmPausa, setPlanoEmPausa] = useState<TPlanoAula | null>(null);
  const [vistaGlobal, setVistaGlobal] = useState<VistaProf>('planos');
  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<(() => void) | null>(null);
  const [guardarCallback, setGuardarCallback] = useState<(() => void) | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalMensagem, setModalMensagem] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'offline'>('idle');

  useEffect(() => {
    if (perfil === 'professor' && turmaId) {
      const { temSheets } = getEstadoSync();
      if (temSheets) {
        setSyncStatus('syncing');
        sincronizarDoSheets(turmaId)
          .then(() => setSyncStatus('ok'))
          .catch(() => setSyncStatus('offline'));
      }
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
    if (vista === vistaGlobal && !planoAberto) return; // já está aqui, não faz nada
    navegarCom(() => {
      // Se há um plano aberto, fica em pausa em vez de se perder — modo livre
      if (planoAberto) setPlanoEmPausa(planoAberto);
      setPlanoAberto(null);
      limparAlteracoes();
      setVistaGlobal(vista);
    });
  }

  function handleLogin(perfilRecebido: Perfil, alunoId?: string, turmaIdRecebida?: string, nomeUser?: string) {
    setPerfil(perfilRecebido);
    if (turmaIdRecebida) setTurmaId(turmaIdRecebida);
    if (nomeUser) setNomeProfessor(nomeUser);
    if (perfilRecebido === 'aluno' && alunoId) {
      const partes = alunoId.split('-');
      const numero = parseInt(partes[partes.length - 1], 10) || 0;
      const novoAluno: Aluno = { id: alunoId, turmaId: turmaIdRecebida || turmaId || 'CP1', numero, ano: 1 };
      setAluno(novoAluno);
      // Registar o aluno na lista persistente — necessário para o professor
      // conseguir ver/filtrar este aluno em Avaliação por UC, Reabrir, etc.
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

  // ── Tabs da navegação global do professor ──────────────────
  const tabsProf: { id: VistaProf; label: string; icone: string }[] = [
    { id: 'planos',     label: 'Planos de Aula', icone: '📋' },
    { id: 'ficha',      label: 'Ficha',          icone: '📄' },
    { id: 'guia',       label: 'Guia',           icone: '📚' },
    { id: 'requisicao', label: 'Requisição',      icone: '🛒' },
    { id: 'validacao',  label: 'Validação',       icone: '✓'  },
    { id: 'biblioteca', label: 'Biblioteca',      icone: '🗂️' },
    { id: 'avaliacao_uc', label: 'Avaliação por UC', icone: '📊' },
  ];

  return (
    <div className="app-shell">
      {modalAberto && (
        <ModalGuardar mensagem={modalMensagem}
          onGuardar={() => { setModalAberto(false); if (guardarCallback) guardarCallback(); limparAlteracoes(); if (acaoPendente) acaoPendente(); setAcaoPendente(null); }}
          onDescartar={() => { setModalAberto(false); limparAlteracoes(); if (acaoPendente) acaoPendente(); setAcaoPendente(null); }}
          onCancelar={() => { setModalAberto(false); setAcaoPendente(null); }}
        />
      )}

      <Header perfil={perfil} onSair={sair} nomeProfessor={nomeProfessor} syncStatus={syncStatus} />

      {perfil === 'professor' && (
        <div>
          {/* Navegação global — modo livre, sem associar a nenhum plano */}
          <div className="tab-nav" style={{ overflowX: 'auto', display: 'flex', gap: 4, paddingBottom: 2 }}>
            {tabsProf.map(t => (
              <button key={t.id} onClick={() => irPara(t.id)}
                className={`tab-btn${(!planoAberto && vistaGlobal === t.id) ? ' active' : ''}`}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t.icone} {t.label}
              </button>
            ))}
          </div>

          {/* Banner para voltar ao plano que ficou em pausa */}
          {planoEmPausa && !planoAberto && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--copper-pale)', borderRadius: 10, marginTop: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--copper)', flex: 1 }}>
                📋 Tens o plano "{planoEmPausa.titulo}" em pausa
              </span>
              <button onClick={() => { setPlanoAberto(planoEmPausa); }}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                ← Voltar ao plano
              </button>
            </div>
          )}

          {/* Plano aberto — vista dedicada */}
          {planoAberto ? (
            <VistaDePlano
              plano={planoAberto}
              turmaId={turmaId}
              nomeProfessor={nomeProfessor}
              onVoltar={fecharPlano}
              onPlanoActualizado={p => setPlanoAberto(p)}
              onAlteracao={registarAlteracao}
              onGuardado={limparAlteracoes}
            />
          ) : (
            <div>
              {/* Conteúdo por vista */}
              {vistaGlobal === 'planos' && (
                <PlanoAula
                  turmaId={turmaId}
                  nomeProfessor={nomeProfessor}
                  onAlteracao={registarAlteracao}
                  onGuardado={(p?: TPlanoAula) => { limparAlteracoes(); if (p) abrirPlano(p); }}
                />
              )}
              {vistaGlobal === 'ficha' && (
                <ProfessorView
                  turmaId={turmaId}
                  nomeProfessor={nomeProfessor}
                  onAlteracao={registarAlteracao}
                  onGuardado={limparAlteracoes}
                />
              )}
              {vistaGlobal === 'guia' && (
                <ProfessorView
                  turmaId={turmaId}
                  nomeProfessor={nomeProfessor}
                  modoGuia={true}
                  onAlteracao={registarAlteracao}
                  onGuardado={limparAlteracoes}
                />
              )}
              {vistaGlobal === 'requisicao' && (
                <Requisicao nomeProfessor={nomeProfessor} turmaId={turmaId} />
              )}
              {vistaGlobal === 'validacao' && (
                <ValidacaoView turmaId={turmaId} />
              )}
              {vistaGlobal === 'biblioteca' && (
                <ProfessorView
                  turmaId={turmaId}
                  nomeProfessor={nomeProfessor}
                  onAlteracao={registarAlteracao}
                  onGuardado={limparAlteracoes}
                />
              )}
              {vistaGlobal === 'avaliacao_uc' && (
                <AvaliacaoPorUC turmaId={turmaId} />
              )}
            </div>
          )}
        </div>
      )}

      {perfil === 'aluno' && aluno && <AlunoView aluno={aluno} />}
      {perfil === 'coordenadora' && <CoordenadoraView />}
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
