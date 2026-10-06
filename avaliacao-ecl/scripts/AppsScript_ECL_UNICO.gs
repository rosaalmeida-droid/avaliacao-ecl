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

var VERSAO = 'ECL único v26.8';

// ══════════════════════════════════════════════════════════════
// (v26.1) PARA EXECUTAR À MÃO — os primeiros da lista «Executar»,
// por ordem alfabética (Rosa, 5/out/2026: «é muito difícil encontrar»).
// Cada um chama a função de sempre, que continua mais abaixo.
// ══════════════════════════════════════════════════════════════
function EXECUTAR_atualizar1ACR() { atualizar1ACR(); }
function EXECUTAR_atualizar1BCR() { atualizar1BCR(); }
function EXECUTAR_atualizar2ACP() { atualizar2ACP(); }
function EXECUTAR_atualizar3ACP() { atualizar3ACP(); }
function EXECUTAR_atualizarTodasAsTurmas() { atualizarTodasAsTurmas(); }
function EXECUTAR_copiaDeSeguranca() { copiaDeSeguranca(); }
function EXECUTAR_instalarTarefas() { instalarTarefas(); }
function EXECUTAR_verCopias() { verCopias(); }
function EXECUTAR_verFicheiroDasFichas() { verFicheiroDasFichas(); }
function EXECUTAR_verPins() { verPins(); }

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
  AVALIACAO_PARES:    { chave: ['id'], colunas: ['id', 'planoAulaId', 'turmaId', 'grupoId', 'avaliadorId', 'avaliadoId', 'nomeAvaliado', 'colabora', 'ouve', 'flexivel', 'conflito', 'comentario', 'criadoEm'] },
  // (v21.1) As matérias-primas que os professores acrescentam na requisição.
  // Iguais para todos os aparelhos (antes ficavam só no aparelho onde foram criadas).
  MATERIAS_PRIMAS:    { chave: ['id'], colunas: ['id', 'nome', 'categoria', 'unidadeCompra', 'precoKg', 'precoUnitario', 'aliases', 'criadoEm', 'atualizadoEm'] },
  // (v23) A tabela de preços completa da aplicação (base + da escola + revistos), para se ver no Sheets.
  // (v25.1) As notas como a aplicação as calcula (nota de cada aula, média da
  // UC com o peso de cada aula e as faltas a 0, bónus, nota da UC). O separador
  // da turma usa-as, para mostrar o mesmo número que a aplicação.
  NOTAS_APP:          { chave: ['id'], colunas: ['id', 'turmaId', 'alunoId', 'nomeAluno', 'ucId', 'media', 'bonus', 'final', 'faltas', 'porAula', 'atualizadoEm'] },
  // (v25.3) O email da escola de cada aluno, pedido na entrada da aplicação,
  // para os avisos de autoavaliação em falta (Rosa, out/2026).
  EMAILS_PROFESSORES: { chave: ['nome'], colunas: ['nome', 'email', 'atualizadoEm'] },
  EMAILS_ALUNOS:      { chave: ['alunoId'], colunas: ['alunoId', 'turmaId', 'numero', 'nome', 'email', 'atualizadoEm'] },
  // (v25.3) Os avisos por email já enviados (não se repetem).
  AVISOS_EMAIL:       { chave: ['id'], colunas: ['id', 'alunoId', 'planoAulaId', 'email', 'enviadoEm'] },
  TABELA_PRECOS:      { chave: ['id'], colunas: ['id', 'nome', 'categoria', 'unidadeCompra', 'precoKg', 'precoUnitario', 'origem', 'fonte', 'atualizadoEm'] },
  // (v24) Alunos de fora das turmas que vêm recuperar UC. As recuperações
  // deles estão em RECUPERACOES, na «turma» EXTERNOS.
  ALUNOS_EXTERNOS:    { chave: ['id'], colunas: ['id', 'nome', 'numeroProcesso', 'turmaOrigem', 'cursoOrigem', 'anoLetivo', 'contacto', 'observacoes', 'criadoEm', 'atualizadoEm'] }
};

/** Registos especiais que viajam como autoavaliações (v12). */
// (v26.8) Também os registos COLAB|, AJUDA| e ALTAPERF|, como na aplicação:
// não são autoavaliações de aulas e não entram nas folhas de leitura.
var PREFIXOS_ESPECIAIS = ['UCFINAL|', 'TRIAGEM|', 'UCNOTA|', 'COLAB|', 'AJUDA|', 'ALTAPERF|'];
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
    Logger.log('NADA FOI APAGADO. Para começar do zero, crie a propriedade do script');
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
  linha.push(encolherRegisto_(nome, obj));   // registo completo
  return linha;
}

// (v25.4) Uma célula do Sheets leva no máximo 50 000 caracteres. Uma ficha
// com o guião e a ficha formatada passava disso: a gravação falhava toda,
// sem aviso, e o guião ficava só no navegador onde tinha sido feito
// (auditoria de 5/out/2026). Agora os textos compridos vão às partes para
// a folha TEXTOS_LONGOS e no registo fica só a referência; quem lê recebe
// o texto inteiro.
var LIMITE_REGISTO = 45000;
var FOLHA_LONGOS = 'TEXTOS_LONGOS';
var PREFIXO_LONGO = '@@longo:';
var longosEmCache_ = null;

function encolherRegisto_(nome, obj) {
  var json = JSON.stringify(obj);
  if (json.length <= LIMITE_REGISTO) return json;
  var copia = {};
  for (var k in obj) copia[k] = obj[k];
  var ss = ficheiro();
  var f = ss.getSheetByName(FOLHA_LONGOS);
  if (!f) {
    f = ss.insertSheet(FOLHA_LONGOS);
    f.getRange(1, 1, 1, 3).setValues([['referência', 'parte', 'texto']]);
    try { f.hideSheet(); } catch (e) { /* fica à vista */ }
  }
  var campos = Object.keys(copia).filter(function (c) {
    return typeof copia[c] === 'string' && copia[c].length > 1000 && copia[c].indexOf(PREFIXO_LONGO) !== 0;
  }).sort(function (a, b) { return copia[b].length - copia[a].length; });
  for (var i = 0; i < campos.length && JSON.stringify(copia).length > LIMITE_REGISTO; i++) {
    var campo = campos[i], texto = copia[campo];
    var base = nome + '|' + (obj.id || '') + '|' + campo + '|';
    // As partes antigas deste mesmo texto saem (senão a folha crescia sempre).
    if (f.getLastRow() >= 2) {
      var refs = f.getRange(2, 1, f.getLastRow() - 1, 1).getValues();
      for (var r = refs.length - 1; r >= 0; r--) if (String(refs[r][0]).indexOf(base) === 0) f.deleteRow(r + 2);
    }
    var ref = base + new Date().getTime();
    var linhas = [];
    for (var p = 0; p * LIMITE_REGISTO < texto.length; p++) {
      linhas.push([ref, p, '~' + texto.slice(p * LIMITE_REGISTO, (p + 1) * LIMITE_REGISTO)]);
    }
    f.getRange(f.getLastRow() + 1, 1, linhas.length, 3).setValues(linhas);
    copia[campo] = PREFIXO_LONGO + ref;
  }
  longosEmCache_ = null;
  return JSON.stringify(copia);
}

function textosLongos_() {
  if (longosEmCache_) return longosEmCache_;
  var m = {};
  var f = ficheiro().getSheetByName(FOLHA_LONGOS);
  if (f && f.getLastRow() >= 2) {
    f.getRange(2, 1, f.getLastRow() - 1, 3).getValues().forEach(function (l) {
      (m[l[0]] = m[l[0]] || [])[Number(l[1])] = String(l[2]).slice(1);
    });
  }
  longosEmCache_ = m;
  return m;
}

/** O registo completo de uma linha, com os textos compridos já juntos. */
function abrirRegisto_(texto) {
  var obj = {};
  try { obj = JSON.parse(texto || '{}'); } catch (e) { return {}; }
  for (var k in obj) {
    if (typeof obj[k] === 'string' && obj[k].indexOf(PREFIXO_LONGO) === 0) {
      var partes = textosLongos_()[obj[k].slice(PREFIXO_LONGO.length)];
      obj[k] = partes ? partes.join('') : '';
    }
  }
  return obj;
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
    var obj = abrirRegisto_(dados[i][iReg]);
    for (var c = 0; c < colunas.length; c++) {
      if (c === iReg || c === iEl) continue;
      var v = dados[i][c];
      // (v19) O registo completo manda. As colunas à vista só preenchem o
      // que faltar: o Sheets transforma «08:30» numa data de 1899 e
      // «2026-09-25» numa data com fuso — e isso estragava a hora e o dia.
      if (v !== '' && v !== null && v !== undefined && (obj[colunas[c]] === undefined || obj[colunas[c]] === '')) obj[colunas[c]] = valorTexto(v);
    }
    corrigirDatasInglesas_(obj);
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
    try { lock.waitLock(30000); } catch (err) { return resposta(false, 'O arquivo está ocupado. Tente outra vez.'); }
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
  if (x.tipo === 'presenca' || x.tipo === 'selecao') guardarEstadoNaMemoria(obj, x.tipo);
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
    // (v21) As folhas por aluno deixaram de se fazer: está tudo no separador da turma.
    if (x.tipo === 'avaliacao') return;
    else if (x.tipo === 'selecao') {
      if (String(x.planoAulaId || '').indexOf('UCNOTA|') === 0) abrirNotaFinal(x);
      else if (!ehRegistoEspecial(x)) abrirAutoavaliacoes(x);
    }
    else if (x.tipo === 'validacao') abrirNotasDaValidacao(x);
    else if (x.tipo === 'requisicao') abrirLinhasDaRequisicao(x.requisicao || x);
    else if (x.tipo === 'ficha') escreverFichaPorExtenso(x.ficha || x);
  } catch (err) { Logger.log(err); }
}

/** (v26.1) Tira as n primeiras linhas de POR_ARRUMAR. O Google não deixa
 *  apagar TODAS as linhas de uma folha («Não é possível eliminar todas as
 *  linhas na página»): quando são todas, junta-se uma vazia antes. Era por
 *  isto que tratarPendentes e arrumacaoDaNoite falhavam (Rosa, 5/out/2026). */
function tirarDoTopo_(f, n) {
  if (n >= f.getMaxRows()) f.insertRowAfter(f.getMaxRows());
  f.deleteRows(1, n);
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
      tirarDoTopo_(f, n);
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
      tirarDoTopo_(f, n);
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
    if (tipo === 'anular_sessao')        return anularSessao(d);
    if (tipo === 'lider_kf')             return guardar('LIDERES_KF', d);
    if (tipo === 'grupo_membro')         return guardar('GRUPOS', d);
    if (tipo === 'grupo_info')           return guardar('GRUPOS_INFO', d);
    if (tipo === 'avaliacao_par')        return guardar('AVALIACAO_PARES', d);
    if (tipo === 'comanda')              return guardar('COMANDAS', d);

    // Preços da requisição (todos de uma vez)
    if (tipo === 'precos')               return guardarVarios('PRECOS', d.precos || []);
    if (tipo === 'materia_prima')          return guardar('MATERIAS_PRIMAS', d.materiaPrima || d);
    if (tipo === 'tabela_precos')          return guardarVarios('TABELA_PRECOS', d.linhas || []);
    if (tipo === 'notas_app')              return guardarVarios('NOTAS_APP', d.linhas || []);
    if (tipo === 'email_aluno')            return guardar('EMAILS_ALUNOS', d);
    if (tipo === 'aluno_externo')          return guardar('ALUNOS_EXTERNOS', d.alunoExterno || d);
    if (tipo === 'eliminar_aluno_externo') return eliminar('ALUNOS_EXTERNOS', d.id);
    if (tipo === 'eliminar_materia_prima') return eliminar('MATERIAS_PRIMAS', d.id);
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
    if (tipo === 'get_fichas')       return comDados('fichas',       ler('FICHAS',       {}), { eliminados: eliminadosDe('FICHAS') });
    if (tipo === 'buscar_similar')   return comDados('similares',    parecidas(p.nome || ''));
    // (v22) Os PIN só vão para quem entrou como professor ou coordenação.
    if (tipo === 'get_alunos')       return comDados('alunos',       semPinsSemToken(ler('ALUNOS', { turmaId: turma }), p.token), { eliminados: eliminadosDe('ALUNOS') });
    if (tipo === 'entrar')           return respostaDados(entrarPessoal(p.quem, p.codigo));
    if (tipo === 'entrar_aluno')     return respostaDados(entrarAluno(p.alunoId, p.pin));
    if (tipo === 'get_avaliacoes')   return comDados('avaliacoes',   ler('AVALIACOES',   { turmaId: turma }), { eliminados: eliminadosDe('AVALIACOES') });
    if (tipo === 'get_presencas')    return comDados('presencas',    ler('PRESENCAS',    { turmaId: turma }));
    if (tipo === 'get_selecoes')     return comDados('selecoes',     ler('SELECOES',     { turmaId: turma }), { eliminados: eliminadosDe('SELECOES') });
    if (tipo === 'get_validacoes')   return comDados('validacoes',   ler('VALIDACOES',   { turmaId: turma }), { eliminados: eliminadosDe('VALIDACOES') });
    if (tipo === 'get_sessoes')      return comDados('sessoes',      ler('SESSOES',      { turmaId: turma }));
    if (tipo === 'get_aula')         return respostaAula(turma);
    if (tipo === 'get_grupos')       return comDados('membros',      ler('GRUPOS',       { turmaId: turma }), { info: ler('GRUPOS_INFO', { turmaId: turma }) });
    if (tipo === 'get_pares')        return comDados('pares',        ler('AVALIACAO_PARES', { turmaId: turma }));
    if (tipo === 'get_pares_aluno')  return comDados('pares',        paresSobreOAluno_(turma, p.alunoId));
    if (tipo === 'get_lideres_kf')   return comDados('lideres',      ler('LIDERES_KF',   { turmaId: turma }));
    if (tipo === 'recuperacoes')     return comDados('recuperacoes', ler('RECUPERACOES', { turmaId: turma }));
    if (tipo === 'evidencias')       return comDados('evidencias',   ler('EVIDENCIAS',   {}));
    if (tipo === 'get_telemoveis')   return comDados('telemoveis',   telemoveisLigados(turma));
    if (tipo === 'get_pautas')       return comDados('pautas',       ler('PAUTAS', { turmaId: turma }));
    if (tipo === 'get_precos')       return comDados('precos',       ler('PRECOS', {}));
    if (tipo === 'get_materias_primas') return comDados('materiasPrimas', ler('MATERIAS_PRIMAS', {}), { eliminados: eliminadosDe('MATERIAS_PRIMAS') });
    if (tipo === 'get_eventos')      return comDados('eventos',      ler('EVENTOS', {}), { eliminados: eliminadosDe('EVENTOS') });
    if (tipo === 'get_alunos_externos') return comDados('alunosExternos', ler('ALUNOS_EXTERNOS', {}), { eliminados: eliminadosDe('ALUNOS_EXTERNOS') });
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

/** (v26.4) Para o perfil do aluno: o que os colegas disseram dele, sem
 *  nomes. Quem avaliou fica «c0», «c1»… dentro de cada aula. */
function paresSobreOAluno_(turma, alunoId) {
  var porAula = {};
  return ler('AVALIACAO_PARES', { turmaId: turma }).filter(function (r) {
    return alunoId && String(r.avaliadoId) === String(alunoId);
  }).map(function (r) {
    var n = porAula[r.planoAulaId] = (porAula[r.planoAulaId] || 0) + 1;
    return { id: 'anon_' + r.planoAulaId + '_' + n, planoAulaId: r.planoAulaId, turmaId: r.turmaId, avaliadorId: 'c' + n,
      avaliadoId: r.avaliadoId, colabora: Number(r.colabora) || 0, ouve: Number(r.ouve) || 0, flexivel: Number(r.flexivel) || 0,
      conflito: Number(r.conflito) || 0, criadoEm: r.criadoEm };
  });
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

/** (v26.1) A aula foi aberta por engano (Rosa, 5/out/2026: «abri uma aula que
 *  era só para amanhã»): a abertura deixa de valer e as entradas dos alunos
 *  nessa abertura saem (ficam nos ELIMINADOS). Abrir depois volta a valer. */
function anularSessao(d) {
  if (!d.planoAulaId) return resposta(false, 'Falta a aula');
  var r = guardar('SESSOES', {
    planoAulaId: d.planoAulaId, turmaId: d.turmaId || '',
    abertaEm: '', abertaPor: '', fechadaEm: '', fechadaPor: '',
    anuladaEm: d.anuladaEm || new Date().toISOString(), anuladaPor: d.anuladaPor || ''
  });
  try { apagarLinhasPor(ficheiro(), 'PRESENCAS', 'planoAulaId', d.planoAulaId); } catch (e) { Logger.log('anularSessao, presenças: ' + e); }
  return r;
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
  Logger.log('Apague as linhas de teste (turma TESTE) quando quiser.');
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
  Logger.log('Agora corre  atualizarFolhasDasTurmas  para refazer os separadores das turmas.');
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
  // (v24.3) Já não se usa: as folhas de cada aluno («1_Nome…») estão
  // resumidas no separador de cada turma. Fazê-las outra vez só enchia o
  // ficheiro de folhas repetidas (Rosa, out/2026: «porque tenho estes alunos?»).
  Logger.log('Já não é preciso: cada aluno está no separador da turma dele. '
    + 'Para retirar as folhas antigas de cada aluno, execute  apagarFolhasAntigas  (faça antes uma cópia de segurança).');
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
    // (v25.3) A data à portuguesa e o plano pelo nome, não pelo código.
    ['Data:', diaPT(f.data)],
    ['Plano de aula:', descricaoDoPlanoDaFicha(f.planoAulaId)]
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
  try { atualizarFolhasDasTurmas(); } catch (e) { Logger.log(e); }
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
        subject: '[Avaliação ECL] Pauta ' + (d.ucId || '') + ' — ' + (d.turmaId || ''),
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
    if (fn === 'arrumar' || fn === 'tratarPendentes' || fn === 'atualizarFolhasDasTurmas') ScriptApp.deleteTrigger(t);
  });
  var tem = function (fn) { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === fn; }); };
  if (!tem('tratarPendentes')) ScriptApp.newTrigger('tratarPendentes').timeBased().everyMinutes(5).create();
  // (v26.3) De minuto a minuto: só faz alguma coisa quando há novidades numa
  // turma (ou uma volta de meia em meia hora); sem novidades, acaba logo.
  if (!tem('atualizarFolhasDasTurmas')) ScriptApp.newTrigger('atualizarFolhasDasTurmas').timeBased().everyMinutes(1).create();
  if (!tem('arrumacaoDaNoite')) ScriptApp.newTrigger('arrumacaoDaNoite').timeBased().atHour(2).everyDays(1).create();
  // (v26.6) O fecho das aulas por email ao professor, às 18h (com os avisos aos alunos).
  if (!tem('avisarAutoavaliacoesEmFalta')) ScriptApp.newTrigger('avisarAutoavaliacoesEmFalta').timeBased().everyDays(1).atHour(18).inTimezone('Europe/Lisbon').create();
  criarCopiaAutomatica();
  atualizarFolhasDasTurmas();
  Logger.log('Tarefas: por arrumar logo a seguir a cada envio (e de 5 em 5 min), separadores das turmas de 10 em 10 min, arrumação às 2h, cópia às 3h.');
}

/** (compatibilidade) A versão anterior chamava isto no arranque. */
function criarArrumacaoAutomatica() { instalarTarefas(); }


// ══════════════════════════════════════════════════════════════
// (v21) UM SEPARADOR POR TURMA — o que se abre para ler
// ══════════════════════════════════════════════════════════════
// As folhas de dados são para a aplicação: as turmas misturadas, códigos
// em vez de nomes. Eram dezenas de separadores à vista, mais um por aluno
// e um por ficha (Rosa, out/2026: «o Sheets continua uma confusão»).
//
// Agora, à vista, fica um separador por turma, com o nome da turma
// («1º BCR», «3º ACP»…), e o LEIA-ME e o PROCURAR. Em cada turma, de
// cima para baixo:
//   1. OS ALUNOS — presenças, faltas, atrasos, autoavaliações, validadas,
//      média das aulas e se têm o telemóvel ligado;
//   2. AS NOTAS DE CADA UC — um aluno por linha, uma aula por coluna;
//   3. AS AULAS — dia, horas, UC, tipo, estado e quantos vieram.
// É refeito pelo script de 10 em 10 minutos, com nomes e não códigos.
// Não se escreve nele (o que lá se escrever perde-se).
//
// As folhas de dados ficam escondidas, não apagadas: a aplicação continua
// a gravar nelas. Para as ver: menu Ver › Folhas ocultas (ou o ícone ☰
// em baixo, à esquerda).

var COR_TURMA = '#7B2233';
/** (v25.11) As turmas que existem este ano letivo. Só estas têm folhas. O
 *  1.º ACP já não existe (Rosa, 5/out/2026): os alunos antigos ficam nos
 *  dados, mas não têm folha. No ano que vem, muda-se esta lista. */
var TURMAS_DO_ANO = ['1º BCR', '1º ACR', '2º ACP', '3º ACP'];
/** (v25.12) Os planos de aula de antes disto são testes (junho a agosto): não entram nas folhas das turmas. */
var INICIO_ANO_LETIVO = '2026-09-01';
// (v26.1) Os dias da semana com aulas de cozinha de cada turma (o mesmo
// horário da aplicação, horarios.ts): 0 = domingo … 6 = sábado. Um plano
// de aula noutro dia não conta (Rosa, 5/out/2026: «uma aula do dia 24, que
// os alunos não tiveram e nunca vão ter numa quinta-feira»), a não ser que o
// professor tenha confirmado na aplicação que houve aula nesse dia.
var DIAS_DE_AULA = { '1º BCR': [2], '1º ACR': [4], '2º ACP': [3], '3º ACP': [1, 4, 5] };
var INICIO_DAS_AULAS = '2026-09-21';
function planoNumDiaSemAulas_(p) {
  if (!p || p.tipoEvento) return false;
  var dias = DIAS_DE_AULA[p.turmaId];
  var dia = String(p.data || '').slice(0, 10);
  if (!dias || !/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia < INICIO_DAS_AULAS) return false;
  if (p.diaSemAulasOk === dia) return false;
  return dias.indexOf(new Date(dia + 'T12:00:00Z').getUTCDay()) < 0;
}
/** Os alunos de ensaio (88, 99, «TESTE») não entram nas folhas das turmas. */
function alunoDeEnsaio_(a) { return Number(a.numero) === 88 || Number(a.numero) === 99 || /teste|ensaio/i.test(String(a.nome || '')); }
// (v21.1) As matérias-primas e os preços ficam à vista: escondê-los fez
// parecer que a base das 250 matérias-primas se tinha perdido (Rosa, out/2026).
var VISIVEIS_SEMPRE = ['FICHAS TÉCNICAS', 'REQUISIÇÕES (todas)', 'RECUPERAÇÕES (todas)', 'EXTERNOS (recuperações)', 'ALUNOS_EXTERNOS', 'TABELA_PRECOS', 'PRECOS', 'MATERIAS_PRIMAS', 'PRECOS_A_REVER', 'AUDITORIA', 'VERIFICAR_ALUNOS', 'LEIA-ME', 'PROCURAR'];

function porTurma(lista) {
  var m = {};
  lista.forEach(function (x) { var t = String(x.turmaId || ''); if (!t) return; (m[t] = m[t] || []).push(x); });
  return m;
}

/** (v26.1) Datas e horas escritas à inglesa por um telemóvel ou computador
 *  («Sat Sep 05 2026 00:00:00 GMT+0100 (…)» ou, numa hora, «Sat Dec 30 1899
 *  08:30:00 …») voltam a ser «2026-09-05» e «08:30». Vale para todas as folhas. */
