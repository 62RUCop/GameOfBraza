import { prisma } from "@gob/db";
import { DEFAULT_RULE_CONFIG } from "@gob/rules";
import { RuleConfigEditor } from "./rule-config-editor";

export default async function AdminRulesPage() {
  const dbRows = await prisma.ruleConfig.findMany({ orderBy: { key: "asc" } });

  const defaultEntries = Object.entries(DEFAULT_RULE_CONFIG).map(([key, value]) => ({
    key,
    defaultValue: value,
    dbRow: dbRows.find((r) => r.key === key) ?? null,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">RuleConfig — игровые константы</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Сохранённые значения перекрывают умолчания из кода. Перезапуск сервера не требуется — значения загружаются при каждом запросе.
        </p>
      </div>
      <RuleConfigEditor entries={defaultEntries} />
    </div>
  );
}
