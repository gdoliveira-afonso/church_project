import { store } from '../store.js';

const ALL_EVENTS = [
    { id: 'membro.created', label: 'Membro criado' },
    { id: 'membro.updated', label: 'Membro atualizado' },
    { id: 'membro.deleted', label: 'Membro removido' },
    { id: 'evento.created', label: 'Evento criado' },
    { id: 'frequencia.registrada', label: 'Frequência registrada' },
];

let currentWebhooks = [];
let editingId = null;

export function webhooksView() {
    const app = document.getElementById('app');
    app.innerHTML = `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="max-w-4xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-8">
          <div>
            <button onclick="history.back()" class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-2 transition-colors">
              <span class="material-symbols-outlined text-base">arrow_back</span> Voltar
            </button>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-purple-500">webhook</span> Webhooks
            </h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1 text-sm">Envie eventos para sistemas externos automaticamente.</p>
          </div>
          <button id="btn-new-wh" class="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-lg hover:shadow-purple-200 dark:hover:shadow-none">
            <span class="material-symbols-outlined text-sm">add</span> Novo Webhook
          </button>
        </div>

        <div id="wh-list" class="space-y-4">
          <div class="flex justify-center py-8"><span class="material-symbols-outlined animate-spin text-gray-400">refresh</span></div>
        </div>
      </div>
    </div>

    <!-- Modal Criar/Editar Webhook -->
    <div id="modal-wh" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <h2 id="modal-wh-title" class="text-lg font-bold text-gray-900 dark:text-white mb-4">Novo Webhook</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
              <input id="wh-name" type="text" placeholder="Ex: Notificação Slack" class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL destino</label>
              <input id="wh-url" type="url" placeholder="https://hooks.exemplo.com/..." class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secret (opcional — gerado automaticamente)</label>
              <input id="wh-secret" type="text" placeholder="Deixe vazio para gerar automaticamente" class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eventos que disparam este webhook</label>
              <div class="space-y-2">
                ${ALL_EVENTS.map(e => `
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="ev-${e.id}" class="rounded accent-purple-600">
                    <span class="text-sm text-gray-700 dark:text-gray-300">${e.label} <code class="text-xs text-gray-400 ml-1">${e.id}</code></span>
                  </label>`).join('')}
              </div>
            </div>
          </div>
          <div class="flex gap-2 justify-end mt-6">
            <button id="btn-cancel-wh" class="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
            <button id="btn-save-wh" class="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium">Salvar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Logs -->
    <div id="modal-logs" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div class="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Logs do Webhook</h2>
          <button id="btn-close-logs" class="text-gray-400 hover:text-gray-600"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div id="logs-content" class="flex-1 overflow-y-auto p-5 space-y-2"></div>
      </div>
    </div>`;

    loadWebhooks();
    bindWhEvents();
}

async function loadWebhooks() {
    try {
        const r = await fetch('/api/admin/webhooks', { headers: { Authorization: `Bearer ${store.token}` } });
        const json = await r.json();
        currentWebhooks = json.data || [];
        renderWebhooks();
    } catch {
        document.getElementById('wh-list').innerHTML = `<p class="text-red-500 text-sm">Erro ao carregar webhooks.</p>`;
    }
}

