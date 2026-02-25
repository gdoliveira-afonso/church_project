const D = {
    currentUser: null,
    users: [{ id: 'u1', name: 'Administrador', username: 'admin', password: '123456', role: 'ADMIN', avatar: null }],
    people: [], cells: [], attendance: [], pastoralNotes: [], visits: [], events: [], cellCancellations: [], cellJustifications: [], eventExceptions: [],
    forms: [
        { id: 'f-nc', name: 'Novo Convertido', status: 'ativo', showOnLogin: true, icon: 'favorite', color: 'emerald', subtitle: 'Aceitou Jesus? Cadastre-se aqui', personStatus: 'Novo Convertido', fields: [{ name: 'Nome Completo', type: 'text', required: true }, { name: 'Telefone / WhatsApp', type: 'phone', required: true }, { name: 'Email', type: 'email' }, { name: 'Data de Nascimento', type: 'date' }, { name: 'Endereço', type: 'text' }, { name: 'Como conheceu a igreja?', type: 'select', options: ['Indicação', 'Internet', 'Campanha', 'Evento', 'Outro'] }] },
        { id: 'f-rec', name: 'Reconciliação', status: 'ativo', showOnLogin: true, icon: 'handshake', color: 'purple', subtitle: 'Retornando à igreja? Bem-vindo de volta', personStatus: 'Reconciliação', fields: [{ name: 'Nome Completo', type: 'text', required: true }, { name: 'Telefone / WhatsApp', type: 'phone', required: true }, { name: 'Email', type: 'email' }, { name: 'Célula anterior', type: 'text' }, { name: 'Motivo do retorno', type: 'textarea' }] },
        { id: 'f-vis', name: 'Visitante', status: 'ativo', showOnLogin: true, icon: 'waving_hand', color: 'blue', subtitle: 'Primeira vez na igreja? Registre-se', personStatus: 'Visitante', fields: [{ name: 'Nome Completo', type: 'text', required: true }, { name: 'Telefone / WhatsApp', type: 'phone', required: true }, { name: 'Email', type: 'email' }, { name: 'Como conheceu a igreja?', type: 'select', options: ['Indicação de amigo', 'Internet/Redes Sociais', 'Passou na frente', 'Evento', 'Outro'] }] },
        { id: 'f-oracao', name: 'Pedido de Oração', status: 'ativo', showOnLogin: false, icon: 'volunteer_activism', color: 'orange', subtitle: 'Envie seu pedido de oração', fields: [{ name: 'Nome', type: 'text', required: true }, { name: 'Pedido', type: 'textarea', required: true }] }
    ],
    tracks: [
        { id: 't-waterBaptism', name: 'Batismo nas Águas', category: 'espiritual', icon: 'water_drop', color: 'blue' },
        { id: 't-holySpiritBaptism', name: 'Batismo com o Espírito Santo', category: 'espiritual', icon: 'local_fire_department', color: 'orange' },
        { id: 't-leadersSchool', name: 'Escola de Líderes', category: 'espiritual', icon: 'school', color: 'purple' },
        { id: 't-encounter', name: 'Encontro com Deus', category: 'retiros', icon: 'volunteer_activism', color: 'emerald' }
    ],
    triageQueue: [], notifications: []
};
class Store {
    constructor() {
        const s = localStorage.getItem('crm_pastoral_prod');
        try {
            Object.assign(this, s ? JSON.parse(s) : JSON.parse(JSON.stringify(D)))
        } catch (e) {
            Object.assign(this, JSON.parse(JSON.stringify(D)))
        }

        this.users.forEach(u => { if (!u.username && u.email) u.username = u.email.split('@')[0].toLowerCase(); }); // Ensure default tracks array exists
        if (!this.tracks) this.tracks = JSON.parse(JSON.stringify(D.tracks));

        // Migration to dynamic tracks
        this.people.forEach(p => {
            if (!p.tracksData) p.tracksData = {};
            if (p.spiritual) {
                if (p.spiritual.waterBaptism) p.tracksData['t-waterBaptism'] = true;
                if (p.spiritual.holySpiritBaptism) p.tracksData['t-holySpiritBaptism'] = true;
                if (p.spiritual.leadersSchool) p.tracksData['t-leadersSchool'] = true;
                delete p.spiritual; // Clean up old structure
            }
            if (p.retreats) {
                if (p.retreats.encounter?.done) p.tracksData['t-encounter'] = true;
                delete p.retreats; // Clean up old structure
            }
        });
        this.save();
    }
    save() { localStorage.setItem('crm_pastoral_prod', JSON.stringify(this)) }
    reset() { localStorage.removeItem('crm_pastoral_prod'); Object.assign(this, JSON.parse(JSON.stringify(D))); this.save() }
    // Auth
    login(uName, p) { const u = this.users.find(x => x.username === uName && x.password === p); if (u) { this.currentUser = u; this.save() } return u }
    logout() { this.currentUser = null; this.save() }
    isLoggedIn() { return !!this.currentUser }
    hasRole(...r) { return this.currentUser && r.includes(this.currentUser.role) }
    // Users
    getUser(id) { return this.users.find(u => u.id === id) }
    addUser(u) { u.id = 'u' + Date.now(); this.users.push(u); this.save(); return u }
    updateUser(id, d) { const u = this.getUser(id); if (u) { Object.assign(u, d); if (this.currentUser?.id === id) Object.assign(this.currentUser, d); this.save() } return u }
    deleteUser(id) { if (this.currentUser?.id === id) return false; this.users = this.users.filter(u => u.id !== id); this.save(); return true }
    // People
    getPerson(id) { return this.people.find(p => p.id === id) }
    addPerson(p) {
        p.id = 'p' + Date.now();
        p.createdAt = new Date().toISOString();
        if (p.status === 'Novo Convertido') {
            p.consolidation = { status: 'PENDING', startDate: new Date().toISOString() };
        }
        this.people.push(p);
        this.save();
        return p;
    }
    updatePerson(id, d) {
        const p = this.getPerson(id);
        if (p) {
            const wasConvert = p.status === 'Novo Convertido';
            Object.assign(p, d);
            const isConvert = p.status === 'Novo Convertido';

            if (!wasConvert && isConvert && !p.consolidation) {
                p.consolidation = { status: 'PENDING', startDate: new Date().toISOString() };
            }
        }
        this.save();
    }
    completeConsolidation(id) {
        const p = this.getPerson(id);
        if (p && p.consolidation) {
            p.consolidation.status = 'COMPLETED';
            p.consolidation.completedDate = new Date().toISOString();
            this.save();
        }
    }
    deletePerson(id) { this.people = this.people.filter(p => p.id !== id); this.save() }
    // Cells
    getVisibleCells() { return this.hasRole('ADMIN', 'SUPERVISOR') ? this.cells : this.cells.filter(c => c.leaderId === this.currentUser?.id || c.viceLeaderId === this.currentUser?.id) }
    getCell(id) { return this.cells.find(c => c.id === id) }
    getCellMembers(cid) { return this.people.filter(p => p.cellId === cid) }
    addCell(c) { c.id = 'c' + Date.now(); this.cells.push(c); this.save(); return c }
    updateCell(id, d) { const c = this.getCell(id); if (c) Object.assign(c, d); this.save() }
    deleteCell(id) { this.cells = this.cells.filter(c => c.id !== id); this.people.forEach(p => { if (p.cellId === id) p.cellId = null }); this.save() }
    // Visits
    getVisitsForPerson(pid) { return this.visits.filter(v => v.personId === pid).sort((a, b) => b.date.localeCompare(a.date)) }
    addVisit(v) {
        v.id = 'v' + Date.now();
        this.visits.push(v);

        // Automatic Consolidation Trigger
        if (v.type === 'Visita de Consolidação') {
            const p = this.getPerson(v.personId);
            if (p && p.status === 'Novo Convertido') {
                if (!p.consolidation) p.consolidation = { startDate: new Date().toISOString() };
                if (p.consolidation.status !== 'COMPLETED') {
                    p.consolidation.status = 'IN_PROGRESS';
                }
            }
        }
        this.save();
    }
    // Notes
    getNotesForPerson(pid) { return this.pastoralNotes.filter(n => n.personId === pid).sort((a, b) => b.date.localeCompare(a.date)) }
    addNote(n) { n.id = 'n' + Date.now(); this.pastoralNotes.push(n); this.save() }
    // Attendance
    getAttendanceForCell(cid) { return this.attendance.filter(a => a.cellId === cid).sort((a, b) => b.date.localeCompare(a.date)) }
    getAttendanceForPerson(pid) {
        const r = []; this.attendance.forEach(a => a.records.forEach(x => { if (x.personId === pid) r.push({ date: a.date, status: x.status, cellId: a.cellId }) }));
        return r.sort((a, b) => b.date.localeCompare(a.date));
    }
    addAttendance(a) {
        const existing = this.attendance.findIndex(x => x.cellId === a.cellId && x.date === a.date);
        if (existing > -1) {
            this.attendance[existing].records = a.records;
            if (a.notes !== undefined) this.attendance[existing].notes = a.notes;
        } else {
            a.id = 'a' + Date.now();
            this.attendance.push(a);
        }
        this.save();
    }

