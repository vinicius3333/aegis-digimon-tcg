import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
      delayArmedIntrinsic: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          from: ["digivolutionCards"],
          optional: true,
        },
      ],
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065"));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("legend").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065")).toBe(true);
  });

  it("activates its Main effect when revealed in security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX6-065", as: "option", faceUp: true }],
          battleArea: [{ card: "EX6-009", as: "host" }],
          trash: [{ card: "EX6-042", as: "legend" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065"));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("legend").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065")).toBe(true);
  });

  it("activates Delay to play a Legend-Arms card before the leaving Digimon moves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-009", under: ["EX6-007"], as: "host" }],
          hand: [{ card: "EX6-065", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065"));
    const option = s.perm("option");
    option.enterFieldTurnCount = s.state.turnCount - 1;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-007"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-007")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
