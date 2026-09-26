// ============================================================
// Eventos da ECL — a lógica por trás
// ============================================================
// O professor responde a poucas perguntas, uma de cada vez. Tudo o resto
// sai daqui: a classificação do evento, as perguntas a fazer ao cliente,
// o cronograma (D-21 a D+3) e as listas de material — só com o que se
// aplica a ESTE evento. A lista enorme fica por trás; à frente aparece
// apenas «o que falta» e «a próxima ação».
// ============================================================

export type Resp3 = 'sim' | 'nao' | 'nao_sei';

export interface MomentoServico {
  id: string;
  tipo: string;          // chave de MOMENTOS
  hora: string;          // "10:30"
  pessoas: number;
}

export interface AlteracaoEvento {
  id: string;
  em: string;
  oQue: string;
  pedidoPor: string;
  impacto: string;
}

export interface EstadoItem { feito?: boolean; naoAplica?: boolean; resposta?: string; responsavel?: string }

export type EstadoEvento = 'pedido' | 'proposta' | 'confirmado' | 'realizado' | 'fechado' | 'cancelado';

export interface EventoECL {
  id: string;
  versao: 4;
  numero: number;
  // 1. O pedido
  nome: string;
  entidade: string;
  contactoNome: string;
  contactoTel: string;
  contactoEmail: string;
  data: string;            // YYYY-MM-DD
  horaInicio: string;
  horaFim: string;
  onde: 'ecl' | 'fora' | 'por_definir' | '';
  morada: string;
  pessoas: number;
  // 2. O serviço
  momentos: MomentoServico[];
  tipoEvento: string;
  servico: string;
  nivel: string;
  estilos: string[];
  publico: string[];
  necessidades: Resp3 | '';
  necessidadesQuais: string[];
  protocolo: Resp3 | '';
  orcamento: 'sim' | 'nao' | '';
  orcamentoValor: string;
  prazoProposta: string;
  clienteSabe: 'sim' | 'parcial' | 'nao' | '';
  exigencias: string;
  // Quem trabalha no evento
  turmasIds: string[];
  outrasAreas: string[];
  turmaResponsavel: string;
  professorResponsavel: string;
  // 3. Local (só fora da ECL)
  local: { conhecemos?: Resp3; apoio?: Resp3; aguaLuz?: Resp3; carga?: Resp3 };
  salaECL: string;
  // 4. Menu e orçamento
  menu: string;
  custoPrevisto: string;
  precoProposto: string;
  // Decisão e andamento
  viavel: 'sim' | 'nao' | '';
  estado: EstadoEvento;
  perguntas: Record<string, EstadoItem>;
  tarefas: Record<string, EstadoItem>;
  alteracoes: AlteracaoEvento[];
  fecho: { conforme?: 'sim' | 'nao'; faltas?: 'sim' | 'nao'; desperdicio?: 'sim' | 'nao'; feedback?: string; ocorrencias?: string };
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}

// ── Opções ─────────────────────────────────────────────────────

export const MOMENTOS: { id: string; nome: string; hora: string }[] = [
  { id: 'welcome', nome: 'Welcome drink', hora: '09:30' },
  { id: 'pequeno_almoco', nome: 'Pequeno-almoço', hora: '08:30' },
  { id: 'coffee_manha', nome: 'Coffee break (manhã)', hora: '10:30' },
  { id: 'brunch', nome: 'Brunch', hora: '11:00' },
  { id: 'almoco', nome: 'Almoço', hora: '13:00' },
  { id: 'coffee_tarde', nome: 'Coffee break (tarde)', hora: '16:00' },
  { id: 'lanche', nome: 'Lanche', hora: '16:30' },
  { id: 'cocktail', nome: 'Cocktail', hora: '18:30' },
  { id: 'jantar', nome: 'Jantar', hora: '20:00' },
  { id: 'meal_box', nome: 'Meal box', hora: '12:30' },
  { id: 'outro', nome: 'Outro', hora: '' },
];
export const nomeMomento = (id: string) => MOMENTOS.find(m => m.id === id)?.nome || id;

