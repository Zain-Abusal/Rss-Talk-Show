import { readFileSync } from "node:fs";
import { hashAdminPassword } from "../src/lib/admin-password";
// Pipe a password over stdin so it is never embedded in shell arguments or history.
const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
hashAdminPassword(password)
  .then((hash) => process.stdout.write(`${hash}\n`))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
