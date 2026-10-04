# Gera public/banco_empratamento.json a partir de dados/banco_imagens_empratamento.html
# (banco de imagens da Makro para empratamento: ervas, flores, micro legumes,
# frutos vermelhos, embalagens e descartáveis), ligado ao catálogo da Makro.
import json, re, os
pasta = os.path.dirname(__file__)
html = open(os.path.join(pasta, 'banco_imagens_empratamento.html'), encoding='utf-8').read()
D = json.loads(re.search(r'const D=(\[.*?\]);', html, re.S).group(1))
cat = json.load(open(os.path.join(pasta, '..', 'public', 'catalogo_makro.json'), encoding='utf-8'))
porCod = {p[15]: p for p in cat['produtos']}
def cod(u):
    m = re.search(r'(BTY-X\d+)/(\d{4})/(\d{4})', u)
    return m.group(1) + m.group(2) + m.group(3) if m else ''
itens = []
for x in D:
    c = cod(x['u']); p = porCod.get(c)
    itens.append({'codigo': c, 'nome': x['n'], 'grupo': x['g'], 'sub': x['s'], 'embalagem': (p[5] if p else x['e']),
                  'preco': (p[7] if p else None), 'imagem': x['i'], 'link': x['u']})
json.dump({'loja': 'Makro Alfragide', 'data': cat['data'], 'itens': itens},
          open(os.path.join(pasta, '..', 'public', 'banco_empratamento.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(itens), 'itens;', sum(1 for i in itens if i['preco'] is not None), 'com preço do catálogo')
