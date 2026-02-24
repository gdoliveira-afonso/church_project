import { store } from '../store.js';
import { toast } from '../components/ui.js';
import { navigate } from '../router.js';

export function loginView() {
  const app = document.getElementById('app');
  const sb = document.getElementById('sidebar'); if (sb) sb.classList.add('sidebar-hidden');

  // Get active login forms from store
  const loginForms = store.forms.filter(f => f.showOnLogin && f.status === 'ativo');
  const formButtons = loginForms.length ? `
        <div class="mt-6 pt-5 border-t border-slate-100">
          <p class="text-xs font-semibold text-slate-500 text-center mb-3">É sua primeira vez? Preencha um formulário:</p>
          <div class="space-y-2">
            ${loginForms.map(f => {
    const c = f.color || 'blue';
    const colorMap = { emerald: ['emerald-100', 'emerald-600', 'emerald-300', 'emerald-50/50', 'emerald-500'], purple: ['purple-100', 'purple-600', 'purple-300', 'purple-50/50', 'purple-500'], blue: ['blue-100', 'primary', 'primary/30', 'blue-50/50', 'primary'], orange: ['orange-100', 'orange-600', 'orange-300', 'orange-50/50', 'orange-500'], red: ['red-100', 'red-600', 'red-300', 'red-50/50', 'red-500'] };
    const cc = colorMap[c] || colorMap.blue;
    return `<a href="#/form/public?id=${f.id}" class="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-${cc[2]} hover:bg-${cc[3]} transition-all group">
              <div class="w-9 h-9 rounded-lg bg-${cc[0]} flex items-center justify-center text-${cc[1]} shrink-0"><span class="material-symbols-outlined text-lg">${f.icon || 'description'}</span></div>
              <div class="flex-1"><p class="text-sm font-semibold text-slate-900">${f.name}</p><p class="text-[11px] text-slate-400">${f.subtitle || ''}</p></div>
              <span class="material-symbols-outlined text-slate-300 group-hover:text-${cc[4]} text-lg">arrow_forward</span>
            </a>`;
  }).join('')}
          </div>
        </div>` : '';

  app.innerHTML = `
  <div class="flex flex-col md:flex-row flex-1 min-h-screen">
    <div class="hidden md:flex md:flex-1 bg-gradient-to-br from-primary/20 via-primary/5 to-slate-50 flex-col items-center justify-center p-12 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
      <div class="absolute bottom-0 left-0 w-72 h-72 bg-primary/5 rounded-full translate-y-1/3 -translate-x-1/4"></div>
      <div class="relative z-10 text-center">
        <div class="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6"><span class="material-symbols-outlined text-primary text-4xl">church</span></div>
        <h2 class="text-3xl font-extrabold text-slate-800 mb-2">Gestão Igreja</h2>
        <p class="text-slate-500 max-w-sm">Sistema completo de CRM Pastoral para gestão de membros, células e discipulado.</p>
        <div class="flex gap-6 mt-8 justify-center text-sm text-slate-500">
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-lg">groups</span>Membros</span>
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-lg">diversity_3</span>Células</span>
          <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-lg">pie_chart</span>Relatórios</span>
        </div>
      </div>
    </div>
    <div class="flex flex-col flex-1 md:max-w-lg">
      <div class="relative w-full h-44 bg-gradient-to-br from-primary/30 to-primary/5 md:hidden">
        <div class="absolute inset-0 bg-gradient-to-t from-white to-transparent"></div>
        <div class="absolute -bottom-7 left-1/2 -translate-x-1/2"><div class="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center"><span class="material-symbols-outlined text-primary text-3xl">church</span></div></div>
      </div>
      <div class="flex-1 flex flex-col justify-center px-8 py-10 md:py-0 max-w-sm mx-auto w-full">
        <div class="text-center mb-8 mt-4 md:mt-0">
          <h1 class="text-2xl font-extrabold text-slate-900 mb-1 md:text-3xl">Gestão Igreja</h1>
          <p class="text-sm text-slate-500">Bem-vindo, faça login para continuar.</p>
        </div>
        <form id="login-form" class="space-y-4">
          <div>
            <label class="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
              <input id="email" type="email" value="admin@igreja.com" class="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"/>
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 mb-1 block">Senha</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
              <input id="password" type="password" value="123456" class="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"/>
            </div>
          </div>
          <button type="submit" class="w-full bg-primary text-white py-3 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 active:scale-[.98] transition-all mt-2">Entrar no Sistema</button>
        </form>
        <p class="text-[11px] text-slate-400 text-center mt-4">Credenciais de teste preenchidas</p>
        ${formButtons}
      </div>
      <div class="py-3 text-center border-t border-slate-100 bg-slate-50/50"><p class="text-[11px] text-slate-400">Gestão Igreja v3.0 • CRM Pastoral</p></div>
    </div>
  </div>`;
  document.getElementById('login-form').onsubmit = e => {
    e.preventDefault();
    const u = store.login(document.getElementById('email').value, document.getElementById('password').value);
    if (u) { const sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('sidebar-hidden'); toast(`Bem-vindo, ${u.name}!`); navigate('/dashboard') }
    else toast('Email ou senha incorretos', 'error');
  };
}
