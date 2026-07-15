import React, { useState } from 'react';
import { getAlunos, alterarPinAluno } from '../backend';

interface Props {
  turmaId: string;
  nomeProfessor?: string;
}

export function PinTemporarioPanel({ turmaId, nomeProfessor }: Props) {
  const alunos = getAlunos().filter(a => a.turmaId === turmaId).sort((a, b) => a.numero - b.numero);
  const [alunoSel, setAlunoSel] = useState<string>('');
  const [pinGerado, setPinGerado] = useState<string>('');
  const [confirmado, setConfirmado] = useState(false);

  function gerarPin(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function criarPinTemp() {
    if (!alunoSel) return;
    const pin = gerarPin();
    setPinGerado(pin);
    setConfirmado(false);
  }

  function confirmarPin() {
    if (!alunoSel || !pinGerado) return;
    alterarPinAluno(alunoSel, pinGerado);
    // Marcar como temporário no localStorage
    try {
      localStorage.setItem(`ecl_pin_temp_${alunoSel}`, JSON.stringify({
        pin: pinGerado,
        criadoPor: nomeProfessor || 'Professor',
        criadoEm: new Date().toISOString(),
      }));
    } catch {}
    setConfirmado(true);
  }

  function limpar() {
    setAlunoSel('');
    setPinGerado('');
    setConfirmado(false);
  }

  const aluno = alunos.find(a => a.id === alunoSel);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Explicação */}
      <div style={{ background: '#fffbeb', borderRadius: 12, padding: '12px 14px', marginBottom: 16,
        border: '1.5px solid #fcd34d' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 4 }}>
          🔑 PIN Temporário
        </div>
        <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
          Se um aluno esqueceu o PIN e não consegue entrar na aula, podes criar um PIN temporário aqui.
          A coordenadora será avisada para definir um PIN definitivo.
        </div>
      </div>

      {/* Selector de aluno */}
      {!confirmado ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(26,23,20,0.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,23,20,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>
            Selecciona o aluno
          </div>
          <select value={alunoSel} onChange={e => { setAlunoSel(e.target.value); setPinGerado(''); setConfirmado(false); }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.12)', fontSize: 14, marginBottom: 12 }}>
            <option value="">— Escolhe o aluno —</option>
            {alunos.map(a => (
              <option key={a.id} value={a.id}>
                Nº {a.numero}{a.nome ? ` — ${a.nome}` : ''}
              </option>
            ))}
          </select>

          {alunoSel && !pinGerado && (
            <button onClick={criarPinTemp}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: '#b5651d', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Gerar PIN temporário para {aluno?.nome || `Aluno ${aluno?.numero}`}
            </button>
          )}

          {pinGerado && (
            <div>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '16px', textAlign: 'center', marginBottom: 12,
                border: '2px solid #86efac' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 6 }}>
                  PIN gerado
                </div>
                <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '0.2em', color: '#166534', fontFamily: 'monospace' }}>
                  {pinGerado}
                </div>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 6 }}>
                  Diz este PIN ao aluno em voz baixa
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmarPin}
                  style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                    background: '#5a7a4e', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  ✓ Activar este PIN
                </button>
                <button onClick={criarPinTemp}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(26,23,20,0.15)',
                    background: '#fff', color: 'rgba(26,23,20,0.6)', fontSize: 13, cursor: 'pointer' }}>
                  Gerar outro
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Confirmação */
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '20px', textAlign: 'center', border: '2px solid #86efac' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#166534', marginBottom: 4 }}>
            PIN activado para {aluno?.nome || `Aluno ${aluno?.numero}`}
          </div>
          <div style={{ fontSize: 13, color: '#15803d', marginBottom: 16 }}>
            PIN: <strong style={{ fontFamily: 'monospace', fontSize: 18 }}>{pinGerado}</strong>
            <br />A coordenadora será avisada para definir um PIN definitivo.
          </div>
          <button onClick={limpar}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none',
              background: '#5a7a4e', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Criar PIN para outro aluno
          </button>
        </div>
      )}
    </div>
  );
}

export default PinTemporarioPanel;
