import { store } from '../store.js';
import { header, bottomNav, toast, openModal, closeModal } from '../components/ui.js';

export async function calendarView() {
    const app = document.getElementById('app');
    const d = new Date();
    let currentMonth = d.getMonth();
    let currentYear = d.getFullYear();

    app.innerHTML = '<div class="flex items-center justify-center p-12 text-slate-400"><span class="material-symbols-outlined animate-spin mr-2">refresh</span> Carregando calendário...</div>';

    // Pre-fetch attendance dates for visible cells to color realized ones
    const visibleCells = store.getVisibleCells();
    for (const c of visibleCells) {
        try {
            const att = await store.loadAttendanceForCell(c.id);
            c.__attendanceCache = att.filter(a => a.records && a.records.length > 0).map(a => a.date);
        } catch (e) { c.__attendanceCache = []; }
    }

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
        const cells = store.getVisibleCells();
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

            let bdays = [...people, ...users].filter(p => p.birthdate && p.birthdate.slice(5) === dateStr.slice(5));
            if (!isAdminSuper) {
                const myCellIds = cells.map(c => c.id);
                bdays = bdays.filter(p => myCellIds.includes(p.cellId) || p.id === store.currentUser?.id);
            }
            bdays.forEach(p => {
                dayEvents.push({ sortVal: -1, html: `<div class="shrink-0 min-h-[18px] w-full truncate flex items-center text-[9px] md:text-[10px] bg-pink-100 text-pink-700 font-medium px-1 rounded mt-0.5" title="Aniversário: ${p.name}"><span>🎂</span><span class="hidden md:inline ml-1">${p.name.split(' ')[0]}</span></div>` });
            });

            // 2. Cells (Usually evening, but kept generic. Treating as sortVal -2 to float them near top but below birthdays)
            cells.forEach(c => {
                if (c.meetingDay && c.meetingDay.toLowerCase().startsWith(dayName.toLowerCase().slice(0, 3))) {
                    const isCanceled = store.isCellCanceledOnDate(c.id, dateStr) || store.isCellCanceledOnDate('all', dateStr);
                    const isJustified = store.getCellJustifications(c.id).find(j => j.date === dateStr);
                    const isRealized = c.__attendanceCache && c.__attendanceCache.includes(dateStr);

                    let bgClass = isCanceled ? 'bg-slate-100 text-slate-500 line-through' : (isJustified ? 'bg-amber-100 text-amber-700' : (isRealized ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-700'));
                    let hoverClass = isAdminSuper || (!isCanceled && !isJustified) ? 'cursor-pointer hover:opacity-75 transition' : '';
                    let clickFn = '';

                    if (isAdminSuper) clickFn = `onclick="window.toggleCalendarCell(event, '${c.id}', '${dateStr}')"`;
                    else if (!isCanceled && !isJustified) clickFn = `onclick="window.calendarCellClick(event, '${c.id}', '${dateStr}')"`;

                    let sortVal = -2;
                    let displayLabel = `🏠 ${c.name}`;
                    if (c.meetingTime) {
                        const [h, m] = c.meetingTime.split(':').map(Number);
                        if (!isNaN(h) && !isNaN(m)) sortVal = h + (m / 60) - 0.0001;
                        displayLabel = `🏠 ${c.meetingTime} ${c.name}`;
                    }

                    dayEvents.push({ sortVal, html: `<div ${clickFn} class="shrink-0 min-h-[18px] w-full truncate flex items-center text-[9px] md:text-[10px] ${bgClass} font-medium px-1 py-0.5 rounded mt-0.5 ${hoverClass}" title="${isCanceled ? 'Cancelada: ' + isCanceled.reason : isJustified ? 'Justificada: ' + isJustified.reason : 'Célula: ' + c.name}"><span>🏠</span><span class="hidden md:inline ml-1">${displayLabel.replace('🏠 ', '')}</span></div>` });
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
                        const scopeIcon = e.icon || (e.category === 'geral' ? '🌐' : '🏘️');
                        const noteHtml = e.description ? `<span class="day-note hidden text-[11px] text-${cColor}-700 opacity-70 mt-0.5 leading-snug">${e.description.replace(/'/g, "&apos;")}</span>` : '';
                        const tooltipText = `${e.category === 'geral' ? '[Geral] ' : '[Local] '}${title}${e.description ? ' — ' + e.description : ''}`;
                        dayEvents.push({ sortVal: 0, html: `<div ${clickFn} class="shrink-0 min-h-[18px] w-full flex flex-col text-[9px] md:text-[10px] bg-${cColor}-100 text-${cColor}-800 font-medium px-1 py-0.5 rounded mt-0.5 ${hoverClass}" title="${tooltipText}"><span class="truncate"><span>${scopeIcon}</span><span class="hidden md:inline ml-1">${title}</span></span>${noteHtml}</div>` });
                    } else {
                        const [h, m] = e.startTime.split(':').map(Number);
                        const sVal = h + (m / 60);
                        const scopeIcon = e.icon || (e.category === 'geral' ? '🌐' : '');
                        const noteHtml = e.description ? `<span class="day-note hidden text-[11px] text-${cColor}-600 opacity-70 mt-0.5 leading-snug col-span-2">${e.description.replace(/'/g, "&apos;")}</span>` : '';
                        const tooltipText = `${e.category === 'geral' ? '[Geral] ' : '[Local] '}${e.startTime} - ${title}${e.description ? ' — ' + e.description : ''}`;
                        dayEvents.push({ sortVal: sVal, html: `<div ${clickFn} class="shrink-0 min-h-[18px] w-full flex flex-col text-[9px] md:text-[10px] text-${cColor}-700 font-medium px-1 py-0.5 rounded mt-0.5 ${hoverClass}" title="${tooltipText}"><div class="flex items-center gap-1 w-full"><div class="w-1.5 h-1.5 rounded-full bg-${cColor}-500 flex-shrink-0"></div><span class="truncate">${scopeIcon ? `<span>${scopeIcon}</span>` : ''}<span class="${scopeIcon ? 'hidden md:inline ml-1' : ''}">${e.startTime}</span><span class="hidden md:inline ml-1">${title}</span></div>${noteHtml}</div>` });
                    }
                }
            });

            // Sort logic: -2 (Cells), -1 (BDays), 0 (AllDay), >0 (Timed chronologically)
            dayEvents.sort((a, b) => a.sortVal - b.sortVal);
            let dayEventsHtml = dayEvents.map(d => d.html).join('');

            if (!window.__calendarDayCache) window.__calendarDayCache = {};
            window.__calendarDayCache[dateStr] = dayEventsHtml;

            html += `<div onclick="window.openDayModal('${dateStr}')" class="min-h-[60px] md:min-h-[80px] p-1 md:p-2 border border-slate-100 rounded-lg md:rounded-xl flex flex-col transition hover:border-slate-300 hover:shadow-sm cursor-pointer">
          <div class="flex justify-between items-start mb-1 h-5 md:h-6 shrink-0">
            <span class="text-xs md:text-sm font-semibold flex items-center justify-center ${isToday ? 'w-5 h-5 md:w-6 md:h-6 bg-primary text-white rounded-full' : 'text-slate-700 w-5 h-5 md:w-6 md:h-6'}">${i}</span>
          </div>
          <div class="flex-1 overflow-y-auto w-full no-scrollbar flex flex-col gap-0.5 pointer-events-auto">${dayEventsHtml}</div>
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

    window.openDayModal = (dateStr) => {
        const evHtml = window.__calendarDayCache?.[dateStr];
        const displayDate = dateStr.split('-').reverse().join('/');
        let addBtn = '';
        if (store.hasRole('ADMIN', 'SUPERVISOR')) {
            addBtn = `<div class="mt-4 pt-4 border-t border-slate-100"><button onclick="window.quickCreateEvent('${dateStr}')" class="w-full bg-slate-50 text-slate-700 hover:bg-slate-100 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-slate-200 transition"><span class="material-symbols-outlined text-[18px]">add</span> Criar Novo Evento</button></div>`;
        }

        openModal(`<div class="p-5 md:p-6 w-full max-w-sm mx-auto flex flex-col max-h-[85vh]">
            <div class="flex justify-between items-center mb-5 shrink-0"><h3 class="text-base font-bold text-slate-800 flex items-center gap-2"><span class="material-symbols-outlined text-primary">calendar_today</span> ${displayDate}</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1.5 rounded-full hover:bg-slate-100 transition"><span class="material-symbols-outlined text-slate-400 text-xl flex items-center justify-center">close</span></button></div>
            <div class="day-modal-events flex flex-col gap-2 overflow-y-auto no-scrollbar flex-1 pb-2">
                ${evHtml || '<div class="text-center py-8 text-slate-400"><span class="material-symbols-outlined text-4xl mb-3 opacity-30">event_busy</span><p class="text-[13px] font-medium">Nenhum evento neste dia.</p></div>'}
            </div>
            ${addBtn}
            <style>
              .day-modal-events > div { min-height: 48px !important; padding: 12px 16px !important; border-radius: 12px !important; font-size: 14px !important; margin-top: 0 !important; }
              .day-modal-events .text-\\[9px\\] { font-size: 14px !important; }
              .day-modal-events .md\\:text-\\[10px\\] { font-size: 14px !important; }
              .day-modal-events .w-1\\.5 { width: 12px !important; height: 12px !important; }
              .day-modal-events .gap-1 { gap: 12px !important; }
              .day-modal-events .day-note { display: block !important; font-size: 12px !important; }
              .day-modal-events .truncate { overflow: visible !important; text-overflow: unset !important; white-space: normal !important; }
              .day-modal-events .hidden { display: inline !important; }
            </style>
        </div>`);
    };

    // Expose functions for inline onclick handler from rendering string
    window.calendarCellClick = (e, cellId, dateStr) => {
        e.stopPropagation();
        cellActionsModal(cellId, dateStr);
    };

    window.toggleCalendarCell = async (e, cellId, dateStr) => {
        e.stopPropagation();
        if (store.hasRole('ADMIN', 'SUPERVISOR')) {
            await store.toggleCellCancellation(cellId, dateStr, store.currentUser.id);
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
                        <button type="submit" class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition">Salvar</button>
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

        document.getElementById('manage-evt-form').onsubmit = async evt => {
            evt.preventDefault();
            const t = document.getElementById('mef-title').value.trim();
            if (!t) return;
            await store.setEventException(eventId, dateStr, false, t);
            closeModal(); calendarView();
        };

        const cancelDayBtn = document.getElementById('mef-cancel-day');
        if (cancelDayBtn) {
            cancelDayBtn.onclick = async () => {
                await store.setEventException(eventId, dateStr, true, '');
                closeModal(); toast('Ocorrência cancelada!'); calendarView();
            };
        }
    };
}

window.editGlobalEvent = (eventId) => {
    closeModal();
    eventForm(eventId);
};

window.deleteGlobalEvent = async (eventId) => {
    if (confirm('Tem certeza que deseja apagar este evento para sempre? Ele sumirá de todos os meses do calendário.')) {
        await store.deleteEvent(eventId);
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
    const evScope = ev && ev.category ? ev.category : 'local';
    const evNote = ev && ev.description ? ev.description : '';
    const evIcon = ev && ev.icon ? ev.icon : '';

    const emojis = ['⛪', '📅', '👥', '📍', '📖', '🙏', '💡', '📢', '⚽', '🍕', '☕', '🎁', '✨', '🛠️', '🎓', '🔥', '❤️', '✅', '❌', '🚀'];

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

        <div><label class="text-xs font-semibold text-slate-600 mb-1 block">Nota / Endereço <span class="text-slate-400 font-normal">(Opcional)</span></label><textarea id="ef-note" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Ex: Rua das Flores, 123 — trazer Bíblia...">${evNote}</textarea></div>
        
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

        <div>
            <label class="text-xs font-semibold text-slate-600 mb-2 block">Ícone <span class="text-slate-400 font-normal">(Opcional)</span></label>
            <div class="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto no-scrollbar p-1">
                <label class="relative cursor-pointer">
                    <input type="radio" name="evt-icon" value="" class="peer sr-only" ${evIcon === '' ? 'checked' : ''}>
                    <div class="w-8 h-8 rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center peer-checked:border-primary peer-checked:bg-white transition-all text-slate-400"></div>
                </label>
                ${emojis.map(emoji => `
                    <label class="relative cursor-pointer">
                        <input type="radio" name="evt-icon" value="${emoji}" class="peer sr-only" ${evIcon === emoji ? 'checked' : ''}>
                        <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border-2 border-transparent peer-checked:border-primary peer-checked:bg-white transition-all text-lg">${emoji}</div>
                    </label>
                `).join('')}
            </div>
        </div>

        <div>
            <label class="text-xs font-semibold text-slate-600 mb-2 block">Abrangência</label>
            <div class="grid grid-cols-2 gap-2">
                <label class="relative cursor-pointer">
                    <input type="radio" name="evt-scope" value="local" class="peer sr-only" ${evScope === 'local' ? 'checked' : ''}>
                    <div class="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-slate-200 peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                        <span class="text-lg">🏘️</span>
                        <div><p class="text-xs font-bold text-slate-700">Local</p><p class="text-[10px] text-slate-400">Congregação</p></div>
                    </div>
                </label>
                <label class="relative cursor-pointer">
                    <input type="radio" name="evt-scope" value="geral" class="peer sr-only" ${evScope === 'geral' ? 'checked' : ''}>
                    <div class="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-slate-200 peer-checked:border-purple-500 peer-checked:bg-purple-50 transition-all">
                        <span class="text-lg">🌐</span>
                        <div><p class="text-xs font-bold text-slate-700">Geral</p><p class="text-[10px] text-slate-400">Núcleo</p></div>
                    </div>
                </label>
            </div>
        </div>

        <button type="submit" class="w-full bg-primary text-white py-3 mt-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition">${ev ? 'Salvar Edição' : 'Salvar Evento'}</button>
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

    document.getElementById('evt-form').onsubmit = async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const orig = btn.innerHTML; btn.innerHTML = 'Salvando...'; btn.disabled = true;

        const title = document.getElementById('ef-title').value.trim();
        const note = document.getElementById('ef-note').value.trim();
        const date = document.getElementById('ef-date').value;
        const recurrence = document.getElementById('ef-recurrence').value;
        const startTime = document.getElementById('ef-start').value;
        const endTime = document.getElementById('ef-end').value;
        const color = document.querySelector('input[name="evt-color"]:checked').value;
        const scope = document.querySelector('input[name="evt-scope"]:checked')?.value || 'local';
        const icon = document.querySelector('input[name="evt-icon"]:checked')?.value || null;

        if (!title || !date) { toast('Preencha os campos', 'error'); btn.innerHTML = orig; btn.disabled = false; return; }

        try {
            if (ev) {
                await store.updateEvent(ev.id, { title, description: note, date, recurrence, startTime, endTime, color, category: scope, icon });
                toast('Evento atualizado!');
            } else {
                await store.addEvent({ title, description: note, date, recurrence, startTime, endTime, color, category: scope, icon, authorId: store.currentUser.id });
                toast('Evento criado!');
            }
            closeModal();
            calendarView();
        } catch (err) { toast('Servidor indisponível', 'error'); btn.innerHTML = orig; btn.disabled = false; }
    };
}

function cellActionsModal(cellId, dateStr) {
    const c = store.getCell(cellId);
    if (!c) return;

    // Check if the current user is the leader of this cell or an admin/supervisor or leader of this generation
    const canManage = store.hasRole('ADMIN', 'SUPERVISOR') || c.leaderId === store.currentUser.id || c.viceLeaderId === store.currentUser.id || (store.hasRole('LIDER_GERACAO') && c.generationId === store.currentUser.generationId);

    let content = `<div class="p-6">
    <div class="flex justify-between items-center mb-5"><h3 class="text-base font-bold">${c.name}</h3><button onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="p-1 rounded-full hover:bg-slate-100"><span class="material-symbols-outlined text-slate-400 text-xl">close</span></button></div>
    <p class="text-sm text-slate-600 mb-6">Encontro previsto para <strong>${dateStr.split('-').reverse().join('/')}</strong>.</p>
    <div id="cell-attendance-status" class="mb-4">
       <!-- Conteúdo injetado assincronamente logo abaixo -->
       <div class="animate-pulse flex h-10 bg-slate-100 rounded-lg w-full"></div>
    </div>
    `;

    // Fetch assíncrono do status de Presença ou Justificativa para a data clicada
    store.loadAttendanceForCell(cellId).then(attendanceHistory => {
        const attendanceMatch = attendanceHistory.find(a => a.date === dateStr);
        const statusContainer = document.getElementById('cell-attendance-status');
        if (!statusContainer) return;

        let statusHtml = '';
        const isCanceled = store.isCellCanceledOnDate(c.id, dateStr) || store.isCellCanceledOnDate('all', dateStr);
        const justification = store.getCellJustifications(c.id).find(j => j.date === dateStr);

        if (attendanceMatch && attendanceMatch.records && attendanceMatch.records.length > 0) {
            const presences = attendanceMatch.records.filter(r => r.status === 'present').length;
            statusHtml = `<div class="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-sm">check_circle</span></div>
                <div><p class="text-sm font-bold text-emerald-800">Célula Realizada</p><p class="text-xs text-emerald-600 mt-0.5">${presences} membros presentes registrados.</p></div>
            </div>`;
        } else if (attendanceMatch && attendanceMatch.customFields && attendanceMatch.customFields !== '{}') {
            statusHtml = `<div class="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-sm">monitoring</span></div>
                <div><p class="text-sm font-bold text-blue-800">Métricas Lançadas</p><p class="text-xs text-blue-600 mt-0.5">Apenas dados customizados foram registrados.</p></div>
            </div>`;
        } else if (isCanceled) {
            statusHtml = `<div class="p-3 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-sm">block</span></div>
                <div><p class="text-sm font-bold text-slate-700">Cancelada (Admin/Supervisão)</p><p class="text-xs text-slate-500 mt-0.5">Esse dia não será contabilizado nos relatórios.</p></div>
            </div>`;
        } else if (justification) {
            statusHtml = `<div class="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-sm">history_edu</span></div>
                <div><p class="text-sm font-bold text-amber-800">Célula Justificada</p><p class="text-xs text-amber-700 mt-0.5">"${justification.reason}"</p></div>
            </div>`;
        } else if (dateStr < new Date().toISOString().split('T')[0]) {
            statusHtml = `<div class="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-sm">error</span></div>
                <div><p class="text-sm font-bold text-red-800">Pendente de Chamada/Justificativa</p><p class="text-xs text-red-600 mt-0.5">Dia passado sem relatório preenchido pelo líder.</p></div>
            </div>`;
        } else {
            statusHtml = `<div class="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                 <p class="text-xs font-medium text-blue-700">Célula futura agendada.</p>
             </div>`;
        }
        statusContainer.innerHTML = statusHtml;
    });

    if (canManage) {
        const isCanceled = store.isCellCanceledOnDate(c.id, dateStr) || store.isCellCanceledOnDate('all', dateStr);
        const isFuture = dateStr > new Date().toISOString().split('T')[0];

        content += `
        <div class="space-y-3">
            ${!isFuture ? `<a href="#/attendance?cellId=${c.id}&date=${dateStr}" onclick="document.getElementById('modal-overlay').classList.add('hidden')" class="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-lg text-sm font-bold hover:bg-primary/90 transition"><span class="material-symbols-outlined text-lg">checklist</span> Fazer Chamada</a>` : `<div class="p-3 bg-amber-50 text-amber-700 text-xs text-center rounded-lg border border-amber-100 font-medium">Aguarde a data do encontro para realizar a chamada ou justificar.</div>`}
            
            ${store.hasRole('ADMIN', 'SUPERVISOR') ? (
                isCanceled
                    ? `<button id="btn-undo-cancel" class="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-3 rounded-lg text-sm font-bold hover:bg-emerald-100 transition border border-emerald-200"><span class="material-symbols-outlined text-lg">undo</span> Desfazer Cancelamento</button>`
                    : `<button id="btn-cancel-cell-day" class="w-full flex items-center justify-center gap-2 bg-red-50 text-red-700 py-3 rounded-lg text-sm font-bold hover:bg-red-100 transition border border-red-200"><span class="material-symbols-outlined text-lg">event_busy</span> Cancelar Encontro (Admin)</button>`
            ) : ''}
            
            ${!isFuture ? `<button id="btn-justify-cell" class="w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-700 py-3 rounded-lg text-sm font-bold hover:bg-amber-100 transition border border-amber-200"><span class="material-symbols-outlined text-lg">history_edu</span> Justificar Não Realização</button>` : ''}
        </div>`;
    } else {
        content += `<p class="text-xs text-slate-400 text-center">Você não tem permissões para administrar a ${c.name}, pois não é líder responsável por ela.</p>`;
    }

    content += `</div>`;
    openModal(content);

    if (canManage) {

        const btnUndo = document.getElementById('btn-undo-cancel');
        if (btnUndo) {
            btnUndo.onclick = async () => {
                await store.toggleCellCancellation(c.id, dateStr, store.currentUser.id);
                closeModal(); toast('Cancelamento desfeito com sucesso!'); calendarView();
            };
        }

        const btnCancel = document.getElementById('btn-cancel-cell-day');
        if (btnCancel) {
            btnCancel.onclick = async () => {
                await store.toggleCellCancellation(c.id, dateStr, store.currentUser.id);
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

                document.getElementById('just-form').onsubmit = async (e) => {
                    e.preventDefault();
                    const reason = document.getElementById('jf-reason').value.trim();
                    await store.justifyCellAbsence(cellId, dateStr, reason, store.currentUser.id);
                    closeModal(); toast('Justificativa enviada!');
                    calendarView();
                };
            };
        }
    }
}
