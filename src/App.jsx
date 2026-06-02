import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import CreateItem from './pages/CreateItem';
import Pending from './pages/Pending';
import Approval from './pages/Approval';
import Execution from './pages/Execution';

function App() {
  return (
    <AppProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<CreateItem />} />
          <Route path="/pending" element={<Pending />} />
          <Route path="/approval/:id" element={<Approval />} />
          <Route path="/execution" element={<Execution />} />
          <Route path="/execution/:id" element={<Execution />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
