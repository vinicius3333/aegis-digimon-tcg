import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-050.js";
import "../index.js";

describe("BT21-050 Cherrymon", () => {
  it("preserves the WG alternate Digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["WG"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("models optional suspension on play and digivolving", () => {
    expect(
      compiled.effects.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving"),
    ).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            optional: true,
          },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            optional: true,
          },
        ],
      },
    ]);
  });

  it("keeps the suspended WG attack redirect once-per-turn and the inherited play watcher", () => {
    const opponentTurn = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn");
    expect(opponentTurn).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks" }],
    });
    expect(opponentTurn?.actions[0]).toMatchObject({
      actions: [
        {
          kind: "RedirectAttack",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
            count: 1,
          },
          condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
          optional: true,
        },
      ],
    });
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", isInherited: true });
    expect(inherited?.actions[0]).toEqual({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          optional: true,
        },
      ],
    });
  });

  it("Q4555 redirects the same Falcomon attack after Falcomon suspends Cherrymon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-050", as: "cherrymon" }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "ST18-03", as: "falcomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const redirectTargetId = s.perm("cherrymon").permanentId;
    // Falcomon suspends Cherrymon before the same attack can redirect to it.
    preferred.push(s.perm("cherrymon").topCard.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("falcomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("falcomon").instanceId));

    expect(s.perm("cherrymon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "attackDeclared",
        target: { kind: "permanent", permanentId: redirectTargetId },
      }),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === redirectTargetId)).toBe(true);
  });

  it("Q4556 observably permits an own Digimon suspension", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-050", as: "cherrymon" },
            { card: "BT1-009", as: "ownTarget" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();

    preferred.push(s.perm("ownTarget").topCard.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherrymon"));
    expect(s.perm("ownTarget").isSuspended || s.perm("cherrymon").isSuspended).toBe(true);
  });

  it("inherited watcher suspends an opponent only when an own WG Digimon is played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-051", as: "host", under: [{ card: "BT21-050", as: "source" }] }],
          hand: [
            { card: "BT21-048", as: "wg" },
            { card: "BT21-048", as: "secondWg" },
            { card: "BT1-009", as: "nonWg" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "chosen" },
            { card: "BT1-011", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonWg").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009"));
    expect(s.perm("chosen").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wg").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("chosen").isSuspended);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondWg").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("suspends exactly one opponent through a public When Digivolving effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-049", as: "woodmon" }], hand: [{ card: "BT21-050", as: "cherrymon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("woodmon").permanentId,
        instanceId: s.inst("cherrymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("woodmon").topCard.cardId === "BT21-050");
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.isSuspended)).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("permits declining the public optional suspension", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT21-050", as: "cherrymon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cherrymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("alternate-digivolves from a level-4 WG Digimon for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-049", as: "woodmon" }],
        hand: [{ card: "BT21-050", as: "cherrymon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("woodmon").permanentId,
        instanceId: s.inst("cherrymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("woodmon").topCard.instanceId === s.inst("cherrymon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
