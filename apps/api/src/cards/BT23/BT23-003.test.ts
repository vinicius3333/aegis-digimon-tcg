import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT23-003.js";
import "./BT23-100.js";

describe("BT23-003 Motimon", () => {
  it("matches the catalog and carries the printed inherited contract", () => {
    expect(getCardDefinition("BT23-003")).toMatchObject({
      cardId: "BT23-003",
      nameEn: "Motimon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Lesser", "CS"],
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When any of your [CS]\u00a0trait Option cards are placed in the battle area, this Digimon may attack.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOptionPlayed",
            sourceFilter: {
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
            actions: [
              {
                kind: "Attack",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                withoutSuspending: false,
                optional: true,
              },
            ],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("may attack when its controller places a CS Option and triggers only once that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost", dp: 20_000 }],
          hand: [
            { card: "BT23-100", as: "firstOption" },
            { card: "BT23-100", as: "secondOption" },
          ],
          deck: ["BT1-009"],
        },
        1: {
          security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          battleArea: [
            { card: "BT1-009", as: "firstTarget", suspended: true },
            { card: "BT1-010", as: "secondTarget", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstOption").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("motimonHost").isSuspended && !observe(s.engine).isAttacking(),
    );
    await advance(s.engine).verb.unsuspend([s.perm("motimonHost").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("secondOption").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("secondOption").instanceId,
        ) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.perm("motimonHost").isSuspended).toBe(false);
  });

  it("does not trigger for a non-CS Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost" }],
          hand: [{ card: "ST20-14", as: "nonCsOption" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("nonCsOption").instanceId);

    expect(s.perm("motimonHost").isSuspended).toBe(false);
    expect(s.decisions).toHaveLength(0);
  });

  it("does not trigger when the opponent places a CS Option", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost" }] },
        1: { hand: [{ card: "BT23-100", as: "opponentCsOption" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("opponentCsOption").instanceId);

    expect(s.perm("motimonHost").isSuspended).toBe(false);
    expect(s.decisions).toHaveLength(0);
  });

  it("allows the controller to refuse the optional attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost" }],
          hand: [{ card: "BT23-100", as: "csOption" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("csOption").instanceId);

    expect(s.perm("motimonHost").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
