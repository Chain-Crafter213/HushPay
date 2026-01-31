import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector'
import { WagmiProvider } from 'wagmi'
import { config } from '../config'
import { wagmiConfig } from '../config/wagmi'

interface Web3ProviderProps {
  children: React.ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: config.dynamicEnvironmentId,
        walletConnectors: [EthereumWalletConnectors],
        eventsCallbacks: {
          onAuthSuccess: (args) => {
            console.log('Auth success:', args.user?.email || args.primaryWallet?.address)
          },
          onLogout: () => {
            console.log('User logged out')
          },
        },
        overrides: {
          evmNetworks: [
            {
              chainId: 137,
              networkId: 137,
              name: 'Polygon',
              iconUrls: ['https://cryptologos.cc/logos/polygon-matic-logo.png'],
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18,
              },
              rpcUrls: ['https://polygon-bor-rpc.publicnode.com'],
              blockExplorerUrls: ['https://polygonscan.com'],
            },
          ],
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <DynamicWagmiConnector>
          {children}
        </DynamicWagmiConnector>
      </WagmiProvider>
    </DynamicContextProvider>
  )
}
