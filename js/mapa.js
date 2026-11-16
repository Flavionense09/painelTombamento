/* ============================================================================
   Mapa do Brasil interativo (js/mapa.js) — SVG puro, sem bibliotecas.
   Depende de: js/brasil-estados.js (window.BR_ESTADOS)
   O mapa é "móvel": arraste para mover, role (ou use + / −) para ampliar.
   Seções: CONFIGURAÇÃO · GEOMETRIA · DESENHO · INTERAÇÃO · API PÚBLICA
   Pontos para o geolocalizador: busque por [GEOLOCALIZADOR (aqui e em js/painel.js)
   ============================================================================ */
const Mapa = (() => {
  /* ================= CONFIGURAÇÃO ================= */
  const COR = {
    vazio: '#16233b', // estado sem equipamentos
    escala: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa'], // do menos ao mais equipamentos
    borda: '#0b1220',
    hover: '#7c93c4',
    selecao: '#f59e0b',
    ponto: '#10b981', // cidades com equipamentos
    extra: '#f43f5e', // [GEOLOCALIZADOR 7] pontos vindos do geolocalizador
  };
  const ZOOM_MIN = 1,
    ZOOM_MAX = 14;

  /* ================= GEOMETRIA ================= */
  const K = Math.cos((15 * Math.PI) / 180); // correção da longitude (projeção equirretangular)
  const X = (lon) => lon * K,
    Y = (lat) => -lat;
  const caminho = (polis) =>
    polis
      .map((poli) =>
        poli
          .map((anel) => {
            let d = '';
            for (let i = 0; i < anel.length; i += 2)
              d +=
                (i ? 'L' : 'M') +
                X(anel[i] / 100).toFixed(3) +
                ' ' +
                Y(anel[i + 1] / 100).toFixed(3);
            return d + 'Z';
          })
          .join(''),
      )
      .join('');
  const estados = (window.BR_ESTADOS || []).map((e) => ({ ...e, d: caminho(e.p) }));
  estados.forEach((e) => {
    // área da caixa do estado (unidades do mapa): estados pequenos só mostram a sigla com zoom
    let x0 = 1e9,
      x1 = -1e9,
      y0 = 1e9,
      y1 = -1e9;
    e.p.forEach((poli) =>
      poli[0].forEach((v, i) =>
        i % 2
          ? ((y0 = Math.min(y0, Y(v / 100))), (y1 = Math.max(y1, Y(v / 100))))
          : ((x0 = Math.min(x0, X(v / 100))), (x1 = Math.max(x1, X(v / 100)))),
      ),
    );
    e.pequeno = (x1 - x0) * (y1 - y0) < 30;
  });
  const lims = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
  estados.forEach((e) =>
    e.p.forEach((poli) =>
      poli[0].forEach((v, i) => {
        if (i % 2) {
          lims.y0 = Math.min(lims.y0, Y(v / 100));
          lims.y1 = Math.max(lims.y1, Y(v / 100));
        } else {
          lims.x0 = Math.min(lims.x0, X(v / 100));
          lims.x1 = Math.max(lims.x1, X(v / 100));
        }
      }),
    ),
  );
  const BASE = {
    x: lims.x0 - 0.8,
    y: lims.y0 - 0.8,
    w: lims.x1 - lims.x0 + 1.6,
    h: lims.y1 - lims.y0 + 1.6,
  };

  /* ================= ESTADO ================= */
  let el = null,
    svg = null,
    tip = null,
    raf = 0;
  let view = { cx: BASE.x + BASE.w / 2, cy: BASE.y + BASE.h / 2, z: 1 };
  let dados = { estados: {}, pontos: [] },
    sel = '',
    arrasto = null;
  const emitir = (nome, detalhe) =>
    document.dispatchEvent(new CustomEvent('mapa:' + nome, { detail: detalhe }));

  /* ================= DESENHO ================= */
  const caixa = () => {
    const w = BASE.w / view.z,
      h = BASE.h / view.z;
    return { x: view.cx - w / 2, y: view.cy - h / 2, w, h };
  };
  const upp = () => (el ? caixa().w / el.getBoundingClientRect().width : 0.08); // unidades do mapa por pixel
  function corDo(uf, max) {
    const n = dados.estados[uf] || 0;
    if (!n) return COR.vazio;
    return COR.escala[Math.min(4, Math.ceil((n / max) * 5) - 1)];
  }
  function aplicarVista() {
    if (!svg) return;
    const b = caixa();
    svg.setAttribute(
      'viewBox',
      `${b.x.toFixed(3)} ${b.y.toFixed(3)} ${b.w.toFixed(3)} ${b.h.toFixed(3)}`,
    );
    const u = upp();
    svg
      .querySelectorAll('[data-r]')
      .forEach((c) => c.setAttribute('r', (+c.dataset.r * u).toFixed(4)));
    svg.querySelectorAll('.mp-uf').forEach((t) => {
      t.setAttribute('font-size', (11 * u).toFixed(4));
      t.style.display = t.classList.contains('peq') && view.z < 3 ? 'none' : '';
    });
  }
  function desenhar() {
    if (!el) return;
    const max = Math.max(1, ...Object.values(dados.estados));
    const paths = estados
      .map(
        (e) =>
          `<path class="mp-estado${e.uf === sel ? ' sel' : ''}" data-uf="${e.uf}" d="${e.d}" fill="${e.uf === sel ? COR.selecao : corDo(e.uf, max)}" fill-rule="evenodd"/>`,
      )
      .join('');
    const rotulos = estados
      .map(
        (e) =>
          `<text class="mp-uf${e.pequeno ? ' peq' : ''}" x="${X(e.lon).toFixed(3)}" y="${Y(e.lat).toFixed(3)}" text-anchor="middle">${e.uf}</text>`,
      )
      .join('');
    const pontos = dados.pontos
      .map((p, i) => {
        const r = 4 + Math.min(8, Math.sqrt(p.valor || 1));
        return `<circle class="mp-ponto" data-i="${i}" data-r="${r}" cx="${X(p.lon).toFixed(4)}" cy="${Y(p.lat).toFixed(4)}" fill="${p.extra ? COR.extra : COR.ponto}"/>`;
      })
      .join('');
    el.innerHTML = `<svg class="mp-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa do Brasil"><g>${paths}</g><g>${rotulos}</g><g>${pontos}</g></svg><div class="mp-tip"></div>`;
    svg = el.querySelector('svg');
    tip = el.querySelector('.mp-tip');
    svg.style.aspectRatio = `${BASE.w} / ${BASE.h}`;
    aplicarVista();
  }
  const noClient = (cx, cy) => {
    // coordenadas da tela → unidades do mapa
    const r = svg.getBoundingClientRect(),
      b = caixa();
    return {
      x: b.x + ((cx - r.left) / r.width) * b.w,
      y: b.y + ((cy - r.top) / r.height) * b.h,
      fx: (cx - r.left) / r.width,
      fy: (cy - r.top) / r.height,
    };
  };
  function limitar() {
    view.z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, view.z));
    view.cx = Math.max(BASE.x, Math.min(BASE.x + BASE.w, view.cx));
    view.cy = Math.max(BASE.y, Math.min(BASE.y + BASE.h, view.cy));
  }

  /* ================= INTERAÇÃO ================= */
  function dica(txt, e) {
    if (!tip) return;
    if (!txt) {
      tip.style.display = 'none';
      return;
    }
    const r = el.getBoundingClientRect();
    tip.textContent = txt;
    tip.style.display = 'block';
    tip.style.left = Math.min(e.clientX - r.left + 14, r.width - 170) + 'px';
    tip.style.top = e.clientY - r.top + 14 + 'px';
  }
  const textoEstado = (uf) => {
    const e = estados.find((x) => x.uf === uf),
      n = dados.estados[uf] || 0;
    return `${e.nome} (${uf}) · ${n} equipamento${n === 1 ? '' : 's'}`;
  };
  function ligar() {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      el.setPointerCapture(e.pointerId);
      arrasto = { x: e.clientX, y: e.clientY, mexeu: 0 };
      el.classList.add('arrastando');
      dica('');
    });
    el.addEventListener('pointermove', (e) => {
      if (arrasto) {
        const dx = e.clientX - arrasto.x,
          dy = e.clientY - arrasto.y,
          u = upp();
        arrasto.mexeu += Math.abs(dx) + Math.abs(dy);
        arrasto.x = e.clientX;
        arrasto.y = e.clientY;
        view.cx -= dx * u;
        view.cy -= dy * u;
        limitar();
        aplicarVista();
        emitir('mover', estado());
        return;
      }
      const alvo = document.elementFromPoint(e.clientX, e.clientY);
      if (alvo && alvo.classList.contains('mp-ponto'))
        dica(dados.pontos[+alvo.dataset.i].rotulo, e);
      else if (alvo && alvo.dataset && alvo.dataset.uf) dica(textoEstado(alvo.dataset.uf), e);
      else dica('');
    });
    el.addEventListener('pointerup', (e) => {
      const foi = arrasto;
      arrasto = null;
      el.classList.remove('arrastando');
      if (!foi || foi.mexeu >= 5) return; // foi arrasto, não clique
      const alvo = document.elementFromPoint(e.clientX, e.clientY);
      if (alvo && alvo.classList.contains('mp-ponto')) {
        const p = dados.pontos[+alvo.dataset.i];
        emitir('cidade', { ...p });
      } // [GEOLOCALIZADOR 8]
      else if (alvo && alvo.dataset && alvo.dataset.uf)
        selecionarEstado(alvo.dataset.uf === sel ? '' : alvo.dataset.uf, true);
      else selecionarEstado('', true);
    });
    el.addEventListener('pointerleave', () => dica(''));
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const antes = noClient(e.clientX, e.clientY),
          f = e.deltaY < 0 ? 1.18 : 1 / 1.18;
        view.z *= f;
        limitar();
        const b = caixa();
        view.cx = antes.x - antes.fx * b.w + b.w / 2;
        view.cy = antes.y - antes.fy * b.h + b.h / 2; // mantém o ponto sob o cursor
        limitar();
        aplicarVista();
        emitir('mover', estado());
      },
      { passive: false },
    );
  }

  /* ================= API PÚBLICA ================= */
  const estado = () => ({
    zoom: view.z,
    cx: view.cx,
    cy: view.cy,
    estado: sel,
    pontos: dados.pontos.length,
  });
  function selecionarEstado(uf, daInteracao) {
    sel = uf || '';
    desenhar();
    const e = estados.find((x) => x.uf === sel);
    emitir(
      'estado',
      e
        ? {
            uf: e.uf,
            nome: e.nome,
            regiao: e.regiao,
            total: dados.estados[e.uf] || 0,
            origem: daInteracao ? 'clique' : 'codigo',
          }
        : null,
    ); // [GEOLOCALIZADOR 5]
  }
  function animar(para, dur = 700) {
    const de = { ...view },
      t0 = performance.now();
    cancelAnimationFrame(raf);
    const passo = () => {
      const t = Math.min(1, (performance.now() - t0) / dur),
        k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      view = {
        cx: de.cx + (para.cx - de.cx) * k,
        cy: de.cy + (para.cy - de.cy) * k,
        z: de.z + (para.z - de.z) * k,
      };
      limitar();
      aplicarVista();
      if (t < 1) raf = requestAnimationFrame(passo);
      else emitir('mover', estado());
    };
    raf = requestAnimationFrame(passo);
  }
  // [GEOLOCALIZADOR 6] move o mapa até uma coordenada (ex.: resultado do geolocalizador)
  const irPara = (lat, lon, z, dur) =>
    animar({ cx: X(lon), cy: Y(lat), z: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z || view.z)) }, dur);
  return {
    estados: estados.map(({ uf, nome, regiao }) => ({ uf, nome, regiao })),
    montar(alvo) {
      el = alvo;
      if (!el) return;
      ligar();
      desenhar();
    },
    // { estados: { MA: 12, PA: 3 }, pontos: [{ id, rotulo, lat, lon, valor, uf, cidade, extra? }] }
    setDados(d) {
      dados = { estados: d.estados || {}, pontos: d.pontos || [] };
      desenhar();
    }, // [GEOLOCALIZADOR 7]
    selecionarEstado,
    irPara,
    estado,
    zoom(f) {
      view.z *= f;
      limitar();
      aplicarVista();
      emitir('mover', estado());
    },
    reset: () => animar({ cx: BASE.x + BASE.w / 2, cy: BASE.y + BASE.h / 2, z: 1 }, 600),
    _teste: { X, Y, BASE },
  };
})();