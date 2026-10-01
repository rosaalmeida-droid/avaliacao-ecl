// ============================================================
// O que o aluno responde nesta aula — as regras, num sítio só
// ============================================================
// O ecrã do aluno e o plano do professor usavam cada um as suas contas,
// e o professor nunca sabia ao certo o que ia ser perguntado (Rosa,
// out/2026). Agora as duas partes leem daqui: o aluno responde ao que
// esta função diz, e o professor vê no plano exatamente o mesmo.
// ============================================================
import type { PlanoAula, FichaProducao } from './types';
import {
  codigosDasLinhas, codigoDaLinha, tecnicasDeRecurso, conhecimentosDaAula, encontrarConhecimento,
  atitudesDoTrimestre, ATITUDES, encontrarSubtecnica, encontrarAparelho, ramoDaCompetencia,
} from './compatECL';
import { trimestreAtual } from './datas';
import { opcoesDeEscolhaDoAluno } from './motorAvaliacao';
import { ATITUDES_FIXAS_EVENTO, NOME_TEC_EVENTO } from './eventosAvaliacao';
import {
  temPerguntas, atitudeAplicavel, perguntasAplicaveis, perguntasDe, porqueNaoSeFaz,
} from './perguntas_atitudes';
import { perguntasDaAula, CL_SEMPRE } from './triagem5c';
import { porqueNao, type ContextoAula, type Letra5CAluno } from './contextoAula';

/** Quantas atitudes o aluno vê para escolher, antes de pedir a lista toda. */
export const MAX_ATITUDES_PARA_ESCOLHER = 3;

export interface RegrasAutoavaliacao {
  ctx: ContextoAula;
  tipoPlanAula: string;
  ehAtitudinal: boolean;
  /** Subtécnicas e preparações base das fichas (sem as retiradas). */
  subIds: string[];
  appIds: string[];
  /** Técnicas de recurso da UC, quando as fichas não têm subtécnicas. */
  recursoIds: string[];
  /** Conhecimentos a que o aluno responde. */
  conhecimentos: { id: string; nome: string; definicao: string }[];
  /** Atitudes a que todos respondem (aula atitudinal, evento, farda incompleta). */
  atitudesDaAula: string[];
  /** As atitudes que o aluno pode escolher numa aula prática ou teórica. */
  atitudesParaEscolher: string[];
  atitudesPermitidas: string[];
  /** Há o passo «escolhe uma atitude». */
  escolheAtitude: boolean;
  /** A técnica geral do evento (só num evento). */
  tecEvento: boolean;
  /** O Colaborativo não se pergunta (sozinho e fora da cozinha). */
  clNaoSePergunta: boolean;
  /** Sozinho na cozinha: pergunta-se pelo espaço e o material partilhados. */
  clSempre: boolean;
}

