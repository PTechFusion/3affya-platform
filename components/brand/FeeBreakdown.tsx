// The three-line price breakdown (rule P1): doctor fee, platform fee, card processing, then the total. Labels and amounts arrive
// already translated and formatted (lib/format, lib/fees). The fees page shows it as a worked example; checkout, confirmation
// and receipts can render the same rows.
export type FeeBreakdownLine = { label: string; detail?: string; amount: string };

export function FeeBreakdown({
  caption,
  lines,
  total,
}: {
  caption?: string;
  lines: FeeBreakdownLine[];
  total: { label: string; amount: string };
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
      <table className="w-full border-collapse">
        {caption ? <caption className="mb-2 text-start text-sm font-semibold text-ink-500">{caption}</caption> : null}
        <tbody>
          {lines.map((line) => (
            <tr key={line.label} className="border-b border-sand-200">
              <th scope="row" className="py-3 pe-4 text-start align-top font-normal text-ink-900">
                {line.label}
                {line.detail ? <span className="block text-sm text-ink-500">{line.detail}</span> : null}
              </th>
              <td className="tabular whitespace-nowrap py-3 text-end align-top text-ink-900">{line.amount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="pe-4 pt-3 text-start font-bold text-sea-900">
              {total.label}
            </th>
            <td className="tabular whitespace-nowrap pt-3 text-end font-bold text-sea-900">{total.amount}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
