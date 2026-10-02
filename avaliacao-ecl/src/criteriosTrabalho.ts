// ============================================================
// Critérios de cada formato de trabalho (Rosa, out/2026)
// ============================================================
// Uma apresentação oral não se avalia como um trabalho escrito: cada
// formato tem os seus critérios, e cada critério quatro respostas de coisas
// que se veem (da mais fraca para a mais forte). As perguntas do conteúdo
// vêm do tema que o aluno escolheu (os indicadores do capítulo do manual).
// Códigos KNW-P-F-<formato>-<critério>: contam como conhecimento.
// ============================================================

export interface CriterioTrabalho { id: string; nome: string; frases: [string, string, string, string] }

const c = (formato: string, chave: string, nome: string, frases: [string, string, string, string]): CriterioTrabalho =>
  ({ id: `KNW-P-F-${formato}-${chave}`, nome, frases });

export const CRITERIOS_FORMATO: Record<string, CriterioTrabalho[]> = {
  oral: [
    c('oral', 'dominio', 'Apresentação oral: domínio do tema', [
      'Não consegui explicar o tema.', 'Expliquei só uma parte, a ler.',
      'Expliquei o tema todo sem ler.', 'Expliquei o tema todo sem ler e dei exemplos da cozinha.']),
    c('oral', 'comunicacao', 'Apresentação oral: voz, postura e olhar', [
      'Falei baixo, de costas ou sem olhar para a turma.', 'Falei quase sempre para o papel ou para o ecrã.',
      'Falei claro, virado para a turma.', 'Falei claro, olhei para a turma e prendi a atenção.']),
    c('oral', 'vocabulario', 'Apresentação oral: vocabulário técnico', [
      'Não usei os termos do manual.', 'Usei alguns termos, nem sempre certos.',
      'Usei os termos técnicos certos.', 'Usei os termos certos e expliquei os mais difíceis.']),
    // A capacidade de defesa oral (Rosa, out/2026): responder e argumentar quando questionado.
    c('oral', 'defesa', 'Apresentação oral: defesa do tema', [
      'Quando me questionaram, não consegui defender o que disse.', 'Defendi só com a ajuda do professor.',
      'Defendi o que disse com argumentos do manual.', 'Defendi com argumentos do manual e exemplos da cozinha, e aceitei bem as críticas.']),
    c('oral', 'tempo', 'Apresentação oral: tempo e organização', [
      'Não tinha a apresentação organizada.', 'Passei do tempo ou acabei muito antes.',
      'Cumpri o tempo, com princípio, meio e fim.', 'Cumpri o tempo e fechei com uma conclusão minha.']),
  ],
  escrito: [
    c('escrito', 'conteudo', 'Trabalho escrito: conteúdo do tema', [
      'Entreguei incompleto.', 'Completo, mas copiado do manual.',
      'Completo, com as minhas palavras.', 'Completo, com as minhas palavras e exemplos da cozinha.']),
    c('escrito', 'organizacao', 'Trabalho escrito: organização', [
      'Sem títulos nem ordem.', 'Com alguma ordem, mas difícil de ler.',
      'Organizado, com títulos e fácil de ler.', 'Organizado, com títulos e imagens ou esquemas que ajudam.']),
    c('escrito', 'lingua', 'Trabalho escrito: português e termos técnicos', [
      'Com muitos erros.', 'Com alguns erros e poucos termos técnicos.',
      'Sem erros graves, com os termos técnicos certos.', 'Sem erros, com os termos técnicos explicados.']),
    c('escrito', 'fontes', 'Trabalho escrito: fontes', [
      'Não indiquei fontes.', 'Indiquei só o manual.',
      'Indiquei o manual e outra fonte.', 'Indiquei várias fontes e comparei o que dizem.']),
  ],
  digital: [
    c('digital', 'clareza', 'Apresentação digital: diapositivos claros', [
      'Só texto copiado.', 'Muito texto e pouco organizado.',
      'Pouco texto, com imagens.', 'Pouco texto, imagens e um esquema que resume o tema.']),
    c('digital', 'uso', 'Apresentação digital: explicar sem ler', [
      'Li os diapositivos.', 'Li quase tudo.',
      'Expliquei sem ler, com os diapositivos de apoio.', 'Expliquei sem ler e usei os diapositivos para mostrar o essencial.']),
    c('digital', 'ferramenta', 'Apresentação digital: preparar e pôr a funcionar', [
      'Não consegui pôr a funcionar.', 'Funcionou com ajuda.',
      'Preparei e pus a funcionar sozinho.', 'Preparei, funcionou e ajudei um colega.']),
  ],
  pratico: [
    c('pratico', 'execucao', 'Demonstração prática: execução', [
      'Não acabei a demonstração.', 'Fiz com ajuda.',
      'Fiz sozinho, como no manual.', 'Fiz sozinho, à primeira, como no manual.']),
    c('pratico', 'explicar', 'Demonstração prática: explicar enquanto faço', [
      'Não expliquei.', 'Expliquei pouco.',
      'Expliquei cada passo.', 'Expliquei cada passo e porquê.']),
    c('pratico', 'higiene', 'Demonstração prática: higiene e segurança', [
      'Falhei regras de higiene ou segurança.', 'Falhei uma regra.',
      'Cumpri as regras.', 'Cumpri as regras e expliquei-as à turma.']),
  ],
  // A aula em que se prepara o trabalho: o que se vê nessa aula.
  preparar: [
    c('preparar', 'pesquisa', 'Preparação: pesquisa sobre o tema', [
      'Não pesquisei nada sobre o meu tema.', 'Li só uma parte do capítulo do manual.',
      'Li o capítulo todo e tirei notas.', 'Li o capítulo, tirei notas e procurei noutra fonte.']),
    c('preparar', 'material', 'Preparação: o material do trabalho', [
      'Ainda não comecei o material.', 'Comecei, mas fiz pouco.',
      'Avancei bem e sei o que falta.', 'Avancei bem, sei o que falta e tenho um plano para acabar.']),
    c('preparar', 'tempo', 'Preparação: aproveitar o tempo da aula', [
      'Perdi a maior parte do tempo.', 'Trabalhei só parte do tempo.',
      'Trabalhei o tempo todo.', 'Trabalhei o tempo todo e pedi ajuda quando precisei.']),
  ],
  receita: [
    c('receita', 'ingredientes', 'Receita e ficha técnica: ingredientes e quantidades', [
      'Ainda não tenho os ingredientes.', 'Tenho os ingredientes, mas faltam quantidades.',
      'Tenho os ingredientes com as quantidades certas para as doses.', 'Tenho tudo certo e calculei a capitação de cada dose.']),
    c('receita', 'preparacao', 'Receita e ficha técnica: modo de preparação', [
      'Ainda não escrevi a preparação.', 'Escrevi alguns passos, sem ordem.',
      'Escrevi os passos por ordem, com as técnicas.', 'Escrevi os passos por ordem, com as técnicas, tempos e temperaturas.']),
    c('receita', 'custo', 'Receita e ficha técnica: custo', [
      'Não calculei o custo.', 'Calculei só uma parte.',
      'Calculei o custo da receita.', 'Calculei o custo da receita e de cada dose.']),
  ],
  menu: [
    c('menu', 'equilibrio', 'Menu: equilíbrio e coerência', [
      'Os pratos não combinam entre si.', 'Combinam em parte, com repetições.',
      'Os pratos combinam, sem repetir ingredientes nem técnicas.', 'Combinam e expliquei porquê (época, sabores, cores).']),
    c('menu', 'adequacao', 'Menu: adequado ao cliente e à época', [
      'Não pensei no cliente nem na época.', 'Pensei só numa das duas.',
      'É adequado ao cliente e à época.', 'É adequado e pensei também no preço e nas alergias.']),
    c('menu', 'escrita', 'Menu: escrever o menu', [
      'Não escrevi o menu.', 'Escrevi com erros ou nomes pouco claros.',
      'Escrevi certo, com nomes claros.', 'Escrevi certo, com nomes claros e uma descrição apelativa.']),
  ],
  requisicao: [
    c('requisicao', 'quantidades', 'Requisição: quantidades', [
      'Não fiz a requisição.', 'Fiz, mas com quantidades a mais ou a menos.',
      'As quantidades estão certas para as doses.', 'Estão certas e confirmei com a ficha técnica.']),
    c('requisicao', 'completa', 'Requisição: completa e a tempo', [
      'Faltam muitos produtos.', 'Falta algum produto.',
      'Está completa e entreguei a tempo.', 'Está completa, a tempo, e verifiquei o que já havia no economato.']),
  ],
  grupo: [
    c('grupo', 'parte', 'Trabalho de grupo: a minha parte', [
      'Não fiz a minha parte.', 'Fiz a minha parte, mas com ajuda ou atrasado.',
      'Fiz a minha parte a tempo.', 'Fiz a minha parte e ajudei o grupo a juntar tudo.']),
  ],
};

