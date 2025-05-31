import { ponder } from "ponder:registry";
import { holder, transfer, token } from "ponder:schema";
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