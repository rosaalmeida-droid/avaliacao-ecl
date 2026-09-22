// ════════════════════════════════════════════════════════════════
// MATRIZ DE EVIDÊNCIAS — classificação pedagógica de como cada tipo
// de competência pode ser observada, validada e recuperada.
//
// Não substitui a matriz de competências existente (MICROCOMPETENCIAS,
// ATITUDES, OBRIGATORIAS) — acrescenta uma camada por cima, classificando
// o GRUPO a que cada competência pertence e o que isso implica.
// ════════════════════════════════════════════════════════════════

export type GrupoCompetencia = 'tecnica' | 'responsabilidade' | 'atitude';

export type FormaEvidencia =
  | 'observacao_direta' | 'observacao_fct' | 'video_explicativo' | 'video_demonstrativo'
  | 'audio_explicativo' | 'caso_tecnico' | 'caso_profissional' | 'defesa_oral'
  | 'questionario_tecnico' | 'reflexao_critica' | 'trabalho_pratico_documentado'
  | 'simulacao' | 'projeto_colaborativo' | 'analise_erro' | 'planeamento_producao'
  | 'analise_haccp' | 'calculo_rendimento' | 'calculo_food_cost';

export interface RegrasGrupo {
  grupo: GrupoCompetencia;
  label: string;
  descricao: string;
  necessitaObservacaoHumana: boolean;
  podeValidarPorEscrito: 'sim' | 'nao' | 'parcial';
  podeValidarPorDefesaOral: boolean;
  podeRecuperarForaDeAula: 'sim' | 'nao' | 'parcial';
  formasValidacaoAceites: FormaEvidencia[];
  formasValidacaoInsuficientes: string[];
}

export const REGRAS_POR_GRUPO: Record<GrupoCompetencia, RegrasGrupo> = {
  tecnica: {
    grupo: 'tecnica',
    label: 'Competência Técnica Específica da UC',
    descricao: 'Diretamente relacionada com os conteúdos técnicos da Unidade de Competência (ex: dessalga, emulsões, cortes, técnicas de cocção).',
    necessitaObservacaoHumana: true,
    podeValidarPorEscrito: 'parcial',
    podeValidarPorDefesaOral: true,
    podeRecuperarForaDeAula: 'parcial',
    formasValidacaoAceites: ['observacao_direta', 'defesa_oral', 'caso_tecnico', 'video_demonstrativo', 'trabalho_pratico_documentado', 'analise_erro'],
    formasValidacaoInsuficientes: ['Escolha múltipla isolada, sem defesa oral', 'Texto copiado sem aplicação prática'],
  },
  responsabilidade: {
    grupo: 'responsabilidade',
    label: 'Responsabilidade Técnica',
    descricao: 'Associada ao exercício profissional seguro e rigoroso (ex: HACCP, PCC, segurança alimentar, conservação).',
    necessitaObservacaoHumana: false,
    podeValidarPorEscrito: 'sim',
    podeValidarPorDefesaOral: true,
    podeRecuperarForaDeAula: 'sim',
    formasValidacaoAceites: ['caso_tecnico', 'defesa_oral', 'questionario_tecnico', 'simulacao', 'analise_haccp', 'observacao_direta'],
    formasValidacaoInsuficientes: ['Pesquisa copiada sem aplicação ao caso concreto'],
  },
  atitude: {
    grupo: 'atitude',
    label: 'Atitude Transversal',
    descricao: 'Pertence ao perfil profissional global do aluno, não a uma UC específica (ex: organização, trabalho em equipa, higiene pessoal).',
    necessitaObservacaoHumana: true,
    podeValidarPorEscrito: 'nao',
    podeValidarPorDefesaOral: false,
    podeRecuperarForaDeAula: 'nao',
    formasValidacaoAceites: ['observacao_direta', 'observacao_fct'],
    formasValidacaoInsuficientes: ['Trabalho individual para validar trabalho em equipa', 'Questionário ou trabalho escrito para validar higiene pessoal', 'Resposta teórica para validar empatia'],
  },
};

