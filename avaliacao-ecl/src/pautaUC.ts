// ============================================================
// Pauta final da UC — no modelo da escola (ECL.GAE.087.1)
// ============================================================
// A pauta é EXATAMENTE o modelo da escola. O ficheiro Excel parte de
// public/pauta_modelo.xlsx, que é o modelo original convertido célula a
// célula (fontes, cores, bordas, alinhamentos, larguras, alturas,
// junções e fórmulas). A aplicação só preenche as células de dados; o
// resto do modelo fica como está. O PDF é desenhado a partir da mesma
// grelha (src/pautaModelo.json) com os mesmos valores.
//
// Duas correções ao modelo, sem mudar o formato nem a fórmula do TOTAL:
//   - a coluna 60% do CP (U), que o TOTAL lê, estava vazia: passa a ter o
//     CP arredondado à unidade (=ROUND(T)); sem isto não chegava ao TOTAL;
//   - o CR não tinha peso (X14 vazio): os 5 C's somavam 90%.
//
// O que a aplicação calcula:
//   - PRODUTOS: um Plano de Avaliação por coluna (7 no modelo; com mais
//     planos, a pauta ganha colunas).
//     Uma aula a que o aluno faltou conta 0 (ou a nota da recuperação).
//   - PONDERAÇÃO (linha 9): cada produto pesa pelo número de elementos
//     (competências) efetivamente avaliados nele. Um produto sem
//     avaliação pesa 0%.
//   - 5 C's: saem das atitudes observadas e validadas ao longo da UC,
//     cada atitude ligada ao seu C (MAPA_5C). O CM junta a assiduidade
//     e a pontualidade; o CO junta a higiene (obrigatórias). O CP é a
//     fórmula do modelo sobre os produtos.
//   - PROPOSTA ALUNO: a nota que o aluno propôs na autoavaliação final.
//   - CLASSIF. ATRIBUÍDA: a nota final da UC; negativas levam "a)".
// ============================================================
import { PERGUNTAS_TRIAGEM, notaTriagem } from './triagem5c';
import {
  getAlunos, getPlanosAulaPorTurma, getValidacoes, getHistoricoAvaliacoes, getSelecoes, getPresencas,
  getPlanosFaltadosPorUC, getAtividades, situacaoRecuperacaoUC, assiduidadeNaUC,
  participacoesDoAlunoNaUC, notaRecuperacaoUC, getPropostaFinalUC,
  kfFaseCompleta, liderKFdoGrupo,
} from './backend';
import { calcularNotaPlano } from './types';
import { modulosDaTurma } from './cronograma';
import MODELO from './pautaModelo.json';

// ── Os 5 C's: que atitudes contribuem para cada um ───────────

export type Letra5C = 'cm' | 'cl' | 'co' | 'cr';

// Os 5 C's saem SÓ de evidências que não contam na nota dos Planos de
// Avaliação. As atitudes validadas e a higiene e segurança alimentar já
// entram na nota de cada aula (logo no CP); contá-las outra vez aqui era
// avaliar a mesma evidência duas vezes. Cada evidência entra num só C.
// Nenhuma destas evidências cria um elemento novo nos planos.
export const MAPA_5C: Record<Letra5C, { sigla: string; nome: string; evidencias: string }> = {
  cm: { sigla: 'CM', nome: 'Comprometido',
    evidencias: 'assiduidade (horas), pontualidade, autoavaliações entregues' },
  cl: { sigla: 'CL', nome: 'Colaborativo',
    evidencias: 'pergunta de cada aula sobre o trabalho com os colegas, participação em eventos e atividades extra, registos de grupo no KitchenFlow, liderança do grupo' },
  co: { sigla: 'CO', nome: 'Consciente',
    evidencias: 'higiene pessoal: farda completa à entrada de cada aula' },
  cr: { sigla: 'CR', nome: 'Criativo',
    evidencias: 'resolução de problemas: pergunta de cada aula «resolveste algum problema?», problemas que detetou e registou, sentido crítico na autoavaliação' },
};


/** Nível do modelo: 0 N.R./N.O. · 2 Insuficiente · 4 Suficiente · 5 Bom · 6 Muito bom
 *  (as mesmas fronteiras das fórmulas do modelo). */
export function nivelPauta(nota20: number | null | undefined): number {
  if (nota20 === null || nota20 === undefined || isNaN(nota20) || nota20 === 0) return 0;
  return nota20 < 9.5 ? 2 : nota20 < 14 ? 4 : nota20 < 17 ? 5 : 6;
}

const media = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const hojeISO = () => new Date().toISOString().slice(0, 10);

// ── Produtos e ponderação ────────────────────────────────────

export const MAX_PRODUTOS = 7;   // as colunas do modelo

export interface ProdutoPauta {
  numero: number;              // 1, 2, 3… — a ordem na pauta
  titulo: string;
  planosIds: string[];
  /** Elementos (competências) efetivamente avaliados neste produto. */
  elementos: number;
  /** Peso em % — pelo número de elementos avaliados. */
  peso: number;
}

const categoria = (id: string) => id?.startsWith('OBR_') ? 'OBR'
  : id?.startsWith('SUB-') || id?.startsWith('APP-') ? 'SUB'
  : id?.startsWith('KNW-') ? 'KNW' : id?.startsWith('INI-') ? 'INI' : 'ATI';

/** Nota 0-20 de um aluno num plano: a validação do professor. */
export function notaDoPlano(alunoId: string, planoId: string, tipo: string): number | null {
  const v: any = getValidacoes().find((x: any) => x.planoAulaId === planoId && x.alunoId === alunoId);
  if (!v) return null;
  if (typeof v.notaMedia20 === 'number') return v.notaMedia20;
  const notas = (v.notas || []).map((n: any) => ({ categoria: categoria(n.competenciaId) as any, nota: Number(n.nota) || 0 }));
  return notas.length ? calcularNotaPlano(notas, (tipo || 'pratico') as any).nota20 : null;
}

