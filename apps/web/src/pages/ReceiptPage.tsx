import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  ExternalLink, 
  Copy, 
  Check,
  User,
  Calendar,
  FileText
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useInvoice, formatUsdcAmount } from '@/hooks/useContract'
import { formatCurrency, shortenAddress, getExplorerLink, copyToClipboard } from '@/lib/utils'
import { InvoiceStatus } from '@/types/invoice'
import { config } from '@/config'

export default function ReceiptPage() {
  const { id } = useParams()
  const [copied, setCopied] = useState(false)

  const invoiceId = id ? BigInt(id) : undefined
  const { data: invoice, isLoading, error } = useInvoice(invoiceId)

  const handleCopyReceipt = async () => {
    const receiptUrl = `${config.appUrl}/receipt/${id}`
    await copyToClipboard(receiptUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Receipt not found</p>
            <Link to="/">
              <Button>Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPaid = invoice.status !== InvoiceStatus.Unpaid && 
                 invoice.status !== InvoiceStatus.Cancelled

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4">
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
        <Card className="overflow-hidden">
          {/* Success Banner */}
          {isPaid && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-10 h-10" />
              </motion.div>
              <h1 className="text-2xl font-bold mb-1">Payment Confirmed</h1>
              <p className="text-white/80">Thank you for your payment</p>
            </div>
          )}

          <CardContent className="p-6 space-y-6">
            {/* Invoice ID */}
            <div className="text-center pb-4 border-b border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Receipt</p>
              <p className="font-mono text-lg font-semibold">Invoice #{invoice.id.toString()}</p>
            </div>

            {/* Status */}
            <div className="flex justify-center">
              <StatusBadge status={invoice.status} className="text-sm px-4 py-1" />
            </div>

            {/* Amount */}
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Amount</p>
              <p className="text-3xl font-bold">
                {formatCurrency(parseFloat(formatUsdcAmount(invoice.usdcAmount)))}
              </p>
              <p className="text-sm text-gray-500">USDC</p>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Merchant */}
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="text-sm">Merchant</span>
                </div>
                <a
                  href={getExplorerLink('address', invoice.merchant)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-violet-600 hover:underline flex items-center gap-1"
                >
                  {shortenAddress(invoice.merchant)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Payer */}
              {invoice.payer && invoice.payer !== '0x0000000000000000000000000000000000000000' && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Paid by</span>
                  </div>
                  <a
                    href={getExplorerLink('address', invoice.payer)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-violet-600 hover:underline flex items-center gap-1"
                  >
                    {shortenAddress(invoice.payer)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Date */}
              {Number(invoice.paidAt) > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Paid on</span>
                  </div>
                  <span className="text-sm">
                    {new Date(Number(invoice.paidAt) * 1000).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Network */}
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Network</span>
                </div>
                <span className="text-sm">Polygon PoS Mainnet</span>
              </div>
            </div>

            {/* Contract Link */}
            <a
              href={getExplorerLink('address', config.invoiceContractAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-violet-600 hover:underline"
            >
              View on PolygonScan
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyReceipt}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Receipt'}
              </Button>
              <Link to="/" className="flex-1">
                <Button variant="gradient" className="w-full">
                  Done
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Powered by HushPay • Settlement in USDC on Polygon
        </p>
      </motion.div>
    </div>
  )
}
