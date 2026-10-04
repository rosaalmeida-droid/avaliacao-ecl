// ============================================================
// Perguntas de autoavaliação das técnicas, criadas com a ficha técnica
// (Rosa, out/2026).
//
// A IA escreve, para cada técnica e preparação base da ficha, duas
// perguntas: uma sobre a EXECUÇÃO (o gesto, a sequência, os cuidados) e
// outra sobre o RESULTADO observável. Cada uma tem 4 respostas em
// progressão real (nível 1 a 4) e três versões: normal, medidas seletivas
// e medidas adicionais.
//
// As perguntas ficam guardadas na ficha (chegam à base de dados e aos
// outros aparelhos pelo caminho das fichas). O professor aprova, pede
// outra ou retira. As aprovadas formam o banco: voltam a ser usadas
// sempre que a mesma técnica aparece noutra ficha. As substituídas não se
// apagam: ficam para se perceber o que os professores rejeitam.
// ============================================================

export type AspetoPergunta = 'execucao' | 'resultado';
export type EstadoPergunta = 'proposta' | 'aprovada' | 'substituida' | 'rejeitada';

export interface VersaoPergunta {
  pergunta: string;
  /** Do nível 1 (o mais fraco) ao nível 4. Na aplicação, a ordem é baralhada. */
  respostas: [string, string, string, string];
}

export interface PerguntaTecnica {
  id: string;
  /** SUB-… ou APP-… */
  competenciaId: string;
  aspeto: AspetoPergunta;
  normal: VersaoPergunta;
  simples?: VersaoPergunta;
  muitoSimples?: VersaoPergunta;
  estado: EstadoPergunta;
  /** O que a verificação automática encontrou (quando não cumpre as regras). */
  problemas?: string[];
  criadaEm: string;
  aprovadaEm?: string;
  aprovadaPor?: string;
  /** Id da pergunta que a substituiu. */
  substituidaPor?: string;
  origemFichaId?: string;
}

// ── As regras (as mesmas no pedido da ficha e no «pedir outra») ──────────
export const REGRAS_PERGUNTAS = `
REGRA 11 — PERGUNTAS DE AUTOAVALIAÇÃO DAS TÉCNICAS
Para CADA subtécnica e CADA aparelho de «SUBTÉCNICAS DETECTADAS» e «APARELHOS DETECTADOS»,
escreve DUAS perguntas de autoavaliação para o aluno:
  EXECUCAO — como o aluno executou: o gesto, a posição das mãos, o utensílio, a sequência,
             a temperatura, os sinais que vigiou, os cuidados de segurança e de higiene.
  RESULTADO — como ficou o produto, por critérios técnicos observáveis: medidas, espessura,
             textura, cor, ponto de cozedura, temperatura.
Cada pergunta tem QUATRO respostas, numa progressão REAL do nível 1 ao nível 4:
  nível 1 — erro técnico grave (ou não executou);
  nível 2 — executou com erros, ou o professor teve de corrigir;
  nível 3 — execução correta;
  nível 4 — execução correta, regular e consistente do início ao fim, sem correções.
  Só UMA resposta pode corresponder ao nível 4. Duas respostas corretas NUNCA podem valer o mesmo.
Regras de escrita (obrigatórias):
  - Cada resposta descreve uma situação concreta, que o professor pode verificar
    (com medidas, tempos, temperaturas ou sinais visuais). Proibido: «fiz bem», «ficou ótimo», «correu bem».
  - As perguntas avaliam o gesto técnico ensinado pelo professor. NUNCA digas que o aluno aprendeu
    a técnica na ficha técnica: a ficha organiza a receita, não ensina a executar.
  - As quatro respostas têm extensão e tom semelhantes. Nenhuma começa por «Tudo isto».
    A resposta de nível 4 não se distingue por acrescentar algo às anteriores nem por ajudar colegas.
  - Português de Portugal, Acordo Ortográfico em vigor, linguagem cuidada, frases completas,
    primeira pessoa do pretérito perfeito («Mantive», «Retirei», «Ficou»). Sem linguagem coloquial.
  - Escreve também duas versões mais fáceis da MESMA pergunta, em que cada resposta vale o mesmo nível:
    SIMPLES (medidas seletivas: frases curtas, uma ideia de cada vez) e
    MUITO SIMPLES (medidas adicionais: até 6 palavras por resposta).
Formato — uma linha por versão, separada por « | », respostas do nível 1 para o nível 4:
  ID | EXECUCAO ou RESULTADO | NORMAL ou SIMPLES ou MUITO SIMPLES | pergunta | resposta 1 | resposta 2 | resposta 3 | resposta 4
Exemplo:
  SUB-PAP-086-001 | EXECUCAO | NORMAL | Como conduziste a caramelização do açúcar? | Mexi o açúcar com a colher enquanto aquecia e formaram-se cristais e grumos. | Não mexi, mas afastei-me do lume e o açúcar escureceu demasiado numa zona. | Não mexi e fui inclinando o tacho, para o açúcar derreter por igual. | Não mexi, inclinei o tacho e retirei-o do lume pouco antes da cor pretendida, porque o caramelo continua a escurecer.
  SUB-PAP-086-001 | EXECUCAO | SIMPLES | Como fizeste o caramelo? | Mexi com a colher e ficou com grumos. | Afastei-me e queimou numa parte. | Não mexi e inclinei o tacho. | Não mexi e tirei do lume antes de escurecer.
  SUB-PAP-086-001 | EXECUCAO | MUITO SIMPLES | O caramelo: o que fizeste? | Mexi. Ficou com grumos. | Queimou numa parte. | Inclinei o tacho. | Tirei do lume a tempo.
`;

