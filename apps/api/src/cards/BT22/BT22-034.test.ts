import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-034.js";

describe("BT22-034 Reppamon", () => {
  it("models the instead choice as -6000 with the security cost or -3000 without stacking", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDiscardSecurity",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            payCost: false,
            optional: true,
          },
        ],
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
              kind: "ModifyDP",
              amount: -6000,
              duration: "untilOpponentTurnEnd",
              cost: { kind: "trashSecurityTop" },
              optional: true,
              abortOnDecline: true,
            },
          ],
          [{ kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd" }],
        ],
      });
    }
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
  });

  it("plays itself free after an effect trashes it from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT22-034", as: "reppamon", faceUp: true }] } },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const reppamonId = s.inst("reppamon").instanceId;

    await advance(s.engine).verb.trash([reppamonId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === reppamonId),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === reppamonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === reppamonId)).toBe(true);
  });

  it("uses the default -3000 branch without paying security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-034", as: "reppamon" }],
          security: [{ card: "BT22-030", as: "security" }],
        },
        1: { battleArea: [{ card: "BT22-024", as: "opponent" }] },
      },
      { autoAcceptOptional: false, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    await s.ready();
    const originalDP = s.perm("opponent").currentDP;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("reppamon"));
    await settle();

    expect(s.perm("opponent").currentDP).toBe(originalDP - 3000);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
  });

  it("pays one security to replace -3000 with -6000", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-034", as: "reppamon" }],
          security: [{ card: "BT22-030", as: "security" }],
        },
        1: { battleArea: [{ card: "BT22-024", dp: 10000, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 0, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("reppamon"));
    await settle(() => s.perm("opponent").currentDP === 4000);

    expect(s.perm("opponent").currentDP).toBe(4000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
  });

  it("applies inherited -2000 DP once per turn from a realistic CS stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-037", under: ["BT22-034"], as: "host" }] },
        1: {
          battleArea: [
            { card: "BT22-024", as: "firstTarget" },
            { card: "BT22-024", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstDP = s.perm("firstTarget").currentDP;
    const secondDP = s.perm("secondTarget").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();

    expect(s.perm("firstTarget").currentDP).toBe(firstDP - 2000);
    expect(s.perm("secondTarget").currentDP).toBe(secondDP);
  });
});
