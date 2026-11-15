import Header from '../common/Header';
import {Outlet, useLocation} from 'react-router-dom';
import Footer from '../common/Footer';
import ChatLink from '../components/ChatLink';

const MainLayout = () => {
  const chat = useLocation().pathname === '/chat';
  return (
    <div className={`flex flex-col ${chat ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      {/* Header */}
      <Header />

      {/* Content */}
      <main className={chat ? 'flex min-h-0 flex-1 flex-col' : 'flex-grow'}>
        <div className={`container mx-auto ${chat ? 'flex min-h-0 flex-1 flex-col p-3 sm:p-4' : 'pt-6'}`}>
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      {!chat && <Footer />}
      <ChatLink />

    </div>
  );
};

export default MainLayout;
