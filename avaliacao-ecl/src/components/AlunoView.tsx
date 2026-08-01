import React from 'react';
import { getPlanosAulaPorTurma, getSelecoes, getValidacoes } from '../backend';
import { rotuloPlano } from '../rotuloPlano';

// Data "20-07 · quarta" curta
function dataCurta(iso?: string): string {
  if (!iso) return '';
  const d = /^\d{4}-\d{2}-\d{2}/.test(iso) ? new Date(iso.slice(0, 10) + 'T12:00:00') : new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm} · ${d.toLocaleDateString('pt-PT', { weekday: 'short' })}`;
}

type Estado = 'por_avaliar' | 'aguarda' | 'validado';

const ESTILO: Record<Estado, { dot: string; fundo: string; texto: string; etiqueta: string }> = {
  por_avaliar: { dot: '#c8cdd4', fundo: '#f4f2ee', texto: 'rgba(26,23,20,0.5)', etiqueta: 'Por autoavaliar' },
  aguarda:     { dot: '#b0692b', fundo: 'rgba(181,101,29,0.10)', texto: '#8a4f1e', etiqueta: 'Aguarda validação do professor' },
  validado:    { dot: '#5a7a4e', fundo: 'rgba(90,122,78,0.12)', texto: '#4e6a25', etiqueta: 'Validado' },
};

export function PercursoUC({ aluno, ucId }: { aluno: { id: string; turmaId: string }; ucId: string }) {
  if (!ucId) return null;

  const planos = getPlanosAulaPorTurma(aluno.turmaId)
    .filter(p => p.ucId === ucId && p.estado !== 'arquivado')
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));

  if (planos.length === 0) return null;

  const selecoes = getSelecoes().filter(s => s.alunoId === aluno.id);
  const validacoes = getValidacoes().filter(v => v.alunoId === aluno.id);

  const linhas = planos.map(p => {
    const sel = selecoes.find(s => s.planoAulaId === p.id);
    const val = sel ? validacoes.find(v => (v as any).selecaoId === sel.id) : undefined;
    let estado: Estado = 'por_avaliar';
    if (val) estado = 'validado';
    else if (sel) estado = 'aguarda';
    const nota20 = val ? ((val as any).notaMedia20 ?? null) : null;
    return { p, estado, nota20 };
  });

  const validados = linhas.filter(l => l.estado === 'validado').length;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--copper)' }}>
          O meu percurso nesta UC
        </div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)' }}>{validados} de {planos.length} validados</div>
      </div>

      <div style={{ position: 'relative' }}>
        {linhas.map(({ p, estado, nota20 }, i) => {
          const st = ESTILO[estado];
          return (
            <div key={p.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
              {/* trilho + ponto */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: st.dot, marginTop: 14, flexShrink: 0, zIndex: 1 }} />
                {i < linhas.length - 1 && <div style={{ width: 2, flex: 1, background: '#e5e1d8' }} />}
              </div>
              {/* cartão do plano */}
              <div style={{ flex: 1, background: st.fundo, borderRadius: 10, padding: '10px 13px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: 'var(--charcoal)' }}>{rotuloPlano(p)}</div>
                  <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)' }}>{dataCurta(p.data)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: st.texto }}>{st.etiqueta}</span>
                  {estado === 'validado' && nota20 != null && (
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: '#4e6a25' }}>{nota20}/20</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
