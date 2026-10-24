/**
 * IRIS-BIOMETRICS-OS | CORE ALGORITHM ENGINE (JavaScript)
 * Implementation of John Daugman's Iris Recognition Pipeline:
 * 1. Grayscale Conversion (Luminance weighting)
 * 2. Integro-differential Pupil & Iris Boundary Localization
 * 3. Daugman Rubber Sheet Model (Polar to Cartesian Normalization)
 * 4. 2D Gabor Wavelet Feature Extraction (Filters 1 ~ 6)
 * 5. IrisCode Binary Phase Encoding
 * 6. Pearson Correlation Coefficient & Hamming Distance
 */

class IrisEngine {
    constructor() {
        this.normalizedWidth = 256;
        this.normalizedHeight = 48;
        this.gaborFilterCount = 6;
    }

    /**
     * Convert RGBA ImageData to single-channel Grayscale array
     */
    rgbToGray(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const gray = new Uint8ClampedArray(width * height);

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            // Standard Luminance weights: 0.299 R + 0.587 G + 0.114 B
            gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        return { gray, width, height };
    }

    /**
     * Find pupil center (darkest circular region) and iris outer boundary
     * (Simplified fast Daugman Circular Hough / Radial search)
     */
    detectIrisBoundaries(grayData, width, height) {
        let minBrightness = 255;
        let pX = Math.round(width * 0.5);
        let pY = Math.round(height * 0.5);

        // Subsample search for the darkest center (Pupil centroid)
        const step = 4;
        const marginX = Math.round(width * 0.2);
        const marginY = Math.round(height * 0.2);

        for (let y = marginY; y < height - marginY; y += step) {
            for (let x = marginX; x < width - marginX; x += step) {
                // Compute local 9x9 average brightness
                let sum = 0, count = 0;
                for (let dy = -4; dy <= 4; dy += 2) {
                    for (let dx = -4; dx <= 4; dx += 2) {
                        sum += grayData[(y + dy) * width + (x + dx)];
                        count++;
                    }
                }
                const avg = sum / count;
                if (avg < minBrightness) {
                    minBrightness = avg;
                    pX = x;
                    pY = y;
                }
            }
        }

        // Estimate pupil radius (rp) by finding gradient jump
        let pupilR = Math.round(Math.min(width, height) * 0.14);
        let maxGrad = 0;
        const minPR = Math.round(Math.min(width, height) * 0.08);
        const maxPR = Math.round(Math.min(width, height) * 0.22);

        for (let r = minPR; r < maxPR; r += 2) {
            let innerSum = 0, outerSum = 0;
            const samples = 16;
            for (let a = 0; a < samples; a++) {
                const theta = (a / samples) * Math.PI * 2;
                const inX = Math.round(pX + (r - 2) * Math.cos(theta));
                const inY = Math.round(pY + (r - 2) * Math.sin(theta));
                const outX = Math.round(pX + (r + 2) * Math.cos(theta));
                const outY = Math.round(pY + (r + 2) * Math.sin(theta));

                if (inX >= 0 && inX < width && inY >= 0 && inY < height &&
                    outX >= 0 && outX < width && outY >= 0 && outY < height) {
                    innerSum += grayData[inY * width + inX];
                    outerSum += grayData[outY * width + outX];
                }
            }
            const grad = (outerSum - innerSum) / samples;
            if (grad > maxGrad) {
                maxGrad = grad;
                pupilR = r;
            }
        }

        // Iris outer radius is typically 2.2x to 2.8x of pupil radius
        const irisR = Math.min(
            Math.round(pupilR * 2.45),
            Math.round(Math.min(pX, width - pX, pY, height - pY) * 0.95)
        );

        return {
            pupil: { x: pX, y: pY, r: pupilR },
            iris: { x: pX, y: pY, r: irisR }
        };
    }

    /**
     * Daugman Rubber Sheet Model:
     * Unwraps the annular iris ring into a normalized rectangular strip [W x H]
     */
    normalizeIris(grayData, width, height, pupil, iris) {
        const normW = this.normalizedWidth;
        const normH = this.normalizedHeight;
        const unwrapped = new Uint8ClampedArray(normW * normH);

        for (let y = 0; y < normH; y++) {
            const r_norm = y / normH; // 0 (pupil edge) to 1 (limbus edge)

            for (let x = 0; x < normW; x++) {
                const theta = (x / normW) * Math.PI * 2; // 0 to 2*PI

                // Interpolate radius between pupil boundary and iris boundary
                const xp = pupil.x + pupil.r * Math.cos(theta);
                const yp = pupil.y + pupil.r * Math.sin(theta);
                const xi = iris.x + iris.r * Math.cos(theta);
                const yi = iris.y + iris.r * Math.sin(theta);

                const srcX = Math.round((1 - r_norm) * xp + r_norm * xi);
                const srcY = Math.round((1 - r_norm) * yp + r_norm * yi);

                if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
                    unwrapped[y * normW + x] = grayData[srcY * width + srcX];
                } else {
                    unwrapped[y * normW + x] = 128;
                }
            }
        }

