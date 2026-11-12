import { agrupar, type Calculo, credito, debito, type Rascunho, rascunho } from "./calculo";
import { type TipoDeItem, tipoDoItem } from "./catalogo";
import {
  aplicarAliquota,
  type Centavos,
  exigirInteiroNaoNegativo,
  exigirInteiroPositivo,
  multiplicarEDividir,
  type PontosBase,
} from "./dinheiro";
import { ErroDeOperacao } from "./erros";
import { ESTOQUE_VAZIO, entradaNoEstoque, saidaDoEstoque } from "./estoque";
import type { CodigoConta, PapeisDeContas } from "./plano-de-contas";
import { type Movimentos, saldoCredor, saldoDevedor } from "./razao";
import type { IdRegra } from "./regras";
import type {
  EstadoContabil,
  ItemDevolvido,
  ItemMercadoria,
  LinhaDeNota,
  MeioDePagamento,
  NotaRegistrada,
  Operacao,
  Partida,
  SaldoDeEstoque,
} from "./tipos";

/**
 * Operações comerciais: compras e vendas com vários itens, devoluções, abatimentos,
 * consignação, material de consumo e fabricação (seções 15 a 21 das regras).
 */

type De<T extends Operacao["tipo"]> = Extract<Operacao, { tipo: T }>;
type Estoque = Readonly<Record<string, SaldoDeEstoque>>;

const UM_INTEIRO: PontosBase = 10_000;

function contaDeEstoque(papeis: PapeisDeContas, tipo: TipoDeItem): CodigoConta {
  switch (tipo) {
    case "mercadoria":
      return papeis.estoque;
    case "insumo":
      return papeis.estoqueInsumos;
    case "consumo":
      return papeis.materialDeConsumo;
    case "produto_acabado":
      return papeis.produtosAcabados;
  }
}

const contaDoMeio = (papeis: PapeisDeContas, meio: MeioDePagamento): CodigoConta =>
  meio === "caixa" ? papeis.caixa : papeis.bancos;

function exigirItens(itens: readonly ItemMercadoria[], operacao: string): void {
  if (itens.length === 0) {
    throw new ErroDeOperacao("valor_invalido", `A ${operacao} não tem itens.`);
  }
  const vistos = new Set<string>();
  for (const item of itens) {
    exigirInteiroPositivo(item.quantidade, "Quantidade");
    exigirInteiroPositivo(item.precoUnitarioCentavos, "Preço unitário");
    if (vistos.has(item.produto)) {
      throw new ErroDeOperacao(
        "valor_invalido",
        `A ${operacao} repete o produto "${item.produto}": junte as quantidades numa linha só.`,
      );
    }
    vistos.add(item.produto);
  }
}

function exigirDesconto(desconto: PontosBase): void {
  exigirInteiroNaoNegativo(desconto, "Desconto");
  if (desconto >= UM_INTEIRO) {
    throw new ErroDeOperacao("valor_invalido", "O desconto deve ser menor que 100%.");
  }
}

/**
 * R-NOT-02: rateia um valor na proporção dos pesos, arredondando cada parcela meio
 * para cima. A diferença de centavos vai para a linha de maior peso.
 */
export function ratear(total: Centavos, pesos: readonly number[]): Centavos[] {
  const soma = pesos.reduce((s, p) => s + p, 0);
  if (total === 0 || soma === 0) return pesos.map(() => 0);
  const partes = pesos.map((peso) => multiplicarEDividir(total, peso, soma));
  const diferenca = total - partes.reduce((s, p) => s + p, 0);
  const maior = pesos.indexOf(Math.max(...pesos));
  partes[maior] = (partes[maior] ?? 0) + diferenca;
  return partes;
}

function exigirNotaNova(estado: EstadoContabil, nota: string | undefined): void {
  if (nota !== undefined && nota in estado.notas) {
    throw new ErroDeOperacao("nota_invalida", `Já existe uma nota com o identificador "${nota}".`);
  }
}

// ---------------------------------------------------------------------------
// Compra
// ---------------------------------------------------------------------------

