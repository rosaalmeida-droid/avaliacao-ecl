/**
 * ═══════════════════════════════════════════════════════════════
 * AVALIAÇÃO ECL — SCRIPT ÚNICO
 * ═══════════════════════════════════════════════════════════════
 *
 * Um só script, um só ficheiro no Drive, todas as folhas.
 *
 * Antes havia seis endereços diferentes para guardar dados, e quatro
 * deles apontavam para o script do KitchenFlow — os alunos, o calendário
 * e as recuperações iam para lá e perdiam-se. Isto substitui todos.
 *
 * ── O QUE FAZER, UMA VEZ ─────────────────────────────────────
 *
 * 1. No Drive da escola: Novo → Mais → Google Apps Script.
 * 2. Apaga o que lá está e cola este ficheiro todo.
 * 3. Dá-lhe um nome: "Avaliação ECL — Dados".
 * 4. Corre a função  arrancar  (menu de funções → arrancar → ▶).
 *    Autoriza quando pedir. No registo aparece o link do ficheiro de
 *    dados que ele cria sozinho — guarda esse link.
 * 5. Implementar → Nova implementação → Aplicação Web
 *       Executar como:      Eu
 *       Quem tem acesso:    QUALQUER PESSOA          ← importante
 *    Implementar → copia o URL que acaba em /exec e manda-mo.
 *
 * Sempre que mudares este código:
 *    Implementar → Gerir implementações → lápis → Nova versão →
 *    Implementar. Guardar não chega: o URL continua a servir a
 *    versão antiga.
 *
 * ── (v20) PASSAR PARA ESTA VERSÃO ────────────────────────────
 *
 * 1. Cola este ficheiro por cima do que está no editor e Guarda.
 * 2. Corre  instalarTarefas  uma vez (menu de funções → instalarTarefas → ▶).
 * 3. Implementar → Gerir implementações → lápis → Nova versão → Implementar.
 *    O URL fica o mesmo: a aplicação não muda nada.
 *
 * ── COMO GUARDA ──────────────────────────────────────────────
 *
 * Cada folha tem colunas legíveis (para tu leres) e uma última coluna
 * com o registo completo em texto. Assim nada se perde, mesmo que a
 * aplicação passe a guardar campos novos.
 *
 * Eliminar não apaga linhas: marca "eliminado". O histórico fica.
 * ═══════════════════════════════════════════════════════════════
 */

var VERSAO = 'ECL único v20';

// ── Os ficheiros antigos, para trazer o que já lá está ───────
// Corre  importarDoAntigo  uma vez. Não apaga nada de lá.
var ANTIGO_HISTORICO = '11GQLFxO6HUauJw7lFku18cG1Fk2gKaWhU2KYcCZHSuc';
var ANTIGO_FICHAS    = '1xXqFHL8_crDtwNLuudD0k8lkr3kMiMBxD_OK5xH85W0';
var ANTIGO_PLANOS    = '1XmLORw3ugJRu33-ZON6T_MGm9wt3nOb32Su_wUnb__w';
var PROP_ID = 'ECL_FICHEIRO_DADOS';
var NOME_FICHEIRO = 'Avaliação ECL — Dados';


// ══════════════════════════════════════════════════════════════
// AS FOLHAS
// ══════════════════════════════════════════════════════════════
// chave: como se sabe que duas linhas são a mesma coisa.
// colunas: o que se vê na folha (o registo completo vai no fim).

var FOLHAS = {
  PLANOS:       { chave: ['id'],                        colunas: ['id', 'turmaId', 'data', 'horaInicio', 'horaFim', 'ucId', 'titulo', 'tipoPlanAula', 'estado', 'atualizadoEm', 'criadoEm'] },
  REQUISICOES:  { chave: ['id'],                        colunas: ['id', 'turmaId', 'planoAulaId', 'numero', 'data', 'nLinhas', 'custoTotal', 'atualizadaEm'] },
  FICHAS:       { chave: ['id'],                        colunas: ['id', 'nomePrato', 'classificacao', 'ucsAssociadas', 'elaboradoPor', 'data', 'numPorcoes', 'planoAulaId', 'nIngredientes'] },
  ALUNOS:       { chave: ['id'],                        colunas: ['id', 'turmaId', 'numero', 'nome', 'pin', 'ativo', 'pinAlteradoEm', 'removidoEm'] },
  AVALIACOES:   { chave: ['id'],                        colunas: ['id', 'data', 'alunoId', 'nomeAluno', 'turmaId', 'planoAulaId', 'ucId', 'microcompetenciaId', 'nota', 'validadoPor'] },
  PRESENCAS:    { chave: ['alunoId', 'planoAulaId'],    colunas: ['data', 'horaEntrada', 'alunoId', 'nomeAluno', 'turmaId', 'planoAulaId', 'ucId', 'presente', 'atrasado', 'atrasadoMins', 'fardamentoOk', 'decisaoProfessor', 'decididoPor', 'observacao'] },
  SELECOES:     { chave: ['id'],                        colunas: ['id', 'alunoId', 'nomeAluno', 'turmaId', 'planoAulaId', 'ucId', 'criadaEm'] },
  VALIDACOES:   { chave: ['id'],                        colunas: ['id', 'selecaoId', 'alunoId', 'turmaId', 'planoAulaId', 'validadoEm', 'validadoPor', 'notaMedia20', 'comentario'] },
  SESSOES:      { chave: ['planoAulaId'],               colunas: ['planoAulaId', 'turmaId', 'abertaEm', 'abertaPor', 'toleranciaMin', 'fechadaEm', 'fechadaPor'] },
  LIDERES_KF:   { chave: ['planoAulaId', 'grupoId'],    colunas: ['planoAulaId', 'grupoId', 'alunoId', 'turmaId', 'definidoPor', 'definidoEm'] },
  RECUPERACOES: { chave: ['id'],                        colunas: ['id', 'alunoId', 'turmaId', 'ucId', 'ucNome', 'estado', 'viaFCT', 'criadaEm'] },
  EVIDENCIAS:   { chave: ['id'],                        colunas: ['id', 'recuperacaoId', 'alunoId', 'turmaId', 'tipo', 'descricao', 'data'] },
  TELEMOVEIS:   { chave: ['alunoId'],                   colunas: ['alunoId', 'turmaId', 'dispositivoId', 'ligadoEm', 'libertadoEm'] },
  PAUTAS:       { chave: ['id'],                        colunas: ['id', 'turmaId', 'ucId', 'ucNome', 'professor', 'email', 'criadaEm', 'nAlunos', 'folha', 'enviada'] },
  COMANDAS:     { chave: ['id'],                        colunas: ['id', 'turmaId', 'planoAulaId', 'data'] },
  // (v17) Eventos. As colunas têm nomes próprios (Evento, Dia…) para não
  // se misturarem com o registo: o Sheets transforma "2026-10-24" numa
  // data, e ao ler podia trocar o dia. A aplicação lê o registo completo.
  EVENTOS:      { chave: ['id'],                        colunas: ['id', 'Evento', 'Dia', 'Local', 'Pessoas', 'Estado', 'Turmas', 'Cliente', 'atualizadoEm'] },

  // ── Detalhe: uma linha por cada coisa lá dentro ──
  // As folhas acima guardam o registo inteiro em texto, para nada se
  // perder. Estas abrem-no, para se poder ler e somar.
  REQUISICAO_LINHAS:  { chave: ['id'], colunas: ['id', 'requisicaoId', 'turmaId', 'planoAulaId', 'produto', 'quantidadeTotal', 'unidade', 'precoUnitario', 'custoTotal', 'obs'] },
  AUTOAVALIACOES:     { chave: ['id'], colunas: ['id', 'selecaoId', 'alunoId', 'nomeAluno', 'turmaId', 'planoAulaId', 'competenciaId', 'nivel', 'nota', 'criadaEm'] },
  VALIDACOES_NOTAS:   { chave: ['id'], colunas: ['id', 'validacaoId', 'alunoId', 'turmaId', 'planoAulaId', 'competenciaId', 'notaAluno', 'notaProfessor', 'notaFinal', 'validadoEm'] },

  // A nota final de cada UC que o professor publicou ao aluno (v12).
  // Vem dentro de SELECOES (registo especial UCNOTA|…); aqui fica legível.
  NOTAS_FINAIS:       { chave: ['id'], colunas: ['id', 'turmaId', 'ucId', 'alunoId', 'nomeAluno', 'nota', 'classificacao', 'resultado', 'cp', 'total', 'professor', 'publicadaEm'] },

  // Preços da requisição, revistos todos os meses pela coordenadora (v13).
  // Continente, marca branca, o mais barato. Iguais para todas as turmas.
  PRECOS:             { chave: ['id'], colunas: ['id', 'nome', 'produtoContinente', 'marca', 'embalagem', 'unidadeEmbalagem', 'precoEmbalagem', 'precoKg', 'precoUnidade', 'atualizadoEm', 'revistoPor', 'link'] },

  // Precos a rever pela coordenadora (v14).
  PRECOS_A_REVER:     { chave: ['id'], colunas: ['id', 'nome', 'produto', 'und', 'precoBase', 'precoProfessor', 'professor', 'turmaId', 'sugeridoEm', 'estado', 'revistoEm', 'mpId'] },
  // (v18) Grupos formados pelos alunos: uma linha por aluno (em que grupo está).
  GRUPOS:             { chave: ['id'], colunas: ['id', 'planoAulaId', 'turmaId', 'alunoId', 'nomeAluno', 'grupoId', 'grupoNome', 'definidoPor', 'atualizadoEm'] },
  // (v18) Cada grupo: a ficha que o professor lhe deu e se já validou.
  GRUPOS_INFO:        { chave: ['id'], colunas: ['id', 'planoAulaId', 'turmaId', 'grupoNome', 'fichaId', 'validado', 'atualizadoEm'] },
  // (v18) O que cada aluno disse de cada colega do grupo. Só o professor vê; não conta para nota.
  AVALIACAO_PARES:    { chave: ['id'], colunas: ['id', 'planoAulaId', 'turmaId', 'grupoId', 'avaliadorId', 'avaliadoId', 'nomeAvaliado', 'colabora', 'ouve', 'flexivel', 'conflito', 'comentario', 'criadoEm'] }
};

/** Registos especiais que viajam como autoavaliações (v12). */
var PREFIXOS_ESPECIAIS = ['UCFINAL|', 'TRIAGEM|', 'UCNOTA|'];
/** Inofensiva: mostra no registo o estado do Sheets. É a primeira função
 *  do ficheiro, para ser a que o editor escolhe por omissão. */
function verEstado() {
  Logger.log(VERSAO);
  Logger.log(JSON.stringify(contagens()));
  Logger.log('Começar do zero: ' + (PropertiesService.getScriptProperties().getProperty(PROP_ZERO) || 'nunca'));
  try { var pa = ficheiro().getSheetByName('POR_ARRUMAR'); Logger.log('Por arrumar: ' + (pa ? pa.getLastRow() : 0)); } catch (e) {}
}

function ehRegistoEspecial(s) {
  var p = String((s && s.planoAulaId) || '');
  return PREFIXOS_ESPECIAIS.some(function (x) { return p.indexOf(x) === 0; });
}

var COL_REGISTO = 'registo completo';
var COL_ELIMINADO = 'eliminado';


// ══════════════════════════════════════════════════════════════
// ARRANQUE
// ══════════════════════════════════════════════════════════════

var PROP_ZERO = 'ECL_ZERO_EM';

/**
 * COMEÇAR DO ZERO (v15) — correr UMA vez, à mão, no editor:
 * escolher "comecarDoZero" na lista de funções e carregar em ▶ Executar.
 *
 * Apaga as linhas de todas as folhas de dados, MENOS os alunos (ALUNOS) e
 * os preços (PRECOS): planos, fichas, requisições, avaliações, presenças,
 * autoavaliações, validações, sessões, pautas, recuperações…
 * Apaga também as folhas de leitura criadas pela aplicação: uma por ficha
 * ("F …"), uma por aluno ("12_Nome"), as pautas ("Pauta …") e ELIMINADOS.
 * Depois, cada aparelho que abrir a aplicação limpa a sua cópia antiga.
 */
// (v17) PROTEÇÃO: o botão «Executar» do editor corre a última função
// escolhida. Se essa fosse esta, bastava um clique para apagar tudo outra
// vez. Agora só apaga se a propriedade do script CONFIRMAR_APAGAR tiver o
// valor APAGAR TUDO (em Definições do projeto → Propriedades do script),
// e essa propriedade é retirada logo a seguir.
function comecarDoZero() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('CONFIRMAR_APAGAR') !== 'APAGAR TUDO') {
    Logger.log('NADA FOI APAGADO. Para começar do zero, cria a propriedade do script');
    Logger.log('CONFIRMAR_APAGAR com o valor APAGAR TUDO e corre outra vez.');
    return;
  }
  props.deleteProperty('CONFIRMAR_APAGAR');
  var ss = ficheiro();
  // As turmas que tinham aulas — para limpar também a aula na memória.
  var turmasAntes = {};
  try { ler('PLANOS', {}).forEach(function (p) { if (p.turmaId) turmasAntes[p.turmaId] = true; }); } catch (e) {}
  var manter = { ALUNOS: true, PRECOS: true };
  var limpas = [], apagadas = [];
  for (var nome in FOLHAS) {
    if (manter[nome]) continue;
    var f = ss.getSheetByName(nome);
    if (!f || f.getLastRow() < 2) continue;
    // O Google não deixa apagar TODAS as linhas por baixo do título (fixo):
    // apagam-se todas menos uma, e essa esvazia-se.
    try {
      var ultima = f.getLastRow();
      if (ultima > 2) f.deleteRows(3, ultima - 2);
      f.getRange(2, 1, 1, Math.max(1, f.getLastColumn())).clearContent();
      limpas.push(nome);
    } catch (err) { Logger.log('Não consegui limpar ' + nome + ': ' + err); }
  }
  ss.getSheets().forEach(function (f) {
    var n = f.getName();
    if (FOLHAS[n]) return;
    if (/^F /.test(n) || /^\d+_/.test(n) || /^Pauta /.test(n) || n === 'ELIMINADOS') {
      try { if (ss.getSheets().length > 1) { ss.deleteSheet(f); apagadas.push(n); } }
      catch (err) { Logger.log('Não consegui apagar ' + n + ': ' + err); }
    }
  });
  // (v19.2) «#confirmado»: foi a coordenação que pediu. Os aparelhos
  // limpam a sua cópia mesmo que já tenham visto um «começar do zero»
  // antes (sem isto, devolviam ao Sheets os dados antigos).
  PropertiesService.getScriptProperties().setProperty(PROP_ZERO, new Date().toISOString() + '#confirmado');
  // A aula na memória fica vazia também (senão mostrava a antiga até 6 h).
  try {
    turmasConhecidas().forEach(function (t) { turmasAntes[t] = true; });
    Object.keys(turmasAntes).forEach(function (t) { guardarNaMemoria(chaveAula(t), montarAula(t)); });
  } catch (e) { Logger.log('memória: ' + e); }
  try { var pa = ss.getSheetByName('POR_ARRUMAR'); if (pa) pa.clear(); } catch (e) {}
  subirContador('');
  Logger.log('Folhas limpas: ' + limpas.join(', '));
  Logger.log('Folhas apagadas: ' + apagadas.length);
  Logger.log('Ficaram: ALUNOS e PRECOS. Cada aparelho limpa a sua cópia ao abrir a aplicação.');
}

