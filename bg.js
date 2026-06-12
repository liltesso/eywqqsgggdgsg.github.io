/**
 * Gifts Market — ambient crimson ribbon background.
 * Ported from the main site (index.html / offer page) but with the
 * moving red stripes made far more transparent. Red glow stays via
 * soft shadow + the CSS .glow-spot layers.
 */
(function () {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width  = canvas.width  = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
        width  = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width  = width  * dpr;
        canvas.height = height * dpr;
        canvas.style.width  = width  + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Soft scroll-warp so ribbons feel alive while scrolling the catalog
    let scrollProgress = 0, targetScroll = 0;
    window.addEventListener('scroll', () => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        targetScroll = Math.min(1, window.scrollY / max);
    }, { passive: true });

    // ── Draw the translucent glowing crimson ribbons ──────────────
    function drawRibbons() {
        const time = Date.now() * 0.001;
        ctx.save();

        // Red сіяння (glow) — kept, ribbon body — very transparent
        ctx.shadowColor = 'rgba(212,17,21,0.9)';
        ctx.shadowBlur  = 28 + Math.sin(time * 1.4) * 6;
        ctx.strokeStyle = '#d41115';
        ctx.lineCap     = 'round';
        ctx.globalAlpha = 0.085;   // ← much more transparent than the main site

        // WAVE 1 — top-left flow
        ctx.lineWidth = 16;
        ctx.beginPath();
        const w1y = (scrollProgress * 70) + Math.sin(time * 0.4) * 20;
        const w1x = Math.cos(time * 0.35) * 15;
        ctx.moveTo(-50, height * 0.06 + w1y);
        ctx.bezierCurveTo(
            width * 0.28 + w1x, height * 0.03 + Math.sin(time * 0.5) * 22 + w1y,
            width * 0.38 + w1x, height * 0.24 + Math.cos(time * 0.4) * 18 + w1y,
            -50, height * 0.36 + w1y
        );
        ctx.stroke();

        // WAVE 2 — main right weaving ribbon
        ctx.lineWidth = 20;
        ctx.beginPath();
        const w2y = (-scrollProgress * 110) + Math.cos(time * 0.3) * 25;
        const w2x = Math.sin(time * 0.45) * 20;
        ctx.moveTo(width + 50, height * 0.22 + w2y);
        ctx.bezierCurveTo(
            width * 0.62 + w2x, height * 0.32 + Math.sin(time * 0.4) * 30 + w2y,
            width * 0.72 + w2x, height * 0.72 + Math.cos(time * 0.3) * 28 + w2y,
            width + 50, height * 0.82 + w2y
        );
        ctx.stroke();

        // WAVE 3 — bottom-left ribbon
        ctx.lineWidth = 14;
        ctx.beginPath();
        const w3y = (scrollProgress * 50) + Math.sin(time * 0.5) * 16;
        const w3x = Math.cos(time * 0.5) * 12;
        ctx.moveTo(-50, height * 0.78 + w3y);
        ctx.bezierCurveTo(
            width * 0.22 + w3x, height * 0.84 + Math.cos(time * 0.6) * 18 + w3y,
            width * 0.32 + w3x, height * 0.94 + Math.sin(time * 0.5) * 22 + w3y,
            width * 0.08 + w3x, height + 50 + w3y
        );
        ctx.stroke();

        ctx.restore();
    }

    function frame() {
        scrollProgress += (targetScroll - scrollProgress) * 0.12;
        ctx.clearRect(0, 0, width, height);  // transparent → app's dark theme shows through
        drawRibbons();
        if (!reduced) requestAnimationFrame(frame);
    }

    if (reduced) {
        // Render a single static faint pass for reduced-motion users
        frame();
    } else {
        requestAnimationFrame(frame);
    }
})();
