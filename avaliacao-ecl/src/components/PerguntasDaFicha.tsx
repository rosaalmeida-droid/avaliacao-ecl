// ============================================================
// Perguntas ao aluno — na ficha técnica (Rosa, out/2026).
// O professor vê as perguntas que a IA escreveu para cada técnica,
// aprova-as, pede outra ou retira-as. As que não cumprem as regras
// aparecem à parte, com o motivo. Nada disto aparece na ficha que o
// aluno consulta: só na autoavaliação.
// ============================================================
import React, { useState } from 'react';
import {
  type PerguntaTecnica, aprovarPergunta, substituirPergunta, promptPedirOutra, lerPerguntasDaIA,
  aprovadaNoBanco,
} from '../bancoPerguntas';
import { pedirAIA } from '../ia';
import { nomeCompetencia } from '../compatECL';
import { getFichasProducao } from '../backend';
import { SeletorIA } from './SeletorIA';

const V = '#6B3FA0';
const nome = (id: string) => { try { return nomeCompetencia(id); } catch { return id; } };

export function PerguntasDaFicha({ perguntas, prato, quem, onMudar }: {
  perguntas: PerguntaTecnica[]; prato: string; quem: string;
  onMudar: (lista: PerguntaTecnica[]) => void;
}) {
  const [aPedir, setAPedir] = useState<string | null>(null);
  const [manual, setManual] = useState<{ id: string; prompt: string } | null>(null);
  const [colado, setColado] = useState('');
  const [aviso, setAviso] = useState('');
  const [verSimples, setVerSimples] = useState<string | null>(null);

  const visiveis = perguntas.filter(p => p.estado !== 'substituida');
  if (!visiveis.length) return null;
  const propostas = visiveis.filter(p => p.estado === 'proposta');
  const fichas = getFichasProducao();

  function recebeuOutra(antiga: PerguntaTecnica, texto: string): boolean {
    const nova = lerPerguntasDaIA(texto).find(n => n.competenciaId === antiga.competenciaId && n.aspeto === antiga.aspeto)
      || lerPerguntasDaIA(texto)[0];
    if (!nova) { setAviso('A resposta não trouxe nenhuma pergunta no formato pedido. Tente outra vez.'); return false; }
    onMudar(substituirPergunta(perguntas, antiga.id, { ...nova, competenciaId: antiga.competenciaId, aspeto: antiga.aspeto, origemFichaId: antiga.origemFichaId }));
    setAviso(nova.estado === 'rejeitada' ? 'A nova pergunta também não cumpre todas as regras: veja o motivo e peça outra, se for necessário.' : '');
    return true;
  }

  async function pedirOutra(p: PerguntaTecnica) {
    setAviso(''); setAPedir(p.id);
    const anteriores = perguntas.filter(x => x.competenciaId === p.competenciaId && x.aspeto === p.aspeto && x.id !== p.id);
    const prompt = promptPedirOutra(p, nome(p.competenciaId), prato, anteriores);
    const r = await pedirAIA(prompt, 2000);
    setAPedir(null);
    if (r.ok) { recebeuOutra(p, 'PERGUNTAS DE AUTOAVALIAÇÃO:\n' + r.texto.replace(/^[\s\S]*?PERGUNTAS DE AUTOAVALIA[ÇC][ÃA]O:\s*\n/i, '')); return; }
    // Sem ligação direta: o pedido fica pronto para copiar, e a resposta cola-se aqui.
    setManual({ id: p.id, prompt });
  }

  const linha = (p: PerguntaTecnica) => {
    const doBanco = p.estado !== 'aprovada' ? aprovadaNoBanco(fichas, p.competenciaId, p.aspeto) : undefined;
    const cor = p.estado === 'aprovada' ? '#3E7A31' : p.estado === 'rejeitada' ? '#a23a2e' : '#8a5a12';
    const rotulo = p.estado === 'aprovada' ? 'Aprovada' : p.estado === 'rejeitada' ? 'Não cumpre as regras' : 'Por aprovar';
    return (
      <div key={p.id} style={{ border: '1px solid rgba(26,23,20,0.12)', borderRadius: 10, padding: 12, marginBottom: 10, background: '#fff' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <b style={{ fontSize: 14 }}>{nome(p.competenciaId)}</b>
          <span style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>· {p.aspeto === 'execucao' ? 'Execução' : 'Resultado'}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: cor }}>{rotulo}</span>
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 600, margin: '6px 0 4px' }}>{p.normal.pergunta}</div>
        <ol style={{ margin: '0 0 6px 20px', padding: 0, fontSize: 13.5, lineHeight: 1.5 }}>
          {p.normal.respostas.map((r, i) => <li key={i}>{r} <span style={{ color: 'rgba(26,23,20,0.4)', fontSize: 12 }}>(nível {i + 1})</span></li>)}
        </ol>
        {p.problemas?.length ? <div style={{ fontSize: 12.5, color: '#a23a2e', marginBottom: 6 }}>Motivo: {p.problemas.join('; ')}.</div> : null}
        {verSimples === p.id && (
          <div style={{ fontSize: 13, background: 'rgba(26,23,20,0.03)', borderRadius: 8, padding: '6px 10px', marginBottom: 6 }}>
            {p.simples && <div><b>Medidas seletivas:</b> {p.simples.pergunta} — {p.simples.respostas.join(' · ')}</div>}
            {p.muitoSimples && <div style={{ marginTop: 4 }}><b>Medidas adicionais:</b> {p.muitoSimples.pergunta} — {p.muitoSimples.respostas.join(' · ')}</div>}
          </div>
        )}
        {doBanco && (
          <div style={{ fontSize: 12.5, color: V, marginBottom: 6 }}>
            Já existe uma pergunta aprovada para esta técnica: «{doBanco.normal.pergunta}»
            <button type="button" onClick={() => onMudar(substituirPergunta(perguntas, p.id, { ...doBanco, id: 'pt_' + Date.now().toString(36), origemFichaId: p.origemFichaId }))}
              style={{ marginLeft: 6, border: 'none', background: 'none', color: V, textDecoration: 'underline', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>
              usar essa
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {p.estado !== 'aprovada' && p.estado !== 'rejeitada' && (
            <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: '5px 12px' }}
              onClick={() => onMudar(aprovarPergunta(perguntas, p.id, quem))}>✓ Aprovar</button>
          )}
          <button type="button" className="btn btn-ghost" style={{ fontSize: 13, padding: '5px 12px' }} disabled={aPedir === p.id}
            onClick={() => pedirOutra(p)}>{aPedir === p.id ? '⏳ A pedir…' : '↻ Pedir outra'}</button>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 13, padding: '5px 12px' }}
            onClick={() => setVerSimples(verSimples === p.id ? null : p.id)}>{verSimples === p.id ? 'Esconder versões fáceis' : 'Ver versões fáceis'}</button>
          {p.estado !== 'rejeitada' && (
            <button type="button" className="btn btn-ghost" style={{ fontSize: 13, padding: '5px 12px' }}
              onClick={() => onMudar(perguntas.map(x => x.id === p.id ? { ...x, estado: 'rejeitada', problemas: ['retirada pelo professor'] } : x))}>Retirar</button>
          )}
        </div>
        {manual?.id === p.id && (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(181,101,29,0.06)' }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>A ligação direta à IA não está disponível. Envie este pedido a uma IA e cole a resposta abaixo:</div>
            <SeletorIA prompt={manual.prompt} />
            <textarea className="input" value={colado} onChange={e => setColado(e.target.value)} placeholder="Cole aqui a resposta da IA" style={{ minHeight: 80, fontSize: 13 }} />
            <button type="button" className="btn btn-primary" style={{ marginTop: 6 }} disabled={!colado.trim()}
              onClick={() => { if (recebeuOutra(p, colado.includes('PERGUNTAS DE AUTOAVALIA') ? colado : 'PERGUNTAS DE AUTOAVALIAÇÃO:\n' + colado)) { setManual(null); setColado(''); } }}>
              Usar esta resposta
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ border: `1.5px solid ${V}44`, borderRadius: 12, padding: 14, margin: '12px 0', background: '#faf8fd' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: V }}>Perguntas ao aluno (autoavaliação das técnicas)</div>
      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', margin: '4px 0 10px', lineHeight: 1.5 }}>
        Escritas pela IA com esta ficha. Não aparecem na ficha técnica: só na autoavaliação do aluno, com a ordem das respostas baralhada.
        As aprovadas ficam guardadas e voltam a ser usadas quando a mesma técnica aparecer noutra ficha.
      </div>
      {propostas.length > 1 && (
        <button type="button" className="btn btn-ghost" style={{ marginBottom: 10, fontSize: 13 }}
          onClick={() => onMudar(propostas.reduce((l, p) => aprovarPergunta(l, p.id, quem), perguntas))}>
          ✓ Aprovar as {propostas.length} perguntas por aprovar
        </button>
      )}
      {aviso && <div style={{ marginBottom: 8, fontSize: 13, color: '#8a5a12' }}>{aviso}</div>}
      {visiveis.filter(p => p.estado !== 'rejeitada').map(linha)}
      {visiveis.some(p => p.estado === 'rejeitada') && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a23a2e', margin: '6px 0' }}>Não cumprem as regras ou foram retiradas</div>
          {visiveis.filter(p => p.estado === 'rejeitada').map(linha)}
        </>
      )}
    </div>
  );
}
