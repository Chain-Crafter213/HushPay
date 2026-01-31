import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Wallet, 
  Users, 
  Plus, 
  Trash2, 
  Save, 
  Building,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { 
  useMerchant, 
  useIsMerchant, 
  useOperators, 
  useRegisterMerchant,
  useUpdateProfile,
  useUpdatePayoutAddress,
  useAddOperator,
  useRemoveOperator
} from '@/hooks/useV2Contracts'
import { useToast } from '@/hooks/useToast'
import { shortenAddress, getExplorerLink } from '@/lib/utils'

// Registration form for new merchants
function MerchantRegistrationForm({ onSuccess }: { onSuccess: () => void }) {
  const { address } = useAuth()
  const [payoutAddress, setPayoutAddress] = useState('')
  const [businessName, setBusinessName] = useState('')
  const { register, isPending, isConfirming, error } = useRegisterMerchant()
  const { toast } = useToast()

  // Default payout to connected address
  useEffect(() => {
    if (address && !payoutAddress) {
      setPayoutAddress(address)
    }
  }, [address, payoutAddress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!payoutAddress || !payoutAddress.startsWith('0x')) {
      toast({ title: 'Error', description: 'Invalid payout address', variant: 'destructive' })
      return
    }

    try {
      await register(payoutAddress as `0x${string}`, businessName, '')
      toast({ title: 'Success', description: 'Merchant registered successfully!' })
      onSuccess()
    } catch (err) {
      console.error('Registration failed:', err)
      toast({ title: 'Error', description: 'Failed to register merchant', variant: 'destructive' })
    }
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Register as Merchant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business name"
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payout Address
            </label>
            <input
              type="text"
              value={payoutAddress}
              onChange={(e) => setPayoutAddress(e.target.value)}
              placeholder="0x..."
              className="w-full border rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Address where payments will be sent when released
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                {isConfirming ? 'Confirming...' : 'Registering...'}
              </>
            ) : (
              <>
                <Building className="w-4 h-4 mr-2" />
                Register Merchant
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-red-600">{error.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

// Profile settings section
function ProfileSettings({ merchant }: { merchant: any }) {
  const [businessName, setBusinessName] = useState(merchant.businessName || '')
  const { updateProfile, isPending, isConfirming } = useUpdateProfile()
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      await updateProfile(businessName, merchant.metadataURI || '')
      toast({ title: 'Success', description: 'Profile updated!' })
    } catch (err) {
      console.error('Failed to update profile:', err)
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Business Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Registered Since
          </label>
          <p className="text-gray-600">
            {new Date(Number(merchant.registeredAt) * 1000).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${merchant.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={merchant.isActive ? 'text-green-600' : 'text-red-600'}>
            {merchant.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending || isConfirming || businessName === merchant.businessName}
        >
          {isPending || isConfirming ? (
            <LoadingSpinner className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  )
}

// Payout address settings
function PayoutSettings({ currentPayoutAddress }: { currentPayoutAddress: string }) {
  const [newAddress, setNewAddress] = useState(currentPayoutAddress)
  const { updatePayoutAddress, isPending, isConfirming } = useUpdatePayoutAddress()
  const { toast } = useToast()

  const handleUpdate = async () => {
    if (!newAddress.startsWith('0x') || newAddress.length !== 42) {
      toast({ title: 'Error', description: 'Invalid address format', variant: 'destructive' })
      return
    }

    try {
      await updatePayoutAddress(newAddress as `0x${string}`)
      toast({ title: 'Success', description: 'Payout address updated!' })
    } catch (err) {
      console.error('Failed to update payout address:', err)
      toast({ title: 'Error', description: 'Failed to update payout address', variant: 'destructive' })
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(currentPayoutAddress)
    toast({ title: 'Copied', description: 'Address copied to clipboard' })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Payout Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Payout Address
          </label>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <code className="flex-1 text-sm font-mono">{currentPayoutAddress}</code>
            <button
              onClick={copyAddress}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
            <a
              href={getExplorerLink('address', currentPayoutAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </a>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Payout Address
          </label>
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="0x..."
            className="w-full border rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500">
            All future payments will be sent to this address when released
          </p>
        </div>

        <Button
          onClick={handleUpdate}
          disabled={isPending || isConfirming || newAddress === currentPayoutAddress}
        >
          {isPending || isConfirming ? (
            <LoadingSpinner className="w-4 h-4 mr-2" />
          ) : (
            <Wallet className="w-4 h-4 mr-2" />
          )}
          Update Payout Address
        </Button>
      </CardContent>
    </Card>
  )
}

// Operators management section
function OperatorsSettings({ merchantAddress }: { merchantAddress: `0x${string}` }) {
  const [newOperator, setNewOperator] = useState('')
  const { data: operators, isLoading, refetch } = useOperators(merchantAddress)
  const { addOperator, isPending: isAdding } = useAddOperator()
  const { removeOperator, isPending: isRemoving } = useRemoveOperator()
  const { toast } = useToast()

  const handleAdd = async () => {
    if (!newOperator.startsWith('0x') || newOperator.length !== 42) {
      toast({ title: 'Error', description: 'Invalid address format', variant: 'destructive' })
      return
    }

    try {
      await addOperator(newOperator as `0x${string}`)
      toast({ title: 'Success', description: 'Operator added!' })
      setNewOperator('')
      refetch()
    } catch (err) {
      console.error('Failed to add operator:', err)
      toast({ title: 'Error', description: 'Failed to add operator', variant: 'destructive' })
    }
  }

  const handleRemove = async (operatorAddress: `0x${string}`) => {
    try {
      await removeOperator(operatorAddress)
      toast({ title: 'Success', description: 'Operator removed!' })
      refetch()
    } catch (err) {
      console.error('Failed to remove operator:', err)
      toast({ title: 'Error', description: 'Failed to remove operator', variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Operators
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Operators can release and refund invoices on your behalf. They cannot change settings or add other operators.
        </p>

        {/* Existing operators */}
        {isLoading ? (
          <LoadingSpinner />
        ) : operators && operators.length > 0 ? (
          <div className="space-y-2">
            {operators.map((op) => (
              <div key={op} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <code className="text-sm font-mono">{shortenAddress(op)}</code>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(op)}
                  disabled={isRemoving}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No operators added yet
          </div>
        )}

        {/* Add new operator */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Operator
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOperator}
              onChange={(e) => setNewOperator(e.target.value)}
              placeholder="0x..."
              className="flex-1 border rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              onClick={handleAdd}
              disabled={isAdding || !newOperator}
            >
              {isAdding ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main settings page
export default function MerchantSettingsPage() {
  const { address, isConnected } = useAuth()
  const { data: isMerchant, isLoading: checkingMerchant, refetch: refetchIsMerchant } = useIsMerchant(address as `0x${string}`)
  const { data: merchant, isLoading: loadingMerchant, refetch: refetchMerchant } = useMerchant(address as `0x${string}`)

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Connect Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to access merchant settings</p>
      </div>
    )
  }

  if (checkingMerchant || loadingMerchant) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  // Show registration form if not a merchant
  if (!isMerchant) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Merchant Settings</h1>
          <p className="text-gray-600">Register as a merchant to access advanced features</p>
        </div>

        <MerchantRegistrationForm 
          onSuccess={() => {
            refetchIsMerchant()
            refetchMerchant()
          }} 
        />

        <Card className="max-w-lg mx-auto border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h3 className="font-medium text-blue-900 mb-3">Benefits of Registration</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                <span>Set a custom payout address separate from your main wallet</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                <span>Add team operators who can manage invoices</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                <span>Enhanced business profile for your clients</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Merchant Settings</h1>
        <p className="text-gray-600">Manage your business profile and team</p>
      </div>

      {/* Settings sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSettings merchant={merchant} />
        <PayoutSettings currentPayoutAddress={merchant?.payoutAddress || address!} />
      </div>

      <OperatorsSettings merchantAddress={address as `0x${string}`} />
    </motion.div>
  )
}