// Classifica uma competência/microcompetência/atitude no seu grupo,
// a partir do prefixo do ID já usado na app (OBR_ = obrigatória/responsabilidade,
// ATT_ = atitude, outros = microcompetência técnica).
export function classificarGrupoCompetencia(competenciaId: string): GrupoCompetencia {
  if (competenciaId.startsWith('OBR_')) return 'responsabilidade';
  // ATI- é o prefixo real usado pelas 22 competências atitudinais (compatECL ATITUDES_DETALHADAS)
  // ATT_ mantido por compatibilidade com dados antigos
  if (competenciaId.startsWith('ATI-') || competenciaId.startsWith('ATT_')) return 'atitude';
  return 'tecnica';
}

export function getRegrasCompetencia(competenciaId: string): RegrasGrupo {
  return REGRAS_POR_GRUPO[classificarGrupoCompetencia(competenciaId)];
}

// Níveis de domínio — usados em toda a app para classificar o estado
// de uma competência (substituindo o anterior 4-níveis simples por um
// 0-4 mais granular, alinhado com o documento pedagógico).
export type NivelDominio = 0 | 1 | 2 | 3 | 4 | 5;

export const NIVEL_DOMINIO_LABEL: Record<NivelDominio, string> = {
  0: 'Não Observado',
  1: 'Ainda não fez',
  2: 'Em Desenvolvimento',
  3: 'Consolidado',
  4: 'Avançado',
  5: 'Excelente',
};

export const NIVEL_DOMINIO_DESCRICAO: Record<NivelDominio, string> = {
  0: 'Não existe evidência.',
  1: 'Foi visto uma vez, mas ainda sem consistência.',
  2: 'O aluno demonstra parcialmente a competência.',
  3: 'O aluno demonstra com consistência.',
  4: 'O aluno demonstra autonomia, adaptação e capacidade de justificar decisões.',
  5: 'O aluno executa com total domínio e muito bom resultado.',
};

// Para atitudes transversais, estados especiais que não bloqueiam a UC
export type EstadoAtitude = 'nao_observado' | 'observado' | 'em_desenvolvimento' | 'consolidado' | 'pendente_observacao' | 'validado_contexto_futuro';

export const ESTADO_ATITUDE_LABEL: Record<EstadoAtitude, string> = {
  nao_observado: 'Não Observado',
  observado: 'Observado',
  em_desenvolvimento: 'Em Desenvolvimento',
  consolidado: 'Consolidado',
  pendente_observacao: 'Pendente de Observação',
  validado_contexto_futuro: 'Validável em Contexto Futuro',
};

// ── Defesa Oral — geração automática de perguntas de validação ────
// Nenhuma recuperação deve ser validada exclusivamente por trabalho escrito
// (ponto 10-11 do documento pedagógico). Após a submissão, o professor recebe
// perguntas sugeridas, ligadas às competências por confirmar.
// Duração recomendada: 3 a 5 minutos.
const TEMPLATES_PERGUNTAS_TECNICAS = [
  (nome: string) => `Explica por palavras tuas como executaste "${nome}" — o que fizeste primeiro e porquê?`,
  (nome: string) => `Que erro mais comum acontece em "${nome}" e como o evitarias?`,
  (nome: string) => `Se tivesses de repetir "${nome}" agora, o que farias de forma diferente?`,
];

const TEMPLATES_PERGUNTAS_HACCP = [
  () => 'Que risco HACCP existe nesta preparação e porquê?',
  () => 'Qual seria o PCC (Ponto Crítico de Controlo) mais importante aqui?',
  () => 'Que temperatura crítica precisas de controlar, e o que acontece se falhar?',
];

const TEMPLATES_PERGUNTAS_RENDIMENTO = [
  (porcoes?: number) => `Como organizarias esta produção para ${porcoes || 40} doses?`,
  () => 'Que rendimento esperarias obter desta matéria-prima, e porquê?',
  () => 'Se a preparação estivesse excessivamente salgada, que decisão tomarias?',
];

