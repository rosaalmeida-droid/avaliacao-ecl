// ============================================================
// Apps Script — Requisição ECL v6
// Arquitectura: app → DADOS_APP → Modelo (cópia)
//
// O QUE MUDA EM RELAÇÃO À v5 (Rosa, out/2026)
//
// 1. A receita resumida volta a aparecer.
//    A v5 escrevia a preparação na coluna B da linha «Preparação /
//    Confeção:». Essa célula faz parte do título (células unidas), e o
//    texto ficava lá escondido. Agora vai para a caixa por baixo do
//    título, que se une sozinha se ainda não estiver unida, com o texto
//    pequeno e encostado ao cimo.
//
// 2. Três datas. A célula «Data aula:» é a que as compras leem como o dia
//    em que os ingredientes têm de estar na cozinha. Na cópia, a etiqueta
//    passa a dizer «Ingredientes até:» e leva essa data (o modelo não é
//    tocado). O dia da aula e o dia em que a requisição foi feita ficam
//    escritos na caixa da Atividade.
//
// 3. Nota das doses. Com várias fichas, «Encomendas» é a soma das doses
//    de todas (ex.: 26 = 6 + 12 + 8). Por baixo das assinaturas fica uma
//    nota a explicar, com as doses de cada prato.
//
// 4. A cruz do Consumo fica dentro do quadrado (ficava ao lado).
//
// 5. E-mail às compras (opcional). Se a aplicação enviar os e-mails das
//    pessoas das compras, segue logo uma mensagem formal com a ligação
//    para a requisição. Sem e-mails, nada é enviado.
//    Na primeira implementação, o Google pede autorização para enviar
//    e-mails em seu nome: é normal, aceite.
//
// DEPOIS DE COLAR:
//    Implementar → Gerir implementações → editar (lápis)
//    → Versão: Nova versão → Implementar
//
// Guardar não chega: o URL continua a servir a versão antiga.
// ============================================================

// Nome da folha-modelo a copiar.
//
// O script não exige este nome exacto: procura primeiro por ele, depois
// por qualquer folha cujo nome comece por "modelo", e por fim "Folha1".
var NOME_MODELO = 'Modelo-Não mexer';

// O ficheiro onde as requisições são escritas. Serve para as funções de
// teste funcionarem mesmo quando o editor é aberto fora da folha.
var SPREADSHEET_ID = '1WPMU9VtEiS0JTX4EjgQLwrG96Sl3vUYx1sNBdryvh28';

/** O Google Sheets das requisições, venha de onde vier a execução. */
function abrirFolha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/** A folha-modelo, procurada por aproximação. */
function encontrarModelo(ss) {
  if (!ss) {
    throw new Error(
      'O script não conseguiu abrir o Google Sheets.\n\n' +
      'Isto acontece quando o projeto foi aberto fora da folha. Abre a ' +
      '"Ficha de Food Cost/Requisição" e entra pelo menu Extensões > Apps Script.'
    );
  }
  var f = ss.getSheetByName(NOME_MODELO);
  if (f) return f;

  var folhas = ss.getSheets();

  // Qualquer nome que comece por "modelo", sem acentos nem maiúsculas.
  for (var i = 0; i < folhas.length; i++) {
    var n = folhas[i].getName().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (n.indexOf('modelo') === 0) return folhas[i];
  }

  // Ou uma folha com "nao mexer" no nome.
  for (var j = 0; j < folhas.length; j++) {
    var n2 = folhas[j].getName().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (n2.indexOf('nao mexer') !== -1) return folhas[j];
  }

  return ss.getSheetByName('Folha1');
}

// Primeira linha de ingredientes. Esta é fixa no modelo e não muda.
var PRIMEIRA_LINHA_ING = 16;

// Colunas dos ingredientes, tal como o modelo as tem:
//   A = quantidade 1 pax (fórmula, não escrever)
//   B = quantidade receita        C = ingrediente
//   J = unidade                   K = quant. encomenda (fórmula)
//   L = preço unitário
var COL_QT_RECEITA = 2;
var COL_NOME       = 3;
var COL_UND        = 10;
var COL_PRECO      = 12;