export function calcularCompra(estado: EstadoContabil, operacao: De<"compra">): Calculo {
  const { papeis } = estado.planoDeContas;
  const { parametros, catalogo } = estado;
  exigirItens(operacao.itens, "compra");
  exigirInteiroNaoNegativo(operacao.ipiAliquota, "Alíquota do IPI");
  exigirInteiroNaoNegativo(operacao.freteCentavos, "Frete");
  const desconto = operacao.descontoComercial ?? 0;
  exigirDesconto(desconto);
  if (operacao.condicao.tipo === "prazo") {
    exigirInteiroPositivo(operacao.condicao.dias, "Prazo em dias");
  }
  exigirNotaNova(estado, operacao.nota);
  for (const item of operacao.itens) {
    if (item.produto in catalogo.receitas) {
      throw new ErroDeOperacao(
        "valor_invalido",
        `"${item.produto}" é preparado na casa: compram-se os insumos, não o produto pronto.`,
        "R-INS-03",
      );
    }
  }

  const ipiRecuperavel = operacao.ipiRecuperavel === true;
  // R-DSC-01: o desconto comercial não é registrado; a compra entra pelo líquido.
  const liquidos = operacao.itens.map((item) => {
    const bruto = item.quantidade * item.precoUnitarioCentavos;
    return bruto - aplicarAliquota(bruto, desconto);
  });
  const descontoTotal =
    operacao.itens.reduce((s, item) => s + item.quantidade * item.precoUnitarioCentavos, 0) -
    liquidos.reduce((s, v) => s + v, 0);
  // R-NOT-02: frete rateado pelo valor dos produtos de cada linha.
  const fretes = ratear(operacao.freteCentavos, liquidos);

  let estoque: Estoque = estado.estoque;
  const debitosDeEstoque: Partida[] = [];
  const linhas: LinhaDeNota[] = [];
  const tipos = new Set<TipoDeItem>();
  let totalNota = 0;
  let icmsTotal = 0;
  let ipiTotal = 0;
  let ipiCreditado = 0;
  let custoTotal = 0;

  operacao.itens.forEach((item, indice) => {
    const liquido = liquidos[indice] ?? 0;
    const frete = fretes[indice] ?? 0;
    const tipo = tipoDoItem(catalogo, item.produto);
    tipos.add(tipo);
    // R-NOT-01: tributos calculados e arredondados por linha.
    // R-IPI-01, R-IPI-02: o IPI vem na oferta.
    const ipi = aplicarAliquota(liquido, operacao.ipiAliquota);
    // R-FRE-01: o frete da nota integra o total, o custo e a base do ICMS.
    const totalDaLinha = liquido + ipi + frete;
    // R-MCO-01: material de uso e consumo não dá crédito de ICMS.
    // R-ICMS-02, R-ICMS-03: ICMS por dentro; base = produtos + frete, sem o IPI.
    const icms = tipo === "consumo" ? 0 : aplicarAliquota(liquido + frete, parametros.icmsAliquota);
    // R-IPI-04: nas compras para a fábrica, o IPI é recuperável.
    const creditoDeIpi = ipiRecuperavel && tipo !== "consumo" ? ipi : 0;
    // R-COM-01: custo = produtos + IPI + frete − tributos recuperáveis.
    const custo = totalDaLinha - icms - creditoDeIpi;

    // R-EST-01, R-EST-02: a entrada atualiza quantidade e valor na hora.
    estoque = {
      ...estoque,
      [item.produto]: entradaNoEstoque(
        estoque[item.produto] ?? ESTOQUE_VAZIO,
        item.quantidade,
        custo,
      ),
    };
    debitosDeEstoque.push(debito(contaDeEstoque(papeis, tipo), custo));
    linhas.push({
      produto: item.produto,
      quantidade: item.quantidade,
      quantidadeDevolvida: 0,
      liquidoCentavos: liquido,
      ipiCentavos: ipi,
      freteCentavos: frete,
      icmsCentavos: icms,
      pisCentavos: 0,
      cofinsCentavos: 0,
      custoCentavos: custo,
    });
    totalNota += totalDaLinha;
    icmsTotal += icms;
    ipiTotal += ipi;
    ipiCreditado += creditoDeIpi;
    custoTotal += custo;
  });

  const aVista = operacao.condicao.tipo === "avista";
  // R-COM-02: à vista credita Caixa ou Bancos; a prazo credita Fornecedores.
  const contrapartida =
    operacao.condicao.tipo === "avista"
      ? contaDoMeio(papeis, operacao.condicao.meio)
      : papeis.fornecedores;

  const regras: IdRegra[] = ["R-COM-01", "R-COM-02", "R-COM-03", "R-COM-04"];
  if (icmsTotal > 0 || !tipos.has("consumo")) regras.push("R-ICMS-02", "R-ICMS-03", "R-ICMS-04");
  if (tipos.has("insumo")) regras.push("R-INS-02");
  if (tipos.has("consumo")) regras.push("R-MCO-01");
  if (operacao.itens.length > 1) regras.push("R-NOT-01", "R-NOT-03");
  if (operacao.itens.length > 1 && operacao.freteCentavos > 0) regras.push("R-NOT-02");
  if (desconto > 0) regras.push("R-DSC-01");
  if (ipiTotal > 0) regras.push(ipiCreditado > 0 ? "R-IPI-04" : "R-IPI-01");
  if (operacao.freteCentavos > 0) regras.push("R-FRE-01");

  const oQue =
    tipos.size > 1
      ? ""
      : tipos.has("insumo")
        ? " de insumos"
        : tipos.has("consumo")
          ? " de material de consumo"
          : " de mercadorias";

  const notas: Readonly<Record<string, NotaRegistrada>> | undefined =
    operacao.nota === undefined
      ? undefined
      : {
          ...estado.notas,
          [operacao.nota]: {
            tipo: "compra",
            aPrazo: !aVista,
            meio: operacao.condicao.tipo === "avista" ? operacao.condicao.meio : null,
            ipiRecuperavel,
            linhas,
          },
        };

  return {
    imobilizado: estado.imobilizado,
    estoque,
    ...(notas ? { notas } : {}),
    valores: {
      totalNota,
      ipi: ipiTotal,
      icms: icmsTotal,
      custoEstoque: custoTotal,
      ...(descontoTotal > 0 ? { desconto: descontoTotal } : {}),
    },
    rascunhos: [
      // R-COM-03, R-NOT-03: um débito por conta de estoque, somando os itens da conta.
      rascunho(`Compra${oQue} ${aVista ? "à vista" : "a prazo"}`, regras, [
        ...agrupar(debitosDeEstoque),
        debito(papeis.icmsARecuperar, icmsTotal),
        debito(papeis.ipiARecuperar, ipiCreditado),
        credito(contrapartida, totalNota),
      ]),
    ],
  };
}

