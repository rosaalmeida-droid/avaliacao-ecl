// ============================================================
// O que aconteceu em cada aula — para ficar escrito (Rosa, 7/out/2026)
// ============================================================
// «No fim da UC o aluno tem de saber o que aconteceu naquela aula, em
// termos de comportamento, de falha de farda, em tudo. Um dia já não me
// vou lembrar, o aluno também não, e vai-me perguntar porque teve aquela
// nota.» Aparece por baixo de cada aula, em «Como chegaste a esta nota»
// (aluno), nas Notas da UC (professor) e na folha impressa.
// ============================================================
import { getPresencas, getPlanosAula, validacaoDaAula, fracaoDosBlocos } from './backend';
import { ATITUDES_DETALHADAS } from './compatECL';
import { decisaoFardaNaAula } from './regrasFarda';
import { compromissoPorCumprir, textoCompromisso, horasDoAlunoNaAula } from './presencaParcial';

const nomeAtitude = (id: string) => ATITUDES_DETALHADAS.find(a => a.id === id)?.nome || id;

/** As frases do que aconteceu nesta aula a este aluno. Vazio numa aula sem nada a assinalar. */
export function ocorrenciasDaAula(alunoId: string, planoAulaId: string): string[] {
  const out: string[] = [];
  const r: any = getPresencas().find(x => x.alunoId === alunoId && x.planoAulaId === planoAulaId);
  const v: any = validacaoDaAula(alunoId, planoAulaId);
  const plano = getPlanosAula().find(p => p.id === planoAulaId);

  // Chegada e presença.
  const b = fracaoDosBlocos(v);
  const h = horasDoAlunoNaAula(alunoId, planoAulaId);
  if (b) out.push(`Esteve em ${b.esteve} de ${b.total} tempos: a nota conta ${b.esteve}/${b.total}`);
  else if (h) out.push(`Esteve em ${h.blocosEsteve} de ${h.blocosTotal} tempos da aula`);
  if (r?.decisaoProfessor === 'falta_atraso') out.push(`Falta de atraso${r.horaEntrada ? ` (entrou às ${String(r.horaEntrada).slice(0, 5)})` : ''}`);
  else if (r?.atrasado && r?.horaEntrada && !b && !h) out.push(`Chegou atrasado (entrou às ${String(r.horaEntrada).slice(0, 5)})`);

  // Farda.
  const emFalta: string[] = r?.fardaEmFalta || [];
  const semFardaNaEntrada = r?.fardaDeclarada ? emFalta.length > 0 : (!!r?.horaEntrada && r?.fardamentoOk === false);
  if (semFardaNaEntrada || v?.semFarda || v?.fardaPerdoada) {
    const falta = emFalta.length ? ` (faltava: ${emFalta.join(', ')})` : '';
    const d = decisaoFardaNaAula(alunoId, planoAulaId).decisao;
    if (d === 'sem_pratica') out.push(`Sem farda completa${falta}: não fez prática; as técnicas contaram 0`);
    else if (d === 'tolerancia' || (v?.fardaPerdoada && !v?.semFarda)) out.push(`Sem farda completa${falta}: teve a tolerância do período; as técnicas contaram`);
    else if (v?.semFarda) out.push(`Sem farda completa${falta}: as técnicas contaram 0`);
    else out.push(`Sem farda completa${falta}`);
  }
  if (v?.faltouVerdade) out.push('Disse que tinha a farda completa e não era verdade');

  // Atitudes abaixo de 3 (nota validada pelo professor).
  const baixas = (v?.notas || []).filter((n: any) => String(n.competenciaId).startsWith('ATI-') && Number(n.nota) > 0 && Number(n.nota) < 3)
    .map((n: any) => nomeAtitude(n.competenciaId));
  if (baixas.length) out.push(`Atitude abaixo de 3: ${baixas.join(', ')}`);

  // O compromisso da aula anterior, quando não foi cumprido nesta.
  if (plano) {
    const c = compromissoPorCumprir(alunoId, plano);
    if (c && c.cumpriu === false) out.push(`Não cumpriu o compromisso «${textoCompromisso(c.compromisso)}»`);
  }

  // O que o professor escreveu ao validar.
  const coment = String(v?.comentarioGeral || '').trim();
  if (coment) out.push(`Professor: «${coment}»`);
  return out;
}
