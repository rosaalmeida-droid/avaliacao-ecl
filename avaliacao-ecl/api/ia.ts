// api/ia.ts  (função serverless — runtime Node, até 60s)
// Um pedido de texto à IA, para a aplicação falar diretamente com ela
// (fichas técnicas e perguntas de autoavaliação). O Gemini vai à frente
// (escalão gratuito) e o OpenAI fica de reserva (pago). Devolve sempre JSON:
//   { ok: true, texto, fornecedor }  ou  { ok: false, motivo, mensagem }
//
// GET /api/ia?teste=1 → um pedido mínimo, para a professora confirmar no
// navegador que a chave funciona (Rosa, out/2026).
//
// Variáveis de ambiente (na Vercel): GEMINI_API_KEY, OPENAI_API_KEY (opcional).

declare const process: { env: Record<string, string | undefined> };

export const config = { maxDuration: 60 };

type Resultado = { texto?: string; limite?: boolean; auth?: boolean; erro?: string };

async function chamarGemini(prompt: string, maxTokens: number, lerLinks = false): Promise<Resultado> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { erro: 'sem_chave' };
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Com um link de receita, o Gemini pode abrir a página (url_context).
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], ...(lerLinks ? { tools: [{ url_context: {} }] } : {}),
        generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } } }),
    });
    if (!resp.ok) {
      if (resp.status === 429) return { limite: true };
      if (resp.status === 401 || resp.status === 403) return { auth: true, erro: `gemini ${resp.status}` };
      return { erro: `gemini ${resp.status}` };
    }
    const d = await resp.json();
    const partes = d?.candidates?.[0]?.content?.parts || [];
    return { texto: partes.map((p: any) => p?.text || '').join('') };
  } catch { return { erro: 'gemini rede' }; }
}

async function chamarOpenAI(prompt: string, maxTokens: number): Promise<Resultado> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { erro: 'sem_chave' };
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: Math.min(maxTokens, 16000) }),
    });
    if (!resp.ok) {
      if (resp.status === 429) return { limite: true };
      if (resp.status === 401 || resp.status === 403) return { auth: true, erro: `openai ${resp.status}` };
      return { erro: `openai ${resp.status}` };
    }
    const d = await resp.json();
    return { texto: d?.choices?.[0]?.message?.content || '' };
  } catch { return { erro: 'openai rede' }; }
}

const MENSAGEM: Record<string, string> = {
  sem_chave: 'Não há nenhuma chave da IA configurada no Vercel (GEMINI_API_KEY).',
  chave_invalida: 'A chave da IA não é aceite. Confirme a chave guardada no Vercel.',
  limite_atingido: 'O limite gratuito de pedidos à IA foi atingido. Tente mais tarde ou use o modo de copiar e colar.',
  erro_api: 'A IA não respondeu. Tente outra vez daqui a pouco.',
};

async function pedir(prompt: string, maxTokens: number, lerLinks = false): Promise<{ ok: true; texto: string; fornecedor: string } | { ok: false; motivo: string; mensagem: string }> {
  const provedores: { nome: string; run: () => Promise<Resultado> }[] = [];
  if (process.env.GEMINI_API_KEY) provedores.push({ nome: 'gemini', run: () => chamarGemini(prompt, maxTokens, lerLinks) });
  if (process.env.OPENAI_API_KEY) provedores.push({ nome: 'openai', run: () => chamarOpenAI(prompt, maxTokens) });
  if (!provedores.length) return { ok: false, motivo: 'sem_chave', mensagem: MENSAGEM.sem_chave };
  let motivo = 'erro_api';
  for (const p of provedores) {
    const r = await p.run();
    if (r.texto && r.texto.trim()) return { ok: true, texto: r.texto, fornecedor: p.nome };
    motivo = r.limite ? 'limite_atingido' : r.auth ? 'chave_invalida' : 'erro_api';
  }
  return { ok: false, motivo, mensagem: MENSAGEM[motivo] || MENSAGEM.erro_api };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method === 'GET') {
    const r = await pedir('Responde apenas com a palavra: funciona', 20);
    res.status(200).json(r.ok
      ? { ok: true, mensagem: 'A ligação à IA funciona.', fornecedor: r.fornecedor }
      : r);
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, motivo: 'metodo', mensagem: 'Método não permitido.' }); return; }

  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const prompt = String(body?.prompt || '');
  if (!prompt) { res.status(400).json({ ok: false, motivo: 'corpo', mensagem: 'Falta o pedido.' }); return; }
  // Limite de tamanho: evita usos abusivos do endereço público.
  if (prompt.length > 120000) { res.status(413).json({ ok: false, motivo: 'corpo', mensagem: 'O pedido é demasiado grande.' }); return; }
  const maxTokens = Math.min(Number(body?.maxTokens) || 8192, 16000);
  res.status(200).json(await pedir(prompt, maxTokens, !!body?.lerLinks));
}
