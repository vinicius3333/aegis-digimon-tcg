import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

/** Local-only reference assets stay outside public/, so builds cannot ship the footage. */
export function motionReferenceAssets(directory: string): Plugin {
  return {
    name: "local-motion-reference",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/motion-reference", async (request, response, next) => {
        const match = /^\/([\w-]+)\/(manifest\.json|reference\.(?:mp4|webm)|frame-\d{6,}\.jpg)$/.exec(
          (request.url ?? "").split("?")[0]!,
        );
        if (!match || !["GET", "HEAD"].includes(request.method ?? "")) {
          response.statusCode = 404;
          response.end();
          return;
        }
        const file = path.join(directory, match[1]!, match[2]!);
        try {
          const info = await stat(file);
          if (!info.isFile()) {
            response.statusCode = 404;
            response.end();
            return;
          }
          const range = request.headers.range;
          const selected = range ? /^bytes=(\d+)-(\d*)$/.exec(range) : undefined;
          const start = selected ? Number(selected[1]) : 0;
          const end = selected?.[2] ? Math.min(Number(selected[2]), info.size - 1) : info.size - 1;
          if (range && (!selected || start > end || start >= info.size)) {
            response.statusCode = 416;
            response.setHeader("Content-Range", `bytes */${info.size}`);
            response.end();
            return;
          }
          response.statusCode = range ? 206 : 200;
          response.setHeader(
            "Content-Type",
            file.endsWith(".json")
              ? "application/json"
              : file.endsWith(".jpg")
                ? "image/jpeg"
                : file.endsWith(".webm")
                  ? "video/webm"
                  : "video/mp4",
          );
          response.setHeader("Accept-Ranges", "bytes");
          response.setHeader("Cache-Control", "no-cache");
          response.setHeader("Content-Length", end - start + 1);
          if (range) response.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
          if (request.method === "HEAD") {
            response.end();
            return;
          }
          const stream = createReadStream(file, { start, end });
          stream.on("error", () => response.destroy());
          response.on("close", () => stream.destroy());
          stream.pipe(response);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            response.statusCode = 404;
            response.end();
          } else next(error as Error);
        }
      });
    },
  };
}
