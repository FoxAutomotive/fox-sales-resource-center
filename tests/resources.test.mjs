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
test("Resources validates and retains the salesperson phone training without manager-only coaching", () => {
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
  assert.ok(!all.some((b) => /Manager/.test(b.title || "")));
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
  assert.equal(prose.length, 168);
  // Fingerprint of all approved prose, in order, separately checked against the supplied text.
  assert.equal(
    createHash("sha256").update(JSON.stringify(prose)).digest("hex"),
    "6bfb4d609a59ee6c6071bdd925c230a113f36dafa0fcb729df0ed48fa0473eb6",
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
    [
      ["FOX AUTOMOTIVE SALES PLAYBOOK", 10],
      ["Sales Training", 1],
    ],
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
      ["FOX AUTOMOTIVE SALES PLAYBOOK", 10],
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
  assert.ok(!training.includes("Manager Phone Call Evaluation"));
});

// Fingerprints of the ten original, unmodified Markdown files from the supplied ZIP.
test("all approved quick-guide source bytes and ordering are preserved", () => {
  const guides = resourceGroups(data).find(
    (g) => g.id === "sales-playbook",
  ).resources;
  assert.deepEqual(
    guides.map((r) => r.moduleNumber),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.deepEqual(
    guides.map((r) =>
      createHash("sha256").update(r.content[0].text).digest("hex"),
    ),
    [
      "1b6c7ed8f0448556d9dc27b3dcc3a2298408077a655796299ad18752f7d3235a",
      "a41d73955c31a388f749d748e7da931dc5f676ea716612efcfe643dbd1dbc823",
      "fbb3f9dee3e36bc825f5fa528f3c50425423693047cf58ef235ab28e042b6f86",
      "18da1d63595f7aff3c0bba125f8182c8a521889d4ca93bb20bf2c5c783c40461",
      "dc71527a053d031f8ff970148e91cbfbdcabee92b3b0716ecc31451550cee170",
      "36004c6b045b55befe13e166b8bee840f15665efdbd506c5e4926140fae4bacc",
      "ced752bb4e9b21fbf76c50bed644e12dd3f7f05f9c65fcdb36b9740d5cb8e225",
      "98d3374082b476241dc60a79d8a6c453d6c856c53ecc9d4f859ad204d59807eb",
      "a1092bb17dbfff2b2c4d9903e55e2b1fa0e355a1ffbfa3e82563cc598412f452",
      "d3142a8e1d0bd8f73134c28ff9f836b1ad633f034e371c49d03c12cc6ed980eb",
    ],
  );
  for (const guide of guides) {
    const html = resourceContentHTML(guide.content);
    assert.ok(html.includes("<h2>"));
    assert.ok(html.includes("<em>"));
    assert.ok(!html.includes("## "));
    assert.equal(guide.fullTraining, null); // Original Academy source has not been supplied.
  }
});
