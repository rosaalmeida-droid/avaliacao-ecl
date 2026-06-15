import React from 'react';
import { Perfil } from '../types';
import logoEcl from '../assets/logo_ecl.png';

const LABEL: Record<Perfil, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  coordenadora: 'Coordenadora',
};

export function Header({ perfil, subtitulo, onSair }: { perfil: Perfil; subtitulo?: string; onSair: () => void }) {
  return (
    <div className="header-bar" style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={logoEcl} alt="Escola de Comércio de Lisboa" style={{ height: 38, width: 'auto', objectFit: 'contain' }} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: 'var(--charcoal)' }}>Avaliação ECL</div>
          <div className="muted" style={{ fontSize: 11 }}>Comanda de competências</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--charcoal)' }}>{LABEL[perfil]}{subtitulo ? ` · ${subtitulo}` : ''}</div>
        <button
          onClick={onSair}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper)', fontSize: 12, fontWeight: 600, padding: 0, marginTop: 2 }}
        >
          Sair →
        </button>
      </div>
    </div>
  );
}

