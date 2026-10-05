// ============================================================
// Sumário feito pela aplicação
// ============================================================
// O professor não tem tempo para escrever sumários (Rosa, out/2026): a
// aplicação escreve-o a partir do que está no plano — o tipo de aula, o
// tema e os conteúdos do manual, os pratos e as técnicas das fichas, a
// forma de trabalho. O professor só o muda se quiser; enquanto não escrever
// o dele, vale este, e atualiza-se sozinho quando o plano muda.
//
// Escrito como no livro de sumários (Rosa, out/2026: «respeitando o
// referencial, a forma formal de fazer sumários numa escola e aquilo que
// aconteceu na aula»):
//   - a primeira linha é a unidade com a designação do referencial
//     («UFCD 16 – Planeamento e confeção de cozinha tradicional portuguesa»);
//   - frases nominais, curtas, terminadas em ponto («Confeção de…»);
//   - exatamente o que se pede ao aluno para avaliar (Rosa, out/2026): as
//     técnicas e as preparações base das fichas, os indicadores dos
//     conteúdos, as atitudes numa aula de atitudes, as fases do trabalho.
//     Sai das mesmas regras da autoavaliação (regrasDaAutoavaliacao), por
//     isso nasce com o plano, antes de o professor validar;
//   - nada de nomes de alunos, juízos ou ocorrências (vão à parte).
// No 3.º ano, as aulas de PAP têm o seu próprio registo.
// ============================================================
import type { PlanoAula, FichaProducao } from './types';
import { encontrarSubtecnica, encontrarAparelho, ATITUDES, nomeCompetencia, PREFIXO_TRABALHO_AULA } from './compatECL';
import { triagemDoPlano, tipoDe, fasesDoTrabalho, aulaDePAP, type FaseProjeto, type TipoPAP } from './contextoAula';
import { capituloDoCampo } from './bancoManuais';
import { getModulo, anoDaTurma } from './cronograma';
import { getReferencialUC } from './referencial811RA144';
import { contextoDoPlano } from './backend';
import { regrasDaAutoavaliacao } from './autoavaliacaoDaAula';
import { nomeDoTipoAtividade } from './eventosAvaliacao';

