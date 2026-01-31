import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Wallet, 
  Ban,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  useMilestones, 
  useInvoiceProgress,
  usePayMilestones,
  useReleaseMilestone,
  useReleaseAllMilestones,
  useRefundMilestone,
  useCreateMilestoneInvoice
} from '@/hooks/useV2Contracts'
import { formatUsdcAmount } from '@/hooks/useContract'
import { useToast } from '@/hooks/useToast'
import { formatCurrency } from '@/lib/utils'
import { 
  MilestoneStatus, 
  getMilestoneStatusLabel, 
  getMilestoneStatusColor 
} from '@/types/milestone'
import { parseUnits, keccak256, stringToHex } from 'viem'
import { config } from '@/config'

// Milestone status icon
function MilestoneStatusIcon({ status }: { status: MilestoneStatus }) {
  switch (status) {
    case MilestoneStatus.Released:
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case MilestoneStatus.Paid:
      return <Clock className="w-5 h-5 text-yellow-500" />
    case MilestoneStatus.Refunded:
      return <Ban className="w-5 h-5 text-red-500" />
    default:
      return <Circle className="w-5 h-5 text-gray-300" />
  }
}

// Single milestone card component
interface MilestoneCardProps {
  milestone: {
    milestoneIndex: bigint
    description: string
    amount: bigint
    status: number
    paidAt: bigint
    releasedAt: bigint
    payer: `0x${string}`
  }
  invoiceId: bigint
  isMerchant: boolean
  isPayer: boolean
  canPayNext: boolean
  onAction: () => void
}

