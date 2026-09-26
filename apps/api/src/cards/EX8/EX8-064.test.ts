import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { dnaDigivolveCostFor } from "../../engine/effects/primitives.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-064.js";

describe("EX8-064", () => {
  it("matches the committed catalog identity and every printed clause", () => {
    expect(getCardDefinition("EX8-064")).toMatchObject({
      cardId: "EX8-064",
      nameEn: "Boltboutamon",
      colors: ["Purple", "Black", "Yellow"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [
        { color: "Purple", level: 6, memoryCost: 5 },
        { color: "Black", level: 6, memoryCost: 5 },
        { color: "Yellow", level: 6, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Wizard", "NSo"],
      effectText: expect.stringContaining("＜De-Digivolve 3＞ 1 of your opponent's Digimon and"),
    });
    expect(getCardDefinition("EX8-064")?.effectText).toContain(
      "[DNA Digivolve] Purple/black Lv.6 + yellow/green Lv.6: Cost 0",
    );
    expect(getCardDefinition("EX8-064")?.effectText).toContain("[DNA Digivolve] [Piedmon] + [Myotismon]: Cost 0");
    expect(getCardDefinition("EX8-064")?.effectText).toContain("you may play up to 10 play cost's total worth");
    expect(getCardDefinition("EX8-064")?.effectText).toContain("DNA digivolving");
    expect(getCardDefinition("EX8-064")?.effectText).toContain("top security card");
    expect(getCardDefinition("EX8-064")?.securityEffectText).toBeUndefined();
  });

  it("exposes both printed DNA routes for cost 0", () => {
    const colorRoute = (left: "Purple" | "Black", right: "Yellow" | "Green") => ({
      cost: 0,
      materials: [
        { color: left, level: 6 },
        { color: right, level: 6 },
      ],
    });
    expect(dnaDigivolutionRequirementsFor("EX8-064")).toEqual([
      colorRoute("Purple", "Yellow"),
      colorRoute("Purple", "Green"),
      colorRoute("Black", "Yellow"),
      colorRoute("Black", "Green"),
      { cost: 0, materials: [{ namesExact: ["Piedmon"] }, { namesExact: ["Myotismon"] }] },
    ]);
  });
  it("accepts purple/black Lv.6 + yellow/green Lv.6 and rejects Myotismon name extensions", () => {
    const evolving = getCardDefinition("EX8-064")!;
    const piedmon = getCardDefinition("EX8-062")!;
    const myotismon = getCardDefinition("EX8-060")!;
    const myotismonXAntibody = getCardDefinition("P-145")!;
    const venomMyotismon = getCardDefinition("BT15-080")!;
    const green = getCardDefinition("BT1-081")!;
    const yellow = getCardDefinition("BT1-063")!;

    expect(dnaDigivolveCostFor(evolving, [venomMyotismon, green])).toBe(0);
    expect(dnaDigivolveCostFor(evolving, [venomMyotismon, yellow])).toBe(0);
    expect(dnaDigivolveCostFor(evolving, [piedmon, myotismon])).toBe(0);
    expect(dnaDigivolveCostFor(evolving, [piedmon, myotismonXAntibody])).toBeUndefined();
    expect(dnaDigivolveCostFor(evolving, [green, yellow])).toBeUndefined();
  });

  it("publicly DNA digivolves a Purple + Green pair and rejects Myotismon (X Antibody)", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-080", as: "venomMyotismon" },
          { card: "BT1-081", as: "herculesKabuterimon" },
        ],
        hand: [{ card: "EX8-064", as: "boltboutamon" }],
      },
    });
    legal.state.memory = 10;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [legal.perm("venomMyotismon").permanentId, legal.perm("herculesKabuterimon").permanentId],
        instanceId: legal.inst("boltboutamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.battleArea.length === 1);
    expect(legal.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX8-064");
    expect(legal.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(["BT1-081", "BT15-080"]);
    expect(legal.state.memory).toBe(10);

    const illegal = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-062", as: "piedmon" },
          { card: "P-145", as: "myotismonX" },
        ],
        hand: [{ card: "EX8-064", as: "boltboutamon" }],
      },
    });
    illegal.state.memory = 10;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [illegal.perm("piedmon").permanentId, illegal.perm("myotismonX").permanentId],
        instanceId: illegal.inst("boltboutamon").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX8-062", "P-145"]);
    expect(illegal.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX8-064"]);
    expect(illegal.state.memory).toBe(10);
  });

  it("de-digivolves an opposing Digimon by 3 and gives all opposing Digimon -6000 DP when digivolving", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 3,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
    });
  });
  it("plays NSo cards from trash up to total play cost 10 during DNA digivolving and inherits security trash after another Digimon is deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[2]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["NSo"], match: "trait" }] },
        count: "all",
        totalPlayCostBudget: 10,
      },
      condition: { kind: "isDnaDigivolving", raw: "DNA digivolving" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controllerDefault: "any", excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              kind: "Trash",
              target: {
                filter: { zone: "security", controller: "opponent", position: "top" },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });
  it("applies the printed -6000 DP turn modifier to every opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-064", as: "source" }],
          deck: Array(40).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 10000 },
            { card: "BT1-011", as: "second", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("first").currentDP === 4000 && s.perm("second").currentDP === 2000);
    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(2000);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("first").currentDP).toBe(10000);
    expect(s.perm("second").currentDP).toBe(8000);
  });
  it("de-digivolves the selected opposing stack by exactly 3 before applying the global DP reduction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-064", as: "source" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
        1: {
          battleArea: [{ card: "EX8-064", as: "target", under: ["BT10-009", "EX8-060", "EX8-062"] }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea[0]?.topCard.cardId === "BT10-009");

    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT10-009");
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(s.state.players[1]!.battleArea[0]!.baseDP - 6000);
  });

  it("DNA digivolves only from Piedmon plus Myotismon for 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-062", as: "piedmon" },
          { card: "EX8-060", as: "myotismon" },
        ],
        hand: [{ card: "EX8-064", as: "bolt" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("piedmon").permanentId, s.perm("myotismon").permanentId],
        instanceId: s.inst("bolt").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-064"));
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-062", as: "piedmon" },
          { card: "EX8-061", as: "notMyotismon" },
        ],
        hand: [{ card: "EX8-064", as: "bolt" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [invalid.perm("piedmon").permanentId, invalid.perm("notMyotismon").permanentId],
        instanceId: invalid.inst("bolt").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("plays a legal subset up to total cost 10 after DNA and lets Piedmon observe delayed 0-DP deletion (Q3951)", async () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[2]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { count: "all", upTo: true, totalPlayCostBudget: 10 },
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-062", as: "piedmonMaterial" },
            { card: "EX8-060", as: "myotismonMaterial" },
          ],
          hand: [{ card: "EX8-064", as: "bolt" }],
          trash: [
            { card: "EX8-062", as: "trashPiedmon" },
            { card: "EX8-057", as: "trashDemiDevimon" },
            { card: "EX8-059", as: "trashDevimon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "zeroDp", dp: 6000 }],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("piedmonMaterial").permanentId, s.perm("myotismonMaterial").permanentId],
        instanceId: s.inst("bolt").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010") &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("trashDemiDevimon").instanceId,
        ),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("bolt").instanceId,
        s.inst("trashPiedmon").instanceId,
        s.inst("trashDemiDevimon").instanceId,
      ]),
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("trashDevimon").instanceId,
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("allows an explicit zero-card choice when affordable NSo cards are available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-062", as: "piedmonMaterial" },
            { card: "EX8-060", as: "myotismonMaterial" },
          ],
          hand: [{ card: "EX8-064", as: "bolt" }],
          trash: [
            { card: "EX8-062", as: "availableSeven" },
            { card: "EX8-057", as: "availableThree" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("piedmonMaterial").permanentId, s.perm("myotismonMaterial").permanentId],
        instanceId: s.inst("bolt").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.at(-1)!.req;
    expect(selection.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX8-064"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("availableSeven").instanceId, s.inst("availableThree").instanceId]),
    );
  });

  it("selects the legal physical subset when matching NSo candidates exceed the total cost budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-062", as: "piedmonMaterial" },
            { card: "EX8-060", as: "myotismonMaterial" },
          ],
          hand: [{ card: "EX8-064", as: "bolt" }],
          trash: [
            { card: "EX8-062", as: "legalSeven" },
            { card: "EX8-057", as: "legalThree" },
            { card: "EX8-059", as: "overCombined" },
            { card: "P-174", as: "overBudget" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("piedmonMaterial").permanentId, s.perm("myotismonMaterial").permanentId],
        instanceId: s.inst("bolt").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.at(-1)!.req;
    expect(selection.kind).toBe("selectCards");
    expect(selection.options?.min).toBe(0);
    expect(selection.options?.max).toBe(3);
    expect(selection.options?.maxTotalPlayCost).toBe(10);
    expect(selection.options?.candidateInstanceIds).not.toContain(s.inst("overBudget").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [
            s.inst("legalSeven").instanceId,
            s.inst("legalThree").instanceId,
            s.inst("overCombined").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("legalThree").instanceId,
      ),
    );
    const battleAreaIds = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
    expect(battleAreaIds).toEqual(
      expect.arrayContaining([
        s.inst("bolt").instanceId,
        s.inst("legalSeven").instanceId,
        s.inst("legalThree").instanceId,
      ]),
    );
    expect(battleAreaIds).not.toContain(s.inst("overBudget").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("overCombined").instanceId, s.inst("overBudget").instanceId]),
    );
  });

  it("trashes the opponent's top security card after another Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-064", as: "source" }], deck: Array(20).fill("BT1-009") },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT1-009", as: "secondVictim" },
            { card: "BT1-009", as: "thirdVictim" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const securityInstanceId = s.state.players[1]!.security[0]!.instanceId;
    const secondSecurityInstanceId = s.state.players[1]!.security[1]!.instanceId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 2);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityInstanceId)).toBe(true);
    expect(s.state.players[1]!.security[0]!.instanceId).toBe(secondSecurityInstanceId);

    await advance(s.engine).verb.deletePermanent([s.perm("secondVictim").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("secondVictim").instanceId));
    expect(s.state.players[1]!.security).toHaveLength(2);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.deletePermanent([s.perm("thirdVictim").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
