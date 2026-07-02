import React, { useState, useEffect } from 'react';
import { publicarNoClassroom } from '../backend';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface RespostaWizard {
  perguntaId: string;
  valor: string | string[];
  outro?: string;
}

interface Evento {
  id: string;
  nome: string;
  turmaId: string;
  respostas: RespostaWizard[];
  checklist: ItemChecklist[];
  tarefas: TarefaEvento[];
  publicado: boolean;
  criadoEm: string;
}

interface ItemChecklist {
  id: string;
  categoria: string;
  texto: string;
  obrigatorio: boolean;
  responsavel: string;
  estado: 'pendente' | 'feito' | 'nao_aplica' | 'ver_depois';
}

interface TarefaEvento {
  id: string;
  titulo: string;
  disciplina: string;
  descricao: string;
  tipo: 'cozinha' | 'sala' | 'comunicacao' | 'interdisciplinar';
  selecionada: boolean;
}

type EstadoWizard = 'inicio' | 'wizard' | 'checklist' | 'publicar' | 'concluido';

// ── Storage ───────────────────────────────────────────────────────────────────
const EVENTOS_KEY = 'ecl_eventos_v2';
const OPCOES_CUSTOM_KEY = 'ecl_wizard_opcoes_custom';

function loadEventos(): Evento[] {
  try { return JSON.parse(localStorage.getItem(EVENTOS_KEY) || '[]'); } catch { return []; }
}
function saveEventos(ev: Evento[]) { localStorage.setItem(EVENTOS_KEY, JSON.stringify(ev)); }

function loadOpcoesCustom(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(OPCOES_CUSTOM_KEY) || '{}'); } catch { return {}; }
}
function saveOpcoesCustom(op: Record<string, string[]>) { localStorage.setItem(OPCOES_CUSTOM_KEY, JSON.stringify(op)); }

// ── Perguntas do Wizard ───────────────────────────────────────────────────────
interface Pergunta {
  id: string;
  bloco: string;
  texto: string;
  tipo: 'botoes' | 'multi' | 'texto' | 'numero';
  opcoes?: { valor: string; label: string; emoji?: string }[];
  permiteOutro?: boolean;
  permiteVerDepois?: boolean;
  obrigatoria?: boolean;
  condicao?: (respostas: RespostaWizard[]) => boolean;
}

