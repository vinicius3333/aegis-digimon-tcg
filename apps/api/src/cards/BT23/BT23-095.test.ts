import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-095.js";

describe("BT23-095 Crescent Leaf", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-095")).toMatchObject({
      cardId: "BT23-095",
      nameEn: "Crescent Leaf",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(
      (compiled.effects.find((effect) => effect.trigger === "Static") as any).actions[0].condition.filter.zone,
    ).toEqual(["battleArea", "breeding"]);
  });

  it("waives the green color requirement from an off-color CS Digimon in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-008", as: "csInBreeding" },
        hand: [{ card: "BT23-095", as: "option" }],
      },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("pays Delay and returns only a suspended opposing Digimon to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-095", as: "option" },
            { card: "BT23-006", as: "attacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspended", suspended: true },
            { card: "BT1-010", as: "active" },
          ],
          security: 2,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const returnedId = s.perm("suspended").topCard!.instanceId;
    const activeId = s.perm("active").topCard!.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck[0]?.instanceId === returnedId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.deck[0]?.instanceId).toBe(returnedId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === activeId)).toBe(true);
  });

  it("does not pay Delay when a non-CS Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-095", as: "option" },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const targetId = s.perm("target").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("keeps return nested in Delay and Main/Security return-then-place", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0].actions).toEqual([expect.objectContaining({ kind: "Return", to: "deckBottom" })]);
    for (const trigger of ["Main", "Security"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect.actions).toMatchObject([{ kind: "Return", to: "deckBottom" }, { kind: "PlaceInBattleAreaSelf" }]);
    }
  });
});
