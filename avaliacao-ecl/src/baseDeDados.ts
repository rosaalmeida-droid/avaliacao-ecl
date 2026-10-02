// ============================================================
// Base de dados (Firebase / Firestore) — Rosa, out/2026
// ============================================================
// O Sheets demora e, com muitos alunos a gravar ao mesmo tempo, perdia
// gravações. As autoavaliações, as validações, as avaliações e as
// presenças passam a ir também para uma base de dados do Google
// (Firestore, gratuita no tamanho da escola): chegam em menos de um
// segundo e o computador do professor vê-as na hora, sem atualizar.
// O Sheets continua a recebê-las, como cópia e para ler.
//
// Enquanto FIREBASE_CONFIG estiver vazio, nada disto corre: a aplicação
// funciona como antes, só com o Sheets.
//
// Arrumação: turmas/<turma>/<colecao>/<id>, uma coleção por tipo.
// ============================================================
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';

/** Copiado da consola do Firebase (Definições do projeto → As suas apps → Configuração). */
// Não é segredo: vai em todas as aplicações web. Quem protege os dados
// são as regras da base (firestore.rules) e a entrada anónima.
export const FIREBASE_CONFIG: Record<string, string> = {
  apiKey: 'AIzaSyA-OIBh5AJiGgmCtVPF9QR84tNhKkH6QhU',
  authDomain: 'avaliacao-ecl.firebaseapp.com',
  projectId: 'avaliacao-ecl',
  storageBucket: 'avaliacao-ecl.firebasestorage.app',
  messagingSenderId: '685153353060',
  appId: '1:685153353060:web:fb36f2680bdaf1af12ce71',
};

export const baseLigada = (): boolean => !!FIREBASE_CONFIG.projectId && !!FIREBASE_CONFIG.apiKey;

/** O que vai para a base: o tipo do envio → a coleção. (2.ª fase, out/2026:
 *  também os planos, as fichas e a abertura da aula.) */
export const COLECAO_DO_TIPO: Record<string, string> = {
  selecao: 'selecoes',
  validacao: 'validacoes',
  avaliacao: 'avaliacoes',
  presenca: 'presencas',
  plano: 'planos',
  ficha: 'fichas',
  sessao: 'sessoes',
};
/** As fichas são de todas as turmas: ficam numa «turma» à parte. */
export const TURMA_DAS_FICHAS = '_todas';
const turmaDaColecao = (colecao: string, turmaId: string) => colecao === 'fichas' ? TURMA_DAS_FICHAS : turmaId;
/** O que cada perfil ouve: o professor tudo; o aluno a aula e as notas. */
export const TIPOS_DO_PROFESSOR = Object.keys(COLECAO_DO_TIPO);
export const TIPOS_DO_ALUNO = ['plano', 'ficha', 'sessao', 'validacao', 'avaliacao'];

let aLigar: Promise<{ app: FirebaseApp; db: Firestore } | null> | null = null;

