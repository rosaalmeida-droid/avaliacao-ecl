// api/gerarPaginaManual.ts
// Vercel Serverless Function — gera UMA página de manual do aluno usando a
// Gemini API (free tier), exactamente no mesmo molde de api/gerarPlanoRecuperacao.ts.
// A chave GEMINI_API_KEY vive só nas variáveis de ambiente da Vercel.
// Se não houver chave, ou a Gemini devolver 429 (limite grátis), responde com
// um motivo claro para a app cair no modo manual (copiar prompt / colar JSON).
//
// A app envia { prompt } — o prompt já pede JSON com o formato de uma página.
// FLUXO: App → /api/gerarPaginaManual (Vercel) → Gemini → { ok, pagina }

export const config = { runtime: 'edge' };

// Repara JSON da IA: tira crases, isola o 1.º objeto/array, remove vírgulas
// finais e FECHA strings/parênteses cortados (quando a resposta vem truncada).
// Lança se mesmo assim não der — apanhado por quem chama.
function reparaJson(texto: string): any {
  let s = String(texto || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const fO = s.indexOf('{');
  const fA = s.indexOf('[');
  const start = fA >= 0 && (fO < 0 || fA < fO) ? fA : fO;
  if (start > 0) s = s.slice(start);
  const semVirg = s.replace(/,(\s*[}\]])/g, '$1');
  for (const cand of [s, semVirg]) {
    try { return JSON.parse(cand); } catch { /* tenta reparar */ }
  }
  // fechar o que ficou aberto (truncagem)
  let t = semVirg;
  let inStr = false;
  let escp = false;
  const stack: string[] = [];
  for (const c of t) {
    if (inStr) {
      if (escp) escp = false;
      else if (c === '\\') escp = true;
      else if (c === '"') inStr = false;
      continue;
    }
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

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, motivo: 'metodo', mensagem: 'Método não permitido' }), { status: 405, headers });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, motivo: 'sem_chave', mensagem: 'Gemini API não configurada nesta instalação.' }), { status: 200, headers });
  }

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, motivo: 'corpo', mensagem: 'Corpo do pedido inválido' }), { status: 400, headers });
  }

  const prompt = (body.prompt || '').trim();
  if (!prompt) {
    return new Response(JSON.stringify({ ok: false, motivo: 'sem_prompt', mensagem: 'Prompt em falta' }), { status: 400, headers });
  }

  try {
    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: 'application/json' },
        }),
      }
    );

    if (resposta.status === 429) {
      return new Response(JSON.stringify({ ok: false, motivo: 'limite_atingido', mensagem: 'Limite diário gratuito da Gemini atingido. Tenta mais tarde ou usa o modo manual.' }), { status: 200, headers });
    }
    if (!resposta.ok) {
      const textoErro = await resposta.text();
      return new Response(JSON.stringify({ ok: false, motivo: 'erro_api', mensagem: textoErro.slice(0, 300) }), { status: 200, headers });
    }

    const dados = await resposta.json();
    const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let pagina: any;
    try {
      pagina = reparaJson(texto);
    } catch {
      return new Response(JSON.stringify({ ok: false, motivo: 'json_invalido', mensagem: 'A IA não devolveu JSON válido.', textoOriginal: texto.slice(0, 300) }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: true, pagina }), { status: 200, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, motivo: 'rede', mensagem: String(err?.message || err) }), { status: 200, headers });
  }
}
