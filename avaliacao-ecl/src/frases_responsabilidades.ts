// ============================================================
// Frases de autoavaliação — RESPONSABILIDADES (R01-R12)
// Ordem: [não atingi, em desenvolvimento, atingi, superei]
// ============================================================

import { FrasesCompetencia } from './frases_atitudes';

export const FRASES_RESPONSABILIDADES: FrasesCompetencia[] = [
  {
    competenciaId: 'R01', // Higiene e segurança alimentar
    frases: [
      'Não cumpri normas básicas de higiene alimentar (ex: lavagem de mãos, contaminação cruzada) e foi-me chamada a atenção.',
      'Cumpri a maioria das normas de higiene alimentar, mas falhei em pelo menos um ponto importante.',
      'Cumpri corretamente as normas de higiene e segurança alimentar durante toda a atividade.',
      'Cumpri sempre as normas de higiene alimentar e ainda alertei colegas para situações de risco.',
    ],
  },
  {
    competenciaId: 'R02', // Segurança e saúde no trabalho
    frases: [
      'Não respeitei normas de segurança no trabalho (ex: manuseamento de facas, equipamentos) e isso criou risco.',
      'Cumpri a maioria das normas de segurança, mas tive pelo menos uma situação de risco evitável.',
      'Cumpri sempre as normas de segurança no manuseamento de equipamentos e utensílios.',
      'Cumpri sempre as normas de segurança e ainda alertei colegas para evitar situações de risco.',
    ],
  },
  {
    competenciaId: 'R03', // Respeito por regras e normas definidas
    frases: [
      'Não segui as regras e procedimentos definidos para a aula/atividade.',
      'Segui a maioria das regras, mas houve momentos em que não as respeitei.',
      'Segui sempre as regras e procedimentos definidos para a atividade.',
      'Segui sempre as regras e ainda ajudei a garantir que os colegas também as cumpriam.',
    ],
  },
  {
    competenciaId: 'R04', // Cumprir orientações e plano de trabalho
    frases: [
      'Não segui o plano de trabalho definido, fiz as tarefas pela minha ordem ou critério.',
      'Segui o plano de trabalho na maior parte do tempo, mas desviei-me em algumas tarefas.',
      'Segui o plano de trabalho definido do início ao fim da atividade.',
      'Segui o plano de trabalho e ainda ajudei a equipa a manter-se dentro do planeado.',
    ],
  },
  {
    competenciaId: 'R05', // Preservação e conservação dos produtos
    frases: [
      'Não tive cuidado na conservação dos alimentos/produtos preparados (ex: deixei fora do frio, mal acondicionados).',
      'Tive algum cuidado na conservação, mas esqueci-me de acondicionar/etiquetar corretamente em algum momento.',
      'Acondicionei e conservei corretamente os alimentos e produtos preparados.',
      'Acondicionei e conservei tudo corretamente e ainda verifiquei o trabalho dos colegas nesse aspeto.',
    ],
  },
  {
    competenciaId: 'R06', // Redução de desperdício
    frases: [
      'Desperdicei alimentos ou materiais que poderiam ter sido aproveitados.',
      'Tive algum cuidado a evitar desperdício, mas ainda deixei aproveitar menos do que era possível.',
      'Aproveitei bem os ingredientes e materiais, reduzindo o desperdício ao mínimo possível.',
      'Aproveitei ao máximo os recursos e ainda sugeri formas de a equipa reduzir o desperdício.',
    ],
  },
  {
    competenciaId: 'R07', // HACCP
    frases: [
      'Não segui os procedimentos de controlo (registos, verificações) relacionados com o sistema HACCP.',
      'Segui alguns procedimentos de controlo, mas faltou registar ou verificar pontos importantes.',
      'Segui corretamente os procedimentos de controlo e registo associados ao HACCP.',
      'Segui corretamente todos os procedimentos HACCP e ainda ajudei colegas a fazer os registos corretamente.',
    ],
  },
  {
    competenciaId: 'R08', // Gestão de stocks / FIFO
    frases: [
      'Não tive em conta a ordem de utilização dos produtos (validade, FIFO) ao usar matérias-primas.',
      'Tive algum cuidado com a validade dos produtos, mas nem sempre segui a ordem correta (FIFO).',
      'Usei os produtos respeitando a ordem de validade e as regras de gestão de stock.',
      'Geri os produtos corretamente e ainda ajudei a organizar/atualizar o stock da equipa.',
    ],
  },
  {
    competenciaId: 'R09', // Divisão de trabalho pela brigada
    frases: [
      'Não respeitei a distribuição de tarefas da brigada, fiz o que me apeteceu ou interferi no trabalho dos outros.',
      'Segui a distribuição de tarefas na maior parte do tempo, mas houve momentos de sobreposição ou confusão.',
      'Respeitei a divisão de tarefas da brigada, fazendo a minha parte sem interferir nas dos colegas.',
      'Respeitei sempre a divisão de tarefas e ainda ajudei a coordenar a equipa para que tudo corresse bem.',
    ],
  },
  {
    competenciaId: 'R10', // Sensibilidade e bem-estar dos outros
    frases: [
      'Não tive em conta o bem-estar dos colegas (ex: comentários, exclusão de alguém do grupo).',
      'Tive alguma atenção ao bem-estar dos colegas, mas nem sempre adaptei o meu comportamento.',
      'Tive em conta o bem-estar e a sensibilidade dos colegas durante toda a atividade.',
      'Tive sempre em conta o bem-estar dos colegas e ainda ajudei a incluir/apoiar quem precisava.',
    ],
  },
  {
    competenciaId: 'R11', // Prazos e horários
    frases: [
      'Não cumpri os prazos/horários definidos para as tarefas (ex: atrasos, confeção fora do tempo previsto).',
      'Cumpri a maioria dos prazos/horários, mas falhei pelo menos um momento importante.',
      'Cumpri os prazos e horários definidos para todas as tarefas da atividade.',
      'Cumpri todos os prazos e ainda ajudei colegas que estavam atrasados a recuperar o tempo.',
    ],
  },
  {
    competenciaId: 'R12', // Equipamento de proteção individual (EPI)
    frases: [
      'Não usei o equipamento de proteção individual (EPI) necessário durante a atividade.',
      'Usei o EPI na maior parte do tempo, mas esqueci-me em alguma situação.',
      'Usei corretamente o equipamento de proteção individual durante toda a atividade.',
      'Usei corretamente o EPI e ainda alertei colegas que não o estavam a usar.',
    ],
  },
];
