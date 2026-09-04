import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { makeInstance, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-025.js";
import "../index.js";

describe("EX5-025 Dianamon", () => {
  it("has Blocker and once-per-turn shared When Digivolving/When Attacking effects", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Blocker" },
    ]);
    const digivolving = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    const attacking = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(digivolving).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        { kind: "TrashDigivolution" },
        { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" },
      ],
    });
    expect(attacking).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    expect(digivolving?.actions?.[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 1,
      scope: "acrossDigimon",
      scaling: { per: 1, unit: "digivolutionCards" },
    });
    expect(digivolving?.actions?.[1]).toMatchObject({
      target: { filter: { controllerDefault: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: "all" },
      whileMatchesTargetFilter: true,
    });
  });
  it("queues one pooled selection per own source across opposing Digimon", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0];
    expect(action).toMatchObject({ kind: "TrashDigivolution", scope: "acrossDigimon", amount: 1 });
    expect(action?.scaling).toMatchObject({ unit: "digivolutionCards", filter: { controllerDefault: "mine" } });
  });
  it("unsuspends once per turn when an opponent's Digimon loses a digivolution card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true } } }],
        },
      ],
    });
  });

  it("releases an opponent Digimon that gains a source after the live lock, per Q3587", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-025", as: "dianamon" }] },
        1: { battleArea: [{ card: "BT1-080", as: "bare" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dianamon"));
    await settle(() => observe(s.engine).isRestricted(s.perm("bare").permanentId, "beSuspended"), 2000);
    expect(observe(s.engine).isRestricted(s.perm("bare").permanentId, "beSuspended")).toBe(true);

    // A later source-less opponent enters the same live set (Q3586).
    const bare = s.perm("bare");
    const later = s.putOnBoard(1, { card: "BT2-064", dp: bare.currentDP });
    later.permanentId = "PERM#later-bare";
    expect(later.controllerSeat).toBe(1);
    expect(later.stack).toHaveLength(0);
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(later.permanentId, "beSuspended")).toBe(true);

    s.perm("bare").stack.push(makeInstance("BT1-010", 1, true));
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("bare").permanentId, "beSuspended")).toBe(false);
  });

  it("trashes one source per own digivolution card, restricts bare opponents, and shares once-per-turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-025", as: "dianamon", under: ["BT1-009", "BT1-010"], suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "first", under: ["BT1-009", "BT1-010"] },
            { card: "BT1-031", as: "second", under: ["BT1-009"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dianamon"));
    await settle(() => s.perm("first").stack.length + s.perm("second").stack.length === 1);
    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(1);
    expect(
      ["first", "second"].filter((name) => observe(s.engine).isRestricted(s.perm(name).permanentId, "beSuspended")),
    ).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("dianamon"));
    await settle();
    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(1);
  });
});
