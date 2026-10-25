// Generates TypeScript types from the OpenAPI schema of every built backend that is running.
// Run with the backends up: npm run api:types. The generated files are committed, so a build never needs a backend.
import { readFileSync, writeFileSync } from "node:fs";
import openapiTS, { astToString } from "openapi-typescript";

const projects = JSON.parse(readFileSync(new URL("../src/lab/projects.json", import.meta.url), "utf-8"));

for (const project of projects.filter((candidate) => candidate.status === "built")) {
  const baseUrl = process.env[`VITE_${project.id.toUpperCase()}_URL`] ?? `http://localhost:${project.port}`;
  const schemaUrl = new URL("/openapi.json", baseUrl);
  try {
    const types = astToString(await openapiTS(schemaUrl));
    const header =
      "/** Generated from the backend's OpenAPI schema by scripts/generate-api-types.mjs. Do not edit. */\n";
    writeFileSync(new URL(`../src/api/generated/${project.id}.ts`, import.meta.url), header + types);
    console.log(`${project.name}: types written from ${schemaUrl}`);
  } catch (error) {
    console.error(`${project.name}: could not read ${schemaUrl} (${error.message}). Kept the committed types.`);
    process.exitCode = 1;
  }
}
