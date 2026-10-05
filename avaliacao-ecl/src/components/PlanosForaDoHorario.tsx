// ============================================================
// Planos com horas fora do horário da turma (Rosa, 5/out/2026)
// ============================================================
// Quando um horário muda (a 1º BCR à terça acaba às 15:30 e não às 17:30),
// os planos já feitos ficam com as horas antigas: contam horas a mais nas
// faltas e na numeração das horas. Aqui aparecem todos, com um botão para
// os pôr dentro do horário.
import React from 'react';
import { getPlanosAula, atualizarPlano } from '../backend';
import { blocosNoDia } from '../horarios';
import { janelaConfirmar } from './janelaConfirmar';

const hhmm = (h?: string) => {
  if (!h) return '';
  return h.includes('T') ? new Date(h).toTimeString().slice(0, 5) : h.slice(0, 5);
};

export function planosForaDoHorario(turmaId?: string) {
  return getPlanosAula()
    .filter(p => (!turmaId || p.turmaId === turmaId) && p.estado !== 'arquivado' && !(p as any).tipoEvento && !(p as any).eliminado)
    .map(p => {
      const dia = String(p.data || '').slice(0, 10);
      const blocos = blocosNoDia(p.turmaId, dia);
      if (blocos.length !== 1) return null;
      const b = blocos[0];
      const ini = hhmm(p.horaInicio), fim = hhmm(p.horaFim);
      if (!ini || !fim) return null;
      if (ini >= b.inicio && fim <= b.fim) return null;
      return { plano: p, ini, fim, novoIni: ini < b.inicio ? b.inicio : ini, novoFim: fim > b.fim ? b.fim : fim };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => String(a.plano.data).localeCompare(String(b.plano.data)));
}

export function PlanosForaDoHorario({ turmaId }: { turmaId?: string }) {
  const [aberta, setAberta] = React.useState(false);
  const [, refazer] = React.useState(0);
  const lista = planosForaDoHorario(turmaId);
  if (!lista.length) return null;
  const dataPT = (iso: string) => new Date(String(iso).slice(0, 10) + 'T00:00:00')
    .toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  const corrigir = (xs: typeof lista) => {
    xs.forEach(x => atualizarPlano(x.plano.id, { horaInicio: x.novoIni, horaFim: x.novoFim } as any));
    refazer(n => n + 1);
  };
  const corrigirTodos = async () => {
    if (!await janelaConfirmar({
      titulo: `Quer pôr os ${lista.length} planos dentro do horário da turma?`,
      texto: 'Muda só a hora de início ou de fim de cada plano. As fichas, as respostas dos alunos e as notas ficam como estão.',
      nao: 'Não, deixar como está', sim: 'Sim, corrigir as horas',
    })) return;
    corrigir(lista);
  };
  return (<>
    <button onClick={() => setAberta(true)}
      style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 16, padding: '14px 16px', borderRadius: 14,
        border: '2px solid #c0392b', background: '#fdf0ef', color: '#8e2418', cursor: 'pointer', fontFamily: 'inherit' }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>⚠️ Há {lista.length} plano{lista.length === 1 ? '' : 's'} com horas fora do horário da turma.</div>
      <div style={{ fontSize: 14, marginTop: 3 }}>Carregue aqui para ver quais são e corrigir as horas.</div>
    </button>
    {aberta && (
      <div onClick={() => setAberta(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
          style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '16px 18px 8px' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Planos com horas fora do horário da turma</div>
            <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', marginTop: 4, lineHeight: 1.45 }}>
              Estes planos têm horas que o horário da turma não tem. Contam horas a mais nas faltas e na numeração das horas da UC.
              Pode corrigir um de cada vez ou todos de uma vez.
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: '0 18px 8px' }}>
            {lista.map(x => (
              <div key={x.plano.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid rgba(26,23,20,0.08)' }}>
                <div style={{ flex: 1, fontSize: 14, lineHeight: 1.45 }}>
                  <b>{x.plano.turmaId}, {dataPT(x.plano.data)}</b>{x.plano.titulo ? ` (${x.plano.titulo})` : ''}.
                  <div style={{ color: 'rgba(26,23,20,0.7)' }}>Está das {x.ini} às {x.fim} e passa a ficar das {x.novoIni} às {x.novoFim}.</div>
                </div>
                <button onClick={() => corrigir([x])} style={{ fontSize: 13.5, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--sage)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}>Corrigir este</button>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 18px 16px', borderTop: '1px solid rgba(26,23,20,0.1)', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={() => setAberta(false)} style={{ fontSize: 15, padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(26,23,20,0.25)', background: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Fechar</button>
            <button onClick={corrigirTodos} style={{ fontSize: 15, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--copper)', color: '#fff', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit' }}>Corrigir todos ({lista.length})</button>
          </div>
        </div>
      </div>
    )}
  </>);
}
