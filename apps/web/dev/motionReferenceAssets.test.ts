import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "vite";
import { expect, it } from "vitest";
import { motionReferenceAssets } from "./motionReferenceAssets";

it("serves only reference assets and honors seek ranges and HEAD without exposing other files", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "aegis-motion-assets-"));
  const server = await createServer({
    configFile: false,
    root: directory,
    publicDir: false,
    appType: "custom",
    plugins: [motionReferenceAssets(directory)],
    server: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  try {
    await mkdir(path.join(directory, "fixture"));
    await writeFile(path.join(directory, "fixture/reference.mp4"), "0123456789");
    await writeFile(path.join(directory, "fixture/private.txt"), "not a reference");
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === "string") throw new Error("Missing HTTP listener");
    const base = `http://127.0.0.1:${address.port}/motion-reference/fixture/`;
    const range = await fetch(`${base}reference.mp4`, { headers: { Range: "bytes=2-5" } });
    expect(range.status).toBe(206);
    expect(range.headers.get("Content-Range")).toBe("bytes 2-5/10");
    expect(await range.text()).toBe("2345");
    const head = await fetch(`${base}reference.mp4`, { method: "HEAD" });
    expect(head.headers.get("Content-Length")).toBe("10");
    expect(await head.text()).toBe("");
    const invalid = await fetch(`${base}reference.mp4`, { headers: { Range: "bytes=20-" } });
    expect(invalid.status).toBe(416);
    expect(invalid.headers.get("Content-Range")).toBe("bytes */10");
    expect((await fetch(`${base}private.txt`)).status).toBe(404);
    expect((await fetch(`${base}frame-000000.jpg`)).status).toBe(404);
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
