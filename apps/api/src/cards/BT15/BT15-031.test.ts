import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-031.js";

describe("BT15-031", () => {
  it("retains inherited Blocker", () =>
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Blocker" }],
    }));
  it("returns an opposing level 5 or lower Digimon on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Return", to: "hand", target: { filter: { levelComparison: { op: "lte", value: 5 } } } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Return", to: "hand" }],
    });
  });
  it("deletes itself at the opponent's end step to play a non-MetalSeadramon Dark Masters", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    }));

  it("returns exactly one opposing level-5-or-lower Digimon on play while level 6 remains", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-031", as: "metalSeadramon" }] },
        1: {
          battleArea: [
            { card: "BT15-029", as: "levelFive" },
            { card: "BT15-031", as: "levelSix" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("metalSeadramon"));
    await settle(() =>
      s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("levelFive").instanceId),
    );

    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("levelFive").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("levelSix").permanentId,
    );
  });

  it("returns a level-5 target when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-031", as: "metalSeadramon" }] },
        1: { battleArea: [{ card: "BT15-029", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalSeadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("target").instanceId));

    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
  });

  it("during its owner's turn permits only white Digimon as digivolution targets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-031", as: "metalSeadramon" }],
        hand: [
          { card: "BT1-084", as: "whiteOmnimon" },
          { card: "BT13-033", as: "blueBurstMode" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.inst("whiteOmnimon").digivolveTargetPermanentIds).toContain(s.perm("metalSeadramon").permanentId);
    expect(s.inst("blueBurstMode").digivolveTargetPermanentIds).not.toContain(s.perm("metalSeadramon").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metalSeadramon").permanentId,
        instanceId: s.inst("blueBurstMode").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("at opponent turn end deletes itself before optionally playing a different Dark Master for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-031", as: "metalSeadramon" }],
          hand: [
            { card: "BT15-052", as: "puppetmon" },
            { card: "BT15-031", as: "excludedMetalSeadramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("metalSeadramon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-052"));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("metalSeadramon").instanceId,
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-052");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("excludedMetalSeadramon").instanceId,
    );
  });

  it("resolves the opponent end step through public turn progression", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-031", as: "metalSeadramon" }],
          hand: [{ card: "BT15-052", as: "puppetmon" }],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 4;

    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("metalSeadramon").instanceId,
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-052");
  });

  it("grants inherited Blocker to its host and redirects a player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-025", as: "attacker" }], security: ["BT1-001"] },
      1: {
        battleArea: [{ card: "BT15-025", as: "host", under: ["BT15-031"] }],
        security: ["BT1-001"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
