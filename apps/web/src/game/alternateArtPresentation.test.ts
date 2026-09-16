import { describe, expect, it } from "vitest";
import type { GameState, ServerEvent } from "@aegis/shared";
import { snapshotGameState } from "../net/presentedState";
import { buildInstanceArtIndex, pushSidePanel, sidePanelFromEvent } from "./sidePanels";
import { buildSecurityClashScene, securityDestructionsFromEvents } from "./securityClash";
import { zoneShowcaseFromEvent } from "./showcases";

describe("physical printing presentation", () => {
  it("keeps different printings of the same card through movement panels and merging", () => {
    const event: ServerEvent = { kind: "cardsMoved", from: "security", to: "trash", seat: 1, instanceIds: ["a", "b"], cardIds: ["BT1-010", "BT1-010"], artIds: ["BT1-010_P1", "BT1-010_P2"] };
    const lookup = { cardId: () => undefined, seat: () => undefined };
    const panel = sidePanelFromEvent(event, 0, lookup, "one", 0, false)!;
    expect(panel.cards.map((card) => card.artId)).toEqual(event.artIds);
    const merged = pushSidePanel([panel], { ...panel, id: "two", createdAt: 1 });
    expect(merged[0]?.cards.map((card) => card.artId)).toEqual([...event.artIds!, ...event.artIds!]);
    expect(securityDestructionsFromEvents([event], lookup).map((card) => card.artId)).toEqual(event.artIds);
  });
  it("passes selected printing through reveal, play showcase, and evolution showcase", () => {
    const scene = buildSecurityClashScene({ key: 1, revealedCardId: "BT1-010", revealedArtId: "BT1-010_P2", defenderSeat: 1, viewerSeat: 0, resolution: "battle", attacker: { seat: 0, cardId: "BT1-010", artId: "BT1-010_P1" } });
    expect(scene.revealed.artId).toBe("BT1-010_P2");
    expect(scene.attacker?.artId).toBe("BT1-010_P1");
    const event: ServerEvent = { kind: "digivolved", seat: 1, permanentId: "mega", cardId: "BT1-025", artId: "BT1-025_P1", mechanic: "normal", inBreeding: true };
    expect(zoneShowcaseFromEvent(event, 0, 1)?.artId).toBe(event.artId);
  });
  it("snapshots retain visible copy art without indexing concealed identities", () => {
    const state = { players: [{ hand: [{ instanceId: "visible", cardId: "BT1-010", artId: "BT1-010_P1" }], security: [{ instanceId: "hidden", artId: "BT1-010_P2" }], trash: [], battleArea: [] }] } as unknown as GameState;
    const snapshot = snapshotGameState(state);
    state.players[0]!.hand[0]!.artId = "BT1-010_P2";
    expect(snapshot.players[0]!.hand[0]!.artId).toBe("BT1-010_P1");
    expect(buildInstanceArtIndex(snapshot).get("visible")).toBe("BT1-010_P1");
    expect(buildInstanceArtIndex(snapshot).has("hidden")).toBe(false);
  });
});
