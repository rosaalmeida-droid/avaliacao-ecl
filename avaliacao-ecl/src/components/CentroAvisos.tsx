import React, { useState, useEffect } from 'react';
import { getAvisosPendentes, resolverAviso, aprovarSugestaoIngrediente, rejeitarSugestaoIngrediente } from '../backend';
import { Aviso } from '../types';

export function CentroAvisos({ onNavegar }: { onNavegar?: (aviso: Aviso) => void }) {
  const [aberto, setAberto] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>(() => getAvisosPendentes());
  const [isLargo, setIsLargo] = useState(typeof window !== 'undefined' && window.innerWidth >= 900);
  // Estado do formulário de aprovação — chave = avisoId
  const [aprovacaoForm, setAprovacaoForm] = useState<Record<string, {
    nomeCorrigido: string; precoKg: string; precoUnitario: string; unidadeCompra: string; categoria: string;
  }>>({});

  useEffect(() => {
    function onResize() { setIsLargo(window.innerWidth >= 900); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setAvisos(getAvisosPendentes()), 2000);
    return () => clearInterval(id);
  }, []);

  if (!isLargo) return null;

  const tudoOk = avisos.length === 0;

  function resolver(id: string) {
    resolverAviso(id);
    setAvisos(getAvisosPendentes());
  }

  function iniciarAprovacao(aviso: Aviso) {
    const s = aviso.contexto?.sugestao;
    if (!s) return;
    setAprovacaoForm(prev => ({
      ...prev,
      [aviso.id]: {
        nomeCorrigido: s.nomeCorrigido || s.nomeOriginal,
        precoKg: s.precoKg ? String(s.precoKg) : '',
        precoUnitario: s.precoUnitario ? String(s.precoUnitario) : '',
        unidadeCompra: s.unidadeCompra || 'kg',
        categoria: s.categoria || '',
      }
    }));
  }

  function aprovar(aviso: Aviso) {
    const form = aprovacaoForm[aviso.id];
    if (!form) return;
    aprovarSugestaoIngrediente(aviso.id, {
      nomeCorrigido: form.nomeCorrigido,
      precoKg: parseFloat(form.precoKg) || 0,
      precoUnitario: parseFloat(form.precoUnitario) || 0,
      unidadeCompra: form.unidadeCompra,
      categoria: form.categoria,
    });
    setAvisos(getAvisosPendentes());
    setAprovacaoForm(prev => { const n = { ...prev }; delete n[aviso.id]; return n; });
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', zIndex: 500, display: 'flex', pointerEvents: 'none' }}>
      <button onClick={() => setAberto(!aberto)}
        style={{
          pointerEvents: 'auto',
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          background: tudoOk ? 'var(--sage)' : 'var(--copper)',
          color: 'white', border: 'none', borderRadius: '10px 0 0 10px',
          padding: '16px 8px', cursor: 'pointer', fontWeight: 700, fontSize: 12,
          alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '-2px 2px 8px rgba(0,0,0,0.15)',
        }}>
        <span>{tudoOk ? '✓ Tudo em dia' : `⚠ ${avisos.length} aviso${avisos.length !== 1 ? 's' : ''}`}</span>
      </button>

      {aberto && (
        <div style={{
          pointerEvents: 'auto', width: 340, height: '100vh', background: '#fff',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', overflowY: 'auto', padding: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Centro de Avisos</div>
            <button onClick={() => setAberto(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'rgba(26,23,20,0.4)' }}>✕</button>
          </div>

          {tudoOk ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--sage)' }}>Tudo em dia!</div>
              <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginTop: 4 }}>Não há avisos pendentes.</div>
            </div>
          ) : (
            avisos.map(a => {
              const ehSugestao = a.tipo === 'sugestao_ingrediente';
              const ehOperacional = a.id.startsWith('op_');
              const formAberto = !!aprovacaoForm[a.id];

              return (
                <div key={a.id} style={{
                  border: `1px solid ${ehSugestao ? 'rgba(74,90,138,0.3)' : 'var(--border)'}`,
                  borderRadius: 10, padding: 12, marginBottom: 10,
                  background: ehSugestao ? 'rgba(74,90,138,0.06)' : 'var(--copper-pale)'
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{a.titulo}</div>
                  <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>{a.descricao}</div>

                  {/* Sugestão de ingrediente — formulário de aprovação */}
                  {ehSugestao && !formAberto && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => iniciarAprovacao(a)}
                        style={{ flex: 2, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'var(--guia)', color: 'white', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                        ✓ Aprovar / Editar
                      </button>
                      <button onClick={() => { rejeitarSugestaoIngrediente(a.id); setAvisos(getAvisosPendentes()); }}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 11, cursor: 'pointer', color: 'var(--danger)' }}>
                        Rejeitar
                      </button>
                    </div>
                  )}

                  {ehSugestao && formAberto && (() => {
                    const form = aprovacaoForm[a.id];
                    const setF = (key: string, val: string) => setAprovacaoForm(prev => ({
                      ...prev, [a.id]: { ...prev[a.id], [key]: val }
                    }));
                    return (
                      <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--guia)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Editar antes de aprovar</div>
                        <div style={{ marginBottom: 7 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Nome correcto</div>
                          <input value={form.nomeCorrigido} onChange={e => setF('nomeCorrigido', e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 7 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>€/kg</div>
                            <input type="number" step="0.01" value={form.precoKg} onChange={e => setF('precoKg', e.target.value)}
                              style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12 }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>€/un</div>
                            <input type="number" step="0.01" value={form.precoUnitario} onChange={e => setF('precoUnitario', e.target.value)}
                              style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12 }} />
                          </div>
                        </div>
                        <div style={{ marginBottom: 7 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Unidade compra</div>
                          <select value={form.unidadeCompra} onChange={e => setF('unidadeCompra', e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12 }}>
                            <option value="kg">kg</option>
                            <option value="un">un</option>
                            <option value="l">l</option>
                            <option value="embalagem">embalagem</option>
                          </select>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Categoria</div>
                          <select value={form.categoria} onChange={e => setF('categoria', e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12 }}>
                            <option value="">Seleccionar...</option>
                            <option>Proteína animal</option>
                            <option>Peixe e marisco</option>
                            <option>Vegetais</option>
                            <option>Farinhas</option>
                            <option>Laticínios</option>
                            <option>Gorduras</option>
                            <option>Açúcares</option>
                            <option>Especiarias e ervas</option>
                            <option>Ovos</option>
                            <option>Massas e cereais</option>
                            <option>Conservas</option>
                            <option>Outro</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setAprovacaoForm(prev => { const n = { ...prev }; delete n[a.id]; return n; })}
                            style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 11, cursor: 'pointer' }}>
                            Cancelar
                          </button>
                          <button onClick={() => aprovar(a)}
                            style={{ flex: 2, padding: '7px', borderRadius: 8, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                            ✓ Confirmar e adicionar à BD
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Avisos normais */}
                  {!ehSugestao && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {onNavegar && (
                        <button onClick={() => onNavegar(a)}
                          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                          Ir corrigir →
                        </button>
                      )}
                      {!ehOperacional && (
                        <button onClick={() => resolver(a.id)}
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                          Dispensar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default CentroAvisos;

