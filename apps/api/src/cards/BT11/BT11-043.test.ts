import "./BT11-040.js";
import "../BT5/BT5-047.js";
import "../BT15/BT15-035.js";
import "../EX1/EX1-005.js";
import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-043.js";

describe("BT11-043 KingSukamon", () => {
  it("maps its alternate evolution, conditional rewrite, scaling, and unrestricted prevention cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Sukamon"], cost: 3, isAlternate: true }]);
    expect(compiled.effects[3]).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          actions: [{ kind: "Prevent", cost: { target: { filter: { controller: "any", excludeSelf: true } } } }],
        },
      ],
    });
  });

  it("replaces an opponent Digimon's original name, color and DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-043", as: "king" }], trash: ["BT11-040", "BT11-040", "BT11-040"] },
        1: { battleArea: [{ card: "ST15-11", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const target = s.perm("target");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => target.currentDP === 3000);

    expect(observe(s.engine).effectiveNames(target)).toEqual(["sukamon"]);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["White"]);
    expect(target.currentDP).toBe(3000);
    // Published to the client too: the board draws the token from these fields rather than
    // inferring a transformation from a name that no longer matches the art.
    expect(target.originalNameOverride).toBe("Sukamon");
    expect([...target.originalColorsOverride]).toEqual(["White"]);
    expect(target.originalDPOverride).toBe(3000);
  });

  it("does nothing when neither trash condition is met", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-043", as: "king" }] },
        1: { battleArea: [{ card: "ST15-11", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const target = s.perm("target");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-043"));

    expect(observe(s.engine).effectiveNames(target)).toEqual(["metalgreymon"]);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["Black"]);
    expect(target.currentDP).toBe(8000);
    expect(target.originalNameOverride).toBe("");
    expect([...target.originalColorsOverride]).toEqual([]);
    expect(target.originalDPOverride).toBe(0);
  });

  it("counts every other Sukamon for Security Attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-043", as: "king" },
            { card: "BT11-040", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT11-040", as: "opponentCost" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("king").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("king"), "SecurityAttack") === 2);
  });

  it("uses an own Sukamon during a real losing battle to prevent deletion from its inherited effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-044", as: "host", dp: 11000, under: ["BT11-043"] },
            { card: "BT11-040", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target", suspended: true }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const costId = s.inst("cost").instanceId;
    const costPermanentId = s.perm("cost").permanentId;
    const revealedTrashIds = s.state.players[0]!.deck.slice(0, 3).map((c) => c.instanceId);
    const targetId = s.perm("target").permanentId;
    preferred.push(costId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([costId, ...revealedTrashIds]);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(costPermanentId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([targetId]);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});

async function playKingSukamonOnto(s: EngineSetup, targetAlias: string): Promise<void> {
  s.state.memory = 20;
  const target = s.perm(targetAlias);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
  await settle(() => target.originalNameOverride === "Sukamon");
}

describe("BT11-043 KingSukamon — KB Q&A rulings", () => {
  it("lets a deleted Palmon renamed to Sukamon place itself from the trash as a [Palmon] with its [On Deletion] (Q1334)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-043", as: "king" }],
          trash: ["BT11-040", "BT11-040", "BT11-040"],
        },
        1: {
          battleArea: [
            { card: "BT5-047", as: "palmon" },
            { card: "BT5-046", as: "green", under: ["BT5-048"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const palmonId = s.perm("palmon").topCard.instanceId;
    const existingId = s.perm("green").stack[0]!.instanceId;
    preferred.push(palmonId);

    await playKingSukamonOnto(s, "palmon");
    expect(observe(s.engine).effectiveNames(s.perm("palmon"))).toEqual(["sukamon"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);

    await advance(s.engine).verb.deletePermanent([s.perm("palmon").permanentId], "byEffect");
    await settle(() => s.perm("green").stack.some(({ instanceId }) => instanceId === palmonId));

    expect(s.perm("green").stack.map(({ instanceId }) => instanceId)).toEqual([palmonId, existingId]);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === palmonId)).toBe(false);
  });

  it("deletes an opponent's Sukamon with its inherited effect to prevent its own deletion (Q2078)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-044", as: "host", dp: 11000, under: ["BT11-043"] }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "target", suspended: true },
            { card: "BT11-040", as: "opponentSukamon" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const opponentSukamonCardId = s.inst("opponentSukamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT11-044");
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(opponentSukamonCardId);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-080"]);
  });

  it("does not let the first Sukamon interrupt again while its own deletion replacement is resolving (Q2079)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-040", as: "sukamonA", under: ["BT11-043"] },
            { card: "BT11-040", as: "sukamonB", under: ["BT11-043"] },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target", suspended: true }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const sukamonAId = s.perm("sukamonA").permanentId;
    const sukamonBId = s.perm("sukamonB").permanentId;
    const sukamonATopId = s.inst("sukamonA").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sukamonAId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const preventionOffers = s.decisions
      .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT11-043")
      .map(({ req }) => req.sourcePermanentId);
    expect(preventionOffers).toEqual([sukamonAId, sukamonBId]);
    const battleAreaIds = s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId);
    expect(battleAreaIds).not.toContain(sukamonAId);
    expect(battleAreaIds).toContain(sukamonBId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(sukamonATopId);
  });

  it("gives the opponent's Digimon an original name of Sukamon, original color white and original DP 3000 (Q2080)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-043", as: "king" }], trash: ["BT11-040", "BT11-040", "BT11-040"] },
        1: { battleArea: [{ card: "ST15-11", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const target = s.perm("target");
    expect(target.currentDP).toBe(8000);

    await playKingSukamonOnto(s, "target");
    expect(observe(s.engine).effectiveNames(target)).toEqual(["sukamon"]);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["White"]);
    expect(target.currentDP).toBe(3000);

    await advance(s.engine).verb.modifyDP(target.permanentId, 2000, EffectDuration.UntilOpponentTurnEnd);
    expect(target.currentDP).toBe(5000);
  });

  it("replaces the name a (Rule) gives, so BT15-035 Geremon is named only Sukamon (Q2081)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-043", as: "king" }], trash: ["BT11-040", "BT11-040", "BT11-040"] },
        1: { battleArea: [{ card: "BT15-035", as: "geremon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).effectiveNames(s.perm("geremon"))).toEqual(expect.arrayContaining(["geremon", "numemon"]));

    await playKingSukamonOnto(s, "geremon");

    expect(observe(s.engine).effectiveNames(s.perm("geremon"))).toEqual(["sukamon"]);
  });

  it("keeps the color EX1-005 Tyrannomon's effect gives, making it white and green (Q2082)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-043", as: "king" }], trash: ["BT11-040", "BT11-040", "BT11-040"] },
        1: { battleArea: [{ card: "EX1-005", as: "tyrannomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await playKingSukamonOnto(s, "tyrannomon");
    const tyrannomon = s.perm("tyrannomon");
    expect(observe(s.engine).effectiveColors(tyrannomon)).toEqual(["White"]);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect([...observe(s.engine).effectiveColors(tyrannomon)].sort()).toEqual(["Green", "White"]);
    expect(observe(s.engine).effectiveColors(tyrannomon)).not.toContain("Red");
  });

  it("keeps the white 3000 DP Sukamon information after the Digimon digivolves or is de-digivolved (Q2083)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-043", as: "king" }], trash: ["BT11-040", "BT11-040", "BT11-040"] },
        1: {
          battleArea: [{ card: "ST15-11", as: "target", under: ["BT1-009"] }],
          hand: [{ card: "ST1-11", as: "wargreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await playKingSukamonOnto(s, "target");
    const targetId = s.perm("target").permanentId;
    const expectSukamonTransformation = (): void => {
      const target = s.perm("target");
      expect(observe(s.engine).effectiveNames(target)).toEqual(["sukamon"]);
      expect(observe(s.engine).effectiveColors(target)).toEqual(["White"]);
      expect(target.currentDP).toBe(3000);
    };

    await advance(s.engine).verb.digivolveFromInstance(targetId, s.inst("wargreymon").instanceId, {
      payCost: false,
      draw: false,
      ignoreRequirements: true,
    });
    expect(s.perm("target").topCard.cardId).toBe("ST1-11");
    expect(s.perm("target").baseDP).toBe(12000);
    expectSukamonTransformation();

    await internalsOf(s.engine).primitives.deDigivolve(targetId, 1, { byEffectSeat: 0 });
    expect(s.perm("target").topCard.cardId).toBe("ST15-11");
    expect(s.perm("target").baseDP).toBe(8000);
    expectSukamonTransformation();
  });

  it("leaves the Digimon without DP when trashing its top card exposes a Digi-Egg or Tamer (Q2084)", async () => {
    const exposedCards = [
      { exposedCard: "ST1-07", expectedDP: 3000 },
      { exposedCard: "BT1-001", expectedDP: 0 },
      { exposedCard: "BT1-085", expectedDP: 0 },
    ];
    for (const { exposedCard, expectedDP } of exposedCards) {
      const s = setupEngine(
        {
          0: { hand: [{ card: "BT11-043", as: "king" }], trash: ["BT11-040", "BT11-040", "BT11-040"] },
          1: { battleArea: [{ card: "ST15-11", as: "target", under: [exposedCard] }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await playKingSukamonOnto(s, "target");
      const target = s.perm("target");
      expect(target.currentDP).toBe(3000);

      await internalsOf(s.engine).primitives.trashStackTops(target.permanentId, 1, { byEffectSeat: 0 });

      expect(target.topCard.cardId).toBe(exposedCard);
      expect(target.originalNameOverride).toBe("Sukamon");
      expect([...target.originalColorsOverride]).toEqual(["White"]);
      expect(target.currentDP).toBe(expectedDP);
    }
  });
});
