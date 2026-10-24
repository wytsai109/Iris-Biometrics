/**
 * IRIS BIOMETRICS OS | CONTROLLER & SYNTHETIC EYE GENERATOR
 * Handles user interactions, procedural eye synthesis, camera feed,
 * pipeline visualization, and biometric matching verdicts.
 */

document.addEventListener('DOMContentLoaded', () => {
    const engine = new IrisEngine();

    // DOM Elements - Canvases
    const canvasEyeA = document.getElementById('canvasEyeA');
    const canvasEyeB = document.getElementById('canvasEyeB');
    const canvasStripA = document.getElementById('canvasStripA');
    const canvasStripB = document.getElementById('canvasStripB');
    const canvasIrisCodeMatrix = document.getElementById('canvasIrisCodeMatrix');

    // Coordinates tags
    const coordsA = document.getElementById('coordsA');
    const coordsB = document.getElementById('coordsB');

    // Gabor Canvases
    const gaborACanvases = Array.from({ length: 6 }, (_, i) => document.getElementById(`gaborA_${i}`));
    const gaborBCanvases = Array.from({ length: 6 }, (_, i) => document.getElementById(`gaborB_${i}`));

    // Metric Elements
    const verdictCard = document.getElementById('verdictCard');
    const verdictIcon = document.getElementById('verdictIcon');
    const verdictTitle = document.getElementById('verdictTitle');
    const verdictSub = document.getElementById('verdictSub');

    const valCorrelation = document.getElementById('valCorrelation');
    const barCorrelation = document.getElementById('barCorrelation');
    const valHamming = document.getElementById('valHamming');
    const barHamming = document.getElementById('barHamming');

    // Controls
    const selectPresetA = document.getElementById('selectPresetA');
    const selectPresetB = document.getElementById('selectPresetB');
    const uploadA = document.getElementById('uploadA');
    const uploadB = document.getElementById('uploadB');
    const btnRunMatch = document.getElementById('btnRunMatch');
    const btnCamera = document.getElementById('btnCamera');
    const cameraBox = document.getElementById('cameraBox');
    const webcam = document.getElementById('webcam');
    const btnCaptureCamera = document.getElementById('btnCaptureCamera');

    let processedA = null;
    let processedB = null;
    let mediaStream = null;

    // Pseudo-random deterministic number generator
    function pseudoRandom(seed) {
        let s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return function() {
            return (s = s * 16807 % 2147483647) / 2147483647;
        };
    }

    /**
     * Procedural Realistic Eye Synthesis
     * Generates Sclera, Limbal ring, Pupillary frill, Radial Trabecular Fibers, Crypts
     */
    function generateSyntheticEye(canvas, seed = 101, irisBaseHue = 210, noiseOffset = 0) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const rand = pseudoRandom(seed);

        const cx = Math.round(w / 2);
        const cy = Math.round(h / 2);
        const pupilR = 34 + (rand() * 4 - 2);
        const irisR = 86 + (rand() * 6 - 3);

        // 1. Sclera Background (Off-white / cream with light noise)
        const scleraGrad = ctx.createRadialGradient(cx, cy, irisR, cx, cy, w * 0.7);
        scleraGrad.addColorStop(0, '#e8edf2');
        scleraGrad.addColorStop(0.7, '#d6dee6');
        scleraGrad.addColorStop(1, '#b4c1ce');
        ctx.fillStyle = scleraGrad;
        ctx.fillRect(0, 0, w, h);

        // Micro-blood vessels in sclera
        ctx.strokeStyle = 'rgba(210, 80, 80, 0.22)';
        ctx.lineWidth = 1;
        for (let v = 0; v < 8; v++) {
            ctx.beginPath();
            let vx = rand() > 0.5 ? rand() * 40 : w - rand() * 40;
            let vy = rand() * h;
            ctx.moveTo(vx, vy);
            for (let step = 0; step < 4; step++) {
                vx += (cx - vx) * 0.2 + (rand() - 0.5) * 15;
                vy += (cy - vy) * 0.2 + (rand() - 0.5) * 15;
                ctx.lineTo(vx, vy);
            }
            ctx.stroke();
        }

        // 2. Iris Disc Base Gradient
        const irisGrad = ctx.createRadialGradient(cx, cy, pupilR, cx, cy, irisR);
        irisGrad.addColorStop(0, `hsl(${irisBaseHue}, 45%, 28%)`);
        irisGrad.addColorStop(0.35, `hsl(${irisBaseHue + 15}, 65%, 42%)`);
        irisGrad.addColorStop(0.75, `hsl(${irisBaseHue}, 55%, 32%)`);
        irisGrad.addColorStop(1, `hsl(${irisBaseHue - 20}, 70%, 14%)`); // Limbal ring

        ctx.beginPath();
        ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
        ctx.fillStyle = irisGrad;
        ctx.fill();

        // 3. Radial Trabecular Fibers & Crypts
        const fiberCount = 360;
        ctx.save();
        ctx.translate(cx, cy);

        for (let i = 0; i < fiberCount; i++) {
            const angle = (i / fiberCount) * Math.PI * 2;
            const fiberLength = pupilR + (irisR - pupilR) * (0.85 + rand() * 0.15);
            const fiberAlpha = 0.2 + rand() * 0.55;
            const lightness = 40 + rand() * 45;

            ctx.rotate((Math.PI * 2) / fiberCount);
            ctx.strokeStyle = `hsla(${irisBaseHue + (rand() - 0.5) * 20}, 60%, ${lightness}%, ${fiberAlpha})`;
            ctx.lineWidth = 1 + rand() * 1.5;

            ctx.beginPath();
            ctx.moveTo(0, pupilR * 0.95);
            // Slight curve / zigzag
            const midR = pupilR + (irisR - pupilR) * 0.5;
            const wobble = (rand() - 0.5) * 3;
            ctx.quadraticCurveTo(wobble, midR, 0, fiberLength);
            ctx.stroke();
        }

        // Collarette Ring (Zig-zag wavy ridge around 1.5x pupil)
        ctx.strokeStyle = `hsla(${irisBaseHue + 30}, 80%, 65%, 0.45)`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        const collaretteR = pupilR * 1.55;
        for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.15) {
            const rWave = collaretteR + (rand() - 0.5) * 6;
            const px = rWave * Math.cos(a);
            const py = rWave * Math.sin(a);
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.restore();

        // 4. Limbal Dark Ring Outline
        ctx.beginPath();
        ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(10, 20, 30, 0.75)';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 5. Deep Pupil (Solid Black with Pupillary Frill)
        ctx.beginPath();
        ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0d12';
        ctx.fill();

        // 6. Corneal Specular Glint (Light Reflection)
        const glintX = cx - pupilR * 0.45;
        const glintY = cy - pupilR * 0.45;
        const glintGrad = ctx.createRadialGradient(glintX, glintY, 1, glintX, glintY, 12);
        glintGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        glintGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
        glintGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(glintX, glintY, 12, 0, Math.PI * 2);
        ctx.fillStyle = glintGrad;
        ctx.fill();

        // Add subtle sensor noise if noiseOffset is set
        if (noiseOffset > 0) {
            const imgData = ctx.getImageData(0, 0, w, h);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const n = (rand() - 0.5) * noiseOffset;
                d[i] = Math.min(255, Math.max(0, d[i] + n));
                d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
                d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
            }
            ctx.putImageData(imgData, 0, 0);
        }
    }

    /**
     * Render the Unwrapped Daugman Strip onto an HTML5 Canvas
     */
    function renderNormalizedStrip(canvas, normalized) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(normalized.width, normalized.height);
        const d = imgData.data;
        const raw = normalized.data;

        for (let i = 0, j = 0; i < raw.length; i++, j += 4) {
            const v = raw[i];
            // Render with cyan-tinted medical monitor styling
            d[j] = Math.round(v * 0.7);
            d[j + 1] = Math.round(v * 0.95);
            d[j + 2] = v;
            d[j + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    /**
     * Render Gabor Filter Wavelet Magnitude to Mini Canvas
     */
    function renderGaborFilter(canvas, filterData, width, height) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const d = imgData.data;

        // Find max magnitude for normalization
        let maxVal = 1;
        for (let i = 0; i < filterData.length; i++) {
            if (filterData[i] > maxVal) maxVal = filterData[i];
        }

        for (let i = 0, j = 0; i < filterData.length; i++, j += 4) {
            const norm = (filterData[i] / maxVal) * 255;
            // Thermal / Spectrogram false-color mapping
            d[j] = Math.round(norm * 0.2); // R
            d[j + 1] = Math.min(255, Math.round(norm * 1.3)); // G
            d[j + 2] = Math.round(norm * 0.9); // B
            d[j + 3] = 255;
        }

        // Draw scaled down
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;
        offCanvas.getContext('2d').putImageData(imgData, 0, 0);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);
    }

    /**
     * Draw Segmentation Overlays (Pupil & Limbus boundary circles) on Eye Canvas
     */
    function drawBoundaryOverlays(canvas, boundaries) {
        const ctx = canvas.getContext('2d');
        const { pupil, iris } = boundaries;

        // Pupil Boundary (Neon Red/Pink circle)
        ctx.beginPath();
        ctx.arc(pupil.x, pupil.y, pupil.r, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Iris Boundary (Neon Cyan circle)
        ctx.beginPath();
        ctx.arc(iris.x, iris.y, iris.r, 0, Math.PI * 2);
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw Crosshair at pupil center
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pupil.x - 8, pupil.y);
        ctx.lineTo(pupil.x + 8, pupil.y);
        ctx.moveTo(pupil.x, pupil.y - 8);
        ctx.lineTo(pupil.x, pupil.y + 8);
        ctx.stroke();
    }

    /**
     * Render Combined IrisCode 2D Matrix Canvas
     */
    function renderIrisCodeMatrix(canvas, codeA, codeB) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cols = 60;
        const rows = 8;
        const cellW = w / cols;
        const cellH = h / rows;

        const maxLen = Math.min(codeA.length, codeB.length, cols * rows);

        for (let i = 0; i < maxLen; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const bitA = codeA[i];
            const bitB = codeB[i];

            if (bitA === bitB) {
                // Matching bit (Neon Green)
                ctx.fillStyle = bitA === 1 ? '#00ff88' : '#00aa55';
            } else {
                // Mismatched bit (Neon Crimson)
                ctx.fillStyle = '#ff3366';
            }
            ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 1, cellH - 1);
        }
    }

    /**
     * Process an Eye Card (Runs grayscale, segmentation, unrolling, Gabor filtering)
     */
    function processEye(canvas, stripCanvas, gaborCanvases, coordsTag) {
        // Run full engine pipeline
        const result = engine.processImage(canvas);

        // Update Coordinates readout
        coordsTag.textContent = `P: (${result.boundaries.pupil.x}, ${result.boundaries.pupil.y}) r=${result.boundaries.pupil.r} | I: r=${result.boundaries.iris.r}`;

        // Draw segmentation circles onto canvas
        drawBoundaryOverlays(canvas, result.boundaries);

        // Render normalized strip
        renderNormalizedStrip(stripCanvas, result.normalized);

        // Render 6 Gabor filters
        for (let f = 0; f < 6; f++) {
            renderGaborFilter(gaborCanvases[f], result.features.filters[f], result.normalized.width, result.normalized.height);
        }

        return result;
    }

    /**
     * Load Subject Preset
     */
    function loadPreset(canvas, presetId) {
        switch (presetId) {
            case 'subject1_a':
                // Base subject 1 (seed: 142857)
                generateSyntheticEye(canvas, 142857, 205, 0);
                break;
            case 'subject1_b':
                // Same subject 1 with slight angle/lighting noise (seed: 142857)
                generateSyntheticEye(canvas, 142857, 205, 12);
                break;
            case 'subject2':
                // Subject 2: Hazel/Amber (seed: 882314)
                generateSyntheticEye(canvas, 882314, 45, 0);
                break;
            case 'subject3':
                // Subject 3: Cyan/Ice (seed: 337719)
                generateSyntheticEye(canvas, 337719, 175, 0);
                break;
            default:
                generateSyntheticEye(canvas, 142857, 205, 0);
        }
    }

    /**
     * Compute 1:1 Biometric Match Verdict
     */
    function evaluateMatch() {
        if (!processedA || !processedB) return;

        // 1. Pearson Correlation Coefficient (Correlation.cs with n=253)
        const pearsonR = engine.pearsonCorrelation(processedA.features.featureVector, processedB.features.featureVector);

        // 2. Hamming Distance (Daugman IrisCode HD)
        const hd = engine.computeHammingDistance(processedA.features.irisCode, processedB.features.irisCode);

        // Update Pearson UI
        valCorrelation.textContent = pearsonR.toFixed(4);
        const pearsonPct = Math.max(0, Math.min(100, Math.round(((pearsonR + 1) / 2) * 100)));
        barCorrelation.style.width = `${pearsonPct}%`;

        // Update Hamming UI
        valHamming.textContent = hd.toFixed(4);
        const hdPct = Math.max(0, Math.min(100, Math.round(hd * 100)));
        barHamming.style.width = `${hdPct}%`;

        // Render IrisCode Bit Matrix
        renderIrisCodeMatrix(canvasIrisCodeMatrix, processedA.features.irisCode, processedB.features.irisCode);

        // Decision logic: High Pearson (>= 0.70) or Low HD (<= 0.33)
        const isMatch = (pearsonR >= 0.70 && hd <= 0.33);

        verdictCard.classList.remove('matched', 'mismatched');

        if (isMatch) {
            verdictCard.classList.add('matched');
            verdictIcon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
            verdictTitle.textContent = 'ACCESS GRANTED (MATCH CONFIRMED)';
            verdictSub.textContent = `虹膜特徵高度吻合 (相關係數 r=${pearsonR.toFixed(3)} ≥ 0.70, HD=${hd.toFixed(3)})`;
        } else {
            verdictCard.classList.add('mismatched');
            verdictIcon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
            verdictTitle.textContent = 'ACCESS DENIED (MISMATCH)';
            verdictSub.textContent = `特徵不符 (非同一樣本，相關係數 r=${pearsonR.toFixed(3)}, HD=${hd.toFixed(3)})`;
        }
    }

    /**
     * Run Full Refresh on Both Canvases
     */
    function refreshPipeline() {
        // Step 1: Render Eye A
        loadPreset(canvasEyeA, selectPresetA.value);
        processedA = processEye(canvasEyeA, canvasStripA, gaborACanvases, coordsA);

        // Step 2: Render Eye B
        loadPreset(canvasEyeB, selectPresetB.value);
        processedB = processEye(canvasEyeB, canvasStripB, gaborBCanvases, coordsB);

        // Step 3: Run Match
        evaluateMatch();
    }

    // Handle Custom Image Upload
    function handleImageUpload(file, canvas, stripCanvas, gaborCanvases, coordsTag, onDone) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const result = processEye(canvas, stripCanvas, gaborCanvases, coordsTag);
                onDone(result);
                evaluateMatch();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Event Listeners for Preset Selectors
    selectPresetA.addEventListener('change', () => {
        loadPreset(canvasEyeA, selectPresetA.value);
        processedA = processEye(canvasEyeA, canvasStripA, gaborACanvases, coordsA);
        evaluateMatch();
    });

    selectPresetB.addEventListener('change', () => {
        loadPreset(canvasEyeB, selectPresetB.value);
        processedB = processEye(canvasEyeB, canvasStripB, gaborBCanvases, coordsB);
        evaluateMatch();
    });

    uploadA.addEventListener('change', (e) => {
        handleImageUpload(e.target.files[0], canvasEyeA, canvasStripA, gaborACanvases, coordsA, (res) => {
            processedA = res;
        });
    });

    uploadB.addEventListener('change', (e) => {
        handleImageUpload(e.target.files[0], canvasEyeB, canvasStripB, gaborBCanvases, coordsB, (res) => {
            processedB = res;
        });
    });

    btnRunMatch.addEventListener('click', () => {
        refreshPipeline();
    });

    // Webcam Live Stream
    btnCamera.addEventListener('click', async () => {
        if (cameraBox.style.display === 'none') {
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
                webcam.srcObject = mediaStream;
                cameraBox.style.display = 'flex';
                btnCamera.textContent = '關閉攝影機';
            } catch (err) {
                alert('無法啟動攝影機: ' + err.message);
            }
        } else {
            if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
            }
            cameraBox.style.display = 'none';
            btnCamera.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> 啟動攝影機辨識`;
        }
    });

    btnCaptureCamera.addEventListener('click', () => {
        const ctx = canvasEyeB.getContext('2d');
        ctx.drawImage(webcam, 0, 0, canvasEyeB.width, canvasEyeB.height);
        processedB = processEye(canvasEyeB, canvasStripB, gaborBCanvases, coordsB);
        evaluateMatch();
    });

    // Initial Execution
    refreshPipeline();
});
