// ════════════════════════════════════════════════════════════
// TRIAGEM DOS 5 C — três perguntas no fim de cada autoavaliação
// ════════════════════════════════════════════════════════════
// Garantem que o Colaborativo, o Criativo e o Consciente têm sempre
// evidência, desde o 1.º ano: o aluno responde em todas as aulas e o
// professor confirma na validação. CL e CR seguem o nível do 1.º ano da
// ATI-009 (Cooperação com a equipa) e da ATI-010 (Empenho e persistência
// na resolução de problemas). CO e CR: uma pergunta do dia de cada, tirada do banco
// banco (BANCO_CO: os outros, o próprio e o esforço do professor;
// BANCO_CR: resolver, ter ideias e melhorar), igual para toda a turma.
// Só contam para os 5 C da pauta, não para a nota da aula.

export type ChaveTriagem = 'cl' | 'cr' | 'co';

export interface PerguntaTriagem {
  chave: ChaveTriagem;
  sigla: 'CL' | 'CR' | 'CO';
  titulo: string;
  pergunta: string;
  /** Resposta «não houve ocasião» — não conta. Só existe onde o professor
   *  a pode confirmar (tarefa individual, primeira aula da UC). */
  semOcasiao: string;
  /** Do mais fraco para o mais forte. Valem 2, 3, 4 e 5 (escala 1-5). */
  frases: string[];
  /** Mesma pergunta, mais fácil de ler (medidas seletivas e adicionais). */
  perguntaSimples: string;
  semOcasiaoSimples: string;
  frasesSimples: string[];
}

// Perguntas sobre o que se viu fazer HOJE, não sobre como o aluno é: não
// há «hoje não houve problema nenhum» (há sempre alguma coisa mais
// difícil), e o professor responde às mesmas perguntas na validação.
export const PERGUNTAS_TRIAGEM: PerguntaTriagem[] = [
  {
    chave: 'cl', sigla: 'CL', titulo: 'Trabalho com os colegas',
    pergunta: 'Hoje, o que fizeste com os colegas? Escolhe o que o professor te viu fazer.',
    semOcasiao: 'A tarefa de hoje era individual (o professor confirma).',
    frases: [
      'Trabalhei sozinho/a, sem ajudar nem pedir ajuda.',
      'Ajudei um colega quando me pediram.',
      'Partilhei material e ajudei colegas sem ninguém me pedir.',
      'Combinei tarefas com a equipa e ajudei a que todos acabassem.',
    ],
    perguntaSimples: 'Hoje, o que fizeste com os colegas?',
    semOcasiaoSimples: 'Hoje trabalhei sozinho/a porque era para ser assim.',
    frasesSimples: [
      'Não ajudei ninguém.',
      'Ajudei quando me pediram.',
      'Ajudei sem me pedirem.',
      'Combinei com o grupo e ajudei todos a acabar.',
    ],
  },
  {
    chave: 'cr', sigla: 'CR', titulo: 'Resolução de problemas',
    pergunta: 'Hoje, alguma coisa não correu como esperavas (um corte, uma cozedura, o tempo, falta de material, uma dúvida). O que fizeste?',
    semOcasiao: '',
    frases: [
      'Parei e pedi logo ajuda.',
      'Tentei uma vez e depois pedi ajuda.',
      'Tentei pelo menos duas maneiras antes de pedir ajuda.',
      'Resolvi sozinho/a e expliquei a um colega como fiz.',
    ],
    perguntaSimples: 'Hoje, uma coisa foi mais difícil. O que fizeste?',
    semOcasiaoSimples: '',
    frasesSimples: [
      'Pedi logo ajuda.',
      'Tentei uma vez e pedi ajuda.',
      'Tentei duas vezes antes de pedir ajuda.',
      'Resolvi sozinho/a e expliquei a um colega.',
    ],
  },
  {
    chave: 'co', sigla: 'CO', titulo: 'Refletir e melhorar',
    pergunta: 'Pensa na última aula: o que fizeste diferente hoje?',
    semOcasiao: 'É a minha primeira aula desta UC.',
    frases: [
      'Nada, fiz igual.',
      'Lembrei-me do que correu mal, mas não mudei.',
      'Mudei uma coisa que tinha corrido mal.',
      'Mudei e expliquei ao professor o que melhorei.',
    ],
    perguntaSimples: 'Hoje fizeste alguma coisa melhor do que na última aula?',
    semOcasiaoSimples: 'É a minha primeira aula desta UC.',
    frasesSimples: [
      'Não, fiz igual.',
      'Lembrei-me, mas não mudei.',
      'Sim, mudei uma coisa.',
      'Sim, mudei e disse ao professor.',
    ],
  },
];

