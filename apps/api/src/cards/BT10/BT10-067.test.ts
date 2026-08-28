import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../EX2/EX2-038.js";
import "../EX2/EX2-062.js";
import "../BT8/BT8-059.js";
import { compiled } from "./BT10-067.js";

describe("BT10-067 Justimon: Critical Arm", () => {
  it("matches its catalog, alternate evolution, and exact two-effect IR", () => {
    const d = getCardDefinition("BT10-067")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Black"], 6, 11, 11000]);
    expect(d.evoCosts).toEqual([{ color: "Black", level: 5, memoryCost: 3 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Mega"], ["Vaccine"], ["Cyborg"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Justimon"], cost: 1, isAlternate: true }]);
    expect(compiled.effects.map(({ trigger }) => trigger)).toEqual(["WhenDigivolving", "WhenAttacking"]);
  });

  it("returns a different Justimon source to delete exactly one play-cost-9-or-less Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-038", as: "base" }],
          hand: [{ card: "BT10-067", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT10-026", as: "costNine" },
            { card: "BT1-080", as: "costTen" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("costNine").permanentId);
    const baseId = s.perm("base").topCard.instanceId;
    const costNineId = s.perm("costNine").permanentId;
    const costTenId = s.perm("costTen").permanentId;
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === costNineId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === baseId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === costTenId)).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("cannot pay the digivolution effect with another Critical Arm source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-067", as: "base" }],
          hand: [{ card: "BT10-067", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT10-026", as: "target" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-067"));

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT10-067");
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not offer its attack-time arm swap without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-067", as: "criticalArm" }],
          hand: [{ card: "EX2-038", as: "blitzArm" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    const blitzArmId = s.inst("blitzArm").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("criticalArm").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("criticalArm").topCard.cardId).toBe("BT10-067");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === blitzArmId)).toBe(true);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("uses a Tamer to swap arms for exactly 2 while the attack continues", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-067", as: "criticalArm" },
            { card: "EX2-062", as: "tamer" },
          ],
          hand: [{ card: "EX2-038", as: "blitzArm" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const criticalId = s.perm("criticalArm").topCard.instanceId;
    const blitzId = s.inst("blitzArm").instanceId;
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("criticalArm").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("criticalArm").topCard.instanceId).toBe(blitzId);
    expect(s.perm("criticalArm").stack.map(({ instanceId }) => instanceId)).toContain(criticalId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("obeys Q1742 when Kokuwamon prevents ignoring evolution requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-067", as: "criticalArm" },
            { card: "EX2-062", as: "tamer" },
          ],
          hand: [{ card: "EX2-038", as: "blitzArm" }],
        },
        1: { battleArea: [{ card: "BT8-059", as: "kokuwamon" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const blitzId = s.inst("blitzArm").instanceId;
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("criticalArm").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("criticalArm").topCard.cardId).toBe("BT10-067");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === blitzId)).toBe(true);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });
});
