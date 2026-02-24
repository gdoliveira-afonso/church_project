import { store } from '../store.js';

// ── Theme ──
export function isDark() { return document.documentElement.classList.contains('dark'); }
export function toggleTheme() {
  const html = document.documentElement;
  html.classList.toggle('dark');
  localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
  // Update all theme toggle icons
  document.querySelectorAll('.theme-icon').forEach(el => { el.textContent = isDark() ? 'light_mode' : 'dark_mode'; });
}

// ── Toast ──
export function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container'), t = document.createElement('div');
  const bg = { success: 'bg-emerald-600', error: 'bg-red-600', warning: 'bg-amber-500', info: 'bg-primary' };
  t.className = `toast ${bg[type] || bg.info} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium mb-2`;
  t.textContent = msg; c.appendChild(t); setTimeout(() => t.remove(), 3000);
}

// ── Modal ──
export function openModal(html) {
  const o = document.getElementById('modal-overlay'), c = document.getElementById('modal-content');
  c.innerHTML = html; o.classList.remove('hidden');
  const close = e => { if (e.target === o) closeModal() };
  o.addEventListener('click', close);
  o._close = close;
}
export function closeModal() {
  const o = document.getElementById('modal-overlay');
  o.classList.add('hidden');
  if (o._close) o.removeEventListener('click', o._close);
}

