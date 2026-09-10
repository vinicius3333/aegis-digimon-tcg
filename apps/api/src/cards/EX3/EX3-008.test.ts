import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-008.js";

describe("EX3-008 Flamedramon", () => {
  it("matches its official errata identity and dual evolution paths", () => {
    expect(getCardDefinition("EX3-008")).toMatchObject({
      nameEn: "Flamedramon",
      colors: ["Red"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 2 },
        { color: "Purple", level: 3, memoryCost: 2 },
      ],
      forms: ["ArmorForm"],
      attributes: ["Free"],
      types: ["Dragonkin"],
      imageId: "EX3-008-Errata",
      effectText:
        "[When Digivolving] Activate 1 of the effects below.・You may digivolve 1 of your other Digimon into a level 4 purple Digimon card with the [Free] trait from your trash for the cost.・You may DNA digivolve this Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.",
      inheritedEffectText:
        "[End of Your Turn] This Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.",
    });
  });

  it("publishes the errata branches and inherited clause as complete compiled IR", () => {
    expect(getCompiledCard("EX3-008")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "Modal",
              choose: 1,
              labels: [
                "Digivolve 1 of your other Digimon into a purple level 4 [Free] Digimon from your trash",
                "DNA digivolve this Digimon and 1 of your other Digimon into a Digimon in your hand",
              ],
              options: [
                [
                  {
                    kind: "Digivolve",
                    target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
                    into: {
                      filter: {
                        controller: "mine",
                        kind: ["Digimon"],
                        colors: ["Purple"],
                        levels: [4],
                        nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
                      },
                      count: 1,
                    },
                    from: ["trash"],
                    payCost: true,
                    optional: true,
                  },
                ],
                [
                  {
                    kind: "DnaDigivolve",
                    materials: [
                      { filter: { isSelfRef: true }, count: 1, zone: "battleArea" },
                      {
                        filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
                        count: 1,
                        zone: "battleArea",
                      },
                    ],
                    into: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
                    payCost: true,
                    optional: true,
                  },
                ],
              ],
            },
          ],
        },
        {
          trigger: "EndOfYourTurn",
          isInherited: true,
          actions: [
            {
              kind: "DnaDigivolve",
              materials: [
                { filter: { isSelfRef: true }, count: 1, zone: "battleArea" },
                { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1, zone: "battleArea" },
              ],
              into: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    });
  });

  it.each([
    ["red", "BT1-009"],
    ["purple", "BT10-071"],
  ])("digivolves from a %s level 3 for the printed cost", async (_color, baseCardId) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCardId, as: "base" }],
        hand: [{ card: "EX3-008", as: "flamedramon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-008");

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCardId);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("offers only executable modal branches with printed labels and allows declining the chosen may-effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "base" },
          { card: "EX3-055", as: "trashBranchBase" },
          { card: "EX3-058", as: "dnaPartner" },
        ],
        hand: [
          { card: "EX3-008", as: "flamedramon" },
          { card: "EX3-010", as: "paildramon" },
        ],
        trash: [{ card: "EX3-058", as: "trashEvolution" }],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const modal = s.state.pendingDecision!;
    const modalRequest = s.decisions.at(-1)!.req;
    expect(modalRequest).toMatchObject({
      kind: "chooseOption",
      sourceCardId: "EX3-008",
      options: {
        choices: [
          "Digivolve 1 of your other Digimon into a purple level 4 [Free] Digimon from your trash",
          "DNA digivolve this Digimon and 1 of your other Digimon into a Digimon in your hand",
        ],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: modal.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-008");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("trashBranchBase").topCard.cardId).toBe("EX3-055");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX3-058");
  });

  it("skips the modal choice when exactly one branch is legal, and opens nothing when neither is legal", async () => {
    const one = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "base" },
          { card: "EX3-055", as: "partner" },
        ],
        hand: [{ card: "EX3-008", as: "flamedramon" }],
        trash: [{ card: "EX3-058", as: "trashEvolution" }],
      },
    });
    one.state.memory = 6;
    await one.ready();
    expect(
      one.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: one.perm("base").permanentId,
        instanceId: one.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => one.state.pendingDecision !== undefined);
    expect(one.state.pendingDecision!.kind).toBe("optional");
    expect(one.decisions.some(({ req }) => req.kind === "chooseOption")).toBe(false);

    const zero = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX3-008", as: "flamedramon" }],
      },
    });
    zero.state.memory = 2;
    await zero.ready();
    expect(
      zero.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: zero.perm("base").permanentId,
        instanceId: zero.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => zero.perm("base").topCard.cardId === "EX3-008");
    expect(zero.state.pendingDecision).toBeUndefined();
    expect(zero.decisions).toHaveLength(0);
  });

  it("Q3375: allows a non-purple other Digimon to digivolve into the purple level 4 Free card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "BT1-010", as: "partner" },
          ],
          hand: [{ card: "EX3-008", as: "flamedramon" }],
          trash: [
            { card: "EX3-058", as: "shadramon" },
            { card: "BT10-075", as: "wrongTrait" },
            { card: "BT13-011", as: "wrongColor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("partner").topCard.cardId === "EX3-058");
    expect(s.perm("partner").stack.map(({ cardId }) => cardId)).toContain("BT1-010");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT10-075", "BT13-011"]),
    );
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-058")).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  it("uses itself and exactly one other Digimon to DNA digivolve into a compatible hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "EX3-058", as: "partner" },
          ],
          hand: [
            { card: "EX3-008", as: "flamedramon" },
            { card: "EX3-010", as: "paildramon" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferOptionIndex: 1,
      },
    );
    s.state.memory = 6;
    await s.ready();
    const baseId = s.perm("base").permanentId;
    const partnerId = s.perm("partner").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: baseId,
        instanceId: s.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-010"));
    const paildramon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-010")!;
    expect(paildramon.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-008", "BT1-009", "EX3-058"]),
    );
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(partnerId);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(baseId);
    expect(s.state.memory).toBe(4);
  });

  it("offers only partners that complete a printed DNA recipe and keeps incompatible Digimon visible", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "base" },
          { card: "EX3-058", as: "compatiblePartner" },
          { card: "EX3-058", as: "secondCompatiblePartner" },
          { card: "EX3-008", as: "incompatiblePartner" },
        ],
        hand: [
          { card: "EX3-008", as: "flamedramon" },
          { card: "EX3-010", as: "paildramon" },
          { card: "EX3-010", as: "secondPaildramon" },
          { card: "EX3-044", as: "normalEvolutionOnly" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();
    const compatiblePartnerId = s.perm("compatiblePartner").permanentId;
    const secondCompatiblePartnerId = s.perm("secondCompatiblePartner").permanentId;
    const incompatiblePartnerId = s.perm("incompatiblePartner").permanentId;

    const resolution = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("flamedramon").instanceId,
    });
    expect(resolution).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.decisions.some(({ req }) => req.kind === "chooseTargets"),
    );

    const partnerRequest = [...s.decisions].reverse().find(({ req }) => req.kind === "chooseTargets")!.req;
    expect(partnerRequest).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-008",
      options: {
        candidateInstanceIds: [compatiblePartnerId, secondCompatiblePartnerId],
        visibleInstanceIds: expect.arrayContaining([compatiblePartnerId, incompatiblePartnerId]),
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
      },
    });
    expect(partnerRequest.options?.candidateInstanceIds).not.toContain(incompatiblePartnerId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [compatiblePartnerId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" && s.decisions.some(({ req }) => req.kind === "selectCards"),
    );
    const resultRequest = [...s.decisions].reverse().find(({ req }) => req.kind === "selectCards")!.req;
    expect(resultRequest).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-008",
      options: {
        candidateInstanceIds: [s.inst("paildramon").instanceId, s.inst("secondPaildramon").instanceId],
        visibleInstanceIds: expect.arrayContaining([
          s.inst("paildramon").instanceId,
          s.inst("normalEvolutionOnly").instanceId,
        ]),
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
      },
    });
    expect(resultRequest.options?.candidateInstanceIds).not.toContain(s.inst("normalEvolutionOnly").instanceId);
  });

  it("does not offer either DNA effect when hand cards have no printed DNA requirement", async () => {
    const whenDigivolving = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "base" },
          { card: "EX3-058", as: "partner" },
        ],
        hand: [
          { card: "EX3-008", as: "flamedramon" },
          { card: "EX3-044", as: "normalEvolutionOnly" },
        ],
      },
    });
    whenDigivolving.state.memory = 6;
    await whenDigivolving.ready();
    expect(
      whenDigivolving.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: whenDigivolving.perm("base").permanentId,
        instanceId: whenDigivolving.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => whenDigivolving.perm("base").topCard.cardId === "EX3-008");
    expect(whenDigivolving.state.pendingDecision).toBeUndefined();
    expect(whenDigivolving.decisions).toHaveLength(0);

    const inherited = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-010", under: ["EX3-008"], as: "host" },
          { card: "EX3-061", as: "partner" },
        ],
        hand: [{ card: "EX3-044", as: "normalEvolutionOnly" }],
      },
    });
    await inherited.ready();
    const inheritedTurn = inherited.engine.runOneTurn();
    await advance(inherited.engine).waitForMainPhase(0);
    advance(inherited.engine).endMainPhaseIfOpen(0);
    await inheritedTurn;
    expect(inherited.state.pendingDecision).toBeUndefined();
    expect(inherited.decisions.filter(({ req }) => req.sourceCardId === "EX3-008")).toHaveLength(0);
  });

  it("filters partners and results for its inherited end-of-turn DNA decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-010", under: ["EX3-008"], as: "host" },
          { card: "EX3-061", as: "compatiblePartner" },
          { card: "EX3-061", as: "secondCompatiblePartner" },
          { card: "EX3-058", as: "incompatiblePartner" },
        ],
        hand: [
          { card: "EX3-063", as: "dragonMode" },
          { card: "EX3-063", as: "secondDragonMode" },
          { card: "EX3-044", as: "normalEvolutionOnly" },
        ],
      },
    });
    await s.ready();
    const compatiblePartnerId = s.perm("compatiblePartner").permanentId;
    const secondCompatiblePartnerId = s.perm("secondCompatiblePartner").permanentId;
    const incompatiblePartnerId = s.perm("incompatiblePartner").permanentId;

    const resolution = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const partnerRequest = [...s.decisions].reverse().find(({ req }) => req.kind === "chooseTargets")!.req;
    expect(partnerRequest).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-008",
      options: {
        candidateInstanceIds: [compatiblePartnerId, secondCompatiblePartnerId],
        visibleInstanceIds: expect.arrayContaining([
          compatiblePartnerId,
          secondCompatiblePartnerId,
          incompatiblePartnerId,
        ]),
        min: 1,
        max: 1,
        timing: "EndOfYourTurn",
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [compatiblePartnerId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const resultRequest = [...s.decisions].reverse().find(({ req }) => req.kind === "selectCards")!.req;
    expect(resultRequest).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-008",
      options: {
        candidateInstanceIds: [s.inst("dragonMode").instanceId, s.inst("secondDragonMode").instanceId],
        visibleInstanceIds: expect.arrayContaining([
          s.inst("dragonMode").instanceId,
          s.inst("secondDragonMode").instanceId,
          s.inst("normalEvolutionOnly").instanceId,
        ]),
        min: 1,
        max: 1,
        timing: "EndOfYourTurn",
      },
    });
    expect(resultRequest.options?.candidateInstanceIds).not.toContain(s.inst("normalEvolutionOnly").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("dragonMode").instanceId] },
      }),
    ).toEqual({ ok: true });
    await resolution;
  });

  it("Q3374: may use its inherited end-of-turn DNA after its digivolving DNA passes memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "EX3-058", as: "firstPartner" },
            { card: "EX3-061", as: "secondPartner" },
          ],
          hand: [
            { card: "EX3-008", as: "flamedramon" },
            { card: "EX3-010", as: "paildramon" },
            { card: "EX3-063", as: "dragonMode" },
          ],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferOptionIndex: 1,
      },
    );
    s.state.memory = 1;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });

    await turn;
    const dragonMode = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-063")!;
    expect(dragonMode).toBeDefined();
    expect(dragonMode.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-008", "EX3-010", "EX3-058", "EX3-061"]),
    );
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX3-063")).toBe(false);
  });
});
