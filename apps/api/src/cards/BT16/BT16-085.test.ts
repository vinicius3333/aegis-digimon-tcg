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
              choose: true,
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

  it("lets the player choose which three opposing digivolution cards to trash", async () => {
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
          battleArea: [{ card: "BT1-009", as: "opponentStack", under: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    const sourceIds = s.perm("opponentStack").stack.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueMaterial").permanentId, s.perm("greenMaterial").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    if (s.state.pendingDecision?.kind === "chooseTargets") {
      const target = s.decisions.at(-1)!.req;
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: target.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("opponentStack").permanentId] },
      });
    }
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const choice = s.decisions.at(-1)!.req;
    expect(choice.sourceCardId).toBe("BT16-085");
    expect(choice.options?.candidateInstanceIds).toEqual(sourceIds);
    expect(choice.options).toMatchObject({ min: 3, max: 3 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "selectCards", instanceIds: sourceIds.slice(0, 3) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentStack").stack.length === 1);

    expect(s.perm("opponentStack").stack.map((card) => card.instanceId)).toEqual([sourceIds[3]]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining(sourceIds.slice(0, 3)),
    );
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

describe("BT16-085 Davis Motomiya & Ken Ichijoji — KB Q&A rulings", () => {
  async function playWormmonDigivolveAndPassOpponentTurn(options: {
    digivolveInto: string;
    breedingOccupied: boolean;
  }) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-085", as: "davisKen" }],
          hand: [
            { card: "BT16-040", as: "wormmon" },
            { card: options.digivolveInto, as: "digivolved" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          ...(options.breedingOccupied ? { breeding: { card: "BT16-004", as: "egg" } } : {}),
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-040"));
    const wormmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-040")!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wormmon.permanentId,
        instanceId: s.inst("digivolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => wormmon.topCard?.cardId === options.digivolveInto);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    const onFieldAfterOwnTurn = s.state.players[0]!.battleArea.some(
      (permanent) => permanent.permanentId === wormmon.permanentId,
    );

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    await settle();
    return { s, wormmon, onFieldAfterOwnTurn };
  }

  it("returns only the top card of the played Digimon after it digivolved and trashes its sources (Q2677)", async () => {
    const { s, wormmon, onFieldAfterOwnTurn } = await playWormmonDigivolveAndPassOpponentTurn({
      digivolveInto: "BT1-071",
      breedingOccupied: false,
    });

    expect(onFieldAfterOwnTurn).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === wormmon.permanentId)).toBe(
      false,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("digivolved").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("wormmon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wormmon").instanceId);
  });

  it("does not trash opposing digivolution cards on DNA digivolution when this Tamer is not suspended (Q2678)", async () => {
    async function dnaDigivolveIntoPaildramon(acceptSuspension: boolean) {
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
            battleArea: [{ card: "BT1-009", as: "opponentStack", under: ["BT1-009", "BT1-009", "BT1-009"] }],
          },
        },
        acceptSuspension
          ? { autoAcceptOptional: true, autoSelectCards: true }
          : { autoDeclineOptional: true, autoSelectCards: true },
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
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-025"));
      await settle();
      return s;
    }

    const declined = await dnaDigivolveIntoPaildramon(false);
    expect(declined.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-025")).toBe(
      true,
    );
    expect(
      declined.decisions.some(
        (decision) => decision.req.kind === "optional" && decision.req.sourceCardId === "BT16-085",
      ),
    ).toBe(true);
    expect(declined.perm("tamer").isSuspended).toBe(false);
    expect(declined.state.memory).toBe(0);
    expect(declined.perm("opponentStack").stack).toHaveLength(3);
    expect(declined.state.players[1]!.trash).toHaveLength(0);

    const accepted = await dnaDigivolveIntoPaildramon(true);
    expect(accepted.perm("tamer").isSuspended).toBe(true);
    expect(accepted.state.memory).toBe(1);
    expect(accepted.perm("opponentStack").stack).toHaveLength(0);
  });

  it("does not return the played Digimon once its own effect moved it to the breeding area (Q4254)", async () => {
    const moved = await playWormmonDigivolveAndPassOpponentTurn({ digivolveInto: "P-143", breedingOccupied: false });
    expect(moved.s.state.players[0]!.breeding?.permanentId).toBe(moved.wormmon.permanentId);
    expect(moved.s.state.players[0]!.breeding?.topCard?.cardId).toBe("P-143");
    expect(moved.s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("P-143");

    const stayed = await playWormmonDigivolveAndPassOpponentTurn({ digivolveInto: "P-143", breedingOccupied: true });
    expect(stayed.s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-143")).toBe(
      false,
    );
    expect(stayed.s.state.players[0]!.hand.map((card) => card.cardId)).toContain("P-143");
  });
});
