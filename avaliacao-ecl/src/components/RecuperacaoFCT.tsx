import React, { useState } from 'react';
import { Aluno, RecuperacaoModulo } from '../types';
import { ModalFullscreen } from './ModalFullscreen';
import {
  getAlunos, criarRecuperacaoFCT, addEvidenciaFCT, addOrUpdateRecuperacao,
  getRecuperacoesPorAluno,
} from '../backend';
import { microsPorUC, encontrarMicro } from '../compatECL';
import { UCS_COZINHA } from './PlanoAula';
import { gerarPDFRecuperacaoFCT } from './GerarPDFRecuperacaoFCT';
import { gerarPromptRecuperacaoFCT } from '../matrizEvidencias';
import { getReferencialUC } from '../referencial811RA144';
import { SeletorIA } from './SeletorIA';

// ═══════════════════════════════════════════════════════════════
// Recuperação via FCT — lado do PROFESSOR
// Cria uma recuperação nova, escolhendo aluno, UC, competências a
// evidenciar, e se exige horas mínimas de formação ou só evidências.
// ═══════════════════════════════════════════════════════════════

export function CriarRecuperacaoFCT({ turmaId, onCriada }: { turmaId: string; onCriada: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [alunoId, setAlunoId] = useState('');
  const [ucId, setUcId] = useState('');
  const [competenciasSel, setCompetenciasSel] = useState<Set<string>>(new Set());
  const [exigirHoras, setExigirHoras] = useState(false);
  const [horasMinimas, setHorasMinimas] = useState(10);
  const [localFCT, setLocalFCT] = useState('');
  const [supervisorFCT, setSupervisorFCT] = useState('');

  const alunos = getAlunos().filter(a => a.turmaId === turmaId).sort((a, b) => a.numero - b.numero);
  const uc = UCS_COZINHA.find(u => u.id === ucId);
  const competenciasDaUC = ucId ? microsPorUC(ucId) : [];

  function toggleComp(id: string) {
    setCompetenciasSel(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  function criar() {
    if (!alunoId || !ucId || competenciasSel.size === 0) {
      alert('Escolhe o aluno, a UC, e pelo menos uma competência a evidenciar.');
      return;
    }
    const aluno = alunos.find(a => a.id === alunoId);
    const nova = criarRecuperacaoFCT(
      alunoId, turmaId, ucId, uc?.nome || '',
      Array.from(competenciasSel), exigirHoras, exigirHoras ? horasMinimas : undefined,
      localFCT || undefined, supervisorFCT || undefined
    );
    addOrUpdateRecuperacao(nova);
    setAberto(false);
    setAlunoId(''); setUcId(''); setCompetenciasSel(new Set());
    setExigirHoras(false); setLocalFCT(''); setSupervisorFCT('');
    onCriada();
  }

  return (
    <>
      <button onClick={() => setAberto(true)} style={{
        width: '100%', padding: '12px', borderRadius: 10, border: '2px dashed #6d28d9',
        background: 'transparent', color: '#6d28d9', cursor: 'pointer', fontSize: 14, fontWeight: 700,
      }}>
        🏢 Criar recuperação via FCT
      </button>

      {aberto && (
        <ModalFullscreen titulo="Nova recuperação via FCT" subtitulo="Formação em Contexto de Trabalho" onFechar={() => setAberto(false)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Aluno</div>
            <select value={alunoId} onChange={e => setAlunoId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
              <option value="">Seleccionar...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.numero} — {a.nome}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Unidade de Competência</div>
            <select value={ucId} onChange={e => { setUcId(e.target.value); setCompetenciasSel(new Set()); }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
              <option value="">Seleccionar...</option>
              {UCS_COZINHA.map(u => <option key={u.id} value={u.id}>{u.id} — {u.nome}</option>)}
            </select>
          </div>

          {ucId && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Competências a evidenciar na FCT ({competenciasSel.size} seleccionadas)
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                {competenciasDaUC.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={competenciasSel.has(c.id)} onChange={() => toggleComp(c.id)} />
                    <span style={{ fontSize: 13 }}>{c.nome}</span>
                  </label>
                ))}
                {competenciasDaUC.length === 0 && <div style={{ fontSize: 12, color: '#999' }}>Sem competências mapeadas para esta UC.</div>}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14, padding: 12, background: '#f5f0e8', borderRadius: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: exigirHoras ? 10 : 0 }}>
              <input type="checkbox" checked={exigirHoras} onChange={e => setExigirHoras(e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Exigir um número mínimo de horas de formação</span>
            </label>
            {exigirHoras && (
              <input type="number" min={1} value={horasMinimas} onChange={e => setHorasMinimas(parseInt(e.target.value) || 0)}
                placeholder="Horas mínimas" style={{ width: 120, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }} />
            )}
            {!exigirHoras && (
              <div style={{ fontSize: 11, color: '#8a4a15' }}>
                Sem exigência de horas — só contam as evidências das competências, seja qual for o tempo dedicado.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Local de FCT (opcional)</div>
              <input value={localFCT} onChange={e => setLocalFCT(e.target.value)} placeholder="Nome da empresa"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Supervisor na empresa (opcional)</div>
              <input value={supervisorFCT} onChange={e => setSupervisorFCT(e.target.value)} placeholder="Nome do orientador"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
          </div>

          {ucId && competenciasSel.size > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Gerar guião de apoio (opcional, ajuda o aluno a estruturar as evidências)
              </div>
              <SeletorIA
                corPrincipal="#6d28d9"
                prompt={gerarPromptRecuperacaoFCT({
                  nomeAluno: alunos.find(a => a.id === alunoId)?.nome || 'Aluno',
                  ucId, ucNome: uc?.nome || '', tipoUC: 'tecnica',
                  competenciasAEvidenciar: Array.from(competenciasSel).map(id => ({
                    id, nome: encontrarMicro(id)?.nome || id,
                  })),
                  exigirHoras, horasMinimasExigidas: exigirHoras ? horasMinimas : undefined,
                  localFCT: localFCT || undefined,
                  realizacoesOficiais: getReferencialUC(ucId)?.realizacoes || [],
                  criteriosDesempenho: getReferencialUC(ucId)?.criteriosDesempenho,
                })}
              />
              <div style={{ fontSize: 11, color: '#999' }}>
                Copia o prompt, cola numa IA, e o resultado ajuda o aluno a saber o que escrever em cada evidência.
              </div>
            </div>
          )}

          <button onClick={criar} disabled={!alunoId || !ucId || competenciasSel.size === 0}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14,
              background: (!alunoId || !ucId || competenciasSel.size === 0) ? '#eee' : '#6d28d9',
              color: (!alunoId || !ucId || competenciasSel.size === 0) ? '#999' : '#fff',
              cursor: (!alunoId || !ucId || competenciasSel.size === 0) ? 'default' : 'pointer' }}>
            Criar recuperação via FCT
          </button>
        </ModalFullscreen>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Recuperação via FCT — lado do ALUNO
// Preenche as evidências: o que fez, quando, com base nas competências
// que o professor definiu.
// ═══════════════════════════════════════════════════════════════

export function RecuperacaoFCTAluno({ recuperacao, onAtualizado }: {
  recuperacao: RecuperacaoModulo; onAtualizado: () => void;
}) {
  const fct = recuperacao.fct;
  const [novaEvidencia, setNovaEvidencia] = useState<{ competenciaId: string; descricao: string; dataOcorrencia: string }>({
    competenciaId: fct?.competenciasAEvidenciar[0] || '', descricao: '', dataOcorrencia: '',
  });

  if (!fct) return null;

  function adicionar() {
    if (!novaEvidencia.competenciaId || !novaEvidencia.descricao.trim()) {
      alert('Escolhe a competência e descreve a situação real.');
      return;
    }
    addEvidenciaFCT(recuperacao.id, {
      id: `ev_${Date.now()}`,
      competenciaId: novaEvidencia.competenciaId,
      descricao: novaEvidencia.descricao,
      dataOcorrencia: novaEvidencia.dataOcorrencia || undefined,
    });
    setNovaEvidencia({ competenciaId: fct!.competenciasAEvidenciar[0] || '', descricao: '', dataOcorrencia: '' });
    onAtualizado();
  }

  return (
    <div>
      <div style={{ marginBottom: 14, padding: 12, background: '#f5f0e8', borderRadius: 8, fontSize: 12 }}>
        {fct.exigirHoras
          ? `Esta recuperação exige um mínimo de ${fct.horasMinimasExigidas || 0} horas de FCT dedicadas a estas competências.`
          : 'Esta recuperação não exige um número mínimo de horas — contam as evidências concretas do que fizeste.'}
        {fct.localFCT && <div style={{ marginTop: 4 }}>Local: {fct.localFCT}</div>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Evidências já registadas ({fct.evidencias.length})</div>
      {fct.evidencias.map(e => (
        <div key={e.id} style={{ padding: 10, borderRadius: 8, border: '1px solid #eee', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9' }}>{e.competenciaId} {e.dataOcorrencia ? `· ${e.dataOcorrencia}` : ''}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{e.descricao}</div>
          {e.validadoPeloSupervisor && <div style={{ fontSize: 11, color: '#5a7a4e', marginTop: 4 }}>✓ Validado pelo supervisor</div>}
        </div>
      ))}

      <div style={{ marginTop: 16, padding: 14, background: '#fafafa', borderRadius: 10, border: '1px dashed #ccc' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>+ Adicionar evidência</div>
        <select value={novaEvidencia.competenciaId} onChange={e => setNovaEvidencia(p => ({ ...p, competenciaId: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', marginBottom: 8 }}>
          {fct.competenciasAEvidenciar.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <textarea value={novaEvidencia.descricao} onChange={e => setNovaEvidencia(p => ({ ...p, descricao: e.target.value }))}
          placeholder="Descreve uma situação real: o que fizeste, quando, com quem, que resultado teve..."
          style={{ width: '100%', minHeight: 70, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', marginBottom: 8, boxSizing: 'border-box' }} />
        <input type="date" value={novaEvidencia.dataOcorrencia} onChange={e => setNovaEvidencia(p => ({ ...p, dataOcorrencia: e.target.value }))}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', marginBottom: 10 }} />
        <button onClick={adicionar} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none',
          background: '#6d28d9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Adicionar evidência
        </button>
      </div>
    </div>
  );
}
