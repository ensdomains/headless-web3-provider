import type { Address } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { expect, test } from '../fixtures.js'
import { Web3RequestKind } from '../../src/utils.js'

test('get balance in ETH', async ({ wallet }) => {
	// Get balance for the first account in ETH
	const balance = await wallet.getBalance()
	
	// Should return a string representation of ETH balance
	expect(typeof balance).toBe('string')
	expect(Number.parseFloat(balance)).toBeGreaterThanOrEqual(0)
})

test('get balance in Wei', async ({ wallet }) => {
	// Get balance for the first account in Wei
	const balance = await wallet.getBalance({ unit: 'wei' })
	
	// Should return a string representation of Wei balance
	expect(typeof balance).toBe('string')
	expect(BigInt(balance)).toBeGreaterThanOrEqual(0n)
})

test('get balance for specific address', async ({ wallet }) => {
	// Create a new account
	const newPrivateKey = generatePrivateKey()
	const newAccount = privateKeyToAccount(newPrivateKey)
	
	// Get balance for specific address
	const balance = await wallet.getBalance({ 
		address: newAccount.address as Address 
	})
	
	// New account should have zero balance
	expect(balance).toBe('0')
})

test('send ETH transaction with authorization', async ({ wallet }) => {
	// Generate a recipient address
	const recipientPrivateKey = generatePrivateKey()
	const recipient = privateKeyToAccount(recipientPrivateKey)
	
	// Get initial balances
	const initialSenderBalance = await wallet.getBalance()
	
	// Initiate ETH transfer - this should create a pending request
	const sendPromise = wallet.sendEth({
		amount: '0.1',
		to: recipient.address as Address,
	})
	
	// Give a small delay for the request to be registered
	await new Promise(resolve => setTimeout(resolve, 10))
	
	// Should have a pending transaction request
	expect(wallet.getPendingRequestCount(Web3RequestKind.SendTransaction)).toBe(1)
	
	// Authorize the transaction
	await wallet.authorize(Web3RequestKind.SendTransaction)
	
	// Wait for transaction to complete
	const txHash = await sendPromise
	
	// Should return a transaction hash
	expect(typeof txHash).toBe('string')
	expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/)
	
	// Should have no pending requests after authorization
	expect(wallet.getPendingRequestCount(Web3RequestKind.SendTransaction)).toBe(0)
	
	// Verify balance changes
	const finalSenderBalance = await wallet.getBalance()
	const finalRecipientBalance = await wallet.getBalance({ 
		address: recipient.address as Address 
	})
	
	// Recipient should have received the ETH
	expect(Number.parseFloat(finalRecipientBalance)).toBeCloseTo(0.1)
	
	// Sender balance should have decreased (by 0.1 ETH plus gas fees)
	expect(Number.parseFloat(finalSenderBalance)).toBeLessThan(Number.parseFloat(initialSenderBalance))
	expect(Number.parseFloat(initialSenderBalance) - Number.parseFloat(finalSenderBalance)).toBeGreaterThan(0.1)
})

test('reject ETH transaction', async ({ wallet }) => {
	// Generate a recipient address
	const recipientPrivateKey = generatePrivateKey()
	const recipient = privateKeyToAccount(recipientPrivateKey)
	
	// Initiate ETH transfer
	const sendPromise = wallet.sendEth({
		amount: '0.05',
		to: recipient.address as Address,
	})
	
	// Give a small delay for the request to be registered
	await new Promise(resolve => setTimeout(resolve, 10))
	
	// Should have a pending transaction request
	expect(wallet.getPendingRequestCount(Web3RequestKind.SendTransaction)).toBe(1)
	
	// Reject the transaction
	await wallet.reject(Web3RequestKind.SendTransaction)
	
	// Should throw an error when transaction is rejected
	await expect(sendPromise).rejects.toThrow()
	
	// Should have no pending requests after rejection
	expect(wallet.getPendingRequestCount(Web3RequestKind.SendTransaction)).toBe(0)
})

test('send ETH with custom gas parameters', async ({ wallet }) => {
	// Generate a recipient address
	const recipientPrivateKey = generatePrivateKey()
	const recipient = privateKeyToAccount(recipientPrivateKey)
	
	// Initiate ETH transfer with custom gas parameters
	const sendPromise = wallet.sendEth({
		amount: '0.01',
		to: recipient.address as Address,
		gas: 25000n,
		gasPrice: '10', // 10 gwei
	})
	
	// Authorize the transaction
	await wallet.authorize(Web3RequestKind.SendTransaction)
	
	// Wait for transaction to complete
	const txHash = await sendPromise
	
	// Should return a transaction hash
	expect(typeof txHash).toBe('string')
	expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/)
})

test('send ETH with custom nonce', async ({ wallet, accounts }) => {
	// Generate a recipient address
	const recipientPrivateKey = generatePrivateKey()
	const recipient = privateKeyToAccount(recipientPrivateKey)
	
	// Get the next nonce for the account
	const nextNonce = await wallet.request({
		method: 'eth_getTransactionCount',
		params: [accounts[0] as Address, 'latest'],
	}) as string
	
	// Initiate ETH transfer with explicit nonce
	const sendPromise = wallet.sendEth({
		amount: '0.01',
		to: recipient.address as Address,
		nonce: Number.parseInt(nextNonce, 16),
	})
	
	// Authorize the transaction
	await wallet.authorize(Web3RequestKind.SendTransaction)
	
	// Wait for transaction to complete
	const txHash = await sendPromise
	
	// Should return a transaction hash
	expect(typeof txHash).toBe('string')
	expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/)
})

test('send ETH with transaction data', async ({ wallet }) => {
	// Generate a recipient address
	const recipientPrivateKey = generatePrivateKey()
	const recipient = privateKeyToAccount(recipientPrivateKey)
	
	// Initiate ETH transfer with custom data
	const sendPromise = wallet.sendEth({
		amount: '0.01',
		to: recipient.address as Address,
		data: '0x68656c6c6f', // "hello" in hex
	})
	
	// Authorize the transaction
	await wallet.authorize(Web3RequestKind.SendTransaction)
	
	// Wait for transaction to complete
	const txHash = await sendPromise
	
	// Should return a transaction hash
	expect(typeof txHash).toBe('string')
	expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/)
})

test('should validate sendEth parameters', async ({ wallet }) => {
	// Test invalid destination address
	await expect(
		wallet.sendEth({
			amount: '0.1',
			to: 'invalid-address' as Address,
		}),
	).rejects.toThrow('Invalid Ethereum address')
	
	// Test missing destination address
	await expect(
		wallet.sendEth({
			amount: '0.1',
			to: '' as Address,
		}),
	).rejects.toThrow('Destination address is required')
	
	// Test zero amount
	await expect(
		wallet.sendEth({
			amount: '0',
			to: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4' as Address,
		}),
	).rejects.toThrow('Amount must be greater than 0')
	
	// Test negative amount
	await expect(
		wallet.sendEth({
			amount: '-0.1',
			to: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4' as Address,
		}),
	).rejects.toThrow('Amount must be greater than 0')
	
	// Test invalid amount
	await expect(
		wallet.sendEth({
			amount: 'not-a-number',
			to: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4' as Address,
		}),
	).rejects.toThrow('Invalid ETH amount')
})

test('should validate getBalance parameters', async ({ wallet }) => {
	// Test invalid address
	await expect(
		wallet.getBalance({ address: 'invalid-address' as Address }),
	).rejects.toThrow('Invalid Ethereum address')
})