import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT13-054.js";
import "./BT13-057.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT13-100.js";

describe("BT13-054 Lilamon", () => {
  it("plays Yoshino optionally and grants inherited Security Attack +1 conditionally", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Yoshino Fujieda"] }] },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
          while: { kind: "opponentHas", filter: { controllerDefault: "opponent", suspended: true, kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("when digivolving may play Yoshino from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-051", as: "base" }],
          hand: [
            { card: "BT13-054", as: "lila" },
            { card: "BT13-100", as: "yoshino" },
          ],
          deck: [{ card: "BT1-009", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lila").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yoshino").instanceId),
    );
    // Yoshino can suspend for +1 after entering during this evolution.
    expect(s.state.memory).toBe(2);
    expect(s.perm("yoshino").isSuspended).toBe(true);
    expect(s.perm("base").stack.some((card) => card.cardId === "BT13-051")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
  });

  it("may decline Yoshino and never offers a different Tamer", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-051", as: "base" }],
          hand: [
            { card: "BT13-054", as: "lila" },
            { card: "BT13-100", as: "yoshino" },
          ],
          deck: [{ card: "BT1-009", as: "bonusDraw" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.memory = 4;
    await declined.ready();
    const evolutionMaterialId1 = declined.perm("base").topCard!.instanceId;
    expect(
      declined.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: declined.perm("base").permanentId,
        instanceId: declined.inst("lila").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.perm("base").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(declined.perm("base").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => declined.perm("base").topCard.cardId === "BT13-054");
    expect(
      declined.state.players[0]!.hand.some((card) => card.instanceId === declined.inst("yoshino").instanceId),
    ).toBe(true);
    expect(
      declined.state.players[0]!.hand.some((card) => card.instanceId === declined.inst("bonusDraw").instanceId),
    ).toBe(true);
    expect(declined.state.memory).toBe(1);

    const wrong = setupEngine(
      { 0: { battleArea: [{ card: "BT13-054", as: "lila" }], hand: ["ST24-14"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await wrong.ready();
    await advance(wrong.engine).fireForPermanent(EffectTiming.WhenDigivolving, wrong.perm("lila"));
    expect(wrong.state.players[0]!.hand).toHaveLength(1);
    expect(wrong.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("dynamically grants inherited Security Attack +1 only on its turn with a suspended opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-057", as: "host", under: ["BT13-054"] }] },
      1: { battleArea: [{ card: "BT13-047", as: "opponent" }] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    s.perm("opponent").isSuspended = true;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("digivolves from a green level 4 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-051", as: "base" }], hand: [{ card: "BT13-054", as: "lila" }] },
    });
    s.state.memory = 4;
    const evolutionMaterialId2 = s.perm("base").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lila").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === evolutionMaterialId2));
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId2);
    await settle(() => s.perm("base").topCard.cardId === "BT13-054");
    expect(s.state.memory).toBe(1);
  });
});
