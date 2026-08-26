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
  look: "look",
  l: "look",
  examine: "examine",
  x: "examine",
  inspect: "examine",
  read: "examine",
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
  unlock: "unlock",
  use: "use",
  fill: "use",
  pour: "use",
  apply: "use",
  put: "use",
  light: "light",
  ignite: "light",
  help: "help",
  hint: "help",
  status: "status",
  listen: "wait",
  wait: "wait",
};

const FILLER = new Set(["the", "a", "an", "at", "to", "my"]);
const PREPOSITIONS = ["on", "in", "with", "into"];

function tokenize(input) {
  return input
    .toLowerCase()
    .replace(/[.!?]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function stripFiller(tokens) {
  return tokens.filter((t) => !FILLER.has(t));
}

function matchAlias(tokens, aliasLists) {
  const phrase = tokens.join(" ");
  for (const { id, aliases } of aliasLists) {
    if (aliases.includes(phrase)) return id;
  }
  const last = tokens[tokens.length - 1];
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
  if (sceneryId === "stove") return TEXT.stove;
  if (sceneryId === "carving") return TEXT.carving;
  if (sceneryId === "stairs") return TEXT.stairsFlavor;
  if (sceneryId === "lamp") {
    if (state.lit) return TEXT.lampLit;
    if (state.fueled && state.repaired) return TEXT.lampReady;
    if (state.fueled) return TEXT.lampFueledOnly;
    if (state.repaired) return TEXT.lampRepairedOnly;
    return TEXT.lampNeither;
  }
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

function handleExamine(state, rest) {
  if (rest.length === 0) {
    return { state, lines: [describeRoom(state, state.room, false)] };
  }

  const phrase = rest.join(" ");
  if (["me", "myself", "wick", "self"].includes(phrase)) {
    return {
      state,
      lines: [
        "A compact maintenance automaton, salt-scoured and a little dented. Four thin manipulator limbs, a lensed sensor cluster for a head. You've done worse jobs than this one.",
      ],
    };
  }

  const invItem = resolveItem(rest);
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

  const sceneryId = resolveScenery(rest);
  if (sceneryId && SCENERY[sceneryId].room === state.room) {
    return { state, lines: [describeScenery(state, sceneryId)] };
  }

  return { state, lines: [`You don't see a "${phrase}" here.`] };
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

  const itemId = resolveItem(rest);
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

function handleDrop(state, rest) {
  if (rest.length === 0) return { state, lines: ["Drop what?"] };
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

function handleOpen(state, rest) {
  if (rest.length === 0) return { state, lines: ["Open what?"] };
  const sceneryId = resolveScenery(rest);
  if (sceneryId !== "desk") {
    return { state, lines: ["That doesn't open."] };
  }
  if (state.room !== "cottage") return { state, lines: ["There's no desk here."] };
  if (state.deskUnlocked) return { state, lines: ["The desk is already open."] };
  if (!state.inventory.includes("key")) {
    return { state, lines: ["The desk is locked. It needs a key."] };
  }
  return { state: revealJournal(state), lines: [UNLOCK_LINE] };
}

function handleUnlock(state, rest) {
  const withIdx = rest.indexOf("with");
  const targetTokens = withIdx === -1 ? rest : rest.slice(0, withIdx);
  const toolTokens = withIdx === -1 ? [] : rest.slice(withIdx + 1);

  if (targetTokens.length === 0) return { state, lines: ["Unlock what?"] };
  const sceneryId = resolveScenery(targetTokens);
  if (sceneryId !== "desk") return { state, lines: ["That doesn't need unlocking."] };
  if (state.room !== "cottage") return { state, lines: ["There's no desk here."] };
  if (state.deskUnlocked) return { state, lines: ["The desk is already open."] };

  const toolId = toolTokens.length ? resolveItem(toolTokens) : "key";
  if (toolId !== "key" || !state.inventory.includes("key")) {
    return { state, lines: ["You don't have the right key."] };
  }
  return { state: revealJournal(state), lines: [UNLOCK_LINE] };
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

  const hasOil = ids.has("oil");
  const hasWrench = ids.has("wrench");
  const hasLamp = ids.has("lamp");

  if (hasLamp && (hasOil || hasWrench)) {
    if (state.room !== "lamp_room") {
      return { state, lines: ["That's not here. You'd need to bring it up to the lamp room."] };
    }
    if (hasOil) {
      if (!state.inventory.includes("oil")) return { state, lines: ["You don't have any fuel."] };
      if (state.fueled) return { state, lines: ["The lamp already has plenty of fuel."] };
      return {
        state: { ...state, fueled: true },
        lines: ["You crack the drum and feed fuel into the lamp's tank. It smells sharp and old, but it's still good."],
      };
    }
    if (hasWrench) {
      if (!state.inventory.includes("wrench")) return { state, lines: ["You don't have anything to fix it with."] };
      if (state.repaired) return { state, lines: ["The mechanism already turns freely."] };
      return {
        state: { ...state, repaired: true },
        lines: [
          "You brace the wrench against the seized gears and lean in. With a shriek of protest, the mechanism breaks loose and starts turning freely.",
        ],
      };
    }
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

function dispatch(state, tokens, rawInput) {
  const first = tokens[0];

  if (DIRECTIONS[first] && tokens.length === 1) {
    return handleGo(state, DIRECTIONS[first]);
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
    case "unlock":
      return handleUnlock(state, rest);
    case "use":
      return handleUse(state, rest);
    case "light":
      return handleLight(state, rest);
    case "help":
      return { state, lines: [HELP_TEXT], noTurn: true };
    case "status":
      return handleStatus(state);
    case "wait":
      return { state, lines: ["You wait. Somewhere out past the breakers, the horn sounds again."] };
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

  if (noTurn || afterState.ended) {
    return { state: afterState, lines };
  }

  let next = { ...afterState, turns: afterState.turns + 1 };
  const outLines = [...lines];

  const stormMsg = STORM_MESSAGES.find((m) => m.at === next.turns);
  if (stormMsg) outLines.push("", stormMsg.text);

  if (next.turns > STORM_THRESHOLD && !next.lit) {
    next = { ...next, ended: "LOST" };
    outLines.push("", ENDINGS.LOST.text);
  }

  return { state: next, lines: outLines };
}
