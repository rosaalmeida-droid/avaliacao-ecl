// ═══════════════════════════════════════════════════════════════
// Apps Script — Gerar PDF de Recuperação via FCT
// Usa um Google Doc modelo (convertido do Word original da escola)
// com marcadores {{...}}, preenche com os dados do aluno, insere a
// tabela de avaliação das competências pelo Orientador, e devolve
// o PDF já pronto — chamado directamente pela app Avaliação ECL.
//
// INSTRUÇÕES DE INSTALAÇÃO:
// 1. Carrega "Modelo_Recuperacao_FCT_com_placeholders.docx" para o
//    Google Drive
// 2. Clica com o botão direito → Abrir com → Google Docs
// 3. Copia o ID do documento a partir do URL:
//    https://docs.google.com/document/d/ESTE_ID_AQUI/edit
// 4. Cola esse ID na constante ID_MODELO abaixo
// 5. Extensões → Apps Script → cola este código
// 6. Implementar → Nova implementação → Aplicação Web
//    "Quem tem acesso": Qualquer pessoa
// 7. Copia o URL do deployment e cola em RECUPERACAO_FCT_PDF_URL
//    no backend.ts da app
// ═══════════════════════════════════════════════════════════════

var ID_MODELO = '1ybqiD8QhxonDDX4RPL1TafUH977UQlz5RO3qjSOd-Bg'; // ← já preenchido
var ID_PASTA_RECUPERACOES = '16Ie_znxPpCbQu3JKZ199-3GexyTvxGkB'; // pasta definida pela Rosa

// Escala de avaliação do Orientador — 4 níveis, cada um com o
// intervalo de nota correspondente (0-20).
function doPost(e) {
  try {
    var raw = (e.parameter && e.parameter.dados) || (e.postData && e.postData.contents) || '{}';
    var dados = JSON.parse(raw);
    return gerarPDF(dados);
  } catch (err) {
    return resposta(false, 'Erro: ' + err.toString());
  }
}

