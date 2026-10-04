# Gera public/videos_rosa.json a partir dos CSV da extensão Claude no Chrome
# (Instagram e Facebook da Rosa Almeida, out/2026).
# Uso: python3 dados/gerar_videos.py dados/videos/instagram_publicacoes.csv [dados/videos/facebook_publicacoes.csv ...]
# Colunas esperadas: plataforma;link;data;tipo;legenda;hashtags;visualizacoes;gostos;capa
import csv, json, os, re, sys, unicodedata, datetime

csv.field_size_limit(10_000_000)

def sa(t):
    return "".join(c for c in unicodedata.normalize("NFD", (t or "").lower()) if unicodedata.category(c) != "Mn")

# Temas automáticos, pelas palavras da legenda e das hashtags.
TEMAS = [
    ("Pastelaria e sobremesas", r"bolo|tarte|pastel|pasteis|sobremesa|doce|chocolate|folhad|pudim|merengue|bolacha|pao de lo|mousse|gelado|cheesecake|brownie|croissant|creme brulee|pastelaria|macaron|bombom|trufa"),
    ("Padaria", r"\bpao\b|paes|massa mae|fermento|broa|brioche|baguete|focaccia|padaria"),
    ("Peixe e marisco", r"peixe|bacalhau|polvo|camarao|marisco|salmao|atum|sardinha|lula|choco|dourada|robalo|amêijoa|ameijoa|mexilh|lagost|sapateira"),
    ("Carne", r"\bcarne|frango|porco|vitela|borrego|novilho|\bpato\b|bife|leitao|cabrito|perdiz|coelho|picanha|costeleta|hamburguer"),
    ("Vegetariano", r"vegetarian|vegan|legume|cogumel|grao|lentilh|tofu|quinoa|salada"),
    ("Sopas", r"\bsopa|caldo verde|creme de "),
    ("Técnicas", r"tecnica|corte|como fazer|passo a passo|emuls|molho|fundo|confit|sous vide|flamb|brunoise|juliana|chiffonade|branquear|escalfar|marinar|fumar|fumado|reducao|mise en place"),
    ("Cozinha portuguesa", r"tradicional|portugues|receita da avo|regional|alentej|minho|algarv|acoriano|madeirense|transmontan|tasca|petisco"),
    ("Empratamento", r"empratamento|plating|decorac|apresentacao do prato|montagem"),
    ("Escola e alunos", r"aluno|alunas|escola|\becl\b|aula|turma|formacao|formand|estagio|curso|professor"),
    ("Eventos e concursos", r"evento|concurso|jantar|almoco|buffet|catering|festival|prova|showcooking|show cooking|competic|campeonato|feira"),
    ("Higiene e segurança", r"haccp|higiene|seguranca alimentar|limpeza|conservac"),
]
TEMAS_RE = [(n, re.compile(p)) for n, p in TEMAS]

def numero(v):
    v = (v or "").strip().lower().replace(" ", "").replace(" ", "")
    if not v: return None
    m = re.match(r"^([\d.,]+)\s*(mil|k|m|mi)?$", v)
    if not m: return None
    n = m.group(1)
    mult = {"mil": 1000, "k": 1000, "m": 1_000_000, "mi": 1_000_000}.get(m.group(2) or "", 1)
    if mult > 1: n = n.replace(",", ".")
    else: n = n.replace(".", "").replace(",", "")
    try: return int(float(n) * mult)
    except ValueError: return None

def data_iso(v):
    v = (v or "").strip()
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", v)
    if m: return m.group(0)
    m = re.search(r"(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})", v)
    if m: return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    return ""

def tipo(v, link):
    t = sa(v)
    if "reel" in t or "/reel/" in (link or ""): return "reel"
    if "carros" in t: return "carrossel"
    if "video" in t or "/videos/" in (link or ""): return "vídeo"
    if "foto" in t or "imagem" in t or "photo" in t: return "foto"
    return t or "publicação"

itens, vistos = [], set()
for ficheiro in sys.argv[1:]:
    texto = open(ficheiro, encoding="utf-8-sig").read()
    delim = ";" if texto.split("\n", 1)[0].count(";") >= texto.split("\n", 1)[0].count(",") else ","
    linhas = list(csv.DictReader(texto.splitlines(), delimiter=delim))
    for r in linhas:
        r = {sa(k or "").strip(): (v or "").strip() for k, v in r.items() if k}
        link = r.get("link", "")
        if not link or link in vistos: continue
        vistos.add(link)
        legenda = r.get("legenda", "").replace(" / ", "\n")
        tags = sorted(set(re.findall(r"#[\wÀ-ſ]+", legenda + " " + r.get("hashtags", ""))), key=str.lower)
        alvo = sa(legenda + " " + " ".join(tags))
        plat = sa(r.get("plataforma", "")) or ("facebook" if "facebook" in link else "instagram")
        itens.append({
            "p": "facebook" if "face" in plat else "instagram",
            "link": link,
            "data": data_iso(r.get("data", "")),
            "tipo": tipo(r.get("tipo", ""), link),
            "legenda": legenda,
            "tags": tags,
            "vis": numero(r.get("visualizacoes", "")),
            "gostos": numero(r.get("gostos", "")),
            "capa": r.get("capa", ""),
            "temas": [n for n, rx in TEMAS_RE if rx.search(alvo)],
        })

if len(itens) < 1:
    sys.exit("ERRO: nenhuma publicação encontrada nos ficheiros. Nada foi alterado.")
itens.sort(key=lambda x: x["data"] or "", reverse=True)
saida = {"atualizado": datetime.date.today().isoformat(), "temas": [n for n, _ in TEMAS], "itens": itens}
destino = os.path.join(os.path.dirname(__file__), "..", "public", "videos_rosa.json")
json.dump(saida, open(destino, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
por_p = {}
for x in itens: por_p[x["p"]] = por_p.get(x["p"], 0) + 1
print(f"{len(itens)} publicações: {por_p}")
