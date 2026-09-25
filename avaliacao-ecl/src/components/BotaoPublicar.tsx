import React, { useEffect, useRef, useState } from 'react';
import { estadoPublicacao, subscreverPublicacao, publicarPlanoParaAlunos, getPlanosAula } from '../backend';

/**
 * O único botão de publicar uma aula. Todos os sítios usam este, e todos
 * mostram o mesmo estado: enquanto envia, fica bloqueado e diz que está a
 * enviar; quando o Sheets confirma, diz que os alunos já a veem. Carregar
 * outra vez durante o envio não faz nada — nunca envia dois planos.
 */
export function BotaoPublicar({ planoId, antesDePublicar, depoisDePublicar, claro }: {
  planoId: string;
  /** Pergunta ao professor (turma certa, etc.). Devolve false para não publicar. */
  antesDePublicar?: () => boolean;
  depoisDePublicar?: (ok: boolean) => void;
  /** Botão claro sobre fundo escuro (menu do plano). */
  claro?: boolean;
}) {
  const [, setV] = useState(0);
  const aPerguntar = useRef(false);
  useEffect(() => subscreverPublicacao(() => setV(v => v + 1)), []);

  const estado = estadoPublicacao(planoId);
  const jaPublicado = getPlanosAula().find(p => p.id === planoId)?.estado === 'publicado';
  const aEnviar = estado?.fase === 'a_enviar';
  const confirmado = estado?.fase === 'confirmado' || (jaPublicado && estado?.fase !== 'falhou');
  const falhou = estado?.fase === 'falhou';

  function carregar() {
    // Lê o estado agora, não o do último desenho: dois toques seguidos
    // chegam antes de o botão se redesenhar.
    const agora = estadoPublicacao(planoId)?.fase;
    if (agora === 'a_enviar' || agora === 'confirmado' || aPerguntar.current) return;
    if (aEnviar || confirmado) return;
    aPerguntar.current = true;
    try {
      if (antesDePublicar && !antesDePublicar()) return;
    } finally { aPerguntar.current = false; }
    publicarPlanoParaAlunos(planoId).then(r => depoisDePublicar?.(r.ok));
  }

  const fundo = confirmado ? 'var(--sage)' : falhou ? '#b3261e' : claro ? '#fff' : 'var(--copper)';
  const cor = confirmado || falhou || !claro ? '#fff' : '#7B2233';
  const textoPeq = claro ? 'rgba(255,255,255,0.8)' : 'rgba(26,23,20,0.6)';

  return (
    <div>
      <button onClick={carregar} disabled={aEnviar || confirmado} aria-busy={aEnviar}
        style={{
          width: '100%', minHeight: 46, borderRadius: 10, border: 'none',
          background: fundo, color: cor, fontSize: 15, fontWeight: 800,
          fontFamily: 'inherit', cursor: aEnviar || confirmado ? 'default' : 'pointer',
          opacity: aEnviar ? 0.75 : 1,
        }}>
        {aEnviar ? '⏳ A enviar para os alunos…'
          : confirmado ? '✓ Publicada — os alunos já a veem'
          : falhou ? '⚠ Não chegou — carregar outra vez'
          : 'Publicar a aula'}
      </button>
      {aEnviar && (
        <div style={{ fontSize: 12, color: textoPeq, marginTop: 6, lineHeight: 1.45 }}>
          Não é preciso carregar outra vez. Pode continuar a trabalhar.
        </div>
      )}
      {falhou && estado?.erro && (
        <div style={{ fontSize: 12, color: claro ? '#ffd9d6' : '#b3261e', marginTop: 6, lineHeight: 1.45 }}>
          {estado.erro}
        </div>
      )}
    </div>
  );
}

export default BotaoPublicar;
