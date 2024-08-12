import type {} from '@metamask/utils'
import { hexToString } from 'viem'
import type { LocalAccount } from 'viem/accounts'
import type { Middleware } from '../middleware.js'

export function createSignMessageMiddleware({
	account,
}: { account: LocalAccount }): Middleware {
	return async (req, res, next) => {
		switch (req.method) {
			case 'personal_sign': {
				const message = hexToString(req.params[0])

				const signature = await account.signMessage({ message })

				res.result = signature
				break
			}

			case 'eth_signTypedData_v4': {
				const msgParams = JSON.parse(req.params[1])

				const signature = await account.signTypedData(msgParams)

				res.result = signature
				break
			}

			default:
				void next()
		}
	}
}