function getPerguntas(opcoesCustom: Record<string, string[]>): Pergunta[] {
  const custom = (id: string) => (opcoesCustom[id] || []).map(v => ({ valor: v, label: v, emoji: '⭐' }));

  return [
    // ── BLOCO A — DEFINIÇÃO ──────────────────────────────────────────────────
    {
      id: 'nome',
      bloco: 'Definição',
      texto: 'Qual é o nome do evento?',
      tipo: 'texto',
      obrigatoria: true,
    },
    {
      id: 'local',
      bloco: 'Definição',
      texto: 'O evento é interno ou externo?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'interno', label: 'Interno — na escola', emoji: '🏫' },
        { valor: 'externo', label: 'Externo — noutro local', emoji: '🚌' },
        ...custom('local'),
      ],
      permiteOutro: true,
    },
    {
      id: 'tipo_evento',
      bloco: 'Definição',
      texto: 'Que tipo de evento é este?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'coffee_break', label: 'Coffee Break', emoji: '☕' },
        { valor: 'almoco_buffet', label: 'Almoço Buffet', emoji: '🥗' },
        { valor: 'almoco_mesa', label: 'Almoço à Mesa', emoji: '🍽️' },
        { valor: 'jantar', label: 'Jantar', emoji: '🌙' },
        { valor: 'cocktail', label: 'Cocktail', emoji: '🥂' },
        { valor: 'catering_externo', label: 'Catering Externo', emoji: '🚛' },
        ...custom('tipo_evento'),
      ],
      permiteOutro: true,
    },
    {
      id: 'num_coffee_breaks',
      bloco: 'Definição',
      texto: 'Quantos coffee breaks são?',
      tipo: 'botoes',
      permiteVerDepois: true,
      condicao: r => r.find(x => x.perguntaId === 'tipo_evento')?.valor === 'coffee_break',
      opcoes: [
        { valor: '1_manha', label: '1 — Só de manhã', emoji: '🌅' },
        { valor: '1_tarde', label: '1 — Só de tarde', emoji: '🌇' },
        { valor: '2_ambos', label: '2 — Manhã e tarde', emoji: '☀️' },
      ],
    },
    {
      id: 'data',
      bloco: 'Definição',
      texto: 'Qual é a data e horário do evento?',
      tipo: 'texto',
      obrigatoria: true,
    },
    {
      id: 'protocolo',
      bloco: 'Definição',
      texto: 'O evento tem protocolo formal?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'sim', label: 'Sim — tem protocolo', emoji: '🎩' },
        { valor: 'nao', label: 'Não — informal', emoji: '😊' },
      ],
    },
    {
      id: 'tema',
      bloco: 'Definição',
      texto: 'O evento tem um tema específico?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'nao', label: 'Não tem tema', emoji: '❌' },
        { valor: 'natal', label: 'Natal', emoji: '🎄' },
        { valor: 'pascoa', label: 'Páscoa', emoji: '🐣' },
        { valor: 'portugues', label: 'Cozinha Portuguesa', emoji: '🇵🇹' },
        { valor: 'internacional', label: 'Cozinha Internacional', emoji: '🌍' },
        { valor: 'sim', label: 'Sim — outro tema', emoji: '🎨' },
        ...custom('tema'),
      ],
      permiteOutro: true,
    },
    // ── BLOCO B — PÚBLICO ────────────────────────────────────────────────────
    {
      id: 'num_pessoas',
      bloco: 'Público',
      texto: 'Para quantas pessoas é o evento?',
      tipo: 'numero',
      obrigatoria: true,
    },
    {
      id: 'tipo_publico',
      bloco: 'Público',
      texto: 'Qual é o tipo de público?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'adultos', label: 'Adultos', emoji: '👨‍💼' },
        { valor: 'criancas', label: 'Crianças', emoji: '👶' },
        { valor: 'misto', label: 'Adultos + crianças', emoji: '👨‍👩‍👧' },
        { valor: 'corporativo', label: 'Corporativo', emoji: '🏢' },
        { valor: 'escolar', label: 'Escolar', emoji: '🎓' },
        ...custom('tipo_publico'),
      ],
      permiteOutro: true,
    },
    {
      id: 'restricoes',
      bloco: 'Público',
      texto: 'Existem restrições alimentares ou alergias?',
      tipo: 'multi',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'nenhuma', label: 'Nenhuma conhecida', emoji: '✅' },
        { valor: 'sem_gluten', label: 'Sem glúten', emoji: '🌾' },
        { valor: 'sem_lactose', label: 'Sem lactose', emoji: '🥛' },
        { valor: 'vegetariano', label: 'Vegetariano', emoji: '🥦' },
        { valor: 'vegan', label: 'Vegan', emoji: '🌱' },
        { valor: 'halal', label: 'Halal', emoji: '☪️' },
        { valor: 'sem_marisco', label: 'Alergia a marisco', emoji: '🦐' },
        { valor: 'sem_frutos_secos', label: 'Alergia a frutos secos', emoji: '🥜' },
        { valor: 'diabetico', label: 'Diabético', emoji: '💉' },
        ...custom('restricoes'),
      ],
      permiteOutro: true,
    },
    {
      id: 'outras_turmas',
      bloco: 'Público',
      texto: 'Estão envolvidas outras turmas ou disciplinas?',
      tipo: 'multi',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'nao', label: 'Não', emoji: '❌' },
        { valor: 'restaurante_bar', label: 'Restaurante/Bar', emoji: '🍷' },
        { valor: 'turismo', label: 'Turismo', emoji: '✈️' },
        { valor: 'gestao_controlo', label: 'Gestão e Controlo', emoji: '📊' },
        { valor: 'ingles', label: 'Inglês Técnico', emoji: '🇬🇧' },
        { valor: 'area_projeto', label: 'Área de Projecto', emoji: '📐' },
        { valor: 'area_integracao', label: 'Área de Integração', emoji: '🔗' },
        { valor: 'portugues', label: 'Português', emoji: '📝' },
        { valor: 'matematica', label: 'Matemática', emoji: '🔢' },
        ...custom('outras_turmas'),
      ],
      permiteOutro: true,
    },
    // ── BLOCO C — MENU ───────────────────────────────────────────────────────
    {
      id: 'tipo_servico',
      bloco: 'Menu',
      texto: 'Como vai ser servida a comida?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'empratado', label: 'Serviço à mesa (empratado)', emoji: '🍽️' },
        { valor: 'buffet', label: 'Buffet', emoji: '🥗' },
        { valor: 'finger_food', label: 'Finger food / Cocktail', emoji: '🤏' },
        { valor: 'misto', label: 'Misto', emoji: '🔄' },
        ...custom('tipo_servico'),
      ],
      permiteOutro: true,
    },
    {
      id: 'nivel_menu',
      bloco: 'Menu',
      texto: 'Qual é o nível do menu?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'simples', label: 'Simples — 2 pratos + sobremesa', emoji: '🟢' },
        { valor: 'medio', label: 'Médio — 3 pratos + sobremesa', emoji: '🟡' },
        { valor: 'elaborado', label: 'Elaborado — 4+ pratos com entrada', emoji: '🔴' },
        ...custom('nivel_menu'),
      ],
      permiteOutro: true,
    },
    {
      id: 'proteina',
      bloco: 'Menu',
      texto: 'Qual é a proteína principal?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'peixe', label: 'Peixe', emoji: '🐟' },
        { valor: 'carne', label: 'Carne', emoji: '🥩' },
        { valor: 'peixe_carne', label: 'Peixe e Carne', emoji: '🐟🥩' },
        { valor: 'vegetariano', label: 'Vegetariano', emoji: '🥦' },
        { valor: 'mundo', label: 'Cozinha do Mundo', emoji: '🌍' },
        ...custom('proteina'),
      ],
      permiteOutro: true,
    },
    {
      id: 'tipo_cozinha',
      bloco: 'Menu',
      texto: 'Que estilo de cozinha se pretende?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'tradicional_pt', label: 'Tradicional portuguesa', emoji: '🇵🇹' },
        { valor: 'internacional', label: 'Internacional', emoji: '🌍' },
        { valor: 'criativa', label: 'Criativa/contemporânea', emoji: '🎨' },
        { valor: 'saudavel', label: 'Saudável/dietética', emoji: '🥗' },
        { valor: 'tematica', label: 'Temática', emoji: '🌶️' },
        ...custom('tipo_cozinha'),
      ],
      permiteOutro: true,
    },
    {
      id: 'estrutura_menu',
      bloco: 'Menu',
      texto: 'Que elementos tem o menu?',
      tipo: 'multi',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'entrada', label: 'Entrada', emoji: '🥗' },
        { valor: 'sopa', label: 'Sopa', emoji: '🍲' },
        { valor: 'prato_peixe', label: 'Prato de peixe', emoji: '🐟' },
        { valor: 'prato_carne', label: 'Prato de carne', emoji: '🥩' },
        { valor: 'sobremesa', label: 'Sobremesa', emoji: '🍮' },
        { valor: 'fruta', label: 'Fruta', emoji: '🍎' },
        { valor: 'cafe', label: 'Café', emoji: '☕' },
        { valor: 'digestivo', label: 'Digestivo', emoji: '🥃' },
        ...custom('estrutura_menu'),
      ],
      permiteOutro: true,
    },
    {
      id: 'pao',
      bloco: 'Menu',
      texto: 'O pão para o serviço é produzido na escola ou comprado?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'escola', label: 'Produzido na escola', emoji: '🏫' },
        { valor: 'comprado', label: 'Comprado', emoji: '🛒' },
        { valor: 'nao', label: 'Sem pão', emoji: '❌' },
        ...custom('pao'),
      ],
      permiteOutro: true,
    },
    {
      id: 'bebidas',
      bloco: 'Menu',
      texto: 'O evento inclui serviço de bebidas?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'agua', label: 'Só água', emoji: '💧' },
        { valor: 'agua_vinho', label: 'Água + vinho', emoji: '🍷' },
        { valor: 'completo', label: 'Completo (água, vinho, sumos, café)', emoji: '🥂' },
        { valor: 'nao', label: 'Não inclui', emoji: '❌' },
        ...custom('bebidas'),
      ],
      permiteOutro: true,
    },
    {
      id: 'orcamento',
      bloco: 'Menu',
      texto: 'Existe orçamento definido?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'aprovado', label: 'Sim — já aprovado', emoji: '✅' },
        { valor: 'falta_criar', label: 'Não — falta criar proposta', emoji: '📝' },
        { valor: 'nao_necessario', label: 'Não é necessário', emoji: '❌' },
        ...custom('orcamento'),
      ],
    },
    // ── BLOCO D — SALA ───────────────────────────────────────────────────────
    {
      id: 'disposicao_mesas',
      bloco: 'Sala',
      texto: 'Como devem ser dispostas as mesas?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'escola', label: 'Escola (filas)', emoji: '🪑' },
        { valor: 'u', label: 'Formato U', emoji: '🔷' },
        { valor: 'banquete', label: 'Banquete (redondas)', emoji: '⭕' },
        { valor: 'cocktail', label: 'Cocktail (em pé)', emoji: '🥂' },
        { valor: 'familiar', label: 'Mesa longa (familiar)', emoji: '🏠' },
        ...custom('disposicao_mesas'),
      ],
      permiteOutro: true,
    },
    {
      id: 'loica',
      bloco: 'Sala',
      texto: 'A louça de serviço é da escola ou é necessário tratar?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'escola', label: 'Da escola', emoji: '🏫' },
        { valor: 'alugar', label: 'Alugar', emoji: '🛒' },
        { valor: 'descartavel', label: 'Descartável', emoji: '🥤' },
        { valor: 'misto', label: 'Misto', emoji: '🔄' },
        ...custom('loica'),
      ],
      permiteOutro: true,
    },
    {
      id: 'tipo_copo',
      bloco: 'Sala',
      texto: 'Que tipo de copos?',
      tipo: 'botoes',
      permiteVerDepois: true,
      condicao: r => {
        const loica = r.find(x => x.perguntaId === 'loica')?.valor;
        return loica === 'descartavel' || loica === 'misto';
      },
      opcoes: [
        { valor: 'vidro', label: 'Copos de vidro', emoji: '🥛' },
        { valor: 'plastico', label: 'Copos de plástico', emoji: '🥤' },
        { valor: 'misto', label: 'Misto (vidro + plástico)', emoji: '🔄' },
        ...custom('tipo_copo'),
      ],
      permiteOutro: true,
    },
    {
      id: 'menu_impresso',
      bloco: 'Sala',
      texto: 'O evento tem menu impresso para os convidados?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'sim', label: 'Sim', emoji: '✅' },
        { valor: 'nao', label: 'Não', emoji: '❌' },
        ...custom('menu_impresso'),
      ],
    },
    {
      id: 'lingua_menu',
      bloco: 'Sala',
      texto: 'Em que língua(s) é o menu impresso?',
      tipo: 'multi',
      permiteVerDepois: true,
      condicao: r => r.find(x => x.perguntaId === 'menu_impresso')?.valor === 'sim',
      opcoes: [
        { valor: 'pt', label: 'Português', emoji: '🇵🇹' },
        { valor: 'en', label: 'Inglês', emoji: '🇬🇧' },
        { valor: 'fr', label: 'Francês', emoji: '🇫🇷' },
        ...custom('lingua_menu'),
      ],
      permiteOutro: true,
    },
    // ── BLOCO E — COMUNICAÇÃO ────────────────────────────────────────────────
    {
      id: 'reservas',
      bloco: 'Comunicação',
      texto: 'O evento requer sistema de reservas?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'sim', label: 'Sim', emoji: '✅' },
        { valor: 'nao', label: 'Não — lista fechada', emoji: '❌' },
        ...custom('reservas'),
      ],
    },
    {
      id: 'divulgacao',
      bloco: 'Comunicação',
      texto: 'O evento é divulgado publicamente?',
      tipo: 'botoes',
      permiteVerDepois: true,
      opcoes: [
        { valor: 'sim', label: 'Sim — divulgação pública', emoji: '📢' },
        { valor: 'nao', label: 'Não — evento privado', emoji: '🔒' },
        ...custom('divulgacao'),
      ],
    },
    // ── BLOCO F — LOGÍSTICA EXTERNA (só se externo) ──────────────────────────
    {
      id: 'visita_local',
      bloco: 'Logística Externa',
      texto: 'Já foi feita uma visita prévia ao local do evento?',
      tipo: 'botoes',
      permiteVerDepois: true,
      condicao: r => r.find(x => x.perguntaId === 'local')?.valor === 'externo',
      opcoes: [
        { valor: 'sim', label: 'Sim — já visitado', emoji: '✅' },
        { valor: 'nao', label: 'Não — falta fazer', emoji: '❌' },
      ],
    },
    {
      id: 'transporte_producao',
      bloco: 'Logística Externa',
      texto: 'A comida vai quente ou fria para o local?',
      tipo: 'botoes',
      permiteVerDepois: true,
      condicao: r => r.find(x => x.perguntaId === 'local')?.valor === 'externo',
      opcoes: [
        { valor: 'quente', label: 'Vai quente (caixas térmicas)', emoji: '🔥' },
        { valor: 'fria', label: 'Vai fria (termina no local)', emoji: '❄️' },
        { valor: 'misto', label: 'Misto', emoji: '🔄' },
        ...custom('transporte_producao'),
      ],
      permiteOutro: true,
    },
    {
      id: 'transporte_alunos',
      bloco: 'Logística Externa',
      texto: 'Os alunos precisam de transporte para o local?',
      tipo: 'botoes',
      permiteVerDepois: true,
      condicao: r => r.find(x => x.perguntaId === 'local')?.valor === 'externo',
      opcoes: [
        { valor: 'sim', label: 'Sim', emoji: '🚌' },
        { valor: 'nao', label: 'Não — vão por conta própria', emoji: '❌' },
      ],
    },
  ];
}

