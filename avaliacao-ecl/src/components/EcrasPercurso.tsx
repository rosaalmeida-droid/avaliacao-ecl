// ============================================================
// Ecrãs do percurso do aluno.
//
//   Avaliar-me ............. competências agrupadas pelos 4 estados
//   Nota progressiva ....... historial das avaliações desta UC
//   Perfil profissional .... pontos fortes e áreas a desenvolver
//
// Regra em todo o lado: nunca um número sem dizer de que é.
// "3" não diz nada; "3 competências por avaliar hoje" diz.
// ============================================================

import React from 'react';
import {
  EstadoComp, CompComEstado, agruparPorEstado, tituloGrupo,
  perfilProfissional, estadoDoNivel,
} from '../motorAvaliacao';

// Mesma paleta do PainelAluno: violeta forte, fundo cinzento claro,
// cartões brancos. O conteúdo é branco para não cansar a leitura —
// o violeta fica no cabeçalho e nos botões de ação.
const T = {
  fundo:    '#F3F2F5',
  charcoal: '#1A1A1A',
  violeta:  '#6B3FA0',
  violetaP: '#F0EBF7',
  copper:   '#B5651D',
  copperP:  '#FDF0E8',
  sage:     '#3E7A31',
  sageP:    '#E8F3E5',
  info:     '#6B3FA0',
  infoP:    '#F0EBF7',
  border:   '#E4E1E8',
  suave:    '#777777',
};

const COR_ESTADO: Record<EstadoComp, { fundo: string; texto: string; borda: string }> = {
  por_avaliar:     { fundo: T.infoP,   texto: T.info,     borda: T.info },
  avancado:        { fundo: '#fff',    texto: T.sage,     borda: T.border },
  consolidado:     { fundo: '#fff',    texto: T.charcoal, borda: T.border },
  desenvolvimento: { fundo: T.copperP, texto: T.copper,   borda: T.copper },
};

export function Cabecalho({ ucId, ucNome, titulo }: {
  ucId?: string; ucNome?: string; titulo: string;
}) {
  return (
    <div style={{ background: T.violeta, borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <div style={{ fontSize: 13.5, color: '#DCCFF0' }}>
        {ucId ? `${ucId}${ucNome ? ` · ${ucNome}` : ''}` : 'Sem unidade'}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 8, lineHeight: 1.2 }}>
        {titulo}
      </div>
    </div>
  );
}

