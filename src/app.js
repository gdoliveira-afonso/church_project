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
route('/reports', roleGuard(['ADMIN', 'SUPERVISOR'], reportsView));
route('/settings', roleGuard(['ADMIN', 'SUPERVISOR'], settingsView));
route('/forms', roleGuard(['ADMIN', 'SUPERVISOR'], formListView));
route('/form-builder', roleGuard(['ADMIN', 'SUPERVISOR'], formBuilderView));
route('/triage', roleGuard(['ADMIN', 'SUPERVISOR'], triageView));
route('/calendar', guard(calendarView));

startRouter();

// Garante que a tela seja recarregada assim que as informações chegarem do servidor remoto
window.addEventListener('store-data-loaded', () => {
    // Força o router a renderizar a página atual novamente agora que o Store tem dados
    window.dispatchEvent(new Event('hashchange'));
});