export function gerarPerguntasDefesaOral(
  competenciasIds: string[],
  responsabilidadesIds: string[],
  nomeProducao?: string
): { competenciaId: string; pergunta: string }[] {
  const perguntas: { competenciaId: string; pergunta: string }[] = [];

  // 1 pergunta técnica por competência (até 3 competências, para a defesa caber em 3-5 min)
  competenciasIds.slice(0, 3).forEach((compId, i) => {
    const template = TEMPLATES_PERGUNTAS_TECNICAS[i % TEMPLATES_PERGUNTAS_TECNICAS.length];
    perguntas.push({ competenciaId: compId, pergunta: template(nomeProducao || 'esta produção') });
  });

  // 1 pergunta HACCP se houver responsabilidades
  if (responsabilidadesIds.length > 0) {
    perguntas.push({ competenciaId: responsabilidadesIds[0], pergunta: TEMPLATES_PERGUNTAS_HACCP[0]() });
  }

  // 1 pergunta de rendimento/decisão profissional, sempre
  perguntas.push({ competenciaId: '__geral__', pergunta: TEMPLATES_PERGUNTAS_RENDIMENTO[1]() });
  perguntas.push({ competenciaId: '__geral__', pergunta: TEMPLATES_PERGUNTAS_RENDIMENTO[2]() });

  return perguntas;
}

// ── Plano de Recuperação Individual — prompt único gerado por aluno ──────
// Não há forma técnica de impedir que o aluno use IA fora da app (não
// controlamos o browser dele). A proteção real contra cópia não é bloquear
// a IA — é o prompt ser ÚNICO e ESPECÍFICO (impossível encontrar pronto na
// internet) + a Defesa Oral obrigatória depois (já implementada), onde o
// professor confirma compreensão real, sem apoio.
export interface DadosPlanoIndividual {
  nomeAluno: string;
  ucId: string;
  ucNome: string;
  nivelMedidas: 1 | 2 | 3;
  producoesFaltadas: string[];          // nomes dos pratos das aulas em falta
  competenciasEmFalta: string[];        // nomes já resolvidos (não IDs)
  responsabilidadesEmFalta: string[];
  atitudesPendentes: string[];          // informativo — não exigido por escrito
  evidenciasJaExistentes: string[];     // o que já foi observado noutro contexto, não repetir
  realizacoesOficiais: string[];        // do referencial 811RA144
  contextoUC?: string;                  // enquadramento pedagógico específico da UC (gerado dinamicamente)
  criteriosDesempenho?: string[];       // critérios de desempenho do referencial
}

const INSTRUCOES_NIVEL: Record<1 | 2 | 3, string> = {
  1: `NÍVEL 1 — Medidas Universais (aplica-se à generalidade dos alunos):
- Plano completo: tarefas detalhadas, questões técnicas, caso profissional, reflexão, autoavaliação e defesa oral
- Linguagem técnica normal, adequada ao nível profissional do curso
- Sem necessidade de simplificação adicional`,
  2: `NÍVEL 2 — Medidas Universais + Seletivas (aluno que precisa de mais orientação):
- Mantém as competências essenciais da UC, mas ADAPTA a forma de as alcançar:
  • tarefas mais curtas e divididas em etapas claras e numeradas
  • linguagem mais simples e directa, frases curtas
  • menos questões, mas mais focadas no essencial
  • casos profissionais mais simples, com menos variáveis
  • inclui 1-2 exemplos resolvidos antes de pedir ao aluno para fazer sozinho
  • indica tempo recomendado para cada tarefa`,
  3: `NÍVEL 3 — Medidas Universais + Seletivas + Adicionais (aluno que precisa de adaptação significativa):
- Mantém o OBJECTIVO de demonstrar a competência, mas o caminho é muito mais estruturado:
  • instruções passo a passo, uma ação de cada vez, nunca várias instruções na mesma frase
  • tarefas curtas (poucas linhas de resposta esperada por pergunta)
  • linguagem muito simples, vocabulário do dia-a-dia, evitar termos técnicos sem explicar
  • sugere apoio visual ou esquemático sempre que possível (desenhos, esquemas, tabelas simples)
  • menor carga de escrita — privilegia escolha múltipla, completar frases, associar
  • sugere evidências alternativas ao texto (foto, vídeo curto, demonstração oral gravada)
  • termina com nota clara para o professor: este aluno precisa de validação mais acompanhada`,
};

