import { polygon } from 'viem/chains'
import { http, createConfig } from 'wagmi'

// Polygon official public RPC - no API key required
const rpcUrl = 'https://polygon-bor-rpc.publicnode.com'

// Polygon Mainnet only - no testnets
export const polygonMainnet = {
  ...polygon,
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
    public: {
      http: [rpcUrl],
    },
  },
}

export const wagmiConfig = createConfig({
  chains: [polygonMainnet],
  multiInjectedProviderDiscovery: false,
  transports: {
    [polygonMainnet.id]: http(rpcUrl),
  },
})

export const supportedChains = [polygonMainnet]