function gerarPDF(dados) {
  if (ID_MODELO === 'COLOCAR_AQUI_O_ID_DO_GOOGLE_DOC') {
    return resposta(false, 'Script ainda não configurado — falta o ID do modelo (ver instruções no topo do script).');
  }

  var modelo;
  try {
    modelo = DriveApp.getFileById(ID_MODELO);
  } catch (errFile) {
    return resposta(false, 'ID_MODELO inválido — não encontrei nenhum ficheiro com esse ID no Drive. Verifica se copiaste o ID correcto do URL do Google Doc.');
  }

  // Diagnóstico — confirma se o ficheiro é mesmo um Google Doc nativo
  // (não um .docx em modo de compatibilidade, que o DocumentApp não consegue abrir).
  var tipoFicheiro = modelo.getMimeType();
  Logger.log('Tipo do ficheiro modelo: ' + tipoFicheiro);
  if (tipoFicheiro !== 'application/vnd.google-apps.document') {
    return resposta(false,
      'O ficheiro do ID_MODELO NÃO é um Google Doc nativo — é do tipo "' + tipoFicheiro + '". ' +
      'Abre o ficheiro no Drive, verifica se o título NÃO tem ".DOCX" ao lado (se tiver, vai a ' +
      'Ficheiro → Guardar no formato Google Docs), e usa o ID do documento resultante — pode ' +
      'ser um ID DIFERENTE do que tens agora.');
  }

  var pasta = DriveApp.getFolderById(ID_PASTA_RECUPERACOES); // pasta definida pela Rosa
  // Nome do ficheiro: Plano_de_Recuperação_(aluno)_(UFCD/UC)_(disciplina)_(ano letivo)
  var limpar = function(s) { return String(s || '').replace(/[^a-zA-Z0-9À-ú ]/g, '').trim().replace(/\s+/g, '_'); };
  var nomeCopia = 'Plano_de_Recuperação'
    + '_' + limpar(dados.nomeAluno || 'aluno')
    + '_' + limpar(dados.ucId || '')
    + '_' + limpar(dados.ucNome || '')
    + '_' + limpar(dados.anoLetivo || '');
  var copiaFicheiro = modelo.makeCopy(nomeCopia, pasta);

  var doc;
  try {
    doc = DocumentApp.openById(copiaFicheiro.getId());
  } catch (errDoc) {
    return resposta(false, 'Não consegui abrir a cópia como Google Doc: ' + errDoc.toString());
  }
  var corpo = doc.getBody();
  if (!corpo) {
    return resposta(false, 'O documento abriu mas não tem corpo de texto — o modelo pode estar corrompido.');
  }
  var cabecalhos = doc.getHeader();

  var textoHoras = dados.exigirHoras
    ? 'Registo de um mínimo de ' + (dados.horasMinimas || 0) + ' horas de FCT dedicadas às competências acima, com datas e descrição das situações.'
    : 'Não há um número mínimo de horas exigido — contam apenas as evidências concretas das competências acima, independentemente do tempo dedicado.';

  // Tira o ponto final de cada competência antes de juntar — algumas vêm
  // do referencial oficial (já terminam em ".") e outras da IA (podem ou
  // não terminar em ")"). Sem isto, o texto final ficava com pontuação
  // duplicada ("..") porque o modelo já acrescenta um ponto final a seguir.
  var competenciasTexto = (dados.competencias || [])
    .map(function(c) { return String(c || '').trim().replace(/\.+$/, ''); })
    .join('; ');

  var substituicoes = {
    '{{NOME_ALUNO}}': String(dados.nomeAluno || ''),
    '{{TURMA}}': String(dados.turma || ''),
    '{{ANO_LETIVO}}': String(dados.anoLetivo || '2026/27'),
    '{{AREA}}': String(dados.area || 'Curso de Cozinha/Pastelaria').toUpperCase(),
    '{{DISCIPLINA}}': String(dados.disciplina || ''),
    '{{MODULO}}': String(dados.modulo || ''),
    '{{TEXTO_HORAS}}': String(textoHoras || ''),
    '{{LOCAL_FCT}}': String(dados.localFCT || '________________'),
    '{{DATA_INICIO}}': String(dados.dataInicio || '__/__/____'),
    '{{DATA_TERMO}}': String(dados.dataTermo || '__/__/____'),
  };

  for (var chave in substituicoes) {
    if (!substituicoes.hasOwnProperty(chave)) continue;
    if (chave === '{{TABELA_COMPETENCIAS}}') continue; // tratado à parte, é uma tabela
    // {{LISTA_COMPETENCIAS}} não está em "substituicoes" — é tratado à parte, é uma lista
    var valor = substituicoes[chave];
    corpo.replaceText(escapeRegExp(chave), valor);
    if (cabecalhos) cabecalhos.replaceText(escapeRegExp(chave), valor);
  }

  // ── Inserir a tabela de avaliação das competências pelo Orientador ──
  inserirListaCompetencias(corpo, dados.competencias || []);
  inserirPerguntasPorCompetencia(corpo, dados.competencias || [], dados.perguntas || []);
  // Se já há evidências reais submetidas pelo aluno, a tabela é construída
  // a partir delas (uma linha por evidência, com o texto real escrito) —
  // é isso que o Orientador realmente avalia. Se ainda não há nenhuma,
  // usa as competências-alvo como pontos de partida (para o Orientador
  // já saber o que vai ter de avaliar assim que houver evidências).
  var linhasParaTabela = (dados.evidencias && dados.evidencias.length > 0)
    ? dados.evidencias.map(function(e) { return String(e.descricao || e.competenciaId || ''); })
    : (dados.competencias || []);
  inserirTabelaCompetencias(corpo, linhasParaTabela, dados.importancias || []);

  doc.saveAndClose();

  var pdfBlob = DriveApp.getFileById(copiaFicheiro.getId()).getAs('application/pdf');
  pdfBlob.setName(nomeCopia + '.pdf');
  var pdfFicheiro = pasta.createFile(pdfBlob);
  pdfFicheiro.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  copiaFicheiro.setTrashed(true);

  return resposta(true, 'PDF gerado', { pdfUrl: pdfFicheiro.getUrl() });
}