const TODOS = Object.values(CRITERIOS_FORMATO).flat();

/** Os critérios de cada fase de um trabalho (contextoAula: FaseProjeto). */
export function criteriosDasFases(fases: string[], emGrupo: boolean): CriterioTrabalho[] {
  const de = (k: string, chaves?: string[]) => (CRITERIOS_FORMATO[k] || []).filter(x => !chaves || chaves.some(ch => x.id.endsWith('-' + ch)));
  const out: CriterioTrabalho[] = [];
  for (const f of fases) {
    if (f === 'investigacao') out.push(...de('preparar', ['pesquisa']));
    else if (f === 'desenvolvimento') out.push(...de('preparar', ['material']));
    else if (f === 'receita' || f === 'menu' || f === 'requisicao') out.push(...de(f));
    else if (f.startsWith('apres_')) out.push(...de(f.slice(6)));
  }
  // O tempo da aula, nas fases de trabalho (não nas apresentações).
  if (fases.some(f => !f.startsWith('apres_'))) out.push(...de('preparar', ['tempo']));
  if (emGrupo) out.push(...de('grupo'));
  return out.filter((x, i) => out.findIndex(y => y.id === x.id) === i);
}

/** O critério pelo código. */
export const criterioTrabalho = (id: string): CriterioTrabalho | undefined => TODOS.find(x => x.id === id);
