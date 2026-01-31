import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, XCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  useOpenDispute, 
  useCanOpenDispute, 
  useHasActiveDispute, 
  useDisputeWindowRemaining 
} from '@/hooks/useV2Contracts'
import { formatUsdcAmount } from '@/hooks/useContract'
import { useToast } from '@/hooks/useToast'
import { formatCurrency } from '@/lib/utils'
import { DisputeStatus, DisputeOutcome, getDisputeStatusLabel, getDisputeOutcomeLabel } from '@/types/dispute'
import { InvoiceStatus } from '@/types/invoice'

interface DisputeDialogProps {
  invoiceId: bigint
  amount: bigint
  onClose: () => void
  onSuccess: () => void
}

function OpenDisputeDialog({ invoiceId, amount, onClose, onSuccess }: DisputeDialogProps) {
  const [reason, setReason] = useState('')
  const { openDispute, isPending, isConfirming, error } = useOpenDispute()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason for the dispute', variant: 'destructive' })
      return
    }

    try {
      await openDispute(invoiceId, reason)
      toast({ title: 'Success', description: 'Dispute opened successfully' })
      onSuccess()
    } catch (err) {
      console.error('Failed to open dispute:', err)
      toast({ title: 'Error', description: 'Failed to open dispute', variant: 'destructive' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Open Dispute</h3>
            <p className="text-sm text-gray-600">Invoice #{invoiceId.toString()}</p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Amount in dispute</p>
          <p className="text-xl font-bold">{formatCurrency(parseFloat(formatUsdcAmount(amount)))}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for dispute
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue with this payment..."
            className="w-full border rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending || isConfirming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={isPending || isConfirming || !reason.trim()}
            >
              {isPending || isConfirming ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  {isConfirming ? 'Confirming...' : 'Opening...'}
                </>
              ) : (
                'Open Dispute'
              )}
            </Button>
          </div>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error.message}</p>
        )}
      </motion.div>
    </div>
  )
}

// Dispute status badge component
function DisputeStatusBadge({ status, outcome }: { status: DisputeStatus; outcome?: DisputeOutcome }) {
  const getStatusStyle = () => {
    switch (status) {
      case DisputeStatus.Open:
        return 'bg-yellow-100 text-yellow-800'
      case DisputeStatus.Resolved:
        switch (outcome) {
          case DisputeOutcome.ReleasedToMerchant:
            return 'bg-green-100 text-green-800'
          case DisputeOutcome.RefundedToPayer:
            return 'bg-blue-100 text-blue-800'
          case DisputeOutcome.Split:
            return 'bg-purple-100 text-purple-800'
          default:
            return 'bg-gray-100 text-gray-800'
        }
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const label = status === DisputeStatus.Resolved && outcome 
    ? getDisputeOutcomeLabel(outcome)
    : getDisputeStatusLabel(status)

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle()}`}>
      {label}
    </span>
  )
}

// Dispute window countdown component
function DisputeWindowCountdown({ invoiceId }: { invoiceId: bigint }) {
  const { data: remaining } = useDisputeWindowRemaining(invoiceId)
  
  if (!remaining || remaining === 0n) {
    return (
      <div className="flex items-center gap-1 text-gray-500 text-sm">
        <XCircle className="w-4 h-4" />
        <span>Dispute window closed</span>
      </div>
    )
  }

  const hours = Number(remaining) / 3600
  const days = Math.floor(hours / 24)
  const remainingHours = Math.floor(hours % 24)

  return (
    <div className="flex items-center gap-1 text-amber-600 text-sm">
      <Clock className="w-4 h-4" />
      <span>
        {days > 0 ? `${days}d ` : ''}
        {remainingHours}h remaining to dispute
      </span>
    </div>
  )
}

// Info card for dispute help
function DisputeInfoCard() {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">About Disputes</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Disputes can be opened within 7 days of payment</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>An arbiter will review and resolve the dispute</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Possible outcomes: full release, full refund, or split</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Funds are held in escrow during the dispute process</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export button component for invoices that can be disputed
export function DisputeButton({ 
  invoiceId, 
  invoiceStatus,
  amount 
}: { 
  invoiceId: bigint
  invoiceStatus: InvoiceStatus
  amount: bigint 
}) {
  const [showDialog, setShowDialog] = useState(false)
  const { data: canOpen } = useCanOpenDispute(invoiceId)
  const { data: hasActive } = useHasActiveDispute(invoiceId)

  // Only show for paid (escrowed) invoices
  if (invoiceStatus !== InvoiceStatus.PaidEscrowed) {
    return null
  }

  // Don't show if already has active dispute
  if (hasActive) {
    return (
      <div className="flex items-center gap-2 text-amber-600">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">Dispute in progress</span>
      </div>
    )
  }

  // Don't show if dispute window has closed
  if (!canOpen) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <XCircle className="w-4 h-4" />
        <span className="text-sm">Dispute window closed</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <DisputeWindowCountdown invoiceId={invoiceId} />
        <Button
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => setShowDialog(true)}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Open Dispute
        </Button>
      </div>
      
      {showDialog && (
        <OpenDisputeDialog
          invoiceId={invoiceId}
          amount={amount}
          onClose={() => setShowDialog(false)}
          onSuccess={() => {
            setShowDialog(false)
            window.location.reload()
          }}
        />
      )}
    </>
  )
}

export { DisputeStatusBadge, DisputeWindowCountdown, DisputeInfoCard, OpenDisputeDialog }
