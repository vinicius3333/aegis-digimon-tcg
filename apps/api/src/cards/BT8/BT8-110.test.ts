import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import "./BT8-012.js";
import "./BT8-110.js";

describe("BT8-110 Armor Texture!", () => {
  it("waives its color requirement, sheds an Armor Form, and unsuspends only the Digimon it evolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-012", as: "armor", under: ["BT1-064"] },
            { card: "BT1-009", as: "evolutionTarget", suspended: true },
          ],
          hand: [
            { card: "BT8-110", as: "option" },
            { card: "BT8-012", as: "nextArmor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("evolutionTarget").topCard.cardId === "BT8-012" &&
        s.perm("evolutionTarget").isSuspended === false &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-110"),
    );

    expect(s.perm("armor").topCard.cardId).toBe("BT1-064");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-012")).toBe(true);
    expect(s.perm("evolutionTarget").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-110")).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("does not unsuspend any Digimon when the optional evolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-012", as: "armor", under: ["BT1-064"] },
            { card: "BT1-009", as: "evolutionTarget", suspended: true },
          ],
          hand: [
            { card: "BT8-110", as: "option" },
            { card: "BT8-012", as: "nextArmor" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-110"));

    expect(s.perm("armor").topCard.cardId).toBe("BT1-064");
    expect(s.perm("evolutionTarget").topCard.cardId).toBe("BT1-009");
    expect(s.perm("evolutionTarget").isSuspended).toBe(true);
  });
});

describe("BT8-110 Armor Texture! — KB Q&A rulings", () => {
  const setupArmorBoard = (evolutionTargetCard: string, options: SetupEngineOptions) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-012", as: "armor", under: [{ card: "BT1-009", as: "armorBase" }], suspended: true },
            { card: evolutionTargetCard, as: "evolutionTarget", suspended: true },
          ],
          hand: [
            { card: "BT8-110", as: "option" },
            { card: "BT8-012", as: "nextArmor" },
          ],
        },
      },
      options,
    );
    s.state.memory = 5;
    return s;
  };

  const playArmorTexture = async (s: EngineSetup) => {
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-110"));
  };

  it("digivolves a different Digimon than the one that lost its top card and unsuspends only that one (Q1789)", async () => {
    const preferredTargets: string[] = [];
    const s = setupArmorBoard("BT1-009", {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferredTargets,
    });
    preferredTargets.push(s.perm("evolutionTarget").topCard!.instanceId, s.inst("nextArmor").instanceId);

    await playArmorTexture(s);

    expect(s.perm("armor").topCard!.instanceId).toBe(s.inst("armorBase").instanceId);
    expect(s.perm("armor").isSuspended).toBe(true);
    expect(s.perm("evolutionTarget").topCard!.instanceId).toBe(s.inst("nextArmor").instanceId);
    expect(s.perm("evolutionTarget").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  it("may decline the digivolution, and then unsuspends no Digimon (Q1790)", async () => {
    const s = setupArmorBoard("BT1-009", { autoDeclineOptional: true, autoSelectCards: true });

    await playArmorTexture(s);

    expect(s.perm("armor").topCard!.instanceId).toBe(s.inst("armorBase").instanceId);
    expect(s.perm("evolutionTarget").topCard!.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nextArmor").instanceId);
    expect(s.perm("armor").isSuspended).toBe(true);
    expect(s.perm("evolutionTarget").isSuspended).toBe(true);
    expect(s.state.memory).toBe(5);
  });

  it("does not ignore the Armor Form card's digivolution requirements (Q1791)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-012", as: "armor", under: [{ card: "BT1-064", as: "armorBase" }], suspended: true },
            { card: "BT1-064", as: "evolutionTarget", suspended: true },
          ],
          hand: [
            { card: "BT8-110", as: "option" },
            { card: "BT8-012", as: "nextArmor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await playArmorTexture(s);

    expect(s.perm("armor").topCard!.instanceId).toBe(s.inst("armorBase").instanceId);
    expect(s.perm("evolutionTarget").topCard!.cardId).toBe("BT1-064");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nextArmor").instanceId);
    expect(s.perm("armor").isSuspended).toBe(true);
    expect(s.perm("evolutionTarget").isSuspended).toBe(true);
    expect(s.state.memory).toBe(5);

    const control = setupArmorBoard("BT1-009", { autoAcceptOptional: true, autoSelectCards: true });
    await playArmorTexture(control);
    expect(control.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(
      control.inst("nextArmor").instanceId,
    );
  });
});
