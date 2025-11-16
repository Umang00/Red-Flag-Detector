"use client";

import { useTheme } from "next-themes";
import { parse, unparse } from "papaparse";
import { memo, useEffect, useMemo, useState } from "react";
import DataGrid from "react-data-grid";
import { cn } from "@/lib/utils";

// CSS is included in react-data-grid v6, no separate import needed

type SheetEditorProps = {
  content: string;
  saveContent: (content: string, isCurrentVersion: boolean) => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  status: string;
};

const MIN_ROWS = 50;
const MIN_COLS = 26;

const PureSpreadsheetEditor = ({ content, saveContent }: SheetEditorProps) => {
  const { resolvedTheme } = useTheme();

  const parseData = useMemo(() => {
    if (!content) {
      return new Array(MIN_ROWS).fill(new Array(MIN_COLS).fill(""));
    }
    const result = parse<string[]>(content, { skipEmptyLines: true });

    const paddedData = result.data.map((row) => {
      const paddedRow = [...row];
      while (paddedRow.length < MIN_COLS) {
        paddedRow.push("");
      }
      return paddedRow;
    });

    while (paddedData.length < MIN_ROWS) {
      paddedData.push(new Array(MIN_COLS).fill(""));
    }

    return paddedData;
  }, [content]);

  const columns = useMemo(() => {
    const rowNumberColumn = {
      key: "rowNumber",
      name: "",
      frozen: true,
      width: 50,
      renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
      cellClass: "border-t border-r dark:bg-zinc-950 dark:text-zinc-50",
      headerCellClass: "border-t border-r dark:bg-zinc-900 dark:text-zinc-50",
    };

    const dataColumns = Array.from({ length: MIN_COLS }, (_, i) => ({
      key: i.toString(),
      name: String.fromCharCode(65 + i),
      editable: true,
      width: 120,
      cellClass: cn("border-t dark:bg-zinc-950 dark:text-zinc-50", {
        "border-l": i !== 0,
      }),
      headerCellClass: cn("border-t dark:bg-zinc-900 dark:text-zinc-50", {
        "border-l": i !== 0,
      }),
    }));

    return [rowNumberColumn, ...dataColumns];
  }, []);

  const initialRows = useMemo(() => {
    return parseData.map((row, rowIndex) => {
      const rowData: any = {
        id: rowIndex,
        rowNumber: rowIndex + 1,
      };

      columns.slice(1).forEach((col, colIndex) => {
        rowData[col.key] = row[colIndex] || "";
      });

      return rowData;
    });
  }, [parseData, columns]);

  const [localRows, setLocalRows] = useState(initialRows);

  useEffect(() => {
    setLocalRows(initialRows);
  }, [initialRows]);

  const generateCsv = (data: any[][]) => {
    return unparse(data);
  };

  const handleGridRowsUpdated = ({ fromRow, toRow, updated }: any) => {
    const newRows = localRows.slice();

    for (let i = fromRow; i <= toRow; i++) {
      newRows[i] = { ...newRows[i], ...updated };
    }

    setLocalRows(newRows);

    const updatedData = newRows.map((row) => {
      return columns.slice(1).map((col) => row[col.key] || "");
    });

    const newCsvContent = generateCsv(updatedData);
    saveContent(newCsvContent, true);
  };

  return (
    <div className={resolvedTheme === "dark" ? "rdg-dark" : "rdg-light"}>
      <DataGrid
        columns={columns}
        enableCellSelect={true}
        minHeight={500}
        onGridRowsUpdated={handleGridRowsUpdated}
        rowGetter={(i: number) => localRows[i]}
        rowsCount={localRows.length}
      />
    </div>
  );
};

function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
  return (
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === "streaming" && nextProps.status === "streaming") &&
    prevProps.content === nextProps.content &&
    prevProps.saveContent === nextProps.saveContent
  );
}

export const SpreadsheetEditor = memo(PureSpreadsheetEditor, areEqual);
