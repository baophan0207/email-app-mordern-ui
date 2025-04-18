import { useAuth } from './context/AuthContext';
import { Mail } from "./components/mail/mail";
import { LoginPage } from './pages/LoginPage';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Mail /> : <LoginPage />;
}

export default App;