export interface PlanoRealizado { id: string; titulo: string; data: string; avaliado: boolean }

/** Os Planos de Avaliação já realizados na UC, por ordem de data. */
export function planosRealizadosDaUC(turmaId: string, ucId: string): PlanoRealizado[] {
  const validacoes = getValidacoes() as any[];
  return getPlanosAulaPorTurma(turmaId)
    .filter(p => p.ucId === ucId && (p.estado === 'publicado' || (p.estado as string) === 'realizada')
      && String(p.data).slice(0, 10) <= hojeISO())
    .sort((a, b) => String(a.data).localeCompare(String(b.data))
      || String(a.horaInicio || '').localeCompare(String(b.horaInicio || '')))
    .map(p => ({ id: p.id, titulo: p.titulo || 'Plano', data: String(p.data).slice(0, 10),
      avaliado: validacoes.some(v => v.planoAulaId === p.id) }));
}

/**
 * Os produtos da pauta: cada coluna é a nota final de UM Plano de Avaliação.
 * Por omissão entram todos os planos realizados e avaliados; o professor
 * pode escolher outros (`escolhidos`). Com mais de 7, a pauta ganha colunas.
 */
export function produtosDaUC(turmaId: string, ucId: string, escolhidos?: string[]): ProdutoPauta[] {
  const validacoes = getValidacoes() as any[];
  const planos = planosRealizadosDaUC(turmaId, ucId)
    .filter(p => p.avaliado && (!escolhidos || escolhidos.includes(p.id)));

  // Elementos avaliados em cada plano: as competências que o professor validou.
  const elementosDe = (id: string) => new Set(validacoes
    .filter(v => v.planoAulaId === id)
    .flatMap(v => (v.notas || []).map((n: any) => n.competenciaId))).size || 1;

  const produtos = planos.map((p, j) => ({
    numero: j + 1, titulo: p.titulo, planosIds: [p.id], elementos: elementosDe(p.id), peso: 0,
  }));
  const total = produtos.reduce((s, p) => s + p.elementos, 0) || 1;
  produtos.forEach(p => { p.peso = Math.round((p.elementos / total) * 1000) / 10; });
  // Acerto de arredondamento: a soma dá sempre 100%.
  if (produtos.length) {
    const soma = produtos.reduce((s, p) => s + p.peso, 0);
    produtos[produtos.length - 1].peso = Math.round((produtos[produtos.length - 1].peso + 100 - soma) * 10) / 10;
  }
  return produtos;
}

/** Colunas de produto na pauta: as 7 do modelo, ou mais se houver mais planos. */
export const colunasDeProdutos = (produtos: ProdutoPauta[]) => Math.max(MAX_PRODUTOS, produtos.length);

// ── Linhas dos alunos ────────────────────────────────────────

export interface Evidencia5C { rotulo: string; nota20: number; vezes: number }

export interface LinhaPautaUC {
  alunoId: string;
  numero: number;
  nome: string;
  atividades: number;
  /** Nota 0-20 de cada produto: 0 se faltou, null se sem avaliação. */
  produtos: (number | null)[];
  /** Nível 0-6 de cada C; null quando não houve nenhuma evidência. */
  c5: Record<Letra5C, number | null>;
  /** As evidências de onde saiu cada C — para o professor ver o fundamento. */
  evidencias: Record<Letra5C, Evidencia5C[]>;
  proposta: number | null;
  justificacao: string;
}

