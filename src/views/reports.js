import { store } from '../store.js';
import { header, toast } from '../components/ui.js';

export function reportsView() {
  const app = document.getElementById('app');
  let period = 'month';
  let filterCell = '';
  let filterStatus = '';
  let search = '';

  function computeData() {
    const now = new Date();
    const cutoff = period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1)
      : period === 'quarter' ? new Date(now.getFullYear(), now.getMonth() - 3, 1)
        : period === 'semester' ? new Date(now.getFullYear(), now.getMonth() - 6, 1)
          : period === 'year' ? new Date(now.getFullYear(), 0, 1)
            : new Date(0);

    let people = [...store.people];
    if (filterCell) people = people.filter(p => p.cellId === filterCell);
    if (filterStatus) people = people.filter(p => p.status === filterStatus);
    if (search) { const s = search.toLowerCase(); people = people.filter(p => p.name?.toLowerCase().includes(s)); }

    const total = people.length;
    const inPeriod = people.filter(p => new Date(p.createdAt) >= cutoff);
    const novosConvertidos = inPeriod.filter(p => p.status === 'Novo Convertido').length;
    const reconciliacoes = inPeriod.filter(p => p.status === 'Reconciliação').length;
    const visitantes = inPeriod.filter(p => p.status === 'Visitante').length;
    const batismoAguas = people.filter(p => p.spiritual?.waterBaptism).length;
    const batismoES = people.filter(p => p.spiritual?.holySpiritBaptism).length;
    const escola = people.filter(p => p.spiritual?.leadersSchool).length;
    const encontro = people.filter(p => p.retreats?.encounter?.done).length;

    const pids = new Set(people.map(p => p.id));
    const allVisits = store.visits.filter(v => pids.has(v.personId));
    const visitsInPeriod = allVisits.filter(v => new Date(v.date) >= cutoff);
    const consolidacoes = visitsInPeriod.filter(v => v.type === 'Visita de Consolidação').length;
    const acompanhamentos = visitsInPeriod.filter(v => v.type === 'Visita de Acompanhamento').length;

    const ago60 = new Date(); ago60.setDate(ago60.getDate() - 60);
    const noVisit60 = people.filter(p => { const pv = store.getVisitsForPerson(p.id); return !pv.length || new Date(pv[0].date) < ago60; }).length;
    const zeroVisits = people.filter(p => store.getVisitsForPerson(p.id).length === 0).length;

    const activeCells = store.cells.length;
    const avgMembers = activeCells ? Math.round(people.filter(p => p.cellId).length / activeCells) : 0;

    const attInPeriod = store.attendance.filter(a => new Date(a.date) >= cutoff);
    const totalAttRec = attInPeriod.reduce((s, a) => s + (a.records?.length || 0), 0);
    const presentRec = attInPeriod.reduce((s, a) => s + (a.records?.filter(r => r.status === 'present').length || 0), 0);
    const freqPct = totalAttRec ? Math.round(presentRec / totalAttRec * 100) : 0;

    const periodLabel = period === 'month' ? now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : period === 'quarter' ? 'Últimos 3 meses'
        : period === 'semester' ? 'Últimos 6 meses'
          : period === 'year' ? now.getFullYear().toString()
            : 'Todo o período';

    return {
      people, total, inPeriod, novosConvertidos, reconciliacoes, visitantes, batismoAguas, batismoES, escola, encontro,
      visitsInPeriod, consolidacoes, acompanhamentos, noVisit60, zeroVisits, activeCells, avgMembers, freqPct, presentRec,
      totalAttRec, periodLabel, cutoff, allVisits
    };
  }

  function render() {
    const d = computeData();
    const statuses = [...new Set(store.people.map(p => p.status).filter(Boolean))];

    app.innerHTML = `
    ${header('Relatórios')}
    <div class="flex-1 overflow-y-auto" id="report-content">
      <div class="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-10 py-5 space-y-5">

        <!-- Filters Bar -->
        <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-extrabold flex items-center gap-2"><span class="material-symbols-outlined text-primary">analytics</span>Painel de Relatórios</h2>
              <p class="text-[11px] text-slate-400 mt-0.5">${d.periodLabel} • ${d.total} membros${filterCell ? ' • Célula filtrada' : ''}${filterStatus ? ' • ' + filterStatus : ''}</p>
            </div>
            <div class="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 shrink-0" id="period-tabs">
              ${[['month', 'Mês'], ['quarter', 'Tri'], ['semester', 'Sem'], ['year', 'Ano'], ['all', 'Tudo']].map(([v, l]) =>
      `<button class="period-btn px-2.5 py-1.5 rounded-md text-[11px] font-bold transition ${period === v ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}" data-period="${v}">${l}</button>`
    ).join('')}
            </div>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <div class="relative flex-1">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">search</span>
              <input id="f-search" type="text" value="${search}" placeholder="Buscar por nome..." class="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"/>
            </div>
            <select id="f-cell" class="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-w-[140px]">
              <option value="">Todas as células</option>
              ${store.cells.map(c => `<option value="${c.id}" ${filterCell === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
            <select id="f-status" class="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-w-[140px]">
              <option value="">Todos os status</option>
              ${statuses.map(s => `<option value="${s}" ${filterStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          ${kpi('favorite', 'Convertidos', d.novosConvertidos, 'emerald')}
          ${kpi('handshake', 'Reconciliações', d.reconciliacoes, 'purple')}
          ${kpi('groups', 'Visitantes', d.visitantes, 'blue')}
          ${kpi('home_health', 'Visitas', d.visitsInPeriod.length, 'amber')}
          ${kpi('diversity_1', 'Consolidações', d.consolidacoes, 'teal')}
          ${kpi('follow_the_signs', 'Acompanham.', d.acompanhamentos, 'cyan')}
          ${kpi('local_fire_department', 'Esp. Santo', d.batismoES, 'orange')}
          ${kpi('water_drop', 'Batizados', d.batismoAguas, 'blue')}
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <!-- Spiritual Health -->
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 class="text-sm font-bold flex items-center gap-2 mb-4"><span class="material-symbols-outlined text-primary text-lg">monitoring</span>Saúde Espiritual <span class="text-[10px] text-slate-400 font-normal ml-auto">${d.total} membros</span></h3>
            <div class="space-y-3">
              ${progressBar('Batismo nas Águas', d.batismoAguas, d.total, '#3B82F6')}
              ${progressBar('Batismo Esp. Santo', d.batismoES, d.total, '#F97316')}
              ${progressBar('Escola de Líderes', d.escola, d.total, '#8B5CF6')}
              ${progressBar('Encontro com Deus', d.encontro, d.total, '#10B981')}
            </div>
          </div>

          <!-- Frequency & Cells -->
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 class="text-sm font-bold flex items-center gap-2 mb-4"><span class="material-symbols-outlined text-primary text-lg">groups</span>Frequência & Células</h3>
            <div class="grid grid-cols-2 gap-3">
              <div class="text-center p-4 bg-gradient-to-br from-blue-50 to-primary/5 rounded-xl border border-blue-100/50">
                <p class="text-3xl font-extrabold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">${d.freqPct}%</p>
                <p class="text-[10px] text-slate-600 mt-1 font-bold">Frequência Média</p>
                <p class="text-[9px] text-slate-400">${d.presentRec}/${d.totalAttRec} presenças</p>
              </div>
              <div class="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100/30 rounded-xl border border-purple-100/50">
                <p class="text-3xl font-extrabold text-purple-600">${d.activeCells}</p>
                <p class="text-[10px] text-slate-600 mt-1 font-bold">Células Ativas</p>
                <p class="text-[9px] text-slate-400">~${d.avgMembers} membros/célula</p>
              </div>
              <div class="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100/30 rounded-xl border border-amber-100/50">
                <p class="text-3xl font-extrabold text-amber-500">${d.noVisit60}</p>
                <p class="text-[10px] text-slate-600 mt-1 font-bold">Sem Visita 60d</p>
                <p class="text-[9px] text-slate-400">precisam de atenção</p>
              </div>
              <div class="text-center p-4 bg-gradient-to-br from-red-50 to-red-100/30 rounded-xl border border-red-100/50">
                <p class="text-3xl font-extrabold text-red-500">${d.zeroVisits}</p>
                <p class="text-[10px] text-slate-600 mt-1 font-bold">Zero Visitas</p>
                <p class="text-[9px] text-slate-400">nunca visitados</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Table -->
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h3 class="text-sm font-bold flex items-center gap-2"><span class="material-symbols-outlined text-primary text-lg">table_chart</span>Relatório Detalhado</h3>
            <div class="flex gap-1.5">
              ${[['members', 'person', 'Membros'], ['cells', 'diversity_3', 'Células'], ['visits', 'home_health', 'Visitas'], ['attendance', 'event_available', 'Frequência']].map(([v, ic, l]) =>
      `<button class="report-tab flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${v === 'members' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}" data-tab="${v}"><span class="material-symbols-outlined text-sm">${ic}</span>${l}</button>`
    ).join('')}
            </div>
          </div>
          <div id="report-table" class="overflow-x-auto"></div>
        </div>

        <!-- Export -->
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 class="text-sm font-bold flex items-center gap-2 mb-4"><span class="material-symbols-outlined text-primary text-lg">download</span>Exportar Relatório</h3>
          <div class="max-w-sm mx-auto">
            <button id="exp-pdf" class="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white py-3.5 rounded-xl text-sm font-bold hover:from-red-600 hover:to-red-700 active:scale-[.98] transition-all shadow-md shadow-red-200/50"><span class="material-symbols-outlined text-lg">picture_as_pdf</span>Gerar Relatório PDF</button>
          </div>
        </div>

      </div>
    </div>`;

    bindEvents(d);
  }

  function bindEvents(d) {
    // Period tabs
    document.querySelectorAll('.period-btn').forEach(btn => btn.addEventListener('click', () => { period = btn.dataset.period; render(); }));

    // Filters
    document.getElementById('f-search')?.addEventListener('input', e => {
      search = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const inp = document.getElementById('f-search');
      if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); }
    });
    document.getElementById('f-cell')?.addEventListener('change', e => { filterCell = e.target.value; render(); });
    document.getElementById('f-status')?.addEventListener('change', e => { filterStatus = e.target.value; render(); });

    // Report tabs
    let currentTab = 'members';
    function showTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.report-tab').forEach(b => {
        b.classList.toggle('bg-primary', b.dataset.tab === tab);
        b.classList.toggle('text-white', b.dataset.tab === tab);
        b.classList.toggle('bg-slate-100', b.dataset.tab !== tab);
        b.classList.toggle('text-slate-500', b.dataset.tab !== tab);
      });
      const rt = document.getElementById('report-table');
      if (tab === 'members') rt.innerHTML = membersTable(d.people);
      else if (tab === 'cells') rt.innerHTML = cellsTable();
      else if (tab === 'visits') rt.innerHTML = visitsTable(d.visitsInPeriod);
      else if (tab === 'attendance') rt.innerHTML = attendanceTable(d.cutoff);
    }
    document.querySelectorAll('.report-tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    showTab('members');

    // PDF export
    document.getElementById('exp-pdf')?.addEventListener('click', () => exportPDF(d));
  }

  render();
}

