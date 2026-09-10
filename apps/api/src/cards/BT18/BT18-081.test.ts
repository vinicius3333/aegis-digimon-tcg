import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-081.js";

describe("BT18-081 Rhihimon", () => {
  it("proves the hand-only exact-name two-material Tamer digivolution and all printed clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          costOverride: 3,
          ignoreRequirements: true,
          target: {
            filter: { kind: ["Tamer"], colors: ["Purple", "Yellow"] },
            fromSelectionRef: "rhihimonHost",
          },
          cost: {
            kind: "place",
            bindHostAs: "rhihimonHost",
            target: {
              filter: { zone: "trash", nameOrTrait: [{ tokens: ["Loweemon"], match: "nameExact" }] },
            },
          },
          additionalCosts: [
            {
              kind: "place",
              host: { filter: { boundRef: "rhihimonHost" }, count: 1 },
              target: {
                filter: { zone: "trash", nameOrTrait: [{ tokens: ["KaiserLeomon"], match: "nameExact" }] },
                count: 1,
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Jamming" }] });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: { filter: { kind: ["Tamer"], hasInheritedEffects: true } },
        },
      ],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });

  it("naturally places both named materials under the selected Tamer before hand digivolving it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-087", as: "yellowTamer" },
            { card: "BT10-093", as: "purpleTamer" },
          ],
          hand: [{ card: "BT18-081", as: "rhihimon" }],
          trash: [
            { card: "BT18-076", as: "loweemon" },
            { card: "BT18-077", as: "kaiserLeomon" },
            { card: "BT18-088", as: "inheritedTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const effect = JSON.parse(s.inst("rhihimon").activatableEffectsJson) as Array<{ effectKey: string }>;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("rhihimon").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowTamer").topCard?.cardId === "BT18-081");

    expect(s.perm("yellowTamer").stack.map((card) => card.cardId)).toEqual(["BT18-077", "BT18-076", "BT1-087"]);
    expect(s.perm("purpleTamer").stack).toHaveLength(0);
    expect(s.perm("purpleTamer").topCard?.cardId).toBe("BT10-093");
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("inheritedTamer").instanceId),
    ).toBe(true);
  });

  it("refuses the hand effect when either named material is missing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-087", as: "yellowTamer" }],
        hand: [{ card: "BT18-081", as: "rhihimon" }],
        trash: [{ card: "BT18-076", as: "loweemon" }],
      },
    });
    await s.ready();
    expect(s.inst("rhihimon").activatableEffectsJson).toBe("");
    expect(s.perm("yellowTamer").topCard?.cardId).toBe("BT1-087");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("loweemon").instanceId)).toBe(true);
  });

  it("allows refusal of the optional Tamer play after the hand digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "yellowTamer" }],
          hand: [{ card: "BT18-081", as: "rhihimon" }],
          trash: [
            { card: "BT18-076", as: "loweemon" },
            { card: "BT18-077", as: "kaiserLeomon" },
            { card: "BT18-088", as: "inheritedTamer" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const effect = JSON.parse(s.inst("rhihimon").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("rhihimon").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowTamer").topCard?.cardId === "BT18-081");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("inheritedTamer").instanceId)).toBe(
      true,
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("inheritedTamer").instanceId),
    ).toBe(false);
  });

  it("resets the inherited once-per-turn DP reduction on the next turn", async () => {
    const s = setupEngine(
      {
        0: { deck: ["BT1-009", "BT1-013"], battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-081"] }] },
        1: {
          deck: ["BT1-009", "BT1-013"],
          battleArea: [{ card: "BT1-060", as: "target", dp: 10000 }],
          security: ["BT1-011", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.perm("target").currentDP).toBe(6000);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(10000);
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    s.perm("host").isSuspended = false;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.perm("target").currentDP).toBe(6000);
  });
});