export const TIPOS_EVENTO = ['Escolar', 'Empresarial', 'Institucional', 'Protocolar', 'Comemoração', 'Conferência', 'Formação', 'Outro'];
export const SERVICOS = [
  { id: 'buffet', nome: 'Buffet', ajuda: 'as pessoas servem-se' },
  { id: 'volante', nome: 'Volante', ajuda: 'a equipa passa com tabuleiros' },
  { id: 'sentado', nome: 'Sentado', ajuda: 'mesas, serviço à mesa' },
  { id: 'empratado', nome: 'Empratado', ajuda: 'pratos montados na cozinha' },
  { id: 'entrega', nome: 'Entrega', ajuda: 'só entregamos a comida' },
  { id: 'misto', nome: 'Misto', ajuda: 'mais do que um destes' },
];
export const NIVEIS = [
  { id: 'essencial', nome: 'Essencial', ajuda: 'simples, funcional, custo controlado' },
  { id: 'cuidado', nome: 'Cuidado', ajuda: 'mais variedade, apresentação trabalhada' },
  { id: 'gourmet', nome: 'Gourmet', ajuda: 'produtos diferenciados, peças elaboradas' },
  { id: 'premium', nome: 'Premium', ajuda: 'matéria-prima superior, exigência máxima' },
];
export const ESTILOS = ['Formal', 'Informal', 'Elegante', 'Institucional', 'Tradicional', 'Português', 'Contemporâneo',
  'Criativo', 'Jovem', 'Familiar', 'Temático', 'Sustentável', 'Saudável', 'Conforto/afetivo'];
export const PUBLICOS = ['Crianças', 'Jovens', 'Adultos', 'Seniores', 'Público misto', 'Profissionais', 'Convidados institucionais'];
export const NECESSIDADES = ['Vegetariano', 'Vegan', 'Sem glúten', 'Sem lactose', 'Alergias', 'Religiosas/culturais', 'Outras'];
export const OUTRAS_AREAS = ['Restaurante/Bar', 'Pastelaria', 'Receção/Turismo', 'Logística', 'Outra turma da ECL'];

export function eventoNovo(numero: number, professor: string): EventoECL {
  const agora = new Date().toISOString();
  return {
    id: 'ev_' + Date.now(), versao: 4, numero,
    nome: '', entidade: '', contactoNome: '', contactoTel: '', contactoEmail: '',
    data: '', horaInicio: '', horaFim: '', onde: '', morada: '', pessoas: 0,
    momentos: [], tipoEvento: '', servico: '', nivel: '', estilos: [], publico: [],
    necessidades: '', necessidadesQuais: [], protocolo: '', orcamento: '', orcamentoValor: '',
    prazoProposta: '', clienteSabe: '', exigencias: '',
    turmasIds: [], outrasAreas: [], turmaResponsavel: '', professorResponsavel: professor,
    local: {}, salaECL: '', menu: '', custoPrevisto: '', precoProposto: '',
    viavel: '', estado: 'pedido', perguntas: {}, tarefas: {}, alteracoes: [], fecho: {},
    criadoPor: professor, criadoEm: agora, atualizadoEm: agora,
  };
}

// ── Classificação automática ──────────────────────────────────
// A complexidade operacional é uma coisa; o nível gastronómico é outra.
// Um coffee break na escola pode ser gourmet; um almoço fora para 300
// pode ser simples na comida e muito complexo na logística.

export const temAlcool = (e: EventoECL) => e.momentos.some(m => ['welcome', 'cocktail', 'jantar', 'almoco'].includes(m.tipo));
export const temCafe = (e: EventoECL) => e.momentos.some(m => ['coffee_manha', 'coffee_tarde', 'pequeno_almoco', 'brunch', 'almoco', 'jantar', 'lanche'].includes(m.tipo));
export const eFora = (e: EventoECL) => e.onde === 'fora';

export function precisaVisita(e: EventoECL): boolean {
  if (!eFora(e)) return false;
  if (e.local.conhecemos === 'sim') return false;
  const duvidas = [e.local.apoio, e.local.aguaLuz, e.local.carga].filter(x => x !== 'sim').length;
  return e.local.conhecemos === 'nao' || duvidas >= 2;
}

