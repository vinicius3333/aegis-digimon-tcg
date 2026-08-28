import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-087.js";
import "./BT9-087.js";

describe("BT9-087 T.K. Takaishi & Izzy Izumi", () => {
  it("matches catalog values and the independent memory, DP, and security IR", () => {
    expect(getCardDefinition("BT9-087")).toMatchObject({
      colors: ["Yellow", "Green"], kinds: ["Tamer"], playCost: 4,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        {
          trigger: "StartOfYourMainPhase",
          actions: [
            { kind: "GainMemory", condition: { kind: "youHave", filter: { levelComparison: { op: "gte", value: 5 } } } },
            { kind: "GainMemory", condition: { kind: "opponentHas", filter: { levelComparison: { op: "gte", value: 5 } } } },
          ],
        },
        { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: { colors: ["Yellow", "Green"] }, actions: [{ kind: "ModifyDP", amount: -1000, duration: "untilOpponentTurnEnd", optional: true, cost: { kind: "suspend" } }] }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("independently gains memory for each player controlling a level 5 or higher Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-087", as: "tamer" }, "BT9-065"] },
      1: { battleArea: ["BT9-065"] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(2);
  });

  it("may suspend after a yellow or green digivolution to give -1000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-087", as: "tamer" },
            { card: "BT9-052", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("ally").permanentId,
    });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(2000);
  });
});
