import { describe, expect, it } from "vitest";
import { memoryCostPreview } from "./memoryCostPreview";

const playable = { playable: true, playCost: 4 };

describe("memory cost preview", () => {
  it("prices nothing when no card is held", () => {
    expect(memoryCostPreview({})).toBeUndefined();
    expect(memoryCostPreview({ dropTarget: { kind: "field" } })).toBeUndefined();
  });

  it("prices the play of a hovered or selected playable card", () => {
    expect(memoryCostPreview({ heldCard: playable })).toEqual({ kind: "play", cost: 4 });
  });

  it("prices nothing for a card the server has not made playable", () => {
    expect(memoryCostPreview({ heldCard: { playable: false, playCost: 4 } })).toBeUndefined();
    expect(
      memoryCostPreview({ heldCard: { playable: false, playCost: 4 }, dropTarget: { kind: "field" } }),
    ).toBeUndefined();
  });

  it("prices nothing for a card the server projected no cost for", () => {
    expect(memoryCostPreview({ heldCard: { playable: true } })).toBeUndefined();
    expect(memoryCostPreview({ heldCard: { playable: true, playCost: -1 } })).toBeUndefined();
  });

  it("prices the play when the drag hovers the battle area", () => {
    expect(memoryCostPreview({ heldCard: playable, dropTarget: { kind: "field" } })).toEqual({
      kind: "play",
      cost: 4,
    });
  });

  it("prices the digivolution when the drag hovers a base that offers a route", () => {
    expect(
      memoryCostPreview({ heldCard: playable, dropTarget: { kind: "permanent", digivolve: { cost: 2 } } }),
    ).toEqual({ kind: "digivolve", cost: 2 });
  });

  it("prices a free digivolution route at zero rather than dropping the preview", () => {
    expect(
      memoryCostPreview({ heldCard: playable, dropTarget: { kind: "permanent", digivolve: { cost: 0 } } }),
    ).toEqual({ kind: "digivolve", cost: 0 });
  });

  it("prices the play when a hovered permanent offers no digivolution route", () => {
    expect(memoryCostPreview({ heldCard: playable, dropTarget: { kind: "permanent" } })).toEqual({
      kind: "play",
      cost: 4,
    });
  });

  it("prices nothing for an unpriced route, such as a DNA digivolution", () => {
    expect(memoryCostPreview({ heldCard: playable, dropTarget: { kind: "permanent", digivolve: {} } })).toBeUndefined();
  });

  it("prices nothing over the breeding area when it offers no route — hatching spends none", () => {
    expect(memoryCostPreview({ heldCard: playable, dropTarget: { kind: "breeding" } })).toBeUndefined();
  });

  it("prices the breeding digivolution the server offered, never the card's play cost", () => {
    expect(memoryCostPreview({ heldCard: playable, dropTarget: { kind: "breeding", digivolve: { cost: 3 } } })).toEqual(
      { kind: "digivolve", cost: 3 },
    );
  });

  it("prices nothing over an area that would refuse the drop", () => {
    expect(memoryCostPreview({ heldCard: playable, dropTarget: { kind: "refused" } })).toBeUndefined();
  });
});
