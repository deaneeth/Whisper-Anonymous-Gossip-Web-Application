// CreateComment.tsx - Component for creating comments
import React, { useState } from 'react';
import { db, Comment } from '../services/database-service';
import { p2p } from '../services/p2p-service';
import { KeyPair } from '../types';

interface CreateCommentProps {
  postId: string;
  keyPair: KeyPair;
  parentCommentId?: string;
  onCommentCreated: (comment: Comment) => void;
}

const CreateComment: React.FC<CreateCommentProps> = ({ 
  postId, 
  keyPair, 
  parentCommentId, 
  onCommentCreated 
}) => {
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
      
      // Create the comment in local database
      const comment = await db.addComment(
        postId,
        content.trim(),
        keyPair.publicKey,
        keyPair.privateKey,
        parentCommentId
      );
      
      // Publish to P2P network
      await p2p.publishComment(comment);
      
      // Reset form
      setContent('');
      
      // Notify parent component
      onCommentCreated(comment);
      
      setIsSubmitting(false);
    } catch (error) {
      console.error('Failed to create comment:', error);
      setError('Failed to create comment. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-2">
        <textarea
          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
          rows={2}
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          disabled={isSubmitting}
        ></textarea>
        <div className="text-right text-xs text-gray-500">
          {content.length}/500 characters
        </div>
      </div>
      
      {error && (
        <div className="mb-2 text-xs text-red-600">{error}</div>
      )}
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-1 px-3 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:bg-indigo-300"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin h-3 w-3 mr-1 border-t-2 border-b-2 border-white rounded-full"></span>
              Posting...
            </>
          ) : (
            'Post Comment'
          )}
        </button>
      </div>
    </form>
  );
};

export default CreateComment;