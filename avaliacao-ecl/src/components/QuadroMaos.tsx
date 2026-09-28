// ════════════════════════════════════════════════════════════
// LAVAGEM DAS MÃOS — antes de começar a produzir
// ════════════════════════════════════════════════════════════
// Aparece à entrada, depois da farda, e o aluno não avança sem passar
// por ela:
//   1. porquê (os micróbios passam das mãos para a comida);
//   2. os 10 passos, um de cada vez, com imagem e relógio — avançam
//      sozinhos, para o aluno não mexer no telemóvel com as mãos molhadas
//      (10 × 5 s = 50 s, dentro dos 40 a 60 s recomendados pela DGS/OMS);
//   3. quando lavar sempre as mãos, com imagens;
//   4. a confirmação, que fica registada na presença (o professor vê a
//      hora e quanto tempo demorou).
// Imagens: OpenMoji (openmoji.org), licença CC BY-SA 4.0.
import React, { useEffect, useRef, useState } from 'react';

const V = '#6B3FA0';
const img = (h: string) => `/imagens/higiene/${h}.svg`;
const SEGUNDOS_POR_PASSO = 5;

const PASSOS: { imgs: string[]; texto: string; simples: string }[] = [
  { imgs: ['1F48D', '231A'], texto: 'Tira anéis, pulseiras e relógio.', simples: 'Tira anéis e relógio.' },
  { imgs: ['1F6B0', '1F4A7'], texto: 'Molha as mãos com água.', simples: 'Molha as mãos.' },
  { imgs: ['1F9F4'], texto: 'Põe sabão suficiente para cobrir as mãos todas.', simples: 'Põe sabão.' },
  { imgs: ['1F64F'], texto: 'Esfrega as palmas das mãos uma na outra.', simples: 'Esfrega as palmas.' },
  { imgs: ['1FAF3', '1FAF4'], texto: 'Esfrega as costas de cada mão com a palma da outra.', simples: 'Esfrega as costas das mãos.' },
  { imgs: ['1F450'], texto: 'Esfrega entre os dedos, com os dedos entrelaçados.', simples: 'Esfrega entre os dedos.' },
  { imgs: ['1F44D'], texto: 'Esfrega cada polegar, a rodar dentro da outra mão.', simples: 'Esfrega os polegares.' },
  { imgs: ['1F485'], texto: 'Esfrega as pontas dos dedos e as unhas na palma da outra mão.', simples: 'Esfrega as unhas.' },
  { imgs: ['1F6B0', '1F4A6'], texto: 'Passa bem as mãos por água.', simples: 'Passa por água.' },
  { imgs: ['1F9FB'], texto: 'Seca com papel e fecha a torneira com o papel.', simples: 'Seca com papel. Fecha a torneira com o papel.' },
];

const QUANDO: { imgs: string[]; texto: string }[] = [
  { imgs: ['E0B2'], texto: 'Antes de começar a trabalhar' },
  { imgs: ['1F969', '1F41F', '1F95A'], texto: 'Depois de mexer em carne, peixe ou ovos crus' },
  { imgs: ['1F37D'], texto: 'Antes de mexer em comida já pronta' },
  { imgs: ['1F6BD'], texto: 'Depois de ires à casa de banho' },
  { imgs: ['1F927'], texto: 'Depois de tossir, espirrar ou assoar' },
  { imgs: ['1F443', '1F487'], texto: 'Depois de tocar na cara, no nariz ou no cabelo' },
  { imgs: ['1F5D1'], texto: 'Depois de mexer no lixo' },
  { imgs: ['1F4F1', '1F4B6'], texto: 'Depois de mexer no telemóvel ou em dinheiro' },
  { imgs: ['1F9F9'], texto: 'Depois de limpar' },
  { imgs: ['1F6AC'], texto: 'Depois de fumar' },
];

const Imagens = ({ hs, tam }: { hs: string[]; tam: number }) => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
    {hs.map(h => <img key={h} src={img(h)} alt="" width={tam} height={tam} style={{ display: 'block' }} />)}
  </div>
);

