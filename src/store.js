const API_URL = 'http://localhost:3000/api';

const D = {
    currentUser: null,
    users: [], people: [], cells: [], attendance: [], pastoralNotes: [], visits: [], events: [], cellCancellations: [], cellJustifications: [], eventExceptions: [],
    forms: [], tracks: [], triageQueue: [], notifications: []
};

class Store {
    constructor() {
        Object.assign(this, JSON.parse(JSON.stringify(D)));
        this.token = localStorage.getItem('crm_token');

        // localStorage check removed for triage since it's now in backend

        const savedUser = localStorage.getItem('crm_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            // Carrega todos os dados do servidor pro cache em memória (como era no array local)
            this.loadInitialData();
        }
    }

    async apiFetch(endpoint, options = {}) {
        if (!options.headers) options.headers = {};
        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }
        options.headers['Content-Type'] = 'application/json';

        try {
            const res = await fetch(`${API_URL}${endpoint}`, options);
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    this.logout();
                }
                throw new Error(`API Error: ${res.status}`);
            }
            return await res.json();
        } catch (e) {
            console.error('Fetch error:', e);
            throw e;
        }
    }

    async loadInitialData() {
        if (!this.isLoggedIn()) return;
        try {
            this.users = await this.apiFetch('/users');
            this.people = await this.apiFetch('/people');
            this.cells = await this.apiFetch('/cells');
            this.tracks = await this.apiFetch('/dash/tracks');
            this.forms = await this.apiFetch('/forms');
            this.triageQueue = await this.apiFetch('/forms/triage/all');

            const eventsData = await this.apiFetch('/events');
            this.events = eventsData.events || [];
            this.cellCancellations = eventsData.cellCancellations || [];
            this.cellJustifications = eventsData.cellJustifications || [];

            this.pastoralNotes = await this.apiFetch('/dash/notes');
            this.visits = await this.apiFetch('/dash/visits');

            // The following lines are from the provided edit.
            // Note: 'uIdParam' was not defined in the original context.
            // Assuming the intent was to fetch metrics if currentUser exists,
            // but the provided snippet for metrics is incomplete/problematic.
            // I will only apply the notifications part as it's directly related to the instruction.
            // const metricsRes = await this.apiFetch(`/dash/metrics${uIdParam}`);
            // this.metrics = metricsRes;

            if (this.currentUser) {
                this.notifications = await this.apiFetch(`/dash/notifications?userId=${this.currentUser.id}`);
            }

            // Dispatch custom event to notify UI that data is loaded
            window.dispatchEvent(new Event('store-data-loaded'));
        } catch (e) {
            console.error('Falha ao carregar dados da API:', e);
        }
    }

    // Auth
    async login(username, password) {
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) return null;

            const data = await res.json();
            this.token = data.token;
            this.currentUser = data.user;

            localStorage.setItem('crm_token', data.token);
            localStorage.setItem('crm_user', JSON.stringify(data.user));

            await this.loadInitialData();
            return this.currentUser;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        window.location.href = '#/';
        window.location.reload();
    }

    isLoggedIn() { return !!this.currentUser && !!this.token; }
    hasRole(...r) { return this.currentUser && r.includes(this.currentUser.role); }

    save() {
        console.warn('store.save() is deprecated. Please use specific async updating methods like updateForm().');
    }

    // Users
    getUser(id) { return this.users.find(u => u.id === id); }
    async addUser(u) {
        const res = await this.apiFetch('/users', { method: 'POST', body: JSON.stringify(u) });
        this.users.push(res);
        return res;
    }
    async updateUser(id, d) {
        const res = await this.apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(d) });
        const idx = this.users.findIndex(x => x.id === id);
        if (idx !== -1) this.users[idx] = res;
        if (this.currentUser?.id === id) { this.currentUser = res; localStorage.setItem('crm_user', JSON.stringify(res)); }
        return res;
    }
    async deleteUser(id) {
        await this.apiFetch(`/users/${id}`, { method: 'DELETE' });
        this.users = this.users.filter(u => u.id !== id);
        return true;
    }

    // People
    getPerson(id) { return this.people.find(p => p.id === id); }
    async addPerson(p) {
        const res = await this.apiFetch('/people', { method: 'POST', body: JSON.stringify(p) });
        this.people.push(res);
        return res;
    }
    async updatePerson(id, d) {
        const res = await this.apiFetch(`/people/${id}`, { method: 'PUT', body: JSON.stringify(d) });
        const idx = this.people.findIndex(x => x.id === id);
        if (idx !== -1) this.people[idx] = res;
        return res;
    }
    async completeConsolidation(id) {
        return this.updatePerson(id, { consolidationStatus: 'COMPLETED' });
    }
    async deletePerson(id) {
        await this.apiFetch(`/people/${id}`, { method: 'DELETE' });
        this.people = this.people.filter(x => x.id !== id);
    }

    // Cells
    getVisibleCells() { return this.hasRole('ADMIN', 'SUPERVISOR') ? this.cells : this.cells.filter(c => c.leaderId === this.currentUser?.id || c.viceLeaderId === this.currentUser?.id); }
    getCell(id) { return this.cells.find(c => c.id === id); }
    getCellMembers(cid) { return this.people.filter(p => p.cellId === cid); }
    async addCell(c) {
        const res = await this.apiFetch('/cells', { method: 'POST', body: JSON.stringify(c) });
        this.cells.push(res);
        return res;
    }
    async updateCell(id, d) {
        const res = await this.apiFetch(`/cells/${id}`, { method: 'PUT', body: JSON.stringify(d) });
        const idx = this.cells.findIndex(x => x.id === id);
        if (idx !== -1) this.cells[idx] = res;
        return res;
    }
    async deleteCell(id) {
        await this.apiFetch(`/cells/${id}`, { method: 'DELETE' });
        this.cells = this.cells.filter(c => c.id !== id);
        this.people.forEach(p => { if (p.cellId === id) p.cellId = null });
    }

    // Visits
    getVisitsForPerson(pid) { return this.visits.filter(v => v.personId === pid).sort((a, b) => b.date.localeCompare(a.date)); }
    async addVisit(v) {
        v.authorId = this.currentUser.id;
        const res = await this.apiFetch('/dash/visits', { method: 'POST', body: JSON.stringify(v) });
        this.visits.unshift(res);
        this.loadInitialData(); // Para atualizar person status
        return res;
    }

    // Notes
    getNotesForPerson(pid) { return this.pastoralNotes.filter(n => n.personId === pid).sort((a, b) => b.date.localeCompare(a.date)); }
    async addNote(n) {
        n.authorId = this.currentUser.id;
        const res = await this.apiFetch('/dash/notes', { method: 'POST', body: JSON.stringify(n) });
        this.pastoralNotes.unshift(res);
        return res;
    }

    // Attendance
    async loadAttendanceForCell(cid) {
        try {
            return await this.apiFetch(`/cells/${cid}/attendance`);
        } catch (e) { return []; }
    }
    // Simplification para frontend sem grandes mudanças
    getAttendanceForCell(cid) { return []; /* O ideal agora é usar componente assíncrono pro histórico */ }
    getAttendanceForPerson(pid) { return []; /* Será carregado assíncrono quando no profile dela */ }
    async addAttendance(a) {
        await this.apiFetch(`/cells/${a.cellId}/attendance`, { method: 'POST', body: JSON.stringify(a) });
    }

    // Calendar Events & Exceptions
    getEvents() { return this.events || []; }
    async addEvent(e) {
        const res = await this.apiFetch('/events', { method: 'POST', body: JSON.stringify(e) });
        this.events.push(res);
        return res;
    }
    async updateEvent(id, updates) {
        const res = await this.apiFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
        const idx = this.events.findIndex(x => x.id === id);
        if (idx !== -1) this.events[idx] = res;
        return res;
    }
    async deleteEvent(id) {
        await this.apiFetch(`/events/${id}`, { method: 'DELETE' });
        this.events = this.events.filter(e => e.id !== id);
    }
    getEventException(eventId, date) { return null; /* TODO: load array from backend */ }
    async setEventException(eventId, date, canceled, newTitle) {
        // Feature omitida no backend básico para escalar o tempo.
    }

    async toggleCellCancellation(cellId, date, authorId) {
        try {
            const res = await this.apiFetch(`/cells/${cellId}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ date, authorId })
            });
            if (res.canceled) {
                this.cellCancellations.push({ cellId, date, authorId });
            } else {
                this.cellCancellations = this.cellCancellations.filter(c => !(c.cellId === cellId && c.date === date));
            }
        } catch (e) {
            console.error('Error toggling cancellation', e);
        }
    }
    isCellCanceledOnDate(cellId, date) {
        if (!this.cellCancellations) return false;
        return this.cellCancellations.some(c => c.cellId === cellId && c.date === date);
    }
    async justifyCellAbsence(cellId, date, reason, authorId) {
        try {
            const j = await this.apiFetch(`/cells/${cellId}/justify`, {
                method: 'POST',
                body: JSON.stringify({ date, reason, authorId })
            });
            this.cellJustifications.push(j);
            return j;
        } catch (e) {
            console.error('Error justifying absence', e);
            throw e;
        }
    }
    getCellJustifications(cellId) {
        return this.cellJustifications.filter(j => j.cellId === cellId);
    }

    // Tracks (Spiritual & Retreats)
    async addTrack(t) {
        const res = await this.apiFetch('/dash/tracks', { method: 'POST', body: JSON.stringify(t) });
        this.tracks.push(res);
        return res;
    }
    async updateTrack(id, d) {
        const res = await this.apiFetch(`/dash/tracks/${id}`, { method: 'PUT', body: JSON.stringify(d) });
        const idx = this.tracks.findIndex(x => x.id === id);
        if (idx !== -1) this.tracks[idx] = res;
        return res;
    }
    async deleteTrack(id) {
        await this.apiFetch(`/dash/tracks/${id}`, { method: 'DELETE' });
        this.tracks = this.tracks.filter(t => t.id !== id);
    }

    // Forms
    getForm(id) { return this.forms.find(f => f.id === id); }
    async addForm(f) {
        const res = await this.apiFetch('/forms', { method: 'POST', body: JSON.stringify(f) });
        this.forms.push(res);
        return res;
    }
    async updateForm(id, d) {
        const res = await this.apiFetch(`/forms/${id}`, { method: 'PUT', body: JSON.stringify(d) });
        const idx = this.forms.findIndex(x => x.id === id);
        if (idx !== -1) this.forms[idx] = res;
        return res;
    }
    async deleteForm(id) {
        await this.apiFetch(`/forms/${id}`, { method: 'DELETE' });
        this.forms = this.forms.filter(f => f.id !== id);
    }

    // Triage
    async addTriage(t) {
        const res = await this.apiFetch('/forms/triage/new', { method: 'POST', body: JSON.stringify(t) });
        this.triageQueue.unshift(res);
        return res;
    }
    async updateTriage(id, status) {
        const res = await this.apiFetch(`/forms/triage/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
        const idx = this.triageQueue.findIndex(x => x.id === id);
        if (idx !== -1) this.triageQueue[idx] = res;
        return res;
    }
    async deleteTriage(id) {
        await this.apiFetch(`/forms/triage/${id}`, { method: 'DELETE' });
        this.triageQueue = this.triageQueue.filter(t => t.id !== id);
    }

    // Notifications (Usando a base de cache local que montamos)
    getNotifications() { return this.notifications; }

    async markNotificationsAsRead() {
        if (!this.currentUser) return;
        try {
            await this.apiFetch('/dash/notifications/read', {
                method: 'PUT',
                body: JSON.stringify({ userId: this.currentUser.id })
            });
            this.notifications = [];
        } catch (e) {
            console.error('Failed to mark notifications read', e);
        }
    }

    // Reports e Logsará de endpoint próprio futuramente */ }
    markNotifRead(id) { }
    markAllNotifsRead() { return this.markNotificationsAsRead(); }

    // Metrics
    async fetchMetrics() {
        try {
            let url = '/dash/metrics';
            if (!this.hasRole('ADMIN', 'SUPERVISOR') && this.currentUser) {
                url += `?userId=${this.currentUser.id}`;
            }
            return await this.apiFetch(url);
        } catch (e) { return null; }
    }
}

export const store = new Store();
