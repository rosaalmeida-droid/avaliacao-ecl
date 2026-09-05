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

const T = {
  charcoal: '#1a1714',
  copper:   '#b5651d',
  copperP:  '#fdf0e6',
  sage:     '#5a7a4e',
  sageP:    '#eef4eb',
  danger:   '#c0392b',
  dangerP:  '#fdf0ef',
  info:     '#2563eb',
  infoP:    '#eff6ff',
  border:   'rgba(26,23,20,0.10)',
  suave:    'rgba(26,23,20,0.55)',
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
    <div style={{ background: T.copperP, borderRadius: 14, padding: '13px 16px', marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: T.copper }}>
        {ucId ? `${ucId}${ucNome ? ` · ${ucNome}` : ''}` : 'Sem UC'}
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color: T.charcoal, marginTop: 3 }}>{titulo}</div>
    </div>
  );
}

function GrupoEstado({ estado, itens, substantivo, onEscolher }: {
  estado: EstadoComp;
  itens: CompComEstado[];
  substantivo: string;
  onEscolher?: (id: string) => void;
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
        {tituloGrupo(estado, itens.length, substantivo)}
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

export function EcraAvaliarMe({
  ucId, ucNome, competencias, substantivo = 'competência',
  rotuloConjunto = 'competências técnicas', onAvaliar,
}: {
  ucId?: string; ucNome?: string;
  competencias: { id: string; nome: string; nivel?: number | null }[];
  substantivo?: string;
  rotuloConjunto?: string;
  onAvaliar?: (id: string) => void;
}) {
  const grupos = agruparPorEstado(competencias);
  const porAvaliar = competencias.filter(c => estadoDoNivel(c.nivel) === 'por_avaliar').length;
  const trabalhadas = competencias.length - porAvaliar;

  return (
    <div style={{ padding: '16px 14px 32px', maxWidth: 640, margin: '0 auto' }}>
      <Cabecalho ucId={ucId} ucNome={ucNome} titulo="Avaliar-me" />

      <div style={{
        background: '#fff', border: `1px solid ${T.border}`,
        borderRadius: 14, padding: 15, marginBottom: 16,
      }}>
        <div style={{ fontSize: 15.5, color: T.charcoal, lineHeight: 1.7 }}>
          {porAvaliar > 0
            ? <>Tens <b>{porAvaliar} {porAvaliar === 1 ? substantivo : `${substantivo}s`}</b> por avaliar na aula de hoje.</>
            : <>Não tens {substantivo}s por avaliar hoje.</>}
        </div>
        {trabalhadas > 0 && (
          <div style={{ fontSize: 13.5, color: T.suave, marginTop: 6 }}>
            Nesta unidade já trabalhaste {trabalhadas} {trabalhadas === 1 ? substantivo : `${substantivo}s`} no total.
          </div>
        )}
      </div>

      <div style={{
        fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: T.suave, marginBottom: 9, paddingLeft: 2,
      }}>
        As minhas {rotuloConjunto} nesta unidade
      </div>

      {grupos.length === 0 ? (
        <div style={{
          background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14,
          padding: 20, textAlign: 'center', fontSize: 14.5, color: T.suave,
        }}>
          Ainda não há {rotuloConjunto} nesta unidade.
        </div>
      ) : grupos.map(g => (
        <GrupoEstado
          key={g.estado} estado={g.estado} itens={g.itens}
          substantivo={substantivo}
          onEscolher={g.estado === 'por_avaliar' ? onAvaliar : undefined}
        />
      ))}
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
    <div style={{ padding: '16px 14px 32px', maxWidth: 640, margin: '0 auto' }}>
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
          background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14,
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
    <div style={{ padding: '16px 14px 32px', maxWidth: 640, margin: '0 auto' }}>
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
