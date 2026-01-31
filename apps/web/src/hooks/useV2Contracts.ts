import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useCallback } from 'react'
import { config } from '../config'
import { 
  HUSHPAY_DISPUTES_ABI, 
  HUSHPAY_MILESTONES_ABI, 
  HUSHPAY_MERCHANT_REGISTRY_ABI,
  HUSHPAY_FEE_MANAGER_ABI 
} from '../abi/v2contracts'

// Contract addresses from config
const disputesAddress = config.disputesAddress as `0x${string}`
const milestonesAddress = config.milestonesAddress as `0x${string}`
const registryAddress = config.merchantRegistryAddress as `0x${string}`
const feeManagerAddress = config.feeManagerAddress as `0x${string}`

// =====================================================
// DISPUTES HOOKS
// =====================================================

// Get dispute by ID
export function useDispute(disputeId: bigint | undefined) {
  return useReadContract({
    address: disputesAddress,
    abi: HUSHPAY_DISPUTES_ABI,
    functionName: 'getDispute',
    args: disputeId ? [disputeId] : undefined,
    query: {
      enabled: !!disputeId && !!disputesAddress,
    },
  })
}

// Check if invoice can open dispute
export function useCanOpenDispute(invoiceId: bigint | undefined) {
  return useReadContract({
    address: disputesAddress,
    abi: HUSHPAY_DISPUTES_ABI,
    functionName: 'canOpenDispute',
    args: invoiceId ? [invoiceId] : undefined,
    query: {
      enabled: !!invoiceId && !!disputesAddress,
    },
  })
}

// Check if invoice has active dispute
export function useHasActiveDispute(invoiceId: bigint | undefined) {
  return useReadContract({
    address: disputesAddress,
    abi: HUSHPAY_DISPUTES_ABI,
    functionName: 'hasActiveDispute',
    args: invoiceId ? [invoiceId] : undefined,
    query: {
      enabled: !!invoiceId && !!disputesAddress,
    },
  })
}

// Get dispute window remaining for invoice
export function useDisputeWindowRemaining(invoiceId: bigint | undefined) {
  return useReadContract({
    address: disputesAddress,
    abi: HUSHPAY_DISPUTES_ABI,
    functionName: 'disputeWindowRemaining',
    args: invoiceId ? [invoiceId] : undefined,
    query: {
      enabled: !!invoiceId && !!disputesAddress,
    },
  })
}

