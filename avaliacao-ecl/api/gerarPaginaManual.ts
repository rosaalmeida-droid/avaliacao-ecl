// api/gerarPaginaManual.ts  (função serverless — runtime Node, até 60s)
// Gera UMA página/capítulo do manual do aluno, em JSON.
// MULTI-FORNECEDOR: tenta, por ordem, os fornecedores para os quais existir
// chave nas variáveis de ambiente — Gemini → Groq (grátis) → OpenAI (pago).
// Se um esgotar o limite (429) ou falhar, salta automaticamente para o
// seguinte. Devolve SEMPRE JSON. A app envia { prompt }.
//
// Variáveis de ambiente (na Vercel):
//   GEMINI_API_KEY   — Google AI Studio (grátis)          [principal]
//   GROQ_API_KEY     — console.groq.com (grátis, sem cartão) [fallback grátis]
//   OPENAI_API_KEY   — platform.openai.com (PAGO)          [fallback pago]
// Opcionais (para mudar o modelo sem mexer no código):
//   GROQ_MODEL   (default llama-3.3-70b-versatile)
//   OPENAI_MODEL (default gpt-4o-mini)

declare const process: { env: Record<string, string | undefined> };

export const config = { maxDuration: 60 }; // runtime Node (default) — permite até 60s no plano Hobby

const MAX_TOKENS = 8192;         // Gemini (TPM alto)
const MAX_TOKENS_COMPAT = 4096;  // Groq/OpenAI (TPM mais baixo no grátis)

// ── reparação de JSON (fecha o que vier cortado) ────────────────────────────
function reparaJson(texto: string): any {
  let s = String(texto || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const fO = s.indexOf('{');
  const fA = s.indexOf('[');
  const start = fA >= 0 && (fO < 0 || fA < fO) ? fA : fO;
  if (start > 0) s = s.slice(start);
  const semVirg = s.replace(/,(\s*[}\]])/g, '$1');
  for (const cand of [s, semVirg]) { try { return JSON.parse(cand); } catch { /* repara */ } }
  let t = semVirg;
  let inStr = false;
  let escp = false;
  const stack: string[] = [];
  for (const c of t) {
    if (inStr) { if (escp) escp = false; else if (c === '\\') escp = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') stack.pop();
  }
  if (inStr) t += '"';
  t = t.replace(/,\s*$/, '').replace(/:\s*$/, ': null');
  while (stack.length) t += stack.pop();
  return JSON.parse(t);
}

type Resultado = { texto?: string; limite?: boolean; auth?: boolean; erro?: string; detalhe?: string };

// ── Gemini (Google) ─────────────────────────────────────────────────────────
async function chamarGemini(prompt: string): Promise<Resultado> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { erro: 'sem_chave' };
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: MAX_TOKENS, responseMimeType: 'application/json' } }),
    });
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      const det = corpo.replace(/\s+/g, ' ').slice(0, 160);
      if (resp.status === 429) return { limite: true, detalhe: det };
      if (resp.status === 401 || resp.status === 403) return { auth: true, erro: `gemini ${resp.status}`, detalhe: det };
      return { erro: `gemini ${resp.status}`, detalhe: det };
    }
    const d = await resp.json();
    return { texto: d?.candidates?.[0]?.content?.parts?.[0]?.text || '' };
  } catch (e: any) { return { erro: 'gemini rede' }; }
}

// ── Groq / OpenAI (API compatível OpenAI) ───────────────────────────────────
async function chamarOpenAICompat(url: string, key: string, model: string, prompt: string): Promise<Resultado> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: MAX_TOKENS_COMPAT, response_format: { type: 'json_object' } }),
    });
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => '');
      const det = corpo.replace(/\s+/g, ' ').slice(0, 160);
      if (resp.status === 429) return { limite: true, detalhe: det };
      if (resp.status === 401 || resp.status === 403) return { auth: true, erro: `${model} ${resp.status}`, detalhe: det };
      return { erro: `${model} ${resp.status}`, detalhe: det };
    }
    const d = await resp.json();
    return { texto: d?.choices?.[0]?.message?.content || '' };
  } catch (e: any) { return { erro: `${model} rede` }; }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, motivo: 'metodo', mensagem: 'Método não permitido' }); return; }

  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const prompt = (body && body.prompt) || '';
  if (!prompt) { res.status(400).json({ ok: false, motivo: 'corpo', mensagem: 'Falta o prompt.' }); return; }

  const env = process.env;
  const provedores: { nome: string; run: () => Promise<Resultado> }[] = [];
  // Ordem: OpenAI (melhor texto) primeiro; Gemini a seguir; Groq como última rede.
  if (env.OPENAI_API_KEY) provedores.push({ nome: 'openai', run: () => chamarOpenAICompat('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY as string, env.OPENAI_MODEL || 'gpt-4o-mini', prompt) });
  if (env.GEMINI_API_KEY) provedores.push({ nome: 'gemini', run: () => chamarGemini(prompt) });
  if (env.GROQ_API_KEY) provedores.push({ nome: 'groq', run: () => chamarOpenAICompat('https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY as string, env.GROQ_MODEL || 'llama-3.1-8b-instant', prompt) });

  if (!provedores.length) { res.status(200).json({ ok: false, motivo: 'sem_chave', mensagem: 'Configura OPENAI_API_KEY (ou GEMINI_API_KEY / GROQ_API_KEY) na Vercel.' }); return; }

  let ultimoMotivo = 'limite_atingido';
  const notas: string[] = [];
  for (const p of provedores) {
    const r = await p.run();
    if (r.texto) {
      try {
        const pagina = reparaJson(r.texto);
        res.status(200).json({ ok: true, pagina, fornecedor: p.nome, avisos: notas });
        return;
      } catch { ultimoMotivo = 'json_invalido'; notas.push(`${p.nome}: json inválido`); continue; }
    }
    if (r.auth) { ultimoMotivo = 'chave_invalida'; notas.push(`${p.nome}: chave inválida${r.detalhe ? ' — ' + r.detalhe : ''}`); continue; }
    if (r.limite) { ultimoMotivo = 'limite_atingido'; notas.push(`${p.nome}: limite${r.detalhe ? ' — ' + r.detalhe : ''}`); continue; }
    ultimoMotivo = 'erro_api'; notas.push(`${p.nome}: ${r.erro || 'erro'}${r.detalhe ? ' — ' + r.detalhe : ''}`); continue;
  }

  res.status(200).json({ ok: false, motivo: ultimoMotivo, mensagem: 'Todos os fornecedores falharam: ' + notas.join('; ') });
}
