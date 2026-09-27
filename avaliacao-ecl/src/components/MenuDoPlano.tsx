// ============================================================
// Menu do plano — a coluna da esquerda enquanto se está lá dentro.
//
// O professor entrava num plano e deixava de saber onde estava: criava
// uma ficha sem perceber que ela ficava naquele plano, e não tinha como
// ver o que o plano já tinha sem andar aos separadores.
//
// Aqui vê tudo: qual é o plano, o que tem, o que falta, e a saída.
// ============================================================

import { gruposDaAula } from '../backend';
import React, { useEffect, useState } from 'react';
import type { PlanoAula, FichaProducao } from '../types';
import { BotaoPublicar } from './BotaoPublicar';
import { estadoPublicacao, subscreverPublicacao } from '../backend';

export type ModuloPlano =
  | 'inicio' | 'ficha' | 'guia' | 'requisicao'
  | 'competencias' | 'turma' | 'validacao' | 'registos' | 'editar' | 'grupos';

const BRANCO_FORTE = '#ffffff';
const BRANCO_MEIO = 'rgba(255,255,255,0.82)';
const BRANCO_TENUE = 'rgba(255,255,255,0.45)';
const RISCA = 'rgba(255,255,255,0.15)';

function Linha({
  marca, texto, contador, activo, aoClicar,
}: {
  marca: 'feito' | 'falta' | 'neutro';
  texto: string;
  contador?: string | number;
  activo?: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      onClick={aoClicar}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
        padding: '11px 15px', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left', fontSize: 13.5,
        background: activo ? 'rgba(255,255,255,0.16)' : 'transparent',
        color: activo ? BRANCO_FORTE : BRANCO_MEIO,
        fontWeight: activo ? 700 : 500,
      }}>
      <span style={{ width: 16, flexShrink: 0, textAlign: 'center', fontSize: 12 }}>
        {marca === 'feito' ? '✓' : marca === 'falta' ? '○' : '·'}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>{texto}</span>
      {contador !== undefined && (
        <span style={{ fontSize: 12, color: BRANCO_TENUE, flexShrink: 0 }}>
          {contador}
        </span>
      )}
    </button>
  );
}

