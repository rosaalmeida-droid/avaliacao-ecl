// ============================================================
// 22 Competências Atitudinais — Referencial 811RA144
// Com dicionário completo para professor e aluno
// ============================================================

export type TipoComp = 'permanente' | 'individual' | 'equipa' | 'servico_real' | 'coordenacao' | 'adicional';
export type NivelAval = 's' | 'a' | 'r'; // dentro / acima / necessita reforço

export interface CompAtitudinal {
  id: string;
  nome: string;
  tipo: TipoComp;
  // Dicionário
  definicao: string;
  observar: string[];       // comportamentos positivos a observar
  nao_observar: string[];   // sinais de alerta
  exemplos_pos: string[];   // exemplos positivos em cozinha
  exemplos_neg: string[];   // exemplos negativos em cozinha
  // Para UI rápida
  sim_curto: string;        // frase curta para cabeçalho grelha professor
  nao_curto: string;        // frase curta para cabeçalho grelha professor
  // Para aluno
  pergunta_aluno: string;   // como apresentar ao aluno
}

// ── 6 PERMANENTES ─────────────────────────────────────────────
const PERMANENTES: CompAtitudinal[] = [
  {
    id: 'A01', nome: 'Responsabilidade pelas suas ações', tipo: 'permanente',
    definicao: 'Assume as consequências das suas ações e decisões, sem culpar os outros.',
    observar: ['Reconhece os seus erros sem ser confrontado', 'Cumpre tarefas sem precisar de lembretes', 'Chega a horas e mantém o posto organizado'],
    nao_observar: ['Culpa colegas ou condições externas', 'Abandona tarefas a meio', 'Precisa de supervisão constante'],
    exemplos_pos: ['Queimou o molho e avisa imediatamente o professor', 'Chegou atrasado e assume sem desculpas', 'Limpa o posto sem ser pedido'],
    exemplos_neg: ['Diz que a receita estava errada quando falhou na execução', 'Deixa a louça por lavar e vai embora', 'Espera que o professor note o erro'],
    sim_curto: 'Assume erros · Cumpre sem lembretes',
    nao_curto: 'Culpa outros · Abandona tarefas',
    pergunta_aluno: 'Assumiste as tuas responsabilidades hoje?',
  },
  {
    id: 'A11', nome: 'Sentido de organização', tipo: 'permanente',
    definicao: 'Planeia e organiza o trabalho de forma eficiente, gerindo bem o tempo e o espaço.',
    observar: ['Mise en place preparada antes de começar a confeção', 'Ingredientes e utensílios organizados e acessíveis', 'Gere bem o tempo durante a produção'],
    nao_observar: ['Posto desarrumado durante e após a aula', 'Procura utensílios durante a confeção', 'Perde tempo ou atrasa a produção'],
    exemplos_pos: ['Prepara todos os ingredientes pesados e cortados antes de ligar o fogão', 'Tem a bancada limpa e organizada durante toda a aula', 'Termina a produção dentro do tempo'],
    exemplos_neg: ['Começa a confeção sem ter a mise en place pronta', 'Tem ingredientes espalhados por toda a bancada', 'Atrasa o grupo por má gestão do tempo'],
    sim_curto: 'Mise en place · Posto organizado',
    nao_curto: 'Procura utensílios · Posto sujo',
    pergunta_aluno: 'Organizaste bem o teu espaço e tempo de trabalho?',
  },
  {
    id: 'A13', nome: 'Disponibilidade para aprender', tipo: 'permanente',
    definicao: 'Mostra abertura para adquirir novos conhecimentos e aceita correções com atitude positiva.',
    observar: ['Faz perguntas quando tem dúvidas', 'Aceita correções sem resistência', 'Experimenta técnicas novas com vontade'],
    nao_observar: ['Recusa feedback ou fica na defensiva', 'Repete os mesmos erros sem mudar', 'Desinteressa-se quando a tarefa é difícil'],
    exemplos_pos: ['Pergunta ao professor como melhorar o corte', 'Aceita que a sua tempura ficou gordurosa e quer saber porquê', 'Tenta de novo quando a técnica não resulta'],
    exemplos_neg: ['Diz "assim está bem" quando o professor corrige', 'Faz sempre da mesma forma mesmo depois de corrigido', 'Desiste quando a técnica é difícil'],
    sim_curto: 'Pergunta · Aceita correções',
    nao_curto: 'Recusa feedback · Repete erros',
    pergunta_aluno: 'Estiveste aberto/a a aprender e a receber feedback hoje?',
  },
  {
    id: 'A14', nome: 'Respeito pelas regras e normas definidas', tipo: 'permanente',
    definicao: 'Cumpre as regras da cozinha e da escola sem necessitar de lembretes constantes.',
    observar: ['Respeita as normas de higiene e segurança', 'Cumpre as regras sem ser lembrado', 'Aceita as decisões da hierarquia'],
    nao_observar: ['Ignora regras estabelecidas', 'Contorna normas quando não é observado', 'Questiona sistematicamente a autoridade'],
    exemplos_pos: ['Usa sempre a farda completa sem ser lembrado', 'Desliga o equipamento após uso sem que o professor diga', 'Respeita a hierarquia da brigada mesmo em situações de pressão'],
    exemplos_neg: ['Tira a touca quando o professor não está a ver', 'Usa o telemóvel na cozinha', 'Discute as ordens da brigada em serviço'],
    sim_curto: 'Cumpre normas · Aceita hierarquia',
    nao_curto: 'Ignora regras · Contorna normas',
    pergunta_aluno: 'Respeitaste as regras e normas da cozinha hoje?',
  },
  {
    id: 'A16', nome: 'Respeito pelas normas de higiene e segurança alimentar', tipo: 'permanente',
    definicao: 'Cumpre todos os procedimentos de higiene pessoal e segurança alimentar durante a produção.',
    observar: ['Lava as mãos nos momentos certos', 'Usa farda completa e limpa', 'Separa alimentos crus de confecionados', 'Respeita temperaturas de conservação'],
    nao_observar: ['Toca no rosto ou cabelo sem lavar as mãos', 'Usa utensílios mistos para cru e cozinhado', 'Ignora regras de temperatura e conservação'],
    exemplos_pos: ['Lava as mãos após manipular peixe cru antes de tocar noutros alimentos', 'Usa tábuas de corte separadas por tipo de alimento', 'Verifica a temperatura da câmara no início da aula'],
    exemplos_neg: ['Mexe no cabelo e volta a trabalhar sem lavar as mãos', 'Usa a mesma faca para carne crua e legumes sem lavar', 'Deixa preparações fora do frio durante a aula'],
    sim_curto: 'Lava mãos · Separa crus',
    nao_curto: 'Toca rosto · Ignora temperaturas',
    pergunta_aluno: 'Cumpriste as normas de higiene e segurança alimentar hoje?',
  },
  {
    id: 'A17', nome: 'Respeito pelas normas de segurança e saúde no trabalho', tipo: 'permanente',
    definicao: 'Trabalha de forma segura, protegendo-se a si e aos colegas de riscos físicos na cozinha.',
    observar: ['Usa sapatos de segurança e farda adequada', 'Manuseia facas e equipamentos com cuidado', 'Avisa quando há perigos (piso molhado, equipamento quente)'],
    nao_observar: ['Corre ou tem comportamentos de risco na cozinha', 'Usa equipamentos sem formação ou autorização', 'Ignora perigos que coloca a si ou aos colegas'],
    exemplos_pos: ['Avisa os colegas quando tira o tacho quente do fogão', 'Usa sempre luva quando trabalha com equipamentos cortantes', 'Limpa imediatamente um derrame no chão para evitar quedas'],
    exemplos_neg: ['Corre entre a cozinha e a câmara frigorífica', 'Liga a fritadeira sem verificar o nível de óleo', 'Deixa facas na beira da bancada com o fio para fora'],
    sim_curto: 'Trabalha com segurança · Protege colegas',
    nao_curto: 'Comportamentos de risco · Ignora perigos',
    pergunta_aluno: 'Trabalhaste de forma segura e protegeste os teus colegas?',
  },
];

