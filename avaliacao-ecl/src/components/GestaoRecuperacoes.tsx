import React, { useState } from 'react';
import { getRecuperacoesPorTurma, addOrUpdateRecuperacao, addRegistoAvaliacao, getAlunos, getGuiasDaRecuperacao, addEvidencia, construirPromptAnalisePreliminar, recuperacaoEstaTrancada, destrancarRecuperacao } from '../backend';
import { encontrarMicro, encontrarAtitude, OBRIGATORIAS } from '../compatECL';
import { CriteriosComp } from './CriteriosComp';
import { RecuperacaoModulo } from '../types';
import { GuiaProducao } from './GuiaProducao';
import { SeletorIA } from './SeletorIA';

function getNomeComp(id: string): string {
  if (id.startsWith('OBR_')) return OBRIGATORIAS.find(o => o.id === id)?.nome || id;
  if (id.startsWith('ATT_')) return encontrarAtitude(id)?.nome || id;
  return encontrarMicro(id)?.nome || id;
}

const NIVEIS: { v: 'nao_demonstrada' | 'em_desenvolvimento' | 'consolidada' | 'avancada'; label: string; cor: string }[] = [
  { v: 'nao_demonstrada', label: 'Não demonstrada', cor: 'var(--danger)' },
  { v: 'em_desenvolvimento', label: 'Em desenvolvimento', cor: 'var(--copper)' },
  { v: 'consolidada', label: 'Consolidada', cor: 'var(--sage)' },
  { v: 'avancada', label: 'Avançada', cor: '#2980b9' },
];

export function GestaoRecuperacoes({ turmaId, nomeProfessor }: { turmaId: string; nomeProfessor?: string }) {
  const [tab, setTab] = useState<'pendentes' | 'submetidas' | 'concluidas'>('submetidas');
  const [refresh, setRefresh] = useState(0);
  const [activa, setActiva] = useState<RecuperacaoModulo | null>(null);

  const todas = getRecuperacoesPorTurma(turmaId);
  const alunos = getAlunos().filter(a => a.turmaId === turmaId);

  const pendentes = todas.filter(r => r.estado === 'pendente');
  const submetidas = todas.filter(r => r.estado === 'submetida' || r.estado === 'em_avaliacao');
  const concluidas = todas.filter(r => r.estado === 'concluida');

  function nomeAluno(alunoId: string) {
    const a = alunos.find(x => x.id === alunoId);
    return a ? `${a.numero} — ${a.nome || 'Aluno ' + a.numero}` : alunoId;
  }

  if (activa) {
    return <AvaliarRecuperacao recuperacao={activa} nomeAluno={nomeAluno(activa.alunoId)} nomeProfessor={nomeProfessor}
      onVoltar={() => { setActiva(null); setRefresh(r => r + 1); }} />;
  }

  return (
    <div style={{ background: 'var(--recuperacao-pale)', borderRadius: 16, padding: 16 }}>
      <div style={{ background: 'var(--recuperacao)', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'white' }}>
          🔄 Gestão de Recuperações
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
          Trabalhos de recuperação submetidos pelos alunos, por validar.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button onClick={() => setTab('pendentes')} className={`tab-btn${tab === 'pendentes' ? ' active' : ''}`} style={{ flex: 1 }}>
          Pendentes ({pendentes.length})
        </button>
        <button onClick={() => setTab('submetidas')} className={`tab-btn${tab === 'submetidas' ? ' active' : ''}`} style={{ flex: 1 }}>
          Submetidas ({submetidas.length})
        </button>
        <button onClick={() => setTab('concluidas')} className={`tab-btn${tab === 'concluidas' ? ' active' : ''}`} style={{ flex: 1 }}>
          Concluídas ({concluidas.length})
        </button>
      </div>

      {tab === 'pendentes' && (
        <Lista items={pendentes} nomeAluno={nomeAluno} vazio="Nenhuma recuperação atribuída por fazer." onClick={setActiva} />
      )}
      {tab === 'submetidas' && (
        <Lista items={submetidas} nomeAluno={nomeAluno} vazio="Nenhum trabalho à espera de avaliação." onClick={setActiva} />
      )}
      {tab === 'concluidas' && (
        <ListaHistorico items={concluidas} nomeAluno={nomeAluno} onClick={setActiva} />
      )}
    </div>
  );
}

