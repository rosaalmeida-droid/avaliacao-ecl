// ============================================================
// Pedidos diretos à IA, a partir da aplicação (Rosa, out/2026).
// Sem chave configurada, ou com o limite atingido, devolve o motivo e a
// aplicação passa ao modo de copiar e colar: nada fica bloqueado.
// ============================================================

export type RespostaIA =
  | { ok: true; texto: string; fornecedor: string }
  | { ok: false; motivo: string; mensagem: string };

const KEY_USO = 'ecl_ia_uso';

/** Quantos pedidos à IA este aparelho fez hoje. */
export function usoDaIAHoje(): number {
  try {
    const u = JSON.parse(localStorage.getItem(KEY_USO) || '{}');
    return u.dia === new Date().toISOString().slice(0, 10) ? Number(u.n) || 0 : 0;
  } catch { return 0; }
}

function contarUso(): void {
  try {
    const dia = new Date().toISOString().slice(0, 10);
    localStorage.setItem(KEY_USO, JSON.stringify({ dia, n: usoDaIAHoje() + 1 }));
  } catch { /* sem espaço: não conta */ }
}

/** Depois de a IA dizer que não há chave, não se volta a tentar nesta sessão. */
let semChaveNestaSessao = false;

export function iaDiretaDisponivel(): boolean { return !semChaveNestaSessao; }

export async function pedirAIA(prompt: string, maxTokens = 8192, opts: { lerLinks?: boolean; pensar?: boolean } = {}): Promise<RespostaIA> {
  if (semChaveNestaSessao) return { ok: false, motivo: 'sem_chave', mensagem: 'A ligação direta à IA não está configurada.' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 75000);
  try {
    contarUso();
    const res = await fetch('/api/ia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens, lerLinks: !!opts.lerLinks, pensar: !!opts.pensar }), signal: ctrl.signal,
    });
    const d = await res.json().catch(() => null);
    if (!d) return { ok: false, motivo: 'erro_api', mensagem: 'A IA não respondeu. Tente outra vez daqui a pouco.' };
    if (!d.ok && d.motivo === 'sem_chave') semChaveNestaSessao = true;
    return d as RespostaIA;
  } catch {
    return { ok: false, motivo: 'erro_rede', mensagem: 'Sem ligação à IA. Confirme a ligação à internet.' };
  } finally { clearTimeout(t); }
}
