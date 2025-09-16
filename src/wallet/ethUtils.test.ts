import { strict as assert } from 'node:assert'
import { describe, test } from 'node:test'
import { formatTransactionRequest } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
	ethToWei,
	gweiToWei,
	prepareTransaction,
	type SendTransactionOptions,
	validateAddress,
	weiToEth,
	weiToGwei,
} from './ethUtils.js'

describe('ETH Utility Functions', () => {
	describe('Address validation', () => {
		test('should validate correct Ethereum addresses', () => {
			const validAddresses = [
				'0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4',
				'0x0000000000000000000000000000000000000000',
			]

			for (const addr of validAddresses) {
				assert.doesNotThrow(() => validateAddress(addr))
				assert.strictEqual(validateAddress(addr), addr)
			}
		})

		test('should reject invalid Ethereum addresses', () => {
			const invalidAddresses = [
				'0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7', // too short
				'742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4', // no 0x prefix
				'0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4z', // invalid character
				'', // empty string
				'not an address',
			]

			for (const addr of invalidAddresses) {
				assert.throws(() => validateAddress(addr), /Invalid Ethereum address/)
			}
		})
	})

	describe('ETH to Wei conversion', () => {
		test('should convert ETH amounts to Wei correctly', () => {
			assert.strictEqual(ethToWei('1'), 1000000000000000000n)
			assert.strictEqual(ethToWei('0.1'), 100000000000000000n)
			assert.strictEqual(ethToWei('0.01'), 10000000000000000n)
			assert.strictEqual(ethToWei('0.001'), 1000000000000000n)
			assert.strictEqual(ethToWei('0'), 0n)
		})

		test('should handle invalid ETH amounts', () => {
			const invalidAmounts = ['not a number', '', 'abc']

			for (const amount of invalidAmounts) {
				assert.throws(() => ethToWei(amount))
			}
		})
	})

	describe('Wei to ETH conversion', () => {
		test('should convert Wei amounts to ETH correctly', () => {
			assert.strictEqual(weiToEth(1000000000000000000n), '1')
			assert.strictEqual(weiToEth(100000000000000000n), '0.1')
			assert.strictEqual(weiToEth(10000000000000000n), '0.01')
			assert.strictEqual(weiToEth(1000000000000000n), '0.001')
			assert.strictEqual(weiToEth(0n), '0')
		})
	})

	describe('Gwei conversions', () => {
		test('should convert Gwei to Wei correctly', () => {
			assert.strictEqual(gweiToWei('1'), 1000000000n)
			assert.strictEqual(gweiToWei('20'), 20000000000n)
			assert.strictEqual(gweiToWei('0.5'), 500000000n)
		})

		test('should convert Wei to Gwei correctly', () => {
			assert.strictEqual(weiToGwei(1000000000n), '1')
			assert.strictEqual(weiToGwei(20000000000n), '20')
			assert.strictEqual(weiToGwei(500000000n), '0.5')
		})

		test('should handle invalid Gwei amounts', () => {
			const invalidAmounts = ['not a number', '', 'abc']

			for (const amount of invalidAmounts) {
				assert.throws(() => gweiToWei(amount))
			}
		})
	})

	describe('Transaction preparation', () => {
		test('should prepare basic ETH transaction correctly', () => {
			const privateKey = generatePrivateKey()
			const account = privateKeyToAccount(privateKey)
			const options: SendTransactionOptions = {
				amount: '0.1',
				to: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4',
			}

			const tx = prepareTransaction(options, account)

			assert.strictEqual(tx.from, account.address)
			assert.strictEqual(tx.to, options.to)
			assert.strictEqual(tx.value, ethToWei(options.amount))
		})

		test('should include optional parameters in transaction', () => {
			const privateKey = generatePrivateKey()
			const account = privateKeyToAccount(privateKey)
			const options: SendTransactionOptions = {
				amount: '0.1',
				to: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4',
				gas: 21000n,
				gasPrice: '20',
				nonce: 42,
				data: '0x1234',
			}

			const tx = prepareTransaction(options, account)

			assert.strictEqual(tx.from, account.address)
			assert.strictEqual(tx.to, options.to)
			assert.strictEqual(tx.value, ethToWei(options.amount))
			assert.strictEqual(tx.gas, options.gas)
			assert.strictEqual(tx.gasPrice, gweiToWei(options.gasPrice))
			assert.strictEqual(tx.nonce, options.nonce)
			assert.strictEqual(tx.data, options.data)
		})

		test('should validate destination address in transaction preparation', () => {
			const privateKey = generatePrivateKey()
			const account = privateKeyToAccount(privateKey)
			const options: SendTransactionOptions = {
				amount: '0.1',
				to: 'invalid-address' as any,
			}

			assert.throws(
				() => prepareTransaction(options, account),
				/Invalid Ethereum address/,
			)
		})
	})

	describe('JSON-RPC transaction formatting (viem)', () => {
		test('should format transaction for JSON-RPC correctly using viem', () => {
			const privateKey = generatePrivateKey()
			const account = privateKeyToAccount(privateKey)

			const tx = {
				from: account.address,
				to: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4',
				value: ethToWei('0.1'),
				gas: 21000n,
				gasPrice: gweiToWei('20'),
				nonce: 42,
				data: '0x1234',
			}

			const jsonRpcTx = formatTransactionRequest(tx)

			assert.strictEqual(jsonRpcTx.from, account.address)
			assert.strictEqual(jsonRpcTx.to, tx.to)
			assert.strictEqual(jsonRpcTx.value, `0x${tx.value.toString(16)}`)
			assert.strictEqual(jsonRpcTx.gas, `0x${tx.gas.toString(16)}`)
			assert.strictEqual(jsonRpcTx.gasPrice, `0x${tx.gasPrice.toString(16)}`)
			assert.strictEqual(jsonRpcTx.nonce, `0x${tx.nonce.toString(16)}`)
			assert.strictEqual(jsonRpcTx.data, tx.data)
		})

		test('should handle undefined optional fields using viem', () => {
			const privateKey = generatePrivateKey()
			const account = privateKeyToAccount(privateKey)

			const tx = {
				from: account.address,
				to: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4',
				value: ethToWei('0.1'),
			}

			const jsonRpcTx = formatTransactionRequest(tx)

			assert.strictEqual(jsonRpcTx.from, account.address)
			assert.strictEqual(jsonRpcTx.to, tx.to)
			assert.strictEqual(jsonRpcTx.value, `0x${tx.value.toString(16)}`)
			assert.strictEqual(jsonRpcTx.gas, undefined)
			assert.strictEqual(jsonRpcTx.gasPrice, undefined)
			assert.strictEqual(jsonRpcTx.nonce, undefined)
			assert.strictEqual(jsonRpcTx.data, undefined)
		})
	})
})