// ── TABLE BUILDERS ──
function membersTable(people) {
  return `<table class="w-full text-left text-xs">
    <thead><tr class="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
      <th class="px-3 py-2.5 rounded-l-lg">Nome</th><th class="px-3 py-2.5">Status</th><th class="px-3 py-2.5">Célula</th><th class="px-3 py-2.5">Telefone</th>
      <th class="px-3 py-2.5 text-center">Bat. Águas</th><th class="px-3 py-2.5 text-center">Esp. Santo</th><th class="px-3 py-2.5 text-center">Escola</th>
      <th class="px-3 py-2.5 text-center">Encontro</th><th class="px-3 py-2.5 text-center rounded-r-lg">Visitas</th>
    </tr></thead>
    <tbody>${people.length ? people.map(p => {
    const c = p.cellId ? store.getCell(p.cellId) : null;
    const vc = store.getVisitsForPerson(p.id).length;
    return `<tr class="border-b border-slate-50 hover:bg-blue-50/30 transition">
        <td class="px-3 py-2.5 font-semibold">${p.name}</td>
        <td class="px-3 py-2.5">${statusBadge(p.status)}</td>
        <td class="px-3 py-2.5 text-slate-500">${c?.name || '—'}</td>
        <td class="px-3 py-2.5 text-slate-500">${p.phone || '—'}</td>
        <td class="px-3 py-2.5 text-center">${dot(p.spiritual?.waterBaptism)}</td>
        <td class="px-3 py-2.5 text-center">${dot(p.spiritual?.holySpiritBaptism)}</td>
        <td class="px-3 py-2.5 text-center">${dot(p.spiritual?.leadersSchool)}</td>
        <td class="px-3 py-2.5 text-center">${dot(p.retreats?.encounter?.done)}</td>
        <td class="px-3 py-2.5 text-center font-bold">${vc}</td>
      </tr>`;
  }).join('') : '<tr><td colspan="9" class="text-center text-slate-400 py-8">Nenhum membro encontrado</td></tr>'}</tbody>
  </table>`;
}

