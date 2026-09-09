import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-043.js";

/** Drive one production turn, running `body` inside the open Main phase of `seat`. */
async function runTurnWith(s: EngineSetup, seat: 0 | 1, body: () => Promise<void>): Promise<void> {
  const driver = advance(s.engine);
  const turn = s.engine.runOneTurn();
  await driver.waitForMainPhase(seat);
  await body();
  driver.endMainPhaseIfOpen(seat);
  await turn;
}

const securityIds = (s: EngineSetup, seat: 0 | 1): string[] =>
  s.state.players[seat]!.security.map((card) => card.instanceId);

const inert = (n: number): string[] => Array.from({ length: n }, () => "BT1-009");

describe("BT19-043 Lucemon (X Antibody)", () => {
  it("matches the catalog print and evolution costs", () => {
    expect(getCardDefinition("BT19-043")).toMatchObject({
      cardId: "BT19-043",
      nameEn: "Lucemon (X Antibody)",
      colors: ["Yellow", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 14,
      dp: 14000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "X Antibody", "Seven Great Demon Lords"],
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 6 },
        { color: "Purple", level: 5, memoryCost: 6 },
      ],
    });
    // The catalog uses NBSPs inside the printed lines; normalize them for the comparison.
    expect(getCardDefinition("BT19-043")!.effectText!.replaceAll("\u00a0", " ")).toBe(
      "[Digivolve]Lv.5 or higher w/[Lucemon] in its name: Cost 3 \n\n" +
        "[All Turns] [Once Per Turn] When this Digimon would leave the battle area, if a card with [Lucemon] in its name is in this Digimon's digivolution cards, by trashing both players' top security cards, it doesn't leave.\n" +
        "[End of Your Turn] [Once Per Turn] Your opponent may trash their top security card. If this effect didn't trash, ＜Recovery +1 (Deck)＞ , and delete 1 of your opponent's Digimon or Tamers.",
    );
  });

  it("compiles the substring name gates, the self-scoped replacement and the atomic cost", () => {
    // "w/[Lucemon] in its name" is a SUBSTRING gate (unlike a bare bracketed `[Name]`), so
    // `names` is right here and [Lucemon: Chaos Mode] is a legal source.
    expect(digivolutionRequirementsFor("BT19-043")).toEqual([
      { levelMin: 5, names: ["Lucemon"], cost: 3, isAlternate: true },
    ]);

    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    // The printed "[All Turns]" must be the AllTurns trigger, not Static.
    expect(allTurns.frequency).toBe("OncePerTurn");
    expect(allTurns.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      // Without `isSelfRef` the generic replacement branch would protect every seat's Digimon.
      sourceFilter: { isSelfRef: true },
      cost: { kind: "trashBothSecurityTop" },
      condition: { kind: "selfDigivolutionStackMatchesFilter" },
    });

    const endOfTurn = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")!;
    expect(endOfTurn.frequency).toBe("OncePerTurn");
    expect(endOfTurn.actions.map((action) => action.kind)).toEqual(["SecurityManipulation", "Recover", "Delete"]);
    expect(endOfTurn.actions[0]).toMatchObject({ op: "trashTop", controller: "opponent", optionalFor: "opponent" });
  });

  it("digivolves for 3 memory from a Lv.5 [Lucemon: Chaos Mode] and keeps the stack identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-111", as: "base", under: ["BT18-034"] }],
          hand: [{ card: "BT19-043", as: "luceX" }, "BT1-009"],
          deck: inert(6),
          security: inert(3),
        },
        1: { security: inert(3) },
      },
      // The replacement and the [End of Your Turn] clause both raise decisions; answer them so
      // the real turn can close.
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await runTurnWith(s, 0, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("luceX").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT19-043");
      // The cost-3 alternate route, not the printed cost-6 EvoCost.
      expect(s.state.memory).toBe(2);
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT18-034", "BT7-111"]);
      expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
    });
  });

  it("refuses the route from a near-miss name and from a too-low level", async () => {
    // BT1-020 Groundramon: Lv.5 but no [Lucemon] in its name.
    // BT18-034 Lucemon: the right name but Lv.3, below "Lv.5 or higher".
    // Neither satisfies the printed Yellow/Purple Lv.5 EvoCost either, so the whole intent is
    // refused instead of silently falling back to it.
    for (const base of ["BT1-020", "BT18-034"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: "BT19-043", as: "luceX" }, "BT1-009"],
            deck: inert(6),
            security: inert(3),
          },
          1: { security: inert(3) },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 8;
      await s.ready();

      await runTurnWith(s, 0, async () => {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("luceX").instanceId,
            useAlternateCost: true,
            alternateRequirementIndex: 0,
          }).ok,
        ).toBe(false);
        expect(s.perm("base").topCard?.cardId).toBe(base);
      });
    }
  });

  it("survives a lost battle by trashing both top security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-043", as: "luceX", under: ["BT7-111"] }],
          hand: ["BT1-009"],
          deck: inert(6),
          security: [
            { card: "BT1-009", as: "mineTop" },
            { card: "BT1-013", as: "mineSecond" },
            { card: "BT1-014", as: "mineThird" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", dp: 14000, suspended: true }],
          security: [
            { card: "BT1-009", as: "oppTop" },
            { card: "BT1-013", as: "oppSecond" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await runTurnWith(s, 0, async () => {
      // Equal DP: both would be deleted after the battle (CR 11-4). The replacement keeps
      // BT19-043 on the board.
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("luceX").permanentId,
          target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-043"]);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(securityIds(s, 0)).toEqual([s.inst("mineSecond").instanceId, s.inst("mineThird").instanceId]);
      expect(securityIds(s, 1)).toEqual([s.inst("oppSecond").instanceId]);
    });
  });

  it("cannot prevent the leave without a [Lucemon] digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-043", as: "luceX", under: ["BT1-020"] }],
          hand: ["BT1-009"],
          deck: inert(6),
          security: inert(3),
        },
        1: { security: inert(3) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("luceX").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    // The gate failed, so neither player paid.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it.each([0, 1] as const)("Q3096: seat %s having no security makes the whole cost unpayable", async (emptySeat) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-043", as: "luceX", under: ["BT7-111"] }],
          hand: ["BT1-009"],
          deck: inert(6),
          security: emptySeat === 0 ? [] : [{ card: "BT1-009", as: "survivor" }],
        },
        1: { security: emptySeat === 1 ? [] : [{ card: "BT1-009", as: "survivor" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("luceX").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    // "A 'by doing X' condition can't be met if only some of the required actions are
    // performed" — the non-empty side keeps its card.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(securityIds(s, emptySeat)).toEqual([]);
    expect(securityIds(s, emptySeat === 0 ? 1 : 0)).toEqual([s.inst("survivor").instanceId]);
  });

  it("prevents only one leave per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-043", as: "luceX", under: ["BT7-111"] }],
          hand: ["BT1-009"],
          deck: inert(8),
          security: inert(6),
        },
        1: { hand: ["BT1-009"], deck: inert(8), security: inert(6) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("luceX").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 5);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(5);

    // Second leave in the same turn: the use is spent, so it is not prevented and nothing
    // further is paid.
    const survivor = s.perm("luceX").permanentId;
    await advance(s.engine).verb.deletePermanent([survivor], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.players[1]!.security).toHaveLength(5);
  });

  it("recharges the prevention on the same Digimon on a later own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-043", as: "luceX", under: ["BT7-111"] }],
          hand: ["BT1-009"],
          deck: inert(10),
          security: inert(8),
        },
        1: { hand: ["BT1-009"], deck: inert(10), security: inert(8) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);

    await drive.waitForMainPhase(0);
    await drive.verb.deletePermanent([s.perm("luceX").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 7);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    drive.endMainPhaseIfOpen(0);

    await drive.waitForMainPhase(1);
    drive.endMainPhaseIfOpen(1);

    // Same permanent, a later own turn: the once-per-turn use has reset, so it is protected
    // again and both players pay again.
    await drive.waitForMainPhase(0);
    const beforeMine = s.state.players[0]!.security.length;
    const beforeTheirs = s.state.players[1]!.security.length;
    await drive.verb.deletePermanent([s.perm("luceX").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === beforeMine - 1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-043"]);
    expect(s.state.players[1]!.security).toHaveLength(beforeTheirs - 1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("end of your turn: an accepting opponent trashes security and blocks the fallback", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-043", as: "luceX" }],
          hand: ["BT1-009"],
          deck: [{ card: "BT1-014", as: "deckTop" }, ...inert(6)],
          security: inert(3),
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "victim" }],
          security: [
            { card: "BT1-009", as: "oppTop" },
            { card: "BT1-013", as: "oppSecond" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(securityIds(s, 1)).toEqual([s.inst("oppSecond").instanceId]);
    // The trash happened, so neither the Recovery nor the deletion runs.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("deckTop").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-020"]);
  });

  it("end of your turn: a refusing opponent gives you the recovery and loses a permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-043", as: "luceX" },
            { card: "BT1-020", as: "myOwnDigimon" },
          ],
          hand: ["BT1-009"],
          deck: [{ card: "BT1-014", as: "deckTop" }, ...inert(6)],
          security: inert(3),
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "victim" }],
          security: [{ card: "BT1-009", as: "oppTop" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(securityIds(s, 1)).toEqual([s.inst("oppTop").instanceId]);
    // ＜Recovery +1 (Deck)＞: the deck's top card lands on TOP of the security stack.
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
    // Only an OPPONENT permanent is deleted; the near-miss own Digimon is untouched.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "BT19-043",
      "BT1-020",
    ]);
  });
});
