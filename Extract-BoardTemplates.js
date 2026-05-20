const fs = require('fs');
const path = require('path');

let config = {
  grid: { cols: 12, rows: 14, tileWidth: 2, tileHeight: 2 },
  pipeline: { competitorLevelsDir: 'D:\\Project\\mahjong\\LevelsJson' }
};
try {
  const configPath = path.join(__dirname, 'data', 'config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn("Could not load config.json, using defaults.", e);
}

const jsonDir = config.pipeline.competitorLevelsDir;
const outputDir = path.join(__dirname, 'data');
const outputFilePath = path.join(outputDir, 'BoardTemplates.json');

const maxXLimit = config.grid.cols - config.grid.tileWidth;
const maxYLimit = config.grid.rows - config.grid.tileHeight;

function roundToEven(val) {
    return Math.round(val / 2) * 2;
}

function roundToOdd(val) {
    return Math.round((val - 1) / 2) * 2 + 1;
}

function normalizeCoordinates(rawTiles) {
    let minCol = Infinity, maxCol = -Infinity;
    let minRow = Infinity, maxRow = -Infinity;

    for (const t of rawTiles) {
        if (t.col < minCol) minCol = t.col;
        if (t.col > maxCol) maxCol = t.col;
        if (t.row < minRow) minRow = t.row;
        if (t.row > maxRow) maxRow = t.row;
    }

    const colRange = maxCol - minCol;
    const rowRange = maxRow - minRow;

    // We check if it fits in our grid
    const fitsPerfectly = (colRange <= maxXLimit && rowRange <= maxYLimit);

    const convertedTiles = [];

    for (const t of rawTiles) {
        let xTarget, yTarget;
        const layout = t.layer + 1;

        if (fitsPerfectly) {
            // No scaling: just shift to align bottom-left
            const shiftX = (minCol % 2 === 0) ? minCol : minCol - 1;
            const shiftY = (minRow % 2 === 0) ? minRow : minRow - 1;
            xTarget = t.col - shiftX;
            yTarget = t.row - shiftY;
        } else {
            // Scale down to fit
            xTarget = colRange === 0 ? Math.floor(maxXLimit / 2) : ((t.col - minCol) / colRange) * maxXLimit;
            yTarget = rowRange === 0 ? Math.floor(maxYLimit / 2) : ((t.row - minRow) / rowRange) * maxYLimit;
        }

        // No rigid layer parity restrictions: round to nearest integer and clamp to board limits
        let x = Math.round(xTarget);
        let y = Math.round(yTarget);
        x = Math.max(0, Math.min(maxXLimit, x));
        y = Math.max(0, Math.min(maxYLimit, y));

        convertedTiles.push({ x, y, layout, xOrig: t.col, yOrig: t.row });
    }

    // Resolve overlaps on the same layer iteratively
    let changed = true;
    let iterations = 0;
    const maxIterations = 1000;

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;

        for (let i = 0; i < convertedTiles.length; i++) {
            for (let j = i + 1; j < convertedTiles.length; j++) {
                const t1 = convertedTiles[i];
                const t2 = convertedTiles[j];

                if (t1.layout === t2.layout) {
                    const dx = Math.abs(t1.x - t2.x);
                    const dy = Math.abs(t1.y - t2.y);

                    if (dx < 2 && dy < 2) {
                        // Collision! Try to shift t2 to an adjacent valid cell
                        const candidates = [
                            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
                            { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
                            { dx: 2, dy: 0 }, { dx: -2, dy: 0 },
                            { dx: 0, dy: 2 }, { dx: 0, dy: -2 },
                            { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
                            { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
                        ];

                        let resolved = false;
                        for (const c of candidates) {
                            const newX = t2.x + c.dx;
                            const newY = t2.y + c.dy;

                            // Check bounds (all layers share the same 0..maxXLimit, 0..maxYLimit limits)
                            const inBounds = (newX >= 0 && newX <= maxXLimit && newY >= 0 && newY <= maxYLimit);

                            if (inBounds) {
                                // Check if this new position overlaps with any other tile on the same layout
                                let hasOverlap = false;
                                for (let k = 0; k < convertedTiles.length; k++) {
                                    if (k === j) continue;
                                    const other = convertedTiles[k];
                                    if (other.layout === t2.layout) {
                                        if (Math.abs(other.x - newX) < 2 && Math.abs(other.y - newY) < 2) {
                                            hasOverlap = true;
                                            break;
                                        }
                                    }
                                }

                                if (!hasOverlap) {
                                    t2.x = newX;
                                    t2.y = newY;
                                    resolved = true;
                                    changed = true;
                                    break;
                                }
                            }
                        }

                        if (!resolved) {
                            // No space on current layer: push to the next layer!
                            t2.layout += 1;

                            // Clamp to bounds
                            t2.x = Math.max(0, Math.min(maxXLimit, t2.x));
                            t2.y = Math.max(0, Math.min(maxYLimit, t2.y));

                            changed = true;
                        }
                    }
                }
            }
        }
    }

    // Sort to ensure deterministic hash/string for uniqueness comparison
    convertedTiles.sort((a, b) => {
        if (a.layout !== b.layout) return a.layout - b.layout;
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
    });

    return convertedTiles.map(t => ({
        x: t.x,
        y: t.y,
        layout: t.layout
    }));
}

function processFiles() {
    if (!fs.existsSync(jsonDir)) {
        console.error(`Competitor levels directory not found: ${jsonDir}`);
        process.exit(1);
    }

    function getAllJsonFiles(dir, fileList = []) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                getAllJsonFiles(filePath, fileList);
            } else if (filePath.endsWith('.json')) {
                fileList.push(filePath);
            }
        }
        return fileList;
    }

    const files = getAllJsonFiles(jsonDir);
    console.log(`Found ${files.length} JSON files to process.`);

    const uniqueTemplates = {};
    const seenHashes = new Set();
    let templateIdCounter = 1;

    for (const filePath of files) {
        try {
            let rawText = fs.readFileSync(filePath, 'utf8');
            if (rawText.charCodeAt(0) === 0xFEFF) {
                rawText = rawText.slice(1);
            }
            const data = JSON.parse(rawText);

            if (!data.cells) continue;

            const rawTiles = [];
            for (const cell of data.cells) {
                if (cell.gridObjects) {
                    for (const obj of cell.gridObjects) {
                        rawTiles.push({
                            col: cell.column,
                            row: cell.row,
                            layer: obj.layer
                        });
                    }
                }
            }

            let totalTiles = rawTiles.length;
            if (totalTiles === 0) continue;

            if (totalTiles % 2 !== 0) {
                rawTiles.pop(); // Ensure even count
            }

            const skeleton = normalizeCoordinates(rawTiles);
            const skeletonHash = JSON.stringify(skeleton);

            if (!seenHashes.has(skeletonHash)) {
                seenHashes.add(skeletonHash);
                uniqueTemplates[`template_${templateIdCounter}`] = skeleton;
                templateIdCounter++;
            }
        } catch (e) {
            console.error(`Failed to process ${filePath}: ${e.message}`);
        }
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFilePath, JSON.stringify(uniqueTemplates, null, 2));
    console.log(`Successfully extracted ${templateIdCounter - 1} unique templates to ${outputFilePath}`);
}

processFiles();
