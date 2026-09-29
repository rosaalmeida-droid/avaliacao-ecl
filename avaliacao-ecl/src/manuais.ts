// ============================================================
// Manuais do Aluno ECL (PDF) — em public/manuais/<turma>/<ficheiro>.pdf
// ============================================================
// Cada turma tem a sua versão (2023-2026, 2024-2027, 2025-2028). Os alunos
// veem todos os manuais do curso, com o da UC atual primeiro; o professor
// vê todos. Os de 2023-2026 servem também a recuperações (Rosa, set/2026).
// ============================================================
import { anoDaTurma } from './cronograma';

export interface Manual {
  ficheiro: string;
  titulo: string;
  /** Ano do curso em que se dá (para agrupar). */
  ano: 1 | 2 | 3;
  /** Códigos do cronograma a que corresponde. */
  modulos: string[];
  /** Anexo (fichas técnicas), se houver: ficheiro na mesma pasta. */
  anexo?: string;
}

/** As 7 UC práticas do 1.º ano (referencial novo 811RA144). */
export const MANUAIS_UC_1ANO: Manual[] = [
  { ficheiro: 'UC03576', titulo: 'Planear e organizar a produção de cozinha', ano: 1, modulos: ['UC03576'], anexo: 'UC03576_Anexo' },
  { ficheiro: 'UC01999', titulo: 'Preparar e executar confeções de cozinha', ano: 1, modulos: ['UC01999'], anexo: 'UC01999_Anexo' },
  { ficheiro: 'UC03577', titulo: 'Preparar e confecionar molhos e fundos de cozinha', ano: 1, modulos: ['UC03577'] },
  { ficheiro: 'UC02002', titulo: 'Preparar e confecionar acepipes, sopas, entradas, ovos e massas', ano: 1, modulos: ['UC02002'] },
  { ficheiro: 'UC02003', titulo: 'Preparar e confecionar carnes, aves, caça e acompanhamentos', ano: 1, modulos: ['UC02003'] },
  { ficheiro: 'UC02004', titulo: 'Preparar e confecionar peixes, mariscos e acompanhamentos', ano: 1, modulos: ['UC02004'] },
  { ficheiro: 'UC02005', titulo: 'Preparar e confecionar massas base, recheios, cremes e molhos de pastelaria', ano: 1, modulos: ['UC02005'] },
];

export const MANUAIS_UFCD: Manual[] = [
  { ficheiro: 'UFCD01', titulo: 'Planear e organizar a produção de cozinha', ano: 1, modulos: ['UFCD 01', 'UC03576'] },
  { ficheiro: 'UFCD02', titulo: 'Preparar e executar confeções de cozinha', ano: 1, modulos: ['UFCD 02'] },
  { ficheiro: 'UFCD02_UC01999', titulo: 'Preparar e executar confeções de cozinha (UC01999)', ano: 1, modulos: ['UC01999'] },
  { ficheiro: 'UFCD11', titulo: 'Preparar e confecionar molhos e fundos de cozinha', ano: 1, modulos: ['UFCD 11', 'UC03577'] },
  { ficheiro: 'UFCD13', titulo: 'Planeamento e confeção de sopas, cremes e aveludados', ano: 1, modulos: ['UFCD 13'] },
  { ficheiro: 'UFCD12', titulo: 'Preparar e confecionar acepipes, sopas, entradas, ovos e massas', ano: 2, modulos: ['UFCD 12', 'UC02002'] },
  { ficheiro: 'UFCD14', titulo: 'Preparar e confecionar carnes, aves, caça e acompanhamentos', ano: 2, modulos: ['UFCD 14', 'UC02003'] },
  { ficheiro: 'UFCD15', titulo: 'Preparar e confecionar peixes, mariscos e acompanhamentos', ano: 2, modulos: ['UFCD 15', 'UC02004'] },
  { ficheiro: 'UFCD20', titulo: 'Preparar e confecionar massas base, recheios, cremes e molhos de pastelaria', ano: 2, modulos: ['UFCD 20', 'UC02005'] },
  { ficheiro: 'UFCD16', titulo: 'Planeamento e confeção de cozinha tradicional portuguesa', ano: 3, modulos: ['UFCD 16'] },
  { ficheiro: 'UFCD22-1', titulo: 'Pastelaria tradicional portuguesa', ano: 3, modulos: ['UFCD 22.1'] },
  { ficheiro: 'UFCD22-2', titulo: 'Doçaria conventual portuguesa', ano: 3, modulos: ['UFCD 22.2'] },
  { ficheiro: 'UFCD17', titulo: 'Planeamento e confeção de cozinha internacional', ano: 3, modulos: ['UFCD 17'] },
  { ficheiro: 'UFCD23', titulo: 'Planeamento e confeção de pastelaria internacional', ano: 3, modulos: ['UFCD 23'] },
  { ficheiro: 'UFCD18', titulo: 'Iguarias das novas tendências de cozinha', ano: 3, modulos: ['UFCD 18'] },
  { ficheiro: 'UFCD19', titulo: 'Planeamento e execução de serviços especiais de cozinha', ano: 3, modulos: ['UFCD 19'] },
];

/** Os manuais das UC do 3.º ano (referencial novo) — só para o professor, por agora. */
export const MANUAIS_UC: Manual[] = [
  { ficheiro: 'UC03586', titulo: 'Iguarias da cozinha e doçaria tradicional portuguesa', ano: 3, modulos: ['UC03586'] },
  { ficheiro: 'UC03588', titulo: 'Iguarias da gastronomia do Mundo', ano: 3, modulos: ['UC03588'] },
  { ficheiro: 'UC03589', titulo: 'Iguarias das novas tendências de cozinha', ano: 3, modulos: ['UC03589'] },
  { ficheiro: 'UC03591', titulo: 'Planear e executar serviços especiais de cozinha', ano: 3, modulos: ['UC03591'] },
  { ficheiro: 'UC03592', titulo: 'Planear e confecionar pastelaria internacional', ano: 3, modulos: ['UC03592'] },
];

export const COORTES = ['2023-2026', '2024-2027', '2025-2028'] as const;
export type Coorte = typeof COORTES[number];

/** A versão dos manuais de cada turma, no ano letivo 2026-2027. */
export function coorteDaTurma(turmaId: string): Coorte {
  const ano = anoDaTurma(turmaId);
  return ano === 3 ? '2024-2027' : '2025-2028';
}

export const urlManual = (m: Manual, coorte: Coorte | 'UC') =>
  `/manuais/${coorte}/${m.ficheiro}.pdf`;

/** O manual de um módulo do cronograma: primeiro o da UC (referencial novo). */
export const manualDoModulo = (moduloId: string): Manual | undefined =>
  [...MANUAIS_UC_1ANO, ...MANUAIS_UC, ...MANUAIS_UFCD].find(m => m.modulos.includes(moduloId));

/** Os manuais de UC (pasta «UC») — os outros estão na pasta da versão da turma. */
export const ehManualUC = (m: Manual) => MANUAIS_UC_1ANO.includes(m) || MANUAIS_UC.includes(m);

/** Módulos de cozinha/pastelaria do cronograma sem manual (para dizer à Rosa). */
export const SEM_MANUAL = ['UC03593', 'UFCD 21.1', 'UFCD 21.2'];
export { anoDaTurma };