export function MenuDoPlano({
  plano, fichas, temRequisicao, numeroRequisicao, totalCompetencias,
  posicao, totalPlanos, moduloActivo, aoIrPara, aoSair, aoPublicar, depoisDePublicar,
  alunosNaAula, porValidar, autoavaliacoes, aviso, disciplina, requisicaoDesatualizada,
}: {
  plano: PlanoAula;
  fichas: FichaProducao[];
  temRequisicao: boolean;
  numeroRequisicao?: string;
  totalCompetencias: number;
  /** "Plano 3 de 5" — a posição dentro da unidade. */
  posicao?: number;
  totalPlanos?: number;
  moduloActivo: ModuloPlano;
  aoIrPara: (m: ModuloPlano) => void;
  aoSair: () => void;
  /** Pergunta antes de publicar (turma certa). Devolve false para não publicar. */
  aoPublicar?: () => boolean;
  depoisDePublicar?: (ok: boolean) => void;
  /** "12/18" quando a aula está aberta; nada antes disso. */
  alunosNaAula?: string;
  /** Autoavaliações deste plano à espera de validação. */
  porValidar?: number;
  /** Autoavaliações submetidas nesta aula, validadas ou não. */
  autoavaliacoes?: number;
  /** Aviso de fim de unidade, quando se aplica. */
  aviso?: string;
  /** A disciplina deste plano — cozinha, gestão e controlo… */
  disciplina?: string;
  /** A requisição foi feita antes de mudarem as fichas. */
  requisicaoDesatualizada?: boolean;
}) {
  const comGuiao = fichas.filter(f => !!(f as any).textoGuia).length;
  // O bloco de publicar continua à vista enquanto envia e depois confirma.
  const [, setV] = useState(0);
  useEffect(() => subscreverPublicacao(() => setV(v => v + 1)), []);
  const publicado = plano.estado === 'publicado';

  const diaSemana = (() => {
    const d = new Date(String(plano.data).slice(0, 10) + 'T00:00:00');
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-PT', { weekday: 'long' });
  })();

  const limpa = (h?: string) => !h ? '' :
    (h.includes('T')
      ? new Date(h).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      : h.substring(0, 5));
  const horario = (limpa(plano.horaInicio) && limpa(plano.horaFim))
    ? `${limpa(plano.horaInicio)}–${limpa(plano.horaFim)}` : '';

  const dataCurta = (() => {
    const d = new Date(String(plano.data).slice(0, 10) + 'T00:00:00');
    if (isNaN(d.getTime())) return String(plano.data || '');
    return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* Identificação — tudo o que o professor precisa de saber sobre
          este plano. Estava repetido num cabeçalho por cima do conteúdo;
          aqui fica num sítio só, sempre à vista. */}
      <div style={{ padding: '15px 15px 14px', borderBottom: `1px solid ${RISCA}` }}>
        <div style={{ fontSize: 10, letterSpacing: '0.09em', fontWeight: 800,
          color: BRANCO_TENUE }}>
          {posicao && totalPlanos
            ? `PLANO ${posicao} DE ${totalPlanos}`
            : 'PLANO DE AULA'}
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 3, color: BRANCO_FORTE }}>
          {dataCurta}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 1 }}>
          {diaSemana}{horario ? ` · ${horario}` : ''}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>
          {plano.turmaId}
        </div>
        {/* Quando o plano foi criado — diferente do dia da aula. */}
        {(plano as any).criadoEm && (
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>
            Criado a {new Date((plano as any).criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* A unidade, com o nome por extenso. */}
        {plano.ucId ? (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.12)' }}>
            {/* A disciplina, antes da unidade. O professor dá duas ao
                mesmo tempo — tem de saber qual está a trabalhar. */}
            {disciplina && (
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#ffd9a0',
                marginBottom: 5, lineHeight: 1.3 }}>
                {disciplina}
              </div>
            )}
            <div style={{ fontSize: 10, letterSpacing: '0.08em', fontWeight: 800,
              color: 'rgba(255,255,255,0.55)' }}>
              {disciplina ? 'MÓDULO' : 'UNIDADE'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: BRANCO_FORTE, marginTop: 2 }}>
              {plano.ucId}
            </div>
            {plano.ucNome && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)',
                marginTop: 2, lineHeight: 1.4 }}>
                {plano.ucNome}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8,
            background: 'rgba(255,180,80,0.2)', fontSize: 12,
            color: '#ffd9a0', fontWeight: 700 }}>
            Unidade por definir
          </div>
        )}

        {/* O aviso de última aula da unidade, quando se aplica. */}
        {aviso && (
          <div style={{ marginTop: 9, padding: '8px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.14)', fontSize: 11.5,
            color: 'rgba(255,255,255,0.9)', lineHeight: 1.45 }}>
            {aviso}
          </div>
        )}
        <span style={{
          display: 'inline-block', marginTop: 9, fontSize: 10.5, fontWeight: 800,
          padding: '3px 9px', borderRadius: 12,
          background: publicado ? 'rgba(144,190,109,0.3)' : 'rgba(255,255,255,0.2)',
          color: BRANCO_FORTE,
        }}>
          {publicado ? 'publicado' : 'rascunho'}
        </span>
      </div>

      {/* Publicar — em cima e em grande enquanto for rascunho, com o que
          ainda falta. Estava no fundo, pequeno, ao lado de "Editar". */}
      {aoPublicar && (!publicado || estadoPublicacao(plano.id)) && (() => {
        const falta = [
          fichas.length === 0 && 'as fichas',
          (!temRequisicao || requisicaoDesatualizada) && 'a requisição',
          totalCompetencias === 0 && 'as competências',
        ].filter(Boolean) as string[];
        return (
          <div style={{ padding: '14px 14px 6px' }}>
            <BotaoPublicar claro planoId={plano.id}
              antesDePublicar={aoPublicar} depoisDePublicar={depoisDePublicar} />
            {!publicado && (
              <div style={{ fontSize: 12, color: BRANCO_MEIO, marginTop: 7, lineHeight: 1.45 }}>
                Só depois disto os alunos veem a aula.
                {falta.length > 0
                  ? ` Ainda falta${falta.length > 1 ? 'm' : ''}: ${falta.join(', ')}.`
                  : ' Está tudo pronto.'}
              </div>
            )}
          </div>
        );
      })()}

      {/* O que o plano tem */}
      <div style={{ paddingTop: 5 }}>
        <Linha
          marca={fichas.length > 0 ? 'feito' : 'falta'}
          texto="Fichas"
          contador={fichas.length || '—'}
          activo={moduloActivo === 'ficha' || moduloActivo === 'inicio'}
          aoClicar={() => aoIrPara('inicio')} />

        <Linha
          marca={fichas.length > 0 && comGuiao === fichas.length ? 'feito' : 'falta'}
          texto="Guião"
          contador={fichas.length ? `${comGuiao}/${fichas.length}` : '—'}
          activo={moduloActivo === 'guia'}
          aoClicar={() => aoIrPara('guia')} />

        <Linha
          marca={temRequisicao && !requisicaoDesatualizada ? 'feito' : 'falta'}
          texto={requisicaoDesatualizada ? 'Requisição — desatualizada' : 'Requisição'}
          contador={numeroRequisicao || (temRequisicao ? '✓' : '—')}
          activo={moduloActivo === 'requisicao'}
          aoClicar={() => aoIrPara('requisicao')} />

        <Linha
          marca={totalCompetencias > 0 ? 'feito' : 'falta'}
          texto="Competências"
          contador={totalCompetencias || '—'}
          activo={moduloActivo === 'competencias'}
          aoClicar={() => aoIrPara('competencias')} />

        {/* Autoavaliações desta aula. Antes só havia o aviso quando estavam
            por validar — depois de validadas, não havia sítio nenhum para
            lhes voltar. */}
        <Linha
          marca={autoavaliacoes ? (porValidar ? 'falta' : 'feito') : 'neutro'}
          texto="Autoavaliações"
          contador={autoavaliacoes ? `${autoavaliacoes - (porValidar || 0)}/${autoavaliacoes}` : '—'}
          activo={moduloActivo === 'validacao'}
          aoClicar={() => aoIrPara('validacao')} />

        {/* A turma: depois de a aula abrir, ou numa aula que já passou —
            é aí que se marcam as faltas de uma aula criada depois. */}
        {(alunosNaAula || String(plano.data || '').slice(0, 10) < new Date().toISOString().slice(0, 10)) && (
          <Linha
            marca="neutro"
            texto="Turma e faltas"
            contador={alunosNaAula || '—'}
            activo={moduloActivo === 'turma'}
            aoClicar={() => aoIrPara('turma')} />
        )}

        {/* Grupos: os alunos formam-nos e o professor valida. */}
        <Linha
          marca="neutro"
          texto="Grupos"
          contador={(plano as any).gruposAlunos?.ativo ? (gruposDaAula(plano.id).length || '0') : '—'}
          activo={moduloActivo === 'grupos'}
          aoClicar={() => aoIrPara('grupos')} />
      </div>

      {/* Autoavaliações por validar. Enquanto não forem validadas não
          contam para nada — nem para a nota, nem para o banco. */}
      {!!porValidar && porValidar > 0 && (
        <button
          onClick={() => aoIrPara('validacao')}
          style={{
            margin: '10px 12px', padding: '11px 13px', borderRadius: 10,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            textAlign: 'left', width: 'calc(100% - 24px)',
            background: '#F6A623', color: '#3d2a00',
          }}>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800 }}>
            {porValidar} autoavaliaç{porValidar === 1 ? 'ão' : 'ões'} por validar
          </span>
          <span style={{ display: 'block', fontSize: 11.5, marginTop: 2,
            lineHeight: 1.4, opacity: 0.85 }}>
            Sem validação não contam para a nota.
          </span>
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Corrigir o plano — data, horas, tipo, unidade, título — a
          qualquer momento, mesmo com a aula já aberta. */}
      <button onClick={() => aoIrPara('editar')} style={{
        margin: '4px 12px', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.3)', fontFamily: 'inherit', textAlign: 'left',
        background: moduloActivo === 'editar' ? 'rgba(255,255,255,0.16)' : 'transparent',
        color: BRANCO_FORTE, fontSize: 13.5, fontWeight: 700,
      }}>
        ✏️ Editar o plano
      </button>


      {/* A saída */}
      <button onClick={aoSair} style={{
        padding: '13px 15px', border: 'none', borderTop: `1px solid ${RISCA}`,
        background: 'transparent', color: 'rgba(255,255,255,0.8)',
        fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
        textAlign: 'left', fontWeight: 600,
      }}>
        ← Todos os planos
      </button>
    </div>
  );
}
