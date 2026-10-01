import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-013.js";
import "./EX6-015.js";

describe("EX6-013 Xiquemon", () => {
  it("draws on play and gains memory when played from digivolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "GainMemory", amount: 1, condition: { kind: "playedFromZone", zone: "digivolutionCards" } },
    ]);
  });
  it("grants Aquatic as a rule and inherits Jamming", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Aquatic"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });

  it("draws one card when played from hand", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX6-013", as: "xique" }], deck: [{ card: "BT1-009", as: "drawn" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xique").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("gains memory when publicly played from a digivolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-014", as: "host", under: [{ card: "EX6-013", as: "xique" }] }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.playInstances([s.inst("xique").instanceId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});

describe("EX6-013 Xiquemon — KB Q&A rulings", () => {
  it("draws and gains memory when Xiangpengmon plays it from digivolution cards (Q3708)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-015", as: "host", under: [{ card: "EX6-013", as: "xique" }] }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("xique").instanceId],
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("xique").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.memory).toBe(1);
  });
});
