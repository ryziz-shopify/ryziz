import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import routesConfig from './routes.config.js';

function AppRoutes() {
  return (
    <Routes>
      {routesConfig.map((route) => (
        <Route key={route.path} path={route.path} Component={route.component} />
      ))}
    </Routes>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);