// ── Substitui o parágrafo "{{LISTA_COMPETENCIAS}}" por uma lista real
// (com marcas), uma competência por linha — mais fácil de o Orientador da
// Empresa ler e validar item a item do que uma frase corrida.
function inserirListaCompetencias(corpo, competencias) {
  var numFilhos = corpo.getNumChildren();
  var indiceMarcador = -1;

  for (var i = 0; i < numFilhos; i++) {
    var filho = corpo.getChild(i);
    if (filho.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var texto = filho.asParagraph().getText();
      if (texto.indexOf('{{LISTA_COMPETENCIAS}}') >= 0) { indiceMarcador = i; break; }
    }
  }

  if (indiceMarcador < 0) return; // marcador não encontrado — modelo desactualizado

  var listaCompetencias = competencias.length > 0
    ? competencias
    : ['(nenhuma competência definida)'];

  // Inserir um item de lista por competência, a partir da posição do marcador
  for (var j = 0; j < listaCompetencias.length; j++) {
    var itemLista = corpo.insertListItem(indiceMarcador + j, String(listaCompetencias[j] || ''));
    itemLista.setGlyphType(DocumentApp.GlyphType.BULLET);
    itemLista.setFontSize(10);
    itemLista.setIndentStart(24).setIndentFirstLine(24);
  }

  // Remover o parágrafo do marcador original — ficou empurrado para depois
  // dos itens de lista que acabámos de inserir.
  corpo.getChild(indiceMarcador + listaCompetencias.length).asParagraph().removeFromParent();
}

// ── Substitui o parágrafo "{{PERGUNTAS_POR_COMPETENCIA}}" por uma
// pergunta situacional por cada competência — não uma pergunta genérica
// solta. Aproveita a explicação que já vem entre parênteses em cada
// competência (ex: "Termo técnico (explicação concreta e observável)")
// como semente da pergunta, para o aluno recordar uma situação real e
// específica, não escrever algo vago.
function inserirPerguntasPorCompetencia(corpo, competencias, perguntasIA) {
  var numFilhos = corpo.getNumChildren();
  var indiceMarcador = -1;

  for (var i = 0; i < numFilhos; i++) {
    var filho = corpo.getChild(i);
    if (filho.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var texto = filho.asParagraph().getText();
      if (texto.indexOf('{{PERGUNTAS_POR_COMPETENCIA}}') >= 0) { indiceMarcador = i; break; }
    }
  }

  if (indiceMarcador < 0) return; // marcador não encontrado — modelo desactualizado

  var listaCompetencias = competencias.length > 0
    ? competencias
    : ['(nenhuma competência definida)'];

  var posicao = indiceMarcador;
  for (var j = 0; j < listaCompetencias.length; j++) {
    var textoCompetencia = String(listaCompetencias[j] || '');

    // Separar "Termo técnico" de "(explicação concreta)", se existir
    var match = textoCompetencia.match(/^([^(]+)\(([^)]+)\)\s*\.?\s*$/);
    var termo = match ? match[1].trim() : textoCompetencia;
    var explicacao = match ? match[2].trim() : '';

    // Cabeçalho da pergunta — número + termo técnico, a negrito
    var paraguoTitulo = corpo.insertParagraph(posicao, (j + 1) + '. ' + termo);
    paraguoTitulo.setBold(true).setFontSize(11).setSpacingBefore(j === 0 ? 0 : 14).setSpacingAfter(4);
    posicao++;

    // Pergunta situacional — usa a pergunta de cenário que a IA já gerou
    // especificamente para esta competência, se existir (mais rica e
    // variada). Só recorre à fórmula genérica de reserva se não houver
    // nenhuma (ex: competência escrita à mão pelo professor, sem IA).
    var perguntaDaIA = (perguntasIA && perguntasIA[j]) ? String(perguntasIA[j]).trim() : '';
    var textoPergunta = perguntaDaIA
      ? perguntaDaIA
      : (explicacao
          ? 'Conta uma situação real que viveste, ligada a isto: "' + explicacao + '". O que aconteceu, com quem, e o que fizeste exactamente?'
          : 'Conta uma situação real que viveste, ligada a esta competência. O que aconteceu, com quem, e o que fizeste exactamente?');
    var paragrafoPergunta = corpo.insertParagraph(posicao, textoPergunta);
    paragrafoPergunta.setItalic(true).setFontSize(10).setSpacingAfter(8);
    posicao++;

    // 3 linhas em branco para o aluno escrever à mão — usa "____" em vez de
    // um underline real, porque o Paragraph do Apps Script não tem API
    // directa para underline/border de linha (só Table/TableCell têm).
    for (var linha = 0; linha < 3; linha++) {
      var paragrafoLinha = corpo.insertParagraph(posicao,
        '_______________________________________________________________________');
      paragrafoLinha.setFontSize(10).setForegroundColor('#cccccc').setSpacingAfter(6);
      posicao++;
    }
  }

  // Remover o parágrafo do marcador original — ficou empurrado para o fim
  corpo.getChild(posicao).asParagraph().removeFromParent();
}

