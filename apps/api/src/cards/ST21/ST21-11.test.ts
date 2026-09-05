import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-11", () => {
  it("returns an opponent level 4 or lower Digimon with Tamer-color scaling", () => {
    const effects = runtimeCompiledCard("ST21-11")?.effects ?? [];
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = effects.find((effect) => effect.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({ kind: "Return", to: "deckBottom" });
      expect(irNode(action).target.filter.levelComparison).toEqual({ op: "lte", value: 4 });
      expect(irNode(action).target.filter.controller).toBe("opponent");
      expect(irNode(action).scaling).toMatchObject({ per: 2, unit: "colors", levelCeilingAdd: 1 });
    }
  });
  it("keeps Blast Digivolve and optional once-per-turn trash play", () => {
    const effects = runtimeCompiledCard("ST21-11")?.effects ?? [];
    expect(effects.find((effect) => effect.trigger === "Counter")?.keywords?.[0]!.keyword).toBe("BlastDigivolve");
    expect(effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn" });
    expect(effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
    });
  });

  it("returns a level-4 opponent to the bottom of the deck when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST21-09", as: "base" }], hand: [{ card: "ST21-11", as: "metal" }] },
        1: { battleArea: [{ card: "ST1-05", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    );
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
  });

  it("raises the return ceiling by one for two Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST21-09", as: "base" },
            { card: "ST21-12", as: "twoColorTamer" },
          ],
          hand: [{ card: "ST21-11", as: "metal" }],
        },
        1: { battleArea: [{ card: "ST21-09", as: "levelFiveTarget" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(
          (permanent) => permanent.permanentId === s.perm("levelFiveTarget").permanentId,
        ),
    );
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("levelFiveTarget").permanentId,
      ),
    ).toBe(false);
  });

  it("optionally plays a level-4-or-lower Digimon from trash when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST21-11", as: "host", under: ["ST21-09"] }],
          trash: [{ card: "ST21-07", as: "fromTrash" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("fromTrash").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("fromTrash").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("fromTrash").instanceId)).toBe(
      false,
    );
  });

  it("Blast Digivolves from hand during the opponent's attack without memory cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
        1: {
          battleArea: [{ card: "ST21-09", as: "base" }],
          security: ["BT1-001"],
          hand: [{ card: "ST21-11", as: "blast" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("blast").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST21-11");
    expect(s.perm("base").topCard.cardId).toBe("ST21-11");
    expect(s.state.memory).toBe(0);
  });
});