        return {
            data: unwrapped,
            width: normW,
            height: normH
        };
    }

    /**
     * Apply 2D Gabor Wavelet Filters (GaborFilter1 ~ 6) on the normalized iris
     * Extracts frequency & orientation textures (IrisCode feature bank)
     */
    extractGaborFeatures(normData, width, height) {
        const filters = [];
        const featureVector = [];
        const irisCodeBits = [];

        // Generate 6 multi-scale, multi-orientation Gabor kernels
        const orientations = [0, Math.PI / 6, Math.PI / 3, Math.PI / 2, (2 * Math.PI) / 3, (5 * Math.PI) / 6];
        const frequencies = [0.12, 0.18, 0.24, 0.15, 0.20, 0.28];

        for (let f = 0; f < this.gaborFilterCount; f++) {
            const theta = orientations[f];
            const freq = frequencies[f];
            const filtered = new Float32Array(width * height);

            // 1D/2D Gabor convolution across polar angular stripe
            const sigma = 3.5;
            const kSize = 9;
            const halfK = Math.floor(kSize / 2);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let realSum = 0;
                    let imagSum = 0;

                    for (let ky = -halfK; ky <= halfK; ky++) {
                        for (let kx = -halfK; kx <= halfK; kx++) {
                            const sampleX = (x + kx + width) % width; // circular wrap for 360-degree continuity
                            const sampleY = Math.max(0, Math.min(height - 1, y + ky));
                            const val = normData[sampleY * width + sampleX];

                            const xTheta = kx * Math.cos(theta) + ky * Math.sin(theta);
                            const yTheta = -kx * Math.sin(theta) + ky * Math.cos(theta);

                            const envelope = Math.exp(-(xTheta * xTheta + yTheta * yTheta) / (2 * sigma * sigma));
                            const realWave = Math.cos(2 * Math.PI * freq * xTheta);
                            const imagWave = Math.sin(2 * Math.PI * freq * xTheta);

                            realSum += val * envelope * realWave;
                            imagSum += val * envelope * imagWave;
                        }
                    }

                    const magnitude = Math.sqrt(realSum * realSum + imagSum * imagSum);
                    filtered[y * width + x] = magnitude;

                    // IrisCode Phase Bit: Real > 0 -> 1, Imag > 0 -> 1 (Daugman 2-bit quadrant phase quantization)
                    if (y % 4 === 0 && x % 4 === 0) {
                        irisCodeBits.push(realSum > 0 ? 1 : 0);
                        irisCodeBits.push(imagSum > 0 ? 1 : 0);
                        featureVector.push(realSum);
                    }
                }
            }

            filters.push(filtered);
        }

        return {
            filters,
            irisCode: irisCodeBits,
            featureVector: featureVector.slice(0, 253) // Feature vector length n=253
        };
    }

    /**
     * Computes Pearson Correlation Coefficient between two feature arrays (n=253)
     */
    pearsonCorrelation(X, Y) {
        const n = Math.min(253, X.length, Y.length);
        let sum_X = 0, sum_Y = 0, sum_XY = 0;
        let squareSum_X = 0, squareSum_Y = 0;

        for (let i = 0; i < n; i++) {
            const xi = X[i];
            const yi = Y[i];

            sum_X += xi;
            sum_Y += yi;
            sum_XY += xi * yi;
            squareSum_X += xi * xi;
            squareSum_Y += yi * yi;
        }

        let a = Math.sqrt((n * squareSum_X - sum_X * sum_X) * (n * squareSum_Y - sum_Y * sum_Y));
        if (a === 0 || isNaN(a)) {
            a = 1;
        }

        const corr = (n * sum_XY - sum_X * sum_Y) / a;
        return corr;
    }

    /**
     * Hamming Distance (Fraction of mismatched bits between two IrisCodes)
     * HD < 0.33 indicates a true match with astronomical certainty (1 in billions)
     */
    computeHammingDistance(codeA, codeB) {
        if (!codeA || !codeB || codeA.length === 0 || codeB.length === 0) return 1.0;
        const len = Math.min(codeA.length, codeB.length);
        let diffs = 0;

        for (let i = 0; i < len; i++) {
            if (codeA[i] !== codeB[i]) diffs++;
        }
        return diffs / len;
    }

    /**
     * Full End-to-End Pipeline on an HTML5 Canvas or Image
     */
    processImage(canvas) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 1. Convert to Gray
        const { gray, width, height } = this.rgbToGray(imgData);

        // 2. Segment Boundaries (Pupil & Limbus)
        const boundaries = this.detectIrisBoundaries(gray, width, height);

        // 3. Normalization (Rubber Sheet Strip)
        const normalized = this.normalizeIris(gray, width, height, boundaries.pupil, boundaries.iris);

        // 4. Feature Extraction (Gabor Filters 1 ~ 6 & IrisCode)
        const features = this.extractGaborFeatures(normalized.data, normalized.width, normalized.height);

        return {
            gray,
            width,
            height,
            boundaries,
            normalized,
            features
        };
    }
}

// Export for browser
window.IrisEngine = IrisEngine;
