import React, { useState } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { SelecaoAluno, Validacao } from '../types';
import { getComandas, getSelecoes, getValidacoes, addOrUpdateValidacao,
  getPlanosAula, getFichasProducao, addRegistoAvaliacao } from '../backend';
import { MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS, encontrarMicro, encontrarAtitude, encontrarAparelho, encontrarSubtecnica, nomeCompetencia } from '../compatECL';
import { getLibrary } from '../libraryService';
import { Card, Button, Field } from './ui';

// Escala 1-4 alinhada com a autoavaliação do aluno
// Escala 1-5 — cores de ardósia progressivas (neutras, sem verde/vermelho)
const NIVEIS_PROF = [
  { v: 5, label: 'Faço com muito bom resultado',             cor: '#1e3a4a22', txt: '#1e3a4a' },
  { v: 4, label: 'Faço sozinho/a',                           cor: '#3d5a6e22', txt: '#3d5a6e' },
  { v: 3, label: 'Consegui com ajuda',                       cor: '#647a8a22', txt: '#647a8a' },
  { v: 2, label: 'Tentei mas ainda preciso de mais prática', cor: '#96a4b022', txt: '#96a4b0' },
  { v: 1, label: 'Ainda não fiz',                            cor: '#c8cfd622', txt: '#4a5568' },
];

// Label do nível do aluno (vem da autoavaliação)
function labelNivelAluno(nivel: string): string {
  if (nivel === 'mbr' || nivel === 'autonomia' || nivel === 'superei') return 'Faço com muito bom resultado';
  if (nivel === 'fs'  || nivel === 'sozinho'   || nivel === 'atingi')  return 'Faço sozinho/a';
  if (nivel === 'ca'  || nivel === 'ajuda'     || nivel === 'desenvolvimento') return 'Consegui com ajuda';
  if (nivel === 'tp')  return 'Tentei mas ainda preciso de mais prática';
  if (nivel === 'nf'  || nivel === 'nao'       || nivel === 'nao_atingi') return 'Ainda não fiz';
  return nivel;
}

function corNivelAluno(nivel: string): string {
  if (nivel === 'autonomia' || nivel === 'superei')          return '#0369a1';
  if (nivel === 'sozinho'   || nivel === 'atingi')           return 'var(--sage)';
  if (nivel === 'ajuda'     || nivel === 'desenvolvimento')  return 'var(--copper)';
  return 'var(--danger)';
}

// Nota final = média entre professor (1-4) e aluno (1-4)
function calcularNotaFinal(notaProf: number, notaAluno: number): number {
  if (!notaAluno) return notaProf;
  return Math.round(((notaProf + notaAluno) / 2) * 10) / 10;
}

// Conversão 1-4 → 0-20 (×5)
function para20(n: number): number { return n > 0 ? Math.min(20, Math.round(n * 4)) : 0; }

function labelNotaFinal(nota: number): string {
  if (nota >= 4.5) return 'Excelente';
  if (nota >= 3.5) return 'Muito Bom';
  if (nota >= 3)   return 'Bom';
  if (nota >= 2)   return 'Suficiente';
  return 'Insuficiente';
}

function corNotaFinal(nota: number): string {
  if (nota >= 3) return 'var(--sage)';
  if (nota >= 2) return 'var(--copper)';
  return 'var(--danger)';
}

