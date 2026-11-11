import Phaser from "phaser";
import { desenharCenario } from "../arte/cenario";
import { DESENHO_DO_EDIFICIO, desenharEdificio } from "../arte/edificios";
import { desenharPersonagem, PERSONAGEM } from "../arte/personagens";
import { bus } from "../bus";
import { proximaMissao } from "../state/jogo";
import { conteudo, jogoStore } from "../state/store";
import {
  avancar,
  type Destino,
  destinoDoToque,
  EDIFICIO,
  EDIFICIOS,
  type Edificio,
  MUNDO,
  POSICAO_INICIAL,
  type Ponto,
  RUA,
  rotaAte,
} from "./mapa";

/** Velocidade do avatar, em unidades do mundo por segundo. */
const VELOCIDADE = 230;
const FONTE = '"Nunito Variable", "Segoe UI", system-ui, sans-serif';
const CONTORNO = 0x4a3728;

/** NPC que fica na porta de cada estabelecimento: o primeiro que atende lá. */
function npcDe(estabelecimento: string): string {
  return conteudo.npcs.find((n) => n.estabelecimento === estabelecimento)?.id ?? "";
}

/**
 * Mapa da cidade: a vila com os 6 estabelecimentos, os NPCs nas portas e o avatar,
 * que anda até onde o jogador toca. A arte é SVG do próprio projeto (`src/arte`).
 */
export class CenaCidade extends Phaser.Scene {
  private avatar!: Phaser.GameObjects.Image;
  private posicao: Ponto = POSICAO_INICIAL;
  private rota: readonly Ponto[] = [];
  /** Estabelecimento para onde o avatar está indo, se o toque foi num edifício. */
  private aCaminhoDe: Edificio | null = null;
  private readonly ofertas = new Map<string, Phaser.GameObjects.Container>();
  private readonly urls: string[] = [];

  constructor() {
    super("cidade");
  }

  preload(): void {
    // Os SVG viram texturas já na densidade da tela, para ficarem nítidos.
    const escala = Math.max(1, Math.ceil(this.scale.gameSize.width / MUNDO.largura));
    const carregar = (chave: string, desenho: string, largura: number, altura: number) => {
      const url = URL.createObjectURL(new Blob([desenho], { type: "image/svg+xml" }));
      this.urls.push(url);
      this.load.svg(chave, url, { width: largura * escala, height: altura * escala });
    };

    carregar(
      "cenario",
      desenharCenario({
        largura: MUNDO.largura,
        altura: MUNDO.altura,
        rua: RUA,
        portas: EDIFICIOS.map((e) => e.porta),
        edificios: EDIFICIOS.map((e) => ({
          x: e.centro.x - EDIFICIO.largura / 2,
          y: e.centro.y - EDIFICIO.altura / 2,
          ...EDIFICIO,
        })),
      }),
      MUNDO.largura,
      MUNDO.altura,
    );
    for (const { id } of EDIFICIOS) {
      carregar(
        `edificio:${id}`,
        desenharEdificio(id),
        DESENHO_DO_EDIFICIO.largura,
        DESENHO_DO_EDIFICIO.altura,
      );
      const npc = npcDe(id);
      carregar(`npc:${id}`, desenharPersonagem(npc), PERSONAGEM.largura, PERSONAGEM.altura);
    }
    carregar("avatar", desenharPersonagem("avatar"), PERSONAGEM.largura, PERSONAGEM.altura);
  }

