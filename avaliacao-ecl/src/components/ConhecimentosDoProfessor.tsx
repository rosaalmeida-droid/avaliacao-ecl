// ============================================================
// O que se trabalhou do manual (ou os temas por onde os alunos escolhem).
// Usa-se no plano e no ecrã de criar ou alterar o plano.
// ============================================================
import React from 'react';
import { addOrUpdatePlanoAula, getPlanosAula, getFichasProducao } from '../backend';
import { conhecimentosDaAula, conhecimentosDoReferencial } from '../compatECL';
import { manualDaUC, camposDoCapitulo, idCampoManual, proximoConteudo, indicadoresDoConteudo, rotuloConteudo,
  capituloDoCampo, NIVEIS_CONHECIMENTO } from '../bancoManuais';
import { triagemDoPlano, escolheTema } from '../contextoAula';

// ── Conhecimentos: o professor define o que avalia ─────────────
// Enquanto o catálogo de conhecimentos não está afinado, o professor
// escreve os parâmetros desta aula. A aplicação sugere os conhecimentos
// do referencial da UC (pela equivalência UFCD → UC). O aluno
// autoavalia-se em cada um e o professor valida, como nas técnicas.
export function ConhecimentosDoProfessor({ plano, onPlanoActualizado }: { plano: any; onPlanoActualizado: (p: any) => void }) {
  const [texto, setTexto] = React.useState('');
  const [capAberto, setCapAberto] = React.useState<number | null>(null);
  // As partes do manual começam fechadas: vê-se só a parte e quantos conteúdos tem marcados.
  const [partesAbertas, setPartesAbertas] = React.useState<Set<string>>(new Set());
  // O que o professor escolheu: campos do manual ou escritos por ele. O
  // referencial é só sugestão: as linhas dele não dizem ao aluno o que se fez.
  const lista: { id: string; texto: string; capitulo?: string; tema?: string }[] = conhecimentosDaAula(plano);
  const manual = manualDaUC(plano.ucId);
  // O próximo conteúdo da UC que a turma ainda não trabalhou (pela ordem do manual).
  const proximo = proximoConteudo(getPlanosAula(), plano.turmaId, plano.ucId, plano.id);
  const sugestoes = conhecimentosDoReferencial(plano.ucId).filter(t => !lista.some(l => l.texto === t));
  // Marcar um indicador (ou o manual todo) também o repõe, se tinha sido
  // retirado nas Competências: antes ficava marcado aqui mas retirado lá, e
  // «o manual não entrava todo» (Rosa, out/2026).
  const removidas: string[] = Array.isArray(plano.compRemovidas) ? plano.compRemovidas : [];
  const gravar = (nova: { id: string; texto: string; capitulo?: string }[]) => {
    const atual: any = getPlanosAula().find(x => x.id === plano.id) || plano;
    const antes = new Set(((atual.conhecimentosProf || []) as any[]).map(x => x.id));
    const entram = new Set(nova.map(x => x.id).filter(id => !antes.has(id) || ((atual.compRemovidas || []) as string[]).includes(id)));
    const p = { ...atual, conhecimentosProf: nova,
      compRemovidas: ((atual.compRemovidas || []) as string[]).filter(id => !entram.has(id)),
      atualizadoEm: new Date().toISOString() };
    addOrUpdatePlanoAula(p); onPlanoActualizado(p);
  };
  const juntar = (t: string) => { const tt = t.trim(); if (!tt) return; gravar([...lista, { id: 'KNW-P' + Date.now(), texto: tt }]); setTexto(''); };
  const escolhido = (id: string) => lista.some(x => x.id === id) && !removidas.includes(id);
  // Os toques trabalham sobre o plano tal como está gravado agora: antes, dois
  // toques seguidos podiam desfazer-se um ao outro (Rosa, 5/out/2026).
  const listaAgora = () => conhecimentosDaAula(getPlanosAula().find(x => x.id === plano.id) || plano) as typeof lista;
  const escolhidoAgora = (id: string) => {
    const at: any = getPlanosAula().find(x => x.id === plano.id) || plano;
    return listaAgora().some(x => x.id === id) && !((at.compRemovidas || []) as string[]).includes(id);
  };
  const alternarCampo = (id: string, textoCampo: string, capitulo: string) => {
    const l = listaAgora();
    gravar(escolhidoAgora(id) ? l.filter(x => x.id !== id) : [...l.filter(x => x.id !== id), { id, texto: textoCampo, capitulo, tema: capituloDoCampo(id)?.capitulo.parte }]);
  };
  const azul = '#1d4ed8';
  const trabalho = escolheTema(triagemDoPlano(plano));
  return (
    <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(37,99,235,0.25)', background: 'rgba(37,99,235,0.04)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: azul, marginBottom: 4 }}>
        {trabalho ? '📚 Temas por onde os alunos escolhem' : '📚 O que se trabalhou hoje'}</div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 8, lineHeight: 1.45 }}>
        {trabalho
          ? 'Cada aluno escolhe o seu tema entre os conteúdos marcados. Sem nada marcado, entram todos os do manual.'
          : 'Marque os conteúdos e os indicadores. Depois escolha abaixo como os alunos respondem.'}
      </div>
      {/* Aula dada pelo professor: as duas opções, à escolha do professor (Rosa, 5/out/2026). */}
      {!trabalho && (() => {
        const nCaps = new Set(lista.filter(k => !removidas.includes(k.id)).map(k => capituloDoCampo(k.id)?.capitulo.n).filter(n => n != null)).size;
        if (nCaps < 2) return null;
        const escolhe = plano.alunoEscolheTema === true;
        const mudar = (v: boolean) => {
          const atual: any = getPlanosAula().find(x => x.id === plano.id) || plano;
          const p = { ...atual, alunoEscolheTema: v, atualizadoEm: new Date().toISOString() };
          addOrUpdatePlanoAula(p); onPlanoActualizado(p);
        };
        const opcao = (on: boolean, titulo: string, sub: string, ao: () => void) => (
          <button onClick={ao} style={{ flex: '1 1 220px', textAlign: 'left', padding: '10px 12px', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
            border: on ? `2px solid ${azul}` : '1px solid rgba(26,23,20,0.22)', background: on ? azul : '#fff', color: on ? '#fff' : '#1a1714' }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>{on ? '✓ ' : ''}{titulo}</div>
            <div style={{ fontSize: 12.5, opacity: 0.85 }}>{sub}</div>
          </button>
        );
        return (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Marcou {nCaps} conteúdos. Como é que os alunos respondem?</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {opcao(!escolhe, 'Todos os alunos respondem a tudo', 'Cada aluno responde a todos os indicadores marcados, em todos os conteúdos.', () => mudar(false))}
              {opcao(escolhe, 'Cada aluno escolhe um conteúdo', 'O aluno escolhe um dos conteúdos marcados e responde só aos indicadores desse.', () => mudar(true))}
            </div>
          </div>
        );
      })()}
      {trabalho && new Set(lista.filter(k => !removidas.includes(k.id)).map(k => capituloDoCampo(k.id)?.capitulo.n).filter(n => n != null)).size === 1 && (
        <div style={{ background: '#fdf0ef', border: '2px solid #c0392b', borderRadius: 10, padding: '8px 12px', marginBottom: 8,
          fontSize: 13.5, fontWeight: 700, color: '#8e2418', lineHeight: 1.45 }}>
          Os alunos escolhem o tema, mas só marcou um conteúdo: todos ficam com o mesmo. Marque mais conteúdos ou o manual todo.
        </div>
      )}
      {!trabalho && proximo && !lista.some(k => k.id.startsWith(`KNW-P-M-${proximo.ficheiro}-${proximo.capitulo.n}-`)) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#fff', border: `1px solid ${azul}`,
          borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
          <span style={{ flex: 1, minWidth: 200, fontSize: 13.5 }}>
            <b>Próximo {NIVEIS_CONHECIMENTO.conteudo.toLowerCase()} da UC:</b> {rotuloConteudo(proximo.capitulo)}
            <span style={{ color: 'rgba(26,23,20,0.55)' }}> ({proximo.capitulo.parte})</span>
          </span>
          <button onClick={() => gravar([...lista, ...indicadoresDoConteudo(proximo.ficheiro, proximo.capitulo).filter(x => !escolhido(x.id))])}
            style={{ fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: 'none', background: azul, color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit' }}>Usar</button>
        </div>
      )}
      {/* Os escritos à mão (não do manual). */}
      {lista.filter(k => !k.id.startsWith('KNW-P-M-')).map(k => (
        <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid rgba(26,23,20,0.06)', fontSize: 13.5 }}>
          <span style={{ flex: 1 }}>● {k.texto}</span>
          <button onClick={() => gravar(lista.filter(x => x.id !== k.id))} style={{ fontSize: 12.5, padding: '3px 9px', borderRadius: 7,
            border: '1px solid rgba(26,23,20,0.2)', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Tirar</button>
        </div>
      ))}

      {/* O índice do manual da UC (Rosa, out/2026): o manual todo com um toque;
          cada parte e cada capítulo marcam-se de uma vez; os indicadores, se
          se quiser, abrindo o capítulo. */}
      {manual && (() => {
        const campos = (c: any) => camposDoCapitulo(c).map((t, i) => ({ id: idCampoManual(manual.ficheiro, c.n, i), texto: t,
          capitulo: `Manual, ${rotuloConteudo(c)}`, tema: c.parte }));
        const nMarcados = (c: any) => campos(c).filter(x => escolhido(x.id)).length;
        const marcar = (caps: any[], on: boolean) => {
          const ids = new Set(caps.flatMap(c => campos(c).map(x => x.id)));
          // Sem repetir os que já lá estavam (retirados nas Competências): voltam a entrar.
          const l = listaAgora();
          const novos = caps.flatMap(c => campos(c)).filter(x => !escolhidoAgora(x.id));
          const idsNovos = new Set(novos.map(x => x.id));
          gravar(on ? [...l.filter(x => !idsNovos.has(x.id)), ...novos] : l.filter(x => !ids.has(x.id)));
        };
        const capsComAlgo = manual.capitulos.filter(c => nMarcados(c) > 0).length;
        const todos = capsComAlgo === manual.capitulos.length;
        const partes = [...new Set(manual.capitulos.map(c => c.parte || ''))];
        const caixa = (estado: 0 | 1 | 2, ao: () => void, grande?: boolean) => (
          // Um botão (e não um span): com o plano só para ler, fica desligado como
          // os subtítulos. Antes marcava-se o título mas não os subtítulos (Rosa, 5/out/2026).
          <button type="button" onClick={e => { e.stopPropagation(); ao(); }} role="checkbox" aria-checked={estado === 2 ? true : estado === 1 ? 'mixed' : false}
            style={{ width: grande ? 20 : 18, height: grande ? 20 : 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
              border: `2px solid ${estado ? azul : 'rgba(26,23,20,0.3)'}`, background: estado === 2 ? azul : estado === 1 ? 'rgba(29,78,216,0.15)' : '#fff',
              color: '#fff', fontSize: 12, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {estado === 2 ? '✓' : estado === 1 ? <span style={{ color: azul }}>–</span> : ''}
          </button>
        );
        return (
          <div style={{ marginTop: 10, background: '#fff', borderRadius: 10, border: '1px solid rgba(37,99,235,0.2)', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{ flex: '1 1 200px', fontSize: 14, fontWeight: 700, color: azul }}>Manual: {manual.titulo}
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(26,23,20,0.6)' }}>
                  {capsComAlgo ? `${capsComAlgo} de ${manual.capitulos.length} conteúdos marcados` : 'Nenhum conteúdo marcado'}
                </div>
              </div>
              <button onClick={() => marcar(manual.capitulos, true)} disabled={todos}
                style={{ fontSize: 13.5, fontWeight: 700, padding: '8px 14px', borderRadius: 9, border: 'none', background: todos ? 'rgba(29,78,216,0.35)' : azul,
                  color: '#fff', cursor: todos ? 'default' : 'pointer', fontFamily: 'inherit' }}>{todos ? '✓ Manual todo incluído' : 'Incluir o manual todo'}</button>
              {capsComAlgo > 0 && <button onClick={() => marcar(manual.capitulos, false)}
                style={{ fontSize: 13, fontWeight: 700, padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(26,23,20,0.2)', background: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit' }}>Limpar</button>}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.65)', lineHeight: 1.45, margin: '2px 0 6px' }}>
              Para escolher um título inteiro, carregue no quadrado ao lado dele. Para escolher só alguns subtítulos, carregue no nome do título e marque os subtítulos que quer. Os subtítulos que não marcar não são perguntados aos alunos.
            </div>
            {partes.map(parte => {
              const caps = manual.capitulos.filter(c => (c.parte || '') === parte);
              const nc = caps.filter(c => nMarcados(c) > 0).length;
              const estadoParte: 0 | 1 | 2 = nc === 0 ? 0 : nc === caps.length && caps.every(c => nMarcados(c) === campos(c).length) ? 2 : 1;
              return (
                <div key={parte} style={{ marginTop: 6 }}>
                  {parte && (
                    <div onClick={() => setPartesAbertas(s => { const n = new Set(s); n.has(parte) ? n.delete(parte) : n.add(parte); return n; })}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 4px',
                      cursor: 'pointer', borderBottom: '1px solid rgba(26,23,20,0.08)' }}>
                      {caixa(estadoParte, () => marcar(caps, estadoParte !== 2), true)}
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(26,23,20,0.6)' }}>{parte}</span>
                      <span style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)' }}>{nc} de {caps.length} {partesAbertas.has(parte) ? '▾' : '▸'}</span>
                    </div>
                  )}
                  {(!parte || partesAbertas.has(parte)) && caps.map(c => {
                    const n = nMarcados(c), total = campos(c).length;
                    const est: 0 | 1 | 2 = n === 0 ? 0 : n === total ? 2 : 1;
                    return (
                      <div key={c.n}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px 5px 18px' }}>
                          {caixa(est, () => marcar([c], est !== 2))}
                          <span onClick={() => setCapAberto(capAberto === c.n ? null : c.n)} title="Ver os subtítulos" style={{ flex: 1, fontSize: 13.5, cursor: 'pointer', fontWeight: n ? 700 : 500 }}>
                            <span style={{ color: 'rgba(26,23,20,0.45)', marginRight: 6 }}>{String(c.n).padStart(2, '0')}</span>{c.titulo}
                          </span>
                          <button onClick={() => setCapAberto(capAberto === c.n ? null : c.n)} title="Ver os indicadores"
                            style={{ fontSize: 12, padding: '2px 8px', borderRadius: 7, border: '1px solid rgba(26,23,20,0.15)', background: '#fff',
                              color: 'rgba(26,23,20,0.6)', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {n ? `${n}/${total}` : total} {capAberto === c.n ? '▾' : '▸'}
                          </button>
                        </div>
                        {capAberto === c.n && (
                          <div style={{ padding: '0 0 6px 46px' }}>
                            {campos(c).map(x => (
                              <label key={x.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, padding: '3px 0', cursor: 'pointer' }}>
                                <input type="checkbox" checked={escolhido(x.id)} onChange={() => alternarCampo(x.id, x.texto, x.capitulo)} style={{ width: 16, height: 16, marginTop: 1 }} />
                                <span>{x.texto}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: azul }}>Escrever outro{sugestoes.length ? ' ou usar o referencial' : ''}</summary>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') juntar(texto); }}
            placeholder="Escreva o que se trabalhou (por exemplo: Identificar os cortes do porco)" className="input" style={{ flex: 1, fontSize: 13.5 }} />
          <button onClick={() => juntar(texto)} className="btn btn-primary" style={{ fontSize: 13.5 }}>+ Juntar</button>
        </div>
        {sugestoes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {sugestoes.map(t => (
              <button key={t} onClick={() => juntar(t)} style={{ textAlign: 'left', fontSize: 12.5, padding: '5px 9px', borderRadius: 8,
                border: '1px solid rgba(37,99,235,0.3)', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>+ {t}</button>
            ))}
          </div>
        )}
      </details>
    </div>
  );
}

// ── Aula mista: duas partes à vista (Rosa, 5/out/2026) ──────────
// «A aula teórica incide sobre» (o manual ou o que o professor escreve) e
// «A aula prática incide sobre» (as fichas técnicas do plano).
export function ehAulaMista(plano: any): boolean {
  return String(plano?.tipoPlanAula || '').replace('_obr', '') === 'misto';
}

export function DuasPartesDaAulaMista({ plano, onPlanoActualizado }: { plano: any; onPlanoActualizado: (p: any) => void }) {
  const fichas = getFichasProducao().filter(f => (plano.fichasIds || []).includes(f.id));
  const titulo = (t: string) => (
    <div style={{ fontSize: 15, fontWeight: 800, margin: '4px 0 8px' }}>{t}</div>
  );
  return (
    <div style={{ marginBottom: 14 }}>
      {titulo('📚 A aula teórica incide sobre:')}
      <ConhecimentosDoProfessor plano={plano} onPlanoActualizado={onPlanoActualizado} />
      {titulo('🔪 A aula prática incide sobre:')}
      <div style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(181,101,29,0.3)', background: 'rgba(181,101,29,0.05)', fontSize: 14, lineHeight: 1.5 }}>
        {fichas.length
          ? fichas.map(f => <div key={f.id}>● {f.nomePrato || 'Ficha técnica'}</div>)
          : <span style={{ color: 'rgba(26,23,20,0.6)' }}>Ainda sem fichas técnicas. Juntam-se no plano, no campo «Fichas, guião e requisição».</span>}
      </div>
    </div>
  );
}
