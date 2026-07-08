import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "fr",
  locales: ["fr"],
  catalogs: [
    {
      path: "<rootDir>/src/lib/lingui/locales/{locale}/messages",
      include: ["src"],
    },
  ],
});
