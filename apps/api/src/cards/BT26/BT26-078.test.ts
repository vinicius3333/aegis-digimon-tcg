import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-078.js";
import "../index.js";

describe("BT26-078 compiled behavior", () => {
  it("proves the TS evolution and delete-to-play effects with the Q7105 text/trait union", () => {
    expect(getCardDefinition("BT26-078")).toMatchObject({
      nameEn: "Cherubimon",
      colors: ["Purple", "Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      types: ["Cherub", "Titan", "TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["TS"], cost: 5, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              filter: {
                kind: ["Digimon", "Tamer"],
                playCostLte: 12,
                nameOrTrait: [
                  { tokens: ["Chronomon"], match: "text" },
                  { tokens: ["Titan"], match: "trait" },
                ],
              },
              count: 1,
            },
            cost: { kind: "deleteOwn", target: { isSelf: true } },
          },
        ],
      });
    }
  });

  it("restricts the Trash watcher to your turn, opponent memory 5+, and a played matching Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Trash")!;
    expect(effect).toMatchObject({
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Chronomon"], match: "text" },
              { tokens: ["Titan"], match: "trait" },
            ],
          },
          fireCondition: {
            kind: "allOf",
            conditions: [{ kind: "isYourTurn" }, { kind: "memoryAtLeast", value: 5, controller: "opponent" }],
          },
        },
      ],
    });
    expect(irNode(effect.actions[0]!).actions).toEqual([
      expect.objectContaining({
        kind: "Return",
        to: "deckBottom",
        target: expect.objectContaining({ isSelf: true }),
        optional: true,
      }),
      expect.objectContaining({
        kind: "GainKeyword",
        target: expect.objectContaining({ sourceRef: "triggerSubject" }),
        keyword: { keyword: "Rush" },
        duration: "untilEachTurnEnd",
      }),
      expect.objectContaining({
        kind: "GainKeyword",
        target: expect.objectContaining({ sourceRef: "triggerSubject" }),
        keyword: { keyword: "Execute" },
        duration: "untilEachTurnEnd",
      }),
      expect.objectContaining({
        kind: "GrantStatic",
        target: expect.objectContaining({ sourceRef: "triggerSubject" }),
        grant: "effects",
        tokens: ["Execute"],
        duration: "untilEachTurnEnd",
      }),
    ]);
  });

  it("digivolves for 5 from an off-color level-5 TS Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-015", as: "redTsBase" }],
        hand: [{ card: "BT26-078", as: "cherubimon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTsBase").permanentId,
        instanceId: s.inst("cherubimon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redTsBase").topCard.cardId === "BT26-078");

    expect(s.state.memory).toBe(0);
  });

  it("publicly deletes itself to play a qualifying Titan from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-078", as: "cherubimon" }],
          trash: [{ card: "BT26-021", as: "titan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cherubimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-021"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-021");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("BT26-078");
  });

  it("can play a DUAL Digimon/Option through its Digimon type, without admitting pure Options", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-078", as: "cherubimon" }], trash: [{ card: "BT26-056", as: "dual" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherubimon"));

    expect({
      battleArea: s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId),
      trash: s.state.players[0]!.trash.map(({ cardId }) => cardId),
    }).toEqual({ battleArea: ["BT26-056"], trash: ["BT26-078"] });
  });

  it("Q7105 plays a Tamer whose effect text mentions Chronomon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-078", as: "cherubimon" }],
          trash: [{ card: "BT26-096", as: "chronomonTextTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherubimon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-096"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-078");
  });

  it("Q7108 keeps both the card-kind and play-cost limits on every branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-078", as: "cherubimon" }],
          trash: [
            { card: "BT24-098", as: "pureTitanOption" },
            { card: "BT25-019", as: "cost13TitanDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherubimon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-078"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT24-098", "BT25-019"]),
    );
  });

  it("Q7106/Q7107 returns itself from trash and grants Rush plus executable Execute at opponent memory 5", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT26-078", as: "cherubimon" }],
          hand: [{ card: "BT24-010", as: "playedTitan" }],
          deck: [{ card: "BT1-001", as: "deckTop" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "executeTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("executeTarget").permanentId);
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedTitan").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.deck.at(-1)?.cardId === "BT26-078" &&
        observe(s.engine).hasKeyword(s.perm("playedTitan"), "Execute"),
    );

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT26-078");
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT26-078");
    expect(observe(s.engine).hasKeyword(s.perm("playedTitan"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("playedTitan"), "Execute")).toBe(true);
    expect(observe(s.engine).customEffectGrants(s.perm("playedTitan"))).toEqual(
      expect.arrayContaining([expect.objectContaining({ token: "Execute" })]),
    );

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT24-010"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT24-010");
  });

  it("Q7106 respects the optional return condition and grants nothing when declined", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT26-078", as: "cherubimon" }],
          battleArea: [{ card: "BT26-021", as: "playedTitan", enteredThisTurn: true }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = -5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("playedTitan").permanentId });

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-078");
    expect(observe(s.engine).hasKeyword(s.perm("playedTitan"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("playedTitan"), "Execute")).toBe(false);
  });

  it("lets the newly played Digimon attack through the granted Rush", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT26-078", as: "cherubimon" }],
          battleArea: [{ card: "BT26-021", as: "playedTitan", enteredThisTurn: true }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("playedTitan").permanentId });
    s.state.memory = 0;
    s.state.phase = Phase.Main;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("playedTitan").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not trigger from outside the trash or below the Q7107 memory threshold", async () => {
    const onBoard = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-078", as: "cherubimon" },
            { card: "BT26-021", as: "titan" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    onBoard.state.memory = -5;
    await onBoard.ready();
    await advance(onBoard.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: onBoard.perm("titan").permanentId,
    });
    expect(observe(onBoard.engine).hasKeyword(onBoard.perm("titan"), "Rush")).toBe(false);

    const belowFive = setupEngine(
      {
        0: { trash: [{ card: "BT26-078", as: "cherubimon" }], battleArea: [{ card: "BT26-021", as: "titan" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    belowFive.state.memory = -4;
    await belowFive.ready();
    await advance(belowFive.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: belowFive.perm("titan").permanentId,
    });
    expect(belowFive.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-078");
    expect(observe(belowFive.engine).hasKeyword(belowFive.perm("titan"), "Rush")).toBe(false);
  });

  it("Q7108 does not let a matching Tamer satisfy the Trash watcher's Digimon requirement", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT26-078", as: "cherubimon" }],
          battleArea: [{ card: "BT26-096", as: "chronomonTextTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("chronomonTextTamer").permanentId,
    });

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-078");
    expect(observe(s.engine).hasKeyword(s.perm("chronomonTextTamer"), "Rush")).toBe(false);
  });
});
