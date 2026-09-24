// ============================================================
// Pauta final da UC — no modelo da escola (ECL.GAE.087.1)
// ============================================================
// A pauta sai preenchida a partir do que está na aplicação, no ficheiro
// modelo da escola (public/pauta_modelo.ods): os mesmos estilos, o logo,
// e fórmulas vivas — o professor pode corrigir uma nota no LibreOffice e
// o resto recalcula.
//
// - Cada plano de aula da UC é um produto (uma coluna com nota e nível).
//   Os pesos escolhe-os o professor antes de gerar.
// - Os 5 C's saem das avaliações validadas pelo professor:
//     CM Comprometido  presença em horas, pontualidade, ATI-001, ATI-010
//     CP Competente    os produtos (planos de aula), com os pesos
//     CL Colaborativo  ATI-009, ATI-008
//     CO Consciente    higiene (OBR), ATI-015, ATI-016, ATI-014
//     CR Criativo      ATI-004, ATI-021, ATI-012
// - Pesos dos 5 C's: CM 10% · CP 60% · CL 10% · CO 10% · CR 10%. O modelo
//   original deixava o CP fora do TOTAL (a fórmula lia uma coluna vazia)
//   e o CR sem peso; aqui ficam corrigidos.
// - Alunos com classificação negativa levam "a)" e a nota de rodapé.
// ============================================================
import JSZip from 'jszip';
import {
  getAlunos, getPlanosAulaPorTurma, getValidacoes, getSelecoes, getHistoricoAvaliacoes,
  getPlanosFaltadosPorUC, getAtividades, situacaoRecuperacaoUC, assiduidadeNaUC,
  notaFinalUC, participacoesDoAlunoNaUC, previsaoNota, horasDoPlano,
} from './backend';
import { calcularNotaPlano } from './types';
import { modulosDaTurma } from './cronograma';

// ── Os dados ─────────────────────────────────────────────────

export interface ProdutoPauta {
  planoId: string;
  titulo: string;
  data: string;
  horas: number;
  /** Peso no CP, em percentagem. O professor ajusta antes de gerar. */
  peso: number;
}

export interface LinhaPautaUC {
  alunoId: string;
  numero: number;
  nome: string;
  /** Atividades em que participou, no período do módulo. */
  atividades: number;
  /** Nota 0-20 de cada produto: 0 se faltou, null se ainda não validado. */
  produtos: (number | null)[];
  /** Nível 0-6 de cada C (o CP calcula-se na folha, a partir dos produtos). */
  cm: number | null;
  cl: number | null;
  co: number | null;
  cr: number | null;
  /** Média das autoavaliações do aluno, 0-20. */
  proposta: number | null;
  /** Nota final da UC, 0-20 — a mesma do ecrã "Notas da UC". */
  final: number | null;
}

export const PESOS_5C = { cm: 10, cp: 60, cl: 10, co: 10, cr: 10 } as const;

export const ATITUDES_5C = {
  cm: ['ATI-001', 'ATI-010'],
  cl: ['ATI-009', 'ATI-008'],
  co: ['ATI-015', 'ATI-016', 'ATI-014'],
  cr: ['ATI-004', 'ATI-021', 'ATI-012'],
} as const;

/** Nível do modelo: 0 N.R./N.O. · 2 Insuficiente · 4 Suficiente · 5 Bom · 6 Muito bom. */
export function nivelPauta(nota20: number | null): number | null {
  if (nota20 === null || isNaN(nota20)) return null;
  if (nota20 <= 0) return 0;
  return nota20 < 9.5 ? 2 : nota20 < 14 ? 4 : nota20 < 17 ? 5 : 6;
}

const media = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const hojeISO = () => new Date().toISOString().slice(0, 10);

