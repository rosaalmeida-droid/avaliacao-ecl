// "Plano de Aula N de M"
//  N = posição do plano dentro da sua UC (ordenado por data).
//  M = nº de aulas previstas para a UC. Cada SEMANA é um plano de aula, por isso
//      M = horas do módulo ÷ horas por semana da disciplina, ARREDONDADO PARA CIMA.
//      As horas/semana vêm dos cronogramas oficiais (por disciplina e ano).
import { getPlanosAula } from './backend';
import { CRONOGRAMA_2026_2027 } from './cronograma';
import type { PlanoAula } from './types';

// horas por semana por (disciplina | ano) — dos cronogramas oficiais ECL
const HORAS_SEMANA: Record<string, number> = {
  // 1º ano
  'Serviços de Cozinha-Pastelaria|1': 5.47,
  'Serviços de Cozinha e Pastelaria|1': 5.47,
  'Tecnologia Alimentar|1': 1.56,
  'Serviços de Restaurante e Bar|1': 2.34,
  'Gestão e Controlo|1': 1.6,
  // 2º ano
  'Serviços de Cozinha-Pastelaria|2': 8,
  'Serviços de Cozinha e Pastelaria|2': 8,
  'Tecnologia Alimentar|2': 1.5,
  'Gestão e Controlo|2': 3,
  // 3º ano
  'Serviços de Cozinha/Pastelaria|3': 9,
  'Serviços de Cozinha-Pastelaria|3': 9,
  'Serviços de Cozinha e Pastelaria|3': 9,
  'Gestão e Controlo|3': 4.5,
};

export function totalAulasUC(plano: PlanoAula): number {
  const mod: any = CRONOGRAMA_2026_2027.find(x => x.id === plano.ucId);
  if (!mod || !mod.horasPrevistas) return 0;
  const hSem = HORAS_SEMANA[`${mod.disciplina}|${mod.turmaAno}`];
  if (!hSem) return 0; // disciplina sem horas/semana conhecidas → não mostra "de M"
  return Math.ceil(mod.horasPrevistas / hSem);
}

export function rotuloPlano(plano: PlanoAula): string {
  if (!plano) return 'Plano de aula';
  const daUC = getPlanosAula()
    .filter(p => p.ucId === plano.ucId && p.turmaId === plano.turmaId && p.estado !== 'arquivado')
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || (a.numeroPlan || 0) - (b.numeroPlan || 0));
  const idx = daUC.findIndex(p => p.id === plano.id);
  const n = idx >= 0 ? idx + 1 : (plano.numeroPlan || 1);
  const m = totalAulasUC(plano);
  return 'Plano de Aula ' + n + (m ? ' de ' + m : '');
}
