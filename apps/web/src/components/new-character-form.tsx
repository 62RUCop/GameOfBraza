"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@gob/ui";
import { createCharacter } from "@/actions/characters";

const schema = z.object({
  name: z.string().min(1, "Введите имя").max(100),
});
type FormValues = z.infer<typeof schema>;

export function NewCharacterForm({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const result = await createCharacter({ name: values.name, ownerId });
    if (result.error) {
      setError(result.error);
    } else if (result.id) {
      router.push(`/characters/${result.id}`);
    }
  };

  return (
    <form
      onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
      className="space-y-4 rounded-lg border p-6"
    >
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Имя персонажа</label>
        <input
          id="name"
          {...register("name")}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none",
            "focus:ring-2 focus:ring-ring focus:ring-offset-2",
            errors.name ? "border-destructive" : "",
          )}
          placeholder="Введите имя"
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? "Создание…" : "Создать"}
        </button>
        <button
          type="button"
          onClick={() => { router.back(); }}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
