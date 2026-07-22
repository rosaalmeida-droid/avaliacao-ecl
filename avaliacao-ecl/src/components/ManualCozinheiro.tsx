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
      marginBottom: 8, boxShadow: '0 1px 4px rgba(26,23,20,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: COR_DOURADO_P, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22,
        }}>{icone}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COR_PRIMARIA, marginBottom: 4 }}>
            {entrada.titulo}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
              background: COR_DOURADO_P, color: COR_DOURADO, fontWeight: 600 }}>
              {entrada.categoria}
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
              background: (nivel as any).bg, color: (nivel as any).cor, fontWeight: 600 }}>
              {entrada.nivel}
            </span>
          </div>
          {entrada.palavrasChave.length > 0 && (
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)' }}>
              🏷️ {entrada.palavrasChave.slice(0, 4).join(' · ')}
            </div>
          )}
        </div>
        <span style={{ fontSize: 20, color: 'rgba(26,23,20,0.2)', alignSelf: 'center' }}>›</span>
      </div>
      {modoProf && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10,
          borderTop: '1px solid rgba(26,23,20,0.06)' }}
          onClick={e => e.stopPropagation()}>
          <button onClick={onEditar} style={{ padding: '5px 12px', borderRadius: 7,
            border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
            color: 'rgba(26,23,20,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✏️ Editar
          </button>
          <button onClick={onApagar} style={{ padding: '5px 12px', borderRadius: 7,
            border: '1px solid rgba(192,57,43,0.3)', background: '#fdf0ef',
            color: '#c0392b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🗑️ Apagar
          </button>
          <span style={{ fontSize: 11, color: 'rgba(26,23,20,0.3)', alignSelf: 'center', marginLeft: 'auto' }}>
            {fmtData(entrada.criadoEm)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Formulário de criação/edição ───────────────────────────────
function FormularioManual({ entrada, onGuardar, onCancelar, nomeProfessor }: {
  entrada?: EntradaManual; onGuardar: (e: EntradaManual) => void;
  onCancelar: () => void; nomeProfessor: string;
}) {
  const ANOS = (() => {
    const hoje = new Date();
    const ano  = hoje.getFullYear();
    const mes  = hoje.getMonth() + 1;
    const anoInicio = mes >= 9 ? ano : ano - 1;
    const anos = [];
    for (let i = -3; i <= 2; i++) {
      const a = anoInicio + i;
      anos.push(a + '-' + (a + 1));
    }
    return anos;
  })();
  const [anoLetivo, setAnoLetivo] = useState(ANO_LETIVO);
  const [turmaSel, setTurmaSel] = useState<1 | 2 | 3 | null>(null);
  const [moduloSel, setModuloSel] = useState<ModuloCronograma | null>(null);

  // Campos do formulário
  const [titulo, setTitulo]       = useState(entrada?.titulo || '');
  const [categoria, setCategoria] = useState<CategoriaManual>(entrada?.categoria || 'Higiene e Preparação');
  const [nivel, setNivel]         = useState<NivelManual>(entrada?.nivel || 'Base');
  const [palavras, setPalavras]   = useState(entrada?.palavrasChave.join(', ') || '');
  const [texto, setTexto]         = useState(entrada?.textoGuia || '');
  const [erro, setErro]           = useState('');

  const modulosDaTurma = useMemo(() =>
    turmaSel ? CRONOGRAMA_2026_2027.filter(m => m.turmaAno === turmaSel) : [],
    [turmaSel]);

  const CATEGORIA_POR_UC: Partial<Record<string, CategoriaManual>> = {
    'UC03576': 'Métodos de Confeção',
    'UC01999': 'Métodos de Confeção',
    'UC03577': 'Métodos de Confeção',
    'UC02002': 'Métodos de Confeção',
    'UC02003': 'Métodos de Confeção',
    'UC02004': 'Métodos de Confeção',
    'UC02005': 'Pastelaria e Doçaria',
    'UC03578': 'Outro',
    'UC00596': 'Outro',
    'UC03579': 'Conservação e Armazenamento',
    'UC03580': 'Outro',
    'UC03581': 'Métodos de Confeção',
    'UC03582': 'Métodos de Confeção',
    'UC00039': 'Segurança Alimentar',
    'UC03584': 'Segurança Alimentar',
    'UC03585': 'Conservação e Armazenamento',
    'UC03586': 'Pastelaria e Doçaria',
    'UC03588': 'Métodos de Confeção',
    'UC03589': 'Outro',
    'UC03590': 'Métodos de Confeção',
    'UC03591': 'Métodos de Confeção',
    'UC03592': 'Pastelaria e Doçaria',
    'UC03593': 'Pastelaria e Doçaria',
    'UC03595': 'Métodos de Confeção',
    'UC03596': 'Métodos de Confeção',
    'UC00031': 'Outro', 'UC00032': 'Outro', 'UC00034': 'Outro',
    'UC00035': 'Outro', 'UC00038': 'Outro', 'UC00054': 'Outro',
    'UC00056': 'Outro', 'UC00068': 'Outro', 'UC00069': 'Outro',
    'UC00077': 'Outro', 'UC00595': 'Outro',
    'UFCD 12': 'Métodos de Confeção',
    'UFCD 14': 'Métodos de Confeção',
    'UFCD 15': 'Métodos de Confeção',
    'UFCD 16': 'Métodos de Confeção',
    'UFCD 17': 'Métodos de Confeção',
    'UFCD 18': 'Métodos de Confeção',
    'UFCD 19': 'Métodos de Confeção',
    'UFCD 20': 'Pastelaria e Doçaria',
    'UFCD 21.1': 'Pastelaria e Doçaria',
    'UFCD 21.2': 'Pastelaria e Doçaria',
    'UFCD 22.1': 'Pastelaria e Doçaria',
    'UFCD 22.2': 'Pastelaria e Doçaria',
    'UFCD 23': 'Pastelaria e Doçaria',
    'UFCD 01': 'Outro', 'UFCD 04': 'Outro', 'UFCD 07': 'Outro',
    'UFCD 08': 'Outro', 'UFCD 09': 'Outro', 'UFCD 24': 'Outro',
    'UFCD 52': 'Outro', 'UFCD 53.1': 'Outro', 'UFCD 57': 'Outro',
  };

  function selecionarModulo(m: ModuloCronograma) {
    setModuloSel(m);
    setTitulo(m.nome);
    setCategoria((CATEGORIA_POR_UC[m.id] ?? 'Outro') as CategoriaManual);
    setNivel(m.turmaAno === 1 ? 'Base' : m.turmaAno === 2 ? 'Intermédio' : 'Avançado');
    setPalavras(m.nome.split(' ').filter((w: string) => w.length > 4).slice(0, 5).join(', '));
  }

  function guardar() {
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return; }
    if (!texto.trim()) { setErro('O conteúdo é obrigatório.'); return; }
    const agora = new Date().toISOString();
    onGuardar({
      id: entrada?.id || gerarId(),
      titulo: titulo.trim(),
      categoria,
      nivel,
      palavrasChave: palavras.split(',').map((p: string) => p.trim()).filter(Boolean),
      textoGuia: texto.trim(),
      criadoEm: entrada?.criadoEm || agora,
      criadoPor: nomeProfessor || "admin",
      atualizadoEm: agora,
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={onCancelar} style={{ background: 'rgba(26,23,20,0.06)',
          border: 'none', borderRadius: 8, padding: '7px 14px',
          cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Voltar</button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18,
          fontWeight: 700, color: COR_PRIMARIA }}>
          {entrada ? 'Editar entrada' : 'Nova entrada do Manual'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!entrada && (
          <div style={{ background: COR_IA_P, borderRadius: 14,
            border: `1.5px solid ${COR_IA}30`, padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COR_IA, marginBottom: 12 }}>
              ✨ Gerar guião de módulo com IA
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ano Lectivo
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ANOS.map(a => (
                  <button key={a} onClick={() => setAnoLetivo(a)} style={{
                    padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    fontWeight: 700, border: `2px solid ${anoLetivo === a ? COR_IA : 'rgba(26,23,20,0.15)'}`,
                    background: anoLetivo === a ? COR_IA : '#fff',
                    color: anoLetivo === a ? '#fff' : COR_PRIMARIA,
                  }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Selecione o Módulo / Turma
              </label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {[1, 2, 3].map((t) => (
                  <button key={t} onClick={() => { setTurmaSel(t as 1|2|3); setModuloSel(null); }} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: turmaSel === t ? COR_IA : '#fff',
                    color: turmaSel === t ? '#fff' : COR_PRIMARIA,
                    border: '1px solid rgba(26,23,20,0.15)'
                  }}>
                    {t}º Ano
                  </button>
                ))}
              </div>

              {turmaSel && (
                <select 
                  onChange={(e) => {
                    const m = modulosDaTurma.find(mod => mod.id === e.target.value);
                    if (m) selecionarModulo(m);
                  }}
                  value={moduloSel?.id || ''}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontSize: 13 }}
                >
                  <option value="">-- Selecione uma UC/UFCD --</option>
                  {modulosDaTurma.map(m => (
                    <option key={m.id} value={m.id}>{m.id} - {m.nome}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Título</label>
          <input 
            type="text" 
            value={titulo} 
            onChange={e => setTitulo(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Categoria</label>
            <select 
              value={categoria} 
              onChange={e => setCategoria(e.target.value as CategoriaManual)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontSize: 13 }}
            >
              {CATEGORIAS_MANUAL.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Nível</label>
            <select 
              value={nivel} 
              onChange={e => setNivel(e.target.value as NivelManual)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontSize: 13 }}
            >
              <option value="Base">Base</option>
              <option value="Intermédio">Intermédio</option>
              <option value="Avançado">Avançado</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Palavras-Chave (separadas por vírgula)</label>
          <input 
            type="text" 
            value={palavras} 
            onChange={e => setPalavras(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Conteúdo do Guia / Manual</label>
          <textarea 
            rows={12} 
            value={texto} 
            onChange={e => setTexto(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontSize: 13, fontFamily: 'monospace' }}
          />
        </div>

        {erro && <div style={{ color: '#c0392b', fontSize: 13, fontWeight: 600 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={onCancelar} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', background: '#fff', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: COR_DOURADO, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────
export default function ManualCozinheiro({ modoProf, nomeProfessor }: { modoProf: boolean; nomeProfessor: string }) {
  const [entradas, setEntradas] = useState<EntradaManual[]>(getEntradasManual());
  const [pesquisa, setPesquisa] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');
  const [entradaAtiva, setEntradaAtiva] = useState<EntradaManual | null>(null);
  const [editando, setEditando] = useState(false);
  const [novaEntrada, setNovaEntrada] = useState(false);

  const entradasFiltradas = useMemo(() => {
    let res = pesquisarManual(pesquisa);
    if (categoriaFiltro !== 'Todas') {
      res = res.filter(e => e.categoria === categoriaFiltro);
    }
    return res;
  }, [pesquisa, categoriaFiltro, entradas]);

  function handleGuardar(e: EntradaManual) {
    addEntradaManual(e);
    setEntradas(getEntradasManual());
    setEditando(false);
    setNovaEntrada(false);
    setEntradaAtiva(e);
  }

  function handleApagar(id: string) {
    if (confirm('Tem a certeza que deseja apagar esta entrada?')) {
      deleteEntradaManual(id);
      setEntradas(getEntradasManual());
      if (entradaAtiva?.id === id) setEntradaAtiva(null);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      {novaEntrada || editando ? (
        <FormularioManual 
          entrada={editando ? entradaAtiva || undefined : undefined} 
          onGuardar={handleGuardar} 
          onCancelar={() => { setEditando(false); setNovaEntrada(false); }} 
          nomeProfessor={nomeProfessor} 
        />
      ) : entradaAtiva ? (
        <div>
          <button onClick={() => setEntradaAtiva(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: COR_DOURADO, fontWeight: 700, marginBottom: 14 }}>
            ← Voltar à lista
          </button>
          <div style={{ background: '#fff', padding: 24, borderRadius: 14, border: '1px solid rgba(26,23,20,0.1)' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: COR_PRIMARIA, marginBottom: 8 }}>{entradaAtiva.titulo}</h1>
            <RenderizadorManual texto={entradaAtiva.textoGuia} />
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: COR_PRIMARIA }}>Manual do Cozinheiro</h1>
              <p style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)' }}>Repositório de guiões e módulos técnicos</p>
            </div>
            {modoProf && (
              <button onClick={() => setNovaEntrada(true)} style={{ background: COR_DOURADO, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                + Nova Entrada
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input 
              type="text" 
              placeholder="Pesquisar manual..." 
              value={pesquisa} 
              onChange={e => setPesquisa(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontSize: 13 }}
            />
            <select 
              value={categoriaFiltro} 
              onChange={e => setCategoriaFiltro(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontSize: 13 }}
            >
              <option value="Todas">Todas as categorias</option>
              {CATEGORIAS_MANUAL.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            {entradasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(26,23,20,0.4)', fontSize: 14 }}>
                Nenhuma entrada encontrada.
              </div>
            ) : (
              entradasFiltradas.map(e => (
                <CardManual 
                  key={e.id} 
                  entrada={e} 
                  modoProf={modoProf}
                  onAbrir={() => setEntradaAtiva(e)} 
                  onEditar={() => { setEntradaAtiva(e); setEditando(true); }}
                  onApagar={() => handleApagar(e.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Exportação Nomeada para compatibilidade ─────────────────────
export { ManualCozinheiro };
