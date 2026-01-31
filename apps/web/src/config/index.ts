// Environment configuration
// All values are read from environment variables

export const config = {
  // Dynamic.xyz
  dynamicEnvironmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || '',
  
  // Chain
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '137', 10),
  
  // Contracts - V1
  usdcAddress: import.meta.env.VITE_USDC_ADDRESS || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  invoiceContractAddress: import.meta.env.VITE_INVOICE_CONTRACT_ADDRESS || '',
  
  // Contracts - V2
  invoicesV2Address: import.meta.env.VITE_INVOICES_V2_ADDRESS || '',
  disputesAddress: import.meta.env.VITE_DISPUTES_ADDRESS || '',
  milestonesAddress: import.meta.env.VITE_MILESTONES_ADDRESS || '',
  merchantRegistryAddress: import.meta.env.VITE_MERCHANT_REGISTRY_ADDRESS || '',
  feeManagerAddress: import.meta.env.VITE_FEE_MANAGER_ADDRESS || '',
  
  // App
  appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  
  // IPFS (optional)
  pinataApiKey: import.meta.env.VITE_PINATA_API_KEY || '',
  pinataSecretKey: import.meta.env.VITE_PINATA_SECRET_KEY || '',
  
  // Constants
  usdcDecimals: 6,
  blockExplorer: 'https://polygonscan.com',
} as const

// Validate required config
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!config.dynamicEnvironmentId) {
    errors.push('VITE_DYNAMIC_ENVIRONMENT_ID is required')
  }
  
  if (!config.invoiceContractAddress) {
    errors.push('VITE_INVOICE_CONTRACT_ADDRESS is required')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}
