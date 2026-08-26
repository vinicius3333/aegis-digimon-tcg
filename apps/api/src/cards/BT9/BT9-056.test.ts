import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-056.js";

describe("BT9-056 Dinotigermon", () => {
  it("matches catalog and Q1852 exact-X, Leomon-name, opponent-suspend IR", () => {
    expect(getCardDefinition("BT9-056")).toMatchObject({
      cardId: "BT9-056", nameEn: "Dinotigermon", colors: ["Green"], kinds: ["Digimon"], level: 6,
      playCost: 12, dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }, { color: "Blue", level: 5, memoryCost: 4 }],
      forms: ["Mega"], attributes: ["Data"], types: ["Ancient Animal", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["SaberLeomon"], cost: 1, isAlternate: false }],
      effects: [
        { trigger: "WhenAttacking", actions: [{ kind: "Suspend", condition: { kind: "selfDigivolutionStackHasTrait" } }] },
        { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, actions: [{ kind: "Unsuspend", optional: true }] }] },
      ],
    });
  });

  it("suspends an opposing Digimon or Tamer when attacking with Leomon or X Antibody in its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-056", as: "dino", under: ["BT9-050"] }] },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("dino"));
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("keeps [Leomon] in its name as substring but requires exact [X Antibody]", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-056", as: "dino", under: ["BT9-024"] }] },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("dino"));

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("once per turn may unsuspend when an opposing Digimon or Tamer becomes suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-056", as: "dino", suspended: true }] },
        1: { battleArea: [{ card: "BT1-028", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("target").permanentId });
    expect(s.perm("dino").isSuspended).toBe(false);
  });
});
