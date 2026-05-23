const fs = require('fs');
const path = require('path');

const originalTemplatesPath = path.join(__dirname, 'data', 'BoardTemplates_backup.json');
const originalRulesPath = path.join(__dirname, 'data', 'LevelRules_backup.json');
const templatesPath = path.join(__dirname, 'data', 'BoardTemplates.json');
const rulesPath = path.join(__dirname, 'data', 'LevelRules.json');

// Helper to check overlap between two tiles on the same layer
function checkOverlap(t1, t2) {
  return t1.layout === t2.layout && Math.abs(t1.x - t2.x) < 2 && Math.abs(t1.y - t2.y) < 2;
}

// Helper to check support for a tile on the layer below it
function checkSupport(t, tiles) {
  if (t.layout === 1) return true;
  return tiles.some(other => other.layout === t.layout - 1 && Math.abs(other.x - t.x) < 2 && Math.abs(other.y - t.y) < 2);
}

// Validate a full layout against all rules
function validateLayout(tiles) {
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    
    // Bounds check
    if (t.x < 0 || t.x > 10 || t.y < 0 || t.y > 12 || t.layout < 1 || t.layout > 5) {
      return { valid: false, error: `Tile out of bounds: ${JSON.stringify(t)}` };
    }
    
    // Overlap check
    for (let j = i + 1; j < tiles.length; j++) {
      if (checkOverlap(t, tiles[j])) {
        return { valid: false, error: `Overlap between ${JSON.stringify(t)} and ${JSON.stringify(tiles[j])}` };
      }
    }
    
    // Support check
    if (!checkSupport(t, tiles)) {
      return { valid: false, error: `Tile lacks support: ${JSON.stringify(t)}` };
    }
    
    // Symmetry check
    const mirrorX = 10 - t.x;
    const hasMirror = tiles.some(other => other.x === mirrorX && other.y === t.y && other.layout === t.layout);
    if (!hasMirror) {
      return { valid: false, error: `Symmetry broken for: ${JSON.stringify(t)}` };
    }
  }
  
  // Parity check
  if (tiles.length % 2 !== 0) {
    return { valid: false, error: `Odd tile count: ${tiles.length}` };
  }
  
  return { valid: true };
}

// Add a tile and its mirror pair
function addTilePair(x, y, layout, tiles) {
  if (tiles.some(t => t.x === x && t.y === y && t.layout === layout)) return;
  
  tiles.push({ x, y, layout });
  if (x !== 5) {
    tiles.push({ x: 10 - x, y, layout });
  }
}

