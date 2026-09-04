import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-05.js";
import "./ST9-06.js";

describe("ST9-06 Imperialdramon: Dragon Mode", () => {
  it("plays eligible blue and green level-4 sources when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-05", as: "base", under: ["ST9-04", "ST9-09"] }],
          hand: [{ card: "ST9-06", as: "dragon" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(
      expect.arrayContaining(["ST9-04", "ST9-09"]),
    );
  });

  it("ignores eligible sources under another friendly Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-05", as: "base", under: ["ST9-09"] },
            { card: "ST9-05", as: "bystander", under: ["ST9-04"] },
          ],
          hand: [{ card: "ST9-06", as: "dragon" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const bystanderStack = s.perm("bystander").stack.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.perm("bystander").stack.map((card) => card.instanceId)).toEqual(bystanderStack);
    const playedInstanceIds = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
    for (const instanceId of bystanderStack) expect(playedInstanceIds).not.toContain(instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["ST9-06", "ST9-09"]),
    );
  });

  it("plays neither eligible source when its optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-05", as: "base", under: ["ST9-04", "ST9-09"] }],
          hand: [{ card: "ST9-06", as: "dragon" }],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST9-06");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST9-04", "ST9-09"]));
  });

  it("executes the full Imperialdramon DNA line through two attacks and source replay", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-04", as: "exVeemon" },
            { card: "ST9-09", as: "stingmon" },
          ],
          hand: [
            { card: "ST9-05", as: "paildramon" },
            { card: "ST9-06", as: "dragonMode" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "returnTarget" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
          deck: ["BT1-005"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 4;
    const targetCardId = s.perm("returnTarget").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("exVeemon").permanentId, s.perm("stingmon").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.deck.some((card) => card.instanceId === targetCardId) &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("paildramon").instanceId,
        ),
    );
    const imperial = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("paildramon").instanceId,
    )!;

    for (let attack = 0; attack < 2; attack += 1) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: imperial.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking &&
          s.state.players[1]!.security.length === 3 - attack,
      );
    }

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: imperial.permanentId,
        instanceId: s.inst("dragonMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["ST9-06", "ST9-04", "ST9-09"]),
    );
    expect(imperial.stack.map((card) => card.cardId)).toContain("ST9-05");
    expect(s.state.memory).toBe(0);
  });
});
