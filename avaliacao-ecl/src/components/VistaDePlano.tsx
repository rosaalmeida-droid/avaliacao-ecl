import React, { useState } from 'react';
import { PlanoAula, FichaProducao } from '../types';
import {
  addOrUpdatePlanoAula, getFichasProducao, addOrUpdateFichaProducao,
  getRequisicaoPorPlano, getAlunos,
} from '../backend';
import {
  MICROCOMPETENCIAS, ATITUDES, OBRIGATORIAS,
  microsPorUC,
} from '../competenciasECL';
import ProfessorView from './ProfessorView';
import Requisicao from './Requisicao';
import { ValidacaoView } from './ValidacaoView';

// ── Tipos ─────────────────────────────────────────────────────
type Modulo = 'inicio' | 'ficha' | 'guia' | 'requisicao' | 'validacao';

interface Props {
  plano: PlanoAula;
  turmaId: string;
  nomeProfessor: string;
  onVoltar: () => void;
  onPlanoActualizado: (p: PlanoAula) => void;
  onAlteracao?: () => void;
  onGuardado?: () => void;
}

// ── Cabeçalho do Plano ────────────────────────────────────────
function CabecalhoPlano({ plano, onVoltar }: { plano: PlanoAula; onVoltar: () => void }) {
  const d = new Date(plano.data + 'T12:00:00');
  const diaSemana = d.toLocaleDateString('pt-PT', { weekday: 'long' });
  const dataFormatada = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ background: 'var(--charcoal)', borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
      {/* Botão voltar */}
      <button onClick={onVoltar} style={{ background: 'rgba(247,241,230,0.1)', border: 'none', borderRadius: 8, padding: '5px 12px', color: 'rgba(247,241,230,0.7)', fontSize: 12, cursor: 'pointer', marginBottom: 12 }}>
        ← Todos os planos
      </button>

      {/* Identificação clara do plano */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Data em destaque */}
        <div style={{ background: 'var(--copper)', borderRadius: 12, padding: '10px 14px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'white', lineHeight: 1 }}>
            {d.getDate().toString().padStart(2, '0')}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontWeight: 600 }}>
            {d.toLocaleDateString('pt-PT', { month: 'short' })}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
            {d.getFullYear()}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(247,241,230,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            {diaSemana} · {plano.horaInicio}–{plano.horaFim} · {plano.turmaId}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--cream)', lineHeight: 1.2, marginBottom: 6 }}>
            {plano.titulo || `Aula de ${plano.ucNome || plano.ucId || 'Cozinha'}`}
          </div>

          {/* UC */}
          {plano.ucId && (
            <div style={{ display: 'inline-block', background: 'rgba(181,101,29,0.3)', borderRadius: 8, padding: '4px 10px' }}>
              <span style={{ fontSize: 10, color: 'rgba(247,241,230,0.5)', textTransform: 'uppercase' }}>UC </span>
              <span style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600 }}>{plano.ucId}</span>
              <span style={{ fontSize: 11, color: 'rgba(247,241,230,0.6)', marginLeft: 6 }}>{plano.ucNome}</span>
            </div>
          )}
        </div>

        {/* Estado */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: plano.estado === 'publicado' ? 'var(--sage)' : 'rgba(247,241,230,0.15)', color: 'white', fontWeight: 600 }}>
            {plano.estado === 'publicado' ? '✓ Publicado' : plano.estado === 'fichas_pendentes' ? 'Fichas pendentes' : 'Rascunho'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Módulo card ───────────────────────────────────────────────
function ModuloCard({ icone, titulo, descricao, estado, cor, onClick, desativado }: {
  icone: string; titulo: string; descricao: string;
  estado: 'pendente' | 'em_curso' | 'concluido' | 'bloqueado';
  cor: string; onClick: () => void; desativado?: boolean;
}) {
  const cores = {
    pendente: { bg: '#fff', border: 'var(--border)', icon: 'rgba(26,23,20,0.2)' },
    em_curso: { bg: `${cor}10`, border: cor, icon: cor },
    concluido: { bg: 'var(--sage-pale)', border: 'var(--sage)', icon: 'var(--sage)' },
    bloqueado: { bg: 'var(--cream-dark)', border: 'var(--border)', icon: 'rgba(26,23,20,0.15)' },
  };
  const c = cores[estado];

  return (
    <div onClick={desativado ? undefined : onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      borderRadius: 14, border: `1.5px solid ${c.border}`, background: c.bg,
      cursor: desativado ? 'not-allowed' : 'pointer', marginBottom: 10,
      opacity: estado === 'bloqueado' ? 0.5 : 1,
      transition: 'all 0.15s',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: estado === 'concluido' ? 'var(--sage)' : `${cor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {estado === 'concluido' ? '✓' : icone}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: estado === 'bloqueado' ? 'rgba(26,23,20,0.4)' : 'var(--charcoal)' }}>{titulo}</div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>{descricao}</div>
      </div>
      {estado !== 'bloqueado' && (
        <span style={{ fontSize: 20, color: estado === 'concluido' ? 'var(--sage)' : cor }}>›</span>
      )}
    </div>
  );
}

// ── Modal de próximo passo ────────────────────────────────────
function ModalProximoPasso({ titulo, opcoes, onEscolha }: {
  titulo: string;
  opcoes: { label: string; icone: string; valor: string; destaque?: boolean }[];
  onEscolha: (valor: string) => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%' }}>
        <div style={{ fontWeight: 700, fontSize: 17, textAlign: 'center', marginBottom: 16 }}>{titulo}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {opcoes.map(op => (
            <button key={op.valor} onClick={() => onEscolha(op.valor)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              borderRadius: 12, border: `1.5px solid ${op.destaque ? 'var(--copper)' : 'var(--border)'}`,
              background: op.destaque ? 'var(--copper-pale)' : '#fff',
              cursor: 'pointer', fontSize: 14, fontWeight: op.destaque ? 700 : 500,
              color: op.destaque ? 'var(--copper)' : 'var(--charcoal)',
            }}>
              <span style={{ fontSize: 20 }}>{op.icone}</span>
              {op.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// VISTA DEDICADA AO PLANO
// ════════════════════════════════════════════════════════════════
export function VistaDePlano({ plano, turmaId, nomeProfessor, onVoltar, onPlanoActualizado, onAlteracao, onGuardado }: Props) {
  const [modulo, setModulo] = useState<Modulo>('inicio');
  const [modalProximo, setModalProximo] = useState<string | null>(null);
  const [fichaActiva, setFichaActiva] = useState<string | null>(null);

  const fichasDoPlano = getFichasProducao().filter(f => plano.fichasIds.includes(f.id));
  const requisicao = getRequisicaoPorPlano(plano.id);
  const temFichas = fichasDoPlano.length > 0;
  const temRequisicao = !!requisicao;
  const publicado = plano.estado === 'publicado';

  // Determinar estados dos módulos
  function estadoModulo(m: string) {
    if (m === 'ficha') return temFichas ? 'concluido' : 'pendente';
    if (m === 'guia') {
      if (!temFichas) return 'bloqueado';
      const temGuia = fichasDoPlano.some(f => (f as any).textoGuia);
      return temGuia ? 'concluido' : 'pendente';
    }
    if (m === 'requisicao') return !temFichas ? 'bloqueado' : temRequisicao ? 'concluido' : 'pendente';
    if (m === 'validacao') return !temFichas ? 'bloqueado' : 'pendente';
    return 'pendente';
  }

  function publicar() {
    const p = { ...plano, estado: 'publicado' as const, atualizadoEm: new Date().toISOString() };
    addOrUpdatePlanoAula(p);
    onPlanoActualizado(p);
  }

  // Após criar ficha — perguntar próximo passo
  function aposGuardarFicha() {
    onGuardado?.();
    setModalProximo('apos_ficha');
  }

  // ── Renderizar módulo activo ──────────────────────────────────
  if (modulo === 'ficha') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} />
        <div style={{ background: 'var(--copper-pale)', borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: 'var(--copper)', fontWeight: 600 }}>
          📄 A criar Ficha de Produção para este plano — será associada automaticamente
        </div>
        <ProfessorView
          turmaId={turmaId}
          nomeProfessor={nomeProfessor}
          planoId={plano.id}
          onAlteracao={onAlteracao}
          onGuardado={aposGuardarFicha}
        />
        {modalProximo === 'apos_ficha' && (
          <ModalProximoPasso
            titulo="Ficha guardada! Qual é o próximo passo?"
            opcoes={[
              { label: 'Criar Guia de Apoio à Produção', icone: '📚', valor: 'guia', destaque: true },
              { label: 'Criar outra Ficha de Produção', icone: '📄', valor: 'nova_ficha' },
              { label: 'Criar Requisição', icone: '🛒', valor: 'requisicao' },
              { label: 'Voltar ao Plano de Aula', icone: '←', valor: 'inicio' },
            ]}
            onEscolha={v => {
              setModalProximo(null);
              if (v === 'guia') setModulo('guia');
              else if (v === 'nova_ficha') setModulo('ficha');
              else if (v === 'requisicao') setModulo('requisicao');
              else setModulo('inicio');
            }}
          />
        )}
      </div>
    );
  }

  if (modulo === 'guia') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} />
        <div style={{ background: 'rgba(90,122,78,0.1)', borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>
          📚 Guia de Apoio à Produção — documento pedagógico separado da ficha
        </div>
        <ProfessorView
          turmaId={turmaId}
          nomeProfessor={nomeProfessor}
          planoId={plano.id}
          modoGuia={true}
          onAlteracao={onAlteracao}
          onGuardado={() => {
            onGuardado?.();
            setModalProximo('apos_guia');
          }}
        />
        {modalProximo === 'apos_guia' && (
          <ModalProximoPasso
            titulo="Guia criado! Qual é o próximo passo?"
            opcoes={[
              { label: 'Criar Requisição', icone: '🛒', valor: 'requisicao', destaque: true },
              { label: 'Criar outra Ficha de Produção', icone: '📄', valor: 'nova_ficha' },
              { label: 'Voltar ao Plano de Aula', icone: '←', valor: 'inicio' },
            ]}
            onEscolha={v => {
              setModalProximo(null);
              if (v === 'requisicao') setModulo('requisicao');
              else if (v === 'nova_ficha') setModulo('ficha');
              else setModulo('inicio');
            }}
          />
        )}
      </div>
    );
  }

  if (modulo === 'requisicao') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} />
        <Requisicao nomeProfessor={nomeProfessor} planoIdFixo={plano.id} />
      </div>
    );
  }

  if (modulo === 'validacao') {
    return (
      <div>
        <CabecalhoPlano plano={plano} onVoltar={() => setModulo('inicio')} />
        <ValidacaoView turmaId={turmaId} planoId={plano.id} />
      </div>
    );
  }

  const [tabInicio, setTabInicio] = useState<'resumo' | 'competencias'>('resumo');

  // Competências do plano — geridas pelo professor
  // Carregar do plano ou calcular a partir da UC
  const [compRemovidas, setCompRemovidas] = useState<string[]>((plano as any).compRemovidas || []);
  const [compAdicionadas, setCompAdicionadas] = useState<string[]>((plano as any).compAdicionadas || []);

  // Calcular competências sugeridas para esta UC
  const microsDaUC = plano.ucId ? microsPorUC(plano.ucId) : MICROCOMPETENCIAS.filter(m => m.prioridade === 'A');
  const tecnicasSugeridas = fichasDoPlano.flatMap(f => (f as any).tecnicasSugeridas || []);

  // Competências que o aluno vai receber
  const compObrigatorias = OBRIGATORIAS; // estas nunca se removem
  const compTecnicas = microsDaUC.slice(0, 6).filter(m => !compRemovidas.includes(m.id));
  const compAtitudes = ATITUDES.filter(a => a.prioridade === 'permanente' || a.prioridade === 'recorrente').slice(0, 4).filter(a => !compRemovidas.includes(a.id));
  const totalComp = compObrigatorias.length + compTecnicas.length + compAtitudes.length + compAdicionadas.length;

  function guardarCompetencias(removidas: string[], adicionadas: string[]) {
    setCompRemovidas(removidas);
    setCompAdicionadas(adicionadas);
    const p = { ...plano, compRemovidas: removidas, compAdicionadas: adicionadas, atualizadoEm: new Date().toISOString() } as any;
    addOrUpdatePlanoAula(p);
    onPlanoActualizado(p);
  }

  // ── INÍCIO — visão geral do plano ─────────────────────────────
  return (
    <div>
      <CabecalhoPlano plano={plano} onVoltar={onVoltar} />

      {/* Tabs dentro do plano */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button onClick={() => setTabInicio('resumo')} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tabInicio === 'resumo' ? 'var(--charcoal)' : 'transparent', color: tabInicio === 'resumo' ? 'white' : 'rgba(26,23,20,0.5)' }}>
          📋 Resumo
        </button>
        <button onClick={() => setTabInicio('competencias')} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tabInicio === 'competencias' ? 'var(--charcoal)' : 'transparent', color: tabInicio === 'competencias' ? 'white' : 'rgba(26,23,20,0.5)' }}>
          🎯 Competências ({totalComp})
        </button>
      </div>

      {/* TAB COMPETÊNCIAS */}
      {tabInicio === 'competencias' && (
        <div>
          {/* Info */}
          <div style={{ padding: '10px 14px', background: 'var(--copper-pale)', borderRadius: 10, fontSize: 12, color: 'var(--copper)', marginBottom: 14, border: '1px solid rgba(181,101,29,0.2)' }}>
            <strong>{totalComp} competências</strong> no total para esta aula. As obrigatórias (higiene, HACCP, assiduidade) não podem ser removidas. As restantes podem ser ajustadas.
          </div>

          {/* OBRIGATÓRIAS — não removíveis */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sage)', marginBottom: 8 }}>
              🔒 Obrigatórias — sempre presentes
            </div>
            {compObrigatorias.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--sage-pale)', marginBottom: 6, border: '1px solid rgba(90,122,78,0.2)' }}>
                <span style={{ fontSize: 14 }}>✓</span>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.nome}</div>
                <span style={{ fontSize: 10, color: 'var(--sage)', fontWeight: 600 }}>SEMPRE</span>
              </div>
            ))}
          </div>

          {/* TÉCNICAS sugeridas pela UC */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--copper)', marginBottom: 8 }}>
              🔬 Técnicas — sugeridas pela UC {plano.ucId}
            </div>
            {microsDaUC.slice(0, 8).map(m => {
              const removida = compRemovidas.includes(m.id);
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: removida ? 'var(--cream-dark)' : 'var(--copper-pale)', marginBottom: 6, border: `1px solid ${removida ? 'var(--border)' : 'rgba(181,101,29,0.2)'}`, opacity: removida ? 0.5 : 1 }}>
                  <span style={{ fontSize: 14 }}>{removida ? '○' : '●'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{m.nome}</div>
                    {m.criterios.length > 0 && <div style={{ fontSize: 10, color: 'rgba(26,23,20,0.4)' }}>{m.criterios.length} critérios observáveis</div>}
                  </div>
                  <button onClick={() => {
                    const novas = removida
                      ? compRemovidas.filter(x => x !== m.id)
                      : [...compRemovidas, m.id];
                    guardarCompetencias(novas, compAdicionadas);
                  }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.2)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.4)', cursor: 'pointer', fontWeight: 600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ATITUDES */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8e44ad', marginBottom: 8 }}>
              💡 Atitudes — sugeridas para esta aula
            </div>
            {ATITUDES.filter(a => a.prioridade === 'permanente' || a.prioridade === 'recorrente').slice(0, 6).map(a => {
              const removida = compRemovidas.includes(a.id);
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: removida ? 'var(--cream-dark)' : 'rgba(142,68,173,0.06)', marginBottom: 6, border: `1px solid ${removida ? 'var(--border)' : 'rgba(142,68,173,0.15)'}`, opacity: removida ? 0.5 : 1 }}>
                  <span style={{ fontSize: 14 }}>{removida ? '○' : '●'}</span>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: removida ? 400 : 500, textDecoration: removida ? 'line-through' : 'none' }}>{a.nome}</div>
                  <button onClick={() => {
                    const novas = removida
                      ? compRemovidas.filter(x => x !== a.id)
                      : [...compRemovidas, a.id];
                    guardarCompetencias(novas, compAdicionadas);
                  }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${removida ? 'var(--sage)' : 'rgba(26,23,20,0.2)'}`, background: removida ? 'var(--sage)' : 'transparent', color: removida ? 'white' : 'rgba(26,23,20,0.4)', cursor: 'pointer', fontWeight: 600 }}>
                    {removida ? '+ Incluir' : '− Remover'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Resumo */}
          <div style={{ padding: '12px 14px', background: 'var(--cream-dark)', borderRadius: 10, fontSize: 12, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Total: {totalComp} competências</div>
            <div style={{ color: 'rgba(26,23,20,0.5)' }}>
              {compObrigatorias.length} obrigatórias · {compTecnicas.length} técnicas · {compAtitudes.length} atitudes
              {compRemovidas.length > 0 && ` · ${compRemovidas.length} removida${compRemovidas.length > 1 ? 's' : ''}`}
            </div>
            {totalComp > 7 && (
              <div style={{ color: 'var(--copper)', marginTop: 6, fontWeight: 600 }}>
                ⚠️ São muitas competências para uma aula. Considera remover algumas.
              </div>
            )}
            {totalComp <= 5 && (
              <div style={{ color: 'var(--sage)', marginTop: 6, fontWeight: 600 }}>
                ✓ Número adequado para uma aula.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB RESUMO */}
      {tabInicio === 'resumo' && (<>

      {/* Fichas associadas */}
      {fichasDoPlano.length > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--cream-dark)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(26,23,20,0.4)', marginBottom: 8 }}>
            Fichas de Produção — {fichasDoPlano.length}
          </div>
          {fichasDoPlano.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nomePrato}</div>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>{f.classificacao} · {f.numPorcoes} doses</div>
              </div>
              {(f as any).textoGuia && <span style={{ fontSize: 10, color: 'var(--sage)', fontWeight: 600 }}>+ Guia ✓</span>}
            </div>
          ))}
        </div>
      )}

      {/* Módulos */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(26,23,20,0.4)', marginBottom: 10 }}>
          Construir esta aula
        </div>

        <ModuloCard icone="📄" titulo="Ficha de Produção" cor="var(--copper)"
          descricao={temFichas ? `${fichasDoPlano.length} ficha${fichasDoPlano.length > 1 ? 's' : ''} criada${fichasDoPlano.length > 1 ? 's' : ''} — adicionar mais?` : 'Criar ficha com ingredientes, preparação e HACCP'}
          estado={estadoModulo('ficha') as any}
          onClick={() => setModulo('ficha')} />

        <ModuloCard icone="📚" titulo="Guia de Apoio à Produção" cor="var(--sage)"
          descricao={!temFichas ? 'Cria primeiro uma Ficha de Produção' : 'Documento pedagógico com rendimentos, food cost e questões'}
          estado={estadoModulo('guia') as any}
          desativado={!temFichas}
          onClick={() => temFichas && setModulo('guia')} />

        <ModuloCard icone="🛒" titulo="Requisição" cor="#2980b9"
          descricao={!temFichas ? 'Cria primeiro uma Ficha de Produção' : temRequisicao ? 'Requisição criada — ver ou editar' : 'Consolidar ingredientes para a aula'}
          estado={estadoModulo('requisicao') as any}
          desativado={!temFichas}
          onClick={() => temFichas && setModulo('requisicao')} />

        <ModuloCard icone="✓" titulo="Validação e Avaliação" cor="#8e44ad"
          descricao={!temFichas ? 'Cria primeiro uma Ficha de Produção' : 'Validar autoavaliações dos alunos'}
          estado={estadoModulo('validacao') as any}
          desativado={!temFichas}
          onClick={() => temFichas && setModulo('validacao')} />
      </div>

      {/* Publicar */}
      <div style={{ padding: '14px 16px', borderRadius: 14, border: `2px solid ${publicado ? 'var(--sage)' : 'var(--copper)'}`, background: publicado ? 'var(--sage-pale)' : 'var(--copper-pale)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: publicado ? 'var(--sage)' : 'var(--copper)' }}>
          {publicado ? '✓ Aula publicada para os alunos' : '🚀 Gerar para os alunos'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: publicado ? 0 : 10 }}>
          {publicado ? 'Os alunos já podem ver e registar a autoavaliação desta aula.' : 'Quando estiver tudo pronto, publica para os alunos poderem aceder.'}
        </div>
        {!publicado && (
          <button onClick={publicar} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🚀 Publicar esta aula para os alunos
          </button>
        )}
      </div>
      </>)}
    </div>
  );
}

