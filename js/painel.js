/* ============================================================================
   Tombamentos · Control Room  —  lógica do painel (js/painel.js)
   Seções: ARMAZENAMENTO · UTIL · REGRAS · PROCESSOS · TELAS
   Pontos preparados para servidor/banco: busque por [SERVIDOR/BD
   ============================================================================ */

/* ================= ARMAZENAMENTO (engatilhado) =================
   Hoje: localStorage do navegador (sem servidor, sem banco). Para o futuro, troque ADAPTER por 'api'
   e implemente os endpoints GET/PUT {base}/db  (ou um endpoint por tabela). O resto do app não muda. */
/* >>> [SERVIDOR/BD 1] ADAPTADORES de armazenamento. Único lugar que fala com localStorage/rede. */
/* >>> [SERVIDOR/BD 1] "api" é só um esqueleto: troque por um endpoint por tabela (ver pontos 6 e 7) e adicione
 *     autenticação (cabeçalho/cookie) aqui.
 */
const A = {
  local: {
    load: () => JSON.parse(localStorage.getItem('tomb_db') || 'null'),
    save: (d) => localStorage.setItem('tomb_db', JSON.stringify(d)),
  },
  api: {
    base: 'http://localhost:3000/api',
    load: async () => (await fetch(A.api.base + '/db')).json(),
    save: async (d) =>
      fetch(A.api.base + '/db', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      }),
  },
};
/* >>> [SERVIDOR/BD 2] CHAVE DE TROCA: 'local' -> 'api'. Com o painel hospedado no mesmo servidor, use base
 *     relativa ('/api') e evite CORS.
 */
const ADAPTER = 'local';
let db,
  tab = 'dash',
  ctomb = '',
  msgs = {},
  fq = '',
  fs = '';
/* >>> [SERVIDOR/BD 3] PONTO ÚNICO DE GRAVAÇÃO: todo save() grava o banco inteiro (snapshot) e NÃO é aguardado. */
/* >>> [SERVIDOR/BD 3] Com servidor: gravar só a linha alterada, usar await/try-catch e mostrar erro; hoje
 *     falha de rede passaria despercebida.
 */
const save = () => A[ADAPTER].save(db);
const VAZIO = () => ({ novo: [], transf: [], baixa: [] });
/* >>> [SERVIDOR/BD 4] CARGA INICIAL: lê o banco (local/API) e, se vazio, começa com as tabelas vazias. Com BD:
 *     mostrar "carregando…" e tratar erro de conexão.
 */
(async () => {
  db = (await A[ADAPTER].load()) || VAZIO();
  render();
})();

/* ================= UTIL ================= */
const $ = (s) => document.querySelector(s),
  t = (s) => (s == null ? '' : String(s).trim()),
  n = (s) => t(s).toLowerCase();
