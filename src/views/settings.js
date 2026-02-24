import { store } from '../store.js';
import { header, bottomNav, badge, toast, openModal, closeModal, updateSidebar } from '../components/ui.js';

const RL = { ADMIN: 'Administrador', SUPERVISOR: 'Supervisor', LEADER: 'Líder de Célula', VICE_LEADER: 'Vice-Líder' };
const RC = { ADMIN: 'blue', SUPERVISOR: 'purple', LEADER: 'green', VICE_LEADER: 'orange' };

export function settingsView() {
  const app = document.getElementById('app'); const u = store.currentUser;
  app.innerHTML = `
  ${header('Configurações', false)}
  <div class="flex-1 overflow-y-auto px-4 md:px-6 lg:px-10 py-5 space-y-6 max-w-5xl mx-auto w-full">
    <!-- My Profile -->
    <section>
      <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Meu Perfil</h3>
      <div class="bg-white rounded-xl p-5 border border-slate-100">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">${u.name.charAt(0)}</div>
          <div class="flex-1"><p class="text-base font-bold">${u.name}</p><p class="text-xs text-slate-500">${u.email}</p><div class="mt-1">${badge(RL[u.role] || u.role, RC[u.role] || 'slate')}</div></div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button id="btn-name" class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"><span class="material-symbols-outlined text-base">edit</span>Nome</button>
          <button id="btn-pass" class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"><span class="material-symbols-outlined text-base">lock</span>Senha</button>
        </div>
      </div>
    </section>
    <!-- Users -->
    <section>
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400">Equipe</h3>
        <button id="btn-add-user" class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-blue-700 transition active:scale-95"><span class="material-symbols-outlined text-[16px]">person_add</span>Novo</button>
      </div>
      <div id="team-list"></div>
    </section>
    <!-- Tools -->
    <section>
      <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Ferramentas</h3>
      <div class="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
        ${toolLink('description', 'Formulários', `${store.forms.length} formulários`, '#/forms', 'emerald')}
        ${toolLink('assignment', 'Triagem', `${store.triageQueue.filter(t => t.status === 'new').length} pendentes`, '#/triage', 'orange')}
      </div>
    </section>
    <!-- Danger -->
    <section class="space-y-2">
      <button id="btn-logout" class="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 transition"><span class="material-symbols-outlined text-lg">logout</span>Sair</button>
      <button id="btn-reset" class="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-400 hover:bg-slate-100 transition"><span class="material-symbols-outlined text-sm">restart_alt</span>Resetar Dados</button>
    </section>
  </div>
  ${bottomNav('settings')}`;

  renderTeam();
  document.getElementById('btn-name').onclick = () => editNameModal();
  document.getElementById('btn-pass').onclick = () => editPassModal();
  document.getElementById('btn-add-user').onclick = () => userModal();
  document.getElementById('btn-logout').onclick = () => { store.logout(); document.getElementById('sidebar').classList.add('sidebar-hidden'); location.hash = '/login'; toast('Deslogado') };
  document.getElementById('btn-reset').onclick = () => { if (confirm('Resetar TODOS os dados?')) { store.reset(); location.hash = '/login'; toast('Dados resetados') } };
}

function renderTeam() {
  const others = store.users.filter(u => u.id !== store.currentUser.id);
  document.getElementById('team-list').innerHTML = others.length ? `
  <div class="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">${others.map(u => `
    <div class="flex items-center gap-3 p-3.5 group">
      <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">${u.name.charAt(0)}</div>
      <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">${u.name}</p><p class="text-[11px] text-slate-500 truncate">${u.email}</p></div>
      ${badge(RL[u.role] || u.role, RC[u.role] || 'slate')}
      <button class="btn-eu w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/10 transition" data-id="${u.id}"><span class="material-symbols-outlined text-[16px]">edit</span></button>
      <button class="btn-du w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition" data-id="${u.id}"><span class="material-symbols-outlined text-[16px]">delete</span></button>
    </div>`).join('')}</div>` : `<div class="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center"><span class="material-symbols-outlined text-3xl text-slate-200 mb-1">group_add</span><p class="text-sm text-slate-400">Nenhum outro usuário</p></div>`;
  document.querySelectorAll('.btn-eu').forEach(b => b.onclick = () => userModal(b.dataset.id));
  document.querySelectorAll('.btn-du').forEach(b => b.onclick = () => {
    const usr = store.getUser(b.dataset.id); if (!usr) return;
    openModal(`<div class="p-6 text-center"><div class="w-14 h-14 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center"><span class="material-symbols-outlined text-red-600 text-3xl">person_remove</span></div><h3 class="text-lg font-bold mb-1">Excluir Usuário</h3><p class="text-sm text-slate-500">${usr.name}</p><p class="text-xs text-slate-400 mb-5">${usr.email}</p><div class="flex gap-3"><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="flex-1 py-2.5 rounded-lg bg-slate-100 text-sm font-semibold hover:bg-slate-200">Cancelar</button><button id="btn-confirm-del" class="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Excluir</button></div></div>`);
    document.getElementById('btn-confirm-del').onclick = () => { store.deleteUser(usr.id); closeModal(); toast('Usuário excluído'); renderTeam() };
  });
}

