// CreatePost.tsx - Component for creating new posts
import React, { useState } from 'react';
import { db, Post } from '../services/database-service';
import { p2p } from '../services/p2p-service';
import { KeyPair } from '../types';

interface CreatePostProps {
  keyPair: KeyPair;
  onPostCreated: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ keyPair, onPostCreated }) => {
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Create the post in local database
      const post = await db.addPost(
        content.trim(),
        keyPair.publicKey,
        keyPair.privateKey
      );
      
      // Publish to P2P network
      await p2p.publishPost(post);
      
      // Reset form
      setContent('');
      
      // Notify parent component
      onPostCreated(post);
      
      setIsSubmitting(false);
    } catch (error) {
      console.error('Failed to create post:', error);
      setError('Failed to create post. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-card mb-6 p-5 border border-whisper-200 hover:shadow-md transition-shadow duration-300">
      <h2 className="text-lg font-semibold text-primary-700 mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Create a New Post
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            className="w-full p-3 border border-whisper-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-whisper-50 placeholder-whisper-400 text-whisper-800"
            rows={4}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            disabled={isSubmitting}
          ></textarea>
          <div className="absolute bottom-2 right-2 text-xs text-whisper-500 bg-whisper-50 px-1.5 py-0.5 rounded">
            {content.length}/1000
          </div>
        </div>
        
        {error && (
          <div className="flex items-center p-2 bg-accent-50 text-sm text-accent-700 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}
        
        <div className="mb-2 flex items-start p-2 bg-whisper-50 rounded-md border-l-4 border-secondary-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-secondary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-whisper-700 leading-relaxed">
            <strong className="text-secondary-700">Do not share harmful or false information.</strong> 
            <br/>Remember that once posted, content cannot be fully deleted from the network.
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className={`inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-button text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
            ${isSubmitting || !content.trim() 
              ? 'bg-primary-300 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700'}`}
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                Posting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Post
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;