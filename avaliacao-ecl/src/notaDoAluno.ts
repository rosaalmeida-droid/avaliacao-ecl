// ============================================================
// «Como chegaste a esta nota» — as mesmas contas para o aluno e para o
// professor (Rosa, 5/out/2026: «o professor também devia ver as notas como
// os alunos veem»). As aulas, cada uma com o seu peso, as faltas, a média,
// o bónus de cada atividade e a nota da UC (a da pauta).
// ============================================================
import { notaFinalUC, aulasDaNotaUC, faltasQueContamNaNota, bonusPorAtividade } from './backend';
import { notaDaUCComDecimas } from './pautaUC';
import { posicaoNaUC } from './rotuloPlano';
import { getPlanosAula } from './backend';
import type { AulaNota } from './components/EcraNotaAtividades';
import { ocorrenciasDaAula } from './registoDaAula';

const dataCurta = (iso: string) => String(iso || '').slice(0, 10).split('-').reverse().join('/');

export function contasDaNotaDoAluno(alunoId: string, turmaId: string, ucId: string) {
  const calc = notaFinalUC(alunoId, turmaId, ucId);
  const planos = new Map(getPlanosAula().map(p => [p.id, p]));
  const aulas: AulaNota[] = aulasDaNotaUC(alunoId, turmaId, ucId).map(l => ({
    numero: planos.get(l.planoId) ? posicaoNaUC(planos.get(l.planoId)!) : 0,
    titulo: l.titulo, data: l.data, nota20: l.nota, peso: l.peso, semResposta: l.semResposta, recuperada: l.recuperada,
    // O que aconteceu nessa aula fica escrito (Rosa, 7/out/2026).
    ocorrencias: ocorrenciasDaAula(alunoId, l.planoId),
  }));
  const detalhe = {
    // As faltas que ainda contam 0 (as recuperadas estão nas aulas).
    faltas: faltasQueContamNaNota(alunoId, turmaId, ucId),
    media: calc.base,
    bonus: bonusPorAtividade(alunoId, turmaId, ucId, calc.base),
    bonusTotal: calc.bonusParticipacao,
    teto: calc.limitadaPorTeto,
    motivoTeto: calc.motivoTeto || '',
    // A nota que o aluno vê é a da aplicação, com as notas de hoje. A pauta
    // publicada é outra coisa e não muda o que se vê aqui (Rosa, 12/out/2026:
    // «a pauta não devia alterar a nota do aluno quando se vê»).
    final: notaDaUCComDecimas(alunoId, turmaId, ucId, true) ?? calc.final,
    publicada: false,
    // Com décimas (Rosa, 6/out/2026).
    contaDeAgora: notaDaUCComDecimas(alunoId, turmaId, ucId, true),
  };
  return { aulas, detalhe, nota: detalhe.final };
}