const titulo = (t: string) => (
  <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, color: '#1A1A1A', marginBottom: 8 }}>{t}</div>
);
const botao = (texto: string, onClick: () => void, ativo = true): React.ReactNode => (
  <button onClick={onClick} disabled={!ativo} style={{ width: '100%', marginTop: 16, minHeight: 54, borderRadius: 12,
    border: 'none', background: ativo ? V : 'rgba(26,23,20,0.1)', color: ativo ? '#fff' : 'rgba(26,23,20,0.35)',
    fontSize: 17, fontWeight: 700, fontFamily: 'inherit', cursor: ativo ? 'pointer' : 'not-allowed' }}>{texto}</button>
);
const creditos = (
  <div style={{ fontSize: 11, color: 'rgba(26,23,20,0.4)', textAlign: 'center', marginTop: 10 }}>
    Imagens: OpenMoji, CC BY-SA 4.0
  </div>
);

/** Relógio redondo que se esvazia. */
function Relogio({ falta, total }: { falta: number; total: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-label={`${falta} segundos`}>
      <circle cx="32" cy="32" r={r} fill="#fff" stroke="#E4E1E8" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={V} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - falta / total)} transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 1s linear' }} />
      <text x="32" y="38" textAnchor="middle" fontSize="18" fontWeight="800" fill={V}>{falta}</text>
    </svg>
  );
}

