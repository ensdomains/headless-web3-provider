import type { Json, JsonRpcSuccess } from '@metamask/utils'
import type { JsonRpcRequest } from './types.js'

export type Middleware = (
	req: JsonRpcRequest,
	res: JsonRpcSuccess<Json>,
	next: () => Promise<void>,
) => void | Promise<void>

export class Router {
	middlewares: Middleware[] = []

	use(middleware: Middleware) {
		this.middlewares.push(middleware)
	}

	async run(
		req: JsonRpcRequest,
		res: JsonRpcSuccess<Json>,
	): Promise<JsonRpcSuccess<Json>> {
		let index = 0

		const next = async () => {
			if (index < this.middlewares.length) {
				const currentMiddleware = this.middlewares[index]
				index++
				await currentMiddleware(req, res, next)
			}
		}

		await next()

		return res
	}
}
