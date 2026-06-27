import React, { useState } from 'react';

// ============================================================
// Guia de Apoio à Produção — Renderizador Visual ECL
// Transforma o texto da IA num documento visual e acessível
// ============================================================

// ── Tipos ─────────────────────────────────────────────────────
interface SecaoGuia {
  num: number;
  titulo: string;
  icone: string;
  cor: string;
  corTexto: string;
  conteudo: string;
}

interface DadosGuia {
  nomePrato: string;
  secoes: SecaoGuia[];
  equilibrioSensorial?: { componente: string; intensidade: string; notas: string }[];
  rendimentos?: { produto: string; comprado: string; utilizavel: string; rendimento: string; perdas: string }[];
  haccp?: { perigo: string; pcc: string; temperatura: string; medida: string; conservacao: string }[];
  questoes?: { tipo: string; pergunta: string; opcoes?: string[]; resposta?: string }[];
}

// ── Configuração das secções ──────────────────────────────────
const SECOES_CONFIG = [
  { num: 1,  titulo: 'Enquadramento',          icone: '📖', cor: '#1f1b16', corTexto: '#faf7f2' },
  { num: 2,  titulo: 'Competências',            icone: '🎯', cor: '#b5651d', corTexto: '#fff' },
  { num: 3,  titulo: 'HACCP e PCC',             icone: '⚠️', cor: '#c0392b', corTexto: '#fff' },
  { num: 4,  titulo: 'Rendimentos',             icone: '⚖️', cor: '#2980b9', corTexto: '#fff' },
  { num: 5,  titulo: 'Capacitação',             icone: '👥', cor: '#8e44ad', corTexto: '#fff' },
  { num: 6,  titulo: 'Equilíbrio Sensorial',    icone: '🌈', cor: '#e67e22', corTexto: '#fff' },
  { num: 7,  titulo: 'Sugestões Gastronómicas', icone: '💡', cor: '#16a085', corTexto: '#fff' },
  { num: 8,  titulo: 'Sustentabilidade',        icone: '♻️', cor: '#27ae60', corTexto: '#fff' },
  { num: 9,  titulo: 'Food Cost',               icone: '💶', cor: '#2c3e50', corTexto: '#fff' },
  { num: 10, titulo: 'Técnicas e Microcompetências', icone: '🔬', cor: '#5a7a4e', corTexto: '#fff' },
  { num: 11, titulo: 'Conhecimentos',           icone: '📚', cor: '#7f8c8d', corTexto: '#fff' },
  { num: 12, titulo: 'Questões de Estudo',      icone: '❓', cor: '#34495e', corTexto: '#fff' },
  { num: 13, titulo: 'Caso Profissional',       icone: '🧩', cor: '#d35400', corTexto: '#fff' },
  { num: 14, titulo: 'Autoavaliação',           icone: '🪞', cor: '#9b59b6', corTexto: '#fff' },
  { num: 15, titulo: 'Cultura e Gastronomia',   icone: '📖', cor: '#2c3e50', corTexto: '#fff' },
];

// ── Limpar LaTeX gerado pela IA ──────────────────────────────────
// Converte fórmulas como $600\text{ ml}$ → 600 ml
function limparLatex(texto: string): string {
  if (!texto) return '';
  return texto
    .replace(/\$([\d.,]+)\\text\{\s*([^}]+)\}\$/g, '$1 $2')
    .replace(/\$\\text\{([^}]+)\}\$/g, '$1')
    .replace(/\$([\d.,]+)\$/g, '$1')
    .replace(/\$[^$]*\$/g, '')
    .replace(/\\([a-zA-Z]+)/g, '')
    .replace(/  +/g, ' ')
    .trim();
}

