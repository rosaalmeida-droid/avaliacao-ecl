import React, { useState } from 'react';
import { Perfil, Aluno } from './types';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { ProfessorView } from './components/ProfessorView';
import { AlunoView } from './components/AlunoView';
import { ValidacaoView } from './components/ValidacaoView';
import { CoordenadoraView } from './components/CoordenadoraView';

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [vistaProfessor, setVistaProfessor] = useState<'planeamento' | 'validacao'>('planeamento');

  function handleLogin(p: Perfil, a?: Aluno) {
    setPerfil(p);
    if (a) setAluno(a);
  }

  function logout() {
    setPerfil(null);
    setAluno(null);
    setVistaProfessor('planeamento');
  }

  if (!perfil) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 12 }}>
      <Header perfil={perfil} onLogout={logout} />

      {perfil === 'professor' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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
          </div>

          {vistaProfessor === 'planeamento' && <ProfessorView />}
          {vistaProfessor === 'validacao' && <ValidacaoView />}
        </div>
      )}

      {perfil === 'aluno' && aluno && <AlunoView aluno={aluno} />}

      {perfil === 'coordenadora' && <CoordenadoraView />}
    </div>
  );
}
