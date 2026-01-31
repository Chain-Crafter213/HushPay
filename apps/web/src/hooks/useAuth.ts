import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { config } from '../config'

export function useAuth() {
  const { user, primaryWallet, setShowAuthFlow, handleLogOut } = useDynamicContext()
  const isLoggedIn = useIsLoggedIn()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const isWrongNetwork = isConnected && chainId !== config.chainId

  const login = () => {
    setShowAuthFlow(true)
  }

  const logout = async () => {
    await handleLogOut()
  }

  const switchToPolygon = () => {
    if (switchChain) {
      switchChain({ chainId: config.chainId })
    }
  }

  return {
    // User state
    user,
    isLoggedIn,
    isConnected,
    
    // Wallet state
    address: address || primaryWallet?.address,
    primaryWallet,
    
    // Network state
    chainId,
    isWrongNetwork,
    
    // Actions
    login,
    logout,
    switchToPolygon,
  }
}
