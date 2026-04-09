import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import Nav from './components/Nav';
import Home from './pages/Home';
import TripForm from './pages/TripForm';
import TripDetail from './pages/TripDetail';
import Availability from './pages/Availability';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Layout() {
  return (
    <ToastProvider>
      <ScrollToTop />
      <Nav />
      <main className="main">
        <Outlet />
      </main>
    </ToastProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/trips/new', element: <TripForm /> },
      { path: '/trips/:id', element: <TripDetail /> },
      { path: '/trips/:id/edit', element: <TripForm /> },
      { path: '/availability', element: <Availability /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
