// tray-zoom.js

(() => {
    const trayInner = document.getElementById('tray-inner');
    const trayZoomIn = document.getElementById('tray-zoom-in');
    const trayZoomOut = document.getElementById('tray-zoom-out');
    const trayZoomReset = document.getElementById('tray-zoom-reset');
    // Get the wrapper element by its ID
    const trayCanvasWrapper = document.getElementById('tray-canvas'); 

    let trayZoom = 1;
    const minZoom = 0.5;
    const maxZoom = 2.0;
    const step = 0.1;
    
    // Variables to store the initial, unscaled dimensions. 
    // We only rely on initialWidth now; initialHeight is calculated dynamically.
    let initialWidth = 0; 
    let initialUnscaledHeight = 0; // Renamed to clarify its purpose

    function getInitialDimensions() {
        console.groupCollapsed(`[DEBUG: INITIAL DIMENSIONS] Reading at Zoom ${trayZoom.toFixed(1)}`);
        
        // 1. Temporarily reset styles to capture true unscaled size
        trayInner.style.width = 'auto';
        trayInner.style.height = 'auto';
        trayInner.style.transform = 'scale(1)';
        
        // Ensure layout is stable before reading scrollHeight/Width
        // This forces the browser to calculate the final unscaled size
        void trayInner.offsetWidth; 

        // 2. Calculate dimensions
        
        // Width Fix: Subtract 32px horizontal padding (16px left + 16px right) on #piece-tray
        const containerWidthReduction = 32; 
        const internalBuffer = 20;
        
        // LOGGING RAW READINGS
        console.log(`[RAW READ] trayInner.scrollWidth: ${trayInner.scrollWidth}px`);
        console.log(`[RAW READ] trayInner.scrollHeight: ${trayInner.scrollHeight}px`);
        
        // Initial width calculation: subtract outer padding from the scrollable width
        initialWidth = trayInner.scrollWidth + internalBuffer - containerWidthReduction; 
        
        // Capture a reliable baseline height measurement
        initialUnscaledHeight = trayInner.scrollHeight;

        // Fallback safety check
        if (initialWidth < 50) initialWidth = 800; 
        if (initialUnscaledHeight < 50) initialUnscaledHeight = 40; 
        
        console.log(`[FINAL CALC] initialWidth (Used for layout): ${initialWidth}px`);
        console.log(`[FINAL CALC] initialUnscaledHeight (Base for scaling): ${initialUnscaledHeight}px`);
        console.groupEnd();

        console.log(`[Tray Zoom] Initialized Base Content Width: ${initialWidth}px`);
    }

    function applyTrayZoom(forceRecalc) {
        // If forceRecalc is true, always re-read initial dimensions
        if (forceRecalc) {
            getInitialDimensions();
        }
        if (initialWidth === 0) {
            console.warn("[WARNING] applyTrayZoom called before initialization. Running getInitialDimensions.");
            getInitialDimensions();
        }

        const effectiveWidth = initialWidth / trayZoom;
        
        // The layout height (effectiveHeight) is now obsolete because we don't rely on it for layout sizing.
        // We set it to a very small size, as its primary purpose was alignment.
        const effectiveHeight = initialUnscaledHeight / trayZoom; 

        // 1. Force the layout dimensions on TRAY-INNER 
        trayInner.style.width = `${effectiveWidth}px`;
        trayInner.style.height = `${effectiveHeight}px`; // Setting a layout size (even a small one)
        
        // 2. Apply the visual scale transformation
        trayInner.style.transform = `scale(${trayZoom})`;

        // 3. CRITICAL FIX: Manually set the height of the parent WRAPPER based on VISUAL content size.
        
        // Re-read scrollHeight here to get the CURRENT unscaled content height (robustness)
        const currentContentHeight = trayInner.scrollHeight; 
        const verticalBufferForControls = 50; 

        // Visual height is the scaled content height + buffer for controls/padding
        const scaledVisualHeight = (currentContentHeight * trayZoom) + verticalBufferForControls; 

        // Apply this visual height to the wrapper to force the layout space.
        // We add a small 10px buffer to prevent clipping the bottom edge.
        trayCanvasWrapper.style.height = `${scaledVisualHeight + 10}px`; 
        
        // --- Runtime Logging ---
        console.group(`[LOG: RUNTIME] Zoom Level ${trayZoom.toFixed(1)}`);
        console.log(`Effective Width (Layout): ${effectiveWidth.toFixed(2)}px`);
        console.log(`Effective Height (Layout): ${effectiveHeight.toFixed(2)}px`);
        console.log(`Current Unscaled Content Height: ${currentContentHeight.toFixed(2)}px`);
        console.log(`Scaled Visual Height (Applied to Wrapper): ${scaledVisualHeight.toFixed(2)}px`);
        console.log(`piece-tray final clientHeight: ${document.getElementById('piece-tray').clientHeight.toFixed(2)}px`);
        console.log(`flow-area top position: ${document.getElementById('flow-area').getBoundingClientRect().top.toFixed(2)}px`);
        console.groupEnd();
        // --- End Logging ---
    }
    
    // EXPOSED INITIALIZATION FUNCTION
    window.initializeTrayZoom = () => {
        initialWidth = 0; 
        initialUnscaledHeight = 0; 
        // Give time for pieces to render fully
        console.log("[INFO] Scheduling initial zoom calculation after 50ms delay.");
        setTimeout(() => {
            getInitialDimensions();
            applyTrayZoom();
        }, 50);
    };

    // Expose applyTrayZoom globally for use by flowRenderer.js
    window.applyTrayZoom = applyTrayZoom;

    // Attach event listeners (All listeners are correctly inside the IIFE)
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

    // Ctrl + scroll logic
    document.getElementById('piece-tray').addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        trayZoom += e.deltaY > 0 ? -step : step;
        trayZoom = Math.max(minZoom, Math.min(maxZoom, trayZoom));
        applyTrayZoom();
    }, { passive: false });
    
    // Initial load call
    window.addEventListener('load', window.initializeTrayZoom);
    window.addEventListener('resize', applyTrayZoom);
})();