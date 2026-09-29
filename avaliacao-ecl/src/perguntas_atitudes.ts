// ============================================================
// Autoavaliação das atitudes — duas perguntas por atitude (Rosa, set/2026).
//
// Cada pergunta é uma situação concreta de HOJE, com 4 comportamentos
// fechados, do pior para o melhor (o estilo do autocontrolo: «Levantei a
// voz ou respondi mal», «Fiquei nervoso e parei de trabalhar»…). Nada de
// frases vagas: o aluno de 15 anos tem de se reconhecer numa delas.
//
// «Hoje não aconteceu» só existe na PRIMEIRA pergunta. A segunda é uma
// situação que acontece sempre, para a atitude ter sempre resposta.
// Uma resposta «não aconteceu» não conta: a outra pergunta passa a valer
// a atitude toda (e a aula continua a valer os 20).
//
// As notas por dentro são as de sempre: 5 / 10 / 15 / 20 (NOTAS_FRASES).
// ============================================================
import { NOTAS_FRASES } from './frases_atitudes';
import { nivelDe20 } from './types';

export interface PerguntaAtitude {
  pergunta: string;
  respostas: [string, string, string, string];
  /** Texto do «não aconteceu» — só na primeira pergunta. */
  naoAconteceu?: string;
}

/** A resposta «Hoje não aconteceu». */
export const NAO_ACONTECEU = -1;

const P = (pergunta: string, respostas: [string, string, string, string], naoAconteceu?: string): PerguntaAtitude =>
  ({ pergunta, respostas, ...(naoAconteceu ? { naoAconteceu } : {}) });