var MESES_EN_ = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
var DATA_EN_ = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{2}) (\d{4}) (\d{2}):(\d{2}):\d{2} GMT/;
function semDataInglesa_(v) {
  if (typeof v !== 'string') return v;
  var m = DATA_EN_.exec(v);
  if (!m) return v;
  if (m[4] === '1899') return m[5] + ':' + m[6];
  return m[4] + '-' + MESES_EN_[m[2]] + '-' + m[3];
}
function corrigirDatasInglesas_(obj) {
  for (var k in obj) if (typeof obj[k] === 'string' && obj[k].length > 20 && obj[k].charAt(3) === ' ') obj[k] = semDataInglesa_(obj[k]);
  return obj;
}

/** (v26.1) O dia em AAAA-MM-DD, venha como vier (texto, data ou «Mon Sep 21 2026 …»). */
function diaISO_(v) {
  if (v === null || v === undefined || v === '') return '';
  var t = String(v);
  // Como na aplicação: se começa por AAAA-MM-DD, é esse o dia.
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  var d = v instanceof Date ? v : new Date(t);
  if (isNaN(d.getTime())) return t;
  return Utilities.formatDate(d, 'Europe/Lisbon', 'yyyy-MM-dd');
}

/** (v26.5) Atividade obrigatória para a turma fora das horas da aula (depois
 *  das aulas, sábado, férias): conta como mais uma aula, na aula desse dia ou na
 *  seguinte da mesma UC; quem não se autoavaliou conta 0 (Rosa, 6/out/2026).
 *  Igual à aplicação. Os convidados e os concursos são só bónus. */
function transpostaDe_(p, planos) {
  var r = aulaQueRecebe_(p, planos);
  return r ? 'Avaliação transposta para a aula de ' + diaCurto(r.data) + '.' : 'Avaliação transposta para a aula seguinte da disciplina.';
}
function atvContaComoAula_(p, planos) {
  if (!p || !p.tipoEvento || p.tipoEvento === 'concurso' || p.modoParticipacao === 'inscricao' || p.estado === 'arquivado' || p.eliminado || p.aulaLigada) return false;
  var dia = String(p.data || '').slice(0, 10);
  var min = function (h) { var x = String(h || '').split(':'); var a = Number(x[0]); return isNaN(a) || x[0] === '' ? NaN : a * 60 + (Number(x[1]) || 0); };
  var i1 = min(horaDe(p.horaInicio)), f1 = min(horaDe(p.horaFim));
  if (isNaN(i1) || isNaN(f1)) return true;
  return !planos.some(function (q) { return q.id !== p.id && !q.tipoEvento && q.turmaId === p.turmaId && q.estado !== 'arquivado' && !q.eliminado && String(q.data || '').slice(0, 10) === dia
    && i1 < min(horaDe(q.horaFim)) && min(horaDe(q.horaInicio)) < f1; });
}
function aulaQueRecebe_(p, planos) {
  var dia = String(p.data || '').slice(0, 10);
  return planos.filter(function (q) { return !q.tipoEvento && q.turmaId === p.turmaId && q.estado !== 'arquivado' && !q.eliminado && p.ucId && q.ucId === p.ucId && String(q.data || '').slice(0, 10) >= dia; })
    .sort(function (a, b) { return (String(a.data).slice(0, 10) + ' ' + (a.horaInicio || '')).localeCompare(String(b.data).slice(0, 10) + ' ' + (b.horaInicio || '')); })[0] || null;
}

function diaCurto(s) {
  var t = String(s || '').slice(0, 10);
  var p = t.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] : t;
}

function horaDe(s) {
  var t = String(s || '');
  var m = t.match(/(\d{1,2}):(\d{2})/);
  return m ? (m[1].length === 1 ? '0' + m[1] : m[1]) + ':' + m[2] : '';
}

/** Número com vírgula (14,5), como em Portugal. */
function virgula(n) { return n === '' || n === undefined ? '' : String(n).replace('.', ','); }

var NOME_TIPO_AULA = { pratico: 'Prática', teorico: 'Teórica', misto: 'Mista', atitudinal: 'Atitudinal', atitudinal_obr: 'Atitudinal', evento: 'Evento' };
var NOME_ESTADO = { publicado: 'Publicado', rascunho: 'Rascunho', arquivado: 'Arquivado' };

/** O tipo de aula como se lê: o da triagem («Como é a aula»), e as atividades extra à parte. */
function tipoParaLer(p) {
  var t = (p.triagemAula && p.triagemAula.tipo) || p.tipoPlanAula || '';
  var nome = NOME_TIPO_AULA[t] || t;
  return p.tipoEvento ? (p.tipoEvento !== 'concurso' && p.modoParticipacao !== 'inscricao' ? 'Atividade obrigatória (turma toda)' : 'Atividade extra') + (nome ? ' (' + nome.toLowerCase() + ')' : '') : nome;
}

/** «03/10/2026 09:06», na hora de Lisboa. */
function criadoParaLer(s) {
  if (!s) return '';
  var d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : Utilities.formatDate(d, 'Europe/Lisbon', 'dd/MM/yyyy HH:mm');
}

function agoraLisboa() {
  return Utilities.formatDate(new Date(), 'Europe/Lisbon', 'dd/MM/yyyy HH:mm');
}

/** O nome do separador de uma turma (o Sheets não aceita alguns sinais). */
function nomeDoSeparador(turma) {
  return String(turma).replace(/[\[\]\*\?\/\\:]/g, ' ').trim().substring(0, 90) || 'Turma';
}

/** (v26) Corre sozinho de 10 em 10 minutos: UMA turma de cada vez (cada
 *  execução fica curta e não passa dos 6 minutos do Google). */
function atualizarFolhasDasTurmas() {
  var props = PropertiesService.getScriptProperties();
  // (v26.1) Primeiro a turma onde houve novidades desde a última vez (uma
  // aula publicada, uma autoavaliação…), a que espera há mais tempo. Antes
  // ia sempre pela ordem e uma aula nova podia levar horas a aparecer
  // (Rosa, 5/out/2026: «mandei uma aula e há uma hora não aparece»).
  var feitas = {};
  try { feitas = JSON.parse(props.getProperty('FOLHAS_FEITAS') || '{}'); } catch (e) {}
  var c = contadores();
  var comNovidades = TURMAS_DO_ANO.filter(function (t) { return Number(c[t] || 0) > Number(feitas[t] || 0); })
    .sort(function (a, b) { return Number(feitas[a] || 0) - Number(feitas[b] || 0); });
  var i = Number(props.getProperty('PROXIMA_TURMA') || 0) || 0;
  var turma, comGerais;
  if (comNovidades.length) { turma = comNovidades[0]; comGerais = false; }
  else {
    // (v26.3) Sem novidades em lado nenhum: só a volta pela ordem, e só se a
    // turma seguinte não é refeita há mais de meia hora (as datas mudam: uma
    // aula passa a «dada»). Assim corre de minuto a minuto sem gastar o
    // tempo diário do Google (Rosa, 6/out/2026: «os grupos levaram 20 minutos»).
    var seguinte = TURMAS_DO_ANO[i % TURMAS_DO_ANO.length];
    if (new Date().getTime() - Number(feitas[seguinte] || 0) < 30 * 60 * 1000) return;
    turma = TURMAS_DO_ANO[i % TURMAS_DO_ANO.length];
    comGerais = i % TURMAS_DO_ANO.length === 0;
    props.setProperty('PROXIMA_TURMA', String((i + 1) % TURMAS_DO_ANO.length));
  }
  var inicio = new Date().getTime();
  if (!atualizarTurmas_([turma], comGerais)) return;
  feitas[turma] = inicio;
  props.setProperty('FOLHAS_FEITAS', JSON.stringify(feitas));
}
/** Para correr à mão: uma turma já. */
function atualizar1BCR() { atualizarTurmas_(['1º BCR'], true); }
function atualizar1ACR() { atualizarTurmas_(['1º ACR'], true); }
function atualizar2ACP() { atualizarTurmas_(['2º ACP'], true); }
function atualizar3ACP() { atualizarTurmas_(['3º ACP'], true); }
/** Todas as turmas de uma vez (pode passar dos 6 minutos: só se for preciso). */
function atualizarTodasAsTurmas() { atualizarTurmas_(TURMAS_DO_ANO.slice(), true); }

/** (v26.1) Só uma atualização das folhas de cada vez. Duas ao mesmo tempo
 *  (a automática e uma à mão) apagavam e escreviam as mesmas folhas, e uma
 *  delas falhava: «Sheet … not found» (Rosa, 5/out/2026). A segunda espera
 *  pela vez seguinte. Devolve false quando não correu. */
function atualizarTurmas_(quais, comGerais) {
  var props = PropertiesService.getScriptProperties();
  var desde = Number(props.getProperty('FOLHAS_A_DECORRER') || 0);
  if (desde && new Date().getTime() - desde < 7 * 60 * 1000) {
    Logger.log('Já está a decorrer outra atualização das folhas (começou às '
      + Utilities.formatDate(new Date(desde), 'Europe/Lisbon', 'HH:mm') + '). Esta fica para a vez seguinte.');
    return false;
  }
  props.setProperty('FOLHAS_A_DECORRER', String(new Date().getTime()));
  try { atualizarTurmasJa_(quais, comGerais); }
  finally { props.deleteProperty('FOLHAS_A_DECORRER'); }
  return true;
}

function atualizarTurmasJa_(quais, comGerais) {
  var ss = ficheiro();
  var hoje = hojeLisboa(0);
  // Cada folha lê-se uma vez para todas as turmas.
  var alunos = porTurma(ler('ALUNOS', {}));
  // (v26.1) Há planos com o dia escrito à inglesa («Mon Sep 21 2026 00:00:00
  // GMT+0100 …») e o script tomava-os por aulas dos próximos dias.
  var planos = porTurma(ler('PLANOS', {}).map(function (p) { p.data = diaISO_(p.data); return p; }));
  var sessoes = porTurma(ler('SESSOES', {}));
  var presencas = porTurma(ler('PRESENCAS', {}));
  var selecoes = porTurma(ler('SELECOES', {}).filter(function (s) { return !ehRegistoEspecial(s); }));
  var validacoes = porTurma(ler('VALIDACOES', {}));
  var finais = porTurma(ler('NOTAS_FINAIS', {}));
  var telemoveis = porTurma(telemoveisLigados(''));
  var todasRecup = ler('RECUPERACOES', {});
  var recuperacoes = porTurma(todasRecup);
  var todosPlanos = [].concat.apply([], Object.keys(planos).map(function (t) { return planos[t]; }));
  var porIdPlano = {}; todosPlanos.forEach(function (p) { porIdPlano[p.id] = p; });
  // (v25) Grupos, colegas e líderes KF entram no separador da turma.
  var lerOuNada = function (n) { try { return ler(n, {}); } catch (e) { return []; } };
  var grupos = porTurma(lerOuNada('GRUPOS')), gruposInfo = porTurma(lerOuNada('GRUPOS_INFO'));
  var pares = porTurma(lerOuNada('AVALIACAO_PARES')), lideres = porTurma(lerOuNada('LIDERES_KF'));
  var notasApp = porTurma(lerOuNada('NOTAS_APP'));
  // (v26.1) O email da escola de cada aluno (o que ele escreveu ao entrar).
  var emailDe = {};
  lerOuNada('EMAILS_ALUNOS').forEach(function (e) { if (e.alunoId && e.email) emailDe[e.alunoId] = String(e.email).trim(); });
  var fichasTodas = lerOuNada('FICHAS');
  var nomesComp = nomesDasCompetenciasDasFichas(fichasTodas);
  var nomeFicha = {}; fichasTodas.forEach(function (f) { nomeFicha[f.id] = f.nomePrato || ''; });

  var turmas = Object.keys(alunos).filter(function (t) { return TURMAS_DO_ANO.indexOf(t) >= 0 && quais.indexOf(t) >= 0; }).sort();
  // As folhas de turmas que já não existem (o 1.º ACP) saem. Os dados ficam.
  ss.getSheets().forEach(function (fo) {
    var n; try { n = fo.getName(); } catch (e) { return; }   // já saiu
    Object.keys(alunos).forEach(function (t) {
      if (TURMAS_DO_ANO.indexOf(t) >= 0) return;
      var b = nomeDoSeparador(t);
      if (n === b || n.indexOf(b + ' · ') === 0) { try { ss.deleteSheet(fo); Logger.log('Saiu a folha antiga: ' + n); } catch (e) {} }
    });
  });
  var nomesFolhas = [];
  turmas.forEach(function (turma) {
    try {
      var feitas = comNovaTentativa_(function () { return escreverSeparadorDaTurma(ss, turma, {
        alunos: alunos[turma] || [], planos: planos[turma] || [], sessoes: sessoes[turma] || [],
        presencas: presencas[turma] || [], selecoes: selecoes[turma] || [], validacoes: validacoes[turma] || [],
        finais: finais[turma] || [], telemoveis: telemoveis[turma] || [],
        recuperacoes: recuperacoes[turma] || [], planoPorId: porIdPlano,
        grupos: grupos[turma] || [], gruposInfo: gruposInfo[turma] || [], pares: pares[turma] || [], lideres: lideres[turma] || [],
        nomesComp: nomesComp, nomeFicha: nomeFicha, notasApp: notasApp[turma] || [], emailDe: emailDe
      }, hoje); }, 'Turma ' + turma);
      SpreadsheetApp.flush();
      nomesFolhas = nomesFolhas.concat(feitas || [nomeDoSeparador(turma)]);
    } catch (e) { Logger.log('Turma ' + turma + ': ' + e); nomesFolhas.push(nomeDoSeparador(turma)); }
  });
  if (comGerais) try { escreverFolhasGerais(ss, { planos: todosPlanos, recuperacoes: todasRecup }); } catch (e) { Logger.log('Folhas gerais: ' + e); }
  // A ordem: as folhas de todas as turmas deste ano, mesmo as que não se refizeram agora.
  var todasDasTurmas = [];
  TURMAS_DO_ANO.forEach(function (t) {
    var b = nomeDoSeparador(t);
    ss.getSheets().forEach(function (fo) { var n = fo.getName(); if (n === b) todasDasTurmas.push(n); });
    ss.getSheets().forEach(function (fo) { var n = fo.getName(); if (n.indexOf(b + ' · ') === 0) todasDasTurmas.push(n); });
  });
  try { comNovaTentativa_(function () { arrumarSeparadores(ss, todasDasTurmas); }, 'Arrumar'); } catch (e) { Logger.log('Arrumar os separadores: ' + e); }
  Logger.log('Feito: ' + turmas.join(', '));
}

/** (v25) Os nomes das técnicas, a partir das fichas («SUB-010 Bater claras»,
 *  «SUB-COR-030-011 — Gomos | …»). As autoavaliações novas trazem os nomes. */
function nomesDasCompetenciasDasFichas(fichas) {
  var m = {};
  (fichas || []).forEach(function (f) {
    (Array.isArray(f.tecnicasSugeridas) ? f.tecnicasSugeridas : []).forEach(function (t) {
      var r = String(t || '').match(/^([A-Z]{3}-[A-Z0-9-]+)\s*(?:—|–|-)?\s*([^|]*)/);
      if (r && r[2] && !m[r[1]]) m[r[1]] = r[2].trim();
    });
  });
  return m;
}

var NIVEL_PARA_LER = { nf: 'Não fiz', tp: 'Tentei, ainda não sei bem', ca: 'Fiz com ajuda', fs: 'Fiz sozinho/a', mbr: 'Fiz sozinho/a e ficou muito bem',
  nao: 'Ainda não', ajuda: 'Com ajuda', sozinho: 'Sozinho/a', autonomia: 'Com autonomia', nao_atingi: 'Não atingi', desenvolvimento: 'Em desenvolvimento',
  atingi: 'Atingi', superei: 'Superei', nop: 'Não teve oportunidade', outra: 'Fez outra tarefa', evento: 'Técnica no evento' };

/** O mais recente de cada chave (os registos rápidos podem vir repetidos). */
/** (v25.5) A presença que conta de cada aluno em cada aula. Quando há mais do
 *  que um registo (telemóvel do aluno e professor), manda a decisão do
 *  professor mais recente; só sem decisão conta o registo mais recente.
 *  Antes, uma parte da folha via «F» e outra «Presente» (Afonso, 5/out/2026). */
function presencaQueConta_(lista) {
  var m = {};
  (lista || []).forEach(function (x) {
    var k = x.alunoId + '|' + x.planoAulaId; if (!x.alunoId || !x.planoAulaId) return;
    var y = m[k]; if (!y) { m[k] = x; return; }
    var dx = !!x.decisaoProfessor, dy = !!y.decisaoProfessor;
    if (dx !== dy) { if (dx) m[k] = x; return; }
    var qx = String((dx ? x.decididoEm : '') || x.horaEntrada || x.data || '');
    var qy = String((dy ? y.decididoEm : '') || y.horaEntrada || y.data || '');
    if (qx >= qy) m[k] = x;
  });
  return m;
}

function ultimoPor(lista, chaveDe, quandoDe) {
  var m = {};
  (lista || []).forEach(function (x) { var k = chaveDe(x); if (!k) return; if (!m[k] || String(quandoDe(x) || '') >= String(quandoDe(m[k]) || '')) m[k] = x; });
  return m;
}

/** (v25) GRUPOS E COLEGAS: em cada aula com grupos, quem esteve em que grupo,
 *  o líder do KitchenFlow e o que os colegas disseram de cada um. */
function seccaoGruposEColegas(d, aulas, alunos, junta, titulo, cabecalho, vazia, formatos, linhas) {
  var porIdAluno = {}; d.alunos.forEach(function (a) { porIdAluno[a.id] = a; });
  var nomeAl = function (id, alt) { var a = porIdAluno[id]; return a ? (a.nome || ('nº ' + a.numero)) : (alt || id); };
  var membro = ultimoPor(d.grupos, function (g) { return g.planoAulaId + '|' + g.alunoId; }, function (g) { return g.atualizadoEm; });
  var info = ultimoPor(d.gruposInfo, function (g) { return g.planoAulaId + '|' + g.id; }, function (g) { return g.atualizadoEm; });
  var lider = ultimoPor(d.lideres, function (l) { return l.planoAulaId + '|' + l.grupoId; }, function (l) { return l.definidoEm; });
  // Os alunos de teste (nº 99 e 88) não entram na avaliação dos colegas verdadeiros.
  var teste = function (id) { var a = porIdAluno[id]; if (!a) return false; var n = Number(a.numero); return n === 99 || n === 88 || n === 9999 || /\bteste\b/i.test(String(a.nome || '')); };
  var par = ultimoPor(d.pares.filter(function (p) { return teste(p.avaliadorId) === teste(p.avaliadoId); }), function (p) { return p.id; }, function (p) { return p.criadoEm; });
  var palavra = function (v) { return v >= 2.5 ? 'muito' : v >= 1.75 ? 'às vezes' : 'pouco'; };
  var comGrupos = aulas.filter(function (p) { return p.estado !== 'arquivado'; }).slice().reverse().filter(function (p) {
    return Object.keys(membro).some(function (k) { return k.indexOf(p.id + '|') === 0 && membro[k].grupoId; });
  });
  titulo('GRUPOS E COLEGAS (' + comGrupos.length + ' aula' + (comGrupos.length === 1 ? '' : 's') + ' com grupos)', '#B5651D');
  junta(['Em cada grupo: os alunos (★ = líder do KitchenFlow), a ficha, se o professor validou, e o que os colegas disseram de cada um. Só o professor vê; não conta para a nota.']);
  formatos.push({ tipo: 'legenda', linha: linhas.length });
  if (!comGrupos.length) { junta(['Ainda não houve aulas com grupos.']); vazia(); return; }
  cabecalho(['Dia', 'Aula', 'Grupo', 'Alunos', 'Ficha', 'Validado', 'O que os colegas disseram']);
  var ini = linhas.length + 1;
  comGrupos.forEach(function (p) {
    var porGrupo = {};
    Object.keys(membro).forEach(function (k) {
      var m = membro[k];
      if (k.indexOf(p.id + '|') !== 0 || !m.grupoId) return;
      (porGrupo[m.grupoId] = porGrupo[m.grupoId] || { nome: m.grupoNome || m.grupoId, membros: [] }).membros.push(m);
    });
    Object.keys(porGrupo).forEach(function (gid) {
      var g = porGrupo[gid], gi = info[p.id + '|' + gid] || {}, li = lider[p.id + '|' + gid];
      var nomes = g.membros.map(function (m) { return (li && li.alunoId === m.alunoId ? '★ ' : '') + nomeAl(m.alunoId, m.nomeAluno) + (teste(m.alunoId) ? ' (aluno de teste)' : ''); });
      var disseram = g.membros.map(function (m) {
        var sobre = Object.keys(par).map(function (k) { return par[k]; })
          .filter(function (x) { return x.planoAulaId === p.id && x.avaliadoId === m.alunoId; });
        if (!sobre.length) return nomeAl(m.alunoId, m.nomeAluno) + ': ainda ninguém disse nada';
        var med = function (c) { return sobre.reduce(function (s, x) { return s + (Number(x[c]) || 0); }, 0) / sobre.length; };
        var coments = sobre.map(function (x) { return String(x.comentario || '').trim(); }).filter(Boolean);
        return nomeAl(m.alunoId, m.nomeAluno) + ' (' + sobre.length + ' colega' + (sobre.length === 1 ? '' : 's') + '): colabora ' + palavra(med('colabora'))
          + ' · ouve ' + palavra(med('ouve')) + ' · flexível ' + palavra(med('flexivel')) + ' · conflito ' + palavra(med('conflito'))
          + (coments.length ? ' · «' + coments.join('» «') + '»' : '');
      });
      junta([diaCurto(p.data) + '/' + String(p.data).slice(0, 4), p.titulo || '', g.nome, nomes.join('\n'),
        gi.fichaId ? (d.nomeFicha[gi.fichaId] || gi.fichaId) : 'todas as fichas do plano',
        gi.validado === true || gi.validado === 'true' ? 'Sim' : 'Não', disseram.join('\n')]);
    });
  });
  formatos.push({ tipo: 'wrap', linha: ini, ate: linhas.length, n: 7 });
  vazia();
}

/** (v25) O QUE CHEGOU A CADA ALUNO: nas últimas aulas, o que cada aluno
 *  respondeu (e as respostas às perguntas), a nota que o professor validou e
 *  os casos à parte (faltou, farda, atividade, versão antiga do plano…). */
