// ============================================================
// Painel inicial do professor.
//
// Mesmo princípio do aluno: grelha de blocos de cor com ícone e uma
// palavra. A cor é bordeaux, para o professor saber num relance em que
// perfil está — o aluno é violeta.
//
// São dezassete destinos, o que numa grelha corrida seria uma parede.
// Ficam agrupados por momento de uso: o que se faz antes da aula, o que
// se faz depois, e o que raramente se toca.
// ============================================================

import React from 'react';
import { VistaProf } from './Header';

const C = {
  fundo:         '#F5F2F3',
  branco:        '#FFFFFF',
  bordeaux:      '#7B2233',
  bordeauxSuave: '#F6ECEE',
  bordeauxClaro: '#EBCDD3',
  tinta:         '#1A1A1A',
  texto:         '#555555',
  suave:         '#777777',
  sombra:        '0 1px 3px rgba(0,0,0,0.06)',
};

export type { VistaProf };

const svg = (d: React.ReactNode, t = 38) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const I = {
  plano: () => svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M8 15h8" /></>),
  ficha: () => svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></>),
  guia: () => svg(<><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M9 7h6M9 11h6" /></>),
  requisicao: () => svg(<><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" /><path d="M8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2" /><path d="M9 12l1.8 1.8L15 10" /></>),
  eventos: () => svg(<><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6M3 21h18" /></>),
  validar: () => svg(<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
  notas: () => svg(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18M14 13l2 2 4-4" /></>),
  mapa: () => svg(<><path d="M4 20V6l6-3 4 3 6-3v14l-6 3-4-3-6 3z" /><path d="M10 3v15M14 6v15" /></>),
  recuperar: () => svg(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></>),
  biblioteca: () => svg(<><path d="M4 4h5v16H4zM10 4h5v16h-5z" /><path d="M16.5 4.5l3.5.9-3.5 15-.5-.1" /></>),
  manual: () => svg(<><path d="M12 6.5C10.5 5 8.5 4.5 6 4.5V19c2.5 0 4.5.5 6 2 1.5-1.5 3.5-2 6-2V4.5c-2.5 0-4.5.5-6 2z" /><path d="M12 6.5V21" /></>),
  orcamento: () => svg(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h4" /></>),
  cronograma: () => svg(<><path d="M4 6h10M4 12h16M4 18h7" /><circle cx="17" cy="6" r="2" /><circle cx="14" cy="18" r="2" /></>),
  historial: () => svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>),
  copia: () => svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></>),
  ajuda: () => svg(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" /><circle cx="12" cy="17" r="0.7" fill="currentColor" /></>),
};

interface Destino {
  id: VistaProf;
  label: string;
  icone: () => React.ReactNode;
  sub?: string;
}

interface Grupo {
  titulo: string;
  destinos: Destino[];
}

// Os mesmos nomes e a mesma ordem do menu lateral (NAV, no Header).
// Fichas técnicas saiu: abria o mesmo ecrã que a Biblioteca. Guiões e
// requisições criam-se dentro de cada plano; aqui ficam em "Mais".
function grupos(pendentes: { validar: number; recuperacoes: number }): Grupo[] {
  return [
    {
      titulo: 'Dia a dia',
      destinos: [
        { id: 'planos',  label: 'Planos de aula', icone: I.plano },
        { id: 'eventos', label: 'Eventos', icone: I.eventos },
      ],
    },
    {
      titulo: 'Avaliar',
      destinos: [
        { id: 'validacao', label: 'Validar', icone: I.validar,
          sub: pendentes.validar > 0 ? `${pendentes.validar} por validar` : undefined },
        { id: 'avaliacao_uc', label: 'Notas da UC', icone: I.notas },
        { id: 'mapa_competencias', label: 'Mapa da turma', icone: I.mapa },
        { id: 'gestao_recuperacoes', label: 'Recuperações', icone: I.recuperar,
          sub: pendentes.recuperacoes > 0 ? `${pendentes.recuperacoes} em curso` : undefined },
      ],
    },
    {
      titulo: 'Consultar',
      destinos: [
        { id: 'biblioteca',    label: 'Biblioteca de fichas', icone: I.biblioteca },
        { id: 'manual',        label: 'Manual do cozinheiro', icone: I.manual },
        { id: 'manuais_aluno', label: 'Manuais do aluno', icone: I.manual },
        { id: 'cronograma',    label: 'Cronograma', icone: I.cronograma },
      ],
    },
  ];
}

/** O que raramente se usa no dia a dia — fica atrás de "Mais". */
const MAIS: Destino[] = [
  { id: 'guia',            label: 'Guiões', icone: I.guia },
  { id: 'requisicao',      label: 'Requisições', icone: I.requisicao },
  { id: 'orcamentos',      label: 'Orçamentos', icone: I.orcamento },
  { id: 'historial',       label: 'Historial', icone: I.historial },
  { id: 'ajuda',           label: 'Ajuda', icone: I.ajuda },
];

/** A aula de hoje e a etapa em que está. O botão muda com a etapa. */
export interface AulaHojeProf {
  titulo: string;
  numero?: number;
  horario?: string;
  etapa: 'preparar' | 'publicar' | 'abrir' | 'turma' | 'validar';
  entraram?: string;
  porValidar: number;
}

const ETAPAS: { id: AulaHojeProf['etapa']; label: string; botao: string }[] = [
  { id: 'preparar', label: 'Preparar',      botao: 'Preparar a aula' },
  { id: 'publicar', label: 'Publicar',      botao: 'Rever e publicar' },
  { id: 'abrir',    label: 'Abrir a aula',  botao: 'Abrir a aula' },
  { id: 'turma',    label: 'Turma na aula', botao: 'Ver a turma' },
  { id: 'validar',  label: 'Validar',       botao: 'Validar' },
];

function Cartao({ d, onAbrir }: { d: Destino; onAbrir: (v: VistaProf) => void }) {
  return (
    <button
      onClick={() => onAbrir(d.id)}
      style={{
        background: C.bordeaux, border: 'none', borderRadius: 14,
        padding: '22px 10px', minHeight: 120, width: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        cursor: 'pointer', fontFamily: 'inherit', color: '#fff',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {d.icone()}
      <span style={{ fontSize: 15, fontWeight: 500, textAlign: 'center', lineHeight: 1.25 }}>
        {d.label}
      </span>
      {d.sub && (
        <span style={{ fontSize: 12.5, color: C.bordeauxClaro, textAlign: 'center' }}>{d.sub}</span>
      )}
    </button>
  );
}

interface Props {
  nomeProfessor: string;
  turmaId: string;
  turmaNome?: string;
  ucId?: string;
  ucNome?: string;
  aulasHoje?: number;
  proximasAulas?: number;
  porValidar?: number;
  recuperacoesEmCurso?: number;
  onAbrir: (v: VistaProf) => void;
  /** A aula de hoje, quando há. */
  aulaHoje?: AulaHojeProf | null;
  /** Abre o plano de hoje na etapa em que está. */
  onAbrirAulaHoje?: (etapa: AulaHojeProf['etapa']) => void;
}

export function PainelProfessor({
  nomeProfessor, turmaId, turmaNome, ucId, ucNome,
  aulasHoje = 0, proximasAulas = 0,
  porValidar = 0, recuperacoesEmCurso = 0,
  onAbrir, calendario, aulaHoje = null, onAbrirAulaHoje,
}: Props & {
  /** O calendário das aulas, ao lado dos cartões. Estava escondido
   *  dentro de "Planos de Aula" — o professor tinha de lá ir para ver
   *  o mês, quando é a primeira coisa que quer ver. */
  calendario?: React.ReactNode;
}) {
  const gs = grupos({ validar: porValidar, recuperacoes: recuperacoesEmCurso });
  const [verMais, setVerMais] = React.useState(false);
  const iEtapa = aulaHoje ? ETAPAS.findIndex(e => e.id === aulaHoje.etapa) : -1;

  return (
    <div style={{ background: C.fundo, minHeight: '100%', padding: 14 }}>
      <div style={{ maxWidth: calendario ? 1060 : 720, margin: '0 auto' }}>

        {/* O cartão "Quem sou" (nome e turma) saiu: está no menu lateral. */}

        {/* A unidade em curso */}
        <div style={{
          background: C.bordeauxSuave, borderRadius: 16,
          padding: '15px 17px', marginBottom: 18,
          borderLeft: `5px solid ${C.bordeaux}`,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: C.bordeaux,
          }}>
            {ucId || 'Sem unidade em curso'}
          </div>
          {ucNome && (
            <div style={{ fontSize: 18, fontWeight: 700, color: C.tinta, marginTop: 4, lineHeight: 1.3 }}>
              {ucNome}
            </div>
          )}
          <div style={{ fontSize: 15, color: C.texto, marginTop: 7 }}>
            {aulasHoje > 0
              ? `${aulasHoje} aula${aulasHoje > 1 ? 's' : ''} hoje`
              : proximasAulas > 0
                ? `Sem aulas hoje · ${proximasAulas} marcada${proximasAulas > 1 ? 's' : ''} para os próximos dias`
                : 'Sem aulas marcadas'}
          </div>
        </div>

        {/* A aula de hoje. O aluno tinha um botão grande para a aula; o
            professor tinha de ir a Planos, encontrar o plano e só lá
            dentro abria a aula. Agora o botão está aqui e muda com a
            etapa: preparar, publicar, abrir, ver a turma, validar. */}
        {aulaHoje && (
          <div style={{ background: C.bordeaux, color: '#fff', borderRadius: 18,
            padding: '20px 20px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: C.bordeauxClaro }}>A aula de hoje</div>
            {aulaHoje.horario && (
              <div style={{ fontSize: 14, color: C.bordeauxClaro, marginTop: 3 }}>{aulaHoje.horario}</div>
            )}
            <div style={{ fontSize: 21, fontWeight: 800, marginTop: 3, lineHeight: 1.25 }}>
              {aulaHoje.titulo}{aulaHoje.numero ? ` · Plano ${String(aulaHoje.numero).padStart(2, '0')}` : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ETAPAS.length}, minmax(0, 1fr))`,
              gap: 5, marginTop: 14 }}>
              {ETAPAS.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                  <div style={{ height: 5, borderRadius: 3,
                    background: i < iEtapa ? '#fff' : i === iEtapa ? '#F6A623' : 'rgba(255,255,255,0.28)' }} />
                  <span style={{ fontSize: 11.5, lineHeight: 1.2, overflowWrap: 'anywhere', paddingRight: 2,
                    color: i === iEtapa ? '#fff' : C.bordeauxClaro, fontWeight: i === iEtapa ? 700 : 400 }}>
                    {e.label}
                  </span>
                </div>
              ))}
            </div>
            {aulaHoje.entraram && (
              <div style={{ fontSize: 13.5, color: C.bordeauxClaro, marginTop: 10 }}>
                {aulaHoje.entraram} alunos entraram
              </div>
            )}
            {onAbrirAulaHoje && (
              <button onClick={() => onAbrirAulaHoje(aulaHoje.etapa)} style={{
                marginTop: 14, minHeight: 52, padding: '0 24px', borderRadius: 12, border: 'none',
                background: '#fff', color: C.bordeaux, fontSize: 16.5, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {ETAPAS[iEtapa]?.botao}{aulaHoje.etapa === 'validar' && aulaHoje.porValidar ? ` (${aulaHoje.porValidar})` : ''}
              </button>
            )}
          </div>
        )}

        {/* Os cartões de atalho (Planos, Eventos, Validar, Notas…) saíram:
            repetiam, um a um, o menu lateral. O Início fica com a unidade
            em curso, a aula de hoje e o que falta fazer. */}
        {!aulaHoje && (
          <button onClick={() => onAbrir('planos' as any)} style={{
            width: '100%', minHeight: 52, borderRadius: 12, border: 'none', marginBottom: 20,
            background: C.bordeaux, color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Ver os planos de aula
          </button>
        )}
        <div style={{
          display: calendario ? 'grid' : 'block',
          gridTemplateColumns: calendario ? 'minmax(0, 1fr) minmax(300px, 380px)' : undefined,
          gap: 20, alignItems: 'start',
        }}>
        <div />
        {/* O calendário, à direita. */}
        {calendario && (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 16,
            border: '1px solid rgba(26,23,20,0.1)', position: 'sticky', top: 14,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: C.suave, marginBottom: 10,
            }}>
              As tuas aulas
            </div>
            {calendario}
          </div>
        )}
        </div>

      </div>
    </div>
  );
}

export const CORES_PROF = C;
