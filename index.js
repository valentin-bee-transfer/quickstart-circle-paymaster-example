import { createPublicClient, http } from 'viem'
import { polygonAmoy } from 'viem/chains'
import { createBundlerClient } from 'viem/account-abstraction'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import fs from 'node:fs'
import { toEcdsaKernelSmartAccount } from 'permissionless/accounts'
import { getContract, erc20Abi, formatUnits } from 'viem'
import { eip2612Abi } from './permit-helpers.js'

const client = createPublicClient({
    chain: polygonAmoy,
    transport: http(),
})

const block = await client.getBlockNumber()
console.log('Connected to network, latest block is', block)

const POLYGON_AMOY_BUNDLER = `https://public.pimlico.io/v2/${polygonAmoy.id}/rpc`

const bundlerClient = createBundlerClient({
    client,
    transport: http(POLYGON_AMOY_BUNDLER),
})

const owner = privateKeyToAccount(
  fs.existsSync('.owner_private_key')
    ? fs.readFileSync('.owner_private_key', 'utf8')
    : (() => {
        const privateKey = generatePrivateKey()
        fs.writeFileSync('.owner_private_key', privateKey)
        return privateKey
      })(),
)

const account = await toEcdsaKernelSmartAccount({
    client,
    owners: [owner],
    version: '0.3.1',
})

console.log('Owner address:', owner.address)
console.log('Smart wallet address:', account.address)

const POLYGON_AMOY_USDC = '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582'

const usdc = getContract({
    client,
    address: POLYGON_AMOY_USDC,
    abi: [...erc20Abi, ...eip2612Abi],
})

const usdcBalance = await usdc.read.balanceOf([account.address])

if (usdcBalance === 0n) {
    console.log(
        'Visit https://faucet.circle.com/ to fund the smart wallet address above ' +
        '(not the owner address) with some USDC on Polygon Amoy, ' +
        'then return here and run the script again.',
    )
    process.exit()
} else {
    console.log(`Smart wallet has ${formatUnits(usdcBalance, 6)} USDC`)
}
