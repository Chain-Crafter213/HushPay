// Dispute types matching the HushPayDisputes smart contract

export enum DisputeStatus {
  None = 0,
  Open = 1,
  Resolved = 2,
}

export enum DisputeOutcome {
  None = 0,
  ReleasedToMerchant = 1,
  RefundedToPayer = 2,
  Split = 3,
}

export interface Dispute {
  id: bigint
  invoiceId: bigint
  payer: `0x${string}`
  merchant: `0x${string}`
  amount: bigint
  reason: string
  status: DisputeStatus
  outcome: DisputeOutcome
  merchantAmount: bigint
  payerAmount: bigint
  openedAt: bigint
  resolvedAt: bigint
  resolvedBy: `0x${string}`
}

export function getDisputeStatusLabel(status: DisputeStatus): string {
  switch (status) {
    case DisputeStatus.None:
      return 'None'
    case DisputeStatus.Open:
      return 'Open'
    case DisputeStatus.Resolved:
      return 'Resolved'
    default:
      return 'Unknown'
  }
}

export function getDisputeOutcomeLabel(outcome: DisputeOutcome): string {
  switch (outcome) {
    case DisputeOutcome.None:
      return 'Pending'
    case DisputeOutcome.ReleasedToMerchant:
      return 'Released to Merchant'
    case DisputeOutcome.RefundedToPayer:
      return 'Refunded to Payer'
    case DisputeOutcome.Split:
      return 'Split'
    default:
      return 'Unknown'
  }
}
