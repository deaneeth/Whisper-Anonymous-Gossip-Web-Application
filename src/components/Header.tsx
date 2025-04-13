// Header.tsx - Application header with navigation

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  userDisplayId: string;
  onLogout: () => void;
  notificationCount: number;
}

const Header: React.FC<HeaderProps> = ({ userDisplayId, onLogout, notificationCount }) => {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  
  // Determine if a nav link is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // Toggle user menu
  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };
  
  // Close user menu when clicking outside
  const closeUserMenu = () => {
    setShowUserMenu(false);
  };
  
  return (
    <header className="bg-white shadow sticky top-0 z-10">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex justify-between items-center py-4">
          {/* App logo/name */}
          <div className="flex items-center">
            <Link to="/latest" className="text-xl font-bold text-indigo-600">
              Whisper
            </Link>
          </div>
          
          {/* Navigation tabs */}
          <nav className="flex space-x-1">
            <Link
              to="/latest"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/latest')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Latest
            </Link>
            <Link
              to="/popular"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/popular')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Popular
            </Link>
          </nav>
          
          {/* User menu and notifications */}
          <div className="flex items-center">
            {/* Notifications bell */}
            <Link
              to="/notifications"
              className="relative p-2 mr-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-full"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                />
              </svg>
              
              {/* Notification badge */}
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </Link>
            
            {/* User menu */}
            <div className="relative">
              <button
                onClick={toggleUserMenu}
                className="flex items-center space-x-2 p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none"
              >
                {/* User avatar (random shape) */}
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                  {userDisplayId.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {userDisplayId}
                </span>
                <svg 
                  className="w-4 h-4 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 9l-7 7-7-7" 
                  />
                </svg>
              </button>
              
              {/* User dropdown menu */}
              {showUserMenu && (
                <>
                  {/* Invisible overlay to detect clicks outside */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={closeUserMenu}
                  ></div>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                    <div className="px-4 py-2 text-xs text-gray-500">
                      Logged in as
                    </div>
                    <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b">
                      {userDisplayId}
                    </div>
                    <button
                      onClick={onLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;