function cellsTable() {
  return `<table class="w-full text-left text-xs">
    <thead><tr class="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
      <th class="px-3 py-2.5 rounded-l-lg">Célula</th><th class="px-3 py-2.5">Líder</th><th class="px-3 py-2.5 text-center">Membros</th>
      <th class="px-3 py-2.5">Dia</th><th class="px-3 py-2.5 text-center rounded-r-lg">Frequências Registradas</th>
    </tr></thead>
    <tbody>${store.cells.length ? store.cells.map(c => {
    const members = store.getCellMembers(c.id);
    const leader = c.leaderId ? (store.getUser(c.leaderId) || store.getPerson(c.leaderId)) : null;
    const attCount = store.getAttendanceForCell(c.id).length;
    return `<tr class="border-b border-slate-50 hover:bg-blue-50/30 transition">
        <td class="px-3 py-2.5 font-semibold">${c.name}</td>
        <td class="px-3 py-2.5 text-slate-500">${leader?.name || '—'}</td>
        <td class="px-3 py-2.5 text-center font-bold">${members.length}</td>
        <td class="px-3 py-2.5 text-slate-500">${c.meetingDay || '—'}</td>
        <td class="px-3 py-2.5 text-center">${attCount}</td>
      </tr>`;
  }).join('') : '<tr><td colspan="5" class="text-center text-slate-400 py-8">Nenhuma célula</td></tr>'}</tbody>
  </table>`;
}

