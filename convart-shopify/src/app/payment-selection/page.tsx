'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Icon from '@/components/ui/AppIcon';
import { QRCodeSVG } from 'qrcode.react';
import ShopifyCheckoutButton, { useShopifyCheckoutEnabled } from '@/components/common/ShopifyCheckoutButton';

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'paylater' | null;

const PaymentSelectionPage = () => {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderAmount, setOrderAmount] = useState(7999);
  const shopifyEnabled = useShopifyCheckoutEnabled();
  const isShopifyMethod = shopifyEnabled === true && selectedMethod !== null && selectedMethod !== 'upi';

  useEffect(() => {
    const orderData = localStorage.getItem('pendingOrderData');
    if (orderData) {
      const parsedOrderData = JSON.parse(orderData);
      setOrderAmount(parsedOrderData?.total || 7999);
    }
  }, []);

  const upiString = `upi://pay?pa=shwetadave95-5@okhdfcbank&pn=Convart&am=${orderAmount}&cu=INR`;

  const paymentOptions = [
    {
      id: 'upi' as PaymentMethod,
      title: 'UPI / QR Code',
      subtitle: 'Recommended',
      icon: 'QrCodeIcon',
      description: 'Scan QR code with any UPI app',
      color: '#00BFBF',
    },
    {
      id: 'card' as PaymentMethod,
      title: 'Credit/Debit Card',
      subtitle: shopifyEnabled ? 'Secure checkout' : 'Powered by Razorpay',
      icon: 'CreditCardIcon',
      description: 'Visa, Mastercard, Amex accepted',
      color: '#CC00CC',
    },
    {
      id: 'netbanking' as PaymentMethod,
      title: 'Net Banking',
      subtitle: 'All major banks',
      icon: 'BuildingLibraryIcon',
      description: 'Secure bank transfer',
      color: '#D4A000',
    },
    {
      id: 'paylater' as PaymentMethod,
      title: 'Pay Later / EMI',
      subtitle: 'Flexible payment',
      icon: 'BanknotesIcon',
      description: 'Split payment into installments',
      color: '#2563EB',
    },
  ];

  const handlePaymentComplete = () => {
    setIsProcessing(true);
    setTimeout(() => {
      router.push('/order-success');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-300 group"
            >
              <Icon
                name="ChevronLeftIcon"
                size={20}
                variant="outline"
                className="group-hover:text-gray-900 transition-colors"
              />
              <span className="font-body text-sm">Back to Checkout</span>
            </button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-gray-900 mb-4">
              Select Payment Method
            </h1>
            <p className="text-gray-600 font-body text-lg">
              Choose your preferred payment option to complete your order
            </p>
            <div className="mt-4 inline-block px-6 py-3 bg-[#00BFBF]/10 border border-[#00BFBF]/30 rounded-xl">
              <span className="text-gray-700 font-body">Total Amount: </span>
              <span className="text-3xl font-headline font-bold text-[#00BFBF]">
                ₹{orderAmount.toLocaleString('en-IN')}
              </span>
              <p className="text-xs text-green-600 font-semibold mt-1">✓ Price inclusive of GST</p>
            </div>
          </motion.div>

          {/* Payment Options */}
          <div className="space-y-4 mb-8">
            {paymentOptions.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <button
                  onClick={() => setSelectedMethod(selectedMethod === option.id ? null : option.id)}
                  className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 bg-white hover:border-gray-300`}
                  style={{
                    borderColor: selectedMethod === option.id ? option.color : '#E5E7EB',
                    backgroundColor: selectedMethod === option.id ? `${option.color}10` : '#FFFFFF',
                    boxShadow: selectedMethod === option.id ? `0 4px 20px ${option.color}30` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${option.color}15` }}
                      >
                        <Icon
                          name={option.icon}
                          size={28}
                          variant="outline"
                          style={{ color: option.color }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xl font-headline font-bold text-gray-900">
                            {option.title}
                          </h3>
                          {option.subtitle && (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-cta font-semibold"
                              style={{ backgroundColor: `${option.color}15`, color: option.color }}
                            >
                              {option.subtitle}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 font-body text-sm mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: selectedMethod === option.id ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon
                        name="ChevronDownIcon"
                        size={24}
                        variant="outline"
                        className="text-gray-500"
                      />
                    </motion.div>
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {selectedMethod === option.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 mt-2 rounded-2xl bg-gray-50 border border-gray-200">
                        {option.id === 'upi' && (
                          <div className="flex flex-col items-center">
                            <div className="bg-white p-4 rounded-xl mb-4 border border-gray-200">
                              <QRCodeSVG
                                value={upiString}
                                size={200}
                                level="H"
                                includeMargin={false}
                              />
                            </div>
                            <p className="text-gray-700 font-body text-sm text-center">
                              Scan with any UPI app (GPay, PhonePe, Paytm)
                            </p>
                            <p className="text-gray-500 font-body text-xs mt-2">
                              UPI ID: shwetadave95-5@okhdfcbank
                            </p>

                            {/* UPI App Redirect Buttons */}
                            <div className="mt-6 w-full">
                              <p className="text-gray-600 font-body text-sm text-center mb-4">
                                — or open directly in your UPI app —
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                {/* Google Pay */}
                                <a
                                  href={`gpay://upi/pay?pa=shwetadave95-5@okhdfcbank&pn=Convart&am=${orderAmount}&cu=INR&tn=ConvArt+Order`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const deepLink = `gpay://upi/pay?pa=shwetadave95-5@okhdfcbank&pn=Convart&am=${orderAmount}&cu=INR&tn=ConvArt+Order`;
                                    window.location.href = deepLink;
                                    setTimeout(() => {
                                      window.open('https://pay.google.com', '_blank');
                                    }, 1500);
                                  }}
                                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                                >
                                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M24 9.5C27.69 9.5 30.98 10.84 33.48 13.07L40.12 6.43C36.02 2.63 30.3 0.5 24 0.5C14.82 0.5 6.96 5.88 3.24 13.62L10.9 19.6C12.72 14.02 17.92 9.5 24 9.5Z" fill="#EA4335"/>
                                    <path d="M46.5 24.5C46.5 22.96 46.36 21.46 46.1 20H24V28.5H36.68C36.1 31.34 34.48 33.72 32.08 35.32L39.52 41.12C43.84 37.1 46.5 31.2 46.5 24.5Z" fill="#4285F4"/>
                                    <path d="M10.9 28.4C10.42 26.98 10.14 25.47 10.14 23.9C10.14 22.33 10.42 20.82 10.9 19.4L3.24 13.42C1.18 17.44 0 21.98 0 26.78C0 31.58 1.18 36.12 3.24 40.14L10.9 34.16C10.42 32.74 10.14 31.23 10.14 29.66" fill="#FBBC05"/>
                                    <path d="M24 47.5C30.3 47.5 35.62 45.44 39.52 41.12L32.08 35.32C30.02 36.72 27.22 37.5 24 37.5C17.92 37.5 12.72 32.98 10.9 27.4L3.24 33.38C6.96 41.12 14.82 47.5 24 47.5Z" fill="#34A853"/>
                                  </svg>
                                  <span className="text-gray-900 font-body text-sm font-semibold">Google Pay</span>
                                </a>

                                {/* PhonePe */}
                                <a
                                  href={`phonepe://pay?pa=shwetadave95-5@okhdfcbank&pn=Convart&am=${orderAmount}&cu=INR&tn=ConvArt+Order`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const deepLink = `phonepe://pay?pa=shwetadave95-5@okhdfcbank&pn=Convart&am=${orderAmount}&cu=INR&tn=ConvArt+Order`;
                                    window.location.href = deepLink;
                                    setTimeout(() => {
                                      window.open('https://www.phonepe.com', '_blank');
                                    }, 1500);
                                  }}
                                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                                >
                                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="48" height="48" rx="10" fill="#5F259F"/>
                                    <path d="M33.5 14H20.5C17.46 14 15 16.46 15 19.5V34L19 30V19.5C19 18.67 19.67 18 20.5 18H33.5C36.54 18 39 20.46 39 23.5C39 26.54 36.54 29 33.5 29H28V33H33.5C38.75 33 43 28.75 43 23.5C43 18.25 38.75 14 33.5 14Z" fill="white"/>
                                  </svg>
                                  <span className="text-gray-900 font-body text-sm font-semibold">PhonePe</span>
                                </a>

                                {/* Paytm */}
                                <a
                                  href={`paytmmp://pay?pa=shwetadave95-5@okhdfcbank&pn=Convart&am=${orderAmount}&cu=INR&tn=ConvArt+Order`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const deepLink = `paytmmp://pay?pa=shwetadave95-5@okhdfcbank&pn=Convart&am=${orderAmount}&cu=INR&tn=ConvArt+Order`;
                                    window.location.href = deepLink;
                                    setTimeout(() => {
                                      window.open('https://paytm.com', '_blank');
                                    }, 1500);
                                  }}
                                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                                >
                                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="48" height="48" rx="10" fill="#00BAF2"/>
                                    <path d="M8 24C8 15.16 15.16 8 24 8C32.84 8 40 15.16 40 24C40 32.84 32.84 40 24 40C15.16 40 8 32.84 8 24Z" fill="white"/>
                                    <path d="M24 14C18.48 14 14 18.48 14 24C14 29.52 18.48 34 24 34C29.52 34 34 29.52 34 24C34 18.48 29.52 14 24 14ZM24 30C20.69 30 18 27.31 18 24C18 20.69 20.69 18 24 18C27.31 18 30 20.69 30 24C30 27.31 27.31 30 24 30Z" fill="#00BAF2"/>
                                  </svg>
                                  <span className="text-gray-900 font-body text-sm font-semibold">Paytm</span>
                                </a>

                                {/* BHIM UPI */}
                                <a
                                  href={`upi://pay?pa=shwetadave95-5@okhdfcbank&pn=Convart&am=${orderAmount}&cu=INR&tn=ConvArt+Order`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const deepLink = `upi://pay?pa=shwetadave95-5@okhdfcbank&pn=Convart&am=${orderAmount}&cu=INR&tn=ConvArt+Order`;
                                    window.location.href = deepLink;
                                    setTimeout(() => {
                                      window.open('https://www.bhimupi.org.in', '_blank');
                                    }, 1500);
                                  }}
                                  className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                                >
                                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="48" height="48" rx="10" fill="#00529B"/>
                                    <path d="M12 16H22C25.31 16 28 18.69 28 22C28 25.31 25.31 28 22 28H18V32H12V16ZM18 23H22C22.55 23 23 22.55 23 22C23 21.45 22.55 21 22 21H18V23Z" fill="white"/>
                                    <path d="M30 16H36V32H30V16Z" fill="#FF9933"/>
                                    <path d="M30 22H36V26H30V22Z" fill="white"/>
                                  </svg>
                                  <span className="text-gray-900 font-body text-sm font-semibold">BHIM UPI</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        {option.id === 'card' && shopifyEnabled && (
                          <ShopifyCheckoutButton label={`Pay by card — ₹${orderAmount.toLocaleString('en-IN')}`} color="#CC00CC" />
                        )}
                        {option.id === 'card' && !shopifyEnabled && (
                          <div className="text-center text-gray-600 font-body">
                            <Icon name="CreditCardIcon" size={48} variant="outline" className="mx-auto mb-3 text-[#CC00CC]" />
                            <p className="text-gray-800">Razorpay integration coming soon</p>
                            <p className="text-sm mt-2 text-gray-600">For now, please use UPI payment</p>
                          </div>
                        )}
                        {option.id === 'netbanking' && shopifyEnabled && (
                          <ShopifyCheckoutButton label={`Pay with net banking — ₹${orderAmount.toLocaleString('en-IN')}`} color="#D4A000" />
                        )}
                        {option.id === 'netbanking' && !shopifyEnabled && (
                          <div className="text-center text-gray-600 font-body">
                            <Icon name="BuildingLibraryIcon" size={48} variant="outline" className="mx-auto mb-3 text-[#D4A000]" />
                            <p className="text-gray-800">Net Banking integration coming soon</p>
                            <p className="text-sm mt-2 text-gray-600">For now, please use UPI payment</p>
                          </div>
                        )}
                        {option.id === 'paylater' && shopifyEnabled && (
                          <ShopifyCheckoutButton label={`Pay with EMI / Pay Later — ₹${orderAmount.toLocaleString('en-IN')}`} color="#2563EB" />
                        )}
                        {option.id === 'paylater' && !shopifyEnabled && (
                          <div className="text-center text-gray-600 font-body">
                            <Icon name="BanknotesIcon" size={48} variant="outline" className="mx-auto mb-3 text-[#2563EB]" />
                            <p className="text-gray-800">EMI options coming soon</p>
                            <p className="text-sm mt-2 text-gray-600">For now, please use UPI payment</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Action Button (manual UPI confirmation; Shopify methods confirm payment themselves) */}
          {!isShopifyMethod && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={handlePaymentComplete}
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-[#00BFBF] to-[#00A000] text-white font-cta font-bold text-lg rounded-xl hover:shadow-xl hover:shadow-[#00BFBF]/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center space-x-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  <span>Processing...</span>
                </span>
              ) : (
                'I Have Completed Payment'
              )}
            </button>

            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <Icon name="InformationCircleIcon" size={20} variant="outline" className="text-amber-600 mt-0.5" />
                <div className="text-sm text-gray-700 font-body">
                  <p className="font-semibold text-gray-900 mb-1">Important:</p>
                  <p>
                    After completing payment, click the button above. You'll be redirected to verify
                    your payment via WhatsApp and discuss customization details.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentSelectionPage;