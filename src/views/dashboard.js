import { store } from '../store.js';
import { bottomNav, badge, isDark, toggleTheme } from '../components/ui.js';

export function dashboardView() {
  const app = document.getElementById('app');
  const m = store.getMetrics(), u = store.currentUser;
  app.innerHTML = `
  <header class="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 md:px-6 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="relative"><div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">${u.name.charAt(0)}</div><div class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></div></div>
        <div><p class="text-[11px] font-medium text-slate-400">Bom dia,</p><h1 class="text-sm font-bold text-slate-900 leading-tight">${u.name}</h1></div>
      </div>
      <div class="flex items-center gap-1">
        <button id="header-theme" class="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"><span class="material-symbols-outlined theme-icon text-xl">${isDark() ? 'light_mode' : 'dark_mode'}</span></button>
        <button class="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"><span class="material-symbols-outlined text-xl">notifications</span></button>
      </div>
    </div>
  </header>
  <div class="flex-1 overflow-y-auto">
    <div class="px-4 md:px-6 lg:px-10 py-5 space-y-6 max-w-7xl mx-auto w-full">
      <section>
        <div class="flex items-center justify-between mb-3"><h2 class="text-base font-bold md:text-lg">Visão Geral</h2>${badge('Hoje', 'blue')}</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          ${kpi('groups', 'Total Membros', m.total, `${m.newConverts} novos`, 'blue')}
          ${kpi('diversity_3', 'Células Ativas', m.cells, `${store.people.filter(p => !p.cellId).length} sem célula`, 'indigo')}
          ${kpi('water_drop', 'Batizados', m.waterBaptism + '%', `${m.total - Math.round(m.waterBaptism * m.total / 100)} pendentes`, 'sky')}
          ${kpi('volunteer_activism', 'Encontros', m.encounter + '%', `${m.total - Math.round(m.encounter * m.total / 100)} pendentes`, 'emerald')}
        </div>
      </section>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section>
          <h3 class="text-base font-bold mb-3">Ação Requerida</h3>
          <div class="space-y-3">
            ${m.noVisit60 ? actionCard('person_alert', 'orange', 'Sem Visita > 60 dias', `<b>${m.noVisit60}</b> pessoas sem visita pastoral recente.`, 'Urgente') : ''}
            ${m.total - Math.round(m.waterBaptism * m.total / 100) ? actionCard('water_drop', 'blue', 'Pendentes de Batismo', `<b>${m.total - Math.round(m.waterBaptism * m.total / 100)}</b> pessoas não batizadas.`) : ''}
            ${m.reconciliations ? actionCard('handshake', 'purple', 'Reconciliações', `<b>${m.reconciliations}</b> em acompanhamento.`, 'Novo') : ''}
            ${!m.total ? '<div class="text-center py-8 bg-white rounded-xl border border-slate-100"><span class="material-symbols-outlined text-3xl text-slate-200 mb-2">inbox</span><p class="text-sm text-slate-400">Nenhuma ação pendente</p><p class="text-xs text-slate-300 mt-1">Cadastre membros para começar</p></div>' : ''}
          </div>
        </section>
        ${store.hasRole('ADMIN', 'SUPERVISOR') ? `<section>
          <div class="flex items-center justify-between mb-3"><h3 class="text-base font-bold">Triagem</h3><a href="#/triage" class="text-xs font-semibold text-primary">Ver tudo</a></div>
          ${store.triageQueue.filter(t => t.status === 'new').length ? store.triageQueue.filter(t => t.status === 'new').slice(0, 3).map(t => { const f = store.forms.find(x => x.id === t.formId); return `<div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 mb-2 hover:border-primary/30 cursor-pointer transition" onclick="location.hash='/triage'"><div class="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-primary font-bold text-sm">${(t.data.Nome || '?')[0]}</div><div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">${t.data.Nome || 'Anônimo'}</p><p class="text-[11px] text-slate-500">${f?.name || 'Formulário'}</p></div><span class="material-symbols-outlined text-slate-300 text-lg">chevron_right</span></div>` }).join('') : '<div class="text-center py-8 bg-white rounded-xl border border-slate-100"><span class="material-symbols-outlined text-3xl text-slate-200">assignment_turned_in</span><p class="text-sm text-slate-400 mt-1">Triagem vazia</p></div>'}
        </section>`: ''}
      </div>
    </div>
  </div>
  ${bottomNav('home')}`;
  document.getElementById('header-theme')?.addEventListener('click', toggleTheme);
}
function kpi(icon, label, val, sub, color) {
  return `<div class="bg-white rounded-xl p-4 border border-slate-100 hover:shadow-sm transition group">
    <div class="w-8 h-8 rounded-lg bg-${color}-50 flex items-center justify-center text-${color}-600 mb-3"><span class="material-symbols-outlined text-lg">${icon}</span></div>
    <p class="text-[11px] font-medium text-slate-400">${label}</p>
    <p class="text-xl font-extrabold text-slate-900 mt-0.5">${val}</p>
    <p class="text-[11px] text-slate-400 mt-1">${sub}</p>
  </div>`;
}
function actionCard(icon, color, title, desc, tag = '') {
  return `<div class="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-primary/30 transition cursor-pointer">
    <div class="w-9 h-9 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-600 shrink-0"><span class="material-symbols-outlined text-lg">${icon}</span></div>
    <div class="flex-1 min-w-0"><div class="flex items-center justify-between"><h4 class="text-sm font-semibold">${title}</h4>${tag ? `<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-${color}-100 text-${color}-700">${tag}</span>` : ''}</div><p class="text-xs text-slate-500 mt-0.5">${desc}</p></div>
  </div>`;
}