/** Resposta: índice da frase (0-3), 'sem' (não houve ocasião) ou null (por responder). */
export type RespostaTriagem = number | 'sem' | null;

export interface Triagem5C {
  cl: RespostaTriagem;
  cr: RespostaTriagem;
  /** Aparece a partir desta versão; nas autoavaliações antigas não existe. */
  co?: RespostaTriagem;
  /** A pergunta do Consciente a que respondeu (BANCO_CO). Sem ela, é a
   *  pergunta antiga «o que fizeste diferente hoje?». */
  coId?: string;
  /** A pergunta do Criativo a que respondeu (BANCO_CR). Sem ela, é a
   *  pergunta antiga «alguma coisa não correu como esperavas?». */
  crId?: string;
  /** O problema que o aluno resolveu, nas palavras dele (opcional). */
  problema?: string;
  /** Disse «não houve ocasião», mas o professor viu que aconteceu: fica na resposta mais baixa. */
  naoReparou?: ('cl' | 'cr' | 'co')[];
}

/** Nota 1-5 de uma resposta; null quando não houve ocasião. */
export function notaTriagem(r: RespostaTriagem | undefined): number | null {
  return typeof r === 'number' ? r + 2 : null;
}

// ════════════════════════════════════════════════════════════
// CONSCIENTE — banco de perguntas que vão rodando
// ════════════════════════════════════════════════════════════
// Três lados: os outros (colegas, espaço, quem vai comer), o próprio
// (limitações e capacidades) e o esforço do professor. Em cada aula a
// turma toda responde à MESMA pergunta — assim o professor vê quando uma
// resposta não bate com a dos colegas. As respostas vão sempre do menor
// para o maior cuidado; «Hoje não aconteceu» não conta.

export type LadoCO = 'outros' | 'si' | 'professor' | 'resolver' | 'ideias' | 'melhorar';
export const LADOS_CO: { lado: LadoCO; nome: string }[] = [
  { lado: 'outros', nome: 'Os outros' },
  { lado: 'si', nome: 'Eu próprio' },
  { lado: 'professor', nome: 'O esforço do professor' },
];

export interface PerguntaCO extends PerguntaTriagem { id: string; lado: LadoCO }

const pq = (chave: 'co' | 'cr') => (id: string, lado: LadoCO, titulo: string, pergunta: string, frases: string[], semOcasiao: string,
  perguntaSimples: string, frasesSimples: string[], semOcasiaoSimples: string): PerguntaCO =>
  ({ id, lado, chave, sigla: chave === 'co' ? 'CO' : 'CR', titulo, pergunta, frases, semOcasiao, perguntaSimples, frasesSimples, semOcasiaoSimples });
const co = pq('co');
const cr = pq('cr');

