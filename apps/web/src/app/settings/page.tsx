"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@gob/ui";
import { updateName, updatePassword } from "@/actions/profile";

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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-10 max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
      <NameSection />
      <hr className="border-border" />
      <PasswordSection />
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
