// gerarGuiaoDocx.gs — Cria Google Doc no modelo oficial ECL
// Usa Google Docs REST API para substituir marcadores em shapes
//
// Script Properties: ANTHROPIC_API_KEY = sk-ant-...
// OAuth Scopes necessários: https://www.googleapis.com/auth/documents
//                           https://www.googleapis.com/auth/drive

var ID_MODELO    = '1A50fuDmR-r3HgffZZ0BYQ58IjvLzw0uwsI2dsfNSyz0';
var PASTA_GUIOES = '1DokEeY6oU5ZIdL4ueMtak-yy86QTpUNf';

var FONTE      = 'Arial Narrow';
var TAM_CORPO  = 12;
var TAM_H2     = 13;
var TAM_H1     = 14;
var ESP_LINHAS = 1.5;
var COR_TITULO = '#00796B';
var COR_TEXTO  = '#1A1714';
var COR_TABELA = '#00796B';
var COR_ZEBRA  = '#E0F2F1';

// ── Entry point ───────────────────────────────────────────────
function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);
    if (dados.acao === 'gerarManualCompleto') return gerarManualCompleto(e);
    if (dados.acao === 'gerarParte') return gerarParte(dados.prompt);
    var url = gerarDocumento(dados);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, url: url }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Chamada Groq individual com retry ────────────────────────
function chamarGroq(chave, prompt) {
  var hdrs = {};
  hdrs['Authorization'] = 'Bearer ' + chave;
  var tentativas = 3;
  for (var t = 0; t < tentativas; t++) {
    var resp = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'post',
      contentType: 'application/json',
      headers: hdrs,
      payload: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 6000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
      muteHttpExceptions: true,
    });
    var status = resp.getResponseCode();
    var corpo  = JSON.parse(resp.getContentText());
    if (status === 429) {
      // Rate limit -- esperar 40 segundos e tentar de novo
      Utilities.sleep(40000);
      continue;
    }
    if (status !== 200) throw new Error('Groq API erro ' + status + ': ' + JSON.stringify(corpo));
    return corpo.choices[0].message.content || '';
  }
  throw new Error('Rate limit do Groq excedido apos 3 tentativas. Tenta de novo em 1 minuto.');
}

