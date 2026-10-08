import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../engine/testkit/harness.js";
import "./index.js";

const exactRoutes = [
  ["BT10-016", "BT13-017"],
  ["BT10-068", "BT20-057"],
  ["BT10-069", "BT10-066"],
  ["BT10-086", "BT5-086"],
  ["BT11-015", "BT10-008"],
  ["BT11-069", "BT1-021"],
  ["BT16-014", "BT14-018"],
  ["BT16-018", "BT16-017"],
  ["BT16-024", "BT16-019"],
  ["BT16-038", "BT3-046"],
  ["BT16-052", "BT2-052"],
  ["BT16-066", "EX5-056"],
  ["BT16-067", "BT7-068"],
  ["BT16-069", "BT15-074"],
  ["BT16-079", "BT7-079"],
  ["BT16-101", "BT8-039"],
  ["BT17-025", "BT1-039"],
  ["BT18-071", "BT1-063"],
  ["BT20-019", "BT13-017"],
  ["BT20-026", "BT2-029"],
  ["BT20-059", "BT20-057"],
  ["BT22-068", "BT1-010"],
  ["BT24-052", "BT2-053"],
  ["BT25-104", "BT12-043"],
] as const;

const additionalRoutes = [
  { target: "BT16-009", base: "BT2-036", conflict: "BT3-082", index: 0, breeding: false },
  { target: "BT16-013", base: "BT16-012", conflict: "BT7-038", index: 0, breeding: false },
  { target: "BT16-016", base: "BT14-003", conflict: "BT9-003", index: 0, breeding: true },
  { target: "BT16-031", base: "BT2-034", conflict: "BT9-034", index: 0, breeding: false },
  { target: "BT16-049", base: "BT1-003", conflict: "BT13-081", index: 0, breeding: false },
  { target: "BT16-070", base: "BT16-017", conflict: "BT16-018", index: 0, breeding: false },
  { target: "BT18-013", base: "BT3-077", conflict: "BT9-070", index: 0, breeding: false },
  { target: "BT22-038", base: "BT2-056", conflict: "BT22-031", index: 0, breeding: false },
  { target: "BT22-061", base: "BT1-071", conflict: "BT10-047", index: 1, breeding: false },
];

async function declareRoute(target: string, base: string, options: { index?: number; breeding?: boolean } = {}) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          ...(options.breeding === true ? [] : [{ card: base, as: "base" }]),
          ...(target === "BT25-104" ? [{ card: "BT13-095", as: "marcus" }] : []),
        ],
        ...(options.breeding === true ? { breeding: { card: base, as: "base" } } : {}),
        hand: [{ card: target, as: "target" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
    },
    { autoSelectCards: true, autoDeclineOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  const result = s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("base").permanentId,
    instanceId: s.inst("target").instanceId,
    alternateRequirementIndex: options.index ?? (target === "BT25-104" ? 1 : 0),
  });
  return { s, result };
}

describe("#5289 exact-name digivolution routes in the card-effects lane", () => {
  it.each(exactRoutes)("%s rejects another copy instead of its exact base %s", async (target) => {
    const { s, result } = await declareRoute(target, target);
    expect(result).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.perm("base").stack).toHaveLength(0);
  });

  it.each(exactRoutes)("%s still accepts its exact base %s", async (target, base) => {
    const { s, result } = await declareRoute(target, base);
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === target);
    await drainMicrotasks();
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(additionalRoutes)("$target rejects the non-exact named route from $conflict", async (route) => {
    const { s, result } = await declareRoute(route.target, route.conflict, route);
    expect(result).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe(route.conflict);
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
  });

  it.each(additionalRoutes)("$target still accepts the exact named route from $base", async (route) => {
    const { s, result } = await declareRoute(route.target, route.base, {
      index: route.index,
      breeding: route.breeding || route.target === "BT16-049",
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === route.target);
    await drainMicrotasks();
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([route.base]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["BT10-067", "BT11-073"],
    ["BT11-073", "BT10-067"],
    ["BT16-102", "BT9-044"],
  ])("%s preserves the printed substring route from %s", async (target, base) => {
    const { s, result } = await declareRoute(target, base);
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === target && s.perm("base").stack.length === 1);
    await drainMicrotasks();
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
  });

  it.each([
    ["BT16-038", "ST17-01"],
    ["BT16-067", "BT7-006"],
    ["BT22-068", "BT7-004"],
  ])("%s retains its second exact route from the Digi-Egg %s in breeding", async (target, base) => {
    const s = setupEngine({
      0: {
        breeding: { card: base, as: "egg" },
        hand: [{ card: target, as: "rookie" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("rookie").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === target);
    expect(s.perm("egg").inBreeding).toBe(true);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual([base]);
    expect(s.state.memory).toBe(10);
  });

  it("keeps Goldramon's ordinary level/color route when its exact-name route does not match", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "BT16-014", as: "target" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-014");
    expect(s.state.memory).toBe(5);
  });
});
