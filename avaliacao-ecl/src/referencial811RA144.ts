// ════════════════════════════════════════════════════════════════
// REFERENCIAL OFICIAL 811RA144 — Técnico/a de Cozinha e Restauração
// Nível 4 · Em vigor desde 29 de outubro de 2025 (BTE N.º 40)
//
// Plano ECL — Variante Cozinha
// Total: 134,75 créditos (inclui 20 cr FCT)
// 1 crédito = 25 horas
//
// Usado em: prompt do Guia de Apoio, Recuperação de Módulos,
// cálculo de horas previstas e limiar de faltas por UC.
// ════════════════════════════════════════════════════════════════

export type BlocoUC =
  | 'obrigatoria'          // obrigatória para todos
  | 'opcional_cozinha'     // opcional — bloco Cozinha e Pastelaria (ECL escolheu)
  | 'transversal'          // transversal opcional (ECL escolheu)
  | 'fct';                 // Formação em Contexto de Trabalho

export interface ReferencialUC {
  nome: string;
  creditos: number;          // pontos de crédito (1 cr = 25h)
  horas: number;             // creditos × 25
  bloco: BlocoUC;
  ordemECL: number;          // ordem no plano de estudos ECL
  realizacoes: string[];
  criteriosDesempenho: string[];
  conhecimentos: string[];
}

