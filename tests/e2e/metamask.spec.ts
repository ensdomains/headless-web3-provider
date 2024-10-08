import type { Page } from '@playwright/test'
import {
	type Address,
	generatePrivateKey,
	privateKeyToAccount,
	privateKeyToAddress,
} from 'viem/accounts'

import { expect, test } from '../fixtures.js'
import 'viem/window'
import { Web3RequestKind } from '../../src/utils.js'

test('connect the wallet', async ({ page, accounts, wallet }) => {
	// Until the wallet is connected, the accounts should be empty
	let ethAccounts = await page.evaluate(() =>
		window.ethereum!.request({
			method: 'eth_accounts',
		}),
	)
	expect(ethAccounts).toEqual([])

	// Request connecting the wallet
	await page.getByRole('button', { name: 'Connect', exact: true }).click()

	expect(
		wallet.getPendingRequestCount(Web3RequestKind.RequestAccounts),
	).toEqual(1)

	// You can either authorize or reject the request
	await wallet.authorize(Web3RequestKind.RequestAccounts)

	expect(
		wallet.getPendingRequestCount(Web3RequestKind.RequestAccounts),
	).toEqual(0)

	// Verify if the wallet is really connected
	await expect(page.locator('text=Connected')).toBeVisible()
	await expect(page.locator(`text=${accounts[0]}`)).toBeVisible()

	// After connecting the wallet, the accounts should be available
	ethAccounts = await page.evaluate(() =>
		window.ethereum!.request({
			method: 'eth_accounts',
		}),
	)
	expect(ethAccounts).toEqual(accounts)
})

test('add a new chain', async ({ page, wallet }) => {
	await page.locator('text=Add Localhost').click()

	const chainCount = wallet.getChainIds().length
	await wallet.authorize(Web3RequestKind.AddEthereumChain)

	expect(wallet.getChainIds().length).toEqual(chainCount + 1)
})

test('switch a new chain', async ({ page, wallet }) => {
	wallet.addChain({
		name: 'new network',
		nativeCurrency: {
			name: 'Network',
			symbol: 'ETH',
			decimals: 10,
		},
		id: 1338,
		rpcUrls: { default: { http: ['http://127.0.0.1:8546'] } },
	})

	const [prevNetworkId, prevChainId] = await page.evaluate(() =>
		Promise.all([
			window.ethereum!.request({
				method: 'net_version',
			}),
			window.ethereum!.request({
				method: 'eth_chainId',
			}),
		]),
	)

	await page.locator('text=Switch to Localhost').click()
	await wallet.authorize(Web3RequestKind.SwitchEthereumChain)

	const [newNetworkId, newChainId] = await page.evaluate(() =>
		Promise.all([
			window.ethereum!.request({
				method: 'net_version',
			}),
			window.ethereum!.request({
				method: 'eth_chainId',
			}),
		]),
	)

	expect(newNetworkId).toEqual(1338)
	expect(newChainId).toEqual('0x53a')
	expect(prevNetworkId).not.toEqual(newNetworkId)
	expect(prevChainId).not.toEqual(newChainId)
})

test('request permissions', async ({ page, accounts, wallet }) => {
	await page.getByRole('button', { name: 'Connect', exact: true }).click()
	await wallet.authorize(Web3RequestKind.RequestAccounts)

	// Request permissions
	await page.locator('text=Request Permissions').click()

	expect(
		wallet.getPendingRequestCount(Web3RequestKind.RequestPermissions),
	).toEqual(1)

	// You can either authorize or reject the request
	await wallet.authorize(Web3RequestKind.RequestPermissions)

	expect(
		wallet.getPendingRequestCount(Web3RequestKind.RequestPermissions),
	).toEqual(0)

	const ethAccounts = await page.evaluate(() =>
		window.ethereum!.request({
			method: 'eth_accounts',
		}),
	)
	expect(ethAccounts).toEqual(accounts)
})

test('deploy a token', async ({ page, wallet }) => {
	await page.getByRole('button', { name: 'Connect', exact: true }).click()
	await wallet.authorize(Web3RequestKind.RequestAccounts)

	await expect(page.locator('#erc20TokenAddresses')).toBeEmpty()
	await page.locator('text=Create Token').click()
	await expect(page.locator('#erc20TokenAddresses')).toBeEmpty()

	await wallet.authorize(Web3RequestKind.SendTransaction)
	await expect(page.locator('#erc20TokenAddresses')).toContainText(/0x.+/)
})

const getTransactionCount = async (
	page: Page,
	account: string,
): Promise<number> => {
	const res = await page.evaluate(
		(addr) =>
			window.ethereum!.request({
				method: 'eth_getTransactionCount',
				params: [addr as Address, 'latest'],
			}),
		account,
	)
	return Number(res)
}

