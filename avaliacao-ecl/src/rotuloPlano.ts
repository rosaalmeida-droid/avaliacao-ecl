// "Plano de Aula N de M" + avisos de fim de UC.
//  N = posição do plano dentro da sua UC (ordenado por data).
//  M = dias de cozinha da turma entre início e fim da UC (horários.ts);
//      para as outras disciplinas, semanas.
import { TIPOS_EVENTO, nomeDoTipoAtividade } from './eventosAvaliacao';
import { getPlanosAula, horasDoPlano } from './backend';
import { CRONOGRAMA_2026_2027, modulosDaTurma } from './cronograma';
import { horarioDaTurma, temCozinha } from './horarios';
import type { PlanoAula } from './types';

const DIA = 86400000;

function modDaUC(plano: PlanoAula): any {
  // Pela turma: a mesma UC pode ter datas diferentes em duas turmas do
  // mesmo ano (a BCR dá a UC03576 até 16/10, a ACR até 13/11).
  const daTurma = modulosDaTurma(plano.turmaId).find(x => x.id === plano.ucId);
  return daTurma || CRONOGRAMA_2026_2027.find(x => x.id === plano.ucId);
}

// Feriados nacionais em dias de semana, dentro dos períodos letivos de
// 2026/27.
const FERIADOS_2026_27 = new Set([
  '2026-10-05', '2026-12-01', '2026-12-08', '2027-05-27',
]);

// Interrupções letivas, tiradas dos intervalos do cronograma (o 1º
// período acaba a 15/12 e o 2º começa a 04/01; o 2º acaba a 19/03 e o
// 3º começa a 30/03). Módulos que atravessam o Natal não contam as
// semanas de férias.
const INTERRUPCOES_2026_27: [string, string][] = [
  ['2026-12-16', '2027-01-03'],
  ['2027-03-20', '2027-03-29'],
];
const emInterrupcao = (iso: string) => INTERRUPCOES_2026_27.some(([a, b]) => iso >= a && iso <= b);

/**
 * Quantas aulas tem a UC — os dias de cozinha reais da turma entre o
 * início e o fim do módulo (um plano = as horas seguidas de um dia).
 * Contava semanas: no 3º ACP, com cozinha três dias por semana, um
 * módulo de 5 semanas dizia "de 5" quando tem 15 aulas.
 *
 * Só para Serviços de Cozinha/Pastelaria — é só esse o horário que a
 * aplicação conhece. Para as outras disciplinas continua a contar semanas.
 */
export function totalAulasUC(plano: PlanoAula): number {
  const mod = modDaUC(plano);
  if (!mod || !mod.dataInicio || !mod.dataFim) return 0;
  const ini = new Date(mod.dataInicio + 'T00:00:00');
  const fim = new Date(mod.dataFim + 'T00:00:00');
  if (isNaN(ini.getTime()) || isNaN(fim.getTime()) || fim < ini) return 0;

  const ehCozinha = /cozinha/i.test(String(mod.disciplina || ''));
  if (ehCozinha && horarioDaTurma(plano.turmaId)) {
    let n = 0;
    for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!FERIADOS_2026_27.has(iso) && !emInterrupcao(iso) && temCozinha(plano.turmaId, iso)) n++;
    }
    if (n > 0) return n;
  }
  return Math.floor((fim.getTime() - ini.getTime()) / (7 * DIA)) + 1;
}

/** Evento ou concurso fora do horário: não é uma aula, não entra na
 *  numeração dos planos («Plano 1 de 17»). Tem numeração própria. */
export function ehEventoForaDoHorario(p: PlanoAula): boolean {
  return !!(p as any).tipoEvento && TIPOS_EVENTO.includes((p as any).tipoAtividade);
}

/** Numeração dos eventos da escola, por ano: E-2026-001, E-2026-002…
 *  Conta todos os eventos e concursos (fora ou dentro do horário), pela data. */
export function codigoEvento(plano: PlanoAula): string {
  if (!(plano as any).tipoEvento) return '';
  const ano = String(plano.data || '').slice(0, 4) || String(new Date().getFullYear());
  const doAno = getPlanosAula()
    .filter((p: any) => p.tipoEvento && p.estado !== 'arquivado' && String(p.data || '').startsWith(ano))
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || String(a.criadoEm || '').localeCompare(String(b.criadoEm || '')));
  const i = doAno.findIndex(p => p.id === plano.id);
  const n = i >= 0 ? i + 1 : doAno.length + 1;
  return `E-${ano}-${String(n).padStart(3, '0')}`;
}

/** «Evento externo · E-2026-001» / «Concurso · E-2026-002». */
export function rotuloEvento(plano: PlanoAula): string {
  const tipo = (plano as any).tipoAtividade && TIPOS_EVENTO.includes((plano as any).tipoAtividade)
    ? (plano as any).tipoAtividade : ((plano as any).tipoEvento === 'concurso' ? 'Concurso' : 'Evento');
  return `${nomeDoTipoAtividade(tipo)} · ${codigoEvento(plano)}`;
}

