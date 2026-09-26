// ============================================================
// A abertura da aula chegou aos alunos?
// ============================================================
// Mostra, por baixo da aula aberta, se a abertura já está no Sheets (e
// portanto os alunos a veem). Se demorar, diz-o a vermelho, com um botão
// para tentar já outra vez — em vez de o professor esperar sem saber.
// ============================================================
import React, { useEffect, useState } from 'react';
import { estadoAbertura, subscreverAbertura, confirmarAberturaNoSheets, getSessaoAula } from '../backend';

export function EstadoAberturaAula({ planoAulaId }: { planoAulaId: string }) {
  const [, redesenhar] = useState(0);
  useEffect(() => subscreverAbertura(() => redesenhar(n => n + 1)), []);
  const e = estadoAbertura(planoAulaId);
  const s = getSessaoAula(planoAulaId);
  if (!s?.abertaEm || s.fechadaEm) return null;

  const tentar = () => { confirmarAberturaNoSheets(planoAulaId).catch(() => false); redesenhar(n => n + 1); };
  const botao: React.CSSProperties = { marginTop: 10, minHeight: 44, padding: '8px 16px', borderRadius: 12, border: 'none',
    background: '#fff', color: '#C0392B', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 };

  if (!e) {
    return (
      <div style={{ marginTop: 8, fontSize: 14, color: '#777', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Não sei se já chegou aos alunos.</span>
        <button onClick={tentar} style={{ ...botao, marginTop: 0, border: '1.5px solid #3E7A31', color: '#3E7A31' }}>Confirmar que chegou</button>
      </div>
    );
  }
  if (e.estado === 'chegou') {
    return <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800, color: '#3E7A31' }}>✓ Chegou aos alunos: já a veem aberta</div>;
  }
  if (e.estado === 'a_enviar') {
    return <div style={{ marginTop: 8, fontSize: 14.5, fontWeight: 700, color: '#777' }}>⏳ A enviar aos alunos…</div>;
  }
  const desistiu = e.estado === 'nao_chegou';
  return (
    <div style={{ marginTop: 10, background: '#C0392B', color: '#fff', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>⚠ A aula ainda não chegou aos alunos</div>
      <div style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5, opacity: 0.95 }}>
        {desistiu
          ? 'O Sheets não a recebeu. Verifique a internet e carregue em «Tentar outra vez».'
          : `O Sheets ainda não a recebeu. A aplicação está a tentar de 10 em 10 segundos (tentativa ${e.tentativas}).`}
      </div>
      <button onClick={tentar} style={botao}>Tentar outra vez</button>
    </div>
  );
}

export default EstadoAberturaAula;
