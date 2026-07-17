import React, { useState } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { publicarNoClassroom, getPlanosAulaPorTurma, addOrUpdatePlanoAula, getFichasProducao, getRequisicaoPorPlano } from '../backend';
import { PlanoAula as TPlanoAula } from '../types';

// ══════════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════════

type TipoMomento = 'pequeno_almoco' | 'coffee_break_manha' | 'almoco' | 'coffee_break_tarde' | 'jantar' | 'cocktail';

interface MomentoRefeicao {
  id: string;
  tipo: TipoMomento;
  numPessoas: number;
  restricoes: string[];
  tipoServico: string;
  nivelMenu: string;
  proteina: string;
  tipoCozinha: string;
  estruturaMenu: string[];
  bebidas: string;
  pao: string;
  menuImpresso: boolean;
  linguasMenu: string[];
  notasExtra: string;
}

interface DiaEvento {
  id: string;
  data: string; // YYYY-MM-DD
  momentos: MomentoRefeicao[];
  horaInicio?: string; // HH:mm — para calcular pontos de disponibilidade (noite = 19h+)
  horaFim?: string;
}

interface ItemChecklist {
  id: string;
  categoria: string;
  texto: string;
  obrigatorio: boolean;
  responsavel: string;
  estado: 'pendente' | 'feito';
}

interface TarefaEvento {
  id: string;
  titulo: string;
  disciplina: string;
  descricao: string;
  selecionada: boolean;
}

export interface Evento {
  id: string;
  numero: number;
  nome: string;
  turmaId: string;
  // Eventos extracurriculares (fora de horas letivas/aulas práticas) — ex:
  // concursos, visitas de estudo fora do horário normal — recebem pontos
  // de disponibilidade extra: fim de semana e/ou noite (19h+) pesam mais.
  extracurricular?: boolean;
  local: string;
  localOutro?: string;
  tipoPublico: string;
  outrasTurmas: string[];
  protocolo: boolean;
  tema: string;
  reservas: boolean;
  divulgacao: boolean;
  // Logística externa
  visita: string;
  transporteAlunos: boolean;
  transporteProducao: string;
  orcamento: string;
  disposicaoMesas: string;
  loica: string;
  dias: DiaEvento[];
  checklist: ItemChecklist[];
  tarefas: TarefaEvento[];
  publicado: boolean;
  criadoEm: string;
}