function seccaoOQueChegouACadaAluno(d, aulas, alunos, junta, titulo, cabecalho, vazia, formatos, linhas) {
  // (v25.3) Atrasos que contam: declarados, ou entradas fora da tolerância
  // nas aulas abertas no próprio dia e em que os atrasos contam.
  var sessaoDe = {}; (d.sessoes || []).forEach(function (s) { sessaoDe[s.planoAulaId] = s; });
  var atrasoContaAqui = function (x, p) {
    var dec = x ? (x.decisaoProfessor || '') : '';
    if (dec === 'falta_atraso') return true;
    if (!x || dec || !(x.atrasado === true || x.atrasado === 'true')) return false;
    var s = sessaoDe[p.id];
    if (!s || !s.abertaEm || Number(s.toleranciaMin) >= 1440) return false;
    return Utilities.formatDate(new Date(s.abertaEm), 'Europe/Lisbon', 'yyyy-MM-dd') <= String(p.data || '').slice(0, 10);
  };
  var ultimas = aulas.filter(function (p) { return p.estado !== 'arquivado'; }).reverse();   // (v25.7) todas, numa folha sua
  titulo('O QUE CHEGOU A CADA ALUNO (' + ultimas.length + ' aula' + (ultimas.length === 1 ? '' : 's') + ' e atividades)', '#6B4C9A');
  junta(['Para cada aluno: o que respondeu no telemóvel (e como), as respostas às perguntas, a nota que o professor validou (é a que o aluno vê) e os casos à parte.']);
  formatos.push({ tipo: 'legenda', linha: linhas.length });
  if (!ultimas.length) { vazia(); return; }
  var sel = ultimoPor(d.selecoes, function (s) { return s.alunoId + '|' + s.planoAulaId; }, function (s) { return s.criadaEm; });
  var val = ultimoPor(d.validacoes, function (v) { return v.alunoId + '|' + v.planoAulaId; }, function (v) { return v.validadoEm; });
  var pres = presencaQueConta_(d.presencas);
  var ini = linhas.length + 1;
  ultimas.forEach(function (p) {
    // (v25.6) Cada aula com o seu título e o seu cabeçalho, para o índice
    // levar lá diretamente.
    titulo('Aula de ' + diaCurto(p.data) + '/' + String(p.data).slice(0, 4) + (p.titulo ? ' — ' + p.titulo : ''), '#8E7CB8', 1);
    cabecalho(['Dia', 'Aula', 'Nº', 'Nome', 'Presença', 'O que respondeu', 'Respostas às perguntas', 'Nota do professor', 'Nota da aula (0-20)', 'Casos à parte']);
    var quem = p.tipoEvento && Array.isArray(p.participantesIds) && p.participantesIds.length
      ? alunos.filter(function (a) { return p.participantesIds.indexOf(a.id) >= 0; }) : alunos;
    quem.forEach(function (a) {
      var k = a.id + '|' + p.id, s = sel[k], v = val[k], x = pres[k];
      var nomes = (s && s.nomes) || {};
      var nomeC = function (id) { return nomes[id] || d.nomesComp[id] || id; };
      var auto = s && Array.isArray(s.autoavaliacoes) ? s.autoavaliacoes : [];
      var respondeu = auto.map(function (q) { return nomeC(q.competenciaId) + ': ' + (NIVEL_PARA_LER[q.nivel] || q.nivel || '') + (q.texto ? ' («' + q.texto + '»)' : ''); });
      var respostas = [];
      auto.forEach(function (q) {
        (Array.isArray(q.respostas) ? q.respostas : []).forEach(function (r) { if (r && r.pergunta) respostas.push(r.pergunta + ' → ' + (r.resposta || '')); });
        if (q.exemplo) respostas.push(nomeC(q.competenciaId) + ' — exemplo: «' + q.exemplo + '»');
        if (q.comentario) respostas.push(nomeC(q.competenciaId) + ' — comentário: «' + q.comentario + '»');
      });
      var notasProf = v && Array.isArray(v.notas) ? v.notas.map(function (n) { return nomeC(n.competenciaId) + ': ' + virgula(n.nota); }) : [];
      var casos = [];
      // (v25.3) Faltas e atrasos: conta o que o professor declarou.
      var decX = x ? (x.decisaoProfessor || '') : '';
      var sX = sessaoDe[p.id];
      var tardiaX = !!(sX && sX.abertaEm) && Utilities.formatDate(new Date(sX.abertaEm), 'Europe/Lisbon', 'yyyy-MM-dd') > String(p.data || '').slice(0, 10);
      var faltouX = !!x && (decX === 'falta_presenca' || (!decX && (x.presente === false || x.presente === 'false') && !tardiaX));
      if (faltouX) casos.push('Faltou');
      if (atrasoContaAqui(x, p)) casos.push(decX === 'falta_atraso' ? 'Falta de atraso (declarada pelo professor)' : 'Chegou atrasado' + (x.atrasadoMins ? ' (' + x.atrasadoMins + ' min)' : ''));
      if (x && (x.fardamentoOk === false || x.fardamentoOk === 'false')) casos.push('Farda incompleta (respondeu também sobre a farda)');
      if (p.tipoEvento) casos.push(atvContaComoAula_(p, d.planos) ? 'Atividade obrigatória fora das horas da aula: conta como mais uma aula. ' + transpostaDe_(p, d.planos) : 'Atividade extra: conta como bónus');
      if (s && p.pedirDeNovoEm && s.versaoPlano && String(s.versaoPlano) < String(p.pedirDeNovoEm)) casos.push('Respondeu à versão antiga do plano');
      auto.forEach(function (q) { if (q.nivel === 'nop') casos.push('Sem oportunidade: ' + nomeC(q.competenciaId)); });
      if (v && v.semFarda) casos.push('Sem farda: as técnicas contam 0 na nota da aula');
      if (v && v.faltouVerdade) casos.push('O professor marcou que faltou');
      if (v && Array.isArray(v.naoReparou) && v.naoReparou.length) casos.push('O professor não reparou em: ' + v.naoReparou.map(nomeC).join(', '));
      if (v && (v.comentarioGeral || v.comentario)) casos.push('Comentário do professor: «' + (v.comentarioGeral || v.comentario) + '»');
      if (s && !v) casos.push('Por validar');
      // (v26.5) Numa atividade não há «conta 0»: sem resposta, não conta para ele.
      if (!s && !faltouX) casos.push(p.tipoEvento && !atvContaComoAula_(p, d.planos) ? 'Não respondeu: esta atividade não conta para ele' : 'Não respondeu: conta 0 na nota da UC até se autoavaliar');
      var presenca = !x ? '' : faltouX ? 'Faltou' : atrasoContaAqui(x, p) ? 'Atrasado' : 'Presente';
      var n20 = v ? Number(String(v.notaMedia20 === undefined ? '' : v.notaMedia20).replace(',', '.')) : NaN;
      junta([diaCurto(p.data) + '/' + String(p.data).slice(0, 4), p.titulo || '', a.numero || '', a.nome || '', presenca,
        respondeu.join('\n'), respostas.join('\n'), notasProf.join('\n'), isNaN(n20) ? '' : virgula(Math.round(n20 * 10) / 10), casos.join('\n')]);
      // (v25.12) A mesma linha vai para a ficha do aluno.
      if (d.fichaLinhas) d.fichaLinhas.push([String(a.numero || '') + ' — ' + (a.nome || ''), diaCurto(p.data) + '/' + String(p.data).slice(0, 4),
        p.ucId || '', p.titulo || '', presenca || 'Sem registo', respondeu.join('\n') || '—', respostas.join('\n') || '—',
        notasProf.join('\n') || '—', isNaN(n20) ? '' : virgula(Math.round(n20 * 10) / 10), casos.join('\n'),
        String(p.data || '').slice(0, 10), a.id, p.ucNome || '']);
    });
    vazia();
  });
  formatos.push({ tipo: 'wrap', linha: ini, ate: linhas.length, n: 10 });
}

function escreverSeparadorDaTurma(ss, turma, d, hoje) {
  var alunos = d.alunos.filter(function (a) { return a.ativo !== false && !a.removidoEm && !alunoDeEnsaio_(a); })
    .sort(function (a, b) { return (Number(a.numero) || 0) - (Number(b.numero) || 0); });
  // As aulas que já aconteceram (ou são hoje) e não são rascunho — e não os
  // testes de antes do ano letivo (v25.12).
  // (v26.1) Os planos arquivados não entram no Sheets: ficam só no Arquivo da
  // aplicação (Rosa, 5/out/2026).
  d.planos = d.planos.filter(function (p) { return String(p.data || '').slice(0, 10) >= INICIO_ANO_LETIVO && p.estado !== 'arquivado'; });
  // (v26.1) Os planos num dia em que a turma não tem aulas ficam à parte:
  // não contam como aulas, nem nas notas, nem nas faltas.
  // Uma aula que foi aberta aos alunos conta sempre: houve aula nesse dia.
  var abertaNoDia = {};
  (d.sessoes || []).forEach(function (s) { if (s.abertaEm) abertaNoDia[s.planoAulaId] = true; });
  var semAulaDeVerdade = function (p) { return planoNumDiaSemAulas_(p) && !abertaNoDia[p.id]; };
  var planosDiaSemAulas = d.planos.filter(semAulaDeVerdade);
  d.planos = d.planos.filter(function (p) { return !semAulaDeVerdade(p); });
  var aulas = d.planos.filter(function (p) {
    var dia = String(p.data || '').slice(0, 10);
    return dia && dia <= hoje && p.estado !== 'rascunho' && !p.eliminado;
  }).sort(function (a, b) { return String(a.data).localeCompare(String(b.data)) || String(a.horaInicio).localeCompare(String(b.horaInicio)); });
  var idsAulas = {}; aulas.forEach(function (p) { idsAulas[p.id] = p; });
  // (v24.2) Só as aulas que contam entram nas contas dos alunos e nas notas:
  // as arquivadas (anuladas) e as atividades extra (bónus) não (auditoria out/2026).
  var contam = aulas.filter(function (p) { return p.estado !== 'arquivado' && !p.tipoEvento; });
  // (v24.3) O plano conta de 1 dentro de cada UC da turma, como na aplicação
  // («Plano de Aula 3 de 12»); o n.º interno (157…) não aparece (Rosa, out/2026).
  var posNaUC = {}, contaUC = {};
  d.planos.filter(function (p) { return p.estado !== 'arquivado' && !p.tipoEvento && !p.eliminado; })
    .sort(function (a, b) { return String(a.data || '').localeCompare(String(b.data || '')) || (Number(a.numeroPlan) || 0) - (Number(b.numeroPlan) || 0); })
    .forEach(function (p) { var u = p.ucId || ''; contaUC[u] = (contaUC[u] || 0) + 1; posNaUC[p.id] = contaUC[u]; });
  // (v26.5) Atividades obrigatórias fora das horas da aula: contam como mais uma aula.
  var recebe = {};
  d.planos.forEach(function (p) { if (atvContaComoAula_(p, d.planos)) recebe[p.id] = aulaQueRecebe_(p, d.planos); });
  var comoAula = aulas.filter(function (p) { return recebe.hasOwnProperty(p.id); });
  var transposta = function (p) {
    var r = recebe[p.id];
    return r ? 'Avaliação transposta para a aula de ' + diaCurto(r.data) + (posNaUC[r.id] ? ' (Plano n.º ' + posNaUC[r.id] + ')' : '') : 'Avaliação transposta para a aula seguinte da disciplina';
  };

  // Por aluno e aula: presença, autoavaliação, nota validada.
  var chave = function (a, p) { return a + '|' + p; };
  var pres = {}, auto = {}, nota = {};
  var presTodas = presencaQueConta_(d.presencas);
  Object.keys(presTodas).forEach(function (k) { if (idsAulas[presTodas[k].planoAulaId]) pres[k] = presTodas[k]; });
  d.selecoes.forEach(function (x) { if (idsAulas[x.planoAulaId]) auto[chave(x.alunoId, x.planoAulaId)] = true; });
  d.validacoes.slice().sort(function (a, b) { return String(a.validadoEm || '').localeCompare(String(b.validadoEm || '')); })
    .forEach(function (x) {
      var n = Number(String(x.notaMedia20 === undefined ? '' : x.notaMedia20).replace(',', '.'));
      if (idsAulas[x.planoAulaId] && !isNaN(n) && String(x.notaMedia20) !== '') nota[chave(x.alunoId, x.planoAulaId)] = Math.round(n * 10) / 10;
    });
  // (v25.1) A nota de cada aula como a aplicação a calcula hoje manda (o
  // professor e o aluno veem esta). A de cima é a que foi gravada no dia.
  var daApp = {};
  (d.notasApp || []).forEach(function (r) {
    daApp[r.alunoId + '|' + r.ucId] = r;
    var pa = {}; try { pa = JSON.parse(r.porAula || '{}'); } catch (e) { pa = {}; }
    Object.keys(pa).forEach(function (pid) { if (idsAulas[pid]) nota[chave(r.alunoId, pid)] = Math.round(Number(pa[pid]) * 10) / 10; });
  });
  var ligado = {}; d.telemoveis.forEach(function (t) { ligado[t.alunoId] = true; });
  var abertas = {}, semAtrasos = {};
  d.sessoes.forEach(function (s) { if (s.abertaEm) abertas[s.planoAulaId] = s.abertaEm; if (Number(s.toleranciaMin) >= 1440) semAtrasos[s.planoAulaId] = true; });
  // (v25.3) Aula aberta depois do dia do plano: só conta o que o professor
  // declarou (não há atrasos nem faltas automáticas). Nas outras, o atraso
  // conta quando o aluno entrou depois da tolerância, exceto se o professor
  // disse ao abrir que os atrasos não contavam, ou decidiu «sem falta» (Rosa, out/2026).
  var diaDoPlano = {}; d.planos.forEach(function (p) { diaDoPlano[p.id] = String(p.data || '').slice(0, 10); });
  var tardia = function (pid) {
    var ab = abertas[pid]; if (!ab) return false;
    var dia = Utilities.formatDate(new Date(ab), 'Europe/Lisbon', 'yyyy-MM-dd');
    return !!diaDoPlano[pid] && dia > diaDoPlano[pid];
  };
  var faltou = function (x, pid) {
    if (!x) return false;
    var dec = x.decisaoProfessor || '';
    if (dec === 'falta_presenca') return true;
    if (dec) return false;
    return x.presente === false && !tardia(pid);
  };
  var atrasou = function (x, pid) {
    if (!x) return false;
    var dec = x.decisaoProfessor || '';
    if (dec === 'falta_atraso') return true;
    if (dec) return false;
    // (v25.7) Só conta com a aula aberta na aplicação, como em «Por aula»:
    // antes uma parte via «atrasado» e a outra «presente» (Rosa, 5/out/2026).
    return (x.atrasado === true || x.atrasado === 'true') && !!abertas[pid] && !tardia(pid) && !semAtrasos[pid];
  };
  var esteve = function (x, pid) {
    if (!x) return false;
    var dec = x.decisaoProfessor || '';
    if (dec === 'sem_falta' || dec === 'falta_atraso' || dec === 'parcial') return true;
    if (dec === 'falta_presenca') return false;
    return x.presente !== false;
  };

  // (v25.7) Cada parte da turma numa folha sua; a folha da turma fica com o
  // que falta fazer e o índice, com uma ligação para cada parte (Rosa,
  // 5/out/2026: «usa o link para abrir cada campo e não seja tudo numa folha»).
  var base = nomeDoSeparador(turma);
  var folhasT = [], atualF = null;
  var linhas, formatos, largura, secoes;
  var junta = function (l) { linhas.push(l); return linhas.length; };
  var titulo = function (texto, cor, nivel) {
    var n = junta([texto]); formatos.push({ tipo: 'titulo', linha: n, cor: cor || COR_TURMA });
    secoes.push({ texto: texto, linha: n, nivel: nivel || 0 });
  };
  var cabecalho = function (cols) { var n = junta(cols); formatos.push({ tipo: 'cab', linha: n, n: cols.length }); largura = Math.max(largura, cols.length); };
  var vazia = function () { junta(['']); };
  var novaFolha = function (curto, explica) {
    if (atualF) atualF.largura = largura;
    atualF = { curto: curto, nome: curto ? base + ' · ' + curto : base, linhas: [], formatos: [], secoes: [] };
    folhasT.push(atualF);
    linhas = atualF.linhas; formatos = atualF.formatos; secoes = atualF.secoes; largura = 12;
    junta(['TURMA ' + turma + (curto ? ' — ' + curto.toUpperCase() : '') + '  ·  atualizado a ' + agoraLisboa() + '  ·  só para ler: é refeito sozinho de 10 em 10 minutos']);
    formatos.push({ tipo: 'topo', linha: 1 });
    if (curto) {
      junta(['← Voltar ao índice da turma ' + turma]); formatos.push({ tipo: 'voltar', linha: 2 });
      if (explica) { junta([explica]); formatos.push({ tipo: 'legenda', linha: linhas.length }); }
      vazia();
    }
  };
  var fecharFolhas = function () { if (atualF) atualF.largura = largura; };

  // 1. Os alunos
  novaFolha('Alunos', 'Um aluno por linha: presenças, faltas, atrasos, autoavaliações e a média das aulas. As aulas em que esteve e não se autoavaliou contam 0, como na aplicação.');
  titulo('OS ALUNOS (' + alunos.length + ')');
  // (v26.1) O email da escola: serve para os avisos das autoavaliações em
  // falta (todos os dias às 18h). Quem não o deu não recebe avisos.
  var emailDe = d.emailDe || {};
  // (v26.6) O mesmo email em vários alunos é o de um professor (o 1.º ano ainda
  // não sabe o seu): assinala-se, e os avisos não vão para lá.
  var usoEmail = {}; alunos.forEach(function (a) { var e = String(emailDe[a.id] || '').toLowerCase(); if (e) usoEmail[e] = (usoEmail[e] || 0) + 1; });
  var emailParaLer = function (a) { var e = emailDe[a.id]; if (!e) return 'Ainda não deu'; return usoEmail[String(e).toLowerCase()] > 1 ? e + ' (partilhado: falta o email do aluno)' : e; };
  var semEmail = alunos.filter(function (a) { return !emailDe[a.id]; }).length;
  junta([(alunos.length - semEmail) + ' de ' + alunos.length + ' alunos já deram o email da escola.'
    + (semEmail ? ' ' + (semEmail === 1 ? 'O aluno que ainda não o deu não recebe' : 'Os ' + semEmail + ' que ainda não o deram não recebem') + ' os avisos das autoavaliações em falta: ' + (semEmail === 1 ? 'é-lhe pedido' : 'é-lhes pedido') + ' quando entrar na aplicação.' : '')]);
  formatos.push({ tipo: 'legenda', linha: linhas.length });
  cabecalho(['Nº', 'Nome', 'Presenças', 'Faltas', 'Atrasos', 'Autoavaliações', 'Validadas', 'Por validar', 'Média simples das aulas validadas (0-20; sem resposta = 0; a nota da UC, com faltas e pesos, está na folha Notas)', 'Aulas sem autoavaliação (contam 0)', 'Telemóvel ligado', 'Email da escola']);
  alunos.forEach(function (a) {
    // (v25.9) A média das aulas conta 0 nas aulas em que o aluno esteve e não
    // se autoavaliou, como na aplicação. Antes era a média só das validadas,
    // e um aluno que não respondia ficava com nota alta (Rosa, 5/out/2026).
    var p = 0, f = 0, at = 0, aa = 0, va = 0, soma = 0, semResposta = 0;
    contam.forEach(function (pl) {
      var k = chave(a.id, pl.id), x = pres[k];
      if (faltou(x, pl.id)) f++; else if (esteve(x, pl.id)) p++;
      if (atrasou(x, pl.id)) at++;
      if (auto[k]) aa++;
      if (nota[k] !== undefined) { va++; soma += nota[k]; }
      else if (!auto[k] && esteve(x, pl.id) && !faltou(x, pl.id)) semResposta++;
    });
    comoAula.forEach(function (pl) { var k = chave(a.id, pl.id); if (auto[k]) aa++; if (nota[k] !== undefined) { va++; soma += nota[k]; } else if (!auto[k]) semResposta++; });
    var nMedia = va + semResposta;
    junta([a.numero || '', a.nome || '', p, f, at, aa, va, Math.max(0, aa - va), nMedia ? virgula(Math.round(soma / nMedia * 10) / 10) : '', semResposta, ligado[a.id] ? 'Sim' : 'Não',
      emailParaLer(a)]);
  });
  vazia();

  // (v25.6) AS FALTAS: um aluno por linha, um dia de aula por coluna (todas as
  // aulas que contam, de todas as UC). P = presente · F = faltou · A = atrasado.
  novaFolha('Faltas', 'As faltas de todas as aulas: em horas e em percentagem do total de horas de cada UC (a regra dos 10%), e dia a dia.');
  // (v25.7) As faltas em horas, como na aplicação: sobre o total de horas da UC.
  var ucsF = [];
  (d.notasApp || []).forEach(function (r) { if (ucsF.indexOf(String(r.ucId)) < 0 && r.horasUC !== undefined && r.horasUC !== '') ucsF.push(String(r.ucId)); });
  if (ucsF.length) {
    titulo('FALTAS EM HORAS — a regra dos 10% (como na aplicação)', '#A23A2E');
    junta(['Em cada UC: as horas que o aluno faltou e a percentagem sobre o total de horas da UC. A partir de 10%, o aluno fica com a UC em atraso por faltas.']);
    formatos.push({ tipo: 'legenda', linha: linhas.length });
    cabecalho(['Nº', 'Nome'].concat(ucsF.map(function (u) { return u + '\nhoras'; })).concat(ucsF.map(function (u) { return u + '\n%'; })));
    var iniH = linhas.length + 1;
    alunos.forEach(function (a) {
      var hs = [], pc = [];
      ucsF.forEach(function (u) {
        var ap = daApp[a.id + '|' + u];
        var hf = ap ? Number(ap.horasFaltadas) || 0 : 0, tot = ap ? Number(ap.horasUC) || 0 : 0;
        hs.push(ap ? virgula(hf) : '');
        pc.push(ap && tot ? virgula(Math.round(hf / tot * 1000) / 10) + '%' : '');
      });
      junta([a.numero || '', a.nome || ''].concat(hs).concat(pc));
    });
    formatos.push({ tipo: 'grelhaPct', linha: iniH, ate: linhas.length, col: 3 + ucsF.length, n: ucsF.length });
    vazia();
  }
  if (contam.length) {
    titulo('FALTAS — todas as aulas (' + contam.length + ')', '#A23A2E');
    junta(['Um dia de aula por coluna, da mais antiga para a mais recente. P = esteve presente · F = faltou · A = chegou atrasado · vazio = sem registo. Conta o que o professor decidiu.']);
    formatos.push({ tipo: 'legenda', linha: linhas.length });
    cabecalho(['Nº', 'Nome'].concat(contam.map(function (p) { return diaCurto(p.data) + (p.horaInicio ? ' ' + horaDe(p.horaInicio) : '') + (p.ucId ? '\n' + p.ucId : ''); })).concat(['Faltas', 'Atrasos']));
    var iniF = linhas.length + 1;
    alunos.forEach(function (a) {
      var nf = 0, na = 0;
      var cel = contam.map(function (p) {
        var x = pres[chave(a.id, p.id)];
        if (faltou(x, p.id)) { nf++; return 'F'; }
        if (atrasou(x, p.id)) { na++; return 'A'; }
        return esteve(x, p.id) ? 'P' : '';
      });
      junta([a.numero || '', a.nome || ''].concat(cel).concat([nf, na]));
    });
    formatos.push({ tipo: 'grelhaFaltas', linha: iniF, ate: linhas.length, n: contam.length + 4 });
    vazia();
  }

  // (v25.12) A ficha de cada aluno: o resumo (notas, faltas em horas,
  // recuperações) guarda-se aqui; as aulas, com as perguntas e as respostas,
  // vêm de «Por aula». A folha «Ficha do aluno» faz-se no fim.
  var fichaResumo = [];
  alunos.forEach(function (a) {
    var resumo = [];
    Object.keys(daApp).forEach(function (kk) {
      var ap = daApp[kk];
      if (ap.alunoId !== a.id) return;
      var hf = Number(ap.horasFaltadas) || 0, tot = Number(ap.horasUC) || 0;
      var t = 'Na ' + ap.ucId + ', ' + (ap.media !== '' && ap.media !== undefined ? 'a média das aulas é ' + virgula(ap.media) : 'ainda não tem notas')
        + (ap.final !== '' && ap.final !== undefined ? ' e a nota da UC é ' + virgula(ap.final) : '');
      if (tot) t += '. Faltou ' + virgula(hf) + ' h das ' + virgula(tot) + ' horas da UC (' + virgula(Math.round(hf / tot * 1000) / 10) + '%)' + (hf / tot >= 0.1 ? ', acima dos 10%' : '');
      resumo.push(t + '.');
    });
    (d.recuperacoes || []).filter(function (r) { return r.alunoId === a.id; }).forEach(function (r) {
      resumo.push('Recuperação da ' + (r.ucId || 'UC') + ': ' + (NOME_ESTADO_RECUP[r.estado] || r.estado || '') + '.');
    });
    if (!resumo.length) resumo.push('Ainda sem notas nem faltas registadas.');
    fichaResumo.push([String(a.numero || '') + ' — ' + (a.nome || ''), resumo.join('\n')]);
  });
  var fichaResumoPorAluno = {};
  d.fichaLinhas = [];

  // 2. As notas de cada UC: um aluno por linha, uma aula por coluna (a UC mais recente primeiro).
  var ucs = [];
  contam.forEach(function (p) { var u = String(p.ucId || 'Sem UC'); if (ucs.indexOf(u) < 0) ucs.push(u); });
  ucs.reverse();
  novaFolha('Notas', 'As notas de cada UC: um aluno por linha, uma aula por coluna. São as notas da aplicação.');
  ucs.forEach(function (uc) {
    var daUC = contam.filter(function (p) { return String(p.ucId || 'Sem UC') === uc; })
      .concat(comoAula.filter(function (p) { return recebe[p.id] && String(recebe[p.id].ucId || 'Sem UC') === uc; }))
      .sort(function (a, b) { var da = recebe[a.id] ? recebe[a.id].data : a.data, db = recebe[b.id] ? recebe[b.id].data : b.data; return String(da).slice(0, 10).localeCompare(String(db).slice(0, 10)); });
    var nome = daUC.map(function (p) { return p.ucNome; }).filter(Boolean)[0] || '';
    titulo('NOTAS — ' + uc + (nome ? ' · ' + nome : '') + ' (' + daUC.length + ' aula' + (daUC.length === 1 ? '' : 's') + ')', '#3E7A31');
    junta(['Em cada aula: a nota validada (0-20) · AA = autoavaliou-se, falta validar · F = faltou · 0 (sem resposta) = esteve e não se autoavaliou, conta 0 · vazio = sem registo. A média, o bónus e a nota da UC são os da aplicação (cada aula pelo seu peso, as faltas a 0).']);
    formatos.push({ tipo: 'legenda', linha: linhas.length });
    // (v26) A turma nesta UC: a média e quantos estão com negativa (pela nota da UC da aplicação).
    var notasUC = alunos.map(function (a) { var ap = daApp[a.id + '|' + uc]; return ap && ap.final !== '' && ap.final !== undefined ? Number(String(ap.final).replace(',', '.')) : NaN; })
      .filter(function (n) { return !isNaN(n); });
    if (notasUC.length) {
      var mediaT = notasUC.reduce(function (x, y) { return x + y; }, 0) / notasUC.length;
      var neg = notasUC.filter(function (n) { return n < 9.5; }).length;
      junta(['A turma nesta UC: média ' + virgula(Math.round(mediaT * 10) / 10) + ' · ' + neg + (neg === 1 ? ' aluno com negativa' : ' alunos com negativa')
        + ' · ' + (notasUC.length - neg) + (notasUC.length - neg === 1 ? ' com positiva' : ' com positiva') + ' (nota da UC, como na aplicação).']);
      formatos.push({ tipo: 'destaque', linha: linhas.length });
    }
    cabecalho(['Nº', 'Nome'].concat(daUC.map(function (p) { return recebe[p.id] ? diaCurto(recebe[p.id].data) + '\n(atividade de ' + diaCurto(p.data) + ')' : diaCurto(p.data) + (p.horaInicio ? ' ' + horaDe(p.horaInicio) : ''); }))
      .concat(['Média', 'Faltas (contam 0)', 'Bónus', 'Nota da UC (como na aplicação)', 'Nota final publicada']));
    alunos.forEach(function (a) {
      var soma = 0, n = 0;
      var cel = daUC.map(function (p) {
        var k = chave(a.id, p.id);
        if (nota[k] !== undefined) { soma += nota[k]; n++; return virgula(nota[k]); }
        if (auto[k]) return 'AA';
        if (faltou(pres[k], p.id)) return 'F';
        // (v25.9) Esteve e não se autoavaliou: conta 0, como na aplicação.
        // (v26.5) Na atividade obrigatória que conta como aula também.
        if (esteve(pres[k], p.id) || recebe.hasOwnProperty(p.id)) { n++; return '0 (sem resposta)'; }
        return '';
      });
      var fin = d.finais.filter(function (x) { return x.alunoId === a.id && String(x.ucId) === uc; }).pop();
      var ap = daApp[a.id + '|' + uc];
      var media = ap && ap.media !== '' && ap.media !== undefined ? virgula(ap.media) : (n ? virgula(Math.round(soma / n * 10) / 10) : '');
      junta([a.numero || '', a.nome || ''].concat(cel).concat([media, ap ? (Number(ap.faltas) || 0) : '', ap && Number(ap.bonus) ? '+' + virgula(ap.bonus) : '',
        ap && ap.final !== '' && ap.final !== undefined ? virgula(ap.final) : '', fin ? (virgula(fin.nota) + (fin.resultado ? ' (' + fin.resultado + ')' : '')) : '']));
    });
    vazia();
  });

  // (v23.2) As recuperações dos alunos desta turma.
  var recs = (d.recuperacoes || []);
  if (recs.length) {
    novaFolha('Recuperações', 'As recuperações dos alunos desta turma, por número de aluno.');
    var porIdAluno = {}; d.alunos.forEach(function (a) { porIdAluno[a.id] = a; });
    titulo('RECUPERAÇÕES (' + recs.length + ')', '#B5651D');
    cabecalho(CAB_RECUPERACAO_TURMA);
    recs.slice().sort(function (a, b) { return (Number((porIdAluno[a.alunoId] || {}).numero) || 0) - (Number((porIdAluno[b.alunoId] || {}).numero) || 0); })
      .forEach(function (r) { junta(linhaDeRecuperacao(r, porIdAluno, d.planoPorId || {}, false)); });
    vazia();
  }

  // 3. As aulas, em grupos (v25.3, Rosa, out/2026): as que contam para a
  // nota, as atividades extra, as próximas e os rascunhos (as arquivadas ficam só na aplicação).
  var gruposAulas = [
    { nome: 'AULAS LANÇADAS — contam para a nota', cor: '#3E7A31', fundo: '#DFF0D8',
      lista: aulas.filter(function (p) { return p.estado !== 'arquivado' && p.estado !== 'rascunho' && !p.tipoEvento; }) },
    { nome: 'ATIVIDADES OBRIGATÓRIAS FORA DAS HORAS DA AULA — contam como mais uma aula, na aula desse dia ou na seguinte da UC', cor: '#2F5D8A', fundo: '#E3EDF7',
      lista: aulas.filter(function (p) { return p.estado !== 'rascunho' && recebe.hasOwnProperty(p.id); }) },
    { nome: 'ATIVIDADES EXTRA — contam como bónus', cor: '#6B3FA0', fundo: '#EDE3F6',
      lista: aulas.filter(function (p) { return p.estado !== 'arquivado' && p.estado !== 'rascunho' && p.tipoEvento && !recebe.hasOwnProperty(p.id); }) },
    // (v26.2) As atividades extra dos próximos dias à parte das aulas: não
    // contam para a nota, só dão bónus (Rosa, out/2026).
    { nome: 'AULAS PUBLICADAS PARA OS PRÓXIMOS DIAS', cor: '#2F5D8A', fundo: '#E3EDF7',
      lista: d.planos.filter(function (p) { return !p.eliminado && !p.tipoEvento && p.estado !== 'arquivado' && p.estado !== 'rascunho' && String(p.data || '').slice(0, 10) > hoje; }) },
    { nome: 'ATIVIDADES OBRIGATÓRIAS DOS PRÓXIMOS DIAS (fora das horas da aula) — vão contar como mais uma aula', cor: '#2F5D8A', fundo: '#E3EDF7',
      lista: d.planos.filter(function (p) { return recebe.hasOwnProperty(p.id) && p.estado !== 'rascunho' && String(p.data || '').slice(0, 10) > hoje; }) },
    { nome: 'ATIVIDADES EXTRA DOS PRÓXIMOS DIAS — não contam para a nota, só bónus', cor: '#6B3FA0', fundo: '#EDE3F6',
      lista: d.planos.filter(function (p) { return !p.eliminado && p.tipoEvento && !recebe.hasOwnProperty(p.id) && p.estado !== 'arquivado' && p.estado !== 'rascunho' && String(p.data || '').slice(0, 10) > hoje; }) },
    { nome: 'RASCUNHOS (ainda não publicados) — não contam', cor: '#8A5A12', fundo: '#FFF4E0',
      lista: d.planos.filter(function (p) { return !p.eliminado && p.estado === 'rascunho'; }) },
    { nome: 'NUM DIA EM QUE A TURMA NÃO TEM AULAS — não contam (confirme na aplicação se houve aula ou arquive)', cor: '#A23A2E', fundo: '#F8D7DA',
      lista: planosDiaSemAulas.filter(function (p) { return !p.eliminado; }) },
  ];
  novaFolha('Aulas', 'As aulas da turma, em grupos: as que contam para a nota, as atividades extra, as próximas e os rascunhos. As arquivadas estão só no Arquivo da aplicação.');
  titulo('AS AULAS (' + aulas.length + ' — ' + contam.length + (contam.length === 1 ? ' conta' : ' contam') + ' para a nota)', '#2F5D8A');
  junta(['Em cada grupo, a aula mais recente primeiro. Presentes e faltas: o que o professor declarou (nas aulas abertas depois do dia, não há faltas automáticas).']);
  formatos.push({ tipo: 'legenda', linha: linhas.length });
  gruposAulas.forEach(function (g) {
    if (!g.lista.length) return;
    titulo(g.nome + ' (' + g.lista.length + ')', g.cor, 1);
    cabecalho(['Dia', 'Horas', 'UC', 'Aula', 'Tipo', 'Estado', 'Aberta aos alunos', 'Presentes', 'Faltas', 'Autoavaliações', 'Validadas', 'Plano da UC', 'Criado em']);
    g.lista.slice().sort(function (a, b) { return String(b.data || '').localeCompare(String(a.data || '')); }).forEach(function (p) {
      var pr = 0, fa = 0, aa = 0, va = 0;
      alunos.forEach(function (a) {
        var k = chave(a.id, p.id);
        if (faltou(pres[k], p.id)) fa++; else if (esteve(pres[k], p.id)) pr++;
        if (auto[k]) aa++;
        if (nota[k] !== undefined) va++;
      });
      junta([diaCurto(p.data) + '/' + String(p.data).slice(0, 4), horaDe(p.horaInicio) + (p.horaFim ? '–' + horaDe(p.horaFim) : ''),
        p.ucId || '', p.titulo || '', tipoParaLer(p), NOME_ESTADO[p.estado] || p.estado || '', abertas[p.id] ? 'Sim' : 'Não', pr, fa, aa, va,
        recebe.hasOwnProperty(p.id) ? transposta(p) : p.tipoEvento ? '' : (posNaUC[p.id] ? 'Plano ' + posNaUC[p.id] : ''), criadoParaLer(p.criadoEm)]);
      formatos.push({ tipo: 'cor', linha: linhas.length, n: 13, cor: g.fundo });
    });
    vazia();
  });

  novaFolha('Grupos', 'Os grupos de cada aula, o líder do KitchenFlow e o que os colegas disseram de cada um.');
  seccaoGruposEColegas(d, aulas, alunos, junta, titulo, cabecalho, vazia, formatos, linhas);
  novaFolha('Por aula', 'Cada aula com o que chegou de cada aluno: o que respondeu, a nota do professor e os casos à parte. A mais recente primeiro.');
  seccaoOQueChegouACadaAluno(d, aulas, alunos, junta, titulo, cabecalho, vazia, formatos, linhas);

  fecharFolhas();

  // (v25.7) A folha da turma: o que falta fazer e o índice. Escreve-se no fim,
  // quando já se sabe onde fica cada parte.
  var sel = ultimoPor(d.selecoes, function (x) { return x.alunoId + '|' + x.planoAulaId; }, function (x) { return x.criadaEm; });
  var faltaFazer = [];
  contam.slice().reverse().forEach(function (p) {
    var porValidar = alunos.filter(function (a) { var k = chave(a.id, p.id); return auto[k] && nota[k] === undefined; }).length;
    if (porValidar) faltaFazer.push('Aula de ' + diaCurto(p.data) + (p.titulo ? ' (' + p.titulo + ')' : '') + ': ' + porValidar
      + (porValidar === 1 ? ' autoavaliação está' : ' autoavaliações estão') + ' por validar.');
    if (p.pedirDeNovoEm) {
      var antigos = alunos.filter(function (a) { var x = sel[a.id + '|' + p.id]; return x && x.versaoPlano && String(x.versaoPlano) < String(p.pedirDeNovoEm); });
      if (antigos.length) faltaFazer.push('Aula de ' + diaCurto(p.data) + (p.titulo ? ' (' + p.titulo + ')' : '') + ': ' + antigos.length
        + (antigos.length === 1 ? ' aluno ainda não respondeu' : ' alunos ainda não responderam') + ' à versão nova do plano ('
        + antigos.map(function (a) { return a.nome; }).join(', ') + ').');
    }
  });
  alunos.forEach(function (a) {
    Object.keys(daApp).forEach(function (kk) {
      var ap = daApp[kk];
      if (ap.alunoId !== a.id) return;
      var hf = Number(ap.horasFaltadas) || 0, tot = Number(ap.horasUC) || 0;
      if (!tot || !hf) return;
      var pct = hf / tot * 100;
      if (pct >= 10) faltaFazer.push(a.nome + ' faltou ' + virgula(hf) + ' h em ' + ap.ucId + ', que são ' + virgula(Math.round(pct * 10) / 10) + '% das ' + virgula(tot) + ' horas da UC. Está acima dos 10%.');
      else if (pct >= 7) faltaFazer.push(a.nome + ' faltou ' + virgula(hf) + ' h em ' + ap.ucId + ', que são ' + virgula(Math.round(pct * 10) / 10) + '% das ' + virgula(tot) + ' horas da UC. Está perto dos 10%.');
    });
  });
  var porDecidir = (d.recuperacoes || []).filter(function (r) { return r.estado === 'gerada' || r.estado === 'pendente' || r.estado === 'submetida'; });
  if (porDecidir.length) faltaFazer.push(porDecidir.length + (porDecidir.length === 1 ? ' recuperação está' : ' recuperações estão') + ' por decidir ou por ver. Estão na folha «' + base + ' · Recuperações».');

  var principal = { curto: '', nome: base, linhas: [], formatos: [], secoes: [] };
  linhas = principal.linhas; formatos = principal.formatos; secoes = principal.secoes; largura = 12;
  junta(['TURMA ' + turma + '  ·  atualizado a ' + agoraLisboa() + '  ·  só para ler: é refeito sozinho de 10 em 10 minutos']);
  formatos.push({ tipo: 'topo', linha: 1 });
  SUMARIOS.TURMA.forEach(function (t) { junta([t]); formatos.push({ tipo: 'sumario', linha: linhas.length }); });
  vazia();
  titulo('O QUE FALTA FAZER', '#A23A2E');
  if (!faltaFazer.length) junta(['Não há nada por fazer nesta turma.']);
  faltaFazer.forEach(function (t) { junta(['• ' + t]); });
  vazia();
  titulo('ÍNDICE — carregue num nome para abrir essa parte', '#444444');
  var ligacoes = [];   // { linha, folha, linhaDestino }
  // (v26) Os alunos: cada nome abre a ficha do aluno, no ficheiro «Fichas dos alunos».
  junta(['OS ALUNOS (a ficha de cada aluno, noutro ficheiro)']);
  formatos.push({ tipo: 'destaque', linha: linhas.length });
  var linhasAlunos = [];
  alunos.forEach(function (a) { junta(['      ' + String(a.numero || '') + ' — ' + (a.nome || '')]); linhasAlunos.push({ linha: linhas.length, aluno: a }); });
  junta(['A TURMA']);
  formatos.push({ tipo: 'destaque', linha: linhas.length });
  folhasT.forEach(function (F) {
    junta([F.curto.toUpperCase()]); ligacoes.push({ linha: linhas.length, folha: F, destino: 1, forte: true });
    F.secoes.forEach(function (sc) {
      junta(['      ' + sc.texto]); ligacoes.push({ linha: linhas.length, folha: F, destino: sc.linha });
    });
  });
  principal.largura = largura;

  // Escrever: primeiro as partes (para se saber o código de cada folha), depois a da turma.
  var fp = escreverFolhaDaTurma_(ss, principal);
  var gidP = fp.getSheetId();
  var estiloLig = SpreadsheetApp.newTextStyle().setForegroundColor('#1a56db').setUnderline(true).build();
  var estiloForte = SpreadsheetApp.newTextStyle().setForegroundColor('#1a56db').setUnderline(true).setBold(true).build();
  folhasT.forEach(function (F) {
    var fo = escreverFolhaDaTurma_(ss, F);
    F.gid = fo.getSheetId();
    try {
      fo.getRange(2, 1).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('← Voltar ao índice da turma ' + turma)
        .setLinkUrl('#gid=' + gidP + '&range=A1').setTextStyle(estiloForte).build());
    } catch (e) { Logger.log('Voltar ' + F.nome + ': ' + e); }
  });
  try {
    ligacoes.forEach(function (lg) {
      var t = (lg.forte ? '' : '      ') + (lg.forte ? lg.folha.curto.toUpperCase() : lg.folha.secoes.filter(function (sc) { return sc.linha === lg.destino; })[0].texto);
      fp.getRange(lg.linha, 1).setRichTextValue(SpreadsheetApp.newRichTextValue().setText(t)
        .setLinkUrl('#gid=' + lg.folha.gid + '&range=A' + lg.destino).setTextStyle(lg.forte ? estiloForte : estiloLig).build());
    });
  } catch (e) { Logger.log('Índice da turma ' + turma + ': ' + e); }
  // (v26) As fichas dos alunos, no outro ficheiro, e as ligações para elas.
  try {
    var urlTurma = ss.getUrl() + '#gid=' + gidP;
    var fichas = escreverFichasDosAlunos_(turma, alunos, d.fichaLinhas || [], fichaResumoPorAluno, daApp, d.recuperacoes || [], urlTurma, hoje);
    linhasAlunos.forEach(function (la) {
      var url = fichas[la.aluno.id];
      if (!url) return;
      fp.getRange(la.linha, 1).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('      ' + String(la.aluno.numero || '') + ' — ' + (la.aluno.nome || ''))
        .setLinkUrl(url).setTextStyle(estiloLig).build());
    });
  } catch (e) { Logger.log('Fichas dos alunos ' + turma + ': ' + e); }
  // As partes que já não existem (por exemplo, sem recuperações) saem.
  var nomesAgora = [base].concat(folhasT.map(function (F) { return F.nome; }));
  ss.getSheets().forEach(function (fo) {
    var n; try { n = fo.getName(); } catch (e) { return; }
    if (n.indexOf(base + ' · ') === 0 && nomesAgora.indexOf(n) < 0) try { ss.deleteSheet(fo); } catch (e) {}
  });
  return nomesAgora;
}


