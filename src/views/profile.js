import { store } from '../store.js';
import { header, avatar, badge, statusColor, toast, openModal, closeModal } from '../components/ui.js';

export function profileView(params) {
  const app = document.getElementById('app');
  const p = store.getPerson(params?.id);
  if (!p) { app.innerHTML = '<div class="flex-1 flex items-center justify-center"><p class="text-slate-400">Pessoa não encontrada</p></div>'; return }
  const cell = p.cellId ? store.getCell(p.cellId) : null;

  function getVisits() { return store.getVisitsForPerson(p.id); }
  function getNotes() { return store.getNotesForPerson(p.id); }
  const att = store.getAttendanceForPerson(p.id);
  const attPct = att.length ? Math.round(att.filter(a => a.status === 'present').length / att.length * 100) : 0;

  app.innerHTML = `
  ${header('Perfil', true, store.hasRole('ADMIN', 'SUPERVISOR') ? `<a href="#/people/edit?id=${p.id}" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"><span class="material-symbols-outlined text-lg">edit</span></a>` : '')}
  <div class="flex-1 overflow-y-auto pb-20">
    <div class="flex flex-col md:flex-row md:items-start md:gap-6 items-center bg-white px-5 md:px-6 pt-5 pb-6 border-b border-slate-100">
      <div class="relative shrink-0 mb-3 md:mb-0">${avatar(p.name, 'h-20 w-20 text-xl')}<span class="absolute bottom-0 right-0 w-5 h-5 ${p.riskLevel === 'high' ? 'bg-red-500' : p.riskLevel === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'} border-2 border-white rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-white text-[12px]">${p.riskLevel === 'low' ? 'check' : 'priority_high'}</span></span></div>
      <div class="text-center md:text-left">
        <h1 class="text-xl font-extrabold">${p.name}</h1>
        <div class="flex flex-wrap gap-1.5 justify-center md:justify-start mt-1.5">${badge(p.status, statusColor(p.status))} ${p.riskLevel === 'high' ? badge('Em Risco', 'red') : ''}</div>
        <p class="text-xs text-slate-500 mt-1">${cell ? `${cell.name} • ${cell.meetingDay || ''}` : ''} ${p.phone || ''}</p>
        <div class="flex gap-2 mt-3 justify-center md:justify-start">
          ${p.phone ? `<a href="tel:${p.phone}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold"><span class="material-symbols-outlined text-sm">call</span>Ligar</a>` : ''}
          ${p.phone ? `<a href="https://wa.me/${p.phone.replace(/\\D/g, '')}" target="_blank" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold"><span class="material-symbols-outlined text-sm">chat</span>WhatsApp</a>` : ''}
        </div>
      </div>
    </div>
    <!-- Tabs -->
    <div class="flex gap-1 px-4 md:px-6 py-3 overflow-x-auto no-scrollbar">${['Dados', 'Espiritual', 'Retiros', 'Visitas', 'Notas'].map((t, i) => `<button class="tab whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition ${i === 0 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}" data-t="${t.toLowerCase()}">${t}</button>`).join('')}</div>
    <div id="tab-c" class="px-4 md:px-6 lg:px-10 pb-6 max-w-4xl mx-auto w-full"></div>
  </div>
  <div class="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 md:px-6 py-3 z-10">
    <button id="btn-note" class="w-full md:w-auto bg-primary text-white py-3 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[.98] transition-all shadow-sm"><span class="material-symbols-outlined text-lg">edit_note</span>Nota</button>
  </div>`;

  const tc = document.getElementById('tab-c');
  function show(t) {
    document.querySelectorAll('.tab').forEach(b => { b.classList.toggle('bg-primary', b.dataset.t === t); b.classList.toggle('text-white', b.dataset.t === t); b.classList.toggle('bg-slate-100', b.dataset.t !== t); b.classList.toggle('text-slate-500', b.dataset.t !== t) });
    if (t === 'dados') {
      let consolidationHtml = '';
      if (p.status === 'Novo Convertido' && p.consolidation) {
        const c = p.consolidation;
        const days = Math.floor((new Date() - new Date(c.startDate)) / 86400000);
        const consVisits = getVisits().filter(v => v.type === 'Visita de Consolidação').length;
        const sColor = c.status === 'COMPLETED' ? 'emerald' : c.status === 'IN_PROGRESS' ? 'amber' : 'slate';
        const sText = c.status === 'COMPLETED' ? 'Finalizada' : c.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Pendente';
        const showBtn = c.status !== 'COMPLETED';

        consolidationHtml = `<div class="bg-gradient-to-br from-${sColor}-50 to-white dark:from-${sColor}-900/20 dark:to-slate-800 rounded-xl p-5 shadow-sm border border-${sColor}-100 dark:border-${sColor}-800 mb-4">
          <div class="flex justify-between items-start mb-3">
            <h3 class="text-sm font-bold text-${sColor}-900 dark:text-${sColor}-400 flex items-center gap-2"><span class="material-symbols-outlined text-base">route</span>Jornada de Consolidação</h3>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-${sColor}-100 dark:bg-${sColor}-900/50 text-${sColor}-700 dark:text-${sColor}-300">${sText}</span>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-white dark:bg-slate-700/50 rounded-lg p-3 border border-${sColor}-50 dark:border-${sColor}-900/30">
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Tempo na Igreja</p>
              <p class="text-xl font-extrabold text-${sColor}-700 dark:text-${sColor}-400">${days} <span class="text-xs font-semibold text-slate-400 dark:text-slate-500">dias</span></p>
            </div>
            <div class="bg-white dark:bg-slate-700/50 rounded-lg p-3 border border-${sColor}-50 dark:border-${sColor}-900/30">
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Visitas Recebidas</p>
              <p class="text-xl font-extrabold text-${sColor}-700 dark:text-${sColor}-400">${consVisits} <span class="text-xs font-semibold text-slate-400 dark:text-slate-500">visitas</span></p>
            </div>
          </div>
          ${showBtn ? `<button id="btn-complete-consolidation" class="w-full bg-${sColor}-600 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-${sColor}-700 transition" onclick="window.completeCons()"> <span class="material-symbols-outlined text-lg">check_circle</span> Marcar como Consolidado </button>` : `<p class="text-xs text-center text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 py-2 rounded-lg">Consolidado em ${new Date(c.completedDate).toLocaleDateString('pt-BR')}</p>`}
        </div>`;
      }
      tc.innerHTML = consolidationHtml + card('📌 Dados Gerais', `<dl class="space-y-3">${[['person', p.name], ['call', p.phone || '-'], ['mail', p.email || '-'], ['cake', p.birthdate || '-'], ['home', p.address || '-'], ['calendar_today', p.joinedDate || '-']].map(([i, v]) => `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-slate-400 text-lg">${i}</span><span class="text-sm">${v}</span></div>`).join('')}</dl>`);
    }
    if (t === 'espiritual') {
      const spTracks = store.tracks.filter(tr => tr.category === 'espiritual');
      tc.innerHTML = card('🙏 Vida Espiritual', `<div class="space-y-3">${spTracks.length ? spTracks.map(tr => {
        const d = p.tracksData ? p.tracksData[tr.id] : false;
        return `<div class="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-${tr.color}-100 flex items-center justify-center"><span class="material-symbols-outlined text-${tr.color}-500 text-base">${tr.icon}</span></div><span class="text-sm font-medium">${tr.name}</span></div><span class="text-xs font-medium px-2.5 py-1 rounded-full ${d ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">${d ? '✓ Sim' : '✗ Não'}</span></div>`;
      }).join('') : '<p class="text-sm text-slate-400 text-center py-4">Nenhum marco espiritual cadastrado no sistema</p>'}</div>`);
    }
    if (t === 'retiros') {
      const retTracks = store.tracks.filter(tr => tr.category === 'retiros');
      tc.innerHTML = card('🏕 Retiros', `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${retTracks.length ? retTracks.map(tr => {
        const d = p.tracksData ? p.tracksData[tr.id] : false;
        return `<div class="p-4 bg-slate-50 rounded-lg text-center border border-slate-100 hover:border-${tr.color}-300 transition"><div class="w-10 h-10 mx-auto rounded-lg bg-${tr.color}-100 flex items-center justify-center mb-2"><span class="material-symbols-outlined text-${tr.color}-600">${tr.icon}</span></div><p class="text-sm font-semibold mb-2">${tr.name}</p><span class="text-xs font-medium px-2.5 py-1 rounded-full ${d ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}">${d ? '✓ Realizado' : '✗ Pendente'}</span></div>`;
      }).join('') : '<p class="text-sm text-slate-400 text-center py-4 col-span-2">Nenhum retiro cadastrado no sistema</p>'}</div>`);
    }
    if (t === 'visitas') {
      const visits = getVisits();
      tc.innerHTML = card('🏠 Visitas', `${visits.length ? visits.map(v => `<div class="p-3 border border-slate-100 rounded-lg mb-2"><div class="flex justify-between mb-1"><span class="text-sm font-semibold text-primary">${v.type || 'Visita'}</span><span class="text-[11px] text-slate-400">${v.date}</span></div><p class="text-xs text-slate-600">${v.observation || ''}</p>${v.result ? `<p class="text-[11px] text-slate-500 mt-1 font-medium">Resultado: ${v.result}</p>` : ''}</div>`).join('') : '<p class="text-sm text-slate-400 text-center py-4">Nenhuma visita registrada</p>'}<button id="btn-visit" class="mt-3 w-full bg-primary/10 text-primary py-2 rounded-lg text-sm font-semibold hover:bg-primary/20 transition">+ Registrar Visita</button>`);
      document.getElementById('btn-visit')?.addEventListener('click', () => openVisitModal());
    }
    if (t === 'notas') {
      const notes = getNotes();
      tc.innerHTML = `<div class="space-y-3">${notes.length ? notes.map(n => `<div class="p-4 bg-white rounded-xl border-l-4 ${n.category === 'Visita' ? 'border-l-emerald-500' : n.category === 'Desânimo' ? 'border-l-amber-500' : n.category === 'Falta' ? 'border-l-red-500' : 'border-l-primary'} shadow-sm"><div class="flex justify-between mb-1"><span class="text-[11px] font-medium px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">${n.category}</span><span class="text-[11px] text-slate-400">${n.date}</span></div><p class="text-sm text-slate-700">${n.text}</p></div>`).join('') : '<p class="text-sm text-slate-400 text-center py-6">Nenhuma nota pastoral</p>'}</div>`;
    }
  }

  function openVisitModal() {
    const today = new Date().toISOString().split('T')[0];
    openModal(`<div class="p-5 md:p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-bold">Registrar Visita</h3>
        <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400">close</span></button>
      </div>
      <form id="visit-form" class="space-y-3">
        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Tipo de Visita</label>
          <select id="vf-type" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20">
            <option value="Visita de Consolidação">Visita de Consolidação</option>
            <option value="Visita de Acompanhamento">Visita de Acompanhamento</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Data</label>
          <input id="vf-date" type="date" value="${today}" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Observação</label>
          <textarea id="vf-obs" rows="3" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Descreva como foi a visita..."></textarea>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Resultado</label>
          <select id="vf-result" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20">
            <option value="Realizada">Realizada com sucesso</option>
            <option value="Pessoa ausente">Pessoa ausente</option>
            <option value="Remarcada">Remarcada</option>
            <option value="Recusada">Recusada</option>
          </select>
        </div>
        <button type="submit" class="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 active:scale-[.98] transition-all">Salvar Visita</button>
      </form>
    </div>`);
    document.getElementById('visit-form').onsubmit = e => {
      e.preventDefault();
      store.addVisit({
        personId: p.id,
        authorId: store.currentUser.id,
        date: document.getElementById('vf-date').value,
        type: document.getElementById('vf-type').value,
        observation: document.getElementById('vf-obs').value.trim(),
        result: document.getElementById('vf-result').value
      });
      closeModal();
      toast('Visita registrada!');
      show('visitas');
    };
  }

  show('dados');
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => show(b.dataset.t));
  document.getElementById('btn-note').onclick = () => {
    openModal(`<div class="p-5 md:p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-bold">Nova Nota</h3>
        <button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400">close</span></button>
      </div>
      <form id="note-form" class="space-y-3">
        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Categoria</label>
          <select id="nf-cat" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20">
            <option value="Visita">Visita</option>
            <option value="Acompanhamento">Acompanhamento</option>
            <option value="Desânimo">Desânimo</option>
            <option value="Falta">Falta</option>
            <option value="Outro" selected>Outro</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Texto</label>
          <textarea id="nf-text" rows="3" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Escreva a nota..." required></textarea>
        </div>
        <button type="submit" class="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 active:scale-[.98] transition-all">Salvar Nota</button>
      </form>
    </div>`);
    document.getElementById('note-form').onsubmit = e => {
      e.preventDefault();
      const text = document.getElementById('nf-text').value.trim();
      if (!text) return;
      store.addNote({ personId: p.id, authorId: store.currentUser.id, date: new Date().toISOString().split('T')[0], category: document.getElementById('nf-cat').value, text, visibility: 'leadership' });
      closeModal();
      toast('Nota adicionada!');
      show('notas');
    };
  };

  window.completeCons = () => {
    store.completeConsolidation(p.id);
    toast('Consolidação concluída 🎉');
    show('dados');
  };
}
function card(title, content) { return `<div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100"><h3 class="text-sm font-bold mb-4">${title}</h3>${content}</div>` }