/**
 * DIAGNÓSTICO — corre esta primeiro.
 * Só lista as folhas do ficheiro, para se ver os nomes exactos.
 */
function listarFolhas() {
  var ss = abrirFolha();
  Logger.log('Ficheiro: ' + ss.getName());
  Logger.log('');
  var fs = ss.getSheets();
  Logger.log(fs.length + ' folhas:');
  for (var i = 0; i < fs.length; i++) {
    Logger.log('  [' + fs[i].getName() + ']'
      + (fs[i].isSheetHidden() ? '  (escondida)' : ''));
  }
}


function doPost(e) {
  var log = [];
  try {
    // ── 1. Dados recebidos ───────────────────────────────────
    var corpo = (e && e.postData && e.postData.contents)
      ? e.postData.contents
      : (e && e.parameter && e.parameter.dados ? e.parameter.dados : null);
    if (!corpo) return resposta(false, 'Sem dados recebidos', log);

    var dados;
    try {
      dados = JSON.parse(corpo);
      log.push('JSON lido — receita: ' + (dados.nomeReceita || '(sem nome)'));
    } catch (parseErr) {
      return resposta(false, 'JSON inválido: ' + parseErr.toString(), log);
    }

    var ss = abrirFolha();

    // ── 2. Modelo ────────────────────────────────────────────
    var modelo = encontrarModelo(ss);
    if (!modelo) {
      var nomes = ss.getSheets().map(function (f) { return f.getName(); }).join(' | ');
      return resposta(false,
        'Folha-modelo não encontrada. Folhas existentes: ' + nomes, log);
    }
    log.push('Modelo: ' + modelo.getName());

    // ── 3. Registo em DADOS_APP (para consulta) ──────────────
    guardarEmDadosApp(ss, dados, log);

    // ── 4. Copiar o modelo ───────────────────────────────────
    var nomeAba = nomeParaAba(dados);
    var nova = modelo.copyTo(ss);
    nova.setName(nomeAba);
    nova.showSheet();                     // o modelo pode estar escondido
    ss.setActiveSheet(nova);
    ss.moveActiveSheet(2);
    log.push('Aba criada: ' + nomeAba);

    // ── 5. Descobrir a estrutura DESTA cópia ─────────────────
    var est = lerEstrutura(nova);
    log.push('Ingredientes: linhas ' + est.primeiraIng + '–' + est.ultimaIng
             + ' (' + est.capacidade + ' linhas)');
    log.push('Preparação em A' + est.linhaPreparacao);

    // ── 6. Esticar a tabela, se for preciso ──────────────────
    var ingredientes = dados.ingredientes || [];
    if (ingredientes.length > est.capacidade) {
      var faltam = ingredientes.length - est.capacidade;
      inserirLinhas(nova, est.ultimaIng, faltam);
      log.push('Inseridas ' + faltam + ' linhas — as fórmulas do rodapé ajustaram-se');
      est = lerEstrutura(nova);           // reler: tudo desceu
    }

    // ── 7. Preencher ─────────────────────────────────────────
    preencherCabecalho(nova, dados);
    preencherIngredientes(nova, ingredientes, est);
    preencherRodape(nova, dados, est, log);
    escreverNotaDoses(nova, dados.notaDoses, est, log);

    SpreadsheetApp.flush();

    var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/edit#gid=' + nova.getSheetId();

    // ── 8. E-mail às compras (só se a aplicação enviar e-mails) ──
    var emailEnviado = enviarEmailCompras(dados, url, log);

    return resposta(true, 'Requisição criada: ' + nomeAba, log, {
      spreadsheetId: ss.getId(),
      nomeAba: nomeAba,
      ingredientes: ingredientes.length,
      urlSheets: url,
      emailEnviado: emailEnviado
    });

  } catch (err) {
    log.push('ERRO: ' + err.toString());
    return resposta(false, err.toString(), log);
  }
}


// ══════════════════════════════════════════════════════════════
// LER A ESTRUTURA DO MODELO
// ══════════════════════════════════════════════════════════════