export function classificar(e: EventoECL): { nivel: 'Simples' | 'Intermédia' | 'Complexa' | 'Especial'; razoes: string[] } {
  const razoes: string[] = [];
  let p = 0;
  if (eFora(e)) { p += 2; razoes.push('fora da ECL (transporte, montagem)'); }
  if (e.pessoas >= 300) { p += 3; razoes.push(`${e.pessoas} pessoas`); }
  else if (e.pessoas >= 150) { p += 2; razoes.push(`${e.pessoas} pessoas`); }
  else if (e.pessoas >= 80) { p += 1; razoes.push(`${e.pessoas} pessoas`); }
  if (e.momentos.length >= 3) { p += 2; razoes.push(`${e.momentos.length} momentos de serviço`); }
  else if (e.momentos.length === 2) { p += 1; razoes.push('2 momentos de serviço'); }
  if (e.protocolo === 'sim') { p += 2; razoes.push('protocolo / convidados VIP'); }
  else if (e.protocolo === 'nao_sei') { p += 1; razoes.push('protocolo por esclarecer'); }
  if (['sentado', 'empratado', 'misto'].includes(e.servico)) { p += 1; razoes.push('serviço à mesa'); }
  if (e.necessidades === 'sim') { p += 1; razoes.push('necessidades alimentares'); }
  if (e.turmasIds.length + e.outrasAreas.length > 1) { p += 1; razoes.push('várias turmas/áreas'); }
  if (precisaVisita(e)) { p += 1; razoes.push('espaço por conhecer'); }
  const nivel = p >= 7 ? 'Especial' : p >= 4 ? 'Complexa' : p >= 2 ? 'Intermédia' : 'Simples';
  if (!razoes.length) razoes.push('na ECL, um momento, sem requisitos especiais');
  return { nivel, razoes };
}

// ── Perguntas a fazer ao cliente (levantamento protocolar) ─────

export interface Pergunta { id: string; grupo: string; texto: string }

export function perguntasAoCliente(e: EventoECL): Pergunta[] {
  const l: Pergunta[] = [];
  const add = (grupo: string, id: string, texto: string) => l.push({ id, grupo, texto });
  const G1 = 'Contactos e decisões', G2 = 'Participantes', G3 = 'Programa e horários',
    G4 = 'O espaço', G5 = 'Protocolo', G6 = 'Menu e serviço', G7 = 'Condições';

  add(G1, 'contacto_dia', 'Quem é o contacto no dia do evento (nome e telemóvel)?');
  add(G1, 'aprova', 'Quem pode aprovar alterações ao evento?');
  add(G1, 'faturacao', 'Dados para faturação: entidade, NIF e morada.');

  add(G2, 'n_final', 'Qual o número final de participantes, e até quando o podem confirmar?');
  if (e.necessidades !== 'nao') add(G2, 'alergias', 'Há alergias ou restrições alimentares? Quais e quantas pessoas?');
  if (e.publico.includes('Seniores') || e.publico.includes('Crianças')) add(G2, 'mobilidade', 'Há pessoas com mobilidade reduzida ou necessidades especiais no serviço?');

  add(G3, 'horarios', 'Hora exata de início e fim de cada momento de serviço?');
  add(G3, 'programa', 'Há discursos, cerimónia ou programa que condicione o serviço? A que horas?');

  if (eFora(e) || e.onde === 'por_definir') {
    add(G4, 'morada', 'Morada exata e nome do espaço.');
    add(G4, 'acesso_hora', 'A que horas podemos entrar para montar, e até que horas temos de sair?');
    add(G4, 'entrada_servico', 'Onde é a entrada de serviço? Há escadas ou elevador até à sala?');
    add(G4, 'estacionamento', 'Há lugar para a carrinha parar junto à entrada (cargas e descargas)?');
    add(G4, 'backoffice', 'Há uma zona de apoio (copa/backoffice) só para a equipa?');
    add(G4, 'agua', 'Há água corrente e sítio para lavar?');
    add(G4, 'eletricidade', 'Há tomadas perto do serviço? Aguentam máquina de café e aquecedores?');
    add(G4, 'frio', 'Há frigorífico ou frio disponível?');
    add(G4, 'mesas', 'Mesas, toalhas e cadeiras: são do espaço ou levamos nós?');
    add(G4, 'residuos', 'Onde deixamos o lixo? Quem o recolhe?');
    add(G4, 'credenciacao', 'É preciso credenciação ou identificação da equipa?');
    add(G4, 'responsavel_espaco', 'Quem é o responsável do espaço no dia (nome e telemóvel)?');
  } else if (e.onde === 'ecl') {
    add(G4, 'sala', 'Em que sala ou espaço da escola? Já está reservado?');
    add(G4, 'rececao', 'É preciso alguém a receber e encaminhar os convidados à entrada?');
  }

  if (e.protocolo !== 'nao') {
    add(G5, 'vip', 'Há convidados VIP ou protocolares? Quem?');
    add(G5, 'precedencia', 'Há lugares marcados ou ordem de precedência?');
    add(G5, 'simbolos', 'Há bandeiras, logótipos ou elementos institucionais a colocar?');
    add(G5, 'imprensa', 'Haverá comunicação social ou fotografia?');
  }

  if (e.clienteSabe !== 'sim') add(G6, 'gostos', 'Que tipo de comida ou experiência gostariam? Há pratos que querem, ou que não querem?');
  if (temAlcool(e)) add(G6, 'alcool', 'Pretendem bebidas alcoólicas? Quais?');
  if (temCafe(e)) add(G6, 'cafe', 'Pretendem café e chá?');
  add(G6, 'menu_impresso', 'Querem menu impresso ou identificação das iguarias? Em que línguas?');
  add(G6, 'decoracao', 'Há tema, cores ou decoração pretendida?');

  if (e.orcamento !== 'sim') add(G7, 'orcamento', 'Qual o orçamento disponível (por pessoa ou total)?');
  if (!e.prazoProposta) add(G7, 'prazo', 'Até quando precisam da proposta?');
  if (eFora(e)) add(G7, 'recolha', 'A recolha do material é no fim do evento ou no dia seguinte?');
  return l;
}

