// ============================================================
// Menu do plano — a coluna da esquerda enquanto se está lá dentro.
//
// O professor entrava num plano e deixava de saber onde estava: criava
// uma ficha sem perceber que ela ficava naquele plano, e não tinha como
// ver o que o plano já tinha sem andar aos separadores.
//
// Aqui vê tudo: qual é o plano, o que tem, o que falta, e a saída.
// ============================================================

import React from 'react';
import type { PlanoAula, FichaProducao } from '../types';

export type ModuloPlano =
  | 'inicio' | 'ficha' | 'guia' | 'requisicao'
  | 'competencias' | 'turma' | 'validacao' | 'registos';

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
  posicao, totalPlanos, moduloActivo, aoIrPara, aoSair, aoPublicar,
  alunosNaAula, porValidar,
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
  aoPublicar?: () => void;
  /** "12/18" quando a aula está aberta; nada antes disso. */
  alunosNaAula?: string;
  /** Autoavaliações deste plano à espera de validação. */
  porValidar?: number;
}) {
  const comGuiao = fichas.filter(f => !!(f as any).textoGuia).length;
  const publicado = plano.estado === 'publicado';

  const dataCurta = (() => {
    const d = new Date(String(plano.data).slice(0, 10) + 'T00:00:00');
    if (isNaN(d.getTime())) return String(plano.data || '');
    return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* Identificação — quem é este plano */}
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
          {plano.turmaId}{plano.ucId ? ` · ${plano.ucId}` : ''}
        </div>
        <span style={{
          display: 'inline-block', marginTop: 9, fontSize: 10.5, fontWeight: 800,
          padding: '3px 9px', borderRadius: 12,
          background: publicado ? 'rgba(144,190,109,0.3)' : 'rgba(255,255,255,0.2)',
          color: BRANCO_FORTE,
        }}>
          {publicado ? 'publicado' : 'rascunho'}
        </span>
      </div>

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
          marca={temRequisicao ? 'feito' : 'falta'}
          texto="Requisição"
          contador={numeroRequisicao || (temRequisicao ? '✓' : '—')}
          activo={moduloActivo === 'requisicao'}
          aoClicar={() => aoIrPara('requisicao')} />

        <Linha
          marca={totalCompetencias > 0 ? 'feito' : 'falta'}
          texto="Competências"
          contador={totalCompetencias || '—'}
          activo={moduloActivo === 'competencias'}
          aoClicar={() => aoIrPara('competencias')} />

        {/* A turma só faz sentido depois de a aula abrir. */}
        {alunosNaAula && (
          <Linha
            marca="neutro"
            texto="Turma"
            contador={alunosNaAula}
            activo={moduloActivo === 'turma'}
            aoClicar={() => aoIrPara('turma')} />
        )}
      </div>

      {/* Autoavaliações por validar. Enquanto não forem validadas não
          contam para nada — nem para a nota, nem para o banco. */}
      {!!porValidar && porValidar > 0 && (
        <button
          onClick={() => aoIrPara('turma')}
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

      {/* Publicar — só enquanto não estiver */}
      {!publicado && aoPublicar && (
        <div style={{ padding: '12px 15px' }}>
          <button onClick={aoPublicar} style={{
            width: '100%', padding: 10, borderRadius: 9, border: 'none',
            background: 'var(--sage, #5a7a4e)', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Publicar a aula
          </button>
          <div style={{ fontSize: 11.5, color: BRANCO_TENUE, marginTop: 7,
            lineHeight: 1.45 }}>
            Só depois disto os alunos veem a aula.
          </div>
        </div>
      )}

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
