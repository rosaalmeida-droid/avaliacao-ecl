// ============================================================
// Eventos — quantidades por pessoa (capitações)
// ============================================================
// Só valores tirados de manuais e guias profissionais de catering.
// Nada inventado. Cada valor diz de onde vem:
//   • ✔ quando as fontes francesas e espanholas dizem o mesmo;
//   • quando não dizem o mesmo, mostram-se as duas e o professor escolhe
//     (fica guardado no evento). A decisão final para a escola é da Rosa.
// O que nenhuma fonte diz (marcas, produtos) fica para a escola decidir.
// ============================================================

export const FONTE_FR = 'Manuais franceses de traiteur';
export const FONTE_ES = 'Manuais espanhóis de catering';
export const FONTE_US = 'Guias americanos de catering';
export const FONTE_PT = 'Referência portuguesa';

export interface Alternativa { fonte: string; quantidade: string }

export interface Linha {
  oQue: string;
  quantidade: string;
  /** Como se chega ao número (por pessoa). */
  base: string;
  fontes: string[];
  /** true: as fontes batem certo. */
  acordo: boolean;
  /** Quando as fontes não batem certo: id da escolha e as duas opções. */
  divergencia?: { id: string; opcoes: [Alternativa, Alternativa]; escolhida?: 0 | 1 };
  nota?: string;
}

export interface Bloco { titulo: string; linhas: Linha[]; notas: string[] }

export interface OpcoesQuantidades {
  /** Quantas das pessoas são crianças (0 = só adultos). */
  criancas?: number;
  /** Duração/tipo por momento (id do momento → id da opção). */
  duracao?: Record<string, string>;
  /** Escolhas feitas onde as fontes não batem certo. */
  escolha?: Record<string, 0 | 1>;
  /** Número de pratos principais no buffet (carne + peixe). */
  pratos?: number;
}

// ── Crianças ──────────────────────────────────────────────────
// Só os guias americanos dão um valor: 50–60% da porção de adulto.
export const FATOR_CRIANCA = { min: 0.5, max: 0.6 };

/** Pessoas em «equivalente adulto» (intervalo). */
export function equivalenteAdulto(pessoas: number, criancas = 0) {
  const c = Math.min(Math.max(0, criancas), pessoas), a = pessoas - c;
  return { min: a + c * FATOR_CRIANCA.min, max: a + c * FATOR_CRIANCA.max };
}

// ── Opções de duração ─────────────────────────────────────────
export const DURACOES: Record<string, { id: string; nome: string; ajuda: string }[]> = {
  coffee: [
    { id: 'curto', nome: 'Curto', ajuda: '30 a 45 minutos' },
    { id: 'longo', nome: 'Longo', ajuda: 'mais de 45 minutos' },
    { id: 'elaborado', nome: 'Elaborado', ajuda: 'muita variedade' },
  ],
  cocktail: [
    { id: 'antes', nome: 'Antes de uma refeição', ajuda: 'aperitivo' },
    { id: 'hora', nome: '1 hora a 1h15', ajuda: 'sem refeição depois' },
    { id: 'substitui', nome: 'Substitui o almoço/jantar', ajuda: 'as pessoas não comem depois' },
    { id: 'dinatoire', nome: 'Cocktail jantar', ajuda: '2 horas ou mais' },
  ],
};

export function tipoDoMomento(tipo: string, servico: string): 'coffee' | 'welcome' | 'cocktail' | 'refeicao' | 'sem_fonte' {
  if (['coffee_manha', 'coffee_tarde', 'lanche'].includes(tipo)) return 'coffee';
  if (tipo === 'welcome') return 'welcome';
  if (tipo === 'cocktail') return 'cocktail';
  if (['almoco', 'jantar'].includes(tipo)) return servico === 'volante' ? 'cocktail' : 'refeicao';
  return 'sem_fonte';
}

// ── Contas ────────────────────────────────────────────────────
const up = (n: number) => Math.ceil(n - 1e-9);
const kg = (g: number) => (Math.ceil(g / 100) / 10).toFixed(1).replace('.', ',') + ' kg';
const litros = (l: number) => (Math.ceil(l * 2) / 2).toFixed(1).replace('.', ',').replace(',0', '') + ' L';
const faixa = (a: string, b: string) => a === b ? a : `${a} a ${b}`;
const pecas = (min: number, max: number, p: { min: number; max: number }) => faixa(String(up(min * p.min)), String(up(max * p.max))) + ' peças';
const gramas = (min: number, max: number, p: { min: number; max: number }) => faixa(kg(min * p.min), kg(max * p.max));

