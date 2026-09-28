// ════════════════════════════════════════════════════════════
// TRIAGEM DOS 5 C — três perguntas no fim de cada autoavaliação
// ════════════════════════════════════════════════════════════
// Garantem que o Colaborativo, o Criativo e o Consciente têm sempre
// evidência, desde o 1.º ano: o aluno responde em todas as aulas e o
// professor confirma na validação. CL e CR seguem o nível do 1.º ano da
// ATI-009 (Cooperação com a equipa) e da ATI-010 (Empenho e persistência
// na resolução de problemas). CO: se tem consciência do que fez, reflete
// e melhora de uma aula para a outra.
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
  /** O problema que o aluno resolveu, nas palavras dele (opcional). */
  problema?: string;
}

/** Nota 1-5 de uma resposta; null quando não houve ocasião. */
export function notaTriagem(r: RespostaTriagem | undefined): number | null {
  return typeof r === 'number' ? r + 2 : null;
}
