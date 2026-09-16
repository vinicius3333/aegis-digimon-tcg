import { getCardDefinition, getCompiledCard, type AttackTarget } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT2-094.js";

describe("BT2-094 Arctic Blizzard", () => {
  it("matches its official Option and Security text through a direct module import", () => {
    expect(compiled).toBeDefined();
    expect(getCardDefinition("BT2-094")).toMatchObject({
      nameEn: "Arctic Blizzard",
      colors: ["Blue"],
      playCost: 2,
      effectText: expect.stringContaining("Choose 1 digivolution card"),
      securityEffectText: "[Security] Add this card to your hand.",
    });
  });

  it("publishes the executable source-selection primitive with full coverage", () => {
    expect(getCompiledCard("BT2-094")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            { kind: "TrashDigivolution", amount: 1, choose: true },
            { kind: "ModifyDP", amount: 2000 },
          ],
        },
        { trigger: "Security", actions: [{ kind: "AddToHandSelf" }] },
      ],
    });
  });

  it("[Main] trashes 1 digivolution card from opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "buffTarget" },
            { card: "BT1-027", dp: 3000 },
          ],
          hand: [{ card: "BT2-094", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-057", dp: 5000, as: "oppDigimon", under: [{ card: "BT1-051", as: "divoCard" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1];
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    const divoCardId = s.inst("divoCard").instanceId;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: optionId,
    });
    expect(res).toEqual({ ok: true });

    await settle(
      () => (p1?.trash.some((c) => c.instanceId === divoCardId) ?? false) && s.perm("buffTarget").currentDP === 5000,
    );

    expect(p1?.trash.some((c) => c.instanceId === divoCardId)).toBe(true);
    expect(s.perm("oppDigimon").stack.some((c) => c.instanceId === divoCardId)).toBe(false);
    expect(s.perm("buffTarget").currentDP).toBe(5000);
  });

  it("still gives +2000 DP when the opponent has no digivolution cards to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "buffTarget" },
            { card: "BT1-027", dp: 3000 },
          ],
          hand: [{ card: "BT2-094", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-057", as: "noSources" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("buffTarget").currentDP === 5000);
    expect(s.perm("noSources").stack).toHaveLength(0);
  });

  it("still trashes the opposing source when there is no own Digimon to receive the DP bonus", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-085", as: "blueTamer" }],
          hand: [{ card: "BT2-094", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-057", as: "opponent", under: [{ card: "BT1-051", as: "source" }] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === sourceId));

    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("[Security] adds this card to its owner's hand", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT2-094", as: "secCard" }] },
      1: { battleArea: [{ card: "BT1-057", dp: 5000, as: "attacker" }] },
    });
    const p0 = s.state.players[0];
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const secCardId = s.inst("secCard").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" } satisfies AttackTarget,
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0?.hand.some((c) => c.instanceId === secCardId) ?? false);

    expect(p0?.hand.some((c) => c.instanceId === secCardId)).toBe(true);
    expect(p0?.security.some((c) => c.instanceId === secCardId)).toBe(false);
  });
});
