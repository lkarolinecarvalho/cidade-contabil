import Phaser from "phaser";
import { BONECO, desenharBoneco } from "../arte/bonecos";
import { desenharChao, desenharEnfeite, ENFEITES } from "../arte/cenario";
import { DESENHO_DO_EDIFICIO, desenharEdificio, desenharTerrenoVago } from "../arte/edificios";
import { bus } from "../bus";
import { proximaMissao, temPontoComercial } from "../state/jogo";
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
  RUAS_DA_VIZINHANCA,
  rotaAte,
  TRECHOS,
} from "./mapa";

/** Velocidade do avatar, em unidades do mundo por segundo. */
const VELOCIDADE = 230;
const FONTE = '"Nunito Variable", "Segoe UI", system-ui, sans-serif';
const CONTORNO = 0x4a3728;

/** Onde fica o meio da placa, a partir do centro da base: para o lado da fachada e acima dela. */
const PLACA = { lado: 30, altura: 52 } as const;
/** Do centro da base até o balão de oferta, que flutua acima do telhado. */
const ALTURA_DO_BALAO = 112;
/** Inclinação da placa, acompanhando a fachada: sobe ou desce meio pixel por pixel. */
const INCLINACAO = 0.5;

const chaveDoEnfeite = (tipo: string, espelhado: boolean): string =>
  `enfeite:${tipo}${espelhado ? ":espelhado" : ""}`;

