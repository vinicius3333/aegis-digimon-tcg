import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-025.js";

describe("BT18-025 Korikakumon", () => {
  it("restricts suspension only for an opposing Digimon without digivolution cards", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Jamming" }] },
      { trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }] },
      {
        trigger: "WhenDigivolving",
        actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] }] },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Jamming" }] },
    ]);
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-025", as: "korikakumon" }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "empty" },
            { card: "BT1-030", as: "stacked", under: ["BT18-021"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const emptyId = s.perm("empty").permanentId;
    const stackedId = s.perm("stacked").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("korikakumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(emptyId, "suspend"));
    expect(observe(s.engine).isRestricted(emptyId, "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(stackedId, "suspend")).toBe(false);
  });

  it.each([
    ["Tommy Himi", "BT18-089", 3, 2],
    ["Kumamon", "BT18-022", 1, 4],
  ])("digivolves from %s for the named cost and preserves the source", async (_name, baseCard, _cost, memoryLeft) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT18-025", as: "korikakumon" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("korikakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT18-025");

    expect(s.state.memory).toBe(memoryLeft);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCard);
  });

  it("naturally restricts an opposing empty-stack Digimon after evolving from Kumamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-022", as: "kumamon" }],
          hand: [{ card: "BT18-025", as: "korikakumon" }],
        },
        1: { battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kumamon").permanentId,
        instanceId: s.inst("korikakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(targetId, "suspend"));

    expect(observe(s.engine).isRestricted(targetId, "suspend")).toBe(true);
  });

  it("grants Ice-Snow and both main and inherited Jamming", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-025", as: "self" },
          { card: "BT1-030", as: "host", under: ["BT18-025"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("self"), "Ice-Snow")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
