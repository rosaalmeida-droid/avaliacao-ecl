// ============================================================
// Corrigir um plano já criado.
//
// Depois de criado, o plano não deixava mudar nada — nem a data, nem as
// horas, nem a unidade, nem o tipo de aula. Um engano, ou uma aula que
// muda à última hora por causa de um evento, obrigava a eliminar e
// criar de novo — e, se os alunos já se tinham avaliado, perdia-se tudo.
//
// Aqui corrige-se tudo, a qualquer momento. As avaliações ficam; se a
// unidade mudar, passam a contar para a nova. As fichas mudam-se no
// "Preparar" do plano (Tirar / Ir buscar à biblioteca).
// ============================================================

import React, { useState } from 'react';
import type { PlanoAula } from '../types';
import { atualizarPlano, resumoDoPlano } from '../backend';
import { modulosDaTurma } from '../cronograma';
import { DialogoEliminarPlano } from './DialogoEliminarPlano';

const hhmm = (h?: string) => {
  if (!h) return '';
  if (h.includes('T')) { const d = new Date(h); return isNaN(d.getTime()) ? '' : d.toTimeString().slice(0, 5); }
  return h.slice(0, 5);
};

const TIPOS = [
  { v: 'pratico', label: '🔪 Prática' },
  { v: 'misto', label: '📚+🔪 Mista' },
  { v: 'teorico', label: '📚 Teórica' },
  { v: 'atitudinal', label: '🤝 Atitudinal' },
] as const;

