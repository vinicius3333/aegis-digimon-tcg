import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-042.js";
import "./index.js";

describe("BT22-042 Nyabootmon", () => {
  it("requires Chaperomon and a controlled Arisa Kinosaki for the alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Chaperomon"],
        cost: 6,
        controllerControls: {
          kind: ["Tamer"],
          namesExact: ["Arisa Kinosaki"],
          min: 1,
        },
        isAlternate: true,
      },
    ]);
  });

  it("plays a level 4-or-lower Puppet and scales the mandatory DP reduction", () => {
    const digivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        count: 1,
      },
    });
    expect(digivolving?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      optional: false,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      scaling: { per: 1, unit: "cards", filter: { controller: "mine", kind: ["Digimon"] } },
    });
  });

  it("once per turn reactivates this Digimon's When Digivolving effect", () => {
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              kind: "ActivateEffect",
              effectType: "WhenDigivolving",
              optional: true,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("implements Q4894/Q5556/Q5557 by resolving one scaled target after the Puppet play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-036", as: "chaperomon" },
            { card: "BT22-088", as: "arisa" },
            { card: "BT22-029", as: "ally" },
          ],
          hand: [
            { card: "BT22-042", as: "nyabootmon" },
            { card: "BT22-032", as: "puppet" },
          ],
        },
        1: { battleArea: [{ card: "BT22-052", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaperomon").permanentId,
        instanceId: s.inst("nyabootmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-032"));
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId !== "BT22-088")).toHaveLength(
      3,
    );
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("reactivates its When Digivolving effect after another deletion only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-042", as: "nyabootmon" },
            { card: "BT22-029", as: "first" },
            { card: "BT22-029", as: "second" },
          ],
          hand: [
            { card: "BT22-032", as: "firstPuppet" },
            { card: "BT22-032", as: "secondPuppet" },
          ],
        },
        1: { battleArea: [{ card: "BT22-052", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const primitives = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> } }
    ).primitives;

    await primitives.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-032"));
    await settle();
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT22-032")).toHaveLength(1);

    await primitives.deletePermanent([s.perm("second").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT22-032")).toHaveLength(1);
  });

  it("reactivates through its public Overclock deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-042", as: "nyabootmon" },
            { card: "BT22-032", as: "fodder" },
          ],
          hand: [{ card: "BT22-032", as: "replacement" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT22-032")).toBe(true);
  });
});