/** (v25.7) Escreve uma folha da turma (a do índice ou uma das partes). */
function escreverFolhaDaTurma_(ss, F) {
  // (v25.10) Mais leve: as cores e os tipos de letra vão de uma só vez para a
  // folha toda (antes era uma chamada por linha, centenas por turma, e o Google
  // desistia: «Service Spreadsheets timed out» — Rosa, 5/out/2026). A folha
  // fica só com as linhas e colunas que usa.
  var linhas = F.linhas, formatos = F.formatos, largura = F.largura || 12;
  var nL = Math.max(1, linhas.length);
  var f = ss.getSheetByName(F.nome) || ss.insertSheet(F.nome);
  f.clear();
  try { f.getBandings().forEach(function (b) { b.remove(); }); } catch (e) {}
  if (f.getMaxColumns() < largura) f.insertColumnsAfter(f.getMaxColumns(), largura - f.getMaxColumns());
  if (f.getMaxRows() < nL) f.insertRowsAfter(f.getMaxRows(), nL - f.getMaxRows());
  var grelha = linhas.map(function (l) { var c = l.slice(0, largura); while (c.length < largura) c.push(''); return c.map(function (v) { return v === null || v === undefined ? '' : String(v); }); });
  if (!grelha.length) grelha = [new Array(largura).fill('')];
  // As matrizes do formato, todas de uma vez.
  var mat = function (v) { return grelha.map(function () { return new Array(largura).fill(v); }); };
  var fundo = mat(null), cor = mat('#000000'), peso = mat('normal'), tam = mat(10), estilo = mat('normal'), quebra = mat(false), alinhaV = mat('middle'), alinhaH = mat('left');
  var pinta = function (l, c0, n, fn) { for (var c = c0; c < Math.min(largura, c0 + n); c++) fn(l - 1, c); };
  formatos.forEach(function (fm) {
    var L = fm.linha;
    if (!L || L > grelha.length) return;
    if (fm.tipo === 'topo') pinta(L, 0, 1, function (r, c) { peso[r][c] = 'bold'; tam[r][c] = 12; cor[r][c] = COR_TURMA; });
    if (fm.tipo === 'titulo') pinta(L, 0, largura, function (r, c) { fundo[r][c] = fm.cor; cor[r][c] = '#ffffff'; peso[r][c] = 'bold'; tam[r][c] = 11; });
    if (fm.tipo === 'cab') pinta(L, 0, fm.n, function (r, c) { fundo[r][c] = '#F3ECEE'; peso[r][c] = 'bold'; quebra[r][c] = true; });
    if (fm.tipo === 'legenda') pinta(L, 0, 1, function (r, c) { cor[r][c] = '#777777'; estilo[r][c] = 'italic'; });
    if (fm.tipo === 'cor') pinta(L, 0, fm.n, function (r, c) { fundo[r][c] = fm.cor; });
    if (fm.tipo === 'sumario') pinta(L, 0, 1, function (r, c) { cor[r][c] = '#444444'; estilo[r][c] = 'italic'; tam[r][c] = 9; });
    if (fm.tipo === 'voltar') pinta(L, 0, 1, function (r, c) { peso[r][c] = 'bold'; cor[r][c] = '#1a56db'; });
    if (fm.tipo === 'destaque') pinta(L, 0, largura, function (r, c) { fundo[r][c] = '#F3ECEE'; peso[r][c] = 'bold'; cor[r][c] = '#7B2233'; });
    if (fm.tipo === 'nomeAluno') pinta(L, 0, largura, function (r, c) { fundo[r][c] = '#7B2233'; cor[r][c] = '#ffffff'; peso[r][c] = 'bold'; tam[r][c] = 20; });
    if (fm.tipo === 'subNome') pinta(L, 0, largura, function (r, c) { fundo[r][c] = '#F3ECEE'; cor[r][c] = '#7B2233'; tam[r][c] = 11; peso[r][c] = 'bold'; });
    if (fm.tipo === 'aulaTit') pinta(L, 0, largura, function (r, c) { fundo[r][c] = '#EDE3F6'; cor[r][c] = '#3f2466'; peso[r][c] = 'bold'; });
    if (fm.tipo === 'rotulo') { pinta(L, 0, 1, function (r, c) { peso[r][c] = 'bold'; cor[r][c] = '#555555'; alinhaV[r][c] = 'top'; });
      pinta(L, 1, largura - 1, function (r, c) { quebra[r][c] = true; alinhaV[r][c] = 'top'; }); }
    var ate = Math.min(fm.ate || 0, grelha.length);
    if (fm.tipo === 'wrap') for (var r1 = L; r1 <= ate; r1++) pinta(r1, 0, fm.n, function (r, c) { quebra[r][c] = true; alinhaV[r][c] = 'top'; });
    if (fm.tipo === 'grelhaFaltas') for (var r2 = L; r2 <= ate; r2++) pinta(r2, 2, fm.n - 2, function (r, c) {
      var v = grelha[r][c]; alinhaH[r][c] = 'center'; cor[r][c] = v === 'F' ? '#C0392B' : v === 'A' ? '#B5651D' : '#333333'; if (v === 'F') peso[r][c] = 'bold'; });
    if (fm.tipo === 'grelhaPct') for (var r3 = L; r3 <= ate; r3++) pinta(r3, fm.col - 1, fm.n, function (r, c) {
      var x = Number(String(grelha[r][c]).replace('%', '').replace(',', '.')); alinhaH[r][c] = 'center';
      if (grelha[r][c] !== '' && !isNaN(x)) fundo[r][c] = x >= 10 ? '#F8D7DA' : x >= 7 ? '#FFF4E0' : null; });
  });
  var r = f.getRange(1, 1, grelha.length, largura);
  r.setNumberFormat('@');
  r.setValues(grelha);
  r.setFontFamily('Arial');
  r.setBackgrounds(fundo); r.setFontColors(cor); r.setFontWeights(peso); r.setFontSizes(tam); r.setFontStyles(estilo);
  r.setWraps(quebra); r.setVerticalAlignments(alinhaV); r.setHorizontalAlignments(alinhaH);
  // Só as linhas e colunas que se usam (o ficheiro fica mais leve).
  try {
    if (f.getMaxRows() > grelha.length + 2) f.deleteRows(grelha.length + 3, f.getMaxRows() - grelha.length - 2);
    if (f.getMaxColumns() > largura + 1) f.deleteColumns(largura + 2, f.getMaxColumns() - largura - 1);
  } catch (e) {}
  f.setFrozenRows(F.congelar || (F.curto ? 2 : 1));
  f.setFrozenColumns(F.semColunaFixa ? 0 : (F.curto ? 2 : 0));
  f.setColumnWidth(1, F.curto ? 44 : 60); f.setColumnWidth(2, 230);
  if (largura > 2) f.setColumnWidths(3, largura - 2, 88);
  if (F.larguras) Object.keys(F.larguras).forEach(function (c) { f.setColumnWidth(Number(c), F.larguras[c]); });
  if (F.alturaLinha1) try { f.setRowHeight(1, F.alturaLinha1); } catch (e) {}
  try { f.setTabColor(COR_TURMA); } catch (e) {}
  return f;
}


