import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-093.js";

describe("BT23-093 Big Bang Punch", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-093")).toMatchObject({
      cardId: "BT23-093",
      nameEn: "Big Bang Punch!",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 2,
      types: ["Appmon"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(
      (compiled.effects.find((effect) => effect.trigger === "Static") as any).actions[0].condition.filter.zone,
    ).toEqual(["battleArea", "breeding"]);
  });

  it("waives the blue color requirement from an off-color Appmon Digimon in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-009", as: "appmonInBreeding" },
        hand: [{ card: "BT23-093", as: "option" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("pays intrinsic Delay and links only a Link-capable Appmon to the suspending subject", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: "BT22-016", as: "recipient" },
          ],
          hand: [
            { card: "BT21-009", as: "eligible" },
            { card: "BT22-016", as: "noLink" },
          ],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const eligibleId = s.inst("eligible").instanceId;
    const invalidId = s.inst("noLink").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("recipient").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("recipient").linked.some((card) => card.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === invalidId)).toBe(true);
  });

  it("does not pay Delay when a non-Appmon Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [{ card: "BT21-009", as: "eligible" }],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.perm("attacker").linked).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("does not pay Delay for an opponent-controlled Appmon suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-093", as: "option" }],
          security: 2,
        },
        1: { battleArea: [{ card: "BT22-016", as: "opponentAttacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("opponentAttacker").linked).toHaveLength(0);
  });

  it("links an Appmon card from hand to the suspending Appmon Digimon", () => {
    const delay = compiled.effects.find((effect) =>
      effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    const link = delay.actions[0].actions[0];
    expect(link).toMatchObject({ kind: "Link", from: ["hand"], optional: true });
    expect(link.target.filter.nameOrTrait).toEqual([{ tokens: ["Appmon"], match: "trait" }]);
    expect(link.recipient).toEqual({ filter: { isTriggerSource: true }, count: 1 });
    expect(link.linkCardFilter).toBeUndefined();
  });
});
