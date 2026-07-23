/**
 * 麻将二消反向求解器
 * 基于 chsg_level_editor 的依赖图拓扑分析算法
 * 
 * 核心思路：
 * 1. 构建依赖图 - 每张牌被哪些上层牌遮挡
 * 2. 拓扑排序 - 找出没有被遮挡的自由牌
 * 3. 逐波消除 - 玩家点击任意两张自由牌消除
 * 4. 误判压力分析 - 衡量有多少"陷阱"操作
 */

const fs = require('fs');
const path = require('path');

const templatesPath = path.join(__dirname, 'data', 'BoardTemplates.json');
const outputPath = path.join(__dirname, 'data', 'MahjongSolvability.json');

// ==================== 核心函数 ====================

/**
 * 检查两张牌是否在2D空间重叠（2x2牌面）
 */
function isOverlapping(t1, t2) {
  return Math.abs(t1.x - t2.x) < 2 && Math.abs(t1.y - t2.y) < 2;
}

/**
 * 构建依赖图 - 每张牌被哪些上层牌遮挡
 * 返回 Map<tileIndex, Set<blockingTileIndex>>
 */
function buildDependencyGraph(tiles) {
  const dependencies = new Map();
  
  for (let i = 0; i < tiles.length; i++) {
    const blockers = new Set();
    for (let j = 0; j < tiles.length; j++) {
      if (i === j) continue;
      // 如果 j 在 i 上方且重叠，则 j 阻挡 i
      if (tiles[j].layout > tiles[i].layout && isOverlapping(tiles[i], tiles[j])) {
        blockers.add(j);
      }
    }
    dependencies.set(i, blockers);
  }
  
  return dependencies;
}

/**
 * 找出当前所有可点击的牌（没有被任何牌遮挡）
 */
function findFreeTiles(tiles, dependencies) {
  const free = [];
  for (let i = 0; i < tiles.length; i++) {
    if (dependencies.get(i).size === 0) {
      free.push(i);
    }
  }
  return free;
}

/**
 * 求解布局 - 返回消除波次
 * 每波找出所有自由牌，两两配对消除（任意两张自由牌可配对）
 */
function solveLayout(tiles) {
  const dependencies = buildDependencyGraph(tiles);
  const waves = [];
  let remaining = tiles.length;
  
  while (remaining > 0) {
    const free = findFreeTiles(tiles, dependencies);
    if (free.length < 2) break; // 不足两张，死局
    
    // 将自由牌两两配对（任意两张自由牌可配对）
    const pairs = [];
    const used = new Set();
    
    for (let i = 0; i < free.length; i++) {
      if (used.has(free[i])) continue;
      for (let j = i + 1; j < free.length; j++) {
        if (used.has(free[j])) continue;
        pairs.push([free[i], free[j]]);
        used.add(free[i]);
        used.add(free[j]);
        break;
      }
    }
    
    if (pairs.length === 0) break; // 无法配对
    
    waves.push(pairs);
    
    // 移除已配对的牌，更新依赖
    for (const [a, b] of pairs) {
      remaining -= 2;
      dependencies.get(a).clear();
      dependencies.get(b).clear();
      // 从所有依赖集中移除
      for (const [tile, deps] of dependencies) {
        deps.delete(a);
        deps.delete(b);
      }
    }
  }
  
  return {
    solvable: remaining === 0,
    waves,
    totalWaves: waves.length,
    removedCount: tiles.length - remaining,
    remainingCount: remaining
  };
}

/**
 * 计算依赖深度（最长依赖链）
 */
function computeDepths(dependencies) {
  const memo = new Map();
  const visiting = new Set();
  let hasCycle = false;
  
  const visit = (idx) => {
    if (memo.has(idx)) return memo.get(idx);
    if (visiting.has(idx)) {
      hasCycle = true;
      return 1;
    }
    visiting.add(idx);
    
    let depth = 1;
    for (const dep of dependencies.get(idx) || []) {
      depth = Math.max(depth, visit(dep) + 1);
    }
    
    visiting.delete(idx);
    memo.set(idx, depth);
    return depth;
  };
  
  for (const idx of dependencies.keys()) {
    visit(idx);
  }
  
  return {
    maxDepth: Math.max(0, ...memo.values()),
    hasCycle
  };
}

/**
 * 计算瓶颈牌数（被多张牌依赖的牌）
 */
function countBottlenecks(dependencies) {
  const reverseCounts = new Map();
  for (const deps of dependencies.values()) {
    for (const dep of deps) {
      reverseCounts.set(dep, (reverseCounts.get(dep) || 0) + 1);
    }
  }
  return [...reverseCounts.values()].filter(c => c >= 2).length;
}

/**
 * 误判压力分析
 * 衡量有多少"陷阱"操作（看起来能消除但会导致死局）
 */
function analyzeMisjudgePressure(tiles, dependencies) {
  const free = findFreeTiles(tiles, dependencies);
  const initialFreeCount = free.length;
  
  // 分析每个自由牌被移除后能解锁多少新牌
  const impacts = free.map(idx => {
    // 模拟移除这张牌
    const afterDeps = new Map();
    for (const [tile, deps] of dependencies) {
      afterDeps.set(tile, new Set(deps));
    }
    for (const [tile, deps] of afterDeps) {
      deps.delete(idx);
    }
    
    const newFree = findFreeTiles(tiles, afterDeps);
    const unlockGain = newFree.filter(f => !free.includes(f)).length;
    
    return { idx, unlockGain };
  });
  
  const maxUnlockGain = Math.max(0, ...impacts.map(i => i.unlockGain));
  
  // 关键牌：移除后能解锁2+张牌
  const criticalTiles = impacts.filter(i => i.unlockGain >= 2).length;
  
  // 陷阱牌：解锁能力弱（<=1）且不是最优选择
  const trapTiles = impacts.filter(i => 
    i.unlockGain <= 1 && maxUnlockGain > 1
  ).length;
  
  // 误判压力分数
  const misjudgeScore = Math.round((
    trapTiles * 40 +
    (initialFreeCount - criticalTiles) * 30 +
    (maxUnlockGain > 2 ? 25 : 0)
  ) * 10) / 10;
  
  return {
    initialFree: initialFreeCount,
    criticalTiles,
    trapTiles,
    maxUnlockGain,
    misjudgeScore
  };
}