/** Corre isto uma vez. Cria o ficheiro de dados e todas as folhas. */
function arrancar() {
  var ss = ficheiro();
  for (var nome in FOLHAS) folha(ss, nome);
  var f = ss.getSheetByName('Folha1') || ss.getSheetByName('Sheet1');
  if (f && ss.getSheets().length > 1) ss.deleteSheet(f);

  Logger.log('Ficheiro de dados: ' + ss.getName());
  Logger.log('Link: ' + ss.getUrl());
  Logger.log('Folhas: ' + ss.getSheets().map(function (s) { return s.getName(); }).join(', '));
  Logger.log('');
  embelezar();
  instalarTarefas();
  criarCopiaAutomatica();
  Logger.log('Agora: Implementar → Nova implementação → Aplicação Web');
  Logger.log('   Executar como: Eu · Quem tem acesso: QUALQUER PESSOA');
}

/** O ficheiro de dados. Cria-o na primeira vez e guarda o ID. */
// (v18) O ficheiro abre-se uma vez por pedido. Um pacote com 10 registos
// abria-o 10 vezes.
var ficheiroAberto = null;
function ficheiro() {
  if (ficheiroAberto) return ficheiroAberto;
  ficheiroAberto = ficheiroAbrir();
  return ficheiroAberto;
}
function ficheiroAbrir() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_ID);
  if (id) {
    // (v19) NUNCA criar um ficheiro novo só porque não abriu à primeira.
    // Com o Google sobrecarregado, o «openById» falhava de vez em quando;
    // o script julgava o ficheiro apagado, criava outro vazio e passava a
    // gravar lá. Havia mais de 10 ficheiros «Avaliação ECL — Dados», cada
    // um com um bocado dos dados. Agora tenta outra vez e, se não der, o
    // pedido falha (a aplicação volta a enviar) — mas os dados não fogem.
    var erro = null;
    for (var t = 0; t < 4; t++) {
      try { return SpreadsheetApp.openById(id); } catch (e) { erro = e; Utilities.sleep(400 * (t + 1)); }
    }
    throw new Error('Não consegui abrir o ficheiro de dados (' + id + '): ' + erro);
  }
  // Só na primeira instalação, sem ficheiro nenhum.
  var ss = SpreadsheetApp.create(NOME_FICHEIRO);
  props.setProperty(PROP_ID, ss.getId());
  return ss;
}

/** A folha, com cabeçalhos. Cria se não existir. */
function folha(ss, nome) {
  var def = FOLHAS[nome];
  if (!def) return null;
  var f = ss.getSheetByName(nome);
  var cabecalhos = def.colunas.concat([COL_ELIMINADO, COL_REGISTO]);
  if (!f) {
    f = ss.insertSheet(nome);
    f.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos])
      .setBackground('#1f1b16').setFontColor('#faf7f2').setFontWeight('bold');
    f.setFrozenRows(1);
    f.setColumnWidth(cabecalhos.length, 60);   // o registo completo fica estreito
    // (v19) Texto simples: «08:30» fica «08:30», e não uma data de 1899.
    try { f.getRange(1, 1, f.getMaxRows(), cabecalhos.length).setNumberFormat('@'); } catch (e) {}
  } else {
    // (v15) Se a linha dos títulos foi apagada — por exemplo ao limpar os
    // dados de teste — tudo passava a ser gravado e lido desalinhado, e o
    // que se gravava parecia não chegar. Repõe-se a linha 1.
    var ultimaCol = Math.max(1, f.getLastColumn());
    var linha1 = f.getRange(1, 1, 1, ultimaCol).getValues()[0];
    if (linha1.indexOf(COL_REGISTO) === -1) {
      if (f.getLastRow() > 0) f.insertRowBefore(1);
      f.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos])
        .setBackground('#1f1b16').setFontColor('#faf7f2').setFontWeight('bold');
      f.setFrozenRows(1);
    } else {
      // (v18) Coluna nova (ex.: «criadoEm» nos PLANOS): entra antes de
      // «eliminado», e as linhas antigas deslocam-se juntas — nada fica
      // desalinhado.
      def.colunas.forEach(function (c, i) {
        var atual = f.getRange(1, 1, 1, Math.max(1, f.getLastColumn())).getValues()[0];
        if (atual.indexOf(c) >= 0) return;
        var iEl = atual.indexOf(COL_ELIMINADO);
        var pos = iEl >= 0 ? iEl + 1 : atual.length + 1;
        f.insertColumnBefore(pos);
        f.getRange(1, pos).setValue(c);
      });
    }
  }
  return f;
}


// ══════════════════════════════════════════════════════════════
// GUARDAR E LER — o mesmo para todas as folhas
// ══════════════════════════════════════════════════════════════

function valorTexto(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Uma linha: as colunas legíveis + o registo completo. */
function linhaDe(nome, obj) {
  var def = FOLHAS[nome];
  var linha = def.colunas.map(function (c) { return valorTexto(obj[c]); });
  linha.push('');                       // eliminado
  linha.push(JSON.stringify(obj));      // registo completo
  return linha;
}

function mesmaChave(nome, linha, obj, colunas) {
  return FOLHAS[nome].chave.every(function (c) {
    var i = colunas.indexOf(c);
    return i >= 0 && String(linha[i]) === String(obj[c] === undefined ? '' : obj[c]);
  });
}

/** Grava por cima se já existir (pela chave), senão acrescenta. */
// (v15) Planos, fichas e requisições sem código não se gravam: o antigo
// envio ao "calendário" chegava aqui como plano sem código e deixava uma
// aula fantasma na folha PLANOS.
var PRECISAM_DE_ID = { PLANOS: true, FICHAS: true, REQUISICOES: true, EVENTOS: true };

function guardar(nome, obj) {
  if (PRECISAM_DE_ID[nome] && (!obj || !obj.id)) return resposta(false, 'Sem código (id): não gravado');
  if (!obj) return resposta(false, 'Sem dados');
  var ss = ficheiro();
  // Um aparelho que ainda tenha o registo antigo não o ressuscita.
  if (obj.id && idsEliminados(ss)[nome + '|' + String(obj.id)]) {
    return respostaDados({ ignorado: true, motivo: 'eliminado' });
  }
  var f = folha(ss, nome);
  var linha = linhaDe(nome, obj);
  // (v18) Lê só as colunas da chave (o código), e não a folha inteira.
  // A folha inteira trazia a coluna escondida com o registo completo de
  // cada linha (fichas, planos por extenso): uma gravação chegava a levar
  // mais de um minuto, e as outras desistiam na fila.
  var ultima = f.getLastRow();
  if (ultima >= 2) {
    var colunas = f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0];
    var chave = FOLHAS[nome].chave;
    var indices = chave.map(function (c) { return colunas.indexOf(c); });
    if (indices.every(function (i) { return i >= 0; })) {
      var valoresChave = indices.map(function (i) { return f.getRange(2, i + 1, ultima - 1, 1).getValues(); });
      var procurado = chave.map(function (c) { return String(obj[c] === undefined ? '' : obj[c]); });
      for (var r = ultima - 2; r >= 0; r--) {       // (v19) a mais recente
        var igual = true;
        for (var k2 = 0; k2 < chave.length; k2++) {
          if (String(valoresChave[k2][r][0]) !== procurado[k2]) { igual = false; break; }
        }
        if (!igual) continue;
        var linhaN = r + 2;
        // Mantém o que já lá estava e escreve por cima o que vem agora.
        var antigo = {};
        var iReg = colunas.indexOf(COL_REGISTO);
        if (iReg >= 0) {
          try { antigo = JSON.parse(f.getRange(linhaN, iReg + 1).getValue() || '{}'); } catch (e) { antigo = {}; }
        }
        for (var k in obj) antigo[k] = obj[k];
        f.getRange(linhaN, 1, 1, linha.length).setValues([linhaDe(nome, antigo)]);
        subirContador(obj.turmaId);
        return respostaDados({ guardado: true, atualizado: true });
      }
    }
  }
  f.appendRow(linha);
  subirContador(obj.turmaId);
  return respostaDados({ guardado: true, atualizado: false });
}

/**
 * Guarda muitos registos de uma vez (v13). Lê a folha uma só vez e escreve
 * tudo junto — gravar 250 preços um a um passava do tempo que o Google dá.
 */
function guardarVarios(nome, lista) {
  if (!lista || !lista.length) return resposta(false, 'Sem dados');
  var ss = ficheiro();
  var f = folha(ss, nome);
  var dados = f.getDataRange().getValues();
  var colunas = dados[0];
  var iReg = colunas.indexOf(COL_REGISTO);
  var porChave = {};
  var chaveDe = function (o) { return FOLHAS[nome].chave.map(function (c) { return String(o[c] === undefined ? '' : o[c]); }).join('|'); };
  for (var i = 1; i < dados.length; i++) {
    var o = {};
    FOLHAS[nome].chave.forEach(function (c) { o[c] = dados[i][colunas.indexOf(c)]; });
    porChave[chaveDe(o)] = i;
  }
  var novas = [], atualizados = 0;
  lista.forEach(function (obj) {
    if (!obj) return;
    var k = chaveDe(obj);
    if (porChave[k] !== undefined) {
      var i2 = porChave[k], antigo = {};
      if (i2 < 0) {                       // repetido dentro da mesma lista
        var n2 = -i2 - 1, ant2 = {};
        try { ant2 = JSON.parse(novas[n2][novas[n2].length - 1] || '{}'); } catch (e) {}
        for (var c2 in obj) ant2[c2] = obj[c2];
        novas[n2] = linhaDe(nome, ant2);
        return;
      }
      try { antigo = JSON.parse(dados[i2][iReg] || '{}'); } catch (e) {}
      for (var c in obj) antigo[c] = obj[c];
      dados[i2] = linhaDe(nome, antigo);
      atualizados++;
    } else {
      novas.push(linhaDe(nome, obj));
      porChave[k] = -novas.length;
    }
  });
  if (dados.length > 1) f.getRange(2, 1, dados.length - 1, dados[1].length).setValues(dados.slice(1));
  if (novas.length) f.getRange(f.getLastRow() + 1, 1, novas.length, novas[0].length).setValues(novas);
  subirContador('');
  return respostaDados({ guardados: lista.length, atualizados: atualizados, novos: novas.length });
}

/**
 * Elimina: tira a linha da folha e guarda-a no registo de eliminados.
 *
 * Antes só marcava a linha, que ficava à vista — o professor eliminava
 * o plano e continuava a vê-lo no Sheets. E o registo serve para mais:
 * nenhum aparelho volta a escrever um id que foi eliminado, mesmo que
 * ainda o tenha guardado de antes.
 */
function eliminar(nome, id) {
  if (!id) return resposta(false, 'Sem id');
  var ss = ficheiro();
  var f = folha(ss, nome);
  var dados = f.getDataRange().getValues();
  var colunas = dados[0];
  var iId = colunas.indexOf('id');
  var iReg = colunas.indexOf(COL_REGISTO);

  for (var i = dados.length - 1; i >= 1; i--) {
    if (String(dados[i][iId]) === String(id)) {
      registarEliminado(ss, nome, id, dados[i][iReg]);
      f.deleteRow(i + 1);
      subirContador('');
      return respostaDados({ eliminado: true });
    }
  }
  registarEliminado(ss, nome, id, '');     // eliminado antes de cá chegar
  return respostaDados({ eliminado: false });
}

var COLS_ELIMINADOS = ['folha', 'id', 'eliminado em', 'registo completo'];

/** (v18) Os códigos eliminados de uma folha: os aparelhos tiram-nos da
 *  sua cópia, em vez de os voltarem a enviar. */
function eliminadosDe(nomeFolha) {
  try {
    var f = folhaEliminados(ficheiro());
    if (f.getLastRow() < 2) return [];
    // (v20) Só as duas primeiras colunas: o registo completo não faz falta.
    var d = f.getRange(2, 1, f.getLastRow() - 1, 2).getValues(), saida = [];
    for (var i = 0; i < d.length; i++) if (String(d[i][0]) === nomeFolha && d[i][1]) saida.push(String(d[i][1]));
    return saida;
  } catch (e) { return []; }
}

function folhaEliminados(ss) {
  var f = ss.getSheetByName('ELIMINADOS');
  if (!f) {
    f = ss.insertSheet('ELIMINADOS');
    f.getRange(1, 1, 1, COLS_ELIMINADOS.length).setValues([COLS_ELIMINADOS])
      .setBackground('#1f1b16').setFontColor('#faf7f2').setFontWeight('bold');
    f.setFrozenRows(1);
    f.setColumnWidth(4, 60);
  }
  return f;
}

function registarEliminado(ss, nome, id, registo) {
  folhaEliminados(ss).appendRow([nome, id, new Date().toISOString(), registo || '']);
  eliminadosEmCache = null;
}

var eliminadosEmCache = null;

/** Ids já eliminados — para não voltarem a entrar. */
function idsEliminados(ss) {
  if (eliminadosEmCache) return eliminadosEmCache;
  var f = folhaEliminados(ss);
  var set = {};
  if (f.getLastRow() >= 2) {
    // (v20) Só as duas primeiras colunas, e não o registo completo de cada eliminado.
    var d = f.getRange(2, 1, f.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < d.length; i++) set[String(d[i][0]) + '|' + String(d[i][1])] = true;
  }
  eliminadosEmCache = set;
  return set;
}

/**
 * Lê uma folha. Devolve o registo completo de cada linha, com as
 * colunas legíveis por cima (se alguém corrigir algo à mão na folha,
 * é isso que vale).
 */
function ler(nome, filtros) {
  var f = folha(ficheiro(), nome);
  var dados = f.getDataRange().getValues();
  if (dados.length < 2) return [];
  var colunas = dados[0];
  var iReg = colunas.indexOf(COL_REGISTO);
  var iEl = colunas.indexOf(COL_ELIMINADO);
  var saida = [];

  var iId = colunas.indexOf('id');
  // (v20) Filtrar pela turma ANTES de abrir o registo completo: abrir o
  // texto de todas as linhas de todas as turmas era o mais lento.
  var iTurma = colunas.indexOf('turmaId');
  var turmaFiltro = filtros && filtros.turmaId ? String(filtros.turmaId) : '';
  for (var i = 1; i < dados.length; i++) {
    if (turmaFiltro && iTurma >= 0 && dados[i][iTurma] !== '' && String(dados[i][iTurma]) !== turmaFiltro) continue;
    if (dados[i].every(function (v) { return v === '' || v === null; })) continue;   // linha vazia (v15.1)
    if (dados[i][iEl]) continue;                     // eliminado
    if (PRECISAM_DE_ID[nome] && iId >= 0 && !dados[i][iId]) continue;   // aula fantasma, sem código (v15)
    var obj = {};
    try { obj = JSON.parse(dados[i][iReg] || '{}'); } catch (e) { obj = {}; }
    for (var c = 0; c < colunas.length; c++) {
      if (c === iReg || c === iEl) continue;
      var v = dados[i][c];
      // (v19) O registo completo manda. As colunas à vista só preenchem o
      // que faltar: o Sheets transforma «08:30» numa data de 1899 e
      // «2026-09-25» numa data com fuso — e isso estragava a hora e o dia.
      if (v !== '' && v !== null && v !== undefined && (obj[colunas[c]] === undefined || obj[colunas[c]] === '')) obj[colunas[c]] = valorTexto(v);
    }
    // Verdadeiro/falso vindos de texto
    ['presente', 'atrasado', 'fardamentoOk', 'ativo', 'viaFCT'].forEach(function (b) {
      if (typeof obj[b] === 'string') obj[b] = (obj[b] === 'true' || obj[b] === 'Sim' || obj[b] === 'TRUE');
    });
    if (obj.nota !== undefined) obj.nota = Number(obj.nota) || 0;

    var serve = true;
    for (var k in (filtros || {})) {
      if (filtros[k] && String(obj[k] || '') !== String(filtros[k])) { serve = false; break; }
    }
    if (serve) saida.push(obj);
  }
  return juntarRepetidos(nome, saida);
}

