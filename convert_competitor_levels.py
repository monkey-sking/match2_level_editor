import os
import json
import random

def convert_level(json_path, txt_path):
    """
    将竞品的单个 JSON 关卡物理布局转换为我方的标准 Tab 分隔关卡 TXT 文件。
    """
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading {json_path}: {e}")
        return
    
    cells = data.get('cells', [])
    if not cells:
        print(f"No cells in {json_path}")
        return
    
    # 1. 提取竞品所有物理块数据 (column, row, layer)
    raw_tiles = []
    for cell in cells:
        col = cell.get('column', 0)
        row = cell.get('row', 0)
        grid_objects = cell.get('gridObjects', [])
        for obj in grid_objects:
            layer = obj.get('layer', 0)
            raw_tiles.append({
                'col': col,
                'row': row,
                'layer': layer
            })
            
    total_tiles = len(raw_tiles)
    if total_tiles == 0:
        print(f"Total tiles is 0 in {json_path}")
        return
        
    # 2. 奇偶成对检查：由于连连看和我方的对子消均需要偶数张牌，非偶数则做安全截断
    if total_tiles % 2 != 0:
        raw_tiles = raw_tiles[:-1]
        total_tiles = len(raw_tiles)
        
    # 3. 提取坐标极值以进行归一化居中映射
    cols = [t['col'] for t in raw_tiles]
    rows = [t['row'] for t in raw_tiles]
    
    min_col, max_col = min(cols), max(cols)
    min_row, max_row = min(rows), max(rows)
    
    col_range = max_col - min_col if max_col != min_col else 1
    row_range = max_row - min_row if max_row != min_row else 1
    
    # 4. 映射到我们的 6x7 双倍分辨率坐标网格 (x: 0~10, y: 0~12)
    # x_our 映射到 [0, 10] 的偶数或奇数格
    # y_our 映射到 [0, 12]，并将Y轴垂直翻转，使底部为0符合我方约定
    converted_tiles = []
    occupied_positions = set()
    
    for idx, t in enumerate(raw_tiles):
        # 归一化后等比拉伸到我方边界，并四舍五入到整型坐标
        x = round((t['col'] - min_col) / col_range * 10)
        y = round((max_row - t['row']) / row_range * 12)
        layout = t['layer'] + 1  # 我们的层数从1开始
        
        # 简单防物理重叠处理：如果多个点映射到了我方的同一个坐标层，进行微调偏置
        while (x, y, layout) in occupied_positions:
            if x < 10:
                x += 1
            elif y < 12:
                y += 1
            else:
                layout += 1  # 实在不行往上堆一层
                
        occupied_positions.add((x, y, layout))
        converted_tiles.append({
            'x': x,
            'y': y,
            'layout': layout
        })
        
    # 5. 花色成对分配（UID 配对）
    # 从我方《关卡坐标规范》选取牌型UID库：万字(1001~1009)、条子(2001~2009)、饼子(3001~3009)、字牌(4001~4007)
    uid_pool = [
        1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009,
        2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
        3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009,
        4001, 4002, 4003, 4004, 4005, 4006, 4007
    ]
    
    # 根据当前关卡的总牌数动态决定花色种类数量，保证难度匹配
    num_pairs = total_tiles // 2
    # 牌越少花色越少，最多24种花色，最少4种
    num_uids = min(num_pairs, max(4, total_tiles // 6))
    selected_uids = random.sample(uid_pool, min(len(uid_pool), num_uids))
    
    # 填充对子
    assigned_uids = []
    for i in range(num_pairs):
        uid = selected_uids[i % len(selected_uids)]
        assigned_uids.extend([uid, uid])
        
    # 随机打乱，保证分布均匀
    random.shuffle(assigned_uids)
    
    # 将成对的花色赋予映射完的卡牌
    for idx, t in enumerate(converted_tiles):
        t['uid'] = assigned_uids[idx]
        t['id'] = idx + 1
        
    # 6. 按照我方 5 行标准头 + Tab 分隔格式写入 TXT 文件
    os.makedirs(os.path.dirname(txt_path), exist_ok=True)
    try:
        with open(txt_path, 'w', encoding='utf-8') as f:
            # 5行标准策划头配置
            f.write("##var\tid\tuid\tx\ty\tlayout\n")
            f.write("##var\t\t\t\t\t\n")
            f.write("##type\tint\tint\tint\tint\tint\n")
            f.write("##group\tc\tc\tc\tc\tc\n")
            f.write("##\t这是自己的id\t牌型id\t位置\t位置\t第几层\n")
            
            # 数据行
            for t in converted_tiles:
                f.write(f"\t{t['id']}\t{t['uid']}\t{t['x']}\t{t['y']}\t{t['layout']}\n")
        print(f"[Success] {os.path.basename(json_path)} -> {os.path.basename(txt_path)} ({total_tiles} tiles)")
    except Exception as e:
        print(f"Error writing to {txt_path}: {e}")

def batch_convert():
    """
    自动递归扫描竞品 100 个 JSON 关卡并批量导出到我方关卡数据夹下
    """
    json_dir = r"D:\Project\mahjong\LevelsJson"
    output_dir = r"d:\mahjong_match2_gdd\策划案_GameDesign\关卡数据_LevelData\竞品复刻关卡"
    
    if not os.path.exists(json_dir):
        print(f"Competitor levels directory not found: {json_dir}")
        return
        
    print(f"Starting batch conversion from {json_dir}...")
    converted_count = 0
    
    for root, dirs, files in os.walk(json_dir):
        for file in files:
            if file.endswith('.json'):
                json_path = os.path.join(root, file)
                # 转换文件名，如 Level_001.json -> level_comp_001.txt
                txt_name = file.lower().replace('.json', '.txt').replace('level_', 'level_comp_')
                txt_path = os.path.join(output_dir, txt_name)
                
                convert_level(json_path, txt_path)
                converted_count += 1
                
    print(f"\nBatch conversion finished! Total converted: {converted_count} files.")
    print(f"Output saved in: {output_dir}")

if __name__ == '__main__':
    batch_convert()
