import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-065.js";

describe("EX6-065 Mythical Arms of Salvation!", () => {
  it("waives color requirements with Legend-Arms and can place one from trash under a Digimon then play itself", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "PlaceUnder", target: { from: ["trash"] }, optional: true },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });
  it("arms Delay when your Digimon would leave and uses the armed delayed play from its stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDigimonWouldLeave",
      leaveCause: "otherThanYourEffect",
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }],
    });
    expect(compiled.effects?.filter((entry) => entry.trigger === "Main").at(-1)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      requiresDelayArmed: true,
      target: { filter: { hostFilter: { sourceRef: "triggerSubject" } } },
    });
  });
  it("publicly places a Legend-Arms card from trash and then plays itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-009", as: "host" }],
          hand: [{ card: "EX6-065", as: "option" }],
          trash: [{ card: "EX6-042", as: "legend" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065"));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("legend").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065")).toBe(true);
  });
});