// ---------------------------------------------------------------------------
// Venda
// ---------------------------------------------------------------------------

interface Baixa {
  readonly estoque: Estoque;
  readonly custoCentavos: Centavos;
  /** Conta de custo debitada (CMV ou CPV) e as contas de estoque creditadas. */
  readonly contaDeCusto: CodigoConta;
  readonly creditos: readonly Partida[];
}

/** Baixa do estoque de uma linha de venda: do próprio item ou dos insumos da receita. */
function baixarParaVenda(estado: EstadoContabil, estoque: Estoque, item: ItemMercadoria): Baixa {
  const { papeis } = estado.planoDeContas;
  const receita = estado.catalogo.receitas[item.produto];
  if (receita) {
    // R-INS-03: cada unidade consome os insumos da receita, pelo custo médio de cada um.
    let atual = estoque;
    let custo = 0;
    const creditos: Partida[] = [];
    for (const ingrediente of receita) {
      const necessario = ingrediente.quantidade * item.quantidade;
      const saldo = atual[ingrediente.produto] ?? ESTOQUE_VAZIO;
      if (necessario > saldo.quantidade) {
        // R-INS-04: a venda é bloqueada se faltar qualquer insumo da receita.
        throw new ErroDeOperacao(
          "estoque_insuficiente",
          `Falta ${ingrediente.produto} para preparar ${item.quantidade} un.: há ${saldo.quantidade} e são necessárias ${necessario}.`,
          "R-INS-04",
        );
      }
      const saida = saidaDoEstoque(saldo, necessario);
      atual = { ...atual, [ingrediente.produto]: saida.saldo };
      custo += saida.cmvCentavos;
      creditos.push(
        credito(
          contaDeEstoque(papeis, tipoDoItem(estado.catalogo, ingrediente.produto)),
          saida.cmvCentavos,
        ),
      );
    }
    return { estoque: atual, custoCentavos: custo, contaDeCusto: papeis.cpv, creditos };
  }

  const tipo = tipoDoItem(estado.catalogo, item.produto);
  if (tipo === "insumo" || tipo === "consumo") {
    throw new ErroDeOperacao(
      "caso_nao_coberto",
      `As regras não cobrem a venda direta de ${tipo === "insumo" ? "insumo" : "material de consumo"} ("${item.produto}").`,
    );
  }
  // R-EST-03, R-EST-04
  const saida = saidaDoEstoque(estoque[item.produto] ?? ESTOQUE_VAZIO, item.quantidade);
  return {
    estoque: { ...estoque, [item.produto]: saida.saldo },
    custoCentavos: saida.cmvCentavos,
    contaDeCusto: tipo === "produto_acabado" ? papeis.cpv : papeis.cmv,
    creditos: [credito(contaDeEstoque(papeis, tipo), saida.cmvCentavos)],
  };
}

