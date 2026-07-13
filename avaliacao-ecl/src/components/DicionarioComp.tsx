// ============================================================
// DicionarioComp.tsx
// Dicionário de Técnicas e Microcompetências
//
// Mostra todas as subtécnicas (S...) e microcompetências (M...)
// agrupadas por UC, com critérios observáveis em accordion.
//
// Professor: pode sugerir edição de critérios → aviso à coordenadora
// Coordenadora: pode aprovar/rejeitar sugestões e editar diretamente
// ============================================================

import React, { useState, useMemo } from 'react';
import { MICROCOMPETENCIAS, encontrarMicro, SUBTECNICAS } from '../compatECL';
import { addAviso } from '../backend';

interface Props {
  perfil: 'professor' | 'coordenadora';
  nomeProfessor?: string;
  turmaId?: string;
}

// ── Critérios editados localmente (coordenadora ou sugestões aprovadas) ──
const CHAVE_CRITERIOS = 'ecl_dicionario_criterios_custom';

function carregarCriteriosCustom(): Record<string, { criterio: string; como?: string }[]> {
  try { return JSON.parse(localStorage.getItem(CHAVE_CRITERIOS) || '{}'); } catch { return {}; }
}

function guardarCriteriosCustom(dados: Record<string, { criterio: string; como?: string }[]>) {
  try { localStorage.setItem(CHAVE_CRITERIOS, JSON.stringify(dados)); } catch {}
}

// ── Sugestões pendentes (professor → coordenadora) ───────────
const CHAVE_SUGESTOES = 'ecl_dicionario_sugestoes';

interface Sugestao {
  id: string;
  subId: string;
  subNome: string;
  criterios: { criterio: string; como?: string }[];
  professor: string;
  turmaId: string;
  criadoEm: string;
  estado: 'pendente' | 'aprovada' | 'rejeitada';
}

function carregarSugestoes(): Sugestao[] {
  try { return JSON.parse(localStorage.getItem(CHAVE_SUGESTOES) || '[]'); } catch { return []; }
}

function guardarSugestao(s: Sugestao) {
  const todas = carregarSugestoes();
  const idx = todas.findIndex(x => x.id === s.id);
  if (idx >= 0) todas[idx] = s; else todas.push(s);
  try { localStorage.setItem(CHAVE_SUGESTOES, JSON.stringify(todas)); } catch {}
}

// ── Tipos de entrada do dicionário ───────────────────────────
interface EntradaDic {
  id: string;
  nome: string;
  tipo: 'subtecnica' | 'micro';
  uc: string[];
  ucPrincipal: string;
  criterios: { criterio: string; como?: string }[];
  tecnicaMaeId?: string;
}

