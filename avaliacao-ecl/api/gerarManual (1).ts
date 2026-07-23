// Vercel Serverless Function — proxy para o Apps Script do Manual do Cozinheiro
// Resolve o problema de redirect 302 do Google Apps Script (browser não consegue seguir)
// FLUXO: App → /api/gerarManual (Vercel) → Apps Script "Criar Guião" → Google Drive

export const config = { runtime: 'edge' };

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzBxobzVzxVfoAKC7wiqmKRiKru8z_FM1g7O6sTvRUE9q2QpD3DsTRfkrAFnouA41a1LA/exec';

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, erro: 'Método não permitido' }), { status: 405, headers });

  let payload: string;
  try {
    payload = await req.text();
    if (!payload) throw new Error('Corpo vazio');
    JSON.parse(payload);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, erro: 'Payload inválido: ' + String(err) }), { status: 400, headers });
  }

  try {
    const resposta = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
      redirect: 'follow',
    });

    let dados: any;
    try {
      dados = JSON.parse(await resposta.text());
    } catch {
      dados = { ok: resposta.ok, erro: 'Resposta sem JSON' };
    }

    return new Response(JSON.stringify(dados), { status: 200, headers });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, erro: 'Erro ao contactar Apps Script: ' + String(err?.message || err) }),
      { status: 200, headers }
    );
  }
}