export function calcularVenda(estado: EstadoContabil, operacao: De<"venda">): Calculo {
  const { papeis } = estado.planoDeContas;
  const { parametros, catalogo } = estado;
  exigirItens(operacao.itens, "venda");
  const desconto = operacao.descontoIncondicional ?? 0;
  exigirDesconto(desconto);
  const ipiAliquota = operacao.ipiAliquota ?? 0;
  exigirInteiroNaoNegativo(ipiAliquota, "Alíquota do IPI");
  if (operacao.condicao.tipo === "prazo") {
    exigirInteiroPositivo(operacao.condicao.dias, "Prazo em dias");
  }
  exigirNotaNova(estado, operacao.nota);
  if (ipiAliquota > 0) {
    const preparado = operacao.itens.find((item) => item.produto in catalogo.receitas);
    if (preparado) {
      // R-IPI-03: o preparo de alimentos na lanchonete não é industrialização.
      throw new ErroDeOperacao(
        "valor_invalido",
        `A venda de "${preparado.produto}" não tem IPI: o preparo na lanchonete não é industrialização.`,
        "R-IPI-03",
      );
    }
  }

  let estoque: Estoque = estado.estoque;
  const linhas: LinhaDeNota[] = [];
  let bruto = 0;
  let liquidoTotal = 0;
  let icmsTotal = 0;
  let pisTotal = 0;
  let cofinsTotal = 0;
  let ipiTotal = 0;
  let cmv = 0;
  let cpv = 0;
  const creditosDoCmv: Partida[] = [];
  const creditosDoCpv: Partida[] = [];
  let temReceita = false;

  for (const item of operacao.itens) {
    const brutoDaLinha = item.quantidade * item.precoUnitarioCentavos;
    // R-DSC-03: a receita bruta é registrada cheia; os tributos incidem sobre o líquido.
    const liquido = brutoDaLinha - aplicarAliquota(brutoDaLinha, desconto);
    // R-ICMS-02: ICMS por dentro, sobre o valor da operação.
    const icms = aplicarAliquota(liquido, parametros.icmsAliquota);
    // R-PC-01, R-PC-02: regime cumulativo; base = receita − ICMS destacado.
    const pis = aplicarAliquota(liquido - icms, parametros.pisAliquota);
    const cofins = aplicarAliquota(liquido - icms, parametros.cofinsAliquota);
    // R-IPI-05: o IPI é cobrado por fora e não é receita.
    const ipi = aplicarAliquota(liquido, ipiAliquota);

    const baixa = baixarParaVenda(estado, estoque, item);
    estoque = baixa.estoque;
    if (item.produto in catalogo.receitas) temReceita = true;
    if (baixa.contaDeCusto === papeis.cmv) {
      cmv += baixa.custoCentavos;
      creditosDoCmv.push(...baixa.creditos);
    } else {
      cpv += baixa.custoCentavos;
      creditosDoCpv.push(...baixa.creditos);
    }

    linhas.push({
      produto: item.produto,
      quantidade: item.quantidade,
      quantidadeDevolvida: 0,
      liquidoCentavos: liquido,
      ipiCentavos: ipi,
      freteCentavos: 0,
      icmsCentavos: icms,
      pisCentavos: pis,
      cofinsCentavos: cofins,
      custoCentavos: baixa.custoCentavos,
    });
    bruto += brutoDaLinha;
    liquidoTotal += liquido;
    icmsTotal += icms;
    pisTotal += pis;
    cofinsTotal += cofins;
    ipiTotal += ipi;
  }

  const aVista = operacao.condicao.tipo === "avista";
  const soMercadorias = cpv === 0;
  const descontoTotal = bruto - liquidoTotal;
  const regrasDaVenda: IdRegra[] = ["R-VEN-01", "R-GER-03"];
  if (operacao.itens.length > 1) regrasDaVenda.push("R-NOT-01");
  if (descontoTotal > 0) regrasDaVenda.push("R-DSC-03");
  if (ipiTotal > 0) regrasDaVenda.push("R-IPI-05", "R-IPI-07");

  const rascunhos: Rascunho[] = [
    // R-VEN-01; R-GER-03: a receita é reconhecida na venda, recebida ou não.
    rascunho(
      `Venda${soMercadorias ? " de mercadorias" : ""} ${aVista ? "à vista" : "a prazo"}`,
      regrasDaVenda,
      [
        debito(aVista ? papeis.caixa : papeis.clientes, liquidoTotal + ipiTotal),
        debito(papeis.descontosIncondicionais, descontoTotal),
        credito(papeis.receitaBruta, bruto),
        credito(papeis.ipiARecolher, ipiTotal),
      ],
    ),
    // R-ICMS-05
    rascunho(
      "ICMS sobre a venda",
      ["R-ICMS-05", "R-ICMS-02", "R-VEN-02"],
      [debito(papeis.icmsSobreVendas, icmsTotal), credito(papeis.icmsARecolher, icmsTotal)],
    ),
    // R-PC-03
    rascunho(
      "PIS sobre a venda",
      ["R-PC-03", "R-PC-01", "R-PC-02", "R-VEN-02"],
      [debito(papeis.pisSobreFaturamento, pisTotal), credito(papeis.pisARecolher, pisTotal)],
    ),
    rascunho(
      "COFINS sobre a venda",
      ["R-PC-03", "R-PC-01", "R-PC-02", "R-VEN-02"],
      [
        debito(papeis.cofinsSobreFaturamento, cofinsTotal),
        credito(papeis.cofinsARecolher, cofinsTotal),
      ],
    ),
    // R-VEN-02
    rascunho(
      "Custo das mercadorias vendidas",
      ["R-VEN-02", "R-EST-03", "R-COM-04"],
      [debito(papeis.cmv, cmv), ...agrupar(creditosDoCmv)],
    ),
    rascunho(
      "Custo dos produtos vendidos",
      temReceita ? ["R-VEN-02", "R-INS-03", "R-EST-03"] : ["R-VEN-02", "R-PRD-01", "R-EST-03"],
      [debito(papeis.cpv, cpv), ...agrupar(creditosDoCpv)],
    ),
  ];

  const notas: Readonly<Record<string, NotaRegistrada>> | undefined =
    operacao.nota === undefined
      ? undefined
      : {
          ...estado.notas,
          [operacao.nota]: {
            tipo: "venda",
            aPrazo: !aVista,
            meio: null,
            ipiRecuperavel: false,
            linhas,
          },
        };

  return {
    imobilizado: estado.imobilizado,
    estoque,
    ...(notas ? { notas } : {}),
    valores: {
      receitaBruta: bruto,
      icms: icmsTotal,
      pis: pisTotal,
      cofins: cofinsTotal,
      cmv: cmv + cpv,
      ...(ipiTotal > 0 ? { ipi: ipiTotal } : {}),
      ...(descontoTotal > 0 ? { desconto: descontoTotal } : {}),
    },
    rascunhos,
  };
}

// ---------------------------------------------------------------------------
// Devoluções e abatimentos
// ---------------------------------------------------------------------------

function notaDe(estado: EstadoContabil, id: string, tipo: "compra" | "venda"): NotaRegistrada {
  const nota = estado.notas[id];
  if (!nota || nota.tipo !== tipo) {
    throw new ErroDeOperacao(
      "nota_invalida",
      `Não há nota de ${tipo} com o identificador "${id}".`,
    );
  }
  return nota;
}