function renderWebhooks() {
    const list = document.getElementById('wh-list');
    if (currentWebhooks.length === 0) {
        list.innerHTML = `<div class="text-center py-12 text-gray-400"><span class="material-symbols-outlined text-5xl block mb-3">webhook</span><p>Nenhum webhook configurado.</p></div>`;
        return;
    }
    list.innerHTML = currentWebhooks.map(wh => {
        const statusColor = wh.status === 'active' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-500 bg-gray-100 dark:bg-gray-700';
        const statusLabel = wh.status === 'active' ? 'Ativo' : 'Inativo';
        return `
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-gray-900 dark:text-white">${wh.name}</h3>
                <span class="text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}">${statusLabel}</span>
              </div>
              <p class="text-xs font-mono text-gray-500 dark:text-gray-400 truncate mb-3">${wh.url}</p>
              <div class="flex flex-wrap gap-1">
                ${(wh.events || []).map(e => `<span class="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-mono">${e}</span>`).join('')}
              </div>
            </div>
            <div class="flex flex-col gap-2 flex-shrink-0">
              <button onclick="testWebhook('${wh.id}')" class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">play_arrow</span> Testar
              </button>
              <button onclick="showLogs('${wh.id}')" class="text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">list_alt</span> Logs
              </button>
              <button onclick="editWebhook('${wh.id}')" class="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">edit</span> Editar
              </button>
              <button onclick="deleteWebhook('${wh.id}')" class="text-xs bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">delete</span> Remover
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
}

function openModal(wh = null) {
    editingId = wh ? wh.id : null;
    document.getElementById('modal-wh-title').textContent = wh ? 'Editar Webhook' : 'Novo Webhook';
    document.getElementById('wh-name').value = wh ? wh.name : '';
    document.getElementById('wh-url').value = wh ? wh.url : '';
    document.getElementById('wh-secret').value = '';
    ALL_EVENTS.forEach(e => { document.getElementById(`ev-${e.id}`).checked = wh ? (wh.events || []).includes(e.id) : false; });
    document.getElementById('modal-wh').classList.remove('hidden');
}

function bindWhEvents() {
    document.getElementById('btn-new-wh').onclick = () => openModal();
    document.getElementById('btn-cancel-wh').onclick = () => document.getElementById('modal-wh').classList.add('hidden');
    document.getElementById('btn-save-wh').onclick = saveWebhook;
    document.getElementById('btn-close-logs').onclick = () => document.getElementById('modal-logs').classList.add('hidden');

    window.editWebhook = (id) => openModal(currentWebhooks.find(w => w.id === id));
    window.showLogs = async (id) => {
        document.getElementById('modal-logs').classList.remove('hidden');
        document.getElementById('logs-content').innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Carregando...</p>';
        const r = await fetch(`/api/admin/webhooks/${id}/logs`, { headers: { Authorization: `Bearer ${store.token}` } });
        const json = await r.json();
        const logs = json.data || [];
        document.getElementById('logs-content').innerHTML = logs.length === 0
            ? '<p class="text-gray-400 text-sm text-center py-4">Nenhum log registrado.</p>'
            : logs.map(log => {
                const statusColor = log.success ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20';
                return `<div class="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}">${log.statusCode || '—'}</span>
                  <code class="text-xs text-gray-600 dark:text-gray-400 flex-1">${log.event}</code>
                  <span class="text-xs text-gray-400">${log.responseTime ? log.responseTime + 'ms' : '—'}</span>
                  <span class="text-xs text-gray-400">${new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                </div>`;
            }).join('');
    };
    window.testWebhook = async (id) => {
        const btn = event.target.closest('button');
        btn.disabled = true; btn.textContent = 'Enviando...';
        const r = await fetch(`/api/admin/webhooks/${id}/test`, { method: 'POST', headers: { Authorization: `Bearer ${store.token}` } });
        const json = await r.json();
        btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-xs">play_arrow</span> Testar';
        alert(json.result?.success ? `✅ Webhook disparado com sucesso (HTTP ${json.result.statusCode}, ${json.result.responseTime}ms)` : `❌ Falha no disparo (HTTP ${json.result?.statusCode || 0})`);
    };
    window.deleteWebhook = async (id) => {
        if (!confirm('Remover este webhook?')) return;
        await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${store.token}` } });
        loadWebhooks();
    };
}

async function saveWebhook() {
    const name = document.getElementById('wh-name').value.trim();
    const url = document.getElementById('wh-url').value.trim();
    const secret = document.getElementById('wh-secret').value.trim();
    const events = ALL_EVENTS.filter(e => document.getElementById(`ev-${e.id}`).checked).map(e => e.id);
    if (!name || !url) { alert('Nome e URL são obrigatórios.'); return; }
    if (events.length === 0) { alert('Selecione ao menos um evento.'); return; }

    const btn = document.getElementById('btn-save-wh');
    btn.textContent = 'Salvando...'; btn.disabled = true;
    try {
        const method = editingId ? 'PUT' : 'POST';
        const endpoint = editingId ? `/api/admin/webhooks/${editingId}` : '/api/admin/webhooks';
        await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.token}` },
            body: JSON.stringify({ name, url, secret: secret || undefined, events })
        });
        document.getElementById('modal-wh').classList.add('hidden');
        loadWebhooks();
    } catch { alert('Erro ao salvar webhook.'); }
    finally { btn.textContent = 'Salvar'; btn.disabled = false; }
}
