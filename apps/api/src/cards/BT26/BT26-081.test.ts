import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-081.js";
import { assemblyRequirementFor, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-081 compiled behavior", () => {
  it("proves both evolution paths, Assembly, the cost-8 Iliad play budget, and scaled DP reduction", () => {
    expect(getCardDefinition("BT26-081")).toMatchObject({
      nameEn: "Mervamon",
      colors: ["Purple", "Yellow", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      types: ["Shaman", "Olympos XII", "Iliad", "TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Minervamon"], cost: 2, isAlternate: true },
      { level: 5, traits: ["TS"], cost: 4, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([
      { reduceCost: 5, materials: [{ namesExact: ["Minervamon"], count: 1 }] },
    ]);
    expect(digivolutionRequirementsFor("BT26-081")).toEqual(compiled.digivolutionRequirement);
    expect(assemblyRequirementFor("BT26-081")).toEqual(compiled.assemblyRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayMultiple",
            from: ["hand", "trash"],
            payCost: false,
            totalCost: 8,
            filter: { kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
          },
          {
            kind: "ModifyDP",
            amount: -4000,
            duration: "untilOpponentTurnEnd",
            scaling: {
              per: 1,
              unit: "cards",
              filter: { zone: "battleArea", nameOrTrait: [{ tokens: ["Iliad", "TS"], match: "trait" }] },
            },
          },
        ],
      });
    }
  });

  it("digivolves from Minervamon for 2 and from an off-color level-5 TS Digimon for 4", async () => {
    const fromMinervamon = setupEngine({
      0: {
        battleArea: [{ card: "BT24-041", as: "minervamon" }],
        hand: [{ card: "BT26-081", as: "mervamon" }],
        deck: ["BT1-009"],
      },
    });
    fromMinervamon.state.memory = 2;
    await fromMinervamon.ready();
    expect(
      fromMinervamon.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fromMinervamon.perm("minervamon").permanentId,
        instanceId: fromMinervamon.inst("mervamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => fromMinervamon.perm("minervamon").topCard.cardId === "BT26-081");
    expect(fromMinervamon.state.memory).toBe(0);

    const fromTs = setupEngine({
      0: {
        battleArea: [{ card: "BT26-015", as: "redTs" }],
        hand: [{ card: "BT26-081", as: "mervamon" }],
        deck: ["BT1-009"],
      },
    });
    fromTs.state.memory = 4;
    await fromTs.ready();
    expect(
      fromTs.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fromTs.perm("redTs").permanentId,
        instanceId: fromTs.inst("mervamon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => fromTs.perm("redTs").topCard.cardId === "BT26-081");
    expect(fromTs.state.memory).toBe(0);
  });

  it("declares Assembly with Minervamon and plays for 8", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-081", as: "mervamon" }],
        trash: [{ card: "BT24-041", as: "minervamon" }],
      },
    });
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("mervamon").instanceId,
        assembly: { materialInstanceIds: [s.inst("minervamon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-081"));

    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-081")?.stack.map(
        ({ cardId }) => cardId,
      ),
    ).toContain("BT24-041");
  });

  it("grants all four printed continuous effects only to Iliad Digimon", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Alliance" } },
      { kind: "GainKeyword", keyword: { keyword: "Reboot" } },
      { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
      { kind: "ModifyDP", amount: 2000 },
    ]);
  });

  it("plays eligible Iliad cards from hand and trash within 8 cost, then scales the DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-081", as: "mervamon" },
            { card: "BT24-019", as: "handKamemon" },
            { card: "BT24-020", as: "handGomamon" },
            { card: "BT1-009", as: "wrongTrait" },
            { card: "BT24-090", as: "pureOption" },
          ],
          trash: [{ card: "BT26-029", as: "trashAegiochusmon" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT24-019", "BT24-020"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT24-019")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT24-090")).toBe(true);
    expect(s.state.players[1]!.battleArea.find((p) => p.topCard?.cardId === "BT1-084")?.currentDP).toBe(3000);
  });

  it("plays an exact-cost-8 Iliad Digimon from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-081", as: "mervamon" }],
          trash: [{ card: "BT26-029", as: "trashIliad" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-029");
    expect(s.state.players[1]!.battleArea.find((p) => p.topCard?.cardId === "BT1-084")?.currentDP).toBe(2000);
  });

  it("lets an Aegiochusmon: Dark played from trash by this effect use Assembly", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-081", as: "mervamon" }],
          trash: [
            { card: "BT26-073", as: "dark" },
            { card: "BT26-069", as: "assemblyMaterial" },
          ],
        },
      },
      {
        autoSelectCards: false,
      },
    );
    await s.ready();

    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("dark").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" &&
        JSON.parse(s.state.pendingDecision.payloadJson).assemblyCardId === "BT26-073",
    );
    expect(JSON.parse(s.state.pendingDecision!.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.inst("assemblyMaterial").instanceId],
      min: 0,
      max: 1,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("assemblyMaterial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-073"));

    const dark = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-073");
    expect(dark?.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("assemblyMaterial").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("assemblyMaterial").instanceId,
    );
    expect(s.state.memory).toBe(7);
  });

  it("still plays Aegiochusmon: Dark when its effect-played Assembly is declined", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-081", as: "mervamon" }],
        trash: [
          { card: "BT26-073", as: "dark" },
          { card: "BT26-069", as: "assemblyMaterial" },
        ],
      },
    });
    await s.ready();

    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("dark").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" &&
        JSON.parse(s.state.pendingDecision.payloadJson).assemblyCardId === "BT26-073",
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-073"));

    const dark = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-073");
    expect(dark?.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("assemblyMaterial").instanceId,
    );
    expect(s.state.memory).toBe(7);
  });

  it("offers cost-8 Iliad cards but excludes Iliad cards over the total play-cost budget", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-081", as: "mervamon" },
            { card: "BT26-029", as: "cost8Iliad" },
            { card: "BT25-058", as: "cost13Iliad" },
          ],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();

    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    const selection = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(selection).toMatchObject({
      options: { candidateInstanceIds: [s.inst("cost8Iliad").instanceId] },
    });
  });

  it("never offers the Jupitermon DUAL card from hand or trash even though its printed cost fits", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-081", as: "mervamon" },
            { card: "BT26-033", as: "handDual" },
            { card: "BT24-019", as: "eligible" },
          ],
          trash: [{ card: "BT26-033", as: "trashDual" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();

    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    const selection = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(selection).toMatchObject({ options: { candidateInstanceIds: [s.inst("eligible").instanceId] } });
  });

  it("Q7115 still reduces DP when no card is played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-081", as: "mervamon" }] },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("may decline the Iliad play and still resolves the following DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-081", as: "mervamon" },
            { card: "BT24-019", as: "eligible" },
          ],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 10000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT24-019");
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("does not count a matching Digimon in the breeding area for the DP scaling", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-081", as: "mervamon" }],
          breeding: { card: "BT24-002", as: "breedingIliad" },
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("continuously grants Alliance, Reboot, Blocker, and 2000 DP only to Iliad Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-081", as: "mervamon" },
          { card: "BT26-080", as: "iliad" },
          { card: "BT26-079", as: "nonIliad" },
        ],
      },
    });
    await s.ready();

    for (const keyword of ["Alliance", "Reboot", "Blocker"]) {
      expect(observe(s.engine).hasKeyword(s.perm("mervamon"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("iliad"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("nonIliad"), keyword)).toBe(false);
    }
    expect(s.perm("mervamon").currentDP).toBe(15000);
    expect(s.perm("iliad").currentDP).toBe(15000);
    expect(s.perm("nonIliad").currentDP).toBe(12000);
  });
});
