// ============================================================
// Avisar a turma no WhatsApp (Rosa, 5/out/2026)
// ============================================================
// Abre o WhatsApp com a mensagem já escrita: o professor escolhe o grupo da
// turma e envia. Aparece quando a aula abre (do dia, ou antiga para os alunos
// se autoavaliarem) e quando uma atividade extra ou um concurso está aberto
// a inscrições.
// ============================================================
import React from 'react';
import type { PlanoAula } from '../types';
import { aberturaTardia, eventoForaDoHorario } from '../backend';

export const ENDERECO_APLICACAO = 'https://avaliacao-ecl.vercel.app';

const diaMes = (iso: string) => `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}`;
const dataPT = (iso: string) => new Date(String(iso).slice(0, 10) + 'T12:00:00')
  .toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

/** A mensagem de quando a aula (ou a atividade) abre aos alunos. */
export function mensagemAberturaAula(plano: PlanoAula): string {
  const p: any = plano;
  const titulo = p.titulo || 'Aula';
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  const passou = String(p.data || '').slice(0, 10) < hoje || aberturaTardia(p.id);
  if (eventoForaDoHorario(p)) {
    return passou
      ? `Olá! Já podem fazer a autoavaliação da atividade «${titulo}» (${diaMes(p.data)}). Abram a aplicação Avaliação ECL (${ENDERECO_APLICACAO}): aparece logo no Início e leva 2 minutos. Obrigada!`
      : `Olá! A atividade «${titulo}» já está aberta na aplicação Avaliação ECL (${ENDERECO_APLICACAO}). Entrem e marquem presença. Obrigada!`;
  }
  return passou
    ? `Olá, ${p.turmaId}! Já podem fazer a autoavaliação da aula «${titulo}» (${diaMes(p.data)}). Abram a aplicação Avaliação ECL (${ENDERECO_APLICACAO}): aparece logo no Início e leva 2 minutos. Enquanto não se autoavaliarem, esta aula conta 0 na nota da UC. Obrigada!`
    : `Olá, ${p.turmaId}! A aula «${titulo}» já está aberta. Entrem na aplicação Avaliação ECL (${ENDERECO_APLICACAO}) e marquem presença: têm 10 minutos. Obrigada!`;
}

/** A mensagem de uma atividade extra ou de um concurso aberto a inscrições. */
export function mensagemInscricoes(plano: PlanoAula, aviso = ''): string {
  const p: any = plano;
  const oQue = p.tipoEvento === 'concurso' ? 'o concurso' : 'a atividade';
  return `Olá! Estão abertas as inscrições para ${oQue} «${p.titulo || 'Atividade'}», ${dataPT(p.data)}. `
    + ((aviso || p.avisoDeslocacao) ? `${aviso || p.avisoDeslocacao} ` : '')
    + `Inscrevam-se na aplicação Avaliação ECL (${ENDERECO_APLICACAO}), em «Atividades e concursos». Obrigada!`;
}

export function BotaoWhatsApp({ texto, rotulo = 'Avisar a turma no WhatsApp', estilo }: { texto: string; rotulo?: string; estilo?: React.CSSProperties }) {
  return (
    <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, padding: '8px 14px', borderRadius: 10,
        background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit', ...estilo }}>
      {rotulo}
    </a>
  );
}
