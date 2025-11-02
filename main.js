// main.js
import { Command } from "commander";
import http from "http";
import { existsSync } from "fs";

const program = new Command();

program
  .requiredOption("-i, --input <path>", "Path to input JSON file (required)")
  .requiredOption("-h, --host <host>", "Host address for the server (required)")
  .requiredOption("-p, --port <port>", "Port number for the server (required)");

program.parse(process.argv);

const options = program.opts();

// --- Перевірка наявності файлу ---
if (!existsSync(options.input)) {
  console.error("Cannot find input file");
  process.exit(1);
}

// --- Перевірка числового порту ---
const port = Number(options.port);
if (isNaN(port)) {
  console.error("Port must be a number");
  process.exit(1);
}

// --- Створення HTTP сервера ---
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("HTTP сервер працює! Дані з файлу будуть оброблятися у частині 2.");
});

// --- Запуск сервера ---
server.listen(port, options.host, () => {
  console.log(` Сервер запущено на http://${options.host}:${port}`);
  console.log(` Вхідний файл: ${options.input}`);
});