function visitsTable(visits) {
  const sorted = [...visits].sort((a, b) => b.date.localeCompare(a.date));
  return `<table class="w-full text-left text-xs">
    <thead><tr class="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
      <th class="px-3 py-2.5 rounded-l-lg">Data</th><th class="px-3 py-2.5">Pessoa</th><th class="px-3 py-2.5">Tipo</th>
      <th class="px-3 py-2.5">Resultado</th><th class="px-3 py-2.5 rounded-r-lg">Observação</th>
    </tr></thead>
    <tbody>${sorted.length ? sorted.map(v => {
    const person = store.getPerson(v.personId);
    return `<tr class="border-b border-slate-50 hover:bg-blue-50/30 transition">
        <td class="px-3 py-2.5 text-slate-500 whitespace-nowrap">${v.date}</td>
        <td class="px-3 py-2.5 font-semibold">${person?.name || '—'}</td>
        <td class="px-3 py-2.5"><span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">${v.type || 'Visita'}</span></td>
        <td class="px-3 py-2.5 text-slate-500">${v.result || '—'}</td>
        <td class="px-3 py-2.5 text-slate-500 max-w-[200px] truncate">${v.observation || '—'}</td>
      </tr>`;
  }).join('') : '<tr><td colspan="5" class="text-center text-slate-400 py-8">Nenhuma visita neste período</td></tr>'}</tbody>
  </table>`;
}

function attendanceTable(cutoff) {
  const records = store.attendance.filter(a => new Date(a.date) >= cutoff).sort((a, b) => b.date.localeCompare(a.date));
  return `<table class="w-full text-left text-xs">
    <thead><tr class="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
      <th class="px-3 py-2.5 rounded-l-lg">Data</th><th class="px-3 py-2.5">Célula</th><th class="px-3 py-2.5 text-center">Presentes</th>
      <th class="px-3 py-2.5 text-center">Ausentes</th><th class="px-3 py-2.5 text-center rounded-r-lg">% Presença</th>
    </tr></thead>
    <tbody>${records.length ? records.map(a => {
    const cell = store.getCell(a.cellId);
    const present = a.records?.filter(r => r.status === 'present').length || 0;
    const absent = (a.records?.length || 0) - present;
    const pct = a.records?.length ? Math.round(present / a.records.length * 100) : 0;
    return `<tr class="border-b border-slate-50 hover:bg-blue-50/30 transition">
        <td class="px-3 py-2.5 text-slate-500 whitespace-nowrap">${a.date}</td>
        <td class="px-3 py-2.5 font-semibold">${cell?.name || '—'}</td>
        <td class="px-3 py-2.5 text-center text-emerald-600 font-bold">${present}</td>
        <td class="px-3 py-2.5 text-center text-red-500 font-bold">${absent}</td>
        <td class="px-3 py-2.5 text-center"><span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${pct >= 70 ? 'bg-emerald-50 text-emerald-700' : pct >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}">${pct}%</span></td>
      </tr>`;
  }).join('') : '<tr><td colspan="5" class="text-center text-slate-400 py-8">Nenhum registro de frequência</td></tr>'}</tbody>
  </table>`;
}

