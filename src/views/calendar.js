import { store } from '../store.js';
import { header, bottomNav, toast, openModal, closeModal } from '../components/ui.js';

export function calendarView() {
    const app = document.getElementById('app');
    const d = new Date();
    let currentMonth = d.getMonth();
    let currentYear = d.getFullYear();

    app.innerHTML = `
  ${header('Calendário', false, store.hasRole('ADMIN', 'SUPERVISOR') ? `<button id="btn-add-event" class="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"><span class="material-symbols-outlined text-lg">add</span></button>` : '')}
  <div class="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
    <div class="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
      <button id="btn-prev-month" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"><span class="material-symbols-outlined text-slate-600">chevron_left</span></button>
      <h2 id="calendar-title" class="text-base font-bold capitalize"></h2>
      <button id="btn-next-month" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"><span class="material-symbols-outlined text-slate-600">chevron_right</span></button>
    </div>
    <div class="px-4 py-2 bg-white grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
      <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
    </div>
    <div id="calendar-grid" class="flex-1 bg-white px-4 pb-4 grid grid-cols-7 gap-1 md:gap-2 auto-rows-fr"></div>
  </div>
  ${bottomNav('calendar')}`;

    const render = () => {
        const title = new Date(currentYear, currentMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        document.getElementById('calendar-title').textContent = title;

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Prepare events
        const allEvents = store.getEvents();
        const cells = store.cells;
        const people = store.people;
        const users = store.users;

        // Create a map of day index to string for matching cell meeting days
        const dayNamesMap = { 0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };

        const isAdminSuper = store.hasRole('ADMIN', 'SUPERVISOR');

        // Evaluate event recurrence rule
        const evaluateEvent = (e, targetDateStr) => {
            if (!e.recurrence || e.recurrence === 'none') return e.date === targetDateStr;
            const evDate = new Date(e.date + 'T12:00:00');
            const targetDate = new Date(targetDateStr + 'T12:00:00');
            if (targetDate < evDate) return false;

            if (e.recurrence === 'weekly') {
                return evDate.getDay() === targetDate.getDay();
            } else if (e.recurrence === 'monthly-date') {
                return evDate.getDate() === targetDate.getDate();
            } else if (e.recurrence === 'monthly-weekday') {
                if (evDate.getDay() !== targetDate.getDay()) return false;
                const getOccurrence = (d) => Math.floor((d.getDate() - 1) / 7);
                return getOccurrence(evDate) === getOccurrence(targetDate);
            } else if (e.recurrence === 'yearly') {
                return evDate.getDate() === targetDate.getDate() && evDate.getMonth() === targetDate.getMonth();
            }
            return false;
        };

        let html = '';

        // Empty prefix days
        for (let i = 0; i < firstDay; i++) {
            html += `<div class="aspect-square bg-slate-50 rounded-lg md:rounded-xl"></div>`;
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayOfWeekIndex = new Date(currentYear, currentMonth, i).getDay();
            const dayName = dayNamesMap[dayOfWeekIndex];

            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            let dayEvents = []; // Collect events to sort

            // 1. Birthdays (All Day)
            const bdays = [...people, ...users].filter(p => p.birthdate && p.birthdate.slice(5) === dateStr.slice(5));
            bdays.forEach(p => {
                dayEvents.push({ sortVal: -1, html: `<div class="w-full truncate text-[9px] md:text-[10px] bg-pink-100 text-pink-700 font-medium px-1 rounded mt-0.5" title="Aniversário: ${p.name}">🎂 ${p.name.split(' ')[0]}</div>` });
            });

            // 2. Cells (Usually evening, but kept generic. Treating as sortVal -2 to float them near top but below birthdays)
            cells.forEach(c => {
                if (c.meetingDay && c.meetingDay.toLowerCase().startsWith(dayName.toLowerCase().slice(0, 3))) {
                    const isCanceled = store.isCellCanceledOnDate(c.id, dateStr) || store.isCellCanceledOnDate('all', dateStr);
                    const isJustified = store.getCellJustifications(c.id).find(j => j.date === dateStr);

                    let bgClass = isCanceled ? 'bg-slate-100 text-slate-500 line-through' : (isJustified ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700');
                    let hoverClass = isAdminSuper || (!isCanceled && !isJustified) ? 'cursor-pointer hover:opacity-75 transition' : '';
                    let clickFn = '';

                    if (isAdminSuper) clickFn = `onclick="window.toggleCalendarCell(event, '${c.id}', '${dateStr}')"`;
                    else if (!isCanceled && !isJustified) clickFn = `onclick="window.calendarCellClick(event, '${c.id}', '${dateStr}')"`;

                    dayEvents.push({ sortVal: -2, html: `<div ${clickFn} class="w-full truncate text-[9px] md:text-[10px] ${bgClass} font-medium px-1 py-0.5 rounded mt-0.5 ${hoverClass}" title="${isCanceled ? 'Cancelada: ' + isCanceled.reason : isJustified ? 'Justificada: ' + isJustified.reason : 'Célula'}">🏠 ${c.name}</div>` });
                }
            });

            // 3. Global Events (All Day & Timed)
            allEvents.forEach(e => {
                if (evaluateEvent(e, dateStr)) {
                    const ex = store.getEventException(e.id, dateStr);
                    if (ex && ex.canceled) return; // Skip if canceled for this day
                    const title = ex && ex.newTitle ? ex.newTitle : e.title;
                    const cColor = e.color || 'blue';
                    const isAllDay = !e.startTime;

                    let clickFn = '', hoverClass = '';
                    if (isAdminSuper) {
                        clickFn = `onclick="window.manageEventClick(event, '${e.id}', '${dateStr}', '${e.recurrence || 'none'}', '${title}')"`;
                        hoverClass = `cursor-pointer hover:bg-${cColor}-200 transition`;
                    }

                    if (isAllDay) {
                        dayEvents.push({ sortVal: 0, html: `<div ${clickFn} class="w-full truncate text-[9px] md:text-[10px] bg-${cColor}-100 text-${cColor}-800 font-medium px-1 py-0.5 rounded mt-0.5 ${hoverClass}" title="${title}">${title}</div>` });
                    } else {
                        // Transform '14:30' into 14.5 for sorting
                        const [h, m] = e.startTime.split(':').map(Number);
                        const sVal = h + (m / 60);
                        dayEvents.push({ sortVal: sVal, html: `<div ${clickFn} class="w-full truncate flex items-center gap-1 text-[9px] md:text-[10px] text-${cColor}-700 font-medium px-1 py-0.5 rounded mt-0.5 ${hoverClass}" title="${e.startTime} - ${title}"><div class="w-1.5 h-1.5 rounded-full bg-${cColor}-500 flex-shrink-0"></div><span class="truncate">${e.startTime} ${title}</span></div>` });
                    }
                }
            });

            // Sort logic: -2 (Cells), -1 (BDays), 0 (AllDay), >0 (Timed chronologically)
            dayEvents.sort((a, b) => a.sortVal - b.sortVal);
            let dayEventsHtml = dayEvents.map(d => d.html).join('');

            html += `<div ${isAdminSuper ? `onclick="window.quickCreateEvent('${dateStr}')" class="aspect-square md:aspect-auto md:min-h-[80px] p-1 md:p-2 border border-slate-100 rounded-lg md:rounded-xl flex flex-col transition hover:border-slate-300 hover:shadow-sm cursor-pointer"` : `class="aspect-square md:aspect-auto md:min-h-[80px] p-1 md:p-2 border border-slate-100 rounded-lg md:rounded-xl flex flex-col transition"`}>
          <div class="flex justify-between items-start mb-1">
            <span class="text-xs md:text-sm font-semibold flex items-center justify-center ${isToday ? 'w-5 h-5 md:w-6 md:h-6 bg-primary text-white rounded-full' : 'text-slate-700 w-5 h-5 md:w-6 md:h-6'}">${i}</span>
          </div>
          <div class="flex-1 overflow-y-auto no-scrollbar space-y-0.5 pointer-events-auto">${dayEventsHtml}</div>
        </div>`;
        }
        document.getElementById('calendar-grid').innerHTML = html;
    };

    render();

    document.getElementById('btn-prev-month').onclick = () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } render(); };
    document.getElementById('btn-next-month').onclick = () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } render(); };

    const addBtn = document.getElementById('btn-add-event');
    if (addBtn) addBtn.onclick = () => eventForm();

    window.quickCreateEvent = (dateStr) => {
        if (!store.hasRole('ADMIN', 'SUPERVISOR')) return;
        eventForm(null, dateStr);
    };

    // Expose functions for inline onclick handler from rendering string
    window.calendarCellClick = (e, cellId, dateStr) => {
        e.stopPropagation();
        cellActionsModal(cellId, dateStr);
    };

    window.toggleCalendarCell = (e, cellId, dateStr) => {
        e.stopPropagation();
        if (store.hasRole('ADMIN', 'SUPERVISOR')) {
            store.toggleCellCancellation(cellId, dateStr, store.currentUser.id);
            calendarView();
        }
    };

    window.manageEventClick = (e, eventId, dateStr, recurrence, currentTitle) => {
        e.stopPropagation();
        const ev = store.events.find(ev => ev.id === eventId);
        if (!ev) return;

        openModal(`<div class="p-6">
        <div class="flex justify-between items-center mb-5"><h3 class="text-base font-bold text-slate-800">Gerenciar Evento</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400 text-xl">close</span></button></div>
        
        <div class="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-base">today</span> Apenas Neste Dia</h4>
            <form id="manage-evt-form" class="space-y-3">
                <div>
                    <label class="text-xs font-semibold text-slate-600 mb-1 block">Título da Ocorrência</label>
                    <div class="flex gap-2">
                        <input id="mef-title" value="${currentTitle}" class="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20"/>
                        <button type="submit" class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Salvar</button>
                    </div>
                </div>
                ${recurrence !== 'none' ? `<button type="button" id="mef-cancel-day" class="w-full bg-amber-50 text-amber-700 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-100 border border-amber-200 transition">Cancelar Evento Apenas Neste Dia</button>` : ''}
            </form>
        </div>

        <div class="p-4 bg-red-50/50 border border-red-100 rounded-xl">
            <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-base">public</span> Evento Completo</h4>
            <div class="space-y-2">
                <button type="button" onclick="window.editGlobalEvent('${eventId}')" class="w-full bg-white text-slate-700 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 border border-slate-200 transition">Editar Regra ou Data do Evento Inteiro</button>
                <button type="button" onclick="window.deleteGlobalEvent('${eventId}')" class="w-full bg-red-50 text-red-700 py-2.5 rounded-lg text-sm font-bold hover:bg-red-100 border border-red-200 transition">Excluir Evento Definitivamente</button>
            </div>
        </div>
        
        </div>`);

        document.getElementById('manage-evt-form').onsubmit = evt => {
            evt.preventDefault();
            const t = document.getElementById('mef-title').value.trim();
            if (!t) return;
            store.setEventException(eventId, dateStr, false, t);
            closeModal(); calendarView();
        };

        const cancelDayBtn = document.getElementById('mef-cancel-day');
        if (cancelDayBtn) {
            cancelDayBtn.onclick = () => {
                store.setEventException(eventId, dateStr, true, '');
                closeModal(); toast('Ocorrência cancelada!'); calendarView();
            };
        }
    };
}

