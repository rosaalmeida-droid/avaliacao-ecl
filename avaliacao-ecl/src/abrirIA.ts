// Utilitário comum para abrir uma IA externa a partir de qualquer prompt da
// app.
// • Claude  → abre com o prompt pré-preenchido via ?q= (prompts até 6000 chars)
// • ChatGPT → abre com o prompt pré-preenchido via ?q= (prompts até 4000 chars)
//             se o prompt for maior, copia e abre vazio com aviso
// • Gemini  → não tem URL pública para pré-preencher; copia o prompt e abre
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
    // ChatGPT suporta ?q= para pré-preencher o prompt
    if (prompt.length > 4000) {
      // Prompt demasiado longo — copiar e abrir vazio
      await copiarTextoSeguro(prompt);
      window.open('https://chatgpt.com/', '_blank');
      alert('Prompt copiado! O ChatGPT abriu — faz Ctrl+V para colar.');
    } else {
      window.open('https://chatgpt.com/?q=' + encodeURIComponent(prompt), '_blank');
    }
    return;
  }
  if (destino === 'gemini') {
    // Gemini não tem URL pública para pré-preencher — copiar e abrir
    await copiarTextoSeguro(prompt);
    window.open('https://gemini.google.com/app', '_blank');
    // Aviso subtil em vez de alert — não interrompe o fluxo
    console.info('Gemini: prompt copiado para a área de transferência — Ctrl+V para colar');
    return;
  }
}