// ── HELPERS ──
function kpi(icon, label, value, color) {
  return `<div class="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:shadow-md hover:border-${color}-200 transition-all group">
    <div class="w-7 h-7 rounded-lg bg-${color}-50 flex items-center justify-center mb-2"><span class="material-symbols-outlined text-${color}-500 text-base">${icon}</span></div>
    <p class="text-xl font-extrabold leading-none">${value}</p>
    <p class="text-[9px] font-semibold text-slate-500 mt-1">${label}</p>
  </div>`;
}

function progressBar(label, count, total, color) {
  const pct = total ? Math.round(count / total * 100) : 0;
  return `<div>
    <div class="flex justify-between items-center mb-1">
      <span class="text-xs font-medium text-slate-700">${label}</span>
      <span class="text-xs font-bold" style="color:${color}">${pct}% <span class="text-slate-400 font-normal">(${count}/${total})</span></span>
    </div>
    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div class="h-full rounded-full transition-all duration-700" style="width:${pct}%;background:${color}"></div>
    </div>
  </div>`;
}

function statusBadge(status) {
  const colors = { 'Novo Convertido': 'emerald', 'Reconciliação': 'purple', 'Visitante': 'blue', 'Membro': 'primary' };
  const c = colors[status] || 'slate';
  return `<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-${c}-50 text-${c}-700">${status || '—'}</span>`;
}

function dot(val) {
  return val ? '<span class="inline-flex w-5 h-5 rounded-full bg-emerald-100 items-center justify-center"><span class="material-symbols-outlined text-emerald-600" style="font-size:12px">check</span></span>'
    : '<span class="inline-flex w-5 h-5 rounded-full bg-red-50 items-center justify-center"><span class="material-symbols-outlined text-red-400" style="font-size:12px">close</span></span>';
}

// ── EXCEL EXPORT ──
function exportMembersExcel(people) {
  const data = people.map(p => {
    const c = p.cellId ? store.getCell(p.cellId) : null;
    return {
      'Nome': p.name, 'Status': p.status || '', 'Telefone': p.phone || '', 'Email': p.email || '',
      'Célula': c?.name || '', 'Batismo Águas': p.spiritual?.waterBaptism ? 'Sim' : 'Não',
      'Esp. Santo': p.spiritual?.holySpiritBaptism ? 'Sim' : 'Não',
      'Escola de Líderes': p.spiritual?.leadersSchool ? 'Sim' : 'Não',
      'Encontro com Deus': p.retreats?.encounter?.done ? 'Sim' : 'Não',
      'Visitas': store.getVisitsForPerson(p.id).length
    };
  });
  downloadExcel(data, 'Membros', 'membros');
}

function exportVisitsExcel(visits) {
  const data = visits.sort((a, b) => b.date.localeCompare(a.date)).map(v => {
    const person = store.getPerson(v.personId);
    return { 'Data': v.date, 'Pessoa': person?.name || '', 'Tipo': v.type || '', 'Resultado': v.result || '', 'Observação': v.observation || '' };
  });
  downloadExcel(data, 'Visitas', 'visitas');
}

function exportCellsExcel() {
  const data = store.cells.map(c => {
    const leader = c.leaderId ? (store.getUser(c.leaderId) || store.getPerson(c.leaderId)) : null;
    return { 'Célula': c.name, 'Líder': leader?.name || '', 'Membros': store.getCellMembers(c.id).length, 'Dia': c.meetingDay || '' };
  });
  downloadExcel(data, 'Células', 'celulas');
}

