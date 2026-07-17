import React, { useState } from 'react';
import { getPlanosAulaPorTurma, getFichasProducao, addOrUpdateRequisicao, getRequisicaoPorPlano, SHEETS_REQUISICAO_URL, getMateriasPrimasCustom, addOrUpdateMateriaPrimaCustom, addAviso, resolverAvisosDoIngrediente, addSugestaoIngrediente } from '../backend';
import { PlanoAula, FichaProducao } from '../types';
import { loadEventos } from './EventosWizard';
import { encontrarMateriaPrimaComConfianca, getMateriaPrimasBase } from '../materiasPrimasBase';
import {
  processarIngrediente,
  obterRendimento,
} from '../requisicaoLogica';

// SHEETS_REQUISICAO_URL agora vem centralizado do backend.ts

// ── Linha da requisição ───────────────────────────────────────
interface Linha {
  id: string;
  produto: string;
  und: string;
  // Quantidades
  qt1pax: number;        // qty por 1 dose (base de cálculo)
  qtReceita: number;     // qty total receita base (soma das fichas)
  qtEncomenda: number;   // qty para o nº doses pedido (editável)
  formaCompra?: string;  // forma comercial seleccionada (ex: 'Inteiro eviscerado')
  rendimento?: number;   // rendimento aplicado (ex: 0.60)
  qtCompra?: number;     // qty real a comprar após aplicar rendimento
  // Preços
  precoUnitario: string; // €/kg ou €/un (editável)
  precoReceita: number;  // precoUnitario × qtReceita
  preco1pax: number;     // precoUnitario × qt1pax
  precoEncomenda: number; // precoUnitario × qtEncomenda
  // Meta
  fichas: string[];
  daBD: boolean;
  avisos: string[];
  isQB: boolean;
  perguntarProfessor: boolean;
  decisaoProfessor?: 'comprar' | 'produzir';
  preparacaoInfo?: { nome: string; materiasPrimas?: string[]; podeComprar: boolean }; // dados da preparação identificada
}

function recalc(l: Linha): Linha {
  const p = parseFloat(l.precoUnitario) || 0;
  return { ...l, precoReceita: p * l.qtReceita, preco1pax: p * l.qt1pax, precoEncomenda: p * l.qtEncomenda };
}

// ── Agregação central ─────────────────────────────────────────
function agregarIngredientes(fichas: FichaProducao[], paxPorFicha: Record<string, number>): Linha[] {
  const mapa = new Map<string, Linha>();

  fichas.forEach(f => {
    const paxBase = parseFloat(f.numPorcoes) || 1;
    const paxPedido = paxPorFicha[f.id] || paxBase;
    const fator = paxPedido / paxBase;

    // Proteção total: f.ingredientes pode vir undefined/null se a ficha foi
    // gravada antes de uma correção anterior, ou chegou malformada do Sheets.
    // Sem isto, .forEach rebentava e travava o processamento de TODAS as
    // fichas seguintes silenciosamente — a causa real da requisição vazia.
    const ingredientesDaFicha = Array.isArray(f.ingredientes) ? f.ingredientes : [];

    ingredientesDaFicha.forEach(ing => {
      if (!ing || !ing.produto?.trim()) return;

      const proc = processarIngrediente(ing.produto, ing.qt, ing.un, f.nomePrato);
      if (proc.excluir) return;

      const qtReceitaBase = proc.qtKg;
      const qt1pax = paxBase > 0 ? qtReceitaBase / paxBase : 0;
      const qtEncomenda = qt1pax * paxPedido;

      // ── Chave de consolidação ──────────────────────────────
      // Regra 1: QB e quantidade normal do MESMO produto juntam-se
      //   → usar und da unidade base (kg/un/l), nunca 'q.b.' na chave
      // Regra 2: manteiga c/sal ≠ manteiga s/sal (palavras distintas)
      //   → preservar "com sal" / "sem sal" no nome do produto
      const produtoChave = proc.produto.toLowerCase().trim();
      const undChave = proc.isQB ? (proc.und === 'un' ? 'un' : 'kg') : proc.und;
      const chave = `${produtoChave}__${undChave}`;

      // Verificar se existe uma linha normal (não QB) com este produto
      // Se sim, juntar mesmo que a actual seja QB
      const chaveNormal = `${produtoChave}__${proc.und === 'un' ? 'un' : 'kg'}`;

      const custom = getMateriasPrimasCustom();
      // Limpar nome antes de pesquisar: remover descritores de quantidade entre parênteses
      // ex: "Salmão fresco (2 lombos de 200g)" → "Salmão fresco"
      const nomeLimpo = proc.produto
        .replace(/\s*\([^)]*\)/g, '')  // remover (...)
        .replace(/\s*\d+\s*x\s*\d+[gkGK]*/g, '') // remover 2x200g
        .trim();
      const { mp, confianca } = encontrarMateriaPrimaComConfianca(nomeLimpo, custom);
      // Ingredientes vendidos por unidade (ovos, etc.) têm precoKg = 0 — usar
      // precoUnitario nesse caso. Ingredientes vendidos a peso/volume usam precoKg.
      const precoMP = mp ? (proc.und === 'un' ? mp.precoUnitario : mp.precoKg) : 0;
      const precoUnitario = (precoMP && precoMP > 0) ? precoMP.toFixed(2).replace('.', ',') : '';

      // Gerar aviso no Centro de Avisos quando a correspondência não é segura
      // — o professor confirma/corrige diretamente na Requisição, sem
      // precisar de ir a um ecrã de gestão à parte.
      if (confianca === 'nenhuma') {
        addAviso({
          tipo: 'ingrediente_nao_encontrado',
          titulo: `Ingrediente "${proc.produto}" não está na base de preços`,
          descricao: `Confirma o preço de "${proc.produto}" na Requisição — fica guardado automaticamente para a próxima vez.`,
          contexto: { ingredienteNome: proc.produto, fichaId: f.id },
        });
      } else if (confianca === 'ambigua') {
        addAviso({
          tipo: 'ingrediente_ambiguo',
          titulo: `Confirma o preço de "${proc.produto}"`,
          descricao: `A app associou a "${mp?.nome}" mas não tem a certeza — confirma se está correto na Requisição.`,
          contexto: { ingredienteNome: proc.produto, fichaId: f.id },
        });
      }

      // Aviso: unidade 'un' que não é ovo
      const avisos = [...proc.avisos];
      if (proc.und === 'un' && !/(ov[oa]|egg)/i.test(proc.produto)) {
        avisos.push(`⚠️ "${proc.produto}" ficou em unidades — verificar se é correcto`);
      }

      const chaveUsada = mapa.has(chaveNormal) ? chaveNormal : chave;

      if (mapa.has(chaveUsada)) {
        const l = mapa.get(chaveUsada)!;
        // QB soma como quantidade mínima estimada
        l.qtReceita += qtReceitaBase;
        l.qt1pax += qt1pax;
        l.qtEncomenda += qtEncomenda;
        // Se tinha QB e agora tem quantidade real, marcar como não-QB
        if (!proc.isQB) l.isQB = false;
        l.precoReceita = (parseFloat(l.precoUnitario)||0) * l.qtReceita;
        l.preco1pax = (parseFloat(l.precoUnitario)||0) * l.qt1pax;
        l.precoEncomenda = (parseFloat(l.precoUnitario)||0) * l.qtEncomenda;
        if (!l.fichas.includes(f.nomePrato)) l.fichas.push(f.nomePrato);
        if (avisos.length > 0) l.avisos.push(...avisos.filter(a => !l.avisos.includes(a)));
      } else {
        const p = parseFloat(precoUnitario) || 0;
        mapa.set(chaveUsada, {
          id: chaveUsada,
          produto: proc.produto,
          und: proc.isQB ? (proc.und === 'un' ? 'un' : 'kg') : proc.und,
          qt1pax,
          qtReceita: qtReceitaBase,
          qtEncomenda,
          precoUnitario,
          precoReceita: p * qtReceitaBase,
          preco1pax: p * qt1pax,
          precoEncomenda: p * qtEncomenda,
          fichas: [f.nomePrato],
          daBD: !!mp,
          avisos,
          isQB: proc.isQB,
          perguntarProfessor: proc.perguntarProfessor,
          preparacaoInfo: proc.preparacaoInfo,
        });
      }
    });
  });

  return Array.from(mapa.values()).sort((a, b) => {
    if (a.isQB !== b.isQB) return a.isQB ? 1 : -1;
    return a.produto.localeCompare(b.produto, 'pt');
  });
}