interface ParteDevolvida {
  readonly linha: LinhaDeNota;
  readonly quantidade: number;
  /** Parcela proporcional de cada valor da linha. */
  readonly liquido: Centavos;
  readonly ipi: Centavos;
  readonly frete: Centavos;
  readonly icms: Centavos;
  readonly pis: Centavos;
  readonly cofins: Centavos;
  readonly custo: Centavos;
}

function partesDevolvidas(
  nota: NotaRegistrada,
  itens: readonly ItemDevolvido[],
  regra: IdRegra,
): ParteDevolvida[] {
  if (itens.length === 0) {
    throw new ErroDeOperacao("valor_invalido", "A devolução não tem itens.", regra);
  }
  return itens.map((item) => {
    exigirInteiroPositivo(item.quantidade, "Quantidade devolvida");
    const linha = nota.linhas.find((l) => l.produto === item.produto);
    if (!linha) {
      throw new ErroDeOperacao(
        "nota_invalida",
        `A nota não tem o produto "${item.produto}".`,
        regra,
      );
    }
    const disponivel = linha.quantidade - linha.quantidadeDevolvida;
    if (item.quantidade > disponivel) {
      throw new ErroDeOperacao(
        "nota_invalida",
        `Só é possível devolver ${disponivel} un. de "${item.produto}" desta nota.`,
        regra,
      );
    }
    const parte = (valor: Centavos) =>
      multiplicarEDividir(valor, item.quantidade, linha.quantidade);
    return {
      linha,
      quantidade: item.quantidade,
      liquido: parte(linha.liquidoCentavos),
      ipi: parte(linha.ipiCentavos),
      frete: parte(linha.freteCentavos),
      icms: parte(linha.icmsCentavos),
      pis: parte(linha.pisCentavos),
      cofins: parte(linha.cofinsCentavos),
      custo: parte(linha.custoCentavos),
    };
  });
}

function marcarDevolvido(nota: NotaRegistrada, partes: readonly ParteDevolvida[]): NotaRegistrada {
  return {
    ...nota,
    linhas: nota.linhas.map((linha) => {
      const parte = partes.find((p) => p.linha === linha);
      return parte
        ? { ...linha, quantidadeDevolvida: linha.quantidadeDevolvida + parte.quantidade }
        : linha;
    }),
  };
}

const somarPartes = (partes: readonly ParteDevolvida[], campo: keyof ParteDevolvida): Centavos =>
  partes.reduce((s, p) => s + (p[campo] as number), 0);

/** R-DVC-01 */
export function calcularDevolucaoDeCompra(
  estado: EstadoContabil,
  operacao: De<"devolucao_compra">,
  movimentos: Movimentos,
): Calculo {
  const { papeis } = estado.planoDeContas;
  const nota = notaDe(estado, operacao.nota, "compra");
  const partes = partesDevolvidas(nota, operacao.itens, "R-DVC-01");

  let estoque: Estoque = estado.estoque;
  const creditosDeEstoque: Partida[] = [];
  for (const parte of partes) {
    const saldo = estoque[parte.linha.produto] ?? ESTOQUE_VAZIO;
    // Sai pelo custo com que aquela compra entrou, não pelo custo médio do dia.
    if (parte.quantidade > saldo.quantidade || parte.custo > saldo.valorCentavos) {
      throw new ErroDeOperacao(
        "estoque_insuficiente",
        `Não há "${parte.linha.produto}" suficiente em estoque para devolver ${parte.quantidade} un.`,
        "R-DVC-01",
      );
    }
    estoque = {
      ...estoque,
      [parte.linha.produto]: {
        quantidade: saldo.quantidade - parte.quantidade,
        valorCentavos: saldo.valorCentavos - parte.custo,
      },
    };
    creditosDeEstoque.push(
      credito(
        contaDeEstoque(papeis, tipoDoItem(estado.catalogo, parte.linha.produto)),
        parte.custo,
      ),
    );
  }

  const total =
    somarPartes(partes, "liquido") + somarPartes(partes, "ipi") + somarPartes(partes, "frete");
  const icms = somarPartes(partes, "icms");
  const custo = somarPartes(partes, "custo");
  // O que não é custo nem ICMS é o IPI que tinha virado crédito.
  const ipiCreditado = total - icms - custo;

  if (nota.aPrazo && total > saldoCredor(movimentos, papeis.fornecedores)) {
    throw new ErroDeOperacao(
      "caso_nao_coberto",
      "As regras não cobrem a devolução de compra a prazo que já foi paga.",
      "R-DVC-01",
    );
  }
  // Compra a prazo: reduz a dívida. Compra à vista: o fornecedor devolve o dinheiro.
  const contrapartida = nota.aPrazo
    ? papeis.fornecedores
    : contaDoMeio(papeis, nota.meio ?? "caixa");

  return {
    imobilizado: estado.imobilizado,
    estoque,
    notas: { ...estado.notas, [operacao.nota]: marcarDevolvido(nota, partes) },
    valores: { totalNota: total, icms, custoEstoque: custo },
    rascunhos: [
      rascunho(
        "Devolução de compra",
        ["R-DVC-01"],
        [
          debito(contrapartida, total),
          ...agrupar(creditosDeEstoque),
          credito(papeis.icmsARecuperar, icms),
          credito(papeis.ipiARecuperar, ipiCreditado),
        ],
      ),
    ],
  };
}

