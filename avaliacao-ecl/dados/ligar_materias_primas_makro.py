import json,re
res=json.load(open('ligacao2.json'))
P=json.load(open('/home/user/avaliacao-ecl/avaliacao-ecl/public/catalogo_makro.json'))['produtos']
porCod={p[15]:p for p in P}
def cod(suf):
    m=[c for c in porCod if c.endswith(suf)]
    assert len(m)==1,(suf,m);return m[0]
def nome(q):
    m=[p[15] for p in P if p[3].strip()==q] or [p[15] for p in P if p[3].strip().startswith(q)];assert m,q;return m[0]
# Escolhas revistas à mão. None = sem equivalente na Makro (fica o preço atual).
O={
 'a001':nome('SIDUL Açúcar Branco Granulado Papel 1Kg'),
 'a006':nome('METRO Chef Mel Flores Frasco 1kg'),
 'g007':nome('GRESSO Nata Uht Bater 35% 1 L x 6UN'),
 'l005':nome('Nestlé Iogurte Natural 0% Yaos 850G'),
 'o001':nome('METRO Chef Ovos M 5 Duzias'),'o002':nome('METRO Chef Ovos L 5 Duzias'),'o003':nome('METRO Chef Bio Ovos M/L 2 Duzias'),
 'b002':None,'b004':None,
 'b005':nome('Batata Doce Polpa Laranja Categoria I Calibre 150/300g'),'b006':nome('Batata Doce Polpa Roxa Categoria I'),
 'c003':None,'c005':None,
 't002':nome('METRO Chef Tomate Cherry Redondo Vermelho Categoria I 500g'),
 'mg003':None,'mg006':None,'mg009':None,'mg010':None,
 'v007':nome('METRO Chef Couve Brocolo Categoria I 500g'),
 'v013':nome('METRO Chef Rucula Selvagem 4 Gama 250g'),
 'v017':nome('Abobora Hokaido'),'v018':None,
 'v019':nome('METRO Chef Ervilhas Médias Finas 2,5Kg ❄'),
 'v021':nome('Nabos Sem Rama Categoria II Calibre 60/80 Caixa ±6kg'),
 'fr008':nome('METRO Chef Mix de Frutos Vermelhos 1kg ❄'),'fr014':None,
 'cr001':nome('Frango Inteiro Sem Miudos Saco 6 Unidades 700 G Saco Fresco'),
 'cr013':None,
 'p001':nome('METRO Chef, Salmao (SAL), Filete TRIM D'),
 'p004':nome('Pescada Importada Rede 1-2 Kg'),
 'p007':nome('SARDINHA (PIL), Direto da Lota, Calibre T2'),
 'bac001':None,'bac002':None,'bac003':None,
 'pc003':None,'pc005':None,'pc010':nome('METRO Chef Salmao Posta 7/12 Un 2 Kg ❄'),
 'pc004':nome('METRO Chef Miolo De Camarao 10/25 2Kg ❄'),
 'tm015':nome('METRO Chef Gengibre Moido 100G'),'tm016':nome('Gengibre Categoria I ±500g'),
 'tm021':nome('BORNIER Mostarda Dijon 720G'),'tm022':nome('METRO Chef Mostarda 5 Kg'),
 'er005':nome('METRO Chef Tomilho 100g'),
 'cd005':None,'cd006':None,'cd007':nome('FERREIRA Vinho Do Porto Ruby 75 Cl'),'cd008':None,
 'ch002':None,'ch004':nome('Pensal Farinha de cacau embalagem de 250g'),
 'lv005':None,'lv006':None,
 'az003':nome('CIMARROM Alcaparras Vinagre Frasco 700 G'),
 'fs002':nome('METRO Chef Miolo Noz Metades 1kg'),
 'fs007':nome('METRO Chef Semente Sesamo Branca 1kg'),'fs008':nome('METRO Chef Semente Girassol 1kg'),
 'pa001':nome('VAHINE Aroma Baunilha 200 Ml'),'pa003':None,'pa004':None,
 'ou001':None,'ou002':None,
 'v020':nome('Feijão Verde Plano Categoria II Caixa'),'fr010':nome('Abacaxi Categoria I Calibre 7'),
 'cr007':nome('Lombo Novilho Sem Cordao U.E. 1,5 Kg Fresco'),'pc008':nome('ALTAMAR Ameijoa Negra 60/80 1 Kg'),
 'pc009':nome('REYMAR Mexilhao Inteiro 40/60'),'tm001':nome('VATEL Sal Marinho Fino 10 Kg'),
 'ch001':nome('METRO Chef Chocolate Culinária 70% Cacau'),'ch003':nome('METRO Chef Chocolate Branco Culinária 28% Cacau'),
 'v024':None,
}
O['v024']=O.get('c006')
# Peças: peso médio de uma unidade (kg) para passar o preço por kg a preço por unidade.
PESO_UN={'fr001':0.10,'fr011':0.09,'fr012':0.07}
DUZIAS={'o001':60,'o002':60,'o003':24}
def qtd_total(p):
    e=(p[5] or '').lower().replace(',','.')
    m=re.match(r'(?:ca\.\s*)?(\d+)\s*x\s*([\d.]+)\s*(kg|g|l|ml|cl)\b',e) or None
    if m:n,q,u=int(m.group(1)),float(m.group(2)),m.group(3)
    else:
        m=re.match(r'(?:ca\.\s*)?([\d.]+)\s*(kg|g|l|ml|cl)\b',e)
        if not m:return None
        n,q,u=1,float(m.group(1)),m.group(2)
    f={'kg':1,'l':1,'g':.001,'ml':.001,'cl':.01}[u];return n*q*f
