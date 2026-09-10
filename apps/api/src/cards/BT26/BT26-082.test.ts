import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-082.js";
import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-082 compiled behavior", () => {
  it("proves security timing, both alternate evolutions, indivisible alternate costs, deletion, and Birdkin rule trait", () => {
    expect(getCardDefinition("BT26-082")).toMatchObject({
      nameEn: "Ravemon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Cyborg", "DATA SQUAD"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Crowmon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
    ]);
    // Q7117/Q7122: the printed clause is a {Security} [End of Opponent's Turn] effect, not the
    // check-triggered [Security] tag, so no effect may be filed under the security-check timing.
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toBeUndefined();
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfOpponentsTurn")).toMatchObject({
      isSecurity: true,
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Birdkin"],
    });
    for (const trigger of ["WhenDigivolving", "EndOfAttack"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        optional: true,
        abortOnDecline: true,
        options: [
          [{ kind: "Delete", target: { filter: { superlative: "highestDP" } }, cost: { kind: "deleteOwn" } }],
          [
            {
              kind: "Delete",
              target: { filter: { superlative: "highestDP" } },
              cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 2 },
            },
          ],
        ],
      });
    }
  });

  it("digivolves from Crowmon and an off-color level-5 DATA SQUAD Digimon for 3", async () => {
    const fromCrowmon = setupEngine({
      0: {
        battleArea: [{ card: "BT26-076", as: "crowmon" }],
        hand: [{ card: "BT26-082", as: "ravemon" }],
        deck: ["BT1-009"],
      },
    });
    fromCrowmon.state.memory = 3;
    await fromCrowmon.ready();
    expect(
      fromCrowmon.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fromCrowmon.perm("crowmon").permanentId,
        instanceId: fromCrowmon.inst("ravemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => fromCrowmon.perm("crowmon").topCard.cardId === "BT26-082");
    expect(fromCrowmon.state.memory).toBe(0);

    const fromDataSquad = setupEngine({
      0: {
        battleArea: [{ card: "BT26-044", as: "greenDataSquad" }],
        hand: [{ card: "BT26-082", as: "ravemon" }],
        deck: ["BT1-010"],
      },
    });
    fromDataSquad.state.memory = 3;
    await fromDataSquad.ready();
    expect(
      fromDataSquad.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fromDataSquad.perm("greenDataSquad").permanentId,
        instanceId: fromDataSquad.inst("ravemon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => fromDataSquad.perm("greenDataSquad").topCard.cardId === "BT26-082");
    expect(fromDataSquad.state.memory).toBe(0);
  });

  it("publicly plays from hand without opening a When Digivolving effect", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT26-082", as: "ravemon" }] },
    });
    s.state.memory = 13;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ravemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-082"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-082");
    expect(s.state.memory).toBe(1);
  });

  it("trashes from the opponent's hand before the optional face-up bottom-security placement", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnDeletion")?.actions).toEqual([
      expect.objectContaining({
        kind: "Trash",
        chooser: "opponent",
        target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
      }),
      expect.objectContaining({
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        from: ["trash"],
        toTop: false,
        faceUp: true,
        optional: true,
        condition: { kind: "handAtMost", controller: "opponent", value: 7 },
      }),
    ]);
  });

  it("resolves the printed delete-self cost against the opponent's highest-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-076", as: "crowmon" }], hand: [{ card: "BT26-082", as: "ravemon" }] },
        1: {
          battleArea: [
            { card: "BT1-084", as: "highest", suspended: true },
            { card: "BT1-010", as: "lower" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("crowmon").permanentId,
        instanceId: s.inst("ravemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("crowmon").topCard.cardId === "BT26-082");

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-082")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-084")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-010")).toBe(true);
  });

  it("resolves the same delete modal at End of Attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-082", as: "ravemon" }], deck: ["BT1-011", "BT1-012"] },
        1: {
          battleArea: [
            { card: "BT1-084", as: "highest", suspended: true },
            { card: "BT1-010", as: "lower" },
          ],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ravemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-010"]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline the by-cost activation without deleting either Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-076", as: "crowmon" }], hand: [{ card: "BT26-082", as: "ravemon" }] },
        1: { battleArea: [{ card: "BT1-084", as: "highest" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("crowmon").permanentId,
        instanceId: s.inst("ravemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("crowmon").topCard.cardId === "BT26-082");

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Q7123 cannot pay the Tamer-stack branch with only 1 face-down card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-076", as: "crowmon" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-009", faceUp: false }] },
          ],
          hand: [{ card: "BT26-082", as: "ravemon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-084", as: "highest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("crowmon").permanentId,
      "beDeleted",
      EffectDuration.UntilEachTurnEnd,
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("crowmon").permanentId,
        instanceId: s.inst("ravemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("crowmon").topCard.cardId === "BT26-082");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-082");
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("trashes 2 bottom face-down cards across Tamers and deletes the highest-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-076", as: "crowmon" },
            { card: "BT1-089", as: "firstTamer", under: [{ card: "BT1-009", faceUp: false }] },
            { card: "BT1-089", as: "secondTamer", under: [{ card: "BT1-010", faceUp: false }] },
          ],
          hand: [{ card: "BT26-082", as: "ravemon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-084", as: "highest" },
            { card: "BT1-009", as: "lower" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();

    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("crowmon").permanentId,
        instanceId: s.inst("ravemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("crowmon").topCard.cardId === "BT26-082");

    expect(s.perm("firstTamer").stack).toHaveLength(0);
    expect(s.perm("secondTamer").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-082");
  });

  it("plays itself from face-up security at the end of the opponent's turn", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-082", as: "securityRavemon", faceUp: true }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT26-082"));

    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("securityRavemon").instanceId)).toBe(
      false,
    );
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q7119 checks the face-up card like a standard security card instead of playing it", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      1: { security: [{ card: "BT26-082", as: "securityRavemon", faceUp: true }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // Player-directed attack: it resolves through a security check, not a Digimon-vs-Digimon
    // battle, so "combatResolved" (only emitted by resolveDigimonBattle) never fires.
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT26-082");
  });

  it("Q7122 loses after the end-of-turn attack succeeds with no security remaining", async () => {
    // Real public flow: both the face-up Security end-of-opponent-turn effect and Execute's
    // end-of-turn attack are resolved by the turn loop. Ravemon is played first, leaving zero
    // security, then the attack succeeds and the owner loses under the empty-security rule.
    const s = setupEngine(
      {
        0: { security: [{ card: "BT26-082", as: "securityRavemon", faceUp: true }], deck: ["BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT20-072", as: "executor" }], deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.gameOver, 2000);

    expect(s.state.gameOver).toBe(true);
    expect(s.state.winnerSeat).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-082");
    await loop;
  });

  it("Q7121 turns Ravemon face down when an effect shuffles its security stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-087", as: "tk" }],
          security: [
            { card: "BT1-009", as: "selected" },
            { card: "BT26-082", as: "securityRavemon", faceUp: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("selected").instanceId);
    await s.ready();

    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT26-082", faceUp: false });
  });

  it("Q7117 does not activate the timed Security effect while face down or outside security", async () => {
    const faceDown = setupEngine({
      0: { security: [{ card: "BT26-082", as: "ravemon", faceUp: false }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    await faceDown.ready();
    const faceDownLoop = faceDown.engine.startTurnLoop();
    await advance(faceDown.engine).waitForMainPhase(0);
    advance(faceDown.engine).endMainPhaseIfOpen(0);
    await advance(faceDown.engine).waitForMainPhase(1);
    advance(faceDown.engine).endMainPhaseIfOpen(1);
    await advance(faceDown.engine).waitForMainPhase(0);
    expect(faceDown.state.players[0]!.security.map(({ cardId }) => cardId)).toContain("BT26-082");
    expect(faceDown.state.players[0]!.battleArea).toHaveLength(0);
    expect(faceDown.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await faceDownLoop;

    const inTrash = setupEngine({
      0: { trash: [{ card: "BT26-082", as: "ravemon" }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    await inTrash.ready();
    const inTrashLoop = inTrash.engine.startTurnLoop();
    await advance(inTrash.engine).waitForMainPhase(0);
    advance(inTrash.engine).endMainPhaseIfOpen(0);
    await advance(inTrash.engine).waitForMainPhase(1);
    advance(inTrash.engine).endMainPhaseIfOpen(1);
    await advance(inTrash.engine).waitForMainPhase(0);
    expect(inTrash.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-082");
    expect(inTrash.state.players[0]!.battleArea).toHaveLength(0);
    expect(inTrash.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await inTrashLoop;
  });

  it("places itself face up at bottom security when the opponent reaches 7 cards after trashing", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-082", as: "ravemon" }],
          security: [{ card: "BT1-009", as: "existingSecurity" }],
        },
        1: {
          hand: [
            { card: "BT1-010", as: "chosen" },
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-009",
            "BT1-010",
            "BT1-011",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("chosen").instanceId);
    const ravemonId = s.inst("ravemon").instanceId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ravemon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === ravemonId));

    expect(s.state.players[1]!.hand).toHaveLength(7);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("chosen").instanceId);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: ravemonId, faceUp: true });
  });

  it("does not place itself in security when the opponent still has 8 cards after trashing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-082", as: "ravemon" }] },
        1: {
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ravemon").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-082");
  });

  it("may decline the optional bottom-security placement at 7 opponent cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-082", as: "ravemon" }] },
        1: {
          hand: [
            { card: "BT1-009", as: "chosen" },
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-009",
            "BT1-010",
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ravemon").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[1]!.hand).toHaveLength(7);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-082");
  });

  it("grants itself the Birdkin rule trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-082", as: "ravemon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("ravemon"), "Birdkin")).toBe(true);
  });
});
