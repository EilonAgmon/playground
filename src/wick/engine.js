// Wick — pure parser/state-machine engine. No DOM, no timers: given a state
// and a line of input, returns the next state and the lines of output to
// print. The React layer (WickApp.jsx) owns rendering and the scroll-back.

import {
  ROOMS,
  ITEMS,
  ITEM_LOCATIONS,
  SCENERY,
  TEXT,
  STORM_MESSAGES,
  STORM_THRESHOLD,
  ENDINGS,
  HELP_TEXT,
  START_ROOM,
} from "./story.js";

const DIRECTIONS = {
  n: "north",
  north: "north",
  s: "south",
  south: "south",
  e: "east",
  east: "east",
  w: "west",
  west: "west",
  u: "up",
  up: "up",
  d: "down",
  down: "down",
};

const VERB_ALIASES = {
  go: "go",
  move: "go",
  walk: "go",
  head: "go",
  enter: "go",
  climb: "go",
  look: "look",
  l: "look",
  examine: "examine",
  x: "examine",
  inspect: "examine",
  read: "examine",
  search: "examine",
  check: "examine",
  peek: "examine",
  peer: "examine",
  take: "take",
  get: "take",
  grab: "take",
  pick: "take",
  drop: "drop",
  discard: "drop",
  leave: "drop",
  inventory: "inventory",
  i: "inventory",
  inv: "inventory",
  open: "open",
  close: "close",
  shut: "close",
  unlock: "unlock",
  use: "use",
  fill: "use",
  pour: "use",
  apply: "use",
  put: "use",
  fuel: "fuel",
  refuel: "fuel",
  fix: "fix",
  repair: "fix",
  mend: "fix",
  light: "light",
  ignite: "light",
  help: "help",
  hint: "help",
  status: "status",
  listen: "wait",
  wait: "wait",
  score: "score",
  again: "again",
  g: "again",
};

const FLAVOR = {
  smell: "You extend an olfactory sensor, for what little good it does. Salt, rust, and rain.",
  sniff: "@smell",
  touch: "Cold, wet, or rusted, depending what you're standing near. Riveting stuff.",
  feel: "@touch",
  push: "You push. Nothing of consequence happens.",
  shove: "@push",
  pull: "You pull. Still nothing of consequence.",
  pry: "@break",
  force: "@break",
  knock: "You knock. Nobody answers. You didn't really expect them to.",
  break: "You could, probably. You don't. Whatever's here isn't yours to break.",
  smash: "@break",
  kick: "You kick something, harmlessly. It's not that kind of night.",
  jump: "You hop in place, servos whirring. Riveting.",
  shout: "Your vocal unit isn't built for it, but you try anyway. The wind eats the sound whole.",
  yell: "@shout",
  sing: "You produce a sound approximating song. Somewhere, a gull reconsiders its life choices.",
  dance: "You attempt a small, dignified dance. There's no one to see it. You do it anyway.",
  pray: "You're not sure automatons are built for prayer, but you hold still a moment, just in case.",
  wave: "You wave. Nobody waves back. Whoever's out there is probably busy.",
  eat: "You don't eat. That was rather the point of you.",
  drink: "You don't drink either. Point still stands.",
  talk: "You talk to yourself for a moment. It doesn't help, but it doesn't not help either.",
  speak: "@talk",
  sleep: "You power down for a moment longer than blinking. The storm doesn't wait for you to rest.",
  rest: "@sleep",
};

const META_FLAVOR = {
  quit: "Not yet. There's a ship out there, and only one of you to save it.",
  exit: "@quit",
  save: "Wick doesn't need a save file. Just don't be too slow.",
  restore: "@save",
  load: "@save",
  credits: "Wick — written in the spirit of the old two-word parser games. No score to chase, just a storm.",
  about: "@credits",
  yes: "Wick doesn't have anyone to say yes to. Yet.",
  no: "Noted. Wick proceeds regardless.",
  ok: "@yes",
  okay: "@yes",
};

const FILLER = new Set(["the", "a", "an", "at", "to", "my"]);
const PREPOSITIONS = ["on", "in", "with", "into"];