  create(): void {
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.cameras.main.setBackgroundColor(0x8fc26c);
    this.add.image(0, 0, "cenario").setOrigin(0).setDisplaySize(MUNDO.largura, MUNDO.altura);
    for (const edificio of EDIFICIOS) this.desenharEdificio(edificio);

    this.avatar = this.add
      .image(this.posicao.x, this.posicao.y, "avatar")
      .setOrigin(0.5, 0.94)
      .setDisplaySize(PERSONAGEM.largura, PERSONAGEM.altura);
    this.avatar.setDepth(this.posicao.y);

    this.enquadrar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.enquadrar, this);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (ponteiro: Phaser.Input.Pointer) => {
      const toque = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
      this.irPara(destinoDoToque({ x: toque.x, y: toque.y }));
    });

    // Com um painel aberto, os toques são da UI: o mundo para de recebê-los.
    const cancelarPainel = bus.ouvir("painel:mudou", ({ aberto }) => {
      this.input.enabled = !aberto;
    });
    // O indicador de oferta acompanha o progresso guardado na store.
    this.atualizarOfertas();
    const cancelarStore = jogoStore.subscribe(() => this.atualizarOfertas());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cancelarPainel();
      cancelarStore();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.enquadrar, this);
    });

    bus.emitir("mundo:pronto", undefined);
  }

  override update(_tempo: number, delta: number): void {
    if (this.rota.length === 0) return;
    const anterior = this.posicao;
    const passo = avancar(this.posicao, this.rota, (VELOCIDADE * delta) / 1000);
    this.posicao = passo.posicao;
    this.rota = passo.rota;
    this.avatar.setPosition(this.posicao.x, this.posicao.y).setDepth(this.posicao.y);
    // Balanço leve do andar.
    this.avatar.setAngle(Math.sin(this.time.now / 70) * 4);
    if (this.posicao.x !== anterior.x) this.avatar.setFlipX(this.posicao.x < anterior.x);
    if (this.rota.length === 0) this.chegar();
  }

  /** Mostra o mundo inteiro na largura do canvas, centralizado. */
  private enquadrar(): void {
    const { width, height } = this.scale.gameSize;
    const camera = this.cameras.main;
    camera.setZoom(Math.min(width / MUNDO.largura, height / MUNDO.altura));
    camera.centerOn(MUNDO.largura / 2, MUNDO.altura / 2);
  }

  private irPara(destino: Destino): void {
    this.aCaminhoDe = destino.tipo === "estabelecimento" ? destino.edificio : null;
    this.rota = rotaAte(this.posicao, destino.ponto);
    // Tocou no estabelecimento em que já está: abre o painel de novo.
    if (this.rota.length === 0) this.chegar();
  }

  private chegar(): void {
    this.avatar.setAngle(0);
    const edificio = this.aCaminhoDe;
    this.aCaminhoDe = null;
    if (edificio) bus.emitir("estabelecimento:alcancado", { estabelecimento: edificio.id });
  }

  private atualizarOfertas(): void {
    const comOferta = proximaMissao(jogoStore.getState(), conteudo.missoes)?.estabelecimento;
    for (const [id, indicador] of this.ofertas) indicador.setVisible(id === comOferta);
  }

  private desenharEdificio(edificio: Edificio): void {
    const { centro, porta, rotulo, id } = edificio;
    const base = centro.y + EDIFICIO.altura / 2;
    this.add
      .image(centro.x, centro.y, `edificio:${id}`)
      .setDisplaySize(DESENHO_DO_EDIFICIO.largura, DESENHO_DO_EDIFICIO.altura)
      .setDepth(base);

    // Placa com o nome, como nos mockups: etiqueta creme sobre a fachada.
    const texto = this.add
      .text(0, 0, rotulo, {
        fontFamily: FONTE,
        fontSize: "13px",
        fontStyle: "bold",
        color: "#3a2e1f",
      })
      .setOrigin(0.5)
      .setResolution(3);
    const largura = texto.width + 18;
    const placa = this.add.graphics();
    placa.fillStyle(0x000000, 0.18).fillRoundedRect(-largura / 2 + 1, -10, largura, 23, 9);
    placa.fillStyle(0xfff6df).fillRoundedRect(-largura / 2, -12, largura, 23, 9);
    placa.lineStyle(1.6, CONTORNO).strokeRoundedRect(-largura / 2, -12, largura, 23, 9);
    this.add.container(centro.x, centro.y - EDIFICIO.altura / 2 - 6, [placa, texto]).setDepth(900);

    // NPC ao lado da porta.
    this.add
      .image(porta.x + 32, porta.y - 6, `npc:${id}`)
      .setOrigin(0.5, 0.94)
      .setDisplaySize(PERSONAGEM.largura * 0.92, PERSONAGEM.altura * 0.92)
      .setDepth(porta.y - 6);

    // Indicador de oferta: balão com "!" acima do NPC.
    const balao = this.add.graphics();
    balao.fillStyle(0x000000, 0.18).fillCircle(1, 2, 13);
    balao.fillStyle(0xffffff).fillCircle(0, 0, 13);
    balao.fillTriangle(-5, 10, 5, 10, 0, 19);
    balao.lineStyle(1.8, CONTORNO).strokeCircle(0, 0, 13);
    const sinal = this.add
      .text(0, -1, "!", {
        fontFamily: FONTE,
        fontSize: "19px",
        fontStyle: "bold",
        color: "#d6453c",
      })
      .setOrigin(0.5)
      .setResolution(3);
    const indicador = this.add
      // No canto do telhado, sem cobrir a fachada nem a placa.
      .container(centro.x + 64, centro.y - EDIFICIO.altura / 2 + 16, [balao, sinal])
      .setDepth(950)
      .setVisible(false);
    this.tweens.add({
      targets: indicador,
      y: indicador.y - 6,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.ofertas.set(id, indicador);
  }
}
