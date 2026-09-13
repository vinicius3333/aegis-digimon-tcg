import { describe, expect, it } from "vitest";
import { getCompiledCard, Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
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
        0: { battleArea: [{ card: "P-137", as: "flamedramon" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
        1: {
          battleArea: [{ card: "ST18-07", as: "blocker" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: [{ card: "BT1-009", as: "security" }],
        },
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
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("security").instanceId));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
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
        1: { battleArea: [{ card: "ST18-07", as: "blocker" }], security: ["BT1-009"] },
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

  it("resets the target-switch trigger on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-137", as: "flamedramon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          hand: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "ST18-07", as: "blocker1" },
            { card: "ST18-07", as: "blocker2" },
            { card: "ST18-07", as: "blocker3" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          hand: ["BT1-009"],
          security: [
            { card: "BT1-009", as: "security1" },
            { card: "BT1-009", as: "security2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const attack = async () => {
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.turnSeat).toBe(0);
      const combatCount = s.events.filter((event) => event.kind === "combatResolved").length;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("flamedramon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
      const blocker = `blocker${s.events.filter((event) => event.kind === "combatResolved").length + 1}`;
      expect(
        s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm(blocker).permanentId }),
      ).toEqual({
        ok: true,
      });
      await settle(() => s.events.filter((event) => event.kind === "combatResolved").length > combatCount);
    };

    await attack();
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("security1").instanceId)).toBe(true);

    // Prepare a second legal attack in the same turn without changing any trigger ledger.
    await advance(s.engine).verb.unsuspend([s.perm("flamedramon").permanentId, s.perm("blocker2").permanentId]);
    await attack();
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("security2").instanceId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    await attack();
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("security2").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
