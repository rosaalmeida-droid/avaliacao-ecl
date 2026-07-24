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
import { abrirIA } from '../abrirIA';
import { EQUIVALENCIAS_UFCD_UC } from '../cronograma';
import { getReferencialUC } from '../referencial811RA144';
import { getFichasProducao } from '../backend';
import { CRONOGRAMA_2026_2027, ANO_LETIVO, ModuloCronograma } from '../cronograma';

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
const GS_URL = '/api/gerarManual'; // proxy Vercel

async function gerarManualCompleto(modulo: ModuloCronograma, anoLetivo: string): Promise<string> {
  const payload = {
    acao: 'gerarGuiaoIA',
    prompt: {
      moduloNome:      modulo.nome,
      moduloId:        modulo.id,
      disciplina:      modulo.disciplina,
      horasPrevistas:  modulo.horasPrevistas,
      turmaAno:        modulo.turmaAno,
      anoLetivo:       anoLetivo,
      referencial:     modulo.tipo === 'UC' ? '811RA144' : '811183',
    },
  };
  const resp = await fetch(GS_URL, { method: 'POST', body: JSON.stringify(payload) });
  if (!resp.ok) throw new Error('Erro no servidor: ' + resp.status);
  const data = await resp.json();
  if (!data.ok) throw new Error(data.erro || 'Erro desconhecido');
  return data.texto || '';
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
// Não usa o GuiaProducao (que é para fichas de produção).
// Renderiza: títulos H1/H2/H3, tabelas, listas, caixas de destaque, parágrafos.
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
        {l.replace(/\*\*(.+?)\*\*/g, '**$1**').trim()}
      </p>);
    }
    i++;
  }

  return <div style={{ padding: '4px 0' }}>{elementos}</div>;
}


