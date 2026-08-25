import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-025.js";

describe("BT22-025 UlforceVeedramon", () => {
  it("keeps Blast Digivolve, the two On Play/When Digivolving modes, and once-per-turn self unsuspend", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Counter",
        isFromHand: true,
        keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        options: [
          [
            {
              kind: "Return",
              to: "deckBottom",
              target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
            },
          ],
          [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Blue"], playCostLte: 4 }, count: 1 },
            },
          ],
        ],
      });
    }
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(whenAttacking).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", optional: true, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
    });
  });

  it("returns exactly one lowest-level opponent Digimon to the deck bottom", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-025", as: "ulforce" }] },
        1: {
          battleArea: [
            { card: "BT22-022", as: "lowest" },
            { card: "BT22-023", as: "higher" },
          ],
          deck: ["BT1-001"],
        },
      },
      { preferOptionIndex: 0, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("higher").permanentId,
    ]);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT22-022");
  });

  it("uses the CS evolution route and optionally plays an eligible blue Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-023", as: "aero" }],
          hand: [
            { card: "BT22-025", as: "ulforce" },
            { card: "BT22-085", as: "rina" },
            { card: "BT1-086", as: "invalid" },
          ],
        },
      },
      { preferOptionIndex: 1, autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aero").permanentId,
        instanceId: s.inst("ulforce").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aero").topCard?.cardId === "BT22-025");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-085")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("invalid").instanceId]);
  });

  it("unsuspends itself when attacking only once per turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-025", as: "ulforce" }] } }, { autoAcceptOptional: true });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ulforce").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("ulforce").isSuspended);
    expect(s.perm("ulforce").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ulforce").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ulforce").isSuspended);
    expect(s.perm("ulforce").isSuspended).toBe(true);
  });
});
