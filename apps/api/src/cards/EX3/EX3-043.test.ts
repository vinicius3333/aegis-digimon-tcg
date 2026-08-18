import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-038.js";
import "./EX3-043.js";

const digisorptionClause =
  "＜Digisorption -3＞ (When one of your Digimon digivolves into this card from your hand, you may suspend 1 of your Digimon to reduce the digivolution cost by 3.)";

describe("EX3-043 Entmon", () => {
  it("has the official identity and evolves from a green level 4 for 4", () => {
    expect(getCardDefinition("EX3-043")).toMatchObject({
      cardId: "EX3-043",
      nameEn: "Entmon",
      colors: ["Green"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 4 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Vegetation"],
      rarity: "R",
      imageId: "EX3-043",
    });
  });

  it("Vegetation family: pays Digisorption with the only legal ally, reduces cost by 3, then unsuspends at 2", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-072", suspended: true, as: "woodmonBase" },
            { card: "EX3-038", as: "pomumonCost" },
            { card: "BT1-065", suspended: true, as: "ineligibleMushroomon" },
          ],
          hand: [{ card: "EX3-043", as: "entmon" }],
          deck: ["BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-028", as: "opposingDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("pomumonCost").topCard.instanceId);
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("woodmonBase").permanentId,
        instanceId: s.inst("entmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("woodmonBase").topCard.cardId === "EX3-043" && !s.perm("woodmonBase").isSuspended);

    expect(s.state.memory).toBe(0);
    expect(s.perm("pomumonCost").isSuspended).toBe(true);
    expect(s.perm("woodmonBase").isSuspended).toBe(false);
    // Pomumon's own registered watcher sees the Digisorption suspension and suspends the opponent.
    expect(s.perm("opposingDigimon").isSuspended).toBe(true);

    const optional = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "EX3-043")?.req;
    expect(optional).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-043",
      options: { timing: "Static", effectText: digisorptionClause },
    });
    const targetDecision = s.decisions.find(
      ({ req }) => req.kind === "chooseTargets" && req.sourceCardId === "EX3-043",
    )?.req;
    expect(targetDecision).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-043",
      options: {
        timing: "Static",
        effectText: digisorptionClause,
        candidateInstanceIds: [s.perm("pomumonCost").topCard.instanceId],
        min: 1,
        max: 1,
      },
    });
  });

  it("pays the full evolution cost and suspends nothing when Digisorption is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-072", as: "base" },
            { card: "EX3-038", as: "cost" },
          ],
          hand: [{ card: "EX3-043", as: "entmon" }],
          deck: ["BT1-003"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("entmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-043" && s.state.memory === 0);

    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("cost").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-043")).toHaveLength(1);
  });

  it("may suspend the evolving Digimon as the Digisorption payment and then unsuspend Entmon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-072", as: "base" },
            { card: "EX3-038", suspended: true, as: "ally" },
          ],
          hand: [{ card: "EX3-043", as: "entmon" }],
          deck: ["BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const entmonInstanceId = s.inst("entmon").instanceId;
    preferred.push(entmonInstanceId);
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("entmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("base").topCard.cardId === "EX3-043" && !s.perm("base").isSuspended && s.state.memory === 0,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.decisions.find(({ req }) => req.kind === "chooseTargets")?.req.options?.candidateInstanceIds).toContain(
      entmonInstanceId,
    );
  });

  it("pays the full cost across the memory gauge when Digisorption is available but declined at 1 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-072", as: "base" },
          { card: "EX3-038", as: "cost" },
        ],
        hand: [{ card: "EX3-043", as: "entmon" }],
        deck: ["BT1-003"],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("entmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.memory === -3);

    expect(s.perm("base").topCard.cardId).toBe("EX3-043");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("EX3-043");
    expect(s.state.memory).toBe(-3);
    expect(s.perm("cost").isSuspended).toBe(false);
  });

  it("cannot offer or apply Digisorption when every own Digimon is already suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-072", suspended: true, as: "base" },
          { card: "EX3-038", suspended: true, as: "ally" },
        ],
        hand: [{ card: "EX3-043", as: "entmon" }],
        deck: ["BT1-003"],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("entmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-043" && !s.perm("base").isSuspended);

    expect(s.state.memory).toBe(0);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-043")).toHaveLength(0);
  });

  it("stays suspended at the exact lower boundary of only 1 suspended own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-072", suspended: true, as: "base" },
            { card: "EX3-038", as: "readyAlly" },
          ],
          hand: [{ card: "EX3-043", as: "entmon" }],
          deck: ["BT1-003"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("entmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-043" && s.state.memory === 0);

    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("readyAlly").isSuspended).toBe(false);
  });

  it("does not count suspended opposing Digimon toward the When Digivolving threshold", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-072", suspended: true, as: "base" },
            { card: "EX3-038", as: "readyAlly" },
          ],
          hand: [{ card: "EX3-043", as: "entmon" }],
          deck: ["BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-028", suspended: true, as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("entmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-043" && s.state.memory === 0);

    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("attributes the automatic unsuspend resolution to Entmon's When Digivolving timing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-072", suspended: true, as: "base" },
          { card: "EX3-038", suspended: true, as: "ally" },
        ],
        hand: [{ card: "EX3-043", as: "entmon" }],
        deck: ["BT1-003"],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("entmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-043"));
    await settle(() => !s.perm("base").isSuspended);

    expect(
      s.events.some(
        (event) =>
          event.kind === "effectResolved" &&
          "sourceCardId" in event &&
          event.sourceCardId === "EX3-043" &&
          "timing" in event &&
          event.timing === "WhenDigivolving",
      ),
    ).toBe(true);
  });
});
