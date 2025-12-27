/**
 * SM Portfolio - Núcleo de la Aplicación (SPA)
 */
const app = {
    // --- CONFIGURACIÓN Y ESTADO ---
    currentLang: localStorage.getItem('lang') || 'es',
    translations: {},
    isMusicPlaying: false,
    currentTrackIndex: 0,
    
    // Tu lista de reproducción personalizada
    playlist: [
        { name: "Lofi Study Beats", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
        { name: "Night Drive Synth", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
        { name: "Linux Terminal Flow", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
    ],

    // --- INICIALIZACIÓN ---
    init: async () => {
        app.applyTheme();
        await app.loadTranslations();
        
        // Carga de componentes estables
        await app.loadComponent('navbar-placeholder', 'navbar');
        
        // Manejo de ruteo inicial
        let path = window.location.pathname.split('/')[1];
        if (!path || path === 'index.html') path = 'home';
        app.loadPage(path, false);

        // SECUENCIA DE REVELACIÓN DEL REPRODUCTOR
        setTimeout(() => {
            // Usamos la traducción cargada en lugar de texto estático
            const msg = app.translations.player.toast_msg;
            app.showMusicToast(msg);
            
            setTimeout(async () => {
                await app.loadComponent('player-placeholder', 'player');
                app.initPlayer();
            }, 4000);
        }, 1000);
    },

    // --- GESTIÓN DE IDIOMAS (i18n) ---
    loadTranslations: async () => {
        try {
            const res = await fetch(`/assets/language/${app.currentLang}.json`);
            app.translations = await res.json();
        } catch (err) {
            console.error("Error cargando traducciones:", err);
        }
    },

    translateDOM: (container = document) => {
        const elements = container.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), app.translations);
            if (text) {
                el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' 
                    ? el.placeholder = text 
                    : el.innerHTML = text;
            }
        });
    },

    toggleLanguage: async () => {
        app.currentLang = app.currentLang === 'es' ? 'en' : 'es';
        localStorage.setItem('lang', app.currentLang);
        await app.loadTranslations();
        app.translateDOM(document.body);
        
        const label = document.getElementById('lang-label');
        if (label) label.innerText = app.currentLang.toUpperCase();
    },

    // --- NAVEGACIÓN Y COMPONENTES ---
    loadPage: async (slug, addToHistory = true) => {
        const contentArea = document.getElementById('main-content');
        try {
            const res = await fetch(`/pages/${slug}.html`);
            if (!res.ok) throw new Error("404");
            
            contentArea.innerHTML = await res.text();
            app.translateDOM(contentArea);
            
            if (addToHistory) {
                const url = slug === 'home' ? '/' : `/${slug}`;
                window.history.pushState({ slug }, slug, url);
            }
            window.scrollTo(0, 0);
        } catch (err) {
            contentArea.innerHTML = `
                <div class="text-center py-20 fade-in">
                    <h2 class="text-4xl font-black text-slate-300">404</h2>
                    <p class="text-slate-500">Página no encontrada</p>
                    <button onclick="app.loadPage('home')" class="mt-4 text-blue-600 font-bold underline">Volver al inicio</button>
                </div>`;
        }
    },

    loadComponent: async (id, file) => {
        const container = document.getElementById(id);
        if (!container) return;
        try {
            const res = await fetch(`/component/${file}.html`);
            container.innerHTML = await res.text();
            app.translateDOM(container);
        } catch (err) {
            console.error(`Error cargando componente ${file}:`, err);
        }
    },

    // --- UI Y TEMAS ---
    applyTheme: () => {
        if (localStorage.getItem('theme') === 'dark' || 
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    },

    toggleTheme: () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    },


    // --- SISTEMA DE AUDIO Y NOTIFICACIONES ---
    showMusicToast: (message) => {
        const toast = document.createElement('div');
        // Eliminamos 'animate-bounce' y usamos 'fade-in-up'
        toast.className = "fixed bottom-8 left-8 z-[110] glass p-4 rounded-2xl border border-blue-500/20 text-sm font-medium fade-in-up toast-shadow flex items-center gap-3";
        toast.innerHTML = `
            <span class="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span class="dark:text-white">${message}</span>
        `;
        document.body.appendChild(toast);
        
        // Iniciar desvanecimiento a los 4.5 segundos
        setTimeout(() => {
            toast.classList.remove('fade-in-up');
            toast.classList.add('fade-out');
            // Eliminar del DOM cuando termine el fade-out
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    },

    closePlayer: () => {
        const player = document.getElementById('floating-player');
        if (player) {
            // Pausar música si se cierra el reproductor
            const audio = document.getElementById('main-audio');
            if (audio) audio.pause();
            
            player.classList.add('fade-out');
            setTimeout(() => player.remove(), 500);
        }
    },
    
    // ... resto de funciones de música ...

    // Actualiza esta función en tu app.js
    initPlayer: () => {
        const audio = document.getElementById('main-audio');
        if (!audio) return;

        // Generar un índice aleatorio basado en el largo de la playlist
        app.currentTrackIndex = Math.floor(Math.random() * app.playlist.length);

        // Cargar la canción elegida al azar
        audio.src = app.playlist[app.currentTrackIndex].url;
        audio.volume = 0.4; // Volumen moderado por defecto
        
        // Actualizar el nombre en la interfaz
        const trackNameEl = document.getElementById('track-name');
        if (trackNameEl) {
            trackNameEl.innerText = app.playlist[app.currentTrackIndex].name;
        }
    },

    toggleMusic: () => {
        const audio = document.getElementById('main-audio');
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        const disk = document.getElementById('player-disk');

        if (app.isMusicPlaying) {
            audio.pause();
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
            disk.classList.remove('rotating');
        } else {
            audio.play();
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            disk.classList.add('rotating');
        }
        app.isMusicPlaying = !app.isMusicPlaying;
    }
};

// --- LISTENERS GLOBALES ---

// Navegación atrás/adelante del navegador
window.onpopstate = (e) => {
    const slug = (e.state && e.state.slug) ? e.state.slug : 'home';
    app.loadPage(slug, false);
};

// Barra de progreso de lectura (Navbar)
window.onscroll = () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const bar = document.getElementById("scroll-bar");
    if (bar) bar.style.width = scrolled + "%";
};

// Arrancar app
document.addEventListener('DOMContentLoaded', app.init);