// ── Cronograma e listas (só o que se aplica) ─────────────────────

export interface Tarefa {
  id: string;
  fase: 'Decidir' | 'Preparar' | 'Material' | 'HACCP' | 'Dia do evento' | 'Fechar';
  texto: string;
  /** Dias antes (negativo) ou depois do evento. */
  d: number;
  quem: string;
  critica?: boolean;
  /** Hora, no dia do evento. */
  hora?: string;
}

export function tarefasDoEvento(e: EventoECL): Tarefa[] {
  const t: Tarefa[] = [];
  const add = (x: Tarefa) => t.push(x);
  const fora = eFora(e);
  const primeira = [...e.momentos].sort((a, b) => a.hora.localeCompare(b.hora))[0]?.hora || e.horaInicio || '';
  const menos = (h: string, min: number) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(h || ''); if (!m) return '';
    const x = Math.max(0, Number(m[1]) * 60 + Number(m[2]) - min);
    return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  };

  add({ id: 'go', fase: 'Decidir', d: -21, quem: 'Coordenação', critica: true,
    texto: 'Decidir se é viável: há equipa, espaço de produção, transporte e é compatível com as aulas?' });
  add({ id: 'perguntas', fase: 'Decidir', d: -21, quem: 'Coordenação', critica: true, texto: 'Fazer as perguntas ao cliente' });
  if (precisaVisita(e)) add({ id: 'visita', fase: 'Decidir', d: -18, quem: 'Coordenação', critica: true, texto: 'Visita técnica ao espaço (fotografias, medidas, acessos, tomadas, água)' });
  add({ id: 'menu', fase: 'Preparar', d: -15, quem: 'Cozinha/Pastelaria', critica: true, texto: 'Proposta de menu' });
  add({ id: 'quantidades', fase: 'Preparar', d: -15, quem: 'Cozinha', texto: 'Quantidades por pessoa (peças, bebidas, matérias-primas, margem)' });
  add({ id: 'requisicao', fase: 'Preparar', d: -12, quem: 'Coordenação', texto: 'Requisição e custos (matérias-primas, bebidas, descartáveis, lavandaria, transporte)' });
  add({ id: 'proposta', fase: 'Preparar', d: -12, quem: 'Direção', critica: true, texto: 'Enviar a proposta (menu, condições e valor) para aprovação' });
  add({ id: 'confirmacao', fase: 'Preparar', d: -10, quem: 'Coordenação', critica: true, texto: 'Confirmação final: nº de pessoas, menu, alergias, horários, contacto no dia' });
  add({ id: 'equipa', fase: 'Preparar', d: -10, quem: 'Coordenação', critica: true, texto: 'Equipa: professores, turmas e a função de cada aluno' });
  add({ id: 'plano_producao', fase: 'Preparar', d: -7, quem: 'Cozinha/Pastelaria', texto: 'Plano de produção: o que se faz em cada dia, quem e em que posto' });
  add({ id: 'compras', fase: 'Preparar', d: -5, quem: 'Compras', critica: true, texto: 'Encomendas feitas e compras conferidas' });
  add({ id: 'alunos_info', fase: 'Preparar', d: -3, quem: 'Professor responsável', texto: 'Informar os alunos: hora, local, farda e função' });
  add({ id: 'preproducao', fase: 'Preparar', d: -2, quem: 'Equipas', texto: 'Pré-produção (sobremesas, molhos, bases) e caixas identificadas' });
  if (fora) add({ id: 'transporte', fase: 'Preparar', d: -1, quem: 'Logística', critica: true, texto: 'Transporte: viatura, motorista e hora de carga' });
  add({ id: 'auditoria', fase: 'Preparar', d: -1, quem: 'Coordenação', critica: true, texto: 'Auditoria final (24 h antes): comida, bebidas, material, equipa, horários, contactos' });

  // Material — só o que este evento usa
  const M = (id: string, texto: string) => add({ id: 'mat_' + id, fase: 'Material', d: -1, quem: 'Sala/Logística', texto });
  if (temCafe(e)) { M('cafe_maquina', 'Máquina de café'); M('cafe', 'Café, chá e leite'); M('chavenas', 'Chávenas e pires'); M('acucar', 'Açúcar, adoçante e mexedores'); }
  if (temAlcool(e)) { M('copos_vinho', 'Copos de vinho / flutes'); M('saca_rolhas', 'Saca-rolhas'); M('gelo', 'Gelo e frapés'); }
  M('agua_copos', 'Copos de água e jarros');
  M('guardanapos', 'Guardanapos');
  if (e.servico === 'buffet' || e.servico === 'misto') { M('toalhas_buffet', 'Toalhas e saias para o buffet'); M('travessas', 'Travessas, pinças e colheres de serviço'); M('rechauds', 'Réchauds (se houver quente)'); }
  if (e.servico === 'volante' || e.servico === 'misto') M('tabuleiros', 'Tabuleiros para o serviço volante');
  if (['sentado', 'empratado', 'misto'].includes(e.servico)) { M('pratos', 'Pratos, talheres e copos por lugar'); M('toalhas_mesa', 'Toalhas de mesa'); }
  if (e.protocolo === 'sim') M('protocolo', 'Marcadores de lugar, bandeiras/logótipo');
  if (fora) { M('caixas', 'Caixas de transporte (isotérmicas), identificadas'); M('extensoes', 'Extensões elétricas'); M('lixo', 'Sacos do lixo e kit de limpeza'); }
  M('fardas', 'Fardas da equipa');

  // Segurança alimentar
  add({ id: 'haccp_alergenios', fase: 'HACCP', d: -1, quem: 'Cozinha', critica: e.necessidades === 'sim', texto: 'Alergénios identificados em cada iguaria' });
  if (fora) add({ id: 'haccp_temp', fase: 'HACCP', d: 0, quem: 'Cozinha', texto: 'Temperaturas registadas à saída, à chegada e no serviço' });
  add({ id: 'haccp_frio', fase: 'HACCP', d: 0, quem: 'Cozinha', texto: 'Cadeia de frio e de quente garantida' });

  // Dia do evento, hora a hora
  add({ id: 'dia_producao', fase: 'Dia do evento', d: 0, quem: 'Cozinha', hora: menos(primeira, fora ? 180 : 120), texto: 'Produção final e acondicionamento' });
  if (fora) add({ id: 'dia_carga', fase: 'Dia do evento', d: 0, quem: 'Logística', hora: menos(primeira, 90), texto: 'Carga da viatura e saída (conferir a lista de material)' });
  add({ id: 'dia_montagem', fase: 'Dia do evento', d: 0, quem: 'Sala', hora: menos(primeira, 60), texto: 'Montagem do espaço' });
  add({ id: 'dia_briefing', fase: 'Dia do evento', d: 0, quem: 'Professor responsável', hora: menos(primeira, 20), texto: 'Briefing da equipa: funções, horários, alergénios' });
  [...e.momentos].sort((a, b) => a.hora.localeCompare(b.hora)).forEach(m =>
    add({ id: 'dia_m_' + m.id, fase: 'Dia do evento', d: 0, quem: 'Equipas', hora: m.hora, texto: `${nomeMomento(m.tipo)} — ${m.pessoas || e.pessoas} pessoas` }));
  add({ id: 'dia_desmontagem', fase: 'Dia do evento', d: 0, quem: 'Equipas', hora: e.horaFim || '', texto: 'Desmontagem, recolha e lixo' });
  if (fora) add({ id: 'dia_retorno', fase: 'Dia do evento', d: 0, quem: 'Logística', texto: 'Retorno: material conferido à chegada à escola' });

  add({ id: 'fecho_custos', fase: 'Fechar', d: 1, quem: 'Coordenação', texto: 'Material, quebras, sobras e custos reais' });
  add({ id: 'fecho_avaliacao', fase: 'Fechar', d: 3, quem: 'Coordenação/Equipas', texto: 'Avaliação: o que correu bem, falhas, desperdício, feedback do cliente' });
  return t;
}

