import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-028.js";

describe("BT22-028 Ariemon", () => {
  it("plays one qualifying stack card at each level and shares the once-per-turn costed reaction", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.6 or lower w/[Aqua]/[Sea Animal] in any trait)＞" }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            leaveCause: "otherThanBattle",
            sourceFilter: { isSelfRef: true },
            actions: [
              {
                kind: "PlayWithoutCost",
                fromOwnDigivolutionStack: true,
                payCost: false,
                playedByDecode: true,
                optional: true,
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 6 },
                    nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
                  },
                  count: 1,
                },
              },
            ],
          },
        ],
      }),
    );
    const digivolving = compiled.effects.filter((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving[0]?.optional).toBe(true);
    expect(digivolving[0]?.actions).toHaveLength(3);
    expect(digivolving[0]?.actions.map((action) => (action as any).target.filter.levels)).toEqual([[3], [4], [5]]);
    expect(
      digivolving[0]?.actions.every(
        (action) => (action as any).fromOwnDigivolutionStack === true && (action as any).optional === false,
      ),
    ).toBe(true);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && entry.actions[0]?.kind === "Return");
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Return",
            to: "deckBottom",
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "place",
              position: "bottom",
              destination: "digivolutionStack",
              host: "self",
              targetIsPermanent: true,
            },
          },
          { kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } },
        ],
      });
    }
  });

  it("plays every available level bucket from a mixed realistic evolution stack as required by Q5213", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-028",
              as: "ariemon",
              under: ["BT22-018", "BT22-021", "BT22-024", "BT22-027"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ariemon"));
    await settle(() => s.state.players[0]!.battleArea.length === 4);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT22-018",
      "BT22-021",
      "BT22-024",
      "BT22-028",
    ]);
    expect(s.perm("ariemon").stack.map((card) => card.cardId)).toEqual(["BT22-027"]);
  });

  it("pays with another Digimon, bottom-decks exactly one opponent, unsuspends, and shares frequency", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-028", as: "ariemon", suspended: true },
            { card: "BT22-021", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT22-024", as: "firstTarget" },
            { card: "BT22-024", as: "secondTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ariemon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.perm("ariemon").stack.map((card) => card.cardId)).toEqual(["BT22-021"]);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT22-024");
    expect(s.perm("ariemon").isSuspended).toBe(false);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ariemon"));
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("leaves all zones and suspension unchanged when the optional stack cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-028", as: "ariemon", suspended: true },
            { card: "BT22-021", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT22-024", as: "target" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ariemon"));
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"), 60);
    const prompt = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt !== undefined) {
      expect(
        s.engine.applyIntent(prompt.seat, {
          type: "respondDecision",
          decisionId: prompt.req.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
    }
    await resolution;

    expect(s.perm("ariemon").isSuspended).toBe(true);
    expect(s.perm("ariemon").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });

  it("executes Decode from its own stack on a non-battle leave", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-028", under: ["BT22-024"], as: "host" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-024"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT22-024"]);
  });
});
