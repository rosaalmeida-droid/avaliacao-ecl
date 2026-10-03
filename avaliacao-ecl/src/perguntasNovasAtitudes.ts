// ============================================================
// Perguntas novas das atitudes (Rosa, out/2026): para o aluno não
// responder sempre às mesmas duas perguntas.
//
// Cada atitude passa a ter 4 pares de perguntas (o par de sempre, em
// perguntas_atitudes.ts, e mais 3 aqui). Em cada aula sai um par, à vez.
// O estilo é o mesmo: uma situação concreta de HOJE e 4 comportamentos
// fechados, do pior para o melhor. «Hoje não aconteceu» só na primeira
// pergunta de cada par; a segunda acontece sempre.
//
// AINDA NÃO ESTÃO LIGADAS À APLICAÇÃO: primeiro a Rosa lê e aprova.
// ============================================================
import type { PerguntaAtitude } from './perguntas_atitudes';
import type { Requisito } from './contextoAula';

type ComRequisitos = PerguntaAtitude & { requisitos?: Requisito[] };
/** P(pergunta, respostas, «não aconteceu»?, requisitos?) — ou P(pergunta, respostas, requisitos). */
const P = (pergunta: string, respostas: [string, string, string, string], nao?: string | Requisito[], req?: Requisito[]): ComRequisitos => {
  const naoAconteceu = typeof nao === 'string' ? nao : undefined;
  const requisitos = Array.isArray(nao) ? nao : req;
  return { pergunta, respostas, ...(naoAconteceu ? { naoAconteceu } : {}), ...(requisitos && requisitos.length ? { requisitos } : {}) };
};

export interface ParDePerguntas {
  perguntas: [PerguntaAtitude, PerguntaAtitude];
  /** O que cada pergunta precisa que a aula tenha (cozinha, produção, equipa, colegas). */
  requisitos: [Requisito[], Requisito[]];
}
const semReq = ({ requisitos: _r, ...p }: ComRequisitos): PerguntaAtitude => p;
const par = (a: ComRequisitos, b: ComRequisitos, ra: Requisito[] = [], rb: Requisito[] = []): ParDePerguntas =>
  ({ perguntas: [semReq(a), semReq(b)], requisitos: [a.requisitos || ra, b.requisitos || rb] });

