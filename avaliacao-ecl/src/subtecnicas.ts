// ============================================================
// Subtécnicas — nível 2, ligadas às 33 Técnicas "grupo" (T01-T33)
// Baseadas no Glossário Técnico de Cozinha e lista de competências
// observáveis enviados pela ECL.
//
// Estrutura:
//   categoria: sempre 'TECNICAS'
//   tecnicaMaeId: id da técnica-grupo (T01-T33) de onde deriva
//   uc: UCs do referencial 811RA144 a que se liga
//   palavrasChave: termos que ativam esta subtécnica a partir do texto da receita
// ============================================================

import { Competencia } from './types';

// ── Guards por categoria — evita falsos positivos (ex: "lombo" numa receita
// de carne já não sugere por engano uma técnica de peixe) ──────────────
const GUARDS: Record<string, string[]> = {
  PEIXE:      ['peixe','atum','salmão','bacalhau','robalo','dourada','linguado','pescada','carapau','sardinhas','solha','pregado','pargo','cherne','faneca','marisco','amêijoa','camarão','lagosta','lula','polvo','mexilhão','gambas','sapateira'],
  CARNE:      ['carne','bife','frango','pato','peru','galinha','porco','vaca','borrego','vitela','coelho','perdiz','veado','javali','entrecosto','costeleta','lombo','secretos','presa'],
  PASTELARIA: ['bolo','tarte','torta','mousse','pudim','crème brûlée','cheesecake','brownie','muffin','cupcake','croissant','brioche','massa folhada','pâte','ganache','fondant','merengue','pavlova','tiramisu','panna cotta','soufflé','pastel de nata','pastel de belém','creme pasteleiro','creme de nata'],
  SOPAS:      ['sopa','caldo','creme de','velouté','consommé','bisque','gazpacho','minestrone'],
};

function normalizarTextoSub(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ');
}

function textoContemPalavraSub(texto: string, palavra: string): boolean {
  return normalizarTextoSub(texto).includes(normalizarTextoSub(palavra));
}

function grupoAtivoSub(textoNorm: string, grupo: string): boolean {
  return (GUARDS[grupo] || []).some(p => textoContemPalavraSub(textoNorm, p));
}

