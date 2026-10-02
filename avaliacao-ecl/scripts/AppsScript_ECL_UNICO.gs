
// ══════════════════════════════════════════════════════════════
// (v19) A ARRUMAÇÃO DA NOITE
// ══════════════════════════════════════════════════════════════
// Junta as linhas repetidas das folhas onde os alunos acrescentam linhas
// (a mais recente manda), e faz as folhas legíveis que ficaram por fazer.
// Corre sozinha de noite, quando ninguém está a usar a aplicação.
// Para a ligar: Executar → instalarTarefas (uma vez).
function arrumacaoDaNoite() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = ficheiro();
    for (var t in RAPIDOS) {
      var nome = RAPIDOS[t];
      var f = ss.getSheetByName(nome);
      if (!f || f.getLastRow() < 3) continue;
      var todos = lerComEliminados(nome);
      var juntos = juntarRepetidos(nome, todos.vivos);
      if (juntos.length === todos.vivos.length) continue;
      var linhas = juntos.map(function (o) { return linhaDe(nome, o); }).concat(todos.linhasEliminadas);
      f.getRange(2, 1, f.getLastRow() - 1, f.getLastColumn()).clearContent();
      if (linhas.length) f.getRange(2, 1, linhas.length, linhas[0].length).setValues(linhas);
      if (f.getLastRow() > linhas.length + 1) f.deleteRows(linhas.length + 2, f.getLastRow() - linhas.length - 1);
    }
    Logger.log('Arrumação da noite feita.');
  } finally { try { lock.releaseLock(); } catch (e) {} }
  tratarPendentes();
}
/** As linhas de uma folha: as vivas (objetos) e as marcadas como eliminadas (tal como estão). */
function lerComEliminados(nome) {
  var f = folha(ficheiro(), nome);
  var dados = f.getDataRange().getValues();
  var colunas = dados[0], iReg = colunas.indexOf(COL_REGISTO), iEl = colunas.indexOf(COL_ELIMINADO);
  var vivos = [], elim = [];
  for (var i = 1; i < dados.length; i++) {
    if (dados[i].every(function (v) { return v === '' || v === null; })) continue;
    if (iEl >= 0 && dados[i][iEl]) { elim.push(dados[i]); continue; }
    var obj = {};
    try { obj = JSON.parse(dados[i][iReg] || '{}'); } catch (e) { obj = {}; }
    for (var c = 0; c < colunas.length; c++) {
      if (c === iReg || c === iEl) continue;
      var v = dados[i][c];
      if (v !== '' && v !== null && v !== undefined && obj[colunas[c]] === undefined) obj[colunas[c]] = valorTexto(v);
    }
    vivos.push(obj);
  }
  return { vivos: vivos, linhasEliminadas: elim };
}
function instalarArrumacaoDaNoite() { instalarTarefas(); }
// ══════════════════════════════════════════════════════════════
// (v19) JUNTAR OS FICHEIROS «Avaliação ECL — Dados» NUM SÓ
// ══════════════════════════════════════════════════════════════
// Corre-se uma vez à mão (Executar → juntarFicheiros). Procura no Drive
// todos os ficheiros com este nome, junta os registos que faltam no
// ficheiro principal (o da propriedade ECL_FICHEIRO_DADOS) e muda o nome
// dos outros para «… (antigo — não usar)». Não apaga nada.
function juntarFicheiros() {
  // (v19.1) Rápida e sem trancar a aplicação: lê o principal UMA vez por
  // folha, só tranca o script no instante de escrever, e pára antes dos
  // 6 minutos do Google — nesse caso, basta carregar outra vez em
  // Executar (continua onde ficou; nada entra duas vezes).
  var inicio = Date.now(), LIMITE = 4.5 * 60 * 1000;
  var principal = ficheiro();
  var idPrincipal = principal.getId();
  var outros = [];
  var it = DriveApp.getFilesByName(NOME_FICHEIRO);
  while (it.hasNext()) { var fx = it.next(); if (fx.getId() !== idPrincipal && !fx.isTrashed()) outros.push(fx); }
  var relatorio = [], existentesPorFolha = {}, acabou = true;
  function existentes(nome) {
    if (!existentesPorFolha[nome]) {
      var m = {};
      var f = principal.getSheetByName(nome);
      if (f && f.getLastRow() >= 2) {
        var d = f.getDataRange().getValues(), col = d[0], iReg = col.indexOf(COL_REGISTO);
        for (var i = 1; i < d.length; i++) {
          var o = {};
          try { o = JSON.parse(d[i][iReg] || '{}'); } catch (e) { o = {}; }
          FOLHAS[nome].chave.forEach(function (c) { var k = col.indexOf(c); if (o[c] === undefined && k >= 0) o[c] = valorTexto(d[i][k]); });
          m[chaveDe(nome, o)] = true;
        }
      }
      existentesPorFolha[nome] = m;
    }
    return existentesPorFolha[nome];
  }
  for (var n = 0; n < outros.length; n++) {
    if (Date.now() - inicio > LIMITE) { acabou = false; break; }
    var fx2 = outros[n], ss;
    try { ss = SpreadsheetApp.openById(fx2.getId()); } catch (e) { relatorio.push(fx2.getId() + ': não abriu'); continue; }
    var juntos = 0;
    var folhasDoOutro = ss.getSheets();
    for (var s2 = 0; s2 < folhasDoOutro.length; s2++) {
      var f = folhasDoOutro[s2], nome = f.getName();
      if (!FOLHAS[nome] || f.getLastRow() < 2) continue;      // folhas vazias: salta logo
      var dados = f.getDataRange().getValues();
      var col = dados[0], iReg = col.indexOf(COL_REGISTO), iEl = col.indexOf(COL_ELIMINADO);
      var ja = existentes(nome), novas = [];
      for (var i = 1; i < dados.length; i++) {
        if (iEl >= 0 && dados[i][iEl]) continue;
        var obj = {};
        try { obj = JSON.parse(dados[i][iReg] || '{}'); } catch (e) { obj = {}; }
        for (var c = 0; c < col.length; c++) {
          if (c === iReg || c === iEl) continue;
          var v = dados[i][c];
          if (v !== '' && v !== null && v !== undefined && obj[col[c]] === undefined) obj[col[c]] = valorTexto(v);
        }
        var k = chaveDe(nome, obj);
        if (!k.replace(/\|/g, '') || ja[k]) continue;
        ja[k] = true;
        novas.push(linhaDe(nome, obj));
      }
      if (novas.length) {
        var lock = LockService.getScriptLock();
        lock.waitLock(30000);
        try {
          var destino = folha(principal, nome);
          destino.getRange(destino.getLastRow() + 1, 1, novas.length, novas[0].length).setValues(novas);
        } finally { try { lock.releaseLock(); } catch (e) {} }
        juntos += novas.length;
      }
    }
    var el = ss.getSheetByName('ELIMINADOS');
    if (el && el.getLastRow() > 1) {
      var jaEl = idsEliminados(principal);
      var linhasEl = el.getRange(2, 1, el.getLastRow() - 1, 4).getValues().filter(function (l) { return l[1] && !jaEl[l[0] + '|' + l[1]]; });
      if (linhasEl.length) { var fe = folhaEliminados(principal); fe.getRange(fe.getLastRow() + 1, 1, linhasEl.length, 4).setValues(linhasEl); }
    }
    fx2.setName(NOME_FICHEIRO + ' (antigo — não usar)');
    relatorio.push(fx2.getId() + ': ' + juntos + ' registos juntos');
  }
  try { turmasConhecidas().forEach(function (t) { guardarNaMemoria(chaveAula(t), montarAula(t)); }); } catch (e) {}
  Logger.log('Ficheiro principal: ' + idPrincipal + '\n' + (relatorio.join('\n') || 'Não havia outros ficheiros.')
    + (acabou ? '\nACABOU: está tudo junto.' : '\nAINDA FALTAM FICHEIROS: carregue outra vez em Executar.'));
}
function chaveDe(nome, o) {
  return FOLHAS[nome].chave.map(function (c) { return String(o[c] === undefined ? '' : o[c]); }).join('|');
}
