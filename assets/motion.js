// motion.js — лёгкие анимации на Motion One (официальная web-библиотека от Framer)
import { animate } from "https://cdn.jsdelivr.net/npm/@motionone/dom/+esm";

// Плавное появление элемента (со смещением)
export function reveal(el, { x = 0, y = 8, delay = 0 } = {}) {
    animate(
        el,
        { opacity: [0, 1], transform: [`translate(${x}px, ${y}px)`, `translate(0,0)`] },
        { duration: 0.25, easing: [0.22, 1, 0.36, 1], delay }
    );
}

// (Опционально) пульсация индикатора «печатает…»
export function typing(el) {
    animate(el, { transform: ["scale(0.9)", "scale(1.0)"] }, { duration: 0.8, repeat: Infinity, direction: "alternate" });
}

// Каскад для группы элементов
export function cascade(container) {
    const items = Array.from(container.children);
    items.forEach((item, i) => reveal(item, { y: 6, delay: i * 0.04 }));
}

// Экспортим в глобал для app.js
window.MotionFX = { reveal, typing, cascade };