export function linhasDaPautaUC(turmaId: string, ucId: string, produtos: ProdutoPauta[]): LinhaPautaUC[] {
  const planos = getPlanosAulaPorTurma(turmaId);
  const totalAtiv = atividadesDoModulo(turmaId, ucId);
  const tipoDe = (id: string) => (planos.find(p => p.id === id) as any)?.tipoPlanAula || 'pratico';
  const validados = getHistoricoAvaliacoes().filter(r =>
    r.turmaId === turmaId && r.ucId === ucId && r.validadoPor === 'professor');

  return getAlunos()
    .filter(a => a.turmaId === turmaId && a.ativo !== false)
    .sort((a, b) => a.numero - b.numero)
    .map(a => {
      const faltou = new Set(getPlanosFaltadosPorUC(a.id, ucId, turmaId).map(p => p.id));
      const recup = notaRecuperacaoUC(a.id, ucId);
      const regs = validados.filter(r => r.alunoId === a.id);

      // Produtos: média dos planos do grupo; falta = 0 (ou a recuperação).
      const notasProd = Array.from({ length: colunasDeProdutos(produtos) }, (_, j) => {
        const p = produtos[j];
        if (!p) return null;
        const notas = p.planosIds.map(id => {
          if (faltou.has(id)) return recup ?? 0;
          return notaDoPlano(a.id, id, tipoDe(id));
        });
        const m = media(notas);
        return m === null ? null : Math.round(m * 10) / 10;
      });

      // 5 C's a partir das evidências
      const evidencias: Record<Letra5C, Evidencia5C[]> = { cm: [], cl: [], co: [], cr: [] };
      const junta = (c: Letra5C, rotulo: string, nota20: number | null, vezes: number) => {
        if (nota20 !== null && !isNaN(nota20) && vezes > 0) evidencias[c].push({ rotulo, nota20: Math.max(0, Math.min(20, nota20)), vezes });
      };

      // As aulas desta UC a que o aluno veio
      const planosUC = planos.filter(p => p.ucId === ucId && String(p.data).slice(0, 10) <= hojeISO()
        && (p.estado === 'publicado' || (p.estado as string) === 'realizada'));
      const presencas = getPresencas().filter(x => x.alunoId === a.id && planosUC.some(p => p.id === x.planoAulaId) && x.presente);
      const idsVeio = new Set(presencas.map(x => x.planoAulaId));
      const nVeio = idsVeio.size;
      const pct = (n: number, de: number) => de > 0 ? (n / de) * 20 : null;

      // CM — compromisso
      const s = situacaoRecuperacaoUC(a.id, turmaId, ucId);
      const assid = assiduidadeNaUC(a.id, turmaId, ucId);
      junta('cm', `Assiduidade: ${s.presenca}% das horas dadas`, s.presenca / 5, assid.aulasPrevistas || nVeio);
      junta('cm', `Pontualidade: ${assid.atrasos} atraso${assid.atrasos === 1 ? '' : 's'}`,
        assid.presencas > 0 ? (1 - assid.atrasos / assid.presencas) * 20 : null, assid.presencas);
      const comFarda = presencas.filter(x => (x as any).fardamentoOk).length;
      const selecoes = getSelecoes().filter(x => x.alunoId === a.id && idsVeio.has(x.planoAulaId as string));
      junta('cm', `Autoavaliações entregues: ${selecoes.length} de ${nVeio} aulas`, pct(selecoes.length, nVeio), nVeio);

      // Triagem das aulas (CL e CR): a resposta do aluno em cada autoavaliação,
      // ou a do professor quando a confirmou ou mudou na validação.
      const triagens = selecoes.map(sel => {
        const v: any = getValidacoes().find((x: any) => x.selecaoId === sel.id || (x.planoAulaId === sel.planoAulaId && x.alunoId === a.id));
        return { t: v?.triagem5c || sel.triagem5c, prof: !!v?.triagem5c };
      }).filter(x => x.t);
      const juntaTriagem = (c: 'cl' | 'cr') => {
        const q = PERGUNTAS_TRIAGEM.find(x => x.chave === c)!;
        const ns = triagens.map(x => notaTriagem(x.t![c])).filter((n): n is number => n !== null);
        const conf = triagens.filter(x => x.prof && notaTriagem(x.t![c]) !== null).length;
        junta(c, `${q.titulo} (pergunta de cada aula): respondeu em ${ns.length} aula${ns.length === 1 ? '' : 's'}, ${conf} confirmada${conf === 1 ? '' : 's'} pelo professor`,
          media(ns.map(n => n * 4)), ns.length);
      };

      // CL — colaboração: eventos e atividades extra, trabalho de grupo
      juntaTriagem('cl');
      if (totalAtiv > 0) {
        const part = participacoesDoAlunoNaUC(a.id, turmaId, ucId);
        junta('cl', `Eventos e atividades extra: ${part} de ${totalAtiv}`, pct(Math.min(part, totalAtiv), totalAtiv), totalAtiv);
      }
      const kfGrupo = [...idsVeio].filter(id => kfFaseCompleta(a.id, id, 'inicial') && kfFaseCompleta(a.id, id, 'final')).length;
      junta('cl', `Registos de grupo no KitchenFlow cumpridos: ${kfGrupo} de ${nVeio} aulas`, pct(kfGrupo, nVeio), nVeio);
      const liderou = [...idsVeio].filter(id => liderKFdoGrupo(id) === a.id).length;
      if (liderou > 0) junta('cl', `Liderou o grupo em ${liderou} aula${liderou === 1 ? '' : 's'}`, 20, liderou);

      // CO — consciência: higiene pessoal à entrada (não entra na nota da aula;
      // a higiene e segurança alimentar, que entra, fica só nos planos).
      junta('co', `Farda completa à entrada: ${comFarda} de ${nVeio} aulas`, pct(comFarda, nVeio), nVeio);

      // CR — resolução de problemas
      juntaTriagem('cr');
      const ncs = (() => { try { return JSON.parse(localStorage.getItem('ecl_nao_conformidades') || '[]'); } catch { return []; } })()
        .filter((n: any) => n.perfilRegistou === 'aluno' && n.alunoId === a.id && idsVeio.size > 0);
      if (ncs.length) junta('cr', `Problemas que detetou e registou: ${ncs.length}`, Math.min(20, 14 + 2 * ncs.length), ncs.length);
      // Sentido crítico: quão perto a autoavaliação ficou do que o professor validou
      const difs: number[] = [];
      selecoes.forEach(sel => {
        const v: any = getValidacoes().find((x: any) => x.selecaoId === sel.id || (x.planoAulaId === sel.planoAulaId && x.alunoId === a.id));
        (sel.autoavaliacoes || []).forEach((au: any) => {
          const n = v?.notas?.find((x: any) => x.competenciaId === au.competenciaId);
          if (n && Number(au.nota)) difs.push(Math.abs(Number(au.nota) - Number(n.nota)));
        });
      });
      junta('cr', `Sentido crítico na autoavaliação (diferença média para o professor: ${difs.length ? (Math.round((media(difs) as number) * 10) / 10).toString().replace('.', ',') : '—'})`,
        difs.length ? 20 - 5 * (media(difs) as number) : null, difs.length);

      const c5 = Object.fromEntries((Object.keys(evidencias) as Letra5C[]).map(c => {
        const m = media(evidencias[c].map(e => e.nota20));
        return [c, m === null ? null : nivelPauta(m)];
      })) as Record<Letra5C, number | null>;

      const prop = getPropostaFinalUC(a.id, ucId);
      const linha: LinhaPautaUC = {
        alunoId: a.id, numero: a.numero, nome: a.nome || `Aluno ${a.numero}`,
        atividades: participacoesDoAlunoNaUC(a.id, turmaId, ucId),
        produtos: notasProd, c5, evidencias,
        proposta: prop ? prop.nota : null, justificacao: prop?.justificacao || '',
      };
      // CLASSIF. ATRIBUÍDA: no modelo oficial não tem fórmula — quem calcula
      // é a folha (TOTAL e RESULTADO). A aplicação não faz uma nota paralela.
      return linha;
    });
}

