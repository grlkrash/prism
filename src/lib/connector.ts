import sdk from '@farcaster/frame-sdk'
import { SwitchChainError, fromHex, getAddress, numberToHex } from 'viem'
import { ChainNotConfiguredError, createConnector } from 'wagmi'

frameConnector.type = 'frameConnector' as const

export function frameConnector() {
  let connected = true

  return createConnector<typeof sdk.wallet.ethProvider>((config) => ({
    id: 'farcaster',
    name: 'Farcaster Wallet',
    type: frameConnector.type,

    async setup() {
      try {
        // Wait for provider to be available
        const provider = await this.getProvider()
        if (!provider) {
          throw new Error('Provider not available')
        }

        // Ensure we're on the correct chain
        await this.connect({ chainId: config.chains[0].id })
        
        // Verify provider is ready
        const isReady = await provider.request({ method: 'eth_chainId' }).then(() => true).catch(() => false)
        if (!isReady) {
          throw new Error('Provider not ready')
        }
      } catch (error) {
        console.error('Frame connector setup failed:', error)
        throw error
      }
    },

    async connect({ chainId } = {}) {
      try {
        const provider = await this.getProvider()
        const accounts = await provider.request({
          method: 'eth_requestAccounts',
        }).catch((e: any) => {
          // Handle RPC errors properly
          if (e?.code) {
            throw new Error(`RPC Error ${e.code}: ${e.message}`)
          }
          throw e
        })

        let currentChainId = await this.getChainId()
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain!({ chainId })
          currentChainId = chain.id
        }

        connected = true

        return {
          accounts: accounts.map((x) => getAddress(x)),
          chainId: currentChainId,
        }
      } catch (error) {
        console.error('Frame connector connect error:', error)
        connected = false
        throw error
      }
    },

    async disconnect() {
      connected = false
    },

    async getAccounts() {
      if (!connected) throw new Error('Not connected')
      const provider = await this.getProvider()
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      })
      return accounts.map((x) => getAddress(x))
    },

    async getChainId() {
      try {
        const provider = await this.getProvider()
        const hexChainId = await provider.request({ method: 'eth_chainId' })
          .catch((e: any) => {
            if (e?.code) {
              throw new Error(`RPC Error ${e.code}: ${e.message}`)
            }
            throw e
          })
        return fromHex(hexChainId, 'number')
      } catch (error) {
        console.error('Frame connector getChainId error:', error)
        throw error
      }
    },

    async isAuthorized() {
      if (!connected) return false
      const accounts = await this.getAccounts()
      return !!accounts.length
    },

    async switchChain({ chainId }) {
      const provider = await this.getProvider()
      const chain = config.chains.find((x) => x.id === chainId)
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError())

      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: numberToHex(chainId) }],
      })
      return chain
    },

    onAccountsChanged(accounts) {
      if (accounts.length === 0) this.onDisconnect()
      else
        config.emitter.emit('change', {
          accounts: accounts.map((x) => getAddress(x)),
        })
    },

    onChainChanged(chain) {
      const chainId = Number(chain)
      config.emitter.emit('change', { chainId })
    },

    async onDisconnect() {
      config.emitter.emit('disconnect')
      connected = false
    },

    async getProvider() {
      // Wait for provider to be available
      if (!sdk.wallet.ethProvider) {
        throw new Error('Frame SDK provider not available')
      }
      return sdk.wallet.ethProvider
    },
  }))
} 