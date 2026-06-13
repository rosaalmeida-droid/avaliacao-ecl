import React, { useState } from 'react';
import { Comanda, ModoTrabalho, TipoServico, TIPO_SERVICO_LABEL } from '../types';
import { Button, Card, Field, Chip } from './ui';
import { sugerirTecnicas, sugerirTecnicasPorServico, sugerirAtitudes, sugerirResponsabilidades, getCompetencia } from '../competencias';
import { addComanda, getAlunos } from '../backend';

export function ProfessorView({ turmaId }: { turmaId: string }) {
  const [titulo, setTitulo] = useState('');
  const [linkOuTexto, setLinkOuTexto] = useState('');
  const [fatorConversao, setFatorConversao] = useState('');
  const [modo, setModo] = useState<ModoTrabalho>('grupo');
  const [tipoServico, setTipoServico] = useState<TipoServico>('normal');
  const [atendimentoCliente, setAtendimentoCliente] = useState(false);
  const [alunosNumeros, setAlunosNumeros] = useState(''); // ex: "3,7,12,15"
  const [criada, setCriada] = useState<Comanda | null>(null);

  const alunosDaTurma = getAlunos().filter(a => a.turmaId === turmaId);

  function criar() {
    const texto = `${titulo} ${linkOuTexto}`;
    const tecnicasSugeridas = Array.from(new Set([
      ...sugerirTecnicas(texto),
      ...sugerirTecnicasPorServico(tipoServico),
    ]));
    const atitudesSugeridas = sugerirAtitudes(modo, atendimentoCliente, tipoServico);
    const responsabilidadesSugeridas = sugerirResponsabilidades(modo, atendimentoCliente, tipoServico);

    const alunosIds = alunosNumeros
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(n => `${turmaId}-${n}`);

    const comanda: Comanda = {
      id: `${turmaId}-${Date.now()}`,
      turmaId,
      data: new Date().toISOString().slice(0, 10),
      titulo,
      linkOuTexto,
      fatorConversao: fatorConversao ? Number(fatorConversao) : undefined,
      modo,
      tipoServico,
      atendimentoCliente,
      alunosIds,
      tecnicasSugeridas,
      atitudesSugeridas,
      responsabilidadesSugeridas,
      criadaEm: new Date().toISOString(),
    };

    addComanda(comanda);
    setCriada(comanda);
  }

  function novaComanda() {
    setCriada(null);
    setTitulo('');
    setLinkOuTexto('');
    setFatorConversao('');
    setAlunosNumeros('');
  }

  if (criada) {
    return (
      <Card>
        <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>✅ Comanda criada</div>
        <div className="muted" style={{ marginBottom: 10 }}>{criada.titulo}</div>

        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Técnicas sugeridas</div>
        <div style={{ marginBottom: 12 }}>
          {criada.tecnicasSugeridas.length === 0 && <span className="muted">Nenhuma deteção automática — o aluno escolhe livremente.</span>}
          {criada.tecnicasSugeridas.map(id => (
            <Chip key={id} suggested>{getCompetencia(id)?.nome}</Chip>
          ))}
        </div>

        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Atitudes sugeridas</div>
        <div style={{ marginBottom: 12 }}>
          {criada.atitudesSugeridas.map(id => (
            <Chip key={id} suggested>{getCompetencia(id)?.nome}</Chip>
          ))}
        </div>

        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Responsabilidades sugeridas</div>
        <div style={{ marginBottom: 16 }}>
          {criada.responsabilidadesSugeridas.map(id => (
            <Chip key={id} suggested>{getCompetencia(id)?.nome}</Chip>
          ))}
        </div>

        <div className="muted" style={{ marginBottom: 12 }}>
          Alunos atribuídos: {criada.alunosIds.length > 0 ? criada.alunosIds.map(id => id.split('-').pop()).join(', ') : 'nenhum (verificar números)'}
        </div>

        <Button block onClick={novaComanda}>Criar outra comanda</Button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Nova comanda</div>

      <Field label="Nome da receita / atividade">
        <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="ex: Bacalhau à Brás para buffet" />
      </Field>

      <Field label="Link ou texto da receita">
        <textarea className="input" value={linkOuTexto} onChange={e => setLinkOuTexto(e.target.value)} placeholder="Cola aqui o link ou o texto da receita..." />
      </Field>

      <Field label="Fator de conversão (opcional)">
        <input className="input" type="number" step="0.1" value={fatorConversao} onChange={e => setFatorConversao(e.target.value)} placeholder="ex: 5 (receita p/4 → para 20 pessoas)" />
      </Field>

      <Field label="Modo de trabalho">
        <div>
          <Chip selected={modo === 'individual'} onClick={() => setModo('individual')}>Individual</Chip>
          <Chip selected={modo === 'grupo'} onClick={() => setModo('grupo')}>Grupo</Chip>
        </div>
      </Field>

      <Field label="Tipo de serviço">
        <select className="input" value={tipoServico} onChange={e => setTipoServico(e.target.value as TipoServico)}>
          {Object.entries(TIPO_SERVICO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>

      <Field label="Atendimento a clientes?">
        <div>
          <Chip selected={!atendimentoCliente} onClick={() => setAtendimentoCliente(false)}>Não</Chip>
          <Chip selected={atendimentoCliente} onClick={() => setAtendimentoCliente(true)}>Sim</Chip>
        </div>
      </Field>

      <Field label={modo === 'grupo' ? 'Números dos alunos do grupo (separados por vírgula)' : 'Número do aluno'}>
        <input className="input" value={alunosNumeros} onChange={e => setAlunosNumeros(e.target.value)} placeholder={modo === 'grupo' ? 'ex: 3,7,12,15' : 'ex: 12'} />
      </Field>

      {alunosDaTurma.length > 0 && (
        <div className="muted" style={{ marginBottom: 12 }}>
          Alunos já registados nesta turma: {alunosDaTurma.map(a => a.numero).sort((a,b)=>a-b).join(', ')}
        </div>
      )}

      <Button block onClick={criar} disabled={!titulo || !alunosNumeros}>Criar comanda</Button>
    </Card>
  );
}
