import Phaser from "phaser";
import { BONECO, desenharBoneco } from "../arte/bonecos";
import { desenharChao, desenharEnfeite, ENFEITES } from "../arte/cenario";
import { DESENHO_DO_EDIFICIO, desenharEdificio } from "../arte/edificios";
import { bus } from "../bus";
import { proximaMissao } from "../state/jogo";
import { conteudo, jogoStore } from "../state/store";
import { ENFEITES_DO_MAPA } from "./enfeites";
import {
  avancar,
  CENTRO,
  type Destino,
  destinoDoToque,
  EDIFICIO,
  EDIFICIOS,
  type Edificio,
  LADRILHO,
  MUNDO,
  POSICAO_INICIAL,
  type Ponto,
  RAIO_DA_PRACA,
  rotaAte,
  TRECHOS,
} from "./mapa";

/** Velocidade do avatar, em unidades do mundo por segundo. */
const VELOCIDADE = 230;
const FONTE = '"Nunito Variable", "Segoe UI", system-ui, sans-serif';
const CONTORNO = 0x4a3728;

/** Distância, na tela, do centro da base do edifício até a placa com o nome. */
const ALTURA_DA_PLACA = 104;

const chaveDoEnfeite = (tipo: string, espelhado: boolean): string =>
  `enfeite:${tipo}${espelhado ? ":espelhado" : ""}`;

/** NPC que fica na porta de cada estabelecimento: o primeiro que atende lá. */
function npcDe(estabelecimento: string): string {
  return conteudo.npcs.find((n) => n.estabelecimento === estabelecimento)?.id ?? "";
}

/**
 * Mapa da cidade, em projeção isométrica: a praça com os 6 estabelecimentos em volta,
 * os NPCs nas portas e o avatar, que anda pelos caminhos até onde o jogador toca.
 * A arte é SVG do próprio projeto (`src/arte`). Quem está mais abaixo na tela fica
 * na frente (a profundidade é o `y` da base).
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
    const carregadas = new Set<string>();
    const carregar = (chave: string, desenho: string, largura: number, altura: number) => {
      const url = URL.createObjectURL(new Blob([desenho], { type: "image/svg+xml" }));
      this.urls.push(url);
      this.load.svg(chave, url, { width: largura * escala, height: altura * escala });
    };

    carregar(
      "chao",
      desenharChao({
        largura: MUNDO.largura,
        altura: MUNDO.altura,
        unidade: LADRILHO,
        centro: CENTRO,
        trechos: TRECHOS,
        raioDaPraca: RAIO_DA_PRACA,
        edificios: EDIFICIOS.map((e) => e.grade),
        ladoDoEdificio: EDIFICIO.lado,
      }),
      MUNDO.largura,
      MUNDO.altura,
    );
    for (const { id, frente } of EDIFICIOS) {
      carregar(
        `edificio:${id}`,
        desenharEdificio(id, frente),
        DESENHO_DO_EDIFICIO.largura,
        DESENHO_DO_EDIFICIO.altura,
      );
      carregar(`npc:${id}`, desenharBoneco(npcDe(id), frente), BONECO.largura, BONECO.altura);
    }
    for (const { tipo, espelhado = false } of ENFEITES_DO_MAPA) {
      const chave = chaveDoEnfeite(tipo, espelhado);
      if (this.textures.exists(chave) || carregadas.has(chave)) continue;
      carregadas.add(chave);
      const { largura, altura } = ENFEITES[tipo];
      carregar(chave, desenharEnfeite(tipo, espelhado), largura, altura);
    }
    for (const lado of ["direita", "esquerda"] as const) {
      carregar(`avatar:${lado}`, desenharBoneco("avatar", lado), BONECO.largura, BONECO.altura);
    }
  }

  create(): void {
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.cameras.main.setBackgroundColor(0x86cf5c);
    this.add
      .image(0, 0, "chao")
      .setOrigin(0)
      .setDisplaySize(MUNDO.largura, MUNDO.altura)
      .setDepth(-1);
    for (const { tipo, ponto, espelhado = false } of ENFEITES_DO_MAPA) {
      const { largura, altura, ancoraX, ancoraY } = ENFEITES[tipo];
      this.add
        .image(ponto.x, ponto.y, chaveDoEnfeite(tipo, espelhado))
        .setOrigin(ancoraX / largura, ancoraY / altura)
        .setDisplaySize(largura, altura)
        .setDepth(ponto.y);
    }
    for (const edificio of EDIFICIOS) this.desenharEdificio(edificio);

    this.avatar = this.add
      .image(this.posicao.x, this.posicao.y, "avatar:direita")
      .setOrigin(BONECO.ancoraX / BONECO.largura, BONECO.ancoraY / BONECO.altura)
      .setDisplaySize(BONECO.largura, BONECO.altura);
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
    const dx = this.posicao.x - anterior.x;
    if (Math.abs(dx) > 0.01) this.avatar.setTexture(dx > 0 ? "avatar:direita" : "avatar:esquerda");
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
    const { centro, porta, rotulo, id, frente } = edificio;
    const d = DESENHO_DO_EDIFICIO;
    this.add
      .image(centro.x, centro.y, `edificio:${id}`)
      .setOrigin(d.ancoraX / d.largura, d.ancoraY / d.altura)
      .setDisplaySize(d.largura, d.altura)
      .setDepth(centro.y);

    // Placa com o nome: etiqueta creme no alto do edifício.
    const texto = this.add
      .text(0, 0, rotulo, {
        fontFamily: FONTE,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#3a2e1f",
      })
      .setOrigin(0.5)
      .setResolution(3);
    const largura = texto.width + 16;
    const placa = this.add.graphics();
    placa.fillStyle(0x000000, 0.18).fillRoundedRect(-largura / 2 + 1, -9, largura, 22, 8);
    placa.fillStyle(0xfff6df).fillRoundedRect(-largura / 2, -11, largura, 22, 8);
    placa.lineStyle(1.6, CONTORNO).strokeRoundedRect(-largura / 2, -11, largura, 22, 8);
    this.add.container(centro.x, centro.y - ALTURA_DA_PLACA, [placa, texto]).setDepth(900);

    // NPC ao lado da porta, virado para a rua.
    const sentido = frente === "direita" ? -1 : 1;
    const npc = { x: porta.x + sentido * 27, y: porta.y + 8.5 };
    this.add
      .image(npc.x, npc.y, `npc:${id}`)
      .setOrigin(BONECO.ancoraX / BONECO.largura, BONECO.ancoraY / BONECO.altura)
      .setDisplaySize(BONECO.largura, BONECO.altura)
      .setDepth(npc.y);

    // Indicador de oferta: balão com "!" acima do NPC.
    const balao = this.add.graphics();
    balao.fillStyle(0x000000, 0.18).fillCircle(1, 2, 12);
    balao.fillStyle(0xffffff).fillCircle(0, 0, 12);
    balao.fillTriangle(-5, 9, 5, 9, 0, 18);
    balao.lineStyle(1.8, CONTORNO).strokeCircle(0, 0, 12);
    const sinal = this.add
      .text(0, -1, "!", {
        fontFamily: FONTE,
        fontSize: "18px",
        fontStyle: "bold",
        color: "#d6453c",
      })
      .setOrigin(0.5)
      .setResolution(3);
    const indicador = this.add
      .container(npc.x, npc.y - BONECO.ancoraY - 16, [balao, sinal])
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
