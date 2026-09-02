import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-085.js";
import "../index.js";

describe("BT16-085", () => {
  it("plays Veemon or Wormmon and returns that Digimon at opponent-turn end", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          bindResultAs: "playedVeemonOrWormmon",
        },
        {
          kind: "SubTrigger",
          event: "endOfTurn",
          turnScope: "opponentsTurn",
          once: true,
          on: { filter: { boundRef: "playedVeemonOrWormmon" }, count: 1 },
          actions: [{ kind: "Return", to: "hand" }],
        },
      ],
    });
  });

  it("gains memory and may trash three opposing digivolution cards during DNA digivolution", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
            {
              kind: "TrashDigivolution",
              amount: 3,
              condition: { kind: "isDnaDigivolving" },
            },
          ],
        },
      ],
    });
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.actions?.[1]).not.toHaveProperty("optional");
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.actions?.[1]).not.toHaveProperty("abortOnDecline");
  });

  it("suspends this Tamer, gains memory, and trashes three cards from an opposing stack on DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-085", as: "tamer" },
            { card: "BT16-018", as: "blueMaterial" },
            { card: "BT16-021", as: "greenMaterial" },
          ],
          hand: [{ card: "BT16-025", as: "paildramon" }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "opponentStack",
              under: ["BT1-009", "BT1-009", "BT1-009"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueMaterial").permanentId, s.perm("greenMaterial").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && s.perm("opponentStack").stack.length === 0);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.perm("opponentStack").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(3);
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
          battleArea: [{ card: "BT16-085", as: "tamer" }],
          hand: [{ card: "BT16-040", as: "wormmon" }],
          deck: ["BT1-090", "BT1-090"],
        },
        1: { deck: ["BT1-090", "BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-040")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-040")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wormmon").instanceId)).toBe(true);
  });
});
