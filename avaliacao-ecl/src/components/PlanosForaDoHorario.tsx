// ============================================================
// Planos com horas fora do horário da turma (Rosa, 5/out/2026)
// ============================================================
// Quando um horário muda (a 1º BCR à terça acaba às 15:30 e não às 17:30),
// os planos já feitos ficam com as horas antigas: contam horas a mais nas
// faltas e na numeração das horas. Aqui aparecem todos, com um botão para
// os pôr dentro do horário.
import React from 'react';
import { getPlanosAula, atualizarPlano, horasDoPlano, arquivarPlanoAula, getSelecoes } from '../backend';
import { horasDoPlanoNaUC } from '../rotuloPlano';
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
      // O professor disse que estas horas estão certas (acerto com outro
      // professor, por exemplo): não se volta a avisar, enquanto não mudarem.
      if ((p as any).horasForaDoHorarioOk === ini + '-' + fim) return null;
      // A proposta é o horário da turma nesse dia, por inteiro (antes cortava
      // e dava «das 09:45 às 09:30» — Rosa, 5/out/2026).
      return { plano: p, ini, fim, novoIni: b.inicio, novoFim: b.fim };
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
  const estaCerto = (x: (typeof lista)[number]) => {
    atualizarPlano(x.plano.id, { horasForaDoHorarioOk: x.ini + '-' + x.fim } as any);
    refazer(n => n + 1);
  };
  const porHorario = async (x: (typeof lista)[number]) => {
    if (!await janelaConfirmar({
      titulo: `Quer pôr esta aula das ${x.novoIni} às ${x.novoFim}?`,
      texto: `Muda só as horas da aula. As fichas, as respostas dos alunos e as notas ficam como estão.`,
      nao: 'Não, deixar como está', sim: `Sim, pôr das ${x.novoIni} às ${x.novoFim}`,
    })) return;
    atualizarPlano(x.plano.id, { horaInicio: x.novoIni, horaFim: x.novoFim } as any);
    refazer(n => n + 1);
  };
  return (<>
    <button onClick={() => setAberta(true)}
      style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 16, padding: '14px 16px', borderRadius: 14,
        border: '2px solid #c0392b', background: '#fdf0ef', color: '#8e2418', cursor: 'pointer', fontFamily: 'inherit' }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>⚠️ {lista.length === 1 ? 'Há 1 plano' : `Há ${lista.length} planos`} com horas diferentes do horário da turma.</div>
      <div style={{ fontSize: 14, marginTop: 3 }}>Pode ter sido intencional. Carregue aqui para confirmar.</div>
    </button>
    {aberta && (
      <div onClick={() => setAberta(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
          style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '16px 18px 8px' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Planos com horas diferentes do horário da turma</div>
            <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', marginTop: 4, lineHeight: 1.45 }}>
              Mudar as horas de uma aula pode estar certo (por exemplo, por acerto com outro professor). Veja cada aula:
              se foi intencional, carregue em «Está certo, foi intencional» e o aviso não volta a aparecer. Se foi engano, ponha as horas do horário.
              As horas contam nas faltas e na numeração das horas da UC.
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: '0 18px 8px' }}>
            {lista.map(x => (
              <div key={x.plano.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '9px 0', borderTop: '1px solid rgba(26,23,20,0.08)' }}>
                <div style={{ flex: '1 1 260px', fontSize: 14, lineHeight: 1.45 }}>
                  <b>{x.plano.turmaId}, {dataPT(x.plano.data)}</b>{x.plano.titulo ? ` (${x.plano.titulo})` : ''}.
                  <div style={{ color: 'rgba(26,23,20,0.75)' }}>A aula está marcada das {x.ini} às {x.fim}. No horário da turma, nesse dia, a aula é das {x.novoIni} às {x.novoFim}.</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => estaCerto(x)} style={{ fontSize: 13.5, padding: '7px 12px', borderRadius: 8, border: 'none', background: 'var(--sage)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Está certo, foi intencional</button>
                  <button onClick={() => porHorario(x)} style={{ fontSize: 13.5, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--copper)', background: '#fff', color: 'var(--copper)', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Foi engano: pôr das {x.novoIni} às {x.novoFim}</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 18px 16px', borderTop: '1px solid rgba(26,23,20,0.1)', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={() => setAberta(false)} style={{ fontSize: 15, padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(26,23,20,0.25)', background: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Fechar</button>
          </div>
        </div>
      </div>
    )}
  </>);
}

// ============================================================
// Planos a mais numa UC (Rosa, 5/out/2026)
// ============================================================
// Quando os planos de uma UC somam mais horas do que a UC tem (13 planos
// numa UC de 25 horas), há planos repetidos ou de teste. Aqui aparecem todos,
// com as horas e as respostas dos alunos, e um botão para arquivar (não
// conta, mas não se apaga: pode voltar-se atrás).
export function ucsComPlanosAMais(turmaId?: string) {
  const grupos = new Map<string, any[]>();
  getPlanosAula()
    .filter(p => (!turmaId || p.turmaId === turmaId) && p.ucId && p.estado !== 'arquivado' && !(p as any).tipoEvento && !(p as any).eliminado)
    .forEach(p => { const k = p.turmaId + '|' + p.ucId; grupos.set(k, [...(grupos.get(k) || []), p]); });
  const out: { turmaId: string; ucId: string; total: number; soma: number; planos: any[] }[] = [];
  grupos.forEach(planos => {
    const hs = horasDoPlanoNaUC(planos[0]);
    if (!hs) return;
    const soma = planos.reduce((s, p) => s + horasDoPlano(p), 0);
    if (soma <= hs.total) return;
    out.push({ turmaId: planos[0].turmaId, ucId: planos[0].ucId, total: hs.total, soma,
      planos: planos.slice().sort((a, b) => String(a.data || '').localeCompare(String(b.data || ''))) });
  });
  return out;
}

export function PlanosAMaisNaUC({ turmaId }: { turmaId?: string }) {
  const [aberta, setAberta] = React.useState<string | null>(null);
  const [, refazer] = React.useState(0);
  const lista = ucsComPlanosAMais(turmaId);
  if (!lista.length) return null;
  const hora = (h?: string) => String(h || '').slice(0, 5);
  const dataPT = (iso: string) => new Date(String(iso).slice(0, 10) + 'T00:00:00')
    .toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
  const arquivar = async (p: any) => {
    const responderam = new Set(getSelecoes().filter(s => s.planoAulaId === p.id).map(s => s.alunoId)).size;
    if (!await janelaConfirmar({
      titulo: `Quer arquivar a aula de ${dataPT(p.data)}?`,
      texto: 'A aula arquivada deixa de contar nas horas, nas faltas e nas notas. Não se apaga: pode voltar a ela na lista dos planos.'
        + (responderam ? `\n\nAtenção: ${responderam} aluno${responderam === 1 ? ' já respondeu' : 's já responderam'} a esta aula.` : ''),
      nao: 'Não, deixar como está', sim: 'Sim, arquivar esta aula', perigo: true,
    })) return;
    arquivarPlanoAula(p.id);
    refazer(n => n + 1);
  };
  const g = lista.find(x => x.turmaId + '|' + x.ucId === aberta);
  return (<>
    {lista.map(x => (
      <button key={x.turmaId + x.ucId} onClick={() => setAberta(x.turmaId + '|' + x.ucId)}
        style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 16, padding: '14px 16px', borderRadius: 14,
          border: '2px solid #b5651d', background: '#fff7e6', color: '#7a4310', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>⚠️ A {x.ucId} do {x.turmaId} tem {x.planos.length} planos com {fmt(x.soma)} horas, mas a UC só tem {fmt(x.total)} horas.</div>
        <div style={{ fontSize: 14, marginTop: 3 }}>Pode haver planos repetidos ou de teste. Carregue aqui para ver a lista.</div>
      </button>
    ))}
    {g && (
      <div onClick={() => setAberta(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
          style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '16px 18px 8px' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Os planos da {g.ucId} do {g.turmaId}</div>
            <div style={{ fontSize: 13.5, color: 'rgba(26,23,20,0.65)', marginTop: 4, lineHeight: 1.45 }}>
              Os {g.planos.length} planos somam {fmt(g.soma)} horas, mas a UC tem {fmt(g.total)} horas. Veja se há aulas repetidas (no mesmo dia) ou de teste.
              Uma aula arquivada deixa de contar, mas não se apaga.
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: '0 18px 8px' }}>
            {g.planos.map((p: any) => {
              const mesmoDia = g.planos.filter((q: any) => String(q.data).slice(0, 10) === String(p.data).slice(0, 10)).length > 1;
              const responderam = new Set(getSelecoes().filter(s => s.planoAulaId === p.id).map(s => s.alunoId)).size;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '9px 0', borderTop: '1px solid rgba(26,23,20,0.08)' }}>
                  <div style={{ flex: '1 1 300px', fontSize: 14, lineHeight: 1.45 }}>
                    <b>{dataPT(p.data)}</b>, das {hora(p.horaInicio)} às {hora(p.horaFim)} ({fmt(horasDoPlano(p))} h){p.titulo ? `: ${p.titulo}` : ''}.
                    <div style={{ color: 'rgba(26,23,20,0.7)' }}>
                      {p.estado === 'rascunho' ? 'Ainda é um rascunho.' : 'Está publicada.'}{' '}
                      {responderam ? `${responderam} aluno${responderam === 1 ? ' respondeu' : 's responderam'}.` : 'Nenhum aluno respondeu.'}
                      {mesmoDia && <b style={{ color: '#a23a2e' }}> Há outra aula no mesmo dia.</b>}
                    </div>
                  </div>
                  <button onClick={() => arquivar(p)} style={{ fontSize: 13.5, padding: '7px 12px', borderRadius: 8, border: '1px solid #a23a2e', background: '#fff', color: '#a23a2e', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Arquivar esta aula</button>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '12px 18px 16px', borderTop: '1px solid rgba(26,23,20,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setAberta(null)} style={{ fontSize: 15, padding: '10px 22px', borderRadius: 10, border: 'none', background: 'var(--copper)', color: '#fff', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit' }}>Fechar</button>
          </div>
        </div>
      </div>
    )}
  </>);
}
