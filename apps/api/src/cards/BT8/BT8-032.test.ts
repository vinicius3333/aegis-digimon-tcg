import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST9/ST9-05.js";
import "./BT8-032.js";

describe("BT8-032 Imperialdramon: Fighter Mode", () => {
  it("returns an opposing 10000-DP-or-less Digimon to hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT8-032", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.hand.some((card) => card.cardId === "BT2-047"));
    expect(opponent.battleArea).toHaveLength(0);
  });

  it("unsuspends one of yours and suspends an opponent when both blue and green cards are in its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-032", as: "attacker", under: ["BT1-029", "BT1-064"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-011"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended && s.perm("target").isSuspended);

    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("uses both colors after the real Imperialdramon DNA evolution line", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-04", as: "blueMaterial" },
            { card: "ST9-09", as: "greenMaterial" },
          ],
          hand: [
            { card: "ST9-05", as: "paildramon" },
            { card: "BT8-032", as: "fighterMode" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "bottomDeckTarget" },
            { card: "BT2-047", as: "returnTarget" },
            { card: "BT1-010", as: "suspendTarget" },
          ],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-003"],
        },
      },
      {
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    s.state.memory = 5;
    preferred.push(
      s.perm("bottomDeckTarget").permanentId,
      s.perm("returnTarget").permanentId,
      s.perm("suspendTarget").permanentId,
    );
    const bottomDeckId = s.perm("bottomDeckTarget").topCard.instanceId;
    const returnId = s.perm("returnTarget").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueMaterial").permanentId, s.perm("greenMaterial").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === bottomDeckId));
    const imperial = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("paildramon").instanceId,
    )!;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: imperial.permanentId,
        instanceId: s.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === returnId));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: imperial.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !imperial.isSuspended &&
        s.perm("suspendTarget").isSuspended &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    expect(imperial.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST9-05", "ST9-04", "ST9-09"]));
    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("activates both attack clauses from one blue-green source", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-032", as: "attacker", under: ["ST9-05"] },
            { card: "BT1-029", as: "ally", suspended: true },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponent" }],
          security: ["BT1-011"],
        },
      },
      {
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("ally").permanentId, s.perm("opponent").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("ally").isSuspended && s.perm("opponent").isSuspended);

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("digivolves for 2 from a Digimon with Dragon Mode in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST9-06", as: "dragonMode" }],
        hand: [{ card: "BT8-032", as: "fighterMode" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dragonMode").permanentId,
        instanceId: s.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("dragonMode").topCard.instanceId).toBe(s.inst("fighterMode").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
