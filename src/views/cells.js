import { store } from '../store.js';
import { header, bottomNav, avatar, toast, openModal, closeModal } from '../components/ui.js';

export function cellsView() {
  const app = document.getElementById('app');
  app.innerHTML = `
  ${header('Células', false, store.hasRole('ADMIN', 'SUPERVISOR') ? `<button id="btn-add-cell" class="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"><span class="material-symbols-outlined text-lg">add</span></button>` : '')}
  <div class="flex-1 overflow-y-auto px-4 md:px-6 py-4">
    ${store.cells.length ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">${store.cells.map(c => {
    const leader = store.users.find(u => u.id === c.leaderId); const mem = store.getCellMembers(c.id);
    return `<a href="#/cell?id=${c.id}" class="block bg-white rounded-xl p-4 border border-slate-100 hover:border-primary/30 hover:shadow-sm transition group">
        <div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><span class="material-symbols-outlined">diversity_3</span></div><div class="flex-1"><h3 class="text-sm font-bold">${c.name}</h3><p class="text-[11px] text-slate-500">${c.meetingDay || ''} ${c.meetingTime ? 'às ' + c.meetingTime : ''}</p></div><span class="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg">chevron_right</span></div>
        <div class="flex justify-between text-[11px] text-slate-500"><span>Líder: ${leader?.name || 'N/A'}</span><span>${mem.length}/${c.capacity || '∞'}</span></div>
        ${c.capacity ? `<div class="mt-2 w-full bg-slate-100 rounded-full h-1"><div class="bg-primary rounded-full h-1 transition-all" style="width:${Math.min(mem.length / c.capacity * 100, 100)}%"></div></div>` : ''}
      </a>`}).join('')}</div>` : `<div class="flex flex-col items-center justify-center py-16"><span class="material-symbols-outlined text-5xl text-slate-200 mb-3">group_off</span><p class="text-sm text-slate-400">Nenhuma célula cadastrada</p>${store.hasRole('ADMIN', 'SUPERVISOR') ? `<button onclick="document.getElementById('btn-add-cell').click()" class="mt-3 text-sm text-primary font-semibold">+ Criar primeira célula</button>` : ''}</div>`}
  </div>
  ${bottomNav('cells')}`;
  const addBtn = document.getElementById('btn-add-cell');
  if (addBtn) addBtn.onclick = () => cellForm();
}

function cellForm(cellId) {
  const c = cellId ? store.getCell(cellId) : null;
  openModal(`<div class="p-6"><div class="flex justify-between items-center mb-5"><h3 class="text-base font-bold">${c ? 'Editar' : 'Nova'} Célula</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400 text-xl">close</span></button></div>
  <form id="cell-form" class="space-y-3">
    <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Nome</label><input id="cf-name" value="${c?.name || ''}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: Célula Zona Sul"/></div>
    <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Dia da Semana</label><input id="cf-day" value="${c?.meetingDay || ''}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none" placeholder="Terça-feira"/></div>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Horário</label><input id="cf-time" value="${c?.meetingTime || ''}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none" placeholder="19:30"/></div>
      <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Capacidade</label><input id="cf-cap" type="number" value="${c?.capacity || 12}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none"/></div>
    </div>
    <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Endereço</label><input id="cf-addr" value="${c?.address || ''}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none" placeholder="Rua..."/></div>
    <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Líder</label>
    <select id="cf-leader" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none">
      <option value="">Selecionar...</option>${store.users.map(u => `<option value="${u.id}" ${c?.leaderId === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
    </select></div>
    <button type="submit" class="w-full bg-primary text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition mt-2">${c ? 'Salvar' : 'Criar Célula'}</button>
    ${c ? `<button type="button" id="btn-del-cell" class="w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-semibold hover:bg-red-100">Excluir Célula</button>` : ''}
  </form></div>`);
  document.getElementById('cell-form').onsubmit = e => {
    e.preventDefault();
    const data = { name: document.getElementById('cf-name').value.trim(), meetingDay: document.getElementById('cf-day').value, meetingTime: document.getElementById('cf-time').value, capacity: parseInt(document.getElementById('cf-cap').value) || 12, address: document.getElementById('cf-addr').value, leaderId: document.getElementById('cf-leader').value, region: '' };
    if (!data.name) { toast('Nome obrigatório', 'error'); return }
    if (c) { store.updateCell(cellId, data); toast('Célula atualizada!') } else { store.addCell(data); toast('Célula criada!') }
    closeModal(); cellsView();
  };
  document.getElementById('btn-del-cell')?.addEventListener('click', () => { if (confirm('Excluir esta célula?')) { store.deleteCell(cellId); toast('Célula excluída'); closeModal(); cellsView() } });
}

