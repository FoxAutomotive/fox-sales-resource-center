// Synthetic data for automated tests only. Never copied into the published site.
export function fixtureVehicle({
  id = "fixture-a",
  brand = "toyota",
  model = "Fixture A",
} = {}) {
  return {
    id,
    brand,
    model,
    year: 2026,
    category: "SUV",
    summary: "Synthetic browser-test fixture; not vehicle specifications.",
    status: "verified",
    verifiedAt: "2026-11-03",
    sources: [
      {
        id: "test-source",
        title: "Synthetic evidence fixture",
        url: "https://www.toyota.com/test-fixture",
        kind: "verified",
        modelYear: 2026,
        checkedAt: "2026-11-03",
      },
    ],
    trims: [
      {
        id: "base",
        name: "Fixture Base",
        configuration: "Test configuration",
        sourceIds: ["test-source"],
        equipment: {
          engine: {
            status: "standard",
            value: "Synthetic engine A",
            sourceIds: ["test-source"],
          },
          heatedSeats: {
            status: "optional",
            value: "Synthetic heated seats",
            conditions: "Requires synthetic package",
            sourceIds: ["test-source"],
          },
          audio: {
            status: "standard",
            value: "Synthetic basic audio",
            sourceIds: ["test-source"],
          },
        },
      },
      {
        id: "plus",
        name: "Fixture Plus",
        configuration: "Test configuration",
        sourceIds: ["test-source"],
        equipment: {
          engine: {
            status: "standard",
            value: "Synthetic engine A",
            sourceIds: ["test-source"],
          },
          heatedSeats: {
            status: "standard",
            value: "Synthetic heated seats",
            sourceIds: ["test-source"],
          },
          audio: {
            status: "standard",
            value: "Synthetic upgraded audio",
            sourceIds: ["test-source"],
          },
          ventilatedSeats: {
            status: "unavailable",
            value: "Not offered",
            sourceIds: ["test-source"],
          },
        },
      },
    ],
    packages: [
      {
        id: "test-package",
        name: "Synthetic comfort package",
        description: "Synthetic heated seats",
        conditions: "Test only",
        trimIds: ["base"],
        sourceIds: ["test-source"],
      },
    ],
    upgrades: [
      {
        from: "Fixture Base",
        to: "Fixture Plus",
        gains: [
          { text: "Synthetic audio upgrade", sourceIds: ["test-source"] },
        ],
      },
    ],
    notes: ["Test fixture only."],
  };
}
