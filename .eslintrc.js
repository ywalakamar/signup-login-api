module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true,
  },
  extends: ["airbnb-base"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  rules: {
    "comma-dangle": ["error", "never"],
    "no-console": "off",
    "no-param-reassign": ["error", { props: false }],
    radix: "off",
    "no-param-reassign": 0,
  },
};
