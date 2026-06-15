import React, { useState } from 'react';
import { Perfil, Aluno } from './types';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { ProfessorView } from './components/ProfessorView';
import { AlunoView } from './components/AlunoView';
import { ValidacaoView } from './components/ValidacaoView';
import { CoordenadoraView } from './components/CoordenadoraView';
import Requisicao from './components/Requisicao';
import PlanoAula from './components/PlanoAula';

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmaId, setTurmaId] = useState<string>('CP1');
  const [vistaProfessor, setVistaProfessor] = useState<'plano' | 'ficha' | 'validacao' | 'requisicao'>('plano');

  function handleLogin(perfilRecebido: Perfil, alunoId?: string, turmaIdRecebida?: string) {
    setPerfil(perfilRecebido);
    if (turmaIdRecebida) setTurmaId(turmaIdRecebida);
    if (perfilRecebido === 'aluno' && alunoId) {
      const partes = alunoId.split('-');
      const numero = parseInt(partes[partes.length - 1], 10) || 0;
      setAluno({ id: alunoId, turmaId: turmaIdRecebida || turmaId || 'CP1', numero, ano: 1 });
    }
  }

  function sair() {
    setPerfil(null);
    setAluno(null);
    setVistaProfessor('plano');
  }

  if (!perfil) return <Login onLogin={handleLogin} />;

  const tabStyle = (ativa: boolean) => ({
    padding: '8px 12px', borderRadius: 8, border: 'none',
    background: ativa ? '#1D9E75' : '#f2f2f2',
    color: ativa ? 'white' : '#555', cursor: 'pointer',
  });

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 12 }}>
      <Header perfil={perfil} onSair={sair} />

      {perfil === 'professor' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setVistaProfessor('plano')} style={tabStyle(vistaProfessor === 'plano')}>
              Plano de Aula
            </button>
            <button onClick={() => setVistaProfessor('ficha')} style={tabStyle(vistaProfessor === 'ficha')}>
              Ficha de Produção
            </button>
            <button onClick={() => setVistaProfessor('validacao')} style={tabStyle(vistaProfessor === 'validacao')}>
              Validação
            </button>
            <button onClick={() => setVistaProfessor('requisicao')} style={tabStyle(vistaProfessor === 'requisicao')}>
              Requisição
            </button>
          </div>
          {vistaProfessor === 'plano'      && <PlanoAula turmaId={turmaId} />}
          {vistaProfessor === 'ficha'      && <ProfessorView turmaId={turmaId} />}
          {vistaProfessor === 'validacao'  && <ValidacaoView />}
          {vistaProfessor === 'requisicao' && <Requisicao />}
        </div>
      )}

      {perfil === 'aluno' && aluno && <AlunoView aluno={aluno} />}
      {perfil === 'coordenadora' && <CoordenadoraView />}
    </div>
  );
}