export const PERGUNTAS_ATITUDES: Record<string, [PerguntaAtitude, PerguntaAtitude]> = {
  // ── 1.º ano ──────────────────────────────────────────────
  'ATI-001': [ // Responsabilidade pelas suas ações
    P('Hoje, quando alguma coisa correu mal no teu trabalho, o que fizeste?', [
      'Disse que a culpa não era minha ou escondi.',
      'Só admiti quando o professor perguntou.',
      'Disse logo ao professor e corrigi.',
      'Disse logo, corrigi e expliquei aos colegas para não voltar a acontecer.',
    ], 'Hoje não correu nada mal.'),
    P('Hoje, com a tarefa que te deram, o que fizeste?', [
      'Não a acabei e não disse a ninguém.',
      'Acabei, mas só porque me foram lembrando.',
      'Acabei a tempo, sem ninguém me lembrar.',
      'Acabei a tempo, confirmei se estava bem e avisei que estava pronta.',
    ]),
  ],
  'ATI-003': [ // Cuidado com a apresentação pessoal
    P('Hoje, como vieste para a cozinha?', [
      'Faltava-me parte da farda, ou vinha com anéis, unhas pintadas ou cabelo solto.',
      'Farda completa, mas suja ou amarrotada, ou esqueci a touca ou o avental.',
      'Farda completa, limpa e passada, cabelo preso e sem adornos.',
      'Tudo isto, e ajudei um colega a corrigir a farda dele.',
    ], 'Hoje não era preciso farda.'),
    P('Hoje, como cuidaste da tua higiene e da tua aparência?', [
      'Vim com a roupa suja ou despenteado, ou mexi no cabelo e na cara sem lavar as mãos.',
      'Estava bem, mas esqueci um pormenor (cabelo solto, unhas, brincos).',
      'Vim limpo e arranjado, com o cabelo preso e sem adornos.',
      'Tudo isto, e lembrei um colega que se tinha esquecido de alguma coisa.',
    ]),
  ],
  'ATI-005': [ // Autocontrolo
    P('Hoje, quando houve pressão ou alguém te irritou, o que fizeste?', [
      'Levantei a voz ou respondi mal.',
      'Fiquei nervoso e parei de trabalhar.',
      'Respirei e continuei a trabalhar com calma.',
      'Mantive a calma e ajudei a acalmar os outros.',
    ], 'Hoje não houve pressão nem ninguém me irritou.'),
    P('Hoje, a falar com os colegas durante o trabalho, como foi o teu tom?', [
      'Gritei ou falei mal com alguém.',
      'Às vezes falei alto ou de forma bruta.',
      'Falei sempre com calma.',
      'Falei sempre com calma e ajudei a baixar o barulho quando havia confusão.',
    ]),
  ],
  'ATI-011': [ // Sentido de organização
    P('Hoje, como estava a tua bancada enquanto trabalhavas?', [
      'Desarrumada: andei à procura das coisas e perdi tempo.',
      'Comecei arrumado, mas a meio ficou tudo misturado.',
      'Preparei tudo antes de começar e limpei enquanto trabalhava.',
      'Tudo isto, e acabei a tempo de ajudar outra bancada.',
    ], 'Hoje não trabalhei na bancada.'),
    P('Hoje, com o teu material (ficha, caderno, utensílios, mochila), como foi?', [
      'Esqueci-me de material ou andei à procura das coisas.',
      'Trouxe tudo, mas estava tudo misturado.',
      'Tinha tudo o que precisava, arrumado e à mão.',
      'Tudo isto, e ainda ajudei um colega a organizar-se.',
    ]),
  ],
  'ATI-013': [ // Disponibilidade para aprender
    P('Hoje, quando não percebeste alguma coisa, o que fizeste?', [
      'Fiquei calado e fiz ao calhas.',
      'Perguntei a um colega, mas não confirmei se estava certo.',
      'Perguntei ao professor.',
      'Perguntei e depois voltei a experimentar até conseguir sozinho.',
    ], 'Hoje percebi tudo à primeira.'),
    P('Hoje, quando o professor explicou ou te corrigiu, o que fizeste?', [
      'Não prestei atenção ou fiquei chateado com a correção.',
      'Ouvi, mas continuei a fazer à minha maneira.',
      'Ouvi e fiz como foi explicado.',
      'Fiz como foi explicado e fiz perguntas para perceber melhor.',
    ]),
  ],
  'ATI-015': [ // Respeito pelas regras e normas definidas
    P('Hoje, com as regras (horário, lavar as mãos, circuito do sujo e do limpo), o que fizeste?', [
      'Falhei várias regras e o professor teve de me chamar a atenção.',
      'Falhei uma regra (por exemplo, cheguei atrasado).',
      'Cumpri todas as regras sem ninguém me lembrar.',
      'Cumpri todas e lembrei um colega que se estava a esquecer.',
    ]),
    P('Hoje, com o telemóvel, o que fizeste?', [
      'Usei-o durante o trabalho.',
      'Estava guardado, mas fui ver uma vez.',
      'Esteve guardado a aula toda.',
      'Esteve guardado a aula toda e lembrei um colega de guardar o dele.',
    ]),
  ],
  'ATI-016': [ // Higiene e segurança alimentar
    P('Hoje, com os alimentos, o que fizeste?', [
      'Juntei cru com cozinhado ou usei a mesma tábua para tudo sem lavar.',
      'Separei às vezes, mas nem sempre.',
      'Separei sempre o cru do cozinhado e limpei a tábua e a faca entre produtos.',
      'Tudo isto, e avisei um colega quando vi um erro de higiene.',
    ], 'Hoje não mexi em alimentos.'),
    P('Hoje, quando lavaste as mãos?', [
      'Não lavei as mãos.',
      'Lavei só quando me mandaram.',
      'Lavei ao chegar e sempre que era preciso (depois da casa de banho, antes de mexer em comida).',
      'Tudo isto, e lembrei um colega que se esqueceu.',
    ]),
  ],
  'ATI-017': [ // Segurança e saúde no trabalho
    P('Hoje, com facas, lume e tachos quentes, o que fizeste?', [
      'Andei com a faca na mão ou deixei-a no lava-loiça.',
      'Tive cuidado quase sempre, mas distraí-me uma vez.',
      'Trabalhei sempre com segurança: faca pousada, pegas, «atenção, quente!».',
      'Tudo isto, e avisei ou protegi um colega de um perigo.',
    ], 'Hoje não usei facas, lume nem equipamentos.'),
    P('Hoje, com o chão, as passagens e as mochilas, o que fizeste?', [
      'Corri ou deixei coisas no chão e nas passagens.',
      'Às vezes deixei coisas fora do sítio.',
      'Andei com cuidado e deixei as passagens livres.',
      'Tudo isto, e avisei quando vi um perigo (chão molhado, cabo solto).',
    ]),
  ],
  // ── 2.º ano ──────────────────────────────────────────────
  'ATI-002': [ // Autonomia
    P('Hoje, quando não sabias o passo seguinte, o que fizeste?', [
      'Fiquei parado à espera que alguém me dissesse.',
      'Perguntei logo ao professor, sem ver a ficha.',
      'Fui ver a ficha ou o plano e resolvi sozinho.',
      'Resolvi sozinho e ainda adiantei a tarefa seguinte.',
    ], 'Hoje soube sempre o que fazer.'),
    P('Hoje, como começaste o teu trabalho?', [
      'Esperei que me dissessem o que fazer.',
      'Comecei, mas precisei que me lembrassem várias vezes.',
      'Comecei sozinho, a partir do plano ou da ficha.',
      'Comecei sozinho e organizei a minha parte do princípio ao fim.',
    ]),
  ],
  'ATI-007': [ // Empatia
    P('Hoje, quando um colega estava com dificuldades ou chateado, o que fizeste?', [
      'Gozei ou disse alguma coisa que o magoou.',
      'Reparei, mas não fiz nada.',
      'Perguntei se estava bem ou se precisava de ajuda.',
      'Ajudei-o sem o fazer sentir mal, até ele ficar bem.',
    ], 'Hoje não vi nenhum colega com dificuldades.'),
    P('Hoje, na forma como falaste com os colegas, o que fizeste?', [
      'Gozei ou disse coisas que magoam.',
      'Às vezes falei sem pensar no que o outro ia sentir.',
      'Falei com respeito e cuidado.',
      'Falei com cuidado e animei um colega.',
    ]),
  ],
  'ATI-008': [ // Escuta ativa
    P('Hoje, numa conversa ou discussão em grupo, o que fizeste?', [
      'Falei por cima dos outros.',
      'Fiquei calado e distraído.',
      'Esperei pela minha vez e ouvi os outros até ao fim.',
      'Ouvi, e usei a ideia de um colega para continuar a conversa.',
    ], 'Hoje não houve conversa em grupo.'),
    P('Hoje, quando alguém te explicou ou pediu alguma coisa, o que fizeste?', [
      'Interrompi ou estava a fazer outra coisa.',
      'Ouvi, mas depois tive de perguntar outra vez.',
      'Ouvi até ao fim, olhei para a pessoa e fiz o que foi pedido.',
      'Ouvi até ao fim e repeti por palavras minhas para confirmar («Então é…?»).',
    ]),
  ],
  'ATI-009': [ // Cooperação com a equipa
    P('Hoje, a trabalhar com a tua equipa, o que fizeste?', [
      'Deixei o trabalho para os outros ou trabalhei à parte.',
      'Fiz a minha parte, mas não quis saber do resto da equipa.',
      'Fiz a minha parte e ajudei quando me pediram.',
      'Ofereci ajuda sem me pedirem e dividimos bem as tarefas.',
    ], 'Hoje trabalhei sozinho, não havia equipa.'),
    P('Hoje, no fim da aula, o que fizeste?', [
      'Saí sem ajudar a arrumar.',
      'Arrumei só o que era meu.',
      'Ajudei a arrumar e a limpar o que era de todos.',
      'Ajudei e fiquei até estar tudo pronto.',
    ]),
  ],
  'ATI-010': [ // Empenho e persistência
    P('Hoje, quando uma tarefa era difícil ou correu mal, o que fizeste?', [
      'Desisti ou pedi a outro para fazer.',
      'Tentei mais uma vez e depois desisti.',
      'Continuei a tentar até conseguir.',
      'Continuei até conseguir e perguntei como fazer melhor.',
    ], 'Hoje nada foi difícil.'),
    P('Hoje, até ao fim da aula, como trabalhaste?', [
      'Parei antes do fim ou trabalhei devagar de propósito.',
      'Trabalhei bem só numa parte da aula.',
      'Trabalhei com vontade do princípio ao fim.',
      'Trabalhei até ao fim e ainda fiz mais do que me pediram.',
    ]),
  ],
  'ATI-012': [ // Flexibilidade e adaptabilidade
    P('Hoje, quando o plano mudou (outra tarefa, faltou um produto, trocaste de função), o que fizeste?', [
      'Reclamei e não quis mudar.',
      'Mudei, mas a reclamar, e demorei a começar.',
      'Aceitei e comecei logo a nova tarefa.',
      'Aceitei, comecei logo e ajudei a equipa a adaptar-se.',
    ], 'Hoje nada mudou.'),
    P('Hoje, com a tarefa ou o lugar que te deram, o que fizeste?', [
      'Reclamei ou tentei trocar.',
      'Aceitei, mas de má vontade.',
      'Aceitei e fiz bem.',
      'Aceitei e ofereci-me para fazer também o que faltava.',
    ]),
  ],
  'ATI-018': [ // Sensibilidade e bem-estar dos outros
    P('Hoje, quando um colega estava triste, cansado ou sozinho, o que fizeste?', [
      'Gozei ou ignorei.',
      'Reparei, mas não fiz nada.',
      'Fui falar com ele.',
      'Fui falar com ele e chamei-o para junto de mim ou do meu grupo.',
    ], 'Hoje não vi nenhum colega assim.'),
    P('Hoje, com os colegas à tua volta (barulho, espaço, ambiente), o que fizeste?', [
      'Fiz barulho, empurrei ou ocupei o espaço dos outros.',
      'Às vezes não reparei que estava a incomodar.',
      'Respeitei o espaço e o trabalho dos colegas.',
      'Respeitei, e fiz alguma coisa para um colega se sentir bem.',
    ]),
  ],
  'ATI-022': [ // Respeito pelas diferenças individuais
    P('Hoje, quando alguém deu uma ideia diferente da tua, o que fizeste?', [
      'Gozei ou disse que era uma parvoíce.',
      'Ignorei a ideia.',
      'Ouvi e respeitei.',
      'Ouvi, e experimentámos a ideia.',
    ], 'Hoje ninguém deu ideias diferentes das minhas.'),
    P('Hoje, com colegas diferentes de ti (origem, forma de ser, de trabalhar), o que fizeste?', [
      'Gozei, pus de parte ou disse alguma coisa ofensiva.',
      'Não gozei, mas evitei trabalhar com eles.',
      'Trabalhei bem com eles e respeitei a opinião deles.',
      'Trabalhei bem e defendi-os quando alguém os tratou mal.',
    ]),
  ],
  // ── 3.º ano ──────────────────────────────────────────────
  'ATI-004': [ // Iniciativa
    P('Hoje, quando acabaste a tua tarefa, o que fizeste?', [
      'Fiquei parado ou fui para o telemóvel.',
      'Esperei que o professor me desse outra tarefa.',
      'Perguntei o que faltava e comecei.',
      'Vi o que faltava e comecei sem ninguém me pedir.',
    ], 'Hoje a minha tarefa durou a aula toda.'),
    P('Hoje, quando viste alguma coisa por fazer (lixo, loiça, material fora do sítio), o que fizeste?', [
      'Fingi que não vi.',
      'Disse a alguém, mas não fiz.',
      'Fiz eu.',
      'Fiz eu e combinei com a equipa para não voltar a acontecer.',
    ]),
  ],
  'ATI-006': [ // Assertividade
    P('Hoje, quando não concordaste com alguém ou tiveste de falar de um problema, o que fizeste?', [
      'Gritei, fui mal-educado ou fiquei amuado.',
      'Fiquei calado e guardei para mim.',
      'Disse com calma o que pensava.',
      'Disse com calma e propus uma solução.',
    ], 'Hoje não discordei de ninguém.'),
    P('Hoje, quando precisaste de alguma coisa (ajuda, material, uma explicação), como pediste?', [
      'Exigi, gritei ou tirei sem pedir.',
      'Não pedi e fiquei à espera.',
      'Pedi com calma e disse claramente o que precisava.',
      'Pedi com calma, expliquei porquê e agradeci.',
    ]),
  ],
  'ATI-014': [ // Sustentabilidade
    P('Hoje, com os produtos (quantidades, sobras, cascas), o que fizeste?', [
      'Deitei fora comida que se podia aproveitar.',
      'Aproveitei alguma coisa, mas desperdicei.',
      'Usei as quantidades certas e aproveitei o que dava.',
      'Tudo isto, e dei uma ideia para aproveitar sobras.',
    ], 'Hoje não trabalhei com produtos.'),
    P('Hoje, com a água, a luz, o papel e o lixo, o que fizeste?', [
      'Deixei água ou luz ligadas e deitei tudo no mesmo lixo.',
      'Tive cuidado só às vezes.',
      'Fechei, desliguei e separei o lixo.',
      'Tudo isto, e lembrei os colegas ou dei uma ideia para poupar.',
    ]),
  ],
  'ATI-019': [ // Autoconfiança
    P('Hoje, quando tiveste uma tarefa nova ou difícil, o que fizeste?', [
      'Disse logo que não era capaz ou recusei.',
      'Fiz, mas pedi ao professor para confirmar cada passo.',
      'Fiz com confiança e só pedi ajuda quando era mesmo preciso.',
      'Fiz com confiança e ofereci-me para mostrar a um colega.',
    ], 'Hoje não tive nenhuma tarefa nova.'),
    P('Hoje, quando tiveste de decidir alguma coisa sozinho, o que fizeste?', [
      'Não decidi e esperei que decidissem por mim.',
      'Decidi, mas pedi confirmação para tudo.',
      'Decidi sozinho e só confirmei o que era importante.',
      'Decidi sozinho e expliquei a um colega porquê.',
    ]),
  ],
  'ATI-020': [ // Postura profissional
    P('Hoje, quando o professor ou o chefe te deu uma ordem, como respondeste?', [
      'Refilei ou ignorei.',
      'Fiz, mas de má cara.',
      'Respondi «Sim, chefe» e fiz.',
      'Respondi, fiz, e avisei quando estava feito.',
    ]),
    P('Hoje, na forma como estiveste na aula (linguagem, telemóvel, horário), o que fizeste?', [
      'Disse palavrões, usei o telemóvel ou cheguei atrasado.',
      'Estive quase sempre bem, mas falhei uma vez.',
      'Falei com educação, cheguei a horas e não usei o telemóvel.',
      'Tudo isto, e fui exemplo para os colegas.',
    ]),
  ],
  'ATI-021': [ // Sentido crítico
    P('Hoje, quando viste ou provaste o trabalho de um colega, o que disseste?', [
      'Gozei ou disse só «está mal».',
      'Não disse nada.',
      'Disse o que estava bem e o que se podia melhorar.',
      'Disse com respeito e dei uma ideia concreta para melhorar.',
    ], 'Hoje não vi o trabalho de colegas.'),
    P('No fim da aula, o que pensaste sobre o teu trabalho?', [
      'Achei que estava tudo bem, sem olhar para o resultado.',
      'Vi que alguma coisa não estava bem, mas não sei porquê.',
      'Provei e olhei, e percebi o que falhou e porquê.',
      'Percebi o que falhou e sei o que vou fazer diferente da próxima vez.',
    ]),
  ],
};

