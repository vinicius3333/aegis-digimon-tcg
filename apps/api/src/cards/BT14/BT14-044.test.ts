import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-044.js";

describe("BT14-044", () => {
  it("makes an opposing Digimon lose two memory when suspended until the opponent's turn end", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      duration: "untilOpponentTurnEnd",
      effectText: expect.stringContaining("lose 2 memory"),
    }));
  it("inherits a once-per-turn green-Tamer digivolution cost reduction", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          actions: [{ mode: "reduceCost", amount: 1, condition: { kind: "youHave", filter: { colors: ["Green"] } } }],
        },
      ],
    }));

  it("naturally grants the timed suspension penalty before a real opposing suspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-044", as: "palmon" }], hand: [{ card: "BT14-043", as: "koDokugumon" }] },
        1: { battleArea: [{ card: "BT14-042", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koDokugumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("palmon").isSuspended).toBe(true);
    expect(s.state.memory).toBe(9);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("naturally reduces one qualifying evolution from an inherited Palmon source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-045", as: "host", under: ["BT14-044"] }, { card: "BT1-089", as: "mimi" }],
        hand: [{ card: "BT14-050", as: "piximon" }],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("piximon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT14-050");
    expect(s.state.memory).toBe(8);
  });
});
