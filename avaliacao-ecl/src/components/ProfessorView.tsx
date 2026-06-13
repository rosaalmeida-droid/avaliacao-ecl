import React, { useState } from 'react';
import { Comanda } from '../types';
import { Button, Card, Field, Chip } from './ui';
import { getCompetencia } from '../competencias';
import { addComanda } from '../backend';
import { EditorComanda, ESTADO_VAZIO, estadoParaComanda, EditorComandaState } from './EditorComanda';
import { sugerirSubtecnicas } from '../subtecnicas';
import { SUBTECNICAS } from '../subtecnicas';

// ============================================================
// Tipos para a ficha técnica editável
// ============================================================
interface LinhaIngrediente {
  componente: string;  // ex: "Gelado de whisky", "Cremeux", "" (sem agrupamento)
  qt: string;
  un: string;
  produto: string;
  tPrep: string;
  tConf: string;
  obs: string;
}

interface PassoPreparacao {
  num: number;
  descricao: string;
  temperatura: string;
  tempo: string;
  obs: string;
}

interface FichaTecnica {
  nomePrato: string;
  classificacao: string;
  fichaNum: string;
  alergenicos: string;
  tempoPrep: string;
  tempoConf: string;
  numPorcoes: string;
  ingredientes: LinhaIngrediente[];
  preparacao: PassoPreparacao[];
  empratamento: string;
  elaboradoPor: string;
  data: string;
}

const FICHA_VAZIA: FichaTecnica = {
  nomePrato: '',
  classificacao: '',
  fichaNum: '',
  alergenicos: '',
  tempoPrep: '',
  tempoConf: '',
  numPorcoes: '',
  ingredientes: [
    { componente: '', qt: '', un: '', produto: '', tPrep: '', tConf: '', obs: '' }
  ],
  preparacao: [
    { num: 1, descricao: '', temperatura: '', tempo: '', obs: '' }
  ],
  empratamento: '',
  elaboradoPor: 'rosa.almeida@eclisboa.net',
  data: new Date().toLocaleDateString('pt-PT'),
};

// ============================================================
// Extração automática a partir do texto da receita
// ============================================================
function extrairFicha(texto: string): FichaTecnica {
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);

  // Tentar encontrar nome do prato (geralmente nas primeiras linhas)
  const nomePrato = linhas[0] || '';

  // Tentar extrair ingredientes — procurar linhas com quantidades (números + unidades)
  const regexIngrediente = /^([\d.,/]+)\s*(kg|g|l|ml|dl|cl|cs|cc|u|un|qb|[-])\s+(.+)$/i;
  const ingredientes: LinhaIngrediente[] = [];
  const preparacaoLinhas: string[] = [];

  let modoPrep = false;
  for (const linha of linhas) {
    if (/modo de prepara|prepara[çc][ãa]o|m[eé]todo/i.test(linha)) {
      modoPrep = true;
      continue;
    }
    if (!modoPrep) {
      const m = linha.match(regexIngrediente);
      if (m) {
        ingredientes.push({
          componente: '',
          qt: m[1],
          un: m[2],
          produto: m[3],
          tPrep: '',
          tConf: '',
          obs: '',
        });
      }
    } else {
      if (linha.length > 10) preparacaoLinhas.push(linha);
    }
  }

  // Se não detetou ingredientes, criar linha vazia
  if (ingredientes.length === 0) {
    ingredientes.push({ componente: '', qt: '', un: '', produto: '', tPrep: '', tConf: '', obs: '' });
  }

  // Preparação em passos
  const preparacao: PassoPreparacao[] = preparacaoLinhas.length > 0
    ? preparacaoLinhas.slice(0, 10).map((l, i) => ({
        num: i + 1,
        descricao: l,
        temperatura: '',
        tempo: '',
        obs: '',
      }))
    : [{ num: 1, descricao: '', temperatura: '', tempo: '', obs: '' }];

  return {
    ...FICHA_VAZIA,
    nomePrato,
    ingredientes,
    preparacao,
  };
}