/** Atividades da turma no período do módulo — o "Total Pond" da coluna ATIV. */
export function atividadesDoModulo(turmaId: string, ucId: string): number {
  const mod: any = modulosDaTurma(turmaId).find((m: any) => m.id === ucId);
  return getAtividades().filter(a => {
    if (a.turmaId !== turmaId) return false;
    const d = String(a.data || '').slice(0, 10);
    return !mod?.dataInicio || !mod?.dataFim || (d >= mod.dataInicio && d <= mod.dataFim);
  }).length;
}

// ── As contas do modelo (as mesmas das fórmulas) ─────────────

const PESOS_5C = { cm: 0.1, cp: 0.6, cl: 0.1, co: 0.1, cr: 0.1 };

export function calculoDoModelo(l: LinhaPautaUC, produtos: ProdutoPauta[], totalAtividades: number) {
  const nAtiv = l.atividades < 1 ? 0 : l.atividades < totalAtividades * 0.5 ? 2
    : l.atividades < totalAtividades * 0.7 ? 4 : l.atividades < totalAtividades * 0.85 ? 5 : 6;
  const niveis = l.produtos.map(v => nivelPauta(v));
  // CP em duas colunas, como no modelo: N (a conta dos níveis) e 60%, o
  // Competente arredondado à unidade, que é o que entra no TOTAL.
  const cpN = niveis.reduce((s, n, j) => s + n * ((produtos[j]?.peso || 0) / 100), 0);
  const cp = Math.round(cpN);
  const total = (l.c5.cm ?? 0) * PESOS_5C.cm + cp * PESOS_5C.cp + (l.c5.cl ?? 0) * PESOS_5C.cl
    + (l.c5.co ?? 0) * PESOS_5C.co + (l.c5.cr ?? 0) * PESOS_5C.cr;
  const resultado = total < 3.5 ? 'Módulo em atraso' : total < 4.5 ? 'Suficiente' : total < 5.5 ? 'Bom' : 'Muito bom';
  return { nAtiv, niveis, cpN, cp, total, resultado };
}

// ── CLASSIF. ATRIBUÍDA ───────────────────────────────────────
// No modelo esta coluna não tem fórmula: é o professor que a atribui. A
// aplicação só SUGERE uma nota perto do Competente e avisa quando a nota
// escolhida não corresponde ao CP nem ao RESULTADO da folha.

export const FAIXAS = [
  { nome: 'Insuficiente', de: 0, ate: 9 },
  { nome: 'Suficiente', de: 10, ate: 13 },
  { nome: 'Bom', de: 14, ate: 16 },
  { nome: 'Muito bom', de: 17, ate: 20 },
];
/** Faixa de uma nota 0-20 (0 Insuficiente … 3 Muito bom). */
export const faixaDaNota = (n: number) => { const r = Math.round(n); return r < 10 ? 0 : r < 14 ? 1 : r < 17 ? 2 : 3; };
/** Faixa de um nível da folha (CP ou TOTAL), com as fronteiras do RESULTADO. */
export const faixaDoNivel = (y: number) => y < 3.5 ? 0 : y < 4.5 ? 1 : y < 5.5 ? 2 : 3;

/** O Competente em 0-20: as notas dos planos com os pesos da pauta
 *  (um plano sem nota conta 0, como na folha). */
export function notaDoCompetente(l: LinhaPautaUC, produtos: ProdutoPauta[]): number | null {
  if (!produtos.length) return null;
  return Math.round(produtos.reduce((s, p, j) => s + (l.produtos[j] ?? 0) * p.peso / 100, 0) * 10) / 10;
}

/** Sugestão para a CLASSIF. ATRIBUÍDA: o Competente em 0-20, dentro da
 *  faixa do Competente (um aluno com 4 no CP fica entre 10 e 13). */
export function sugestaoClassificacao(l: LinhaPautaUC, produtos: ProdutoPauta[], cp: number): number | null {
  const n = notaDoCompetente(l, produtos);
  if (n === null) return null;
  const f = FAIXAS[faixaDoNivel(cp)];
  return Math.min(f.ate, Math.max(f.de, Math.round(n)));
}

/** A nota tem de estar na faixa do Competente: devolve o erro, ou null. */
export function erroClassificacao(nota: number | null, cp: number): string | null {
  if (nota === null) return null;
  const f = FAIXAS[faixaDoNivel(cp)];
  return faixaDaNota(nota) === faixaDoNivel(cp) ? null
    : `Com Competente ${cp} (${f.nome}) a nota tem de estar entre ${f.de} e ${f.ate}.`;
}

/** Aviso (não impede) quando a nota não corresponde ao RESULTADO da folha. */
export function avisosClassificacao(nota: number | null, total: number, resultado: string): string[] {
  if (nota === null) return [];
  const fT = FAIXAS[faixaDoNivel(total)];
  return faixaDaNota(nota) !== faixaDoNivel(total)
    ? [`Não corresponde ao RESULTADO da folha (${resultado} → ${fT.de} a ${fT.ate}).`] : [];
}

/** O que vai para a célula: "a)" só nas notas negativas. */
export const classificacaoComNota = (nota: number | null) => {
  if (nota === null) return '';
  const f = Math.round(nota);
  return f < 10 ? `${f} a)` : f;
};

// ── Cabeçalho ────────────────────────────────────────────────

export interface CabecalhoPauta {
  turma: string;
  disciplina: string;
  formador: string;
  ucId: string;
  ucNome: string;
  dataInicio: string;
  dataFim: string;
}

const dataPT = (iso: string) => {
  const [a, m, d] = String(iso || '').slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
};

