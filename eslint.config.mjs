import next from "eslint-config-next";

const featureNames = ["account", "trade", "preview", "learn", "history", "wallet", "settings"];

const config = [
  ...next,
  { ignores: [".next/**", "node_modules/**", "index.html", "legacy/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Features talk to each other only through their index.ts (PRD 19).
      "no-restricted-imports": [
        "error",
        {
          patterns: featureNames.map((f) => ({
            group: [`@/features/${f}/*`],
            message: `Import from "@/features/${f}" (its index.ts), not its internals.`,
          })),
        },
      ],
    },
  },
  {
    files: ["src/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["react", "react-dom", "@/features/*", "@/components/*"], message: "services/ is pure logic, no React." }] },
      ],
    },
  },
];

export default config;
