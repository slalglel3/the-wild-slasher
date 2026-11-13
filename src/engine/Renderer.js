// Isometric 2D Renderer - 'The Wild Darkness' Style with Animations, Minimap, Monsters & World Gate

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
      playerIdle: this.loadImage('./assets/player/warrior_idle.png'),
      playerRun: [
        this.loadImage('./assets/player/run_0.png'),
        this.loadImage('./assets/player/run_1.png'),
        this.loadImage('./assets/player/run_2.png'),
        this.loadImage('./assets/player/run_3.png')
      ],
      playerSlash: [
        this.loadImage('./assets/player/slash_0.png'),
        this.loadImage('./assets/player/slash_1.png'),
        this.loadImage('./assets/player/slash_2.png')
      ],
      // World Props
      tileGrass: this.loadImage('./assets/world/tile_grass.png'),
      propTree: this.loadImage('./assets/world/prop_tree.png'),
      propRock: this.loadImage('./assets/world/prop_rock.png'),
      propGateway: this.loadImage('./assets/world/prop_gateway.png'),
      propChest: this.loadImage('./assets/world/prop_chest.png'),
      // Monsters
      monsters: {
        WOLF: this.loadImage('./assets/monsters/monster_wolf.png'),
        GOBLIN: this.loadImage('./assets/monsters/monster_goblin.png'),
        SCORPION: this.loadImage('./assets/monsters/monster_scorpion.png'),
        IMP: this.loadImage('./assets/monsters/monster_imp.png'),
        BOSS: this.loadImage('./assets/monsters/monster_boss.png')
      },
      // Equipment Item Icons
      items: {
        WEAPON: this.loadImage('./assets/items/item_weapon.png'),
        ARMOR: this.loadImage('./assets/items/item_armor.png'),
        HELMET: this.loadImage('./assets/items/item_helmet.png'),
        BOOTS: this.loadImage('./assets/items/item_boots.png'),
        AMULET: this.loadImage('./assets/items/item_amulet.png'),
        RING: this.loadImage('./assets/items/item_ring.png')
      },
      // UI
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

    // 2. Render Isometric Ground Tiles & Obstacles
    this.renderTileMap(ctx, game.map, biome, camX, camY, W, H);

    // 3. Render World Gateway (Path to Next World) & Chests
    this.renderGatewayAndChests(ctx, game);

    // 4. Collect & Y-Sort Entities (Player, Monsters, Items)
    const renderList = [];

    game.dropItems.forEach(item => {
      const iso = this.toIso(item.x, item.y);
      renderList.push({ type: 'ITEM', obj: item, isoY: iso.y, isoX: iso.x });
    });

    game.monsters.forEach(m => {
      if (m.alive) {
        const iso = this.toIso(m.x, m.y);
        renderList.push({ type: 'MONSTER', obj: m, isoY: iso.y, isoX: iso.x });
      }
    });

    if (!player.isDead) {
      renderList.push({ type: 'PLAYER', obj: player, isoY: pIso.y, isoX: pIso.x });
    }

    renderList.sort((a, b) => a.isoY - b.isoY);

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

    // 8. Dark Vignette / Atmospheric Fog
    this.renderVignette(ctx, W, H);

    // 9. Interactive Radar Minimap (Top-Right)
    this.renderMinimap(ctx, game, W, H);

    // 10. Mobile Touch HUD & Virtual Controls
    this.renderTouchControls(ctx, game.input, player, W, H);
  }

  renderTileMap(ctx, map, biome, camX, camY, W, H) {
    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;
    const grassImg = this.assets.tileGrass;
    const treeImg = this.assets.propTree;
    const rockImg = this.assets.propRock;

    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const isoX = (c - r) * halfW;
        const isoY = (c + r) * halfH;

        if (isoX + halfW < camX - 70 || isoX - halfW > camX + W + 70 ||
            isoY + halfH < camY - 110 || isoY - halfH > camY + H + 70) {
          continue;
        }

        const tileType = map.grid[r][c];

        // Ground Tile
        if (biome.id === 'GRASSLAND' && grassImg.loaded) {
          ctx.drawImage(grassImg, isoX - halfW, isoY - halfH, this.tileW, this.tileH + 12);
        } else {
          ctx.beginPath();
          ctx.moveTo(isoX, isoY - halfH);
          ctx.lineTo(isoX + halfW, isoY);
          ctx.lineTo(isoX, isoY + halfH);
          ctx.lineTo(isoX - halfW, isoY);
          ctx.closePath();

          if (tileType === 3) {
            ctx.fillStyle = biome.hazard === 'POISON_SWAMP' ? '#3d9970' :
                            biome.hazard === 'LAVA_BURST' ? '#ff4136' :
                            biome.hazard === 'FREEZING' ? '#7fdbff' : '#e08a1e';
            ctx.fill();
            ctx.strokeStyle = '#ffffff22';
            ctx.stroke();
          } else {
            ctx.fillStyle = (r + c) % 2 === 0 ? biome.groundColor : biome.altGroundColor;
            ctx.fill();
            ctx.strokeStyle = '#00000015';
            ctx.stroke();
          }
        }

        // Obstacles (Trees / Rocks)
        if (tileType === 1) {
          const isRock = (r * 7 + c * 13) % 4 === 0;
          if (isRock && rockImg.loaded) {
            ctx.drawImage(rockImg, isoX - 22, isoY - 26, 44, 38);
          } else if (treeImg.loaded) {
            ctx.drawImage(treeImg, isoX - 36, isoY - 76, 72, 82);
          } else {
            ctx.fillStyle = biome.objectColor;
            ctx.fillRect(isoX - 10, isoY - halfH - 18, 20, 20);
          }
        }
      }
    }
  }

  renderGatewayAndChests(ctx, game) {
    const map = game.map;
    const halfW = this.tileW / 2;
    const halfH = this.tileH / 2;
    const gateImg = this.assets.propGateway;
    const chestImg = this.assets.propChest;

    // World Highway Gateway (Path to Next World)
    const gIsoX = (map.portalPos.c - map.portalPos.r) * halfW;
    const gIsoY = (map.portalPos.c + map.portalPos.r) * halfH;

    ctx.save();
    if (gateImg.loaded) {
      // Draw massive ancient stone archway road gate
      ctx.drawImage(gateImg, gIsoX - 48, gIsoY - 95, 96, 106);
    }

    // Portal Highway Road Glow
    const roadColor = game.bossDefeated ? '#00ffff' : '#ff4444';
    ctx.beginPath();
    ctx.ellipse(gIsoX, gIsoY, 40, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = game.bossDefeated ? 'rgba(0, 255, 255, 0.25)' : 'rgba(255, 68, 68, 0.2)';
    ctx.fill();
    ctx.strokeStyle = roadColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(game.bossDefeated ? '★ 다음 월드로 통하는 길 (진입 가능) ★' : '봉인된 관문 (보스 토벌 필요)', gIsoX, gIsoY - 105);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Chests
    map.chests.forEach(ch => {
      const cIsoX = (ch.c - ch.r) * halfW;
      const cIsoY = (ch.c + ch.r) * halfH;
      if (chestImg.loaded) {
        ctx.drawImage(chestImg, cIsoX - 18, cIsoY - 24, 36, 36);
      } else {
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(cIsoX - 10, cIsoY - 14, 20, 14);
      }
    });
  }

  // Draw Player with Center-Pivot Whirlwind & Precise Run Animation
  drawPlayer(ctx, player, isoX, isoY) {
    ctx.save();

    // Motion Trails during Dash
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

    const isMoving = Math.hypot(player.vx, player.vy) > 10;
    const isSlashing = player.slashAnimTimer > 0;
    const isWhirlwind = player.whirlwindTimer > 0;

    // Body Bob
    const bob = isMoving ? Math.abs(Math.sin(player.animTime * 14)) * 4 : Math.sin(player.animTime * 3) * 1.5;
    const bodyY = isoY - bob;

    // Frame Selection
    let currentSprite = this.assets.playerIdle;
    let sw = 50;
    let sh = 70;

    if (isSlashing) {
      const slashProgress = 1 - (player.slashAnimTimer / 0.22);
      const frameIdx = Math.min(2, Math.max(0, Math.floor(slashProgress * 3)));
      const slashSprite = this.assets.playerSlash[frameIdx];
      if (slashSprite && slashSprite.loaded) {
        currentSprite = slashSprite;
        sw = frameIdx === 1 ? 80 : 54;
        sh = 72;
      }
    } else if (isMoving) {
      // 4-Frame Dynamic Run Cycle
      const runSprite = this.assets.playerRun[player.runFrame % 4];
      if (runSprite && runSprite.loaded) {
        currentSprite = runSprite;
        sw = 50;
        sh = 72;
      }
    }

    // ★ FIXED: Whirlwind Center-Pivot Rotation!
    // Translate to center of body (-sh/2) so character spins like a top, NOT like a windmill!
    ctx.translate(isoX, bodyY - sh / 2);
    ctx.scale(player.facing, 1);

    if (isWhirlwind) {
      ctx.rotate(player.animTime * 28);
    }

    if (player.invincibleTimer > 0) {
      ctx.filter = 'brightness(1.5) drop-shadow(0 0 5px #ff4444)';
    }

    if (currentSprite && currentSprite.loaded) {
      // Draw centered around (0, 0)
      ctx.drawImage(currentSprite, -sw / 2, -sh / 2, sw, sh);
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

  // Draw Monster with Sprite Assets
  drawMonster(ctx, m, isoX, isoY) {
    ctx.save();

    // Shadow
    ctx.beginPath();
    ctx.ellipse(isoX, isoY, m.radius * 0.9, m.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    const bob = Math.abs(Math.sin(m.animTime * 8)) * 3;
    const bodyY = isoY - bob;

    ctx.translate(isoX, bodyY);
    ctx.scale(m.facing, 1);

    if (m.hurtTimer > 0) {
      ctx.filter = 'brightness(2.0)';
    }

    // Pick sprite based on monster key
    const monsterSprites = this.assets.monsters;
    let sprite = null;
    let mw = 44, mh = 48;

    if (m.isBoss) {
      sprite = monsterSprites.BOSS;
      mw = 68; mh = 84;
    } else if (m.key.includes('WOLF')) {
      sprite = monsterSprites.WOLF;
      mw = 54; mh = 44;
    } else if (m.key.includes('SCORPION')) {
      sprite = monsterSprites.SCORPION;
      mw = 48; mh = 46;
    } else if (m.key.includes('IMP')) {
      sprite = monsterSprites.IMP;
      mw = 36; mh = 46;
    } else {
      sprite = monsterSprites.GOBLIN;
      mw = 40; mh = 50;
    }

    if (sprite && sprite.loaded) {
      ctx.drawImage(sprite, -mw / 2, -mh, mw, mh);
    } else {
      // Fallback
      ctx.fillStyle = m.isBoss ? '#8b0000' : '#556b2f';
      ctx.beginPath();
      ctx.arc(0, -m.radius, m.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Monster HP Bar & Level
    const hpPct = Math.max(0, m.hp / m.maxHp);
    const barW = m.isBoss ? 64 : 30;
    ctx.fillStyle = '#222';
    ctx.fillRect(isoX - barW / 2, isoY - mh - 12, barW, 4);
    ctx.fillStyle = m.isBoss ? '#ff1111' : '#ffaa00';
    ctx.fillRect(isoX - barW / 2, isoY - mh - 12, Math.max(0, barW * hpPct), 4);

    if (m.isBoss) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.name, isoX, isoY - mh - 16);
    }
  }

  // Draw Drop Item with Slot Icon
  drawDropItem(ctx, drop, isoX, isoY) {
    const item = drop.item;
    const bounce = Math.abs(Math.sin(drop.life * 5)) * 6;
    const iy = isoY - bounce;

    ctx.save();
    // Diablo Vertical Loot Beam
    const grad = ctx.createLinearGradient(isoX, iy, isoX, iy - 50);
    grad.addColorStop(0, item.color + 'aa');
    grad.addColorStop(1, item.color + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(isoX - 3, iy - 50, 6, 50);

    // Render Equipment Icon
    const iconImg = this.assets.items[item.slot];
    if (iconImg && iconImg.loaded) {
      ctx.drawImage(iconImg, isoX - 14, iy - 28, 28, 28);
    } else {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(isoX, iy - 14, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Name Tag
    ctx.fillStyle = '#000000cc';
    ctx.fillRect(isoX - 36, iy - 42, 72, 13);
    ctx.fillStyle = item.color;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.name, isoX, iy - 32);
    ctx.restore();
  }

  // Interactive Radar Minimap (110x110)
  renderMinimap(ctx, game, W, H) {
    const map = game.map;
    const player = game.player;
    if (!map) return;

    ctx.save();
    const mmSize = 100;
    const mmX = W - mmSize - 12;
    const mmY = 56;

    // Minimap Outer Circular Frame
    ctx.beginPath();
    ctx.arc(mmX + mmSize / 2, mmY + mmSize / 2, mmSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.clip(); // Clip contents within circle

    const scale = mmSize / (map.cols * 32);

    // Draw Next World Gateway icon (Green)
    const gx = mmX + (map.portalPos.c * 32) * scale;
    const gy = mmY + (map.portalPos.r * 32) * scale;
    ctx.fillStyle = game.bossDefeated ? '#00ffff' : '#ff4444';
    ctx.beginPath();
    ctx.arc(gx, gy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw Monsters (Red dots)
    ctx.fillStyle = '#ff3333';
    game.monsters.forEach(m => {
      if (m.alive) {
        const mx = mmX + m.x * scale;
        const my = mmY + m.y * scale;
        ctx.beginPath();
        ctx.arc(mx, my, m.isBoss ? 4.5 : 2, 0, Math.PI * 2);
        if (m.isBoss) ctx.fillStyle = '#ffff00';
        ctx.fill();
        ctx.fillStyle = '#ff3333';
      }
    });

    // Draw Player (Yellow Arrow/Dot)
    const px = mmX + player.x * scale;
    const py = mmY + player.y * scale;
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Minimap Title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('미니맵', mmX + mmSize / 2, mmY + mmSize + 11);
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

      if (joyBase.loaded) {
        ctx.drawImage(joyBase, sx - 65, sy - 65, 130, 130);
      }
      if (joyKnob.loaded) {
        ctx.drawImage(joyKnob, cx - 25, cy - 25, 50, 50);
      }
      ctx.restore();
    } else {
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

    const drawSkillBtn = (x, y, r, imgAsset, skillKey, label, cost) => {
      const skill = sk[skillKey];
      ctx.save();

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1816';
      ctx.fill();
      ctx.strokeStyle = skill.cost > player.mp ? '#666' : '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (imgAsset && imgAsset.loaded) {
        ctx.save();
        ctx.clip();
        ctx.drawImage(imgAsset, x - r, y - r, r * 2, r * 2);
        ctx.restore();
      }

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

      if (player.mp < skill.cost) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 50, 150, 0.45)';
        ctx.fill();
      }

      ctx.fillStyle = '#f0f0f0';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText(label, x, y + r + 12);
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    drawSkillBtn(W - 90, H - 90, 44, skillImgs.SLASH, 'SLASH', '베기', 0);
    drawSkillBtn(W - 175, H - 80, 28, skillImgs.WHIRLWIND, 'WHIRLWIND', '휠윈드 [1]', sk.WHIRLWIND.cost);
    drawSkillBtn(W - 80, H - 180, 28, skillImgs.DASH, 'DASH', '돌진 [2]', sk.DASH.cost);
    drawSkillBtn(W - 150, H - 150, 28, skillImgs.GROUND_SLAM, 'GROUND_SLAM', '강타 [3]', sk.GROUND_SLAM.cost);
    drawSkillBtn(W - 225, H - 130, 26, skillImgs.WAR_CRY, 'WAR_CRY', '함성 [4]', sk.WAR_CRY.cost);
  }
}
