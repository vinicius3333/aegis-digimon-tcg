import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
          battleArea: [{ card: "BT22-083", as: "existingYuuko" }],
          hand: [
            { card: "BT26-054", as: "andromon" },
            { card: "BT22-083", as: "duplicateYuuko" },
            { card: "BT22-084", as: "nokia" },
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
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT22-084"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("duplicateYuuko").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("nokia").instanceId,
    );
  });

  it("digivolves for free only when an effect adds a CS Digimon to this Digimon's stack", async () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          requireByEffect: true,
          actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true }],
        },
      ],
    });
  });

  it("doesn't react to a stack-add event without effect attribution", async () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      requireByEffect: true,
    });
  });

  it("redirects an opposing attack to the Digimon carrying the inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
        1: {
          battleArea: [{ card: "BT26-058", as: "host", under: ["BT26-054"] }],
          security: ["BT1-009"],
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
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("host").permanentId);
  });
});

describe("BT26-054 Andromon — KB Q&A rulings", () => {
  it("redirects an attacker that isn't affected by the defender's effects (Q7056)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-025", as: "attacker", dp: 3000 }],
          deck: ["BT1-014", "BT1-015", "BT1-016", "BT1-017"],
        },
        1: {
          battleArea: [{ card: "BT26-058", as: "host", under: ["BT26-054"] }],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(attackerId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("host").permanentId);
    // Lamiamon trashes the top security only when its attack target changes.
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("security").instanceId);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });

  it("triggers once it becomes the top card after an effect places the card above it in the digivolution cards (Q7057)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-058",
              as: "host",
              under: [
                { card: "BT22-043", as: "terriermon" },
                { card: "BT26-054", as: "andromon" },
              ],
            },
          ],
          hand: [{ card: "BT26-058", as: "evolution" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const sourceInstanceId = s.inst("terriermon").instanceId;
    const effectKey = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((effect) => effect.instanceId === sourceInstanceId && effect.effectKey.startsWith("BT22-043/"))?.effectKey;
    expect(effectKey).toBeDefined();
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: effectKey! })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT26-058", "BT22-043", "BT26-054"]);
    expect(s.state.memory).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