export function posicaoNaUC(plano: PlanoAula): number {
  if (ehEventoForaDoHorario(plano)) return 0;
  const daUC = getPlanosAula()
    .filter(p => p.ucId === plano.ucId && p.turmaId === plano.turmaId && p.estado !== 'arquivado' && !ehEventoForaDoHorario(p))
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || (a.numeroPlan || 0) - (b.numeroPlan || 0));
  const idx = daUC.findIndex(p => p.id === plano.id);
  if (idx >= 0) return idx + 1;
  // Um plano que não está na conta (arquivado, por exemplo): a posição dele
  // pela data, entre os outros da UC. Nunca o n.º interno (157…), que não
  // quer dizer nada para o professor (Rosa, out/2026).
  const antes = daUC.filter(p => String(p.data || '') < String(plano.data || '')
    || (String(p.data || '') === String(plano.data || '') && (p.numeroPlan || 0) < (plano.numeroPlan || 0))).length;
  return antes + 1;
}

/** As horas da UC que este plano cobre (Rosa, 5/out/2026): cada hora é uma
 *  aula, como nos sumários do eSchooling. Um plano de 3 h depois de 18 h já
 *  dadas são as horas 19 a 21. O total é o do cronograma (o mesmo das faltas). */
export function horasDoPlanoNaUC(plano: PlanoAula): { de: number; ate: number; total: number } | null {
  const mod = modDaUC(plano);
  const total = Number(mod?.horasPrevistas) || 0;
  const h = horasDoPlano(plano);
  if (!total || !h || ehEventoForaDoHorario(plano)) return null;
  const n = posicaoNaUC(plano);
  const antes = getPlanosAula()
    .filter(p => p.ucId === plano.ucId && p.turmaId === plano.turmaId && p.id !== plano.id && p.estado !== 'arquivado' && !ehEventoForaDoHorario(p))
    .filter(p => posicaoNaUC(p) < n)
    .reduce((s, p) => s + horasDoPlano(p), 0);
  return { de: Math.floor(antes) + 1, ate: Math.round(antes + h), total };
}

export function rotuloPlano(plano: PlanoAula): string {
  if (!plano) return 'Plano de aula';
  if (ehEventoForaDoHorario(plano)) return rotuloEvento(plano);
  // Com as horas da UC no cronograma, o plano diz que horas cobre:
  // «Plano de Aula 7, que dá as horas 19 a 21 das 50 horas da UC» (Rosa, 5/out/2026).
  const hs = horasDoPlanoNaUC(plano);
  if (hs) {
    const np = posicaoNaUC(plano);
    const horas = hs.ate <= hs.de ? `a hora ${hs.de}` : `as horas ${hs.de} a ${hs.ate}`;
    return `Plano de Aula ${np}, que dá ${horas} das ${hs.total} horas da UC`;
  }
  const n = posicaoNaUC(plano);
  const m = totalAulasUC(plano);

  // "12 de 5" não quer dizer nada: são 12 planos criados numa unidade
  // que o cronograma diz ter 5 semanas. Quando isso acontece, mostra-se
  // só a posição — o total do cronograma deixou de servir de referência.
  if (!m || n > m) return 'Plano de Aula ' + n;

  return 'Plano de Aula ' + n + ' de ' + m;
}

/** Aviso a mostrar ao professor sobre o fim da UC. '' se não há aviso. */
export function avisoFimUC(plano: PlanoAula): string {
  if (!plano) return '';
  const mod = modDaUC(plano);
  if (!mod || !mod.dataFim) return '';
  const fim = new Date(mod.dataFim).getTime();
  if (isNaN(fim)) return '';

  // 1) Este plano é a última aula da UC? (é o último N de M, ou a sua data cai na última semana)
  // Pelas horas da UC (o plano que chega à última hora), ou pela data.
  // Antes contava planos: com 13 planos numa UC «de 4», todos eram «a última».
  const hs = horasDoPlanoNaUC(plano);
  const n = posicaoNaUC(plano), m = totalAulasUC(plano);
  const dataPlano = plano.data ? new Date(plano.data).getTime() : NaN;
  const naUltimaSemana = !isNaN(dataPlano) && fim - dataPlano <= 7 * DIA && fim - dataPlano >= -DIA;
  const ultimaPelasHoras = hs ? hs.de <= hs.total && hs.ate >= hs.total : (!!m && n === m);
  if (ultimaPelasHoras || naUltimaSemana) {
    return '⚠️ Última aula desta UC — é o momento de fechar a avaliação e recuperar competências em falta.';
  }

  // 2) A UC termina dentro de uma semana (relativo a hoje)?
  const faltam = fim - Date.now();
  if (faltam >= 0 && faltam <= 7 * DIA) {
    return '📅 Esta UC termina para a semana.';
  }
  return '';
}

/** Texto do plano do dia: «quinta-feira, 01/10, 10:30–15:00 · Plano de Aula 3 de 12 — título».
 *  (Rosa, out/2026) A numeração conta de 1 em cada UC da turma, como no
 *  resto da aplicação; o n.º interno (157…) não aparece. */
export function rotuloDoPlano(p: any): string {
  if (!p) return '';
  const dia = new Date(String(p.data || '').slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: '2-digit' });
  // Uma aula que ficou com o nome de uma atividade (criada antes da regra
  // «a atividade nunca muda a aula») não se apresenta com esse nome.
  const t = String(p.titulo || '');
  const nomeDeAtividade = !p.tipoEvento && TIPOS_EVENTO.some(x => t.startsWith(x));
  return `${dia}${p.horaInicio ? `, ${p.horaInicio}–${p.horaFim || ''}` : ''} · ${rotuloPlano(p)}${p.ucId ? ` (${p.ucId})` : ''}${t && !nomeDeAtividade ? ` — ${t}` : ''}`;
}
