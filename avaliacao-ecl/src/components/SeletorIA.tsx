import React from 'react';
import { abrirIA } from '../abrirIA';

// 3 botões para abrir o prompt directamente numa IA externa:
// • Claude e ChatGPT — abrem já com o prompt preenchido (até certo limite)
// • Gemini — copia o prompt e abre o site (colar com Ctrl+V)
export function SeletorIA({ prompt, corPrincipal }: { prompt: string; corPrincipal?: string }) {
  const cor = corPrincipal || 'var(--copper)';
  const botaoStyle: React.CSSProperties = {
    flex: 1, padding: '9px 6px', borderRadius: 8, border: `1px solid ${cor}`,
    background: '#fff', color: cor, fontWeight: 700, fontSize: 12, cursor: 'pointer',
  };
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
      <button onClick={() => abrirIA('claude', prompt)} style={botaoStyle} title="Abre o Claude já com o prompt preenchido — só clicar ↗">
        🟠 Claude
      </button>
      <button onClick={() => abrirIA('chatgpt', prompt)} style={botaoStyle} title="Abre o ChatGPT já com o prompt preenchido — só clicar ↗">
        🟢 ChatGPT
      </button>
      <button onClick={() => abrirIA('gemini', prompt)} style={botaoStyle} title="Copia o prompt e abre o Gemini — colar com Ctrl+V">
        🔵 Gemini
      </button>
    </div>
  );
}

export default SeletorIA;