/** R-ABC-01 📘 */
export function calcularAbatimentoDeCompra(
  estado: EstadoContabil,
  operacao: De<"abatimento_compra">,
  movimentos: Movimentos,
): Calculo {
  const { papeis } = estado.planoDeContas;
  exigirInteiroPositivo(operacao.valorCentavos, "Valor do abatimento");
  const nota = notaDe(estado, operacao.nota, "compra");
  if (!nota.linhas.some((l) => l.produto === operacao.produto)) {
    throw new ErroDeOperacao(
      "nota_invalida",
      `A nota não tem o produto "${operacao.produto}".`,
      "R-ABC-01",
    );
  }
  const saldo = estado.estoque[operacao.produto] ?? ESTOQUE_VAZIO;
  // Reduz o custo do que está em estoque, sem mudar a quantidade.
  if (saldo.quantidade === 0 || operacao.valorCentavos >= saldo.valorCentavos) {
    throw new ErroDeOperacao(
      "caso_nao_coberto",
      "As regras não cobrem o abatimento sobre mercadoria que já saiu do estoque.",
      "R-ABC-01",
    );
  }
  if (nota.aPrazo && operacao.valorCentavos > saldoCredor(movimentos, papeis.fornecedores)) {
    throw new ErroDeOperacao(
      "excede_saldo",
      "O abatimento não pode ser maior que o saldo de Fornecedores.",
      "R-ABC-01",
    );
  }
  const contrapartida = nota.aPrazo
    ? papeis.fornecedores
    : contaDoMeio(papeis, nota.meio ?? "caixa");
  return {
    imobilizado: estado.imobilizado,
    estoque: {
      ...estado.estoque,
      [operacao.produto]: {
        quantidade: saldo.quantidade,
        valorCentavos: saldo.valorCentavos - operacao.valorCentavos,
      },
    },
    valores: {},
    rascunhos: [
      rascunho(
        "Abatimento sobre compra",
        ["R-ABC-01"],
        [
          debito(contrapartida, operacao.valorCentavos),
          credito(
            contaDeEstoque(papeis, tipoDoItem(estado.catalogo, operacao.produto)),
            operacao.valorCentavos,
          ),
        ],
      ),
    ],
  };
}

/** R-DVV-01 */
export function calcularDevolucaoDeVenda(
  estado: EstadoContabil,
  operacao: De<"devolucao_venda">,
  movimentos: Movimentos,
): Calculo {
  const { papeis } = estado.planoDeContas;
  const nota = notaDe(estado, operacao.nota, "venda");
  for (const item of operacao.itens) {
    if (item.produto in estado.catalogo.receitas) {
      throw new ErroDeOperacao(
        "caso_nao_coberto",
        `"${item.produto}" é preparado na hora e não volta ao estoque: não há devolução de venda.`,
        "R-DVV-01",
      );
    }
  }
  const partes = partesDevolvidas(nota, operacao.itens, "R-DVV-01");

  let estoque: Estoque = estado.estoque;
  const retornos: Partida[] = [];
  const estornosDeCusto: Partida[] = [];
  for (const parte of partes) {
    const tipo = tipoDoItem(estado.catalogo, parte.linha.produto);
    // Volta ao estoque pelo custo com que saiu.
    estoque = {
      ...estoque,
      [parte.linha.produto]: entradaNoEstoque(
        estoque[parte.linha.produto] ?? ESTOQUE_VAZIO,
        parte.quantidade,
        parte.custo,
      ),
    };
    retornos.push(debito(contaDeEstoque(papeis, tipo), parte.custo));
    estornosDeCusto.push(
      credito(tipo === "produto_acabado" ? papeis.cpv : papeis.cmv, parte.custo),
    );
  }

  const liquido = somarPartes(partes, "liquido");
  const ipi = somarPartes(partes, "ipi");
  const icms = somarPartes(partes, "icms");
  const pis = somarPartes(partes, "pis");
  const cofins = somarPartes(partes, "cofins");
  if (nota.aPrazo && liquido + ipi > saldoDevedor(movimentos, papeis.clientes)) {
    throw new ErroDeOperacao(
      "caso_nao_coberto",
      "As regras não cobrem a devolução de venda a prazo que já foi recebida.",
      "R-DVV-01",
    );
  }

  return {
    imobilizado: estado.imobilizado,
    estoque,
    notas: { ...estado.notas, [operacao.nota]: marcarDevolvido(nota, partes) },
    valores: {
      receitaBruta: liquido,
      icms,
      pis,
      cofins,
      cmv: somarPartes(partes, "custo"),
      ...(ipi > 0 ? { ipi } : {}),
    },
    rascunhos: [
      rascunho(
        "Devolução de venda",
        ["R-DVV-01"],
        [
          debito(papeis.devolucoesDeVendas, liquido),
          debito(papeis.ipiARecolher, ipi),
          credito(nota.aPrazo ? papeis.clientes : papeis.caixa, liquido + ipi),
        ],
      ),
      rascunho(
        "Estorno do ICMS da venda devolvida",
        ["R-DVV-01"],
        [debito(papeis.icmsARecolher, icms), credito(papeis.icmsSobreVendas, icms)],
      ),
      rascunho(
        "Estorno do PIS da venda devolvida",
        ["R-DVV-01"],
        [debito(papeis.pisARecolher, pis), credito(papeis.pisSobreFaturamento, pis)],
      ),
      rascunho(
        "Estorno da COFINS da venda devolvida",
        ["R-DVV-01"],
        [debito(papeis.cofinsARecolher, cofins), credito(papeis.cofinsSobreFaturamento, cofins)],
      ),
      rascunho(
        "Retorno da mercadoria devolvida ao estoque",
        ["R-DVV-01"],
        [...agrupar(retornos), ...agrupar(estornosDeCusto)],
      ),
    ],
  };
}

