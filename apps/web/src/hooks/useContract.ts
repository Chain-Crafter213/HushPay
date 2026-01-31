import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, keccak256, stringToHex, formatUnits } from 'viem'
import { config } from '../config'
import { HUSHPAY_INVOICES_ABI, ERC20_ABI } from '../abi/contracts'
import { Invoice } from '../types/invoice'
import { usePublicClient } from 'wagmi'
import { useCallback, useState } from 'react'

const contractAddress = config.invoiceContractAddress as `0x${string}`
const usdcAddress = config.usdcAddress as `0x${string}`

// Read invoice by ID
export function useInvoice(invoiceId: bigint | undefined) {
  return useReadContract({
    address: contractAddress,
    abi: HUSHPAY_INVOICES_ABI,
    functionName: 'getInvoice',
    args: invoiceId ? [invoiceId] : undefined,
    query: {
      enabled: !!invoiceId && !!contractAddress,
    },
  })
}

// Read multiple invoices
export function useInvoices(invoiceIds: bigint[]) {
  return useReadContract({
    address: contractAddress,
    abi: HUSHPAY_INVOICES_ABI,
    functionName: 'getInvoices',
    args: [invoiceIds],
    query: {
      enabled: invoiceIds.length > 0 && !!contractAddress,
    },
  })
}

// Read USDC balance
export function useUsdcBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

// Read USDC allowance
export function useUsdcAllowance(owner: `0x${string}` | undefined) {
  return useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner ? [owner, contractAddress] : undefined,
    query: {
      enabled: !!owner && !!contractAddress,
    },
  })
}

// Create invoice hook
export function useCreateInvoice() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const createInvoice = useCallback(async (
    amount: string,
    memo: string,
    dueAt?: Date,
    metadataCID?: string
  ) => {
    const usdcAmount = parseUnits(amount, config.usdcDecimals)
    const memoHash = keccak256(stringToHex(memo))
    const dueTimestamp = dueAt ? BigInt(Math.floor(dueAt.getTime() / 1000)) : 0n

    return writeContractAsync({
      address: contractAddress,
      abi: HUSHPAY_INVOICES_ABI,
      functionName: 'createInvoice',
      args: [usdcAmount, dueTimestamp, memoHash, metadataCID || ''],
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

// Approve USDC hook
export function useApproveUsdc() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const approve = useCallback(async (amount: bigint) => {
    return writeContractAsync({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [contractAddress, amount],
    })
  }, [writeContractAsync])

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Pay invoice hook
export function usePayInvoice() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const payInvoice = useCallback(async (invoiceId: bigint) => {
    return writeContractAsync({
      address: contractAddress,
      abi: HUSHPAY_INVOICES_ABI,
      functionName: 'payInvoice',
      args: [invoiceId],
    })
  }, [writeContractAsync])

  return {
    payInvoice,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Release invoice hook
export function useReleaseInvoice() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const release = useCallback(async (invoiceId: bigint) => {
    return writeContractAsync({
      address: contractAddress,
      abi: HUSHPAY_INVOICES_ABI,
      functionName: 'release',
      args: [invoiceId],
    })
  }, [writeContractAsync])

  return {
    release,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Refund invoice hook
export function useRefundInvoice() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const refund = useCallback(async (invoiceId: bigint) => {
    return writeContractAsync({
      address: contractAddress,
      abi: HUSHPAY_INVOICES_ABI,
      functionName: 'refund',
      args: [invoiceId],
    })
  }, [writeContractAsync])

  return {
    refund,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Cancel invoice hook
export function useCancelInvoice() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const cancel = useCallback(async (invoiceId: bigint) => {
    return writeContractAsync({
      address: contractAddress,
      abi: HUSHPAY_INVOICES_ABI,
      functionName: 'cancelInvoice',
      args: [invoiceId],
    })
  }, [writeContractAsync])

  return {
    cancel,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Get merchant invoices - uses contract reads instead of event logs for better RPC compatibility
export function useMerchantInvoices(merchantAddress: `0x${string}` | undefined) {
  const publicClient = usePublicClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchInvoices = useCallback(async () => {
    if (!publicClient || !merchantAddress || !contractAddress) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // First get the next invoice ID from the contract (this tells us how many invoices exist)
      const nextId = await publicClient.readContract({
        address: contractAddress,
        abi: HUSHPAY_INVOICES_ABI,
        functionName: 'nextInvoiceId',
      }) as bigint

      // If nextId is 1, no invoices have been created yet (IDs start at 1)
      if (nextId <= 1n) {
        setInvoices([])
        return
      }

      // Total invoices = nextId - 1 (since IDs start at 1)
      const invoiceCount = nextId - 1n

      // Fetch invoices in batches and filter by merchant
      // Start from most recent (higher IDs) for efficiency
      const merchantInvoices: Invoice[] = []
      
      // Query in reverse order (newest first) for up to 200 invoices
      const maxToCheck = invoiceCount < 200n ? invoiceCount : 200n
      const ids: bigint[] = []
      
      for (let i = invoiceCount; i > invoiceCount - maxToCheck && i > 0n; i--) {
        ids.push(i)
      }

      // Fetch all invoices in one batch call
      if (ids.length > 0) {
        const allInvoices = await publicClient.readContract({
          address: contractAddress,
          abi: HUSHPAY_INVOICES_ABI,
          functionName: 'getInvoices',
          args: [ids],
        }) as Invoice[]

        // Filter for this merchant's invoices
        for (const invoice of allInvoices) {
          if (invoice.merchant.toLowerCase() === merchantAddress.toLowerCase()) {
            merchantInvoices.push(invoice)
          }
        }
      }

      setInvoices(merchantInvoices)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching invoices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, merchantAddress])

  return {
    invoices,
    isLoading,
    error,
    refetch: fetchInvoices,
  }
}

// Format USDC amount for display
export function formatUsdcAmount(amount: bigint): string {
  return formatUnits(amount, config.usdcDecimals)
}

// Parse USDC amount from string
export function parseUsdcAmount(amount: string): bigint {
  return parseUnits(amount, config.usdcDecimals)
}
