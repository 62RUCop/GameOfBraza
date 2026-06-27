"use client";

// Офлайн-фолбэк: service worker отдаёт эту страницу при навигации без сети
// (см. fallbacks в src/app/sw.ts). Страница статическая и самодостаточная —
// данные персонажа намеренно не кэшируются, поэтому показываем только оболочку.
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Нет соединения</h1>
          <p className="text-sm text-muted-foreground">
            Game of Braza работает онлайн: игровые значения всегда загружаются с сервера, чтобы не
            показывать устаревшие данные. Проверьте интернет и повторите.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Повторить
        </button>
      </div>
    </div>
  );
}
