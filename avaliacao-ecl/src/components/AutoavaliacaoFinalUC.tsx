// ============================================================
// Autoavaliação final da UC — obrigatória, no fim de cada UC
// ============================================================
// O aluno vê o que fez na UC (as aulas avaliadas, como evoluiu, as horas
// a que faltou e as evidências dos 5 C) e propõe a sua nota final, com
// justificação. A aplicação ajuda a refletir mas NÃO sugere nem calcula a
// nota por ele: não há valor por omissão nem média à vista. A proposta
// aparece na pauta, na coluna PROPOSTA ALUNO.
// ============================================================
import React, { useMemo, useState } from 'react';
import type { Aluno } from '../types';
import {
  notasFinaisPublicadasDoAluno, getPropostaFinalUC,
  getPlanosAulaPorTurma, getPlanosFaltadosPorUC, situacaoRecuperacaoUC, guardarPropostaFinalUC, horasDadasDaUC, ucTerminou,
} from '../backend';
import { linhasDaPautaUC, produtosDaUC, notaDoPlano, MAPA_5C, type Letra5C } from '../pautaUC';
import { EcraCheio, ProgressoSlides, NavSlides } from './EcraCheio';

const V = '#6B3FA0';
const BORDA = 'rgba(26,23,20,0.12)';
const h1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const dataCurta = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });

const ESCALA = [
  { de: 0, ate: 9, nome: 'Insuficiente' },
  { de: 10, ate: 13, nome: 'Suficiente' },
  { de: 14, ate: 16, nome: 'Bom' },
  { de: 17, ate: 20, nome: 'Muito Bom' },
];

/** Perguntas que ajudam a escrever a justificação — não são obrigatórias uma a uma. */
const PERGUNTAS_REFLEXAO = [
  'Em que aulas ou técnicas estiveste melhor? Porquê?',
  'O que te correu pior e o que fizeste para melhorar?',
  'Como foi a tua assiduidade, pontualidade e farda?',
  'Como trabalhaste com os colegas e como resolveste os problemas?',
];

export function CartaoAutoavaliacaoFinal({ ucs, onAbrir }: {
  ucs: { ucId: string; nome: string }[]; onAbrir: (ucId: string) => void;
}) {
  if (!ucs.length) return null;
  return (
    <div style={{ marginBottom: 18, padding: '16px 18px', borderRadius: 16, background: '#F0EBF7',
      border: `2px solid ${V}` }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: V }}>
        Obrigatório
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 4px' }}>
        {ucs.length === 1 ? 'A UC terminou: faz a tua autoavaliação final' : `Terminaram ${ucs.length} UC: faz a autoavaliação final`}
      </div>
      <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.7)', lineHeight: 1.5, marginBottom: 10 }}>
        Olha para o que fizeste e propõe a tua nota final, com justificação. O professor vê a tua proposta na pauta.
      </div>
      {ucs.map(u => (
        <button key={u.ucId} onClick={() => onAbrir(u.ucId)} style={{ display: 'block', width: '100%',
          textAlign: 'left', marginTop: 6, padding: '12px 14px', borderRadius: 12, border: 'none',
          background: V, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {u.nome || u.ucId} →
        </button>
      ))}
    </div>
  );
}

/** As notas finais das UC que o professor publicou. Só se veem depois da
 *  autoavaliação final dessa UC — primeiro o aluno reflete, depois vê a nota. */
