import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-017.js";
import "./EX3-018.js";
import "./EX3-022.js";
import "./EX3-023.js";

describe("EX3-017 Ebidramon", () => {
  it("has its official identity and printed blue evolution cost", () => {
    expect(getCardDefinition("EX3-017")).toMatchObject({
      cardId: "EX3-017",
      nameEn: "Ebidramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Aquatic"],
      rarity: "C",
      imageId: "EX3-017",
    });
  });

  it("publishes one sourced choice containing only the controller's blue Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-018", as: "blue" },
          { card: "BT1-009", as: "red" },
        ],
        hand: [{ card: "EX3-017", as: "ebidramon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const payload = JSON.parse(s.state.pendingDecision!.payloadJson) as {
      candidateInstanceIds: string[];
      visibleInstanceIds: string[];
      min: number;
      max: number;
    };
    expect(s.decisions.at(-1)!.req).toMatchObject({
      seat: 0,
      sourceCardId: "EX3-017",
      options: {
        timing: "OnPlay",
        effectText: expect.stringContaining("gains ＜Blocker＞"),
      },
    });
    expect(payload).toMatchObject({ min: 1, max: 1 });
    expect(payload.candidateInstanceIds).toContain(s.perm("blue").permanentId);
    expect(payload.candidateInstanceIds).toContain(
      s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-017")!.permanentId,
    );
    expect(payload.candidateInstanceIds).not.toContain(s.perm("red").permanentId);
    expect(payload.visibleInstanceIds).toEqual(payload.candidateInstanceIds);
  });

  it("grants Blocker but does not unsuspend the chosen Digimon when played from hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-018", as: "recipient", suspended: true }],
          hand: [{ card: "EX3-017", as: "ebidramon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker"));

    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(true);
    expect(s.perm("recipient").isSuspended).toBe(true);
  });

  it("Q3385/Aquatic family: playing it from sources unsuspends the exact Digimon that gained Blocker", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-022", under: ["EX3-017"], as: "aquaticHost" },
            { card: "EX3-018", as: "recipient", suspended: true },
          ],
          hand: [{ card: "EX3-023", as: "aegisdramon" }],
          deck: ["BT1-030"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aquaticHost").permanentId,
        instanceId: s.inst("aegisdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("recipient").isSuspended &&
        observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker") &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-017"),
    );

    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(true);
    expect(s.perm("recipient").isSuspended).toBe(false);
    expect(s.perm("aquaticHost").topCard.cardId).toBe("EX3-023");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-017")).toBe(true);
  });

  it("granted Blocker redirects a public attack and the selected Digimon pays suspension", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-018", as: "recipient" }],
          hand: [{ card: "EX3-017", as: "ebidramon" }],
          deck: ["BT1-030", "BT1-031"],
        },
        1: {
          battleArea: [{ card: "BT1-029", as: "attacker" }],
          deck: ["BT1-030", "BT1-031"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const controllerTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker"));

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await controllerTurn;
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1 && s.state.phase === Phase.Main);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("recipient").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").isSuspended);
    expect(s.perm("recipient").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await opponentTurn;
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(false);
  });
});
