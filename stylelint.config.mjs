/** @type {import('stylelint').Config} */
export default {
  // extends: ["stylelint-config-standard"],
  rules: {
    // "comment-empty-line-before": null,
    // "declaration-empty-line-before": null,
    // "import-notation": null,
    // "rule-empty-line-before": null,
    // "declaration-block-no-redundant-longhand-properties": null
    "selector-pseudo-class-disallowed-list": ["has"],
    "declaration-no-important": true
  }
};