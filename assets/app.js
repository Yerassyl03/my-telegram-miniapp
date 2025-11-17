// app.js — чат + панель угроз + модалка плейбука
const chat = document.getElementById('chat');
const input = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const topicsBox = document.getElementById('topics');
const showThreats = document.getElementById('showThreats');
const showHacked = document.getElementById('showHacked');
const langButtons = document.querySelectorAll('.lang-switch button');

// Drawer elements
const drawer = document.getElementById('threatsDrawer');
const drawerClose = document.getElementById('drawerClose');
const threatsListEl = document.getElementById('threatsList');
const drawerTitle = document.getElementById('drawerTitle');

// Modal elements
const modal = document.getElementById('playbookModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const roadmapSteps = document.getElementById('roadmapSteps');

let LANG = 'ru';

function addMsg(text, who = 'bot') {
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  const shift = who === 'user' ? 10 : -10;
  window.MotionFX?.reveal(div, { x: shift, y: 0 });
}

async function callApi(action, payload = {}) {
  const res = await fetch('api.php?action=' + encodeURIComponent(action), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, lang: LANG })
  });
  return await res.json();
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  addMsg(text, 'user');
  input.value = '';
  const data = await callApi('chat', { message: text });
  addMsg(data.reply, 'bot');
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

async function loadTopics() {
  const data = await callApi('topics', {});
  topicsBox.innerHTML = '';
  data.topics.forEach(t => {
    const b = document.createElement('button');
    b.className = 'topic-btn';
    b.innerText = t.title;
    b.addEventListener('click', async () => {
      addMsg(t.prompt, 'user');
      const res = await callApi('chat', { message: t.prompt });
      addMsg(res.reply, 'bot');
    });
    topicsBox.appendChild(b);
  });
}

/* ===== Drawer logic ===== */
function openDrawer(){ drawer.classList.add('open'); drawer.classList.remove('hidden'); drawer.setAttribute('aria-hidden','false'); }
function closeDrawer(){ drawer.classList.remove('open'); setTimeout(()=>drawer.classList.add('hidden'), 260); drawer.setAttribute('aria-hidden','true'); }
drawerClose.addEventListener('click', closeDrawer);

const PROMPTS = {
  phishing: {
    ru: 'Как распознать фишинг и что делать, если пришло подозрительное письмо?',
    kz: 'Фишингті қалай тануға болады және күдікті хат келсе не істеу керек?'
  },
  weak_passwords: {
    ru: 'Как выбрать надёжный пароль и включить 2FA для важных аккаунтов?',
    kz: 'Маңызды аккаунттар үшін сенімді құпиясөзді қалай таңдап, 2FA қалай қосамын?'
  },
  public_wifi: {
    ru: 'Опасно ли входить в аккаунты в общественном Wi-Fi и как защититься?',
    kz: 'Қоғамдық Wi-Fi арқылы аккаунтқа кіру қаншалықты қауіпті және қалай қорғанамын?'
  }
  // остальные при необходимости добавишь
};

showThreats.addEventListener('click', async () => {
  const data = await callApi('threats', {});
  threatsListEl.innerHTML = '';
  const items = data.items || [];
  if (!items.length){
    const empty = document.createElement('div');
    empty.className = 'no-items';
    empty.innerText = LANG === 'ru' ? 'Нет данных' : 'Мәлімет жоқ';
    threatsListEl.appendChild(empty);
  } else {
    items.forEach((it, idx) => {
      const askLabel   = LANG==='ru' ? 'Спросить бота' : 'Сұрау';
      const pasteLabel = LANG==='ru' ? 'Вставить совет' : 'Кеңесті енгізу';
      const card = document.createElement('div');
      card.className = 'threat-item';
      card.dataset.id = it.id;
      card.dataset.title = it.title;
      card.dataset.advice = it.advice;
      card.innerHTML = `
        <div class="name"><i class="fa-solid fa-triangle-exclamation"></i> ${it.title}</div>
        <div class="adv">${it.advice}</div>
        <div class="meta"><i class="fa-regular fa-lightbulb"></i> ${LANG==='ru'?'Совет':'Кеңес'} • #${idx+1}</div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn btn-primary sm ask"><i class="fa-regular fa-comment-dots"></i> ${askLabel}</button>
          <button class="btn btn-secondary sm paste"><i class="fa-regular fa-clipboard"></i> ${pasteLabel}</button>
        </div>
      `;
      threatsListEl.appendChild(card);
    });
  }
  drawerTitle.innerText = LANG==='ru' ? 'Топ-10 угроз' : 'Топ-10 қауіп';
  openDrawer();
});

// делегирование: кнопки «Спросить» / «Вставить совет» внутри правой панели
threatsListEl.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button');
  if (!btn) return;
  const card = e.target.closest('.threat-item');
  if (!card) return;
  const id = card.dataset.id;
  const title = card.dataset.title;
  const advice = card.dataset.advice;

  if (btn.classList.contains('ask')) {
    const prompt = (PROMPTS[id]?.[LANG]) || (LANG==='ru' ? `Дай советы по теме: ${title}` : `Осы тақырып бойынша кеңес бер: ${title}`);
    addMsg(prompt, 'user');
    const res = await callApi('chat', { message: prompt });
    addMsg(res.reply, 'bot');
  }

  if (btn.classList.contains('paste')) {
    const text = `${title} — ${advice}`;
    addMsg(text, 'bot');
  }
});

/* ===== Modal (playbook) logic ===== */
function openModal(){ modal.classList.remove('hidden'); requestAnimationFrame(()=> modal.classList.add('show')); modal.setAttribute('aria-hidden','false'); }
function closeModal(){ modal.classList.remove('show'); setTimeout(()=> modal.classList.add('hidden'), 250); modal.setAttribute('aria-hidden','true'); }
modalBackdrop.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ closeModal(); closeDrawer(); } });

showHacked.addEventListener('click', async () => {
  const data = await callApi('playbook', { id: 'account_hacked' });
  roadmapSteps.innerHTML = '';
  const steps = Array.isArray(data.steps) ? data.steps : [];
  if (!steps.length){
    const li = document.createElement('li');
    li.innerText = LANG==='ru' ? 'Нет шагов' : 'Қадамдар жоқ';
    roadmapSteps.appendChild(li);
  } else {
    steps.forEach((s,i)=>{
      const li = document.createElement('li');
      li.innerText = `${i+1}. ${s}`;
      roadmapSteps.appendChild(li);
      window.MotionFX?.reveal(li, { y: 8, delay: i*0.05 });
    });
  }
  modalTitle.innerText = (data.title ?? (LANG==='ru'?'План действий':'Әрекет жоспары'));
  openModal();
});

/* ===== Language switch ===== */
langButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    langButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    LANG = btn.dataset.lang;
    document.getElementById('topicsTitle').innerText = LANG === 'ru' ? 'Темы' : 'Тақырыптар';
    document.getElementById('top10Title').innerText = LANG === 'ru' ? 'Топ-10 угроз' : 'Топ-10 қауіп';
    document.getElementById('playbookTitle').innerText = LANG === 'ru' ? 'Если взломали аккаунт' : 'Аккаунт бұзылса';
    // локализация уже открытых UI
    drawerTitle.innerText = LANG==='ru' ? 'Топ-10 угроз' : 'Топ-10 қауіп';
    loadTopics();
  });
});

/* ===== First load ===== */
addMsg('Сәлем! / Привет! Мен киберқауіпсіздік бойынша кеңес беремін. Сұрағыңызды жазыңыз немесе слева выберите тему.', 'bot');
loadTopics();