export const REFERENCIAL_811RA144: Record<string, ReferencialUC> = {

  // ── OBRIGATÓRIAS ──────────────────────────────────────────────

  UC03576: {
    nome: 'Planear e organizar a produção de cozinha',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 1,
    realizacoes: [
      'Elaborar os planos de trabalho.',
      'Realizar a mise en place.',
      'Coordenar equipas.',
      'Acondicionar e conservar os géneros alimentícios e outros produtos.',
    ],
    criteriosDesempenho: [
      'Planear e organizar a produção de cozinha cumprindo as orientações técnicas definidas.',
      'Garantindo a organização e limpeza do espaço de trabalho.',
      'Assegurando a preservação das propriedades dos alimentos.',
      'Cumprindo as regras de higiene e segurança alimentar e saúde no trabalho.',
    ],
    conhecimentos: [
      'Selecionar e aplicar procedimentos de organização e produção de cozinha.',
      'Efetuar o planeamento da produção de cozinha.',
      'Aplicar técnicas de limpeza e desinfeção.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC01999: {
    nome: 'Preparar e executar confeções de cozinha',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 2,
    realizacoes: [
      'Executar cortes nos diversos géneros alimentícios.',
      'Executar diversas técnicas de confeção.',
      'Acondicionar e conservar os produtos preparados.',
    ],
    criteriosDesempenho: [
      'Verificar a frescura e a qualidade dos géneros alimentícios.',
      'Assegurar a preservação das propriedades dos alimentos e conservação dos produtos preparados.',
      'Cumprir as regras de higiene e segurança alimentar, segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC03577: {
    nome: 'Preparar e confecionar molhos e fundos de cozinha',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 3,
    realizacoes: [
      'Elaborar fichas técnicas.',
      'Preparar a mise en place.',
      'Preparar e executar confeções de fundos de cozinha.',
      'Preparar e executar confeções de molhos base de cozinha quentes, frios e seus derivados.',
      'Acondicionar e conservar matérias-primas e produtos preparados.',
    ],
    criteriosDesempenho: [
      'Composição das manteigas compostas.',
      'Tecnologia dos equipamentos e utensílios de uma cozinha.',
      'Procedimentos de controlo dos processos de planificação e confeção de fundos de cozinha, molhos e bases.',
      'Técnicas de preparação e confeção de fundos de cozinha.',
      'Técnicas de preparação e confeção de molhos base de cozinha quentes e frios e seus derivados.',
      'Controlo de qualidade do processo de fabrico — preparação, confeção, produtos finais.',
      'Técnicas de limpeza, desinfeção e controlo de riscos.',
      'Técnicas de empratamento e decoração de produtos confecionados.',
      'Técnicas de acondicionamento, etiquetagem e conservação de matérias-primas e produtos confecionados.',
      'Sustentabilidade e economia circular na restauração.',
      'Normas de higiene e segurança alimentar.',
      'Normas de segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Calcular preços.',
      'Calcular margens de lucro.',
      'Controlar custos.',
      'Redigir fichas técnicas.',
      'Selecionar e aplicar procedimentos de organização e produção de cozinha.',
      'Efetuar o planeamento da produção de cozinha.',
      'Selecionar os equipamentos, ingredientes e utensílios para a confeção de fundos de cozinha e molhos base.',
      'Selecionar as matérias-primas para a confeção.',
      'Verificar qualidade e frescura dos ingredientes.',
      'Aplicar os procedimentos de preparação e confeção de fundos de cozinha.',
      'Aplicar os procedimentos de preparação e confeção de molhos base de cozinha quentes e frios e seus derivados.',
      'Aplicar técnicas de empratamento e decoração dos pratos confecionados.',
      'Aplicar técnicas de acondicionamento, etiquetagem e conservação de produtos confecionados.',
      'Aplicar técnicas de limpeza e desinfeção.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Cumprir normas de higiene e segurança alimentar.',
      'Aplicar normas de segurança e saúde no trabalho.',
    ],
  },

  UC02002: {
    nome: 'Preparar e confecionar acepipes, sopas, entradas, ovos e massas',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 4,
    realizacoes: [],
    criteriosDesempenho: [
      'Cumprir as orientações técnicas definidas e o plano de trabalho.',
      'Considerar a divisão de trabalho pelas brigadas.',
      'Elaborar fichas técnicas com a informação necessária.',
      'Garantir a preservação das propriedades dos alimentos e conservação dos produtos preparados.',
      'Cumprir as regras de higiene e segurança alimentar, segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Aplicar os procedimentos para a preparação e confeção de acepipes, entradas, pratos de massa e de ovos.',
      'Aplicar técnicas de empratamento e decoração dos pratos confecionados.',
      'Aplicar técnicas de acondicionamento, etiquetagem e conservação de produtos confecionados.',
      'Aplicar técnicas de limpeza e desinfeção.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC02003: {
    nome: 'Preparar e confecionar peixes, mariscos e os seus acompanhamentos ou guarnições',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 5,
    realizacoes: [
      'Elaborar fichas técnicas.',
      'Preparar a mise en place.',
      'Preparar e executar a confeção de peixes e mariscos.',
      'Preparar e executar a confeção de acompanhamentos ou guarnições.',
      'Empratar e decorar os produtos confecionados.',
      'Acondicionar e conservar matérias-primas e produtos preparados.',
    ],
    criteriosDesempenho: [
      'Cumprir as orientações técnicas definidas e o plano de trabalho.',
      'Considerar a divisão de trabalho pelas brigadas.',
      'Receituário de confeções de pratos de peixe e marisco.',
      'Tecnologia dos equipamentos e utensílios de uma cozinha.',
      'Procedimentos de controlo dos processos de planificação e confeção de pratos de peixe e marisco.',
      'Técnicas de preparação e confeção de pratos de peixe e marisco.',
      'Técnicas de preparação e confeção de acompanhamentos ou guarnições.',
      'Controlo de qualidade do processo de fabrico — preparação, confeção, produtos finais.',
      'Técnicas de limpeza, desinfeção e controlo de riscos.',
      'Técnicas de empratamento e decoração de produtos confecionados.',
      'Técnicas de acondicionamento, etiquetagem e conservação de matérias-primas e produtos confecionados.',
      'Sustentabilidade e economia circular na restauração.',
      'Normas de higiene e segurança alimentar.',
      'Normas de segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Efetuar pesagens.',
      'Calcular preços.',
      'Selecionar e aplicar procedimentos de organização e produção de cozinha.',
      'Efetuar o planeamento da produção de cozinha.',
      'Selecionar os equipamentos, ingredientes e utensílios necessários.',
      'Selecionar as matérias-primas para a confeção.',
      'Verificar qualidade e frescura dos ingredientes.',
      'Aplicar os procedimentos para a preparação e confeção de pratos de peixe e marisco e respetivas guarnições.',
      'Aplicar técnicas de empratamento e decoração dos pratos confecionados.',
      'Aplicar técnicas de acondicionamento, etiquetagem e conservação de produtos confecionados.',
      'Aplicar técnicas de limpeza e desinfeção.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC02004: {
    nome: 'Preparar e confecionar carnes, aves, caça e os seus acompanhamentos ou guarnições',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 6,
    realizacoes: [
      'Elaborar fichas técnicas.',
      'Preparar a mise en place.',
      'Preparar e executar a confeção de carnes, aves e caça.',
      'Preparar e executar a confeção de acompanhamentos ou guarnições.',
      'Empratar e decorar os produtos confecionados.',
      'Acondicionar e conservar matérias-primas e produtos preparados.',
    ],
    criteriosDesempenho: [
      'Cumprir as orientações técnicas definidas e o plano de trabalho.',
      'Considerar a divisão de trabalho pelas brigadas.',
      'Garantir a preservação das propriedades dos alimentos e conservação dos produtos preparados.',
      'Cumprir as regras de higiene e segurança alimentar, segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Efetuar pesagens.',
      'Calcular preços.',
      'Selecionar e aplicar procedimentos de organização e produção de cozinha.',
      'Selecionar os equipamentos, ingredientes e utensílios necessários.',
      'Selecionar as matérias-primas para a confeção.',
      'Verificar qualidade e frescura dos ingredientes.',
      'Aplicar os procedimentos para a preparação e confeção de carnes, aves e caça e respetivas guarnições.',
      'Aplicar técnicas de empratamento e decoração dos pratos confecionados.',
      'Aplicar técnicas de acondicionamento, etiquetagem e conservação de produtos confecionados.',
      'Aplicar técnicas de limpeza e desinfeção.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC02005: {
    nome: 'Preparar e confecionar massas base, recheios, cremes e molhos de pastelaria',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 7,
    realizacoes: [
      'Elaborar fichas técnicas.',
      'Preparar a mise en place.',
      'Preparar e executar confeções de massas base de pastelaria.',
      'Preparar e executar confeções de recheios, cremes e molhos de pastelaria.',
      'Empratar e decorar os produtos confecionados.',
      'Acondicionar e conservar matérias-primas e produtos preparados.',
    ],
    criteriosDesempenho: [
      'Cumprir as orientações técnicas definidas e o plano de trabalho.',
      'Considerar a divisão de trabalho pelas brigadas.',
      'Garantir a preservação das propriedades dos alimentos e conservação dos produtos preparados.',
      'Técnicas de preparação de massas base, recheios, cremes base e molhos base de pastelaria.',
      'Processos de confeção de massas base, recheios, cremes base e molhos base de pastelaria.',
      'Controlo de qualidade do processo de fabrico — preparação, confeção, produtos finais.',
      'Normas de higiene e segurança alimentar.',
      'Normas de segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Selecionar os equipamentos, ingredientes e utensílios necessários.',
      'Selecionar as matérias-primas para a confeção.',
      'Verificar a qualidade e frescura dos ingredientes.',
      'Aplicar os procedimentos para a preparação e confeção de receitas de bases de pastelaria.',
      'Aplicar técnicas de empratamento e decoração dos produtos de pastelaria confecionados.',
      'Aplicar técnicas de acondicionamento, etiquetagem e conservação de produtos confecionados.',
      'Aplicar técnicas de limpeza e desinfeção.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC03578: {
    nome: 'Interagir em inglês no serviço de cozinha e de restaurante/bar',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 8,
    realizacoes: [
      'Comunicar em inglês em contexto profissional de cozinha e restaurante/bar.',
      'Ler e interpretar documentos técnicos em inglês.',
      'Redigir documentos simples em inglês.',
    ],
    criteriosDesempenho: [
      'Utilizar vocabulário técnico da área em inglês.',
      'Compreender e produzir textos orais e escritos em contexto profissional.',
    ],
    conhecimentos: [
      'Aplicar vocabulário técnico de cozinha e restaurante em inglês.',
      'Interpretar fichas técnicas e receitas em inglês.',
      'Comunicar com clientes e fornecedores em inglês.',
    ],
  },

  UC00596: {
    nome: 'Implementar os princípios de nutrição e dietética',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 9,
    realizacoes: [
      'Aplicar os princípios de nutrição na elaboração de ementas.',
      'Adaptar receitas a necessidades dietéticas específicas.',
    ],
    criteriosDesempenho: [
      'Considerar os valores nutricionais dos alimentos na elaboração de ementas.',
      'Adaptar confeções a necessidades dietéticas (alergias, intolerâncias, regimes).',
      'Cumprir as normas de higiene e segurança alimentar.',
    ],
    conhecimentos: [
      'Adaptar capitações nutricionais.',
      'Analisar equilíbrio nutricional de ementas.',
      'Aplicar conhecimentos de dietética na prática culinária.',
    ],
  },

  UC03579: {
    nome: 'Gerir aprovisionamentos e controlar custos',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 10,
    realizacoes: [
      'Elaborar requisições de matérias-primas.',
      'Controlar stocks e validades.',
      'Calcular custos de produção.',
      'Elaborar fichas técnicas com custos.',
    ],
    criteriosDesempenho: [
      'Gerir aprovisionamentos cumprindo os procedimentos definidos.',
      'Controlar custos garantindo a rentabilidade da produção.',
      'Cumprir as normas de higiene e segurança alimentar.',
    ],
    conhecimentos: [
      'Calcular preços e margens de lucro.',
      'Controlar custos de produção.',
      'Gerir stocks — FIFO/FEFO.',
      'Redigir requisições e fichas técnicas com custos.',
    ],
  },

  UC03580: {
    nome: 'Atender o cliente e gerir reclamações na restauração',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 11,
    realizacoes: [
      'Receber e acolher clientes.',
      'Prestar informação sobre produtos e serviços.',
      'Gerir reclamações e situações de conflito.',
    ],
    criteriosDesempenho: [
      'Atender o cliente com cortesia e profissionalismo.',
      'Resolver reclamações de forma eficaz e empática.',
      'Cumprir os procedimentos de qualidade do serviço.',
    ],
    conhecimentos: [
      'Aplicar técnicas de comunicação com o cliente.',
      'Gerir reclamações e situações difíceis.',
      'Aplicar normas de qualidade de serviço em restauração.',
    ],
  },

  UC03581: {
    nome: 'Planear e executar o serviço casual de restaurante/bar',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 12,
    realizacoes: [
      'Preparar o espaço e o material para o serviço.',
      'Executar o serviço de mesa em contexto casual.',
      'Proceder ao fecho do serviço.',
    ],
    criteriosDesempenho: [
      'Executar o serviço cumprindo os procedimentos definidos.',
      'Garantir a satisfação do cliente durante o serviço.',
      'Cumprir as normas de higiene e segurança.',
    ],
    conhecimentos: [
      'Aplicar técnicas de serviço de mesa casual.',
      'Organizar e preparar o espaço de restaurante/bar.',
      'Aplicar normas de higiene no serviço.',
    ],
  },

  UC03582: {
    nome: 'Planear e executar o serviço de bebidas simples',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 13,
    realizacoes: [
      'Preparar e servir bebidas simples.',
      'Apresentar e aconselhar bebidas ao cliente.',
      'Proceder ao fecho do serviço de bebidas.',
    ],
    criteriosDesempenho: [
      'Executar o serviço de bebidas cumprindo os procedimentos definidos.',
      'Garantir a qualidade e apresentação das bebidas servidas.',
      'Cumprir as normas de higiene e segurança.',
    ],
    conhecimentos: [
      'Preparar e servir bebidas simples (cafetaria, sumos, águas).',
      'Aplicar técnicas de serviço de bebidas.',
      'Aplicar normas de higiene no serviço de bebidas.',
    ],
  },

  UC00039: {
    nome: 'Implementar as normas de segurança e saúde no trabalho em hotelaria e restauração',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 14,
    realizacoes: [
      'Identificar e prevenir riscos profissionais.',
      'Aplicar normas de segurança e saúde no trabalho.',
      'Utilizar equipamentos de proteção individual.',
    ],
    criteriosDesempenho: [
      'Identificar riscos profissionais no contexto de hotelaria e restauração.',
      'Aplicar medidas de prevenção e proteção.',
      'Cumprir a legislação de segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Aplicar normas de segurança e saúde no trabalho em hotelaria e restauração.',
      'Utilizar corretamente os equipamentos de proteção individual.',
      'Identificar e reportar situações de risco.',
    ],
  },

  UC00056: {
    nome: 'Implementar os requisitos do turismo acessível e inclusivo',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 15,
    realizacoes: [
      'Adaptar o serviço a clientes com necessidades específicas.',
      'Aplicar princípios de acessibilidade e inclusão.',
    ],
    criteriosDesempenho: [
      'Adaptar a comunicação e o atendimento a clientes com necessidades especiais.',
      'Garantir a acessibilidade dos espaços e serviços.',
    ],
    conhecimentos: [
      'Adaptar atendimento a clientes com necessidades especiais.',
      'Aplicar acessibilidade em contexto de restauração.',
      'Adaptar linguagem e comunicação.',
    ],
  },

  UC00034: {
    nome: 'Colaborar e trabalhar em equipa',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 16,
    realizacoes: [
      'Trabalhar em equipa de forma colaborativa.',
      'Comunicar eficazmente com colegas e superiores.',
      'Gerir conflitos no contexto profissional.',
    ],
    criteriosDesempenho: [
      'Colaborar ativamente com a equipa.',
      'Comunicar de forma clara e respeitosa.',
      'Contribuir para um bom clima de trabalho.',
    ],
    conhecimentos: [
      'Aplicar técnicas de trabalho em equipa.',
      'Gerir conflitos de forma construtiva.',
      'Comunicar eficazmente em contexto profissional.',
    ],
  },

  UC00054: {
    nome: 'Atuar em situações de emergência em hotelaria e restauração',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 17,
    realizacoes: [
      'Identificar situações de emergência.',
      'Aplicar procedimentos de emergência.',
      'Prestar primeiros socorros básicos.',
    ],
    criteriosDesempenho: [
      'Atuar com rapidez e eficácia em situações de emergência.',
      'Aplicar os procedimentos definidos no plano de emergência.',
      'Cumprir as normas de segurança.',
    ],
    conhecimentos: [
      'Aplicar procedimentos de emergência em hotelaria e restauração.',
      'Prestar primeiros socorros básicos.',
      'Utilizar equipamentos de combate a incêndios.',
    ],
  },

  UC03583: {
    nome: 'Interagir em língua estrangeira no serviço de cozinha e de restaurante/bar',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 18,
    realizacoes: [
      'Comunicar em língua estrangeira (não inglês) em contexto profissional.',
      'Ler e interpretar documentos técnicos em língua estrangeira.',
    ],
    criteriosDesempenho: [
      'Utilizar vocabulário técnico da área em língua estrangeira.',
      'Comunicar com clientes e colegas em língua estrangeira.',
    ],
    conhecimentos: [
      'Aplicar vocabulário técnico de cozinha e restaurante em língua estrangeira.',
      'Comunicar em situações profissionais básicas em língua estrangeira.',
    ],
  },

  UC00038: {
    nome: 'Prestar informação sobre o setor do turismo',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 19,
    realizacoes: [
      'Informar clientes sobre o setor do turismo.',
      'Divulgar recursos turísticos locais e nacionais.',
    ],
    criteriosDesempenho: [
      'Prestar informação turística de forma precisa e adequada.',
      'Promover os recursos turísticos com entusiasmo e conhecimento.',
    ],
    conhecimentos: [
      'Aplicar conhecimentos sobre o setor do turismo em Portugal.',
      'Informar sobre recursos turísticos locais e nacionais.',
    ],
  },

  UC03584: {
    nome: 'Implementar regras de higiene e segurança alimentar em hotelaria e restauração',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 20,
    realizacoes: [
      'Aplicar as normas HACCP.',
      'Controlar temperaturas e condições de conservação.',
      'Implementar procedimentos de higienização.',
    ],
    criteriosDesempenho: [
      'Implementar regras de higiene e segurança alimentar cumprindo a legislação em vigor.',
      'Garantir a segurança dos alimentos em todas as fases da produção.',
      'Registar e monitorizar os pontos críticos de controlo.',
    ],
    conhecimentos: [
      'Aplicar técnicas de limpeza e desinfeção.',
      'Aplicar as normas de higiene e segurança alimentar (HACCP).',
      'Controlar temperaturas de conservação e confeção.',
      'Aplicar medidas de redução do desperdício alimentar.',
    ],
  },

  UC00031: {
    nome: 'Criar e desenvolver ideias de negócio',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 21,
    realizacoes: [
      'Identificar oportunidades de negócio.',
      'Desenvolver e apresentar uma ideia de negócio.',
      'Analisar a viabilidade da ideia.',
    ],
    criteriosDesempenho: [
      'Identificar oportunidades de negócio no setor da restauração.',
      'Desenvolver uma proposta de negócio fundamentada.',
      'Apresentar a ideia de forma clara e persuasiva.',
    ],
    conhecimentos: [
      'Analisar viabilidade de ideias de negócio.',
      'Aplicar conceitos de empreendedorismo em restauração.',
      'Desenvolver e apresentar projetos de negócio.',
    ],
  },

  UC00032: {
    nome: 'Elaborar o plano de negócios',
    creditos: 4.50, horas: 113, bloco: 'obrigatoria', ordemECL: 22,
    realizacoes: [
      'Elaborar um plano de negócios completo.',
      'Analisar o mercado e a concorrência.',
      'Definir estratégias de marketing e financiamento.',
    ],
    criteriosDesempenho: [
      'Elaborar um plano de negócios estruturado e fundamentado.',
      'Demonstrar viabilidade financeira do projeto.',
      'Apresentar o plano de forma profissional.',
    ],
    conhecimentos: [
      'Elaborar planos de negócios para restauração.',
      'Calcular preços e margens de lucro.',
      'Analisar mercado e concorrência.',
    ],
  },

  UC00035: {
    nome: 'Desenvolver competências pessoais e criativas',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 23,
    realizacoes: [
      'Desenvolver a criatividade aplicada ao contexto profissional.',
      'Gerir o tempo e as prioridades.',
      'Desenvolver competências de comunicação pessoal.',
    ],
    criteriosDesempenho: [
      'Demonstrar criatividade e inovação nas propostas.',
      'Gerir o tempo e as prioridades de forma eficaz.',
      'Comunicar de forma assertiva e profissional.',
    ],
    conhecimentos: [
      'Aplicar técnicas de desenvolvimento pessoal.',
      'Desenvolver criatividade em contexto profissional.',
      'Gerir tempo e prioridades.',
    ],
  },

  UC00595: {
    nome: 'Aconselhar vinhos e orientar o cliente na escolha',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 24,
    realizacoes: [
      'Aconselhar clientes na escolha de vinhos.',
      'Descrever características organolépticas de vinhos.',
      'Sugerir harmonizações vinho-prato.',
    ],
    criteriosDesempenho: [
      'Aconselhar vinhos de forma fundamentada e adequada ao cliente.',
      'Demonstrar conhecimento sobre regiões vinícolas e castas.',
      'Sugerir harmonizações adequadas.',
    ],
    conhecimentos: [
      'Aplicar conhecimentos de enologia ao aconselhamento de vinhos.',
      'Identificar regiões vinícolas e castas portuguesas.',
      'Sugerir harmonizações vinho-prato.',
    ],
  },

  UC00069: {
    nome: 'Implementar as normas do setor da hotelaria e restauração',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 25,
    realizacoes: [
      'Aplicar a legislação e regulamentação do setor.',
      'Implementar procedimentos de qualidade.',
    ],
    criteriosDesempenho: [
      'Implementar normas do setor cumprindo a legislação em vigor.',
      'Garantir a qualidade do serviço.',
    ],
    conhecimentos: [
      'Aplicar normas internas do setor hotelaria/restauração.',
      'Implementar procedimentos de qualidade.',
    ],
  },

  UC00068: {
    nome: 'Aplicar a expressão dramática em contexto profissional',
    creditos: 2.25, horas: 56, bloco: 'obrigatoria', ordemECL: 26,
    realizacoes: [
      'Utilizar técnicas de expressão dramática em contexto profissional.',
      'Desenvolver capacidades de comunicação não-verbal.',
    ],
    criteriosDesempenho: [
      'Aplicar técnicas de expressão dramática de forma pertinente.',
      'Comunicar eficazmente através da expressão corporal e vocal.',
    ],
    conhecimentos: [
      'Aplicar expressão dramática em contexto profissional.',
      'Desenvolver comunicação não-verbal.',
    ],
  },

  // ── OPCIONAIS — COZINHA E PASTELARIA ─────────────────────────
  // ECL escolheu: 29,25 créditos (10 UCs)

  UC03585: {
    nome: 'Conservar matérias-primas alimentares',
    creditos: 2.25, horas: 56, bloco: 'opcional_cozinha', ordemECL: 27,
    realizacoes: [
      'Aplicar técnicas de conservação de matérias-primas.',
      'Controlar condições de armazenamento.',
      'Registar e controlar stocks.',
    ],
    criteriosDesempenho: [
      'Conservar matérias-primas cumprindo as normas de higiene e segurança alimentar.',
      'Garantir a qualidade e segurança dos produtos armazenados.',
      'Registar corretamente as entradas e saídas de stock.',
    ],
    conhecimentos: [
      'Aplicar normas de manipulação de alimentos.',
      'Aplicar técnicas de acondicionamento e conservação de matérias-primas.',
      'Aplicar procedimentos de registo e controlo de stocks (FIFO/FEFO).',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
    ],
  },

  UC03586: {
    nome: 'Preparar e confecionar iguarias da cozinha e doçaria tradicional portuguesa',
    creditos: 4.50, horas: 113, bloco: 'opcional_cozinha', ordemECL: 28,
    realizacoes: [
      'Elaborar fichas técnicas.',
      'Preparar a mise en place.',
      'Preparar e executar confeções de iguarias da cozinha e doçaria tradicional portuguesa.',
      'Empratar e decorar as iguarias confecionadas.',
      'Acondicionar e conservar matérias-primas e produtos preparados.',
    ],
    criteriosDesempenho: [
      'Cumprir as orientações técnicas definidas e o plano de trabalho.',
      'Considerar a divisão de trabalho pelas brigadas.',
      'Garantir a preservação das propriedades dos alimentos e conservação dos produtos preparados.',
      'Cumprir as regras de higiene e segurança alimentar, segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Aplicar técnicas de limpeza e desinfeção.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC03588: {
    nome: 'Preparar e confecionar iguarias da gastronomia do Mundo',
    creditos: 4.50, horas: 113, bloco: 'opcional_cozinha', ordemECL: 29,
    realizacoes: [
      'Elaborar fichas técnicas.',
      'Preparar a mise en place.',
      'Preparar e executar confeções de iguarias da cozinha e doçaria internacional.',
      'Empratar e decorar as iguarias confecionadas.',
      'Acondicionar e conservar matérias-primas e produtos preparados.',
    ],
    criteriosDesempenho: [
      'Cumprir as orientações técnicas definidas e o plano de trabalho.',
      'Considerar a divisão de trabalho pelas brigadas.',
      'Garantir a preservação das propriedades dos alimentos e conservação dos produtos preparados.',
      'Cumprir as regras de higiene e segurança alimentar, segurança e saúde no trabalho.',
      'Procedimentos de controlo dos processos de planificação e confeção de pratos e doçaria de diferentes países.',
      'Técnicas de preparação e confeção de pratos e doçaria de diferentes países.',
      'Técnicas de preparação e confeção de acompanhamentos ou guarnições.',
    ],
    conhecimentos: [
      'Calcular preços.',
      'Selecionar e aplicar procedimentos de organização e produção de cozinha.',
      'Selecionar os equipamentos, ingredientes e utensílios necessários.',
      'Selecionar as matérias-primas para a confeção.',
      'Verificar qualidade e frescura dos ingredientes.',
      'Aplicar os procedimentos para a preparação e confeção de pratos e doçaria de diferentes países.',
      'Aplicar técnicas de empratamento e decoração dos pratos confecionados.',
      'Aplicar técnicas de acondicionamento, etiquetagem e conservação de produtos confecionados.',
      'Aplicar técnicas de limpeza e desinfeção.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC03589: {
    nome: 'Implementar novas tendências na cozinha',
    creditos: 2.25, horas: 56, bloco: 'opcional_cozinha', ordemECL: 30,
    realizacoes: [
      'Elaborar fichas técnicas.',
      'Preparar a mise en place.',
      'Preparar e confecionar iguarias da cozinha e doçaria internacionais.',
      'Empratar e decorar as iguarias confecionadas.',
      'Acondicionar e conservar matérias-primas e produtos preparados.',
    ],
    criteriosDesempenho: [
      'Respeitar as orientações técnicas definidas.',
      'Aplicar técnicas de limpeza e corte dos ingredientes.',
      'Assegurar a preservação das propriedades dos alimentos e conservação dos produtos preparados.',
      'Cumprir as regras de higiene e segurança alimentar, segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Consultar fichas técnicas e receituário.',
      'Aplicar procedimentos de quantificação de ingredientes.',
      'Determinar proporções e efetuar pesagens.',
      'Calcular preços e margens de lucro.',
      'Controlar custos.',
      'Selecionar equipamentos, ingredientes e utensílios.',
      'Aplicar técnicas de empratamento e decoração.',
      'Aplicar técnicas de acondicionamento e conservação.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC03590: {
    nome: 'Confecionar produtos sustentáveis',
    creditos: 2.25, horas: 56, bloco: 'opcional_cozinha', ordemECL: 31,
    realizacoes: [
      'Explorar os recursos endógenos da região.',
      'Criar produtos ou propostas inovadoras no âmbito da cozinha sustentável.',
      'Efetuar o aprovisionamento das matérias-primas, utensílios e materiais.',
    ],
    criteriosDesempenho: [
      'Identificar e selecionar produtos e matérias-primas endógenos.',
      'Respeitar a agricultura local.',
      'Cumprir as regras de segurança e higiene alimentar.',
      'Dieta mediterrânica — hábitos e culturas alimentares portuguesas.',
      'Produtos e cozinhas regionais.',
      'Técnicas e processos culinários — fermentação, maceração, desidratação.',
      'Práticas sustentáveis de cozinha.',
    ],
    conhecimentos: [
      'Aplicar normas de manipulação de alimentos.',
      'Aplicar técnicas de acondicionamento e conservação.',
      'Aplicar procedimentos de registo e controlo de stocks.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC03591: {
    nome: 'Planear e executar serviços especiais de cozinha',
    creditos: 4.50, horas: 113, bloco: 'opcional_cozinha', ordemECL: 32,
    realizacoes: [
      'Elaborar o plano de trabalho do serviço especial de cozinha.',
      'Elaborar menus de cozinha para serviços especiais.',
      'Confecionar as iguarias do serviço especial.',
      'Cortar e preparar peixes, mariscos, carnes, frutas, doces e queijos.',
      'Empratar e decorar iguarias.',
      'Controlar o aprovisionamento das matérias-primas, utensílios e materiais.',
    ],
    criteriosDesempenho: [
      'Respeitar as orientações superiores e o plano de produção.',
      'Elaborar um menu de acordo com as orientações.',
      'Cumprir as regras de organização e funcionamento do serviço de cozinha.',
      'Considerar a divisão de trabalho pelas brigadas para serviços especiais.',
      'Cumprir as normas de qualidade, segurança e higiene alimentar.',
    ],
    conhecimentos: [
      'Aplicar normas de manipulação de alimentos.',
      'Aplicar técnicas de acondicionamento e conservação.',
      'Aplicar procedimentos de registo e controlo de stocks.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC03592: {
    nome: 'Planear e confecionar pastelaria internacional',
    creditos: 2.25, horas: 56, bloco: 'opcional_cozinha', ordemECL: 33,
    realizacoes: [
      'Elaborar o plano de trabalho diário e a ficha técnica do produto.',
      'Confecionar pastelaria internacional.',
      'Empratar e decorar pastelaria internacional.',
      'Confecionar especialidades de pastelaria do mundo (francesa, italiana, alemã, outras).',
      'Empratar e decorar especialidade de pastelaria do mundo.',
      'Controlar o aprovisionamento das matérias-primas, utensílios e materiais.',
    ],
    criteriosDesempenho: [
      'Respeitar o plano de produção.',
      'Cumprir as regras de organização e funcionamento da secção de cozinha.',
      'Considerar a divisão de trabalho pelas brigadas.',
      'Cumprir as normas de qualidade, segurança e higiene alimentar.',
    ],
    conhecimentos: [
      'Aplicar técnicas de acondicionamento e conservação de matérias-primas de pastelaria.',
      'Aplicar procedimentos de registo e controlo de stocks.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  UC03593: {
    nome: 'Planear e confecionar massas básicas de panificação',
    creditos: 2.25, horas: 56, bloco: 'opcional_cozinha', ordemECL: 34,
    realizacoes: [
      'Elaborar o plano de trabalho diário da produção de massas de pão.',
      'Elaborar a ficha técnica do produto.',
      'Preparar o local de trabalho, os equipamentos e as matérias-primas.',
      'Confecionar pão de trigo e respetivas aplicações.',
      'Confecionar outras massas lêvedas de panificação e respetivas aplicações.',
      'Confecionar especialidades regionais e respetivas aplicações.',
      'Efetuar o aprovisionamento dos utensílios, materiais e matérias-primas.',
    ],
    criteriosDesempenho: [
      'Respeitar o plano de produção.',
      'Cumprir as regras de organização e funcionamento da secção de padaria.',
      'Considerar a divisão de trabalho pelas brigadas.',
      'Cumprir as regras de segurança e higiene alimentar.',
    ],
    conhecimentos: [],
  },

  UC03595: {
    nome: 'Planear e confecionar cozinha alternativa',
    creditos: 2.25, horas: 56, bloco: 'opcional_cozinha', ordemECL: 35,
    realizacoes: [
      'Elaborar o plano de trabalho diário da produção de cozinha alternativa.',
      'Elaborar a ficha técnica do produto.',
      'Preparar o local de trabalho, os equipamentos e as matérias-primas.',
      'Confecionar pratos de cozinha alternativa.',
      'Empratar e decorar iguarias de cozinha alternativa.',
      'Efetuar o aprovisionamento das matérias-primas, utensílios e materiais.',
    ],
    criteriosDesempenho: [
      'Cumprir as regras de organização e funcionamento do serviço de cozinha.',
      'Considerar a divisão de trabalho pelas brigadas.',
      'Cumprir as normas de qualidade, segurança e higiene alimentar.',
    ],
    conhecimentos: [],
  },

  UC03596: {
    nome: 'Planear e confecionar cozinha criativa',
    creditos: 2.25, horas: 56, bloco: 'opcional_cozinha', ordemECL: 36,
    realizacoes: [
      'Elaborar o plano de trabalho diário da produção de cozinha criativa.',
      'Elaborar a ficha técnica do produto.',
      'Preparar o local de trabalho, os equipamentos e as matérias-primas.',
      'Confecionar pratos de cozinha criativa.',
      'Empratar e decorar iguarias de cozinha criativa.',
      'Efetuar o aprovisionamento das matérias-primas, utensílios e materiais.',
    ],
    criteriosDesempenho: [
      'Processos e tempos de confeção.',
      'Procedimentos de quantificação de ingredientes, proporções e pesagens.',
      'Técnicas de cálculo de preços.',
      'Técnicas de preparação e confeção de cozinha criativa — confeção a vácuo, a baixas temperaturas, outras.',
      'Técnicas de empratamento.',
      'Processos de decoração de cozinha criativa.',
      'Procedimentos de controlo da qualidade.',
      'Normas de higiene e segurança alimentar.',
      'Normas de segurança e saúde no trabalho.',
    ],
    conhecimentos: [
      'Selecionar e aplicar as técnicas de preparação de cozinha criativa.',
      'Organizar o espaço, os equipamentos e os utensílios.',
      'Aplicar os procedimentos para a confeção de cozinha criativa.',
      'Aplicar as técnicas de empratamento de cozinha criativa.',
      'Aplicar os processos de decoração de cozinha criativa.',
      'Aplicar normas de manipulação de alimentos.',
      'Acondicionar e conservar matérias-primas e produtos confecionados de cozinha.',
      'Aplicar medidas de redução do desperdício alimentar.',
      'Aplicar as normas de higiene e segurança alimentar.',
      'Aplicar as normas de segurança e saúde no trabalho.',
    ],
  },

  // ── TRANSVERSAL OPCIONAL ──────────────────────────────────────
  // ECL escolheu: UC00077 — Aplicar storytelling na comunicação (2,25 cr)
  // Dado pelos professores de cozinha no último ano, junto com a PAP.

  UC00077: {
    nome: 'Aplicar storytelling na comunicação',
    creditos: 2.25, horas: 56, bloco: 'transversal', ordemECL: 37,
    realizacoes: [
      'Construir narrativas profissionais com técnicas de storytelling.',
      'Apresentar produtos, serviços ou projetos através de histórias.',
      'Aplicar storytelling em contexto de restauração e turismo.',
    ],
    criteriosDesempenho: [
      'Construir narrativas coerentes e apelativas.',
      'Utilizar técnicas de storytelling adequadas ao contexto profissional.',
      'Comunicar de forma envolvente e eficaz.',
    ],
    conhecimentos: [
      'Aplicar storytelling na comunicação profissional.',
      'Construir narrativas para apresentação de pratos, menus e projetos.',
      'Comunicar com impacto em contexto de restauração.',
    ],
  },

};

// ── Funções auxiliares ────────────────────────────────────────

export function getReferencialUC(ucId: string): ReferencialUC | undefined {
  return REFERENCIAL_811RA144[ucId];
}

export function getHorasUC(ucId: string): number {
  return REFERENCIAL_811RA144[ucId]?.horas ?? 56;
}

export function getLimiarFaltasUC(ucId: string): number {
  return Math.floor(getHorasUC(ucId) * 0.10);
}

export function getUCsPorBloco(bloco: BlocoUC): Array<[string, ReferencialUC]> {
  return Object.entries(REFERENCIAL_811RA144)
    .filter(([, uc]) => uc.bloco === bloco)
    .sort(([, a], [, b]) => a.ordemECL - b.ordemECL);
}

export function getTodasUCs(): Array<[string, ReferencialUC]> {
  return Object.entries(REFERENCIAL_811RA144)
    .sort(([, a], [, b]) => a.ordemECL - b.ordemECL);
}
