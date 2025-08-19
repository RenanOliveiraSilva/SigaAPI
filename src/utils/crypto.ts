// src/utils/crypto.ts
const jose = require("jose");

// Chave secreta (precisa estar em variável de ambiente e ser a mesma em todo o backend)
const secretKey = new TextEncoder().encode(
  process.env.COOKIE_SECRET ?? "sua-chave-bem-secreta"
);

export async function encryptForServer(data: object): Promise<string> {
  const jwe = await new jose.EncryptJWT(data)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" }) // Algoritmo de criptografia simétrica
    .setIssuedAt()
    .setExpirationTime("2h") // o JWE expira em 2 horas
    .encrypt(secretKey);

  return jwe;
}

export async function decryptFromClient(token: string): Promise<any> {
  const { payload } = await jose.jwtDecrypt(token, secretKey);
  return payload;
}
