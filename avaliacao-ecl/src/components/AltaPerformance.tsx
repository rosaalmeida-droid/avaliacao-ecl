// ============================================================
// Alta performance (extra) — os três ecrãs (Rosa, 6/out/2026):
//  · no plano, o professor cria as perguntas (IA ou à mão) e aprova-as;
//  · no fim da autoavaliação, o aluno escolhe se quer responder;
//  · na validação, o professor avalia e decide se entra na avaliação.
// ============================================================
import React, { useState } from 'react';
import type { PlanoAula } from '../types';
import { getFichasPorPlano, getPlanosAula } from '../backend';
import { pedirAIA } from '../ia';
import { SeletorIA } from './SeletorIA';
import {
  type PerguntaAP, type RespostaAP, altaPerformanceDoPlano, perguntasAPAprovadas, guardarPerguntasAP,
  promptAltaPerformance, lerPerguntasAP, respostasAP, guardarRespostasAP, mediaAP,
} from '../altaPerformance';

const AZUL = '#1F4E79';
const caixa: React.CSSProperties = { background: '#f2f6fb', border: `1.5px solid ${AZUL}55`, borderRadius: 14, padding: '14px 16px', margin: '0 0 14px' };
const botao = (cheio = false): React.CSSProperties => ({ padding: '8px 14px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'inherit', border: `1.5px solid ${AZUL}`, background: cheio ? AZUL : '#fff', color: cheio ? '#fff' : AZUL });
const area: React.CSSProperties = { width: '100%', minHeight: 70, padding: 10, borderRadius: 10, border: '1px solid rgba(26,23,20,0.2)',
  fontFamily: 'inherit', fontSize: 14.5, boxSizing: 'border-box' };

// ── 1. No plano (professor) ─────────────────────────────────────────────
export function AltaPerformanceNoPlano({ plano, onPlanoActualizado }: { plano: PlanoAula; onPlanoActualizado: (p: PlanoAula) => void }) {
  const [aberto, setAberto] = useState(false);
  const [aPedir, setAPedir] = useState(false);
  const [manual, setManual] = useState(false);
  const [colado, setColado] = useState('');
  const [aviso, setAviso] = useState('');
  const [nova, setNova] = useState({ pergunta: '', criterio: '', tipo: 'tecnica' as PerguntaAP['tipo'] });
  const [, redesenhar] = useState(0);
  // Lê-se sempre o que está guardado: dois toques seguidos não se desfazem um ao outro.
  const atual = () => getPlanosAula().find(x => x.id === plano.id) || plano;
  const lista = altaPerformanceDoPlano(atual()).perguntas.filter(q => q.estado !== 'retirada');
  const aprovadas = lista.filter(q => q.estado === 'aprovada').length;
  const fichas = getFichasPorPlano(plano.id);
  const conteudos = (((plano as any).conhecimentosProf || []) as any[]).map(k => String(k?.texto || k?.nome || '')).filter(Boolean);
  const prompt = promptAltaPerformance(plano, fichas, conteudos);
  const gravar = (perguntas: PerguntaAP[]) => { const p = guardarPerguntasAP(plano.id, perguntas); if (p) onPlanoActualizado(p); redesenhar(n => n + 1); };
  const todas = () => altaPerformanceDoPlano(atual()).perguntas;
  const juntar = (novas: PerguntaAP[]) => {
    if (!novas.length) { setAviso('A resposta não trouxe perguntas no formato pedido (linhas a começar por «AP |»). Tente outra vez.'); return; }
    setAviso(''); gravar([...todas(), ...novas]); setManual(false); setColado('');
  };
  async function criarComIA() {
    if (!fichas.length && !conteudos.length) { setAviso('Junte primeiro uma ficha técnica ou conteúdos ao plano: as perguntas partem deles.'); return; }
    setAPedir(true); setAviso('');
    const r = await pedirAIA(prompt, 3000);
    setAPedir(false);
    if (r.ok) juntar(lerPerguntasAP(r.texto, fichas.map(f => f.nomePrato).join(', ') || 'conteúdos'));
    else { setManual(true); setAviso('A ligação direta à IA não respondeu. Copie o pedido, cole-o na IA e cole aqui a resposta.'); }
  }
  const mudar = (id: string, x: Partial<PerguntaAP>) => gravar(todas().map(q => q.id === id ? { ...q, ...x } : q));

  return (
    <div style={caixa}>
      <button onClick={() => setAberto(a => !a)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
        <div style={{ fontWeight: 800, fontSize: 15.5, color: AZUL }}>🚀 Alta performance (extra) {aprovadas ? `· ${aprovadas} ${aprovadas === 1 ? 'pergunta' : 'perguntas'}` : ''} {aberto ? '▲' : '▼'}</div>
        <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', marginTop: 2 }}>
          Perguntas mais difíceis, só para quem quer: no fim da autoavaliação o aluno escolhe se responde. Não contam para a nota, a não ser que o professor decida.
        </div>
      </button>
      {aberto && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { void criarComIA(); }} disabled={aPedir} style={botao(true)}>{aPedir ? 'A criar…' : 'Criar perguntas com a IA'}</button>
            <button onClick={() => setManual(m => !m)} style={botao()}>Copiar o pedido e colar a resposta</button>
          </div>
          {aviso && <div style={{ color: '#8a5a12', fontSize: 13.5, marginTop: 8 }}>{aviso}</div>}
          {manual && (
            <div style={{ marginTop: 10 }}>
              <SeletorIA prompt={prompt} corPrincipal={AZUL} />
              <textarea value={colado} onChange={e => setColado(e.target.value)} placeholder="Cole aqui a resposta da IA (linhas «AP | TECNICA | …»)" style={{ ...area, marginTop: 8 }} />
              <button onClick={() => juntar(lerPerguntasAP(colado, 'IA'))} style={{ ...botao(true), marginTop: 6 }}>Ler as perguntas</button>
            </div>
          )}
          {lista.map(q => (
            <div key={q.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', marginTop: 10, border: '1px solid rgba(26,23,20,0.1)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: AZUL, textTransform: 'uppercase' }}>
                {q.tipo === 'conhecimento' ? 'Conhecimento' : 'Técnica'} · {q.estado === 'aprovada' ? '✓ aprovada (os alunos veem)' : 'proposta (ainda não aparece aos alunos)'}
              </div>
              <textarea value={q.pergunta} onChange={e => mudar(q.id, { pergunta: e.target.value })} style={{ ...area, minHeight: 50, marginTop: 4 }} />
              <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginTop: 4 }}>Resposta de nível muito bom (só o professor vê): {q.criterio}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {q.estado !== 'aprovada' && <button onClick={() => mudar(q.id, { estado: 'aprovada' })} style={botao(true)}>Aprovar</button>}
                <button onClick={() => mudar(q.id, { estado: 'retirada' })} style={botao()}>Retirar</button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 13.5, fontWeight: 700 }}>Escrever uma pergunta minha</div>
          <textarea value={nova.pergunta} onChange={e => setNova(n => ({ ...n, pergunta: e.target.value }))} placeholder="A pergunta" style={{ ...area, minHeight: 50, marginTop: 4 }} />
          <textarea value={nova.criterio} onChange={e => setNova(n => ({ ...n, criterio: e.target.value }))} placeholder="O que tem uma resposta de nível muito bom (só o professor vê)" style={{ ...area, minHeight: 40, marginTop: 4 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <select value={nova.tipo} onChange={e => setNova(n => ({ ...n, tipo: e.target.value as PerguntaAP['tipo'] }))} style={{ padding: 8, borderRadius: 10, fontFamily: 'inherit' }}>
              <option value="tecnica">Técnica</option><option value="conhecimento">Conhecimento</option>
            </select>
            <button disabled={nova.pergunta.trim().length < 10} onClick={() => {
              gravar([...todas(), { id: 'ap_' + Date.now().toString(36), tipo: nova.tipo, pergunta: nova.pergunta.trim(), criterio: nova.criterio.trim(), estado: 'aprovada', origem: 'professor' }]);
              setNova({ pergunta: '', criterio: '', tipo: nova.tipo });
            }} style={botao(true)}>Acrescentar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. No fim da autoavaliação (aluno) ──────────────────────────────────
export function DesafioAltaPerformance({ aluno, plano }: { aluno: { id: string; turmaId: string }; plano: PlanoAula }) {
  const perguntas = perguntasAPAprovadas(plano);
  const jaRespondeu = respostasAP(aluno.id, plano.id);
  const [aResponder, setAResponder] = useState(false);
  const [resp, setResp] = useState<Record<string, string>>({});
  const [enviado, setEnviado] = useState(!!jaRespondeu);
  if (!perguntas.length) return null;
  if (enviado) return (
    <div style={{ ...caixa, background: '#eef4eb', borderColor: '#3E7A3155' }}>
      <div style={{ fontWeight: 800, color: '#3E7A31' }}>🚀 Respondeste ao desafio de alta performance</div>
      <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', marginTop: 2 }}>O professor vai ler as tuas respostas. É extra: não baixa a tua nota.</div>
    </div>
  );
  if (!aResponder) return (
    <div style={caixa}>
      <div style={{ fontWeight: 800, fontSize: 16, color: AZUL }}>🚀 Queres um desafio de alta performance?</div>
      <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.7)', margin: '4px 0 10px', lineHeight: 1.5 }}>
        {perguntas.length} {perguntas.length === 1 ? 'pergunta mais difícil' : 'perguntas mais difíceis'} sobre a aula de hoje, para mostrares o teu nível.
        É extra e opcional: não baixa a tua nota.
      </div>
      <button onClick={() => setAResponder(true)} style={botao(true)}>Quero responder</button>
    </div>
  );
  const prontas = perguntas.every(q => (resp[q.id] || '').trim().length >= 20);
  return (
    <div style={caixa}>
      <div style={{ fontWeight: 800, fontSize: 16, color: AZUL }}>🚀 Desafio de alta performance</div>
      <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', margin: '2px 0 8px' }}>Responde com as tuas palavras, em 3 a 6 frases. Explica o porquê.</div>
      {perguntas.map((q, i) => (
        <div key={q.id} style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.45 }}>{i + 1}. {q.pergunta}</div>
          <textarea value={resp[q.id] || ''} onChange={e => setResp(r => ({ ...r, [q.id]: e.target.value }))} style={{ ...area, marginTop: 4 }} />
        </div>
      ))}
      <button disabled={!prontas} onClick={() => {
        guardarRespostasAP(aluno, plano.id, perguntas.map(q => ({ id: q.id, resposta: (resp[q.id] || '').trim() } as RespostaAP)));
        setEnviado(true);
      }} style={{ ...botao(true), marginTop: 10, opacity: prontas ? 1 : 0.5 }}>Enviar as respostas</button>
      {!prontas && <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', marginTop: 4 }}>Escreve pelo menos uma frase completa em cada pergunta.</div>}
    </div>
  );
}

// ── 3. Na validação (professor) ─────────────────────────────────────────
const NIVEIS_AP = [0, 5, 10, 15, 20];
export function AvaliarAltaPerformance({ alunoId, plano, notas, entra, onNotas, onEntra }: {
  alunoId: string; plano: PlanoAula | undefined; notas: Record<string, number>; entra: boolean;
  onNotas: (n: Record<string, number>) => void; onEntra: (v: boolean) => void;
}) {
  const respostas = plano ? respostasAP(alunoId, plano.id) : null;
  if (!plano || !respostas || !respostas.length) return null;
  const perguntas = altaPerformanceDoPlano(plano).perguntas;
  const media = mediaAP(notas);
  return (
    <div style={caixa}>
      <div style={{ fontWeight: 800, fontSize: 15.5, color: AZUL }}>🚀 Alta performance (extra){media !== null ? ` · ${String(media).replace('.', ',')}/20` : ''}</div>
      <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', marginTop: 2 }}>O aluno escolheu responder às perguntas mais difíceis. Avalie cada resposta.</div>
      {respostas.map(r => {
        const q = perguntas.find(x => x.id === r.id);
        return (
          <div key={r.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', marginTop: 10, border: '1px solid rgba(26,23,20,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{q?.pergunta || 'Pergunta'}</div>
            <div style={{ fontSize: 14.5, margin: '6px 0', padding: '8px 10px', background: '#f7f5f2', borderRadius: 8, whiteSpace: 'pre-wrap' }}>{r.resposta}</div>
            {q?.criterio && <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)' }}>O que procurar: {q.criterio}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {NIVEIS_AP.map(n => (
                <button key={n} type="button" onClick={() => onNotas({ ...notas, [r.id]: n })}
                  style={{ ...botao(notas[r.id] === n), minWidth: 52 }}>{n}</button>
              ))}
            </div>
          </div>
        );
      })}
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, fontSize: 14, cursor: 'pointer', lineHeight: 1.4 }}>
        <input type="checkbox" checked={entra} onChange={e => onEntra(e.target.checked)} style={{ marginTop: 3 }} />
        <span><b>Entra na avaliação.</b> Por omissão não entra: fica registado, para ver o nível do aluno. A forma de contar decide-se depois.</span>
      </label>
    </div>
  );
}
