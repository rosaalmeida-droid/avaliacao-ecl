import React, { useState, useCallback, useEffect } from 'react';
import { Perfil, Aluno, PlanoAula as TPlanoAula } from './types';
import { Login } from './components/Login';
import { ManualCozinheiro } from './components/ManualCozinheiro';
import { Header, LayoutProfessor, VistaProf } from './components/Header';
import ProfessorView from './components/ProfessorView';
import { AlunoView } from './components/AlunoView';
import { ValidacaoView } from './components/ValidacaoView';
import { CoordenadoraView } from './components/CoordenadoraView';
import Requisicao from './components/Requisicao';
import PlanoAula from './components/PlanoAula';
import { VistaDePlano } from './components/VistaDePlano';
import { AvaliacaoPorUC } from './components/AvaliacaoPorUC';
import { CopiaSegurancaView } from './components/CopiaSeguranca';
import { GestaoRecuperacoes } from './components/GestaoRecuperacoes';
import { MapaCompetencias } from './components/MapaCompetencias';
import { CentroAvisos } from './components/CentroAvisos';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EventosWizard } from './components/EventosWizard';
import { CronogramaTab } from './components/CronogramaTab';
import { DicionarioComp } from './components/DicionarioComp';
import { sincronizarDoSheets, getEstadoSync, addAluno, seedAlunosTeste, seedHistorialTeste, seedPlanoTeste, getTurmas } from './backend';

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
  const [turmaId, setTurmaId] = useState<string>('CP1');
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
    getTurmas();
    seedAlunosTeste();
    seedHistorialTeste();
    seedPlanoTeste();
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
    if (turmaIdRecebida) setTurmaId(turmaIdRecebida);
    if (nomeUser) setNomeProfessor(nomeUser);
    if (perfilRecebido === 'aluno' && alunoId) {
      const partes = alunoId.split('-');
      const numero = parseInt(partes[partes.length - 1], 10) || 0;
      const novoAluno: Aluno = { id: alunoId, turmaId: turmaIdRecebida || turmaId || 'CP1', numero, ano: 1 };
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
            onPlanoActualizado={p => setPlanoAberto(p)}
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
            {vistaGlobal === 'dicionario' && <DicionarioComp perfil="professor" nomeProfessor={nomeProfessor} turmaId={turmaId} />}
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

export default function App() {
  return (
    <ErrorBoundary>
      <AppInterno />
    </ErrorBoundary>
  );
}
