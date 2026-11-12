// Isometric 2D Renderer - 'The Wild Darkness' Style with High-Res Image Sprites

import { CONFIG } from '../config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0 };
    this.tileW = CONFIG.TILE_WIDTH;
    this.tileH = CONFIG.TILE_HEIGHT;

    // Load High-Res Image Assets
    this.assets = {
      playerWarrior: this.loadImage('./assets/player/warrior_idle.png'),
      joystickBase: this.loadImage('./assets/ui/joystick_base.png'),
      joystickKnob: this.loadImage('./assets/ui/joystick_knob.png'),
      skills: {
        SLASH: this.loadImage('./assets/skills/skill_slash.png'),
        WHIRLWIND: this.loadImage('./assets/skills/skill_whirlwind.png'),
        DASH: this.loadImage('./assets/skills/skill_dash.png'),
        GROUND_SLAM: this.loadImage('./assets/skills/skill_slam.png'),
        WAR_CRY: this.loadImage('./assets/skills/skill_warcry.png')
      }
    };
  }

  loadImage(src) {
    const img = new Image();
    img.src = src;
    img.loaded = false;
    img.onload = () => { img.loaded = true; };
    return img;
  }

  // World (x, y) to Isometric Screen (sx, sy)
  toIso(x, y) {
    return {
      x: (x - y),
      y: (x + y) * 0.5
    };
  }

  render(game) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const player = game.player;
    const biome = game.biomeManager.currentBiome;

    // Smooth Camera follow
    const pIso = this.toIso(player.x, player.y);
    this.camera.x += (pIso.x - this.camera.x) * 0.12;
    this.camera.y += (pIso.y - this.camera.y) * 0.12;

    const camX = Math.floor(this.camera.x - W / 2);
    const camY = Math.floor(this.camera.y - H / 2);

    // 1. Clear Background with Biome Ambient tone
    ctx.fillStyle = biome.ambientColor;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-camX, -camY);

    // 2. Render Isometric Ground Tiles
    this.renderTileMap(ctx, game.map, biome, camX, camY, W, H);

    // 3. Render Chests & Portal Altar
    this.renderChestsAndPortal(ctx, game);

    // 4. Collect & Y-Sort Entities (for proper depth rendering)
    const renderList = [];

    // Drop items
    game.dropItems.forEach(item => {
      const iso = this.toIso(item.x, item.y);
      renderList.push({ type: 'ITEM', obj: item, isoY: iso.y, isoX: iso.x });
    });

    // Monsters
    game.monsters.forEach(m => {
      if (m.alive) {
        const iso = this.toIso(m.x, m.y);
        renderList.push({ type: 'MONSTER', obj: m, isoY: iso.y, isoX: iso.x });
      }
    });

    // Player
    if (!player.isDead) {
      renderList.push({ type: 'PLAYER', obj: player, isoY: pIso.y, isoX: pIso.x });
    }

    // Sort by isoY (Top to Bottom)
    renderList.sort((a, b) => a.isoY - b.isoY);

    // Draw sorted entities
    renderList.forEach(item => {
      if (item.type === 'ITEM') this.drawDropItem(ctx, item.obj, item.isoX, item.isoY);
      if (item.type === 'MONSTER') this.drawMonster(ctx, item.obj, item.isoX, item.isoY);
      if (item.type === 'PLAYER') this.drawPlayer(ctx, item.obj, item.isoX, item.isoY);
    });

    // 5. Render Attack VFX & Slash Arcs
    this.renderAttackVFX(ctx, player);

    // 6. Render Particles
    this.renderParticles(ctx, game.particles);

    // 7. Render Floating Combat Texts
    this.renderFloatingTexts(ctx, game.floatingTexts);

    ctx.restore();

    // 8. Dark Vignette / Fog Overlay (Atmospheric survival feel)
    this.renderVignette(ctx, W, H);

    // 9. Mobile Touch HUD & Virtual Controls with High-Res Assets
    this.renderTouchControls(ctx, game.input, player, W, H);
  }

  renderTileMap(ctx, map, biome, camX, camY, W, H) {
    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;

    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const isoX = (c - r) * halfW;
        const isoY = (c + r) * halfH;

        // Culling
        if (isoX + halfW < camX - 60 || isoX - halfW > camX + W + 60 ||
            isoY + halfH < camY - 60 || isoY - halfH > camY + H + 60) {
          continue;
        }

        const tileType = map.grid[r][c];

        // Draw Diamond Isometric Tile
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - halfH);
        ctx.lineTo(isoX + halfW, isoY);
        ctx.lineTo(isoX, isoY + halfH);
        ctx.lineTo(isoX - halfW, isoY);
        ctx.closePath();

        if (tileType === 1) {
          // Obstacle Wall / Boulder / Tree
          ctx.fillStyle = biome.objectColor;
          ctx.fill();
          ctx.strokeStyle = '#111';
          ctx.stroke();

          // 2.5D Height block for obstacles
          ctx.fillStyle = '#222';
          ctx.fillRect(isoX - 10, isoY - halfH - 18, 20, 20);
        } else if (tileType === 3) {
          // Hazard Tile (Poison swamp, Lava, etc.)
          ctx.fillStyle = biome.hazard === 'POISON_SWAMP' ? '#3d9970' :
                          biome.hazard === 'LAVA_BURST' ? '#ff4136' :
                          biome.hazard === 'FREEZING' ? '#7fdbff' : '#e08a1e';
          ctx.fill();
          ctx.strokeStyle = '#ffffff22';
          ctx.stroke();
        } else {
          // Walkable ground (Checkerboard pattern)
          ctx.fillStyle = (r + c) % 2 === 0 ? biome.groundColor : biome.altGroundColor;
          ctx.fill();
          ctx.strokeStyle = '#00000015';
          ctx.stroke();
        }
      }
    }
  }

  renderChestsAndPortal(ctx, game) {
    const map = game.map;
    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;

    // Portal / Altar
    const pIsoX = (map.portalPos.c - map.portalPos.r) * halfW;
    const pIsoY = (map.portalPos.c + map.portalPos.r) * halfH;

    // Glowing Altar Base
    ctx.save();
    ctx.beginPath();
    ctx.arc(pIsoX, pIsoY, 28, 0, Math.PI * 2);
    ctx.fillStyle = game.bossDefeated ? '#00ffff44' : '#ff333333';
    ctx.fill();
    ctx.strokeStyle = game.bossDefeated ? '#00ffff' : '#ff4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Portal Light Pillar
    ctx.fillStyle = game.bossDefeated ? '#00ffff88' : '#ff444455';
    ctx.fillRect(pIsoX - 6, pIsoY - 60, 12, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.bossDefeated ? '차원 관문 (활성화됨)' : '빛의 유적 제단', pIsoX, pIsoY - 68);
    ctx.restore();

    // Chests
    map.chests.forEach(ch => {
      const cIsoX = (ch.c - ch.r) * halfW;
      const cIsoY = (ch.c + ch.r) * halfH;

      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(cIsoX - 10, cIsoY - 14, 20, 14);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(cIsoX - 2, cIsoY - 10, 4, 6);
    });
  }

  drawPlayer(ctx, player, isoX, isoY) {
    ctx.save();

    // Draw Motion Trails during Dash
    player.trails.forEach(t => {
      const tIso = this.toIso(t.x, t.y);
      ctx.beginPath();
      ctx.ellipse(tIso.x, tIso.y, 18, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 220, 255, ${t.life / t.maxLife * 0.45})`;
      ctx.fill();
    });

    // Ground Shadow
    ctx.beginPath();
    ctx.ellipse(isoX, isoY + 2, 18, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Walking bounce animation
    const isMoving = Math.hypot(player.vx, player.vy) > 10;
    const bob = isMoving ? Math.abs(Math.sin(player.animTime * 14)) * 5 : Math.sin(player.animTime * 3) * 1.5;
    const bodyY = isoY - bob;

    ctx.translate(isoX, bodyY);
    ctx.scale(player.facing, 1);

    // Whirlwind rotation effect
    if (player.whirlwindTimer > 0) {
      ctx.rotate(player.animTime * 24);
    } else if (isMoving) {
      // Slight tilt when running
      ctx.rotate(Math.sin(player.animTime * 14) * 0.08);
    }

    // Hurt flash filter
    if (player.invincibleTimer > 0) {
      ctx.filter = 'brightness(1.5) drop-shadow(0 0 4px #ff4444)';
    }

    // Render High-Res Sprite Asset if loaded
    const sprite = this.assets.playerWarrior;
    if (sprite.loaded) {
      // Draw centered sprite (width: 54px, height: 72px)
      const sw = 54;
      const sh = 72;
      ctx.drawImage(sprite, -sw / 2, -sh + 6, sw, sh);
    } else {
      // Fallback
      ctx.fillStyle = '#ffdbac';
      ctx.beginPath();
      ctx.arc(0, -20, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Player Mini Name & Level Tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`Lv.${player.level} ${player.classData.name.split(' ')[0]}`, isoX, isoY - 68);
    ctx.shadowBlur = 0;

    // HP Mini Bar
    const hpPct = Math.max(0, player.hp / player.derived.maxHp);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(isoX - 20, isoY - 64, 40, 5);
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(isoX - 20, isoY - 64, Math.max(0, 40 * hpPct), 5);
  }

  drawMonster(ctx, m, isoX, isoY) {
    ctx.save();

    // Shadow
    ctx.beginPath();
    ctx.ellipse(isoX, isoY, m.radius * 0.9, m.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    const bob = Math.abs(Math.sin(m.animTime * 8)) * 3;
    const bodyY = isoY - m.radius - bob;

    ctx.translate(isoX, bodyY);
    ctx.scale(m.facing, 1);

    // Hurt flash
    if (m.hurtTimer > 0) {
      ctx.filter = 'brightness(2.0)';
    }

    // Monster Drawing by Biome / Boss
    if (m.isBoss) {
      // Big Boss Appearance
      ctx.fillStyle = '#8b0000';
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      ctx.fill();
      // Glowing evil eyes
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(4, -6, 5, 5);
      ctx.fillRect(14, -6, 5, 5);
      // Boss Horns
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.moveTo(-10, -m.radius);
      ctx.lineTo(-20, -m.radius - 18);
      ctx.lineTo(-4, -m.radius);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, -m.radius);
      ctx.lineTo(20, -m.radius - 18);
      ctx.lineTo(4, -m.radius);
      ctx.fill();
    } else {
      // Regular Cute Wild Beast / Monster
      ctx.fillStyle = m.key.includes('WOLF') ? '#708090' :
                      m.key.includes('GOBLIN') ? '#556b2f' :
                      m.key.includes('SPIDER') ? '#4b0082' :
                      m.key.includes('SCORPION') ? '#b8860b' :
                      m.key.includes('IMP') ? '#b22222' : '#808080';
      ctx.beginPath();
      ctx.roundRect(-m.radius, -m.radius, m.radius * 2, m.radius * 2, 6);
      ctx.fill();

      // Monster Eyes
      ctx.fillStyle = '#ff2222';
      ctx.fillRect(2, -4, 3, 4);
      ctx.fillRect(8, -4, 3, 4);
    }

    ctx.restore();

    // Monster HP Bar & Level
    const hpPct = m.hp / m.maxHp;
    const barW = m.isBoss ? 60 : 28;
    ctx.fillStyle = '#222';
    ctx.fillRect(isoX - barW / 2, isoY - m.radius * 2 - 14, barW, 4);
    ctx.fillStyle = m.isBoss ? '#ff1111' : '#ffaa00';
    ctx.fillRect(isoX - barW / 2, isoY - m.radius * 2 - 14, Math.max(0, barW * hpPct), 4);

    if (m.isBoss) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.name, isoX, isoY - m.radius * 2 - 18);
    }
  }

  drawDropItem(ctx, drop, isoX, isoY) {
    const item = drop.item;
    const bounce = Math.abs(Math.sin(drop.life * 5)) * 6;
    const iy = isoY - bounce;

    // Diablo-style Vertical Light Pillar
    ctx.save();
    const grad = ctx.createLinearGradient(isoX, iy, isoX, iy - 50);
    grad.addColorStop(0, item.color + 'aa');
    grad.addColorStop(1, item.color + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(isoX - 3, iy - 50, 6, 50);

    // Glowing Diamond Core
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.moveTo(isoX, iy - 12);
    ctx.lineTo(isoX + 6, iy - 6);
    ctx.lineTo(isoX, iy);
    ctx.lineTo(isoX - 6, iy - 6);
    ctx.closePath();
    ctx.fill();

    // Name Tag
    ctx.fillStyle = '#000000bb';
    ctx.fillRect(isoX - 35, iy - 26, 70, 13);
    ctx.fillStyle = item.color;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.name, isoX, iy - 16);
    ctx.restore();
  }

  renderAttackVFX(ctx, player) {
    player.activeAttacks.forEach(atk => {
      const iso = this.toIso(atk.x, atk.y);
      const alpha = atk.life / atk.maxLife;

      if (atk.type === 'SLASH') {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(iso.x, iso.y - 12, atk.radius, atk.radius * 0.5, 0, atk.angle - 0.8, atk.angle + 0.8);
        ctx.strokeStyle = `rgba(255, 230, 150, ${alpha * 0.8})`;
        ctx.lineWidth = 14 * alpha;
        ctx.stroke();
        ctx.restore();
      } else if (atk.type === 'SLAM') {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(iso.x, iso.y, atk.radius, atk.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 140, 20, ${alpha * 0.9})`;
        ctx.lineWidth = 8 * alpha;
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  renderParticles(ctx, particleEngine) {
    particleEngine.particles.forEach(p => {
      const iso = this.toIso(p.x, p.y);
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(iso.x, iso.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });
  }

  renderFloatingTexts(ctx, floatingTexts) {
    floatingTexts.forEach(ft => {
      const iso = this.toIso(ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${Math.floor(14 * (ft.scale || 1.0))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, iso.x, iso.y);
      ctx.fillText(ft.text, iso.x, iso.y);
    });
  }

  renderVignette(ctx, W, H) {
    ctx.save();
    const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.65);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  renderTouchControls(ctx, input, player, W, H) {
    // 1. High-Res Virtual Joystick (Left)
    const joyBase = this.assets.joystickBase;
    const joyKnob = this.assets.joystickKnob;

    if (input.joystick.active) {
      ctx.save();
      const sx = input.joystick.startX;
      const sy = input.joystick.startY;
      const cx = input.joystick.currX;
      const cy = input.joystick.currY;

      // Draw Runic Base Ring
      if (joyBase.loaded) {
        ctx.drawImage(joyBase, sx - 65, sy - 65, 130, 130);
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, input.joystick.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#00ffff';
        ctx.stroke();
      }

      // Draw Glowing Gem Knob
      if (joyKnob.loaded) {
        ctx.drawImage(joyKnob, cx - 25, cy - 25, 50, 50);
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 200, 255, 0.8)';
        ctx.fill();
      }
      ctx.restore();
    } else {
      // Idle guide prompt on left
      ctx.save();
      if (joyBase.loaded) {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(joyBase, 50, H - 150, 110, 110);
        ctx.globalAlpha = 1.0;
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('좌측 화면 드래그: 이동', 105, H - 28);
      ctx.restore();
    }

    // 2. High-Res Action Skill Wheel (Right)
    const sk = player.skillSystem.skills;
    const skillImgs = this.assets.skills;

    // Helper to draw image button with cooldown mask
    const drawSkillBtn = (x, y, r, imgAsset, skillKey, label, cost) => {
      const skill = sk[skillKey];
      ctx.save();

      // Outer glow & border
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1816';
      ctx.fill();
      ctx.strokeStyle = skill.cost > player.mp ? '#666' : '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw high-res skill icon
      if (imgAsset && imgAsset.loaded) {
        ctx.save();
        ctx.clip(); // Clip within circle
        ctx.drawImage(imgAsset, x - r, y - r, r * 2, r * 2);
        ctx.restore();
      } else {
        // Fallback text
        ctx.font = `${Math.floor(r * 0.75)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(skill.icon, x, y + r * 0.28);
      }

      // Cooldown slice overlay
      if (skill.timer > 0 && skill.cooldown > 0) {
        const pct = skill.timer / skill.cooldown;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, false);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(skill.timer.toFixed(1), x, y + 5);
        ctx.shadowBlur = 0;
      }

      // Insufficient MP dark overlay
      if (player.mp < skill.cost) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 50, 150, 0.45)';
        ctx.fill();
      }

      // Name & key label below button
      ctx.fillStyle = '#f0f0f0';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText(label, x, y + r + 12);
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    // Main Slash (Big center-right button)
    drawSkillBtn(W - 90, H - 90, 44, skillImgs.SLASH, 'SLASH', '베기', 0);
    // Whirlwind (1)
    drawSkillBtn(W - 175, H - 80, 28, skillImgs.WHIRLWIND, 'WHIRLWIND', '휠윈드 [1]', sk.WHIRLWIND.cost);
    // Dash (2)
    drawSkillBtn(W - 80, H - 180, 28, skillImgs.DASH, 'DASH', '돌진 [2]', sk.DASH.cost);
    // Ground Slam (3)
    drawSkillBtn(W - 150, H - 150, 28, skillImgs.GROUND_SLAM, 'GROUND_SLAM', '강타 [3]', sk.GROUND_SLAM.cost);
    // War Cry (4)
    drawSkillBtn(W - 225, H - 130, 26, skillImgs.WAR_CRY, 'WAR_CRY', '함성 [4]', sk.WAR_CRY.cost);
  }
}
