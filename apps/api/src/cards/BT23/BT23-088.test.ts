import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-088.js";

describe("BT23-088 K", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-088")).toMatchObject({
      cardId: "BT23-088",
      nameEn: "K",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("trashes an eligible hand card and gains exactly 1 memory at start-main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-088", as: "k" }],
          hand: [
            { card: "BT23-062", as: "eligible" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;
    const plainId = s.inst("plain").instanceId;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === plainId)).toBe(true);
  });

  it("trashes an eligible hand card to gain memory at the start of the main phase", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("deletes K and evolves a Digimon into an eligible level-4 trash Dark Animal for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-088", as: "k" },
            { card: "BT23-062", as: "base" },
          ],
          trash: [{ card: "BT23-063", as: "sangloupmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.state.memory;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnEndTurn,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-088")).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-063");
    expect(s.state.memory).toBe(before);
  });

  it("does not delete K when trash has no eligible level-5-or-lower evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-088", as: "k" },
            { card: "BT23-062", as: "base" },
          ],
          trash: [{ card: "BT23-068", as: "level6" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnEndTurn,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-088")).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-062");
  });

  it("deletes this Tamer before the end-of-turn trash digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any;
    const action = effect.actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: false,
      optional: true,
      cost: { kind: "deleteOwn", target: { isSelf: true, filter: { isSelfRef: true } } },
    });
    expect(action.into.levelComparison).toMatchObject({ op: "lte", value: 5 });
    expect(action.into.nameOrTrait).toEqual([{ tokens: ["Undead", "Dark Animal"], match: "trait" }]);
  });
});
