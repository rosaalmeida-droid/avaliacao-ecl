// ── Componentes Culinários ──────────────────────────────────────────────
// Categorização pedagógica do ingrediente (Proteína, Tubérculo, Especiaria,
// Aromática, Laticínio, Açúcar/Adoçante, Cereal e derivados...) — diferente
// da "categoria" técnica já existente em materiasPrimasBase.ts (Açúcares,
// Carnes...), que serve para preço/conversão. O componente é o que aparece
// preenchido automaticamente no campo "Componente" da Ficha de Produção.
//
// Pedido no documento de 21/06/2026 — exemplo dado:
// Bacalhau → Proteína | Batata → Tubérculo | Pimenta → Especiaria
// Salsa → Aromática | Leite → Laticínio | Ovo → Ovo
// Açúcar → Açúcar/Adoçante | Farinha → Cereais e derivados

export const CATEGORIA_PARA_COMPONENTE: Record<string, string> = {
  'Aves': 'Proteína',
  'Bacalhau': 'Proteína',
  'Borrego': 'Proteína',
  'Carnes': 'Proteína',
  'Enchidos': 'Proteína',
  'Marisco': 'Proteína',
  'Peixe': 'Proteína',
  'Peixe congelado': 'Proteína',
  'Peixe fresco': 'Proteína',
  'Porco': 'Proteína',
  'Vaca': 'Proteína',
  'Ovos': 'Ovo',
  'Laticínios': 'Laticínio',
  'Batatas': 'Tubérculo',
  'Legumes': 'Legume',
  'Tomate': 'Legume',
  'Cebolas': 'Aromática',
  'Alhos': 'Aromática',
  'Ervas': 'Aromática',
  'Temperos': 'Especiaria',
  'Açúcares': 'Açúcar/Adoçante',
  'Chocolate': 'Açúcar/Adoçante',
  'Farinhas': 'Cereais e derivados',
  'Cereais': 'Cereais e derivados',
  'Massas': 'Cereais e derivados',
  'Leguminosas': 'Leguminosa',
  'Fruta': 'Fruta',
  'Frutos secos': 'Fruto seco',
  'Gorduras': 'Gordura/Óleo',
  'Levedantes': 'Levedante',
  'Caldos': 'Caldo/Fundo',
  'Conservas': 'Conserva',
  'Pastelaria': 'Pastelaria/Confeitaria',
  'Outros': 'Outro',
};

// Dado o nome de um ingrediente, devolve o componente culinário — primeiro
// tenta encontrar a matéria-prima na base (categoria já conhecida), depois
// aplica o mapa acima. Devolve 'Outro' se não encontrar nada.
export function obterComponenteCulinario(categoriaBase: string | undefined): string {
  if (!categoriaBase) return 'Outro';
  return CATEGORIA_PARA_COMPONENTE[categoriaBase] || 'Outro';
}