test('send legacy transaction', async ({ page, accounts, wallet }) => {
	await page.getByRole('button', { name: 'Connect', exact: true }).click()
	await wallet.authorize(Web3RequestKind.RequestAccounts)

	await page.locator('text=Send Legacy Transaction').click()
	const nonceBefore = await getTransactionCount(page, accounts[0])
	await wallet.authorize(Web3RequestKind.SendTransaction)

	const nonceAfter = await getTransactionCount(page, accounts[0])
	expect(nonceAfter).toEqual(nonceBefore + 1)
})

test('send EIP-1559 transaction', async ({ page, accounts, wallet }) => {
	await page.getByRole('button', { name: 'Connect', exact: true }).click()
	await wallet.authorize(Web3RequestKind.RequestAccounts)

	await page.locator('text=Send EIP 1559 Transaction').click()
	const nonceBefore = await getTransactionCount(page, accounts[0])
	await wallet.authorize(Web3RequestKind.SendTransaction)

	const nonceAfter = await getTransactionCount(page, accounts[0])
	expect(nonceAfter).toEqual(nonceBefore + 1)
})

/**
 * Suite tests "personal_sign" RPC method
 */
test('sign a message', async ({ page, signers, wallet }) => {
	// Establish a connection with the wallet
	await page.getByRole('button', { name: 'Connect', exact: true }).click()
	// Authorize the request for account access
	await wallet.authorize(Web3RequestKind.RequestAccounts)

	// Expect the result element to be empty before signing
	await expect(page.locator('#personalSignResult')).toBeEmpty()
	// Initiate the signing process
	await page.locator('#personalSign').click()

	// Expect the result element to be empty before authorizing the request
	await expect(page.locator('#personalSignResult')).toBeEmpty()
	// Authorize the request to sign the message
	await wallet.authorize(Web3RequestKind.SignMessage)

	// Prepare the signed message
	const message = 'Example `personal_sign` message'
	const signer = privateKeyToAccount(signers[0])
	const signedMessage = await signer.signMessage({ message })

	await expect(page.locator('#personalSignResult')).toContainText(signedMessage)
})

/**
 * Suite tests for eth_signTypedData RPC methods
 */
const data = [
	{
		version: 'eth_signTypedData_v3',
		requestKind: Web3RequestKind.SignTypedDataV3,
		signButtonId: 'signTypedDataV3',
		signResultId: 'signTypedDataV3Result',
		verifyButtonId: 'signTypedDataV3Verify',
		verifyResultId: 'signTypedDataV3VerifyResult',
	},
	{
		version: 'eth_signTypedData_v4',
		requestKind: Web3RequestKind.SignTypedDataV4,
		signButtonId: 'signTypedDataV4',
		signResultId: 'signTypedDataV4Result',
		verifyButtonId: 'signTypedDataV4Verify',
		verifyResultId: 'signTypedDataV4VerifyResult',
	},
]
for (const {
	version,
	requestKind,
	signButtonId,
	signResultId,
	verifyButtonId,
	verifyResultId,
} of data) {
	test(`sign a typed message (${version})`, async ({
		page,
		signers,
		wallet,
	}) => {
		// Establish a connection with the wallet
		await page.getByRole('button', { name: 'Connect', exact: true }).click()
		// Authorize the request for account access
		await wallet.authorize(Web3RequestKind.RequestAccounts)

		// Expect the result element to be empty before signing
		await expect(page.locator(`#${signResultId}`)).toBeEmpty()
		// Initiate the signing process
		await page.locator(`#${signButtonId}`).click()

		// Expect the result element to be empty before authorizing the request
		await expect(page.locator(`#${signResultId}`)).toBeEmpty()
		// Authorize the request to sign the message
		await wallet.authorize(requestKind)

		// Expect the result element to contain the signature
		await expect(page.locator(`#${signResultId}`)).toContainText(/^0x.+/)

		// Verify the signature
		await expect(page.locator(`#${verifyResultId}`)).toBeEmpty()
		await page.locator(`#${verifyButtonId}`).click()

		// Signer address should be recovered from the signature
		await expect(page.locator(`#${verifyResultId}`)).toContainText(
			privateKeyToAccount(signers[0]).address.toLowerCase(),
		)
	})
}

test('update accounts', async ({ page, wallet, accounts }) => {
	// Request connecting the wallet
	await page.getByRole('button', { name: 'Connect', exact: true }).click()

	expect(
		wallet.getPendingRequestCount(Web3RequestKind.RequestAccounts),
	).toEqual(1)

	// You can either authorize or reject the request
	await wallet.authorize(Web3RequestKind.RequestAccounts)

	expect(
		wallet.getPendingRequestCount(Web3RequestKind.RequestAccounts),
	).toEqual(0)

	let ethAccounts = await page.evaluate(() =>
		window.ethereum!.request({
			method: 'eth_accounts',
		}),
	)

	expect(ethAccounts).toEqual(accounts)

	const pk = generatePrivateKey()
	await wallet.changeAccounts([pk])

	ethAccounts = await page.evaluate(() =>
		window.ethereum!.request({
			method: 'eth_accounts',
		}),
	)

	expect(ethAccounts).toEqual([privateKeyToAddress(pk)])
})