// ── Parser do texto da IA → estrutura de dados ────────────────
function parseGuia(texto: string, nomePrato: string): DadosGuia {
  texto = limparLatex(texto);
  const secoes: SecaoGuia[] = [];

  SECOES_CONFIG.forEach(cfg => {
    // Padrões de cabeçalho: "# 1.", "## 1.", "1.", "SECÇÃO 1"
    const regex = new RegExp(
      `(?:#{1,3}\\s*)?${cfg.num}\\.?\\s*(?:ENQUADRAMENTO|COMPETÊNCIAS|MICROCOMPETÊNCIAS|HACCP|RENDIMENTOS|CAPACITAÇÃO|EQUILÍBRIO|SUGESTÕES|SUSTENTABILIDADE|FOOD COST|TÉCNICAS|CONHECIMENTOS|QUESTÕES|CASO|AUTOAVALIAÇÃO)[^\\n]*\\n([\\s\\S]*?)(?=(?:#{1,3}\\s*)?(?:${cfg.num + 1})\\.?\\s*|$)`,
      'i'
    );
    const m = texto.match(regex);
    if (m) {
      secoes.push({ ...cfg, conteudo: m[1].trim() });
    }
  });

  // Se não encontrou secções pelo número, tentar pelos títulos
  if (secoes.length < 3) {
    const padroesTitulo = [
      { regex: /(?:ENQUADRAMENTO|enquadramento)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:COMPETÊNCIAS|HACCP|RENDI|CAPACI|EQUIL|SUGE|SUST|FOOD|TÉCNI|CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 1 },
      { regex: /(?:COMPETÊNCIAS|competências)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:HACCP|RENDI|CAPACI|EQUIL|SUGE|SUST|FOOD|TÉCNI|CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 2 },
      { regex: /(?:HACCP|PCC)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:RENDI|CAPACI|EQUIL|SUGE|SUST|FOOD|TÉCNI|CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 3 },
      { regex: /(?:RENDIMENTOS)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:CAPACI|EQUIL|SUGE|SUST|FOOD|TÉCNI|CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 4 },
      { regex: /(?:CAPACITAÇÃO)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:EQUIL|SUGE|SUST|FOOD|TÉCNI|CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 5 },
      { regex: /(?:EQUILÍBRIO SENSORIAL|sensorial)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:SUGE|SUST|FOOD|TÉCNI|CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 6 },
      { regex: /(?:SUGESTÕES)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:SUST|FOOD|TÉCNI|CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 7 },
      { regex: /(?:SUSTENTABILIDADE)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:FOOD|TÉCNI|CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 8 },
      { regex: /(?:FOOD COST)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:TÉCNI|CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 9 },
      { regex: /(?:TÉCNICAS|microcompetências)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:CONHE|QUEST|CASO|AUTOAV)|$)/i, num: 10 },
      { regex: /(?:CONHECIMENTOS)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:QUEST|CASO|AUTOAV)|$)/i, num: 11 },
      { regex: /(?:QUESTÕES)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:CASO|AUTOAV|CULTUR)|$)/i, num: 12 },
      { regex: /(?:CASO PROFISSIONAL|caso)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:AUTOAV|CULTUR)|$)/i, num: 13 },
      { regex: /(?:AUTOAVALIAÇÃO)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:CULTUR)|$)/i, num: 14 },
      { regex: /(?:CULTURA E GASTRONOMIA|CULTURA)[^#\n]*\n([\s\S]*?)$/i, num: 15 },
    ];
    padroesTitulo.forEach(p => {
      const m = texto.match(p.regex);
      if (m && !secoes.find(s => s.num === p.num)) {
        const cfg = SECOES_CONFIG.find(c => c.num === p.num)!;
        secoes.push({ ...cfg, conteudo: m[1].trim() });
      }
    });
  }

  // Extrair equilíbrio sensorial como dados estruturados — novo formato
  // simples "DOCE: Forte" (prompt reformulado em 21/06/2026, mais fácil
  // para a IA preencher de forma consistente do que tabela markdown).
  const secSensorial = secoes.find(s => s.num === 6);
  let equilibrioSensorial;
  if (secSensorial) {
    // Sabores com variantes de escrita (IA às vezes escreve sem acento)
    const SABORES = [
      { chave: 'DOCE',    variantes: ['DOCE', 'SWEET'] },
      { chave: 'ÁCIDO',   variantes: ['ÁCIDO', 'ACIDO', 'ACID', 'AZEDO'] },
      { chave: 'SALGADO', variantes: ['SALGADO', 'SAL', 'SALTY'] },
      { chave: 'AMARGO',  variantes: ['AMARGO', 'BITTER'] },
      { chave: 'UMAMI',   variantes: ['UMAMI', 'SAVORY', 'SAVOURY'] },
    ];
    const INTENSIDADES_VALIDAS = ['forte', 'presente', 'ligeiro', 'ausente', 'alto', 'baixo', 'médio', 'medio', 'elevado'];
    const linhas = secSensorial.conteudo.split('\n');
    // Tentar texto completo (secção + parágrafo) para maior cobertura
    const textoCompleto = secSensorial.conteudo;

    equilibrioSensorial = SABORES.map(({ chave, variantes }) => {
      let valor = '';

      // 1. Formato directo: "DOCE: Forte" ou "Doce: Presente"
      for (const v of variantes) {
        const regex = new RegExp(`\\b${v}\\s*:\s*([\\w\\s]+?)(?:\\n|$|\\.|,)`, 'i');
        const m = textoCompleto.match(regex);
        if (m) { valor = m[1].trim(); break; }
      }

      // 2. Formato tabela: "| Doce | Forte |"
      if (!valor) {
        for (const v of variantes) {
          const linhaTab = linhas.find(l => l.includes('|') && l.toUpperCase().includes(v));
          if (linhaTab) {
            const celulas = linhaTab.split('|').map(c => c.trim()).filter(c => c && !c.match(/^[-:]+$/));
            if (celulas.length >= 2) { valor = celulas[1]; break; }
          }
        }
      }

      // 3. Normalizar valor — garantir que é uma intensidade válida
      if (valor) {
        const vLower = valor.toLowerCase().trim();
        const match = INTENSIDADES_VALIDAS.find(iv => vLower.includes(iv));
        if (!match && vLower.length > 15) valor = ''; // texto longo não é intensidade
      }

      return {
        componente: chave.charAt(0) + chave.slice(1).toLowerCase().replace('acido', 'ácido'),
        intensidade: valor,
        notas: ''
      };
    }).filter(r => r.intensidade);
  }

  return { nomePrato, secoes: secoes.sort((a, b) => a.num - b.num), equilibrioSensorial };
}

