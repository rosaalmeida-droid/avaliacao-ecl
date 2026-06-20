function doPost(e) {
  try {
    // Alinhado com os outros scripts ECL: corpo enviado como JSON puro
    // (Content-Type: text/plain), não FormData — chega sempre via postData.contents.
    const raw = (e.postData && e.postData.contents) || (e.parameter && e.parameter.dados) || '{}';
    const dados = JSON.parse(raw);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const folha1 = ss.getSheetByName('Folha1');
    
    if (!folha1) return resposta(false, 'Aba Folha1 nao encontrada');

    const paxR = parseFloat(dados.paxReceita) || 1;
    const paxT = parseFloat(dados.paxTotal) || 15;

    // Criar copia com nome receita + data
    const agora = new Date();
    const data = Utilities.formatDate(agora, 'Europe/Lisbon', 'dd-MM-yyyy');
    const nomeReceita = (dados.nomeReceita || 'Receita').substring(0, 20);
    const nomeAba = (nomeReceita + '_' + data)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 50);
    
    // Apagar aba anterior com mesmo nome se existir
    const abaExistente = ss.getSheetByName(nomeAba);
    if (abaExistente) ss.deleteSheet(abaExistente);
    
    // Copiar Folha1 (modelo)
    const sheet = folha1.copyTo(ss);
    sheet.setName(nomeAba);

    // ── CABECALHO ─────────────────────────────────────────────
    // D5 — nome da receita (linha 5, coluna D=4)
    sheet.getRange('D5').setValue(dados.nomeReceita || '');
    sheet.getRange('B7').setValue(dados.familia || '');
    sheet.getRange('H7').setValue(paxT);   // Encomendas
    sheet.getRange('L7').setValue(paxR);   // Receita para

    // ── LIMPAR LINHAS 16 A 58 (43 linhas de ingredientes) ──────
    // Coluna A (Quantidade 1 pax) é FÓRMULA calculada a partir de B — nunca escrever lá.
    for (let i = 0; i < 43; i++) {
      const row = 16 + i;
      sheet.getRange(row, 2).setValue('');  // B - qty receita
      try { sheet.getRange(row, 3).setValue(''); } catch(e) {}  // C - nome (pode estar mesclada)
      sheet.getRange(row, 8).setValue('');  // H - unidade
      sheet.getRange(row, 12).setValue(''); // L - preco unitario
    }

    // ── PREENCHER INGREDIENTES ────────────────────────────────
    const ingredientes = dados.ingredientes || [];
    ingredientes.forEach(function(ing, i) {
      if (i >= 43 || !ing.nome) return;
      const row = 16 + i;

      const qtRec = parseFloat(ing.qtReceita) || 0;
      const preco = parseFloat(ing.preco)     || 0;

      // B(2) = qty receita — a coluna A (Quantidade 1 pax) calcula-se sozinha por fórmula
      if (qtRec > 0) {
        try { sheet.getRange(row, 2).setValue(qtRec); } catch(e) {}
      }
      // C(3) = nome ingrediente — pode estar mesclado
      try { sheet.getRange(row, 3).setValue(ing.nome); } catch(e) {
        try { sheet.getRange('C' + row).setValue(ing.nome); } catch(e2) {}
      }
      // H(8) = unidade
      try { sheet.getRange(row, 8).setValue(ing.und || ''); } catch(e) {}
      // L(12) = preco unitario
      if (preco > 0) {
        try { sheet.getRange(row, 12).setValue(preco); } catch(e) {}
      }
    });

    // ── CONSUMO (J64-J67) ─────────────────────────────────────
    const consumo = dados.consumo || {};
    try {
      sheet.getRange('J64').setValue(consumo.bar        ? 'X' : '');
      sheet.getRange('J65').setValue(consumo.rest       ? 'X' : '');
      sheet.getRange('J66').setValue(consumo.interno    ? 'X' : '');
      sheet.getRange('J67').setValue(consumo.convidados ? 'X' : '');
    } catch(e) {}

    // ── INFO AULA (coluna R, linhas 64-66) ─────────────────────
    try { sheet.getRange('R64').setValue(dados.turma      || ''); } catch(e) {}
    try { sheet.getRange('R65').setValue(dados.dataAula   || ''); } catch(e) {}
    try { sheet.getRange('R66').setValue(dados.formador   || ''); } catch(e) {}

    // ── ATIVIDADE (a partir de K70) ────────────────────────────
    try { sheet.getRange('K70').setValue(dados.atividade  || ''); } catch(e) {}

    // ── RESPONSÁVEL COMPRAS (linha 76, zona de assinatura) ─────
    try { sheet.getRange('N76').setValue(dados.responsavel|| ''); } catch(e) {}

    // ── PREPARACAO ────────────────────────────────────────────
    try { sheet.getRange('A59').setValue(dados.preparacao || ''); } catch(e) {}

    // Mover aba para o fim
    try {
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(ss.getNumSheets());
    } catch(e) {}

    return resposta(true, 'Requisicao criada: ' + nomeAba + ' | ' + ingredientes.length + ' ingredientes');

  } catch(err) {
    return resposta(false, 'Erro: ' + err.toString() + ' | Stack: ' + err.stack);
  }
}

function resposta(ok, mensagem) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, mensagem: mensagem }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return resposta(true, 'Apps Script Requisicao ECL v3 ativo');
}

// Testar manualmente — executa esta funcao no editor para depurar
function testarEnvio() {
  const mockDados = {
    nomeReceita: 'Bacalhau a Bras + Bacalhau a Narcisa',
    familia: 'Peixe',
    paxTotal: 15,
    paxReceita: 4,
    turma: '2ARB',
    dataAula: '2026-06-16',
    formador: 'Rosa Almeida',
    responsavel: 'Maria Silva',
    atividade: 'Almoco Erasmus tour - 2ARB e 2ACP',
    consumo: { bar: false, rest: true, interno: false, convidados: false },
    ingredientes: [
      { nome: 'Bacalhau demolhado', qty1pax: '0.125', qtReceita: '0.500', und: 'kg', preco: '13.99' },
      { nome: 'Ovos', qty1pax: '1', qtReceita: '4', und: 'un', preco: '0.25' },
      { nome: 'Azeite virgem extra', qty1pax: '0.010', qtReceita: '0.040', und: 'l', preco: '6.65' },
      { nome: 'Cebola', qty1pax: '0.033', qtReceita: '0.130', und: 'kg', preco: '0.89' },
    ],
  };
  
  const mockE = {
    parameter: { dados: JSON.stringify(mockDados) },
    postData: { contents: JSON.stringify(mockDados) }
  };
  
  const resultado = doPost(mockE);
  Logger.log(resultado.getContent());
}