function downloadExcel(data, sheetName, fileName) {
  if (typeof XLSX === 'undefined') { toast('Biblioteca Excel não carregada', 'warning'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length + 2, ...data.map(r => String(r[k] || '').length + 2)) }));
  ws['!cols'] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  toast('Arquivo Excel exportado!');
}

// ── PDF EXPORT ──
function exportPDF(d) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  function pBar(label, count, total, color) {
    const pct = total ? Math.round(count / total * 100) : 0;
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:500">${label}</span>
        <span style="font-size:12px;font-weight:700;color:${color}">${pct}% (${count}/${total})</span>
      </div>
      <div style="height:8px;background:#f1f5f9;border-radius:999px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:999px"></div>
      </div>
    </div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Relatório - Gestão Igreja</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Inter',sans-serif; color:#1e293b; background:white; padding:40px; }
      .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #3B82F6; padding-bottom:16px; margin-bottom:30px; }
      .header h1 { font-size:22px; font-weight:800; color:#1e293b; }
      .header .meta { text-align:right; font-size:11px; color:#94a3b8; }
      .header .meta b { color:#3B82F6; }
      .section-title { font-size:14px; font-weight:700; color:#1e293b; margin:24px 0 12px; display:flex; align-items:center; gap:8px; }
      .section-title::before { content:''; width:4px; height:18px; background:#3B82F6; border-radius:4px; }
      .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
      .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center; }
      .kpi .val { font-size:28px; font-weight:800; color:#1e293b; }
      .kpi .label { font-size:10px; font-weight:600; color:#64748b; margin-top:4px; text-transform:uppercase; letter-spacing:0.5px; }
      .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
      .card { background:#fafbfc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; }
      .card h4 { font-size:13px; font-weight:700; margin-bottom:12px; color:#334155; }
      .stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .stat-box { text-align:center; background:white; border:1px solid #e2e8f0; padding:12px; border-radius:8px; }
      .stat-box .val { font-size:22px; font-weight:800; }
      .stat-box .label { font-size:9px; color:#64748b; margin-top:2px; }
      table { width:100%; border-collapse:collapse; font-size:10px; margin-top:8px; }
      thead th { background:#f1f5f9; padding:8px 10px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:0.5px; border-bottom:2px solid #e2e8f0; }
      tbody td { padding:7px 10px; border-bottom:1px solid #f1f5f9; }
      tbody tr:nth-child(even) { background:#fafbfc; }
      .badge { display:inline-block; padding:2px 6px; border-radius:999px; font-size:8px; font-weight:700; text-transform:uppercase; }
      .badge-green { background:#ecfdf5; color:#059669; }
      .badge-purple { background:#faf5ff; color:#7c3aed; }
      .badge-blue { background:#eff6ff; color:#2563eb; }
      .badge-gray { background:#f1f5f9; color:#475569; }
      .check { color:#059669; font-weight:700; }
      .cross { color:#ef4444; font-weight:700; }
      .footer { margin-top:30px; padding-top:12px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; }
      @media print { body { padding:20px; } .no-print { display:none; } }
    </style>
  </head><body>
    <div class="header">
      <div>
        <h1>⛪ Relatório de Crescimento</h1>
        <p style="font-size:12px;color:#64748b;margin-top:4px">Gestão Igreja - CRM Pastoral</p>
      </div>
      <div class="meta">
        <p>Gerado em <b>${dateStr}</b></p>
        <p>Período: <b>${d.periodLabel}</b></p>
        <p>${d.total} membros cadastrados</p>
      </div>
    </div>

    <div class="section-title">Indicadores do Período</div>
    <div class="kpi-grid">
      <div class="kpi"><div class="val" style="color:#059669">${d.novosConvertidos}</div><div class="label">Novos Convertidos</div></div>
      <div class="kpi"><div class="val" style="color:#7c3aed">${d.reconciliacoes}</div><div class="label">Reconciliações</div></div>
      <div class="kpi"><div class="val" style="color:#2563eb">${d.visitantes}</div><div class="label">Visitantes</div></div>
      <div class="kpi"><div class="val" style="color:#d97706">${d.visitsInPeriod.length}</div><div class="label">Visitas Realizadas</div></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="val" style="color:#0d9488">${d.consolidacoes}</div><div class="label">Consolidações</div></div>
      <div class="kpi"><div class="val" style="color:#0891b2">${d.acompanhamentos}</div><div class="label">Acompanhamentos</div></div>
      <div class="kpi"><div class="val" style="color:#ea580c">${d.batismoES}</div><div class="label">Batismo Esp. Santo</div></div>
      <div class="kpi"><div class="val" style="color:#3b82f6">${d.batismoAguas}</div><div class="label">Batismo nas Águas</div></div>
    </div>

    <div class="two-col">
      <div class="card">
        <h4>📊 Saúde Espiritual</h4>
        ${pBar('Batismo nas Águas', d.batismoAguas, d.total, '#3B82F6')}
        ${pBar('Batismo Esp. Santo', d.batismoES, d.total, '#F97316')}
        ${pBar('Escola de Líderes', d.escola, d.total, '#8B5CF6')}
        ${pBar('Encontro com Deus', d.encontro, d.total, '#10B981')}
      </div>
      <div class="card">
        <h4>📈 Frequência & Células</h4>
        <div class="stats-grid">
          <div class="stat-box"><div class="val" style="color:#3b82f6">${d.freqPct}%</div><div class="label">Frequência Média</div></div>
          <div class="stat-box"><div class="val" style="color:#7c3aed">${d.activeCells}</div><div class="label">Células Ativas</div></div>
          <div class="stat-box"><div class="val" style="color:#d97706">${d.noVisit60}</div><div class="label">Sem Visita 60d</div></div>
          <div class="stat-box"><div class="val" style="color:#ef4444">${d.zeroVisits}</div><div class="label">Zero Visitas</div></div>
        </div>
      </div>
    </div>

    <div class="section-title">Lista de Membros</div>
    <table>
      <thead><tr><th>Nome</th><th>Status</th><th>Célula</th><th>Telefone</th><th>Bat. Águas</th><th>Esp. Santo</th><th>Escola</th><th>Encontro</th><th>Visitas</th></tr></thead>
      <tbody>${d.people.map(p => {
    const c = p.cellId ? store.getCell(p.cellId) : null;
    const vc = store.getVisitsForPerson(p.id).length;
    const bc = { 'Novo Convertido': 'badge-green', 'Reconciliação': 'badge-purple', 'Visitante': 'badge-blue' };
    return `<tr>
          <td style="font-weight:600">${p.name}</td>
          <td><span class="badge ${bc[p.status] || 'badge-gray'}">${p.status || '—'}</span></td>
          <td>${c?.name || '—'}</td><td>${p.phone || '—'}</td>
          <td class="${p.spiritual?.waterBaptism ? 'check' : 'cross'}">${p.spiritual?.waterBaptism ? '✓' : '✗'}</td>
          <td class="${p.spiritual?.holySpiritBaptism ? 'check' : 'cross'}">${p.spiritual?.holySpiritBaptism ? '✓' : '✗'}</td>
          <td class="${p.spiritual?.leadersSchool ? 'check' : 'cross'}">${p.spiritual?.leadersSchool ? '✓' : '✗'}</td>
          <td class="${p.retreats?.encounter?.done ? 'check' : 'cross'}">${p.retreats?.encounter?.done ? '✓' : '✗'}</td>
          <td style="font-weight:700;text-align:center">${vc}</td>
        </tr>`;
  }).join('')}</tbody>
    </table>

    ${d.visitsInPeriod.length ? `<div class="section-title">Visitas no Período</div>
    <table>
      <thead><tr><th>Data</th><th>Pessoa</th><th>Tipo</th><th>Resultado</th><th>Observação</th></tr></thead>
      <tbody>${[...d.visitsInPeriod].sort((a, b) => b.date.localeCompare(a.date)).map(v => {
    const person = store.getPerson(v.personId);
    return `<tr><td>${v.date}</td><td style="font-weight:600">${person?.name || '—'}</td><td>${v.type || '—'}</td><td>${v.result || '—'}</td><td>${v.observation || '—'}</td></tr>`;
  }).join('')}</tbody>
    </table>` : ''}

    <div class="footer">
      <span>Gestão Igreja - CRM Pastoral</span>
      <span>Gerado em ${dateStr} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>

    <div class="no-print" style="text-align:center;margin-top:30px">
      <button onclick="window.print()" style="background:#3B82F6;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Inter">
        📄 Imprimir / Salvar como PDF
      </button>
    </div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  toast('Relatório PDF aberto em nova aba!');
}
