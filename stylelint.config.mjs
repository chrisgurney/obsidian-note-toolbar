/** @type {import('stylelint').Config} */
export default {
  // extends: ["stylelint-config-standard"],
  ignoreFiles: [ 'styles.css' ],
  rules: {
    // "comment-empty-line-before": null,
    // "declaration-empty-line-before": null,
    // "import-notation": null,
    // "rule-empty-line-before": null,
    // "declaration-block-no-redundant-longhand-properties": null
    "declaration-no-important": true,
    "no-duplicate-selectors": true,
    "selector-pseudo-class-disallowed-list": ["has"],
  }
};