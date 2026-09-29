import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
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

  it("still loses a battle, because its protection only stops effects from deleting it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-064", under: ["BT7-062"], as: "host", suspended: true }],
          hand: [{ card: "BT7-062", as: "placed" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeleted")).toBe(true);
    const hostInstanceId = s.perm("host").topCard!.instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared") && !observe(s.engine).isAttacking());
    await drainMicrotasks();

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === hostInstanceId)).toBe(true);
  });

  it("grants inherited Security Attack only while DoruGreymon is under a host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-065", under: ["BT7-062", "BT7-064"], as: "host" }] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
