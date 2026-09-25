// ============================================================
// Preços da requisição — revisão mensal (coordenadora)
// ============================================================
// 1. Copiar o pedido para a IA (por partes, para não ser grande demais).
// 2. Colar a resposta da IA.
// 3. Ver o que muda, com avisos (variações grandes, não é marca branca,
//    €/kg que não bate com a embalagem…) e escolher o que entra.
// 4. Confirmar: fica no aparelho e vai para o Sheets (folha PRECOS).
// O documento oficial da requisição não muda: só os preços que o enchem.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { getPrecosAReverPendentes, marcarPrecosRevistos, lerPrecosDoSheets } from '../backend';
import { getMateriaPrimasBase, getPrecosRevistos } from '../materiasPrimasBase';
import {
  gruposDeProdutos, gerarPedidoIA, verificarRespostaIA, confirmarPrecos, linkContinente, porReverEsteMes,
  type ResultadoVerificacao,
} from '../precosRevistos';

const caixa: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '14px 16px',
  marginBottom: 14, border: '1px solid rgba(26,23,20,0.08)' };
const titulo: React.CSSProperties = { fontSize: 16, fontWeight: 800, marginBottom: 4 };
const nota: React.CSSProperties = { fontSize: 13, color: 'rgba(26,23,20,0.6)', lineHeight: 1.5, marginBottom: 10 };
const botao = (principal = false): React.CSSProperties => ({ padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
  fontFamily: 'inherit', fontWeight: 700, fontSize: 14, border: principal ? 'none' : '1px solid rgba(26,23,20,0.2)',
  background: principal ? '#0f766e' : '#fff', color: principal ? '#fff' : 'inherit' });
const e2 = (x: number) => x > 0 ? x.toFixed(2).replace('.', ',') + ' €' : '—';