/** (v19) A mesma coisa gravada duas vezes (linha acrescentada) aparece
 *  uma só vez: a linha mais recente manda, mas um campo vazio não apaga
 *  o que já lá estava (ex.: a decisão do professor sobre a falta). */
function juntarRepetidos(nome, lista) {
  var def = FOLHAS[nome];
  if (!def || !def.chave) return lista;
  var ordem = [], porChave = {};
  lista.forEach(function (o) {
    var k = def.chave.map(function (c) { return String(o[c] === undefined ? '' : o[c]); }).join('|');
    if (!porChave[k]) { porChave[k] = o; ordem.push(k); return; }
    var junto = porChave[k];
    for (var c in o) { if (o[c] !== '' && o[c] !== null && o[c] !== undefined) junto[c] = o[c]; }
  });
  return ordem.map(function (k) { return porChave[k]; });
}


// ══════════════════════════════════════════════════════════════
// RECEBER
// ══════════════════════════════════════════════════════════════

// Um envio de cada vez. Sem isto, dois envios do mesmo plano que chegassem
// ao mesmo tempo (dois toques no botão) liam a folha antes de o outro
// gravar, e ficavam as duas linhas — o plano aparecia em duplicado.
// (v19) O QUE OS ALUNOS GRAVAM NÃO ESPERA PELA VEZ.
// Presença, grupo, autoavaliação e notas do aluno são acrescentados numa
// linha nova, no fim da folha — 25 alunos podem gravar ao mesmo tempo.
// Só o resto (planos, abrir a aula, validações…) espera pela vez, como
// antes. As linhas repetidas juntam-se ao ler e, de noite, na arrumação.
var RAPIDOS = { presenca: 'PRESENCAS', selecao: 'SELECOES', avaliacao: 'AVALIACOES',
  grupo_membro: 'GRUPOS', avaliacao_par: 'AVALIACAO_PARES' };

function doPost(e) {
  var d;
  try {
    var raw = (e && e.parameter && e.parameter.dados) || (e && e.postData && e.postData.contents) || '{}';
    d = JSON.parse(raw);
  } catch (err) { return resposta(false, 'Erro: ' + err.toString()); }
  var itens = d.tipo === 'lote' ? (d.itens || []) : [d];
  var rapidos = itens.filter(function (x) { return x && RAPIDOS[x.tipo]; });
  var outros = itens.filter(function (x) { return x && !RAPIDOS[x.tipo]; });
  var feitos = 0, erros = [], ultima = null;

  rapidos.forEach(function (x) {
    try { acrescentar(x); feitos++; }
    catch (err) { erros.push(String(x.tipo) + ': ' + err); }
  });
  if (rapidos.length) extrasDosRapidos(rapidos);

  if (outros.length) {
    var lock = LockService.getScriptLock();
    try { lock.waitLock(30000); } catch (err) { return resposta(false, 'Ocupado, tenta outra vez'); }
    var turmas = {};
    try {
      outros.forEach(function (x) {
        try { ultima = tratar(x); feitos++; }
        catch (err) { erros.push(String(x.tipo) + ': ' + err); }
        if (MUDAM_A_AULA[x.tipo]) turmas[turmaDoPedido(x)] = true;
      });
    } finally { try { lock.releaseLock(); } catch (err) {} }
    // (v20) A aula na memória não se refaz aqui, com o script trancado:
    // esquece-se, e o primeiro telemóvel que a pedir monta-a outra vez.
    // Antes, gravar uma ficha refazia a aula de TODAS as turmas, uma a
    // uma, e os outros envios esperavam até desistir («Ocupado»).
    for (var t in turmas) esquecerAula(t);
  }
  // (v20) Logo a seguir a gravar, faz-se o que está por arrumar, se
  // ninguém estiver a gravar nesse instante. Os dados já ficaram gravados
  // antes disto: se não houver vez, faz-se no envio seguinte ou na volta
  // de 5 minutos.
  arrumarUmPouco();
  if (d.tipo !== 'lote' && ultima && !rapidos.length) return ultima;
  return respostaDados({ lote: feitos, erros: erros });
}

/** Uma linha nova no fim da folha — sem procurar, sem esperar pela vez. */
function acrescentar(x) {
  var nome = RAPIDOS[x.tipo];
  var obj = x.tipo === 'avaliacao' ? normalizarAvaliacao(x) : x;
  if (!obj) return;
  var ss = ficheiro();
  if (obj.id && idsEliminados(ss)[nome + '|' + String(obj.id)]) return;
  var f = folha(ss, nome);
  f.appendRow(linhaDe(nome, obj));
  subirContador(obj.turmaId);
  if (x.tipo === 'grupo_membro') guardarMembroNaMemoria(obj);
}

// ── (v20) O QUE É SÓ PARA LER FICA PARA DEPOIS ────────────────
// As folhas por extenso (autoavaliações, notas validadas, a folha de cada
// aluno, a ficha e a requisição por extenso) não fazem falta à aplicação:
// são para ler. Faziam-se no momento do envio, com o script trancado, e os
// outros envios ficavam à espera — alguns desistiam e perdiam-se. Agora
// vão para a folha POR_ARRUMAR e fazem-se logo a seguir a cada envio,
// quando o script está livre (arrumarUmPouco), e de 5 em 5 minutos para o
// que sobrar (tratarPendentes) — fora do caminho das gravações.

function porArrumar(lista) {
  if (!lista || !lista.length) return;
  try {
    var ss = ficheiro();
    var f = ss.getSheetByName('POR_ARRUMAR') || ss.insertSheet('POR_ARRUMAR');
    var agora = new Date().toISOString();
    var linhas = lista.map(function (x) { return [agora, JSON.stringify(x)]; });
    f.getRange(f.getLastRow() + 1, 1, linhas.length, 2).setValues(linhas);
  } catch (err) { Logger.log('porArrumar: ' + err); }
}

function extrasDosRapidos(lista) {
  porArrumar(lista.filter(function (x) { return x.tipo === 'avaliacao' || x.tipo === 'selecao'; }));
}

function fazerExtra(x) {
  try {
    if (x.tipo === 'avaliacao') escreverNaFolhaDoAluno(x);
    else if (x.tipo === 'selecao') {
      if (String(x.planoAulaId || '').indexOf('UCNOTA|') === 0) abrirNotaFinal(x);
      else if (!ehRegistoEspecial(x)) abrirAutoavaliacoes(x);
    }
    else if (x.tipo === 'validacao') abrirNotasDaValidacao(x);
    else if (x.tipo === 'requisicao') abrirLinhasDaRequisicao(x.requisicao || x);
    else if (x.tipo === 'ficha') escreverFichaPorExtenso(x.ficha || x);
  } catch (err) { Logger.log(err); }
}

/** Logo a seguir a um envio: um bocadinho do que está por arrumar, só se
 *  o script estiver livre agora (não faz ninguém esperar). */
function arrumarUmPouco() {
  try {
    var f = ficheiro().getSheetByName('POR_ARRUMAR');
    if (!f || f.getLastRow() < 1) return;
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(0)) return;
    try {
      var n = Math.min(10, f.getLastRow());
      if (n < 1) return;
      var linhas = f.getRange(1, 1, n, 2).getValues();
      linhas.forEach(function (l) { try { fazerExtra(JSON.parse(l[1])); } catch (e) {} });
      f.deleteRows(1, n);
    } finally { try { lock.releaseLock(); } catch (e) {} }
  } catch (err) { Logger.log('arrumarUmPouco: ' + err); }
}

/** Faz o que está em POR_ARRUMAR, aos poucos e com o script trancado só
 *  por instantes. Corre sozinha de 5 em 5 minutos (instalarTarefas), para
 *  o que arrumarUmPouco não apanhou. */
function tratarPendentes() {
  var inicio = Date.now(), LIMITE = 4 * 60 * 1000, feitos = 0;
  var ss = ficheiro();
  var f = ss.getSheetByName('POR_ARRUMAR');
  if (!f) return;
  while (Date.now() - inicio < LIMITE) {
    var n = Math.min(20, f.getLastRow());
    if (n < 1) break;
    var linhas = f.getRange(1, 1, n, 2).getValues();
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) break;          // há gravações: fica para a próxima
    try {
      linhas.forEach(function (l) { try { fazerExtra(JSON.parse(l[1])); feitos++; } catch (e) {} });
      // Só se tiram as linhas feitas: as que chegaram entretanto ficam no fim.
      f.deleteRows(1, n);
    } finally { try { lock.releaseLock(); } catch (e) {} }
  }
  if (feitos) Logger.log('Por arrumar: ' + feitos + ' feitos.');
}

function receber(e) {
  try {
    var raw = (e && e.parameter && e.parameter.dados)
      || (e && e.postData && e.postData.contents) || '{}';
    var d = JSON.parse(raw);

    // (v16) Um pacote com vários registos: uma autoavaliação ou uma
    // validação com várias competências chega num só envio. Eram um envio
    // por competência, todos ao mesmo tempo; na fila do cadeado, os
    // últimos desistiam e perdiam-se (4 competências avaliadas, 2 no Sheets).
    if (d.tipo === 'lote') {
      var itens = d.itens || [], feitos = 0, erros = [];
      for (var i = 0; i < itens.length; i++) {
        try { tratar(itens[i]); feitos++; }
        catch (err) { erros.push(String(itens[i] && itens[i].tipo) + ': ' + err); }
      }
      return respostaDados({ lote: feitos, erros: erros });
    }
    return tratar(d);
  } catch (err) {
    return resposta(false, 'Erro: ' + err.toString());
  }
}

function tratar(d) {
  {
    var tipo = d.tipo || '';

    // Planos e requisições
    if (tipo === 'plano')                return guardar('PLANOS', d.plano || d);
    if (tipo === 'eliminar_plano')       return eliminar('PLANOS', d.planoId || d.id);
    if (tipo === 'requisicao') {
      var req = d.requisicao || d;
      var rr = guardar('REQUISICOES', resumirRequisicao(req));
      porArrumar([{ tipo: 'requisicao', requisicao: req }]);   // (v20) as linhas, depois
      return rr;
    }
    if (tipo === 'eliminar_requisicao')  return eliminarRequisicaoComLinhas(d.requisicaoId || d.id);

    // Eventos (v17)
    if (tipo === 'evento')               return guardar('EVENTOS', resumirEvento(d.evento || d));
    if (tipo === 'eliminar_evento')      return eliminarEventoComOrcamentos(d.eventoId || d.id);

    // Fichas
    if (tipo === 'ficha') {
      var fi = d.ficha || d;
      var rf = guardar('FICHAS', resumirFicha(fi));
      // A ficha por extenso, numa folha própria — (v20) depois.
      porArrumar([{ tipo: 'ficha', ficha: fi }]);
      return rf;
    }
    if (tipo === 'eliminar_ficha')       return eliminar('FICHAS', d.fichaId || d.id);
    if (tipo === 'eliminar_aluno')       return eliminarAluno(d.alunoId || d.id);
    if (tipo === 'eliminar_do_plano')    return eliminarTudoDoPlano(d.planoId || d.id);

    // Alunos
    if (tipo === 'upsert_aluno')         return guardar('ALUNOS', d.aluno || d);

    // Aula
    if (tipo === 'avaliacao') {
      var r = guardar('AVALIACOES', normalizarAvaliacao(d));
      porArrumar([d]);                    // a folha do aluno, depois
      return r;
    }
    if (tipo === 'presenca')             return guardar('PRESENCAS', d);
    if (tipo === 'selecao') {
      var rs = guardar('SELECOES', d);
      porArrumar([d]);                    // as folhas legíveis, depois
      return rs;
    }
    if (tipo === 'validacao') {
      var rv = guardar('VALIDACOES', normalizarValidacao(d));
      // (v20) As notas competência a competência, depois: eram uma gravação
      // por competência com o script trancado.
      porArrumar([d]);
      return rv;
    }
    if (tipo === 'sessao')               return abrirSessao(d);
    if (tipo === 'fechar_sessao')        return fecharSessao(d);
    if (tipo === 'lider_kf')             return guardar('LIDERES_KF', d);
    if (tipo === 'grupo_membro')         return guardar('GRUPOS', d);
    if (tipo === 'grupo_info')           return guardar('GRUPOS_INFO', d);
    if (tipo === 'avaliacao_par')        return guardar('AVALIACAO_PARES', d);
    if (tipo === 'comanda')              return guardar('COMANDAS', d);

    // Preços da requisição (todos de uma vez)
    if (tipo === 'precos')               return guardarVarios('PRECOS', d.precos || []);
    if (tipo === 'precos_a_rever')       return guardarVarios('PRECOS_A_REVER', d.precosARever || []);

    // Recuperações
    if (tipo === 'recuperacao')          return guardar('RECUPERACOES', d.recuperacao || d);
    if (tipo === 'evidencia')            return guardar('EVIDENCIAS', d.evidencia || d);

    // O PIN ligado ao telemóvel
    if (tipo === 'pauta')                return guardarPauta(d);
    if (tipo === 'ligar_telemovel')      return ligarTelemovel(d);
    if (tipo === 'libertar_telemovel')   return libertarTelemovel(d);

    return resposta(false, 'Tipo desconhecido: ' + tipo);
  }
}


// ══════════════════════════════════════════════════════════════
// DEVOLVER
// ══════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var tipo = p.tipo || '';
    var turma = p.turmaId || '';

    if (tipo === 'get_planos')       return comDados('planos',       ler('PLANOS',       { turmaId: turma }), { eliminados: eliminadosDe('PLANOS') });
    if (tipo === 'get_requisicoes')  return comDados('requisicoes',  ler('REQUISICOES',  { turmaId: turma }));
    if (tipo === 'get_fichas')       return comDados('fichas',       ler('FICHAS',       {}));
    if (tipo === 'buscar_similar')   return comDados('similares',    parecidas(p.nome || ''));
    if (tipo === 'get_alunos')       return comDados('alunos',       ler('ALUNOS',       { turmaId: turma }));
    if (tipo === 'get_avaliacoes')   return comDados('avaliacoes',   ler('AVALIACOES',   { turmaId: turma }));
    if (tipo === 'get_presencas')    return comDados('presencas',    ler('PRESENCAS',    { turmaId: turma }));
    if (tipo === 'get_selecoes')     return comDados('selecoes',     ler('SELECOES',     { turmaId: turma }));
    if (tipo === 'get_validacoes')   return comDados('validacoes',   ler('VALIDACOES',   { turmaId: turma }));
    if (tipo === 'get_sessoes')      return comDados('sessoes',      ler('SESSOES',      { turmaId: turma }));
    if (tipo === 'get_aula')         return respostaAula(turma);
    if (tipo === 'get_grupos')       return comDados('membros',      ler('GRUPOS',       { turmaId: turma }), { info: ler('GRUPOS_INFO', { turmaId: turma }) });
    if (tipo === 'get_pares')        return comDados('pares',        ler('AVALIACAO_PARES', { turmaId: turma }));
    if (tipo === 'get_lideres_kf')   return comDados('lideres',      ler('LIDERES_KF',   { turmaId: turma }));
    if (tipo === 'recuperacoes')     return comDados('recuperacoes', ler('RECUPERACOES', { turmaId: turma }));
    if (tipo === 'evidencias')       return comDados('evidencias',   ler('EVIDENCIAS',   {}));
    if (tipo === 'get_telemoveis')   return comDados('telemoveis',   telemoveisLigados(turma));
    if (tipo === 'get_pautas')       return comDados('pautas',       ler('PAUTAS', { turmaId: turma }));
    if (tipo === 'get_precos')       return comDados('precos',       ler('PRECOS', {}));
    if (tipo === 'get_eventos')      return comDados('eventos',      ler('EVENTOS', {}));
    if (tipo === 'get_precos_a_rever') return comDados('precosARever', ler('PRECOS_A_REVER', {}));
    // A pergunta mais pequena que há: "em que número vais?". Os
    // aparelhos fazem-na de 15 em 15 segundos e só vão buscar dados
    // quando o número muda.
    if (tipo === 'versao')           return respostaCurta(lerContador(turma));

    // Abrir o endereço no browser dá uma página de estado.
    return respostaDados({ versao: VERSAO, estado: contagens() });
  } catch (err) {
    return resposta(false, 'Erro: ' + err.toString());
  }
}

