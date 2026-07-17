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
var NIVEIS_ORIENTADOR = [
  { label: 'Insuficiente', intervalo: '0 a 9' },
  { label: 'Suficiente',   intervalo: '10 a 13' },
  { label: 'Bom',          intervalo: '14 a 16' },
  { label: 'Muito Bom',    intervalo: '17 a 20' },
];

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
  var nomeCopia = 'Recuperacao_FCT_' + (dados.nomeAluno || 'aluno').replace(/[^a-zA-Z0-9À-ú ]/g, '') + '_' + new Date().getTime();
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

  var competenciasTexto = (dados.competencias || []).join('; ');

  var substituicoes = {
    '{{NOME_ALUNO}}': String(dados.nomeAluno || ''),
    '{{TURMA}}': String(dados.turma || ''),
    '{{ANO_LETIVO}}': String(dados.anoLetivo || '2026/27'),
    '{{AREA}}': String(dados.area || 'Tecnológica').toUpperCase(),
    '{{MODULO}}': String(dados.modulo || ''),
    '{{COMPETENCIAS}}': String(competenciasTexto || ''),
    '{{TEXTO_HORAS}}': String(textoHoras || ''),
    '{{LOCAL_FCT}}': String(dados.localFCT || '________________'),
    '{{DATA_INICIO}}': String(dados.dataInicio || '__/__/____'),
    '{{DATA_TERMO}}': String(dados.dataTermo || '__/__/____'),
  };

  for (var chave in substituicoes) {
    if (!substituicoes.hasOwnProperty(chave)) continue;
    if (chave === '{{TABELA_COMPETENCIAS}}') continue; // tratado à parte, é uma tabela
    var valor = substituicoes[chave];
    corpo.replaceText(escapeRegExp(chave), valor);
    if (cabecalhos) cabecalhos.replaceText(escapeRegExp(chave), valor);
  }

  // ── Inserir a tabela de avaliação das competências pelo Orientador ──
  inserirTabelaCompetencias(corpo, dados.competencias || []);

  doc.saveAndClose();

  var pdfBlob = DriveApp.getFileById(copiaFicheiro.getId()).getAs('application/pdf');
  pdfBlob.setName(nomeCopia + '.pdf');
  var pdfFicheiro = pasta.createFile(pdfBlob);
  pdfFicheiro.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  copiaFicheiro.setTrashed(true);

  return resposta(true, 'PDF gerado', { pdfUrl: pdfFicheiro.getUrl() });
}

// ── Substitui o parágrafo "{{TABELA_COMPETENCIAS}}" por uma tabela real:
// uma linha por competência, com 4 colunas de nível (Insuficiente/
// Suficiente/Bom/Muito Bom, cada uma com o intervalo de nota) para o
// Orientador assinalar, e uma coluna final para a nota do professor.
function inserirTabelaCompetencias(corpo, competencias) {
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

  // Montar os dados da tabela: cabeçalho + 1 linha por competência
  var cabecalho = ['Competência'];
  NIVEIS_ORIENTADOR.forEach(function(n) { cabecalho.push(n.label + '\n(' + n.intervalo + ')'); });
  cabecalho.push('Nota do\nProfessor');

  var linhas = [cabecalho];
  var listaCompetencias = competencias.length > 0 ? competencias : ['(nenhuma competência definida)'];
  listaCompetencias.forEach(function(c) {
    var linha = [c];
    NIVEIS_ORIENTADOR.forEach(function() { linha.push('☐'); }); // caixa para o orientador assinalar
    linha.push('_____');
    linhas.push(linha);
  });

  // Inserir a tabela na posição do marcador, com um título antes
  var tituloTabela = corpo.insertParagraph(indiceMarcador,
    'AVALIAÇÃO DAS COMPETÊNCIAS PELO ORIENTADOR');
  tituloTabela.setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  var tabela = corpo.insertTable(indiceMarcador + 1, linhas);
  tabela.setBorderWidth(0.75);

  // Formatar cabeçalho a negrito, tamanho de letra menor para caber tudo
  var linhaCab = tabela.getRow(0);
  for (var c = 0; c < linhaCab.getNumCells(); c++) {
    var celula = linhaCab.getCell(c);
    celula.setBackgroundColor('#f0ede6');
    var texto = celula.editAsText();
    texto.setBold(true).setFontSize(9);
  }
  for (var r = 1; r < tabela.getNumRows(); r++) {
    for (var c2 = 0; c2 < tabela.getRow(r).getNumCells(); c2++) {
      tabela.getRow(r).getCell(c2).editAsText().setFontSize(9);
    }
  }

  // Remover o parágrafo do marcador original (já não é necessário)
  corpo.getChild(indiceMarcador + 2).asParagraph().removeFromParent();
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
