import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Clock, CheckCircle, RefreshCw, Eye, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useMilestoneInvoices } from '@/hooks/useV2Contracts'
import { MilestoneStatus } from '@/types/milestone'
import { formatCurrency } from '@/lib/utils'
import { formatUsdcAmount } from '@/hooks/useContract'

const statusConfig: Record<MilestoneStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  [MilestoneStatus.Unpaid]: { label: 'Unpaid', color: 'bg-gray-100 text-gray-600', icon: Clock },
  [MilestoneStatus.Paid]: { label: 'Paid', color: 'bg-blue-100 text-blue-700', icon: Target },
  [MilestoneStatus.Released]: { label: 'Released', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  [MilestoneStatus.Refunded]: { label: 'Refunded', color: 'bg-red-100 text-red-700', icon: Clock },
}

export default function MilestonesPage() {
  const { address } = useAuth()
  const { data: milestoneInvoices, isLoading, refetch } = useMilestoneInvoices(address as `0x${string}`)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  // Calculate stats
  const totalMilestones = milestoneInvoices?.reduce((acc, inv) => acc + inv.milestones.length, 0) || 0
  const completedMilestones = milestoneInvoices?.reduce((acc, inv) => 
    acc + inv.milestones.filter(m => m.status === MilestoneStatus.Released).length, 0
  ) || 0
  const pendingMilestones = milestoneInvoices?.reduce((acc, inv) => 
    acc + inv.milestones.filter(m => m.status === MilestoneStatus.Unpaid || m.status === MilestoneStatus.Paid).length, 0
  ) || 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
          <p className="text-gray-500 mt-1">Track project milestones and payments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/app/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Milestone Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Milestones</div>
            <div className="text-2xl font-bold">{totalMilestones}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">{pendingMilestones}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">{completedMilestones}</div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Projects</CardTitle>
          <CardDescription>Invoices with milestone-based payments</CardDescription>
        </CardHeader>
        <CardContent>
          {!milestoneInvoices || milestoneInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No milestone invoices yet</p>
              <p className="text-sm mt-2">Create a new invoice with milestones to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {milestoneInvoices.map((invoice) => (
                <div key={invoice.invoiceId.toString()} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">Invoice #{invoice.invoiceId.toString()}</h3>
                      <p className="text-sm text-gray-500">
                        {invoice.milestones.length} milestones • 
                        Total: {formatCurrency(Number(formatUsdcAmount(invoice.totalAmount)))}
                      </p>
                    </div>
                    <Link to={`/app/invoice/${invoice.invoiceId}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </Link>
                  </div>

                  {/* Milestone Progress */}
                  <div className="space-y-3">
                    {invoice.milestones.map((milestone, idx) => {
                      const config = statusConfig[milestone.status]
                      const StatusIcon = config.icon
                      return (
                        <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className={`p-2 rounded-full ${config.color}`}>
                            <StatusIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{milestone.description}</p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(Number(formatUsdcAmount(milestone.amount)))}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>
                        {invoice.milestones.filter(m => m.status === MilestoneStatus.Released).length} / {invoice.milestones.length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ 
                          width: `${(invoice.milestones.filter(m => m.status === MilestoneStatus.Released).length / invoice.milestones.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
