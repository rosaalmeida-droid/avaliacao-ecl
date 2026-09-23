// ============================================================
// Eliminar um aluno definitivamente
//
// É a única ação da aplicação que não tem volta. Antes bastava um
// clique certeiro num aviso de texto corrido.
//
// Agora mostra o que se perde — notas, presenças, autoavaliações,
// recuperações — e pede o nome escrito à mão. Quem se engana no botão
// não se engana a escrever o nome todo.
// ============================================================

import React, { useState } from 'react';
import type { Aluno } from '../types';

const VERMELHO = '#c0392b';

export function AvisoEliminarAluno({ aluno, perde, onEliminar, onCancelar }: {
  aluno: Aluno;
  perde: { notas: number; presencas: number; autoavaliacoes: number; recuperacoes: number };
  onEliminar: () => void;
  onCancelar: () => void;
}) {
  const [escrito, setEscrito] = useState('');
  const nome = (aluno.nome || `Aluno ${aluno.numero}`).trim();
  const confere = escrito.trim().toLowerCase() === nome.toLowerCase();

  const linhas = [
    perde.notas && `${perde.notas} nota${perde.notas > 1 ? 's' : ''} por competência`,
    perde.autoavaliacoes && `${perde.autoavaliacoes} autoavaliaç${perde.autoavaliacoes > 1 ? 'ões' : 'ão'}`,
    perde.presencas && `${perde.presencas} presença${perde.presencas > 1 ? 's' : ''} e atrasos`,
    perde.recuperacoes && `${perde.recuperacoes} recuperaç${perde.recuperacoes > 1 ? 'ões' : 'ão'}`,
  ].filter(Boolean) as string[];

  const temPercurso = linhas.length > 0;

  return (
    <div onClick={onCancelar} style={{
      position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(26,23,20,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 460,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: VERMELHO }}>
          Eliminar {nome}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)', marginTop: 2, marginBottom: 14 }}>
          Nº {aluno.numero} · {aluno.turmaId}
        </div>

        {temPercurso ? (
          <div style={{ background: '#fdf0ef', border: `2px solid ${VERMELHO}`, borderRadius: 12,
            padding: '13px 15px', marginBottom: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: VERMELHO, marginBottom: 6 }}>
              Este aluno tem percurso na aplicação
            </div>
            {linhas.map(l => (
              <div key={l} style={{ fontSize: 14, lineHeight: 1.6 }}>· {l}</div>
            ))}
            <div style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.55 }}>
              Desaparece tudo, e não há como voltar atrás. Se ele saiu da turma,
              usa antes <b>Remover</b> — sai das listas e as notas ficam guardadas.
            </div>
          </div>
        ) : (
          <div style={{ background: '#f7f5f2', borderRadius: 10, padding: '12px 14px',
            fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>
            Este aluno ainda não tem notas nem presenças. Eliminar não perde trabalho
            nenhum — serve para alunos de teste ou criados por engano.
          </div>
        )}

        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          Para confirmar, escreve o nome do aluno:
        </div>
        <input value={escrito} onChange={e => setEscrito(e.target.value)}
          placeholder={nome} autoFocus style={{
            width: '100%', padding: '11px 12px', borderRadius: 10, fontSize: 15,
            fontFamily: 'inherit', boxSizing: 'border-box',
            border: `1.5px solid ${escrito && !confere ? VERMELHO : 'rgba(26,23,20,0.2)'}`,
          }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={onCancelar} style={{
            flex: '1 1 120px', padding: 13, borderRadius: 10, border: '1px solid rgba(26,23,20,0.18)',
            background: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancelar</button>
          <button onClick={onEliminar} disabled={!confere} style={{
            flex: '1 1 160px', padding: 13, borderRadius: 10, border: 'none',
            background: confere ? VERMELHO : 'rgba(26,23,20,0.15)', color: '#fff',
            fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit',
            cursor: confere ? 'pointer' : 'default',
          }}>Eliminar para sempre</button>
        </div>
      </div>
    </div>
  );
}

export default AvisoEliminarAluno;
