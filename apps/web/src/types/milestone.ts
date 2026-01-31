// Milestone types matching the HushPayMilestones smart contract

export enum MilestoneStatus {
  Unpaid = 0,
  Paid = 1,
  Released = 2,
  Refunded = 3,
}

export interface Milestone {
  milestoneIndex: number
  description: string
  amount: bigint
  status: MilestoneStatus
  paidAt: bigint
  releasedAt: bigint
  payer: `0x${string}`
}

export interface MilestoneInvoice {
  id: bigint
  merchant: `0x${string}`
  totalAmount: bigint
  paidAmount: bigint
  releasedAmount: bigint
  status: number
  createdAt: bigint
  memoHash: `0x${string}`
  metadataCID: string
  milestoneCount: number
}

export function getMilestoneStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.Unpaid:
      return 'Unpaid'
    case MilestoneStatus.Paid:
      return 'Paid'
    case MilestoneStatus.Released:
      return 'Released'
    case MilestoneStatus.Refunded:
      return 'Refunded'
    default:
      return 'Unknown'
  }
}

export function getMilestoneStatusColor(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.Unpaid:
      return 'bg-gray-100 text-gray-800'
    case MilestoneStatus.Paid:
      return 'bg-yellow-100 text-yellow-800'
    case MilestoneStatus.Released:
      return 'bg-green-100 text-green-800'
    case MilestoneStatus.Refunded:
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
