// ============================================================
// Definições das subtécnicas em linguagem de aluno.
//
// As que vinham nos dados eram circulares: "Variante profissional de
// cozer em líquido: Cozer massa al dente." Repetem o nome em vez de o
// explicarem, e 287 das 452 estavam assim.
//
// REGRAS:
//  1. Nunca repetir o nome dentro da definição.
//  2. Descrever a AÇÃO do aluno — o que ele faz, não o que a técnica é.
//  3. Sem matéria-prima: o produto vem da ficha técnica. "Corte
//     transversal ao produto" serve para cenoura e chouriço.
//  4. Sem medidas nem temperaturas fixas: vêm da ficha.
//  5. Resultado observável — o aluno olha e vê se está bem.
//  6. Termo francês ou técnico explica-se na primeira vez.
// ============================================================

export interface DefinicaoSub {
  definicao: string;
  resultado: string;
}

export const DEFINICOES_SUBTECNICAS: Record<string, DefinicaoSub> = {

  // ── Cortar ──────────────────────────────────────────────────
  'SUB-COR-030-001': { definicao: 'Cortas em tiras compridas e muito finas, todas com a mesma largura.', resultado: 'Tiras direitas, finas e iguais entre si.' },
  'SUB-COR-030-002': { definicao: 'Cortas primeiro em tiras finas e depois atravessas, ficando dados muito pequenos.', resultado: 'Cubos minúsculos, todos do mesmo tamanho e com arestas definidas.' },
  'SUB-COR-030-003': { definicao: 'Cortas em pedaços irregulares mas do mesmo tamanho, para dar sabor a fundos e molhos.', resultado: 'Pedaços de tamanho parecido; a forma não interessa, o tamanho sim.' },
  'SUB-COR-030-004': { definicao: 'Cortas em quadrados finos e chatos, como pequenas telhas.', resultado: 'Quadrados planos, da mesma espessura e largura.' },
  'SUB-COR-030-005': { definicao: 'Enrolas as folhas umas dentro das outras e cortas atravessado, ficando fitas finas.', resultado: 'Fitas soltas e finas, sem folhas esmagadas nem escurecidas.' },
  'SUB-COR-030-006': { definicao: 'Cortas em palitos mais grossos do que a juliana, todos do mesmo comprimento.', resultado: 'Palitos direitos, com a mesma secção e o mesmo comprimento.' },
  'SUB-COR-030-007': { definicao: 'Cortas em palitos curtos e regulares, para guarnição.', resultado: 'Palitos curtos e iguais, sem pontas partidas.' },
  'SUB-COR-030-008': { definicao: 'Cortas em cubos pequenos e regulares, para guarnição ou salada.', resultado: 'Cubos iguais, com arestas direitas.' },
  'SUB-COR-030-009': { definicao: 'Cortas atravessado ao produto, mantendo a mesma espessura do princípio ao fim.', resultado: 'Todas as fatias com a mesma espessura e o corte perpendicular.' },
  'SUB-COR-030-010': { definicao: 'Cortas ao meio no sentido do comprimento e depois atravessado, ficando meios círculos.', resultado: 'Meias-luas iguais, com a espessura constante.' },
  'SUB-COR-030-011': { definicao: 'Cortas em fatias que seguem as divisões naturais do produto, do centro para fora.', resultado: 'Gomos inteiros e do mesmo tamanho, sem se desfazerem.' },
  'SUB-COR-030-012': { definicao: 'Cortas em dados pequenos, mantendo todos com a mesma medida nos três lados.', resultado: 'Cubos pequenos e iguais, com faces planas.' },
  'SUB-COR-030-013': { definicao: 'Cortas em dados médios, com os três lados iguais entre si.', resultado: 'Cubos médios e regulares, sem pedaços tortos.' },
  'SUB-COR-030-014': { definicao: 'Cortas em dados grandes, mantendo a forma cúbica.', resultado: 'Cubos grandes e uniformes, que cozinham ao mesmo tempo.' },
  'SUB-COR-030-015': { definicao: 'Cortas em tiras estreitas e compridas, mais finas do que as médias.', resultado: 'Tiras finas e todas com a mesma largura.' },
  'SUB-COR-030-016': { definicao: 'Cortas em tiras de largura intermédia, todas iguais.', resultado: 'Tiras regulares, sem umas mais largas do que outras.' },
  'SUB-COR-030-017': { definicao: 'Cortas em folhas muito finas, quase transparentes, com faca ou mandolina.', resultado: 'Lâminas inteiras e finas, que deixam passar a luz.' },
  'SUB-COR-030-018': { definicao: 'Cortas em folhas de espessura visível, mas ainda planas e regulares.', resultado: 'Lâminas da mesma espessura, sem partes grossas.' },
  'SUB-COR-030-019': { definicao: 'Tiras a pele e as sementes e cortas a polpa em cubos pequenos.', resultado: 'Só polpa em cubos, sem pele, sementes nem água a escorrer.' },
  'SUB-COR-030-020': { definicao: 'Cortas em pedaços muito pequenos com a ponta da faca, sem esmagar para não amargar.', resultado: 'Pedaços pequenos e soltos, sem pasta nem líquido no fundo.' },
  'SUB-COR-030-021': { definicao: 'Cortas fatias na diagonal, para ficarem mais largas e mais finas.', resultado: 'Fatias largas, planas e da mesma espessura.' },
  'SUB-COR-030-022': { definicao: 'Cortas em fatias redondas e espessas, tiradas da parte mais larga da peça.', resultado: 'Peças redondas, altas e iguais entre si.' },
  'SUB-COR-030-023': { definicao: 'Tiras os gomos do citrino sem pele nem película, só com a polpa.', resultado: 'Gomos limpos e inteiros, sem pele branca agarrada.' },
  'SUB-COR-030-024': { definicao: 'Abres a peça em folha fina, recheias e enrolas, prendendo para não abrir.', resultado: 'Rolo firme e fechado, com o recheio dentro e sem sair.' },
  'SUB-COR-030-025': { definicao: 'Cortas atravessando as fibras da carne, para ficar mais tenra na boca.', resultado: 'Fibras curtas visíveis no corte, não compridas.' },
  'SUB-COR-030-026': { definicao: 'Cortas à frente do cliente ou para empratar, com o tamanho e o ângulo certos para a apresentação.', resultado: 'Fatias regulares e apresentáveis, sem esmagar nem desfiar.' },

  // ── Cozer em líquido ────────────────────────────────────────
  'SUB-CHU-041-001': { definicao: 'Metes o produto no líquido ainda frio e aqueces os dois juntos, para o sabor sair para a água.', resultado: 'Líquido com sabor e produto sem estar rijo por fora.' },
  'SUB-CHU-041-002': { definicao: 'Esperas que o líquido esteja a ferver e só depois mergulhas o produto, para o sabor ficar dentro dele.', resultado: 'Produto com sabor mantido e líquido pouco alterado.' },
  'SUB-CHU-041-003': { definicao: 'Mantens o líquido a fervilhar de leve, com bolhas pequenas e sem agitação.', resultado: 'Superfície com movimento ligeiro e produto inteiro.' },
  'SUB-CHU-041-004': { definicao: 'Regulas o lume para manter a fervura sempre no mesmo ponto durante toda a cozedura.', resultado: 'Fervura constante do princípio ao fim, sem subidas nem paragens.' },
  'SUB-CHU-041-005': { definicao: 'Deixas ferver com força e muitas bolhas, quando o produto precisa de calor forte.', resultado: 'Fervura viva e produto cozido no tempo previsto.' },
  'SUB-CHU-041-006': { definicao: 'Usas só o líquido que o produto vai absorver, sem escorrer no fim.', resultado: 'Líquido todo absorvido e produto cozido, sem sobras no tacho.' },
  'SUB-CHU-041-007': { definicao: 'Paras a cozedura antes do fim, quando ainda há resistência no centro. Al dente quer dizer "ao dente" em italiano.', resultado: 'Ao trincar cede, mas o centro mantém-se firme e vê-se um ponto mais claro.' },
  'SUB-CHU-041-008': { definicao: 'Cozes sem mexer, para os grãos não libertarem amido e ficarem separados.', resultado: 'Grãos inteiros e soltos, sem se agarrarem uns aos outros.' },
  'SUB-CHU-041-009': { definicao: 'Juntas o líquido aos poucos e mexes sempre, para o amido sair e ligar o conjunto.', resultado: 'Textura cremosa que escorre devagar, com o grão ainda inteiro.' },
  'SUB-CHU-041-010': { definicao: 'Depois de estarem de molho, cozes em água nova e sem sal no início, para não endurecerem a pele.', resultado: 'Interior macio e pele inteira, sem se desfazerem.' },
  'SUB-CHU-041-011': { definicao: 'Cozes até estar muito macio, para poder ser esmagado sem grumos.', resultado: 'Cede sem resistência ao espeto e desfaz-se com facilidade.' },
  'SUB-CHU-041-012': { definicao: 'Paras a cozedura enquanto ainda aguenta ser cortado sem se desfazer.', resultado: 'Firme ao corte, com forma mantida e sem estar cru no centro.' },
  'SUB-CHU-041-013': { definicao: 'Cozes por pouco tempo em líquido bem temperado, porque a carne endurece se passar do ponto.', resultado: 'Carne firme mas ainda tenra, e casca com cor viva.' },
  'SUB-CHU-041-014': { definicao: 'Aqueces até as conchas abrirem e retiras logo, para não secarem.', resultado: 'Conchas abertas e carne tenra; as que não abriram vão fora.' },
  'SUB-CHU-041-015': { definicao: 'Controlas o tempo desde que a água ferve, porque cada ponto tem o seu tempo exato.', resultado: 'Gema no ponto pedido e clara firme, sem anel esverdeado à volta.' },
  'SUB-CHU-041-016': { definicao: 'Cozes devagar e muito tempo, escumando, para extrair sabor sem turvar.', resultado: 'Líquido saboroso e límpido, sem gordura à superfície.' },

  // ── Ligar ───────────────────────────────────────────────────
  'SUB-MOL-067-001': { definicao: 'Cozinhas farinha em gordura só até perder o cheiro a cru, sem ganhar cor.', resultado: 'Mistura pálida e com aspeto de areia molhada, sem cor.' },
  'SUB-MOL-067-002': { definicao: 'Cozinhas farinha em gordura até ganhar cor de avelã e aroma tostado.', resultado: 'Cor dourada uniforme e cheiro a frutos secos tostados.' },
  'SUB-MOL-067-003': { definicao: 'Cozinhas farinha em gordura durante muito tempo, até ficar castanha e com aroma forte.', resultado: 'Cor castanha e aroma intenso, sem cheiro a queimado.' },
  'SUB-MOL-067-004': { definicao: 'Amassas manteiga com farinha em cru e juntas em pedaços ao líquido quente no fim.', resultado: 'Molho espessa logo, sem grumos nem sabor a farinha crua.' },
  'SUB-MOL-067-005': { definicao: 'Dissolves o amido em líquido frio antes de o juntar ao quente, para não empelotar.', resultado: 'Mistura lisa e sem grumos ao entrar no líquido quente.' },
  'SUB-MOL-067-006': { definicao: 'Misturas a fécula com um pouco de líquido frio e juntas em fio, mexendo sempre.', resultado: 'Ligação transparente e brilhante, sem grumos.' },
  'SUB-MOL-067-007': { definicao: 'Juntas um pouco de líquido quente à gema antes de a devolver ao tacho, para não cozer de repente.', resultado: 'Molho aveludado e sem grãos de ovo cozido.' },
  'SUB-MOL-067-008': { definicao: 'Juntas natas e deixas apurar, ganhando corpo pela gordura e pela evaporação.', resultado: 'Molho encorpado e liso, sem separar.' },
  'SUB-MOL-067-009': { definicao: 'Juntas sangue fora do lume e não deixas ferver, senão talha.', resultado: 'Molho escuro, ligado e liso, sem grãos.' },
  'SUB-MOL-067-010': { definicao: 'Deixas evaporar água até o próprio líquido ganhar corpo, sem juntar nada.', resultado: 'Molho que cobre as costas da colher, sem espessante adicionado.' },
  'SUB-MOL-067-011': { definicao: 'Trituras legumes já cozidos e juntas ao líquido, dando corpo sem farinha.', resultado: 'Textura aveludada e cor do próprio legume.' },
  'SUB-MOL-067-012': { definicao: 'Juntas miolo de pão demolhado e trituras, para dar corpo à preparação.', resultado: 'Textura espessa e homogénea, sem pedaços de pão.' },
  'SUB-MOL-067-013': { definicao: 'Cozes arroz no próprio líquido e trituras, aproveitando o amido para ligar.', resultado: 'Creme liso e encorpado, sem grãos por desfazer.' },
  'SUB-MOL-067-014': { definicao: 'Aqueces mexendo sempre até o amido inchar e o creme espessar de vez.', resultado: 'Creme espesso que deixa risco no fundo do tacho ao mexer.' },
  'SUB-MOL-067-015': { definicao: 'Juntas fundo claro ao roux branco aos poucos, mexendo para não empelotar.', resultado: 'Molho liso, claro e da espessura pedida.' },
  'SUB-MOL-067-016': { definicao: 'Juntas leite quente ao roux branco em fio, mexendo sempre até espessar.', resultado: 'Molho branco, liso e sem grumos nem sabor a farinha.' },

  // ── Assar ───────────────────────────────────────────────────
  'SUB-CSE-047-001': { definicao: 'Coras primeiro por fora em lume forte e depois levas ao forno, controlando o ponto pelo toque ou termómetro.', resultado: 'Crosta corada por fora, interior no ponto pedido e sucos redistribuídos após repouso.' },
  'SUB-CSE-047-002': { definicao: 'Assas devagar até a carne ceder, porque esta peça tem mais tecido a desfazer do que a bovina.', resultado: 'Carne macia que se separa com o garfo e exterior corado.' },
  'SUB-CSE-047-003': { definicao: 'Atas as pernas e as asas para a peça manter a forma e cozinhar por igual, e regas durante o tempo no forno.', resultado: 'Pele corada por igual e suco a sair claro ao picar a coxa.' },
  'SUB-CSE-047-004': { definicao: 'Assas as peças separadas, dando mais tempo às que têm osso e menos às mais finas.', resultado: 'Todas as peças no ponto ao mesmo tempo, sem umas secas e outras cruas.' },
  'SUB-CSE-047-005': { definicao: 'Assas com aromáticos e regas com o próprio suco, porque esta carne seca depressa.', resultado: 'Interior rosado ou no ponto pedido, sem estar seco.' },
  'SUB-CSE-047-006': { definicao: 'Golpeias a pele para o calor entrar por igual e assas sem virar mais do que uma vez.', resultado: 'Pele estaladiça, carne solta em lascas e espinha que sai limpa.' },
  'SUB-CSE-047-007': { definicao: 'Assas por pouco tempo e em calor alto, porque a peça é fina e seca depressa.', resultado: 'Carne opaca e ainda húmida, sem estar desfeita.' },
  'SUB-CSE-047-008': { definicao: 'Espalhas numa camada só e não sobrepões, para o vapor sair e os produtos corarem.', resultado: 'Bordos corados e centro macio, sem estarem cozidos em água própria.' },
  'SUB-CSE-047-009': { definicao: 'Cortas em pedaços do mesmo tamanho e dás tempo suficiente para o interior cozer antes de a superfície queimar.', resultado: 'Exterior corado e interior macio até ao centro.' },
  'SUB-CSE-047-010': { definicao: 'Assas em calor moderado e constante, sem abrir o forno no início, para a massa subir por igual.', resultado: 'Crescimento uniforme, cor dourada e palito que sai limpo.' },
  'SUB-CSE-047-011': { definicao: 'Assas em calor suave, porque a estrutura vem só do ar batido e cai se apanhar choque de temperatura.', resultado: 'Massa alta e leve, que volta ao toque e não afunda ao arrefecer.' },
  'SUB-CSE-047-012': { definicao: 'Assas em branco com peso por cima antes de rechear, para o fundo não subir.', resultado: 'Base plana e seca, com as bordas de cor uniforme.' },
  'SUB-CSE-047-013': { definicao: 'Assas em calor forte no início, para a água das camadas virar vapor e separar a massa.', resultado: 'Camadas visíveis, altura ganha e interior seco.' },
  'SUB-CSE-047-014': { definicao: 'Assas sem abrir o forno até a estrutura firmar, senão a massa afunda.', resultado: 'Peça oca por dentro, com as paredes secas e a forma mantida.' },
  'SUB-CSE-047-015': { definicao: 'Assas massa com pouca água, que precisa de mais tempo para secar por dentro.', resultado: 'Côdea firme e miolo cozido, sem parte crua no centro.' },
  'SUB-CSE-047-016': { definicao: 'Assas massa de hidratação normal, com vapor no início e calor seco no fim.', resultado: 'Côdea dourada, miolo com alvéolos regulares e som oco na base.' },
  'SUB-CSE-047-017': { definicao: 'Assas massa muito húmida em calor forte, para a estrutura firmar antes de espalhar.', resultado: 'Alvéolos grandes e irregulares, côdea estaladiça e miolo húmido mas cozido.' },
  'SUB-CSE-047-018': { definicao: 'Assas em calor moderado, porque a gordura e o açúcar coram muito antes de o interior cozer.', resultado: 'Cor dourada uniforme e miolo cozido, sem estar queimado por fora.' },
  'SUB-CSE-047-019': { definicao: 'Assas massa laminada em calor forte, para as camadas de gordura criarem vapor e separarem a massa.', resultado: 'Folhado visível no corte, exterior estaladiço e interior seco.' },
  'SUB-CSE-047-020': { definicao: 'Assas em calor fraco durante muito tempo, para o interior chegar ao ponto sem a superfície secar.', resultado: 'Cor igual do bordo ao centro e perda de peso reduzida.' },
  'SUB-CSE-047-021': { definicao: 'Tapas com folha ou tampa, para o vapor ficar dentro e o produto não secar.', resultado: 'Produto húmido e macio, com pouca ou nenhuma cor.' },
  'SUB-CSE-047-022': { definicao: 'Assas sem tapar, para a superfície secar e ganhar cor.', resultado: 'Superfície corada e seca, com o interior no ponto.' },
  'SUB-CSE-047-023': { definicao: 'Metes água ou gelo no forno no início, para a superfície se manter húmida enquanto a peça cresce.', resultado: 'Peça com bom crescimento e côdea brilhante e fina.' },
  'SUB-CSE-047-024': { definicao: 'Usas o ventilador do forno para o ar circular, o que coze mais depressa e por igual.', resultado: 'Cor igual em todos os tabuleiros e tempo mais curto.' },

  // ── Emulsionar ──────────────────────────────────────────────
  'SUB-MOL-068-001': { definicao: 'Bates gordura e ácido no momento, sabendo que se separam ao fim de pouco tempo.', resultado: 'Mistura turva e ligada na altura de servir, sem camadas separadas.' },
  'SUB-MOL-068-002': { definicao: 'Juntas o óleo em fio muito fino à gema, batendo sempre, para as gotas ficarem presas.', resultado: 'Creme espesso, pálido e que mantém a forma na colher.' },
  'SUB-MOL-068-003': { definicao: 'Fazes a mesma emulsão mas com alho esmagado, que ajuda a ligar e dá o sabor.', resultado: 'Creme firme e com aroma de alho marcado, sem separar.' },
  'SUB-MOL-068-004': { definicao: 'Bates gemas com calor suave e juntas manteiga derretida aos poucos, sem deixar cozer o ovo.', resultado: 'Molho quente, liso e brilhante, sem grãos nem gordura à parte.' },
  'SUB-MOL-068-005': { definicao: 'Fazes a mesma emulsão quente, mas partindo de uma redução com estragão e vinagre.', resultado: 'Molho estável com aroma de estragão e acidez equilibrada.' },
  'SUB-MOL-068-006': { definicao: 'Juntas manteiga fria em pedaços a uma redução ácida, fora do lume forte, mexendo sempre.', resultado: 'Molho branco, aveludado e brilhante, sem separar.' },
  'SUB-MOL-068-007': { definicao: 'Juntas líquido quente ao chocolate e mexes do centro para fora, até ficar uma mistura só.', resultado: 'Brilhante, liso e sem gordura à superfície.' },
  'SUB-MOL-068-008': { definicao: 'Aqueces claras com açúcar em banho-maria até dissolver, bates até arrefecer e só depois juntas a gordura.', resultado: 'Creme sedoso e estável, sem grãos de açúcar.' },
  'SUB-MOL-068-009': { definicao: 'Juntas calda de açúcar a ferver às claras em movimento e bates até arrefecer.', resultado: 'Merengue firme e brilhante que aguenta a gordura sem talhar.' },
  'SUB-MOL-068-010': { definicao: 'Juntas calda quente às gemas, o que dá cor e sabor mais ricos do que com claras.', resultado: 'Creme amarelo, denso e liso.' },
  'SUB-MOL-068-011': { definicao: 'Bates creme pasteleiro frio com manteiga, unindo os dois sem talhar.', resultado: 'Creme leve, com sabor a baunilha e sem grãos.' },
  'SUB-MOL-068-012': { definicao: 'Bates manteiga com leite condensado, sem cozinhar nada.', resultado: 'Creme muito liso e brilhante, sem cristais de açúcar.' },
  'SUB-MOL-068-013': { definicao: 'Bates manteiga com açúcar em pó, o mais simples e o mais doce dos cremes de manteiga.', resultado: 'Creme claro e fofo, sem grãos por dissolver.' },
  'SUB-MOL-068-014': { definicao: 'Bates manteiga com leite condensado cozido ou doce de leite, para dar cor e sabor de caramelo.', resultado: 'Creme cor de caramelo, estável e liso.' },
  'SUB-MOL-068-015': { definicao: 'Bates queijo fresco com manteiga e açúcar, sem bater demais para não perder firmeza.', resultado: 'Creme firme e ligeiramente ácido, que mantém a forma.' },
  'SUB-MOL-068-016': { definicao: 'Juntas água quente ao chocolate em vez de gordura, usando só o cacau para ligar.', resultado: 'Textura brilhante e intensa, sem gordura separada.' },
  'SUB-MOL-068-017': { definicao: 'Ligas os sucos do assado com a gordura que largaram, batendo até ficarem unidos.', resultado: 'Molho brilhante e ligado, sem gordura a boiar.' },

  // ── Fritar ──────────────────────────────────────────────────
  'SUB-GCM-055-001': { definicao: 'Mergulhas por completo em gordura quente, para cozinhar por todos os lados ao mesmo tempo.', resultado: 'Cor igual à volta toda e interior cozido.' },
  'SUB-GCM-055-002': { definicao: 'Frites com pouca gordura na frigideira, virando a meio para corar os dois lados.', resultado: 'Ambas as faces coradas e interior cozido.' },
  'SUB-GCM-055-003': { definicao: 'Frites duas vezes: a primeira mais fria para cozer, a segunda mais quente para dar crocante.', resultado: 'Exterior muito estaladiço e interior macio.' },
  'SUB-GCM-055-004': { definicao: 'Lavas o amido, secas bem e frites em duas fases, porque a batata crua liberta água.', resultado: 'Batata dourada e estaladiça, sem estar mole nem oleosa.' },
  'SUB-GCM-055-005': { definicao: 'Frites em gordura bem quente uma batata já cozida, só para corar e dar crocante.', resultado: 'Superfície dourada e crocante, interior macio.' },
  'SUB-GCM-055-006': { definicao: 'Frites com a cobertura de pão ralado, sem mexer no início para a crosta agarrar.', resultado: 'Panado inteiro e dourado, sem se soltar da peça.' },
  'SUB-GCM-055-007': { definicao: 'Cobres com massa líquida e frites logo, para a massa inchar e criar uma casca leve.', resultado: 'Casca leve, seca e sem massa crua por dentro.' },
  'SUB-GCM-055-008': { definicao: 'Frites por muito pouco tempo, porque o marisco endurece depressa.', resultado: 'Cobertura corada e carne ainda tenra.' },
  'SUB-GCM-055-009': { definicao: 'Frites carne já panada, dando tempo para o interior cozer sem o panado queimar.', resultado: 'Panado dourado e carne cozida até ao centro.' },
  'SUB-GCM-055-010': { definicao: 'Frites em pequenas quantidades, porque os legumes largam água e baixam a temperatura.', resultado: 'Legumes corados e não encharcados.' },
  'SUB-GCM-055-011': { definicao: 'Frites massa escaldada em gordura a temperatura média, para crescer sem queimar.', resultado: 'Peça inchada, oca por dentro e dourada por fora.' },
  'SUB-GCM-055-012': { definicao: 'Frites massa levedada, virando a meio, para corar os dois lados por igual.', resultado: 'Anel branco a meio da peça e miolo cozido.' },
  'SUB-GCM-055-013': { definicao: 'Frites peças doces em gordura limpa, controlando bem a temperatura para não escurecerem depressa.', resultado: 'Cor dourada uniforme e interior cozido.' },
  'SUB-GCM-055-014': { definicao: 'Frites em porções pequenas, para a gordura não arrefecer de repente.', resultado: 'Todos os lotes com a mesma cor e textura.' },
  'SUB-GCM-055-015': { definicao: 'Escorres sobre rede ou papel e temperas ainda quente, para o sal agarrar.', resultado: 'Sem gordura acumulada e tempero distribuído por igual.' },
};

export function definicaoDaSubtecnica(id: string): DefinicaoSub | null {
  return DEFINICOES_SUBTECNICAS[id] ?? null;
}
