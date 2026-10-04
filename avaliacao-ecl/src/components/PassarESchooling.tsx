// ============================================================
// Para a eSchooling (Rosa, out/2026)
// ============================================================
// «O que me falha muitas vezes são os sumários e as faltas na eSchooling.»
// A eSchooling não aceita importar dados. Aqui ficam as aulas já dadas que
// ainda não passaram, com o sumário e as faltas da aplicação, e o pedido para
// a extensão Claude no Chrome escrito na própria página. Com esta página
// aberta, o professor carrega no Claude e escolhe o atalho «eschooling»: o
// Claude lê o pedido, preenche e grava a eSchooling e, no fim, marca aqui as
// aulas como passadas. Sem colagens (Rosa, out/2026).
// ============================================================
import React, { useMemo, useState } from 'react';
import { aulasParaESchooling, marcarPassadoAESchooling, getFichasProducao, type AulaParaESchooling, type AlunoESch,
  TIPOS_OCORRENCIA, textoDaOcorrencia, registarOcorrenciaDisciplinar, apagarOcorrenciaDisciplinar, getAlunos, turmasDoProfessor, sincronizarDoSheets } from '../backend';
import { sumarioDoPlano } from '../sumarioAutomatico';

const dataPT = (iso: string) => { const s = String(iso || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s; };
const turmaESch = (t: string) => String(t || '').trim();

/** O texto do atalho do Claude no Chrome: cria-se uma vez e serve todos os
 *  dias. O pedido do dia está escrito nesta página e o Claude lê-o daqui,
 *  sem colagens (Rosa, out/2026). */
export const TEXTO_DO_ATALHO = 'Estou na aplicação Avaliação ECL, na página «Para a eSchooling». Lê a caixa «Pedido para o Claude» desta página e faz exatamente o que lá diz, do princípio ao fim, sem me perguntar nada, exceto se alguma coisa não bater certo. Nunca escrevas palavras-passe nem códigos: se alguma página pedir para entrar, para e pede-me para entrar.';

function pedidoParaExtensao(aulas: AulaParaESchooling[]): string {
  if (!aulas.length) return 'Não há aulas por passar para a eSchooling. Diz-me isso e termina.';
  const linhas = [
    `Há ${aulas.length} aula${aulas.length === 1 ? '' : 's'} por passar para a eSchooling. Faz assim:`,
    '1) Abre a eSchooling (https://app.e-schooling.com) num separador novo. Se pedir para entrar, para e pede-me para entrar: a palavra-passe escrevo-a eu, nunca tu.',
    '2) Para cada aula da lista: no «Ambiente de trabalho» › «Horário» (lista de aulas) ou em «Aulas docente», abre a aula dessa turma nesse dia, no intervalo de horas indicado. Na eSchooling as aulas são de 1 hora (ex.: 10:30 e 11:30): faz o mesmo em TODAS as aulas desse intervalo, dessa turma.',
    '3) Na caixa «SUMÁRIO» («Adicione o sumário…») escreve o sumário indicado, tal e qual. Se essa aula já tiver um sumário escrito, não lhe mexas: salta essa aula e diz-mo no fim.',
    '4) Em «FALTAS DE PRESENÇA» (os cartões dos alunos, logo por baixo do sumário), marca falta só aos alunos indicados (confirma o nome e o número no cartão). Não mexas nos outros alunos. Se a lista disser «não mexas nas faltas», não mexas.',
    '5) ATRASOS: regista o atraso a cada aluno indicado, com os minutos de atraso. MATERIAL: regista falta de material (farda) aos alunos indicados, com os itens em falta. COMPORTAMENTO: regista a ocorrência disciplinar ao aluno indicado, com a explicação dada, palavra por palavra. Procura estas opções na própria aula; se não as encontrares, não inventes: deixa essas para o fim e diz-me.',
    '6) Grava cada aula logo depois de a preencher, sem me perguntar.',
    '7) Se uma aula ou um aluno não existir na eSchooling, ou alguma coisa não bater certo, salta essa aula e continua com as outras.',
    '8) No fim, volta ao separador da aplicação Avaliação ECL e, em cada aula que ficou toda feita, carrega no botão «Marcar como passada» dessa aula. Depois faz-me um resumo, turma a turma: o que ficou feito e o que ficou por fazer, e porquê.',
    '',
  ];
  aulas.forEach((a, i) => {
    const p: any = a.plano;
    linhas.push(`AULA ${i + 1} — Turma «${turmaESch(p.turmaId)}» (na eSchooling aparece com o ano do curso, ex.: «3º Acp 2024/2027»; não ligues a maiúsculas), dia ${dataPT(p.data)}, das ${p.horaInicio || '?'} às ${p.horaFim || '?'}${p.ucNome || p.ucId ? ` (${p.ucId || ''}${p.ucNome ? ' ' + p.ucNome : ''})` : ''}.`);
    linhas.push(`SUMÁRIO: «${a.sumario.replace(/\s*\n\s*/g, ' ')}»`);
    if (a.semPresencas) linhas.push('FALTAS DE PRESENÇA: não mexas nas faltas desta aula (as presenças não foram tiradas na aplicação).');
    else linhas.push(`FALTAS DE PRESENÇA: ${a.faltas.length ? a.faltas.map(f => `${f.numero} – ${f.nome}`).join('; ') : 'nenhuma'}`);
    if (a.atrasos.length) linhas.push(`ATRASOS: ${a.atrasos.map(f => `${f.numero} – ${f.nome} (${f.minutos ? `${f.minutos} min de atraso` : 'atraso'}${f.faltaPorAtraso ? '; conta como falta por atraso' : ''})`).join('; ')}`);
    if (a.material.length) linhas.push(`MATERIAL (farda): ${a.material.map(f => `${f.numero} – ${f.nome} (em falta: ${f.itens})`).join('; ')}`);
    a.ocorrencias.forEach(o => linhas.push(`COMPORTAMENTO (ocorrência disciplinar) — ${o.numero} – ${o.nome}. Explicação: «${o.descricao}»`));
    linhas.push('');
  });
  return linhas.join('\n');
}

export function PassarESchooling({ nomeProfessor }: { nomeProfessor: string }) {
  const [versao, setVersao] = useState(0);
  const [verPassadas, setVerPassadas] = useState(false);
  const fichas = useMemo(() => getFichasProducao(), [versao]);
  const aulas = useMemo(() => aulasParaESchooling(nomeProfessor, verPassadas).map(a => ({ ...a,
    sumario: (() => { try { return sumarioDoPlano(a.plano, fichas.filter(f => (a.plano.fichasIds || []).includes(f.id))); } catch { return String((a.plano as any).sumario || ''); } })() })),
    [nomeProfessor, verPassadas, versao, fichas]);
  const porPassar = aulas.filter(a => !(a.plano as any).eschoolingEm);
  // Todas as turmas numa página: atualiza-as todas ao abrir (Rosa, out/2026).
  const [aAtualizar, setAAtualizar] = useState('');
  React.useEffect(() => {
    let vivo = true;
    (async () => {
      const turmas = turmasDoProfessor(nomeProfessor);
      for (const t of turmas) {
        if (!vivo) return;
        setAAtualizar(t);
        try { await sincronizarDoSheets(t, { leve: true }); } catch { /* */ }
      }
      if (vivo) { setAAtualizar(''); setVersao(v => v + 1); }
    })();
    return () => { vivo = false; };
  }, [nomeProfessor]);
  const turmas = [...new Set(aulas.map(a => a.plano.turmaId))];
  const [ocorrAberta, setOcorrAberta] = useState<string | null>(null);
  const [escolhidas, setEscolhidas] = useState<Set<string> | null>(null);
  // Vão todas as que têm sumário; as que não têm presenças levam só o sumário.
  const sel = escolhidas || new Set(porPassar.filter(a => a.sumario).map(a => a.plano.id));
  const escolhidasLista = porPassar.filter(a => sel.has(a.plano.id));
  const [copiado, setCopiado] = useState(false);
  const [verComo, setVerComo] = useState(false);

  const alternar = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setEscolhidas(n); };
  const bt = (cor: string, cheio = true): React.CSSProperties => ({ padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${cor}`, background: cheio ? cor : '#fff',
    color: cheio ? '#fff' : cor, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' });

  return (
    <div>
      <div style={{ background: '#0b7fc1', color: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>📤 Para a eSchooling</div>
        <div style={{ fontSize: 14, opacity: 0.92, lineHeight: 1.5 }}>
          {porPassar.length ? `${porPassar.length} aula${porPassar.length === 1 ? '' : 's'} por passar, de ${new Set(porPassar.map(a => a.plano.turmaId)).size} turma${new Set(porPassar.map(a => a.plano.turmaId)).size === 1 ? '' : 's'}: sumários, faltas, atrasos, material e comportamento.` : 'Está tudo passado. ✓'}
          {aAtualizar && <><br />A atualizar a turma {aAtualizar}…</>}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', border: '1px solid var(--border)', marginBottom: 12, fontSize: 14.5, lineHeight: 1.6 }}>
        <b>Todos os dias</b> (no computador, na conta do Chrome <b>«Escola»</b>, com esta página aberta):
        <ol style={{ margin: '4px 0 0', paddingLeft: 20 }}>
          <li>Carregue no ícone do <b>Claude</b>, no canto de cima do Chrome.</li>
          <li>Escolha o atalho <b>eschooling</b>. O Claude lê o pedido desta página, abre a eSchooling, preenche e grava as aulas, e no fim marca-as aqui como passadas.</li>
        </ol>
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginTop: 4 }}>
          A palavra-passe da eSchooling escreve-a sempre a professora, na própria eSchooling. A aplicação e o Claude nunca a pedem nem a guardam.
        </div>
        <button onClick={() => setVerComo(v => !v)} style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, color: '#0b7fc1', fontWeight: 700,
          fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
          {verComo ? 'Fechar' : 'Primeira vez: como criar o atalho no Claude (só uma vez)'}</button>
        {verComo && (
          <div style={{ marginTop: 6, background: '#f3f8fc', borderRadius: 10, padding: '10px 12px', fontSize: 13.5 }}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>Carregue no botão abaixo para copiar o texto do atalho.</li>
              <li>Abra o Claude no Chrome «Escola», escreva <b>/</b> na caixa de texto e escolha criar um atalho.</li>
              <li>Dê-lhe o nome <b>eschooling</b> e cole o texto. Guarde.</li>
            </ol>
            <div style={{ fontStyle: 'italic', margin: '8px 0', color: 'rgba(26,23,20,0.75)' }}>«{TEXTO_DO_ATALHO}»</div>
            <button style={bt('#0b7fc1')} onClick={() => { try { navigator.clipboard.writeText(TEXTO_DO_ATALHO); setCopiado(true); setTimeout(() => setCopiado(false), 3000); } catch { /* */ } }}>
              {copiado ? '✓ Texto do atalho copiado' : '📋 Copiar o texto do atalho'}</button>
          </div>
        )}
      </div>

      {porPassar.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg, #f3f4fb)', padding: '6px 0' }}>
          <button style={bt('#3f6b45', false)} disabled={!escolhidasLista.length}
            onClick={() => { if (!confirm(`Marcar ${escolhidasLista.length} aula(s) como já passadas à eSchooling?`)) return;
              marcarPassadoAESchooling(escolhidasLista.map(a => a.plano.id)); setEscolhidas(null); setVersao(v => v + 1); }}>
            ✓ Já passei estas aulas</button>
          {porPassar.some(a => String(a.plano.data).slice(0, 10) < new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)) && (
            <button style={bt('rgba(26,23,20,0.5)', false)} onClick={() => {
              // Primeira vez: as aulas antigas já foram passadas à mão.
              const limite = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
              const antigas = porPassar.filter(a => String(a.plano.data).slice(0, 10) < limite);
              if (!confirm(`Marcar as ${antigas.length} aulas anteriores a ${dataPT(limite)} como já passadas à eSchooling?\n\nUse isto na primeira vez, para as aulas que já passou à mão.`)) return;
              marcarPassadoAESchooling(antigas.map(a => a.plano.id)); setEscolhidas(null); setVersao(v => v + 1);
            }}>Marcar as aulas com mais de uma semana como já passadas</button>
          )}
          <button style={bt('rgba(26,23,20,0.5)', false)} onClick={() => setVerPassadas(v => !v)}>{verPassadas ? 'Esconder as já passadas' : 'Ver também as já passadas'}</button>
        </div>
      )}

      {turmas.map(t => (<div key={t}>
      <div style={{ fontSize: 16, fontWeight: 800, margin: '14px 2px 6px', color: '#0b7fc1' }}>Turma {t}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(26,23,20,0.55)' }}> · {aulas.filter(a => a.plano.turmaId === t && !(a.plano as any).eschoolingEm).length} por passar</span></div>
      {aulas.filter(a => a.plano.turmaId === t).map(a => {
        const p: any = a.plano;
        const passada = !!p.eschoolingEm;
        const marcado = sel.has(p.id);
        return (
          <div key={p.id} style={{ background: passada ? '#f4f8f1' : '#fff', borderRadius: 14, padding: '12px 14px', marginBottom: 8,
            border: `1.5px solid ${marcado && !passada ? '#0b7fc1' : 'rgba(26,23,20,0.1)'}` }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {!passada && <input type="checkbox" checked={marcado} onChange={() => alternar(p.id)} style={{ width: 20, height: 20, marginTop: 2, accentColor: '#0b7fc1' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  {dataPT(p.data)} · {p.horaInicio}–{p.horaFim} · {p.turmaId}{p.ucId ? ` · ${p.ucId}` : ''}
                  {passada && <span style={{ marginLeft: 8, color: '#3f6b45', fontSize: 13 }}>✓ passada em {dataPT(p.eschoolingEm)}</span>}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.45 }}>
                  <b>Sumário:</b> {a.sumario || <span style={{ color: '#b5651d' }}>sem sumário — escreva-o no plano da aula</span>}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 4 }}>
                  {a.semPresencas
                    ? <span style={{ color: '#b5651d', fontWeight: 700 }}>⚠️ As presenças desta aula não foram tiradas na aplicação (a aula não foi aberta).</span>
                    : <><b>Faltas:</b> {a.faltas.length ? a.faltas.map(f => `${f.numero}. ${f.nome}`).join(' · ') : 'nenhuma'}
                      {a.atrasos.length > 0 && <><br /><b>Atrasos:</b> {a.atrasos.map(f => `${f.numero}. ${f.nome}${f.minutos ? ` (${f.minutos} min)` : ''}${f.faltaPorAtraso ? ' — falta por atraso' : ''}`).join(' · ')}</>}
                      {a.material.length > 0 && <><br /><b>Material (farda):</b> {a.material.map(f => `${f.numero}. ${f.nome} (${f.itens})`).join(' · ')}</>}</>}
                </div>
                <Ocorrencias a={a} aberta={ocorrAberta === p.id} onAbrir={() => setOcorrAberta(ocorrAberta === p.id ? null : p.id)}
                  nomeProfessor={nomeProfessor} onMudou={() => setVersao(v => v + 1)} podeMudar={!passada} />
              </div>
              {passada ? <button style={{ ...bt('rgba(26,23,20,0.5)', false), padding: '5px 9px', fontSize: 12.5 }}
                onClick={() => { marcarPassadoAESchooling([p.id], false); setVersao(v => v + 1); }}>Desfazer</button>
                : <button style={{ ...bt('#3f6b45', false), padding: '5px 9px', fontSize: 12.5, whiteSpace: 'nowrap' }}
                  onClick={() => { marcarPassadoAESchooling([p.id]); setVersao(v => v + 1); }}>Marcar como passada</button>}
            </div>
          </div>
        );
      })}
      </div>))}
      {aulas.length === 0 && <div style={{ padding: 20, color: 'rgba(26,23,20,0.6)' }}>Não há aulas já dadas por passar.</div>}

      {/* O Claude no Chrome lê daqui o pedido do dia: tem de estar escrito na página. */}
      <div id="pedido-para-o-claude" style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', border: '1px dashed #0b7fc1', marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0b7fc1' }}>Pedido para o Claude</div>
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', marginBottom: 6 }}>O Claude lê-o daqui sozinho. Tem as aulas marcadas acima.</div>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.5, color: 'rgba(26,23,20,0.8)' }}>{pedidoParaExtensao(escolhidasLista)}</div>
      </div>
    </div>
  );
}

/** «Comportamento»: as ocorrências disciplinares da aula. O professor escolhe o
 *  tipo e escreve uma nota curta; a explicação formal é montada pela aplicação. */
function Ocorrencias({ a, aberta, onAbrir, nomeProfessor, onMudou, podeMudar }: { a: AulaParaESchooling; aberta: boolean; onAbrir: () => void;
  nomeProfessor: string; onMudou: () => void; podeMudar: boolean }) {
  const p: any = a.plano;
  // Quem faltou à aula não aparece: não pode ter tido uma ocorrência nela.
  const faltaram = new Set(a.faltas.map(f => f.alunoId));
  const alunos = getAlunos().filter(x => x.turmaId === p.turmaId && x.ativo !== false && !faltaram.has(x.id)).sort((x, y) => x.numero - y.numero);
  const [alunoId, setAlunoId] = useState('');
  const [tipo, setTipo] = useState('');
  const [nota, setNota] = useState('');
  const aluno = alunos.find(x => x.id === alunoId);
  const texto = aluno && tipo ? textoDaOcorrencia(tipo, nota, aluno, p) : '';
  const campo: React.CSSProperties = { padding: '7px 9px', borderRadius: 8, border: '1.5px solid rgba(26,23,20,0.2)', fontSize: 14, fontFamily: 'inherit', background: '#fff' };
  const lista: AlunoESch[] = a.ocorrencias;
  return (
    <div style={{ marginTop: 6, fontSize: 13.5 }}>
      {lista.map((o, i) => (
        <div key={i} style={{ background: '#fdf0ef', border: '1px solid #f0c4bd', borderRadius: 8, padding: '6px 9px', marginBottom: 4, display: 'flex', gap: 8 }}>
          <span style={{ flex: 1 }}><b>Comportamento — {o.numero}. {o.nome}:</b> {o.descricao}</span>
          {podeMudar && <button onClick={() => { if (o.id && confirm('Apagar esta ocorrência?')) { apagarOcorrenciaDisciplinar(o.id); onMudou(); } }}
            style={{ border: 'none', background: 'none', color: '#9a2b1f', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 12.5 }}>Apagar</button>}
        </div>
      ))}
      {podeMudar && !aberta && <button onClick={onAbrir} style={{ border: '1px dashed rgba(154,43,31,0.5)', background: '#fff', color: '#9a2b1f', borderRadius: 8,
        padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>+ Ocorrência disciplinar</button>}
      {podeMudar && aberta && (
        <div style={{ border: '1.5px solid #f0c4bd', borderRadius: 10, padding: 10, background: '#fffafa', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select value={alunoId} onChange={e => setAlunoId(e.target.value)} style={campo}>
              <option value="">Aluno…</option>{alunos.map(x => <option key={x.id} value={x.id}>{x.numero}. {x.nome}</option>)}
            </select>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={campo}>
              <option value="">O que aconteceu…</option>{TIPOS_OCORRENCIA.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <input value={nota} onChange={e => setNota(e.target.value)} placeholder={tipo === 'outra' ? 'Descreva o que aconteceu' : 'Nota curta (opcional), ex.: foi advertido duas vezes'} style={campo} />
          {texto && <div style={{ fontSize: 13, background: '#fff', border: '1px solid rgba(26,23,20,0.12)', borderRadius: 8, padding: '6px 8px' }}>
            <b>Vai para a eSchooling assim:</b> {texto}</div>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={!aluno || !tipo || (tipo === 'outra' && !nota.trim())}
              onClick={() => { registarOcorrenciaDisciplinar(p.id, alunoId, tipo, nota, nomeProfessor); setAlunoId(''); setTipo(''); setNota(''); onAbrir(); onMudou(); }}
              style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: '#9a2b1f', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar a ocorrência</button>
            <button onClick={onAbrir} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
