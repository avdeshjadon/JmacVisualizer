/* ═══════════════════════════════════════════════════════════════
   Disk Visualizer — D3.js Animated Zoomable Sunburst Chart
   with Storage Overview & File Deletion
   ═══════════════════════════════════════════════════════════════ */

// ─── Constants ─────────────────────────────────────────────────
const FILE_COLORS = {
    // Media
    '.jpg': '#e74c8c', '.jpeg': '#e74c8c', '.png': '#e84393',
    '.gif': '#fd79a8', '.svg': '#fab1a0', '.webp': '#e17055',
    '.mp4': '#d63031', '.mov': '#e17055', '.avi': '#ff7675',
    '.mp3': '#e84393', '.wav': '#fd79a8', '.flac': '#e74c8c',
    '.aac': '#fab1a0', '.heic': '#e84393',
    // Documents
    '.pdf': '#ff6b6b', '.doc': '#5f27cd', '.docx': '#5f27cd',
    '.xls': '#10ac84', '.xlsx': '#10ac84', '.ppt': '#ff9f43',
    '.pptx': '#ff9f43', '.txt': '#576574', '.md': '#576574',
    '.csv': '#10ac84',
    // Code
    '.py': '#3498db', '.js': '#f1c40f', '.ts': '#2980b9',
    '.jsx': '#f39c12', '.tsx': '#2980b9', '.html': '#e67e22',
    '.css': '#9b59b6', '.scss': '#8e44ad', '.json': '#1abc9c',
    '.xml': '#e67e22', '.yaml': '#d35400', '.yml': '#d35400',
    '.sh': '#2ecc71', '.swift': '#e74c3c', '.java': '#e74c3c',
    '.c': '#3498db', '.cpp': '#2980b9', '.h': '#1abc9c',
    '.rb': '#e74c3c', '.go': '#00bcd4', '.rs': '#ff7043',
    '.php': '#7c4dff',
    // Archives
    '.zip': '#9b59b6', '.tar': '#8e44ad', '.gz': '#9b59b6',
    '.rar': '#8e44ad', '.7z': '#9b59b6', '.dmg': '#6c5ce7',
    '.pkg': '#a29bfe',
    // System
    '.app': '#00cec9', '.dylib': '#636e72', '.so': '#636e72',
    '.framework': '#00cec9', '.plist': '#fdcb6e', '.log': '#b2bec3',
    '.db': '#e17055', '.sqlite': '#e17055',
    // Default
    '.none': '#555577',
    'directory': '#7c5cfc',
};

const DIR_COLORS = [
    '#7c5cfc', '#5c8cfc', '#00cec9', '#00b894',
    '#6c5ce7', '#a29bfe', '#74b9ff', '#55efc4',
    '#fd79a8', '#e17055', '#ffeaa7', '#dfe6e9',
];

// ─── State ─────────────────────────────────────────────────────
let currentData = null;
let navigationHistory = [];
let chartWidth = 0;
let chartHeight = 0;
let radius = 0;
let pendingDeletePath = null;
let pendingDeleteSize = 0;

// ─── Helpers ───────────────────────────────────────────────────
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = bytes / Math.pow(k, i);
    return val.toFixed(val < 10 ? 2 : 1) + ' ' + units[i];
}

function formatSizeGB(bytes) {
    return (bytes / (1000 * 1000 * 1000)).toFixed(1) + ' GB';
}

