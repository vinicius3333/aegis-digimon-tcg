import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-061.js";
import "../index.js";

describe("BT21-061 MetalGreymon", () => {
  it("preserves both alternate Digivolution requirements and inherited Alliance", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Greymon"], cost: 3, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
            duration: "permanent",
          },
        ],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("keeps the conditional Alliance and optional attack inside each trigger", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");

    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toHaveLength(2);
    for (const action of effect?.actions ?? []) {
      const nested = action as { event?: string; actions?: unknown[] };
      expect(["whenPlayed", "whenOneOfYoursDigivolves"]).toContain(nested.event);
      expect(nested.actions).toHaveLength(2);
      expect(nested.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
        duration: "forTheTurn",
        condition: { kind: "triggerSubjectMatchesFilter" },
      });
      expect(nested.actions?.[1]).toMatchObject({
        kind: "Attack",
        optional: true,
        withoutSuspending: false,
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("de-digivolves one opponent for each two Tamer colors on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-061", as: "metalgreymon" }],
          battleArea: [
            { card: "BT1-085", as: "redTamer" },
            { card: "BT1-086", as: "blueTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT21-045", as: "opponent", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalgreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-044");

    expect(s.perm("opponent").stack).toHaveLength(1);
  });

  it("Q4568 performs two separate De-Digivolve 1 processes for four Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-057", as: "base" },
            { card: "AD1-019", as: "dualTamerA" },
            { card: "AD1-020", as: "tricolorTamer" },
          ],
          hand: [{ card: "BT21-061", as: "metalgreymon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT21-045", as: "opponent", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalgreymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-042");

    expect(s.perm("opponent").stack).toHaveLength(0);
  });

  it("counts distinct Tamer colors rather than Tamer quantity", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-061", as: "metalgreymon" }],
          battleArea: [
            { card: "BT1-085", as: "redA" },
            { card: "BT1-085", as: "redB" },
            { card: "BT1-086", as: "blueA" },
            { card: "BT1-086", as: "blueB" },
          ],
        },
        1: { battleArea: [{ card: "BT21-045", as: "opponent", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalgreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-044");
    expect(s.perm("opponent").stack.map((card) => card.cardId)).toEqual(["BT21-042"]);
  });

  it("Q4565 grants Alliance mandatorily while Q4567 allows the attack to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-061", as: "metalgreymon" }],
          hand: [{ card: "ST20-10", as: "adventure" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("adventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => observe(s.engine).hasKeyword(permanent, "Alliance")),
    );

    expect(s.state.players[0]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
  });

  it("Q4731 still offers and resolves the attack after a non-ADVENTURE Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-061", as: "metalgreymon" }],
          hand: [{ card: "BT1-009", as: "nonAdventure" }],
        },
        1: { security: [{ card: "BT1-010", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonAdventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(
      s.state.players[0]!.battleArea.some((permanent) => observe(s.engine).hasKeyword(permanent, "Alliance")),
    ).toBe(false);
  });

  it("triggers from a public ADVENTURE digivolution and separates Alliance choice from attack choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-061", as: "source" },
            { card: "ST21-07", as: "base" },
            { card: "BT1-010", as: "ally" },
          ],
          hand: [{ card: "ST21-08", as: "evolved" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST21-08" && s.state.pendingDecision === undefined);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(true);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended && s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("ally").isSuspended).toBe(true);
  });

  it("independently chooses the Alliance recipient and effect attacker", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-061", as: "source" },
            { card: "ST21-07", as: "base" },
            { card: "BT1-010", as: "recipient" },
          ],
          hand: [{ card: "ST21-08", as: "adventure" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-001"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("adventure").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("recipient"), "Alliance") && s.state.pendingDecision?.kind === "optional",
    );
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(false);

    const decision = s.state.pendingDecision;
    expect(decision?.kind).toBe("optional");
    preferred.splice(0, preferred.length, s.perm("source").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("recipient").isSuspended).toBe(false);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "attackDeclared", attackerPermanentId: s.perm("source").permanentId }),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Alliance")).toBe(false);
  });

  it("consumes the Your Turn watcher once across two public ADVENTURE plays", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-061", as: "source" },
            { card: "BT1-009", as: "firstRecipient" },
            { card: "BT1-010", as: "secondRecipient" },
          ],
          hand: [
            { card: "ST20-10", as: "firstAdventure" },
            { card: "ST20-10", as: "secondAdventure" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("firstRecipient").permanentId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstAdventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("firstRecipient"), "Alliance"));

    preferred.splice(0, preferred.length, s.perm("secondRecipient").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondAdventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("secondAdventure").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("firstRecipient"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("secondRecipient"), "Alliance")).toBe(false);
    expect(s.perm("firstRecipient").isSuspended).toBe(false);
    expect(s.perm("secondRecipient").isSuspended).toBe(false);
  });

  it("grants inherited Alliance to a realistic higher evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-057", as: "source" }],
        hand: [
          { card: "BT21-061", as: "metalgreymon" },
          { card: "ST15-12", as: "host" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("metalgreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT21-061");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "ST15-12");
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(true);
  });
});