window.editGlobalEvent = (eventId) => {
    closeModal();
    eventForm(eventId);
};

window.deleteGlobalEvent = (eventId) => {
    if (confirm('Tem certeza que deseja apagar este evento para sempre? Ele sumirá de todos os meses do calendário.')) {
        store.deleteEvent(eventId);
        closeModal(); toast('Evento excluído permanentemente.'); calendarView();
    }
};

function eventForm(existingEventId = null, prefilledDateStr = null) {
    const ev = existingEventId ? store.events.find(e => e.id === existingEventId) : null;
    const today = ev ? ev.date : (prefilledDateStr || new Date().toISOString().split('T')[0]);
    const initialTitle = ev ? ev.title : '';
    const initialRecurrence = ev ? (ev.recurrence || 'none') : 'none';
    const sTime = ev && ev.startTime ? ev.startTime : '';
    const eTime = ev && ev.endTime ? ev.endTime : '';
    const evColor = ev && ev.color ? ev.color : 'blue';

    const colors = [
        { id: 'blue', code: 'bg-blue-500' },
        { id: 'red', code: 'bg-red-500' },
        { id: 'green', code: 'bg-green-500' },
        { id: 'purple', code: 'bg-purple-500' },
        { id: 'amber', code: 'bg-amber-500' }
    ];

    openModal(`<div class="p-6">
    <div class="flex justify-between items-center mb-5"><h3 class="text-base font-bold">${ev ? 'Editar Evento' : 'Novo Evento'}</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400 text-xl">close</span></button></div>

    <form id="evt-form" class="space-y-4">
        <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Título do Evento</label><input id="ef-title" value="${initialTitle}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: Culto Jovem, Reunião..."/></div>
        
        <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Data inicial</label><input id="ef-date" type="date" value="${today}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none"/></div>
            <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Repetição</label>
            <select id="ef-recurrence" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none"></select></div>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Início (Opcional)</label><input id="ef-start" type="time" value="${sTime}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none"/></div>
            <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Término (Opcional)</label><input id="ef-end" type="time" value="${eTime}" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none"/></div>
        </div>

        <div>
            <label class="text-xs font-semibold text-slate-600 mb-2 block">Cor</label>
            <div class="flex gap-3">
                ${colors.map(c => `
                    <label class="relative cursor-pointer">
                        <input type="radio" name="evt-color" value="${c.id}" class="peer sr-only" ${evColor === c.id ? 'checked' : ''}>
                        <div class="w-8 h-8 rounded-full ${c.code} flex items-center justify-center ring-2 ring-offset-2 ring-transparent peer-checked:ring-${c.id}-500 transition-all">
                            <span class="material-symbols-outlined text-white text-sm opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                        </div>
                    </label>
                `).join('')}
            </div>
        </div>

        <button type="submit" class="w-full bg-primary text-white py-3 mt-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">${ev ? 'Salvar Edição' : 'Salvar Evento'}</button>
    </form>
    </div>`);

    const updateRecurrenceOptions = () => {
        const dateVal = document.getElementById('ef-date').value;
        if (!dateVal) return;

        const d = new Date(dateVal + 'T12:00:00');
        const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        const wkday = dayNames[d.getDay()];
        const dom = d.getDate();
        const month = monthNames[d.getMonth()];
        const occurrence = Math.floor((dom - 1) / 7) + 1;
        const occText = occurrence === 1 ? '1º' : occurrence === 2 ? '2º' : occurrence === 3 ? '3º' : occurrence === 4 ? '4º' : '5º';

        document.getElementById('ef-recurrence').innerHTML = `
            <option value="none">Não se repete</option>
            <option value="weekly">Semanalmente (Todo(a) ${wkday})</option>
            <option value="monthly-date">Mensalmente (Todo dia ${String(dom).padStart(2, '0')})</option>
            <option value="monthly-weekday">Mensalmente (Todo ${occText} ${wkday})</option>
            <option value="yearly">Anualmente (Todo ${String(dom).padStart(2, '0')} de ${month})</option>
        `;
        document.getElementById('ef-recurrence').value = initialRecurrence;
    };

    document.getElementById('ef-date').addEventListener('change', updateRecurrenceOptions);
    updateRecurrenceOptions(); // Initial load

    document.getElementById('evt-form').onsubmit = e => {
        e.preventDefault();
        const title = document.getElementById('ef-title').value.trim();
        const date = document.getElementById('ef-date').value;
        const recurrence = document.getElementById('ef-recurrence').value;
        const startTime = document.getElementById('ef-start').value;
        const endTime = document.getElementById('ef-end').value;
        const color = document.querySelector('input[name="evt-color"]:checked').value;

        if (!title || !date) { toast('Preencha os campos', 'error'); return; }

        if (ev) {
            store.updateEvent(ev.id, { title, date, recurrence, startTime, endTime, color });
            toast('Evento atualizado!');
        } else {
            store.addEvent({ title, date, recurrence, startTime, endTime, color, authorId: store.currentUser.id });
            toast('Evento criado!');
        }
        closeModal();
        calendarView();
    };
}

