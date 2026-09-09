import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
import "./EX11-065.js";

const cardId = "EX11-044";

describe("EX11-044 Pyramidimon", () => {
  it("preserves printed stats, keywords, exact optional cost, and bottom-stack recovery", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Pyramidimon",
      colors: ["Black"],
      level: 6,
      playCost: 11,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      types: ["Mineral", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    expect(compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Reboot" }),
        expect.objectContaining({ keyword: "Fragment", amount: 3 }),
      ]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ex11-044-main-effect" });
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        target: { filter: { superlative: "highestPlayCost", kind: ["Digimon", "Tamer"] } },
        // FAILS-WHEN-REVERTED: canPayCost recognizes a stack-trash cost only through
        // filter.zone; with just `from` the affordability gate falls through to its default.
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine", zone: "digivolutionCards" }, from: ["digivolutionCards"], count: 3 },
        },
      });
    }
    const recovery = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(recovery.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDigivolutionTrashed",
      sourceFilter: { isSelfRef: true, byEffect: true },
    });
    expect(irNode(recovery.actions[0]!).actions[0]).toMatchObject({ kind: "PlaceUnder", position: "bottom" });
    expect(irNode(recovery.actions[0]!).actions[0]!.target).toMatchObject({ from: ["trash"], count: 3 });
    expect(irNode(recovery.actions[0]!).actions[0]!.target.upTo).toBeUndefined();
  });

  it("pays exactly 3 Mineral sources, deletes only the highest cost, and recovers all 3", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: cardId,
              as: "source",
              under: [
                { card: "EX11-038", as: "firstMineral" },
                { card: "EX11-038", as: "secondMineral" },
                { card: "EX11-038", as: "thirdMineral" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost6").permanentId);
    const cost5Id = s.perm("cost5").permanentId;
    const cost6Id = s.perm("cost6").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== cost6Id));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(cost5Id);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(cost6Id);
    expect(s.perm("source").stack.map(({ cardId: id }) => id)).toEqual(["EX11-038", "EX11-038", "EX11-038"]);
    // The payable path DOES ask, so the empty-prompt assertion in the 2-source case below is a
    // real discriminator and not vacuously true.
    expect(s.decisions.filter(({ req }) => req.kind === "optional").length).toBeGreaterThan(0);
    assertNoLoudGap(s);
  });

  /** KB Q5890: the 3 cards may be spread across several of your Digimon's stacks. */
  it("pays the 3 Mineral sources across two different Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source", under: ["EX11-038", "EX11-038"] },
            { card: "BT1-019", as: "ally", under: ["EX11-038"] },
          ],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cost5" },
            { card: "AD1-011", as: "cost8" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost8").permanentId);
    const cost5Id = s.perm("cost5").permanentId;
    const cost8Id = s.perm("cost8").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== cost8Id));
    // The [All Turns] watcher fires on the effect-driven stack trash and rebuilds the SOURCE's
    // stack from the trash; the ALLY's paid card is not returned to it.
    expect(s.perm("source").stack.map(({ cardId: id }) => id)).toEqual(["EX11-038", "EX11-038", "EX11-038"]);
    expect(s.perm("ally").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(cost5Id);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(cost8Id);
    assertNoLoudGap(s);
  });

  /** KB Q5889: a "by" cost cannot be partially paid — 2 sources delete nothing and trash nothing. */
  it("deletes nothing and trashes nothing when only 2 Mineral sources exist", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source", under: ["EX11-038", "EX11-038"] }] },
        1: { battleArea: [{ card: "AD1-011", as: "cost8" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cost8Id = s.perm("cost8").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").stack.map(({ cardId: id }) => id)).toEqual(["EX11-038", "EX11-038"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(cost8Id);
    // FAILS-WHEN-REVERTED: this is the observable half of the `filter.zone` fix. canPayCost
    // recognizes a stack-trash cost only through filter.zone; without it the gate returned its
    // `true` default and the unpayable clause still opened an optional prompt.
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("resolves the same paid deletion and recovery through public When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base", under: ["EX11-038", "EX11-038", "EX11-038"] }],
          hand: [{ card: cardId, as: "evolver" }],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cost5" },
            { card: "AD1-011", as: "cost8" },
          ],
          security: ["BT1-019", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const cost8Id = s.perm("cost8").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(cost8Id);
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual(["EX11-038", "EX11-038", "EX11-038", "BT10-064"]);
    assertNoLoudGap(s);
  });

  it("records the public Close producer seam: another effect trashes Pyramidimon's card without self recovery", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-065", as: "close" },
            { card: cardId, as: "source", under: [{ card: "EX11-038", as: "mineral" }] },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toContain("EX11-038");
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });
});