export const BANCO_CO: PerguntaCO[] = [
  // ── Os outros ──
  co('co01', 'outros', 'Colega em baixo',
    'Hoje sentiste que um colega estava com dificuldades ou em baixo? O que fizeste?',
    ['Não reparei ou não fiz nada.', 'Reparei, mas não fiz nada.', 'Perguntei-lhe se estava bem ou se precisava de ajuda.', 'Ajudei-o e fiz com que se sentisse melhor.'],
    'Hoje nenhum colega esteve com dificuldades ou em baixo (o professor confirma).',
    'Hoje um colega precisou de ti?',
    ['Não fiz nada.', 'Vi, mas não fiz nada.', 'Perguntei se estava bem.', 'Ajudei e ele ficou melhor.'], 'Hoje ninguém precisou.'),
  co('co02', 'outros', 'Colega irritado',
    'Hoje percebeste que um colega estava irritado ou nervoso? O que fizeste?',
    ['Não reparei ou respondi-lhe mal.', 'Reparei, mas não fiz nada.', 'Não lhe respondi mal nem piorei a situação.', 'Tentei acalmá-lo e a situação ficou mais calma.'],
    'Hoje nenhum colega esteve irritado ou nervoso (o professor confirma).',
    'Hoje um colega ficou zangado?',
    ['Não reparei ou piorei.', 'Vi, mas não fiz nada.', 'Fiquei calmo com ele.', 'Ajudei-o a acalmar.'], 'Hoje ninguém ficou zangado.'),
  co('co03', 'outros', 'Colega sozinho',
    'Hoje algum colega ficou de parte ou sozinho? O que fizeste?',
    ['Não reparei ou não fiz nada.', 'Reparei, mas não fiz nada.', 'Falei com ele.', 'Chamei-o para o meu grupo ou para a conversa.'],
    'Hoje ninguém ficou de parte (o professor confirma).',
    'Hoje um colega ficou sozinho?',
    ['Não fiz nada.', 'Vi, mas não fiz nada.', 'Falei com ele.', 'Chamei-o para junto de nós.'], 'Hoje ninguém ficou sozinho.'),
  co('co04', 'outros', 'Colega gozado',
    'Hoje alguém gozou ou fez um comentário desagradável a um colega? O que fizeste?',
    ['Ri-me ou entrei na brincadeira.', 'Vi, mas não fiz nada.', 'Não me ri nem entrei na brincadeira.', 'Disse que não estava certo ou avisei o professor.'],
    'Hoje ninguém gozou com ninguém (o professor confirma).',
    'Hoje gozaram com um colega?',
    ['Ri-me também.', 'Vi e não fiz nada.', 'Não me ri.', 'Disse que não estava certo.'], 'Hoje ninguém gozou.'),
  co('co05', 'outros', 'Erro de um colega',
    'Hoje um colega enganou-se ou estragou alguma coisa? O que fizeste?',
    ['Gozei ou critiquei.', 'Vi, mas não fiz nada.', 'Não gozei nem critiquei.', 'Ajudei-o a corrigir sem o deixar envergonhado.'],
    'Hoje nenhum colega se enganou (o professor confirma).',
    'Hoje um colega enganou-se?',
    ['Gozei com ele.', 'Vi e não fiz nada.', 'Não gozei.', 'Ajudei-o a corrigir.'], 'Hoje ninguém se enganou.'),
  co('co06', 'outros', 'Colega que faltou ou é novo',
    'Hoje havia um colega que faltou à última aula ou é novo na turma? O que fizeste?',
    ['Não reparei ou não fiz nada.', 'Reparei, mas não fiz nada.', 'Disse-lhe onde estavam as coisas.', 'Expliquei-lhe o que tinha acontecido e ajudei-o a acompanhar.'],
    'Hoje não havia nenhum colega nesta situação (o professor confirma).',
    'Hoje veio um colega que faltou ou é novo?',
    ['Não fiz nada.', 'Vi e não fiz nada.', 'Mostrei onde estão as coisas.', 'Expliquei e ajudei.'], 'Hoje não.'),
  co('co07', 'outros', 'Maneiras diferentes',
    'Hoje um colega fez as coisas de maneira diferente de ti (ritmo, língua, cultura)? O que fizeste?',
    ['Critiquei ou fiquei impaciente.', 'Reparei, mas não fiz nada.', 'Respeitei e não critiquei.', 'Tive paciência e ajudei-o a sentir-se à vontade.'],
    'Hoje não aconteceu (o professor confirma).',
    'Hoje um colega fez as coisas de outra maneira?',
    ['Critiquei.', 'Não fiz nada.', 'Respeitei.', 'Tive paciência e ajudei.'], 'Hoje não aconteceu.'),
  co('co08', 'outros', 'Quem vem a seguir',
    'Hoje pensaste em quem vem usar a cozinha depois de ti?',
    ['Deixei o meu lugar sujo ou desarrumado.', 'Deixei o meu lugar mais ou menos.', 'Limpei e arrumei o meu lugar.', 'Limpei o meu lugar e ajudei a arrumar a zona comum.'],
    '',
    'Hoje deixaste a cozinha arrumada?',
    ['Não, ficou sujo.', 'Mais ou menos.', 'Limpei o meu lugar.', 'Limpei o meu lugar e ajudei no resto.'], ''),
  co('co09', 'outros', 'Perigo para os outros',
    'Hoje viste alguma coisa perigosa para os colegas (chão molhado, faca fora do sítio, tacho quente)? O que fizeste?',
    ['Não reparei ou deixei ficar.', 'Afastei-me, mas não disse nada.', 'Avisei os colegas.', 'Resolvi logo (sequei, arrumei, sinalizei) e avisei.'],
    'Hoje não vi nada perigoso (o professor confirma).',
    'Hoje viste um perigo (chão molhado, faca, tacho quente)?',
    ['Não fiz nada.', 'Afastei-me.', 'Avisei os colegas.', 'Resolvi e avisei.'], 'Hoje não vi perigo.'),
  co('co10', 'outros', 'Quem trabalha connosco',
    'Hoje reconheceste o trabalho de alguém (auxiliar, colega, professor)?',
    ['Não pensei nisso.', 'Reparei no trabalho, mas não disse nada.', 'Agradeci.', 'Agradeci e ajudei no trabalho dessa pessoa (loiça, arrumação).'],
    '',
    'Hoje agradeceste a alguém?',
    ['Não.', 'Pensei, mas não disse.', 'Sim, agradeci.', 'Agradeci e ajudei.'], ''),
  co('co11', 'outros', 'Quem vai comer',
    'Hoje pensaste em quem vai comer o que fizeste (alergias, higiene, apresentação)?',
    ['Não pensei nisso.', 'Pensei, mas não mudei nada.', 'Tive cuidado com a higiene e a apresentação.', 'Verifiquei alergénios ou registos e avisei se havia algum problema.'],
    'Hoje não fiz comida para ninguém comer (o professor confirma).',
    'Hoje pensaste em quem vai comer?',
    ['Não.', 'Pensei, mas não fiz nada.', 'Tive cuidado com a higiene.', 'Vi os alergénios e avisei.'], 'Hoje ninguém ia comer.'),
  co('co12', 'outros', 'Desperdício',
    'Hoje viste comida ou material a ser desperdiçado? O que fizeste?',
    ['Desperdicei ou deixei desperdiçar.', 'Vi, mas não fiz nada.', 'Não desperdicei.', 'Aproveitei ou sugeri como aproveitar.'],
    'Hoje não houve desperdício (o professor confirma).',
    'Hoje viste comida a ir para o lixo?',
    ['Deitei fora.', 'Vi e não fiz nada.', 'Não deitei fora.', 'Aproveitei ou disse como aproveitar.'], 'Hoje não.'),
  // ── Eu próprio: limitações e capacidades ──
  co('co13', 'si', 'Uma dificuldade',
    'Hoje houve uma coisa que ainda não fazes bem? O que fizeste?',
    ['Não reparei.', 'Reparei, mas escondi.', 'Disse ao professor ou a um colega.', 'Disse e pedi para treinar, ou treinei.'],
    'Hoje correu tudo bem (o professor confirma).',
    'Hoje houve uma coisa difícil para ti?',
    ['Não reparei.', 'Sim, mas escondi.', 'Disse ao professor.', 'Disse e treinei.'], 'Hoje não.'),
  co('co14', 'si', 'Uma capacidade',
    'Hoje houve uma coisa que fazes bem? O que fizeste com isso?',
    ['Não pensei nisso.', 'Sei que faço bem, mas fiquei calado.', 'Ofereci-me para fazer essa parte.', 'Ofereci-me e ensinei um colega.'],
    'Hoje não houve ocasião (o professor confirma).',
    'Hoje fizeste uma coisa que sabes fazer bem?',
    ['Não pensei nisso.', 'Sim, mas não disse.', 'Ofereci-me para fazer.', 'Fiz e ensinei um colega.'], 'Hoje não.'),
  co('co15', 'si', 'Cansaço ou nervos',
    'Hoje sentiste-te cansado, nervoso ou irritado? O que fizeste?',
    ['Descarreguei nos outros.', 'Fiquei calado, mas trabalhei pior.', 'Disse ao professor ou respirei fundo.', 'Reconheci, pedi ajuda e voltei ao trabalho calmo.'],
    'Hoje senti-me bem.',
    'Hoje ficaste cansado ou nervoso?',
    ['Fui mal-educado com os outros.', 'Fiquei calado e trabalhei pior.', 'Disse ao professor ou respirei fundo.', 'Pedi ajuda e acalmei.'], 'Hoje senti-me bem.'),
  co('co16', 'si', 'Antes de avançar',
    'Hoje tiveste dúvidas antes de começar uma tarefa? O que fizeste?',
    ['Avancei sem perguntar e correu mal.', 'Avancei sem perguntar.', 'Perguntei antes de começar.', 'Perguntei antes e confirmei no fim.'],
    'Hoje não tive dúvidas.',
    'Hoje tiveste dúvidas?',
    ['Fiz sem perguntar e correu mal.', 'Fiz sem perguntar.', 'Perguntei antes.', 'Perguntei antes e no fim.'], 'Hoje não.'),
  co('co17', 'si', 'Um elogio ou uma crítica',
    'Hoje o professor ou um colega disse-te alguma coisa sobre o teu trabalho (bom ou menos bom)? O que fizeste?',
    ['Ignorei ou fiquei chateado.', 'Ouvi, mas não mudei nada.', 'Ouvi e agradeci.', 'Ouvi e usei isso para fazer melhor.'],
    'Hoje ninguém me disse nada sobre o meu trabalho.',
    'Hoje disseram-te alguma coisa sobre o teu trabalho?',
    ['Fiquei chateado.', 'Ouvi e não mudei.', 'Ouvi e agradeci.', 'Ouvi e fiz melhor.'], 'Hoje não.'),
  // ── O esforço do professor ──
  co('co18', 'professor', 'Explicou outra vez',
    'Hoje o professor explicou uma coisa mais do que uma vez, ou de outra maneira, para te ajudar? O que fizeste?',
    ['Não prestei atenção.', 'Ouvi, mas não experimentei.', 'Experimentei como ele explicou.', 'Experimentei e mostrei-lhe o resultado.'],
    'Hoje não foi preciso.',
    'Hoje o professor explicou outra vez para ti?',
    ['Não prestei atenção.', 'Ouvi e não fiz.', 'Fiz como ele explicou.', 'Fiz e mostrei-lhe.'], 'Hoje não.'),
  co('co19', 'professor', 'Uma correção',
    'Hoje o professor corrigiu-te alguma coisa? O que fizeste?',
    ['Fiquei chateado ou ignorei.', 'Aceitei, mas não mudei.', 'Corrigi logo.', 'Corrigi e percebi porque estava errado.'],
    'Hoje o professor não me corrigiu nada.',
    'Hoje o professor corrigiu-te?',
    ['Fiquei chateado.', 'Não mudei.', 'Corrigi logo.', 'Corrigi e percebi porquê.'], 'Hoje não.'),
  co('co20', 'professor', 'Vir preparado',
    'Hoje vieste preparado para a aula que o professor preparou (leste a ficha, trouxeste o material)?',
    ['Não, e atrasei o trabalho.', 'Não, mas desenrasquei-me.', 'Sim, em parte.', 'Sim, li a ficha e trouxe tudo.'],
    '',
    'Hoje vieste preparado?',
    ['Não, e atrasei.', 'Não, mas desenrasquei-me.', 'Mais ou menos.', 'Sim, li a ficha e trouxe tudo.'], ''),
  co('co21', 'professor', 'Uma oportunidade extra',
    'O professor deu-te uma oportunidade extra (recuperar, repetir, treinar)? O que fizeste?',
    ['Não aproveitei.', 'Aproveitei só um bocado.', 'Aproveitei.', 'Aproveitei e agradeci.'],
    'Não tive nenhuma oportunidade extra.',
    'O professor deu-te mais uma oportunidade?',
    ['Não aproveitei.', 'Aproveitei um bocado.', 'Aproveitei.', 'Aproveitei e agradeci.'], 'Não.'),
  co('co22', 'professor', 'O tempo do professor',
    'Hoje ajudaste o professor a ter tempo para todos (esperaste a tua vez, não interrompeste, resolveste o que já sabias)?',
    ['Interrompi muitas vezes.', 'Às vezes.', 'Quase sempre.', 'Sim, e ajudei um colega para o professor poder ajudar outro.'],
    '',
    'Hoje deixaste o professor ajudar todos?',
    ['Interrompi muitas vezes.', 'Às vezes.', 'Quase sempre.', 'Sim, e ajudei um colega.'], ''),
];

