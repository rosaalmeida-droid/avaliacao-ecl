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
    : '(referencial não disponível — usa o teu conhecimento geral desta área)';

  const criterios = d.criteriosDesempenho && d.criteriosDesempenho.length > 0
    ? `\nCritérios de desempenho do referencial:\n${d.criteriosDesempenho.map(c => `- ${c}`).join('\n')}\n`
    : '';

  return `# COMPETÊNCIAS A EVIDENCIAR EM FCT — ${d.ucId} — ${d.ucNome}

Esta Unidade de Competência não tem microcompetências técnicas mapeadas na
biblioteca da escola (é uma UC organizacional/sociocultural, não de cozinha).

Preciso que destiles o essencial desta UC em ${'4 a 5'} características GERAIS
— não os detalhes específicos do referencial, mas aquilo que esta UC
representa na sua essência, de forma a que qualquer empresa (independente do
sector) consiga observar e confirmar se o aluno demonstrou isso no dia a dia
de trabalho.

Referencial oficial desta UC (811RA144):
${realizacoes}
${criterios}
## Regra essencial
Cada característica tem DUAS partes, sempre juntas:
1. O NOME TÉCNICO — mantém a linguagem técnica/pedagógica correcta desta UC,
   tal como apareceria num documento oficial. Não simplifiques esta parte.
2. A EXPLICAÇÃO SIMPLES — logo a seguir, entre parênteses, traduz esse termo
   para uma frase directa e concreta que qualquer pessoa sem formação
   pedagógica entenda em 2 segundos e consiga confirmar se aconteceu ou não
   no dia a dia de trabalho. Usa verbos de acção simples (fala, ajuda,
   resolve, avisa, pergunta, trata).

Cada característica também tem de ser:
- GERAL — um traço amplo desta UC, não uma tarefa específica de sala de aula
- Directamente enraizada no que esta UC representa — não genérica ao ponto
  de servir para qualquer UC

## O que deves gerar
Exactamente 4 a 5 características, uma por linha, no formato:
Termo técnico (explicação simples e observável na prática)

Exemplo (para Turismo Inclusivo):
Identificação proactiva de barreiras à acessibilidade (repara sozinho/a
quando algo dificulta a vida a um cliente com mobilidade reduzida, sem
precisar que lhe digam)
Adaptação da linguagem a necessidades específicas (fala mais devagar ou
explica de outra forma quando percebe que o cliente não está a entender)
Atendimento empático e sem discriminação (trata todos os clientes com o
mesmo respeito, seja qual for a sua idade, aparência ou limitação)`;
}

export function gerarPromptRecuperacaoFCT(d: DadosRecuperacaoFCT): string {
  const blocoHoras = d.exigirHoras
    ? `\n## Horas de formação exigidas\nEsta recuperação exige um mínimo de ${d.horasMinimasExigidas || 0} horas de FCT dedicadas a estas competências. O aluno deve registar as horas efetivamente realizadas, com datas.\n`
    : `\n## Horas de formação — NÃO obrigatórias\nO professor decidiu que, para esta recuperação, as horas de FCT não são o critério — o que conta são as EVIDÊNCIAS concretas de que as competências foram demonstradas na prática, independentemente do número de horas.\n`;

  const competenciasTexto = d.competenciasAEvidenciar
    .map(c => `- ${c.nome}${c.descricao ? ` — ${c.descricao}` : ''}`)
    .join('\n');

  const criterios = d.criteriosDesempenho && d.criteriosDesempenho.length > 0
    ? `\nCritérios de desempenho do referencial (o que conta como prova válida):\n${d.criteriosDesempenho.map(c => `- ${c}`).join('\n')}\n`
    : '';

  return `# RECUPERAÇÃO VIA FCT — ${d.nomeAluno}

Gera um guião estruturado para ajudar ${d.nomeAluno} a documentar, de forma
credível e verificável, como as competências abaixo foram demonstradas
durante a Formação em Contexto de Trabalho${d.localFCT ? ` em ${d.localFCT}` : ''}.

## Unidade de Competência a recuperar
${d.ucId} — ${d.ucNome} (${d.tipoUC === 'tecnica' ? 'técnica' : d.tipoUC === 'organizacional' ? 'organizacional/sociocultural' : 'híbrida'})

## Competências que têm de ser evidenciadas
${competenciasTexto}
${blocoHoras}
Referencial oficial desta UC (811RA144):
${d.realizacoesOficiais.map(r => `- ${r}`).join('\n') || '(não disponível)'}
${criterios}
## O QUE A FCT TEM DE VANTAGEM AQUI
Trabalho real numa empresa é a prova mais forte que existe — mais forte do
que um trabalho escrito ou uma simulação em sala de aula. Por isso o guião
deve ajudar o aluno a ligar o que fez no dia a dia da empresa a cada
competência, com exemplos concretos e datados, não descrições vagas.

## O que deves gerar
Para cada competência da lista acima, gera:
1. Uma pergunta orientadora que ajuda o aluno a lembrar-se de uma situação
   real onde aplicou essa competência na empresa
2. O que deve escrever: o que fez, quando, com quem, que resultado teve
3. Que tipo de prova reforça isto (ex: fotografia do trabalho feito, uma
   nota do supervisor, um documento da empresa) — sem exigir nada que a
   empresa normalmente não daria
4. Um alerta claro: descrições genéricas ("ajudei a equipa") não chegam —
   tem de ser um episódio concreto e verificável

No final, gera também:
- Uma checklist final de evidências mínimas para esta recuperação ficar completa
- Se aplicável, um modelo curto de declaração que o supervisor da empresa
  pode assinar a confirmar o que o aluno descreveu

IMPORTANTE: isto não é um trabalho de casa — é uma reflexão estruturada
sobre trabalho que já foi feito. O aluno não deve inventar nada; só
organizar e comprovar o que já viveu na FCT.`;
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
