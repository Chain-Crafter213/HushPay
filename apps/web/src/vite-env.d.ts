/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DYNAMIC_ENVIRONMENT_ID: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_USDC_ADDRESS: string
  readonly VITE_INVOICE_CONTRACT_ADDRESS: string
  readonly VITE_INVOICES_V2_ADDRESS: string
  readonly VITE_DISPUTES_ADDRESS: string
  readonly VITE_MILESTONES_ADDRESS: string
  readonly VITE_MERCHANT_REGISTRY_ADDRESS: string
  readonly VITE_FEE_MANAGER_ADDRESS: string
  readonly VITE_APP_URL: string
  readonly VITE_PINATA_API_KEY: string
  readonly VITE_PINATA_SECRET_KEY: string
  readonly VITE_ALCHEMY_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
