// makefun-x-reposts-02 entry program.
// Validates POSTS.json at the repository root and copies it to /output.
// The house reads the posts themselves on X; this program only has to
// deliver the list, byte for byte, after checking its shape.

import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(repoRoot, "POSTS.json");
const outputDir = "/output";
const outputPath = join(outputDir, "POSTS.json");

// An X post address: https://x.com/<handle>/status/<digits>, or the same
// on twitter.com, optionally with www. or mobile. in front of either host.
const POST_URL =
  /^https:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/[A-Za-z0-9_]{1,15}\/status\/\d+([?#].*)?$/;

function fail(message: string): never {
  console.error(`POSTS.json check failed: ${message}`);
  process.exit(1);
}

function validate(raw: string): void {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    fail(`not valid JSON (${(err as Error).message})`);
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    fail("top level must be a JSON object");
  }
  const posts = (data as { posts?: unknown }).posts;
  if (!Array.isArray(posts)) {
    fail('the object must hold a "posts" list');
  }
  if (posts.length < 1 || posts.length > 15) {
    fail(`the list must name 1 to 15 posts, it names ${posts.length}`);
  }
  posts.forEach((item, i) => {
    if (typeof item !== "string" || !POST_URL.test(item)) {
      fail(`item ${i + 1} is not an X post address: ${String(item)}`);
    }
  });
  // The house reads a post named twice only once, in any form of its
  // address — catch that here instead of silently wasting a list slot.
  const ids = posts.map((item) => (item as string).match(/\/status\/(\d+)/)![1]);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup !== undefined) {
    fail(`status ${dup} is named more than once`);
  }
}

const raw = readFileSync(sourcePath, "utf8");
validate(raw);

mkdirSync(outputDir, { recursive: true });
copyFileSync(sourcePath, outputPath);

// Read the copy back: what the house grades must be exactly what was
// validated, so a short or altered write fails here rather than there.
const written = readFileSync(outputPath, "utf8");
if (written !== raw) {
  fail("the copy in /output does not match the repository POSTS.json");
}
const count = (JSON.parse(raw) as { posts: string[] }).posts.length;
console.log(`copied POSTS.json (${raw.length} bytes, ${count} posts) to ${outputPath}`);
