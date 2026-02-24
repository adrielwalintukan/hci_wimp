/* ══════════════════════════════════════════════════════
   WoodDesk – Puzzle Overlay System
   Intercepts folder double-clicks and requires 4
   carpenter mini-puzzles before opening the folder.
══════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── ELEMENT REFS ── */
    const overlay = document.getElementById('puzzle-overlay');
    const board = document.getElementById('puzzle-board');
    const titleEl = document.getElementById('puzzle-title');
    const closeBtn = document.getElementById('puzzle-close-btn');
    const successReveal = document.getElementById('puzzle-success-reveal');

    if (!overlay) return;   // safety guard

    /* State */
    let pendingCallback = null;     // called when all puzzles solved
    let pendingName = '';
    let solved = { screw: false, saw: false, nail: false, pliers: false };

    /* ── PUBLIC API: show puzzle board before opening a folder ── */
    window.PuzzleSystem = {
        show(folderName, onComplete) {
            pendingCallback = onComplete;
            pendingName = folderName;
            resetAll();
            titleEl.textContent = '🔒 ' + folderName;
            overlay.style.display = 'flex';       // undo the hard-hide
            requestAnimationFrame(() => {          // let display:flex paint first
                overlay.classList.remove('puzzle-hidden');
                board.classList.remove('exiting');
            });
        }
    };


    /* ── CLOSE BUTTON ── */
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissOverlay(false);
    });

    /* close on backdrop click */
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) dismissOverlay(false);
    });

    function dismissOverlay(openFolder) {
        board.classList.add('exiting');

        let done = false;
        function finish() {
            if (done) return;
            done = true;
            board.removeEventListener('animationend', onAnim);
            overlay.classList.add('puzzle-hidden');
            overlay.style.display = 'none';   // hard-hide: no pointer events possible
            board.classList.remove('exiting');
            if (openFolder && pendingCallback) {
                pendingCallback();
                pendingCallback = null;
            }
        }

        function onAnim(e) {
            if (e.target !== board) return; // ignore bubbling child animations
            finish();
        }

        board.addEventListener('animationend', onAnim);
        setTimeout(finish, 600); // safety fallback
    }


    /* ── RESET ALL PUZZLES ── */
    function resetAll() {
        solved = { screw: false, saw: false, nail: false, pliers: false };
        successReveal.classList.remove('showing');

        /* ── Screw ── */
        const screw = document.getElementById('ps-screw');
        screw.classList.remove('screwing');
        screw.style.cssText = '';
        screw.style.removeProperty('--sx');
        screw.style.removeProperty('--sy');
        document.getElementById('ptile-screw').classList.remove('solved');

        /* ── Saw ── */
        const saw = document.getElementById('ps-saw');
        const woodL = document.getElementById('ps-wood-l');
        const woodR = document.getElementById('ps-wood-r');
        saw.classList.remove('cutting');
        woodL.classList.remove('splitting');
        woodR.classList.remove('splitting');
        saw.style.cssText = '';
        document.getElementById('ptile-saw').classList.remove('solved');

        /* ── Nail ── */
        const nail = document.getElementById('ps-nail');
        const hammer = document.getElementById('ps-hammer');
        nail.classList.remove('sinking');
        hammer.classList.remove('swinging');
        hammer.disabled = false;
        document.getElementById('ptile-nail').classList.remove('solved');

        /* ── Pliers ── */
        const pliers = document.getElementById('ps-pliers');
        const rod = document.getElementById('ps-rod');
        pliers.classList.remove('dragging-active');
        pliers.style.cssText = '';
        rod.classList.remove('straightening');
        rod.setAttribute('points', '40,30 70,60 100,40 120,80');
        document.getElementById('ptile-pliers').classList.remove('solved');

        // Remove any leftover sawdust
        document.querySelectorAll('.sawdust').forEach(d => d.remove());

        updateProgress();
    }

    /* ── PROGRESS TRACKER ── */
    function markSolved(name) {
        if (solved[name]) return;
        solved[name] = true;
        document.getElementById('ptile-' + name).classList.add('solved');
        updateProgress();
        checkAllSolved();
    }

    function updateProgress() {
        // update pip dots (if they exist)
        const pips = document.querySelectorAll('.puzzle-pip');
        const keys = ['screw', 'saw', 'nail', 'pliers'];
        pips.forEach((pip, i) => {
            pip.classList.toggle('done', !!solved[keys[i]]);
        });
        const count = Object.values(solved).filter(Boolean).length;
        const label = document.getElementById('puzzle-progress-label');
        if (label) label.textContent = count + ' / 4 solved';
    }

    function checkAllSolved() {
        if (Object.values(solved).every(Boolean)) {
            setTimeout(showSuccess, 350);
        }
    }

    function showSuccess() {
        successReveal.classList.add('showing');
        setTimeout(() => dismissOverlay(true), 1800);
    }

    /* ═══════════════════════════════════════════════
       PUZZLE 1 — SCREW (drag screw to hole)
    ═══════════════════════════════════════════════ */
    (function initScrew() {
        const screw = document.getElementById('ps-screw');
        const scene = document.getElementById('pscene-screw');
        const hole = document.getElementById('ps-hole');   // <circle> SVG element

        let dragging = false;
        let startX, startY, ox, oy;

        screw.addEventListener('mousedown', (e) => {
            if (solved.screw) return;
            e.preventDefault();
            dragging = true;
            const r = screw.getBoundingClientRect();
            ox = e.clientX - r.left;
            oy = e.clientY - r.top;
            startX = r.left;
            startY = r.top;
            screw.classList.add('dragging-active');
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const sr = scene.getBoundingClientRect();
            const nx = e.clientX - sr.left - ox;
            const ny = e.clientY - sr.top - oy;
            screw.style.left = nx + 'px';
            screw.style.top = ny + 'px';
        });

        document.addEventListener('mouseup', (e) => {
            if (!dragging) return;
            dragging = false;
            screw.classList.remove('dragging-active');
            if (solved.screw) return;

            /* Check proximity to hole centre */
            const sr = scene.getBoundingClientRect();
            const svgW = sr.width;
            const svgH = sr.height;
            // Hole is at SVG coords 80,80 in a 160×120 viewBox
            const holeScreenX = sr.left + (80 / 160) * svgW;
            const holeScreenY = sr.top + (80 / 120) * svgH;
            const dist = Math.hypot(e.clientX - holeScreenX, e.clientY - holeScreenY);

            if (dist < 45) {
                /* Compute delta from current screw pos to hole pos in scene space */
                const screwR = screw.getBoundingClientRect();
                const screwCX = screwR.left + screwR.width / 2;
                const screwCY = screwR.top + screwR.height / 2;
                const dx = holeScreenX - screwCX;
                const dy = holeScreenY - screwCY;
                screw.style.setProperty('--sx', dx + 'px');
                screw.style.setProperty('--sy', dy + 'px');
                screw.classList.add('screwing');
                screw.addEventListener('animationend', () => markSolved('screw'), { once: true });
            }
        });

        /* Touch support */
        screw.addEventListener('touchstart', (e) => {
            if (solved.screw) return;
            e.preventDefault();
            const t = e.touches[0];
            const r = screw.getBoundingClientRect();
            ox = t.clientX - r.left;
            oy = t.clientY - r.top;
            dragging = true;
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            const t = e.touches[0];
            const sr = scene.getBoundingClientRect();
            screw.style.left = (t.clientX - sr.left - ox) + 'px';
            screw.style.top = (t.clientY - sr.top - oy) + 'px';
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!dragging) return;
            dragging = false;
            const t = e.changedTouches[0];
            const sr = scene.getBoundingClientRect();
            const svgW = sr.width;
            const svgH = sr.height;
            const holeScreenX = sr.left + (80 / 160) * svgW;
            const holeScreenY = sr.top + (80 / 120) * svgH;
            const dist = Math.hypot(t.clientX - holeScreenX, t.clientY - holeScreenY);
            if (dist < 50) {
                const screwR = screw.getBoundingClientRect();
                screw.style.setProperty('--sx', (holeScreenX - screwR.left - screwR.width / 2) + 'px');
                screw.style.setProperty('--sy', (holeScreenY - screwR.top - screwR.height / 2) + 'px');
                screw.classList.add('screwing');
                screw.addEventListener('animationend', () => markSolved('screw'), { once: true });
            }
        }, { passive: true });
    })();

    /* ═══════════════════════════════════════════════
       PUZZLE 2 — SAW (drag saw horizontally to cut)
    ═══════════════════════════════════════════════ */
    (function initSaw() {
        const saw = document.getElementById('ps-saw');
        const woodL = document.getElementById('ps-wood-l');
        const woodR = document.getElementById('ps-wood-r');
        const scene = document.getElementById('pscene-saw');

        let dragging = false;
        let startX, totalDrag = 0;

        saw.addEventListener('mousedown', (e) => {
            if (solved.saw) return;
            e.preventDefault();
            dragging = true;
            startX = e.clientX;
            totalDrag = 0;
            saw.classList.add('dragging-active');
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            totalDrag = Math.max(totalDrag, dx);
            // Give visual feedback — move saw
            const sr = scene.getBoundingClientRect();
            const cur = parseFloat(saw.style.left) || 0;
            saw.style.left = (sr.width / 2 - saw.offsetWidth / 2 + dx * 0.6) + 'px';
        });

        document.addEventListener('mouseup', (e) => {
            if (!dragging) return;
            dragging = false;
            saw.classList.remove('dragging-active');
            const dx = e.clientX - startX;
            if (dx > 60 && !solved.saw) {
                triggerSaw();
            } else {
                // snap back
                saw.style.left = '';
            }
        });

        /* Touch */
        saw.addEventListener('touchstart', (e) => {
            if (solved.saw) return;
            e.preventDefault();
            dragging = true;
            startX = e.touches[0].clientX;
            totalDrag = 0;
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            const dx = e.touches[0].clientX - startX;
            totalDrag = Math.max(totalDrag, dx);
            const sr = scene.getBoundingClientRect();
            saw.style.left = (sr.width / 2 - 40 + dx * 0.6) + 'px';
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!dragging) return;
            dragging = false;
            const dx = e.changedTouches[0].clientX - startX;
            if (dx > 50 && !solved.saw) triggerSaw();
            else saw.style.left = '';
        }, { passive: true });

        function triggerSaw() {
            saw.classList.add('cutting');
            woodL.classList.add('splitting');
            woodR.classList.add('splitting');
            spawnSawdust(scene);
            setTimeout(() => markSolved('saw'), 700);
        }
    })();

    function spawnSawdust(container) {
        const centerX = container.offsetWidth / 2;
        const centerY = container.offsetHeight / 2;
        for (let i = 0; i < 12; i++) {
            const d = document.createElement('div');
            d.className = 'sawdust';
            const angle = (Math.random() * Math.PI * 2);
            const dist = 20 + Math.random() * 50;
            d.style.left = centerX + 'px';
            d.style.top = centerY + 'px';
            d.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            d.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            d.style.width = (3 + Math.random() * 5) + 'px';
            d.style.height = d.style.width;
            container.appendChild(d);
            d.addEventListener('animationend', () => d.remove());
        }
    }

    /* ═══════════════════════════════════════════════
       PUZZLE 3 — NAIL (click hammer to drive nail)
    ═══════════════════════════════════════════════ */
    (function initNail() {
        const hammer = document.getElementById('ps-hammer');
        const nail = document.getElementById('ps-nail');

        hammer.addEventListener('click', () => {
            if (solved.nail) return;
            /* Hammer swings */
            hammer.classList.remove('swinging');
            void hammer.offsetWidth; // reflow
            hammer.classList.add('swinging');

            /* Nail sinks */
            nail.classList.remove('sinking');
            void nail.offsetWidth;
            nail.classList.add('sinking');

            hammer.disabled = true;
            nail.addEventListener('animationend', () => markSolved('nail'), { once: true });
        });
    })();

    /* ═══════════════════════════════════════════════
       PUZZLE 4 — PLIERS (drag over rod to straighten)
    ═══════════════════════════════════════════════ */
    (function initPliers() {
        const pliers = document.getElementById('ps-pliers');
        const rod = document.getElementById('ps-rod');
        const scene = document.getElementById('pscene-pliers');

        let dragging = false;
        let ox, oy, totalDist = 0;
        let startX, startY;

        pliers.addEventListener('mousedown', (e) => {
            if (solved.pliers) return;
            e.preventDefault();
            dragging = true;
            totalDist = 0;
            const r = pliers.getBoundingClientRect();
            ox = e.clientX - r.left;
            oy = e.clientY - r.top;
            startX = e.clientX;
            startY = e.clientY;
            pliers.classList.add('dragging-active');
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const sr = scene.getBoundingClientRect();
            pliers.style.left = (e.clientX - sr.left - ox) + 'px';
            pliers.style.top = (e.clientY - sr.top - oy) + 'px';
            totalDist += Math.hypot(e.movementX, e.movementY);

            /* Animate rod straightening progressively */
            if (totalDist > 30) {
                const t = Math.min((totalDist - 30) / 80, 1);
                const pts = interpolateRod(t);
                rod.setAttribute('points', pts);
            }
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            pliers.classList.remove('dragging-active');
            if (totalDist > 90 && !solved.pliers) {
                rod.setAttribute('points', '38,55 80,55 110,55 130,55');
                rod.classList.add('straightening');
                markSolved('pliers');
            } else {
                /* Snap rod back */
                rod.setAttribute('points', '40,30 70,60 100,40 120,80');
                pliers.style.cssText = '';
            }
        });

        /* Touch */
        pliers.addEventListener('touchstart', (e) => {
            if (solved.pliers) return;
            e.preventDefault();
            dragging = true;
            totalDist = 0;
            const t = e.touches[0];
            const r = pliers.getBoundingClientRect();
            ox = t.clientX - r.left;
            oy = t.clientY - r.top;
            startX = t.clientX; startY = t.clientY;
        }, { passive: false });

        let lastTouchX = 0, lastTouchY = 0;
        document.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            const t = e.touches[0];
            const sr = scene.getBoundingClientRect();
            pliers.style.left = (t.clientX - sr.left - ox) + 'px';
            pliers.style.top = (t.clientY - sr.top - oy) + 'px';
            totalDist += Math.hypot(t.clientX - lastTouchX, t.clientY - lastTouchY);
            lastTouchX = t.clientX; lastTouchY = t.clientY;
            if (totalDist > 30) {
                const prog = Math.min((totalDist - 30) / 80, 1);
                rod.setAttribute('points', interpolateRod(prog));
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (!dragging) return;
            dragging = false;
            if (totalDist > 80 && !solved.pliers) {
                rod.setAttribute('points', '38,55 80,55 110,55 130,55');
                rod.classList.add('straightening');
                markSolved('pliers');
            } else {
                rod.setAttribute('points', '40,30 70,60 100,40 120,80');
                pliers.style.cssText = '';
            }
        }, { passive: true });

        /* Lerp between bent shape and straight shape */
        function interpolateRod(t) {
            const bent = [[40, 30], [70, 60], [100, 40], [120, 80]];
            const straight = [[38, 55], [80, 55], [110, 55], [130, 55]];
            return bent.map((p, i) => {
                const x = p[0] + (straight[i][0] - p[0]) * t;
                const y = p[1] + (straight[i][1] - p[1]) * t;
                return x.toFixed(1) + ',' + y.toFixed(1);
            }).join(' ');
        }
    })();

    /* ── Add progress pip row dynamically ── */
    (function addProgressRow() {
        const row = document.createElement('div');
        row.id = 'puzzle-progress-row';
        ['screw', 'saw', 'nail', 'pliers'].forEach(k => {
            const pip = document.createElement('div');
            pip.className = 'puzzle-pip';
            pip.dataset.key = k;
            row.appendChild(pip);
        });
        const label = document.createElement('span');
        label.id = 'puzzle-progress-label';
        label.textContent = '0 / 4 solved';
        row.appendChild(label);
        board.appendChild(row);
    })();

})(); /* end puzzle IIFE */
