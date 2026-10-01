import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT16/BT16-025.js";
import "../ST1/ST1-16.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-082.js";
import "./index.js";

describe("BT17-082 Minami Uehara", () => {
  it("matches the immutable catalog identity and printed clauses", () => {
    expect(getCardDefinition("BT17-082")).toMatchObject({
      nameEn: "Minami Uehara",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      effectText: expect.stringContaining("played from digivolution cards"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("plays Labramon or Seasarmon from hand or a digivolution stack", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
          target: { filter: { nameOrTrait: [{ tokens: ["Labramon", "Seasarmon"], match: "nameExact" }] } },
        },
      ],
    });
  });

  it("triggers only when one of your Digimon is played from digivolution cards", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], fromDigivolution: true },
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          duration: "forTheTurn",
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, isSelf: true },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
  });

  it("limits the temporary keyword to one blue Digimon", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      actions: [{ target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] }, count: 1 } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("naturally plays Labramon from hand without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-082", as: "minami" },
            { card: "BT17-021", as: "labramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("minami").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("labramon").instanceId,
      ),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("minami").isSuspended).toBe(false);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("labramon").instanceId,
      ),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally plays Labramon from a stack, suspends only this Minami, and grants blue Digimon Rush", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-024", under: [{ card: "BT17-021", as: "labramon" }], as: "host" }],
          hand: [{ card: "BT17-082", as: "minami" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    preferred.push(s.perm("host").topCard!.instanceId);
    const labramonId = s.inst("labramon").instanceId;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("minami").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === labramonId));
    const labramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === labramonId)!;

    expect(labramon.topCard.instanceId).toBe(labramonId);
    expect(s.perm("minami").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(true);
    assertNoLoudGap(s);
  });

  it("grants Rush to a blue Digimon and never to a non-blue peer in the same fixture", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-024", under: [{ card: "BT17-021", as: "labramon" }], as: "blueHost" },
            { card: "BT1-009", as: "redPeer" },
          ],
          hand: [{ card: "BT17-082", as: "minami" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    preferred.push(s.perm("redPeer").topCard.instanceId, s.perm("blueHost").topCard.instanceId);
    const labramonId = s.inst("labramon").instanceId;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("minami").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === labramonId));

    expect(observe(s.engine).hasKeyword(s.perm("blueHost"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("redPeer"), "Rush")).toBe(false);
    expect(s.perm("minami").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not trigger when a matching Digimon is played from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-082", as: "minami" },
            { card: "BT17-024", as: "host" },
          ],
          hand: [{ card: "BT17-021", as: "labramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("labramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("labramon").instanceId,
      ),
    );

    expect(s.perm("minami").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(false);
    assertNoLoudGap(s);
  });

  it("honors declining the optional On Play stack recovery", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-024", under: [{ card: "BT17-021", as: "labramon" }], as: "host" }],
          hand: [{ card: "BT17-082", as: "minami" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("minami").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("minami").instanceId),
    );

    expect(s.perm("minami").isSuspended).toBe(false);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("labramon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "attacker" }] },
        1: { security: [{ card: "BT17-082", as: "securityMinami" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityMinami").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});

const BLUE_LEVEL_4 = "BT2-024";
const GREEN_LEVEL_4 = "BT10-047";

describe("BT17-082 Minami Uehara — KB Q&A rulings", () => {
  it("triggers when Partition plays your Digimon from digivolution cards (Q2860)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-082", as: "minami" },
            { card: "BT16-025", as: "paildramon", under: [BLUE_LEVEL_4, GREEN_LEVEL_4] },
          ],
        },
        1: { security: [{ card: "ST1-16", as: "gaiaForce" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "cardPlayed" && event.cardId === GREEN_LEVEL_4));
    await drainMicrotasks();

    const partitionedDigimon = (cardId: string) =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === cardId)!;
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual(
      ["BT17-082", BLUE_LEVEL_4, GREEN_LEVEL_4].sort(),
    );
    expect(s.perm("minami").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(partitionedDigimon(BLUE_LEVEL_4), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(partitionedDigimon(GREEN_LEVEL_4), "Rush")).toBe(false);
    assertNoLoudGap(s);
  });
});
