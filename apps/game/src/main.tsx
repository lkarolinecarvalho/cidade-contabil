import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito";
import { bus } from "./bus";
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
// toda a comunicação passa pelo event bus tipado.
aplicarProporcaoDoPalco(elemento("palco"));

// O mundo só nasce depois que a UI avisa que está ouvindo (uma única vez) e que a
// fonte carregou: o Phaser desenha os textos uma vez só, com a fonte que houver.
let mundoCriado = false;
bus.ouvir("ui:pronta", () => {
  if (mundoCriado) return;
  mundoCriado = true;
  const criar = () => criarMundo(elemento("mundo"));
  document.fonts.load('800 13px "Nunito Variable"').then(criar, criar);
});

createRoot(elemento("ui")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
