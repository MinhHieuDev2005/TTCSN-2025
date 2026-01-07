import Header from '../common/Header';
import { Outlet } from 'react-router-dom';
import Footer from '../common/Footer';
import { Toaster } from 'react-hot-toast';

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <Header />

      {/* Content */}
      <main className="flex-grow">
        <div className="container mx-auto pt-24">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
};

export default MainLayout;