export function regrasDaAutoavaliacao(plano: PlanoAula, fichas: FichaProducao[], opts: {
  ctx: ContextoAula; ano?: number; fardaIncompleta?: boolean;
}): RegrasAutoavaliacao {
  const p: any = plano;
  const ctx = opts.ctx;
  const ano = (opts.ano ?? 1) as 1 | 2 | 3;
  const compRemovidas: string[] = p.compRemovidas || [];
  const retirada = (id: string) => compRemovidas.some((r: string) => codigoDaLinha(r) === id);
  const ucId = p.ucId || '';

  const subIds = [...new Set(p.semSubApp ? [] : fichas.flatMap((f: any) => codigosDasLinhas(f.tecnicasSugeridas, 'SUB-')))]
    .filter(id => !retirada(id));
  const appIds = [...new Set(p.semSubApp ? [] : fichas.flatMap((f: any) => codigosDasLinhas(f.aparelhosDetectados, 'APP-')))]
    .filter(id => !retirada(id));
  const tipoPlanAula = String(p.tipoPlanAula || (subIds.length === 0 && appIds.length === 0 ? 'teorico' : 'pratico'));
  const ehAtitudinal = tipoPlanAula.startsWith('atitudinal');

  const subsUsadas = ehAtitudinal ? [] : subIds.slice(0, 8);
  const appsUsadas = ehAtitudinal ? [] : appIds.slice(0, 4);
  const usarRecurso = subsUsadas.length === 0 && appsUsadas.length === 0;
  const recursoIds = ehAtitudinal || !usarRecurso || fichas.length === 0 ? []
    : tecnicasDeRecurso(ucId, fichas as any[]).map(m => m.id).filter(id => !compRemovidas.includes(id)).slice(0, 6);

  const conhecimentos: { id: string; nome: string; definicao: string }[] =
    (tipoPlanAula === 'teorico' || tipoPlanAula === 'misto')
      ? ((p.compAdicionadas || []) as string[]).filter(id => id.startsWith('KNW-') && !compRemovidas.includes(id)).slice(0, 6)
        .map(id => { const k: any = encontrarConhecimento(id); return { id, nome: k?.nome || id, definicao: k?.definicao || '' }; })
      : [];
  if (!ehAtitudinal) for (const k of conhecimentosDaAula(p)) {
    if (!compRemovidas.includes(k.id) && !conhecimentos.some(c => c.id === k.id))
      conhecimentos.push({ id: k.id, nome: k.texto, definicao: '' });
  }

  const evento = !!p.tipoEvento;
  const aplicavel = (id: string) => atitudeAplicavel(id, ctx, evento);
  const trimestre = trimestreAtual(new Date(String(p.data || '').slice(0, 10) + 'T00:00:00'));
  const idsDoTrimestre = atitudesDoTrimestre(ano, trimestre).map((x: any) => x.id as string);
  const marcadasNoPlano = [...new Set(((p.compAdicionadas || []) as string[]))]
    .filter(id => id.startsWith('ATI-') && !compRemovidas.includes(id) && temPerguntas(id));
  const atitudesDaAula = (!ehAtitudinal
    ? [...new Set([
        ...(evento ? ATITUDES_FIXAS_EVENTO.filter(id => !compRemovidas.includes(id) && temPerguntas(id)) : []),
        ...(opts.fardaIncompleta && temPerguntas('ATI-003') ? ['ATI-003'] : []),
      ])]
    : marcadasNoPlano.length ? marcadasNoPlano
    : idsDoTrimestre.filter(id => !compRemovidas.includes(id) && temPerguntas(id))
  ).filter(aplicavel);

  const atitudesPermitidas = opcoesDeEscolhaDoAluno(ano);
  const atitudesDoPlano = ((p.compAdicionadas || []) as string[]).filter(id => id.startsWith('ATI-'));
  const atitudesParaEscolher = [...new Set([...atitudesDoPlano, ...idsDoTrimestre])]
    .filter(id => atitudesPermitidas.includes(id) && !compRemovidas.includes(id) && aplicavel(id))
    .slice(0, MAX_ATITUDES_PARA_ESCOLHER);

  return {
    ctx, tipoPlanAula, ehAtitudinal,
    subIds, appIds, recursoIds, conhecimentos,
    atitudesDaAula, atitudesParaEscolher, atitudesPermitidas,
    escolheAtitude: !ehAtitudinal && atitudesParaEscolher.length > 0,
    tecEvento: p.tipoEvento === 'evento',
    clNaoSePergunta: !ctx.colegas && !ctx.cozinha,
    clSempre: !ctx.colegas && ctx.cozinha,
  };
}

// ── O que o professor vê: o telemóvel do aluno, por ordem ─────

export interface EcraDoAluno {
  tipo: 'tecnica' | 'preparacao' | 'conhecimento' | 'atitude' | 'escolhe' | 'evento' | 'cl' | 'cr' | 'co';
  rotulo: string;
  nome: string;
  /** As perguntas (atitudes e 5 C) como o aluno as lê. */
  perguntas: string[];
  /** Porque é que entra hoje. */
  porque: string;
  c: Letra5CAluno;
}

export interface NaoSePergunta { nome: string; motivo: string }

/**
 * Os ecrãs da autoavaliação, pela ordem em que o aluno os vê, e o que hoje
 * fica de fora (e porquê). O aluno concreto pode ainda ver a atitude da
 * farda (se chegou sem ela) e a pergunta «o que fizeste em vez das
 * técnicas» (se não teve oportunidade em nenhuma).
 */
