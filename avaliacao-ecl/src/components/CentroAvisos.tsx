import React, { useState, useEffect } from 'react';
import { getAvisosPendentes, resolverAviso, aprovarSugestaoIngrediente, rejeitarSugestaoIngrediente } from '../backend';
import { Aviso } from '../types';

export function CentroAvisos({ onNavegar, perfil, inline = false }: { onNavegar?: (aviso: Aviso) => void; perfil?: string; inline?: boolean }) {
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

  if (!isLargo && !inline) return null;

  const tudoOk = avisos.length === 0;

  function resolver(id: string) {
    resolverAviso(id);
    // Forçar rerender imediato — especialmente importante para avisos operacionais
    setAvisos(getAvisosPendentes());
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

  const corpo = (<>
          {tudoOk ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--sage)' }}>Tudo em dia!</div>
              <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)', marginTop: 4 }}>Não há avisos pendentes.</div>
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
                  <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>{a.descricao}</div>

                  {/* Sugestão de ingrediente — formulário de aprovação */}
                  {ehSugestao && !formAberto && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => iniciarAprovacao(a)}
                        style={{ flex: 2, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'var(--guia)', color: 'white', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
                        ✓ Aprovar / Editar
                      </button>
                      <button onClick={() => { rejeitarSugestaoIngrediente(a.id); setAvisos(getAvisosPendentes()); }}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', color: 'var(--danger)' }}>
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
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--guia)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Editar antes de aprovar</div>
                        <div style={{ marginBottom: 7 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>Nome correto</div>
                          <input value={form.nomeCorrigido} onChange={e => setF('nomeCorrigido', e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 7 }}>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>€/kg</div>
                            <input type="number" step="0.01" value={form.precoKg} onChange={e => setF('precoKg', e.target.value)}
                              style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>€/un</div>
                            <input type="number" step="0.01" value={form.precoUnitario} onChange={e => setF('precoUnitario', e.target.value)}
                              style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }} />
                          </div>
                        </div>
                        <div style={{ marginBottom: 7 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>Unidade compra</div>
                          <select value={form.unidadeCompra} onChange={e => setF('unidadeCompra', e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }}>
                            <option value="kg">kg</option>
                            <option value="un">un</option>
                            <option value="l">l</option>
                            <option value="embalagem">embalagem</option>
                          </select>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>Categoria</div>
                          <select value={form.categoria} onChange={e => setF('categoria', e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }}>
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
                            style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 12.5, cursor: 'pointer' }}>
                            Cancelar
                          </button>
                          <button onClick={() => aprovar(a)}
                            style={{ flex: 2, padding: '7px', borderRadius: 8, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                            ✓ Confirmar e adicionar à BD
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Avisos normais */}
                  {!ehSugestao && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {onNavegar && a.contexto?.tabDestino && (
                        <button onClick={() => onNavegar(a)}
                          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', minWidth: 80 }}>
                          Ir corrigir →
                        </button>
                      )}
                      {/* Dispensar disponível para todos — coordenadora também pode anular avisos de plano */}
                      <button onClick={() => resolver(a.id)}
                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
                        {perfil === 'coordenadora' && ehOperacional ? '🗑️ Anular' : 'Dispensar'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
  </>);

  // Na Coordenação os avisos aparecem no próprio separador «Avisos», e não
  // só na aba lateral (que não aparece em ecrãs estreitos): o separador
  // ficava vazio (Rosa, out/2026).
  if (inline) return (
    <div>
      {perfil === 'coordenadora' && <AvisoPrecosMakro />}
      <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Centro de Avisos</div>
        {corpo}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', zIndex: 500, display: 'flex', pointerEvents: 'none' }}>
      <button onClick={() => setAberto(!aberto)}
        style={{
          pointerEvents: 'auto',
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          background: tudoOk ? 'var(--sage)' : 'var(--copper)',
          color: 'white', border: 'none', borderRadius: '10px 0 0 10px',
          padding: '16px 8px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
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

          {corpo}
        </div>
      )}
    </div>
  );
}

export default CentroAvisos;


// ── Preços da Makro: atualização mensal (Rosa, out/2026) ─────────────
// A extensão Claude no Chrome recolhe o catálogo (pode ficar agendada para
// todos os meses); a coordenação arrasta o CSV para a pasta do GitHub e o
// catálogo da aplicação refaz-se sozinho. Este aviso aparece quando os
// preços têm mais de um mês, com os passos.
export const PEDIDO_EXTENSAO_MAKRO = 'Abre o site da Makro (produtos.makro.pt) com a minha sessão iniciada na loja de Alfragide. '
  + 'Percorre o catálogo inteiro, todas as categorias e subcategorias, sem deixar nenhum produto de fora. '
  + 'Cria um único ficheiro CSV (UTF-8, separado por ponto e vírgula) com esta primeira linha: '
  + 'Grupo;Categoria;Subcategoria;Nome;Marca;Embalagem;Preço s/ IVA (€);Preço c/ IVA (€);Preço refere-se a;Preço por kg/L/un s/ IVA (€);'
  + 'Preço por kg/L/un c/ IVA (€);Unidade de referência;IVA %;Preço antes da promoção s/ IVA (€);Disponibilidade;Código Makro '
  + '— e uma linha por produto (Disponibilidade: AVAILABLE ou UNAVAILABLE). Descarrega-o com o nome makro_AAAA-MM-DD.csv, com a data de hoje. '
  + 'Não ponhas nada no carrinho e não alteres nada na conta.';
export const PASTA_MAKRO_GITHUB = 'https://github.com/rosaalmeida-droid/avaliacao-ecl/upload/main/avaliacao-ecl/dados/makro';

export function AvisoPrecosMakro({ sempre = false }: { sempre?: boolean }) {
  const [data, setData] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    fetch('/catalogo_makro.json').then(r => r.ok ? r.json() : null).then(c => setData(c?.data || '')).catch(() => setData(''));
  }, []);
  if (data === null) return null;
  const dias = data ? Math.floor((Date.now() - new Date(data + 'T12:00:00').getTime()) / 86400000) : 999;
  const atrasado = dias > 31;
  if (!atrasado && !sempre && !aberto) {
    return (
      <button onClick={() => setAberto(true)} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 12, padding: '10px 14px',
        borderRadius: 12, border: '1px solid rgba(15,118,110,0.3)', background: '#effaf8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5 }}>
        ✓ Preços da Makro de {new Date(data + 'T12:00:00').toLocaleDateString('pt-PT')} (há {dias} dia{dias === 1 ? '' : 's'}). <u>Como se atualizam</u>
      </button>
    );
  }
  const passo: React.CSSProperties = { margin: '0 0 8px', lineHeight: 1.5 };
  return (
    <div style={{ marginBottom: 12, padding: '14px 16px', borderRadius: 14, border: `2px solid ${atrasado ? '#b5651d' : 'rgba(15,118,110,0.4)'}`,
      background: atrasado ? '#fff8ec' : '#effaf8', fontSize: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
        {atrasado ? '🛒 Atualizar os preços da Makro' : '🛒 Como se atualizam os preços da Makro'}
      </div>
      <div style={{ color: 'rgba(26,23,20,0.7)', marginBottom: 10 }}>
        {data ? `Os preços na aplicação são de ${new Date(data + 'T12:00:00').toLocaleDateString('pt-PT')} (há ${dias} dias).` : 'Ainda não há preços da Makro na aplicação.'}
        {' '}Leva cerca de cinco minutos do seu tempo; o resto é automático.
      </div>
      <ol style={{ margin: '0 0 10px', paddingLeft: 20 }}>
        <li style={passo}>No computador, abra o Chrome com a sessão da Makro iniciada (loja de Alfragide).</li>
        <li style={passo}>Abra a extensão <b>Claude</b> e cole o pedido abaixo (ou use o atalho guardado, se o agendou para todos os meses).
          <div style={{ marginTop: 6 }}>
            <button onClick={() => { try { navigator.clipboard.writeText(PEDIDO_EXTENSAO_MAKRO); setCopiado(true); setTimeout(() => setCopiado(false), 3000); } catch { /* */ } }}
              style={{ padding: '7px 12px', borderRadius: 9, border: 'none', background: '#0f766e', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              {copiado ? '✓ Pedido copiado' : '📋 Copiar o pedido para a extensão'}</button>
          </div></li>
        <li style={passo}>Quando a extensão terminar, o ficheiro <b>makro_AAAA-MM-DD.csv</b> fica nas Transferências.</li>
        <li style={passo}>Abra a pasta da Makro no GitHub e arraste o ficheiro para lá; carregue em <b>Commit changes</b>.
          <div style={{ marginTop: 6 }}>
            <a href={PASTA_MAKRO_GITHUB} target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', padding: '7px 12px', borderRadius: 9, background: '#24292f', color: '#fff', fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}>
              Abrir a pasta da Makro no GitHub ↗</a>
          </div></li>
        <li style={passo}>Em poucos minutos a aplicação fica com os preços novos (um ficheiro incompleto é recusado e nada muda).
          Depois, confirme as propostas de preço em <b>Coordenação › Preços</b>.</li>
      </ol>
      <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.6)' }}>
        Para não ter de se lembrar: na extensão, guarde o pedido como atalho e carregue no relógio, no canto do painel, para o repetir todos os meses
        (só corre com o Chrome aberto). No dia 1 de cada mês recebe também um e-mail de lembrete.
      </div>
    </div>
  );
}
