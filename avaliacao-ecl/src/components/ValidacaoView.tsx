import React, { useState } from 'react';
import { SelecaoAluno, Validacao } from '../types';
import { getComandas, getSelecoes, getValidacoes, addOrUpdateValidacao,
  getPlanosAula, getFichasProducao, addRegistoAvaliacao } from '../backend';
import { MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS, encontrarMicro, encontrarAtitude } from '../competenciasECL';
import { Card, Button, Field } from './ui';

const NIVEIS_PROF = [
  { v: 4,  label: 'Supera expectativas', cor: 'rgba(37,99,235,0.1)',  txt: 'var(--info)' },
  { v: 3,  label: 'Atingiu',             cor: 'var(--sage-pale)',      txt: 'var(--sage)' },
  { v: 2,  label: 'Em desenvolvimento',  cor: 'var(--copper-pale)',    txt: 'var(--copper)' },
  { v: 1,  label: 'Não atingiu',         cor: 'var(--danger-pale)',    txt: 'var(--danger)' },
];

// Converter nota do professor (1-4) + autoavaliação aluno (0-1) → nota final (0-20)
function calcularNotaFinal(notaProf: number, notaAluno: number): number {
  // Max professor = 4, max aluno = 1, total = 5
  // Escala: 5/5 = 20, 4/5 = 16, 3/5 = 12, 2/5 = 8, 1/5 = 4
  const total = notaProf + notaAluno;
  return Math.round((total / 5) * 20);
}