export function CartaoNotasFinais({ aluno, ucNome }: { aluno: Aluno; ucNome: (ucId: string) => string }) {
  // Só as das UC que já acabaram: uma nota publicada a meio da UC não é a
  // nota final (auditoria 5/out/2026).
  const notas = notasFinaisPublicadasDoAluno(aluno.id).filter(n => ucTerminou(aluno.turmaId, n.ucId))
    .sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm));
  if (!notas.length) return null;
  return (
    <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: '#fff', border: `1px solid ${BORDA}` }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: V, marginBottom: 6 }}>
        Notas finais das UC
      </div>
      {notas.map(n => {
        const fezAutoavaliacao = !!getPropostaFinalUC(aluno.id, n.ucId);
        const neg = n.nota < 10;
        return (
          <div key={n.ucId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${BORDA}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{ucNome(n.ucId) || n.ucId}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>
                {fezAutoavaliacao ? `${n.resultado} · publicada em ${new Date(n.publicadaEm).toLocaleDateString('pt-PT')}`
                  : 'Faz primeiro a autoavaliação final desta UC para veres a nota.'}
              </div>
            </div>
            {fezAutoavaliacao && (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: neg ? '#c0392b' : V }}>
                {n.nota}{neg ? ' a)' : ''}<span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(26,23,20,0.45)' }}>/20</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AutoavaliacaoFinalUC({ aluno, ucId, ucNome, onFeito, onFechar }: {
  aluno: Aluno; ucId: string; ucNome: string; onFeito: () => void; onFechar: () => void;
}) {
  const [nota, setNota] = useState<number | null>(null);
  const [justificacao, setJustificacao] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [slide, setSlide] = useState(0);

  const dados = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const faltou = new Set(getPlanosFaltadosPorUC(aluno.id, ucId, aluno.turmaId).map(p => p.id));
    const aulas = getPlanosAulaPorTurma(aluno.turmaId)
      .filter(p => p.ucId === ucId && String(p.data).slice(0, 10) <= hoje
        && (p.estado === 'publicado' || (p.estado as string) === 'realizada'))
      .sort((a, b) => String(a.data).localeCompare(String(b.data)))
      .map(p => ({
        id: p.id, titulo: p.titulo || 'Aula', data: String(p.data).slice(0, 10),
        faltou: faltou.has(p.id),
        nota: faltou.has(p.id) ? null : notaDoPlano(aluno.id, p.id, (p as any).tipoPlanAula || 'pratico'),
      }));
    const sit = situacaoRecuperacaoUC(aluno.id, aluno.turmaId, ucId);
    const linha = linhasDaPautaUC(aluno.turmaId, ucId, produtosDaUC(aluno.turmaId, ucId))
      .find(l => l.alunoId === aluno.id);
    return { aulas, sit, dadas: horasDadasDaUC(aluno.turmaId, ucId), evidencias: linha?.evidencias };
  }, [aluno.id, aluno.turmaId, ucId]);

  // Evolução em palavras, sem médias à vista: compara o início com o fim.
  const evolucao = (() => {
    const ns = dados.aulas.map(a => a.nota).filter((n): n is number => n !== null);
    if (ns.length < 2) return 'Ainda há poucas aulas avaliadas para ver a evolução.';
    const meio = Math.floor(ns.length / 2);
    const m = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const d = m(ns.slice(meio)) - m(ns.slice(0, meio));
    return d >= 1 ? 'Nas últimas aulas estiveste melhor do que nas primeiras.'
      : d <= -1 ? 'Nas últimas aulas estiveste pior do que nas primeiras.'
      : 'Estiveste mais ou menos igual do princípio ao fim.';
  })();

  const justOk = justificacao.trim().length >= 40;
  const pronto = nota !== null && justOk;

  function enviar() {
    if (!pronto) return;
    guardarPropostaFinalUC({ alunoId: aluno.id, turmaId: aluno.turmaId, ucId, nota: nota!, justificacao: justificacao.trim() });
    onFeito();
  }

  const caixa: React.CSSProperties = { background: '#fff', borderRadius: 14, border: `1px solid ${BORDA}`, padding: '12px 14px' };
  const maxBarra = 20;

  // Uma coisa de cada vez, como na autoavaliação das aulas.
  const NOMES = ['As tuas aulas', 'Como evoluíste', 'Assiduidade', 'O que ficou registado sobre ti', 'A tua nota', 'Porquê esta nota?'];
  const podeSeguir = slide === 4 ? nota !== null : true;

  return (
    <EcraCheio titulo={`Autoavaliação final · ${ucNome || ucId}`} onSair={onFechar}>
      <ProgressoSlides nome={NOMES[slide]} idx={slide} total={NOMES.length} />
      {slide === 0 && <>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 12 }}>As tuas aulas</div>
      <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.65)', marginBottom: 12, lineHeight: 1.5 }}>
        Antes de propores a tua nota, olha com calma para o que fizeste nesta UC.
      </div>
      <div style={caixa}>
        {dados.aulas.length === 0 && <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.6)' }}>Sem aulas registadas.</div>}
        {dados.aulas.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
            borderBottom: `1px solid ${BORDA}` }}>
            <span style={{ width: 44, fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>{dataCurta(a.data)}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</span>
            <span style={{ width: 90, height: 8, borderRadius: 4, background: '#EEE9F5', overflow: 'hidden', flexShrink: 0 }}>
              {a.nota !== null && <span style={{ display: 'block', height: '100%', width: `${(a.nota / maxBarra) * 100}%`, background: V }} />}
            </span>
            <span style={{ width: 84, textAlign: 'right', fontSize: 13, fontWeight: 700,
              color: a.faltou ? '#c0392b' : a.nota === null ? 'rgba(26,23,20,0.45)' : '#1a1714' }}>
              {a.faltou ? 'Faltaste' : a.nota === null ? 'Por validar' : `${h1(a.nota)}/20`}
            </span>
          </div>
        ))}
        {dados.aulas.some(a => a.faltou) && (
          <div style={{ fontSize: 13, color: '#8e2418', marginTop: 8, lineHeight: 1.45 }}>
            Cada aula a que faltaste conta 0 até fazeres a recuperação.
          </div>
        )}
      </div>

      </>}
      {slide === 1 && <>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 12 }}>Como evoluíste</div>
      <div style={{ ...caixa, fontSize: 14.5, lineHeight: 1.5 }}>{evolucao}</div>
      </>}
      {slide === 2 && <>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 12 }}>Assiduidade</div>
      <div style={{ ...caixa, fontSize: 14.5, lineHeight: 1.5 }}>
        {(() => { const total = dados.sit.horasPrevistas || dados.dadas; return <>
        Faltaste a <b>{h1(dados.sit.horasFaltadas)} h</b>. Esta UC tem {h1(total)} h no total
        {total > 0 && <> (<b>{h1(dados.sit.horasFaltadas / total * 100)}%</b> de faltas; o limite é 10%, {h1(total * 0.1)} h)</>}.
        </>; })()}
        {dados.sit.motivo === 'faltas' && (
          <div style={{ marginTop: 6, color: '#8e2418', fontWeight: 600 }}>
            Passaste os 10% de faltas: esta UC está em atraso e tens um plano de recuperação.
          </div>
        )}
      </div>

      </>}
      {slide === 3 && <>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 12 }}>O que ficou registado sobre ti</div>
      <div style={caixa}>
        {(Object.keys(MAPA_5C) as Letra5C[]).map(c => {
          const ev = dados.evidencias?.[c] || [];
          return (
            <div key={c} style={{ padding: '6px 0', borderBottom: `1px solid ${BORDA}` }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{MAPA_5C[c].nome}</div>
              {ev.length === 0
                ? <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.5)' }}>Sem registos.</div>
                : ev.map((e, i) => <div key={i} style={{ fontSize: 13, color: 'rgba(26,23,20,0.7)', lineHeight: 1.45 }}>· {e.rotulo}</div>)}
            </div>
          );
        })}
        <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.5)', marginTop: 6 }}>
          Competente: são as tuas aulas, no primeiro ecrã.
        </div>
      </div>

      </>}
      {slide === 4 && <>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 12 }}>A tua proposta de nota final</div>
      <div style={caixa}>
        <div style={{ fontSize: 14, color: 'rgba(26,23,20,0.7)', lineHeight: 1.5, marginBottom: 10 }}>
          Escolhe a nota que achas justa, de 0 a 20. Pensa no que viste antes, não no que gostavas de ter.
        </div>
        {ESCALA.map(e => (
          <div key={e.nome} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(26,23,20,0.55)', marginBottom: 4 }}>
              {e.nome} ({e.de} a {e.ate})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: e.ate - e.de + 1 }, (_, i) => e.de + i).map(n => (
                <button key={n} onClick={() => setNota(n)} style={{ width: 42, height: 42, borderRadius: 10,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 800,
                  border: nota === n ? `2px solid ${V}` : `1px solid ${BORDA}`,
                  background: nota === n ? V : '#fff', color: nota === n ? '#fff' : '#1a1714' }}>{n}</button>
              ))}
            </div>
          </div>
        ))}

      </div>
      </>}
      {slide === 5 && <>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 12 }}>Porquê {nota ?? ''} valores?</div>
      <div style={caixa}>
        <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', lineHeight: 1.5, marginBottom: 6 }}>
          Podes responder a estas perguntas:
          {PERGUNTAS_REFLEXAO.map(p => <div key={p}>· {p}</div>)}
        </div>
        <textarea value={justificacao} onChange={e => setJustificacao(e.target.value)} rows={6} maxLength={1500}
          placeholder="Escreve aqui a tua justificação…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
            border: `1.5px solid ${BORDA}`, fontSize: 14.5, fontFamily: 'inherit', resize: 'vertical' }} />
        {!justOk && (
          <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.5)', marginTop: 4 }}>
            Escreve pelo menos duas frases ({justificacao.trim().length}/40 caracteres).
          </div>
        )}
      </div>

      </>}
      {slide === 5 && confirmar ? (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#F0EBF7', border: `1.5px solid ${V}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
            Propões {nota} valores. Depois de enviar já não podes mudar. Confirmas?
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirmar(false)} style={{ flex: 1, minHeight: 48, borderRadius: 10,
              border: `1px solid ${BORDA}`, background: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Rever
            </button>
            <button onClick={enviar} style={{ flex: 2, minHeight: 48, borderRadius: 10, border: 'none',
              background: V, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Sim, enviar
            </button>
          </div>
        </div>
      ) : (
        <NavSlides onAnterior={slide > 0 ? () => { setConfirmar(false); setSlide(n => n - 1); } : undefined}
          pode={slide === 5 ? pronto : podeSeguir}
          textoSeguinte={slide === 5 ? (!justOk ? 'Escreve a justificação' : 'Enviar a proposta') : 'Seguinte'}
          onSeguinte={() => slide === 5 ? setConfirmar(true) : setSlide(n => n + 1)} />
      )}
    </EcraCheio>
  );
}
