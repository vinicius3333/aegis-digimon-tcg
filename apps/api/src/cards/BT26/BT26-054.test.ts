import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-054.js";
import "../index.js";

describe("BT26-054 Andromon", () => {
  it("encodes CS Tamer play exclusion, CS stack-add digivolution, and inherited attack redirect", () => {
    expect(digivolutionRequirementsFor("BT26-054")).toContainEqual({
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          optional: true,
          target: { filter: { excludeSameNameAsOwnTamers: true } },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { excludeSameNameAsOwnTamers: true } } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          requireByEffect: true,
          addedDigivolutionCardFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          actions: [{ kind: "Digivolve", from: ["hand"], payCost: false }],
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "RedirectAttack", optional: true }],
        },
      ],
    });
  });

  it("publicly plays a CS Tamer from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-054", as: "andromon" },
            { card: "BT22-083", as: "csTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("andromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT22-083"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT22-083");
  });

  it("can't play a CS Tamer sharing a name with one already in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-054", as: "andromon" },
            { card: "BT22-083", as: "existingYuuko" },
          ],
          hand: [
            { card: "BT22-083", as: "duplicateYuuko" },
            { card: "BT22-084", as: "nokia" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("andromon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("duplicateYuuko").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("nokia").instanceId,
    );
  });

  it("digivolves for free only when an effect adds a CS Digimon to this Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-054", as: "andromon" }],
          hand: [
            { card: "BT26-054", as: "placedCs" },
            { card: "BT26-058", as: "hiAndromon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(0);
    await advance(s.engine).verb.placeUnder(s.perm("andromon").permanentId, [s.inst("placedCs").instanceId]);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.perm("andromon").topCard.cardId === "BT26-058");

    expect(s.perm("andromon").topCard.cardId).toBe("BT26-058");
    expect(s.state.memory).toBe(0);
  });

  it("doesn't react to a stack-add event without effect attribution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-054", as: "andromon", under: [{ card: "BT26-054", as: "addedCs" }] }],
          hand: [{ card: "BT26-058", as: "hiAndromon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("andromon").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("addedCs").instanceId],
    });

    expect(s.perm("andromon").topCard.cardId).toBe("BT26-054");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("hiAndromon").instanceId);
  });

  it("redirects an opposing attack to the Digimon carrying the inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
        1: {
          battleArea: [{ card: "BT26-058", as: "host", under: ["BT26-054"] }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("host").permanentId);
  });
});
