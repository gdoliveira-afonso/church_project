import { store } from '../store.js';
import { bottomNav, avatar, badge, riskDot, statusColor, toast, openModal, closeModal } from '../components/ui.js';

export function peopleView() {
  const app = document.getElementById('app');
  app.innerHTML = `
  <header class="sticky top-0 z-20 bg-white border-b border-slate-100 shrink-0">
    <div class="flex items-center justify-between px-4 md:px-6 h-14">
      <h1 class="text-base font-bold md:text-lg">Diretório de Pessoas</h1>
      <div class="flex items-center gap-2">
        <button onclick="window.__globalLogout()" class="w-8 h-8 flex md:hidden items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-red-500 transition"><span class="material-symbols-outlined text-lg">logout</span></button>
        ${store.hasRole('ADMIN', 'SUPERVISOR') ? `<button onclick="location.hash='/people/new'" class="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition"><span class="material-symbols-outlined text-lg">person_add</span></button>` : ''}
      </div>
    </div>
    <div class="px-4 md:px-6 pb-3 flex flex-col md:flex-row gap-2">
      <div class="relative flex-1">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
        <input id="search" class="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Buscar por nome…"/>
      </div>
      <div class="relative md:w-48">
        <select id="cell-filter" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none">
          <option value="">Todas as Células</option>
          ${store.getVisibleCells().map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</span>
      </div>
    </div>
    <div class="flex gap-2 px-4 md:px-6 pb-2 overflow-x-auto no-scrollbar">
      ${['all', 'leaders-vices', 'not-baptized', 'no-school', 'no-encounter', 'no-visit', 'no-cell'].map((f, i) => {
    const labels = { all: 'Todos', 'leaders-vices': 'Líderes/Vices', 'not-baptized': 'Não Batizados', 'no-school': 'Sem Escola', 'no-encounter': 'Sem Encontro', 'no-visit': 'Sem Visita', 'no-cell': 'Sem Célula' };
    return `<button class="chip whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}" data-f="${f}">${labels[f]}</button>`;
  }).join('')}
    </div>
    <div class="px-4 md:px-6 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center"><span id="count" class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">0 membros</span></div>
  </header>
  <div class="flex-1 overflow-y-auto" id="list"></div>
  ${store.hasRole('ADMIN', 'SUPERVISOR') ? `<button onclick="location.hash='/people/new'" class="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-30 hover:scale-105 active:scale-95 transition"><span class="material-symbols-outlined text-2xl">add</span></button>` : ''}
  ${bottomNav('people')}`;

  let filter = 'all';
  const go = () => {
    const q = document.getElementById('search')?.value.toLowerCase() || '';
    const cf = document.getElementById('cell-filter')?.value || '';
    let pp = [...store.people];

    // Restrict view based on role
    if (!store.hasRole('ADMIN', 'SUPERVISOR')) {
      const myVisibleCellIds = store.getVisibleCells().map(c => c.id);
      pp = pp.filter(p => myVisibleCellIds.includes(p.cellId) || p.id === store.currentUser?.id);
    }

    const findTrackId = (name) => store.tracks.find(t => t.name.toLowerCase().includes(name.toLowerCase()))?.id;
    const tBatismo = findTrackId('Batismo nas Águas');
    const tEscola = findTrackId('Escola de Líderes');
    const tEncontro = findTrackId('Encontro com Deus');

    if (q) pp = pp.filter(p => p.name.toLowerCase().includes(q));
    if (cf) pp = pp.filter(p => p.cellId === cf);
    if (filter === 'leaders-vices') pp = pp.filter(p => p.status === 'Líder' || p.status === 'Vice-Líder');
    if (filter === 'not-baptized') pp = pp.filter(p => !p.tracksData?.[tBatismo]);
    if (filter === 'no-school') pp = pp.filter(p => !p.tracksData?.[tEscola]);
    if (filter === 'no-encounter') pp = pp.filter(p => !p.tracksData?.[tEncontro]);
    if (filter === 'no-visit') pp = pp.filter(p => p.status !== 'Líder' && !store.getVisitsForPerson(p.id).length);
    if (filter === 'no-cell') pp = pp.filter(p => !p.cellId);
    document.getElementById('count').textContent = `${pp.length} membros`;
    document.getElementById('list').innerHTML = pp.length ? `<div class="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:p-4">${pp.map(p => {
      const cell = p.cellId ? store.getCell(p.cellId) : null;
      return `<a href="#/profile?id=${p.id}" class="flex items-center gap-3 px-4 md:px-4 py-3 border-b md:border md:rounded-xl border-slate-100 hover:bg-slate-50 transition cursor-pointer group">
        <div class="relative">${avatar(p.name)}<span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 ${p.riskLevel === 'high' ? 'bg-red-500' : p.riskLevel === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'} border-2 border-white rounded-full"></span></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2"><p class="text-sm font-semibold truncate">${p.name}</p>${badge(p.status, statusColor(p.status))}</div>
          <p class="text-[11px] text-slate-500 truncate mt-0.5">${cell ? cell.name : 'Sem Célula'}</p>
          <div class="flex gap-1.5 mt-1">
            ${store.tracks.map(t => {
        const done = p.tracksData && p.tracksData[t.id];
        return `<span class="material-symbols-outlined text-[14px] ${done ? `text-${t.color}-500 filled` : 'text-slate-300'}" title="${t.name}">${t.icon}</span>`;
      }).join('')}
          </div>
        </div>
        <span class="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg">chevron_right</span>
      </a>`}).join('')}</div>` : `<div class="flex flex-col items-center justify-center py-16"><span class="material-symbols-outlined text-5xl text-slate-200 mb-3">person_off</span><p class="text-sm text-slate-400">Nenhuma pessoa encontrada</p></div>`;
  };
  go();
  document.getElementById('search').oninput = go;
  document.getElementById('cell-filter').onchange = go;
  document.querySelectorAll('.chip').forEach(b => b.onclick = () => {
    document.querySelectorAll('.chip').forEach(x => { x.classList.remove('bg-primary', 'text-white', 'border-primary'); x.classList.add('bg-white', 'text-slate-500', 'border-slate-200') });
    b.classList.add('bg-primary', 'text-white', 'border-primary'); b.classList.remove('bg-white', 'text-slate-500', 'border-slate-200');
    filter = b.dataset.f; go();
  });
}

// ── Add/Edit Person ──
export function personFormView(params) {
  const app = document.getElementById('app');
  const isEdit = params?.id && params.id !== 'new';
  const p = isEdit ? store.getPerson(params.id) : null;
  const title = isEdit ? 'Editar Pessoa' : 'Nova Pessoa';

  app.innerHTML = `
  <header class="sticky top-0 z-20 bg-white border-b border-slate-100 flex items-center px-4 h-14 gap-3">
    <button onclick="history.back()" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-xl">arrow_back</span></button>
    <h2 class="text-base font-bold flex-1">${title}</h2>
  </header>
  <div class="flex-1 overflow-y-auto px-4 md:px-6 lg:px-10 py-5 md:max-w-2xl md:mx-auto w-full">
    <form id="person-form" class="space-y-4">
      ${field('Nome', 'inp-name', p?.name || '')}
      ${field('Telefone', 'inp-phone', p?.phone || '', 'tel')}
      ${field('Data de Nascimento', 'inp-birth', p?.birthdate || '', 'date')}
      ${field('Endereço', 'inp-addr', p?.address || '')}
      <div>
        <label class="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
        <select id="inp-status" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20">
          ${(() => {
      const opts = ['Visitante', 'Novo Convertido', 'Membro', 'Reconciliação'];
      const inactiveOpts = ['Inativo', 'Afastado', 'Mudou-se'];
      if (p?.status === 'Líder') opts.push('Líder');
      if (p?.status === 'Vice-Líder') opts.push('Vice-Líder');
      if (p?.status && !opts.includes(p.status) && !inactiveOpts.includes(p.status)) opts.push(p.status);
      return `<optgroup label="Ativos">${opts.map(s => `<option ${p?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</optgroup>
              <optgroup label="Inativos / Saída">${inactiveOpts.map(s => `<option ${p?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</optgroup>`;
    })()}
        </select>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600 mb-1 block">Célula</label>
        <select id="inp-cell" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" ${(p?.status === 'Líder' || p?.status === 'Vice-Líder') ? 'disabled' : ''}>
          <option value="">Sem célula</option>
          ${store.getVisibleCells().map(c => `<option value="${c.id}" ${p?.cellId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
        ${(p?.status === 'Líder' || p?.status === 'Vice-Líder') ? `<p class="text-[10px] text-slate-400 mt-1">A célula de líderes só pode ser alterada no menu de Células.</p>` : ''}
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600 mb-2 block">Marcos Espirituais & Retiros</label>
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
          ${store.tracks.map(t => {
      const isChecked = p?.tracksData ? p.tracksData[t.id] : false;
      return `<label class="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-slate-200 bg-white hover:border-${t.color}-300 hover:bg-${t.color}-50/30 transition cursor-pointer has-[:checked]:border-${t.color}-400 has-[:checked]:bg-${t.color}-50/50">
              <input type="checkbox" id="chk-${t.id}" ${isChecked ? 'checked' : ''} class="sr-only peer track-checkbox" data-track-id="${t.id}"/>
              <div class="w-8 h-8 rounded-lg bg-${t.color}-100 flex items-center justify-center text-${t.color}-400 peer-checked:bg-${t.color}-500 peer-checked:text-white transition shrink-0"><span class="material-symbols-outlined text-base">${t.icon}</span></div>
              <span class="text-xs font-medium text-slate-600 leading-tight">${t.name}</span>
            </label>`;
    }).join('')}
        </div>
      </div>
      <button type="submit" class="w-full bg-primary text-white py-3 rounded-lg text-sm font-bold hover:bg-primary/90 active:scale-[.98] transition-all">${isEdit ? 'Salvar Alterações' : 'Cadastrar Pessoa'}</button>
      ${isEdit ? `<button type="button" id="btn-del-person" class="w-full bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-100 transition">Excluir Pessoa</button>` : ''}
    </form>
  </div>`;

  const phoneInp = document.getElementById('inp-phone');
  if (phoneInp) {
    const formatPhone = (val) => {
      let v = val.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d)(\d{4})$/, '$1-$2');
      return v;
    };
    phoneInp.addEventListener('input', (e) => e.target.value = formatPhone(e.target.value));
    if (phoneInp.value) phoneInp.value = formatPhone(phoneInp.value);
  }

  document.getElementById('person-form').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const origText = btn.innerHTML;
    btn.innerHTML = 'Salvando...'; btn.disabled = true;

    const tracksPayload = {};
    document.querySelectorAll('.track-checkbox').forEach(chk => {
      if (chk.checked) tracksPayload[chk.dataset.trackId] = true;
    });

    const data = {
      name: document.getElementById('inp-name').value.trim(),
      phone: document.getElementById('inp-phone').value.trim(),
      birthdate: document.getElementById('inp-birth').value,
      address: document.getElementById('inp-addr').value.trim(),
      status: document.getElementById('inp-status').value,
      cellId: document.getElementById('inp-cell').value || null,
      joinedDate: p?.joinedDate || new Date().toISOString().split('T')[0],
      riskLevel: p?.riskLevel || 'low',
      tracksData: tracksPayload,
      discipleship: p?.discipleship || { primeiroContato: { done: true, date: new Date().toISOString().split('T')[0] } },
    };
    if (!data.name) { toast('Preencha o nome', 'error'); btn.innerHTML = origText; btn.disabled = false; return }

    try {
      if (isEdit) { await store.updatePerson(params.id, data); toast('Pessoa atualizada!'); history.back(); }
      else { await store.addPerson(data); toast('Pessoa cadastrada!'); location.hash = '/people'; }
    } catch (err) {
      toast('Servidor indisponível', 'error');
      btn.innerHTML = origText; btn.disabled = false;
    }
  };
  if (isEdit) {
    document.getElementById('btn-del-person')?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(`<div class="p-6 text-center">
        <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="material-symbols-outlined text-3xl">warning</span>
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-2">Excluir esta pessoa?</h3>
        <p class="text-sm text-slate-500 mb-6">Esta ação não pode ser desfeita. Todos os dados desta pessoa serão removidos permanentemente.</p>
        <div class="flex gap-3">
          <button onclick="closeModal()" class="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition">Cancelar</button>
          <button id="btn-confirm-del-person" class="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition shadow-sm border border-red-700">Excluir</button>
        </div>
      </div>`);

      document.getElementById('btn-confirm-del-person').onclick = async () => {
        const btn = document.getElementById('btn-confirm-del-person');
        btn.innerHTML = 'Excluindo...'; btn.disabled = true;
        try {
          await store.deletePerson(params.id);
          closeModal();
          toast('Pessoa excluída com sucesso');
          location.hash = '/people';
        } catch (e) { toast('Erro ao excluir', 'error'); btn.innerHTML = 'Excluir'; btn.disabled = false; }
      };
    });
  }
}
function field(label, id, val = '', type = 'text') {
  return `<div><label class="text-xs font-semibold text-slate-600 mb-1 block">${label}</label><input id="${id}" type="${type}" value="${val}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition"/></div>`;
}
