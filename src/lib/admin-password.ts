import {
  createHash,
  createHmac,
  scrypt as scryptCallback,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
function scrypt(
  password: string,
  salt: Buffer,
  length: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(password, salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export const ADMIN_COOKIE = "rss_admin";
export const SESSION_SECONDS = 8 * 60 * 60;
export async function hashAdminPassword(password: string) {
  if (password.length < 12 || password.length > 200)
    throw new Error("Use an admin password between 12 and 200 characters.");
  const salt = randomBytes(16);
  const result = (await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer;
  return `scrypt:32768:8:1:${salt.toString("base64url")}:${result.toString("base64url")}`;
}
export async function verifyAdminPassword(password: string, encoded: string) {
  const parts = encoded.split(":");
  if (
    parts.length !== 6 ||
    parts.slice(0, 4).join(":") !== "scrypt:32768:8:1" ||
    password.length > 200
  )
    return false;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (salt.length !== 16 || expected.length !== 64) return false;
  const actual = (await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer;
  return timingSafeEqual(actual, expected);
}
function signature(payload: string, secret: string, passwordHash: string) {
  return createHmac("sha256", secret)
    .update(
      `${payload}.${createHash("sha256").update(passwordHash).digest("hex")}`,
    )
    .digest();
}
export function signAdminSession(
  id: string,
  expires: number,
  secret: string,
  passwordHash: string,
) {
  const payload = Buffer.from(JSON.stringify({ id, expires })).toString(
    "base64url",
  );
  return `${payload}.${signature(payload, secret, passwordHash).toString("base64url")}`;
}
export function verifyAdminSession(
  value: string,
  secret: string,
  passwordHash: string,
) {
  try {
    if (value.length > 1000) return null;
    const [payload, mac, ...rest] = value.split(".");
    if (!payload || !mac || rest.length) return null;
    const actual = Buffer.from(mac, "base64url");
    const expected = signature(payload, secret, passwordHash);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof data.id !== "string" ||
      !/^[0-9a-f-]{36}$/.test(data.id) ||
      !Number.isInteger(data.expires) ||
      data.expires <= now ||
      data.expires > now + SESSION_SECONDS + 60
    )
      return null;
    return data as { id: string; expires: number };
  } catch {
    return null;
  }
}