/**
 * Nos eventos e concursos, as 3 atitudes fixas perguntam o compromisso:
 * treinar, chegar a horas, farda e material, ficar até ao fim (Rosa,
 * set/2026). Ir a um evento é trabalho a sério, não só aparecer.
 */
export const PERGUNTAS_EVENTO: Record<string, [PerguntaAtitude, PerguntaAtitude]> = {
  'ATI-001': [ // Responsabilidade
    P('Antes do evento ou do concurso, quantas vezes treinaste o prato ou a tua tarefa?', [
      'Não treinei.',
      'Treinei uma vez, só porque o professor mandou.',
      'Treinei duas ou três vezes.',
      'Treinei várias vezes e pedi opinião ao professor ou a um colega.',
    ]),
    P('A que horas chegaste?', [
      'Cheguei atrasado e não avisei.',
      'Cheguei atrasado, mas avisei.',
      'Cheguei à hora marcada.',
      'Cheguei antes da hora e ajudei a preparar.',
    ]),
  ],
  'ATI-003': [ // Apresentação pessoal
    P('Como vieste vestido?', [
      'Faltava parte da farda.',
      'Farda completa, mas suja ou amarrotada.',
      'Farda completa, limpa e passada.',
      'Tudo isto, e ajudei um colega a compor a farda.',
    ]),
    P('E o material de que precisavas (facas, utensílios, ficha, ingredientes)?', [
      'Esqueci-me de coisas importantes e tive de pedir.',
      'Esqueci-me de uma coisa pequena.',
      'Trouxe tudo o que precisava.',
      'Trouxe tudo e confirmei antes com uma lista.',
    ]),
  ],
  'ATI-012': [ // Ficar até ao fim / adaptar-se
    P('Quando alguma coisa mudou ou correu mal no evento, o que fizeste?', [
      'Reclamei ou parei.',
      'Continuei, mas a reclamar.',
      'Adaptei-me e continuei.',
      'Adaptei-me e ajudei a equipa a resolver.',
    ], 'Nada mudou nem correu mal.'),
    P('No fim, o que fizeste?', [
      'Saí antes do fim.',
      'Fiquei, mas não ajudei a arrumar.',
      'Fiquei até ao fim e arrumei a minha parte.',
      'Fiquei até estar tudo arrumado e ajudei os outros.',
    ]),
  ],
};

