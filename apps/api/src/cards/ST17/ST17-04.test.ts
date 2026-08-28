import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-04 Wendigomon", () => {
  it("deletes an own level 3 Terriermon and may play it back from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST17-04", as: "wendigomon" }],
          battleArea: [{ card: "ST17-02", as: "terriermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("wendigomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-02"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-02")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST17-02")).toBe(false);
  });

  it("gives its suspended host +1000 DP through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-05", as: "host", suspended: true, under: ["ST17-04"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(6000);
  });
});