function tokenize(input) {
  return input
    .toLowerCase()
    .replace(/[.!?]/g, "")
    .replace(/,/g, " , ")
    .split(/\s+/)
    .filter(Boolean);
}

function stripFiller(tokens) {
  return tokens.filter((t) => !FILLER.has(t));
}

function stripFromClause(tokens) {
  const idx = tokens.indexOf("from");
  return idx === -1 ? tokens : tokens.slice(0, idx);
}

function splitConjunctions(tokens) {
  const segments = [];
  let current = [];
  for (const t of tokens) {
    if (t === "and" || t === ",") {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length) segments.push(current);
  return segments;
}

function matchAlias(tokens, aliasLists) {
  const clean = (tokens || []).filter((t) => t !== ",");
  if (clean.length === 0) return undefined;
  const phrase = clean.join(" ");
  for (const { id, aliases } of aliasLists) {
    if (aliases.includes(phrase)) return id;
  }
  const last = clean[clean.length - 1];
  for (const { id, aliases } of aliasLists) {
    if (aliases.includes(last)) return id;
  }
  return undefined;
}

function resolveItem(tokens) {
  if (!tokens || tokens.length === 0) return undefined;
  const list = Object.values(ITEMS).map((i) => ({ id: i.id, aliases: i.aliases }));
  return matchAlias(tokens, list);
}

function resolveScenery(tokens) {
  if (!tokens || tokens.length === 0) return undefined;
  const list = Object.entries(SCENERY).map(([id, s]) => ({ id, aliases: s.aliases }));
  return matchAlias(tokens, list);
}

function resolveFlavorText(map, key) {
  let value = map[key];
  const seen = new Set();
  while (typeof value === "string" && value.startsWith("@")) {
    const nextKey = value.slice(1);
    if (seen.has(nextKey)) break;
    seen.add(nextKey);
    value = map[nextKey];
  }
  return value;
}

function nameOf(id) {
  if (ITEMS[id]) return ITEMS[id].name;
  if (SCENERY[id]) return SCENERY[id].name;
  return id;
}

export function createInitialState() {
  const roomItems = {};
  for (const roomId of Object.keys(ROOMS)) roomItems[roomId] = [];
  for (const [roomId, ids] of Object.entries(ITEM_LOCATIONS)) {
    roomItems[roomId] = [...ids];
  }
  return {
    room: START_ROOM,
    visited: [START_ROOM],
    inventory: [],
    roomItems,
    deskUnlocked: false,
    fueled: false,
    repaired: false,
    lit: false,
    readJournal: false,
    turns: 0,
    lastCommand: null,
    ended: null,
  };
}

function describeRoomItems(state, roomId) {
  const ids = state.roomItems[roomId] || [];
  if (ids.length === 0) return "";
  const names = ids.map((id) => ITEMS[id].name);
  if (names.length === 1) return `You can see a ${names[0]} here.`;
  return `You can see ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} here.`;
}

export function describeRoom(state, roomId, firstVisit) {
  const room = ROOMS[roomId];
  const lines = [room.name.toUpperCase()];
  lines.push(firstVisit ? room.first : room.text);
  const extra = describeRoomItems(state, roomId);
  if (extra) lines.push(extra);
  return lines.join("\n");
}

function describeScenery(state, sceneryId) {
  if (sceneryId === "desk") {
    if (!state.deskUnlocked) return TEXT.deskLocked;
    const hasJournal = (state.roomItems.cottage || []).includes("journal");
    return hasJournal ? TEXT.deskUnlockedHasJournal : TEXT.deskUnlockedEmpty;
  }
  if (sceneryId === "workbench") {
    const hasWrench = (state.roomItems.cottage || []).includes("wrench");
    return hasWrench ? TEXT.workbench : TEXT.workbenchEmpty;
  }
  if (sceneryId === "lamp") {
    if (state.lit) return TEXT.lampLit;
    if (state.fueled && state.repaired) return TEXT.lampReady;
    if (state.fueled) return TEXT.lampFueledOnly;
    if (state.repaired) return TEXT.lampRepairedOnly;
    return TEXT.lampNeither;
  }
  const entry = SCENERY[sceneryId];
  if (entry.textByRoom && entry.textByRoom[state.room]) return entry.textByRoom[state.room];
  if (entry.text) return entry.text;
  return "Nothing special.";
}

function handleGo(state, dirWord) {
  const room = ROOMS[state.room];
  const dest = room.exits[dirWord];
  if (!dest) {
    return { state, lines: ["You can't go that way."] };
  }
  const firstVisit = !state.visited.includes(dest);
  const next = {
    ...state,
    room: dest,
    visited: firstVisit ? [...state.visited, dest] : state.visited,
  };
  return { state: next, lines: [describeRoom(next, dest, firstVisit)] };
}

function handleLook(state, rest) {
  if (rest.length === 0) {
    return { state, lines: [describeRoom(state, state.room, false)] };
  }
  return handleExamine(state, rest);
}

function examineOne(state, rest) {
  if (rest.length === 0) {
    return { state, lines: [describeRoom(state, state.room, false)] };
  }

  const cleaned = stripFromClause(rest);
  const phrase = cleaned.join(" ");

  if (["me", "myself", "wick", "self"].includes(phrase)) {
    return {
      state,
      lines: [
        "A compact maintenance automaton, salt-scoured and a little dented. Four thin manipulator limbs, a lensed sensor cluster for a head. You've done worse jobs than this one.",
      ],
    };
  }

  if (["inventory", "my inventory", "items", "my items"].includes(phrase)) {
    return handleInventory(state);
  }

  if (["room", "area", "here", "around", "surroundings"].includes(phrase)) {
    return { state, lines: [describeRoom(state, state.room, false)] };
  }

  const invItem = resolveItem(cleaned);
  if (invItem) {
    const inInventory = state.inventory.includes(invItem);
    const inRoom = (state.roomItems[state.room] || []).includes(invItem);
    if (inInventory || inRoom) {
      const item = ITEMS[invItem];
      if (invItem === "journal") {
        return { state: { ...state, readJournal: true }, lines: [item.examine] };
      }
      return { state, lines: [item.examine] };
    }
  }

  const sceneryId = resolveScenery(cleaned);
  if (sceneryId && SCENERY[sceneryId].rooms.includes(state.room)) {
    return { state, lines: [describeScenery(state, sceneryId)] };
  }

  const room = ROOMS[state.room];
  if (phrase === state.room || room.name.toLowerCase().includes(phrase)) {
    return { state, lines: [describeRoom(state, state.room, false)] };
  }

  return { state, lines: [`You don't see a "${phrase}" here.`] };
}

function handleExamine(state, rest) {
  const segments = splitConjunctions(rest);
  if (segments.length > 1) {
    let cur = state;
    const lines = [];
    for (const seg of segments) {
      const r = examineOne(cur, seg);
      cur = r.state;
      lines.push(...r.lines);
    }
    return { state: cur, lines };
  }
  return examineOne(state, rest);
}

function takeOne(state, rest) {
  const cleaned = stripFromClause(rest);
  const phrase = cleaned.join(" ");
  const itemId = resolveItem(cleaned);
  if (!itemId) {
    return { state, lines: [`You don't see a "${phrase}" here.`] };
  }
  if (state.inventory.includes(itemId)) {
    return { state, lines: ["You already have that."] };
  }
  const inRoom = (state.roomItems[state.room] || []).includes(itemId);
  if (!inRoom) {
    return { state, lines: [`You don't see a "${phrase}" here.`] };
  }
  const next = {
    ...state,
    inventory: [...state.inventory, itemId],
    roomItems: {
      ...state.roomItems,
      [state.room]: state.roomItems[state.room].filter((i) => i !== itemId),
    },
  };
  return { state: next, lines: [`You take the ${ITEMS[itemId].name}.`] };
}

function handleTake(state, rest) {
  if (rest.length === 0) return { state, lines: ["Take what?"] };
  const phrase = rest.join(" ");

  if (["all", "everything"].includes(phrase)) {
    const ids = state.roomItems[state.room] || [];
    if (ids.length === 0) return { state, lines: ["There's nothing here to take."] };
    const names = ids.map((id) => ITEMS[id].name);
    const next = {
      ...state,
      inventory: [...state.inventory, ...ids],
      roomItems: { ...state.roomItems, [state.room]: [] },
    };
    return { state: next, lines: [`You take the ${names.join(" and the ")}.`] };
  }

  const segments = splitConjunctions(rest);
  if (segments.length > 1) {
    let cur = state;
    const lines = [];
    for (const seg of segments) {
      const r = takeOne(cur, seg);
      cur = r.state;
      lines.push(...r.lines);
    }
    return { state: cur, lines };
  }

  return takeOne(state, rest);
}

function dropOne(state, rest) {
  const itemId = resolveItem(rest);
  if (!itemId || !state.inventory.includes(itemId)) {
    return { state, lines: ["You're not carrying that."] };
  }
  const next = {
    ...state,
    inventory: state.inventory.filter((i) => i !== itemId),
    roomItems: {
      ...state.roomItems,
      [state.room]: [...(state.roomItems[state.room] || []), itemId],
    },
  };
  return { state: next, lines: [`You set down the ${ITEMS[itemId].name}.`] };
}

function handleDrop(state, rest) {
  if (rest.length === 0) return { state, lines: ["Drop what?"] };
  const segments = splitConjunctions(rest);
  if (segments.length > 1) {
    let cur = state;
    const lines = [];
    for (const seg of segments) {
      const r = dropOne(cur, seg);
      cur = r.state;
      lines.push(...r.lines);
    }
    return { state: cur, lines };
  }
  return dropOne(state, rest);
}

function handleInventory(state) {
  if (state.inventory.length === 0) {
    return { state, lines: ["You're not carrying anything."], noTurn: true };
  }
  const names = state.inventory.map((id) => ITEMS[id].name);
  return { state, lines: [`You're carrying: ${names.join(", ")}.`], noTurn: true };
}

function revealJournal(state) {
  return {
    ...state,
    deskUnlocked: true,
    roomItems: { ...state.roomItems, cottage: [...(state.roomItems.cottage || []), "journal"] },
  };
}

const UNLOCK_LINE =
  "You turn the brass key in the lock. It clicks open, and a drawer slides free. Inside is a journal, its cover soft with age.";

function tryUnlockDesk(state) {
  if (state.room !== "cottage") return { state, lines: ["There's no desk here."] };
  if (state.deskUnlocked) return { state, lines: ["The desk is already open."] };
  if (!state.inventory.includes("key")) return { state, lines: ["You don't have the right key."] };
  return { state: revealJournal(state), lines: [UNLOCK_LINE] };
}

function handleOpen(state, rest) {
  if (rest.length === 0) return { state, lines: ["Open what?"] };
  const sceneryId = resolveScenery(rest);
  if (sceneryId !== "desk") return { state, lines: ["That doesn't open."] };
  return tryUnlockDesk(state);
}

function handleClose(state, rest) {
  if (rest.length === 0) return { state, lines: ["Close what?"] };
  const sceneryId = resolveScenery(rest);
  if (sceneryId === "desk" && state.room === "cottage") {
    if (!state.deskUnlocked) return { state, lines: ["It's already shut tight."] };
    return {
      state,
      lines: ["You swing the drawer shut. It doesn't stay locked, not without the key turning the other way."],
    };
  }
  return { state, lines: ["That doesn't need closing."] };
}

function handleUnlock(state, rest) {
  const withIdx = rest.indexOf("with");
  const targetTokens = withIdx === -1 ? rest : rest.slice(0, withIdx);
  const toolTokens = withIdx === -1 ? [] : rest.slice(withIdx + 1);

  if (targetTokens.length === 0) return { state, lines: ["Unlock what?"] };
  const sceneryId = resolveScenery(targetTokens);
  if (sceneryId !== "desk") return { state, lines: ["That doesn't need unlocking."] };

  if (toolTokens.length) {
    const toolId = resolveItem(toolTokens);
    if (toolId !== "key") return { state, lines: ["You don't have the right key."] };
  }
  return tryUnlockDesk(state);
}

function fuelLamp(state) {
  if (state.room !== "lamp_room") {
    return { state, lines: ["That's not here. You'd need to bring it up to the lamp room."] };
  }
  if (!state.inventory.includes("oil")) return { state, lines: ["You don't have any fuel."] };
  if (state.fueled) return { state, lines: ["The lamp already has plenty of fuel."] };
  return {
    state: { ...state, fueled: true },
    lines: ["You crack the drum and feed fuel into the lamp's tank. It smells sharp and old, but it's still good."],
  };
}

function repairLamp(state) {
  if (state.room !== "lamp_room") {
    return { state, lines: ["That's not here. You'd need to bring it up to the lamp room."] };
  }
  if (!state.inventory.includes("wrench")) return { state, lines: ["You don't have anything to fix it with."] };
  if (state.repaired) return { state, lines: ["The mechanism already turns freely."] };
  return {
    state: { ...state, repaired: true },
    lines: [
      "You brace the wrench against the seized gears and lean in. With a shriek of protest, the mechanism breaks loose and starts turning freely.",
    ],
  };
}

function splitOnPreposition(tokens) {
  for (const p of PREPOSITIONS) {
    const idx = tokens.indexOf(p);
    if (idx !== -1) {
      return { left: tokens.slice(0, idx), right: tokens.slice(idx + 1) };
    }
  }
  return { left: tokens, right: [] };
}

function handleUse(state, rest) {
  if (rest.length === 0) return { state, lines: ["Use what?"] };
  const { left, right } = splitOnPreposition(rest);
  const a = resolveItem(left) || resolveScenery(left);
  const b = right.length ? resolveItem(right) || resolveScenery(right) : undefined;

  const ids = new Set([a, b].filter(Boolean));
  if (!b && state.room === "lamp_room" && (ids.has("oil") || ids.has("wrench"))) {
    ids.add("lamp");
  }

  if (ids.has("key") && ids.has("desk")) {
    return tryUnlockDesk(state);
  }

  const hasOil = ids.has("oil");
  const hasWrench = ids.has("wrench");
  const hasLamp = ids.has("lamp");

  if (hasLamp && (hasOil || hasWrench)) {
    if (hasOil) return fuelLamp(state);
    if (hasWrench) return repairLamp(state);
  }

  if (a && !b) {
    return { state, lines: [`You're not sure what to use the ${nameOf(a)} on.`] };
  }

  return { state, lines: ["That doesn't seem to do anything."] };
}

function handleLight(state, rest) {
  const sceneryId = rest.length ? resolveScenery(rest) : "lamp";
  if (sceneryId !== "lamp") {
    return { state, lines: ["There's nothing else here to light."] };
  }
  if (state.room !== "lamp_room") {
    return { state, lines: ["There's no lamp here to light."] };
  }
  if (state.lit) {
    return { state, lines: ["The lamp is already burning."] };
  }
  if (!state.fueled && !state.repaired) {
    return { state, lines: [TEXT.lampNeither] };
  }
  if (!state.fueled) {
    return { state, lines: [`The mechanism turns, but there's no fuel to catch. ${TEXT.lampFueledOnly}`] };
  }
  if (!state.repaired) {
    return { state, lines: [`The lamp hisses but the mechanism won't turn. ${TEXT.lampRepairedOnly}`] };
  }

  const endingId = state.readJournal ? "WON_FULL" : "WON_PARTIAL";
  const next = { ...state, lit: true, ended: endingId };
  return { state: next, lines: [ENDINGS[endingId].text] };
}

function handleStatus(state) {
  let intensity = "The storm is distant still. There's time, but not forever.";
  if (state.turns >= 20) intensity = "The storm is screaming. This can't go on much longer.";
  else if (state.turns >= 14) intensity = "The storm is heavy now. The horn sounds close and afraid.";
  else if (state.turns >= 8) intensity = "The wind is picking up out there.";
  return { state, lines: [intensity], noTurn: true };
}

function handleScore(state) {
  const items = [
    ["Picked up the fuel drum", state.inventory.includes("oil") || state.fueled],
    ["Picked up the wrench", state.inventory.includes("wrench") || state.repaired],
    ["Picked up the brass key", state.inventory.includes("key") || state.deskUnlocked],
    ["Opened the writing desk", state.deskUnlocked],
    ["Read Mara's journal", state.readJournal],
    ["Fueled the lamp", state.fueled],
    ["Repaired the lamp mechanism", state.repaired],
    ["Lit the lamp", state.lit],
  ];
  const lines = items.map(([label, done]) => `${done ? "[x]" : "[ ]"} ${label}`);
  return { state, lines: [lines.join("\n")], noTurn: true };
}

function dispatch(state, tokens, rawInput) {
  const first = tokens[0];

  if (DIRECTIONS[first] && tokens.length === 1) {
    return handleGo(state, DIRECTIONS[first]);
  }

  if (Object.prototype.hasOwnProperty.call(FLAVOR, first)) {
    return { state, lines: [resolveFlavorText(FLAVOR, first)] };
  }
  if (Object.prototype.hasOwnProperty.call(META_FLAVOR, first)) {
    return { state, lines: [resolveFlavorText(META_FLAVOR, first)], noTurn: true };
  }

  const verb = VERB_ALIASES[first];
  const rest = tokens.slice(1);

  if (!verb) {
    return { state, lines: [`Wick doesn't understand "${rawInput}".`] };
  }

  switch (verb) {
    case "go": {
      if (rest.length === 0) return { state, lines: ["Go where?"] };
      const dirWord = DIRECTIONS[rest[0]];
      if (dirWord) return handleGo(state, dirWord);

      const phrase = rest.join(" ");
      const room = ROOMS[state.room];

      const sceneryId = resolveScenery(rest);
      if (sceneryId === "stairs" && SCENERY.stairs.rooms.includes(state.room)) {
        if (room.exits.up) return handleGo(state, "up");
        if (room.exits.down) return handleGo(state, "down");
      }

      for (const [dir, destId] of Object.entries(room.exits)) {
        const destRoom = ROOMS[destId];
        if (destId === phrase || destRoom.name.toLowerCase().includes(phrase)) {
          return handleGo(state, dir);
        }
      }
      return { state, lines: ["Go where?"] };
    }
    case "look":
      return handleLook(state, rest);
    case "examine":
      return handleExamine(state, rest);
    case "take":
      return handleTake(state, rest);
    case "drop":
      return handleDrop(state, rest);
    case "inventory":
      return handleInventory(state);
    case "open":
      return handleOpen(state, rest);
    case "close":
      return handleClose(state, rest);
    case "unlock":
      return handleUnlock(state, rest);
    case "use":
      return handleUse(state, rest);
    case "fuel":
      return fuelLamp(state);
    case "fix":
      return repairLamp(state);
    case "light":
      return handleLight(state, rest);
    case "help":
      return { state, lines: [HELP_TEXT], noTurn: true };
    case "status":
      return handleStatus(state);
    case "score":
      return handleScore(state);
    case "wait":
      return { state, lines: ["You wait. Somewhere out past the breakers, the horn sounds again."] };
    case "again": {
      if (!state.lastCommand) {
        return { state, lines: ["There's nothing to repeat yet."], noTurn: true };
      }
      const pastTokens = stripFiller(tokenize(state.lastCommand));
      return dispatch(state, pastTokens, state.lastCommand);
    }
    default:
      return { state, lines: [`Wick doesn't understand "${rawInput}".`] };
  }
}

export function processCommand(state, rawInput) {
  if (state.ended) {
    return { state, lines: ["The story has ended. Restart to play again."] };
  }
  const input = (rawInput || "").trim();
  if (!input) {
    return { state, lines: ['Say something. Type "help" if you\'re stuck.'] };
  }

  const tokens = stripFiller(tokenize(input));
  if (tokens.length === 0) {
    return { state, lines: ['Say something. Type "help" if you\'re stuck.'] };
  }

  const { state: afterState, lines, noTurn } = dispatch(state, tokens, input);

  const isAgain = tokens[0] === "again" || tokens[0] === "g";
  const withLastCommand = isAgain ? afterState : { ...afterState, lastCommand: input };

  if (noTurn || withLastCommand.ended) {
    return { state: withLastCommand, lines };
  }

  let next = { ...withLastCommand, turns: withLastCommand.turns + 1 };
  const outLines = [...lines];

  const stormMsg = STORM_MESSAGES.find((m) => m.at === next.turns);
  if (stormMsg) outLines.push("", stormMsg.text);

  if (next.turns > STORM_THRESHOLD && !next.lit) {
    next = { ...next, ended: "LOST" };
    outLines.push("", ENDINGS.LOST.text);
  }

  return { state: next, lines: outLines };
}