// ══════════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════════
const STORAGE_KEY = 'ecl_eventos_v3';
export function loadEventos(): Evento[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveEventos(ev: Evento[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(ev)); }

// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DOS MOMENTOS
// ══════════════════════════════════════════════════════════════════
const MOMENTOS_CONFIG: Record<TipoMomento, { label: string; emoji: string; cor: string }> = {
  pequeno_almoco: { label: 'Pequeno-almoço', emoji: '🌅', cor: '#f59e0b' },
  coffee_break_manha: { label: 'Coffee Break Manhã', emoji: '☕', cor: '#8b5cf6' },
  almoco: { label: 'Almoço', emoji: '🍽️', cor: '#059669' },
  coffee_break_tarde: { label: 'Coffee Break Tarde', emoji: '🍪', cor: '#8b5cf6' },
  jantar: { label: 'Jantar', emoji: '🌙', cor: '#1d4ed8' },
  cocktail: { label: 'Cocktail / Recepção', emoji: '🥂', cor: '#db2777' },
};

const ORDEM_MOMENTOS: TipoMomento[] = [
  'pequeno_almoco', 'coffee_break_manha', 'almoco', 'coffee_break_tarde', 'jantar', 'cocktail'
];

// ══════════════════════════════════════════════════════════════════
// CÁLCULO DE LOUÇA POR MOMENTO
// ══════════════════════════════════════════════════════════════════
interface ItemLouca { item: string; quantidade: number; nota?: string }

function calcularLouca(momento: MomentoRefeicao): ItemLouca[] {
  const n = Math.ceil(momento.numPessoas * 1.1); // +10% margem
  const t = momento.tipo;
  const items: ItemLouca[] = [];

  const add = (item: string, qty: number, nota?: string) => items.push({ item, quantidade: qty, nota });

  // Água — sempre
  add('Copos de água', n);

  if (t === 'almoco' || t === 'jantar') {
    add('Pratos de sopa', n);
    add('Colheres de sopa', n);
    add('Pratos rasos', n);
    add('Pratos de sobremesa', n);
    add('Garfos', n * 2, 'entrada + prato');
    add('Facas', n * 2, 'entrada + prato');
    add('Colheres de sobremesa', n);
    add('Guardanapos de pano', n);
    if (momento.bebidas === 'agua_vinho' || momento.bebidas === 'completo') {
      add('Copos de vinho', n);
    }
    if (momento.bebidas === 'completo') {
      add('Chávenas de café + pires', n);
      add('Colheres de café', n);
    }
    if (momento.estruturaMenu.includes('entrada')) {
      add('Pratos de entrada', n);
    }
  }

  if (t === 'pequeno_almoco') {
    add('Chávenas de café/leite + pires', n);
    add('Colheres de chá', n);
    add('Pratos de sobremesa (pão/manteiga)', n);
    add('Facas de manteiga', n);
    add('Guardanapos de papel', n);
    add('Copos de sumo', n);
  }

  if (t === 'coffee_break_manha' || t === 'coffee_break_tarde') {
    add('Chávenas de café + pires', n);
    add('Colheres de café', n);
    add('Pratos de pastelaria', n);
    add('Guardanapos de papel', n * 2, 'uso múltiplo');
    add('Copos de sumo/água', n);
  }

  if (t === 'cocktail') {
    add('Copos de champagne/prosecco', n);
    add('Guardanapos de papel (cóctel)', n * 3, 'uso múltiplo');
    add('Palitos/pegadores', n * 5);
  }

  return items;
}

// ══════════════════════════════════════════════════════════════════
// GERAR CHECKLIST
// ══════════════════════════════════════════════════════════════════
function gerarChecklist(evento: Evento): ItemChecklist[] {
  const ext = evento.local === 'externo';
  const items: ItemChecklist[] = [
    { id: 'data_conf', categoria: 'Definição', texto: 'Data(s) e horários confirmados com todas as partes', obrigatorio: true, responsavel: 'Coordenadora', estado: 'pendente' },
    { id: 'num_conf', categoria: 'Definição', texto: 'Número final de participantes confirmado por dia/momento', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' },
    { id: 'restricoes_conf', categoria: 'Definição', texto: 'Alergias e restrições alimentares recolhidas e comunicadas à cozinha', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' },
    { id: 'fichas', categoria: 'Cozinha', texto: 'Fichas técnicas criadas para todos os momentos', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' },
    { id: 'guiao', categoria: 'Cozinha', texto: 'Guião de produção com timings por momento', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' },
    { id: 'req', categoria: 'Cozinha', texto: 'Requisição de ingredientes enviada (total do evento)', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' },
    { id: 'haccp', categoria: 'Cozinha', texto: 'Registos HACCP identificados para cada momento de produção', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' },
    { id: 'loica', categoria: 'Sala', texto: 'Louça contada e verificada por coberto e por momento', obrigatorio: true, responsavel: 'Professor Sala', estado: 'pendente' },
    { id: 'sala_layout', categoria: 'Sala', texto: 'Planta de sala definida', obrigatorio: true, responsavel: 'Professor Sala', estado: 'pendente' },
    { id: 'toalhas', categoria: 'Sala', texto: 'Toalhas e roupas de mesa preparadas', obrigatorio: true, responsavel: 'Professor Sala', estado: 'pendente' },
    { id: 'briefing', categoria: 'Sala', texto: 'Briefing da equipa realizado antes de cada momento', obrigatorio: true, responsavel: 'Chef', estado: 'pendente' },
    { id: 'limpeza', categoria: 'Pós-Evento', texto: 'Plano de limpeza e encerramento definido', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' },
    { id: 'sobras', categoria: 'Pós-Evento', texto: 'Destino das sobras definido', obrigatorio: false, responsavel: 'Professor Cozinha', estado: 'pendente' },
    { id: 'avaliacao', categoria: 'Pós-Evento', texto: 'Reunião de avaliação pós-evento agendada', obrigatorio: false, responsavel: 'Coordenadora', estado: 'pendente' },
  ];

  if (evento.protocolo) items.push({ id: 'programa', categoria: 'Protocolo', texto: 'Programa do evento elaborado e aprovado', obrigatorio: true, responsavel: 'Coordenadora', estado: 'pendente' });
  if (evento.reservas) items.push({ id: 'form_reservas', categoria: 'Comunicação', texto: 'Formulário de reservas criado e divulgado', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
  if (evento.divulgacao) items.push({ id: 'cartaz', categoria: 'Comunicação', texto: 'Cartaz/flyer criado e publicado', obrigatorio: true, responsavel: 'Alunos', estado: 'pendente' });
  if (evento.orcamento === 'falta_criar') items.push({ id: 'orc', categoria: 'Gestão', texto: '⚠️ URGENTE: Elaborar proposta de orçamento', obrigatorio: true, responsavel: 'Coordenadora', estado: 'pendente' });

  const temMenuImpresso = evento.dias.some(d => d.momentos.some(m => m.menuImpresso));
  if (temMenuImpresso) {
    items.push({ id: 'menu_design', categoria: 'Comunicação', texto: 'Design do menu impresso criado', obrigatorio: true, responsavel: 'Alunos', estado: 'pendente' });
    items.push({ id: 'menu_print', categoria: 'Comunicação', texto: 'Menus impressos em quantidade suficiente', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
  }

  if (ext) {
    items.push({ id: 'visita', categoria: 'Logística Externa', texto: 'Visita prévia ao local realizada (água, luz, gás, espaço, WC)', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
    items.push({ id: 'transp_alunos', categoria: 'Logística Externa', texto: 'Transporte de alunos reservado', obrigatorio: true, responsavel: 'Coordenadora', estado: 'pendente' });
    items.push({ id: 'transp_prod', categoria: 'Logística Externa', texto: 'Transporte de produção reservado', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
    items.push({ id: 'caixas', categoria: 'Logística Externa', texto: 'Caixas térmicas preparadas e testadas', obrigatorio: true, responsavel: 'Professor Cozinha', estado: 'pendente' });
    items.push({ id: 'material_cons', categoria: 'Logística Externa', texto: 'Material consumível verificado: sacos de lixo, película, luvas, papel cozinha, detergente', obrigatorio: true, responsavel: 'Professor', estado: 'pendente' });
  }

  return items;
}

// ══════════════════════════════════════════════════════════════════
// GERAR TAREFAS CLASSROOM
// ══════════════════════════════════════════════════════════════════
function gerarTarefas(evento: Evento): TarefaEvento[] {
  const tarefas: TarefaEvento[] = [
    { id: 'plano_aula', titulo: 'Plano de Aula — Evento', disciplina: 'Serviços de Cozinha e Pastelaria', descricao: `Planeamento e execução da produção culinária para: ${evento.nome}`, selecionada: true },
    { id: 'ficha_tecnica', titulo: 'Fichas Técnicas de Produção', disciplina: 'Serviços de Cozinha e Pastelaria', descricao: 'Fichas técnicas com ingredientes, capitações, alergénios e food cost', selecionada: true },
    { id: 'guiao', titulo: 'Guião de Produção', disciplina: 'Serviços de Cozinha e Pastelaria', descricao: 'Guião com timings, responsabilidades e sequência de produção por momento', selecionada: true },
    { id: 'req', titulo: 'Requisição de Materiais', disciplina: 'Serviços de Cozinha e Pastelaria', descricao: 'Lista completa de ingredientes e materiais para todos os momentos do evento', selecionada: true },
    { id: 'haccp', titulo: 'Registos HACCP', disciplina: 'Tecnologia Alimentar', descricao: 'Identificação dos PCCs e registos de segurança alimentar por momento', selecionada: true },
  ];

  if (evento.outrasTurmas.includes('restaurante_bar')) {
    tarefas.push({ id: 'sala', titulo: 'Mise-en-Place de Sala + Plano de Serviço', disciplina: 'Restaurante/Bar', descricao: 'Planeamento e execução da mise-en-place e protocolo de serviço', selecionada: true });
  }
  if (evento.outrasTurmas.includes('ingles')) {
    tarefas.push({ id: 'menu_en', titulo: 'Menu Bilingue PT/EN', disciplina: 'Inglês Técnico', descricao: `Tradução do menu do evento "${evento.nome}" para inglês`, selecionada: true });
  }
  if (evento.outrasTurmas.includes('gestao_controlo')) {
    tarefas.push({ id: 'orc', titulo: 'Orçamento e Food Cost', disciplina: 'Gestão e Controlo', descricao: 'Orçamento do evento, cálculo do food cost e análise de resultados', selecionada: true });
  }
  if (evento.outrasTurmas.includes('area_projeto') || evento.outrasTurmas.includes('portugues')) {
    tarefas.push({ id: 'cartaz', titulo: 'Cartaz e Comunicação', disciplina: evento.outrasTurmas.includes('area_projeto') ? 'Área de Projecto' : 'Português', descricao: `Cartaz e material de comunicação para o evento "${evento.nome}"`, selecionada: true });
  }
  if (evento.outrasTurmas.includes('matematica')) {
    tarefas.push({ id: 'cap', titulo: 'Cálculo de Capitações', disciplina: 'Matemática Aplicada', descricao: 'Capitações por momento e escalonamento de receitas', selecionada: true });
  }

  return tarefas;
}

// ══════════════════════════════════════════════════════════════════
// HTML DO RELATÓRIO PDF
// ══════════════════════════════════════════════════════════════════
function escapeHtml(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function gerarRelatorioHTML(evento: Evento, paraClassroom = false): string {
  const hoje = new Date().toLocaleDateString('pt-PT');
  const criado = fmtData(evento.criadoEm);
  const feitos = evento.checklist.filter(c => c.estado === 'feito').length;
  const total = evento.checklist.length;

  const linhasDias = evento.dias.map(d => {
    const dataFmt = d.data ? fmtData(d.data + 'T12:00:00') : '—';
    const linhasMomentos = d.momentos.map(m => {
      const cfg = MOMENTOS_CONFIG[m.tipo];
      const louca = calcularLouca(m);
      const loucaStr = louca.map(l => `${l.item}: ${l.quantidade}${l.nota ? ' (' + l.nota + ')' : ''}`).join(', ');
      return `
        <tr class="bloco"><td colspan="2">${cfg.emoji} ${cfg.label} — ${m.numPessoas} pessoas (+10% = ${Math.ceil(m.numPessoas * 1.1)})</td></tr>
        <tr><td class="pergunta">Restrições alimentares</td><td>${escapeHtml(m.restricoes.join(', ') || 'Nenhuma')}</td></tr>
        <tr><td class="pergunta">Tipo de serviço</td><td>${escapeHtml(m.tipoServico || '—')}</td></tr>
        <tr><td class="pergunta">Nível do menu</td><td>${escapeHtml(m.nivelMenu || '—')}</td></tr>
        <tr><td class="pergunta">Proteína</td><td>${escapeHtml(m.proteina || '—')}</td></tr>
        <tr><td class="pergunta">Estilo de cozinha</td><td>${escapeHtml(m.tipoCozinha || '—')}</td></tr>
        <tr><td class="pergunta">Estrutura do menu</td><td>${escapeHtml(m.estruturaMenu.join(', ') || '—')}</td></tr>
        <tr><td class="pergunta">Bebidas</td><td>${escapeHtml(m.bebidas || '—')}</td></tr>
        <tr><td class="pergunta">Pão</td><td>${escapeHtml(m.pao || '—')}</td></tr>
        <tr><td class="pergunta">Menu impresso</td><td>${m.menuImpresso ? 'Sim — ' + m.linguasMenu.join(', ') : 'Não'}</td></tr>
        <tr><td class="pergunta">Louça necessária</td><td style="font-size:10px">${escapeHtml(loucaStr)}</td></tr>
        ${m.notasExtra ? `<tr><td class="pergunta">Notas</td><td>${escapeHtml(m.notasExtra)}</td></tr>` : ''}
      `;
    }).join('');
    return `<tr class="dia"><td colspan="2">📅 ${dataFmt}</td></tr>${linhasMomentos}`;
  }).join('');

  const categorias = [...new Set(evento.checklist.map(c => c.categoria))];
  const linhasChecklist = categorias.map(cat => `
    <tr class="bloco"><td colspan="3">${escapeHtml(cat)}</td></tr>
    ${evento.checklist.filter(c => c.categoria === cat).map(i => `
      <tr>
        <td class="check">${i.estado === 'feito' ? '☑' : '☐'}</td>
        <td>${escapeHtml(i.texto)}</td>
        <td class="resp">${escapeHtml(i.responsavel)}</td>
      </tr>`).join('')}
  `).join('');

  const tarefasSel = evento.tarefas.filter(t => t.selecionada);
  const linhasTarefas = tarefasSel.map(t => `
    <tr>
      <td><strong>${escapeHtml(t.titulo)}</strong><br><span style="font-size:10px;color:#6b7280">${escapeHtml(t.descricao)}</span></td>
      <td class="resp">${escapeHtml(t.disciplina)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
<title>Relatório — ${escapeHtml(evento.nome)}</title>
<style>
@page{size:A4;margin:18mm 15mm}
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#1a1714;line-height:1.45;margin:0}
.cab{border-bottom:3px solid #6d28d9;padding-bottom:10px;margin-bottom:14px}
.cab h1{font-size:19px;margin:0 0 2px;color:#6d28d9}
.cab .sub{font-size:11px;color:#6b7280}
table.meta td{font-size:11px;padding:0 20px 6px 0;border:none;white-space:nowrap}
table.meta strong{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280}
h2{font-size:12px;color:#6d28d9;border-bottom:1px solid #e5e7eb;padding-bottom:3px;margin:18px 0 7px}
table.dados{width:100%;border-collapse:collapse}
table.dados td{padding:4px 7px;border-bottom:1px solid #f3f4f6;vertical-align:top}
tr.bloco td{background:#ede9fe;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#5b21b6;padding:4px 7px}
tr.dia td{background:#1a1714;color:#fff;font-weight:700;font-size:11px;padding:5px 7px}
td.pergunta{width:45%;color:#374151}
td.check{width:20px;font-size:13px;text-align:center}
td.resp{width:25%;color:#6b7280;font-size:10px}
table.ass{width:100%;border-collapse:separate;border-spacing:40px 0;margin-top:32px}
table.ass td{width:50%;text-align:center;font-size:10px;border:none;padding:0}
.linha{border-top:1px solid #1a1714;margin-bottom:4px;padding-top:4px}
table.rod{width:100%;border-collapse:collapse;margin-top:20px;border-top:1px solid #e5e7eb}
table.rod td{border:none;padding-top:8px;font-size:9px;color:#9ca3af}
table.rod td.dir{text-align:right}
.estado-pub{display:inline-block;padding:2px 8px;border-radius:10px;font-weight:700;font-size:10px}
.pub-sim{background:#d1fae5;color:#059669}.pub-nao{background:#ede9fe;color:#6d28d9}
@media print{.no-print{display:none}}
</style></head><body>
${paraClassroom ? '' : `<div class="no-print" style="background:#ede9fe;padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:12px">
💡 Para guardar como PDF: no menu de impressão escolhe <strong>"Guardar como PDF"</strong>.</div>`}
<div class="cab"><h1>Relatório de Evento Pedagógico</h1>
<div class="sub">Escola de Comércio de Lisboa · Técnico/a de Cozinha e Restauração (811RA144)</div></div>
<table class="meta"><tr>
<td><strong>Evento</strong>${escapeHtml(evento.nome)}</td>
<td><strong>Turma</strong>${escapeHtml(evento.turmaId)}</td>
<td><strong>Local</strong>${escapeHtml(evento.local === 'externo' ? 'Externo' : 'Interno')}</td>
<td><strong>Dias</strong>${evento.dias.length}</td>
<td><strong>Criado em</strong>${criado}</td>
<td><strong>Progresso</strong>${feitos}/${total} itens</td>
<td><strong>Classroom</strong><span class="estado-pub ${evento.publicado ? 'pub-sim' : 'pub-nao'}">${evento.publicado ? '✓ Publicado' : 'Rascunho'}</span></td>
</tr></table>
<h2>1. Programa do Evento — Dias e Momentos</h2>
<table class="dados">${linhasDias}</table>
<h2>2. Checklist de Organização</h2>
<table class="dados">${linhasChecklist}</table>
<h2>3. Tarefas Publicadas no Classroom</h2>
<table class="dados">${linhasTarefas}</table>
<table class="ass"><tr>
<td><div class="linha"></div>Professor(a) Responsável</td>
<td><div class="linha"></div>Coordenadora</td>
</tr></table>
<table class="rod"><tr><td>Avaliação ECL · Eventos Pedagógicos</td><td class="dir">Gerado em ${hoje}</td></tr></table>
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════════════════════════════
function defaultMomento(tipo: TipoMomento, numPessoas = 20): MomentoRefeicao {
  const isRefeicao = tipo === 'almoco' || tipo === 'jantar';
  return {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tipo,
    numPessoas,
    restricoes: [],
    tipoServico: isRefeicao ? 'empratado' : 'buffet',
    nivelMenu: isRefeicao ? 'medio' : 'simples',
    proteina: '',
    tipoCozinha: '',
    estruturaMenu: isRefeicao ? ['sopa', 'prato_peixe', 'sobremesa'] : ['cafe'],
    bebidas: isRefeicao ? 'agua_vinho' : 'agua',
    pao: isRefeicao ? 'escola' : 'nao',
    menuImpresso: false,
    linguasMenu: ['pt'],
    notasExtra: '',
  };
}

function defaultDia(data = ''): DiaEvento {
  return { id: `d-${Date.now()}`, data, momentos: [] };
}

// ══════════════════════════════════════════════════════════════════
// ESTILOS
// ══════════════════════════════════════════════════════════════════
const COR = {
  roxo: '#6d28d9', roxoClaro: '#ede9fe',
  verde: '#059669', verdeClaro: '#d1fae5',
  cinza: '#6b7280', cinzaClaro: '#f3f4f6',
  preto: '#1a1714',
};

const btn = (bg: string, color = '#fff'): React.CSSProperties => ({
  padding: '12px 20px', borderRadius: 10, border: 'none', background: bg,
  color, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Arial, sans-serif',
});
const btnOutline: React.CSSProperties = {
  ...btn('#fff', COR.cinza), border: '1.5px solid #e5e7eb',
};
const input: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #e5e7eb', fontSize: 14, fontFamily: 'Arial', boxSizing: 'border-box',
};
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: COR.cinza,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block',
};

// ══════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: Editor de Momento
// ══════════════════════════════════════════════════════════════════
function EditorMomento({ momento, onChange, onRemove }: {
  momento: MomentoRefeicao;
  onChange: (m: MomentoRefeicao) => void;
  onRemove: () => void;
}) {
  const cfg = MOMENTOS_CONFIG[momento.tipo];
  const [aberto, setAberto] = useState(false);

  const isRefeicao = momento.tipo === 'almoco' || momento.tipo === 'jantar';
  const isCoffee = momento.tipo === 'coffee_break_manha' || momento.tipo === 'coffee_break_tarde';
  const isPequeno = momento.tipo === 'pequeno_almoco';

  const louca = calcularLouca(momento);

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  return (
    <div style={{ border: `2px solid ${cfg.cor}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      {/* Cabeçalho do momento */}
      <div onClick={() => setAberto(a => !a)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: cfg.cor + '18', cursor: 'pointer' }}>
        <span style={{ fontSize: 22 }}>{cfg.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: COR.preto }}>{cfg.label}</div>
          <div style={{ fontSize: 12, color: COR.cinza }}>{momento.numPessoas} pessoas · {momento.tipoServico || '—'}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ ...btn('#fee2e2', '#991b1b'), padding: '6px 12px', fontSize: 12 }}>✕</button>
        <span style={{ color: COR.cinza, fontSize: 16 }}>{aberto ? '▲' : '▼'}</span>
      </div>

      {aberto && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Número de pessoas */}
          <div>
            <span style={label}>Número de pessoas</span>
            <input type="number" style={input} value={momento.numPessoas} min={1}
              onChange={e => onChange({ ...momento, numPessoas: parseInt(e.target.value) || 1 })} />
            <div style={{ fontSize: 11, color: COR.cinza, marginTop: 4 }}>
              Com margem de 10%: <strong>{Math.ceil(momento.numPessoas * 1.1)}</strong> pessoas
            </div>
          </div>

          {/* Restrições */}
          <div>
            <span style={label}>Restrições alimentares</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Nenhuma', 'Sem glúten', 'Sem lactose', 'Vegetariano', 'Vegan', 'Halal', 'Alergia a marisco', 'Alergia a frutos secos', 'Diabético'].map(r => {
                const sel = momento.restricoes.includes(r);
                return <button key={r} style={{ ...btn(sel ? COR.roxo : '#fff', sel ? '#fff' : COR.cinza), padding: '6px 12px', fontSize: 12, border: `1.5px solid ${sel ? COR.roxo : '#e5e7eb'}` }}
                  onClick={() => onChange({ ...momento, restricoes: toggle(momento.restricoes, r) })}>{r}</button>;
              })}
            </div>
          </div>

          {/* Tipo de serviço */}
          {(isRefeicao || momento.tipo === 'cocktail') && (
            <div>
              <span style={label}>Tipo de serviço</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['empratado', '🍽️ Empratado'], ['buffet', '🥗 Buffet'], ['finger_food', '🤏 Finger Food'], ['misto', '🔄 Misto']].map(([v, l]) => (
                  <button key={v} style={{ ...btn(momento.tipoServico === v ? COR.roxo : '#fff', momento.tipoServico === v ? '#fff' : COR.cinza), padding: '8px 14px', fontSize: 13, border: `1.5px solid ${momento.tipoServico === v ? COR.roxo : '#e5e7eb'}` }}
                    onClick={() => onChange({ ...momento, tipoServico: v })}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Nível do menu — só refeições principais */}
          {isRefeicao && (
            <div>
              <span style={label}>Nível do menu</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['simples', '🟢 Simples (2 pratos)'], ['medio', '🟡 Médio (3 pratos)'], ['elaborado', '🔴 Elaborado (4+ pratos)']].map(([v, l]) => (
                  <button key={v} style={{ ...btn(momento.nivelMenu === v ? COR.roxo : '#fff', momento.nivelMenu === v ? '#fff' : COR.cinza), padding: '8px 14px', fontSize: 13, border: `1.5px solid ${momento.nivelMenu === v ? COR.roxo : '#e5e7eb'}` }}
                    onClick={() => onChange({ ...momento, nivelMenu: v })}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Proteína — só refeições */}
          {isRefeicao && (
            <div>
              <span style={label}>Proteína principal</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['peixe', '🐟 Peixe'], ['carne', '🥩 Carne'], ['peixe_carne', '🐟🥩 Peixe e Carne'], ['vegetariano', '🥦 Vegetariano'], ['mundo', '🌍 Cozinha do Mundo']].map(([v, l]) => (
                  <button key={v} style={{ ...btn(momento.proteina === v ? COR.roxo : '#fff', momento.proteina === v ? '#fff' : COR.cinza), padding: '8px 14px', fontSize: 13, border: `1.5px solid ${momento.proteina === v ? COR.roxo : '#e5e7eb'}` }}
                    onClick={() => onChange({ ...momento, proteina: v })}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Estilo de cozinha — só refeições */}
          {isRefeicao && (
            <div>
              <span style={label}>Estilo de cozinha</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['tradicional_pt', '🇵🇹 Tradicional'], ['internacional', '🌍 Internacional'], ['criativa', '🎨 Criativa'], ['saudavel', '🥗 Saudável'], ['tematica', '🌶️ Temática']].map(([v, l]) => (
                  <button key={v} style={{ ...btn(momento.tipoCozinha === v ? COR.roxo : '#fff', momento.tipoCozinha === v ? '#fff' : COR.cinza), padding: '8px 14px', fontSize: 13, border: `1.5px solid ${momento.tipoCozinha === v ? COR.roxo : '#e5e7eb'}` }}
                    onClick={() => onChange({ ...momento, tipoCozinha: v })}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Estrutura do menu */}
          {(isRefeicao || isPequeno) && (
            <div>
              <span style={label}>Elementos do menu</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(isRefeicao
                  ? [['entrada', '🥗 Entrada'], ['sopa', '🍲 Sopa'], ['prato_peixe', '🐟 Prato peixe'], ['prato_carne', '🥩 Prato carne'], ['sobremesa', '🍮 Sobremesa'], ['fruta', '🍎 Fruta'], ['cafe', '☕ Café'], ['digestivo', '🥃 Digestivo']]
                  : [['sumo', '🍊 Sumo'], ['cafe', '☕ Café/chá'], ['iogurte', '🥛 Iogurte'], ['fruta', '🍎 Fruta'], ['pastelaria', '🥐 Pastelaria'], ['torradas', '🍞 Torradas/pão']]
                ).map(([v, l]) => {
                  const sel = momento.estruturaMenu.includes(v);
                  return <button key={v} style={{ ...btn(sel ? COR.roxo : '#fff', sel ? '#fff' : COR.cinza), padding: '6px 12px', fontSize: 12, border: `1.5px solid ${sel ? COR.roxo : '#e5e7eb'}` }}
                    onClick={() => onChange({ ...momento, estruturaMenu: toggle(momento.estruturaMenu, v) })}>{l}</button>;
                })}
              </div>
            </div>
          )}

          {/* Bebidas */}
          <div>
            <span style={label}>Serviço de bebidas</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(isRefeicao
                ? [['agua', '💧 Só água'], ['agua_vinho', '🍷 Água + vinho'], ['completo', '🥂 Completo'], ['nao', '❌ Não inclui']]
                : [['agua', '💧 Água'], ['sumos', '🍊 Sumos'], ['completo', '☕ Completo'], ['nao', '❌ Não inclui']]
              ).map(([v, l]) => (
                <button key={v} style={{ ...btn(momento.bebidas === v ? COR.roxo : '#fff', momento.bebidas === v ? '#fff' : COR.cinza), padding: '8px 14px', fontSize: 13, border: `1.5px solid ${momento.bebidas === v ? COR.roxo : '#e5e7eb'}` }}
                  onClick={() => onChange({ ...momento, bebidas: v })}>{l}</button>
              ))}
            </div>
          </div>

          {/* Pão — só refeições */}
          {isRefeicao && (
            <div>
              <span style={label}>Pão</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['escola', '🏫 Produzido na escola'], ['comprado', '🛒 Comprado'], ['nao', '❌ Sem pão']].map(([v, l]) => (
                  <button key={v} style={{ ...btn(momento.pao === v ? COR.roxo : '#fff', momento.pao === v ? '#fff' : COR.cinza), padding: '8px 14px', fontSize: 13, border: `1.5px solid ${momento.pao === v ? COR.roxo : '#e5e7eb'}` }}
                    onClick={() => onChange({ ...momento, pao: v })}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Menu impresso */}
          {isRefeicao && (
            <div>
              <span style={label}>Menu impresso para convidados?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['sim', '✅ Sim'], ['nao', '❌ Não']].map(([v, l]) => (
                  <button key={v} style={{ ...btn((momento.menuImpresso ? 'sim' : 'nao') === v ? COR.roxo : '#fff', (momento.menuImpresso ? 'sim' : 'nao') === v ? '#fff' : COR.cinza), padding: '8px 14px', fontSize: 13, border: `1.5px solid ${(momento.menuImpresso ? 'sim' : 'nao') === v ? COR.roxo : '#e5e7eb'}` }}
                    onClick={() => onChange({ ...momento, menuImpresso: v === 'sim' })}>{l}</button>
                ))}
              </div>
              {momento.menuImpresso && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {[['pt', '🇵🇹 PT'], ['en', '🇬🇧 EN'], ['fr', '🇫🇷 FR']].map(([v, l]) => {
                    const sel = momento.linguasMenu.includes(v);
                    return <button key={v} style={{ ...btn(sel ? COR.roxo : '#fff', sel ? '#fff' : COR.cinza), padding: '6px 12px', fontSize: 13, border: `1.5px solid ${sel ? COR.roxo : '#e5e7eb'}` }}
                      onClick={() => onChange({ ...momento, linguasMenu: toggle(momento.linguasMenu, v) })}>{l}</button>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notas extra */}
          <div>
            <span style={label}>Notas / observações</span>
            <textarea style={{ ...input, minHeight: 60, resize: 'vertical' } as React.CSSProperties}
              value={momento.notasExtra}
              onChange={e => onChange({ ...momento, notasExtra: e.target.value })}
              placeholder="Detalhes específicos deste momento..." />
          </div>

          {/* Louça calculada */}
          <div style={{ background: COR.cinzaClaro, borderRadius: 10, padding: 12 }}>
            <div style={label}>📊 Louça necessária (calculada automaticamente)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
              {louca.map(l => (
                <div key={l.item} style={{ fontSize: 12, color: COR.preto }}>
                  <strong>{l.quantidade}×</strong> {l.item}{l.nota ? <span style={{ color: COR.cinza }}> ({l.nota})</span> : ''}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}


// ── Funções auxiliares: ligação plano ↔ evento ────────────────────────────────
function getPlanosDoEvento(turmaId: string, eventoId: string): TPlanoAula[] {
  return getPlanosAulaPorTurma(turmaId, true).filter((p: TPlanoAula) => p.eventoId === eventoId);
}

function getPlanosDisponiveis(turmaId: string, eventoId: string): TPlanoAula[] {
  return getPlanosAulaPorTurma(turmaId, true).filter((p: TPlanoAula) => !p.eventoId || p.eventoId === eventoId);
}

function associarPlano(plano: TPlanoAula, eventoId: string) {
  addOrUpdatePlanoAula({ ...plano, eventoId, atualizadoEm: new Date().toISOString() });
}

function desassociarPlano(plano: TPlanoAula) {
  const novo = { ...plano, atualizadoEm: new Date().toISOString() } as any;
  delete novo.eventoId;
  addOrUpdatePlanoAula(novo);
}
// ══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export function EventosWizard({ turmaId }: { turmaId: string; nomeProfessor?: string }) {
  const [eventos, setEventos] = useState<Evento[]>(loadEventos);
  const [vista, setVista] = useState<'lista' | 'novo' | 'editar' | 'detalhe'>('lista');
  const [eventoEmEdicaoId, setEventoEmEdicaoId] = useState<string | null>(null);
  const [eventoAtual, setEventoAtual] = useState<Evento | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [msg, setMsg] = useState('');
  const [mostrarSeletorPlanos, setMostrarSeletorPlanos] = useState(false);
  const [planosEvento, setPlanosEvento] = useState<TPlanoAula[]>([]);

  // ── estado do formulário de criação ──
  const [nome, setNome] = useState('');
  const [local, setLocal] = useState('');
  const [protocolo, setProtocolo] = useState(false);
  const [tema, setTema] = useState('');
  const [tipoPublico, setTipoPublico] = useState('');
  const [outrasTurmas, setOutrasTurmas] = useState<string[]>([]);
  const [reservas, setReservas] = useState(false);
  const [divulgacao, setDivulgacao] = useState(false);
  const [orcamento, setOrcamento] = useState('nao_necessario');
  const [disposicaoMesas, setDisposicaoMesas] = useState('');
  const [loica, setLoica] = useState('escola');
  const [dias, setDias] = useState<DiaEvento[]>([defaultDia()]);

  function salvarEventos(ev: Evento[]) { setEventos(ev); saveEventos(ev); }

  function criarEvento() {
    if (!nome.trim() || !local) { setMsg('⚠️ Preenche o nome e o local do evento.'); return; }
    if (dias.some(d => !d.data)) { setMsg('⚠️ Preenche a data de todos os dias.'); return; }
    if (dias.some(d => d.momentos.length === 0)) { setMsg('⚠️ Adiciona pelo menos um momento a cada dia.'); return; }

    const todosEv = JSON.parse(localStorage.getItem('ecl_eventos_v3') || '[]');
    const maiorNum = todosEv.reduce((m: number, e: any) => Math.max(m, e.numero || 0), 0);
    const proxNum = Math.max(maiorNum + 1, 100);

    // Reutilizar ID se estiver a editar evento existente
    const idFinal = eventoEmEdicaoId || `ev-${Date.now()}`;
    const ev: Evento = {
      id: idFinal,
      numero: proxNum,
      nome: nome.trim(), turmaId, local,
      protocolo, tema, tipoPublico,
      outrasTurmas, reservas, divulgacao, orcamento,
      disposicaoMesas, loica,
      visita: '', transporteAlunos: false, transporteProducao: '',
      dias,
      checklist: [],
      tarefas: [],
      publicado: false,
      criadoEm: new Date().toISOString(),
    };
    ev.checklist = gerarChecklist(ev);
    ev.tarefas = gerarTarefas(ev);
    salvarEventos([ev, ...eventos]);
    setEventoAtual(ev);
    setVista('detalhe');
    setMsg('');
  }

  function atualizarDia(diaIdx: number, novoDia: DiaEvento) {
    setDias(ds => ds.map((d, i) => i === diaIdx ? novoDia : d));
  }

  function adicionarDia() {
    setDias(ds => [...ds, defaultDia()]);
  }

  function removerDia(idx: number) {
    setDias(ds => ds.filter((_, i) => i !== idx));
  }

  function adicionarMomento(diaIdx: number, tipo: TipoMomento) {
    const primeiroNum = dias[diaIdx].momentos[0]?.numPessoas || 20;
    setDias(ds => ds.map((d, i) => i === diaIdx
      ? { ...d, momentos: [...d.momentos, defaultMomento(tipo, primeiroNum)] }
      : d));
  }

  function atualizarMomento(diaIdx: number, mIdx: number, m: MomentoRefeicao) {
    setDias(ds => ds.map((d, i) => i === diaIdx
      ? { ...d, momentos: d.momentos.map((x, j) => j === mIdx ? m : x) }
      : d));
  }

  function removerMomento(diaIdx: number, mIdx: number) {
    setDias(ds => ds.map((d, i) => i === diaIdx
      ? { ...d, momentos: d.momentos.filter((_, j) => j !== mIdx) }
      : d));
  }

  function toggleItem(id: string) {
    if (!eventoAtual) return;
    const nova = { ...eventoAtual, checklist: eventoAtual.checklist.map(c => c.id === id ? { ...c, estado: (c.estado === 'feito' ? 'pendente' : 'feito') as any } : c) };
    setEventoAtual(nova);
    salvarEventos(eventos.map(e => e.id === nova.id ? nova : e));
  }

  function toggleTarefa(id: string) {
    if (!eventoAtual) return;
    const nova = { ...eventoAtual, tarefas: eventoAtual.tarefas.map(t => t.id === id ? { ...t, selecionada: !t.selecionada } : t) };
    setEventoAtual(nova);
    salvarEventos(eventos.map(e => e.id === nova.id ? nova : e));
  }

  async function publicar() {
    if (!eventoAtual) return;
    setPublicando(true);
    setMsg('A publicar no Classroom...');
    try {
      // Encontrar planos de aula associados a este evento (via eventoId)
      const planosDoEvento = getPlanosAulaPorTurma(turmaId)
        .filter(p => p.eventoId === eventoAtual.id);

      // Juntar as fichas técnicas (HTML já pronto, gerado quando a ficha foi guardada)
      const todasFichas = getFichasProducao();
      const fichasDoEvento = planosDoEvento
        .flatMap(p => todasFichas.filter(f => f.planoAulaId === p.id));
      const fichasHtml = fichasDoEvento.length > 0
        ? fichasDoEvento.map(f => (f as any).htmlCompleto || '').filter(Boolean).join('\n<hr/>\n')
        : '';

      // Juntar os guiões de apoio (texto já gerado, guardado em textoGuia)
      const guiaoHtml = fichasDoEvento.length > 0
        ? fichasDoEvento.map(f => f.textoGuia || '').filter(Boolean).join('\n<hr/>\n')
        : '';

      // Juntar as requisições dos planos deste evento
      const requisicoesDoEvento = planosDoEvento
        .map(p => getRequisicaoPorPlano(p.id))
        .filter((r): r is NonNullable<typeof r> => !!r);
      const requisicaoHtml = requisicoesDoEvento.length > 0
        ? requisicoesDoEvento.map(r =>
            `<h3>Requisição — ${r.dataAula}</h3><ul>` +
            r.linhas.map(l => `<li>${(l as any).produto || ''} — ${(l as any).qtEncomenda || ''} ${(l as any).und || ''}</li>`).join('') +
            `</ul>`
          ).join('\n<hr/>\n')
        : '';

      const res = await publicarNoClassroom('evento', turmaId, {
        nomeEvento: eventoAtual.nome,
        data: eventoAtual.dias.map(d => d.data).join(', '),
        tarefas: eventoAtual.tarefas.filter(t => t.selecionada),
        relatorioHtml: gerarRelatorioHTML(eventoAtual, true),
        fichasHtml,
        guiaoHtml,
        requisicaoHtml,
      });
      if (res.ok) {
        const nova = { ...eventoAtual, publicado: true };
        setEventoAtual(nova);
        salvarEventos(eventos.map(e => e.id === nova.id ? nova : e));
        setMsg('✅ Evento publicado no Classroom!');
      } else {
        setMsg('❌ Erro: ' + (res.erro || 'erro desconhecido'));
      }
    } catch (err) {
      setMsg('❌ Erro de ligação: ' + String(err));
    }
    setPublicando(false);
  }

  function abrirPDF() {
    if (!eventoAtual) return;
    const html = gerarRelatorioHTML(eventoAtual, false);
    const win = window.open('', '_blank');
    if (!win) { alert('O navegador bloqueou a janela. Permite pop-ups e tenta de novo.'); return; }
    win.document.open(); win.document.write(html); win.document.close();
    setTimeout(() => { try { win.focus(); win.print(); } catch { } }, 500);
  }

  function toggleOutrasTurmas(v: string) {
    setOutrasTurmas(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v]);
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER — LISTA
  // ══════════════════════════════════════════════════════════════════
  if (vista === 'lista') return (
    <div style={{ padding: 20, maxWidth: 640, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎯</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: COR.roxo, margin: '0 0 6px' }}>Eventos Pedagógicos</h2>
        <p style={{ fontSize: 14, color: COR.cinza, margin: '0 0 24px' }}>{turmaId}</p>
        <button style={{ ...btn(COR.roxo), width: '100%', padding: '14px', fontSize: 15 }}
          onClick={() => {
            setNome(''); setLocal(''); setProtocolo(false); setTema(''); setTipoPublico('');
            setOutrasTurmas([]); setReservas(false); setDivulgacao(false);
            setOrcamento('nao_necessario'); setDisposicaoMesas(''); setLoica('escola');
            setDias([defaultDia()]); setMsg('');
            setVista('novo');
          }}>
          + Criar Novo Evento
        </button>
      </div>

      {eventos.filter(e => e.turmaId === turmaId).map(ev => (
        <div key={ev.id} onClick={() => { setEventoAtual(ev); setVista('detalhe'); }}
          style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, border: `2px solid ${ev.publicado ? COR.verde : COR.roxo}`, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>EVT-{ev.numero || '—'} · {ev.nome}</div>
          <div style={{ fontSize: 12, color: COR.cinza, marginTop: 4 }}>
            {ev.dias.length} dia(s) · {ev.dias.reduce((acc, d) => acc + d.momentos.length, 0)} momentos · {ev.checklist.filter(c => c.estado === 'feito').length}/{ev.checklist.length} itens feitos
            {ev.publicado ? ' · ✅ Publicado' : ''}
          </div>
        </div>
      ))}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // RENDER — NOVO EVENTO
  // ══════════════════════════════════════════════════════════════════
  if (vista === 'novo') return (
    <div style={{ padding: 20, maxWidth: 640, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button style={btnOutline} onClick={() => setVista('lista')}>←</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: COR.roxo }}>Novo Evento</h2>
      </div>

      {msg && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{msg}</div>}

      {/* Nome */}
      <div style={{ marginBottom: 18 }}>
        <span style={label}>Nome do evento *</span>
        <input style={input} placeholder="Ex: Jantar de Natal ECL 2025" value={nome} onChange={e => setNome(e.target.value)} />
      </div>

      {/* Local */}
      <div style={{ marginBottom: 18 }}>
        <span style={label}>Local *</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['interno', '🏫 Interno — na escola'], ['externo', '🚌 Externo — noutro local']].map(([v, l]) => (
            <button key={v} style={{ ...btn(local === v ? COR.roxo : '#fff', local === v ? '#fff' : COR.cinza), flex: 1, border: `1.5px solid ${local === v ? COR.roxo : '#e5e7eb'}` }}
              onClick={() => setLocal(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Tipo de público */}
      <div style={{ marginBottom: 18 }}>
        <span style={label}>Tipo de público</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[['adultos', '👨‍💼 Adultos'], ['criancas', '👶 Crianças'], ['misto', '👨‍👩‍👧 Misto'], ['corporativo', '🏢 Corporativo'], ['escolar', '🎓 Escolar']].map(([v, l]) => (
            <button key={v} style={{ ...btn(tipoPublico === v ? COR.roxo : '#fff', tipoPublico === v ? '#fff' : COR.cinza), padding: '8px 14px', fontSize: 13, border: `1.5px solid ${tipoPublico === v ? COR.roxo : '#e5e7eb'}` }}
              onClick={() => setTipoPublico(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Protocolo + Orçamento */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <span style={label}>Protocolo formal?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['sim', '🎩 Sim'], ['nao', '😊 Não']].map(([v, l]) => (
              <button key={v} style={{ ...btn((protocolo ? 'sim' : 'nao') === v ? COR.roxo : '#fff', (protocolo ? 'sim' : 'nao') === v ? '#fff' : COR.cinza), flex: 1, border: `1.5px solid ${(protocolo ? 'sim' : 'nao') === v ? COR.roxo : '#e5e7eb'}` }}
                onClick={() => setProtocolo(v === 'sim')}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <span style={label}>Orçamento</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['aprovado', '✅ Aprovado'], ['falta_criar', '📝 Falta criar'], ['nao_necessario', '❌ N/A']].map(([v, l]) => (
              <button key={v} style={{ ...btn(orcamento === v ? COR.roxo : '#fff', orcamento === v ? '#fff' : COR.cinza), flex: 1, fontSize: 12, padding: '8px 8px', border: `1.5px solid ${orcamento === v ? COR.roxo : '#e5e7eb'}` }}
                onClick={() => setOrcamento(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Outras turmas */}
      <div style={{ marginBottom: 18 }}>
        <span style={label}>Outras turmas / disciplinas envolvidas</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[['restaurante_bar', '🍷 Restaurante/Bar'], ['turismo', '✈️ Turismo'], ['gestao_controlo', '📊 Gestão e Controlo'], ['ingles', '🇬🇧 Inglês Técnico'], ['area_projeto', '📐 Área de Projecto'], ['portugues', '📝 Português'], ['matematica', '🔢 Matemática']].map(([v, l]) => {
            const sel = outrasTurmas.includes(v);
            return <button key={v} style={{ ...btn(sel ? COR.roxo : '#fff', sel ? '#fff' : COR.cinza), padding: '6px 12px', fontSize: 12, border: `1.5px solid ${sel ? COR.roxo : '#e5e7eb'}` }}
              onClick={() => toggleOutrasTurmas(v)}>{l}</button>;
          })}
        </div>
      </div>

      {/* Reservas + Divulgação */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <span style={label}>Sistema de reservas?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['sim', '✅ Sim'], ['nao', '❌ Não']].map(([v, l]) => (
              <button key={v} style={{ ...btn((reservas ? 'sim' : 'nao') === v ? COR.roxo : '#fff', (reservas ? 'sim' : 'nao') === v ? '#fff' : COR.cinza), flex: 1, border: `1.5px solid ${(reservas ? 'sim' : 'nao') === v ? COR.roxo : '#e5e7eb'}` }}
                onClick={() => setReservas(v === 'sim')}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <span style={label}>Divulgação pública?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['sim', '📢 Sim'], ['nao', '🔒 Não']].map(([v, l]) => (
              <button key={v} style={{ ...btn((divulgacao ? 'sim' : 'nao') === v ? COR.roxo : '#fff', (divulgacao ? 'sim' : 'nao') === v ? '#fff' : COR.cinza), flex: 1, border: `1.5px solid ${(divulgacao ? 'sim' : 'nao') === v ? COR.roxo : '#e5e7eb'}` }}
                onClick={() => setDivulgacao(v === 'sim')}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DIAS E MOMENTOS ── */}
      <div style={{ borderTop: `2px solid ${COR.roxo}`, paddingTop: 20, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: COR.roxo }}>📅 Dias e Momentos do Evento</h3>

        {dias.map((dia, diaIdx) => (
          <div key={dia.id} style={{ background: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 14, border: '1.5px solid #e5e7eb' }}>
            {/* Cabeçalho do dia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: COR.preto }}>Dia {diaIdx + 1}</span>
              <input type="date" style={{ ...input, flex: 1 }} value={dia.data}
                onChange={e => atualizarDia(diaIdx, { ...dia, data: e.target.value })} />
              {dias.length > 1 && (
                <button style={{ ...btn('#fee2e2', '#991b1b'), padding: '6px 12px', fontSize: 12 }}
                  onClick={() => removerDia(diaIdx)}>✕ Dia</button>
              )}
            </div>

            {/* Momentos do dia */}
            {dia.momentos.map((m, mIdx) => (
              <EditorMomento key={m.id} momento={m}
                onChange={novo => atualizarMomento(diaIdx, mIdx, novo)}
                onRemove={() => removerMomento(diaIdx, mIdx)} />
            ))}

            {/* Adicionar momento */}
            <div style={{ marginTop: 10 }}>
              <div style={label}>Adicionar momento</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ORDEM_MOMENTOS.filter(t => !dia.momentos.some(m => m.tipo === t)).map(tipo => {
                  const cfg = MOMENTOS_CONFIG[tipo];
                  return (
                    <button key={tipo} style={{ ...btnOutline, padding: '7px 13px', fontSize: 12 }}
                      onClick={() => adicionarMomento(diaIdx, tipo)}>
                      {cfg.emoji} {cfg.label}
                    </button>
                  );
                })}
                {ORDEM_MOMENTOS.every(t => dia.momentos.some(m => m.tipo === t)) && (
                  <span style={{ fontSize: 12, color: COR.cinza, padding: '8px 0' }}>Todos os momentos já adicionados</span>
                )}
              </div>
            </div>
          </div>
        ))}

        <button style={{ ...btnOutline, width: '100%', marginTop: 4 }} onClick={adicionarDia}>
          + Adicionar dia
        </button>
      </div>

      {/* Criar */}
      <button style={{ ...btn(COR.verde), width: '100%', padding: '16px', fontSize: 16 }}
        onClick={criarEvento}>
        Criar Evento →
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // RENDER — DETALHE DO EVENTO
  // ══════════════════════════════════════════════════════════════════
  if (vista === 'detalhe' && eventoAtual) {
    const feitos = eventoAtual.checklist.filter(c => c.estado === 'feito').length;
    const total = eventoAtual.checklist.length;
    const categorias = [...new Set(eventoAtual.checklist.map(c => c.categoria))];

    return (
      <div style={{ padding: 16, maxWidth: 640, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button style={btnOutline} onClick={() => setVista('lista')}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COR.cinza, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>EVT-{eventoAtual.numero || '—'}</div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{eventoAtual.nome}</h2>
            <div style={{ fontSize: 12, color: COR.cinza }}>{feitos}/{total} itens · {eventoAtual.dias.length} dia(s)</div>
          </div>
          <span style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700, background: eventoAtual.publicado ? COR.verdeClaro : COR.roxoClaro, color: eventoAtual.publicado ? COR.verde : COR.roxo }}>
            {eventoAtual.publicado ? '✅ Publicado' : '⏳ Rascunho'}
          </span>
        </div>

        {/* Barra de progresso */}
        <div style={{ height: 8, background: COR.cinzaClaro, borderRadius: 99, marginBottom: 16 }}>
          <div style={{ height: '100%', width: `${Math.round((feitos / total) * 100)}%`, background: COR.verde, borderRadius: 99, transition: 'width 0.3s' }} />
        </div>

        {/* Resumo por dia */}
        <div style={{ marginBottom: 20 }}>
          <div style={label}>Programa</div>
          {eventoAtual.dias.map(d => {
            const dataFmt = d.data ? fmtData(d.data + 'T12:00:00') : '—';
            return (
              <div key={d.id} style={{ background: COR.cinzaClaro, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📅 {dataFmt}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {d.momentos.map(m => {
                    const cfg = MOMENTOS_CONFIG[m.tipo];
                    return (
                      <span key={m.id} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: cfg.cor + '22', color: cfg.cor }}>
                        {cfg.emoji} {cfg.label} — {m.numPessoas} pax
                      </span>
                    );
                  })}
                  {d.momentos.length === 0 && <span style={{ fontSize: 12, color: COR.cinza }}>Nenhum momento</span>}
                </div>
              </div>
            );
          })}
        </div>

        {msg && <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.startsWith('❌') ? '#fee2e2' : '#d1fae5', color: msg.startsWith('❌') ? '#991b1b' : '#065f46', fontSize: 13, marginBottom: 14, fontWeight: 600 }}>{msg}</div>}

        {/* Checklist */}
        {categorias.map(cat => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={label}>{cat}</div>
            {eventoAtual.checklist.filter(c => c.categoria === cat).map(item => (
              <div key={item.id} onClick={() => toggleItem(item.id)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${item.estado === 'feito' ? COR.verde : '#e5e7eb'}`, background: item.estado === 'feito' ? COR.verdeClaro + '44' : '#fff', cursor: 'pointer', marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.estado === 'feito' ? COR.verde : '#d1d5db'}`, background: item.estado === 'feito' ? COR.verde : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {item.estado === 'feito' && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: item.estado === 'feito' ? COR.verde : COR.preto, textDecoration: item.estado === 'feito' ? 'line-through' : 'none' }}>{item.texto}</div>
                  <div style={{ fontSize: 11, color: COR.cinza }}>{item.responsavel}</div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Tarefas Classroom */}
        <div style={{ marginBottom: 20 }}>
          <div style={label}>Tarefas para o Google Classroom</div>
          {eventoAtual.tarefas.map(t => (
            <div key={t.id} onClick={() => toggleTarefa(t.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${t.selecionada ? COR.roxo : '#e5e7eb'}`, background: t.selecionada ? COR.roxoClaro + '44' : '#fff', cursor: 'pointer', marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${t.selecionada ? COR.roxo : '#d1d5db'}`, background: t.selecionada ? COR.roxo : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                {t.selecionada && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t.titulo}</div>
                <div style={{ fontSize: 11, color: COR.roxo, fontWeight: 600 }}>{t.disciplina}</div>
                <div style={{ fontSize: 12, color: COR.cinza }}>{t.descricao}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Planos de Aula Associados ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...label, marginBottom: 10 }}>📋 Planos de Aula Associados</div>
          {(() => {
            const planosAssociados = getPlanosDoEvento(turmaId, eventoAtual.id);
            const planosDisponiveis = getPlanosDisponiveis(turmaId, eventoAtual.id).filter(p => !p.eventoId);
            return (
              <>
                {planosAssociados.length === 0 && !mostrarSeletorPlanos && (
                  <div style={{ fontSize: 13, color: COR.cinza, marginBottom: 10, padding: '10px 14px', background: COR.cinzaClaro, borderRadius: 8 }}>
                    Nenhum plano de aula associado a este evento.
                  </div>
                )}
                {planosAssociados.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${COR.roxo}`, background: COR.roxoClaro + '44', marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1714' }}>{p.titulo || 'Plano de aula'}</div>
                      <div style={{ fontSize: 11, color: COR.cinza }}>{p.data} · {p.ucId || '—'} · {p.turmaId}</div>
                    </div>
                    <button onClick={() => { desassociarPlano(p); setPlanosEvento(getPlanosDoEvento(turmaId, eventoAtual.id)); }}
                      style={{ ...btn('#fee2e2', '#991b1b'), padding: '5px 10px', fontSize: 11 }}>
                      ✕ Remover
                    </button>
                  </div>
                ))}
                {mostrarSeletorPlanos && planosDisponiveis.length > 0 && (
                  <div style={{ background: COR.cinzaClaro, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: COR.cinza, marginBottom: 8 }}>Selecciona os planos a associar a este evento:</div>
                    {planosDisponiveis.map(p => (
                      <div key={p.id} onClick={() => { associarPlano(p, eventoAtual.id); setPlanosEvento(getPlanosDoEvento(turmaId, eventoAtual.id)); setMostrarSeletorPlanos(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.titulo || 'Plano de aula'}</div>
                          <div style={{ fontSize: 11, color: COR.cinza }}>{p.data} · {p.ucId || '—'}</div>
                        </div>
                        <span style={{ fontSize: 12, color: COR.roxo, fontWeight: 700 }}>+ Associar</span>
                      </div>
                    ))}
                    {planosDisponiveis.length === 0 && (
                      <div style={{ fontSize: 12, color: COR.cinza }}>Não há planos disponíveis para associar.</div>
                    )}
                  </div>
                )}
                <button style={{ ...btnOutline, width: '100%', marginTop: 4 }}
                  onClick={() => setMostrarSeletorPlanos(s => !s)}>
                  {mostrarSeletorPlanos ? '✕ Fechar seletor' : '+ Associar plano de aula'}
                </button>
              </>
            );
          })()}
        </div>

        {/* Botões de ação */}
        {!eventoAtual.publicado && (
          <button style={{ ...btnOutline, width: '100%', padding: 12, fontSize: 14, marginBottom: 8 }}
            onClick={() => { setEventoEmEdicaoId(eventoAtual.id); setVista('editar'); }}>
            ✏️ Editar este evento
          </button>
        )}
        <button style={{ ...btn('#1a1714'), width: '100%', padding: 14, fontSize: 15, marginBottom: 8 }}
          onClick={abrirPDF}>
          📄 Relatório PDF do Evento
        </button>

        {!eventoAtual.publicado ? (
          <button style={{ ...btn(COR.verde), width: '100%', padding: 14, fontSize: 15, marginBottom: 8 }}
            onClick={publicar} disabled={publicando}>
            {publicando ? '⏳ A publicar...' : '📢 Publicar no Google Classroom'}
          </button>
        ) : (
          <div style={{ padding: 14, borderRadius: 12, background: COR.verdeClaro, textAlign: 'center', color: COR.verde, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
            ✅ Publicado no Classroom com sucesso!
          </div>
        )}

        <button style={{ ...btnOutline, width: '100%' }} onClick={() => setVista('lista')}>← Voltar à lista</button>
      </div>
    );
  }

  return null;
}
