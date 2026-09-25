// ============================================================
// Revisão mensal dos preços — com a ajuda de uma IA
// ============================================================
// A aplicação não consegue ir ao continente.pt (o site não deixa). Quem
// consegue é uma IA com pesquisa na internet. Por isso:
//   1. a aplicação escreve o pedido, com a lista completa dos produtos;
//   2. a coordenadora cola-o na IA, e a IA devolve os preços em JSON;
//   3. a coordenadora cola a resposta aqui; a aplicação verifica tudo e
//      mostra o que muda antes de gravar;
//   4. confirmado, fica no aparelho e vai para o Sheets (folha PRECOS).
// O documento oficial da requisição não muda: só os preços que o enchem.
// ============================================================
import { getMateriaPrimasBase, getPrecosRevistos, juntarPrecosRevistos, type MateriaPrimaBase, type PrecoRevisto } from './materiasPrimasBase';
import { enviarPrecosRevistos, marcarPrecosRevistos } from './backend';

/** Grupos de produtos, para o pedido não ser grande demais para a IA. */
export function gruposDeProdutos(): { nome: string; ids: string[] }[] {
  const porCat = new Map<string, string[]>();
  getMateriaPrimasBase().forEach(mp => porCat.set(mp.categoria, [...(porCat.get(mp.categoria) || []), mp.id]));
  // Juntam-se categorias até ~60 produtos por parte.
  const partes: { nome: string; ids: string[] }[] = [];
  let atual: { nome: string[]; ids: string[] } = { nome: [], ids: [] };
  [...porCat.entries()].forEach(([cat, ids]) => {
    if (atual.ids.length && atual.ids.length + ids.length > 60) {
      partes.push({ nome: atual.nome.join(', '), ids: atual.ids });
      atual = { nome: [], ids: [] };
    }
    atual.nome.push(cat); atual.ids.push(...ids);
  });
  if (atual.ids.length) partes.push({ nome: atual.nome.join(', '), ids: atual.ids });
  return partes;
}

/** O texto a colar na IA. */
export function gerarPedidoIA(ids: string[]): string {
  const lista = getMateriaPrimasBase().filter(mp => ids.includes(mp.id));
  const hoje = new Date().toLocaleDateString('pt-PT');
  const linhas = lista.map(mp =>
    `${mp.id} | ${mp.nome} | ${mp.unidadeReceita === 'un' ? 'usa-se à unidade' : mp.unidadeReceita === 'ml' ? 'usa-se em ml' : 'usa-se em g'}`);
  return `Preciso dos preços atuais do supermercado Continente (continente.pt), em Portugal, para a cozinha pedagógica de uma escola. Hoje é ${hoje}.

REGRAS
1. Pesquisa cada produto em continente.pt.
2. Escolhe SEMPRE a opção mais barata por kg ou por litro, com prioridade à marca branca (Continente, É, Continente Seleção). Só usa outra marca se não houver marca branca.
3. Produto fresco a granel (fruta, legumes, carne, peixe): usa o preço por kg.
4. Nos produtos que "usam-se à unidade" (ovos, limões, alhos, molhos de ervas), diz também o preço de UMA unidade (por exemplo, a caixa de 12 ovos a dividir por 12).
5. Não inventes. Se não encontrares o produto, responde com "nao_encontrado": true.
6. Responde a TODOS os ${lista.length} produtos da lista, do primeiro ao último, sem saltar nenhum. Se a resposta for longa demais, continua na mensagem seguinte até acabar.
7. Responde APENAS com um bloco JSON (uma lista), sem texto antes nem depois, com este formato para cada produto:

{"id":"a001","produto":"Açúcar Branco Continente 1 kg","marca":"Continente","embalagem":1000,"unidade":"g","preco_embalagem":0.99,"preco_kg":0.99,"preco_unidade":null,"link":"https://www.continente.pt/..."}

- "id": o código da lista abaixo, igual.
- "embalagem" e "unidade": quanto traz a embalagem ("g", "ml" ou "un"). A granel: 1000 e "g".
- "preco_embalagem": o preço da embalagem, em euros, com ponto decimal.
- "preco_kg": o preço por kg ou por litro que o site mostra.
- "preco_unidade": só nos que se usam à unidade; nos outros, null.

LISTA (${lista.length} produtos) — código | produto | como se usa na receita
${linhas.join('\n')}`;
}

