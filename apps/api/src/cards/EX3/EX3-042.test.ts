import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-042.js";
import "../index.js"; // the full catalog is registered in a real match

const whenDigivolving = "[When Digivolving] If this Digimon is suspended, suspend 1 of your opponent's Digimon.";
const inherited =
  "[Your Turn][Once Per Turn] When an effect suspends one of your Digimon, suspend 1 of your opponent's Digimon.";

describe("EX3-042 Toropiamon", () => {
  it("has the official identity and evolves from a green level 4 for 3", () => {
    expect(getCardDefinition("EX3-042")).toMatchObject({
      cardId: "EX3-042",
      nameEn: "Toropiamon",
      colors: ["Green"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Vegetation"],
      rarity: "C",
      imageId: "EX3-042",
    });
  });

  it("keeps its base suspended while digivolving and suspends exactly 1 chosen opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-072", suspended: true, as: "base" }],
          hand: [{ card: "EX3-042", as: "toropiamon" }],
          deck: ["BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "chosen" },
            { card: "BT1-029", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("toropiamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chosen").isSuspended);

    expect(s.perm("base").topCard.cardId).toBe("EX3-042");
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("untouched").isSuspended).toBe(false);
    expect(s.decisions.find(({ req }) => req.sourceCardId === "EX3-042")?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-042",
      options: { timing: "WhenDigivolving", effectText: whenDigivolving, min: 1, max: 1 },
    });
  });

  it("does not trigger its When Digivolving effect from an unsuspended base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-072", as: "base" }],
        hand: [{ card: "EX3-042", as: "toropiamon" }],
        deck: ["BT1-003"],
      },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("toropiamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-042");

    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-042")).toHaveLength(0);
  });

  it("offers only active opposing Digimon while keeping a suspended one visible but ineligible", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-072", suspended: true, as: "base" }],
        hand: [{ card: "EX3-042", as: "toropiamon" }],
        deck: ["BT1-003"],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "active" },
          { card: "BT1-030", as: "otherActive" },
          { card: "BT1-029", suspended: true, as: "alreadySuspended" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("toropiamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-042",
      options: {
        candidateInstanceIds: expect.arrayContaining([s.perm("active").permanentId, s.perm("otherActive").permanentId]),
        visibleInstanceIds: expect.arrayContaining([
          s.perm("active").permanentId,
          s.perm("otherActive").permanentId,
          s.perm("alreadySuspended").permanentId,
        ]),
        min: 1,
        max: 1,
      },
    });
    expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).toHaveLength(2);
    expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).not.toContain(s.perm("alreadySuspended").permanentId);
  });

  it("Vegetation family: inherited effect observes an effect suspending another own Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", under: ["EX3-042"], as: "host" },
            { card: "BT5-048", as: "vegetationAlly" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "chosen" },
            { card: "BT1-029", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("vegetationAlly").permanentId]);
    await settle(() => s.perm("chosen").isSuspended);

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("untouched").isSuspended).toBe(false);
    expect(s.decisions.find(({ req }) => req.sourceCardId === "EX3-042")?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-042",
      options: { timing: "YourTurn", effectText: inherited, min: 1, max: 1 },
    });
  });

  it("Q3416: an accepted Evade suspension triggers the inherited effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-041", under: ["EX3-042"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    await s.ready();
    const hostId = s.perm("host").permanentId;
    advance(s.engine).ledgers.continuous.addKeywordGrant(hostId, "Evade", EffectDuration.Permanent);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Evade")).toBe(true);

    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: hostId, accept: true })).toEqual({ ok: true });
    await deletion;
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("EX3-041");
  });

  it("inherited effect ignores opposing Digimon and rule-driven attack suspension", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-041", under: ["EX3-042"], as: "host" },
          { card: "BT5-048", as: "attacker" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "opposingSource" },
          { card: "BT1-029", as: "target" },
        ],
        security: ["BT1-003"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opposingSource").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-042")).toHaveLength(0);
  });

  it("inherited effect fires only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", under: ["EX3-042"], as: "host" },
            { card: "BT5-048", as: "firstAlly" },
            { card: "BT5-048", as: "secondAlly" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstAlly").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended);
    await advance(s.engine).verb.suspend([s.perm("secondAlly").permanentId]);
    await settle();

    expect(s.perm("firstTarget").isSuspended).toBe(true);
    expect(s.perm("secondTarget").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-042")).toHaveLength(1);
  });

  it("does not activate for the first time during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-041", under: ["EX3-042"], as: "host" },
          { card: "BT5-048", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", as: "target" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-042")).toHaveLength(0);
  });

  it("resets the inherited once-per-turn use on the controller's next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", under: ["EX3-042"], as: "host" },
            { card: "BT5-048", as: "firstAlly" },
            { card: "BT5-048", as: "secondAlly" },
            { card: "BT5-048", as: "nextTurnAlly" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "blockedTarget" },
            { card: "BT1-030", as: "nextTurnTarget" },
          ],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("nextTurnTarget").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstAlly").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended);
    await advance(s.engine).verb.suspend([s.perm("secondAlly").permanentId]);
    await settle();
    expect(s.perm("blockedTarget").isSuspended).toBe(false);

    const firstTurn = s.state.turnCount;
    await advance(s.engine).runTurn(0);
    expect(s.state.turnCount).toBeGreaterThan(firstTurn);
    s.perm("firstTarget").isSuspended = true;
    s.perm("blockedTarget").isSuspended = true;
    s.perm("nextTurnAlly").isSuspended = false;
    await advance(s.engine).verb.suspend([s.perm("nextTurnAlly").permanentId]);
    await settle(() => s.perm("nextTurnTarget").isSuspended);

    expect(s.perm("nextTurnTarget").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-042")).toHaveLength(1);
  });

  it("lets two inherited copies trigger independently after repeated recomputation", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", under: ["EX3-042"], as: "firstHost" },
            { card: "EX3-041", under: ["EX3-042"], as: "secondHost" },
            { card: "BT5-048", as: "ally" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);
    await s.ready();
    await advance(s.engine).recompute();
    await advance(s.engine).recompute();

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended && s.perm("secondTarget").isSuspended);

    expect(s.perm("firstTarget").isSuspended).toBe(true);
    expect(s.perm("secondTarget").isSuspended).toBe(true);
    expect(observe(s.engine).subscriptions("whenEffectSuspends")).toHaveLength(2);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-042")).toHaveLength(1);
  });
});