/** A aplicação lê umas vezes .dados e outras o nome próprio — vão os dois. */
function comDados(nome, lista, extra) {
  var o = { ok: true, dados: lista };
  o[nome] = lista;
  if (extra) for (var x in extra) o[x] = extra[x];
  // (v15) A data do "começar do zero": cada aparelho, ao vê-la, apaga a
  // sua cópia antiga (planos, fichas, requisições, avaliações…).
  try { o.zeroEm = PropertiesService.getScriptProperties().getProperty(PROP_ZERO) || ''; } catch (e) {}
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}


// ══════════════════════════════════════════════════════════════
// CASOS ESPECIAIS
// ══════════════════════════════════════════════════════════════

/** A aula abre uma vez: abrir de novo não reinicia os dez minutos. */
function abrirSessao(d) {
  var existentes = ler('SESSOES', d.turmaId ? { turmaId: d.turmaId } : {});
  for (var i = 0; i < existentes.length; i++) {
    if (String(existentes[i].planoAulaId) === String(d.planoAulaId) && existentes[i].abertaEm) {
      return respostaDados({ jaExistia: true, abertaEm: existentes[i].abertaEm });
    }
  }
  guardar('SESSOES', {
    planoAulaId: d.planoAulaId, turmaId: d.turmaId || '',
    abertaEm: d.abertaEm || new Date().toISOString(),
    abertaPor: d.abertaPor || '', toleranciaMin: d.toleranciaMin || 10,
    fechadaEm: '', fechadaPor: ''
  });
  return respostaDados({ jaExistia: false });
}

function fecharSessao(d) {
  return guardar('SESSOES', {
    planoAulaId: d.planoAulaId,
    fechadaEm: d.fechadaEm || new Date().toISOString(),
    fechadaPor: d.fechadaPor || ''
  });
}

/** Fica ligado ao primeiro telemóvel. Um segundo não rouba o lugar. */
function ligarTelemovel(d) {
  var ligados = telemoveisLigados('');
  for (var i = 0; i < ligados.length; i++) {
    if (String(ligados[i].alunoId) === String(d.alunoId)) {
      return respostaDados({ jaLigado: true, mesmo: String(ligados[i].dispositivoId) === String(d.dispositivoId) });
    }
  }
  guardar('TELEMOVEIS', {
    alunoId: d.alunoId, turmaId: d.turmaId || '', dispositivoId: d.dispositivoId,
    ligadoEm: new Date().toISOString(), libertadoEm: ''
  });
  return respostaDados({ ligado: true });
}

function libertarTelemovel(d) {
  return guardar('TELEMOVEIS', { alunoId: d.alunoId, libertadoEm: new Date().toISOString() });
}

function telemoveisLigados(turma) {
  return ler('TELEMOVEIS', turma ? { turmaId: turma } : {}).filter(function (t) {
    return !t.libertadoEm && t.dispositivoId;
  });
}

/** Fichas com nome parecido — para o professor não repetir trabalho. */
function parecidas(nome) {
  if (!nome) return [];
  var alvo = String(nome).toLowerCase().trim();
  var palavras = alvo.split(/\s+/).filter(function (p) { return p.length > 3; });
  return ler('FICHAS', {}).map(function (f) {
    var n = String(f.nomePrato || '').toLowerCase().trim();
    if (!n) return null;
    var contem = n.indexOf(alvo) >= 0 || alvo.indexOf(n) >= 0;
    var comuns = palavras.filter(function (p) { return n.indexOf(p) >= 0; }).length;
    if (!contem && !comuns) return null;
    f.similaridade = contem ? 2 : comuns;
    return f;
  }).filter(function (x) { return !!x; })
    .sort(function (a, b) { return b.similaridade - a.similaridade; })
    .slice(0, 3);
}

/** Campos com nomes diferentes conforme quem envia. */
function normalizarAvaliacao(d) {
  d.microcompetenciaId = d.microcompetenciaId || d.microcompetencia || '';
  d.nota = Number(d.nota) || 0;
  return d;
}

function normalizarValidacao(d) {
  d.notaMedia20 = d.notaMedia20 || d.nota_media_0_20 || '';
  d.turmaId = d.turmaId || d.turma || '';
  return d;
}

/** Evento: as colunas que se leem na folha. O resto fica no registo. */
function resumirEvento(e) {
  e.Evento = e.nome || '';
  e.Dia = "'" + String(e.data || '');         // texto, para o Sheets não o mudar
  e.Local = e.onde === 'ecl' ? 'ECL' : e.onde === 'fora' ? (e.morada || 'Fora da ECL') : 'Por definir';
  e.Pessoas = e.pessoas || '';
  e.Estado = e.estado || '';
  e.Turmas = (e.turmasIds || []).join(', ');
  e.Cliente = e.entidade || '';
  return e;
}

/** A requisição inteira é grande: na folha ficam os totais. */
function resumirRequisicao(r) {
  r.nLinhas = (r.linhas || []).length;
  return r;
}

function resumirFicha(f) {
  f.nIngredientes = (f.ingredientes || []).length;
  if (Array.isArray(f.ucsAssociadas)) f.ucsAssociadas = f.ucsAssociadas.join(', ');
  return f;
}

function contagens() {
  var ss = ficheiro();
  var c = {};
  for (var nome in FOLHAS) {
    var f = ss.getSheetByName(nome);
    c[nome] = f ? Math.max(0, f.getLastRow() - 1) : 0;
  }
  return c;
}


// ══════════════════════════════════════════════════════════════
// RESPOSTAS
// ══════════════════════════════════════════════════════════════

function resposta(ok, mensagem) {
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, mensagem: mensagem }))
    .setMimeType(ContentService.MimeType.JSON);
}