function getColor(d) {
    if (!d.data) return '#333';
    if (d.data.type === 'directory') {
        return DIR_COLORS[Math.abs(hashString(d.data.name)) % DIR_COLORS.length];
    }
    const ext = d.data.extension || '.none';
    return FILE_COLORS[ext] || `hsl(${Math.abs(hashString(ext)) % 360}, 50%, 55%)`;
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function getPercentage(d, root) {
    if (!root || root.value === 0) return 0;
    return ((d.value / root.value) * 100);
}

// ─── Toast Notifications ───────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
    };

    toast.innerHTML = `
        <span style="font-size:1.1rem;font-weight:700">${icons[type] || 'ℹ'}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ─── API Calls ─────────────────────────────────────────────────
async function fetchScan(path, depth = 3) {
    const params = new URLSearchParams();
    if (path) params.set('path', path);
    if (depth) params.set('depth', depth);
    const res = await fetch(`/api/scan?${params}`);
    if (!res.ok) throw new Error(`Scan failed: ${res.statusText}`);
    return res.json();
}

async function fetchRoots() {
    const res = await fetch('/api/roots');
    return res.json();
}

async function fetchDiskInfo() {
    const res = await fetch('/api/disk-info');
    return res.json();
}

async function deleteItem(path) {
    const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
    });
    return res.json();
}

// ─── Loading Overlay ───────────────────────────────────────────
function showLoading(msg) {
    const o = document.getElementById('loading-overlay');
    const s = document.getElementById('scan-status');
    o.classList.remove('hidden');
    if (msg) s.textContent = msg;
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// ─── Tooltip ───────────────────────────────────────────────────
const tooltip = document.getElementById('tooltip');

function showTooltip(evt, d, root) {
    const pct = getPercentage(d, root).toFixed(1);
    tooltip.innerHTML = `
        <div class="tt-name">${d.data.name}</div>
        <div><span class="tt-size">${formatSize(d.value)}</span> · <span class="tt-pct">${pct}%</span></div>
        ${d.data.type === 'directory' ? `<div style="color:var(--text-muted);font-size:0.72rem;margin-top:2px;">${d.children ? d.children.length : '?'} items</div>` : ''}
        <div class="tt-path">${d.data.path}</div>
    `;
    tooltip.classList.add('visible');
    positionTooltip(evt);
}

function positionTooltip(evt) {
    const pad = 14;
    let x = evt.clientX + pad;
    let y = evt.clientY + pad;
    const r = tooltip.getBoundingClientRect();
    if (x + r.width > window.innerWidth) x = evt.clientX - r.width - pad;
    if (y + r.height > window.innerHeight) y = evt.clientY - r.height - pad;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

function hideTooltip() {
    tooltip.classList.remove('visible');
}

// ─── Breadcrumb ────────────────────────────────────────────────
function updateBreadcrumb(path) {
    const bc = document.getElementById('breadcrumb');
    const parts = path.split('/').filter(Boolean);

    let html = '';
    let accum = '';
    parts.forEach((part, i) => {
        accum += '/' + part;
        const isLast = i === parts.length - 1;
        const cls = isLast ? 'breadcrumb-item active' : 'breadcrumb-item';
        html += `<span class="${cls}" data-path="${accum}">${part}</span>`;
        if (!isLast) html += `<span class="breadcrumb-sep">›</span>`;
    });

    bc.innerHTML = html;

    bc.querySelectorAll('.breadcrumb-item').forEach(item => {
        item.addEventListener('click', () => {
            const p = item.dataset.path;
            if (p) loadAndRender(p);
        });
    });
}

// ─── Center Info ───────────────────────────────────────────────
function updateCenterInfo(name, size, itemCount) {
    document.getElementById('center-name').textContent = name;
    document.getElementById('center-size').textContent = formatSize(size);
    document.getElementById('center-items').textContent =
        itemCount !== undefined ? `${itemCount} items` : 'Click to explore';
}

// ─── Storage Overview Bar ──────────────────────────────────────
async function renderStorageBar() {
    try {
        const info = await fetchDiskInfo();
        const bar = document.getElementById('storage-bar');
        const legend = document.getElementById('storage-legend');

        // Update stats
        document.getElementById('stat-used').textContent = formatSizeGB(info.used);
        document.getElementById('stat-total').textContent = formatSizeGB(info.total);
        document.getElementById('stat-free-badge').textContent = formatSizeGB(info.free) + ' available';

        // Build bar segments
        let barHTML = '';
        let legendHTML = '';

        info.categories.forEach((cat, i) => {
            const pct = (cat.size / info.total * 100);
            if (pct < 0.1) return; // skip tiny segments

            barHTML += `
                <div class="storage-segment"
                     style="width:${pct}%;background:${cat.color};animation-delay:${i * 0.08}s"
                     title="${cat.name}: ${formatSize(cat.size)}">
                    <div class="storage-segment-tooltip">
                        <strong>${cat.name}</strong><br>
                        ${formatSize(cat.size)} · ${pct.toFixed(1)}%
                    </div>
                </div>
            `;

            legendHTML += `
                <div class="storage-legend-item">
                    <span class="storage-legend-dot" style="background:${cat.color}"></span>
                    <span>${cat.name}</span>
                    <span class="storage-legend-size">${formatSizeGB(cat.size)}</span>
                </div>
            `;
        });

        // Free space segment
        const freePct = (info.free / info.total * 100);
        barHTML += `
            <div class="storage-segment free-segment"
                 style="width:${freePct}%"
                 title="Free: ${formatSize(info.free)}">
                <div class="storage-segment-tooltip">
                    <strong>Free Space</strong><br>
                    ${formatSize(info.free)} · ${freePct.toFixed(1)}%
                </div>
            </div>
        `;

        legendHTML += `
            <div class="storage-legend-item">
                <span class="storage-legend-dot" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)"></span>
                <span>Free</span>
                <span class="storage-legend-size">${formatSizeGB(info.free)}</span>
            </div>
        `;

        bar.innerHTML = barHTML;
        legend.innerHTML = legendHTML;

        // Animate segments in
        requestAnimationFrame(() => {
            bar.querySelectorAll('.storage-segment').forEach((seg, i) => {
                seg.style.opacity = '0';
                seg.style.transform = 'scaleX(0)';
                setTimeout(() => {
                    seg.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    seg.style.opacity = '1';
                    seg.style.transform = 'scaleX(1)';
                }, i * 80);
            });
        });

    } catch (err) {
        console.error('Failed to load disk info:', err);
    }
}

// ─── Sidebar ───────────────────────────────────────────────────
function updateSidebar(d, root) {
    const content = document.getElementById('sidebar-content');
    if (!d || !d.data) {
        content.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                    <polyline points="13 2 13 9 20 9"/>
                </svg>
                <p>Hover over a segment to see details</p>
            </div>`;
        return;
    }

    const pct = getPercentage(d, root).toFixed(2);
    const isDir = d.data.type === 'directory';
    const canDelete = d.data.path && d.data.type !== 'other';

    content.innerHTML = `
        <div class="file-detail">
            <div class="detail-name">${isDir ? '📁' : '📄'} ${d.data.name}</div>
            <div class="detail-path">${d.data.path}</div>
            <div class="detail-row">
                <span class="detail-label">Size</span>
                <span class="detail-value">${formatSize(d.value)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">% of parent</span>
                <span class="detail-value">${pct}%</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type</span>
                <span class="detail-value">${isDir ? 'Directory' : (d.data.extension || 'File')}</span>
            </div>
            ${isDir && d.children ? `
            <div class="detail-row">
                <span class="detail-label">Items</span>
                <span class="detail-value">${d.children.length}</span>
            </div>` : ''}
            ${canDelete ? `
            <button class="btn btn-delete-sm" onclick="promptDelete('${d.data.path.replace(/'/g, "\\'")}', ${d.value})">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"/>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
                Delete
            </button>` : ''}
        </div>`;
}

