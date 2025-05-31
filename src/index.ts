import { ponder } from "ponder:registry";
import { holder, token, transfer, vaultSnapshot, position } from "ponder:schema";
import { formatUnits, parseUnits } from "viem";
import { Erc20Abi } from "../abis/erc20Abi";

ponder.on("ERC20:Transfer", async ({ event, context }) => {
  // Transfer (index_topic_1 address from, index_topic_2 address to, uint256 value)
  const { from, to, value } = event.args;
  const { number, timestamp } = event.block;
  const { hash } = event.transaction;

  const [name, symbol, decimals] = await context.client.multicall({
    allowFailure: false,
    contracts: [
      {
        abi: Erc20Abi,
        address: event.log.address,
        functionName: "name",
      },
      {
        abi: Erc20Abi,
        address: event.log.address,
        functionName: "symbol",
      },
      {
        abi: Erc20Abi,
        address: event.log.address,
        functionName: "decimals",
      },
    ],
  });

  await context.db
    .insert(token)
    .values({
      id: event.log.address,
      address: event.log.address,
      name: name,
      symbol: symbol,
      decimals: decimals,
    })
    .onConflictDoNothing();

  const id = `${event.transaction.hash}-${event.log.logIndex}`;
  await context.db.insert(transfer).values({
    id,
    from,
    to,
    amount: value,
    timestamp,
    blocknumber: number,
    txHash: hash,
    tokenId: event.log.address,
  });

  // balance[from] -= value;
  await context.db
    .insert(holder)
    .values({
      id: from,
      address: from,
      balance: -value,
      tokenId: event.log.address,
    })
    .onConflictDoUpdate((row) => ({
      balance: row.balance - value,
    }));

  // balance[to] += value;
  await context.db
    .insert(holder)
    .values({
      id: to,
      address: to,
      balance: value,
      tokenId: event.log.address,
    })
    .onConflictDoUpdate((row) => ({
      balance: row.balance + value,
    }));
});

ponder.on("Vault:Deposit", async ({ event, context }) => {
  // Deposit (address user, uint256 amount, uint256 shares)
  const { user, amount, shares } = event.args;
  const { timestamp } = event.block;

  // id
  const normalizedTimestamp = (timestamp / 3600n) * 3600n;
  // tvl
  const additionalTvl = amount;

  // price
  // 6 decimals / 18 decimals
  const amountNormalized = formatUnits(amount, 6);
  const shareNormalized = formatUnits(shares, 18);
  const price = Number(amountNormalized) / Number(shareNormalized);

  await context.db
    .insert(vaultSnapshot)
    .values({
      id: normalizedTimestamp.toString(),
      normalizedTimestamp: normalizedTimestamp,
      open: price.toString(),
      high: price.toString(),
      low: price.toString(),
      close: price.toString(),
      volume: amount,
      tvl: additionalTvl,
    })
    .onConflictDoUpdate((row) => ({
      high: Math.max(Number(row.high), price).toString(),
      low: Math.min(Number(row.low), price).toString(),
      close: price.toString(),
      volume: row.volume + amount,
      tvl: row.tvl + additionalTvl,
    }));

  // Update position
  const userPosition = await context.db.find(position, {
    id: user,
  });

  let entryPrice = price;
  if (userPosition) {
    const oldPositionValue =
      Number(userPosition.balance) * Number(userPosition.entryPrice);
    const newPositionValue = Number(shares) * Number(price);
    entryPrice = (newPositionValue + oldPositionValue) / Number(shares);
  }

  await context.db
    .insert(position)
    .values({
      id: user,
      address: user,
      balance: shares,
      entryPrice: price.toString(),
      realizedPnl: 0n,
    })
    .onConflictDoUpdate((row) => ({
      entryPrice: entryPrice.toString(),
      balance: row.balance + shares,
    }));
});

ponder.on("Vault:Withdraw", async ({ event, context }) => {
  // Deposit (address user, uint256 amount, uint256 shares)
  const { user, amount, shares } = event.args;
  const { timestamp } = event.block;

  // id
  const normalizedTimestamp = (timestamp / 3600n) * 3600n;
  // tvl
  const additionalTvl = amount;

  // price
  // 6 decimals / 18 decimals
  const amountNormalized = formatUnits(amount, 6);
  const shareNormalized = formatUnits(shares, 18);
  const price = Number(amountNormalized) / Number(shareNormalized);

  await context.db
    .insert(vaultSnapshot)
    .values({
      id: normalizedTimestamp.toString(),
      normalizedTimestamp: normalizedTimestamp,
      open: price.toString(),
      high: price.toString(),
      low: price.toString(),
      close: price.toString(),
      volume: amount,
      tvl: additionalTvl,
    })
    .onConflictDoUpdate((row) => ({
      high: Math.max(Number(row.high), price).toString(),
      low: Math.min(Number(row.low), price).toString(),
      close: price.toString(),
      volume: row.volume + amount,
      tvl: row.tvl + additionalTvl,
    }));

  // Update position
  const userPosition = await context.db.find(position, {
    id: user,
  });

  let realizedPnl = 0n;
  if (userPosition) {
    const effectivePrice = price - Number(userPosition.entryPrice);
    const effectivePnlInShare =
      effectivePrice * Number(formatUnits(shares, 18));
    realizedPnl = parseUnits(effectivePnlInShare.toString(), 6);
  }

  await context.db
    .insert(position)
    .values({
      id: user,
      address: user,
      balance: shares,
      entryPrice: price.toString(),
      realizedPnl: 0n,
    })
    .onConflictDoUpdate((row) => ({
      balance: row.balance - shares,
      realizedPnl: row.realizedPnl + realizedPnl,
    }));
});