// ── CONTEXTO INDIVIDUAL ───────────────────────────────────────
const INDIVIDUAL: CompAtitudinal[] = [
  {
    id: 'A02', nome: 'Autonomia', tipo: 'individual',
    definicao: 'Realiza as suas tarefas de forma independente, tomando decisões dentro do seu âmbito.',
    observar: ['Resolve problemas sem depender constantemente do professor', 'Toma decisões dentro do seu âmbito', 'Avança nas tarefas sem precisar de aprovação constante'],
    nao_observar: ['Paralisa quando o professor não está por perto', 'Pergunta sobre cada detalhe mesmo quando sabe a resposta', 'Não avança sem aprovação'],
    exemplos_pos: ['Vê que o molho está a reduzir demasiado e ajusta sem chamar o professor', 'Organiza a ordem de produção sozinho de acordo com os tempos de cada preparação', 'Substitui um ingrediente em falta por equivalente adequado'],
    exemplos_neg: ['Chama o professor para confirmar cada passo da receita', 'Fica parado quando termina uma tarefa sem saber o que fazer a seguir', 'Não age sem autorização explícita'],
    sim_curto: 'Age sozinho · Resolve problemas',
    nao_curto: 'Paralisa sem professor · Precisa aprovação',
    pergunta_aluno: 'Trabalhaste de forma autónoma hoje?',
  },
  {
    id: 'A04', nome: 'Iniciativa', tipo: 'individual',
    definicao: 'Age proativamente, antecipando necessidades e agindo sem ser pedido.',
    observar: ['Age antes de ser pedido', 'Antecipa necessidades da produção', 'Propõe soluções em vez de esperar'],
    nao_observar: ['Espera sempre que lhe digam o que fazer', 'Fica inativo quando termina a sua tarefa', 'Só age quando o problema já é óbvio'],
    exemplos_pos: ['Começa a preparar a mise en place para a próxima tarefa enquanto espera que o primeiro prato coza', 'Vê que os colegas precisam de ajuda e oferece-se sem ser pedido', 'Propõe uma melhoria na apresentação do prato'],
    exemplos_neg: ['Termina a tarefa e fica à espera que lhe deem outra', 'Vê o chão sujo e não limpa porque "não é a sua vez"', 'Espera que o professor note que falta um ingrediente'],
    sim_curto: 'Age sem esperar · Antecipa',
    nao_curto: 'Espera sempre · Fica inativo',
    pergunta_aluno: 'Tiveste iniciativa hoje sem esperar que te pedissem?',
  },
  {
    id: 'A10', nome: 'Empenho e persistência', tipo: 'individual',
    definicao: 'Mantém o esforço e a dedicação mesmo quando a tarefa é difícil ou os resultados demoram.',
    observar: ['Mantém o esforço mesmo quando a tarefa é difícil', 'Não desiste ao primeiro obstáculo', 'Tenta melhorar quando erra'],
    nao_observar: ['Desiste facilmente quando a técnica não resulta', 'Entrega trabalho abaixo do seu potencial', 'Perde motivação rapidamente'],
    exemplos_pos: ['Tenta a técnica do corte em juliana várias vezes até conseguir a espessura certa', 'Refaz o molho que falhou sem se queixar', 'Mantém o ritmo de trabalho do início ao fim da aula'],
    exemplos_neg: ['Desiste de fazer o nó no sacos de pasteleiro e pede ao colega', 'Entrega o empratamento de qualquer maneira porque "já está bem"', 'Perde energia e motivação no final da aula'],
    sim_curto: 'Persiste quando difícil · Tenta melhorar',
    nao_curto: 'Desiste facilmente · Perde motivação',
    pergunta_aluno: 'Estiveste empenhado/a e persististe quando foi difícil?',
  },
  {
    id: 'A05', nome: 'Autocontrolo', tipo: 'individual',
    definicao: 'Gere as suas emoções e reações em situações de pressão ou stress na cozinha.',
    observar: ['Mantém a calma em situações de pressão', 'Gere bem a frustração quando algo não corre bem', 'Não afeta os colegas com o seu estado emocional'],
    nao_observar: ['Reage de forma exagerada quando algo corre mal', 'Perde a calma e afeta o ambiente da equipa', 'Bloqueia em situações de pressão'],
    exemplos_pos: ['O prato queima e reage com calma, reorganiza e continua', 'Em serviço real com muitas comandas, mantém o ritmo sem entrar em pânico', 'Recebe uma crítica do professor sem reagir negativamente'],
    exemplos_neg: ['Atira um utensílio quando algo corre mal', 'Entra em pânico durante o serviço e atrasa toda a equipa', 'Chora ou fecha-se quando recebe uma crítica construtiva'],
    sim_curto: 'Calmo sob pressão · Gere emoções',
    nao_curto: 'Reage exageradamente · Bloqueia',
    pergunta_aluno: 'Mantiveste o autocontrolo mesmo nos momentos difíceis?',
  },
];