    // Calendar Events & Exceptions
    getEvents() { return this.events || [] }
    addEvent(e) {
        e.id = 'ev' + Date.now();
        if (!e.color) e.color = 'blue';
        if (!this.events) this.events = [];
        this.events.push(e);
        this.save();
        return e;
    }
    updateEvent(id, updates) {
        if (!this.events) return;
        const ev = this.events.find(e => e.id === id);
        if (ev) { Object.assign(ev, updates); this.save(); }
    }
    deleteEvent(id) {
        if (!this.events) return;
        const index = this.events.findIndex(e => e.id === id);
        if (index > -1) this.events.splice(index, 1);

        if (this.eventExceptions) {
            this.eventExceptions = this.eventExceptions.filter(ex => ex.eventId !== id);
        }
        this.save();
    }

    getEventException(eventId, date) {
        return (this.eventExceptions || []).find(ex => ex.eventId === eventId && ex.date === date);
    }
    setEventException(eventId, date, canceled, newTitle) {
        if (!this.eventExceptions) this.eventExceptions = [];
        this.eventExceptions = this.eventExceptions.filter(ex => !(ex.eventId === eventId && ex.date === date));
        this.eventExceptions.push({ id: 'ex' + Date.now(), eventId, date, canceled: !!canceled, newTitle: newTitle || '' });
        this.save();
    }

