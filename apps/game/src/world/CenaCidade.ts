import Phaser from "phaser";
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

const CORES = {
  grama: 0x2f5d50,
  rua: 0x3a4654,
  faixa: 0xd9c66b,
  calcada: 0x566373,
  telhado: 0x000000,
  avatar: 0xf2b45a,
  npc: 0xe8eef4,
  oferta: 0xffd84a,
} as const;

const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Mapa da cidade com arte placeholder desenhada em código: os 6 estabelecimentos,
 * a rua central, os NPCs e o avatar, que anda até onde o jogador toca.
 */
export class CenaCidade extends Phaser.Scene {
  private avatar!: Phaser.GameObjects.Container;
  private posicao: Ponto = POSICAO_INICIAL;
  private rota: readonly Ponto[] = [];
  /** Estabelecimento para onde o avatar está indo, se o toque foi num edifício. */
  private aCaminhoDe: Edificio | null = null;
  private readonly ofertas = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super("cidade");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(CORES.grama);
    this.desenharRuas();
    for (const edificio of EDIFICIOS) this.desenharEdificio(edificio);
    this.avatar = this.criarAvatar();

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
    const passo = avancar(this.posicao, this.rota, (VELOCIDADE * delta) / 1000);
    this.posicao = passo.posicao;
    this.rota = passo.rota;
    this.avatar.setPosition(this.posicao.x, this.posicao.y);
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
    const edificio = this.aCaminhoDe;
    this.aCaminhoDe = null;
    if (edificio) bus.emitir("estabelecimento:alcancado", { estabelecimento: edificio.id });
  }

  private atualizarOfertas(): void {
    const comOferta = proximaMissao(jogoStore.getState(), conteudo.missoes)?.estabelecimento;
    for (const [id, indicador] of this.ofertas) indicador.setVisible(id === comOferta);
  }

  private desenharRuas(): void {
    const g = this.add.graphics();
    // Rua central.
    g.fillStyle(CORES.rua);
    g.fillRect(RUA.x - RUA.largura / 2, RUA.yMin - 40, RUA.largura, RUA.yMax - RUA.yMin + 80);
    // Faixa tracejada.
    g.fillStyle(CORES.faixa);
    for (let y = RUA.yMin - 28; y < RUA.yMax + 30; y += 26) g.fillRect(RUA.x - 1.5, y, 3, 13);
    // Calçada em frente a cada porta.
    g.fillStyle(CORES.calcada);
    for (const { porta } of EDIFICIOS) {
      const esquerda = Math.min(porta.x, RUA.x) - 12;
      const largura = Math.abs(porta.x - RUA.x) + 24 - RUA.largura / 2;
      const x = porta.x < RUA.x ? esquerda : RUA.x + RUA.largura / 2;
      g.fillRect(x, porta.y - 12, largura, 24);
    }
  }

  private desenharEdificio(edificio: Edificio): void {
    const { centro, porta, cor, rotulo, id } = edificio;
    const esquerda = centro.x - EDIFICIO.largura / 2;
    const topo = centro.y - EDIFICIO.altura / 2;
    const g = this.add.graphics();
    // Sombra, paredes e faixa do telhado.
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(esquerda + 4, topo + 6, EDIFICIO.largura, EDIFICIO.altura, 10);
    g.fillStyle(cor);
    g.fillRoundedRect(esquerda, topo, EDIFICIO.largura, EDIFICIO.altura, 10);
    g.fillStyle(CORES.telhado, 0.22);
    g.fillRoundedRect(esquerda, topo, EDIFICIO.largura, 26, { tl: 10, tr: 10, bl: 0, br: 0 });
    // Porta, na lateral voltada para a rua.
    const ladoDaRua = porta.x > centro.x ? 1 : -1;
    g.fillStyle(0x1b222b);
    g.fillRect(
      centro.x + ladoDaRua * (EDIFICIO.largura / 2) - (ladoDaRua > 0 ? 7 : 0),
      centro.y - 13,
      7,
      26,
    );

    this.add
      .text(centro.x, centro.y + 8, rotulo, {
        fontFamily: FONTE,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setResolution(3);

    // NPC ao lado da porta, com o indicador de oferta.
    // Fica acima da calçada, para o avatar não encobri-lo ao chegar.
    const npc = { x: porta.x, y: porta.y - 44 };
    this.add.circle(npc.x, npc.y + 9, 7, CORES.npc).setStrokeStyle(2, 0x1b222b);
    this.add.circle(npc.x, npc.y - 2, 5, CORES.npc).setStrokeStyle(2, 0x1b222b);

    const indicador = this.add.container(npc.x, npc.y - 26, [
      this.add.circle(0, 0, 11, CORES.oferta).setStrokeStyle(2, 0x1b222b),
      this.add
        .text(0, 0, "!", {
          fontFamily: FONTE,
          fontSize: "16px",
          fontStyle: "bold",
          color: "#1b222b",
        })
        .setOrigin(0.5)
        .setResolution(3),
    ]);
    indicador.setVisible(false);
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

  private criarAvatar(): Phaser.GameObjects.Container {
    const avatar = this.add.container(this.posicao.x, this.posicao.y, [
      this.add.ellipse(0, 12, 22, 8, 0x000000, 0.3),
      this.add.circle(0, 2, 9, CORES.avatar).setStrokeStyle(2, 0x1b222b),
      this.add.circle(0, -11, 6, CORES.avatar).setStrokeStyle(2, 0x1b222b),
    ]);
    avatar.setDepth(10);
    return avatar;
  }
}
