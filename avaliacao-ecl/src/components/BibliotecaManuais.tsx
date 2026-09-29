// Os Manuais do Aluno ECL (PDF): o aluno vê os do seu curso, com o da UC
// atual primeiro; o professor escolhe a turma (versão) e vê todos por ano.
import React, { useState } from 'react';
import { MANUAIS_UFCD, MANUAIS_UC, MANUAIS_UC_1ANO, COORTES, coorteDaTurma, urlManual, manualDoModulo, ehManualUC, anoDaTurma, type Manual, type Coorte } from '../manuais';

const COR = '#1aa1af';

function Linha({ m, url, destaque }: { m: Manual; url: string; destaque?: boolean }) {
  return (
    <a href={url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
      background: destaque ? COR : '#fff', color: destaque ? '#fff' : '#1A1A1A', borderRadius: 12, padding: '12px 14px',
      marginBottom: 7, border: destaque ? 'none' : '1px solid rgba(26,23,20,0.1)' }}>
      <span style={{ fontSize: 22 }}>📘</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, opacity: 0.75 }}>{m.modulos[0]}</span>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{m.titulo}</span>
      </span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>Abrir ›</span>
    </a>
  );
}
function LinhaComAnexo({ m, url, destaque }: { m: Manual; url: string; destaque?: boolean }) {
  return (
    <>
      <Linha m={m} url={url} destaque={destaque} />
      {m.anexo && (
        <a href={url.replace(`${m.ficheiro}.pdf`, `${m.anexo}.pdf`)} target="_blank" rel="noopener"
          style={{ display: 'block', margin: '-3px 0 8px 46px', fontSize: 13.5, fontWeight: 700, color: COR }}>
          📄 Anexo: fichas técnicas ›</a>
      )}
    </>
  );
}

function PorAno({ lista, coorte }: { lista: Manual[]; coorte: Coorte | 'UC' }) {
  return (
    <>
      {[1, 2, 3].map(ano => {
        const ms = lista.filter(m => m.ano === ano);
        if (!ms.length) return null;
        return (
          <div key={ano} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#777', margin: '10px 2px 6px' }}>{ano}.º ano</div>
            {ms.map(m => <LinhaComAnexo key={m.ficheiro} m={m} url={urlManual(m, coorte)} />)}
          </div>
        );
      })}
    </>
  );
}

/** Aluno: o manual da UC atual em cima, e todos os do curso. */
export function ManuaisDoAluno({ turmaId, ucAtual }: { turmaId: string; ucAtual?: string }) {
  const coorte = coorteDaTurma(turmaId);
  const atual = ucAtual ? manualDoModulo(ucAtual) : undefined;
  // O 1.º ano segue o referencial novo: os manuais são os das UC.
  const primeiroAno = anoDaTurma(turmaId) === 1;
  return (
    <div style={{ padding: 14, maxWidth: 620, margin: '0 auto' }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Manuais</div>
      {atual && (<>
        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#777', margin: '4px 2px 6px' }}>A tua UC agora</div>
        <LinhaComAnexo m={atual} url={urlManual(atual, ehManualUC(atual) ? 'UC' : coorte)} destaque />
      </>)}
      {primeiroAno ? <PorAno lista={MANUAIS_UC_1ANO} coorte="UC" /> : <PorAno lista={MANUAIS_UFCD} coorte={coorte} />}
    </div>
  );
}

/** Botão pequeno para abrir o manual da UC dentro da aula. */
export function BotaoManualDaUC({ turmaId, ucId }: { turmaId: string; ucId?: string }) {
  const m = ucId ? manualDoModulo(ucId) : undefined;
  if (!m) return null;
  return (
    <a href={urlManual(m, ehManualUC(m) ? 'UC' : coorteDaTurma(turmaId))} target="_blank" rel="noopener"
      style={{ display: 'block', textAlign: 'center', padding: '11px 14px', borderRadius: 12, background: '#fff',
        border: `1.5px solid ${COR}`, color: COR, fontWeight: 700, fontSize: 15, textDecoration: 'none', margin: '10px 0' }}>
      📘 Abrir o manual da UC
    </a>
  );
}

/** Professor: todos os manuais, por turma (versão) e por ano. */
export function ManuaisDoProfessor({ turmaId }: { turmaId?: string }) {
  const [coorte, setCoorte] = useState<Coorte | 'UC' | 'UC1'>(turmaId && anoDaTurma(turmaId) === 1 ? 'UC1' : turmaId ? coorteDaTurma(turmaId) : '2024-2027');
  const bt = (sel: boolean): React.CSSProperties => ({ padding: '8px 12px', borderRadius: 20, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', border: sel ? 'none' : '1px solid rgba(26,23,20,0.15)', background: sel ? COR : '#fff', color: sel ? '#fff' : '#333' });
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid rgba(26,23,20,0.08)' }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>📘 Manuais do Aluno (PDF)</div>
      <div style={{ fontSize: 13, color: '#777', margin: '3px 0 10px' }}>Escolhe a versão da turma. Os alunos veem a da sua turma, com a UC atual primeiro.</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {COORTES.map(c => <button key={c} style={bt(coorte === c)} onClick={() => setCoorte(c)}>
          {c}{c === '2023-2026' ? ' (recuperações)' : c === '2024-2027' ? ' (3.º ano)' : ' (2.º ano)'}</button>)}
        <button style={bt(coorte === 'UC1')} onClick={() => setCoorte('UC1')}>UC do 1.º ano (referencial novo)</button>
        <button style={bt(coorte === 'UC')} onClick={() => setCoorte('UC')}>UC do 3.º ano (referencial novo)</button>
      </div>
      <PorAno lista={coorte === 'UC1' ? MANUAIS_UC_1ANO : coorte === 'UC' ? MANUAIS_UC : MANUAIS_UFCD} coorte={coorte === 'UC1' ? 'UC' : coorte} />
    </div>
  );
}
