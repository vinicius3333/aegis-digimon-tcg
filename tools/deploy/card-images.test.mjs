import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { CARD_IMAGE_ORIGINS, cardImageIds, syncCardImages } from "./card-images.mjs";

const webp = (label) => Buffer.concat([Buffer.from("RIFF\0\0\0\0WEBP"), Buffer.from(label)]);

function fixture(t, cards, arts = {}) {
  const root = mkdtempSync(`${tmpdir()}/aegis-card-images-`);
  t.after(() => rmSync(root, { recursive: true }));
  const data = `${root}/source/packages/shared/src/cards/data`;
  mkdirSync(data, { recursive: true });
  writeFileSync(`${data}/cards.json`, JSON.stringify(cards));
  writeFileSync(`${data}/arts.json`, JSON.stringify(arts));
  return { source: `${root}/source`, destination: `${root}/state/assets/card-images` };
}

function fakeFetch(files) {
  const requests = [];
  const fetch = async (url) => {
    requests.push(url);
    const body = files[url];
    return body ? new Response(body) : new Response("Not found", { status: 404 });
  };
  return { fetch, requests };
}

const [bucket, snapshot] = CARD_IMAGE_ORIGINS;

test("lists base, errata, and alternate art images but not tokens", (t) => {
  const { source } = fixture(
    t,
    [
      { cardId: "BT1-001" },
      { cardId: "BT16-077", imageId: "BT16-077-Errata" },
      { cardId: "TOKEN-Familiar" },
    ],
    { "BT1-001": [{ artId: "BT1-001_P1", imageId: "BT1-001_P1" }] },
  );
  assert.deepEqual(cardImageIds(source), ["BT1-001", "BT1-001_P1", "BT16-077", "BT16-077-Errata"]);
});

test("downloads missing images, falling back across origins and to the sample scan", async (t) => {
  const paths = fixture(t, [{ cardId: "BT1-001" }, { cardId: "BT1-002" }, { cardId: "BT1-003" }, { cardId: "BT1-004" }]);
  mkdirSync(paths.destination, { recursive: true });
  writeFileSync(`${paths.destination}/BT1-004.webp`, "kept");
  const { fetch, requests } = fakeFetch({
    [`${bucket}/BT1-001.webp`]: webp("bucket"),
    [`${bucket}/BT1-002.webp`]: "<html>not an image</html>",
    [`${snapshot}/BT1-002.webp`]: webp("snapshot"),
    [`${snapshot}/BT1-003-Sample.webp`]: webp("sample"),
  });

  const result = await syncCardImages({ ...paths, fetch });

  assert.deepEqual(result, { present: 1, downloaded: 3, missing: [] });
  assert.equal(readFileSync(`${paths.destination}/BT1-001.webp`, "utf8").slice(12), "bucket");
  assert.equal(readFileSync(`${paths.destination}/BT1-002.webp`, "utf8").slice(12), "snapshot");
  assert.equal(readFileSync(`${paths.destination}/BT1-003-Sample.webp`, "utf8").slice(12), "sample");
  assert.equal(readFileSync(`${paths.destination}/BT1-004.webp`, "utf8"), "kept");
  assert.equal(requests.some((url) => url.includes("BT1-004")), false);
  assert.deepEqual(readdirSync(paths.destination).filter((name) => name.startsWith(".")), []);
});

test("keeps looking for the real image and replaces the sample once it is published", async (t) => {
  const paths = fixture(t, [{ cardId: "BT1-001" }, { cardId: "BT1-002" }]);
  mkdirSync(paths.destination, { recursive: true });
  writeFileSync(`${paths.destination}/BT1-001-Sample.webp`, "sample");

  const before = await syncCardImages({ ...paths, fetch: fakeFetch({}).fetch });
  assert.deepEqual(before, { present: 1, downloaded: 0, missing: ["BT1-002"] });

  const after = await syncCardImages({ ...paths, fetch: fakeFetch({ [`${bucket}/BT1-001.webp`]: webp("real") }).fetch });
  assert.deepEqual(after, { present: 0, downloaded: 1, missing: ["BT1-002"] });
  assert.equal(existsSync(`${paths.destination}/BT1-001.webp`), true);
  assert.equal(existsSync(`${paths.destination}/BT1-001-Sample.webp`), false);
});

test("reports only printings with no image under any fallback the client tries", async (t) => {
  const paths = fixture(
    t,
    [{ cardId: "BT16-077", imageId: "BT16-077-Errata" }, { cardId: "P-147" }, { cardId: "BT1-001" }],
    { "BT1-001": [{ artId: "BT1-001_P1", imageId: "BT1-001_P1" }] },
  );
  mkdirSync(`${paths.source}/apps/web/public/cards/unpublished`, { recursive: true });
  writeFileSync(`${paths.source}/apps/web/public/cards/unpublished/P-147.webp`, "bundled");
  const { fetch } = fakeFetch({
    [`${bucket}/BT16-077-Errata.webp`]: webp("errata"),
    [`${bucket}/BT1-001.webp`]: webp("base"),
  });

  const result = await syncCardImages({ ...paths, fetch });

  assert.deepEqual(result.missing, ["BT1-001_P1"]);
});
