const fs = require('fs');
const path = require('path');

const templatesPath = path.join(__dirname, 'data', 'BoardTemplates.json');
const reportPath = path.join(__dirname, 'data', 'SolvabilityReport.json');

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

// 计算基础难度因子
function getBaseFactor(tiles) {
  const N = tiles.length;
  const L = Math.max(...tiles.map(t => t.layout));
  const F = getClickableTiles(tiles).length;
  return (N / F) * (1 + 0.15 * L);
}

// 分析不可解关卡的特征
function analyzeUnsolvable() {
  console.log("Loading templates and report...");
  const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  const unsolvable = report.filter(r => !r.solvable);
  const solvable = report.filter(r => r.solvable);
  
  console.log("\n=== UNSOLVABLE LEVEL ANALYSIS ===\n");
  
  // 统计特征
  const unsolvableStats = {
    avgTiles: 0,
    avgBF: 0,
    avgLayers: 0,
    avgFreeRatio: 0
  };
  
  const solvableStats = {
    avgTiles: 0,
    avgBF: 0,
    avgLayers: 0,
    avgFreeRatio: 0
  };
  
  unsolvable.forEach(r => {
    unsolvableStats.avgTiles += r.totalTiles;
    unsolvableStats.avgBF += r.baseFactor;
    unsolvableStats.avgLayers += r.maxLayer;
    
    const tiles = templates[r.template];
    const freeRatio = getClickableTiles(tiles).length / tiles.length;
    unsolvableStats.avgFreeRatio += freeRatio;
  });
  
  solvable.forEach(r => {
    solvableStats.avgTiles += r.totalTiles;
    solvableStats.avgBF += r.baseFactor;
    solvableStats.avgLayers += r.maxLayer;
    
    const tiles = templates[r.template];
    const freeRatio = getClickableTiles(tiles).length / tiles.length;
    solvableStats.avgFreeRatio += freeRatio;
  });
  
  // 计算平均值
  for (const stats of [unsolvableStats, solvableStats]) {
    stats.avgTiles /= (stats === unsolvableStats ? unsolvable.length : solvable.length);
    stats.avgBF /= (stats === unsolvableStats ? unsolvable.length : solvable.length);
    stats.avgLayers /= (stats === unsolvableStats ? unsolvable.length : solvable.length);
    stats.avgFreeRatio /= (stats === unsolvableStats ? unsolvable.length : solvable.length);
  }
  
  console.log("Unsolvable levels characteristics:");
  console.log(`  Count: ${unsolvable.length}`);
  console.log(`  Avg Tiles: ${unsolvableStats.avgTiles.toFixed(1)}`);
  console.log(`  Avg Base Factor: ${unsolvableStats.avgBF.toFixed(2)}`);
  console.log(`  Avg Max Layers: ${unsolvableStats.avgLayers.toFixed(1)}`);
  console.log(`  Avg Free Ratio: ${(unsolvableStats.avgFreeRatio * 100).toFixed(1)}%`);
  
  console.log("\nSolvable levels characteristics:");
  console.log(`  Count: ${solvable.length}`);
  console.log(`  Avg Tiles: ${solvableStats.avgTiles.toFixed(1)}`);
  console.log(`  Avg Base Factor: ${solvableStats.avgBF.toFixed(2)}`);
  console.log(`  Avg Max Layers: ${solvableStats.avgLayers.toFixed(1)}`);
  console.log(`  Avg Free Ratio: ${(solvableStats.avgFreeRatio * 100).toFixed(1)}%`);
  
  // 找出不可解关卡的共同问题
  console.log("\n=== COMMON ISSUES IN UNSOLVABLE LEVELS ===\n");
  
  const issues = {
    tooManyLayers: 0,
    tooFewFree: 0,
    highBF: 0,
    oddTiles: 0
  };
  
  unsolvable.forEach(r => {
    if (r.maxLayer >= 4) issues.tooManyLayers++;
    const tiles = templates[r.template];
    const freeCount = getClickableTiles(tiles).length;
    if (freeCount < 12) issues.tooFewFree++;
    if (r.baseFactor > 15) issues.highBF++;
    if (r.totalTiles % 2 !== 0) issues.oddTiles++;
  });
  
  console.log(`Layers >= 4: ${issues.tooManyLayers}/${unsolvable.length} (${(issues.tooManyLayers/unsolvable.length*100).toFixed(1)}%)`);
  console.log(`Free tiles < 12: ${issues.tooFewFree}/${unsolvable.length} (${(issues.tooFewFree/unsolvable.length*100).toFixed(1)}%)`);
  console.log(`Base Factor > 15: ${issues.highBF}/${unsolvable.length} (${(issues.highBF/unsolvable.length*100).toFixed(1)}%)`);
  console.log(`Odd tile count: ${issues.oddTiles}/${unsolvable.length} (${(issues.oddTiles/unsolvable.length*100).toFixed(1)}%)`);
  
  // 建议修复方案
  console.log("\n=== RECOMMENDATIONS ===\n");
  
  console.log("1. For levels with too many layers (>= 4):");
  console.log("   - Reduce upper layers to increase free tiles");
  console.log("   - Consider using subtraction algorithm to trim");
  
  console.log("\n2. For levels with few free tiles (< 12):");
  console.log("   - Apply symmetric pruning to remove top-layer tiles");
  console.log("   - Target F >= 12 for playability");
  
  console.log("\n3. For levels with high Base Factor (> 15):");
  console.log("   - Reduce total tile count");
  console.log("   - Use simpler layer structures");
  
  console.log("\n4. General improvements:");
  console.log("   - Implement forward solver verification during generation");
  console.log("   - Add solvability check to level validation pipeline");
  
  return {
    unsolvable: unsolvable.length,
    solvable: solvable.length,
    unsolvableStats,
    solvableStats,
    issues
  };
}

// 生成修复建议
function generateFixSuggestions() {
  console.log("\n=== GENERATING FIX SUGGESTIONS ===\n");
  
  const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  const unsolvable = report.filter(r => !r.solvable);
  
  console.log("Potential fixes for unsolvable levels:\n");
  
  unsolvable.forEach(r => {
    const tiles = templates[r.template];
    const maxLayer = Math.max(...tiles.map(t => t.layout));
    const freeCount = getClickableTiles(tiles).length;
    
    console.log(`Lv.${r.level} (${r.template}):`);
    console.log(`  Current: ${r.totalTiles} tiles, ${maxLayer} layers, ${freeCount} free tiles, BF=${r.baseFactor}`);
    
    if (maxLayer >= 4) {
      console.log(`  Suggestion: Reduce from ${maxLayer} layers to ${maxLayer - 1} by removing top-layer tiles`);
    }
    
    if (freeCount < 12) {
      console.log(`  Suggestion: Increase free tiles from ${freeCount} to >= 12 by symmetric pruning`);
    }
    
    console.log("");
  });
}

// 主函数
function run() {
  const stats = analyzeUnsolvable();
  generateFixSuggestions();
  
  // 保存详细分析
  const analysisPath = path.join(__dirname, 'data', 'SolvabilityAnalysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify(stats, null, 2), 'utf8');
  console.log(`\nDetailed analysis saved to ${analysisPath}`);
}

run();
