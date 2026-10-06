// ============================================================
// «Como chegaste a esta nota» — as mesmas contas para o aluno e para o
// professor (Rosa, 5/out/2026: «o professor também devia ver as notas como
// os alunos veem»). As aulas, cada uma com o seu peso, as faltas, a média,
// o bónus de cada atividade e a nota da UC (a da pauta).
// ============================================================
import { notaFinalUC, aulasDaNotaUC, getPlanosFaltadosPorUC, bonusPorAtividade, getNotaFinalPublicadaUC } from './backend';
import { notaDaUCComoNaPauta } from './pautaUC';
import { posicaoNaUC } from './rotuloPlano';
import { getPlanosAula } from './backend';
import type { AulaNota } from './components/EcraNotaAtividades';

const dataCurta = (iso: string) => String(iso || '').slice(0, 10).split('-').reverse().join('/');

export function contasDaNotaDoAluno(alunoId: string, turmaId: string, ucId: string) {
  const calc = notaFinalUC(alunoId, turmaId, ucId);
  const planos = new Map(getPlanosAula().map(p => [p.id, p]));
  const aulas: AulaNota[] = aulasDaNotaUC(alunoId, turmaId, ucId).map(l => ({
    numero: planos.get(l.planoId) ? posicaoNaUC(planos.get(l.planoId)!) : 0,
    titulo: l.titulo, data: l.data, nota20: l.nota, peso: l.peso, semResposta: l.semResposta,
  }));
  const detalhe = {
    faltas: getPlanosFaltadosPorUC(alunoId, ucId, turmaId).map(p => ({ titulo: p.titulo || 'Aula', data: dataCurta(p.data) })),
    media: calc.base,
    bonus: bonusPorAtividade(alunoId, turmaId, ucId, calc.base),
    bonusTotal: calc.bonusParticipacao,
    teto: calc.limitadaPorTeto,
    motivoTeto: calc.motivoTeto || '',
    // A mesma nota da UC que se vê no resto da aplicação (a da pauta).
    final: notaDaUCComoNaPauta(alunoId, turmaId, ucId) ?? calc.final,
    publicada: !!getNotaFinalPublicadaUC(alunoId, ucId),
  };
  return { aulas, detalhe, nota: detalhe.final };
}
