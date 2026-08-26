import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-069.js";

describe("BT11-069 MetalGreymon (X Antibody)", () => {
  it("maps catalog facts and each conditional effect to IR", () => {
    expect(getCardDefinition("BT11-069")).toMatchObject({
      cardId: "BT11-069",
      colors: ["Black", "Red"],
      level: 5,
      playCost: 8,
      dp: 8000,
      types: ["Cyborg", "X Antibody"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenDigivolving", actions: [{ kind: "GrantStatic" }, { kind: "Delete" }] },
      { trigger: "OpponentsTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("gains both protections and deletes a 6000-DP-or-less Digimon with a matching source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-064", as: "base" }], hand: [{ card: "BT11-069", as: "metal" }] },
        1: { battleArea: [{ card: "BT1-015", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(observe(s.engine).isRestricted(s.perm("base"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved")).toBe(true);
  });

  it("digivolves for 1 from an exact MetalGreymon base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-067", as: "metalGreymon" }],
        hand: [{ card: "BT11-069", as: "xMetalGreymon" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metalGreymon").permanentId,
        instanceId: s.inst("xMetalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metalGreymon").topCard.cardId === "BT11-069");

    expect(s.state.memory).toBe(3);
  });

  it("trashes security when an opposing Digimon unsuspends and only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-069", as: "host", under: ["BT11-069"] }],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "opponent" }],
        security: ["BT1-009", "BT1-011"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const payload = { unsuspendedPermanentId: s.perm("opponent").permanentId };

    await advance(s.engine).fireSubTrigger("whenUnsuspended", payload);
    expect(s.state.players[1]!.security).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenUnsuspended", payload);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not trash security for a host without Greymon or Omnimon in its name", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", under: ["BT11-069"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }], security: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("opponent").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
