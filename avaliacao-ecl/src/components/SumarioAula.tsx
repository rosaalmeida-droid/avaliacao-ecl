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
  /** '' parado · 'a_pedir' à espera do microfone · 'a_ouvir' a gravar */
  const [fase, setFase] = useState<'' | 'a_pedir' | 'a_ouvir'>('');
  const [parcial, setParcial] = useState('');
  const [aviso, setAviso] = useState('');
  const reconhecedor = useRef<any>(null);
  const relogios = useRef<any[]>([]);
  const guardado = (getPlanosAula().find(p => p.id === plano.id)?.sumario || '') === texto.trim();

  const SR: any = typeof window !== 'undefined'
    && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const limparRelogios = () => { relogios.current.forEach(clearTimeout); relogios.current = []; };
  /** O professor quer continuar a ouvir? Só o «Parar» (ou sair) põe isto a falso. */
  const querOuvir = useRef(false);
  /** O texto provisório, que o Chrome ainda não deu por final. */
  const provisorio = useRef('');
  const juntar = (tx: string) => { if (tx.trim()) setTexto(t => (t ? t.trimEnd() + ' ' : '') + tx.trim()); };
  /** Não deita fora o que já se ouviu: passa o provisório para a caixa. */
  const salvarProvisorio = () => { juntar(provisorio.current); provisorio.current = ''; setParcial(''); };
  const parar = () => {
    querOuvir.current = false;
    limparRelogios();
    // stop() (e não abort()): o Chrome entrega o que ouviu antes de desligar.
    try { reconhecedor.current?.stop(); } catch { /* */ }
    setTimeout(salvarProvisorio, 600);
    reconhecedor.current = null; setFase('');
  };
  useEffect(() => () => { querOuvir.current = false; try { reconhecedor.current?.abort(); } catch { /* */ } }, []);

  // Guarda sozinho, pouco depois de parar de escrever ou de ditar. Antes só
  // guardava com o botão — e se a página prendia, perdia-se tudo.
  useEffect(() => {
    if (guardado) return;
    const t = setTimeout(() => guardar(true), 1500);
    return () => clearTimeout(t);
  }, [texto]);

  function ditar() {
    if (!SR) { setAviso('Este navegador não deixa ditar. Use o Chrome, ou o microfone do teclado do telemóvel (🎤 no teclado).'); return; }
    if (fase) { parar(); return; }
    querOuvir.current = true;
    setAviso(''); setFase('a_pedir');
    // Se o microfone não arrancar (aviso do navegador por responder), desiste.
    relogios.current.push(setTimeout(() => {
      if (querOuvir.current && !arrancou.current) { parar(); setAviso('O microfone não arrancou. Se apareceu um aviso do navegador a pedir o microfone, carregue em «Permitir» e tente outra vez.'); }
    }, 10000));
    // Limite de segurança: 10 minutos.
    relogios.current.push(setTimeout(() => { if (querOuvir.current) { parar(); setAviso('O ditado parou ao fim de 10 minutos. Carregue outra vez para continuar.'); } }, 600000));
    arrancou.current = false;
    ouvir();
  }

  const arrancou = useRef(false);
  /** Liga o reconhecimento. Fica ligado até ao «Parar»: se o Chrome o
   *  desligar numa pausa, volta a ligar-se sozinho. */
  function ouvir() {
    const r = new SR();
    r.lang = 'pt-PT'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onstart = () => { arrancou.current = true; setFase('a_ouvir'); };
    r.onresult = (ev: any) => {
      let meio = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const tx = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) juntar(tx); else meio += tx;
      }
      provisorio.current = meio;
      setParcial(meio);
    };
    r.onerror = (ev: any) => {
      const e = ev?.error;
      if (e === 'not-allowed' || e === 'service-not-allowed') {
        querOuvir.current = false;
        setAviso('O navegador não deixou usar o microfone. Carregue no cadeado 🔒 ao lado do endereço e permita o microfone.');
      } else if (e === 'network') {
        querOuvir.current = false;
        setAviso('O ditado precisa de internet. Tente outra vez.');
      }
      // 'no-speech' e 'aborted': não é erro — continua a ouvir.
    };
    r.onend = () => {
      salvarProvisorio();
      if (querOuvir.current && reconhecedor.current === r) {
        // O Chrome desligou numa pausa: volta a ligar.
        setTimeout(() => { if (querOuvir.current) { try { ouvir(); } catch { parar(); } } }, 250);
      } else if (reconhecedor.current === r || !querOuvir.current) {
        limparRelogios(); reconhecedor.current = null; setFase('');
      }
    };
    reconhecedor.current = r;
    try { r.start(); } catch { parar(); setAviso('Não consegui ligar o microfone. Tente outra vez.'); }
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

  function guardar(sozinho = false) {
    const atual = getPlanosAula().find(p => p.id === plano.id) || plano;
    if ((atual.sumario || '') === texto.trim()) return;
    const p = { ...atual, sumario: texto.trim(), atualizadoEm: new Date().toISOString() };
    addOrUpdatePlanoAula(p);
    onGuardado?.(p);
    if (!sozinho) setAviso('Sumário guardado. Os alunos veem-no na aula.');
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
      {/* Enquanto grava: um aviso grande, que não se confunde com nada. */}
      {fase && (
        <div style={{ background: fase === 'a_ouvir' ? '#c0392b' : '#8a4a15', color: '#fff', borderRadius: 12,
          padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 26 }}>{fase === 'a_ouvir' ? '🔴' : '⏳'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              {fase === 'a_ouvir' ? 'A ouvir… fale agora' : 'A ligar o microfone…'}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
              {fase === 'a_ouvir'
                ? (parcial || 'Fale à vontade. Só pára quando carregar em «Parar». O texto fica na caixa e guarda-se sozinho.')
                : 'Se o navegador perguntar, carregue em «Permitir».'}
            </div>
          </div>
          <button onClick={parar} style={{ padding: '9px 14px', borderRadius: 9, border: 'none', background: '#fff',
            color: '#c0392b', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>■ Parar</button>
        </div>
      )}
      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4}
        placeholder="Ex.: Dinâmica de grupo. Preparação do almoço pedagógico: divisão de tarefas, compras e orçamento."
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, fontSize: 14.5,
          fontFamily: 'inherit', lineHeight: 1.5, border: `1.5px solid ${fase ? '#c0392b' : 'rgba(26,23,20,0.15)'}`, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
        <button onClick={ditar} style={botao(fase ? '#c0392b' : undefined)}>
          {fase ? '■ Parar' : texto ? '🎤 Ditar mais' : '🎤 Ditar'}
        </button>
        <button onClick={abrirChatGPT} style={botao()}>✨ Melhorar no ChatGPT</button>
        <button onClick={abrirGemini} style={botao()}>✨ Melhorar no Gemini</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: guardado ? '#3E7A31' : 'rgba(26,23,20,0.5)' }}>
          {!texto.trim() ? '' : guardado ? '✓ Guardado' : 'A guardar…'}
        </span>
      </div>
      {aviso && <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.7)', marginTop: 8, lineHeight: 1.5 }}>{aviso}</div>}
    </div>
  );
}

export default SumarioAula;
