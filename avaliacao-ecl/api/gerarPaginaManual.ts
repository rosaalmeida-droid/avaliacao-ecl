// api/gerarPaginaManual.ts  (função serverless — runtime edge)
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

export const config = { runtime: 'edge' };

const MAX_TOKENS = 8192;

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

type Resultado = { texto?: string; limite?: boolean; erro?: string };

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
    if (resp.status === 429) return { limite: true };
    if (!resp.ok) return { erro: `gemini ${resp.status}` };
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
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: MAX_TOKENS, response_format: { type: 'json_object' } }),
    });
    if (resp.status === 429) return { limite: true };
    if (!resp.ok) return { erro: `${model} ${resp.status}` };
    const d = await resp.json();
    return { texto: d?.choices?.[0]?.message?.content || '' };
  } catch (e: any) { return { erro: `${model} rede` }; }
}

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, motivo: 'metodo', mensagem: 'Método não permitido' }), { status: 405, headers });

  let prompt = '';
  try { const corpo = await req.json(); prompt = (corpo && corpo.prompt) || ''; } catch { /* */ }
  if (!prompt) return new Response(JSON.stringify({ ok: false, motivo: 'corpo', mensagem: 'Falta o prompt.' }), { status: 400, headers });

  const env = process.env;
  const provedores: { nome: string; run: () => Promise<Resultado> }[] = [];
  if (env.GEMINI_API_KEY) provedores.push({ nome: 'gemini', run: () => chamarGemini(prompt) });
  if (env.GROQ_API_KEY) provedores.push({ nome: 'groq', run: () => chamarOpenAICompat('https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY, env.GROQ_MODEL || 'llama-3.3-70b-versatile', prompt) });
  if (env.OPENAI_API_KEY) provedores.push({ nome: 'openai', run: () => chamarOpenAICompat('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, env.OPENAI_MODEL || 'gpt-4o-mini', prompt) });

  if (!provedores.length) return new Response(JSON.stringify({ ok: false, motivo: 'sem_chave', mensagem: 'Configura GEMINI_API_KEY (ou GROQ_API_KEY / OPENAI_API_KEY) na Vercel.' }), { status: 200, headers });

  let ultimoMotivo = 'limite_atingido';
  const notas: string[] = [];
  for (const p of provedores) {
    const r = await p.run();
    if (r.texto) {
      try {
        const pagina = reparaJson(r.texto);
        return new Response(JSON.stringify({ ok: true, pagina, fornecedor: p.nome }), { status: 200, headers });
      } catch { ultimoMotivo = 'json_invalido'; notas.push(`${p.nome}: json inválido`); continue; }
    }
    if (r.limite) { ultimoMotivo = 'limite_atingido'; notas.push(`${p.nome}: limite`); continue; }
    ultimoMotivo = 'erro_api'; notas.push(`${p.nome}: ${r.erro || 'erro'}`); continue;
  }

  return new Response(JSON.stringify({ ok: false, motivo: ultimoMotivo, mensagem: 'Todos os fornecedores falharam: ' + notas.join('; ') }), { status: 200, headers });
}
