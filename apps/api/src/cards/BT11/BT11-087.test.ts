import { describe, it, expect } from "vitest";
import { getCardDefinition, Phase, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./BT11-087.js";
import "../index.js";

describe("BT11-087 Lilithmon [On Play]", () => {
  it("maps catalog facts and both printed effects to IR", () => {
    expect(getCardDefinition("BT11-087")).toMatchObject({
      cardId: "BT11-087",
      colors: ["Purple"],
      level: 6,
      playCost: 11,
      dp: 12000,
      types: ["Demon Lord", "Bagra Army"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [{ kind: "TrashTopDeck", amount: 4 }, { kind: "Return", to: "hand" }, { kind: "PlaceUnder" }],
      },
      {
        trigger: "OpponentsTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenMovedFromBreeding",
            actions: [{ kind: "GainTriggeredEffect", target: { sourceRef: "triggerSubject" } }],
          },
        ],
      },
    ]);
  });

  it("has complete registered IR coverage", () => {
    const registered = runtimeCompiledCard("BT11-087")!;
    expect(registered.coverage).toBe("full");
    expect(registered.residual).toHaveLength(0);
  });

  it("mills top 4, then adds a Bagra Army card to hand, then places a Bagra Digimon under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", dp: 0, as: "tamer" }],
          deck: [
            { card: "BT10-076" },
            { card: "BT10-073" },
            { card: "BT10-076", as: "troopmon" },
            { card: "BT10-073", as: "chuumon" },
          ],
          hand: [{ card: "BT11-087", as: "lilithmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    const lilithmon = s.inst("lilithmon");
    s.state.memory = 8;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: lilithmon.instanceId,
    });

    expect(result).toEqual({ ok: true });

    await settle(
      () =>
        p0.hand.filter((c) => c.cardId === "BT10-076" || c.cardId === "BT10-073").length === 2 &&
        s.perm("tamer").stack.length === 2,
    );

    expect(p0.hand.filter((c) => c.cardId === "BT10-076" || c.cardId === "BT10-073")).toHaveLength(2);
    expect(s.perm("tamer").stack).toHaveLength(2);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT11-087")).toBe(true);
  });
});

describe("BT11-087 Lilithmon [Opponent's Turn] — real engine: breeding move grants a temporary attack-time memory loss", () => {
  it("trashes 1 digivolution card on the opponent's breeding->battle move, then the moved Digimon loses 3 memory when it attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-087", dp: 12000, as: "lilithmon", under: ["AD1-001"] }],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          breeding: { card: "BT1-009", dp: 3000, as: "mover" },
          battleArea: [{ card: "BT1-010", dp: 3000, as: "other" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const lilithmon = s.perm("lilithmon");
    expect(lilithmon.stack).toHaveLength(1);

    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 1;
    s.state.memory = 3;

    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });

    await settle(() => s.perm("lilithmon").stack.length === 0, 200);
    expect(s.perm("lilithmon").stack).toHaveLength(0);

    s.state.phase = Phase.Main;
    const mover = s.perm("mover");
    expect(mover.isSuspended).toBe(false);

    const memoryFor = (seat: 0 | 1): number => (seat === s.state.turnSeat ? s.state.memory : -s.state.memory) || 0;
    expect(memoryFor(1)).toBe(3);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: mover.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => memoryFor(1) !== 0, 200);

    expect(memoryFor(1)).toBe(0);
    expect(memoryFor(0)).toBe(0);
    expect(mover.isSuspended).toBe(true);

    const other = s.perm("other");
    expect(other.isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: other.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => other.isSuspended, 200);
    expect(memoryFor(1)).toBe(0);
    assertNoLoudGap(s);
  });

  it("does not react when Lilithmon's controller moves their own Digimon from breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-087", dp: 12000, as: "lilithmon", under: ["AD1-001"] }],
          breeding: { card: "BT1-009", dp: 3000, as: "mover" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 0;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });

    await settle(() => s.perm("lilithmon").stack.length === 1, 200);
    expect(s.perm("lilithmon").stack).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
