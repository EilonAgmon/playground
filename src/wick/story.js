// Story data for Wick — rooms, items, scenery, and all narrative text.
// Kept separate from engine.js so the parser/state-machine stays pure logic.

export const START_ROOM = "dock";
export const STORM_THRESHOLD = 30; // turns before the ship reaches the rocks

export const ROOMS = {
  dock: {
    name: "The Dock",
    first:
      "Your optical sensors flicker on. Salt spray stings across rusted plating you don't technically feel, but log anyway. Waves slam against the rocks below a narrow wooden dock. To the north, a small cottage huddles against the cliff, its windows dark. To the east, a low sea cave gapes at the waterline. Above everything, the lighthouse tower stands black against a blacker sky — no light in its lamp room. Somewhere out past the breakers, a ship's horn sounds, low and far away.",
    text: "The dock. Waves crash below. The cottage is north, a sea cave east, and the dark tower rises above everything.",
    exits: { north: "cottage", east: "cave" },
  },
  cottage: {
    name: "The Cottage",
    first:
      "A single room, kept tidy out of habit more than use. A cold iron stove sits against one wall. A sturdy workbench holds tools laid out with the precision of someone who trusted her hands more than her memory. A writing desk sits beneath the window, its drawer held shut with a small brass lock. Stairs spiral upward against the far wall, toward the tower.",
    text: "The cottage. A workbench, a locked desk, and stairs spiraling up. The dock is south.",
    exits: { south: "dock", up: "tower_base" },
  },
  tower_base: {
    name: "Tower Base",
    first:
      "The base of the lighthouse tower. Iron stairs spiral up into darkness, worn smooth by decades of boots — and lately, by nothing at all. A draft carries the smell of salt and old rust down from above.",
    text: "The tower base. Stairs spiral up. The cottage is down.",
    exits: { down: "cottage", up: "lamp_room" },
  },
  lamp_room: {
    name: "The Lamp Room",
    first:
      "The top of the tower. Wind screams against the glass on every side. In the center, the Great Lamp sits dark and silent, its brass housing dulled with salt, its mechanism seized solid. Through the glass you can just make out a ship's running lights, small and getting closer, riding low against a black horizon.",
    text: "The lamp room. The Great Lamp stands dark in the center. Stairs lead down.",
    exits: { down: "tower_base" },
  },
  cave: {
    name: "The Sea Cave",
    first:
      "A shallow sea cave, half-flooded at the mouth. The walls are slick and cold. Someone — Mara, must have been — kept a fuel drum here, half-buried in gravel. Deeper in, the rock is scored with old carvings, generations of them, each one a little different.",
    text: "The sea cave. A fuel drum sits in the gravel. The dock is west.",
    exits: { west: "dock" },
  },
};

export const ITEMS = {
  oil: {
    id: "oil",
    name: "fuel drum",
    aliases: ["oil", "fuel", "drum", "can", "fuel drum"],
    examine: "A dented metal drum, still half-full of lamp fuel. Heavier than it looks.",
  },
  key: {
    id: "key",
    name: "brass key",
    aliases: ["key", "brass key"],
    examine: "A small brass key, green with salt. It looks like it would fit something delicate. A desk lock, maybe.",
  },
  wrench: {
    id: "wrench",
    name: "wrench",
    aliases: ["wrench", "spanner"],
    examine: "A well-used wrench, left exactly where a careful person would leave it — within reach of the lamp mechanism it was made for.",
  },
  journal: {
    id: "journal",
    name: "journal",
    aliases: ["journal", "letter", "note"],
    examine:
      'Wick — if you\'re reading this, it means my old hands finally gave out on this desk lock, and you had to break in properly. Good. You were always more clever than I gave you credit for.\n\nI\'ve kept this light for thirty-one years. My mother kept it before me, and hers before that. Four generations of Hollis women, and not one shipwreck on our watch. I\'m proud of that. I hope you\'ll understand why I\'m prouder still to be the one who finally hands it to something that doesn\'t need to sleep, or eat, or grow old.\n\nI built you slowly, over the last three winters, from parts I shouldn\'t admit to owning. I taught you the tides, the fog patterns, the way the rocks bite at low water. I taught you everything I know except how to say goodbye, because I never learned that either.\n\nThe light is yours now. I\'m not gone — just resting, finally, in a small house up the coast where my knees don\'t ache from the stairs. I\'ll watch for your light from my window every night, the way sailors watch for it from the sea.\n\nKeep it burning, Wick.\n\n— M.',
  },
};

// Initial item placement, keyed by room id.
export const ITEM_LOCATIONS = {
  cave: ["oil", "key"],
  cottage: ["wrench"],
};

