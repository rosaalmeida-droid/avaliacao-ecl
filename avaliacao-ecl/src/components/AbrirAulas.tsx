// ============================================================
// Abrir a aula aos alunos — um sítio só para isto
// ============================================================
// O professor cria os planos com calma; aqui, no momento da aula, abre-a
// aos alunos com um toque. Sem andar à procura do botão dentro do plano.
// Também para as aulas que já passaram: abrem-se para os alunos se
// autoavaliarem. A aplicação confirma que a abertura chegou aos alunos.
// ============================================================
import React, { useState } from 'react';
import type { PlanoAula } from '../types';
import {
  getPlanosAulaPorTurma, getSessaoAula, abrirSessaoAula, fecharSessaoAula,
  publicarPlanoParaAlunos, getPresencas, getAlunos,
} from '../backend';
import { confirmarTurmaAoPublicar } from '../professores';
import { EstadoAberturaAula } from './EstadoAberturaAula';

const C = {
  fundo: '#F5F2F3', branco: '#fff', bordeaux: '#7B2233', bordeauxSuave: '#F6ECEE', bordeauxClaro: '#EBCDD3',
  tinta: '#1A1A1A', texto: '#555', suave: '#777', verde: '#3E7A31', verdeSuave: '#E8F3E5', vermelho: '#C0392B',
  sombra: '0 1px 3px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.04)',
};
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dataPT = (iso: string) => iso ? new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
const hora = (iso: string) => iso ? new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '';

