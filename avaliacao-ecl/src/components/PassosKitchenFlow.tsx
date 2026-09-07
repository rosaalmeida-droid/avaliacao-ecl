// ============================================================
// KitchenFlow por fase, e checklist da ficha técnica.
//
// Especificação: o KitchenFlow inicial e final fazem parte da sequência
// da aula — não um atalho geral. Guardam-se por campo, não por um
// clique de "concluir". A checklist da ficha guarda cada passo de
// imediato: abrir o guião a meio não pode perder o que já foi marcado.
// ============================================================

import React, { useState } from 'react';
import { CampoKF, PassoChecklistFicha, camposKFIniciais, camposKFFinais } from '../types';
import {
  getRegistoKFFase, guardarKFFase,
  getChecklistFicha, marcarPassoChecklist,
} from '../backend';

const V = '#6B3FA0', VS = '#F0EBF7';

const icoCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
);

// ── KitchenFlow por fase ──────────────────────────────────────

export function PassoKitchenFlowFase({
  alunoId, planoAulaId, fase, onConcluido,
}: {
  alunoId: string; planoAulaId: string; fase: 'inicial' | 'final';
  onConcluido: () => void;
}) {
  const [campos, setCampos] = useState<CampoKF[]>(() => {
    const existente = getRegistoKFFase(alunoId, planoAulaId, fase);
    return existente?.campos ?? (fase === 'inicial' ? camposKFIniciais() : camposKFFinais());
  });

  function alternar(id: string) {
    const novos = campos.map(c => c.id === id ? { ...c, feito: !c.feito } : c);
    setCampos(novos);
    guardarKFFase({ alunoId, planoAulaId, fase, campos: novos });
  }

  const obrigatorios = campos.filter(c => c.obrigatorio);
  const faltam = obrigatorios.filter(c => !c.feito).length;
  const pronto = faltam === 0;

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 18,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: '#1A1A1A' }}>
        {fase === 'inicial' ? 'Antes de produzir' : 'Antes de fechar a produção'}
      </div>
      <div style={{ fontSize: 14.5, color: '#777', marginTop: 4, marginBottom: 16, lineHeight: 1.55 }}>
        {fase === 'inicial'
          ? 'Conclui os registos iniciais obrigatórios desta aula.'
          : 'A checklist terminou. Faltam os registos finais obrigatórios.'}
      </div>

      {campos.map(c => (
        <button key={c.id} onClick={() => alternar(c.id)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 0', borderBottom: '1px solid #EEE',
          background: 'transparent', border: 'none', borderBottomWidth: 1,
          borderBottomStyle: 'solid', borderBottomColor: '#EEE',
          textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            border: `2px solid ${c.feito ? V : '#DDD'}`,
            background: c.feito ? V : 'transparent', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {c.feito && icoCheck()}
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, color: '#1A1A1A' }}>
              {c.label}
            </span>
            <span style={{ display: 'block', fontSize: 13, color: c.obrigatorio ? '#777' : '#AAA' }}>
              {c.feito ? 'Concluído' : c.obrigatorio ? 'Por registar' : 'Opcional'}
            </span>
          </span>
        </button>
      ))}

      {!pronto && (
        <div style={{ background: '#FDF0E8', border: '1px solid #B5651D', borderRadius: 12,
          padding: 14, marginTop: 16, fontSize: 14.5, color: '#8A4E15', lineHeight: 1.55 }}>
          <b>Falta{faltam > 1 ? 'm' : ''} {faltam} registo{faltam > 1 ? 's' : ''} obrigatório{faltam > 1 ? 's' : ''}.</b>{' '}
          {fase === 'inicial'
            ? 'A produção ainda não pode ser iniciada.'
            : 'Faltam antes da autoavaliação.'}
        </div>
      )}

      <button onClick={onConcluido} disabled={!pronto} style={{
        width: '100%', marginTop: 16, minHeight: 52, borderRadius: 12, border: 'none',
        background: pronto ? V : '#DDD', color: '#fff', fontSize: 17, fontWeight: 600,
        cursor: pronto ? 'pointer' : 'default', fontFamily: 'inherit',
      }}>
        {fase === 'inicial' ? 'Concluir registos' : 'Concluir KitchenFlow'}
      </button>
    </div>
  );
}

// ── Checklist da ficha técnica ────────────────────────────────
// Persistente: guarda cada passo assim que é marcado. Abrir o guião
// e voltar não reinicia nada.

