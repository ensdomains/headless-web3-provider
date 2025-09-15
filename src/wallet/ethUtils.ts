import {
	type Address,
	type Chain,
	type Hex,
	type LocalAccount,
	type TransactionRequest,
	createPublicClient,
	formatEther,
	formatUnits,
	isAddress,
	parseEther,
	parseUnits,
} from 'viem'
import type { ChainTransport } from '../types.js'

export interface SendEthOptions {
	/** Amount to send in ETH (e.g., "0.1" for 0.1 ETH) */
	amount: string
	/** Destination address */
	to: Address
	/** Optional gas limit (defaults to estimated) */
	gas?: bigint
	/** Optional gas price in gwei (defaults to network rate) */
	gasPrice?: string
	/** Optional nonce (defaults to next available) */
	nonce?: number
	/** Optional transaction data */
	data?: Hex
}

export interface GetBalanceOptions {
	/** Address to get balance for (defaults to first account) */
	address?: Address
	/** Return format - 'eth' for ETH units, 'wei' for Wei units */
	unit?: 'eth' | 'wei'
}

/**
 * Validates an Ethereum address
 */
export function validateAddress(address: string): Address {
	if (!isAddress(address)) {
		throw new Error(`Invalid Ethereum address: ${address}`)
	}
	return address
}

/**
 * Converts ETH amount to Wei
 */
export function ethToWei(eth: string): bigint {
	try {
		// Check for obvious invalid values first
		if (!eth || eth.trim() === '' || !/^-?\d*\.?\d+$/.test(eth.trim())) {
			throw new Error('Invalid format')
		}
		return parseEther(eth)
	} catch (_error) {
		throw new Error(`Invalid ETH amount: ${eth}`)
	}
}

/**
 * Converts Wei amount to ETH
 */
export function weiToEth(wei: bigint): string {
	return formatEther(wei)
}

/**
 * Converts Gwei amount to Wei
 */
export function gweiToWei(gwei: string): bigint {
	try {
		// Check for obvious invalid values first
		if (!gwei || gwei.trim() === '' || !/^-?\d*\.?\d+$/.test(gwei.trim())) {
			throw new Error('Invalid format')
		}
		return parseUnits(gwei, 9)
	} catch (_error) {
		throw new Error(`Invalid Gwei amount: ${gwei}`)
	}
}

/**
 * Converts Wei amount to Gwei
 */
export function weiToGwei(wei: bigint): string {
	return formatUnits(wei, 9)
}

/**
 * Gets the balance of an address
 */
export async function getAddressBalance(
	address: Address,
	getChainTransport: () => ChainTransport,
	getChain: () => Chain,
	unit: 'eth' | 'wei' = 'eth',
): Promise<string> {
	const publicClient = createPublicClient({
		chain: getChain(),
		transport: getChainTransport,
	})

	const balance = await publicClient.getBalance({ address })

	return unit === 'eth' ? weiToEth(balance) : balance.toString()
}

/**
 * Prepares transaction parameters for sending ETH
 */
export function prepareSendEthTransaction(
	options: SendEthOptions,
	fromAccount: LocalAccount,
): TransactionRequest {
	const { amount, to, gas, gasPrice, nonce, data } = options

	// Validate destination address
	const toAddress = validateAddress(to)

	// Convert ETH amount to Wei
	const value = ethToWei(amount)

	// Prepare transaction parameters
	const txParams: TransactionRequest = {
		from: fromAccount.address,
		to: toAddress,
		value,
	}

	// Add optional parameters
	if (gas) {
		txParams.gas = gas
	}

	if (gasPrice) {
		txParams.gasPrice = gweiToWei(gasPrice)
	}

	if (nonce !== undefined) {
		txParams.nonce = nonce
	}

	if (data) {
		txParams.data = data
	}

	return txParams
}

/**
 * Converts a Viem transaction request to JSON-RPC format
 */
export function formatTransactionForJsonRpc(tx: TransactionRequest) {
	return {
		from: tx.from,
		to: tx.to,
		value: tx.value ? `0x${tx.value.toString(16)}` : undefined,
		gas: tx.gas ? `0x${tx.gas.toString(16)}` : undefined,
		gasPrice: tx.gasPrice ? `0x${tx.gasPrice.toString(16)}` : undefined,
		nonce: tx.nonce ? `0x${tx.nonce.toString(16)}` : undefined,
		data: tx.data || '0x',
	}
}