export function dataDaTarefa(e: EventoECL, d: number): string {
  if (!e.data) return '';
  const x = new Date(e.data + 'T12:00:00');
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
}

export const hojeISO = () => new Date().toISOString().slice(0, 10);

// ── Os 6 passos e a próxima ação ───────────────────────────────

export type Cor = 'verde' | 'amarelo' | 'vermelho' | 'cinzento';
export interface Passo { id: string; nome: string; cor: Cor; resumo: string }

export function faltaNoPedido(e: EventoECL): string[] {
  const f: string[] = [];
  if (!e.nome) f.push('nome do evento');
  if (!e.entidade) f.push('quem pede');
  if (!e.data) f.push('data');
  if (!e.onde) f.push('onde é');
  if (!e.pessoas) f.push('nº de pessoas');
  if (!e.tipoEvento) f.push('tipo de evento');
  if (!e.turmasIds.length && !e.outrasAreas.length) f.push('turmas envolvidas');
  return f;
}
export function faltaNoServico(e: EventoECL): string[] {
  const f: string[] = [];
  if (!e.momentos.length) f.push('momentos de serviço');
  if (e.momentos.some(m => !m.hora)) f.push('hora de cada momento');
  if (!e.servico) f.push('tipo de serviço');
  if (!e.nivel) f.push('nível gastronómico');
  return f;
}
export function pendenciasDoLocal(e: EventoECL): string[] {
  if (e.onde === 'ecl') return e.salaECL ? [] : ['sala da escola por confirmar'];
  if (e.onde === 'por_definir') return ['local por definir'];
  if (!eFora(e)) return [];
  const f: string[] = [];
  const nome = { conhecemos: 'conhecer o espaço', apoio: 'zona de apoio ao catering', aguaLuz: 'água e eletricidade', carga: 'carga e descarga' } as const;
  (Object.keys(nome) as (keyof typeof nome)[]).forEach(k => { if (e.local[k] !== 'sim') f.push(`Confirmar ${nome[k]}`); });
  if (precisaVisita(e) && !e.tarefas.visita?.feito) f.unshift('Visita técnica necessária');
  return f;
}

