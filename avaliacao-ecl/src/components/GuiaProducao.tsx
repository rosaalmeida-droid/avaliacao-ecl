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
  { num: 3,  titulo: 'Microcompetências',       icone: '🔬', cor: '#5a7a4e', corTexto: '#fff' },
  { num: 4,  titulo: 'HACCP e PCC',             icone: '⚠️', cor: '#c0392b', corTexto: '#fff' },
  { num: 5,  titulo: 'Rendimentos',             icone: '⚖️', cor: '#2980b9', corTexto: '#fff' },
  { num: 6,  titulo: 'Capacitação',             icone: '👥', cor: '#8e44ad', corTexto: '#fff' },
  { num: 7,  titulo: 'Equilíbrio Sensorial',    icone: '🌈', cor: '#e67e22', corTexto: '#fff' },
  { num: 8,  titulo: 'Sugestões Gastronómicas', icone: '💡', cor: '#16a085', corTexto: '#fff' },
  { num: 9,  titulo: 'Sustentabilidade',        icone: '♻️', cor: '#27ae60', corTexto: '#fff' },
  { num: 10, titulo: 'Food Cost',               icone: '💶', cor: '#2c3e50', corTexto: '#fff' },
  { num: 11, titulo: 'Conhecimentos',           icone: '📚', cor: '#7f8c8d', corTexto: '#fff' },
  { num: 12, titulo: 'Questões de Estudo',      icone: '❓', cor: '#34495e', corTexto: '#fff' },
  { num: 13, titulo: 'Caso Profissional',       icone: '🏆', cor: '#6c5ce7', corTexto: '#fff' },
  { num: 14, titulo: 'Autoavaliação',           icone: '📝', cor: '#00b894', corTexto: '#fff' },
];

