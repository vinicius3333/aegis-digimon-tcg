import { describe, expect, it } from "vitest";
import { CardInstance, Permanent, type Seat } from "@aegis/shared";
import { buildPermanentDetail, inspectorPlacement } from "./permanentDetail";

function instance(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  const card = new CardInstance();
  card.instanceId = instanceId;
  card.cardId = cardId;
  card.ownerSeat = seat;
  return card;
}

function permanent(): Permanent {
  const perm = new Permanent();
  perm.permanentId = "p-1";
  perm.controllerSeat = 0;
  perm.topCard = instance("top", "ST1-11");
  perm.stack.push(instance("under-0", "ST1-01"), instance("under-1", "ST1-03"));
  perm.linked.push(instance("link-0", "ST1-07"));
  perm.baseDP = 11000;
  perm.currentDP = 14000;
  perm.isSuspended = true;
  perm.keywords.push("Blocker", "SecurityAttack");
  perm.grantedKeywords.push("Blocker");
  return perm;
}

describe("buildPermanentDetail", () => {
  it("reads the live figures the server resolved", () => {
    const detail = buildPermanentDetail(permanent());
    expect(detail).toMatchObject({
      permanentId: "p-1",
      cardId: "ST1-11",
      currentDP: 14000,
      baseDP: 11000,
      dpDelta: 3000,
      suspended: true,
    });
    expect(detail.keywords).toEqual(["Blocker", "SecurityAttack"]);
    expect(detail.grantedKeywords).toEqual(["Blocker"]);
  });

  it("lists the top card, its sources and its linked cards in that order", () => {
    expect(buildPermanentDetail(permanent()).cards).toEqual([
      { cardId: "ST1-11", role: "top" },
      { cardId: "ST1-01", role: "stack" },
      { cardId: "ST1-03", role: "stack" },
      { cardId: "ST1-07", role: "linked" },
    ]);
  });

  it("leaves the security-attack figure out at the default single check", () => {
    const perm = permanent();
    perm.securityAttack = 1;
    expect(buildPermanentDetail(perm).securityAttack).toBeUndefined();
  });

  it("shows the server's resolved count when it differs from the default", () => {
    const perm = permanent();
    perm.securityAttack = 3;
    expect(buildPermanentDetail(perm).securityAttack).toBe(3);
  });

  it("shows a count of zero, which a negative modifier can reach", () => {
    const perm = permanent();
    perm.securityAttack = 0;
    expect(buildPermanentDetail(perm).securityAttack).toBe(0);
  });
});

const VIEWPORT = { viewportWidth: 1200, viewportHeight: 800, panelWidth: 400, panelHeight: 480 };

describe("inspectorPlacement", () => {
  it("opens to the right of a card on the left half", () => {
    expect(inspectorPlacement({ anchorX: 200, anchorY: 400, ...VIEWPORT }).side).toBe("right");
  });

  it("opens to the left of a card on the right half", () => {
    expect(inspectorPlacement({ anchorX: 1000, anchorY: 400, ...VIEWPORT }).side).toBe("left");
  });

  it("flips back rather than opening off-screen", () => {
    expect(inspectorPlacement({ anchorX: 60, anchorY: 400, ...VIEWPORT, viewportWidth: 420 }).side).toBe("right");
  });

  it("keeps the panel inside the viewport", () => {
    const placement = inspectorPlacement({ anchorX: 1190, anchorY: 790, ...VIEWPORT });
    expect(placement.left).toBeLessThanOrEqual(1200 - 400 - 12);
    expect(placement.left).toBeGreaterThanOrEqual(12);
    expect(placement.top).toBeLessThanOrEqual(800 - 480 - 12);
  });
});