export function perguntasEmFalta(e: EventoECL): Pergunta[] {
  return perguntasAoCliente(e).filter(p => !e.perguntas[p.id]?.feito && !e.perguntas[p.id]?.naoAplica);
}

export function tarefasEmFalta(e: EventoECL): Tarefa[] {
  return tarefasDoEvento(e).filter(t => !e.tarefas[t.id]?.feito && !e.tarefas[t.id]?.naoAplica);
}

export function preparacao(e: EventoECL): { feitas: number; total: number; pct: number } {
  const todas = tarefasDoEvento(e).filter(t => t.fase !== 'Fechar' && !e.tarefas[t.id]?.naoAplica);
  const feitas = todas.filter(t => e.tarefas[t.id]?.feito).length;
  return { feitas, total: todas.length, pct: todas.length ? Math.round(feitas / todas.length * 100) : 0 };
}

export function passos(e: EventoECL): Passo[] {
  const p1 = faltaNoPedido(e), p2 = faltaNoServico(e), p3 = pendenciasDoLocal(e);
  const menuOk = !!e.menu.trim(), custoOk = !!e.custoPrevisto.trim();
  const prep = preparacao(e);
  const fechado = !!e.fecho.conforme;
  return [
    { id: 'evento', nome: 'Evento', cor: p1.length ? 'vermelho' : 'verde', resumo: p1.length ? `Falta: ${p1.join(', ')}` : 'Completo' },
    { id: 'servico', nome: 'Serviço', cor: p2.length ? 'vermelho' : 'verde', resumo: p2.length ? `Falta: ${p2.join(', ')}` : `${e.momentos.length} momento${e.momentos.length === 1 ? '' : 's'}` },
    { id: 'local', nome: 'Local', cor: p3.length ? (p3.some(x => /Visita/.test(x)) ? 'vermelho' : 'amarelo') : 'verde',
      resumo: p3.length ? `${p3.length} ${p3.length === 1 ? 'questão' : 'questões'}` : (e.onde === 'ecl' ? `Na ECL · ${e.salaECL}` : 'Confirmado') },
    { id: 'menu', nome: 'Menu e orçamento', cor: menuOk && custoOk ? 'verde' : menuOk || custoOk ? 'amarelo' : 'vermelho',
      resumo: menuOk && custoOk ? 'Menu e custo definidos' : !menuOk ? 'Menu por definir' : 'Custo por calcular' },
    { id: 'preparacao', nome: 'Preparação', cor: prep.pct === 100 ? 'verde' : prep.feitas ? 'amarelo' : 'cinzento', resumo: `${prep.feitas} de ${prep.total} (${prep.pct}%)` },
    { id: 'fecho', nome: 'Realizar e fechar', cor: fechado ? 'verde' : e.estado === 'realizado' ? 'amarelo' : 'cinzento', resumo: fechado ? 'Fechado' : '—' },
  ];
}