// ── Proxy Groq — 3 partes sequenciais com pausa ───────────────
function gerarParte(prompt) {
  var chave = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
  if (!chave) return ContentService
    .createTextOutput(JSON.stringify({ ok: false, erro: 'GROQ_API_KEY nao configurada nas Script Properties.' }))
    .setMimeType(ContentService.MimeType.JSON);
  try {
    var texto = chamarGroq(chave, prompt);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, texto: texto }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Gerar manual completo em 3 partes sequenciais ─────────────
function gerarManualCompleto(e) {
  var dados = JSON.parse(e.postData.contents);
  var prompts = dados.prompts || [];
  var chave = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
  if (!chave) return ContentService
    .createTextOutput(JSON.stringify({ ok: false, erro: 'GROQ_API_KEY nao configurada.' }))
    .setMimeType(ContentService.MimeType.JSON);
  try {
    var partes = [];
    for (var i = 0; i < prompts.length; i++) {
      if (i > 0) Utilities.sleep(35000); // pausa 35s entre partes
      partes.push(chamarGroq(chave, prompts[i]));
    }
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, texto: partes.join('\n\n') }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Substituir marcadores via REST API (alcança shapes) ───────
function substituirMarcadoresREST(docId, substituicoes) {
  var token = ScriptApp.getOAuthToken();
  var requests = substituicoes.map(function(s) {
    return {
      replaceAllText: {
        containsText: { text: s.de, matchCase: true },
        replaceText: s.para,
      }
    };
  });
  var url = 'https://docs.googleapis.com/v1/documents/' + docId + ':batchUpdate';
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify({ requests: requests }),
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() !== 200) {
    Logger.log('Erro REST: ' + resp.getContentText());
  }
}

// ── Gerar Google Doc ──────────────────────────────────────────
function gerarDocumento(d) {
  // Proteger contra payload incompleto
  d = d || {};
  var turmaNum = d.turmaAno || 3;
  var ref      = String(d.moduloId || '').indexOf('UC') === 0 ? '811RA144' : '811183';
  var anos     = turmaNum === 1 ? '2026-2029' : turmaNum === 2 ? '2025-2028' : '2024-2027';
  var sigla    = d.disciplinaSigla || obterSigla(d.disciplina || 'Servicos de Cozinha/Pastelaria');
  var titulo   = d.titulo || d.moduloNome || d.tituloManual || 'Manual';

  // 1. Copiar o modelo
  var copia = DriveApp.getFileById(ID_MODELO).makeCopy(
    'Manual_' + (d.moduloId || '') + '_' + titulo.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_'),
    DriveApp.getFolderById(PASTA_GUIOES)
  );
  var docId = copia.getId();

  // 2. Substituir marcadores via replaceText (o novo modelo usa marcadores no body normal)
  var doc  = DocumentApp.openById(docId);
  var body = doc.getBody();

  body.replaceText('\{\{TITULO_CURTO\}\}',     titulo.length > 35 ? titulo.split(' ').slice(0,4).join(' ') : titulo);
  body.replaceText('\{\{MODULO_NOME\}\}',      (d.moduloId || '') + ' — ' + (d.moduloNome || titulo));
  body.replaceText('\{\{ANO_LETIVO\}\}',       d.anoLetivo || '2026-2027');
  body.replaceText('\{\{DISCIPLINA_SIGLA\}\}', sigla);

  // Substituir também no header
  var hdr = doc.getHeader();
  if (hdr) {
    hdr.replaceText('\{\{TITULO_CURTO\}\}',     titulo.length > 35 ? titulo.split(' ').slice(0,4).join(' ') : titulo);
    hdr.replaceText('\{\{MODULO_NOME\}\}',      (d.moduloId || '') + ' — ' + (d.moduloNome || titulo));
    hdr.replaceText('\{\{ANO_LETIVO\}\}',       d.anoLetivo || '2026-2027');
    hdr.replaceText('\{\{DISCIPLINA_SIGLA\}\}', sigla);
  }

  // 3. Inserir o conteudo gerado pela IA
  // O template tem 5 seccoes de instrucao — o conteudo vai depois de cada uma
  // Por simplicidade: apagar as instrucoes e inserir o conteudo directamente
  if (d.textoGuia) {
    // Remover paragrafos de instrucao (os que comecem com "Cola aqui")
    var paragraphs = body.getParagraphs();
    var aRemover = [];
    for (var pi = 0; pi < paragraphs.length; pi++) {
      var txt = paragraphs[pi].getText();
      if (txt.indexOf('Cola aqui') === 0) {
        aRemover.push(paragraphs[pi]);
      }
    }
    for (var ri = 0; ri < aRemover.length; ri++) {
      aRemover[ri].removeFromParent();
    }
    // Inserir o conteudo no fim do documento
    body.appendPageBreak();
    inserirConteudo(body, d.textoGuia);
  }

  doc.saveAndClose();
  return 'https://docs.google.com/document/d/' + docId + '/edit';
}

// ── Inserir conteúdo markdown ─────────────────────────────────
function inserirConteudo(body, texto) {
  var linhas = texto.split('\n');
  var i = 0;
  while (i < linhas.length) {
    var l = linhas[i].replace(/\s+$/, '');

    if (l.indexOf('# ') === 0 && l.indexOf('## ') !== 0) {
      body.appendPageBreak();
      var p1 = body.appendParagraph(l.slice(2).trim());
      p1.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      p1.editAsText().setFontFamily(FONTE).setFontSize(TAM_H1).setForegroundColor(COR_TITULO).setBold(true);
      p1.setSpacingBefore(14).setSpacingAfter(8).setLineSpacing(ESP_LINHAS);
      i++; continue;
    }
    if (l.indexOf('## ') === 0 && l.indexOf('### ') !== 0) {
      var p2 = body.appendParagraph(l.slice(3).trim());
      p2.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      p2.editAsText().setFontFamily(FONTE).setFontSize(TAM_H2).setForegroundColor(COR_TITULO).setBold(true);
      p2.setSpacingBefore(12).setSpacingAfter(6).setLineSpacing(ESP_LINHAS);
      i++; continue;
    }
    if (l.indexOf('### ') === 0) {
      var p3 = body.appendParagraph(l.slice(4).trim());
      p3.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      p3.editAsText().setFontFamily(FONTE).setFontSize(TAM_CORPO).setForegroundColor(COR_TEXTO).setBold(true);
      p3.setSpacingBefore(8).setSpacingAfter(4).setLineSpacing(ESP_LINHAS);
      i++; continue;
    }

    if (l.indexOf('|') === 0 && l.lastIndexOf('|') === l.length - 1) {
      var headers = l.split('|').slice(1, -1).map(function(c) { return c.trim(); });
      i++;
      if (i < linhas.length && /^\|[-| ]+\|$/.test(linhas[i])) i++;
      var rows = [];
      while (i < linhas.length && linhas[i].indexOf('|') === 0) {
        rows.push(linhas[i].split('|').slice(1, -1).map(function(c) { return c.trim(); }));
        i++;
      }
      if (headers.length && rows.length) {
        var tbl = body.appendTable();
        var hr = tbl.appendTableRow();
        headers.forEach(function(h) {
          var cell = hr.appendTableCell(h);
          cell.setBackgroundColor(COR_TABELA);
          cell.editAsText().setFontFamily(FONTE).setFontSize(TAM_CORPO).setForegroundColor('#FFFFFF').setBold(true);
        });
        rows.forEach(function(r, ri) {
          var tr = tbl.appendTableRow();
          r.forEach(function(c) {
            var cell = tr.appendTableCell(c.replace(/\*\*/g, ''));
            if (ri % 2 === 0) cell.setBackgroundColor(COR_ZEBRA);
            cell.editAsText().setFontFamily(FONTE).setFontSize(TAM_CORPO).setForegroundColor(COR_TEXTO);
          });
        });
        body.appendParagraph('').setSpacingAfter(6);
      }
      continue;
    }

    if (/^[•\-]\s+/.test(l)) {
      var lp = body.appendParagraph(l.replace(/^[•\-]\s+/, '').replace(/\*\*/g, ''));
      lp.setListStyle(DocumentApp.ListStyle.BULLET);
      lp.editAsText().setFontFamily(FONTE).setFontSize(TAM_CORPO).setForegroundColor(COR_TEXTO);
      lp.setSpacingAfter(2).setLineSpacing(ESP_LINHAS);
      i++; continue;
    }
    if (/^\d+\.\s+/.test(l)) {
      var num = body.appendParagraph(l.replace(/^\d+\.\s+/, '').replace(/\*\*/g, ''));
      num.setListStyle(DocumentApp.ListStyle.NUMBER);
      num.editAsText().setFontFamily(FONTE).setFontSize(TAM_CORPO).setForegroundColor(COR_TEXTO);
      num.setSpacingAfter(2).setLineSpacing(ESP_LINHAS);
      i++; continue;
    }
    if (/^[-=]{3,}$/.test(l.trim())) {
      body.appendHorizontalRule();
      i++; continue;
    }
    if (l.trim()) {
      var pp = body.appendParagraph(l.replace(/\*\*/g, '').trim());
      pp.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
      pp.editAsText().setFontFamily(FONTE).setFontSize(TAM_CORPO).setForegroundColor(COR_TEXTO);
      pp.setSpacingAfter(4).setLineSpacing(ESP_LINHAS);
    }
    i++;
  }
}

function obterSigla(disciplina) {
  var d = String(disciplina).toLowerCase();
  if (d.indexOf('cozinha') >= 0 && d.indexOf('pastelaria') >= 0) return 'SCP';
  if (d.indexOf('restaurante') >= 0 || d.indexOf('bar') >= 0)    return 'SRB';
  if (d.indexOf('tecnologia') >= 0)                               return 'TA';
  if (d.indexOf('gestao') >= 0 || d.indexOf('controlo') >= 0)    return 'GC';
  return 'SCP';
}

function testarSubstituicao() {
  var copia = DriveApp.getFileById(ID_MODELO).makeCopy('Teste_marcadores', DriveApp.getFolderById(PASTA_GUIOES));
  substituirMarcadoresREST(copia.getId(), [
    { de: '{{TITULO_CURTO}}',     para: 'Cozinha Tradicional Portuguesa' },
    { de: '{{MODULO_NOME}}',      para: 'UFCD 16 — Planeamento e confeccao de cozinha tradicional portuguesa' },
    { de: '{{ANO_LETIVO}}',       para: '2026-2027' },
    { de: '{{DISCIPLINA_SIGLA}}', para: 'SCP' },
  ]);
  Logger.log('URL: https://docs.google.com/document/d/' + copia.getId() + '/edit');
}
function testarCriarDocumento() {
  var dados = {
    moduloId: 'UFCD 16',
    moduloNome: 'Planeamento e confeccao de cozinha tradicional portuguesa',
    titulo: 'Cozinha Tradicional Portuguesa',
    disciplina: 'Servicos de Cozinha/Pastelaria',
    disciplinaSigla: 'SCP',
    turmaAno: 3,
    anoLetivo: '2026-2027',
    textoGuia: 'Teste de conteudo. Capitulo 1. A cozinha portuguesa.',
  };
  var url = gerarDocumento(dados);
  Logger.log('URL: ' + url);
}