export function AbrirAulas({ turmaId, nomeProfessor }: { turmaId: string; nomeProfessor?: string }) {
  const [, redesenhar] = useState(0);
  const [aTratar, setATratar] = useState<string | null>(null);
  const hoje = hojeLocal();
  const limite = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const planos = getPlanosAulaPorTurma(turmaId).filter(p => p.estado !== 'arquivado');
  const dia = (p: PlanoAula) => String(p.data || '').slice(0, 10);
  const deHoje = planos.filter(p => dia(p) === hoje).sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
  // As que ainda não foram abertas, e as que se abriram hoje (para se ver
  // que ficaram abertas e que chegaram aos alunos).
  const abertaHoje = (p: PlanoAula) => String(getSessaoAula(p.id)?.abertaEm || '').slice(0, 10) === new Date().toISOString().slice(0, 10);
  const passadas = planos.filter(p => dia(p) < hoje && dia(p) >= limite && (!getSessaoAula(p.id)?.abertaEm || abertaHoje(p)))
    .sort((a, b) => dia(b).localeCompare(dia(a)));
  const nAlunos = getAlunos().filter(a => a.turmaId === turmaId && a.ativo !== false).length;

  async function abrir(p: PlanoAula) {
    if (aTratar) return;
    setATratar(p.id);
    try {
      if (p.estado !== 'publicado') {
        if (!confirmarTurmaAoPublicar(p.turmaId, p.titulo)) return;
        const r = await publicarPlanoParaAlunos(p.id);
        if (!r.ok) { alert('A aula não chegou aos alunos: ' + (r.erro || '')); return; }
      }
      abrirSessaoAula(p.id, p.turmaId || turmaId, nomeProfessor || 'professor');
      redesenhar(n => n + 1);
    } finally { setATratar(null); redesenhar(n => n + 1); }
  }

  function Cartao({ p, passada }: { p: PlanoAula; passada?: boolean }) {
    const s = getSessaoAula(p.id);
    const aberta = !!s?.abertaEm && !s?.fechadaEm;
    const fechada = !!s?.fechadaEm;
    const entraram = getPresencas().filter(r => r.planoAulaId === p.id && r.presente).length;
    const ocupado = aTratar === p.id;
    return (
      <div style={{ background: C.branco, borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: C.sombra,
        border: aberta ? `2px solid ${C.verde}` : 'none' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ minWidth: 64, height: 58, borderRadius: 14, background: aberta ? C.verde : C.bordeaux, color: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{(p.horaInicio || '--:--').slice(0, 5)}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{(p.horaFim || '').slice(0, 5)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.tinta, lineHeight: 1.25 }}>{p.titulo || 'Aula'}</div>
            <div style={{ fontSize: 13.5, color: C.suave, marginTop: 2 }}>
              {[passada ? dataPT(p.data) : '', p.ucId, p.estado !== 'publicado' ? 'ainda não publicada' : ''].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {!aberta && !fechada && (
          <button onClick={() => abrir(p)} disabled={!!aTratar} style={{ width: '100%', minHeight: 60, marginTop: 14, borderRadius: 14, border: 'none',
            background: C.bordeaux, color: '#fff', fontSize: 18, fontWeight: 800, cursor: aTratar ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: aTratar && !ocupado ? 0.5 : 1, boxShadow: '0 4px 14px rgba(123,34,51,0.25)' }}>
            {ocupado ? 'A abrir…' : p.estado !== 'publicado' ? 'Publicar e abrir aos alunos' : passada ? 'Abrir para os alunos se autoavaliarem' : 'Abrir a aula aos alunos'}
          </button>
        )}

        {aberta && (
          <div style={{ marginTop: 14, background: C.verdeSuave, borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.verde }}>✓ Aula aberta às {hora(s?.abertaEm || "")}</div>
            <div style={{ fontSize: 14, color: C.texto, marginTop: 3 }}>{entraram} de {nAlunos} alunos entraram</div>
            <EstadoAberturaAula planoAulaId={p.id} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={() => { if (confirm('Fechar a aula? Os alunos deixam de poder entrar.')) { fecharSessaoAula(p.id, nomeProfessor || 'professor'); redesenhar(n => n + 1); } }}
                style={{ minHeight: 44, padding: '8px 14px', borderRadius: 12, border: '1.5px solid #E4DDE0', background: '#fff', color: C.texto,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5 }}>Fechar a aula</button>
            </div>
          </div>
        )}
        {fechada && <div style={{ marginTop: 12, fontSize: 14, color: C.suave }}>Aula fechada às {hora(s?.fechadaEm || "")} · {entraram} de {nAlunos} entraram</div>}
      </div>
    );
  }

  const rotulo = (t: string) => <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.suave, margin: '18px 2px 10px' }}>{t}</div>;

  return (
    <div style={{ background: C.fundo, minHeight: '100%', padding: '14px 12px 40px', borderRadius: 16 }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ background: C.bordeaux, color: '#fff', borderRadius: 18, padding: '18px 20px' }}>
          <div style={{ fontSize: 21, fontWeight: 800 }}>Abrir a aula aos alunos</div>
          <div style={{ fontSize: 14, color: C.bordeauxClaro, marginTop: 4, lineHeight: 1.5 }}>
            Os alunos só conseguem entrar e avaliar-se depois de abrir. Os dez minutos de tolerância contam a partir daqui. · {turmaId}
          </div>
        </div>

        {rotulo(`Hoje · ${dataPT(hoje)}`)}
        {deHoje.length === 0 && (
          <div style={{ background: C.branco, borderRadius: 18, padding: 22, boxShadow: C.sombra, textAlign: 'center', color: C.suave, fontSize: 15 }}>
            Não há plano de aula para hoje no {turmaId}.
          </div>
        )}
        {deHoje.map(p => <Cartao key={p.id} p={p} />)}

        {passadas.length > 0 && (
          <>
            {rotulo('Aulas passadas (últimas duas semanas)')}
            <div style={{ fontSize: 14, color: C.texto, margin: '-4px 4px 10px', lineHeight: 1.5 }}>
              Abra-as para os alunos se autoavaliarem. As faltas marcam-se em cada plano, em «Turma e faltas».
            </div>
            {passadas.map(p => <Cartao key={p.id} p={p} passada />)}
          </>
        )}
      </div>
    </div>
  );
}

export default AbrirAulas;