export function LavarMaos({ onFeito, simples = false }: {
  /** Recebe quantos segundos demorou a lavagem (os passos). */
  onFeito: (segundos: number) => void;
  /** Frases mais curtas (medidas seletivas e adicionais). */
  simples?: boolean;
}) {
  const [fase, setFase] = useState<'porque' | 'passos' | 'quando' | 'confirmar'>('porque');
  const [passo, setPasso] = useState(0);
  const [falta, setFalta] = useState(SEGUNDOS_POR_PASSO);
  const [pausa, setPausa] = useState(false);
  const [confirmo, setConfirmo] = useState(false);
  const inicio = useRef<number>(0);
  const fim = useRef<number>(0);

  // Os passos avançam sozinhos: o aluno está de mãos molhadas.
  useEffect(() => {
    if (fase !== 'passos' || pausa) return;
    const id = setInterval(() => setFalta(f => f - 1), 1000);
    return () => clearInterval(id);
  }, [fase, pausa]);
  useEffect(() => {
    if (fase !== 'passos' || falta > 0) return;
    if (passo < PASSOS.length - 1) { setPasso(p => p + 1); setFalta(SEGUNDOS_POR_PASSO); }
    else { fim.current = Date.now(); setFase('quando'); }
  }, [falta, fase, passo]);

  if (fase === 'porque') return (
    <div>
      {titulo('Antes de começar, lava bem as mãos')}
      <div style={{ background: '#fff', borderRadius: 16, padding: 18, textAlign: 'center' }}>
        <Imagens hs={['1F9A0', 'E0B2']} tam={84} />
        <div style={{ fontSize: 16, lineHeight: 1.55, marginTop: 10, color: '#2A1745' }}>
          {simples
            ? <>As mãos têm micróbios que não se veem. <b>Os micróbios passam para a comida</b> e quem come pode ficar doente.</>
            : <>As mãos têm micróbios que não se veem. Se passarem para a comida, <b>quem a come pode ficar doente</b>.
              Lavar bem as mãos demora <b>40 a 60 segundos</b>.</>}
        </div>
      </div>
      <div style={{ fontSize: 14.5, color: 'rgba(26,23,20,0.7)', marginTop: 12, lineHeight: 1.5 }}>
        Vai para o lava-mãos com o telemóvel à vista. Os passos aparecem um de cada vez e avançam sozinhos.
      </div>
      {botao('Estou no lava-mãos — começar', () => { inicio.current = Date.now(); setPasso(0); setFalta(SEGUNDOS_POR_PASSO); setFase('passos'); })}
      {creditos}
    </div>
  );

  if (fase === 'passos') {
    const p = PASSOS[passo];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: V }}>Lavar as mãos</span>
          <span style={{ fontSize: 12.5, color: 'rgba(26,23,20,0.55)' }}>Passo {passo + 1} de {PASSOS.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {PASSOS.map((_, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3,
            background: i < passo ? V : i === passo ? '#B98FD9' : 'rgba(255,255,255,0.7)' }} />)}
        </div>
        <div style={{ background: '#fff', borderRadius: 18, padding: '22px 16px', textAlign: 'center' }}>
          <Imagens hs={p.imgs} tam={p.imgs.length > 1 ? 96 : 130} />
          <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.35, marginTop: 14, color: '#1A1A1A' }}>
            {simples ? p.simples : p.texto}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <Relogio falta={Math.max(0, falta)} total={SEGUNDOS_POR_PASSO} />
          </div>
        </div>
        <button onClick={() => setPausa(x => !x)} style={{ width: '100%', marginTop: 14, minHeight: 50, borderRadius: 12,
          border: `2px solid ${V}`, background: '#fff', color: V, fontSize: 16, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer' }}>
          {pausa ? '▶ Continuar' : '⏸ Pausa'}
        </button>
        {creditos}
      </div>
    );
  }

  if (fase === 'quando') return (
    <div>
      {titulo('Lava sempre as mãos:')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {QUANDO.map(q => (
          <div key={q.texto} style={{ background: '#fff', borderRadius: 12, padding: '12px 8px', textAlign: 'center',
            border: '1px solid #E4E1E8' }}>
            <Imagens hs={q.imgs} tam={q.imgs.length > 2 ? 40 : q.imgs.length > 1 ? 48 : 56} />
            <div style={{ fontSize: 14, lineHeight: 1.35, marginTop: 6, color: '#2A1745', fontWeight: 600 }}>{q.texto}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, color: '#8A4E15', background: '#FDF0E8', border: '1px solid #E8C9A8',
        borderRadius: 12, padding: '10px 12px', marginTop: 12, lineHeight: 1.5 }}>
        <b>Regra fácil:</b> sempre que mudas de tarefa, lavas as mãos.
      </div>
      {botao('Seguinte', () => setFase('confirmar'))}
      {creditos}
    </div>
  );

  const segundos = Math.round(((fim.current || Date.now()) - inicio.current) / 1000);
  return (
    <div>
      {titulo('Lavaste as mãos com todos os passos?')}
      <div style={{ background: '#FDF0E8', border: '1px solid #E8C9A8', borderRadius: 12, padding: '11px 13px',
        fontSize: 14, color: '#7A4515', lineHeight: 1.5, marginBottom: 12 }}>
        <b>Só confirmes se for verdade.</b> A hora fica registada e o professor vê-a. Dizer que lavaste quando não
        lavaste conta contra ti.
      </div>
      <button onClick={() => setConfirmo(x => !x)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '15px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
        border: `2px solid ${confirmo ? V : '#DDD'}`, background: confirmo ? '#F0EBF7' : '#fff',
        color: confirmo ? V : '#333', textAlign: 'left' }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, border: `2px solid ${confirmo ? V : '#CCC'}`,
          background: confirmo ? V : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {confirmo && '✓'}
        </span>
        Sim, lavei as mãos agora, com todos os passos.
      </button>
      <button onClick={() => { setPasso(0); setFalta(SEGUNDOS_POR_PASSO); setConfirmo(false); inicio.current = Date.now(); setFase('passos'); }}
        style={{ width: '100%', marginTop: 10, minHeight: 48, borderRadius: 12, border: `2px solid ${V}`,
          background: 'transparent', color: V, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
        Não, vou lavar outra vez
      </button>
      {botao('Confirmar e continuar', () => onFeito(segundos), confirmo)}
    </div>
  );
}