/** Planos da UC que contam para a pauta: publicados e de aulas que já houve. */
export function produtosDaUC(turmaId: string, ucId: string): ProdutoPauta[] {
  const planos = getPlanosAulaPorTurma(turmaId)
    .filter(p => p.ucId === ucId && (p.estado === 'publicado' || (p.estado as string) === 'realizada')
      && String(p.data).slice(0, 10) <= hojeISO())
    .sort((a, b) => String(a.data).localeCompare(String(b.data))
      || String(a.horaInicio || '').localeCompare(String(b.horaInicio || '')));
  const horas = planos.map(p => horasDoPlano(p) || 1);
  const total = horas.reduce((a, b) => a + b, 0) || 1;
  // Proposta de pesos: pelas horas de cada plano. O professor muda à vontade.
  return planos.map((p, i) => ({
    planoId: p.id,
    titulo: p.titulo || p.ucNome || `Plano ${i + 1}`,
    data: String(p.data).slice(0, 10),
    horas: horasDoPlano(p),
    peso: Math.round((horas[i] / total) * 1000) / 10,
  }));
}

/** Nota 0-20 de um aluno num plano, a partir da validação do professor. */
function notaDoPlano(alunoId: string, planoId: string, tipo: string): number | null {
  const v: any = getValidacoes().find((x: any) => x.planoAulaId === planoId && x.alunoId === alunoId);
  if (!v) return null;
  if (typeof v.notaMedia20 === 'number') return v.notaMedia20;
  const cat = (id: string) => id?.startsWith('OBR_') ? 'OBR'
    : id?.startsWith('SUB-') || id?.startsWith('APP-') ? 'SUB'
    : id?.startsWith('KNW-') ? 'KNW' : id?.startsWith('INI-') ? 'INI' : 'ATI';
  const notas = (v.notas || []).map((n: any) => ({ categoria: cat(n.competenciaId) as any, nota: Number(n.nota) || 0 }));
  return notas.length ? calcularNotaPlano(notas, (tipo || 'pratico') as any).nota20 : null;
}

export function linhasDaPautaUC(turmaId: string, ucId: string, produtos: ProdutoPauta[]): LinhaPautaUC[] {
  const planos = getPlanosAulaPorTurma(turmaId);
  const tipoDe = (id: string) => (planos.find(p => p.id === id) as any)?.tipoPlanAula || 'pratico';
  const validados = getHistoricoAvaliacoes().filter(r =>
    r.turmaId === turmaId && r.ucId === ucId && r.validadoPor === 'professor');

  return getAlunos()
    .filter(a => a.turmaId === turmaId && a.ativo !== false)
    .sort((a, b) => a.numero - b.numero)
    .map(a => {
      const faltou = new Set(getPlanosFaltadosPorUC(a.id, ucId, turmaId).map(p => p.id));
      const regs = validados.filter(r => r.alunoId === a.id);
      // Notas 1-5 das competências, passadas a 0-20.
      const de = (ids: readonly string[]) => media(
        regs.filter(r => ids.includes(r.microcompetenciaId)).map(r => r.nota * 4));

      // CM: presença em horas, pontualidade e as atitudes de compromisso.
      const s = situacaoRecuperacaoUC(a.id, turmaId, ucId);
      const assid = assiduidadeNaUC(a.id, turmaId, ucId);
      const presenca20 = s.horasPrevistas > 0 ? s.presenca / 5 : null;
      const pontualidade20 = assid.presencas > 0 ? (1 - assid.atrasos / assid.presencas) * 20 : null;

      const obr = media(regs.filter(r => r.microcompetenciaId.startsWith('OBR_')).map(r => r.nota * 4));

      // Proposta do aluno: as suas autoavaliações nesta UC, pela mesma conta.
      const propostas = produtos.map(p => {
        const sel: any = getSelecoes().find((x: any) => x.planoAulaId === p.planoId && x.alunoId === a.id);
        if (!sel) return null;
        return previsaoNota((sel.autoavaliacoes || [])
          .map((x: any) => ({ competenciaId: x.competenciaId, nota: Number(x.nota) || 0 })), tipoDe(p.planoId))?.nota ?? null;
      });

      return {
        alunoId: a.id,
        numero: a.numero,
        nome: a.nome || `Aluno ${a.numero}`,
        atividades: participacoesDoAlunoNaUC(a.id, turmaId, ucId),
        produtos: produtos.map(p => {
          const n = notaDoPlano(a.id, p.planoId, tipoDe(p.planoId));
          if (n !== null) return Math.round(n * 10) / 10;
          return faltou.has(p.planoId) ? 0 : null;
        }),
        cm: nivelPauta(media([presenca20, pontualidade20, de(ATITUDES_5C.cm)])),
        cl: nivelPauta(de(ATITUDES_5C.cl)),
        co: nivelPauta(media([obr, de(ATITUDES_5C.co)])),
        cr: nivelPauta(de(ATITUDES_5C.cr)),
        proposta: (() => { const m = media(propostas); return m === null ? null : Math.round(m); })(),
        final: notaFinalUC(a.id, turmaId, ucId).final,
      };
    });
}

