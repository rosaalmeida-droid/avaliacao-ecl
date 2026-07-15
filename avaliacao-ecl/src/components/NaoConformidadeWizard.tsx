import React, { useState } from 'react';

type Perfil = 'professor' | 'coordenadora' | 'auxiliar' | 'aluno';
type EstadoNC = 'pendente' | 'em_analise' | 'resolvida' | 'rejeitada';

interface NaoConformidade {
  id: string;
  tipo: string;
  descricao: string;
  turmaId: string;
  alunoId?: string;
  registadoPor: string;
  perfilRegistou: Perfil;
  decisao?: string;
  resolucao?: string;
  estado: EstadoNC;
  criadaEm: string;
  resolvidaEm?: string;
}

const TIPOS_NC = [
  { id: 'temperatura', label: '🌡️ Temperatura fora do intervalo', desc: 'Produto quente abaixo de 63°C ou frio acima de 4°C' },
  { id: 'higiene',     label: '🧼 Higiene pessoal',               desc: 'Fardamento incompleto, falta de lavagem de mãos' },
  { id: 'rotulagem',   label: '🏷️ Rotulagem incorrecta',          desc: 'Etiqueta em falta, data errada, produto não identificado' },
  { id: 'prazo',       label: '📅 Prazo de validade',             desc: 'Produto fora do prazo ou sem data visível' },
  { id: 'cross',       label: '⚠️ Contaminação cruzada',          desc: 'Contacto entre crus e cozinhados, alérgenos' },
  { id: 'equipamento', label: '🔧 Equipamento',                   desc: 'Avaria, limpeza insuficiente, calibração' },
  { id: 'receita',     label: '📋 Desvio de receita',             desc: 'Técnica errada, substituição não autorizada' },
  { id: 'outro',       label: '📝 Outro',                         desc: 'Qualquer outro desvio ao procedimento' },
];

const DECISOES = [
  { id: 'corrigido',  label: '✅ Corrigido no momento',    desc: 'O problema foi corrigido de imediato' },
  { id: 'rejeitar',   label: '🗑️ Produto rejeitado',        desc: 'O produto não pode ser servido/usado' },
  { id: 'monitorizar',label: '👁️ Monitorizar',              desc: 'Situação controlada mas requer atenção' },
  { id: 'informar',   label: '📢 Informar coordenação',     desc: 'Escalado para decisão superior' },
];

const STORAGE_KEY = 'ecl_nao_conformidades';

function getNCs(): NaoConformidade[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveNCs(ncs: NaoConformidade[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ncs));
}

interface Props {
  perfil: Perfil;
  turmaId: string;
  alunoId?: string;
  nomeUtilizador: string;
  onConcluido?: () => void;
}