// Gera o prompt fechado, único para este aluno, para colar numa IA (ChatGPT/
// Claude) e obter o Plano de Recuperação Individual. O prompt já contém toda
// a informação necessária — não depende de pesquisa externa, por isso não
// existe versão "pronta" na internet para copiar.
export function gerarPromptPlanoIndividual(d: DadosPlanoIndividual): string {
  // Contexto pedagógico específico da UC — ancora o plano no que a UC realmente exige
  const contexto = d.contextoUC
    ? `\n## Contexto pedagógico desta UC\n${d.contextoUC}\n`
    : '';

  // Critérios de desempenho do referencial
  const criterios = d.criteriosDesempenho && d.criteriosDesempenho.length > 0
    ? `\nCritérios de desempenho do referencial:\n${d.criteriosDesempenho.map(c => `- ${c}`).join('\n')}\n`
    : '';

  return `# PLANO DE RECUPERAÇÃO INDIVIDUAL — ${d.nomeAluno}

Gera um Plano de Recuperação Individual para este aluno específico, com base EXCLUSIVAMENTE
nos dados abaixo. Não inventes informação nova nem genérica — usa só o que está aqui.
${contexto}
## Situação do aluno
Unidade de Competência: ${d.ucId} — ${d.ucNome}

Produções/aulas em falta: ${d.producoesFaltadas.join(', ') || 'nenhuma específica'}

Competências técnicas ainda por demonstrar:
${d.competenciasEmFalta.map(c => `- ${c}`).join('\n') || '(nenhuma — só responsabilidades/atitudes)'}

Responsabilidades técnicas por demonstrar:
${d.responsabilidadesEmFalta.map(r => `- ${r}`).join('\n') || '(nenhuma)'}

Atitudes transversais pendentes (NÃO bloqueiam esta recuperação, NÃO devem ter
tarefa escrita — ficam para observação futura em qualquer aula):
${d.atitudesPendentes.map(a => `- ${a}`).join('\n') || '(nenhuma)'}

${d.evidenciasJaExistentes.length > 0 ? `Já observado noutro contexto (NÃO repetir, já está validado):\n${d.evidenciasJaExistentes.map(e => `- ${e}`).join('\n')}\n` : ''}
Referencial oficial desta UC (811RA144):
${d.realizacoesOficiais.map(r => `- ${r}`).join('\n') || '(não disponível)'}
${criterios}
## Nível de medidas educativas a aplicar
${INSTRUCOES_NIVEL[d.nivelMedidas]}

## REGRA ESSENCIAL
O nível de medidas NUNCA retira competências essenciais da UC — só adapta a
FORMA como o aluno acede à tarefa, a realiza, e demonstra a competência.

## INSTRUÇÃO FUNDAMENTAL SOBRE O CONTEÚDO
O plano deve estar ANCORADO no contexto específico desta UC.
Não geres tarefas técnicas genéricas — todas as tarefas, questões e casos profissionais
devem estar ligados ao que esta UC realmente pede: ${d.ucNome}.
Se a UC é de cozinha portuguesa, o plano fala de pratos portugueses, regiões, tradições,
produtos nacionais — não de técnicas culinárias abstratas.
Se a UC é de pastelaria, o plano centra-se em produções de pastelaria, não em cortes de legumes.
O aluno deve sentir que este plano foi feito para a UC que está a recuperar, não para qualquer outra.

## O que deves gerar
Um plano estruturado com:
1. Resumo do que falta recuperar (2-3 frases, directo, ligado ao contexto desta UC)
2. Tarefas concretas — ancoradas nas produções em falta e no espírito desta UC
3. Questões técnicas adaptadas ao nível de medidas e ao contexto da UC
4. Um caso profissional realista ligado a esta UC (ex: numa cozinha a preparar X prato português)
5. Evidências exigidas (o que o aluno deve entregar)
6. Indicação clara: que competências vão exigir defesa oral obrigatória depois
7. Tempo total estimado para completar este plano

IMPORTANTE: este plano é pessoal e único para ${d.nomeAluno}. Depois de entregue,
${d.nomeAluno} vai ter de defender oralmente o que escreveu, sem apoio de IA ou
internet — por isso o trabalho só tem valor se for mesmo compreendido, não copiado.`;
}

