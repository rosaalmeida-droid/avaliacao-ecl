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
//   - os conteúdos (do manual e do referencial) e as atividades;
//   - depois da aula, o que os alunos registaram: os temas que escolheram e
//     as fichas que fizeram, em vez do que estava só previsto;
//   - nada de nomes de alunos, juízos ou ocorrências (vão à parte).
// No 3.º ano, as aulas de PAP têm o seu próprio registo.
// ============================================================
import type { PlanoAula, FichaProducao, SelecaoAluno } from './types';
import { codigosDasLinhas, encontrarSubtecnica, encontrarAparelho, ATITUDES } from './compatECL';
import { triagemDoPlano, tipoDe, escolheTema, fasesDoTrabalho, aulaDePAP, type FaseProjeto, type TipoPAP } from './contextoAula';
import { manualDaUC, capituloDoCampo } from './bancoManuais';
import { getModulo } from './cronograma';
import { getReferencialUC } from './referencial811RA144';
import { getSelecoes, gruposDaAula } from './backend';
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
  acondicionar: 'acondicionamento', adaptar: 'adaptação', adequar: 'adequação', adotar: 'adoção', ajustar: 'ajuste',
  analisar: 'análise', aplicar: 'aplicação', apresentar: 'apresentação', aproveitar: 'aproveitamento', armazenar: 'armazenamento',
  avaliar: 'avaliação', calcular: 'cálculo', caracterizar: 'caracterização', classificar: 'classificação', comparar: 'comparação',
  compreender: 'compreensão', comunicar: 'comunicação', conceber: 'conceção', confecionar: 'confeção', conhecer: 'conhecimento',
  conservar: 'conservação', controlar: 'controlo', coordenar: 'coordenação', cumprir: 'cumprimento', definir: 'definição',
  descrever: 'descrição', desenvolver: 'desenvolvimento', determinar: 'determinação', distinguir: 'distinção', efetuar: 'realização',
  elaborar: 'elaboração', executar: 'execução', explicar: 'explicação', identificar: 'identificação', implementar: 'implementação',
  interpretar: 'interpretação', organizar: 'organização', planear: 'planeamento', preparar: 'preparação', prevenir: 'prevenção',
  produzir: 'produção', realizar: 'realização', reconhecer: 'reconhecimento', redigir: 'redação', registar: 'registo',
  relacionar: 'relação', selecionar: 'seleção', utilizar: 'utilização', usar: 'utilização', verificar: 'verificação',
};
const CONTRAI: [RegExp, string][] = [[/^a /, 'da '], [/^o /, 'do '], [/^as /, 'das '], [/^os /, 'dos '], [/^um /, 'de um '], [/^uma /, 'de uma ']];
/** «Selecionar e aplicar procedimentos» → «Seleção e aplicação de procedimentos». Sem verbo conhecido, fica como está. */
export function nominalizar(frase: string): string {
  const f = semPonto(frase);
  const m = f.match(/^([A-Za-zÀ-ú]+)(?:,? e ([a-zà-ú]+))?,? (.+)$/);
  if (!m) return maiuscula(f);
  const n1 = NOME_DO_VERBO[m[1].toLowerCase()];
  const n2 = m[2] ? NOME_DO_VERBO[m[2].toLowerCase()] : '';
  if (!n1 || (m[2] && !n2)) return maiuscula(f);
  let resto = m[3];
  const c = CONTRAI.find(([re]) => re.test(resto));
  resto = c ? resto.replace(c[0], c[1]) : `de ${resto}`;
  return maiuscula(`${n1}${n2 ? ` e ${n2}` : ''} ${resto}`);
}