function updateTopFiles(root) {
    const list = document.getElementById('top-files-list');
    if (!root || !root.children) {
        list.innerHTML = '';
        return;
    }

    const allNodes = [];
    function collect(node) {
        if (node.children) {
            node.children.forEach(collect);
        }
        if (node.data && node.data.type !== 'other') {
            allNodes.push(node);
        }
    }
    root.children.forEach(collect);
    allNodes.sort((a, b) => b.value - a.value);
    const top = allNodes.slice(0, 10);

    const maxSize = top[0] ? top[0].value : 1;
    list.innerHTML = top.map(d => {
        const c = getColor(d);
        const pct = (d.value / maxSize * 100).toFixed(0);
        return `
            <li data-path="${d.data.path}">
                <span class="color-dot" style="background:${c}"></span>
                <div class="file-info">
                    <div class="file-name" title="${d.data.path}">${d.data.type === 'directory' ? '📁 ' : ''}${d.data.name}</div>
                    <div class="file-size">${formatSize(d.value)}</div>
                </div>
                <div class="file-bar">
                    <div class="file-bar-fill" style="width:${pct}%;background:${c}"></div>
                </div>
            </li>`;
    }).join('');

    // Add click handler for navigation
    list.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
            const path = li.dataset.path;
            if (path) loadAndRender(path);
        });
    });
}

