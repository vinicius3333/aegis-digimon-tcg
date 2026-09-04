import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-052.js";

describe("EX8-052", () => {
  it("may play a Device Option from hand or trash when Cyberdramon or X Antibody is in its stack", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlaceInBattleAreaSelf",
      target: { from: ["hand", "trash"] },
      optional: true,
      condition: { kind: "anyOf" },
    }));
  it("can de-digivolve by 2 by trashing an Option in the battle area", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "WhenDigivolving")[1]?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 2,
      optional: true,
      cost: { kind: "trash" },
    });
  });
  it("inherits a once-per-turn attack effect that trashes an Option to trash the opponent's top security", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trash",
          controller: "opponent",
          from: ["security"],
          cost: { kind: "trash" },
        },
      ],
    }));
  it("trashes the exact opposing security card after paying with an Option", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "AD1-001", as: "host", under: ["EX8-052"] },
          { card: "EX8-070", as: "option" },
        ],
      },
      1: { security: ["BT1-009"] },
    });
    s.perm("option").placedByEffect = true;
    const securityInstanceId = s.state.players[1]!.security[0]!.instanceId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityInstanceId)).toBe(true);
  });

  it("uses the Cyberdramon route and places a Device Option from hand in battle", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-062", as: "base" },
            { card: "EX8-070", as: "existingOption" },
          ],
          hand: [
            { card: "EX8-052", as: "xAntibody" },
            { card: "P-155", as: "device" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    s.perm("existingOption").placedByEffect = true;
    preferInstanceIds.push(s.perm("existingOption").permanentId);
    const deviceId = s.inst("device").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === deviceId));
    const device = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === deviceId)!;
    expect(device.placedByEffect).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("pays with a battle-area Option to de-digivolve an opponent by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-052", as: "source" },
            { card: "EX8-070", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "EX8-029", as: "target", under: ["EX8-020", "EX8-024", "EX8-026"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const optionId = s.inst("option").instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("keeps the Option and opponent stack when the optional de-digivolve is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-052", as: "source" },
            { card: "EX8-070", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "EX8-029", as: "target", under: ["EX8-020", "EX8-024", "EX8-026"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const optionId = s.inst("option").instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.perm("target").stack).toHaveLength(3);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });
});
