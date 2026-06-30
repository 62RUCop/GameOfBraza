"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@gob/ui";
import { exportToGoBrothers } from "@/lib/gob-brothers-compat";
import { importCharacterFromJSON } from "@/actions/transfer";
import type { FullCharacter } from "./character-sheet";
import type { RuleConfig } from "@gob/rules";

interface Props {
  character: FullCharacter;
  ruleConfig: RuleConfig;
}

type Section = "export" | "import";

export function TransferModal({ character, ruleConfig }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("export");

  // Export state
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Import state
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    const json = JSON.stringify(exportToGoBrothers(character, ruleConfig), null, 2);
    setExportJson(json);
    setOpen(true);
  }

  function handleCopy() {
    if (!exportJson) return;
    navigator.clipboard.writeText(exportJson).then(
      () => { setCopied(true); setTimeout(() => { setCopied(false); }, 2000); },
      () => { /* clipboard unavailable */ },
    );
  }

  function handleDownload() {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${character.name.replace(/[^\wЀ-ӿ]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      setImportText(typeof result === "string" ? result : "");
      setImportError(null);
      setImportedId(null);
    };
    reader.readAsText(file, "utf-8");
  }

  function handleImport() {
    setImportError(null);
    setImportedId(null);
    startTransition(async () => {
      const result = await importCharacterFromJSON(importText);
      if ("error" in result) {
        setImportError(result.error);
      } else {
        setImportedId(result.characterId);
      }
    });
  }

  function handleClose() {
    setOpen(false);
    setSection("export");
    setImportText("");
    setImportError(null);
    setImportedId(null);
    setCopied(false);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-sm text-muted-foreground hover:text-foreground"
        title="Экспорт / Импорт JSON"
      >
        Перенос ↕
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-2xl flex-col gap-0 rounded-lg border bg-background shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Перенос данных</h2>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {(["export", "import"] as Section[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSection(s); }}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium transition-colors",
                    section === s
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "export" ? "Экспорт" : "Импорт"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex flex-col gap-4 p-6">
              {section === "export" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Данные персонажа в формате GameOfBrothers. Скиллы переносятся как спеллы
                    (тип «buff», уровень 1). Репутация, валюта и системные поля не включаются.
                  </p>
                  <textarea
                    readOnly
                    value={exportJson ?? ""}
                    rows={14}
                    className="w-full resize-y rounded-lg border bg-muted/30 px-4 py-3 font-mono text-xs leading-relaxed outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleCopy}
                      className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                    >
                      {copied ? "Скопировано ✓" : "Скопировать"}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Скачать .json
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Вставьте JSON из GameOfBrothers или загрузите файл. Будет создан новый
                    персонаж. Скиллы/спеллы сохраняются в заметках персонажа.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                    >
                      Загрузить файл…
                    </button>
                    {importText && (
                      <span className="text-xs text-muted-foreground">
                        {importText.length.toLocaleString("ru")} символов
                      </span>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                  <textarea
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      setImportError(null);
                      setImportedId(null);
                    }}
                    rows={14}
                    placeholder='{ "schemaVersion": 1, "name": "...", ... }'
                    className="w-full resize-y rounded-lg border bg-background px-4 py-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-ring"
                  />
                  {importError && (
                    <p className="text-sm text-destructive">{importError}</p>
                  )}
                  {importedId && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Персонаж создан.{" "}
                      <button
                        onClick={() => {
                          handleClose();
                          router.push(`/characters/${importedId}`);
                        }}
                        className="underline"
                      >
                        Открыть →
                      </button>
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleImport}
                      disabled={isPending || !importText.trim()}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isPending ? "Создаём…" : "Создать персонажа"}
                    </button>
                    <button
                      onClick={handleClose}
                      className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                    >
                      Отмена
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
