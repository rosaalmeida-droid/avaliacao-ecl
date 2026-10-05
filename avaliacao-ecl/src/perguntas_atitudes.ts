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
import { cumpre, porqueNao, type ContextoAula, type Requisito } from './contextoAula';
import { PARES_NOVOS_ATITUDES } from './perguntasNovasAtitudes';

export interface PerguntaAtitude {
  pergunta: string;
  respostas: [string, string, string, string];
  /** Texto do «não aconteceu» — só na primeira pergunta. */
  naoAconteceu?: string;
}

/** A resposta «Hoje não aconteceu». */
export const NAO_ACONTECEU = -1;
/** A pergunta não se fez: não fazia sentido nesta aula (sem cozinha, sem equipas…). */
export const NAO_SE_APLICA = -2;

const P = (pergunta: string, respostas: [string, string, string, string], naoAconteceu?: string): PerguntaAtitude =>
  ({ pergunta, respostas, ...(naoAconteceu ? { naoAconteceu } : {}) });

export const PERGUNTAS_ATITUDES: Record<string, [PerguntaAtitude, PerguntaAtitude]> = {
  // ── 1.º ano ──────────────────────────────────────────────
  'ATI-001': [ // Responsabilidade pelas suas ações
    P('Hoje, quando alguma coisa correu mal no teu trabalho, o que fizeste?', [
      'Disse que a culpa não era minha ou escondi o que aconteceu.',
      'Só admiti quando o professor perguntou.',
      'Disse logo ao professor e corrigi o erro.',
      'Disse logo, corrigi o erro e expliquei aos colegas como evitá-lo.',
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
      'Vim com a farda completa, mas suja ou amarrotada, ou esqueci-me da touca ou do avental.',
      'Vim com a farda completa, limpa e passada, com o cabelo preso e sem adornos.',
      'Tudo isto, e ajudei um colega a corrigir a farda dele.',
    ], 'Hoje não era preciso farda.'),
    P('Hoje, como cuidaste da tua higiene e da tua aparência?', [
      'Vim com a roupa suja ou despenteado/a, ou mexi no cabelo e na cara sem lavar as mãos.',
      'Estava bem, mas esqueci um pormenor (cabelo solto, unhas, brincos).',
      'Vim limpo/a e arranjado/a, com o cabelo preso e sem adornos.',
      'Tudo isto, e lembrei um colega que se tinha esquecido de alguma coisa.',
    ]),
  ],
  'ATI-005': [ // Autocontrolo
    P('Hoje, quando houve pressão ou alguém te irritou, o que fizeste?', [
      'Levantei a voz ou respondi mal.',
      'Fiquei nervoso/a e parei de trabalhar.',
      'Respirei e continuei a trabalhar com calma.',
      'Mantive a calma e ajudei a acalmar os outros.',
    ], 'Hoje não houve pressão nem ninguém me irritou.'),
    P('Hoje, a falar com os colegas durante o trabalho, como foi o teu tom?', [
      'Gritei ou falei mal com alguém.',
      'Às vezes falei alto ou de forma rude.',
      'Falei sempre com calma.',
      'Falei sempre com calma e ajudei a baixar o barulho quando havia confusão.',
    ]),
  ],
  'ATI-011': [ // Sentido de organização
    P('Hoje, como estava a tua bancada enquanto trabalhavas?', [
      'Desarrumada: andei à procura das coisas e perdi tempo.',
      'Comecei com tudo arrumado, mas a meio ficou tudo misturado.',
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
      'Fiquei calado/a e fiz à sorte.',
      'Perguntei a um colega, mas não confirmei se estava certo.',
      'Perguntei ao professor.',
      'Perguntei e depois voltei a experimentar até conseguir sem ajuda.',
    ], 'Hoje percebi tudo à primeira.'),
    P('Hoje, quando o professor explicou ou te corrigiu, o que fizeste?', [
      'Não prestei atenção ou fiquei aborrecido/a com a correção.',
      'Ouvi, mas continuei a fazer à minha maneira.',
      'Ouvi e fiz como foi explicado.',
      'Fiz como foi explicado e fiz perguntas para perceber melhor.',
    ]),
  ],
  'ATI-015': [ // Respeito pelas regras e normas definidas
    P('Hoje, com as regras (horário, lavar as mãos, circuito do sujo e do limpo), o que fizeste?', [
      'Falhei várias regras e o professor teve de me chamar a atenção.',
      'Falhei uma regra (por exemplo, cheguei atrasado/a).',
      'Cumpri todas as regras sem ninguém me lembrar.',
      'Cumpri todas e lembrei um colega que se estava a esquecer.',
    ]),
    // O telemóvel pode usar-se na aula para o trabalho (Rosa, out/2026):
    // conta só o uso para outras coisas.
    P('Hoje, com o telemóvel, o que fizeste? (Usá-lo para o trabalho é permitido.)', [
      'Usei-o várias vezes para coisas que não eram do trabalho.',
      'Usei-o uma vez para uma coisa que não era do trabalho.',
      'Só o usei para o trabalho (ou não o usei).',
      'Só o usei para o trabalho e lembrei um colega de fazer o mesmo.',
    ]),
  ],
  'ATI-016': [ // Higiene e segurança alimentar
    P('Hoje, com os alimentos, o que fizeste?', [
      'Juntei cru com cozinhado ou usei a mesma tábua para tudo sem lavar.',
      'Separei algumas vezes, mas não sempre.',
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
      'Andei com a faca na mão ou deixei-a dentro do lava-loiça.',
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
      'Fiquei parado/a à espera de que alguém me dissesse.',
      'Perguntei logo ao professor, sem ver a ficha.',
      'Fui ver a ficha ou o plano e resolvi sem ajuda.',
      'Resolvi sem ajuda e ainda adiantei a tarefa seguinte.',
    ], 'Hoje soube sempre o que fazer.'),
    P('Hoje, como começaste o teu trabalho?', [
      'Esperei que me dissessem o que fazer.',
      'Comecei, mas precisei que me lembrassem várias vezes.',
      'Comecei sem ajuda, a partir do plano ou da ficha.',
      'Comecei sem ajuda e organizei a minha parte do princípio ao fim.',
    ]),
  ],
  'ATI-007': [ // Empatia
    P('Hoje, quando um colega estava com dificuldades ou aborrecido, o que fizeste?', [
      'Fiz troça ou disse alguma coisa que o magoou.',
      'Reparei, mas não fiz nada.',
      'Perguntei se estava bem ou se precisava de ajuda.',
      'Ajudei-o sem o fazer sentir mal, até ele ficar bem.',
    ], 'Hoje não vi nenhum colega com dificuldades.'),
    P('Hoje, na forma como falaste com os colegas, o que fizeste?', [
      'Fiz troça ou disse coisas que magoam.',
      'Às vezes falei sem pensar no que o outro ia sentir.',
      'Falei com respeito e cuidado.',
      'Falei com cuidado e animei um colega.',
    ]),
  ],
  'ATI-008': [ // Escuta ativa
    P('Hoje, numa conversa ou discussão em grupo, o que fizeste?', [
      'Falei por cima dos outros.',
      'Fiquei calado/a e distraído/a.',
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
    ], 'Hoje trabalhei sozinho/a: não havia equipa.'),
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
      'Fiz troça ou ignorei.',
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
      'Fiz troça ou disse que era um disparate.',
      'Ignorei a ideia.',
      'Ouvi e respeitei.',
      'Ouvi, e experimentámos a ideia.',
    ], 'Hoje ninguém deu ideias diferentes das minhas.'),
    P('Hoje, com colegas diferentes de ti (origem, forma de ser, de trabalhar), o que fizeste?', [
      'Fiz troça, pus de parte ou disse alguma coisa ofensiva.',
      'Não fiz troça, mas evitei trabalhar com eles.',
      'Trabalhei bem com eles e respeitei a opinião deles.',
      'Trabalhei bem e defendi-os quando alguém os tratou mal.',
    ]),
  ],
  // ── 3.º ano ──────────────────────────────────────────────
  'ATI-004': [ // Iniciativa
    P('Hoje, quando acabaste a tua tarefa, o que fizeste?', [
      'Fiquei parado/a ou fui ao telemóvel sem ser para o trabalho.',
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
      'Gritei, fui mal-educado/a ou fiquei amuado/a.',
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
    P('Hoje, quando tiveste de decidir alguma coisa sozinho/a, o que fizeste?', [
      'Não decidi e esperei que decidissem por mim.',
      'Decidi, mas pedi confirmação para tudo.',
      'Decidi sem ajuda e só confirmei o que era importante.',
      'Decidi sem ajuda e expliquei a um colega porquê.',
    ]),
  ],
  'ATI-020': [ // Postura profissional
    P('Hoje, quando o professor ou o chefe te deu uma ordem, como respondeste?', [
      'Respondi mal ou ignorei.',
      'Fiz, mas de má vontade.',
      'Respondi «Sim, chefe» e fiz.',
      'Respondi, fiz e avisei quando estava feito.',
    ]),
    P('Hoje, na forma como estiveste na aula (linguagem, telemóvel, horário), o que fizeste?', [
      'Disse palavrões, usei o telemóvel sem ser para o trabalho ou cheguei atrasado/a.',
      'Estive quase sempre bem, mas falhei uma vez.',
      'Falei com educação, cheguei a horas e só usei o telemóvel para o trabalho.',
      'Tudo isto, e fui um exemplo para os colegas.',
    ]),
  ],
  'ATI-021': [ // Sentido crítico
    P('Hoje, quando viste ou provaste o trabalho de um colega, o que disseste?', [
      'Fiz troça ou disse apenas «está mal».',
      'Não disse nada.',
      'Disse o que estava bem e o que se podia melhorar.',
      'Disse com respeito e dei uma ideia concreta para melhorar.',
    ], 'Hoje não vi o trabalho de colegas.'),
    P('No fim da aula, o que pensaste sobre o teu trabalho?', [
      'Achei que estava tudo bem, sem olhar para o resultado.',
      'Vi que alguma coisa não estava bem, mas não percebi porquê.',
      'Provei e observei, e percebi o que falhou e porquê.',
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
    // Serve para qualquer evento (serviço, inauguração, feira) e para os
    // concursos: «treinar o prato» só fazia sentido num concurso (Rosa, out/2026).
    // Só saber a tarefa ao chegar acontece muitas vezes e não é culpa do
    // aluno: é a resposta «não aconteceu», que não conta (Rosa, out/2026).
    P('Antes do evento, como te preparaste para a tua tarefa?', [
      'Sabia a minha tarefa, mas não me preparei.',
      'Preparei-me pouco, só porque o professor mandou.',
      'Preparei-me: li a ficha ou o que me pediram.',
      'Preparei-me e tirei dúvidas ou treinei antes com o professor ou um colega.',
    ], 'Só me disseram a tarefa quando cheguei (não dava para me preparar).'),
    P('A que horas chegaste?', [
      'Cheguei atrasado/a e não avisei.',
      'Cheguei atrasado/a, mas avisei.',
      'Cheguei à hora marcada.',
      'Cheguei antes da hora e ajudei a preparar.',
    ]),
  ],
  'ATI-003': [ // Apresentação pessoal
    P('Como vieste vestido/a?', [
      'Faltava-me parte da farda.',
      'Vim com a farda completa, mas suja ou amarrotada.',
      'Vim com a farda completa, limpa e passada.',
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

// ── O que cada pergunta precisa que a aula tenha ───────────────
// Sem cozinha não se pergunta pela bancada, pela farda ou por arrumar;
// sem cozinhar, pelas facas, pelos alimentos ou pelo passo seguinte da
// ficha; sem equipas, pelo trabalho com a equipa (Rosa, out/2026).
// Sem nada aqui, a pergunta faz sentido em qualquer aula.
const REQUISITOS: Record<string, [Requisito[], Requisito[]]> = {
  'ATI-003': [['cozinha'], []],            // como vieste para a cozinha (farda)
  'ATI-011': [['producao'], []],           // a bancada enquanto trabalhavas
  'ATI-015': [['cozinha'], []],            // lavar as mãos, circuito do sujo e do limpo
  'ATI-016': [['producao'], ['producao']], // alimentos; lavar as mãos antes de mexer em comida
  'ATI-017': [['producao'], ['cozinha']],  // facas e lume; chão e passagens
  'ATI-002': [['producao'], []],           // o passo seguinte (da ficha)
  'ATI-008': [['colegas'], []],            // conversa ou discussão em grupo
  'ATI-009': [['equipa'], ['cozinha']],    // a trabalhar com a equipa; arrumar no fim
  'ATI-004': [[], ['cozinha']],            // lixo, loiça, material fora do sítio
  'ATI-014': [['producao'], []],           // produtos, sobras, cascas
  'ATI-021': [['producao'], []],           // provar o trabalho de um colega
  // Perguntas sobre os colegas: só numa aula em que se trabalha com eles
  // (auditoria 5/out/2026: «quando não concordaste com alguém» numa aula em
  // que cada um trabalhava sozinho).
  'ATI-006': [['colegas'], []],            // discordar de alguém; pedir o que precisas (sempre)
  'ATI-005': [[], ['colegas']],            // pressão; o tom com os colegas
  'ATI-007': [['colegas'], ['colegas']],   // colega com dificuldades; como falaste com os colegas
  'ATI-018': [['colegas'], []],            // colega triste; o ambiente à tua volta (sempre)
  'ATI-022': [['colegas'], ['colegas']],   // ideia diferente; colegas diferentes de ti
};

/** Que perguntas desta atitude se fazem nesta aula (uma por posição). Num
 *  evento ou concurso fazem-se sempre as do evento. */
export function perguntasAplicaveis(id: string, ctx: ContextoAula | undefined, evento = false): boolean[] {
  const ps = perguntasDe(id, evento, ctx);
  if (!ps) return [];
  if (!ctx || (evento && PERGUNTAS_EVENTO[id])) return ps.map(() => true);
  if (!ctx.cozinha && FORA_DA_COZINHA[id] && !(evento && PERGUNTAS_EVENTO[id])) return ps.map(() => true);
  const req = REQUISITOS[id] || [[], []];
  return ps.map((_, i) => cumpre(req[i], ctx));
}

/** A atitude tem pelo menos uma pergunta que faça sentido nesta aula? */
export function atitudeAplicavel(id: string, ctx: ContextoAula | undefined, evento = false): boolean {
  return perguntasAplicaveis(id, ctx, evento).some(Boolean);
}

/** Porque é que esta pergunta não se faz hoje (para o professor ver). */
export function porqueNaoSeFaz(id: string, i: number, ctx: ContextoAula): string {
  return porqueNao((REQUISITOS[id] || [[], []])[i], ctx);
}

/** As respostas com as perguntas que não se fizeram marcadas «não se aplica». */
export function respostasEfetivas(id: string, r: (number | null | undefined)[] | undefined,
  ctx: ContextoAula | undefined, evento = false): (number | null)[] {
  const base = perguntasAplicaveis(id, ctx, evento).map((a, i) => a ? (r?.[i] ?? null) : NAO_SE_APLICA);
  // A pergunta de substituição (posição 2), quando a primeira «não aconteceu».
  return r && r[2] != null ? [...base, r[2] as number] : base;
}

// ── Pergunta de substituição (Rosa, out/2026) ──────────────────
// Quando o aluno responde «não aconteceu», a aplicação faz logo outra
// pergunta, sobre uma situação que acontece sempre, em vez de ficar só
// com a outra. A resposta conta como as outras (posição 2 das respostas).
const SUBSTITUTAS_EVENTO: Record<string, PerguntaAtitude> = {
  'ATI-001': P('Durante o evento, quando te deram a tua tarefa, o que fizeste?', [
    'Fiquei à espera de que me explicassem tudo outra vez.',
    'Comecei, mas a perguntar a cada passo.',
    'Percebi e comecei logo.',
    'Percebi, comecei logo e ajudei a organizar os colegas.',
  ]),
  'ATI-012': P('Durante o evento, quando te pediram uma coisa diferente do que estavas a fazer, o que fizeste?', [
    'Recusei ou reclamei.',
    'Fiz, mas a reclamar.',
    'Fiz logo.',
    'Fiz logo e voltei à minha tarefa sem a deixar por acabar.',
  ]),
};
export function perguntaSubstituta(id: string, evento = false): PerguntaAtitude | null {
  if (evento && PERGUNTAS_EVENTO[id]) return SUBSTITUTAS_EVENTO[id] || null;
  // Das perguntas novas: a primeira situação «de sempre» que se pode fazer
  // em qualquer aula (sem precisar de cozinha, equipa…). Sempre a mesma para
  // esta atitude, para o professor ver exatamente a que o aluno respondeu.
  const par = (PARES_NOVOS_ATITUDES[id] || []).find(x => !x.requisitos[1].length);
  return par ? par.perguntas[1] : null;
}

// Fora da cozinha (aula atitudinal, teórica): a apresentação pessoal é a roupa
// com que se vem para a escola, e não a farda. Regras da escola: sem calças
// rotas, calções, boné, costas ou barriga à mostra; roupa casual e cuidada,
// à altura da formação (Rosa, 5/out/2026).
const FORA_DA_COZINHA: Record<string, [PerguntaAtitude, PerguntaAtitude]> = {
  'ATI-003': [
    P('Hoje, como vieste vestido/a para a escola?', [
      'Vim com roupa que não se usa na escola (calças rotas, calções, boné, costas ou barriga à mostra).',
      'Vim quase bem, mas com uma peça que não se usa na escola (o boné, por exemplo).',
      'Vim com roupa casual e cuidada, como se pede na escola.',
      'Vim com roupa casual e cuidada, e lembrei um colega das regras da escola.',
    ]),
    P('Hoje, como cuidaste da tua apresentação durante a aula?', [
      'Estive de boné ou com a roupa desarrumada, e não me importei.',
      'Estive bem, mas tiveram de me lembrar de um pormenor.',
      'Estive sempre arranjado/a e com uma postura cuidada.',
      'Estive sempre arranjado/a e ajudei um colega a corrigir-se.',
    ]),
  ],
};

/** As perguntas desta atitude: as do evento, num evento ou concurso; fora da
 *  cozinha, as que fazem sentido fora dela; senão as de sempre. */
export function perguntasDe(id: string, evento = false, ctx?: ContextoAula): [PerguntaAtitude, PerguntaAtitude] | undefined {
  if (evento && PERGUNTAS_EVENTO[id]) return PERGUNTAS_EVENTO[id];
  if (ctx && !ctx.cozinha && FORA_DA_COZINHA[id]) return FORA_DA_COZINHA[id];
  return PERGUNTAS_ATITUDES[id];
}

export function temPerguntas(id: string): boolean {
  return !!PERGUNTAS_ATITUDES[id];
}

/** Respondida: as duas perguntas têm resposta (uma resposta pode ser «não
 *  aconteceu», ou a pergunta não se fez nesta aula), e pelo menos uma conta. */
export function atitudeRespondida(id: string, r: (number | null | undefined)[] | undefined, evento = false): boolean {
  const ps = perguntasDe(id, evento);
  if (!ps || !r) return false;
  // Com uma «não aconteceu», a pergunta de substituição também tem de ter resposta.
  const precisaSub = r.slice(0, 2).some(x => x === NAO_ACONTECEU) && !!perguntaSubstituta(id, evento);
  return ps.every((p, i) => r[i] != null && (r[i]! >= 0 || r[i] === NAO_SE_APLICA || (r[i] === NAO_ACONTECEU && !!p.naoAconteceu)))
    && r.some(x => x != null && x >= 0) && (!precisaSub || (r[2] != null && r[2]! >= 0));
}

/** Nível 1-5 da atitude: a média das respostas que contam. As «não aconteceu» saem da conta. */
export function nivelDaAtitude(r: (number | null | undefined)[] | undefined): number | null {
  const contam = (r || []).filter((x): x is number => x != null && x >= 0);
  if (!contam.length) return null;
  return contam.reduce((s, i) => s + nivelDe20(NOTAS_FRASES[i]), 0) / contam.length;
}

/** O que o aluno respondeu, em texto — para o professor ver na validação. */
export function textoDasRespostas(id: string, r: (number | null | undefined)[] | undefined, evento = false, ctx?: ContextoAula): { pergunta: string; resposta: string }[] {
  const ps = perguntasDe(id, evento, ctx);
  if (!ps || !r) return [];
  const lista = ps.map((p, i) => ({
    pergunta: p.pergunta,
    resposta: r[i] === NAO_ACONTECEU ? `Não aconteceu: ${p.naoAconteceu}`
      : r[i] === NAO_SE_APLICA ? 'Não se perguntou: não fazia sentido nesta aula'
      : r[i] != null ? p.respostas[r[i]!] : 'Por responder',
  }));
  const sub = r[2] != null && r[2]! >= 0 ? perguntaSubstituta(id, evento) : null;
  if (sub) lista.push({ pergunta: '(em vez da que não aconteceu) ' + sub.pergunta, resposta: sub.respostas[r[2]!] });
  return lista;
}