// ── Sidebar ──
export function updateSidebar(active) {
  const s = document.getElementById('sidebar-links'), u = document.getElementById('sidebar-user');
  if (!s || !store.currentUser) return;
  const tabs = [
    { id: 'home', icon: 'dashboard', label: 'Dashboard', route: '/dashboard', roles: ['ADMIN', 'SUPERVISOR', 'LEADER', 'VICE_LEADER'] },
    { id: 'people', icon: 'group', label: 'Pessoas', route: '/people', roles: ['ADMIN', 'SUPERVISOR', 'LEADER', 'VICE_LEADER'] },
    { id: 'add-person', icon: 'person_add', label: 'Cadastrar Membro', route: '/people/new', roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'cells', icon: 'diversity_3', label: 'Células', route: '/cells', roles: ['ADMIN', 'SUPERVISOR', 'LEADER', 'VICE_LEADER'] },
    { id: 'calendar', icon: 'calendar_month', label: 'Calendário', route: '/calendar', roles: ['ADMIN', 'SUPERVISOR', 'LEADER', 'VICE_LEADER'] },
    { id: 'reports', icon: 'pie_chart', label: 'Relatórios', route: '/reports', roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'forms', icon: 'description', label: 'Formulários', route: '/forms', roles: ['ADMIN'] },
    { id: 'triage', icon: 'assignment', label: 'Triagem', route: '/triage', roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'settings', icon: 'settings', label: 'Configurações', route: '/settings', roles: ['ADMIN'] },
  ].filter(t => t.roles.includes(store.currentUser.role));
  // Auto-detect active from hash if not explicitly set
  if (!active) {
    const hash = (location.hash || '').replace('#', '').split('?')[0];
    const aliases = { '/form-builder': 'forms', '/people/edit': 'people' };
    if (aliases[hash]) { active = aliases[hash]; }
    else {
      // Sort by route length descending so more specific routes match first (e.g. /people/new before /people)
      const sorted = [...tabs].sort((a, b) => b.route.length - a.route.length);
      const match = sorted.find(t => hash === t.route) || sorted.find(t => hash.startsWith(t.route + '/') || (t.route !== '/' && hash.startsWith(t.route)));
      active = match?.id || '';
    }
  }
  s.innerHTML = tabs.map(t => `
    <a href="#${t.route}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${active === t.id ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}">
      <span class="material-symbols-outlined text-[20px] ${active === t.id ? 'filled' : ''}">${t.icon}</span>${t.label}
    </a>`).join('');
  if (u) {
    const themeIcon = isDark() ? 'light_mode' : 'dark_mode';
    u.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">${store.currentUser.name.charAt(0)}</div>
      <div class="flex-1 min-w-0"><p class="text-xs font-semibold truncate">${store.currentUser.name}</p><p class="text-[10px] text-slate-400 truncate">${store.currentUser.email}</p></div>
      <button id="sidebar-theme" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors" title="Alternar tema"><span class="material-symbols-outlined theme-icon text-[18px]">${themeIcon}</span></button>
      <button id="sidebar-logout" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Sair"><span class="material-symbols-outlined text-[18px]">logout</span></button>
    </div>`;
    document.getElementById('sidebar-theme')?.addEventListener('click', toggleTheme);
    document.getElementById('sidebar-logout')?.addEventListener('click', () => {
      store.logout(); document.getElementById('sidebar').classList.add('sidebar-hidden');
      toast('Deslogado com sucesso'); window.location.hash = '/login';
    });
  }
}

// ── Bottom Nav (mobile only) ──
export function bottomNav(active) {
  updateSidebar(active);
  const tabs = [
    { id: 'home', icon: 'dashboard', label: 'Início', route: '/dashboard' },
    { id: 'people', icon: 'group', label: 'Pessoas', route: '/people' },
    { id: 'cells', icon: 'diversity_3', label: 'Células', route: '/cells' },
    { id: 'reports', icon: 'pie_chart', label: 'Relatórios', route: '/reports', roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'settings', icon: 'settings', label: 'Config', route: '/settings', roles: ['ADMIN'] },
  ].filter(t => !t.roles || t.roles.includes(store.currentUser?.role));
  return `<nav class="mobile-nav sticky bottom-0 z-20 bg-white border-t border-slate-200 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2">
    <div class="flex justify-around">${tabs.map(t => `
      <a href="#${t.route}" class="flex flex-col items-center gap-0.5 min-w-[44px] pt-1 ${active === t.id ? 'text-primary' : 'text-slate-400'}">
        <span class="material-symbols-outlined text-[22px] ${active === t.id ? 'filled' : ''}">${t.icon}</span>
        <span class="text-[10px] font-medium">${t.label}</span>
      </a>`).join('')}
    </div>
  </nav>`;
}

// ── Header ──
export function header(title, back = false, right = '') {
  return `<header class="sticky top-0 z-20 flex items-center justify-between bg-white/95 md:bg-white backdrop-blur-md px-4 md:px-6 h-14 border-b border-slate-100 shrink-0">
    ${back ? `<button onclick="history.back()" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 -ml-1"><span class="material-symbols-outlined text-xl">arrow_back</span></button>` : '<div class="w-9 md:hidden"></div>'}
    <h2 class="text-base font-bold text-slate-900 md:text-lg">${title}</h2>
    <div class="flex items-center gap-1">
      <button onclick="window.__toggleTheme?.()" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"><span class="material-symbols-outlined theme-icon text-lg">${isDark() ? 'light_mode' : 'dark_mode'}</span></button>
      ${right || ''}
    </div>
  </header>`;
}
// Expose toggleTheme globally for inline onclick in header
window.__toggleTheme = toggleTheme;

// ── Shared UI helpers ──
export function avatar(name, sz = 'h-10 w-10') {
  const c = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700'];
  const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `<div class="flex ${sz} items-center justify-center rounded-full ${c[name.charCodeAt(0) % c.length]} font-bold text-sm shrink-0">${ini}</div>`;
}

export function badge(text, color = 'blue') {
  const m = { blue: 'bg-blue-50 text-blue-700 ring-blue-600/10', green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10', red: 'bg-red-50 text-red-700 ring-red-600/10', yellow: 'bg-amber-50 text-amber-700 ring-amber-600/10', purple: 'bg-purple-50 text-purple-700 ring-purple-600/10', orange: 'bg-orange-50 text-orange-700 ring-orange-600/10', slate: 'bg-slate-100 text-slate-600 ring-slate-500/10', indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10' };
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ring-inset ${m[color] || m.blue}">${text}</span>`;
}

export function donut(pct, color = 'text-primary', sz = 80) {
  return `<div class="relative" style="width:${sz}px;height:${sz}px">
    <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" stroke-width="3"/>
      <circle class="${color}" cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="${pct} 100" stroke-linecap="round"/>
    </svg>
    <div class="absolute inset-0 flex items-center justify-center"><span class="text-sm font-bold">${pct}%</span></div>
  </div>`;
}

export function statusColor(s) { return { ['Novo Convertido']: 'indigo', Membro: 'green', 'Reconciliação': 'purple' }[s] || 'slate' }
export function riskDot(l) { const c = { low: 'bg-emerald-500', medium: 'bg-amber-400', high: 'bg-red-500' }; return `<span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 ${c[l] || c.low} border-2 border-white rounded-full"></span>` }

// ── Card wrapper for desktop bg ──
export function pageWrap(content, nav) {
  return `<div class="flex-1 overflow-y-auto md:p-6 md:bg-slate-50">${content}</div>${nav}`;
}
