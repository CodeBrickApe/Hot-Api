module.exports = {
  test: {
    globals: true,
    coverage: {
      reporter: ["text", "json-summary"],
      exclude: ["public/**", "tests/**", "coverage/**"],
    },
  },
};
