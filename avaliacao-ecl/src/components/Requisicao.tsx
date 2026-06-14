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
  ingredientes: Array(12).fill(null).map(() => ({ qtReceita: '', nome: '', und: '', preco: '' })),
};

export default function Requisicao() {
  const [dados, setDados] = useState<DadosRequisicao>(() => {
    try {
      const saved = localStorage.getItem('ecl_requisicao');
      if (saved) return JSON.parse(saved);
    } catch {}
    return VAZIA;
  });
  const [buscando, setBuscando] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    try { localStorage.setItem('ecl_requisicao', JSON.stringify(dados)); } catch {}
  }, [dados]);

  function setD(campo: keyof DadosRequisicao, val: any) {
    setDados(prev => ({ ...prev, [campo]: val }));
  }

  function setIng(i: number, campo: keyof LinhaIngrediente, val: string) {
    const novas = [...dados.ingredientes];
    novas[i] = { ...novas[i], [campo]: val };
    setD('ingredientes', novas);
  }

  function addLinha() {
    setD('ingredientes', [...dados.ingredientes, { qtReceita: '', nome: '', und: '', preco: '' }]);
  }

  // Cálculos
  const paxR = dados.paxReceita || 1;
  const paxT = dados.paxTotal || 1;
  const bevC = (dados.bevCost || 20) / 100;
  const qbPct = (dados.quebras || 10) / 100;

  let totReceita = 0, tot1pax = 0, totEncomenda = 0;
  dados.ingredientes.forEach(ing => {
    const p = parseFloat(ing.preco) || 0;
    const q = parseFloat(ing.qtReceita) || 0;
    if (p && q) {
      totReceita += p * q;
      tot1pax += (p * q) / paxR;
      totEncomenda += (p * q * paxT) / paxR;
    }
  });

  const qbReceita = totReceita * qbPct;
  const qb1pax = tot1pax * qbPct;
  const qbEncomenda = totEncomenda * qbPct;
  const crReceita = totReceita + qbReceita;
  const cr1pax = tot1pax + qb1pax;
  const crEncomenda = totEncomenda + qbEncomenda;
  const pvs = bevC > 0 ? cr1pax / bevC : 0;
  const pvp = pvs * 1.13;
  const racio = cr1pax > 0 ? pvs / cr1pax : 0;
  const margem = pvs - cr1pax;

  async function buscarPreco(i: number) {
    const nome = dados.ingredientes[i].nome;
    if (!nome) return;
    setBuscando(i);
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 150,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Qual o preço atual por kg ou litro de "${nome}" no Continente ou Pingo Doce Portugal? Responde APENAS com o número em euros (ex: 2.50). Se não encontrares, responde 0.`
          }]
        })
      });
      const data = await resp.json();
      const texto = (data.content || []).map((c: any) => c.text || '').join('');
      const match = texto.match(/[\d]+[.,][\d]+/);
      if (match) {
        const preco = parseFloat(match[0].replace(',', '.'));
        if (preco > 0) setIng(i, 'preco', preco.toFixed(2));
      }
    } catch {}
    setBuscando(null);
  }

  async function buscarTodos() {
    for (let i = 0; i < dados.ingredientes.length; i++) {
      if (dados.ingredientes[i].nome && !dados.ingredientes[i].preco) {
        await buscarPreco(i);
      }
    }
  }

  function guardar() {
    setMsg('✓ Guardado');
    setTimeout(() => setMsg(''), 2000);
  }

  const fmt = (n: number, dec = 2) => n > 0 ? `€ ${n.toFixed(dec)}` : '—';
  const fmtQt = (n: number) => n > 0 ? n.toFixed(3) : '';

  const estilos = {
    ficha: { border: '1px solid #000', fontFamily: 'Arial, sans-serif', fontSize: '12px' } as React.CSSProperties,
    cabecalho: { background: '#1F4E79', color: 'white', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '12px' } as React.CSSProperties,
    secaoNome: { background: '#BDD7EE', padding: '6px 10px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'center', gap: '8px' } as React.CSSProperties,
    inputNome: { border: 'none', borderBottom: '1px solid #666', background: 'transparent', fontSize: '13px', fontWeight: 'bold', color: '#1F4E79', flex: 1, padding: '2px 4px' } as React.CSSProperties,
    thAzul: { background: '#1F4E79', color: 'white', padding: '4px 6px', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #2d6aa0' } as React.CSSProperties,
    tdCinza: { padding: '3px 6px', borderRight: '1px solid #e0e0e0', fontSize: '11px' } as React.CSSProperties,
    inputCell: { border: 'none', background: 'transparent', fontSize: '11px', width: '100%', padding: '1px 2px' } as React.CSSProperties,
    calcCell: { color: '#1F4E79', fontWeight: 500, textAlign: 'right', fontSize: '11px' } as React.CSSProperties,
  };

  return (
    <div style={{ padding: '0.5rem' }}>
      <div style={estilos.ficha}>

        {/* CABEÇALHO */}
        <div style={estilos.cabecalho}>
          <div style={{ width: 36, height: 36, background: 'white', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏫</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 'bold' }}>Escola de Comércio de Lisboa</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>REQUISIÇÃO / FICHA DE CUSTOS</div>
          </div>
        </div>

        {/* NOME DA RECEITA */}
        <div style={estilos.secaoNome}>
          <label style={{ fontWeight: 'bold', fontSize: 11, whiteSpace: 'nowrap' }}>NOME DA RECEITA:</label>
          <input style={estilos.inputNome} value={dados.nomeReceita} onChange={e => setD('nomeReceita', e.target.value)} placeholder="Nome da receita..." />
        </div>

        {/* FAMÍLIA / ENCOMENDAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 60px 160px 60px', borderBottom: '1px solid #000' }}>
          {[
            <><span style={{ fontWeight: 'bold', fontSize: 10, color: '#1F4E79' }}>Família: </span><input style={{ ...estilos.inputCell, flex: 1 }} value={dados.familia} onChange={e => setD('familia', e.target.value)} /></>,
            <><span style={{ fontWeight: 'bold', fontSize: 10, color: '#1F4E79' }}>Encomendas: </span><input type="number" style={{ ...estilos.inputCell, width: 50 }} value={dados.paxTotal} onChange={e => setD('paxTotal', parseInt(e.target.value) || 1)} /></>,
            <span style={{ fontSize: 11 }}>pax</span>,
            <><span style={{ fontWeight: 'bold', fontSize: 10, color: '#1F4E79' }}>Receita para: </span><input type="number" style={{ ...estilos.inputCell, width: 40 }} value={dados.paxReceita} onChange={e => setD('paxReceita', parseInt(e.target.value) || 1)} /></>,
            <span style={{ fontSize: 11 }}>pax</span>,
          ].map((content, i) => (
            <div key={i} style={{ padding: '4px 8px', borderRight: i < 4 ? '1px solid #ccc' : 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              {content}
            </div>
          ))}
        </div>

        {/* CUSTOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', background: '#1F4E79', color: 'white', borderBottom: '1px solid #000' }}>
          {['Custo / Porção', 'Margem Contrib.', 'P.V. s/ IVA', 'PVP c/ IVA (13%)', 'Rácio', 'Bev. Cost (%)'].map((h, i) => (
            <div key={i} style={{ ...estilos.thAzul, borderRight: i < 5 ? '1px solid #2d6aa0' : 'none' }}>{h}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', background: '#DEEAF1', borderBottom: '1px solid #000' }}>
          {[
            fmt(cr1pax, 4),
            fmt(margem, 4),
            fmt(pvs, 4),
            fmt(pvp, 4),
            racio > 0 ? `${racio.toFixed(2)}x` : '—',
          ].map((v, i) => (
            <div key={i} style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold', color: '#1F4E79', fontSize: 11, borderRight: '1px solid #ccc' }}>{v}</div>
          ))}
          <div style={{ padding: '4px 8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <input type="number" value={dados.bevCost} onChange={e => setD('bevCost', parseFloat(e.target.value) || 20)} style={{ width: 35, border: 'none', background: 'transparent', fontWeight: 'bold', color: '#1F4E79', fontSize: 11, textAlign: 'center' }} />
            <span style={{ fontSize: 11, color: '#1F4E79', fontWeight: 'bold' }}>%</span>
          </div>
        </div>

        {/* TABELA INGREDIENTES */}
        <div style={{ display: 'grid', gridTemplateColumns: '70px 70px 1fr 50px 90px 85px 80px 85px', background: '#1F4E79', color: 'white' }}>
          {['Qt. 1 pax', 'Qt. Receita', 'Ingrediente', 'Und.', 'Qt. Encom.', 'Preço Unit.', 'Pr. Receita', 'Pr. Encom.'].map((h, i) => (
            <div key={i} style={{ ...estilos.thAzul, borderRight: i < 7 ? '1px solid #2d6aa0' : 'none' }}>{h}</div>
          ))}
        </div>

        {dados.ingredientes.map((ing, i) => {
          const p = parseFloat(ing.preco) || 0;
          const q = parseFloat(ing.qtReceita) || 0;
          const prReceita = p && q ? p * q : 0;
          const prEncomenda = p && q ? p * q * paxT / paxR : 0;
          const qt1pax = q ? q / paxR : 0;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 70px 1fr 50px 90px 85px 80px 85px', borderBottom: '1px solid #e0e0e0', background: i % 2 === 0 ? '#F2F8FC' : 'white' }}>
              <div style={{ ...estilos.tdCinza, ...estilos.calcCell }}>{fmtQt(qt1pax)}</div>
              <div style={estilos.tdCinza}><input type="number" step="0.001" style={estilos.inputCell} value={ing.qtReceita} onChange={e => setIng(i, 'qtReceita', e.target.value)} placeholder="0.000" /></div>
              <div style={{ ...estilos.tdCinza, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="text" style={{ ...estilos.inputCell, fontWeight: ing.nome ? 500 : 400 }} value={ing.nome} onChange={e => setIng(i, 'nome', e.target.value)} placeholder="Ingrediente..." />
                {ing.nome && (
                  <button onClick={() => buscarPreco(i)} disabled={buscando === i} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '1px solid #1F4E79', background: '#EBF3FB', color: '#1F4E79', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {buscando === i ? '⏳' : '🔍'}
                  </button>
                )}
              </div>
              <div style={estilos.tdCinza}><input type="text" style={estilos.inputCell} value={ing.und} onChange={e => setIng(i, 'und', e.target.value)} placeholder="un" /></div>
              <div style={{ ...estilos.tdCinza, ...estilos.calcCell }}>{fmtQt(q * paxT / paxR)}</div>
              <div style={estilos.tdCinza}><input type="number" step="0.01" style={{ ...estilos.inputCell, color: '#666' }} value={ing.preco} onChange={e => setIng(i, 'preco', e.target.value)} placeholder="0.00" /></div>
              <div style={{ ...estilos.tdCinza, ...estilos.calcCell }}>{prReceita > 0 ? `€ ${prReceita.toFixed(2)}` : ''}</div>
              <div style={{ ...estilos.tdCinza, ...estilos.calcCell, borderRight: 'none' }}>{prEncomenda > 0 ? `€ ${prEncomenda.toFixed(2)}` : ''}</div>
            </div>
          );
        })}

        {/* TOTAIS */}
        {[
          { label: 'Total Custo', bg: '#DEEAF1', color: '#1F4E79', r: totReceita, p: tot1pax, e: totEncomenda, bold: true },
          { label: `Quebras ${dados.quebras}%`, bg: '#FFF2CC', color: '#856404', r: qbReceita, p: qb1pax, e: qbEncomenda, bold: false },
          { label: 'Custo Real', bg: '#E2EFDA', color: '#375623', r: crReceita, p: cr1pax, e: crEncomenda, bold: true },
        ].map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 70px 1fr 50px 90px 85px 80px 85px', background: row.bg, borderTop: i === 0 ? '2px solid #1F4E79' : '1px solid #ccc' }}>
            <div style={{ gridColumn: '1/6', padding: '4px 8px', fontWeight: row.bold ? 'bold' : 'normal', color: row.color, fontSize: 11 }}>{row.label}</div>
            <div style={{ padding: '4px 8px', fontWeight: row.bold ? 'bold' : 'normal', color: row.color, fontSize: 11, textAlign: 'right' }}>{fmt(row.r)}</div>
            <div style={{ padding: '4px 8px', fontWeight: row.bold ? 'bold' : 'normal', color: row.color, fontSize: 11, textAlign: 'right' }}>{fmt(row.p, 4)}</div>
            <div style={{ padding: '4px 8px', fontWeight: row.bold ? 'bold' : 'normal', color: row.color, fontSize: 11, textAlign: 'right', borderRight: 'none' }}>{fmt(row.e)}</div>
          </div>
        ))}

        {/* RODAPÉ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', borderTop: '2px solid #1F4E79' }}>
          <div style={{ padding: '8px 10px', borderRight: '1px solid #ccc' }}>
            <div style={{ fontWeight: 'bold', fontSize: 10, color: '#1F4E79', marginBottom: 4 }}>PREPARAÇÃO / CONFEÇÃO:</div>
            <textarea value={dados.preparacao} onChange={e => setD('preparacao', e.target.value)} rows={3} style={{ width: '100%', border: '1px solid #ccc', fontSize: 11, padding: 4, fontFamily: 'Arial', resize: 'none' }} />
          </div>
          <div style={{ padding: '8px 10px' }}>
            {[
              { label: 'Consumo:', content: (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[['bar','ECL Bar'],['rest','ECL Rest.'],['interno','Interno'],['convidados','Convidados']].map(([k,l]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={(dados.consumo as any)[k]} onChange={e => setD('consumo', { ...dados.consumo, [k]: e.target.checked })} />
                      {l}
                    </label>
                  ))}
                </div>
              )},
              { label: 'Turma:', content: <input style={{ border: 'none', borderBottom: '1px solid #999', fontSize: 11, flex: 1, background: 'transparent' }} value={dados.turma} onChange={e => setD('turma', e.target.value)} /> },
              { label: 'Data aula:', content: <input type="date" style={{ border: 'none', borderBottom: '1px solid #999', fontSize: 11, flex: 1, background: 'transparent' }} value={dados.dataAula} onChange={e => setD('dataAula', e.target.value)} /> },
              { label: 'Formador:', content: <input style={{ border: 'none', borderBottom: '1px solid #999', fontSize: 11, flex: 1, background: 'transparent' }} value={dados.formador} onChange={e => setD('formador', e.target.value)} /> },
              { label: 'Atividade:', content: <input style={{ border: 'none', borderBottom: '1px solid #999', fontSize: 11, flex: 1, background: 'transparent' }} value={dados.atividade} onChange={e => setD('atividade', e.target.value)} /> },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, fontSize: 10 }}>
                <span style={{ fontWeight: 'bold', color: '#1F4E79', whiteSpace: 'nowrap', width: 70 }}>{row.label}</span>
                {row.content}
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginTop: 8, fontSize: 9, textAlign: 'center', color: '#1F4E79', fontWeight: 'bold', borderTop: '1px solid #ccc', paddingTop: 6 }}>
              <div>Direção</div><div>Formador</div><div>Resp. Compras</div>
              <div style={{ borderTop: '1px solid #999', marginTop: 20 }}></div>
              <div style={{ borderTop: '1px solid #999', marginTop: 20 }}></div>
              <div style={{ borderTop: '1px solid #999', marginTop: 20 }}></div>
            </div>
          </div>
        </div>

        {/* AÇÕES */}
        <div style={{ display: 'flex', gap: 8, padding: 8, background: '#F5F5F5', borderTop: '1px solid #ccc', justifyContent: 'flex-end', alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, background: '#E2EFDA', color: '#375623' }}>{msg}</span>}
          <button onClick={addLinha} style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid #ccc', background: '#6c757d', color: 'white', cursor: 'pointer', fontSize: 10 }}>+ Linha</button>
          <button onClick={buscarTodos} disabled={buscando !== null} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: '#0d6efd', color: 'white', cursor: 'pointer', fontSize: 10 }}>🔍 Buscar preços online</button>
          <button onClick={() => window.print()} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: '#C00000', color: 'white', cursor: 'pointer', fontSize: 10 }}>PDF</button>
          <button onClick={guardar} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: '#375623', color: 'white', cursor: 'pointer', fontSize: 10, fontWeight: 'bold' }}>Guardar</button>
        </div>

      </div>
    </div>
  );
}

