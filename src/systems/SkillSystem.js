// Warrior Active Skill System

export class SkillSystem {
  constructor() {
    this.skills = {
      SLASH: {
        id: 'SLASH',
        name: '베기',
        icon: '⚔️',
        cost: 0,
        cooldown: 0.35,
        timer: 0,
        range: 65,
        type: 'MELEE_ARC'
      },
      WHIRLWIND: {
        id: 'WHIRLWIND',
        name: '휠윈드',
        icon: '🌪️',
        cost: 35,
        cooldown: 8.0,
        timer: 0,
        range: 110,
        type: 'AOE_SPIN'
      },
      DASH: {
        id: 'DASH',
        name: '돌진',
        icon: '⚡',
        cost: 20,
        cooldown: 5.5,
        timer: 0,
        speed: 550,
        duration: 0.22,
        type: 'MOBILITY'
      },
      GROUND_SLAM: {
        id: 'GROUND_SLAM',
        name: '지면강타',
        icon: '💥',
        cost: 45,
        cooldown: 10.0,
        timer: 0,
        range: 130,
        type: 'AOE_SLAM'
      },
      WAR_CRY: {
        id: 'WAR_CRY',
        name: '전투함성',
        icon: '📢',
        cost: 30,
        cooldown: 18.0,
        timer: 0,
        duration: 8.0,
        type: 'BUFF'
      }
    };

    // Active buffs on player
    this.activeBuffs = {
      WAR_CRY: 0
    };
  }

  update(dt, cdrPercent = 0) {
    const cdrMult = 1 - Math.min(0.4, cdrPercent / 100);
    for (const key of Object.keys(this.skills)) {
      if (this.skills[key].timer > 0) {
        this.skills[key].timer = Math.max(0, this.skills[key].timer - dt);
      }
    }

    // Update buffs
    for (const buff of Object.keys(this.activeBuffs)) {
      if (this.activeBuffs[buff] > 0) {
        this.activeBuffs[buff] = Math.max(0, this.activeBuffs[buff] - dt);
      }
    }
  }

  canCast(skillId, currentMp) {
    const sk = this.skills[skillId];
    if (!sk) return false;
    return sk.timer <= 0 && currentMp >= sk.cost;
  }

  cast(skillId, cdrPercent = 0) {
    const sk = this.skills[skillId];
    if (!sk) return false;
    const cdrMult = 1 - Math.min(0.4, cdrPercent / 100);
    sk.timer = sk.cooldown * cdrMult;

    if (skillId === 'WAR_CRY') {
      this.activeBuffs.WAR_CRY = sk.duration;
    }
    return true;
  }

  isBuffActive(buffName) {
    return (this.activeBuffs[buffName] || 0) > 0;
  }
}