export function ValidacaoView({ turmaId, planoId }: { turmaId?: string; planoId?: string }) {
  const planos = getPlanosAula().filter(p => (!turmaId || p.turmaId === turmaId) && (!planoId || p.id === planoId));
  const selecoes = getSelecoes().filter(s => (!turmaId || s.turmaId === turmaId) && (!planoId || s.planoAulaId === planoId));
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
      const obrs: Record<string,string> = {
        'OBR_01': 'Higiene pessoal', 'OBR_02': 'Higiene e Segurança Alimentar', 'OBR_03': 'Assiduidade',
      };
      return obrs[id] || id;
    }
    if (id.startsWith('SUB-')) return encontrarSubtecnica(id)?.nome || id;
    if (id.startsWith('APP-')) return encontrarAparelho(id)?.nome || id;
    if (id.startsWith('ATT_')) return encontrarAtitude(id)?.nome || id;
    if (id.startsWith('KNW-')) {
      const lib = getLibrary();
      return (lib.conhecimentos as any[]).find(k => k.id === id)?.nome || id;
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
    const notasFinais = autoavaliacoes.map((auto: any) => {
      const notaProf = notasProf[auto.competenciaId] || 2;
      // Nota do aluno em escala 1-5
      const notaAluno = (auto as any).nota || (
        auto.nivel === 'mbr' || auto.nivel === 'autonomia' || auto.nivel === 'superei' ? 5 :
        auto.nivel === 'fs'  || auto.nivel === 'sozinho'   || auto.nivel === 'atingi'  ? 4 :
        auto.nivel === 'ca'  || auto.nivel === 'ajuda'     || auto.nivel === 'desenvolvimento' ? 3 :
        auto.nivel === 'tp' ? 2 : 1
      );
      const notaFinal = calcularNotaFinal(notaProf, notaAluno);
      return { competenciaId: auto.competenciaId, notaProf, notaAluno, notaFinal };
    });

    // Guardar validação
    const validacao: Validacao = {
      id: `val_${selecao.id}_${Date.now()}`,
      selecaoId: selecao.id,
      comandaId: selecao.planoAulaId || '',
      alunoId: selecao.alunoId,
      turmaId: selecao.turmaId,
      planoAulaId: selecao.planoAulaId || '',
      fichaId: selecao.fichaId || '',
      notas: notasFinais.map(n => ({
        competenciaId: n.competenciaId,
        nota: n.notaFinal,
        origem: 'professor' as const,
      })),
      comentarioGeral: comentario,
      validadoPor: 'professor',
      validadoEm: agora,
    };
    // Calcular e guardar a nota média para o aluno ver
    const notaMedia = notasFinais.length
      ? notasFinais.reduce((s, n) => s + n.notaFinal, 0) / notasFinais.length
      : 0;
    (validacao as any).notaMedia = Math.round(notaMedia * 10) / 10;
    (validacao as any).notaMedia20 = Math.min(20, Math.round(notaMedia * 4));
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
        const _isApp = auto.competenciaId.startsWith('APP-');
        const _isSub = auto.competenciaId.startsWith('SUB-');
        const _isKnw = auto.competenciaId.startsWith('KNW-');
        const _app = _isApp ? encontrarAparelho(auto.competenciaId) : null;
        const notaProf = notasProf[auto.competenciaId];
        // Usar nota 1-4 directamente (novo sistema), com fallback para labels antigos
        const notaAluno14 = (auto as any).nota || (
          auto.nivel === 'autonomia' || auto.nivel === 'superei' ? 4 :
          auto.nivel === 'sozinho'   || auto.nivel === 'atingi'  ? 3 :
          auto.nivel === 'ajuda'     || auto.nivel === 'desenvolvimento' ? 2 : 1
        );
        const notaFinal = notaProf ? calcularNotaFinal(notaProf, notaAluno14) : null;

        // Cor e label do nível do aluno — suporta escala nova e antiga
        const corAluno = corNivelAluno((auto as any).nivel || '');
        const labelAluno = labelNivelAluno((auto as any).nivel || '');

        return (
          <div key={auto.competenciaId} style={{ marginBottom: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            {/* Nome da competência */}
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{nome}</span>
              {_isApp && _app && (
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:100,
                  background: _app.nivel===1?'rgba(90,122,78,0.15)':_app.nivel===2?'rgba(181,101,29,0.15)':'rgba(192,57,43,0.15)',
                  color: _app.nivel===1?'#5a7a4e':_app.nivel===2?'#b5651d':'#c0392b' }}>
                  Aparelho N{_app.nivel} · {_app.categoria}
                </span>
              )}
              {_isSub && (
                <span style={{ fontSize:10, color:'rgba(26,23,20,0.4)', fontStyle:'italic' }}>subtécnica</span>
              )}
              {auto.competenciaId.startsWith('KNW-') && (
                <span style={{ fontSize:10, color:'#0369a1', fontStyle:'italic', fontWeight:600 }}>conhecimento</span>
              )}
            </div>

            {/* Autoavaliação do aluno */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: 'var(--cream-dark)', borderRadius: 8 }}>
              <span style={{ fontSize:13, color: 'rgba(26,23,20,0.5)' }}>Aluno disse:</span>
              <span style={{ fontWeight: 600, fontSize: 12, color: corAluno }}>{labelAluno}</span>
            </div>

            {/* Critérios observáveis */}
            {criterios.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, color: 'rgba(26,23,20,0.4)' }}>
                  Critérios observáveis
                </div>
                {criterios.map((c, i) => (
                  <div key={i} style={{ fontSize:13, padding: '3px 0', borderBottom: '1px solid var(--border)', color: 'rgba(26,23,20,0.7)' }}>
                    · {c}
                  </div>
                ))}
              </div>
            )}

            {/* Avaliação do professor (1-4) */}
            <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, color: 'rgba(26,23,20,0.5)' }}>
              Avaliação do professor
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: notaFinal ? 8 : 0 }}>
              {NIVEIS_PROF.map(n => (
                <button key={n.v} onClick={() => setNotasProf(p => ({ ...p, [auto.competenciaId]: n.v }))} style={{
                  padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${notaProf === n.v ? n.txt : 'var(--border)'}`,
                  background: notaProf === n.v ? n.cor : '#fff',
                  color: notaProf === n.v ? n.txt : 'rgba(26,23,20,0.5)',
                  fontSize:13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{n.v}</div>
                  {n.label}
                </button>
              ))}
            </div>

            {/* Nota final calculada */}
            {notaFinal !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: notaFinal >= 3 ? 'var(--sage-pale)' : notaFinal >= 2 ? 'var(--copper-pale)' : 'var(--danger-pale)', borderRadius: 8 }}>
                <span style={{ fontSize:13, color: 'rgba(26,23,20,0.5)' }}>Nota final:</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: corNotaFinal(notaFinal) }}>
                  {notaFinal}
                </span>
                <span style={{ fontSize:13, color: 'rgba(26,23,20,0.4)' }}>/4</span>
                <span style={{ fontSize:13, color: 'rgba(26,23,20,0.4)', marginLeft: 8 }}>→</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: corNotaFinal(notaFinal), marginLeft: 4 }}>
                  {para20(notaFinal)}
                </span>
                <span style={{ fontSize:13, color: 'rgba(26,23,20,0.4)' }}>/20</span>
                <span style={{ fontSize:13, marginLeft: 'auto', color: corNotaFinal(notaFinal), fontWeight: 600 }}>
                  {labelNotaFinal(notaFinal)}
                </span>
              </div>
            )}
          </div>
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
        <button className="btn btn-primary" onClick={guardar}
          disabled={autoavaliacoes.some(a => !notasProf[a.competenciaId])}
          style={{ width:'100%', background: 'var(--sage)', marginTop: 8, padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', opacity: autoavaliacoes.some(a => !notasProf[a.competenciaId]) ? 0.4 : 1 }}>
          ✓ Validar e guardar avaliação
        </button>
        {autoavaliacoes.some(a => !notasProf[a.competenciaId]) && (
          <div style={{ fontSize:13, color: 'var(--danger)', textAlign: 'center', marginTop: 6 }}>
            Preenche a avaliação do professor em todas as competências antes de guardar.
          </div>
        )}
      </Card>
    </div>
  );
}
