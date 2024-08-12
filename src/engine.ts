import type { Chain, LocalAccount } from 'viem'

import { UnsupportedMethod } from './errors.js'
import { Router } from './middleware.js'
import type { ChainTransport, JsonRpcRequest } from './types.js'
import { createAccountsMiddleware } from './wallet/AccountsMiddleware.js'
import { createAuthorizeMiddleware } from './wallet/AuthorizeMiddleware.js'
import { createChainMiddleware } from './wallet/ChainMiddleware.js'
import { createPassThroughMiddleware } from './wallet/PassthroughMiddleware.js'
import { createPermissionMiddleware } from './wallet/PermissionMiddleware.js'
import { createSignMessageMiddleware } from './wallet/SignMessageMiddleware.js'
import { createTransactionMiddleware } from './wallet/TransactionMiddleware.js'
import type { WalletPermissionSystem } from './wallet/WalletPermissionSystem.js'

type RpcEngineConfig = {
	emit: (eventName: string, ...args: any[]) => void
	logger?: (message: string) => void
	debug?: boolean
	accounts: LocalAccount[]
	wps: WalletPermissionSystem
	waitAuthorization: (
		req: JsonRpcRequest,
		task: () => Promise<void>,
	) => Promise<void>
	addChain: (chain: Chain) => void
	switchChain: (chainId: number) => void
	getChain: () => Chain
	getChainTransport: () => ChainTransport
}

export function createRpcEngine({
	emit,
	debug,
	logger,
	accounts,
	wps,
	waitAuthorization,
	addChain,
	switchChain,
	getChain,
	getChainTransport,
}: RpcEngineConfig) {
	// switch (req.method) {
	// 	case
	// }
	const engine = new Router()

	if (debug) {
		engine.use((req, _res, next) => {
			if (debug) logger?.(`Request: ${req.method}`)
			next()
		})
	}

	engine.use(createAuthorizeMiddleware({ waitAuthorization }))
	engine.use(createAccountsMiddleware({ emit, accounts, wps }))
	engine.use(createSignMessageMiddleware({ account: accounts[0] }))
	engine.use(createChainMiddleware({ getChain, addChain, switchChain }))
	engine.use(
		createTransactionMiddleware({
			getChain,
			account: accounts[0],
			getChainTransport,
		}),
	)
	engine.use(createPermissionMiddleware({ emit, accounts }))
	engine.use(createPassThroughMiddleware({ getChainTransport }))

	engine.use((_req, _res, _next) => {
		throw UnsupportedMethod()
	})

	return engine
}
