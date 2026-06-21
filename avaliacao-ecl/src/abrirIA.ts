// Utilitário comum para abrir uma IA externa a partir de qualquer prompt da
// app. Claude tem suporte a link com prompt pré-preenchido; ChatGPT e
// Gemini não têm essa funcionalidade publicamente disponível — por isso,
// para essas duas, copiamos o prompt automaticamente para a área de
// transferência antes de abrir o site, poupando o passo manual de copiar.
export type IADestino = 'claude' | 'chatgpt' | 'gemini';

async function copiarTextoSeguro(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

export async function abrirIA(destino: IADestino, prompt: string) {
  if (destino === 'claude') {
    // Limite real do URL do browser — prompts maiores não cabem no link.
    if (prompt.length > 6000) {
      alert('Este prompt é demasiado longo para abrir directamente. Usa "Copiar prompt" e cola manualmente.');
      return;
    }
    window.open('https://claude.ai/new?q=' + encodeURIComponent(prompt), '_blank');
    return;
  }
  if (destino === 'chatgpt') {
    await copiarTextoSeguro(prompt);
    window.open('https://chatgpt.com/', '_blank');
    return;
  }
  if (destino === 'gemini') {
    await copiarTextoSeguro(prompt);
    window.open('https://gemini.google.com/app', '_blank');
    return;
  }
}