// ── O que aconteceu na aula ───────────────────────────────────
// As escolhas dos alunos (autoavaliações) dizem que fichas fizeram e que
// temas trabalharam. Guardam-se por pouco tempo: o sumário pede-se muitas
// vezes seguidas (a lista da eSchooling, o plano, o aluno).
let cacheSelecoes: { em: number; porPlano: Map<string, SelecaoAluno[]> } | null = null;
function selecoesDoPlano(planoId: string): SelecaoAluno[] {
  if (!cacheSelecoes || Date.now() - cacheSelecoes.em > 3000) {
    const porPlano = new Map<string, SelecaoAluno[]>();
    try { for (const s of getSelecoes()) if (s.planoAulaId) porPlano.set(s.planoAulaId, [...(porPlano.get(s.planoAulaId) || []), s]); } catch { /* */ }
    cacheSelecoes = { em: Date.now(), porPlano };
  }
  return cacheSelecoes.porPlano.get(planoId) || [];
}
/** As fichas que os alunos fizeram (as escolhidas por eles ou pelos grupos). Vazio: não se sabe. */
function fichasFeitas(plano: PlanoAula, fichas: FichaProducao[]): FichaProducao[] {
  if (fichas.length <= 1) return fichas;
  const ids = new Set<string>(selecoesDoPlano(plano.id).map(s => s.fichaId).filter(Boolean) as string[]);
  try { for (const g of gruposDaAula(plano.id)) if (g.fichaId) ids.add(g.fichaId); } catch { /* */ }
  const feitas = fichas.filter(f => ids.has(f.id));
  return feitas.length ? feitas : fichas;
}
/** Os temas (capítulos do manual) que os alunos disseram ter trabalhado. */
function temasEscolhidos(plano: PlanoAula): string[] {
  const titulos = new Map<number, string>();
  for (const s of selecoesDoPlano(plano.id)) {
    for (const a of s.autoavaliacoes || []) {
      const cap = capituloDoCampo(a.competenciaId);
      if (cap) titulos.set(cap.capitulo.n, cap.capitulo.titulo);
    }
  }
  return [...titulos.entries()].sort((a, b) => a[0] - b[0]).map(([, t]) => t);
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
  const p: any = plano;
  const t = triagemDoPlano(plano);
  const tipo = t ? tipoDe(t) : String(p.tipoPlanAula || '').replace('_obr', '');
  const pap = aulaDePAP(t);
  const linhas: string[] = [];
  // A atividade (almoço pedagógico, buffet…) abre o sumário (auditoria 5/out/2026:
  // nunca entrava).
  const atividade = atividadeDoPlano(p);
  if (atividade) linhas.push(`${atividade}.`);

  // 1. A unidade, com a designação do referencial (ou a PAP).
  const unidade = designacaoDaUnidade(plano);
  if (pap) linhas.push('Prova de Aptidão Profissional (PAP).');
  else if (unidade) linhas.push(`${unidade}.`);
  // Atividade extra (concurso, catering, evento): o tipo e o nome.
  if (p.tipoEvento) {
    const nomeTipo = nomeDoTipoAtividade(p.tipoAtividade) || 'Atividade';
    const nome = semPonto(String(p.titulo || '').replace(/\s*[—–-]\s*\d{2}\/\d{2}\/\d{4}$/, ''));
    linhas.push(nome && nome.toLowerCase() !== nomeTipo.toLowerCase() ? `${nomeTipo}: ${nome}.` : `${nomeTipo}.`);
  }
  if (t?.continuaDe) linhas.push('Continuação do trabalho da aula anterior.');

  // 2. Os conteúdos: do manual (capítulos) e do referencial.
  const conh: { id?: string; texto: string; capitulo?: string; tema?: string }[] = Array.isArray(p.conhecimentosProf) ? p.conhecimentosProf : [];
  const md = manualDaUC(p.ucId);
  const caps = new Map<number, string>();
  const partes = new Set<string>();
  const soltos: string[] = [];
  for (const k of conh) {
    const cap = capituloDoCampo(String(k.id || ''));
    if (cap) { caps.set(cap.capitulo.n, cap.capitulo.titulo); if (cap.capitulo.parte) partes.add(cap.capitulo.parte); }
    else if (k.capitulo) caps.set(1000 + caps.size, String(k.capitulo).replace(/^Manual, cap\. \d+ — /i, ''));
    else soltos.push(nominalizar(k.texto));
  }
  const titulosCaps = [...caps.entries()].sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  const trabalho = !!t && escolheTema(t);
  const doManual = md ? `do Manual do Aluno «${md.titulo}»` : 'do Manual do Aluno';
  if (trabalho) {
    // Cada aluno (ou grupo) com o seu tema: depois da aula, os que escolheram.
    const escolhidos = temasEscolhidos(plano);
    const quem = t!.modo === 'individual' ? 'Trabalho individual sobre um tema' : 'Trabalho de grupo sobre temas';
    const NO_SUMARIO: Record<FaseProjeto, string> = {
      investigacao: 'investigação sobre o tema', desenvolvimento: 'desenvolvimento do trabalho',
      receita: 'desenvolvimento da receita e da ficha técnica', menu: 'criação do menu', requisicao: 'elaboração da requisição',
      apres_escrito: 'entrega do trabalho escrito', apres_oral: 'apresentação oral e defesa do trabalho',
      apres_digital: 'apresentação digital', apres_pratico: 'apresentação prática (confeção)',
    };
    linhas.push(`${quem} ${doManual}: ${lista(fasesDoTrabalho(t).map(f => NO_SUMARIO[f]))}.`);
    if (escolhidos.length) linhas.push(`${escolhidos.length === 1 ? 'Tema trabalhado' : 'Temas trabalhados'}: ${aspas(escolhidos)}.`);
    else if (titulosCaps.length && titulosCaps.length <= 6) linhas.push(`Temas à escolha: ${aspas(titulosCaps)}.`);
    else if (md) linhas.push(`Temas à escolha: ${titulosCaps.length ? `${titulosCaps.length} conteúdos` : 'todos os conteúdos'} ${doManual}.`);
  } else if (titulosCaps.length) {
    if (md && caps.size === md.capitulos.length) linhas.push(`Conteúdos: todos os capítulos ${doManual} (revisão).`);
    else if (titulosCaps.length > 6) linhas.push(`Conteúdos: ${titulosCaps.length} capítulos ${doManual}${partes.size && partes.size <= 3 ? ` (${lista([...partes])})` : ''}.`);
    else {
      if (partes.size === 1 && titulosCaps.length > 1) linhas.push(`Tema: ${[...partes][0]}.`);
      linhas.push(`${titulosCaps.length === 1 ? 'Conteúdo' : 'Conteúdos'}: ${aspas(titulosCaps)}.`);
    }
  }
  if (soltos.length) linhas.push(`${soltos.length === 1 ? 'Conteúdo' : 'Conteúdos'} do referencial: ${soltos.map(s => inicioPequeno(s)).join('; ')}.`);

  // 3. A produção: os pratos que se fizeram e as técnicas.
  const feitas = (tipo === 'pratico' || tipo === 'misto' || pap?.tipos.includes('pratica')) ? fichasFeitas(plano, fichas) : [];
  const pratos = feitas.map(f => semPonto(String(f.nomePrato || ''))).filter(Boolean).map(inicioPequeno);
  if (pap) linhas.push(...linhasDaPAP(pap.tipos, pap.entidade || '', pap.tipos.includes('pratica') ? pratos : []));
  else if (pratos.length) linhas.push(`Confeção de ${lista(pratos)}, segundo ${pratos.length === 1 ? 'a ficha técnica' : 'as fichas técnicas'}.`);
  if (feitas.length) {
    const tecnicas = [...new Set(feitas.flatMap((f: any) => [
      ...codigosDasLinhas(f.tecnicasSugeridas, 'SUB-').map(id => encontrarSubtecnica(id)?.nome || ''),
      ...codigosDasLinhas(f.aparelhosDetectados, 'APP-').map(id => encontrarAparelho(id)?.nome || ''),
    ]).filter(Boolean).map(x => inicioPequeno(semPonto(x))))];
    if (tecnicas.length) linhas.push(`Técnicas aplicadas: ${lista(tecnicas.slice(0, 8))}.`);
  }
  if (t?.servico && (tipo === 'pratico' || tipo === 'misto')) linhas.push('Serviço a clientes.');

  // 4. Aula atitudinal: as atitudes trabalhadas.
  if (tipo === 'atitudinal' && !pap && !p.tipoEvento) {
    const atitudes = ((p.compAdicionadas || []) as string[]).filter(id => id.startsWith('ATI-'))
      .map(id => ATITUDES.find(a => a.id === id)?.nome).filter(Boolean) as string[];
    const doQue = atitudes.length ? `trabalho das atitudes ${lista(atitudes.map(minuscula))}` : 'trabalho de atitudes profissionais';
    linhas.push(t?.onde === 'fora' ? `Atividade fora da escola: ${doQue}.` : `Dinâmica de grupo: ${doQue}.`);
  }

  // 5. Como se trabalhou (e quantos grupos houve).
  // Numa atividade extra ou numa visita/masterclass de PAP, a forma de trabalho não se diz.
  if (t && !trabalho && !p.tipoEvento && !pap?.tipos.some(x => x === 'visita' || x === 'masterclass')) {
    let nGrupos = 0;
    try { nGrupos = gruposDaAula(plano.id).length; } catch { /* */ }
    const como = t.trabalho === 'grupos' ? `Trabalho de grupo${nGrupos > 1 ? ` (${nGrupos} grupos)` : ''}`
      : t.trabalho === 'individual' ? 'Trabalho individual' : 'Trabalho em grande grupo';
    const onde = t.onde === 'fora' && tipo !== 'atitudinal' && !pap?.tipos.includes('visita') ? ', fora da escola' : '';
    linhas.push(`${como}${onde}.`);
  }
  if (tipo === 'teorico' && !trabalho && titulosCaps.length && t?.manual !== false) linhas.push('Leitura e análise do Manual do Aluno.');
  // Toda a aula de PAP deixa evidências, mesmo sem a parte escrita (Rosa, out/2026).
  if (pap) linhas.push('Registo de evidências para a PAP.');
  return linhas.join('\n');
}

/** O sumário da aula: o que o professor escreveu, ou o feito pela aplicação. */
export function sumarioDoPlano(plano: PlanoAula, fichas: FichaProducao[]): string {
  const escrito = String((plano as any).sumario || '').trim();
  return escrito || sumarioAutomatico(plano, fichas);
}