// ── Conhecimento específico por tema ──────────────────────────
function blocoConhecimento(moduloNome: string): string {
  const n = moduloNome.toLowerCase();
  if (n.includes('cozinha tradicional portuguesa') || n.includes('iguarias')) {
    return [
      'FOCO DESTA UC — desenvolve com profundidade etnográfica (não só receitas):',
      'Para cada região: contexto humano, geográfico, económico e cultural que criou os pratos.',
      'O que está por trás de cada prato — condições de vida, memória colectiva, recursos locais.',
      '',
      'MINHO: pobreza rural, milho/couve/chouriço; caldo verde = sustento do trabalhador; alheira = cripto-judaísmo séc.XV',
      'TRÁS-OS-MONTES: isolamento secular; posta mirandesa (raça DOP, grelha 250°C); alheira de Mirandela DOP',
      'BEIRAS: leitão da Bairrada (raça bísaro, forno lenha, pele estaladiça); chanfana (cabra velha + barro negro + vinho 4-6h); queijo Serra Estrela DOP (cardo coagulante)',
      'LISBOA: tabernas séc.XIX; bacalhau à Brás = restos criativos; iscas = vísceras baratas; cozido = refeição de domingo',
      'ALENTEJO: pastor com recursos mínimos; açorda = pão velho + alho + coentros + ovo; porco ibérico do montado de azinha',
      'ALGARVE: herança árabe (amêndoa, figo); cataplana (câmara de vapor em cobre); xerem com conquilhas',
      'AÇORES: cozido das Furnas (vulcão = forno); alcatra terceirense; ananás DOP',
      'MADEIRA: peixe-espada preto (1000m profundidade) com banana; espetada em pau de louro',
      '',
      'TÉCNICAS DESTA UC: refogado base, caldeiradas, bacalhau (7 métodos), cozido, assados regionais',
      'HIGIENE: temperaturas HACCP específicas, alergénios, rastreabilidade, redução do desperdício',
    ].join('\n');
  }

  if (n.includes('peixes') || n.includes('mariscos')) {
    return 'Classifica: osseos redondos, achatados, cartilaginosos, cefalopodes, crustaceos, bivalves. Frescura: olhos, guelras, cheiro. Anisakis: -20C/24h. Tamanhos mínimos legais. Técnicas de preparação por espécie. Sazonalidade mês a mês.';
  }
  if (n.includes('carnes') || n.includes('aves')) {
    return 'Cortes bovinos/suínos/ovinos com diagrama. Temperatura interna mínima por espécie. DOP: Bísaro, Barrosão, Alentejano. Maturação a seco vs húmida. Aves: Salmonella/Campylobacter min 82°C.';
  }
  if (n.includes('pastelaria') || n.includes('doc') || n.includes('doç')) {
    return [
      'CONHECIMENTO ESPECÍFICO — PASTELARIA E DOÇARIA TRADICIONAL PORTUGUESA:',
      '',
      'DOÇARIA CONVENTUAL (desenvolve com máxima profundidade):',
      'Referências obrigatórias: Virgílio Nogueiro Gomes ("A Cozinha Afro-Atlântica"), Maria de Lourdes Modesto ("Cozinha Tradicional Portuguesa"), José Quitério ("Livro de Bem Comer").',
      'A génese: claras para engomar hábitos e clarificar vinhos → sobra de gemas → laboratórios conventuais de doçaria.',
      'O açúcar: cana-de-açúcar da Madeira (séc.XV) e Brasil (séc.XVI) + amêndoa árabe = doçaria conventual única na Europa.',
      '',
      'DOCES E CONVENTOS DE ORIGEM (desenvolve cada um com história completa):',
      'Pastéis de Belém — Mosteiro dos Jerónimos, Lisboa (1837, receita secreta dos monges)',
      'Toucinho-do-Céu — Convento de Santa Clara, Guimarães (gema + amêndoa + açúcar)',
      'Barriga de Freira — Convento de Braga (pão-de-ló enriquecido com gemas)',
      'Papos-de-Anjo — Convento de Odivelas (gemas batidas em calda)',
      'Ovos Moles — Convento de Jesus, Aveiro (gemas + açúcar, hóstias como embalagem)',
      'Dom Rodrigo — Algarve, influência árabe (fios de ovos + amêndoa)',
      'Queijadas de Sintra — Sintra (queijo fresco + gemas, receita medieval)',
      'Trouxas das Caldas — Caldas da Rainha (claras batidas em calda)',
      'Jesuítas — Porto (massa folhada + creme de gemas + fondant)',
      'Bolo de Mel — Madeira (melaço de cana + especiarias, conserva 1 ano)',
      '',
      'CIÊNCIA DOS INGREDIENTES:',
      'Açúcar: pontos de calda — pérola 100°C, fio fraco 103°C, fio forte 107°C, bola mole 115°C, bola dura 121°C, rebuçado 135°C, caramelo claro 160°C, caramelo escuro 180°C.',
      'Ovos: gema (emulsionante — lecitina); clara (espumante — ovoalbumina coagula a 62°C); funções na doçaria.',
      'Farinha: proteínas (glutenina + gliadina) formam glúten por hidratação + trabalho mecânico; T55 vs T65 vs Manitoba.',
      'Amêndoa: influência árabe; composição (50% gordura, 20% proteína); usos em massas, cremes e coberturas.',
      'Gorduras: manteiga (84% mg, emulsão, aroma); margarina; banha (doçaria conventual do interior).',
      '',
      'MASSAS BASE (desenvolve cada uma com ciência e técnica):',
      'Massa folhada: 27 camadas de gordura, laminagem (6 voltas simples ou 4 duplas), manteiga a 16-18°C.',
      'Massa quebrada doce/salgada: método areia vs método creme; glúten mínimo = textura quebradiça.',
      'Massa choux: vapor de água como fermento; proporção base 1:1:1:2 (água:gordura:farinha:ovos).',
      'Massa brioche: glúten desenvolvido + manteiga em pomada; fermentação dupla.',
      'Biscuit joconde, genoise, dacquoise: diferenças técnicas e aplicações.',
      '',
      'CREMES E RECHEIOS:',
      'Creme pasteleiro: gelatinização do amido (85°C); arrefecimento rápido obrigatório (<10°C em 2h).',
      'Creme de manteiga: mousselina, alemão, italiano, suíço.',
      'Ganache: emulsificação chocolate/natas; proporções por consistência.',
      'Fios de ovos: técnica árabe-portuguesa; calda de ponto de fio + gemas peneiradas.',
    ].join('\n');
  }
  return 'Desenvolve o tema com profundidade técnica, científica e cultural. Explica sempre o porquê de cada técnica.';
}

