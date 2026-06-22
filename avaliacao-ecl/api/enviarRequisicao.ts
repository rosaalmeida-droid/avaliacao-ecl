// Vercel Serverless Function — proxy para o Apps Script da Requisição ECL
//
// PROBLEMA RESOLVIDO: o browser não consegue enviar directamente para o
// Apps Script porque o Google retorna um redirect 302, que o browser bloqueia
// com no-cors (confirmado pelo Network: "exec 302 fetch / Redirect").
//
// SOLUÇÃO: a app envia para esta função Vercel (mesma origem, sem CORS),
// e esta função reencaminha para o Apps Script do lado do servidor,
// onde não há restrições de CORS nem problemas de redirect.
//
// FLUXO:
// App → /api/enviarRequisicao (Vercel) → Apps Script → Google Sheets

export const config = { runtime: 'edge' };

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7g1xOC8gg23zI-wbE5ttAIHVj0l7GQrGkhSudCRvJqvgL5OK3bsBRmOSu4nNsEpR4aA/exec';

export default async function handler(req: Request): Promise<Response> {
  // Cabeçalhos CORS — permite que a app chame esta função
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Pré-voo CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, mensagem: 'Método não permitido' }), { status: 405, headers });
  }

  let payload: string;
  try {
    // Ler o corpo como texto — mantém o formato exacto que o Apps Script espera
    payload = await req.text();
    if (!payload) throw new Error('Corpo vazio');
    // Validar que é JSON válido antes de reencaminhar
    JSON.parse(payload);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, mensagem: 'Payload inválido: ' + String(err) }), { status: 400, headers });
  }

  try {
    // Reencaminhar para o Apps Script — do lado do servidor, sem CORS
    // O Apps Script recebe exactamente o mesmo JSON que a app enviou
    const respostaScript = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
      redirect: 'follow', // seguir o redirect 302 automaticamente (servidor pode fazer isto, browser não)
    });

    let dadosResposta: any;
    try {
      const textoResposta = await respostaScript.text();
      dadosResposta = JSON.parse(textoResposta);
    } catch {
      // Apps Script respondeu mas não com JSON — tratar como sucesso se status OK
      dadosResposta = { ok: respostaScript.ok, mensagem: 'Resposta recebida (sem JSON)' };
    }

    return new Response(JSON.stringify(dadosResposta), { status: 200, headers });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, mensagem: 'Erro ao contactar Apps Script: ' + String(err?.message || err) }),
      { status: 200, headers }
    );
  }
}
