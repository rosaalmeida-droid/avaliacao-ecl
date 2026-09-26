// ============================================================
// Sumário da aula — escrito ou ditado, e posto «bonito» por uma IA
// ============================================================
// O professor não tem tempo para escrever. Pode ditar (o Chrome passa a
// voz a texto, de graça) e, se quiser, carregar em «Melhorar com IA»:
// abre-se o ChatGPT ou o Gemini com o pedido já feito, e cola-se aqui a
// resposta. Não é obrigatório. Fica no plano e vai para o Sheets.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import type { PlanoAula } from '../types';
import { addOrUpdatePlanoAula, getPlanosAula } from '../backend';

function pedidoIA(plano: PlanoAula, notas: string): string {
  const data = String(plano.data || '').slice(0, 10).split('-').reverse().join('/');
  return `Escreve o sumário de uma aula de um curso profissional de Cozinha/Pastelaria, em português de Portugal, a partir das notas do professor.

Regras:
- 3 a 6 linhas, frases curtas e simples, como no livro de sumários.
- Começa pelo tema da aula; depois o que se fez e o que se trabalhou.
- Não inventes nada que não esteja nas notas.
- Responde só com o sumário, sem títulos nem comentários.

Aula: ${plano.titulo || ''}
Turma: ${plano.turmaId} · Data: ${data}${plano.ucNome ? ` · ${plano.ucId} ${plano.ucNome}` : ''}

Notas do professor:
${notas.trim() || '(sem notas)'}`;
}

export function SumarioAula({ plano, onGuardado }: { plano: PlanoAula; onGuardado?: (p: PlanoAula) => void }) {
  const [texto, setTexto] = useState<string>(plano.sumario || '');
  const [aOuvir, setAOuvir] = useState(false);
  const [aviso, setAviso] = useState('');
  const reconhecedor = useRef<any>(null);
  const guardado = (getPlanosAula().find(p => p.id === plano.id)?.sumario || '') === texto;

  const SR: any = typeof window !== 'undefined'
    && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => () => { try { reconhecedor.current?.stop(); } catch { /* */ } }, []);

  function ditar() {
    if (!SR) { setAviso('Este navegador não deixa ditar. Usa o Chrome, ou o microfone do teclado do telemóvel.'); return; }
    if (aOuvir) { try { reconhecedor.current?.stop(); } catch { /* */ } return; }
    const r = new SR();
    r.lang = 'pt-PT'; r.continuous = true; r.interimResults = false;
    r.onresult = (ev: any) => {
      let novo = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++)
        if (ev.results[i].isFinal) novo += ev.results[i][0].transcript;
      if (novo.trim()) setTexto(t => (t ? t.trimEnd() + ' ' : '') + novo.trim());
    };
    r.onerror = (ev: any) => setAviso(ev?.error === 'not-allowed'
      ? 'O navegador não deixou usar o microfone. Carrega no cadeado ao lado do endereço e permite o microfone.'
      : 'O ditado parou. Carrega outra vez em «Ditar».');
    r.onend = () => setAOuvir(false);
    reconhecedor.current = r;
    setAviso(''); setAOuvir(true);
    try { r.start(); } catch { setAOuvir(false); }
  }

  async function copiar(): Promise<boolean> {
    try { await navigator.clipboard.writeText(pedidoIA(plano, texto)); return true; } catch { return false; }
  }
  async function abrirChatGPT() {
    await copiar();
    window.open('https://chatgpt.com/?q=' + encodeURIComponent(pedidoIA(plano, texto)), '_blank', 'noopener');
    setAviso('Abri o ChatGPT com o pedido. Copia a resposta e cola-a aqui, por cima das notas.');
  }
  async function abrirGemini() {
    const ok = await copiar();
    window.open('https://gemini.google.com/app', '_blank', 'noopener');
    setAviso(ok ? 'O pedido está copiado: no Gemini, cola-o (Ctrl+V) e envia. Depois cola aqui a resposta.'
      : 'Não consegui copiar sozinho. Escreve as notas no Gemini e pede o sumário.');
  }

  function guardar() {
    const atual = getPlanosAula().find(p => p.id === plano.id) || plano;
    const p = { ...atual, sumario: texto.trim(), atualizadoEm: new Date().toISOString() };
    addOrUpdatePlanoAula(p);
    onGuardado?.(p);
    setAviso('Sumário guardado. Os alunos veem-no na aula.');
  }

  const botao = (cor?: string): React.CSSProperties => ({
    padding: '9px 13px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
    border: cor ? 'none' : '1px solid rgba(26,23,20,0.18)', background: cor || '#fff', color: cor ? '#fff' : 'inherit',
  });

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, border: '1px solid rgba(26,23,20,0.1)' }}>
      <div style={{ fontSize: 15.5, fontWeight: 700 }}>Sumário da aula <span style={{ fontWeight: 500, fontSize: 13, color: 'rgba(26,23,20,0.5)' }}>(opcional)</span></div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', margin: '3px 0 10px', lineHeight: 1.5 }}>
        Diz o que se vai fazer. Podes ditar e, se quiseres, pedir a uma IA que o ponha bonito. Os alunos veem-no na aula e quando se avaliam.
      </div>
      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4}
        placeholder="Ex.: Dinâmica de grupo. Preparação do almoço pedagógico: divisão de tarefas, compras e orçamento."
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, fontSize: 14.5,
          fontFamily: 'inherit', lineHeight: 1.5, border: `1.5px solid ${aOuvir ? '#c0392b' : 'rgba(26,23,20,0.15)'}`, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button onClick={ditar} style={botao(aOuvir ? '#c0392b' : undefined)}>
          {aOuvir ? '■ Parar de ditar' : '🎤 Ditar'}
        </button>
        <button onClick={abrirChatGPT} style={botao()}>✨ Melhorar no ChatGPT</button>
        <button onClick={abrirGemini} style={botao()}>✨ Melhorar no Gemini</button>
        <div style={{ flex: 1 }} />
        <button onClick={guardar} disabled={guardado} style={{ ...botao(guardado ? 'rgba(26,23,20,0.25)' : 'var(--sage)'),
          cursor: guardado ? 'default' : 'pointer' }}>
          {guardado && texto ? '✓ Guardado' : 'Guardar sumário'}
        </button>
      </div>
      {aOuvir && <div style={{ fontSize: 13, color: '#c0392b', marginTop: 8, fontWeight: 600 }}>● A ouvir… fala normalmente.</div>}
      {aviso && <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.7)', marginTop: 8, lineHeight: 1.5 }}>{aviso}</div>}
    </div>
  );
}

export default SumarioAula;
