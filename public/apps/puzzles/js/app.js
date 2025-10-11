import { parseDSL, resolveConnections } from './dslParser.js';
import { createGrid, addPiece, setConnections, renderArrows, resetState } from './flowRenderer.js';

        const GRID_CONTAINER = document.getElementById('grid-container');
        const SVG = document.getElementById('flow-svg');
        const DSL_INPUT = document.getElementById('dsl-input');
        const LOAD_BTN = document.getElementById('load-dsl');
        const ADD_COL = document.getElementById('add-col');
        const EXPORT_JSON = document.getElementById('export-json');
        const DOWNLOAD_PROJECT = document.getElementById('download-project');

        let cols = 6;
        createGrid(GRID_CONTAINER, cols);

        LOAD_BTN.addEventListener('click', ()=>{
          const {items,errors} = parseDSL(DSL_INPUT.value);
          if (errors.length) console.warn('DSL errors',errors);
          const {pieces,connections} = resolveConnections(items);

          // reset and create visual pieces
          resetState();
          createGrid(GRID_CONTAINER, Math.max(cols, ...Object.values(pieces).map(p=>p.c+1)));
          // add pieces to DOM
          Object.values(pieces).forEach(p=> addPiece(p.r,p.c,p.type,p.name,p.line));
          setConnections(connections);
          renderArrows(SVG);
        });

        ADD_COL.addEventListener('click', ()=>{ cols++; createGrid(GRID_CONTAINER, cols); renderArrows(SVG); });

        EXPORT_JSON.addEventListener('click', ()=>{
          alert('Export is not implemented in this demo.');
        });

        DOWNLOAD_PROJECT.addEventListener('click', ()=>{
          // browser download: create a small anchor to download the zip we will provide in the environment
          const url = 'event-flow-builder.zip'; // in a local run you would serve this; here it's a placeholder
          alert('In this environment the Download button is a placeholder. Use the zip link provided by the assistant.');
        });

        // small: re-render on resize
        window.addEventListener('resize', ()=>renderArrows(SVG));