// ── Roda Sensorial (SVG) ──────────────────────────────────────
function RodaSensorial({ dados }: { dados: { componente: string; intensidade: string; notas: string }[] }) {
  const CORES_SABORES: Record<string, string> = {
    doce: '#f39c12', ácido: '#27ae60', salgado: '#2980b9',
    amargo: '#8e44ad', umami: '#c0392b',
    sweet: '#f39c12', acid: '#27ae60', salt: '#2980b9',
    bitter: '#8e44ad',
  };

  const INTENSIDADES: Record<string, number> = {
    'muito alto': 5, 'alto': 4, 'elevado': 4, 'forte': 4,
    'médio': 3, 'moderado': 3, 'medio': 3, 'presente': 3,
    'baixo': 2, 'reduzido': 2, 'ligeiro': 2,
    'muito baixo': 1, 'ausente': 0, 'nenhum': 0,
  };

  const sabores = dados.map(d => {
    const comp = d.componente.toLowerCase().trim();
    const intStr = d.intensidade.toLowerCase().trim();
    const intensidade = INTENSIDADES[intStr] ?? (intStr.match(/\d/) ? parseInt(intStr) : 3);
    const cor = Object.entries(CORES_SABORES).find(([k]) => comp.includes(k))?.[1] || '#95a5a6';
    return { nome: d.componente, intensidade: Math.min(5, intensidade), cor, notas: d.notas };
  });

  if (sabores.length === 0) return null;

  const cx = 100, cy = 100, raioMax = 80, raioMin = 10;
  const n = sabores.length;

  const pontos = sabores.map((s, i) => {
    const angulo = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = raioMin + (s.intensidade / 5) * (raioMax - raioMin);
    return { x: cx + r * Math.cos(angulo), y: cy + r * Math.sin(angulo), ...s, angulo };
  });

  const polygonPoints = pontos.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 200 200" style={{ width: 180, height: 180 }}>
        {/* Círculos guia */}
        {[1, 2, 3, 4, 5].map(r => (
          <circle key={r} cx={cx} cy={cy} r={raioMin + (r / 5) * (raioMax - raioMin)}
            fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
        ))}
        {/* Linhas dos eixos */}
        {pontos.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={cx + raioMax * Math.cos(p.angulo)} y2={cy + raioMax * Math.sin(p.angulo)}
            stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        ))}
        {/* Polígono de sabores */}
        <polygon points={polygonPoints} fill="rgba(181,101,29,0.2)" stroke="var(--copper)" strokeWidth="1.5" />
        {/* Pontos */}
        {pontos.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill={p.cor} stroke="white" strokeWidth="1.5" />
        ))}
        {/* Labels */}
        {pontos.map((p, i) => {
          const lx = cx + (raioMax + 16) * Math.cos(p.angulo);
          const ly = cy + (raioMax + 16) * Math.sin(p.angulo);
          return (
            <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fontWeight="700" fill={p.cor}>
              {p.nome}
            </text>
          );
        })}
      </svg>
      {/* Legenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {sabores.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.cor, flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{s.nome}</span>
            <span style={{ color: 'rgba(26,23,20,0.5)' }}>{'●'.repeat(s.intensidade)}{'○'.repeat(5 - s.intensidade)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Renderizador de conteúdo rich text ───────────────────────
function RenderConteudo({ texto, cor }: { texto: string; cor: string }) {
  const linhas = texto.split('\n');
  const elementos: React.ReactNode[] = [];
  let iLinha = 0;
  let tabelaAtual: string[][] = [];
  let emTabela = false;

  const fecharTabela = () => {
    if (tabelaAtual.length > 0) {
      const cabecalho = tabelaAtual[0];
      const corpo = tabelaAtual.slice(1).filter(r => !r.every(c => c.match(/^[-:]+$/)));
      elementos.push(
        <div key={`tabela_${iLinha}`} style={{ overflowX: 'auto', marginTop: 14, marginBottom: 18, borderRadius: 10, border: `1px solid ${cor}30` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: cor, color: 'white' }}>
                {cabecalho.map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corpo.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : `${cor}08` }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', verticalAlign: 'top', lineHeight: 1.5 }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tabelaAtual = [];
      emTabela = false;
    }
  };

  linhas.forEach((linha, i) => {
    iLinha = i;
    const l = linha.trim();
    if (!l) {
      if (emTabela) fecharTabela();
      return;
    }

    // Tabela markdown
    if (l.includes('|')) {
      emTabela = true;
      const celulas = l.split('|').map(c => c.trim()).filter(c => c);
      tabelaAtual.push(celulas);
      return;
    }

    if (emTabela) fecharTabela();

    // Cabeçalho
    if (l.startsWith('###')) {
      elementos.push(
        <div key={i} style={{ fontWeight: 800, fontSize: 14.5, color: cor, marginTop: 22, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 4, height: 16, background: cor, borderRadius: 2, display: 'inline-block' }} />
          {l.replace(/^#+\s*/, '')}
        </div>
      );
      return;
    }
    if (l.startsWith('##')) {
      elementos.push(
        <div key={i} style={{
          fontWeight: 800, fontSize: 16, color: cor, marginTop: 26, marginBottom: 10,
          paddingBottom: 6, borderBottom: `2px solid ${cor}40`, textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>
          {l.replace(/^#+\s*/, '')}
        </div>
      );
      return;
    }

    // Lista
    if (l.match(/^[-*•·]\s+/)) {
      const texto = l.replace(/^[-*•·]\s+/, '');
      const partesBold = texto.split(/\*\*(.*?)\*\*/g);
      elementos.push(
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13.5, lineHeight: 1.5 }}>
          <span style={{ color: cor, fontWeight: 900, flexShrink: 0, marginTop: 1, fontSize: 16 }}>·</span>
          <span>
            {partesBold.map((p, pi) => pi % 2 === 1 ? <strong key={pi} style={{ color: cor }}>{p}</strong> : p)}
          </span>
        </div>
      );
      return;
    }

    // Lista numerada
    const mNum = l.match(/^(\d+)[.)]\s+(.+)/);
    if (mNum) {
      const texto = mNum[2];
      const partesBold = texto.split(/\*\*(.*?)\*\*/g);
      elementos.push(
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13.5, lineHeight: 1.5 }}>
          <span style={{ background: cor, color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {mNum[1]}
          </span>
          <span style={{ paddingTop: 3 }}>
            {partesBold.map((p, pi) => pi % 2 === 1 ? <strong key={pi} style={{ color: cor }}>{p}</strong> : p)}
          </span>
        </div>
      );
      return;
    }

    // Bold inline — parágrafo normal, com mais espaço entre ideias
    const partesBold = l.split(/\*\*(.*?)\*\*/g);
    elementos.push(
      <p key={i} style={{ margin: '0 0 12px 0', fontSize: 13.5, lineHeight: 1.7, color: 'rgba(26,23,20,0.85)' }}>
        {partesBold.map((p, pi) => pi % 2 === 1 ? <strong key={pi} style={{ color: cor, fontWeight: 700 }}>{p}</strong> : p)}
      </p>
    );
  });

  if (emTabela) fecharTabela();

  return <div>{elementos}</div>;
}