function editNameModal() {
  openModal(`<div class="p-6"><div class="flex justify-between items-center mb-5"><h3 class="text-base font-bold">Editar Nome</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400">close</span></button></div>
  <input id="inp-n" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 mb-4" value="${store.currentUser.name}"/>
  <button id="btn-sn" class="w-full bg-primary text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Salvar</button></div>`);
  document.getElementById('btn-sn').onclick = () => { const n = document.getElementById('inp-n').value.trim(); if (!n) { toast('Nome vazio', 'error'); return } store.updateUser(store.currentUser.id, { name: n }); closeModal(); toast('Nome atualizado!'); settingsView() };
}

function editPassModal() {
  openModal(`<div class="p-6"><div class="flex justify-between items-center mb-5"><h3 class="text-base font-bold">Alterar Senha</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400">close</span></button></div>
  <div class="space-y-3">
    <input id="inp-op" type="password" placeholder="Senha atual" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
    <input id="inp-np" type="password" placeholder="Nova senha" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
    <input id="inp-cp" type="password" placeholder="Confirmar nova senha" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
    <button id="btn-sp" class="w-full bg-primary text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition mt-1">Alterar Senha</button>
  </div></div>`);
  document.getElementById('btn-sp').onclick = () => {
    const o = document.getElementById('inp-op').value, n = document.getElementById('inp-np').value, c = document.getElementById('inp-cp').value;
    if (o !== store.currentUser.password) { toast('Senha atual incorreta', 'error'); return }
    if (n.length < 4) { toast('Mínimo 4 caracteres', 'error'); return }
    if (n !== c) { toast('Senhas não coincidem', 'error'); return }
    store.updateUser(store.currentUser.id, { password: n }); closeModal(); toast('Senha alterada!');
  };
}

