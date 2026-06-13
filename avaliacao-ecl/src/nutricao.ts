// ============================================================
// Valores Nutricionais — estimativa por 100g
// Fonte: Tabela de Composição dos Alimentos, INSA Portugal
// ============================================================

interface ValorNutricional {
  calorias: number;  // kcal por 100g
  proteinas: number; // g por 100g
  gorduras: number;  // g por 100g
  hidratos: number;  // g por 100g
}

const TABELA_NUTRICIONAL: Record<string, ValorNutricional> = {
  // Peixes
  'bacalhau': { calorias: 82, proteinas: 18.5, gorduras: 0.7, hidratos: 0 },
  'salmão': { calorias: 142, proteinas: 19.9, gorduras: 6.9, hidratos: 0 },
  'atum': { calorias: 130, proteinas: 23, gorduras: 4.6, hidratos: 0 },
  'robalo': { calorias: 97, proteinas: 18.5, gorduras: 2.5, hidratos: 0 },
  'dourada': { calorias: 96, proteinas: 17.5, gorduras: 3.0, hidratos: 0 },
  'sardinha': { calorias: 160, proteinas: 20, gorduras: 9, hidratos: 0 },
  // Carnes
  'frango': { calorias: 165, proteinas: 31, gorduras: 3.6, hidratos: 0 },
  'vaca': { calorias: 250, proteinas: 26, gorduras: 15, hidratos: 0 },
  'porco': { calorias: 242, proteinas: 27, gorduras: 14, hidratos: 0 },
  'vitela': { calorias: 175, proteinas: 26, gorduras: 7, hidratos: 0 },
  // Vegetais/legumes
  'batata': { calorias: 77, proteinas: 2, gorduras: 0.1, hidratos: 17 },
  'cebola': { calorias: 40, proteinas: 1.1, gorduras: 0.1, hidratos: 9.3 },
  'alho': { calorias: 149, proteinas: 6.4, gorduras: 0.5, hidratos: 33 },
  'tomate': { calorias: 18, proteinas: 0.9, gorduras: 0.2, hidratos: 3.5 },
  'cenoura': { calorias: 41, proteinas: 0.9, gorduras: 0.2, hidratos: 10 },
  'azeite': { calorias: 884, proteinas: 0, gorduras: 100, hidratos: 0 },
  'óleo': { calorias: 884, proteinas: 0, gorduras: 100, hidratos: 0 },
  // Laticínios
  'leite': { calorias: 61, proteinas: 3.2, gorduras: 3.5, hidratos: 4.8 },
  'natas': { calorias: 337, proteinas: 2.2, gorduras: 35, hidratos: 3.1 },
  'manteiga': { calorias: 744, proteinas: 0.6, gorduras: 82, hidratos: 0.6 },
  'queijo': { calorias: 350, proteinas: 25, gorduras: 27, hidratos: 0.5 },
  // Outros
  'ovo': { calorias: 143, proteinas: 12.6, gorduras: 9.5, hidratos: 0.7 },
  'ovos': { calorias: 143, proteinas: 12.6, gorduras: 9.5, hidratos: 0.7 },
  'arroz': { calorias: 365, proteinas: 7, gorduras: 1, hidratos: 80 },
  'massa': { calorias: 371, proteinas: 13, gorduras: 1.5, hidratos: 75 },
  'farinha': { calorias: 364, proteinas: 10, gorduras: 1.2, hidratos: 76 },
  'açúcar': { calorias: 400, proteinas: 0, gorduras: 0, hidratos: 100 },
  'pão': { calorias: 265, proteinas: 9, gorduras: 3.2, hidratos: 49 },
};

export interface InfoNutricional {
  calorias: number;
  proteinas: number;
  gorduras: number;
  hidratos: number;
  numIngredientesCalculados: number;
  totalIngredientes: number;
}

/**
 * Estima valores nutricionais totais a partir de ingredientes.
 * Retorna valores por porção se numPorcoes > 0.
 */
export function calcularNutricao(
  ingredientes: { qt: string; un: string; produto: string }[],
  numPorcoes: number
): InfoNutricional {
  let calorias = 0, proteinas = 0, gorduras = 0, hidratos = 0;
  let calculados = 0;

  for (const ing of ingredientes) {
    const produtoLower = ing.produto.toLowerCase();
    const chave = Object.keys(TABELA_NUTRICIONAL).find(k => produtoLower.includes(k));
    if (!chave) continue;

    const nutri = TABELA_NUTRICIONAL[chave];
    const qtNum = parseFloat(ing.qt.replace(',', '.')) || 0;
    if (qtNum === 0) continue;

    // Converter para gramas
    let gramas = 0;
    const un = ing.un.toLowerCase();
    if (un === 'g' || un === 'gr') gramas = qtNum;
    else if (un === 'kg') gramas = qtNum * 1000;
    else if (un === 'ml' || un === 'l') gramas = un === 'l' ? qtNum * 1000 : qtNum;
    else if (un === 'cs' || un.includes('sopa')) gramas = qtNum * 15;
    else if (un === 'cc' || un.includes('chá')) gramas = qtNum * 5;
    else if (!un || un === 'un' || un === 'q.b.') gramas = qtNum * 100; // estimativa

    if (gramas === 0) continue;

    calorias += (nutri.calorias * gramas) / 100;
    proteinas += (nutri.proteinas * gramas) / 100;
    gorduras += (nutri.gorduras * gramas) / 100;
    hidratos += (nutri.hidratos * gramas) / 100;
    calculados++;
  }

  const porcoes = numPorcoes > 0 ? numPorcoes : 1;

  return {
    calorias: Math.round(calorias / porcoes),
    proteinas: Math.round(proteinas / porcoes * 10) / 10,
    gorduras: Math.round(gorduras / porcoes * 10) / 10,
    hidratos: Math.round(hidratos / porcoes * 10) / 10,
    numIngredientesCalculados: calculados,
    totalIngredientes: ingredientes.length,
  };
}
