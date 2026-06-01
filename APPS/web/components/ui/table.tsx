"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Loader2, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

// ============================================================================
// PRIMITIVE TABLE COMPONENTS
// ============================================================================

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto rounded-xl border border-zinc-900 bg-zinc-950 shadow-sm">
    <table className={cn("w-full caption-bottom text-xs", className)} {...props} />
  </div>
);

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("border-b border-zinc-900 bg-zinc-950/50", className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-zinc-900", className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("transition-colors hover:bg-zinc-900/50 data-[state=selected]:bg-zinc-900", className)} {...props} />
);

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("p-4 align-middle text-zinc-400 font-mono", className)} {...props} />
);

// ============================================================================
// ENTERPRISE DATA TABLE ENGINE
// ============================================================================

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
}

export function DataTable<TData, TValue>({ columns, data, loading }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (loading) return <TableSkeleton columns={columns.length} />;

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="h-12 px-4 text-left font-mono text-[10px] uppercase text-zinc-500">
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">No records found.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

const TableSkeleton = ({ columns }: { columns: number }) => (
  <div className="w-full animate-pulse space-y-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-12 w-full rounded bg-zinc-900" />
    ))}
  </div>
);