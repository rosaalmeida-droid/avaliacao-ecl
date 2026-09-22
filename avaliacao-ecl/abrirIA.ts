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
    const janela = window.open('https://claude.ai/new?q=' + encodeURIComponent(prompt), '_blank');
    if (!janela) {
      await copiarTextoSeguro(prompt);
      alert('O browser bloqueou a abertura de uma nova aba. O prompt já foi copiado — permite pop-ups para este site e tenta outra vez, ou abre o Claude manualmente e cola (Ctrl+V).');
    }
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
      const janela = window.open('https://chatgpt.com/?q=' + encodeURIComponent(prompt), '_blank');
      if (!janela) {
        await copiarTextoSeguro(prompt);
        alert('O browser bloqueou a abertura de uma nova aba. O prompt já foi copiado — permite pop-ups para este site e tenta outra vez, ou abre o ChatGPT manualmente e cola (Ctrl+V).');
      }
    }
    return;
  }
  if (destino === 'gemini') {
    // Gemini não tem URL pública para pré-preencher — copiar e abrir
    await copiarTextoSeguro(prompt);
    const janela = window.open('https://gemini.google.com/app', '_blank');
    if (!janela) {
      // Bloqueador de pop-ups impediu a nova aba — avisar de forma visível,
      // porque sem isto parece que o botão "não fez nada".
      alert('O browser bloqueou a abertura de uma nova aba. O prompt já foi copiado — permite pop-ups para este site e tenta outra vez, ou abre o Gemini manualmente e cola (Ctrl+V).');
      return;
    }
    // Aviso visível — antes só ia para a consola do programador, invisível
    // para quem usa a app normalmente.
    alert('Prompt copiado! O Gemini abriu numa nova aba — faz Ctrl+V para colar.');
    return;
  }
}