function updateLegend(root) {
    const legend = document.getElementById('legend');
    const extMap = {};

    function collect(node) {
        if (node.data) {
            const key = node.data.type === 'directory' ? 'directory' : (node.data.extension || '.none');
            extMap[key] = (extMap[key] || 0) + node.value;
        }
        if (node.children) node.children.forEach(collect);
    }
    collect(root);

    const sorted = Object.entries(extMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 16);

    legend.innerHTML = sorted.map(([ext, size]) => {
        const c = ext === 'directory' ? '#7c5cfc' : (FILE_COLORS[ext] || '#555');
        return `
            <div class="legend-item">
                <span class="legend-dot" style="background:${c}"></span>
                ${ext === 'directory' ? 'Folders' : ext} · ${formatSize(size)}
            </div>`;
    }).join('');
}

// ─── Delete Functionality ──────────────────────────────────────
function promptDelete(path, size) {
    pendingDeletePath = path;
    pendingDeleteSize = size;
    document.getElementById('delete-modal-path').textContent = path;
    document.getElementById('delete-modal-size').textContent = formatSize(size);
    document.getElementById('delete-modal').classList.add('visible');
}

async function confirmDelete() {
    if (!pendingDeletePath) return;

    const path = pendingDeletePath;
    closeDeleteModal();

    showToast('Deleting…', 'info', 2000);

    try {
        const result = await deleteItem(path);
        if (result.success) {
            showToast(result.message, 'success');
            // Refresh the current view
            if (currentData && currentData.data && currentData.data.path) {
                await loadAndRender(currentData.data.path, 3, false);
            }
            // Refresh storage bar
            renderStorageBar();
        } else {
            showToast(result.error || 'Delete failed', 'error');
        }
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    }
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('visible');
    pendingDeletePath = null;
    pendingDeleteSize = 0;
}

// Wire up modal buttons
document.getElementById('delete-confirm').addEventListener('click', confirmDelete);
document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);

// Close modal on overlay click
document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') closeDeleteModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDeleteModal();
});