// Adjust tiles to targetCount preserving support, symmetry, and parity
function adjustToTarget(tiles, targetCount, gridOffsets, maxL) {
  // A. First ensure center tile parity is even.
  let centerTiles = tiles.filter(t => t.x === 5);
  if (centerTiles.length % 2 !== 0) {
    const removable = centerTiles.filter(t => {
      const hasUpper = tiles.some(other => other.layout === t.layout + 1 && Math.abs(other.x - t.x) < 2 && Math.abs(other.y - t.y) < 2);
      return !hasUpper;
    });
    
    if (removable.length > 0) {
      removable.sort((a, b) => b.layout - a.layout);
      const pick = removable[0];
      const idx = tiles.findIndex(t => t.x === 5 && t.y === pick.y && t.layout === pick.layout);
      if (idx !== -1) {
        tiles.splice(idx, 1);
      }
    } else {
      let added = false;
      for (let L = 2; L <= maxL && !added; L++) {
        if (!gridOffsets[L] || gridOffsets[L].dx !== 1) continue;
        const dy = gridOffsets[L].dy;
        for (let y = dy; y <= 12 && !added; y += 2) {
          const testTile = { x: 5, y, layout: L };
          const hasTile = tiles.some(t => t.x === 5 && t.y === y && t.layout === L);
          if (!hasTile && checkSupport(testTile, tiles)) {
            tiles.push(testTile);
            added = true;
          }
        }
      }
      if (!added) return false;
    }
  }
  
  // B. Reduce tiles if count > targetCount
  let loopCount = 0;
  while (tiles.length > targetCount && loopCount < 200) {
    loopCount++;
    const removable = tiles.filter(t => {
      const hasUpper = tiles.some(other => other.layout === t.layout + 1 && Math.abs(other.x - t.x) < 2 && Math.abs(other.y - t.y) < 2);
      return !hasUpper;
    });
    
    if (removable.length === 0) break;
    
    const nonCenterPick = removable.find(t => t.x !== 5);
    if (nonCenterPick) {
      const mx = 10 - nonCenterPick.x;
      tiles = tiles.filter(t => !(t.y === nonCenterPick.y && t.layout === nonCenterPick.layout && (t.x === nonCenterPick.x || t.x === mx)));
      continue;
    }
    
    const centerPicks = removable.filter(t => t.x === 5);
    if (centerPicks.length >= 2) {
      const c1 = centerPicks[0];
      const c2 = centerPicks[1];
      tiles = tiles.filter(t => !(t.x === 5 && ((t.y === c1.y && t.layout === c1.layout) || (t.y === c2.y && t.layout === c2.layout))));
      continue;
    }
    
    break;
  }
  
  // C. Increase tiles if count < targetCount
  loopCount = 0;
  while (tiles.length < targetCount && loopCount < 200) {
    loopCount++;
    const candidates = [];
    for (let L = 2; L <= maxL; L++) {
      if (!gridOffsets[L]) continue;
      const dx = gridOffsets[L].dx;
      const dy = gridOffsets[L].dy;
      for (let x = dx; x <= 5; x += 2) {
        for (let y = dy; y <= 12; y += 2) {
          const testTile = { x, y, layout: L };
          const hasTile = tiles.some(t => t.x === x && t.y === y && t.layout === L);
          if (!hasTile && checkSupport(testTile, tiles)) {
            candidates.push({ x, y, layout: L });
          }
        }
      }
    }
    
    if (candidates.length === 0) break;
    
    candidates.sort(() => Math.random() - 0.5);
    
    const nonCenterCand = candidates.find(c => c.x !== 5);
    if (nonCenterCand) {
      addTilePair(nonCenterCand.x, nonCenterCand.y, nonCenterCand.layout, tiles);
      continue;
    }
    
    const centerCands = candidates.filter(c => c.x === 5);
    if (centerCands.length >= 2) {
      tiles.push({ x: 5, y: centerCands[0].y, layout: centerCands[0].layout });
      tiles.push({ x: 5, y: centerCands[1].y, layout: centerCands[1].layout });
      continue;
    }
    
    break;
  }
  
  return tiles.length === targetCount;
}

