import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-042";

async function playAndDeclineMaquinamonLink(s: ReturnType<typeof setupEngine>) {
  const effect = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
  await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
  const play = s.decisions.find(({ req }) => req.kind === "optional")!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: play.decisionId,
      response: { kind: "optional", accept: true },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
  const link = s.decisions.filter(({ req }) => req.kind === "optional").at(-1)!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: link.decisionId,
      response: { kind: "optional", accept: false },
    }),
  ).toEqual({ ok: true });
  await effect;
}

describe("EX11-042 MockingBirdmon", () => {
  it("preserves printed stats, text evolution, linking deletion, and inherited redirect", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "MockingBirdmon",
      colors: ["Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      types: ["Machine", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand", "linked"],
        payCost: false,
        optional: true,
        // FAILS-WHEN-REVERTED: "THIS Digimon's digivolution cards" — without hostFilter the
        // pool spans every friendly Digimon's stack.
        target: { filter: { hostFilter: { isSelfRef: true } } },
      });
    }
    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(linked).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 },
            },
          ],
        },
      ],
    });
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack" }] }],
    });
  });

  it("plays Maquinamon without deleting opponents when its later link is declined", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("maquinamon").instanceId, s.perm("cost5").permanentId);
    const cost5Id = s.perm("cost5").permanentId;
    const cost6Id = s.perm("cost6").permanentId;
    await playAndDeclineMaquinamonLink(s);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-027")).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(cost5Id);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(cost6Id);
    assertNoLoudGap(s);
  });

  it.each([
    ["refuses an eligible Maquinamon", "EX11-027", false],
    ["excludes ExMaquinamon by exact name", "EX11-073", true],
  ] as const)("%s", async (_label, candidate, accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: candidate, as: "candidate" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
    );
    const candidateId = s.inst("candidate").instanceId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(candidateId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not play a Maquinamon from this Digimon's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["EX11-027"] }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").stack.map(({ cardId: id }) => id)).toEqual(["EX11-027"]);
  });

  it("plays a Maquinamon out of its OWN link cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", linked: ["EX11-027"] }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").linked).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-027")).toBe(true);
    assertNoLoudGap(s);
  });

  it("preserves the same Maquinamon linked to another eligible host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "EX11-040", as: "decoy", linked: [{ card: "EX11-027", as: "decoyLink" }] },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").linked).toHaveLength(0);
    expect(s.perm("decoy").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("decoyLink").instanceId]);
    assertNoLoudGap(s);
  });

  it("redirects one opponent attack to this inherited host, then allows the next attack through", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-067", as: "source", under: [cardId], suspended: true }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker1", dp: 8000 },
            { card: "BT1-009", as: "attacker2", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("deletes only a play-cost-5 opponent on this host's link and shares one once-per-turn use", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source", linked: ["EX11-027"] }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cost5a" },
            { card: "AD1-001", as: "cost5b" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("source").permanentId });
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("cost5b").permanentId,
      s.perm("cost6").permanentId,
    ]);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("source").permanentId });
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("cost5b").permanentId,
      s.perm("cost6").permanentId,
    ]);
  });

  it("does not delete when another host gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "EX11-040", as: "other", linked: ["EX11-027"] },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "cost5" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not redirect when the inherited optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-067", as: "source", under: [cardId], suspended: true }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("does not redirect when EX11-042 is not inherited", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
