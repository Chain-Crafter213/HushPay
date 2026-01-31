import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, CheckCircle, RefreshCw, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useDisputes } from '@/hooks/useV2Contracts'
import { DisputeStatus } from '@/types/dispute'

const statusConfig: Record<DisputeStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  [DisputeStatus.None]: { label: 'None', color: 'bg-gray-100 text-gray-600', icon: Clock },
  [DisputeStatus.Open]: { label: 'Open', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  [DisputeStatus.Resolved]: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
}

export default function DisputesPage() {
  const { address } = useAuth()
  const { data: disputes, isLoading, refetch } = useDisputes(address as `0x${string}`)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  // Filter to show only active disputes (Open)
  const activeDisputes = disputes?.filter(d => d.status === DisputeStatus.Open) || []

  const resolvedDisputes = disputes?.filter(d => d.status === DisputeStatus.Resolved) || []

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
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="text-gray-500 mt-1">Manage payment disputes and resolutions</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Active Disputes</div>
            <div className="text-2xl font-bold text-yellow-600">{activeDisputes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Resolved</div>
            <div className="text-2xl font-bold text-green-600">{resolvedDisputes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{disputes?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Disputes */}
      <Card>
        <CardHeader>
          <CardTitle>Active Disputes</CardTitle>
          <CardDescription>Disputes requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {activeDisputes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No active disputes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeDisputes.map((dispute) => {
                const config = statusConfig[dispute.status]
                const StatusIcon = config.icon
                return (
                  <div
                    key={dispute.invoiceId.toString()}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">Invoice #{dispute.invoiceId.toString()}</p>
                        <p className="text-sm text-gray-500">{dispute.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <Link to={`/app/invoice/${dispute.invoiceId}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Disputes */}
      {resolvedDisputes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resolved Disputes</CardTitle>
            <CardDescription>Past disputes that have been resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resolvedDisputes.map((dispute) => {
                const config = statusConfig[dispute.status]
                const StatusIcon = config.icon
                return (
                  <div
                    key={dispute.invoiceId.toString()}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">Invoice #{dispute.invoiceId.toString()}</p>
                        <p className="text-sm text-gray-500">{dispute.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <Link to={`/app/invoice/${dispute.invoiceId}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
