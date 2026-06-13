// ============================================================
// Frases de autoavaliação — TÉCNICAS (T01-T33)
// Ordem: [não atingi, em desenvolvimento, atingi, superei]
//
// Estilo: focado em qualidade técnica, autonomia e erros —
// "precisei de ajuda constante" vs "consegui sozinho com
// pequenos erros" vs "executei bem" vs "executei com
// autonomia total e ajudei colegas".
// ============================================================

import { FrasesCompetencia } from './frases_atitudes';

export const FRASES_TECNICAS: FrasesCompetencia[] = [
  {
    competenciaId: 'T01', // Fichas técnicas
    frases: [
      'Tive muita dificuldade em ler ou preencher a ficha técnica, precisei de ajuda constante.',
      'Consegui interpretar e preencher a ficha técnica, mas com alguns erros nas quantidades ou passos.',
      'Interpretei e preenchi a ficha técnica corretamente, sem erros relevantes.',
      'Interpretei e preenchi a ficha técnica corretamente e ainda ajudei colegas a fazer o mesmo.',
    ],
  },
  {
    competenciaId: 'T02', // Mise en place
    frases: [
      'A minha mise en place ficou incompleta ou desorganizada, faltou material/ingredientes durante a confeção.',
      'Preparei a mise en place, mas tive de parar a meio da confeção para ir buscar ou preparar algo que faltava.',
      'Preparei toda a mise en place corretamente antes de começar, sem interrupções.',
      'Preparei a mise en place de forma completa e eficiente, e ainda ajudei colegas a organizar a deles.',
    ],
  },
  {
    competenciaId: 'T03', // Corte de legumes/vegetais
    frases: [
      'Tive muita dificuldade nos cortes, ficaram muito irregulares ou precisei de ajuda constante.',
      'Consegui fazer os cortes, mas ficaram irregulares ou demorei muito mais tempo do que o esperado.',
      'Executei os cortes corretamente, com tamanho e forma adequados ao prato.',
      'Executei os cortes com precisão e rapidez, e ainda ajudei colegas a melhorar os deles.',
    ],
  },
  {
    competenciaId: 'T04', // Limpeza/preparação de carnes
    frases: [
      'Tive muita dificuldade em limpar/preparar a carne, precisei que fizessem por mim em grande parte.',
      'Consegui limpar/preparar a carne, mas com desperdício excessivo ou cortes pouco precisos.',
      'Limpei e preparei a carne corretamente, com pouco desperdício e cortes adequados.',
      'Limpei e preparei a carne com muita precisão e eficiência, e ainda ajudei colegas.',
    ],
  },
  {
    competenciaId: 'T05', // Filetagem de peixe
    frases: [
      'Tive muita dificuldade na filetagem, o peixe ficou muito danificado ou precisei de ajuda constante.',
      'Consegui filetar o peixe, mas com desperdício de carne ou espinhas não totalmente removidas.',
      'Fileteei o peixe corretamente, com pouco desperdício e sem espinhas.',
      'Fileteei o peixe com grande precisão e rapidez, e ainda ajudei colegas a fazer o mesmo.',
    ],
  },
  {
    competenciaId: 'T06', // Métodos de confeção
    frases: [
      'O método de confeção não correu bem (ex: queimado, mal cozinhado), precisei de ajuda para corrigir.',
      'O método de confeção correu razoavelmente, mas houve pequenos desvios no ponto/tempo de cozedura.',
      'Apliquei corretamente o método de confeção, com o ponto e tempo adequados.',
      'Apliquei o método de confeção com perfeição e ainda ajudei colegas a corrigir o deles.',
    ],
  },
  {
    competenciaId: 'T07', // Sopas, cremes, consommés
    frases: [
      'A sopa/creme não ficou com a textura ou sabor esperados e precisei de ajuda para corrigir.',
      'A sopa/creme ficou aceitável, mas com pequenos desvios de textura, sal ou consistência.',
      'Confecionei a sopa/creme com a textura e sabor corretos.',
      'Confecionei a sopa/creme com excelente textura e sabor, e ainda ajudei colegas a corrigir a deles.',
    ],
  },
  {
    competenciaId: 'T08', // Entradas e acepipes
    frases: [
      'A entrada/acepipe não ficou como previsto, precisei de ajuda significativa.',
      'A entrada/acepipe ficou aceitável, mas com pequenos desvios na confeção ou apresentação.',
      'Confecionei a entrada/acepipe corretamente, segundo a ficha técnica.',
      'Confecionei a entrada/acepipe com excelente resultado e ainda ajudei colegas.',
    ],
  },
  {
    competenciaId: 'T09', // Ovos e massas
    frases: [
      'O prato de ovos/massa não correu bem (ex: ponto errado, massa empapada), precisei de ajuda para corrigir.',
      'O prato de ovos/massa ficou aceitável, mas com pequenos desvios no ponto de cozedura.',
      'Confecionei o prato de ovos/massa no ponto correto, segundo a ficha técnica.',
      'Confecionei o prato de ovos/massa com excelente resultado e ainda ajudei colegas a corrigir o deles.',
    ],
  },
  {
    competenciaId: 'T10', // Peixes e mariscos
    frases: [
      'O peixe/marisco não ficou bem confecionado (ex: seco, cru no centro), precisei de ajuda para corrigir.',
      'O peixe/marisco ficou aceitável, mas com pequenos desvios no ponto de cozedura.',
      'Confecionei o peixe/marisco no ponto correto, com a guarnição adequada.',
      'Confecionei o peixe/marisco com excelente resultado e ainda ajudei colegas a corrigir o deles.',
    ],
  },
  {
    competenciaId: 'T11', // Carnes, aves, caça
    frases: [
      'A carne/ave não ficou bem confecionada (ex: seca, mal passada), precisei de ajuda para corrigir.',
      'A carne/ave ficou aceitável, mas com pequenos desvios no ponto de cozedura.',
      'Confecionei a carne/ave no ponto correto, com a guarnição adequada.',
      'Confecionei a carne/ave com excelente resultado e ainda ajudei colegas a corrigir o deles.',
    ],
  },
  {
    competenciaId: 'T12', // Massas base de pastelaria
    frases: [
      'A massa não ficou com a textura esperada (ex: quebrou, encolheu, não levantou) e precisei de ajuda.',
      'A massa ficou aceitável, mas com pequenos desvios de textura ou cozedura.',
      'Preparei a massa com a textura e cozedura corretas, segundo a ficha técnica.',
      'Preparei a massa com excelente resultado e ainda ajudei colegas a corrigir a deles.',
    ],
  },
  {
    competenciaId: 'T13', // Recheios, cremes, molhos pastelaria
    frases: [
      'O recheio/creme/molho não ficou com a textura ou sabor esperados e precisei de ajuda para corrigir.',
      'O recheio/creme/molho ficou aceitável, mas com pequenos desvios de textura ou sabor.',
      'Confecionei o recheio/creme/molho com a textura e sabor corretos.',
      'Confecionei o recheio/creme/molho com excelente resultado e ainda ajudei colegas.',
    ],
  },
  {
    competenciaId: 'T14', // Empratamento e decoração
    frases: [
      'O empratamento ficou desorganizado ou pouco cuidado, precisei de ajuda para melhorar.',
      'O empratamento ficou razoável, mas com pequenos detalhes a melhorar (limpeza do prato, disposição).',
      'O empratamento ficou limpo, organizado e de acordo com o pedido.',
      'O empratamento ficou muito cuidado e criativo, e ainda ajudei colegas a melhorar o deles.',
    ],
  },
  {
    competenciaId: 'T15', // Acondicionamento, etiquetagem, conservação
    frases: [
      'Não acondicionei/etiquetei corretamente os produtos preparados.',
      'Acondicionei/etiquetei os produtos, mas faltou alguma informação ou o acondicionamento não foi o ideal.',
      'Acondicionei e etiquetei corretamente os produtos preparados, segundo as normas.',
      'Acondicionei e etiquetei tudo corretamente e ainda verifiquei o trabalho dos colegas.',
    ],
  },
  {
    competenciaId: 'T16', // Conservação e armazenamento
    frases: [
      'Não respeitei as condições de conservação/armazenamento (temperatura, local) dos géneros alimentícios.',
      'Respeitei a maioria das condições de conservação, mas falhei em algum ponto.',
      'Respeitei corretamente as condições de conservação e armazenamento dos géneros alimentícios.',
      'Respeitei sempre as condições de conservação e ainda corrigi situações incorretas de colegas.',
    ],
  },
  {
    competenciaId: 'T17', // Pesagens, proporções, custos
    frases: [
      'Tive muita dificuldade nas pesagens/proporções/cálculo de custos, os valores ficaram muito incorretos.',
      'Fiz as pesagens/cálculos, mas com alguns erros nos valores ou proporções.',
      'Fiz as pesagens, proporções e cálculos de custos corretamente.',
      'Fiz tudo corretamente e ainda ajudei colegas a corrigir os cálculos deles.',
    ],
  },
];
