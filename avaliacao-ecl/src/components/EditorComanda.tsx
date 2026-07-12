import React, { useState } from 'react';
import { Comanda, ModoTrabalho, TipoServico, TIPO_SERVICO_LABEL, Categoria } from '../types';
import { Button, Card, Field, Chip } from './ui';
import { sugerirTecnicas, sugerirTecnicasPorServico, sugerirAtitudes, sugerirResponsabilidades, getCompetencia } from '../compatECL';
import { getAlunos } from '../backend';

export interface EditorComandaState {
  titulo: string;
  linkOuTexto: string;
  fatorConversao: string;
  modo: ModoTrabalho;
  tipoServico: TipoServico;
  atendimentoCliente: boolean;
  alunosNumeros: string;
  fixas: Record<Categoria, string[]>;
}

export function comandaParaEstado(c: Comanda): EditorComandaState {
  return {
    titulo: c.titulo,
    linkOuTexto: c.linkOuTexto,
    fatorConversao: c.fatorConversao ? String(c.fatorConversao) : '',
    modo: c.modo,
    tipoServico: c.tipoServico || 'normal',
    atendimentoCliente: c.atendimentoCliente,
    alunosNumeros: c.alunosIds.map(id => id.split('-').pop()).join(','),
    fixas: {
      TECNICAS: c.tecnicasFixas || [],
      ATITUDES: c.atitudesFixas || [],
      RESPONSABILIDADES: c.responsabilidadesFixas || [],
    },
  };
}

export const ESTADO_VAZIO: EditorComandaState = {
  titulo: '',
  linkOuTexto: '',
  fatorConversao: '',
  modo: 'grupo',
  tipoServico: 'normal',
  atendimentoCliente: false,
  alunosNumeros: '',
  fixas: { TECNICAS: [], ATITUDES: [], RESPONSABILIDADES: [] },
};

/**
 * Constrói o objeto Comanda completo a partir do estado do editor.
 * `id`, `turmaId`, `data` e `criadaEm` são preservados se existirem
 * (edição) ou criados de novo (criação).
 */
export function estadoParaComanda(estado: EditorComandaState, turmaId: string, base?: Comanda): Comanda {
  const texto = `${estado.titulo} ${estado.linkOuTexto}`;
  const tecnicasSugeridas = Array.from(new Set([
    ...sugerirTecnicas(texto),
    ...sugerirTecnicasPorServico(estado.tipoServico),
  ]));
  const atitudesSugeridas = sugerirAtitudes(estado.modo, estado.atendimentoCliente, estado.tipoServico);
  const responsabilidadesSugeridas = sugerirResponsabilidades(estado.modo, estado.atendimentoCliente, estado.tipoServico);

  const alunosIds = estado.alunosNumeros
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(n => `${turmaId}-${n}`);

  return {
    id: base?.id || `${turmaId}-${Date.now()}`,
    turmaId,
    data: base?.data || new Date().toISOString().slice(0, 10),
    titulo: estado.titulo,
    linkOuTexto: estado.linkOuTexto,
    fatorConversao: estado.fatorConversao ? Number(estado.fatorConversao) : undefined,
    modo: estado.modo,
    tipoServico: estado.tipoServico,
    atendimentoCliente: estado.atendimentoCliente,
    alunosIds,
    tecnicasSugeridas,
    atitudesSugeridas,
    responsabilidadesSugeridas,
    tecnicasFixas: estado.fixas.TECNICAS,
    atitudesFixas: estado.fixas.ATITUDES,
    responsabilidadesFixas: estado.fixas.RESPONSABILIDADES,
    criadaEm: base?.criadaEm || new Date().toISOString(),
  };
}

