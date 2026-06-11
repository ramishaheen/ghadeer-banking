import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JOD = (v: number) => Math.round(v * 1000); // to mils

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d;
}

async function main() {
  console.log("Seeding Rafiq+…");

  // Wipe in dependency order (idempotent reseeds).
  await prisma.tutorialProgress.deleteMany();
  await prisma.priceAlert.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.goldOrder.deleteMany();
  await prisma.goldPriceTick.deleteMany();
  await prisma.goldProduct.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.kycProfile.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Ahmed",
      nameAr: "أحمد",
      email: "ahmed@example.jo",
      membership: "Standard",
      avatarUrl: null,
      kycStatus: "DUE",
      kycDueAt: new Date(Date.now() + 14 * 24 * 3600_000),
    },
  });

  // Balances per the design: Checking 12,400 / Savings 30,450 → total 42,850.
  // The checking figure below is the post-history balance; seed history nets to it.
  const checking = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Regular Demand",
      type: "CHECKING",
      numberMasked: "4421",
      iban: "JO94 ETIH 0010 0000 0000 1234 4421",
      balanceMils: JOD(12_400),
      currency: "JOD",
    },
  });
  const savings = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Savings Account",
      type: "SAVINGS",
      numberMasked: "8830",
      iban: "JO94 ETIH 0010 0000 0000 5678 8830",
      balanceMils: JOD(30_450.24),
      currency: "JOD",
    },
  });

  // ── Transactions ─────────────────────────────────────────────────────────
  // Current month + previous month so coaching & insights have real deltas.
  const t = async (
    accountId: string,
    type: "DEBIT" | "CREDIT",
    category: string,
    merchant: string,
    amountJod: number,
    when: Date,
    opts?: { recurring?: boolean; note?: string }
  ) =>
    prisma.transaction.create({
      data: {
        accountId,
        type,
        category,
        merchant,
        amountMils: JOD(amountJod),
        createdAt: when,
        recurring: opts?.recurring ?? false,
        note: opts?.note ?? null,
      },
    });

  // Salary credits.
  await t(checking.id, "CREDIT", "Salary", "Etihad Engineering Ltd", 2_850, daysAgo(3, 9), { recurring: true });
  await t(checking.id, "CREDIT", "Salary", "Etihad Engineering Ltd", 2_850, daysAgo(33, 9), { recurring: true });

  // Subscriptions (the Netflix charge "yesterday" is the designed chat example).
  await t(checking.id, "DEBIT", "Subscriptions", "Netflix", 10.99, daysAgo(1, 13), { recurring: true, note: "Monthly renewal" });
  await t(checking.id, "DEBIT", "Subscriptions", "Spotify", 5.99, daysAgo(6, 8), { recurring: true });
  await t(checking.id, "DEBIT", "Subscriptions", "iCloud+", 2.99, daysAgo(9, 7), { recurring: true });
  await t(checking.id, "DEBIT", "Subscriptions", "FitZone Gym", 25.0, daysAgo(12, 6), { recurring: true });
  await t(checking.id, "DEBIT", "Subscriptions", "Netflix", 10.99, daysAgo(31, 13), { recurring: true });
  await t(checking.id, "DEBIT", "Subscriptions", "Spotify", 5.99, daysAgo(36, 8), { recurring: true });

  // Utilities — last month noticeably higher (designed insight: saved ~JOD 120).
  await t(checking.id, "DEBIT", "Utilities", "Jordan Electric Power Co.", 86.4, daysAgo(8, 11));
  await t(checking.id, "DEBIT", "Utilities", "Miyahuna Water", 24.85, daysAgo(10, 12));
  await t(checking.id, "DEBIT", "Utilities", "Orange Jordan Fiber", 35.0, daysAgo(5, 15), { recurring: true });
  await t(checking.id, "DEBIT", "Utilities", "Jordan Electric Power Co.", 182.3, daysAgo(38, 11));
  await t(checking.id, "DEBIT", "Utilities", "Miyahuna Water", 49.7, daysAgo(40, 12));
  await t(checking.id, "DEBIT", "Utilities", "Orange Jordan Fiber", 35.0, daysAgo(35, 15), { recurring: true });

  // Groceries.
  await t(checking.id, "DEBIT", "Groceries", "Carrefour City Mall", 84.25, daysAgo(2, 18));
  await t(checking.id, "DEBIT", "Groceries", "Cozmo Supermarket", 56.7, daysAgo(7, 19));
  await t(checking.id, "DEBIT", "Groceries", "Sameh Mall", 38.15, daysAgo(13, 17));
  await t(checking.id, "DEBIT", "Groceries", "Carrefour City Mall", 92.4, daysAgo(34, 18));
  await t(checking.id, "DEBIT", "Groceries", "Cozmo Supermarket", 61.2, daysAgo(39, 19));

  // Dining.
  await t(checking.id, "DEBIT", "Dining", "Fakhreldin Restaurant", 42.5, daysAgo(4, 21));
  await t(checking.id, "DEBIT", "Dining", "Shams El Balad Cafe", 18.75, daysAgo(11, 13));
  await t(checking.id, "DEBIT", "Dining", "Talabat", 12.4, daysAgo(1, 20));
  await t(checking.id, "DEBIT", "Dining", "Fakhreldin Restaurant", 55.0, daysAgo(37, 21));

  // Bills.
  await t(checking.id, "DEBIT", "Bills", "Zain Postpaid", 28.0, daysAgo(15, 10), { recurring: true });
  await t(checking.id, "DEBIT", "Bills", "Zain Postpaid", 28.0, daysAgo(45, 10), { recurring: true });

  // Cashback credits into the vault.
  await t(checking.id, "CREDIT", "Cashback", "Kinetic Cashback Vault", 6.42, daysAgo(14, 9));

  // Savings interest.
  await t(savings.id, "CREDIT", "Other", "Quarterly interest", 95.55, daysAgo(20, 6));

  // ── Gold catalog (PAMP minted bars; 1g & 2.5g out of stock per design) ──
  const goldImg = (w: string) =>
    `/gold/pamp-${w}.svg`;

  const products = [
    { sku: "PAMP-1G", weightGrams: 1, stockQty: 0, premiumPct: 0.082, img: goldImg("1g") },
    { sku: "PAMP-2_5G", weightGrams: 2.5, stockQty: 0, premiumPct: 0.064, img: goldImg("2-5g") },
    { sku: "PAMP-5G", weightGrams: 5, stockQty: 14, premiumPct: 0.0465, img: goldImg("5g") },
    { sku: "PAMP-10G", weightGrams: 10, stockQty: 9, premiumPct: 0.038, img: goldImg("10g") },
    { sku: "PAMP-20G", weightGrams: 20, stockQty: 5, premiumPct: 0.031, img: goldImg("20g") },
    { sku: "PAMP-50G", weightGrams: 50, stockQty: 2, premiumPct: 0.026, img: goldImg("50g") },
  ];
  for (const p of products) {
    await prisma.goldProduct.create({
      data: {
        sku: p.sku,
        name: "PAMP Gold Minted Bar",
        weightGrams: p.weightGrams,
        purity: "999.9",
        brand: "PAMP Suisse",
        imageUrl: p.img,
        stockQty: p.stockQty,
        premiumPct: p.premiumPct,
      },
    });
  }

  // Price history: 24h of ticks (one per 30 min) around the base price so
  // the detail chart has a real series. Base: JOD 107.900/g.
  let price = 107_400;
  const ticks: { pricePerGramMils: number; at: Date }[] = [];
  for (let i = 48; i >= 1; i--) {
    price = Math.round(price + (107_900 - price) * 0.08 + price * (Math.random() - 0.48) * 0.004);
    ticks.push({ pricePerGramMils: price, at: new Date(Date.now() - i * 30 * 60_000) });
  }
  await prisma.goldPriceTick.createMany({ data: ticks });

  // ── Savings goal (designed: "New Car Goal — 75%") ────────────────────────
  await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: "New Car Goal",
      targetMils: JOD(8_000),
      savedMils: JOD(6_000),
      monthlyMils: JOD(250),
    },
  });

  // ── KYC profile shell (annual update due) ────────────────────────────────
  await prisma.kycProfile.create({
    data: {
      userId: user.id,
      step: 0,
      status: "IN_PROGRESS",
      nationality: "Jordanian",
      employmentStatus: "Employed",
      companyName: "Etihad Engineering Ltd",
      jobTitle: "Senior Project Manager",
      maritalStatus: null,
    },
  });

  // ── Welcome chat message from Rafiq ──────────────────────────────────────
  await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "rafiq",
      content: "Good morning, Ahmed. You have 3 new insights today. How can I help?",
      contentAr: "صباح الخير يا أحمد. لديك 3 رؤى جديدة اليوم. كيف أستطيع مساعدتك؟",
      actions: JSON.stringify([
        { label: "Check Balance", labelAr: "كشف الرصيد", kind: "quick_reply", params: { message: "Check balance" } },
        { label: "Transfer", labelAr: "تحويل", kind: "quick_reply", params: { message: "Transfer money" } },
        { label: "Pay Bill", labelAr: "دفع فاتورة", kind: "quick_reply", params: { message: "Pay my bill" } },
      ]),
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
