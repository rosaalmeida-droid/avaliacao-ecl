import React, { useState, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════
// AlunosExternos — Gestão de alunos externos à escola (FCT externos)
// Os alunos externos não pertencem a nenhuma turma — ficam numa
// lista própria identificada por nome + número de processo.
// ═══════════════════════════════════════════════════════════════

const CHAVE = 'ecl_alunos_externos';

export interface AlunoExterno {
  id: string;
  nome: string;
  numeroProcesso?: string;
  turmaOrigem?: string;   // turma/escola de origem (informativo)
  cursoOrigem?: string;
  anoLetivo?: string;
  localFCT?: string;
  supervisorFCT?: string;
  dataInicio?: string;
  dataTermo?: string;
  criadoEm: string;
}

export function getAlunosExternos(): AlunoExterno[] {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); } catch { return []; }
}

export function addOrUpdateAlunoExterno(a: AlunoExterno): void {
  const todos = getAlunosExternos();
  const idx = todos.findIndex(x => x.id === a.id);
  if (idx >= 0) todos[idx] = a; else todos.push(a);
  try { localStorage.setItem(CHAVE, JSON.stringify(todos)); } catch {}
}

export function eliminarAlunoExterno(id: string): void {
  const todos = getAlunosExternos().filter(a => a.id !== id);
  try { localStorage.setItem(CHAVE, JSON.stringify(todos)); } catch {}
}

// ── Componente de gestão ─────────────────────────────────────
export function GestaoAlunosExternos() {
  const [alunos, setAlunos] = useState<AlunoExterno[]>(getAlunosExternos);
  const [aEditar, setAEditar] = useState<AlunoExterno | null>(null);
  const [pesquisa, setPesquisa] = useState('');

  function recarregar() { setAlunos(getAlunosExternos()); }

  function novoAluno() {
    setAEditar({
      id: `ext_${Date.now()}`,
      nome: '', numeroProcesso: '', turmaOrigem: '', cursoOrigem: '',
      anoLetivo: '', localFCT: '', supervisorFCT: '', dataInicio: '', dataTermo: '',
      criadoEm: new Date().toISOString(),
    });
  }

  function guardar(a: AlunoExterno) {
    if (!a.nome.trim()) return;
    addOrUpdateAlunoExterno(a);
    recarregar();
    setAEditar(null);
  }

  function eliminar(id: string) {
    if (!confirm('Eliminar este aluno externo?')) return;
    eliminarAlunoExterno(id);
    recarregar();
  }

  const filtrados = useMemo(() =>
    alunos.filter(a => !pesquisa || a.nome.toLowerCase().includes(pesquisa.toLowerCase())),
    [alunos, pesquisa]
  );

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input value={pesquisa} onChange={e => setPesquisa(e.target.value)}
          placeholder="Pesquisar aluno externo..."
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)', fontSize: 13 }} />
        <button onClick={novoAluno}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6d28d9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + Aluno Externo
        </button>
      </div>

      {filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'rgba(26,23,20,0.4)' }}>
          Sem alunos externos registados.
        </div>
      )}

      {filtrados.map(a => (
        <div key={a.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px',
          marginBottom: 8, border: '1px solid rgba(26,23,20,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{a.nome}</div>
              <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>
                {a.turmaOrigem && `${a.turmaOrigem} · `}
                {a.localFCT && `🏢 ${a.localFCT}`}
                {a.dataInicio && ` · ${a.dataInicio}${a.dataTermo ? ' → ' + a.dataTermo : ''}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setAEditar({ ...a })}
                style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.15)', background: '#faf7f2', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                ✏️ Editar
              </button>
              <button onClick={() => eliminar(a.id)}
                style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', fontSize: 11, cursor: 'pointer', color: '#dc2626', fontWeight: 600 }}>
                🗑
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Modal de edição */}
      {aEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setAEditar(null); }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 20,
            width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>
              {aEditar.criadoEm === aEditar.criadoEm ? 'Aluno Externo' : 'Editar Aluno Externo'}
            </div>

            {[
              { label: 'Nome completo *', field: 'nome', type: 'text', placeholder: 'Nome do aluno externo' },
              { label: 'Nº de processo', field: 'numeroProcesso', type: 'text', placeholder: 'Ex: 2026/001' },
              { label: 'Turma/Escola de origem', field: 'turmaOrigem', type: 'text', placeholder: 'Ex: 3º ACP — Escola X' },
              { label: 'Ano letivo', field: 'anoLetivo', type: 'text', placeholder: 'Ex: 2026/27' },
              { label: 'Empresa FCT', field: 'localFCT', type: 'text', placeholder: 'Nome da empresa' },
              { label: 'Supervisor FCT', field: 'supervisorFCT', type: 'text', placeholder: 'Nome do orientador' },
              { label: 'Início FCT', field: 'dataInicio', type: 'date', placeholder: '' },
              { label: 'Fim FCT', field: 'dataTermo', type: 'date', placeholder: '' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <input
                  type={type}
                  value={(aEditar as any)[field] || ''}
                  onChange={e => setAEditar(prev => prev ? { ...prev, [field]: e.target.value } : null)}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid rgba(26,23,20,0.2)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setAEditar(null)}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid rgba(26,23,20,0.2)', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => guardar(aEditar)}
                style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#6d28d9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