// ============================================================
// Passo 1 — Introduzir link ou texto da receita
// ============================================================
function PassoLink({ onContinuar }: { onContinuar: (texto: string, link: string) => void }) {
  const [link, setLink] = useState('');
  const [textoManual, setTextoManual] = useState('');
  const [a_carregar, setACarregar] = useState(false);
  const [erro, setErro] = useState('');

  async function carregar() {
    if (!link && !textoManual) return;
    if (textoManual) {
      onContinuar(textoManual, '');
      return;
    }
    setACarregar(true);
    setErro('');
    try {
      // Usa um proxy CORS simples para ler o link
      const url = `https://api.allorigins.win/get?url=${encodeURIComponent(link)}`;
      const res = await fetch(url);
      const data = await res.json();
      // Extrair texto simples do HTML
      const div = document.createElement('div');
      div.innerHTML = data.contents || '';
      const texto = div.innerText || div.textContent || '';
      if (texto.length < 50) throw new Error('Conteúdo insuficiente');
      onContinuar(texto, link);
    } catch (e) {
      setErro('Não foi possível ler o link. Cola o texto da receita manualmente abaixo.');
    } finally {
      setACarregar(false);
    }
  }

  return (
    <Card>
      <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
        📋 Nova comanda — Passo 1: Receita
      </div>

      <Field label="Link da receita (internet)">
        <input
          className="input"
          value={link}
          onChange={e => setLink(e.target.value)}
          placeholder="https://www.exemplo.com/receita-bacalhau-bras"
        />
      </Field>

      <div className="muted" style={{ textAlign: 'center', margin: '8px 0' }}>ou</div>

      <Field label="Cola aqui o texto da receita">
        <textarea
          className="input"
          value={textoManual}
          onChange={e => setTextoManual(e.target.value)}
          placeholder="Cola aqui o texto completo da receita (ingredientes e modo de preparação)..."
          style={{ minHeight: 120 }}
        />
      </Field>

      {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}

      <Button
        block
        onClick={carregar}
        disabled={(!link && !textoManual) || a_carregar}
      >
        {a_carregar ? 'A carregar...' : 'Continuar →'}
      </Button>
    </Card>
  );
}

