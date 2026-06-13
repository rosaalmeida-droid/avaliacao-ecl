// ============================================================
// Frases de autoavaliação — o aluno escolhe a frase que melhor
// descreve o que aconteceu. As notas associadas (5/10/15/18)
// são internas e nunca mostradas ao aluno.
//
// Ordem das frases: [não atingi, em desenvolvimento, atingi, superei]
// ============================================================

export interface FrasesCompetencia {
  competenciaId: string;
  frases: [string, string, string, string];
}

// ------------------------------------------------------------------
// ATITUDES (A01-A18)
// ------------------------------------------------------------------
export const FRASES_ATITUDES: FrasesCompetencia[] = [
  {
    competenciaId: 'A01', // Responsabilidade pelas suas ações
    frases: [
      'Tive dificuldade em assumir as consequências do que fiz e por vezes culpei outros ou as circunstâncias.',
      'Reconheci alguns erros meus, mas noutras situações evitei assumi-los.',
      'Assumi os meus erros e corrigi-os sem culpar os outros.',
      'Assumi total responsabilidade pelo meu trabalho, corrigi erros rapidamente e ajudei colegas a fazer o mesmo.',
    ],
  },
  {
    competenciaId: 'A02', // Autonomia
    frases: [
      'Precisei que me dissessem o que fazer em quase todas as tarefas, mesmo as mais simples.',
      'Consegui fazer algumas tarefas sozinho/a, mas precisei de ajuda frequente para decidir os próximos passos.',
      'Organizei e executei as minhas tarefas sem precisar de indicações constantes.',
      'Trabalhei de forma totalmente independente e ainda ajudei colegas a organizarem-se.',
    ],
  },
  {
    competenciaId: 'A03', // Apresentação pessoal
    frases: [
      'Não respeitei o uniforme/higiene pessoal (ex: unhas, cabelo, farda) e foi-me chamada a atenção mais do que uma vez.',
      'Tive o uniforme e a higiene pessoal corretos na maior parte do tempo, mas faltou algum detalhe.',
      'Mantive sempre o uniforme completo e a higiene pessoal adequada durante toda a aula.',
      'Mantive uma apresentação impecável e ainda alertei colegas para corrigirem a deles.',
    ],
  },
  {
    competenciaId: 'A04', // Iniciativa
    frases: [
      'Fiquei à espera que me dissessem o que fazer, mesmo quando havia tarefas óbvias para avançar.',
      'Tomei iniciativa em algumas situações, mas só quando foi muito evidente o que fazer.',
      'Avancei com tarefas sem que me fosse pedido, antecipando o que era preciso fazer.',
      'Identifiquei o que faltava fazer e tomei a iniciativa de resolver, incluindo ajudar noutras partidas da cozinha.',
    ],
  },
  {
    competenciaId: 'A05', // Autocontrolo
    frases: [
      'Em momentos de stress ou pressão, perdi a calma e isso afetou o meu trabalho ou o ambiente.',
      'Senti-me sob pressão em alguns momentos e por vezes reagi de forma menos calma do que gostaria.',
      'Mesmo sob pressão, mantive a calma e continuei a trabalhar de forma controlada.',
      'Geri muito bem a pressão e ainda ajudei a manter o ambiente calmo à minha volta.',
    ],
  },
  {
    competenciaId: 'A06', // Assertividade
    frases: [
      'Não consegui expressar a minha opinião quando era importante, ou fi-lo de forma agressiva.',
      'Tentei dizer o que pensava, mas por vezes fui demasiado calado/a ou demasiado direto/a sem cuidado.',
      'Consegui expressar a minha opinião de forma clara e respeitosa, mesmo quando discordava de alguém.',
      'Expressei sempre a minha opinião com clareza e respeito, e ajudei a equipa a chegar a acordo.',
    ],
  },
  {
    competenciaId: 'A07', // Empatia
    frases: [
      'Não me preocupei muito com o que os colegas estavam a sentir ou a precisar.',
      'Por vezes percebi o que os colegas precisavam, mas nem sempre ajustei o meu comportamento a isso.',
      'Percebi e tive em conta as dificuldades ou necessidades dos colegas durante o trabalho.',
      'Estive muito atento/a aos colegas, percebi quando precisavam de ajuda e antecipei-me a dar apoio.',
    ],
  },
  {
    competenciaId: 'A08', // Escuta ativa
    frases: [
      'Tive dificuldade em ouvir os outros até ao fim, interrompi ou não prestei atenção ao que diziam.',
      'Ouvi os colegas na maior parte das vezes, mas por vezes distraí-me ou não confirmei se entendi bem.',
      'Ouvi com atenção o que os colegas e o professor disseram e confirmei que entendi corretamente.',
      'Ouvi com atenção, fiz perguntas para esclarecer e ajudei a garantir que todos se entendiam.',
    ],
  },
  {
    competenciaId: 'A09', // Cooperação com a equipa
    frases: [
      'Tive dificuldade em trabalhar com os colegas, surgiram conflitos que não consegui gerir bem.',
      'Trabalhei com a equipa, mas só consegui comunicar e colaborar bem em algumas situações.',
      'Consegui trabalhar bem com o grupo na maioria das situações, partilhando tarefas e opiniões com calma.',
      'Cooperei ativamente em todas as situações, ajudando a equipa a resolver dificuldades e a incluir todos os colegas.',
    ],
  },
  {
    competenciaId: 'A10', // Empenho e persistência
    frases: [
      'Desisti ou perdi o interesse quando surgiram dificuldades.',
      'Continuei a tentar na maioria das vezes, mas houve momentos em que desisti antes de resolver o problema.',
      'Mesmo com dificuldades, persisti até resolver o problema ou terminar a tarefa.',
      'Persisti até ao fim em todas as dificuldades e ainda incentivei colegas a não desistirem.',
    ],
  },
  {
    competenciaId: 'A11', // Sentido de organização
    frases: [
      'O meu espaço de trabalho e os meus materiais estiveram desorganizados durante a maior parte do tempo.',
      'Mantive alguma organização, mas precisei de reorganizar o espaço ou os materiais várias vezes.',
      'Mantive o meu espaço de trabalho e os materiais organizados durante toda a atividade.',
      'Mantive tudo organizado e ainda ajudei a organizar o espaço e os materiais da equipa.',
    ],
  },
  {
    competenciaId: 'A12', // Flexibilidade e adaptabilidade
    frases: [
      'Tive muita dificuldade em lidar com mudanças de planos ou imprevistos durante a aula.',
      'Consegui adaptar-me a algumas mudanças, mas outras deixaram-me bastante desconfortável ou perdido/a.',
      'Adaptei-me bem a mudanças de planos ou imprevistos sem perder o ritmo de trabalho.',
      'Adaptei-me rapidamente a qualquer mudança e ajudei os colegas a fazerem o mesmo.',
    ],
  },
  {
    competenciaId: 'A13', // Sustentabilidade
    frases: [
      'Não me preocupei com o desperdício de alimentos ou recursos durante o trabalho.',
      'Tive alguma atenção ao desperdício, mas nem sempre aproveitei bem os ingredientes ou recursos.',
      'Tive cuidado em aproveitar bem os ingredientes e reduzir o desperdício durante a confeção.',
      'Geri os ingredientes de forma a aproveitar ao máximo, sugerindo formas de reduzir o desperdício à equipa.',
    ],
  },
  {
    competenciaId: 'A14', // Sentido criativo
    frases: [
      'Não propus nem experimentei nada diferente do que me foi indicado.',
      'Pensei em algumas ideias diferentes, mas não cheguei a experimentá-las.',
      'Propus e experimentei pelo menos uma ideia própria na confeção ou apresentação do prato.',
      'Propus várias ideias originais e consegui aplicá-las com bons resultados no prato final.',
    ],
  },
  {
    competenciaId: 'A15', // Disponibilidade para aprender
    frases: [
      'Mostrei pouco interesse em aprender coisas novas ou em receber feedback.',
      'Aceitei algum feedback, mas tive dificuldade em pôr em prática as sugestões recebidas.',
      'Mostrei-me aberto/a a aprender e tentei aplicar o feedback que recebi.',
      'Procurei ativamente aprender mais, pedi feedback e aplicou-o de imediato a melhorar o meu trabalho.',
    ],
  },
  {
    competenciaId: 'A16', // Resiliência / Determinação
    frases: [
      'Quando algo correu mal (ex: um prato falhou), desanimei e tive dificuldade em recomeçar.',
      'Quando algo correu mal, fiquei algo desanimado/a mas consegui continuar com algum apoio.',
      'Quando algo correu mal, mantive a motivação e tentei outra abordagem para resolver.',
      'Quando algo correu mal, mantive-me motivado/a, encontrei rapidamente uma solução e ajudei colegas a fazer o mesmo.',
    ],
  },
  {
    competenciaId: 'A17', // Proatividade
    frases: [
      'Esperei sempre por instruções, mesmo quando havia tarefas seguintes evidentes a fazer.',
      'Por vezes avancei para a tarefa seguinte sem ser preciso pedir, mas não foi consistente.',
      'Avancei para as tarefas seguintes sem esperar por indicação, de forma consistente.',
      'Antecipei sempre as tarefas seguintes e ainda preparei o trabalho para os colegas avançarem.',
    ],
  },
  {
    competenciaId: 'A18', // Autenticidade e autoconfiança na comunicação
    frases: [
      'Tive muita dificuldade em comunicar com confiança, evitei falar ou explicar o que estava a fazer.',
      'Comuniquei com alguma confiança, mas senti-me inseguro/a em situações mais expostas (ex: apresentar o prato).',
      'Comuniquei com confiança e clareza sobre o meu trabalho, mesmo em situações mais expostas.',
      'Comuniquei com confiança, clareza e naturalidade, transmitindo bem a mensagem em qualquer situação.',
    ],
  },
];

export function getFrases(lista: FrasesCompetencia[], competenciaId: string): FrasesCompetencia | undefined {
  return lista.find(f => f.competenciaId === competenciaId);
}
