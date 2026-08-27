import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-060.js";
import "../index.js";

describe("EX11-060 Arisa Kinosaki", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-060")).toMatchObject({
      nameEn: "Arisa Kinosaki",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-060", as: "arisa" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("arisa"));
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("draws and plays a level 4 Puppet only when the deletion paid Overclock (Q5914)", async () => {
    const deck = ["AD1-001", "AD1-001", "AD1-001"];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-021", as: "puppetToPlay" }],
          deck,
          battleArea: [
            { card: "EX11-060", as: "arisa" },
            { card: "EX11-024", as: "overclocker", dp: 6000 },
            { card: "TOKEN-Familiar-Token", as: "overclockCost", dp: 3000 },
          ],
        },
        1: { hand: ["AD1-001"], deck, security: ["AD1-001", "AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = true;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-Familiar-Token"),
    ).toBe(false);
    expect(s.perm("arisa").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-021")).toBe(true);
    assertNoLoudGap(s);
  });

  it("draws but does not play a Puppet after an ordinary effect deletion (Q5914)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-021", as: "puppetInHand" }],
          deck: ["AD1-001"],
          battleArea: [
            { card: "EX11-060", as: "arisa" },
            { card: "EX11-019", as: "deletedPuppet" },
          ],
        },
        1: { battleArea: [{ card: "EX11-023", as: "ordinaryDeleter" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ordinaryDeleter"));
    await settle(() => s.perm("arisa").isSuspended);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-021")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-021")).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("does not play a level 5 Puppet from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-038", as: "level5Puppet" }],
          battleArea: [
            { card: "EX11-060", as: "arisa" },
            { card: "EX11-019", as: "deletedPuppet" },
          ],
        },
        1: { battleArea: [{ card: "EX11-023", as: "ordinaryDeleter" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ordinaryDeleter"));
    await settle(() => s.perm("arisa").isSuspended);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("level5Puppet").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-038")).toBe(false);
    assertNoLoudGap(s);
  });

  it("may decline the suspend payment and receives neither reward", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-060", as: "arisa" },
            { card: "EX11-019", as: "puppet" },
          ],
          deck: ["AD1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    const handBefore = s.state.players[0]!.hand.length;
    await advance(s.engine).verb.deletePermanent([s.perm("puppet").permanentId], "byEffect");
    expect(s.perm("arisa").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR for every printed clause", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "onDeletionOf",
        actions: [
          { kind: "Draw", amount: 1, cost: { kind: "suspend" }, optional: true, abortOnDecline: true },
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            condition: {
              kind: "triggerRemovalCause",
              removalCause: "byEffect",
              removalMechanic: "Overclock",
            },
          },
        ],
      },
    ]);
  });
});