export function PrecosCoordenadora() {
  const [versao, setVersao] = useState(0);
  const grupos = useMemo(() => gruposDeProdutos(), []);
  const [parte, setParte] = useState(0);
  const [resposta, setResposta] = useState('');
  const [res, setRes] = useState<ResultadoVerificacao | null>(null);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [pesquisa, setPesquisa] = useState('');
  const [copiado, setCopiado] = useState(false);

  const faltam = useMemo(() => porReverEsteMes(), [versao]);
  // Preços de que os professores desconfiaram (escritos à mão na requisição).
  const aRever = useMemo(() => getPrecosAReverPendentes(), [versao]);
  const aReverNaBase = aRever.filter(p => p.mpId);
  useEffect(() => { lerPrecosDoSheets().then(ok => { if (ok) setVersao(v => v + 1); }); }, []);
  // Se há pedidos dos professores, o pedido à IA começa por esses.
  useEffect(() => { if (aReverNaBase.length && parte === 0 && !res) setParte(-2); }, [aReverNaBase.length]);
  const revistos = useMemo(() => new Map(getPrecosRevistos().map(p => [p.id, p])), [versao]);
  const idsParte = parte === -2 ? aReverNaBase.map(p => p.mpId)
    : parte < 0 ? faltam.map(m => m.id) : grupos[parte]?.ids || [];
  const pedido = useMemo(() => gerarPedidoIA(idsParte), [parte, versao]);
  const mesNome = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  async function copiar() {
    try { await navigator.clipboard.writeText(pedido); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }
    catch { alert('Não consegui copiar sozinho. Seleciona o texto do pedido e copia (Ctrl+C).'); }
  }

  function verificar() {
    const r = verificarRespostaIA(resposta, idsParte, 'Coordenadora');
    setRes(r);
    setEscolhidos(new Set(r.linhas.filter(l => l.novo && l.estado !== 'erro').map(l => l.id)));
  }

  function gravar() {
    if (!res) return;
    const novos = res.linhas.filter(l => l.novo && escolhidos.has(l.id)).map(l => l.novo!);
    if (!novos.length) { alert('Não escolheste nenhum preço.'); return; }
    if (!confirm(`Atualizar ${novos.length} preço(s)?\n\nFicam neste aparelho e vão para o Sheets; os outros aparelhos recebem-nos na próxima sincronização.`)) return;
    confirmarPrecos(novos);
    setRes(null); setResposta(''); setVersao(v => v + 1);
    alert(`${novos.length} preço(s) atualizados.`);
  }

  const lista = getMateriaPrimasBase().filter(mp => {
    const q = pesquisa.trim().toLowerCase();
    return !q || mp.nome.toLowerCase().includes(q) || mp.id.toLowerCase().includes(q);
  });

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...caixa, background: faltam.length ? '#fdf0e6' : '#eef4eb' }}>
        <div style={titulo}>Preços de {mesNome}</div>
        <div style={{ fontSize: 14 }}>
          {faltam.length === 0
            ? 'Todos os preços foram revistos este mês.'
            : <>Por rever este mês: <b>{faltam.length}</b> de {getMateriaPrimasBase().length} produtos. As requisições usam o último preço que houver.</>}
        </div>
      </div>

      {aRever.length > 0 && (
        <div style={{ ...caixa, background: '#fff8ec', border: '1px solid #f0c98a' }}>
          <div style={titulo}>⚠️ Preços a rever — {aRever.length} pedido{aRever.length === 1 ? '' : 's'} dos professores</div>
          <div style={nota}>
            Um professor escreveu na requisição um preço diferente do da base. Esse preço valeu só nessa requisição;
            a base continua com o teu. Revê-os no pedido à IA (a opção «Os que os professores pediram para rever»)
            ou, se o preço da base está certo, carrega em «Está certo».
          </div>
          {aRever.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0',
              borderTop: '1px solid rgba(26,23,20,0.08)', fontSize: 13.5, flexWrap: 'wrap' }}>
              <span style={{ flex: '1 1 200px', minWidth: 0 }}>
                <b>{p.nome}</b>
                {p.produto && p.produto.toLowerCase() !== p.nome.toLowerCase() && <span style={{ color: 'rgba(26,23,20,0.5)' }}> («{p.produto}» na ficha)</span>}
                <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>
                  {p.professor || 'Professor'}{p.turmaId ? ` · ${p.turmaId}` : ''} · {new Date(p.sugeridoEm).toLocaleDateString('pt-PT')}
                  {!p.mpId && ' · não está na base — não entra no pedido à IA'}
                </div>
              </span>
              <span style={{ minWidth: 150 }}>
                Base: <b>{p.precoBase > 0 ? `${e2(p.precoBase)}/${p.und === 'un' ? 'un' : p.und}` : '—'}</b><br />
                Professor: <b style={{ color: '#8a4a15' }}>{e2(p.precoProfessor)}/{p.und === 'un' ? 'un' : p.und}</b>
              </span>
              <a href={linkContinente(p.nome)} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Ver no Continente</a>
              <button style={botao()} onClick={() => { marcarPrecosRevistos([p.id]); setVersao(v => v + 1); }}>Está certo</button>
            </div>
          ))}
        </div>
      )}

      <div style={caixa}>
        <div style={titulo}>1. Copiar o pedido para a IA</div>
        <div style={nota}>
          Cola-o numa IA que pesquise na internet (ChatGPT, Claude, Gemini, com pesquisa ligada). Se a lista for
          grande demais para a IA, faz por partes.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <select value={parte} onChange={e => { setParte(Number(e.target.value)); setRes(null); }}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.2)', fontSize: 14, fontFamily: 'inherit' }}>
            {aReverNaBase.length > 0 && <option value={-2}>Os que os professores pediram para rever ({aReverNaBase.length})</option>}
            {faltam.length > 0 && <option value={-1}>Só os por rever este mês ({faltam.length})</option>}
            {grupos.map((g, i) => <option key={i} value={i}>Parte {i + 1} de {grupos.length}: {g.nome} ({g.ids.length})</option>)}
          </select>
          <button onClick={copiar} style={botao(true)}>{copiado ? 'Copiado ✓' : 'Copiar o pedido'}</button>
        </div>
        <textarea readOnly value={pedido} rows={5} onFocus={e => e.currentTarget.select()}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, fontFamily: 'monospace', padding: 8, borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.15)', color: 'rgba(26,23,20,0.7)' }} />
      </div>

      <div style={caixa}>
        <div style={titulo}>2. Colar a resposta da IA</div>
        <textarea value={resposta} onChange={e => setResposta(e.target.value)} rows={6}
          placeholder='Cola aqui a resposta (a lista que começa com [ e acaba com ])'
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, fontFamily: 'monospace', padding: 8, borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.2)' }} />
        <button onClick={verificar} disabled={!resposta.trim()} style={{ ...botao(true), marginTop: 8, opacity: resposta.trim() ? 1 : 0.5 }}>
          Verificar a resposta
        </button>
      </div>

      {res && (
        <div style={caixa}>
          <div style={titulo}>3. O que muda</div>
          {res.erroGeral ? (
            <div style={{ color: '#8e2418', fontSize: 14 }}>Não consegui ler a resposta: {res.erroGeral} Pede à IA que responda só com a lista em JSON.</div>
          ) : (
            <>
              <div style={nota}>
                {res.linhas.filter(l => l.estado === 'ok').length} sem problemas · {res.linhas.filter(l => l.estado === 'aviso').length} com avisos
                · {res.linhas.filter(l => l.estado === 'erro').length} com erro
                {res.emFalta.length > 0 && <> · <b>{res.emFalta.length} não vieram</b> (ficam com o preço de antes)</>}
                {res.desconhecidos.length > 0 && <> · códigos desconhecidos: {res.desconhecidos.join(', ')}</>}
                . Tira o visto aos que não queres atualizar.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f7f5f2' }}>
                    {['', 'Produto', 'No Continente', 'Antes', 'Agora', 'Avisos'].map(h =>
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', whiteSpace: 'nowrap' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {res.linhas.map(l => {
                      const porUn = getMateriaPrimasBase().find(m => m.id === l.id)?.unidadeReceita === 'un';
                      const antes = porUn ? `${e2(l.antes.precoUnitario)}/un` : `${e2(l.antes.precoKg)}/kg`;
                      const agora = !l.novo ? '—' : porUn ? `${e2(l.novo.precoUnidade)}/un` : `${e2(l.novo.precoKg)}/kg`;
                      return (
                        <tr key={l.id} style={{ borderTop: '1px solid rgba(26,23,20,0.08)',
                          background: l.estado === 'erro' ? '#fdf0ef' : l.estado === 'aviso' ? '#fffaf2' : undefined }}>
                          <td style={{ padding: '6px 8px' }}>
                            <input type="checkbox" disabled={!l.novo} checked={escolhidos.has(l.id)}
                              onChange={() => setEscolhidos(s => { const t = new Set(s); t.has(l.id) ? t.delete(l.id) : t.add(l.id); return t; })} />
                          </td>
                          <td style={{ padding: '6px 8px' }}><b>{l.nome}</b></td>
                          <td style={{ padding: '6px 8px' }}>
                            {l.novo ? <>{l.novo.produtoContinente} · {l.novo.embalagem} {l.novo.unidadeEmbalagem} · {e2(l.novo.precoEmbalagem)}
                              {l.novo.link && <> · <a href={l.novo.link} target="_blank" rel="noreferrer">ver</a></>}</> : '—'}
                          </td>
                          <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{antes}</td>
                          <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', fontWeight: 700 }}>{agora}</td>
                          <td style={{ padding: '6px 8px', color: '#8a4a15' }}>{l.avisos.join(' ')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={gravar} style={{ ...botao(true), marginTop: 10 }}>
                Atualizar {escolhidos.size} preço{escolhidos.size === 1 ? '' : 's'} (aparelho e Sheets)
              </button>
            </>
          )}
        </div>
      )}

      <div style={caixa}>
        <div style={titulo}>Os preços atuais</div>
        <div style={nota}>"Ver no Continente" abre a pesquisa do mais barato para o mais caro, para confirmar à mão.</div>
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar produto…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.15)', fontSize: 14, marginBottom: 8 }} />
        {lista.slice(0, 80).map(mp => {
          const r = revistos.get(mp.id);
          return (
            <div key={mp.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0',
              borderTop: '1px solid rgba(26,23,20,0.06)', fontSize: 13.5, flexWrap: 'wrap' }}>
              <span style={{ flex: '1 1 200px', minWidth: 0 }}><b>{mp.nome}</b>
                <span style={{ color: 'rgba(26,23,20,0.5)' }}> · {r ? `${r.produtoContinente || r.marca}` : 'preço de fábrica'}</span></span>
              <span style={{ minWidth: 110 }}>{mp.unidadeReceita === 'un' ? `${e2(mp.precoUnitario)}/un` : `${e2(mp.precoKg)}/${mp.unidadeReceita === 'ml' ? 'l' : 'kg'}`}</span>
              <span style={{ minWidth: 70, color: r && r.atualizadoEm.slice(0, 7) === new Date().toISOString().slice(0, 7) ? '#3E7A31' : '#8a4a15' }}>
                {mp.atualizadoEm}</span>
              <a href={linkContinente(mp.nome)} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Ver no Continente</a>
            </div>
          );
        })}
        {lista.length > 80 && <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginTop: 6 }}>Mostram-se 80 de {lista.length}. Pesquisa para encontrar os outros.</div>}
      </div>
    </div>
  );
}
