"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@gob/ui";
import type { TelegramLinkStatus } from "@gob/core";
import {
  updateName,
  updatePassword,
  getTelegramLinkStatus,
  createTelegramLinkCode,
  removeTelegramLink,
} from "@/actions/profile";

const ThemeToggleNoSSR = dynamic(
  () => import("@/components/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false },
);

const SheetLayoutToggleNoSSR = dynamic(
  () => import("@/components/sheet-layout-toggle").then((m) => m.SheetLayoutToggle),
  { ssr: false },
);

// ── Name form ────────────────────────────────────────────────────────────────

const nameSchema = z.object({ name: z.string().min(1, "Имя не может быть пустым").max(64) });
type NameValues = z.infer<typeof nameSchema>;

function NameSection() {
  const { data: session, update } = useSession();
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: session?.user.name ?? "" },
  });

  const onSubmit = async (values: NameValues) => {
    const res = await updateName(values);
    if ("error" in res) return;
    await update({ name: values.name });
    setSaved(true);
    setTimeout(() => { setSaved(false); }, 2000);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Отображаемое имя</h2>
      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="flex gap-2 max-w-sm">
        <div className="flex-1 space-y-1">
          <input
            {...register("name")}
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background",
              "focus:ring-2 focus:ring-ring focus:ring-offset-2",
              errors.name ? "border-destructive" : "",
            )}
            placeholder="Ваше имя"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {saved ? "Сохранено" : "Сохранить"}
        </button>
      </form>
    </section>
  );
}

// ── Password form ────────────────────────────────────────────────────────────

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(6, "Минимум 6 символов"),
  confirmPassword: z.string().min(1, "Подтвердите пароль"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});
type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordSection() {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (values: PasswordValues) => {
    setError(null);
    const res = await updatePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if ("error" in res) {
      setError(res.error);
      return;
    }
    reset();
    setSaved(true);
    setTimeout(() => { setSaved(false); }, 2000);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Смена пароля</h2>
      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-3 max-w-sm">
        <Field label="Текущий пароль" type="password" reg={register("currentPassword")} error={errors.currentPassword?.message} />
        <Field label="Новый пароль" type="password" reg={register("newPassword")} error={errors.newPassword?.message} />
        <Field label="Подтвердите новый пароль" type="password" reg={register("confirmPassword")} error={errors.confirmPassword?.message} />
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {saved ? "Сохранено" : "Изменить пароль"}
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  type,
  reg,
  error,
}: {
  label: string;
  type: string;
  reg: ReturnType<ReturnType<typeof useForm>["register"]>;
  error?: string | undefined;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        {...reg}
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2",
          error ? "border-destructive" : "",
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Telegram link ──────────────────────────────────────────────────────────────

interface LinkCode {
  code: string;
  expiresAt: string;
  ttlMinutes: number;
}

function TelegramSection() {
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null);
  const [code, setCode] = useState<LinkCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Имя бота для кликабельного deep-link (необязательно; иначе показываем только код).
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  const refresh = async () => {
    const res = await getTelegramLinkStatus();
    if ("error" in res) return;
    setStatus(res);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onGenerate = async () => {
    setBusy(true);
    setError(null);
    const res = await createTelegramLinkCode();
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setCode(res);
  };

  const onUnlink = async () => {
    setBusy(true);
    setError(null);
    const res = await removeTelegramLink();
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setCode(null);
    await refresh();
  };

  const onCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`/start ${code.code}`);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 1500);
    } catch {
      // буфер обмена недоступен — не критично, код виден на экране
    }
  };

  const deepLink = code && botUsername ? `https://t.me/${botUsername}?start=${code.code}` : null;

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Telegram-бот</h2>
      <p className="text-sm text-muted-foreground">
        Привяжите аккаунт к боту, чтобы смотреть лист и менять текущие значения прямо в Telegram.
      </p>

      {status?.linked ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1 text-sm text-green-600 dark:text-green-400">
            ● Привязано
          </span>
          <button
            type="button"
            onClick={() => void onUnlink()}
            disabled={busy}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            Отвязать
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={busy}
          className={cn(
            "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {busy ? "Генерация…" : "Сгенерировать код привязки"}
        </button>
      )}

      {code && (
        <div className="space-y-2 rounded-md border bg-muted/40 p-4">
          <p className="text-sm">Отправьте боту команду:</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-background px-2 py-1 font-mono text-sm">/start {code.code}</code>
            <button type="button" onClick={() => void onCopy()} className="text-xs text-primary underline">
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
          {deepLink && (
            <a href={deepLink} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary underline">
              Открыть в Telegram
            </a>
          )}
          <p className="text-xs text-muted-foreground">Код действует {code.ttlMinutes} минут.</p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-10 max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
      <NameSection />
      <hr className="border-border" />
      <PasswordSection />
      <hr className="border-border" />
      <TelegramSection />
      <hr className="border-border" />
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Тема</h2>
        <ThemeToggleNoSSR />
      </section>
      <hr className="border-border" />
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Отображение анкеты</h2>
        <p className="text-sm text-muted-foreground">
          Как показывать поля персонажа: переключаться по вкладкам или выводить всё на одном экране.
        </p>
        <SheetLayoutToggleNoSSR />
      </section>
    </div>
  );
}