    cancelCellDay(cellId, date, reason, authorId) {
        if (!this.cellCancellations) this.cellCancellations = [];
        this.cellCancellations.push({ id: 'cc' + Date.now(), cellId, date, reason, authorId });
        this.save();
    }
    removeCellCancellation(id) {
        if (!this.cellCancellations) this.cellCancellations = [];
        this.cellCancellations = this.cellCancellations.filter(c => c.id !== id);
        this.save();
    }
    toggleCellCancellation(cellId, date, authorId) {
        if (!this.cellCancellations) this.cellCancellations = [];
        const existing = this.cellCancellations.find(c => c.cellId === cellId && c.date === date);
        if (existing) {
            this.removeCellCancellation(existing.id);
        } else {
            this.cancelCellDay(cellId, date, 'Cancelado no Calendário', authorId);
        }
    }
    isCellCanceledOnDate(cellId, date) {
        if (!this.cellCancellations) return false;
        return this.cellCancellations.some(c => c.cellId === cellId && c.date === date);
    }
    addCellJustification(j) {
        if (!this.cellJustifications) this.cellJustifications = [];
        j.id = 'cj' + Date.now();
        this.cellJustifications.push(j);
        this.save();
        return j;
    }
    getCellJustifications(cellId) {
        if (!this.cellJustifications) return [];
        return this.cellJustifications.filter(j => j.cellId === cellId).sort((a, b) => b.date.localeCompare(a.date));
    }

    // Tracks (Spiritual & Retreats)
    addTrack(t) {
        if (!this.tracks) this.tracks = [];
        t.id = 't-' + Date.now();
        this.tracks.push(t);
        this.save();
        return t;
    }
    updateTrack(id, d) {
        if (!this.tracks) return;
        const t = this.tracks.find(x => x.id === id);
        if (t) { Object.assign(t, d); this.save(); }
    }
    deleteTrack(id) {
        if (!this.tracks) return;
        this.tracks = this.tracks.filter(t => t.id !== id);
        this.save();
    }