export function cellDetailView(params) {
  const app = document.getElementById('app');
  const c = store.getCell(params?.id);
  if (!c) { app.innerHTML = '<div class="flex-1 flex items-center justify-center text-slate-400">Célula não encontrada</div>'; return }
  const mem = store.getCellMembers(c.id); const leader = store.users.find(u => u.id === c.leaderId);
  const att = store.getAttendanceForCell(c.id);
  app.innerHTML = `
  ${header(c.name, true, store.hasRole('ADMIN', 'SUPERVISOR') ? `<button id="btn-edit-cell" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"><span class="material-symbols-outlined text-lg">edit</span></button>` : '')}
  <div class="flex-1 overflow-y-auto">
    <div class="px-4 md:px-6 py-4 bg-white border-b border-slate-100 space-y-1.5">
      ${c.address ? `<p class="flex items-center gap-2 text-sm text-slate-600"><span class="material-symbols-outlined text-[16px]">location_on</span>${c.address}</p>` : ''}
      <p class="flex items-center gap-2 text-sm text-slate-600"><span class="material-symbols-outlined text-[16px]">calendar_today</span>${c.meetingDay || '-'} ${c.meetingTime ? 'às ' + c.meetingTime : ''}</p>
      <p class="flex items-center gap-2 text-sm text-slate-600"><span class="material-symbols-outlined text-[16px]">person</span>Líder: ${leader?.name || 'N/A'}</p>
    </div>
    <div class="px-4 md:px-6 py-3"><h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Membros (${mem.length})</h3></div>
    <div class="px-4 md:px-6 md:grid md:grid-cols-2 md:gap-3 space-y-2 md:space-y-0 mb-4">${mem.map(m => `<a href="#/profile?id=${m.id}" class="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-primary/30 transition cursor-pointer">${avatar(m.name, 'h-9 w-9')}<div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">${m.name}</p><p class="text-[11px] text-slate-500">${m.status}</p></div><span class="material-symbols-outlined text-slate-300 text-lg">chevron_right</span></a>`).join('')}
    ${!mem.length ? '<p class="text-sm text-slate-400 text-center py-4">Nenhum membro nesta célula</p>' : ''}
    </div>
    <div class="px-4 md:px-6 mb-4"><a href="#/attendance?cellId=${c.id}" class="flex items-center justify-center gap-2 w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-sm"><span class="material-symbols-outlined text-lg">checklist</span>Registrar Presença</a></div>
    ${att.length ? `<div class="px-4 md:px-6 pb-4"><h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Últimos Encontros</h3>${att.slice(0, 3).map(a => `<div class="p-3 bg-white rounded-lg border border-slate-100 mb-2"><div class="flex justify-between text-sm"><span class="font-medium">${a.date}</span><span class="text-primary font-semibold">${a.records.filter(r => r.status === 'present').length}/${a.records.length}</span></div>${a.notes ? `<p class="text-[11px] text-slate-500 mt-1">${a.notes}</p>` : ''}</div>`).join('')}</div>` : ''}
  </div>`;
  const editBtn = document.getElementById('btn-edit-cell');
  if (editBtn) editBtn.onclick = () => cellForm(c.id);
}