function cellActionsModal(cellId, dateStr) {
    const c = store.getCell(cellId);
    if (!c) return;

    // Check if the current user is the leader of this cell or an admin
    const canManage = store.hasRole('ADMIN', 'SUPERVISOR') || c.leaderId === store.currentUser.id;

    let content = `<div class="p-6">
    <div class="flex justify-between items-center mb-5"><h3 class="text-base font-bold">${c.name}</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400 text-xl">close</span></button></div>
    <p class="text-sm text-slate-600 mb-6">Encontro previsto para <strong>${dateStr.split('-').reverse().join('/')}</strong>.</p>
    `;

    if (canManage) {
        const isCanceled = store.isCellCanceledOnDate(c.id, dateStr) || store.isCellCanceledOnDate('all', dateStr);

        content += `
        <div class="space-y-3">
            <a href="#/attendance?cellId=${c.id}&date=${dateStr}" onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition"><span class="material-symbols-outlined text-lg">checklist</span> Fazer Chamada</a>
            
            ${store.hasRole('ADMIN', 'SUPERVISOR') ? (
                isCanceled
                    ? `<button id="btn-undo-cancel" class="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-3 rounded-lg text-sm font-bold hover:bg-emerald-100 transition border border-emerald-200"><span class="material-symbols-outlined text-lg">undo</span> Desfazer Cancelamento</button>`
                    : `<button id="btn-cancel-cell-day" class="w-full flex items-center justify-center gap-2 bg-red-50 text-red-700 py-3 rounded-lg text-sm font-bold hover:bg-red-100 transition border border-red-200"><span class="material-symbols-outlined text-lg">event_busy</span> Cancelar Encontro (Admin)</button>`
            ) : ''}
            
            <button id="btn-justify-cell" class="w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-700 py-3 rounded-lg text-sm font-bold hover:bg-amber-100 transition border border-amber-200"><span class="material-symbols-outlined text-lg">history_edu</span> Justificar Não Realização</button>
        </div>`;
    } else {
        content += `<p class="text-xs text-slate-400 text-center">Apenas o líder desta célula pode realizar ações.</p>`;
    }

    content += `</div>`;
    openModal(content);

    if (canManage) {

        const btnUndo = document.getElementById('btn-undo-cancel');
        if (btnUndo) {
            btnUndo.onclick = () => {
                store.toggleCellCancellation(c.id, dateStr, store.currentUser.id);
                closeModal(); toast('Cancelamento desfeito com sucesso!'); calendarView();
            };
        }

        const btnCancel = document.getElementById('btn-cancel-cell-day');
        if (btnCancel) {
            btnCancel.onclick = () => {
                store.toggleCellCancellation(c.id, dateStr, store.currentUser.id);
                closeModal(); toast('Célula cancelada com sucesso!'); calendarView();
            };
        }

        const btnJustify = document.getElementById('btn-justify-cell');
        if (btnJustify) {
            btnJustify.onclick = () => {
                openModal(`<div class="p-6">
                <div class="flex justify-between items-center mb-5"><h3 class="text-base font-bold">Justificar Falta de Célula</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400 text-xl">close</span></button></div>
                <form id="just-form" class="space-y-4">
                    <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Motivo</label><textarea id="jf-reason" rows="3" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Por que não haverá célula hoje?" required></textarea></div>
                    <button type="submit" class="w-full bg-amber-500 text-white py-3 rounded-lg text-sm font-bold hover:bg-amber-600 transition">Enviar Justificativa</button>
                </form>
                </div>`);

                document.getElementById('just-form').onsubmit = (e) => {
                    e.preventDefault();
                    const reason = document.getElementById('jf-reason').value.trim();
                    store.justifyCellAbsence(cellId, dateStr, reason, store.currentUser.id);
                    closeModal(); toast('Justificativa enviada!');
                    calendarView();
                };
            };
        }
    }
}
