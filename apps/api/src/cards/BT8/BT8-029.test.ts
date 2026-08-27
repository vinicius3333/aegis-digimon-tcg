import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-029.js";
import "./BT8-022.js";
import "../ST5/ST5-13.js";

describe("BT8-029 Frozomon", () => {
  it("has Blocker and can't attack while the opponent has a Digimon with sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-029", as: "frozomon" }] },
      1: { battleArea: [{ card: "BT8-042", under: ["BT8-034"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("frozomon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("frozomon").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("can attack when the opponent's only sourced Digimon is in breeding", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-029", as: "frozomon" }] },
      1: {
        breeding: { card: "BT8-021", as: "breeding", under: ["BT8-002"] },
        security: ["BT8-034"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("frozomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.breeding?.permanentId).toBe(s.perm("breeding").permanentId);
  });

  it("returns an opposing level 3 when an opponent's digivolution card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-031", as: "host", under: ["BT8-029"] }, "BT8-021"],
          hand: [{ card: "BT8-022", as: "snowAgumon" }],
        },
        1: {
          battleArea: [
            { card: "BT8-042", as: "sourceTarget", under: ["BT8-034"] },
            { card: "BT8-033", as: "returned" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const returnedId = s.perm("returned").topCard.instanceId;
    await s.ready();
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("snowAgumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === returnedId));
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });

  it("returns an opposing level 3 when the opponent pays a Digi-Burst cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-031", as: "host", under: ["BT8-029"] }] },
        1: {
          battleArea: [
            { card: "ST5-13", as: "digiBurst", under: ["ST5-03", "ST5-08"] },
            { card: "BT8-033", as: "returned" },
            { card: "ST5-03", as: "boostTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const returnedId = s.perm("returned").topCard.instanceId;
    const source = (s.engine as any).cardSourceOf(s.perm("digiBurst").topCard);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("ST5-13/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(1, {
        type: "activateEffect",
        sourceInstanceId: s.perm("digiBurst").topCard.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === returnedId));

    expect(s.perm("digiBurst").stack).toHaveLength(0);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === returnedId)).toBe(true);
  });
});