// ── Questões de estudo ─────────────────────────────────────────
function SecaoQuestoes({ conteudo, cor }: { conteudo: string; cor: string }) {
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [mostrarRespostas, setMostrarRespostas] = useState(false);

  // Separar bloco de perguntas do bloco de respostas
  const blocoPerguntas = conteudo.split(/RESPOSTAS?\s*:/i)[0]
    .replace(/PERGUNTAS?\s*:/i, '').trim();
  const blocoRespostas = conteudo.includes('RESPOSTAS')
    ? conteudo.split(/RESPOSTAS?\s*:/i)[1]?.trim() || ''
    : '';

  // Extrair respostas correctas
  const respostasCorretas: Record<string, string> = {};
  if (blocoRespostas) {
    blocoRespostas.split('\n').forEach(l => {
      const m = l.trim().match(/^(\d+)[.)\s]+(.+)/);
      if (m) respostasCorretas[`q${m[1]}`] = m[2].trim();
    });
  }

  const linhas = blocoPerguntas.split('\n').filter(l => l.trim());
  const questoes: { tipo: string; pergunta: string; opcoes: string[]; id: string }[] = [];
  let qAtual: typeof questoes[0] | null = null;

  linhas.forEach(l => {
    const t = l.trim()
      // Limpar markdown bold **texto** → texto
      .replace(/\*\*([^*]+)\*\*/g, '$1');
    const mPerg = t.match(/^(\d+)[.)\s]+(.+)/);
    if (mPerg && !t.match(/^\d+[.)\s]+[a-d][.)]/i)) {
      if (qAtual) questoes.push(qAtual);
      const pergTexto = mPerg[2].trim();
      const tipo = pergTexto.toLowerCase().includes('(verdadeiro/falso)') ||
                   pergTexto.toLowerCase().includes('verdadeiro ou falso')
        ? 'vf'
        : pergTexto.toLowerCase().includes('(resposta curta)') ||
          pergTexto.toLowerCase().includes('justifica') ||
          pergTexto.toLowerCase().includes('explica')
        ? 'pratica'
        : 'escolha';
      qAtual = {
        tipo,
        pergunta: pergTexto.replace(/\(verdadeiro\/falso\)/i, '').replace(/\(resposta curta\)/i, '').trim(),
        opcoes: [],
        id: `q${mPerg[1]}`
      };
    } else if (qAtual && t.match(/^[a-dA-D][.)]/)) {
      qAtual.opcoes.push(t.replace(/^[a-dA-D][.)\s]+/, '').trim());
    }
  });
  if (qAtual) questoes.push(qAtual);

  return (
    <div>
      {questoes.map((q, qi) => (
        <div key={qi} style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: '#fff', border: `1px solid ${cor}30` }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#1a1714' }}>
            <span style={{ background: cor, color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginRight: 8 }}>
              {qi + 1}
            </span>
            {q.pergunta}
          </div>
          {q.tipo === 'escolha' && q.opcoes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {q.opcoes.map((op, oi) => (
                <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: respostas[q.id] === op ? `${cor}15` : '#f9f9f9', border: `1px solid ${respostas[q.id] === op ? cor : 'rgba(0,0,0,0.08)'}` }}>
                  <input type="radio" name={q.id} value={op} checked={respostas[q.id] === op} onChange={() => setRespostas(p => ({ ...p, [q.id]: op }))} style={{ accentColor: cor }} />
                  <span style={{ fontSize: 12 }}>{op}</span>
                </label>
              ))}
            </div>
          )}
          {q.tipo === 'vf' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {['Verdadeiro', 'Falso'].map(op => (
                <button key={op} onClick={() => setRespostas(p => ({ ...p, [q.id]: op }))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${respostas[q.id] === op ? cor : 'var(--border)'}`, background: respostas[q.id] === op ? `${cor}15` : '#fff', color: respostas[q.id] === op ? cor : 'rgba(26,23,20,0.6)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  {op === 'Verdadeiro' ? '✓ ' : '✗ '}{op}
                </button>
              ))}
            </div>
          )}
          {q.tipo === 'pratica' && (
            <textarea style={{ width: '100%', minHeight: 70, borderRadius: 8, border: '1px solid var(--border)', padding: 8, fontSize: 12, fontFamily: 'var(--font-body)', resize: 'vertical' }} placeholder="Escreve a tua resposta aqui..." />
          )}
        </div>
      ))}
      {questoes.length === 0 && <RenderConteudo texto={conteudo} cor={cor} />}

      {questoes.length > 0 && Object.keys(respostasCorretas).length > 0 && (
        <button
          onClick={() => setMostrarRespostas(v => !v)}
          style={{ marginTop: 12, padding: '9px 18px', borderRadius: 9, border: `1.5px solid ${cor}`,
            background: mostrarRespostas ? cor : '#fff', color: mostrarRespostas ? '#fff' : cor,
            fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}>
          {mostrarRespostas ? '🙈 Esconder respostas' : '✅ Ver respostas correctas'}
        </button>
      )}

      {mostrarRespostas && Object.keys(respostasCorretas).length > 0 && (
        <div style={{ marginTop: 10, padding: '12px 14px', background: `${cor}10`,
          borderRadius: 10, border: `1px solid ${cor}30` }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: cor, marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>Respostas correctas</div>
          {Object.entries(respostasCorretas).map(([id, resp]) => (
            <div key={id} style={{ fontSize: 13, marginBottom: 5, display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 700, color: cor, flexShrink: 0 }}>
                {id.replace('q', '')}.</span>
              <span style={{ color: '#1a1714' }}>{resp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export function GuiaProducao({ textoGuia, nomePrato, ucId, ucNome, onFechar }: {
  textoGuia: string;
  nomePrato: string;
  ucId?: string;
  ucNome?: string;
  onFechar?: () => void;
}) {
  const guia = parseGuia(textoGuia, nomePrato);
  // Abrir secção 1 por defeito; secção 15 (Cultura e Gastronomia) abre automaticamente se existir
  const temCultura = guia.secoes.some(s => s.num === 15);
  const [secaoAberta, setSecaoAberta] = useState<number | null>(1);

  if (!textoGuia || guia.secoes.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'rgba(26,23,20,0.5)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
        <div>O Guia de Apoio ainda não foi gerado.</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>Usa o botão "Gerar Guia" na Ficha de Produção.</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {/* Cabeçalho */}
      <div style={{ background: 'linear-gradient(135deg, #1f1b16 0%, #3d3830 100%)', borderRadius: 16, padding: '20px 20px 16px', marginBottom: 16, color: '#faf7f2' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: 4 }}>
              Guia de Apoio à Produção
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
              {nomePrato}
            </div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
              {guia.secoes.length} secções · ECL 2025/26
            </div>
          </div>
          {onFechar && (
            <button onClick={onFechar} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#faf7f2', cursor: 'pointer', fontSize: 12 }}>
              ✕
            </button>
          )}
        </div>

        {/* Navegação rápida */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          {guia.secoes.map(s => (
            <button key={s.num} onClick={() => setSecaoAberta(secaoAberta === s.num ? null : s.num)} style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${secaoAberta === s.num ? s.cor : 'rgba(255,255,255,0.2)'}`, background: secaoAberta === s.num ? s.cor : 'rgba(255,255,255,0.08)', color: '#faf7f2', fontSize: 11, cursor: 'pointer', fontWeight: secaoAberta === s.num ? 700 : 400 }}>
              {s.icone} {s.num}
            </button>
          ))}
        </div>
      </div>

      {/* Secções */}
      {guia.secoes.map(s => (
        <div key={s.num} className="guia-secao-card" style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', border: `1px solid ${s.cor}30`, boxShadow: secaoAberta === s.num ? `0 4px 16px ${s.cor}20` : 'none' }}>
          {/* Cabeçalho da secção */}
          <button onClick={() => setSecaoAberta(secaoAberta === s.num ? null : s.num)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: secaoAberta === s.num ? s.cor : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: secaoAberta === s.num ? 'rgba(255,255,255,0.2)' : s.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {s.icone}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: secaoAberta === s.num ? '#fff' : '#1a1714' }}>
                {s.num}. {s.titulo}
              </div>
            </div>
            <span style={{ fontSize: 18, color: secaoAberta === s.num ? '#fff' : s.cor, transition: 'transform 0.2s', transform: secaoAberta === s.num ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ›
            </span>
          </button>

          {/* Conteúdo da secção — sempre montado, escondido por CSS quando fechada.
              Isto garante que a impressão mostra TODAS as secções, não só a aberta. */}
          <div className={`guia-conteudo-print${s.num === 15 ? ' guia-cultura-gastronomia' : ''}`} style={{ display: secaoAberta === s.num ? 'block' : 'none', padding: '16px 16px', background: s.num === 15 ? '#f8f6f0' : '#fdfcfb', borderTop: `2px solid ${s.cor}` }}>
            {s.num === 6 && guia.equilibrioSensorial && guia.equilibrioSensorial.length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, background: '#fff', borderRadius: 12, border: `1px solid ${s.cor}30` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: s.cor, marginBottom: 12, textAlign: 'center' }}>
                  Roda de Equilíbrio Sensorial
                </div>
                <RodaSensorial dados={guia.equilibrioSensorial} />
              </div>
            )}

            {/* Questões interactivas para secção 12 */}
            {s.num === 12
              ? <SecaoQuestoes conteudo={s.conteudo} cor={s.cor} />
              : <RenderConteudo texto={s.conteudo} cor={s.cor} />
            }
          </div>
        </div>
      ))}

      {/* Rodapé */}
      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: 'rgba(26,23,20,0.3)' }}>
        Escola de Comércio de Lisboa · Avaliação ECL · {new Date().getFullYear()}
      </div>
    </div>
  );
}

