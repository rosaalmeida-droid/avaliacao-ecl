// ============================================================
// Preços das matérias-primas, só para consultar (Rosa, out/2026)
// ============================================================
// Estava dentro de «Eventos e orçamentos». Passou para aqui para o aluno
// abrir os preços sem descarregar os ecrãs dos eventos, das requisições e
// das fichas (Rosa, 11/out/2026: a aplicação estava lenta nos telemóveis).
// ============================================================
import React, { useMemo, useState } from 'react';
import { getMateriaPrimasBase, getPrecosRevistos } from '../materiasPrimasBase';
import { getMateriasPrimasCustom } from '../backend';
import { CatalogoMakro } from './CatalogoMakro';

/** As cores da área «Eventos e orçamentos». */
export const C = {
  fundo: '#F3F6F5',
  papel: '#FFFFFF',
  tinta: '#1C2B2A',
  suave: '#5B6B69',
  linha: '#DCE5E3',
  acento: '#1F6F6B',       // petróleo — a cor desta área
  acentoSuave: '#E3F0EE',
  quente: '#B5651D',
  quenteSuave: '#FBEFE3',
};

/** Os preços das matérias-primas, só para consultar. O mesmo ecrã em
 *  «Eventos e orçamentos», no professor e no aluno (Rosa, out/2026). */
/** Os preços da aplicação (os das fichas e da requisição) e, ao lado, o catálogo completo da Makro. */
export function PrecosConsulta({ paraAluno = false }: { paraAluno?: boolean } = {}) {
  const [fonte, setFonte] = useState<'app' | 'makro'>('app');
  const sep = (ativo: boolean): React.CSSProperties => ({ flex: 1, minHeight: 48, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15.5,
    fontWeight: 800, border: `2px solid ${C.acento}`, background: ativo ? C.acento : C.papel, color: ativo ? '#fff' : C.acento });
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setFonte('app')} style={sep(fonte === 'app')}>Matérias-primas da aplicação</button>
        <button onClick={() => setFonte('makro')} style={sep(fonte === 'makro')}>Catálogo Makro</button>
      </div>
      {fonte === 'app' ? <PrecosDaAplicacao paraAluno={paraAluno} /> : <CatalogoMakro cores={C} />}
    </div>
  );
}

function PrecosDaAplicacao({ paraAluno = false }: { paraAluno?: boolean }) {
  const [pesquisa, setPesquisa] = useState('');
  // Mostram-se 60 de cada vez: com todos os produtos, a página ficava
  // interminável no telemóvel (Rosa, out/2026).
  const [quantos, setQuantos] = useState(60);
  const [categoria, setCategoria] = useState('');
  const revistos = useMemo(() => new Map(getPrecosRevistos().map(p => [p.id, p])), []);
  const todos = useMemo(() => [
    ...getMateriaPrimasBase().map(m => ({ id: m.id, nome: m.nome, categoria: m.categoria, porUn: m.unidadeReceita === 'un',
      precoKg: m.precoKg, precoUn: m.precoUnitario, revisto: revistos.get(m.id)?.atualizadoEm || '', daEscola: false })),
    ...getMateriasPrimasCustom().map(m => ({ id: m.id, nome: m.nome, categoria: m.categoria || 'Outros', porUn: m.unidadeCompra === 'un',
      precoKg: m.precoKg, precoUn: m.precoUnitario, revisto: m.atualizadoEm || '', daEscola: true })),
  ], [revistos]);
  const categorias = useMemo(() => [...new Set(todos.map(t => t.categoria))].sort((a, b) => a.localeCompare(b, 'pt')), [todos]);
  const q = pesquisa.trim().toLowerCase();
  const lista = todos.filter(t => (!categoria || t.categoria === categoria) && (!q || t.nome.toLowerCase().includes(q)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const euro = (n: number) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',') + ' €';
  const data = (iso: string) => iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const chip = (ativo: boolean): React.CSSProperties => ({ minHeight: 42, padding: '0 16px', borderRadius: 21, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 15, fontWeight: 700, border: `1.5px solid ${ativo ? C.acento : C.linha}`, background: ativo ? C.acento : C.papel, color: ativo ? '#fff' : C.tinta });

  return (
    <div>
      <input value={pesquisa} onChange={e => { setPesquisa(e.target.value); setQuantos(60); }} placeholder="Procurar um produto (ex.: cenoura, bacalhau, manteiga)"
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 56, padding: '0 18px', borderRadius: 14, border: `1.5px solid ${C.linha}`,
          fontSize: 18, fontFamily: 'inherit', background: C.papel, color: C.tinta }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 18px' }}>
        <button onClick={() => setCategoria('')} style={chip(!categoria)}>Todas ({todos.length})</button>
        {categorias.map(c => <button key={c} onClick={() => setCategoria(c === categoria ? '' : c)} style={chip(c === categoria)}>{c}</button>)}
      </div>
      <div style={{ fontSize: 15, color: C.suave, marginBottom: 10 }}>{lista.length} produto{lista.length === 1 ? '' : 's'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 8 }}>
        {lista.slice(0, quantos).map(t => (
          <div key={t.id} style={{ background: C.papel, borderRadius: 12, padding: '10px 14px', border: `1px solid ${C.linha}`,
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: C.tinta }}>{t.nome}</div>
              <div style={{ fontSize: 13, color: C.suave, marginTop: 1 }}>
                {t.categoria}{t.daEscola ? ' · acrescentado por um professor' : ''}{t.revisto ? ` · atualizado a ${data(t.revisto)}` : ''}
              </div>
            </div>
            <div style={{ fontSize: 16.5, fontWeight: 800, color: C.acento, whiteSpace: 'nowrap' }}>
              {t.porUn ? `${euro(t.precoUn)}/un.` : `${euro(t.precoKg)}/kg`}
            </div>
          </div>
        ))}
      </div>
      {lista.length > quantos && (
        <button onClick={() => setQuantos(n => n + 60)} style={{ ...chip(false), width: '100%', marginTop: 12 }}>
          Mostrar mais ({lista.length - quantos} por mostrar)
        </button>
      )}
      {lista.length === 0 && <div style={{ fontSize: 17, color: C.suave, padding: '24px 0' }}>Não há nenhum produto com esse nome.</div>}
      <p style={{ marginTop: 22, fontSize: 15.5, color: C.suave, lineHeight: 1.6 }}>
        {paraAluno
          ? 'Se encontrares um preço que te pareça errado, avisa o professor.'
          : 'Encontrou um preço errado? Escreva o preço certo na requisição: vale para essa requisição e a coordenação revê-o na próxima atualização dos preços.'}
      </p>
    </div>
  );
}
