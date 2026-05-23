# Match-2 Level Editor (二消关卡排版编辑器)

[English](#english) | [中文说明](#中文说明)

---

## English

A highly visual, robust, and responsive Match-2 level layout editor and pipeline. Designed to create, validate, and export grid level templates ($11 \times 13$) with 3D layer stacking.

### 🌟 Key Features
- **Dual Layout Design**: Toggle between the clean **Classic Layout** and the modern, high-efficiency **IDE Modern Layout** (glassmorphism UI with a dark theme).
- **5-Layer 3D Stacking**: Supports up to 5 overlapping layers with auto-highlighting of "floating" tiles (tiles lacking support from the layer beneath).
- **Level Explorer**: Sidebar to quickly search, filter, and switch between level templates.
- **Live Validation**: Real-time checking of tile counts, even-number pair requirements, overlapping grid checks, and coordinate range violations.
- **Excel & HTML Pipeline**: Automatic extraction and exportation of template data directly into `data/Board.xlsx` and `data/level.xlsx` using local Node pipelines.
- **3D Preview Visualizer**: Generates an interactive, responsive HTML page (`templates_preview.html`) containing 3D grid layout previews for all templates.
- **Developer Shortcuts**: Silent background saving with `Ctrl + S`, asynchronous pipeline compilation, and instant toast notifications.

---

### 📂 Directory Structure
```
D:\Project\match2_level_editor
├── server.js               # Node.js backend server
├── level_editor.html       # Web-based level editor GUI
├── templates_preview.html  # Generated level visualizer preview
├── Export-ToExcel.js       # Script to compile templates & rules into Excel (.xlsx)
├── Generate-Visualizer.js  # Script to generate templates_preview.html
├── Extract-BoardTemplates.js # Script to extract template skeletons from raw JSONs
├── package.json            # NPM dependencies configuration
├── start_server.bat        # Double-click script to start the local Node server
├── run_all.bat             # Double-click script to run the full build pipeline
└── data/                   # Data storage folder
    ├── BoardTemplates.json # Main level template dataset
    ├── LevelRules.json     # Level configuration rules
    ├── Board.xlsx          # Compiled Excel file for grid layouts
    └── level.xlsx          # Compiled Excel file for level configurations
```

---

### 🚀 Getting Started

#### Prerequisites
Make sure [Node.js](https://nodejs.org/) is installed on your computer.

#### 1. Start the Editor Server
Double-click `start_server.bat` in the project folder, or run:
```bash
node server.js
```
Then open your browser and navigate to:
**[http://localhost:8080/level_editor.html](http://localhost:8080/level_editor.html)**

#### 2. Run the Generation Pipeline
To regenerate the Excel sheets (`data/*.xlsx`) and visualizer page (`templates_preview.html`), double-click `run_all.bat` or run:
```bash
node Export-ToExcel.js; node Generate-Visualizer.js
```

---

### ⌨️ Editor Shortcuts & Actions
- **Left Click**: Places a tile on the current layer at the grid coordinate.
- **Double Click or Re-click**: Removes the tile from the current layer.
- **Ctrl + S**: Saves templates silently to `data/BoardTemplates.json` and runs the Excel/Visualizer generation script in the background.
- **Shift Layout**: Shift the entire level or just the current layer in four directions (Up/Down/Left/Right) using the navigation buttons.
- **Theme Toggle**: Switch dynamically between Classic and Modern modes.

---

### ⚙️ Custom Configuration (data/config.json)
You can customize the layout dimensions, active layers, layer display colors, and competitor extraction path using the centralized `data/config.json` file:
```json
{
  "server": { "port": 8080 },
  "grid": { "cols": 12, "rows": 14, "tileWidth": 2, "tileHeight": 2 },
  "layers": {
    "max": 5,
    "colors": {
      "1": "#808e9b",
      "2": "#4bcffa",
      "3": "#0be881",
      "4": "#ffd32a",
      "5": "#ff3f34"
    }
  },
  "pipeline": { "competitorLevelsDir": "D:\\Project\\mahjong\\LevelsJson" }
}
```
If you edit this file, the Editor UI, server port, boundary validation, colors, and competitor extraction pipelines will automatically adapt to your new grid scale or layers.

---

### 📐 Design Philosophy & Pipeline

#### 1. Level Difficulty Curve Loop
- **Cycle Structure**: Starts at **Level 4** (Levels 1-3 are beginner tutorial stages, exempt from difficulty rules). The difficulty flows in a 3-level cycle:
  - **Level 3N + 1**: Easy (Target Variety $M = 3$ or $4$)
  - **Level 3N + 2**: Medium (Target Variety $M = 4$ or $5$)
  - **Level 3N**: Hard (Target Variety $M = 5$ or $6$)
- **Difficulty Grading Classifier**: Calculates a score based on a layout base factor and active card types variety count ($Score = BaseFactor \times M$):
  - $BaseFactor = \frac{N}{F} \times (1 + 0.15 \times L)$, where $N$ is total cards count, $F$ is initially accessible cards count (free tiles with no coverage from above), and $L$ is max layers.
  - $Score < 50 \implies \text{Easy}$
  - $50 \le Score < 90 \implies \text{Medium}$
  - $Score \ge 90 \implies \text{Hard}$

#### 2. Playability Safeguards ($F \ge 12$)
- To prevent early-game lockups / deadlocks where too few cards can be cleared initially in higher difficulty levels, all **Medium** and **Hard** levels enforce a minimum of 12 free tiles at layout start ($F \ge 12$).
- Handcrafted templates with $F < 12$ are automatically adjusted symmetrically by trimming upper layers until the criteria is met. Procedurally generated levels filter and discard any layouts violating this threshold.

#### 3. Code & Data Repository Isolation
- **Public Code Repository** (`match2_level_editor`): Contains the web GUI editor, visualizer generator, Excel compiler scripts, and conversion utilities.
- **Private Data Repository** (`match2_level_data`): Stores the actual game config files, raw levels and rules configurations (`data/` folder containing JSON levels, rules, and compiled `.xlsx` files). The public repository ignores the `data/` folder via `.gitignore` to prevent leaking private business data.

#### 4. Automatic Build and Compilation Sync Pipeline
- Running `run_all.bat` exports designs to Excel configs: `level.xlsx`, `Board.xlsx`, `playitem.xlsx`.
- The exports are automatically synchronized to the local game directory: `D:\Project\hwyxxl\Configs\GameConfig\Datas`.
- The client-side and server-side configurations are automatically compiled and re-built (via Luban tools) for seamless live testing.

---

### ⏳ Change History

- **2026-05-23: Security & Pipeline Sync Release**
  - Separated codebase and private game assets: moved `data/` to `match2_level_data` private repo and untracked from public editor repo.
  - Shifted difficulty wave start point to Level 4 (Tutorial Level Exemption for 1-3).
  - Sanitized commit author information to map to correct GitHub account (`monkey-sking`).
- **2026-05-22: Solver & Algorithmic Engine Release**
  - Integrated procedural and subtraction layout generator.
  - Added mathematical difficulty evaluator and automated matching assigner.
  - Implemented the $F \ge 12$ playability rule with symmetric auto-pruning.
- **2026-05-20: Initial Editor Release**
  - Created interactive 3D Grid Layout Editor with live validation checks.
  - Integrated side panel explorer, Excel exports, and 3D templates visualizer.

---
---

## 中文说明

一款高度可视化、高效率的二消（Match-2）网格关卡排版编辑器与构建管道。专门用于设计、校验和生成 $11 \times 13$ 的多层立体卡牌网格关卡模板。

### 🌟 核心特性
- **双排版设计**：支持快速切换“经典布局”与全新的“现代 IDE 布局”（毛玻璃拟物风，黑金主题）。
- **五层立体堆叠**：支持最多 5 层堆叠，拥有“悬空磁吸检测”，当卡牌在下方图层没有足够物理支撑时自动醒目高亮标记。
- **关卡浏览器**：集成左侧边栏，支持通过关键字、牌数过滤搜索，并可一键加载切换关卡。
- **实时合规校验**：自动校验总卡牌数、偶数配对要求、同层重叠冲突以及坐标越界错误。
- **一键 Excel 导出**：自动将数据导出并整理至 `data/Board.xlsx` 与 `data/level.xlsx`，可直接对接策划配置表。
- **3D 关卡可视化预览**：自动生成静态预览页 `templates_preview.html`，以直观 3D 图层效果展示所有关卡模板。
- **极佳的开发体验**：支持 `Ctrl + S` 无感保存并自动在后台跑完数据管道编译，配合 Toast 浮窗提示不打断操作。

---

### 📂 目录结构说明
```
D:\Project\match2_level_editor
├── server.js               # Node.js 本地后端服务
├── level_editor.html       # 编辑器前端主界面 (HTML/JS/CSS)
├── templates_preview.html  # 自动生成的关卡 3D 预览可视化页面
├── Export-ToExcel.js       # 数据编译脚本：将 JSON 模板编译为策划 Excel 表
├── Generate-Visualizer.js  # 可视化编译脚本：生成 templates_preview.html
├── Extract-BoardTemplates.js # 竞品提取脚本：从原始 JSON 提取关卡骨架
├── package.json            # 项目依赖配置
├── start_server.bat        # 双击一键启动 Node 本地服务
├── run_all.bat             # 双击一键重新生成 Excel 报告与预览页面
└── data/                   # 核心数据文件夹
    ├── BoardTemplates.json # 关卡网格模板数据源
    ├── LevelRules.json     # 关卡路由及必刷牌配置规则
    ├── Board.xlsx          # 编译导出的棋盘排版 Excel
    └── level.xlsx          # 编译导出的关卡配置 Excel
```

---

### 🚀 快速上手说明

#### 前提条件
请确保您的电脑上已安装了 [Node.js](https://nodejs.org/)。

#### 1. 启动编辑器服务
双击运行项目根目录下的 **`start_server.bat`**，或者在控制台执行：
```bash
node server.js
```
随后在浏览器中打开：
**[http://localhost:8080/level_editor.html](http://localhost:8080/level_editor.html)**

#### 2. 手动编译数据
如果您需要重新生成 `data/` 下的 Excel 文件以及 `templates_preview.html`，只需双击运行 **`run_all.bat`**，或执行：
```bash
node Export-ToExcel.js; node Generate-Visualizer.js
```

---

### ⌨️ 编辑器常用快捷键与操作
- **鼠标左键**：在当前编辑图层对应的网格上点击即可放置卡牌。
- **双击或再次点击**：移除对应图层已放置的卡牌。
- **Ctrl + S**：快速无感保存（直接写回 `data/BoardTemplates.json`，并自动在后台执行管道编译，无需刷新页面）。
- **平移布局**：支持“整体平移”或“仅当前层平移”（方向键微调，越界自动阻挡）。
- **视图切换**：显示全部层、聚焦当前编辑层、或仅看当前编辑层（支持底支撑下一层参照）。

---

### ⚙️ 自定义参数配置 (data/config.json)
你可以通过项目中的 `data/config.json` 文件全局自定义棋盘尺寸、活动图层数、图层表现颜色以及竞品数据提取路径：
```json
{
  "server": { "port": 8080 },
  "grid": { "cols": 12, "rows": 14, "tileWidth": 2, "tileHeight": 2 },
  "layers": {
    "max": 5,
    "colors": {
      "1": "#808e9b",
      "2": "#4bcffa",
      "3": "#0be881",
      "4": "#ffd32a",
      "5": "#ff3f34"
    }
  },
  "pipeline": { "competitorLevelsDir": "D:\\Project\\mahjong\\LevelsJson" }
}
```
修改此文件后，编辑器前端 UI、端口、合规校验边界、图层按钮、着色以及竞品提取管道等均会自动适配，无需重新打包或重构代码。

---

### 📐 设计思路与构建管道

#### 1. 关卡难度波形循环
- **循环机制**：从**第 4 关**开始进行难度循环（1-3 关为新手引导教学关，免除难度校验）。关卡难度以 3 关为一个周期呈波浪式循环流动：
  - **第 3N + 1 关**：Easy 简单 (卡牌花色数 $M = 3$ 或 $4$)
  - **第 3N + 2 关**：Medium 中等 (卡牌花色数 $M = 4$ 或 $5$)
  - **第 3N 关**：Hard 困难 (卡牌花色数 $M = 5$ 或 $6$)
- **难度评价公式**：基于棋盘排版复杂度与花色数量综合评分 ($Score = BaseFactor \times M$)：
  - $BaseFactor = \frac{N}{F} \times (1 + 0.15 \times L)$，其中 $N$ 为总卡牌数，$F$ 为初始可点选的空闲牌数（即上方无遮挡的牌），$L$ 为最大图层层数。
  - $Score < 50 \implies \text{Easy}$
  - $50 \le Score < 90 \implies \text{Medium}$
  - $Score \ge 90 \implies \text{Hard}$

#### 2. 可玩性安全阀 ($F \ge 12$ 开启牌数校验)
- 为了防止在中高难度关卡中由于开局可消除的牌太少而导致死局或极早卡关，所有的 **Medium** 和 **Hard** 关卡在初始状态下必须包含至少 12 张可点选的空闲牌 ($F \ge 12$)。
- 对于手工作业的模板，若被评估为 Medium/Hard 且 $F < 12$，算法会沿着对称轴自动裁剪最上层卡牌，直至满足 $F \ge 12$；对于算法自动生成的关卡，任何不满足此阈值的排版均会被直接过滤舍弃。

#### 3. 代码与数据仓库隔离
- **公开代码仓库** (`match2_level_editor`)：仅托管网页 GUI 编辑器前端、可视化页面生成器、Excel 编译脚本以及转换工具等通用代码工具。
- **私有数据仓库** (`match2_level_data`)：存放关卡及规则配置（`data/` 目录，包含 JSON 关卡、规则和导出的 `.xlsx` 配置文件）。公开仓库通过 `.gitignore` 过滤 `data/` 文件夹，避免泄露内部商业数据。

#### 4. 自动化导出与客户端/服务端编译同步
- 运行 `run_all.bat` 会自动将关卡设计导出为 `level.xlsx`、`Board.xlsx`、`playitem.xlsx`。
- 导出的文件会自动同步至本地游戏工程：`D:\Project\hwyxxl\Configs\GameConfig\Datas`。
- 自动运行游戏客户端与服务端配置编译器 (Luban 编译工具)，实现一键数据编译与热更新。

---

### ⏳ 变更记录

- **2026-05-23: 安全性隔离与编译同步**
  - 完成代码和数据的仓库隔离：将 `data/` 移至私有仓库，并在编辑器公开仓库中移除追踪及配置 `.gitignore`。
  - 调整难度循环起点：从第 4 关开始进行难度循环，1-3 关设为新手教学豁免关卡。
  - 清理并重写了 Git 提交历史，修复提交人账号名（统一为 `monkey-sking`）。
- **2026-05-22: 算法引擎与自动生成器上线**
  - 编写了关卡自动生成及减法剪枝算法。
  - 设计了关卡复杂度与难度匹配器，实现手制模板与难度曲线的全局最优匹配。
  - 落地了 $F \ge 12$ 初始空闲牌数安全校验规则与对称自动裁剪算法。
- **2026-05-20: 编辑器首发版本**
  - 搭建 3D 多层堆叠关卡编辑器，支持 5 层卡牌遮挡关系及悬空支撑实时检测。
  - 实现了左侧关卡浏览器、Ctrl+S 静默保存、一键导出 Excel 及 3D 可视化预览静态页功能。
