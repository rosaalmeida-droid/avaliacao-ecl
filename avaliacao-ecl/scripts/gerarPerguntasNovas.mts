// Gera a página das perguntas novas para a Rosa ler e aprovar, a partir do
// código (assim a página nunca fica diferente do que a aplicação vai usar).
// Correr: npx tsx scripts/gerarPerguntasNovas.mts [ficheiro-do-fragmento]
//   → docs/perguntas_novas.html (página inteira)
//   → e, se indicado, só o conteúdo (sem <html>), para publicar.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pa = await import(path.join(raiz, 'src/perguntas_atitudes.ts'));
const pn = await import(path.join(raiz, 'src/perguntasNovasAtitudes.ts'));
const pf = await import(path.join(raiz, 'src/perguntasFaceis.ts'));
const pfn = await import(path.join(raiz, 'src/perguntasFaceisNovas.ts'));
const t5 = await import(path.join(raiz, 'src/triagem5c.ts'));
const n5 = await import(path.join(raiz, 'src/perguntasNovas5C.ts'));
const ms = await import(path.join(raiz, 'src/perguntas5CMuitoSimples.ts'));
const ce = await import(path.join(raiz, 'src/compatECL.ts'));

const esc = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const REQ: Record<string, string> = {
  cozinha: 'só em aula na cozinha', producao: 'só com produção', equipa: 'só com trabalho de equipa', colegas: 'só com colegas por perto',
};
const reqs = (r?: string[]) => (r || []).map(x => `<span class="req">${esc(REQ[x] || x)}</span>`).join('');

type V = { pergunta: string; respostas?: string[]; frases?: string[]; naoAconteceu?: string; semOcasiao?: string };
const linhaFacil = (tag: string, v?: V) => {
  if (!v) return '';
  const rs = v.respostas || v.frases || [];
  const nao = v.naoAconteceu || v.semOcasiao;
  return `<p class="facil"><span class="tag">${tag}</span> <b>${esc(v.pergunta)}</b> `
    + rs.map((r, i) => `<span class="n">${i + 1}.</span> ${esc(r)}`).join(' · ')
    + (nao ? ` · ou «${esc(nao)}»` : '') + '</p>';
};

let nPerg = 0;
function cartao(o: { titulo?: string; pergunta: string; respostas: string[]; nao?: string; requisitos?: string[];
  seletivas?: V; adicionais?: V; velha?: boolean }): string {
  if (!o.velha) nPerg++;
  return `<article class="q${o.velha ? ' velha' : ''}">`
    + `<p class="p">${o.titulo ? `<span class="tit">${esc(o.titulo)}</span> ` : ''}${esc(o.pergunta)}${reqs(o.requisitos)}</p>`
    + `<ol>${o.respostas.map(r => `<li>${esc(r)}</li>`).join('')}</ol>`
    + (o.nao ? `<p class="nao">ou: «${esc(o.nao)}» (não conta)</p>` : '')
    + `<div class="faceis">${linhaFacil('Medidas seletivas', o.seletivas)}${linhaFacil('Medidas adicionais', o.adicionais)}</div>`
    + `</article>`;
}

// ── As 22 atitudes ──────────────────────────────────────────────
const atitudes = (ce.ATITUDES_DETALHADAS as any[]).filter(a => pa.PERGUNTAS_ATITUDES[a.id]);
const anoTri = (a: any) => `${a.ano}.º ano · ${a.trimestre}.º trimestre`;
let htmlAti = '';
for (const a of atitudes) {
  const id = a.id;
  const sempre = pa.PERGUNTAS_ATITUDES[id] as V[];
  const novos = (pn.PARES_NOVOS_ATITUDES[id] || []) as { perguntas: V[]; requisitos: string[][] }[];
  let pares = `<div class="par"><p class="rot">Par de sempre · já está na aplicação (as versões fáceis são novas)</p>`
    + sempre.map((q, k) => cartao({ pergunta: q.pergunta, respostas: q.respostas!, nao: q.naoAconteceu, velha: true,
      seletivas: pf.FACEIS_DE_SEMPRE[`${id}|0|${k}`]?.simples, adicionais: pf.FACEIS_DE_SEMPRE[`${id}|0|${k}`]?.muitoSimples })).join('')
    + `</div>`;
  novos.forEach((par, p) => {
    pares += `<div class="par"><p class="rot">Par novo ${p + 1}</p>`
      + par.perguntas.map((q, k) => cartao({ pergunta: q.pergunta, respostas: q.respostas!, nao: q.naoAconteceu, requisitos: par.requisitos[k],
        seletivas: pfn.FACEIS_NOVAS[`${id}|${p + 1}|${k}`]?.simples, adicionais: pfn.FACEIS_NOVAS[`${id}|${p + 1}|${k}`]?.muitoSimples })).join('')
      + `</div>`;
  });
  htmlAti += `<section class="ati" id="${id.toLowerCase()}"><h3>${esc(a.nome)} <span class="id">${id} · ${anoTri(a)}</span></h3>${pares}</section>`;
}

