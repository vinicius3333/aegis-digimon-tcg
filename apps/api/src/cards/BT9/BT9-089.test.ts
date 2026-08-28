import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-089.js";
import "./BT9-089.js";

describe("BT9-089 Daigo Nishijima", () => {
  it("matches catalog values and the main-phase, subject-grant, and security IR", () => {
    expect(getCardDefinition("BT9-089")).toMatchObject({
      colors: ["Black"], kinds: ["Tamer"], playCost: 3,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenUnsuspended", fireCondition: { kind: "phaseIs", phase: "Main" }, sourceFilter: { controller: "opponent" }, actions: [{ kind: "GainMemory", amount: 1, optional: true, cost: { kind: "suspend" } }] }] },
        { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: { colors: ["Black"], levels: [6] }, actions: [{ kind: "GainKeyword", target: { sourceRef: "triggerSubject" }, keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" }] }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("does not gain memory when an opposing Digimon unsuspends outside a main phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-089", as: "daigo" }] },
        1: { battleArea: [{ card: "BT1-028", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    s.state.phase = Phase.Active;

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      subjectPermanentId: s.perm("opponent").permanentId,
    });

    expect(s.state.memory).toBe(0);
    expect(s.perm("daigo").isSuspended).toBe(false);
  });

  it("grants Blocker to the black level 6 Digimon that just digivolved", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-089", as: "daigo" },
          { card: "BT9-068", as: "subject" },
        ],
      },
    });

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("subject").permanentId,
    });

    expect(observe(s.engine).hasKeyword(s.perm("subject"), "Blocker")).toBe(true);
  });
});
