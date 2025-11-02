//libs
import { Command } from "commander";
import http from "http";
import fs from "fs/promises";
import { existsSync } from "fs";
import { XMLBuilder } from "fast-xml-parser";

const program = new Command();

program
  .option("-i, --input <path>", "Path to input JSON file")
  .option("-h, --host <host>", "Host address for the server")
  .option("-p, --port <port>", "Port number for the server");

program.parse(process.argv);

const options = program.opts();

// --- Валідація аргументів ---
if (!options.input || !existsSync(options.input)) {
  console.error("Cannot find input file");
  process.exit(1);
}
if (!options.host) {
  console.error("Missing required parameter: host");
  process.exit(1);
}
if (!options.port) {
  console.error("Missing required parameter: port");
  process.exit(1);
}

const port = parseInt(options.port, 10);
if (isNaN(port) || port < 1 || port > 65535) {
  console.error("Port must be a valid number between 1 and 65535");
  process.exit(1);
}

// --- Універсальний пошук полів ---
function findField(obj, possibleNames) {
  for (const key in obj) {
    if (possibleNames.includes(key.toUpperCase())) {
      return obj[key];
    }
    const value = obj[key];
    if (value && typeof value === "object") {
      const found = findField(value, possibleNames);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

// --- HTTP сервер ---
const server = http.createServer(async (req, res) => {
  try {
    const fileContent = await fs.readFile(options.input, "utf-8");
    let data = JSON.parse(fileContent);

    // Якщо JSON не масив — шукаємо перший масив всередині
    if (!Array.isArray(data)) {
      const firstArray = Object.values(data).find(Array.isArray);
      if (firstArray) data = firstArray;
    }

    const url = new URL(req.url, `http://${options.host}:${port}`);
    const showMFO = url.searchParams.get("mfo") === "true";
    const showNormal = url.searchParams.get("normal") === "true";

    // --- Фільтрація ---
    let filtered = data;
    if (showNormal) {
      filtered = filtered.filter(
        (bank) => String(findField(bank, ["COD_STATE", "STATE"])) === "1"
      );
    }

    // --- Підготовка до XML ---
    const banksXmlData = {
      banks: {
        bank: filtered.map((bank) => {
          const node = {};
          const mfo = findField(bank, ["MFO", "MFO_CODE"]);
          const name = findField(bank, [
            "SHORTNAME",
            "FULLNAME",
            "NAME",
            "BANK_NAME",
          ]);
          const state = findField(bank, ["COD_STATE", "STATE", "STATE_CODE"]);

          if (showMFO && mfo) node.mfo_code = mfo;
          if (name) node.name = name;
          if (state) node.state_code = state;

          return node;
        }),
      },
    };

    // --- Формуємо XML ---
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
    const xmlContent = builder.build(banksXmlData);

    res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    res.end(xmlContent);
  } catch (err) {
    console.error("Error:", err.message);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error occurred.");
  }
});

// --- Запуск ---
server.listen(port, options.host, () => {
  console.log(` Сервер запущено на http://${options.host}:${port}`);
  console.log(` Вхідний файл: ${options.input}`);
});








