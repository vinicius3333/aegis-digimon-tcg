import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-074.js";
import "../BT9/BT9-076.js";
import "../BT9/BT9-091.js";
import "../ST10/ST10-04.js";
import "./BT8-082.js";

describe("BT8-082 Ophanimon Falldown Mode", () => {
  it("activates both branches from the single purple-yellow Maycrackmon source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-076", as: "maycrackmon" }],
        hand: [{ card: "BT8-082", as: "ophanimon" }],
        deck: [{ card: "BT9-074", as: "evolutionDraw" }, { card: "BT9-074", as: "recovery" }],
      },
      1: { battleArea: [{ card: "BT1-015", as: "target" }] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    const recoveredId = s.inst("recovery").instanceId;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("maycrackmon").permanentId,
      instanceId: s.inst("ophanimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security[0]?.instanceId).toBe(recoveredId);
  });

  it("with only a purple source, deletes but does not recover", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-088", as: "ladyDevimon" }],
        hand: [{ card: "BT8-082", as: "ophanimon" }],
        deck: ["BT9-074", "BT9-074"],
      },
      1: { battleArea: [{ card: "BT1-015", as: "target" }] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("ladyDevimon").permanentId,
      instanceId: s.inst("ophanimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("with only a yellow source, recovers but does not delete", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST10-05", as: "angewomon" }],
        hand: [{ card: "BT8-082", as: "ophanimon" }],
        deck: [{ card: "BT9-074", as: "evolutionDraw" }, { card: "BT9-074", as: "recovery" }],
      },
      1: { battleArea: [{ card: "BT1-015", as: "target" }] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("angewomon").permanentId,
      instanceId: s.inst("ophanimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("recovery").instanceId);
  });

  it("On Deletion plays Meicoomon from trash and lets Meiko gain memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-082", as: "ophanimon" },
          { card: "BT9-091", as: "meiko" },
        ],
        trash: [{ card: "BT9-074", as: "meicoomon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    const meicoomonId = s.inst("meicoomon").instanceId;
    s.state.memory = 0;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ophanimon").permanentId])).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === meicoomonId) &&
      s.perm("meiko").isSuspended,
    );

    expect(s.state.memory).toBe(1);
  });

  it("On Deletion can play an eligible level 4 from Ophanimon's own deleted stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT8-082",
          as: "ophanimon",
          under: [{ card: "ST10-04", as: "stackGatomon" }],
        }],
        trash: [{ card: "BT9-074", as: "existingMeicoomon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: false, autoOrderTriggers: true });
    const stackGatomonId = s.inst("stackGatomon").instanceId;

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("ophanimon").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const playChoice = s.decisions.at(-1)!.req;
    expect(playChoice.options?.candidateInstanceIds).toContain(stackGatomonId);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: playChoice.decisionId,
      response: { kind: "selectCards", instanceIds: [stackGatomonId] },
    })).toEqual({ ok: true });
    await deletion;
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === stackGatomonId,
    ));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === stackGatomonId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("resolves the Meiko line together: Maycrackmon gains 2 memory, then Meicoomon is played and Meiko gains 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT8-082",
            as: "ophanimon",
            under: [{ card: "BT9-076", as: "maycrackmon" }],
          },
          { card: "BT9-091", as: "meiko" },
        ],
        trash: [{ card: "BT9-074", as: "meicoomon" }],
      },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });
    const meicoomonId = s.inst("meicoomon").instanceId;
    s.state.turnSeat = 0;
    s.state.memory = 0;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ophanimon").permanentId])).toBe(1);
    await settle(() =>
      s.state.memory === 3 &&
      s.perm("meiko").isSuspended &&
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === meicoomonId),
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("meiko").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("maycrackmon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
