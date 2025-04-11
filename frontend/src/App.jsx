import { Routes, Route } from 'react-router-dom';
import { Mail } from "./components/mail/mail";
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/" element={<ProtectedRoute />}>
        {/* Child route rendered by Outlet in ProtectedRoute */} 
        <Route index element={<Mail />} /> 
        {/* Add other protected routes here if needed */}
      </Route>
    </Routes>
  );
}

export default App;
