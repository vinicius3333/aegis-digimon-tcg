import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-065.js";

describe("EX11-065 Close", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-065")).toMatchObject({
      nameEn: "Close",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("trashes a Mineral card from a digivolution stack to gain memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-065", as: "close" },
            { card: "BT13-061", as: "host", under: [{ card: "EX8-051", as: "stackCost" }] },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-019"],
        },
        1: { deck: ["BT1-009", "BT1-013", "BT1-019"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-051")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("places a [Mineral] card from hand under a publicly played Rock Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-065", as: "close" }],
          hand: [{ card: "BT13-061", as: "gotsumon" }, { card: "EX8-051", as: "material" }, "BT1-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("gotsumon").stack.map(({ cardId }) => cardId)).toEqual(["EX8-051"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-090"]);
    assertNoLoudGap(s);
  });

  it("suspends to place a Mineral or Rock card under a played Mineral Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-065", as: "close" }],
          hand: [{ card: "BT13-061", as: "gotsumon" }, "EX8-051"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("gotsumon").stack.some((card) => card.cardId === "EX8-051")).toBe(true);
    assertNoLoudGap(s);
  });

  it("places a Rock card from hand under the newly played Mineral source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-065", as: "close" }],
          hand: [{ card: "BT10-062", as: "mineral" }, { card: "BT13-061", as: "rock" }, "BT1-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mineral").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("mineral").stack.map(({ cardId }) => cardId)).toEqual(["BT13-061"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-090"]);
    assertNoLoudGap(s);
  });

  it("binds placement to the newly played source when another eligible Digimon is already present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-065", as: "close" },
            { card: "BT10-062", as: "existing" },
          ],
          hand: [
            { card: "BT13-061", as: "played" },
            { card: "EX8-051", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("played").stack.map(({ cardId }) => cardId)).toEqual(["EX8-051"]);
    expect(s.perm("existing").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("rejects a nonmatching hand card while preserving the legal source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-065", as: "close" }],
          hand: [{ card: "BT10-062", as: "mineral" }, "BT1-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mineral").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("mineral").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-090"]);
    assertNoLoudGap(s);
  });

  it("leaves Close unsuspended and places nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-065", as: "close" }],
          hand: [{ card: "BT13-061", as: "gotsumon" }, "EX8-051"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({
      ok: true,
    });
    expect(s.perm("close").isSuspended).toBe(false);
    expect(s.perm("gotsumon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX8-051")).toBe(true);
    assertNoLoudGap(s);
  });

  it("cannot pay the suspend cost for a second same-turn trigger", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-065", as: "close" }],
          hand: [
            { card: "BT10-062", as: "first" },
            { card: "BT13-061", as: "second" },
            { card: "EX8-051", as: "material1" },
            { card: "EX8-051", as: "material2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("material1").instanceId);
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("close").isSuspended);
    expect(s.perm("first").stack).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("material2").instanceId);
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-065", as: "close", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-065"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-065")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("places from trash under the Mineral Digimon that just digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-061", as: "base", under: ["BT1-009"] },
            { card: "EX11-065", as: "close" },
          ],
          hand: [{ card: "BT10-062", as: "evolution" }],
          trash: [{ card: "EX8-051", as: "material" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("base").topCard?.cardId).toBe("BT10-062");
    // "as any of those Digimon's BOTTOM digivolution card": index 0 is the bottom of the stack,
    // beneath the BT13-061 the digivolution itself pushed down.
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX8-051", "BT1-009", "BT13-061"]);
    expect(s.perm("base").stack[0]!.instanceId).toBe(s.inst("material").instanceId);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR for both trait-gated trigger events", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.actions).toHaveLength(2);
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"]) {
      expect(allTurns.actions).toContainEqual(
        expect.objectContaining({
          kind: "SubTrigger",
          event,
          sourceFilter: expect.objectContaining({ nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] }),
          actions: [
            expect.objectContaining({
              kind: "PlaceUnder",
              underFilter: { isTriggerSource: true },
              from: ["hand", "trash"],
              cost: { kind: "suspend", target: expect.any(Object), raw: expect.any(String) },
            }),
          ],
        }),
      );
    }
  });

  it("keeps both card pools free of a Digimon-kind restriction so Digi-Eggs qualify", () => {
    const mainPhase = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")!;
    const gainMemory = mainPhase.actions[0] as { cost?: { target?: { filter?: { kind?: unknown } } } };
    expect(gainMemory.cost?.target?.filter?.kind).toBeUndefined();

    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    for (const watcher of allTurns.actions as { actions?: { target?: { filter?: { kind?: unknown } } }[] }[]) {
      expect(watcher.actions?.[0]?.target?.filter?.kind).toBeUndefined();
    }
  });
});