function respostaDados(obj) {
  obj.ok = true;
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ══════════════════════════════════════════════════════════════
// TESTE — correr à mão, antes de pôr a turma a usar
// ══════════════════════════════════════════════════════════════

function testar() {
  arrancar();

  // Um plano
  doPost({ postData: { contents: JSON.stringify({ tipo: 'plano', plano: {
    id: 'TESTE_p1', turmaId: 'TESTE', data: '2026-09-22', horaInicio: '08:30',
    horaFim: '17:30', ucId: 'UC03576', titulo: 'Aula de teste',
    tipoPlanAula: 'atitudinal', estado: 'publicado', fichasIds: ['f1'] } }) } });

  var planos = ler('PLANOS', { turmaId: 'TESTE' });
  Logger.log('Planos de teste: ' + planos.length
    + ' · tipo guardado: ' + (planos[0] && planos[0].tipoPlanAula)
    + ' · fichas: ' + JSON.stringify(planos[0] && planos[0].fichasIds));

  // Publicar duas vezes não cria dois planos
  doPost({ postData: { contents: JSON.stringify({ tipo: 'plano', plano: {
    id: 'TESTE_p1', turmaId: 'TESTE', data: '2026-09-22', estado: 'publicado' } }) } });
  Logger.log('Depois de guardar outra vez: ' + ler('PLANOS', { turmaId: 'TESTE' }).length + ' plano(s)');

  // Telemóveis
  doPost({ postData: { contents: JSON.stringify({ tipo: 'ligar_telemovel', alunoId: 'TESTE-1', turmaId: 'TESTE', dispositivoId: 'tel_A' }) } });
  doPost({ postData: { contents: JSON.stringify({ tipo: 'ligar_telemovel', alunoId: 'TESTE-1', turmaId: 'TESTE', dispositivoId: 'tel_B' }) } });
  var t = telemoveisLigados('TESTE');
  Logger.log('Telemóvel ligado: ' + (t[0] && t[0].dispositivoId) + ' (tem de ser tel_A)');

  // Presença e decisão do professor
  doPost({ postData: { contents: JSON.stringify({ tipo: 'presenca', alunoId: 'TESTE-1', planoAulaId: 'TESTE_p1', turmaId: 'TESTE', presente: true }) } });
  doPost({ postData: { contents: JSON.stringify({ tipo: 'presenca', alunoId: 'TESTE-1', planoAulaId: 'TESTE_p1', turmaId: 'TESTE', presente: false, decisaoProfessor: 'falta_presenca' }) } });
  var pres = ler('PRESENCAS', { turmaId: 'TESTE' });
  Logger.log('Presenças: ' + pres.length + ' (tem de ser 1) · decisão: ' + (pres[0] && pres[0].decisaoProfessor));

  Logger.log('');
  Logger.log('Apaga as linhas de teste (turma TESTE) quando quiseres.');
  Logger.log('Contagens: ' + JSON.stringify(contagens()));
}


// ══════════════════════════════════════════════════════════════
// TRAZER O QUE JÁ EXISTE
// ══════════════════════════════════════════════════════════════
// Corre  importarDoAntigo  uma vez. Lê os ficheiros antigos e copia
// para cá o que ainda não estiver. Não apaga nem mexe nos antigos —
// se alguma coisa correr mal, eles ficam intactos.

function importarDoAntigo() {
  var total = 0;
  total += importarHistorico();
  total += importarFichas();
  total += importarFichasPorExtenso();
  total += importarPlanos();
  Logger.log('');
  Logger.log('Trazidos ' + total + ' registos.');
  Logger.log('Contagens agora: ' + JSON.stringify(contagens()));
  Logger.log('Agora corre  organizarPorAluno  para refazer as folhas por aluno.');
}

/** Lê uma folha antiga e devolve objetos com os nomes das colunas. */
function lerFolhaAntiga(ss, nomes) {
  for (var n = 0; n < nomes.length; n++) {
    var f = ss.getSheetByName(nomes[n]);
    if (!f) continue;
    var d = f.getDataRange().getValues();
    if (d.length < 2) return [];
    var cab = d[0].map(function (c) { return String(c); });
    var saida = [];
    for (var i = 1; i < d.length; i++) {
      var o = {};
      for (var c = 0; c < cab.length; c++) o[cab[c]] = valorTexto(d[i][c]);
      saida.push(o);
    }
    return saida;
  }
  return [];
}

function importarHistorico() {
  if (!ANTIGO_HISTORICO) return 0;
  var ss;
  try { ss = SpreadsheetApp.openById(ANTIGO_HISTORICO); }
  catch (e) { Logger.log('Histórico antigo: não consegui abrir — ' + e); return 0; }
  var n = 0;

  lerFolhaAntiga(ss, ['AVALIACOES']).forEach(function (r) {
    if (!r.id && !r.alunoId) return;
    guardar('AVALIACOES', {
      id: r.id || (r.alunoId + '_' + r.competenciaId + '_' + r.data),
      data: r.data, alunoId: r.alunoId, nomeAluno: r.nomeAluno, turmaId: r.turmaId,
      planoAulaId: r.planoAulaId, ucId: r.ucId, fichaId: r.fichaId,
      microcompetenciaId: r.competenciaId || r.microcompetenciaId,
      nota: Number(r.nota_1_5 || r.nota) || 0, validadoPor: r.validadoPor || 'professor'
    });
    n++;
  });

  lerFolhaAntiga(ss, ['Presenças', 'PRESENCAS']).forEach(function (r) {
    if (!r.alunoId) return;
    guardar('PRESENCAS', {
      data: r.Data || r.data, horaEntrada: r['Hora entrada'] || r.horaEntrada,
      alunoId: r.alunoId, nomeAluno: r.Aluno || r.nomeAluno,
      turmaId: r.Turma || r.turmaId, planoAulaId: r.planoAulaId,
      ucId: r.UC || r.ucId,
      presente: (r.Estado || '') !== 'Ausente',
      atrasado: (r.Estado || '') === 'Fora do tempo',
      atrasadoMins: Number(r['Atraso (min)'] || 0) || 0,
      fardamentoOk: (r['Fardamento OK'] || '') === 'Sim',
      decisaoProfessor: r['Decisao professor'] || '',
      decididoPor: r['Decidido por'] || '', observacao: r.Observacao || ''
    });
    n++;
  });

  lerFolhaAntiga(ss, ['SELECOES']).forEach(function (r) {
    if (!r.id) return;
    var autos = [];
    try { autos = JSON.parse(r.autoavaliacoes || '[]'); } catch (e) {}
    guardar('SELECOES', {
      id: r.id, alunoId: r.alunoId, nomeAluno: r.nomeAluno, turmaId: r.turmaId,
      planoAulaId: r.planoAulaId, ucId: r.ucId, criadaEm: r.criadaEm,
      autoavaliacoes: autos
    });
    n++;
  });

  lerFolhaAntiga(ss, ['VALIDACOES']).forEach(function (r) {
    if (!r.id) return;
    var notas = [];
    try { notas = JSON.parse(r.notas || '[]'); } catch (e) {}
    guardar('VALIDACOES', {
      id: r.id, selecaoId: r.selecaoId, alunoId: r.alunoId, turmaId: r.turmaId,
      planoAulaId: r.planoAulaId, validadoEm: r.validadoEm, validadoPor: r.validadoPor,
      notaMedia20: r.nota_media_0_20, comentario: r.comentario, notas: notas
    });
    n++;
  });

  lerFolhaAntiga(ss, ['SESSOES']).forEach(function (r) {
    if (!r.planoAulaId) return;
    guardar('SESSOES', r); n++;
  });

  lerFolhaAntiga(ss, ['LIDERES_KF']).forEach(function (r) {
    if (!r.planoAulaId) return;
    guardar('LIDERES_KF', r); n++;
  });

  Logger.log('Do Histórico antigo: ' + n + ' registos.');
  return n;
}

function importarFichas() {
  if (!ANTIGO_FICHAS) return 0;
  var ss;
  try { ss = SpreadsheetApp.openById(ANTIGO_FICHAS); }
  catch (e) { Logger.log('Fichas antigas: não consegui abrir — ' + e); return 0; }
  var n = 0;
  lerFolhaAntiga(ss, ['INDICE']).forEach(function (r) {
    var id = r.ID || r.id;
    if (!id) return;
    guardar('FICHAS', {
      id: id, nomePrato: r['Nome Prato'], classificacao: r.Classificacao,
      ucsAssociadas: r.UC, elaboradoPor: r.Professor, data: r.Data,
      numPorcoes: r['Num Porcoes'], alergenicos: r['Alergénicos'],
      htmlCompleto: r['HTML Completo'], textoGuia: r['Texto Guia'],
      planoAulaId: r['Plano Aula ID'], linkFicha: r['Link da Ficha']
    });
    n++;
  });
  Logger.log('Das Fichas antigas: ' + n + ' fichas.');
  return n;
}


// ══════════════════════════════════════════════════════════════
// FOLHAS POR ALUNO — por ano, como era antes
// ══════════════════════════════════════════════════════════════
// As folhas de dados são para a aplicação. Estas são para se ler: uma
// por aluno, com o 1º, o 2º e o 3º ano separados.

var COLUNAS_ALUNO = [
  'Data', 'Plano de aula', 'UC', 'Ficha', 'Competência',
  'Nota (0-20)', 'Nível', 'Validado por'
];

function nomeDaFolhaDoAluno(nome, numero) {
  var limpo = String(nome || ('Aluno ' + numero)).replace(/[^a-zA-Z0-9 À-ú]/g, '').trim().substring(0, 24);
  return (numero || 0) + '_' + (limpo || ('Aluno' + numero));
}

function folhaDoAluno(ss, nome, numero) {
  var n = nomeDaFolhaDoAluno(nome, numero);
  var f = ss.getSheetByName(n);
  if (f) return f;

  f = ss.insertSheet(n);
  f.getRange('A1').setValue('AVALIAÇÃO ECL — ' + (nome || ''))
    .setFontSize(13).setFontWeight('bold');
  f.getRange('A1:H1').setBackground('#1f1b16').setFontColor('#faf7f2');
  f.getRange('A2').setValue('Número:'); f.getRange('B2').setValue(numero || '');

  var linhas = [5, 60, 115];
  ['1º ANO', '2º ANO', '3º ANO'].forEach(function (ano, i) {
    var l = linhas[i];
    f.getRange(l, 1, 1, 8).setBackground('#1f1b16').setFontColor('#faf7f2');
    f.getRange(l, 1).setValue('── ' + ano + ' ──').setFontWeight('bold');
    f.getRange(l + 1, 1, 1, COLUNAS_ALUNO.length).setValues([COLUNAS_ALUNO])
      .setFontWeight('bold').setBackground('#b5651d').setFontColor('white');
  });
  for (var w = 0; w < 8; w++) f.setColumnWidth(w + 1, [90, 150, 90, 160, 200, 90, 130, 110][w]);
  return f;
}

/** Escreve uma avaliação na folha do aluno, no ano certo. */
function escreverNaFolhaDoAluno(d) {
  if (!d.alunoId) return;
  var ss = ficheiro();
  var f = folhaDoAluno(ss, d.nomeAluno, d.numero);
  var ano = Number(d.ano) || 1;
  var inicio = [5, 60, 115][ano - 1] + 2;

  // (v20) A primeira linha livre do ano, numa leitura só (eram até 50).
  var coluna = f.getRange(inicio, 1, 50, 1).getValues();
  var livre = 0;
  while (livre < 50 && coluna[livre][0] !== '') livre++;
  if (livre >= 50) livre = 49;
  var linha = inicio + livre;

  var nota20 = Number(d.nota_0_20) || Math.min(20, Math.round((Number(d.nota) || 0) * 4));
  var nivel = nota20 >= 17 ? 'Avançado' : nota20 >= 14 ? 'Consolidado'
            : nota20 >= 10 ? 'Em desenvolvimento' : 'Inicial';

  f.getRange(linha, 1, 1, 8).setValues([[
    String(d.data || '').slice(0, 10), d.planoTitulo || d.planoAulaId || '',
    d.ucId || '', d.fichaNome || '', d.microcompetencia || d.microcompetenciaId || '',
    nota20, nivel, d.validadoPor || 'professor'
  ]]);
  f.getRange(linha, 1, 1, 8).setBackground(nota20 >= 14 ? '#eef4eb' : nota20 >= 10 ? '#fdf0e6' : '#fdf0ef');
}

/**
 * Refaz as folhas de todos os alunos a partir das AVALIACOES.
 * Corre depois de importar, ou sempre que quiseres arrumar.
 */
function organizarPorAluno() {
  var ss = ficheiro();
  var alunos = ler('ALUNOS', {});
  var porId = {};
  alunos.forEach(function (a) { porId[a.id] = a; });

  // Limpar as folhas antigas dos alunos
  ss.getSheets().forEach(function (f) {
    if (/^\d+_/.test(f.getName())) ss.deleteSheet(f);
  });

  var n = 0;
  ler('AVALIACOES', {}).forEach(function (r) {
    var a = porId[r.alunoId] || {};
    escreverNaFolhaDoAluno({
      alunoId: r.alunoId, nomeAluno: r.nomeAluno || a.nome, numero: a.numero || 0,
      ano: a.ano || (String(a.turmaId || '').match(/[123]/) || [1])[0],
      data: r.data, planoTitulo: r.planoAulaId, ucId: r.ucId,
      microcompetenciaId: r.microcompetenciaId, nota: r.nota, validadoPor: r.validadoPor
    });
    n++;
  });
  Logger.log('Folhas por aluno refeitas: ' + n + ' avaliações.');
}


// ══════════════════════════════════════════════════════════════
// O DETALHE — o que está dentro de cada registo
// ══════════════════════════════════════════════════════════════
// O registo completo fica sempre guardado em texto, e nada se perde.
// Estas folhas abrem esse texto para se poder ler, filtrar e somar.
// (v20) Cada uma escreve tudo de uma vez (guardarVarios), e não uma
// gravação por linha.

function abrirLinhasDaRequisicao(r) {
  var lista = (r.linhas || []).map(function (l, i) {
    return {
      id: (r.id || '') + '_' + (l.id || i),
      requisicaoId: r.id || '', turmaId: r.turmaId || '', planoAulaId: r.planoAulaId || '',
      produto: l.produto || '', quantidadeTotal: l.quantidadeTotal || '',
      unidade: l.unidade || '', precoUnitario: l.precoUnitario || '',
      custoTotal: l.custoTotal || '', obs: l.obs || ''
    };
  });
  if (lista.length) guardarVarios('REQUISICAO_LINHAS', lista);
}

function abrirAutoavaliacoes(s) {
  var lista = (s.autoavaliacoes || []).map(function (a, i) {
    return {
      id: (s.id || '') + '_' + (a.competenciaId || i),
      selecaoId: s.id || '', alunoId: s.alunoId || '', nomeAluno: s.nomeAluno || '',
      turmaId: s.turmaId || '', planoAulaId: s.planoAulaId || '',
      competenciaId: a.competenciaId || '', nivel: a.nivel || '',
      nota: a.nota || '', criadaEm: s.criadaEm || ''
    };
  });
  if (lista.length) guardarVarios('AUTOAVALIACOES', lista);
}

/** A nota final publicada, numa linha legível (folha NOTAS_FINAIS). */
function abrirNotaFinal(s) {
  var a = (s.autoavaliacoes || [])[0] || {};
  var ucId = String(s.planoAulaId || '').replace('UCNOTA|', '');
  var nota = Number(a.nota);
  guardar('NOTAS_FINAIS', {
    id: s.id || (ucId + '_' + s.alunoId),
    turmaId: s.turmaId || '', ucId: ucId, alunoId: s.alunoId || '', nomeAluno: s.nomeAluno || '',
    nota: isNaN(nota) ? '' : nota,
    classificacao: isNaN(nota) ? '' : (nota < 10 ? nota + ' a)' : String(nota)),
    resultado: a.resultado || '', cp: a.cp === undefined ? '' : a.cp, total: a.total === undefined ? '' : a.total,
    professor: a.professor || '', publicadaEm: a.publicadaEm || s.criadaEm || ''
  });
}

function abrirNotasDaValidacao(v) {
  var lista = (v.notas || []).map(function (n, i) {
    return {
      id: (v.id || '') + '_' + (n.competenciaId || i),
      validacaoId: v.id || '', alunoId: v.alunoId || '',
      turmaId: v.turmaId || v.turma || '', planoAulaId: v.planoAulaId || '',
      competenciaId: n.competenciaId || '', notaAluno: n.notaAluno || '',
      notaProfessor: n.notaProfessor || '', notaFinal: n.notaFinal || n.nota || '',
      validadoEm: v.validadoEm || ''
    };
  });
  if (lista.length) guardarVarios('VALIDACOES_NOTAS', lista);
}


// ══════════════════════════════════════════════════════════════
// A FICHA POR EXTENSO
// ══════════════════════════════════════════════════════════════
// Uma folha por ficha, com ingredientes e preparação — para ler e
// imprimir, como no ficheiro antigo das fichas.
//
// O nome da folha leva a parte ÚNICA do identificador. No script
// antigo levava os primeiros 8 caracteres, que são iguais em todas
// ("ficha_17"), e duas fichas com nomes parecidos apagavam-se uma à
// outra.

function parteUnicaId(id) {
  var s = String(id || '');
  var pedacos = s.split('_');
  var cauda = pedacos.slice(1).join('');
  return cauda.slice(-10) || s.slice(-10) || 'sem_id';
}

function nomeDaFolhaDaFicha(f) {
  var nome = String(f.nomePrato || 'Ficha').replace(/[^a-zA-Z0-9 À-ú]/g, '').trim();
  return ('F ' + nome.substring(0, 24) + ' ' + parteUnicaId(f.id)).substring(0, 95);
}

function escreverFichaPorExtenso(f) {
  if (!f || !f.id) return;
  var ss = ficheiro();
  var nome = nomeDaFolhaDaFicha(f);
  var s = ss.getSheetByName(nome);
  if (!s) s = ss.insertSheet(nome); else s.clear();

  s.getRange('A1').setValue('FICHA DE PRODUÇÃO — ' + String(f.nomePrato || '').toUpperCase())
    .setFontSize(13).setFontWeight('bold');
  s.getRange('A1:G1').setBackground('#1f1b16').setFontColor('#faf7f2');

  var meta = [
    ['Classificação:', f.classificacao || ''],
    ['Nº da ficha:', f.fichaNum || ''],
    ['Nº de porções:', f.numPorcoes || ''],
    ['Tempo de preparação:', f.tempoPrep || ''],
    ['Tempo de confeção:', f.tempoConf || ''],
    ['Alergénios:', Array.isArray(f.alergenicos) ? f.alergenicos.join(', ') : (f.alergenicos || '')],
    ['Unidades de competência:', Array.isArray(f.ucsAssociadas) ? f.ucsAssociadas.join(', ') : (f.ucsAssociadas || '')],
    ['Elaborado por:', f.elaboradoPor || ''],
    ['Data:', String(f.data || '').slice(0, 10)],
    ['Plano de aula:', f.planoAulaId || '']
  ];
  s.getRange(2, 1, meta.length, 2).setValues(meta);
  s.getRange(2, 1, meta.length, 1).setFontWeight('bold').setBackground('#f5f0e8');

  var l = 2 + meta.length + 1;
  s.getRange(l, 1).setValue('INGREDIENTES').setFontWeight('bold').setFontSize(12);
  s.getRange(l, 1, 1, 7).setBackground('#b5651d').setFontColor('white');
  l++;
  s.getRange(l, 1, 1, 7).setValues([['Componente', 'QT', 'UN', 'Produto', 'T. prep.', 'T. conf.', 'Observações']])
    .setFontWeight('bold').setBackground('#fdf0e6');
  l++;
  (f.ingredientes || []).forEach(function (i, n) {
    if (!i.produto && !i.componente) return;
    s.getRange(l, 1, 1, 7).setValues([[i.componente || '', i.qt || '', i.un || '',
      i.produto || '', i.tPrep || '', i.tConf || '', i.obs || '']]);
    s.getRange(l, 1, 1, 7).setBackground(n % 2 === 0 ? '#ffffff' : '#faf7f2');
    l++;
  });

  l += 1;
  s.getRange(l, 1).setValue('MODO DE PREPARAÇÃO').setFontWeight('bold').setFontSize(12);
  s.getRange(l, 1, 1, 7).setBackground('#3d3830').setFontColor('white');
  l++;
  s.getRange(l, 1, 1, 6).setValues([['Nº', 'Descrição', 'Temperatura', 'Tempo', 'Observações', 'HACCP / PCC']])
    .setFontWeight('bold').setBackground('#e8e4de');
  l++;
  (f.preparacao || []).forEach(function (p, n) {
    if (!p.descricao) return;
    s.getRange(l, 1, 1, 6).setValues([[p.num || (n + 1), p.descricao || '',
      p.temperatura || '', p.tempo || '', p.obs || '', p.haccp || '']]);
    s.getRange(l, 1, 1, 6).setBackground(n % 2 === 0 ? '#ffffff' : '#faf7f2');
    l++;
  });

  [['EMPRATAMENTO', f.empratamento], ['EQUIPAMENTO', f.equipamento],
   ['CONSERVAÇÃO', f.conservacao], ['REGENERAÇÃO', f.regeneracao],
   ['REGISTOS KITCHENFLOW', f.kitchenflow], ['GUIÃO DE PRODUÇÃO', f.textoGuia]
  ].forEach(function (par) {
    if (!par[1]) return;
    l += 1;
    s.getRange(l, 1).setValue(par[0]).setFontWeight('bold').setBackground('#e8e4de');
    l++;
    s.getRange(l, 1).setValue(par[1]).setWrap(true);
    s.getRange(l, 1, 1, 7).merge();
    l++;
  });

  [120, 60, 50, 200, 80, 80, 250].forEach(function (w, i) { s.setColumnWidth(i + 1, w); });

  // Guardar no índice o nome da folha, para a encontrar depois.
  guardar('FICHAS', { id: f.id, folha: nome });
}

/** Refaz as folhas de todas as fichas a partir do que está guardado. */
function organizarFichas() {
  var n = 0;
  ler('FICHAS', {}).forEach(function (f) {
    if (!f.ingredientes && !f.preparacao) return;   // só índice, sem conteúdo
    escreverFichaPorExtenso(f);
    n++;
  });
  Logger.log('Fichas escritas por extenso: ' + n);
  Logger.log('As que só têm o índice não aparecem — vêm completas quando a aplicação as enviar.');
}


// ══════════════════════════════════════════════════════════════
// AS FICHAS ANTIGAS, COM INGREDIENTES E PREPARAÇÃO
// ══════════════════════════════════════════════════════════════
// O índice antigo só guardava o nome, a UC e o html. Os ingredientes e a
// preparação estavam desenhados numa folha por ficha. Isto lê essas
// folhas de volta e reconstrói a ficha inteira.
//
// O nome da folha antiga era  <8 primeiros caracteres do id>_<nome>.
// Como os 8 primeiros são iguais em todas ("ficha_17"), duas fichas com
// nomes parecidos partilhavam folha e uma apagou a outra — o que lá
// estiver é o que se consegue trazer.

function importarFichasPorExtenso() {
  if (!ANTIGO_FICHAS) return 0;
  var ss;
  try { ss = SpreadsheetApp.openById(ANTIGO_FICHAS); }
  catch (e) { Logger.log('Fichas antigas: não consegui abrir — ' + e); return 0; }

  var indice = lerFolhaAntiga(ss, ['INDICE']);
  var n = 0, semFolha = 0;

  indice.forEach(function (r) {
    var id = r.ID || r.id;
    if (!id) return;
    var nome = String(r['Nome Prato'] || '').replace(/[^a-zA-Z0-9À-ú ]/g, '').trim();
    var f = ss.getSheetByName(String(id).substring(0, 8) + '_' + nome.substring(0, 20));
    if (!f) { semFolha++; return; }

    var ficha = lerFichaDesenhada(f, id, r);
    guardar('FICHAS', ficha);
    try { escreverFichaPorExtenso(ficha); } catch (e) { Logger.log(e); }
    n++;
  });

  Logger.log('Fichas trazidas com ingredientes e preparação: ' + n);
  if (semFolha) Logger.log('Sem folha própria (só índice): ' + semFolha);
  return n;
}

/** Lê uma folha de ficha do ficheiro antigo e devolve o objeto. */
function lerFichaDesenhada(f, id, doIndice) {
  var d = f.getDataRange().getValues();
  var ficha = {
    id: id,
    nomePrato: doIndice['Nome Prato'] || '',
    classificacao: doIndice.Classificacao || '',
    ucsAssociadas: doIndice.UC || '',
    elaboradoPor: doIndice.Professor || '',
    data: doIndice.Data || '',
    numPorcoes: doIndice['Num Porcoes'] || '',
    alergenicos: doIndice['Alergénicos'] || '',
    htmlCompleto: doIndice['HTML Completo'] || '',
    textoGuia: doIndice['Texto Guia'] || '',
    planoAulaId: doIndice['Plano Aula ID'] || '',
    ingredientes: [], preparacao: []
  };

  var etiqueta = function (linha) { return String((d[linha] || [])[0] || '').trim().toUpperCase(); };

  // Metadados: "Classificação:", "Nº Porções:", "Tempo Prep:"…
  for (var i = 1; i < Math.min(12, d.length); i++) {
    var e = String(d[i][0] || '').trim().toLowerCase();
    var v = d[i][1];
    if (!e || v === '' || v === null) continue;
    if (e.indexOf('tempo prep') === 0) ficha.tempoPrep = valorTexto(v);
    else if (e.indexOf('tempo conf') === 0) ficha.tempoConf = valorTexto(v);
    else if (e.indexOf('alerg') === 0 && !ficha.alergenicos) ficha.alergenicos = valorTexto(v);
    else if (e.indexOf('porç') === 0 && !ficha.numPorcoes) ficha.numPorcoes = valorTexto(v);
  }

  // Onde começa cada bloco
  var lIng = -1, lPrep = -1, extras = [];
  for (var l = 0; l < d.length; l++) {
    var t = etiqueta(l);
    if (t === 'INGREDIENTES') lIng = l + 2;                 // salta o cabeçalho
    else if (t.indexOf('MODO DE PREPARA') === 0) lPrep = l + 2;
    else if (t === 'EMPRATAMENTO' || t === 'CONSERVAÇÃO' || t === 'CONSERVACAO'
          || t.indexOf('REGISTOS KITCHENFLOW') === 0) extras.push([t, l]);
  }

  var fimIng = lPrep > 0 ? lPrep - 3 : d.length;
  for (var i2 = lIng; i2 > 0 && i2 < fimIng && i2 < d.length; i2++) {
    var linha = d[i2];
    if (!linha) break;
    var componente = valorTexto(linha[0]), produto = valorTexto(linha[3]);
    if (!componente && !produto) continue;
    ficha.ingredientes.push({
      componente: componente, qt: valorTexto(linha[1]), un: valorTexto(linha[2]),
      produto: produto, tPrep: valorTexto(linha[4]), tConf: valorTexto(linha[5]),
      obs: valorTexto(linha[6])
    });
  }

  var fimPrep = extras.length ? extras[0][1] - 1 : d.length;
  for (var j = lPrep; j > 0 && j < fimPrep && j < d.length; j++) {
    var p = d[j];
    if (!p) break;
    var desc = valorTexto(p[1]);
    if (!desc) continue;
    ficha.preparacao.push({
      num: valorTexto(p[0]), descricao: desc, temperatura: valorTexto(p[2]),
      tempo: valorTexto(p[3]), obs: valorTexto(p[4]), haccp: valorTexto(p[5])
    });
  }

  extras.forEach(function (par) {
    var conteudo = valorTexto((d[par[1] + 1] || [])[0]);
    if (!conteudo) return;
    if (par[0] === 'EMPRATAMENTO') ficha.empratamento = conteudo;
    else if (par[0].indexOf('CONSERVA') === 0) ficha.conservacao = conteudo;
    else ficha.kitchenflow = conteudo;
  });

  return ficha;
}


// ══════════════════════════════════════════════════════════════
// OS PLANOS ANTIGOS
// ══════════════════════════════════════════════════════════════
// O script antigo dos planos guardava 19 colunas — e as fichas do plano
// não eram uma delas. Os planos vêm com o resto todo; as fichas voltam
// quando a aplicação os enviar (Alunos → Enviar tudo).

function importarPlanos() {
  if (!ANTIGO_PLANOS) return 0;
  var ss;
  try { ss = SpreadsheetApp.openById(ANTIGO_PLANOS); }
  catch (e) { Logger.log('Planos antigos: não consegui abrir — ' + e); return 0; }
  var n = 0;

  lerFolhaAntiga(ss, ['Planos_Aula']).forEach(function (r) {
    var id = r.ID || r.id;
    if (!id) return;
    var rem = [], add = [];
    try { rem = JSON.parse(r['Comp Removidas'] || '[]'); } catch (e) {}
    try { add = JSON.parse(r['Comp Adicionadas'] || '[]'); } catch (e) {}
    guardar('PLANOS', {
      id: id, turmaId: r.Turma, professor: r.Professor,
      data: String(r.Data || '').slice(0, 10),
      horaInicio: r['Hora Inicio'], horaFim: r['Hora Fim'],
      titulo: r.Titulo, observacoes: r.Observacoes,
      ucId: r['UC ID'], ucNome: r['UC Nome'],
      numeroPlan: Number(r['Numero Plano']) || undefined,
      estado: r.Estado, requisicaoId: r['Requisicao ID'], eventoId: r['Evento ID'],
      compRemovidas: rem, compAdicionadas: add,
      criadoEm: r['Criado Em'], atualizadoEm: r['Atualizado Em'],
      tipoPlanAula: r['Tipo Plano Aula'] || 'pratico',
      fichasIds: []        // o script antigo não as guardava
    });
    n++;
  });

  lerFolhaAntiga(ss, ['Requisicoes']).forEach(function (r) {
    var id = r.ID || r.id;
    if (!id) return;
    var linhas = [];
    try { linhas = JSON.parse(r['Linhas JSON'] || '[]'); } catch (e) {}
    var req = {
      id: id, planoAulaId: r['Plano ID'], planoTitulo: r['Plano Titulo'],
      turmaId: r.Turma, data: r.Data, linhas: linhas,
      criadoEm: r['Criado Em'], atualizadaEm: r['Atualizado Em']
    };
    guardar('REQUISICOES', resumirRequisicao(req));
    try { abrirLinhasDaRequisicao(req); } catch (e) {}
    n++;
  });

  Logger.log('Dos Planos antigos: ' + n + ' registos (planos e requisições).');
  Logger.log('As fichas de cada plano não vinham no script antigo — voltam com "Enviar tudo".');
  return n;
}


// ══════════════════════════════════════════════════════════════
// PAUTA DE FIM DE MÓDULO
// ══════════════════════════════════════════════════════════════
// O professor fecha a UC e a pauta fica numa folha própria, pronta a
// imprimir ou a enviar à direção. O email leva o link.

function guardarPauta(d) {
  var ss = ficheiro();
  var linhas = d.linhas || [];
  var nome = ('Pauta ' + (d.ucId || '') + ' ' + (d.turmaId || '')).substring(0, 95);

  var f = ss.getSheetByName(nome);
  if (!f) f = ss.insertSheet(nome); else f.clear();

  f.getRange('A1').setValue('PAUTA DE AVALIAÇÃO — ' + (d.ucNome || d.ucId || ''))
    .setFontSize(13).setFontWeight('bold');
  f.getRange('A1:H1').setBackground('#1f1b16').setFontColor('#faf7f2');

  var meta = [
    ['Turma:', d.turmaId || ''],
    ['Unidade:', (d.ucId || '') + (d.ucNome ? ' — ' + d.ucNome : '')],
    ['Disciplina:', d.disciplina || ''],
    ['Período:', (String(d.dataInicio || '').slice(0, 10)) + ' a ' + (String(d.dataFim || '').slice(0, 10))],
    ['Horas previstas:', d.horasPrevistas || ''],
    ['Professor:', d.professor || ''],
    ['Fechada em:', new Date().toLocaleDateString('pt-PT')]
  ];
  f.getRange(2, 1, meta.length, 2).setValues(meta);
  f.getRange(2, 1, meta.length, 1).setFontWeight('bold').setBackground('#f5f0e8');

  var l = 2 + meta.length + 1;
  // v12: a aplicação manda a pauta oficial (5 C, TOTAL, RESULTADO e a
  // classificação atribuída). Versões antigas da aplicação mandavam a
  // nota com bónus — continuam a sair como antes.
  var oficial = linhas.length > 0 && linhas[0].classificacao !== undefined;
  if (oficial) {
    var cab = ['Nº', 'Aluno', 'CM', 'CP', 'CL', 'CO', 'CR', 'TOTAL', 'RESULTADO',
      'Proposta aluno', 'CLASSIF. ATRIBUÍDA', 'Presença %', 'Observações'];
    f.getRange(l, 1, 1, cab.length).setValues([cab])
      .setFontWeight('bold').setBackground('#b5651d').setFontColor('white');
    l++;
    for (var i = 0; i < linhas.length; i++) {
      var r = linhas[i];
      var v = function (x) { return x === null || x === undefined || x === '' ? '—' : x; };
      f.getRange(l + i, 1, 1, cab.length).setValues([[
        r.numero, r.nome, v(r.cm), v(r.cp), v(r.cl), v(r.co), v(r.cr), v(r.total), v(r.resultado),
        v(r.proposta), v(r.classificacao), (r.presenca || 0) + '%',
        r.recuperacao ? ('Recuperação — ' + (r.motivo || '')) : ''
      ]]);
      var nf = Number(r.final);
      var cor = r.final === null || r.final === undefined ? '#ffffff'
        : nf >= 14 ? '#eef4eb' : nf >= 10 ? '#fdf0e6' : '#fdf0ef';
      f.getRange(l + i, 1, 1, cab.length).setBackground(cor);
    }
    [45, 230, 45, 45, 45, 45, 45, 60, 140, 90, 120, 90, 240].forEach(function (w, c) { f.setColumnWidth(c + 1, w); });
  } else {
    f.getRange(l, 1, 1, 8).setValues([[
      'Nº', 'Aluno', 'Competências', 'Assiduidade', 'Eventos', 'NOTA FINAL', 'Presença %', 'Observações'
    ]]).setFontWeight('bold').setBackground('#b5651d').setFontColor('white');
    l++;
    for (var i2 = 0; i2 < linhas.length; i2++) {
      var r2 = linhas[i2];
      f.getRange(l + i2, 1, 1, 8).setValues([[
        r2.numero, r2.nome,
        r2.base === null ? '—' : r2.base,
        r2.bonusAssiduidade || 0,
        r2.bonusParticipacao || 0,
        r2.final === null ? '—' : r2.final,
        (r2.presenca || 0) + '%',
        r2.recuperacao ? ('Recuperação — ' + (r2.motivo || '')) : ''
      ]]);
      var cor2 = r2.final === null ? '#ffffff'
        : r2.final >= 14 ? '#eef4eb' : r2.final >= 10 ? '#fdf0e6' : '#fdf0ef';
      f.getRange(l + i2, 1, 1, 8).setBackground(cor2);
    }
    [45, 230, 110, 100, 90, 100, 90, 240].forEach(function (w, c) { f.setColumnWidth(c + 1, w); });
  }

  var linkFolha = ss.getUrl() + '#gid=' + f.getSheetId();
  var enviada = '';
  if (d.email) {
    try {
      MailApp.sendEmail({
        to: d.email,
        subject: 'Pauta ' + (d.ucId || '') + ' — ' + (d.turmaId || ''),
        htmlBody:
          '<p>Pauta de avaliação fechada em ' + new Date().toLocaleDateString('pt-PT') + '.</p>' +
          '<p><b>' + (d.ucId || '') + '</b> — ' + (d.ucNome || '') + '<br>' +
          'Turma: ' + (d.turmaId || '') + '<br>' +
          'Alunos: ' + linhas.length + '</p>' +
          '<p><a href="' + linkFolha + '">Abrir a pauta</a></p>' +
          '<p style="color:#666;font-size:12px">Enviado pela Avaliação ECL.</p>'
      });
      enviada = new Date().toISOString();
    } catch (e) {
      Logger.log('Email da pauta: ' + e);
    }
  }

  guardar('PAUTAS', {
    id: (d.turmaId || '') + '_' + (d.ucId || ''),
    turmaId: d.turmaId, ucId: d.ucId, ucNome: d.ucNome,
    professor: d.professor, email: d.email,
    criadaEm: d.criadaEm || new Date().toISOString(),
    nAlunos: linhas.length, folha: nome, enviada: enviada,
    linhas: linhas
  });

  return respostaDados({ pauta: nome, link: linkFolha, enviada: !!enviada });
}


// ══════════════════════════════════════════════════════════════
// ARRUMAR
// ══════════════════════════════════════════════════════════════
// (v20) De hora a hora: faz o que ficou por arrumar e atualiza as folhas
// de cada turma. Já não formata o ficheiro todo (o «embelezar» trancava o
// script durante muito tempo e as gravações esperavam): esse corre-se à
// mão, quando se quiser.

function arrumar() {
  tratarPendentes();
  atualizarFolhasDasTurmas();
}

/** (v20) Tudo o que corre sozinho, numa vez. Corre-se uma vez à mão. */
function instalarTarefas() {
  var existentes = ScriptApp.getProjectTriggers();
  // As antigas: a arrumação de hora a hora (que fazia o «embelezar») e a
  // volta dos pendentes de 10 em 10 minutos (passou a 5).
  existentes.forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'arrumar' || fn === 'tratarPendentes') ScriptApp.deleteTrigger(t);
  });
  var tem = function (fn) { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === fn; }); };
  if (!tem('tratarPendentes')) ScriptApp.newTrigger('tratarPendentes').timeBased().everyMinutes(5).create();
  if (!tem('atualizarFolhasDasTurmas')) ScriptApp.newTrigger('atualizarFolhasDasTurmas').timeBased().everyHours(1).create();
  if (!tem('arrumacaoDaNoite')) ScriptApp.newTrigger('arrumacaoDaNoite').timeBased().atHour(2).everyDays(1).create();
  criarCopiaAutomatica();
  atualizarFolhasDasTurmas();
  Logger.log('Tarefas: por arrumar logo a seguir a cada envio (e de 5 em 5 min), folhas das turmas de hora a hora, arrumação às 2h, cópia às 3h.');
}

