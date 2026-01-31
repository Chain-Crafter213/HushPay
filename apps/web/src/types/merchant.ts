// Merchant types matching the HushPayMerchantRegistry smart contract

export interface Merchant {
  merchantAddress: `0x${string}`
  payoutAddress: `0x${string}`
  businessName: string
  metadataURI: string
  isActive: boolean
  registeredAt: bigint
}

export interface MerchantProfile {
  address: `0x${string}`
  payoutAddress: `0x${string}`
  businessName: string
  metadataURI: string
  isActive: boolean
  operators: `0x${string}`[]
}
