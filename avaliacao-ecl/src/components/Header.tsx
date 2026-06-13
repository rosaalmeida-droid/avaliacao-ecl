import React from 'react';
import { Perfil } from '../types';

const LABEL: Record<Perfil, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  coordenadora: 'Coordenadora',
};

export function Header({ perfil, subtitulo, onSair }: { perfil: Perfil; subtitulo?: string; onSair: () => void }) {
  return (
    <div className="header-bar">
      <div className="title-row">
        <span className="display" style={{ fontSize: 22, fontWeight: 700 }}>📋 Avaliação ECL</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{LABEL[perfil]}{subtitulo ? ` · ${subtitulo}` : ''}</div>
        <button
          onClick={onSair}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper)', fontSize: 12, fontWeight: 600, padding: 0 }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