function divergir(id: string, escolha: OpcoesQuantidades['escolha'], a: Alternativa, b: Alternativa): Pick<Linha, 'quantidade' | 'divergencia'> {
  const e = escolha?.[id];
  return { quantidade: e === 0 ? a.quantidade : e === 1 ? b.quantidade : `${a.quantidade}  ou  ${b.quantidade}`, divergencia: { id, opcoes: [a, b], escolhida: e } };
}

/** As quantidades de um momento do evento. */
export function quantidadesDoMomento(tipo: string, servico: string, pessoas: number, o: OpcoesQuantidades, momentoId: string): Bloco {
  const p = equivalenteAdulto(pessoas, o.criancas);
  const t = tipoDoMomento(tipo, servico);
  const dur = o.duracao?.[momentoId];
  const notas: string[] = [];
  const L: Linha[] = [];
  const ambos = [FONTE_FR, FONTE_ES];

  if (t === 'coffee') {
    const d = dur || 'curto';
    const [mn, mx] = d === 'curto' ? [2, 2] : d === 'longo' ? [2.5, 3] : [4, 5];
    L.push({ oQue: 'Peças (viennoiseries, mini-bolos, salgados)', quantidade: pecas(mn, mx, p),
      base: d === 'elaborado' ? 'até 5 por pessoa' : `${faixa(String(mn).replace('.', ','), String(mx))} por pessoa`, fontes: ambos, acordo: true });
    L.push({ oQue: 'Sumo', quantidade: faixa(litros(0.2 * p.min), litros(0.2 * p.max)), base: '20 cl por pessoa', fontes: ambos, acordo: true });
    L.push({ oQue: 'Café', base: 'duas regras diferentes', fontes: [FONTE_FR, FONTE_ES], acordo: false,
      ...divergir('cafe', o.escolha,
        { fonte: FONTE_FR, quantidade: litros(p.max / 5) + ' (1 L por 5 pessoas)' },
        { fonte: FONTE_ES, quantidade: up(p.max * 1.2) + ' chávenas (1 por pessoa + 20%)' }) });
    L.push({ oQue: 'Chá', quantidade: litros(p.max / 6), base: '1 L por 6 pessoas', fontes: [FONTE_FR], acordo: true, nota: 'só uma fonte' });
    L.push({ oQue: 'Leite', base: 'duas regras diferentes', fontes: [FONTE_PT, FONTE_ES], acordo: false,
      ...divergir('leite', o.escolha,
        { fonte: FONTE_PT, quantidade: faixa(litros(0.03 * p.min), litros(0.06 * p.max)) + ' (30 a 60 ml por pessoa, para o café)' },
        { fonte: FONTE_ES, quantidade: litros(0.15 * p.max) + ' (150 ml por pessoa)' }) });
    L.push({ oQue: 'Total de bebidas (conferir)', quantidade: litros(0.33 * p.max), base: '300 ml por pessoa + 10%', fontes: [FONTE_ES], acordo: true, nota: 'só uma fonte' });
    notas.push('Café, chá e sumo estão contados como se todos bebessem de tudo. O total de bebidas serve para conferir: se a soma passar muito, reduz o que se bebe menos.');
  } else if (t === 'welcome') {
    L.push({ oQue: 'Bebida', quantidade: up(2 * pessoas) + ' copos', base: '2 copos por pessoa na primeira hora', fontes: [FONTE_FR], acordo: true, nota: 'só uma fonte' });
    L.push({ oQue: 'Peças (se vier antes de uma refeição)', quantidade: pecas(6, 8, p), base: '6 a 8 por pessoa', fontes: ambos, acordo: true });
    L.push({ oQue: 'Peso das peças', quantidade: gramas(6 * 20, 8 * 20, p), base: 'cerca de 20 g cada', fontes: ambos, acordo: true });
  } else if (t === 'cocktail') {
    const d = dur || (tipo === 'almoco' || tipo === 'jantar' ? 'substitui' : 'antes');
    let mn = 6, mx = 8;
    if (d === 'antes') {
      L.push({ oQue: 'Peças', quantidade: pecas(6, 8, p), base: '6 a 8 por pessoa', fontes: ambos, acordo: true });
    } else if (d === 'hora') {
      mn = 12; mx = 14;
      L.push({ oQue: 'Peças', quantidade: pecas(12, 14, p), base: '12 a 14 por pessoa', fontes: [FONTE_ES], acordo: true, nota: 'só uma fonte' });
    } else if (d === 'substitui') {
      const e = o.escolha?.cocktail_refeicao;
      [mn, mx] = e === 0 ? [14, 20] : e === 1 ? [18, 20] : [14, 20];
      L.push({ oQue: 'Peças', base: 'as fontes dão intervalos diferentes', fontes: [FONTE_FR, FONTE_ES], acordo: false,
        ...divergir('cocktail_refeicao', o.escolha,
          { fonte: FONTE_FR, quantidade: pecas(14, 20, p) + ' (14 a 20 por pessoa)' },
          { fonte: FONTE_ES, quantidade: pecas(18, 20, p) + ' (18 a 20 por pessoa)' }) });
    } else {
      mn = 20; mx = 24;
      L.push({ oQue: 'Peças', quantidade: pecas(20, 24, p), base: '20 a 24 por pessoa', fontes: [FONTE_FR], acordo: true, nota: 'só uma fonte' });
    }
    L.push({ oQue: '… das quais salgadas', quantidade: pecas(mn * 0.7, mx * 0.7, p), base: '70%', fontes: [FONTE_FR], acordo: true });
    L.push({ oQue: '… das quais doces', quantidade: pecas(mn * 0.3, mx * 0.3, p), base: '30%', fontes: [FONTE_FR], acordo: true });
    L.push({ oQue: 'Peso total das peças', quantidade: gramas(mn * 20, mx * 20, p), base: 'cerca de 20 g cada', fontes: ambos, acordo: true });
    notas.push('Ritmo de serviço: cerca de 8 peças por pessoa por hora.');
  } else if (t === 'refeicao') {
    if (servico === 'sentado' || servico === 'empratado') {
      L.push({ oQue: 'Entrada', quantidade: 'até ' + gramas(150, 150, p).split(' a ').pop(), base: 'até 150 g por pessoa', fontes: [FONTE_ES], acordo: true, nota: 'só uma fonte' });
      L.push({ oQue: 'Peixe (limpo)', quantidade: gramas(180, 180, p), base: '180 g por pessoa', fontes: [FONTE_ES], acordo: true, nota: 'só uma fonte' });
      L.push({ oQue: 'Carne', quantidade: gramas(200, 220, p), base: '200 a 220 g por pessoa', fontes: [FONTE_ES], acordo: true, nota: 'só uma fonte' });
      notas.push('Se houver peixe e carne no mesmo menu, cada prato é uma porção inteira.');
    } else {
      const n = Math.max(1, o.pratos || 2);
      L.push({ oQue: 'Total de comida', quantidade: gramas(500, 600, p), base: '500 a 600 g por pessoa', fontes: ambos, acordo: true });
      L.push({ oQue: 'Entradas (no máximo 2)', quantidade: gramas(150, 150, p), base: '150 g por pessoa', fontes: ambos, acordo: true });
      L.push({ oQue: `Carne + peixe (${n} prato${n > 1 ? 's' : ''})`, quantidade: gramas(250, 250, p), base: '250 g por pessoa no total', fontes: ambos, acordo: true });
      if (n > 1) L.push({ oQue: '… cada prato', quantidade: gramas(250 / n, 250 / n, p), base: `cerca de ${Math.round(250 / n)} g por pessoa`, fontes: ambos, acordo: true });
      L.push({ oQue: 'Acompanhamentos', quantidade: gramas(150, 200, p), base: '150 a 200 g por pessoa', fontes: ambos, acordo: true });
      L.push({ oQue: 'Saladas', quantidade: gramas(150, 200, p), base: '150 a 200 g por pessoa', fontes: ambos, acordo: true });
      L.push({ oQue: 'Sobremesa', quantidade: `${pecas(2, 3, p)} ou ${gramas(120, 120, p)}`, base: '2 a 3 peças ou 120 g por pessoa', fontes: ambos, acordo: true });
      L.push({ oQue: 'Petits fours (se houver)', quantidade: pecas(6, 8, p), base: '6 a 8 por pessoa', fontes: ambos, acordo: true });
      L.push({ oQue: 'Queijo (se houver)', quantidade: gramas(60, 80, p), base: '60 a 80 g por pessoa', fontes: ambos, acordo: true });
      notas.push('O total por pessoa é fixo: se juntar sopa ou mais entradas, tira-se aos pratos principais.');
      notas.push('Almoço de empresa: 400 a 500 g. Buffet generoso: 600 a 750 g.');
    }
  } else {
    notas.push('As fontes que encontrámos não dão quantidades para este momento. A escola decide.');
  }
  if (o.criancas) notas.push(`Crianças contadas a 50–60% de um adulto (só os guias americanos dão este valor).`);
  notas.push('O nível (simples, gourmet…) muda a variedade e o serviço, não as quantidades.');
  return { titulo: '', linhas: L, notas };
}

/** As divergências ainda por escolher neste evento. */
export function divergenciasPorEscolher(blocos: Bloco[]): string[] {
  const s = new Set<string>();
  blocos.forEach(b => b.linhas.forEach(l => { if (l.divergencia && l.divergencia.escolhida === undefined) s.add(l.divergencia.id); }));
  return [...s];
}