function MilestoneCard({ 
  milestone, 
  invoiceId, 
  isMerchant, 
  isPayer,
  canPayNext,
  onAction 
}: MilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { releaseMilestone, isPending: isReleasing } = useReleaseMilestone()
  const { refundMilestone, isPending: isRefunding } = useRefundMilestone()
  const { payMilestones, isPending: isPaying } = usePayMilestones()
  const { toast } = useToast()
  
  const status = milestone.status as MilestoneStatus

  const handlePay = async () => {
    try {
      await payMilestones(invoiceId, milestone.milestoneIndex)
      toast({ title: 'Success', description: 'Milestone paid!' })
      onAction()
    } catch (err) {
      console.error('Failed to pay milestone:', err)
      toast({ title: 'Error', description: 'Failed to pay milestone', variant: 'destructive' })
    }
  }

  const handleRelease = async () => {
    try {
      await releaseMilestone(invoiceId, milestone.milestoneIndex)
      toast({ title: 'Success', description: 'Milestone released!' })
      onAction()
    } catch (err) {
      console.error('Failed to release milestone:', err)
      toast({ title: 'Error', description: 'Failed to release milestone', variant: 'destructive' })
    }
  }

  const handleRefund = async () => {
    try {
      await refundMilestone(invoiceId, milestone.milestoneIndex)
      toast({ title: 'Success', description: 'Milestone refunded!' })
      onAction()
    } catch (err) {
      console.error('Failed to refund milestone:', err)
      toast({ title: 'Error', description: 'Failed to refund milestone', variant: 'destructive' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Number(milestone.milestoneIndex) * 0.1 }}
    >
      <Card className={`overflow-hidden ${status === MilestoneStatus.Released ? 'border-green-200' : ''}`}>
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium">
                {Number(milestone.milestoneIndex) + 1}
              </div>
              <div>
                <h4 className="font-medium">{milestone.description || `Milestone ${Number(milestone.milestoneIndex) + 1}`}</h4>
                <p className="text-sm text-gray-600">
                  {formatCurrency(parseFloat(formatUsdcAmount(milestone.amount)))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMilestoneStatusColor(status)}`}>
                {getMilestoneStatusLabel(status)}
              </span>
              <MilestoneStatusIcon status={status} />
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 border-t bg-gray-50">
            <div className="pt-4 space-y-4">
              {/* Status details */}
              {milestone.paidAt > 0n && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Paid:</span>{' '}
                  {new Date(Number(milestone.paidAt) * 1000).toLocaleDateString()}
                </div>
              )}
              {milestone.releasedAt > 0n && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Released:</span>{' '}
                  {new Date(Number(milestone.releasedAt) * 1000).toLocaleDateString()}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {/* Payer can pay unpaid milestones in order */}
                {isPayer && status === MilestoneStatus.Unpaid && canPayNext && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handlePay() }}
                    disabled={isPaying}
                  >
                    {isPaying ? (
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                    ) : (
                      <Wallet className="w-4 h-4 mr-2" />
                    )}
                    Pay Milestone
                  </Button>
                )}

                {/* Merchant can release paid milestones */}
                {isMerchant && status === MilestoneStatus.Paid && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-200 text-green-600 hover:bg-green-50"
                    onClick={(e) => { e.stopPropagation(); handleRelease() }}
                    disabled={isReleasing}
                  >
                    {isReleasing ? (
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Release
                  </Button>
                )}

                {/* Merchant can refund paid milestones */}
                {isMerchant && status === MilestoneStatus.Paid && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={(e) => { e.stopPropagation(); handleRefund() }}
                    disabled={isRefunding}
                  >
                    {isRefunding ? (
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                    ) : (
                      <Ban className="w-4 h-4 mr-2" />
                    )}
                    Refund
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

// Progress bar for milestone invoice
interface MilestoneProgressProps {
  totalMilestones: number
  paidMilestones: number
  releasedMilestones: number
  totalAmount: bigint
  paidAmount: bigint
  releasedAmount: bigint
}

function MilestoneProgressBar({ 
  totalMilestones, 
  paidMilestones, 
  releasedMilestones,
  totalAmount,
  paidAmount,
  releasedAmount
}: MilestoneProgressProps) {
  const paidPercent = totalAmount > 0n ? Number((paidAmount * 100n) / totalAmount) : 0
  const releasedPercent = totalAmount > 0n ? Number((releasedAmount * 100n) / totalAmount) : 0

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Counts */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{releasedMilestones}</p>
              <p className="text-sm text-gray-600">Released</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{paidMilestones - releasedMilestones}</p>
              <p className="text-sm text-gray-600">In Escrow</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMilestones - paidMilestones}</p>
              <p className="text-sm text-gray-600">Remaining</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{releasedPercent}% complete</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div 
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${releasedPercent}%` }}
                />
                <div 
                  className="bg-yellow-400 transition-all duration-500"
                  style={{ width: `${paidPercent - releasedPercent}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatCurrency(parseFloat(formatUsdcAmount(releasedAmount)))} released</span>
              <span>{formatCurrency(parseFloat(formatUsdcAmount(totalAmount)))} total</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Milestones list component
interface MilestonesListProps {
  invoiceId: bigint
  isMerchant: boolean
  isPayer: boolean
}

export function MilestonesList({ invoiceId, isMerchant, isPayer }: MilestonesListProps) {
  const { data: milestones, isLoading, refetch } = useMilestones(invoiceId)
  const { data: progress } = useInvoiceProgress(invoiceId)
  const { releaseAll, isPending: isReleasingAll } = useReleaseAllMilestones()
  const { toast } = useToast()

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!milestones || milestones.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No milestones found
        </CardContent>
      </Card>
    )
  }

  // Find the next unpaid milestone index
  const nextUnpaidIndex = milestones.findIndex(m => m.status === MilestoneStatus.Unpaid)

  // Check if there are paid milestones to release
  const hasPaidMilestones = milestones.some(m => m.status === MilestoneStatus.Paid)

  const handleReleaseAll = async () => {
    try {
      await releaseAll(invoiceId)
      toast({ title: 'Success', description: 'All paid milestones released!' })
      refetch()
    } catch (err) {
      console.error('Failed to release all:', err)
      toast({ title: 'Error', description: 'Failed to release milestones', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      {progress && (
        <MilestoneProgressBar
          totalMilestones={Number(progress[0])}
          paidMilestones={Number(progress[1])}
          releasedMilestones={Number(progress[2])}
          totalAmount={progress[3]}
          paidAmount={progress[4]}
          releasedAmount={progress[5]}
        />
      )}

      {/* Release all button */}
      {isMerchant && hasPaidMilestones && (
        <div className="flex justify-end">
          <Button
            onClick={handleReleaseAll}
            disabled={isReleasingAll}
            className="bg-green-600 hover:bg-green-700"
          >
            {isReleasingAll ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Release All Paid
          </Button>
        </div>
      )}

      {/* Milestone cards */}
      <div className="space-y-3">
        {milestones.map((milestone, index) => (
          <MilestoneCard
            key={index}
            milestone={milestone}
            invoiceId={invoiceId}
            isMerchant={isMerchant}
            isPayer={isPayer}
            canPayNext={index === nextUnpaidIndex}
            onAction={() => refetch()}
          />
        ))}
      </div>
    </div>
  )
}

// Create milestone invoice form
interface MilestoneFormItem {
  description: string
  amount: string
}

export function CreateMilestoneInvoiceForm({ onSuccess }: { onSuccess?: () => void }) {
  const [memo, setMemo] = useState('')
  const [milestones, setMilestones] = useState<MilestoneFormItem[]>([
    { description: '', amount: '' }
  ])
  const { createInvoice, isPending, isConfirming } = useCreateMilestoneInvoice()
  const { toast } = useToast()

  const addMilestone = () => {
    setMilestones([...milestones, { description: '', amount: '' }])
  }

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index))
    }
  }

  const updateMilestone = (index: number, field: keyof MilestoneFormItem, value: string) => {
    const updated = [...milestones]
    updated[index][field] = value
    setMilestones(updated)
  }

  const totalAmount = milestones.reduce((sum, m) => {
    const amount = parseFloat(m.amount) || 0
    return sum + amount
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (!memo.trim()) {
      toast({ title: 'Error', description: 'Please add a memo', variant: 'destructive' })
      return
    }

    const invalidMilestones = milestones.some(m => !m.description.trim() || !m.amount || parseFloat(m.amount) <= 0)
    if (invalidMilestones) {
      toast({ title: 'Error', description: 'All milestones need a description and valid amount', variant: 'destructive' })
      return
    }

    try {
      const memoHash = keccak256(stringToHex(memo))
      const amounts = milestones.map(m => parseUnits(m.amount, config.usdcDecimals))
      const descriptions = milestones.map(m => m.description)

      await createInvoice(memoHash, '', amounts, descriptions)
      toast({ title: 'Success', description: 'Milestone invoice created!' })
      onSuccess?.()
    } catch (err) {
      console.error('Failed to create milestone invoice:', err)
      toast({ title: 'Error', description: 'Failed to create invoice', variant: 'destructive' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Memo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Invoice Memo
        </label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Project description..."
          className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Milestones
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMilestone}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Milestone
          </Button>
        </div>

        {milestones.map((milestone, index) => (
          <div key={index} className="flex gap-3 items-start">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium flex-shrink-0 mt-2">
              {index + 1}
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={milestone.description}
                onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                placeholder="Milestone description..."
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={milestone.amount}
                    onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full border rounded-lg p-2 pl-7 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                {milestones.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMilestone(index)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Amount</span>
          <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        disabled={isPending || isConfirming}
      >
        {isPending || isConfirming ? (
          <>
            <LoadingSpinner className="w-4 h-4 mr-2" />
            {isConfirming ? 'Confirming...' : 'Creating...'}
          </>
        ) : (
          'Create Milestone Invoice'
        )}
      </Button>
    </form>
  )
}

export { MilestoneProgressBar, MilestoneCard, MilestoneStatusIcon }
