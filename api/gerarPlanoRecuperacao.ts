// Vercel Serverless Function — gera o Plano de Recuperação Individual usando
// a Gemini API (free tier). A chave GEMINI_API_KEY vive só nas variáveis de
// ambiente da Vercel, nunca chega ao browser. Se a chave não estiver
// configurada, ou se a Gemini devolver erro de limite (429), responde com
// um sinal claro para a app cair no modo manual (prompt copiável).
//
// Variável de ambiente necessária na Vercel:
//   GEMINI_API_KEY — obtida em https://aistudio.google.com/apikey (grátis)

export const config = { runtime: 'edge' };

interface PedidoPlanoIndividual {
  prompt: string; // o mesmo prompt fechado já construído pela app (matrizEvidencias.ts)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, erro: 'Método não permitido' }), { status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Sem chave configurada — a app deve cair no modo manual automaticamente.
    return new Response(JSON.stringify({ ok: false, motivo: 'sem_chave', mensagem: 'Gemini API não configurada nesta instalação.' }), { status: 200 });
  }

  let body: PedidoPlanoIndividual;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, erro: 'Corpo do pedido inválido' }), { status: 400 });
  }

  if (!body.prompt || body.prompt.trim().length === 0) {
    return new Response(JSON.stringify({ ok: false, erro: 'Prompt em falta' }), { status: 400 });
  }

  // Instrução extra para a Gemini devolver JSON estruturado e previsível —
  // sem isto, modelos generativos tendem a variar o formato da resposta.
  const promptComFormato = `${body.prompt}

IMPORTANTE: Responde APENAS com um objeto JSON válido, sem texto antes ou depois, sem blocos de código markdown, com exatamente esta estrutura:
{
  "resumo": "2-3 frases sobre o que falta recuperar",
  "tarefas": ["tarefa 1", "tarefa 2", "..."],
  "questoesTecnicas": ["pergunta 1", "pergunta 2", "..."],
  "casoProfissional": "texto do caso profissional completo",
  "evidenciasExigidas": ["evidência 1", "evidência 2", "..."],
  "competenciasComDefesaOral": ["nome da competência 1", "..."],
  "tempoEstimadoMinutos": 60
}`;

  try {
    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptComFormato }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
      }
    );

    if (resposta.status === 429) {
      // Limite gratuito atingido — sinal claro para a app cair no modo manual.
      return new Response(JSON.stringify({ ok: false, motivo: 'limite_atingido', mensagem: 'Limite diário gratuito da Gemini atingido. Usa o modo manual.' }), { status: 200 });
    }

    if (!resposta.ok) {
      const textoErro = await resposta.text();
      return new Response(JSON.stringify({ ok: false, motivo: 'erro_api', mensagem: textoErro.slice(0, 300) }), { status: 200 });
    }

    const dados = await resposta.json();
    const textoGerado = dados?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let planoJson;
    try {
      planoJson = JSON.parse(textoGerado);
    } catch {
      return new Response(JSON.stringify({ ok: false, motivo: 'resposta_invalida', mensagem: 'A IA não devolveu JSON válido.', textoOriginal: textoGerado.slice(0, 500) }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true, plano: planoJson }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, motivo: 'erro_rede', mensagem: String(err?.message || err) }), { status: 200 });
  }
}
