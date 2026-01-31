// Invoice types matching the smart contract
export enum InvoiceStatus {
  Unpaid = 0,
  PaidEscrowed = 1,
  Released = 2,
  Refunded = 3,
  Cancelled = 4,
}

export interface Invoice {
  id: bigint
  merchant: `0x${string}`
  usdcAmount: bigint
  status: InvoiceStatus
  createdAt: bigint
  dueAt: bigint
  payer: `0x${string}`
  paidAt: bigint
  releasedAt: bigint
  refundedAt: bigint
  memoHash: `0x${string}`
  metadataCID: string
}

export interface InvoiceMetadata {
  memo: string
  description?: string
  clientEmail?: string
  clientName?: string
  merchantName?: string
  createdAt: string
}

export interface InvoiceWithMetadata extends Invoice {
  metadata?: InvoiceMetadata
}

export function getStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case InvoiceStatus.Unpaid:
      return 'Unpaid'
    case InvoiceStatus.PaidEscrowed:
      return 'Paid (Escrowed)'
    case InvoiceStatus.Released:
      return 'Released'
    case InvoiceStatus.Refunded:
      return 'Refunded'
    case InvoiceStatus.Cancelled:
      return 'Cancelled'
    default:
      return 'Unknown'
  }
}

export function getStatusColor(status: InvoiceStatus): string {
  switch (status) {
    case InvoiceStatus.Unpaid:
      return 'text-yellow-600 bg-yellow-50'
    case InvoiceStatus.PaidEscrowed:
      return 'text-blue-600 bg-blue-50'
    case InvoiceStatus.Released:
      return 'text-green-600 bg-green-50'
    case InvoiceStatus.Refunded:
      return 'text-orange-600 bg-orange-50'
    case InvoiceStatus.Cancelled:
      return 'text-gray-600 bg-gray-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}
