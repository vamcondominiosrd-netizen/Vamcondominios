import { ReactNode } from "react";

type VAMTableProps = {
  children: ReactNode;
  minWidth?: string;
};

export default function VAMTable({
  children,
  minWidth = "900px",
}: VAMTableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-left text-sm"
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function VAMTh({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-3 font-semibold text-slate-700">
      {children}
    </th>
  );
}

export function VAMTd({ children }: { children: ReactNode }) {
  return (
    <td className="px-5 py-3 text-slate-700">
      {children}
    </td>
  );
}