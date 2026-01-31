import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, ExternalLink, RefreshCw, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useMerchantInvoices, formatUsdcAmount } from '@/hooks/useContract'
import { formatCurrency, shortenAddress, getExplorerLink } from '@/lib/utils'
import { InvoiceStatus } from '@/types/invoice'

export default function DashboardPage() {
  const { address } = useAuth()
  const { invoices, isLoading, error, refetch } = useMerchantInvoices(address as `0x${string}`)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (address) {
      refetch()
    }
  }, [address, refetch])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Calculate stats
  const totalInvoices = invoices.length
  const paidInvoices = invoices.filter(
    (inv) => inv.status === InvoiceStatus.PaidEscrowed || 
             inv.status === InvoiceStatus.Released
  )
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.usdcAmount, 0n)
  const pendingInvoices = invoices.filter((inv) => inv.status === InvoiceStatus.Unpaid)
  const escrowedInvoices = invoices.filter((inv) => inv.status === InvoiceStatus.PaidEscrowed)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Manage your invoices and payments</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/app/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Invoices</p>
            <p className="text-2xl font-bold">{totalInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Received</p>
            <p className="text-2xl font-bold">
              {formatCurrency(parseFloat(formatUsdcAmount(totalPaid)))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold">{pendingInvoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">In Escrow</p>
            <p className="text-2xl font-bold">{escrowedInvoices.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>Error loading invoices</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Try again
              </Button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No invoices yet</p>
              <Link to="/app/new">
                <Button>Create your first invoice</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Payer</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, index) => (
                    <motion.tr
                      key={invoice.id.toString()}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm">#{invoice.id.toString()}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold">
                          {formatCurrency(parseFloat(formatUsdcAmount(invoice.usdcAmount)))}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {new Date(Number(invoice.createdAt) * 1000).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {invoice.payer && invoice.payer !== '0x0000000000000000000000000000000000000000' ? (
                          <a
                            href={getExplorerLink('address', invoice.payer)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-600 hover:underline font-mono"
                          >
                            {shortenAddress(invoice.payer)}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link to={`/app/invoice/${invoice.id.toString()}`}>
                          <Button variant="ghost" size="sm">
                            View
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