// ── Prompt único — focado nos conhecimentos reais da UC ──────
function construirPromptUnico(modulo: ModuloCronograma, anoLetivo: string): string {
  const ref_    = modulo.tipo === 'UC' ? '811RA144' : '811183';
  const ucIdRef = modulo.tipo === 'UC' ? modulo.id : (EQUIVALENCIAS_UFCD_UC[modulo.id]?.[0] || null);
  const ref     = ucIdRef ? getReferencialUC(ucIdRef) : null;

  // Competências reais do referencial — é isto que difere de UC para UC
  const realizacoes   = (ref?.realizacoes || []).map((r: string) => '- ' + r).join('\n');
  const criterios     = (ref?.criteriosDesempenho || []).map((r: string) => '- ' + r).join('\n');
  const conhecimentos = (ref?.conhecimentos || []).map((r: string) => '- ' + r).join('\n');

  // Conhecimento específico do tema
  const tema = blocoConhecimento(modulo.nome);

  return [
    '# MANUAL DO ALUNO — ' + modulo.id + ' — ' + modulo.nome.toUpperCase(),
    'Escola de Comércio de Lisboa | Referencial ' + ref_ + ' | Ano Lectivo 2026-2027',
    '',
    'INSTRUÇÃO CRÍTICA:',
    'Escreve DIRECTAMENTE o conteúdo. Sem introdução, sem "vou escrever", sem índice no início.',
    'Mínimo 30 páginas. Cada tema com texto denso e contínuo — nunca listas de 3 linhas.',
    'Português europeu pré-Acordo (confecção, objectivo, actual, técnico).',
    'O aluno deve aprender factos concretos — nunca frases genéricas.',
    '',
    '# CONHECIMENTOS DESTA UC QUE TENS DE DESENVOLVER EXAUSTIVAMENTE:',
    '',
    'O QUE O ALUNO DEVE SABER FAZER:',
    realizacoes || '- ver referencial',
    '',
    'CRITÉRIOS DE DESEMPENHO:',
    criterios || '- ver referencial',
    '',
    'CONHECIMENTOS ESPECÍFICOS DESTA UC:',
    conhecimentos || '- ver referencial',
    '',
    tema,
    '',
    '# COMO DESENVOLVER:',
    '',
    'Para cada conhecimento acima:',
    '- Explica em profundidade — o que é, de onde vem, como funciona, porque importa',
    '- Contextualiza historicamente e culturalmente',
    '- Explica a ciência por trás (reacções químicas, temperaturas, transformações)',
    '- Dá exemplos concretos reais desta UC',
    '- Inclui tabelas de 4 colunas quando compara produtos, técnicas ou temperaturas',
    '- Caixas [DICA DO CHEF] [CIÊNCIA NA COZINHA] [HACCP] [SABIA QUE] [ERROS FREQUENTES]',
    '- HACCP integrado: temperaturas reais, pontos críticos específicos desta UC',
    '',
    'NO FIM (não no início):',
    '- 4 receitas emblemáticas desta UC com contexto cultural + ficha técnica',
    '- 8 questões de revisão',
    '- Glossário 10 termos',
    '- Índice',
  ].join('\n');
}


// ── Prompt opcional — fichas técnicas ────────────────────────
function construirPromptFichasTecnicas(modulo: ModuloCronograma): string {
  return [
    'Escreve 10 FICHAS TÉCNICAS DE RECEITA completas e específicas para:',
    modulo.id + ' — ' + modulo.nome,
    '',
    'FORMATO OBRIGATÓRIO DE CADA FICHA:',
    '',
    '## FICHA TÉCNICA N.º [X] — [Nome da Receita]',
    '**Origem/Região:** [onde nasceu este prato e porquê]',
    '',
    '| Campo | Informação |',
    '|---|---|',
    '| Doses | 4 |',
    '| Tempo de preparação | [x] min |',
    '| Tempo de confecção | [x] min |',
    '| Método culinário | [método] |',
    '| Custo aproximado | [€] |',
    '| Dificuldade | [Fácil/Médio/Difícil] |',
    '',
    '**INGREDIENTES:**',
    '| Ingrediente | Quant. Bruta | Quant. Líquida | Observações |',
    '|---|---|---|---|',
    '',
    '**PREPARAÇÃO** (passo a passo com temperaturas):',
    '1. ...',
    '',
    '**PONTO CRÍTICO HACCP:**',
    '| Etapa | Perigo | Limite Crítico | Medida Correctiva |',
    '|---|---|---|---|',
    '',
    '**NOTA DO CHEF:** [conselho técnico e erro mais comum a evitar]',
    '',
    'As 10 fichas devem ser as mais representativas desta UC/UFCD.',
    'Para cozinha portuguesa: 1 sopa, 2 pratos de peixe, 2 pratos de carne, 2 pratos regionais, 1 guarnição, 2 sobremesas.',
    'Português europeu pré-Acordo.',
  ].join('\n');
}

