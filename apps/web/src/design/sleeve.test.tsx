// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CardBack } from "./cards";
import { CardSleevePicker } from "./sleevePicker";
import { setCardSleeveId } from "./sleeve";

describe("card sleeves", () => {
  beforeEach(() => {
    localStorage.clear();
    setCardSleeveId("omnimon");
  });

  it("persists a valid selection and updates existing card backs", () => {
    const { container } = render(
      <>
        <CardSleevePicker />
        <CardBack width={70} label={5} />
      </>,
    );

    expect(container.querySelector('img[src="/sleeves/omnimon.png"]')).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Alphamon, Official Card Sleeves" }));

    expect(localStorage.getItem("aegis.sleeve")).toBe("alphamon");
    expect(container.querySelector('img[src="/sleeves/alphamon.png"]')).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("ignores unknown sleeve identifiers", () => {
    setCardSleeveId("unknown");
    expect(localStorage.getItem("aegis.sleeve")).toBe("omnimon");
  });

  it("keeps the opponent card back independent from the local sleeve", () => {
    const { container } = render(
      <>
        <CardBack width={70} useSelectedSleeve />
        <CardBack width={70} useSelectedSleeve={false} />
      </>,
    );

    expect(container.querySelectorAll('img[src="/sleeves/omnimon.png"]')).toHaveLength(1);
  });
});
