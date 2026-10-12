// ============================================================
// Aulas a que faltaste — o aluno propõe-se a recuperar (Rosa, 12/out/2026)
// ============================================================
// «Devia ser o aluno a se autopropor»: cada aula com falta marcada pode ser
// recuperada, mesmo sem chegar aos 10% de faltas. Na aula teórica a
// recuperação abre logo: o aluno estuda o trabalho da aula e autoavalia-se nos
// conhecimentos; o professor valida. Nas outras (prática, mista, atitudinal)
// só com o aval do professor, que diz o que fazer e depois dá a nota.
// A nota substitui o 0 só dessa aula; a falta conta na mesma nas horas.
// ============================================================
import React, { useState } from 'react';
import type { Aluno, PlanoAula } from '../types';
import { aulasFaltadasParaRecuperar, proporRecuperacaoDaAula, ultimaResposta } from '../backend';

const COBRE = '#B5651D', COBRE_SUAVE = '#FDF0E8', COBRE_TEXTO = '#8A4E15';
const VERDE = '#3E7A31', VERDE_SUAVE = '#E8F3E5', ROXO = '#6B3FA0';
const dm = (d?: string) => d ? `${String(d).slice(8, 10)}/${String(d).slice(5, 7)}` : '';
const f1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const tipoDaAula = (p: any) => {
  const t = String(p?.tipoPlanAula || '');
  return t === 'teorico' ? 'aula teórica' : t.startsWith('atitudinal') ? 'aula de atitudes' : t === 'misto' || t === 'mista' ? 'aula mista' : 'aula prática';
};

export function RecuperarAulasAluno({ aluno, onAutoavaliar }: { aluno: Aluno; onAutoavaliar: (p: PlanoAula) => void }) {
  const [, redesenhar] = useState(0);
  const [aEscrever, setAEscrever] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const aulas = aulasFaltadasParaRecuperar(aluno.id, aluno.turmaId);
  if (!aulas.length) return null;

  const bt = (cheio: boolean, cor = ROXO): React.CSSProperties => ({ minHeight: 44, padding: '10px 16px', borderRadius: 12, fontSize: 15, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${cor}`, background: cheio ? cor : '#fff', color: cheio ? '#fff' : cor });
  const pedir = (p: PlanoAula, msg: string) => { proporRecuperacaoDaAula(aluno, p.id, msg); setAEscrever(null); setTexto(''); redesenhar(n => n + 1); };

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Aulas a que faltaste</div>
      <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.65)', marginBottom: 12, lineHeight: 1.5 }}>
        Podes recuperar cada aula a que faltaste. Enquanto não a recuperares, conta 0 na tua nota da UC.
        A falta conta na mesma nas horas.
      </div>
      {aulas.map(({ plano: p, e }) => {
        const cab = (
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 15.5 }}>Aula de {dm(p.data)}</span>
            <span style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)' }}>{tipoDaAula(p)} · {p.ucId}</span>
          </div>
        );
        const cartao = (cor: string, fundo: string, filhos: React.ReactNode) => (
          <div key={p.id} style={{ background: fundo, border: `1.5px solid ${cor}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10, fontSize: 14.5, lineHeight: 1.5 }}>
            {cab}{filhos}
          </div>
        );
        if (e.estado === 'recuperada') return cartao(VERDE, VERDE_SUAVE,
          <div style={{ marginTop: 4, fontWeight: 700, color: VERDE }}>✓ Recuperada: {f1(e.nota)} em 20. Esta nota conta em vez do 0.</div>);
        if (e.estado === 'aberta') {
          const r = e.r;
          if (r.automatica) {
            const respondeu = !!ultimaResposta(aluno.id, p.id);
            return cartao(COBRE, COBRE_SUAVE, <>
              <div style={{ marginTop: 4, color: COBRE_TEXTO }}>
                {respondeu ? 'Já te autoavaliaste: falta o professor validar.'
                  : 'Recuperação aberta: estuda o trabalho desta aula e responde aos conhecimentos. O professor valida.'}
                {r.oQueFazer ? ` O professor pediu: ${r.oQueFazer}` : ''}{r.prazo ? ` Até ${dm(r.prazo)}.` : ''}
              </div>
              {!respondeu && <button onClick={() => onAutoavaliar(p)} style={{ ...bt(true, COBRE), marginTop: 9, width: '100%' }}>Autoavaliar-me nesta aula</button>}
            </>);
          }
          return cartao(COBRE, COBRE_SUAVE,
            <div style={{ marginTop: 4, color: COBRE_TEXTO }}>
              <b>O professor aceitou.</b> O que tens de fazer: {r.oQueFazer || 'fala com o professor'}{/[.!?]$/.test(r.oQueFazer || '') ? '' : '.'}
              {r.prazo ? ` Até ${dm(r.prazo)}.` : ''} Depois, o professor dá a nota.
            </div>);
        }
        if (e.estado === 'pedida') return cartao('rgba(26,23,20,0.25)', '#fff',
          <div style={{ marginTop: 4, color: 'rgba(26,23,20,0.75)' }}>
            Pediste ao professor em {dm(e.em)}{e.texto ? `: «${e.texto}»` : ''}. Espera pela resposta dele: se aceitar, diz-te o que fazer e até quando.
          </div>);
        // Pode pedir (ou pedir outra vez, se o professor não aceitou).
        const automatica = e.estado === 'pode_pedir' && e.automatica;
        const escrever = aEscrever === p.id;
        return cartao(ROXO, '#fff', <>
          {e.estado === 'recusada' && (
            <div style={{ marginTop: 4, color: '#8e2418' }}>
              {e.r.recusada ? 'O professor não aceitou o teu pedido' : 'O professor cancelou a recuperação'}{e.r.motivo ? `: ${e.r.motivo}` : '.'}{' '}
              Podes pedir outra vez.
            </div>
          )}
          <div style={{ marginTop: 4, color: 'rgba(26,23,20,0.75)' }}>
            {automatica
              ? 'É uma aula teórica: podes recuperá-la já. Estudas o trabalho da aula e autoavalias-te nos conhecimentos; o professor valida.'
              : 'Esta aula precisa do aval do professor. Diz o que propões fazer (por exemplo, apresentar o trabalho): se ele aceitar, diz-te o que fazer e até quando.'}
          </div>
          {automatica ? (
            <button onClick={() => { pedir(p, ''); onAutoavaliar(p); }} style={{ ...bt(true), marginTop: 9, width: '100%' }}>Recuperar esta aula</button>
          ) : escrever ? (
            <div style={{ marginTop: 9 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>
                O que propões fazer?
                <textarea value={texto} onChange={ev => setTexto(ev.target.value)} rows={2} placeholder="Ex.: apresentar o trabalho na próxima aula."
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, padding: '10px 11px', borderRadius: 10,
                    border: '1.5px solid rgba(26,23,20,0.2)', fontFamily: 'inherit', fontSize: 15, resize: 'vertical' }} />
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button disabled={!texto.trim()} onClick={() => pedir(p, texto)} style={{ ...bt(true), flex: 2, opacity: texto.trim() ? 1 : 0.5 }}>Enviar ao professor</button>
                <button onClick={() => { setAEscrever(null); setTexto(''); }} style={{ ...bt(false), flex: 1 }}>Voltar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setAEscrever(p.id); setTexto(''); }} style={{ ...bt(true), marginTop: 9, width: '100%' }}>
              {e.estado === 'recusada' ? 'Pedir outra vez ao professor' : 'Pedir ao professor para recuperar'}
            </button>
          )}
        </>);
      })}
    </div>
  );
}