function ListaHistorico({ items, nomeAluno, onClick }: { items: RecuperacaoModulo[]; nomeAluno: (id: string) => string; onClick: (r: RecuperacaoModulo) => void }) {
  if (items.length === 0) {
    return <div style={{ padding: '30px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>Ainda não há recuperações concluídas.</div>;
  }
  const ordenadas = [...items].sort((a, b) => (b.dataValidacao || '').localeCompare(a.dataValidacao || ''));
  return (
    <div>
      {ordenadas.map(r => {
        const nConsolidadas = (r.avaliacaoCompetencias || []).filter(a => a.nivel === 'consolidada' || a.nivel === 'avancada').length;
        const nTotal = (r.avaliacaoCompetencias || []).length;
        return (
          <div key={r.id} className="option-card" onClick={() => onClick(r)} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{nomeAluno(r.alunoId)}</div>
                <div className="muted" style={{ fontSize: 12 }}>{r.numeroRecuperacao ? `#${r.numeroRecuperacao} · ` : ""}{r.ucId} — {r.ucNome}</div>
                <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 2 }}>
                  {nConsolidadas}/{nTotal} competências consolidadas
                </div>
                <div style={{ fontSize: 10, color: 'rgba(26,23,20,0.4)', marginTop: 4 }}>
                  Atribuída: {r.dataAtribuicao ? new Date(r.dataAtribuicao).toLocaleDateString('pt-PT') : '—'}
                  {' · '}Submetida: {r.dataSubmissao ? new Date(r.dataSubmissao).toLocaleDateString('pt-PT') : '—'}
                  {' · '}Validada: {r.dataValidacao ? new Date(r.dataValidacao).toLocaleDateString('pt-PT') : '—'}
                  {r.professorAvaliador ? ` · por ${r.professorAvaliador}` : ''}
                </div>
              </div>
              <span className="stamp">Ver</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Lista({ items, nomeAluno, vazio, onClick }: { items: RecuperacaoModulo[]; nomeAluno: (id: string) => string; vazio: string; onClick: (r: RecuperacaoModulo) => void }) {
  if (items.length === 0) {
    return <div style={{ padding: '30px 0', textAlign: 'center', color: 'rgba(26,23,20,0.4)' }}>{vazio}</div>;
  }
  return (
    <div>
      {items.map(r => (
        <div key={r.id} className="option-card" onClick={() => onClick(r)} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{nomeAluno(r.alunoId)}</div>
              <div className="muted" style={{ fontSize: 12 }}>{r.numeroRecuperacao ? `#${r.numeroRecuperacao} · ` : ""}{r.ucId} — {r.ucNome}</div>
              <div style={{ fontSize: 11, color: 'var(--copper)' }}>{r.planosIds.length} aula(s) em falta</div>
              <div style={{ fontSize: 10, color: 'rgba(26,23,20,0.4)', marginTop: 2 }}>
                Atribuída em {r.dataAtribuicao ? new Date(r.dataAtribuicao).toLocaleDateString('pt-PT') : '—'}
                {r.dataSubmissao ? ` · submetida em ${new Date(r.dataSubmissao).toLocaleDateString('pt-PT')}` : ''}
              </div>
            </div>
            <span className="stamp">Ver</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AvaliarRecuperacao({ recuperacao, nomeAluno, nomeProfessor, onVoltar }: { recuperacao: RecuperacaoModulo; nomeAluno: string; nomeProfessor?: string; onVoltar: () => void }) {
  // refreshLocal força reler a recuperação mais recente do backend depois de
  // guardar a análise IA ou aprovar o plano — sem recarregar a página inteira
  // (que faria perder a sessão de login, como já aconteceu antes nesta app).
  const [refreshLocal, setRefreshLocal] = useState(0);
  const r = refreshLocal > 0
    ? (getRecuperacoesPorTurma(recuperacao.turmaId).find(x => x.id === recuperacao.id) || recuperacao)
    : recuperacao;
  const [niveis, setNiveis] = useState<Record<string, 'nao_demonstrada' | 'em_desenvolvimento' | 'consolidada' | 'avancada'>>(() => {
    const inicial: Record<string, any> = {};
    (r.avaliacaoCompetencias || []).forEach(a => { inicial[a.competenciaId] = a.nivel; });
    return inicial;
  });
  const [comentario, setComentario] = useState(r.comentarioProfessor || '');
  const [defesaOralRealizada, setDefesaOralRealizada] = useState(r.defesaOralRealizada || false);
  const [defesaOralNotas, setDefesaOralNotas] = useState(r.defesaOralNotas || '');
  const [guiaAberto, setGuiaAberto] = useState<string | null>(null);
  const [mostrarAnaliseIA, setMostrarAnaliseIA] = useState(false);
  const [colandoAnalise, setColandoAnalise] = useState(false);
  const [textoAnaliseColado, setTextoAnaliseColado] = useState('');
  const [copiadoAnalise, setCopiadoAnalise] = useState(false);
  const guias = getGuiasDaRecuperacao(r.planosIds);
  const promptAnalise = construirPromptAnalisePreliminar(r.id);

  function copiarPromptAnalise() {
    navigator.clipboard.writeText(promptAnalise).then(() => {
      setCopiadoAnalise(true);
      setTimeout(() => setCopiadoAnalise(false), 2000);
    });
  }

  function guardarAnaliseIA() {
    addOrUpdateRecuperacao({
      ...r,
      analiseIA: {
        relatorioConsistencia: textoAnaliseColado,
        lacunasDetetadas: [],
        sugestaoPerguntasDefesaOral: [],
        sugestaoEstado: 'suficiente_para_defesa',
        geradoEm: new Date().toISOString(),
      },
      atualizadoEm: new Date().toISOString(),
    });
    setColandoAnalise(false);
    setMostrarAnaliseIA(false);
    setRefreshLocal(k => k + 1);
  }

  // Grelha de avaliação cobre só Grupo A (técnicas) e Grupo B (responsabilidades).
  // Atitudes (Grupo C) NÃO entram aqui — ficam pendentes de observação futura,
  // nunca validadas por trabalho escrito (ver matrizEvidencias.ts).
  const todasComp = [...r.competenciasIds, ...r.responsabilidadesIds];
  const todasAvaliadas = todasComp.every(c => niveis[c]);

  function concluir() {
    if (!confirm('Concluir esta avaliação? O aluno vai ver o resultado.')) return;
    const agora = new Date().toISOString();
    const avaliacaoCompetencias = todasComp.map(c => ({ competenciaId: c, nivel: niveis[c] }));

    addOrUpdateRecuperacao({
      ...r,
      estado: 'concluida',
      avaliacaoCompetencias,
      comentarioProfessor: comentario,
      professorAvaliador: nomeProfessor || '',
      defesaOralRealizada,
      defesaOralNotas,
      defesaOralData: agora,
      dataValidacao: agora,
      atualizadoEm: agora,
    });

    // Registar no histórico — competências consolidadas/avançadas contam como sucesso
    avaliacaoCompetencias.forEach(a => {
      const nota = a.nivel === 'avancada' ? 18 : a.nivel === 'consolidada' ? 14 : a.nivel === 'em_desenvolvimento' ? 10 : 5;
      addRegistoAvaliacao({
        id: `recup_av_${r.id}_${a.competenciaId}_${Date.now()}`,
        alunoId: r.alunoId, turmaId: r.turmaId, planoAulaId: r.planosIds[0] || '',
        fichaId: '', ucId: r.ucId, microcompetenciaId: a.competenciaId,
        nota, data: agora, validadoPor: 'recuperacao',
      });
      // Ponto 16 da adenda: ligação explícita ao Banco de Evidências, com
      // origem 'recuperacao' identificável, separado do histórico de notas.
      const nivelEvidencia = a.nivel === 'avancada' ? 4 : a.nivel === 'consolidada' ? 3 : a.nivel === 'em_desenvolvimento' ? 2 : 1;
      addEvidencia({
        id: `ev_recup_${r.id}_${a.competenciaId}_${Date.now()}`,
        alunoId: r.alunoId,
        competenciaId: a.competenciaId,
        ucId: r.ucId,
        tipoEvidencia: defesaOralRealizada ? 'defesa_oral' : 'trabalho_pratico_documentado',
        nivel: nivelEvidencia,
        observacaoQualitativa: `Recuperação ${r.ucId} — ${comentario || 'sem comentário adicional'}`,
        professor: nomeProfessor || '',
        data: agora,
        criadoEm: agora,
      });
    });

    onVoltar();
  }

  return (
    <div>
      <button onClick={onVoltar} style={{ marginBottom: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
        ← Voltar
      </button>

      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{nomeAluno}</div>
      <div style={{ fontSize: 13, color: 'var(--copper)', fontWeight: 600, marginBottom: 16 }}>{r.numeroRecuperacao ? `#${r.numeroRecuperacao} · ` : ""}{r.ucId} — {r.ucNome}</div>

      {recuperacaoEstaTrancada(r) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--danger-pale)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, flex: 1 }}>🔒 Prazo de 1 mês terminado — o aluno já não consegue submeter</span>
          <button onClick={() => { destrancarRecuperacao(r.id); setRefreshLocal(k => k + 1); }}
            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--danger)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            Destrancar (+1 mês)
          </button>
        </div>
      )}

      {r.planoIndividualTexto && (
        <div style={{ marginBottom: 16, background: 'var(--copper-pale)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--copper)', marginBottom: 8 }}>
            🤖 Plano de Recuperação Individual (gerado por IA, único para este aluno)
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 10, fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 250, overflowY: 'auto', marginBottom: 8 }}>
            {r.planoIndividualTexto}
          </div>
          {!r.planoIndividualAprovado ? (
            <button onClick={() => { addOrUpdateRecuperacao({ ...r, planoIndividualAprovado: true, atualizadoEm: new Date().toISOString() }); setRefreshLocal(k => k + 1); }}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              ✓ Aprovar este plano para o aluno usar
            </button>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 700 }}>✓ Plano aprovado</div>
          )}
        </div>
      )}

      {guias.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sage)', marginBottom: 6 }}>
            📚 Guia(s) de Apoio desta recuperação (compara com o trabalho do aluno)
          </div>
          {guias.map(g => (
            <div key={g.fichaId} style={{ marginBottom: 6, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setGuiaAberto(guiaAberto === g.fichaId ? null : g.fichaId)}
                style={{ width: '100%', padding: '8px 10px', background: guiaAberto === g.fichaId ? 'var(--sage-pale)' : '#fff', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                📄 {g.nomePrato} {guiaAberto === g.fichaId ? '▲' : '▼'}
              </button>
              {guiaAberto === g.fichaId && (
                <div style={{ padding: 10, maxHeight: 400, overflowY: 'auto' }}>
                  <GuiaProducao textoGuia={g.textoGuia} nomePrato={g.nomePrato} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {r.trabalhoTeorico && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>B. Trabalho Teórico</div>
          <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap' }}>{r.trabalhoTeorico}</div>
        </div>
      )}
      {r.investigacao && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>C. Investigação</div>
          <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap' }}>{r.investigacao}</div>
        </div>
      )}
      {r.casoProfissional && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>D. Caso Profissional</div>
          <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap' }}>{r.casoProfissional}</div>
        </div>
      )}
      {r.autoavaliacao && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>E. Autoavaliação</div>
          <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap' }}>{r.autoavaliacao}</div>
        </div>
      )}

      {r.anexos && r.anexos.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>F. Evidências anexadas pelo aluno</div>
          {r.anexos.map((a, i) => {
            const icones: Record<string, string> = { foto: '📷', video: '🎥', audio: '🎙️', documento: '📄', link: '🔗' };
            return (
              <a key={i} href={a.url} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--cream-dark)', borderRadius: 8, marginBottom: 4, fontSize: 12, color: 'var(--copper)' }}>
                <span>{icones[a.tipo]}</span>
                <span>{a.descricao || a.url}</span>
              </a>
            );
          })}
        </div>
      )}

      {/* Análise Preliminar por IA (pontos 11-13 da adenda) — apoio, nunca decisão final */}
      <div style={{ marginBottom: 18, border: '1px solid rgba(90,122,78,0.3)', borderRadius: 10, overflow: 'hidden' }}>
        <button onClick={() => setMostrarAnaliseIA(!mostrarAnaliseIA)}
          style={{ width: '100%', padding: '10px 14px', background: 'var(--sage-pale)', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔍</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: 'var(--sage)' }}>Análise Preliminar com IA (apoio à decisão)</span>
          <span style={{ fontSize: 12 }}>{mostrarAnaliseIA ? '▲' : '▼'}</span>
        </button>
        {mostrarAnaliseIA && (
          <div style={{ padding: 14 }}>
            {!r.analiseIA ? (
              <>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.55)', marginBottom: 8 }}>
                  A IA não decide a nota — só ajuda a preparar a defesa oral e a identificar lacunas. Abre directo no Claude (já preenchido) ou copia para outra IA.
                </div>
                <div style={{ background: 'var(--cream-dark)', borderRadius: 8, padding: 10, fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
                  {promptAnalise}
                </div>
                <SeletorIA prompt={promptAnalise} corPrincipal="var(--recuperacao)" />
                <button onClick={copiarPromptAnalise} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--sage)', background: copiadoAnalise ? 'var(--sage)' : '#fff', color: copiadoAnalise ? 'white' : 'var(--sage)', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginBottom: 8 }}>
                  {copiadoAnalise ? '✓ Copiado!' : '📋 Copiar prompt'}
                </button>
                {!colandoAnalise ? (
                  <button onClick={() => setColandoAnalise(true)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Já tenho a análise da IA →
                  </button>
                ) : (
                  <>
                    <textarea value={textoAnaliseColado} onChange={e => setTextoAnaliseColado(e.target.value)}
                      placeholder="Cola aqui a análise que a IA devolveu..."
                      style={{ width: '100%', minHeight: 120, borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 12, marginBottom: 8 }} />
                    <button onClick={guardarAnaliseIA} disabled={!textoAnaliseColado}
                      style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: textoAnaliseColado ? 1 : 0.4 }}>
                      Guardar Análise
                    </button>
                  </>
                )}
              </>
            ) : (
              <div style={{ background: '#fff', borderRadius: 8, padding: 10, fontSize: 12, whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
                {r.analiseIA.relatorioConsistencia}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--copper)', marginBottom: 10, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        Grelha de Avaliação — Competências Técnicas e Responsabilidades
      </div>
      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)', marginBottom: 12 }}>
        Apenas estas competências determinam se a UC fica completa. As atitudes transversais ficam registadas em baixo, sem bloquear a conclusão.
      </div>

      {todasComp.map(compId => (
        <div key={compId} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{getNomeComp(compId)}</div>
          <CriteriosComp compId={compId} cor="var(--copper)" />
          <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {NIVEIS.map(n => (
              <button key={n.v} onClick={() => setNiveis(prev => ({ ...prev, [compId]: n.v }))}
                style={{
                  padding: '6px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: niveis[compId] === n.v ? 'none' : '1px solid var(--border)',
                  background: niveis[compId] === n.v ? n.cor : '#fff',
                  color: niveis[compId] === n.v ? 'white' : 'rgba(26,23,20,0.6)',
                }}>
                {n.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 14, marginBottom: 14, padding: 14, background: 'var(--copper-pale)', borderRadius: 10, border: '1px solid rgba(181,101,29,0.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'var(--copper)' }}>
          🗣️ Defesa Oral (3-5 minutos) — obrigatória
        </div>
        <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.55)', marginBottom: 10 }}>
          Nenhuma recuperação deve ser validada só com base no trabalho escrito. Faz estas perguntas ao aluno para confirmar que compreende o que escreveu.
        </div>
        {(r.perguntasDefesaOral || []).map((p, i) => (
          <div key={i} style={{ fontSize: 12, padding: '6px 10px', background: '#fff', borderRadius: 6, marginBottom: 4 }}>
            {i + 1}. {p.pergunta}
          </div>
        ))}
        <textarea value={defesaOralNotas} onChange={e => setDefesaOralNotas(e.target.value)}
          placeholder="Notas sobre as respostas do aluno na defesa oral..."
          style={{ width: '100%', minHeight: 60, borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 12, marginTop: 8, marginBottom: 8 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={defesaOralRealizada} onChange={e => setDefesaOralRealizada(e.target.checked)} />
          Confirmo que realizei a defesa oral com o aluno
        </label>
      </div>

      {r.atitudesIds.length > 0 && (
        <div style={{ marginTop: 14, marginBottom: 14, padding: 14, background: 'var(--cream-dark)', borderRadius: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'rgba(26,23,20,0.7)' }}>
            🪞 Atitudes Transversais — pendentes de observação futura
          </div>
          <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)', marginBottom: 8 }}>
            Não bloqueiam esta recuperação. Serão observadas em qualquer aula futura (desta ou de outra UC) e registadas no perfil do aluno através do Banco de Evidências.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {r.atitudesIds.map(aId => (
              <span key={aId} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: '#fff', border: '1px solid var(--border)', color: 'rgba(26,23,20,0.6)' }}>
                {getNomeComp(aId)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Comentário (opcional)</div>
        <textarea value={comentario} onChange={e => setComentario(e.target.value)}
          style={{ width: '100%', minHeight: 70, borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 13 }} />
      </div>

      <button onClick={concluir} disabled={!todasAvaliadas || !defesaOralRealizada}
        style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 10, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: (todasAvaliadas && defesaOralRealizada) ? 1 : 0.4 }}>
        {!todasAvaliadas ? `Falta avaliar ${todasComp.filter(c => !niveis[c]).length} competência(s)`
          : !defesaOralRealizada ? '🗣️ Confirma a defesa oral primeiro'
          : '✓ Concluir Avaliação'}
      </button>
    </div>
  );
}

export default GestaoRecuperacoes;
