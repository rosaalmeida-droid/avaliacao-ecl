// ============================================================
// Imprimir ou guardar em PDF um documento (Rosa, out/2026).
// Abre o documento numa janela própria e pede a impressão a partir dela.
// Antes, a janela esperava pelo «onload», que no Safari do iPad muitas
// vezes já tinha passado: a impressão não abria e a professora acabava
// por imprimir o ecrã da aplicação.
// ============================================================

const SCRIPT_IMPRIMIR =
  '<script>(function(){var f=false;function p(){if(f)return;f=true;setTimeout(function(){window.focus();window.print();},400);}'
  + 'if(document.readyState==="complete")p();else window.addEventListener("load",p);setTimeout(p,1500);})();<\/script>';

/** Abre o HTML completo numa janela nova e abre a impressão (onde se escolhe «Guardar em PDF»). */
export function abrirEImprimir(html: string): boolean {
  const comScript = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, SCRIPT_IMPRIMIR + '</body>') : html + SCRIPT_IMPRIMIR;
  const janela = window.open('', '_blank');
  if (!janela) {
    alert('O navegador bloqueou a janela nova. Permita as janelas novas (pop-ups) para esta aplicação e tente outra vez.');
    return false;
  }
  janela.document.open();
  janela.document.write(comScript);
  janela.document.close();
  return true;
}

export const esc = (s: unknown): string => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Página A4 simples, com o cabeçalho da escola. */
export function paginaA4(titulo: string, corpo: string): string {
  return `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1714; margin: 0; line-height: 1.45; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 2px solid #6B3FA0; color: #4b2a7b; }
  .sub { color: #6b6560; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th { background: #f1ecf7; color: #1a1714; text-align: left; font-size: 11px; padding: 5px 7px; border: 1px solid #ddd3ea; }
  td { padding: 5px 7px; border: 1px solid #e5e0d8; vertical-align: top; }
  ul, ol { margin: 4px 0 4px 18px; padding: 0; }
  .rodape { margin-top: 24px; padding-top: 6px; border-top: 1px solid #e5e0d8; font-size: 10px; color: #8a8178; }
</style></head><body>
<div style="font-size:11px;color:#6b6560;margin-bottom:10px">Escola de Comércio de Lisboa · Avaliação ECL</div>
${corpo}
<div class="rodape">Documento gerado pela aplicação Avaliação ECL em ${new Date().toLocaleDateString('pt-PT')}.</div>
</body></html>`;
}
