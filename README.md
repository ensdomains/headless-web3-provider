# Headless Web3 Provider

[![Playwright Tests](https://github.com/ensdomains/headless-web3-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/ensdomains/headless-web3-provider/actions/workflows/ci.yml) [![NPM Downloads](https://img.shields.io/npm/dy/@ensdomains/headless-web3-provider)](https://www.npmjs.com/@ensdomains/headless-web3-provider)

> headless-web3-provider fork by ENS. It uses [viem](https://viem.sh), has fewer dependencies and supports EIP-6963 (ported from [this PR](https://github.com/cawabunga/headless-web3-provider/pull/21)).

Headless MetaMask for testing Ethereum apps.

## Install

```shell
pnpm i -D @ensdomains/headless-web3-provider viem
```

## About

The `headless-web3-provider` library emulates a Web3 wallet similar to Metamask and provides programmatic control over various operations, such as switching networks, connecting a wallet, and sending transactions, making it useful for end-to-end testing of Ethereum-based applications. It allows to programmatically accept or decline operations, making it handy for test automation.

The library also provides convenient wallet methods like `sendEth()` and `getBalance()` for easy ETH transactions and balance management during testing.

#### Supported methods

| Method                     | Confirmable |
| -------------------------- | ----------- |
| eth_requestAccounts        | Yes         |
| eth_accounts               | Yes         |
| eth_sendTransaction        | Yes         |
| wallet_addEthereumChain    | Yes         |
| wallet_switchEthereumChain | Yes         |
| wallet_requestPermissions  | Yes         |
| personal_sign              | Yes         |
| eth_signTypedData          | Yes         |
| eth_signTypedData_v1       | Yes         |
| eth_signTypedData_v3       | Yes         |
| eth_signTypedData_v4       | Yes         |
| eth_call                   | No          |
| eth_estimateGas            | No          |
| eth_blockNumber            | No          |
| eth_getBlockByNumber       | No          |
| eth_getTransactionByHash   | No          |
| eth_getTransactionReceipt  | No          |
| eth_chainId                | No          |
| net_version                | No          |

## Examples

### Playwright

Below given a simple example. More complex scenarios you can find in [tests/e2e](./tests/e2e) folder.

Setup (add a fixture):

```js
// tests/fixtures.js
import { test as base } from '@playwright/test'
import { injectHeadlessWeb3Provider } from '@ensdomains/headless-web3-provider'
import { anvil } from 'viem/chains'

export const test = base.extend({
  // signers - the private keys that are to be used in the tests
  signers: [process.env.PRIVATE_KEY],

  // injectWeb3Provider - function that injects web3 provider instance into the page
  injectWeb3Provider: async ({ signers }, use) => {
    await use((page, privateKeys = signers) =>
      injectHeadlessWeb3Provider(
       { page, privateKeys, chains: [anvil] }
      )
    )
  },
})
```

Usage:

```js
// tests/e2e/example.spec.js
import { test } from '../fixtures'

test('connect the wallet', async ({ page, injectWeb3Provider }) => {
  // Inject window.ethereum instance
  const wallet = await injectWeb3Provider(page)

  await page.goto('https://metamask.github.io/test-dapp/')

  // Request connecting the wallet
  await page.getByRole('button', { name: 'Connect', exact: true }).click()

  // You can either authorize or reject the request
  await wallet.authorize(Web3RequestKind.RequestAccounts)

  // Verify if the wallet is really connected
  await test.expect(page.locator('text=Connected')).toBeVisible()
  await test
    .expect(page.locator('text=0x8b3a08b22d25c60e4b2bfd984e331568eca4c299'))
    .toBeVisible()
})
```

### Wallet Methods

The wallet instance provides convenient methods for common operations:

#### `sendEth(options)`

Sends ETH to a specified address. Requires authorization unless the `eth_sendTransaction` method is pre-permitted.

```js
// Send 0.1 ETH to an address
const txHash = await wallet.sendEth({
  amount: '0.1', // Amount in ETH
  to: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4'
})

// Authorize the transaction
await wallet.authorize(Web3RequestKind.SendTransaction)

// Transaction hash is returned after authorization
console.log('Transaction hash:', txHash)
```

With custom gas parameters:

```js
const txHash = await wallet.sendEth({
  amount: '0.05',
  to: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4',
  gas: 25000n,
  gasPrice: '10', // 10 gwei
  nonce: 42, // Custom nonce
  data: '0x68656c6c6f' // Custom transaction data
})

await wallet.authorize(Web3RequestKind.SendTransaction)
```

#### `getBalance(options)`

Retrieve the ETH balance of an address.

```js
// Get balance of the first wallet account in ETH
const balance = await wallet.getBalance()
console.log('Balance:', balance, 'ETH')

// Get balance in Wei
const balanceWei = await wallet.getBalance({ unit: 'wei' })
console.log('Balance:', balanceWei, 'Wei')

// Get balance of a specific address
const otherBalance = await wallet.getBalance({
  address: '0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4',
  unit: 'eth'
})
```

#### Utility Functions

The library exports utility functions for working with ETH amounts and addresses:

```js
import { 
  ethToWei, 
  weiToEth, 
  gweiToWei, 
  weiToGwei, 
  validateAddress 
} from '@ensdomains/headless-web3-provider'

// Convert between units
const weiAmount = ethToWei('1.5') // 1500000000000000000n
const ethAmount = weiToEth(1500000000000000000n) // '1.5'
const gweiAmount = weiToGwei(20000000000n) // '20'

// Validate addresses
const validAddress = validateAddress('0x742d35cc6675c1f3d2d8e7e7b0c7a8c5f5e9c7a4')
```