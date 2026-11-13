// Procedural Isometric Map Generator (Expanded 120x120 World)

export class MapGenerator {
  constructor(cols = 120, rows = 120) {
    this.cols = cols;
    this.rows = rows;
  }

  generate(biomeData, tierLevel) {
    const grid = [];
    for (let r = 0; r < this.rows; r++) {
      grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        // Outer Borders are impassable walls
        if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
          grid[r][c] = 1; // Obstacle wall
        } else {
          // Cellular noise: ~16% natural tree/rock obstacles
          grid[r][c] = Math.random() < 0.16 ? 1 : 0;
        }
      }
    }

    // Cellular Automata smoothing passes (2 passes)
    for (let pass = 0; pass < 2; pass++) {
      const copy = grid.map(row => [...row]);
      for (let r = 1; r < this.rows - 1; r++) {
        for (let c = 1; c < this.cols - 1; c++) {
          let wallNeighbors = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (copy[r + dr][c + dc] === 1) wallNeighbors++;
            }
          }
          if (wallNeighbors >= 5) grid[r][c] = 1;
          else if (wallNeighbors <= 2) grid[r][c] = 0;
        }
      }
    }

    // Clear safe starting area around top-left (r: 10, c: 10)
    const startR = 10;
    const startC = 10;
    for (let dr = -4; dr <= 4; dr++) {
      for (let dc = -4; dc <= 4; dc++) {
        const nr = startR + dr;
        const nc = startC + dc;
        if (nr >= 1 && nr < this.rows - 1 && nc >= 1 && nc < this.cols - 1) {
          grid[nr][nc] = 0;
        }
      }
    }

    // World Highway Gate (Road leading to Next World) at bottom-right (r: rows-10, c: cols-10)
    const gateR = this.rows - 10;
    const gateC = this.cols - 10;
    for (let dr = -5; dr <= 5; dr++) {
      for (let dc = -5; dc <= 5; dc++) {
        const nr = gateR + dr;
        const nc = gateC + dc;
        if (nr >= 1 && nr < this.rows - 1 && nc >= 1 && nc < this.cols - 1) {
          grid[nr][nc] = 0;
        }
      }
    }

    // Pave a clear road path towards the gate near the end
    for (let i = 0; i <= 8; i++) {
      if (gateR - i >= 1 && gateC - i >= 1) {
        grid[gateR - i][gateC - i] = 0;
        grid[gateR - i + 1][gateC - i] = 0;
        grid[gateR - i][gateC - i + 1] = 0;
      }
    }

    // Place Hazards based on biome (Swamp, Lava, Ice, Heatwave)
    const hazards = [];
    if (biomeData.hazard) {
      const hazardCount = 60 + Math.floor(tierLevel * 1.5);
      for (let i = 0; i < hazardCount; i++) {
        const hr = Math.floor(6 + Math.random() * (this.rows - 12));
        const hc = Math.floor(6 + Math.random() * (this.cols - 12));
        if (grid[hr][hc] === 0 && (Math.abs(hr - startR) > 6 || Math.abs(hc - startC) > 6)) {
          grid[hr][hc] = 3; // Hazard tile (slow + debuff)
          hazards.push({ r: hr, c: hc, type: biomeData.hazard });
        }
      }
    }

    // Collect valid walkable spawn positions
    const walkableCells = [];
    for (let r = 3; r < this.rows - 3; r++) {
      for (let c = 3; c < this.cols - 3; c++) {
        if (grid[r][c] === 0) {
          const distToStart = Math.hypot(r - startR, c - startC);
          const distToGate = Math.hypot(r - gateR, c - gateC);
          if (distToStart > 8 && distToGate > 6) {
            walkableCells.push({ r, c });
          }
        }
      }
    }

    // Shuffle walkable cells
    walkableCells.sort(() => 0.5 - Math.random());

    // Place Chests (12~18 per large world)
    const chests = [];
    const chestCount = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < chestCount && walkableCells.length > 0; i++) {
      chests.push(walkableCells.pop());
    }

    // Place Monster Spawns (80~120 monsters in large world)
    const monsterSpawns = [];
    const monsterCount = Math.min(walkableCells.length, 80 + Math.floor(tierLevel / 2));
    for (let i = 0; i < monsterCount; i++) {
      monsterSpawns.push(walkableCells.pop());
    }

    return {
      cols: this.cols,
      rows: this.rows,
      grid,
      startPos: { r: startR, c: startC },
      portalPos: { r: gateR, c: gateC }, // Exit Road Gate
      hazards,
      chests,
      monsterSpawns
    };
  }
}