// ============================================================
// Passo 2 — Ficha técnica editável (formato ECL)
// ============================================================
function PassoFichaTecnica({
  ficha: fichaInicial,
  textoReceita,
  onContinuar,
  onVoltar,
}: {
  ficha: FichaTecnica;
  textoReceita: string;
  onContinuar: (ficha: FichaTecnica) => void;
  onVoltar: () => void;
}) {
  const [ficha, setFicha] = useState<FichaTecnica>(fichaInicial);

  function setF<K extends keyof FichaTecnica>(key: K, value: FichaTecnica[K]) {
    setFicha(prev => ({ ...prev, [key]: value }));
  }

  function setIngrediente(i: number, key: keyof LinhaIngrediente, value: string) {
    setFicha(prev => {
      const novo = [...prev.ingredientes];
      novo[i] = { ...novo[i], [key]: value };
      return { ...prev, ingredientes: novo };
    });
  }

  function addIngrediente() {
    setFicha(prev => ({
      ...prev,
      ingredientes: [...prev.ingredientes, { componente: '', qt: '', un: '', produto: '', tPrep: '', tConf: '', obs: '' }],
    }));
  }

  function removeIngrediente(i: number) {
    setFicha(prev => ({ ...prev, ingredientes: prev.ingredientes.filter((_, idx) => idx !== i) }));
  }

  function setPasso(i: number, key: keyof PassoPreparacao, value: string) {
    setFicha(prev => {
      const novo = [...prev.preparacao];
      novo[i] = { ...novo[i], [key]: value as never };
      return { ...prev, preparacao: novo };
    });
  }

  function addPasso() {
    setFicha(prev => ({
      ...prev,
      preparacao: [...prev.preparacao, { num: prev.preparacao.length + 1, descricao: '', temperatura: '', tempo: '', obs: '' }],
    }));
  }

  function removePasso(i: number) {
    setFicha(prev => ({
      ...prev,
      preparacao: prev.preparacao.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, num: idx + 1 })),
    }));
  }

  // Subtécnicas detetadas automaticamente
  const subtecnicasDetetadas = sugerirSubtecnicas(textoReceita + ' ' + ficha.nomePrato);

  return (
    <div>
      <Card>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          📋 Passo 2: Ficha Técnica
        </div>
        <div className="muted" style={{ marginBottom: 14 }}>
          Verifica e ajusta os dados extraídos automaticamente.
        </div>

        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <Field label="Nome do prato">
            <input className="input" value={ficha.nomePrato} onChange={e => setF('nomePrato', e.target.value)} />
          </Field>
          <Field label="Classificação">
            <input className="input" value={ficha.classificacao} onChange={e => setF('classificacao', e.target.value)} placeholder="ex: Peixe, Sobremesa..." />
          </Field>
          <Field label="Alergénicos">
            <input className="input" value={ficha.alergenicos} onChange={e => setF('alergenicos', e.target.value)} />
          </Field>
          <Field label="Nº Porções">
            <input className="input" value={ficha.numPorcoes} onChange={e => setF('numPorcoes', e.target.value)} />
          </Field>
          <Field label="Tempo Preparação">
            <input className="input" value={ficha.tempoPrep} onChange={e => setF('tempoPrep', e.target.value)} placeholder="ex: 30 min" />
          </Field>
          <Field label="Tempo Confeção">
            <input className="input" value={ficha.tempoConf} onChange={e => setF('tempoConf', e.target.value)} placeholder="ex: 45 min" />
          </Field>
        </div>
      </Card>

      {/* Ingredientes */}
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Ingredientes</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--charcoal)', color: '#fff' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Componente</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', width: 60 }}>Qt.</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', width: 50 }}>Un.</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Produto</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', width: 50 }}>T.Prep</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', width: 50 }}>T.Conf</th>
                <th style={{ padding: '6px 4px', textAlign: 'left' }}>Obs.</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {ficha.ingredientes.map((ing, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12 }}
                      value={ing.componente} onChange={e => setIngrediente(i, 'componente', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12, width: 55 }}
                      value={ing.qt} onChange={e => setIngrediente(i, 'qt', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12, width: 45 }}
                      value={ing.un} onChange={e => setIngrediente(i, 'un', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12 }}
                      value={ing.produto} onChange={e => setIngrediente(i, 'produto', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12, width: 45 }}
                      value={ing.tPrep} onChange={e => setIngrediente(i, 'tPrep', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12, width: 45 }}
                      value={ing.tConf} onChange={e => setIngrediente(i, 'tConf', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <input className="input" style={{ padding: '4px 6px', fontSize: 12 }}
                      value={ing.obs} onChange={e => setIngrediente(i, 'obs', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <button onClick={() => removeIngrediente(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 700 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="ghost" onClick={addIngrediente} block>+ Adicionar ingrediente</Button>
      </Card>

      {/* Modo de preparação */}
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Modo de Preparação</div>
        {ficha.preparacao.map((passo, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 16, minWidth: 24 }}>{passo.num}.</span>
              <div style={{ flex: 1 }}>
                <textarea className="input" style={{ minHeight: 64 }}
                  value={passo.descricao}
                  onChange={e => setPasso(i, 'descricao', e.target.value)}
                  placeholder="Descrição do passo..." />
              </div>
              <button onClick={() => removePasso(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 700, alignSelf: 'flex-start' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingLeft: 32 }}>
              <Field label="Temperatura">
                <input className="input" value={passo.temperatura}
                  onChange={e => setPasso(i, 'temperatura', e.target.value)} placeholder="ex: 180ºC" />
              </Field>
              <Field label="Tempo">
                <input className="input" value={passo.tempo}
                  onChange={e => setPasso(i, 'tempo', e.target.value)} placeholder="ex: 20 min" />
              </Field>
              <Field label="Observações">
                <input className="input" value={passo.obs}
                  onChange={e => setPasso(i, 'obs', e.target.value)} />
              </Field>
            </div>
          </div>
        ))}
        <Button variant="ghost" onClick={addPasso} block>+ Adicionar passo</Button>
      </Card>

      {/* Empratamento */}
      <Card>
        <Field label="Apresentação / Empratamento">
          <textarea className="input" value={ficha.empratamento}
            onChange={e => setF('empratamento', e.target.value)}
            placeholder="Descreve a apresentação e empratamento..." />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Elaborado por">
            <input className="input" value={ficha.elaboradoPor}
              onChange={e => setF('elaboradoPor', e.target.value)} />
          </Field>
          <Field label="Data">
            <input className="input" value={ficha.data}
              onChange={e => setF('data', e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Subtécnicas detetadas */}
      {subtecnicasDetetadas.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🔍 Subtécnicas detetadas automaticamente</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Com base no texto da receita. Serão usadas no passo seguinte para sugerir competências.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {subtecnicasDetetadas.map(s => (
              <span key={s.id} className="chip suggested">★ {s.nome}</span>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <Button block variant="ghost" onClick={onVoltar}>← Voltar</Button>
        <div style={{ height: 8 }} />
        <Button block onClick={() => onContinuar(ficha)} disabled={!ficha.nomePrato}>
          Continuar para Competências →
        </Button>
      </Card>
    </div>
  );
}

// ============================================================
// Vista principal do Professor — orquestra os 3 passos
// ============================================================
export function ProfessorView({ turmaId }: { turmaId: string }) {
  const [passo, setPasso] = useState<'link' | 'ficha' | 'comanda'>('link');
  const [textoReceita, setTextoReceita] = useState('');
  const [linkReceita, setLinkReceita] = useState('');
  const [ficha, setFicha] = useState<FichaTecnica>(FICHA_VAZIA);
  const [criada, setCriada] = useState<Comanda | null>(null);

  function guardarComanda(estado: EditorComandaState) {
    const comanda = estadoParaComanda(estado, turmaId);
    // Guardar também o nome da receita da ficha técnica
    const comandaFinal = { ...comanda, titulo: ficha.nomePrato || comanda.titulo };
    addComanda(comandaFinal);
    setCriada(comandaFinal);
  }

  // Estado inicial do EditorComanda com dados da ficha e link
  const estadoInicial: EditorComandaState = {
    ...ESTADO_VAZIO,
    titulo: ficha.nomePrato,
    linkOuTexto: linkReceita || textoReceita.slice(0, 200),
  };

  if (criada) {
    const todasFixas = [...criada.tecnicasFixas, ...criada.atitudesFixas, ...criada.responsabilidadesFixas];
    return (
      <Card>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>✅ Comanda criada</div>
        <div style={{ marginBottom: 10 }}>
          <strong>{criada.titulo}</strong>
        </div>
        <div className="muted" style={{ marginBottom: 12 }}>
          Alunos: {criada.alunosIds.map(id => id.split('-').pop()).join(', ')}
          <br />
          <span className="mono" style={{ fontSize: 11 }}>IDs: {criada.alunosIds.join(', ')}</span>
        </div>
        {todasFixas.length > 0 && (
          <>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Competências obrigatórias:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {todasFixas.map(id => (
                <span key={id} className="chip selected">🔒 {getCompetencia(id)?.nome}</span>
              ))}
            </div>
          </>
        )}
        <Button block onClick={() => { setCriada(null); setPasso('link'); setFicha(FICHA_VAZIA); setTextoReceita(''); setLinkReceita(''); }}>
          Nova comanda
        </Button>
      </Card>
    );
  }

  if (passo === 'link') {
    return (
      <PassoLink onContinuar={(texto, link) => {
        setTextoReceita(texto);
        setLinkReceita(link);
        setFicha(extrairFicha(texto));
        setPasso('ficha');
      }} />
    );
  }

  if (passo === 'ficha') {
    return (
      <PassoFichaTecnica
        ficha={ficha}
        textoReceita={textoReceita}
        onContinuar={(fichaConfirmada) => {
          setFicha(fichaConfirmada);
          setPasso('comanda');
        }}
        onVoltar={() => setPasso('link')}
      />
    );
  }

  return (
    <div>
      <Card>
        <div className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          📋 Passo 3: Competências e Comanda
        </div>
        <div className="muted" style={{ marginBottom: 4 }}>{ficha.nomePrato}</div>
        <Button variant="ghost" onClick={() => setPasso('ficha')}>← Voltar à ficha técnica</Button>
      </Card>
      <EditorComanda
        turmaId={turmaId}
        estadoInicial={estadoInicial}
        onGuardar={guardarComanda}
        tituloBotao="Criar comanda"
      />
    </div>
  );
}

