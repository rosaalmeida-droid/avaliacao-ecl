// ============================================================
// Avaliação ECL — núcleo do modelo de avaliação por competências
// Árvore UC › APARELHO › SUBTÉCNICA › MICRO · escala 5 níveis
// Autoavaliação (aluno) → validação por plano (professor)
// Colocar em: src/avaliacaoModelo.ts
// ============================================================

export type Nivel = 1 | 2 | 3 | 4 | 5;
export type TipoPlano = 'pratico' | 'teorico' | 'misto';

export interface AvMicro { verificacao: string; ok: boolean }              // sim / ainda não
export interface AvSubtecnica { nome: string; nivel: Nivel; micros?: AvMicro[] }
export interface AvAparelho { aparelho: string; nivel?: Nivel; subtecnicas?: AvSubtecnica[] }
export interface Aparelho { nome: string; familia: string; aptidao_uc: string; origem?: string }
export interface Plano { nome: string; tipo: TipoPlano; aparelhos: string[]; avaliacoes: AvAparelho[] }
export interface UC { id: string; designacao: string; aptidoes?: string[] }

// Frases da escala, na voz do aluno
export const ESCALA: Record<Nivel, string> = {
  5: 'Fiz bem e sei que fiz bem',
  4: 'Fiz sozinho/a e ficou, mas ainda preciso de treinar mais um pouco',
  3: 'Fiz, mas ainda precisei de ajuda',
  2: 'Não me saiu bem, preciso de voltar a repetir',
  1: 'Ainda não fiz — não tentei ou não quis',
};

// Abertura da árvore disparada pela nota
export const abreSubtecnicas = (nivelAparelho: Nivel): boolean => nivelAparelho <= 3; // 4-5 fecha
export const abreMicros = (nivelSubtecnica: Nivel): boolean => nivelSubtecnica <= 2;   // 1-2 abre

// Nota do aparelho: média das subtécnicas avaliadas, ou a nota direta se a árvore ficou fechada
export function notaAparelho(av: AvAparelho): number {
  if (av.subtecnicas && av.subtecnicas.length) {
    const m = av.subtecnicas.reduce((s, x) => s + x.nivel, 0) / av.subtecnicas.length;
    return Math.round(m * 10) / 10;
  }
  return av.nivel ?? 1;
}

// Banco cumulativo: a nota nunca desce do nível já consolidado (repetir só mantém ou sobe)
export const aplicarPiso = (agora: number, piso?: number): number =>
  piso != null ? Math.max(agora, piso) : agora;

// Pesos por tipo de plano
export const PESOS: Record<TipoPlano, { OBR: number; SUBAPP: number; KNW: number; ATI: number }> = {
  pratico: { OBR: .20, SUBAPP: .40, KNW: .30, ATI: .10 },
  teorico: { OBR: 0,   SUBAPP: 0,   KNW: .90, ATI: .10 },
  misto:   { OBR: .20, SUBAPP: .20, KNW: .50, ATI: .10 },
};

export function notaPlano(cats: { OBR: number; SUBAPP: number; KNW: number; ATI: number }, tipo: TipoPlano): number {
  const w = PESOS[tipo];
  const bruto = cats.OBR * w.OBR + cats.SUBAPP * w.SUBAPP + cats.KNW * w.KNW + cats.ATI * w.ATI;
  return Math.round(bruto * 10) / 10; // em escala 1-5; ×4 no fecho para 0-20
}

// Cobertura da UC: que aptidões da UC ficam cobertas pelos aparelhos deste plano
export function competenciasUCCobertas(plano: Plano, uc: UC, aparelhos: Aparelho[]) {
  const aptidoesUC = uc.aptidoes ?? ['Molhos base e derivados', 'Fundos de cozinha', 'Fichas técnicas', 'Conservação e regeneração'];
  const tocadas = new Set(
    plano.aparelhos
      .map(id => aparelhos.find(a => a.nome === id || a.origem?.includes(id)))
      .filter((a): a is Aparelho => !!a)
      .map(a => a.aptidao_uc)
  );
  const cobertas: string[] = [], emFalta: string[] = [];
  for (const apt of aptidoesUC) (tocadas.has(apt) ? cobertas : emFalta).push(apt);
  if (!cobertas.includes('Fichas técnicas')) {           // a ficha é sempre elaborada
    cobertas.push('Fichas técnicas');
    const i = emFalta.indexOf('Fichas técnicas'); if (i >= 0) emFalta.splice(i, 1);
  }
  return { cobertas, emFalta };
}