// ── Componente accordion de critérios com edição ─────────────
function CriteriosEditor({
  entrada, perfil, nomeProfessor, turmaId, criteriosCustom, onCriteriosChange,
}: {
  entrada: EntradaDic;
  perfil: 'professor' | 'coordenadora';
  nomeProfessor?: string;
  turmaId?: string;
  criteriosCustom: Record<string, { criterio: string; como?: string }[]>;
  onCriteriosChange: (id: string, crit: { criterio: string; como?: string }[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const [guardado, setGuardado] = useState(false);

  const criteriosAtivos = criteriosCustom[entrada.id] || entrada.criterios;

  function iniciarEdicao() {
    setTexto(criteriosAtivos.map(c => `${c.criterio}${c.como ? ` | ${c.como}` : ''}`).join('\n'));
    setEditando(true);
  }

  function submeterSugestao() {
    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
    const novosCriterios = linhas.map(l => {
      const parts = l.split('|');
      return { criterio: parts[0].trim(), como: parts[1]?.trim() || undefined };
    });

    if (perfil === 'coordenadora') {
      // Coordenadora edita diretamente
      onCriteriosChange(entrada.id, novosCriterios);
      setEditando(false);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } else {
      // Professor cria sugestão + aviso
      const sug: Sugestao = {
        id: `sug_${entrada.id}_${Date.now()}`,
        subId: entrada.id,
        subNome: entrada.nome,
        criterios: novosCriterios,
        professor: nomeProfessor || 'Professor',
        turmaId: turmaId || '',
        criadoEm: new Date().toISOString(),
        estado: 'pendente',
      };
      guardarSugestao(sug);
      // Aviso à coordenadora
      addAviso({
        tipo: 'outro',
        titulo: `Sugestão de critérios: ${entrada.nome}`,
        descricao: `${nomeProfessor || 'Professor'} sugeriu alteração aos critérios observáveis de "${entrada.nome}" (${entrada.id}). Revê no Dicionário → Sugestões pendentes.`,
        contexto: { tabDestino: 'dicionario' },
        resolvidoEm: undefined,
      });
      setEditando(false);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 4000);
    }
  }

  return (
    <div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginTop: 4 }}
        onClick={() => !editando && setAberto(a => !a)}
      >
        <span style={{ fontSize: 10, color: 'var(--copper)', transform: aberto ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: '0.15s' }}>▶</span>
        <span style={{ fontSize: 11, color: 'var(--copper)', fontWeight: 600 }}>
          {criteriosAtivos.length > 0 ? `${criteriosAtivos.length} critérios observáveis` : 'Sem critérios definidos'}
        </span>
        {criteriosCustom[entrada.id] && (
          <span style={{ fontSize: 10, color: 'var(--sage)', background: 'var(--sage-pale)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>editado</span>
        )}
      </div>

      {aberto && !editando && (
        <div style={{ marginTop: 6, paddingLeft: 16 }}>
          {criteriosAtivos.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.4)', fontStyle: 'italic' }}>
              Nenhum critério definido ainda.
            </div>
          ) : (
            criteriosAtivos.map((cr, i) => (
              <div key={i} style={{ fontSize: 12, color: 'rgba(26,23,20,0.75)', padding: '4px 0', borderBottom: i < criteriosAtivos.length - 1 ? '1px solid rgba(26,23,20,0.06)' : 'none' }}>
                <span style={{ color: 'var(--copper)', fontWeight: 700, marginRight: 6 }}>✓</span>
                {cr.criterio}
                {cr.como && <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginTop: 2, marginLeft: 18 }}>{cr.como}</div>}
              </div>
            ))
          )}
          <button
            onClick={iniciarEdicao}
            style={{ marginTop: 8, fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(26,23,20,0.2)', background: 'white', cursor: 'pointer', color: 'rgba(26,23,20,0.5)' }}
          >
            {perfil === 'coordenadora' ? '✏️ Editar critérios' : '💡 Sugerir alteração'}
          </button>
          {guardado && (
            <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 4, fontWeight: 600 }}>
              {perfil === 'coordenadora' ? '✓ Guardado!' : '✓ Sugestão enviada à coordenadora'}
            </div>
          )}
        </div>
      )}

      {aberto && editando && (
        <div style={{ marginTop: 8, paddingLeft: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)', marginBottom: 6 }}>
            Um critério por linha. Separa critério e "como observar" com | (pipe).<br />
            Ex: <em>Verifica temperatura com sonda | Observação direta durante a produção.</em>
          </div>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={Math.max(4, texto.split('\n').length + 1)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--copper)', fontSize: 12, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              onClick={submeterSugestao}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--copper)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              {perfil === 'coordenadora' ? '✓ Guardar' : '📤 Enviar sugestão'}
            </button>
            <button
              onClick={() => setEditando(false)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 12, cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export function DicionarioComp({ perfil, nomeProfessor, turmaId }: Props) {
  const [pesquisa, setPesquisa] = useState('');
  const [ucFiltro, setUcFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'subtecnica' | 'micro'>('todos');
  const [abaVista, setAbaVista] = useState<'dicionario' | 'sugestoes'>('dicionario');
  const [criteriosCustom, setCriteriosCustom] = useState<Record<string, { criterio: string; como?: string }[]>>(carregarCriteriosCustom);

  // Sugestões pendentes (só coordenadora vê)
  const [sugestoes, setSugestoes] = useState<Sugestao[]>(() => carregarSugestoes().filter(s => s.estado === 'pendente'));

  function handleCriteriosChange(id: string, crit: { criterio: string; como?: string }[]) {
    const novo = { ...criteriosCustom, [id]: crit };
    setCriteriosCustom(novo);
    guardarCriteriosCustom(novo);
  }

  function aprovarSugestao(sug: Sugestao) {
    handleCriteriosChange(sug.subId, sug.criterios);
    const atualizada = { ...sug, estado: 'aprovada' as const };
    guardarSugestao(atualizada);
    setSugestoes(s => s.filter(x => x.id !== sug.id));
  }

  function rejeitarSugestao(sug: Sugestao) {
    const atualizada = { ...sug, estado: 'rejeitada' as const };
    guardarSugestao(atualizada);
    setSugestoes(s => s.filter(x => x.id !== sug.id));
  }

  // Construir lista unificada
  const entradas: EntradaDic[] = useMemo(() => {
    const subs: EntradaDic[] = SUBTECNICAS.map(s => ({
      id: s.id,
      nome: s.nome,
      tipo: 'subtecnica' as const,
      uc: s.uc || [],
      ucPrincipal: (s.uc || [])[0] || '',
      criterios: (s as any).criterios || [],
      tecnicaMaeId: s.tecnicaMaeId,
    }));

    const micros: EntradaDic[] = MICROCOMPETENCIAS.map(m => ({
      id: m.id,
      nome: m.nome,
      tipo: 'micro' as const,
      uc: [m.ucPrincipal, ...m.ucsRelacionadas].filter(Boolean),
      ucPrincipal: m.ucPrincipal,
      criterios: m.criterios || [],
    }));

    return [...subs, ...micros].sort((a, b) => a.ucPrincipal.localeCompare(b.ucPrincipal) || a.nome.localeCompare(b.nome));
  }, []);

  // UCs únicas para filtro
  const ucs = useMemo(() => {
    const set = new Set(entradas.map(e => e.ucPrincipal).filter(Boolean));
    return Array.from(set).sort();
  }, [entradas]);

  // Filtrar
  const filtradas = useMemo(() => {
    const q = pesquisa.toLowerCase();
    return entradas.filter(e => {
      if (tipoFiltro !== 'todos' && e.tipo !== tipoFiltro) return false;
      if (ucFiltro && !e.uc.includes(ucFiltro)) return false;
      if (q && !e.nome.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entradas, pesquisa, ucFiltro, tipoFiltro]);

  // Agrupar por UC principal
  const porUC = useMemo(() => {
    const mapa: Record<string, EntradaDic[]> = {};
    filtradas.forEach(e => {
      const uc = e.ucPrincipal || 'Sem UC';
      if (!mapa[uc]) mapa[uc] = [];
      mapa[uc].push(e);
    });
    return mapa;
  }, [filtradas]);

  return (
    <div style={{ marginTop: 12 }}>
      {/* Cabeçalho */}
      <div style={{ background: '#1a1714', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#faf7f2', marginBottom: 10 }}>
          📖 Dicionário de Técnicas e Microcompetências
        </div>

        {/* Tabs dicionário / sugestões (só coordenadora) */}
        {perfil === 'coordenadora' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button onClick={() => setAbaVista('dicionario')} style={{
              padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: abaVista === 'dicionario' ? '#fff' : 'rgba(255,255,255,0.15)',
              color: abaVista === 'dicionario' ? '#1a1714' : 'rgba(255,255,255,0.6)',
            }}>Dicionário</button>
            <button onClick={() => setAbaVista('sugestoes')} style={{
              padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: abaVista === 'sugestoes' ? '#fff' : 'rgba(255,255,255,0.15)',
              color: abaVista === 'sugestoes' ? '#1a1714' : 'rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              💡 Sugestões pendentes
              {sugestoes.length > 0 && (
                <span style={{ background: '#e63946', color: 'white', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 800 }}>{sugestoes.length}</span>
              )}
            </button>
          </div>
        )}

        {abaVista === 'dicionario' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Pesquisa */}
            <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(247,241,230,0.4)' }}>🔍</span>
              <input
                value={pesquisa} onChange={e => setPesquisa(e.target.value)}
                placeholder="Pesquisar por nome ou código..."
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#faf7f2', fontSize: 13 }}
              />
            </div>
            {/* Filtro UC */}
            <select value={ucFiltro} onChange={e => setUcFiltro(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#faf7f2', fontSize: 12 }}>
              <option value="">Todas as UCs</option>
              {ucs.map(uc => <option key={uc} value={uc}>{uc}</option>)}
            </select>
            {/* Filtro tipo */}
            <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value as any)}
              style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#faf7f2', fontSize: 12 }}>
              <option value="todos">Todos os tipos</option>
              <option value="subtecnica">Só subtécnicas (S)</option>
              <option value="micro">Só microcompetências (M)</option>
            </select>
          </div>
        )}
        <div style={{ fontSize: 11, color: 'rgba(247,241,230,0.4)', marginTop: 6 }}>
          {filtradas.length} entradas
        </div>
      </div>

      {/* Vista sugestões (coordenadora) */}
      {abaVista === 'sugestoes' && perfil === 'coordenadora' && (
        <div>
          {sugestoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'rgba(26,23,20,0.4)' }}>
              ✓ Sem sugestões pendentes.
            </div>
          ) : sugestoes.map(sug => (
            <div key={sug.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, border: '1px solid rgba(26,23,20,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{sug.subNome}</div>
                  <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)' }}>
                    {sug.subId} · {sug.professor} · {new Date(sug.criadoEm).toLocaleDateString('pt-PT')}
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(26,23,20,0.03)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                {sug.criterios.map((cr, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'rgba(26,23,20,0.75)', padding: '3px 0' }}>
                    <span style={{ color: 'var(--copper)', fontWeight: 700, marginRight: 6 }}>✓</span>
                    {cr.criterio}
                    {cr.como && <span style={{ color: 'rgba(26,23,20,0.4)', marginLeft: 6 }}>— {cr.como}</span>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => aprovarSugestao(sug)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--sage)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  ✓ Aprovar
                </button>
                <button onClick={() => rejeitarSugestao(sug)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid rgba(192,57,43,0.4)', background: '#fdf5f5', color: '#c0392b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  ✕ Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vista dicionário */}
      {abaVista === 'dicionario' && (
        <div>
          {Object.keys(porUC).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'rgba(26,23,20,0.4)' }}>Nenhuma entrada encontrada.</div>
          ) : Object.entries(porUC).map(([uc, items]) => (
            <div key={uc} style={{ marginBottom: 16 }}>
              {/* Cabeçalho UC */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--copper)', letterSpacing: 0.8, textTransform: 'uppercase', padding: '6px 0', borderBottom: '2px solid var(--copper-pale)', marginBottom: 6 }}>
                {uc}
              </div>
              {items.map(e => (
                <div key={e.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1px solid rgba(26,23,20,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 5,
                      background: e.tipo === 'subtecnica' ? 'rgba(15,118,110,0.08)' : 'var(--copper-pale)',
                      color: e.tipo === 'subtecnica' ? '#0f766e' : 'var(--copper)',
                    }}>{e.id}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{e.nome}</span>
                    <span style={{ fontSize: 10, color: 'rgba(26,23,20,0.35)', marginLeft: 'auto' }}>
                      {e.tipo === 'subtecnica' ? 'subtécnica' : 'microcompetência'}
                    </span>
                  </div>
                  <CriteriosEditor
                    entrada={e}
                    perfil={perfil}
                    nomeProfessor={nomeProfessor}
                    turmaId={turmaId}
                    criteriosCustom={criteriosCustom}
                    onCriteriosChange={handleCriteriosChange}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
