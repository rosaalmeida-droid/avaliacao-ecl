import React, { useState } from 'react';
import { Perfil, Aluno } from './types';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { ProfessorView } from './components/ProfessorView';
import { AlunoView } from './components/AlunoView';
import { ValidacaoView } from './components/ValidacaoView';
import { CoordenadoraView } from './components/CoordenadoraView';
import { getOrCreateAluno } from './backend';
import './styles.css';

interface Sessao {
  perfil: Perfil;
  alunoId?: string;
  turmaId?: string;
}

export default function App() {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [tabProfessor, setTabProfessor] = useState<'comanda' | 'validar'>('comanda');

  if (!sessao) {
    return <Login onLogin={(perfil, alunoId, turmaId) => setSessao({ perfil, alunoId, turmaId })} />;
  }

  let conteudo: React.ReactNode = null;
  let subtitulo = '';

  if (sessao.perfil === 'aluno' && sessao.alunoId) {
    const partes = sessao.alunoId.split('-');
    const numero = Number(partes.pop());
    const turmaId = partes.join('-');
    const aluno: Aluno = getOrCreateAluno(turmaId, numero);
    subtitulo = `Aluno ${aluno.numero}`;
    conteudo = <AlunoView aluno={aluno} />;
  } else if (sessao.perfil === 'professor' && sessao.turmaId) {
    subtitulo = sessao.turmaId;
    conteudo = (
      <div>
        <div className="card" style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${tabProfessor === 'comanda' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTabProfessor('comanda')}>Nova Comanda</button>
          <button className={`btn ${tabProfessor === 'validar' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTabProfessor('validar')}>Validar</button>
        </div>
        {tabProfessor === 'comanda' ? <ProfessorView turmaId={sessao.turmaId} /> : <ValidacaoView turmaId={sessao.turmaId} />}
      </div>
    );
  } else if (sessao.perfil === 'coordenadora') {
    conteudo = <CoordenadoraView />;
  }

  return (
    <div className="app-shell">
      <Header perfil={sessao.perfil} subtitulo={subtitulo} onSair={() => setSessao(null)} />
      {conteudo}
    </div>
  );
}
