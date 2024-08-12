import {
	type Chain,
	type LocalAccount,
	type TransactionRequest,
	createWalletClient,
	formatTransaction,
} from 'viem'
import type { Middleware } from '../middleware.js'
import type { ChainTransport } from '../types.js'

export function createTransactionMiddleware({
	getChain,
	account,
	getChainTransport,
}: {
	getChain: () => Chain
	account: LocalAccount
	getChainTransport: () => ChainTransport
}): Middleware {
	const walletClient = createWalletClient({
		account,
		chain: getChain(),
		transport: getChainTransport,
	})
	return async (req, res, next) => {
		switch (req.method) {
			case 'eth_sendTransaction': {
				const jsonRpcTx = req.params[0]

				console.log(jsonRpcTx)

				const viemTx = formatTransaction(jsonRpcTx)

				try {
					res.result = await walletClient.sendTransaction(
						viemTx as TransactionRequest,
					)
				} catch (e) {
					console.error('Error submitting transaction', e, viemTx)
				}

				break
			}

			default:
				void next()
		}
	}
}