// ── Substitui o parágrafo "{{TABELA_COMPETENCIAS}}" por uma tabela real de
// validação: uma linha por competência/evidência, com o PESO % que essa
// competência tem na nota final, a NOTA DO ORIENTADOR (0-20, escrita à mão),
// espaço para a ASSINATURA do orientador nessa linha, e a NOTA DO FORMADOR
// (0-20, a preencher depois pelo professor). No fim, uma linha de MÉDIA
// FINAL PONDERADA, com a fórmula explicada para ficar definida pela escola.
//
// SUGESTÃO DE PESOS — por defeito, distribui 100% igualmente por todas as
// competências (ex: 4 competências = 25% cada). Isto é só uma sugestão de
// arranque: ajusta o array PESOS_MANUAIS abaixo se quiseres pesos diferentes
// por competência (a soma tem de dar sempre 100).
var PESOS_MANUAIS = null; // null = distribuição igual automática; ou define ex: [40, 30, 30]

function inserirTabelaCompetencias(corpo, competencias, importancias) {
  var numFilhos = corpo.getNumChildren();
  var indiceMarcador = -1;

  for (var i = 0; i < numFilhos; i++) {
    var filho = corpo.getChild(i);
    if (filho.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var texto = filho.asParagraph().getText();
      if (texto.indexOf('{{TABELA_COMPETENCIAS}}') >= 0) { indiceMarcador = i; break; }
    }
  }

  if (indiceMarcador < 0) return; // marcador não encontrado — modelo desactualizado

  var listaCompetencias = competencias.length > 0 ? competencias : ['(nenhuma competência definida)'];
  var n = listaCompetencias.length;

  // Calcular os pesos — distribuição igual por defeito, ajustando o último
  // para a soma dar sempre exactamente 100% (evita erros de arredondamento).
  var pesos;
  if (importancias && importancias.length === n && importancias.some(function(v) { return v && v !== 2; })) {
    // A Rosa definiu importância relativa (1=baixa 2=média 3=alta) por
    // competência no formulário — o peso % é proporcional a isso, em vez
    // de distribuído sempre por igual.
    var somaImportancias = importancias.reduce(function(a, b) { return a + (b || 2); }, 0);
    pesos = importancias.map(function(v) { return Math.round(((v || 2) / somaImportancias) * 100); });
    var somaAtual = pesos.reduce(function(a, b) { return a + b; }, 0);
    pesos[n - 1] += 100 - somaAtual; // ajuste do resto no último, para dar sempre 100%
  } else if (PESOS_MANUAIS && PESOS_MANUAIS.length === n) {
    pesos = PESOS_MANUAIS;
  } else {
    // Sem importância definida — distribuição igual por defeito
    var pesoBase = Math.floor(100 / n);
    pesos = [];
    for (var p = 0; p < n; p++) pesos.push(pesoBase);
    pesos[n - 1] += 100 - (pesoBase * n);
  }

  // Montar os dados da tabela: cabeçalho + 1 linha por competência + 1 linha de média
  var cabecalho = ['Competência / Evidência', 'Peso', 'Nota\nOrientador\n(0-20)', 'Assinatura do Orientador', 'Nota\nFormador\n(0-20)'];
  var linhas = [cabecalho];

  listaCompetencias.forEach(function(c, idx) {
    linhas.push([c, pesos[idx] + '%', '_____', '', '_____']);
  });

  linhas.push(['MÉDIA FINAL PONDERADA (0 a 20)', '100%', '', 'Fórmula: Σ (Nota Formador × Peso%)', '_____']);

  // Título da tabela
  var tituloTabela = corpo.insertParagraph(indiceMarcador,
    'VALIDAÇÃO DE COMPETÊNCIAS NA FORMAÇÃO EM CONTEXTO DE TRABALHO');
  tituloTabela.setBold(true).setFontSize(12)
    .setForegroundColor('#6d28d9')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setSpacingBefore(10).setSpacingAfter(8);

  var tabela = corpo.insertTable(indiceMarcador + 1, linhas);
  tabela.setBorderWidth(1);
  tabela.setBorderColor('#d8cdea');

  // Larguras das colunas
  tabela.setColumnWidth(0, 186); // Competência/Evidência
  tabela.setColumnWidth(1, 40);  // Peso
  tabela.setColumnWidth(2, 55);  // Nota Orientador
  tabela.setColumnWidth(3, 130); // Assinatura
  tabela.setColumnWidth(4, 55);  // Nota Formador

  // Cabeçalho — fundo roxo sólido, texto branco a negrito
  var linhaCab = tabela.getRow(0);
  for (var c = 0; c < linhaCab.getNumCells(); c++) {
    var celula = linhaCab.getCell(c);
    celula.setBackgroundColor('#6d28d9');
    celula.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    celula.editAsText().setBold(true).setFontSize(8).setForegroundColor('#ffffff');
  }

  // Linhas de dados — alternadas, excepto a última (média final), que fica
  // destacada com fundo roxo claro forte e negrito.
  for (var r = 1; r < tabela.getNumRows(); r++) {
    var linhaAtual = tabela.getRow(r);
    var ehLinhaMedia = (r === tabela.getNumRows() - 1);
    var corFundo = ehLinhaMedia ? '#e4d9f7' : ((r % 2 === 0) ? '#f6f2fb' : '#ffffff');
    for (var c2 = 0; c2 < linhaAtual.getNumCells(); c2++) {
      var celulaAtual = linhaAtual.getCell(c2);
      celulaAtual.setBackgroundColor(corFundo);
      celulaAtual.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(5).setPaddingRight(5);
      var textoCelula = celulaAtual.editAsText();
      textoCelula.setFontSize(c2 === 0 ? 9 : 9.5).setForegroundColor('#1a1714');
      if (ehLinhaMedia) textoCelula.setBold(true);
      if (c2 >= 1 && c2 !== 3) {
        celulaAtual.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
  }

  // Nota explicativa da fórmula, para a escola confirmar/definir o método
  var notaFormula = corpo.insertParagraph(indiceMarcador + 2,
    'Nota: a Média Final Ponderada é calculada pelo Formador, multiplicando a nota atribuída a cada ' +
    'competência pelo respectivo peso percentual e somando os resultados — método a confirmar/definir ' +
    'pela Escola de Comércio de Lisboa.');
  notaFormula.setFontSize(8).setItalic(true).setForegroundColor('#999999').setSpacingBefore(6).setSpacingAfter(10);

  // Remover o parágrafo do marcador original — ficou empurrado para depois
  // da tabela e da nota explicativa.
  corpo.getChild(indiceMarcador + 3).asParagraph().removeFromParent();
}

function escapeRegExp(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resposta(ok, mensagem, dados) {
  var obj = { ok: ok, mensagem: mensagem };
  if (dados !== undefined) obj.pdfUrl = dados.pdfUrl;
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ── Teste manual — executar depois de configurar ID_MODELO ──────
function testarGeracao() {
  var res = gerarPDF({
    nomeAluno: 'Rosa Almeida', turma: '3º ACP', anoLetivo: '2026/27',
    area: 'Tecnológica', modulo: 'UFCD 17 – Planeamento e confeção de cozinha internacional',
    competencias: ['Trabalho em equipa', 'Gestão do tempo em produção', 'Postura profissional'],
    exigirHoras: true, horasMinimas: 10, localFCT: 'Restaurante XPTO',
    dataInicio: '01/09/2026', dataTermo: '30/09/2026',
  });
  Logger.log(res.getContent());
}