// ── 5 C ────────────────────────────────────────────────────────
const c5 = (q: any, chaveMuito: string) => cartao({ titulo: q.titulo, pergunta: q.pergunta, respostas: q.frases, nao: q.semOcasiao || undefined,
  seletivas: q.perguntaSimples ? { pergunta: q.perguntaSimples, frases: q.frasesSimples, semOcasiao: q.semOcasiaoSimples || undefined } : undefined,
  adicionais: ms.MUITO_SIMPLES_5C[chaveMuito] ? { pergunta: ms.MUITO_SIMPLES_5C[chaveMuito].pergunta, frases: ms.MUITO_SIMPLES_5C[chaveMuito].frases,
    semOcasiao: ms.MUITO_SIMPLES_5C[chaveMuito].semOcasiao } : undefined });
const antes = nPerg;
const base = [...(t5.PERGUNTAS_TRIAGEM as any[]).map(q => c5(q, q.chave)), c5(t5.CL_SEMPRE, 'cl02')];
nPerg = antes;   // as de sempre não contam como novas
const secao5C = (id: string, titulo: string, intro: string, banco: any[]) =>
  `<section id="${id}"><h2>${titulo}</h2><p class="intro">${intro}</p>${banco.map(q => c5(q, q.id)).join('')}</section>`;
const htmlCL = secao5C('colaborativo', `Colaborativo · ${n5.BANCO_CL_NOVO.length} novas`, 'Hoje há só 2 perguntas do Colaborativo.', n5.BANCO_CL_NOVO);
const htmlCO = secao5C('consciente', `Consciente · ${n5.BANCO_CO_NOVO.length} novas`, `Juntam-se às ${t5.BANCO_CO.length} que já estão na aplicação.`, n5.BANCO_CO_NOVO);
const htmlCR = secao5C('criativo', `Criativo · ${n5.BANCO_CR_NOVO.length} novas`, `Juntam-se às ${t5.BANCO_CR.length} que já estão na aplicação.`, n5.BANCO_CR_NOVO);
const nAti = (Object.values(pn.PARES_NOVOS_ATITUDES) as any[]).reduce((s, ps) => s + ps.length * 2, 0);
const total5C = n5.BANCO_CL_NOVO.length + n5.BANCO_CO_NOVO.length + n5.BANCO_CR_NOVO.length;

const indice = atitudes.map(a => `<a href="#${a.id.toLowerCase()}">${esc(a.nome)}</a>`).join('');

const estilo = `<style>
/* Uma coluna para ler no telemóvel: índice, pesquisa, perguntas em cartões. */
:root{--bg:#f5f3f4;--fg:#1d1a1c;--mut:#675f63;--ac:#7b2233;--card:#ffffff;--line:#e2dadd;--suave:#f1e8eb;
--f-tit:"Source Serif 4",Georgia,serif;--f-txt:"Atkinson Hyperlegible",system-ui,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171417;--fg:#eee8eb;--mut:#a69ca1;--ac:#e98da0;--card:#211d21;--line:#3a3237;--suave:#2c2328;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#171417;--fg:#eee8eb;--mut:#a69ca1;--ac:#e98da0;--card:#211d21;--line:#3a3237;--suave:#2c2328;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:16px/1.55 var(--f-txt)}
.pagina{max-width:760px;margin:0 auto;padding-inline:16px;padding-block:20px 48px}
h1,h2,h3{font-family:var(--f-tit);text-wrap:balance;line-height:1.25}
h1{font-size:1.9rem;margin:0 0 8px;color:var(--ac)}
h2{font-size:1.45rem;color:var(--ac);margin:40px 0 4px;padding-bottom:6px;border-bottom:2px solid var(--ac)}
h3{font-size:1.2rem;margin:32px 0 8px}
.id{font:600 .8rem var(--f-txt);color:var(--mut);letter-spacing:.02em}
.intro,.lead{color:var(--mut);max-width:65ch}
.lead b{color:var(--fg)}
.ferr{position:sticky;top:env(safe-area-inset-top,0px);z-index:2;background:var(--bg);padding-block:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;border-bottom:1px solid var(--line)}
.ferr input[type=search]{flex:1 1 220px;min-width:0;font:inherit;padding:9px 12px;border-radius:10px;border:1.5px solid var(--line);background:var(--card);color:var(--fg)}
.ferr label{display:flex;gap:6px;align-items:center;font-size:.92rem;color:var(--mut)}
.ferr input:focus-visible,a:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.contagem{font-size:.85rem;color:var(--mut);flex-basis:100%}
nav.ind{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 4px}
nav.ind a{font-size:.85rem;text-decoration:none;color:var(--ac);border:1px solid var(--line);border-radius:999px;padding:3px 10px;background:var(--card)}
.secoes{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.secoes a{font-weight:700;color:var(--fg);text-decoration:none;border-bottom:2px solid var(--ac)}
.par{margin:12px 0 0;display:flex;flex-direction:column;gap:8px}
.rot{margin:0;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}
.q{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;min-width:0}
.q.velha{background:transparent}
.q.velha .p,.q.velha ol{color:var(--mut)}
.p{margin:0;font-weight:700}
.tit{display:block;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ac)}
ol{margin:6px 0 0;padding-left:24px}
li{margin:2px 0}
.nao{margin:6px 0 0;font-size:.9rem;color:var(--mut)}
.req{display:inline-block;margin-left:6px;font-size:.72rem;font-weight:700;color:var(--ac);border:1px solid var(--ac);border-radius:6px;padding:0 6px;vertical-align:2px}
.faceis{margin-top:8px;display:flex;flex-direction:column;gap:4px}
.facil{margin:0;font-size:.88rem;background:var(--suave);border-radius:8px;padding:6px 9px}
.tag{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ac)}
.n{font-variant-numeric:tabular-nums;color:var(--mut)}
.semFaceis .faceis{display:none}
</style>`;

