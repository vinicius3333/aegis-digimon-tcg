import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-022.js";
import "../index.js";

describe("BT16-022", () => {
  it("models Armor Purge", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }] });
  });

  it("trashes digivolution cards and grants Security Attack -1", () => {
    const actions = compiled.effects?.[1]?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 1,
      target: expect.objectContaining({ count: 1 }),
    });
    expect(actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      duration: "untilOpponentTurnEnd",
    });
  });

  it("trashes one opposing source, then gives Security Attack -1 to a source-less opponent", async () => {
    const options = { autoSelectCards: true, preferInstanceIds: [] as string[] };
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-023", as: "host", under: ["BT16-022"] }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "stacked", under: ["BT1-009"] },
            { card: "BT1-011", as: "sourceLess" },
          ],
        },
      },
      options,
    );
    const stackedSourceId = s.perm("stacked").stack[0]!.instanceId;
    options.preferInstanceIds.push(s.perm("sourceLess").permanentId);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === stackedSourceId)).toBe(true);
    expect(s.perm("stacked").stack).toHaveLength(0);
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("sourceLess").permanentId, "SecurityAttack")).toBe(true);
  });
});
