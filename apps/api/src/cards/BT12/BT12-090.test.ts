import { describe, expect, it } from "vitest";
import { CardColor, EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT12-030.js";
import "./BT12-031.js";
import "./BT12-090.js";

describe("BT12-090 Davis Motomiya", () => {
  it("registers the attack replacement without an unparsed seam", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-090")!;
    expect(card.coverage).toBe("full");
    expect(JSON.stringify(card)).not.toContain("RawUnparsed");
    expect(card.residual).toEqual([]);
    expect(card.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0]).toMatchObject({
      actions: [{ kind: "Digivolve", from: ["hand"], payCost: true, optional: true }],
    });
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-090", as: "davis", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("davis"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-090")).toBe(true);
  });

  it("gains memory when a Free Digimon is present", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-090", as: "davis" }, "BT12-021"] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("davis"));
    expect(s.state.memory).toBe(1);
  });

  it("suspends itself and digivolves an attacking blue-green Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-090", as: "davis" },
            { card: "BT12-030", as: "attacker" },
          ],
          hand: [{ card: "BT12-031", as: "fighter" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.cardId === "BT12-031");
    expect(s.perm("davis").isSuspended).toBe(true);
    expect(s.perm("attacker").topCard?.cardId).toBe("BT12-031");
  });

  it("does not trigger for a three-color attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-090", as: "davis" },
            { card: "BT17-077", as: "attacker" },
          ],
          hand: [{ card: "BT12-031", as: "fighter" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("davis").isSuspended).toBe(false);
  });
});

describe("BT12-090 Davis Motomiya — KB Q&A rulings", () => {
  function setupAttack(attacker: string, imperialdramon: string): EngineSetup {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-090", as: "davis" },
            { card: attacker, as: "attacker" },
          ],
          hand: [{ card: imperialdramon, as: "imperialdramon" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    return s;
  }

  async function attackPlayer(s: EngineSetup): Promise<void> {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard?.cardId === s.inst("imperialdramon").cardId ||
        s.state.players[1]!.security.length === 0,
    );
  }

  it("activates for a green/blue Digimon and for a Digimon made blue and green by an effect (Q2225)", async () => {
    const greenBlue = setupAttack("BT12-055", "BT12-030");
    await attackPlayer(greenBlue);
    expect(greenBlue.perm("davis").isSuspended).toBe(true);
    expect(greenBlue.perm("attacker").topCard?.cardId).toBe("BT12-030");

    const grantedGreen = setupAttack("BT2-027", "BT12-030");
    grantedGreen.engine.continuous.addColorGrant(
      grantedGreen.perm("attacker").permanentId,
      CardColor.Green,
      EffectDuration.UntilEachTurnEnd,
    );
    await attackPlayer(grantedGreen);
    expect(grantedGreen.perm("davis").isSuspended).toBe(true);
    expect(grantedGreen.perm("attacker").topCard?.cardId).toBe("BT12-030");

    const blueOnly = setupAttack("BT2-027", "BT12-030");
    await attackPlayer(blueOnly);
    expect(blueOnly.perm("davis").isSuspended).toBe(false);
    expect(blueOnly.perm("attacker").topCard?.cardId).toBe("BT2-027");
  });

  it("does not activate for a 3-color Digimon even though it is blue and green (Q2226)", async () => {
    const threeColor = setupAttack("BT18-018", "BT17-077");
    await attackPlayer(threeColor);
    expect(threeColor.perm("davis").isSuspended).toBe(false);
    expect(threeColor.perm("attacker").topCard?.cardId).toBe("BT18-018");
    expect(threeColor.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT17-077");

    const twoColor = setupAttack("BT12-030", "BT17-077");
    await attackPlayer(twoColor);
    expect(twoColor.perm("davis").isSuspended).toBe(true);
    expect(twoColor.perm("attacker").topCard?.cardId).toBe("BT17-077");
  });
});
