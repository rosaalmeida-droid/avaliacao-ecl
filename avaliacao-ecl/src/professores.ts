// ============================================================
// Professores de cozinha e as suas turmas
// ============================================================
// Cada professor entra com o seu PIN e só vê as suas turmas (e os
// planos delas). A coordenadora vê tudo e é quem entrega os PINs.
// ============================================================

export interface Professor {
  nome: string;
  pin: string;
  turmas: string[];
}

export const PROFESSORES: Professor[] = [
  { nome: 'Rosa Almeida', pin: '1111', turmas: ['1º BCR', '1º ACR', '3º ACP'] },
  // PIN provisório: a coordenadora entrega-o ao Mateus (vê-o em Configuração).
  { nome: 'Mateus Freire', pin: '2468', turmas: ['2º ACP'] },
];

export function professorPorNome(nome: string): Professor | undefined {
  const n = String(nome || '').trim().toLowerCase();
  return PROFESSORES.find(p => p.nome.toLowerCase() === n);
}

/** As turmas a que um professor tem acesso. */
export function turmasDoProfessor(nome: string): string[] {
  return professorPorNome(nome)?.turmas || [];
}

/** Antes de publicar: para que turma é? Evita publicar na turma errada. */
export function confirmarTurmaAoPublicar(turmaId: string, titulo?: string): boolean {
  return confirm(`Publicar ${titulo ? `«${titulo}» ` : 'esta aula '}para a turma ${turmaId}?\n\n`
    + `Só os alunos do ${turmaId} a vão ver. Se não é para esta turma, cancela.`);
}
