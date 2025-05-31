import { onchainTable, relations } from "ponder";

export const token = onchainTable("token", (t) => ({
  id: t.text().primaryKey(),
  address: t.text().notNull(),
  name: t.text().notNull(),
  symbol: t.text().notNull(),
  decimals: t.integer().notNull(),
}));

export const tokenRelations = relations(token, ({ many }) => ({
  transfers: many(transfer),
  holders: many(holder),
}));

export const transfer = onchainTable("transfer", (t) => ({
  id: t.text().primaryKey(),
  txHash: t.text().notNull(),
  from: t.text().notNull(),
  to: t.text().notNull(),
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blocknumber: t.bigint().notNull(),
  tokenId: t.text().notNull(),
}));

export const transferRelations = relations(transfer, ({ one }) => ({
  token: one(token, { fields: [transfer.tokenId], references: [token.id] }),
}));

export const holder = onchainTable("holder", (t) => ({
  id: t.text().primaryKey(),
  address: t.text().notNull(),
  balance: t.bigint().notNull(),
  tokenId: t.text().notNull(),
}));

export const holderRelations = relations(holder, ({ one }) => ({
  token: one(token, { fields: [holder.tokenId], references: [token.id] }),
}));

export const vaultSnapshot = onchainTable("vault_snapshot", (t) => ({
  // normalizedTimestamp
  id: t.text().primaryKey(),
  normalizedTimestamp: t.bigint().notNull(),
  open: t.numeric().notNull(),
  high: t.numeric().notNull(),
  low: t.numeric().notNull(),
  close: t.numeric().notNull(),
  volume: t.bigint().notNull(),
  tvl: t.bigint().notNull(),
}));

export const position = onchainTable("position", (t) => ({
  id: t.text().primaryKey(),
  address: t.text().notNull(),
  balance: t.bigint().notNull(),
  entryPrice: t.numeric().notNull(),
  realizedPnl: t.bigint().notNull(),
}));