export function EditarPlano({ plano, onGuardado, onCancelar, onEliminado }: {
  plano: PlanoAula;
  onGuardado: (p: PlanoAula) => void;
  onCancelar: () => void;
  /** O plano foi eliminado ou arquivado — fechar. */
  onEliminado: () => void;
}) {
  const [data, setData] = useState(String(plano.data || '').slice(0, 10));
  const [horaInicio, setHoraInicio] = useState(hhmm(plano.horaInicio));
  const [horaFim, setHoraFim] = useState(hhmm(plano.horaFim));
  const [tipo, setTipo] = useState<string>((plano as any).tipoPlanAula || 'pratico');
  const [ucId, setUcId] = useState(plano.ucId || '');
  const [titulo, setTitulo] = useState(plano.titulo || '');
  const [contaAssiduidade, setContaAssiduidade] = useState(
    (plano as any).contaAssiduidade !== false);
  const [aEliminar, setAEliminar] = useState(false);

  const modulos = modulosDaTurma(plano.turmaId);
  const disciplinas = [...new Set(modulos.map((m: any) => m.disciplina || 'Outras'))];
  const resumo = resumoDoPlano(plano.id);

  const mudouUC = ucId !== (plano.ucId || '');
  const mudouData = data !== String(plano.data || '').slice(0, 10);
  const mudouTipo = tipo !== ((plano as any).tipoPlanAula || 'pratico');

  function guardar() {
    if (resumo.temAvaliacoes && (mudouUC || mudouData || mudouTipo)) {
      const o: string[] = [];
      if (mudouUC) o.push(`passam a contar para a unidade ${ucId}`);
      if (mudouData) o.push(`ficam com a data ${data}`);
      if (mudouTipo) o.push('a nota da aula passa a ser calculada com os pesos do novo tipo de aula');
      if (!confirm(
        'Esta aula já tem avaliações dos alunos. Ficam todas, mas ' + o.join('; ') + '.\n\nGuardar a correção?'
      )) return;
    }
    const m: any = modulos.find((x: any) => x.id === ucId);
    const novo = atualizarPlano(plano.id, {
      data, horaInicio, horaFim, titulo: titulo.trim() || plano.titulo,
      ucId, ...(m ? { ucNome: m.nome } : {}),
      tipoPlanAula: tipo, contaAssiduidade,
    } as any);
    if (novo) onGuardado(novo);
  }

  const campo: React.CSSProperties = {
    width: '100%', padding: '11px 12px', borderRadius: 10, fontSize: 15,
    border: '1px solid rgba(26,23,20,0.2)', fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const rotulo: React.CSSProperties = {
    fontSize: 12.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
    color: 'rgba(26,23,20,0.55)', margin: '14px 0 6px',
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid rgba(26,23,20,0.1)' }}>
      <div style={{ fontSize: 17, fontWeight: 800 }}>Editar o plano</div>
      <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.6)', marginTop: 3, lineHeight: 1.5 }}>
        Podes corrigir tudo, mesmo depois de a aula ter sido aberta. As avaliações ficam.
        As fichas mudam-se no Preparar.
      </div>

      {resumo.temAvaliacoes && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#fdf0e6',
          border: '1px solid #b5651d', fontSize: 13.5, color: '#78350f', lineHeight: 1.5 }}>
          Esta aula já tem trabalho dos alunos — {resumo.autoavaliacoes} autoavaliações,
          {' '}{resumo.validacoes} validações, {resumo.presencas} entradas. Corrigir não apaga nada.
        </div>
      )}

      <div style={rotulo}>Data</div>
      <input type="date" value={data} onChange={e => setData(e.target.value)} style={campo} />

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={rotulo}>Início</div>
          <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} style={campo} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={rotulo}>Fim</div>
          <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} style={campo} />
        </div>
      </div>

      <div style={rotulo}>Tipo de aula</div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {TIPOS.map(t => (
          <button key={t.v} onClick={() => setTipo(t.v)} style={{
            flex: '1 1 110px', padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: tipo === t.v ? 700 : 500,
            border: `2px solid ${tipo === t.v ? '#b5651d' : 'rgba(26,23,20,0.15)'}`,
            background: tipo === t.v ? '#fdf0e6' : '#fff', color: tipo === t.v ? '#b5651d' : 'rgba(26,23,20,0.6)',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={rotulo}>Unidade</div>
      <select value={ucId} onChange={e => setUcId(e.target.value)} style={campo}>
        {!modulos.some((m: any) => m.id === ucId) && ucId && <option value={ucId}>{ucId}</option>}
        {disciplinas.map(d => (
          <optgroup key={d} label={d}>
            {modulos.filter((m: any) => (m.disciplina || 'Outras') === d).map((m: any) => (
              <option key={m.id} value={m.id}>{m.id} — {m.nome}</option>
            ))}
          </optgroup>
        ))}
      </select>

      <div style={rotulo}>Faltas e atrasos</div>
      <button onClick={() => setContaAssiduidade(!contaAssiduidade)} style={{
        width: '100%', padding: '12px 14px', borderRadius: 10, textAlign: 'left',
        border: `1.5px solid ${contaAssiduidade ? '#5a7a4e' : '#b5651d'}`,
        background: contaAssiduidade ? '#eef4eb' : '#fdf0e6',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
      }}>
        <b>{contaAssiduidade ? 'Contam nesta aula' : 'Não contam nesta aula'}</b>
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)', marginTop: 2, lineHeight: 1.45 }}>
          {contaAssiduidade
            ? 'Como numa aula normal. Toca para deixar de contar.'
            : 'Para aulas criadas depois de acontecerem. Os alunos avaliam-se, mas as faltas e os atrasos não entram no bónus nem na recuperação.'}
        </div>
      </button>

      <div style={rotulo}>Título</div>
      <input value={titulo} onChange={e => setTitulo(e.target.value)} style={campo} />

      <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        <button onClick={onCancelar} style={{
          flex: '1 1 120px', padding: 13, borderRadius: 10, border: '1px solid rgba(26,23,20,0.18)',
          background: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>Cancelar</button>
        <button onClick={guardar} style={{
          flex: '2 1 160px', padding: 13, borderRadius: 10, border: 'none', background: '#5a7a4e',
          color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>Guardar a correção</button>
      </div>

      <button onClick={() => setAEliminar(true)} style={{
        width: '100%', marginTop: 16, padding: 11, borderRadius: 10, border: 'none',
        background: 'transparent', color: '#c0392b', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
      }}>Eliminar este plano</button>

      {aEliminar && (
        <DialogoEliminarPlano plano={plano}
          onFechar={() => setAEliminar(false)}
          onCorrigir={() => setAEliminar(false)}
          onFeito={() => { setAEliminar(false); onEliminado(); }} />
      )}
    </div>
  );
}

export default EditarPlano;
