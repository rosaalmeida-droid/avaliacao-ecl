// ============================================================
// PainelContextual.tsx
// Painel fixo à direita para o professor.
// Sempre visível em desktop (> 768px), escondido no mobile.
// As tabs trocam o conteúdo silenciosamente — sem animações.
// O contexto (plano, turma, UC) vem do App via props.
// ============================================================

import React, { useState } from 'react';
import { PlanoAula } from '../types';
import { getAvisosPendentes } from '../backend';
import { CentroAvisos } from './CentroAvisos';
import { CronogramaTab } from './CronogramaTab';
import { DicionarioComp } from './DicionarioComp';

const COR = '#B5651D';
const COR_PALE = 'rgba(181,101,29,0.10)';

// ── Tipos ─────────────────────────────────────────────────────
type TabId = 'competencias' | 'kitchenflow' | 'avisos' | 'comentario' | 'dicionario' | 'cronograma';

interface Tab {
  id: TabId;
  emoji: string;
  label: string;
  badge?: number;
}

export interface ContextoPainel {
  turmaId: string;
  nomeProfessor: string;
  plano?: PlanoAula;
  ucId?: string;
  alunoNome?: string;
}

interface Props {
  contexto: ContextoPainel;
  isMobile?: boolean;
}

// ── Comentários locais ────────────────────────────────────────
const CHAVE_COMENTS = 'ecl_painel_comentarios';

function carregarComentarios(): Record<string, { aula: string; aluno: Record<string, string> }> {
  try { return JSON.parse(localStorage.getItem(CHAVE_COMENTS) || '{}'); } catch { return {}; }
}

function guardarComentarios(d: Record<string, { aula: string; aluno: Record<string, string> }>) {
  try { localStorage.setItem(CHAVE_COMENTS, JSON.stringify(d)); } catch {}
}

// ── Tab: Competências ─────────────────────────────────────────
function TabCompetencias({ plano }: { plano?: PlanoAula }) {
  if (!plano) {
    return (
      <div style={{ padding: 16, color: 'rgba(26,23,20,0.4)', fontSize: 12, textAlign: 'center', marginTop: 32 }}>
        Abre um plano de aula para ver as competências associadas.
      </div>
    );
  }

  const compRemovidas: string[] = (plano as any).compRemovidas || [];
  const compAdicionadas: string[] = (plano as any).compAdicionadas || [];

  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COR, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        {plano.ucId || 'UC'} — {plano.titulo}
      </div>

      {/* Obrigatórias */}
      <div style={{ fontSize: 10, color: 'rgba(26,23,20,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        Obrigatórias
      </div>
      {['Higiene pessoal', 'Higiene e Segurança Alimentar', 'Assiduidade e pontualidade'].map(n => (
        <div key={n} style={{ fontSize: 11, color: 'rgba(26,23,20,0.6)', padding: '4px 0', borderBottom: '0.5px solid rgba(26,23,20,0.06)', display: 'flex', gap: 5 }}>
          <span style={{ color: '#0f766e' }}>✓</span>{n}
        </div>
      ))}

      {/* Técnicas e subtécnicas */}
      {!compRemovidas.length && !compAdicionadas.length ? (
        <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.35)', marginTop: 10, fontStyle: 'italic' }}>
          Define as competências no plano para as ver aqui.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 10, color: 'rgba(26,23,20,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 10, marginBottom: 4 }}>
            Adicionadas ({compAdicionadas.length})
          </div>
          {compAdicionadas.map(id => (
            <div key={id} style={{ fontSize: 11, color: 'rgba(26,23,20,0.7)', padding: '4px 0', borderBottom: '0.5px solid rgba(26,23,20,0.06)', display: 'flex', gap: 5 }}>
              <span style={{ color: COR }}>●</span>{id}
            </div>
          ))}
          {compRemovidas.length > 0 && (
            <div style={{ fontSize: 10, color: 'rgba(26,23,20,0.35)', marginTop: 6 }}>
              {compRemovidas.length} removida{compRemovidas.length !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}

      {(plano as any).criteriosCongelados && (
        <div style={{ marginTop: 10, padding: '6px 8px', background: '#EDE9FE', borderRadius: 6, fontSize: 10, color: '#5B21B6', fontWeight: 600 }}>
          🏁 Aula realizada · critérios congelados
        </div>
      )}
    </div>
  );
}

// ── Tab: Comentários ──────────────────────────────────────────
function TabComentario({ plano, nomeProfessor }: { plano?: PlanoAula; nomeProfessor: string }) {
  const planoId = plano?.id || '';
  const [coments, setComents] = useState(carregarComentarios);
  const comentPlano = coments[planoId] || { aula: '', aluno: {} };
  const [saved, setSaved] = useState(false);

  function guardar(aula: string) {
    const novo = { ...coments, [planoId]: { ...comentPlano, aula } };
    setComents(novo);
    guardarComentarios(novo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!plano) {
    return (
      <div style={{ padding: 16, color: 'rgba(26,23,20,0.4)', fontSize: 12, textAlign: 'center', marginTop: 32 }}>
        Abre um plano para deixar comentários.
      </div>
    );
  }

  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)', marginBottom: 8 }}>
        📝 Nota sobre esta aula
      </div>
      <textarea
        value={comentPlano.aula}
        onChange={e => guardar(e.target.value)}
        placeholder="Como correu a aula? Observações gerais..."
        rows={5}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(26,23,20,0.12)',
          fontSize: 12, resize: 'vertical', fontFamily: 'inherit', background: 'rgba(26,23,20,0.02)',
          color: 'rgba(26,23,20,0.8)', lineHeight: 1.5,
        }}
      />
      {saved && <div style={{ fontSize: 11, color: '#0f766e', marginTop: 4 }}>✓ Guardado</div>}

      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,23,20,0.5)', marginTop: 14, marginBottom: 8 }}>
        👤 Notas por aluno
      </div>
      <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', fontStyle: 'italic' }}>
        Clica num aluno na Validação para deixar nota individual.
      </div>
    </div>
  );
}

