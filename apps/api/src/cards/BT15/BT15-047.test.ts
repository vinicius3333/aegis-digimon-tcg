import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-047.js";

describe("BT15-047", () => {
  it("makes this suspended Digimon immune to opponent Digimon effects", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "selfIsSuspended" } },
      ],
    }));
  it("gains 1 memory once per turn when this Digimon deletes in battle", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", sourceFilter: { isSelfRef: true } }],
    }));

  it("grants Digimon-effect immunity only while suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-047", as: "kabuterimon", suspended: true }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestrictedByEffect(s.perm("kabuterimon"), "beAffected", "Digimon")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("kabuterimon").permanentId]);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("kabuterimon"), "beAffected", "Digimon")).toBe(false);
  });

  it("digivolves legally from a green level-3 Digimon and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-065", as: "base" }],
        hand: [{ card: "BT15-047", as: "kabuterimon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-047");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-065"]);
  });
});