// ── Prompt opcional — fichas de trabalho ─────────────────────
function construirPromptFichasTrabalho(modulo: ModuloCronograma): string {
  return [
    'Cria 3 FICHAS DE TRABALHO completas para alunos do curso profissional:',
    modulo.id + ' — ' + modulo.nome,
    '',
    '---',
    '## FICHA DE TRABALHO N.º 1 — Avaliação de Matérias-Primas',
    '',
    'Nome: ___________________________ Data: _______ Turma: _____',
    '',
    'Preenche a tabela de avaliação organoléptica para os produtos desta UC:',
    '| Produto | Aspecto | Cheiro | Textura | Cor | Temperatura | Conforme? |',
    '|---|---|---|---|---|---|---|',
    '[cria 8 linhas em branco específicas para esta UC]',
    '',
    'Questões:',
    '1. Quais os critérios mais importantes para avaliar a frescura de [produto específico]?',
    '   Resposta: _______________________________________________',
    '2. A que temperatura deve estar [produto] na recepção? ___°C',
    '3. O que fazes se um produto não cumprir os critérios? _______',
    '',
    '---',
    '## FICHA DE TRABALHO N.º 2 — Cálculo de Rendimento e Custo',
    '',
    'Nome: ___________________________ Data: _______ Turma: _____',
    '',
    'Fórmula: IR = (Peso Líquido ÷ Peso Bruto) × 100',
    '',
    'Exercício 1: Calcula o índice de rendimento e custo por dose:',
    '| Ingrediente | Peso Bruto | Preço/kg | Peso Líquido | IR% | Custo por dose |',
    '|---|---|---|---|---|---|',
    '[cria 6 linhas com ingredientes específicos desta UC, deixa as colunas em branco]',
    '',
    'Custo total por dose: ______ €',
    'Food cost (objectivo máximo 30%): ______ %',
    '',
    '---',
    '## FICHA DE TRABALHO N.º 3 — Análise Sensorial e Empratamento',
    '',
    'Nome: ___________________________ Data: _______ Turma: _____',
    '',
    'Prato avaliado: _________________________',
    '',
    '| Critério | 1 (Mau) | 2 (Suficiente) | 3 (Bom) | 4 (Muito Bom) | 5 (Excelente) |',
    '|---|---|---|---|---|---|',
    '| Aspecto visual | | | | | |',
    '| Cor e apresentação | | | | | |',
    '| Aroma | | | | | |',
    '| Sabor | | | | | |',
    '| Textura | | | | | |',
    '| Temperatura de serviço | | | | | |',
    '| Empratamento | | | | | |',
    '',
    'Pontuação total: ______ / 35',
    'Observações e sugestões de melhoria: ___________________________',
    '',
    'Português europeu pré-Acordo.',
  ].join('\n');
}


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
              background: nivel.bg, color: nivel.cor, fontWeight: 600 }}>
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
  // Seleção de UC/UFCD
  // Anos letivos disponíveis — 3 anteriores + actual + 2 seguintes
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
  const [gerandoIA, setGerandoIA] = useState(false);
  const [faseIA, setFaseIA]       = useState('');

  // Módulos filtrados por turma
  const modulosDaTurma = useMemo(() =>
    turmaSel ? CRONOGRAMA_2026_2027.filter(m => m.turmaAno === turmaSel) : [],
    [turmaSel]);

  // Mapa UC/UFCD → CategoriaManual (baseado no referencial real 811RA144 e 811183)
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

  async function gerarManual() {
    if (!moduloSel) { setErro('Selecciona um modulo do cronograma primeiro.'); return; }
    setGerandoIA(true);
    setFaseIA('Parte 1/5 - Introducao e HACCP...');
    setErro('');
    // Actualizar fase visualmente enquanto o GS processa (~60-90s total)
    const fases = [
      'Parte 2/5 - Metodos de confeccao e especializacao...',
      'Parte 3/5 - Fichas de trabalho e projeto...',
      'Parte 4/5 - Receitas...',
      'Parte 5/5 - Glossario, questionario e anexos...',
    ];
    let fi = 0;
    const intervalo = setInterval(() => {
      if (fi < fases.length) { setFaseIA(fases[fi]); fi++; }
    }, 18000);
    try {
      const resultado = await gerarManualCompleto(moduloSel, anoLetivo);
      clearInterval(intervalo);
      setTexto(t => t ? t + '\n\n' + resultado : resultado);
      setFaseIA('');
    } catch (e: unknown) {
      clearInterval(intervalo);
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setErro('Erro ao gerar o manual: ' + msg);
      setFaseIA('');
    } finally {
      setGerandoIA(false);
    }
  }

  function guardar() {
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return; }
    if (!texto.trim()) { setErro('O conteúdo é obrigatório.'); return; }
    const agora = new Date().toISOString();
    onGuardar({
      id: entrada?.id || gerarId(),
      titulo: titulo.trim(), categoria, nivel,
      palavrasChave: palavras.split(',').map((p: string) => p.trim()).filter(Boolean),
      textoGuia: texto.trim(),
      criadoPor: nomeProfessor,
      criadoEm: entrada?.criadoEm || agora,
      atualizadoEm: agora,
    });
  }

  const turmaLabel = (t: 1|2|3) => t === 1 ? '1º CP (UCs)' : t === 2 ? '2º CP (UFCDs)' : '3º CP (UFCDs)';

  return (
    <div>
      {/* Cabeçalho */}
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

        {/* ── SECÇÃO: Gerar a partir do cronograma ── */}
        {!entrada && (
          <div style={{ background: COR_IA_P, borderRadius: 14,
            border: `1.5px solid ${COR_IA}30`, padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COR_IA, marginBottom: 12 }}>
              ✨ Gerar guião de módulo com IA
            </div>

            {/* Ano letivo */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ano Lectivo
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {ANOS.map(a => (
                  <button key={a} onClick={() => setAnoLetivo(a)} style={{
                    padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    fontWeight: 700, border: `2px solid ${anoLetivo === a ? COR_IA : 'rgba(26,23,20,0.15)'}`,
                    background: anoLetivo === a ? COR_IA : '#fff',
                    color: anoLetivo === a ? '#fff' : 'rgba(26,23,20,0.5)',
                  }}>{a}</button>
                ))}
              </div>
            </div>

            {/* Turma */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Turma
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {([1, 2, 3] as const).map(t => (
                  <button key={t} onClick={() => { setTurmaSel(t); setModuloSel(null); }} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    fontWeight: 700, border: `2px solid ${turmaSel === t ? COR_IA : 'rgba(26,23,20,0.1)'}`,
                    background: turmaSel === t ? COR_IA_P : '#fff',
                    color: turmaSel === t ? COR_IA : 'rgba(26,23,20,0.5)',
                  }}>{turmaLabel(t)}</button>
                ))}
              </div>
            </div>

            {/* Lista de módulos */}
            {turmaSel && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                  display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  UC / UFCD
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4,
                  maxHeight: 220, overflowY: 'auto', borderRadius: 10,
                  border: '1px solid rgba(26,23,20,0.1)', background: '#fff', padding: 6 }}>
                  {modulosDaTurma.map(m => (
                    <button key={m.id} onClick={() => selecionarModulo(m)} style={{
                      textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                      border: `1.5px solid ${moduloSel?.id === m.id ? COR_IA : 'transparent'}`,
                      background: moduloSel?.id === m.id ? COR_IA_P : 'transparent',
                      cursor: 'pointer', fontSize: 12, color: COR_PRIMARIA,
                    }}>
                      <span style={{ fontWeight: 700, color: COR_IA, marginRight: 6 }}>
                        {m.tipo} {m.id.replace('UFCD ', '')}
                      </span>
                      {m.nome}
                      <span style={{ color: 'rgba(26,23,20,0.35)', marginLeft: 6, fontSize: 11 }}>
                        · {m.horasPrevistas}h · {m.disciplina}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Gerar manual — abre IA à escolha do professor */}
            {!moduloSel ? (
              <div style={{ fontSize: 12, color: 'rgba(109,40,217,0.4)', textAlign: 'center', padding: 8 }}>
                Selecciona um módulo acima para activar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)', lineHeight: 1.5 }}>
                  Escolhe a IA → gera o manual → copia o resultado → cola no campo Conteúdo abaixo → Guardar.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => abrirIA('claude', construirPromptUnico(moduloSel, anoLetivo))}
                    style={{ flex: 1, padding: '10px 4px', borderRadius: 9, border: 'none',
                      background: COR_IA, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✨ Claude
                  </button>
                  <button onClick={() => abrirIA('chatgpt', construirPromptUnico(moduloSel, anoLetivo))}
                    style={{ flex: 1, padding: '10px 4px', borderRadius: 9, border: 'none',
                      background: '#10a37f', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    💬 ChatGPT
                  </button>
                  <button onClick={() => abrirIA('gemini', construirPromptUnico(moduloSel, anoLetivo))}
                    style={{ flex: 1, padding: '10px 4px', borderRadius: 9, border: 'none',
                      background: '#4285f4', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✦ Gemini
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginTop: 4 }}>
                  Opcionais — cola o resultado no campo Conteúdo e junta ao manual:
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['claude', 'chatgpt', 'gemini'] as const).map(ia => (
                    <button key={'ft-' + ia}
                      onClick={() => abrirIA(ia, construirPromptFichasTecnicas(moduloSel))}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)',
                        background: '#fff', color: 'rgba(26,23,20,0.6)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      📋 Fichas Técnicas {ia === 'claude' ? '(Claude)' : ia === 'chatgpt' ? '(GPT)' : '(Gemini)'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['claude', 'chatgpt', 'gemini'] as const).map(ia => (
                    <button key={'fw-' + ia}
                      onClick={() => abrirIA(ia, construirPromptFichasTrabalho(moduloSel))}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)',
                        background: '#fff', color: 'rgba(26,23,20,0.6)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      📝 Fichas Trabalho {ia === 'claude' ? '(Claude)' : ia === 'chatgpt' ? '(GPT)' : '(Gemini)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Título */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
            display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Título
          </label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            placeholder="ex: Planeamento e confeção de carnes, aves e caça"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1.5px solid rgba(26,23,20,0.15)', fontSize: 14,
              fontFamily: 'var(--font-sans)' }} />
        </div>

        {/* Categoria e Nível */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
              display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Categoria
            </label>
            <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaManual)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1.5px solid rgba(26,23,20,0.15)', fontSize: 13,
                background: '#fff', fontFamily: 'var(--font-sans)' }}>
              {CATEGORIAS_MANUAL.map(c => (
                <option key={c} value={c}>{ICONES_CATEGORIA[c]} {c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
              display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nível
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['Base', 'Intermédio', 'Avançado'] as NivelManual[]).map(n => {
                const c = CORES_NIVEL[n];
                return (
                  <button key={n} onClick={() => setNivel(n)} style={{
                    flex: 1, padding: '10px 4px', borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${nivel === n ? c.cor : 'rgba(26,23,20,0.1)'}`,
                    background: nivel === n ? c.bg : '#fff',
                    color: nivel === n ? c.cor : 'rgba(26,23,20,0.5)',
                    fontSize: 11, fontWeight: 700,
                  }}>{n}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Palavras-chave */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
            display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Palavras-chave (separadas por vírgula)
          </label>
          <input value={palavras} onChange={e => setPalavras(e.target.value)}
            placeholder="ex: carnes, aves, marinadas, confeção, técnicas"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1.5px solid rgba(26,23,20,0.15)', fontSize: 13,
              fontFamily: 'var(--font-sans)' }} />
        </div>

        {/* Texto */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
            display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Conteúdo {texto ? '✓' : '— gerado pela IA ou colado manualmente'}
          </label>
          <textarea value={texto} onChange={e => setTexto(e.target.value)}
            rows={texto ? 14 : 6}
            placeholder={'Clica em "✨ Gerar guião com IA" acima, ou cola o texto manualmente.'}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10,
              border: `1.5px solid ${texto ? 'rgba(109,40,217,0.4)' : 'rgba(26,23,20,0.15)'}`,
              fontSize: 12, fontFamily: 'var(--font-mono)', resize: 'vertical', lineHeight: 1.5 }} />
        </div>

        {erro && (
          <div style={{ padding: '10px 14px', background: '#fdf0ef',
            borderRadius: 8, color: '#c0392b', fontSize: 13, fontWeight: 600 }}>
            ⚠️ {erro}
          </div>
        )}

        <button onClick={guardar} style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: COR_PRIMARIA, color: '#faf7f2', fontSize: 15,
          fontWeight: 700, cursor: 'pointer',
        }}>
          ✓ Guardar no Manual do Cozinheiro
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export function ManualCozinheiro({ modoProf, nomeProfessor }: {
  modoProf: boolean; nomeProfessor?: string;
}) {
  const [pesquisa, setPesquisa]           = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaManual | 'Todas'>('Todas');
  const [nivelFiltro, setNivelFiltro]     = useState<NivelManual | 'Todos'>('Todos');
  const [entradas, setEntradas]           = useState<EntradaManual[]>(() => getEntradasManual());
  const [modo, setModo]                   = useState<'lista' | 'ver' | 'criar' | 'editar'>('lista');
  const [entradaAtiva, setEntradaAtiva]   = useState<EntradaManual | null>(null);
  const [confirmarApagar, setConfirmarApagar] = useState<string | null>(null);

  function recarregar() { setEntradas(getEntradasManual()); }

  const resultados = useMemo(() => {
    let r = pesquisa ? pesquisarManual(pesquisa) : getEntradasManual();
    if (categoriaFiltro !== 'Todas') r = r.filter(e => e.categoria === categoriaFiltro);
    if (nivelFiltro !== 'Todos') r = r.filter(e => e.nivel === nivelFiltro);
    return r.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [pesquisa, categoriaFiltro, nivelFiltro, entradas]);

  const porCategoria = useMemo(() => {
    const grupos: Record<string, EntradaManual[]> = {};
    resultados.forEach(e => {
      if (!grupos[e.categoria]) grupos[e.categoria] = [];
      grupos[e.categoria].push(e);
    });
    return grupos;
  }, [resultados]);

  function guardarEntrada(e: EntradaManual) {
    addEntradaManual(e); recarregar(); setModo('ver'); setEntradaAtiva(e);
  }
  function apagar(id: string | null) {
    if (!id) return;
    deleteEntradaManual(id);
    recarregar();
    setConfirmarApagar(null);
    setModo('lista');
    setEntradaAtiva(null);
  }

  // ── Vista de uma entrada ────────────────────────────────────
  if (modo === 'ver' && entradaAtiva) {
    const nivel = CORES_NIVEL[entradaAtiva.nivel];
    return (
      <div>
        <div style={{ background: COR_PRIMARIA, borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
          <button onClick={() => { setModo('lista'); setEntradaAtiva(null); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: '6px 14px', color: 'rgba(247,241,230,0.7)', fontSize: 12,
              cursor: 'pointer', marginBottom: 12 }}>
            ← Manual do Cozinheiro
          </button>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100,
              background: 'rgba(255,255,255,0.12)', color: 'rgba(247,241,230,0.8)', fontWeight: 600 }}>
              {ICONES_CATEGORIA[entradaAtiva.categoria]} {entradaAtiva.categoria}
            </span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100,
              background: nivel.bg, color: nivel.cor, fontWeight: 700 }}>
              {entradaAtiva.nivel}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20,
            fontWeight: 700, color: '#faf7f2', lineHeight: 1.2 }}>
            {entradaAtiva.titulo}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(247,241,230,0.4)', marginTop: 6 }}>
            {entradaAtiva.criadoPor} · {fmtData(entradaAtiva.criadoEm)}
          </div>
          {entradaAtiva.palavrasChave.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {entradaAtiva.palavrasChave.map((p: string, i: number) => (
                <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(247,241,230,0.6)' }}>
                  #{p}
                </span>
              ))}
            </div>
          )}
        </div>
        {modoProf && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => exportarGuiaoDocx(entradaAtiva)} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(109,40,217,0.3)', background: '#ede9fe', color: '#6d28d9', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇️ Exportar .docx</button>
            <button onClick={async () => {
              try {
                const resp = await fetch(GS_URL, { method: 'POST', body: JSON.stringify({
                  moduloId: entradaAtiva.palavrasChave[0] || '',
                  moduloNome: entradaAtiva.titulo,
                  titulo: entradaAtiva.titulo,
                  disciplina: entradaAtiva.categoria,
                  horasPrevistas: '',
                  turmaAno: 1,
                  anoLetivo: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
                  textoGuia: entradaAtiva.textoGuia,
                }) });
                const data = await resp.json();
                if (data.ok) window.open(data.url, '_blank');
                else alert('Erro: ' + data.erro);
              } catch(e) { alert('Erro: ' + (e instanceof Error ? e.message : String(e))); }
            }} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(0,121,107,0.3)', background: '#e0f2f1', color: '#00796b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📄 Guardar no Drive (modelo ECL)</button>
            <button onClick={() => setModo('editar')} style={{ padding: '8px 16px',
              borderRadius: 9, border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
              color: 'rgba(26,23,20,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ✏️ Editar
            </button>
            <button onClick={() => setConfirmarApagar(entradaAtiva.id)} style={{ padding: '8px 16px',
              borderRadius: 9, border: '1px solid rgba(192,57,43,0.3)', background: '#fdf0ef',
              color: '#c0392b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              🗑️ Apagar
            </button>
          </div>
        )}
        <RenderizadorManual texto={entradaAtiva.textoGuia} />
        {confirmarApagar && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: '24px', maxWidth: 340, width: '100%' }}>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>
                Apagar esta entrada?
              </div>
              <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)', textAlign: 'center', marginBottom: 20 }}>
                "{entradaAtiva.titulo}" vai ser removida do Manual do Cozinheiro.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => apagar(confirmarApagar)} style={{ flex: 1, padding: '12px',
                  borderRadius: 10, border: 'none', background: '#c0392b',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Apagar</button>
                <button onClick={() => setConfirmarApagar(null)} style={{ flex: 1, padding: '12px',
                  borderRadius: 10, border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
                  color: 'rgba(26,23,20,0.6)', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if ((modo === 'criar' || modo === 'editar') && modoProf) {
    return (
      <FormularioManual
        entrada={modo === 'editar' ? entradaAtiva || undefined : undefined}
        onGuardar={guardarEntrada}
        onCancelar={() => setModo(entradaAtiva ? 'ver' : 'lista')}
        nomeProfessor={nomeProfessor || 'Professor'}
      />
    );
  }

  // ── Lista principal ─────────────────────────────────────────
  return (
    <div>
      <div style={{ background: COR_PRIMARIA, borderRadius: 16, padding: '20px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22,
              fontWeight: 700, color: '#faf7f2' }}>📖 Manual do Cozinheiro</div>
            <div style={{ fontSize: 12, color: 'rgba(247,241,230,0.45)', marginTop: 3 }}>
              {entradas.length} {entradas.length === 1 ? 'entrada' : 'entradas'} · Escola de Comércio de Lisboa
            </div>
          </div>
          {modoProf && (
            <button onClick={() => { setEntradaAtiva(null); setModo('criar'); }}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none',
                background: COR_DOURADO, color: '#fff', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              + Nova entrada
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(247,241,230,0.4)' }}>🔍</span>
          <input value={pesquisa} onChange={e => setPesquisa(e.target.value)}
            placeholder="Pesquisar no manual…"
            style={{ width: '100%', padding: '11px 12px 11px 38px', borderRadius: 10,
              border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.1)',
              color: '#faf7f2', fontFamily: 'var(--font-sans)' }} />
          {pesquisa && (
            <button onClick={() => setPesquisa('')}
              style={{ position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', background: 'none', border: 'none',
                color: 'rgba(247,241,230,0.5)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => setCategoriaFiltro('Todas')} style={{
          padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
          border: `1.5px solid ${categoriaFiltro === 'Todas' ? COR_PRIMARIA : 'rgba(26,23,20,0.1)'}`,
          background: categoriaFiltro === 'Todas' ? COR_PRIMARIA : '#fff',
          color: categoriaFiltro === 'Todas' ? '#fff' : 'rgba(26,23,20,0.5)', cursor: 'pointer',
        }}>Todas</button>
        {CATEGORIAS_MANUAL.filter((c: CategoriaManual) => entradas.some(e => e.categoria === c)).map((c: CategoriaManual) => (
          <button key={c} onClick={() => setCategoriaFiltro(c === categoriaFiltro ? 'Todas' : c)} style={{
            padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${categoriaFiltro === c ? COR_DOURADO : 'rgba(26,23,20,0.1)'}`,
            background: categoriaFiltro === c ? COR_DOURADO_P : '#fff',
            color: categoriaFiltro === c ? COR_DOURADO : 'rgba(26,23,20,0.5)', cursor: 'pointer',
          }}>{ICONES_CATEGORIA[c]} {c}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['Todos', 'Base', 'Intermédio', 'Avançado'] as const).map(n => {
          const ativo = nivelFiltro === n;
          const c = n !== 'Todos' ? CORES_NIVEL[n] : null;
          return (
            <button key={n} onClick={() => setNivelFiltro(n)} style={{
              padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600,
              border: `1.5px solid ${ativo ? (c?.cor || COR_PRIMARIA) : 'rgba(26,23,20,0.1)'}`,
              background: ativo ? (c?.bg || COR_PRIMARIA) : '#fff',
              color: ativo ? (c?.cor || '#fff') : 'rgba(26,23,20,0.4)', cursor: 'pointer',
            }}>{n}</button>
          );
        })}
      </div>

      {resultados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{entradas.length === 0 ? '📖' : '🔍'}</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            {entradas.length === 0 ? 'O Manual ainda está vazio' : 'Nenhum resultado encontrado'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', maxWidth: 280, margin: '0 auto' }}>
            {entradas.length === 0
              ? modoProf ? 'Cria a primeira entrada — escolhe um módulo do cronograma e gera com IA.' : 'O professor ainda não criou entradas.'
              : 'Tenta pesquisar com outras palavras.'}
          </div>
          {modoProf && entradas.length === 0 && (
            <button onClick={() => { setEntradaAtiva(null); setModo('criar'); }}
              style={{ marginTop: 20, padding: '12px 24px', borderRadius: 12, border: 'none',
                background: COR_PRIMARIA, color: '#faf7f2', fontSize: 14,
                fontWeight: 700, cursor: 'pointer' }}>+ Criar primeira entrada</button>
          )}
        </div>
      ) : pesquisa ? (
        <div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)', marginBottom: 10, fontWeight: 600 }}>
            {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} para "{pesquisa}"
          </div>
          {resultados.map(e => (
            <CardManual key={e.id} entrada={e} modoProf={modoProf}
              onAbrir={() => { setEntradaAtiva(e); setModo('ver'); }}
              onEditar={() => { setEntradaAtiva(e); setModo('editar'); }}
              onApagar={() => setConfirmarApagar(e.id)} />
          ))}
        </div>
      ) : (
        <div>
          {Object.entries(porCategoria).map(([cat, items]: [string, EntradaManual[]]) => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{ICONES_CATEGORIA[cat as CategoriaManual]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(26,23,20,0.6)',
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</span>
                <span style={{ fontSize: 12, color: 'rgba(26,23,20,0.3)',
                  background: 'rgba(26,23,20,0.05)', borderRadius: 100, padding: '1px 8px' }}>
                  {items.length}
                </span>
              </div>
              {items.map(e => (
                <CardManual key={e.id} entrada={e} modoProf={modoProf}
                  onAbrir={() => { setEntradaAtiva(e); setModo('ver'); }}
                  onEditar={() => { setEntradaAtiva(e); setModo('editar'); }}
                  onApagar={() => setConfirmarApagar(e.id)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
