// ============================================================
// datas.ts — Formatação de datas e horas em toda a app ECL
// Formato europeu/português: DD/MM/AAAA HH:MM
// ============================================================

function parseSafe(iso: string): Date | null {
  if (!iso) return null;
  try {
    // Datas só com data (AAAA-MM-DD) — interpretar como meio-dia local
    const s = String(iso).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [a, m, d] = s.split('-').map(Number);
      return new Date(a, m - 1, d, 12, 0, 0);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

/** 15/07/2026 */
export function fmtData(iso: string): string {
  const d = parseSafe(iso);
  if (!d) return '—';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** 15/07/2026 15:30 */
export function fmtDataHora(iso: string): string {
  const d = parseSafe(iso);
  if (!d) return '—';
  const data = d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  return `${data} ${hora}`;
}

/** 15:30 */
export function fmtHora(iso: string): string {
  const d = parseSafe(iso);
  if (!d) return '—';
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

/** 15 jul */
export function fmtDataCurta(iso: string): string {
  const d = parseSafe(iso);
  if (!d) return '—';
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}

/** segunda-feira, 15 de julho */
export function fmtDataLonga(iso: string): string {
  const d = parseSafe(iso);
  if (!d) return '—';
  return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Hoje / Ontem / DD/MM/AAAA */
export function fmtDataRelativa(iso: string): string {
  const d = parseSafe(iso);
  if (!d) return '—';
  const hoje = new Date();
  const diffDias = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Ontem';
  return fmtData(iso);
}

/** Alias de compatibilidade para código existente */
export function formatarData(iso: string): string { return fmtData(iso); }
export function formatarDataHora(iso: string): string { return fmtDataHora(iso); }
