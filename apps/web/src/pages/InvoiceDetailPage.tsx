import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Clock,
  User,
  DollarSign,
  Unlock,
  Undo2,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useInvoice, useReleaseInvoice, useRefundInvoice, useCancelInvoice, formatUsdcAmount } from '@/hooks/useContract'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { InvoiceStatus } from '@/types/invoice'
import { formatCurrency, shortenAddress, getExplorerLink, copyToClipboard } from '@/lib/utils'
import { config } from '@/config'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { address } = useAuth()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const invoiceId = id ? BigInt(id) : undefined
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId)
  
  const { release, isPending: isReleasePending, isConfirming: isReleaseConfirming } = useReleaseInvoice()
  const { refund, isPending: isRefundPending, isConfirming: isRefundConfirming } = useRefundInvoice()
  const { cancel, isPending: isCancelPending, isConfirming: isCancelConfirming } = useCancelInvoice()

  const paymentLink = `${config.appUrl}/pay/${id}`

  const handleCopy = async () => {
    await copyToClipboard(paymentLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: 'Copied!',
      description: 'Payment link copied to clipboard',
    })
  }

  const handleRelease = async () => {
    if (!invoiceId) return
    try {
      await release(invoiceId)
      toast({
        title: 'Funds released!',
        description: 'Payment has been released to your wallet',
        variant: 'success',
      })
      refetch()
    } catch (error: any) {
      toast({
        title: 'Error releasing funds',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleRefund = async () => {
    if (!invoiceId) return
    try {
      await refund(invoiceId)
      toast({
        title: 'Refund processed!',
        description: 'Payment has been refunded to the payer',
        variant: 'success',
      })
      refetch()
    } catch (error: any) {
      toast({
        title: 'Error processing refund',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleCancel = async () => {
    if (!invoiceId) return
    try {
      await cancel(invoiceId)
      toast({
        title: 'Invoice cancelled',
        description: 'This invoice has been cancelled',
      })
      refetch()
    } catch (error: any) {
      toast({
        title: 'Error cancelling invoice',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Invoice not found</p>
        <Button onClick={() => navigate('/app/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  const isMerchant = address?.toLowerCase() === invoice.merchant.toLowerCase()
  const isReleaseLoading = isReleasePending || isReleaseConfirming
  const isRefundLoading = isRefundPending || isRefundConfirming
  const isCancelLoading = isCancelPending || isCancelConfirming

  return (
    <div className="max-w-4xl mx-auto">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/app/dashboard')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">Invoice #{invoice.id.toString()}</CardTitle>
                  <CardDescription>
                    Created on {new Date(Number(invoice.createdAt) * 1000).toLocaleDateString()}
                  </CardDescription>
                </div>
                <StatusBadge status={invoice.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(parseFloat(formatUsdcAmount(invoice.usdcAmount)))}
                  </p>
                  <p className="text-xs text-gray-500">USDC on Polygon</p>
                </div>
              </div>

              {/* Due Date */}
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

              {/* Payer */}
              {invoice.payer && invoice.payer !== '0x0000000000000000000000000000000000000000' && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Paid by</p>
                    <a
                      href={getExplorerLink('address', invoice.payer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-violet-600 hover:underline"
                    >
                      {shortenAddress(invoice.payer)}
                      <ExternalLink className="w-3 h-3 inline ml-1" />
                    </a>
                    {Number(invoice.paidAt) > 0 && (
                      <p className="text-xs text-gray-500">
                        on {new Date(Number(invoice.paidAt) * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Merchant Actions */}
              {isMerchant && (
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  {invoice.status === InvoiceStatus.PaidEscrowed && (
                    <div className="flex gap-3">
                      <Button
                        variant="gradient"
                        className="flex-1"
                        onClick={handleRelease}
                        loading={isReleaseLoading}
                      >
                        <Unlock className="w-4 h-4 mr-2" />
                        Release Funds
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleRefund}
                        loading={isRefundLoading}
                      >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Refund
                      </Button>
                    </div>
                  )}
                  
                  {invoice.status === InvoiceStatus.Unpaid && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleCancel}
                      loading={isCancelLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Invoice
                    </Button>
                  )}
                </div>
              )}

              {/* View on Explorer */}
              <a
                href={getExplorerLink('address', config.invoiceContractAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-violet-600 hover:underline flex items-center gap-1"
              >
                View contract on PolygonScan
                <ExternalLink className="w-3 h-3" />
              </a>
            </CardContent>
          </Card>
        </motion.div>

        {/* Share / QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share Payment Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoice.status === InvoiceStatus.Unpaid && (
                <>
                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-lg border flex justify-center">
                    <QRCodeSVG
                      value={paymentLink}
                      size={160}
                      level="M"
                      includeMargin
                    />
                  </div>

                  {/* Payment Link */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Payment URL</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentLink}
                        readOnly
                        className="flex-1 text-xs bg-gray-50 rounded-lg px-3 py-2 font-mono truncate"
                      />
                      <Button size="sm" variant="outline" onClick={handleCopy}>
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Open Payment Page */}
                  <Link to={`/pay/${id}`} target="_blank">
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Payment Page
                    </Button>
                  </Link>
                </>
              )}

              {invoice.status !== InvoiceStatus.Unpaid && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">
                    {invoice.status === InvoiceStatus.Cancelled && 'This invoice has been cancelled'}
                    {invoice.status === InvoiceStatus.PaidEscrowed && 'Payment received - awaiting release'}
                    {invoice.status === InvoiceStatus.Released && 'Payment completed'}
                    {invoice.status === InvoiceStatus.Refunded && 'Payment refunded'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
