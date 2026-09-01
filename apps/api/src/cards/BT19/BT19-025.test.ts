import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-025 MetalGreymon", () => {
  it("naturally plays from hand and can attack with its temporary Rush", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-025", as: "metal" }] },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("naturally resolves its attack trigger through a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-025", as: "metal" },
            { card: "BT19-081", as: "tamer", under: ["BT19-026"] },
          ],
        },
        1: { battleArea: [{ card: "BT19-023", as: "opponent", suspended: true, under: ["BT19-021"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metal").topCard?.cardId === "BT19-026");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("metal").topCard?.cardId).toBe("BT19-026");
  });

  it("has Material Save 2 and gains Rush for only the turn it is played", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-025", as: "metal" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("metal"), "MaterialSave")).toBe(2);
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("metal"));
    expect(observe(s.engine).hasKeyword(s.perm("metal"), "Rush")).toBe(true);
  });

  it("DigiXroses with exact Blue Greymon and MailBirdramon materials for cost 3", async () => {
    expect(digiXrosRequirementFor("BT19-025")).toEqual([
      { materials: [{ names: ["Greymon"], colors: ["Blue"] }, { names: ["MailBirdramon"] }], count: 2 },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-025", as: "metal" },
          { card: "BT19-020", as: "greymon" },
          { card: "BT19-022", as: "mail" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metal").instanceId,
        digiXros: { materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mail").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025"));
    expect(s.perm("metal").stack).toHaveLength(2);
    expect(s.state.memory).toBe(-3);
  });

  it("when attacking de-digivolves an opponent, then freely evolves from under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-025", as: "metal" },
            { card: "BT19-081", as: "tamer", under: ["BT19-026"] },
          ],
        },
        1: { battleArea: [{ card: "BT19-023", as: "opponent", under: ["BT19-021"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("metal"));
    expect(s.perm("opponent").topCard?.cardId).toBe("BT19-021");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT19-023");
    expect(s.perm("metal").topCard?.cardId).toBe("BT19-026");
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("inherited End of Attack plays one level-4-or-lower Blue Flare from under a Tamer once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-026", as: "host", under: ["BT19-025"] },
            { card: "BT19-081", as: "tamer", under: ["BT19-020", "BT19-016"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-020"));
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    expect(
      s.state.players[0]!.battleArea.filter((p) => ["BT19-020", "BT19-016"].includes(p.topCard?.cardId ?? "")),
    ).toHaveLength(1);
    expect(s.perm("tamer").stack).toHaveLength(1);
  });

  it("performs DigiXros when Decode plays MetalGreymon before the pending Q3085 return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-027", as: "dianamon", under: ["BT19-025"] },
            { card: "BT19-020", as: "greymon" },
          ],
          hand: [{ card: "BT19-022", as: "mail" }],
        },
        1: { battleArea: [{ card: "BT19-023", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.returnToDeck([s.perm("dianamon").topCard!.instanceId], { toTop: false });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025"));
    const metal = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-025")!;
    expect(metal.stack.map((card) => card.cardId).sort()).toEqual(["BT19-020", "BT19-022"].sort());
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-027"]);
    await advance(s.engine).verb.returnToDeck([s.perm("target").topCard!.instanceId], { toTop: false });
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT19-023"]);
  });
});
