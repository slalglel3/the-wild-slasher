// Game Configuration & Constants

export const CONFIG = {
  // Screen & Viewport (Landscape 16:9 base)
  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 540,
  TILE_WIDTH: 48,
  TILE_HEIGHT: 24, // Isometric 2:1 ratio
  
  // Progression & Rebirth
  MAX_LEVEL: 100,
  STAT_POINTS_PER_LEVEL: 5,
  REBIRTH_STAT_BONUS: 25, // Equivalent to 5 levels worth of stats
  FIRST_RUN_DIFFICULTY_CAP: 20, // Max difficulty clearable on run 0
  
  // Job Advancements
  ADVANCEMENT_1_LEVEL: 30,
  ADVANCEMENT_2_LEVEL: 60,
  
  // Classes
  CLASSES: {
    WARRIOR: {
      name: '전사 (Warrior)',
      desc: '강인한 체력과 근접 무기로 적진을 파괴하는 돌격형 투사',
      primaryStat: 'STR',
      baseStats: { STR: 15, DEX: 10, INT: 8, VIT: 14, LUK: 8 },
      advancements1: [
        { id: 'BERSERKER', name: '버서커 (광전사)', bonus: '치명타 및 공격속도 대폭 상승' },
        { id: 'CRUSADER', name: '크루세이더 (성기사)', bonus: '방어력 및 신성 범위 공격력 강화' }
      ]
    },
    ARCHER: {
      name: '궁수 (Archer)',
      desc: '원거리에서 치명적인 화살과 덫으로 적을 유린하는 사냥꾼',
      primaryStat: 'DEX',
      baseStats: { STR: 9, DEX: 16, INT: 10, VIT: 10, LUK: 10 }
    },
    MAGE: {
      name: '마법사 (Mage)',
      desc: '강력한 원소 마법으로 광역 적들을 일거에 소탕하는 현자',
      primaryStat: 'INT',
      baseStats: { STR: 7, DEX: 8, INT: 18, VIT: 9, LUK: 13 }
    },
    ROGUE: {
      name: '도적 (Rogue)',
      desc: '은신과 빠른 연타, 치명타로 단숨에 암살하는 그림자',
      primaryStat: 'LUK',
      baseStats: { STR: 10, DEX: 14, INT: 9, VIT: 9, LUK: 15 }
    }
  },

  // 5 Biomes
  BIOMES: {
    GRASSLAND: {
      id: 'GRASSLAND',
      name: '고요한 초원 (Grassland)',
      ambientColor: '#2d4a22',
      groundColor: '#436d2e',
      altGroundColor: '#395c27',
      objectColor: '#1d3314',
      hazard: null,
      monsterTypes: ['WOLF', 'GOBLIN', 'FOREST_BEAR'],
      boss: 'CHIEF_GOBLIN',
      description: '푸른 풀과 울창한 참나무 숲. 야생 늑대와 도적 고블린이 매복하고 있습니다.'
    },
    DESERT: {
      id: 'DESERT',
      name: '작열의 사막 (Desert)',
      ambientColor: '#8a622a',
      groundColor: '#d6a858',
      altGroundColor: '#be9245',
      objectColor: '#6d4c1b',
      hazard: 'HEATWAVE', // Periodically drains energy / slows
      monsterTypes: ['SCORPION', 'MUMMY', 'SAND_WORM'],
      boss: 'ANUBIS_GUARDIAN',
      description: '끝없는 모래바람과 유적. 열사병과 모래괴물이 도사리고 있습니다.'
    },
    TROPICAL: {
      id: 'TROPICAL',
      name: '독성 정글 (Tropical Swamp)',
      ambientColor: '#153d36',
      groundColor: '#23594e',
      altGroundColor: '#1b473e',
      objectColor: '#0b241f',
      hazard: 'POISON_SWAMP', // Poison puddles
      monsterTypes: ['POISON_SPIDER', 'TOXIC_TOAD', 'JUNGLE_SHAMAN'],
      boss: 'BROOD_MOTHER',
      description: '짙은 독안개와 늪지. 밟으면 중독되는 독 웅덩이가 널려 있습니다.'
    },
    TUNDRA: {
      id: 'TUNDRA',
      name: '혹한의 설원 (Tundra)',
      ambientColor: '#3a506b',
      groundColor: '#b0c4de',
      altGroundColor: '#98afc7',
      objectColor: '#2b3a4a',
      hazard: 'FREEZING', // Chill debuff lowers attack/move speed
      monsterTypes: ['FROST_WOLF', 'YETI', 'ICE_GOLEM'],
      boss: 'FROST_KING',
      description: '만년설과 얼음 절벽. 지독한 한기가 이동과 공격을 둔화시킵니다.'
    },
    VOLCANIC: {
      id: 'VOLCANIC',
      name: '파멸의 화산 (Volcanic)',
      ambientColor: '#4a1515',
      groundColor: '#3a2020',
      altGroundColor: '#4d1e1e',
      objectColor: '#6b1111',
      hazard: 'LAVA_BURST', // Erupting lava tiles dealing burn damage
      monsterTypes: ['FIRE_IMP', 'MAGMA_SLIME', 'HELL_HOUND'],
      boss: 'MAGMA_DRAGON',
      description: '식어가는 현무암과 끓어오르는 마그마. 발을 헛디디면 타오릅니다.'
    }
  },

  // Item Rarities (Diablo style)
  ITEM_RARITY: {
    NORMAL: { id: 'NORMAL', name: '일반', color: '#ffffff', affixCount: 0, mult: 1.0 },
    MAGIC: { id: 'MAGIC', name: '마법', color: '#4d88ff', affixCount: 1, mult: 1.25 },
    RARE: { id: 'RARE', name: '희귀', color: '#ffd700', affixCount: 2, mult: 1.6 },
    LEGENDARY: { id: 'LEGENDARY', name: '전설', color: '#ff7700', affixCount: 3, mult: 2.2 }
  },

  ITEM_SLOTS: ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'AMULET', 'RING']
};
