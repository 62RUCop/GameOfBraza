"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCampaign } from "@/actions/gm";

export function CreateCampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) { setError("Введите название"); return; }
    setError(null);
    startTransition(async () => {
      const result = await createCampaign(name.trim());
      if ("error" in result) {
        setError(result.error);
      } else {
        setName("");
        router.push(`/gm/${result.id}`);
      }
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-semibold">Создать кампанию</p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder="Название кампании"
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          className="flex-1 rounded border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={submit}
          disabled={isPending}
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "…" : "Создать"}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
