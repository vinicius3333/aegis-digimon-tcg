import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-041.js";

describe("EX4-041 DeadlyAxemon", () => {
  it("matches the catalog and carries both printed alternate evolution routes", () => {
    expect(getCardDefinition("EX4-041")).toMatchObject({
      cardId: "EX4-041",
      nameEn: "DeadlyAxemon",
      colors: ["Black"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Blue", level: 3, memoryCost: 3 },
      ],
      types: ["Dark Animal", "Twilight"],
    });
    expect(compiled.digivolutionRequirement).toEqual(digivolutionRequirementsFor("EX4-041"));
  });
  it("draws two by optionally trashing a Blue Flare or Twilight card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: { filter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare", "Twilight"] }] } },
      },
    });
  });
  it("reveals a Blue Flare or Twilight card on deletion and permanently gains 1000 DP inherited", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 1,
      rest: "trash",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-041");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("draws two only after paying the Blue Flare/Twilight trash cost", async () => {
    const paid = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-041", as: "subject" }],
          hand: [{ card: "EX4-014", as: "cost" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await paid.ready();
    const handBefore = paid.state.players[0]!.hand.length;
    await advance(paid.engine).fire(EffectTiming.OnPlay, paid.perm("subject"));
    await settle(() => paid.state.players[0]!.trash.some((card) => card.instanceId === paid.inst("cost").instanceId));
    expect(paid.state.players[0]!.trash.map((card) => card.instanceId)).toContain(paid.inst("cost").instanceId);
    expect(paid.state.players[0]!.hand.length).toBe(handBefore + 1);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-041", as: "subject" }],
          hand: [{ card: "EX4-014", as: "cost" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await declined.ready();
    const deckBefore = declined.state.players[0]!.deck.length;
    await advance(declined.engine).fire(EffectTiming.OnPlay, declined.perm("subject"));
    await settle();
    expect(declined.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(declined.inst("cost").instanceId);

    const unavailable = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-041", as: "subject" }],
          hand: [{ card: "BT1-012", as: "wrongCost" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await unavailable.ready();
    const unavailableDeckBefore = unavailable.state.players[0]!.deck.length;
    await advance(unavailable.engine).fire(EffectTiming.OnPlay, unavailable.perm("subject"));
    await settle();
    expect(unavailable.state.players[0]!.deck).toHaveLength(unavailableDeckBefore);
    expect(unavailable.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      unavailable.inst("wrongCost").instanceId,
    );
  });

  it("adds a matching deletion reveal and trashes a non-matching card", async () => {
    const matching = setupEngine(
      { 0: { battleArea: [{ card: "EX4-041", as: "subject" }], deck: ["EX4-021"] } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await matching.ready();
    await advance(matching.engine).verb.deletePermanent([matching.perm("subject").permanentId], "byEffect");
    await settle(() => matching.state.players[0]!.hand.some((card) => card.cardId === "EX4-021"));
    expect(matching.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-021");

    const nonMatching = setupEngine(
      { 0: { battleArea: [{ card: "EX4-041", as: "subject" }], deck: ["BT1-012"] } },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await nonMatching.ready();
    await advance(nonMatching.engine).verb.deletePermanent([nonMatching.perm("subject").permanentId], "byEffect");
    await settle(() => nonMatching.state.players[0]!.trash.some((card) => card.cardId === "BT1-012"));
    expect(nonMatching.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-012");
    expect(nonMatching.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-012");
  });

  it("gives a host +1000 DP through the inherited All Turns effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX4-041"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it.each([
    ["black", "EX4-038"],
    ["blue", "EX4-014"],
  ])("digivolves legally from a %s level-3 Digimon for 3 memory", async (_route, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-041", as: "evolution" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX4-041");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCard]);
  });

  it("rejects the alternate route from a level-3 Digimon with neither printed color", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-003", as: "base" }],
        hand: [{ card: "EX4-041", as: "evolution" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-003");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolution").instanceId);
  });
  ex4CardBehaviorTests("EX4-041");
});