def preco_kg(p):
    if p[8] in('kg','L'):return p[7]
    q=qtd_total(p)
    if q:return p[7]/q
    return p[10] if p[11] in('kg','L') else None
saida=[]
for r in res:
    b=r['b'];i=b['id']
    c=O[i] if i in O else (r['c'][0]['cod'] if r['c'] else None)
    if c is None:continue
    p=porCod[c];kg=preco_kg(p)
    if i in DUZIAS:un=p[7]/DUZIAS[i];kg=None
    elif i in PESO_UN:un=(kg or 0)*PESO_UN[i]
    elif b['ur'] in('g','ml') and kg:un=kg*b['fc']/1000
    elif b['uc']=='kg' and kg:un=kg
    else:continue  # unidades especiais (folhas, dentes, vagens): fica o preço atual
    saida.append({'id':i,'codigo':c,'nome':p[3],'embalagem':p[5],'precoEmb':p[7],'precoKg':round(kg,2) if kg else 0,'precoUn':round(un,2)})

b={x['id']:x for x in json.load(open('base.json'))}
props=[]
for x in saida:
    o=b[x['id']];p=porCod[x['codigo']]
    if o['ur']=='un' or x['id'] in DUZIAS or x['id'] in PESO_UN:
        emb,und,pe,kg,un=1,'un',x['precoUn'],0,x['precoUn']
    else:
        und='ml' if o['ur']=='ml' else 'g'
        emb=o['fc'] if o['uc']!='kg' else 1000
        kg=x['precoKg'];pe=round(kg*emb/1000,2);un=0
    props.append({'id':x['id'],'nome':o['nome'],'produtoContinente':p[3],'marca':p[4] or '','embalagem':emb,'unidadeEmbalagem':und,
      'precoEmbalagem':pe,'precoKg':kg,'precoUnidade':un,'codigoMakro':p[15],'embalagemMakro':p[5],'precoEmbalagemMakro':p[7],
      'precoAtualKg':o['precoKg'],'precoAtualUn':o['precoUn']})
json.dump(props,open('propostas_makro.json','w'),ensure_ascii=False)
print(len(props),'propostas')
for q in props:
    if q['unidadeEmbalagem']=='un' or q['id'] in('v020','cr007','tm001','ch001','a001','g001','o001','fr001'):print(q['id'],q['nome'],'|',q['produtoContinente'][:45],'|',q['embalagem'],q['unidadeEmbalagem'],q['precoEmbalagem'],'| kg',q['precoKg'],'| un',q['precoUnidade'],'| atual',q['precoAtualKg'],q['precoAtualUn'])
