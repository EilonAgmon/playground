// Faithfully documented for Mage (height 6, always clears the wall) and
// Archer (height 3). The other four heroes' exact numbers aren't publicly
// documented even across guide sites, so their heights/quirks are reasonable
// class-flavored extrapolations, easy to retune later.
export const HEROES = {
  warrior: { key: "warrior", name: "Warrior", height: 1, rodSize: 3 },
  mage: { key: "mage", name: "Mage", height: 6, rodSize: 3, alwaysHits: true },
  archer: { key: "archer", name: "Archer", height: 3, rodSize: 3 },
  engineer: { key: "engineer", name: "Engineer", height: 2, rodSize: 3, bonusWall: 1 },
  assassin: { key: "assassin", name: "Assassin", height: 1, rodSize: 2 },
  priest: { key: "priest", name: "Priest", height: 4, rodSize: 3, healOnLevelUp: 1 },
};

export const HERO_LIST = Object.values(HEROES);

export const LEVEL_NAMES = ["Bronze", "Silver", "Gold"];
export const XP_PER_LEVEL = 6;
