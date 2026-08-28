import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-049.js";

describe("BT15-049", () => {
  it("marks the hand counter as Blast Digivolve", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    }));

  it("gives one of your Digimon +3000 DP and may redirect an attack on play or digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "ModifyDP", amount: 3000 },
        { kind: "RedirectAttack", condition: { kind: "duringAttack" }, optional: true },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: 3000 }, { kind: "RedirectAttack" }],
    });
  });
  it("makes itself immune to opponent Digimon effects while suspended", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "selfIsSuspended" } },
      ],
    }));

  it("grants immunity only while suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-049", as: "megakabuterimon", suspended: true }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestrictedByEffect(s.perm("megakabuterimon"), "beAffected", "Digimon")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("megakabuterimon").permanentId]);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("megakabuterimon"), "beAffected", "Digimon")).toBe(false);
  });

  it("Blast Digivolves from hand at Counter Timing without paying memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT15-048", as: "base" }],
        hand: [{ card: "BT15-049", as: "megakabuterimon" }],
        security: ["BT1-001"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 0;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find(
      (entry) => entry.instanceId === s.inst("megakabuterimon").instanceId,
    );
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-049");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT15-048"]);
  });

  it("digivolves legally from a green level-4 Digimon and applies the When Digivolving boost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-048", as: "base" }],
        hand: [{ card: "BT15-049", as: "megakabuterimon" }],
      },
    }, { autoSelectCards: true });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("megakabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-049");

    expect(s.perm("base").currentDP).toBe(10000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT15-048"]);
  });
});
