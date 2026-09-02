import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-084.js";
import "../index.js";

describe("BT16-084", () => {
  it("plays Hawkmon or Salamon and returns that Digimon at opponent-turn end", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          bindResultAs: "playedHawkmonOrSalamon",
        },
        {
          kind: "SubTrigger",
          event: "endOfTurn",
          turnScope: "opponentsTurn",
          once: true,
          on: { filter: { boundRef: "playedHawkmonOrSalamon" }, count: 1 },
          actions: [{ kind: "Return", to: "hand" }],
        },
      ],
    });
  });

  it("gains memory by suspending itself when a red or yellow Digimon digivolves", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
            {
              kind: "ModifyDP",
              amount: -3000,
              condition: { kind: "isDnaDigivolving" },
            },
          ],
        },
      ],
    });
  });

  it("naturally DNA digivolves into a red/yellow Digimon, suspends this Tamer, and reduces an opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-084", as: "tamer" },
            { card: "BT16-008", as: "redMaterial" },
            { card: "BT16-031", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-012", as: "silphymon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    let observedDnaEvent = false;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenOneOfYoursDigivolves",
      sourcePermanentId: s.perm("tamer").permanentId,
      once: true,
      continuous: false,
      description: "test: preserve DNA provenance on digivolution watchers",
      run: async (ctx) => {
        observedDnaEvent = ctx.trigger.isDnaDigivolve === true;
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("redMaterial").permanentId, s.perm("yellowMaterial").permanentId],
        instanceId: s.inst("silphymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-012") &&
        s.perm("tamer").isSuspended &&
        s.perm("target").currentDP === 5000,
    );

    const silphymon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-012");
    expect(silphymon?.isSuspended).toBe(false);
    expect(observedDnaEvent).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("does not treat an ordinary red digivolution as DNA", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-084", as: "tamer" },
            { card: "BT16-008", as: "redBase" },
          ],
          hand: [{ card: "BT16-012", as: "silphymon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("silphymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redBase").topCard?.cardId === "BT16-012" && s.perm("tamer").isSuspended);

    expect(s.state.memory).toBe(1);
    expect(s.perm("target").currentDP).toBe(15000);
  });

  it("plays itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("returns the Digimon played by the start-phase effect through public turn progression", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-084", as: "tamer" }],
          hand: [{ card: "BT16-007", as: "hawkmon" }],
          deck: ["BT1-090", "BT1-090"],
        },
        1: { deck: ["BT1-090", "BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-007")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-007")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hawkmon").instanceId)).toBe(true);
  });
});
