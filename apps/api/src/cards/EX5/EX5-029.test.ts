import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-029.js";
import "../index.js";

describe("EX5-029 Reppamon", () => {
  it("can trash the top security card to reduce digivolution cost by two while attacking", () => {
    const action = compiled.effects?.filter((entry) => entry.trigger === "WhenAttacking")[0]?.actions?.[0];
    expect(action).toMatchObject({
      kind: "CostModifier",
      mode: "reduce",
      costType: "digivolve",
      amount: 2,
      duration: "nextDigivolveThisTurn",
      optional: false,
      cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" } } },
    });
  });
  it("inherits -2000 DP with six or fewer combined security cards", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "WhenAttacking")[1]).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, condition: { kind: "totalSecurityCount", op: "lte", value: 6 } }],
    });
  });

  it("pays the security cost once and reduces the next public digivolution by two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-029", as: "reppamon" }],
          hand: [
            { card: "BT1-057", as: "evolving" },
            { card: "BT1-058", as: "handWitness" },
          ],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reppamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("reppamon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reppamon").topCard?.cardId === "BT1-057");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handWitness").instanceId)).toBe(true);
  });

  it("applies inherited DP reduction only at six or fewer total security cards", async () => {
    const qualifying = setupEngine({
      0: {
        battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-029"] }],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await qualifying.ready();
    await advance(qualifying.engine).fire(EffectTiming.OnUseAttack, qualifying.perm("host"));
    await settle(() => qualifying.perm("target").currentDP === 3000);
    expect(qualifying.perm("target").currentDP).toBe(3000);

    const overLimit = setupEngine({
      0: {
        battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-029"] }],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await overLimit.ready();
    await advance(overLimit.engine).fire(EffectTiming.OnUseAttack, overLimit.perm("host"));
    await settle();
    expect(overLimit.perm("target").currentDP).toBe(5000);
  });
});