export function ValidacaoView({ turmaId }: { turmaId?: string }) {
  const planos = getPlanosAula().filter(p => !turmaId || p.turmaId === turmaId);
  const selecoes = getSelecoes().filter(s => !turmaId || s.turmaId === turmaId);
  const validacoes = getValidacoes();

  const pendentes = selecoes.filter(s => !validacoes.some(v => v.selecaoId === s.id));

  const [ativa, setAtiva] = useState<SelecaoAluno | null>(null);

  if (ativa) {
    const plano = planos.find(p => p.id === ativa.planoAulaId);
    const fichas = getFichasProducao().filter(f => plano?.fichasIds?.includes(f.id));
    return (
      <ValidarSelecao
        selecao={ativa}
        planoTitulo={plano?.titulo || ''}
        ucId={plano?.ucId || ''}
        fichasNomes={fichas.map(f => f.nomePrato)}
        onVoltar={() => setAtiva(null)}
      />
    );
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
        Validações pendentes
      </div>

      {pendentes.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div className="muted">Não há autoavaliações pendentes de validação.</div>
          </div>
        </Card>
      )}

      {pendentes.map(s => {
        const plano = planos.find(p => p.id === s.planoAulaId);
        const nMicros = s.autoavaliacoes?.length || 0;
        return (
          <div key={s.id} className="option-card" onClick={() => setAtiva(s)}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                Aluno {s.alunoId.split('-').pop()} — {plano?.titulo || s.planoAulaId}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {plano?.ucId ? `${plano.ucId} · ` : ''}
                {nMicros} competência{nMicros !== 1 ? 's' : ''} a validar
              </div>
            </div>
            <span style={{ fontSize: 20, color: 'var(--copper)' }}>›</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Validar autoavaliação de um aluno ────────────────────────
function ValidarSelecao({ selecao, planoTitulo, ucId, fichasNomes, onVoltar }: {
  selecao: SelecaoAluno;
  planoTitulo: string;
  ucId: string;
  fichasNomes: string[];
  onVoltar: () => void;
}) {
  const [notasProf, setNotasProf] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState('');
  const [guardado, setGuardado] = useState(false);

  // Obter competências da autoavaliação
  const autoavaliacoes = selecao.autoavaliacoes || [];

  function getNomeComp(id: string): string {
    if (id.startsWith('OBR_')) {
      return OBRIGATORIAS.find(o => o.id === id)?.nome || id;
    }
    if (id.startsWith('ATT_')) {
      return encontrarAtitude(id)?.nome || id;
    }
    return encontrarMicro(id)?.nome || id;
  }

  function getCriterios(id: string): string[] {
    if (id.startsWith('ATT_') || id.startsWith('OBR_')) return [];
    const m = encontrarMicro(id);
    return (m?.criterios || []).map((c: any) => c.criterio || c);
  }

  function guardar() {
    const agora = new Date().toISOString();
    const notasFinais = autoavaliacoes.map(auto => {
      const notaProf = notasProf[auto.competenciaId] || 2;
      // Converter nível do aluno para nota numérica (0-1)
      const notaAluno = auto.nivel === 'superei' ? 1
        : auto.nivel === 'atingi' ? 0.75
        : auto.nivel === 'desenvolvimento' ? 0.5 : 0.25;
      const notaFinal = calcularNotaFinal(notaProf, notaAluno);
      return { competenciaId: auto.competenciaId, notaProf, notaAluno, notaFinal };
    });

    // Guardar validação
    const validacao: Validacao = {
      id: `val_${selecao.id}_${Date.now()}`,
      selecaoId: selecao.id,
      alunoId: selecao.alunoId,
      turmaId: selecao.turmaId,
      planoAulaId: selecao.planoAulaId || '',
      fichaId: selecao.fichaId || '',
      notas: notasFinais,
      comentarioProfessor: comentario,
      validadoEm: agora,
    };
    addOrUpdateValidacao(validacao as any);

    // Registar no histórico de avaliações
    notasFinais.forEach(n => {
      addRegistoAvaliacao({
        id: `registo_${selecao.alunoId}_${n.competenciaId}_${Date.now()}`,
        alunoId: selecao.alunoId,
        turmaId: selecao.turmaId,
        planoAulaId: selecao.planoAulaId || '',
        fichaId: selecao.fichaId || '',
        ucId,
        microcompetenciaId: n.competenciaId,
        nota: n.notaFinal,
        data: agora,
        validadoPor: 'professor',
      });
    });

    setGuardado(true);
  }

  if (guardado) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--sage)', marginBottom: 6 }}>Validação guardada!</div>
          <div className="muted" style={{ marginBottom: 16 }}>As notas foram registadas no histórico do aluno.</div>
          <Button onClick={onVoltar}>← Voltar</Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={onVoltar}>← Voltar</button>

      <div style={{ background: 'var(--charcoal)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, color: 'var(--cream)' }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{planoTitulo}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 3 }}>
          {ucId && `${ucId} · `}Aluno {selecao.alunoId.split('-').pop()}
          {fichasNomes.length > 0 && ` · ${fichasNomes.join(', ')}`}
        </div>
      </div>

      {autoavaliacoes.length === 0 && (
        <Card>
          <div className="muted">Sem competências para validar nesta autoavaliação.</div>
        </Card>
      )}

      {autoavaliacoes.map(auto => {
        const nome = getNomeComp(auto.competenciaId);
        const criterios = getCriterios(auto.competenciaId);
        const notaProf = notasProf[auto.competenciaId];
        const notaAlunoPct = auto.nivel === 'superei' ? 1 : auto.nivel === 'atingi' ? 0.75 : auto.nivel === 'desenvolvimento' ? 0.5 : 0.25;
        const notaFinal = notaProf ? calcularNotaFinal(notaProf, notaAlunoPct) : null;

        // Cor do nível do aluno
        const corAluno = auto.nivel === 'superei' || auto.nivel === 'atingi' ? 'var(--sage)' : auto.nivel === 'desenvolvimento' ? 'var(--copper)' : 'var(--danger)';
        const labelAluno = auto.nivel === 'superei' ? 'Faço com segurança' : auto.nivel === 'atingi' ? 'Consigo sozinho/a' : auto.nivel === 'desenvolvimento' ? 'Consigo com ajuda' : 'Ainda não consigo';

        return (
          <Card key={auto.competenciaId} style={{ marginBottom: 10 }}>
            {/* Nome da competência */}
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{nome}</div>

            {/* Autoavaliação do aluno */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: 'var(--cream-dark)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>Aluno disse:</span>
              <span style={{ fontWeight: 600, fontSize: 12, color: corAluno }}>{labelAluno}</span>
            </div>

            {/* Critérios observáveis */}
            {criterios.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, color: 'rgba(26,23,20,0.4)' }}>
                  Critérios observáveis
                </div>
                {criterios.map((c, i) => (
                  <div key={i} style={{ fontSize: 11, padding: '3px 0', borderBottom: '1px solid var(--border)', color: 'rgba(26,23,20,0.7)' }}>
                    · {c}
                  </div>
                ))}
              </div>
            )}

            {/* Avaliação do professor (1-4) */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, color: 'rgba(26,23,20,0.5)' }}>
              Avaliação do professor
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: notaFinal ? 8 : 0 }}>
              {NIVEIS_PROF.map(n => (
                <button key={n.v} onClick={() => setNotasProf(p => ({ ...p, [auto.competenciaId]: n.v }))} style={{
                  padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${notaProf === n.v ? n.txt : 'var(--border)'}`,
                  background: notaProf === n.v ? n.cor : '#fff',
                  color: notaProf === n.v ? n.txt : 'rgba(26,23,20,0.5)',
                  fontSize: 10, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{n.v}</div>
                  {n.label}
                </button>
              ))}
            </div>

            {/* Nota final calculada */}
            {notaFinal !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: notaFinal >= 12 ? 'var(--sage-pale)' : 'var(--danger-pale)', borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>Nota final:</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: notaFinal >= 12 ? 'var(--sage)' : 'var(--danger)' }}>
                  {notaFinal}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)' }}>/20</span>
                <span style={{ fontSize: 11, marginLeft: 'auto', color: notaFinal >= 12 ? 'var(--sage)' : 'var(--danger)', fontWeight: 600 }}>
                  {notaFinal >= 17 ? 'Excelente' : notaFinal >= 14 ? 'Bom' : notaFinal >= 12 ? 'Suficiente' : 'Insuficiente'}
                </span>
              </div>
            )}
          </Card>
        );
      })}

      {/* Comentário e guardar */}
      <Card>
        <Field label="Observação geral (opcional)">
          <textarea
            className="input"
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Notas para o aluno sobre esta aula..."
            style={{ minHeight: 80 }}
          />
        </Field>
        <Button block onClick={guardar}
          disabled={autoavaliacoes.some(a => !notasProf[a.competenciaId])}
          style={{ background: 'var(--sage)', marginTop: 8, padding: 14, fontSize: 15, fontWeight: 700 }}>
          ✓ Validar e guardar avaliação
        </Button>
        {autoavaliacoes.some(a => !notasProf[a.competenciaId]) && (
          <div style={{ fontSize: 11, color: 'var(--danger)', textAlign: 'center', marginTop: 6 }}>
            Preenche a avaliação do professor em todas as competências antes de guardar.
          </div>
        )}
      </Card>
    </div>
  );
}

