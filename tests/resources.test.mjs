import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  resourceGroups,
  publishedResources,
  resourceContentHTML,
  validateResources,
} from "../resources.js";
const data = JSON.parse(
  readFileSync(new URL("../data/resources.json", import.meta.url)),
);
const walk = (blocks) =>
  blocks.flatMap((block) => [
    block,
    ...(block.blocks ? walk(block.blocks) : []),
  ]);
test("Resources validates and retains the complete approved phone training", () => {
  assert.deepEqual(validateResources(data), []);
  const training = publishedResources(data)[0];
  assert.equal(
    training.title,
    "Inbound Sales Calls — Ask. Listen. Adjust. Appoint.",
  );
  assert.deepEqual(
    training.content.map((s) => s.title),
    [
      "Part One: Understanding the Framework",
      "Part Two: The Inbound Phone Script",
      "Part Three: Manager Coaching",
      "Final Reminder",
    ],
  );
  const all = walk(training.content);
  assert.equal(
    all.filter((b) => /^Step [1-8] —/.test(b.title || "")).length,
    8,
  );
  assert.equal(
    all.filter((b) => /^Scenario [A-D] —/.test(b.title || "")).length,
    4,
  );
  assert.equal(all.find((b) => b.type === "table").rows.length, 12);
  const prose = all.flatMap((b) =>
    b.type === "paragraph"
      ? [b.text]
      : b.type === "list"
        ? b.items
        : b.type === "table"
          ? [...b.headers, ...b.rows.flat()]
          : b.type === "exchange"
            ? b.turns.flatMap((t) => t.paragraphs)
            : [],
  );
  assert.equal(prose.length, 221);
  // Fingerprint of all approved prose, in order, separately checked against the supplied text.
  assert.equal(
    createHash("sha256").update(JSON.stringify(prose)).digest("hex"),
    "9df8332e58b19f9e182c1b637238b2a12902c6dec1f139b8dc17d61fffec834c",
  );
  const html = resourceContentHTML(training.content);
  for (const principle of [
    "Don't use questions to avoid answering the customer.",
    "Do not promise equity or waived payments",
    "A conditional appointment is not a confirmed appointment",
    "Don't manufacture urgency.",
    "Record the information in the CRM.",
  ])
    assert.ok(html.includes(principle.replaceAll("'", "&#39;")), principle);
});
test("Only published resources form category listings; future categories require no layout changes", () => {
  const next = structuredClone(data),
    template = next.resources[0];
  next.resources.push({ ...template, id: "draft", published: false });
  assert.deepEqual(
    resourceGroups(next).map((g) => [g.name, g.resources.length]),
    [["Sales Training", 1]],
  );
  next.resources.push({
    ...template,
    id: "check-request",
    category: "forms-documents",
    title: "Check request",
  });
  assert.deepEqual(validateResources(next), []);
  assert.deepEqual(
    resourceGroups(next).map((g) => [g.name, g.resources.length]),
    [
      ["Sales Training", 1],
      ["Forms & Documents", 1],
    ],
  );
  assert.equal(
    publishedResources(next).some((r) => r.id === "draft"),
    false,
  );
});
test("Resource validation rejects broken metadata, invalid revision dates and malformed content", () => {
  for (const mutate of [
    (d) => d.resources.push(d.resources[0]),
    (d) => delete d.resources[0].id,
    (d) => (d.resources[0].category = "missing"),
    (d) => (d.resources[0].published = "true"),
    (d) => (d.resources[0].revisedOn = "2026-02-30"),
    (d) => (d.resources[0].content = [{ type: "html", text: "bad" }]),
    (d) =>
      (d.resources[0].content = [
        {
          type: "exchange",
          turns: [{ speaker: "Unknown", paragraphs: ["Hi"] }],
        },
      ]),
    (d) =>
      (d.resources[0].content = [
        { type: "table", headers: ["One"], rows: [["One", "Two"]] },
      ]),
  ]) {
    const invalid = structuredClone(data);
    mutate(invalid);
    assert.ok(validateResources(invalid).length);
  }
  assert.ok(validateResources(null).length);
  assert.ok(validateResources({ ...data, resources: [null] }).length);
  const revised = structuredClone(data);
  revised.resources[0].revisedOn = "2026-11-09";
  assert.deepEqual(validateResources(revised), []);
});
test("Resource rendering escapes content and keeps speaker labels, notes and accessible tables", () => {
  const html = resourceContentHTML([
    { type: "paragraph", text: '**Important** <img src=x onerror="bad()">' },
  ]);
  assert.match(html, /<strong>Important<\/strong>/);
  assert.ok(!html.includes("<img"));
  const training = resourceContentHTML(data.resources[0].content);
  assert.match(training, /class="resource-turn customer"/);
  assert.match(training, /<aside class="resource-note">/);
  assert.match(training, /<th scope="row">Greeting<\/th>/);
});
