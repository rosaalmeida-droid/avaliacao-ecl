import React, { useState } from 'react';
import { Perfil, Aluno } from './types';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { ProfessorView } from './components/ProfessorView';
import { AlunoView } from './components/AlunoView';
import { ValidacaoView } from './components/ValidacaoView';
import { CoordenadoraView } from './components/CoordenadoraView';
import Requisicao from './components/Requisicao';

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmaId, setTurmaId] = useState<string>('CP1');
  const [vistaProfessor, setVistaProfessor] = useState<'planeamento' | 'validacao' | 'requisicao'>('planeamento');

  function handleLogin(perfilRecebido: Perfil, alunoId?: string, turmaIdRecebida?: string) {
    setPerfil(perfilRecebido);

    if (turmaIdRecebida) {
      setTurmaId(turmaIdRecebida);
    }

    if (perfilRecebido === 'aluno' && alunoId) {
      const partes = alunoId.split('-');
      const numeroTexto = partes[partes.length - 1];
      const numero = parseInt(numeroTexto, 10) || 0;

      setAluno({
        id: alunoId,
        turmaId: turmaIdRecebida || turmaId || 'CP1',
        numero,
        ano: 1,
      });
    }
  }

  function sair() {
    setPerfil(null);
    setAluno(null);
    setVistaProfessor('planeamento');
  }

  if (!perfil) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 12 }}>
      <Header perfil={perfil} onSair={sair} />

      {perfil === 'professor' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => setVistaProfessor('planeamento')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: vistaProfessor === 'planeamento' ? '#1D9E75' : '#f2f2f2',
                color: vistaProfessor === 'planeamento' ? 'white' : '#555',
                cursor: 'pointer',
              }}
            >
              Plano de Aula
            </button>

            <button
              onClick={() => setVistaProfessor('validacao')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: vistaProfessor === 'validacao' ? '#1D9E75' : '#f2f2f2',
                color: vistaProfessor === 'validacao' ? 'white' : '#555',
                cursor: 'pointer',
              }}
            >
              Validação
            </button>

            <button
              onClick={() => setVistaProfessor('requisicao')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: vistaProfessor === 'requisicao' ? '#1D9E75' : '#f2f2f2',
                color: vistaProfessor === 'requisicao' ? 'white' : '#555',
                cursor: 'pointer',
              }}
            >
              Requisição
            </button>
          </div>

          {vistaProfessor === 'planeamento' && <ProfessorView turmaId={turmaId} />}
          {vistaProfessor === 'validacao' && <ValidacaoView />}
          {vistaProfessor === 'requisicao' && <Requisicao />}
        </div>
      )}

      {perfil === 'aluno' && aluno && <AlunoView aluno={aluno} />}

      {perfil === 'coordenadora' && <CoordenadoraView />}
    </div>
  );
}
