import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-042.js";

describe("EX6-042 RaijiLudomon", () => {
  it("pays 2 and places itself under a level 5 or Legend-Arms Digimon to grant the opponent an attack aura", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      duration: "untilOpponentTurnEnd",
      effectText: "[Start of Your Main Phase] This Digimon attacks.",
      cost: {
        kind: "compound",
        costs: [
          { kind: "payMemory", memory: 2 },
          {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            target: { filter: { isSelfRef: true } },
          },
        ],
      },
    }));
  it("grants Blocker/Reboot on stack addition and inherits deletion prevention", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
        { kind: "GainKeyword", keyword: { keyword: "Reboot" } },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "Prevent",
              optional: true,
              cost: { target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } } } },
            },
          ],
        },
      ],
    });
  });

  it("publicly pays 2 and places RaijiLudomon under an eligible level 5 host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-009", as: "host" }], hand: [{ card: "EX6-042", as: "raiji" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("raiji"));
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("raiji").instanceId));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("raiji").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
  it("does not expose the hand Main effect without a level 5 or Legend-Arms host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-053", as: "ineligible" }], hand: [{ card: "EX6-042", as: "raiji" }] },
    });
    await s.ready();
    expect(JSON.parse(s.inst("raiji").activatableEffectsJson || "[]")).toHaveLength(0);
  });
});