// ── Análise Preliminar por IA (pontos 11-13 da adenda) ──────────────────
// A IA NUNCA decide a classificação final. Só apoia o professor com um
// relatório de consistência, lacunas detetadas, e sugestão de perguntas de
// defesa oral. A decisão final é sempre humana.
export interface DadosAnalisePreliminar {
  nomeAluno: string;
  ucNome: string;
  guiasTexto: string[];           // conteúdo dos Guias usados como referência
  trabalhoTeorico: string;
  investigacao: string;
  casoProfissional: string;
  autoavaliacao: string;
  planoIndividualTexto?: string;  // o plano gerado, se existir, para comparar
}

// ── Recuperação via FCT (Formação em Contexto de Trabalho) ──────────────
// Tipo de recuperação DIFERENTE das anteriores — o aluno recupera um módulo
// tecnológico evidenciando trabalho REAL feito na empresa onde faz FCT, em
// vez de trabalho teórico/investigação. O professor decide se exige um
// número mínimo de horas de formação, ou se aceita evidências das
// competências independentemente das horas registadas.
export interface DadosRecuperacaoFCT {
  nomeAluno: string;
  ucId: string;
  ucNome: string;
  tipoUC: 'tecnica' | 'organizacional' | 'hibrida';
  competenciasAEvidenciar: { id: string; nome: string; descricao?: string }[];
  exigirHoras: boolean;
  horasMinimasExigidas?: number;
  localFCT?: string;
  realizacoesOficiais: string[];   // referencial 811RA144 da UC
  criteriosDesempenho?: string[];
}

// ── Gerar competências desta UC via IA (quando a biblioteca não tem
// nenhuma microcompetência técnica mapeada — típico de UCs socioculturais/
// organizacionais, ex: Turismo inclusivo, Trabalho em equipa). O professor
// copia o prompt, cola numa IA, e recebe uma lista de competências a
// evidenciar na FCT, baseada no referencial oficial da UC.
export interface DadosPromptCompetenciasUC {
  ucId: string;
  ucNome: string;
  realizacoesOficiais: string[];
  criteriosDesempenho?: string[];
}