// ════════════════════════════════════════════════════════════
// CRIATIVO — banco de perguntas que vão rodando
// ════════════════════════════════════════════════════════════
// Numa cozinha, ser criativo é resolver imprevistos, ter ideias e
// experimentar, e melhorar o que já existe — sempre com autorização do
// professor, nunca a desrespeitar a ficha técnica. Funciona como o
// Consciente: a mesma pergunta para a turma, a rodar pelos três lados.

export const LADOS_CR: { lado: LadoCO; nome: string }[] = [
  { lado: 'resolver', nome: 'Resolver imprevistos' },
  { lado: 'ideias', nome: 'Ter ideias e experimentar' },
  { lado: 'melhorar', nome: 'Melhorar o que já existe' },
];

export const BANCO_CR: PerguntaCO[] = [
  // ── Resolver imprevistos ──
  cr('cr01', 'resolver', 'Faltou alguma coisa',
    'Hoje faltou um ingrediente ou material. Arranjaste uma solução?',
    ['Parei e fiquei à espera.', 'Pedi logo ao professor.', 'Pensei numa alternativa e perguntei ao professor.', 'Arranjei uma alternativa, o professor aceitou e resultou.'],
    'Hoje não faltou nada (o professor confirma).',
    'Hoje faltou alguma coisa. O que fizeste?',
    ['Fiquei à espera.', 'Pedi ao professor.', 'Pensei noutra coisa e perguntei.', 'Arranjei outra coisa e resultou.'], 'Hoje não faltou nada.'),
  cr('cr02', 'resolver', 'Correu mal',
    'Hoje uma preparação correu mal (talhou, queimou, ficou mole). Arranjaste uma solução?',
    ['Deitei fora ou desisti.', 'Pedi logo ajuda.', 'Tentei perceber porquê e tentei salvar.', 'Salvei ou refiz, e percebi o que tinha corrido mal.'],
    'Hoje não correu nada mal (o professor confirma).',
    'Hoje uma coisa correu mal. O que fizeste?',
    ['Desisti.', 'Pedi ajuda.', 'Tentei salvar.', 'Salvei ou refiz.'], 'Hoje nada correu mal.'),
  cr('cr03', 'resolver', 'O tempo',
    'Hoje o tempo não chegava para tudo. Arranjaste uma solução?',
    ['Não acabei.', 'Fiz à pressa e ficou pior.', 'Reorganizei o que faltava.', 'Reorganizei, combinei com o grupo e acabámos a tempo.'],
    'Hoje o tempo chegou bem (o professor confirma).',
    'Hoje o tempo não chegava. O que fizeste?',
    ['Não acabei.', 'Fiz à pressa.', 'Mudei a ordem das coisas.', 'Combinei com o grupo e acabámos.'], 'Hoje o tempo chegou.'),
  cr('cr04', 'resolver', 'Uma dúvida',
    'Hoje tiveste uma dúvida sobre como fazer. Como a resolveste?',
    ['Fiquei parado.', 'Perguntei logo.', 'Procurei primeiro na ficha ou no guia.', 'Procurei, experimentei e confirmei com o professor.'],
    'Hoje não tive dúvidas.',
    'Hoje tiveste uma dúvida. O que fizeste?',
    ['Fiquei parado.', 'Perguntei logo.', 'Vi primeiro na ficha.', 'Vi na ficha, experimentei e confirmei.'], 'Hoje não.'),
  cr('cr05', 'resolver', 'O equipamento',
    'Hoje um equipamento não funcionou ou estava ocupado. Arranjaste uma solução?',
    ['Fiquei à espera.', 'Avisei o professor.', 'Encontrei outra maneira de fazer.', 'Encontrei outra maneira e o resultado ficou bem.'],
    'Hoje não aconteceu (o professor confirma).',
    'Hoje uma máquina não dava. O que fizeste?',
    ['Fiquei à espera.', 'Avisei o professor.', 'Fiz de outra maneira.', 'Fiz de outra maneira e ficou bem.'], 'Hoje não.'),
  // ── Ter ideias e experimentar ──
  cr('cr06', 'ideias', 'Empratamento',
    'Hoje pensaste numa forma diferente de apresentar o prato?',
    ['Não pensei nisso.', 'Pensei, mas não disse.', 'Sugeri ao professor.', 'Sugeri e fiz, com autorização do professor.'],
    'Hoje não houve prato para apresentar.',
    'Hoje pensaste noutra forma de pôr o prato?',
    ['Não.', 'Pensei, mas não disse.', 'Disse ao professor.', 'Disse e fiz.'], 'Hoje não houve prato.'),
  cr('cr07', 'ideias', 'Sabor',
    'Hoje provaste e pensaste em como melhorar o sabor?',
    ['Não provei.', 'Provei, mas não mudei nada.', 'Provei e corrigi o tempero.', 'Provei, corrigi e expliquei porquê.'],
    'Hoje não houve nada para provar.',
    'Hoje provaste o que fizeste?',
    ['Não provei.', 'Provei e não mudei.', 'Provei e corrigi.', 'Provei, corrigi e expliquei.'], 'Hoje não havia nada para provar.'),
  cr('cr08', 'ideias', 'E se…?',
    'Hoje perguntaste «e se fizéssemos de outra maneira?»',
    ['Não.', 'Pensei, mas não perguntei.', 'Perguntei ao professor.', 'Perguntei e experimentámos.'],
    '',
    'Hoje pensaste noutra maneira de fazer?',
    ['Não.', 'Pensei, mas não disse.', 'Perguntei ao professor.', 'Perguntei e experimentámos.'], ''),
  cr('cr09', 'ideias', 'O que já sabes',
    'Hoje ligaste esta aula a outra coisa que já sabes fazer?',
    ['Não.', 'Lembrei-me, mas não usei.', 'Usei uma coisa que aprendi antes.', 'Usei e expliquei a um colega.'],
    '',
    'Hoje usaste uma coisa que já sabias?',
    ['Não.', 'Lembrei-me, mas não usei.', 'Sim, usei.', 'Usei e expliquei a um colega.'], ''),
  cr('cr10', 'ideias', 'Curiosidade',
    'Hoje quiseste saber mais sobre alguma coisa (de onde vem, porque se faz assim)?',
    ['Não.', 'Pensei nisso, mas não perguntei.', 'Perguntei.', 'Perguntei e fui procurar mais.'],
    '',
    'Hoje quiseste saber mais sobre alguma coisa?',
    ['Não.', 'Pensei, mas não perguntei.', 'Perguntei.', 'Perguntei e procurei mais.'], ''),
  // ── Melhorar o que já existe ──
  cr('cr11', 'melhorar', 'Organização',
    'Hoje encontraste uma maneira de trabalhar mais organizada ou mais rápida?',
    ['Não pensei nisso.', 'Reparei, mas não mudei.', 'Mudei a minha maneira de trabalhar.', 'Mudei e partilhei com o grupo.'],
    '',
    'Hoje arranjaste uma maneira mais fácil de trabalhar?',
    ['Não.', 'Pensei, mas não mudei.', 'Sim, mudei.', 'Mudei e disse ao grupo.'], ''),
  cr('cr12', 'melhorar', 'Aproveitamento',
    'Hoje sobraram aparas ou restos. Arranjaste uma forma de os aproveitar?',
    ['Deitei fora.', 'Guardei sem saber para quê.', 'Sugeri como aproveitar.', 'Aproveitei, com autorização do professor.'],
    'Hoje não sobrou nada.',
    'Hoje sobrou comida. O que fizeste?',
    ['Deitei fora.', 'Guardei.', 'Disse como aproveitar.', 'Aproveitei.'], 'Hoje não sobrou nada.'),
  cr('cr13', 'melhorar', 'Para a próxima',
    'Se fizesses este prato outra vez, o que mudavas?',
    ['Não sei.', 'Mudava, mas não sei o quê.', 'Sei o que mudava.', 'Sei o que mudava e disse ao professor.'],
    '',
    'Se fizesses outra vez, mudavas alguma coisa?',
    ['Não sei.', 'Sim, mas não sei o quê.', 'Sei o que mudava.', 'Sei e disse ao professor.'], ''),
  cr('cr14', 'melhorar', 'Um erro de outra aula',
    'Hoje evitaste um erro que já tinhas feito antes?',
    ['Voltei a errar.', 'Lembrei-me tarde demais.', 'Lembrei-me e evitei.', 'Evitei e ajudei um colega a não errar.'],
    'Não tinha nenhum erro de outras aulas para evitar.',
    'Hoje não repetiste um erro antigo?',
    ['Voltei a errar.', 'Lembrei-me tarde.', 'Lembrei-me e não errei.', 'Não errei e ajudei um colega.'], 'Não tinha erros antigos.'),
  cr('cr15', 'melhorar', 'Ideia para a turma',
    'Hoje tiveste uma ideia útil para a turma ou para a cozinha?',
    ['Não.', 'Tive, mas guardei para mim.', 'Disse a um colega.', 'Disse ao professor e foi usada.'],
    '',
    'Hoje tiveste uma boa ideia?',
    ['Não.', 'Tive, mas não disse.', 'Disse a um colega.', 'Disse ao professor e foi usada.'], ''),
];

