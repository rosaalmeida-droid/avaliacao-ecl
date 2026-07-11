// ============================================================
// CronogramaTab.tsx
// Tab de cronograma para a CoordenadoraView
// Mostra as 3 turmas lado a lado (ou em abas) com os módulos
// ativos, a iniciar e terminados — usando os dois referenciais.
// ============================================================

import React from 'react';
import {
  modulosAtivos, modulosAImpiciar, modulosTerminados,
  ModuloCronograma, ucsEquivalentes,
} from '../cronograma';
import { coresDaTurma } from '../cores';

// IDs reais das turmas
const TURMAS_CONFIG = [
  { id: '1º ACP', label: '1º CP', referencial: 'novo'   as const },
  { id: '2º ACP', label: '2º CP', referencial: 'antigo' as const },
  { id: '3º ACP', label: '3º CP', referencial: 'antigo' as const },
];

function formatarData(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

// ── Cores por referencial — via cores.ts ─────────────────────
// As cores reais vêm de coresDaTurma(turmaId) em runtime.
// Estas constantes são apenas fallback para elementos sem turmaId.
const COR_NOVO   = { badge: '#FBC02D', badgePale: '#FFF3D6', badgeText: '#5A3E00' };
const COR_ANTIGO = { badge: '#7C3AED', badgePale: '#EDE9FE', badgeText: '#5B21B6' };

// ── Linha de módulo ──────────────────────────────────────────
function LinhaModulo({
  modulo,
  referencial,
  estado,
  turmaId,
}: {
  modulo: ModuloCronograma;
  referencial: 'novo' | 'antigo';
  estado: 'ativo' | 'breve' | 'terminado';
  turmaId?: string;
}) {
  const c = turmaId ? coresDaTurma(turmaId) : (referencial === 'novo'
    ? { base: '#FBC02D', pale: '#FFF3D6', text: '#5A3E00' }
    : { base: '#7C3AED', pale: '#EDE9FE', text: '#5B21B6' });
  const cor = { badge: c.base, badgePale: c.pale, badgeText: c.text };
  const ucsEquiv = referencial === 'antigo' ? ucsEquivalentes(modulo.id) : [];

  const chipEstado = {
    ativo:     { bg: '#D6EFD8', color: '#1A6B2A', label: 'Em curso' },
    breve:     { bg: '#FFF3CD', color: '#856404', label: 'A iniciar' },
    terminado: { bg: '#F8D7DA', color: '#842029', label: 'Terminou' },
  }[estado];

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10, marginBottom: 6,
      background: '#fff', border: '1px solid rgba(26,23,20,0.07)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Linha topo: badge código + chip estado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
          color: cor.badgeText, background: cor.badgePale,
          padding: '1px 7px', borderRadius: 5,
        }}>{modulo.id}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20,
          background: chipEstado.bg, color: chipEstado.color,
          textTransform: 'uppercase' as const, letterSpacing: 0.3,
        }}>{chipEstado.label}</span>
      </div>

      {/* Nome */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1714', lineHeight: 1.4, marginBottom: 2 }}>
        {modulo.nome}
      </div>

      {/* Disciplina + horas + docente */}
      <div style={{ fontSize: 10, color: '#888' }}>
        {modulo.disciplina} · {modulo.horasPrevistas}h
        {modulo.docente ? ` · ${modulo.docente}` : ''}
      </div>

      {/* Datas */}
      <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>
        {formatarData(modulo.dataInicio)} → {formatarData(modulo.dataFim)}
      </div>

      {/* UCs equivalentes (só para UFCDs) */}
      {ucsEquiv.length > 0 && ucsEquiv[0] !== modulo.id && (
        <div style={{ fontSize: 9, color: '#9B6DD1', marginTop: 2 }}>
          ≈ {ucsEquiv.join(', ')}
        </div>
      )}

      {/* Mensagem de ação */}
      {estado === 'ativo' && (
        <div style={{ fontSize: 10, color: '#1A6B2A', fontWeight: 700, marginTop: 4 }}>
          ▶ Selecionar nos planos de aula
        </div>
      )}
      {estado === 'terminado' && (
        <div style={{ fontSize: 10, color: '#842029', fontWeight: 700, marginTop: 4 }}>
          ✓ Verificar avaliação
        </div>
      )}
    </div>
  );
}

