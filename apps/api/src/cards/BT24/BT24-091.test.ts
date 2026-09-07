import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_091 } from "./BT24-091.js";
import "../index.js";

describe("BT24-091 Tidal Stream", () => {
  it("matches the immutable catalog identity and link route", () => {
    expect(getCardDefinition("BT24-091")).toMatchObject({
      cardId: "BT24-091",
      nameEn: "Tidal Stream",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 5,
      types: ["TS"],
      linkDp: 2000,
      linkEffect: "[When Attacking] [Once Per Turn] Return 1 of your opponent's lowest level Digimon to the hand.",
      linkRequirement: "[Link] [TS]\u00a0trait: Cost 3",
    });
  });

  it("returns all tied lowest-level Digimon, unsuspends TS despite a higher survivor, and links itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-091", as: "option" }],
          battleArea: [{ card: "BT24-014", as: "ts", suspended: true }],
        },
        1: {
          battleArea: [
            { card: "BT1-045", as: "low1" },
            { card: "BT1-046", as: "low2" },
            { card: "BT1-051", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ts").linked.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("low1").instanceId, s.inst("low2").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toContain(s.perm("high"));
    expect(s.perm("ts").isSuspended).toBe(false);
  });

  it("does not unsuspend when the Return action moved no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-091", as: "option" }],
          battleArea: [{ card: "BT24-014", as: "ts", suspended: true }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("ts").isSuspended).toBe(true);
  });

  it("links this Option to a separately selected Digimon", () => {
    const main = BT24_091.effects?.find((entry) => entry.trigger === "Main");
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Return",
      target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: "all" },
      bindResultAs: "returnedLowest",
    });
    expect(main?.actions?.[2]).toMatchObject({
      kind: "Link",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      recipient: {
        filter: { controller: "mine", kind: ["Digimon"] },
        orFilters: [{ controller: "mine", kind: ["Digimon"], zone: "breeding" }],
        count: 1,
      },
      allowBreedingRecipient: true,
      payCost: false,
      optional: true,
    });
    expect(BT24_091.linkRequirement).toEqual([{ traits: ["TS"], cost: 3 }]);
  });

  it("waives color from a breeding TS Digimon and links to it (Q5682/Q5685)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-009", as: "breedingTs" },
          hand: [{ card: "BT24-091", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.breeding!.linked.some((card) => card.instanceId === s.inst("option").instanceId),
    );
  });

  it("returns one lowest-level opponent from a public linked-host attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-014", as: "host", linked: ["BT24-091"] }] },
        1: {
          battleArea: [
            { card: "BT1-045", as: "low1" },
            { card: "BT1-046", as: "low2" },
            { card: "BT1-051", as: "high" },
          ],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect([s.inst("low1").instanceId, s.inst("low2").instanceId]).toContain(s.state.players[1]!.hand[0]!.instanceId);
    expect(s.state.players[1]!.battleArea).toContain(s.perm("high"));
  });
  it("resolves its linked effect during BT24-085's natural End-of-Your-Turn attack (Q5686)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source" },
            { card: "BT24-014", as: "host", linked: [{ card: "BT24-091", as: "option" }] },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-045", as: "low" },
            { card: "BT1-051", as: "high" },
          ],
          security: [{ card: "BT1-013", as: "security" }, { card: "BT1-015", as: "security2" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("low").instanceId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("high").instanceId)).toBe(true);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security2").instanceId);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-091", as: "option" }],
          battleArea: [{ card: "BT24-014", as: "ts", suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-045", as: "low" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("option"));
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("low").instanceId));
  });
});
