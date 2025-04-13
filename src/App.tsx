// App.tsx - Main application component

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import services
import { AuthService, CryptoService } from './services/crypto-service';
import { db } from './services/database-service';
import { p2p } from './services/p2p-service';


// Import components
import Login from './components/Login';
import Header from './components/Header';
import LatestFeed from './components/LatestFeed';
import PopularFeed from './components/PopularFeed';
import Notifications from './components/Notifications';
import LegalDisclaimer from './components/LegalDisclaimer';

// Types
import { KeyPair } from './types';

import { Analytics } from "@vercel/analytics/react"

// Main App component
const App: React.FC = () => {
  // State for authentication and app initialization
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [networkStatus, setNetworkStatus] = useState<{ connected: boolean; peers: number }>({
    connected: false,
    peers: 0
  });

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize services
        await db.initialize();
        
        // Check if user has keys
        const savedKeyPair = await AuthService.initialize();
        
        if (savedKeyPair) {
          setKeyPair(savedKeyPair);
          setIsAuthenticated(true);
          
          // Initialize P2P service
          await p2p.initialize(savedKeyPair.publicKey, savedKeyPair.privateKey);
          
          // Check network status
          const status = await p2p.checkNetworkStatus();
          setNetworkStatus(status);
          
          // Check if user has seen the disclaimer
          const hasSeenDisclaimer = localStorage.getItem('has_seen_disclaimer');
          if (!hasSeenDisclaimer) {
            setShowDisclaimer(true);
          }
          
          // Clean up expired notifications
          await db.cleanupExpiredNotifications();
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeApp();
    
    // Set up a network status check interval
    const networkCheckInterval = setInterval(async () => {
      try {
        if (isAuthenticated && keyPair) {
          const status = await p2p.checkNetworkStatus();
          setNetworkStatus(status);
        }
      } catch (error) {
        console.error('Network status check failed:', error);
      }
    }, 30000); // Every 30 seconds
    
    // Cleanup function
    return () => {
      // Disconnect from P2P network when component unmounts
      p2p.disconnect();
      clearInterval(networkCheckInterval);
    };
  }, [isAuthenticated]);
  
  // Fetch unread notification count periodically
  useEffect(() => {
    if (!isAuthenticated || !keyPair) return;
    
    const fetchNotificationCount = async () => {
      try {
        const notifications = await db.getNotifications(keyPair.publicKey, true);
        setNotificationCount(notifications.length);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };
    
    // Fetch immediately and then every 15 seconds
    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 15000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, keyPair]);
  
  // Handle login/signup
  const handleAuthentication = async (newKeyPair: KeyPair) => {
    try {
      setKeyPair(newKeyPair);
      setIsAuthenticated(true);
      setShowDisclaimer(true);
      
      // Initialize master encryption key
      await CryptoService.initializeMasterKey(newKeyPair.privateKey);
      
      // Initialize P2P service
      await p2p.initialize(newKeyPair.publicKey, newKeyPair.privateKey);
      
      const status = await p2p.checkNetworkStatus();
      setNetworkStatus(status);
    } catch (error) {
      console.error('Authentication error:', error);
      alert('There was a problem logging in. Please try again.');
      setIsAuthenticated(false);
      setKeyPair(null);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    AuthService.signOut();
    p2p.disconnect();
    setIsAuthenticated(false);
    setKeyPair(null);
    setNetworkStatus({ connected: false, peers: 0 });
    setNotificationCount(0);
  };
  
  // Handle disclaimer acknowledgment
  const handleDisclaimerAcknowledged = () => {
    localStorage.setItem('has_seen_disclaimer', 'true');
    setShowDisclaimer(false);
  };
  
  // Handle notification read
  const handleNotificationRead = () => {
    // Refresh notification count
    if (keyPair) {
      db.getNotifications(keyPair.publicKey, true)
        .then(notifications => setNotificationCount(notifications.length))
        .catch(error => console.error('Failed to update notification count:', error));
    }
  };
  
  // Show loading indicator while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }
  
  // Show login/signup if not authenticated
  if (!isAuthenticated) {
    return <Login onAuthenticate={handleAuthentication} />;
  }
  
  // Show legal disclaimer if needed
  if (showDisclaimer) {
    return <LegalDisclaimer onAcknowledge={handleDisclaimerAcknowledged} />;
  }
  
  // Main application
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header 
          userDisplayId={keyPair ? AuthService.getDisplayId(keyPair.publicKey) : ''}
          onLogout={handleLogout}
          notificationCount={notificationCount}
        />
        
        {/* Network status indicator */}
        {!networkStatus.connected && (
          <div className="bg-yellow-50 p-2 text-center text-sm text-yellow-800 border-b border-yellow-100">
            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
            Operating in offline mode. Your changes will sync when you reconnect to the network.
          </div>
        )}
        
        <main className="container mx-auto p-4 pb-20 max-w-2xl">
          <Routes>
            <Route path="/latest" element={keyPair ? <LatestFeed keyPair={keyPair} /> : <Navigate to="/" replace />} />
            <Route path="/popular" element={keyPair ? <PopularFeed keyPair={keyPair} /> : <Navigate to="/" replace />} />
            <Route 
              path="/notifications" 
              element={
                keyPair ? (
                  <Notifications 
                    keyPair={keyPair} 
                    onNotificationRead={handleNotificationRead} 
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route path="*" element={<Navigate to="/latest" replace />} />
          </Routes>
        </main>
        
        {/* Network status footer on mobile */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 p-2 flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${networkStatus.connected ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            {networkStatus.connected ? 'Connected' : 'Offline'}
          </div>
          <div>
            {networkStatus.connected ? `${networkStatus.peers} peers` : 'Local only'}
          </div>
        </div>
      </div>
      <Analytics />
    </Router>
  );
};

export default App;