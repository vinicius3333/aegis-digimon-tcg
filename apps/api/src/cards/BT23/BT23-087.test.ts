import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT23-087.js";

describe("BT23-087 Violet Inboots", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-087")).toMatchObject({
      cardId: "BT23-087",
      nameEn: "Violet Inboots",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["LIBERATOR"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("returns itself to deck bottom, plays another Violet, then a trash Ghostmon when no Digimon exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "fieldViolet" }],
          hand: [{ card: "BT23-087", as: "handViolet" }],
          trash: [{ card: "BT23-061", as: "ghostmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const fieldId = s.perm("fieldViolet").topCard!.instanceId;
    const handId = s.inst("handViolet").instanceId;
    const ghostId = s.inst("ghostmon").instanceId;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(fieldId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === handId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId)).toBe(true);
  });

  it("declining the return cost aborts the Ghostmon tail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "violet" }],
          hand: [{ card: "BT23-087", as: "replacement" }],
          trash: [{ card: "BT23-061", as: "ghostmon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-087")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT23-061")).toBe(true);
  });

  it("returns this Tamer to play another Violet Inboots and conditionally a Ghostmon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      cost: { kind: "return", to: "deckBottom", target: { isSelf: true, filter: { isSelfRef: true } } },
      optional: true,
      abortOnDecline: true,
    });
    expect(effect.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      optional: true,
      condition: { kind: "youHaveNone" },
    });
  });

  it("suspends Violet and grants Rush only to the Ghost that digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-087", as: "violet" },
            { card: "BT23-069", as: "ghost" },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("ghost").permanentId,
    });
    expect(s.perm("violet").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ghost"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Rush")).toBe(false);
  });

  it("suspends this Tamer to grant Rush to the Ghost-trait Digimon that digivolved", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    const watcher = effect.actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      sourceFilter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
      optional: true,
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "untilTurnEnd",
      target: { filter: { isTriggerSource: true } },
    });
  });
});
