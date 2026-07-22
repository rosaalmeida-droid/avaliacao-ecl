import React, { useState, useMemo } from 'react';
import { fmtData } from '../datas';
import {
  EntradaManual, CategoriaManual, NivelManual,
  CATEGORIAS_MANUAL, ICONES_CATEGORIA, CORES_NIVEL,
} from '../types';
import {
  getEntradasManual, addEntradaManual, deleteEntradaManual, pesquisarManual,
} from '../backend';
import { exportarGuiaoDocx } from './exportGuiao';
import { CRONOGRAMA_2026_2027, ANO_LETIVO, ModuloCronograma, EQUIVALENCIAS_UFCD_UC } from '../cronograma';
import { getReferencialUC } from '../referencial811RA144';
import { getFichasProducao } from '../backend';

const COR_PRIMARIA  = '#1a1714';
const COR_DOURADO   = '#b5651d';
const COR_DOURADO_P = '#fdf0e6';
const COR_IA        = '#6d28d9';
const COR_IA_P      = '#ede9fe';

function gerarId(): string {
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Prompt do guião de módulo (formato M16) ────────────────────
// ── Prompts do manual de 50 páginas (5 partes) ───────────────
// Norma ECL: mínimo 50 páginas, 2-3 fichas de trabalho, 5-10 receitas,
// desenvolvimento de projeto, glossário, questionário, fontes reais, índice.

function buildCabecalho(modulo: ModuloCronograma, anoLetivo: string): string {
  const turmaLabel  = modulo.turmaAno === 1 ? '1. Ano' : modulo.turmaAno === 2 ? '2. Ano' : '3. Ano';
  const anosLetivos = modulo.turmaAno === 1 ? '2026-2029' : modulo.turmaAno === 2 ? '2025-2028' : '2024-2027';
  const ref         = modulo.tipo === 'UC' ? '811RA144' : '811183';
  const tipoLabel   = modulo.tipo === 'UC' ? 'UC' : 'UFCD';
  return [
    'ESCOLA DE COMERCIO DE LISBOA',
    'Curso Profissional de Tecnico de Cozinha-Pastelaria',
    turmaLabel + ' | ' + anosLetivos,
    'Referencial ' + ref,
    modulo.disciplina,
    tipoLabel + ' ' + modulo.id.replace('UFCD ', '') + ' - ' + modulo.nome,
    'Carga Horaria: ' + String(modulo.horasPrevistas) + ' horas',
    'Ano Lectivo ' + anoLetivo,
  ].join('\n');
}

function buildContextoManual(modulo: ModuloCronograma, anoLetivo: string): string {
  const ref = modulo.tipo === 'UC' ? '811RA144' : '811183';
  return [
    'Vais construir um MANUAL DO ALUNO completo para a ' + modulo.nome + '.',
    'Curso: Tecnico de Cozinha-Pastelaria | Referencial ' + ref + ' | Escola de Comercio de Lisboa.',
    'Ano letivo: ' + anoLetivo + ' | ' + modulo.disciplina + '.',
    '',
    'NORMA OBRIGATORIA DO MANUAL (cumprir rigorosamente):',
    '- Minimo 50 paginas',
    '- 2 a 3 fichas de trabalho completas (com tabelas para preenchimento)',
    '- 5 a 10 fichas tecnicas de receita (com ingredientes, quantidades para 4 doses, preparacao passo a passo)',
    '- 1 desenvolvimento de projeto (com etapas, criterios de avaliacao, exemplo resolvido)',
    '- Glossario com 12 a 15 termos tecnicos',
    '- Questionario de revisao global (15 questoes por grupos tematicos)',
    '- Bibliografia com fontes REAIS (ANQEP, AHRESP/DGS, Gomes et al. 2015, Maincent-Morel, McGee, Le Cordon Bleu)',
    '- Esquemas/diagramas tecnicos ORIGINAIS (sem fotografias de terceiros)',
    '- Capa + Indice com paginas reais + cabecalho e rodape com numero de pagina',
    '- Limites HACCP reais: refrigeracao 0-4 C, congelacao -18 C, confecao 65 C, regra 2h',
    '',
    'ESTILO:',
    '- Portugues europeu, grafia pre-Acordo (Objectivos, actual, confeccao)',
    '- Texto justificado, tom tecnico-pedagogico',
    '- Caixas de destaque: DICA DO CHEF, CIENCIA NA COZINHA, HACCP, ERROS FREQUENTES, SABIAS QUE, NOTA',
    '- Tabelas com cabecalho colorido e linhas alternadas',
    '- Fontes reais sempre que relevante',
  ].join('\n');
}

function buildPromptGuiao(modulo: ModuloCronograma, anoLetivo: string, parte: number = 1): string {
  const cabecalho  = buildCabecalho(modulo, anoLetivo);
  const contexto   = buildContextoManual(modulo, anoLetivo);

  const partes: Record<number, string[]> = {
    1: [
      contexto,
      '',
      'PARTE 1 DE 5 - Gera APENAS esta parte e para:',
      '- Capa (com dados do cabecalho abaixo)',
      '- Enquadramento no Referencial (tabela: codigo, designacao, componente, ano, nivel, pre-requisitos)',
      '- Objectivos de aprendizagem (8 objectivos em lista)',
      '- Indice provisorio (deixa os numeros de pagina como "..." - serao preenchidos no fim)',
      '- Capitulo 1: Introducao (importancia da UC, valor nutricional/tecnico, historia, enquadramento)',
      '- Capitulo 2: Tecnologia da materia-prima (classificacao, criterios de qualidade/frescura)',
      '- Capitulo 3: Aprovisionamento, conservacao e HACCP (cadeia de frio, riscos, higiene, alergenos)',
      '- Capitulo 4: Pre-preparacao (operacoes, rendimento, aproveitamento, equipamento)',
      '',
      'CABECALHO DO DOCUMENTO:',
      cabecalho,
      '',
      'Escreve "===FIM PARTE 1===" na ultima linha.',
    ],
    2: [
      contexto,
      '',
      'PARTE 2 DE 5 - Continua o manual. Gera APENAS:',
      '- Capitulo 5: Metodos de confeccao (calor humido/seco, pontos de cozedura, temperaturas)',
      '- Capitulo 6: Molhos e guarniciones (molhos-base passo a passo, marinadas, derivados)',
      '- Capitulo 7: Empratamento e analise sensorial (principios, grelha sensorial, harmonizacao)',
      '- Capitulo 8: Sustentabilidade (escolha responsavel, sazonalidade, aproveitamento integral)',
      '- Capitulos 9 a 11: Especializacao da UC (perfis, tradicao, cozinha regional, tabela referencia rapida)',
      '',
      'Mantem o mesmo estilo e formato da Parte 1.',
      'Escreve "===FIM PARTE 2===" na ultima linha.',
    ],
    3: [
      contexto,
      '',
      'PARTE 3 DE 5 - Continua o manual. Gera APENAS:',
      '- Capitulo 12: Fichas de Trabalho (3 fichas completas com tabelas para preenchimento)',
      '  Ficha 1: avaliacao/analise de materia-prima ou tecnica',
      '  Ficha 2: calculo de rendimento e custo',
      '  Ficha 3: comparacao de metodos ou analise sensorial',
      '- Capitulo 13: Desenvolvimento de Projeto',
      '  Tema ligado a UC, etapas detalhadas, criterios de avaliacao com percentagens, exemplo resolvido',
      '',
      'Mantem o mesmo estilo e formato.',
      'Escreve "===FIM PARTE 3===" na ultima linha.',
    ],
    4: [
      contexto,
      '',
      'PARTE 4 DE 5 - Continua o manual. Gera APENAS:',
      '- Capitulo 14: Fichas Tecnicas de Receita (minimo 8 receitas, maximo 14)',
      '  Cada ficha: nome, doses (4), tempo, metodo, lista de ingredientes com quantidades,',
      '  preparacao passo a passo numerado, nota tecnica do chef',
      '  As receitas devem cobrir diferentes metodos de confeccao da UC',
      '',
      'Mantem o mesmo estilo e formato.',
      'Escreve "===FIM PARTE 4===" na ultima linha.',
    ],
    5: [
      contexto,
      '',
      'PARTE 5 DE 5 - Ultima parte. Gera:',
      '- Capitulo 15: Questionario de Revisao Global',
      '  4 grupos tematicos, total de 14 a 16 questoes, linhas de resposta',
      '- Glossario (12 a 15 termos com definicao clara)',
      '- Bibliografia e Fontes (reais: ANQEP, AHRESP/DGS, Gomes et al. 2015, Maincent-Morel, McGee, Le Cordon Bleu, Turismo de Portugal)',
      '- Sintese Final (7 a 10 pontos-chave da UC)',
      '- Anexo A: Modelo de ficha tecnica em branco',
      '- Anexo B: Folha-resumo de temperaturas e regras HACCP (destacavel)',
      '',
      'No fim de tudo, escreve uma linha com o INDICE FINAL actualizado com os numeros de pagina reais.',
      'Escreve "===FIM MANUAL===" na ultima linha.',
    ],
  };

  const linhas = partes[parte] || partes[1];
  return linhas.join('\n');
}

// Geração via Apps Script — manual completo em 5 partes
const GS_URL = 'https://script.google.com/macros/s/AKfycbzBxobzVzxVfoAKC7wiqmKRiKru8z_FM1g7O6sTvRUE9q2QpD3DsTRfkrAFnouA41a1LA/exec';

// ── Chamada via Apps Script (proxy seguro — evita CORS) ──────
async function chamarManualViaGS(prompts: string[]): Promise<string> {
  const resp = await fetch(GS_URL, {
    method: 'POST',
    body: JSON.stringify({ acao: 'gerarManualCompleto', prompts }),
  });
  if (!resp.ok) throw new Error('Erro no servidor: ' + resp.status);
  const data = await resp.json();
  if (!data.ok) throw new Error(data.erro || 'Erro desconhecido');
  return data.texto || '';
}

// ── Construir os 5 prompts do manual ─────────────────────────
function construirPrompts(modulo: ModuloCronograma, anoLetivo: string): string[] {
  const ref_     = modulo.tipo === 'UC' ? '811RA144' : '811183';
  const turmaNum = modulo.turmaAno || 1;
  const turma    = turmaNum === 1 ? '1. Ano' : turmaNum === 2 ? '2. Ano' : '3. Ano';
  const ucIdRef  = modulo.tipo === 'UC' ? modulo.id : (EQUIVALENCIAS_UFCD_UC[modulo.id]?.[0] || null);
  const ref      = ucIdRef ? getReferencialUC(ucIdRef) : null;
  const realizacoesP   = (ref?.realizacoes           || []).map((r: string, i: number) => (i+1) + '. ' + r).join('\n');
  const criteriosP     = (ref?.criteriosDesempenho   || []).map((r: string) => '- ' + r).join('\n');
  const conhecimentosP = (ref?.conhecimentos         || []).map((r: string) => '- ' + r).join('\n');
  const anoLetivoFixo  = '2026-2027';

  const papel = [
    'Actua como um autor senior de manuais tecnicos para Escolas de Hotelaria,',
    'especialista em gastronomia portuguesa, tecnologia alimentar, HACCP, pedagogia profissional e escrita academica.',
    '',
    'Escreve um verdadeiro livro tecnico equivalente aos manuais das Escolas de Hotelaria e Turismo de Portugal.',
    'Portugues europeu, grafia pre-Acordo (Objectivos, confeccao, actual, tecnico, pratico, recepcao).',
    'Nivel universitario. Nunca escolar. Nunca Wikipedia.',
    '',
    'REGRAS OBRIGATORIAS:',
    '- Nunca resumir. Sempre desenvolver. Sempre explicar. Sempre justificar.',
    '- Cada capitulo como um capitulo de livro — varios paragrafos por subtitulo.',
    '- Sempre explicar o "porque" e nao apenas o "como".',
    '- Minimo 2 tabelas de 4 colunas por capitulo.',
    '- Caixas tecnicas: [DICA DO CHEF] [CIENCIA NA COZINHA] [HACCP] [ERROS FREQUENTES] [SABIA QUE]',
    '- Cada capitulo termina com exercicios praticos e questoes de revisao.',
    '- Fontes reais: ANQEP, AHRESP/DGS, Reg. CE 852/2004, Maincent-Morel, McGee, Le Cordon Bleu, Modesto M.L.',
    '- HACCP: refrigeracao 0-4C; congelacao -18C; confeccao min. 65C; regra 2h; Anisakis -20C/24h.',
    '- Estilo: Harold McGee + Maria de Lourdes Modesto + Manual das Escolas de Hotelaria.',
    '- Nunca producao curta. Cada capitulo 6 a 10 paginas.',
    '',
    'MANUAL A PRODUZIR:',
    modulo.id + ' — ' + modulo.nome,
    'Referencial ' + ref_ + ' | Curso Profissional Tecnico/a de Cozinha e Restauracao',
    turma + ' | ' + modulo.horasPrevistas + ' horas | ECL | Ano Lectivo ' + anoLetivoFixo,
    '',
    'COMPETENCIAS OFICIAIS (Referencial ANQEP):',
    'Realizacoes:',
    realizacoesP || 'ver referencial',
    '',
    'Criterios de desempenho:',
    criteriosP || 'ver referencial',
    '',
    'Conhecimentos:',
    conhecimentosP || 'ver referencial',
  ].join('\n');

  const estrutura = [
    'ESTRUTURA DO MANUAL (seguir rigorosamente):',
    '',
    'PARTE I — Enquadramento e Fundamentos',
    '- Nota de apresentacao, enquadramento no referencial (tabela), 8 objectivos detalhados, indice geral',
    '- Capitulo 1: Contexto historico, cultural e profissional (min. 8 paginas)',
    '- Capitulo 2: Tecnologia das materias-primas — classificacao, qualidade, frescura (min. 8 paginas)',
    '',
    'PARTE II — Aprovisionamento, Conservacao e Tecnicas',
    '- Capitulo 3: Aprovisionamento, recepcao e HACCP (min. 8 paginas)',
    '- Capitulo 4: Pre-preparacao e mise en place (min. 6 paginas)',
    '- Capitulo 5: Metodos de confeccao — ciencia, tecnica, exemplos portugueses (min. 10 paginas)',
    '- Capitulo 6: Molhos, fundos e guarnicoes (min. 6 paginas)',
    '- Capitulo 7: Empratamento e analise sensorial (min. 4 paginas)',
    '',
    'PARTE III — Instrumentos de Trabalho',
    '- 3 Fichas de trabalho com tabelas para preenchimento',
    '- Desenvolvimento de projecto (7 etapas, criterios com %, exemplo resolvido)',
    '',
    'PARTE IV — Fichas Tecnicas de Receita',
    '- 10 fichas tecnicas completas: cabecalho, ingredientes (quant. bruta/liquida), preparacao, HACCP, nota do chef, variante regional',
    '',
    'PARTE V — Avaliacao e Referencias',
    '- Questionario 16 questoes, glossario 15 termos, sintese 10 pontos, bibliografia, Anexo A e B, indice final',
  ].join('\n');

  const prompts = [
    papel + '\n\n' + estrutura + '\n\n'
      + 'INSTRUCAO: Escreve agora a PARTE I e PARTE II do manual (Capitulos 1 a 7).'
      + ' Cada capitulo 6 a 10 paginas de conteudo denso.'
      + ' Comeca pela nota de apresentacao e vai ate ao fim do Capitulo 7.'
      + ' No final escreve apenas: === FIM PARTE 1 ===',

    papel + '\n\n' + estrutura + '\n\n'
      + 'Continua o manual ' + modulo.id + ' — ' + modulo.nome + '.'
      + ' INSTRUCAO: Escreve agora a PARTE III (3 fichas de trabalho + projecto).'
      + ' Fichas com tabelas completas para preenchimento.'
      + ' Projecto: 7 etapas, criterios com %, exemplo resolvido.'
      + ' No final escreve apenas: === FIM PARTE 2 ===',

    papel + '\n\n' + estrutura + '\n\n'
      + 'Continua o manual ' + modulo.id + ' — ' + modulo.nome + '.'
      + ' INSTRUCAO: Escreve agora a PARTE IV (10 fichas tecnicas) e PARTE V (questionario, glossario, sintese, bibliografia, anexos, indice final).'
      + ' No final escreve apenas: === FIM MANUAL ===',
  ];

  return prompts;
}

async function gerarManualCompleto(modulo: ModuloCronograma, anoLetivo: string): Promise<string> {
  const todasFichas = getFichasProducao();
  const ucIdRef = modulo.tipo === 'UC' ? modulo.id : (EQUIVALENCIAS_UFCD_UC[modulo.id]?.[0] || null);
  const fichasUC = todasFichas.filter((f: any) =>
    (f.ucsAssociadas || []).includes(modulo.id) ||
    (ucIdRef ? (f.ucsAssociadas || []).includes(ucIdRef) : false)
  );
  const fichasApp = fichasUC.slice(0, 14).map((f: any) => ({
    nomePrato: f.nomePrato, numPorcoes: f.numPorcoes || '4',
    tempoPrep: f.tempoPrep || '', tempoConf: f.tempoConf || '',
    ingredientes: (f.ingredientes || []).map((i: any) => ({ produto: i.produto || '', quantidade: i.quantidade || '', unidade: i.unidade || '' })),
    preparacao:   (f.preparacao   || []).map((p: any) => ({ descricao: p.descricao || '', haccp: p.haccp || '' })),
    empratamento: f.empratamento || '', alergenicos: f.alergenicos || [],
  }));

  const prompts = construirPrompts(modulo, anoLetivo);
  return await chamarManualViaGS(prompts);
}

// Exportar para Google Doc via modelo oficial ECL
async function exportarParaDrive(modulo: ModuloCronograma, anoLetivo: string, textoGuia: string): Promise<string> {
  const payload = {
    moduloId:        modulo.id,
    moduloNome:      modulo.nome,
    titulo:          modulo.nome.split(' ').slice(-3).join(' '), // titulo curto para capa
    disciplina:      modulo.disciplina,
    horasPrevistas:  modulo.horasPrevistas,
    turmaAno:        modulo.turmaAno,
    anoLetivo:       anoLetivo,
    textoGuia:       textoGuia,
  };
  const resp = await fetch(GS_URL, { method: 'POST', body: JSON.stringify(payload) });
  if (!resp.ok) throw new Error('Erro no servidor: ' + resp.status);
  const data = await resp.json();
  if (!data.ok) throw new Error(data.erro || 'Erro desconhecido');
  return data.url || '';
}

// ── Renderizador simples de markdown para manuais ─────────────
function RenderizadorManual({ texto }: { texto: string }) {
  if (!texto) return null;
  const linhas = texto.split('\n');
  const elementos: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < linhas.length) {
    const l = linhas[i];

    // H1
    if (l.startsWith('# ') && !l.startsWith('## ')) {
      elementos.push(<h2 key={key++} style={{ fontSize: 18, fontWeight: 800, color: '#00796B',
        borderBottom: '2px solid #00796B', paddingBottom: 6, marginTop: 24, marginBottom: 10 }}>
        {l.slice(2).trim()}
      </h2>);
      i++; continue;
    }
    // H2
    if (l.startsWith('## ') && !l.startsWith('### ')) {
      elementos.push(<h3 key={key++} style={{ fontSize: 15, fontWeight: 700, color: '#00796B',
        marginTop: 18, marginBottom: 6 }}>
        {l.slice(3).trim()}
      </h3>);
      i++; continue;
    }
    // H3
    if (l.startsWith('### ')) {
      elementos.push(<h4 key={key++} style={{ fontSize: 13, fontWeight: 700, color: '#2E2A26',
        marginTop: 12, marginBottom: 4 }}>
        {l.slice(4).trim()}
      </h4>);
      i++; continue;
    }

    // Caixa de destaque (emoji no início)
    const mCaixa = l.match(/^(🎯|💡|✏️|⚠️|🌡️|👨‍🍳|📌|🔬)\s+(.+)$/);
    if (mCaixa) {
      const corBorda = mCaixa[1] === '⚠️' || mCaixa[1] === '🌡️' ? '#c0392b' :
                       mCaixa[1] === '✏️' ? '#4E7A25' : '#00796B';
      const conteudo: string[] = [];
      i++;
      while (i < linhas.length && linhas[i].trim() !== '' && !linhas[i].startsWith('#')) {
        conteudo.push(linhas[i].trim()); i++;
      }
      elementos.push(<div key={key++} style={{ borderLeft: '4px solid ' + corBorda,
        background: '#f0faf8', borderRadius: '0 8px 8px 0', padding: '10px 14px',
        marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: corBorda, fontSize: 12, marginBottom: 4 }}>
          {mCaixa[1]} {mCaixa[2]}
        </div>
        {conteudo.map((c, ci) => <div key={ci} style={{ fontSize: 12, color: '#2E2A26',
          lineHeight: 1.5 }}>{c.replace(/^[•\-]\s*/, '')}</div>)}
      </div>);
      continue;
    }

    // Tabela markdown
    if (l.startsWith('|') && l.endsWith('|')) {
      const headers = l.split('|').slice(1, -1).map(c => c.trim());
      i++;
      if (i < linhas.length && /^\|[-| ]+\|$/.test(linhas[i])) i++;
      const rows: string[][] = [];
      while (i < linhas.length && linhas[i].startsWith('|')) {
        rows.push(linhas[i].split('|').slice(1, -1).map(c => c.trim()));
        i++;
      }
      elementos.push(<div key={key++} style={{ overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>{headers.map((h, hi) => <th key={hi} style={{ background: '#00796B',
              color: '#fff', padding: '6px 10px', textAlign: 'left', fontWeight: 700 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? '#e0f2f1' : '#fff' }}>
              {r.map((c, ci) => <td key={ci} style={{ padding: '5px 10px', borderBottom: '1px solid #b2dfdb' }}>{c}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>);
      continue;
    }

    // Lista
    if (/^[•\-]\s+/.test(l)) {
      const itens: string[] = [];
      while (i < linhas.length && /^[•\-]\s+/.test(linhas[i])) {
        itens.push(linhas[i].replace(/^[•\-]\s+/, '')); i++;
      }
      elementos.push(<ul key={key++} style={{ paddingLeft: 20, marginBottom: 8 }}>
        {itens.map((it, ii) => <li key={ii} style={{ fontSize: 13, color: '#2E2A26',
          lineHeight: 1.6, marginBottom: 2 }}>{it}</li>)}
      </ul>);
      continue;
    }

    // Separador
    if (/^[-=]{3,}$/.test(l.trim())) {
      elementos.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid #b2dfdb',
        margin: '12px 0' }} />);
      i++; continue;
    }

    // Parágrafo
    if (l.trim()) {
      elementos.push(<p key={key++} style={{ fontSize: 13, color: '#2E2A26', lineHeight: 1.7,
        marginBottom: 6, textAlign: 'justify' }}>
        {l.replace(/\*\*(.+?)\*\*/g, '$1').trim()}
      </p>);
    }
    i++;
  }

  return <div style={{ padding: '4px 0' }}>{elementos}</div>;
}

// ── Card de entrada ────────────────────────────────────────────
function CardManual({ entrada, onAbrir, onEditar, onApagar, modoProf }: {
  entrada: EntradaManual; onAbrir: () => void;
  onEditar?: () => void; onApagar?: () => void; modoProf: boolean;
}) {
  const nivel = CORES_NIVEL[entrada.nivel];
  const icone = ICONES_CATEGORIA[entrada.categoria];
  return (
    <div onClick={onAbrir} style={{
      background: '#fff', borderRadius: 14, border: '1px solid rgba(26,23,20,0.1)',
      padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