const BANCOS = { co: { lados: LADOS_CO, banco: BANCO_CO }, cr: { lados: LADOS_CR, banco: BANCO_CR } };
export const bancoDe = (chave: 'co' | 'cr') => BANCOS[chave];

/** A k-ésima pergunta do ciclo: os três lados alternam, e dentro de cada
 *  lado as perguntas vão rodando. */
/** Perguntas que só fazem sentido numa aula com produção (cozinha, pratos,
 *  ingredientes, equipamento). Nas aulas teóricas e atitudinais não saem. */
export const SO_AULA_PRATICA = new Set(['co08', 'co09', 'co11', 'co12', 'cr01', 'cr02', 'cr05', 'cr06', 'cr07', 'cr12', 'cr13', 'cr15']);

export function perguntaDoCiclo(chave: 'co' | 'cr', k: number, soTeoria = false): PerguntaCO {
  const { lados, banco } = BANCOS[chave];
  const lado = lados[((k % 3) + 3) % 3].lado;
  const doLado = banco.filter(q => q.lado === lado && (!soTeoria || !SO_AULA_PRATICA.has(q.id)));
  return doLado[Math.floor(k / 3) % doLado.length];
}

/** As três perguntas da aula, com as do Consciente e do Criativo certas.
 *  Sem id (autoavaliações antigas) fica a pergunta antiga. */
export function perguntasDaAula(coId?: string, crId?: string): PerguntaTriagem[] {
  const qco = coId ? BANCO_CO.find(x => x.id === coId) : undefined;
  const qcr = crId ? BANCO_CR.find(x => x.id === crId) : undefined;
  return PERGUNTAS_TRIAGEM.map(p => p.chave === 'co' && qco ? qco : p.chave === 'cr' && qcr ? qcr : p);
}
