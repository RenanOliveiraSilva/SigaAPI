import { config } from "dotenv";
config();

import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 3333);
const host = process.env.HOST ?? "0.0.0.0";

const start = async () => {
  const app = await buildApp();

  await app.listen({ port, host });
  app.log.info(
    `🚀 SIGA API rodando em http://${host}:${port}  (docs em /docs)`
  );

  // Graceful shutdown
  const close = async (signal: string) => {
    app.log.info({ signal }, "Encerrando...");
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => close("SIGINT"));
  process.on("SIGTERM", () => close("SIGTERM"));
};

start();