// ── Gerar checklist com base nas respostas ────────────────────────────────────
function gerarChecklist(respostas: RespostaWizard[]): ItemChecklist[] {
  const r = (id: string) => respostas.find(x => x.perguntaId === id)?.valor || '';
  const externo = r('local') === 'externo';
  const temMenuImpresso = r('menu_impresso') === 'sim';
  const temReservas = r('reservas') === 'sim';
  const temDivulgacao = r('divulgacao') === 'sim';
  const paoComprado = r('pao') === 'comprado';
  const faltaOrcamento = r('orcamento') === 'falta_criar';
  const temProtocolo = r('protocolo') === 'sim';

  const items: ItemChecklist[] = [
    { id: 'nome_confirmado', categoria: 'Definição', texto: 'Nome e tipo de evento confirmados', obrigatorio: true, responsavel: 'Coordenadora', estado: 'pendente' },
    { id: 'data_confirmada', categoria: 'Definição', texto: 'Data e horário confirmados', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' },
    { id: 'num_pessoas', categoria: 'Definição', texto: `Número final de convidados confirmado (+10% margem = ${Math.ceil(parseInt(String(r('num_pessoas') || '0')) * 1.1)} pessoas)`, obrigatorio: true, responsavel: 'Professor', estado: 'pendente' },
    { id: 'restricoes', categoria: 'Definição', texto: 'Alergias e restrições alimentares recolhidas e comunicadas à cozinha', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' },
    // Cozinha
    { id: 'fichas_tecnicas', categoria: 'Cozinha', texto: 'Fichas técnicas criadas com capitações correctas', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' },
    { id: 'guiao_producao', categoria: 'Cozinha', texto: 'Guião de produção com timings elaborado', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' },
    { id: 'requisicao', categoria: 'Cozinha', texto: 'Requisição de ingredientes enviada', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' },
    { id: 'haccp', categoria: 'Cozinha', texto: 'Registos HACCP identificados e fichas impressas', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' },
    // Sala
    { id: 'planta_sala', categoria: 'Sala', texto: 'Planta da sala definida e comunicada', obrigatorio: true, responsavel: 'Professor Sala', estado: 'pendente' },
    { id: 'loica_contada', categoria: 'Sala', texto: 'Louça por coberto verificada e contada', obrigatorio: true, responsavel: 'Professor Sala', estado: 'pendente' },
    { id: 'toalhas', categoria: 'Sala', texto: 'Toalhas de mesa preparadas', obrigatorio: true, responsavel: 'Professor Sala', estado: 'pendente' },
    { id: 'mise_en_place_sala', categoria: 'Sala', texto: 'Mise-en-place da sala planeada', obrigatorio: true, responsavel: 'Professor Sala', estado: 'pendente' },
    { id: 'briefing', categoria: 'Sala', texto: 'Briefing da equipa realizado no dia', obrigatorio: true, responsavel: 'Chef', estado: 'pendente' },
  ];

  // Condicionais
  if (paoComprado) items.push({ id: 'pao_encomendado', categoria: 'Cozinha', texto: 'Pão encomendado ao fornecedor — data e quantidade confirmadas', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' });
  if (faltaOrcamento) items.push({ id: 'orcamento_criar', categoria: 'Gestão', texto: '⚠️ URGENTE: Elaborar proposta de orçamento (food cost + mão de obra + equipamento)', obrigatorio: true, responsavel: 'Coordenadora', estado: 'pendente' });
  if (temProtocolo) items.push({ id: 'programa_evento', categoria: 'Protocolo', texto: 'Programa do evento elaborado e aprovado', obrigatorio: true, responsavel: 'Coordenadora', estado: 'pendente' });
  if (temMenuImpresso) {
    items.push({ id: 'menu_design', categoria: 'Comunicação', texto: 'Design do menu criado', obrigatorio: true, responsavel: 'Alunos', estado: 'pendente' });
    items.push({ id: 'menu_impresso', categoria: 'Comunicação', texto: 'Menus impressos em quantidade suficiente', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
  }
  if (temReservas) items.push({ id: 'formulario_reservas', categoria: 'Comunicação', texto: 'Formulário de reservas criado e divulgado', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
  if (temDivulgacao) items.push({ id: 'cartaz', categoria: 'Comunicação', texto: 'Cartaz/flyer criado e publicado nas redes sociais', obrigatorio: true, responsavel: 'Alunos', estado: 'pendente' });
  if (externo) {
    items.push({ id: 'visita_local', categoria: 'Logística Externa', texto: 'Visita prévia ao local realizada (água, luz, gás, espaço, WC)', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
    items.push({ id: 'transporte_alunos', categoria: 'Logística Externa', texto: 'Transporte de alunos reservado', obrigatorio: true, responsavel: 'Coordenadora', estado: 'pendente' });
    items.push({ id: 'transporte_producao', categoria: 'Logística Externa', texto: 'Transporte de produção e equipamento reservado', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
    items.push({ id: 'caixas_termicas', categoria: 'Logística Externa', texto: 'Caixas térmicas preparadas e testadas', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' });
    items.push({ id: 'material_consumivel', categoria: 'Logística Externa', texto: 'Material consumível verificado: sacos de lixo, fita-cola, tesoura, película, papel cozinha, luvas, detergente', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
    items.push({ id: 'loica_servico', categoria: 'Logística Externa', texto: 'Louça de serviço para cliente separada, contada e embalada', obrigatorio: true, responsavel: 'Professor Sala', estado: 'pendente' });
    items.push({ id: 'haccp_transporte', categoria: 'Logística Externa', texto: 'Registo HACCP de temperatura de transporte preparado', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' });
  }
  // Pós-evento sempre
  items.push({ id: 'plano_limpeza', categoria: 'Pós-Evento', texto: 'Plano de limpeza e encerramento definido', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
  items.push({ id: 'sobras', categoria: 'Pós-Evento', texto: 'Destino das sobras definido (aproveitar / descartar)', obrigatorio: false, responsavel: 'Professor Cozinha', estado: 'pendente' });
  items.push({ id: 'avaliacao', categoria: 'Pós-Evento', texto: 'Reunião de avaliação pós-evento agendada', obrigatorio: false, responsavel: 'Coordenadora', estado: 'pendente' });

  return items;
}

// ── Gerar tarefas com base nas respostas ──────────────────────────────────────
function gerarTarefas(respostas: RespostaWizard[], nome: string): TarefaEvento[] {
  const tarefas: TarefaEvento[] = [
    { id: 'plano_aula', titulo: 'Plano de Aula — Cozinha', disciplina: 'Serviços de Cozinha e Pastelaria', descricao: `Planeamento e execução da produção culinária para: ${nome}`, tipo: 'cozinha', selecionada: true },
    { id: 'ficha_tecnica', titulo: 'Ficha Técnica de Produção', disciplina: 'Serviços de Cozinha e Pastelaria', descricao: 'Fichas técnicas com ingredientes, capitações, alergénios e food cost', tipo: 'cozinha', selecionada: true },
    { id: 'guiao_producao', titulo: 'Guião de Produção', disciplina: 'Serviços de Cozinha e Pastelaria', descricao: 'Guião passo a passo com timings, responsabilidades e sequência de produção', tipo: 'cozinha', selecionada: true },
    { id: 'requisicao', titulo: 'Requisição de Materiais', disciplina: 'Serviços de Cozinha e Pastelaria', descricao: 'Lista completa de ingredientes e materiais necessários para o evento', tipo: 'cozinha', selecionada: true },
    { id: 'haccp', titulo: 'Registos HACCP', disciplina: 'Tecnologia Alimentar', descricao: 'Identificação dos PCCs e preenchimento dos registos de segurança alimentar obrigatórios', tipo: 'cozinha', selecionada: true },
  ];

  const outras = respostas.find(x => x.perguntaId === 'outras_turmas')?.valor as string[] || [];

  if (outras.includes('restaurante_bar')) {
    tarefas.push({ id: 'sala_mise', titulo: 'Mise-en-Place de Sala', disciplina: 'Restaurante/Bar', descricao: 'Planeamento e execução da mise-en-place de sala para o evento', tipo: 'sala', selecionada: true });
    tarefas.push({ id: 'plano_servico', titulo: 'Plano de Serviço', disciplina: 'Restaurante/Bar', descricao: 'Definição de postos, responsabilidades e protocolo de serviço à mesa', tipo: 'sala', selecionada: true });
  }
  if (outras.includes('ingles')) {
    tarefas.push({ id: 'menu_en', titulo: 'Menu Bilingue PT/EN', disciplina: 'Inglês Técnico', descricao: `Tradução e adaptação do menu do evento "${nome}" para inglês com vocabulário gastronómico correcto`, tipo: 'interdisciplinar', selecionada: true });
  }
  if (outras.includes('gestao_controlo')) {
    tarefas.push({ id: 'orcamento', titulo: 'Orçamento e Food Cost', disciplina: 'Gestão e Controlo', descricao: 'Elaboração do orçamento do evento, cálculo do food cost e análise de resultados', tipo: 'interdisciplinar', selecionada: true });
  }
  if (outras.includes('area_projeto') || outras.includes('portugues')) {
    tarefas.push({ id: 'cartaz', titulo: 'Cartaz e Comunicação do Evento', disciplina: outras.includes('area_projeto') ? 'Área de Projecto' : 'Português', descricao: `Criação do cartaz, texto de divulgação e material de comunicação para o evento "${nome}"`, tipo: 'comunicacao', selecionada: true });
  }
  if (outras.includes('matematica')) {
    tarefas.push({ id: 'capitacoes', titulo: 'Cálculo de Capitações', disciplina: 'Matemática Aplicada', descricao: `Cálculo de capitações para o número de convidados do evento, escalonamento de receitas e análise de proporções`, tipo: 'interdisciplinar', selecionada: true });
  }
  if (outras.includes('area_integracao')) {
    tarefas.push({ id: 'historia_pratos', titulo: 'Investigação — História dos Pratos', disciplina: 'Área de Integração', descricao: `Investigação e apresentação da história e contexto cultural dos pratos do evento "${nome}"`, tipo: 'interdisciplinar', selecionada: true });
  }
  if (outras.includes('turismo')) {
    tarefas.push({ id: 'roteiro', titulo: 'Roteiro Gastronómico', disciplina: 'Turismo', descricao: 'Criação de um roteiro gastronómico associado ao tema do evento para os convidados', tipo: 'interdisciplinar', selecionada: true });
  }

  return tarefas;
}

// ── Componente Principal ───────────────────────────────────────────────────────
export function EventosWizard({ turmaId, nomeProfessor }: { turmaId: string; nomeProfessor?: string }) {
  const [estado, setEstado] = useState<EstadoWizard>('inicio');
  const [eventos, setEventos] = useState<Evento[]>(loadEventos);
  const [opcoesCustom, setOpcoesCustom] = useState<Record<string, string[]>>(loadOpcoesCustom);
  const [respostas, setRespostas] = useState<RespostaWizard[]>([]);
  const [indicePergunta, setIndicePergunta] = useState(0);
  const [outroTexto, setOutroTexto] = useState('');
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [textoInput, setTextoInput] = useState('');
  const [eventoAtual, setEventoAtual] = useState<Evento | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [msg, setMsg] = useState('');
  const [verEventos, setVerEventos] = useState(false);

  const perguntas = getPerguntas(opcoesCustom).filter(p => !p.condicao || p.condicao(respostas));
  const perguntaAtual = perguntas[indicePergunta];

  function salvarEventos(ev: Evento[]) { setEventos(ev); saveEventos(ev); }

  function responder(valor: string | string[], outro?: string) {
    if (!perguntaAtual) return;

    // Guardar opção custom
    if (outro && perguntaAtual.permiteOutro) {
      const novas = { ...opcoesCustom };
      novas[perguntaAtual.id] = [...(novas[perguntaAtual.id] || []), outro].filter((v, i, a) => a.indexOf(v) === i);
      setOpcoesCustom(novas);
      saveOpcoesCustom(novas);
    }

    const novasRespostas = respostas.filter(r => r.perguntaId !== perguntaAtual.id);
    novasRespostas.push({ perguntaId: perguntaAtual.id, valor, outro });
    setRespostas(novasRespostas);
    setOutroTexto('');
    setMultiSel([]);
    setTextoInput('');

    // Avançar
    const proximas = getPerguntas(opcoesCustom).filter(p => !p.condicao || p.condicao(novasRespostas));
    if (indicePergunta + 1 < proximas.length) {
      setIndicePergunta(indicePergunta + 1);
    } else {
      // Concluído — gerar evento
      const nome = novasRespostas.find(r => r.perguntaId === 'nome')?.valor as string || 'Evento';
      const ev: Evento = {
        id: `ev-${Date.now()}`,
        nome,
        turmaId,
        respostas: novasRespostas,
        checklist: gerarChecklist(novasRespostas),
        tarefas: gerarTarefas(novasRespostas, nome),
        publicado: false,
        criadoEm: new Date().toISOString(),
      };
      setEventoAtual(ev);
      salvarEventos([ev, ...eventos]);
      setEstado('checklist');
    }
  }

  async function publicar() {
    if (!eventoAtual) return;
    setPublicando(true);
    setMsg('A publicar no Classroom...');
    try {
      const tarefasSel = eventoAtual.tarefas.filter(t => t.selecionada);
      const res = await publicarNoClassroom('evento', turmaId, {
        nomeEvento: eventoAtual.nome,
        data: eventoAtual.respostas.find(r => r.perguntaId === 'data')?.valor || '',
        tarefas: tarefasSel,
        visibilidade: 'cozinha',
      });
      if (res.ok) {
        const ev2 = eventos.map(e => e.id === eventoAtual.id ? { ...e, publicado: true } : e);
        salvarEventos(ev2);
        setEventoAtual(e => e ? { ...e, publicado: true } : e);
        setMsg('✅ Evento publicado no Classroom!');
        setEstado('concluido');
      } else {
        setMsg('❌ Erro: ' + (res.erro || 'erro desconhecido'));
      }
    } catch (err) {
      setMsg('❌ Erro de ligação: ' + String(err));
    }
    setPublicando(false);
  }

  // ── Estilos ─────────────────────────────────────────────────────────────────
  const COR = { roxo: '#6d28d9', roxoClaro: '#ede9fe', verde: '#059669', verdeClaro: '#d1fae5', laranja: '#ea580c', laranjaClaro: '#ffedd5', cinza: '#6b7280', cinzaClaro: '#f3f4f6' };
  const btnPrimario = (cor = COR.roxo): React.CSSProperties => ({ padding: '14px 24px', borderRadius: 12, border: 'none', background: cor, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Arial, sans-serif', transition: 'opacity 0.15s' });
  const btnSecundario: React.CSSProperties = { padding: '12px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: COR.cinza, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Arial, sans-serif' };

  // ── RENDER INÍCIO ────────────────────────────────────────────────────────────
  if (estado === 'inicio') return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: COR.roxo, margin: '0 0 8px' }}>Eventos Pedagógicos</h2>
        <p style={{ fontSize: 15, color: COR.cinza, margin: '0 0 32px' }}>{turmaId} — planear, organizar e publicar</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button style={btnPrimario()} onClick={() => { setEstado('wizard'); setIndicePergunta(0); setRespostas([]); }}>
            + Criar Novo Evento
          </button>
          {eventos.filter(e => e.turmaId === turmaId).length > 0 && (
            <button style={btnSecundario} onClick={() => setVerEventos(!verEventos)}>
              📋 Ver eventos anteriores ({eventos.filter(e => e.turmaId === turmaId).length})
            </button>
          )}
        </div>
      </div>
      {verEventos && (
        <div style={{ marginTop: 24 }}>
          {eventos.filter(e => e.turmaId === turmaId).map(ev => (
            <div key={ev.id} onClick={() => { setEventoAtual(ev); setEstado('checklist'); }}
              style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, border: `2px solid ${ev.publicado ? COR.verde : COR.roxo}`, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1714' }}>{ev.nome}</div>
              <div style={{ fontSize: 13, color: COR.cinza, marginTop: 4 }}>
                {ev.checklist.filter(c => c.estado === 'feito').length}/{ev.checklist.length} itens concluídos
                {ev.publicado ? ' · ✅ Publicado no Classroom' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── RENDER WIZARD ────────────────────────────────────────────────────────────
  if (estado === 'wizard' && perguntaAtual) {
    const progresso = Math.round((indicePergunta / perguntas.length) * 100);
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Arial, sans-serif' }}>
        {/* Progresso */}
        <div style={{ width: '100%', maxWidth: 560, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: COR.cinza }}>
            <span>{perguntaAtual.bloco}</span>
            <span>{indicePergunta + 1} / {perguntas.length}</span>
          </div>
          <div style={{ height: 6, background: COR.cinzaClaro, borderRadius: 99 }}>
            <div style={{ height: '100%', width: `${progresso}%`, background: COR.roxo, borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Pergunta */}
        <div style={{ width: '100%', maxWidth: 560, textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a1714', margin: 0 }}>{perguntaAtual.texto}</h2>
        </div>

        {/* Respostas — BOTÕES */}
        {perguntaAtual.tipo === 'botoes' && (
          <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(perguntaAtual.opcoes || []).map(op => (
              <button key={op.valor} style={{ ...btnPrimario('#fff'), color: '#1a1714', border: '1.5px solid #e5e7eb', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 15 }}
                onClick={() => responder(op.valor)}>
                {op.emoji && <span style={{ fontSize: 20 }}>{op.emoji}</span>}
                {op.label}
              </button>
            ))}
            {/* Outro */}
            {perguntaAtual.permiteOutro && (
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, fontFamily: 'Arial' }} placeholder="Outro — escreve aqui..." value={outroTexto} onChange={e => setOutroTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && outroTexto && responder(outroTexto, outroTexto)} />
                {outroTexto && <button style={btnPrimario()} onClick={() => responder(outroTexto, outroTexto)}>→</button>}
              </div>
            )}
            {/* Ver mais tarde */}
            {perguntaAtual.permiteVerDepois && (
              <button style={{ ...btnSecundario, textAlign: 'center', color: COR.cinza }} onClick={() => responder('ver_depois')}>
                ❓ Ver mais tarde
              </button>
            )}
          </div>
        )}

        {/* Respostas — MULTI */}
        {perguntaAtual.tipo === 'multi' && (
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(perguntaAtual.opcoes || []).map(op => {
                const sel = multiSel.includes(op.valor);
                return (
                  <button key={op.valor} style={{ ...btnPrimario(sel ? COR.roxo : '#fff'), color: sel ? '#fff' : '#1a1714', border: `1.5px solid ${sel ? COR.roxo : '#e5e7eb'}`, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}
                    onClick={() => setMultiSel(s => s.includes(op.valor) ? s.filter(x => x !== op.valor) : [...s, op.valor])}>
                    {op.emoji && <span style={{ fontSize: 18 }}>{op.emoji}</span>}
                    {op.label}
                    {sel && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </button>
                );
              })}
              {perguntaAtual.permiteOutro && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, fontFamily: 'Arial' }} placeholder="Outro..." value={outroTexto} onChange={e => setOutroTexto(e.target.value)} />
                  {outroTexto && <button style={btnPrimario()} onClick={() => { setMultiSel(s => [...s, outroTexto]); setOutroTexto(''); }}>+</button>}
                </div>
              )}
            </div>
            <button style={{ ...btnPrimario(), width: '100%' }} onClick={() => responder(multiSel.length > 0 ? multiSel : ['nenhuma'])}>
              Confirmar →
            </button>
            {perguntaAtual.permiteVerDepois && (
              <button style={{ ...btnSecundario, width: '100%', marginTop: 8 }} onClick={() => responder('ver_depois')}>❓ Ver mais tarde</button>
            )}
          </div>
        )}

        {/* Respostas — TEXTO / NÚMERO */}
        {(perguntaAtual.tipo === 'texto' || perguntaAtual.tipo === 'numero') && (
          <div style={{ width: '100%', maxWidth: 560 }}>
            <input type={perguntaAtual.tipo === 'numero' ? 'number' : 'text'} style={{ width: '100%', padding: '16px 18px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 18, fontFamily: 'Arial', boxSizing: 'border-box', marginBottom: 12 }} placeholder={perguntaAtual.tipo === 'numero' ? 'Número de pessoas...' : 'Escreve aqui...'} value={textoInput} onChange={e => setTextoInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && textoInput && responder(textoInput)} autoFocus />
            <button style={{ ...btnPrimario(), width: '100%' }} onClick={() => textoInput && responder(textoInput)} disabled={!textoInput}>
              Confirmar →
            </button>
          </div>
        )}

        {/* Voltar */}
        {indicePergunta > 0 && (
          <button style={{ ...btnSecundario, marginTop: 20 }} onClick={() => setIndicePergunta(i => i - 1)}>← Voltar</button>
        )}
      </div>
    );
  }

  // ── RENDER CHECKLIST ─────────────────────────────────────────────────────────
  if ((estado === 'checklist' || estado === 'concluido') && eventoAtual) {
    const categorias = [...new Set(eventoAtual.checklist.map(c => c.categoria))];
    const feitos = eventoAtual.checklist.filter(c => c.estado === 'feito').length;
    const total = eventoAtual.checklist.length;

    function toggleItem(id: string) {
      const novaChecklist = eventoAtual!.checklist.map(c =>
        c.id === id ? { ...c, estado: c.estado === 'feito' ? 'pendente' : 'feito' as any } : c
      );
      const evAtualizado = { ...eventoAtual!, checklist: novaChecklist };
      setEventoAtual(evAtualizado);
      salvarEventos(eventos.map((e: Evento) => e.id === evAtualizado.id ? evAtualizado : e));
    }

    function toggleTarefa(id: string) {
      const novasTarefas = eventoAtual!.tarefas.map(t => t.id === id ? { ...t, selecionada: !t.selecionada } : t);
      const evAtualizado = { ...eventoAtual!, tarefas: novasTarefas };
      setEventoAtual(evAtualizado);
      salvarEventos(eventos.map(e => e.id === evAtualizado.id ? evAtualizado : e));
    }

    return (
      <div style={{ padding: '16px', maxWidth: 640, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button style={btnSecundario} onClick={() => setEstado('inicio')}>←</button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a1714' }}>{eventoAtual.nome}</h2>
            <div style={{ fontSize: 13, color: COR.cinza }}>{feitos}/{total} itens concluídos</div>
          </div>
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: eventoAtual.publicado ? COR.verdeClaro : COR.roxoClaro, color: eventoAtual.publicado ? COR.verde : COR.roxo }}>
            {eventoAtual.publicado ? '✅ Publicado' : '⏳ Rascunho'}
          </span>
        </div>

        {/* Barra de progresso */}
        <div style={{ height: 8, background: COR.cinzaClaro, borderRadius: 99, marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${Math.round((feitos / total) * 100)}%`, background: COR.verde, borderRadius: 99, transition: 'width 0.3s' }} />
        </div>

        {msg && <div style={{ padding: '10px 16px', borderRadius: 8, background: msg.startsWith('❌') ? '#fee2e2' : '#d1fae5', color: msg.startsWith('❌') ? '#991b1b' : '#065f46', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{msg}</div>}

        {/* Checklist por categoria */}
        {categorias.map(cat => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: COR.cinza, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat}</div>
            {eventoAtual.checklist.filter(c => c.categoria === cat).map(item => (
              <div key={item.id} onClick={() => toggleItem(item.id)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${item.estado === 'feito' ? COR.verde : '#e5e7eb'}`, background: item.estado === 'feito' ? COR.verdeClaro + '44' : '#fff', cursor: 'pointer', marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.estado === 'feito' ? COR.verde : '#d1d5db'}`, background: item.estado === 'feito' ? COR.verde : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {item.estado === 'feito' && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: item.estado === 'feito' ? COR.verde : '#1a1714', textDecoration: item.estado === 'feito' ? 'line-through' : 'none' }}>{item.texto}</div>
                  <div style={{ fontSize: 11, color: COR.cinza, marginTop: 2 }}>{item.responsavel}</div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Tarefas para Classroom */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: COR.cinza, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tarefas para o Classroom</div>
          <p style={{ fontSize: 12, color: COR.cinza, margin: '0 0 10px' }}>Selecciona as tarefas a publicar no Google Classroom</p>
          {eventoAtual.tarefas.map(t => (
            <div key={t.id} onClick={() => toggleTarefa(t.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${t.selecionada ? COR.roxo : '#e5e7eb'}`, background: t.selecionada ? COR.roxoClaro + '44' : '#fff', cursor: 'pointer', marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${t.selecionada ? COR.roxo : '#d1d5db'}`, background: t.selecionada ? COR.roxo : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                {t.selecionada && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1714' }}>{t.titulo}</div>
                <div style={{ fontSize: 11, color: COR.roxo, fontWeight: 600 }}>{t.disciplina}</div>
                <div style={{ fontSize: 12, color: COR.cinza }}>{t.descricao}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Publicar */}
        {!eventoAtual.publicado && (
          <button style={{ ...btnPrimario(COR.verde), width: '100%', padding: '16px', fontSize: 16, marginBottom: 8 }}
            onClick={publicar} disabled={publicando}>
            {publicando ? '⏳ A publicar...' : '📢 Publicar no Google Classroom'}
          </button>
        )}
        {eventoAtual.publicado && (
          <div style={{ padding: 16, borderRadius: 12, background: COR.verdeClaro, textAlign: 'center', color: COR.verde, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
            ✅ Evento publicado no Classroom com sucesso!
          </div>
        )}
        <button style={{ ...btnSecundario, width: '100%' }} onClick={() => setEstado('inicio')}>← Voltar à lista</button>
      </div>
    );
  }

  return null;
}