    // Notifications Engine
    getNotifications() {
        if (!this.currentUser) return [];
        const alerts = [];
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const todayDayStr = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
        const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const currentDayName = daysOfWeek[now.getDay()];
        const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);

        // 1. Birthdays
        this.people.forEach(p => {
            if (p.birthdate && p.birthdate.substring(5) === todayDayStr || p.birthdate && p.birthdate.substring(5).replace('-', '/') === todayDayStr || p.birthdate && p.birthdate.split('-').slice(1).reverse().join('/') === todayDayStr) {
                // Determine visibility
                const canSee = this.hasRole('ADMIN', 'SUPERVISOR') || this.cells.some(c => (c.leaderId === this.currentUser.id || c.viceLeaderId === this.currentUser.id) && c.id === p.cellId);
                if (canSee) {
                    alerts.push({ id: `bday-${p.id}-${todayStr}`, type: 'cake', color: 'pink', title: 'Aniversário', text: `Hoje é o calendário de ${p.name}!`, action: `#/profile?id=${p.id}`, timestamp: now.getTime() });
                }
            }
        });

        // 2. New Events
        if (this.events) {
            this.events.forEach(e => {
                const createdAt = parseInt(e.id.substring(2));
                if (createdAt && (now.getTime() - createdAt) < 3 * 86400000) {
                    alerts.push({ id: `ev-${e.id}`, type: 'event', color: 'blue', title: 'Novo Evento', text: `Novo evento marcado: ${e.title}`, action: '#/calendar', timestamp: createdAt });
                }

                // 2B. Events Today
                let isToday = false;
                if (!e.recurrence || e.recurrence === 'none') {
                    isToday = (e.date === todayStr);
                } else {
                    const evDate = new Date(e.date + 'T12:00:00');
                    const targetDate = new Date(todayStr + 'T12:00:00');
                    if (targetDate >= evDate) {
                        if (e.recurrence === 'weekly') {
                            isToday = (evDate.getDay() === targetDate.getDay());
                        } else if (e.recurrence === 'monthly-date') {
                            isToday = (evDate.getDate() === targetDate.getDate());
                        } else if (e.recurrence === 'monthly-weekday') {
                            if (evDate.getDay() === targetDate.getDay()) {
                                const getOccurrence = (d) => Math.floor((d.getDate() - 1) / 7);
                                isToday = (getOccurrence(evDate) === getOccurrence(targetDate));
                            }
                        } else if (e.recurrence === 'yearly') {
                            isToday = (evDate.getDate() === targetDate.getDate() && evDate.getMonth() === targetDate.getMonth());
                        }
                    }
                }

                if (isToday) {
                    const ex = this.getEventException(e.id, todayStr);
                    if (!ex || !ex.canceled) {
                        const title = (ex && ex.newTitle) ? ex.newTitle : e.title;
                        alerts.push({ id: `evtod-${e.id}-${todayStr}`, type: 'today', color: 'indigo', title: 'Evento Hoje', text: `Hoje tem: ${title}`, action: '#/calendar', timestamp: now.getTime() + 10 });
                    }
                }
            });
        }

        // 3. Cell Actions
        const myCells = this.cells.filter(c => c.leaderId === this.currentUser.id || c.viceLeaderId === this.currentUser.id);

        myCells.forEach(c => {
            // A. Cell Day
            if (c.meetingDay === currentDayName) {
                alerts.push({ id: `cday-${c.id}-${todayStr}`, type: 'diversity_3', color: 'primary', title: 'Dia de Célula', text: `Hoje é dia da sua célula (${c.name}). Faça a chamada!`, action: '#/attendance', timestamp: now.getTime() });
            }

            const members = this.getCellMembers(c.id);
            members.forEach(p => {
                // B. New Member
                const createdAt = p.createdAt ? new Date(p.createdAt).getTime() : parseInt(p.id.substring(1));
                if (createdAt > threeDaysAgo.getTime()) {
                    alerts.push({ id: `nmem-${p.id}`, type: 'person_add', color: 'emerald', title: 'Novo Integrante', text: `${p.name} ingressou na sua célula!`, action: `#/profile?id=${p.id}`, timestamp: createdAt });
                }

                // C. Consecutive Absences (3x)
                const att = this.getAttendanceForPerson(p.id);
                if (att.length >= 3) {
                    const last3 = att.slice(0, 3);
                    if (last3.every(a => a.status === 'absent')) {
                        alerts.push({ id: `abs-${p.id}-${last3[0].date}`, type: 'warning', color: 'red', title: 'Alerta de Frequência', text: `${p.name} faltou na célula 3 vezes seguidas.`, action: `#/profile?id=${p.id}`, timestamp: new Date(last3[0].date).getTime() });
                    }
                }
            });
        });

