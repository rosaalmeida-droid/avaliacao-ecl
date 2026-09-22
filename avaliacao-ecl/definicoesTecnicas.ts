// ============================================================
// Definições das técnicas em linguagem de aluno.
//
// As definições que vinham nos dados eram circulares — todas as 104
// diziam "Operação profissional de X, aplicada com controlo do produto,
// do processo e do resultado". Repetem o nome em vez de o explicarem,
// e um aluno que não sabe o que é escalfar continua sem saber.
//
// REGRAS destas definições:
//  1. Não repetir o nome da técnica dentro da definição.
//  2. Sem matéria-prima: a técnica serve para vários produtos, e o
//     produto vem da ficha. "Corte transversal ao produto" serve para
//     cenoura e para chouriço; "cortar a cenoura" não.
//  3. Sem medidas nem temperaturas fixas: uma juliana de legume não
//     tem a mesma espessura que uma de presunto. As medidas vêm da
//     ficha técnica.
//  4. O RESULTADO é observável: o aluno tem de conseguir olhar e ver
//     se está bem. "Cede ao dente mas o centro mantém-se firme", não
//     "grau de cozedura adequado".
//  5. Linguagem de quem tem 15 anos. Termo francês é explicado.
// ============================================================

export interface DefinicaoTecnica {
  /** O que é. Uma ou duas frases. */
  definicao: string;
  /** Como se vê que ficou bem. */
  resultado: string;
  /** Onde se costuma aplicar — a app propõe, o professor confirma. */
  produtos?: string;
}