export function ChecklistFicha({
  alunoId, planoAulaId, fichaId, passosDefinidos, onTodosFeitos, onAbrirGuiao,
}: {
  alunoId: string; planoAulaId: string; fichaId: string;
  /** Os passos que a ficha define — nome, não estado. */
  passosDefinidos: { id: string; label: string }[];
  onTodosFeitos?: (feitos: boolean) => void;
  onAbrirGuiao?: () => void;
}) {
  const [feitos, setFeitos] = useState<Set<string>>(() => {
    const existente = getChecklistFicha(alunoId, planoAulaId, fichaId);
    return new Set((existente?.passos ?? []).filter(p => p.feito).map(p => p.id));
  });

  function alternar(id: string) {
    const feito = !feitos.has(id);
    const novo = new Set(feitos);
    feito ? novo.add(id) : novo.delete(id);
    setFeitos(novo);
    marcarPassoChecklist(alunoId, planoAulaId, fichaId, id, feito);
    onTodosFeitos?.(novo.size === passosDefinidos.length);
  }

  return (
    <div>
      {passosDefinidos.map(p => {
        const feito = feitos.has(p.id);
        return (
          <button key={p.id} onClick={() => alternar(p.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 0', background: 'transparent', border: 'none',
            borderBottom: '1px solid #EEE', textAlign: 'left', cursor: 'pointer',
            fontFamily: 'inherit', minHeight: 44,
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              border: `2px solid ${feito ? '#3E7A31' : '#DDD'}`,
              background: feito ? '#3E7A31' : 'transparent', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {feito && icoCheck()}
            </span>
            <span style={{ flex: 1, fontSize: 15.5, fontWeight: feito ? 400 : 600,
              color: feito ? '#777' : '#1A1A1A',
              textDecoration: feito ? 'line-through' : 'none' }}>
              {p.label}
            </span>
          </button>
        );
      })}

      {onAbrirGuiao && (
        <button onClick={onAbrirGuiao} style={{
          width: '100%', marginTop: 14, background: VS, border: 'none',
          borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700,
          color: V, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
        }}>
          Guião
        </button>
      )}
    </div>
  );
}

// ── Fecho da aula ─────────────────────────────────────────────
// Ecrã 11: o aluno termina sabendo o estado da aula e como contribui
// para a UC. Distingue sempre autoavaliação, nota da aula e nota da UC.

export function FechoAula({
  notaAula, aValidar, notaProgressivaUC, onIrPercurso, onVoltarInicio,
}: {
  notaAula: number | null;
  aValidar: boolean;
  notaProgressivaUC: number | null;
  onIrPercurso: () => void;
  onVoltarInicio: () => void;
}) {
  const fmt = (n: number) => n.toFixed(1).replace('.', ',');

  return (
    <div style={{ background: '#F3F2F5', minHeight: '100%', padding: 14 }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E8F3E5',
            margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3E7A31"
              strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A' }}>
            Trabalho entregue!
          </div>
          <div style={{ fontSize: 14.5, color: '#777', marginTop: 4 }}>
            Autoavaliação submetida
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 18,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: '#777', marginBottom: 8 }}>
            Resultado desta aula
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: '#1A1A1A' }}>
              {notaAula != null ? fmt(notaAula) : '—'}
            </span>
            <span style={{ fontSize: 15, color: '#777' }}>valores</span>
          </div>
          {/* Nunca mostrar como definitiva antes da validação docente. */}
          <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 10px',
            borderRadius: 20, background: aValidar ? '#FDF0E8' : '#E8F3E5',
            color: aValidar ? '#B5651D' : '#3E7A31', fontSize: 13, fontWeight: 700 }}>
            {aValidar ? 'A validar pelo professor' : 'Validada'}
          </div>
        </div>

        <div style={{ background: V, borderRadius: 16, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: '#DCCFF0', marginBottom: 8 }}>
            Progressão na UC
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: '#fff' }}>
              {notaProgressivaUC != null ? fmt(notaProgressivaUC) : '—'}
            </span>
            <span style={{ fontSize: 15, color: '#DCCFF0' }}>valores</span>
          </div>
        </div>

        <button onClick={onIrPercurso} style={{
          width: '100%', minHeight: 52, background: '#fff', border: `2px solid ${V}`,
          borderRadius: 12, color: V, fontSize: 16.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
        }}>
          Meu percurso
        </button>
        <button onClick={onVoltarInicio} style={{
          width: '100%', minHeight: 48, background: 'transparent', border: 'none',
          color: '#777', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
