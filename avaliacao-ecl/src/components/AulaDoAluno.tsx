// ============================================================
// A aula do aluno — a comanda do grupo e os ecrãs de cor
// (Rosa, 6/out/2026: a ideia B com o grupo da ideia C)
// ============================================================
// Os alunos do 1.º BCR não percebiam a aula: muitos botões, muita
// informação, e o grupo só aparecia no 3.º passo. Agora:
//   • em cima, a comanda do grupo (o nome, o prato, as caras dos colegas,
//     com um visto em quem já entrou ou já se avaliou);
//   • por baixo, um ecrã de cor com uma frase grande e um botão.
// Os grupos vêm do plano (o professor faz os grupos): o aluno não cria
// nem escolhe grupo.
// ============================================================
import React, { useEffect, useState } from 'react';
import type { Aluno, PlanoAula } from '../types';
import { grupoDoAluno, estadosNaAula, getAlunos, getFichasProducao } from '../backend';

export const CORES_AULA = {
  esperar: '#F2C14E', entrar: '#E6F2E2', farda: '#FFFFFF', maos: '#DDEBF5',
  produzir: '#6B3FA0', avaliar: '#E6F2E2', fim: '#2F7A3B', aviso: '#FFE3D3', atraso: '#FDE7D6',
} as const;
export const MESA = '#EDEAE4';
const TINTA = '#1A1A1A';
const CORES_CARAS = ['#B5651D', '#2F7A3B', '#0E6E8C', '#8C2F5A', '#4F6B1E', '#7A5C1E', '#3D4FA0'];

const primeiroNome = (n?: string) => String(n || '').trim().split(/\s+/)[0] || '';
const nomeDe = (id: string, n?: string) => n || getAlunos().find(a => a.id === id)?.nome || 'Colega';

/** O que os vistos querem dizer neste momento da aula. */
export type MomentoVistos = 'entrou' | 'avaliou' | null;

