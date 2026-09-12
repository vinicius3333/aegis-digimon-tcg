import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-091.js";
import { cite } from "../../engine/conformance/_kb.js";
import "../index.js";

describe("BT15-091", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0034",
      "Bracket-only names are exact; explicit in-its-name references allow substrings",
      "c0ee1524e24827189e2dcfae2543a217540028723a55d660c84d63e4f29505f2",
    );
  });
  it("Q2589: retains both paid placements when the optional evolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-020", as: "host" }],
          trash: ["BT15-024", "BT15-026"],
          hand: [
            { card: "BT15-091", as: "option" },
            { card: "BT15-101", as: "destination" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const destinationId = s.inst("destination").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const payment = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: payment.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== payment.decisionId,
    );
    const evolution = s.state.pendingDecision!;
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT15-024", "BT15-026"]));
    expect(s.perm("host").stack).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolution.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
    );
    expect(s.perm("host").topCard.cardId).toBe("BT15-020");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT15-024", "BT15-026"]));
    expect(s.perm("host").stack).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(destinationId);
  });
  it.each([
    ["missing exact Garurumon", "BT15-020", ["BT15-026"], "BT15-101"],
    ["Garurumon X Antibody payment", "BT15-020", ["BT9-024", "BT15-026"], "BT15-101"],
    ["WereGarurumon X Antibody payment", "BT15-020", ["BT15-024", "BT9-028"], "BT15-101"],
    ["Gabumon X Antibody host", "BT9-020", ["BT15-024", "BT15-026"], "BT15-101"],
  ])("rejects %s without partially paying the placement pair", async (_label, host, materials, destination) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: host, as: "host" }],
          trash: materials.map((card, index) => ({ card, as: `material${index}` })),
          hand: [
            { card: "BT15-091", as: "option" },
            { card: destination, as: "destination" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const materialIds = materials.map((_, index) => s.inst(`material${index}`).instanceId);
    const destinationId = s.inst("destination").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(materialIds));
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("host").topCard.cardId).toBe(host);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(destinationId);
  });

  it("chooses exact MetalGarurumon and retains MetalGarurumon X Antibody", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-020", as: "host" }],
          trash: ["BT15-024", "BT15-026"],
          hand: [
            { card: "BT15-091", as: "option" },
            { card: "BT9-031", as: "near" },
            { card: "BT15-101", as: "exact" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const nearId = s.inst("near").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("host").topCard.cardId !== "BT15-020");
    expect(s.perm("host").topCard.cardId).toBe("BT15-101");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(nearId);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT15-020", "BT15-024", "BT15-026"]),
    );
  });

  it("Security refuses Gabumon X Antibody and returns the Option to hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "attacker" }] },
        1: { security: [{ card: "BT15-091", as: "option" }], hand: [{ card: "BT9-020", as: "near" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const nearId = s.inst("near").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.hand.some(({ instanceId }) => instanceId === optionId),
    );
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(nearId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("waives color with Matt Ishida and may digivolve Gabumon into MetalGarurumon by placing Garurumon/WereGarurumon", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: {
        kind: "compound",
        costs: [
          { kind: "place", bindHostAs: "bt15091Gabumon", position: "bottom" },
          { kind: "place", host: { filter: { boundRef: "bt15091Gabumon" } }, position: "bottom" },
        ],
      },
      actions: [
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "bt15091Gabumon" },
          payCost: false,
          ignoreRequirements: true,
          optional: true,
        },
      ],
    });
  });
  it("may play a Gabumon from hand or trash and returns itself from security", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    }));

  it("naturally places both trash materials under one Gabumon before the optional free evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-020", as: "gabumon" }],
          trash: [
            { card: "BT15-024", as: "garurumon" },
            { card: "BT15-026", as: "weregarurumon" },
          ],
          hand: [
            { card: "BT15-091", as: "option" },
            { card: "BT15-101", as: "metalgarurumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gabumon").topCard?.instanceId === s.inst("metalgarurumon").instanceId);

    expect(s.perm("gabumon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("garurumon").instanceId, s.inst("weregarurumon").instanceId]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("garurumon").instanceId, s.inst("weregarurumon").instanceId]),
    );
  });

  it("does not consume either material when the mandatory placement pair is incomplete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-020", as: "gabumon" }],
          trash: [{ card: "BT15-024", as: "garurumon" }],
          hand: [
            { card: "BT15-091", as: "option" },
            { card: "BT15-101", as: "metalgarurumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionInstanceId));

    expect(s.perm("gabumon").topCard?.cardId).toBe("BT15-020");
    expect(s.perm("gabumon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("garurumon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("metalgarurumon").instanceId);
  });
});
