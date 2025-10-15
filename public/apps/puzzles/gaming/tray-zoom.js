const trayWrapper = document.getElementById('tray-wrapper');
const trayInner = document.getElementById('tray-inner');
const trayZoomIn = document.getElementById('tray-zoom-in');
const trayZoomOut = document.getElementById('tray-zoom-out');
const trayZoomReset = document.getElementById('tray-zoom-reset');

let trayZoom = 1;
const minZoom = 0.5;
const maxZoom = 2.0;
const step = 0.1;

function applyTrayZoom() {
    trayInner.style.transform = `scale(${trayZoom})`;
    trayInner.style.transformOrigin = 'top left';

    // Dynamically set wrapper height to fit scaled content
    const innerRect = trayInner.getBoundingClientRect();
    const wrapperRect = trayWrapper.getBoundingClientRect();

    // Convert absolute pixel height to "unscaled" content height
    const newHeight = trayInner.scrollHeight * trayZoom;
    trayWrapper.style.height = `${newHeight}px`;
}


// Event listeners
trayZoomIn?.addEventListener('click', () => { trayZoom = Math.min(maxZoom, trayZoom + step); applyTrayZoom(); });
trayZoomOut?.addEventListener('click', () => { trayZoom = Math.max(minZoom, trayZoom - step); applyTrayZoom(); });
trayZoomReset?.addEventListener('click', () => { trayZoom = 1; applyTrayZoom(); });

// Ctrl+wheel zoom
document.getElementById('piece-tray').addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    trayZoom += e.deltaY > 0 ? -step : step;
    trayZoom = Math.max(minZoom, Math.min(maxZoom, trayZoom));
    applyTrayZoom();
}, { passive: false });

// Init on load & resize
window.addEventListener('resize', () => applyTrayZoom());
