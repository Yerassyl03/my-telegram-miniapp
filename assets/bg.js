// assets/bg.js — 3D фон с анимированным градиентом (white → emerald → sky → purple)
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

let scene, camera, renderer, group, particles;
let torusMat, shieldMat, pMat, dir1, dir2;
let seeds = [];
let basePos;
let clock;
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

// ------------ Базовый градиент ------------
const GRADIENT = {
  colors: [0xffffff, 0x10b981, 0x38bdf8, 0xa855f7], // белый, изумруд, небесный, яркий фиолет
  yMin: -6.0,
  yMax: 6.0
};

function toColors(arr) { return arr.map(c => new THREE.Color(c)); }

// GLSL куски: смешивание 4-х цветов + RGB<->HSV
const gradientChunks = `
  vec3 blend4(vec3 c0, vec3 c1, vec3 c2, vec3 c3, float t){
    if (t < 0.3333) {
      float k = smoothstep(0.0, 0.3333, t);
      return mix(c0, c1, k);
    } else if (t < 0.6667) {
      float k = smoothstep(0.3333, 0.6667, t);
      return mix(c1, c2, k);
    } else {
      float k = smoothstep(0.6667, 1.0, t);
      return mix(c2, c3, k);
    }
  }

  // RGB <-> HSV по IQ
  vec3 rgb2hsv(vec3 c){
    vec4 K = vec4(0., -1./3., 2./3., -1.);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.*d + e)), d / (q.x + e), q.x);
  }
  vec3 hsv2rgb(vec3 c){
    vec3 p = abs(fract(c.xxx + vec3(0., 1./3., 2./3.)) * 6. - 3.);
    vec3 q = clamp(p - 1., 0., 1.);
    return c.z * mix(vec3(1.), q, c.y);
  }
`;

