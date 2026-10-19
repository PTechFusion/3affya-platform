// ESLint rule: physical Tailwind utilities are banned; use logical ones so RTL works without forks.
// ml- -> ms-, mr- -> me-, pl- -> ps-, pr- -> pe-, left- -> start-, right- -> end-, text-left -> text-start, text-right -> text-end,
// rounded-l- -> rounded-s-, rounded-r- -> rounded-e-, border-l- -> border-s-, border-r- -> border-e-.
const PHYSICAL = /(^|[\s"'`:])(-?(ml|mr|pl|pr|left|right|inset-x-left|inset-x-right|rounded-[lr]|border-[lr]|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-[\w./[\]%-]+|text-left|text-right|float-left|float-right|clear-left|clear-right)(?=$|[\s"'`])/;

const fixes = [
  [/\bml-/g, "ms-"], [/\bmr-/g, "me-"], [/\bpl-/g, "ps-"], [/\bpr-/g, "pe-"],
  [/\bleft-/g, "start-"], [/\bright-/g, "end-"], [/\btext-left\b/g, "text-start"], [/\btext-right\b/g, "text-end"],
  [/\brounded-l-/g, "rounded-s-"], [/\brounded-r-/g, "rounded-e-"], [/\bborder-l-/g, "border-s-"], [/\bborder-r-/g, "border-e-"],
];

function check(context, node, value) {
  if (typeof value !== "string") return;
  const m = PHYSICAL.exec(value);
  if (!m) return;
  context.report({
    node,
    message: `Physical utility "${m[2]}" is not allowed. Use the logical equivalent (ms-, me-, ps-, pe-, start-, end-, text-start, text-end).`,
    fix(fixer) {
      let out = value;
      for (const [re, to] of fixes) out = out.replace(re, to);
      if (node.type === "Literal") return fixer.replaceText(node, JSON.stringify(out));
      if (node.type === "TemplateElement") return null;
      return null;
    },
  });
}

const plugin = {
  rules: {
    "no-physical-utilities": {
      meta: { type: "problem", fixable: "code", docs: { description: "Ban physical Tailwind utilities; logical CSS only (3affya rule)." } },
      create(context) {
        return {
          Literal(node) { check(context, node, node.value); },
          TemplateElement(node) { check(context, node, node.value.cooked); },
        };
      },
    },
  },
};

export default plugin;
