import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_017 } from "./BT25-017.js";
import "../index.js";

describe("BT25-017 Flaremon", () => {
  it("offers a self-attack, then hand-trash-for-delete on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_017.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Attack",
        optional: true,
        withoutSuspending: false,
        target: { isSelf: true },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Delete",
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } }, count: 1 },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      });
    }
  });

  it("gates the Apollomon option on blue own-Digimon events", () => {
    const effect = BT25_017.effects?.find((entry) => entry.trigger === "YourTurn");
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"] as const) {
      const watcher = effect?.actions?.find((action) => action.kind === "SubTrigger" && action.event === event);
      expect(watcher).toMatchObject({
        sourceFilter: { controller: "mine", kind: ["Digimon"] },
        fireCondition: { kind: "triggerSubjectHasColor", filter: { colors: ["Blue"] } },
      });
      const subTrigger = watcher as { actions?: unknown[] } | undefined;
      expect(subTrigger?.actions?.[0]).toMatchObject({
        kind: "Digivolve",
        from: ["hand"],
        reduceCost: 2,
        payCost: true,
        optional: true,
      });
    }
  });

  it("preserves inherited Security Attack +1", () => {
    expect(BT25_017.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isInherited: true,
          keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
        }),
      ]),
    );
  });

  it("trashes the by-condition card and deletes exactly one opponent Digimon at 7000 DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-017", as: "source" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "atBoundary", dp: 7000 },
            { card: "BT1-010", as: "aboveBoundary", dp: 8000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const atBoundaryId = s.perm("atBoundary").permanentId;
    const aboveBoundaryId = s.perm("aboveBoundary").permanentId;
    preferred.push(atBoundaryId);

    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === atBoundaryId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).not.toContain(atBoundaryId);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toContain(aboveBoundaryId);
  });

  it("allows the by-condition cost even with no eligible deletion target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-017", as: "source" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "aboveBoundary", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("digivolves into Apollomon for 2 memory after a blue own-Digimon event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-017", as: "source" },
            { card: "BT25-021", as: "blueSubject" },
          ],
          hand: [{ card: "BT25-018", as: "apollomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("blueSubject").permanentId });
    await settle(() => s.perm("source").topCard.cardId === "BT25-018");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("apollomon").instanceId);
  });

  it("does not activate the Apollomon option for a non-blue own-Digimon event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-017", as: "source" },
            { card: "BT1-010", as: "redSubject" },
          ],
          hand: [{ card: "BT25-018", as: "apollomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("redSubject").permanentId });

    expect(s.perm("source").topCard.cardId).toBe("BT25-017");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("apollomon").instanceId);
  });

  it("uses the TS alternate route from an off-color Lv.4 and rejects a non-TS base", async () => {
    expect(getCardDefinition("BT25-017")).toMatchObject({
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 7000,
      types: ["Beastkin", "Iliad", "TS"],
    });
    expect(BT25_017.digivolutionRequirement).toEqual([{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor("BT25-017")).toEqual(BT25_017.digivolutionRequirement);

    const legal = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-050", as: "tsBase" }],
          hand: [{ card: "BT25-017", as: "flaremon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    legal.state.memory = 3;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("flaremon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === "BT25-017");
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-069", as: "nonTsBase" }],
        hand: [{ card: "BT25-017", as: "flaremon" }],
      },
    });
    invalid.state.memory = 3;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonTsBase").permanentId,
        instanceId: invalid.inst("flaremon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      invalid.inst("flaremon").instanceId,
    );
  });

  it("grants inherited Security Attack +1 from a realistic evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT25-017"], as: "host" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
