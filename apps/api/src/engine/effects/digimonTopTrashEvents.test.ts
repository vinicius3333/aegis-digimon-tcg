import { afterEach, describe, expect, it, vi } from "vitest";
import { internalsOf } from "../testkit/internals.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

type TopTrashPayload = {
  subjectPermanentId?: string;
  trashedDigimonTop?: { permanentId: string; controllerSeat: number; cardId: string };
};

afterEach(() => vi.restoreAllMocks());

function watchTopTrash(s: ReturnType<typeof setupEngine>) {
  const entries: TopTrashPayload[] = [];
  const internals = internalsOf(s.engine);
  const fire = internals.fireSubTrigger.bind(internals);
  // Record producer events before same-window pending reactions are coalesced. The
  // card regression separately proves that the Armor Form watcher receives the event.
  vi.spyOn(internals, "fireSubTrigger").mockImplementation(async (event, payload) => {
    if (event === "whenDigimonTopTrashed") entries.push(payload ?? {});
    await fire(event, payload);
  });
  return entries;
}

describe("whenDigimonTopTrashed generic event", () => {
  it("emits the pre-purge Armor Form identity and preserves the promoted host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-035", as: "armor", suspended: true, under: ["BT21-032"] },
            { card: "BT1-009", as: "watcher" },
          ],
        },
        1: { battleArea: [{ card: "BT2-075", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const armorId = s.perm("armor").permanentId;
    const entries = watchTopTrash(s);
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: armorId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT21-035"));
    expect(entries).toHaveLength(1);
    expect(entries[0]?.trashedDigimonTop).toEqual({ permanentId: armorId, controllerSeat: 0, cardId: "BT21-035" });
    expect(s.perm("armor").topCard.cardId).toBe("BT21-032");
  });

  it("emits each De-Digivolve top snapshot, including the promoted host", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-061", as: "reducer" }],
          battleArea: [
            { card: "BT1-085", as: "redTamer" },
            { card: "BT1-086", as: "blueTamer" },
            { card: "BT1-087", as: "yellowTamer" },
            { card: "BT1-088", as: "greenTamer" },
            { card: "BT1-009", as: "watcher" },
          ],
        },
        1: { battleArea: [{ card: "BT21-045", as: "host", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const entries = watchTopTrash(s);
    const hostId = s.perm("host").permanentId;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reducer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => entries.length === 2);
    expect(entries.map((entry) => entry.trashedDigimonTop?.cardId)).toEqual(["BT21-045", "BT21-044"]);
    expect(entries.every((entry) => entry.trashedDigimonTop?.permanentId === hostId)).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT21-042");
  });

  it("does not confuse ordinary source-card trash or another controller's top identity", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "watcher" }] },
      1: { battleArea: [{ card: "BT21-058", as: "host", under: ["BT21-056"] }] },
    });
    const entries = watchTopTrash(s);
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [
      s.perm("host").stack[0]!.instanceId,
    ]);
    expect(entries).toHaveLength(0);
  });
});
