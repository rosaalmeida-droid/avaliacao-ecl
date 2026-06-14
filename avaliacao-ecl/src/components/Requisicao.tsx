import React, { useState, useEffect } from 'react';

interface LinhaIngrediente {
  qtReceita: string;
  nome: string;
  und: string;
  preco: string;
}

interface DadosRequisicao {
  nomeReceita: string;
  familia: string;
  paxTotal: number;
  paxReceita: number;
  bevCost: number;
  quebras: number;
  consumo: { bar: boolean; rest: boolean; interno: boolean; convidados: boolean };
  turma: string;
  dataAula: string;
  formador: string;
  atividade: string;
  preparacao: string;
  ingredientes: LinhaIngrediente[];
}

const VAZIA: DadosRequisicao = {
  nomeReceita: '',
  familia: '',
  paxTotal: 15,
  paxReceita: 1,
  bevCost: 20,
  quebras: 10,
  consumo: { bar: false, rest: true, interno: false, convidados: false },
  turma: '',
  dataAula: new Date().toISOString().split('T')[0],
  formador: '',
  atividade: '',
  preparacao: '',
  ingredientes: Array(14).fill(null).map(() => ({ qtReceita: '', nome: '', und: '', preco: '' })),
};

const C = {
  azul: '#daeef3',
  laranja: '#fde9d9',
  rosa: '#f2dbdb',
  bege: '#eeece1',
  branco: '#ffffff',
  preto: '#000000',
  cinzaEscuro: '#595959',
};

const inp: React.CSSProperties = {
  border: 'none', background: 'transparent', fontFamily: 'Arial', fontSize: 10,
  width: '100%', padding: '1px 2px', outline: 'none',
};

const celula = (bg: string, align: 'left'|'center'|'right' = 'left', bold = false, extraBorder?: string): React.CSSProperties => ({
  backgroundColor: bg,
  textAlign: align,
  fontWeight: bold ? 'bold' : 'normal',
  fontFamily: 'Arial',
  fontSize: 10,
  padding: '2px 4px',
  border: '1px solid #000000',
  borderRight: extraBorder || '1px solid #000000',
  verticalAlign: 'middle',
});

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwe1TlQ_CFdjIF2pI3lOLKMz_8N6MyZhR9i0R30Zz6ECIJYmQo_q4TkAySwmmlqxFdbhQ/exec';