// Open dispute hook
export function useOpenDispute() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const openDispute = useCallback(async (invoiceId: bigint, reason: string) => {
    return writeContractAsync({
      address: disputesAddress,
      abi: HUSHPAY_DISPUTES_ABI,
      functionName: 'openDispute',
      args: [invoiceId, reason],
    })
  }, [writeContractAsync])

  return {
    openDispute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// =====================================================
// MILESTONES HOOKS
// =====================================================

// Get milestone invoice by ID
export function useMilestoneInvoice(invoiceId: bigint | undefined) {
  return useReadContract({
    address: milestonesAddress,
    abi: HUSHPAY_MILESTONES_ABI,
    functionName: 'getInvoice',
    args: invoiceId ? [invoiceId] : undefined,
    query: {
      enabled: !!invoiceId && !!milestonesAddress,
    },
  })
}

// Get all milestones for an invoice
export function useMilestones(invoiceId: bigint | undefined) {
  return useReadContract({
    address: milestonesAddress,
    abi: HUSHPAY_MILESTONES_ABI,
    functionName: 'getMilestones',
    args: invoiceId ? [invoiceId] : undefined,
    query: {
      enabled: !!invoiceId && !!milestonesAddress,
    },
  })
}

// Get invoice progress
export function useInvoiceProgress(invoiceId: bigint | undefined) {
  return useReadContract({
    address: milestonesAddress,
    abi: HUSHPAY_MILESTONES_ABI,
    functionName: 'getInvoiceProgress',
    args: invoiceId ? [invoiceId] : undefined,
    query: {
      enabled: !!invoiceId && !!milestonesAddress,
    },
  })
}

// Create milestone invoice
export function useCreateMilestoneInvoice() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const createInvoice = useCallback(async (
    memoHash: `0x${string}`,
    metadataCID: string,
    amounts: bigint[],
    descriptions: string[]
  ) => {
    return writeContractAsync({
      address: milestonesAddress,
      abi: HUSHPAY_MILESTONES_ABI,
      functionName: 'createInvoice',
      args: [memoHash, metadataCID, amounts, descriptions],
    })
  }, [writeContractAsync])

  return {
    createInvoice,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Pay milestones
export function usePayMilestones() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const payMilestones = useCallback(async (invoiceId: bigint, upToIndex: bigint) => {
    return writeContractAsync({
      address: milestonesAddress,
      abi: HUSHPAY_MILESTONES_ABI,
      functionName: 'payMilestones',
      args: [invoiceId, upToIndex],
    })
  }, [writeContractAsync])

  return {
    payMilestones,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Release milestone
export function useReleaseMilestone() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const releaseMilestone = useCallback(async (invoiceId: bigint, milestoneIndex: bigint) => {
    return writeContractAsync({
      address: milestonesAddress,
      abi: HUSHPAY_MILESTONES_ABI,
      functionName: 'releaseMilestone',
      args: [invoiceId, milestoneIndex],
    })
  }, [writeContractAsync])

  return {
    releaseMilestone,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Release all paid milestones
export function useReleaseAllMilestones() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const releaseAll = useCallback(async (invoiceId: bigint) => {
    return writeContractAsync({
      address: milestonesAddress,
      abi: HUSHPAY_MILESTONES_ABI,
      functionName: 'releaseAllPaidMilestones',
      args: [invoiceId],
    })
  }, [writeContractAsync])

  return {
    releaseAll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Refund milestone
export function useRefundMilestone() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const refundMilestone = useCallback(async (invoiceId: bigint, milestoneIndex: bigint) => {
    return writeContractAsync({
      address: milestonesAddress,
      abi: HUSHPAY_MILESTONES_ABI,
      functionName: 'refundMilestone',
      args: [invoiceId, milestoneIndex],
    })
  }, [writeContractAsync])

  return {
    refundMilestone,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// =====================================================
// MERCHANT REGISTRY HOOKS
// =====================================================

// Get merchant by address
export function useMerchant(address: `0x${string}` | undefined) {
  return useReadContract({
    address: registryAddress,
    abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
    functionName: 'getMerchant',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!registryAddress,
    },
  })
}

// Check if address is a registered merchant
export function useIsMerchant(address: `0x${string}` | undefined) {
  return useReadContract({
    address: registryAddress,
    abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
    functionName: 'isMerchant',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!registryAddress,
    },
  })
}

// Get merchant's payout address
export function usePayoutAddress(merchantAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: registryAddress,
    abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
    functionName: 'getPayoutAddress',
    args: merchantAddress ? [merchantAddress] : undefined,
    query: {
      enabled: !!merchantAddress && !!registryAddress,
    },
  })
}

// Get merchant's operators
export function useOperators(merchantAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: registryAddress,
    abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
    functionName: 'getOperators',
    args: merchantAddress ? [merchantAddress] : undefined,
    query: {
      enabled: !!merchantAddress && !!registryAddress,
    },
  })
}

// Check if actor can act for merchant
export function useCanActForMerchant(actor: `0x${string}` | undefined, merchant: `0x${string}` | undefined) {
  return useReadContract({
    address: registryAddress,
    abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
    functionName: 'canActForMerchant',
    args: actor && merchant ? [actor, merchant] : undefined,
    query: {
      enabled: !!actor && !!merchant && !!registryAddress,
    },
  })
}