export const PARES_NOVOS_ATITUDES: Record<string, ParDePerguntas[]> = {
  // ── 1.º ano ──────────────────────────────────────────────
  'ATI-001': [ // Responsabilidade pelas suas ações
    par(
      P('Hoje, quando estragaste ou partiste alguma coisa (um utensílio, um ingrediente, uma peça), o que fizeste?', [
        'Não disse nada e deixei ficar.',
        'Disse só quando alguém reparou.',
        'Avisei logo o professor.',
        'Avisei logo e ajudei a resolver ou a substituir.',
      ], 'Hoje não estraguei nem parti nada.'),
      P('Hoje, com o que combinaste com a tua equipa ou com o professor, o que fizeste?', [
        'Não fiz o que tinha combinado.',
        'Fiz só uma parte e não avisei.',
        'Fiz tudo o que tinha combinado.',
        'Fiz tudo e avisei quando acabei, para os outros poderem avançar.',
      ])),
    par(
      P('Hoje, quando o professor te chamou a atenção, o que fizeste?', [
        'Respondi mal ou dei uma desculpa.',
        'Ouvi, mas continuei a fazer igual.',
        'Ouvi e corrigi.',
        'Ouvi, corrigi e perguntei como fazer melhor da próxima vez.',
      ], 'Hoje o professor não me chamou a atenção.'),
      P('Hoje, no fim do teu trabalho, como deixaste o teu lugar?', [
        'Saí e deixei tudo para os outros.',
        'Arrumei só quando me mandaram.',
        'Arrumei e limpei o meu lugar sem ninguém pedir.',
        'Arrumei o meu lugar e confirmei que não faltava nada à equipa.',
      ], [], ['cozinha'])),
    par(
      P('Hoje, quando te enganaste numa quantidade, num tempo ou num passo, o que fizeste?', [
        'Continuei como se nada fosse.',
        'Reparei, mas não disse a ninguém.',
        'Disse ao professor e corrigi.',
        'Disse, corrigi e anotei para não me voltar a enganar.',
      ], 'Hoje não me enganei.'),
      P('Hoje, com a hora de começar o trabalho, como foi?', [
        'Comecei tarde e atrasei os outros.',
        'Comecei tarde, mas recuperei.',
        'Comecei à hora certa.',
        'Comecei à hora certa e já tinha tudo preparado.',
      ])),
  ],
  'ATI-003': [ // Cuidado com a apresentação pessoal
    par(
      P('Hoje, quando a tua farda se sujou durante o trabalho, o que fizeste?', [
        'Continuei assim, mesmo muito suja.',
        'Limpei por cima, à pressa.',
        'Troquei o avental ou o pano e limpei as mãos.',
        'Troquei logo e avisei o colega que também estava sujo.',
      ], 'Hoje a minha farda não se sujou.', ['cozinha']),
      P('Hoje, com as unhas, o cabelo e os adornos, como vieste?', [
        'Com unhas compridas ou pintadas, ou com anéis, brincos ou pulseiras.',
        'Quase bem, mas faltou um pormenor.',
        'Unhas curtas e limpas, cabelo preso, sem adornos.',
        'Tudo isto, e lembrei um colega que se esqueceu.',
      ])),
    par(
      P('Hoje, ao sair da cozinha (casa de banho, intervalo), o que fizeste à farda?', [
        'Saí com a farda e voltei sem lavar as mãos.',
        'Tirei o avental, mas esqueci-me de lavar as mãos ao voltar.',
        'Tirei o avental e lavei as mãos ao voltar.',
        'Tudo isto, e lembrei um colega de fazer o mesmo.',
      ], 'Hoje não saí da cozinha durante o trabalho.', ['cozinha']),
      P('Hoje, como estava o teu calçado?', [
        'Não era o calçado certo para a cozinha.',
        'Era o certo, mas estava sujo ou desapertado.',
        'Era o certo, limpo e bem calçado.',
        'Era o certo, limpo, e ajudei a lembrar quem não trazia.',
      ], [], ['cozinha'])),
    par(
      P('Hoje, quando falaste com alguém de fora (um cliente, um convidado, outro professor), como te apresentaste?', [
        'Despenteado ou com a farda desarrumada.',
        'Bem vestido, mas sem cuidado com a postura.',
        'Arranjado e com boa postura.',
        'Arranjado, com boa postura, e cumprimentei com simpatia.',
      ], 'Hoje não falei com ninguém de fora.'),
      P('Hoje, antes de entrar na cozinha, o que verificaste?', [
        'Não verifiquei nada.',
        'Verifiquei só a touca.',
        'Verifiquei a farda toda, o cabelo e as mãos.',
        'Verifiquei tudo e ajudei um colega a verificar.',
      ], [], ['cozinha'])),
  ],
  'ATI-005': [ // Autocontrolo
    par(
      P('Hoje, quando um colega te disse uma coisa que não gostaste, o que fizeste?', [
        'Respondi mal ou insultei.',
        'Fiquei calado, mas amuei o resto da aula.',
        'Respondi com calma.',
        'Respondi com calma e resolvemos a situação.',
      ], 'Hoje ninguém me disse nada que não gostasse.', ['colegas']),
      P('Hoje, quando tiveste de esperar (pelo fogão, por um utensílio, pela tua vez), o que fizeste?', [
        'Empurrei ou passei à frente.',
        'Esperei, mas a reclamar.',
        'Esperei com calma.',
        'Esperei com calma e aproveitei para adiantar outra coisa.',
      ])),
    par(
      P('Hoje, quando uma coisa te correu mal no prato, o que fizeste?', [
        'Atirei com as coisas ou disse asneiras.',
        'Fiquei muito irritado e desisti um bocado.',
        'Respirei e tentei outra vez.',
        'Respirei, tentei outra vez e ri-me do que aconteceu.',
      ], 'Hoje não me correu nada mal.'),
      P('Hoje, quando o professor te deu uma indicação, como reagiste?', [
        'Revirei os olhos ou respondi mal.',
        'Fiz, mas a reclamar.',
        'Fiz com calma.',
        'Fiz com calma e agradeci a ajuda.',
      ])),
    par(
      P('Hoje, quando houve muito barulho ou confusão na cozinha, o que fizeste?', [
        'Gritei também.',
        'Fiquei nervoso e enganei-me.',
        'Continuei concentrado no meu trabalho.',
        'Continuei concentrado e ajudei a acalmar.',
      ], 'Hoje não houve barulho nem confusão.'),
      P('Hoje, com o telemóvel durante o trabalho, como foi?', [
        'Usei-o várias vezes sem autorização.',
        'Usei-o uma vez sem autorização.',
        'Não o usei sem autorização.',
        'Não o usei e lembrei um colega de o guardar.',
      ])),
  ],
  'ATI-011': [ // Sentido de organização
    par(
      P('Hoje, antes de começar a cozinhar, o que fizeste?', [
        'Comecei logo, sem ver a ficha.',
        'Li a ficha à pressa.',
        'Li a ficha e separei os ingredientes e os utensílios.',
        'Li a ficha, separei tudo e combinei a ordem com a equipa.',
      ], 'Hoje não cozinhei.', ['producao']),
      P('Hoje, com o tempo da aula, como te organizaste?', [
        'Não acabei a tempo.',
        'Acabei, mas à pressa e mal.',
        'Acabei a tempo e bem.',
        'Acabei a tempo, bem, e sobrou tempo para arrumar com calma.',
      ])),
    par(
      P('Hoje, com a loiça suja enquanto trabalhavas, o que fizeste?', [
        'Deixei acumular até ao fim.',
        'Lavei só quando já não havia espaço.',
        'Fui lavando e arrumando enquanto trabalhava.',
        'Fui lavando, arrumando e ajudei outra bancada.',
      ], 'Hoje não usei loiça.', ['cozinha']),
      P('Hoje, com os teus apontamentos (ficha, caderno, registos), como ficaram?', [
        'Não registei nada.',
        'Registei só uma parte.',
        'Registei tudo o que era pedido.',
        'Registei tudo, de forma clara, e acrescentei o que aprendi.',
      ])),
    par(
      P('Hoje, quando faltou um ingrediente ou um utensílio, o que fizeste?', [
        'Fiquei parado à espera.',
        'Andei às voltas sem saber o que fazer.',
        'Pedi logo e adiantei outra tarefa.',
        'Pedi logo, adiantei outra tarefa e avisei a equipa.',
      ], 'Hoje não faltou nada.'),
      P('Hoje, no fim, como deixaste a câmara, a despensa ou os armários?', [
        'Guardei tudo misturado ou não guardei.',
        'Guardei, mas sem rótulo nem data.',
        'Guardei no sítio certo, com rótulo e data.',
        'Guardei tudo certo e verifiquei o que estava fora de prazo.',
      ], [], ['cozinha'])),
  ],
  'ATI-013': [ // Disponibilidade para aprender
    par(
      P('Hoje, quando não percebeste uma explicação, o que fizeste?', [
        'Fiquei calado e fiz como achei.',
        'Perguntei a um colega, mas fiquei com dúvidas.',
        'Perguntei ao professor até perceber.',
        'Perguntei até perceber e depois expliquei a quem também não percebeu.',
      ], 'Hoje percebi tudo à primeira.'),
      P('Hoje, enquanto o professor demonstrava, o que fizeste?', [
        'Estive distraído ou a falar.',
        'Vi, mas sem prestar muita atenção.',
        'Vi com atenção do princípio ao fim.',
        'Vi com atenção e tirei notas ou fiz perguntas.',
      ])),
    par(
      P('Hoje, quando te ensinaram uma técnica nova, o que fizeste?', [
        'Não quis experimentar.',
        'Experimentei uma vez e desisti.',
        'Experimentei até me sair razoável.',
        'Experimentei até me sair bem e pedi para me corrigirem.',
      ], 'Hoje não aprendi nenhuma técnica nova.'),
      P('Hoje, sobre a matéria da aula, o que fizeste?', [
        'Não li nada.',
        'Li à pressa.',
        'Li com atenção o que era pedido.',
        'Li com atenção e procurei saber mais.',
      ])),
    par(
      P('Hoje, quando um colega te mostrou uma maneira melhor de fazer, o que fizeste?', [
        'Não liguei.',
        'Ouvi, mas continuei à minha maneira.',
        'Experimentei a maneira dele.',
        'Experimentei e agradeci.',
      ], 'Hoje nenhum colega me mostrou nada.', ['colegas']),
      P('Hoje, no fim da aula, o que ficaste a saber?', [
        'Não sei dizer.',
        'Sei uma coisa, mas não sei explicar.',
        'Sei dizer o que aprendi.',
        'Sei dizer o que aprendi e onde o vou usar.',
      ])),
  ],
  'ATI-015': [ // Respeito pelas regras e normas definidas
    par(
      P('Hoje, quando o professor explicou uma regra nova, o que fizeste?', [
        'Não liguei.',
        'Cumpri só quando ele estava a ver.',
        'Cumpri sempre.',
        'Cumpri sempre e lembrei quem se esqueceu.',
      ], 'Hoje não houve regra nova.'),
      P('Hoje, com as horas de entrada e de intervalo, como foi?', [
        'Cheguei atrasado ou demorei no intervalo.',
        'Cheguei um pouco atrasado uma vez.',
        'Cumpri as horas.',
        'Cumpri as horas e estava pronto antes de começar.',
      ])),
    par(
      P('Hoje, quando um colega não cumpriu uma regra, o que fizeste?', [
        'Fiz o mesmo que ele.',
        'Não fiz nada.',
        'Lembrei-o da regra com calma.',
        'Lembrei-o e expliquei porque é importante.',
      ], 'Hoje toda a gente cumpriu as regras.', ['colegas']),
      P('Hoje, com o material da escola (utensílios, equipamento), como foi?', [
        'Usei mal ou levei sem pedir.',
        'Usei bem, mas não devolvi ao sítio.',
        'Usei bem e devolvi ao sítio.',
        'Usei bem, devolvi e avisei se alguma coisa estava estragada.',
      ])),
    par(
      P('Hoje, quando não concordaste com uma regra, o que fizeste?', [
        'Não a cumpri.',
        'Cumpri, mas a reclamar.',
        'Cumpri e perguntei porque existe.',
        'Cumpri, perguntei com respeito e percebi a razão.',
      ], 'Hoje concordei com todas as regras.'),
      P('Hoje, com as indicações da ficha técnica, como foi?', [
        'Fiz à minha maneira, sem seguir a ficha.',
        'Segui só uma parte.',
        'Segui a ficha.',
        'Segui a ficha e perguntei antes de mudar alguma coisa.',
      ], [], ['producao'])),
  ],
  'ATI-016': [ // Respeito pelas normas de higiene e segurança alimentar
    par(
      P('Hoje, quando passaste de um alimento cru para um cozinhado, o que fizeste?', [
        'Usei a mesma tábua e a mesma faca.',
        'Limpei por cima e continuei.',
        'Lavei ou troquei a tábua e a faca.',
        'Troquei e avisei um colega que estava a misturar.',
      ], 'Hoje não mexi em alimentos crus.', ['producao']),
      P('Hoje, com as temperaturas (frio e quente), o que fizeste?', [
        'Deixei alimentos fora do frio muito tempo.',
        'Guardei, mas tarde.',
        'Guardei logo no frio o que precisava de frio.',
        'Guardei logo e verifiquei a temperatura.',
      ], [], ['producao'])),
    par(
      P('Hoje, quando provaste a comida, como fizeste?', [
        'Provei com os dedos ou com a colher de mexer.',
        'Usei uma colher limpa, mas voltei a pô-la na panela.',
        'Usei uma colher limpa de cada vez.',
        'Usei uma colher limpa de cada vez e lembrei os colegas.',
      ], 'Hoje não provei comida.', ['producao']),
      P('Hoje, com os panos e as esponjas, como foi?', [
        'Usei o mesmo pano para tudo.',
        'Troquei só no fim.',
        'Usei panos diferentes para limpar e para secar.',
        'Usei panos diferentes e troquei quando ficaram sujos.',
      ], [], ['cozinha'])),
    par(
      P('Hoje, quando um alimento caiu ao chão ou estava estragado, o que fizeste?', [
        'Usei na mesma.',
        'Lavei e usei.',
        'Deitei fora e avisei.',
        'Deitei fora, avisei e registei o que aconteceu.',
      ], 'Hoje não caiu nem se estragou nada.', ['producao']),
      P('Hoje, antes de mexer em comida, o que fizeste às mãos?', [
        'Não as lavei.',
        'Passei-as só por água.',
        'Lavei-as com sabão e sequei bem.',
        'Lavei-as com sabão, sequei bem e voltei a lavar depois de mexer no lixo.',
      ], [], ['producao'])),
  ],
  'ATI-017': [ // Respeito pelas normas de segurança e saúde no trabalho
    par(
      P('Hoje, quando andaste com uma faca na mão, como fizeste?', [
        'Andei com a lâmina para a frente ou a falar com ela na mão.',
        'Andei com cuidado, mas sem avisar.',
        'Andei com a lâmina para baixo, junto ao corpo.',
        'Andei com a lâmina para baixo e avisei «faca!».',
      ], 'Hoje não andei com facas.', ['producao']),
      P('Hoje, com as panelas e tabuleiros quentes, como fizeste?', [
        'Peguei sem pegas ou sem avisar.',
        'Usei pegas, mas não avisei os colegas.',
        'Usei pegas e avisei «quente!».',
        'Usei pegas, avisei e deixei os cabos virados para dentro.',
      ], [], ['producao'])),
    par(
      P('Hoje, quando caiu água ou gordura no chão, o que fizeste?', [
        'Deixei estar.',
        'Avisei, mas não limpei.',
        'Limpei logo.',
        'Limpei logo e avisei os colegas para terem cuidado.',
      ], 'Hoje não caiu nada ao chão.', ['cozinha']),
      P('Hoje, com o teu corpo ao levantar pesos ou trabalhar de pé, como foi?', [
        'Levantei pesos com as costas dobradas.',
        'Às vezes esqueci-me da postura.',
        'Dobrei os joelhos e pedi ajuda nos pesos.',
        'Tive sempre cuidado e ajudei um colega com um peso.',
      ], [], ['cozinha'])),
    par(
      P('Hoje, quando usaste uma máquina (varinha, batedeira, fatiadora), como fizeste?', [
        'Usei sem saber bem como funcionava.',
        'Usei, mas meti a mão perto das lâminas.',
        'Usei como o professor ensinou.',
        'Usei como ensinado e desliguei da corrente para limpar.',
      ], 'Hoje não usei máquinas.', ['producao']),
      P('Hoje, com as passagens e saídas da cozinha, como foi?', [
        'Deixei caixas ou sacos no caminho.',
        'Deixei uma coisa no caminho e tirei depois.',
        'Deixei as passagens sempre livres.',
        'Deixei livres e tirei o que outros deixaram.',
      ], [], ['cozinha'])),
  ],
  // ── 2.º ano ──────────────────────────────────────────────
  'ATI-002': [ // Autonomia no âmbito das suas funções
    par(
      P('Hoje, quando acabaste a tua tarefa, o que fizeste?', [
        'Fiquei parado à espera que me dissessem.',
        'Perguntei o que fazer a seguir.',
        'Vi na ficha o que vinha a seguir e comecei.',
        'Vi o que vinha a seguir e ajudei também onde fazia falta.',
      ], 'Hoje não acabei a minha tarefa antes do tempo.'),
      P('Hoje, quanto precisaste do professor para fazer o teu trabalho?', [
        'Precisei dele a cada passo.',
        'Precisei dele várias vezes.',
        'Precisei só numa dúvida.',
        'Fiz sozinho e só lhe mostrei no fim.',
      ])),
    par(
      P('Hoje, quando tiveste uma dúvida, o que fizeste primeiro?', [
        'Fui logo perguntar.',
        'Perguntei a um colega sem pensar.',
        'Vi primeiro na ficha ou no caderno.',
        'Vi na ficha, tentei resolver e só depois confirmei.',
      ], 'Hoje não tive dúvidas.'),
      P('Hoje, com a tua parte do trabalho da equipa, como foi?', [
        'Fizeram por mim.',
        'Fiz com muita ajuda.',
        'Fiz a minha parte sozinho.',
        'Fiz a minha parte sozinho e confirmei que estava bem.',
      ], [], ['equipa'])),
    par(
      P('Hoje, quando faltou alguma coisa para a tua tarefa, o que fizeste?', [
        'Parei e esperei.',
        'Fui pedir sem saber bem o quê.',
        'Fui buscar ou pedi exatamente o que faltava.',
        'Resolvi e avisei a equipa para não lhes faltar também.',
      ], 'Hoje não faltou nada.'),
      P('Hoje, com o tempo de cada passo, como te organizaste?', [
        'Não pensei nos tempos.',
        'Pensei, mas atrasei-me.',
        'Cumpri os tempos que planeei.',
        'Cumpri os tempos e adiantei o passo seguinte.',
      ], [], ['producao'])),
  ],
  'ATI-007': [ // Empatia
    par(
      P('Hoje, quando um colega teve dificuldade numa técnica, o que fizeste?', [
        'Ri-me ou gozei.',
        'Não liguei.',
        'Perguntei se precisava de ajuda.',
        'Ajudei-o sem o deixar envergonhado.',
      ], 'Hoje nenhum colega teve dificuldade.', ['colegas']),
      P('Hoje, como falaste com os colegas?', [
        'Falei mal ou com desprezo.',
        'Falei bem com uns e mal com outros.',
        'Falei bem com todos.',
        'Falei bem com todos e incluí quem estava mais calado.',
      ], ['colegas'], ['colegas'])),
    par(
      P('Hoje, quando um colega estava triste ou cansado, o que fizeste?', [
        'Não reparei.',
        'Reparei, mas não fiz nada.',
        'Perguntei se estava bem.',
        'Perguntei e ajudei-o no que precisava.',
      ], 'Hoje não vi nenhum colega triste ou cansado.', ['colegas']),
      P('Hoje, pensaste em quem vai comer o que fizeste?', [
        'Não pensei nisso.',
        'Pensei, mas não mudou nada.',
        'Pensei e tive cuidado com o sabor e a apresentação.',
        'Pensei e perguntei se havia alergias ou gostos a ter em conta.',
      ], [], ['producao'])),
    par(
      P('Hoje, quando um colega se enganou à frente de todos, o que fizeste?', [
        'Comentei ou ri-me.',
        'Fiquei a olhar.',
        'Ajudei-o a corrigir em silêncio.',
        'Ajudei-o a corrigir e disse-lhe que acontece a todos.',
      ], 'Hoje ninguém se enganou à frente de todos.', ['colegas']),
      P('Hoje, com o trabalho das funcionárias e de quem limpa, como foi?', [
        'Deixei tudo sujo para elas.',
        'Deixei uma parte para elas.',
        'Deixei limpo o que era meu.',
        'Deixei limpo e agradeci a quem nos ajuda.',
      ], [], ['cozinha'])),
  ],
  'ATI-008': [ // Escuta ativa
    par(
      P('Hoje, quando um colega deu uma ideia, o que fizeste?', [
        'Interrompi ou não liguei.',
        'Ouvi, mas estava a pensar noutra coisa.',
        'Ouvi até ao fim.',
        'Ouvi até ao fim e fiz uma pergunta sobre a ideia.',
      ], 'Hoje nenhum colega deu ideias.', ['colegas']),
      P('Hoje, quando o professor falou para a turma, o que fizeste?', [
        'Falei por cima ou mexi no telemóvel.',
        'Ouvi só uma parte.',
        'Ouvi tudo, a olhar para ele.',
        'Ouvi tudo e repeti para mim o mais importante.',
      ])),
    par(
      P('Hoje, quando não concordaste com um colega, o que fizeste?', [
        'Interrompi para dizer que estava mal.',
        'Deixei falar, mas não ouvi.',
        'Ouvi até ao fim e depois dei a minha opinião.',
        'Ouvi, repeti o que ele disse para confirmar e só depois respondi.',
      ], 'Hoje não discordei de ninguém.', ['colegas']),
      P('Hoje, a seguir a uma explicação, conseguias repetir o que foi dito?', [
        'Não, não ouvi.',
        'Só uma parte.',
        'Sim, o principal.',
        'Sim, e expliquei a um colega.',
      ])),
    par(
      P('Hoje, quando alguém da equipa falou de um problema, o que fizeste?', [
        'Mudei de assunto.',
        'Ouvi, mas não respondi.',
        'Ouvi e perguntei mais.',
        'Ouvi, perguntei e ajudámos a resolver.',
      ], 'Hoje ninguém falou de problemas.', ['equipa']),
      P('Hoje, quando te deram uma indicação na cozinha («atrás!», «quente!», «faca!»), o que fizeste?', [
        'Não ouvi ou não liguei.',
        'Ouvi, mas reagi tarde.',
        'Ouvi e respondi logo.',
        'Ouvi, respondi «ouvido!» e passei a palavra a quem não ouviu.',
      ], [], ['cozinha'])),
  ],
  'ATI-009': [ // Cooperação com a equipa
    par(
      P('Hoje, quando um colega da equipa se atrasou, o que fizeste?', [
        'Deixei-o sozinho.',
        'Reclamei com ele.',
        'Ajudei-o quando acabei a minha parte.',
        'Ajudei-o e combinámos como recuperar o tempo.',
      ], 'Hoje ninguém da equipa se atrasou.', ['equipa']),
      P('Hoje, ao dividir as tarefas da equipa, o que fizeste?', [
        'Fiquei com a parte mais fácil.',
        'Aceitei o que me deram, sem dizer nada.',
        'Ajudei a dividir de forma justa.',
        'Ajudei a dividir de forma justa e fiquei com uma parte difícil.',
      ], ['equipa'], ['equipa'])),
    par(
      P('Hoje, quando a equipa tinha de decidir alguma coisa, o que fizeste?', [
        'Decidi sozinho.',
        'Não dei opinião.',
        'Dei a minha opinião e aceitei a decisão.',
        'Dei a opinião, ouvi os outros e ajudei a chegar a acordo.',
      ], 'Hoje a equipa não teve de decidir nada.', ['equipa']),
      P('Hoje, com o material partilhado, como foi?', [
        'Fiquei com o que precisava e não larguei.',
        'Partilhei só quando me pediram.',
        'Partilhei sem me pedirem.',
        'Partilhei e organizei para todos terem o que precisavam.',
      ], [], ['colegas'])),
    par(
      P('Hoje, quando a equipa teve um problema, o que fizeste?', [
        'Culpei alguém.',
        'Fiquei de fora.',
        'Ajudei a resolver.',
        'Ajudei a resolver e ninguém ficou culpado.',
      ], 'Hoje a equipa não teve problemas.', ['equipa']),
      P('Hoje, no fim, como acabou a equipa?', [
        'Saí quando acabei a minha parte.',
        'Ajudei só um bocadinho.',
        'Fiquei até a equipa acabar.',
        'Fiquei até ao fim e ajudei outra equipa.',
      ], [], ['equipa'])),
  ],
  'ATI-010': [ // Empenho e persistência na resolução de problemas
    par(
      P('Hoje, quando uma técnica não te saiu bem à primeira, o que fizeste?', [
        'Desisti.',
        'Pedi a outro para fazer por mim.',
        'Tentei outra vez.',
        'Tentei até sair bem e percebi o que estava a fazer mal.',
      ], 'Hoje tudo me saiu bem à primeira.'),
      P('Hoje, com as tarefas mais chatas (descascar, lavar, limpar), como foi?', [
        'Fugi delas.',
        'Fiz à pressa e mal.',
        'Fiz bem, até ao fim.',
        'Fiz bem, até ao fim, sem reclamar.',
      ])),
    par(
      P('Hoje, quando o prato não ficou como na ficha, o que fizeste?', [
        'Entreguei assim.',
        'Tentei disfarçar.',
        'Perguntei como corrigir e corrigi.',
        'Corrigi e anotei o que fazer diferente da próxima vez.',
      ], 'Hoje o prato ficou como na ficha.', ['producao']),
      P('Hoje, quanto tempo estiveste a trabalhar a sério?', [
        'Pouco: estive muito tempo parado.',
        'Metade da aula.',
        'Quase a aula toda.',
        'A aula toda, e ainda adiantei trabalho.',
      ])),
    par(
      P('Hoje, quando o professor te pediu para repetir, o que fizeste?', [
        'Recusei ou fiz pior.',
        'Repeti a reclamar.',
        'Repeti com atenção.',
        'Repeti com atenção e pedi para ver se estava melhor.',
      ], 'Hoje não tive de repetir nada.'),
      P('Hoje, quando estavas cansado, o que fizeste?', [
        'Parei.',
        'Abrandei muito.',
        'Continuei ao meu ritmo.',
        'Continuei e ainda animei a equipa.',
      ])),
  ],
  'ATI-012': [ // Flexibilidade e adaptabilidade
    par(
      P('Hoje, quando o professor mudou o plano a meio, o que fizeste?', [
        'Reclamei e continuei como estava.',
        'Mudei, mas a reclamar.',
        'Mudei sem problemas.',
        'Mudei e ajudei os colegas a mudar também.',
      ], 'Hoje o plano não mudou.'),
      P('Hoje, quando te deram uma tarefa que não querias, o que fizeste?', [
        'Recusei.',
        'Fiz mal, de propósito ou sem vontade.',
        'Fiz bem.',
        'Fiz bem e aprendi alguma coisa com ela.',
      ])),
    par(
      P('Hoje, quando tiveste de trabalhar com um colega que não escolheste, o que fizeste?', [
        'Recusei ou trabalhei sozinho.',
        'Trabalhei, mas a falar pouco.',
        'Trabalhei bem com ele.',
        'Trabalhei bem e conheci-o melhor.',
      ], 'Hoje escolhi com quem trabalhei.', ['colegas']),
      P('Hoje, quando alguém fez de maneira diferente da tua, o que fizeste?', [
        'Disse que estava mal.',
        'Fiquei incomodado.',
        'Aceitei que há várias maneiras.',
        'Aceitei e experimentei a maneira dele.',
      ], [], ['colegas'])),
    par(
      P('Hoje, quando faltou um ingrediente e foi preciso trocar, o que fizeste?', [
        'Não quis fazer.',
        'Fiz, mas mal.',
        'Troquei como o professor sugeriu.',
        'Troquei e sugeri uma ideia que resultou.',
      ], 'Hoje não foi preciso trocar nada.', ['producao']),
      P('Hoje, com uma função nova (líder, passar a palavra, arrumar), como foi?', [
        'Não quis.',
        'Fiz pouco.',
        'Fiz o que era pedido.',
        'Fiz e ajudei a equipa a funcionar melhor.',
      ])),
  ],
  'ATI-018': [ // Respeito pela sensibilidade e bem-estar dos outros
    par(
      P('Hoje, quando fizeste uma piada, como foi?', [
        'Gozei com alguém.',
        'Fiz uma piada que pode ter ofendido.',
        'Fiz piadas sem ofender ninguém.',
        'Fiz piadas sem ofender e parei quando vi que alguém não gostou.',
      ], 'Hoje não fiz piadas.', ['colegas']),
      P('Hoje, com o espaço dos outros na cozinha, como foi?', [
        'Empurrei ou ocupei o espaço dos outros.',
        'Às vezes passei sem pedir licença.',
        'Pedi licença e respeitei o espaço.',
        'Respeitei e ajudei a arrumar o espaço comum.',
      ], [], ['cozinha'])),
    par(
      P('Hoje, quando um colega estava a ser posto de parte, o que fizeste?', [
        'Juntei-me a quem o pôs de parte.',
        'Não fiz nada.',
        'Falei com ele.',
        'Falei com ele e chamei-o para o meu grupo.',
      ], 'Hoje ninguém foi posto de parte.', ['colegas']),
      P('Hoje, com o barulho que fizeste, como foi?', [
        'Fiz muito barulho e incomodei.',
        'Às vezes falei alto demais.',
        'Falei num tom normal.',
        'Falei num tom normal e ajudei a baixar o barulho.',
      ])),
    par(
      P('Hoje, quando alguém te pediu para parar com alguma coisa, o que fizeste?', [
        'Continuei.',
        'Parei, mas a reclamar.',
        'Parei logo.',
        'Parei e pedi desculpa.',
      ], 'Hoje ninguém me pediu para parar.', ['colegas']),
      P('Hoje, com as coisas dos colegas (mochila, telemóvel, material), como foi?', [
        'Mexi sem pedir.',
        'Mexi uma vez sem pedir.',
        'Pedi sempre antes de mexer.',
        'Pedi sempre e devolvi como estava.',
      ])),
  ],
  'ATI-022': [ // Respeito pelas diferenças individuais
    par(
      P('Hoje, quando um colega tinha uma opinião ou um gosto diferente do teu, o que fizeste?', [
        'Gozei ou disse que estava errado.',
        'Ignorei.',
        'Respeitei.',
        'Respeitei e quis saber mais.',
      ], 'Hoje não houve opiniões diferentes.', ['colegas']),
      P('Hoje, com colegas de outras culturas, religiões ou línguas, como foi?', [
        'Fiz comentários ou piadas.',
        'Afastei-me.',
        'Trabalhei com eles como com os outros.',
        'Trabalhei com eles e aprendi alguma coisa da cultura deles.',
      ], ['colegas'], ['colegas'])),
    par(
      P('Hoje, quando um colega precisou de mais tempo ou de outra maneira de aprender, o que fizeste?', [
        'Reclamei ou gozei.',
        'Fiquei impaciente.',
        'Esperei com paciência.',
        'Esperei e ajudei à maneira dele.',
      ], 'Hoje ninguém precisou de mais tempo.', ['colegas']),
      P('Hoje, pensaste em quem tem alergias ou não come certos alimentos?', [
        'Não pensei nisso.',
        'Pensei, mas não fiz nada.',
        'Tive cuidado com os ingredientes.',
        'Tive cuidado e perguntei para confirmar.',
      ], [], ['producao'])),
    par(
      P('Hoje, quando alguém falou do seu país ou da sua família, o que fizeste?', [
        'Fiz comentários negativos.',
        'Não liguei.',
        'Ouvi com respeito.',
        'Ouvi com respeito e fiz perguntas.',
      ], 'Hoje ninguém falou disso.', ['colegas']),
      P('Hoje, ao formar grupos, como foi?', [
        'Recusei ficar com alguém.',
        'Fiquei, mas contrariado.',
        'Aceitei bem o grupo.',
        'Aceitei bem e ajudei quem ficou sem grupo.',
      ], [], ['colegas'])),
  ],
  // ── 3.º ano ──────────────────────────────────────────────
  'ATI-004': [ // Iniciativa
    par(
      P('Hoje, quando viste uma coisa que precisava de ser feita e não era tua, o que fizeste?', [
        'Não fiz, não era minha.',
        'Fiz só quando me pediram.',
        'Fiz sem me pedirem.',
        'Fiz sem me pedirem e avisei a equipa.',
      ], 'Hoje não vi nada para fazer.'),
      P('Hoje, quando a aula acabou mais cedo para ti, o que fizeste?', [
        'Fiquei parado ou no telemóvel.',
        'Fui conversar.',
        'Ajudei uma equipa.',
        'Ajudei e pedi ao professor uma tarefa extra.',
      ])),
    par(
      P('Hoje, deste alguma ideia à equipa ou ao professor?', [
        'Não.',
        'Tive, mas não disse.',
        'Disse uma ideia.',
        'Disse uma ideia e ajudei a pô-la em prática.',
      ], 'Hoje não tive nenhuma ideia.'),
      P('Hoje, antes de o professor pedir, o que preparaste?', [
        'Nada.',
        'Uma coisa pequena.',
        'O material para começar.',
        'O material para começar e o do passo seguinte.',
      ])),
    par(
      P('Hoje, quando o professor perguntou quem queria fazer uma tarefa, o que fizeste?', [
        'Escondi-me.',
        'Esperei que outro fosse.',
        'Ofereci-me.',
        'Ofereci-me logo e fiz bem.',
      ], 'Hoje o professor não pediu voluntários.'),
      P('Hoje, quando viste um colega sem saber o que fazer, o que fizeste?', [
        'Nada.',
        'Disse-lhe para perguntar ao professor.',
        'Expliquei-lhe o que fazer.',
        'Expliquei e fiz com ele o primeiro passo.',
      ], [], ['colegas'])),
  ],
  'ATI-006': [ // Assertividade
    par(
      P('Hoje, quando discordaste de uma decisão, o que fizeste?', [
        'Fiquei calado e chateado.',
        'Reclamei com os colegas, mas não disse a quem decidiu.',
        'Disse a minha opinião com calma.',
        'Disse a minha opinião com calma e expliquei porquê.',
      ], 'Hoje não discordei de nenhuma decisão.'),
      P('Hoje, quando precisaste de alguma coisa, como pediste?', [
        'Gritei ou exigi.',
        'Não pedi e fiquei sem.',
        'Pedi com clareza e educação.',
        'Pedi com clareza, educação e agradeci.',
      ])),
    par(
      P('Hoje, quando um colega fez uma coisa que te prejudicou, o que fizeste?', [
        'Respondi mal ou vinguei-me.',
        'Não disse nada e fiquei a remoer.',
        'Disse-lhe com calma o que me incomodou.',
        'Disse-lhe com calma e combinámos como fazer.',
      ], 'Hoje ninguém me prejudicou.', ['colegas']),
      P('Hoje, quando tiveste de dizer «não» a um pedido, como fizeste?', [
        'Disse que sim, mesmo sem querer.',
        'Disse que não de forma bruta.',
        'Disse que não com educação.',
        'Disse que não com educação e sugeri outra solução.',
      ])),
    par(
      P('Hoje, quando a equipa estava a fazer uma coisa errada, o que fizeste?', [
        'Deixei fazer.',
        'Disse, mas de forma agressiva.',
        'Disse com calma o que estava errado.',
        'Disse com calma e propus como fazer certo.',
      ], 'Hoje a equipa não fez nada errado.', ['equipa']),
      P('Hoje, quando falaste para a turma ou para o professor, como foi?', [
        'Não falei, mesmo tendo coisas a dizer.',
        'Falei baixinho ou a medo.',
        'Falei de forma clara.',
        'Falei de forma clara e olhei para quem me ouvia.',
      ])),
  ],
  'ATI-014': [ // Respeito pelos princípios da sustentabilidade
    par(
      P('Hoje, com as sobras e os aparos, o que fizeste?', [
        'Deitei tudo fora.',
        'Guardei uma parte.',
        'Aproveitei o que se podia aproveitar.',
        'Aproveitei e sugeri uma receita para usar as sobras.',
      ], 'Hoje não houve sobras nem aparos.', ['producao']),
      P('Hoje, com a água e a luz, como foi?', [
        'Deixei torneiras abertas ou luzes acesas sem precisar.',
        'Às vezes deixei.',
        'Fechei sempre.',
        'Fechei sempre e fechei também as que outros deixaram.',
      ])),
    par(
      P('Hoje, com o lixo, como separaste?', [
        'Pus tudo no mesmo saco.',
        'Separei uma parte.',
        'Separei tudo corretamente.',
        'Separei tudo e corrigi o que estava no sítio errado.',
      ], 'Hoje não fiz lixo.', ['cozinha']),
      P('Hoje, com os descartáveis (película, papel, luvas), como foi?', [
        'Usei muito mais do que precisava.',
        'Usei um bocado a mais.',
        'Usei só o necessário.',
        'Usei só o necessário e reutilizei o que podia.',
      ], [], ['cozinha'])),
    par(
      P('Hoje, quando escolheste ingredientes, pensaste na época ou na origem?', [
        'Não pensei.',
        'Pensei, mas não fez diferença.',
        'Preferi os da época ou de cá.',
        'Preferi os da época e expliquei porquê.',
      ], 'Hoje não escolhi ingredientes.', ['producao']),
      P('Hoje, com as quantidades, como foi?', [
        'Fiz muito mais do que era preciso.',
        'Fiz um bocado a mais.',
        'Fiz a quantidade certa.',
        'Fiz a quantidade certa e pesei tudo antes.',
      ], [], ['producao'])),
  ],
  'ATI-019': [ // Autoconfiança
    par(
      P('Hoje, quando te pediram para fazer uma coisa nova, o que fizeste?', [
        'Disse que não era capaz.',
        'Fiz, mas com muito medo de errar.',
        'Fiz com calma.',
        'Fiz com calma e fiquei contente com o resultado.',
      ], 'Hoje não me pediram nada novo.'),
      P('Hoje, quando apresentaste o teu prato ou o teu trabalho, como foi?', [
        'Não quis apresentar.',
        'Apresentei a medo.',
        'Apresentei com segurança.',
        'Apresentei com segurança e expliquei o que fiz.',
      ])),
    par(
      P('Hoje, quando te enganaste, o que pensaste?', [
        'Que não presto para isto.',
        'Fiquei em baixo o resto da aula.',
        'Que acontece e continuei.',
        'Que acontece, aprendi e continuei com confiança.',
      ], 'Hoje não me enganei.'),
      P('Hoje, quando tiveste uma opinião, o que fizeste?', [
        'Guardei-a para mim.',
        'Disse só a um amigo.',
        'Disse-a à equipa.',
        'Disse-a à equipa e defendi-a com calma.',
      ])),
    par(
      P('Hoje, quando alguém criticou o teu trabalho, o que fizeste?', [
        'Fiquei magoado e desisti.',
        'Fiquei calado e chateado.',
        'Ouvi e pensei no que podia melhorar.',
        'Ouvi, agradeci e melhorei.',
      ], 'Hoje ninguém criticou o meu trabalho.'),
      P('Hoje, numa tarefa difícil, o que fizeste?', [
        'Pedi a outro para fazer.',
        'Fiz, mas sempre a pedir ajuda.',
        'Fiz sozinho, com atenção.',
        'Fiz sozinho e ofereci-me para a próxima também.',
      ])),
  ],
  'ATI-020': [ // Postura profissional
    par(
      P('Hoje, quando alguém de fora entrou na cozinha (cliente, visita, outro professor), como estiveste?', [
        'Continuei a brincar ou a falar alto.',
        'Parei, mas não cumprimentei.',
        'Cumprimentei e continuei a trabalhar.',
        'Cumprimentei, continuei a trabalhar e respondi com simpatia.',
      ], 'Hoje não entrou ninguém de fora.'),
      P('Hoje, como foi a tua linguagem na cozinha?', [
        'Disse asneiras ou palavrões.',
        'Disse uma asneira.',
        'Falei sempre bem.',
        'Falei sempre bem e usei os nomes certos das técnicas.',
      ])),
    par(
      P('Hoje, quando cometeste um erro diante de alguém, como reagiste?', [
        'Fiz uma cena ou escondi.',
        'Fiquei atrapalhado.',
        'Assumi e corrigi com calma.',
        'Assumi, corrigi com calma e continuei com profissionalismo.',
      ], 'Hoje não cometi erros diante de ninguém.'),
      P('Hoje, como estiveste no teu posto de trabalho?', [
        'Encostado, sentado ou a passear.',
        'Às vezes distraído.',
        'Concentrado no trabalho.',
        'Concentrado e pronto a ajudar quando era preciso.',
      ], [], ['cozinha'])),
    par(
      P('Hoje, quando recebeste uma ordem («sai!», «ouvido!»), como respondeste?', [
        'Não respondi.',
        'Respondi, mas tarde.',
        'Respondi logo como se faz numa cozinha.',
        'Respondi logo e cumpri a ordem a tempo.',
      ], 'Hoje não recebi ordens desse género.', ['cozinha']),
      P('Hoje, com a pontualidade e a apresentação, como foi?', [
        'Cheguei tarde ou mal apresentado.',
        'Uma das duas falhou.',
        'Cheguei a horas e bem apresentado.',
        'Cheguei antes da hora, bem apresentado e pronto a começar.',
      ])),
  ],
  'ATI-021': [ // Sentido crítico
    par(
      P('Hoje, quando acabaste o prato, o que fizeste antes de o entregar?', [
        'Entreguei sem ver.',
        'Vi por alto.',
        'Provei e vi se estava como na ficha.',
        'Provei, comparei com a ficha e corrigi o que faltava.',
      ], 'Hoje não fiz nenhum prato.', ['producao']),
      P('Hoje, sobre o teu trabalho, consegues dizer o que correu bem e o que correu mal?', [
        'Não sei dizer.',
        'Sei dizer só o que correu bem.',
        'Sei dizer o que correu bem e o que correu mal.',
        'Sei dizer as duas coisas e o que vou mudar.',
      ])),
    par(
      P('Hoje, quando viste uma informação (na internet, num vídeo, de um colega), o que fizeste?', [
        'Acreditei logo.',
        'Desconfiei, mas não confirmei.',
        'Confirmei com o professor ou o manual.',
        'Confirmei e expliquei aos colegas o que estava certo.',
      ], 'Hoje não procurei informação.'),
      P('Hoje, comparaste o teu trabalho com o de outra equipa?', [
        'Não.',
        'Sim, mas só para criticar.',
        'Sim, e vi o que podia aprender.',
        'Sim, aprendi e disse-lhes o que tinham feito bem.',
      ], [], ['colegas'])),
    par(
      P('Hoje, quando provaste o trabalho de um colega, o que lhe disseste?', [
        'Disse só que estava mau.',
        'Disse só que estava bom, sem pensar.',
        'Disse o que estava bem e o que podia melhorar.',
        'Disse o que estava bem, o que melhorar e como.',
      ], 'Hoje não provei o trabalho de ninguém.', ['producao']),
      P('Hoje, perante uma regra ou uma receita, perguntaste porque se faz assim?', [
        'Não, nunca pergunto.',
        'Pensei nisso, mas não perguntei.',
        'Perguntei.',
        'Perguntei e percebi a razão.',
      ])),
  ],
};