/** R-ABV-01 📘 */
export function calcularAbatimentoDeVenda(
  estado: EstadoContabil,
  operacao: De<"abatimento_venda">,
  movimentos: Movimentos,
): Calculo {
  const { papeis } = estado.planoDeContas;
  exigirInteiroPositivo(operacao.valorCentavos, "Valor do abatimento");
  if (
    operacao.contrapartida === "clientes" &&
    operacao.valorCentavos > saldoDevedor(movimentos, papeis.clientes)
  ) {
    throw new ErroDeOperacao(
      "excede_saldo",
      "O abatimento não pode ser maior que o saldo de Clientes.",
      "R-ABV-01",
    );
  }
  return {
    imobilizado: estado.imobilizado,
    estoque: estado.estoque,
    valores: {},
    rascunhos: [
      rascunho(
        "Abatimento sobre venda",
        ["R-ABV-01"],
        [
          debito(papeis.abatimentosSobreVendas, operacao.valorCentavos),
          credito(
            operacao.contrapartida === "clientes" ? papeis.clientes : papeis.caixa,
            operacao.valorCentavos,
          ),
        ],
      ),
    ],
  };
}

// ---------------------------------------------------------------------------
// Consignação
// ---------------------------------------------------------------------------

/** R-CSG-01, R-CSG-04 📘: não é ativo da empresa; só o controle à parte muda. */
export function calcularRecebimentoEmConsignacao(
  estado: EstadoContabil,
  operacao: De<"recebimento_consignacao">,
): Calculo {
  exigirInteiroPositivo(operacao.quantidade, "Quantidade");
  exigirInteiroPositivo(operacao.precoUnitarioCentavos, "Preço unitário");
  if (tipoDoItem(estado.catalogo, operacao.produto) !== "mercadoria") {
    throw new ErroDeOperacao(
      "caso_nao_coberto",
      "As regras só cobrem a consignação de mercadoria para revenda.",
      "R-CSG-01",
    );
  }
  const atual = estado.consignado[operacao.produto];
  if (
    atual &&
    atual.quantidade > 0 &&
    atual.precoUnitarioCentavos !== operacao.precoUnitarioCentavos
  ) {
    throw new ErroDeOperacao(
      "caso_nao_coberto",
      "As regras não cobrem lotes em consignação do mesmo produto com preços diferentes.",
      "R-CSG-01",
    );
  }
  return {
    imobilizado: estado.imobilizado,
    estoque: estado.estoque,
    valores: {},
    rascunhos: [],
    consignado: {
      ...estado.consignado,
      [operacao.produto]: {
        quantidade: (atual?.quantidade ?? 0) + operacao.quantidade,
        precoUnitarioCentavos: operacao.precoUnitarioCentavos,
      },
    },
  };
}

function exigirConsignado(
  estado: EstadoContabil,
  produto: string,
  quantidade: number,
  regra: IdRegra,
) {
  exigirInteiroPositivo(quantidade, "Quantidade");
  const atual = estado.consignado[produto];
  if (!atual || quantidade > atual.quantidade) {
    throw new ErroDeOperacao(
      "estoque_insuficiente",
      `Há ${atual?.quantidade ?? 0} un. de "${produto}" em consignação.`,
      regra,
    );
  }
  return atual;
}

/** R-CSG-02: a compra das unidades vendidas e a venda são registradas na mesma data. */
export function calcularVendaConsignada(
  estado: EstadoContabil,
  operacao: De<"venda_consignada">,
): Calculo {
  const consignado = exigirConsignado(estado, operacao.produto, operacao.quantidade, "R-CSG-02");
  const compra = calcularCompra(estado, {
    tipo: "compra",
    itens: [
      {
        produto: operacao.produto,
        quantidade: operacao.quantidade,
        precoUnitarioCentavos: consignado.precoUnitarioCentavos,
      },
    ],
    ipiAliquota: 0,
    freteCentavos: 0,
    // A dívida com o consignante nasce agora.
    condicao: { tipo: "prazo", dias: 1 },
  });
  const venda = calcularVenda(
    { ...estado, estoque: compra.estoque },
    {
      tipo: "venda",
      itens: [
        {
          produto: operacao.produto,
          quantidade: operacao.quantidade,
          precoUnitarioCentavos: operacao.precoUnitarioCentavos,
        },
      ],
      condicao: operacao.condicao,
    },
  );
  const comRegra = (r: Rascunho): Rascunho => ({ ...r, regras: [...r.regras, "R-CSG-02"] });
  return {
    imobilizado: estado.imobilizado,
    estoque: venda.estoque,
    valores: { ...compra.valores, ...venda.valores },
    rascunhos: [
      ...compra.rascunhos.map((r) =>
        comRegra({ ...r, historico: "Compra das mercadorias consignadas vendidas" }),
      ),
      ...venda.rascunhos,
    ],
    consignado: {
      ...estado.consignado,
      [operacao.produto]: {
        ...consignado,
        quantidade: consignado.quantidade - operacao.quantidade,
      },
    },
  };
}