// ── Formatadores ──────────────────────────────────────────────
// Usa vírgula como separador decimal (formato pt-PT) para display
const ptPT = (n: number, dec: number) => n.toFixed(dec).replace('.', ',');
const fE = (n: number) => n > 0 ? `${ptPT(n, 2)} €` : '—';
const fQ = (n: number, und: string) => {
  if (und === 'q.b.' || n === 0) return 'q.b.';
  if (und === 'un') return `${Math.round(n)} un`;
  return n >= 1 ? `${ptPT(n, 3)} ${und}` : `${(n * 1000).toFixed(0)} g`; // <1kg mostrar em g
};
const fQn = (n: number, und: string) => {
  if (n === 0) return '';
  if (und === 'un') return String(Math.round(n));
  // Igual ao fQ mas sem símbolo de unidade — converte <1kg para gramas
  return n >= 1 ? `${ptPT(n, 3)} ${und}` : `${(n * 1000).toFixed(0)} g`;
};

// Versão para ENVIO ao Sheets — nunca devolve string vazia (o Apps Script
// espera sempre um número, mesmo que seja 0). fQn esconde zeros só para
// efeitos visuais na tabela; usar essa função no envio fazia desaparecer
// ingredientes com quantidade pequena ou exactamente 0.
const fQnEnvio = (n: number, und: string): string => {
  if (und === 'un') return String(Math.round(n));
  return n.toFixed(4);
};

