"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@gob/ui";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});
type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/characters";
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (res?.error) {  // eslint-disable-line @typescript-eslint/no-unnecessary-condition
      setError("Неверный email или пароль");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Game of Braza</h1>
          <p className="mt-1 text-sm text-muted-foreground">Цифровая анкета персонажа</p>
        </div>

        <form
          onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background",
                "focus:ring-2 focus:ring-ring focus:ring-offset-2",
                errors.email ? "border-destructive" : "",
              )}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">Пароль</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background",
                "focus:ring-2 focus:ring-ring focus:ring-offset-2",
                errors.password ? "border-destructive" : "",
              )}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isSubmitting ? "Вход…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
