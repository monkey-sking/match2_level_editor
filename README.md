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
