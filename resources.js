// Shared reading/printing renderer. Resource content is data, never executable HTML.
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const inline = (text) =>
  escape(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
export function publishedResources(data) {
  return data.resources.filter((resource) => resource.published === true);
}
export function resourceGroups(data) {
  const published = publishedResources(data);
  return data.categories
    .map((category) => ({
      ...category,
      resources: published.filter(
        (resource) => resource.category === category.id,
      ),
    }))
    .filter((category) => category.resources.length);
}
export function resourceContentHTML(blocks, level = 2) {
  return blocks
    .map((block) => {
      if (block.type === "section") {
        const heading = `h${Math.min(level, 6)}`;
        return `<${block.note ? "aside" : "section"} class="${block.note ? "resource-note" : "resource-section"}"><${heading}>${inline(block.title)}</${heading}>${resourceContentHTML(block.blocks, level + 1)}</${block.note ? "aside" : "section"}>`;
      }
      if (block.type === "paragraph") return `<p>${inline(block.text)}</p>`;
      if (block.type === "list")
        return `<ul>${block.items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`;
      if (block.type === "exchange")
        return `<div class="resource-exchange">${block.turns.map((turn) => `<div class="resource-turn ${turn.speaker.toLowerCase()}"><p class="resource-speaker">${escape(turn.speaker)}</p>${turn.paragraphs.map((text) => `<p>“${inline(text)}”</p>`).join("")}</div>`).join("")}</div>`;
      if (block.type === "table")
        return `<table class="resource-table"><thead><tr>${block.headers.map((text) => `<th scope="col">${inline(text)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((text, index) => `<${index ? "td" : 'th scope="row"'}>${inline(text)}</${index ? "td" : "th"}>`).join("")}</tr>`).join("")}</tbody></table>`;
      throw new Error(`Unsupported resource block: ${block.type}`);
    })
    .join("");
}
export function validateResources(data) {
  const errors = [],
    check = (valid, message) => {
      if (!valid) errors.push(message);
    };
  if (
    !data ||
    data.schemaVersion !== 1 ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.resources)
  )
    return ["Resources: invalid manifest"];
  if (
    [...data.categories, ...data.resources].some(
      (item) => !item || typeof item !== "object",
    )
  )
    return ["Resources: invalid record"];
  const text = (value) => typeof value === "string" && value.trim().length > 0;
  const identifiers = (items, label) => {
    check(
      items.every(
        (item) =>
          item &&
          typeof item.id === "string" &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id),
      ),
      `Resources: invalid ${label} ID`,
    );
    check(
      new Set(items.map((item) => item?.id)).size === items.length,
      `Resources: duplicate ${label} ID`,
    );
  };
  identifiers(data.categories, "category");
  identifiers(data.resources, "resource");
  for (const category of data.categories)
    check(text(category.name), "Resources: category name required");
  function blocks(items, depth = 0) {
    if (!Array.isArray(items) || !items.length || depth > 5) {
      errors.push("Resources: invalid/empty content or excessive nesting");
      return;
    }
    for (const block of items) {
      if (!block || typeof block !== "object") {
        errors.push("Resources: invalid content block");
        continue;
      }
      switch (block.type) {
        case "section":
          check(text(block.title), "Resources: section title required");
          check(
            block.note === undefined || typeof block.note === "boolean",
            "Resources: invalid note flag",
          );
          blocks(block.blocks, depth + 1);
          break;
        case "paragraph":
          check(text(block.text), "Resources: paragraph required");
          break;
        case "list":
          check(
            Array.isArray(block.items) &&
              block.items.length &&
              block.items.every(text),
            "Resources: invalid list",
          );
          break;
        case "exchange":
          check(
            Array.isArray(block.turns) &&
              block.turns.length &&
              block.turns.every(
                (turn) =>
                  turn &&
                  ["Salesperson", "Customer"].includes(turn.speaker) &&
                  Array.isArray(turn.paragraphs) &&
                  turn.paragraphs.length &&
                  turn.paragraphs.every(text),
              ),
            "Resources: invalid dialogue",
          );
          break;
        case "table":
          check(
            Array.isArray(block.headers) &&
              block.headers.length &&
              block.headers.every(text) &&
              Array.isArray(block.rows) &&
              block.rows.length &&
              block.rows.every(
                (row) =>
                  Array.isArray(row) &&
                  row.length === block.headers.length &&
                  row.every(text),
              ),
            "Resources: invalid table",
          );
          break;
        default:
          errors.push("Resources: unsupported content block");
      }
    }
  }
  for (const resource of data.resources) {
    check(
      [resource.title, resource.heading, resource.description].every(text),
      `Resources: ${resource.id} missing metadata`,
    );
    check(
      resource.subtitle === undefined || text(resource.subtitle),
      "Resources: invalid subtitle",
    );
    check(
      typeof resource.published === "boolean",
      "Resources: published must be boolean",
    );
    check(
      data.categories.some((category) => category.id === resource.category),
      "Resources: unknown category",
    );
    if (resource.revisedOn !== undefined)
      check(
        /^\d{4}-\d{2}-\d{2}$/.test(resource.revisedOn) &&
          !Number.isNaN(Date.parse(resource.revisedOn)) &&
          new Date(resource.revisedOn).toISOString().slice(0, 10) ===
            resource.revisedOn,
        "Resources: invalid revision date",
      );
    blocks(resource.content);
  }
  return errors;
}