// ── CONTEXTO EQUIPA ───────────────────────────────────────────
const EQUIPA: CompAtitudinal[] = [
  {
    id: 'A09', nome: 'Cooperação com a equipa', tipo: 'equipa',
    definicao: 'Trabalha de forma colaborativa, partilhando tarefas e ajudando os colegas.',
    observar: ['Oferece ajuda proativamente', 'Partilha informação útil com a equipa', 'Aceita tarefas menos agradáveis sem reclamar'],
    nao_observar: ['Faz só o que lhe foi atribuído e ignora o resto', 'Retém informação que seria útil à equipa', 'Cria conflito ou tensão no grupo'],
    exemplos_pos: ['Termina a sua tarefa e pergunta ao colega em que pode ajudar', 'Avisa a equipa que o forno está a 20° abaixo do esperado', 'Aceita lavar a louça sem questionar'],
    exemplos_neg: ['Termina a tarefa e fica a olhar enquanto os colegas têm trabalho', 'Descobre que falta um ingrediente e não avisa', 'Recusa uma tarefa por considerar que "não é o seu trabalho"'],
    sim_curto: 'Ajuda equipa · Partilha info',
    nao_curto: 'Só a sua tarefa · Cria tensão',
    pergunta_aluno: 'Cooperaste bem com a tua equipa hoje?',
  },
  {
    id: 'A08', nome: 'Escuta ativa', tipo: 'equipa',
    definicao: 'Ouve atentamente e compreende o que lhe é comunicado, sem necessitar de repetições.',
    observar: ['Ouve sem interromper', 'Segue as instruções na primeira vez', 'Confirma que percebeu antes de agir'],
    nao_observar: ['Precisa que repitam as instruções constantemente', 'Faz tarefas diferentes das que foram pedidas', 'Interrompe ou não deixa os outros terminar'],
    exemplos_pos: ['O professor explica uma técnica uma vez e o aluno executa corretamente', 'Confirma com o colega de brigada o que foi combinado antes de começar', 'Toma nota mentalmente das instruções durante o briefing'],
    exemplos_neg: ['Precisa que o professor repita as instruções 3 vezes', 'Faz o corte errado porque não ouviu bem a explicação', 'Interrompe o professor a meio da explicação'],
    sim_curto: 'Ouve sem repetir · Segue 1ª vez',
    nao_curto: 'Precisa repetir · Interrompe',
    pergunta_aluno: 'Ouviste atentamente e seguiste as instruções na primeira vez?',
  },
  {
    id: 'A07', nome: 'Empatia', tipo: 'equipa',
    definicao: 'Compreende e considera os sentimentos e necessidades dos colegas e clientes.',
    observar: ['Percebe quando um colega está com dificuldades e oferece apoio', 'Adapta a comunicação ao interlocutor', 'Considera o impacto das suas ações nos outros'],
    nao_observar: ['Ignora as dificuldades dos colegas', 'Comunica de forma inapropriada para o contexto', 'Age sem considerar o impacto nos outros'],
    exemplos_pos: ['Percebe que o colega está sobrecarregado e redistribui tarefas', 'Adapta a explicação a um colega com mais dificuldades', 'Em serviço, percebe que o cliente está com pressa e agiliza'],
    exemplos_neg: ['Ignora que o colega está a ter dificuldades com a técnica', 'Critica o trabalho do colega à frente de toda a equipa', 'Não percebe que o cliente está insatisfeito'],
    sim_curto: 'Apoia colegas · Adapta comunicação',
    nao_curto: 'Ignora dificuldades · Age sem considerar',
    pergunta_aluno: 'Mostraste empatia pelos teus colegas e clientes hoje?',
  },
  {
    id: 'A06', nome: 'Assertividade', tipo: 'equipa',
    definicao: 'Comunica de forma clara, direta e respeitosa — defende a sua opinião sem agredir.',
    observar: ['Faz perguntas quando não percebe', 'Diz o que pensa de forma calma e respeitosa', 'Aceita a opinião do professor sem drama'],
    nao_observar: ['Fica em silêncio quando tem dúvidas', 'Discute ou interrompe de forma agressiva', 'Não defende a sua posição quando tem razão'],
    exemplos_pos: ['Diz ao professor que acha que a temperatura está demasiado alta, calmamente', 'Pede esclarecimentos quando não percebe uma instrução', 'Aceita uma crítica e responde "obrigado, vou melhorar"'],
    exemplos_neg: ['Não diz nada quando acha que algo está errado', 'Discute com o professor à frente de toda a turma', 'Aceita tudo sem questionar mesmo quando está errado'],
    sim_curto: 'Comunica com calma · Aceita feedback',
    nao_curto: 'Silêncio com dúvidas · Agressivo',
    pergunta_aluno: 'Comunicaste de forma assertiva hoje?',
  },
  {
    id: 'A18', nome: 'Respeito pela sensibilidade e bem-estar dos outros', tipo: 'equipa',
    definicao: 'Trata todos com respeito e dignidade, contribuindo para um ambiente de trabalho saudável.',
    observar: ['Fala de forma respeitosa com todos', 'Não cria mal-estar ou tensão desnecessária', 'Contribui para um ambiente positivo'],
    nao_observar: ['Faz comentários desrespeitosos ou humilhantes', 'Cria tensão ou conflitos desnecessários', 'Ignora ou menospreza os colegas'],
    exemplos_pos: ['Elogia o trabalho do colega quando fica bem feito', 'Resolve um desentendimento de forma calma e respeitosa', 'Trata o colega com dificuldades com paciência'],
    exemplos_neg: ['Goza com o erro do colega à frente de todos', 'Usa linguagem inapropriada na cozinha', 'Ignora deliberadamente um colega durante a aula'],
    sim_curto: 'Trata com respeito · Ambiente positivo',
    nao_curto: 'Comentários desrespeitosos · Cria tensão',
    pergunta_aluno: 'Respeitaste o bem-estar dos teus colegas hoje?',
  },
  {
    id: 'A12', nome: 'Flexibilidade e adaptabilidade', tipo: 'equipa',
    definicao: 'Adapta-se a mudanças de tarefas, situações imprevistas ou novos contextos com atitude positiva.',
    observar: ['Adapta-se a mudanças sem resistência', 'Mantém a eficácia em situações imprevistas', 'Abraça novas formas de fazer'],
    nao_observar: ['Resiste a mudanças de tarefa ou método', 'Desorganiza-se com situações imprevistas', 'Recusa experimentar novas abordagens'],
    exemplos_pos: ['Em serviço real, muda de estação sem questionar quando é necessário', 'Um ingrediente falta e adapta a receita sem entrar em pânico', 'Aceita fazer uma tarefa diferente da que esperava'],
    exemplos_neg: ['Recusa mudar de tarefa porque "não é o que combinámos"', 'Bloqueia quando um equipamento avaria e não consegue adaptar-se', 'Insiste em fazer sempre da mesma forma mesmo quando não resulta'],
    sim_curto: 'Adapta-se · Mantém eficácia',
    nao_curto: 'Resiste a mudanças · Bloqueia',
    pergunta_aluno: 'Adaptaste-te bem às mudanças e imprevistos de hoje?',
  },
];

