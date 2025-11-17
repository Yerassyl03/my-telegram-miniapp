<?php
// index.php — страница с чатом (RU/KZ), чистый JS + Three.js фон + Font Awesome
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CyberSafe Coach — Веб-чат</title>

  <!-- Font Awesome 6 (иконки) -->
  <link rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      crossorigin="anonymous" referrerpolicy="no-referrer">


  <link rel="stylesheet" href="assets/style.css">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath fill='%2300e5ff' d='M32 6l22 13v26L32 58 10 45V19z'/%3E%3Cpath fill='%2300ff99' d='M32 14l14 8v20l-14 8-14-8V22z'/%3E%3C/svg%3E">
</head>
<body>
  <header class="app-header">
    <div class="brand">
      <i class="fa-solid fa-shield-halved"></i>
      <span>CyberSafe Coach</span>
    </div>

    <div class="header-actions">
      <div class="lang-switch" role="group" aria-label="Переключение языка">
        <button data-lang="ru" class="btn btn-ghost active"><i class="fa-solid fa-globe"></i> RU</button>
        <button data-lang="kz" class="btn btn-ghost"><i class="fa-solid fa-globe"></i> KZ</button>
      </div>
    </div>
  </header>

  <main class="wrap">
    <aside class="sidebar">
      <h3 id="topicsTitle" class="sidebar-title"><i class="fa-solid fa-list-check"></i> Темы</h3>
      <div id="topics" class="topics"></div>

      <div class="card">
        <h4 id="top10Title" class="card-title"><i class="fa-solid fa-bolt"></i> Топ-10 угроз</h4>
        <button id="showThreats" class="btn btn-primary"><i class="fa-solid fa-shield-virus"></i> Показать</button>
      </div>

      <div class="card">
        <h4 id="playbookTitle" class="card-title"><i class="fa-solid fa-user-shield"></i> Если взломали аккаунт</h4>
        <button id="showHacked" class="btn btn-secondary"><i class="fa-solid fa-list"></i> План действий</button>
      </div>
    </aside>

    <section class="chat-section">
      <div id="chat" class="chat" aria-live="polite"></div>

      <div class="composer">
        <div class="input-wrap">
          <i class="fa-regular fa-message input-icon"></i>
          <input id="userInput" placeholder="Сұрақ / Вопрос..." autocomplete="off" />
        </div>
        <button id="sendBtn" class="btn btn-primary">
          <i class="fa-solid fa-paper-plane"></i>
          Отправить
        </button>
      </div>
    </section>
  </main>

  <footer class="app-footer">
    <small><i class="fa-solid fa-circle-info"></i> Для срочных случаев обратитесь к классному руководителю/ИТ-админу.</small>
  </footer>

    <!-- Drawer: Threats Panel -->
  <aside id="threatsDrawer" class="drawer hidden" aria-hidden="true">
    <div class="drawer-header">
      <div class="title">
        <i class="fa-solid fa-shield-virus"></i>
        <span id="drawerTitle">Топ-10 угроз</span>
      </div>
      <button id="drawerClose" class="btn btn-ghost sm" aria-label="Закрыть">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div id="threatsList" class="drawer-body">
      <!-- сюда JS отрисует список угроз -->
    </div>
  </aside>

  <!-- Modal: Playbook Roadmap -->
  <div id="playbookModal" class="modal hidden" aria-hidden="true" role="dialog" aria-modal="true">
    <div class="modal-backdrop" id="modalBackdrop"></div>
    <div class="modal-card" role="document">
      <div class="modal-header">
        <div class="title">
          <i class="fa-solid fa-user-shield"></i>
          <span id="modalTitle">План действий</span>
        </div>
        <button id="modalClose" class="btn btn-ghost sm" aria-label="Закрыть">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Анимированная линия-роадмап -->
      <div class="roadmap">
        <svg class="roadmap-line" viewBox="0 0 4 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="glow" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0.25"/>
            </linearGradient>
          </defs>
          <path d="M2 0 L2 100" stroke="url(#glow)" stroke-width="2" fill="none"
                class="roadmap-stroke"/>
        </svg>
        <ol id="roadmapSteps" class="roadmap-steps">
          <!-- сюда JS вставит <li> шаги -->
        </ol>
      </div>
    </div>
  </div>


  <!-- 3D background (Three.js) -->
  <script type="module" src="assets/bg.js"></script>
  <!-- Анимации (Motion One) как ES-модуль -->
  <script type="module" src="assets/motion.js"></script>
  <!-- Приложение -->
  <script src="assets/app.js"></script>
</body>
</html>
