// ============================================================
// Frases de autoavaliação das atitudes.
// O aluno escolhe a frase que melhor o descreve NESTE MOMENTO.
// As notas associadas (5/10/15/20) são internas, nunca mostradas.
//
// Ordem: [ainda não, a desenvolver, já consigo, já domino]
//
// Princípios de redacção:
//  1. PRESENTE — descreve onde o aluno está, não o que fez num dia.
//  2. "AINDA" no nível 1 — é um ponto de partida, não um defeito.
//  3. SEM AGRAVANTES — nada de "mesmo as mais simples", "culpei
//     os outros", "foi-me chamada a atenção". Um aluno não escolhe
//     uma frase que o humilha, e perde-se a honestidade da
//     autoavaliação, que é a base de todo o sistema.
//  4. O nível 4 inclui apoiar colegas — é o que distingue quem
//     domina de quem já consegue.
//
// IDs alinhados com compatECL.ts e atitudes.json (ATI-001..ATI-022).
// ============================================================

export interface FrasesCompetencia {
  competenciaId: string;
  frases: [string, string, string, string];
}

/** Notas internas por posição na escala. Nunca mostradas ao aluno. */
export const NOTAS_FRASES: [number, number, number, number] = [5, 10, 15, 20];

export const FRASES_ATITUDES: FrasesCompetencia[] = [
  // ── 1º ANO ────────────────────────────────────────────────
  {
    competenciaId: 'ATI-001', // Responsabilidade pelas suas ações
    frases: [
      'Ainda tenho dificuldade em assumir quando alguma coisa corre mal.',
      'Estou a aprender a assumir os meus erros, mas nem sempre consigo.',
      'Assumo o que corre mal e procuro corrigir.',
      'Assumo sempre o meu trabalho, corrijo depressa e ajudo colegas a fazer o mesmo.',
    ],
  },
  {
    competenciaId: 'ATI-003', // Cuidado com a apresentação pessoal
    frases: [
      'Ainda me esqueço de partes do uniforme ou da higiene pessoal.',
      'Estou a criar o hábito, mas às vezes falta-me um detalhe.',
      'Venho sempre com o uniforme completo e a higiene em ordem.',
      'Tenho uma apresentação impecável e lembro os colegas quando lhes falta algo.',
    ],
  },
  {
    competenciaId: 'ATI-005', // Autocontrolo
    frases: [
      'Ainda perco a calma quando há pressão ou correria.',
      'Estou a aprender a gerir a pressão, mas custa-me em alguns momentos.',
      'Mantenho a calma e continuo a trabalhar mesmo sob pressão.',
      'Giro bem a pressão e ajudo a manter o ambiente calmo à minha volta.',
    ],
  },
  {
    competenciaId: 'ATI-011', // Sentido de organização
    frases: [
      'Ainda tenho o meu espaço e os materiais desarrumados.',
      'Estou a organizar-me melhor, mas preciso de arrumar várias vezes.',
      'Mantenho o meu espaço e os materiais organizados do princípio ao fim.',
      'Mantenho tudo organizado e ajudo a organizar o espaço da equipa.',
    ],
  },
  {
    competenciaId: 'ATI-013', // Disponibilidade para aprender
    frases: [
      'Ainda me custa aceitar correções e experimentar coisas novas.',
      'Aceito o que me dizem, mas tenho dificuldade em pôr em prática.',
      'Estou aberto/a a aprender e aplico o que me corrigem.',
      'Procuro aprender mais, peço opinião e aplico logo o que me dizem.',
    ],
  },
  {
    competenciaId: 'ATI-015', // Respeito pelas regras e normas definidas
    frases: [
      'Ainda me escapam regras da cozinha e do funcionamento da aula.',
      'Cumpro a maior parte das regras, mas às vezes esqueço-me de algumas.',
      'Cumpro as regras da cozinha e da aula sem precisar que me lembrem.',
      'Cumpro sempre as regras e ajudo os colegas a lembrarem-se delas.',
    ],
  },
  {
    competenciaId: 'ATI-016', // Higiene e segurança alimentar
    frases: [
      'Ainda me esqueço de passos de higiene e segurança alimentar.',
      'Cumpro na maior parte das vezes, mas falha-me algum procedimento.',
      'Cumpro as normas de higiene e segurança alimentar em todo o trabalho.',
      'Cumpro sempre e chamo à atenção quando vejo um risco na cozinha.',
    ],
  },
  {
    competenciaId: 'ATI-017', // Segurança e saúde no trabalho
    frases: [
      'Ainda me esqueço das regras de segurança com equipamentos e utensílios.',
      'Tenho cuidado quase sempre, mas há situações em que me distraio.',
      'Trabalho em segurança e uso os equipamentos como deve ser.',
      'Trabalho sempre em segurança e alerto quando vejo alguém em risco.',
    ],
  },

  // ── 2º ANO ────────────────────────────────────────────────
  {
    competenciaId: 'ATI-002', // Autonomia
    frases: [
      'Ainda preciso que me digam o que fazer na maior parte das tarefas.',
      'Estou a desenvolver a minha autonomia: faço algumas coisas sozinho/a, noutras preciso de ajuda.',
      'Já consigo organizar e fazer o meu trabalho sem indicações constantes.',
      'Já trabalho com bastante autonomia e ainda ajudo colegas a organizarem-se.',
    ],
  },
  {
    competenciaId: 'ATI-007', // Empatia
    frases: [
      'Ainda não reparo muito no que os colegas estão a sentir ou a precisar.',
      'Às vezes percebo, mas não sei bem o que fazer com isso.',
      'Percebo as dificuldades dos colegas e tenho isso em conta no trabalho.',
      'Estou atento/a aos colegas e antecipo-me a dar apoio quando é preciso.',
    ],
  },
  {
    competenciaId: 'ATI-008', // Escuta ativa
    frases: [
      'Ainda me custa ouvir até ao fim sem interromper ou distrair-me.',
      'Ouço na maior parte das vezes, mas nem sempre confirmo se percebi bem.',
      'Ouço com atenção e confirmo que percebi o que me disseram.',
      'Ouço com atenção, pergunto para esclarecer e ajudo a que todos se entendam.',
    ],
  },
  {
    competenciaId: 'ATI-009', // Cooperação com a equipa
    frases: [
      'Ainda me custa trabalhar em conjunto e resolver desentendimentos.',
      'Trabalho com a equipa, mas comunico e colaboro melhor nuns dias do que noutros.',
      'Trabalho bem com o grupo, partilho tarefas e ouço as opiniões dos outros.',
      'Coopero em todas as situações e ajudo a equipa a resolver dificuldades e a incluir todos.',
    ],
  },
  {
    competenciaId: 'ATI-010', // Empenho e persistência
    frases: [
      'Ainda desisto quando aparece uma dificuldade.',
      'Continuo a tentar quase sempre, mas às vezes paro antes de resolver.',
      'Mesmo com dificuldades, insisto até terminar ou resolver.',
      'Insisto até ao fim e ainda animo os colegas a não desistirem.',
    ],
  },
  {
    competenciaId: 'ATI-012', // Flexibilidade e adaptabilidade
    frases: [
      'Ainda me custa quando os planos mudam a meio.',
      'Adapto-me a algumas mudanças, mas outras deixam-me perdido/a.',
      'Adapto-me a mudanças e imprevistos sem perder o ritmo.',
      'Adapto-me depressa a qualquer mudança e ajudo os colegas a fazerem o mesmo.',
    ],
  },
  {
    competenciaId: 'ATI-018', // Sensibilidade e bem-estar dos outros
    frases: [
      'Ainda não penso muito no efeito que o que digo tem nos outros.',
      'Tenho algum cuidado, mas às vezes digo coisas sem pensar.',
      'Tenho cuidado com o que digo e como digo, para não magoar ninguém.',
      'Cuido do bem-estar do grupo e intervenho quando vejo alguém em baixo.',
    ],
  },
  {
    competenciaId: 'ATI-022', // Respeito pelas diferenças individuais
    frases: [
      'Ainda tenho dificuldade em lidar com quem é diferente de mim.',
      'Respeito as diferenças, mas às vezes sinto-me desconfortável.',
      'Respeito as diferenças de cada colega e trabalho bem com toda a gente.',
      'Valorizo as diferenças do grupo e ajudo a que todos se sintam incluídos.',
    ],
  },

  // ── 3º ANO ────────────────────────────────────────────────
  {
    competenciaId: 'ATI-004', // Iniciativa
    frases: [
      'Ainda espero que me digam o que fazer a seguir.',
      'Estou a desenvolver a minha iniciativa: avanço quando é muito evidente o que falta.',
      'Já avanço com o que é preciso sem esperar que me peçam.',
      'Antecipo o que falta fazer, resolvo e ainda preparo trabalho para os colegas avançarem.',
    ],
  },
  {
    competenciaId: 'ATI-006', // Assertividade
    frases: [
      'Ainda me custa dizer o que penso, ou digo-o de forma pouco cuidada.',
      'Estou a aprender a dizer o que penso, mas ainda me falta equilíbrio.',
      'Digo o que penso com clareza e respeito, mesmo quando discordo.',
      'Exponho a minha opinião com clareza e respeito e ajudo a equipa a chegar a acordo.',
    ],
  },
  {
    competenciaId: 'ATI-014', // Sustentabilidade
    frases: [
      'Ainda não penso no desperdício quando trabalho.',
      'Tenho alguma atenção ao desperdício, mas nem sempre aproveito bem.',
      'Aproveito bem os ingredientes e reduzo o desperdício na confeção.',
      'Aproveito ao máximo e sugiro à equipa formas de reduzir o desperdício.',
    ],
  },
  {
    competenciaId: 'ATI-019', // Autoconfiança
    frases: [
      'Ainda me falta confiança para mostrar ou explicar o meu trabalho.',
      'Estou a ganhar confiança, mas sinto-me inseguro/a quando estou mais exposto/a.',
      'Apresento e explico o meu trabalho com confiança.',
      'Falo do meu trabalho com confiança e naturalidade em qualquer situação.',
    ],
  },
  {
    competenciaId: 'ATI-020', // Postura profissional
    frases: [
      'Ainda estou a perceber como se está numa cozinha profissional.',
      'Tenho postura profissional na maior parte do tempo, mas descuido-me nalguns momentos.',
      'Mantenho postura profissional durante todo o serviço.',
      'Tenho postura profissional constante e sou uma referência para os colegas.',
    ],
  },
  {
    competenciaId: 'ATI-021', // Sentido crítico
    frases: [
      'Ainda não avalio o meu trabalho: espero que me digam se está bem ou mal.',
      'Estou a aprender a analisar o meu trabalho, mas custa-me perceber o que falhou.',
      'Analiso o meu trabalho, percebo o que correu mal e proponho como melhorar.',
      'Analiso o meu trabalho e o do grupo com espírito construtivo e proponho melhorias.',
    ],
  },
];

export function getFrases(
  lista: FrasesCompetencia[],
  competenciaId: string
): FrasesCompetencia | undefined {
  return lista.find(f => f.competenciaId === competenciaId);
}

/** Nota interna (5/10/15/20) a partir da posição escolhida (0-3). */
export function notaDaFrase(posicao: number): number {
  return NOTAS_FRASES[posicao] ?? 0;
}