function userModal(id) {
  const e = id ? store.getUser(id) : null;
  openModal(`<div class="p-6"><div class="flex justify-between items-center mb-5"><h3 class="text-base font-bold">${e ? 'Editar' : 'Novo'} Usuário</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400">close</span></button></div>
  <form id="user-form" class="space-y-3">
    <input id="uf-name" placeholder="Nome completo" value="${e?.name || ''}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
    <input id="uf-email" type="email" placeholder="email@igreja.com" value="${e?.email || ''}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
    ${!e ? `<input id="uf-pass" type="password" placeholder="Senha inicial" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20"/>` : ''}
    <div><p class="text-xs font-semibold text-slate-600 mb-1.5">Função</p><div class="grid grid-cols-2 gap-1.5" id="role-grid">${Object.entries(RL).map(([k, v]) => `<button type="button" class="role-opt flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition ${(e?.role || 'LEADER') === k ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'}" data-r="${k}"><span class="material-symbols-outlined text-[16px]">${k === 'ADMIN' ? 'shield_person' : k === 'SUPERVISOR' ? 'supervisor_account' : 'person'}</span>${v}</button>`).join('')}</div><input type="hidden" id="uf-role" value="${e?.role || 'LEADER'}"/></div>
    <button type="submit" class="w-full bg-primary text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition mt-1">${e ? 'Salvar' : 'Criar'}</button>
  </form></div>`);
  document.querySelectorAll('.role-opt').forEach(b => b.onclick = () => {
    document.querySelectorAll('.role-opt').forEach(x => { x.classList.remove('border-primary', 'bg-primary/10', 'text-primary', 'ring-1', 'ring-primary'); x.classList.add('border-slate-200', 'text-slate-500') });
    b.classList.add('border-primary', 'bg-primary/10', 'text-primary', 'ring-1', 'ring-primary'); b.classList.remove('border-slate-200', 'text-slate-500');
    document.getElementById('uf-role').value = b.dataset.r;
  });
  document.getElementById('user-form').onsubmit = ev => {
    ev.preventDefault(); const n = document.getElementById('uf-name').value.trim(), em = document.getElementById('uf-email').value.trim(), r = document.getElementById('uf-role').value;
    if (!n || !em) { toast('Preencha nome e email', 'error'); return }
    if (e) { store.updateUser(id, { name: n, email: em, role: r }); toast('Atualizado!') }
    else { const pw = document.getElementById('uf-pass').value; if (!pw || pw.length < 4) { toast('Senha min. 4 chars', 'error'); return } if (store.users.find(u => u.email === em)) { toast('Email duplicado', 'error'); return } store.addUser({ name: n, email: em, password: pw, role: r, avatar: null }); toast('Usuário criado!') }
    closeModal(); renderTeam();
  };
}

function toolLink(icon, title, desc, href, color) {
  return `<a href="${href}" class="flex items-center gap-3 p-3.5 hover:bg-slate-50 transition group"><div class="w-9 h-9 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-600"><span class="material-symbols-outlined text-lg">${icon}</span></div><div class="flex-1"><p class="text-sm font-semibold">${title}</p><p class="text-[11px] text-slate-500">${desc}</p></div><span class="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg">chevron_right</span></a>`;
}

// ── Forms ──
export function formsView() {
  const app = document.getElementById('app');
  app.innerHTML = `${header('Formulários', true)}<div class="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 md:max-w-2xl">
  ${store.forms.map(f => `<div class="bg-white rounded-xl p-4 border border-slate-100"><div class="flex items-center gap-3 mb-2"><div class="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><span class="material-symbols-outlined text-lg">description</span></div><div class="flex-1"><h3 class="text-sm font-semibold">${f.name}</h3><div class="flex gap-2 mt-0.5">${badge(f.status === 'ativo' ? 'Ativo' : 'Inativo', f.status === 'ativo' ? 'green' : 'slate')}<span class="text-[11px] text-slate-400">${f.fields.length} campos</span></div></div></div></div>`).join('')}
  </div>`;
}

// ── Triage ──
export function triageView() {
  const app = document.getElementById('app');
  const pending = store.triageQueue.filter(t => t.status === 'new' || t.status === 'pendente');
  const done = store.triageQueue.filter(t => t.status === 'done' || t.status === 'rejected');
  app.innerHTML = `${header('Triagem', true)}<div class="flex-1 overflow-y-auto px-4 md:px-6 lg:px-10 py-4 space-y-5 max-w-5xl mx-auto w-full">
  <section>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pendentes (${pending.length})</h3>
    </div>
    <div class="space-y-2">${pending.length ? pending.map(t => tCard(t)).join('') : '<div class="text-center py-8 bg-white rounded-xl border border-slate-100"><span class="material-symbols-outlined text-3xl text-slate-200">assignment_turned_in</span><p class="text-sm text-slate-400 mt-1">Nenhum registro pendente</p></div>'}</div>
  </section>
  ${done.length ? `<section>
    <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Processados (${done.length})</h3>
    <div class="space-y-2">${done.map(t => tCard(t, true)).join('')}</div>
  </section>` : ''}
  </div>`;

  document.querySelectorAll('.triage-card').forEach(card => {
    card.addEventListener('click', () => openTriageDetail(card.dataset.id));
  });
}

function tCard(t, processed = false) {
  const f = store.forms.find(x => x.id === t.formId);
  const statusBadge = f?.personStatus
    ? `<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${f.personStatus === 'Novo Convertido' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'}">${f.personStatus}</span>`
    : '<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Triagem</span>';
  const name = t.data['Nome Completo'] || t.data['Nome'] || t.data.nome || 'Anônimo';
  const phone = t.data['Telefone / WhatsApp'] || t.data['Telefone'] || t.data.telefone || '';
  const doneBadge = t.status === 'done' ? '<span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">✓ ACEITO</span>' :
    t.status === 'rejected' ? '<span class="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">✕ REJEITADO</span>' : '';

  return `<div class="triage-card bg-white rounded-xl p-4 border border-slate-100 hover:border-primary/30 transition cursor-pointer group" data-id="${t.id}">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary text-sm font-bold">${(name[0] || '?').toUpperCase()}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2"><p class="text-sm font-semibold truncate">${name}</p>${statusBadge}${doneBadge}</div>
        <p class="text-[11px] text-slate-400 mt-0.5">${phone ? phone + ' • ' : ''}${f?.name || 'Formulário'} • ${new Date(t.submittedAt || t.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <span class="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg transition">chevron_right</span>
    </div>
  </div>`;
}

function openTriageDetail(id) {
  const t = store.triageQueue.find(x => x.id === id);
  if (!t) return;
  const f = store.forms.find(x => x.id === t.formId);
  const name = t.data['Nome Completo'] || t.data['Nome'] || t.data.nome || '';
  const phone = t.data['Telefone / WhatsApp'] || t.data['Telefone'] || t.data.telefone || '';
  const email = t.data['Email'] || t.data.email || '';
  const isDone = t.status === 'done' || t.status === 'rejected';
  const statusLabel = f?.personStatus || 'Sem status definido';
  const statusColor = f?.personStatus === 'Novo Convertido' ? 'emerald' : f?.personStatus === 'Reconciliação' ? 'purple' : 'slate';

  openModal(`<div class="p-5 md:p-6 max-h-[85vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-base font-bold">Detalhes da Triagem</h3>
      <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400">close</span></button>
    </div>
    <div class="flex items-center gap-3 mb-4 p-3 rounded-xl bg-${statusColor}-50 border border-${statusColor}-100">
      <div class="w-10 h-10 rounded-full bg-${statusColor}-100 flex items-center justify-center text-${statusColor}-700 font-bold text-sm">${(name[0] || '?').toUpperCase()}</div>
      <div class="flex-1">
        <p class="text-sm font-bold text-${statusColor}-800">${name || 'Sem nome'}</p>
        <p class="text-[11px] text-${statusColor}-600">${statusLabel} • ${f?.name || 'Formulário'}</p>
      </div>
    </div>
    <div class="mb-4">
      <p class="text-xs font-semibold text-slate-600 mb-2">Dados enviados</p>
      <div class="space-y-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
        ${Object.entries(t.data).map(([k, v]) => `<div class="flex justify-between items-start gap-2">
          <span class="text-[11px] font-medium text-slate-500 shrink-0">${k}</span>
          <span class="text-[11px] text-right font-semibold text-slate-700">${v || '<span class="text-slate-300 italic">vazio</span>'}</span>
        </div>`).join('')}
      </div>
    </div>
    ${!isDone ? `<form id="triage-action" class="space-y-3">
      <div>
        <label class="text-xs font-semibold text-slate-600 mb-1 block">Nome (corrigir se necessário)</label>
        <input id="tr-name" value="${name}" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Nome completo"/>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600 mb-1 block">Telefone</label>
        <input id="tr-phone" value="${phone}" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="(00) 00000-0000"/>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
        <input id="tr-email" value="${email}" type="email" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="email@exemplo.com"/>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600 mb-1 block">Atribuir à Célula</label>
        <select id="tr-cell" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">— Sem célula (definir depois) —</option>
          ${store.cells.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="flex gap-2 pt-2">
        <button type="submit" class="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 active:scale-[.98] transition-all flex items-center justify-center gap-1.5"><span class="material-symbols-outlined text-lg">check</span>Aceitar</button>
        <button type="button" id="tr-reject" class="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-bold hover:bg-red-100 active:scale-[.98] transition-all flex items-center justify-center gap-1.5 border border-red-100"><span class="material-symbols-outlined text-lg">close</span>Rejeitar</button>
      </div>
    </form>` : `<div class="text-center py-4">
      <span class="text-xs font-medium px-2.5 py-1 rounded-full ${t.status === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">${t.status === 'done' ? '✓ Aceito e processado' : '✕ Rejeitado'}</span>
    </div>`}
  </div>`);

  if (!isDone) {
    document.getElementById('triage-action').onsubmit = e => {
      e.preventDefault();
      const trName = document.getElementById('tr-name').value.trim() || name || 'Sem nome';
      const trPhone = document.getElementById('tr-phone').value.trim();
      const trEmail = document.getElementById('tr-email').value.trim();
      const trCell = document.getElementById('tr-cell').value;
      const personData = {
        name: trName, phone: trPhone, email: trEmail,
        status: f?.personStatus || 'Novo Convertido',
        cellId: trCell || undefined,
        createdAt: new Date().toISOString(),
        formData: t.data,
        spiritual: { waterBaptism: false, leadersSchool: false, holySpiritBaptism: false },
        retreats: { encounter: { done: false } },
        discipleship: { primeiroContato: { done: true, date: new Date().toISOString().split('T')[0] } }
      };
      store.addPerson(personData);
      t.status = 'done';
      store.save();
      closeModal();
      toast('Pessoa cadastrada com sucesso!');
      triageView();
    };
    document.getElementById('tr-reject')?.addEventListener('click', () => {
      t.status = 'rejected';
      store.save();
      closeModal();
      toast('Registro rejeitado', 'warning');
      triageView();
    });
  }
}