// ══════════════════════════════════════════════════════════════
// (v26) FICHAS DOS ALUNOS — um ficheiro à parte, uma folha por aluno
// ══════════════════════════════════════════════════════════════
// Rosa, 5/out/2026: «quando escolho o aluno, abro outro índice para ver o que
// quero: só as notas, só o trimestre, só aquela UC, as faltas». Cada folha tem
// o nome do aluno sempre à vista, o índice do aluno no topo e cada parte curta.
// Ficam num ficheiro à parte para não encherem o ficheiro dos dados.
var PROP_FICHAS = 'ID_FICHEIRO_FICHAS_ALUNOS';

function ficheiroDasFichas_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_FICHAS);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { Logger.log('O ficheiro das fichas não abriu, faz-se outro: ' + e); } }
  var novo = SpreadsheetApp.create('Avaliação ECL — Fichas dos alunos');
  props.setProperty(PROP_FICHAS, novo.getId());
  // Para a mesma pasta do ficheiro dos dados.
  try {
    var pasta = DriveApp.getFileById(ficheiro().getId()).getParents();
    if (pasta.hasNext()) DriveApp.getFileById(novo.getId()).moveTo(pasta.next());
  } catch (e) { Logger.log('Não mudei o ficheiro das fichas de pasta: ' + e); }
  return novo;
}

/** Abre o ficheiro das fichas e diz onde está (para correr à mão). */
function verFicheiroDasFichas() { Logger.log(ficheiroDasFichas_().getUrl()); }

function trimestreDe_(iso) {
  var m = Number(String(iso).slice(5, 7)), md = String(iso).slice(5, 10);
  if (m >= 9) return 1;
  return md <= '03-29' ? 2 : 3;
}
function anoLetivoDe_(iso) {
  var y = Number(String(iso).slice(0, 4)), m = Number(String(iso).slice(5, 7));
  return m >= 9 ? y + '/' + String(y + 1).slice(2) : (y - 1) + '/' + String(y).slice(2);
}

/** Escreve a folha de cada aluno da turma. Devolve { alunoId: ligação }. */
function escreverFichasDosAlunos_(turma, alunos, linhasFicha, _resumo, daApp, recs, urlTurma, hoje) {
  var ssF = ficheiroDasFichas_();
  var base = nomeDoSeparador(turma);
  var ligacoes = {}, nomesAgora = [];
  var estiloLig = SpreadsheetApp.newTextStyle().setForegroundColor('#1a56db').setUnderline(true).build();
  var estiloVolta = SpreadsheetApp.newTextStyle().setForegroundColor('#1a56db').setUnderline(true).setBold(true).build();
  var estiloTopo = SpreadsheetApp.newTextStyle().setForegroundColor('#ffffff').setUnderline(true).setBold(true).build();
  var LARG = 6;
  alunos.forEach(function (a) {
    var minhas = linhasFicha.filter(function (l) { return l[11] === a.id; })
      .sort(function (x, y) { return String(y[10]).localeCompare(String(x[10])); });
    var primeiro = String(a.nome || '').split(' ')[0], ultimo = String(a.nome || '').split(' ').slice(-1)[0];
    var nomeFolha = (base + ' · ' + (Number(a.numero) < 10 ? '0' : '') + (a.numero || '') + ' ' + primeiro + (ultimo && ultimo !== primeiro ? ' ' + ultimo : '')).substring(0, 95);
    nomesAgora.push(nomeFolha);
    // As partes, cada uma com as suas linhas.
    var partes = [];
    var parte = function (titulo, cor, linhasP, forms) { partes.push({ titulo: titulo, cor: cor, linhas: linhasP, forms: forms || [] }); };
    // UC do aluno: as das notas da aplicação e as das aulas.
    var ucs = [];
    Object.keys(daApp).forEach(function (k) { var ap = daApp[k]; if (ap.alunoId === a.id && ucs.indexOf(String(ap.ucId)) < 0) ucs.push(String(ap.ucId)); });
    minhas.forEach(function (l) { if (l[2] && ucs.indexOf(l[2]) < 0) ucs.push(l[2]); });
    var nomeUC = {}; minhas.forEach(function (l) { if (l[12]) nomeUC[l[2]] = l[12]; });
    // RESUMO
    var res = [['UC', 'Média das aulas', 'Nota da UC', 'Faltas (horas)', 'Faltas (%)', 'Recuperação']];
    ucs.forEach(function (u) {
      var ap = daApp[a.id + '|' + u] || {};
      var hf = Number(ap.horasFaltadas) || 0, tot = Number(ap.horasUC) || 0;
      var rc = recs.filter(function (r) { return r.alunoId === a.id && String(r.ucId) === u; }).pop();
      res.push([u + (nomeUC[u] ? ' — ' + nomeUC[u] : ''), ap.media !== undefined && ap.media !== '' ? virgula(ap.media) : '—',
        ap.final !== undefined && ap.final !== '' ? virgula(ap.final) : '—', tot ? virgula(hf) + ' h de ' + virgula(tot) : '—',
        tot ? virgula(Math.round(hf / tot * 1000) / 10) + '%' + (hf / tot >= 0.1 ? ' (acima dos 10%)' : '') : '—',
        rc ? (NOME_ESTADO_RECUP[rc.estado] || rc.estado || '') : '—']);
    });
    if (res.length === 1) res.push(['Ainda sem notas nem faltas registadas.', '', '', '', '', '']);
    parte('RESUMO', '#7B2233', res, [{ tipo: 'cab', rel: 0, n: 6 }]);
    // NOTAS
    var notas = [];
    var fNotas = [];
    ucs.forEach(function (u) {
      var daUC = minhas.filter(function (l) { return l[2] === u; });
      if (!daUC.length) return;
      notas.push([u + (nomeUC[u] ? ' — ' + nomeUC[u] : '')]); fNotas.push({ tipo: 'aulaTit', rel: notas.length - 1 });
      notas.push(['Dia', 'Plano de aula', 'Nota da aula (0-20)']); fNotas.push({ tipo: 'cab', rel: notas.length - 1, n: 3 });
      daUC.forEach(function (l) { notas.push([l[1], l[3], l[8] !== '' ? l[8] : (l[4] === 'Faltou' ? 'Faltou (conta 0)' : /Não respondeu: conta 0/.test(l[9]) ? '0 (sem resposta)' : 'Por validar')]); });
    });
    if (!notas.length) notas.push(['Ainda não há notas.']);
    parte('NOTAS', '#3E7A31', notas, fNotas);
    // FALTAS
    var faltas = [['Dia', 'UC', 'Plano de aula', 'Presença']];
    minhas.forEach(function (l) { if (l[4] === 'Faltou' || l[4] === 'Atrasado') faltas.push([l[1], l[2], l[3], l[4]]); });
    if (faltas.length === 1) faltas = [['Sem faltas nem atrasos.']];
    parte('FALTAS', '#A23A2E', faltas, faltas.length > 1 ? [{ tipo: 'cab', rel: 0, n: 4 }] : []);
    // TRIMESTRES
    var porTri = {};
    minhas.forEach(function (l) { var k = anoLetivoDe_(l[10]) + '|' + trimestreDe_(l[10]); (porTri[k] = porTri[k] || []).push(l); });
    Object.keys(porTri).sort().forEach(function (k) {
      var ls = porTri[k], t = k.split('|');
      var linhasT = [['UC', 'Planos de aula', 'Média das notas validadas', 'Faltas']];
      var ucsT = []; ls.forEach(function (l) { if (ucsT.indexOf(l[2]) < 0) ucsT.push(l[2]); });
      ucsT.forEach(function (u) {
        var du = ls.filter(function (l) { return l[2] === u; });
        var ns2 = du.filter(function (l) { return l[8] !== ''; }).map(function (l) { return Number(String(l[8]).replace(',', '.')); });
        var m = ns2.length ? virgula(Math.round(ns2.reduce(function (x, y) { return x + y; }, 0) / ns2.length * 10) / 10) : '—';
        linhasT.push([u + (nomeUC[u] ? ' — ' + nomeUC[u] : ''), du.length, m, du.filter(function (l) { return l[4] === 'Faltou'; }).length]);
      });
      parte(t[1] + '.º TRIMESTRE (' + t[0] + ')', '#2F5D8A', linhasT, [{ tipo: 'cab', rel: 0, n: 4 }]);
    });
    // CADA UC: cada plano de aula com tudo
    ucs.forEach(function (u) {
      var daUC = minhas.filter(function (l) { return l[2] === u; });
      if (!daUC.length) return;
      var ls = [], fs = [];
      daUC.forEach(function (l) {
        ls.push([l[1] + ' · ' + l[3] + ' · ' + l[4]]); fs.push({ tipo: 'aulaTit', rel: ls.length - 1 });
        [['Competências avaliadas e o que respondeu', l[5]], ['Perguntas e respostas', l[6]], ['Notas do professor', l[7]],
         ['Nota da aula (0-20)', l[8] !== '' ? l[8] : '—'], ['Casos à parte', l[9] || '—']].forEach(function (par) {
          ls.push(par); fs.push({ tipo: 'rotulo', rel: ls.length - 1 });
        });
        ls.push(['']);
      });
      parte(u + (nomeUC[u] ? ' — ' + nomeUC[u] : ''), '#6B4C9A', ls, fs);
    });
    // RECUPERAÇÕES
    var rr = recs.filter(function (r) { return r.alunoId === a.id; }).map(function (r) {
      return [(r.ucId || 'UC') + ': ' + (NOME_ESTADO_RECUP[r.estado] || r.estado || '') + (r.dataLimite ? ' · prazo ' + diaPT(r.dataLimite) : '')
        + (r.resultadoNota !== undefined && r.resultadoNota !== '' ? ' · nota ' + String(r.resultadoNota).replace('.', ',') : '')];
    });
    parte('RECUPERAÇÕES', '#B5651D', rr.length ? rr : [['Nenhuma.']]);

    // Montar a folha: nome, linha da turma, índice, partes.
    var F = { curto: '', nome: nomeFolha, linhas: [], formatos: [], secoes: [], largura: LARG, congelar: 2, semColunaFixa: true,
      larguras: { 1: 300, 2: 380, 3: 140, 4: 140, 5: 140, 6: 160 }, alturaLinha1: 40 };
    F.linhas.push([String(a.nome || '').toUpperCase()]); F.formatos.push({ tipo: 'nomeAluno', linha: 1 });
    F.linhas.push(['Turma ' + turma + ' · Nº ' + (a.numero || '') + ' · atualizado a ' + agoraLisboa()]); F.formatos.push({ tipo: 'subNome', linha: 2 });
    F.linhas.push(['']);
    F.linhas.push(['ÍNDICE DO ALUNO — carregue no que quer ver']); F.formatos.push({ tipo: 'titulo', linha: 4, cor: '#444444' });
    var inicioIndice = 5;
    partes.forEach(function (p) { F.linhas.push(['      ' + p.titulo]); });
    F.linhas.push(['']);
    partes.forEach(function (p) {
      F.linhas.push([p.titulo]); p.linha = F.linhas.length; F.formatos.push({ tipo: 'titulo', linha: p.linha, cor: p.cor });
      var ini = F.linhas.length + 1;
      p.linhas.forEach(function (l) { F.linhas.push(l); });
      p.forms.forEach(function (fm) { var o = { tipo: fm.tipo, linha: ini + fm.rel }; if (fm.n) o.n = fm.n; F.formatos.push(o); });
      F.linhas.push(['']);
    });
    var fo = comNovaTentativa_(function () { return escreverFolhaDaTurma_(ssF, F); }, 'Ficha ' + nomeFolha);
    var gid = fo.getSheetId();
    // As ligações: o índice do aluno, «↑ Índice do aluno» em cada parte, «← Voltar à turma».
    try {
      fo.getRange(inicioIndice, 1, partes.length, 1).setRichTextValues(partes.map(function (p) {
        return [SpreadsheetApp.newRichTextValue().setText('      ' + p.titulo).setLinkUrl('#gid=' + gid + '&range=A' + p.linha).setTextStyle(estiloLig).build()];
      }));
      partes.forEach(function (p) {
        fo.getRange(p.linha, LARG).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('↑ Índice do aluno')
          .setLinkUrl('#gid=' + gid + '&range=A4').setTextStyle(estiloTopo).build());
      });
      fo.getRange(2, LARG).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('← Voltar à turma').setLinkUrl(urlTurma).setTextStyle(estiloVolta).build());
      try { fo.setTabColor('#7B2233'); } catch (e) {}
    } catch (e) { Logger.log('Ligações da ficha ' + nomeFolha + ': ' + e); }
    ligacoes[a.id] = ssF.getUrl() + '#gid=' + gid;
  });
  // Saem as fichas desta turma que já não interessam (alunos que saíram, versões antigas).
  ssF.getSheets().forEach(function (fo) {
    var n; try { n = fo.getName(); } catch (e) { return; }
    if (n.indexOf(base + ' · ') === 0 && nomesAgora.indexOf(n) < 0) try { ssF.deleteSheet(fo); } catch (e) {}
  });
  try { indiceDasFichas_(ssF); } catch (e) { Logger.log('Índice das fichas: ' + e); }
  return ligacoes;
}

/** A primeira folha do ficheiro das fichas: as turmas e os alunos, com ligações.
 *  Tira as folhas que não são de nenhuma turma deste ano (e a «Folha1» vazia). */
function indiceDasFichas_(ssF) {
  var bases = TURMAS_DO_ANO.map(nomeDoSeparador);
  var ind = ssF.getSheetByName('ÍNDICE') || ssF.insertSheet('ÍNDICE', 0);
  ssF.getSheets().forEach(function (fo) {
    var n; try { n = fo.getName(); } catch (e) { return; }
    if (n === 'ÍNDICE') return;
    var daTurma = bases.some(function (b) { return n.indexOf(b + ' · ') === 0; });
    if (!daTurma) try { ssF.deleteSheet(fo); } catch (e) {}
  });
  var linhas = [['FICHAS DOS ALUNOS · atualizado a ' + agoraLisboa()], ['Carregue no nome do aluno para abrir a ficha dele.'], ['']];
  var links = [];
  bases.forEach(function (b) {
    var daT = ssF.getSheets().filter(function (fo) { return fo.getName().indexOf(b + ' · ') === 0; })
      .sort(function (x, y) { return x.getName().localeCompare(y.getName()); });
    if (!daT.length) return;
    linhas.push(['TURMA ' + b]);
    daT.forEach(function (fo) { linhas.push([fo.getName().slice(b.length + 3)]); links.push({ linha: linhas.length, gid: fo.getSheetId() }); });
    linhas.push(['']);
  });
  ind.clear();
  ind.getRange(1, 1, linhas.length, 1).setValues(linhas);
  ind.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor('#7B2233');
  linhas.forEach(function (l, i) { if (/^TURMA /.test(l[0])) ind.getRange(i + 1, 1).setFontWeight('bold').setBackground('#F3ECEE'); });
  var est = SpreadsheetApp.newTextStyle().setForegroundColor('#1a56db').setUnderline(true).build();
  links.forEach(function (x) {
    ind.getRange(x.linha, 1).setRichTextValue(SpreadsheetApp.newRichTextValue().setText(linhas[x.linha - 1][0]).setLinkUrl('#gid=' + x.gid).setTextStyle(est).build());
  });
  ind.setColumnWidth(1, 420);
  if (ind.getIndex() !== 1) { ssF.setActiveSheet(ind); ssF.moveActiveSheet(1); }
}

/** (v25.10) Tenta outra vez quando o Google demora («timed out»), até 3 vezes. */
function comNovaTentativa_(fn, nome) {
  for (var t = 1; t <= 3; t++) {
    try { return fn(); } catch (e) {
      var demorou = /timed out|tempo limite|Service Spreadsheets/i.test(String(e));
      Logger.log((nome || '') + ': tentativa ' + t + ' falhou: ' + e);
      if (!demorou || t === 3) throw e;
      SpreadsheetApp.flush();
      Utilities.sleep(5000 * t);
    }
  }
}

/**
 * (v21.2) Corre-se à mão, uma vez: apaga as folhas antigas de cada aluno
 * («12_Nome…», da v20 para trás) e os separadores «TURMA …» da v20. Estão
 * agora no separador de cada turma, e os dados continuam nas folhas de dados
 * (AVALIACOES, PRESENCAS…). ANTES de apagar, faz uma cópia do ficheiro
 * inteiro na pasta das cópias de segurança (Rosa, out/2026).
 */
function apagarFolhasAntigas() {
  var ss = ficheiro();
  var pasta = pastaDasCopias();
  var agora = Utilities.formatDate(new Date(), 'Europe/Lisbon', 'yyyy-MM-dd HH.mm');
  DriveApp.getFileById(ss.getId()).makeCopy('Avaliação ECL — antes de apagar as folhas antigas — ' + agora, pasta);
  Logger.log('Cópia de segurança feita na pasta «' + PASTA_COPIAS + '».');
  var apagadas = [];
  ss.getSheets().forEach(function (f) {
    var n = f.getName();
    if (/^\d+_/.test(n) || n.indexOf('TURMA ') === 0) {
      try { ss.deleteSheet(f); apagadas.push(n); } catch (e) { Logger.log('Não apaguei ' + n + ': ' + e); }
    }
  });
  Logger.log('Apagadas ' + apagadas.length + ' folhas: ' + apagadas.join(', '));
  atualizarFolhasDasTurmas();
  Logger.log('Separadores das turmas refeitos.');
}

// ══════════════════════════════════════════════════════════════
// (v23) AUDITORIA — o que estava nos ficheiros antigos e não está aqui
// ══════════════════════════════════════════════════════════════
// Corre  auditarFolhasAntigas  uma vez (Rosa, out/2026: «houve informação
// nos Sheets antigos que desapareceu»). Não apaga nem muda nada: só lê os
// ficheiros antigos, a cópia de segurança feita antes de apagar as folhas
// soltas, e este ficheiro, e escreve o resultado na folha AUDITORIA.

/** Para onde foi cada folha antiga (o que importarDoAntigo trouxe). */
var DESTINO_DAS_ANTIGAS = {
  AVALIACOES: 'AVALIACOES', 'Presenças': 'PRESENCAS', PRESENCAS: 'PRESENCAS', SELECOES: 'SELECOES',
  VALIDACOES: 'VALIDACOES', SESSOES: 'SESSOES', LIDERES_KF: 'LIDERES_KF', INDICE: 'FICHAS',
  Planos_Aula: 'PLANOS', Requisicoes: 'REQUISICOES'
};

function semAcentos(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

/** Os códigos (id) de uma folha, venha a coluna como «id» ou «ID». */
function idsDaFolha(f) {
  var d = f.getDataRange().getValues();
  if (d.length < 2) return [];
  var cab = d[0].map(function (c) { return semAcentos(c); });
  var i = cab.indexOf('id');
  if (i < 0) return null;
  var out = [];
  for (var r = 1; r < d.length; r++) if (String(d[r][i]).trim()) out.push(String(d[r][i]).trim());
  return out;
}

function auditarFolhasAntigas() {
  var novo = ficheiro();
  var linhas = [['Ficheiro', 'Folha', 'Linhas', 'Foi para', 'Em falta no ficheiro novo', 'Colunas que não têm coluna própria no novo', 'O que quer dizer']];
  var idsNovos = {};
  function idsNovosDe(nome) {
    if (!idsNovos[nome]) {
      var m = {};
      try { ler(nome, {}).forEach(function (o) { if (o.id) m[String(o.id)] = true; }); } catch (e) {}
      idsNovos[nome] = m;
    }
    return idsNovos[nome];
  }
  function colunasNovas(nome) {
    var def = FOLHAS[nome];
    return def ? def.colunas.map(semAcentos) : [];
  }

  // 1. Os três ficheiros antigos.
  [['Histórico antigo', ANTIGO_HISTORICO], ['Fichas antigas', ANTIGO_FICHAS], ['Planos antigos', ANTIGO_PLANOS]].forEach(function (par) {
    var ss;
    try { ss = SpreadsheetApp.openById(par[1]); }
    catch (e) { linhas.push([par[0], '—', '', '', '', '', 'Não consegui abrir este ficheiro: ' + e]); return; }
    ss.getSheets().forEach(function (f) {
      var nome = f.getName();
      var n = Math.max(0, f.getLastRow() - 1);
      // As folhas de cada ficha (desenhadas) entram pela importação das fichas.
      if (par[1] === ANTIGO_FICHAS && nome !== 'INDICE') {
        linhas.push([par[0], nome, n, 'FICHAS (ingredientes e preparação)', '', '', 'Folha de uma ficha: foi lida para a ficha completa.']);
        return;
      }
      var destino = DESTINO_DAS_ANTIGAS[nome];
      var cab = f.getLastColumn() ? f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0] : [];
      if (!destino) {
        linhas.push([par[0], nome, n, '— NÃO FOI TRAZIDA —', n ? n + ' linhas' : '', cab.join(', '),
          n ? '⚠ IMPORTANTE: esta folha não foi copiada para o ficheiro novo. Ver se o que tem é preciso.' : 'Folha vazia.']);
        return;
      }
      var faltam = '';
      var ids = idsDaFolha(f);
      if (ids && ids.length) {
        var m = idsNovosDe(destino);
        var em = ids.filter(function (id) { return !m[id]; });
        faltam = em.length ? em.length + ' de ' + ids.length + ' (ex.: ' + em.slice(0, 5).join(', ') + ')' : 'nenhum';
      } else if (ids === null) {
        faltam = 'sem coluna id: não dá para comparar linha a linha (antigas ' + n + ', no novo ' + Object.keys(idsNovosDe(destino)).length + ')';
      }
      var novas = colunasNovas(destino);
      var foraCols = cab.filter(function (c) { return c && novas.indexOf(semAcentos(c)) < 0; });
      linhas.push([par[0], nome, n, destino, faltam, foraCols.join(', '),
        faltam && faltam !== 'nenhum' && faltam.indexOf('sem coluna') < 0 ? '⚠ Há linhas antigas que não estão no novo.'
          : foraCols.length ? 'Os dados estão no novo. As colunas listadas podem estar só no «registo completo» ou ter-se perdido na cópia: ver.' : 'Tudo trazido.']);
    });
  });

  // 2. A cópia de segurança feita antes de apagar as folhas soltas.
  try {
    var pasta = pastaDasCopias(), fs = pasta.getFiles(), copia = null;
    while (fs.hasNext()) {
      var c = fs.next();
      if (c.getName().indexOf('antes de apagar as folhas antigas') >= 0 && (!copia || c.getDateCreated() > copia.getDateCreated())) copia = c;
    }
    if (!copia) linhas.push(['Cópia de segurança', '—', '', '', '', '', 'Não encontrei a cópia «antes de apagar as folhas antigas»: as folhas soltas nunca foram apagadas.']);
    else {
      var ssc = SpreadsheetApp.openById(copia.getId());
      ssc.getSheets().forEach(function (f) {
        var nome = f.getName();
        if (novo.getSheetByName(nome)) return;
        var n = Math.max(0, f.getLastRow() - 1);
        linhas.push(['Cópia de segurança (' + Utilities.formatDate(copia.getDateCreated(), 'Europe/Lisbon', 'dd/MM/yyyy HH:mm') + ')', nome, n,
          'apagada do novo', '', '', 'Folha apagada pela limpeza. Está inteira na cópia: ' + copia.getUrl()]);
      });
    }
  } catch (e) { linhas.push(['Cópia de segurança', '—', '', '', '', '', 'Erro a ler a cópia: ' + e]); }

  // 3. Preços e matérias-primas neste ficheiro.
  ['TABELA_PRECOS', 'PRECOS', 'MATERIAS_PRIMAS', 'PRECOS_A_REVER'].forEach(function (nome) {
    var n = 0;
    try { n = ler(nome, {}).length; } catch (e) {}
    linhas.push(['Ficheiro novo', nome, n, '', '', '',
      nome === 'TABELA_PRECOS' ? (n ? 'A tabela completa de preços da aplicação.' : 'Vazia: abra a aplicação como professor ou coordenação, com ligação à internet, para a preencher.')
      : nome === 'PRECOS' ? 'Só os preços revistos pela coordenação.' : nome === 'MATERIAS_PRIMAS' ? 'Só as matérias-primas acrescentadas pelos professores.' : 'Os preços que os professores pediram para rever.']);
  });

  var f = novo.getSheetByName('AUDITORIA') || novo.insertSheet('AUDITORIA', 0);
  f.clear();
  f.getRange(1, 1, linhas.length, linhas[0].length).setValues(linhas);
  f.getRange(1, 1, 1, linhas[0].length).setFontWeight('bold').setBackground('#1f1b16').setFontColor('#faf7f2');
  f.setFrozenRows(1);
  [140, 160, 60, 160, 240, 320, 420].forEach(function (w, i) { f.setColumnWidth(i + 1, w); });
  f.getRange(2, 1, Math.max(1, linhas.length - 1), linhas[0].length).setWrap(true).setVerticalAlignment('top');
  for (var r = 1; r < linhas.length; r++) {
    if (String(linhas[r][6]).indexOf('⚠') === 0) f.getRange(r + 1, 1, 1, linhas[0].length).setBackground('#fdecea');
  }
  try { f.showSheet(); novo.setActiveSheet(f); } catch (e) {}
  Logger.log('Auditoria feita: ' + (linhas.length - 1) + ' linhas na folha AUDITORIA. As vermelhas são as importantes.');
}

