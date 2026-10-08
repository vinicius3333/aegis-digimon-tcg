import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Discord 1557789815607533588 — Option use precedes its Main effect", () => {
  it.each([
    { preexisting: false, path: "effect" },
    { preexisting: true, path: "effect" },
    { preexisting: false, path: "hand" },
    { preexisting: true, path: "hand" },
  ])(
    "does not retroactively trigger newly evolved Maid ($path; preexisting: $preexisting)",
    async ({ preexisting, path }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: path === "effect" ? "BT17-032" : "BT17-035", as: "base" },
              ...(preexisting ? [{ card: "ST22-06", as: "existingMaid" }] : []),
            ],
            hand: [
              ...(path === "effect" ? [{ card: "BT17-035", as: "taomon" }] : []),
              { card: "LM-029", as: "scramble" },
              { card: "ST22-06", as: "newMaid" },
              { card: "BT1-102", as: "laterOption" },
            ],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "low" },
              { card: "BT1-010", as: "high" },
            ],
            security: ["BT1-011", "BT1-012"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(
          0,
          path === "effect"
            ? {
                type: "digivolve",
                permanentId: s.perm("base").permanentId,
                instanceId: s.inst("taomon").instanceId,
              }
            : { type: "playCard", instanceId: s.inst("scramble").instanceId },
        ),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some(
            (event) =>
              event.kind === "effectResolved" && event.sourceCardId === (path === "effect" ? "BT17-035" : "LM-029"),
          ) && s.state.pendingDecision === undefined,
      );
      expect(s.perm("base").topCard.instanceId).toBe(s.inst("newMaid").instanceId);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("scramble").instanceId)).toBe(
        true,
      );
      await settle();
      expect(s.state.memory).toBe(path === "effect" ? 6 : 7);
      const triggered = s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "ST22-06" && event.printedTiming === "AllTurns",
      );
      expect(triggered).toHaveLength(preexisting ? 1 : 0);
      expect(s.state.players[1]!.battleArea).toHaveLength(preexisting ? 1 : 2);
      expect(triggered.map((event) => (event.kind === "effectTriggered" ? event.sourceInstanceId : undefined))).toEqual(
        preexisting ? [s.inst("existingMaid").instanceId] : [],
      );
      const mainResolved = s.events.findIndex(
        (event) => event.kind === "effectResolved" && event.sourceCardId === "LM-029",
      );
      expect(triggered.every((event) => s.events.indexOf(event) > mainResolved)).toBe(true);
      // The new Maid still has its OPT; the old Maid must not react again this turn.
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("laterOption").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () => s.state.players[1]!.battleArea.length === (preexisting ? 0 : 1) && s.state.pendingDecision === undefined,
      );
      const allTriggered = s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "ST22-06" && event.printedTiming === "AllTurns",
      );
      expect(allTriggered).toHaveLength(preexisting ? 2 : 1);
      expect(allTriggered.at(-1)).toMatchObject({ sourceInstanceId: s.inst("newMaid").instanceId });
    },
  );
});

it("retires the old Maid listener when Scramble evolves its source into BT19-040", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST22-06", as: "maid" }],
        hand: [
          { card: "LM-029", as: "scramble" },
          { card: "BT19-040", as: "sakuyamon" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: ["BT1-009"], security: ["BT1-010"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scramble").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("maid").topCard.cardId === "BT19-040" && s.state.pendingDecision === undefined);
  await settle();
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
  expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT19-040", "LM-029"]);
  expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "ST22-06")).toHaveLength(0);
});

it("retires a preexisting Option listener deleted during the Option Main", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT3-091", as: "lilithmon" }],
        hand: [{ card: "BT7-107", as: "calling" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  const callingId = s.inst("calling").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: callingId })).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.trash.some((c) => c.instanceId === callingId) && s.state.pendingDecision === undefined,
  );
  await settle();
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
  expect(s.state.memory).toBe(9);
  expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT3-091")).toHaveLength(0);
});

it.each([
  { path: "hand", first: "ST22-06" },
  { path: "hand", first: "BT19-040" },
  { path: "effect", first: "ST22-06" },
  { path: "effect", first: "BT19-040" },
])("orders the captured use watcher with Main-created digivolution ($path; $first first)", async ({ path, first }) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: path === "effect" ? "BT17-032" : "BT17-035", as: "base" },
          { card: "ST22-06", as: "maid" },
        ],
        hand: [
          ...(path === "effect" ? [{ card: "BT17-035", as: "taomon" }] : []),
          { card: "LM-029", as: "scramble" },
          { card: "BT19-040", as: "sakuyamon" },
        ],
        deck: Array.from({ length: 6 }, () => "BT1-009"),
      },
      1: { battleArea: ["BT1-010"], security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [first] },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(
      0,
      path === "effect"
        ? {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("taomon").instanceId,
          }
        : { type: "playCard", instanceId: s.inst("scramble").instanceId },
    ),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
  await settle();
  const order = s.decisions.find(
    ({ req }) => req.kind === "orderTriggers" && req.options?.triggerCardIds?.includes("BT19-040"),
  );
  expect(order?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["ST22-06", "BT19-040"]));
  const resolved = s.events.filter(
    (e) => e.kind === "effectResolved" && ["ST22-06", "BT19-040"].includes(e.sourceCardId),
  );
  expect(resolved.map((e) => (e.kind === "effectResolved" ? e.sourceCardId : ""))).toEqual(
    first === "ST22-06" ? ["ST22-06", "BT19-040"] : ["BT19-040", "ST22-06"],
  );
  expect(s.state.players[0]!.battleArea).toHaveLength(3); // existing Maid, evolved Sakuyamon, Scramble; no new token
});
