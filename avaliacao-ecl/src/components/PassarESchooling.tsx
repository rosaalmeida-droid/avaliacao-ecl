// ============================================================
// Para a eSchooling (Rosa, out/2026)
// ============================================================
// «O que me falha muitas vezes são os sumários e as faltas na eSchooling.»
// A eSchooling não aceita importar dados. Aqui ficam as aulas já dadas que
// ainda não passaram, com o sumário e as faltas da aplicação; um botão copia
// um pedido para a extensão Claude no Chrome, que preenche a eSchooling e
// mostra tudo ao professor antes de gravar. Depois marca-se «Já passei».
// ============================================================
import React, { useMemo, useState } from 'react';
import { aulasParaESchooling, marcarPassadoAESchooling, getFichasProducao, type AulaParaESchooling } from '../backend';
import { sumarioDoPlano } from '../sumarioAutomatico';

const dataPT = (iso: string) => { const s = String(iso || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s; };
const turmaESch = (t: string) => String(t || '').trim();

function pedidoParaExtensao(aulas: AulaParaESchooling[]): string {
  const linhas = [
    'Estou na eSchooling (app.e-schooling.com) com a sessão iniciada. Vou dar-te uma lista de aulas já dadas. Para cada aula:',
    '1) No «Ambiente de trabalho» › «Horário» (lista de aulas) ou em «Aulas docente», abre a aula dessa turma nesse dia, no intervalo de horas indicado. Na eSchooling as aulas são de 1 hora (ex.: 10:30 e 11:30): faz o mesmo em TODAS as aulas desse intervalo, dessa turma.',
    '2) Na caixa «SUMÁRIO» («Adicione o sumário…») escreve o sumário indicado. Se essa aula já tiver um sumário escrito, não o apagues: para e pergunta-me.',
    '3) Em «FALTAS DE PRESENÇA» (os cartões dos alunos, logo por baixo do sumário), marca falta só aos alunos indicados (confirma o nome e o número no cartão). Não mexas nos outros alunos nem nos «Registos» (comportamento, habilidade, participação).',
    '4) Antes de guardar cada aula, mostra-me o que vais gravar e espera pelo meu «OK». Depois guarda.',
    '5) Se alguma aula ou algum aluno não existir, ou alguma coisa não bater certo, para e diz-me. No fim, faz-me um resumo do que ficou feito.',
    '',
  ];
  aulas.forEach((a, i) => {
    const p: any = a.plano;
    linhas.push(`AULA ${i + 1} — Turma «${turmaESch(p.turmaId)}» (na eSchooling aparece com o ano do curso, ex.: «3º Acp 2024/2027»; não ligues a maiúsculas), dia ${dataPT(p.data)}, das ${p.horaInicio || '?'} às ${p.horaFim || '?'}${p.ucNome || p.ucId ? ` (${p.ucId || ''}${p.ucNome ? ' ' + p.ucNome : ''})` : ''}.`);
    linhas.push(`SUMÁRIO: «${a.sumario.replace(/\s*\n\s*/g, ' ')}»`);
    linhas.push(`FALTAS DE PRESENÇA: ${a.faltas.length ? a.faltas.map(f => `${f.numero} – ${f.nome}`).join('; ') : 'nenhuma'}`);
    if (a.atrasos.length) linhas.push(`ATRASOS (só se a eSchooling tiver a opção de atraso; se não tiver, não marques nada): ${a.atrasos.map(f => `${f.numero} – ${f.nome}`).join('; ')}`);
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
  const [escolhidas, setEscolhidas] = useState<Set<string> | null>(null);
  const sel = escolhidas || new Set(porPassar.filter(a => !a.semPresencas && a.sumario).map(a => a.plano.id));
  const escolhidasLista = porPassar.filter(a => sel.has(a.plano.id));
  const [copiado, setCopiado] = useState(false);

  const alternar = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setEscolhidas(n); };
  const bt = (cor: string, cheio = true): React.CSSProperties => ({ padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${cor}`, background: cheio ? cor : '#fff',
    color: cheio ? '#fff' : cor, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' });

  return (
    <div>
      <div style={{ background: '#0b7fc1', color: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>📤 Para a eSchooling</div>
        <div style={{ fontSize: 14, opacity: 0.92, lineHeight: 1.5 }}>
          {porPassar.length ? `${porPassar.length} aula${porPassar.length === 1 ? '' : 's'} por passar (sumário e faltas).` : 'Está tudo passado. ✓'}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', border: '1px solid var(--border)', marginBottom: 12, fontSize: 14, lineHeight: 1.6 }}>
        <b>Como se faz</b>
        <ol style={{ margin: '4px 0 0', paddingLeft: 20 }}>
          <li>No computador, na conta do Chrome <b>«Escola»</b>, abra a eSchooling com a sessão iniciada.</li>
          <li>Aqui, escolha as aulas e carregue em <b>«Copiar o pedido para a extensão»</b>.</li>
          <li>Abra a extensão <b>Claude</b> e cole o pedido. Ela preenche aula a aula e mostra-lhe tudo antes de gravar: confirme com «OK».</li>
          <li>No fim, carregue aqui em <b>«Já passei estas aulas»</b>.</li>
        </ol>
      </div>

      {porPassar.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg, #f3f4fb)', padding: '6px 0' }}>
          <button style={bt('#0b7fc1')} disabled={!escolhidasLista.length}
            onClick={() => { try { navigator.clipboard.writeText(pedidoParaExtensao(escolhidasLista)); setCopiado(true); setTimeout(() => setCopiado(false), 3000); } catch { /* */ } }}>
            {copiado ? '✓ Pedido copiado' : `📋 Copiar o pedido para a extensão (${escolhidasLista.length})`}</button>
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

      {aulas.map(a => {
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
                      {a.atrasos.length > 0 && <><br /><b>Atrasos:</b> {a.atrasos.map(f => `${f.numero}. ${f.nome}`).join(' · ')}</>}</>}
                </div>
              </div>
              {passada && <button style={{ ...bt('rgba(26,23,20,0.5)', false), padding: '5px 9px', fontSize: 12.5 }}
                onClick={() => { marcarPassadoAESchooling([p.id], false); setVersao(v => v + 1); }}>Desfazer</button>}
            </div>
          </div>
        );
      })}
      {aulas.length === 0 && <div style={{ padding: 20, color: 'rgba(26,23,20,0.6)' }}>Não há aulas já dadas por passar.</div>}
    </div>
  );
}
