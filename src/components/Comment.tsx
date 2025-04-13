// Comment.tsx - Component for displaying comments
import React, { useState, useEffect } from 'react';
import { CryptoService, AuthService } from '../services/crypto-service';
import { Comment as CommentType } from '../services/database-service';
import { KeyPair } from '../types';
import CreateComment from './CreateComment';
import { db } from '../services/database-service';

interface CommentProps {
  comment: CommentType;
  keyPair: KeyPair;
  level: number; // Used for nesting/indentation
  onCommentAdded: () => void;
}

const Comment: React.FC<CommentProps> = ({ comment, keyPair, level, onCommentAdded }) => {
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [replies, setReplies] = useState<CommentType[]>([]);
  const [showReplies, setShowReplies] = useState<boolean>(false);
  const [showReplyForm, setShowReplyForm] = useState<boolean>(false);
  const [voteStatus, setVoteStatus] = useState<number>(0); // -1: downvoted, 0: no vote, 1: upvoted
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  const MAX_NESTING_LEVEL = 3; // Limit nesting depth for readability
  
  // Fetch and decrypt comment content on mount
  useEffect(() => {
    const decryptCommentContent = async () => {
      try {
        setLoading(true);
        
        // Parse the encrypted content
        const encryptedData = JSON.parse(comment.content);
        
        // Decrypt the content
        const content = await CryptoService.decryptData(encryptedData);
        setDecryptedContent(content);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to decrypt comment content:', error);
        setDecryptedContent('[Content could not be decrypted]');
        setLoading(false);
        setError('Failed to decrypt content');
      }
    };
    
    decryptCommentContent();
    checkVoteStatus();
  }, [comment.content]);
  
  // Fetch replies when expanded
  useEffect(() => {
    if (showReplies) {
      fetchReplies();
    }
  }, [showReplies]);
  
  // Fetch replies to this comment
  const fetchReplies = async () => {
    try {
      const allReplies = await db.getRepliesForComment(comment.id);
      
      // Sort by timestamp (newest first)
      const sortedReplies = allReplies.sort((a, b) => b.timestamp - a.timestamp);
      
      setReplies(sortedReplies);
    } catch (error) {
      console.error('Failed to fetch replies:', error);
      setError('Failed to load replies');
    }
  };
  
  // Check if the user has voted on this comment
  const checkVoteStatus = async () => {
    try {
      // Get votes for this comment by the current user
      const votes = await db.getItemsByIndex(
        'votes',
        'unique_vote',
        [comment.id, 'comment', keyPair.publicKey]
      );

      // Fix type issue: properly check if votes is an array with at least one item
      if (Array.isArray(votes) && votes.length > 0) {
        const vote = votes[0] as { value: number };
        if (vote && typeof vote.value === 'number') {
          setVoteStatus(vote.value);
        } else {
          setVoteStatus(0);
        }
      } else {
        setVoteStatus(0);
      }
    } catch (error) {
      console.error('Failed to check vote status:', error);
    }
  };
  
  // Handle vote on comment
  const handleVote = async (value: 1 | -1) => {
    try {
      // If the user clicks the same vote button again, toggle the vote off
      const actualValue = voteStatus === value ? 0 : value;
      
      // Add or update the vote
      await db.addVote(
        comment.id,
        'comment',
        value,
        keyPair.publicKey,
        keyPair.privateKey
      );
      
      // Update local state
      setVoteStatus(actualValue);
      
      // Update comment vote counts
      comment.upvotes = value === 1 ? comment.upvotes + 1 : comment.upvotes;
      comment.downvotes = value === -1 ? comment.downvotes + 1 : comment.downvotes;
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('Failed to vote. Please try again.');
    }
  };
  
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
  
  // Handle new reply
  const handleNewReply = (reply: CommentType) => {
    setReplies([reply, ...replies]);
    setShowReplies(true);
    setShowReplyForm(false);
    onCommentAdded();
  };
  
  // Calculate vote score
  const voteScore = comment.upvotes - comment.downvotes;
  
  // Shortened author ID
  const authorId = AuthService.getDisplayId(comment.authorPublicKey);
  
  return (
    <div className={`border-l-2 pl-3 mt-3 ${level === 0 ? 'border-gray-200' : 'border-gray-100'}`}>
      {/* Comment header */}
      <div className="flex items-center text-xs text-gray-500 mb-1">
        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold mr-2">
          {authorId.slice(0, 2).toUpperCase()}
        </div>
        <span className="mr-2">{authorId}</span>
        <span>{formatTimestamp(comment.timestamp)}</span>
      </div>
      
      {/* Comment content */}
      <div className="mb-2">
        {loading ? (
          <div className="animate-pulse h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
        ) : error ? (
          <div className="text-red-500 text-xs">{error}</div>
        ) : (
          <p className="text-gray-800 text-sm whitespace-pre-wrap">{decryptedContent}</p>
        )}
      </div>
      
      {/* Comment footer */}
      <div className="flex items-center mb-2">
        {/* Vote buttons */}
        <div className="flex items-center mr-4">
          <button 
            onClick={() => handleVote(1)}
            className={`p-1 rounded ${voteStatus === 1 ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
            aria-label="Upvote"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          
          <span className={`text-xs font-medium ${
            voteScore > 0 ? 'text-green-600' : voteScore < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {voteScore}
          </span>
          
          <button 
            onClick={() => handleVote(-1)}
            className={`p-1 rounded ${voteStatus === -1 ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
            aria-label="Downvote"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Reply button */}
        {level < MAX_NESTING_LEVEL && (
          <button 
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-xs text-gray-500 hover:text-indigo-600"
          >
            {showReplyForm ? 'Cancel' : 'Reply'}
          </button>
        )}
        
        {/* Show/hide replies toggle */}
        {replies.length > 0 && (
          <button 
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-gray-500 hover:text-indigo-600 ml-4"
          >
            {showReplies ? 'Hide replies' : `Show ${replies.length} replies`}
          </button>
        )}
      </div>
      
      {/* Reply form */}
      {showReplyForm && (
        <div className="mb-3">
          <CreateComment
            postId={comment.postId}
            keyPair={keyPair}
            parentCommentId={comment.id}
            onCommentCreated={handleNewReply}
          />
        </div>
      )}
      
      {/* Nested replies */}
      {showReplies && replies.length > 0 && (
        <div className="mt-2">
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              keyPair={keyPair}
              level={level + 1}
              onCommentAdded={onCommentAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Comment;

//new one