export const SUBTECNICAS: Competencia[] = [

  // ================================================================
  // PRODUÇÃO E ORGANIZAÇÃO — mãe: T01 (fichas técnicas) / T02 (mise en place)
  // ================================================================
  { id: 'S001', categoria: 'TECNICAS', nome: 'Elaborar plano de produção / trabalho', uc: ['UC03576'], tecnicaMaeId: 'T01', palavrasChave: ['plano de trabalho','plano de produção'] },
  { id: 'S002', categoria: 'TECNICAS', nome: 'Consultar fichas técnicas e receitas', uc: ['UC03576'], tecnicaMaeId: 'T01', palavrasChave: ['ficha técnica','consultar receita'] },
  { id: 'S003', categoria: 'TECNICAS', nome: 'Realizar mise en place', uc: ['UC03576','UC01999'], tecnicaMaeId: 'T02', palavrasChave: ['mise en place'] },
  { id: 'S004', categoria: 'TECNICAS', nome: 'Organizar posto de trabalho / bancada', uc: ['UC03576'], tecnicaMaeId: 'T02', palavrasChave: ['posto de trabalho','bancada','organizar'] },
  { id: 'S005', categoria: 'TECNICAS', nome: 'Organizar brigada e distribuir tarefas', uc: ['UC03576','UC03591'], tecnicaMaeId: 'T01', palavrasChave: ['brigada','distribuir tarefas'] },
  { id: 'S006', categoria: 'TECNICAS', nome: 'Preparar e manusear equipamentos e utensílios', uc: ['UC03576','UC01999'], tecnicaMaeId: 'T02', palavrasChave: ['equipamento','utensílio'] },
  { id: 'S007', categoria: 'TECNICAS', nome: 'Dosear / pesar ingredientes (capitação)', uc: ['UC03576','UC03579'], tecnicaMaeId: 'T17', palavrasChave: ['dosear','pesar','capitação','pesagem'] },
  { id: 'S008', categoria: 'TECNICAS', nome: 'Porcionar alimentos', uc: ['UC01999'], tecnicaMaeId: 'T02', palavrasChave: ['porcionar'] },

  // ================================================================
  // RECEÇÃO E ARMAZENAMENTO — mãe: T15 / T16
  // ================================================================
  { id: 'S010', categoria: 'TECNICAS', nome: 'Rececionar mercadorias', uc: ['UC03585','UC03579'], tecnicaMaeId: 'T16', palavrasChave: ['receção','mercadoria','rececionar'] },
  { id: 'S011', categoria: 'TECNICAS', nome: 'Verificar temperatura de receção', uc: ['UC03585','UC03584'], tecnicaMaeId: 'T16', palavrasChave: ['temperatura de receção','verificar temperatura'] },
  { id: 'S012', categoria: 'TECNICAS', nome: 'Verificar validade e integridade das embalagens', uc: ['UC03585'], tecnicaMaeId: 'T16', palavrasChave: ['validade','embalagem','integridade'] },
  { id: 'S013', categoria: 'TECNICAS', nome: 'Verificar estado de frescura dos produtos', uc: ['UC03585'], tecnicaMaeId: 'T16', palavrasChave: ['frescura','estado dos produtos'] },
  { id: 'S014', categoria: 'TECNICAS', nome: 'Armazenar e rotular produtos (FIFO/FEFO)', uc: ['UC03585'], tecnicaMaeId: 'T16', palavrasChave: ['armazenar','rotular','fifo','fefo'] },
  { id: 'S015', categoria: 'TECNICAS', nome: 'Acondicionar, conservar, refrigerar e congelar', uc: ['UC03585','UC03584'], tecnicaMaeId: 'T15', palavrasChave: ['acondicionar','conservar','refrigerar','congelar'], criterios: [{ criterio: "Armazena produtos em recipientes adequados e etiquetados (produto, data, validade)", como: "Verificação das etiquetas." }, { criterio: "Respeita as temperaturas de conservação: <5°C refrigerado, <-18°C congelado", como: "Verificação do termómetro do equipamento." }, { criterio: "Aplica o princípio FIFO — primeiro a entrar, primeiro a sair", como: "Observação direta da organização do frio." }, { criterio: "Não recongela produtos já descongelados", como: "Observação direta e questão oral." }] },
  { id: 'S016', categoria: 'TECNICAS', nome: 'Regenerar alimentos', uc: ['UC03585'], tecnicaMaeId: 'T15', palavrasChave: ['regenerar','reaquecer'] },
  { id: 'S017', categoria: 'TECNICAS', nome: 'Abater temperatura', uc: ['UC03585','UC03584'], tecnicaMaeId: 'T15', palavrasChave: ['abater temperatura','abatimento','arrefecer rapidamente'], criterios: [{ criterio: "Abate a temperatura do alimento de >65°C para <10°C em menos de 2 horas", como: "Observação direta — uso de abatedor ou banho de gelo." }, { criterio: "Usa o método correto: banho de gelo, abatedor ou divisão em porções pequenas", como: "Observação direta." }, { criterio: "Verifica e regista a temperatura final após abatimento", como: "Verificação do registo KitchenFlow." }, { criterio: "Não deixa arrefecer à temperatura ambiente (zona de perigo)", como: "Observação direta." }] },

  // ================================================================
  // PREPARAÇÃO DE MATÉRIAS-PRIMAS — VEGETAIS — mãe: T03
  // ================================================================
  { id: 'S020', categoria: 'TECNICAS', nome: 'Lavar vegetais', uc: ['UC01999','UC03584'], tecnicaMaeId: 'T03', palavrasChave: ['lavar vegetais','lavar legumes'] },
  { id: 'S021', categoria: 'TECNICAS', nome: 'Desinfetar vegetais', uc: ['UC01999','UC03584'], tecnicaMaeId: 'T03', palavrasChave: ['desinfetar vegetais','desinfetar legumes'] },
  { id: 'S022', categoria: 'TECNICAS', nome: 'Descascar legumes', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['descascar','descascar legumes','descascar batatas','descascar cenoura'] },
  { id: 'S023', categoria: 'TECNICAS', nome: 'Tornear legumes', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['tornear'] },
  { id: 'S024', categoria: 'TECNICAS', nome: 'Cortar legumes', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['cortar legumes','cortar vegetais','cortar cebola','cortar cenoura'] },
  { id: 'S025', categoria: 'TECNICAS', nome: 'Cortar fruta', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['cortar fruta'] },
  { id: 'S026', categoria: 'TECNICAS', nome: 'Preparar ervas aromáticas e especiarias', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['ervas aromáticas','especiarias','salsa','coentros','alho','picar alho'] },

  // ================================================================
  // PREPARAÇÃO DE MATÉRIAS-PRIMAS — PEIXE — mãe: T05
  // ================================================================
  { id: 'S030', categoria: 'TECNICAS', nome: 'Escamar peixe', uc: ['UC01999','UC02003'], tecnicaMaeId: 'T05', palavrasChave: ['escamar','escamas'] },
  { id: 'S031', categoria: 'TECNICAS', nome: 'Eviscerar peixe', uc: ['UC01999','UC02003'], tecnicaMaeId: 'T05', palavrasChave: ['eviscerar','vísceras'] },
  { id: 'S032', categoria: 'TECNICAS', nome: 'Filetar peixe', uc: ['UC01999','UC02003'], tecnicaMaeId: 'T05', palavrasChave: ['filetar','filete','filetes','filetagem'] },
  { id: 'S033', categoria: 'TECNICAS', nome: 'Retirar espinhas / despinhar', uc: ['UC01999','UC02003'], tecnicaMaeId: 'T05', palavrasChave: ['espinhas','despinhar','retirar espinhas','bacalhau'] },
  { id: 'S034', categoria: 'TECNICAS', nome: 'Porcionar peixe', uc: ['UC02003'], tecnicaMaeId: 'T05', palavrasChave: ['porcionar peixe'] },
  { id: 'S035', categoria: 'TECNICAS', nome: 'Preparar marisco (abrir, descascar, cozer)', uc: ['UC02003'], tecnicaMaeId: 'T05', palavrasChave: ['marisco','abrir marisco','descascar marisco','cozer marisco','amêijoa','camarão','lagosta'] },
  { id: 'S036', categoria: 'TECNICAS', nome: 'Marinar peixe', uc: ['UC02003'], tecnicaMaeId: 'T05', palavrasChave: ['marinar peixe','marinada'] },

  // ================================================================
  // PREPARAÇÃO DE MATÉRIAS-PRIMAS — CARNE/AVES/CAÇA — mãe: T04
  // ================================================================
  { id: 'S040', categoria: 'TECNICAS', nome: 'Aparar carne', uc: ['UC01999','UC02004'], tecnicaMaeId: 'T04', palavrasChave: ['aparar carne','aparar'] },
  { id: 'S041', categoria: 'TECNICAS', nome: 'Desossar carne', uc: ['UC01999','UC02004'], tecnicaMaeId: 'T04', palavrasChave: ['desossar','ossos'] },
  { id: 'S042', categoria: 'TECNICAS', nome: 'Atar carne', uc: ['UC02004'], tecnicaMaeId: 'T04', palavrasChave: ['atar carne','atar'] },
  { id: 'S043', categoria: 'TECNICAS', nome: 'Porcionar carne', uc: ['UC02004'], tecnicaMaeId: 'T04', palavrasChave: ['porcionar carne'] },
  { id: 'S044', categoria: 'TECNICAS', nome: 'Preparar aves', uc: ['UC02004'], tecnicaMaeId: 'T04', palavrasChave: ['preparar aves','frango','pato','peru','galinha'] },
  { id: 'S045', categoria: 'TECNICAS', nome: 'Preparar caça', uc: ['UC02004'], tecnicaMaeId: 'T04', palavrasChave: ['caça','perdiz','coelho','veado'] },
  { id: 'S046', categoria: 'TECNICAS', nome: 'Preparar ovos', uc: ['UC02002'], tecnicaMaeId: 'T04', palavrasChave: ['preparar ovos'] },
  { id: 'S047', categoria: 'TECNICAS', nome: 'Marinar carne', uc: ['UC02004'], tecnicaMaeId: 'T04', palavrasChave: ['marinar carne','marinada'] },
  { id: 'S048', categoria: 'TECNICAS', nome: 'Lardear / bardar carne', uc: ['UC02004'], tecnicaMaeId: 'T04', palavrasChave: ['lardear','bardar'] },

  // ================================================================
  // TÉCNICAS DE CORTE — mãe: T03
  // ================================================================
  { id: 'S050', categoria: 'TECNICAS', nome: 'Juliana', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['juliana','tiras finas'], criterios: [{ criterio: "Obtém tiras uniformes de 5cm × 2mm × 2mm", como: "Observação direta — verificar uniformidade." }, { criterio: "Executa a técnica de garra corretamente (nós dos dedos como guia)", como: "Observação direta — segurança." }, { criterio: "Mantém ritmo constante sem perder a uniformidade do corte", como: "Observação direta." }, { criterio: "Aproveita as aparas para outras preparações (caldo, fundo)", como: "Observação direta." }] },
  { id: 'S051', categoria: 'TECNICAS', nome: 'Brunoise', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['brunoise','cubos pequenos'], criterios: [{ criterio: "Obtém cubos regulares de 2-3mm nos três eixos, a partir de juliana prévia", como: "Observação direta — verificar uniformidade." }, { criterio: "Executa a sequência correta: juliana → brunoise (não salta etapas)", como: "Observação direta." }, { criterio: "Mantém garra segura e ritmo constante", como: "Observação direta — segurança." }, { criterio: "Aproveita aparas para fundos ou outras preparações", como: "Observação direta." }] },
  { id: 'S052', categoria: 'TECNICAS', nome: 'Macedoine', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['macedoine','macedónia','cubos médios'] },
  { id: 'S053', categoria: 'TECNICAS', nome: 'Jardineira', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['jardineira','bastões','cubos grandes'] },
  { id: 'S054', categoria: 'TECNICAS', nome: 'Mirepoix', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['mirepoix','aromáticos'] },
  { id: 'S055', categoria: 'TECNICAS', nome: 'Paysanne', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['paysanne'] },
  { id: 'S056', categoria: 'TECNICAS', nome: 'Chiffonade', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['chiffonade','tiras folhas'] },
  { id: 'S057', categoria: 'TECNICAS', nome: 'Concassé (tomate)', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['concassé','tomate concassé','tomate pelado'] },
  { id: 'S058', categoria: 'TECNICAS', nome: 'Corte em rodelas / gomos / bastões / cubos', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['rodelas','gomos','bastões','cubos'] },
  { id: 'S059', categoria: 'TECNICAS', nome: 'Laminar', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['laminar','lâminas'] },
  { id: 'S060', categoria: 'TECNICAS', nome: 'Picar', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['picar','picado'] },
  { id: 'S061', categoria: 'TECNICAS', nome: 'Corte de batata palito', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['batata palito','palito'] },
  { id: 'S062', categoria: 'TECNICAS', nome: 'Corte de batata chips', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['batata chips','chips'] },
  { id: 'S063', categoria: 'TECNICAS', nome: 'Corte de batata ponte nova', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['ponte nova','batata ponte nova'] },
  { id: 'S064', categoria: 'TECNICAS', nome: 'Batata noisette', uc: ['UC01999'], tecnicaMaeId: 'T03', palavrasChave: ['batata noisette','noisette'] },

  // ================================================================
  // FUNDOS, CALDOS E MOLHOS — mãe: T07 (sopas/fundos) / T13 (molhos)
  // ================================================================
  { id: 'S070', categoria: 'TECNICAS', nome: 'Preparar fundo branco', uc: ['UC02002','UC02003'], tecnicaMaeId: 'T07', palavrasChave: ['fundo branco','caldo branco'] },
  { id: 'S071', categoria: 'TECNICAS', nome: 'Preparar fundo escuro', uc: ['UC02002','UC02004'], tecnicaMaeId: 'T07', palavrasChave: ['fundo escuro','caldo escuro'] },
  { id: 'S072', categoria: 'TECNICAS', nome: 'Preparar fumet (fundo de peixe)', uc: ['UC02003'], tecnicaMaeId: 'T07', palavrasChave: ['fumet','fundo de peixe'] },
  { id: 'S073', categoria: 'TECNICAS', nome: 'Preparar consommé', uc: ['UC02002'], tecnicaMaeId: 'T07', palavrasChave: ['consommé','caldo clarificado'] },
  { id: 'S074', categoria: 'TECNICAS', nome: 'Preparar velouté', uc: ['UC02002'], tecnicaMaeId: 'T07', palavrasChave: ['velouté'] },
  { id: 'S075', categoria: 'TECNICAS', nome: 'Preparar béchamel', uc: ['UC02002'], tecnicaMaeId: 'T13', palavrasChave: ['béchamel','molho branco'], criterios: [{ criterio: "Prepara o roux na proporção correta (partes iguais de gordura e farinha)", como: "Observação direta." }, { criterio: "Adiciona o leite aquecido progressivamente mexendo sempre para evitar grumos", como: "Observação direta da técnica." }, { criterio: "Coze o béchamel o tempo suficiente para eliminar o sabor a farinha crua", como: "Prova do molho — sem sabor a farinha." }, { criterio: "Obtém a consistência certa para o uso pretendido (molho, lasanha, croquetes)", como: "Avaliação visual e prova." }] },
  { id: 'S076', categoria: 'TECNICAS', nome: 'Preparar molho espanhol', uc: ['UC02004'], tecnicaMaeId: 'T13', palavrasChave: ['molho espanhol'] },
  { id: 'S077', categoria: 'TECNICAS', nome: 'Preparar molho de tomate', uc: ['UC02002','UC02004'], tecnicaMaeId: 'T13', palavrasChave: ['molho de tomate','molho tomate'] },
  { id: 'S078', categoria: 'TECNICAS', nome: 'Preparar molho holandês', uc: ['UC02002'], tecnicaMaeId: 'T13', palavrasChave: ['holandês','molho holandês'] },
  { id: 'S079', categoria: 'TECNICAS', nome: 'Preparar maionese / vinagrete', uc: ['UC02002'], tecnicaMaeId: 'T13', palavrasChave: ['maionese','vinagrete'] },
  { id: 'S080', categoria: 'TECNICAS', nome: 'Preparar roux / beurre manié', uc: ['UC02002'], tecnicaMaeId: 'T13', palavrasChave: ['roux','beurre manié'] },
  { id: 'S081', categoria: 'TECNICAS', nome: 'Emulsionar molho', uc: ['UC02002','UC02004'], tecnicaMaeId: 'T13', palavrasChave: ['emulsionar','emulsão'] },
  { id: 'S082', categoria: 'TECNICAS', nome: 'Reduzir molho', uc: ['UC02002','UC02004'], tecnicaMaeId: 'T13', palavrasChave: ['reduzir','redução'] },
  { id: 'S083', categoria: 'TECNICAS', nome: 'Ligar molho', uc: ['UC02002'], tecnicaMaeId: 'T13', palavrasChave: ['ligar molho','ligar'] },
  { id: 'S084', categoria: 'TECNICAS', nome: 'Montar molho com manteiga', uc: ['UC02002'], tecnicaMaeId: 'T13', palavrasChave: ['montar molho','montar com manteiga'] },
  { id: 'S085', categoria: 'TECNICAS', nome: 'Afinar / retificar temperos', uc: ['UC02002','UC02003','UC02004'], tecnicaMaeId: 'T13', palavrasChave: ['afinar','retificar','temperos','temperar'] },
  { id: 'S086', categoria: 'TECNICAS', nome: 'Desglasar', uc: ['UC02004'], tecnicaMaeId: 'T13', palavrasChave: ['desglasar'] },
  { id: 'S087', categoria: 'TECNICAS', nome: 'Aromatizar / infusionar', uc: ['UC02002','UC02003','UC02004'], tecnicaMaeId: 'T13', palavrasChave: ['aromatizar','infusionar','infusão'] },

  // ================================================================
  // TÉCNICAS DE CONFEÇÃO — mãe: T06
  // ================================================================
  { id: 'S090', categoria: 'TECNICAS', nome: 'Cozer em água', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['cozer','cozer em água','cozido'] },
  { id: 'S091', categoria: 'TECNICAS', nome: 'Cozer a vapor', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['cozer a vapor','vapor'] },
  { id: 'S092', categoria: 'TECNICAS', nome: 'Escalfar', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['escalfar','escalfado'] },
  { id: 'S093', categoria: 'TECNICAS', nome: 'Escaldar e branquear', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['escaldar','branquear','branqueamento'] },
  { id: 'S094', categoria: 'TECNICAS', nome: 'Refogar', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['refogar','refogado','refogar cebola','refogar alho'], criterios: [{ criterio: "Aquece o azeite/gordura à temperatura certa antes de adicionar os ingredientes", como: "Observação direta — nenhum produto é adicionado antes de a gordura estar quente." }, { criterio: "Adiciona os ingredientes por ordem correta (mais duros primeiro)", como: "Observação direta." }, { criterio: "Mexe regularmente evitando que queime; ajusta o lume quando necessário", como: "Observação direta." }, { criterio: "Obtém o ponto certo: cebola/alho translúcidos e macios sem queimar", como: "Avaliação visual e prova." }] },
  { id: 'S095', categoria: 'TECNICAS', nome: 'Saltear', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['saltear','salteado'], criterios: [{ criterio: "Usa frigideira/wok bem quente com pouca gordura (não cozinha em imersão)", como: "Observação direta — temperatura e quantidade de gordura." }, { criterio: "Adiciona os alimentos em pequenas quantidades para não baixar a temperatura", como: "Observação direta." }, { criterio: "Usa o movimento de salto ou espátula para garantir cozedura uniforme", como: "Observação direta da técnica." }, { criterio: "Obtém textura exterior ligeiramente dourada e interior cozinhado", como: "Avaliação visual e prova." }] },
  { id: 'S096', categoria: 'TECNICAS', nome: 'Suar', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['suar'] },
  { id: 'S097', categoria: 'TECNICAS', nome: 'Estufar', uc: ['UC01999','UC02004'], tecnicaMaeId: 'T06', palavrasChave: ['estufar','estufado'] },
  { id: 'S098', categoria: 'TECNICAS', nome: 'Guisar', uc: ['UC01999','UC02004'], tecnicaMaeId: 'T06', palavrasChave: ['guisar','guisado'] },
  { id: 'S099', categoria: 'TECNICAS', nome: 'Brasear', uc: ['UC01999','UC02004'], tecnicaMaeId: 'T06', palavrasChave: ['brasear','braseado'] },
  { id: 'S100', categoria: 'TECNICAS', nome: 'Grelhar', uc: ['UC01999','UC02003','UC02004'], tecnicaMaeId: 'T06', palavrasChave: ['grelhar','grelhado','grelha','chapa'], criterios: [{ criterio: "Aquece a grelha/chapa ao máximo antes de colocar o produto", como: "Observação direta — grelha fumegante antes do uso." }, { criterio: "Não move o produto nos primeiros momentos (para obter marcas de grelha)", como: "Observação direta." }, { criterio: "Verifica o ponto de cozedura pelo toque ou temperatura interna", como: "Observação direta — uso de termómetro de sonda." }, { criterio: "Tempera no momento correto (não antes de grelhar carnes — perde sucos)", como: "Observação direta." }] },
  { id: 'S101', categoria: 'TECNICAS', nome: 'Assar', uc: ['UC01999','UC02003','UC02004'], tecnicaMaeId: 'T06', palavrasChave: ['assar','assado','forno'], criterios: [{ criterio: "Pré-aquece o forno à temperatura correta para o produto", como: "Observação direta — forno ligado antes de iniciar a produção." }, { criterio: "Posiciona o produto corretamente no forno (prateleira, posição)", como: "Observação direta." }, { criterio: "Verifica a cozedura pelo aspeto visual, palito ou temperatura interna", como: "Observação direta — não abre o forno desnecessariamente." }, { criterio: "Respeita o tempo de repouso após assar (carnes, pão)", como: "Observação direta." }] },
  { id: 'S102', categoria: 'TECNICAS', nome: 'Gratinar', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['gratinar','gratinado'] },
  { id: 'S103', categoria: 'TECNICAS', nome: 'Selar carne', uc: ['UC02004'], tecnicaMaeId: 'T06', palavrasChave: ['selar','selar carne'] },
  { id: 'S104', categoria: 'TECNICAS', nome: 'Fritar peixe', uc: ['UC01999','UC02003'], tecnicaMaeId: 'T06', palavrasChave: ['fritar peixe'] },
  { id: 'S105', categoria: 'TECNICAS', nome: 'Fritar carne / produtos panados', uc: ['UC01999','UC02004'], tecnicaMaeId: 'T06', palavrasChave: ['fritar carne','panados','panar','fritar frango'] },
  { id: 'S106', categoria: 'TECNICAS', nome: 'Fritar batatas e controlar temperatura de fritura', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['fritar batata','batatas fritas','batata frita','temperatura fritura'] },
  { id: 'S107', categoria: 'TECNICAS', nome: 'Confitar', uc: ['UC03589','UC03596'], tecnicaMaeId: 'T06', palavrasChave: ['confitar','confit'] },
  { id: 'S108', categoria: 'TECNICAS', nome: 'Fumar / desidratar', uc: ['UC03589'], tecnicaMaeId: 'T06', palavrasChave: ['fumar','desidratar','fumado'] },
  { id: 'S109', categoria: 'TECNICAS', nome: 'Cozinhar a baixa temperatura / sous-vide', uc: ['UC03596'], tecnicaMaeId: 'T32', palavrasChave: ['baixa temperatura','sous-vide','vácuo'] },
  { id: 'S110', categoria: 'TECNICAS', nome: 'Caramelizar', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['caramelizar','caramelizado'] },
  { id: 'S111', categoria: 'TECNICAS', nome: 'Flambar', uc: ['UC02004'], tecnicaMaeId: 'T06', palavrasChave: ['flambar','flambado'] },
  { id: 'S112', categoria: 'TECNICAS', nome: 'Tostar / dourar', uc: ['UC01999'], tecnicaMaeId: 'T06', palavrasChave: ['tostar','dourar','tostado'] },

  // ================================================================
  // SOPAS E ENTRADAS — mãe: T07 / T08
  // ================================================================
  { id: 'S120', categoria: 'TECNICAS', nome: 'Preparar sopa', uc: ['UC02002'], tecnicaMaeId: 'T07', palavrasChave: ['sopa','caldo verde','canja'], criterios: [{ criterio: "Prepara o refogado base corretamente (gordura, cebola, alho) antes de adicionar os restantes ingredientes", como: "Observação direta." }, { criterio: "Adiciona os ingredientes por ordem de tempo de cozedura", como: "Observação direta." }, { criterio: "Prova e retifica os temperos no final", como: "Observação direta — uso de colher de provar." }, { criterio: "Obtém textura e consistência adequadas ao tipo de sopa", como: "Avaliação visual e prova." }] },
  { id: 'S121', categoria: 'TECNICAS', nome: 'Preparar creme / aveludado / puré', uc: ['UC02002'], tecnicaMaeId: 'T07', palavrasChave: ['creme','aveludado','puré'] },
  { id: 'S122', categoria: 'TECNICAS', nome: 'Preparar entrada fria ou quente', uc: ['UC02002'], tecnicaMaeId: 'T08', palavrasChave: ['entrada fria','entrada quente'] },
  { id: 'S123', categoria: 'TECNICAS', nome: 'Preparar acepipe', uc: ['UC02002'], tecnicaMaeId: 'T08', palavrasChave: ['acepipe'] },

  // ================================================================
  // OVOS E MASSAS — mãe: T09
  // ================================================================
  { id: 'S130', categoria: 'TECNICAS', nome: 'Preparar ovos mexidos', uc: ['UC02002'], tecnicaMaeId: 'T09', palavrasChave: ['ovos mexidos','ovos'] },
  { id: 'S131', categoria: 'TECNICAS', nome: 'Preparar omelete', uc: ['UC02002'], tecnicaMaeId: 'T09', palavrasChave: ['omelete'] },
  { id: 'S132', categoria: 'TECNICAS', nome: 'Preparar ovo escalfado / cozido', uc: ['UC02002'], tecnicaMaeId: 'T09', palavrasChave: ['ovo escalfado','ovo cozido'] },
  { id: 'S133', categoria: 'TECNICAS', nome: 'Preparar massa fresca / recheada', uc: ['UC02002'], tecnicaMaeId: 'T09', palavrasChave: ['massa fresca','massa recheada','pasta fresca'] },
  { id: 'S134', categoria: 'TECNICAS', nome: 'Cozer massa (al dente)', uc: ['UC02002'], tecnicaMaeId: 'T09', palavrasChave: ['cozer massa','massa al dente','esparguete','pasta'] },
  { id: 'S135', categoria: 'TECNICAS', nome: 'Preparar risotto', uc: ['UC02002'], tecnicaMaeId: 'T09', palavrasChave: ['risotto','arroz'] },

  // ================================================================
  // PEIXE E MARISCO — mãe: T10
  // ================================================================
  { id: 'S140', categoria: 'TECNICAS', nome: 'Confecionar peixe', uc: ['UC02003'], tecnicaMaeId: 'T10', palavrasChave: ['bacalhau','salmão','garoupa','robalo','dourada','atum','peixe'] },
  { id: 'S141', categoria: 'TECNICAS', nome: 'Confecionar marisco', uc: ['UC02003'], tecnicaMaeId: 'T10', palavrasChave: ['marisco','amêijoa','camarão','lagosta','sapateira'] },
  { id: 'S142', categoria: 'TECNICAS', nome: 'Preparar guarnições para peixe/marisco', uc: ['UC02003'], tecnicaMaeId: 'T14', palavrasChave: ['guarnição de peixe','acompanhamento de peixe'] },
  { id: 'S143', categoria: 'TECNICAS', nome: 'Empratar peixe e marisco', uc: ['UC02003'], tecnicaMaeId: 'T14', palavrasChave: ['empratar peixe','empratar marisco'] },

  // ================================================================
  // CARNE, AVES E CAÇA — mãe: T11
  // ================================================================
  { id: 'S150', categoria: 'TECNICAS', nome: 'Selar, assar, estufar ou grelhar carne', uc: ['UC02004'], tecnicaMaeId: 'T11', palavrasChave: ['frango','vitela','vaca','porco','pato','borrego','carne'] },
  { id: 'S151', categoria: 'TECNICAS', nome: 'Preparar molhos para carne/aves/caça', uc: ['UC02004'], tecnicaMaeId: 'T11', palavrasChave: ['molho de carne','jus','glacé de viande'] },
  { id: 'S152', categoria: 'TECNICAS', nome: 'Preparar guarnições para carne', uc: ['UC02004'], tecnicaMaeId: 'T11', palavrasChave: ['guarnição de carne','acompanhamento'] },
  { id: 'S153', categoria: 'TECNICAS', nome: 'Empratar carne, aves ou caça', uc: ['UC02004'], tecnicaMaeId: 'T14', palavrasChave: ['empratar carne','empratar aves','empratar caça'] },
  { id: 'S154', categoria: 'TECNICAS', nome: 'Trinchar carne ou aves', uc: ['UC02004','UC03591'], tecnicaMaeId: 'T11', palavrasChave: ['trinchar'] },

  // ================================================================
  // PASTELARIA — mãe: T12 / T13
  // ================================================================
  { id: 'S160', categoria: 'TECNICAS', nome: 'Preparar massa areada (sablage)', uc: ['UC02005'], tecnicaMaeId: 'T12', palavrasChave: ['massa areada','sablage','tarte'] },
  { id: 'S161', categoria: 'TECNICAS', nome: 'Preparar massa folhada (laminar)', uc: ['UC02005'], tecnicaMaeId: 'T12', palavrasChave: ['massa folhada','laminar','laminação','mil folhas'] },
  { id: 'S162', categoria: 'TECNICAS', nome: 'Preparar massa lêveda / brioche', uc: ['UC02005','UC03593'], tecnicaMaeId: 'T12', palavrasChave: ['massa lêveda','brioche'] },
  { id: 'S163', categoria: 'TECNICAS', nome: 'Preparar pâte à choux', uc: ['UC02005'], tecnicaMaeId: 'T12', palavrasChave: ['pâte à choux','massa choux','éclair','profiteroles'] },
  { id: 'S164', categoria: 'TECNICAS', nome: 'Preparar creme pasteleiro', uc: ['UC02005'], tecnicaMaeId: 'T13', palavrasChave: ['creme pasteleiro','creme de pasteleiro','creme patissiere','custard cream'], criterios: [{ criterio: "Aquece o leite até ao ponto de fervura antes de verter sobre as gemas", como: "Observação direta." }, { criterio: "Tempera as gemas com o leite quente progressivamente (não cozinhar as gemas)", como: "Observação direta da técnica." }, { criterio: "Mexe continuamente durante a cozedura para evitar grumos e queimar", como: "Observação direta." }, { criterio: "Arrefece imediatamente com película aderente em contacto para evitar crosta", como: "Observação direta do acondicionamento." }] },
  { id: 'S164B', categoria: 'TECNICAS', nome: 'Preparar creme de natas', uc: ['UC02005'], tecnicaMaeId: 'T13', palavrasChave: ['creme de nata','creme de natas','creme chantilly','chantilly','creme batido','natas batidas'] },
  { id: 'S164C', categoria: 'TECNICAS', nome: 'Confeção de pastel de nata', uc: ['UC02005'], tecnicaMaeId: 'T13', palavrasChave: ['pastel de nata','pasteis de nata','pastel de belém','pasteis de belem'] },
  { id: 'S165', categoria: 'TECNICAS', nome: 'Preparar creme inglês', uc: ['UC02005'], tecnicaMaeId: 'T13', palavrasChave: ['creme inglês','creme ingles','crème anglaise','anglaise'] },
  { id: 'S166', categoria: 'TECNICAS', nome: 'Preparar ganache', uc: ['UC02005','UC03592'], tecnicaMaeId: 'T13', palavrasChave: ['ganache','chocolate'] },
  { id: 'S167', categoria: 'TECNICAS', nome: 'Preparar merengue (francês / italiano / suíço)', uc: ['UC02005','UC03592'], tecnicaMaeId: 'T13', palavrasChave: ['merengue','merengue francês','merengue italiano','merengue suíço'], criterios: [{ criterio: "Usa tigela e batedor completamente limpos e sem gordura (caso contrário as claras não montam)", como: "Observação direta — verificar higiene dos utensílios." }, { criterio: "Adiciona o açúcar progressivamente e não de uma vez", como: "Observação direta." }, { criterio: "Obtém o ponto certo: bico firme (picos firmes) para merengue francês", como: "Observação direta — testar com a tigela virada ao contrário." }, { criterio: "Distingue e aplica corretamente o tipo certo de merengue para a preparação", como: "Questão oral ou observação direta." }] },
  { id: 'S168', categoria: 'TECNICAS', nome: 'Preparar sabayon', uc: ['UC02005'], tecnicaMaeId: 'T13', palavrasChave: ['sabayon'] },
  { id: 'S169', categoria: 'TECNICAS', nome: 'Temperar chocolate', uc: ['UC03592'], tecnicaMaeId: 'T13', palavrasChave: ['temperar chocolate','chocolate temperado'] },
  { id: 'S170', categoria: 'TECNICAS', nome: 'Preparar recheios e coberturas', uc: ['UC02005'], tecnicaMaeId: 'T13', palavrasChave: ['recheio','cobertura','glacé'] },
  { id: 'S171', categoria: 'TECNICAS', nome: 'Decorar sobremesas e bolos', uc: ['UC02005','UC03592'], tecnicaMaeId: 'T14', palavrasChave: ['decorar sobremesa','decorar bolo'] },

  // ================================================================
  // PANIFICAÇÃO — mãe: T30 / T33
  // ================================================================
  { id: 'S180', categoria: 'TECNICAS', nome: 'Preparar e amassar massa de pão', uc: ['UC03593'], tecnicaMaeId: 'T30', palavrasChave: ['massa de pão','amassar','pão'] },
  { id: 'S181', categoria: 'TECNICAS', nome: 'Fermentar massa', uc: ['UC03593'], tecnicaMaeId: 'T30', palavrasChave: ['fermentar','fermentação','levedura'] },
  { id: 'S182', categoria: 'TECNICAS', nome: 'Moldar e cozer pão', uc: ['UC03593'], tecnicaMaeId: 'T30', palavrasChave: ['moldar pão','cozer pão','assar pão'] },
  { id: 'S183', categoria: 'TECNICAS', nome: 'Produzir massas especiais de panificação', uc: ['UC03597'], tecnicaMaeId: 'T33', palavrasChave: ['massa especial','sem glúten','integral'] },

  // ================================================================
  // EMPRATAMENTO E SERVIÇO — mãe: T14 / T28
  // ================================================================
  { id: 'S190', categoria: 'TECNICAS', nome: 'Empratar entrada / prato principal / sobremesa', uc: ['UC02002','UC02003','UC02004','UC02005'], tecnicaMaeId: 'T14', palavrasChave: ['empratar','empratamento'] },
  { id: 'S191', categoria: 'TECNICAS', nome: 'Decorar prato', uc: ['UC02002','UC02003','UC02004','UC02005'], tecnicaMaeId: 'T14', palavrasChave: ['decorar prato','decoração','apresentação'] },
  { id: 'S192', categoria: 'TECNICAS', nome: 'Organizar passe e articular com sala', uc: ['UC03591','UC03580'], tecnicaMaeId: 'T28', palavrasChave: ['passe','serviço de cozinha','articular com sala'] },
  { id: 'S193', categoria: 'TECNICAS', nome: 'Executar serviço à la minute', uc: ['UC03580'], tecnicaMaeId: 'T28', palavrasChave: ['à la minute','serviço à la minute'] },
  { id: 'S194', categoria: 'TECNICAS', nome: 'Manter alimentos em quente / frio para serviço', uc: ['UC03584'], tecnicaMaeId: 'T15', palavrasChave: ['manter quente','manter frio','manter temperatura'] },

  // ================================================================
  // HIGIENE E SEGURANÇA ALIMENTAR — mãe: T19 / T20
  // ================================================================
  { id: 'S200', categoria: 'TECNICAS', nome: 'Lavar mãos corretamente', uc: ['UC03584'], tecnicaMaeId: 'T20', palavrasChave: ['lavar mãos','lavagem de mãos'], criterios: [{ criterio: "Lava as mãos durante ≥20 segundos com sabão antes de entrar na cozinha e após cada interrupção", como: "Observação direta — cronometrar se necessário." }, { criterio: "Usa técnica correta: fricção entre dedos, polegar, dorso e pulsos", como: "Observação direta." }, { criterio: "Seca com papel descartável (nunca toalha de pano partilhada)", como: "Observação direta." }, { criterio: "Repete a lavagem após tocar em superfícies contaminadas, lixo ou cabelo", como: "Observação direta ao longo da aula." }] },
  { id: 'S201', categoria: 'TECNICAS', nome: 'Utilizar touca e EPI', uc: ['UC03584'], tecnicaMaeId: 'T20', palavrasChave: ['touca','epi','equipamento proteção'], criterios: [{ criterio: "Apresenta-se com fardamento completo: touca, avental, calças e sapatos adequados", como: "Observação direta na entrada." }, { criterio: "Sem adornos (relógio, anéis, pulseiras) nem unhas compridas/pintadas", como: "Observação direta." }, { criterio: "Usa luvas quando necessário (produtos químicos, cortes, alergénios)", como: "Observação direta." }, { criterio: "Mantém o fardamento limpo durante toda a produção", como: "Observação direta ao longo da aula." }] },
  { id: 'S202', categoria: 'TECNICAS', nome: 'Higienizar bancada, equipamentos e utensílios', uc: ['UC03584'], tecnicaMaeId: 'T20', palavrasChave: ['higienizar bancada','higienizar equipamento','higienizar utensílio','desinfetar bancada'], criterios: [{ criterio: "Higieniza a bancada antes de começar e entre tarefas com produtos diferentes", como: "Observação direta." }, { criterio: "Usa o produto correto na concentração certa (detergente + desinfetante, não misturar)", como: "Observação direta — verificar rótulo do produto." }, { criterio: "Respeita o tempo de contacto do desinfetante antes de enxaguar", como: "Observação direta." }, { criterio: "Higieniza utensílios e equipamentos após uso com produto de cru", como: "Observação direta — tábuas de corte, facas, recipientes." }] },
  { id: 'S203', categoria: 'TECNICAS', nome: 'Registar temperaturas', uc: ['UC03584'], tecnicaMaeId: 'T19', palavrasChave: ['registar temperatura','controlo temperatura'], criterios: [{ criterio: "Regista a temperatura dos equipamentos de frio no início da aula", como: "Verificação do registo KitchenFlow ou folha HACCP." }, { criterio: "Usa termómetro de sonda corretamente (desinfetar antes e depois)", como: "Observação direta." }, { criterio: "Regista temperatura do alimento com produto, valor e hora", como: "Verificação do registo — todos os campos preenchidos." }, { criterio: "Identifica e comunica desvios (zona de perigo 5°C–65°C)", como: "Observação direta ou relato ao professor." }] },
  { id: 'S204', categoria: 'TECNICAS', nome: 'Preencher registos HACCP', uc: ['UC03584'], tecnicaMaeId: 'T19', palavrasChave: ['registos haccp','preencher registos'], criterios: [{ criterio: "Preenche todos os campos obrigatórios do registo sem ser solicitado", como: "Verificação do KitchenFlow no final da aula." }, { criterio: "Identifica os PCC da produção em curso e regista as medidas de controlo", como: "Análise do registo e questão oral." }, { criterio: "Assinatura, data e hora presentes em todos os registos", como: "Verificação do registo." }, { criterio: "Regista não conformidades quando detetadas e aplica medida corretiva", como: "Verificação do registo e observação." }] },
  { id: 'S205', categoria: 'TECNICAS', nome: 'Identificar não conformidades e aplicar medidas corretivas', uc: ['UC03584'], tecnicaMaeId: 'T19', palavrasChave: ['não conformidade','medida corretiva'], criterios: [{ criterio: "Identifica situações de não conformidade (temperatura, validade, contaminação)", como: "Observação direta ou relato ao professor." }, { criterio: "Comunica imediatamente ao professor qualquer não conformidade grave", como: "Observação direta." }, { criterio: "Aplica a medida corretiva adequada (isolar produto, rejeitar, registar)", como: "Observação direta da ação tomada." }, { criterio: "Regista a não conformidade e a medida corretiva no KitchenFlow", como: "Verificação do registo." }] },
  { id: 'S206', categoria: 'TECNICAS', nome: 'Controlar contaminação cruzada', uc: ['UC03584'], tecnicaMaeId: 'T19', palavrasChave: ['contaminação cruzada'], criterios: [{ criterio: "Usa tábuas de corte de cor diferente para cru e cozinhado", como: "Observação direta." }, { criterio: "Nunca coloca alimentos prontos em superfície que teve contacto com cru", como: "Observação direta." }, { criterio: "Troca luvas ou lava mãos entre manipulação de cru e cozinhado", como: "Observação direta." }, { criterio: "Armazena alimentos crus em baixo e prontos em cima no frigorífico", como: "Observação direta — organização do frio." }] },

  // ================================================================
  // SUSTENTABILIDADE — mãe: T27
  // ================================================================
  { id: 'S210', categoria: 'TECNICAS', nome: 'Separar resíduos', uc: ['UC03590'], tecnicaMaeId: 'T27', palavrasChave: ['separar resíduos','reciclagem'] },
  { id: 'S211', categoria: 'TECNICAS', nome: 'Reduzir desperdício alimentar e aproveitar subprodutos', uc: ['UC03590'], tecnicaMaeId: 'T27', palavrasChave: ['desperdício','subprodutos','aproveitamento'] },
  { id: 'S212', categoria: 'TECNICAS', nome: 'Aplicar economia circular', uc: ['UC03590'], tecnicaMaeId: 'T27', palavrasChave: ['economia circular','sustentabilidade'] },
  { id: 'S213', categoria: 'TECNICAS', nome: 'Gerir consumos de água e energia', uc: ['UC03590'], tecnicaMaeId: 'T27', palavrasChave: ['consumo água','consumo energia','poupança'] },
];

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Dado o texto de uma receita, devolve as subtécnicas relevantes.
 * Usa guards por categoria (peixe/carne/pastelaria/sopa) para evitar falsos
 * positivos — ex: a palavra "lombo" numa receita de carne já não sugere
 * por engano uma técnica de "Lombo de bacalhau". */
