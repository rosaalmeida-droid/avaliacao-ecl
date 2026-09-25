// ════════════════════════════════════════════════════════════
// TRIAGEM DOS 5 C — duas perguntas no fim de cada autoavaliação
// ════════════════════════════════════════════════════════════
// No 1.º ano nenhuma das atitudes do referencial alimenta o Colaborativo
// nem o Criativo. Estas duas perguntas garantem que há sempre evidência:
// o aluno responde em todas as aulas e o professor confirma na validação.
// Seguem o nível do 1.º ano da ATI-009 (Cooperação com a equipa) e da
// ATI-010 (Empenho e persistência na resolução de problemas).
// Só contam para os 5 C da pauta, não para a nota da aula.

export type ChaveTriagem = 'cl' | 'cr';

export interface PerguntaTriagem {
  chave: ChaveTriagem;
  sigla: 'CL' | 'CR';
  titulo: string;
  pergunta: string;
  /** Resposta que diz "hoje não houve ocasião" — não conta. */
  semOcasiao: string;
  /** Do mais fraco para o mais forte. Valem 2, 3, 4 e 5 (escala 1-5). */
  frases: string[];
}

export const PERGUNTAS_TRIAGEM: PerguntaTriagem[] = [
  {
    chave: 'cl', sigla: 'CL', titulo: 'Trabalho com os colegas',
    pergunta: 'Nesta aula, como trabalhaste com os colegas?',
    semOcasiao: 'Hoje a tarefa era só individual.',
    frases: [
      'Trabalhei sozinho/a, sem ajudar nem pedir ajuda.',
      'Ajudei um colega quando me pediram.',
      'Partilhei material e ajudei colegas sem ninguém me pedir.',
      'Combinei tarefas com a equipa e ajudei a que todos acabassem.',
    ],
  },
  {
    chave: 'cr', sigla: 'CR', titulo: 'Resolução de problemas',
    pergunta: 'Nesta aula, resolveste algum problema?',
    semOcasiao: 'Hoje não apareceu nenhum problema.',
    frases: [
      'Apareceu um problema e pedi logo ajuda.',
      'Tentei uma vez e depois pedi ajuda.',
      'Tentei pelo menos duas vezes antes de pedir ajuda.',
      'Resolvi sozinho/a e expliquei aos colegas como fiz.',
    ],
  },
];

/** Resposta: índice da frase (0-3), 'sem' (não houve ocasião) ou null (por responder). */
export type RespostaTriagem = number | 'sem' | null;

export interface Triagem5C {
  cl: RespostaTriagem;
  cr: RespostaTriagem;
  /** O problema que o aluno resolveu, nas palavras dele (opcional). */
  problema?: string;
}

/** Nota 1-5 de uma resposta; null quando não houve ocasião. */
export function notaTriagem(r: RespostaTriagem | undefined): number | null {
  return typeof r === 'number' ? r + 2 : null;
}
