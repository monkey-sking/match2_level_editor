const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const configDir = path.join(__dirname, 'data');
const templatesPath = path.join(configDir, 'BoardTemplates.json');
const rulesPath = path.join(configDir, 'LevelRules.json');
const outputPath = path.join(configDir, 'LevelDifficulty.xlsx');

// Helper to check if two tiles overlap in 2D space
function isOverlapping(t1, t2) {
  return Math.abs(t1.x - t2.x) < 2 && Math.abs(t1.y - t2.y) < 2;
}

// Calculate the number of initial free tiles (not covered by any tile on higher layers)
function getFreeTilesCount(tiles) {
  let freeCount = 0;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const isCovered = tiles.some(other => 
      other.layout > t.layout && isOverlapping(t, other)
    );
    if (!isCovered) {
      freeCount++;
    }
  }
  return freeCount;
}

function run() {
  console.log("Loading rules and templates...");
  const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

  const rows = [];
  
  // Headers for the Excel sheet
  rows.push({
    level: "关卡ID (Level ID)",
    template: "使用模板 (Template)",
    tilesCount: "总牌数 (Total Tiles)",
    layerCount: "最大层数 (Max Layers)",
    itemPoolCount: "花色种类数 (Suits)",
    freeTilesCount: "初始可点牌数 (Free Tiles)",
    freeTilesRatio: "首步可点率 (Free Ratio)",
    difficultyScore: "综合难度系数 (Difficulty Score)",
    difficultyGrade: "难度等级 (Difficulty Grade)",
    note: "关卡备注 (Note)"
  });

  const evaluationList = [];

  for (let i = 1; i <= 200; i++) {
    // Find the rule containing level i
    const rule = rules.find(r => i >= r.startLevel && i <= r.endLevel);
    if (!rule) {
      console.warn(`Warning: No rule found for Level ${i}`);
      continue;
    }

    const templateKey = rule.boardIn[0]; // Take the first template
    const tiles = templates[templateKey];
    if (!tiles) {
      console.warn(`Warning: Template ${templateKey} not found for Level ${i}`);
      continue;
    }

    const N = tiles.length;
    const L = Math.max(...tiles.map(t => t.layout));
    const M = rule.itemPool.length;
    const F = getFreeTilesCount(tiles);
    
    const freeRatio = F / N;
    
    // Difficulty Formula: D = (N * M / F) * (1 + 0.15 * L)
    // We round to 1 decimal place
    const rawScore = (N * M / F) * (1 + 0.15 * L);
    const score = Math.round(rawScore * 10) / 10;
    
    let grade = "";
    if (score <= 10) {
      grade = "极简 (Very Easy)";
    } else if (score <= 30) {
      grade = "简单 (Easy)";
    } else if (score <= 50) {
      grade = "中等 (Medium)";
    } else if (score <= 80) {
      grade = "困难 (Hard)";
    } else {
      grade = "极难 (Very Hard)";
    }

    const item = {
      level: i,
      template: templateKey,
      tilesCount: N,
      layerCount: L,
      itemPoolCount: M,
      freeTilesCount: F,
      freeTilesRatio: (freeRatio * 100).toFixed(1) + "%",
      difficultyScore: score,
      difficultyGrade: grade,
      note: rule.note || ""
    };

    evaluationList.push(item);
    rows.push(item);
  }

  // Generate Excel file
  console.log("Writing to LevelDifficulty.xlsx...");
  const ws = xlsx.utils.json_to_sheet(rows, { skipHeader: true });
  
  // Set column widths for readability
  ws['!cols'] = [
    { wch: 15 }, // Level ID
    { wch: 20 }, // Template
    { wch: 15 }, // Total Tiles
    { wch: 15 }, // Max Layers
    { wch: 15 }, // Suits
    { wch: 22 }, // Free Tiles
    { wch: 18 }, // Free Ratio
    { wch: 25 }, // Difficulty Score
    { wch: 20 }, // Difficulty Grade
    { wch: 50 }  // Note
  ];

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Difficulty Evaluation");
  xlsx.writeFile(wb, outputPath);
  console.log(`Excel file successfully generated at ${outputPath}`);

  // Display statistical insights
  console.log("\n=== DIFFICULTY EVALUATION REPORT ===");
  const gradesCount = {};
  evaluationList.forEach(item => {
    gradesCount[item.difficultyGrade] = (gradesCount[item.difficultyGrade] || 0) + 1;
  });
  console.log("Difficulty Grades Distribution:");
  for (const [g, count] of Object.entries(gradesCount)) {
    console.log(`  - ${g}: ${count} levels`);
  }

  // Sort and print the top 5 hardest and top 5 easiest levels
  evaluationList.sort((a, b) => b.difficultyScore - a.difficultyScore);
  console.log("\nTop 5 Hardest Levels:");
  evaluationList.slice(0, 5).forEach(e => {
    console.log(`  - Lv.${e.level} (${e.template}): Score ${e.difficultyScore} (${e.difficultyGrade}) | Tiles: ${e.tilesCount}, Layers: ${e.layerCount}, Suits: ${e.itemPoolCount}, Free: ${e.freeTilesCount} (${e.freeTilesRatio})`);
  });

  console.log("\nTop 5 Easiest Levels:");
  evaluationList.slice(-5).reverse().forEach(e => {
    console.log(`  - Lv.${e.level} (${e.template}): Score ${e.difficultyScore} (${e.difficultyGrade}) | Tiles: ${e.tilesCount}, Layers: ${e.layerCount}, Suits: ${e.itemPoolCount}, Free: ${e.freeTilesCount} (${e.freeTilesRatio})`);
  });
}

run();
