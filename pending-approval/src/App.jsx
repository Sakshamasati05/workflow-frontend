import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Pending from './pages/Pending';
import Approval from './pages/Approval';

function App() {
  return (
    <AppProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/"              element={<Pending />} />
          <Route path="/pending"       element={<Pending />} />
          <Route path="/approval/:id"  element={<Approval />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
