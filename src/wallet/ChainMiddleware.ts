import type { Chain } from 'viem'
import type { Middleware } from '../middleware.js'

type ChainMiddlewareConfig = {
	getChain: () => Chain
	addChain: (chain: Chain) => void
	switchChain: (chainId: number) => void
}

export function createChainMiddleware({
	getChain,
	addChain,
	switchChain,
}: ChainMiddlewareConfig): Middleware {
	return async (req, res, next) => {
		switch (req.method) {
			case 'eth_chainId': {
				res.result = `0x${getChain().id.toString(16)}`
				break
			}

			case 'net_version': {
				res.result = getChain().id
				break
			}

			case 'wallet_addEthereumChain': {
				const chainId = Number(req.params?.[0]?.chainId)
				const rpcUrl = req.params?.[0].chainId
				addChain({
					id: chainId,
					// @ts-expect-error `http` is readonly
					rpcUrls: { default: { http: rpcUrl } },
					name: 'test chain',
					nativeCurrency: {
						name: 'test currency',
						symbol: 'ETH',
						decimals: 10,
					},
				})

				res.result = null
				break
			}

			case 'wallet_switchEthereumChain': {
				const chainId = getChain().id

				if (chainId !== Number(req.params[0].chainId)) {
					const chainId = Number(req.params[0].chainId)
					switchChain(chainId)
				}

				res.result = null
				break
			}

			default:
				void next()
		}
	}
}