// Generate offset-grid-based layout with customized max layers and target card count
function generateGrowthLayout(maxL, targetCount) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const style = Math.floor(Math.random() * 5);
    const gridOffsets = {};
    
    if (style === 0) {
      gridOffsets[1] = { dx: 0, dy: 0 };
      gridOffsets[2] = { dx: 1, dy: 1 };
      gridOffsets[3] = { dx: 0, dy: 0 };
      gridOffsets[4] = { dx: 1, dy: 1 };
      gridOffsets[5] = { dx: 0, dy: 0 };
    } else if (style === 1) {
      gridOffsets[1] = { dx: 1, dy: 1 };
      gridOffsets[2] = { dx: 0, dy: 0 };
      gridOffsets[3] = { dx: 1, dy: 1 };
      gridOffsets[4] = { dx: 0, dy: 0 };
      gridOffsets[5] = { dx: 1, dy: 1 };
    } else if (style === 2) {
      gridOffsets[1] = { dx: 0, dy: 0 };
      gridOffsets[2] = { dx: 1, dy: 0 };
      gridOffsets[3] = { dx: 0, dy: 0 };
      gridOffsets[4] = { dx: 1, dy: 0 };
      gridOffsets[5] = { dx: 0, dy: 0 };
    } else if (style === 3) {
      gridOffsets[1] = { dx: 0, dy: 0 };
      gridOffsets[2] = { dx: 0, dy: 1 };
      gridOffsets[3] = { dx: 0, dy: 0 };
      gridOffsets[4] = { dx: 0, dy: 1 };
      gridOffsets[5] = { dx: 0, dy: 0 };
    } else {
      for (let L = 1; L <= 5; L++) {
        gridOffsets[L] = {
          dx: Math.floor(Math.random() * 2),
          dy: Math.floor(Math.random() * 2)
        };
      }
    }
    
    let tiles = [];
    const dx1 = gridOffsets[1].dx;
    const dy1 = gridOffsets[1].dy;
    
    const l1Candidates = [];
    for (let x = dx1; x <= 5; x += 2) {
      for (let y = dy1; y <= 12; y += 2) {
        l1Candidates.push({ x, y });
      }
    }
    
    const shapeType = Math.floor(Math.random() * 4);
    const shapeCenterY = 6;
    
    let l1Chosen = [];
    if (shapeType === 0) {
      const w = 6 + 2 * Math.floor(Math.random() * 3);
      const h = 6 + 2 * Math.floor(Math.random() * 4);
      const startX = 5 - w / 2;
      const startY = 6 - h / 2;
      l1Chosen = l1Candidates.filter(c => c.x >= startX && c.y >= startY && c.y < startY + h);
    } else if (shapeType === 1) {
      const radius = 4 + Math.floor(Math.random() * 3);
      l1Chosen = l1Candidates.filter(c => Math.abs(c.x - 5) + Math.abs(c.y - shapeCenterY) <= radius);
    } else if (shapeType === 2) {
      const radius = 4 + Math.floor(Math.random() * 2);
      l1Chosen = l1Candidates.filter(c => {
        const d = Math.abs(c.x - 5) + Math.abs(c.y - shapeCenterY);
        return d <= radius && d >= radius - 2;
      });
    } else {
      l1Chosen = l1Candidates.filter(c => Math.abs(c.x - 5) <= 1 || Math.abs(c.y - shapeCenterY) <= 1);
    }
    
    l1Chosen.sort(() => Math.random() - 0.5);
    const minL1 = 16;
    const maxL1 = 36;
    const l1Count = Math.min(l1Chosen.length, minL1 + Math.floor(Math.random() * (maxL1 - minL1 + 1)));
    
    for (let i = 0; i < l1Count; i++) {
      const c = l1Chosen[i];
      addTilePair(c.x, c.y, 1, tiles);
    }
    
    if (dx1 === 1) {
      const centerTiles = tiles.filter(t => t.x === 5);
      if (centerTiles.length % 2 !== 0) {
        const centerIndex = tiles.findIndex(t => t.x === 5);
        if (centerIndex !== -1) tiles.splice(centerIndex, 1);
      }
    }
    
    if (tiles.length < 12) continue;
    
    for (let L = 2; L <= maxL; L++) {
      const dx = gridOffsets[L].dx;
      const dy = gridOffsets[L].dy;
      
      const layerCands = [];
      for (let x = dx; x <= 5; x += 2) {
        for (let y = dy; y <= 12; y += 2) {
          const testTile = { x, y, layout: L };
          if (checkSupport(testTile, tiles)) {
            layerCands.push({ x, y });
          }
        }
      }
      
      layerCands.sort(() => Math.random() - 0.5);
      for (const cand of layerCands) {
        if (tiles.length >= targetCount) break;
        addTilePair(cand.x, cand.y, L, tiles);
      }
    }
    
    const success = adjustToTarget(tiles, targetCount, gridOffsets, maxL);
    if (success && tiles.length === targetCount) {
      const val = validateLayout(tiles);
      if (val.valid) {
        return tiles.sort((a, b) => a.layout - b.layout || a.y - b.y || a.x - b.x);
      }
    }
  }
  return null;
}

// Calculate the number of initial free tiles
function isTileOverlapping(t1, t2) {
  return Math.abs(t1.x - t2.x) < 2 && Math.abs(t1.y - t2.y) < 2;
}

function getFreeTilesCount(tiles) {
  let freeCount = 0;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const isCovered = tiles.some(other => 
      other.layout > t.layout && isTileOverlapping(t, other)
    );
    if (!isCovered) {
      freeCount++;
    }
  }
  return freeCount;
}

function getBaseFactor(tiles) {
  const N = tiles.length;
  const L = Math.max(...tiles.map(t => t.layout));
  const F = getFreeTilesCount(tiles);
  return (N / F) * (1 + 0.15 * L);
}

