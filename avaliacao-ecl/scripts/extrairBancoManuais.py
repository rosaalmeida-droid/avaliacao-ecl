#!/usr/bin/env python3
"""
Banco de conhecimentos tirado dos Manuais do Aluno (public/manuais).

O índice do manual dá as partes e os capítulos; cada capítulo é um
conhecimento, e os pontos de «O QUE VAIS APRENDER» desse capítulo são os
campos que se trabalham. Os exercícios dos manuais não entram (Rosa,
out/2026: não são bons). O professor escolhe no plano os capítulos e os
campos da aula; o aluno autoavalia-se em cada campo.

Uso: python3 scripts/extrairBancoManuais.py  →  src/bancoManuais.json
Precisa do pdftotext (poppler-utils). As três versões de cada manual
(2023-2026, 2024-2027, 2025-2028) têm o mesmo texto: usa-se a mais recente.
"""
import json, os, re, subprocess, sys

RAIZ = os.path.join(os.path.dirname(__file__), '..')
PASTAS = ['public/manuais/UC', 'public/manuais/2025-2028']
SAIDA = os.path.join(RAIZ, 'src', 'bancoManuais.json')

PARTE = re.compile(r'^PARTE (\d+) · (.+)$')
LINHA_INDICE = re.compile(r'^(\d{2}) (.+)$')
CAP = re.compile(r'^Capítulo (\d+) de (\d+)\s*$')


def texto(pdf):
    return subprocess.run(['pdftotext', pdf, '-'], capture_output=True, text=True, check=True).stdout


def indice(linhas):
    """Partes e capítulos, da página do ÍNDICE até ao primeiro capítulo."""
    try:
        ini = next(i for i, l in enumerate(linhas) if l.strip() == 'ÍNDICE')
    except StopIteration:
        return []
    caps, parte = [], ''
    for l in linhas[ini + 1:]:
        s = l.strip()
        if CAP.match(s):
            break
        m = PARTE.match(s)
        if m:
            parte = m.group(2).strip().capitalize()
            continue
        m = LINHA_INDICE.match(s)
        if m:
            n = int(m.group(1))
            if any(c['n'] == n for c in caps):
                break                       # recomeçou (folha de rosto da parte)
            caps.append({'n': n, 'parte': parte, 'titulo': m.group(2).strip(), 'objetivos': []})
    return caps


def objetivos(linhas):
    """Os pontos de «O QUE VAIS APRENDER» de cada capítulo, pelo número."""
    por_cap, atual = {}, None
    i = 0
    while i < len(linhas):
        s = linhas[i].strip()
        m = CAP.match(s)
        if m:
            atual = int(m.group(1))
        elif s == 'O QUE VAIS APRENDER' and atual is not None and atual not in por_cap:
            obj, j = [], i + 1
            while j < len(linhas):
                t = linhas[j].strip()
                if t.startswith('•'):
                    obj.append(t.lstrip('• ').strip())
                elif t and obj and obj[-1][-1] not in '.!?':
                    obj[-1] += ' ' + t          # o ponto continua na linha seguinte
                elif t:
                    break
                j += 1
            por_cap[atual] = obj
            i = j
            continue
        i += 1
    return por_cap


def main():
    banco = {}
    for pasta in PASTAS:
        d = os.path.join(RAIZ, pasta)
        for f in sorted(os.listdir(d)):
            if not f.endswith('.pdf') or 'Anexo' in f:
                continue
            nome = f[:-4]
            if nome in banco:
                continue
            linhas = texto(os.path.join(d, f)).split('\n')
            caps = indice(linhas)
            obj = objetivos(linhas)
            for c in caps:
                c['objetivos'] = obj.get(c['n'], [])
            # Capítulos de autoavaliação do próprio manual não são conhecimentos.
            caps = [c for c in caps if not c['titulo'].lower().startswith('autoavaliação')]
            if caps:
                banco[nome] = caps
            sem = [c['n'] for c in caps if not c['objetivos']]
            print(f'{nome}: {len(caps)} capítulos, {sum(len(c["objetivos"]) for c in caps)} campos'
                  + (f' · sem campos: {sem}' if sem else ''), file=sys.stderr)
    with open(SAIDA, 'w', encoding='utf-8') as fh:
        json.dump(banco, fh, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main()
