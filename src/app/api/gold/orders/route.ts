import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";
import { getCurrentGoldPrice, nextOrderNo, unitPriceMils } from "@/lib/gold";

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const orders = await prisma.goldOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: true, sourceAccount: { select: { name: true } } },
  });
  return ok({ orders });
});

const OrderSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(20),
  fulfillment: z.enum(["DELIVERY", "VAULT"]),
  sourceAccountId: z.string().min(1),
});

export const POST = withApi(async (req) => {
  const user = await requireSessionUser();
  const body = OrderSchema.parse(await req.json());

  const { pricePerGramMils } = await getCurrentGoldPrice();
  const orderNo = await nextOrderNo();

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.goldProduct.findUnique({ where: { id: body.productId } });
    if (!product) throw new ApiError(404, "Product not found.");
    if (product.stockQty < body.qty) {
      throw new ApiError(422, `Only ${product.stockQty} unit(s) of the ${product.weightGrams}g bar in stock.`);
    }

    const account = await tx.account.findFirst({
      where: { id: body.sourceAccountId, userId: user.id },
    });
    if (!account) throw new ApiError(404, "Source account not found.");

    const unit = unitPriceMils(pricePerGramMils, product.weightGrams, product.premiumPct);
    const total = unit * body.qty;
    if (account.balanceMils < total) {
      throw new ApiError(422, `Insufficient funds in ${account.name} for this purchase.`);
    }

    await tx.account.update({
      where: { id: account.id },
      data: { balanceMils: { decrement: total } },
    });
    await tx.goldProduct.update({
      where: { id: product.id },
      data: { stockQty: { decrement: body.qty } },
    });
    await tx.transaction.create({
      data: {
        accountId: account.id,
        type: "DEBIT",
        category: "Gold",
        merchant: `${product.brand} ${product.weightGrams}g bar × ${body.qty}`,
        amountMils: total,
        note: `Order ${orderNo} — ${body.fulfillment === "VAULT" ? "stored in vault" : "home delivery"}`,
      },
    });
    const order = await tx.goldOrder.create({
      data: {
        orderNo,
        userId: user.id,
        productId: product.id,
        qty: body.qty,
        unitPriceMils: unit,
        totalMils: total,
        fulfillment: body.fulfillment,
        sourceAccountId: account.id,
        status: body.fulfillment === "VAULT" ? "IN_VAULT" : "PROCESSING",
      },
      include: { product: true },
    });
    return order;
  });

  return ok({ order: result }, { status: 201 });
});
