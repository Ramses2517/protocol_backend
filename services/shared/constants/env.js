import path, { dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const envPath = "../../../.env";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: path.join(__dirname, envPath),
});