/** O estabelecimento que começa como terreno à venda, até a empresa comprar o ponto. */
const PONTO_DA_EMPRESA = "minha-loja";
/** Na abertura, a câmera fica fechada no ponto vago; depois se afasta até o mapa inteiro. */
const ZOOM_DA_ABERTURA = 2.3;
const DURACAO_DA_ABERTURA = 1600;

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
  /** O que aparece no ponto da empresa depois da compra, e o que aparece antes. */
  private readonly doPonto: Phaser.GameObjects.Image[] = [];
  private readonly doTerreno: Phaser.GameObjects.Image[] = [];
  private pontoComprado = false;
  /** Enquanto a abertura não termina, a câmera fica fechada no ponto vago. */
  private emAbertura = false;
  private painelAberto = false;
  /** Pixels de textura por unidade do mundo, para os desenhos ficarem nítidos. */
  private densidade = 1;

  constructor() {
    super("cidade");
  }

  preload(): void {
    // Os SVG viram texturas já na densidade da tela, para ficarem nítidos.
    const escala = Math.max(1, Math.ceil(this.scale.gameSize.width / MUNDO.largura));
    this.densidade = escala;
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
        trechos: [...TRECHOS, ...RUAS_DA_VIZINHANCA],
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
    const ponto = EDIFICIOS.find((e) => e.id === PONTO_DA_EMPRESA);
    if (ponto) {
      carregar(
        "terreno-vago",
        desenharTerrenoVago(ponto.frente),
        DESENHO_DO_EDIFICIO.largura,
        DESENHO_DO_EDIFICIO.altura,
      );
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

    this.emAbertura = !jogoStore.getState().aberturaVista;
    this.enquadrar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.enquadrar, this);
    this.input.enabled = !this.emAbertura;

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (ponteiro: Phaser.Input.Pointer) => {
      const toque = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
      this.irPara(destinoDoToque({ x: toque.x, y: toque.y }));
    });

    // Com um painel aberto, os toques são da UI: o mundo para de recebê-los.
    const cancelarPainel = bus.ouvir("painel:mudou", ({ aberto }) => {
      this.painelAberto = aberto;
      this.input.enabled = !aberto && !this.emAbertura;
    });
    // O indicador de oferta e o ponto da empresa acompanham o que está guardado na store.
    this.atualizarOfertas();
    this.atualizarPonto(false);
    const cancelarStore = jogoStore.subscribe((estado) => {
      this.atualizarOfertas();
      this.atualizarPonto(true);
      if (this.emAbertura && estado.aberturaVista) this.abrirACidade();
    });

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

  /** Zoom em que o mundo inteiro cabe no canvas. */
  private zoomDoMapa(): number {
    const { width, height } = this.scale.gameSize;
    return Math.min(width / MUNDO.largura, height / MUNDO.altura);
  }

  /**
   * Mostra o mundo inteiro, centralizado. Durante a abertura, a câmera fica fechada no
   * ponto vago da praça.
   */
  private enquadrar(): void {
    const camera = this.cameras.main;
    const ponto = EDIFICIOS.find((e) => e.id === PONTO_DA_EMPRESA);
    if (this.emAbertura && ponto) {
      camera.setZoom(this.zoomDoMapa() * ZOOM_DA_ABERTURA);
      camera.centerOn(ponto.centro.x, ponto.centro.y - 28);
      return;
    }
    camera.setZoom(this.zoomDoMapa());
    camera.centerOn(MUNDO.largura / 2, MUNDO.altura / 2);
  }

  /** Fim da abertura: a câmera se afasta do ponto vago até mostrar a cidade inteira. */
  private abrirACidade(): void {
    this.emAbertura = false;
    const camera = this.cameras.main;
    camera.zoomTo(this.zoomDoMapa(), DURACAO_DA_ABERTURA, "Sine.easeInOut", true);
    camera.pan(
      MUNDO.largura / 2,
      MUNDO.altura / 2,
      DURACAO_DA_ABERTURA,
      "Sine.easeInOut",
      true,
      (_camera: Phaser.Cameras.Scene2D.Camera, progresso: number) => {
        if (progresso < 1) return;
        // Garante o enquadramento exato e devolve os toques ao mapa.
        this.enquadrar();
        this.input.enabled = !this.painelAberto;
      },
    );
  }

  /** Antes da compra, o ponto da empresa é um terreno à venda; depois, a hamburgueria. */
  private atualizarPonto(animar: boolean): void {
    const comprado = temPontoComercial(jogoStore.getState().contabil);
    const mudou = comprado !== this.pontoComprado;
    this.pontoComprado = comprado;
    for (const objeto of this.doPonto) objeto.setVisible(comprado);
    for (const objeto of this.doTerreno) objeto.setVisible(!comprado);
    if (!animar || !mudou || !comprado) return;
    // A hamburgueria "brota" no terreno quando o ponto é comprado.
    for (const objeto of this.doPonto) {
      const escala = { x: objeto.scaleX, y: objeto.scaleY };
      objeto.setScale(escala.x * 0.6, escala.y * 0.2);
      this.tweens.add({
        targets: objeto,
        scaleX: escala.x,
        scaleY: escala.y,
        duration: 520,
        ease: "Back.easeOut",
      });
    }
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

  /**
   * Desenha a placa do edifício num canvas, já inclinada, e a registra como textura.
   * A fachada virada para a direita sobe para a direita; a outra, desce.
   */
  private texturaDaPlaca(chave: string, rotulo: string, frente: Edificio["frente"]): string {
    if (this.textures.exists(chave)) return chave;
    const d = this.densidade;
    // Nomes compridos quebram em duas linhas.
    const linhas = rotulo.length > 12 ? rotulo.split(" ") : [rotulo];
    const fonte = `800 11px ${FONTE}`;
    const medida = document.createElement("canvas").getContext("2d");
    if (medida) medida.font = fonte;
    const larguraDoTexto = Math.max(...linhas.map((l) => medida?.measureText(l).width ?? 60));
    const largura = Math.ceil(larguraDoTexto) + 14;
    const altura = 7 + linhas.length * 12;
    const inclinacao = frente === "direita" ? -INCLINACAO : INCLINACAO;
    const folga = 4;
    const alturaTotal = altura + largura * INCLINACAO + 2 * folga;

    const tela = this.textures.createCanvas(
      chave,
      Math.ceil((largura + 2 * folga) * d),
      Math.ceil(alturaTotal * d),
    );
    const ctx = tela?.getContext();
    if (!tela || !ctx) return chave;
    // O eixo x do desenho acompanha a fachada; o eixo y continua vertical.
    const topo = inclinacao < 0 ? folga + largura * INCLINACAO : folga;
    ctx.setTransform(d, inclinacao * d, 0, d, folga * d, topo * d);
    const caixa = (x: number, y: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, largura, altura, 6);
    };
    caixa(1, 2.5);
    ctx.fillStyle = "rgba(60, 35, 20, 0.35)";
    ctx.fill();
    caixa(0, 0);
    ctx.fillStyle = "#fff6df";
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#4a3728";
    ctx.stroke();
    ctx.font = fonte;
    ctx.fillStyle = "#3a2e1f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    linhas.forEach((linha, k) => {
      ctx.fillText(linha, largura / 2, 4 + 6 + k * 12);
    });
    tela.refresh();
    return chave;
  }

  private desenharEdificio(edificio: Edificio): void {
    const { centro, porta, id, frente, rotulo } = edificio;
    const d = DESENHO_DO_EDIFICIO;
    const ehOPonto = id === PONTO_DA_EMPRESA;
    const imagemNoLote = (textura: string) =>
      this.add
        .image(centro.x, centro.y, textura)
        .setOrigin(d.ancoraX / d.largura, d.ancoraY / d.altura)
        .setDisplaySize(d.largura, d.altura)
        .setDepth(centro.y);
    const predio = imagemNoLote(`edificio:${id}`);
    if (ehOPonto) {
      this.doPonto.push(predio);
      this.doTerreno.push(imagemNoLote("terreno-vago"));
    }

    // Placa com o nome, inclinada como a fachada da porta.
    const sentido = frente === "direita" ? -1 : 1;
    // A placa só é desenhada depois que a fonte carrega, para o texto sair na fonte certa.
    const colocarPlacas = () => {
      if (!this.sys.isActive()) return;
      const placa = (chave: string, texto: string, altura: number) =>
        this.add
          .image(
            centro.x - sentido * PLACA.lado,
            centro.y - altura,
            this.texturaDaPlaca(chave, texto, frente),
          )
          .setScale(1 / this.densidade)
          .setDepth(900);
      const doPredio = placa(`placa:${id}`, rotulo, PLACA.altura);
      if (ehOPonto) {
        this.doPonto.push(doPredio);
        // No terreno não há telhado: a placa fica mais baixa.
        this.doTerreno.push(placa("placa:terreno-vago", "Vende-se", PLACA.altura - 22));
        this.atualizarPonto(false);
      }
    };
    document.fonts.load(`800 12px ${FONTE}`).then(colocarPlacas, colocarPlacas);

    // NPC ao lado da porta, encostado na parede e virado para a rua.
    const npc = { x: porta.x + sentido * 32, y: porta.y + 6 };
    const boneco = this.add
      .image(npc.x, npc.y, `npc:${id}`)
      .setOrigin(BONECO.ancoraX / BONECO.largura, BONECO.ancoraY / BONECO.altura)
      .setDisplaySize(BONECO.largura, BONECO.altura)
      .setDepth(npc.y);
    // Ninguém atende num terreno vazio.
    if (ehOPonto) this.doPonto.push(boneco);

    // Indicador de oferta: balão com "!" acima do telhado.
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
      .container(centro.x, centro.y - ALTURA_DO_BALAO, [balao, sinal])
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
