// ============================================================
// Fecho das aulas (Rosa, 6/out/2026)
// ============================================================
// Abre logo que o professor entra na aplicação (uma vez por dia, ou quando
// ele a pede): aula a aula, o que falta validar e as presenças por confirmar.
// Durante a aula o professor não regista nada; aqui confirma com um toque,
// com a cabeça fresca — por exemplo, que um aluno saiu mais cedo.
// ============================================================
import React, { useState } from 'react';
import type { PlanoAula } from '../types';
import { fechoDasAulas, decidirFalta, type CasoPresenca } from '../backend';

const dataPT = (iso: string) => String(iso || '').slice(0, 10).split('-').reverse().slice(0, 2).join('/');
const CHAVE = 'ecl_fecho_visto_';

/** A janela abre-se sozinha uma vez por dia (por professor), se houver alguma coisa por fazer. */
export function deveAbrirFecho(nomeProfessor: string): boolean {
  try {
    if (localStorage.getItem(CHAVE + nomeProfessor) === new Date().toISOString().slice(0, 10)) return false;
  } catch { /* abre */ }
  return fechoDasAulas(nomeProfessor).length > 0;
}

export function FechoDasAulas({ nomeProfessor, onFechar, onAbrirPlano }: {
  nomeProfessor: string; onFechar: () => void; onAbrirPlano: (p: PlanoAula, modulo: 'validacao' | 'turma') => void;
}) {
  const [, redesenhar] = useState(0);
  const lista = fechoDasAulas(nomeProfessor);
  const fechar = () => { try { localStorage.setItem(CHAVE + nomeProfessor, new Date().toISOString().slice(0, 10)); } catch { /* */ } onFechar(); };
  const decidir = (c: CasoPresenca, p: PlanoAula, d: 'sem_falta' | 'falta_presenca' | 'falta_atraso') => {
    decidirFalta(c.alunoId, p.id, d, nomeProfessor || 'professor', 'Confirmado no fecho da aula');
    redesenhar(n => n + 1);
  };
  const bt = (cor: string, cheio = false): React.CSSProperties => ({ padding: '7px 11px', borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', border: `1.5px solid ${cor}`, background: cheio ? cor : '#fff', color: cheio ? '#fff' : cor, whiteSpace: 'nowrap' });
  const total = lista.reduce((s, f) => s + f.porValidar + f.casos.length, 0);

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(26,23,20,0.6)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 18, maxWidth: 680, width: '100%', padding: '20px 18px', margin: '20px 0', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A' }}>Fecho das aulas</div>
        <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.65)', margin: '4px 0 14px', lineHeight: 1.5 }}>
          {total
            ? 'Antes de começar: o que ficou por fazer nas aulas que já acabaram. Faça-o enquanto se lembra do que aconteceu (até 24 horas depois da aula).'
            : '✓ Está tudo feito. Não há autoavaliações por validar nem presenças por confirmar.'}
        </div>
        {lista.map(f => (
          <div key={f.plano.id} style={{ border: '1px solid rgba(26,23,20,0.14)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>{dataPT(String(f.plano.data))} · {f.plano.turmaId} · {f.plano.titulo || 'Aula'}</div>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.55)' }}>{f.plano.ucId}{f.plano.horaInicio ? ` · ${f.plano.horaInicio}–${f.plano.horaFim || ''}` : ''}</div>
            {f.porValidar > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ flex: 1, minWidth: 180, fontSize: 14.5 }}>📝 <b>{f.porValidar}</b> {f.porValidar === 1 ? 'autoavaliação por validar' : 'autoavaliações por validar'}</span>
                <button onClick={() => { fechar(); onAbrirPlano(f.plano, 'validacao'); }} style={bt('#3E7A31', true)}>Validar agora →</button>
              </div>
            )}
            {f.casos.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#8a5a12', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Presenças por confirmar</div>
                {f.casos.map(c => (
                  <div key={c.alunoId} style={{ borderTop: '1px solid rgba(26,23,20,0.08)', padding: '8px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.numero}. {c.nome}</div>
                      <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.65)' }}>{c.detalhe}</div>
                    </div>
                    {c.motivo === 'nao_entrou' ? (<>
                      <button onClick={() => decidir(c, f.plano, 'falta_presenca')} style={bt('#C0392B', true)}>Faltou</button>
                      <button onClick={() => decidir(c, f.plano, 'sem_falta')} style={bt('#3E7A31')}>Esteve</button>
                      <button onClick={() => { fechar(); onAbrirPlano(f.plano, 'turma'); }} style={bt('#B5651D')}>Só algumas horas…</button>
                    </>) : c.motivo === 'atrasado' ? (<>
                      <button onClick={() => decidir(c, f.plano, 'falta_atraso')} style={bt('#B5651D', true)}>Falta de atraso</button>
                      <button onClick={() => decidir(c, f.plano, 'sem_falta')} style={bt('#3E7A31')}>Sem falta</button>
                    </>) : (<>
                      <button onClick={() => decidir(c, f.plano, 'sem_falta')} style={bt('#3E7A31', true)}>Esteve a aula toda</button>
                      <button onClick={() => { fechar(); onAbrirPlano(f.plano, 'turma'); }} style={bt('#B5651D')}>Saiu mais cedo…</button>
                    </>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <button onClick={fechar} style={{ width: '100%', minHeight: 48, marginTop: 4, borderRadius: 12, border: '1px solid rgba(26,23,20,0.2)',
          background: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {total ? 'Fazer depois (volta a aparecer amanhã, ou no botão «Fecho das aulas»)' : 'Fechar'}
        </button>
      </div>
    </div>
  );
}
