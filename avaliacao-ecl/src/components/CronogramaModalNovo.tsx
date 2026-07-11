// ============================================================
// CronogramaModalNovo.tsx
// Modal de cronograma para o 1º CP — Referencial 811RA144 (UCs)
//
// Aparece 800ms após login, uma vez por dia por turma.
// Chave localStorage: 'crono_visto_{turmaId}_{YYYY-MM-DD}'
// ============================================================

import { useState, useEffect } from 'react';
import { modulosAtivos, modulosAImpiciar, modulosTerminados, ModuloCronograma } from '../cronograma';

interface Props {
  turmaId: string;   // ex: '1º ACP'
  onFechar: () => void;
}

function formatarData(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function jaMostrado(turmaId: string): boolean {
  const chave = `crono_visto_${turmaId}_${hojeISO()}`;
  return !!localStorage.getItem(chave);
}

function marcarMostrado(turmaId: string): void {
  const chave = `crono_visto_${turmaId}_${hojeISO()}`;
  localStorage.setItem(chave, '1');
}

// ── Chips de estado ──────────────────────────────────────────
function ChipAtivo() {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: '#D6EFD8', color: '#1A6B2A', fontSize: 11, fontWeight: 700,
      letterSpacing: 0.3, textTransform: 'uppercase',
    }}>Em curso</span>
  );
}
function ChipBreve() {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: '#FFF3CD', color: '#856404', fontSize: 11, fontWeight: 700,
      letterSpacing: 0.3, textTransform: 'uppercase',
    }}>A iniciar</span>
  );
}
function ChipTerminado() {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: '#F8D7DA', color: '#842029', fontSize: 11, fontWeight: 700,
      letterSpacing: 0.3, textTransform: 'uppercase',
    }}>Terminou</span>
  );
}

// ── Linha de módulo UC ───────────────────────────────────────
function LinhaUC({ modulo, chip }: { modulo: ModuloCronograma; chip: 'ativo' | 'breve' | 'terminado'; key?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 0', borderBottom: '1px solid #F0F0F0',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
            color: '#5C3D8F', background: '#F0EAF9', padding: '1px 7px', borderRadius: 5,
          }}>{modulo.id}</span>
          {chip === 'ativo' && <ChipAtivo />}
          {chip === 'breve' && <ChipBreve />}
          {chip === 'terminado' && <ChipTerminado />}
        </div>
        <div style={{ fontSize: 13, color: '#222', fontWeight: 500, lineHeight: 1.4, marginBottom: 2 }}>
          {modulo.nome}
        </div>
        <div style={{ fontSize: 11, color: '#777' }}>
          {modulo.disciplina} · {modulo.horasPrevistas}h
          {modulo.docente ? ` · ${modulo.docente}` : ''}
        </div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
          {formatarData(modulo.dataInicio)} → {formatarData(modulo.dataFim)}
        </div>
        {chip === 'ativo' && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#1A6B2A', fontWeight: 600 }}>
            ▶ Deve selecionar esta UC nos planos de aula
          </div>
        )}
        {chip === 'terminado' && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#842029', fontWeight: 600 }}>
            ✓ A UC {modulo.id} já terminou — verificar avaliação
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export function CronogramaModalNovo({ turmaId, onFechar }: Props) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (jaMostrado(turmaId)) return;
    const t = setTimeout(() => {
      setVisivel(true);
      marcarMostrado(turmaId);
    }, 800);
    return () => clearTimeout(t);
  }, [turmaId]);

  if (!visivel) return null;

  const ativos     = modulosAtivos(turmaId);
  const aIniciar   = modulosAImpiciar(turmaId, 7);
  const terminados = modulosTerminados(turmaId, 14);
  const temAlgo    = ativos.length + aIniciar.length + terminados.length > 0;

  function fechar() {
    setVisivel(false);
    onFechar();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
      onClick={fechar}
    >
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480,
        maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}
        onClick={(e: { stopPropagation(): void }) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div style={{
          background: 'linear-gradient(135deg, #5C3D8F 0%, #7B52B9 100%)',
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: '#E8D9FF', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>
              Cronograma · Referencial 811RA144
            </div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
              {turmaId} — Unidades Curriculares
            </div>
          </div>
          <button onClick={fechar} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 18, cursor: 'pointer', width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 20px 20px' }}>
          {!temAlgo && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 32, fontSize: 14 }}>
              Sem módulos ativos, a iniciar ou recém-terminados neste momento.
            </div>
          )}

          {ativos.length > 0 && (
            <section style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1A6B2A', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                Em curso
              </div>
              {ativos.map(m => <LinhaUC key={m.id} modulo={m} chip="ativo" />)}
            </section>
          )}

          {aIniciar.length > 0 && (
            <section style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#856404', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                A iniciar nos próximos 7 dias
              </div>
              {aIniciar.map(m => <LinhaUC key={m.id} modulo={m} chip="breve" />)}
            </section>
          )}

          {terminados.length > 0 && (
            <section style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#842029', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                Terminadas nos últimos 14 dias
              </div>
              {terminados.map(m => <LinhaUC key={m.id} modulo={m} chip="terminado" />)}
            </section>
          )}
        </div>

        {/* Rodapé */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #F0F0F0',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button onClick={fechar} style={{
            background: '#5C3D8F', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