/** (compatibilidade) A versão anterior chamava isto no arranque. */
function criarArrumacaoAutomatica() { instalarTarefas(); }


// ══════════════════════════════════════════════════════════════
// (v20) UMA FOLHA POR TURMA — só para ler
// ══════════════════════════════════════════════════════════════
// As folhas de dados têm as turmas todas misturadas: são para a aplicação.
// Cada turma tem agora uma folha «TURMA <nome>» com o que é dela — os
// alunos, as aulas, as presenças, as autoavaliações, as validações e as
// notas finais — por fórmulas: atualiza-se sozinha e não pesa nas
// gravações. Não se escreve nela (é refeita).

var SECCOES_TURMA = [
  { folha: 'ALUNOS',         titulo: 'ALUNOS',          cols: ['numero', 'nome', 'ativo'] },
  { folha: 'PLANOS',         titulo: 'AULAS',           cols: ['data', 'titulo', 'tipoPlanAula', 'estado'] },
  { folha: 'PRESENCAS',      titulo: 'PRESENÇAS',       cols: ['data', 'nomeAluno', 'presente', 'atrasado', 'decisaoProfessor'] },
  { folha: 'AUTOAVALIACOES', titulo: 'AUTOAVALIAÇÕES',  cols: ['criadaEm', 'nomeAluno', 'competenciaId', 'nota'] },
  { folha: 'VALIDACOES',     titulo: 'VALIDAÇÕES',      cols: ['validadoEm', 'alunoId', 'planoAulaId', 'notaMedia20'] },
  { folha: 'NOTAS_FINAIS',   titulo: 'NOTAS FINAIS',    cols: ['ucId', 'nomeAluno', 'nota', 'resultado'] }
];

