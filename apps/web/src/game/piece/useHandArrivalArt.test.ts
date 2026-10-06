// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useHandArrivalArt } from "./useHandArrivalArt";

let row: HTMLDivElement;
beforeEach(() => {
  row = document.createElement("div");
  document.body.append(row);
});
afterEach(() => {
  cleanup();
  row.remove();
  vi.restoreAllMocks();
});

function card(id: string, withImage = true) {
  const element = document.createElement("div");
  element.dataset.handInstanceId = id;
  if (withImage) {
    const image = document.createElement("img");
    image.src = "/first.webp";
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 100 });
    element.append(image);
  }
  row.append(element);
  return element;
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it("waits for decoded art and keeps readiness across an equivalent entering set", async () => {
  const image = card("incoming").querySelector("img")!;
  const decode = deferred();
  image.decode = vi.fn<() => Promise<void>>(() => decode.promise);
  const { result, rerender } = renderHook(({ ids }) => useHandArrivalArt(row, ids), {
    initialProps: { ids: new Set(["incoming"]) },
  });
  expect(result.current.size).toBe(0);
  rerender({ ids: new Set(["incoming"]) });
  expect(image.decode).toHaveBeenCalledTimes(1);
  await act(async () => {
    decode.resolve();
  });
  expect([...result.current]).toEqual(["incoming"]);
  rerender({ ids: new Set() });
  expect(result.current.size).toBe(0);
});

it("does not release a replacement URL when the old decode resolves", async () => {
  const image = card("incoming").querySelector("img")!;
  const oldDecode = deferred();
  const newDecode = deferred();
  image.decode = vi
    .fn<() => Promise<void>>()
    .mockReturnValueOnce(oldDecode.promise)
    .mockReturnValueOnce(newDecode.promise);
  const { result } = renderHook(() => useHandArrivalArt(row, new Set(["incoming"])));
  await act(async () => {
    image.src = "/replacement.webp";
  });
  expect(image.decode).toHaveBeenCalledTimes(2);
  await act(async () => {
    oldDecode.resolve();
  });
  expect(result.current.size).toBe(0);
  await act(async () => {
    newDecode.resolve();
  });
  expect([...result.current]).toEqual(["incoming"]);
});

it("does not release a replacement image node on the old node's decode", async () => {
  const element = card("incoming");
  const oldImage = element.querySelector("img")!;
  const oldDecode = deferred();
  const newDecode = deferred();
  oldImage.decode = () => oldDecode.promise;
  const newImage = oldImage.cloneNode() as HTMLImageElement;
  Object.defineProperty(newImage, "naturalWidth", { value: 100 });
  newImage.decode = () => newDecode.promise;
  const { result } = renderHook(() => useHandArrivalArt(row, new Set(["incoming"])));
  await act(async () => {
    oldImage.replaceWith(newImage);
  });
  await act(async () => {
    oldDecode.resolve();
  });
  expect(result.current.size).toBe(0);
  await act(async () => {
    newDecode.resolve();
  });
  expect(result.current.has("incoming")).toBe(true);
});

it("accepts a text fallback after the image fails, without waiting on a broken URL", async () => {
  const element = card("incoming");
  const image = element.querySelector("img")!;
  const decode = deferred();
  image.decode = () => decode.promise;
  const { result } = renderHook(() => useHandArrivalArt(row, new Set(["incoming"])));
  await act(async () => {
    decode.reject(new Error("unavailable"));
  });
  expect(result.current.size).toBe(0);
  await act(async () => {
    image.replaceWith(document.createTextNode("Card fallback"));
  });
  expect(result.current.has("incoming")).toBe(true);
});

it("rejects an empty failed image even after decode resolution", async () => {
  const image = card("incoming").querySelector("img")!;
  Object.defineProperty(image, "naturalWidth", { value: 0 });
  image.decode = () => Promise.resolve();
  const { result } = renderHook(() => useHandArrivalArt(row, new Set(["incoming"])));
  await act(async () => {});
  expect(result.current.size).toBe(0);
});

it("ignores decoded work from a removed arrival and releases only the current one", async () => {
  const image = card("removed").querySelector("img")!;
  const decode = deferred();
  image.decode = () => decode.promise;
  card("current", false);
  const { result, rerender, unmount } = renderHook(({ ids }) => useHandArrivalArt(row, ids), {
    initialProps: { ids: new Set(["removed"]) },
  });
  rerender({ ids: new Set(["current"]) });
  await act(async () => {
    decode.resolve();
  });
  expect([...result.current]).toEqual(["current"]);
  unmount();
  await act(async () => {
    card("after-unmount", false);
  });
  expect([...result.current]).toEqual(["current"]);
});
