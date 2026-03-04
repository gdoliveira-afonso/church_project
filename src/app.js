import { store } from './store.js';
import { route, startRouter, navigate } from './router.js';
import { loginView } from './views/login.js';
import { dashboardView } from './views/dashboard.js';
import { peopleView, personFormView } from './views/people.js';
import { profileView } from './views/profile.js';
import { cellsView, cellDetailView } from './views/cells.js';
import { attendanceView } from './views/attendance.js';
import { reportsView } from './views/reports.js';
import { settingsView, triageView } from './views/settings.js';
import { publicFormView } from './views/public-form.js';
import { formListView, formBuilderView } from './views/form-builder.js';
import { calendarView } from './views/calendar.js';
import { generationsView } from './views/generations.js';

function restoreTheme() { const t = localStorage.getItem('theme'); if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) { document.documentElement.classList.add('dark'); } }
function guard(fn) { return (p) => { if (!store.isLoggedIn()) { navigate('/login'); return } restoreTheme(); fn(p) } }
function roleGuard(roles, fn) { return (p) => { if (!store.isLoggedIn()) { navigate('/login'); return } if (!store.hasRole(...roles)) { navigate('/dashboard'); return } restoreTheme(); fn(p) } }

route('/login', loginView);
route('/form/public', publicFormView);
route('/f', publicFormView);
route('/dashboard', guard(dashboardView));
route('/people', guard(peopleView));
route('/people/new', roleGuard(['ADMIN', 'SUPERVISOR'], () => personFormView({ id: 'new' })));
route('/people/edit', roleGuard(['ADMIN', 'SUPERVISOR'], personFormView));
route('/profile', guard(profileView));
route('/cells', guard(cellsView));
route('/cell', guard(cellDetailView));
route('/attendance', guard(attendanceView));
route('/reports', roleGuard(['ADMIN', 'SUPERVISOR', 'LIDER_GERACAO'], reportsView));
route('/settings', roleGuard(['ADMIN', 'SUPERVISOR'], settingsView));
route('/forms', roleGuard(['ADMIN', 'SUPERVISOR'], formListView));
route('/form-builder', roleGuard(['ADMIN', 'SUPERVISOR'], formBuilderView));
route('/triage', roleGuard(['ADMIN', 'SUPERVISOR', 'LIDER_GERACAO'], triageView));
route('/generations', roleGuard(['ADMIN', 'SUPERVISOR'], generationsView));
route('/calendar', guard(calendarView));

window.addEventListener('system-settings-loaded', () => {
    const s = store.systemSettings;
    if (!s) return;

    // Sidebar update if exists
    const titleEl = document.querySelector('#sidebar .text-sm.font-bold');
    if (titleEl && s.appName) titleEl.textContent = s.appName;

    const logoEl = document.querySelector('#sidebar .w-9.h-9');
    if (logoEl && s.logoUrl) {
        logoEl.innerHTML = `<img src="${s.logoUrl}" alt="${s.appName}" class="max-h-full max-w-full rounded-lg" />`;
    }
});

startRouter();
// Função global que remove a Splash Screen de forma segura
window.__removeSplashScreen = function () {
    if (!document.body.classList.contains('app-ready')) {
        document.body.classList.add('app-ready');
    }
};

window.addEventListener('store-data-loaded', () => {
    window.dispatchEvent(new Event('hashchange'));
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(window.__removeSplashScreen);
    } else {
        setTimeout(window.__removeSplashScreen, 300);
    }
});

if (!store.isLoggedIn()) {
    const isPublicRoute = window.location.hash.startsWith('#/f');
    if (!isPublicRoute) {
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(window.__removeSplashScreen);
        } else {
            window.addEventListener('load', window.__removeSplashScreen);
        }
    }
}