export function EditorComanda({
  turmaId, estadoInicial, onGuardar, onCancelar, tituloBotao,
}: {
  turmaId: string;
  estadoInicial: EditorComandaState;
  onGuardar: (estado: EditorComandaState) => void;
  onCancelar?: () => void;
  tituloBotao: string;
}) {
  const [estado, setEstado] = useState<EditorComandaState>(estadoInicial);

  const texto = `${estado.titulo} ${estado.linkOuTexto}`;
  const tecnicasSugeridas = Array.from(new Set([
    ...sugerirTecnicas(texto),
    ...sugerirTecnicasPorServico(estado.tipoServico),
  ]));
  const atitudesSugeridas = sugerirAtitudes(estado.modo, estado.atendimentoCliente, estado.tipoServico);
  const responsabilidadesSugeridas = sugerirResponsabilidades(estado.modo, estado.atendimentoCliente, estado.tipoServico);

  const alunosDaTurma = getAlunos().filter(a => a.turmaId === turmaId);

  function set<K extends keyof EditorComandaState>(key: K, value: EditorComandaState[K]) {
    setEstado(prev => ({ ...prev, [key]: value }));
  }

  function toggleFixa(cat: Categoria, id: string) {
    setEstado(prev => {
      const atual = prev.fixas[cat];
      const novo = atual.includes(id) ? atual.filter(x => x !== id) : [...atual, id];
      return { ...prev, fixas: { ...prev.fixas, [cat]: novo } };
    });
  }

  return (
    <Card>
      <Field label="Nome da receita / atividade">
        <input className="input" value={estado.titulo} onChange={e => set('titulo', e.target.value)} placeholder="ex: Bacalhau à Brás para buffet" />
      </Field>

      <Field label="Link ou texto da receita">
        <textarea className="input" value={estado.linkOuTexto} onChange={e => set('linkOuTexto', e.target.value)} placeholder="Cola aqui o link ou o texto da receita..." />
      </Field>

      <Field label="Fator de conversão (opcional)">
        <input className="input" type="number" step="0.1" value={estado.fatorConversao} onChange={e => set('fatorConversao', e.target.value)} placeholder="ex: 5 (receita p/4 → para 20 pessoas)" />
      </Field>

      <Field label="Modo de trabalho">
        <div>
          <Chip selected={estado.modo === 'individual'} onClick={() => set('modo', 'individual')}>Individual</Chip>
          <Chip selected={estado.modo === 'grupo'} onClick={() => set('modo', 'grupo')}>Grupo</Chip>
        </div>
      </Field>

      <Field label="Tipo de serviço">
        <select className="input" value={estado.tipoServico} onChange={e => set('tipoServico', e.target.value as TipoServico)}>
          {Object.entries(TIPO_SERVICO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>

      <Field label="Atendimento a clientes?">
        <div>
          <Chip selected={!estado.atendimentoCliente} onClick={() => set('atendimentoCliente', false)}>Não</Chip>
          <Chip selected={estado.atendimentoCliente} onClick={() => set('atendimentoCliente', true)}>Sim</Chip>
        </div>
      </Field>

      <Field label={estado.modo === 'grupo' ? 'Números dos alunos do grupo (separados por vírgula)' : 'Número do aluno'}>
        <input className="input" value={estado.alunosNumeros} onChange={e => set('alunosNumeros', e.target.value)} placeholder={estado.modo === 'grupo' ? 'ex: 3,7,12,15' : 'ex: 12'} />
      </Field>

      {alunosDaTurma.length > 0 && (
        <div className="muted" style={{ marginBottom: 12 }}>
          Alunos já registados nesta turma: {alunosDaTurma.map(a => a.numero).sort((a,b)=>a-b).join(', ')}
        </div>
      )}

      <div className="divider" />
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Competências sugeridas</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Clica numa sugestão para a tornar <strong>obrigatória</strong> (🔒) — o aluno não a poderá remover. As não marcadas ficam como sugestão que o aluno pode aceitar ou trocar.
      </div>

      {([
        { cat: 'TECNICAS' as Categoria, label: 'Técnicas', sugeridas: tecnicasSugeridas },
        { cat: 'ATITUDES' as Categoria, label: 'Atitudes', sugeridas: atitudesSugeridas },
        { cat: 'RESPONSABILIDADES' as Categoria, label: 'Responsabilidades', sugeridas: responsabilidadesSugeridas },
      ]).map(({ cat, label, sugeridas }) => (
        <div key={cat} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{label}</div>
          {sugeridas.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Nenhuma sugestão automática.</span>}
          {sugeridas.map(id => (
            <Chip key={id} selected={estado.fixas[cat].includes(id)} suggested onClick={() => toggleFixa(cat, id)}>
              {estado.fixas[cat].includes(id) ? '🔒 ' : '★ '}{getCompetencia(id)?.nome}
            </Chip>
          ))}
        </div>
      ))}

      {onCancelar && (
        <>
          <Button block variant="ghost" onClick={onCancelar}>← Voltar</Button>
          <div style={{ height: 8 }} />
        </>
      )}
      <Button block onClick={() => onGuardar(estado)} disabled={!estado.titulo || !estado.alunosNumeros}>{tituloBotao}</Button>
    </Card>
  );
}