export function nomeFicheiroPauta(cab: CabecalhoPauta, ext: 'xlsx' | 'pdf'): string {
  return `Pauta ${cab.ucId} ${cab.turma.split(' — ')[0]}.${ext}`.replace(/[\\/:*?"<>|]/g, '-');
}

export interface DadosPauta {
  cabecalho: CabecalhoPauta;
  produtos: ProdutoPauta[];
  linhas: LinhaPautaUC[];
  totalAtividades: number;
  /** CLASSIF. ATRIBUÍDA, escolhida pelo professor (por aluno). */
  classificacoes: Record<string, number | null>;
}

// Colunas do modelo (base 1, como no Excel)
const COL = { A: 1, B: 2, C: 3, D: 4, S: 19, T: 20, U: 21, V: 22, W: 23, X: 24, Y: 25, Z: 26, AB: 28, AE: 31, AF: 32, AG: 33 };
const ULTIMA_COL = 34;                                   // AH
// Produto j (0, 1, 2…): nota na coluna 5+2j (E, G, I…), nível na seguinte,
// peso na linha 9, coluna 10+j (J, K, L…); a soma dos pesos logo a seguir.
const colNota = (j: number) => 5 + 2 * j;
const colPeso = (j: number) => 10 + j;
const LETRA = (c: number) => { let s = ''; for (let n = c; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const PRIMEIRA = 15, LINHAS_MODELO = 23;
// Com mais de 7 planos, a pauta ganha duas colunas (nota e nível) por plano,
// inseridas antes do Modelo 5 C's (coluna S). Tudo o resto só se desloca.
const INSERE = 19;
const colunasAMais = (d: DadosPauta) => (colunasDeProdutos(d.produtos) - MAX_PRODUTOS) * 2;

// ── Excel (.xlsx) ────────────────────────────────────────────

/** Acrescenta colunas de produto ao modelo, com o mesmo formato das do 7.º produto. */
function alargarModeloXLSX(ws: any, e2: number, nProd: number) {
  const merges = Object.values(ws._merges || {}).map((m: any) => ({ top: m.top, left: m.left, bottom: m.bottom, right: m.right }));
  merges.forEach(m => ws.unMergeCells(m.top, m.left, m.bottom, m.right));
  const copia = (st: any) => JSON.parse(JSON.stringify(st || {}));
  const estiloNumero = copia(ws.getCell(8, 16).style), estiloPeso = copia(ws.getCell(9, 16).style);
  const estiloSoma = copia(ws.getCell(9, 17).style);
  const vazio8 = copia(ws.getCell(8, 18).style), vazio9 = copia(ws.getCell(9, 18).style);
  const nLinhas = Math.max(ws.rowCount, 41);
  const larguras = [ws.getColumn(17).width, ws.getColumn(18).width];

  ws.spliceColumns(INSERE, 0, ...Array.from({ length: e2 }, () => []));
  for (let k = 0; k < e2; k++) {
    ws.getColumn(INSERE + k).width = larguras[k % 2];
    for (let r = 1; r <= nLinhas; r++) {
      const orig = r === 8 ? vazio8 : r === 9 ? vazio9 : copia(ws.getCell(r, 17 + (k % 2)).style);
      ws.getCell(r, INSERE + k).style = copia(orig);
    }
  }
  // Tabela "Produtos / %" da linha 8 e 9: um lugar por produto e a soma a seguir.
  for (let j = MAX_PRODUTOS; j < nProd; j++) {
    ws.getCell(8, colPeso(j)).style = copia(estiloNumero);
    ws.getCell(9, colPeso(j)).style = copia(estiloPeso);
  }
  ws.getCell(9, colPeso(nProd)).style = copia(estiloSoma);

  merges.forEach(m => {
    let { left, right } = m;
    if (left >= INSERE) { left += e2; right += e2; }
    else if (right >= INSERE || (right === 18 && left < 17)) right += e2;
    ws.mergeCells(m.top, left, m.bottom, right);
    // O cabeçalho do 7.º produto repete-se nos produtos novos.
    if (m.left === 17 && m.right === 18)
      for (let k = 2; k <= e2; k += 2) ws.mergeCells(m.top, 17 + k, m.bottom, 18 + k);
  });
}

export async function gerarPautaXLSX(d: DadosPauta): Promise<Blob> {
  const ExcelJS: any = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const resp = await fetch('/pauta_modelo.xlsx');
  if (!resp.ok) throw new Error('Não encontrei o modelo da pauta.');
  await wb.xlsx.load(await resp.arrayBuffer());
  const ws = wb.worksheets[0];
  const nProd = colunasDeProdutos(d.produtos);
  const e2 = colunasAMais(d);
  if (e2) alargarModeloXLSX(ws, e2, nProd);
  const X = (c: number) => c >= INSERE ? c + e2 : c;      // coluna do modelo → coluna na pauta
  const L = (c: number) => LETRA(X(c));
  const set = (addr: string, v: any) => { ws.getCell(addr).value = v; };
  const f = (addr: string, formula: string) => { ws.getCell(addr).value = { formula }; };

  // Cabeçalho
  set(`${L(COL.AB)}1`, d.cabecalho.turma.split(' — ')[0]);
  set(`${L(COL.AB)}2`, d.cabecalho.disciplina);
  set(`${L(COL.AB)}3`, d.cabecalho.formador);
  set(`${L(COL.AB)}5`, `${d.cabecalho.ucId} — ${d.cabecalho.ucNome}`);
  set(`${L(COL.AB)}6`, dataPT(d.cabecalho.dataInicio));
  set(`${L(COL.AF)}6`, dataPT(d.cabecalho.dataFim));
  set('C14', d.totalAtividades);
  set(`${L(COL.V)}39`, dataPT(hojeISO()));

  // Produtos: nome na linha 13, número na linha 8, peso na linha 9, e a soma.
  for (let j = 0; j < nProd; j++) {
    const p = d.produtos[j];
    set(`${LETRA(colNota(j))}13`, p ? p.titulo : j + 1);
    set(`${LETRA(colPeso(j))}8`, j + 1);
    set(`${LETRA(colPeso(j))}9`, p ? p.peso / 100 : 0);
  }
  f(`${LETRA(colPeso(nProd))}9`, `SUM(J9:${LETRA(colPeso(nProd - 1))}9)`);

  // Alunos. Se houver mais do que as 23 linhas do modelo, acrescentam-se
  // linhas iguais antes da última (que tem a borda de fecho).
  const extra = Math.max(0, d.linhas.length - LINHAS_MODELO);
  if (extra) ws.duplicateRow(PRIMEIRA + LINHAS_MODELO - 2, extra, true);
  const nLinhas = LINHAS_MODELO + extra;
  for (let k = 0; k < nLinhas; k++) {
    const R = PRIMEIRA + k;
    const l = d.linhas[k];
    const lv = (c: number) => `${LETRA(c)}${R}`;          // coluna já na pauta
    const lm = (c: number) => `${L(c)}${R}`;               // coluna do modelo
    if (!l) {
      // Linha sem aluno: fica em branco, com o formato do modelo.
      for (let c = 1; c <= ULTIMA_COL + e2; c++) {
        const cell = ws.getCell(R, c);
        if (!cell.isMerged || cell.master === cell) cell.value = null;
      }
      continue;
    }
    set(lv(COL.A), l.numero);
    set(lv(COL.B), l.nome);
    set(lv(COL.C), l.atividades);
    f(lv(COL.D), `IF(C${R}<1,"0",IF(C${R}<$C$14*0.5,"2",IF(C${R}<$C$14*0.7,"4",IF(C${R}<$C$14*0.85,"5","6"))))`);
    for (let j = 0; j < nProd; j++) {
      const c = colNota(j), v = l.produtos[j];
      set(lv(c), v === null || v === undefined ? null : v);
      const e = lv(c);
      if (d.produtos[j]) f(lv(c + 1), `IF(${e}=0,"0",IF(${e}<9.5,"2",IF(${e}<14,"4",IF(${e}<17,"5","6"))))`);
      else set(lv(c + 1), null);
    }
    // As fórmulas do modelo, só com as colunas no sítio novo. O CP tem duas
    // colunas: N (o nível, em T) e 60% (em U), que é a que o TOTAL lê. No
    // original a U ficava vazia e o CP não chegava ao TOTAL: passa a ter o
    // CP arredondado à unidade. O TOTAL fica com a fórmula original. O CR pesa 10% (X14 vazia).
    f(lm(COL.T), Array.from({ length: nProd }, (_, j) => `(${LETRA(colNota(j) + 1)}${R}*$${LETRA(colPeso(j))}$9)`).join('+'));
    set(lm(COL.S), l.c5.cm);
    set(lm(COL.V), l.c5.cl);
    set(lm(COL.W), l.c5.co);
    set(lm(COL.X), l.c5.cr);
    const $ = (c: number) => `$${L(c)}$14`;
    f(lm(COL.U), `ROUND(${lm(COL.T)},0)`);
    ws.getCell(lm(COL.U)).numFmt = '0';
    f(lm(COL.Y), `(${lm(COL.S)}*${$(COL.S)})+(${lm(COL.U)}*${$(COL.U)})+(${lm(COL.V)}*${$(COL.V)})+(${lm(COL.W)}*${$(COL.W)})+(${lm(COL.X)}*${$(COL.X)})`);
    f(lm(COL.Z), `IF(${lm(COL.Y)}<3.5,"Módulo em atraso",IF(${lm(COL.Y)}<4.5,"Suficiente",IF(${lm(COL.Y)}<5.5,"Bom","Muito bom")))`);
    set(lm(COL.AE), l.proposta);
    // CLASSIF. ATRIBUÍDA: a nota que o professor atribuiu (sem fórmula, como no modelo).
    const calc = calculoDoModelo(l, d.produtos, d.totalAtividades);
    const cl = classificacaoComNota(d.classificacoes[l.alunoId] ?? null);
    set(lm(COL.AG), cl === '' ? null : cl);
  }
  if (e2) ws.pageSetup.printArea = `A1:${LETRA(ULTIMA_COL + e2)}${41 + extra}`;

  // Logo da escola, no sítio do modelo.
  const logo = await fetch('/pauta_logo.png').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
  if (logo) {
    const id = wb.addImage({ buffer: logo, extension: 'png' });
    ws.addImage(id, { tl: { col: 0.35, row: 1.1 }, ext: { width: 179, height: 66 } });
  }
  wb.calcProperties = { ...(wb.calcProperties || {}), fullCalcOnLoad: true };
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ── PDF ──────────────────────────────────────────────────────
// A mesma grelha do modelo, desenhada com os valores já calculados.

type EstiloModelo = {
  font: string; size: number; bold: boolean; italic: boolean; color: string; fill: string | null;
  border: Record<'top' | 'bottom' | 'left' | 'right', { w: number; estilo: string; cor: string } | null>;
  h: string | null; v: string; wrap: boolean; num: string | null; rot?: number;
};

const fmtNum = (v: number, num: string | null) =>
  num === '0%' ? `${Math.round(v * 100)}%`
  : num === '0.0' ? v.toFixed(1).replace('.', ',')
  : num === '0' ? String(Math.round(v))
  : String(Math.round(v * 100) / 100).replace('.', ',');

/** A grelha do modelo com as colunas de produto a mais (base 0). */
function modeloAlargado(nProd: number) {
  const M: any = MODELO;
  const e2 = (nProd - MAX_PRODUTOS) * 2, I0 = INSERE - 1;
  if (!e2) return { cols: M.cols as number[], cells: M.cells as Record<string, any>, merges: M.merges as number[][] };
  const cols = [...M.cols.slice(0, I0), ...Array.from({ length: e2 }, (_, k) => M.cols[16 + (k % 2)]), ...M.cols.slice(I0)];
  const cells: Record<string, any> = {};
  Object.entries(M.cells as Record<string, any>).forEach(([k, x]) => {
    const [r, c] = k.split(',').map(Number);
    cells[`${r},${c >= I0 ? c + e2 : c}`] = x;
  });
  const nRows = M.rows.length;
  for (let r = 0; r < nRows; r++) for (let k = 0; k < e2; k++) {
    const src = M.cells[`${r},${r === 7 || r === 8 ? 17 : 16 + (k % 2)}`];
    if (src) cells[`${r},${I0 + k}`] = { s: src.s };
  }
  for (let j = MAX_PRODUTOS; j < nProd; j++) {
    cells[`7,${9 + j}`] = { s: M.cells['7,15']?.s };
    cells[`8,${9 + j}`] = { s: M.cells['8,15']?.s };
  }
  cells[`8,${9 + nProd}`] = { s: M.cells['8,16']?.s };
  const merges: number[][] = [];
  (M.merges as number[][]).forEach(([r1, c1, r2, c2]) => {
    if (c1 >= I0) merges.push([r1, c1 + e2, r2, c2 + e2]);
    else if (c2 >= I0 || (c2 === 17 && c1 < 16)) merges.push([r1, c1, r2, c2 + e2]);
    else merges.push([r1, c1, r2, c2]);
    if (c1 === 16 && c2 === 17) for (let k = 2; k <= e2; k += 2) merges.push([r1, c1 + k, r2, c2 + k]);
  });
  return { cols, cells, merges };
}

export function htmlDaPauta(d: DadosPauta): string {
  const M: any = MODELO;
  const nProd = colunasDeProdutos(d.produtos);
  const e2 = colunasAMais(d);
  const G = modeloAlargado(nProd);
  const cols: number[] = G.cols, alturas: number[] = [...M.rows];
  const E: Record<string, EstiloModelo> = M.estilos;
  const valores = new Map<string, string | number>();   // "r,c" (base 0) → valor
  const val = (r: number, c: number, v: any) => valores.set(`${r},${c}`, v);
  const X0 = (c1: number) => (c1 >= INSERE ? c1 + e2 : c1) - 1;   // coluna do modelo (base 1) → base 0 na pauta

  // Valores fixos do modelo
  Object.entries(G.cells).forEach(([k, x]) => {
    const r = Number(k.split(',')[0]);
    if (r >= PRIMEIRA - 1 && r < PRIMEIRA - 1 + LINHAS_MODELO) return;   // zona dos alunos
    if (x.t !== undefined) valores.set(k, x.t);
    else if (x.n !== undefined) valores.set(k, x.n);
  });
  val(0, X0(COL.AB), d.cabecalho.turma.split(' — ')[0]);
  val(1, X0(COL.AB), d.cabecalho.disciplina);
  val(2, X0(COL.AB), d.cabecalho.formador);
  val(4, X0(COL.AB), `${d.cabecalho.ucId} — ${d.cabecalho.ucNome}`);
  val(5, X0(COL.AB), dataPT(d.cabecalho.dataInicio));
  val(5, X0(COL.AF), dataPT(d.cabecalho.dataFim));
  val(13, 2, d.totalAtividades);
  val(38, X0(COL.V), dataPT(hojeISO()));
  let somaPesos = 0;
  for (let j = 0; j < nProd; j++) {
    const p = d.produtos[j];
    val(12, colNota(j) - 1, p ? p.titulo : j + 1);
    val(7, colPeso(j) - 1, j + 1);
    val(8, colPeso(j) - 1, p ? p.peso / 100 : 0);
    somaPesos += p ? p.peso / 100 : 0;
  }
  val(8, colPeso(nProd) - 1, somaPesos);   // a SOMA dos pesos

  // Linhas dos alunos (e linhas a mais, se for preciso)
  const extra = Math.max(0, d.linhas.length - LINHAS_MODELO);
  const nLinhas = LINHAS_MODELO + extra;
  const linhaModelo = (k: number) => k < LINHAS_MODELO - 1 ? PRIMEIRA - 1 + k : PRIMEIRA - 1 + LINHAS_MODELO - 1;
  for (let k = 0; k < nLinhas; k++) {
    const r = PRIMEIRA - 1 + k;
    const l = d.linhas[k];
    if (!l) continue;
    const calc = calculoDoModelo(l, d.produtos, d.totalAtividades);
    val(r, 0, l.numero); val(r, 1, l.nome); val(r, 2, l.atividades); val(r, 3, calc.nAtiv);
    for (let j = 0; j < nProd; j++) {
      const v = l.produtos[j];
      if (v !== null && v !== undefined) val(r, colNota(j) - 1, v);
      // Colunas sem produto ficam em branco (não 0).
      if (d.produtos[j]) val(r, colNota(j), calc.niveis[j]);
    }
    val(r, X0(COL.S), l.c5.cm ?? ''); val(r, X0(COL.T), Math.round(calc.cpN * 100) / 100);
    val(r, X0(COL.U), calc.cp);
    val(r, X0(COL.V), l.c5.cl ?? ''); val(r, X0(COL.W), l.c5.co ?? ''); val(r, X0(COL.X), l.c5.cr ?? '');
    val(r, X0(COL.Y), Math.round(calc.total * 100) / 100);
    val(r, X0(COL.Z), calc.resultado);
    if (l.proposta !== null) val(r, X0(COL.AE), l.proposta);
    val(r, X0(COL.AG), classificacaoComNota(d.classificacoes[l.alunoId] ?? null));
  }

  // Grelha: as linhas a mais repetem a penúltima linha de alunos.
  const mapaLinha = (r: number) => r < PRIMEIRA - 1 + LINHAS_MODELO - 1 ? r
    : r < PRIMEIRA - 1 + nLinhas - 1 ? linhaModelo(LINHAS_MODELO - 2)
    : r - extra;
  const nTotal = alturas.length + extra;
  const merges: number[][] = [];
  G.merges.forEach(([r1, c1, r2, c2]) => {
    const desloca = (r: number) => r >= PRIMEIRA - 1 + LINHAS_MODELO - 1 ? r + extra : r;
    merges.push([desloca(r1), c1, desloca(r2), c2]);
    if (r1 === PRIMEIRA - 1 + LINHAS_MODELO - 2 && r2 === r1)
      for (let e = 1; e <= extra; e++) merges.push([r1 + e, c1, r1 + e, c2]);
  });
  const cobertas = new Set<string>(), span = new Map<string, [number, number]>();
  merges.forEach(([r1, c1, r2, c2]) => {
    span.set(`${r1},${c1}`, [r2 - r1 + 1, c2 - c1 + 1]);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (r !== r1 || c !== c1) cobertas.add(`${r},${c}`);
  });
  const altura = (r: number) => alturas[mapaLinha(r)] ?? alturas[alturas.length - 1];

  const css = (e: EstiloModelo) => [
    `font-family:'${e.font}',Arial,sans-serif`, `font-size:${e.size}pt`, `color:${e.color}`,
    e.bold ? 'font-weight:bold' : '', e.italic ? 'font-style:italic' : '',
    e.fill ? `background:${e.fill}` : '',
    ...(['top', 'bottom', 'left', 'right'] as const).map(l => {
      const b = e.border[l]; return b ? `border-${l}:${b.w}pt ${b.estilo === 'double' ? 'double' : 'solid'} ${b.cor}` : `border-${l}:none`;
    }),
    `text-align:${e.h || 'left'}`, `vertical-align:${e.v === 'center' ? 'middle' : e.v}`,
    `white-space:${e.wrap ? 'normal' : 'nowrap'}`,
  ].filter(Boolean).join(';');
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let html = `<table style="border-collapse:collapse;table-layout:fixed;width:${cols.reduce((a, b) => a + b, 0)}pt"><colgroup>`
    + cols.map(w => `<col style="width:${w}pt">`).join('') + '</colgroup>';
  for (let r = 0; r < nTotal; r++) {
    html += `<tr style="height:${altura(r)}pt">`;
    const rm = mapaLinha(r);
    for (let c = 0; c < cols.length; c++) {
      if (cobertas.has(`${r},${c}`)) continue;
      const x = G.cells[`${rm},${c}`] || { s: 'Default' };
      const e = E[x.s] || E['Default'] || Object.values(E)[0];
      let v: any = valores.get(`${r},${c}`);
      if (v === undefined && r >= PRIMEIRA - 1 + nLinhas) v = valores.get(`${r - extra},${c}`);
      const txt = v === undefined || v === '' ? '' : typeof v === 'number' ? fmtNum(v, e.num) : String(v);
      const [rs, cs] = span.get(`${r},${c}`) || [1, 1];
      const conteudo = esc(txt).replace(/\n/g, '<br>');
      if (e.rot === 90 && txt) {
        // Texto vertical, como no modelo (de baixo para cima).
        let h = 0; for (let k = 0; k < rs; k++) h += altura(r + k);
        let w = 0; for (let k = 0; k < cs; k++) w += cols[c + k];
        html += `<td rowspan="${rs}" colspan="${cs}" style="${css(e)};padding:0;position:relative">`
          + `<div style="position:absolute;left:50%;top:50%;width:${h - 2}pt;transform:translate(-50%,-50%) rotate(-90deg);`
          + `text-align:center;white-space:normal;line-height:1.05;max-height:${w}pt">${conteudo}</div></td>`;
      } else if (!e.wrap && txt) {
        // Como na folha: o texto que não cabe passa para as células vazias ao lado.
        const lado = e.h === 'right' ? 'right:2px' : e.h === 'center' ? 'left:50%;transform:translateX(-50%)' : 'left:2px';
        html += `<td rowspan="${rs}" colspan="${cs}" style="${css(e)};padding:0;position:relative;overflow:visible">`
          + `<span style="position:absolute;${lado};top:50%;margin-top:-0.55em;white-space:nowrap;line-height:1.1">${conteudo}</span>&nbsp;</td>`;
      } else {
        html += `<td rowspan="${rs}" colspan="${cs}" style="${css(e)};padding:0 2px;overflow:hidden;line-height:1.05">${conteudo}</td>`;
      }
    }
    html += '</tr>';
  }
  html += '</table>';
  // Logo no sítio do modelo: célula A2, 24 pt da esquerda, 3 pt abaixo do topo.
  const topoA2 = alturas[0] + 3;
  return `<div style="position:relative;background:#fff;padding:0">${html}`
    + `<img src="/pauta_logo.png" style="position:absolute;left:24pt;top:${topoA2}pt;width:134.2pt;height:49.5pt"></div>`;
}

export async function gerarPautaPDF(d: DadosPauta): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const caixa = document.createElement('div');
  caixa.style.cssText = 'position:fixed;left:-20000px;top:0;background:#fff;padding:0';
  caixa.innerHTML = htmlDaPauta(d);
  document.body.appendChild(caixa);
  try {
    await Promise.all([...caixa.querySelectorAll('img')].map(img =>
      (img as HTMLImageElement).complete ? null : new Promise(res => { img.onload = img.onerror = res; })));
    const canvas = await html2canvas(caixa.firstElementChild as HTMLElement, { scale: 2, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), m = 20;
    const k = Math.min((W - 2 * m) / canvas.width, (H - 2 * m) / canvas.height);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, canvas.width * k, canvas.height * k);
    return pdf.output('blob');
  } finally {
    caixa.remove();
  }
}

export function descarregar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
