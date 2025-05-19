import { useEffect } from "react";

export default function G4FChat() {
  useEffect(() => {
    // Редирект на нашу страницу G4F
    window.location.href = "/g4f-index.html";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Перенаправление на G4F Чат...</p>
    </div>
  );
}