export type EstadoLinha = 'ok' | 'aviso' | 'erro';

export interface LinhaVerificada {
  id: string;
  nome: string;
  estado: EstadoLinha;
  avisos: string[];
  antes: { precoKg: number; precoUnitario: number; fonte: string; atualizadoEm: string };
  novo?: PrecoRevisto;
}

export interface ResultadoVerificacao {
  linhas: LinhaVerificada[];
  /** Códigos que a IA devolveu e que não existem na lista. */
  desconhecidos: string[];
  /** Produtos pedidos que não vieram na resposta. */
  emFalta: string[];
  erroGeral?: string;
}

const n = (v: unknown) => { const x = Number(String(v ?? '').replace(',', '.')); return isNaN(x) ? 0 : x; };
const MARCA_BRANCA = /continente|^\s*[ée]\s*$|\bé\b/i;

/** Tira o JSON da resposta da IA, mesmo com texto ou ``` à volta. */
function extrairJSON(texto: string): any[] {
  let t = String(texto || '').replace(/```(json)?/gi, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const limpar = (x: string) => x
    .replace(/,\s*([\]}])/g, '$1')                        // vírgula a mais no fim
    .replace(/(":\s*-?\d+),(\d+)/g, '$1.$2');              // 0,99 → 0.99
  const i = t.indexOf('['), j = t.lastIndexOf(']');
  if (i >= 0 && j > i) {
    try {
      const v = JSON.parse(limpar(t.slice(i, j + 1)));
      if (Array.isArray(v)) return v;
    } catch { /* a resposta veio em várias partes: lê-se produto a produto */ }
  }
  // Várias mensagens coladas seguidas ("[...]" e depois "continuação [...]"),
  // ou uma lista cortada a meio: cada produto é um {...} sem nada lá dentro
  // com chavetas, por isso lê-se um a um.
  const objetos: any[] = [];
  for (const m of t.match(/\{[^{}]*\}/g) || []) {
    try { objetos.push(JSON.parse(limpar(m))); } catch { /* ignora o que estiver partido */ }
  }
  if (!objetos.length) throw new Error('Não encontrei a lista (começa com [ e acaba com ]).');
  return objetos;
}

export function verificarRespostaIA(texto: string, idsPedidos: string[], revistoPor: string): ResultadoVerificacao {
  let dados: any[];
  try { dados = extrairJSON(texto); }
  catch (e: any) { return { linhas: [], desconhecidos: [], emFalta: idsPedidos, erroGeral: e?.message || String(e) }; }

  const base = new Map(getMateriaPrimasBase().map(mp => [mp.id, mp]));
  const agora = new Date().toISOString();
  const linhas: LinhaVerificada[] = [];
  const desconhecidos: string[] = [];
  const vistos = new Set<string>();

  dados.forEach(d => {
    const id = String(d?.id || '').trim();
    const mp: MateriaPrimaBase | undefined = base.get(id);
    if (!mp) { if (id) desconhecidos.push(id); return; }
    vistos.add(id);
    const antes = { precoKg: mp.precoKg, precoUnitario: mp.precoUnitario, fonte: mp.fonte, atualizadoEm: mp.atualizadoEm };
    const avisos: string[] = [];
    if (d.nao_encontrado) {
      linhas.push({ id, nome: mp.nome, estado: 'aviso', avisos: ['A IA não o encontrou: fica o preço de antes.'], antes });
      return;
    }
    // Embalagem
    let emb = n(d.embalagem);
    let un = String(d.unidade || '').toLowerCase().trim();
    if (un === 'kg') { emb *= 1000; un = 'g'; }
    if (un === 'l' || un === 'lt') { emb *= 1000; un = 'ml'; }
    if (un === 'unidades' || un === 'unidade' || un === 'u') un = 'un';
    const pEmb = n(d.preco_embalagem);
    if (!['g', 'ml', 'un'].includes(un) || emb <= 0 || pEmb <= 0) {
      linhas.push({ id, nome: mp.nome, estado: 'erro', avisos: ['Faltam dados da embalagem ou do preço.'], antes });
      return;
    }
    // €/kg: o calculado da embalagem manda, se o da IA não bater.
    let pKg = n(d.preco_kg);
    if (un !== 'un') {
      const calc = pEmb / (emb / 1000);
      if (!pKg) pKg = calc;
      else if (Math.abs(pKg - calc) / calc > 0.1) {
        avisos.push(`O €/kg (${pKg.toFixed(2)}) não bate com a embalagem: usa-se ${calc.toFixed(2)}.`);
        pKg = calc;
      }
    } else pKg = 0;
    let pUn = n(d.preco_unidade);
    if (mp.unidadeReceita === 'un' && !pUn) {
      if (un === 'un') pUn = pEmb / emb;
      else avisos.push('Usa-se à unidade mas não veio o preço de uma unidade: fica o de antes.');
    }
    // Coerência com o que a receita usa
    if (mp.unidadeReceita === 'g' && un === 'ml') avisos.push('Na receita usa-se em g e a embalagem vem em ml.');
    if (mp.unidadeReceita === 'ml' && un === 'g') avisos.push('Na receita usa-se em ml e a embalagem vem em g.');
    if (!MARCA_BRANCA.test(String(d.marca || ''))) avisos.push(`Não é marca branca (${d.marca || 'marca desconhecida'}).`);
    // Variação grande
    const velho = mp.unidadeReceita === 'un' ? mp.precoUnitario : mp.precoKg;
    const novoValor = mp.unidadeReceita === 'un' ? (pUn || mp.precoUnitario) : pKg;
    if (velho > 0 && novoValor > 0) {
      const varPct = (novoValor - velho) / velho * 100;
      if (Math.abs(varPct) >= 40) avisos.push(`Variação grande: ${varPct > 0 ? '+' : ''}${Math.round(varPct)}%. Confirma se é o mesmo produto.`);
    }
    const novo: PrecoRevisto = {
      id, nome: mp.nome, produtoContinente: String(d.produto || ''), marca: String(d.marca || ''),
      embalagem: emb, unidadeEmbalagem: un as PrecoRevisto['unidadeEmbalagem'],
      precoEmbalagem: Math.round(pEmb * 100) / 100, precoKg: Math.round(pKg * 100) / 100,
      precoUnidade: Math.round(pUn * 100) / 100, link: String(d.link || ''),
      atualizadoEm: agora, revistoPor,
    };
    linhas.push({ id, nome: mp.nome, estado: avisos.length ? 'aviso' : 'ok', avisos, antes, novo });
  });

  return { linhas, desconhecidos, emFalta: idsPedidos.filter(id => !vistos.has(id)) };
}

/** Grava os preços confirmados: no aparelho (e aplica) e no Sheets. */
export function confirmarPrecos(novos: PrecoRevisto[]): void {
  if (!novos.length) return;
  juntarPrecosRevistos(novos);
  enviarPrecosRevistos(novos);
  // Os que os professores tinham pedido para rever saem da lista.
  marcarPrecosRevistos(novos.map(p => p.id));
}

/** Link de pesquisa no Continente, do mais barato para o mais caro. */
export function linkContinente(nome: string): string {
  return `https://www.continente.pt/pesquisa/?q=${encodeURIComponent(nome)}&srule=price-low-to-high`;
}

/** Produtos por rever este mês (sem revisão no mês corrente). */
export function porReverEsteMes(): MateriaPrimaBase[] {
  const mes = new Date().toISOString().slice(0, 7);
  const revistos = new Map(getPrecosRevistos().map(p => [p.id, p.atualizadoEm.slice(0, 7)]));
  return getMateriaPrimasBase().filter(mp => revistos.get(mp.id) !== mes);
}