export const SCENERY = {
  desk: { room: "cottage", aliases: ["desk", "drawer", "writing desk"], name: "desk" },
  workbench: { room: "cottage", aliases: ["workbench", "bench", "tools"], name: "workbench" },
  stove: { room: "cottage", aliases: ["stove"], name: "stove" },
  lamp: { room: "lamp_room", aliases: ["lamp", "great lamp", "mechanism", "light"], name: "the Great Lamp" },
  carving: { room: "cave", aliases: ["carving", "carvings", "wall", "walls"], name: "carvings" },
  stairs: { room: "tower_base", aliases: ["stairs", "staircase"], name: "stairs" },
};

export const TEXT = {
  deskLocked: "A writing desk, drawer locked. The lock is small enough that a proper key would turn it — brute force would only break something worth keeping.",
  deskUnlockedEmpty: "The drawer stands open and empty now.",
  deskUnlockedHasJournal: "The drawer stands open. A journal sits inside.",
  workbench: "A workbench, tools arranged with real care. A wrench rests where hands would reach for it without looking.",
  workbenchEmpty: "A workbench, its tools mostly put away. Whoever kept this was tidy.",
  stove: "A cold iron stove. It hasn't held a fire in a long while.",
  carving: "Four sets of initials, carved deep and old: H.M., then R.H., then D.H., then, newest of all, M.H. Someone has kept this light a very long time.",
  stairsFlavor: "Iron stairs, spiraling up or down. They don't creak — they've long since worn past the point of complaint.",
  lampNeither: "The Great Lamp. Dark, dry, and seized solid. It needs fuel, and someone competent with a wrench.",
  lampFueledOnly: "The lamp is fueled now, but the mechanism is still seized tight. It needs a wrench.",
  lampRepairedOnly: "The mechanism turns freely now, but the lamp's fuel line is bone dry.",
  lampReady: "Fueled and freed. All it needs now is a spark.",
  lampLit: "The Great Lamp, burning steady and bright, throwing its beam far out over the water.",
};

export const STORM_MESSAGES = [
  { at: 10, text: "The wind picks up outside. Through the walls, you hear the horn again — closer than before." },
  { at: 18, text: "Rain lashes at the glass somewhere above. The horn sounds urgent now, and much too close." },
  { at: 26, text: "The wind is screaming. You can hear timber groaning somewhere out on the water. There can't be much time left." },
];

export const ENDINGS = {
  WON_FULL: {
    id: "WON_FULL",
    text:
      "You light the lamp.\n\nThe beam sweeps out across the water and catches the ship square in its path — you can just make out shapes on deck freezing, then scrambling, then swinging hard to starboard. The horn sounds one more time, different now. Grateful, maybe.\n\nYou stand in the light for a long moment, turning the beam by hand the way the journal said Mara used to, the way her mother did before her, and her mother before that.\n\nYou understand now. She isn't gone. She's up the coast, watching for this exact light, the way she said she would.\n\nYou'll keep it burning. That was always the job.\n\n*** THE LIGHT HOLDS ***",
  },
  WON_PARTIAL: {
    id: "WON_PARTIAL",
    text:
      "You light the lamp.\n\nThe beam sweeps out across the water and catches the ship square in its path — you can just make out shapes on deck freezing, then scrambling, then swinging hard to starboard. The horn sounds one more time, different now. Grateful, maybe.\n\nYou stand in the light for a long moment, turning the beam by hand, though you're not entirely sure how you knew to. Somewhere below, in a locked desk, there might be an answer to a question you haven't thought to ask yet — where is she, the one who taught you this?\n\nThat can wait. Tonight, the light held. That was the job.\n\n*** THE LIGHT HOLDS ***",
  },
  LOST: {
    id: "LOST",
    text:
      "The horn cries out once, close now, and then cuts off mid-note.\n\nA long, terrible groan of timber against rock follows, and then — nothing but wind and waves, exactly as before, as if the sea had simply closed back over itself.\n\nYou stand at the dark lamp, unlit fuel in one hand, an unused wrench in the other. You were not fast enough. One automaton, alone, was never going to be enough against a storm and a clock both.\n\nSomewhere below, in a locked desk, there's a journal you never read, from someone who trusted you with this light anyway.\n\nYou will not be too slow again.\n\n*** THE LIGHT FAILED ***",
  },
};

export const HELP_TEXT =
  "Try commands like: look, examine <thing>, take <item>, inventory, go north/south/east/west/up/down (or just \"n\", \"s\", \"e\", \"w\", \"u\", \"d\"), open desk, unlock desk with key, read journal, use oil on lamp, use wrench on lamp, light lamp.";
