import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-098.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-098", () => {
  it("de-digivolves one opposing Digimon, then optionally deletes up to six by returning three D-Brigade/DigiPolice cards", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "DeleteBudget",
      filter: { controller: "opponent", kind: ["Digimon"] },
      budget: 6,
      upTo: true,
      cost: { kind: "return", target: { count: 3 } },
    });
  });
  it("activates main in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));

  it("naturally de-digivolves, returns exactly three trait cards, and spends the six-cost deletion budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-058", as: "source" }],
          hand: [{ card: "BT14-098", as: "option" }],
          trash: ["BT14-056", "BT14-060", "BT14-064"],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT14-066", as: "deDigivolveTarget", under: ["BT14-062"] },
            { card: "BT14-058", as: "firstVictim" },
            { card: "BT14-058", as: "secondVictim" },
            { card: "BT14-060", as: "survivor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const firstVictimId = s.perm("firstVictim").permanentId;
    const secondVictimId = s.perm("secondVictim").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("deDigivolveTarget").stack.length === 0 &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstVictimId),
    );

    expect(s.perm("deDigivolveTarget").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstVictimId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondVictimId)).toBe(false);
    expect(s.perm("survivor").topCard?.cardId).toBe("BT14-060");
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.deck.slice(0, 3).map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT14-056", "BT14-060", "BT14-064"]),
    );
    expect(s.state.players[0]!.trash.some((card) => ["BT14-056", "BT14-060", "BT14-064"].includes(card.cardId))).toBe(
      false,
    );
  });

  it("naturally applies De-Digivolve and its deletion budget from a Security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-066", as: "attacker", under: ["BT14-062"] },
            { card: "BT14-058", as: "firstVictim" },
            { card: "BT14-058", as: "secondVictim" },
            { card: "BT14-060", as: "survivor" },
          ],
        },
        1: {
          security: [{ card: "BT14-098", as: "securityOption" }],
          trash: ["BT14-056", "BT14-060", "BT14-064"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstVictimId = s.perm("firstVictim").permanentId;
    const secondVictimId = s.perm("secondVictim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === firstVictimId) &&
        s.state.players[1]!.trash.some((card) => card.cardId === "BT14-098"),
    );

    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === firstVictimId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === secondVictimId)).toBe(false);
    expect(s.perm("survivor").topCard?.cardId).toBe("BT14-060");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT14-098")).toBe(true);
  });
});

describe("BT14-098 DCD Bomb — KB Q&A rulings", () => {
  it("returns the three trait cards to the top of the deck even when the opponent has no Digimon (Q2483)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-058", as: "blackDigimon" }],
          hand: [{ card: "BT14-098", as: "option" }],
          trash: [
            { card: "BT14-056", as: "commandramon" },
            { card: "BT14-060", as: "hiCommandramon" },
            { card: "BT14-064", as: "cargodramon" },
            { card: "BT1-009", as: "nonTraitCard" },
          ],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const returnedIds = [s.inst("commandramon"), s.inst("hiCommandramon"), s.inst("cargodramon")].map(
      (card) => card.instanceId,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 4);

    const player = s.state.players[0]!;
    expect(
      player.deck
        .slice(0, 3)
        .map((card) => card.instanceId)
        .toSorted(),
    ).toEqual(returnedIds.toSorted());
    expect(player.deck[3]?.cardId).toBe("BT1-009");
    expect(player.trash.map((card) => card.cardId).toSorted()).toEqual(["BT1-009", "BT14-098"]);
    expect(player.trash.some((card) => card.instanceId === s.inst("nonTraitCard").instanceId)).toBe(true);
  });
});
