// ============================================================
// Eliminar um plano — com o que a aula já tem à frente.
//
// Antes eliminava-se o plano e as avaliações ficavam soltas, a contar
// para a nota da UC. E o aviso era um "escreve 1 ou 2" que não dizia
// nada sobre avaliações.
//
// Agora:
//   · sem nada feito na aula → arquivar ou eliminar, como antes;
//   · com avaliações → aviso forte, e duas saídas:
//       1. corrigir o plano e manter as avaliações (engano na ficha, na
//          unidade, na data…);
//       2. anular a aula e apagar as avaliações — com uma segunda
//          confirmação que diz o que vai desaparecer. E desaparece mesmo.
// ============================================================

import React, { useState } from 'react';
import type { PlanoAula } from '../types';
import { resumoDoPlano, anularPlanoAula, arquivarPlanoAula } from '../backend';

const VERMELHO = '#c0392b';

function Botao({ children, onClick, cor = '#fff', texto = '#1a1714', borda = 'rgba(26,23,20,0.18)' }: {
  children: React.ReactNode; onClick: () => void; cor?: string; texto?: string; borda?: string;
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '13px 14px', borderRadius: 11, marginBottom: 8,
      border: `1.5px solid ${borda}`, background: cor, color: texto,
      fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    }}>{children}</button>
  );
}

export function DialogoEliminarPlano({ plano, onFechar, onFeito, onCorrigir }: {
  plano: PlanoAula;
  onFechar: () => void;
  /** Depois de arquivar ou eliminar. */
  onFeito: () => void;
  /** Abrir o plano para o corrigir, mantendo as avaliações. */
  onCorrigir?: () => void;
}) {
  const r = resumoDoPlano(plano.id);
  const [passo, setPasso] = useState<'escolher' | 'confirmar'>('escolher');
  const data = String(plano.data || '').slice(0, 10);
  const nome = `${plano.titulo || 'Plano de aula'}${data ? ' — ' + data : ''}`;

  const linhas = [
    r.aulaAberta && 'a aula foi aberta',
    r.presencas && `${r.presencas} entrada${r.presencas > 1 ? 's' : ''} de alunos (presenças e atrasos)`,
    r.autoavaliacoes && `${r.autoavaliacoes} autoavaliaç${r.autoavaliacoes > 1 ? 'ões' : 'ão'}`,
    r.validacoes && `${r.validacoes} validaç${r.validacoes > 1 ? 'ões' : 'ão'} tua${r.validacoes > 1 ? 's' : ''}`,
    r.notas && `${r.notas} nota${r.notas > 1 ? 's' : ''} por competência`,
  ].filter(Boolean) as string[];

  return (
    <div onClick={onFechar} style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(26,23,20,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Eliminar o plano</div>
        <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)', marginBottom: 14 }}>{nome}</div>

        {/* ── Sem nada feito na aula ── */}
        {!r.temAvaliacoes && (
          <>
            <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.7)', marginBottom: 14, lineHeight: 1.55 }}>
              Esta aula ainda não tem entradas nem avaliações.
            </div>
            <Botao onClick={() => { arquivarPlanoAula(plano.id); onFeito(); }}>
              Arquivar
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(26,23,20,0.55)' }}>Sai do calendário; podes repô-lo no Arquivo.</div>
            </Botao>
            <Botao cor={VERMELHO} texto="#fff" borda={VERMELHO}
              onClick={() => { anularPlanoAula(plano.id); onFeito(); }}>
              Eliminar de vez
            </Botao>
            <Botao onClick={onFechar}>Cancelar</Botao>
          </>
        )}

        {/* ── Com avaliações: escolher ── */}
        {r.temAvaliacoes && passo === 'escolher' && (
          <>
            <div style={{ background: '#fdf0ef', border: `2px solid ${VERMELHO}`, borderRadius: 12,
              padding: '13px 15px', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: VERMELHO, marginBottom: 6 }}>
                Esta aula já tem trabalho dos alunos
              </div>
              {linhas.map(l => <div key={l} style={{ fontSize: 14, lineHeight: 1.6 }}>· {l}</div>)}
              {r.requisicoes > 0 && (
                <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginTop: 6 }}>
                  E tem requisição.
                </div>
              )}
            </div>

            {onCorrigir && (
              <Botao cor="#eef4eb" borda="#5a7a4e" onClick={onCorrigir}>
                Corrigir o plano e manter as avaliações
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
                  Enganaste-te na ficha, na unidade, na data ou no tipo de aula. As avaliações ficam.
                </div>
              </Botao>
            )}
            <Botao borda={VERMELHO} texto={VERMELHO} onClick={() => setPasso('confirmar')}>
              Anular a aula e apagar as avaliações
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
                A aula não devia ter contado. Tudo o que os alunos fizeram nela desaparece.
              </div>
            </Botao>
            <Botao onClick={onFechar}>Cancelar</Botao>
          </>
        )}

        {/* ── Com avaliações: segunda confirmação ── */}
        {r.temAvaliacoes && passo === 'confirmar' && (
          <>
            <div style={{ background: VERMELHO, color: '#fff', borderRadius: 12,
              padding: '14px 16px', marginBottom: 14, lineHeight: 1.6 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Isto não se pode desfazer</div>
              <div style={{ fontSize: 14 }}>Vão desaparecer:</div>
              {linhas.map(l => <div key={l} style={{ fontSize: 14 }}>· {l}</div>)}
              <div style={{ fontSize: 14, marginTop: 8 }}>
                As notas destes alunos na UC vão mudar, e as faltas e atrasos desta aula deixam de contar.
                {r.requisicoes > 0 && ' A requisição não se apaga: fica fora de plano.'}
              </div>
            </div>
            <Botao cor={VERMELHO} texto="#fff" borda={VERMELHO}
              onClick={() => { anularPlanoAula(plano.id); onFeito(); }}>
              Sim, anular a aula e apagar tudo
            </Botao>
            <Botao onClick={() => setPasso('escolher')}>Voltar</Botao>
          </>
        )}
      </div>
    </div>
  );
}

export default DialogoEliminarPlano;
