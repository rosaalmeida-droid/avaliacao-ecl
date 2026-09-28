// ============================================================
// Frases mais simples para alunos com medidas seletivas (nível 2) ou
// adicionais (nível 3).
// ============================================================
// O mesmo calibre e o mesmo objetivo das frases normais — só mais fáceis
// de ler: frases curtas, palavras do dia a dia, uma ideia de cada vez,
// e sempre sobre o que se vê (o que fiz), não sobre o que sou.
// A ordem é a mesma: [ainda não, a desenvolver, já consigo, já domino].
// ============================================================
import { FRASES_ATITUDES } from './frases_atitudes';

export const FRASES_ATITUDES_SIMPLES: Record<string, [string, string, string, string]> = {
  'ATI-001': ['Quando erro, ainda não digo.', 'Às vezes digo quando erro.', 'Quando erro, digo e corrijo.', 'Digo quando erro, corrijo e ajudo um colega a corrigir.'],
  'ATI-002': ['Preciso que me digam o que fazer.', 'Faço umas coisas sozinho/a, outras não.', 'Faço o meu trabalho sozinho/a.', 'Faço sozinho/a e ajudo um colega a organizar-se.'],
  'ATI-003': ['Hoje faltava-me parte da farda ou da higiene.', 'Tinha quase tudo, faltou um pormenor.', 'Tinha a farda completa e a higiene em ordem.', 'Tinha tudo completo e avisei um colega do que lhe faltava.'],
  'ATI-004': ['Espero que me digam o que fazer a seguir.', 'Avanço quando é fácil ver o que falta.', 'Avanço sem esperar que me peçam.', 'Vejo o que falta, faço e preparo coisas para os colegas.'],
  'ATI-005': ['Quando há pressa, fico nervoso/a e paro.', 'Quando há pressa, custa-me, mas continuo.', 'Quando há pressa, fico calmo/a e continuo.', 'Fico calmo/a e ajudo os outros a acalmar.'],
  'ATI-006': ['Não digo o que penso, ou digo mal.', 'Digo o que penso, mas nem sempre com calma.', 'Digo o que penso com calma e respeito.', 'Digo o que penso com respeito e ajudo o grupo a combinar.'],
  'ATI-007': ['Não reparo quando um colega precisa de ajuda.', 'Às vezes reparo, mas não faço nada.', 'Reparo quando um colega precisa e ajudo.', 'Ajudo antes de o colega pedir.'],
  'ATI-008': ['Interrompo ou distraio-me quando falam.', 'Ouço, mas nem sempre percebo tudo.', 'Ouço até ao fim e pergunto se não percebi.', 'Ouço, pergunto e ajudo os outros a perceber.'],
  'ATI-009': ['Custa-me trabalhar com os colegas.', 'Trabalho com os colegas, mas nem sempre bem.', 'Trabalho bem com o grupo e divido as tarefas.', 'Ajudo o grupo a resolver problemas e a incluir todos.'],
  'ATI-010': ['Quando é difícil, desisto.', 'Tento, mas às vezes paro antes do fim.', 'Mesmo difícil, continuo até acabar.', 'Continuo até acabar e animo os colegas.'],
  'ATI-011': ['O meu lugar e o material ficam desarrumados.', 'Arrumo, mas tenho de voltar a arrumar muitas vezes.', 'O meu lugar fica arrumado do início ao fim.', 'Arrumo o meu lugar e ajudo a arrumar o da equipa.'],
  'ATI-012': ['Quando o plano muda, fico perdido/a.', 'Algumas mudanças correm bem, outras não.', 'Quando o plano muda, continuo a trabalhar bem.', 'Quando muda, adapto-me logo e ajudo os colegas.'],
  'ATI-013': ['Não gosto que me corrijam.', 'Aceito a correção, mas não mudo.', 'Aceito a correção e faço como me disseram.', 'Peço opinião e faço logo como me disseram.'],
  'ATI-014': ['Deito fora comida que ainda servia.', 'Às vezes aproveito, às vezes não.', 'Aproveito bem os ingredientes.', 'Aproveito tudo e dou ideias para não estragar.'],
  'ATI-015': ['Esqueço-me de regras da cozinha.', 'Cumpro quase todas as regras.', 'Cumpro as regras sem me lembrarem.', 'Cumpro as regras e lembro os colegas.'],
  'ATI-016': ['Esqueço-me de passos de higiene dos alimentos.', 'Cumpro quase sempre, falha-me um passo.', 'Cumpro a higiene dos alimentos em todo o trabalho.', 'Cumpro sempre e aviso quando vejo um perigo.'],
  'ATI-017': ['Esqueço-me da segurança com facas e máquinas.', 'Tenho cuidado quase sempre.', 'Uso facas e máquinas com segurança.', 'Trabalho com segurança e aviso quem está em perigo.'],
  'ATI-018': ['Digo coisas sem pensar se magoam.', 'Tenho algum cuidado com o que digo.', 'Tenho cuidado com o que digo aos colegas.', 'Tenho cuidado e ajudo quem está triste.'],
  'ATI-019': ['Tenho vergonha de mostrar o meu trabalho.', 'Mostro, mas fico nervoso/a.', 'Mostro e explico o meu trabalho com confiança.', 'Explico o meu trabalho com calma a qualquer pessoa.'],
  'ATI-020': ['Ainda não sei estar numa cozinha profissional.', 'Porto-me bem quase sempre.', 'Porto-me como um profissional a aula toda.', 'Porto-me como profissional e sou exemplo para os colegas.'],
  'ATI-021': ['Não sei dizer se o meu trabalho está bem.', 'Tento ver o que falhou, mas é difícil.', 'Vejo o que falhou e digo como melhorar.', 'Vejo o que falhou no meu trabalho e no do grupo e dou ideias.'],
  'ATI-022': ['Custa-me trabalhar com quem é diferente.', 'Respeito, mas às vezes fico desconfortável.', 'Respeito todos e trabalho bem com todos.', 'Respeito todos e ajudo a que ninguém fique de fora.'],
};

/** As frases de uma atitude para este aluno (nível 2 e 3: as simples). */
export function frasesDaAtitude(id: string, nivelMedidas?: number): string[] | undefined {
  if ((nivelMedidas || 1) >= 2 && FRASES_ATITUDES_SIMPLES[id]) return FRASES_ATITUDES_SIMPLES[id];
  return FRASES_ATITUDES.find(f => f.competenciaId === id)?.frases;
}

/** Os níveis das técnicas e conhecimentos, em palavras simples. */
export const OPCOES_SIMPLES: Record<string, string> = {
  nf: 'Não fiz',
  tp: 'Tentei, ainda não sei bem',
  ca: 'Fiz com ajuda',
  fs: 'Fiz sozinho/a',
  mbr: 'Fiz sozinho/a e ficou muito bem',
};

/** Pede uma prova concreta a quem escolhe os níveis de cima (já consigo / já domino). */
export function pedidoDeExemplo(nivelMedidas?: number): string {
  return (nivelMedidas || 1) >= 2
    ? 'Diz uma coisa que fizeste hoje (uma frase).'
    : 'Diz uma coisa concreta que fizeste hoje que mostra isto. O professor confirma.';
}
