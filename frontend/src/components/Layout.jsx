import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';

const Layout = () => {
  const location = useLocation();
  const hideHeader = ['/login'].includes(location.pathname);
  const hideNav = location.pathname === '/admin';

  return (
    <>
      {!hideHeader && <Header hideNav={hideNav} />}
      <Outlet />
    </>
  );
};

export default Layout;
