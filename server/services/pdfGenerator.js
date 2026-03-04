const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function processLogoUrl(url) {
    if (!url) return null;
    try {
        if (url.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '..', url);
            if (fs.existsSync(filePath)) {
                const ext = path.extname(filePath).toLowerCase();
                const mimeType = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
                const base64 = fs.readFileSync(filePath).toString('base64');
                return `data:${mimeType};base64,${base64}`;
            }
        }
    } catch (e) {
        console.error('Erro ao converter logo para base64', e);
    }
    return url;
}

/**
 * Função principal para gerar o PDF a partir dos dados do frontend
 * @param {string} type Tipo do relatório ('executive', 'analytical', 'members', 'cells', 'visits')
 * @param {object} data Dados processados no frontend
 */
async function generatePDF(type, data) {
    if (data.logoUrl) {
        data.logoUrl = await processLogoUrl(data.logoUrl);
    }
    const html = buildHtml(type, data);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>', // Cabeçalho customizado vai no corpo HTML
        footerTemplate: `
            <div style="width: 100%; text-align: center; font-size: 9px; color: #64748b; font-family: 'Inter', sans-serif; padding: 0 20px;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <span>CRM Celular v3 • Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
                    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
                </div>
            </div>
        `,
        margin: { top: '20px', bottom: '50px', left: '20px', right: '20px' }
    });

    await browser.close();
    return pdfBuffer;
}

