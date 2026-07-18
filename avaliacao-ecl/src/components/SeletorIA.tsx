import React, { useState } from 'react';
import { abrirIA } from '../abrirIA';

// 4 botões: 3 para abrir o prompt directamente numa IA externa, e um para
// copiar o texto do prompt de forma explícita — para quem prefere colar à
// mão em vez de depender da abertura automática (que pode ser bloqueada
// pelo browser, ou nem sempre é óbvio que funcionou).
export function SeletorIA({ prompt, corPrincipal }: { prompt: string; corPrincipal?: string }) {
  const cor = corPrincipal || 'var(--copper)';
  const [copiado, setCopiado] = useState(false);
  const botaoStyle: React.CSSProperties = {
    flex: 1, padding: '9px 6px', borderRadius: 8, border: `1px solid ${cor}`,
    background: '#fff', color: cor, fontWeight: 700, fontSize: 12, cursor: 'pointer',
  };

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
      <button onClick={() => abrirIA('claude', prompt)} style={botaoStyle} title="Abre o Claude já com o prompt preenchido — só clicar ↗">
        🟠 Claude
      </button>
      <button onClick={() => abrirIA('chatgpt', prompt)} style={botaoStyle} title="Abre o ChatGPT já com o prompt preenchido — só clicar ↗">
        🟢 ChatGPT
      </button>
      <button onClick={() => abrirIA('gemini', prompt)} style={botaoStyle} title="Copia o prompt e abre o Gemini — colar com Ctrl+V">
        🔵 Gemini
      </button>
      <button onClick={copiar} style={{ ...botaoStyle, background: copiado ? cor : '#fff', color: copiado ? '#fff' : cor }}
        title="Copia o texto do prompt para colares onde quiseres">
        {copiado ? '✓ Copiado!' : '📋 Copiar prompt'}
      </button>
    </div>
  );
}

export default SeletorIA;