// ── Tab: KitchenFlow ──────────────────────────────────────────
function TabKitchenFlow({ turmaId, plano }: { turmaId: string; plano?: PlanoAula }) {
  const [registos] = useState(() => {
    try {
      const chave = `ecl_evidencias_kf_${turmaId}`;
      return JSON.parse(localStorage.getItem(chave) || '[]');
    } catch { return []; }
  });

  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        🍃 Registos KitchenFlow
      </div>
      {registos.length === 0 ? (
        <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
          Sem registos sincronizados.<br />
          Os registos aparecem aqui após os alunos registarem no KitchenFlow.
        </div>
      ) : (
        registos.slice(0, 15).map((r: any, i: number) => (
          <div key={i} style={{ fontSize: 11, color: 'rgba(26,23,20,0.7)', padding: '4px 0', borderBottom: '0.5px solid rgba(26,23,20,0.06)' }}>
            <span style={{ color: '#0f766e', marginRight: 4 }}>●</span>
            {r.tipo} — {r.alunoNome || r.alunoId}
            {r.data && <span style={{ color: 'rgba(26,23,20,0.35)', marginLeft: 4 }}>{r.data}</span>}
          </div>
        ))
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export function PainelContextual({ contexto, isMobile }: Props) {
  const [tabAtiva, setTabAtiva] = useState<TabId>('competencias');
  // Lazy — só calcular após montagem para evitar erro de inicialização
  const [nAvisos, setNAvisos] = useState(0);
  React.useEffect(() => {
    try { setNAvisos(getAvisosPendentes().length); } catch {}
  }, [tabAtiva]);

  // Não mostrar no mobile
  if (isMobile) return null;

  const TABS: Tab[] = [
    { id: 'competencias', emoji: '📋', label: 'Competências' },
    { id: 'kitchenflow',  emoji: '🍃', label: 'KitchenFlow' },
    { id: 'avisos',       emoji: '⚠️', label: 'Avisos', badge: nAvisos },
    { id: 'comentario',   emoji: '💬', label: 'Comentário' },
    { id: 'dicionario',   emoji: '📖', label: 'Dicionário' },
    { id: 'cronograma',   emoji: '📅', label: 'Cronograma' },
  ];

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: '#faf7f2',
      borderLeft: '1px solid rgba(26,23,20,0.08)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        padding: '10px 8px 6px',
        borderBottom: '1px solid rgba(26,23,20,0.08)',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 2,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabAtiva(tab.id)}
            style={{
              padding: '4px 7px',
              borderRadius: 6,
              border: 'none',
              background: tabAtiva === tab.id ? COR_PALE : 'transparent',
              color: tabAtiva === tab.id ? COR : 'rgba(26,23,20,0.45)',
              fontSize: 11,
              fontWeight: tabAtiva === tab.id ? 700 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              position: 'relative',
            }}
          >
            <span style={{ fontSize: 12 }}>{tab.emoji}</span>
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 ? (
              <span style={{
                background: '#e63946', color: 'white',
                borderRadius: 8, fontSize: 9, padding: '1px 4px',
                fontWeight: 800, lineHeight: 1.2,
              }}>{tab.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Conteúdo da tab */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tabAtiva === 'competencias' && (
          <TabCompetencias plano={contexto.plano} />
        )}
        {tabAtiva === 'kitchenflow' && (
          <TabKitchenFlow turmaId={contexto.turmaId} plano={contexto.plano} />
        )}
        {tabAtiva === 'avisos' && (
          <div style={{ padding: '8px 6px' }}>
            <CentroAvisos perfil="professor" />
          </div>
        )}
        {tabAtiva === 'comentario' && (
          <TabComentario plano={contexto.plano} nomeProfessor={contexto.nomeProfessor} />
        )}
        {tabAtiva === 'dicionario' && (
          <div style={{ padding: '0 4px' }}>
            <DicionarioComp perfil="professor" nomeProfessor={contexto.nomeProfessor} turmaId={contexto.turmaId} />
          </div>
        )}
        {tabAtiva === 'cronograma' && (
          <div style={{ padding: '0 4px' }}>
            <CronogramaTab turmaId={contexto.turmaId} />
          </div>
        )}
      </div>

      {/* Rodapé com contexto */}
      {contexto.plano && (
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid rgba(26,23,20,0.08)',
          fontSize: 10,
          color: 'rgba(26,23,20,0.35)',
          background: '#fff',
        }}>
          {contexto.plano.ucId && <span>{contexto.plano.ucId} · </span>}
          {contexto.plano.titulo}
        </div>
      )}
    </div>
  );
}
