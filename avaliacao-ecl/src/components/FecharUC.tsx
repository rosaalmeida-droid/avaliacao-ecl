// ============================================================
// Fechar a unidade — pauta de avaliação
//
// Quando o módulo acaba, o professor tem de fechar a avaliação e mandar
// a pauta para a direção. Ficava à espera de se lembrar, e depois tinha
// de refazer as contas à mão.
//
// Aqui vê a pauta como ela fica, com as notas já calculadas, e manda-a
// para o email dele. A pauta fica também numa folha própria do ficheiro
// de dados — para imprimir ou reenviar.
// ============================================================

import React, { useState } from 'react';
import {
  pautaDaUC, enviarPautaPorEmail, marcarUCFechada,
  emailDoProfessor, guardarEmailDoProfessor,
} from '../backend';

export function FecharUC({ turmaId, ucId, ucNome, nomeProfessor, onFechado, onCancelar }: {
  turmaId: string;
  ucId: string;
  ucNome?: string;
  nomeProfessor?: string;
  onFechado: () => void;
  onCancelar: () => void;
}) {
  const linhas = pautaDaUC(turmaId, ucId);
  const [email, setEmail] = useState(emailDoProfessor());
  const [aEnviar, setAEnviar] = useState(false);

  const comNota = linhas.filter(l => l.final !== null);
  const negativas = comNota.filter(l => (l.final ?? 0) < 10).length;
  const emRecuperacao = linhas.filter(l => l.recuperacao).length;
  const semNota = linhas.length - comNota.length;

  const n = (x: number | null) => x === null ? '—' : String(Math.round(x * 10) / 10).replace('.', ',');

  async function enviar() {
    if (!email.includes('@')) { alert('Escreve o teu email.'); return; }
    guardarEmailDoProfessor(email);
    setAEnviar(true);
    const r = await enviarPautaPorEmail(turmaId, ucId, email, nomeProfessor || '');
    setAEnviar(false);
    if (!r.ok) { alert('Não consegui enviar a pauta.\n\n' + (r.erro || '')); return; }
    marcarUCFechada(turmaId, ucId);
    alert(`Pauta enviada para ${email}.\n\nFicou também no ficheiro de dados, numa folha própria.`);
    onFechado();
  }

  return (
    <div onClick={onCancelar} style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(26,23,20,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 720,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Fechar {ucId}</div>
        <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
          {ucNome} · {turmaId}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>
          {[
            [`${comNota.length} com nota`, '#eef4eb'],
            [`${negativas} negativas`, negativas ? '#fdf0ef' : '#f7f5f2'],
            [`${emRecuperacao} em recuperação`, emRecuperacao ? '#fdf0e6' : '#f7f5f2'],
            [`${semNota} por avaliar`, semNota ? '#fdf0e6' : '#f7f5f2'],
          ].map(([txt, cor]) => (
            <span key={txt} style={{ padding: '6px 12px', borderRadius: 20, background: cor,
              fontSize: 13, fontWeight: 700 }}>{txt}</span>
          ))}
        </div>

        {semNota > 0 && (
          <div style={{ background: '#fdf0e6', border: '1px solid var(--copper)', borderRadius: 10,
            padding: '11px 13px', fontSize: 13.5, lineHeight: 1.55, marginBottom: 12 }}>
            Há {semNota} aluno{semNota > 1 ? 's' : ''} sem nenhuma nota nesta unidade. Se fechares
            agora, a pauta vai com um traço nesses lugares.
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid rgba(26,23,20,0.12)', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#f7f5f2' }}>
                {['Nº', 'Aluno', 'Competências', '+ Assid.', '+ Eventos', 'Final', 'Presença', ''].map(h => (
                  <th key={h} style={{ padding: '9px 10px', textAlign: h === 'Aluno' ? 'left' : 'right',
                    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em',
                    color: 'rgba(26,23,20,0.5)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map(l => (
                <tr key={l.alunoId} style={{ borderTop: '1px solid rgba(26,23,20,0.08)' }}>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{l.numero}</td>
                  <td style={{ padding: '8px 10px' }}>{l.nome}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{n(l.base)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{n(l.bonusAssiduidade)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{n(l.bonusParticipacao)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800,
                    color: l.final === null ? 'rgba(26,23,20,0.4)'
                      : l.final >= 10 ? '#3E7A31' : '#c0392b' }}>{n(l.final)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{l.presenca}%</td>
                  <td style={{ padding: '8px 10px', fontSize: 12.5, color: 'var(--copper)' }}>
                    {l.recuperacao ? l.motivo : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.05em',
          textTransform: 'uppercase', color: 'rgba(26,23,20,0.55)', margin: '16px 0 6px' }}>
          Enviar para
        </div>
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="o.teu.email@eclisboa.net" style={{
            width: '100%', padding: '11px 12px', borderRadius: 10, fontSize: 15,
            border: '1px solid rgba(26,23,20,0.2)', fontFamily: 'inherit', boxSizing: 'border-box',
          }} />
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', marginTop: 5, lineHeight: 1.5 }}>
          Recebes um email com o link da pauta. Ela fica no ficheiro de dados da escola,
          numa folha só dela.
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={onCancelar} style={{
            flex: '1 1 120px', padding: 13, borderRadius: 10, border: '1px solid rgba(26,23,20,0.18)',
            background: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Agora não</button>
          <button onClick={enviar} disabled={aEnviar} style={{
            flex: '2 1 200px', padding: 13, borderRadius: 10, border: 'none',
            background: 'var(--sage, #5a7a4e)', color: '#fff', fontSize: 14.5, fontWeight: 700,
            cursor: aEnviar ? 'default' : 'pointer', fontFamily: 'inherit', opacity: aEnviar ? 0.6 : 1,
          }}>
            {aEnviar ? 'A enviar…' : 'Fechar a unidade e enviar a pauta'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FecharUC;
