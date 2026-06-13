import React from 'react';

export function Button({
  children, onClick, variant = 'primary', block, disabled, type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  block?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const cls = `btn btn-${variant} ${block ? 'btn-block' : ''}`;
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Card({ children }: { children: React.ReactNode; key?: React.Key }) {
  return <div className="card">{children}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

export function Stamp({ children, copper }: { children: React.ReactNode; copper?: boolean }) {
  return <span className={`stamp ${copper ? 'copper' : ''}`}>{children}</span>;
}

export function Badge({ tipo, children }: { tipo: 'nova' | 'desenvolvimento' | 'dominada'; children: React.ReactNode }) {
  const cls = tipo === 'nova' ? 'badge-nova' : tipo === 'dominada' ? 'badge-dominada' : 'badge-dev';
  return <span className={`badge ${cls}`}>{children}</span>;
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="progress-bar">
      <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

export function Chip({
  children, selected, suggested, onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  suggested?: boolean;
  onClick?: () => void;
}) {
  const cls = `chip ${selected ? 'selected' : ''} ${suggested ? 'suggested' : ''}`;
  return (
    <span className={cls} onClick={onClick}>
      {children}
    </span>
  );
}