export interface Acao { texto: string; onde: string; prazo?: string; atrasada?: boolean }

/** O que fazer agora. O professor não procura o que falta: a aplicação diz. */
export function proximaAcao(e: EventoECL): Acao | null {
  const p1 = faltaNoPedido(e);
  if (p1.length) return { texto: `Completar o pedido: ${p1[0]}`, onde: 'triagem' };
  const p2 = faltaNoServico(e);
  if (p2.length) return { texto: `Completar o serviço: ${p2[0]}`, onde: 'triagem' };
  if (!e.viavel) return { texto: 'Decidir se o evento é viável (GO / NO GO)', onde: 'resumo', prazo: dataDaTarefa(e, -21) };
  if (e.viavel === 'nao') return null;
  const pc = perguntasEmFalta(e);
  if (pc.length) return { texto: `Perguntar ao cliente: ${pc[0].texto}`, onde: 'perguntas', prazo: dataDaTarefa(e, -21) };
  const pl = pendenciasDoLocal(e);
  if (pl.length) return { texto: pl[0], onde: 'local' };
  const ordem = tarefasEmFalta(e).filter(t => t.fase !== 'Fechar' || e.estado === 'realizado')
    .sort((a, b) => a.d - b.d || (a.hora || '').localeCompare(b.hora || ''));
  const t = ordem.find(x => x.id !== 'go' && x.id !== 'perguntas');
  if (!t) return e.fecho.conforme ? null : { texto: 'Fechar o evento', onde: 'fecho' };
  const prazo = dataDaTarefa(e, t.d);
  return { texto: t.texto, onde: t.fase === 'Dia do evento' ? 'dia' : 'preparacao', prazo, atrasada: !!prazo && prazo < hojeISO() };
}