export function ComandaDoGrupo({ plano, aluno, comGrupos, grande, vistos, linhaUC, horas, prato, funcao, onVerFuncoes }: {
  plano: PlanoAula; aluno: Aluno; comGrupos: boolean; grande?: boolean; vistos: MomentoVistos;
  linhaUC: string; horas: string; prato?: string; funcao?: string; onVerFuncoes?: () => void;
}) {
  // A aula rápida chega de 3 em 3 segundos: a comanda volta a ler o que há.
  const [, redesenhar] = useState(0);
  useEffect(() => { const t = setInterval(() => redesenhar(n => n + 1), 3000); return () => clearInterval(t); }, []);

  const grupo = comGrupos ? grupoDoAluno(plano.id, aluno.id) : undefined;
  const fichaGrupo = grupo?.fichaId ? getFichasProducao().find(f => f.id === grupo.fichaId)?.nomePrato : undefined;
  const pratoMostrar = fichaGrupo || prato;
  const estados = estadosNaAula(plano.id);
  // O aluno primeiro, depois os colegas pela ordem do grupo.
  const membros = grupo ? [...grupo.membros].sort((a, b) => (a.alunoId === aluno.id ? -1 : b.alunoId === aluno.id ? 1 : 0)) : [];
  const feitos = membros.filter(m => vistos && estados.get(m.alunoId)?.[vistos]).length;
  const legenda = !grupo || !vistos ? ''
    : vistos === 'entrou' ? (feitos === membros.length ? 'O grupo está todo na aula' : `${feitos} de ${membros.length} já ${feitos === 1 ? 'entrou' : 'entraram'}`)
    : `${feitos} de ${membros.length} já se ${feitos === 1 ? 'avaliou' : 'avaliaram'}`;

  const g = !!grande;
  const tam = g ? 50 : 36;
  return (
    <div style={{ background: MESA, padding: '10px 12px 8px' }}>
      <div style={{ background: '#fffdf8', borderRadius: 4, boxShadow: '0 1px 0 #d8d2c6', padding: g ? '12px 14px' : '8px 12px 9px',
        fontFamily: 'ui-monospace, "IBM Plex Mono", Menlo, monospace', fontSize: g ? 13 : 12, color: TINTA }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: 'inherit', fontSize: g ? 22 : 17, fontWeight: 800, lineHeight: 1.15 }}>
            {comGrupos ? (grupo ? grupo.nome : 'Grupo ?') : 'A aula de hoje'}
          </div>
          <span style={{ whiteSpace: 'nowrap' }}>{horas}</span>
        </div>
        {(g || !comGrupos) && linhaUC && <div style={{ marginTop: 2 }}>{linhaUC}</div>}
        {(pratoMostrar || (comGrupos && !grupo)) && (
          <div style={{ borderTop: '1px dashed #cfc8ba', marginTop: 6, paddingTop: 5, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>{pratoMostrar || 'Ainda por definir'}</span>
          </div>
        )}
        {funcao && (
          <div style={{ borderTop: '1px dashed #cfc8ba', marginTop: 6, paddingTop: 5, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>A tua função</span><b style={{ textAlign: 'right' }}>{funcao}</b>
          </div>
        )}
        {onVerFuncoes && (
          <button onClick={onVerFuncoes} style={{ marginTop: 6, padding: 0, border: 'none', background: 'none', color: '#6B3FA0',
            fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>Quem faz o quê hoje</button>
        )}
      </div>

      {comGrupos && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Math.min(6, grupo ? membros.length : 4))}, minmax(0,1fr))`,
          gap: 4, marginTop: 10, textAlign: 'center', fontSize: g ? 12.5 : 11.5, color: '#4a453d' }}>
          {grupo ? membros.slice(0, 6).map((m, i) => {
            const eu = m.alunoId === aluno.id;
            const visto = vistos ? !!estados.get(m.alunoId)?.[vistos] : null;
            const nome = eu ? 'Tu' : primeiroNome(nomeDe(m.alunoId, m.nomeAluno));
            return (
              <div key={m.alunoId} style={{ minWidth: 0 }}>
                <div style={{ width: tam, height: tam, borderRadius: '50%', margin: '0 auto 3px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 800, color: '#fff', position: 'relative', fontSize: g ? 18 : 14,
                  background: eu ? '#6B3FA0' : CORES_CARAS[i % CORES_CARAS.length], outline: eu ? '3px solid #F2C14E' : 'none' }}>
                  {(eu ? primeiroNome(aluno.nome) : nome).charAt(0).toUpperCase() || '?'}
                  {visto !== null && (
                    <span style={{ position: 'absolute', right: -4, bottom: -3, width: 17, height: 17, borderRadius: '50%',
                      background: visto ? '#2F7A3B' : '#bbb', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', border: `2px solid ${MESA}` }}>{visto ? '✓' : ''}</span>
                  )}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</div>
              </div>
            );
          }) : [0, 1, 2, 3].map(i => (
            <div key={i}>
              <div style={{ width: tam, height: tam, borderRadius: '50%', margin: '0 auto 3px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: g ? 18 : 14, background: i ? '#cfc9bf' : '#6B3FA0',
                outline: i ? 'none' : '3px solid #F2C14E' }}>{i ? '?' : (primeiroNome(aluno.nome).charAt(0).toUpperCase() || '?')}</div>
              {i ? '' : 'Tu'}
            </div>
          ))}
        </div>
      )}
      {legenda && <div style={{ fontSize: 12, textAlign: 'center', color: '#6d675e', marginTop: 4 }}>{legenda}</div>}
    </div>
  );
}

/** O professor mudou o aluno de grupo: um ecrã a avisar, uma vez. */
export function useMudancaDeGrupo(plano: PlanoAula, aluno: Aluno, comGrupos: boolean): { nome: string; ok: () => void } | null {
  const chave = `ecl_meu_grupo_${plano.id}_${aluno.id}`;
  const [, redesenhar] = useState(0);
  const grupo = comGrupos ? grupoDoAluno(plano.id, aluno.id) : undefined;
  let antes = '';
  try { antes = localStorage.getItem(chave) || ''; } catch { /* */ }
  const agora = grupo?.id || '';
  useEffect(() => {
    // O primeiro grupo que o aluno vê não é uma mudança: só se guarda.
    if (agora && !antes) { try { localStorage.setItem(chave, agora); } catch { /* */ } }
  }, [agora, antes, chave]);
  if (!agora || !antes || agora === antes) return null;
  return { nome: grupo!.nome, ok: () => { try { localStorage.setItem(chave, agora); } catch { /* */ } redesenhar(n => n + 1); } };
}

/** O ecrã de cor: riscos do progresso, uma frase grande, o resto por baixo. */
export function EcraDeCor({ cor, total, feitos, titulo, sub, children }: {
  cor: string; total: number; feitos: number; titulo?: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode;
}) {
  const escuro = cor === CORES_AULA.produzir || cor === CORES_AULA.fim;
  return (
    <div style={{ background: cor, color: escuro ? '#fff' : TINTA, borderRadius: '20px 20px 0 0', padding: '14px 16px 22px',
      display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 360 }}>
      {total > 0 && (
        <div style={{ display: 'flex', gap: 4 }} aria-label={`${feitos} de ${total}`}>
          {Array.from({ length: total }).map((_, i) => (
            <i key={i} style={{ flex: 1, height: 4, borderRadius: 2,
              background: i < feitos ? (escuro ? '#fff' : 'rgba(0,0,0,.75)') : (escuro ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.18)') }} />
          ))}
        </div>
      )}
      {titulo && <div style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 32, lineHeight: 1.06, fontWeight: 800, textWrap: 'balance' as any }}>{titulo}</div>}
      {sub && <div style={{ fontSize: 16, lineHeight: 1.45 }}>{sub}</div>}
      {children}
    </div>
  );
}

/** O botão grande do ecrã de cor. */
export function BotaoDaAula({ onClick, children, cor, desligado, contorno, escuro }: {
  onClick?: () => void; children: React.ReactNode; cor?: string; desligado?: boolean; contorno?: boolean; escuro?: boolean;
}) {
  const fundo = contorno ? 'transparent' : (cor || (escuro ? '#fff' : TINTA));
  const texto = contorno ? (escuro ? '#fff' : TINTA) : (escuro && !cor ? TINTA : '#fff');
  return (
    <button onClick={desligado ? undefined : onClick} disabled={desligado}
      style={{ width: '100%', minHeight: contorno ? 50 : 58, borderRadius: 16, fontSize: contorno ? 16 : 18, fontWeight: 800,
        fontFamily: 'inherit', cursor: desligado ? 'default' : 'pointer', opacity: desligado ? 0.35 : 1,
        border: contorno ? `2px solid ${texto}` : 'none', background: fundo, color: texto }}>
      {children}
    </button>
  );
}
