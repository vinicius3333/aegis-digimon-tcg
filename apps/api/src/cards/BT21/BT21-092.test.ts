import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-092.js";
import "../index.js";

describe("BT21-092 Can't Turn My Back!", () => {
  it("encodes stack transfer, counted reduction, color waiver, and Security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        fromSelectedPermanentDigivolutionCards: true,
        position: "bottom",
        order: "any",
        trackCount: "placedXrosSources",
      },
      {
        kind: "PlayWithoutCost",
        payCost: true,
        from: ["hand"],
        reduceCostByScaling: { unit: "namedCount", countSource: "placedXrosSources" },
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.isSecurity).toBe(true);
  });

  it("moves only Digimon source cards under a Tamer and reduces the played card by that count", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-021",
              as: "xrosHost",
              under: [
                { card: "BT21-001", as: "eggSource" },
                { card: "BT21-011", as: "digimonSourceA" },
                { card: "BT21-016", as: "digimonSourceB" },
              ],
            },
            { card: "BT21-083", as: "destination", under: [{ card: "BT21-011", as: "existing" }] },
          ],
          hand: [
            { card: "BT21-092", as: "option" },
            { card: "BT10-008", as: "playedXros" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    setup.state.memory = 10;
    await setup.ready();

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    const playedId = setup.inst("playedXros").instanceId;
    await settle(() =>
      setup.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === playedId),
    );

    expect(setup.perm("xrosHost").stack.map((card) => card.instanceId)).toEqual([setup.inst("eggSource").instanceId]);
    expect(setup.perm("destination").stack.map((card) => card.instanceId)).toEqual([
      setup.inst("digimonSourceA").instanceId,
      setup.inst("digimonSourceB").instanceId,
      setup.inst("existing").instanceId,
    ]);
    // 10 - option cost 2 - (Shoutmon cost 4 - 2 placed Digimon cards) = 6.
    expect(setup.state.memory).toBe(6);
  });

  it("honors a public reverse source-order choice and places the selected cards at the bottom", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-021",
              as: "xrosHost",
              under: [
                { card: "BT21-001", as: "eggSource" },
                { card: "BT21-011", as: "digimonSourceA" },
                { card: "BT21-016", as: "digimonSourceB" },
              ],
            },
            { card: "BT21-083", as: "destination", under: [{ card: "BT21-011", as: "existing" }] },
          ],
          hand: [
            { card: "BT21-092", as: "option" },
            { card: "BT10-008", as: "playedXros" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderCards: false },
    );
    setup.state.memory = 10;
    await setup.ready();
    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => setup.state.pendingDecision?.kind === "orderCards");
    const order = setup.decisions.at(-1)!.req;
    expect(order.kind).toBe("orderCards");
    if (order.kind !== "orderCards") throw new Error("expected explicit source-order decision");
    const candidates = order.options?.candidateInstanceIds;
    if (!candidates) throw new Error("Expected source-order candidates");
    expect(candidates).toEqual([setup.inst("digimonSourceA").instanceId, setup.inst("digimonSourceB").instanceId]);
    expect(
      setup.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: candidates.slice().reverse() },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        setup.state.pendingDecision === undefined &&
        setup.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === setup.inst("playedXros").instanceId,
        ),
    );
    expect(setup.perm("destination").stack.map((card) => card.instanceId)).toEqual([
      setup.inst("digimonSourceB").instanceId,
      setup.inst("digimonSourceA").instanceId,
      setup.inst("existing").instanceId,
    ]);
    expect(setup.perm("xrosHost").stack.map((card) => card.instanceId)).toEqual([setup.inst("eggSource").instanceId]);
  });

  it("plays an eligible Xros Heart card at its unreduced cost when no source cards are available", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-008", as: "xrosHost" }],
          hand: [
            { card: "BT21-092", as: "option" },
            { card: "BT10-008", as: "playedXros" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    setup.state.memory = 6;
    await setup.ready();

    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      setup.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === setup.inst("playedXros").instanceId),
    );

    expect(setup.perm("xrosHost").stack).toHaveLength(0);
    expect(setup.state.memory).toBe(0);
    expect(setup.state.players[0]!.hand.some((card) => card.instanceId === setup.inst("playedXros").instanceId)).toBe(
      false,
    );
  });

  it("keeps the mandatory placed source but preserves an eligible hand card when the optional play is declined", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-016", as: "xrosHost", under: [{ card: "BT21-011", as: "source" }] },
            { card: "BT21-083", as: "destination" },
          ],
          hand: [
            { card: "BT21-092", as: "option" },
            { card: "BT10-008", as: "playedXros" },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    setup.state.memory = 6;
    await setup.ready();

    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      setup.perm("destination").stack.some((card) => card.instanceId === setup.inst("source").instanceId),
    );

    expect(setup.perm("xrosHost").stack).toHaveLength(0);
    expect(setup.perm("destination").stack.map((card) => card.instanceId)).toEqual([setup.inst("source").instanceId]);
    expect(setup.state.players[0]!.hand.some((card) => card.instanceId === setup.inst("playedXros").instanceId)).toBe(
      true,
    );
    expect(setup.state.memory).toBe(4);
  });

  it("waives color with a Xros Heart Digimon and rejects the option without one", async () => {
    const allowed = setupEngine({
      0: {
        battleArea: [{ card: "BT10-008", as: "xros" }],
        hand: [{ card: "BT21-092", as: "option" }],
      },
    });
    allowed.state.memory = 2;
    await allowed.ready();
    expect(allowed.engine.applyIntent(0, { type: "playCard", instanceId: allowed.inst("option").instanceId })).toEqual({
      ok: true,
    });

    const rejected = setupEngine({ 0: { hand: [{ card: "BT21-092", as: "option" }] } });
    rejected.state.memory = 2;
    await rejected.ready();
    expect(
      rejected.engine.applyIntent(0, { type: "playCard", instanceId: rejected.inst("option").instanceId }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("does not borrow an opponent's Xros Heart trait for the color waiver", async () => {
    const setup = setupEngine({
      0: { hand: [{ card: "BT21-092", as: "option" }] },
      1: { battleArea: [{ card: "BT10-008", as: "opponentXros" }] },
    });
    setup.state.memory = 2;
    await setup.ready();

    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(setup.state.players[0]!.hand.some((card) => card.instanceId === setup.inst("option").instanceId)).toBe(true);
  });

  it("Security plays a cost-5 Xros Heart Tamer from trash without paying cost", async () => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-032", as: "attacker" }] },
        1: { security: [{ card: "BT21-092", as: "option" }], trash: [{ card: "BT10-087", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 0;
    await setup.ready();

    expect(
      setup.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: setup.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        setup.events.some((event) => event.kind === "securityChecked") &&
        setup.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === setup.inst("tamer").instanceId) &&
        !observe(setup.engine).isAttacking(),
    );
    expect(setup.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(setup.inst("tamer").instanceId);
    expect(setup.state.memory).toBe(0);
  });

  it("publicly plays an eligible Xros Heart card from hand during Security", async () => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-032", as: "attacker" }] },
        1: {
          security: [{ card: "BT21-092", as: "option" }, "BT1-001"],
          hand: [{ card: "BT10-087", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await setup.ready();
    expect(
      setup.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: setup.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        setup.events.some((event) => event.kind === "securityChecked") &&
        setup.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === setup.inst("tamer").instanceId) &&
        !observe(setup.engine).isAttacking(),
    );
    expect(setup.state.players[1]!.security).toHaveLength(1);
    expect(
      setup.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === setup.inst("tamer").instanceId),
    ).toBe(true);
    expect(observe(setup.engine).isAttacking()).toBe(false);
    expect(setup.state.players[1]!.trash.some((card) => card.instanceId === setup.inst("option").instanceId)).toBe(
      true,
    );
  });

  it("publicly declines an eligible Xros Heart card during Security and preserves its source", async () => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-032", as: "attacker" }] },
        1: {
          security: [{ card: "BT21-092", as: "option" }, "BT1-001"],
          trash: [{ card: "BT10-087", as: "tamer" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await setup.ready();
    expect(
      setup.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: setup.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        setup.events.some((event) => event.kind === "securityChecked") &&
        setup.state.players[1]!.trash.some((card) => card.instanceId === setup.inst("option").instanceId) &&
        !observe(setup.engine).isAttacking(),
    );
    expect(setup.state.players[1]!.trash.some((card) => card.instanceId === setup.inst("tamer").instanceId)).toBe(true);
    expect(setup.state.players[1]!.battleArea).toHaveLength(0);
    expect(setup.state.players[1]!.security).toHaveLength(1);
    expect(setup.state.players[1]!.trash.some((card) => card.instanceId === setup.inst("option").instanceId)).toBe(
      true,
    );
    expect(observe(setup.engine).isAttacking()).toBe(false);
  });

  it("does not play a Xros Heart card above the Security play-cost ceiling", async () => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-032", as: "attacker" }] },
        1: { security: [{ card: "BT21-092", as: "option" }], trash: [{ card: "BT10-009", as: "overCost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 0;
    await setup.ready();

    expect(
      setup.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: setup.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(setup.engine).isAttacking());
    expect(
      setup.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === setup.inst("overCost").instanceId),
    ).toBe(false);
    expect(setup.state.memory).toBe(0);
  });
});
