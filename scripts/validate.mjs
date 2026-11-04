import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { evidenceReady } from "../lib.js";

export function validate(catalog, features) {
  const errors = [];
  const assert = (value, message) => {
    if (!value) errors.push(message);
  };
  const unique = (items, name) =>
    assert(
      new Set(items.map((x) => x.id)).size === items.length,
      `${name}: duplicate IDs`,
    );
  const iso = (d) =>
    typeof d === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    !Number.isNaN(Date.parse(d)) &&
    new Date(d).toISOString().startsWith(d) &&
    d <= new Date().toISOString().slice(0, 10);
  const url = (value) => {
    try {
      return (
        new URL(value).protocol === "https:" &&
        !new URL(value).username &&
        !new URL(value).password
      );
    } catch {
      return false;
    }
  };
  const official = (value) => {
    try {
      const host = new URL(value).hostname;
      return ["toyota.com", "chevrolet.com", "gm.com", "vw.com"].some(
        (h) => host === h || host.endsWith(`.${h}`),
      );
    } catch {
      return false;
    }
  };
  assert(catalog.schemaVersion === 1, "Unsupported catalog schema");
  assert(catalog.market === "US", "Catalog must target US retail vehicles");
  unique(catalog.brands, "Brands");
  unique(catalog.fields, "Fields");
  unique(catalog.vehicles, "Vehicles");
  unique(features, "Features");
  const brands = new Set(catalog.brands.map((b) => b.id));
  const fields = new Set(catalog.fields.map((f) => f.id));
  const featureIds = new Set(features.map((f) => f.id));
  for (const b of catalog.brands)
    assert(url(b.sourceUrl), `${b.id}: HTTPS manufacturer URL required`);
  for (const asset of Object.values(catalog.branding || {}))
    assert(
      asset === null ||
        (/^\.\/assets\/[\w./-]+$/.test(asset) && !asset.includes("..")),
      "Brand artwork must use a safe local assets path",
    );
  for (const v of catalog.vehicles) {
    const prefix = `${v.id}: `;
    assert(/^[a-z0-9-]+$/.test(v.id), prefix + "unsafe ID");
    assert(brands.has(v.brand), prefix + "unknown brand");
    assert(catalog.years.includes(v.year), prefix + "unsupported year");
    assert(
      ["verified", "awaiting-verification"].includes(v.status),
      prefix + "invalid status",
    );
    assert(v.model && v.category, prefix + "model and category required");
    unique(v.sources, prefix + "sources");
    unique(v.trims, prefix + "trims");
    unique(v.packages, prefix + "packages");
    if (v.status === "verified")
      assert(
        iso(v.verifiedAt) && v.trims.length > 0,
        prefix + "verified guide requires review date and trims",
      );
    else
      assert(
        v.verifiedAt === null,
        prefix + "pending guide cannot have a verification date",
      );
    const trimIds = new Set(v.trims.map((t) => t.id));
    for (const s of v.sources) {
      assert(
        url(s.url) && official(s.url),
        prefix + `${s.id}: official HTTPS source required`,
      );
      assert(
        ["verified", "research-target"].includes(s.kind),
        prefix + "invalid source kind",
      );
      if (s.kind === "verified")
        assert(
          iso(s.checkedAt) && s.modelYear === v.year && s.title,
          prefix + `${s.id}: reviewed, model-year-specific source required`,
        );
      else
        assert(
          s.checkedAt === null,
          prefix + "unreviewed source cannot have review date",
        );
      if (s.delivery === "user-upload")
        assert(
          s.fileName &&
            /^[a-f0-9]{64}$/.test(s.sha256 || "") &&
            s.pageCount > 0,
          prefix + "supplied PDF needs filename, SHA-256 and page count",
        );
    }
    for (const t of v.trims) {
      assert(
        /^[a-z0-9-]+$/.test(t.id) && t.name,
        prefix + "trim needs safe ID and name",
      );
      assert(
        evidenceReady(v, t.sourceIds),
        prefix + `${t.name}: trim structure needs reviewed sources`,
      );
      for (const [field, c] of Object.entries(t.equipment || {})) {
        assert(fields.has(field), prefix + `unknown equipment field ${field}`);
        assert(
          ["standard", "optional", "unavailable", "unverified"].includes(
            c.status,
          ),
          prefix + "invalid equipment state",
        );
        if (c.status === "unverified")
          assert(
            !c.value && !c.sourceIds?.length,
            prefix + "unverified equipment cannot contain claims",
          );
        else {
          assert(
            evidenceReady(v, c.sourceIds),
            prefix + `${t.name}/${field}: missing evidence`,
          );
          assert(
            typeof c.value === "string" && c.value.length > 0,
            prefix + `${field}: verified equipment requires a value`,
          );
          if (c.status === "optional")
            assert(
              c.conditions,
              prefix +
                `${field}: optional equipment needs availability/package conditions`,
            );
        }
        for (const f of c.featureIds || [])
          assert(featureIds.has(f), prefix + `unknown glossary feature ${f}`);
      }
    }
    for (const p of v.packages) {
      assert(
        p.name && p.description && p.conditions && p.trimIds?.length,
        prefix + "package needs name, contents, conditions and eligible trims",
      );
      assert(
        p.trimIds?.every((id) => trimIds.has(id)),
        prefix + "package references unknown trim",
      );
      assert(
        evidenceReady(v, p.sourceIds),
        prefix + "package missing evidence",
      );
      if (p.contentsStatus === "unverified")
        assert(
          !p.contents?.length,
          prefix + "unverified package cannot claim itemized contents",
        );
    }
    unique(v.optionalEquipment || [], prefix + "optional equipment");
    for (const o of v.optionalEquipment || []) {
      assert(
        o.status === "optional" && o.name && o.description && o.conditions,
        prefix + "optional item needs explicit status and conditions",
      );
      assert(
        o.trimIds?.length && o.trimIds.every((id) => trimIds.has(id)),
        prefix + "optional item references unknown configurations",
      );
      assert(
        evidenceReady(v, o.sourceIds),
        prefix + "optional item missing evidence",
      );
    }
    if (v.quickReference) {
      const q = v.quickReference;
      const covered = q.groups.flatMap((g) => g.trimIds);
      assert(
        covered.length === trimIds.size &&
          new Set(covered).size === trimIds.size &&
          covered.every((id) => trimIds.has(id)),
        prefix + "print groups must cover each configuration exactly once",
      );
      for (const g of q.groups)
        assert(
          g.label &&
            g.fieldIds.length &&
            g.fieldIds.every((id) => fields.has(id)),
          prefix + "print group references unknown equipment",
        );
      assert(
        q.commonFieldIds.every((id) => fields.has(id)) &&
          q.powertrainTrimIds.every((id) => trimIds.has(id)),
        prefix + "print reference contains unknown field/configuration",
      );
      for (const note of q.caveats)
        assert(
          note.text && evidenceReady(v, note.sourceIds),
          prefix + "print caveat missing evidence",
        );
    }
    for (const u of v.upgrades) {
      assert(
        v.trims.some((t) => t.name === u.from) &&
          v.trims.some((t) => t.name === u.to),
        prefix + "upgrade references unknown trim",
      );
      assert(u.gains?.length, prefix + "upgrade needs verified gains");
      for (const g of u.gains || [])
        assert(
          g.text && evidenceReady(v, g.sourceIds),
          prefix + "upgrade gain missing evidence",
        );
    }
  }
  for (const f of features) {
    assert(brands.has(f.brand), `${f.id}: unknown feature brand`);
    assert(
      url(f.sourceUrl) && official(f.sourceUrl),
      `${f.id}: official HTTPS reference required`,
    );
    assert(
      f.name && f.how && f.value && f.limitations,
      `${f.id}: incomplete feature explanation`,
    );
    assert(
      f.verifiedAt === null || iso(f.verifiedAt),
      `${f.id}: invalid review date`,
    );
  }
  return errors;
}
export async function validateFiles() {
  const [catalog, features] = await Promise.all(
    ["catalog", "features"].map((f) =>
      readFile(new URL(`../data/${f}.json`, import.meta.url), "utf8").then(
        JSON.parse,
      ),
    ),
  );
  const errors = validate(catalog, features);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    `Validated ${catalog.vehicles.length} model guides, ${catalog.fields.length} equipment fields, and ${features.length} explanations. ${catalog.vehicles.filter((v) => v.status === "verified").length} guides source-verified.`,
  );
  return { catalog, features };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateFiles().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
