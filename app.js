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
        // 1. Cambiar el idioma y cargar las nuevas traducciones
        app.currentLang = app.currentLang === 'es' ? 'en' : 'es';
        localStorage.setItem('lang', app.currentLang);
        await app.loadTranslations();

        // 2. Traducir el DOM estático (Navbar, Footer, etc.)
        app.translateDOM(document.body);

        // 3. ACTUALIZACIÓN DINÁMICA:
        // Detectamos en qué página estamos para re-renderizar si es necesario
        const path = window.location.pathname.split('/')[1] || 'home';
        
        if (path === 'experiencia' || path === 'experience') {
            app.renderExperience();
        }

        if (path === 'formacion' || path === 'formation') app.renderFormation();

        // Actualizar la etiqueta del botón de idioma
        const label = document.getElementById('lang-label');
        if (label) label.innerText = app.currentLang.toUpperCase();
    },

        // --- NAVEGACIÓN Y COMPONENTES ---
    loadPage: async (slug, addToHistory = true) => {
        const contentArea = document.getElementById('main-content');
        try {
            const res = await fetch(`/pages/${slug}.html`);
            if (!res.ok) throw new Error("404");
            
            // 1. Inyectamos el HTML base de la página
            contentArea.innerHTML = await res.text();
            
            // 2. Traducimos las etiquetas estáticas (títulos, placeholders, etc.)
            app.translateDOM(contentArea);
            
            // 3. LÓGICA ESPECÍFICA: Si la página es experiencia, disparamos el renderizado dinámico
            if (slug === 'experiencia' || slug === 'experience') app.renderExperience();
            if (slug === 'formacion' || slug === 'formation') app.renderFormation();
            // 4. Manejo del historial y URL
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
    },

   renderExperience: () => {
    const container = document.getElementById('experience-list');
    const searchInput = document.getElementById('experience-search');
    
    // Aseguramos que use app.translations (la variable donde guardas el JSON)
    const data = app.translations.experience;

    if (!container || !data) return;

    const drawList = (filteredData) => {
        container.innerHTML = filteredData.map(exp => `
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300">
                <button onclick="this.parentElement.classList.toggle('is-open')" 
                        class="w-full flex items-center justify-between p-5 text-left group">
                    <div class="flex items-center gap-4">
                        <div class="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                            ${app.getExpIcon(exp.type)}
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-900 dark:text-white">${exp.position}</h3>
                            <p class="text-sm text-slate-500">${exp.init_time} — ${exp.end_time}</p>
                        </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform transition-transform group-[.is-open]:rotate-180 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                <div class="max-h-0 overflow-hidden transition-all duration-500 ease-in-out [[.is-open]_&]:max-h-[500px]">
                    <div class="p-5 pt-0 border-t border-slate-100 dark:border-slate-700/50">
                        <p class="text-blue-500 font-medium mb-2 mt-4">${exp.empresa}</p>
                        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                            ${exp.comentarios_personales}
                        </p>
                        <div class="flex flex-wrap gap-2">
                            ${exp.tags.map(tag => `<span class="px-2 py-1 text-xs border border-blue-500/30 text-blue-500 rounded-md">${tag}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    };

        // Buscador
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = data.filter(exp => 
                    exp.position.toLowerCase().includes(query) || 
                    exp.empresa.toLowerCase().includes(query) ||
                    exp.tags.some(t => t.toLowerCase().includes(query))
                );
                drawList(filtered);
            });
        }

        drawList(data);
    },

    getExpIcon: (type) => {
        const icons = {
            infra: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>`,
            dev: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`,
            mgmt: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>`,
            edu: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>`
        };
        return icons[type] || icons.dev;
    },

    // --- DENTRO DEL OBJETO APP ---

    renderFormation: () => {
        const container = document.getElementById('formation-list');
        const searchInput = document.getElementById('formation-search');
        const data = app.translations.formation;

        if (!container || !data) return;

        const drawList = (filteredData) => {
            container.innerHTML = filteredData.map(item => `
                <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300">
                    <button onclick="this.parentElement.classList.toggle('is-open')" 
                            class="w-full flex items-center justify-between p-5 text-left group">
                        <div class="flex items-center gap-4">
                            <div class="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                                ${app.getFormationIcon(item.type)}
                            </div>
                            <div>
                                <h3 class="font-bold text-slate-900 dark:text-white">${item.position}</h3>
                                <p class="text-sm text-slate-500">${item.init_time} — ${item.end_time}</p>
                            </div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform transition-transform group-[.is-open]:rotate-180 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <div class="max-h-0 overflow-hidden transition-all duration-500 ease-in-out [[.is-open]_&]:max-h-[500px]">
                        <div class="p-5 pt-0 border-t border-slate-100 dark:border-slate-700/50">
                            <p class="text-indigo-500 font-medium mb-2 mt-4">${item.empresa}</p>
                            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                                ${item.comentarios_personales}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');
        };

        // Buscador de formación
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = data.filter(f => 
                    f.position.toLowerCase().includes(query) || 
                    f.empresa.toLowerCase().includes(query)
                );
                drawList(filtered);
            });
        }

        drawList(data);
    },

    getFormationIcon: (type) => {
        const icons = {
            degree: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>`,
            cert: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"></path></svg>`
        };
        return icons[type] || icons.degree;
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