// ── Parser do texto da IA → estrutura de dados ────────────────
function parseGuia(texto: string, nomePrato: string): DadosGuia {
  const secoes: SecaoGuia[] = [];

  SECOES_CONFIG.forEach(cfg => {
    // Padrões de cabeçalho: "# 1.", "## 1.", "1.", "SECÇÃO 1"
    const regex = new RegExp(
      `(?:#{1,3}\\s*)?${cfg.num}\\.?\\s*(?:ENQUADRAMENTO|COMPETÊNCIAS|MICROCOMPETÊNCIAS|HACCP|RENDIMENTOS|CAPACITAÇÃO|EQUILÍBRIO|SUGESTÕES|SUSTENTABILIDADE|FOOD COST|CONHECIMENTOS|QUESTÕES|CASO PROFISSIONAL|AUTOAVALIAÇÃO)[^\\n]*\\n([\\s\\S]*?)(?=(?:#{1,3}\\s*)?(?:${cfg.num + 1})\\.?\\s*|$)`,
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
      { regex: /(?:ENQUADRAMENTO|enquadramento)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:COMPETÊNCIAS|HACCP|MICRO|RENDI|CAPACI|EQUIL|SUGE|SUST|FOOD|CONHE|QUEST|CASO|AUTO)|$)/i, num: 1 },
      { regex: /(?:COMPETÊNCIAS|competências)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:MICRO|HACCP|RENDI|CAPACI|EQUIL|SUGE|SUST|FOOD|CONHE|QUEST|CASO|AUTO)|$)/i, num: 2 },
      { regex: /(?:MICROCOMPETÊNCIAS|micro)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:HACCP|RENDI|CAPACI|EQUIL|SUGE|SUST|FOOD|CONHE|QUEST|CASO|AUTO)|$)/i, num: 3 },
      { regex: /(?:HACCP|PCC)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:RENDI|CAPACI|EQUIL|SUGE|SUST|FOOD|CONHE|QUEST|CASO|AUTO)|$)/i, num: 4 },
      { regex: /(?:RENDIMENTOS)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:CAPACI|EQUIL|SUGE|SUST|FOOD|CONHE|QUEST|CASO|AUTO)|$)/i, num: 5 },
      { regex: /(?:CAPACITAÇÃO)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:EQUIL|SUGE|SUST|FOOD|CONHE|QUEST|CASO|AUTO)|$)/i, num: 6 },
      { regex: /(?:EQUILÍBRIO SENSORIAL|sensorial)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:SUGE|SUST|FOOD|CONHE|QUEST|CASO|AUTO)|$)/i, num: 7 },
      { regex: /(?:SUGESTÕES)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:SUST|FOOD|CONHE|QUEST|CASO|AUTO)|$)/i, num: 8 },
      { regex: /(?:SUSTENTABILIDADE)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:FOOD|CONHE|QUEST|CASO|AUTO)|$)/i, num: 9 },
      { regex: /(?:FOOD COST)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:CONHE|QUEST|CASO|AUTO)|$)/i, num: 10 },
      { regex: /(?:CONHECIMENTOS)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:QUEST|CASO|AUTO)|$)/i, num: 11 },
      { regex: /(?:QUESTÕES)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:CASO|AUTO)|$)/i, num: 12 },
      { regex: /(?:CASO PROFISSIONAL)[^#\n]*\n([\s\S]*?)(?=(?:##|#|\d+\.)\s*(?:AUTOAVALIAÇÃO)|$)/i, num: 13 },
      { regex: /(?:AUTOAVALIAÇÃO)[^#\n]*\n([\s\S]*?)$/i, num: 14 },
    ];
    padroesTitulo.forEach(p => {
      const m = texto.match(p.regex);
      if (m && !secoes.find(s => s.num === p.num)) {
        const cfg = SECOES_CONFIG.find(c => c.num === p.num)!;
        secoes.push({ ...cfg, conteudo: m[1].trim() });
      }
    });
  }

  // Extrair equilíbrio sensorial como dados estruturados
  const secSensorial = secoes.find(s => s.num === 7);
  let equilibrioSensorial;
  if (secSensorial) {
    const linhas = secSensorial.conteudo.split('\n').filter(l => l.includes('|'));
    equilibrioSensorial = linhas
      .filter(l => !l.match(/^[\s|:-]+$/) && !l.toLowerCase().includes('componente'))
      .map(l => {
        const partes = l.split('|').map(p => p.trim());
        return { componente: partes[1] || partes[0], intensidade: partes[2] || '', notas: partes[3] || '' };
      })
      .filter(r => r.componente && r.componente.length > 1);
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
    'muito alto': 5, 'alto': 4, 'elevado': 4,
    'médio': 3, 'moderado': 3, 'medio': 3,
    'baixo': 2, 'reduzido': 2,
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
        <div key={`tabela_${iLinha}`} style={{ overflowX: 'auto', marginBottom: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: cor, color: 'white' }}>
                {cabecalho.map((h, i) => (
                  <th key={i} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corpo.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.03)' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)', verticalAlign: 'top' }}>
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
      elementos.push(<div key={i} style={{ fontWeight: 700, fontSize: 13, color: cor, marginTop: 10, marginBottom: 4 }}>{l.replace(/^#+\s*/, '')}</div>);
      return;
    }
    if (l.startsWith('##')) {
      elementos.push(<div key={i} style={{ fontWeight: 700, fontSize: 14, color: cor, marginTop: 12, marginBottom: 5, borderBottom: `1px solid ${cor}30`, paddingBottom: 3 }}>{l.replace(/^#+\s*/, '')}</div>);
      return;
    }

    // Lista
    if (l.match(/^[-*•·]\s+/)) {
      const texto = l.replace(/^[-*•·]\s+/, '');
      const partesBold = texto.split(/\*\*(.*?)\*\*/g);
      elementos.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 13 }}>
          <span style={{ color: cor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>·</span>
          <span>
            {partesBold.map((p, pi) => pi % 2 === 1 ? <strong key={pi}>{p}</strong> : p)}
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
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 13 }}>
          <span style={{ background: cor, color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {mNum[1]}
          </span>
          <span style={{ paddingTop: 2 }}>
            {partesBold.map((p, pi) => pi % 2 === 1 ? <strong key={pi}>{p}</strong> : p)}
          </span>
        </div>
      );
      return;
    }

    // Bold inline
    const partesBold = l.split(/\*\*(.*?)\*\*/g);
    elementos.push(
      <p key={i} style={{ margin: '0 0 6px 0', fontSize: 13, lineHeight: 1.6 }}>
        {partesBold.map((p, pi) => pi % 2 === 1 ? <strong key={pi}>{p}</strong> : p)}
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

  const linhas = conteudo.split('\n').filter(l => l.trim());
  const questoes: { tipo: string; pergunta: string; opcoes: string[]; id: string }[] = [];
  let qAtual: typeof questoes[0] | null = null;

  linhas.forEach(l => {
    const t = l.trim();
    const mPerg = t.match(/^(\d+)[.)]\s+(.+)/);
    if (mPerg) {
      if (qAtual) questoes.push(qAtual);
      const tipo = t.toLowerCase().includes('verdadeiro') || t.toLowerCase().includes('falso') ? 'vf'
        : t.toLowerCase().includes('situação') || t.toLowerCase().includes('prática') ? 'pratica'
        : 'escolha';
      qAtual = { tipo, pergunta: mPerg[2], opcoes: [], id: `q${mPerg[1]}` };
    } else if (qAtual && t.match(/^[a-dA-D][.)]\s+/)) {
      qAtual.opcoes.push(t.replace(/^[a-dA-D][.)]\s+/, ''));
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
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export function GuiaProducao({ textoGuia, nomePrato, onFechar }: {
  textoGuia: string;
  nomePrato: string;
  onFechar?: () => void;
}) {
  const guia = parseGuia(textoGuia, nomePrato);
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
        <div key={s.num} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', border: `1px solid ${s.cor}30`, boxShadow: secaoAberta === s.num ? `0 4px 16px ${s.cor}20` : 'none' }}>
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
          <div className="guia-conteudo-print" style={{ display: secaoAberta === s.num ? 'block' : 'none', padding: '16px 16px', background: '#fdfcfb', borderTop: `2px solid ${s.cor}` }}>
            {s.num === 7 && guia.equilibrioSensorial && guia.equilibrioSensorial.length > 0 && (
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
          <GuiaProducao textoGuia={textoGuia} nomePrato={nomePrato} />
        </>
      )}
    </div>
  );
}