export default function Requisicao() {
  const [dados, setDados] = useState<DadosRequisicao>(() => {
    try { const s = localStorage.getItem('ecl_req'); if (s) return JSON.parse(s); } catch {}
    return VAZIA;
  });
  const [buscando, setBuscando] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    try { localStorage.setItem('ecl_req', JSON.stringify(dados)); } catch {}
  }, [dados]);

  const setD = (k: keyof DadosRequisicao, v: any) => setDados(p => ({ ...p, [k]: v }));
  const setIng = (i: number, k: keyof LinhaIngrediente, v: string) => {
    const n = [...dados.ingredientes]; n[i] = { ...n[i], [k]: v }; setD('ingredientes', n);
  };

  const paxR = dados.paxReceita || 1;
  const paxT = dados.paxTotal || 1;
  const bevC = (dados.bevCost || 20) / 100;
  const qbPct = (dados.quebras || 10) / 100;

  let totR = 0, tot1p = 0, totE = 0;
  dados.ingredientes.forEach(ing => {
    const p = parseFloat(ing.preco) || 0;
    const q = parseFloat(ing.qtReceita) || 0;
    if (p && q) { totR += p*q; tot1p += p*q/paxR; totE += p*q*paxT/paxR; }
  });

  const qbR = totR*qbPct, qb1p = tot1p*qbPct, qbE = totE*qbPct;
  const crR = totR+qbR, cr1p = tot1p+qb1p, crE = totE+qbE;
  const pvs = bevC > 0 ? cr1p/bevC : 0;
  const pvp = pvs*1.13;
  const racio = cr1p > 0 ? pvs/cr1p : 0;
  const margem = pvs - cr1p;

  const fmt = (n: number, d=2) => n > 0 ? `${n.toFixed(d)} €` : '';
  const fmtQ = (n: number) => n > 0 ? n.toFixed(3) : '';

  async function enviarParaSheets() {
    setMsg('A enviar para Sheets...');
    try {
      // Apps Script requer FormData ou URLSearchParams para evitar CORS preflight
      const form = new FormData();
      form.append('dados', JSON.stringify(dados));
      
      await fetch(SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: form,
      });
      // no-cors não devolve resposta legível — assumir sucesso
      setMsg('✓ Enviado para Google Sheets!');
    } catch (err) {
      setMsg('Erro de ligação ao Sheets');
    }
    setTimeout(() => setMsg(''), 4000);
  }

  function guardar() {
    try { localStorage.setItem('ecl_req', JSON.stringify(dados)); setMsg('✓ Guardado'); setTimeout(() => setMsg(''), 2000); } catch {}
  }

  async function buscarPreco(i: number) {
    const nome = dados.ingredientes[i].nome; if (!nome) return;
    setBuscando(i);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 150,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: `Preço por kg ou litro de "${nome}" no Continente ou Pingo Doce Portugal. Responde APENAS com o número (ex: 2.50).` }]
        })
      });
      const data = await r.json();
      const txt = (data.content||[]).map((c:any)=>c.text||'').join('');
      const m = txt.match(/[\d]+[.,][\d]+/);
      if (m) { const p = parseFloat(m[0].replace(',','.')); if (p>0) setIng(i,'preco',p.toFixed(2)); }
    } catch {}
    setBuscando(null);
  }

  const logoStyle: React.CSSProperties = {
    backgroundColor: C.bege, border: '2px solid #000', padding: '4px 8px',
    fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', textAlign: 'center',
    display: 'flex', alignItems: 'center', gap: 6,
  };

  const tabelaStyle: React.CSSProperties = {
    width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial', fontSize: 10,
  };

  return (
    <div style={{ padding: '8px', overflowX: 'auto' }}>
      <table style={tabelaStyle}>

        {/* LINHA 1 — LOGO + TÍTULO */}
        <tbody>
        <tr>
          <td colSpan={3} style={{ ...celula(C.bege), border: '2px solid #000', padding: '6px 8px', fontSize: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🏫</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 11 }}>Escola de Comércio de Lisboa</div>
                <div style={{ fontSize: 9 }}>FICHA TÉCNICA / REQUISIÇÃO</div>
              </div>
            </div>
          </td>
          <td colSpan={7} style={{ ...celula(C.branco), border: '2px solid #000' }}></td>
        </tr>

        {/* LINHA 2 — NOME DA RECEITA */}
        <tr>
          <td colSpan={2} style={{ ...celula(C.branco), fontWeight: 'bold', fontSize: 10, border: '1px solid #000' }}>NOME DA RECEITA:</td>
          <td colSpan={5} style={{ ...celula(C.branco), border: '1px solid #000' }}>
            <input style={{ ...inp, fontSize: 11, fontWeight: 'bold' }} value={dados.nomeReceita} onChange={e => setD('nomeReceita', e.target.value)} placeholder="Nome da receita..." />
          </td>
          <td colSpan={3} style={{ ...celula(C.branco), border: '1px solid #000' }}></td>
        </tr>

        {/* LINHA 3 — FAMÍLIA / ENCOMENDAS / RECEITA PARA */}
        <tr>
          <td style={{ ...celula(C.branco), fontWeight: 'bold' }}>Família:</td>
          <td colSpan={2} style={celula(C.branco)}>
            <input style={inp} value={dados.familia} onChange={e => setD('familia', e.target.value)} placeholder="ex: Bebidas" />
          </td>
          <td style={{ ...celula(C.branco), fontWeight: 'bold', textAlign: 'right' }}>Encomendas:</td>
          <td style={{ ...celula(C.branco), textAlign: 'center' }}>
            <input style={{ ...inp, textAlign: 'center', width: 40 }} type="number" value={dados.paxTotal} onChange={e => setD('paxTotal', parseInt(e.target.value)||1)} />
          </td>
          <td style={celula(C.branco)}>pax</td>
          <td style={{ ...celula(C.branco), fontWeight: 'bold', textAlign: 'right' }}>Receita para:</td>
          <td style={{ ...celula(C.branco), textAlign: 'center' }}>
            <input style={{ ...inp, textAlign: 'center', width: 30 }} type="number" value={dados.paxReceita} onChange={e => setD('paxReceita', parseInt(e.target.value)||1)} />
          </td>
          <td style={celula(C.branco)}>pax</td>
          <td style={celula(C.branco)}></td>
        </tr>

        {/* LINHA 4 — CABEÇALHO CUSTOS */}
        <tr>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center' }}>Custo por Porção</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center' }}>Margem Contrib.</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center' }}>Preço Venda S/ IVA</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center' }}>PVP c/ IVA</td>
          <td colSpan={2} style={{ ...celula(C.azul), textAlign: 'center' }}>
            <span style={{ fontSize: 9 }}>13% (Mark Up)</span>
          </td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center' }}>Rácio</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center' }}>Beverage Cost (%)</td>
          <td colSpan={2} style={celula(C.branco)}></td>
        </tr>

        {/* LINHA 5 — VALORES CUSTOS */}
        <tr>
          <td style={{ ...celula(C.branco), textAlign: 'center', fontWeight: 'bold' }}>{fmt(cr1p, 2)}</td>
          <td style={{ ...celula(C.branco), textAlign: 'center', fontWeight: 'bold' }}>{fmt(margem, 2)}</td>
          <td style={{ ...celula(C.branco), textAlign: 'center', fontWeight: 'bold' }}>{fmt(pvs, 2)}</td>
          <td style={{ ...celula(C.branco), textAlign: 'center', fontWeight: 'bold' }}>{fmt(pvp, 2)}</td>
          <td colSpan={2} style={{ ...celula(C.branco), textAlign: 'center' }}></td>
          <td style={{ ...celula(C.branco), textAlign: 'center', fontWeight: 'bold' }}>{racio > 0 ? racio.toFixed(2) : ''}</td>
          <td style={{ ...celula(C.branco), textAlign: 'center' }}>
            <input style={{ ...inp, textAlign: 'center', width: 35 }} type="number" value={dados.bevCost} onChange={e => setD('bevCost', parseFloat(e.target.value)||20)} />
            <span>%</span>
          </td>
          <td colSpan={2} style={celula(C.branco)}></td>
        </tr>

        {/* LINHA 6 — CABEÇALHO INGREDIENTES */}
        <tr>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center', border: '2px solid #000' }}>Quantidade 1 pax</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center', border: '2px solid #000' }}>Quantidade Receita</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center', border: '2px solid #000' }}>Ingredientes</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center', border: '2px solid #000' }}>Und</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center', border: '2px solid #000' }}>Quant. Encomenda</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center', border: '2px solid #000' }}>Preço Unitário</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center', border: '2px solid #000' }}>Preço Receita</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center', border: '2px solid #000' }}>Preço 1 pax</td>
          <td style={{ ...celula(C.azul), fontWeight: 'bold', textAlign: 'center', border: '2px solid #000' }}>Preço Encomenda</td>
          <td style={{ ...celula(C.branco), border: '1px solid #000' }}></td>
        </tr>

        {/* LINHAS INGREDIENTES */}
        {dados.ingredientes.map((ing, i) => {
          const p = parseFloat(ing.preco)||0;
          const q = parseFloat(ing.qtReceita)||0;
          const prR = p&&q ? p*q : 0;
          const pr1p = p&&q ? p*q/paxR : 0;
          const prE = p&&q ? p*q*paxT/paxR : 0;
          const qt1p = q ? q/paxR : 0;
          const qtEnc = q ? q*paxT/paxR : 0;
          const bgRow = i%2===0 ? C.branco : '#f7fbfd';
          return (
            <tr key={i}>
              <td style={{ ...celula(bgRow), textAlign: 'right' }}>{fmtQ(qt1p)}</td>
              <td style={{ ...celula(bgRow), textAlign: 'right' }}>
                <input style={{ ...inp, textAlign: 'right' }} type="number" step="0.001" value={ing.qtReceita} onChange={e => setIng(i,'qtReceita',e.target.value)} placeholder="0,000" />
              </td>
              <td style={celula(bgRow)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input style={{ ...inp, flex: 1 }} value={ing.nome} onChange={e => setIng(i,'nome',e.target.value)} placeholder="Ingrediente..." />
                  {ing.nome && (
                    <button onClick={() => buscarPreco(i)} disabled={buscando===i}
                      style={{ fontSize: 8, padding: '1px 3px', border: '1px solid #aaa', borderRadius: 2, background: '#f0f0f0', cursor: 'pointer', flexShrink: 0 }}>
                      {buscando===i ? '⏳' : '🔍'}
                    </button>
                  )}
                </div>
              </td>
              <td style={celula(bgRow)}>
                <input style={{ ...inp, textAlign: 'center' }} value={ing.und} onChange={e => setIng(i,'und',e.target.value)} placeholder="un" />
              </td>
              <td style={{ ...celula(bgRow), textAlign: 'right' }}>{fmtQ(qtEnc)}</td>
              <td style={{ ...celula(bgRow), textAlign: 'right' }}>
                <input style={{ ...inp, textAlign: 'right' }} type="number" step="0.01" value={ing.preco} onChange={e => setIng(i,'preco',e.target.value)} placeholder="0,00" />
              </td>
              <td style={{ ...celula(bgRow), textAlign: 'right' }}>{prR>0 ? `${prR.toFixed(2)} €` : ''}</td>
              <td style={{ ...celula(bgRow), textAlign: 'right' }}>{pr1p>0 ? `${pr1p.toFixed(2)} €` : ''}</td>
              <td style={{ ...celula(bgRow), textAlign: 'right' }}>{prE>0 ? `${prE.toFixed(2)} €` : ''}</td>
              <td style={{ ...celula(C.branco), border: '1px solid #000' }}></td>
            </tr>
          );
        })}

        {/* TOTAIS */}
        <tr>
          <td colSpan={5} style={{ ...celula(C.branco), border: '2px solid #000', fontWeight: 'bold' }}>Preparação / Confeção:</td>
          <td style={{ ...celula(C.branco), fontWeight: 'bold', border: '2px solid #000' }}>Total Custo</td>
          <td style={{ ...celula(C.azul), textAlign: 'right', fontWeight: 'bold', border: '2px solid #000' }}>{fmt(totR)}</td>
          <td style={{ ...celula(C.rosa), textAlign: 'right', fontWeight: 'bold', border: '2px solid #000' }}>{fmt(tot1p, 2)}</td>
          <td style={{ ...celula(C.azul), textAlign: 'right', fontWeight: 'bold', border: '2px solid #000' }}>{fmt(totE)}</td>
          <td style={celula(C.branco)}></td>
        </tr>
        <tr>
          <td colSpan={5} rowSpan={2} style={{ ...celula(C.branco), border: '2px solid #000', verticalAlign: 'top' }}>
            <textarea value={dados.preparacao} onChange={e => setD('preparacao', e.target.value)} rows={3}
              style={{ ...inp, resize: 'none', width: '100%', fontSize: 9 }}
              placeholder="Preparação / Confeção..." />
          </td>
          <td style={{ ...celula(C.branco), fontWeight: 'bold', border: '2px solid #000' }}>
            Quebras <input type="number" value={dados.quebras} onChange={e => setD('quebras', parseFloat(e.target.value)||10)}
              style={{ ...inp, width: 25, textAlign: 'right', display: 'inline' }} />%
          </td>
          <td style={{ ...celula(C.laranja), textAlign: 'right', border: '2px solid #000' }}>{fmt(qbR)}</td>
          <td style={{ ...celula(C.laranja), textAlign: 'right', border: '2px solid #000' }}>{fmt(qb1p, 2)}</td>
          <td style={{ ...celula(C.laranja), textAlign: 'right', border: '2px solid #000' }}>{fmt(qbE)}</td>
          <td style={celula(C.branco)}></td>
        </tr>
        <tr>
          <td style={{ ...celula(C.branco), fontWeight: 'bold', border: '2px solid #000' }}>Custo Real</td>
          <td style={{ ...celula(C.rosa), textAlign: 'right', fontWeight: 'bold', border: '2px solid #000' }}>{fmt(crR)}</td>
          <td style={{ ...celula(C.rosa), textAlign: 'right', fontWeight: 'bold', border: '2px solid #000' }}>{fmt(cr1p, 2)}</td>
          <td style={{ ...celula(C.rosa), textAlign: 'right', fontWeight: 'bold', border: '2px solid #000' }}>{fmt(crE)}</td>
          <td style={celula(C.branco)}></td>
        </tr>

        {/* RODAPÉ */}
        <tr>
          <td colSpan={4} style={{ ...celula(C.branco), border: '2px solid #000', fontSize: 9 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontWeight: 'bold' }}>Consumo:</span>
              {[['bar','ECL BAR'],['rest','ECL Restaurante'],['interno','Consumo Interno'],['convidados','Convidados']].map(([k,l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                  <input type="checkbox" checked={(dados.consumo as any)[k]} onChange={e => setD('consumo', { ...dados.consumo, [k]: e.target.checked })} />
                  {l}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 6, fontSize: 9 }}>
              <strong>Atividade: </strong>
              <input style={{ ...inp, display: 'inline', width: '70%' }} value={dados.atividade} onChange={e => setD('atividade', e.target.value)} placeholder="ex: Almoço Erasmus tour" />
            </div>
          </td>
          <td colSpan={3} style={{ ...celula(C.branco), border: '2px solid #000', fontSize: 9 }}>
            {[['turma','Turma:'],['dataAula','Data aula:'],['formador','Formador:']].map(([k,l]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <span style={{ fontWeight: 'bold', width: 70 }}>{l}</span>
                {k === 'dataAula'
                  ? <input type="date" style={{ ...inp, flex: 1 }} value={dados.dataAula} onChange={e => setD('dataAula', e.target.value)} />
                  : <input style={{ ...inp, flex: 1, borderBottom: '1px solid #999' }} value={(dados as any)[k]} onChange={e => setD(k as any, e.target.value)} />
                }
              </div>
            ))}
          </td>
          <td colSpan={3} style={{ ...celula(C.branco), border: '2px solid #000', fontSize: 9, textAlign: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              <div style={{ fontWeight: 'bold' }}>Direcção</div>
              <div style={{ fontWeight: 'bold' }}>Formador</div>
              <div style={{ fontWeight: 'bold' }}>Responsável Compras</div>
              <div style={{ borderTop: '1px solid #000', marginTop: 20 }}></div>
              <div style={{ borderTop: '1px solid #000', marginTop: 20 }}></div>
              <div style={{ borderTop: '1px solid #000', marginTop: 20 }}></div>
            </div>
          </td>
        </tr>
        </tbody>
      </table>

      {/* AÇÕES */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
        {msg && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, background: '#E2EFDA', color: '#375623' }}>{msg}</span>}
        <button onClick={() => setD('ingredientes', [...dados.ingredientes, { qtReceita:'', nome:'', und:'', preco:'' }])}
          style={{ padding: '5px 10px', fontSize: 10, border: '1px solid #ccc', borderRadius: 3, background: '#6c757d', color: 'white', cursor: 'pointer' }}>
          + Linha
        </button>
        <button onClick={async () => { for(let i=0;i<dados.ingredientes.length;i++) { if(dados.ingredientes[i].nome && !dados.ingredientes[i].preco) await buscarPreco(i); } }}
          disabled={buscando!==null}
          style={{ padding: '5px 10px', fontSize: 10, border: 'none', borderRadius: 3, background: '#0d6efd', color: 'white', cursor: 'pointer' }}>
          🔍 Buscar preços online
        </button>
        <button onClick={enviarParaSheets}
          style={{ padding: '5px 10px', fontSize: 10, border: 'none', borderRadius: 3, background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          📊 Guardar no Sheets
        </button>
        <button onClick={() => window.print()}
          style={{ padding: '5px 10px', fontSize: 10, border: 'none', borderRadius: 3, background: '#C00000', color: 'white', cursor: 'pointer' }}>
          PDF / Imprimir
        </button>
        <button onClick={guardar}
          style={{ padding: '5px 10px', fontSize: 10, border: 'none', borderRadius: 3, background: '#375623', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Guardar
        </button>
      </div>
    </div>
  );
}

