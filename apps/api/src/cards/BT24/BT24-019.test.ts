import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-019.js";
import "../index.js";

describe("BT24-019 Kamemon", () => {
  it("reduces this Digimon's blue TS digivolution cost during your turn", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions?.[0];
    expect(replacement?.kind).toBe("Replacement");
    if (replacement?.kind !== "Replacement") throw new Error("Your Turn action is not a replacement");
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
    });
    expect(replacement.into).toMatchObject({ colors: ["Blue"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] });
    expect(replacement.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      mode: "reduceCost",
      amount: 1,
    });
  });

  it("retains inherited Jamming", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });

  it("keeps a Jamming host after losing a public security battle to higher DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-022", as: "attacker", under: ["BT24-019"] }] },
      1: { security: [{ card: "BT24-051", as: "securityDigimon" }], deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(attackerId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityDigimon").instanceId);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces a blue TS evolution from cost 2 to 1 in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-019", as: "kamemon" }],
        hand: [{ card: "BT24-022", as: "ikkakumon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kamemon").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kamemon").topCard.instanceId === s.inst("ikkakumon").instanceId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("kamemon").topCard.instanceId).toBe(s.inst("ikkakumon").instanceId);
    expect(s.perm("kamemon").stack.map((card) => card.instanceId)).toContain(s.inst("kamemon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("does not reduce the same evolution in the breeding area (Q5601)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-019", as: "kamemon" },
        hand: [{ card: "BT24-022", as: "ikkakumon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kamemon").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kamemon").topCard.instanceId === s.inst("ikkakumon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("kamemon").topCard.instanceId).toBe(s.inst("ikkakumon").instanceId);
    expect(s.perm("kamemon").stack.map((card) => card.instanceId)).toEqual([s.inst("kamemon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("does not reduce a blue Digimon without the TS trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-019", as: "kamemon" }], hand: [{ card: "BT1-032", as: "frigimon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kamemon").permanentId,
        instanceId: s.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kamemon").topCard.instanceId === s.inst("frigimon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("does not reduce a red TS Digimon when the replacement requires blue", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-019", as: "kamemon" }], hand: [{ card: "BT24-011", as: "redTs" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kamemon").permanentId,
        instanceId: s.inst("redTs").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kamemon").topCard.instanceId === s.inst("redTs").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("kamemon").stack.map((card) => card.instanceId)).toEqual([s.inst("kamemon").instanceId]);
  });

  it("digivolves from a non-blue level 2 TS Digi-Egg for cost 0 and grants inherited Jamming", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-003", as: "tsEgg" },
        hand: [{ card: "BT24-019", as: "kamemon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
        battleArea: [{ card: "BT24-022", as: "host", under: ["BT24-019"] }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsEgg").permanentId,
        instanceId: s.inst("kamemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsEgg").topCard.instanceId === s.inst("kamemon").instanceId);

    expect(s.state.memory).toBe(5);
    expect(s.perm("tsEgg").topCard.instanceId).toBe(s.inst("kamemon").instanceId);
    expect(s.perm("tsEgg").stack.map((card) => card.instanceId)).toEqual([s.inst("tsEgg").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });
});