/** R-CSG-03: devolver ao consignante o que não foi vendido não gera lançamento. */
export function calcularDevolucaoDeConsignacao(
  estado: EstadoContabil,
  operacao: De<"devolucao_consignacao">,
): Calculo {
  const consignado = exigirConsignado(estado, operacao.produto, operacao.quantidade, "R-CSG-03");
  return {
    imobilizado: estado.imobilizado,
    estoque: estado.estoque,
    valores: {},
    rascunhos: [],
    consignado: {
      ...estado.consignado,
      [operacao.produto]: {
        ...consignado,
        quantidade: consignado.quantidade - operacao.quantidade,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Material de consumo e fabricação
// ---------------------------------------------------------------------------

/** R-MCO-02: o que saiu do estoque de material de consumo no mês vira despesa. */
export function calcularInventarioDeConsumo(
  estado: EstadoContabil,
  operacao: De<"inventario_consumo">,
): Calculo {
  const { papeis } = estado.planoDeContas;
  exigirInteiroNaoNegativo(operacao.quantidadeRestante, "Quantidade restante");
  if (tipoDoItem(estado.catalogo, operacao.produto) !== "consumo") {
    throw new ErroDeOperacao(
      "valor_invalido",
      `"${operacao.produto}" não é material de consumo.`,
      "R-MCO-02",
    );
  }
  const saldo = estado.estoque[operacao.produto] ?? ESTOQUE_VAZIO;
  if (operacao.quantidadeRestante > saldo.quantidade) {
    throw new ErroDeOperacao(
      "valor_invalido",
      `O inventário não pode ser maior que o estoque: há ${saldo.quantidade} un.`,
      "R-MCO-02",
    );
  }
  const consumido = saldo.quantidade - operacao.quantidadeRestante;
  if (consumido === 0) {
    return { imobilizado: estado.imobilizado, estoque: estado.estoque, valores: {}, rascunhos: [] };
  }
  const saida = saidaDoEstoque(saldo, consumido);
  return {
    imobilizado: estado.imobilizado,
    estoque: { ...estado.estoque, [operacao.produto]: saida.saldo },
    valores: {},
    rascunhos: [
      rascunho(
        "Material de consumo usado no mês",
        ["R-MCO-02"],
        [
          debito(papeis.despesaMaterialDeConsumo, saida.cmvCentavos),
          credito(papeis.materialDeConsumo, saida.cmvCentavos),
        ],
      ),
    ],
  };
}

/** R-PRD-01 📘: transfere o custo dos insumos da receita para Produtos Acabados. */
export function calcularProducao(estado: EstadoContabil, operacao: De<"producao">): Calculo {
  const { papeis } = estado.planoDeContas;
  exigirInteiroPositivo(operacao.quantidade, "Quantidade");
  const receita = estado.catalogo.fabricacao[operacao.produto];
  if (!receita) {
    throw new ErroDeOperacao(
      "valor_invalido",
      `"${operacao.produto}" não é um produto fabricado pela empresa.`,
      "R-PRD-01",
    );
  }
  let estoque: Estoque = estado.estoque;
  let custo = 0;
  const creditos: Partida[] = [];
  for (const ingrediente of receita) {
    const necessario = ingrediente.quantidade * operacao.quantidade;
    const saldo = estoque[ingrediente.produto] ?? ESTOQUE_VAZIO;
    if (necessario > saldo.quantidade) {
      throw new ErroDeOperacao(
        "estoque_insuficiente",
        `Falta ${ingrediente.produto} para produzir ${operacao.quantidade} un.: há ${saldo.quantidade} e são necessárias ${necessario}.`,
        "R-PRD-01",
      );
    }
    const saida = saidaDoEstoque(saldo, necessario);
    estoque = { ...estoque, [ingrediente.produto]: saida.saldo };
    custo += saida.cmvCentavos;
    creditos.push(
      credito(
        contaDeEstoque(papeis, tipoDoItem(estado.catalogo, ingrediente.produto)),
        saida.cmvCentavos,
      ),
    );
  }
  estoque = {
    ...estoque,
    [operacao.produto]: entradaNoEstoque(
      estoque[operacao.produto] ?? ESTOQUE_VAZIO,
      operacao.quantidade,
      custo,
    ),
  };
  return {
    imobilizado: estado.imobilizado,
    estoque,
    valores: { custoEstoque: custo },
    rascunhos: [
      rascunho(
        "Produção transferida para produtos acabados",
        ["R-PRD-01"],
        [debito(papeis.produtosAcabados, custo), ...agrupar(creditos)],
      ),
    ],
  };
}
