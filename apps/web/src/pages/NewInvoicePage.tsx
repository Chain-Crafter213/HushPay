import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Calendar, DollarSign, FileText, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { useCreateInvoice } from '@/hooks/useContract'
import { useToast } from '@/hooks/useToast'
import { config } from '@/config'

export default function NewInvoicePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { createInvoice, isPending, isConfirming, hash } = useCreateInvoice()

  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0',
        variant: 'destructive',
      })
      return
    }

    if (!memo.trim()) {
      toast({
        title: 'Memo required',
        description: 'Please add a description for this invoice',
        variant: 'destructive',
      })
      return
    }

    try {
      const dueDateObj = dueDate ? new Date(dueDate) : undefined
      
      // Create metadata JSON for IPFS (optional, not currently used)
      // const _metadata = JSON.stringify({
      //   memo: memo.trim(),
      //   clientEmail: clientEmail || undefined,
      //   createdAt: new Date().toISOString(),
      // })

      // For now, we'll use empty metadataCID (IPFS upload is optional)
      const metadataCID = ''

      await createInvoice(amount, memo.trim(), dueDateObj, metadataCID)

      toast({
        title: 'Invoice created!',
        description: 'Your invoice has been created on-chain.',
        variant: 'success',
      })

      // Navigate to dashboard after success
      setTimeout(() => navigate('/app/dashboard'), 2000)
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      toast({
        title: 'Error creating invoice',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    }
  }

  const isLoading = isPending || isConfirming

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/app/dashboard')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Invoice
            </CardTitle>
            <CardDescription>
              Create a payment link to share with your client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Amount (USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Payment will be received in USDC on Polygon
                </p>
              </div>

              {/* Memo */}
              <div className="space-y-2">
                <Label htmlFor="memo" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Memo / Description
                </Label>
                <textarea
                  id="memo"
                  placeholder="e.g., Website redesign - Phase 1"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Due Date (Optional)
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Client Email (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Client Email (Optional)
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  For your reference only - not used for notifications
                </p>
              </div>

              {/* Transaction Status */}
              {hash && (
                <div className="p-4 bg-violet-50 rounded-lg">
                  <p className="text-sm text-violet-700">
                    Transaction submitted!{' '}
                    <a
                      href={`${config.blockExplorer}/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View on PolygonScan
                    </a>
                  </p>
                  {isConfirming && (
                    <p className="text-xs text-violet-600 mt-1">
                      Waiting for confirmation...
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                size="lg"
                loading={isLoading}
                disabled={isLoading}
              >
                {isPending ? 'Confirm in wallet...' : isConfirming ? 'Creating...' : 'Create Invoice'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