function letraColuna(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function atualizarFolhasDasTurmas() {
  var ss = ficheiro();
  var cabecalhos = {};
  SECCOES_TURMA.forEach(function (sc) {
    var f = folha(ss, sc.folha);
    cabecalhos[sc.folha] = f.getRange(1, 1, 1, Math.max(1, f.getLastColumn())).getValues()[0];
  });
  turmasConhecidas().forEach(function (turma) {
    var nome = ('TURMA ' + turma).substring(0, 95);
    var f = ss.getSheetByName(nome) || ss.insertSheet(nome);
    f.clear();
    f.getRange(1, 1).setValue('TURMA ' + turma + ' — só para ler (atualiza-se sozinha)').setFontWeight('bold').setFontSize(13);
    var col = 1;
    var tq = String(turma).replace(/"/g, '""');
    SECCOES_TURMA.forEach(function (sc) {
      var cab = cabecalhos[sc.folha];
      var iTurma = cab.indexOf('turmaId');
      var letras = sc.cols.map(function (c) { var i = cab.indexOf(c); return i >= 0 ? letraColuna(i + 1) : null; });
      if (iTurma < 0 || letras.some(function (x) { return !x; })) return;
      var lt = letraColuna(iTurma + 1);
      f.getRange(3, col).setValue(sc.titulo).setFontWeight('bold');
      f.getRange(3, col, 1, sc.cols.length).setBackground('#7B2233').setFontColor('#ffffff');
      f.getRange(4, col, 1, sc.cols.length).setValues([sc.cols]).setFontWeight('bold').setBackground('#f5f0e8');
      var arr = letras.map(function (l) { return sc.folha + '!' + l + '2:' + l; }).join('\\');
      f.getRange(5, col).setFormula('=IFERROR(FILTER({' + arr + '};' + sc.folha + '!' + lt + '2:' + lt + '="' + tq + '");"—")');
      col += sc.cols.length + 1;
    });
    f.setFrozenRows(4);
    try { f.setTabColor('#3E7A31'); } catch (e) {}
  });
}


// ══════════════════════════════════════════════════════════════
// PROCURAR
// ══════════════════════════════════════════════════════════════
// Escreve-se um nome de aluno e vê-se tudo dele numa folha só: as notas,
// as presenças e as autoavaliações. Antes era preciso andar de folha em
// folha a filtrar.

function criarFolhaProcurar() {
  var ss = ficheiro();
  var f = ss.getSheetByName('PROCURAR');
  if (f) return f;                    // não apagar o que a professora escreveu
  f = ss.insertSheet('PROCURAR', 0);

  f.getRange('A1').setValue('PROCURAR UM ALUNO')
    .setFontSize(14).setFontWeight('bold');
  f.getRange('A1:H1').setBackground('#1f1b16').setFontColor('#faf7f2');

  f.getRange('A3').setValue('Escreve aqui o nome (ou parte):').setFontWeight('bold');
  f.getRange('B3').setBackground('#fdf0e6').setBorder(true, true, true, true, false, false);
  f.getRange('A4').setValue('Turma (opcional):').setFontWeight('bold');
  f.getRange('B4').setBackground('#fdf0e6').setBorder(true, true, true, true, false, false);

  f.getRange('A6').setValue('NOTAS').setFontWeight('bold').setBackground('#b5651d').setFontColor('white');
  f.getRange('A6:H6').setBackground('#b5651d');
  f.getRange('A7').setFormula(
    '=IFERROR(FILTER({AVALIACOES!B:B\\AVALIACOES!D:D\\AVALIACOES!E:E\\AVALIACOES!G:G\\AVALIACOES!H:H\\AVALIACOES!I:I};' +
    'ISNUMBER(SEARCH($B$3;AVALIACOES!D:D));' +
    'IF($B$4="";TRUE;AVALIACOES!E:E=$B$4));"— sem notas —")');

  f.getRange('J6').setValue('PRESENÇAS').setFontWeight('bold').setBackground('#5a7a4e').setFontColor('white');
  f.getRange('J6:P6').setBackground('#5a7a4e');
  f.getRange('J7').setFormula(
    '=IFERROR(FILTER({PRESENCAS!A:A\\PRESENCAS!D:D\\PRESENCAS!E:E\\PRESENCAS!H:H\\PRESENCAS!I:I\\PRESENCAS!J:J\\PRESENCAS!L:L};' +
    'ISNUMBER(SEARCH($B$3;PRESENCAS!D:D));' +
    'IF($B$4="";TRUE;PRESENCAS!E:E=$B$4));"— sem presenças —")');

  f.getRange('A6').setNote('Data · Aluno · Turma · UC · Competência · Nota');
  f.getRange('J6').setNote('Data · Aluno · Turma · Presente · Atrasado · Minutos · Decisão do professor');

  [140, 200, 90, 90, 200, 70, 30, 30, 30, 100, 200, 90, 90, 90, 90, 160]
    .forEach(function (w, c) { f.setColumnWidth(c + 1, w); });
  return f;
}


// ══════════════════════════════════════════════════════════════
// CÓPIA DE SEGURANÇA
// ══════════════════════════════════════════════════════════════
// Está tudo num ficheiro só. Se ele se estragar — uma fórmula mal
// colada, uma folha apagada sem querer, uma importação que corre mal —
// perde-se o ano inteiro de trabalho.
//
// Todas as noites fica uma cópia completa numa pasta à parte. Guardam-se
// as dos últimos 30 dias; as mais velhas vão para o lixo sozinhas.

var PASTA_COPIAS = 'Avaliação ECL — Cópias de segurança';
var DIAS_A_GUARDAR = 30;

function copiaDeSeguranca() {
  var ss = ficheiro();
  var pasta = pastaDasCopias();
  var hoje = Utilities.formatDate(new Date(), 'Europe/Lisbon', 'yyyy-MM-dd');
  var nome = 'Avaliação ECL — ' + hoje;

  // Uma por dia: correr duas vezes no mesmo dia não faz duas cópias.
  var existentes = pasta.getFilesByName(nome);
  if (existentes.hasNext()) {
    Logger.log('A cópia de hoje já existe.');
    return limparCopiasVelhas(pasta);
  }

  DriveApp.getFileById(ss.getId()).makeCopy(nome, pasta);
  Logger.log('Cópia feita: ' + nome);
  return limparCopiasVelhas(pasta);
}

function pastaDasCopias() {
  var it = DriveApp.getFoldersByName(PASTA_COPIAS);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PASTA_COPIAS);
}

function limparCopiasVelhas(pasta) {
  var limite = new Date().getTime() - DIAS_A_GUARDAR * 24 * 60 * 60 * 1000;
  var fs = pasta.getFiles(), apagadas = 0;
  while (fs.hasNext()) {
    var f = fs.next();
    if (f.getDateCreated().getTime() < limite) { f.setTrashed(true); apagadas++; }
  }
  if (apagadas) Logger.log('Cópias com mais de ' + DIAS_A_GUARDAR + ' dias arrumadas: ' + apagadas);
  var quantas = 0, it = pasta.getFiles();
  while (it.hasNext()) { it.next(); quantas++; }
  Logger.log('Cópias guardadas: ' + quantas + ' · pasta: ' + pasta.getUrl());
}

/** Todas as noites, por volta das três da manhã. */
function criarCopiaAutomatica() {
  var jaTem = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'copiaDeSeguranca';
  });
  if (jaTem) return;
  ScriptApp.newTrigger('copiaDeSeguranca').timeBased().atHour(3).everyDays(1).create();
  Logger.log('Cópia de segurança automática ligada (todas as noites).');
}

/** Correr à mão para ver se está tudo a funcionar. */
function verCopias() {
  var pasta = pastaDasCopias();
  Logger.log('Pasta: ' + pasta.getUrl());
  var fs = pasta.getFiles(), n = 0;
  while (fs.hasNext()) {
    var f = fs.next(); n++;
    Logger.log('  ' + f.getName() + '  ('
      + Utilities.formatDate(f.getDateCreated(), 'Europe/Lisbon', 'dd/MM HH:mm') + ')');
  }
  if (!n) Logger.log('  (ainda não há nenhuma — corre copiaDeSeguranca)');
  var trigs = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  Logger.log('Tarefas automáticas: ' + (trigs.join(', ') || 'nenhuma'));
}


/** Linhas marcadas como eliminadas nas versões anteriores — arrumá-las. */
function arrumarMarcadosComoEliminados(ss) {
  var movidas = 0;
  for (var nome in FOLHAS) {
    var f = ss.getSheetByName(nome);
    if (!f || f.getLastRow() < 2) continue;
    var d = f.getDataRange().getValues();
    var colunas = d[0];
    var iEl = colunas.indexOf(COL_ELIMINADO);
    var iId = colunas.indexOf('id');
    var iReg = colunas.indexOf(COL_REGISTO);
    if (iEl < 0) continue;
    for (var i = d.length - 1; i >= 1; i--) {
      if (!d[i][iEl]) continue;
      registarEliminado(ss, nome, iId >= 0 ? d[i][iId] : '', iReg >= 0 ? d[i][iReg] : '');
      f.deleteRow(i + 1);
      movidas++;
    }
  }
  if (movidas) Logger.log('Linhas eliminadas arrumadas para a folha ELIMINADOS: ' + movidas);
}


// ══════════════════════════════════════════════════════════════
// ELIMINAR UM ALUNO E ANULAR UMA AULA
// ══════════════════════════════════════════════════════════════
// O plano já saía do Sheets quando o professor o eliminava. Faltava o
// resto: o aluno eliminado ficava na folha ALUNOS, e as avaliações de
// uma aula anulada ficavam todas lá — a aplicação dizia que apagava e
// o Sheets guardava na mesma.

/** O aluno e tudo o que é dele. */
function eliminarAluno(alunoId) {
  if (!alunoId) return resposta(false, 'Sem aluno');
  var ss = ficheiro();
  var n = eliminar('ALUNOS', alunoId);
  var apagadas = 0;
  ['AVALIACOES', 'PRESENCAS', 'SELECOES', 'VALIDACOES', 'AUTOAVALIACOES',
   'VALIDACOES_NOTAS', 'RECUPERACOES', 'TELEMOVEIS'].forEach(function (folhaNome) {
    apagadas += apagarLinhasPor(ss, folhaNome, 'alunoId', alunoId);
  });
  return respostaDados({ aluno: alunoId, linhasApagadas: apagadas });
}

/** Tudo o que pertence a uma aula anulada. */
// (v19.2) Apagar uma coisa apaga tudo o que depende dela.
/** A requisição e a lista de produtos dela. */
function eliminarRequisicaoComLinhas(id) {
  if (!id) return resposta(false, 'Sem requisição');
  var ss = ficheiro();
  var r = eliminar('REQUISICOES', id);
  apagarLinhasPor(ss, 'REQUISICAO_LINHAS', 'requisicaoId', id);
  return r;
}
/** O evento, os orçamentos dele (as requisições feitas para o evento) e as listas de produtos. */
function eliminarEventoComOrcamentos(id) {
  if (!id) return resposta(false, 'Sem evento');
  var ss = ficheiro();
  var r = eliminar('EVENTOS', id);
  ler('REQUISICOES', {}).filter(function (q) { return String(q.eventoId || '') === String(id); })
    .forEach(function (q) { eliminar('REQUISICOES', q.id); apagarLinhasPor(ss, 'REQUISICAO_LINHAS', 'requisicaoId', q.id); });
  return r;
}

function eliminarTudoDoPlano(planoId) {
  if (!planoId) return resposta(false, 'Sem plano');
  var ss = ficheiro();
  eliminar('PLANOS', planoId);
  // A requisição da aula também (a cópia da aplicação; o documento oficial
  // do economato não é tocado).
  ler('REQUISICOES', {}).filter(function (q) { return String(q.planoAulaId || '') === String(planoId); })
    .forEach(function (q) { eliminar('REQUISICOES', q.id); apagarLinhasPor(ss, 'REQUISICAO_LINHAS', 'requisicaoId', q.id); });
  var apagadas = 0;
  ['AVALIACOES', 'PRESENCAS', 'SELECOES', 'VALIDACOES', 'AUTOAVALIACOES',
   'VALIDACOES_NOTAS', 'SESSOES', 'LIDERES_KF', 'GRUPOS', 'GRUPOS_INFO', 'AVALIACAO_PARES'].forEach(function (folhaNome) {
    apagadas += apagarLinhasPor(ss, folhaNome, 'planoAulaId', planoId);
  });
  return respostaDados({ plano: planoId, linhasApagadas: apagadas });
}

/** Apaga as linhas de uma folha onde uma coluna tem este valor. */
function apagarLinhasPor(ss, nomeFolha, coluna, valor) {
  var f = ss.getSheetByName(nomeFolha);
  if (!f || f.getLastRow() < 2) return 0;
  var d = f.getDataRange().getValues();
  var colunas = d[0];
  var iCol = colunas.indexOf(coluna);
  if (iCol < 0) return 0;
  var iId = colunas.indexOf('id');
  var iReg = colunas.indexOf(COL_REGISTO);
  var n = 0;
  for (var i = d.length - 1; i >= 1; i--) {
    if (String(d[i][iCol]) !== String(valor)) continue;
    registarEliminado(ss, nomeFolha, iId >= 0 ? d[i][iId] : '', iReg >= 0 ? d[i][iReg] : '');
    f.deleteRow(i + 1);
    n++;
  }
  return n;
}


// ══════════════════════════════════════════════════════════════
// O CONTADOR DE ALTERAÇÕES
// ══════════════════════════════════════════════════════════════
// Perguntar "houve novidades?" trazia sempre tudo — planos, presenças,
// avaliações — e por isso só se podia perguntar de minuto a minuto.
//
// Agora cada turma tem um número que sobe a cada alteração. O aparelho
// pergunta só o número: é uma resposta de meia dúzia de letras, que se
// pode pedir de 15 em 15 segundos sem gastar nada de jeito. Só quando o
// número muda é que vai buscar os dados a sério.

var CACHE_CONTADORES = 'ECL_CONTADORES';

function contadores() {
  var props = PropertiesService.getScriptProperties();
  try { return JSON.parse(props.getProperty(CACHE_CONTADORES) || '{}'); }
  catch (e) { return {}; }
}

function subirContador(turmaId) {
  try {
    var props = PropertiesService.getScriptProperties();
    var c = contadores();
    var agora = new Date().getTime();
    c[turmaId || 'todas'] = agora;
    c['todas'] = agora;                    // quem muda uma turma mexe no geral
    props.setProperty(CACHE_CONTADORES, JSON.stringify(c));
  } catch (e) { Logger.log('contador: ' + e); }
}

function lerContador(turmaId) {
  var c = contadores();
  return String(c[turmaId || 'todas'] || c['todas'] || 0);
}

/** Resposta mínima: só o número, sem embrulho. */
function respostaCurta(texto) {
  return ContentService.createTextOutput(String(texto))
    .setMimeType(ContentService.MimeType.TEXT);
}

// ══════════════════════════════════════════════════════════════
// (v18) UM FICHEIRO ARRUMADO E BONITO — «embelezar»
// ══════════════════════════════════════════════════════════════
// Corre-se uma vez à mão (Executar → embelezar). Põe os separadores pela
// ordem em que as coisas acontecem, pinta os cabeçalhos, esconde as
// colunas técnicas e cria a folha LEIA-ME. NÃO mexe na ordem das linhas
// nem nos dados. Espera pela vez, como as gravações.

