module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['airbnb-base', 'plugin:solid/recommended'],
  plugins: ['solid'],
  overrides: [
  ],
  settings: {
    "import/resolver": {
      "node": {
        "extensions": [".js", ".jsx"]
      }
    },
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    "camelcase": 0,
    "no-plusplus": 0,
    "max-len": [
      "error",
      120,
      2,
      {
        "ignoreUrls": true,
        "ignoreComments": false,
        "ignoreStrings": true,
        "ignoreTemplateLiterals": true
      }
    ],
  },
};
