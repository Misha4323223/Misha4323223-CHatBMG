// Настройка для запуска основного прокси-сервера
console.log("Запуск прокси-сервера ChatGPT...");
import("./proxy-server.js").catch(err => {
  console.error("Ошибка при запуске сервера:", err);
});