export const DEFINICOES_TECNICAS: Record<string, DefinicaoTecnica> = {

  // ── Preparação de matérias-primas ───────────────────────────
  'Amanhar': {
    definicao: 'Limpar o peixe antes de o cozinhar: tirar escamas, vísceras e barbatanas, e lavar bem por dentro.',
    resultado: 'Peixe sem escamas nem vísceras, cavidade limpa e sem sangue.',
    produtos: 'peixe inteiro',
  },
  'Aparar': {
    definicao: 'Retirar as partes que não se aproveitam — gorduras, peles, nervos, pontas — deixando só o que vai ser usado.',
    resultado: 'Peça limpa, com forma regular, sem restos por cortar.',
    produtos: 'carne, peixe, legumes',
  },
  'Demolhar': {
    definicao: 'Deixar um produto seco dentro de água até voltar a ficar macio e hidratado.',
    resultado: 'Produto macio ao toque e sem parte dura no centro.',
    produtos: 'leguminosas secas, bacalhau, cogumelos secos, frutos secos',
  },
  'Descaroçar': {
    definicao: 'Tirar o caroço ou as sementes do interior, sem desfazer a polpa à volta.',
    resultado: 'Fruto inteiro na forma, sem caroço nem sementes.',
    produtos: 'azeitonas, cerejas, pêssegos, azeitonas, abacate',
  },
  'Descascar': {
    definicao: 'Retirar a casca deixando a polpa intacta, com o mínimo de desperdício.',
    resultado: 'Sem casca nem olhos, e sem levar polpa junto com a casca.',
    produtos: 'legumes, frutos, tubérculos',
  },
  'Desossar': {
    definicao: 'Separar a carne dos ossos, seguindo as articulações, sem rasgar o músculo.',
    resultado: 'Carne inteira e sem ossos; ossos limpos, sem carne aproveitável agarrada.',
    produtos: 'aves, carnes, peças com osso',
  },
  'Dessalgar': {
    definicao: 'Tirar o sal a um produto conservado em sal, mudando a água várias vezes.',
    resultado: 'Sal reduzido ao ponto certo, sem que o produto perca textura.',
    produtos: 'bacalhau, carnes salgadas',
  },
  'Enfarinhar': {
    definicao: 'Passar o produto por farinha, cobrindo toda a superfície numa camada fina, e sacudir o excesso.',
    resultado: 'Camada fina e uniforme, sem zonas com farinha empelotada.',
    produtos: 'peixe, carne, legumes antes de fritar',
  },
  'Eviscerar': {
    definicao: 'Abrir e retirar os órgãos internos, sem furar as vísceras para não contaminar a carne.',
    resultado: 'Cavidade limpa e sem restos; vísceras retiradas inteiras.',
    produtos: 'aves, caça, peixe',
  },
  'Filetar': {
    definicao: 'Separar a carne da espinha central com a faca rente ao osso, obtendo lombos limpos.',
    resultado: 'Filete inteiro, sem espinhas e sem carne deixada na espinha.',
    produtos: 'peixe',
  },
  'Higienizar': {
    definicao: 'Eliminar micro-organismos de superfícies, utensílios ou produtos, com detergente e desinfetante ou solução própria.',
    resultado: 'Superfície limpa, sem restos nem gordura, e desinfetada com o produto certo.',
    produtos: 'bancadas, utensílios, legumes de consumo cru',
  },
  'Lavar': {
    definicao: 'Retirar terra, areia e sujidade com água corrente, sem deixar o produto a ganhar água.',
    resultado: 'Sem terra nem areia, incluindo dentro das folhas e nas dobras.',
    produtos: 'legumes, frutos, ervas',
  },
  'Marinar': {
    definicao: 'Deixar o produto num líquido temperado durante um tempo, para ganhar sabor e ficar mais tenro.',
    resultado: 'Sabor entrou no produto e não só à superfície; textura mais macia.',
    produtos: 'carne, peixe, legumes',
  },
  'Medir': {
    definicao: 'Determinar volumes com o recipiente graduado adequado, lendo a marca ao nível dos olhos.',
    resultado: 'Volume exato ao pedido na ficha, sem estimativas.',
    produtos: 'líquidos',
  },
  'Panar': {
    definicao: 'Cobrir o produto por camadas — farinha, ovo e pão ralado — para criar uma crosta na fritura.',
    resultado: 'Cobertura completa e uniforme, sem falhas nem excesso agarrado.',
    produtos: 'carne, peixe, legumes, queijo',
  },
  'Pesar': {
    definicao: 'Determinar a massa com balança, descontando o peso do recipiente antes de começar.',
    resultado: 'Peso igual ao da ficha, com a balança tarada.',
    produtos: 'todos os ingredientes',
  },
  'Porcionar': {
    definicao: 'Dividir uma peça grande em partes do mesmo tamanho e peso, conforme a dose definida.',
    resultado: 'Porções iguais entre si, dentro do peso indicado na ficha.',
    produtos: 'carne, peixe, doçaria',
  },
  'Selecionar': {
    definicao: 'Escolher o produto pelo estado, calibre e qualidade, pondo de lado o que não serve.',
    resultado: 'Produto no ponto certo para o que se vai fazer, sem defeitos.',
    produtos: 'todas as matérias-primas',
  },
  'Temperar': {
    definicao: 'Juntar sal, pimenta ou outros condimentos, distribuindo por toda a superfície.',
    resultado: 'Sabor equilibrado e igual em toda a peça, sem zonas salgadas.',
    produtos: 'carne, peixe, legumes, molhos',
  },

  // ── Cortes e redução ────────────────────────────────────────
  'Cortar': {
    definicao: 'Dividir o produto com faca, dando-lhe uma forma e um tamanho definidos.',
    resultado: 'Peças todas com a mesma forma e medida; corte limpo, sem esmagar.',
    produtos: 'legumes, carne, peixe, frutos',
  },
  'Esmagar': {
    definicao: 'Aplicar pressão até o produto ceder e perder a forma, sem o reduzir a puré.',
    resultado: 'Produto aberto e solto, com a estrutura ainda reconhecível.',
    produtos: 'alho, batata cozida, frutos moles',
  },
  'Fatiar': {
    definicao: 'Cortar em lâminas, mantendo a mesma espessura do princípio ao fim da peça.',
    resultado: 'Fatias de espessura igual e corte inteiro, sem rasgar.',
    produtos: 'carnes, enchidos, pão, legumes',
  },
  'Laminar': {
    definicao: 'Cortar em lâminas muito finas, quase transparentes.',
    resultado: 'Lâminas finas e inteiras, sem partes grossas nem rasgadas.',
    produtos: 'legumes firmes, cogumelos, trufa',
  },
  'Moer': {
    definicao: 'Reduzir a partículas pequenas por trituração mecânica.',
    resultado: 'Grão do tamanho pedido e igual em todo o lote.',
    produtos: 'carne, especiarias, café, cereais',
  },
  'Passar': {
    definicao: 'Fazer passar por um filtro ou passador, separando o líquido dos sólidos ou desfazendo grumos.',
    resultado: 'Textura lisa e sem partículas; nada aproveitável fica no passador.',
    produtos: 'molhos, cremes, purés, fundos',
  },
  'Peneirar': {
    definicao: 'Passar um produto seco por um crivo, para separar grumos e arejar.',
    resultado: 'Pó solto e sem grumos, com volume aumentado.',
    produtos: 'farinha, açúcar, cacau, fermento',
  },
  'Picar': {
    definicao: 'Cortar em pedaços muito pequenos, com movimentos rápidos e repetidos da faca.',
    resultado: 'Pedaços pequenos e do mesmo tamanho, sem pasta nem esmagamento.',
    produtos: 'ervas, cebola, alho, carne',
  },
  'Ralar': {
    definicao: 'Desfazer em fios ou partículas passando o produto pelo ralador.',
    resultado: 'Fios ou grão uniforme, sem pedaços por ralar.',
    produtos: 'queijo, legumes, citrinos, chocolate',
  },
  'Tornear': {
    definicao: 'Dar forma regular com a faca, cortando faces à volta do produto até ficar com o formato pedido.',
    resultado: 'Peças do mesmo tamanho e com o mesmo número de faces.',
    produtos: 'legumes firmes',
  },
  'Triturar': {
    definicao: 'Desfazer em partículas muito finas com equipamento mecânico, até obter pasta ou puré.',
    resultado: 'Textura homogénea, sem pedaços por desfazer.',
    produtos: 'legumes cozidos, frutos, frutos secos',
  },

  // ── Calor húmido ────────────────────────────────────────────
  'Branquear': {
    definicao: 'Mergulhar rapidamente em água a ferver e passar logo por água com gelo, para fixar a cor e parar a cozedura.',
    resultado: 'Cor viva mantida e produto ainda firme, não cozido por completo.',
    produtos: 'legumes verdes, ossos, tomate para pelar',
  },
  'Cozer a vapor': {
    definicao: 'Cozinhar pelo vapor da água a ferver, sem o produto tocar no líquido.',
    resultado: 'Produto cozido por igual, com a cor e o sabor preservados.',
    produtos: 'legumes, peixe, massas orientais',
  },
  'Cozer em banho-maria': {
    definicao: 'Cozinhar com o recipiente dentro de outro com água quente, para o calor chegar suave e sem queimar.',
    resultado: 'Textura lisa e firme, sem talhar nem ganhar bolhas.',
    produtos: 'cremes, pudins, chocolate, terrinas',
  },
  'Cozer em líquido': {
    definicao: 'Cozinhar mergulhado num líquido a ferver ou a fervilhar.',
    resultado: 'Produto cozido até ao centro, com a textura pedida.',
    produtos: 'legumes, massas, arroz, leguminosas, carnes',
  },
  'Escaldar': {
    definicao: 'Deitar água a ferver por cima ou mergulhar por segundos, só para amolecer a superfície ou soltar a pele.',
    resultado: 'Superfície amolecida ou pele a soltar-se, com o interior por cozer.',
    produtos: 'tomate, amêndoa, legumes de folha',
  },
  'Escalfar': {
    definicao: 'Cozinhar num líquido quente mas sem ferver, com movimento suave, para não desfazer o produto.',
    resultado: 'Produto inteiro e com forma mantida; interior no ponto pedido.',
    produtos: 'ovos, peixe, fruta, aves',
  },

  // ── Calor seco ──────────────────────────────────────────────
  'Assar': {
    definicao: 'Cozinhar no forno com calor seco, deixando ganhar cor por fora enquanto coze por dentro.',
    resultado: 'Exterior corado por igual e interior no ponto certo.',
    produtos: 'carne, aves, peixe, legumes, massas levedadas',
  },
  'Chapar': {
    definicao: 'Cozinhar sobre placa quente, com contacto direto e pouca gordura.',
    resultado: 'Marca de cor uniforme na face que tocou a placa.',
    produtos: 'carne, peixe, legumes',
  },
  'Defumar': {
    definicao: 'Expor ao fumo de madeira para dar sabor e ajudar a conservar.',
    resultado: 'Aroma e cor de fumo presentes, sem sabor a queimado.',
    produtos: 'peixe, carne, queijo',
  },
  'Desidratar': {
    definicao: 'Retirar a água por calor baixo e prolongado, para concentrar o sabor e conservar.',
    resultado: 'Produto seco e quebradiço ou flexível conforme o pedido, sem humidade no interior.',
    produtos: 'frutos, legumes, ervas',
  },
  'Gratinar': {
    definicao: 'Dar calor forte por cima no fim da confeção, para criar uma camada corada à superfície.',
    resultado: 'Superfície dourada por igual, sem zonas queimadas nem pálidas.',
    produtos: 'pratos com queijo, béchamel ou pão ralado',
  },
  'Grelhar': {
    definicao: 'Cozinhar sobre grelha com calor forte, deixando marca das barras.',
    resultado: 'Marcas de grelha definidas e interior no ponto pedido.',
    produtos: 'carne, peixe, legumes',
  },
  'Tostar': {
    definicao: 'Aquecer a seco até ganhar cor e libertar aroma, sem cozinhar por dentro.',
    resultado: 'Cor dourada e aroma libertado, sem sabor amargo.',
    produtos: 'frutos secos, especiarias, pão, farinha',
  },

  // ── Gordura e calor misto ───────────────────────────────────
  'Brasear': {
    definicao: 'Corar primeiro e depois cozinhar tapado, com pouco líquido, em lume brando e durante muito tempo.',
    resultado: 'Carne que se desfaz ao garfo e molho concentrado.',
    produtos: 'peças de carne rijas, legumes duros',
  },
  'Confitar em gordura': {
    definicao: 'Cozinhar mergulhado em gordura a temperatura baixa e constante, durante muito tempo.',
    resultado: 'Produto macio e mantido inteiro, sem fritar nem ganhar cor forte.',
    produtos: 'aves, porco, legumes, alho',
  },
  'Estufar': {
    definicao: 'Cozinhar tapado, em lume brando, aproveitando a água que o próprio produto liberta.',
    resultado: 'Produto macio e molho ligeiro, sem ter ganho cor.',
    produtos: 'legumes, carnes, aves',
  },
  'Fritar': {
    definicao: 'Cozinhar mergulhado em gordura quente, criando crosta por fora.',
    resultado: 'Exterior estaladiço e dourado, interior cozido e não encharcado.',
    produtos: 'batata, peixe, panados, massas',
  },
  'Guisar': {
    definicao: 'Cozinhar em pedaços dentro de um molho, em lume brando, até ficar tenro.',
    resultado: 'Pedaços macios e molho ligado e saboroso.',
    produtos: 'carne em cubos, peixe, legumes',
  },
  'Refogar': {
    definicao: 'Cozinhar gordura com produtos aromáticos em lume brando, até amolecerem e libertarem sabor.',
    resultado: 'Aromáticos macios e translúcidos, sem cor escura nem sabor a queimado.',
    produtos: 'cebola, alho, tomate, pimento',
  },
  'Saltear': {
    definicao: 'Cozinhar em lume forte com pouca gordura, movimentando o produto para cozinhar por igual.',
    resultado: 'Cor por fora e interior firme; produto solto e não cozido em água própria.',
    produtos: 'legumes, carnes tenras, cogumelos, massa',
  },
  'Suar': {
    definicao: 'Aquecer em gordura e lume brando, tapado, para o produto libertar água sem ganhar cor.',
    resultado: 'Produto amolecido e translúcido, completamente sem cor.',
    produtos: 'cebola, alho-francês, aipo, chalota',
  },

  // ── Fundos, molhos e texturas ───────────────────────────────
  'Ajustar consistência': {
    definicao: 'Corrigir a espessura juntando líquido ou deixando reduzir, até chegar ao ponto pedido.',
    resultado: 'Consistência certa para o uso: cobre as costas da colher sem escorrer nem ficar pesada.',
    produtos: 'molhos, cremes, sopas',
  },
  'Clarificar': {
    definicao: 'Tornar um líquido transparente, retirando as partículas em suspensão.',
    resultado: 'Líquido límpido, sem turvação nem partículas.',
    produtos: 'caldos, consommés, manteiga, geleias',
  },
  'Deglacear': {
    definicao: 'Juntar líquido ao tacho quente depois de alourar, para dissolver o que ficou agarrado ao fundo.',
    resultado: 'Fundo do tacho limpo e todo o sabor incorporado no líquido.',
    produtos: 'depois de corar carne, aves ou legumes',
  },
  'Emulsionar': {
    definicao: 'Juntar dois líquidos que normalmente não se misturam — gordura e água — batendo até formarem um só.',
    resultado: 'Mistura lisa, brilhante e estável, sem separar nem talhar.',
    produtos: 'maionese, vinagretes, molhos com manteiga',
  },
  'Engrossar': {
    definicao: 'Aumentar a espessura de um líquido com um agente próprio ou por evaporação.',
    resultado: 'Textura mais espessa e sem grumos.',
    produtos: 'molhos, sopas, cremes',
  },
  'Escumar': {
    definicao: 'Retirar com concha a espuma e as impurezas que sobem à superfície durante a cozedura.',
    resultado: 'Superfície limpa e líquido transparente.',
    produtos: 'fundos, caldos, doces em calda, leguminosas',
  },
  'Espumar': {
    definicao: 'Incorporar ar num líquido até formar espuma leve e estável.',
    resultado: 'Espuma firme que se mantém sem desfazer de imediato.',
    produtos: 'leite, molhos, cremes',
  },
  'Extrair': {
    definicao: 'Retirar sabor, aroma ou suco de um produto para um líquido, por calor ou pressão.',
    resultado: 'Líquido com sabor concentrado e produto já sem nada a dar.',
    produtos: 'ossos, aromáticos, citrinos, frutos',
  },
  'Gelificar': {
    definicao: 'Dar a um líquido consistência de gelatina, com um agente próprio e frio.',
    resultado: 'Massa firme que mantém a forma e corta limpo.',
    produtos: 'caldos, sumos, cremes, doçaria',
  },
  'Ligar': {
    definicao: 'Unir os elementos de uma preparação numa textura só, sem separarem.',
    resultado: 'Textura homogénea e lisa, sem grumos nem separação.',
    produtos: 'molhos, cremes, recheios, sopas',
  },
  'Montar com gordura': {
    definicao: 'Juntar gordura fria em pedaços a um líquido quente, mexendo sempre, para dar brilho e corpo.',
    resultado: 'Molho brilhante e aveludado, sem gordura à superfície.',
    produtos: 'molhos quentes no fim da confeção',
  },
  'Reduzir': {
    definicao: 'Deixar ferver sem tampa para a água evaporar e o sabor concentrar.',
    resultado: 'Volume menor, sabor mais intenso e textura mais espessa.',
    produtos: 'fundos, molhos, vinho, sumos',
  },

  // ── Pastelaria e panificação ────────────────────────────────
  'Amassar': {
    definicao: 'Trabalhar farinha e líquido até formar uma massa lisa, desenvolvendo o glúten.',
    resultado: 'Massa lisa, elástica e que não cola às mãos.',
    produtos: 'massas de pão, pizza, massas levedadas',
  },
  'Arejar': {
    definicao: 'Incorporar ar numa preparação para lhe dar volume e leveza.',
    resultado: 'Volume aumentado e textura leve.',
    produtos: 'massas, cremes, claras, natas',
  },
  'Bater': {
    definicao: 'Agitar com energia com vara ou batedeira, para juntar, arejar ou dar volume.',
    resultado: 'Textura uniforme e volume conforme pedido.',
    produtos: 'ovos, natas, manteiga, massas',
  },
  'Caramelizar': {
    definicao: 'Aquecer açúcar até derreter e ganhar cor âmbar e sabor próprio.',
    resultado: 'Cor âmbar uniforme, sem cristais e sem sabor a queimado.',
    produtos: 'açúcar, frutos, legumes com açúcar natural',
  },
  'Cremar': {
    definicao: 'Bater gordura com açúcar até a mistura ficar clara, fofa e com volume.',
    resultado: 'Mistura pálida, leve, com o açúcar já dissolvido.',
    produtos: 'manteiga com açúcar, base de bolos',
  },
  'Cristalizar açúcar': {
    definicao: 'Levar o açúcar a formar cristais, controlando a temperatura e o repouso.',
    resultado: 'Cristais do tamanho pretendido e uniformes.',
    produtos: 'fondant, coberturas, frutos cristalizados',
  },
  'Dobrar massa': {
    definicao: 'Sobrepor a massa sobre si própria em voltas, criando camadas de massa e gordura.',
    resultado: 'Camadas visíveis e regulares, sem a gordura sair.',
    produtos: 'massa folhada, croissant, massas laminadas',
  },
  'Envolver': {
    definicao: 'Juntar uma preparação leve a outra mais pesada com movimentos suaves de baixo para cima, sem perder o ar.',
    resultado: 'Mistura uniforme mantendo o volume; sem riscos por misturar.',
    produtos: 'claras em castelo, natas batidas, mousses',
  },
  'Escaldar massa': {
    definicao: 'Cozinhar farinha com líquido quente antes de juntar os ovos, para gelatinizar o amido.',
    resultado: 'Massa que se descola do tacho e forma uma película no fundo.',
    produtos: 'massa choux, massas escaldadas',
  },
  'Fermentar': {
    definicao: 'Deixar a massa em repouso para as leveduras produzirem gás e desenvolverem sabor.',
    resultado: 'Volume aumentado e aroma desenvolvido, sem cheiro ácido a mais.',
    produtos: 'massas de pão e levedadas',
  },
  'Golpear': {
    definicao: 'Fazer cortes na superfície antes de cozer, para o vapor sair e a peça abrir por onde se quer.',
    resultado: 'Cortes abertos por igual e peça sem rasgar noutros sítios.',
    produtos: 'pão, massas levedadas, carne, peixe',
  },
  'Laminar massa': {
    definicao: 'Estender a massa em camada de espessura igual, com rolo ou máquina.',
    resultado: 'Espessura igual em toda a folha e sem rasgar.',
    produtos: 'massas folhadas, quebradas, fresca',
  },
  'Levedar': {
    definicao: 'Deixar a massa crescer depois de moldada, até estar pronta para ir ao forno.',
    resultado: 'Volume quase dobrado; ao pressionar, a massa volta devagar.',
    produtos: 'massas de pão e levedadas',
  },
  'Misturar': {
    definicao: 'Juntar ingredientes até ficarem distribuídos por igual.',
    resultado: 'Mistura homogénea, sem partes por incorporar.',
    produtos: 'todas as preparações',
  },
  'Modelar': {
    definicao: 'Dar forma à massa com as mãos ou molde, deixando a superfície tensa.',
    resultado: 'Forma regular, superfície lisa e sem fendas.',
    produtos: 'pão, bolos, doçaria, chocolate',
  },
  'Montar creme': {
    definicao: 'Bater até incorporar ar e ganhar firmeza suficiente para manter a forma.',
    resultado: 'Ponto firme que aguenta o bico do batedor sem cair nem talhar.',
    produtos: 'natas, claras, cremes',
  },
  'Temperar chocolate': {
    definicao: 'Levar o chocolate por uma sequência de temperaturas, para os cristais de manteiga de cacau ficarem estáveis.',
    resultado: 'Brilho, quebra seca ao partir e sem manchas brancas.',
    produtos: 'chocolate de cobertura',
  },

  // ── Finalização, conservação e serviço ──────────────────────
  'Abrilhantar': {
    definicao: 'Dar brilho à superfície com um produto próprio, pincelado no fim.',
    resultado: 'Brilho uniforme, sem acumulações nem zonas baças.',
    produtos: 'doçaria, frutos, carnes assadas',
  },
  'Acondicionar': {
    definicao: 'Guardar em recipiente adequado, protegido do ar e da contaminação.',
    resultado: 'Recipiente fechado, produto protegido e identificado.',
    produtos: 'todos os produtos preparados',
  },
  'Arrefecer rapidamente': {
    definicao: 'Baixar a temperatura depressa, para atravessar rápido a zona onde os micro-organismos se multiplicam.',
    resultado: 'Temperatura de segurança atingida dentro do tempo definido.',
    produtos: 'preparações cozinhadas',
  },
  'Conservar': {
    definicao: 'Manter o produto em condições que travem a deterioração, à temperatura certa e pelo tempo certo.',
    resultado: 'Produto dentro da validade, à temperatura correta e identificado.',
    produtos: 'todos os produtos',
  },
  'Decorar': {
    definicao: 'Acrescentar elementos que valorizam o aspeto, sem prejudicar o sabor nem a temperatura.',
    resultado: 'Decoração limpa e proporcionada, e o prato ainda no ponto de servir.',
    produtos: 'pratos, sobremesas, buffets',
  },
  'Desmontar serviço': {
    definicao: 'Recolher e arrumar no fim, separando o que se aproveita do que vai fora, e limpando o espaço.',
    resultado: 'Espaço limpo, produto aproveitável guardado e resíduos separados.',
    produtos: 'fim de serviço',
  },
  'Empratar': {
    definicao: 'Dispor os elementos no prato, com equilíbrio de volumes, cores e alturas.',
    resultado: 'Prato limpo nas bordas, elementos equilibrados e à temperatura certa.',
    produtos: 'todos os pratos',
  },
  'Etiquetar': {
    definicao: 'Identificar o produto com designação, data e validade, de forma legível.',
    resultado: 'Etiqueta completa, legível e bem colada.',
    produtos: 'produtos acondicionados',
  },
  'Glacear': {
    definicao: 'Cobrir com uma camada fina e brilhante, quente ou fria conforme a preparação.',
    resultado: 'Cobertura fina e uniforme, sem escorrer nem deixar falhas.',
    produtos: 'legumes, carnes, bolos, sobremesas',
  },
  'Montar buffet': {
    definicao: 'Dispor os pratos e o serviço na mesa, por ordem lógica e com as temperaturas mantidas.',
    resultado: 'Sequência lógica, temperaturas mantidas e reposição possível sem desmontar.',
    produtos: 'serviço de buffet',
  },
  'Regenerar': {
    definicao: 'Repor à temperatura de serviço um produto já confecionado e arrefecido.',
    resultado: 'Temperatura de serviço atingida no centro, sem ressecar nem cozer mais.',
    produtos: 'pratos preparados com antecedência',
  },
  'Repor': {
    definicao: 'Voltar a abastecer durante o serviço, mantendo o aspeto e a temperatura.',
    resultado: 'Nada em falta durante o serviço e sem misturar produto velho com novo.',
    produtos: 'buffet, linha de serviço',
  },
  'Retificar tempero': {
    definicao: 'Provar no fim e corrigir o que falta, ajustando aos poucos.',
    resultado: 'Sabor equilibrado, sem elemento a sobressair.',
    produtos: 'molhos, sopas, guisados, recheios',
  },
  'Servir': {
    definicao: 'Entregar o prato ao cliente na temperatura, no tempo e na sequência certos.',
    resultado: 'Prato à temperatura devida, na altura certa e sem marcas de dedos.',
    produtos: 'serviço à mesa',
  },

  // ── Planeamento e controlo ──────────────────────────────────
  'Calcular capitação': {
    definicao: 'Determinar a quantidade de cada ingrediente por pessoa, a partir do número de doses.',
    resultado: 'Quantidades certas para as doses pedidas, sem falta nem sobra.',
  },
  'Controlar temperatura': {
    definicao: 'Medir a temperatura com termómetro nos pontos críticos e registar o valor.',
    resultado: 'Valor dentro do limite definido e registo feito.',
  },
  'Controlar tempo': {
    definicao: 'Vigiar a duração de cada etapa, para cumprir os tempos e a sequência.',
    resultado: 'Etapas dentro do tempo previsto e produtos prontos ao mesmo tempo.',
  },
  'Dimensionar produção': {
    definicao: 'Ajustar as quantidades da receita ao número de doses necessário.',
    resultado: 'Proporções mantidas e quantidade final correta.',
  },
  'Distribuir tarefas': {
    definicao: 'Repartir o trabalho pela equipa, tendo em conta os tempos e as capacidades de cada um.',
    resultado: 'Toda a gente com trabalho e nada por fazer no fim do tempo.',
  },
  'Interpretar ficha técnica': {
    definicao: 'Ler a ficha e perceber o que fazer, com que quantidades, em que ordem e com que resultado.',
    resultado: 'Produção conforme a ficha, sem falhas de quantidade nem de sequência.',
  },
  'Organizar mise en place': {
    definicao: 'Preparar e dispor tudo o que é preciso antes de começar a produzir.',
    resultado: 'Tudo preparado e ao alcance antes de começar; nada em falta a meio.',
  },
  'Planear sequência de produção': {
    definicao: 'Definir a ordem das tarefas para que tudo fique pronto na altura certa.',
    resultado: 'Sequência sem esperas nem produtos parados a arrefecer.',
  },
  'Provar e avaliar sensorialmente': {
    definicao: 'Provar e julgar sabor, textura, aroma e aspeto, comparando com o esperado.',
    resultado: 'Desvios identificados e correção proposta.',
  },
  'Registar controlo': {
    definicao: 'Anotar os valores medidos no registo próprio, na altura em que se mede.',
    resultado: 'Registo completo, com data, hora, valor e quem registou.',
  },
};

/** Definição de uma técnica, ou null se ainda não estiver escrita. */
export function definicaoDaTecnica(nome: string): DefinicaoTecnica | null {
  return DEFINICOES_TECNICAS[nome] ?? null;
}
