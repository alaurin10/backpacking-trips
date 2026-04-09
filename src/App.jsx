import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics';
import Nav from './components/Nav';
import Home from './pages/Home';
import TripForm from './pages/TripForm';
import TripDetail from './pages/TripDetail';
import Availability from './pages/Availability';

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trips/new" element={<TripForm />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/trips/:id/edit" element={<TripForm />} />
          <Route path="/availability" element={<Availability />} />
        </Routes>
      </main>
      <Analytics />
    </BrowserRouter>
  );
}