export function gerarPromptCompetenciasUC(d: DadosPromptCompetenciasUC): string {
  const realizacoes = d.realizacoesOficiais.length > 0
    ? d.realizacoesOficiais.map(r => `- ${r}`).join('\n')
    : '(referencial não disponível — usa o teu conhecimento geral desta área, mas mantém-te sempre dentro do contexto de cozinha/restaurante, nunca genérico)';

  const criterios = d.criteriosDesempenho && d.criteriosDesempenho.length > 0
    ? `\nCritérios de desempenho do referencial:\n${d.criteriosDesempenho.map(c => `- ${c}`).join('\n')}\n`
    : '';

  return `# COMPETÊNCIAS A EVIDENCIAR EM FCT — ${d.ucId} — ${d.ucNome}

Esta Unidade de Competência não tem microcompetências técnicas mapeadas na
biblioteca da escola (é uma UC organizacional/sociocultural, não de cozinha).

Preciso que destiles o essencial desta UC em ${'4 a 5'} características GERAIS,
mas com uma condição inegociável: o aluno é formando de Cozinha/Pastelaria e
faz FCT num restaurante, cozinha ou espaço de restauração — TUDO tem de estar
ancorado nessa rotina de trabalho real, nunca em algo genérico que sirva para
qualquer negócio (loja, escritório, hotel na receção, etc.).

Referencial oficial desta UC (811RA144):
${realizacoes}
${criterios}
## Regra essencial — DUAS partes, sempre juntas
1. O NOME TÉCNICO — mantém a linguagem técnica/pedagógica correcta desta UC,
   tal como apareceria num documento oficial. Não simplifiques esta parte.
2. A EXPLICAÇÃO SIMPLES — logo a seguir, entre parênteses, traduz esse termo
   para uma frase directa e concreta, situada especificamente na cozinha ou
   no serviço de sala de um restaurante, que um chefe de cozinha ou
   encarregado de sala (sem formação pedagógica) entenda em 2 segundos e
   consiga confirmar se aconteceu ou não.

## O que TORNA uma característica válida (as 3 têm de ser verdade ao mesmo tempo)
1. GERAL — um traço amplo desta UC, não uma tarefa isolada de uma aula
2. ESPECÍFICA DESTA UC — liga-se claramente ao que ${d.ucId} — ${d.ucNome}
   realmente ensina, não é um soft-skill que serve para qualquer UC
   ("atender bem", "comunicar", "ser simpático" sozinhos NÃO CHEGAM — têm de
   estar amarrados a uma situação concreta de cozinha/restaurante)
3. ROTINA REAL DE COZINHA/RESTAURANTE — algo que acontece no dia a dia de
   trabalho num restaurante (na cozinha, na copa, na sala, no atendimento à
   mesa, na gestão de comandas, na preparação, no serviço), nunca uma
   situação de loja, escritório, receção de hotel ou outro sector

## Teste antes de responderes
Antes de escreveres cada característica, pergunta-te: "Isto só faz sentido
porque o aluno está numa cozinha/restaurante, ou faria igual sentido numa
loja de roupa?" Se a segunda resposta for sim, a característica está
demasiado genérica — reescreve-a ligada a uma situação real de cozinha ou
sala de restaurante.

## Importância de cada característica
Depois da explicação, acrescenta sempre no fim da mesma linha uma etiqueta
com a importância dessa característica **para esta UC especificamente**
(não em geral) — quanto essa característica pesa no que esta UC realmente
avalia:
- [ALTA] — é dos aspectos centrais desta UC, sem isto o aluno não a domina
- [MÉDIA] — importante, mas complementar às características centrais
- [BAIXA] — desejável, mas secundário face às outras

Distribui as importâncias com juízo — nem tudo pode ser [ALTA]. Numa lista
de 4-5, o normal é 1-2 [ALTA], 2 [MÉDIA], e no máximo 1 [BAIXA].

## Pergunta de cenário para o aluno responder
Depois da etiqueta de importância, acrescenta " :: " seguido de UMA pergunta
para o aluno responder por escrito, sobre essa competência específica.

Actua como um PERITO EM AVALIAÇÃO DE FCT para o curso de Cozinha e
Pastelaria. O objectivo desta pergunta NÃO é que o aluno descreva receitas
teóricas, passos de manuais escolares ou definições genéricas (ex: "o que é
o HACCP" ou "como se faz um corte"). O objectivo exclusivo é OBRIGAR O ALUNO
A COMPROVAR QUE REALMENTE EXECUTOU a actividade na cozinha do restaurante,
extraindo detalhes físicos, memórias visuais, uso de ferramentas e gestão
do stress do dia a dia real de estágio.

Regras obrigatórias para a pergunta:
1. DESAFIO NA PRIMEIRA PESSOA E NO PASSADO — "O que fizeste exactamente?",
   "Como resolveste?", "Como avaliaste...?", "Que facas, panelas ou
   equipamentos usaste fisicamente?"
2. BLOQUEIA RESPOSTAS VAGAS/TEÓRICAS — ancora a pergunta num imprevisto real
   da rotina de restauração: um desvio no "rush" do serviço, uma falha na
   mise en place, controlo sensorial em tempo real (toque, textura, ponto de
   cozedura, brilho), ou a escala real de produção (grandes volumes para a
   sala do restaurante) — nunca algo copiável de um manual ou da internet
3. VOCABULÁRIO 100% DE COZINHA PROFISSIONAL — usa termos reais sempre que
   fizerem sentido (passe, brigada, comandas, economato, câmaras, abatedor,
   partida) — se a pergunta soar a manual escolar ou for genérica, refaz

Exemplo do nível de detalhe esperado (para uma competência de confecção de
fundos/molhos): "Estavas a reduzir um fundo escuro e entraram três comandas
em simultâneo que também precisavam da tua atenção no fogão. Como controlaste
a fervura do fundo sem o deixar apurar demais nem descurar os outros
pratos? Que teste fizeste para confirmares o ponto (nappé, cor, textura)?"

## O que deves gerar
Exactamente 4 a 5 características, uma por linha, no formato:
Termo técnico (explicação simples, situada na cozinha/restaurante, observável na prática) [IMPORTÂNCIA] :: Pergunta de cenário concreta terminando num desafio directo

Exemplo BOM (para uma UC de trabalho em equipa, no contexto certo):
Coordenação em momentos de pressão (durante o rush do almoço, ajusta o
próprio ritmo ao dos colegas de cozinha sem que ninguém tenha de pedir) [ALTA] :: Estavam três cozinheiros em falta numa noite de sexta-feira lotada e as
comandas começaram a acumular-se no passe. O que fizeste para ajudar a
equipa a recuperar o ritmo, e o que mudaste na forma como trabalhaste?
Comunicação clara entre cozinha e sala (avisa a tempo quando um prato vai
demorar mais, para o empregado de mesa poder gerir a expectativa do cliente) [MÉDIA] :: Um prato específico ia demorar 15 minutos a mais do que o normal numa
mesa que já estava impaciente. Como avisaste a sala, e o que disseste
exactamente para que pudessem gerir a situação com o cliente?

Exemplo MAU (genérico demais, evitar este estilo — tanto na característica
como na pergunta):
Comunicação com colegas de equipa (fala bem com as pessoas) [ALTA] :: Descreve uma situação em que comunicaste bem com um colega.
Atendimento ao cliente (trata bem quem vem à empresa) [MÉDIA] :: Conta uma vez em que atendeste bem um cliente.`;
}