// Register merchant
export function useRegisterMerchant() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const register = useCallback(async (
    payoutAddress: `0x${string}`,
    businessName: string,
    metadataURI: string
  ) => {
    return writeContractAsync({
      address: registryAddress,
      abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
      functionName: 'registerMerchant',
      args: [payoutAddress, businessName, metadataURI],
    })
  }, [writeContractAsync])

  return {
    register,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Update profile
export function useUpdateProfile() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const updateProfile = useCallback(async (businessName: string, metadataURI: string) => {
    return writeContractAsync({
      address: registryAddress,
      abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
      functionName: 'updateProfile',
      args: [businessName, metadataURI],
    })
  }, [writeContractAsync])

  return {
    updateProfile,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Update payout address
export function useUpdatePayoutAddress() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const updatePayoutAddress = useCallback(async (newPayoutAddress: `0x${string}`) => {
    return writeContractAsync({
      address: registryAddress,
      abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
      functionName: 'updatePayoutAddress',
      args: [newPayoutAddress],
    })
  }, [writeContractAsync])

  return {
    updatePayoutAddress,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Add operator
export function useAddOperator() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const addOperator = useCallback(async (operatorAddress: `0x${string}`) => {
    return writeContractAsync({
      address: registryAddress,
      abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
      functionName: 'addOperator',
      args: [operatorAddress],
    })
  }, [writeContractAsync])

  return {
    addOperator,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Remove operator
export function useRemoveOperator() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const removeOperator = useCallback(async (operatorAddress: `0x${string}`) => {
    return writeContractAsync({
      address: registryAddress,
      abi: HUSHPAY_MERCHANT_REGISTRY_ABI,
      functionName: 'removeOperator',
      args: [operatorAddress],
    })
  }, [writeContractAsync])

  return {
    removeOperator,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// =====================================================
// FEE MANAGER HOOKS
// =====================================================

// Get fee settings
export function useFeeSettings() {
  return useReadContract({
    address: feeManagerAddress,
    abi: HUSHPAY_FEE_MANAGER_ABI,
    functionName: 'getFeeSettings',
    query: {
      enabled: !!feeManagerAddress,
    },
  })
}

// Calculate fee
export function useCalculateFee(amount: bigint | undefined) {
  return useReadContract({
    address: feeManagerAddress,
    abi: HUSHPAY_FEE_MANAGER_ABI,
    functionName: 'calculateFee',
    args: amount ? [amount] : undefined,
    query: {
      enabled: !!amount && !!feeManagerAddress,
    },
  })
}

// =====================================================
// DISPUTES LIST HOOK (for user's disputes)
// =====================================================

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { DisputeStatus } from '../types/dispute'

interface DisputeData {
  id: bigint
  invoiceId: bigint
  payer: `0x${string}`
  merchant: `0x${string}`
  amount: bigint
  reason: string
  status: number
  outcome: number
  merchantAmount: bigint
  payerAmount: bigint
  openedAt: bigint
  resolvedAt: bigint
  resolvedBy: `0x${string}`
}

export function useDisputes(userAddress: `0x${string}` | undefined) {
  const publicClient = usePublicClient()
  
  return useQuery({
    queryKey: ['disputes', userAddress],
    queryFn: async () => {
      if (!publicClient || !userAddress || !disputesAddress) return []
      
      // Get next dispute ID (dispute count = nextId - 1)
      const nextDisputeId = await publicClient.readContract({
        address: disputesAddress,
        abi: HUSHPAY_DISPUTES_ABI,
        functionName: 'nextDisputeId',
      }) as bigint
      
      if (nextDisputeId <= 1n) return []
      
      // Fetch disputes (check last 100)
      const disputeCount = nextDisputeId - 1n
      const maxToCheck = disputeCount < 100n ? disputeCount : 100n
      const disputes: Array<{
        invoiceId: bigint
        status: DisputeStatus
        reason: string
      }> = []
      
      for (let i = 1n; i <= maxToCheck; i++) {
        try {
          const dispute = await publicClient.readContract({
            address: disputesAddress,
            abi: HUSHPAY_DISPUTES_ABI,
            functionName: 'getDispute',
            args: [i],
          }) as DisputeData
          
          // Only include disputes where user is merchant or payer
          if (dispute.merchant === userAddress || dispute.payer === userAddress) {
            disputes.push({
              invoiceId: dispute.invoiceId,
              status: dispute.status as DisputeStatus,
              reason: dispute.reason,
            })
          }
        } catch {
          // Skip invalid disputes
        }
      }
      
      return disputes
    },
    enabled: !!userAddress && !!publicClient && !!disputesAddress,
    staleTime: 30_000,
  })
}

// =====================================================
// MILESTONES LIST HOOK (for user's milestone invoices)
// =====================================================

import { MilestoneStatus } from '../types/milestone'

interface MilestoneData {
  milestoneIndex: bigint
  description: string
  amount: bigint
  status: number
  paidAt: bigint
  releasedAt: bigint
  payer: `0x${string}`
}

interface MilestoneInvoiceData {
  id: bigint
  merchant: `0x${string}`
  totalAmount: bigint
  paidAmount: bigint
  releasedAmount: bigint
  status: number
  createdAt: bigint
  memoHash: `0x${string}`
  metadataCID: string
  milestoneCount: bigint
}

interface MilestoneInvoiceWithMilestones {
  invoiceId: bigint
  totalAmount: bigint
  milestones: Array<{
    description: string
    amount: bigint
    status: MilestoneStatus
  }>
}

export function useMilestoneInvoices(userAddress: `0x${string}` | undefined) {
  const publicClient = usePublicClient()
  
  return useQuery({
    queryKey: ['milestoneInvoices', userAddress],
    queryFn: async () => {
      if (!publicClient || !userAddress || !milestonesAddress) return []
      
      // Get next invoice ID (invoice count = nextId - 1)
      const nextInvoiceId = await publicClient.readContract({
        address: milestonesAddress,
        abi: HUSHPAY_MILESTONES_ABI,
        functionName: 'nextInvoiceId',
      }) as bigint
      
      if (nextInvoiceId <= 1n) return []
      
      // Fetch milestone invoices for this merchant
      const invoiceCount = nextInvoiceId - 1n
      const maxToCheck = invoiceCount < 50n ? invoiceCount : 50n
      const invoices: MilestoneInvoiceWithMilestones[] = []
      
      for (let i = 1n; i <= maxToCheck; i++) {
        try {
          const invoice = await publicClient.readContract({
            address: milestonesAddress,
            abi: HUSHPAY_MILESTONES_ABI,
            functionName: 'getInvoice',
            args: [i],
          }) as MilestoneInvoiceData
          
          // Only include invoices for this merchant
          if (invoice.merchant === userAddress) {
            // Fetch milestones for this invoice
            const milestones: MilestoneInvoiceWithMilestones['milestones'] = []
            const milestoneCount = Number(invoice.milestoneCount)
            
            for (let j = 0; j < milestoneCount; j++) {
              try {
                const milestone = await publicClient.readContract({
                  address: milestonesAddress,
                  abi: HUSHPAY_MILESTONES_ABI,
                  functionName: 'getMilestone',
                  args: [i, BigInt(j)],
                }) as MilestoneData
                
                milestones.push({
                  description: milestone.description,
                  amount: milestone.amount,
                  status: milestone.status as MilestoneStatus,
                })
              } catch {
                // Skip invalid milestones
              }
            }
            
            invoices.push({
              invoiceId: i,
              totalAmount: invoice.totalAmount,
              milestones,
            })
          }
        } catch {
          // Skip invalid invoices
        }
      }
      
      return invoices
    },
    enabled: !!userAddress && !!publicClient && !!milestonesAddress,
    staleTime: 30_000,
  })
}
