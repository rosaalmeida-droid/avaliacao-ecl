import React, { useState, useMemo } from 'react';
import { fmtData, fmtDataHora, fmtHora, fmtDataCurta, fmtDataLonga, fmtDataRelativa } from '../datas';
import { SelecaoAluno, Validacao, calcularNotaPlano } from '../types';
import { getComandas, getSelecoes, getValidacoes, addOrUpdateValidacao,
  getPlanosAula, getFichasProducao, addRegistoAvaliacao, substituirRegistosDoProfessor, getAlunos } from '../backend';
import { MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS, encontrarMicro, encontrarAtitude, encontrarAparelho, encontrarSubtecnica, nomeCompetencia } from '../compatECL';
import { getLibrary } from '../libraryService';
import { Card, Button, Field } from './ui';
import { CriteriosComp } from './CriteriosComp';

// Escala 1-4 alinhada com a autoavaliação do aluno
// Escala 1-5 — cores de ardósia progressivas (neutras, sem verde/vermelho)
// Cinco níveis, do mais alto ao mais baixo. O `curto` é o que cabe no
// botão; o `label` é a frase inteira, para o professor confirmar o que
// está a dar. Antes só havia a frase longa, espremida em 20% da
// largura do ecrã — não se lia nem parecia um botão.
const NIVEIS_PROF = [
  { v: 5, curto: 'Muito bom', label: 'Faço com muito bom resultado',             txt: '#1e3a4a' },
  { v: 4, curto: 'Sozinho',   label: 'Faço sozinho/a',                           txt: '#3d5a6e' },
  { v: 3, curto: 'Com ajuda', label: 'Consegui com ajuda',                       txt: '#647a8a' },
  { v: 2, curto: 'A treinar', label: 'Tentei mas ainda preciso de mais prática', txt: '#96a4b0' },
  { v: 1, curto: 'Não fez',   label: 'Ainda não fiz',                            txt: '#7B2233' },
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

// Nota final = a nota do professor, sempre. A autoavaliação do aluno é só uma
// proposta/referência — o professor confirma, sobe ou desce, mas a decisão
// final é sempre dele. O aluno só recebe a nota depois desta validação.
function calcularNotaFinal(notaProf: number, notaAluno: number): number {
  return notaProf;
}

// Conversão 1-5 → 0-20 (×4)
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

/** O professor precisa do nome, não do identificador interno. */
function nomeDoAluno(alunoId: string): string {
  const a = getAlunos().find(x => x.id === alunoId);
  if (!a) return 'Aluno';
  return a.nome || `Aluno nº ${a.numero}`;
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
    const valExistente = validacoes.find(v => v.selecaoId === ativa.id) || null;
    return (
      <ValidarSelecao
        selecao={ativa}
        planoTitulo={plano?.titulo || ''}
        ucId={plano?.ucId || ''}
        fichasNomes={fichas.map(f => f.nomePrato)}
        tipoPlanAula={(plano as any)?.tipoPlanAula || 'pratico'}
        validacaoExistente={valExistente}
        onVoltar={() => setAtiva(null)}
      />
    );
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
        Validações pendentes
      </div>

      {selecoes.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div className="muted">Ainda não há autoavaliações de alunos para este plano.</div>
          </div>
        </Card>
      )}

      {selecoes.map(s => {
        const plano = planos.find(p => p.id === s.planoAulaId);
        const nMicros = s.autoavaliacoes?.length || 0;
        const jaValidada = validacoes.some(v => v.selecaoId === s.id);
        return (
          <div key={s.id} className="option-card" onClick={() => setAtiva(s)}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {nomeDoAluno(s.alunoId)} — {plano?.titulo || s.planoAulaId}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {plano?.ucId ? `${plano.ucId} · ` : ''}
                {jaValidada
                  ? '✓ Validado — tocar para alterar'
                  : `${nMicros} competência${nMicros !== 1 ? 's' : ''} a validar`}
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
              background: jaValidada ? 'rgba(90,122,78,0.15)' : 'rgba(181,101,29,0.15)',
              color: jaValidada ? 'var(--sage)' : 'var(--copper)' }}>
              {jaValidada ? 'Validado' : 'Pendente'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Validar autoavaliação de um aluno ────────────────────────
function ValidarSelecao({ selecao, planoTitulo, ucId, fichasNomes, tipoPlanAula, validacaoExistente, onVoltar }: {
  selecao: SelecaoAluno;
  planoTitulo: string;
  ucId: string;
  fichasNomes: string[];
  tipoPlanAula?: 'pratico' | 'misto' | 'teorico';
  validacaoExistente?: any;
  onVoltar: () => void;
}) {
  // Pré-preencher com a proposta do aluno — o professor só precisa de clicar
  // onde quer discordar (subir ou descer); o resto fica já seleccionado, pronto
  // a confirmar com um só toque em "Guardar".
  const [notasProf, setNotasProf] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    (selecao.autoavaliacoes || []).forEach((auto: any) => {
      const notaAlunoProposta = auto.nota || (
        auto.nivel === 'mbr' || auto.nivel === 'autonomia' || auto.nivel === 'superei' ? 5 :
        auto.nivel === 'fs'  || auto.nivel === 'sozinho'   || auto.nivel === 'atingi'  ? 4 :
        auto.nivel === 'ca'  || auto.nivel === 'ajuda'     || auto.nivel === 'desenvolvimento' ? 3 :
        auto.nivel === 'tp' ? 2 : 1
      );
      const jaVal = validacaoExistente?.notas?.find((n: any) => n.competenciaId === auto.competenciaId);
      inicial[auto.competenciaId] = jaVal ? jaVal.nota : notaAlunoProposta;
    });
    return inicial;
  });
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

  // Pré-visualização em tempo real da nota final — actualiza a cada nota que o
  // professor dá, para não haver surpresas: o professor vê SEMPRE a decomposição
  // por categoria antes de confirmar, não só o número final.
  const previsaoNota = useMemo(() => {
    const notasComCat = autoavaliacoes.map((auto: any) => {
      const notaProf = notasProf[auto.competenciaId];
      const notaAluno = (auto as any).nota || (
        auto.nivel === 'mbr' || auto.nivel === 'autonomia' || auto.nivel === 'superei' ? 5 :
        auto.nivel === 'fs'  || auto.nivel === 'sozinho'   || auto.nivel === 'atingi'  ? 4 :
        auto.nivel === 'ca'  || auto.nivel === 'ajuda'     || auto.nivel === 'desenvolvimento' ? 3 :
        auto.nivel === 'tp' ? 2 : 1
      );
      const nProf = notaProf || 2;
      const notaFinal = calcularNotaFinal(nProf, notaAluno);
      const cat = auto.competenciaId?.startsWith('OBR_') ? 'OBR'
        : auto.competenciaId?.startsWith('SUB-') || auto.competenciaId?.startsWith('APP-') ? 'SUB'
        : auto.competenciaId?.startsWith('KNW-') ? 'KNW'
        : auto.competenciaId?.startsWith('INI-') ? 'INI'
        : 'ATI';
      return { categoria: cat as 'OBR'|'SUB'|'KNW'|'ATI'|'INI', nota: notaFinal };
    });
    return calcularNotaPlano(notasComCat, tipoPlanAula || 'pratico');
  }, [notasProf, autoavaliacoes, tipoPlanAula]);

  const LABEL_CAT: Record<string,string> = {
    OBR: 'Obrigatórias (higiene, HACCP, pontualidade)',
    SUB: 'Técnicas/Subtécnicas',
    KNW: 'Conhecimentos',
    ATI: 'Atitude',
    INI: 'Iniciativa',
  };

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
      id: `val_${selecao.id}`,
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
    // Calcular nota ponderada com pesos por categoria
    const notasComCat = notasFinais.map(n => {
      const cat = n.competenciaId?.startsWith('OBR_') ? 'OBR'
        : n.competenciaId?.startsWith('SUB-') || n.competenciaId?.startsWith('APP-') ? 'SUB'
        : n.competenciaId?.startsWith('KNW-') ? 'KNW'
        : n.competenciaId?.startsWith('INI-') ? 'INI'
        : 'ATI';
      return { categoria: cat as 'OBR'|'SUB'|'KNW'|'ATI'|'INI', nota: n.notaFinal };
    });
    const { nota20, porCategoria, detalhes } = calcularNotaPlano(notasComCat, tipoPlanAula || 'pratico');
    const notaMedia = notasFinais.length
      ? notasFinais.reduce((s, n) => s + n.notaFinal, 0) / notasFinais.length
      : 0;
    (validacao as any).notaMedia = Math.round(notaMedia * 10) / 10;
    (validacao as any).notaMedia20 = nota20; // usa pesos por categoria, não média simples
    // Guardar a decomposição por categoria para o professor perceber sempre
    // como a nota foi calculada (antes ficava só o número, sem explicação).
    (validacao as any).porCategoria = porCategoria;
    (validacao as any).detalhesNota = detalhes;
    (validacao as any).tipoPlanAulaUsado = tipoPlanAula || 'pratico';
    addOrUpdateValidacao(validacao as any);

    // Substituir — não acrescentar. Se o professor corrigir uma validação
    // já feita, os registos antigos têm de sair, senão o aluno passa a ver
    // duas notas para a mesma competência.
    substituirRegistosDoProfessor(
      selecao.alunoId,
      selecao.planoAulaId || '',
      notasFinais.map(n => ({
        id: `registo_${selecao.alunoId}_${n.competenciaId}_${Date.now()}`,
        alunoId: selecao.alunoId,
        turmaId: selecao.turmaId,
        planoAulaId: selecao.planoAulaId || '',
        fichaId: selecao.fichaId || '',
        ucId,
        microcompetenciaId: n.competenciaId,
        nota: n.notaFinal,
        data: agora,
        validadoPor: 'professor' as const,
      }))
    );
    setGuardado(true);
  }

  // Depois de guardar não se fecha o ecrã: o professor pode querer
  // corrigir logo a seguir. Fica só um aviso por cima do formulário.
  

  return (
    <div>
      <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={onVoltar}>← Voltar</button>

      {guardado && (
        <div style={{ background: 'rgba(90,122,78,0.12)', border: '1px solid var(--sage)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, color: 'var(--sage)' }}>✓</span>
          <div style={{ flex: 1, fontSize: 14, color: 'var(--sage)', fontWeight: 600 }}>
            Validação guardada. Podes continuar a alterar — basta guardar outra vez.
          </div>
        </div>
      )}

      {validacaoExistente && !guardado && (
        <div style={{ background: 'rgba(90,122,78,0.12)', border: '1px solid var(--sage)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 14,
          fontSize: 14, color: 'var(--sage)', fontWeight: 600 }}>
          Já validaste esta autoavaliação. As notas abaixo são as que gravaste — altera e guarda de novo.
        </div>
      )}

      <div style={{ background: 'var(--charcoal)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, color: 'var(--cream)' }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{planoTitulo}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 3 }}>
          {ucId && `${ucId} · `}{nomeDoAluno(selecao.alunoId)}
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

            {/* Critérios observáveis do Dicionário — ajuda o professor a validar com precisão */}
            <CriteriosComp compId={auto.competenciaId} cor="var(--sage)" />

            {/* Avaliação do professor (1-4) */}
            <div style={{ fontSize:13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, marginTop: 12, color: 'rgba(26,23,20,0.5)' }}>
              A tua avaliação
            </div>
            <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.45)', marginBottom: 8 }}>
              Vem preenchido com o que o aluno se deu. Toca para alterar.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 8 }}>
              {NIVEIS_PROF.map(n => {
                const escolhido = notaProf === n.v;
                const foiDoAluno = notaAluno14 === n.v;
                return (
                  <button key={n.v}
                    onClick={() => setNotasProf(p => ({ ...p, [auto.competenciaId]: n.v }))}
                    style={{
                      padding: '13px 4px 10px', borderRadius: 10,
                      border: `2px solid ${escolhido ? n.txt : 'var(--border)'}`,
                      background: escolhido ? n.txt : '#fff',
                      color: escolhido ? '#fff' : 'rgba(26,23,20,0.55)',
                      cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                      position: 'relative',
                    }}>
                    <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{n.v}</div>
                    <div style={{ fontSize: 11.5, marginTop: 5, fontWeight: escolhido ? 700 : 400 }}>
                      {n.curto}
                    </div>
                    {/* Onde o aluno se pôs — para o professor ver de relance
                        se está a confirmar ou a discordar. */}
                    {foiDoAluno && (
                      <div style={{
                        position: 'absolute', top: 4, right: 5, width: 7, height: 7,
                        borderRadius: '50%', background: escolhido ? '#fff' : 'var(--copper)',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* A frase inteira do que está escolhido. */}
            {notaProf && (
              <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.7)', marginBottom: notaFinal ? 8 : 0,
                fontStyle: 'italic' }}>
                "{NIVEIS_PROF.find(n => n.v === notaProf)?.label}"
                {notaProf !== notaAluno14 && (
                  <span style={{ color: 'var(--copper)', fontWeight: 700, fontStyle: 'normal' }}>
                    {' '}· alteraste o que o aluno tinha posto
                  </span>
                )}
              </div>
            )}

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

      {/* Pré-visualização da nota final — mostra SEMPRE a decomposição por
          categoria, para o professor perceber como se chegou ao número, mesmo
          antes de guardar. */}
      <div style={{ background: 'rgba(90,122,78,0.06)', border: '1px solid var(--sage)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 8 }}>
          <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'rgba(26,23,20,0.5)' }}>
            Nota prevista desta aula
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--sage)' }}>
            {previsaoNota.nota20}<span style={{fontSize:14, fontWeight:600, opacity:0.6}}>/20</span>
          </div>
        </div>
        <div style={{ fontSize:12, color:'rgba(26,23,20,0.65)', lineHeight:1.6 }}>
          {Object.entries(previsaoNota.porCategoria).map(([cat, n]) => (
            <div key={cat} style={{ display:'flex', justifyContent:'space-between', padding:'2px 0' }}>
              <span>{LABEL_CAT[cat] || cat}</span>
              <span style={{ fontWeight:700 }}>{n}/20</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize:11, color:'rgba(26,23,20,0.4)', marginTop:8 }}>
          Ponderação de aula {tipoPlanAula === 'teorico' ? 'teórica' : tipoPlanAula === 'misto' ? 'mista' : 'prática'}.
          Falta preencher {autoavaliacoes.filter(a => !notasProf[a.competenciaId]).length} de {autoavaliacoes.length} competências.
        </div>
      </div>

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