function lerEstrutura(folha) {
  if (!folha || typeof folha.getLastRow !== 'function') {
    throw new Error(
      'lerEstrutura foi chamada sem folha. Isto acontece quando ficam duas ' +
      'versões do script no mesmo ficheiro: apaga TODO o código antes de ' +
      'colar o novo (Ctrl+A e depois colar).'
    );
  }
  var ultimaLinha = folha.getLastRow();
  var maxProcura = Math.min(ultimaLinha + 5, 400);

  // A última linha de ingredientes é a última com a fórmula "=B<n>/M$7"
  // na coluna A — é o que define a tabela no modelo.
  var formulasA = folha.getRange(PRIMEIRA_LINHA_ING, 1,
    maxProcura - PRIMEIRA_LINHA_ING + 1, 1).getFormulas();

  var ultimaIng = PRIMEIRA_LINHA_ING;
  for (var i = 0; i < formulasA.length; i++) {
    var f = String(formulasA[i][0] || '');
    if (f.indexOf('/M$7') !== -1 || /^=B\d+\/M\$?7/.test(f)) {
      ultimaIng = PRIMEIRA_LINHA_ING + i;
    }
  }

  // O rodapé encontra-se pelas etiquetas do próprio modelo.
  var etiquetas = folha.getRange(ultimaIng, 1,
    Math.min(40, maxProcura - ultimaIng), 20).getValues();

  var est = {
    primeiraIng: PRIMEIRA_LINHA_ING,
    ultimaIng: ultimaIng,
    capacidade: ultimaIng - PRIMEIRA_LINHA_ING + 1,
    linhaPreparacao: ultimaIng + 1,
    linhaTurma: 0, linhaData: 0, colData: 0, linhaFormador: 0,
    linhaAtividade: 0, colAtividade: 0, linhaResponsavel: 0,
    linhaBar: 0, linhaRest: 0, linhaInterno: 0, linhaConvidados: 0,
    linhaAssinaturas: 0,
    colTurma: 18, colConsumo: 14,
  };

  for (var r = 0; r < etiquetas.length; r++) {
    var linhaReal = ultimaIng + r;
    for (var c = 0; c < etiquetas[r].length; c++) {
      var txt = String(etiquetas[r][c] || '').trim().toLowerCase();
      if (!txt) continue;

      // As etiquetas de preenchimento acabam em ":" — "Turma:", "Formador:".
      // Na última linha do modelo há as etiquetas das ASSINATURAS, sem
      // dois pontos: "Direcção | Formador | Responsável Compras".
      var etiqueta = txt.charAt(txt.length - 1) === ':';

      if (txt.indexOf('prepara') === 0)       est.linhaPreparacao = linhaReal;
      else if (etiqueta && txt.indexOf('turma') === 0)     { est.linhaTurma = linhaReal; est.colTurma = c + 3; }
      else if (etiqueta && (txt.indexOf('data aula') === 0 || txt.indexOf('ingredientes at') === 0)) { est.linhaData = linhaReal; est.colData = c + 1; }
      else if (etiqueta && txt.indexOf('formador') === 0)   est.linhaFormador = linhaReal;
      else if (etiqueta && txt.indexOf('atividade') === 0)  { est.linhaAtividade = linhaReal; est.colAtividade = c + 1; }
      else if (etiqueta && txt.indexOf('respons') === 0)    est.linhaResponsavel = linhaReal;
      else if (!etiqueta && (txt.indexOf('direc') === 0 || txt.indexOf('direç') === 0) && !est.linhaAssinaturas) est.linhaAssinaturas = linhaReal;
      else if (txt.indexOf('ecl bar') === 0)  { est.linhaBar = linhaReal; est.colConsumo = c + 3; }
      else if (txt.indexOf('ecl restaurante') === 0) est.linhaRest = linhaReal;
      else if (txt.indexOf('consumo interno') === 0) est.linhaInterno = linhaReal;
      else if (txt.indexOf('convidados') === 0) est.linhaConvidados = linhaReal;
    }
  }

  return est;
}


// ══════════════════════════════════════════════════════════════
// ESTICAR A TABELA
// ══════════════════════════════════════════════════════════════

