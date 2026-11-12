> **Alterado pelo [ADR-0010](0010-hamburgueria-limitada.md):** a campanha passou a ter 6 capítulos, numa hamburgueria. Os 6 estabelecimentos continuam.

# ADR-0008 — O MVP é a campanha dos capítulos 1 a 7

**Status:** aceito

## Contexto
A história da campanha (`referencias/historia-campanha.md`) cobre fundação, imóvel,
equipamentos, mercadorias, vendas, despesas e fechamento. O MVP anterior tinha só
compras, vendas e tributos.

## Decisão
- O MVP é a campanha dos **capítulos 1 a 7** ([campanha.md](../campanha.md)).
- Entram no MVP: capital social de S.A., imobilizado (terrenos, edificações, móveis,
  equipamentos), despesas (salários e energia), depreciação mensal, tributos sobre
  mercadorias a partir do capítulo 4, DRE e Balanço.
- **Seis estabelecimentos:** Minha Loja, Fornecedor (Distribuidora), Banco,
  Escritório Contábil, Posto Fiscal e Imobiliária.
- O capítulo 8 (empréstimos, veículos, propriedade para investimento, inadimplência,
  fechamento anual) fica para depois do MVP.

## Consequências
- O MVP fica maior, mas conta uma história completa, do zero ao primeiro balanço.
- O teste dourado principal passa a ser `cenario-campanha.md`.
- Simplificações didáticas explícitas (📘 em `regras-contabeis.md`) cobrem o que a
  campanha deixa de fora: encargos da folha, ICMS no imobilizado, ITBI, valor residual.