function buildHtml(type, data) {
    const css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 0; background: #fff; line-height: 1.5; font-size: 11px; }
        
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; page-break-inside: avoid; }
        .church-info { display: flex; align-items: center; gap: 15px; }
        .logo { width: 50px; height: 50px; border-radius: 8px; object-fit: contain; }
        .church-name { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
        .church-sub { font-size: 10px; color: #64748b; margin: 0; }
        
        .report-meta { text-align: right; }
        .report-title { font-size: 18px; font-weight: 800; color: #2563eb; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-text { font-size: 10px; color: #64748b; margin: 2px 0 0 0; }

        .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 25px 0 10px 0; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; page-break-inside: avoid; }
        .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
        .kpi-val { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
        .kpi-label { font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        
        .bars-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; page-break-inside: avoid; }
        .bar-container { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .bar-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px; font-weight: 600; }
        .bar-bg { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 4px; }
        
        .insights-list { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px 20px; page-break-inside: avoid; margin-bottom: 20px; }
        .insights-title { font-size: 11px; font-weight: 700; color: #1d4ed8; margin: 0 0 10px 0; text-transform: uppercase; }
        .insights-list ul { margin: 0; padding-left: 20px; color: #1e3a8a; }
        .insights-list li { margin-bottom: 5px; font-weight: 500; font-size: 10px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th { background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 9px; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; color: #0f172a; }
        
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; }
        .badge-gray { background: #f1f5f9; color: #475569; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-purple { background: #f3e8ff; color: #6b21a8; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-amber { background: #fef3c7; color: #92400e; }
        .badge-orange { background: #ffedd5; color: #9a3412; }
    `;

    const commonHeader = `
        <div class="header">
            <div class="church-info">
                ${data.logoUrl ? `<img src="${data.logoUrl}" class="logo" />` : ''}
                <div>
                    <h1 class="church-name">${data.appName || 'CRM Celular'}</h1>
                    <p class="church-sub">Relatório Gerencial Oficial</p>
                </div>
            </div>
            <div class="report-meta">
                <h2 class="report-title">${getReportTitle(type)}</h2>
                <p class="meta-text">Período: ${data.periodLabel}</p>
                <p class="meta-text">${data.total} membros ativos filtrados</p>
            </div>
        </div>
    `;

    let bodyHtml = '';

    if (type === 'executive' || type === 'analytical') {
        bodyHtml += renderExecutiveSummary(data);
    }

    if (type === 'members' || type === 'analytical') {
        bodyHtml += `<div class="section-title">Lista de Membros</div>`;
        bodyHtml += renderMembersTable(data);
    }

    if (type === 'cells' || type === 'analytical') {
        bodyHtml += `<div class="section-title">Desempenho das Células</div>`;
        bodyHtml += renderCellsTable(data);
    }

    if (type === 'visits' || type === 'analytical') {
        bodyHtml += `<div class="section-title">Histórico de Visitas</div>`;
        bodyHtml += renderVisitsTable(data);
    }

    if (type === 'metrics' || type === 'analytical') {
        bodyHtml += `<div class="section-title">Visão Geral de Métricas Customizadas</div>`;
        bodyHtml += renderMetricsReport(data);
    }

    if (type === 'inativos' || type === 'analytical') {
        bodyHtml += `<div class="section-title">Membros Inativos / Afastados / Mudou-se</div>`;
        bodyHtml += renderInactiveMembersTable(data);
    }

    return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><style>${css}</style></head>
        <body>
            ${commonHeader}
            ${bodyHtml}
        </body>
        </html>
    `;
}

function getReportTitle(type) {
    const titles = {
        'executive': 'Relatório Executivo',
        'analytical': 'Relatório Analítico Completo',
        'members': 'Relatório de Membros',
        'cells': 'Relatório de Células',
        'visits': 'Relatório de Visitas',
        'metrics': 'Relatório de Métricas Customizadas',
        'inativos': 'Relatório de Inativos / Saída'
    };
    return titles[type] || 'Relatório';
}

function renderExecutiveSummary(d) {
    const kpiGrid1 = `
        <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-val">${d.novosConvertidos}</div><div class="kpi-label">Novos Convertidos</div></div>
            <div class="kpi-card"><div class="kpi-val">${d.reconciliacoes}</div><div class="kpi-label">Reconciliações</div></div>
            <div class="kpi-card"><div class="kpi-val">${d.visitantes}</div><div class="kpi-label">Visitantes</div></div>
            <div class="kpi-card"><div class="kpi-val">${d.visitsInPeriod.length}</div><div class="kpi-label">Visitas Realizadas</div></div>
        </div>
    `;

    const kpiGrid2 = `
        <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-val">${d.freqPct}%</div><div class="kpi-label">Média Frequência</div></div>
            <div class="kpi-card"><div class="kpi-val">${d.activeCells}</div><div class="kpi-label">Células Ativas</div></div>
            <div class="kpi-card"><div class="kpi-val" style="color: #ea580c;">${d.noVisit}</div><div class="kpi-label">Sem Visita > 60d</div></div>
            <div class="kpi-card"><div class="kpi-val" style="color: #dc2626;">${d.zeroVisits}</div><div class="kpi-label">Nunca Visitados</div></div>
        </div>
    `;

    let tracksHtml = '';
    if (d.tracks && d.tracks.length > 0) {
        tracksHtml = `
            <div class="section-title">Saúde Espiritual e Retiros</div>
            <div class="bars-grid">
                ${d.tracks.map(t => {
            const count = d.trackCounts[t.id] || 0;
            const pct = d.total ? Math.round(count / d.total * 100) : 0;
            const c = t.color || '#3b82f6';
            return `
                        <div class="bar-container">
                            <div class="bar-header">
                                <span>${t.name}</span>
                                <span>${pct}% <span style="color:#94a3b8; font-weight:400;">(${count} de ${d.total})</span></span>
                            </div>
                            <div class="bar-bg"><div class="bar-fill" style="width: ${pct}%; background: ${c}"></div></div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    // Insights Automáticos
    const insights = [];
    if (d.freqPct >= 70) insights.push(`Excelente média de frequência neste período (${d.freqPct}%).`);
    else if (d.freqPct < 50) insights.push(`Atenção: A média de frequência das células está abaixo de 50% (${d.freqPct}%).`);

    if (d.visitantes > 0) insights.push(`Foram cadastrados ${d.visitantes} novos visitantes na base.`);
    if (d.novosConvertidos > 0) insights.push(`Tivemos ${d.novosConvertidos} conversões/decisões no período.`);

    if (d.zeroVisits > 0) insights.push(`Existem ${d.zeroVisits} membros ativos que nunca receberam registro de visita pastoral.`);
    if (d.noVisit > 0) insights.push(`${d.noVisit} pessoas estão há mais de 60 dias sem acompanhamento.`);

    if (d.activeCells === 0) insights.push(`Não há células ativas nos filtros de pesquisa atuais.`);
    else insights.push(`A média de membros por célula atualmente é de ${d.avgMembers} pessoas.`);

    const insightsHtml = `
        <div class="section-title">Análise de Dados & Insights Automáticos</div>
        <div class="insights-list">
            <div class="insights-title">Pontos de Atenção e Destaques</div>
            <ul>
                ${insights.map(i => `<li>${i}</li>`).join('')}
            </ul>
        </div>
    `;

    // Top Metrics
    let metricsHtml = '';
    if (d.customFieldsConfig && d.customFieldsConfig.length > 0 && d.customFieldTotals) {
        // Obter os chaves, ordernar por maior valor pra mostrar apenas 4 principais
        const topMetrics = Object.entries(d.customFieldTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        if (topMetrics.length > 0) {
            metricsHtml = `
                <div class="section-title">Principais Indicadores das Células</div>
                <div class="kpi-grid">
                    ${topMetrics.map(([k, v]) => `<div class="kpi-card"><div class="kpi-val">${v}</div><div class="kpi-label">${k}</div></div>`).join('')}
                </div>
            `;
        }
    }

    return `
        <div class="section-title">Indicadores Principais</div>
        ${kpiGrid1}
        ${kpiGrid2}
        ${tracksHtml}
        ${metricsHtml}
        ${insightsHtml}
    `;
}

function renderMembersTable(d) {
    const vc = d.visibleCols || {};
    const tracks = d.tracks || [];

    let th = `<tr>
        <th>Nome</th>
        ${vc.status !== false ? '<th>Status</th>' : ''}
        ${vc.cell !== false ? '<th>Célula</th>' : ''}
        ${vc.phone !== false ? '<th>Telefone</th>' : ''}
        ${tracks.filter(t => vc[t.id] !== false).map(t => `<th class="text-center">${t.name}</th>`).join('')}
        ${vc.visits !== false ? '<th class="text-center">Visitas</th>' : ''}
    </tr>`;

    const statusMap = { 'Novo Convertido': 'badge-green', 'Reconciliação': 'badge-purple', 'Visitante': 'badge-blue', 'Membro': 'badge-gray', 'Inativo': 'badge-gray', 'Afastado': 'badge-orange', 'Mudou-se': 'badge-gray' };

    let trs = d.people.map(p => {
        const c = p.cellName || '—';
        const st = `<span class="badge ${statusMap[p.status] || 'badge-gray'}">${p.status || '—'}</span>`;

        return `<tr>
            <td class="font-bold">${p.name}</td>
            ${vc.status !== false ? `<td>${st}</td>` : ''}
            ${vc.cell !== false ? `<td>${c}</td>` : ''}
            ${vc.phone !== false ? `<td>${p.phone || '—'}</td>` : ''}
            ${tracks.filter(t => vc[t.id] !== false).map(t => {
            const checked = p.tracksData && p.tracksData[t.id];
            return `<td class="text-center" style="color: ${checked ? '#16a34a' : '#94a3b8'}">${checked ? '✓' : '-'}</td>`;
        }).join('')}
            ${vc.visits !== false ? `<td class="text-center font-bold">${p.visitsCount || 0}</td>` : ''}
        </tr>`;
    }).join('');

    if (!d.people.length) trs = '<tr><td colspan="10" class="text-center">Nenhum membro listado</td></tr>';
    return `<table><thead>${th}</thead><tbody>${trs}</tbody></table>`;
}

function renderCellsTable(d) {
    let th = `<tr>
        <th>Célula</th><th>Líder</th><th class="text-center">Dia</th>
        <th class="text-center">Membros</th><th class="text-center">Assiduidade</th>
        <th class="text-center">Reuniões</th><th class="text-center">Justificadas</th>
    </tr>`;

    let trs = d.cellsTableData.map(c => {
        return `<tr>
            <td class="font-bold">${c.name}</td>
            <td>${c.leader || '—'}</td>
            <td class="text-center">${c.day || '—'}</td>
            <td class="text-center font-bold">${c.memberCount}</td>
            <td class="text-center"><span class="badge ${c.freqPct >= 70 ? 'badge-green' : c.freqPct >= 40 ? 'badge-amber' : 'badge-red'}">${c.freqPct}%</span></td>
            <td class="text-center font-bold" style="color:#059669;">${c.realizadas}</td>
            <td class="text-center font-bold" style="color:#d97706;">${c.justificadas}</td>
        </tr>`;
    }).join('');

    if (!d.cellsTableData.length) trs = '<tr><td colspan="7" class="text-center">Nenhuma célula listada</td></tr>';
    return `<table><thead>${th}</thead><tbody>${trs}</tbody></table>`;
}

function renderVisitsTable(d) {
    if (!d.visitsInPeriod || !d.visitsInPeriod.length) {
        return '<p style="color:#64748b; font-size: 11px; margin-top:10px;">Nenhuma visita contabilizada para os filtros neste período.</p>';
    }

    let th = `<tr><th>Data</th><th>Pessoa / Visitado</th><th>Tipo de Visita</th><th>Resultado</th><th>Anotação do Líder</th></tr>`;

    let trs = d.visitsInPeriod.map(v => {
        return `<tr>
            <td>${v.date}</td>
            <td class="font-bold">${v.personName || '—'}</td>
            <td><span class="badge badge-blue">${v.type || '—'}</span></td>
            <td>${v.result || '—'}</td>
            <td>${v.observation || '—'}</td>
        </tr>`;
    }).join('');

    return `<table><thead>${th}</thead><tbody>${trs}</tbody></table>`;
}

function renderMetricsReport(d) {
    if (!d.customFieldsConfig || d.customFieldsConfig.length === 0) {
        return '<p style="color:#64748b; font-size: 11px; margin-top:10px;">Nenhuma métrica customizada foi configurada neste sistema.</p>';
    }

    // 1. Aggregated Totals
    const sortedTotals = Object.entries(d.customFieldTotals || {}).sort((a, b) => b[1] - a[1]);
    let html = `
        <div style="margin-bottom: 25px;">
            <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; margin-bottom: 10px; text-transform: uppercase;">Resumo Agregado</div>
            <div class="kpi-grid">
                ${sortedTotals.map(([k, v]) => `<div class="kpi-card"><div class="kpi-val">${v}</div><div class="kpi-label">${k}</div></div>`).join('')}
            </div>
        </div>
    `;

    // 2. Chronological History Table
    if (!d.metricsHistory || d.metricsHistory.length === 0) {
        html += '<p style="color:#64748b; font-size: 11px;">Nenhum registro de métrica encontrado no período.</p>';
        return html;
    }

    let th = `<tr>
        <th style="width: 80px;">Data</th>
        <th>Célula / Grupo</th>
        <th>Líder</th>
        ${d.customFieldsConfig.map(c => `<th class="text-center">${c}</th>`).join('')}
    </tr>`;

    let trs = d.metricsHistory.map(m => {
        return `<tr>
            <td style="white-space:nowrap; color:#64748b;">${m.date}</td>
            <td class="font-bold">${m.cellName}</td>
            <td style="color:#64748b;">${m.leaderName}</td>
            ${d.customFieldsConfig.map(c => {
            const val = m.metrics && m.metrics[c] !== undefined ? m.metrics[c] : '-';
            return `<td class="text-center font-bold" style="color:#0f172a;">${val}</td>`;
        }).join('')}
        </tr>`;
    }).join('');

    html += `
        <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; margin-bottom: 10px; text-transform: uppercase;">Histórico de Lançamentos</div>
        <table><thead>${th}</thead><tbody>${trs}</tbody></table>
    `;

    return html;
}

function renderInactiveMembersTable(d) {
    const STATUSES = ['Inativo', 'Afastado', 'Mudou-se'];
    const badgeMap = { 'Inativo': 'badge-gray', 'Afastado': 'badge-orange', 'Mudou-se': 'badge-gray' };
    const people = (d.inativoPeople || []);

    if (!people.length) {
        return '<p style="color:#64748b; font-size: 11px; margin-top:10px;">Nenhum membro inativo, afastado ou que se mudou registrado.</p>';
    }

    // Summary counts
    const counts = STATUSES.map(s => ({ s, n: people.filter(p => p.status === s).length }));
    const summaryKpis = counts.map(({ s, n }) =>
        `<div class="kpi-card"><div class="kpi-val">${n}</div><div class="kpi-label">${s}</div></div>`
    ).join('');

    const th = `<tr>
        <th>Nome</th><th>Status</th><th>Célula</th><th>Telefone</th>
    </tr>`;

    const trs = people.map(p => {
        const badge = badgeMap[p.status] || 'badge-gray';
        return `<tr>
            <td class="font-bold">${p.name}</td>
            <td><span class="badge ${badge}">${p.status}</span></td>
            <td>${p.cellName || '—'}</td>
            <td>${p.phone || '—'}</td>
        </tr>`;
    }).join('');

    return `
        <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">${summaryKpis}</div>
        <table><thead>${th}</thead><tbody>${trs}</tbody></table>
    `;
}

module.exports = {
    generatePDF
};
