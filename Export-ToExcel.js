const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const configDir = path.join(__dirname, 'data');
const levelRulesPath = path.join(configDir, 'LevelRules.json');
const boardTemplatesPath = path.join(configDir, 'BoardTemplates.json');

const levelExcelPath = path.join(configDir, 'level.xlsx');
const boardExcelPath = path.join(configDir, 'Board.xlsx');

function buildLevelExcel() {
    const rules = JSON.parse(fs.readFileSync(levelRulesPath, 'utf8'));
    
    const rows = [
        {"##var": "##var", "id": "id", "startId": "startId", "endId": "endId", "boardIn": "boardIn", "item": "item", "initItem": "initItem", "num": "num", "backSpawnPos": "backSpawnPos"},
        {"##var": "##type", "id": "int", "startId": "int", "endId": "int", "boardIn": "(list#sep=,),int", "item": "(list#sep=,),item.EPlayItemType", "initItem": "(list#sep=,),int", "num": "int", "backSpawnPos": "(list#sep=|),vector3"},
        {"##var": "##group", "id": "c", "startId": "c", "endId": "c", "boardIn": "c", "item": "c", "initItem": "c", "num": "c", "backSpawnPos": "c"},
        {"##var": "##", "id": "这是自己的id", "startId": "开始关卡", "endId": "结束关卡", "boardIn": "包含模板", "item": "包含棋牌类型", "initItem": "必出现棋牌", "num": "必现牌数", "backSpawnPos": "竖线|分隔 反面位置"}
    ];

    let idCounter = 1;
    for (const rule of rules) {
        const boardIds = rule.boardIn.map(b => parseInt(b.replace('template_', ''), 10));
        
        rows.push({
            "id": idCounter++,
            "startId": rule.startLevel,
            "endId": rule.endLevel,
            "boardIn": boardIds.join(','),
            "item": rule.itemPool.join(','),
            "initItem": rule.initItem.join(','),
            "num": rule.initNum,
            "backSpawnPos": rule.backSpawnPos || ""
        });
    }

    const ws = xlsx.utils.json_to_sheet(rows, { header: ["##var", "id", "startId", "endId", "boardIn", "item", "initItem", "num", "backSpawnPos"], skipHeader: true });
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    xlsx.writeFile(wb, levelExcelPath);
    console.log(`Generated ${levelExcelPath}`);
}

function buildBoardExcel() {
    const templates = JSON.parse(fs.readFileSync(boardTemplatesPath, 'utf8'));
    
    const rows = [
        {"##var": "##var", "id": "id", "x": "x", "y": "y", "layout": "layout", "layoutMax": "layoutMax", "boardId": "boardId"},
        {"##var": "##type", "id": "int", "x": "int", "y": "int", "layout": "int", "layoutMax": "int", "boardId": "int"},
        {"##var": "##group", "id": "c", "x": "c", "y": "c", "layout": "c", "layoutMax": "c", "boardId": "c"},
        {"##var": "##", "id": "这是自己的id", "x": "位置", "y": "位置", "layout": "第几层", "layoutMax": "最高多少层", "boardId": "模板id"}
    ];

    let idCounter = 1;
    for (const [key, tiles] of Object.entries(templates)) {
        const numMatch = (key.match(/\d+/) || [idCounter])[0];
        const boardId = parseInt(numMatch, 10);
        let layoutMax = 0;
        for (const t of tiles) {
            if (t.layout > layoutMax) {
                layoutMax = t.layout;
            }
        }

        for (const t of tiles) {
            rows.push({
                "id": idCounter++,
                "x": t.x,
                "y": t.y,
                "layout": t.layout,
                "layoutMax": layoutMax,
                "boardId": boardId
            });
        }
    }

    const ws = xlsx.utils.json_to_sheet(rows, { header: ["##var", "id", "x", "y", "layout", "layoutMax", "boardId"], skipHeader: true });
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    xlsx.writeFile(wb, boardExcelPath);
    console.log(`Generated ${boardExcelPath}`);

    // Sync to projects defined in projects.json
    try {
        const projectsJsonPath = path.join(configDir, 'projects.json');
        if (fs.existsSync(projectsJsonPath)) {
            const projectsCfg = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf8'));
            for (const proj of projectsCfg.projects) {
                if (proj.configDir && fs.existsSync(proj.configDir)) {
                    const targetPath = path.join(proj.configDir, 'Board.xlsx');
                    xlsx.writeFile(wb, targetPath);
                    console.log(`Synced Board.xlsx to project ${proj.name}: ${targetPath}`);
                }
            }
        }
    } catch (err) {
        console.warn("Could not sync Board.xlsx to projects:", err.message);
    }
}

try {
    buildLevelExcel();
    buildBoardExcel();
    console.log("Excel generation complete.");
} catch (e) {
    console.error("Error generating Excel:", e);
}