export function NaoConformidadeWizard({ perfil, turmaId, alunoId, nomeUtilizador, onConcluido }: Props) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [tipoSel, setTipoSel] = useState('');
  const [descricao, setDescricao] = useState('');
  const [decisaoSel, setDecisaoSel] = useState('');
  const [resolucao, setResolucao] = useState('');
  const [guardado, setGuardado] = useState(false);

  const podeDecidir = perfil !== 'aluno';
  const T = { copper: '#b5651d', sage: '#5a7a4e', danger: '#c0392b', border: 'rgba(26,23,20,0.08)' };

  function guardar() {
    const nc: NaoConformidade = {
      id: `nc_${Date.now()}`,
      tipo: tipoSel,
      descricao,
      turmaId,
      alunoId,
      registadoPor: nomeUtilizador,
      perfilRegistou: perfil,
      estado: podeDecidir ? (decisaoSel === 'corrigido' || decisaoSel === 'rejeitar' ? 'resolvida' : 'em_analise') : 'pendente',
      decisao: podeDecidir ? decisaoSel : undefined,
      resolucao: podeDecidir ? resolucao : undefined,
      criadaEm: new Date().toISOString(),
      resolvidaEm: podeDecidir ? new Date().toISOString() : undefined,
    };
    const ncs = getNCs();
    saveNCs([...ncs, nc]);
    setGuardado(true);
    onConcluido?.();
  }

  if (guardado) return (
    <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '20px', textAlign: 'center', border: '2px solid #86efac' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#166534' }}>
        {podeDecidir ? 'Não Conformidade registada e decidida' : 'Não Conformidade registada — aguarda decisão do professor'}
      </div>
      <div style={{ fontSize: 13, color: '#15803d', marginTop: 6 }}>
        Tipo: {TIPOS_NC.find(t => t.id === tipoSel)?.label}
        {podeDecidir && decisaoSel && <><br />Decisão: {DECISOES.find(d => d.id === decisaoSel)?.label}</>}
      </div>
      <button onClick={() => { setPasso(1); setTipoSel(''); setDescricao(''); setDecisaoSel(''); setResolucao(''); setGuardado(false); }}
        style={{ marginTop: 14, padding: '10px 20px', borderRadius: 10, border: 'none', background: T.sage, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
        Registar outra NC
      </button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Indicador de passo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { n: 1, label: 'Tipo' },
          { n: 2, label: 'Detalhe' },
          ...(podeDecidir ? [{ n: 3 as const, label: 'Decisão' }] : []),
        ].map(s => (
          <div key={s.n} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
              background: passo >= s.n ? T.copper : 'rgba(26,23,20,0.1)',
              color: passo >= s.n ? '#fff' : 'rgba(26,23,20,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13 }}>
              {s.n}
            </div>
            <div style={{ fontSize: 11, color: passo >= s.n ? T.copper : 'rgba(26,23,20,0.4)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Passo 1 — Tipo de NC */}
      {passo === 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Que tipo de não conformidade?</div>
          {TIPOS_NC.map(tipo => (
            <button key={tipo.id} onClick={() => setTipoSel(tipo.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, border: `2px solid ${tipoSel === tipo.id ? T.copper : T.border}`,
                background: tipoSel === tipo.id ? 'rgba(181,101,29,0.06)' : '#fff',
                cursor: 'pointer', textAlign: 'left', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: tipoSel === tipo.id ? T.copper : '#1a1714' }}>{tipo.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>{tipo.desc}</div>
              </div>
              {tipoSel === tipo.id && <span style={{ color: T.copper, fontSize: 18 }}>✓</span>}
            </button>
          ))}
          <button onClick={() => setPasso(2)} disabled={!tipoSel}
            style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 10, border: 'none',
              background: tipoSel ? T.copper : 'rgba(26,23,20,0.1)',
              color: tipoSel ? '#fff' : 'rgba(26,23,20,0.4)',
              cursor: tipoSel ? 'pointer' : 'default', fontSize: 14, fontWeight: 700 }}>
            Continuar →
          </button>
        </div>
      )}

      {/* Passo 2 — Descrição */}
      {passo === 2 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            {TIPOS_NC.find(t => t.id === tipoSel)?.label}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.5)', marginBottom: 12 }}>
            {TIPOS_NC.find(t => t.id === tipoSel)?.desc}
          </div>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
            placeholder="Descreve o que aconteceu (opcional mas recomendado)..."
            rows={4}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`,
              fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPasso(1)}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${T.border}`,
                background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              ← Voltar
            </button>
            <button onClick={() => podeDecidir ? setPasso(3) : guardar()}
              style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                background: T.copper, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
              {podeDecidir ? 'Continuar →' : 'Registar NC'}
            </button>
          </div>
        </div>
      )}

      {/* Passo 3 — Decisão (só professor/coordenadora/auxiliar) */}
      {passo === 3 && podeDecidir && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Qual a decisão imediata?</div>
          {DECISOES.map(d => (
            <button key={d.id} onClick={() => setDecisaoSel(d.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, border: `2px solid ${decisaoSel === d.id ? T.sage : T.border}`,
                background: decisaoSel === d.id ? 'rgba(90,122,78,0.06)' : '#fff',
                cursor: 'pointer', textAlign: 'left', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: decisaoSel === d.id ? T.sage : '#1a1714' }}>{d.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.5)', marginTop: 2 }}>{d.desc}</div>
              </div>
              {decisaoSel === d.id && <span style={{ color: T.sage, fontSize: 18 }}>✓</span>}
            </button>
          ))}
          {decisaoSel && (
            <textarea value={resolucao} onChange={e => setResolucao(e.target.value)}
              placeholder="Acção tomada ou observação adicional (opcional)..."
              rows={2}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`,
                fontSize: 13, resize: 'vertical', boxSizing: 'border-box', margin: '10px 0' }} />
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setPasso(2)}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${T.border}`,
                background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              ← Voltar
            </button>
            <button onClick={guardar} disabled={!decisaoSel}
              style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                background: decisaoSel ? T.sage : 'rgba(26,23,20,0.1)',
                color: decisaoSel ? '#fff' : 'rgba(26,23,20,0.4)',
                cursor: decisaoSel ? 'pointer' : 'default', fontSize: 14, fontWeight: 700 }}>
              ✓ Registar e decidir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Lista de NCs pendentes — para o professor ver e decidir
export function ListaNaoConformidades({ turmaId, perfil }: { turmaId: string; perfil: Perfil }) {
  const [refresh, setRefresh] = useState(0);
  const ncs = getNCs().filter(nc => nc.turmaId === turmaId);
  const pendentes = ncs.filter(nc => nc.estado === 'pendente');
  const resolvidas = ncs.filter(nc => nc.estado !== 'pendente');

  function decidir(nc: NaoConformidade, decisao: string) {
    const actualizadas = getNCs().map(n =>
      n.id === nc.id ? { ...n, decisao, estado: 'resolvida' as EstadoNC, resolvidaEm: new Date().toISOString() } : n
    );
    saveNCs(actualizadas);
    setRefresh(r => r + 1);
  }

  const T = { copper: '#b5651d', sage: '#5a7a4e', danger: '#c0392b', border: 'rgba(26,23,20,0.08)' };

  return (
    <div>
      {pendentes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.danger, marginBottom: 8 }}>
            ⚠️ {pendentes.length} NC{pendentes.length !== 1 ? 's' : ''} pendente{pendentes.length !== 1 ? 's' : ''}
          </div>
          {pendentes.map(nc => (
            <div key={nc.id} style={{ background: '#fff7ed', borderRadius: 10, padding: '12px 14px',
              marginBottom: 8, border: `1.5px solid ${T.copper}` }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                {TIPOS_NC.find(t => t.id === nc.tipo)?.label || nc.tipo}
              </div>
              {nc.descricao && <div style={{ fontSize: 12, color: 'rgba(26,23,20,0.6)', marginBottom: 8 }}>{nc.descricao}</div>}
              <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', marginBottom: 10 }}>
                Registado por {nc.registadoPor} · {new Date(nc.criadaEm).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              {perfil !== 'aluno' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DECISOES.map(d => (
                    <button key={d.id} onClick={() => decidir(nc, d.id)}
                      style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.border}`,
                        background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {resolvidas.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(26,23,20,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>
            Resolvidas ({resolvidas.length})
          </div>
          {resolvidas.slice(0, 5).map(nc => (
            <div key={nc.id} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(26,23,20,0.03)',
              border: `1px solid ${T.border}`, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: T.sage }}>✓</span>
              <div style={{ flex: 1, fontSize: 12 }}>{TIPOS_NC.find(t => t.id === nc.tipo)?.label || nc.tipo}</div>
              <span style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)' }}>
                {DECISOES.find(d => d.id === nc.decisao)?.label || nc.decisao}
              </span>
            </div>
          ))}
        </div>
      )}
      {ncs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(26,23,20,0.4)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 13 }}>Sem não conformidades registadas</div>
        </div>
      )}
    </div>
  );
}

export default NaoConformidadeWizard;