/** Atividades da turma no período do módulo — o total da coluna ATIV. */
export function atividadesDoModulo(turmaId: string, ucId: string): number {
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  return getAtividades().filter(a => {
    if (a.turmaId !== turmaId) return false;
    const d = String(a.data || '').slice(0, 10);
    return !mod?.dataInicio || !mod?.dataFim || (d >= mod.dataInicio && d <= mod.dataFim);
  }).length;
}

// ── O ficheiro .ods ──────────────────────────────────────────

export interface CabecalhoPauta {
  turma: string;
  disciplina: string;
  formador: string;
  ucId: string;
  ucNome: string;
  dataInicio: string;
  dataFim: string;
}

const esc = (s: string) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function letra(i: number): string {
  let s = '';
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s;
  return s;
}

const dataPT = (iso: string) => {
  const [a, m, d] = String(iso || '').slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
};

type Celula = {
  estilo?: string;
  texto?: string;
  numero?: number;
  percent?: number;
  formula?: string;
  span?: number;
  rowSpan?: number;
  xml?: string;           // conteúdo extra (o logo)
};

function celulaXml(c: Celula | null, cobertaEstilo = 'ce9'): string {
  if (c === null) return `<table:covered-table-cell table:style-name="${cobertaEstilo}"/>`;
  const at: string[] = [];
  if (c.estilo) at.push(`table:style-name="${c.estilo}"`);
  if (c.formula) at.push(`table:formula="${esc(c.formula)}"`);
  if (c.span && c.span > 1) at.push(`table:number-columns-spanned="${c.span}"`);
  if (c.rowSpan && c.rowSpan > 1) at.push(`table:number-rows-spanned="${c.rowSpan}"`);
  let corpo = c.xml || '';
  if (c.percent !== undefined) {
    at.push(`office:value-type="percentage" office:value="${c.percent}"`);
    corpo += `<text:p>${Math.round(c.percent * 1000) / 10}%</text:p>`;
  } else if (c.numero !== undefined) {
    at.push(`office:value-type="float" office:value="${c.numero}"`);
    corpo += `<text:p>${c.numero}</text:p>`;
  } else if (c.texto !== undefined && c.texto !== '') {
    at.push('office:value-type="string"');
    corpo += `<text:p>${esc(c.texto)}</text:p>`;
  }
  return `<table:table-cell ${at.join(' ')}>${corpo}</table:table-cell>`;
}

/** Uma linha: mapa coluna → célula; as colunas cobertas por um span ficam cobertas. */
function linhaXml(estiloLinha: string, cels: Map<number, Celula>, nCols: number, cobertas: Set<number>): string {
  let xml = `<table:table-row table:style-name="${estiloLinha}">`;
  for (let i = 0; i < nCols; i++) {
    const c = cels.get(i);
    if (c) xml += celulaXml(c);
    else if (cobertas.has(i)) xml += celulaXml(null);
    else xml += celulaXml({ estilo: i < 2 ? 'ce1' : 'ce10' });
  }
  return xml + '</table:table-row>';
}

