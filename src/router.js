import { updateSidebar } from './components/ui.js';
const routes = {};
export function route(p, h) { routes[p] = h }
export function navigate(p) { window.location.hash = p }
export function getParams() { const h = window.location.hash.slice(1); const [p, q] = h.split('?'); const params = {}; if (q) q.split('&').forEach(s => { const [k, v] = s.split('='); params[k] = decodeURIComponent(v) }); return { path: p, params } }
export function startRouter() {
    const handle = () => {
        const { path, params } = getParams();
        const h = routes[path] || routes['/login'];

        const app = document.getElementById('app');
        if (app) {
            // Show custom splash screen for the transition
            document.body.classList.remove('app-ready');

            setTimeout(async () => {
                if (h) await h(params);
                updateSidebar();

                // Trigger reflow then hide splash screen
                app.offsetHeight;

                // Allow a tiny delay so the new DOM can render, then remove splash screen
                setTimeout(() => {
                    document.body.classList.add('app-ready');
                }, 50);
            }, 300); // 300ms matches the snappier CSS transition duration
        } else {
            if (h) h(params);
            updateSidebar();
        }
    };
    window.addEventListener('hashchange', handle);
    if (!window.location.hash) window.location.hash = '/login'; else handle();
}

