// PopularFeed.tsx - Shows posts sorted by upvotes
import React, { useState, useEffect } from 'react';
import { db, Post as PostType } from '../services/database-service';
import { KeyPair } from '../types';
import Post from './Post';

interface PopularFeedProps {
  keyPair: KeyPair;
}

const PopularFeed: React.FC<PopularFeedProps> = ({ keyPair }) => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Fetch posts on component mount and when refresh is triggered
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        // Fetch posts from local database, sorted by popularity (most upvotes)
        const popularPosts = await db.getPopularPosts(50); // Limit to 50 posts
        
        setPosts(popularPosts);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        setError('Failed to load posts. Please try refreshing the page.');
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [refreshTrigger]);
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Popular Posts</h1>
        
        <button
          onClick={handleRefresh}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none"
          disabled={loading}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 mr-1 ${loading ? 'animate-spin' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {loading && posts.length === 0 ? (
        // Loading skeleton
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4">
              <div className="animate-pulse flex items-center mb-4">
                <div className="rounded-full bg-gray-200 h-8 w-8"></div>
                <div className="ml-2 h-4 bg-gray-200 rounded w-24"></div>
                <div className="ml-auto h-3 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <p>{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-sm font-medium text-red-700 underline"
          >
            Try again
          </button>
        </div>
      ) : posts.length === 0 ? (
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No popular posts yet</h3>
          <p className="mt-1 text-gray-500">
            Upvoted posts will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Post key={post.id} post={post} keyPair={keyPair} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PopularFeed;