function GrupoEstado({ estado, itens, substantivo, onEscolher, temAulaHoje }: {
  estado: EstadoComp;
  itens: CompComEstado[];
  substantivo: string;
  onEscolher?: (id: string) => void;
  temAulaHoje?: boolean;
}) {
  const c = COR_ESTADO[estado];
  const destaque = estado === 'por_avaliar' || estado === 'desenvolvimento';

  return (
    <div style={{
      background: c.fundo,
      border: `1px solid ${destaque ? c.borda : T.border}`,
      borderRadius: 14, padding: 13, marginBottom: 11,
    }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: c.texto, marginBottom: 9 }}>
        {estado === 'por_avaliar' && !temAulaHoje
          ? `${itens.length} ${itens.length === 1 ? substantivo : substantivo + 's'} ainda por trabalhar`
          : tituloGrupo(estado, itens.length, substantivo)}
      </div>
      {itens.map(it => (
        <button
          key={it.id}
          onClick={() => onEscolher?.(it.id)}
          disabled={!onEscolher}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: 'transparent', border: 'none', padding: '5px 0',
            fontSize: 14.5, color: destaque ? c.texto : T.charcoal,
            cursor: onEscolher ? 'pointer' : 'default', fontFamily: 'inherit',
          }}
        >
          {it.nome}
          {onEscolher && estado === 'por_avaliar' && (
            <span style={{ float: 'right', color: c.texto }}>›</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Avaliar-me ────────────────────────────────────────────────

const COR_CARTAO: Record<EstadoComp, { fundo: string; num: string; txt: string; borda: string; sub: string }> = {
  por_avaliar:     { fundo: T.violeta, num: '#fff', txt: '#fff', borda: T.violeta, sub: 'ainda não avaliadas' },
  avancado:        { fundo: '#fff',    num: T.sage, txt: T.charcoal, borda: T.border, sub: 'muito bom resultado' },
  consolidado:     { fundo: '#fff',    num: T.sage, txt: T.charcoal, borda: T.border, sub: 'faço sozinho/a' },
  desenvolvimento: { fundo: T.copperP, num: T.copper, txt: T.copper, borda: T.copper, sub: 'preciso de treinar' },
};

const NOME_CARTAO: Record<EstadoComp, string> = {
  por_avaliar: 'Por avaliar',
  avancado: 'Avançado',
  consolidado: 'Consolidadas',
  desenvolvimento: 'A desenvolver',
};

export function EcraAvaliarMe({
  ucId, ucNome, competencias, substantivo = 'competência',
  rotuloConjunto = 'competências', onAvaliar, temAulaHoje = false,
  triado = false, bloco = 'realizacoes', onMudarBloco,
}: {
  ucId?: string; ucNome?: string;
  competencias: { id: string; nome: string; nivel?: number | null }[];
  substantivo?: string;
  rotuloConjunto?: string;
  onAvaliar?: (id: string) => void;
  temAulaHoje?: boolean;
  /** true quando o plano tem ficha técnica ou trabalho e houve triagem. */
  triado?: boolean;
  bloco?: 'realizacoes' | 'conhecimentos' | 'atitudes';
  onMudarBloco?: (b: 'realizacoes' | 'conhecimentos' | 'atitudes') => void;
}) {
  const [aberto, setAberto] = React.useState<EstadoComp | null>(null);

  const grupos = agruparPorEstado(competencias);
  const porEstado = new Map(grupos.map(g => [g.estado, g.itens]));
  const total = competencias.length;
  const trabalhadas = competencias.filter(c => estadoDoNivel(c.nivel) !== 'por_avaliar').length;

  const ordem: EstadoComp[] = ['por_avaliar', 'consolidado', 'avancado', 'desenvolvimento'];
  const barras: [EstadoComp, number][] = [
    ['avancado', porEstado.get('avancado')?.length ?? 0],
    ['consolidado', porEstado.get('consolidado')?.length ?? 0],
    ['desenvolvimento', porEstado.get('desenvolvimento')?.length ?? 0],
    ['por_avaliar', porEstado.get('por_avaliar')?.length ?? 0],
  ];
  const corBarra: Record<EstadoComp, string> = {
    avancado: T.sage, consolidado: 'rgba(90,122,78,0.55)',
    desenvolvimento: T.copper, por_avaliar: 'rgba(26,23,20,0.12)',
  };

  return (
    <div style={{ padding: 14, maxWidth: 620, margin: '0 auto', background: T.fundo, minHeight: '100%' }}>
      <Cabecalho ucId={ucId} ucNome={ucNome} titulo="Avaliar-me" />

      {!triado && (
        <div style={{
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: 16,
          padding: 14, marginBottom: 14, fontSize: 14.5, color: T.charcoal, lineHeight: 1.6,
        }}>
          {temAulaHoje
            ? 'O professor ainda não definiu ficha técnica nem trabalho para esta aula. Estas são todas as competências da unidade.'
            : 'Não tens aula hoje. Estas são todas as competências desta unidade.'}
        </div>
      )}

      {/* Separadores: o que sei fazer · o que sei · como me comporto */}
      {onMudarBloco && (
        <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
          {([
            ['realizacoes', 'Saber fazer'],
            ['conhecimentos', 'Saber'],
            ['atitudes', 'Atitudes'],
          ] as const).map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => { onMudarBloco(id); setAberto(null); }}
              style={{
                flex: 1, padding: '11px 6px', borderRadius: 11,
                border: `1.5px solid ${bloco === id ? T.copper : T.border}`,
                background: bloco === id ? T.copperP : '#fff',
                color: bloco === id ? T.copper : T.suave,
                fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Cartões por estado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
        {ordem.map(est => {
          const itens = porEstado.get(est) ?? [];
          const c = COR_CARTAO[est];
          const activo = aberto === est;
          return (
            <button
              key={est}
              onClick={() => setAberto(activo ? null : est)}
              disabled={itens.length === 0}
              style={{
                background: c.fundo,
                border: `${activo ? 2 : 1}px solid ${itens.length ? c.borda : T.border}`,
                borderRadius: 14, padding: '17px 14px', minHeight: 116,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                textAlign: 'left', fontFamily: 'inherit',
                cursor: itens.length ? 'pointer' : 'default',
                opacity: itens.length ? 1 : 0.45,
              }}
            >
              <span style={{ fontSize: 34, fontWeight: 700, color: c.num, lineHeight: 1 }}>
                {itens.length}
              </span>
              <span>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: c.txt }}>
                  {NOME_CARTAO[est]}
                </span>
                <span style={{
                  display: 'block', fontSize: 12.5,
                  color: est === 'por_avaliar' ? 'rgba(255,255,255,0.8)'
                       : est === 'desenvolvimento' ? T.copper : T.suave,
                }}>
                  {c.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista do cartão aberto */}
      {aberto && (porEstado.get(aberto)?.length ?? 0) > 0 && (
        <div style={{
          background: '#fff', border: `1px solid ${T.border}`,
          borderRadius: 14, padding: 14, marginBottom: 14,
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.suave, marginBottom: 10 }}>
            {NOME_CARTAO[aberto]}
          </div>
          {porEstado.get(aberto)!.map(it => (
            <button
              key={it.id}
              onClick={() => onAvaliar?.(it.id)}
              disabled={!onAvaliar || aberto !== 'por_avaliar'}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                textAlign: 'left', background: 'transparent', border: 'none',
                borderBottom: `1px solid ${T.border}`, padding: '12px 2px',
                fontSize: 14.5, lineHeight: 1.45, color: T.charcoal,
                cursor: onAvaliar && aberto === 'por_avaliar' ? 'pointer' : 'default',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ flex: 1 }}>{it.nome}</span>
              {onAvaliar && aberto === 'por_avaliar' && (
                <span style={{ color: T.info, fontSize: 18 }}>›</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Progresso na unidade */}
      <div style={{
        background: '#fff', border: `1px solid ${T.border}`,
        borderRadius: 14, padding: 14,
      }}>
        <div style={{ fontSize: 13, color: T.suave, marginBottom: 10 }}>
          Progresso na unidade
        </div>
        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
          {barras.filter(([, n]) => n > 0).map(([est, n]) => (
            <div key={est} style={{ flex: n, background: corBarra[est] }} />
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: T.suave, marginTop: 9 }}>
          {trabalhadas} de {total} {total === 1 ? substantivo : `${substantivo}s`} trabalhada
          {trabalhadas === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}

// ── Nota progressiva ──────────────────────────────────────────

export interface LinhaHistorial {
  planoId: string;
  titulo: string;
  data: string;
  numeroAula?: number;
  nota20?: number | null;
  validada: boolean;
}

export function EcraNotaProgressiva({
  ucId, ucNome, nota, bonus = 0, participacoes = 0,
  totalAulas, historial,
}: {
  ucId?: string; ucNome?: string;
  nota: number | null;
  bonus?: number;
  participacoes?: number;
  totalAulas?: number;
  historial: LinhaHistorial[];
}) {
  const avaliadas = historial.filter(h => h.nota20 != null);

  return (
    <div style={{ padding: 14, maxWidth: 620, margin: '0 auto', background: T.fundo, minHeight: '100%' }}>
      <Cabecalho ucId={ucId} ucNome={ucNome} titulo="Nota progressiva" />

      <div style={{
        background: T.sageP, border: `1px solid rgba(90,122,78,0.25)`,
        borderRadius: 14, padding: '20px 16px', marginBottom: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: T.sage, lineHeight: 1 }}>
          {nota != null ? nota.toFixed(1).replace('.', ',') : '—'}
        </div>
        <div style={{ fontSize: 15, color: T.charcoal, marginTop: 7 }}>
          em 20 valores, se a unidade acabasse hoje
        </div>
        {bonus > 0 && (
          <div style={{ fontSize: 13.5, color: T.sage, marginTop: 8 }}>
            Inclui +{bonus.toFixed(2).replace('.', ',')} de bónus por {participacoes} atividade
            {participacoes === 1 ? '' : 's'} em que participaste
          </div>
        )}
        <div style={{ fontSize: 13, color: T.suave, marginTop: 10, lineHeight: 1.6 }}>
          Esta nota muda a cada aula. Não é a nota final da unidade.
        </div>
      </div>

      <div style={{
        fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: T.suave, marginBottom: 9, paddingLeft: 2,
      }}>
        {avaliadas.length === 0
          ? 'Ainda sem aulas avaliadas'
          : `${avaliadas.length} aula${avaliadas.length === 1 ? '' : 's'} avaliada${avaliadas.length === 1 ? '' : 's'}${totalAulas ? ` de ${totalAulas}` : ''}`}
      </div>

      {historial.map(h => (
        <div key={h.planoId} style={{
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: 16,
          padding: '13px 15px', marginBottom: 9,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.charcoal }}>
              {h.numeroAula ? `Aula ${h.numeroAula} · ` : ''}{h.titulo}
            </div>
            <div style={{ fontSize: 12.5, color: T.suave, marginTop: 2 }}>
              {h.data}{h.nota20 != null && !h.validada ? ' · à espera do professor' : ''}
            </div>
          </div>
          <div style={{
            fontSize: 19, fontWeight: 700,
            color: h.nota20 == null ? T.suave : h.validada ? T.sage : T.copper,
            whiteSpace: 'nowrap',
          }}>
            {h.nota20 != null ? `${h.nota20.toFixed(1).replace('.', ',')}` : '—'}
            {h.nota20 != null && <span style={{ fontSize: 12.5, fontWeight: 400 }}>/20</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Perfil profissional ───────────────────────────────────────

export function EcraPerfilProfissional({
  ucId, ucNome, competencias, atitudes,
}: {
  ucId?: string; ucNome?: string;
  competencias: { id: string; nome: string; nivel?: number | null }[];
  atitudes?: { id: string; nome: string; nivel?: number | null }[];
}) {
  const tec = perfilProfissional(competencias);
  const ati = perfilProfissional(atitudes ?? []);
  const fortes = [...tec.fortes, ...ati.fortes];
  const aDesenvolver = [...tec.aDesenvolver, ...ati.aDesenvolver];

  const bloco = (
    titulo: string, itens: CompComEstado[], cor: string, fundo: string, vazio: string
  ) => (
    <div style={{
      background: fundo, border: `1px solid ${cor === T.sage ? 'rgba(90,122,78,0.25)' : T.copper}`,
      borderRadius: 14, padding: 14, marginBottom: 13,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: cor, marginBottom: 9 }}>{titulo}</div>
      {itens.length === 0 ? (
        <div style={{ fontSize: 14, color: T.suave }}>{vazio}</div>
      ) : itens.map(i => (
        <div key={i.id} style={{ fontSize: 14.5, color: T.charcoal, padding: '4px 0' }}>{i.nome}</div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: 14, maxWidth: 620, margin: '0 auto', background: T.fundo, minHeight: '100%' }}>
      <Cabecalho ucId={ucId} ucNome={ucNome} titulo="O meu perfil profissional" />

      <div style={{
        background: '#fff', border: `1px solid ${T.border}`,
        borderRadius: 14, padding: 15, marginBottom: 16,
        fontSize: 14.5, color: T.charcoal, lineHeight: 1.65,
      }}>
        Isto é o retrato do que já sabes fazer e do que ainda estás a trabalhar.
        Muda ao longo da unidade.
      </div>

      {bloco(
        `${fortes.length} ponto${fortes.length === 1 ? '' : 's'} forte${fortes.length === 1 ? '' : 's'}`,
        fortes, T.sage, T.sageP,
        'Ainda não há avaliações suficientes para identificar pontos fortes.'
      )}

      {bloco(
        `${aDesenvolver.length} competência${aDesenvolver.length === 1 ? '' : 's'} a desenvolver`,
        aDesenvolver, T.copper, T.copperP,
        'Não há nada assinalado para desenvolver neste momento.'
      )}
    </div>
  );
}
