import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT7-064.js";

describe("BT7-064 DoruGreymon", () => {
  it("marks its When Digivolving protection as a main effect and Security Attack as inherited", () => {
    const card = runtimeCompiledCard("BT7-064");
    expect(card?.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: expect.arrayContaining([expect.objectContaining({ kind: "PlaceUnder" })]),
    });
    expect(card?.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: expect.arrayContaining([expect.objectContaining({ kind: "GainKeyword" })]),
    });
    expect(card?.effects[0]).not.toHaveProperty("isInherited");
  });

  it("places a black X-Antibody card from hand to protect the digivolving DoruGreymon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-064", under: ["BT7-062"], as: "host" }],
          hand: [{ card: "BT7-062", as: "placed" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeleted")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("host"), "dpImmune")).toBe(true);
  });

  it("accepts a black X-Antibody Option as a digivolution-card source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-064", under: ["BT7-062"], as: "host" }],
          hand: [{ card: "BT16-098", as: "placed" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
  });

  it("keeps its protection through the owner's turn and expires at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-064", under: ["BT7-062"], as: "host" }],
          hand: [{ card: "BT7-062", as: "placed" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { deck: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeleted")).toBe(true);

    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeleted")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeleted")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("host"), "dpImmune")).toBe(false);
  });

  it("grants inherited Security Attack only while DoruGreymon is under a host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-065", under: ["BT7-062", "BT7-064"], as: "host" }] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