// ── CONTEXTO SERVIÇO REAL ─────────────────────────────────────
const SERVICO_REAL: CompAtitudinal[] = [
  ...EQUIPA.filter(c => ['A09','A06','A12'].includes(c.id)),
  {
    id: 'A05b', nome: 'Autocontrolo em serviço', tipo: 'servico_real',
    definicao: 'Mantém a calma e eficiência em situações de pressão durante o serviço ao cliente.',
    observar: ['Mantém calma com muitas comandas', 'Não deixa a pressão afetar a qualidade', 'Comunica com clareza mesmo sob stress'],
    nao_observar: ['Entra em pânico com volume de trabalho', 'A qualidade cai sob pressão', 'Perde comunicação com a equipa'],
    exemplos_pos: ['Com 10 comandas em simultâneo, mantém a organização e o ritmo', 'Um prato volta da sala e reorganiza sem perder o fio', 'Avisa calmamente a equipa de um atraso'],
    exemplos_neg: ['Com 5 comandas faz confusão nas temperaturas dos pratos', 'Grita com o colega quando está sob pressão', 'Esquece uma comanda porque entrou em pânico'],
    sim_curto: 'Calmo em serviço · Mantém qualidade',
    nao_curto: 'Entra em pânico · Perde qualidade',
    pergunta_aluno: 'Mantiveste o autocontrolo durante o serviço?',
  },
];

