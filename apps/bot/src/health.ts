import { createServer, type Server } from "node:http";

/**
 * Лёгкий HTTP-эндпоинт здоровья для long-polling-процесса (у бота нет своего HTTP-порта).
 * Нужен для healthcheck сервиса `bot` в docker-compose (см. TODO п.9, шаг «Деплой»).
 * Отвечает 200 на `/health` и `/`, 404 на всё остальное.
 */
export function startHealthServer(port: number): Server {
  const server = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "not_found" }));
  });

  server.listen(port, () => {
    console.log(`[bot] healthcheck слушает http://127.0.0.1:${String(port)}/health`);
  });

  return server;
}
