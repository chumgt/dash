module.exports = {
  "environmentVariables": {
    "TS_NODE_PROJECT": "./test/tsconfig.json"
  },
  "extensions": [
    "js", "ts"
  ],
  "files": [
    "./test/**/*.spec.ts"
  ],
  "require": [
    "ts-node/register"
  ]
}
