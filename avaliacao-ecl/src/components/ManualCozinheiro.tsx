// gerarGuiaoDocx.gs — Gera um guião de módulo como Google Doc no Drive
// Chamado pela app via fetch POST (mesmo padrão dos outros scripts da Avaliação ECL)
// Deploy: Apps Script Web App — "Qualquer pessoa" — POST
//
// Payload esperado (JSON):
// {
//   titulo: string,
//   categoria: string,
//   nivel: string,
//   textoGuia: string,   // markdown gerado pela IA
//   criadoPor: string,
//   criadoEm: string,    // ISO
//   anoLetivo: string,
//   moduloId: string,    // ex: "UFCD 16" ou "UC02003"
//   disciplina: string,
//   horasPrevistas: number,
//   turmaAno: number,
// }
//
// Devolve JSON: { ok: true, url: "https://docs.google.com/..." }

// ── Configuração ──────────────────────────────────────────────
const PASTA_GUIOES_ID = '1DdwTcmFwgWxqrzj5nlnzzYxYbJr39XuD'; // ID da pasta no Drive onde guardar os guiões (preencher)
const MANTER_GOOGLE_DOC = true; // false = apaga após download (não recomendado)

// ── Cores (hex sem #) ─────────────────────────────────────────
const COR_COBRE  = '#8A561F';
const COR_SALVIA = '#5F7350';
const COR_CINZA  = '#6B655E';
const COR_ROXA   = '#6D28D9';

// ── Entry point ───────────────────────────────────────────────
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const url   = gerarDocumento(dados);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, url }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Gerar o Google Doc ────────────────────────────────────────
function gerarDocumento(d) {
  const nomeFicheiro = `Guiao_${(d.moduloId || '').replace(/\s/g, '_')}_${(d.titulo || '').slice(0, 40).replace(/[^a-zA-Z0-9À-ÿ ]/g, '').replace(/\s+/g, '_')}`;
  const doc  = DocumentApp.create(nomeFicheiro);
  const body = doc.getBody();
  body.clear();

  // Estilo base
  const estiloBase = body.getAttributes();
  body.setAttributes({ ...estiloBase });

  // ── CABEÇALHO ────────────────────────────────────────────────
  const turmaLabel = d.turmaAno === 1 ? '1.º Ano' : d.turmaAno === 2 ? '2.º Ano' : '3.º Ano';
  const referencial = d.moduloId && d.moduloId.startsWith('UC') ? '811RA144' : '811183';

  function addCabecalho(texto, tamanho, cor, negrito) {
    const p = body.appendParagraph(texto);
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    p.editAsText().setFontSize(tamanho).setForegroundColor(cor).setBold(negrito);
    p.setSpacingAfter(4);
    return p;
  }

  addCabecalho('ESCOLA DE COMÉRCIO DE LISBOA', 14, COR_CINZA, true);
  addCabecalho('Curso Profissional de Técnico de Cozinha-Pastelaria', 11, COR_CINZA, false);
  addCabecalho(`${turmaLabel}  ·  Referencial ${referencial}`, 11, COR_CINZA, false);
  addCabecalho(d.disciplina || '', 11, COR_CINZA, false);
  addCabecalho(`${d.moduloId || ''} — ${d.titulo || ''}`, 13, COR_COBRE, true);
  body.appendHorizontalRule();
  body.appendParagraph('').setSpacingAfter(12);
  addCabecalho(`Carga Horária: ${d.horasPrevistas || '—'} horas  ·  Ano Lectivo ${d.anoLetivo || ''}`, 10, COR_CINZA, false);






  // ── CORPO (markdown → Doc) ────────────────────────────────────
  const linhas = (d.textoGuia || '').split('\n');
  let i = 0;

  while (i < linhas.length) {
    const l = linhas[i].trimEnd();

    // Headings
    if (l.startsWith('## ')) {
      const p = body.appendParagraph(l.slice(3).trim());
      p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      p.editAsText().setForegroundColor(COR_SALVIA).setFontFamily('Arial').setFontSize(13);
      p.setSpacingBefore(14).setSpacingAfter(6);
      i++; continue;
    }
    if (l.startsWith('### ')) {
      const p = body.appendParagraph(l.slice(4).trim());
      p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      p.editAsText().setForegroundColor('#2E2A26').setFontFamily('Arial').setFontSize(12).setBold(true);
      p.setSpacingBefore(10).setSpacingAfter(4);
      i++; continue;
    }
    if (l.startsWith('# ')) {
      const p = body.appendParagraph(l.slice(2).trim());
      p.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      p.editAsText().setForegroundColor(COR_COBRE).setFontFamily('Arial').setFontSize(15).setBold(true);
      p.setSpacingBefore(16).setSpacingAfter(8);
      body.appendPageBreak();
      i++; continue;
    }

    // Caixa emoji
    const mCaixa = l.match(/^(🎯|💡|✏️)\s+\*?\*?([^*\n]+)\*?\*?$/);
    if (mCaixa) {
      const cor = mCaixa[1] === '🎯' ? '#5A3E00' : mCaixa[1] === '✏️' ? '#4E7A25' : COR_COBRE;
      const label = body.appendParagraph(`${mCaixa[1]}  ${mCaixa[2].trim()}`);
      label.editAsText().setForegroundColor(cor).setFontFamily('Arial').setFontSize(11).setBold(true);
      label.setSpacingBefore(10).setSpacingAfter(2);
      i++;
      while (i < linhas.length && linhas[i].trim() !== '') {
        const lp = body.appendParagraph('    ' + linhas[i].trim().replace(/^[•\-]\s*/, ''));
        lp.editAsText().setForegroundColor('#2E2A26').setFontFamily('Arial').setFontSize(10);
        lp.setSpacingAfter(2);
        i++;
      }
      body.appendParagraph('').setSpacingAfter(4);
      continue;
    }

    // Tabela markdown
    if (l.startsWith('|') && l.endsWith('|')) {
      const headers = l.split('|').slice(1, -1).map(c => c.trim());
      i++;
      if (i < linhas.length && /^\|[-| ]+\|$/.test(linhas[i])) i++;
      const rows = [];
      while (i < linhas.length && linhas[i].startsWith('|')) {
        rows.push(linhas[i].split('|').slice(1, -1).map(c => c.trim()));
        i++;
      }
      if (headers.length && rows.length) {
        const nc  = headers.length;
        const tbl = body.appendTable();
        // cabeçalho
        const hr = tbl.appendTableRow();
        headers.forEach(h => {
          const cell = hr.appendTableCell(h);
          cell.editAsText().setForegroundColor('#FFFFFF').setFontFamily('Arial').setFontSize(10).setBold(true);
          cell.setBackgroundColor(COR_COBRE);
        });
        // linhas
        rows.forEach((r, ri) => {
          const tr = tbl.appendTableRow();
          r.forEach(c => {
            const cell = tr.appendTableCell(c);
            cell.editAsText().setForegroundColor('#2E2A26').setFontFamily('Arial').setFontSize(10);
            if (ri % 2 === 0) cell.setBackgroundColor('#F5F0E6');
          });
        });
        body.appendParagraph('').setSpacingAfter(8);
      }
      continue;
    }

    // Lista
    if (/^[•\-]\s+/.test(l)) {
      const p = body.appendParagraph(l.replace(/^[•\-]\s+/, ''));
      p.setListStyle(DocumentApp.ListStyle.BULLET);
      p.editAsText().setFontFamily('Arial').setFontSize(11);
      p.setSpacingAfter(2);
      i++; continue;
    }

    // Parágrafo normal
    if (l.trim() && !/^[-=]{3,}$/.test(l)) {
      const p = body.appendParagraph(l.replace(/\*\*/g, '').trim());
      p.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
      p.editAsText().setFontFamily('Arial').setFontSize(11).setForegroundColor('#2E2A26');
      p.setLineSpacing(1.5).setSpacingAfter(6);
    }
    i++;
  }

  // ── Mover para a pasta configurada ───────────────────────────
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  if (PASTA_GUIOES_ID) {
    DriveApp.getFolderById(PASTA_GUIOES_ID).addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }

  return doc.getUrl();
}

