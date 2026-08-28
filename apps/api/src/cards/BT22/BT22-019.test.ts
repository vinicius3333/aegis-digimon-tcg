import { describe, expect, it } from "vitest";
import { type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-019.js";

describe("BT22-019 Veemon", () => {
  it("reduces Veedramon digivolution cost on your turn and only prevents opponent-effect removal", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
      into: { nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "opponentEffect",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Prevent", mode: "leavePlay", optional: true, abortOnDecline: true }],
    });
  });

  it("reduces a Veedramon evolution by exactly one memory on the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-019", as: "veemon" }],
        hand: [{ card: "BT22-022", as: "veedramon" }],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard?.cardId === "BT22-022");

    expect(s.state.memory).toBe(2);
    expect(s.perm("veemon").stack.some((card) => card.cardId === "BT22-019")).toBe(true);
  });

  it("does not apply the reduction from the breeding area per Q4873", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-019", as: "veemon" },
        hand: [{ card: "BT22-022", as: "veedramon" }],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard?.cardId === "BT22-022");

    expect(s.state.memory).toBe(1);
  });

  it("suspends a Veedramon host to prevent one opponent-effect deletion but not a second", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-022", under: ["BT22-019"], as: "host" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1 as Seat, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
      expect(s.perm("host").isSuspended).toBe(true);
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT22-022")).toBe(true);
  });
});
