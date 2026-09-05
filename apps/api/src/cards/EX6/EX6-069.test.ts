import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-069.js";

describe("EX6-069 Rise of the Seven Great Demon Lords", () => {
  it("scopes the Delay play to a Gate of Deadly Sins in breeding, plus Security placement", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("Seven Great Demon Lords");
    expect(text).toContain("Gate of Deadly Sins");
    expect(text).toContain("onDeletionOf");
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      actions: [
        {
          kind: "PlayWithoutCost",
          source: "breeding",
          target: {
            filter: {
              zone: "digivolutionCards",
              hostFilter: {
                zone: "breeding",
                nameOrTrait: [{ tokens: ["Gate of Deadly Sins"], match: "nameExact" }],
              },
            },
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      position: "bottom",
      underFilter: {
        nameOrTrait: [{ tokens: ["Gate of Deadly Sins"], match: "nameExact" }],
      },
    });
    expect(text).toContain("PlaceInBattleAreaSelf");
    const gateReference = { tokens: ["Gate of Deadly Sins"], match: "nameExact" as const };
    expect(matchNameOrTrait({ nameEn: "Gate of Deadly Sins" }, gateReference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Gate of Deadly Sins: Awakened" }, gateReference)).toBe(false);
  });
  it("publicly places a Seven Great Demon Lords card under the breeding Gate", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "gate" },
          battleArea: [{ card: "EX6-056", as: "source" }],
          hand: [
            { card: "EX6-069", as: "option" },
            { card: "EX6-059", as: "lord" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069"));
    expect(s.state.players[0]!.breeding?.stack.some((card) => card.instanceId === s.inst("lord").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069")).toBe(true);
  });
  it("publicly still places itself when the optional breeding placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "gate" },
          battleArea: [{ card: "EX6-056", as: "source" }],
          hand: [
            { card: "EX6-069", as: "option" },
            { card: "EX6-059", as: "lord" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069"));
    expect(s.state.players[0]!.breeding?.stack.some((card) => card.instanceId === s.inst("lord").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069")).toBe(true);
  });

  it("arms Delay on deletion and plays from the owned Gate breeding stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", under: [{ card: "EX6-059", as: "stackLord" }], as: "gate" },
          battleArea: [
            { card: "EX6-069", as: "option" },
            { card: "BT12-085", as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    s.state.turnCount += 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-059"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-059")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[0]!.breeding?.stack.some((card) => card.instanceId === s.inst("stackLord").instanceId)).toBe(
      false,
    );
  });

  it("publicly places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX6-069", as: "option", faceUp: true }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069")).toBe(true);
  });
});