/** Liga-se uma vez (o código do Firebase só se descarrega se a base estiver ligada). */
function ligar(): Promise<{ app: FirebaseApp; db: Firestore } | null> {
  if (!baseLigada()) return Promise.resolve(null);
  if (aLigar) return aLigar;
  aLigar = (async () => {
    try {
      const [{ initializeApp }, fs, { getAuth, signInAnonymously }] = await Promise.all([
        import('firebase/app'), import('firebase/firestore'), import('firebase/auth'),
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      // Guarda no aparelho o que ainda não chegou e envia quando houver rede.
      let db: Firestore;
      try {
        db = fs.initializeFirestore(app, {
          ignoreUndefinedProperties: true,
          localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
        });
      } catch {
        db = fs.initializeFirestore(app, { ignoreUndefinedProperties: true });
      }
      // Entrada anónima: as regras da base só aceitam quem vem da aplicação.
      await signInAnonymously(getAuth(app));
      return { app, db };
    } catch (e) {
      console.warn('[base] não foi possível ligar:', e);
      aLigar = null;
      return null;
    }
  })();
  return aLigar;
}

const semBarras = (t: string) => String(t || '').replace(/\//g, '∕') || '_';

/** O identificador do registo na base. As presenças são uma por aluno e aula. */
function idDoRegisto(tipo: string, dados: Record<string, any>): string {
  if (tipo === 'presenca') return semBarras(`${dados.alunoId}__${dados.planoAulaId}`);
  return semBarras(String(dados.id || ''));
}

// A hora de chegada é a do servidor do Google (gravadoNaBaseEm), não a do
// telemóvel: um relógio atrasado fazia o registo passar despercebido.
// Guarda-se como milissegundos.

/** Como cada envio vai para a base. Os planos e as fichas vão inteiros num
 *  texto (json): a base não aceita listas dentro de listas, e assim chegam
 *  tal e qual. Os eliminados ficam marcados, para sairem dos outros aparelhos. */
interface ParaBase { colecao: string; turma: string; id: string; obj: Record<string, any>; juntar?: boolean }
function paraBase(tipo: string, dados: Record<string, any>): ParaBase | null {
  const inteiro = (o: any) => ({ id: o.id, turmaId: o.turmaId || '', atualizadoEm: o.atualizadoEm || '', json: JSON.stringify(o) });
  switch (tipo) {
    case 'plano': { const p = dados.plano || dados; return p?.id && p.turmaId ? { colecao: 'planos', turma: p.turmaId, id: String(p.id), obj: inteiro(p) } : null; }
    case 'eliminar_plano': return dados.planoId && dados.turmaId ? { colecao: 'planos', turma: dados.turmaId, id: String(dados.planoId),
      obj: { id: dados.planoId, turmaId: dados.turmaId, eliminado: true } } : null;
    case 'ficha': { const f = dados.ficha || dados; return f?.id ? { colecao: 'fichas', turma: TURMA_DAS_FICHAS, id: String(f.id), obj: inteiro(f) } : null; }
    case 'eliminar_ficha': return dados.fichaId ? { colecao: 'fichas', turma: TURMA_DAS_FICHAS, id: String(dados.fichaId),
      obj: { id: dados.fichaId, eliminado: true } } : null;
    case 'sessao': case 'fechar_sessao': {
      const { tipo: _t, ...resto } = dados as any;
      return dados.planoAulaId && dados.turmaId ? { colecao: 'sessoes', turma: dados.turmaId, id: String(dados.planoAulaId), obj: resto, juntar: true } : null;
    }
  }
  const colecao = COLECAO_DO_TIPO[tipo];
  const turma = dados.turmaId || dados.turma;
  const id = idDoRegisto(tipo, dados);
  return colecao && turma && id && id !== '_' ? { colecao, turma, id, obj: dados } : null;
}

/** Grava (ou substitui) um registo. Devolve true quando a base o aceitou. */
export async function gravarNaBase(tipo: string, dados: Record<string, any>): Promise<boolean> {
  if (!baseLigada()) return false;
  const r = paraBase(tipo, dados);
  if (!r) return false;
  const l = await ligar();
  if (!l) return false;
  try {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    await setDoc(doc(l.db, 'turmas', semBarras(r.turma), r.colecao, semBarras(r.id)),
      { ...r.obj, gravadoNaBaseEm: serverTimestamp() }, { merge: !!r.juntar });
    return true;
  } catch (e) {
    console.warn('[base] não gravou', tipo, r.id, e);
    return false;
  }
}

/** Os tipos de envio que vão para a base. */
export const VAI_PARA_A_BASE = new Set([...Object.keys(COLECAO_DO_TIPO), 'eliminar_plano', 'eliminar_ficha', 'fechar_sessao']);

// Só se pede o que é novo desde a última leitura neste aparelho: a base
// gratuita conta cada registo lido, e uma turma junta milhares num ano.
const chaveLida = (turmaId: string, colecao: string) => `ecl_base_lida_${turmaId}_${colecao}`;
function lidaAte(turmaId: string, colecao: string): number {
  try { return Number(localStorage.getItem(chaveLida(turmaId, colecao))) || 0; } catch { return 0; }
}
function marcarLida(turmaId: string, colecao: string, ms: number[]): void {
  const max = Math.max(0, ...ms);
  if (max <= lidaAte(turmaId, colecao)) return;
  try { localStorage.setItem(chaveLida(turmaId, colecao), String(max)); } catch { /* */ }
}

/** O registo como a aplicação o guarda: a hora de chegada em texto. */
function registoDe(d: { data: (o?: any) => any }): { dados: any; ms: number } {
  const x = d.data({ serverTimestamps: 'estimate' });
  const t = x?.gravadoNaBaseEm;
  const ms = t && typeof t.toMillis === 'function' ? t.toMillis() : 0;
  let base = x;
  if (x && typeof x.json === 'string' && !x.eliminado) { try { base = JSON.parse(x.json); } catch { base = x; } }
  return { dados: { ...base, ...(x?.eliminado ? { eliminado: true } : {}), gravadoNaBaseEm: ms ? new Date(ms).toISOString() : undefined }, ms };
}

/** O que a base tem de novo de um tipo, para uma turma (no formato do Sheets). */
export async function lerDaBase(tipo: string, turmaId: string): Promise<any[] | null> {
  const colecao = COLECAO_DO_TIPO[tipo];
  if (!colecao || !baseLigada()) return null;
  const l = await ligar();
  if (!l) return null;
  try {
    const { collection, getDocs, query, where, Timestamp } = await import('firebase/firestore');
    const turma = turmaDaColecao(colecao, turmaId);
    const desde = lidaAte(turma, colecao);
    const c = collection(l.db, 'turmas', semBarras(turma), colecao);
    const r = await getDocs(desde ? query(c, where('gravadoNaBaseEm', '>', Timestamp.fromMillis(desde))) : c);
    const regs = r.docs.map(registoDe);
    marcarLida(turma, colecao, regs.map(x => x.ms));
    return regs.map(x => x.dados);
  } catch (e) {
    console.warn('[base] não leu', tipo, turmaId, e);
    return null;
  }
}

/** Fica à escuta da turma: cada alteração chega na hora. Devolve a função que para. */
export function ouvirTurmaNaBase(turmaId: string, aoMudar: (tipo: string, dados: any[]) => void,
  tipos: string[] = TIPOS_DO_PROFESSOR): () => void {
  if (!baseLigada() || !turmaId) return () => {};
  let parar: (() => void)[] = [];
  let vivo = true;
  ligar().then(async l => {
    if (!l || !vivo) return;
    const { collection, onSnapshot, query, where, Timestamp } = await import('firebase/firestore');
    const haUmMinuto = Date.now() - 60000;
    for (const tipo of tipos) {
      const colecao = COLECAO_DO_TIPO[tipo];
      if (!colecao) continue;
      const turma = turmaDaColecao(colecao, turmaId);
      // Só o que chegar a partir de agora (o que havia antes vem com lerDaBase).
      const desde = lidaAte(turma, colecao) || haUmMinuto;
      const q = query(collection(l.db, 'turmas', semBarras(turma), colecao),
        where('gravadoNaBaseEm', '>', Timestamp.fromMillis(desde)));
      parar.push(onSnapshot(q, snap => {
        const regs = snap.docChanges().filter(c => c.type !== 'removed').map(c => registoDe(c.doc));
        if (!regs.length) return;
        // As gravações deste aparelho ainda a caminho não contam como lidas.
        if (!snap.metadata.hasPendingWrites) marcarLida(turma, colecao, regs.map(x => x.ms));
        aoMudar(tipo, regs.map(x => x.dados));
      }, e => console.warn('[base] escuta', colecao, e)));
    }
  });
  return () => { vivo = false; parar.forEach(p => p()); parar = []; };
}
