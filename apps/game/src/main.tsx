import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { aplicarProporcaoDoPalco } from "./palco";
import { App } from "./ui/App";
import { criarMundo } from "./world/criarMundo";
import "./estilos.css";

function elemento(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado em index.html`);
  return el;
}

// Phaser e React são montados lado a lado e não se importam entre si:
// a comunicação será pelo event bus tipado (M3).
aplicarProporcaoDoPalco(elemento("palco"));
criarMundo(elemento("mundo"));
createRoot(elemento("ui")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
