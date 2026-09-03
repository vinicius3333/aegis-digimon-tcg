import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-088.js";
import "../index.js";

describe("BT16-088", () => {
  it("plays Armadillomon or Patamon and returns that Digimon at opponent-turn end", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          bindResultAs: "playedArmadillomonOrPatamon",
        },
        {
          kind: "SubTrigger",
          event: "endOfTurn",
          turnScope: "opponentsTurn",
          once: true,
          on: { filter: { boundRef: "playedArmadillomonOrPatamon" }, count: 1 },
          actions: [{ kind: "Return", to: "hand" }],
        },
      ],
    });
  });

  it("gains memory by suspending itself when a yellow or black Digimon digivolves", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
            {
              kind: "DeDigivolve",
              amount: 1,
              condition: { kind: "isDnaDigivolving" },
            },
          ],
        },
      ],
    });
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.actions?.[1]).not.toHaveProperty("optional");
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.actions?.[1]).not.toHaveProperty("abortOnDecline");
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
          battleArea: [{ card: "BT16-088", as: "tamer" }],
          hand: [{ card: "BT1-027", as: "armadillomon" }],
          deck: ["BT1-090", "BT1-090"],
        },
        1: { deck: ["BT1-090", "BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-027")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-027")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("armadillomon").instanceId)).toBe(true);
  });

  it("suspends for memory and de-digivolves an opponent when a black-and-yellow DNA digivolve resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-088", as: "tamer" },
            { card: "BT10-061", as: "blackMaterial" },
            { card: "BT10-035", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-063", as: "shakkou" }],
          security: [],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "opponent", under: ["BT1-009"] }],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blackMaterial").permanentId, s.perm("yellowMaterial").permanentId],
        instanceId: s.inst("shakkou").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-063") &&
        s.perm("tamer").isSuspended &&
        s.perm("opponent").topCard?.cardId === "BT1-009",
    );

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("opponent").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-015")).toBe(true);
  });
});
