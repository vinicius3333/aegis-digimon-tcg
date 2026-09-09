import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
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

  it("uses the public Delay effect only for exact Leviamon, not Leviamon (X Antibody)", async () => {
    const resolve = async (target: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT14-071", as: "purpleSource" },
              { card: "BT15-078", as: "attacker" },
            ],
            deck: Array.from({ length: 12 }, () => "BT1-010"),
            hand: [
              { card: "EX5-069", as: "option" },
              { card: "BT13-088", as: "lord" },
            ],
            trash: [{ card: target, as: "target" }],
          },
          1: {
            battleArea: [{ card: "BT1-020", as: "victim" }],
            trash: [{ card: "BT1-009", as: "played" }],
            security: ["BT1-009"],
            deck: Array.from({ length: 12 }, () => "BT1-011"),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 8;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-069"));
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("played").instanceId),
      );
      await settle(() => observe(s.engine).hasKeyword(s.perm("option"), "Delay"));
      expect(observe(s.engine).hasKeyword(s.perm("option"), "Delay")).toBe(true);

      const drive = advance(s.engine);
      drive.endMainPhaseIfOpen(0);
      await drive.waitForMainPhase(1);
      drive.endMainPhaseIfOpen(1);
      await drive.waitForMainPhase(0);
      await advance(s.engine).recompute();
      const delay = observe(s.engine)
        .activatableEffects(s.perm("option"))
        .find((entry) => /Delay/i.test(entry.description ?? ""));
      if (delay?.instanceId === undefined) throw new Error("EX5-069 Delay effect is unavailable");
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: delay.instanceId,
          effectKey: delay!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle();
      const result = {
        played: s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === target),
        remainsInTrash: s.state.players[0]!.trash.some((card) => card.cardId === target),
      };
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      return result;
    };

    await expect(resolve("EX5-063")).resolves.toEqual({ played: true, remainsInTrash: false });
    await expect(resolve("BT15-081")).resolves.toEqual({ played: false, remainsInTrash: true });
  });
});