const D = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : ''),
  h = (s) =>
    String(s ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
const T0 = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const pd = (x) => {
  x = t(x);
  const m = x.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return /^\d{4}-\d\d-\d\d$/.test(x) ? x : '';
};
const toast = (m) => {
  const e = $('#toast');
  e.textContent = m;
  e.style.display = 'block';
  clearTimeout(toast.i);
  toast.i = setTimeout(() => (e.style.display = 'none'), 5000);
};
setInterval(() => {
  const e = $('#clk');
  if (e) e.textContent = new Date().toLocaleString('pt-BR');
}, 1000);

/* ================= REGRAS (equivalentes às fórmulas do Sheets) ================= */
/* >>> [SERVIDOR/BD 5] REGRAS DE NEGÓCIO (situação, local atual, duplicados, última transferência) calculadas
 *     NO NAVEGADOR sobre arrays.
 */
/* >>> [SERVIDOR/BD 5] Com BD: replicar/validar no servidor (SQL/serviço); o navegador pode continuar
 *     calculando só para exibição.
 */
const lastT = (k) => {
  if (k)
    for (let i = db.transf.length - 1; i >= 0; i--)
      if (t(db.transf[i].tomb) === k) return db.transf[i];
};
const situ = (e) =>
  !t(e.equip)
    ? ''
    : !t(e.tomb)
      ? 'Sem tombamento'
      : db.baixa.some((b) => t(b.tomb) === t(e.tomb))
        ? 'Baixado'
        : lastT(t(e.tomb))
          ? 'Transferido'
          : 'Sem transferência';
const loc = (e) => {
  const l = lastT(t(e.tomb));
  return l ? t(l.dest) : t(e.unid);
};
const dup = (e) => t(e.tomb) && db.novo.filter((r) => t(r.tomb) === t(e.tomb)).length > 1;
const TIPOS = [
  ['Computador / PC', (x) => x.includes('computador') || x === 'pc'],
  ['Notebook', (x) => x.includes('notebook')],
  ['Monitor', (x) => x.includes('monitor')],
  ['Nobreak', (x) => x.includes('nobreak')],
  ['Impressora', (x) => x.includes('impressora')],
  ['Leitor de preço', (x) => x.includes('preço')],
  ['PowerBalun', (x) => x.includes('balun')],
  ['Access Point', (x) => x === 'ap'],
];
const SIT = ['Sem transferência', 'Transferido', 'Baixado', 'Sem tombamento'],
  COR = ['#10b981', '#f59e0b', '#64748b', '#ef4444'];
const cl = (s) => s.replace(/ /g, '_'),
  ok = (m) => ({ ok: 1, m: '✔ ' + m }),
  er = (m) => ({ m: '⚠ ' + m }),
  E0 = () => ({ equip: '', marca: '', tomb: '', unid: '', nf: '', dcomp: '', val: '' });

/* ================= PROCESSOS (equivalentes ao cadastro_dashboard.gs) ================= */
/* >>> [SERVIDOR/BD 6] PROCESSOS (cadastrar/registrar/baixar/salvar): hoje validam e alteram db.* em memória. */
/* >>> [SERVIDOR/BD 6] Com servidor: cada um vira uma chamada (POST/PATCH) que valida de novo e grava numa
 *     transação; a resposta {ok,m} pode ser mantida.
 */
/* >>> [SERVIDOR/BD 6] cadastrar -> db.novo.push  =>  POST /api/equipamentos */
function cadastrar(v) {
  const eq = t(v.equip),
    un = t(v.unid),
    tb = t(v.tomb); // cadastrarEquipamento
  if (!eq || !un) return er('Preencha ao menos Equipamento e Unidade/Setor.');
  if (tb && db.novo.some((r) => t(r.tomb) === tb))
    return er('O tombamento ' + tb + ' já está cadastrado. Nada foi gravado.');
  db.novo.push({
    equip: eq,
    marca: t(v.marca),
    tomb: tb,
    unid: un,
    nf: t(v.nf),
    dcomp: v.dcomp || '',
    val: false,
  });
  return ok('Equipamento cadastrado em Novo Tombamento (linha ' + (db.novo.length + 1) + ').');
}
/* >>> [SERVIDOR/BD 6] registrar -> db.transf.push  =>  POST /api/transferencias */
function registrar(v) {
  const tb = t(v.tomb),
    ds = t(v.dest); // registrarTransferencia
  if (!tb || !ds) return er('Preencha ao menos Tombamento e Destino.');
  const e = db.novo.find((r) => t(r.tomb) === tb);
  if (!e) return er('Tombamento ' + tb + ' não encontrado em Novo Tombamento.');
  const og = t(v.orig) || loc(e);
  if (n(og) === n(ds)) return er('Origem e destino são iguais (' + ds + '). Nada foi gravado.');
  db.transf.push({
    data: v.data || T0(),
    tomb: tb,
    orig: og,
    dest: ds,
    resp: t(v.resp),
    obs: t(v.obs),
    val: false,
  });
  return ok(
    'Transferência registrada (linha ' + (db.transf.length + 1) + '): ' + og + ' → ' + ds + '.',
  );
}
/* >>> [SERVIDOR/BD 6] baixar -> db.baixa.push  =>  POST /api/baixas */
function baixar(v) {
  const tb = t(v.tomb); // nova: aba Baixa de tombamento
  if (!tb) return er('Informe o tombamento.');
  if (!db.novo.some((r) => t(r.tomb) === tb))
    return er('Tombamento ' + tb + ' não encontrado em Novo Tombamento.');
  if (db.baixa.some((b) => t(b.tomb) === tb)) return er('O tombamento ' + tb + ' já está baixado.');
  db.baixa.push({ tomb: tb, data: v.data || T0(), val: false });
  return ok('Baixa registrada para ' + tb + '.');
}
/* >>> [SERVIDOR/BD 6] salvar -> altera linha de db.novo e a última transferência; renomear tombamento propaga
 *     para transf/baixa  =>  PATCH /api/equipamentos/:id (em TRANSAÇÃO)
 */
function salvar(k, e, f) {
  // salvarAlteracoes
  if (!k) return er('Escolha o tombamento antes de salvar.');
  const row = db.novo.find((r) => t(r.tomb) === k);
  if (!row) return er('Tombamento ' + k + ' não encontrado em Novo Tombamento.');
  const vz = (x) => t(x) === '',
    ap = (x) => t(x) === '-';
  if (Object.values(e).every(vz) && Object.values(f).every(vz))
    return er('Nada para alterar: preencha ao menos um campo em "Corrigir para".');
  const ult = lastT(k);
  let dc, val, no, nd, ndt, uvl;
  if (!vz(e.dcomp)) {
    dc = ap(e.dcomp) ? '' : pd(e.dcomp);
    if (!ap(e.dcomp) && !dc) return er('Data da compra inválida. Use dd/mm/aaaa.');
  }
  if (!vz(e.val)) {
    const x = n(e.val);
    if (x === 'sim') val = true;
    else if (x === 'não' || x === 'nao') val = false;
    else return er('Validado deve ser Sim ou Não.');
  }
  if (!vz(f.orig)) no = ap(f.orig) ? '' : t(f.orig);
  if (!vz(f.dest)) {
    if (ap(f.dest)) return er('O Local atual não pode ficar vazio.');
    nd = t(f.dest);
  }
  if (!vz(f.data)) {
    ndt = ap(f.data) ? '' : pd(f.data);
    if (!ap(f.data) && !ndt) return er('Data da transferência inválida. Use dd/mm/aaaa.');
  }
  if (!ult) {
    if (no !== undefined || ndt !== undefined)
      return er(
        'Este equipamento não tem transferência registrada; não há Origem nem Data de transferência para corrigir.',
      );
    if (nd !== undefined) {
      if (!vz(e.unid) && t(e.unid) !== nd)
        return er('Unidade/Setor e Local atual estão diferentes. Preencha só um deles.');
      if (vz(e.unid)) uvl = nd;
    }
  } else if (no !== undefined || nd !== undefined) {
    const o = no !== undefined ? no : t(ult.orig),
      d = nd !== undefined ? nd : t(ult.dest);
    if (n(o) === n(d)) return er('Origem e destino ficariam iguais (' + d + '). Nada foi gravado.');
  }
  const nt = vz(e.tomb) || ap(e.tomb) ? '' : t(e.tomb),
    mt = !vz(e.tomb) && nt !== k;
  let rt = [],
    rb = [];
  if (mt) {
    if (nt && db.novo.some((r) => t(r.tomb) === nt))
      return er('O tombamento ' + nt + ' já existe. Nada foi gravado.');
    rt = db.transf.filter((r) => t(r.tomb) === k);
    rb = db.baixa.filter((r) => t(r.tomb) === k);
    if (db.novo.filter((r) => t(r.tomb) === k).length > 1 && (rt.length || rb.length))
      return er(
        'O tombamento ' +
          k +
          ' está duplicado e tem transferência/baixa; não dá para saber a qual se referem. Nada foi gravado.',
      );
  }
  const m = [];
  [
    ['equip', 'Equipamento'],
    ['marca', 'Marca'],
    ['unid', 'Unidade/Setor'],
    ['nf', 'Nota fiscal'],
  ].forEach(([c, l]) => {
    if (!vz(e[c])) {
      row[c] = ap(e[c]) ? '' : t(e[c]);
      m.push(l);
    }
  });
  if (dc !== undefined) {
    row.dcomp = dc;
    m.push('Data da compra');
  }
  if (val !== undefined) {
    row.val = val;
    m.push('Validado');
  }
  if (ult) {
    if (no !== undefined) {
      ult.orig = no;
      m.push('Origem');
    }
    if (nd !== undefined) {
      ult.dest = nd;
      m.push('Local atual');
    }
    if (ndt !== undefined) {
      ult.data = ndt;
      m.push('Data da transferência');
    }
  } else if (uvl !== undefined) {
    row.unid = uvl;
    m.push('Local atual (Unidade/Setor)');
  }
  if (mt) {
    row.tomb = nt;
    rt.concat(rb).forEach((r) => (r.tomb = nt));
    m.push('Tombamento');
  }
  return { ...ok('Salvo (' + m.join(', ') + ').'), k: mt ? nt : k };
}
/* liberarTextoLivre: aqui nenhum campo é bloqueado; as listas (datalist) são só sugestões. */

/* ================= TELAS ================= */
const TABS = [
  ['dash', 'Dashboard'],
  ['eq', 'Equipamentos'],
  ['novo', 'Novo Tombamento'],
  ['transf', 'Transferência'],
  ['baixa', 'Baixa'],
  ['dados', 'Dados'],
];
const go = (k) => {
  tab = k;
  render();
};
const COLS = {
  novo: [
    ['equip', 'Equipamento'],
    ['marca', 'Marca'],
    ['tomb', 'Tombamento'],
    ['unid', 'Unidade/Setor'],
    ['nf', 'Nota fiscal'],
    ['dcomp', 'Data compra', 'date'],
    ['val', 'Validado', 'bool'],
  ],
  transf: [
    ['data', 'Data', 'date'],
    ['tomb', 'Tombamento'],
    ['orig', 'Origem'],
    ['dest', 'Destino'],
    ['resp', 'Responsável'],
    ['obs', 'Observação'],
    ['val', 'Validado', 'bool'],
  ],
  baixa: [
    ['tomb', 'Nº tombamento'],
    ['data', 'Data', 'date'],
    ['val', 'Validado', 'bool'],
  ],
};
function render() {
  $('#nav').innerHTML = TABS.map(
    ([k, l]) =>
      /* HTML */ `<button class="${k === tab ? 'on' : ''}" onclick="go('${k}')">${l}</button>`,
  ).join('');
  $('#app').innerHTML =
    tab === 'dash' ? dash() : tab === 'eq' ? eqv() : tab === 'dados' ? dados() : grid(tab);
  if (tab === 'dash') cons();
}
const inp = (id, l, o = {}) =>
  /* HTML */ `<label for="${id}">${l}</label
    ><input
      id="${id}"
      type="${o.t || 'text'}"
      ${o.l ? `list="${o.l}"` : ''}
      autocomplete="off"
      ${o.p ? `placeholder="${o.p}"` : ''}
    />`;
const msg = (id) =>
  /* HTML */ `<div class="msg ${msgs[id]?.ok ? 'ok' : 'er'}" id="m_${id}">
    ${h(msgs[id]?.m || '')}
  </div>`;
const uniq = (f) => [...new Set(db.novo.map((r) => t(r[f])).filter(Boolean))].sort();
const dl = (id, a) =>
  /* HTML */ `<datalist id="${id}">
    ${a.map((x) => /* HTML */ `<option value="${h(x)}"></option>`).join('')}
  </datalist>`;
function dash() {
  const E = db.novo.filter((r) => t(r.equip)),
    S = E.map(situ),
    cnt = (k) => S.filter((x) => x === k).length;
  const kp = [
    ['Equipamentos', E.length, ''],
    ['Sem tombamento', cnt('Sem tombamento'), 'y'],
    ['Transferências', db.transf.filter((r) => t(r.tomb)).length, 'b'],
    ['Transferidos', cnt('Transferido'), 'b'],
    ['Baixas', db.baixa.filter((r) => t(r.tomb)).length, 'r'],
    ['Validados', E.filter((r) => r.val === true).length, 'g'],
  ];
  const tp = TIPOS.map(([l, f]) => {
    const q = E.map((r, i) => [n(r.equip), S[i]]).filter((a) => f(a[0]));
    return [l, q.length, q.filter((a) => a[1] === 'Transferido').length];
  });
  tp.push([
    'Outros',
    E.length - tp.reduce((a, x) => a + x[1], 0),
    cnt('Transferido') - tp.reduce((a, x) => a + x[2], 0),
  ]);
  const mx = Math.max(1, ...tp.map((x) => x[1]));
  let ac = 0;
  const cg = SIT.map((s, i) => {
    const a = ac,
      p = E.length ? (cnt(s) / E.length) * 100 : 0;
    ac += p;
    return `${COR[i]} ${a}% ${ac}%`;
  }).join(',');
  const ut = db.transf
    .filter((r) => t(r.tomb))
    .slice(-8)
    .reverse();
  return /* HTML */ `<div class="grid k">
      ${kp.map(([l, v, c]) => /* HTML */ `<div class="card kp ${c}"><b>${v}</b><span>${l}</span></div>`).join('')}
    </div>
    <div class="grid g2">
      <div class="card">
        <h2>➕ Novo equipamento</h2>
        <div class="f">
          ${inp('n_equip', 'Equipamento', { l: 'dl_eq' })}
          ${inp('n_marca', 'Marca', { l: 'dl_marca' })} ${inp('n_tomb', 'Tombamento')}
          ${inp('n_unid', 'Unidade/Setor', { l: 'dl_unid' })} ${inp('n_nf', 'Nota fiscal')}
          ${inp('n_dcomp', 'Data da compra', { t: 'date' })}
        </div>
        <p><button class="btn g" onclick="act('n')">CADASTRAR</button></p>
        ${msg('n')}
      </div>
      <div class="card">
        <h2>🔁 Nova transferência</h2>
        <div class="f">
          ${inp('t_data', 'Data', { t: 'date' })} ${inp('t_tomb', 'Tombamento', { l: 'dl_tomb' })}
          ${inp('t_orig', 'Origem', { l: 'dl_unid', p: 'vazio = local atual' })}
          ${inp('t_dest', 'Destino', { l: 'dl_unid' })} ${inp('t_resp', 'Responsável')}
          ${inp('t_obs', 'Observação')}
        </div>
        <div class="m" id="t_hint" style="margin-top:6px"></div>
        <p><button class="btn g" onclick="act('t')">REGISTRAR</button></p>
        ${msg('t')}
      </div>
    </div>
    <div class="grid g2">
      <div class="card">
        <h2>🔎 Consultar e corrigir um equipamento</h2>
        <div class="row">
          <b>Tombamento ▶</b>
          <input
            id="c_key"
            list="dl_tomb"
            value="${h(ctomb)}"
            oninput="ctomb=this.value.trim();cons()"
            autocomplete="off"
          />
        </div>
        <div id="cons"></div>
        <p>
          <button class="btn p" onclick="act('c')">SALVAR ALTERAÇÕES</button>
          <span class="m">vazio = não altera · "-" apaga o campo</span>
        </p>
        ${msg('c')}
      </div>
      <div class="card">
        <h2>⬇ Registrar baixa</h2>
        <div class="f">
          ${inp('b_tomb', 'Tombamento', { l: 'dl_tomb' })} ${inp('b_data', 'Data', { t: 'date' })}
        </div>
        <p><button class="btn r" onclick="act('b')">BAIXAR</button></p>
        ${msg('b')}
        <h2 style="margin-top:18px">Legenda</h2>
        ${SIT.map((s) => /* HTML */ `<p><span class="badge ${cl(s)}">${s}</span></p>`).join('')}
      </div>
    </div>
    <div class="grid g3">
      <div class="card">
        <h2>Equipamentos por tipo</h2>
        ${tp
          .map(
            ([l, q, x]) =>
              /* HTML */ `<div style="margin:7px 0">
                <div style="display:flex;justify-content:space-between">
                  <span>${l}</span>
                  <span><b>${q}</b> <span class="m">(${x} transf.)</span></span>
                </div>
                <div class="bar"><i style="width:${(q / mx) * 100}%"></i></div>
              </div>`,
          )
          .join('')}
      </div>
      <div class="card">
        <h2>Situação</h2>
        <div
          class="donut"
          style="background:conic-gradient(${cg});-webkit-mask:radial-gradient(circle 38px,transparent 97%,#000);mask:radial-gradient(circle 38px,transparent 97%,#000)"
        ></div>
        <div style="margin-top:12px">
          ${SIT.map((s, i) => /* HTML */ `<p style="margin:4px 0"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${COR[i]}"></i> ${s}: <b>${cnt(s)}</b></p>`).join('')}
        </div>
      </div>
      <div class="card">
        <h2>Últimas transferências</h2>
        <table>
          <tr>
            <th>Data</th>
            <th>Tomb.</th>
            <th>Equip.</th>
            <th>Origem → Destino</th>
          </tr>
          ${
            ut
              .map(
                (r) =>
                  /* HTML */ `<tr>
                    <td>${D(r.data)}</td>
                    <td>${h(r.tomb)}</td>
                    <td>${h(t((db.novo.find((e) => t(e.tomb) === t(r.tomb)) || {}).equip))}</td>
                    <td>${h(r.orig)} → <b>${h(r.dest)}</b></td>
                  </tr>`,
              )
              .join('') || '<tr><td colspan=4 class="m">Nenhuma transferência.</td></tr>'
          }
        </table>
      </div>
    </div>
    ${dl('dl_tomb', uniq('tomb'))}
    ${dl('dl_eq', [...new Set([...TIPOS.map((x) => x[0].split(' / ')[0]), ...uniq('equip')])])}
    ${dl('dl_marca', uniq('marca'))}
    ${dl('dl_unid', [...new Set([...uniq('unid'), ...db.transf.map((r) => t(r.dest))].filter(Boolean))].sort())}`;
}
function cons() {
  const el = $('#cons');
  if (!el) return;
  const k = ctomb,
    row = db.novo.find((r) => t(r.tomb) === k),
    u = lastT(k);
  const R = (l, a, id) =>
    /* HTML */ `<tr>
      <td class="m">${l}</td>
      <td><b>${h(a)}</b></td>
      <td>${id ? /* HTML */ `<input id="c_${id}" />` : ''}</td>
    </tr>`;
  if (!k || !row) {
    el.innerHTML = /* HTML */ `<p class="m">
      ${k ? '⚠ Tombamento não encontrado.' : 'Digite ou escolha um tombamento.'}
    </p>`;
    return;
  }
  el.innerHTML = /* HTML */ `<table>
      <tr>
        <th>Campo</th>
        <th>Atual</th>
        <th>Corrigir para</th>
      </tr>
      ${R('Equipamento', row.equip, 'equip')} ${R('Marca', row.marca, 'marca')}
      ${R('Tombamento (nº)', row.tomb, 'tomb')} ${R('Unidade/Setor', row.unid, 'unid')}
      ${R('Nota fiscal', row.nf, 'nf')} ${R('Data da compra', D(row.dcomp), 'dcomp')}
      ${R('Validado', row.val === true ? 'Sim' : 'Não', 'val')}
      <tr>
        <td class="m">Situação</td>
        <td><span class="badge ${cl(situ(row))}">${situ(row)}</span></td>
        <td></td>
      </tr>
      ${R('Origem (última transf.)', u ? u.orig : '', 'orig')} ${R('Local atual', loc(row), 'dest')}
      ${R('Data da última transf.', u ? D(u.data) : '', 'data')}
      ${R('Nº de transferências', db.transf.filter((r) => t(r.tomb) === k).length)}
    </table>
    ${dup(row) ? '<p class="dup">⚠ Tombamento duplicado no cadastro.</p>' : ''}`;
}
/* >>> [SERVIDOR/BD 7] PONTO DE CHAMADA dos formulários: o resultado só é gravado em "if (r.ok) { save(); ...
 *     }" no fim desta função.
 */
/* >>> [SERVIDOR/BD 7] Com API: tornar async, aguardar a resposta e só então render(). */
function act(w) {
  const v = (id) => ($('#' + id) || {}).value || '';
  let r;
  if (w === 'n')
    r = cadastrar({
      equip: v('n_equip'),
      marca: v('n_marca'),
      tomb: v('n_tomb'),
      unid: v('n_unid'),
      nf: v('n_nf'),
      dcomp: v('n_dcomp'),
    });
  if (w === 't')
    r = registrar({
      data: v('t_data'),
      tomb: v('t_tomb'),
      orig: v('t_orig'),
      dest: v('t_dest'),
      resp: v('t_resp'),
      obs: v('t_obs'),
    });
  if (w === 'b') r = baixar({ tomb: v('b_tomb'), data: v('b_data') });
  if (w === 'c') {
    const k = ctomb;
    r = salvar(
      k,
      {
        equip: v('c_equip'),
        marca: v('c_marca'),
        tomb: v('c_tomb'),
        unid: v('c_unid'),
        nf: v('c_nf'),
        dcomp: v('c_dcomp'),
        val: v('c_val'),
      },
      { orig: v('c_orig'), dest: v('c_dest'), data: v('c_data') },
    );
    if (r.ok) ctomb = r.k;
  }
  msgs = {};
  msgs[w] = r;
  toast(r.m);
  if (r.ok) {
    save();
    render();
  } else (($('#m_' + w).textContent = r.m), ($('#m_' + w).className = 'msg er'));
}
document.addEventListener('input', (e) => {
  if (e.target.id === 't_tomb') {
    const x = db.novo.find((r) => t(r.tomb) === e.target.value.trim());
    $('#t_hint').textContent = x ? `${t(x.equip)} ${t(x.marca)} · local atual: ${loc(x)}` : '';
  }
});
function eqv() {
  const L = db.novo
    .filter((r) => t(r.equip))
    .map((r) => ({ r, s: situ(r), l: lastT(t(r.tomb)) }))
    .filter(
      (x) =>
        (!fs || x.s === fs) &&
        (!fq ||
          JSON.stringify(Object.values(x.r)).toLowerCase().includes(fq) ||
          n(loc(x.r)).includes(fq)),
    );
  return /* HTML */ `<div class="card">
    <div class="row">
      <input
        placeholder="Buscar (tombamento, marca, local...)"
        value="${h(fq)}"
        oninput="fq=n(this.value);clearTimeout(window._q);window._q=setTimeout(()=>{render();const i=$('.row input');i.focus();i.setSelectionRange(99,99)},350)"
      />
      <select onchange="fs=this.value;render()">
        <option value="">Todas as situações</option>
        ${SIT.map((s) => /* HTML */ `<option ${s === fs ? 'selected' : ''}>${s}</option>`).join('')}</select
      ><span class="m">${L.length} equipamentos · clique numa linha para consultar/corrigir</span>
    </div>
    <div class="tw">
      <table>
        <tr>
          ${['Tombamento', 'Equipamento', 'Marca', 'Unidade/Setor', 'Situação', 'Origem', 'Local atual', 'Data transf.', 'Nota fiscal', 'Data compra', 'Validado', 'Alerta'].map((c) => /* HTML */ `<th>${c}</th>`).join('')}
        </tr>
        ${L.map(
          ({ r, s, l }) =>
            /* HTML */ `<tr style="cursor:pointer" onclick="ctomb='${h(t(r.tomb))}';go('dash')">
              <td>${h(t(r.tomb) || '—')}</td>
              <td>${h(t(r.equip))}</td>
              <td>${h(t(r.marca))}</td>
              <td>${h(t(r.unid))}</td>
              <td><span class="badge ${cl(s)}">${s}</span></td>
              <td>${l ? h(l.orig) : ''}</td>
              <td>${h(loc(r))}</td>
              <td>${l ? D(l.data) : ''}</td>
              <td>${h(t(r.nf))}</td>
              <td>${D(r.dcomp)}</td>
              <td>${r.val === true ? 'Sim' : 'Não'}</td>
              <td class="dup">${dup(r) ? '⚠ duplicado' : ''}</td>
            </tr>`,
        ).join('')}
      </table>
    </div>
  </div>`;
}
function grid(k) {
  const C = COLS[k];
  return /* HTML */ `<div class="card">
    <div class="row">
      <b>${TABS.find((x) => x[0] === k)[1]}</b
      ><span class="m">${db[k].length} linhas · edite direto nas células</span
      ><button class="btn p" onclick="db['${k}'].push({});save();render();scrollTo(0,1e6)">
        + linha
      </button>
    </div>
    <div class="tw">
      <table>
        <tr>
          <th>#</th>
          ${C.map((c) => /* HTML */ `<th>${c[1]}</th>`).join('')}
          <th></th>
        </tr>
        ${db[k]
          .map(
            (r, i) =>
              /* HTML */ `<tr>
                <td class="m">${i + 2}</td>
                ${C.map(([f, , ty]) => /* HTML */ `<td>${ty === 'bool' ? /* HTML */ `<input type="checkbox" data-t="${k}" data-i="${i}" data-k="${f}" ${r[f] === true ? 'checked' : ''} />` : /* HTML */ `<input type="${ty || 'text'}" data-t="${k}" data-i="${i}" data-k="${f}" value="${h(r[f])}" />`}</td>`).join('')}
                <td><button class="btn" onclick="del('${k}',${i})">✕</button></td>
              </tr>`,
          )
          .join('')}
      </table>
    </div>
  </div>`;
}
/* >>> [SERVIDOR/BD 8] EDIÇÃO DIRETA nas grades: del / renomearLinha / listener "change" / botão "+ linha"
 *     (onclick inline) / importar JSON chamam save() ou db.* direto.
 */
/* >>> [SERVIDOR/BD 8] As linhas são identificadas pela POSIÇÃO no array (data-i) e não por id. Com BD: dar id
 *     a cada linha (db.novo[i].id) e usar DELETE/PATCH /api/<tabela>/:id.
 */
function del(k, i) {
  if (confirm('Excluir a linha ' + (i + 2) + '?')) {
    db[k].splice(i, 1);
    save();
    render();
  }
}
/* >>> [SERVIDOR/BD 8] renomearLinha: mesma regra de renomear tombamento do ponto 6 (propaga para
 *     transferências/baixas) -> deve ser a mesma transação no servidor.
 */
function renomearLinha(r, nw) {
  const old = t(r.tomb);
  if (nw && db.novo.some((z) => z !== r && t(z.tomb) === nw))
    return er('O tombamento ' + nw + ' já existe. Nada foi gravado.');
  const rt = old ? db.transf.filter((z) => t(z.tomb) === old) : [],
    rb = old ? db.baixa.filter((z) => t(z.tomb) === old) : [],
    oc = old ? db.novo.filter((z) => t(z.tomb) === old).length : 0;
  if (oc > 1 && (rt.length || rb.length))
    return er(
      'O tombamento ' +
        old +
        ' está duplicado e tem transferência/baixa; não dá para saber a qual se referem. Nada foi gravado.',
    );
  r.tomb = nw;
  if (oc === 1) rt.concat(rb).forEach((z) => (z.tomb = nw));
  return ok('Tombamento alterado.');
}
document.addEventListener('change', (e) => {
  const x = e.target.dataset;
  if (!x.t) return;
  const r = db[x.t][x.i],
    v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (x.t === 'novo' && x.k === 'tomb' && t(v) !== t(r.tomb)) {
    const q = renomearLinha(r, t(v));
    toast(q.m);
    if (!q.ok) {
      render();
      return;
    }
  } else r[x.k] = v;
  save();
});
/* >>> [SERVIDOR/BD 9] ABA DADOS: exportar e importar JSON. */
/* >>> [SERVIDOR/BD 9] Com BD: importar vira rota administrativa protegida (POST /api/admin/importar); exportar
 *     pode continuar no cliente.
 */
function dados() {
  return /* HTML */ `<div class="card">
    <h2>Dados e armazenamento</h2>
    <p class="m">
      Os dados ficam no <b>localStorage deste navegador</b> (sem servidor e sem banco). Para ligar a
      um servidor/BD depois, o ponto de troca é o objeto <code>A</code> / <code>ADAPTER</code> no
      início do script.
    </p>
    <div class="row">
      <button class="btn p" onclick="exp()">Exportar tudo (JSON)</button
      ><label class="btn"
        >Importar JSON<input type="file" accept=".json" hidden onchange="imp(this)"
      /></label>
      ${['novo', 'transf', 'baixa'].map((k) => /* HTML */ `<button class="btn" onclick="csv('${k}')">CSV ${k}</button>`).join('')}
    </div>
  </div>`;
}
const dwn = (nm, txt, ty) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: ty }));
  a.download = nm;
  a.click();
};
const exp = () => dwn('tombamentos_backup.json', JSON.stringify(db, null, 1), 'application/json');
const csv = (k) =>
  dwn(
    k + '.csv',
    '\ufeff' +
      [
        COLS[k].map((c) => c[1]),
        ...db[k].map((r) =>
          COLS[k].map(([f, , ty]) =>
            ty === 'date' ? D(r[f]) : ty === 'bool' ? (r[f] === true ? 'Sim' : 'Não') : t(r[f]),
          ),
        ),
      ]
        .map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'))
        .join('\n'),
    'text/csv',
  );
/* >>> [SERVIDOR/BD 9] IMPORTAR JSON: substitui db inteiro e chama save(). Com BD, enviar para o servidor
 *     validar e gravar em lote.
 */
const imp = (i) => {
  const f = i.files[0];
  if (!f) return;
  f.text().then((x) => {
    try {
      const d = JSON.parse(x);
      if (!d.novo || !d.transf || !d.baixa) throw 0;
      db = d;
      save();
      render();
      toast('✔ Dados importados.');
    } catch {
      toast('⚠ Arquivo inválido.');
    }
  });
};