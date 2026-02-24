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

function guard(fn) { return (p) => { if (!store.isLoggedIn()) { navigate('/login'); return } fn(p) } }
function roleGuard(roles, fn) { return (p) => { if (!store.isLoggedIn()) { navigate('/login'); return } if (!store.hasRole(...roles)) { navigate('/dashboard'); return } fn(p) } }

route('/login', loginView);
route('/form/public', publicFormView);
route('/dashboard', guard(dashboardView));
route('/people', guard(peopleView));
route('/people/new', roleGuard(['ADMIN', 'SUPERVISOR'], () => personFormView({ id: 'new' })));
route('/people/edit', roleGuard(['ADMIN', 'SUPERVISOR'], personFormView));
route('/profile', guard(profileView));
route('/cells', guard(cellsView));
route('/cell', guard(cellDetailView));
route('/attendance', guard(attendanceView));
route('/reports', guard(reportsView));
route('/settings', guard(settingsView));
route('/forms', guard(formListView));
route('/settings', guard(settingsView));
route('/forms', guard(formListView));
route('/form-builder', guard(formBuilderView));
route('/triage', guard(triageView));
route('/calendar', guard(calendarView));

startRouter();