// ─── Sunburst Chart ────────────────────────────────────────────
function renderSunburst(data) {
    const container = document.getElementById('chart-container');
    const svg = d3.select('#sunburst-chart');
    svg.selectAll('*').remove();

    chartWidth = container.clientWidth;
    chartHeight = container.clientHeight;
    radius = Math.min(chartWidth, chartHeight) / 2 * 0.85;

    svg.attr('viewBox', `${-chartWidth/2} ${-chartHeight/2} ${chartWidth} ${chartHeight}`);

    // Create hierarchy
    const hierarchy = d3.hierarchy(data)
        .sum(d => d.type === 'file' || d.type === 'other' ? d.size : 0)
        .sort((a, b) => b.value - a.value);

    const root = d3.partition()
        .size([2 * Math.PI, radius])
        (hierarchy);

    currentData = root;

    // Arc generator
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius / 2)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1 - 1);

    // Create arcs with animation
    const paths = svg.selectAll('path')
        .data(root.descendants().filter(d => d.depth > 0))
        .join('path')
        .attr('fill', d => getColor(d))
        .attr('fill-opacity', d => {
            const maxDepth = d3.max(root.descendants(), n => n.depth);
            return 0.95 - (d.depth / (maxDepth + 2)) * 0.3;
        })
        .attr('stroke', 'rgba(10, 10, 26, 0.5)')
        .attr('stroke-width', 0.5)
        .attr('cursor', d => d.data.type === 'directory' ? 'pointer' : 'default')
        .style('transition', 'fill-opacity 0.2s ease')
        .on('mouseenter', function(evt, d) {
            d3.select(this).attr('fill-opacity', 1).attr('stroke', 'rgba(255,255,255,0.3)').attr('stroke-width', 1.5);
            showTooltip(evt, d, root);
            updateSidebar(d, root);
            updateCenterInfo(d.data.name, d.value, d.children ? d.children.length : undefined);
        })
        .on('mousemove', function(evt) {
            positionTooltip(evt);
        })
        .on('mouseleave', function(evt, d) {
            const maxDepth = d3.max(root.descendants(), n => n.depth);
            d3.select(this)
                .attr('fill-opacity', 0.95 - (d.depth / (maxDepth + 2)) * 0.3)
                .attr('stroke', 'rgba(10, 10, 26, 0.5)')
                .attr('stroke-width', 0.5);
            hideTooltip();
            updateCenterInfo(data.name, root.value, root.children ? root.children.length : 0);
        })
        .on('click', function(evt, d) {
            if (d.data.type === 'directory' && d.data.path) {
                loadAndRender(d.data.path);
            }
        });

    // Entrance animation: arcs grow from center
    paths.each(function(d) {
            d._target = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
        })
        .attr('d', function(d) {
            return arc({ x0: d.x0, x1: d.x1, y0: 0, y1: 0 });
        })
        .transition()
        .duration(800)
        .delay((d, i) => d.depth * 150 + i * 2)
        .ease(d3.easeCubicOut)
        .attrTween('d', function(d) {
            const iY0 = d3.interpolate(0, d._target.y0);
            const iY1 = d3.interpolate(0, d._target.y1);
            return function(t) {
                return arc({ x0: d.x0, x1: d.x1, y0: iY0(t), y1: iY1(t) });
            };
        });

    // Center circle (clickable to go back)
    svg.append('circle')
        .attr('r', root.y1 > 0 ? root.children[0].y0 - 2 : 50)
        .attr('fill', 'rgba(10, 10, 26, 0.3)')
        .attr('stroke', 'rgba(124, 92, 252, 0.2)')
        .attr('stroke-width', 1)
        .attr('cursor', 'pointer')
        .style('transition', 'all 0.3s ease')
        .on('mouseenter', function() {
            d3.select(this).attr('fill', 'rgba(124, 92, 252, 0.08)').attr('stroke', 'rgba(124, 92, 252, 0.4)');
        })
        .on('mouseleave', function() {
            d3.select(this).attr('fill', 'rgba(10, 10, 26, 0.3)').attr('stroke', 'rgba(124, 92, 252, 0.2)');
        })
        .on('click', goBack);

    // Update UI
    updateCenterInfo(data.name, root.value, root.children ? root.children.length : 0);
    updateBreadcrumb(data.path);
    updateTopFiles(root);
    updateLegend(root);
    updateSidebar(null);
}

// ─── Navigation ────────────────────────────────────────────────
async function loadAndRender(path, depth = 3, pushHistory = true) {
    showLoading(`Scanning ${path}…`);
    try {
        const data = await fetchScan(path, depth);
        if (pushHistory && currentData) {
            navigationHistory.push(currentData.data.path);
        }
        renderSunburst(data);
        document.getElementById('back-btn').disabled = navigationHistory.length === 0;
    } catch (err) {
        console.error('Scan failed:', err);
        document.getElementById('scan-status').textContent = 'Error: ' + err.message;
    } finally {
        hideLoading();
    }
}

function goBack() {
    if (navigationHistory.length === 0) return;
    const prev = navigationHistory.pop();
    loadAndRender(prev, 3, false);
}

// ─── Root Selector ─────────────────────────────────────────────
async function initRootSelector() {
    const select = document.getElementById('root-selector');
    try {
        const roots = await fetchRoots();
        roots.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.path;
            opt.textContent = r.name;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Failed to fetch roots:', e);
    }

    select.addEventListener('change', () => {
        if (select.value) {
            loadAndRender(select.value);
        }
    });
}

// ─── Back Button ───────────────────────────────────────────────
document.getElementById('back-btn').addEventListener('click', goBack);

// ─── Resize Handler ────────────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (currentData) {
            const container = document.getElementById('chart-container');
            chartWidth = container.clientWidth;
            chartHeight = container.clientHeight;
            radius = Math.min(chartWidth, chartHeight) / 2 * 0.85;
            if (currentData.data && currentData.data.path) {
                loadAndRender(currentData.data.path, 3, false);
            }
        }
    }, 300);
});

// ─── Init ──────────────────────────────────────────────────────
async function init() {
    showLoading('Initializing…');

    // Load storage bar and scan in parallel
    const storagePromise = renderStorageBar();
    await initRootSelector();
    await loadAndRender(undefined, 3, false);
    await storagePromise;
}

init();
