import React, { useState } from 'react';
import { Perfil, Aluno } from './types';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { ProfessorView } from './components/ProfessorView';
import { AlunoView } from './components/AlunoView';
import { ValidacaoView } from './components/ValidacaoView';
import { ComandasView } from './components/ComandasView';
import { CoordenadoraView } from './components/CoordenadoraView';
import Requisicao from './components/Requisicao';
import { getAlunos } from './backend';
import './styles.css';

interface Sessao {
  perfil: Perfil;
  alunoId?: string;
  turmaId?: string;
}

export default function App() {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [tabProfessor, setTabProfessor] = useState<'comanda' | 'comandas' | 'validar' | 'requisicao'>('comanda');

  if (!sessao) {
    return <Login onLogin={(perfil, alunoId, turmaId) => setSessao({ perfil, alunoId, turmaId })} />;
  }

  let conteudo: React.ReactNode = null;
  let subtitulo = '';

  if (sessao.perfil === 'aluno' && sessao.alunoId) {
    const aluno = getAlunos().find(a => a.id === sessao.alunoId);
    if (!aluno) {
      return <Login onLogin={(perfil, alunoId, turmaId) => setSessao({ perfil, alunoId, turmaId })} />;
    }
    subtitulo = `Aluno ${aluno.numero} · ${aluno.ano}º ano`;
    conteudo = <AlunoView aluno={aluno} />;

  } else if (sessao.perfil === 'professor' && sessao.turmaId) {
    subtitulo = sessao.turmaId;
    conteudo = (
      <div>
        <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`btn ${tabProfessor === 'comanda' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTabProfessor('comanda')}>
            Nova Comanda
          </button>
          <button
            className={`btn ${tabProfessor === 'comandas' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTabProfessor('comandas')}>
            Comandas
          </button>
          <button
            className={`btn ${tabProfessor === 'validar' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTabProfessor('validar')}>
            Validar
          </button>
          <button
            className={`btn ${tabProfessor === 'requisicao' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTabProfessor('requisicao')}>
            Requisição
          </button>
        </div>
        {tabProfessor === 'comanda'    && <ProfessorView turmaId={sessao.turmaId} />}
        {tabProfessor === 'comandas'   && <ComandasView turmaId={sessao.turmaId} />}
        {tabProfessor === 'validar'    && <ValidacaoView turmaId={sessao.turmaId} />}
        {tabProfessor === 'requisicao' && <Requisicao />}
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