export function gerarPromptRecuperacaoFCT(d: DadosRecuperacaoFCT): string {
  const blocoHoras = d.exigirHoras
    ? `\n## Horas de formação exigidas\nEsta recuperação exige um mínimo de ${d.horasMinimasExigidas || 0} horas de FCT dedicadas a estas competências. O aluno deve registar as horas efetivamente realizadas, com datas.\n`
    : `\n## Horas de formação — NÃO obrigatórias\nO professor decidiu que, para esta recuperação, as horas de FCT não são o critério — o que conta são as EVIDÊNCIAS concretas de que as competências foram demonstradas na prática, independentemente do número de horas.\n`;

  const competenciasTexto = d.competenciasAEvidenciar
    .map(c => `- ${c.nome}${c.descricao ? ` — ${c.descricao}` : ''}`)
    .join('\n');

  return `# GUIÃO DE APOIO (ANEXO) — RECUPERAÇÃO VIA FCT — ${d.nomeAluno}

ATENÇÃO — este guião é um ANEXO ao documento principal da recuperação, que
já tem: a lista de competências, uma pergunta de cenário por competência
(gerada noutro prompt), e a confirmação/assinatura do Orientador de Estágio.

NÃO REPITAS NADA DISSO AQUI. Este guião serve só para complementar com o
que ainda falta: como comprovar cada competência, e um alerta contra
respostas vagas.

## Unidade de Competência a recuperar
${d.ucId} — ${d.ucNome} (${d.tipoUC === 'tecnica' ? 'técnica' : d.tipoUC === 'organizacional' ? 'organizacional/sociocultural' : 'híbrida'})

## Competências já definidas (não as reformules, só usa como contexto)
${competenciasTexto}
${blocoHoras}
## O que deves gerar — SÓ ISTO, nada mais
Para cada competência da lista acima, gera APENAS estas duas linhas
(não repitas o nome da competência nem inventes uma pergunta nova):

- Prova: [que tipo de prova comprova isto — fotografia do trabalho, nota
  do supervisor, documento da empresa — sem exigir nada que a empresa
  normalmente não daria]
- Alerta: [um aviso curto e específico contra a resposta genérica mais
  provável para ESTA competência em concreto — não um aviso genérico tipo
  "sê específico", mas algo como "não chega dizer 'ajudei na cozinha' — tem
  de identificar o prato, a quantidade e o momento exacto"]

No final, gera SÓ:
- Uma checklist curta (4 a 6 itens) do que falta para esta recuperação
  ficar completa (ex: horas registadas, evidências fotográficas, etc.)

NÃO GERES: perguntas orientadoras (já existem noutro documento), nem
nenhum modelo de declaração/assinatura do supervisor (o documento
principal já tem isso, com espaço de assinatura e carimbo próprios —
duplicar isso cria confusão e duas assinaturas diferentes no mesmo processo).`;
}

