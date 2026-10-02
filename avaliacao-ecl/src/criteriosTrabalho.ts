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
  grupo: [
    c('grupo', 'parte', 'Trabalho de grupo: a minha parte', [
      'Não fiz a minha parte.', 'Fiz a minha parte, mas com ajuda ou atrasado.',
      'Fiz a minha parte a tempo.', 'Fiz a minha parte e ajudei o grupo a juntar tudo.']),
  ],
};

const TODOS = Object.values(CRITERIOS_FORMATO).flat();

/** O critério pelo código. */
export const criterioTrabalho = (id: string): CriterioTrabalho | undefined => TODOS.find(x => x.id === id);
