import fp from "fastify-plugin";
import jwt from "@fastify/jwt";

export default fp(async (app) => {
  if (!process.env.JWT_SECRET) {
    app.log.error("JWT_SECRET não definido");
    throw new Error("JWT_SECRET ausente");
  }

  await app.register(jwt, {
    secret: process.env.JWT_SECRET,
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    },
  });

  app.decorate("authenticate", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      // log para facilitar debug: mostra o Authorization header e o erro
      // app.log.warn(
      //   { err, authorization: request.headers?.authorization },
      //   "JWT verification failed"
      // );
      return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}
