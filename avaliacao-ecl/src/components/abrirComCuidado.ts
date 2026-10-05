// ============================================================
// Abrir uma aula com cuidado (Rosa, 5/out/2026)
// ============================================================
// «Enganei-me e abri uma aula que era para ser só amanhã.» Abrir uma aula
// de outro dia pede confirmação: os dez minutos de tolerância começam a
// contar quando se abre, e no dia da aula todos ficariam com atraso. E uma
// abertura feita por engano pode anular-se.
// ============================================================
import type { PlanoAula } from '../types';
import { janelaConfirmar } from './janelaConfirmar';
import { diasAteAAula, anularAberturaAula, getPresencas } from '../backend';

const dataPT = (iso: string) => new Date(String(iso).slice(0, 10) + 'T12:00:00')
  .toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

/** Aula de outro dia: pergunta antes de abrir. Devolve true para abrir. */
export async function confirmarAberturaAntecipada(plano: PlanoAula): Promise<boolean> {
  const dias = diasAteAAula(plano);
  if (dias <= 0) return true;
  return janelaConfirmar({
    titulo: dias === 1 ? `Esta aula é amanhã, ${dataPT(plano.data)}.` : `Esta aula é daqui a ${dias} dias, ${dataPT(plano.data)}.`,
    texto: 'Quer mesmo abri-la hoje? Os alunos passam a vê-la aberta já, e os dez minutos de tolerância começam a contar agora: no dia da aula, todos os alunos ficariam com atraso. O melhor é abrir a aula no próprio dia.',
    nao: 'Não, abro no dia da aula', sim: 'Sim, abrir hoje',
  });
}

/** Anula uma abertura feita por engano, depois de confirmar. */
export async function anularAberturaComConfirmacao(plano: PlanoAula, professor: string): Promise<boolean> {
  const entraram = new Set(getPresencas().filter(r => r.planoAulaId === plano.id).map(r => r.alunoId)).size;
  const ok = await janelaConfirmar({
    titulo: 'Quer anular a abertura desta aula?',
    texto: 'A aula fica como se não tivesse sido aberta: os alunos deixam de a ver aberta. Quando a abrir no dia certo, os dez minutos de tolerância contam a partir daí.'
      + (entraram ? `\n\nAtenção: ${entraram === 1 ? 'já entrou 1 aluno' : `já entraram ${entraram} alunos`}. ${entraram === 1 ? 'Essa entrada é apagada' : 'Essas entradas são apagadas'}, e ${entraram === 1 ? 'o aluno volta' : 'os alunos voltam'} a entrar quando a aula abrir.` : ''),
    nao: 'Não, deixar aberta', sim: 'Sim, anular a abertura', perigo: true,
  });
  if (ok) anularAberturaAula(plano.id, professor);
  return ok;
}