function inserirLinhas(folha, ultimaIng, quantas) {
  // Inserir antes da última linha de ingredientes: o Sheets ajusta as
  // fórmulas do rodapé (=SUM(N16:N71) passa a =SUM(N16:N95)).
  folha.insertRowsBefore(ultimaIng, quantas);

  var modelo = folha.getRange(ultimaIng - 1, 1, 1, folha.getMaxColumns());
  var destino = folha.getRange(ultimaIng, 1, quantas, folha.getMaxColumns());
  modelo.copyTo(destino);

  folha.getRange(ultimaIng, COL_QT_RECEITA, quantas, 1).clearContent();
  folha.getRange(ultimaIng, COL_NOME,       quantas, 1).clearContent();
  folha.getRange(ultimaIng, COL_UND,        quantas, 1).clearContent();
  folha.getRange(ultimaIng, COL_PRECO,      quantas, 1).clearContent();
}


// ══════════════════════════════════════════════════════════════
// PREENCHER
// ══════════════════════════════════════════════════════════════

function preencherCabecalho(folha, d) {
  if (d.nomeReceita) folha.getRange('D4').setValue(d.nomeReceita);
  if (d.familia)     folha.getRange('B7').setValue(d.familia);
  if (d.paxTotal)    folha.getRange('H7').setValue(d.paxTotal);
  if (d.paxReceita)  folha.getRange('M7').setValue(d.paxReceita);
}

function preencherIngredientes(folha, ingredientes, est) {
  if (!ingredientes.length) return;

  var qts = [], nomes = [], unds = [], precos = [];
  for (var i = 0; i < ingredientes.length; i++) {
    var g = ingredientes[i];
    qts.push([g.qtReceita || '']);
    nomes.push([g.nome || '']);
    unds.push([g.und || '']);
    precos.push([parseFloat(g.preco) || 0]);
  }

  var n = ingredientes.length;
  var l0 = est.primeiraIng;
  folha.getRange(l0, COL_QT_RECEITA, n, 1).setValues(qts);
  folha.getRange(l0, COL_NOME,       n, 1).setValues(nomes);
  folha.getRange(l0, COL_UND,        n, 1).setValues(unds);
  folha.getRange(l0, COL_PRECO,      n, 1).setValues(precos);

  var sobram = est.capacidade - n;
  if (sobram > 0) {
    var lSobra = l0 + n;
    folha.getRange(lSobra, COL_QT_RECEITA, sobram, 1).clearContent();
    folha.getRange(lSobra, COL_NOME,       sobram, 1).clearContent();
    folha.getRange(lSobra, COL_UND,        sobram, 1).clearContent();
    folha.getRange(lSobra, COL_PRECO,      sobram, 1).clearContent();
  }
}

/**
 * A receita resumida vai para a caixa POR BAIXO do título «Preparação /
 * Confeção:» (o título ocupa células unidas: escrever ao lado dele deixava
 * o texto escondido). A caixa tem a largura do título e vai até à linha
 * antes das assinaturas.
 */
function escreverPreparacao(folha, texto, est, log) {
  var lp = est.linhaPreparacao;
  var titulo = folha.getRange(lp, 1);
  var largura = 10;
  var mt = titulo.getMergedRanges();
  if (mt.length) largura = mt[0].getLastColumn();

  var primeira = lp + 1;
  var ultima = est.linhaAssinaturas ? est.linhaAssinaturas - 2 : lp + 14;
  if (ultima < primeira + 3) ultima = primeira + 3;

  var caixa = folha.getRange(primeira, 1, ultima - primeira + 1, largura);
  var alvo = folha.getRange(primeira, 1);
  var ja = alvo.getMergedRanges();
  try {
    if (ja.length) {
      alvo = ja[0].getCell(1, 1);
      caixa = ja[0];
    } else {
      // Só se une se nada dentro da caixa estiver já unido de outra forma.
      if (!caixa.getMergedRanges().length) { caixa.merge(); alvo = caixa.getCell(1, 1); }
    }
  } catch (e) { log.push('caixa da preparação: ' + e); }

  alvo.setValue(texto);
  caixa.setWrap(true).setVerticalAlignment('top').setHorizontalAlignment('left')
       .setFontSize(8);
}

