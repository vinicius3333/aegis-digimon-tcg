import { describe, expect, it } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-096.js";
import "../index.js";

describe("BT21-096 The Champion Ultimate Fighter!", () => {
  it("turns a Marcus Damon into a 12000 DP Rush Digimon and starts its Digimon attack", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "color" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== targetId));

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("marcus"))).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("targets the chosen Marcus permanent and carries the temporary Digimon grants", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      { kind: "SelectBind", target: { bindAs: "chosenMarcus" } },
      { kind: "GrantStatic", grant: "kind", tokens: ["Digimon"], staticEffect: { value: 12000 } },
      { kind: "Restrict", restriction: "digivolve" },
      { kind: "GainKeyword", keyword: { keyword: "Rush" } },
      { kind: "GrantCanAttackUnsuspended" },
      { kind: "Attack", attackPlayer: false, optional: true },
    ]);
  });

  it("Q4620 may decline the attack while retaining the temporary Digimon treatment", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "color" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").currentDP === 12000);
    expect(s.perm("marcus").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
  });

  it("publicly declines the optional attack against an unsuspended opponent Digimon", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT4-092", as: "marcus" },
            { card: "BT2-033", as: "yellow" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("opponentTarget").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT21-096"));
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.state.memory).toBe(6);
    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(s.perm("marcus").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("marcus"))).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("Security plays Marcus from trash for free, then adds itself to hand", async () => {
    const s = setup(
      {
        0: {
          security: [{ card: "BT21-096", as: "option" }],
          trash: [{ card: "BT4-092", as: "marcus" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("marcus").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("Security also plays an eligible Marcus from hand and returns the Option", async () => {
    const s = setup(
      {
        0: {
          security: [{ card: "BT21-096", as: "option" }],
          hand: [{ card: "BT4-092", as: "marcus" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("marcus").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
