import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-090.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-090", () => {
  it("waives the color requirement with Tai and digivolves Agumon into WarGreymon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "compound",
            costs: [
              { kind: "place", bindHostAs: "bt14090Agumon" },
              { kind: "place", host: { filter: { boundRef: "bt14090Agumon" } } },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: { fromSelectionRef: "bt14090Agumon" },
              payCost: false,
              ignoreRequirements: true,
              optional: true,
            },
          ],
        },
      ],
    });
  });

  it("plays an Agumon from hand or trash and adds itself in security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
    });
  });

  it("naturally uses a non-red Tai waiver, places the trash stack, and evolves Agumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-095", as: "tai" },
            { card: "BT14-007", as: "agumon" },
          ],
          hand: [
            { card: "BT14-090", as: "option" },
            { card: "BT14-101", as: "wargreymon" },
          ],
          trash: ["BT14-012", "BT14-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("agumon").topCard?.cardId === "BT14-101");
    expect(s.perm("agumon").topCard?.cardId).toBe("BT14-101");
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toHaveLength(3);
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT14-007", "BT14-012", "BT14-014"]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-012")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-014")).toBe(false);
  });

  it("Q2466: may decline the evolution only after placing both required trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-007", as: "agumon" }],
          hand: [
            { card: "BT14-090", as: "option" },
            { card: "BT14-101", as: "wargreymon" },
          ],
          trash: [
            { card: "BT14-012", as: "greymon" },
            { card: "BT14-014", as: "metalgreymon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 1);
    const activationDecision = s.decisions.filter(({ req }) => req.kind === "optional")[0]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activationDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const evolutionDecision = s.decisions.filter(({ req }) => req.kind === "optional")[1]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolutionDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT14-090"));

    expect(s.perm("agumon").topCard.cardId).toBe("BT14-007");
    expect(s.perm("agumon").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT14-012", "BT14-014"]),
    );
    expect(s.perm("agumon").stack).toHaveLength(2);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT14-101")).toBe(true);
  });

  it("keeps both placements and the optional evolution on the same Agumon host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-095", as: "tai" },
            { card: "BT14-007", as: "agumonA" },
            { card: "BT14-007", as: "agumonB" },
          ],
          hand: [
            { card: "BT14-090", as: "option" },
            { card: "BT14-101", as: "wargreymon" },
          ],
          trash: [
            { card: "BT14-012", as: "greymon" },
            { card: "BT14-014", as: "metalgreymon" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const activationDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activationDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    const greymonId = s.inst("greymon").instanceId;
    const metalGreymonId = s.inst("metalgreymon").instanceId;
    const agumonAId = s.perm("agumonA").permanentId;
    const agumonBId = s.perm("agumonB").permanentId;

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstPaymentDecision = s.state.pendingDecision!;
    const firstPaymentEntry = s.decisions.find(({ req }) => req.decisionId === firstPaymentDecision.decisionId);
    const firstPaymentRequest = firstPaymentEntry?.req;
    expect(firstPaymentRequest?.kind).toBe("selectCards");
    expect(firstPaymentRequest?.options?.candidateInstanceIds).toEqual([greymonId, metalGreymonId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstPaymentDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [greymonId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstHostDecision = s.state.pendingDecision!;
    const firstHostRequest = s.decisions.find(({ req }) => req.decisionId === firstHostDecision.decisionId)?.req;
    expect(firstHostRequest?.options?.candidateInstanceIds).toEqual(expect.arrayContaining([agumonAId, agumonBId]));
    expect(firstHostRequest?.options?.candidateInstanceIds).not.toEqual(
      expect.arrayContaining([greymonId, metalGreymonId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstHostDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [agumonAId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.perm("agumonA").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT14-012", "BT14-014"]),
    );
    expect(s.perm("agumonB").stack).toHaveLength(0);
    const evolutionDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolutionDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumonA").topCard?.cardId === "BT14-101");

    expect(s.perm("agumonA").topCard?.cardId).toBe("BT14-101");
    expect(s.perm("agumonA").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT14-007", "BT14-012", "BT14-014"]),
    );
    expect(s.perm("agumonA").stack).toHaveLength(3);
    expect(s.perm("agumonB").stack).toHaveLength(0);
    expect(s.perm("agumonB").topCard?.cardId).toBe("BT14-007");
  });

  it("naturally plays Agumon from hand and returns itself after a Security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "attacker" }] },
        1: {
          security: [{ card: "BT14-090", as: "securityOption" }],
          hand: [{ card: "BT14-007", as: "agumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-007"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-007")).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT14-090")).toBe(true);
  });
});
