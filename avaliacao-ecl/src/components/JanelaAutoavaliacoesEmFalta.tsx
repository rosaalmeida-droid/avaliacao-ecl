// ============================================================
// Logo à entrada: as autoavaliações que o aluno tem de fazer
// ============================================================
// Rosa, 12/out/2026: «Obriga os alunos a responder outra vez, e tem de ser
// logo, de chapa, permitindo-os na mesma circular pela aplicação. Se não se
// avaliam, estão a perder.» A janela aparece sempre que o aluno abre a
// aplicação, até responder a tudo. «Agora não» fecha-a e deixa-o usar a
// aplicação; o aviso continua no topo do Início.
// ============================================================
import React from 'react';

const COBRE = '#B5651D';

export interface AulaEmFalta { id: string; titulo: string; data: string; motivo: string;
  /** Atividade fora do horário (verde) ou aula (roxo), e como foi: para o aluno saber o que vai avaliar. */
  atividade?: boolean; comFarda?: boolean; naCozinha?: boolean }

const VERDE = '#1F7A6B', ROXO = '#6B3FA0';
const diaSemana = (iso: string, curto = false) => {
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  const w = d.toLocaleDateString('pt-PT', { weekday: 'long' });
  return curto ? w.slice(0, 3) : w;
};
const mes = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '');
};

/** Uma aula ou atividade por avaliar: o dia, o tipo, o nome e como foi. */
export function CartaoPorAvaliar({ a }: { a: AulaEmFalta }) {
  const cor = a.atividade ? VERDE : ROXO;
  const como = [a.atividade ? 'Fora do horário' : a.naCozinha ? 'Na cozinha' : 'Na sala',
    a.comFarda === undefined ? '' : a.comFarda ? 'com farda' : 'sem farda'].filter(Boolean).join(' · ');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr', gap: 12, alignItems: 'center',
      border: `1.5px solid ${a.atividade ? '#9fd0c4' : '#cdbbe6'}`, background: a.atividade ? '#EAF5F2' : '#F3EEFA',
      borderRadius: 12, padding: '10px 12px', textAlign: 'left' }}>
      <div style={{ background: cor, color: '#fff', borderRadius: 10, textAlign: 'center', padding: '6px 0', lineHeight: 1.05 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{a.data ? a.data.slice(8, 10) : '—'}</div>
        <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{a.data ? `${diaSemana(a.data, true)} · ${mes(a.data)}` : ''}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
          borderRadius: 6, padding: '2px 6px', color: '#fff', background: cor }}>{a.atividade ? 'Atividade' : 'Aula'}</span>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', marginTop: 3 }}>{a.titulo}</div>
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.7)', marginTop: 2, lineHeight: 1.4 }}>
          {como}{como && a.motivo ? ' · ' : ''}{a.motivo}
        </div>
      </div>
    </div>
  );
}
/** «sábado», «segunda-feira». */
export function diaDaSemana(iso: string): string { return diaSemana(iso); }

export function JanelaAutoavaliacoesEmFalta({ aulas, onResponder, onFechar }: {
  aulas: AulaEmFalta[];
  /** Abre a primeira por responder. */
  onResponder: () => void;
  onFechar: () => void;
}) {
  if (!aulas.length) return null;
  const uma = aulas.length === 1;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="janela-em-falta-titulo"
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(26,23,20,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto',
        padding: '20px 18px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: COBRE }}>Obrigatório</div>
        <div id="janela-em-falta-titulo" style={{ fontSize: 21, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.25, marginTop: 4 }}>
          {uma ? 'Tens uma autoavaliação por fazer' : `Tens ${aulas.length} autoavaliações por fazer`}
        </div>
        <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.7)', marginTop: 6, lineHeight: 1.5 }}>
          {uma ? 'Enquanto não respondes, estás a perder na nota. Leva 2 minutos.'
            : 'Uma de cada vez, pela ordem dos dias. Enquanto não respondes, estás a perder na nota. Leva 2 minutos cada uma.'}
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {aulas.map(a => <CartaoPorAvaliar key={a.id} a={a} />)}
        </div>
        <button onClick={onResponder} style={{ width: '100%', marginTop: 16, minHeight: 52, borderRadius: 12, border: 'none',
          background: COBRE, color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          {uma ? 'Responder agora' : aulas[0]?.data ? `Começar pela de ${diaSemana(aulas[0].data)}` : 'Responder agora'}
        </button>
        <button onClick={onFechar} style={{ width: '100%', marginTop: 8, minHeight: 44, borderRadius: 12,
          border: '1.5px solid rgba(26,23,20,0.2)', background: '#fff', color: 'rgba(26,23,20,0.75)', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit' }}>
          Agora não
        </button>
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.5)', marginTop: 8, textAlign: 'center', lineHeight: 1.45 }}>
          Esta janela volta sempre que abrires a aplicação, até responderes.
        </div>
      </div>
    </div>
  );
}
