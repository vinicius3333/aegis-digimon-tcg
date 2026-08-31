import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-137.js";

describe("P-137 Flamedramon", () => {
  it("digivolves from Veemon and exposes Armor Purge and Raid", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-023", as: "veemon" }], hand: [{ card: "P-137", as: "flamedramon" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.instanceId === s.inst("flamedramon").instanceId);
    expect(getCompiledCard("P-137")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
      ]),
    );
    expect(getCompiledCard("P-137")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
        expect.objectContaining({
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenAttackTargetSwitched",
              sourceFilter: { isSelfRef: true },
              actions: [{ kind: "SecurityManipulation", op: "toHand", controller: "opponent", amount: 1 }],
            },
          ],
        }),
      ]),
    );
    assertNoLoudGap(s);
  });

  it("moves the opponent's top security card to hand when its attack target switches", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-137", as: "flamedramon" }] },
        1: { battleArea: [{ card: "ST18-07", as: "blocker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("flamedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-001"));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("does not react when another Digimon's attack target switches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-137", as: "flamedramon" },
            { card: "ST18-08", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "ST18-07", as: "blocker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