// ── Teste manual (corre no editor do Apps Script) ─────────────
function testarGerarGuiao() {
  const resultado = gerarDocumento({
    titulo: 'Planeamento e confeção de cozinha tradicional portuguesa',
    categoria: 'Cozinha Tradicional',
    nivel: 'Avançado',
    textoGuia: `# 1. Apresentação do Módulo\nA cozinha tradicional portuguesa é uma das mais ricas da Europa.\n\n🎯 Objectivos do Módulo\n• Identificar os pratos emblemáticos por região\n• Preparar receitas com técnica e rigor histórico\n\n## 2. Identidade e Influências\n### 2.1 Raízes históricas\nA expansão marítima moldou a nossa gastronomia.\n\n| Influência | Período | Ingredientes | Pratos |\n|---|---|---|---|\n| Árabe | Séc. VIII | Amêndoa, açúcar | Doçaria algarvia |\n| Africana | Séc. XV | Milho, piri-piri | Caldo verde |\n\n💡 Sabias que…\nPortugal é dos países europeus com maior diversidade gastronómica regional.`,
    criadoPor: 'Rosa Almeida',
    criadoEm: new Date().toISOString(),
    anoLetivo: '2026-2027',
    moduloId: 'UFCD 16',
    disciplina: 'Serviços de Cozinha/Pastelaria',
    horasPrevistas: 50,
    turmaAno: 3,
  });
  Logger.log('URL do documento: ' + resultado);
}