export function gerarPromptAnalisePreliminar(d: DadosAnalisePreliminar): string {
  return `# ANÁLISE PRELIMINAR DE RECUPERAÇÃO — apoio à decisão do professor

IMPORTANTE: Esta análise é só um APOIO. Não decidas a nota nem digas se a
recuperação "passa" ou "chumba" — isso é sempre decisão do professor humano.
A tua função é só ajudar a preparar a avaliação e a defesa oral.

## Aluno: ${d.nomeAluno}
## UC: ${d.ucNome}

## Conteúdo de referência (Guia(s) de Apoio à Produção desta UC)
${d.guiasTexto.map((g, i) => `--- Guia ${i + 1} ---\n${g.slice(0, 2000)}`).join('\n\n')}

## O que o aluno respondeu

### Trabalho Teórico
${d.trabalhoTeorico || '(não respondeu)'}

### Investigação
${d.investigacao || '(não respondeu)'}

### Caso Profissional
${d.casoProfissional || '(não respondeu)'}

### Autoavaliação
${d.autoavaliacao || '(não respondeu)'}
${d.planoIndividualTexto ? `\n## Plano de Recuperação Individual que foi dado ao aluno\n${d.planoIndividualTexto.slice(0, 1500)}\n` : ''}

## O que deves analisar e devolver, em formato estruturado:

1. RELATÓRIO DE CONSISTÊNCIA: o trabalho do aluno é coerente com o conteúdo
   dos Guias acima? Aponta concretamente onde há boa compreensão e onde não há.

2. LACUNAS DETETADAS: lista pontos específicos que faltam ou estão incompletos
   (ex: "Falta relacionar HACCP com temperatura de conservação").

3. SINAIS DE TEXTO POUCO PESSOAL: a linguagem parece genérica, copiada, ou sem
   ligação real à produção concreta? Aponta exemplos concretos, sem acusar
   directamente — só sinaliza para o professor decidir.

4. SUGESTÃO DE PERGUNTAS PARA A DEFESA ORAL: 3-5 perguntas específicas que o
   professor deveria fazer para confirmar se o aluno compreende mesmo o que
   escreveu, focadas nos pontos mais fracos identificados.

5. SUGESTÃO DE ESTADO (escolhe UM, e justifica em 1 frase):
   - "Parece suficiente para avançar para defesa oral"
   - "Necessita correção antes da defesa oral"
   - "Evidência insuficiente"
   - "Validável apenas com observação futura"

Lembra-te: a decisão final é sempre do professor. Tu só preparas o trabalho dele.`;
}