/**
 * 计算密度
 */
function computeDensity(tiles, gridCols = 11, gridRows = 13) {
  return (tiles.length * 2) / (gridCols * gridRows);
}

/**
 * 综合难度评分
 */
function scoreDifficulty(analysis) {
  const {
    density,
    maxDepth,
    topologyLayers,
    bottleneckTiles,
    misjudgeScore,
    initialFree
  } = analysis;
  
  const freePenalty = Math.max(0, 12 - initialFree) * 10;
  
  return Math.round((
    density * 50 +
    maxDepth * 20 +
    topologyLayers * 15 +
    bottleneckTiles * 15 +
    misjudgeScore * 0.8 +
    freePenalty
  ) * 10) / 10;
}

// ==================== 主分析函数 ====================

/**
 * 分析单个关卡模板
 */
function analyzeTemplate(tiles) {
  const dependencies = buildDependencyGraph(tiles);
  const solution = solveLayout(tiles);
  const depths = computeDepths(dependencies);
  const bottleneckTiles = countBottlenecks(dependencies);
  const misjudge = analyzeMisjudgePressure(tiles, dependencies);
  const density = computeDensity(tiles);
  
  const analysis = {
    solvable: solution.solvable,
    totalTiles: tiles.length,
    maxLayer: Math.max(...tiles.map(t => t.layout)),
    density: Math.round(density * 1000) / 1000,
    topologyLayers: solution.totalWaves,
    maxDepth: depths.maxDepth,
    hasCycle: depths.hasCycle,
    bottleneckTiles,
    ...misjudge
  };
  
  analysis.difficultyScore = scoreDifficulty(analysis);
  
  // 难度等级
  if (analysis.difficultyScore <= 30) analysis.grade = 'Easy';
  else if (analysis.difficultyScore <= 60) analysis.grade = 'Medium';
  else analysis.grade = 'Hard';
  
  return analysis;
}

// ==================== 运行分析 ====================

function run() {
  console.log("Loading board templates...");
  const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  
  const report = [];
  const templateKeys = Object.keys(templates);
  
  console.log(`Analyzing ${templateKeys.length} templates with reverse dependency graph...\n`);
  
  let solvableCount = 0;
  let unsolvableCount = 0;
  
  for (const key of templateKeys) {
    const tiles = templates[key];
    const levelNum = parseInt(key.replace(/[^0-9]/g, '')) || 999;
    
    const analysis = analyzeTemplate(tiles);
    analysis.level = levelNum;
    analysis.template = key;
    
    report.push(analysis);
    
    if (analysis.solvable) solvableCount++;
    else unsolvableCount++;
  }
  
  // 排序
  report.sort((a, b) => a.level - b.level);
  
  // 统计
  console.log("=== MAHJONG SOLVABILITY REPORT ===\n");
  console.log(`Total templates: ${report.length}`);
  console.log(`Solvable: ${solvableCount} (${(solvableCount/report.length*100).toFixed(1)}%)`);
  console.log(`Unsolvable: ${unsolvableCount} (${(unsolvableCount/report.length*100).toFixed(1)}%)`);
  
  // 难度分布
  const gradeDist = { Easy: 0, Medium: 0, Hard: 0 };
  report.forEach(r => gradeDist[r.grade]++);
  console.log("\nDifficulty Distribution:");
  console.log(`  Easy: ${gradeDist.Easy}`);
  console.log(`  Medium: ${gradeDist.Medium}`);
  console.log(`  Hard: ${gradeDist.Hard}`);
  
  // Top 5 最难
  console.log("\nTop 5 Hardest Levels:");
  const sorted = [...report].sort((a, b) => b.difficultyScore - a.difficultyScore);
  sorted.slice(0, 5).forEach(r => {
    console.log(`  Lv.${r.level}: Score=${r.difficultyScore}, Grade=${r.grade}, Tiles=${r.totalTiles}, Layers=${r.maxLayer}, Free=${r.initialFree}, Bottlenecks=${r.bottleneckTiles}`);
  });
  
  // Top 5 最容易
  console.log("\nTop 5 Easiest Levels:");
  sorted.slice(-5).reverse().forEach(r => {
    console.log(`  Lv.${r.level}: Score=${r.difficultyScore}, Grade=${r.grade}, Tiles=${r.totalTiles}, Layers=${r.maxLayer}, Free=${r.initialFree}`);
  });
  
  // 不可解关卡详情
  if (unsolvableCount > 0) {
    console.log("\nUnsolvable Levels (first 10):");
    report.filter(r => !r.solvable).slice(0, 10).forEach(r => {
      console.log(`  Lv.${r.level}: ${r.totalTiles} tiles, ${r.maxLayer} layers, remaining=${r.remainingCount}`);
    });
  }
  
  // 保存报告
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport saved to ${outputPath}`);
}

run();
