// ============================================================
// Janela de confirmação da aplicação (Rosa, out/2026)
// ============================================================
// O «confirm» do navegador é uma caixinha cinzenta que o professor nem lê.
// Nas ações graves (recomeçar um plano, apagar), abre-se uma janela da
// aplicação, à parte, com a pergunta clara e dois botões: o que não estraga
// nada fica em destaque. Devolve true só se o professor confirmar.
// ============================================================
export function janelaConfirmar(opts: {
  titulo: string; texto?: string; sim: string; nao?: string; perigo?: boolean;
}): Promise<boolean> {
  return new Promise(resolve => {
    const fundo = document.createElement('div');
    fundo.setAttribute('role', 'dialog');
    fundo.setAttribute('aria-modal', 'true');
    fundo.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(26,23,20,0.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    const caixa = document.createElement('div');
    caixa.style.cssText = 'background:#fff;border-radius:18px;padding:22px 22px 18px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.35)';
    const t = document.createElement('div');
    t.textContent = opts.titulo;
    t.style.cssText = `font-size:20px;font-weight:800;line-height:1.3;color:${opts.perigo ? '#8e2418' : '#1A1A1A'}`;
    caixa.appendChild(t);
    if (opts.texto) {
      const p = document.createElement('div');
      p.textContent = opts.texto;
      p.style.cssText = 'font-size:15px;line-height:1.55;color:rgba(26,23,20,0.75);margin-top:10px;white-space:pre-wrap';
      caixa.appendChild(p);
    }
    const fim = (v: boolean) => { fundo.remove(); document.removeEventListener('keydown', tecla); resolve(v); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fim(false); };
    const nao = document.createElement('button');
    nao.textContent = opts.nao || 'Não, deixar como está';
    nao.style.cssText = 'display:block;width:100%;min-height:52px;margin-top:18px;border:none;border-radius:12px;background:#5a7a4e;color:#fff;font-size:16.5px;font-weight:800;cursor:pointer;font-family:inherit';
    nao.onclick = () => fim(false);
    const sim = document.createElement('button');
    sim.textContent = opts.sim;
    sim.style.cssText = `display:block;width:100%;min-height:48px;margin-top:10px;border-radius:12px;background:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;border:1.5px solid ${opts.perigo ? '#c0392b' : 'rgba(26,23,20,0.25)'};color:${opts.perigo ? '#c0392b' : 'rgba(26,23,20,0.75)'}`;
    sim.onclick = () => fim(true);
    caixa.appendChild(nao);
    caixa.appendChild(sim);
    fundo.appendChild(caixa);
    fundo.onclick = e => { if (e.target === fundo) fim(false); };
    document.addEventListener('keydown', tecla);
    document.body.appendChild(fundo);
    nao.focus();
  });
}
