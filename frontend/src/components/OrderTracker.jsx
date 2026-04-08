import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Clock, ChefHat, CheckCircle2, Truck, Package, MapPin, Phone, XCircle } from 'lucide-react';

const LiveTrackingMap = lazy(() => import('./LiveTrackingMap'));

const DELIVERY_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Package, description: 'Your order has been received' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2, description: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Chefs are cooking your food' },
  { key: 'ready', label: 'Ready', icon: Package, description: 'Your food is ready for pickup' },
  { key: 'picked_up', label: 'Picked Up', icon: Truck, description: 'Driver has picked up your order' },
  { key: 'out_for_delivery', label: 'On the Way', icon: Truck, description: 'Your order is en route' },
  { key: 'delivered', label: 'Delivered', icon: MapPin, description: 'Enjoy your meal!' },
];

const PICKUP_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Package, description: 'Your order has been received' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2, description: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Chefs are cooking your food' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: Package, description: 'Collect from the counter!' },
  { key: 'delivered', label: 'Collected', icon: CheckCircle2, description: 'Enjoy your meal!' },
];

const DINE_IN_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Package, description: 'Your order has been received' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2, description: 'Kitchen is on it' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Being freshly prepared' },
  { key: 'ready_for_pickup', label: 'Served', icon: CheckCircle2, description: 'Served to your table!' },
];

const getSteps = (order) => {
  const ot = order.order_type || '';
  const dt = order.delivery_type || '';
  if (ot === 'dine-in' || ot === 'dine_in') return DINE_IN_STEPS;
  if (dt === 'self_delivery' || dt === 'external_delivery' || ot === 'delivery') return DELIVERY_STEPS;
  return PICKUP_STEPS;
};

const getStepIndex = (steps, status) => {
  // Map legacy statuses
  const mapped = status === 'pending' ? 'placed' : status === 'confirmed' ? 'accepted' : status;
  const idx = steps.findIndex(s => s.key === mapped);
  return idx >= 0 ? idx : -1;
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const getTimestamp = (order, stepKey) => {
  if (!order.status_history) return null;
  const entry = order.status_history.find(h => h.status === stepKey);
  return entry?.timestamp || null;
};

const OrderTracker = ({ order }) => {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  if (!order) return null;

  const isCancelled = order.status === 'cancelled';
  const steps = getSteps(order);
  const currentIdx = getStepIndex(steps, order.status);

  if (isCancelled) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
        <p className="font-bold text-red-700 text-lg">Order Cancelled</p>
        <p className="text-sm text-red-500">This order has been cancelled.</p>
      </div>
    );
  }

  const isComplete = currentIdx >= steps.length - 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Live header */}
      {!isComplete && (
        <div className="flex items-center gap-2 mb-5">
          <span className={`w-2.5 h-2.5 rounded-full ${pulse ? 'bg-green-500' : 'bg-green-300'} transition-colors`} />
          <span className="text-sm font-semibold text-green-700">Live Tracking</span>
          <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Updates automatically
          </span>
        </div>
      )}

      {/* Steps */}
      <div className="relative">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const ts = getTimestamp(order, step.key);
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.key} className="flex gap-4 relative">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-[18px] top-[36px] w-0.5 h-[calc(100%-20px)]">
                  <div
                    className={`h-full transition-all duration-700 ${
                      idx < currentIdx ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}

              {/* Icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCompleted
                    ? isCurrent && !isComplete
                      ? 'bg-green-500 text-white ring-4 ring-green-100 shadow-lg'
                      : 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                }`}
              >
                <StepIcon className="w-4 h-4" />
                {isCurrent && !isComplete && (
                  <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-25" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className={`font-semibold text-sm ${isCompleted ? 'text-[#0f172a]' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {ts && (
                    <span className="text-xs text-gray-400">{formatTime(ts)}</span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${isCompleted ? 'text-gray-500' : 'text-gray-300'}`}>
                  {step.description}
                </p>
                {isCurrent && step.key === 'preparing' && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-amber-600 font-medium">Cooking in progress...</span>
                  </div>
                )}
                {isCurrent && (step.key === 'out_for_delivery' || step.key === 'picked_up') && (
                  <div className="mt-2">
                    {order.driver_name && (
                      <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs">
                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-semibold text-indigo-700">{order.driver_name}</span>
                        {order.driver_phone && (
                          <a href={`tel:${order.driver_phone}`} className="text-indigo-500 hover:text-indigo-700">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                    {order.delivery_agent_name && !order.driver_name && (
                      <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs">
                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-semibold text-indigo-700">{order.delivery_agent_name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Map — visible when driver is on the way */}
      {!isComplete && ['picked_up', 'out_for_delivery'].includes(order.status) && order.delivery_address && (
        <div className="mt-4">
          <Suspense fallback={
            <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200">
              <span className="text-sm text-slate-500">Loading map...</span>
            </div>
          }>
            <LiveTrackingMap
              orderId={order.id}
              deliveryAddress={order.delivery_address}
            />
          </Suspense>
        </div>
      )}

      {/* Estimated time */}
      {!isComplete && currentIdx >= 0 && currentIdx < steps.length - 1 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              Estimated: {currentIdx <= 2 ? '25-35 min' : currentIdx <= 4 ? '10-20 min' : '5-10 min'}
            </span>
          </div>
          {order.delivery_address && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {order.delivery_address.length > 30 ? order.delivery_address.substring(0, 30) + '...' : order.delivery_address}
            </span>
          )}
        </div>
      )}

      {/* Completion celebration */}
      {isComplete && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <p className="text-lg">🎉</p>
          <p className="text-sm font-semibold text-green-700">
            {order.order_type === 'dine-in' || order.order_type === 'dine_in' ? 'Enjoy your meal!' : 'Order delivered successfully!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderTracker;
