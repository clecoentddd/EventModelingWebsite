// public/apps/puzzles/js/puzzleGuide.js - FINAL (Highlight Slots ONLY)

// --- CORE EXPORTED FUNCTIONS ---

/**
 * Removes the highlight class from all elements on the canvas.
 */
export function clearAllHighlights() { 
    document.querySelectorAll('.slot-highlight').forEach(el => {
        el.classList.remove('slot-highlight');
    });
    console.log("[Guide] All previous highlights cleared.");
}

/**
 * Finds and highlights ALL empty grid slots that require a piece.
 */
export function highlightNextSlot(currentDsl, lastCompletedElementId) { 
    clearAllHighlights(); 

    if (!window.currentGameConfig || !window.currentGameConfig.solutionMap) {
        console.error("[Guide] Cannot highlight slots: Game config or solution map is missing.");
        return;
    }

    console.log(`[Guide] Highlighting ALL required slots for the puzzle...`);

    const solutionMap = window.currentGameConfig.solutionMap;

    // Iterate through every correct placement key in the solution
    for (const slotKey in solutionMap) {
        highlightTargetSlot(slotKey);
    }
}


// --- INTERNAL HELPER FUNCTIONS ---

/**
 * Highlights a specific empty grid slot by its R_C key.
 * @param {string} slotKey - The R_C key (e.g., "0_1").
 */
function highlightTargetSlot(slotKey) {
    const slotElement = document.getElementById(slotKey);
    
    // Only highlight the slot if it exists AND is currently empty
    if(slotElement && !slotElement.querySelector('.flow-piece')) { 
        slotElement.classList.add('slot-highlight');
        // Keep the slot visible in the viewport
        
        console.log(`[Guide] ✅ Applied highlight to empty grid slot: #${slotKey}`);
    }
}