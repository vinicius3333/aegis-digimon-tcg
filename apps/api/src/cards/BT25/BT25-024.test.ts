import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_024 } from "./BT25-024.js";
import "../index.js";

describe("BT25-024 Lekismon", () => {
  it.each(["OnPlay", "WhenDigivolving"] as const)("draws one on %s", async (trigger) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-024", as: "lekismon" }], deck: [{ card: "BT1-009", as: "drawn" }] },
    });
    await s.ready();

    await advance(s.engine).fire(
      trigger === "OnPlay" ? EffectTiming.OnPlay : EffectTiming.WhenDigivolving,
      s.perm("lekismon"),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("offers Crescemon from hand only for red own Digimon events", () => {
    const effect = BT25_024.effects?.find((entry) => entry.trigger === "YourTurn");
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"] as const) {
      const watcher = effect?.actions?.find((action) => action.kind === "SubTrigger" && action.event === event);
      expect(watcher).toMatchObject({
        sourceFilter: { controller: "mine", kind: ["Digimon"] },
        fireCondition: { kind: "triggerSubjectHasColor", filter: { colors: ["Red"] } },
      });
      const subTrigger = watcher as { actions?: unknown[] } | undefined;
      expect(subTrigger?.actions?.[0]).toMatchObject({
        kind: "Digivolve",
        into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Crescemon"], match: "name" }] },
        from: ["hand"],
        reduceCost: 1,
        payCost: true,
        optional: true,
      });
    }
  });

  it("preserves inherited Jamming", () => {
    expect(BT25_024.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }),
      ]),
    );
  });

  it("grants inherited Jamming to a realistic evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT25-024"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it.each(["whenPlayed", "whenOneOfYoursDigivolves"] as const)(
    "digivolves into Crescemon for 2 memory after a red own-Digimon %s event",
    async (event) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT25-024", as: "lekismon" },
              { card: "BT1-010", as: "redSubject" },
            ],
            hand: [{ card: "BT25-026", as: "crescemon" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
      );
      s.state.memory = 2;
      await s.ready();

      await advance(s.engine).fireSubTrigger(event, { subjectPermanentId: s.perm("redSubject").permanentId });
      await settle(() => s.perm("lekismon").topCard.cardId === "BT25-026");

      expect(s.perm("lekismon").topCard.cardId).toBe("BT25-026");
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("crescemon").instanceId);
    },
  );

  it("does not activate the Crescemon option for a non-red own-Digimon event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-024", as: "lekismon" },
            { card: "BT25-021", as: "blueSubject" },
          ],
          hand: [{ card: "BT25-026", as: "crescemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("blueSubject").permanentId });

    expect(s.perm("lekismon").topCard.cardId).toBe("BT25-024");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("crescemon").instanceId);
  });

  it("checks the post-digivolution color for a real own-Digimon evolution event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-024", as: "lekismon" },
            { card: "BT1-010", as: "redBase" },
          ],
          hand: [
            { card: "AD1-001", as: "redEvo" },
            { card: "BT25-026", as: "crescemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("redEvo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lekismon").topCard.cardId === "BT25-026");

    expect(s.perm("redBase").topCard.cardId).toBe("AD1-001");
    expect(s.perm("lekismon").topCard.cardId).toBe("BT25-026");
    expect(s.state.memory).toBe(0);
  });

  it("allows declining the optional Crescemon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-024", as: "lekismon" },
            { card: "BT1-010", as: "redSubject" },
          ],
          hand: [{ card: "BT25-026", as: "crescemon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("redSubject").permanentId });

    expect(s.perm("lekismon").topCard.cardId).toBe("BT25-024");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("crescemon").instanceId);
  });

  it("keeps the printed TS alternate evolution requirement", () => {
    expect(getCardDefinition("BT25-024")).toMatchObject({
      colors: ["Blue"],
      level: 4,
      playCost: 4,
      dp: 5000,
      types: ["Beastkin", "Iliad", "TS"],
    });
    expect(digivolutionRequirementsFor("BT25-024")).toEqual([{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }]);
  });
});