// ── CONTEXTO COORDENAÇÃO ──────────────────────────────────────
const COORDENACAO: CompAtitudinal[] = [
  {
    id: 'A_LID', nome: 'Liderança', tipo: 'coordenacao',
    definicao: 'Orienta e motiva a equipa para atingir os objetivos comuns.',
    observar: ['Distribui tarefas de forma clara e justa', 'Motiva a equipa nos momentos difíceis', 'Toma decisões quando necessário'],
    nao_observar: ['Não consegue delegar ou distribuir tarefas', 'Desmotiva a equipa com a sua atitude', 'Evita tomar decisões difíceis'],
    exemplos_pos: ['Distribui as tarefas da mise en place de forma equitativa', 'Encoraja o colega que está com dificuldades', 'Decide que o prato precisa de mais tempo sem hesitar'],
    exemplos_neg: ['Faz tudo sozinho sem delegar', 'Critica a equipa em vez de a motivar', 'Evita decidir e pede ao professor que decida por ele'],
    sim_curto: 'Orienta · Motiva equipa',
    nao_curto: 'Não delega · Desmotiva',
    pergunta_aluno: 'Lideraste a tua equipa de forma eficaz hoje?',
  },
];

// ── 4 COMPETÊNCIAS ADICIONAIS ─────────────────────────────────
const ADICIONAIS: CompAtitudinal[] = [
  {
    id: 'A19', nome: 'Autoconfiança', tipo: 'adicional',
    definicao: 'Acredita nas suas capacidades e age com segurança nas suas escolhas profissionais.',
    observar: ['Age com segurança nas suas decisões', 'Apresenta o seu trabalho sem hesitação', 'Defende as suas escolhas com fundamento'],
    nao_observar: ['Constantemente duvida de si mesmo', 'Precisa de validação constante', 'Recusa assumir responsabilidades por insegurança'],
    exemplos_pos: ['Apresenta o empratamento com orgulho e explica as suas escolhas', 'Defende a técnica que usou quando questionado', 'Experimenta uma técnica nova com segurança'],
    exemplos_neg: ['Pede ao professor para aprovar cada decisão antes de agir', 'Diz "acho que está bem mas não tenho a certeza" em tudo', 'Recusa ir para um posto diferente por medo de errar'],
    sim_curto: 'Age com segurança · Acredita em si',
    nao_curto: 'Duvida constantemente · Precisa validação',
    pergunta_aluno: 'Atuaste com autoconfiança nas tuas decisões hoje?',
  },
  {
    id: 'A20', nome: 'Postura profissional', tipo: 'adicional',
    definicao: 'Mantém uma postura e comportamento adequados ao contexto profissional de restauração.',
    observar: ['Mantém postura correta e profissional', 'Comportamento adequado ao contexto', 'Representa bem a escola e a profissão'],
    nao_observar: ['Comportamento inadequado para o contexto', 'Linguagem ou atitudes não profissionais', 'Não distingue contexto escolar de lazer'],
    exemplos_pos: ['Em serviço ao cliente, comunica de forma profissional e cortês', 'Mantém a postura mesmo no final de um serviço longo', 'Trata todos os clientes com a mesma atenção'],
    exemplos_neg: ['Usa linguagem informal com os clientes', 'Usa o telemóvel durante o serviço', 'Ri-se com os colegas em contexto inapropriado durante o serviço'],
    sim_curto: 'Postura correta · Comportamento adequado',
    nao_curto: 'Comportamento inadequado · Não profissional',
    pergunta_aluno: 'Mantiveste uma postura profissional adequada hoje?',
  },
  {
    id: 'A21', nome: 'Sentido crítico', tipo: 'adicional',
    definicao: 'Analisa situações e resultados de forma objetiva, propondo melhorias fundamentadas.',
    observar: ['Questiona quando algo não faz sentido', 'Propõe melhorias com fundamento', 'Avalia o próprio trabalho de forma objetiva'],
    nao_observar: ['Aceita tudo sem questionar', 'Critica sem propor alternativas', 'Não consegue avaliar o seu próprio trabalho'],
    exemplos_pos: ['Diz "acho que esta técnica podia ser melhorada assim..." com argumento', 'Avalia o seu próprio prato e identifica o que pode melhorar', 'Questiona uma instrução que não percebe, pedindo explicação'],
    exemplos_neg: ['Aceita qualquer instrução sem perceber o porquê', 'Critica o trabalho do colega sem sugerir nada melhor', 'Diz que o prato está perfeito quando claramente tem problemas'],
    sim_curto: 'Questiona com fundamento · Propõe melhorias',
    nao_curto: 'Aceita tudo · Critica sem alternativas',
    pergunta_aluno: 'Usaste o teu sentido crítico de forma construtiva hoje?',
  },
  {
    id: 'A22', nome: 'Respeito pelas diferenças individuais', tipo: 'adicional',
    definicao: 'Trata todos com igualdade e respeito, independentemente das suas características ou capacidades.',
    observar: ['Trata todos os colegas com a mesma consideração', 'Adapta a comunicação às necessidades de cada um', 'Não faz distinções por características pessoais'],
    nao_observar: ['Trata diferente por características pessoais', 'Exclui ou menospreza colegas', 'Faz comentários inadequados sobre diferenças'],
    exemplos_pos: ['Ajuda o colega com dificuldades de aprendizagem sem o menosprezar', 'Inclui naturalmente todos os colegas nas decisões de grupo', 'Adapta a comunicação a um colega estrangeiro com paciência'],
    exemplos_neg: ['Exclui um colega das decisões do grupo', 'Faz comentários sobre as dificuldades de um colega', 'Trata diferente consoante a simpatia pessoal'],
    sim_curto: 'Trata todos igual · Respeita diferenças',
    nao_curto: 'Exclui · Trata diferente',
    pergunta_aluno: 'Respeitaste as diferenças individuais dos teus colegas hoje?',
  },
  {
    id: 'A03', nome: 'Cuidado com a apresentação pessoal', tipo: 'adicional',
    definicao: 'Mantém uma apresentação pessoal cuidada e adequada ao contexto profissional de cozinha.',
    observar: ['Farda completa e limpa', 'Higiene pessoal cuidada', 'Ausência de adornos proibidos'],
    nao_observar: ['Farda incompleta ou suja', 'Adornos proibidos (fones, unhas postiças, joias)', 'Higiene pessoal descurada'],
    exemplos_pos: ['Chega sempre com a farda limpa e passada', 'Mantém o cabelo sempre preso durante toda a aula', 'Não usa qualquer adorno que possa contaminar os alimentos'],
    exemplos_neg: ['Vem com o avental sujo da aula anterior', 'Usa fones durante a produção', 'Tem unhas compridas ou pintadas sem luvas'],
    sim_curto: 'Farda completa · Higiene cuidada',
    nao_curto: 'Farda incompleta · Adornos proibidos',
    pergunta_aluno: 'Cuidaste da tua apresentação pessoal hoje?',
  },
];

// ── EXPORTS ───────────────────────────────────────────────────
export const TODAS_COMPETENCIAS: CompAtitudinal[] = [
  ...PERMANENTES,
  ...INDIVIDUAL,
  ...EQUIPA,
  ...ADICIONAIS,
];

export const PERMANENTES_IDS = PERMANENTES.map(c => c.id);

export function getCompAtitudinal(id: string): CompAtitudinal | undefined {
  return TODAS_COMPETENCIAS.find(c => c.id === id);
}

export function getCompsPorContexto(tipo: string): CompAtitudinal[] {
  const perms = PERMANENTES;
  switch (tipo) {
    case 'Trabalho individual':
      return [...perms, ...INDIVIDUAL];
    case 'Trabalho em equipa':
      return [...perms, ...EQUIPA];
    case 'Serviço real':
      return [...perms, ...SERVICO_REAL];
    case 'Coordenação':
      return [...perms, ...COORDENACAO];
    default:
      return [...perms, ...EQUIPA];
  }
}

export { PERMANENTES, INDIVIDUAL, EQUIPA, SERVICO_REAL, COORDENACAO, ADICIONAIS };