const semPonto = (t: string) => t.trim().replace(/[.;:]+$/, '');
const minuscula = (t: string) => t ? t[0].toLowerCase() + t.slice(1) : t;
/** Primeira letra pequena, exceto em siglas («HACCP») e nomes próprios curtos. */
const inicioPequeno = (t: string) => t.length > 1 && /[a-zà-ú]/.test(t[1]) ? minuscula(t) : t;
const maiuscula = (t: string) => t ? t[0].toUpperCase() + t.slice(1) : t;
const lista = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`;
const aspas = (xs: string[]) => lista(xs.map(x => `«${x}»`));

// ── Referencial ───────────────────────────────────────────────
/** A unidade como vem no referencial: «UFCD 16 – Planeamento e confeção…». */
export function designacaoDaUnidade(plano: PlanoAula): string {
  const p: any = plano;
  const id = String(p.ucId || '').trim();
  if (!id) return '';
  const nome = semPonto(getModulo(id)?.nome || getReferencialUC(id)?.nome || String(p.ucNome || ''));
  return nome ? `${id} – ${nome}` : id;
}

// Os conhecimentos do referencial vêm no infinitivo («Aplicar técnicas de
// limpeza»). No sumário escrevem-se como nome («Aplicação de técnicas…»).
const NOME_DO_VERBO: Record<string, string> = {
  'acondicionar': 'acondicionamento',
  'adaptar': 'adaptação',
  'adaptar-se': 'adaptação',
  'adequar': 'adequação',
  'adotar': 'adoção',
  'ajustar': 'ajuste',
  'ampliar': 'ampliação',
  'analisar': 'análise',
  'antecipar': 'antecipação',
  'aplicar': 'aplicação',
  'apresentar': 'apresentação',
  'aproveitar': 'aproveitamento',
  'armazenar': 'armazenamento',
  'assar': 'assadura',
  'assumir': 'assunção',
  'avaliar': 'avaliação',
  'calcular': 'cálculo',
  'caracterizar': 'caracterização',
  'classificar': 'classificação',
  'combinar': 'combinação',
  'comparar': 'comparação',
  'compensar': 'compensação',
  'compor': 'composição',
  'compreender': 'compreensão',
  'comunicar': 'comunicação',
  'conceber': 'conceção',
  'conduzir': 'condução',
  'confecionar': 'confeção',
  'conhecer': 'conhecimento',
  'conservar': 'conservação',
  'construir': 'construção',
  'consultar': 'consulta',
  'controlar': 'controlo',
  'converter': 'conversão',
  'coordenar': 'coordenação',
  'corrigir': 'correção',
  'cortar': 'corte',
  'cozer': 'cozedura',
  'cozinhar': 'confeção',
  'criar': 'criação',
  'cumprir': 'cumprimento',
  'decidir': 'decisão',
  'definir': 'definição',
  'deglacear': 'deglaçagem',
  'descascar': 'descasque',
  'descrever': 'descrição',
  'desenhar': 'desenho',
  'desenvolver': 'desenvolvimento',
  'desossar': 'desossa',
  'determinar': 'determinação',
  'detetar': 'deteção',
  'diagnosticar': 'diagnóstico',
  'diluir': 'diluição',
  'dimensionar': 'dimensionamento',
  'dispor': 'disposição',
  'distinguir': 'distinção',
  'dobrar': 'dobragem',
  'documentar': 'documentação',
  'dosear': 'doseamento',
  'efetuar': 'realização',
  'elaborar': 'elaboração',
  'empratar': 'empratamento',
  'enunciar': 'enunciação',
  'equilibrar': 'equilíbrio',
  'escalar': 'escalonamento',
  'escalonar': 'escalonamento',
  'escolher': 'escolha',
  'espessar': 'espessamento',
  'estabelecer': 'estabelecimento',
  'estabilizar': 'estabilização',
  'esticar': 'estiramento',
  'estimar': 'estimativa',
  'evitar': 'prevenção',
  'executar': 'execução',
  'explicar': 'explicação',
  'extrair': 'extração',
  'filetar': 'filetagem',
  'finalizar': 'finalização',
  'formar': 'formação',
  'fritar': 'fritura',
  'fundamentar': 'fundamentação',
  'garantir': 'garantia',
  'gerir': 'gestão',
  'grelhar': 'grelhagem',
  'guarnecer': 'guarnição',
  'higienizar': 'higienização',
  'identificar': 'identificação',
  'implementar': 'implementação',
  'incorporar': 'incorporação',
  'informar': 'informação',
  'integrar': 'integração',
  'interpretar': 'interpretação',
  'justificar': 'justificação',
  'ler': 'leitura',
  'ligar': 'ligação',
  'manter': 'manutenção',
  'manusear': 'manuseamento',
  'moldar': 'moldagem',
  'monitorizar': 'monitorização',
  'montar': 'montagem',
  'nomear': 'identificação',
  'obter': 'obtenção',
  'operar': 'operação',
  'ordenar': 'ordenação',
  'organizar': 'organização',
  'planear': 'planeamento',
  'porcionar': 'porcionamento',
  'preencher': 'preenchimento',
  'preparar': 'preparação',
  'preservar': 'preservação',
  'prestar': 'prestação',
  'prevenir': 'prevenção',
  'prever': 'previsão',
  'priorizar': 'priorização',
  'produzir': 'produção',
  'propor': 'proposta',
  'proteger': 'proteção',
  'quantificar': 'quantificação',
  'realizar': 'realização',
  'recolher': 'recolha',
  'reconhecer': 'reconhecimento',
  'redigir': 'redação',
  'reduzir': 'redução',
  'refletir': 'reflexão',
  'regenerar': 'regeneração',
  'registar': 'registo',
  'rejeitar': 'rejeição',
  'relacionar': 'relação',
  'resolver': 'resolução',
  'rever': 'revisão',
  'saltear': 'salteado',
  'seguir': 'cumprimento',
  'selar': 'selagem',
  'selecionar': 'seleção',
  'sequenciar': 'sequenciação',
  'servir': 'serviço',
  'sincronizar': 'sincronização',
  'situar': 'enquadramento',
  'sugerir': 'sugestão',
  'temperar': 'tempero',
  'trabalhar': 'trabalho',
  'transformar': 'transformação',
  'usar': 'utilização',
  'utilizar': 'utilização',
  'valorizar': 'valorização',
  'verificar': 'verificação',
};
const CONTRAI: [RegExp, string][] = [[/^a /, 'da '], [/^o /, 'do '], [/^as /, 'das '], [/^os /, 'dos '], [/^um /, 'de um '], [/^uma /, 'de uma ']];
/** «Selecionar e aplicar procedimentos» → «Seleção e aplicação de procedimentos». Sem verbo conhecido, fica como está. */
export function nominalizar(frase: string): string {
  const f = semPonto(frase);
  const m = f.match(/^([A-Za-zÀ-ú-]+)(?:,? e ([a-zà-ú]+))?,? (.+)$/);
  if (!m) return maiuscula(f);
  const n1 = NOME_DO_VERBO[m[1].toLowerCase()];
  const n2 = m[2] ? NOME_DO_VERBO[m[2].toLowerCase()] : '';
  if (!n1 || (m[2] && !n2)) return maiuscula(f);
  let resto = m[3];
  // «Distinguir afiar de assentar o gume» → «distinção entre afiar e assentar o gume».
  const entre = n1 === 'distinção' && !n2 ? resto.match(/^([a-zà-ú]+(?:ar|er|ir)) de (.+)$/) : null;
  if (entre) return maiuscula(`distinção entre ${entre[1]} e ${entre[2]}`);
  const c = CONTRAI.find(([re]) => re.test(resto));
  resto = c ? resto.replace(c[0], c[1]) : `de ${resto}`;
  return maiuscula(`${n1}${n2 ? ` e ${n2}` : ''} ${resto}`);
}

// ── PAP ───────────────────────────────────────────────────────
function linhasDaPAP(tipos: TipoPAP[], entidade: string, pratos: string[]): string[] {
  const e = entidade.trim();
  const L: Record<TipoPAP, string> = {
    investigacao: 'Investigação para o projeto da PAP.',
    pratica: pratos.length ? `Prova prática de preparação da PAP: confeção de ${lista(pratos)}, segundo as fichas técnicas.` : 'Prova prática de preparação da PAP.',
    relatorio: 'Elaboração do relatório escrito da PAP.',
    defesa: 'Preparação e ensaio da defesa oral da PAP.',
    patrocinios: 'Pesquisa e contacto com empresas para o patrocínio da PAP.',
    visita: e ? `Visita de estudo no âmbito da PAP: ${e}.` : 'Visita de estudo no âmbito da PAP.',
    masterclass: e ? `Masterclass no âmbito da PAP, com ${e}.` : 'Masterclass no âmbito da PAP.',
  };
  // Visita com masterclass, no mesmo sítio: uma frase só, sem repetir quem/onde.
  if (tipos.includes('visita') && tipos.includes('masterclass'))
    return [...tipos.filter(t => t !== 'visita' && t !== 'masterclass').map(t => L[t]),
      e ? `Visita de estudo e masterclass no âmbito da PAP: ${e}.` : 'Visita de estudo e masterclass no âmbito da PAP.'];
  return tipos.map(t => L[t]);
}

/** Atividades com serviço a clientes (almoço, jantar, buffet…). */
export function ehAtividadeComServico(tipoAtividade?: string): boolean {
  return /almo[çc]o|jantar|brunch|pequeno-almo|coffee|servi[çc]o real|catering|buffet/i.test(String(tipoAtividade || ''));
}
/** A atividade escolhida no plano, quando não é só o tipo de aula. */
const atividadeDoPlano = (p: any): string => {
  const a = String(p.tipoAtividade || '').trim();
  return a && !/^(Aula (prática|mista|teórica)|Outro)$/i.test(a) && !/^Dinâmica de grupo/i.test(a) ? a : '';
};

export function sumarioAutomatico(plano: PlanoAula, fichas: FichaProducao[]): string {
  // As regras da autoavaliação usam o sumário quando não há conhecimentos:
  // não se volta a entrar aqui.
  if (aCalcular.has(plano.id)) return '';
  aCalcular.add(plano.id);
  try { return montar(plano, fichas); } finally { aCalcular.delete(plano.id); }
}
const aCalcular = new Set<string>();

function montar(plano: PlanoAula, fichas: FichaProducao[]): string {
  const p: any = plano;
  const t = triagemDoPlano(plano);
  const pap = aulaDePAP(t);
  const ano = (anoDaTurma(plano.turmaId) || 1) as 1 | 2 | 3;
  // O que o aluno avalia nesta aula — as mesmas regras do telemóvel do aluno.
  const R = regrasDaAutoavaliacao(plano, fichas, { ctx: contextoDoPlano(plano), ano, temaEscolhido: null });
  const tipo = t ? tipoDe(t) : R.tipoPlanAula.replace('_obr', '');
  const linhas: string[] = [];

  // 1. A unidade, com a designação do referencial (ou a PAP, ou a atividade).
  const unidade = designacaoDaUnidade(plano);
  if (pap) linhas.push('Prova de Aptidão Profissional (PAP).');
  else if (unidade) linhas.push(`${unidade}.`);
  if (p.tipoEvento) {
    const nomeTipo = nomeDoTipoAtividade(p.tipoAtividade) || 'Atividade';
    const nome = semPonto(String(p.titulo || '').replace(/\s*[—–-]\s*\d{2}\/\d{2}\/\d{4}$/, ''));
    linhas.push(nome && nome.toLowerCase() !== nomeTipo.toLowerCase() ? `${nomeTipo}: ${nome}.` : `${nomeTipo}.`);
  }
  if (t?.continuaDe) linhas.push('Continuação do trabalho da aula anterior.');

  // 2. A produção: os pratos das fichas e o que delas se avalia.
  const tecnicasAvaliadas = !R.ehAtitudinal || !!R.tecnicasNaAtividade;
  const pratos = tecnicasAvaliadas && (tipo === 'pratico' || tipo === 'misto' || !!p.tipoEvento || !!pap?.tipos.includes('pratica'))
    ? fichas.map(f => semPonto(String(f.nomePrato || ''))).filter(Boolean).map(inicioPequeno) : [];
  if (pap) linhas.push(...linhasDaPAP(pap.tipos, pap.entidade || '', pap.tipos.includes('pratica') ? pratos : []));
  else if (pratos.length) linhas.push(`Confeção de ${lista(pratos)}, segundo ${pratos.length === 1 ? 'a ficha técnica' : 'as fichas técnicas'}.`);
  if (tecnicasAvaliadas) {
    const nome = (x: string) => inicioPequeno(semPonto(x));
    // Só o que tem nome (um código sem correspondência não vai para o sumário).
    const preps = R.appIds.slice(0, 4).map(id => encontrarAparelho(id)?.nome || '').filter(Boolean).map(nome);
    const tecs = [...R.subIds.slice(0, 8).map(id => encontrarSubtecnica(id)?.nome || ''),
      ...R.recursoIds.map(id => (encontrarSubtecnica(id) as any)?.nome || nomeCompetencia(id))]
      .filter(x => x && !/^[A-Z]{2,}-[\w-]+$/.test(x)).map(nome).filter(x => !preps.includes(x));
    if (preps.length) linhas.push(`${preps.length === 1 ? 'Preparação base' : 'Preparações base'}: ${lista([...new Set(preps)])}.`);
    if (tecs.length) linhas.push(`${tecs.length === 1 ? 'Técnica' : 'Técnicas'}: ${lista([...new Set(tecs)])}.`);
  }
  if (t?.servico && (tipo === 'pratico' || tipo === 'misto')) linhas.push('Serviço a clientes.');

  // 3. Os conhecimentos: os indicadores de cada conteúdo, como o aluno os avalia.
  if (R.escolheTema) {
    const temas = R.temasPossiveis.map(x => x.capitulo.titulo);
    if (t?.modo === 'grupo' || t?.modo === 'individual') {
      const NO_SUMARIO: Record<FaseProjeto, string> = {
        investigacao: 'investigação sobre o tema', desenvolvimento: 'desenvolvimento do trabalho',
        receita: 'desenvolvimento da receita e da ficha técnica', menu: 'criação do menu', requisicao: 'elaboração da requisição',
        apres_escrito: 'entrega do trabalho escrito', apres_oral: 'apresentação oral e defesa do trabalho',
        apres_digital: 'apresentação digital', apres_pratico: 'apresentação prática (confeção)',
      };
      const quem = t.modo === 'individual' ? 'Trabalho individual sobre um tema do Manual do Aluno' : 'Trabalho de grupo sobre temas do Manual do Aluno';
      linhas.push(`${quem}: ${lista(fasesDoTrabalho(t).map(f => NO_SUMARIO[f]))}.`);
    }
    // Os critérios estão escritos para o aluno («a minha parte»); no sumário, em forma de escola.
    const FORMAL: Record<string, string> = {
      'a minha parte': 'contributo de cada aluno', 'explicar enquanto faço': 'explicação durante a execução',
      'explicar sem ler': 'exposição sem leitura', 'preparar e pôr a funcionar': 'preparação e funcionamento',
      'aproveitar o tempo da aula': 'aproveitamento do tempo da aula', 'escrever o menu': 'redação do menu',
      'o material do trabalho': 'material do trabalho',
    };
    const porParte = new Map<string, string[]>();
    for (const k of R.conhecimentos.filter(k => !capituloDoCampo(k.id))) {
      const n = semPonto(k.nome);
      porParte.set(k.capitulo || '', [...(porParte.get(k.capitulo || '') || []), FORMAL[n] || n]);
    }
    const criterios = [...porParte].map(([parte, xs], i) => `${parte ? `${i ? minuscula(parte) : parte}: ` : ''}${lista(xs)}`);
    if (criterios.length) linhas.push(`Critérios de avaliação do trabalho: ${criterios.join('; ')}.`);
    linhas.push(temas.length && temas.length <= 8 ? `${t?.modo === 'grupo' || t?.modo === 'individual' ? 'Temas' : 'Conteúdos'} à escolha de cada aluno: ${aspas(temas)}.`
      : `Temas à escolha de cada aluno: ${temas.length ? `${temas.length} conteúdos` : 'todos os conteúdos'} do Manual do Aluno.`);
  } else {
    const porConteudo = new Map<string, string[]>();
    const soltos: string[] = [];
    for (const k of R.conhecimentos) {
      if (k.id.startsWith(PREFIXO_TRABALHO_AULA)) continue;
      const cap = capituloDoCampo(k.id);
      const titulo = cap ? cap.capitulo.titulo : k.capitulo ? String(k.capitulo).replace(/^Manual, cap\. \d+ — /i, '') : '';
      if (titulo) porConteudo.set(titulo, [...(porConteudo.get(titulo) || []), inicioPequeno(nominalizar(k.nome))]);
      else soltos.push(inicioPequeno(nominalizar(k.nome)));
    }
    for (const [titulo, inds] of porConteudo) linhas.push(`«${titulo}»: ${inds.join('; ')}.`);
    if (soltos.length) linhas.push(`${soltos.length === 1 ? 'Conhecimento' : 'Conhecimentos'}: ${soltos.join('; ')}.`);
  }

  // 4. As atitudes, quando são elas que se avaliam (aula de atitudes, atividade).
  if ((R.ehAtitudinal || p.tipoEvento) && R.atitudesDaAula.length) {
    const nomes = R.atitudesDaAula.map(id => ATITUDES.find(a => a.id === id)?.nome).filter(Boolean).map(x => minuscula(String(x)));
    const doQue = `${nomes.length === 1 ? 'atitude' : 'atitudes'} ${lista(nomes)}`;
    linhas.push(p.tipoEvento ? `Atitudes avaliadas: ${lista(nomes)}.` : t?.onde === 'fora' ? `Atividade fora da escola: ${doQue}.` : `Dinâmica de grupo: ${doQue}.`);
  }

  // 5. Como se trabalha (o que decide as perguntas do trabalho com os colegas).
  if (t && !R.escolheTema && !p.tipoEvento && !pap?.tipos.some(x => x === 'visita' || x === 'masterclass')) {
    const como = t.trabalho === 'grupos' ? 'Trabalho de grupo' : t.trabalho === 'individual' ? 'Trabalho individual' : 'Trabalho em grande grupo';
    linhas.push(`${como}${t.onde === 'fora' && tipo !== 'atitudinal' ? ', fora da escola' : ''}.`);
  }
  // Toda a aula de PAP deixa evidências, mesmo sem a parte escrita (Rosa, out/2026).
  if (pap) linhas.push('Registo de evidências para a PAP.');
  return linhas.join('\n');
}

/** O sumário da aula: o que o professor escreveu, ou o feito pela aplicação. */
export function sumarioDoPlano(plano: PlanoAula, fichas: FichaProducao[]): string {
  const escrito = String((plano as any).sumario || '').trim();
  return escrito || sumarioAutomatico(plano, fichas);
}
