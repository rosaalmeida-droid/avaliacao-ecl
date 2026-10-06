// ============================================================
// Eventos agregados a esta aula
// ============================================================
// Um evento nas férias, antes do ano letivo ou fora do horário não é plano
// de aula: não entra na pauta nem dá faltas. Fica agregado à primeira aula
// da UC a seguir (Rosa, set/2026): aqui o professor vê quem já foi avaliado,
// o bónus de cada aluno, e abre o evento para validar o que falta.
// ============================================================
import React from 'react';
import type { PlanoAula } from '../types';
import {
  eventosAgregadosAAula, atividadeContaComoAula, aulaQueRecebeAtividade, modoParticipacao, notaDaAulaValidada, validacaoDaAula, participantesDoEvento, participacaoContaParaBonus, getAlunos, getSelecoes, getValidacoes,
} from '../backend';
import { BONUS_EVENTOS } from '../eventosAvaliacao';
import { posicaoNaUC } from '../rotuloPlano';

const fmt = (n: number) => n.toFixed(2).replace('.', ',').replace(/0$/, '').replace(/,$/, '');
const dataPT = (iso: string) => iso ? iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '';

export function EventosNaAula({ plano, onAbrirEvento }: { plano: PlanoAula; onAbrirEvento: (ev: PlanoAula) => void }) {
  const eventos = eventosAgregadosAAula(plano);
  if (!eventos.length) return null;
  const alunos = getAlunos();
  const selecoes = getSelecoes();
  const validacoes = getValidacoes();

  return (
    <>
      {eventos.map((ev: any) => {
        const concurso = ev.tipoEvento === 'concurso';
        // Obrigatória para a turma fora das horas da aula: conta como mais uma aula (Rosa, out/2026).
        const comoAula = atividadeContaComoAula(ev);
        const porAtividade = concurso ? BONUS_EVENTOS.porConcurso : BONUS_EVENTOS.porEvento;
        const atividade: any = { id: ev.id, turmaId: ev.turmaId, tipo: ev.tipoEvento, data: ev.data, titulo: ev.titulo };
        const linhas = participantesDoEvento(ev)
          .map(id => alunos.find(a => a.id === id))
          .filter((a): a is NonNullable<typeof a> => !!a && a.numero !== 99 && a.numero !== 88)
          .sort((a, b) => a.numero - b.numero)
          .map(a => {
            const validado = validacoes.some(v => v.alunoId === a.id && v.planoAulaId === ev.id);
            const respondeu = selecoes.some(s => s.alunoId === a.id && s.planoAulaId === ev.id);
            const r = validado ? participacaoContaParaBonus(atividade, a.id) : null;
            const bonus = r?.conta ? Math.round(porAtividade * r.fator * 100) / 100 : 0;
            const nota = comoAula && validado ? notaDaAulaValidada(validacaoDaAula(a.id, ev.id)) : null;
            return { a, validado, respondeu, r, bonus, nota };
          });
        const porValidar = linhas.filter(l => !l.validado && l.respondeu).length;
        const avaliados = linhas.filter(l => l.validado).length;
        return (
          <div key={ev.id} style={{ background: '#fff', border: '2px solid #6B3FA0', borderRadius: 14, padding: '14px 16px', margin: '0 0 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B3FA0' }}>
              {comoAula ? '📘 Atividade obrigatória — conta como mais uma aula' : <>{concurso ? '🏆 Concurso' : '🏅 Evento'} agregado a esta aula</>}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1A1A1A', marginTop: 4 }}>
              {ev.titulo || 'Evento'} · {dataPT(String(ev.data || ''))}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.7)', marginTop: 4, lineHeight: 1.5 }}>
              {comoAula
                ? <>A turma toda foi, fora das horas da aula. A avaliação conta como mais uma aula desta UC, na data desta aula, e entra na pauta. Não dá bónus nem faltas. Quem não se autoavaliou conta 0.</>
                : <>Não é plano de aula: não entra na pauta nem dá faltas. Dá um bónus até {fmt(porAtividade)} na nota da UC,
              proporcional à nota {concurso ? 'do concurso' : 'do evento'}, e as atitudes contam.</>}
              {' '}<b>{avaliados} de {linhas.length} avaliados</b>{porValidar ? <>, <b style={{ color: '#b5651d' }}>{porValidar} por validar</b></> : ''}.
            </div>
            <div style={{ marginTop: 10, borderTop: '1px solid rgba(26,23,20,0.08)' }}>
              {linhas.map(({ a, validado, respondeu, r, bonus, nota }) => (
                <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid rgba(26,23,20,0.06)', fontSize: 14 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{a.numero}. {a.nome}</span>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap',
                    color: comoAula && validado ? '#2F5D8A' : validado ? (r?.conta ? '#3E7A31' : '#8e2418') : respondeu ? '#b5651d' : 'rgba(26,23,20,0.45)' }}>
                    {comoAula && validado ? (nota === null ? 'validado' : `${fmt(nota)} valores`) : validado ? (r?.conta ? `+${fmt(bonus)}` : `sem bónus${r?.motivo ? ` · ${r.motivo}` : ''}`)
                      : respondeu ? 'por validar' : 'sem autoavaliação'}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => onAbrirEvento(ev)} style={{ marginTop: 12, minHeight: 46, width: '100%', borderRadius: 12, border: 'none',
              background: '#6B3FA0', color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {porValidar ? `Abrir o evento e validar (${porValidar})` : 'Abrir o evento'}
            </button>
          </div>
        );
      })}
    </>
  );
}

// ── A ligação da atividade à aula (Rosa, 6/out/2026) ──────────────
// «Não se percebe se a atividade de sábado está associada à aula seguinte.»
// Na própria atividade diz-se, preto no branco, como conta e a que aula fica
// ligada, com um botão para abrir essa aula.
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const diaComSemana = (iso: string) => {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? dataPT(iso) : `${DIAS_SEMANA[d.getDay()]}, ${dataPT(iso)}`;
};
export function LigacaoDaAtividade({ plano, onAbrirAula }: { plano: PlanoAula; onAbrirAula: (aula: PlanoAula) => void }) {
  const p: any = plano;
  if (!p?.tipoEvento) return null;
  const caixa = (cor: string, fundo: string, filhos: React.ReactNode) => (
    <div style={{ background: fundo, border: `2px solid ${cor}`, borderRadius: 14, padding: '14px 16px', margin: '0 0 14px', fontSize: 14.5, lineHeight: 1.55 }}>{filhos}</div>
  );
  if (!atividadeContaComoAula(p)) {
    return caixa('#6B3FA0', '#f6f1fb', <>
      <div style={{ fontWeight: 800, color: '#6B3FA0', fontSize: 15.5 }}>
        {p.tipoEvento === 'concurso' ? '🏆 Concurso: dá bónus' : modoParticipacao(p) === 'inscricao' ? '🏅 Atividade por convite: dá bónus' : '🏅 Atividade: dá bónus'}
      </div>
      <div>Não conta como aula nem dá faltas. Quem participa recebe bónus na nota da {p.ucId || 'UC'}.</div>
    </>);
  }
  const aula: any = aulaQueRecebeAtividade(p);
  const outraUC = aula && p.ucId && aula.ucId !== p.ucId;
  return caixa('#2F5D8A', '#eef3fa', <>
    <div style={{ fontWeight: 800, color: '#2F5D8A', fontSize: 15.5 }}>📘 Esta atividade conta como mais uma aula</div>
    <div style={{ marginTop: 4 }}>
      É obrigatória para a turma toda e é fora das horas da aula ({diaComSemana(p.data)}). Pela regra da escola, não dá bónus:
      a avaliação conta como mais uma aula, na aula desse dia ou na seguinte da mesma UC. Quem não se autoavaliar conta 0.
    </div>
    {aula ? (
      <div style={{ marginTop: 10, background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(47,93,138,0.25)' }}>
        <div><b>Fica associada à aula de {diaComSemana(aula.data)}</b> — {aula.ucId}{posicaoNaUC(aula) ? ` · Plano n.º ${posicaoNaUC(aula)}` : ''} · «{aula.titulo || 'Aula'}».</div>
        {outraUC && <div style={{ marginTop: 4, color: '#8a5a12' }}>A {p.ucId} já tinha acabado: fica na aula seguinte da mesma disciplina.</div>}
        <div style={{ marginTop: 4, color: 'rgba(26,23,20,0.65)' }}>
          A atividade tem nota própria: entra na {aula.ucId} e na pauta, na data dessa aula. Se o aluno faltar a essa aula, a atividade conta na mesma
          (e a aula conta como falta). Quem faltou à atividade tem 0 nela.
        </div>
        <button onClick={() => onAbrirAula(aula)} style={{ marginTop: 8, minHeight: 40, padding: '8px 14px', borderRadius: 10, border: 'none',
          background: '#2F5D8A', color: '#fff', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', fontFamily: 'inherit' }}>
          Abrir a aula de {dataPT(aula.data)} →
        </button>
      </div>
    ) : (
      <div style={{ marginTop: 10, background: '#fff8ef', borderRadius: 10, padding: '10px 12px', border: '1px solid #e0b070', color: '#8a5a12' }}>
        Ainda não há nenhuma aula da {p.ucId || 'UC'} depois de {dataPT(p.data)} no calendário. Fica associada automaticamente à primeira que criar.
      </div>
    )}
  </>);
}
