// Activate progressive enhancement for CSS scroll reveal animations
document.body.classList.add('js-enabled');

// Initialize Telegram WebApp API
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#000000');
    tg.setBackgroundColor('#000000');
    tg.BackButton.hide();
}

/* --- HTML5 Canvas Interactive Thick Ribbon Waves Animation System --- */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

let scrollY = 0;
let scrollProgress = 0;
let targetScrollProgress = 0;

// Resize handler
window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

// Smoothly LERP scroll progress
function updateScroll() {
    scrollY = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    targetScrollProgress = maxScroll > 0 ? scrollY / maxScroll : 0;
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.12; // Easing LERP
}

// Function to draw the thick, smooth organic crimson lines from the bot banners
function drawThickRibbonWaves() {
    const time = Date.now() * 0.001;
    
    ctx.save();
    
    // Solid brand red neon glow styling (heavy glow matching screenshots)
    ctx.shadowBlur = 24 + Math.sin(time * 1.5) * 6;
    ctx.shadowColor = '#d41115';
    ctx.strokeStyle = '#d41115';
    ctx.lineCap = 'round';
    
    // WAVE 1: Top-Left Corner Flow
    // Combines scroll warping with a slow, continuous wave drift when static
    ctx.lineWidth = 18;
    ctx.beginPath();
    const wave1OffsetY = (scrollProgress * 70) + Math.sin(time * 0.4) * 20;
    const wave1OffsetX = Math.cos(time * 0.35) * 15;
    
    ctx.moveTo(-50, height * 0.06 + wave1OffsetY);
    ctx.bezierCurveTo(
        width * 0.28 + wave1OffsetX, height * 0.03 + Math.sin(time * 0.5) * 22 + wave1OffsetY,
        width * 0.38 + wave1OffsetX, height * 0.24 + Math.cos(time * 0.4) * 18 + wave1OffsetY,
        -50, height * 0.36 + wave1OffsetY
    );
    ctx.stroke();
    
    // WAVE 2: Main Right Weaving Ribbon (weaving down to the bottom)
    ctx.lineWidth = 22;
    ctx.beginPath();
    const wave2OffsetY = (-scrollProgress * 110) + Math.cos(time * 0.3) * 25;
    const wave2OffsetX = Math.sin(time * 0.45) * 20;
    
    ctx.moveTo(width + 50, height * 0.22 + wave2OffsetY);
    ctx.bezierCurveTo(
        width * 0.62 + wave2OffsetX, height * 0.32 + Math.sin(time * 0.4) * 30 + wave2OffsetY,
        width * 0.72 + wave2OffsetX, height * 0.72 + Math.cos(time * 0.3) * 28 + wave2OffsetY,
        width + 50, height * 0.82 + wave2OffsetY
    );
    ctx.stroke();

    // WAVE 3: Bottom-Left Corner Ribbon
    ctx.lineWidth = 16;
    ctx.beginPath();
    const wave3OffsetY = (scrollProgress * 50) + Math.sin(time * 0.5) * 16;
    const wave3OffsetX = Math.cos(time * 0.5) * 12;
    
    ctx.moveTo(-50, height * 0.78 + wave3OffsetY);
    ctx.bezierCurveTo(
        width * 0.22 + wave3OffsetX, height * 0.84 + Math.cos(time * 0.6) * 18 + wave3OffsetY,
        width * 0.32 + wave3OffsetX, height * 0.94 + Math.sin(time * 0.5) * 22 + wave3OffsetY,
        width * 0.08 + wave3OffsetX, height + 50 + wave3OffsetY
    );
    ctx.stroke();
    
    ctx.restore();
}

// Animation loop
function animate() {
    updateScroll();
    
    // Solid pitch black background (matching screenshot style)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw waves
    drawThickRibbonWaves();
    
    requestAnimationFrame(animate);
}
animate();

/* --- Intersection Observer for Scroll-Reveal Animations --- */
const revealElements = document.querySelectorAll('.reveal-el');

const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
        // Trigger immediately when 1% of card becomes visible
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            
            // Haptic trigger for Telegram
            if (tg && tg.HapticFeedback && !entry.target.dataset.hapticTriggered) {
                tg.HapticFeedback.impactOccurred('light');
                entry.target.dataset.hapticTriggered = 'true';
            }
        }
    });
};

const observerOptions = {
    root: null,
    threshold: 0.01,
    rootMargin: '0px 0px -10px 0px'
};

const observer = new IntersectionObserver(revealCallback, observerOptions);

revealElements.forEach(el => {
    observer.observe(el);
});

// Safeguard check: automatically reveal elements that are already in view initially
setTimeout(() => {
    revealElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            el.classList.add('active');
        }
    });
}, 200);