// Градиентный ShaderMaterial с hue-сдвигом
function makeGradientMaterial({ opacity = 0.22, wireframe = true } = {}) {
  const uniforms = {
    uC0: { value: new THREE.Color(GRADIENT.colors[0]) },
    uC1: { value: new THREE.Color(GRADIENT.colors[1]) },
    uC2: { value: new THREE.Color(GRADIENT.colors[2]) },
    uC3: { value: new THREE.Color(GRADIENT.colors[3]) },
    uYMin: { value: GRADIENT.yMin },
    uYMax: { value: GRADIENT.yMax },
    uOpacity: { value: opacity },
    uHue: { value: 0.0 },     // 0..1 — сдвиг тона
    uSat: { value: 0.6 },     // 0..1 — СРЕДНЯЯ насыщенность (было бы 1.0 — кислотно)
    uGamma: { value: 1.08 }   // мягкая яркость/контраст (1.0 — без изменения)
  };

  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    wireframe,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPos;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      ${gradientChunks}
      uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
      uniform float uYMin; uniform float uYMax; uniform float uOpacity; 
      uniform float uHue; uniform float uSat; uniform float uGamma;
      varying vec3 vWorldPos;
      void main(){
        // базовые цвета + сдвиг тона
        vec3 c0h = hsv2rgb(vec3(fract(rgb2hsv(uC0).x + uHue), rgb2hsv(uC0).y, rgb2hsv(uC0).z));
        vec3 c1h = hsv2rgb(vec3(fract(rgb2hsv(uC1).x + uHue), rgb2hsv(uC1).y, rgb2hsv(uC1).z));
        vec3 c2h = hsv2rgb(vec3(fract(rgb2hsv(uC2).x + uHue), rgb2hsv(uC2).y, rgb2hsv(uC2).z));
        vec3 c3h = hsv2rgb(vec3(fract(rgb2hsv(uC3).x + uHue), rgb2hsv(uC3).y, rgb2hsv(uC3).z));

        float t = clamp((vWorldPos.y - uYMin) / (uYMax - uYMin), 0.0, 1.0);
        vec3 col = blend4(c0h, c1h, c2h, c3h, t);

        // приглушаем насыщенность (uSat < 1) и слегка корректируем яркость (uGamma)
        vec3 hsv = rgb2hsv(col);
        hsv.y = clamp(hsv.y * uSat, 0.0, 1.0);
        hsv.z = pow(hsv.z, uGamma);
        col = hsv2rgb(hsv);

        gl_FragColor = vec4(col, uOpacity);
      }
    `
  });
}


// параллакс
let px = 0, py = 0, tx = 0, ty = 0;

// Параметры анимации градиента
const gradAnim = { enabled: true, speed: 0.03, hue: 0.0 }; // ~0.03 об/сек

init();
animate();

// ===== Публичные API =====
window.setGradient = function ({ colors, yMin, yMax } = {}) {
  if (Array.isArray(colors) && colors.length >= 4) {
    const cols = toColors(colors);
    torusMat.uniforms.uC0.value.copy(cols[0]);
    torusMat.uniforms.uC1.value.copy(cols[1]);
    torusMat.uniforms.uC2.value.copy(cols[2]);
    torusMat.uniforms.uC3.value.copy(cols[3]);
    shieldMat.uniforms.uC0.value.copy(cols[0]);
    shieldMat.uniforms.uC1.value.copy(cols[1]);
    shieldMat.uniforms.uC2.value.copy(cols[2]);
    shieldMat.uniforms.uC3.value.copy(cols[3]);
    repaintParticles(cols, GRADIENT.yMin, GRADIENT.yMax);
    GRADIENT.colors = colors.slice(0,4);
  }
  if (typeof yMin === 'number') {
    torusMat.uniforms.uYMin.value = yMin;
    shieldMat.uniforms.uYMin.value = yMin;
    GRADIENT.yMin = yMin;
  }
  if (typeof yMax === 'number') {
    torusMat.uniforms.uYMax.value = yMax;
    shieldMat.uniforms.uYMax.value = yMax;
    GRADIENT.yMax = yMax;
  }
};

window.setGradientAnimation = function ({ enabled, speed } = {}) {
  if (typeof enabled === 'boolean') gradAnim.enabled = enabled;
  if (typeof speed === 'number') gradAnim.speed = speed;
};

// Пересчитать цвета частиц под новые базовые (фиксированная картинка)
function repaintParticles(cols, yMin, yMax){
  const colAttr = particles.geometry.getAttribute('color');
  const posAttr = particles.geometry.getAttribute('position');
  for (let i = 0; i < posAttr.count; i++){
    const y = posAttr.getY(i);
    const t = THREE.MathUtils.clamp((y - yMin) / (yMax - yMin), 0, 1);
    let cA, cB, k;
    if (t < 1/3) { cA = cols[0]; cB = cols[1]; k = THREE.MathUtils.smoothstep(t, 0, 1/3); }
    else if (t < 2/3) { cA = cols[1]; cB = cols[2]; k = THREE.MathUtils.smoothstep(t, 1/3, 2/3); }
    else { cA = cols[2]; cB = cols[3]; k = THREE.MathUtils.smoothstep(t, 2/3, 1); }
    const r = THREE.MathUtils.lerp(cA.r, cB.r, k);
    const g = THREE.MathUtils.lerp(cA.g, cB.g, k);
    const b = THREE.MathUtils.lerp(cA.b, cB.b, k);
    colAttr.setXYZ(i, r, g, b);
  }
  colAttr.needsUpdate = true;
}

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0c10, 8, 28); // тёмный фон из CSS

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 1.2, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.classList.add('webgl-bg');
  document.body.appendChild(renderer.domElement);

  group = new THREE.Group();
  scene.add(group);

  // Торус и "щит" — градиентные шейдеры
  const torusGeo = new THREE.TorusKnotGeometry(2.2, 0.55, 180, 22);
  torusMat = makeGradientMaterial({ opacity: 0.22, wireframe: true });
  const torus = new THREE.Mesh(torusGeo, torusMat);
  torus.rotation.x = 0.6;
  group.add(torus);

  const shieldGeo = new THREE.IcosahedronGeometry(3.6, 1);
  shieldMat = makeGradientMaterial({ opacity: 0.14, wireframe: true });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  group.add(shield);

  // Частицы c вершинными цветами
  const COUNT = 900;
  const pos = new Float32Array(COUNT * 3);
  const cols = new Float32Array(COUNT * 3);
  const range = 26;
  const C = toColors(GRADIENT.colors);
  for (let i = 0; i < COUNT; i++) {
    const ix = i * 3;
    const x = (Math.random() - 0.5) * range;
    const y = (Math.random() - 0.5) * range * 0.6;
    const z = (Math.random() - 0.5) * range;
    pos[ix + 0] = x; pos[ix + 1] = y; pos[ix + 2] = z;
    seeds[i] = Math.random() * Math.PI * 2;

    const t = THREE.MathUtils.clamp((y - GRADIENT.yMin) / (GRADIENT.yMax - GRADIENT.yMin), 0, 1);
    let cA, cB, k;
    if (t < 1/3) { cA = C[0]; cB = C[1]; k = THREE.MathUtils.smoothstep(t, 0, 1/3); }
    else if (t < 2/3) { cA = C[1]; cB = C[2]; k = THREE.MathUtils.smoothstep(t, 1/3, 2/3); }
    else { cA = C[2]; cB = C[3]; k = THREE.MathUtils.smoothstep(t, 2/3, 1); }
    cols[ix + 0] = THREE.MathUtils.lerp(cA.r, cB.r, k);
    cols[ix + 1] = THREE.MathUtils.lerp(cA.g, cB.g, k);
    cols[ix + 2] = THREE.MathUtils.lerp(cA.b, cB.b, k);
  }
  basePos = new Float32Array(pos);

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  pMat = new THREE.PointsMaterial({
    size: 0.03,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    vertexColors: true
  });
  particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // Нейтральный свет
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  dir1 = new THREE.DirectionalLight(0xffffff, 0.35);
  dir1.position.set(5, 6, 4);
  scene.add(dir1);
  dir2 = new THREE.DirectionalLight(0xffffff, 0.22);
  dir2.position.set(-6, -4, -3);
  scene.add(dir2);

  clock = new THREE.Clock();

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(e) {
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = (e.clientY / window.innerHeight) * 2 - 1;
  tx = nx * 0.3;
  ty = ny * 0.2;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  // Hue-анимация (плавный круг)
  if (gradAnim.enabled) {
    // Быстрые пресеты насыщенности/яркости
window.setNeonPreset = function(name = 'medium'){
  if (name === 'soft'){
    torusMat.uniforms.uSat.value = 0.45;
    shieldMat.uniforms.uSat.value = 0.45;
    torusMat.uniforms.uGamma.value = 1.04;
    shieldMat.uniforms.uGamma.value = 1.04;
    pMat.color.setHSL(gradAnim.hue, 0.18, 0.70);
  } else if (name === 'vivid'){
    torusMat.uniforms.uSat.value = 0.85;
    shieldMat.uniforms.uSat.value = 0.85;
    torusMat.uniforms.uGamma.value = 1.12;
    shieldMat.uniforms.uGamma.value = 1.12;
    pMat.color.setHSL(gradAnim.hue, 0.35, 0.62);
  } else { // medium (по умолчанию)
    torusMat.uniforms.uSat.value = 0.60;
    shieldMat.uniforms.uSat.value = 0.60;
    torusMat.uniforms.uGamma.value = 1.08;
    shieldMat.uniforms.uGamma.value = 1.08;
    pMat.color.setHSL(gradAnim.hue, 0.55, 0.75);
  }
};

  }

  // Параллакс
  px += (tx - px) * 0.05;
  py += (ty - py) * 0.05;
  camera.position.x = px * 1.2;
  camera.position.y = 1.2 - py * 0.8;
  camera.lookAt(0, 0, 0);

  // Вращение / «дыхание»
  group.rotation.y = t * 0.12 + px * 0.2;
  group.rotation.x = Math.sin(t * 0.2) * 0.06 + py * 0.15;
  const pulse = 1 + Math.sin(t * 1.2) * 0.03;
  group.scale.setScalar(pulse);

  // Мягкое колыхание частиц
  const pos = particles.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const baseY = basePos[i*3 + 1];
    pos.setY(i, baseY + Math.sin(t * 0.8 + seeds[i]) * 0.02);
  }
  pos.needsUpdate = true;

  renderer.render(scene, camera);
}
