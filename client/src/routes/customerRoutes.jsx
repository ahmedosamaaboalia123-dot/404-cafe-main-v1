import { lazy } from 'react';
const CustomerLayout = lazy(() => import('../layouts/CustomerLayout'));
const CustomerMainPage = lazy(() => import('@/modules/customer/main-page/pages/CustomerMainPage'));
const MenuPage = lazy(() => import('@/modules/customer/menu/pages/MenuPage'));
const ProductDetailsPage = lazy(() => import('@/modules/customer/product-details/pages/ProductDetailsPage'));
const CustomerOrdersPage = lazy(() => import('@/modules/customer/orders/pages/CustomerOrdersPage'));
const OrderTrackingPage = lazy(() => import('@/modules/customer/orders/pages/OrderTrackingPage'));
const AiChatbotPage = lazy(() => import('@/modules/customer/chatbot/pages/AiChatbotPage'));
const CustomerFeedbackPage = lazy(() => import('@/modules/customer/feedback/pages/CustomerFeedbackPage'));

export const customerRoutes = {
  path: '/',
  element: <CustomerLayout />,
  children: [
    {
      index: true, element: <CustomerMainPage />,
    },
    {
      path: 'customer',
      element: <CustomerMainPage />,
    },
    {
      path: 'customer/main-page',
      element: <CustomerMainPage />,
    },
    {
      path: 'menu',
      element: <MenuPage />,
    },
    {
      path: 'customer/menu',
      element: <MenuPage />,
    },
    {
      path: 'orders',
      element: <CustomerOrdersPage />,
    },
    {
      path: 'customer/orders',
      element: <CustomerOrdersPage />,
    },
    {
      path: 'my-orders',
      element: <CustomerOrdersPage />,
    },
    {
      path: 'customer/orders/:orderId/track',
      element: <OrderTrackingPage />,
    },
    {
      path: 'orders/:orderId/track',
      element: <OrderTrackingPage />,
    },
    {
      path: 'customer/track/:orderId',
      element: <OrderTrackingPage />,
    },
    {
      path: 'customer/track',
      element: <OrderTrackingPage />,
    },
    {
      path: 'track',
      element: <OrderTrackingPage />,
    },
    {
      path: 'chatbot',
      element: <AiChatbotPage />,
    },
    {
      path: 'customer/chatbot',
      element: <AiChatbotPage />,
    },
    {
      path: 'feedback',
      element: <CustomerFeedbackPage />,
    },
    {
      path: 'customer/feedback',
      element: <CustomerFeedbackPage />,
    },
    {
      path: 'ai-bot',
      element: <AiChatbotPage />,
    },
    {
      path: 'customer/ai-bot',
      element: <AiChatbotPage />,
    },
    {
      path: 'product/:id',
      element: <ProductDetailsPage />,
    },
    {
      path: 'menu/product/:id',
      element: <ProductDetailsPage />,
    },
    {
      path: 'customer/product/:id',
      element: <ProductDetailsPage />,
    },
  ],
};

export default customerRoutes;


