export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["temporal-polyfill/global"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: { parser: { syntax: "typescript" }, target: "es2022" },
        module: { type: "es6" },
      },
    ],
  },
  moduleFileExtensions: ["js", "mjs", "ts", "json"],
  // only needed if your TS imports use ".js" extensions:
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
};