// ══════════════════════════════════════════════════════════════
// (v23.1) AS FOLHAS ANTIGAS DE CADA ALUNO ESTÃO NO SEPARADOR DA TURMA?
// ══════════════════════════════════════════════════════════════
// Corre  verificarAlunosAntigos  uma vez. Não apaga nem muda nada. Lê as
// folhas «8_Nome…» do ficheiro antigo do histórico, encontra as linhas com
// notas e vê se esses dias existem no ficheiro novo para esse aluno (as
// folhas de onde se faz o separador da turma). Resultado na folha
// VERIFICAR_ALUNOS. As folhas de teste («Aluno 1», «Aluno 9999»…) vêm
// marcadas como teste.

function dataDaCelula(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Europe/Lisbon', 'yyyy-MM-dd');
  var t = String(v || '').trim();
  var m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function verificarAlunosAntigos() {
  var antigo;
  try { antigo = SpreadsheetApp.openById(ANTIGO_HISTORICO); }
  catch (e) { Logger.log('Não consegui abrir o histórico antigo: ' + e); return; }

  // O que o ficheiro novo tem de cada aluno, por dia.
  var alunos = ler('ALUNOS', {});
  var planos = {}; ler('PLANOS', {}).forEach(function (p) { planos[p.id] = String(p.data || '').slice(0, 10); });
  var diasDoAluno = {};
  function marca(alunoId, dia) { if (!alunoId || !dia) return; (diasDoAluno[alunoId] = diasDoAluno[alunoId] || {})[dia] = true; }
  ler('AVALIACOES', {}).forEach(function (x) { marca(x.alunoId, String(x.data || '').slice(0, 10) || planos[x.planoAulaId]); });
  ler('VALIDACOES', {}).forEach(function (x) { marca(x.alunoId, planos[x.planoAulaId] || String(x.validadoEm || '').slice(0, 10)); });
  ler('SELECOES', {}).forEach(function (x) { if (!ehRegistoEspecial(x)) marca(x.alunoId, planos[x.planoAulaId] || String(x.criadaEm || '').slice(0, 10)); });
  ler('PRESENCAS', {}).forEach(function (x) { marca(x.alunoId, String(x.data || '').slice(0, 10) || planos[x.planoAulaId]); });

  var linhas = [['Folha antiga', 'Aluno no ficheiro novo', 'Linhas com notas', 'Dias com notas', 'Dias que estão no novo', 'Dias que faltam no novo', 'Exemplo de uma linha que falta', 'O que quer dizer']];
  antigo.getSheets().forEach(function (f) {
    var nome = f.getName();
    var m = nome.match(/^(\d+)_(.*)$/);
    if (!m) return;
    var numero = Number(m[1]), resto = m[2].replace(/_conflict\d+$/, '').trim();
    var teste = /^Aluno\b/.test(resto) || numero >= 99 || /Rosa Almeida/.test(resto);
    // As linhas com notas: começam por uma data.
    var d = f.getDataRange().getValues(), comNotas = [];
    d.forEach(function (l) { var dia = dataDaCelula(l[0]); if (dia && l.slice(1).some(function (v) { return String(v).trim() !== ''; })) comNotas.push({ dia: dia, linha: l }); });
    // O aluno no ficheiro novo: o nome começa da mesma maneira.
    var alvo = semAcentos(resto).slice(0, 12);
    var a = alunos.filter(function (x) { return alvo && semAcentos(x.nome).indexOf(alvo) === 0; })[0]
      || alunos.filter(function (x) { return Number(x.numero) === numero && alvo && semAcentos(x.nome).indexOf(alvo.slice(0, 5)) === 0; })[0];
    var dias = {}; comNotas.forEach(function (c) { dias[c.dia] = true; });
    var listaDias = Object.keys(dias).sort();
    var tem = a ? (diasDoAluno[a.id] || {}) : {};
    var estao = listaDias.filter(function (x) { return tem[x]; });
    var faltam = listaDias.filter(function (x) { return !tem[x]; });
    var exemplo = '';
    if (faltam.length) { var c1 = comNotas.filter(function (c) { return c.dia === faltam[0]; })[0]; exemplo = c1.linha.map(valorTexto).filter(function (v) { return v; }).join(' · '); }
    var quer = teste ? 'Folha de teste: não é preciso.'
      : !comNotas.length ? 'Sem notas: só o modelo vazio. Não é preciso.'
      : !a ? '⚠ Não encontrei este aluno no ficheiro novo. Ver.'
      : faltam.length ? '⚠ Há dias com notas que não estão no ficheiro novo nem no separador da turma.'
      : 'Está tudo no ficheiro novo (e no separador da turma).';
    linhas.push([nome, a ? (a.numero + ' ' + a.nome + ' (' + a.turmaId + ')') : '—', comNotas.length, listaDias.join(', '),
      estao.length, faltam.join(', '), exemplo, quer]);
  });

  var novo = ficheiro();
  var out = novo.getSheetByName('VERIFICAR_ALUNOS') || novo.insertSheet('VERIFICAR_ALUNOS', 0);
  out.clear();
  out.getRange(1, 1, linhas.length, linhas[0].length).setValues(linhas);
  out.getRange(1, 1, 1, linhas[0].length).setFontWeight('bold').setBackground('#1f1b16').setFontColor('#faf7f2');
  out.setFrozenRows(1);
  [180, 220, 80, 220, 80, 220, 320, 360].forEach(function (w, i) { out.setColumnWidth(i + 1, w); });
  out.getRange(2, 1, Math.max(1, linhas.length - 1), linhas[0].length).setWrap(true).setVerticalAlignment('top');
  for (var r = 1; r < linhas.length; r++) if (String(linhas[r][7]).indexOf('⚠') === 0) out.getRange(r + 1, 1, 1, linhas[0].length).setBackground('#fdecea');
  try { out.showSheet(); novo.setActiveSheet(out); } catch (e) {}
  Logger.log('Verificação feita: folha VERIFICAR_ALUNOS. As linhas com ⚠ são as que faltam.');
}

/** Copia para aqui uma folha que não foi trazida dos ficheiros antigos (tal e qual). */
function trazerFolhaAntiga(nomeDoFicheiro, nomeDaFolha) {
  var id = { historico: ANTIGO_HISTORICO, fichas: ANTIGO_FICHAS, planos: ANTIGO_PLANOS }[String(nomeDoFicheiro || '').toLowerCase()];
  if (!id) { Logger.log('Diz o ficheiro: historico, fichas ou planos.'); return; }
  var origem = SpreadsheetApp.openById(id).getSheetByName(nomeDaFolha);
  if (!origem) { Logger.log('Não há a folha «' + nomeDaFolha + '» nesse ficheiro.'); return; }
  var copia = origem.copyTo(ficheiro());
  copia.setName('ANTIGA ' + nomeDaFolha);
  Logger.log('Copiada como «ANTIGA ' + nomeDaFolha + '». Não mexe no ficheiro antigo.');
}

// ══════════════════════════════════════════════════════════════
// (v23.2) NADA ESCONDIDO: TUDO À VISTA E ARRUMADO
// ══════════════════════════════════════════════════════════════
// Rosa (out/2026): «não quero que as coisas estejam escondidas, quero que
// estejam organizadas». O que é de cada turma fica no separador da turma.
// O que é geral fica em folhas próprias, à vista, a seguir às turmas:
//   FICHAS TÉCNICAS      — todas as fichas, com o guião, e onde entraram
//                          (plano tal da turma tal, evento tal);
//   REQUISIÇÕES (todas)  — cada requisição e para que plano ou evento foi;
//   RECUPERAÇÕES (todas) — as recuperações de todas as turmas.
// Depois, as fichas por extenso («F …») e, no fim, as folhas de dados onde
// a aplicação grava (ler à vontade; não mexer).

var FOLHA_INDICE_FICHAS = 'FICHAS TÉCNICAS';
var FOLHA_LISTA_REQUISICOES = 'REQUISIÇÕES (todas)';
var FOLHA_LISTA_RECUPERACOES = 'RECUPERAÇÕES (todas)';
var FOLHA_EXTERNOS = 'EXTERNOS (recuperações)';
var COR_GERAL = '#2F5D8A';

function listaDeIds(v) {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string' && v) { try { var j = JSON.parse(v); if (Array.isArray(j)) return j.map(String); } catch (e) {} return v.split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  return [];
}

function diaPT(s) {
  // (v25.3) Uma data com hora (2026-09-23T23:00:00.000Z) lê-se na hora de Lisboa: é o dia 24.
  var x = String(s || '');
  if (/^\d{4}-\d{2}-\d{2}T/.test(x)) { try { return Utilities.formatDate(new Date(x), 'Europe/Lisbon', 'dd/MM/yyyy'); } catch (e) {} }
  var t = x.slice(0, 10).split('-'); return t.length === 3 ? t[2] + '/' + t[1] + '/' + t[0] : x;
}

/** Escreve uma folha geral: título, cabeçalho e linhas (a última coluna pode ser um link). */
function escreverFolhaGeral(ss, nome, titulo, cab, linhas, larguras, links, cores) {
  var f = ss.getSheetByName(nome) || ss.insertSheet(nome);
  f.clear();
  try { f.clearNotes(); } catch (e) {}
  f.getRange(1, 1).setValue(titulo + '  ·  atualizado a ' + agoraLisboa() + '  ·  só para ler: refaz-se sozinho de 10 em 10 minutos')
    .setFontWeight('bold').setFontColor(COR_GERAL);
  // (v25) O resumo do separador, logo a seguir ao título.
  var k = escreverSumario(f, 2, nome, cab.length);
  var lc = 2 + k, l1 = lc + 1;
  f.getRange(lc, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground(COR_GERAL).setFontColor('#ffffff').setWrap(true);
  if (linhas.length) {
    f.getRange(l1, 1, linhas.length, cab.length).setNumberFormat('@')
      .setValues(linhas.map(function (l) { return l.map(function (v) { return v === null || v === undefined ? '' : String(v); }); }))
      .setWrap(true).setVerticalAlignment('top');
    if (links) {
      var col = cab.length;
      f.getRange(l1, col, links.length, 1).setRichTextValues(links.map(function (alvo, i) {
        if (alvo === null || alvo === undefined) return [SpreadsheetApp.newRichTextValue().setText(String(linhas[i][col - 1] || '')).build()];
        var url = typeof alvo === 'string' ? alvo : '#gid=' + alvo;
        return [SpreadsheetApp.newRichTextValue().setText('abrir').setLinkUrl(url).build()];
      }));
    }
    // (v25) Uma cor por linha (por exemplo: a requisição que vale a verde, a substituída a vermelho).
    (cores || []).forEach(function (cor, i) { if (cor) f.getRange(l1 + i, 1, 1, cab.length).setBackground(cor); });
  }
  f.setFrozenRows(lc);
  (larguras || []).forEach(function (w, i) { f.setColumnWidth(i + 1, w); });
  try { f.setTabColor(COR_GERAL); } catch (e) {}
  return f;
}

/** As folhas gerais: fichas técnicas, requisições e recuperações. */
function escreverFolhasGerais(ss, dados) {
  ss = ss || ficheiro();
  dados = dados || {};
  var planos = (dados.planos || ler('PLANOS', {})).filter(function (p) { return p.estado !== 'arquivado'; });
  var eventos = ler('EVENTOS', {});
  var fichas = ler('FICHAS', {}).filter(function (f) { return f.nomePrato; });
  var requisicoes = ler('REQUISICOES', {});
  var recuperacoes = dados.recuperacoes || ler('RECUPERACOES', {});
  var alunos = {}; (dados.alunos || ler('ALUNOS', {})).forEach(function (a) { alunos[a.id] = a; });
  // (v24) Os alunos externos: nome e nº de processo.
  var externos = []; try { externos = ler('ALUNOS_EXTERNOS', {}); } catch (e) {}
  externos.forEach(function (a) { alunos[a.id] = { id: a.id, nome: a.nome, numero: a.numeroProcesso || '' }; });
  var planoPorId = {}; planos.forEach(function (p) { planoPorId[p.id] = p; });
  var eventoPorId = {}; eventos.forEach(function (e) { eventoPorId[e.id] = e; });
  var fichaPorId = {}; fichas.forEach(function (f) { fichaPorId[f.id] = f; });
  var descPlano = function (p) { return (p.turmaId || '') + ' · ' + diaPT(p.data) + ' · ' + (p.titulo || 'aula'); };
  var descEvento = function (e) { return 'Evento «' + (e.nome || e.Evento || 'sem nome') + '»' + (e.data ? ' · ' + diaPT(e.data) : ''); };

  // 1. Fichas técnicas: onde entrou cada uma.
  var usos = {};
  var usar = function (id, texto) { if (!id) return; (usos[id] = usos[id] || []); if (usos[id].indexOf(texto) < 0) usos[id].push(texto); };
  planos.forEach(function (p) { listaDeIds(p.fichasIds).forEach(function (id) { usar(id, 'Plano: ' + descPlano(p)); }); });
  eventos.forEach(function (e) {
    listaDeIds(e.fichasIds).forEach(function (id) { usar(id, descEvento(e)); });
    (Array.isArray(e.orcamentos) ? e.orcamentos : []).forEach(function (o) { listaDeIds(o.fichasIds).forEach(function (id) { usar(id, descEvento(e) + ' (orçamento «' + (o.nome || '') + '»)'); }); });
  });
  fichas.sort(function (a, b) { return String(a.nomePrato).localeCompare(String(b.nomePrato), 'pt'); });
  // (v25.3) As fichas por extenso ficam num ficheiro à parte, um separador
  // por ficha; «abrir» abre o separador da ficha.
  var irPara = {};
  try { irPara = escreverFichasPorExtenso(ss, fichas); } catch (e) { Logger.log('Fichas por extenso: ' + e); }
  var lf = [], gf = [];
  fichas.forEach(function (fi) {
    var fo = irPara[fi.id] || null;
    lf.push([fi.nomePrato, fi.classificacao || '', Array.isArray(fi.ucsAssociadas) ? fi.ucsAssociadas.join(', ') : (fi.ucsAssociadas || ''),
      fi.elaboradoPor || '', diaPT(fi.data), fi.numPorcoes || '', fi.textoGuia ? 'Sim' : 'Não',
      (usos[fi.id] || []).join('\n') || 'Ainda não entrou em nenhum plano nem evento', fo ? 'abrir' : 'sem folha: correr organizarFichas']);
    gf.push(fo);
  });
  escreverFolhaGeral(ss, FOLHA_INDICE_FICHAS, 'FICHAS TÉCNICAS E GUIÕES (' + fichas.length + ') · «abrir» abre a ficha por extenso, com o guião no fim, no ficheiro «' + NOME_FICHEIRO_FICHAS + '»',
    ['Ficha', 'Classificação', 'UC', 'Elaborado por', 'Data', 'Porções', 'Tem guião', 'Onde entrou', 'Ficha por extenso'], lf,
    [230, 120, 100, 140, 85, 65, 70, 380, 150], gf);

  // 2. Requisições: para que plano ou evento foi cada uma.
  requisicoes.sort(function (a, b) { return String(b.dataAula || b.data || '').localeCompare(String(a.dataAula || a.data || '')); });
  // (v25) Para o mesmo plano ou evento, vale a mais recente; as outras ficam
  // a vermelho, «substituída». Os produtos estão na própria linha.
  var quando = function (r) { return String(r.atualizadaEm || r.criadaEm || r.data || ''); };
  var maisRecente = {};
  requisicoes.forEach(function (r) {
    var alvo = r.eventoId ? 'e|' + r.eventoId + '|' + (r.orcamentoId || '') : r.planoAulaId ? 'p|' + r.planoAulaId : '';
    if (alvo && (!maisRecente[alvo] || quando(r) > quando(maisRecente[alvo]))) maisRecente[alvo] = r;
  });
  var valeRequisicao = function (r) {
    var alvo = r.eventoId ? 'e|' + r.eventoId + '|' + (r.orcamentoId || '') : r.planoAulaId ? 'p|' + r.planoAulaId : '';
    return !alvo || maisRecente[alvo] === r;
  };
  var qtd = function (v) { var n = Number(String(v).replace(',', '.')); return isNaN(n) ? String(v || '') : String(Math.round(n * 1000) / 1000).replace('.', ','); };
  var produtosDe = function (r) {
    return (Array.isArray(r.linhas) ? r.linhas : []).map(function (l) {
      return (l.produto || '') + ' — ' + qtd(l.quantidadeTotal) + ' ' + (l.unidade || '') + (l.custoTotal ? ' · ' + qtd(l.custoTotal) + ' €' : '');
    }).join('\n');
  };
  var cr = [];
  var lr = requisicoes.map(function (r) {
    var p = planoPorId[r.planoAulaId], e = eventoPorId[r.eventoId];
    var para = e ? descEvento(e) : p ? 'Plano: ' + descPlano(p) : (r.planoTitulo ? 'Plano: ' + r.planoTitulo : (r.planoAulaId ? 'Plano ' + r.planoAulaId + ' (já não existe)' : '—'));
    var nomesFichas = listaDeIds(r.fichasIds).map(function (id) { return fichaPorId[id] ? fichaPorId[id].nomePrato : ''; }).filter(Boolean).join(', ');
    var custo = Number(r.custoTotal);
    var vale = valeRequisicao(r);
    cr.push(vale ? '#DFF0D8' : '#F8D7DA');
    return [r.numero || '', diaPT(r.dataAula || r.data), r.turmaId || '', para, nomesFichas, produtosDe(r) || ((r.nLinhas || '') + ' produtos'),
      isNaN(custo) || !custo ? '' : String(Math.round(custo * 100) / 100).replace('.', ',') + ' €',
      vale ? 'Vale' + (r.estado ? ' (' + r.estado + ')' : '') : 'Substituída: não usar'];
  });
  escreverFolhaGeral(ss, FOLHA_LISTA_REQUISICOES, 'REQUISIÇÕES (' + requisicoes.length + ')',
    ['Nº', 'Data', 'Turma', 'Para', 'Fichas', 'Produtos (quantidade e custo)', 'Custo total', 'Estado'], lr, [70, 90, 80, 300, 220, 360, 95, 130], null, cr);

  // 3. Recuperações de todas as turmas.
  var lrec = recuperacoes.slice().sort(function (a, b) { return String(a.turmaId).localeCompare(String(b.turmaId)) || (Number((alunos[a.alunoId] || {}).numero) || 0) - (Number((alunos[b.alunoId] || {}).numero) || 0); })
    .map(function (r) { return linhaDeRecuperacao(r, alunos, planoPorId, true); });
  var crec = recuperacoes.slice().sort(function (a, b) { return String(a.turmaId).localeCompare(String(b.turmaId)) || (Number((alunos[a.alunoId] || {}).numero) || 0) - (Number((alunos[b.alunoId] || {}).numero) || 0); })
    .map(function (r) { return r.estado === 'concluida' ? '#DFF0D8' : r.estado === 'anulada' ? '#F8D7DA' : null; });
  escreverFolhaGeral(ss, FOLHA_LISTA_RECUPERACOES, 'RECUPERAÇÕES (' + recuperacoes.length + ') · de todas as turmas (cada turma tem as suas no seu separador; os alunos externos estão na turma EXTERNOS)',
    CAB_RECUPERACAO_GERAL, lrec, [80, 45, 200, 90, 90, 110, 300, 90, 260, 80, 90, 220], null, crec);

  // 4. (v24) Os alunos externos e as recuperações deles, por UC (a pauta de cada UC).
  var recExt = recuperacoes.filter(function (r) { return r.turmaId === 'EXTERNOS' && r.estado !== 'anulada'; })
    .sort(function (a, b) { return String(a.ucId).localeCompare(String(b.ucId)) || String((alunos[a.alunoId] || {}).nome || '').localeCompare(String((alunos[b.alunoId] || {}).nome || ''), 'pt'); });
  var porExt = {}; externos.forEach(function (a) { porExt[a.id] = a; });
  var lext = recExt.map(function (r) {
    var a = porExt[r.alunoId] || {};
    var feita = r.estado === 'concluida', n = Number(r.resultadoNota);
    return [r.ucId || '', r.ucNome || '', a.numeroProcesso || '', a.nome || r.nomeAluno || r.alunoId, [a.turmaOrigem, a.cursoOrigem].filter(Boolean).join(' · '),
      NOME_MODALIDADE[r.modalidade] || r.modalidade || '', r.descricaoPlano || '',
      (Array.isArray(r.entregas) ? r.entregas : []).map(function (e) { return diaPT(e.data) + ': ' + e.descricao; }).join('\n'),
      feita && !isNaN(n) ? String(n).replace('.', ',') : 'Em curso', feita && !isNaN(n) ? (Math.round(n) < 10 ? Math.round(n) + ' a)' : String(Math.round(n))) : '',
      diaPT(r.realizadaEm), r.professorAvaliador || ''];
  });
  escreverFolhaGeral(ss, FOLHA_EXTERNOS, 'ALUNOS EXTERNOS — RECUPERAÇÕES POR UC (' + externos.length + ' alunos, ' + recExt.length + ' recuperações) · a pauta de cada UC sai também da aplicação',
    ['UC', 'Nome da UC', 'Nº processo', 'Aluno', 'Origem', 'Como recupera', 'O que tem de fazer', 'O que entregou', 'Resultado', 'Classificação', 'Data', 'Professor'], lext,
    [80, 200, 90, 200, 160, 110, 260, 260, 75, 85, 85, 140]);
}

/** (v25) O que o aluno entregou numa recuperação: as entregas registadas e
 *  as evidências (folha EVIDENCIAS), numa só coluna. */
var EVID_POR_REC = null;
function entreguesDaRecuperacao(r) {
  if (!EVID_POR_REC) {
    EVID_POR_REC = {};
    try { ler('EVIDENCIAS', {}).forEach(function (e) { (EVID_POR_REC[e.recuperacaoId] = EVID_POR_REC[e.recuperacaoId] || []).push(diaPT(e.data) + ': ' + (e.descricao || e.tipo || 'evidência')); }); } catch (e) {}
  }
  var l = (Array.isArray(r.entregas) ? r.entregas : []).map(function (e) { return diaPT(e.data) + ': ' + (e.descricao || ''); })
    .concat(EVID_POR_REC[r.id] || []);
  return l.filter(function (x, i) { return l.indexOf(x) === i; }).join('\n');
}

/** (v25) Todas as fichas por extenso numa folha só, uma a seguir à outra
 *  (Rosa, out/2026: «não fica disperso, fica dentro de uma folha»). Copia o
 *  que está em cada folha «F …» (que fica escondida). Devolve, para cada
 *  ficha, o link que vai direto à linha onde ela começa. */
var FOLHA_FICHAS_EXTENSO = 'FICHAS POR EXTENSO';
var PROP_FICHEIRO_FICHAS = 'ECL_FICHEIRO_FICHAS';
var NOME_FICHEIRO_FICHAS = 'Avaliação ECL — Fichas técnicas por extenso';

/** (v25.3) O ficheiro à parte com as fichas por extenso, um separador por
 *  ficha (Rosa, out/2026: «numa folha só é difícil procurar»). Cria-o na
 *  mesma pasta do ficheiro principal, na primeira vez. */
function ficheiroDasFichas(ss) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_FICHEIRO_FICHAS);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { Logger.log('Ficheiro das fichas não abriu: ' + e); } }
  var novo = SpreadsheetApp.create(NOME_FICHEIRO_FICHAS);
  try {
    var pastas = DriveApp.getFileById(ss.getId()).getParents();
    if (pastas.hasNext()) DriveApp.getFileById(novo.getId()).moveTo(pastas.next());
  } catch (e) { Logger.log('Não movi o ficheiro das fichas: ' + e); }
  props.setProperty(PROP_FICHEIRO_FICHAS, novo.getId());
  return novo;
}

