import React, { useState, useMemo } from 'react';
import { fmtData } from '../datas';
import {
  EntradaManual, CategoriaManual, NivelManual,
  CATEGORIAS_MANUAL, ICONES_CATEGORIA, CORES_NIVEL,
} from '../types';
import {
  getEntradasManual, addEntradaManual, deleteEntradaManual, pesquisarManual,
} from '../backend';
import { GuiaProducao } from './GuiaProducao';
import { exportarGuiaoDocx } from './exportGuiao';
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
function buildPromptGuiao(modulo: ModuloCronograma, anoLetivo: string): string {
  const turmaLabel = modulo.turmaAno === 1 ? '1.º Ano' : modulo.turmaAno === 2 ? '2.º Ano' : '3.º Ano';
  const tipoLabel  = modulo.tipo === 'UC' ? 'UC' : 'UFCD';
  const anosLetivos = modulo.turmaAno === 1 ? '2026–2029' : modulo.turmaAno === 2 ? '2025–2028' : '2024–2027';

  return `Constrói um guião de módulo completo para a Escola de Comércio de Lisboa, curso Profissional de Técnico de Cozinha-Pastelaria (referencial ${modulo.tipo === 'UC' ? '811RA144' : '811183'}).

CABEÇALHO DO DOCUMENTO (incluir exactamente assim):
ESCOLA DE COMÉRCIO DE LISBOA
Curso Profissional de Técnico de Cozinha-Pastelaria
${turmaLabel} | ${anosLetivos}
Referencial ${modulo.tipo === 'UC' ? '811RA144' : '811183'}
${modulo.disciplina}
${tipoLabel} ${modulo.id.replace('UFCD ', 'Módulo ')}
${modulo.nome}
Carga Horária: ${modulo.horasPrevistas} horas
Ano Lectivo ${anoLetivo}

ESTRUTURA OBRIGATÓRIA (secções numeradas 1 a 8):

## 1. Apresentação do Módulo
Dois parágrafos de enquadramento histórico e profissional do tema.
Caixa: 🎯 Objectivos do Módulo — 5 objectivos separados por " • "

## 2. Fundamentos / Identidade do tema
Introdução + subsecções (2.1, 2.2…) com tabela de referência E lista de autores/obras/técnicas com "•"

## 3 a 6. Capítulos temáticos
Organiza pela lógica do módulo (por região, por técnica, por tipo de produto, por família culinária…).
Cada capítulo: 1 parágrafo de contexto + TABELA de 4 colunas + pelo menos uma caixa 💡 e uma ✏️ Exercício.

## 7. Aplicação contemporânea / profissional
TABELA com chefs portugueses, abordagens actuais, restaurantes de referência ou técnicas modernas ligadas ao tema.

## 8. Síntese e Avaliação
• Conceitos-chave (lista com "•")
• Proposta de Avaliação: prova prática (60%) • trabalho de pesquisa (25%) • teste escrito (15%)
• Recursos e Referências (livros, sites, documentários REAIS)

REGRAS DE ESTILO (seguir rigorosamente):
- Português europeu, grafia pré-Acordo Ortográfico ("Objectivos", "actual", "directo", "técnico")
- Tom maduro e culturalmente informado, adequado ao ano indicado
- Tabelas SEMPRE de 4 colunas como elemento dominante
- Caixas assinaladas com emoji: 🎯 (objectivos) · 💡 (destaque/nota) · ✏️ (exercício)
- Listas com "•"
- Autores, chefs, produtos DOP/IGP e referências REAIS — nunca inventados
- Fontes a citar quando relevantes: Maria de Lourdes Modesto, Olleboma, Alfredo Saramago, AHRESP, DGS, ASAE, Turismo de Portugal, Le Cordon Bleu, Maincent-Morel`;
}

// ── Geração via API Claude ─────────────────────────────────────
async function gerarComIA(prompt: string): Promise<string> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!resp.ok) throw new Error(`Erro API: ${resp.status}`);
  const data = await resp.json();
  return data.content?.map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('') || '';
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
  const ANOS = ['2026-2027'];
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

  function selecionarModulo(m: ModuloCronograma) {
    setModuloSel(m);
    setTitulo(m.nome);
    // Inferir categoria
    const nome = m.nome.toLowerCase();
    if (nome.includes('higiene') || nome.includes('haccp') || nome.includes('segurança alimentar'))
      setCategoria('Higiene e Preparação');
    else if (nome.includes('pastelaria') || nome.includes('doçaria') || nome.includes('massas'))
      setCategoria('Pastelaria e Doçaria');
    else if (nome.includes('peixes') || nome.includes('mariscos'))
      setCategoria('Peixes e Mariscos');
    else if (nome.includes('carnes') || nome.includes('aves') || nome.includes('caça'))
      setCategoria('Carnes e Aves');
    else if (nome.includes('tradicional') || nome.includes('internacional'))
      setCategoria('Cozinha Tradicional');
    // Inferir nível pelo ano
    setNivel(m.turmaAno === 1 ? 'Base' : m.turmaAno === 2 ? 'Intermédio' : 'Avançado');
    // Palavras-chave do nome
    setPalavras(m.nome.split(' ').filter(w => w.length > 4).slice(0, 5).join(', '));
  }

  async function gerarGuiaoIA() {
    if (!moduloSel) { setErro('Selecciona um módulo do cronograma primeiro.'); return; }
    setGerandoIA(true);
    setFaseIA('A preparar o guião…');
    setErro('');
    try {
      const prompt = buildPromptGuiao(moduloSel, anoLetivo);
      setFaseIA('A gerar o conteúdo com IA…');
      const resultado = await gerarComIA(prompt);
      setTexto(resultado);
      setFaseIA('');
    } catch (e) {
      setErro('Erro ao chamar a IA. Tenta novamente.');
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

            {/* Botão gerar */}
            <button
              onClick={gerarGuiaoIA}
              disabled={!moduloSel || gerandoIA}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: !moduloSel || gerandoIA ? 'rgba(109,40,217,0.3)' : COR_IA,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: !moduloSel || gerandoIA ? 'not-allowed' : 'pointer',
              }}>
              {gerandoIA ? `⏳ ${faseIA}` : '✨ Gerar guião com IA'}
            </button>
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
  function apagar(id: string) {
    deleteEntradaManual(id); recarregar();
    setConfirmarApagar(null); setModo('lista'); setEntradaAtiva(null);
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
        <GuiaProducao textoGuia={entradaAtiva.textoGuia} nomePrato={entradaAtiva.titulo} />
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
