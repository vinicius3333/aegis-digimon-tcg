import { describe, it, expect } from "vitest";
import { EffectTiming, type AttackTarget } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// A3 for P-169 (Close, Black Tamer) — its [Security] clause: "Play this card without
// paying the cost."
//
// FAILS-WHEN-REVERTED: the module had no EffectTiming.SecuritySkill branch at all — the
// printed [Security] ability was entirely unported, so a security check against this card
// only revealed and trashed it (per the default security-check flow) instead of playing
// it onto the battle area for free.
describe("P-169 [Security] play this card without paying the cost", () => {
  it("plays the Tamer onto the battle area during a security check, at no memory cost", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-169", as: "secCard" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    const attacker = s.perm("attacker");
    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" } satisfies AttackTarget,
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "P-169"), 600);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "P-169")).toBe(true);
    const secCard = s.inst("secCard");
    expect(p0.security.some((c) => c.instanceId === secCard.instanceId)).toBe(false);
    expect(s.state.memory).toBe(0); // played for free, no memory cost paid
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("secCard"));
    await settle();
    expect(s.state.memory).toBe(1);
  });
});

describe("P-169 [All Turns] digivolution-trash reaction", () => {
  it("Q4277 filters the affected host, not the identity of the trashed source card", () => {
    const effect = runtimeCompiledCard("P-169")!.effects.find((entry) => entry.trigger === "AllTurns")!;
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDigivolutionTrashed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
      },
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Mineral", "Rock"] }] } },
          underFilter: { controller: "mine", kind: ["Digimon"] },
          cost: { kind: "suspend", target: { isSelf: true } },
        },
      ],
    });
  });

  it("publicly places a Mineral card from trash under the qualifying host after effect trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-169", as: "close" },
            { card: "BT10-062", as: "host", under: ["BT1-009"] },
          ],
          trash: [{ card: "BT10-062", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const source = s.perm("host").stack[0]!;
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [source.instanceId], 0);
    await settle(() => s.perm("close").isSuspended && s.perm("host").stack.some((card) => card.cardId === "BT10-062"));
    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
  });

  it("does not react to the same stack-card trash when no effect provenance is supplied", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-169", as: "close" },
          { card: "BT10-062", as: "host", under: ["BT1-009"] },
        ],
        trash: [{ card: "BT10-062", as: "recovered" }],
      },
    });
    await s.ready();
    const source = s.perm("host").stack[0]!;
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [source.instanceId]);
    await settle();
    expect(s.perm("close").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
  });
});
