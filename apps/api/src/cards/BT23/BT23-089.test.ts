import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-089.js";

describe("BT23-089 Takumi Aiba", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-089")).toMatchObject({
      cardId: "BT23-089",
      nameEn: "Takumi Aiba",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gains start-main memory only on its controller's turn with an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-089", as: "takumi" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    const fire = () =>
      (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
        EffectTiming.OnStartMainPhase,
      );
    await fire();
    expect(s.state.memory).toBe(1);
    s.state.turnSeat = 1;
    await fire();
    expect(s.state.memory).toBe(1);
  });

  it("installs an executable leave-prevention replacement with a same-level pair cost", () => {
    const replacement = compiled.effects
      .find((entry) => entry.trigger === "AllTurns")
      ?.actions?.find((action) => action.kind === "Replacement") as any;

    expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", optional: true });
    expect(replacement.cost).toMatchObject({
      kind: "compound",
      costs: [
        { kind: "suspend" },
        {
          kind: "trash",
          target: {
            count: 2,
            filter: {
              zone: "digivolutionCards",
              sameHost: true,
              sameLevelPair: true,
            },
          },
        },
      ],
    });
  });

  it("cannot combine different-level sources and leaves without paying either cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-006", as: "host", under: ["BT23-006", "BT23-008"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.perm("takumi").isSuspended).toBe(false);
  });

  it("may decline a payable prevention without suspending Takumi or trashing sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-006", as: "host", under: ["BT23-006", "BT23-006"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.perm("takumi").isSuspended).toBe(false);
  });

  it("can pay the replacement and prevent a CS Digimon from leaving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-006", as: "host", under: ["BT23-006", "BT23-006"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(s.perm("host").permanentId);
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
