// tray-zoom-editor.js
// Adapted from gaming/tray-zoom.js for the editor tray

(() => {
    const trayInner = document.getElementById('tray-inner');
    const trayZoomIn = document.getElementById('tray-zoom-in');
    const trayZoomOut = document.getElementById('tray-zoom-out');
    const trayZoomReset = document.getElementById('tray-zoom-reset');
    const trayCanvasWrapper = document.getElementById('tray-canvas');

    let trayZoom = 1;
    const minZoom = 0.5;
    const maxZoom = 2.0;
    const step = 0.1;

    function applyTrayZoom(resetZoom = false) {
        if (!trayInner || !trayCanvasWrapper) return;
        if (resetZoom) trayZoom = 1;
        trayInner.style.width = 'auto';
        trayInner.style.height = 'auto';
        void trayInner.offsetWidth;
        const unscaledWidth = trayInner.scrollWidth;
        const unscaledHeight = trayInner.scrollHeight;
        trayCanvasWrapper.style.width = unscaledWidth + 'px';
        trayCanvasWrapper.style.height = unscaledHeight + 'px';
        trayInner.style.transform = `scale(${trayZoom})`;
        trayInner.style.transformOrigin = 'top left';
        // Log number of cards and tray sizes for debugging
        const cardCount = trayInner.querySelectorAll('.flow-piece').length;
        console.log(`[TrayZoom] Cards in tray: ${cardCount}, trayInner: ${unscaledWidth}x${unscaledHeight}, zoom: ${trayZoom}`);
    }

    if (trayZoomIn) {
        trayZoomIn.addEventListener('click', () => {
            trayZoom = Math.min(maxZoom, trayZoom + step);
            applyTrayZoom();
        });
        trayZoomOut.addEventListener('click', () => {
            trayZoom = Math.max(minZoom, trayZoom - step);
            applyTrayZoom();
        });
        trayZoomReset.addEventListener('click', () => {
            trayZoom = 1;
            applyTrayZoom();
        });
    }

    document.getElementById('piece-tray').addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        trayZoom += e.deltaY > 0 ? -step : step;
        trayZoom = Math.max(minZoom, Math.min(maxZoom, trayZoom));
        applyTrayZoom();
    }, { passive: false });

    window.applyTrayZoom = applyTrayZoom;
    window.addEventListener('resize', applyTrayZoom);
    window.addEventListener('load', applyTrayZoom);
})();
