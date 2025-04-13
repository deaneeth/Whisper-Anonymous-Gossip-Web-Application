// Notifications.tsx - Displays user notifications
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, Notification as NotificationType, Post, Comment } from '../services/database-service';
import { AuthService } from '../services/crypto-service';
import { KeyPair } from '../types';

interface NotificationsProps {
  keyPair: KeyPair;
  onNotificationRead: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ keyPair, onNotificationRead }) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Fetch notifications on component mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        
        // Fetch notifications for the current user
        const userNotifications = await db.getNotifications(keyPair.publicKey);
        
        // Mark all notifications as read
        for (const notification of userNotifications) {
          if (!notification.isRead) {
            await db.markNotificationAsRead(notification.id);
          }
        }
        
        // Update notifications state
        setNotifications(userNotifications);
        
        // Notify parent that notifications have been read
        onNotificationRead();
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        setError('Failed to load notifications. Please try refreshing the page.');
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, [keyPair.publicKey, onNotificationRead]);
  
  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Clear all notifications
  const handleClearAll = async () => {
    try {
      setLoading(true);
      
      // Mark all notifications as read
      for (const notification of notifications) {
        await db.markNotificationAsRead(notification.id);
      }
      
      // Remove all notifications from state
      setNotifications([]);
      
      // Notify parent that notifications have been read
      onNotificationRead();
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      setError('Failed to clear notifications. Please try again.');
      setLoading(false);
    }
  };
  
  // Render notification message
  const renderNotificationMessage = (notification: NotificationType) => {
    const sourceId = AuthService.getDisplayId(notification.sourcePublicKey);
    
    if (notification.action === 'reply') {
      return (
        <span>
          <span className="font-medium">{sourceId}</span> replied to your {notification.targetType}
        </span>
      );
    } else if (notification.action === 'upvote') {
      return (
        <span>
          <span className="font-medium">{sourceId}</span> upvoted your {notification.targetType}
        </span>
      );
    }
    
    return 'You have a new notification';
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-red-600 hover:text-red-800 focus:outline-none"
            disabled={loading}
          >
            Clear all
          </button>
        )}
      </div>
      
      {loading ? (
        // Loading skeleton
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4">
              <div className="animate-pulse flex items-center">
                <div className="rounded-full bg-gray-200 h-8 w-8"></div>
                <div className="ml-3 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <p>{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-12 w-12 mx-auto text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1} 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No notifications</h3>
          <p className="mt-1 text-gray-500">
            You'll be notified when someone replies to your posts or comments, or upvotes your content.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`bg-white rounded-lg shadow p-4 ${!notification.isRead ? 'border-l-4 border-indigo-500' : ''}`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                    {AuthService.getDisplayId(notification.sourcePublicKey).slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-gray-800">
                    {renderNotificationMessage(notification)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;