var ORDEM_FOLHAS = [
  ['LEIA-ME', '#7B2233'],
  ['ALUNOS', '#7B2233'], ['PLANOS', '#7B2233'], ['SESSOES', '#7B2233'], ['PRESENCAS', '#7B2233'],
  ['SELECOES', '#B5651D'], ['AUTOAVALIACOES', '#B5651D'], ['VALIDACOES', '#B5651D'], ['VALIDACOES_NOTAS', '#B5651D'],
  ['AVALIACOES', '#B5651D'], ['LIDERES_KF', '#B5651D'],
  ['NOTAS_FINAIS', '#3E7A31'], ['PAUTAS', '#3E7A31'], ['RECUPERACOES', '#3E7A31'], ['EVIDENCIAS', '#3E7A31'],
  ['FICHAS', '#2F5D8A'], ['REQUISICOES', '#2F5D8A'], ['REQUISICAO_LINHAS', '#2F5D8A'], ['PRECOS', '#2F5D8A'], ['PRECOS_A_REVER', '#2F5D8A'],
  ['GRUPOS', '#B5651D'], ['GRUPOS_INFO', '#B5651D'], ['AVALIACAO_PARES', '#B5651D'],
  ['EVENTOS', '#6B4C9A'], ['COMANDAS', '#6B4C9A'],
  ['TELEMOVEIS', '#777777'], ['PROCURAR', '#777777'], ['ELIMINADOS', '#777777'], ['POR_ARRUMAR', '#777777']
];

var LEIA_ME = [
  ['Folha', 'O que tem'],
  ['TURMA …', 'Uma folha por turma, só para ler: alunos, aulas, presenças, autoavaliações, validações e notas finais dessa turma. Atualiza-se sozinha.'],
  ['ALUNOS', 'Os alunos de cada turma (nome, número, PIN).'],
  ['PLANOS', 'Os planos de aula: dia da aula, horas, unidade, estado (rascunho/publicado) e quando foram criados.'],
  ['SESSOES', 'As aulas abertas aos alunos: quando abriu e quando fechou.'],
  ['PRESENCAS', 'Quem entrou em cada aula, atrasos, fardamento e a decisão do professor.'],
  ['SELECOES', 'As autoavaliações que os alunos enviaram.'],
  ['AUTOAVALIACOES', 'As autoavaliações por extenso, fáceis de ler (preenchida logo a seguir a cada envio).'],
  ['VALIDACOES', 'As validações do professor (nota da aula).'],
  ['VALIDACOES_NOTAS', 'As notas validadas, competência a competência (preenchida logo a seguir a cada envio).'],
  ['AVALIACOES', 'Cada nota registada (aluno, competência, nota).'],
  ['NOTAS_FINAIS / PAUTAS', 'Notas finais das unidades e pautas enviadas.'],
  ['RECUPERACOES / EVIDENCIAS', 'Planos de recuperação e o que o aluno entregou.'],
  ['FICHAS', 'Fichas técnicas (a ficha por extenso está numa folha própria).'],
  ['REQUISICOES / REQUISICAO_LINHAS', 'Requisições e os produtos de cada uma.'],
  ['PRECOS / PRECOS_A_REVER', 'Preços das matérias-primas e os que os professores pediram para rever.'],
  ['GRUPOS / GRUPOS_INFO', 'Em que grupo esteve cada aluno em cada aula, e a ficha de cada grupo.'],
  ['AVALIACAO_PARES', 'O que cada aluno disse dos colegas de grupo. Só para o professor; não conta para nota.'],
  ['EVENTOS', 'Os eventos (pedido, orçamentos, estado).'],
  ['ELIMINADOS', 'O que foi apagado pela aplicação — fica aqui guardado e não volta.'],
  ['POR_ARRUMAR', 'O que falta passar para as folhas por extenso. Esvazia-se sozinha logo a seguir a cada envio (e de 5 em 5 minutos).'],
  ['', ''],
  ['Regras', 'Não ordenar nem filtrar as folhas de dados durante as aulas. Para ver uma turma, usar a folha «TURMA …». As linhas ficam pela ordem em que foram criadas.']
];

function embelezar() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { Logger.log('Ocupado — tente daqui a um minuto.'); return; }
  try {
    var ss = ficheiro();
    // LEIA-ME
    var lm = ss.getSheetByName('LEIA-ME') || ss.insertSheet('LEIA-ME');
    lm.clear();
    lm.getRange(1, 1, LEIA_ME.length, 2).setValues(LEIA_ME);
    lm.getRange(1, 1, 1, 2).setBackground('#7B2233').setFontColor('#ffffff').setFontWeight('bold');
    lm.setColumnWidth(1, 260); lm.setColumnWidth(2, 700);
    lm.setFrozenRows(1);
    // Ordem dos separadores e cores
    var pos = 1;
    ORDEM_FOLHAS.forEach(function (par) {
      var f = ss.getSheetByName(par[0]);
      if (!f) return;
      ss.setActiveSheet(f); ss.moveActiveSheet(pos++);
      try { f.setTabColor(par[1]); } catch (e) {}
      if (FOLHAS[par[0]]) formatarFolha(f, par[1]);
    });
    ss.setActiveSheet(lm);
    Logger.log('Ficheiro arrumado: separadores por ordem, cabeçalhos e LEIA-ME.');
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

function formatarFolha(f, cor) {
  var nCols = f.getLastColumn();
  if (nCols < 1) return;
  var cab = f.getRange(1, 1, 1, nCols).getValues()[0];
  var iEl = cab.indexOf(COL_ELIMINADO), iReg = cab.indexOf(COL_REGISTO);
  var visiveis = iEl >= 0 ? iEl : (iReg >= 0 ? iReg : nCols);
  f.setFrozenRows(1);
  try { f.getRange(1, 1, f.getMaxRows(), nCols).setNumberFormat('@'); } catch (e) {}
  try {
    f.getBandings().forEach(function (b) { b.remove(); });
    if (visiveis > 0) f.getRange(1, 1, Math.max(2, f.getMaxRows()), visiveis)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  } catch (e) {}
  f.getRange(1, 1, 1, nCols).setBackground(cor).setFontColor('#ffffff').setFontWeight('bold');
  if (iEl >= 0) f.hideColumns(iEl + 1);
  if (iReg >= 0) f.hideColumns(iReg + 1);
  if (visiveis > 0) { try { f.autoResizeColumns(1, visiveis); } catch (e) {} }
}



// ══════════════════════════════════════════════════════════════
// (v19) A AULA NA MEMÓRIA — um só pedido, rápido, para todos
// ══════════════════════════════════════════════════════════════
// O telemóvel do aluno pede «get_aula» de poucos em poucos segundos. A
// resposta vem da memória do script (CacheService), sem abrir as folhas:
// os planos publicados das últimas duas semanas, as fichas desses planos,
// a abertura das aulas e os grupos. (v20) Quando o professor muda alguma
// coisa, a memória dessa aula é esquecida e o primeiro telemóvel que a
// pedir monta-a outra vez a partir das folhas.

var MUDAM_A_AULA = { plano: 1, eliminar_plano: 1, eliminar_do_plano: 1, sessao: 1, fechar_sessao: 1,
  ficha: 1, eliminar_ficha: 1, grupo_info: 1, requisicao: 1 };
var MEMORIA_SEGUNDOS = 21600;          // 6 horas (o máximo)
var PEDACO = 90000;                    // cada valor na memória tem de ter menos de 100 KB

function turmaDoPedido(x) {
  return String((x.plano && x.plano.turmaId) || x.turmaId || (x.ficha ? '*' : '') || '*');
}

function hojeLisboa(desvioDias) {
  var d = new Date(Date.now() + (desvioDias || 0) * 86400000);
  return Utilities.formatDate(d, 'Europe/Lisbon', 'yyyy-MM-dd');
}

function chaveAula(turma) { return 'aula_' + turma; }

/** (v20) Esquece a aula de uma turma (ou de todas, com «*»): rápido, sem ler folhas. */
function esquecerAula(turma) {
  try {
    var turmas = turma && turma !== '*' ? [turma] : turmasEmMemoria();
    var c = CacheService.getScriptCache();
    c.removeAll(turmas.map(function (t) { return chaveAula(t) + '_n'; }));
  } catch (e) { Logger.log('esquecerAula: ' + e); }
}

/** As turmas cuja aula está na memória (guardadas à parte, para não ler a folha ALUNOS). */
function turmasEmMemoria() {
  try { return JSON.parse(CacheService.getScriptCache().get('aula_turmas') || '[]'); } catch (e) { return []; }
}

function lerDaMemoria(chave) {
  var c = CacheService.getScriptCache();
  var n = c.get(chave + '_n');
  if (!n) return null;
  var chaves = [];
  for (var i = 0; i < Number(n); i++) chaves.push(chave + '_' + i);
  var partes = c.getAll(chaves);
  var texto = '';
  for (var j = 0; j < chaves.length; j++) { if (partes[chaves[j]] == null) return null; texto += partes[chaves[j]]; }
  try { return JSON.parse(texto); } catch (e) { return null; }
}

function guardarNaMemoria(chave, obj) {
  var c = CacheService.getScriptCache();
  var texto = JSON.stringify(obj), valores = {}, n = 0;
  for (var i = 0; i < texto.length; i += PEDACO) { valores[chave + '_' + n] = texto.slice(i, i + PEDACO); n++; }
  valores[chave + '_n'] = String(n);
  c.putAll(valores, MEMORIA_SEGUNDOS);
  // (v20) Lembrar que turmas estão na memória, para as esquecer todas de uma vez.
  try {
    var t = chave.replace(/^aula_/, '');
    var lista = turmasEmMemoria();
    if (lista.indexOf(t) < 0) { lista.push(t); c.put('aula_turmas', JSON.stringify(lista), MEMORIA_SEGUNDOS); }
  } catch (e) {}
}

/** Monta a aula da turma a partir das folhas (1–2 s). */
function montarAula(turma) {
  var desde = hojeLisboa(-15), ate = hojeLisboa(2);
  var planos = ler('PLANOS', { turmaId: turma }).filter(function (p) {
    var dia = String(p.data || '').slice(0, 10);
    return p.estado === 'publicado' && dia >= desde && dia <= ate;
  });
  var idsPlanos = {}, idsFichas = {};
  planos.forEach(function (p) {
    idsPlanos[p.id] = true;
    var fs = p.fichasIds;
    if (typeof fs === 'string') { try { fs = JSON.parse(fs); } catch (e) { fs = fs.split(/[;,]/); } }
    (fs || []).forEach(function (id) { if (id) idsFichas[String(id).trim()] = true; });
  });
  var fichas = Object.keys(idsFichas).length ? ler('FICHAS', {}).filter(function (f) { return idsFichas[f.id]; }) : [];
  var sessoes = ler('SESSOES', { turmaId: turma }).filter(function (s) { return idsPlanos[s.planoAulaId]; });
  var info = ler('GRUPOS_INFO', { turmaId: turma }).filter(function (g) { return idsPlanos[g.planoAulaId]; });
  var membros = ler('GRUPOS', { turmaId: turma }).filter(function (m) { return idsPlanos[m.planoAulaId]; });
  var alunosIds = ler('ALUNOS', { turmaId: turma }).map(function (a) { return String(a.id); });
  // Os grupos de cada aluno ficam em chaves próprias: um aluno a mudar de
  // grupo não obriga a refazer a aula toda.
  var valores = {}, idx = {};
  membros.forEach(function (m) {
    valores['gm_' + m.planoAulaId + '_' + m.alunoId] = JSON.stringify(m);
    (idx[m.planoAulaId] = idx[m.planoAulaId] || []).push(String(m.alunoId));
  });
  for (var pid in idx) valores['gmidx_' + pid] = JSON.stringify(idx[pid]);
  if (Object.keys(valores).length) CacheService.getScriptCache().putAll(valores, MEMORIA_SEGUNDOS);
  return { planos: planos, fichas: fichas, sessoes: sessoes, info: info, alunosIds: alunosIds, geradoEm: new Date().toISOString() };
}

/** Refaz a aula de uma turma (ou de todas, com «*»). Já não se usa a gravar (v20). */
function refrescarAula(turma) {
  var turmas = turma && turma !== '*' ? [turma] : turmasConhecidas();
  turmas.forEach(function (t) {
    try { guardarNaMemoria(chaveAula(t), montarAula(t)); } catch (e) { Logger.log('refrescarAula ' + t + ': ' + e); }
  });
}

function turmasConhecidas() {
  var vistas = {};
  try { ler('ALUNOS', {}).forEach(function (a) { if (a.turmaId) vistas[a.turmaId] = true; }); } catch (e) {}
  return Object.keys(vistas);
}

function guardarMembroNaMemoria(m) {
  try {
    var c = CacheService.getScriptCache();
    c.put('gm_' + m.planoAulaId + '_' + m.alunoId, JSON.stringify(m), MEMORIA_SEGUNDOS);
    // Lista de quem já escolheu grupo nesta aula (não depende da folha ALUNOS).
    var idx = [];
    try { idx = JSON.parse(c.get('gmidx_' + m.planoAulaId) || '[]'); } catch (e) { idx = []; }
    if (idx.indexOf(String(m.alunoId)) < 0) { idx.push(String(m.alunoId)); c.put('gmidx_' + m.planoAulaId, JSON.stringify(idx), MEMORIA_SEGUNDOS); }
  } catch (e) { Logger.log(e); }
}

/** A resposta a «get_aula». */
function respostaAula(turma) {
  if (!turma) return resposta(false, 'Falta a turma');
  var aula = lerDaMemoria(chaveAula(turma));
  if (!aula) {
    // A memória foi limpa: um só refaz; os outros esperam por ele.
    // (v20) Usa um cadeado próprio para isto (o do utilizador), e não o
    // das gravações: montar a aula não faz esperar quem está a gravar.
    var lock = LockService.getDocumentLock() || LockService.getScriptLock();
    if (lock.tryLock(20000)) {
      try {
        aula = lerDaMemoria(chaveAula(turma));
        if (!aula) { aula = montarAula(turma); guardarNaMemoria(chaveAula(turma), aula); }
      } finally { try { lock.releaseLock(); } catch (e) {} }
    } else {
      aula = montarAula(turma);
    }
  }
  // Os grupos, aluno a aluno, da memória.
  var chaves = [], cache = CacheService.getScriptCache();
  var indices = cache.getAll(aula.planos.map(function (p) { return 'gmidx_' + p.id; }));
  aula.planos.forEach(function (p) {
    var ids = {};
    aula.alunosIds.forEach(function (a) { ids[a] = true; });
    try { JSON.parse(indices['gmidx_' + p.id] || '[]').forEach(function (a) { ids[a] = true; }); } catch (e) {}
    Object.keys(ids).forEach(function (a) { chaves.push('gm_' + p.id + '_' + a); });
  });
  var membros = [];
  if (chaves.length) {
    var vals = CacheService.getScriptCache().getAll(chaves);
    for (var k in vals) { try { membros.push(JSON.parse(vals[k])); } catch (e) {} }
  }
  var o = { ok: true, planos: aula.planos, fichas: aula.fichas, sessoes: aula.sessoes,
    grupos: { membros: membros, info: aula.info }, geradoEm: aula.geradoEm };
  // O número de alterações da turma vem junto: o telemóvel deixa de ter
  // de perguntar à parte.
  try { o.contador = String(lerContador(turma) || ''); } catch (e) {}
  try { o.zeroEm = PropertiesService.getScriptProperties().getProperty(PROP_ZERO) || ''; } catch (e) {}
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}


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
