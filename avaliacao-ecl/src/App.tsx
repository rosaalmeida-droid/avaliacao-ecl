import React, { useState, useCallback, useEffect } from 'react';
import { Perfil, Aluno } from './types';
import { Login } from './components/Login';
import { Header } from './components/Header';
import ProfessorView from './components/ProfessorView';
import { AlunoView } from './components/AlunoView';
import { ValidacaoView } from './components/ValidacaoView';
import { CoordenadoraView } from './components/CoordenadoraView';
import Requisicao from './components/Requisicao';
import PlanoAula from './components/PlanoAula';
import { sincronizarDoSheets, getEstadoSync } from './backend';

// ── Modal de aviso de saída ───────────────────────────────────
function ModalGuardar({ mensagem, onGuardar, onDescartar, onCancelar }: {
  mensagem: string;
  onGuardar: () => void;
  onDescartar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24,
        maxWidth: 340, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>
          Tens alterações por guardar
        </div>
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', textAlign: 'center', marginBottom: 20 }}>
          {mensagem}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onGuardar} style={{
            padding: '12px', borderRadius: 10, border: 'none',
            background: 'var(--sage)', color: 'white', fontWeight: 700,
            fontSize: 14, cursor: 'pointer',
          }}>
            ✓ Guardar antes de sair
          </button>
          <button onClick={onDescartar} style={{
            padding: '10px', borderRadius: 10, border: '1px solid var(--border)',
            background: '#fff', color: 'var(--danger)', fontWeight: 600,
            fontSize: 13, cursor: 'pointer',
          }}>
            Descartar alterações
          </button>
          <button onClick={onCancelar} style={{
            padding: '10px', borderRadius: 10, border: 'none',
            background: 'transparent', color: 'rgba(26,23,20,0.5)',
            fontSize: 13, cursor: 'pointer',
          }}>
            Cancelar — ficar aqui
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmaId, setTurmaId] = useState<string>('CP1');
  const [nomeProfessor, setNomeProfessor] = useState<string>('');
  const [vistaProfessor, setVistaProfessor] = useState<'plano' | 'ficha' | 'validacao' | 'requisicao'>('plano');

  // Estado de "tem alterações por guardar"
  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<(() => void) | null>(null);
  const [guardarCallback, setGuardarCallback] = useState<(() => void) | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalMensagem, setModalMensagem] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'offline'>('idle');

  // Sincronizar com Sheets quando o professor faz login
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

  // Funções expostas aos filhos para registar alterações
  const registarAlteracao = useCallback((guardar?: () => void) => {
    setTemAlteracoes(true);
    if (guardar) setGuardarCallback(() => guardar);
  }, []);

  const limparAlteracoes = useCallback(() => {
    setTemAlteracoes(false);
    setGuardarCallback(null);
  }, []);

  // Navegar com verificação de alterações
  function navegarCom(acao: () => void, mensagem?: string) {
    if (temAlteracoes) {
      setAcaoPendente(() => acao);
      setModalMensagem(mensagem || 'Se saíres agora perdes o que estás a preencher.');
      setModalAberto(true);
    } else {
      acao();
    }
  }

  function mudarTab(tab: 'plano' | 'ficha' | 'validacao' | 'requisicao') {
    if (tab === vistaProfessor) return;
    const nomes: Record<string, string> = {
      plano: 'Plano de Aula',
      ficha: 'Ficha de Produção',
      validacao: 'Validação',
      requisicao: 'Requisição',
    };
    navegarCom(
      () => { setVistaProfessor(tab); limparAlteracoes(); },
      `Se mudares para "${nomes[tab]}" agora, perdes o que estás a preencher.`
    );
  }

  function handleLogin(perfilRecebido: Perfil, alunoId?: string, turmaIdRecebida?: string, nomeUser?: string) {
    setPerfil(perfilRecebido);
    if (turmaIdRecebida) setTurmaId(turmaIdRecebida);
    if (nomeUser) setNomeProfessor(nomeUser);
    if (perfilRecebido === 'aluno' && alunoId) {
      const partes = alunoId.split('-');
      const numero = parseInt(partes[partes.length - 1], 10) || 0;
      setAluno({ id: alunoId, turmaId: turmaIdRecebida || turmaId || 'CP1', numero, ano: 1 });
    }
  }

  function sair() {
    navegarCom(
      () => { setPerfil(null); setAluno(null); setNomeProfessor(''); setVistaProfessor('plano'); limparAlteracoes(); },
      'Se saíres agora perdes o que estás a preencher.'
    );
  }

  if (!perfil) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      {modalAberto && (
        <ModalGuardar
          mensagem={modalMensagem}
          onGuardar={() => {
            setModalAberto(false);
            if (guardarCallback) guardarCallback();
            limparAlteracoes();
            if (acaoPendente) acaoPendente();
            setAcaoPendente(null);
          }}
          onDescartar={() => {
            setModalAberto(false);
            limparAlteracoes();
            if (acaoPendente) acaoPendente();
            setAcaoPendente(null);
          }}
          onCancelar={() => {
            setModalAberto(false);
            setAcaoPendente(null);
          }}
        />
      )}

      <Header perfil={perfil} onSair={sair} nomeProfessor={nomeProfessor} syncStatus={syncStatus} />

      {perfil === 'professor' && (
        <div>
          <div className="tab-nav">
            {(['plano','ficha','validacao','requisicao'] as const).map(v => (
              <button
                key={v}
                onClick={() => mudarTab(v)}
                className={`tab-btn${vistaProfessor === v ? ' active' : ''}`}
              >
                {v === 'plano' ? 'Plano de Aula'
                  : v === 'ficha' ? 'Ficha de Produção'
                  : v === 'validacao' ? 'Validação'
                  : 'Requisição'}
                {temAlteracoes && vistaProfessor === v && (
                  <span style={{ marginLeft: 4, width: 7, height: 7, borderRadius: '50%', background: 'var(--copper)', display: 'inline-block', verticalAlign: 'middle' }} />
                )}
              </button>
            ))}
          </div>
          {vistaProfessor === 'plano' && (
            <PlanoAula
              turmaId={turmaId}
              nomeProfessor={nomeProfessor}
              onIrParaFicha={() => mudarTab('ficha')}
              onAlteracao={registarAlteracao}
              onGuardado={limparAlteracoes}
            />
          )}
          {vistaProfessor === 'ficha' && (
            <ProfessorView
              turmaId={turmaId}
              nomeProfessor={nomeProfessor}
              onAlteracao={registarAlteracao}
              onGuardado={limparAlteracoes}
            />
          )}
          {vistaProfessor === 'validacao'  && <ValidacaoView />}
          {vistaProfessor === 'requisicao' && <Requisicao nomeProfessor={nomeProfessor} />}
        </div>
      )}

      {perfil === 'aluno' && aluno && <AlunoView aluno={aluno} />}
      {perfil === 'coordenadora' && <CoordenadoraView />}
    </div>
  );
}