/** Copia cada folha «F …» (escondida no ficheiro principal) para o seu
 *  separador no ficheiro das fichas, só quando a ficha mudou. Devolve, para
 *  cada ficha, o link que abre o separador dela. */
function escreverFichasPorExtenso(ss, fichas) {
  // A folha antiga, com as fichas todas seguidas, sai do ficheiro principal.
  var velha = ss.getSheetByName(FOLHA_FICHAS_EXTENSO);
  if (velha) { try { ss.deleteSheet(velha); } catch (e) { Logger.log('Não apaguei ' + FOLHA_FICHAS_EXTENSO + ': ' + e); } }
  var alvo = ficheiroDasFichas(ss);
  var url = alvo.getUrl();
  // O índice (1.º separador): para cada ficha, a assinatura e o separador.
  var ind = alvo.getSheetByName('ÍNDICE') || alvo.insertSheet('ÍNDICE', 0);
  var antes = {};
  var vals = ind.getLastRow() > 3 ? ind.getRange(4, 1, ind.getLastRow() - 3, 6).getValues() : [];
  vals.forEach(function (l) { if (l[4]) antes[String(l[4])] = { sig: String(l[5]), gid: Number(l[3]) }; });
  var porGid = {}; alvo.getSheets().forEach(function (f) { porGid[f.getSheetId()] = f; });
  var usados = {}; var links = {}; var linhas = []; var t0 = Date.now();
  var nomeDoSeparador = function (fi) {
    var base = ((fi.fichaNum ? String(fi.fichaNum).replace(/^#?/, '#') + ' ' : '') + String(fi.nomePrato || 'Ficha')).replace(/[\[\]\*\?\/\\:]/g, ' ').slice(0, 80).trim();
    var n = base, i = 2; while (usados[n]) n = base + ' (' + (i++) + ')';
    usados[n] = true; return n;
  };
  fichas.forEach(function (fi) {
    var fo = ss.getSheetByName(fi.folha || nomeDaFolhaDaFicha(fi));
    if (!fo) return;
    var sig = String(fi.atualizadoEm || fi.data || '') + '|' + fo.getLastRow() + '|' + fo.getLastColumn();
    var nome = nomeDoSeparador(fi);
    var reg = antes[fi.id];
    var folha = reg ? porGid[reg.gid] : null;
    // Mais de 4 minutos: o resto fica para a volta seguinte (10 em 10 minutos).
    if ((!folha || reg.sig !== sig) && Date.now() - t0 < 240000) {
      var nova = fo.copyTo(alvo);
      if (folha) { try { alvo.deleteSheet(folha); } catch (e) {} }
      var mesmoNome = alvo.getSheetByName(nome); if (mesmoNome && mesmoNome.getSheetId() !== nova.getSheetId()) { try { alvo.deleteSheet(mesmoNome); } catch (e) {} }
      nova.setName(nome);
      try { nova.showSheet(); } catch (e) {}
      folha = nova; reg = { sig: sig, gid: nova.getSheetId() };
    } else if (folha && folha.getName() !== nome) { try { folha.setName(nome); } catch (e) {} }
    if (!folha) return;
    links[fi.id] = url + '#gid=' + folha.getSheetId();
    linhas.push([fi.nomePrato || '', fi.classificacao || '', diaPT(fi.data), folha.getSheetId(), fi.id, reg.sig]);
  });
  // Separadores de fichas que já não existem: saem.
  var vivos = {}; linhas.forEach(function (l) { vivos[l[3]] = true; });
  alvo.getSheets().forEach(function (f) {
    if (f.getName() === 'ÍNDICE' || vivos[f.getSheetId()]) return;
    try { alvo.deleteSheet(f); } catch (e) {}
  });
  // O índice, com links para cada separador.
  ind.clear();
  ind.getRange(1, 1).setValue('FICHAS TÉCNICAS POR EXTENSO (' + linhas.length + ')  ·  atualizado a ' + agoraLisboa() + '  ·  só para ler: é refeito pela aplicação')
    .setFontWeight('bold').setFontColor(COR_GERAL);
  ind.getRange(2, 1).setValue('Cada ficha está no seu separador. Carregue no nome para a abrir. As fichas mudam-se na aplicação, não aqui.').setFontStyle('italic');
  ind.getRange(3, 1, 1, 6).setValues([['Ficha', 'Classificação', 'Data', 'gid', 'id', 'versão']]).setFontWeight('bold').setBackground(COR_GERAL).setFontColor('#ffffff');
  if (linhas.length) {
    linhas.sort(function (a, b) { return String(a[0]).localeCompare(String(b[0]), 'pt'); });
    ind.getRange(4, 1, linhas.length, 6).setNumberFormat('@').setValues(linhas.map(function (l) { return l.map(String); }));
    ind.getRange(4, 1, linhas.length, 1).setRichTextValues(linhas.map(function (l) {
      return [SpreadsheetApp.newRichTextValue().setText(String(l[0])).setLinkUrl('#gid=' + l[3]).build()];
    }));
  }
  try { ind.hideColumns(4, 3); } catch (e) {}
  ind.setFrozenRows(3); ind.setColumnWidth(1, 320); ind.setColumnWidth(2, 140); ind.setColumnWidth(3, 100);
  try { alvo.setActiveSheet(ind); alvo.moveActiveSheet(1); } catch (e) {}
  return links;
}

var NOME_ESTADO_RECUP = { anulada: 'Anulada', em_curso: 'Em curso', concluida: 'Recuperado', pendente: 'Pendente', gerada: 'Por decidir', validada: 'Validada', nao_validada: 'Não validada', submetida: 'Entregue', em_analise: 'Em análise', devolvida: 'Devolvida' };
var NOME_MODALIDADE = { pratico: 'Exercício prático', teorico: 'Trabalho teórico', atividade: 'Numa atividade', outra: 'Outra' };
var CAB_RECUPERACAO_GERAL = ['Turma', 'Nº', 'Aluno', 'UC', 'Estado', 'Como recupera', 'O que tem de fazer', 'Prazo', 'O que entregou', 'Resultado', 'Feita em', 'Atividade'];
var CAB_RECUPERACAO_TURMA = CAB_RECUPERACAO_GERAL.slice(1);

function linhaDeRecuperacao(r, alunos, planoPorId, comTurma) {
  var a = alunos[r.alunoId] || {};
  var atv = r.atividadePlanoId && planoPorId[r.atividadePlanoId];
  var estado = r.quando === 'depois' && !r.modalidade && r.estado !== 'concluida' ? 'Fica para depois da UC' : (NOME_ESTADO_RECUP[r.estado] || r.estado || '');
  var linha = [a.numero || '', a.nome || r.nomeAluno || r.alunoId || '', r.ucId || '', estado, NOME_MODALIDADE[r.modalidade] || r.modalidade || '',
    r.descricaoPlano || '', diaPT(r.dataLimite), entreguesDaRecuperacao(r), r.resultadoNota === undefined || r.resultadoNota === '' ? '' : String(r.resultadoNota).replace('.', ','),
    diaPT(r.realizadaEm), atv ? diaPT(atv.data) + ' · ' + (atv.titulo || '') : ''];
  return comTurma ? [r.turmaId || ''].concat(linha) : linha;
}

/** Põe as turmas à frente e esconde o resto (não apaga). Os separadores
 *  «TURMA …» da v20 saem: foram substituídos por estes. */
function arrumarSeparadores(ss, nomesTurmas) {
  ss.getSheets().forEach(function (f) {
    var n; try { n = f.getName(); } catch (e) { return; }
    if (n.indexOf('TURMA ') === 0 && nomesTurmas.indexOf(n) < 0) { try { ss.deleteSheet(f); } catch (e) { Logger.log('Não apaguei ' + n + ': ' + e); } }
  });
  // (v25) Por ordem: as turmas; as folhas gerais (fichas, requisições,
  // recuperações…); os eventos, os telemóveis e os eliminados. As folhas de
  // dados onde a aplicação grava ficam no fim, ESCONDIDAS: o que têm está
  // agora dentro das turmas e das folhas gerais (Rosa, out/2026: «porque é
  // que está separado das turmas?»). As fichas «F …» também: estão todas
  // na folha FICHAS POR EXTENSO. Cada folha de dados tem o resumo na nota
  // da célula A1. Ver uma escondida: menu Ver → Folhas ocultas.
  var nomes = ss.getSheets().map(function (f) { return f.getName(); });
  var dasFichas = nomes.filter(function (n) { return /^F /.test(n); }).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
  var deDados = ORDEM_FOLHAS.map(function (p) { return p[0]; }).filter(function (n) { return VISIVEIS_SEMPRE.indexOf(n) < 0 && DADOS_A_VISTA.indexOf(n) < 0; });
  var ordem = nomesTurmas.concat(VISIVEIS_SEMPRE).concat(DADOS_A_VISTA).concat(deDados).concat(dasFichas);
  var esconder = deDados.concat(dasFichas);
  var visiveis = {}; nomesTurmas.concat(VISIVEIS_SEMPRE).concat(DADOS_A_VISTA).forEach(function (n) { visiveis[n] = true; });
  nomes.forEach(function (n) { if (ordem.indexOf(n) < 0 && n !== FOLHA_CODIGOS) ordem.push(n); });
  var pos = 1;
  ordem.forEach(function (n) {
    var f = ss.getSheetByName(n);
    if (!f) return;
    try {
      if (f.getIndex() !== pos) { ss.setActiveSheet(f); ss.moveActiveSheet(pos); }
      pos++;
    } catch (e) { Logger.log('Não arrumei ' + n + ': ' + e); }
  });
  // Mostrar primeiro (uma folha à vista tem de ficar sempre), esconder depois.
  ordem.forEach(function (n) { var f = ss.getSheetByName(n); if (f && visiveis[n] && f.isSheetHidden()) try { f.showSheet(); } catch (e) {} });
  esconder.forEach(function (n) { var f = ss.getSheetByName(n); if (f && !f.isSheetHidden()) try { f.hideSheet(); } catch (e) {} });
  try { notasDasFolhasDeDados(ss); } catch (e) {}
  var cod = ss.getSheetByName(FOLHA_CODIGOS);
  if (cod && !cod.isSheetHidden()) try { cod.hideSheet(); } catch (e) {}
  var primeira = ss.getSheetByName(nomesTurmas[0] || 'LEIA-ME');
  if (primeira) try { ss.setActiveSheet(primeira); } catch (e) {}
}


// ══════════════════════════════════════════════════════════════
// (v22) SEGURANÇA — os códigos e os PIN deixam de estar na aplicação
// ══════════════════════════════════════════════════════════════
// Os códigos dos professores, da coordenação e da área de eventos ficam na
// folha CODIGOS (escondida), que só a escola vê. A aplicação pergunta aqui
// se o código está certo. Os PIN dos alunos ficam na folha ALUNOS e só vão
// para quem entrou como professor ou coordenação (com o «token» da entrada).
// Muitas tentativas erradas seguidas bloqueiam 10 minutos.

var FOLHA_CODIGOS = 'CODIGOS';
var QUEM_TEM_CODIGO = ['Rosa Almeida', 'Mateus Freire', 'coordenadora', 'eventos'];

/** Corre-se uma vez: cria a folha CODIGOS. Depois escreve-se lá o código
 *  NOVO de cada um (os antigos estiveram à vista no código da aplicação). */
function criarFolhaCodigos() {
  var ss = ficheiro();
  var f = ss.getSheetByName(FOLHA_CODIGOS);
  if (!f) {
    f = ss.insertSheet(FOLHA_CODIGOS);
    f.getRange(1, 1, 1, 2).setValues([['quem', 'codigo']]).setFontWeight('bold');
    f.getRange(2, 1, QUEM_TEM_CODIGO.length, 1).setValues(QUEM_TEM_CODIGO.map(function (q) { return [q]; }));
    f.getRange('B:B').setNumberFormat('@');
    f.setColumnWidth(1, 200); f.setColumnWidth(2, 140);
  }
  f.showSheet(); ss.setActiveSheet(f);
  Logger.log('Folha CODIGOS pronta. Escreva na coluna «codigo» o código NOVO de cada pessoa (4 ou mais algarismos) e depois oculte a folha.');
}

function lerCodigos() {
  var f = ficheiro().getSheetByName(FOLHA_CODIGOS);
  var m = {};
  if (!f || f.getLastRow() < 2) return m;
  f.getRange(2, 1, f.getLastRow() - 1, 2).getValues().forEach(function (l) {
    var q = String(l[0] || '').trim(), c = String(l[1] || '').trim();
    if (q && c) m[q.toLowerCase()] = c;
  });
  return m;
}

/** Demasiadas tentativas erradas? (10 em 10 minutos, por pessoa) */
function bloqueado(chave, errou) {
  var cache = CacheService.getScriptCache();
  var k = 'tent_' + chave;
  var n = Number(cache.get(k) || 0);
  if (errou) { n++; cache.put(k, String(n), 600); }
  return n >= 10;
}

function entrarPessoal(quem, codigo) {
  quem = String(quem || '').trim();
  var codigos = lerCodigos();
  var certo = codigos[quem.toLowerCase()];
  // Ainda sem código novo na folha: a aplicação usa o que já usava.
  if (!certo) return { semCodigo: true };
  if (bloqueado('p_' + quem, false)) return { entrou: false, bloqueado: true };
  if (String(codigo || '').trim() !== certo) { bloqueado('p_' + quem, true); return { entrou: false }; }
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('tok_' + token, quem, 21600);   // 6 horas
  return { entrou: true, token: token };
}

function tokenValido(token) {
  return !!(token && CacheService.getScriptCache().get('tok_' + token));
}

function semPinsSemToken(lista, token) {
  if (tokenValido(token)) return lista;
  return lista.map(function (a) { var c = {}; for (var k in a) if (k !== 'pin') c[k] = a[k]; c.temPin = !!a.pin; return c; });
}

function entrarAluno(alunoId, pin) {
  alunoId = String(alunoId || '');
  var a = ler('ALUNOS', {}).filter(function (x) { return String(x.id) === alunoId; })[0];
  // Sem o aluno ou sem PIN no Sheets: a aplicação usa o que já usava.
  if (!a || !a.pin) return { semPin: true };
  if (bloqueado('a_' + alunoId, false)) return { entrou: false, bloqueado: true };
  if (String(pin || '').trim() !== String(a.pin).trim()) { bloqueado('a_' + alunoId, true); return { entrou: false }; }
  return { entrou: true };
}

/** Correr à mão: quantos alunos têm PIN no Sheets (por turma). */
function verPins() {
  var porTurma = {};
  ler('ALUNOS', {}).forEach(function (a) {
    if (a.ativo === false) return;
    var t = a.turmaId || '?';
    porTurma[t] = porTurma[t] || { com: 0, sem: [] };
    if (a.pin) porTurma[t].com++; else porTurma[t].sem.push(a.numero + ' ' + (a.nome || ''));
  });
  for (var t in porTurma) Logger.log(t + ': ' + porTurma[t].com + ' com PIN' + (porTurma[t].sem.length ? ' · SEM PIN: ' + porTurma[t].sem.join(', ') : ''));
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

  f.getRange('A3').setValue('Escreva aqui o nome (ou parte dele):').setFontWeight('bold');
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

// ══════════════════════════════════════════════════════════════
// (v25) O RESUMO DE CADA SEPARADOR (Rosa, out/2026)
// ══════════════════════════════════════════════════════════════
// Cada separador diz lá em cima: para que serve, de onde vêm os dados e
// para quem vão (alunos, professores, coordenação), e o que querem dizer
// as cores e os anulados. Nas folhas para ler, são as primeiras linhas.
// Nas folhas de dados (onde a aplicação grava, e que por isso não podem
// ter linhas a mais em cima), o resumo está na nota da célula A1 — e
// estas folhas ficam escondidas, porque o que têm está nas turmas.
var SUMARIOS = {
  TURMA: [
    'PARA QUE SERVE: o que falta fazer nesta turma e o ÍNDICE. Cada parte está na sua folha: carregue no nome para a abrir; em cada folha, «← Voltar ao índice» volta aqui. As partes são os alunos, as faltas (em horas e dia a dia), as notas de cada UC, as recuperações, as aulas, os grupos e o que os colegas disseram, e o que chegou a cada aluno (o que respondeu, a nota do professor e os casos à parte).',
    'DE ONDE VEM E PARA ONDE VAI: os alunos respondem no telemóvel; o professor valida na aplicação; a nota validada é a que o aluno vê e a que entra na nota da UC. A coordenação vê aqui o mesmo. Só para ler: refaz-se sozinho de 10 em 10 minutos; mexer aqui não muda nada na aplicação.',
    'CORES: verde = aula publicada, conta para a nota · roxo = atividade extra, só dá bónus. As aulas arquivadas não aparecem aqui: estão no Arquivo da aplicação. Faltas: F · Autoavaliou-se e falta validar: AA.'
  ],
  'FICHAS TÉCNICAS': [
    'PARA QUE SERVE: todas as fichas técnicas da escola, com o guião. Cada linha diz onde a ficha entrou (que plano, de que turma, ou que evento).',
    'DE ONDE VEM E PARA ONDE VAI: o professor faz a ficha na aplicação; os alunos veem-na no plano da aula e avaliam-se nas técnicas dela. «abrir» abre a ficha por extenso (com o guião no fim), no seu separador do ficheiro «Avaliação ECL — Fichas técnicas por extenso».',
    'CORES: sem cores. Uma ficha que ainda não entrou em nenhum plano nem evento diz isso na coluna «Onde entrou».'
  ],
  'FICHAS POR EXTENSO': [
    'PARA QUE SERVE: as fichas técnicas por extenso, uma a seguir à outra (ingredientes, preparação, técnicas avaliadas e o guião no fim). Chega-se a cada uma pelo «abrir» da folha FICHAS TÉCNICAS.',
    'DE ONDE VEM: das fichas gravadas na aplicação. Só para ler e imprimir.',
    'CORES: o nome de cada ficha aparece numa faixa escura.'
  ],
  'REQUISIÇÕES (todas)': [
    'PARA QUE SERVE: todas as requisições, com os produtos de cada uma, para que plano ou evento foram e quanto custam.',
    'DE ONDE VEM E PARA ONDE VAI: o professor faz a requisição na aplicação, a partir das fichas do plano; a coordenação usa-a para as compras. Corrigir uma requisição grava por cima da mesma.',
    'CORES: verde = a requisição que vale · vermelho = substituída por outra mais recente para o mesmo plano ou evento (não usar).'
  ],
  'RECUPERAÇÕES (todas)': [
    'PARA QUE SERVE: as recuperações de todas as turmas: o que o aluno tem de fazer, o prazo, o que entregou (evidências) e o resultado.',
    'DE ONDE VEM E PARA ONDE VAI: o professor da UC e a coordenação criam e registam na aplicação; o aluno vê o seu plano de recuperação. Cada turma tem também as suas no seu separador.',
    'CORES: verde = recuperado · vermelho = anulada · sem cor = em curso.'
  ],
  'EXTERNOS (recuperações)': [
    'PARA QUE SERVE: os alunos de fora das turmas que vêm recuperar UC, e as recuperações deles por UC (a pauta de cada UC).',
    'DE ONDE VEM E PARA ONDE VAI: o professor da UC e a coordenação registam na aplicação (o aluno não entra na aplicação). A pauta sai da aplicação, em PDF e Excel.',
    'CORES: sem cores. As recuperações anuladas não aparecem.'
  ],
  'LEIA-ME': [
    'PARA QUE SERVE: o mapa deste ficheiro — o que tem cada separador.',
    'Os separadores das turmas e as folhas gerais são para ler. As folhas de dados (escondidas) são onde a aplicação grava: não se mexe nelas.',
    'Para ver uma folha escondida: menu Ver → Folhas ocultas.'
  ]
};

/** O resumo das folhas de dados: vai para a nota da célula A1. */
var SUMARIO_DADOS = {
  ALUNOS: 'Os alunos de cada turma. A aplicação lê daqui quem é de que turma. Para ler: o separador da turma.',
  PLANOS: 'Os planos de aula e as atividades. Para ler: «AS AULAS» no separador da turma (verde conta, roxo atividade extra; as arquivadas só na aplicação).',
  SESSOES: 'Quando cada aula foi aberta e fechada aos alunos. Para ler: coluna «Aberta aos alunos» no separador da turma.',
  PRESENCAS: 'Quem entrou em cada aula, atrasos e farda. Para ler: presenças e faltas no separador da turma.',
  SELECOES: 'As autoavaliações que os alunos enviaram, inteiras (com as respostas às perguntas). Para ler: «O QUE CHEGOU A CADA ALUNO» no separador da turma.',
  AUTOAVALIACOES: 'As autoavaliações, uma competência por linha. Para ler: o separador da turma.',
  VALIDACOES: 'A validação do professor de cada autoavaliação (a nota da aula). Para ler: as notas e «O QUE CHEGOU A CADA ALUNO» no separador da turma.',
  VALIDACOES_NOTAS: 'As notas validadas, uma competência por linha. Para ler: o separador da turma.',
  AVALIACOES: 'Cada nota registada (aluno, competência, nota). É o percurso do aluno.',
  LIDERES_KF: 'Quem foi o líder do KitchenFlow em cada grupo. Para ler: «GRUPOS E COLEGAS» no separador da turma.',
  NOTAS_FINAIS: 'As notas finais das UC publicadas aos alunos. Para ler: «Nota final da UC» no separador da turma.',
  PAUTAS: 'As pautas enviadas.',
  RECUPERACOES: 'As recuperações. Para ler: RECUPERAÇÕES (todas) e o separador da turma.',
  EVIDENCIAS: 'O que cada aluno entregou numa recuperação. Para ler: coluna «O que entregou» em RECUPERAÇÕES (todas).',
  FICHAS: 'As fichas técnicas. Para ler: FICHAS TÉCNICAS (com links para o ficheiro das fichas por extenso).',
  REQUISICOES: 'As requisições. Para ler: REQUISIÇÕES (todas).',
  REQUISICAO_LINHAS: 'Os produtos de cada requisição. Para ler: coluna «Produtos» em REQUISIÇÕES (todas).',
  GRUPOS: 'Em que grupo esteve cada aluno em cada aula. Para ler: «GRUPOS E COLEGAS» no separador da turma.',
  GRUPOS_INFO: 'Cada grupo: a ficha que lhe calhou e se o professor validou. Para ler: o separador da turma.',
  AVALIACAO_PARES: 'O que cada aluno disse de cada colega do grupo (colabora, ouve, é flexível, conflito). Só o professor vê; não conta para a nota. Para ler: «GRUPOS E COLEGAS» no separador da turma.',
  COMANDAS: 'Registos antigos das comandas.',
  POR_ARRUMAR: 'O que falta passar para as folhas por extenso. Esvazia-se sozinha.',
  EVENTOS: 'Os eventos (pedido, orçamentos, estado).',
  TELEMOVEIS: 'Que telemóvel está ligado a cada aluno.',
  ELIMINADOS: 'O que foi apagado na aplicação: fica aqui registado e não volta.',
  NOTAS_APP: 'As notas como a aplicação as calcula (cada aula, média, bónus, nota da UC). O separador da turma usa-as. Atualiza-se quando um professor abre a aplicação.',
  EMAILS_ALUNOS: 'O email da escola de cada aluno, escrito por ele ao entrar na aplicação. Serve para os avisos de autoavaliação em falta.',
  AVISOS_EMAIL: 'Os avisos por email já enviados aos alunos (autoavaliações em falta). Cada aviso só se envia uma vez.',
  PRECOS: 'Os preços revistos das matérias-primas (coordenação). A aplicação usa-os na requisição.',
  PRECOS_A_REVER: 'Os preços que os professores pediram para rever. A coordenação revê na aplicação.',
  MATERIAS_PRIMAS: 'As matérias-primas que os professores acrescentaram na requisição. Chegam a todos os aparelhos.',
  TABELA_PRECOS: 'A tabela de preços completa que a aplicação usa (atualiza-se quando um professor abre a aplicação).',
  ALUNOS_EXTERNOS: 'Os alunos de fora das turmas que vêm recuperar UC. Para ler: EXTERNOS (recuperações).'
};

/** As folhas de dados que ficam à vista (Rosa, out/2026): fazem sentido à parte. */
var DADOS_A_VISTA = ['EVENTOS', 'TELEMOVEIS', 'ELIMINADOS'];

/** Escreve o resumo (3 linhas) a partir da linha «linha». Devolve quantas escreveu. */
function escreverSumario(f, linha, nome, largura) {
  var l = SUMARIOS[nome];
  if (!l) return 0;
  f.getRange(linha, 1, l.length, 1).setValues(l.map(function (x) { return [x]; }))
    .setFontColor('#444444').setFontStyle('italic').setFontSize(9).setWrap(false);
  try { f.getRange(linha, 1, l.length, Math.max(1, largura || 1)).setBackground('#F7F3EA'); } catch (e) {}
  return l.length;
}

/** Põe o resumo de cada folha de dados na nota da célula A1. */
function notasDasFolhasDeDados(ss) {
  Object.keys(SUMARIO_DADOS).forEach(function (n) {
    var f = ss.getSheetByName(n);
    if (!f) return;
    try { f.getRange(1, 1).setNote('ESTA FOLHA: ' + SUMARIO_DADOS[n] + '\n\nÉ aqui que a aplicação grava: não mexer, não ordenar, não apagar linhas.'); } catch (e) {}
  });
}

var ORDEM_FOLHAS = [
  ['LEIA-ME', '#7B2233'],
  ['ALUNOS', '#7B2233'], ['PLANOS', '#7B2233'], ['SESSOES', '#7B2233'], ['PRESENCAS', '#7B2233'],
  ['SELECOES', '#B5651D'], ['AUTOAVALIACOES', '#B5651D'], ['VALIDACOES', '#B5651D'], ['VALIDACOES_NOTAS', '#B5651D'],
  ['AVALIACOES', '#B5651D'], ['LIDERES_KF', '#B5651D'],
  ['NOTAS_FINAIS', '#3E7A31'], ['PAUTAS', '#3E7A31'], ['RECUPERACOES', '#3E7A31'], ['EVIDENCIAS', '#3E7A31'],
  ['FICHAS', '#2F5D8A'], ['REQUISICOES', '#2F5D8A'], ['REQUISICAO_LINHAS', '#2F5D8A'], ['PRECOS', '#2F5D8A'], ['PRECOS_A_REVER', '#2F5D8A'],
  ['GRUPOS', '#B5651D'], ['GRUPOS_INFO', '#B5651D'], ['AVALIACAO_PARES', '#B5651D'],
  ['EVENTOS', '#6B4C9A'], ['COMANDAS', '#6B4C9A'],
  ['TELEMOVEIS', '#777777'], ['PROCURAR', '#777777'], ['ELIMINADOS', '#777777'], ['POR_ARRUMAR', '#777777'], ['NOTAS_APP', '#777777'], ['EMAILS_ALUNOS', '#777777'], ['AVISOS_EMAIL', '#777777']
];

var LEIA_ME = [
  ['Folha', 'O que tem'],
  ['1º BCR, 3º ACP, …', 'Um separador por turma, só para ler: os alunos (presenças, faltas, atrasos, autoavaliações, média), as notas de cada UC (um aluno por linha, uma aula por coluna) e as aulas. Refaz-se sozinho de 10 em 10 minutos.'],
  ['FICHAS TÉCNICAS', 'Todas as fichas técnicas, com um link «abrir» para cada uma (a ficha por extenso, com o guião no fim, no ficheiro «Avaliação ECL — Fichas técnicas por extenso»).'],
  ['EXTERNOS (recuperações) · ALUNOS_EXTERNOS', 'Os alunos de fora das turmas que vêm recuperar UC, e as recuperações deles por UC (plano, o que entregaram, resultado, professor). A pauta de cada UC sai também da aplicação.'],
  ['TABELA_PRECOS', 'A tabela de preços completa da aplicação (todas as matérias-primas, com os preços que a aplicação usa). Atualiza-se sozinha quando um professor abre a aplicação. Sempre à vista.'],
  ['AUDITORIA', 'O que estava nos ficheiros antigos e não está aqui (corre auditarFolhasAntigas). As linhas vermelhas são as importantes.'],
  ['PRECOS / PRECOS_A_REVER', 'As matérias-primas com os preços revistos, e as que os professores pediram para rever. Sempre à vista.'],
  ['MATERIAS_PRIMAS', 'As matérias-primas que os professores acrescentaram na requisição. Chegam a todos os aparelhos. Sempre à vista.'],
  ['FICHAS TÉCNICAS · REQUISIÇÕES (todas) · RECUPERAÇÕES (todas)', 'As coisas gerais da escola, à vista a seguir às turmas: cada ficha diz onde entrou (plano, turma, evento); cada requisição diz para que plano ou evento foi; as recuperações de todas as turmas. Refazem-se sozinhas de 10 em 10 minutos.'],
  ['Como está arrumado (v25)', 'Cada separador tem em cima um resumo: para que serve, de onde vêm os dados, para quem vão e o que querem dizer as cores. Tudo de cada turma está no separador da turma (alunos, notas, recuperações, aulas, grupos e colegas, o que chegou a cada aluno). As fichas e os guiões estão em FICHAS TÉCNICAS, com um link para cada ficha no ficheiro «Avaliação ECL — Fichas técnicas por extenso»; as requisições, com os produtos, em REQUISIÇÕES (todas).'],
  ['Folhas de dados (escondidas, no fim)', 'ALUNOS, PLANOS, PRESENCAS, SELECOES, VALIDACOES, GRUPOS, AVALIACAO_PARES, FICHAS, REQUISICOES… : é onde a aplicação grava. Ficam escondidas porque o que têm está nas turmas e nas folhas gerais. Cada uma tem o resumo na nota da célula A1. Para ver: menu Ver → Folhas ocultas. Não mexer, não ordenar, não apagar linhas. À vista ficam só EVENTOS, TELEMOVEIS e ELIMINADOS.'],
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
  ['ELIMINADOS', 'O que foi apagado pela aplicação: fica aqui registado e não volta.'],
  ['POR_ARRUMAR', 'O que falta passar para as folhas por extenso. Esvazia-se sozinha logo a seguir a cada envio (e de 5 em 5 minutos).'],
  ['', ''],
  ['Regras', 'Não ordenar nem filtrar as folhas de dados durante as aulas. Para ver uma turma, usar o separador com o nome dela. As linhas ficam pela ordem em que foram criadas.']
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

var MUDAM_A_AULA = { plano: 1, eliminar_plano: 1, eliminar_do_plano: 1, sessao: 1, fechar_sessao: 1, anular_sessao: 1,
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

/** (v26.8) Quem do grupo já entrou na aula e já se avaliou: os colegas
 *  veem um visto verde na cara de cada um. Fica só na memória (6 horas),
 *  como os grupos: não se lê nenhuma folha. */
function guardarEstadoNaMemoria(x, tipo) {
  try {
    if (!x || !x.planoAulaId || !x.alunoId || ehRegistoEspecial(x)) return;
    if (tipo === 'presenca' && !(x.presente === true || x.presente === 'true')) return;
    var c = CacheService.getScriptCache();
    var chave = 'est_' + x.planoAulaId + '_' + x.alunoId;
    var est = {};
    try { est = JSON.parse(c.get(chave) || '{}'); } catch (e) { est = {}; }
    if (tipo === 'presenca') est.entrou = true; else est.avaliou = true;
    est.planoAulaId = String(x.planoAulaId); est.alunoId = String(x.alunoId);
    c.put(chave, JSON.stringify(est), MEMORIA_SEGUNDOS);
    var idx = [];
    try { idx = JSON.parse(c.get('estidx_' + x.planoAulaId) || '[]'); } catch (e) { idx = []; }
    if (idx.indexOf(String(x.alunoId)) < 0) { idx.push(String(x.alunoId)); c.put('estidx_' + x.planoAulaId, JSON.stringify(idx), MEMORIA_SEGUNDOS); }
  } catch (e) { Logger.log('guardarEstadoNaMemoria: ' + e); }
}

/** (v26.8) Os estados das aulas de hoje, para a resposta a «get_aula». */
function estadosDeHoje(planos) {
  var hoje = hojeLisboa(0), c = CacheService.getScriptCache(), out = [];
  var deHoje = planos.filter(function (p) { return String(p.data || '').slice(0, 10) === hoje; });
  if (!deHoje.length) return out;
  var indices = c.getAll(deHoje.map(function (p) { return 'estidx_' + p.id; }));
  var chaves = [];
  deHoje.forEach(function (p) {
    try { JSON.parse(indices['estidx_' + p.id] || '[]').forEach(function (a) { chaves.push('est_' + p.id + '_' + a); }); } catch (e) {}
  });
  if (!chaves.length) return out;
  var vals = c.getAll(chaves);
  for (var k in vals) { try { out.push(JSON.parse(vals[k])); } catch (e) {} }
  return out;
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
  try { o.estados = estadosDeHoje(aula.planos); } catch (e) {}
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
    var obj = abrirRegisto_(dados[i][iReg]);
    for (var c = 0; c < colunas.length; c++) {
      if (c === iReg || c === iEl) continue;
      var v = dados[i][c];
      if (v !== '' && v !== null && v !== undefined && obj[colunas[c]] === undefined) obj[colunas[c]] = valorTexto(v);
    }
    vivos.push(corrigirDatasInglesas_(obj));
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

/** (v25.3) O plano de uma ficha, para ler: «3º ACP · 23/09/2026 · Aula prática». */
var _planosParaFichas = null;
function descricaoDoPlanoDaFicha(id) {
  if (!id) return '';
  try {
    if (!_planosParaFichas) { _planosParaFichas = {}; ler('PLANOS', {}).forEach(function (p) { _planosParaFichas[p.id] = p; }); }
    var p = _planosParaFichas[id];
    return p ? [p.turmaId || '', diaPT(p.data), p.titulo || 'aula'].filter(Boolean).join(' · ') : 'Plano já não existe';
  } catch (e) { return ''; }
}

// ══════════════════════════════════════════════════════════════
// (v25.3) AVISOS POR EMAIL — autoavaliações em falta (Rosa, out/2026)
// ══════════════════════════════════════════════════════════════
// Todos os dias às 18h: a cada aluno que esteve numa aula dos últimos 7
// dias e não se autoavaliou, um email para o email da escola, com as aulas
// em falta. Enquanto não se autoavaliar, cada aula conta 0 na nota da UC.
// Cada aula só é avisada uma vez. Para ligar: correr  instalarAvisosPorEmail  uma vez.
var URL_APLICACAO = 'https://avaliacao-ecl.vercel.app';

function instalarAvisosPorEmail() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'avisarAutoavaliacoesEmFalta') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('avisarAutoavaliacoesEmFalta').timeBased().everyDays(1).atHour(18).inTimezone('Europe/Lisbon').create();
  Logger.log('Avisos por email ligados: todos os dias às 18h.');
}

function avisarAutoavaliacoesEmFalta() {
  try { avisarProfessoresFechoDasAulas_(); } catch (e) { Logger.log('Fecho das aulas por email: ' + e); }
  try { etiquetarEmailsDaAplicacao_(); } catch (e) { Logger.log('Etiqueta do Gmail: ' + e); }
  avisarAlunos_();
}

/** (v26.6) Os emails da aplicação ficam juntos no Gmail, na etiqueta «Avaliação ECL». */
function etiquetarEmailsDaAplicacao_() {
  var nome = 'Avaliação ECL';
  var l = GmailApp.getUserLabelByName(nome) || GmailApp.createLabel(nome);
  GmailApp.search('subject:"[Avaliação ECL]" -label:"' + nome + '"', 0, 100).forEach(function (t) { t.addLabel(l); });
}

/**
 * (v26.6) Fecho das aulas por email (Rosa, 6/out/2026): o mesmo que a janela da
 * aplicação — as autoavaliações por validar e as presenças por confirmar das
 * aulas dos últimos 7 dias. Um email por professor, só quando há alguma coisa.
 */
function avisarProfessoresFechoDasAulas_() {
  var hoje = hojeLisboa(0), desde = hojeLisboa(-7);
  var dono = '';
  try { dono = Session.getEffectiveUser().getEmail(); } catch (e) {}
  var emailDe = {};
  ler('EMAILS_PROFESSORES', {}).forEach(function (x) { if (x.nome && x.email) emailDe[String(x.nome).trim().toLowerCase()] = String(x.email).trim(); });
  if (!Object.keys(emailDe).length && dono) {
    guardar('EMAILS_PROFESSORES', { nome: 'Rosa Almeida', email: dono, atualizadoEm: new Date().toISOString() });
    emailDe['rosa almeida'] = dono;
  }
  var sessoes = {}; ler('SESSOES', {}).forEach(function (x) { if (x.abertaEm) sessoes[x.planoAulaId] = x; });
  var agoraMin = (function () { var h = Utilities.formatDate(new Date(), 'Europe/Lisbon', 'HH:mm').split(':'); return Number(h[0]) * 60 + Number(h[1]); })();
  var min = function (h) { var m = String(h || '').match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
  var planos = ler('PLANOS', {}).filter(function (p) {
    var dia = String(p.data || '').slice(0, 10), s = sessoes[p.id];
    if (p.eliminado || (p.estado !== 'publicado' && p.estado !== 'realizada') || dia < desde || dia > hoje || !s) return false;
    return dia < hoje || !!s.fechadaEm || (!isNaN(min(p.horaFim)) && agoraMin >= min(p.horaFim));
  });
  if (!planos.length) return;
  var teste = function (a) { return !a || Number(a.numero) === 99 || Number(a.numero) === 88 || /\bteste\b/i.test(String(a.nome || '')); };
  var alunos = ler('ALUNOS', {}).filter(function (a) { return a.ativo !== false && a.ativo !== 'false' && !a.removidoEm && !teste(a); });
  var pres = {}; ler('PRESENCAS', {}).forEach(function (x) { pres[x.alunoId + '|' + x.planoAulaId] = x; });
  var sel = {}; ler('SELECOES', {}).forEach(function (x) { var k = x.alunoId + '|' + x.planoAulaId; if (!sel[k] || String(x.criadaEm) > String(sel[k].criadaEm)) sel[k] = x; });
  var val = {}; ler('VALIDACOES', {}).forEach(function (x) { var k = x.alunoId + '|' + x.planoAulaId; if (!val[k] || String(x.validadoEm) > String(val[k].validadoEm)) val[k] = x; });
  var porProf = {};
  planos.forEach(function (p) {
    var daTurma = alunos.filter(function (a) { return a.turmaId === p.turmaId; });
    var porValidar = daTurma.filter(function (a) { var k = a.id + '|' + p.id; return sel[k] && !(val[k] && String(val[k].validadoEm) >= String(sel[k].criadaEm)); }).length;
    var casos = [];
    var s = sessoes[p.id];
    var tardia = Utilities.formatDate(new Date(s.abertaEm), 'Europe/Lisbon', 'yyyy-MM-dd') > String(p.data).slice(0, 10);
    if (!p.tipoEvento && p.contaAssiduidade !== false && p.contaAssiduidade !== 'false' && !tardia) {
      daTurma.forEach(function (a) {
        var k = a.id + '|' + p.id, x = pres[k];
        if (x && x.decisaoProfessor) return;
        var nome = (a.numero ? a.numero + '. ' : '') + (a.nome || '');
        if (!x || x.presente === false || x.presente === 'false') casos.push(nome + ' — não entrou (falta à aula toda?)');
        else if (x.atrasado === true || x.atrasado === 'true') casos.push(nome + ' — entrou atrasado' + (x.atrasadoMins ? ' (' + x.atrasadoMins + ' min)' : ''));
        else if (!sel[k]) casos.push(nome + ' — entrou e não se autoavaliou: esteve a aula toda?');
      });
    }
    if (!porValidar && !casos.length) return;
    var prof = String(p.professor || '').trim().toLowerCase() || 'rosa almeida';
    (porProf[prof] = porProf[prof] || []).push({ p: p, porValidar: porValidar, casos: casos });
  });
  var hojeTxt = Utilities.formatDate(new Date(), 'Europe/Lisbon', 'yyyy-MM-dd');
  var props = PropertiesService.getScriptProperties();
  Object.keys(porProf).forEach(function (prof) {
    var para = emailDe[prof] || (prof === 'rosa almeida' ? dono : '');
    if (!para || MailApp.getRemainingDailyQuota() < 1) return;
    if (props.getProperty('FECHO_EMAIL_' + prof) === hojeTxt) return;     // um por dia
    var itens = porProf[prof];
    var n = itens.reduce(function (t, i) { return t + i.porValidar + i.casos.length; }, 0);
    var corpo = 'Olá.\n\nNas aulas destes últimos dias ficou isto por fazer (faça-o enquanto se lembra do que aconteceu):\n\n'
      + itens.map(function (i) {
          return '■ ' + diaPT(i.p.data) + ' · ' + i.p.turmaId + ' · ' + (i.p.titulo || 'aula') + (i.p.ucId ? ' (' + i.p.ucId + ')' : '') + '\n'
            + (i.porValidar ? '   · ' + i.porValidar + (i.porValidar === 1 ? ' autoavaliação por validar' : ' autoavaliações por validar') + '\n' : '')
            + i.casos.map(function (c) { return '   · ' + c + '\n'; }).join('');
        }).join('\n')
      + '\nAbra a aplicação (' + URL_APLICACAO + '): a janela «Fecho das aulas» abre-se sozinha, e cada caso resolve-se com um toque.\n\nAvaliação ECL';
    try {
      MailApp.sendEmail({ to: para, subject: '[Avaliação ECL] Fecho das aulas: ' + n + (n === 1 ? ' coisa' : ' coisas') + ' por fazer', body: corpo, name: 'Avaliação ECL' });
      props.setProperty('FECHO_EMAIL_' + prof, hojeTxt);
    } catch (e) { Logger.log('Fecho das aulas para ' + prof + ': ' + e); }
  });
}

function avisarAlunos_() {
  var hoje = hojeLisboa(0), desde = hojeLisboa(-7);
  var emails = {};
  ler('EMAILS_ALUNOS', {}).forEach(function (e) { if (/@eclisboa\.net$/i.test(String(e.email || '').trim())) emails[e.alunoId] = String(e.email).trim(); });
  // (v26.6) Um email usado por vários alunos é o de um professor: não recebe os avisos dos alunos.
  var usos = {}; Object.keys(emails).forEach(function (k) { var e = emails[k].toLowerCase(); usos[e] = (usos[e] || 0) + 1; });
  Object.keys(emails).forEach(function (k) { if (usos[emails[k].toLowerCase()] > 1 || /^rosa\.almeida@/i.test(emails[k])) delete emails[k]; });
  var jaAvisados = {};
  ler('AVISOS_EMAIL', {}).forEach(function (a) { jaAvisados[a.alunoId + '|' + a.planoAulaId] = true; });
  var abertaEm = {}; ler('SESSOES', {}).forEach(function (s) { if (s.abertaEm) abertaEm[s.planoAulaId] = s.abertaEm; });
  var planos = ler('PLANOS', {}).filter(function (p) {
    var dia = String(p.data || '').slice(0, 10);
    return !p.tipoEvento && !p.eliminado && (p.estado === 'publicado' || p.estado === 'realizada') && dia >= desde && dia <= hoje && abertaEm[p.id];
  });
  if (!planos.length) return;
  var presencas = {}; ler('PRESENCAS', {}).forEach(function (x) { presencas[x.alunoId + '|' + x.planoAulaId] = x; });
  var respondeu = {}; ler('SELECOES', {}).forEach(function (s) { respondeu[s.alunoId + '|' + s.planoAulaId] = true; });
  var alunos = ler('ALUNOS', {}).filter(function (a) { return a.ativo !== false && a.ativo !== 'false' && !a.removidoEm; });
  var enviados = [];
  alunos.forEach(function (a) {
    if (!emails[a.id]) return;
    var emFalta = planos.filter(function (p) {
      if (p.turmaId !== a.turmaId) return false;
      var k = a.id + '|' + p.id;
      if (respondeu[k] || jaAvisados[k]) return false;
      var x = presencas[k];
      // Só quem esteve na aula: a falta já conta 0 por si.
      var dec = x ? (x.decisaoProfessor || '') : '';
      return !!x && dec !== 'falta_presenca' && (dec === 'sem_falta' || dec === 'falta_atraso' || dec === 'parcial' || (x.presente !== false && x.presente !== 'false'));
    });
    if (!emFalta.length || MailApp.getRemainingDailyQuota() < 1) return;
    var primeiro = String(a.nome || '').split(' ')[0];
    var lista = emFalta.map(function (p) { return '  · ' + diaPT(p.data) + ' — ' + (p.titulo || 'aula'); }).join('\n');
    var corpo = 'Olá, ' + primeiro + '.\n\n'
      + 'Ainda não te autoavaliaste ' + (emFalta.length === 1 ? 'nesta aula' : 'nestas aulas') + ':\n' + lista + '\n\n'
      + 'Enquanto não te autoavaliares, ' + (emFalta.length === 1 ? 'esta aula conta' : 'cada uma destas aulas conta') + ' 0 na tua nota da UC. '
      + 'A autoavaliação demora cerca de dois minutos: entra na aplicação em ' + URL_APLICACAO + ' e escolhe a aula no calendário.\n\n'
      + 'Bom trabalho,\nAvaliação ECL';
    try {
      MailApp.sendEmail({ to: emails[a.id], subject: 'Avaliação ECL: tens ' + (emFalta.length === 1 ? 'uma autoavaliação' : emFalta.length + ' autoavaliações') + ' por fazer', body: corpo, name: 'Avaliação ECL' });
      emFalta.forEach(function (p) { enviados.push({ id: a.id + '|' + p.id, alunoId: a.id, planoAulaId: p.id, email: emails[a.id], enviadoEm: new Date().toISOString() }); });
    } catch (e) { Logger.log('Email para ' + a.id + ' falhou: ' + e); }
  });
  if (enviados.length) guardarVarios('AVISOS_EMAIL', enviados);
  Logger.log('Avisos enviados: ' + enviados.length);
}
