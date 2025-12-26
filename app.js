// app.js
const app = {
    currentLang: localStorage.getItem('lang') || 'es',
    translations: {},

    init: async () => {
        app.applyTheme();
        await app.loadTranslations();
        
        // Cargamos la navegación primero
        await app.loadComponent('navbar-placeholder', 'navbar');
        
        // Manejo de ruteo inicial: si es "/" cargamos "home"
        let path = window.location.pathname.split('/')[1];
        if (!path || path === 'index.html') path = 'home';
        
        app.loadPage(path, false); // false para no duplicar el history en el primer load
    },

    loadTranslations: async () => {
        try {
            const res = await fetch(`/assets/language/${app.currentLang}.json`);
            app.translations = await res.json();
        } catch (err) {
            console.error("Error loading translations", err);
        }
    },

    translateDOM: (container = document) => {
        const elements = container.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), app.translations);
            if (text) {
                el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el.placeholder = text : el.innerHTML = text;
            }
        });
    },

    toggleLanguage: async () => {
        app.currentLang = app.currentLang === 'es' ? 'en' : 'es';
        localStorage.setItem('lang', app.currentLang);
        await app.loadTranslations();
        
        // Traducir toda la página actual
        app.translateDOM(document.body);
        
        // Actualizar el label del botón en la navbar si existe
        const label = document.getElementById('lang-label');
        if (label) label.innerText = app.currentLang.toUpperCase();
    },

    loadPage: async (slug, addToHistory = true) => {
        const contentArea = document.getElementById('main-content');
        try {
            const res = await fetch(`/pages/${slug}.html`);
            if (!res.ok) throw new Error("Page not found");
            
            const html = await res.text();
            contentArea.innerHTML = html;
            
            // Traducir el contenido recién inyectado
            app.translateDOM(contentArea);
            
            if (addToHistory) {
                window.history.pushState({ slug }, slug, `/${slug}`);
            }
            
            // Hacer scroll al inicio al cambiar de página
            window.scrollTo(0, 0);
        } catch (err) {
            contentArea.innerHTML = `<div class="text-center py-20"><h2 class="text-2xl font-bold">404</h2><p>Page not found</p></div>`;
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
            console.error(`Error loading component: ${file}`, err);
        }
    },

    toggleTheme: () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    },

    applyTheme: () => {
        if (localStorage.getItem('theme') === 'dark' || 
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    }
};

// Escuchar navegación hacia atrás/adelante del navegador
window.onpopstate = (e) => {
    if (e.state && e.state.slug) app.loadPage(e.state.slug, false);
};

document.addEventListener('DOMContentLoaded', app.init);