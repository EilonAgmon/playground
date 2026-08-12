// Cross-verified across multiple guide sources (Gamepur, search-corroborated
// Fandom/CBR/Dexerto summaries) since the three original links wouldn't
// fetch directly. Damage numbers and relative ability identities are as
// researched. Rod sizes (energy-to-act) are HALVED from the researched
// values (originally 4-6) — at the real numbers, an average match ran
// ~120 turns x 4 clicks/turn, clearly tuned for a full RPG side-activity
// rather than a quick web tab. Halving preserves each hero's relative
// speed (Mage/Priest still slowest, Warrior/Assassin still fastest) while
// keeping a match playable in a couple of minutes.
//
// height: "low" = blocked whenever the opponent has any Bulwark (>=1);
// "high" = blocked only by a Bulwark of `blockedBy` or more; ignoresBulwark
// (Assassin) always lands on the Crown regardless of wall height.
export const HEROES = {
  warrior: {
    key: "warrior",
    name: "Warrior",
    rodSize: 2,
    crownDamage: 3,
    bulwarkDamage: 3,
    height: "low",
  },
  mage: {
    key: "mage",
    name: "Mage",
    rodSize: 3,
    crownDamage: 2,
    bulwarkDamage: 2,
    dualShot: true, // low shot (blockable) + a second shot at height 6 (always clears)
  },
  archer: {
    key: "archer",
    name: "Archer",
    rodSize: 3,
    crownDamage: 3,
    bulwarkDamage: 3,
    height: "high",
    blockedBy: 3, // Bulwark >= 3 blocks it
  },
  engineer: {
    key: "engineer",
    name: "Engineer",
    rodSize: 3,
    crownDamage: 1,
    bulwarkDamage: 3,
    height: "low",
    selfBulwarkOnAct: 2,
  },
  assassin: {
    key: "assassin",
    name: "Assassin",
    rodSize: 2,
    crownDamage: 1,
    ignoresBulwark: true,
    delayOnAct: 2, // adds this many notches back onto the opponent's closest-to-firing hero
  },
  priest: {
    key: "priest",
    name: "Priest",
    rodSize: 3,
    crownDamage: 0,
    healOnAct: 1,
    allyEnergyBuffOnAct: 2, // reduces the ally hero's rod by this much
  },
};

export const HERO_LIST = Object.values(HEROES);

export const LEVEL_NAMES = ["Bronze", "Silver", "Gold"];
export const XP_PER_LEVEL = 6;
