// ============================================================
// PCC da ficha técnica → registo no KitchenFlow
// ============================================================
// O aluno vê o PCC na ficha e abre logo o registo certo no KitchenFlow,
// já com a sessão dele (Rosa, set/2026). Se alguém do grupo já fez esse
// registo hoje para este prato, não se regista outra vez: diz quem foi.
import React, { useState } from 'react';
import type { Aluno, PlanoAula } from '../types';
import { abrirKitchenFlow, grupoDoAluno } from '../backend';
import { pccNoKF, registoPCCjaFeito } from './RegistosKFaoVivo';

export function BotaoPCC({ texto, prato, aluno, plano, forcar }: {
  texto: string; prato: string; aluno: Aluno; plano: PlanoAula;
  /** Registo pedido diretamente (ex.: a amostra testemunho no fim da ficha). */
  forcar?: 'testemunho';
}) {
  const pcc = pccNoKF(forcar || texto);
  const [estado, setEstado] = useState<'livre' | 'a_ver' | { nome: string; hora: string }>('livre');
  if (!pcc) return null;
  const hoje = new Date().toISOString().slice(0, 10);

  async function registar() {
    setEstado('a_ver');
    const g = grupoDoAluno(plano.id, aluno.id);
    const ids = g ? g.membros.map(m => m.alunoId) : [aluno.id];
    const feito = await registoPCCjaFeito(pcc!.tabela, aluno.turmaId, hoje, prato, ids).catch(() => null);
    if (feito) { setEstado(feito); return; }
    setEstado('livre');
    abrirKitchenFlow(pcc!.modulo, {
      turma: aluno.turmaId, numero: aluno.numero, pin: aluno.pin, tipo: 'aluno',
      ucId: plano.ucId, pratos: [prato], planoData: plano.data,
      planoHoraInicio: plano.horaInicio, planoHoraFim: plano.horaFim,
    });
  }

  if (typeof estado === 'object') return (
    <div style={{ marginTop: 6, padding: '8px 11px', borderRadius: 9, background: '#eef4eb', color: '#3f5e34', fontSize: 13.5, fontWeight: 600 }}>
      ✓ Já registado por {estado.nome.split(' ')[0]} às {estado.hora}. Não é preciso registar outra vez.
    </div>
  );
  return (
    <button onClick={e => { e.preventDefault(); e.stopPropagation(); registar(); }} disabled={estado === 'a_ver'}
      style={{ marginTop: 6, padding: '8px 12px', borderRadius: 9, border: '1.5px solid #c0392b', background: '#fff',
        color: '#c0392b', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
      {estado === 'a_ver' ? 'A ver se o grupo já registou…' : `Registar no KitchenFlow — ${pcc.nome}`}
    </button>
  );
}
