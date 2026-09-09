import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-047.js";

describe("EX5-047 Leomon", () => {
  it("matches the catalog and encodes the attack evolution and inherited deletion clauses", () => {
    expect(getCardDefinition("EX5-047")).toMatchObject({
      cardId: "EX5-047",
      nameEn: "Leomon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Green", level: 3, memoryCost: 3 },
      ],
      effectText:
        "Digivolve: 2 from [Liollmon] or [Elecmon][When Attacking] This Digimon may digivolve into a Digimon card with [Leomon]\u00a0in its name in your hand with the digivolution cost reduced by 1.",
      inheritedEffectText:
        "[On Deletion] ＜De-Digivolve  1＞ on 1 of your opponent's Digimon (Trash up to 1 card from the top of one of your opponent's Digimon. If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards).",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      target: { filter: { isSelfRef: true }, isSelf: true },
      from: ["hand"],
      reduceCost: 1,
      into: { kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Leomon"] }] },
    });
  });
  it("inherits De-Digivolve 1 to one opposing Digimon on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        { kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
      ],
    });
  });

  it("digivolves into a Leomon-name card from hand through a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-047", as: "attacker" }], hand: [{ card: "EX5-049", as: "leomon" }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "EX5-049");
    expect(s.perm("attacker").topCard.cardId).toBe("EX5-049");
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("EX5-049");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the attacker unchanged when no Leomon-name card is available", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-047", as: "attacker" }], hand: [{ card: "EX5-050", as: "wrongName" }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX5-050");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("accepts the alternate Liollmon/Elecmon source requirement and rejects a wrong-color source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "EX5-044", as: "elecmon" }], hand: [{ card: "EX5-047", as: "leomon" }] },
    });
    legal.state.memory = 2;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("elecmon").permanentId,
        instanceId: legal.inst("leomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("elecmon").topCard?.cardId === "EX5-047");
    expect(legal.state.memory).toBe(0);
    expect(legal.state.pendingDecision).toBeUndefined();

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-045", as: "wrongColor" }], hand: [{ card: "EX5-047", as: "leomon" }] },
    });
    illegal.state.memory = 3;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongColor").permanentId,
        instanceId: illegal.inst("leomon").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.perm("wrongColor").topCard?.cardId).toBe("BT1-045");
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-047"]);
  });

  it("publicly de-digivolves one opposing Digimon when an inherited host is deleted", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-047"], suspended: true }], deck: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 8000 },
            { card: "BT1-036", as: "target", under: ["BT1-009"], suspended: true },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 1;
    const targetId = s.perm("target").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 0 &&
        s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId && p.topCard.cardId === "BT1-009"),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId)?.topCard.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-036");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