/** As perguntas desta atitude: as do evento, num evento ou concurso; senão as de sempre. */
export function perguntasDe(id: string, evento = false): [PerguntaAtitude, PerguntaAtitude] | undefined {
  return (evento && PERGUNTAS_EVENTO[id]) || PERGUNTAS_ATITUDES[id];
}

export function temPerguntas(id: string): boolean {
  return !!PERGUNTAS_ATITUDES[id];
}

/** Respondida: as duas perguntas têm resposta (uma resposta pode ser «não aconteceu»). */
export function atitudeRespondida(id: string, r: (number | null | undefined)[] | undefined, evento = false): boolean {
  const ps = perguntasDe(id, evento);
  if (!ps || !r) return false;
  return ps.every((p, i) => r[i] != null && (r[i]! >= 0 || (r[i] === NAO_ACONTECEU && !!p.naoAconteceu)));
}

/** Nível 1-5 da atitude: a média das respostas que contam. As «não aconteceu» saem da conta. */
export function nivelDaAtitude(r: (number | null | undefined)[] | undefined): number | null {
  const contam = (r || []).filter((x): x is number => x != null && x >= 0);
  if (!contam.length) return null;
  return contam.reduce((s, i) => s + nivelDe20(NOTAS_FRASES[i]), 0) / contam.length;
}

/** O que o aluno respondeu, em texto — para o professor ver na validação. */
export function textoDasRespostas(id: string, r: (number | null | undefined)[] | undefined, evento = false): { pergunta: string; resposta: string }[] {
  const ps = perguntasDe(id, evento);
  if (!ps || !r) return [];
  return ps.map((p, i) => ({
    pergunta: p.pergunta,
    resposta: r[i] === NAO_ACONTECEU ? `Não aconteceu: ${p.naoAconteceu}` : r[i] != null ? p.respostas[r[i]!] : 'Por responder',
  }));
}