// ── Estilos ───────────────────────────────────────────────────
const S = {
  card: { background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '18px', marginBottom: 12, boxShadow: 'var(--shadow-sm)' } as React.CSSProperties,
  muted: { fontSize: 12, color: 'rgba(26,23,20,0.5)' } as React.CSSProperties,
  lbl: { fontSize:13, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block', marginBottom: 4, color: 'rgba(26,23,20,0.5)' },
  inp: { fontFamily: 'var(--font-body)', fontSize: 12, padding: '6px 8px', borderRadius: 7, border: '1.5px solid rgba(26,23,20,0.55)', background: '#fff', color: '#1a1714', boxSizing: 'border-box' as const },
  btnP: { padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  btnG: { padding: '10px 18px', borderRadius: 10, border: '1.5px solid rgba(26,23,20,0.55)', background: 'transparent', color: '#1a1714', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
};

// ═══════════════════════════════════════════════════════════════
export default function Requisicao({ nomeProfessor, planoIdFixo, turmaId = 'CP1', fichasIniciais, onGuardado }: { nomeProfessor?: string; planoIdFixo?: string; turmaId?: string; fichasIniciais?: string[]; onGuardado?: () => void }) {
  const planos = getPlanosAulaPorTurma(turmaId)
    .sort((a, b) => (b.data || '').localeCompare(a.data || '')); // mais recentes primeiro
  // Planos recentes = últimos 60 dias + planos com fichas associadas
  const hoje = new Date();
  const limite60dias = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const planosRecentes = planos.filter(p => (p.data || '') >= limite60dias || p.fichasIds.length > 0);
  const planoInicial = planoIdFixo ? planos.find(p => p.id === planoIdFixo) || planos[0] || null : planos[0] || null;
  const fichasSelInicial = fichasIniciais?.length ? fichasIniciais : (planoInicial?.fichasIds || []);

  const [fase, setFase] = useState<'escolher' | 'editar'>(
    fichasIniciais?.length ? 'editar' : 'escolher'
  );
  const [planoSel, setPlanoSel] = useState<PlanoAula | null>(planoInicial);
  const [mostrarTodosPlanos, setMostrarTodosPlanos] = useState(false);
  const [fichasSel, setFichasSel] = useState<string[]>(fichasSelInicial);
  const [paxPorFicha, setPaxPorFicha] = useState<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    // Se o plano está associado a um evento, usar a capacitação (nº pessoas)
    // desse evento como ponto de partida das doses — em vez do nº de porções
    // "de receita" da ficha, que é só uma referência genérica.
    let paxDoEvento: number | null = null;
    if (planoInicial?.eventoId) {
      const eventos = loadEventos();
      const evento = eventos.find((e: any) => e.id === planoInicial.eventoId);
      const dia = evento?.dias?.find((d: any) => d.data === planoInicial.data);
      const totalPax = (dia?.momentos || []).reduce((s: number, m: any) => s + (m.numPessoas || 0), 0);
      if (totalPax > 0) paxDoEvento = totalPax;
    }
    fichasSelInicial.forEach(fid => {
      const f = getFichasProducao().find(x => x.id === fid);
      if (f) r[fid] = paxDoEvento || parseFloat(f.numPorcoes) || 4;
    });
    return r;
  });
  const [quebras, setQuebras] = useState(10);
  const [bevCost, setBevCost] = useState(20);
  const [consumo, setConsumo] = useState({ bar: false, rest: true, interno: false, convidados: false });
  const [sugestaoAberta, setSugestaoAberta] = useState<string | null>(null);
  const [painelMicrogreens, setPainelMicrogreens] = useState(false);
  const [mgFiltro, setMgFiltro] = useState(''); // nome do ingrediente em sugestão
  const [sugestaoForm, setSugestaoForm] = useState({ precoKg: '', unidadeCompra: 'kg', categoria: '', observacao: '' });
  const [sugestaoEnviada, setSugestaoEnviada] = useState(false);
  const [responsavel, setResponsavel] = useState(() => {
    // Sem fonte automática fiável — sugere o último nome usado (provavelmente a mesma
    // pessoa em requisições próximas), mas o professor pode sempre mudar.
    try { return localStorage.getItem('ecl_ultimo_responsavel_compras') || ''; } catch { return ''; }
  });
  const [atividade, setAtividade] = useState(() => {
    // Auto-preencher com o título do plano (já inclui tipo de actividade + data)
    return planoInicial?.titulo || '';
  });
  const [familia, setFamilia] = useState(() => {
    // Pré-preencher com a classificação da primeira ficha seleccionada
    const f = getFichasProducao().find(x => fichasSelInicial.includes(x.id));
    return f?.classificacao || '';
  });
  // Se entrámos directamente em modo 'editar' (vindo do plano), calcular já as linhas
  const [linhas, setLinhas] = useState<Linha[]>(() => {
    if (!fichasIniciais?.length) return [];
    const fsel = getFichasProducao().filter(f => fichasSelInicial.includes(f.id));
    const pax: Record<string, number> = {};
    fichasSelInicial.forEach(fid => {
      const f = getFichasProducao().find(x => x.id === fid);
      if (f) pax[fid] = parseFloat(f.numPorcoes) || 4;
    });
    return agregarIngredientes(fsel, pax);
  });
  const [msg, setMsg] = useState('');
  const [linkSheets, setLinkSheets] = useState(''); // URL do Google Sheets para abrir directamente

  // Auto-recalcular quantidades quando o nº de doses muda (correctamente APÓS todos os useState)
  React.useEffect(() => {
    if (linhas.length > 0 && fichasSel.length > 0) {
      const fsel = getFichasProducao().filter(f => fichasSel.includes(f.id));
      setLinhas(agregarIngredientes(fsel, paxPorFicha));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paxPorFicha]);
  // Preços por ingrediente na pré-requisição — chave: produto.toLowerCase()
  const [precosPreReq, setPrecosPreReq] = useState<Record<string, string>>({});

  const todasFichas = [...getFichasProducao()].sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
  // Só mostrar fichas do plano seleccionado — nunca todas as fichas do sistema
  const fichasDisp = planoSel ? todasFichas.filter(f => (planoSel.fichasIds || []).includes(f.id)) : [];
  const fichasExtra: FichaProducao[] = []; // desactivado — só fichas do plano
  const fichasSelecionadas = todasFichas.filter(f => fichasSel.includes(f.id));

  const paxBaseTotal = fichasSelecionadas.reduce((s, f) => s + (parseFloat(f.numPorcoes) || 1), 0) || 1;
  const paxEncTotal = fichasSelecionadas.reduce((s, f) => s + (paxPorFicha[f.id] || parseFloat(f.numPorcoes) || 1), 0) || 1;
  const nomeReceita = fichasSelecionadas.map(f => f.nomePrato).join(' + ') || 'Requisicao';

  function selecionarPlano(p: PlanoAula) {
    setPlanoSel(p);
    setFichasSel(p.fichasIds);
    const r: Record<string, number> = {};
    p.fichasIds.forEach(fid => {
      const f = todasFichas.find(x => x.id === fid);
      if (f) r[fid] = parseFloat(f.numPorcoes) || 4;
    });
    setPaxPorFicha(r);
  }

  function toggleFicha(id: string) {
    setFichasSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const f = todasFichas.find(x => x.id === id);
    if (f && !paxPorFicha[id]) setPaxPorFicha(p => ({ ...p, [id]: parseFloat(f.numPorcoes) || 4 }));
  }

  function gerarLinhas() {
    const novasLinhas = agregarIngredientes(fichasSelecionadas, paxPorFicha);
    // Aviso imediato e visível — antes ficava silencioso e a requisição
    // saía vazia sem o professor perceber porquê.
    const fichasSemIngredientes = fichasSelecionadas.filter(f => !Array.isArray(f.ingredientes) || f.ingredientes.length === 0);
    if (fichasSemIngredientes.length > 0) {
      alert(`Atenção: a(s) ficha(s) "${fichasSemIngredientes.map(f => f.nomePrato).join('", "')}" não têm ingredientes guardados. Abre a ficha e confirma que está completa antes de gerar a requisição.`);
    }
    setLinhas(novasLinhas);
    setFase('editar');
  }

  function setL(i: number, campo: string, v: string | number) {
    setLinhas(prev => { const n = [...prev]; n[i] = recalc({ ...n[i], [campo]: v }); return n; });
  }

  // Quando o professor confirma/corrige o preço de um ingrediente, a base
  // de dados aprende — fica guardado para a próxima vez (sem precisar de
  // ecrã de gestão à parte), e o aviso pendente é resolvido automaticamente.
  function confirmarPrecoIngrediente(i: number) {
    const l = linhas[i];
    const preco = parseFloat(l.precoUnitario) || 0;
    if (preco <= 0) return;
    addOrUpdateMateriaPrimaCustom({
      nome: l.produto,
      categoria: familia || 'Outros',
      unidadeCompra: l.und,
      precoKg: l.und === 'un' ? 0 : preco,
      precoUnitario: l.und === 'un' ? preco : preco,
      aliases: [l.produto.toLowerCase()],
    });
    resolverAvisosDoIngrediente(l.produto);
  }

  function setQtEnc(i: number, v: number) {
    setLinhas(prev => { const n = [...prev]; n[i] = recalc({ ...n[i], qtEncomenda: v }); return n; });
  }

  function setDecisao(i: number, d: 'comprar' | 'produzir') {
    setLinhas(prev => { const n = [...prev]; n[i] = { ...n[i], decisaoProfessor: d, perguntarProfessor: false }; return n; });
  }

  // Totais
  const linhasAtivas = linhas.filter(l => l.decisaoProfessor !== 'produzir');
  const totEnc = linhasAtivas.reduce((s, l) => s + l.precoEncomenda, 0);
  const qbVal = totEnc * (quebras / 100);
  const crTotal = totEnc + qbVal;
  const cr1pax = paxEncTotal > 0 ? crTotal / paxEncTotal : 0;
  const pvs = bevCost > 0 ? cr1pax / (bevCost / 100) : 0;
  const pvp = pvs * 1.13;
  const todosAvisos = linhas.flatMap(l => l.avisos).filter(Boolean);
  const linhasNormais = linhas.filter(l => !l.isQB && !l.perguntarProfessor);
  const linhasQB = linhas.filter(l => l.isQB);
  const linhasPergunta = linhas.filter(l => l.perguntarProfessor);

  // Envio Sheets — estrutura exacta do template ECL
  async function enviarSheets() {
    setMsg('A enviar para Google Sheets...');
    try {
      const payload = {
        nomeReceita, familia,
        paxTotal: paxEncTotal,   // H7 — Encomendas
        paxReceita: paxBaseTotal, // L7 — Receita para
        turma: planoSel?.turmaId || turmaId || '',
        dataAula: planoSel?.data || '',
        formador: nomeProfessor || planoSel?.professor || '',
        responsavel,  // N42
        atividade,    // K70
        // Preparação — preenchida AUTOMATICAMENTE com os passos da(s) Ficha(s)
        // Técnica(s) associada(s), sem o professor precisar de escrever nada
        // na Requisição. Só os passos, sem ingredientes (pedido de 21/06/2026).
        preparacao: fichasSelecionadas
          .map(f => {
            const passos = (f.preparacao || [])
              .slice()
              .sort((a, b) => (a.num || 0) - (b.num || 0))
              .map(p => `${p.num}. ${p.descricao}`)
              .join('\n');
            // Só identificar o prato no cabeçalho se houver mais de uma ficha
            return fichasSelecionadas.length > 1 ? `${f.nomePrato}:\n${passos}` : passos;
          })
          .filter(Boolean)
          .join('\n\n'),
        consumo: { bar: consumo.bar, rest: consumo.rest, interno: consumo.interno, convidados: consumo.convidados },
        // Ingredientes → linhas 16-58 do Sheets
        // A = fórmula calculada (não escrever) | B=qtReceita | C=nome | H=und | L=precoUnitario
        // Inclui também linhas Q.B. (sal, especiarias a gosto) — já têm uma
        // quantidade mínima estimada calculada, não devem ser excluídas da
        // requisição (o responsável de compras precisa de saber que existem).
        ingredientes: linhasAtivas.map(l => ({
          nome: l.produto,
          qtReceita: fQnEnvio(l.qtReceita, l.und),
          und: l.und,
          // Normalizar preço: vírgula → ponto (formato pt-PT → número universal)
          // O Apps Script e o Google Sheets esperam sempre ponto decimal.
          preco: parseFloat((l.precoUnitario || '0').replace(',', '.')) || 0,
        })),
      };
      // PROXY VERCEL — em vez de enviar directamente para o Apps Script
      // (que causava redirect 302 bloqueado pelo browser com no-cors),
      // enviamos para a nossa própria função serverless Vercel que
      // reencaminha do lado do servidor. Confirmado pelo Network tab:
      // "exec 302 fetch / Redirect" — browser não conseguia seguir.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      let dadosResposta: any = null;
      try {
        const resposta = await fetch('/api/enviarRequisicao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        try { dadosResposta = await resposta.json(); } catch {}
      } finally {
        clearTimeout(timeout);
      }
      if (dadosResposta?.ok === false) {
        setMsg('⚠️ Erro: ' + (dadosResposta.mensagem || 'desconhecido'));
      } else {
        setMsg('✓ Enviado para o Google Sheets!');
        if (dadosResposta?.urlSheets) {
          setLinkSheets(dadosResposta.urlSheets);
        }
      }
    } catch (e) {
      if (String(e).includes('abort')) {
        setMsg('⏱️ Tempo limite — verifica se a aba apareceu no Sheets.');
      } else {
        setMsg('❌ Falhou: ' + String(e));
      }
    }
    setTimeout(() => setMsg(''), 8000);
  }

  // ── FASE 1 — ESCOLHER ─────────────────────────────────────
  // Calendário de planos — estado local
  const [mesAtual, setMesAtual] = React.useState(() => {
    // Abrir no mês do plano mais recente com fichas — mais útil que o mês actual
    const planoMaisRecente = planos.find(p => (p.fichasIds?.length ?? 0) > 0 && p.data);
    if (planoMaisRecente?.data) {
      // Garantir formato YYYY-MM-DD independentemente do que vier da BD
      const dataStr = String(planoMaisRecente.data).slice(0, 10);
      const partes = dataStr.split('-');
      if (partes.length === 3) {
        return { ano: parseInt(partes[0]), mes: parseInt(partes[1]) - 1 };
      }
    }
    const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() };
  });
  const [fichaDetalhe, setFichaDetalhe] = React.useState<FichaProducao | null>(null);


  // Parse seguro de data YYYY-MM-DD sem problemas de timezone
  function parseData(dataStr: string): Date | null {
    if (!dataStr) return null;
    const s = String(dataStr).slice(0, 10);
    const partes = s.split('-');
    if (partes.length !== 3) return null;
    return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  }

  // Dias do mês com planos
  const diasComPlano = React.useMemo(() => {
    const mapa: Record<string, PlanoAula[]> = {};
    planos.forEach(p => {
      if (!p.data) return;
      const d = parseData(String(p.data));
      if (!d) return;
      if (d.getFullYear() === mesAtual.ano && d.getMonth() === mesAtual.mes) {
        const dia = d.getDate();
        if (!mapa[dia]) mapa[dia] = [];
        mapa[dia].push(p);
      }
    });
    return mapa;
  }, [planos, mesAtual]);

  const diasNoMes = new Date(mesAtual.ano, mesAtual.mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(mesAtual.ano, mesAtual.mes, 1).getDay();
  const nomeMes = new Date(mesAtual.ano, mesAtual.mes, 1)
    .toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase());
  const hoje2 = new Date().toISOString().slice(0, 10);

  if (fase === 'escolher') {
    // Modal de detalhe de ficha
    if (fichaDetalhe) {
      return (
        <div style={{ background: 'var(--requisicao-pale)', borderRadius: 16, padding: 16 }}>
          <button onClick={() => setFichaDetalhe(null)} style={{
            background: 'rgba(26,23,20,0.07)', border: 'none', borderRadius: 8,
            padding: '7px 14px', cursor: 'pointer', fontSize: 13,
            fontWeight: 600, marginBottom: 12,
          }}>← Voltar</button>
          <div style={{ background: '#fff', borderRadius: 14, padding: 16,
            border: '1px solid rgba(26,23,20,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18,
              fontWeight: 700, marginBottom: 4 }}>{fichaDetalhe.nomePrato}</div>
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginBottom: 12 }}>
              {fichaDetalhe.classificacao}
              {(fichaDetalhe as any).familia1 && ` · ${(fichaDetalhe as any).familia1}`}
              {fichaDetalhe.numPorcoes && ` · receita base: ${fichaDetalhe.numPorcoes} doses`}
            </div>
            {Array.isArray(fichaDetalhe.ingredientes) && fichaDetalhe.ingredientes.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--copper)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Ingredientes
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--copper)', color: '#fff' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Ingrediente</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Qtd</th>
                      <th style={{ padding: '6px 10px' }}>Un</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fichaDetalhe.ingredientes.map((ing, i) => (
                      <tr key={i} style={{ background: i%2===0 ? '#fff' : 'rgba(181,101,29,0.04)',
                        borderBottom: '1px solid rgba(26,23,20,0.05)' }}>
                        <td style={{ padding: '6px 10px' }}>{ing.produto}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{ing.qt}</td>
                        <td style={{ padding: '6px 10px', color: 'rgba(26,23,20,0.5)' }}>{ing.un}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {fichaDetalhe.alergenicos && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#FCEBEB',
                borderRadius: 8, fontSize: 12, color: '#A32D2D' }}>
                ⚠️ {Array.isArray(fichaDetalhe.alergenicos)
                  ? fichaDetalhe.alergenicos.join(', ')
                  : fichaDetalhe.alergenicos}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ background: 'var(--requisicao-pale)', borderRadius: 16, padding: 16 }}>
        <div style={{ background: 'var(--requisicao)', borderRadius: 14,
          padding: '16px 18px', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20,
            fontWeight: 700, marginBottom: 4, color: 'white' }}>🛒 Nova Requisição</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            Selecciona o dia no calendário, escolhe as fichas e define as doses.
          </div>
        </div>

        {/* ── CALENDÁRIO ── */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => setMesAtual(m => {
              const d = new Date(m.ano, m.mes - 1, 1);
              return { ano: d.getFullYear(), mes: d.getMonth() };
            })} style={{ background: 'none', border: 'none', fontSize: 20,
              cursor: 'pointer', color: 'var(--copper)', padding: '0 6px' }}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 14,
              textTransform: 'capitalize' }}>{nomeMes}</div>
            <button onClick={() => setMesAtual(m => {
              const d = new Date(m.ano, m.mes + 1, 1);
              return { ano: d.getFullYear(), mes: d.getMonth() };
            })} style={{ background: 'none', border: 'none', fontSize: 20,
              cursor: 'pointer', color: 'var(--copper)', padding: '0 6px' }}>›</button>
          </div>

          {/* Dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
            gap: 2, marginBottom: 4 }}>
            {['D','S','T','Q','Q','S','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10,
                fontWeight: 700, color: 'rgba(26,23,20,0.35)',
                padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Grelha de dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {/* Offset */}
            {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
              <div key={`off${i}`} />
            ))}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const dia = i + 1;
              const dataStr = `${mesAtual.ano}-${String(mesAtual.mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
              const temPlano = !!diasComPlano[dia];
              const isHoje = dataStr === hoje2;
              const isSel = planoSel?.data === dataStr;
              return (
                <button key={dia} onClick={() => {
                  if (diasComPlano[dia]?.length) {
                    selecionarPlano(diasComPlano[dia][0]);
                  }
                }} style={{
                  padding: '8px 2px', borderRadius: 8, border: 'none',
                  background: isSel ? 'var(--copper)'
                    : isHoje ? 'rgba(181,101,29,0.12)'
                    : temPlano ? 'rgba(181,101,29,0.06)'
                    : 'transparent',
                  color: isSel ? '#fff'
                    : temPlano ? 'var(--copper)'
                    : 'rgba(26,23,20,0.4)',
                  fontWeight: isSel || temPlano ? 700 : 400,
                  fontSize: 13, cursor: temPlano ? 'pointer' : 'default',
                  position: 'relative',
                }}>
                  {dia}
                  {temPlano && !isSel && (
                    <div style={{ position: 'absolute', bottom: 2, left: '50%',
                      transform: 'translateX(-50%)', width: 4, height: 4,
                      borderRadius: '50%', background: 'var(--copper)' }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Se há múltiplos planos no mesmo dia */}
          {planoSel && diasComPlano[parseData(String(planoSel.data))?.getDate() ?? 0]?.length > 1 && (
            <div style={{ marginTop: 10, paddingTop: 10,
              borderTop: '1px solid rgba(26,23,20,0.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)',
                marginBottom: 6, textTransform: 'uppercase' }}>
                Planos neste dia
              </div>
              {(diasComPlano[parseData(String(planoSel.data))?.getDate() ?? 0] || []).map(p => (
                <div key={p.id} onClick={() => selecionarPlano(p)} style={{
                  padding: '7px 10px', borderRadius: 8, marginBottom: 4,
                  border: `1.5px solid ${planoSel.id===p.id ? 'var(--copper)' : 'var(--border)'}`,
                  background: planoSel.id===p.id ? 'var(--copper-pale)' : '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>
                  {p.titulo}
                  <span style={{ fontSize: 11, fontWeight: 400,
                    color: 'rgba(26,23,20,0.5)', marginLeft: 6 }}>
                    {p.fichasIds?.length || 0} fichas
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Plano seleccionado */}
          {planoSel && (
            <div style={{ marginTop: 12, padding: '12px 14px',
              background: 'var(--copper-pale)', borderRadius: 10,
              border: '1.5px solid var(--copper)',
              display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13,
                  color: 'var(--copper)', marginBottom: 2 }}>
                  ✓ {planoSel.titulo}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.55)' }}>
                  {planoSel.data
                    ? (() => { const d = parseData(String(planoSel.data)); return d ? d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : String(planoSel.data).slice(0,10); })()
                    : ''}
                  {planoSel.ucId && ` · ${planoSel.ucId}`}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginTop: 2 }}>
                  {planoSel.fichasIds?.length || 0} ficha(s) associada(s)
                </div>
              </div>
              <button onClick={() => {
                  // scroll suave para as fichas
                  document.getElementById('req-fichas')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: 'var(--copper)', color: '#fff', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Ver fichas ↓
              </button>
            </div>
          )}
        </div>

        {/* 2. Fichas e doses */}
        {planoSel && (
          <div id="req-fichas" style={S.card}>
            <label style={S.lbl}>2. Fichas de producao e doses</label>
            <div style={{ ...S.muted, marginBottom: 10 }}>Seleciona as fichas e define as doses pretendidas para cada uma.</div>
            {fichasDisp.length === 0 ? (
              <div style={{ padding: '12px', color: 'rgba(26,23,20,0.5)', fontSize: 13, textAlign: 'center' }}>
                Este plano não tem fichas de produção associadas. Adiciona fichas no Plano de Aula.
              </div>
            ) : null}
            {fichasDisp.map(f => (
              <div key={f.id} style={{ border: `1.5px solid ${fichasSel.includes(f.id) ? 'var(--copper)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 6, background: fichasSel.includes(f.id) ? 'var(--copper-pale)' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div onClick={() => toggleFicha(f.id)} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize:13, color: 'white', border: `1.5px solid ${fichasSel.includes(f.id) ? 'var(--copper)' : 'rgba(26,23,20,0.55)'}`, background: fichasSel.includes(f.id) ? 'var(--copper)' : 'transparent' }}>
                    {fichasSel.includes(f.id) && 'v'}
                  </div>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleFicha(f.id)}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nomePrato}</div>
                    <div style={S.muted}>{f.classificacao} · receita base: {f.numPorcoes} doses</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFichaDetalhe(f); }}
                    style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(26,23,20,0.15)',
                      background: '#fff', fontSize: 11, fontWeight: 600,
                      color: 'rgba(26,23,20,0.6)', cursor: 'pointer', flexShrink: 0 }}>
                    Ver ficha
                  </button>
                  {fichasSel.includes(f.id) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize:13, color: 'var(--copper)', fontWeight: 600 }}>Doses:</span>
                      <input type="number" min={1} value={paxPorFicha[f.id] || parseFloat(f.numPorcoes) || 4}
                        onChange={e => setPaxPorFicha(p => ({ ...p, [f.id]: Number(e.target.value) }))}
                        style={{ ...S.inp, width: 60, textAlign: 'center' }} />
                    </div>
                  )}
                </div>

                {/* Ingredientes com preço — só quando ficha seleccionada */}
                {fichasSel.includes(f.id) && Array.isArray(f.ingredientes) && f.ingredientes.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(26,23,20,0.08)', paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--copper)',
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      💶 Preço dos ingredientes (opcional — preenche para estimativa de custo)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4 }}>
                      {f.ingredientes.filter(ing => ing?.produto?.trim()).map((ing, ii) => {
                        const chave = ing.produto.toLowerCase().trim();
                        const custom = getMateriasPrimasCustom();
                        const { mp } = encontrarMateriaPrimaComConfianca(ing.produto, custom);
                        const precoSugerido = mp ? (ing.un === 'un' ? mp.precoUnitario : mp.precoKg) : 0;
                        const valorActual = precosPreReq[chave] || (precoSugerido > 0 ? precoSugerido.toFixed(2).replace('.', ',') : '');
                        return (
                          <React.Fragment key={ii}>
                            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.7)',
                              alignSelf: 'center', paddingLeft: 4 }}>
                              {ing.produto}
                              <span style={{ color: 'rgba(26,23,20,0.4)', marginLeft: 4 }}>
                                ({ing.qt} {ing.un})
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={valorActual}
                                placeholder={ing.un === 'un' ? '€/un' : '€/kg'}
                                onChange={e => {
                                  const v = e.target.value.replace(',', '.');
                                  setPrecosPreReq(p => ({ ...p, [chave]: e.target.value }));
                                  // Guardar na base de dados para próxima vez
                                  if (parseFloat(v) > 0) {
                                    addOrUpdateMateriaPrimaCustom({
                                      nome: ing.produto,
                                      categoria: f.classificacao || 'Outros',
                                      unidadeCompra: ing.un === 'un' ? 'un' : 'kg',
                                      precoKg: ing.un === 'un' ? 0 : parseFloat(v),
                                      precoUnitario: ing.un === 'un' ? parseFloat(v) : parseFloat(v),
                                      aliases: [chave],
                                    });
                                  }
                                }}
                                style={{ width: 72, padding: '3px 6px', borderRadius: 6, fontSize: 12,
                                  border: `1px solid ${valorActual ? 'var(--copper)' : 'var(--border)'}`,
                                  background: valorActual ? 'var(--copper-pale)' : '#fff',
                                  textAlign: 'right' }}
                              />
                              <span style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', minWidth: 28 }}>
                                {ing.un === 'un' ? '€/un' : '€/kg'}
                              </span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Ajuste de doses — aparece sempre que há fichas selecionadas, mesmo com só 1 */}
        {planoSel && fichasSel.length > 0 && (
          <div style={S.card}>
            <label style={S.lbl}>Nº de doses por ficha</label>
            {fichasSelecionadas.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--copper-pale)', border: '1px solid rgba(181,101,29,0.15)' }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--copper)' }}>
                  {f.nomePrato}
                  <span style={{ fontWeight: 400, color: 'rgba(26,23,20,0.5)', marginLeft: 6, fontSize: 12 }}>
                    (receita base: {f.numPorcoes} doses)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setPaxPorFicha(p => ({ ...p, [f.id]: Math.max(1, (p[f.id] || parseFloat(f.numPorcoes) || 4) - 1) }))}
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(181,101,29,0.3)', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--copper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <input
                    type="number" min={1}
                    value={paxPorFicha[f.id] || parseFloat(f.numPorcoes) || 4}
                    onChange={e => setPaxPorFicha(p => ({ ...p, [f.id]: Math.max(1, Number(e.target.value)) }))}
                    style={{ ...S.inp, width: 60, textAlign: 'center', fontWeight: 700, fontSize: 15 }} />
                  <button
                    onClick={() => setPaxPorFicha(p => ({ ...p, [f.id]: (p[f.id] || parseFloat(f.numPorcoes) || 4) + 1 }))}
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(181,101,29,0.3)', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--copper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.45)', textAlign: 'right', marginTop: 2 }}>
              Total: {paxEncTotal} doses
            </div>
          </div>
        )}

        {/* 3. Dados adicionais */}
        {planoSel && fichasSel.length > 0 && (
          <div style={S.card}>
            <label style={S.lbl}>3. Dados adicionais</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div><label style={S.lbl}>Familia / Classificacao</label><input style={{ ...S.inp, width: '100%' }} value={familia} onChange={e => setFamilia(e.target.value)} placeholder="ex: Peixe, Sobremesa..." /></div>
              <div><label style={S.lbl}>Quebras (%)</label><input style={{ ...S.inp, width: '100%' }} type="number" value={quebras} onChange={e => setQuebras(Number(e.target.value))} /></div>
              <div><label style={S.lbl}>Beverage Cost (%)</label><input style={{ ...S.inp, width: '100%' }} type="number" value={bevCost} onChange={e => setBevCost(Number(e.target.value))} /></div>
              <div><label style={S.lbl}>Responsavel compras *manual*</label><input style={{ ...S.inp, width: '100%' }} value={responsavel}
                onChange={e => { setResponsavel(e.target.value); try { localStorage.setItem('ecl_ultimo_responsavel_compras', e.target.value); } catch {} }}
                placeholder="Nome de quem faz as compras" /></div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={S.lbl}>Atividade (pré-preenchida do plano — podes ajustar)</label>
              <input style={{ ...S.inp, width: '100%' }} value={atividade} onChange={e => setAtividade(e.target.value)} placeholder="ex: Almoco dos Pais · ECL Restaurante" />
            </div>
            <div>
              <label style={S.lbl}>Consumo</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {([['bar', 'ECL BAR'], ['rest', 'ECL Restaurante'], ['interno', 'Consumo Interno'], ['convidados', 'Convidados']] as const).map(([k, l]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${consumo[k] ? 'var(--copper)' : 'var(--border)'}`, background: consumo[k] ? 'var(--copper-pale)' : '#fff', cursor: 'pointer', fontSize: 12 }}>
                    <input type="checkbox" checked={consumo[k]} onChange={e => setConsumo(p => ({ ...p, [k]: e.target.checked }))} style={{ accentColor: 'var(--copper)' }} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {planoSel && fichasSel.length > 0 && (
          <button style={{ ...S.btnP, width: '100%' }} onClick={gerarLinhas}>
            Gerar requisicao — {fichasSel.length} ficha{fichasSel.length > 1 ? 's' : ''} · {paxEncTotal} doses →
          </button>
        )}
      </div>
    );
  }

  // ── FASE 2 — EDITAR E ENVIAR ──────────────────────────────
  return (
    <div style={{ background: 'var(--requisicao-pale)', borderRadius: 16, padding: 16 }}>
      <button className="no-print" style={{ ...S.btnG, marginBottom: 12 }} onClick={() => setFase('escolher')}>← Voltar</button>

      {/* Modal de sugestão de correcção de ingrediente */}
      {sugestaoAberta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>💡 Sugerir correcção</div>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 16 }}>
              "{sugestaoAberta}" não está na base de dados. Preenche o que souberes — a Coordenadora vai verificar e aprovar.
            </div>
            {sugestaoEnviada ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, color: 'var(--sage)' }}>Sugestão enviada!</div>
                <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)', marginTop: 4 }}>A Coordenadora irá verificar e aprovar.</div>
                <button onClick={() => { setSugestaoAberta(null); setSugestaoEnviada(false); setSugestaoForm({ precoKg: '', unidadeCompra: 'kg', categoria: '', observacao: '' }); }}
                  style={{ marginTop: 14, padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Preço (€/kg ou €/un)</label>
                  <input type="number" step="0.01" value={sugestaoForm.precoKg}
                    onChange={e => setSugestaoForm(f => ({ ...f, precoKg: e.target.value }))}
                    style={{ ...S.inp, width: '100%' }} placeholder="ex: 2.50" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Unidade de compra</label>
                  <select value={sugestaoForm.unidadeCompra}
                    onChange={e => setSugestaoForm(f => ({ ...f, unidadeCompra: e.target.value }))}
                    style={{ ...S.inp, width: '100%' }}>
                    <option value="kg">kg</option>
                    <option value="un">un (unidade)</option>
                    <option value="l">l (litro)</option>
                    <option value="embalagem">embalagem</option>
                  </select>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Categoria</label>
                  <select value={sugestaoForm.categoria}
                    onChange={e => setSugestaoForm(f => ({ ...f, categoria: e.target.value }))}
                    style={{ ...S.inp, width: '100%' }}>
                    <option value="">Seleccionar...</option>
                    <option value="Proteína animal">Proteína animal</option>
                    <option value="Peixe e marisco">Peixe e marisco</option>
                    <option value="Vegetais">Vegetais</option>
                    <option value="Farinhas">Farinhas</option>
                    <option value="Laticínios">Laticínios</option>
                    <option value="Gorduras">Gorduras</option>
                    <option value="Açúcares">Açúcares</option>
                    <option value="Especiarias e ervas">Especiarias e ervas</option>
                    <option value="Ovos">Ovos</option>
                    <option value="Massas e cereais">Massas e cereais</option>
                    <option value="Conservas">Conservas</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observação (opcional)</label>
                  <textarea value={sugestaoForm.observacao}
                    onChange={e => setSugestaoForm(f => ({ ...f, observacao: e.target.value }))}
                    style={{ ...S.inp, width: '100%', minHeight: 60 }}
                    placeholder="ex: produzido em aula, não se compra; ou: verificar se é igual a Massa folhada" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setSugestaoAberta(null); setSugestaoForm({ precoKg: '', unidadeCompra: 'kg', categoria: '', observacao: '' }); }}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                    Cancelar
                  </button>
                  <button onClick={() => {
                    addSugestaoIngrediente({
                      nomeOriginal: sugestaoAberta,
                      precoKg: parseFloat(sugestaoForm.precoKg) || 0,
                      unidadeCompra: sugestaoForm.unidadeCompra,
                      categoria: sugestaoForm.categoria,
                      observacao: sugestaoForm.observacao,
                      sugeridoPor: nomeProfessor || 'Professor',
                    });
                    setSugestaoEnviada(true);
                  }} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                    ✓ Enviar sugestão à Coordenadora
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cabecalho tipo ficha ECL */}
      <div style={{ background: 'var(--charcoal)', borderRadius: 14, padding: '18px', marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>{nomeReceita}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[['Familia', familia || '—'], ['Encomendas', `${paxEncTotal} doses`], ['Receita para', `${paxBaseTotal} doses`], ['Turma', planoSel?.turmaId || '—'], ['Data aula', planoSel?.data || '—'], ['Formador', planoSel?.professor || '—']].map(([l, v]) => (
            <div key={l}><div style={{ fontSize:12, color: 'rgba(247,241,230,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div><div style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 500 }}>{v}</div></div>
          ))}
        </div>
        {atividade && <div style={{ marginTop: 8, fontSize:13, color: 'rgba(247,241,230,0.7)' }}>Atividade: {atividade}</div>}
        {responsavel && <div style={{ fontSize:13, color: 'rgba(247,241,230,0.6)' }}>Resp. compras: {responsavel}</div>}
        {Object.values(consumo).some(v => v) && (
          <div style={{ fontSize:13, color: 'rgba(247,241,230,0.6)', marginTop: 2 }}>
            Tipo de serviço: {Object.entries(consumo).filter(([, v]) => v).map(([k]) =>
              k === 'bar' ? 'ECL BAR' : k === 'rest' ? 'ECL Restaurante' : k === 'interno' ? 'Consumo Interno' : 'Convidados'
            ).join(', ')}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {fichasSelecionadas.map(f => (
            <span key={f.id} style={{ fontSize:13, padding: '2px 8px', borderRadius: 20, background: 'rgba(247,241,230,0.6)', color: 'var(--cream)' }}>
              {f.nomePrato} · {paxPorFicha[f.id] || parseFloat(f.numPorcoes) || 1} doses
            </span>
          ))}
        </div>
      </div>

      {/* Decisao produzir/comprar */}
      {linhasPergunta.length > 0 && (
        <div className="no-print" style={{ ...S.card, border: '2px solid var(--danger)', background: '#fff8f0' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--danger)', marginBottom: 4 }}>
            ⚠️ Atenção — massas base devem ser produzidas em aula
          </div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.65)', marginBottom: 12 }}>
            Em cozinha/pastelaria pedagógica, as massas base fazem parte das competências a desenvolver.
            Cada massa deve ter uma <strong>Ficha Técnica própria</strong> associada a este plano de aula.
          </div>
          {linhasPergunta.map(l => {
            const i = linhas.indexOf(l);
            const prep = l.preparacaoInfo as any;
            const materiais = prep?.materiasPrimas || [];
            const podeTambemComprar = prep?.podeComprar !== false; // massa filo pode comprar-se
            return (
              <div key={l.id} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(196,60,20,0.2)', background: '#fff', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>📋 {l.produto}</div>
                {materiais.length > 0 && (
                  <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>
                    Matérias-primas base: {materiais.join(', ')}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginBottom: 10 }}>
                  → Cria uma Ficha Técnica separada para a produção desta massa e associa-a a este plano de aula.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => setDecisao(i, 'produzir')}
                    style={{ flex: 2, padding: '8px 12px', borderRadius: 8, border: `2px solid ${l.decisaoProfessor === 'produzir' ? 'var(--sage)' : 'var(--border)'}`, background: l.decisaoProfessor === 'produzir' ? 'var(--sage)' : '#fff', color: l.decisaoProfessor === 'produzir' ? 'white' : 'var(--charcoal)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    ✓ Produzir em aula (ficha técnica própria)
                  </button>
                  {podeTambemComprar && (
                    <button onClick={() => setDecisao(i, 'comprar')}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `2px solid ${l.decisaoProfessor === 'comprar' ? 'var(--copper)' : 'var(--border)'}`, background: l.decisaoProfessor === 'comprar' ? 'var(--copper)' : '#fff', color: l.decisaoProfessor === 'comprar' ? 'white' : 'rgba(26,23,20,0.5)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      Excepção: comprar
                    </button>
                  )}
                </div>
                {l.decisaoProfessor === 'comprar' && (
                  <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 7, background: 'var(--copper-pale)', fontSize: 11, color: 'var(--copper)' }}>
                    ⚠️ Compra autorizada — fica registado. Justifica na observação da ficha técnica.
                  </div>
                )}
                {l.decisaoProfessor === 'produzir' && (
                  <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(74,90,138,0.08)', border: '1px solid rgba(74,90,138,0.2)', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--guia)', marginBottom: 4 }}>⏳ Pendência criada</div>
                    <div style={{ color: 'rgba(26,23,20,0.7)' }}>"{l.produto}" não vai para a requisição de compras. Antes da aula:</div>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 11, color: 'var(--guia)', fontWeight: 600 }}>✓ Cria uma Ficha Técnica para esta massa e associa-a a este plano</div>
                      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>As matérias-primas base precisam de aparecer numa requisição separada</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Conversoes automaticas */}
      {todosAvisos.length > 0 && (
        <div style={{ ...S.card, background: 'var(--info-pale)', border: '1px solid rgba(37,99,235,0.2)' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--info)', marginBottom: 6 }}>Conversoes automaticas aplicadas</div>
          {todosAvisos.map((a, i) => <div key={i} style={{ fontSize:13, color: 'var(--info)', marginBottom: 2 }}>→ {a}</div>)}
        </div>
      )}

      {/* DOSES — editável na fase editar */}
      <div style={{ ...S.card, background: 'var(--copper-pale)', border: '1px solid rgba(181,101,29,0.2)' }}>
        <label style={{ ...S.lbl, color: 'var(--copper)' }}>Nº de doses por ficha</label>
        {fichasSelecionadas.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
              {f.nomePrato}
              <span style={{ fontWeight: 400, color: 'rgba(26,23,20,0.45)', marginLeft: 6, fontSize: 11 }}>(base: {f.numPorcoes})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setPaxPorFicha(p => ({ ...p, [f.id]: Math.max(1, (p[f.id] || parseFloat(f.numPorcoes) || 4) - 1) }))}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(181,101,29,0.3)', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--copper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <input type="number" min={1}
                value={paxPorFicha[f.id] || parseFloat(f.numPorcoes) || 4}
                onChange={e => setPaxPorFicha(p => ({ ...p, [f.id]: Math.max(1, Number(e.target.value)) }))}
                style={{ width: 60, textAlign: 'center', fontWeight: 700, fontSize: 15, padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(181,101,29,0.3)' }} />
              <button onClick={() => setPaxPorFicha(p => ({ ...p, [f.id]: (p[f.id] || parseFloat(f.numPorcoes) || 4) + 1 }))}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(181,101,29,0.3)', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'var(--copper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
        ))}
        <button
          onClick={() => setLinhas(agregarIngredientes(fichasSelecionadas, paxPorFicha))}
          style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}>
          🔄 Recalcular para {fichasSelecionadas.reduce((s, f) => s + (paxPorFicha[f.id] || parseFloat(f.numPorcoes) || 4), 0)} doses
        </button>
      </div>

      {/* Resumo financeiro */}
      <div style={S.card}>
        <label style={S.lbl}>Resumo financeiro</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center', marginBottom: 10 }}>
          {[['CR/dose', fE(cr1pax)], ['PVS s/IVA', fE(pvs)], ['PVP c/IVA 13%', fE(pvp)], ['Bev.Cost', `${bevCost}%`]].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--copper-pale)', borderRadius: 10, padding: '10px 4px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--copper)' }}>{v}</div>
              <div style={S.muted}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
          {[['Total Encomenda', fE(totEnc)], [`Quebras ${quebras}%`, fE(qbVal)], ['Custo Real Total', fE(crTotal)]].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              <div style={S.muted}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela ingredientes — editavel */}
      <div style={S.card}>
        <label style={S.lbl}>Ingredientes — {linhasNormais.length} produtos · todos editaveis</label>
        <div style={S.muted}>Produto, unidade, quantidade e preco podem ser corrigidos. Agua excluida automaticamente.</div>
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize:13 }}>
            <thead>
              <tr style={{ background: 'var(--charcoal)', color: 'var(--cream)' }}>
                <th style={{ padding: '7px 8px', textAlign: 'left', minWidth: 130 }}>Produto</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 55, fontSize:12 }}>Qt/pax</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 55, fontSize:12 }}>Qt Receita</th>
                <th style={{ padding: '7px 4px', textAlign: 'left', minWidth: 38 }}>Und</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 65, fontSize:12 }}>Qt Enc.</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 58, fontSize:12 }}>€/kg</th>
                <th style={{ padding: '7px 5px', textAlign: 'right', minWidth: 55, fontSize:12 }}>€ Enc.</th>
              </tr>
            </thead>
            <tbody>
              {linhasNormais.map(l => {
                const i = linhas.indexOf(l);
                const rend = obterRendimento(l.produto);
                const nomeLimpo = l.produto.replace(/\s*\([^)]*\)/g,'').trim();
                const { mp: mpFormas } = encontrarMateriaPrimaComConfianca(nomeLimpo, getMateriasPrimasCustom());
                const formas = mpFormas?.formasComerciais || [];
                return (
                  <tr key={l.id} style={{ background: '#fff', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '3px 4px' }}>
                      <input value={l.produto} onChange={e => {
                        setL(i, 'produto', e.target.value);
                        if (/microgreen|microvegeta/i.test(e.target.value)) setPainelMicrogreens(true);
                      }} style={{ ...S.inp, width: '100%', fontSize:13 }} />
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {l.daBD && <span style={{ fontSize:12, color: 'var(--sage)' }}>BD</span>}
                        {rend && !formas.length && <span style={{ fontSize:12, color: 'rgba(26,23,20,0.35)' }}>Rend. {Math.round(rend.rendimento * 100)}%</span>}
                        {!l.daBD && (
                          <button type="button"
                            onClick={() => setSugestaoAberta(l.produto)}
                            style={{ fontSize:10, padding: '2px 6px', borderRadius: 6, border: '1px solid var(--copper)', background: 'var(--copper-pale)', color: 'var(--copper)', cursor: 'pointer', fontWeight: 600 }}>
                            💡 Sugerir
                          </button>
                        )}
                      </div>
                      {formas.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <select
                            value={l.formaCompra || ''}
                            onChange={e => {
                              const forma = formas.find(f => f.forma === e.target.value);
                              const rend2 = forma?.rendimento || 1;
                              setL(i, 'formaCompra', e.target.value);
                              setL(i, 'rendimento', rend2);
                              setL(i, 'qtCompra', rend2 > 0 ? l.qtEncomenda / rend2 : l.qtEncomenda);
                            }}
                            style={{ fontSize:11, padding:'2px 4px', borderRadius:4, border:'1px solid rgba(181,101,29,0.4)', background:'#fff', width:'100%', cursor:'pointer' }}
                          >
                            <option value=''>🛒 Forma de compra...</option>
                            {formas.map(f => (
                              <option key={f.forma} value={f.forma}>
                                {f.forma} ({Math.round(f.rendimento*100)}%)
                                {f.precoKg ? ` · €${f.precoKg}/kg` : ''}
                              </option>
                            ))}
                          </select>
                          {l.formaCompra && l.rendimento && l.rendimento < 1 && (
                            <div style={{ fontSize:11, color:'#b5651d', marginTop:3, fontWeight:600 }}>
                              → Comprar: {((l.qtEncomenda||0) / (l.rendimento||1)).toFixed(3)} {l.und}
                              {formas.find(f=>f.forma===l.formaCompra)?.nota && (
                                <span style={{ color:'rgba(26,23,20,0.4)', fontWeight:400 }}> · {formas.find(f=>f.forma===l.formaCompra)?.nota}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', color: 'rgba(26,23,20,0.4)', fontSize:13 }}>{fQn(l.qt1pax, l.und)}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'right', color: 'rgba(26,23,20,0.4)', fontSize:13 }}>{fQn(l.qtReceita, l.und)}</td>
                    <td style={{ padding: '3px 3px' }}>
                      <select value={l.und} onChange={e => setL(i, 'und', e.target.value)} style={{ ...S.inp, width: 45, padding: '4px 3px', fontSize:13, background: l.und === 'un' && !['ovo','ovos','limão','lima','laranja','maracujá','pão'].some(u => l.produto.toLowerCase().includes(u)) ? 'rgba(181,101,29,0.08)' : 'inherit' }}>
                        <option>kg</option><option>l</option><option>un</option><option>q.b.</option><option>g</option><option>ml</option>
                      </select>
                    </td>
                    <td style={{ padding: '3px 3px' }}>
                      <input type="number" step="0.001" value={l.qtEncomenda.toFixed(3)}
                        onChange={e => setQtEnc(i, parseFloat(e.target.value) || 0)}
                        style={{ ...S.inp, width: 65, textAlign: 'right', fontSize:13 }} />
                    </td>
                    <td style={{ padding: '3px 3px', position: 'relative' }}>
                      {!l.precoUnitario && l.produto && (
                        <div style={{ fontSize:10, color:'#b5651d', fontWeight:700, marginBottom:2,
                          background:'rgba(181,101,29,0.08)', borderRadius:4, padding:'2px 5px' }}>
                          ⚠️ Introduza o preço
                        </div>
                      )}
                      <input value={l.precoUnitario}
                        onChange={e => {
                          setL(i, 'precoUnitario', e.target.value);
                        }}
                        onBlur={() => confirmarPrecoIngrediente(i)}
                        style={{ ...S.inp, width: 58, textAlign: 'right', fontSize:13, background: l.daBD ? 'var(--sage-pale)' : '#fff' }}
                        placeholder="0.00" title={l.daBD ? 'Preço da base de dados' : 'Confirma o preço — fica guardado para a próxima vez'} />
                    </td>
                    <td style={{ padding: '3px 5px', textAlign: 'right', fontWeight: l.precoEncomenda > 0 ? 600 : 400, color: l.precoEncomenda > 0 ? 'var(--copper)' : 'rgba(26,23,20,0.55)' }}>
                      {l.precoEncomenda > 0 ? fE(l.precoEncomenda) : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--copper-pale)', fontWeight: 700 }}>
                <td colSpan={6} style={{ padding: '8px 8px', fontSize: 12 }}>Total Encomenda</td>
                <td style={{ padding: '8px 5px', textAlign: 'right', color: 'var(--copper)', fontSize: 12 }}>{fE(totEnc)}</td>
              </tr>
              <tr style={{ background: 'var(--cream-dark)' }}>
                <td colSpan={6} style={{ padding: '6px 8px', fontSize:13 }}>Quebras {quebras}%</td>
                <td style={{ padding: '6px 5px', textAlign: 'right', fontSize:13 }}>{fE(qbVal)}</td>
              </tr>
              <tr style={{ background: 'var(--danger-pale)', fontWeight: 700 }}>
                <td colSpan={6} style={{ padding: '8px 8px', fontSize: 12 }}>Custo Real Total</td>
                <td style={{ padding: '8px 5px', textAlign: 'right', color: 'var(--danger)', fontSize: 12 }}>{fE(crTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* QB */}
      {linhasQB.length > 0 && (
        <div style={S.card}>
          <label style={S.lbl}>Ingredientes q.b. — quantidade minima estimada</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {linhasQB.map(l => (
              <div key={l.id} style={{ padding: '5px 10px', borderRadius: 8, background: 'var(--cream-dark)', border: '1px solid var(--border)', fontSize:13 }}>
                <span style={{ fontWeight: 600 }}>{l.produto}</span>
                <span style={S.muted}> · {fQ(l.qtEncomenda, l.und)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consumo */}
      <div style={{ ...S.card, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
          {responsavel && <span><strong>Resp. compras:</strong> {responsavel}</span>}
          {atividade && <span><strong>Atividade:</strong> {atividade}</span>}
          <span><strong>Consumo:</strong> {Object.entries(consumo).filter(([, v]) => v).map(([k]) => k === 'bar' ? 'ECL BAR' : k === 'rest' ? 'ECL Restaurante' : k === 'interno' ? 'Consumo Interno' : 'Convidados').join(', ') || '—'}</span>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', background: 'var(--sage-pale)', borderRadius: 10, fontSize: 13, color: 'var(--sage)', marginBottom: 10, fontWeight: 600 }}>
          {msg}
          {linkSheets && (
            <a href={linkSheets} target="_blank" rel="noreferrer"
              style={{ display: 'block', marginTop: 8, padding: '6px 12px', borderRadius: 8, background: 'var(--sage)', color: 'white', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 12 }}>
              📊 Abrir no Google Sheets →
            </a>
          )}
        </div>
      )}

      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={S.btnP} onClick={async () => {
          // 1. Guardar localmente
          if (planoSel) {
            // Reutilizar ID da requisição existente — evita duplicados ao editar
            const reqExistente = getRequisicaoPorPlano(planoSel.id);
            addOrUpdateRequisicao({
              id: reqExistente?.id || `req_${planoSel.id}`, planoAulaId: planoSel.id, turmaId: planoSel.turmaId,
              dataAula: planoSel.data, professor: planoSel.professor, fichasIds: fichasSel,
              linhas: linhas.map((l, i) => ({ id: `l${i}`, produto: l.produto, unidade: l.und, quantidadeTotal: l.qtEncomenda, precoUnitario: parseFloat(l.precoUnitario) || undefined, custoTotal: l.precoEncomenda, obs: '' })),
              custoTotal: crTotal, estado: 'enviada', criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString(),
            });
          }
          // 2. Enviar para o Google Sheets com TODOS os dados (preço, unidade, turma, data, formador...)
          await enviarSheets();
          onGuardado?.();
        }}>✓ Guardar e Enviar para o Google Sheets</button>
        <button style={S.btnG} onClick={() => {
          setLinhas(prev => prev.map(l => recalc(l)));
          setTimeout(() => window.print(), 150);
        }}>🖨️ Imprimir / PDF</button>
      </div>
      {/* ── Painel lateral de microgreens ────────────────────────── */}
      {painelMicrogreens && (() => {
        const MG_VARIEDADES = getMateriaPrimasBase().filter((mp: any) => mp.categoria === 'Microgreens' && mp.foto);
        const mgVisiveis = mgFiltro ? MG_VARIEDADES.filter((mg: any) => mg.nome.toLowerCase().includes(mgFiltro.toLowerCase())) : MG_VARIEDADES;
        return (
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 300,
            background: '#fff', borderLeft: '2px solid var(--border)',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
            zIndex: 1000, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: '#5B67EA', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>🌱 Escolher microgreens</div>
                <button onClick={() => setPainelMicrogreens(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Clica numa variedade para seleccionar</div>
            </div>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <input
                placeholder="Filtrar variedade..."
                value={mgFiltro}
                onChange={e => setMgFiltro(e.target.value)}
                style={{ ...S.inp, width: '100%', fontSize: 12 }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {mgVisiveis.map((mg: any) => (
                <div key={mg.id}
                  onClick={() => {
                    // Actualizar a linha que tem microgreens genérico
                    const idx = linhas.findIndex(l => /microgreen|microvegeta/i.test(l.produto));
                    if (idx >= 0) {
                      const preco = mg.precoKg > 0 ? mg.precoKg.toFixed(2).replace('.', ',') : '';
                      setL(idx, 'produto', mg.nome);
                      setL(idx, 'precoUnitario', preco);
                    }
                    setPainelMicrogreens(false);
                    setMgFiltro('');
                  }}
                  style={{ cursor: 'pointer', marginBottom: 8, borderRadius: 10, overflow: 'hidden',
                    border: '1px solid var(--border)', transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(91,103,234,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  {(mg as any).foto && (
                    <img
                      src={(mg as any).foto}
                      alt={mg.nome}
                      style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1714' }}>{mg.nome}</div>
                    {(mg as any).descricaoVisual && (
                      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.55)', marginTop: 3 }}>{(mg as any).descricaoVisual}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#5B67EA', marginTop: 4, fontWeight: 600 }}>
                      ~€{mg.precoKg}/kg · {mg.fonte}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'rgba(26,23,20,0.4)', textAlign: 'center' }}>
              Preços estimados · actualizar com Makro
            </div>
          </div>
        );
      })()}
    </div>
  );
}
