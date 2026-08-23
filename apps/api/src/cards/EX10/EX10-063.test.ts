import { describe, expect, it } from "vitest";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX10-063.js";

function source(): CardSource {
  return {
    instanceId: "close-tamer",
    cardId: "EX10-063",
    ownerSeat: 0,
    definition: undefined as never,
    permanent: () => ({ permanentId: "close-permanent" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("EX10-063 Close", () => {
  it("requires Close in hand before the by-condition can activate (Q5173)", () => {
    const card = source();
    const effect = getEffectModule("EX10-063")!.effectsForTiming(EffectTiming.OnStartMainPhase, card)[0]!;
    const base = {
      source: card,
      trigger: {},
      game: {
        player: () => ({ hand: [] }),
        definitionOf: () => ({ nameEn: "Sunarizamon" }),
      },
    } as unknown as EffectContext;
    expect(effect.canActivate(base)).toBe(false);
    expect(
      effect.canActivate({
        ...base,
        game: {
          player: () => ({ hand: [{ instanceId: "close", cardId: "EX10-063" }] }),
          definitionOf: () => ({ nameEn: "Close" }),
        },
      } as never),
    ).toBe(true);
  });

  it("asks before suspending when a Mineral or Rock Digimon loses a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-063", as: "close" },
            { card: "BT13-061", as: "gotsumon" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
      subjectPermanentId: s.perm("gotsumon").permanentId,
    });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("leaves Close unsuspended and gains no memory when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-063", as: "close" },
            { card: "BT13-061", as: "gotsumon" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
      subjectPermanentId: s.perm("gotsumon").permanentId,
    });
    await settle(() => false, 30);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("close").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
