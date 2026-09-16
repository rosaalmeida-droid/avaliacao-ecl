// ============================================================
// Estado da sincronização — o que chegou ao Google Sheets.
//
// Tudo é guardado primeiro no browser e enviado ao Sheets a seguir. O
// envio usa `mode: 'no-cors'`, obrigatório para o Apps Script aceitar
// pedidos do browser — mas com ele a resposta vem sempre vazia: mesmo
// que falhe, o browser diz que correu bem.
//
// Sem isto, o professor fecha o browser ou muda de computador e perde
// trabalho sem nunca ter sido avisado. Aqui vê o que está por confirmar
// e pode reenviar.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  getFilaSync, confirmarSincronizacao, reenviarFalhados,
  guardarNoSheetsComConfirmacao, haCoisasPorGuardar,
  recuperarPendentesAoArrancar, type ItemFila,
} from '../backend';

const C = {
  verde: '#3E7A31', verdeSuave: '#E8F3E5',
  cobre: '#B5651D', cobreSuave: '#FDF0E8',
  perigo: '#C0392B', perigoSuave: '#FDF0EF',
  tinta: '#1A1A1A', suave: '#777777', border: '#E4E1E8',
};

/** Ampulheta a rodar, enquanto espera pelo Sheets. */
function Ampulheta({ cor }: { cor: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: 'eclGirar 1.6s linear infinite', flexShrink: 0 }}>
      <path d="M6 2h12M6 22h12" />
      <path d="M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4" />
      <style>{`@keyframes eclGirar { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

/** Faixa compacta — para o cabeçalho, sempre à vista. */
export function EstadoSincronizacao({ turmaId }: { turmaId: string }) {
  const [porConfirmar, setPorConfirmar] = useState(0);
  const [falhados, setFalhados] = useState<ItemFila[]>([]);
  const [aVerificar, setAVerificar] = useState(false);
  const [aberto, setAberto] = useState(false);
  /** null = parado; os outros são os passos do guardar. */
  const [aGuardar, setAGuardar] = useState<'a_enviar' | 'a_confirmar' | 'pronto' | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState('');

  async function verificar() {
    setAVerificar(true);
    try {
      const r = await confirmarSincronizacao(turmaId);
      setPorConfirmar(r.porConfirmar);
      setFalhados(r.falhados);
    } catch { /* sem rede, fica como está */ }
    setAVerificar(false);
  }

  // Ao abrir e de dois em dois minutos. Não é urgente: o que interessa
  // é o professor saber antes de fechar o browser.
  useEffect(() => {
    setPorConfirmar(getFilaSync().filter(i => !i.confirmadoEm).length);
    // Ao voltar, reenviar o que ficou pendente da última vez.
    recuperarPendentesAoArrancar(turmaId)
      .then(n => { if (n > 0) verificar(); })
      .catch(() => verificar());
    const id = setInterval(verificar, 120000);
    return () => clearInterval(id);
  }, [turmaId]);

  // Aviso ao fechar o browser com coisas por guardar.
  //
  // Não é possível impedir que feche — nenhuma página web consegue, por
  // segurança. O que se consegue é o browser perguntar se quer mesmo
  // sair. A mensagem é do browser e não se pode escolher.
  useEffect(() => {
    const aoSair = (ev: BeforeUnloadEvent) => {
      if (haCoisasPorGuardar() > 0) {
        ev.preventDefault();
        ev.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', aoSair);
    return () => window.removeEventListener('beforeunload', aoSair);
  }, []);

  async function guardarAgora() {
    setUltimoResultado('');
    const r = await guardarNoSheetsComConfirmacao(turmaId, setAGuardar);
    setUltimoResultado(r.mensagem);
    setPorConfirmar(r.porConfirmar);
    setFalhados(getFilaSync().filter(i => !i.confirmadoEm));
    // Deixar a mensagem à vista uns segundos.
    setTimeout(() => { setAGuardar(null); setUltimoResultado(''); }, 5000);
  }

  // Enquanto guarda, é isto que se vê — com a ampulheta.
  if (aGuardar && aGuardar !== 'pronto') {
    return (
      <div style={{ background: C.cobreSuave, border: `1px solid ${C.cobre}`,
        borderRadius: 12, padding: '13px 15px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 11 }}>
        <Ampulheta cor={C.cobre} />
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.cobre }}>
            {aGuardar === 'a_enviar' ? 'A enviar para o Google Sheets…' : 'A confirmar que chegou…'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(26,23,20,0.6)', marginTop: 2 }}>
            Aguarda — não feches a aplicação.
          </div>
        </div>
      </div>
    );
  }

  // Resultado, logo a seguir a guardar.
  if (aGuardar === 'pronto' && ultimoResultado) {
    const bem = porConfirmar === 0;
    return (
      <div style={{
        background: bem ? C.verdeSuave : C.cobreSuave,
        border: `1px solid ${bem ? C.verde : C.cobre}`,
        borderRadius: 12, padding: '13px 15px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 11,
      }}>
        {bem ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.verde}
            strokeWidth={2.8} strokeLinecap="round" style={{ flexShrink: 0 }}>
            <path d="M20 6L9 17l-5-5" /></svg>
        ) : <Ampulheta cor={C.cobre} />}
        <div style={{ fontSize: 14.5, fontWeight: 600, color: bem ? C.verde : C.cobre }}>
          {ultimoResultado}
        </div>
      </div>
    );
  }

  if (porConfirmar === 0 && falhados.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.verde,
          flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13.5, color: C.verde }}>
          Tudo guardado no Google Sheets
        </span>
        <button onClick={guardarAgora} style={{
          padding: '7px 13px', borderRadius: 9, border: `1px solid ${C.border}`,
          background: '#fff', color: C.suave, fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Verificar
        </button>
      </div>
    );
  }

  const grave = falhados.length > 0;

  return (
    <div style={{
      background: grave ? C.perigoSuave : C.cobreSuave,
      border: `1px solid ${grave ? C.perigo : C.cobre}`,
      borderRadius: 12, padding: '12px 14px', marginBottom: 12,
    }}>
      <button onClick={() => setAberto(a => !a)} style={{
        width: '100%', background: 'transparent', border: 'none', padding: 0,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700,
            color: grave ? C.perigo : C.cobre }}>
            {grave
              ? `${falhados.length} por guardar no Sheets`
              : `${porConfirmar} a caminho do Sheets`}
          </span>
          <span style={{ display: 'block', fontSize: 13, color: 'rgba(26,23,20,0.6)',
            marginTop: 2, lineHeight: 1.45 }}>
            {grave
              ? 'Estão guardados neste computador, mas não chegaram ao Sheets. Se limpares o browser, perdem-se.'
              : aVerificar ? 'A confirmar…' : 'A confirmar dentro de momentos.'}
          </span>
        </span>
        <span style={{ fontSize: 18, color: 'rgba(26,23,20,0.35)' }}>
          {aberto ? '▾' : '▸'}
        </span>
      </button>

      {aberto && (
        <div style={{ marginTop: 12, paddingTop: 12,
          borderTop: '1px solid rgba(26,23,20,0.1)' }}>
          {(grave ? falhados : getFilaSync().filter(i => !i.confirmadoEm)).map(i => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 0', fontSize: 13.5 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px',
                borderRadius: 20, background: '#fff', color: C.suave,
                border: `1px solid ${C.border}` }}>
                {i.tipo}
              </span>
              <span style={{ flex: 1, color: C.tinta }}>{i.descricao}</span>
              {i.tentativas > 1 && (
                <span style={{ fontSize: 13, color: C.suave }}>
                  {i.tentativas}ª tentativa
                </span>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={guardarAgora} style={{
              width: '100%', padding: '14px', borderRadius: 11, border: 'none',
              background: grave ? C.perigo : C.cobre, color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Guardar no Google Sheets agora
            </button>
          </div>

          {grave && (
            <div style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)', marginTop: 10,
              lineHeight: 1.55 }}>
              Se continuar a falhar, o Apps Script pode estar sem a versão
              publicada mais recente, ou sem acesso aberto a qualquer pessoa.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
