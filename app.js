/* ═══════════════════════════════════════════════
   WoodDesk — Carpenter Desktop JavaScript
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    // ─── GLOBALS ───
    const desktop = document.getElementById('desktop');
    const winContainer = document.getElementById('windows-container');
    const taskbarItems = document.getElementById('taskbar-items');
    const nailCursor = document.getElementById('nail-cursor');
    const hammerEl = document.getElementById('hammer-effect');
    const clockEl = document.getElementById('menu-clock');

    let windowIdCounter = 0;
    let topZ = 100;
    const windows = new Map(); // id → { el, title, minimized, maximized, prevRect }

    // ─── CUSTOM CURSOR ───
    document.addEventListener('mousemove', (e) => {
        nailCursor.style.left = e.clientX + 'px';
        nailCursor.style.top = e.clientY + 'px';
    });

    document.addEventListener('mousedown', (e) => {
        nailCursor.classList.add('pressing');
        spawnRipple(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', () => {
        nailCursor.classList.remove('pressing');
    });

    function spawnRipple(x, y) {
        const r = document.createElement('div');
        r.className = 'click-ripple';
        r.style.left = (x - 8) + 'px';
        r.style.top = (y - 8) + 'px';
        document.body.appendChild(r);
        r.addEventListener('animationend', () => r.remove());
    }

    // ─── HAMMER DOUBLE-CLICK ANIMATION ───
    function playHammer(x, y, callback) {
        hammerEl.style.left = x + 'px';
        hammerEl.style.top = y + 'px';
        hammerEl.className = 'swing';
        hammerEl.addEventListener('animationend', function handler() {
            hammerEl.removeEventListener('animationend', handler);
            hammerEl.className = 'hidden';
            if (callback) setTimeout(callback, 80);
        });
    }

    // ─── CLOCK ───
    const deskClockTime = document.getElementById('desk-clock-time');
    const deskClockDate = document.getElementById('desk-clock-date');
    const dockClockTime = document.getElementById('dock-clock-time');
    const dockClockDate = document.getElementById('dock-clock-date');
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yr = now.getFullYear();

        // Top bar: short time
        const clockEl = document.getElementById('menu-clock');
        if (clockEl) clockEl.textContent = `${h}:${m}`;
        // Desktop big clock
        if (deskClockTime) deskClockTime.textContent = `${h}:${m}`;
        if (deskClockDate) {
            const day = DAYS[now.getDay()];
            const mon = MONTHS[now.getMonth()];
            deskClockDate.textContent = `${day}, ${now.getDate()} ${mon} ${yr}`;
        }
        // Dock clock
        if (dockClockTime) dockClockTime.textContent = `${h}:${m}`;
        if (dockClockDate) dockClockDate.textContent = `${dd}/${mm}/${yr}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ─── DOCK PINNED ICONS ───
    document.querySelectorAll('.dock-pin').forEach(pin => {
        pin.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = pin.dataset.action;
            const rect = pin.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top;
            // mark as running
            pin.classList.add('running');
            playHammer(cx, cy, () => {
                switch (action) {
                    case 'open-workshop':
                        createWindow('Workshop', generateWorkshopContent(), cx, cy); break;
                    case 'open-calculator':
                        createWindow('Ruler Calculator', generateCalculatorContent(), cx, cy); break;
                    case 'open-notes':
                        createWindow('Notes', generateNotesContent(), cx, cy); break;
                    case 'about':
                        createWindow('About WoodDesk', generateAboutContent(), cx, cy); break;
                }
            });
        });
    });

    // ─── MENU SYSTEM ───
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = item.classList.contains('open');
            closeAllMenus();
            if (!wasOpen) item.classList.add('open');
        });
    });

    document.querySelectorAll('.menu-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = opt.dataset.action;
            closeAllMenus();
            handleMenuAction(action, e);
        });
    });

    document.addEventListener('click', () => closeAllMenus());

    function closeAllMenus() {
        document.querySelectorAll('.menu-item.open').forEach(m => m.classList.remove('open'));
    }

    function handleMenuAction(action, e) {
        switch (action) {
            case 'new-window':
                createWindow('New Window', generateFolderContent('New Window'), e.clientX, e.clientY);
                break;
            case 'new-folder':
                createWindow('New Folder', generateFolderContent('New Folder'), e.clientX, e.clientY);
                break;
            case 'close-all':
                windows.forEach((w) => closeWindow(w.el));
                break;
            case 'open-workshop':
                playHammer(e.clientX, e.clientY, () => {
                    createWindow('Workshop', generateWorkshopContent(), e.clientX, e.clientY);
                });
                break;
            case 'open-calculator':
                playHammer(e.clientX, e.clientY, () => {
                    createWindow('Ruler Calculator', generateCalculatorContent(), e.clientX, e.clientY);
                });
                break;
            case 'open-notes':
                playHammer(e.clientX, e.clientY, () => {
                    createWindow('Notes', generateNotesContent(), e.clientX, e.clientY);
                });
                break;
            case 'about':
                playHammer(e.clientX, e.clientY, () => {
                    createWindow('About WoodDesk', generateAboutContent(), e.clientX, e.clientY);
                });
                break;
            case 'arrange':
                // just refresh icons
                break;
            case 'refresh':
                break;
        }
    }

    // ─── DESKTOP ICONS — DRAGGABLE ───
    const desktopIcons = document.querySelectorAll('.desktop-icon');
    const ICON_W = 90, ICON_H = 110;

    // Preset shelf positions as percentage of desktop [left%, top%]
    // Tuned to sit on top of the wooden rack shelves
    const SHELF_POSITIONS = [
        [8, 18], [20, 18],               // row 1 LEFT  — My Projects, Documents
        [72, 18], [84, 18],               // row 1 RIGHT — Workshop, Saw Cutter
        [8, 42], [20, 42],               // row 2 LEFT  — Ruler Calc, Notes
        [72, 42],                          // row 2 RIGHT — About WoodDesk
        [8, 65], [20, 65], [32, 65],     // row 3 (spare)
    ];

    // Place icons at shelf positions (percentage-based → device-independent)
    desktopIcons.forEach((icon, i) => {
        const pos = SHELF_POSITIONS[i % SHELF_POSITIONS.length];
        const dW = window.innerWidth;
        const dH = window.innerHeight;
        icon.style.left = Math.round((pos[0] / 100) * dW) + 'px';
        icon.style.top = Math.round((pos[1] / 100) * dH) + 'px';
    });

    // Make each icon draggable
    desktopIcons.forEach(icon => {
        let dragging = false;
        let moved = false;
        let startX, startY, startLeft, startTop;

        icon.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            dragging = true;
            moved = false;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(icon.style.left) || 0;
            startTop = parseInt(icon.style.top) || 0;
            // deselect others, select this
            desktopIcons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
            moved = true;
            icon.classList.add('dragging');

            // Clamp within desktop bounds
            const dRect = desktop.getBoundingClientRect();
            const newLeft = Math.max(0, Math.min(dRect.width - ICON_W, startLeft + dx));
            const newTop = Math.max(0, Math.min(dRect.height - ICON_H, startTop + dy));
            icon.style.left = newLeft + 'px';
            icon.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            icon.classList.remove('dragging');
        });

        // single click → select (only if not a drag)
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (moved) return; // was a drag, not a click
            desktopIcons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
        });

        // double click → hammer + open
        icon.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (moved) return;
            const name = icon.dataset.name;
            const type = icon.dataset.type;
            playHammer(e.clientX, e.clientY, () => {
                let content;
                if (type === 'folder') {
                    content = generateFolderContent(name);
                } else {
                    content = generateAppContent(name);
                }
                createWindow(name, content);
            });
        });
    });

    // deselect icons on desktop click
    desktop.addEventListener('click', () => {
        desktopIcons.forEach(i => i.classList.remove('selected'));
    });


    // ─── WINDOW CREATION ───
    function createWindow(title, bodyHTML, x, y) {
        const id = ++windowIdCounter;
        const el = document.createElement('div');
        el.className = 'wood-window opening';
        el.dataset.winId = id;

        // position
        const offX = x != null ? Math.min(x, window.innerWidth - 420) : 80 + (id % 5) * 40;
        const offY = y != null ? Math.min(y, window.innerHeight - 350) : 60 + (id % 5) * 30;
        el.style.left = Math.max(0, offX) + 'px';
        el.style.top = Math.max(0, offY) + 'px';
        el.style.width = '420px';
        el.style.height = '340px';
        el.style.zIndex = ++topZ;

        el.innerHTML = `
      <div class="window-titlebar" data-win-id="${id}">
        <span class="window-title">${escHTML(title)}</span>
        <div class="window-controls">
          <button class="win-btn minimize-btn" title="Minimize">
            <svg viewBox="0 0 14 14">
              <rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="#f5deb3" stroke-width="1.5"/>
              <rect x="3" y="8" width="8" height="3" rx="1" fill="#f5deb3"/>
            </svg>
          </button>
          <button class="win-btn maximize-btn" title="Maximize">
            <svg viewBox="0 0 14 14">
              <rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="#f5deb3" stroke-width="1.5"/>
              <rect x="3" y="3" width="8" height="8" rx="1" fill="none" stroke="#f5deb3" stroke-width="1"/>
              <line x1="4" y1="7" x2="10" y2="7" stroke="#f5deb3" stroke-width="1"/>
              <line x1="7" y1="4" x2="7" y2="10" stroke="#f5deb3" stroke-width="1"/>
            </svg>
          </button>
          <button class="win-btn close-btn" title="Close">
            <svg viewBox="0 0 14 14">
              <rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="#f5deb3" stroke-width="1.5"/>
              <line x1="4" y1="4" x2="10" y2="10" stroke="#f5deb3" stroke-width="2" stroke-linecap="round"/>
              <line x1="10" y1="4" x2="4" y2="10" stroke="#f5deb3" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="window-body">${bodyHTML}</div>
    `;

        winContainer.appendChild(el);

        // register
        const winData = { id, el, title, minimized: false, maximized: false, prevRect: null };
        windows.set(id, winData);

        // activate
        activateWindow(id);

        // remove opening animation class
        el.addEventListener('animationend', function handler() {
            el.removeEventListener('animationend', handler);
            el.classList.remove('opening');
        });

        // event listeners
        el.addEventListener('mousedown', () => activateWindow(id));

        // title bar drag
        const titlebar = el.querySelector('.window-titlebar');
        setupDrag(titlebar, el, winData);

        // control buttons
        el.querySelector('.close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            closeWindow(el, e.clientX, e.clientY);
        });
        el.querySelector('.minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            minimizeWindow(id);
        });
        el.querySelector('.maximize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMaximize(id);
        });

        // taskbar entry
        addTaskbarItem(id, title);

        // init calculator if present
        if (el.querySelector('.ruler-calc')) {
            initCalculator(el);
        }

        return id;
    }

    // ─── WINDOW ACTIVATION ───
    function activateWindow(id) {
        windows.forEach((w, wid) => {
            w.el.classList.toggle('active', wid === id);
        });
        const w = windows.get(id);
        if (w) w.el.style.zIndex = ++topZ;

        // update taskbar
        document.querySelectorAll('.taskbar-item').forEach(ti => {
            ti.classList.toggle('active', +ti.dataset.winId === id);
        });
    }

    // ─── CROWBAR ELEMENT ───
    const crowbarEl = document.getElementById('crowbar-effect');

    // ─── CROWBAR PRYING ANIMATION ───
    function playCrowbar(x, y, callback) {
        crowbarEl.style.left = x + 'px';
        crowbarEl.style.top = y + 'px';
        crowbarEl.className = 'prying';
        crowbarEl.addEventListener('animationend', function handler() {
            crowbarEl.removeEventListener('animationend', handler);
            crowbarEl.className = 'hidden';
            if (callback) callback();
        });
    }

    // ─── WINDOW CLOSE ───
    function closeWindow(el, clickX, clickY) {
        const id = +el.dataset.winId;
        // Get position for crowbar — use click position or fallback to window's close button
        const rect = el.querySelector('.close-btn').getBoundingClientRect();
        const cx = clickX != null ? clickX : rect.left + rect.width / 2;
        const cy = clickY != null ? clickY : rect.top + rect.height / 2;

        // Play crowbar prying animation first, then close the window
        playCrowbar(cx, cy, () => {
            el.classList.add('closing');
            el.addEventListener('animationend', function handler() {
                el.removeEventListener('animationend', handler);
                el.remove();
                windows.delete(id);
                removeTaskbarItem(id);
            });
        });
    }

    // ─── WINDOW MINIMIZE ───
    function minimizeWindow(id) {
        const w = windows.get(id);
        if (!w || w.minimized) return;
        w.minimized = true;
        w.el.classList.add('minimizing');
        w.el.addEventListener('animationend', function handler() {
            w.el.removeEventListener('animationend', handler);
            w.el.style.display = 'none';
            w.el.classList.remove('minimizing');
        });
    }

    function restoreWindow(id) {
        const w = windows.get(id);
        if (!w || !w.minimized) return;
        w.minimized = false;
        w.el.style.display = 'flex';
        w.el.classList.add('restoring');
        w.el.addEventListener('animationend', function handler() {
            w.el.removeEventListener('animationend', handler);
            w.el.classList.remove('restoring');
        });
        activateWindow(id);
    }

    // ─── WINDOW MAXIMIZE / RESTORE ───
    function toggleMaximize(id) {
        const w = windows.get(id);
        if (!w) return;

        if (w.maximized) {
            // restore
            w.el.classList.add('maximizing');
            w.el.style.left = w.prevRect.left;
            w.el.style.top = w.prevRect.top;
            w.el.style.width = w.prevRect.width;
            w.el.style.height = w.prevRect.height;
            w.maximized = false;
            setTimeout(() => w.el.classList.remove('maximizing'), 400);
        } else {
            // save rect
            w.prevRect = {
                left: w.el.style.left,
                top: w.el.style.top,
                width: w.el.style.width,
                height: w.el.style.height
            };
            w.el.classList.add('maximizing');
            w.el.style.left = '0px';
            w.el.style.top = '0px';
            w.el.style.width = '100%';
            w.el.style.height = '100%';
            w.maximized = true;
            setTimeout(() => w.el.classList.remove('maximizing'), 400);
        }
        activateWindow(id);
    }

    // ─── DRAGGING ───
    function setupDrag(handle, el, winData) {
        let dragging = false;
        let startX, startY, origLeft, origTop;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.win-btn')) return;
            if (winData.maximized) return;
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            origLeft = parseInt(el.style.left);
            origTop = parseInt(el.style.top);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = (origLeft + dx) + 'px';
            el.style.top = (origTop + dy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
        });
    }

    // ─── TASKBAR ───
    function addTaskbarItem(id, title) {
        const ti = document.createElement('div');
        ti.className = 'taskbar-item active';
        ti.dataset.winId = id;
        ti.innerHTML = `<span class="tb-dot"></span><span class="tb-label">${escHTML(title)}</span>`;
        ti.addEventListener('click', () => {
            const w = windows.get(id);
            if (!w) return;
            if (w.minimized) {
                restoreWindow(id);
            } else {
                activateWindow(id);
            }
        });
        taskbarItems.appendChild(ti);
    }

    function removeTaskbarItem(id) {
        const ti = taskbarItems.querySelector(`[data-win-id="${id}"]`);
        if (ti) ti.remove();
    }

    // ─── CONTENT GENERATORS ───

    function generateFolderContent(name) {
        const items = ['Plans.docx', 'Materials.xlsx', 'Draft', 'Blueprints', 'Notes.txt'];
        let html = `<div class="folder-grid">`;
        items.forEach(item => {
            const isFolder = !item.includes('.');
            html += `
        <div class="folder-item">
          ${isFolder ? folderSVGSmall() : fileSVGSmall()}
          <span>${item}</span>
        </div>`;
        });
        html += `</div>`;
        return html;
    }

    function generateAppContent(name) {
        switch (name) {
            case 'Workshop': return generateWorkshopContent();
            case 'Ruler Calculator': return generateCalculatorContent();
            case 'Notes': return generateNotesContent();
            case 'About WoodDesk': return generateAboutContent();
            default: return generateFolderContent(name);
        }
    }

    function generateWorkshopContent() {
        return `
      <h3 style="margin-bottom:12px;color:#5c3a10;font-size:16px;">🔨 Workshop Tools</h3>
      <div class="workshop-tool">
        ${toolHammerSVG()}
        <div class="tool-info">
          <div class="tool-name">Claw Hammer</div>
          <div class="tool-desc">16 oz, fiberglass handle — great for general carpentry</div>
        </div>
      </div>
      <div class="workshop-tool">
        ${toolSawSVG()}
        <div class="tool-info">
          <div class="tool-name">Hand Saw</div>
          <div class="tool-desc">20" crosscut saw — Japanese-style pull cut</div>
        </div>
      </div>
      <div class="workshop-tool">
        ${toolChiselSVG()}
        <div class="tool-info">
          <div class="tool-name">Wood Chisel Set</div>
          <div class="tool-desc">6-piece set, 6mm to 32mm — Sheffield steel</div>
        </div>
      </div>
      <div class="workshop-tool">
        ${toolRulerSVG()}
        <div class="tool-info">
          <div class="tool-name">Combination Square</div>
          <div class="tool-desc">12" blade with spirit level — precision measuring</div>
        </div>
      </div>
    `;
    }

    function generateCalculatorContent() {
        return `
      <h3 style="margin-bottom:12px;color:#5c3a10;font-size:16px;">📐 Ruler Calculator</h3>
      <div class="ruler-calc">
        <div class="calc-row">
          <div>
            <label>Length</label>
            <input type="number" id="calc-length" placeholder="0" value="">
          </div>
          <div>
            <label>Width</label>
            <input type="number" id="calc-width" placeholder="0" value="">
          </div>
          <div>
            <label>Unit</label>
            <select id="calc-unit">
              <option value="cm">cm</option>
              <option value="in">inches</option>
              <option value="ft">feet</option>
              <option value="m">meters</option>
            </select>
          </div>
        </div>
        <div class="calc-result" id="calc-result">Enter dimensions above</div>
      </div>
    `;
    }

    function generateNotesContent() {
        return `
      <h3 style="margin-bottom:12px;color:#5c3a10;font-size:16px;">✏️ Wood Notes</h3>
      <textarea class="notes-area" placeholder="Write your woodworking notes here...&#10;&#10;- Measure twice, cut once&#10;- Sand with the grain&#10;- Apply finish in thin coats"></textarea>
    `;
    }

    function generateAboutContent() {
        return `
      <div class="about-content">
        <h2>🪵 WoodDesk</h2>
        <div class="version">Version 1.0 — Handcrafted Edition</div>
        <p>
          A whimsical desktop interface using a carpenter & woodworking metaphor.
          Built to demonstrate strong metaphor-based HCI design using the WIMP paradigm.
        </p>
        <p style="margin-top:12px;">
          <strong>Features:</strong> Wooden windows, tool-based icons,
          nail cursor, hammer interactions, drawer menus, and shelf-slot taskbar.
        </p>
        <p style="margin-top:12px;font-size:11px;color:#8a5a20;">
          Made with 🪚 and ❤️ — Pure HTML/CSS/JS
        </p>
      </div>
    `;
    }

    // ─── CALCULATOR LOGIC ───
    function initCalculator(el) {
        const lenInput = el.querySelector('#calc-length');
        const widInput = el.querySelector('#calc-width');
        const unitSel = el.querySelector('#calc-unit');
        const resultDiv = el.querySelector('#calc-result');

        if (!lenInput) return;

        function calc() {
            const l = parseFloat(lenInput.value) || 0;
            const w = parseFloat(widInput.value) || 0;
            const u = unitSel.value;
            if (l <= 0 || w <= 0) {
                resultDiv.textContent = 'Enter dimensions above';
                return;
            }
            const area = (l * w).toFixed(2);
            const perimeter = ((l + w) * 2).toFixed(2);
            const diagonal = Math.sqrt(l * l + w * w).toFixed(2);
            resultDiv.innerHTML = `
        Area: <strong>${area} ${u}²</strong> &nbsp;|&nbsp;
        Perimeter: <strong>${perimeter} ${u}</strong> &nbsp;|&nbsp;
        Diagonal: <strong>${diagonal} ${u}</strong>
      `;
        }
        lenInput.addEventListener('input', calc);
        widInput.addEventListener('input', calc);
        unitSel.addEventListener('change', calc);
    }

    // ─── SMALL SVG HELPERS ───
    function folderSVGSmall() {
        return `<svg viewBox="0 0 64 56" width="36" height="30">
      <rect x="2" y="12" width="60" height="42" rx="4" fill="#b07736" stroke="#8a5a20" stroke-width="2"/>
      <rect x="4" y="14" width="56" height="38" rx="3" fill="#c9904a"/>
      <rect x="2" y="4" width="28" height="12" rx="4" fill="#b07736" stroke="#8a5a20" stroke-width="2"/>
      <rect x="4" y="6" width="24" height="8" rx="3" fill="#c9904a"/>
      <rect x="26" y="30" width="12" height="4" rx="2" fill="#8a5a20"/>
    </svg>`;
    }

    function fileSVGSmall() {
        return `<svg viewBox="0 0 48 56" width="32" height="38">
      <rect x="4" y="4" width="40" height="48" rx="3" fill="#e6c88a" stroke="#a06828" stroke-width="2"/>
      <line x1="12" y1="18" x2="36" y2="18" stroke="#b07736" stroke-width="1.5"/>
      <line x1="12" y1="26" x2="36" y2="26" stroke="#b07736" stroke-width="1.5"/>
      <line x1="12" y1="34" x2="28" y2="34" stroke="#b07736" stroke-width="1.5"/>
      <polygon points="32,4 44,16 32,16" fill="#d4a860" stroke="#a06828" stroke-width="1"/>
    </svg>`;
    }

    function toolHammerSVG() {
        return `<svg viewBox="0 0 64 64" width="32" height="32">
      <rect x="28" y="30" width="8" height="30" rx="3" fill="#b07736" stroke="#8a5a20" stroke-width="1.5"/>
      <rect x="10" y="8" width="44" height="24" rx="5" fill="#7a7a7a" stroke="#5a5a5a" stroke-width="2"/>
    </svg>`;
    }

    function toolSawSVG() {
        return `<svg viewBox="0 0 64 64" width="32" height="32">
      <path d="M8,40 L56,16 L58,20 L10,44 Z" fill="#b0b0b0" stroke="#888" stroke-width="1"/>
      <rect x="44" y="10" width="16" height="14" rx="4" fill="#b07736" stroke="#8a5a20" stroke-width="1.5"/>
    </svg>`;
    }

    function toolChiselSVG() {
        return `<svg viewBox="0 0 64 64" width="32" height="32">
      <polygon points="28,6 36,6 38,26 26,26" fill="#b0b0b0" stroke="#888" stroke-width="1"/>
      <rect x="25" y="24" width="14" height="6" rx="1" fill="#8a8a8a" stroke="#666" stroke-width="1"/>
      <rect x="26" y="30" width="12" height="28" rx="4" fill="#b07736" stroke="#8a5a20" stroke-width="1.5"/>
    </svg>`;
    }

    function toolRulerSVG() {
        return `<svg viewBox="0 0 64 64" width="32" height="32">
      <rect x="8" y="14" width="48" height="36" rx="3" fill="#d4a050" stroke="#a07030" stroke-width="2"/>
      <rect x="10" y="16" width="44" height="32" rx="2" fill="#e6b868"/>
      <line x1="16" y1="16" x2="16" y2="28" stroke="#8a5a20" stroke-width="1.5"/>
      <line x1="28" y1="16" x2="28" y2="28" stroke="#8a5a20" stroke-width="1.5"/>
      <line x1="40" y1="16" x2="40" y2="28" stroke="#8a5a20" stroke-width="1.5"/>
    </svg>`;
    }

    // ─── UTILITIES ───
    function escHTML(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

})();
