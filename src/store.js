const D = {
    currentUser: null,
    users: [{ id: 'u1', name: 'Administrador', email: 'admin@igreja.com', password: '123456', role: 'ADMIN', avatar: null }],
    people: [], cells: [], attendance: [], pastoralNotes: [], visits: [], events: [], cellCancellations: [], cellJustifications: [], eventExceptions: [],
    forms: [
        { id: 'f-nc', name: 'Novo Convertido', status: 'ativo', showOnLogin: true, icon: 'favorite', color: 'emerald', subtitle: 'Aceitou Jesus? Cadastre-se aqui', personStatus: 'Novo Convertido', fields: [{ name: 'Nome Completo', type: 'text', required: true }, { name: 'Telefone / WhatsApp', type: 'phone', required: true }, { name: 'Email', type: 'email' }, { name: 'Data de Nascimento', type: 'date' }, { name: 'Endereço', type: 'text' }, { name: 'Como conheceu a igreja?', type: 'select', options: ['Indicação', 'Internet', 'Campanha', 'Evento', 'Outro'] }] },
        { id: 'f-rec', name: 'Reconciliação', status: 'ativo', showOnLogin: true, icon: 'handshake', color: 'purple', subtitle: 'Retornando à igreja? Bem-vindo de volta', personStatus: 'Reconciliação', fields: [{ name: 'Nome Completo', type: 'text', required: true }, { name: 'Telefone / WhatsApp', type: 'phone', required: true }, { name: 'Email', type: 'email' }, { name: 'Célula anterior', type: 'text' }, { name: 'Motivo do retorno', type: 'textarea' }] },
        { id: 'f-vis', name: 'Visitante', status: 'ativo', showOnLogin: true, icon: 'waving_hand', color: 'blue', subtitle: 'Primeira vez na igreja? Registre-se', personStatus: 'Visitante', fields: [{ name: 'Nome Completo', type: 'text', required: true }, { name: 'Telefone / WhatsApp', type: 'phone', required: true }, { name: 'Email', type: 'email' }, { name: 'Como conheceu a igreja?', type: 'select', options: ['Indicação de amigo', 'Internet/Redes Sociais', 'Passou na frente', 'Evento', 'Outro'] }] },
        { id: 'f-oracao', name: 'Pedido de Oração', status: 'ativo', showOnLogin: false, icon: 'volunteer_activism', color: 'orange', subtitle: 'Envie seu pedido de oração', fields: [{ name: 'Nome', type: 'text', required: true }, { name: 'Pedido', type: 'textarea', required: true }] }
    ],
    triageQueue: [], notifications: []
};
class Store {
    constructor() { const s = localStorage.getItem('crm_pastoral_prod'); try { Object.assign(this, s ? JSON.parse(s) : JSON.parse(JSON.stringify(D))) } catch (e) { Object.assign(this, JSON.parse(JSON.stringify(D))) } }
    save() { localStorage.setItem('crm_pastoral_prod', JSON.stringify(this)) }
    reset() { localStorage.removeItem('crm_pastoral_prod'); Object.assign(this, JSON.parse(JSON.stringify(D))); this.save() }
    // Auth
    login(e, p) { const u = this.users.find(x => x.email === e && x.password === p); if (u) { this.currentUser = u; this.save() } return u }
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
    addPerson(p) { p.id = 'p' + Date.now(); this.people.push(p); this.save(); return p }
    updatePerson(id, d) { const p = this.getPerson(id); if (p) Object.assign(p, d); this.save() }
    deletePerson(id) { this.people = this.people.filter(p => p.id !== id); this.save() }
    // Cells
    getCell(id) { return this.cells.find(c => c.id === id) }
    getCellMembers(cid) { return this.people.filter(p => p.cellId === cid) }
    addCell(c) { c.id = 'c' + Date.now(); this.cells.push(c); this.save(); return c }
    updateCell(id, d) { const c = this.getCell(id); if (c) Object.assign(c, d); this.save() }
    deleteCell(id) { this.cells = this.cells.filter(c => c.id !== id); this.people.forEach(p => { if (p.cellId === id) p.cellId = null }); this.save() }
    // Visits
    getVisitsForPerson(pid) { return this.visits.filter(v => v.personId === pid).sort((a, b) => b.date.localeCompare(a.date)) }
    addVisit(v) { v.id = 'v' + Date.now(); this.visits.push(v); this.save() }
    // Notes
    getNotesForPerson(pid) { return this.pastoralNotes.filter(n => n.personId === pid).sort((a, b) => b.date.localeCompare(a.date)) }
    addNote(n) { n.id = 'n' + Date.now(); this.pastoralNotes.push(n); this.save() }
    // Attendance
    getAttendanceForCell(cid) { return this.attendance.filter(a => a.cellId === cid).sort((a, b) => b.date.localeCompare(a.date)) }
    getAttendanceForPerson(pid) {
        const r = []; this.attendance.forEach(a => a.records.forEach(x => { if (x.personId === pid) r.push({ date: a.date, status: x.status, cellId: a.cellId }) }));
        return r.sort((a, b) => b.date.localeCompare(a.date));
    }
    addAttendance(a) { a.id = 'a' + Date.now(); this.attendance.push(a); this.save() }

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
        if (!this.cellCancellations) return null;
        return this.cellCancellations.find(c => (c.cellId === cellId || c.cellId === 'all') && c.date === date);
    }

    justifyCellAbsence(cellId, date, reason, authorId) {
        if (!this.cellJustifications) this.cellJustifications = [];
        this.cellJustifications.push({ id: 'cj' + Date.now(), cellId, date, reason, authorId });
        this.save();
    }
    getCellJustifications(cellId) {
        if (!this.cellJustifications) return [];
        return this.cellJustifications.filter(j => j.cellId === cellId).sort((a, b) => b.date.localeCompare(a.date));
    }

    // Metrics
    getMetrics() {
        const t = this.people.length;
        if (!t) return { total: 0, waterBaptism: 0, holySpirit: 0, school: 0, encounter: 0, noVisit60: 0, zeroVisits: 0, cells: this.cells.length, newConverts: 0, reconciliations: 0 };
        let wb = 0, hs = 0, sc = 0, en = 0, nv = 0, zv = 0; const ago = new Date(); ago.setDate(ago.getDate() - 60);
        this.people.forEach(p => {
            if (p.spiritual?.waterBaptism) wb++; if (p.spiritual?.holySpiritBaptism) hs++; if (p.spiritual?.leadersSchool) sc++;
            if (p.retreats?.encounter?.done) en++;
            const pv = this.getVisitsForPerson(p.id); if (!pv.length) { zv++; nv++ } else if (new Date(pv[0].date) < ago) nv++;
        });
        return { total: t, waterBaptism: Math.round(wb / t * 100), holySpirit: Math.round(hs / t * 100), school: Math.round(sc / t * 100), encounter: Math.round(en / t * 100), noVisit60: nv, zeroVisits: zv, cells: this.cells.length, newConverts: this.people.filter(p => p.status === 'Novo Convertido').length, reconciliations: this.people.filter(p => p.status === 'Reconciliação').length };
    }
}
export const store = new Store();