// ── Caixa para colar o texto do Guia ─────────────────────────
export function CaixaGuia({ nomePrato, ucId, ucNome, textoGuiaInicial, onGuiaAlterado }: {
  nomePrato: string;
  ucId?: string;
  ucNome?: string;
  fichaTexto?: string;
  textoGuiaInicial?: string;
  onGuiaAlterado?: (texto: string) => void;
}) {
  const [textoGuia, setTextoGuia] = useState(textoGuiaInicial || '');
  const [modo, setModo] = useState<'colar' | 'ver'>(textoGuiaInicial ? 'ver' : 'colar');

  function actualizarTexto(t: string) {
    setTextoGuia(t);
    onGuiaAlterado?.(t);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📚</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Guia de Apoio à Produção</div>
          <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>Cola o texto gerado pela IA para ver o guia formatado</div>
        </div>
      </div>

      {modo === 'colar' && (
        <>
          <textarea
            value={textoGuia}
            onChange={e => actualizarTexto(e.target.value)}
            placeholder={`Cola aqui o resultado da IA para o Guia de Apoio à Produção de "${nomePrato}"...\n\nEx:\n# 1. ENQUADRAMENTO DA PRODUÇÃO\n...`}
            style={{ width: '100%', minHeight: 120, borderRadius: 10, border: '1.5px solid var(--border)', padding: 10, fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }}
          />
          {textoGuia && (
            <button onClick={() => setModo('ver')} style={{ marginTop: 8, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              📚 Ver Guia Formatado →
            </button>
          )}
        </>
      )}

      {modo === 'ver' && textoGuia && (
        <>
          <button onClick={() => setModo('colar')} style={{ marginBottom: 10, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
            ← Editar texto
          </button>
          <GuiaProducao textoGuia={textoGuia} nomePrato={nomePrato} ucId={ucId} ucNome={ucNome} />
        </>
      )}
    </div>
  );
}