function preencherRodape(folha, d, est, log) {
  // Receita resumida (os passos da ficha técnica).
  if (d.preparacao && est.linhaPreparacao) {
    try { escreverPreparacao(folha, d.preparacao, est, log); }
    catch (e) { log.push('preparação: ' + e); }
  }

  if (est.linhaTurma && d.turma) {
    try { folha.getRange(est.linhaTurma, est.colTurma).setValue(d.turma); }
    catch (e) { log.push('turma: ' + e); }
  }

  // A data que as compras leem: o dia em que os ingredientes têm de estar
  // na cozinha. A etiqueta da cópia passa a dizê-lo.
  var dataIng = d.dataIngredientes || d.dataAula;
  if (est.linhaData && dataIng) {
    try {
      if (est.colData) folha.getRange(est.linhaData, est.colData).setValue('Ingredientes até:');
      folha.getRange(est.linhaData, est.colTurma).setValue(formatarData(dataIng));
    }
    catch (e) { log.push('data: ' + e); }
  }

  if (est.linhaFormador && d.formador) {
    try { folha.getRange(est.linhaFormador, est.colTurma).setValue(d.formador); }
    catch (e) { log.push('formador: ' + e); }
  }

  // Atividade, com o dia da aula e o dia em que a requisição foi feita.
  if (est.linhaAtividade) {
    var partes = [];
    if (d.atividade) partes.push(d.atividade);
    if (d.dataDaAula) partes.push('Aula: ' + formatarData(d.dataDaAula));
    partes.push('Requisição feita em: ' + formatarData(d.dataRequisicao || new Date()));
    try {
      var ca = folha.getRange(est.linhaAtividade + 1, est.colAtividade || 11);
      var ma = ca.getMergedRanges();
      (ma.length ? ma[0].getCell(1, 1) : ca).setValue(partes.join('\n')).setWrap(true);
      if (d.atividade) folha.getRange(est.linhaAtividade, 13).setValue(d.atividade);
    }
    catch (e) { log.push('atividade: ' + e); }
  }

  if (est.linhaResponsavel && d.responsavel) {
    try { folha.getRange(est.linhaResponsavel, 16).setValue(d.responsavel); }
    catch (e) { log.push('responsável: ' + e); }
  }

  // Consumo — X na coluna ao lado de cada etiqueta.
  var c = d.consumo || {};
  var marcas = [
    [est.linhaBar,        c.bar],
    [est.linhaRest,       c.rest],
    [est.linhaInterno,    c.interno],
    [est.linhaConvidados, c.convidados],
  ];
  for (var i = 0; i < marcas.length; i++) {
    if (marcas[i][0]) {
      // O quadrado está três colunas depois da etiqueta («ECL BAR» em K,
      // quadrado em M): a v5 escrevia uma coluna ao lado, fora do quadrado.
      try { folha.getRange(marcas[i][0], est.colConsumo).setValue(marcas[i][1] ? 'X' : '')
              .setHorizontalAlignment('center').setVerticalAlignment('middle').setFontWeight('bold'); }
      catch (e) { log.push('consumo: ' + e); }
    }
  }
}


/** A nota das doses, numa linha própria por baixo das assinaturas. */
function escreverNotaDoses(folha, texto, est, log) {
  if (!texto) return;
  try {
    var ultimaUsada = folha.getLastRow();
    var linha = Math.max(ultimaUsada, est.linhaAssinaturas || 0) + 2;
    // Largura: até à última coluna com conteúdo no rodapé (19 = S no modelo).
    var largura = Math.max(10, Math.min(folha.getLastColumn(), 19));
    var r = folha.getRange(linha, 1, 1, largura);
    r.merge();
    var nLinhas = String(texto).split('\n').length;
    r.getCell(1, 1).setValue(texto);
    r.setWrap(true).setVerticalAlignment('top').setHorizontalAlignment('left')
     .setFontSize(8).setFontStyle('italic');
    folha.setRowHeight(linha, Math.max(21, 14 * (nLinhas + 1)));
  } catch (e) { log.push('nota das doses: ' + e); }
}


// ══════════════════════════════════════════════════════════════
// E-MAIL ÀS COMPRAS
// ══════════════════════════════════════════════════════════════

