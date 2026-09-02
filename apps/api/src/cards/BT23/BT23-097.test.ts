import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT23-070.js";
import { compiled } from "./BT23-097.js";

describe("BT23-097 Seventh Penetration", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-097")).toMatchObject({
      cardId: "BT23-097",
      nameEn: "Seventh Penetration",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 7,
      types: ["Seven Great Demon Lords"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("returns itself from trash to deck bottom after a public digivolution into Belphemon (X Antibody)", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-083", as: "base" }],
          trash: [{ card: "BT23-097", as: "option" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", { card: "BT23-070", as: "belphemon" }],
        },
        1: {
          battleArea: [
            { card: "BT23-012", as: "level5" },
            { card: "BT23-010", as: "level4" },
            { card: "BT23-005", as: "level3" },
          ],
          security: 2,
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: preferredTargets,
      },
    );
    const optionId = s.inst("option").instanceId;
    preferredTargets.push(s.perm("level4").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("belphemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.deck.some((card) => card.instanceId === optionId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-012") &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-010"),
    );
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(optionId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-012")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-010")).toBe(false);
    expect(s.perm("level3").topCard?.cardId).toBe("BT23-005");
  });

  it("leaves the optional return unpaid when declined after public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-088", as: "base" }],
          trash: [{ card: "BT23-097", as: "option" }],
          hand: ["BT1-009", { card: "BT23-070", as: "belphemon" }],
        },
        1: { security: 2 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("belphemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-070"));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("ignores an opponent's public evolution into Belphemon (X Antibody)", async () => {
    const s = setupEngine(
      {
        0: { trash: [{ card: "BT23-097", as: "option" }], security: 2 },
        1: {
          battleArea: [{ card: "BT11-083", as: "base" }],
          hand: [{ card: "BT23-070", as: "belphemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("belphemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-070");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("returns itself to the bottom of the deck before activating Main", () => {
    const trigger = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    const action = trigger.actions[0].actions[0];
    expect(action).toMatchObject({ kind: "ActivateMain", optional: true, cost: { kind: "return", to: "deckBottom" } });
    expect(trigger.isFromTrash).toBe(true);
    expect(trigger.actions[0].sourceFilter.nameOrTrait).toEqual([
      { tokens: ["Belphemon (X Antibody)"], match: "name" },
    ]);
  });

  it("routes Security through Main without changing its dynamic hand-size boundary", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions).toEqual([{ kind: "ActivateMain" }]);
  });

  it("scales the opponent level floor from the number of cards in hand", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main") as any;
    expect(main.actions[0].target.filter.levelComparison).toMatchObject({ op: "gte", value: 0 });
    expect(main.actions[0].target.filter.levelComparison.scaling.filter).toMatchObject({
      controllerDefault: "mine",
      zone: "hand",
    });
  });
});