/** Evento «pronto»: nada crítico por fazer até à véspera. */
export function pronto(e: EventoECL): boolean {
  return !tarefasEmFalta(e).some(t => t.critica && t.d <= -1) && !pendenciasDoLocal(e).length && !perguntasEmFalta(e).length;
}

/** Texto das perguntas, para colar num email ao cliente. */
export function textoPerguntas(e: EventoECL, soEmFalta = true): string {
  const ps = soEmFalta ? perguntasEmFalta(e) : perguntasAoCliente(e);
  const grupos = [...new Set(ps.map(p => p.grupo))];
  const dataPT = e.data ? e.data.split('-').reverse().join('/') : '';
  return `Evento: ${e.nome}${dataPT ? ' — ' + dataPT : ''}\n\nPara prepararmos o serviço, pedimos a confirmação dos seguintes pontos:\n\n`
    + grupos.map(g => `${g.toUpperCase()}\n` + ps.filter(p => p.grupo === g).map((p, i) => `${i + 1}. ${p.texto}`).join('\n')).join('\n\n')
    + '\n\nObrigado.\nEscola de Comércio de Lisboa';
}

/** Pedido para uma IA sugerir 3 conceitos de menu. */
export function pedidoMenuIA(e: EventoECL): string {
  const nivel = NIVEIS.find(n => n.id === e.nivel)?.nome || '';
  const servico = SERVICOS.find(s => s.id === e.servico)?.nome || '';
  return `És chef de uma escola de hotelaria em Portugal. Propõe 3 conceitos de menu diferentes para este evento, em português de Portugal.

Evento: ${e.nome} (${e.tipoEvento})
Data: ${e.data} · ${e.pessoas} pessoas · ${e.onde === 'ecl' ? 'na escola' : 'fora da escola'}
Momentos: ${e.momentos.map(m => `${nomeMomento(m.tipo)} às ${m.hora} (${m.pessoas || e.pessoas} pessoas)`).join('; ')}
Serviço: ${servico} · Nível: ${nivel}
Estilo: ${e.estilos.join(', ') || '—'} · Público: ${e.publico.join(', ') || '—'}
Necessidades alimentares: ${e.necessidades === 'sim' ? e.necessidadesQuais.join(', ') : e.necessidades === 'nao' ? 'nenhuma' : 'por confirmar'}
${e.orcamento === 'sim' ? `Orçamento: ${e.orcamentoValor}` : ''}
${e.exigencias ? `Pedidos especiais: ${e.exigencias}` : ''}

Para cada conceito: nome, a ideia em 1 frase, e a lista de iguarias por momento com a quantidade por pessoa (peças ou gramas). Produtos da época. Nada que uma cozinha de escola não consiga produzir.`;
}

// ── Para o resto da aplicação (planos e requisições) ───────────
// Os planos de aula podem ser ligados a um evento. Esta forma é a que o
// resto da aplicação já conhece (id, nome, turmaId, dias com pessoas).
export function comoEventoAntigo(e: EventoECL, turmaId: string): any {
  const pessoas = e.momentos.reduce((s, m) => s + (m.pessoas || e.pessoas || 0), 0) || e.pessoas;
  return {
    id: e.id, numero: e.numero, nome: e.nome, turmaId,
    dias: e.data ? [{ id: 'd1', data: e.data, momentos: [{ numPessoas: pessoas }] }] : [],
  };
}

/** Eventos antigos (v3) e novos (v4), na forma antiga — para os planos. */
export function eventosParaPlanos(turmaId?: string): any[] {
  let antigos: any[] = [], novos: EventoECL[] = [];
  try { antigos = JSON.parse(localStorage.getItem('ecl_eventos_v3') || '[]'); } catch { /* */ }
  try { novos = JSON.parse(localStorage.getItem('ecl_eventos_v4') || '[]'); } catch { /* */ }
  const a = turmaId ? antigos.filter((e: any) => e.turmaId === turmaId) : antigos;
  const n = novos.filter(e => e.estado !== 'cancelado' && (!turmaId || e.turmasIds.includes(turmaId)))
    .map(e => comoEventoAntigo(e, turmaId || e.turmasIds[0] || ''));
  return [...a, ...n];
}
