"use client";

import { Download, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { exportTableCsvAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** Builds the CSV on the server and hands it to the browser as a download. */
export function ExportCsvButton({ table, q }: { table: string; q?: string }) {
  const [pending, startTransition] = useTransition();
  const download = () =>
    startTransition(async () => {
      const result = await exportTableCsvAction(table, q);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 rounded-lg"
      onClick={download}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
      Export CSV
    </Button>
  );
}
