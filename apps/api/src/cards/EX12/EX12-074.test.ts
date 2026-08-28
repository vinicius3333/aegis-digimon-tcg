import { compiledEffects, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-074.js";
import "../index.js";

const CARD_ID = "EX12-074";

describe("EX12-074 Genshi Continent & Ashino Island", () => {
  it("keeps the security attack trigger restricted to your turn and once per turn", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isSecurity: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenAttacking",
            actions: [
              expect.objectContaining({
                kind: "Digivolve",
                target: { filter: { sourceRef: "triggerSubject" }, count: 1 },
                from: ["hand"],
                payCost: true,
                reduceCost: 1,
                optional: true,
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("models the main security swap, reduced Shambala play, and security play limit", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main");
    expect(main?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1 },
      { kind: "SecurityManipulation", op: "placeAsSecurity", faceUp: true, toTop: false },
      { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3, optional: true },
    ]);

    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      target: { filter: { playCostLte: 5 } },
    });
  });

  it("keeps the Use Req and full-coverage evidence attached to the registered card", () => {
    const registered = registeredCompiledCards.get(CARD_ID)!;

    expect(registered).toMatchObject({ coverage: "full", residual: [] });
    expect(registered.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }],
    });
    expect(registered).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("does not use the Option without a Shambala card satisfying its Use Req", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "option" }] } });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("returns the bottom security card and plays a Shambala card with three memory reduced", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "shambala" }],
          hand: [
            { card: CARD_ID, as: "option" },
            { card: "EX12-006", as: "target" },
          ],
          security: [
            { card: "BT1-101", as: "top" },
            { card: "BT1-102", as: "bottom" },
          ],
        },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("target").instanceId,
        ),
      160,
    );

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-102")).toBe(true);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: CARD_ID, faceUp: true });
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("still places itself when the security stack is empty", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "shambala" }],
          hand: [{ card: CARD_ID, as: "option" }],
        },
        1: { security: ["BT1-101"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === CARD_ID, 160);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: CARD_ID, faceUp: true });
  });

  it("digivolves the attacking Shambala Digimon for one memory from face-up security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "attacker" }],
          hand: [{ card: "EX12-025", as: "target" }],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.instanceId === s.inst("target").instanceId, 160);

    expect(s.perm("attacker").topCard?.cardId).toBe("EX12-025");
    expect(s.state.memory).toBe(2);
  });

  it("uses the face-up security digivolution only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-006", as: "firstAttacker" },
            { card: "EX12-006", as: "secondAttacker" },
          ],
          hand: [
            { card: "EX12-025", as: "firstTarget" },
            { card: "EX12-025", as: "secondTarget" },
          ],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
        1: { security: ["BT1-101", "BT1-101", "BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstAttacker").topCard?.cardId === "EX12-025");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("secondAttacker").topCard?.cardId).toBe("EX12-006");
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "EX12-025")).toHaveLength(1);
  });

  it("plays a qualifying Shambala card from trash and rejects a card over the security limit", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [
            { card: "EX12-025", as: "valid" },
            { card: "EX12-063", as: "tooExpensive" },
          ],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("valid").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("valid").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tooExpensive").instanceId)).toBe(true);
  });

  it("activates its Security play when checked while already face-up", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-006", as: "attacker" }] },
        1: {
          trash: [{ card: "EX12-025", as: "target" }],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-025"));

    expect(
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(true);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("security").instanceId);
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Genshi Continent & Ashino Island",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      types: ["Shambala", "SW", "TB"],
    });
  });
});