// ── Coluna de uma turma ──────────────────────────────────────
function ColunaTurma({
  turmaId,
  label,
  referencial,
}: {
  turmaId: string;
  label: string;
  referencial: 'novo' | 'antigo';
}) {
  const c = coresDaTurma(turmaId);
  const cor = { badge: c.base, badgePale: c.pale, badgeText: c.text };
  const ativos     = modulosAtivos(turmaId);
  const aIniciar   = modulosAImpiciar(turmaId, 7);
  const terminados = modulosTerminados(turmaId, 14);
  const temAlgo    = ativos.length + aIniciar.length + terminados.length > 0;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Cabeçalho da coluna */}
      <div style={{
        padding: '8px 12px', borderRadius: 10, marginBottom: 8,
        background: cor.badge,
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700,
          textTransform: 'uppercase' as const, letterSpacing: 0.8 }}>
          {referencial === 'novo' ? 'Ref. 811RA144 · UCs' : 'Ref. 811183 · UFCDs'}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{label}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
          {ativos.length} em curso · {aIniciar.length} a iniciar · {terminados.length} a verificar
        </div>
      </div>

      {!temAlgo && (
        <div style={{ textAlign: 'center', padding: '20px 0',
          fontSize: 12, color: 'rgba(26,23,20,0.35)' }}>
          Sem módulos ativos ou recentes.
        </div>
      )}

      {ativos.length > 0 && (
        <section>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#1A6B2A',
            letterSpacing: 0.8, textTransform: 'uppercase' as const,
            marginBottom: 4, paddingLeft: 2 }}>Em curso</div>
          {ativos.map(m => (
            <LinhaModulo key={m.id} modulo={m} referencial={referencial} estado="ativo" turmaId={turmaId} />
          ))}
        </section>
      )}

      {aIniciar.length > 0 && (
        <section style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#856404',
            letterSpacing: 0.8, textTransform: 'uppercase' as const,
            marginBottom: 4, paddingLeft: 2 }}>A iniciar (7 dias)</div>
          {aIniciar.map(m => (
            <LinhaModulo key={m.id} modulo={m} referencial={referencial} estado="breve" turmaId={turmaId} />
          ))}
        </section>
      )}

      {terminados.length > 0 && (
        <section style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#842029',
            letterSpacing: 0.8, textTransform: 'uppercase' as const,
            marginBottom: 4, paddingLeft: 2 }}>Terminados (14 dias)</div>
          {terminados.map(m => (
            <LinhaModulo key={m.id} modulo={m} referencial={referencial} estado="terminado" turmaId={turmaId} />
          ))}
        </section>
      )}
    </div>
  );
}

// ── Componente principal exportado ───────────────────────────
// turmaId: passado pelo professor (mostra só a sua turma)
//           omitido pela coordenadora (mostra as 3 turmas)
export function CronogramaTab({ turmaId }: { turmaId?: string }) {
  const turmasVisiveis = turmaId
    ? TURMAS_CONFIG.filter(t => t.id === turmaId)
    : TURMAS_CONFIG;

  // Professor com 1 turma → abre sempre em abas (coluna única, melhor em mobile)
  const modoInicial: 'colunas' | 'abas' = turmasVisiveis.length === 1 ? 'abas' : 'colunas';
  const [modoVista, setModoVista] = React.useState<'colunas' | 'abas'>(modoInicial);
  const [turmaAba, setTurmaAba] = React.useState<string>(turmasVisiveis[0]?.id || TURMAS_CONFIG[0].id);

  const hoje = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // Turma ativa (para identificar referencial no cabeçalho)
  const turmaAtiva = TURMAS_CONFIG.find(t => t.id === (turmasVisiveis[0]?.id));

  return (
    <div style={{ marginTop: 12 }}>
      {/* Barra topo */}
      <div style={{
        background: '#1a1714', borderRadius: 14, padding: '12px 16px',
        marginBottom: 12, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#faf7f2' }}>
            📆 Cronograma 2026-2027
          </div>
          <div style={{ fontSize: 11, color: 'rgba(247,241,230,0.45)', marginTop: 2 }}>
            {turmaId
              ? `${turmaId} · ${turmaAtiva?.referencial === 'novo' ? 'Ref. 811RA144 (UCs)' : 'Ref. 811183 (UFCDs)'} · ${hoje}`
              : hoje}
          </div>
        </div>
        {/* Toggle colunas/abas — só mostra se houver mais do que 1 turma */}
        {turmasVisiveis.length > 1 && (
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.15)' }}>
            {(['colunas', 'abas'] as const).map(v => (
              <button key={v} onClick={() => setModoVista(v)} style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: modoVista === v ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: modoVista === v ? '#fff' : 'rgba(255,255,255,0.45)',
              }}>
                {v === 'colunas' ? '⊟ Colunas' : '≡ Abas'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vista em colunas — múltiplas turmas lado a lado (coordenadora) */}
      {modoVista === 'colunas' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {turmasVisiveis.map(t => (
            <ColunaTurma
              key={t.id}
              turmaId={t.id}
              label={t.label}
              referencial={t.referencial}
            />
          ))}
        </div>
      )}

      {/* Vista em abas — uma turma de cada vez */}
      {modoVista === 'abas' && (
        <div>
          {/* Tabs de turma só aparecem se houver mais do que 1 visível */}
          {turmasVisiveis.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {turmasVisiveis.map(t => {
                const c = coresDaTurma(t.id);
                return (
                  <button key={t.id} onClick={() => setTurmaAba(t.id)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    background: turmaAba === t.id ? c.base : 'rgba(26,23,20,0.06)',
                    color: turmaAba === t.id ? c.textOnBase : 'rgba(26,23,20,0.45)',
                    transition: 'all 0.15s',
                  }}>{t.label}</button>
                );
              })}
            </div>
          )}
          {turmasVisiveis.filter(t => turmasVisiveis.length === 1 || t.id === turmaAba).map(t => (
            <ColunaTurma
              key={t.id}
              turmaId={t.id}
              label={t.label}
              referencial={t.referencial}
            />
          ))}
        </div>
      )}

      {/* Legenda — só mostra se houver mais do que 1 referencial visível */}
      {turmasVisiveis.length > 1 && (
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(26,23,20,0.04)', fontSize: 11,
          color: 'rgba(26,23,20,0.45)', display: 'flex', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ color: '#FBC02D', fontWeight: 700 }}>■</span> 1º CP — ref. 811RA144 (UCs)
          <span style={{ color: '#7C3AED', fontWeight: 700 }}>■</span> 2º CP — ref. 811183 (UFCDs)
          <span style={{ color: '#6B9E3A', fontWeight: 700 }}>■</span> 3º CP — ref. 811183 (UFCDs)
          <span>≈ = UC equivalente do ref. novo</span>
        </div>
      )}
    </div>
  );
}