function enviarEmailCompras(d, url, log) {
  var emails = (Array.isArray(d.emailsCompras) ? d.emailsCompras : String(d.emailsCompras || '').split(/[,;\s]+/))
    .map(function (x) { return String(x || '').trim(); })
    .filter(function (x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); });
  if (!emails.length) return '';
  try {
    if (MailApp.getRemainingDailyQuota() < 1) { log.push('e-mail: limite diário atingido'); return ''; }
    var dataIng = formatarData(d.dataIngredientes || d.dataAula || '');
    var assunto = 'Requisição de matérias-primas — ' + (d.nomeReceita || 'Requisição')
      + (dataIng ? ' — ingredientes até ' + dataIng : '');
    var linhas = [
      'Exmos. Senhores,',
      '',
      'Junto envio a requisição de matérias-primas referente a «' + (d.nomeReceita || '') + '»'
        + (d.turma ? ', da turma ' + d.turma : '') + (d.atividade ? ', para a atividade «' + d.atividade + '»' : '') + '.',
      '',
      dataIng ? 'Os ingredientes deverão estar disponíveis na cozinha até ' + dataIng + '.' : '',
      d.dataDaAula ? 'A aula realiza-se a ' + formatarData(d.dataDaAula) + '.' : '',
      '',
      'A requisição pode ser consultada aqui: ' + url,
      '',
      'Com os melhores cumprimentos,',
      d.formador || '',
      'Escola de Comércio de Lisboa'
    ].filter(function (l, i, a) { return l !== '' || (i > 0 && a[i - 1] !== ''); });
    MailApp.sendEmail({ to: emails.join(','), subject: assunto, body: linhas.join('\n'), name: 'Requisições ECL' });
    log.push('E-mail enviado a ' + emails.join(', '));
    return new Date().toISOString();
  } catch (e) {
    log.push('e-mail: ' + e);
    return '';
  }
}


// ══════════════════════════════════════════════════════════════
// APOIO
// ══════════════════════════════════════════════════════════════

function nomeParaAba(d) {
  var nome = String(d.nomeReceita || 'Requisicao').trim().replace(/([^.])\.$/, '$1');
  var base = (d.numero ? d.numero + '_' : '')
    + nome.replace(/[\/\\*\[\]?:]/g, '_');
  var carimbo = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'ddMM_HHmm');
  return (base.substring(0, 22) + '_' + carimbo).substring(0, 30);
}

function formatarData(valor) {
  try {
    var s = String(valor || '');
    // «2026-10-06» lê-se como o dia certo em Lisboa (meio-dia, sem fuso).
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : (valor instanceof Date ? valor : new Date(valor));
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, 'Europe/Lisbon', 'dd/MM/yyyy');
    }
  } catch (e) { /* já vem formatada */ }
  return String(valor);
}

function guardarEmDadosApp(ss, dados, log) {
  try {
    var aba = ss.getSheetByName('DADOS_APP');
    if (!aba) {
      aba = ss.insertSheet('DADOS_APP');
      aba.getRange('A1:E1').setValues([['Campo', 'Valor', 'Und', 'Preço', 'Qt1pax']])
        .setFontWeight('bold').setBackground('#E8E8E8');
      aba.hideSheet();
    }

    var ultima = aba.getLastRow();
    if (ultima > 1) aba.getRange(2, 1, ultima - 1, 5).clearContent();

    var c = dados.consumo || {};
    var campos = [
      ['nomeReceita', dados.nomeReceita || ''], ['numero', dados.numero || ''],
      ['familia', dados.familia || ''], ['paxTotal', dados.paxTotal || ''],
      ['paxReceita', dados.paxReceita || ''], ['turma', dados.turma || ''],
      ['dataIngredientes', dados.dataIngredientes || dados.dataAula || ''], ['formador', dados.formador || ''],
      ['responsavel', dados.responsavel || ''], ['atividade', dados.atividade || ''],
      ['consumo_bar', c.bar ? 'X' : ''], ['consumo_rest', c.rest ? 'X' : ''],
      ['consumo_interno', c.interno ? 'X' : ''], ['consumo_convidados', c.convidados ? 'X' : ''],
      ['preparacao', dados.preparacao || ''],
      ['dataDaAula', dados.dataDaAula || ''], ['dataRequisicao', dados.dataRequisicao || ''],
      ['notaDoses', dados.notaDoses || ''],
    ];
    for (var i = 0; i < campos.length; i++) {
      aba.getRange(i + 2, 1, 1, 2).setValues([campos[i]]);
    }

    var ings = dados.ingredientes || [];
    aba.getRange(22, 1, 1, 5).setValues([
      ['--- INGREDIENTES (' + ings.length + ') ---', 'QtReceita', 'Und', 'Preço Unit.', 'Qt1pax']
    ]).setFontWeight('bold').setBackground('#E8F5E9');

    if (ings.length) {
      var linhas = ings.map(function (g) {
        return [g.nome || '', g.qtReceita || '', g.und || '', parseFloat(g.preco) || 0, ''];
      });
      aba.getRange(23, 1, linhas.length, 5).setValues(linhas);
    }
    SpreadsheetApp.flush();
  } catch (e) {
    log.push('DADOS_APP: ' + e);
  }
}