const conteudo = `<div class="pagina">
<h1>Banco novo de perguntas</h1>
<p class="lead">Para ler e aprovar antes de entrarem na aplicação. Cada atitude passa a ter <b>4 pares de perguntas</b> (o de sempre e 3 novos), e em cada aula sai um par, à vez. Os 5 C ganham perguntas novas. As respostas vão sempre da pior (1) para a melhor (4). Cada pergunta tem também a versão para as <b>medidas seletivas</b> e a das <b>medidas adicionais</b>: as 4 respostas valem o mesmo nas três.</p>
<p class="lead">Perguntas novas: <b>${nAti}</b> das atitudes e <b>${total5C}</b> dos 5 C (${n5.BANCO_CL_NOVO.length} do Colaborativo, ${n5.BANCO_CO_NOVO.length} do Consciente, ${n5.BANCO_CR_NOVO.length} do Criativo). As que estão a cinzento já existem.</p>
<div class="secoes"><a href="#atitudes">As 22 atitudes</a><a href="#colaborativo">Colaborativo</a><a href="#consciente">Consciente</a><a href="#criativo">Criativo</a><a href="#sempre">5 C de sempre</a></div>
<div class="ferr"><input type="search" id="procurar" placeholder="Procurar uma palavra (ex.: telemóvel, farda)" aria-label="Procurar nas perguntas">
<label for="faceis"><input type="checkbox" id="faceis" checked> Ver as versões fáceis</label><span class="contagem" id="contagem"></span></div>
<section id="atitudes"><h2>As 22 atitudes</h2><p class="intro">A etiqueta vermelha diz em que aulas a pergunta pode sair (por exemplo, «só em aula na cozinha»: numa aula teórica não aparece).</p>
<nav class="ind" aria-label="Atitudes">${indice}</nav>${htmlAti}</section>
${htmlCL}${htmlCO}${htmlCR}
<section id="sempre"><h2>5 C de sempre</h2><p class="intro">Já estão na aplicação. Só a versão das medidas adicionais é nova.</p>${base.join('')}</section>
</div>
<script>
(function(){
  var caixa=document.getElementById('procurar'),faceis=document.getElementById('faceis'),cont=document.getElementById('contagem');
  var cartoes=[].slice.call(document.querySelectorAll('.q'));
  function semAcentos(t){return t.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();}
  var textos=cartoes.map(function(c){return semAcentos(c.textContent);});
  function filtrar(){
    var t=semAcentos(caixa.value.trim()),n=0;
    cartoes.forEach(function(c,i){var ok=!t||textos[i].indexOf(t)>=0;c.hidden=!ok;if(ok)n++;});
    [].slice.call(document.querySelectorAll('.par,section.ati')).forEach(function(s){s.hidden=!!t&&!s.querySelector('.q:not([hidden])');});
    cont.textContent=t?(n+' pergunta'+(n===1?'':'s')+' com «'+caixa.value.trim()+'»'):'';
  }
  caixa.addEventListener('input',filtrar);
  faceis.addEventListener('change',function(){document.body.classList.toggle('semFaceis',!faceis.checked);});
})();
</script>`;

const fontes = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap">';
const fragmento = `<title>Banco novo de perguntas</title>\n${fontes}\n${estilo}\n${conteudo}\n`;
fs.writeFileSync(path.join(raiz, 'docs/perguntas_novas.html'),
  `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
  + `<title>Banco novo de perguntas</title>${fontes}${estilo}</head><body>${conteudo}</body></html>`);
if (process.argv[2]) fs.writeFileSync(process.argv[2], fragmento);
console.log(`atitudes: ${atitudes.length} · perguntas novas das atitudes: ${nAti} · 5 C novas: ${total5C} · cartões novos: ${nPerg}`);
