const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, 'data');
const templatesPath = path.join(configDir, 'BoardTemplates.json');
const outputPath = path.join(__dirname, 'templates_preview.html');

let config = {
  grid: { cols: 12, rows: 14, tileWidth: 2, tileHeight: 2 },
  layers: {
    max: 5,
    colors: {
      "1": "#808e9b",
      "2": "#4bcffa",
      "3": "#0be881",
      "4": "#ffd32a",
      "5": "#ff3f34"
    }
  }
};
try {
  const configPath = path.join(configDir, 'config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn("Could not load config.json, using defaults.", e);
}

const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Match-2 Templates Visualizer</title>
<style>
  body { font-family: Arial, sans-serif; background: #222; color: #fff; padding: 20px; }
  h1 { text-align: center; margin-bottom: 10px; }

  /* ── 工具栏 ────────────────────────────────────── */
  .toolbar {
    position: sticky; top: 0; z-index: 10000;
    display: flex; align-items: center; justify-content: center; gap: 16px;
    padding: 10px 20px; margin: 0 -20px 24px;
    background: #1a1a2e;
    border-bottom: 2px solid #444;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
  .toolbar label {
    font-size: 14px; color: #ccc;
  }
  /* Toggle switch */
  .switch { position: relative; display: inline-block; width: 52px; height: 28px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #444; border-radius: 28px;
    transition: background 0.3s;
  }
  .slider:before {
    position: absolute; content: "";
    height: 20px; width: 20px; left: 4px; bottom: 4px;
    background: #fff; border-radius: 50%;
    transition: transform 0.3s;
  }
  input:checked + .slider { background: #4bcffa; }
  input:checked + .slider:before { transform: translateX(24px); }

  /* ── 卡片 ─────────────────────────────────────── */
  .grid-container {
    display: flex; flex-wrap: wrap; gap: 25px; justify-content: center;
  }
  .template-card {
    background: #333; padding: 15px; border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.4); text-align: center;
    border: 1px solid #444;
    transition: all 0.3s ease;
  }

  /* ── 棋盘 ─────────────────────────────────────── */
  .board {
    position: relative;
    width: 320px;
    height: 540px;
    background: #1e1e1e; border: 2px solid #555;
    border-radius: 6px;
    margin: 15px auto;
    overflow: visible;   /* 仿3D 偏移可能超出边框，改为 visible */
  }
  .board-boundary {
    position: absolute;
    left: 40px; top: 95px;
    width: 240px; height: 350px;
    border: 1px dashed rgba(255,255,255,0.15);
    background-color: rgba(255,255,255,0.02);
    pointer-events: none;
    box-sizing: border-box;
    border-radius: 4px;
  }

  /* ── Tile ─────────────────────────────────────── */
  .tile {
    position: absolute;
    width: 38px; height: 48px;
    border: 1px solid rgba(0,0,0,0.7);
    border-radius: 4px;
    box-shadow: 1px 2px 4px rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: bold; color: #000;
    /* 仿3D 偏移通过 CSS 变量 + transform 实现，方便 JS 切换 */
    transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1),
                box-shadow 0.35s ease,
                border-color 0.35s ease;
  }
  /* 仿3D 模式下，每个 tile 按 data-layout 值向右上偏移 */
  body.iso .tile {
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.8),
      calc(var(--iso-l) * 4px) calc(var(--iso-l) * -4px) 0 0 rgba(0,0,0,0.55),
      calc(var(--iso-l) * 4px + 2px) calc(var(--iso-l) * -4px + 2px) 6px rgba(0,0,0,0.4);
    border-color: rgba(255,255,255,0.25);
    transform: translate(
      calc(var(--iso-l) * 8px),
      calc(var(--iso-l) * -8px)
    );
  }

  .info { font-size: 12px; color: #bbb; margin-bottom: 5px; }
  .edit-link {
    display: inline-block;
    margin: 10px 0;
    padding: 8px 16px;
    background: #ffd32a;
    color: #1e1e1e;
    font-weight: bold;
    border-radius: 4px;
    text-decoration: none;
    font-size: 12px;
    transition: background 0.2s, transform 0.1s;
  }
  .edit-link:hover  { background: #ffb300; transform: scale(1.03); }
  .edit-link:active { transform: scale(0.98); }
</style>
</head>
<body>
<h1>Match-2 地形预览 / Templates Preview</h1>

<!-- 工具栏：仿3D 开关 -->
<div class="toolbar">
  <label for="isoToggle">仿3D 偏移视图</label>
  <label class="switch">
    <input type="checkbox" id="isoToggle">
    <span class="slider"></span>
  </label>
  <span id="isoLabel" style="font-size:13px;color:#4bcffa;font-weight:bold;">平面视图</span>
</div>

<div class="grid-container">
`;

const colors = ['#FFFFFF'];
for (let i = 1; i <= config.layers.max; i++) {
  colors.push(config.layers.colors[i] || '#FFF');
}

// Scale factors
const scaleX = 20;
const scaleY = 25; // Fixed: 2 grid units = 50px (matching tile height of 48px + 2px border)

Object.keys(templates).sort((a,b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1])).forEach(key => {
    const tiles = templates[key];
    const maxLayout = Math.max(...tiles.map(t => t.layout));
    const tileCount = tiles.length;

    // Calculate dimensions
    const xs = tiles.map(t => t.x);
    const ys = tiles.map(t => t.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // Each tile occupies 2x2 grid units, so width is (maxX - minX + 2) and height is (maxY - minY + 2)
    const gridW = maxX - minX + 2;
    const gridH = maxY - minY + 2;
    const tileW = gridW / 2;
    const tileH = gridH / 2;

    htmlContent += `
    <div class="template-card" id="card_${key}">
      <h3>${key}</h3>
      <div class="info">Tiles: ${tileCount} | Max Layer: ${maxLayout}</div>
      <div class="info">Grid: ${gridW}x${gridH} (${tileW}x${tileH} Tiles)</div>
      <div class="info" style="font-size: 11px; color: #888;">Range: X[${minX}~${maxX+2}], Y[${minY}~${maxY+2}]</div>
      <a href="level_editor.html?template=${key}" target="_blank" class="edit-link">编辑此模板 (Edit)</a>
      <div class="board">
        <div class="board-boundary"></div>
    `;

    // Render tiles at absolute coordinate positions matching the level editor board grid
    // Board is 320x540. Active grid of 12 columns x 14 rows at scaleX=20, scaleY=25 is 240x350.
    // Centered offset is: X: (320 - 240)/2 = 40px, Y: (540 - 350)/2 = 95px.
    const offsetX = 40;
    const offsetY = 95;

    // Render tiles. Sort by layout so higher layers render on top
    tiles.sort((a, b) => a.layout - b.layout).forEach(t => {
        const left = t.x * scaleX + offsetX;
        const top = t.y * scaleY + offsetY;
        const zIndex = t.layout * 10;
        const color = colors[t.layout] || '#FFF';

        htmlContent += `<div class="tile" data-x="${t.x}" data-y="${t.y}" data-layout="${t.layout}" style="--iso-l:${t.layout - 1}; left:${left}px; top:${top}px; z-index:${zIndex}; background-color:${color};">L${t.layout}</div>`;
    });

    htmlContent += `
      </div>
    </div>
    `;
});

htmlContent += `
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // ── 仿3D 开关 ──────────────────────────────────────────────
  const toggle = document.getElementById('isoToggle');
  const label  = document.getElementById('isoLabel');
  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      document.body.classList.add('iso');
      label.textContent = '仿3D 视图 ✨';
    } else {
      document.body.classList.remove('iso');
      label.textContent = '平面视图';
    }
  });

  // ── 原有校验逻辑 ────────────────────────────────────────────
  const cards = document.querySelectorAll('.template-card');
  let totalErrors = 0;
  const errorReports = [];

  cards.forEach(card => {
    const title = card.querySelector('h3').textContent;
    const tiles = [];
    const tileElements = card.querySelectorAll('.tile');
    
    tileElements.forEach(el => {
      tiles.push({
        x: parseInt(el.getAttribute('data-x')),
        y: parseInt(el.getAttribute('data-y')),
        layout: parseInt(el.getAttribute('data-layout')),
        el: el
      });
    });

    const overlaps = [];
    for(let i=0; i<tiles.length; i++) {
      for(let j=i+1; j<tiles.length; j++) {
        if(tiles[i].layout === tiles[j].layout) {
          const dx = Math.abs(tiles[i].x - tiles[j].x);
          const dy = Math.abs(tiles[i].y - tiles[j].y);
          if(dx < 2 && dy < 2) {
            overlaps.push({a: tiles[i], b: tiles[j]});
          }
        }
      }
    }

    // Boundary check using configured grid limits
    const outOfBounds = tiles.filter(t => {
      return t.x < 0 || t.x > (config.grid.cols - config.grid.tileWidth) || t.y < 0 || t.y > (config.grid.rows - config.grid.tileHeight);
    });

    if(overlaps.length > 0 || outOfBounds.length > 0) {
      totalErrors += overlaps.length + outOfBounds.length;
      card.style.border = '2px solid #ff3f34';
      card.style.boxShadow = '0 0 15px rgba(255, 63, 52, 0.4)';
      
      overlaps.forEach(o => {
        o.a.el.style.border = '2px dashed #ff3f34';
        o.b.el.style.border = '2px dashed #ff3f34';
      });

      outOfBounds.forEach(t => {
        t.el.style.border = '2px dotted #ffd32a';
      });

      let errorMsg = title + ': ';
      if (overlaps.length > 0) errorMsg += "发现 " + overlaps.length + " 处同层物理重叠; ";
      if (outOfBounds.length > 0) errorMsg += "发现 " + outOfBounds.length + " 处坐标越界错误; ";
      errorReports.push(errorMsg);
    }
  });

  const header = document.createElement('div');
  header.style.cssText = 'text-align:center;background:' + (totalErrors > 0 ? '#ff3f34' : '#0be881') +
    ';color:#fff;padding:12px;border-radius:8px;margin-bottom:20px;font-weight:bold;font-size:15px;box-shadow:0 4px 10px rgba(0,0,0,0.5);';
  header.innerHTML = totalErrors > 0
    ? "⚠️ 校验未通过！共 " + totalErrors + " 处冲突 / 越界<br><div style='font-size:12px;font-weight:normal;margin-top:8px;'>" + errorReports.join('<br>') + "</div>"
    : "✅ 所有模板校验通过，无重叠 / 越界！";
  document.body.insertBefore(header, document.querySelector('.grid-container'));

});
</script>
</body>
</html>
`;

fs.writeFileSync(outputPath, htmlContent);
console.log(`Visualizer generated at ${outputPath}`);
