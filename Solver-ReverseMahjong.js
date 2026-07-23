const fs = require('fs');
const path = require('path');

const templatesPath = path.join(__dirname, 'data', 'BoardTemplates.json');
const outputPath = path.join(__dirname, 'data', 'SolvabilityReport.json');

// 检查两张牌是否在同一层且可以配对
function canMatch(t1, t2, tiles) {
  if (t1.layout !== t2.layout) return false;
  if (t1.x !== t2.x || t1.y !== t2.y) return false;
  
  // 检查是否被上层遮挡
  const isCovered = tiles.some(t => 
    t.layout > t1.layout && 
    Math.abs(t.x - t1.x) < 2 && 
    Math.abs(t.y - t1.y) < 2
  );
  
  return !isCovered;
}

// 检查牌是否可点击（未被遮挡）
function isTileClickable(tile, tiles) {
  return !tiles.some(t => 
    t.layout > tile.layout && 
    Math.abs(t.x - tile.x) < 2 && 
    Math.abs(t.y - tile.y) < 2
  );
}

// 获取所有可点击的牌
function getClickableTiles(tiles) {
  return tiles.filter(t => isTileClickable(t, tiles));
}

// 分配牌型（麻将花色）
function assignTileTypes(tiles, numSuits) {
  const suits = ['Wan', 'Feng', 'Bing', 'Tiao', 'Qi', 'Hua'].slice(0, numSuits);
  const assignments = [];
  
  // 按层分组
  const byLayer = {};
  tiles.forEach(t => {
    if (!byLayer[t.layout]) byLayer[t.layout] = [];
    byLayer[t.layout].push(t);
  });
  
  // 从底层开始分配
  for (let layer = 1; layer <= Math.max(...tiles.map(t => t.layout)); layer++) {
    const layerTiles = byLayer[layer] || [];
    if (layerTiles.length === 0) continue;
    
    // 随机打乱
    const shuffled = [...layerTiles].sort(() => Math.random() - 0.5);
    
    // 配对分配花色
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const suit = suits[Math.floor(Math.random() * suits.length)];
        assignments.push({ tile: shuffled[i], suit });
        assignments.push({ tile: shuffled[i + 1], suit });
      } else {
        // 奇数张，随机分配
        const suit = suits[Math.floor(Math.random() * suits.length)];
        assignments.push({ tile: shuffled[i], suit });
      }
    }
  }
  
  return assignments;
}

// 逆向求解：从当前状态尝试消除一对
function tryEliminatePair(state) {
  const clickable = getClickableTiles(state.remaining);
  if (clickable.length < 2) return null;
  
  // 按花色分组
  const bySuit = {};
  clickable.forEach(t => {
    const assignment = state.assignments.find(a => 
      a.tile.x === t.x && a.tile.y === t.y && a.tile.layout === t.layout
    );
    if (assignment) {
      if (!bySuit[assignment.suit]) bySuit[assignment.suit] = [];
      bySuit[assignment.suit].push(t);
    }
  });
  
  // 尝试找到可消除的对子
  for (const [suit, tiles] of Object.entries(bySuit)) {
    if (tiles.length >= 2) {
      // 找到两张相同花色的可点击牌
      const t1 = tiles[0];
      const t2 = tiles[1];
      
      return {
        removed: [t1, t2],
        suit,
        step: state.step + 1
      };
    }
  }
  
  return null;
}

// 求解关卡
function solveLevel(tiles, numSuits = 6, maxSteps = 500) {
  const assignments = assignTileTypes(tiles, numSuits);
  const state = {
    remaining: [...tiles],
    assignments,
    solution: [],
    step: 0
  };
  
  while (state.remaining.length > 0 && state.step < maxSteps) {
    const result = tryEliminatePair(state);
    if (!result) {
      return {
        solvable: false,
        steps: state.step,
        remaining: state.remaining.length,
        solution: state.solution
      };
    }
    
    // 移除消除的牌
    state.remaining = state.remaining.filter(t => 
      !(t.x === result.removed[0].x && t.y === result.removed[0].y && t.layout === result.removed[0].layout) &&
      !(t.x === result.removed[1].x && t.y === result.removed[1].y && t.layout === result.removed[1].layout)
    );
    
    state.solution.push({
      step: result.step,
      removed: result.removed,
      suit: result.suit
    });
    
    state.step++;
  }
  
  return {
    solvable: state.remaining.length === 0,
    steps: state.step,
    remaining: state.remaining.length,
    solution: state.solution
  };
}

// 多次尝试求解（因为花色分配随机）
function solveLevelWithRetry(tiles, numSuits = 6, retries = 10) {
  for (let i = 0; i < retries; i++) {
    const result = solveLevel(tiles, numSuits);
    if (result.solvable) {
      return result;
    }
  }
  return { solvable: false, steps: 0, remaining: tiles.length, solution: [] };
}

// 计算基础难度因子
function getBaseFactor(tiles) {
  const N = tiles.length;
  const L = Math.max(...tiles.map(t => t.layout));
  
  // 计算可点击牌数
  const F = getClickableTiles(tiles).length;
  
  return (N / F) * (1 + 0.15 * L);
}

// 主函数
function run() {
  console.log("Loading board templates...");
  const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  
  const report = [];
  const templateKeys = Object.keys(templates).filter(k => k.startsWith('template_'));
  
  console.log(`Evaluating ${templateKeys.length} templates for solvability...`);
  
  for (const key of templateKeys) {
    const tiles = templates[key];
    const levelNum = parseInt(key.replace('template_', ''));
    
    // 计算基础难度
    const baseFactor = getBaseFactor(tiles);
    
    // 尝试求解
    const result = solveLevelWithRetry(tiles, 6, 20);
    
    report.push({
      level: levelNum,
      template: key,
      totalTiles: tiles.length,
      maxLayer: Math.max(...tiles.map(t => t.layout)),
      baseFactor: Math.round(baseFactor * 100) / 100,
      solvable: result.solvable,
      solveSteps: result.steps,
      remainingTiles: result.remaining
    });
    
    if (levelNum % 50 === 0) {
      console.log(`  Evaluated ${levelNum} levels...`);
    }
  }
  
  // 统计
  const solvable = report.filter(r => r.solvable).length;
  const unsolvable = report.filter(r => !r.solvable).length;
  
  console.log("\n=== SOLVABILITY REPORT ===");
  console.log(`Total templates: ${report.length}`);
  console.log(`Solvable: ${solvable} (${(solvable/report.length*100).toFixed(1)}%)`);
  console.log(`Unsolvable: ${unsolvable} (${(unsolvable/report.length*100).toFixed(1)}%)`);
  
  // 保存报告
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport saved to ${outputPath}`);
  
  // 显示不可解的关卡
  if (unsolvable > 0) {
    console.log("\nUnsolvable levels:");
    report.filter(r => !r.solvable).forEach(r => {
      console.log(`  - Lv.${r.level} (${r.template}): ${r.totalTiles} tiles, BF=${r.baseFactor}`);
    });
  }
}

run();
