import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useInvoice, useUsdcBalance, useUsdcAllowance, useApproveUsdc, usePayInvoice, formatUsdcAmount } from '@/hooks/useContract'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { InvoiceStatus } from '@/types/invoice'
import { formatCurrency, shortenAddress, getExplorerLink } from '@/lib/utils'
import { config } from '@/config'

export default function PaymentPage() {
  const { id } = useParams()
  const { address, isLoggedIn, isWrongNetwork, switchToPolygon, login } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState<'connect' | 'approve' | 'pay' | 'success'>('connect')

  const invoiceId = id ? BigInt(id) : undefined
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId)
  const { data: usdcBalance } = useUsdcBalance(address as `0x${string}`)
  const { data: allowance, refetch: refetchAllowance } = useUsdcAllowance(address as `0x${string}`)
  
  const { approve, isPending: isApprovePending, isConfirming: isApproveConfirming, hash: approveHash } = useApproveUsdc()
  const { payInvoice, isPending: isPayPending, isConfirming: isPayConfirming, hash: payHash, isSuccess: isPaySuccess } = usePayInvoice()

  // Determine step
  useEffect(() => {
    if (!isLoggedIn) {
      setStep('connect')
      return
    }
    
    if (invoice?.status !== InvoiceStatus.Unpaid) {
      return
    }

    if (isPaySuccess) {
      setStep('success')
      return
    }

    const hasAllowance = allowance && invoice && allowance >= invoice.usdcAmount
    if (hasAllowance) {
      setStep('pay')
    } else {
      setStep('approve')
    }
  }, [isLoggedIn, allowance, invoice, isPaySuccess])

  const handleApprove = async () => {
    if (!invoice) return
    try {
      await approve(invoice.usdcAmount)
      toast({
        title: 'Approval successful!',
        description: 'You can now proceed with payment',
        variant: 'success',
      })
      refetchAllowance()
    } catch (error: any) {
      toast({
        title: 'Approval failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handlePay = async () => {
    if (!invoiceId) return
    try {
      await payInvoice(invoiceId)
      toast({
        title: 'Payment successful!',
        description: 'Your payment has been processed',
        variant: 'success',
      })
      refetch()
    } catch (error: any) {
      toast({
        title: 'Payment failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-white">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invoice Not Found</h2>
            <p className="text-gray-600 mb-4">
              This invoice may have been cancelled or doesn't exist.
            </p>
            <Link to="/">
              <Button>Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if invoice is payable
  const isPayable = invoice.status === InvoiceStatus.Unpaid
  const hasEnoughBalance = usdcBalance && usdcBalance >= invoice.usdcAmount
  const isApproveLoading = isApprovePending || isApproveConfirming
  const isPayLoading = isPayPending || isPayConfirming

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white py-12 px-4">
      {/* Header */}
      <div className="max-w-lg mx-auto mb-8 text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold">H</span>
          </div>
          <span className="font-bold text-xl">HushPay</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Payment Request</CardTitle>
            <CardDescription>Invoice #{invoice.id.toString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount */}
            <div className="text-center p-6 bg-gradient-to-r from-violet-100 to-purple-100 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Amount Due</p>
              <p className="text-4xl font-bold">
                {formatCurrency(parseFloat(formatUsdcAmount(invoice.usdcAmount)))}
              </p>
              <p className="text-sm text-gray-500 mt-1">USDC on Polygon</p>
            </div>

            {/* Status */}
            <div className="flex justify-center">
              <StatusBadge status={invoice.status} />
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Merchant</p>
                  <a
                    href={getExplorerLink('address', invoice.merchant)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-violet-600 hover:underline"
                  >
                    {shortenAddress(invoice.merchant, 6)}
                    <ExternalLink className="w-3 h-3 inline ml-1" />
                  </a>
                </div>
              </div>

              {Number(invoice.dueAt) > 0 && (
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Due Date</p>
                    <p className="font-medium">
                      {new Date(Number(invoice.dueAt) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Flow */}
            {!isPayable ? (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                {invoice.status === InvoiceStatus.PaidEscrowed && (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Payment received - awaiting release</span>
                  </div>
                )}
                {invoice.status === InvoiceStatus.Released && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Payment completed</span>
                  </div>
                )}
                {invoice.status === InvoiceStatus.Refunded && (
                  <div className="flex items-center justify-center gap-2 text-orange-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Payment refunded</span>
                  </div>
                )}
                {invoice.status === InvoiceStatus.Cancelled && (
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Invoice cancelled</span>
                  </div>
                )}
                
                {payHash && (
                  <Link to={`/receipt/${id}`} className="block mt-4">
                    <Button variant="outline" className="w-full">
                      View Receipt
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Wrong Network Warning */}
                {isLoggedIn && isWrongNetwork && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800 mb-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Wrong Network</span>
                    </div>
                    <p className="text-sm text-yellow-700 mb-3">
                      Please switch to Polygon network to make a payment.
                    </p>
                    <Button size="sm" onClick={switchToPolygon}>
                      Switch to Polygon
                    </Button>
                  </div>
                )}

                {/* Balance Info */}
                {isLoggedIn && !isWrongNetwork && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Your USDC Balance</span>
                      <span className="font-mono font-medium">
                        {usdcBalance ? formatUsdcAmount(usdcBalance) : '0'} USDC
                      </span>
                    </div>
                    {!hasEnoughBalance && (
                      <p className="text-sm text-red-500 mt-2">
                        Insufficient balance. You need {formatUsdcAmount(invoice.usdcAmount)} USDC.
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {step === 'connect' && (
                  <Button variant="gradient" className="w-full" size="lg" onClick={login}>
                    Connect Wallet to Pay
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {step === 'approve' && !isWrongNetwork && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Step 1 of 2: Approve USDC</p>
                      <div className="flex justify-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-violet-600" />
                        <div className="w-3 h-3 rounded-full bg-gray-200" />
                      </div>
                    </div>
                    <Button
                      variant="gradient"
                      className="w-full"
                      size="lg"
                      onClick={handleApprove}
                      loading={isApproveLoading}
                      disabled={!hasEnoughBalance || isApproveLoading}
                    >
                      {isApproveLoading ? 'Approving...' : 'Approve USDC'}
                    </Button>
                    {approveHash && (
                      <a
                        href={`${config.blockExplorer}/tx/${approveHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-600 hover:underline flex items-center justify-center gap-1"
                      >
                        View transaction <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {step === 'pay' && !isWrongNetwork && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Step 2 of 2: Confirm Payment</p>
                      <div className="flex justify-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-violet-600" />
                        <div className="w-3 h-3 rounded-full bg-violet-600" />
                      </div>
                    </div>
                    <Button
                      variant="gradient"
                      className="w-full"
                      size="lg"
                      onClick={handlePay}
                      loading={isPayLoading}
                      disabled={!hasEnoughBalance || isPayLoading}
                    >
                      {isPayLoading ? 'Processing...' : `Pay ${formatCurrency(parseFloat(formatUsdcAmount(invoice.usdcAmount)))}`}
                    </Button>
                    {payHash && (
                      <a
                        href={`${config.blockExplorer}/tx/${payHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-600 hover:underline flex items-center justify-center gap-1"
                      >
                        View transaction <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {step === 'success' && (
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </motion.div>
                    <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Your payment has been processed and is now in escrow.
                    </p>
                    <Link to={`/receipt/${id}`}>
                      <Button variant="gradient" className="w-full">
                        View Receipt
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Security Note */}
            <p className="text-xs text-center text-gray-500">
              Payments are secured by smart contracts on Polygon. Funds are held in escrow until the merchant releases them.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
