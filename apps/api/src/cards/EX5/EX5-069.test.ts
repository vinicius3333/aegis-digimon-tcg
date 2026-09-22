import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-069.js";
import "../BT15/BT15-078.js";
import "../index.js";

describe("EX5-069 Biting Crush", () => {
  it("matches the catalog and complete IR contract", () => {
    expect(getCardDefinition("EX5-069")).toMatchObject({
      cardId: "EX5-069",
      nameEn: "Biting Crush",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 8,
      effectText: expect.stringContaining("[Seven Great Demon Lords]"),
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(getCardDefinition("EX5-063")).toMatchObject({
      nameEn: "Leviamon",
      kinds: ["Digimon"],
      types: expect.arrayContaining(["Seven Great Demon Lords"]),
    });
    expect(getCardDefinition("BT15-081")).toMatchObject({
      nameEn: "Leviamon (X Antibody)",
      kinds: ["Digimon"],
      types: expect.arrayContaining(["Seven Great Demon Lords", "X Antibody"]),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("deletes an opposing level 6 or lower Digimon by trashing a hand card, then plays Leviamon when the trashed card is a Seven Great Demon Lord", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "Main" && entry.actions?.[0]?.kind === "Delete")?.actions,
    ).toMatchObject([
      {
        kind: "Delete",
        target: {
          count: 1,
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
        },
        cost: {
          kind: "trash",
          target: { count: 1, filter: { controller: "mine", zone: "hand" } },
          bindResultAs: "trashedCard",
        },
      },
      {
        kind: "PlaceInBattleAreaSelf",
        condition: {
          kind: "bindingContains",
          ref: "trashedCard",
          filter: { kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Seven Great Demon Lords"] }] },
        },
      },
    ]);
  });
  it("arms Delay when an effect plays an opposing Digimon and activates the security Main effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea", byEffect: true },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }],
    });
    expect(
      compiled.effects?.find(
        (entry) => entry.trigger === "Main" && entry.keywords?.some((keyword) => keyword.keyword === "Delay"),
      )?.actions[0],
    ).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      requiresDelayArmed: true,
      target: {
        count: 1,
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "nameExact", tokens: ["Leviamon"] }] },
      },
    });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]?.kind).toBe("ActivateMain");
    // Registration folds that authored grant/activate pair into the ONE printed clause the
    // rules describe: the [All Turns] trigger carries ＜Delay＞ and fires the payload itself.
    const runtime = runtimeCompiledCard("EX5-069")!.effects;
    expect(runtime).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenPlayed",
            actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["trash"] })],
          }),
        ],
      }),
    );
    expect(
      runtime.some((entry) => entry.trigger === "Main" && (entry.keywords ?? []).some((kw) => kw.keyword === "Delay")),
    ).toBe(false);
  });

  it("trashes a hand card and places itself after the public Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "purpleSource" }],
          hand: [
            { card: "EX5-069", as: "option" },
            { card: "EX5-063", as: "lord" },
          ],
        },
        1: { battleArea: [{ card: "BT1-020", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    const victimId = s.perm("victim").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-069")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX5-063")).toBe(true);
  });

  it("opens the ＜Delay＞ window on the opponent's turn when an effect plays their Digimon, and plays only exact Leviamon", async () => {
    // The reporter's flow (Discord EX5-069): the OPPONENT plays a Digimon by effect on their
    // own turn. KB Q4735 has the ＜Delay＞ trigger at that moment — simultaneously with the other
    // effects that play triggers — so the window must be offered there, not in a later own Main
    // phase. KB Q3675 keeps it optional: trashing this card is the activation cost.
    const resolve = async (target: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX5-069", as: "option" }],
            trash: [{ card: target, as: "target" }],
            deck: Array.from({ length: 12 }, () => "BT1-010"),
            security: 3,
          },
          1: {
            battleArea: [{ card: "BT2-069", as: "purpleSource" }],
            hand: [{ card: "BT2-108", as: "revival" }],
            trash: [{ card: "BT2-067", as: "demidevimon" }],
            deck: Array.from({ length: 12 }, () => "BT1-011"),
            security: 3,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 8;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      const drive = advance(s.engine);
      await drive.waitForMainPhase(0);
      drive.endMainPhaseIfOpen(0);
      await drive.waitForMainPhase(1);
      s.state.memory = -8;
      // BT2-108 plays a purple level 3 Digimon from the opponent's trash — "an effect plays an
      // opponent's Digimon" from seat 0's side.
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("revival").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("demidevimon").instanceId),
      );
      await settle();
      const result = {
        played: s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === target),
        remainsInTrash: s.state.players[0]!.trash.some((card) => card.cardId === target),
        optionTrashed: s.state.players[0]!.trash.some((card) => card.cardId === "EX5-069"),
      };
      s.engine.applyIntent(1, { type: "surrender" });
      await loop;
      return result;
    };

    await expect(resolve("EX5-063")).resolves.toEqual({ played: true, remainsInTrash: false, optionTrashed: true });
    // Leviamon (X Antibody) is a different name, so the window resolves to nothing. The trash is
    // still valid processing: §16-17-1's cost is paid first and the bullet then finds no target
    // (KB Q5710 for the same ordering on BT24-098).
    await expect(resolve("BT15-081")).resolves.toEqual({ played: false, remainsInTrash: true, optionTrashed: true });
  });
});
