import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-051.js";

describe("EX8-051", () => {
  it("matches the committed catalog identity and every printed clause", () => {
    expect(getCardDefinition("EX8-051")).toMatchObject({
      cardId: "EX8-051",
      nameEn: "Proganomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
      effectText: "＜Collision＞.\n＜Piercing＞.\n＜Fragment (3)＞.",
      inheritedEffectText: expect.stringContaining("[Mineral]/[Rock]"),
    });
    expect(getCardDefinition("EX8-051")?.securityEffectText).toBeUndefined();
  });

  it("inherits exactly one De-Digivolve from a Mineral/Rock host", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
          actions: [
            {
              kind: "DeDigivolve",
              amount: 1,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    }));
  it("has exactly Collision, Piercing, and Fragment (3)", () =>
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" },
      ]),
    ));
  it("exposes all three keywords on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-051", as: "proganomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("proganomon"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("proganomon"), "Fragment")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("proganomon"))).toBe(true);
  });
  it("prevents deletion by trashing exactly three digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-051", as: "proganomon", under: ["EX8-050", "EX8-049", "EX8-048"] }] },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.players[0]!.battleArea[0]!.isSuspended = true;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("proganomon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("proganomon").stack.length === 0);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("proganomon").permanentId)).toBe(true);
    expect(s.perm("proganomon").stack).toHaveLength(0);
    expect(
      s.state.players[0]!.trash.filter((card) => ["EX8-050", "EX8-049", "EX8-048"].includes(card.cardId)),
    ).toHaveLength(3);
  });

  it("does not prevent deletion when fewer than three digivolution cards are available", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-051", as: "proganomon", under: ["EX8-050", "EX8-049"] }] },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.players[0]!.battleArea[0]!.isSuspended = true;
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("proganomon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-051")).toBe(true);
  });

  it("de-digivolves an opposing Digimon when trashed from a qualifying host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-053", as: "host", under: [{ card: "EX8-051", as: "discarded" }] }] },
      1: {
        battleArea: [
          {
            card: "BT1-016",
            as: "target",
            under: [
              { card: "BT1-009", as: "remaining" },
              { card: "BT1-010", as: "promoted" },
            ],
          },
          { card: "BT1-087", as: "tamer" },
        ],
      },
    });
    await s.ready();
    const targetTopId = s.perm("target").topCard.instanceId;
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("discarded").instanceId],
      0,
    );
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").topCard.cardId).toBe("BT1-010");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetTopId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-087")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId)).toBe(true);
  });

  it("does not de-digivolve when trashed from a non-Mineral/Rock host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "host", under: [{ card: "EX8-051", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-016", as: "target", under: ["BT1-009", "BT1-010"] }] },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("discarded").instanceId],
      0,
    );
    expect(s.perm("target").stack).toHaveLength(2);
  });

  it("also de-digivolves from a Rock host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-064", as: "host", under: [{ card: "EX8-051", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-016", as: "target", under: ["BT1-009"] }] },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("discarded").instanceId],
      0,
    );
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
  });

  it("evolves legally from Black level 4 for three and rejects a non-Black source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-049", as: "base" }], hand: [{ card: "EX8-051", as: "proganomon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("proganomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-051");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX8-049"]);
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "base" }], hand: [{ card: "EX8-051", as: "proganomon" }] },
    });
    invalid.state.memory = 3;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("proganomon").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(3);
  });

  it("uses Piercing to check security after winning a battle against a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-051", as: "attacker", dp: 20000 }] },
      1: { battleArea: [{ card: "BT1-016", as: "defender", dp: 1000, suspended: true }], security: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-016")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses Collision to grant Blocker and force an opponent's block", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-051", as: "proganomon", dp: 20000 }] },
      1: {
        battleArea: [{ card: "BT1-016", as: "blocker", dp: 1000 }],
        security: ["BT1-009"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("proganomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : []).toContain(
      s.perm("blocker").permanentId,
    );
    expect(opened && "mustBlock" in opened ? opened.mustBlock : false).toBe(true);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
  });
});
