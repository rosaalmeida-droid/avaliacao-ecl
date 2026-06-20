import React from 'react';
import { Perfil } from '../types';
import { LOGO_ECL as logoEcl } from '../logo_ecl';

const LABEL: Record<Perfil, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  coordenadora: 'Coordenadora',
};

export function Header({ perfil, subtitulo, onSair, nomeProfessor, syncStatus, onAtualizar }: {
  perfil: Perfil;
  subtitulo?: string;
  onSair: () => void;
  nomeProfessor?: string;
  syncStatus?: 'idle' | 'syncing' | 'ok' | 'offline';
  onAtualizar?: () => void;
}) {
  const label = nomeProfessor || LABEL[perfil];
  const syncInfo = syncStatus === 'syncing' ? { icon: '🔄', cor: 'var(--copper)', txt: 'A sincronizar...' }
    : syncStatus === 'ok' ? { icon: '☁️', cor: 'var(--sage)', txt: 'Guardado na nuvem' }
    : syncStatus === 'offline' ? { icon: '⚠️', cor: 'var(--danger)', txt: 'Sem ligação ao Sheets' }
    : null;

  return (
    <div className="header-bar" style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={logoEcl} alt="Escola de Comércio de Lisboa" style={{ height: 38, width: 'auto', objectFit: 'contain' }} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: 'var(--charcoal)' }}>Avaliação ECL</div>
          <div className="muted" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            Comanda de competências
            {syncInfo && <span style={{ color: syncInfo.cor }}>{syncInfo.icon} {syncInfo.txt}</span>}
            {onAtualizar && (
              <button onClick={onAtualizar} disabled={syncStatus === 'syncing'}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'var(--copper)', fontWeight: 600, cursor: syncStatus === 'syncing' ? 'default' : 'pointer', opacity: syncStatus === 'syncing' ? 0.5 : 1 }}>
                {syncStatus === 'syncing' ? '🔄 A actualizar...' : '🔄 Actualizar'}
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--charcoal)' }}>{label}{subtitulo ? ` · ${subtitulo}` : ''}</div>
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
