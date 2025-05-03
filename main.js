/******************************************************************
 *  図形定義（300×300）
 ******************************************************************/
const SHAPES = [
  {
    name : 'triangle',
    loop : false,
    paths: [
      'M50 250 L150 50',
      'M150 50 L250 250',
      'M250 250 L50 250'
    ]
  },
  {
    name : 'square',
    loop : false,
    paths: [
      'M70 70 L230 70',
      'M230 70 L230 230',
      'M230 230 L70 230',
      'M70 230 L70 70'
    ]
  },
  {
    name : 'circle',
    loop : true,                 // 円は閉ループ
    paths: [
      'M150 50 A100 100 0 1 1 149.9 50'
    ]
  }
];

/******************************************************************
 *  パラメータ
 ******************************************************************/
const CLEAR_RATIO   = 0.8;
const HIT_TOLERANCE = 16;

/******************************************************************
 *  状態変数
 ******************************************************************/
const svg  = document.getElementById('board');
const msg  = document.getElementById('msg');
let shapeIdx   = 0;
let edges      = [];
let tracePath  = null;
let drawing    = false;
let finished   = false;

/******************************************************************
 *  初期ロード
 ******************************************************************/
loadShape(SHAPES[shapeIdx]);

/******************************************************************
 *  pointer イベント
 ******************************************************************/
svg.addEventListener('pointerdown', e => {
  drawing = true;
  createTrace(getPt(e));
});

svg.addEventListener('pointerup',   stopDraw);
svg.addEventListener('pointerleave', stopDraw);

function stopDraw() {
  drawing = false;
  edges.forEach(e => (e.lastLen = null));
  if (tracePath) {
    tracePath.remove();
    tracePath = null;
  }
}

svg.addEventListener('pointermove', e => {
  if (!drawing) return;
  const pt = getPt(e);

  appendTrace(pt);                 // 軌跡描画

  edges.forEach(edge => {
    if (edge.cleared) return;

    const lenNear = nearestAlong(edge.path, pt.x, pt.y);
    const nearPt  = edge.path.getPointAtLength(lenNear);
    const dist    = hypot(pt.x - nearPt.x, pt.y - nearPt.y);

    if (dist < HIT_TOLERANCE) {
      if (edge.lastLen != null) {
        let diff = Math.abs(lenNear - edge.lastLen);
        if (edge.loop) diff = Math.min(diff, edge.length - diff);
        edge.covered += diff;
        if (edge.covered / edge.length >= CLEAR_RATIO) {
          edge.cleared = true;
          edge.path.classList.add('cleared');
        }
      }
      edge.lastLen = lenNear;
    } else {
      edge.lastLen = null;
    }
  });

  checkFinish();
});

/******************************************************************
 *  図形ロード
 ******************************************************************/
function loadShape(shape) {
  svg.replaceChildren();
  edges    = [];
  finished = false;
  msg.style.opacity = 0;
  tracePath = null;               // 念のためリセット

  shape.paths.forEach(d => {
    svg.appendChild(makePath(d, 'edge'));
    svg.appendChild(makePath(d, 'edge-hit'));
  });

  edges = Array.from(svg.querySelectorAll('.edge')).map(p => ({
    path    : p,
    length  : p.getTotalLength(),
    covered : 0,
    lastLen : null,
    loop    : shape.loop,
    cleared : false
  }));
}

/******************************************************************
 *  完了判定
 ******************************************************************/
function checkFinish() {
  if (!finished && edges.every(e => e.cleared)) {
    finished = true;
    // ───────── 軌跡を削除 ─────────
    if (tracePath) {
      tracePath.remove();
      tracePath = null;
    }

    msg.style.opacity = 1;

    setTimeout(() => {
      shapeIdx = (shapeIdx + 1) % SHAPES.length;
      loadShape(SHAPES[shapeIdx]);
    }, 1000);
  }
}

/******************************************************************
 *  軌跡描画
 ******************************************************************/
function createTrace(pt) {
  tracePath = makePath(`M${pt.x} ${pt.y}`, 'trace');
  svg.appendChild(tracePath);
}
function appendTrace(pt) {
  const d = tracePath.getAttribute('d') + ` L${pt.x} ${pt.y}`;
  tracePath.setAttribute('d', d);
}

/******************************************************************
 *  ユーティリティ
 ******************************************************************/
function makePath(d, cls) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  p.setAttribute('class', cls);
  return p;
}
function getPt(evt) {
  const p = svg.createSVGPoint();
  p.x = evt.clientX; p.y = evt.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
const hypot = Math.hypot;

function nearestAlong(path, x, y) {
  let lo = 0, hi = path.getTotalLength();
  for (let i = 0; i < 7; i++) {
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    if (dist(m1) < dist(m2)) hi = m2; else lo = m1;
  }
  return (lo + hi) / 2;
  function dist(l) {
    const p = path.getPointAtLength(l);
    return hypot(p.x - x, p.y - y);
  }
}