export async function gerarPautaODS(opts: {
  cabecalho: CabecalhoPauta;
  produtos: ProdutoPauta[];
  linhas: LinhaPautaUC[];
  totalAtividades: number;
}): Promise<Blob> {
  const { cabecalho: cab, produtos, linhas, totalAtividades } = opts;
  const resp = await fetch('/pauta_modelo.ods');
  if (!resp.ok) throw new Error('Não encontrei o modelo da pauta.');
  const zip = await JSZip.loadAsync(await resp.arrayBuffer());
  const original = await zip.file('content.xml')!.async('string');

  const N = Math.max(1, produtos.length);
  // Colunas: A Nº · B Nome · C/D Ativ. · produtos (2 por plano) · 5 C's ·
  // TOTAL · RESULTADO (5) · PROPOSTA (2) · CLASSIF. (2)
  const cP = 4;                       // primeira coluna dos produtos (E)
  const c5 = cP + 2 * N;              // CM
  const cCM = c5, cCP = c5 + 1, cCL = c5 + 2, cCO = c5 + 3, cCR = c5 + 4;
  const cTot = c5 + 5, cRes = cTot + 1, cProp = cRes + 5, cClass = cProp + 2;
  const nCols = cClass + 2;
  const L = (col: number, row: number, abs = false) => abs ? `[.$${letra(col)}$${row}]` : `[.${letra(col)}${row}]`;

  const linhasXml: string[] = [];
  const nova = () => ({ cels: new Map<number, Celula>(), cob: new Set<number>() });
  const pos = (r: ReturnType<typeof nova>, col: number, c: Celula) => {
    r.cels.set(col, c);
    for (let k = 1; k < (c.span || 1); k++) r.cob.add(col + k);
  };

  // Logo do modelo, no mesmo sítio.
  const logo = (original.match(/<draw:frame[\s\S]*?<\/draw:frame>/) || [''])[0]
    .replace(/table:end-cell-address="[^"]*"/, 'table:end-cell-address="&apos;PAUTA DE DISCIPLINA&apos;.B5"');

  // Linhas 1-6: título, identificação e símbolos
  const colInfo = Math.max(cTot, c5 + 2), spanTitulo = Math.max(3, colInfo - 3);
  const info: [string, string][] = [
    ['Ano/Turma:', cab.turma], ['Disciplina:', cab.disciplina], ['Formador(a):', cab.formador],
  ];
  for (let i = 0; i < 6; i++) {
    const r = nova();
    if (i === 0) pos(r, 2, { estilo: 'ce8', texto: 'PAUTA DE AVALIAÇÃO: MÓDULO / UFCD', span: spanTitulo });
    if (i === 1) pos(r, 0, { estilo: 'ce1', xml: logo });
    if (i < 3) {
      pos(r, colInfo, { estilo: 'ce62', texto: info[i][0], span: 3 });
      pos(r, colInfo + 3, { estilo: 'ce69', texto: info[i][1], span: 7 });
    }
    if (i === 4) {
      pos(r, 2, { estilo: 'ce11', texto: 'SÍMBOLOS A UTILIZAR:', span: spanTitulo });
      pos(r, colInfo, { estilo: 'ce62', texto: 'Módulo / UFCD:', span: 3 });
      pos(r, colInfo + 3, { estilo: 'ce69', texto: `${cab.ucId} — ${cab.ucNome}`, span: 7 });
    }
    if (i === 5) {
      pos(r, 2, { estilo: 'ce12', texto: '0 - N.R./N.O.   2 - Insuficiente   4 - Suficiente   5 - Bom   6 - Muito bom', span: spanTitulo });
      pos(r, colInfo, { estilo: 'ce62', texto: 'Datas:', span: 3 });
      pos(r, colInfo + 3, { estilo: 'ce71', texto: dataPT(cab.dataInicio), span: 3 });
      pos(r, colInfo + 6, { estilo: 'ce75', texto: 'a' });
      pos(r, colInfo + 7, { estilo: 'ce81', texto: dataPT(cab.dataFim), span: 3 });
    }
    linhasXml.push(linhaXml(['ro1', 'ro2', 'ro3', 'ro3', 'ro4', 'ro5'][i], r.cels, nCols, r.cob));
  }

  // Linhas 7-11: legenda dos 5 C's
  const legenda: [string, string][] = [['CM', 'Comprometido'], ['CP', 'Competente'], ['CL', 'Colaborativo'], ['CO', 'Consciente'], ['CR', 'Criativo']];
  legenda.forEach(([sig, nome], i) => {
    const r = nova();
    pos(r, c5, { estilo: i === 4 ? 'ce51' : 'ce50', texto: sig });
    pos(r, c5 + 1, { estilo: i === 4 ? 'ce55' : 'ce54', texto: nome, span: 3 });
    if (i === 2) pos(r, cTot, { estilo: 'ce10', texto: 'Total Pond - Total de ponderação' });
    if (i === 3) pos(r, cTot, { estilo: 'ce10', texto: 'N - Nível' });
    linhasXml.push(linhaXml('ro3', r.cels, nCols, r.cob));
  });

  // Linha 12: cabeçalhos
  {
    const r = nova();
    pos(r, 0, { estilo: 'ce2', texto: 'Nº', rowSpan: 3 });
    pos(r, 1, { estilo: 'ce2', texto: 'NOME', rowSpan: 3 });
    pos(r, 2, { estilo: 'ce13', texto: 'ATIV.', span: 2 });
    pos(r, cP, { estilo: 'ce24', texto: 'PRODUTOS PARA AVALIAÇÃO (planos de aula)', span: 2 * N });
    pos(r, c5, { estilo: 'ce24', texto: 'Modelo 5 C´s', span: 5 });
    pos(r, cTot, { estilo: 'ce64', texto: 'TOTAL', rowSpan: 3 });
    pos(r, cRes, { estilo: 'ce13', texto: 'RESULTADO', span: 5, rowSpan: 3 });
    pos(r, cProp, { estilo: 'ce76', texto: 'PROPOSTA ALUNO', span: 2, rowSpan: 3 });
    pos(r, cClass, { estilo: 'ce76', texto: 'CLASSIF. ATRIBUÍDA', span: 2, rowSpan: 3 });
    linhasXml.push(linhaXml('ro6', r.cels, nCols, r.cob));
  }
  // Colunas cobertas pelos rowSpan das linhas 13 e 14
  const cobertasAbaixo = new Set<number>([0, 1, cTot, ...[0, 1, 2, 3, 4].map(k => cRes + k), cProp, cProp + 1, cClass, cClass + 1]);

  // Linha 13: nomes dos produtos e das siglas
  {
    const r = nova();
    cobertasAbaixo.forEach(c => r.cob.add(c));
    pos(r, 2, { estilo: 'ce13', texto: 'Total Pond' });
    pos(r, 3, { estilo: 'ce13', texto: 'N' });
    produtos.forEach((p, i) => pos(r, cP + 2 * i, {
      estilo: 'ce13', span: 2,
      texto: `${i + 1}. ${p.titulo}${p.data ? ` (${dataPT(p.data)})` : ''}`,
    }));
    if (!produtos.length) pos(r, cP, { estilo: 'ce13', span: 2, texto: 'Sem planos' });
    ['CM', 'CP', 'CL', 'CO', 'CR'].forEach((s, i) => pos(r, c5 + i, { estilo: 'ce39', texto: s }));
    linhasXml.push(linhaXml('ro7', r.cels, nCols, r.cob));
  }
  // Linha 14: total de atividades, pesos dos produtos e dos 5 C's
  const LP = 14;
  {
    const r = nova();
    cobertasAbaixo.forEach(c => r.cob.add(c));
    pos(r, 2, { estilo: 'ce14', numero: totalAtividades });
    pos(r, 3, { estilo: 'ce14', texto: 'N' });
    produtos.forEach((p, i) => {
      pos(r, cP + 2 * i, { estilo: 'ce36', percent: Math.round(p.peso * 10) / 1000 });
      pos(r, cP + 2 * i + 1, { estilo: 'ce14', texto: 'N' });
    });
    [PESOS_5C.cm, PESOS_5C.cp, PESOS_5C.cl, PESOS_5C.co, PESOS_5C.cr]
      .forEach((w, i) => pos(r, c5 + i, { estilo: 'ce52', percent: w / 100 }));
    linhasXml.push(linhaXml('ro8', r.cels, nCols, r.cob));
  }

  // Linhas dos alunos
  const primeira = 15;
  linhas.forEach((a, k) => {
    const R = primeira + k;
    const r = nova();
    pos(r, 0, { estilo: 'ce5', numero: a.numero });
    pos(r, 1, { estilo: 'ce5', texto: a.nome });
    pos(r, 2, { estilo: 'ce15', numero: a.atividades });
    pos(r, 3, {
      estilo: 'ce21',
      formula: `of:=IF(${L(2, LP, true)}<1;"";IF(${L(2, R)}<1;0;IF(${L(2, R)}<${L(2, LP, true)}*0.5;2;IF(${L(2, R)}<${L(2, LP, true)}*0.7;4;IF(${L(2, R)}<${L(2, LP, true)}*0.85;5;6)))))`,
    });
    const termos: string[] = [], pesos: string[] = [];
    produtos.forEach((_, i) => {
      const cv = cP + 2 * i, cn = cv + 1;
      const v = a.produtos[i];
      pos(r, cv, v === null ? { estilo: 'ce33' } : { estilo: 'ce33', numero: v });
      pos(r, cn, {
        estilo: 'ce31',
        formula: `of:=IF(ISBLANK(${L(cv, R)});"";IF(${L(cv, R)}<=0;0;IF(${L(cv, R)}<9.5;2;IF(${L(cv, R)}<14;4;IF(${L(cv, R)}<17;5;6)))))`,
      });
      // Um produto por validar não conta; uma falta conta 0.
      termos.push(`IF(ISBLANK(${L(cv, R)});0;${L(cn, R)}*${L(cv, LP, true)})`);
      pesos.push(`IF(ISBLANK(${L(cv, R)});0;${L(cv, LP, true)})`);
    });
    // CP: média ponderada dos níveis dos produtos
    pos(r, cCP, {
      estilo: 'ce57',
      formula: produtos.length
        ? `of:=IF((${pesos.join('+')})=0;"";ROUND((${termos.join('+')})/(${pesos.join('+')});1))`
        : 'of:=""',
    });
    const c5v: [number, number | null][] = [[cCM, a.cm], [cCL, a.cl], [cCO, a.co], [cCR, a.cr]];
    c5v.forEach(([c, v]) => pos(r, c, v === null ? { estilo: 'ce53' } : { estilo: 'ce53', numero: v }));
    // TOTAL: os 5 C's com os pesos; um C sem observação não entra na conta.
    const cs = [cCM, cCP, cCL, cCO, cCR];
    const vazio = (c: number) => `OR(ISBLANK(${L(c, R)});${L(c, R)}="")`;
    const num = cs.map(c => `IF(${vazio(c)};0;${L(c, R)}*${L(c, LP, true)})`).join('+');
    const den = cs.map(c => `IF(${vazio(c)};0;${L(c, LP, true)})`).join('+');
    pos(r, cTot, { estilo: 'ce65', formula: `of:=IF((${den})=0;"";ROUND((${num})/(${den});2))` });
    pos(r, cRes, {
      estilo: 'ce67', span: 5,
      formula: `of:=IF(${L(cTot, R)}="";"";IF(${L(cTot, R)}<3.5;"Módulo em atraso";IF(${L(cTot, R)}<4.5;"Suficiente";IF(${L(cTot, R)}<5.5;"Bom";"Muito bom"))))`,
    });
    pos(r, cProp, a.proposta === null ? { estilo: 'ce78', span: 2 } : { estilo: 'ce78', span: 2, numero: a.proposta });
    const f = a.final === null ? null : Math.round(a.final);
    pos(r, cClass, f === null ? { estilo: 'ce85', span: 2, texto: '—' }
      : f < 10 ? { estilo: 'ce85', span: 2, texto: `${f} a)` }
      : { estilo: 'ce85', span: 2, numero: f });
    linhasXml.push(linhaXml('ro3', r.cels, nCols, r.cob));
  });

  // Rodapé: a nota das negativas, assinatura e código do documento
  {
    const r = nova();
    linhasXml.push(linhaXml('ro3', r.cels, nCols, r.cob));
    const r1 = nova();
    if (linhas.some(a => a.final !== null && Math.round(a.final) < 10)) {
      pos(r1, 1, { estilo: 'ce10', texto: 'a) Classificação negativa — módulo em atraso.' });
    }
    linhasXml.push(linhaXml('ro3', r1.cels, nCols, r1.cob));
    const r2 = nova();
    pos(r2, c5, { estilo: 'ce23', texto: 'Assinatura Docente:' });
    pos(r2, cRes, { estilo: 'ce10', texto: 'Data:' });
    pos(r2, cRes + 1, { estilo: 'ce10', texto: dataPT(hojeISO()) });
    linhasXml.push(linhaXml('ro3', r2.cels, nCols, r2.cob));
    const r3 = nova();
    pos(r3, cProp, { estilo: 'ce10', texto: 'ECL.GAE.087.1' });
    linhasXml.push(linhaXml('ro3', r3.cels, nCols, r3.cob));
  }

  // Larguras das colunas: as do modelo para cada tipo de coluna.
  const colunas = [
    '<table:table-column table:style-name="co1" table:default-cell-style-name="Default"/>',
    '<table:table-column table:style-name="co2" table:default-cell-style-name="Default"/>',
    '<table:table-column table:style-name="co3" table:default-cell-style-name="Default"/>',
    '<table:table-column table:style-name="co4" table:default-cell-style-name="Default"/>',
    `<table:table-column table:style-name="co5" table:number-columns-repeated="${2 * N + 5}" table:default-cell-style-name="Default"/>`,
    `<table:table-column table:style-name="co8" table:default-cell-style-name="Default"/>`,
    `<table:table-column table:style-name="co9" table:number-columns-repeated="9" table:default-cell-style-name="Default"/>`,
  ].join('');

  const inicio = original.indexOf('<table:table ');
  const fim = original.indexOf('</table:table>') + '</table:table>'.length;
  const tabela = `<table:table table:name="PAUTA DE DISCIPLINA" table:style-name="ta1" table:print-ranges="&apos;PAUTA DE DISCIPLINA&apos;.A1:&apos;PAUTA DE DISCIPLINA&apos;.${letra(nCols - 1)}${primeira + linhas.length + 4}">`
    + colunas + linhasXml.join('') + '</table:table>';
  zip.file('content.xml', original.slice(0, inicio) + tabela + original.slice(fim));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.oasis.opendocument.spreadsheet' });
}

export function nomeFicheiroPauta(cab: CabecalhoPauta): string {
  return `Pauta ${cab.ucId} ${cab.turma}.ods`.replace(/[\\/:*?"<>|]/g, '-');
}