export function ecrasDoAluno(plano: PlanoAula, fichas: FichaProducao[], ctx: ContextoAula,
  perguntaCOId: string, perguntaCRId: string, ano = 1): { ecras: EcraDoAluno[]; fora: NaoSePergunta[]; regras: RegrasAutoavaliacao } {
  const R = regrasDaAutoavaliacao(plano, fichas, { ctx, ano });
  const p: any = plano;
  const evento = !!p.tipoEvento;
  const ecras: EcraDoAluno[] = [];
  const fora: NaoSePergunta[] = [];
  const prato = (id: string) => ramoDaCompetencia(id, fichas as any[]).prato || '';
  const daFicha = (id: string) => prato(id) ? `da ficha ${prato(id)}` : 'das fichas';

  if (!R.ehAtitudinal) {
    // Como no aluno: cada preparação base com as suas técnicas, depois as soltas.
    const subs = R.subIds.slice(0, 8);
    const apps = R.appIds.slice(0, 4);
    const doApp = (s: string) => ramoDaCompetencia(s, fichas as any[]).aparelhoId;
    for (const a of apps) {
      for (const s of subs.filter(s => doApp(s) === a))
        ecras.push({ tipo: 'tecnica', rotulo: 'Técnica', nome: encontrarSubtecnica(s)?.nome || s, perguntas: [], porque: daFicha(s), c: 'cp' });
      ecras.push({ tipo: 'preparacao', rotulo: 'Preparação base', nome: encontrarAparelho(a)?.nome || a, perguntas: [], porque: daFicha(a), c: 'cp' });
    }
    for (const s of subs.filter(s => !apps.includes(doApp(s) || '')))
      ecras.push({ tipo: 'tecnica', rotulo: 'Técnica', nome: encontrarSubtecnica(s)?.nome || s, perguntas: [], porque: daFicha(s), c: 'cp' });
    if (R.subIds.length > 8) fora.push({ nome: `${R.subIds.length - 8} técnicas a mais`, motivo: 'o aluno responde no máximo a 8' });
    for (const k of R.conhecimentos)
      ecras.push({ tipo: 'conhecimento', rotulo: 'Conhecimento', nome: k.nome, perguntas: [], porque: 'marcado no plano', c: 'cp' });
    for (const id of R.recursoIds)
      ecras.push({ tipo: 'tecnica', rotulo: 'Técnica', nome: (encontrarSubtecnica(id) as any)?.nome || id, perguntas: [], porque: 'técnica da UC (as fichas não têm técnicas)', c: 'cp' });
  } else if (R.subIds.length || R.appIds.length) {
    fora.push({ nome: 'Técnicas das fichas', motivo: 'aula só de atitudes' });
  }

  const perguntasQueSeFazem = (id: string) => {
    const ps = perguntasDe(id, evento) || [];
    const aplica = perguntasAplicaveis(id, ctx, evento);
    ps.forEach((q, i) => { if (!aplica[i]) fora.push({ nome: `«${q.pergunta}»`, motivo: porqueNaoSeFaz(id, i, ctx) }); });
    return ps.filter((_, i) => aplica[i]).map(q => q.pergunta);
  };
  const nomeAti = (id: string) => ATITUDES.find(a => a.id === id)?.nome || id;

  for (const id of R.atitudesDaAula)
    ecras.push({ tipo: 'atitude', rotulo: 'Atitude', nome: nomeAti(id), perguntas: perguntasQueSeFazem(id),
      porque: evento ? 'atitude dos eventos' : R.ehAtitudinal ? 'marcada no plano' : 'farda incompleta', c: 'cp' });
  if (R.escolheAtitude) {
    ecras.push({ tipo: 'escolhe', rotulo: 'Atitude', nome: `Escolhe 1: ${R.atitudesParaEscolher.map(nomeAti).join(' · ')}`,
      perguntas: R.atitudesParaEscolher.flatMap(perguntasQueSeFazem), porque: 'do trimestre e do plano', c: 'cp' });
  }
  // Atitudes do trimestre ou do plano que hoje não fazem sentido nenhum.
  const candidatas = [...new Set([...((p.compAdicionadas || []) as string[]).filter(x => x.startsWith('ATI-')),
    ...atitudesDoTrimestre(ano as 1 | 2 | 3, trimestreAtual(new Date(String(p.data || '').slice(0, 10) + 'T00:00:00'))).map((x: any) => x.id)])];
  for (const id of candidatas) if (temPerguntas(id) && !atitudeAplicavel(id, ctx, evento))
    fora.push({ nome: nomeAti(id), motivo: porqueNaoSeFaz(id, 0, ctx) || porqueNaoSeFaz(id, 1, ctx) });

  if (R.tecEvento) ecras.push({ tipo: 'evento', rotulo: 'Evento', nome: NOME_TEC_EVENTO, perguntas: [], porque: 'é um evento', c: 'cl' });

  const qs = perguntasDaAula(perguntaCOId, perguntaCRId, R.clSempre ? CL_SEMPRE.id : undefined);
  const qcl = qs.find(q => q.chave === 'cl')!;
  if (R.clNaoSePergunta) fora.push({ nome: 'Trabalho com os colegas (CL)', motivo: porqueNao(['colegas'], ctx) + ', fora da cozinha' });
  else ecras.push({ tipo: 'cl', rotulo: 'Trabalho com os colegas', nome: qcl.titulo, perguntas: [qcl.pergunta],
    porque: R.clSempre ? 'sozinho na cozinha: o espaço e o material partilhados' : ctx.equipa ? 'trabalham em grupos' : 'todas as aulas', c: 'cl' });
  const qcr = qs.find(q => q.chave === 'cr')!;
  ecras.push({ tipo: 'cr', rotulo: 'Criativo', nome: qcr.titulo, perguntas: [qcr.pergunta], porque: 'pergunta do dia, igual para a turma', c: 'cr' });
  const qco = qs.find(q => q.chave === 'co')!;
  ecras.push({ tipo: 'co', rotulo: 'Consciente', nome: qco.titulo, perguntas: [qco.pergunta], porque: 'pergunta do dia, igual para a turma', c: 'co' });

  return { ecras, fora, regras: R };
}
