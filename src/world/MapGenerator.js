// Procedural Isometric Map Generator

export class MapGenerator {
  constructor(cols = 44, rows = 44) {
    this.cols = cols;
    this.rows = rows;
  }

  generate(biomeData, tierLevel) {
    const grid = [];
    for (let r = 0; r < this.rows; r++) {
      grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        // Borders are obstacles
        if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
          grid[r][c] = 1; // Obstacle wall
        } else {
          // Cellular noise: ~18% chance of rock/tree obstacle
          grid[r][c] = Math.random() < 0.17 ? 1 : 0;
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

    // Clear safe starting area around center-left (r: 6, c: 6)
    const startR = 6;
    const startC = 6;
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        const nr = startR + dr;
        const nc = startC + dc;
        if (nr >= 1 && nr < this.rows - 1 && nc >= 1 && nc < this.cols - 1) {
          grid[nr][nc] = 0;
        }
      }
    }

    // Portal / Boss altar location at bottom-right (r: rows-7, c: cols-7)
    const portalR = this.rows - 7;
    const portalC = this.cols - 7;
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        const nr = portalR + dr;
        const nc = portalC + dc;
        if (nr >= 1 && nr < this.rows - 1 && nc >= 1 && nc < this.cols - 1) {
          grid[nr][nc] = 0;
        }
      }
    }

    // Place Hazards based on biome
    const hazards = [];
    if (biomeData.hazard) {
      const hazardCount = 14 + Math.floor(tierLevel / 5);
      for (let i = 0; i < hazardCount; i++) {
        const hr = Math.floor(4 + Math.random() * (this.rows - 8));
        const hc = Math.floor(4 + Math.random() * (this.cols - 8));
        if (grid[hr][hc] === 0 && (Math.abs(hr - startR) > 5 || Math.abs(hc - startC) > 5)) {
          grid[hr][hc] = 3; // Hazard tile
          hazards.push({ r: hr, c: hc, type: biomeData.hazard });
        }
      }
    }

    // Find valid walkable spawn positions for chests and monsters
    const walkableCells = [];
    for (let r = 2; r < this.rows - 2; r++) {
      for (let c = 2; c < this.cols - 2; c++) {
        if (grid[r][c] === 0) {
          const distToStart = Math.hypot(r - startR, c - startC);
          const distToPortal = Math.hypot(r - portalR, c - portalC);
          if (distToStart > 6 && distToPortal > 4) {
            walkableCells.push({ r, c });
          }
        }
      }
    }

    // Shuffle walkable cells
    walkableCells.sort(() => 0.5 - Math.random());

    // Place Chests (3~5 per map)
    const chests = [];
    const chestCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < chestCount && walkableCells.length > 0; i++) {
      chests.push(walkableCells.pop());
    }

    // Place Monster Spawns (18~28 monsters per map)
    const monsterSpawns = [];
    const monsterCount = Math.min(walkableCells.length, 20 + Math.floor(tierLevel / 4));
    for (let i = 0; i < monsterCount; i++) {
      monsterSpawns.push(walkableCells.pop());
    }

    return {
      cols: this.cols,
      rows: this.rows,
      grid,
      startPos: { r: startR, c: startC },
      portalPos: { r: portalR, c: portalC },
      hazards,
      chests,
      monsterSpawns
    };
  }
}