function resposta(ok, mensagem, log, extra) {
  var payload = { ok: ok, mensagem: mensagem, log: log || [] };
  if (extra) for (var k in extra) payload[k] = extra[k];
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}


// ══════════════════════════════════════════════════════════════
// TESTES — correr à mão no editor
// ══════════════════════════════════════════════════════════════

/** Mostra o que o script vê no modelo, sem escrever nada. */
function verEstrutura() {
  var ss = abrirFolha();
  var m = encontrarModelo(ss);

  Logger.log('── FOLHAS NESTE FICHEIRO ──');
  ss.getSheets().forEach(function (f) { Logger.log('  [' + f.getName() + ']'); });
  Logger.log('');

  if (!m) {
    Logger.log('MODELO NÃO ENCONTRADO.');
    Logger.log('Escreve o nome exacto de uma das folhas acima em NOME_MODELO.');
    return;
  }

  var est = lerEstrutura(m);
  Logger.log('Modelo: ' + m.getName());
  Logger.log('Ingredientes: linhas ' + est.primeiraIng + ' a ' + est.ultimaIng
    + '  (' + est.capacidade + ' linhas)');
  Logger.log('Preparação: linha ' + est.linhaPreparacao + ' · Assinaturas: linha ' + est.linhaAssinaturas);
  Logger.log('Turma: ' + est.linhaTurma + ' · Data: ' + est.linhaData
    + ' · Formador: ' + est.linhaFormador);
  Logger.log('Atividade: ' + est.linhaAtividade + ' · Responsável: ' + est.linhaResponsavel);
  Logger.log('Consumo: bar ' + est.linhaBar + ', rest ' + est.linhaRest
    + ', interno ' + est.linhaInterno + ', convidados ' + est.linhaConvidados);
}

/** Requisição pequena — cabe no modelo sem inserir linhas. */
function testarPequena() {
  correrTeste(4, 'Teste pequeno');
}

/** Requisição grande — obriga a inserir linhas. */
function testarGrande() {
  correrTeste(80, 'Teste de 80 ingredientes');
}

function correrTeste(n, nome) {
  var ings = [];
  for (var i = 1; i <= n; i++) {
    ings.push({ nome: 'Produto ' + i, qtReceita: 0.1 * i, und: 'kg', preco: 1.5 });
  }
  var r = doPost({ postData: { contents: JSON.stringify({
    numero: 'R99', nomeReceita: nome, familia: 'Teste',
    paxTotal: 20, paxReceita: 10,
    turma: '1º ACP', dataAula: '2026-09-29', dataIngredientes: '2026-09-29',
    dataDaAula: '2026-09-30', dataRequisicao: '2026-09-25', formador: 'Rosa Almeida',
    responsavel: 'Raquel Ratado', atividade: 'Produção pedagógica',
    preparacao: '1. Primeiro passo.\n2. Segundo passo.\n3. Terceiro passo.',
    consumo: { interno: true },
    notaDoses: 'Nota: As 26 doses indicadas em «Encomendas» correspondem à soma das doses das 3 fichas técnicas desta requisição. '
      + 'Cada prato é produzido apenas para as doses indicadas:\n• Bacalhau à Brás: 6 doses\n• Marmelada Branca de Odivelas: 12 doses\n• Creme de Cenoura com Coentros: 8 doses',
    ingredientes: ings,
  }) } });
  Logger.log(r.getContent());
}
