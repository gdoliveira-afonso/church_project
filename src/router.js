import { updateSidebar } from './components/ui.js';
const routes = {};
export function route(p, h) { routes[p] = h }
export function navigate(p) { window.location.hash = p }
export function getParams() { const h = window.location.hash.slice(1); const [p, q] = h.split('?'); const params = {}; if (q) q.split('&').forEach(s => { const [k, v] = s.split('='); params[k] = decodeURIComponent(v) }); return { path: p, params } }
export function startRouter() {
    const handle = () => { const { path, params } = getParams(); const h = routes[path] || routes['/login']; if (h) h(params); updateSidebar(); };
    window.addEventListener('hashchange', handle);
    if (!window.location.hash) window.location.hash = '/login'; else handle();
}