export function sugerirSubtecnicas(textoReceita: string): Competencia[] {
  if (!textoReceita || textoReceita.trim().length < 10) return [];
  const textoNorm = normalizarTextoSub(textoReceita);
  const temPeixe = grupoAtivoSub(textoNorm, 'PEIXE');
  const temCarne = grupoAtivoSub(textoNorm, 'CARNE');
  const temPastelaria = grupoAtivoSub(textoNorm, 'PASTELARIA');
  const temSopa = grupoAtivoSub(textoNorm, 'SOPAS');

  const candidatos = SUBTECNICAS.filter(s => {
    if (!s.palavrasChave || s.palavrasChave.length === 0) return false;
    // Exclusões rigorosas por categoria — mesmo critério usado nas UCs de peixe/carne
    if (['S030','S031','S032','S033','S034','S035','S036'].includes(s.id) && !temPeixe) return false;
    if (['S040','S041','S042','S043','S044','S045','S047','S048'].includes(s.id) && !temCarne) return false;
    if (s.palavrasChave.some(p => ['sopa','caldo','velouté','bisque','consommé'].includes(p)) && !temSopa) return false;
    const isPastelaria = s.palavrasChave.some(p => ['bolo','tarte','mousse','pudim','massa folhada','ganache','merengue'].includes(p));
    if (isPastelaria && !temPastelaria) return false;
    return s.palavrasChave.some(p => textoContemPalavraSub(textoNorm, p));
  });

  // Técnicas custom adicionadas pelo professor — ligadas automaticamente
  // quando o texto da receita contém as palavras-chave definidas.
  // Importação lazy para evitar dependência circular (backend ← subtecnicas).
  let candidatosCustom: Competencia[] = [];
  try {
    const raw = localStorage.getItem('ecl_tecnicas_custom');
    if (raw) {
      const tecCustom = JSON.parse(raw) as Array<{ id: string; nome: string; palavrasChave: string[]; tecnicaMaeId?: string; uc?: string[] }>;
      candidatosCustom = tecCustom
        .filter(t => (t.palavrasChave || []).some(p => textoContemPalavraSub(textoNorm, p)))
        .map(t => ({
          id: t.id,
          categoria: 'TECNICAS' as const,
          nome: t.nome,
          palavrasChave: t.palavrasChave,
          tecnicaMaeId: t.tecnicaMaeId,
          uc: t.uc || [],
        }));
    }
  } catch {}

  const todos = [...candidatos, ...candidatosCustom];
  if (todos.length > 0) return todos;

  // Fallback simples se os guards filtrarem tudo — preferível a devolver
  // lista vazia quando há sinal claro por palavra-chave directa.
  const texto = textoReceita.toLowerCase();
  return SUBTECNICAS.filter(s => (s.palavrasChave || []).some(p => texto.includes(p.toLowerCase())));
}

/** Subtécnicas agrupadas pela técnica-mãe */
export function subtecnicasPorMae(maeId: string): Competencia[] {
  return SUBTECNICAS.filter(s => s.tecnicaMaeId === maeId);
}

// Auto-registo em competenciasECL para que encontrarMicro() e microsPorUC()
// encontrem subtécnicas sem usar require() (incompatível com módulos ES/Vite)
import { registarSubtecnicas } from './competenciasECL';
registarSubtecnicas(SUBTECNICAS as any);
