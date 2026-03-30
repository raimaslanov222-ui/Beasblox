/**
 * GameHub Ultimate v21.0 - INSTANT LAUNCH EDITION
 * ---------------------------------------------------
 * ИСПРАВЛЕНО: Убрано лишнее меню "Подробнее". Игра стартует сразу.
 * ИСПРАВЛЕНО: Выход из игры возвращает прямо в общий список.
 * СЕССИЯ: Авто-восстановление при любом сбое.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getFirestore, collection, getDocs, addDoc, deleteDoc, doc, 
    query, orderBy, serverTimestamp, limit 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    onAuthStateChanged, signOut, setPersistence, browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDQ606KVlyeht2_AoXbxokzunjZ-HlQ9S4",
    authDomain: "gamehub-ec5ba.firebaseapp.com",
    projectId: "gamehub-ec5ba",
    storageBucket: "gamehub-ec5ba.firebasestorage.app",
    messagingSenderId: "934365000432",
    appId: "1:934365000432:web:f08bdb85b4833a63340835"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

const MASTER_MAIL = "raimaslanov222@gmail.com";
let gamesCache = [];

// --- 1. УВЕДОМЛЕНИЯ ---
window.hubNotify = (m, isErr = false) => {
    const t = document.getElementById('top-loader');
    const txt = document.getElementById('loader-text');
    if (!t || !txt) return;
    txt.innerText = m;
    t.style.borderLeft = isErr ? "4px solid #ff0055" : "4px solid #00f2ff";
    t.classList.add('active');
    setTimeout(() => t.classList.remove('active'), 2500);
};

// --- 2. СИСТЕМА БЕССМЕРТНОЙ СЕССИИ ---
const saveUser = (e, p) => {
    localStorage.setItem('gh_mail', e);
    localStorage.setItem('gh_pass', p);
};

window.autoLogin = async () => {
    const e = localStorage.getItem('gh_mail');
    const p = localStorage.getItem('gh_pass');
    if (!auth.currentUser && e && p) {
        try {
            await signInWithEmailAndPassword(auth, e, p);
            window.hubNotify("Сессия восстановлена");
        } catch (err) { localStorage.removeItem('gh_pass'); }
    }
};

// --- 3. АВТОРИЗАЦИЯ ---
window.executeLogin = async () => {
    const e = document.getElementById('auth-email')?.value.trim();
    const p = document.getElementById('auth-pass')?.value.trim();
    if (!e || !p) return window.hubNotify("Заполни поля", true);
    try {
        await signInWithEmailAndPassword(auth, e, p);
        saveUser(e, p);
        window.closeModals();
        window.hubNotify("Вход выполнен");
    } catch (err) { window.hubNotify("Ошибка входа", true); }
};

window.executeRegister = async () => {
    const e = document.getElementById('auth-email')?.value.trim();
    const p = document.getElementById('auth-pass')?.value.trim();
    if (p.length < 6) return window.hubNotify("Пароль < 6 символов", true);
    try {
        await createUserWithEmailAndPassword(auth, e, p);
        saveUser(e, p);
        window.closeModals();
        window.hubNotify("Аккаунт создан");
    } catch (err) { window.hubNotify("Ошибка регистрации", true); }
};

window.logout = async () => {
    if (confirm("Выйти?")) {
        localStorage.clear();
        await signOut(auth);
        window.hubNotify("Вы вышли");
    }
};

// --- 4. НАБЛЮДАТЕЛЬ ЗА АККАУНТОМ ---
onAuthStateChanged(auth, (u) => {
    const btn = document.getElementById('auth-btn');
    const adm = document.getElementById('admin-open-btn');
    const info = document.getElementById('user-info');
    if (u) {
        if (info) info.innerText = "ONLINE";
        if (btn) { btn.innerHTML = "🚪 ВЫЙТИ"; btn.onclick = window.logout; }
        if (u.email === MASTER_MAIL && adm) adm.style.display = "flex";
    } else {
        if (info) info.innerText = "ГОСТЬ";
        if (btn) { btn.innerHTML = "👤 ВОЙТИ"; btn.onclick = () => document.getElementById('auth-modal').style.display='flex'; }
        if (adm) adm.style.display = "none";
        window.autoLogin();
    }
    loadGames();
});

// --- 5. ДВИЖОК ИГР (МГНОВЕННЫЙ ЗАПУСК) ---
async function loadGames() {
    const container = document.getElementById('game-container');
    if (!container) return;
    try {
        const snap = await getDocs(query(collection(db, "games"), orderBy("createdAt", "desc"), limit(50)));
        container.innerHTML = "";
        gamesCache = [];
        snap.forEach(d => {
            const g = d.data();
            gamesCache.push({id: d.id, ...g});
            const card = document.createElement('div');
            card.className = 'game-card glass-effect';
            card.innerHTML = `
                <div style="font-size:60px; pointer-events:none;">${g.emoji || '🎮'}</div>
                <h3 style="pointer-events:none;">${g.title}</h3>
                ${auth.currentUser?.email === MASTER_MAIL ? `<button class="del-btn-glass" onclick="event.stopPropagation(); window.delGame('${d.id}')">🗑️</button>` : ''}
            `;
            // НАЖАТИЕ СРАЗУ ЗАПУСКАЕТ ИГРУ
            card.onclick = () => window.launchDirect(d.id);
            container.appendChild(card);
        });
    } catch (e) { container.innerHTML = "Ошибка загрузки"; }
}

window.launchDirect = (id) => {
    const game = gamesCache.find(x => x.id === id);
    if (!game) return;
    
    window.hubNotify("Запуск " + game.title);
    
    const layer = document.createElement('div');
    layer.id = "instant-runtime";
    layer.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:999999;display:flex;flex-direction:column;";
    layer.innerHTML = `
        <div style="padding:15px; background:#0a0a0a; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222;">
            <b style="color:#00f2ff; text-transform:uppercase; font-size:12px;">${game.title}</b>
            <button class="glass-btn action" style="width:auto; padding:5px 15px;" id="kill-game">✕ ВЫЙТИ В МЕНЮ</button>
        </div>
        <iframe id="g-frame" style="width:100%; flex-grow:1; border:none; background:#fff;"></iframe>
    `;
    document.body.appendChild(layer);

    // ВЫХОД СРАЗУ В ГЛАВНОЕ МЕНЮ
    document.getElementById('kill-game').onclick = () => {
        document.getElementById('instant-runtime').remove();
        window.autoLogin(); // Проверка сессии на всякий случай
    };

    const d = document.getElementById('g-frame').contentWindow.document;
    d.open(); d.write(game.htmlContent); d.close();
};

// --- 6. УТИЛИТЫ ---
window.closeModals = () => {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
};

window.delGame = async (id) => {
    if (confirm("Удалить игру?")) { await deleteDoc(doc(db, "games", id)); loadGames(); }
};

window.openAdmin = () => document.getElementById('admin-panel').style.display = 'flex';

window.saveGame = async () => {
    const t = document.getElementById('game-title').value;
    const c = document.getElementById('game-code').value;
    if (!t || !c) return window.hubNotify("Название и код!", true);
    await addDoc(collection(db, "games"), {
        title: t, htmlContent: c, emoji: document.getElementById('game-emoji').value || "🎮",
        description: document.getElementById('game-desc-input').value || "", createdAt: serverTimestamp()
    });
    window.closeModals();
    loadGames();
};

document.addEventListener('DOMContentLoaded', () => {
    const bind = (id, f) => {
        const e = document.getElementById(id);
        if (e) { e.onclick = f; e.ontouchend = (ev) => { ev.preventDefault(); f(); }; }
    };
    bind('login-btn', window.executeLogin);
    bind('register-btn', window.executeRegister);
    bind('save-game', window.saveGame);
    bind('admin-open-btn', window.openAdmin);
});

window.autoLogin();
      