        // Sort by newest and filter out read notifications
        return alerts
            .filter(a => !(this.readNotifs || []).includes(a.id))
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    markNotifRead(id) {
        if (!this.readNotifs) this.readNotifs = [];
        if (!this.readNotifs.includes(id)) {
            this.readNotifs.push(id);
            this.save();
        }
    }

    markAllNotifsRead() {
        if (!this.currentUser) return;
        const currentNotifs = this.getNotifications();
        if (!this.readNotifs) this.readNotifs = [];
        currentNotifs.forEach(n => {
            if (!this.readNotifs.includes(n.id)) this.readNotifs.push(n.id);
        });
        this.save();
    }

    // Metrics
    getMetrics() {
        let relevantPeople = this.people;
        let relevantCells = this.cells;

        if (!this.hasRole('ADMIN', 'SUPERVISOR')) {
            const myCellIds = this.cells.filter(c => c.leaderId === this.currentUser?.id || c.viceLeaderId === this.currentUser?.id).map(c => c.id);
            relevantPeople = this.people.filter(p => myCellIds.includes(p.cellId));
            relevantCells = this.cells.filter(c => myCellIds.includes(c.id));
        }

        const t = relevantPeople.length;
        if (!t) return { total: 0, waterBaptism: 0, holySpirit: 0, school: 0, encounter: 0, noVisit: 0, zeroVisits: 0, cells: relevantCells.length, newConverts: 0, reconciliations: 0, delayedConsolidations: 0, actionLists: { noVisit: [], pendingBaptism: [], delayedConsolidation: [], reconciliations: [] } };

        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
        const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000);

        let wb = 0, hs = 0, sc = 0, en = 0, nv = 0, zv = 0, nc = 0, rc = 0, dc = 0;
        let actionLists = { noVisit: [], pendingBaptism: [], delayedConsolidation: [], reconciliations: [] };

        relevantPeople.forEach(p => {
            const td = p.tracksData || {};
            if (td['t-waterBaptism']) wb++; else actionLists.pendingBaptism.push(p);
            if (td['t-holySpiritBaptism']) hs++;
            if (td['t-leadersSchool']) sc++;
            if (td['t-encounter']) en++;

            const pv = this.getVisitsForPerson(p.id);
            if (!pv.length) {
                zv++;
            } else {
                const ago60 = new Date(now.getTime() - 60 * 86400000);
                const lastV = Math.max(...pv.map(v => new Date(v.date).getTime()));
                if (lastV < ago60.getTime()) {
                    nv++; actionLists.noVisit.push(p);
                }
            }

            if (p.status === 'Novo Convertido') {
                nc++;
                if (p.consolidation && ['PENDING', 'IN_PROGRESS'].includes(p.consolidation.status)) {
                    const consolidationStartDate = new Date(p.consolidation.startDate);
                    if (consolidationStartDate < fifteenDaysAgo) {
                        dc++;
                        actionLists.delayedConsolidation.push(p);
                    }
                }
            } else if (p.status === 'Reconciliação') {
                rc++;
                actionLists.reconciliations.push(p);
            }
        });
        return {
            total: t,
            waterBaptism: Math.round(wb / t * 100),
            holySpirit: Math.round(hs / t * 100),
            school: Math.round(sc / t * 100),
            encounter: Math.round(en / t * 100),
            noVisit: nv,
            zeroVisits: zv,
            cells: relevantCells.length,
            newConverts: nc,
            reconciliations: rc,
            delayedConsolidations: dc,
            actionLists
        };
    }

    resetSystem() {
        if (this.currentUser?.role !== 'ADMIN') return;
        localStorage.clear();
        window.location.href = '/';
        window.location.reload();
    }
}
export const store = new Store();
