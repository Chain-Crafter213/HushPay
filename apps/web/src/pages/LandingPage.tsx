import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Zap, Globe, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function LandingPage() {
  const { isLoggedIn, login } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold">H</span>
              </div>
              <span className="font-bold text-xl">HushPay</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                How it works
              </a>
            </nav>
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <Link to="/app">
                  <Button>Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Button variant="ghost" onClick={login}>
                    Sign in
                  </Button>
                  <Button variant="gradient" onClick={login}>
                    Get started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              Powered by Polygon PoS + USDC
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Pay anything.
              <span className="gradient-text block">No wallet drama.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Create payment links and invoices in seconds. Your customers pay with USDC, 
              you settle instantly on Polygon. No seed phrases, no complexity.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl" variant="gradient" onClick={login} className="w-full sm:w-auto">
                Start accepting payments
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="xl" variant="outline" asChild className="w-full sm:w-auto">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 relative"
          >
            <div className="glass-card rounded-2xl p-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-500">Invoice #001</p>
                  <p className="text-2xl font-bold">$1,250.00 USDC</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                  Paid
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Website redesign project</p>
                <p>Client: Acme Corp</p>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Confirmed on Polygon</span>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-violet-200 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-50" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to get paid
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Simple, secure, and instant payments for freelancers and small businesses.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Settlement</h3>
              <p className="text-gray-600">
                Payments settle in seconds on Polygon. No 3-day bank holds, 
                no chargebacks, no payment processor fees.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Escrow Protection</h3>
              <p className="text-gray-600">
                Built-in escrow holds funds until work is delivered. 
                Release or refund with a single click.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No Wallet Required</h3>
              <p className="text-gray-600">
                Sign in with email or social. We handle the blockchain complexity 
                so you can focus on your business.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get paid in three simple steps.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Create invoice', desc: 'Set amount, add a memo, and get a shareable payment link.' },
              { step: '02', title: 'Share with client', desc: 'Send the link via email, chat, or QR code.' },
              { step: '03', title: 'Get paid in USDC', desc: 'Client pays, you release funds. Done.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl font-bold gradient-text mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="gradient-primary rounded-3xl p-12 text-center text-white"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to simplify your payments?
            </h2>
            <p className="text-white/80 mb-8 max-w-lg mx-auto">
              Join thousands of freelancers and businesses using HushPay 
              to get paid faster with less hassle.
            </p>
            <Button
              size="xl"
              variant="secondary"
              onClick={login}
              className="bg-white text-violet-600 hover:bg-white/90"
            >
              Create your first invoice
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">H</span>
            </div>
            <span className="font-semibold">HushPay</span>
          </div>
          <p className="text-sm text-gray-500">
            Powered by Polygon PoS • Settlement in USDC
          </p>
        </div>
      </footer>
    </div>
  )
}