// ── Ler a resposta da IA ─────────────────────────────────────────────────
const RE_SECCAO = /PERGUNTAS DE AUTOAVALIA[ÇC][ÃA]O:\s*\n([\s\S]*?)(?=\n={3,}|\n---|\n[A-ZÇÃÉÍÓÚ ]{6,}:\s*\n|$)/i;

function novoId(): string {
  return 'pt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** As perguntas da secção «PERGUNTAS DE AUTOAVALIAÇÃO» da resposta da IA. */
export function lerPerguntasDaIA(texto: string, fichaId?: string): PerguntaTecnica[] {
  const sec = String(texto || '').match(RE_SECCAO)?.[1] || '';
  const porChave = new Map<string, PerguntaTecnica>();
  const agora = new Date().toISOString();
  for (const linha of sec.split('\n')) {
    const partes = linha.replace(/^[-·•*\s]+/, '').split('|').map(s => s.trim());
    if (partes.length < 8) continue;
    const [idBruto, aspBruto, verBruto, pergunta, r1, r2, r3, r4] = partes;
    const competenciaId = (idBruto.match(/(SUB|APP)-[A-Z0-9-]+/i)?.[0] || '').toUpperCase();
    if (!competenciaId) continue;
    const aspeto: AspetoPergunta = /RESULT/i.test(aspBruto) ? 'resultado' : 'execucao';
    const versao: VersaoPergunta = { pergunta, respostas: [r1, r2, r3, r4] };
    const chave = competenciaId + '|' + aspeto;
    const p = porChave.get(chave) || {
      id: novoId(), competenciaId, aspeto, normal: versao, estado: 'proposta' as EstadoPergunta,
      criadaEm: agora, ...(fichaId ? { origemFichaId: fichaId } : {}),
    };
    if (/MUITO/i.test(verBruto)) p.muitoSimples = versao;
    else if (/SIMPLES/i.test(verBruto)) p.simples = versao;
    else p.normal = versao;
    porChave.set(chave, p);
  }
  return [...porChave.values()].map(p => {
    const problemas = validarPergunta(p);
    return problemas.length ? { ...p, estado: 'rejeitada' as EstadoPergunta, problemas } : p;
  });
}

// ── Verificação automática (antes de chegar ao professor) ────────────────
const PROIBIDAS: [RegExp, string][] = [
  [/^tudo isto/i, 'começa por «Tudo isto»'],
  [/\b(goz|chatead|bocado|calhas|desenrasc|fixe|bué|porreir)/i, 'linguagem coloquial'],
  [/\b(fiz bem|ficou ótimo|ficou otimo|correu bem)\b/i, 'resposta vaga'],
  [/\b(acção|actividade|objectivo|correcto|exacto|óptimo)\b/i, 'grafia anterior ao Acordo'],
];

export function validarPergunta(p: PerguntaTecnica): string[] {
  const problemas: string[] = [];
  const versoes: [string, VersaoPergunta | undefined][] = [['normal', p.normal], ['simples', p.simples], ['muito simples', p.muitoSimples]];
  if (!p.simples) problemas.push('falta a versão simples');
  if (!p.muitoSimples) problemas.push('falta a versão muito simples');
  for (const [nome, v] of versoes) {
    if (!v) continue;
    if (!v.pergunta || v.pergunta.length < 8) problemas.push(`${nome}: pergunta vazia`);
    if (v.respostas.some(r => !r || r.length < 3)) problemas.push(`${nome}: faltam respostas`);
    if (new Set(v.respostas.map(r => r.toLowerCase())).size < 4) problemas.push(`${nome}: respostas repetidas`);
    for (const r of [v.pergunta, ...v.respostas]) {
      for (const [re, motivo] of PROIBIDAS) if (re.test(r)) problemas.push(`${nome}: ${motivo}`);
    }
    // Extensão semelhante: a mais longa não pode ter mais do dobro e meio da mais curta.
    const tam = v.respostas.map(r => r.length).filter(n => n > 0);
    if (nome === 'normal' && tam.length === 4 && Math.max(...tam) > 2.5 * Math.min(...tam)) problemas.push('normal: respostas com extensões muito diferentes');
  }
  return [...new Set(problemas)];
}

// ── O banco: as aprovadas, por técnica ───────────────────────────────────
/** As perguntas aprovadas de todas as fichas, por competência e aspeto (a mais recente primeiro). */
export function bancoDePerguntas(fichas: any[]): Map<string, PerguntaTecnica[]> {
  const banco = new Map<string, PerguntaTecnica[]>();
  const vistos = new Set<string>();
  for (const f of fichas || []) {
    for (const p of (f?.perguntasAuto || []) as PerguntaTecnica[]) {
      if (p.estado !== 'aprovada') continue;
      const assinatura = p.competenciaId + '|' + p.aspeto + '|' + p.normal.pergunta.toLowerCase();
      if (vistos.has(assinatura)) continue;
      vistos.add(assinatura);
      const chave = p.competenciaId + '|' + p.aspeto;
      banco.set(chave, [...(banco.get(chave) || []), p]);
    }
  }
  for (const [k, l] of banco) banco.set(k, l.sort((a, b) => String(b.aprovadaEm || '').localeCompare(String(a.aprovadaEm || ''))));
  return banco;
}

/** Já há uma pergunta aprovada no banco para esta técnica e aspeto? */
export function aprovadaNoBanco(fichas: any[], competenciaId: string, aspeto: AspetoPergunta): PerguntaTecnica | undefined {
  return bancoDePerguntas(fichas).get(competenciaId + '|' + aspeto)?.[0];
}

// ── Pedir outra pergunta ─────────────────────────────────────────────────
export function promptPedirOutra(p: PerguntaTecnica, nomeTecnica: string, prato: string, rejeitadas: PerguntaTecnica[] = []): string {
  const aspeto = p.aspeto === 'execucao' ? 'EXECUCAO' : 'RESULTADO';
  return [
    `Escreve UMA pergunta de autoavaliação, nova, para a técnica ${p.competenciaId} — ${nomeTecnica}, no prato «${prato}».`,
    `Aspeto: ${aspeto}. A pergunta tem de ser diferente destas, que o professor não aprovou:`,
    ...[p, ...rejeitadas].map(x => `  - ${x.normal.pergunta}`),
    REGRAS_PERGUNTAS,
    'Responde APENAS com a secção abaixo (três linhas: NORMAL, SIMPLES e MUITO SIMPLES), sem mais nada:',
    'PERGUNTAS DE AUTOAVALIAÇÃO:',
  ].join('\n');
}

/** Marca a pergunta como substituída pela nova (a antiga não se apaga). */
export function substituirPergunta(lista: PerguntaTecnica[], antigaId: string, nova: PerguntaTecnica): PerguntaTecnica[] {
  return [...lista.map(x => x.id === antigaId ? { ...x, estado: 'substituida' as EstadoPergunta, substituidaPor: nova.id } : x), nova];
}

export function aprovarPergunta(lista: PerguntaTecnica[], id: string, quem: string): PerguntaTecnica[] {
  return lista.map(x => x.id === id ? { ...x, estado: 'aprovada' as EstadoPergunta, aprovadaEm: new Date().toISOString(), aprovadaPor: quem } : x);
}

// ── Criar as perguntas de uma ficha que ainda não as tem ─────────────────
/** Pedido à IA só com as técnicas da ficha (fichas antigas, ou quando se perderam). */
export function promptPerguntasDaFicha(prato: string, tecnicas: string[], aparelhos: string[], preparacao: string[]): string {
  return [
    `Ficha técnica: «${prato}». Passos da preparação:`,
    ...preparacao.slice(0, 25).map((p, i) => `  ${i + 1}. ${p}`),
    'SUBTÉCNICAS DETECTADAS:',
    ...(tecnicas.length ? tecnicas : ['nenhuma']).map(t => `  ${t}`),
    'APARELHOS DETECTADOS:',
    ...(aparelhos.length ? aparelhos : ['nenhum']).map(a => `  ${a}`),
    REGRAS_PERGUNTAS,
    'Responde APENAS com a secção abaixo, para todas as subtécnicas e aparelhos acima (6 linhas por cada), sem mais nada:',
    'PERGUNTAS DE AUTOAVALIAÇÃO:',
  ].join('\n');
}