// ══════════════════════════════════════════════════════════════
// PROXY IA — endpoint para o ManualCozinheiro chamar a API Claude
// ══════════════════════════════════════════════════════════════
//
// ANTES DE USAR:
// 1. No editor do Apps Script → Definições do projecto → Propriedades do script
// 2. Adicionar propriedade: ANTHROPIC_API_KEY = sk-ant-...
// 3. Fazer Implementar → Nova versão → Implementar
//
// O doPost já existente passa a encaminhar para gerarDocumento() OU
// para proxyIA() consoante o campo "acao" no payload.

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);

    // Encaminhar para proxy IA
    if (dados.acao === 'gerarGuiaoIA') {
      return proxyIA(dados.prompt);
    }

    // Comportamento original — gerar Google Doc
    const url = gerarDocumento(dados);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, url }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Chamada simples à API Claude ─────────────────────────────
function chamarClaude(chave, mensagens, maxTokens) {
  maxTokens = maxTokens || 4000;
  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': chave,
      'anthropic-version': '2023-06-01',
    },
    payload: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: mensagens,
    }),
    muteHttpExceptions: true,
  });
  const status = resp.getResponseCode();
  const corpo  = JSON.parse(resp.getContentText());
  if (status !== 200) throw new Error('API erro ' + status + ': ' + JSON.stringify(corpo));
  return (corpo.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

// ── Proxy IA — geração em cadeia, devolve guião completo ─────
//
// Estratégia: gera o guião em 3 partes sequenciais (cada uma
// com contexto da anterior) e concatena tudo antes de devolver.
// A app recebe sempre o documento inteiro — nunca um fragmento.
//
// Partes:
//   1 — Cabeçalho + Secções 1-3 (apresentação, fundamentos, cap. temáticos iniciais)
//   2 — Secções 4-6 (cap. temáticos restantes + aplicação contemporânea)
//   3 — Secção 7-8 + Síntese e Avaliação (conceitos-chave, proposta, recursos)

function proxyIA(promptBase) {
  const chave = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!chave) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: 'ANTHROPIC_API_KEY não configurada nas Script Properties.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    // ── PARTE 1 ───────────────────────────────────────────────
    const promptP1 = promptBase + '

' +
      'INSTRUÇÕES DE GERAÇÃO:
' +
      'Gera APENAS as secções 1, 2 e 3 do guião (Apresentação do Módulo, Fundamentos/Identidade e primeiro(s) capítulo(s) temático(s)).
' +
      'Inclui o cabeçalho completo do documento no início.
' +
      'Termina a secção 3 completa e para — não continues para a secção 4.
' +
      'Escreve "===CONTINUA===" na última linha.';

    const msgs1 = [{ role: 'user', content: promptP1 }];
    const texto1 = chamarClaude(chave, msgs1, 4000).replace('===CONTINUA===', '').trim();

    // ── PARTE 2 ───────────────────────────────────────────────
    const promptP2 = 'Continua o guião que começaste. Aqui está o que já foi escrito:

' +
      texto1 + '

' +
      'Agora gera as secções 4, 5 e 6 (capítulos temáticos restantes e aplicação contemporânea/profissional).
' +
      'Mantém o mesmo estilo, formato e idioma (português europeu, pré-Acordo).
' +
      'Termina a secção 6 completa e para.
' +
      'Escreve "===CONTINUA===" na última linha.';

    const msgs2 = [{ role: 'user', content: promptP2 }];
    const texto2 = chamarClaude(chave, msgs2, 4000).replace('===CONTINUA===', '').trim();

    // ── PARTE 3 ───────────────────────────────────────────────
    const promptP3 = 'Continua e termina o guião. Aqui está o que já foi escrito:

' +
      texto1 + '

' + texto2 + '

' +
      'Agora gera a secção 7 (Aplicação contemporânea, se ainda não gerada) e a secção 8 completa:
' +
      '## 8. Síntese e Avaliação
' +
      'Com os três blocos obrigatórios:
' +
      '• Conceitos-chave (lista com "•")
' +
      '• Proposta de Avaliação: prova prática (60%) • trabalho de pesquisa (25%) • teste escrito (15%)
' +
      '• Recursos e Referências (reais)
' +
      'Este é o fim do guião — termina com os Recursos e Referências, sem nenhuma nota adicional.';

    const msgs3 = [{ role: 'user', content: promptP3 }];
    const texto3 = chamarClaude(chave, msgs3, 3000).trim();

    // ── JUNTAR TUDO ───────────────────────────────────────────
    const guiaoCompleto = texto1 + '

' + texto2 + '

' + texto3;

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, texto: guiaoCompleto }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Teste manual no editor
function testarProxyIA() {
  const resultado = proxyIA('Constrói um guião de módulo sobre "Planeamento e confeção de carnes, aves e caça" para o 2º ano do Curso Profissional de Técnico de Cozinha-Pastelaria da Escola de Comércio de Lisboa.');
  const data = JSON.parse(resultado.getContent());
  Logger.log(data.ok ? data.texto.slice(0, 500) + '...' : 'ERRO: ' + data.erro);
}
