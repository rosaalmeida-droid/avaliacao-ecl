// ============================================================
// O email da escola do aluno — obrigatório na entrada (Rosa, out/2026).
// Sem ele, o aluno não continua: é para onde vão os avisos de
// autoavaliação em falta.
// ============================================================
import React, { useState } from 'react';
import type { Aluno } from '../types';
import { registarEmailDoAluno, RE_EMAIL_ESCOLA } from '../backend';

export function PedirEmailEscola({ aluno, onFeito }: { aluno: Aluno; onFeito: () => void }) {
  const [email, setEmail] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');

  function guardar() {
    const e = email.trim().toLowerCase();
    if (!RE_EMAIL_ESCOLA.test(e)) { setErro('Escreve o teu email da escola, terminado em @eclisboa.net.'); return; }
    if (e !== confirmar.trim().toLowerCase()) { setErro('Os dois emails não são iguais. Confirma que escreveste bem.'); return; }
    if (registarEmailDoAluno(aluno, e)) onFeito();
  }

  const campo: React.CSSProperties = { width: '100%', minHeight: 50, fontSize: 17, padding: '10px 12px', borderRadius: 10,
    border: '1.5px solid rgba(26,23,20,0.2)', fontFamily: 'inherit', boxSizing: 'border-box' };
  return (
    <div style={{ minHeight: '100vh', background: '#f6f2fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', maxWidth: 440, width: '100%', boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#4b2a7b', marginBottom: 6 }}>O teu email da escola</div>
        <div style={{ fontSize: 15, color: 'rgba(26,23,20,0.7)', lineHeight: 1.55, marginBottom: 16 }}>
          Olá, {String(aluno.nome || '').split(' ')[0]}. Antes de continuares, escreve o teu email da escola.
          É para lá que enviamos os avisos quando te falta uma autoavaliação.
        </div>
        <label style={{ fontSize: 14, fontWeight: 700 }}>Email da escola</label>
        <input type="email" autoComplete="email" inputMode="email" value={email} placeholder="nome@eclisboa.net"
          onChange={e => { setEmail(e.target.value); setErro(''); }} style={{ ...campo, margin: '6px 0 12px' }} />
        <label style={{ fontSize: 14, fontWeight: 700 }}>Escreve outra vez, para confirmar</label>
        <input type="email" autoComplete="off" inputMode="email" value={confirmar} placeholder="nome@eclisboa.net"
          onChange={e => { setConfirmar(e.target.value); setErro(''); }} style={{ ...campo, margin: '6px 0 12px' }} />
        {erro && <div style={{ color: '#a23a2e', fontSize: 14, marginBottom: 10 }}>{erro}</div>}
        <button type="button" onClick={guardar}
          style={{ width: '100%', minHeight: 52, borderRadius: 12, border: 'none', background: '#6B3FA0', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Guardar e continuar
        </button>
      </div>
    </div>
  );
}
