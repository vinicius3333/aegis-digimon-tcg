import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-059.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-059", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-059")).toMatchObject({
      cardId: "EX7-059",
      nameEn: "BeelStarmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 6,
      dp: 11000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Wizard", "Three Musketeers"],
      isAce: true,
      overflowMemory: 4,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-059")).toBe(true);
  });
  it("pays from its own stack and uses an Option when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-059", as: "beel", under: ["EX7-066", "EX7-066"] }],
          hand: ["EX7-066", "EX7-066"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beel").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009"));
    // The used Chaos Triangular replaces the paid source by placing itself underneath.
    expect(s.perm("beel").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX7-066")).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(5);
  });

  it("publicly recovers and uses a qualifying Option for free on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-059", as: "beel" }], trash: [{ card: "EX7-066", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beel").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.perm("beel").stack.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("publicly recovers and uses a qualifying Option after exact evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-044", as: "base" }],
          hand: [{ card: "EX7-059", as: "beel" }],
          trash: [{ card: "EX7-066", as: "option" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beel").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([sourceId, s.inst("option").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("keeps the recovered Option in hand when its optional use is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-059", as: "beel" }], trash: [{ card: "EX7-066", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beel").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("cannot pay its attack cost using another Digimon's Option source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-059", as: "beel" },
            { card: "EX7-073", as: "other", under: ["EX7-066"] },
          ],
          hand: [{ card: "EX7-066", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beel").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("other").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Blast Digivolves from hand onto a level 5 Digimon with Three Musketeers in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-044", as: "base" }],
          hand: [{ card: "EX7-059", as: "beel" }],
          trash: [{ card: "EX7-066", as: "option" }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], deck: ["BT1-013", "BT1-014", "BT1-015"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("beel").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-059");

    expect(s.perm("base").topCard?.cardId).toBe("EX7-059");
    expect(s.perm("base").stack.some((card) => card.cardId === "EX7-044")).toBe(true);
    expect(s.state.memory).toBe(3);
    await stopLoop(s, loop, 1);
  });

  it("Q6391: Blast Digivolves onto a Tamer with Three Musketeers in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-093", as: "tamer" }],
          hand: [{ card: "EX7-059", as: "beel" }],
          trash: [{ card: "EX7-066", as: "option" }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-013", "BT1-014", "BT1-015"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("beel").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard.cardId === "EX7-059");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toContain("BT18-093");
    expect(s.state.memory).toBe(3);
    await stopLoop(s, loop, 1);
  });

  it("pays Overflow 4 when the ACE leaves in a public battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-059", as: "beel", dp: 11000, under: ["EX7-044"] }] },
        1: { battleArea: [{ card: "BT1-014", as: "wall", dp: 20000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const aceId = s.inst("beel").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beel").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === aceId));
    expect(s.state.memory).toBe(-1);
  });

  it("has Blast Digivolve and returns an Option from trash before using a Three Musketeers Option without cost", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Return", to: "hand", target: { count: 1 } },
      { kind: "UseOptionWithoutCost", payCost: false, from: ["hand"], optional: true },
    ]);
  });
  it("uses a Three Musketeers Option when attacking by trashing an Option from its digivolution cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      cost: {
        kind: "trash",
        target: { count: 1, filter: { hostFilter: { isSelfRef: true }, zone: "digivolutionCards" } },
      },
      optional: true,
    }));
});
