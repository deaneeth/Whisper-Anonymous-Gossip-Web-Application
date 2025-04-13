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
    <div className="bg-white rounded-lg shadow mb-6 p-4">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Create a New Post</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={4}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            disabled={isSubmitting}
          ></textarea>
          <div className="text-right text-xs text-gray-500 mt-1">
            {content.length}/1000 characters
          </div>
        </div>
        
        {error && (
          <div className="mb-4 text-sm text-red-600">{error}</div>
        )}
        
        <div className="mb-2">
          <p className="text-xs text-gray-500">
            <strong>Do not share harmful or false information.</strong> 
            Remember that once posted, content cannot be fully deleted from the network.
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                Posting...
              </>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;