# Gera public/catalogo_makro.json a partir do CSV da Makro (extensão do Claude no Chrome).
# Uso: python3 dados/gerar_catalogo_makro.py dados/makro_alfragide_AAAA-MM-DD.csv
import csv, json, sys, os

GRUPOS = ["Frescos", "Congelados", "Mercearia", "Bebidas", "Consumíveis diretos", "Consumíveis indiretos", "Embalagens", "Equipamentos e utensílios"]
FRESCOS = {"Carne","Peixe e Marisco","Frutas e Legumes","Lacticínios","Charcutaria"}
MERCEARIA = {"Mercearia","Padaria e Pastelaria","Refeições Preparadas","Delicatessen"}
BEBIDAS = {"Bebidas","Garrafeira"}
# Descartáveis: o que vai com a comida para o cliente é consumível direto; o que guarda ou leva a comida é embalagem.
DESC_DIRETOS = {"Guardanapos","Copos Descartáveis","Talheres Descartáveis","Pratos Descartáveis","Toalhas Mesa","Utensílios Comidas","Utensílios Bebidas"}
DESC_EMBALAGENS = {"Utensílios Take Away","Sacos para alimentos","Conservação Alimentos","Sacos Compras"}
INDIRETOS = {"Limpeza","Higiene","Escritório"}

def congelado(cat, sub, nome):
    return cat == "Gelados e Sobremesas" or "congel" in sub.lower() or "❄" in nome

def grupo(cat, sub, nome):
    s = sub.split(" > ")[0]
    if cat in FRESCOS or cat in MERCEARIA or cat == "Gelados e Sobremesas":
        if congelado(cat, sub, nome): return 1
        if cat in FRESCOS and not s.startswith("Frutos Secos"): return 0
        return 2  # mercearia, frutos secos e desidratados, padaria, refeições preparadas
    if cat in BEBIDAS: return 3
    if cat == "Descartáveis":
        if s in DESC_DIRETOS: return 4
        if s in DESC_EMBALAGENS: return 6
        return 5  # luvas, vestuário descartável
    if cat == "Arrumação e Embalamento":
        return 6 if s.startswith("Embalamento") else 7
    if cat in INDIRETOS: return 5
    return 7

import re, unicodedata
DIETAS = ["Sem glúten", "Sem lactose", "Sem açúcar", "Vegan", "Biológico"]
PADROES_DIETA = [r"sem glu?ten|gluten free|s/ ?gluten", r"sem lactose|lactose free|s/ ?lactose|0% lactose|deslactosad",
                 r"sem acucar|0% acucar|zero acucar|s/ ?acucar|sugar free",
                 r"vegan|proteina vegetal|bebida vegetal|plant based|beyond meat|violife|\btofu\b|seitan",
                 r"\bbio\b|biologic|organic"]
def dietas(texto):
    t = "".join(c for c in unicodedata.normalize("NFD", texto.lower()) if unicodedata.category(c) != "Mn")
    return [i for i, r in enumerate(PADROES_DIETA) if re.search(r, t)]

def num(v):
    v = (v or "").strip().replace(".", "").replace(",", ".") if v and v.count(",") else (v or "").strip()
    try: return round(float(v), 4)
    except ValueError: return None

ficheiro = sys.argv[1]
linhas = list(csv.reader(open(ficheiro, encoding="utf-8-sig"), delimiter=";"))[1:]
produtos = []
for r in linhas:
    r = (r + [""] * 16)[:16]
    _, cat, sub, nome, marca, emb, ps, pc, refere, pks, pkc, un, iva, antes, disp, cod = r
    produtos.append([grupo(cat, sub, nome), cat, sub, nome, marca, emb, num(ps), num(pc), refere, num(pks), num(pkc), un, num(iva), num(antes),
                     0 if disp.strip() == "UNAVAILABLE" else 1, cod, dietas(nome + " " + sub)])
data = os.path.basename(ficheiro).rsplit("_", 1)[-1].replace(".csv", "")
saida = {"loja": "Makro Alfragide", "data": data, "grupos": GRUPOS, "dietas": DIETAS,
         "colunas": ["grupo","categoria","subcategoria","nome","marca","embalagem","precoSemIVA","precoComIVA","precoRefere",
                     "precoRefSemIVA","precoRefComIVA","unidadeRef","iva","precoAntesPromoSemIVA","disponivel","codigo","dietas"],
         "produtos": produtos}
destino = os.path.join(os.path.dirname(__file__), "..", "public", "catalogo_makro.json")
json.dump(saida, open(destino, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print(len(produtos), "produtos;", dict(Counter(GRUPOS[p[0]] for p in produtos)))