function checkGrade(baseFactor, M) {
  const score = baseFactor * M;
  if (score < 50) return "Easy";
  if (score < 90) return "Medium";
  return "Hard";
}

// Pruning helper to increase free tiles count (F) to targetF for handcrafted layouts
function adjustTemplate(tiles, targetF) {
  let current = JSON.parse(JSON.stringify(tiles));
  let loop = 0;
  while (getFreeTilesCount(current) < targetF && loop < 100) {
    loop++;
    const maxL = Math.max(...current.map(t => t.layout));
    const topTiles = current.filter(t => t.layout === maxL);
    if (topTiles.length === 0) break;
    
    // Pick first top-layer tile and remove it symmetrically
    const pick = topTiles[0];
    const mx = 10 - pick.x;
    current = current.filter(t => !(t.layout === pick.layout && t.y === pick.y && (t.x === pick.x || t.x === mx)));
  }
  return current;
}

function run() {
  console.log("Loading original templates and rules...");
  const originalTemplates = JSON.parse(fs.readFileSync(originalTemplatesPath, 'utf8'));
  const originalRules = JSON.parse(fs.readFileSync(originalRulesPath, 'utf8'));

  // 1. Extract 97 handcrafted templates (4 to 100), adjust F >= 12 if they can be Medium/Hard
  const hcStats = [];
  for (let i = 4; i <= 100; i++) {
    const key = `template_${i}`;
    let tiles = originalTemplates[key];
    if (!tiles) {
      console.warn(`Handcrafted template ${key} not found!`);
      continue;
    }
    
    // Enforce F >= 12 only for layouts that can be Medium or Hard (BF >= 8.33)
    const initialBF = getBaseFactor(tiles);
    if (initialBF >= 8.33 && getFreeTilesCount(tiles) < 12) {
      const initialF = getFreeTilesCount(tiles);
      tiles = adjustTemplate(tiles, 12);
      console.log(`Adjusted handcrafted ${key} to raise F from ${initialF} to ${getFreeTilesCount(tiles)} (new tilesCount: ${tiles.length})`);
    }
    
    const bf = getBaseFactor(tiles);
    hcStats.push({ key, baseFactor: bf, tiles, F: getFreeTilesCount(tiles) });
  }
  console.log(`Loaded ${hcStats.length} handcrafted templates.`);

  // 2. Define levels 4-200 difficulty wave, stage sizes (M), and target difficulty grades
  const levels = [];
  for (let i = 4; i <= 200; i++) {
    const cycleIdx = (i - 4) % 3;
    let targetGrade = "";
    if (cycleIdx === 0) targetGrade = "Easy";
    else if (cycleIdx === 1) targetGrade = "Medium";
    else targetGrade = "Hard";
    
    let M;
    if (i <= 30) {
      M = targetGrade === "Easy" ? 3 : (targetGrade === "Medium" ? 4 : 5);
    } else if (i <= 45) {
      M = targetGrade === "Easy" ? 4 : (targetGrade === "Medium" ? 5 : 6);
    } else if (i <= 100) {
      M = targetGrade === "Easy" ? 4 : (targetGrade === "Medium" ? 5 : 6);
    } else {
      M = targetGrade === "Easy" ? 5 : 6;
    }

    // Determine target baseFactor range
    let minBF, maxBF;
    if (targetGrade === "Easy") {
      minBF = 1.0;
      maxBF = 50 / M - 0.05;
    } else if (targetGrade === "Medium") {
      minBF = 50 / M + 0.05;
      maxBF = 90 / M - 0.05;
    } else {
      minBF = 90 / M + 0.05;
      maxBF = 30.0;
    }

    levels.push({ level: i, targetGrade, M, minBF, maxBF });
  }

  // 3. Match the 97 handcrafted templates to 97 matched level slots
  console.log("Matching 97 handcrafted templates globally to appropriate level slots...");
  let matchAssignment = null;
  for (let attempt = 0; attempt < 50000; attempt++) {
    const remainingHC = [...hcStats];
    remainingHC.sort(() => Math.random() - 0.5);
    
    const shuffledLevels = [...levels].sort(() => Math.random() - 0.5);
    const tempAssignment = [];
    const matchedLevels = new Set();
    
    for (const hc of remainingHC) {
      let matched = false;
      for (const l of shuffledLevels) {
        if (matchedLevels.has(l.level)) continue;
        if (checkGrade(hc.baseFactor, l.M) === l.targetGrade) {
          tempAssignment.push({
            level: l.level,
            targetGrade: l.targetGrade,
            M: l.M,
            templateKey: hc.templateKey, 
            hcKey: hc.key,
            baseFactor: hc.baseFactor,
            tiles: hc.tiles
          });
          matchedLevels.add(l.level);
          matched = true;
          break;
        }
      }
      if (!matched) break;
    }
    
    if (tempAssignment.length === hcStats.length) {
      matchAssignment = tempAssignment;
      break;
    }
  }

  if (!matchAssignment) {
    throw new Error("Failed to find a valid global matching of handcrafted templates to level difficulty constraints. Try again.");
  }
  console.log("Success! Globally matched all 97 handcrafted templates.");

  // Save matched assignment lookup
  const matchedLookup = {};
  matchAssignment.forEach(assignment => {
    matchedLookup[assignment.level] = assignment;
  });

  // Extract hard baseline layouts for subtraction generation
  const hardBaselines = hcStats
    .filter(hc => hc.baseFactor >= 15.0)
    .map(hc => hc.tiles);
  
  if (hardBaselines.length === 0) {
    hcStats.sort((a, b) => b.baseFactor - a.baseFactor);
    for (let i = 0; i < Math.min(10, hcStats.length); i++) {
      hardBaselines.push(hcStats[i].tiles);
    }
  }

  // Subtraction generator helper enforcing F >= 12
  function generateBySubtraction(minBF, maxBF) {
    const base = hardBaselines[Math.floor(Math.random() * hardBaselines.length)];
    let current = JSON.parse(JSON.stringify(base));
    const targetCount = 80 + 2 * Math.floor(Math.random() * 31); // 80 to 140
    
    if (current.length < targetCount) return null;
    
    let loop = 0;
    while (current.length > targetCount && loop < 200) {
      loop++;
      const removable = current.filter(t => {
        const hasUpper = current.some(other => other.layout === t.layout + 1 && Math.abs(other.x - t.x) < 2 && Math.abs(other.y - t.y) < 2);
        return !hasUpper;
      });
      if (removable.length === 0) break;
      
      const pick = removable[Math.floor(Math.random() * removable.length)];
      const mx = 10 - pick.x;
      
      current = current.filter(t => !(t.layout === pick.layout && t.y === pick.y && (t.x === pick.x || t.x === mx)));
    }
    
    if (current.length === targetCount) {
      const bf = getBaseFactor(current);
      const F = getFreeTilesCount(current);
      // Hard levels constraint: F must be >= 12 so players don't get stuck initially
      if (bf >= minBF && bf <= maxBF && F >= 12 && validateLayout(current).valid) {
        return current;
      }
    }
    return null;
  }

  // 4. Set up final templates and rules structures
  const finalTemplates = {};
  const finalRules = [];

  // Copy newbie levels 1-3 templates and rules
  console.log("Restoring newbie levels 1-3 configurations...");
  for (let i = 1; i <= 3; i++) {
    const key = `template_${i}`;
    finalTemplates[key] = originalTemplates[key];
    
    const originalRule = originalRules.find(r => r.startLevel === i);
    if (!originalRule) {
      throw new Error(`Original rule for newbie level ${i} not found!`);
    }
    finalRules.push({
      startLevel: i,
      endLevel: i,
      boardIn: [key],
      itemPool: originalRule.itemPool,
      initItem: [6001, 6002],
      initNum: 2,
      note: originalRule.note
    });
  }

  // Generate or assign templates for levels 4-200
  console.log("Processing levels 4 to 200...");
  for (const l of levels) {
    const levelKey = `template_${l.level}`;
    let tiles = null;
    let notePrefix = "";

    if (matchedLookup[l.level]) {
      // Use handcrafted template
      tiles = matchedLookup[l.level].tiles;
      notePrefix = `[手造] 循环关卡波次 Lv.${l.level} (${l.targetGrade}/M=${l.M})：原模板 ${matchedLookup[l.level].hcKey}。`;
    } else {
      // Procedurally generate a new layout matching target baseFactor range [l.minBF, l.maxBF]
      let generated = false;
      let attempt = 0;
      
      while (!generated && attempt < 5000) {
        attempt++;
        if (l.targetGrade === "Hard") {
          // Hard levels generated via subtraction enforcing F >= 12
          tiles = generateBySubtraction(l.minBF, l.maxBF);
        } else if (l.targetGrade === "Medium") {
          // Medium levels: try subtraction (F >= 12), then fall back to standard growth
          if (Math.random() < 0.5) {
            tiles = generateBySubtraction(l.minBF, l.maxBF);
          } else {
            const maxL = Math.random() < 0.4 ? 4 : 5;
            const targetCount = 90 + 2 * Math.floor(Math.random() * 26); 
            tiles = generateGrowthLayout(maxL, targetCount);
          }
        } else {
          // Easy levels: use fewer layers to keep baseFactor low
          const maxL = Math.random() < 0.6 ? 3 : 4;
          const targetCount = 60 + 2 * Math.floor(Math.random() * 31); 
          tiles = generateGrowthLayout(maxL, targetCount);
        }

        if (tiles) {
          const bf = getBaseFactor(tiles);
          const F = getFreeTilesCount(tiles);
          // Only accept layout if F >= 12 for Hard and Medium levels to ensure initial moves
          const fThreshold = (l.targetGrade === "Easy") ? 6 : 12;
          if (bf >= l.minBF && bf <= l.maxBF && F >= fThreshold) {
            generated = true;
          }
        }
      }

      if (!generated) {
        throw new Error(`Failed to generate a valid layout for Level ${l.level} (M=${l.M}, target=${l.targetGrade}, BF range=[${l.minBF.toFixed(2)}, ${l.maxBF.toFixed(2)}]) after 5000 attempts.`);
      }
      
      notePrefix = `[生成] 循环关卡波次 Lv.${l.level} (${l.targetGrade}/M=${l.M})。`;
    }

    finalTemplates[levelKey] = tiles;

    // Set up item pools and wildcard properties
    let pool = [];
    if (l.M === 3) pool = ["Wan", "Feng", "Qi"];
    else if (l.M === 4) pool = ["Wan", "Feng", "Bing", "Qi"];
    else if (l.M === 5) pool = ["Wan", "Feng", "Bing", "Tiao", "Qi"];
    else pool = ["Wan", "Feng", "Bing", "Tiao", "Qi", "Hua"];

    const hasHua = pool.includes("Hua");
    let initItem = [];
    let initNum = 0;

    if (l.targetGrade === "Easy") {
      initNum = hasHua ? 6 : 4;
      initItem = hasHua ? [6001, 6002, 5001, 5002] : [6001, 6002];
    } else if (l.targetGrade === "Medium") {
      initNum = hasHua ? 4 : 2;
      initItem = hasHua ? [6001, 6002, 5001, 5002] : [6001, 6002];
    } else {
      // Hard
      initNum = 0;
      initItem = [];
    }

    const N = tiles.length;
    const L = Math.max(...tiles.map(t => t.layout));
    const F = getFreeTilesCount(tiles);
    const bf = getBaseFactor(tiles);
    const calculatedScore = bf * l.M;

    finalRules.push({
      startLevel: l.level,
      endLevel: l.level,
      boardIn: [levelKey],
      itemPool: pool,
      initItem: initItem,
      initNum: initNum,
      note: `${notePrefix}牌数：${N}，最高层数：${L}，首步可点牌数：${F}，最终难度分：${calculatedScore.toFixed(1)}，保底张数：${initNum}。`
    });
  }

  // 5. Save final files
  console.log("Saving new templates and rules files to disk...");
  fs.writeFileSync(templatesPath, JSON.stringify(finalTemplates, null, 2), 'utf8');
  fs.writeFileSync(rulesPath, JSON.stringify(finalRules, null, 2), 'utf8');
  console.log("Success! Updated BoardTemplates.json and LevelRules.json.");
}

try {
  run();
} catch (err) {
  console.error("Critical error during level generation:", err);
  process.exit(1);
}
