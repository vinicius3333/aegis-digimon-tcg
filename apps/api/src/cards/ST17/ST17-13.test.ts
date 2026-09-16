import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("ST17-13 Magnamon [When Digivolving] — trash digi-cards per color, bounce no-stack Digimon", () => {
  it("uses the alternate Veemon route for 3 memory, draws, and preserves physical stack identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-023", as: "veemon" }],
          hand: [{ card: "ST17-13", as: "magnamon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.instanceId === s.inst("magnamon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("veemon").topCard.cardId).toBe("ST17-13");
    expect(s.perm("veemon").stack.map((card) => card.instanceId)).toEqual([s.inst("veemon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("keeps the printed blue Lv.3 route at its normal cost of 4", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-023", as: "veemon" }], hand: [{ card: "ST17-13", as: "magnamon" }] },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.cardId === "ST17-13");
    expect(s.state.memory).toBe(0);
  });

  it("rejects a near-name ExVeemon base at the invalid level boundary instead of using cost 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-022", as: "exveemon" }],
          hand: [{ card: "ST17-13", as: "magnamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("exveemon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(10);
    expect(s.perm("exveemon").topCard.cardId).toBe("BT12-022");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("magnamon").instanceId);
  });

  it("trashes digi-cards equal to opponent Digimon's color count, bounces a no-stack Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-023", dp: 3000, as: "veemon" }], hand: [{ card: "ST17-13", as: "magnamon" }] },
        1: {
          battleArea: [
            {
              card: "AD1-004",
              dp: 8000,
              as: "oppDigimon",
              under: ["BT1-009", "BT1-014", "BT1-020"],
            },
            { card: "AD1-001", dp: 4000, as: "bounceTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const veemon = s.perm("veemon");
    const oppDigimon = s.perm("oppDigimon");
    const bounceTarget = s.perm("bounceTarget");
    const magnamonId = s.inst("magnamon").instanceId;

    const initialStack = oppDigimon.stack.length;
    const initialOppBattleCount = p1.battleArea.length;

    await primitivesOf(s).digivolveFromInstance(veemon.permanentId, magnamonId, { payCost: false });

    await settle(() => oppDigimon.stack.length < initialStack && p1.battleArea.length < initialOppBattleCount, 800);

    expect(oppDigimon.stack.length).toBe(initialStack - 2);
    expect(p1.trash.filter((card) => ["BT1-014", "BT1-020"].includes(card.cardId))).toHaveLength(2);

    expect(p1.battleArea.some((p) => p.permanentId === bounceTarget.permanentId)).toBe(false);
    expect(p1.hand.some((c) => c.cardId === "AD1-001")).toBe(true);
  });

  it("trashes exactly one top digi-card from a one-color target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-023", as: "veemon" }], hand: [{ card: "ST17-13", as: "magnamon" }] },
        1: {
          battleArea: [{ card: "BT1-020", as: "oneColor", under: ["BT1-009", "BT1-014"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const target = s.perm("oneColor");
    const before = target.stack.length;

    await primitivesOf(s).digivolveFromInstance(s.perm("veemon").permanentId, s.inst("magnamon").instanceId, {
      payCost: false,
    });
    await settle(() => target.stack.length < before);

    expect(target.stack).toHaveLength(before - 1);
  });
});

describe("ST17-13 Magnamon [Security] — end of security battle digivolution", () => {
  it("allows a legal own Digimon to digivolve into the checked card without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST8-09", as: "attacker", dp: 12000 }] },
        1: {
          battleArea: [{ card: "BT11-023", as: "veemon" }],
          security: [{ card: "ST17-13", as: "magnamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("veemon").topCard.cardId === "ST17-13", 3000);
    expect(s.perm("veemon").topCard.cardId).toBe("ST17-13");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT11-023")).toBe(false);
  });

  it("lets the security effect de-digivolve a chosen Digimon owned by the security player", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST8-09", as: "attacker" },
            { card: "BT1-037", as: "opponentTarget", under: ["BT11-023"], suspended: true },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-037", as: "ownTarget", under: ["BT11-023"] }],
          security: [{ card: "ST17-13", as: "checked" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: false },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets", 3000);
    expect(s.state.pendingDecision?.kind).toBe("chooseTargets");
    const targetOptions = s.decisions.at(-1)?.req.options?.candidateInstanceIds ?? [];
    expect(targetOptions).toEqual(
      expect.arrayContaining([s.perm("ownTarget").permanentId, s.perm("opponentTarget").permanentId]),
    );
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ownTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("ownTarget").stack.length === 0 &&
        s.state.players[1]!.security.length === 0 &&
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("checked").instanceId) &&
        s.state.pendingDecision === undefined,
      3000,
    );

    expect(s.perm("ownTarget").topCard.cardId).toBe("BT11-023");
    expect(s.perm("ownTarget").stack).toHaveLength(0);
  });

  it("does not substitute an unrelated matching Magnamon from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST8-09", as: "attacker", dp: 12000 }] },
        1: {
          battleArea: [{ card: "BT11-023", as: "veemon" }],
          security: [{ card: "ST17-13", as: "checked" }],
          trash: [{ card: "ST17-13", as: "unrelated" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerPermanentId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("veemon").topCard.cardId === "ST17-13", 3000);
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("checked").instanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("unrelated").instanceId)).toBe(true);
  });

  it("de-digivolves the attacking Digimon before the security battle continues", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST8-09", as: "attacker", dp: 12000, under: ["BT1-038"] }] },
        1: { security: [{ card: "ST17-13", as: "magnamon" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const attackerPermanentId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(
      () => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerPermanentId),
      3000,
    );
    expect(() => s.perm("attacker")).toThrow('permanent for "attacker"');
  });

  it("completes the security attack after refusing evolution and keeps the checked instance in trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST8-09", as: "attacker", dp: 12000 }] },
        1: {
          battleArea: [{ card: "BT11-023", as: "veemon" }],
          security: [{ card: "ST17-13", as: "checked" }],
          trash: [{ card: "ST17-13", as: "unrelated" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined, 3000);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("unrelated").instanceId,
      s.inst("checked").instanceId,
    ]);
    expect(s.perm("veemon").topCard.cardId).toBe("BT11-023");
    expect(s.perm("veemon").stack).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
  });
});
