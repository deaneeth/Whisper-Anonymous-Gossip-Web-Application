// Post component for displaying posts
import React, { useState, useEffect } from 'react';
import { CryptoService, AuthService } from '../services/crypto-service';
import { Post as PostType, Comment as CommentType, Vote } from '../services/database-service';
import { KeyPair } from '../types';
import Comment from './Comment';
import CreateComment from './CreateComment';
import { db } from '../services/database-service';


interface PostProps {
  post: PostType;
  keyPair: KeyPair;
  isPreview?: boolean;
}

const Post: React.FC<PostProps> = ({ post, keyPair, isPreview = false }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [comments, setComments] = useState<CommentType[]>([]);
  const [voteStatus, setVoteStatus] = useState<number>(0); // -1: downvoted, 0: no vote, 1: upvoted
  const [showCommentForm, setShowCommentForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Fetch and decrypt post content on mount
  useEffect(() => {
    const decryptPostContent = async () => {
      try {
        setLoading(true);
        
        // Parse the encrypted content
        const encryptedData = JSON.parse(post.content);
        
        // Decrypt the content
        const content = await CryptoService.decryptData(encryptedData);
        setDecryptedContent(content);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to decrypt post content:', error);
        setDecryptedContent('[Content could not be decrypted]');
        setLoading(false);
        setError('Failed to decrypt content');
      }
    };
    
    decryptPostContent();
  }, [post.content]);
  
  // Fetch comments when expanded
  useEffect(() => {
    if (expanded && !isPreview) {
      fetchComments();
      
      // Check if the user has voted on this post
      checkVoteStatus();
    }
  }, [expanded, isPreview]);
  
  // Fetch comments for this post
  const fetchComments = async () => {
    try {
      // Get top-level comments (no parent comment ID)
      const allComments = await db.getCommentsForPost(post.id);
      
      // Sort by timestamp (newest first)
      const sortedComments = allComments
        .filter(comment => !comment.parentCommentId)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      setComments(sortedComments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      setError('Failed to load comments');
    }
  };
  
  // Check if the user has voted on this post
  const checkVoteStatus = async () => {
    try {
      // Get votes for this post by the current user
      const votes = await db.getItemsByIndex<Vote>(
        'votes',
        'unique_vote',
        [post.id, 'post', keyPair.publicKey]
      );
      
      if (votes.length > 0) {
        setVoteStatus(votes[0]?.value || 0);
      } else {
        setVoteStatus(0);
      }
    } catch (error) {
      console.error('Failed to check vote status:', error);
    }
  };
  
  // Handle vote on post
  const handleVote = async (value: 1 | -1) => {
    try {
      // If the user clicks the same vote button again, toggle the vote off
      const actualValue = voteStatus === value ? 0 : value;
      
      // Add or update the vote
      await db.addVote(
        post.id,
        'post',
        value,
        keyPair.publicKey,
        keyPair.privateKey
      );
      
      // Update local state
      setVoteStatus(actualValue);
      
      // Update post vote counts
      post.upvotes = value === 1 ? post.upvotes + 1 : post.upvotes;
      post.downvotes = value === -1 ? post.downvotes + 1 : post.downvotes;
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
  
  // Handle new comment
  const handleNewComment = (comment: CommentType) => {
    setComments([comment, ...comments]);
    post.commentCount += 1;
  };
  
  // Calculate vote score
  const voteScore = post.upvotes - post.downvotes;
  
  // Shortened author ID
  const authorId = AuthService.getDisplayId(post.authorPublicKey);
  
  return (
    <div className="bg-white rounded-lg shadow-card hover:shadow-md transition-shadow duration-300 mb-4 overflow-hidden border border-whisper-200">
      {/* Post header */}
      <div className="p-4 pb-2 border-b border-whisper-100">
        <div className="flex items-center text-sm text-whisper-500">
          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold mr-2 shadow-sm">
            {authorId.slice(0, 2).toUpperCase()}
          </div>
          <span className="mr-3 font-medium">{authorId}</span>
          <span className="text-whisper-400">{formatTimestamp(post.timestamp)}</span>
        </div>
      </div>
      
      {/* Post content */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-whisper-100 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-whisper-100 rounded w-full mb-2"></div>
            <div className="h-4 bg-whisper-100 rounded w-2/3"></div>
          </div>
        ) : error ? (
          <div className="text-accent-600 text-sm p-2 bg-accent-50 rounded-md">{error}</div>
        ) : (
          <p className="text-whisper-800 whitespace-pre-wrap leading-relaxed">{decryptedContent}</p>
        )}
      </div>
      
      {/* Post footer */}
      <div className="px-4 py-3 bg-whisper-50 border-t border-whisper-100">
        <div className="flex items-center justify-between">
          {/* Vote buttons */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleVote(1)}
              className={`p-1.5 rounded-full transition-colors ${voteStatus === 1 
                ? 'text-primary-600 bg-primary-50' 
                : 'text-whisper-500 hover:text-primary-600 hover:bg-primary-50'}`}
              aria-label="Upvote"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            
            <span className={`text-sm font-medium ${
              voteScore > 0 ? 'text-primary-600' : voteScore < 0 ? 'text-accent-600' : 'text-whisper-500'
            }`}>
              {voteScore}
            </span>
            
            <button 
              onClick={() => handleVote(-1)}
              className={`p-1.5 rounded-full transition-colors ${voteStatus === -1 
                ? 'text-accent-600 bg-accent-50' 
                : 'text-whisper-500 hover:text-accent-600 hover:bg-accent-50'}`}
              aria-label="Downvote"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Comment button */}
          {!isPreview && (
            <button 
              onClick={() => {
                setExpanded(!expanded);
                setShowCommentForm(false);
              }}
              className="flex items-center text-sm text-whisper-500 hover:text-primary-600 transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                />
              </svg>
              <span className={post.commentCount > 0 ? 'font-medium' : ''}>
                {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
              </span>
            </button>
          )}
        </div>
      </div>
      
      {/* Comment section */}
      {expanded && !isPreview && (
        <div className="border-t border-whisper-200">
          {/* Add comment button */}
          <div className="p-4">
            <button
              onClick={() => setShowCommentForm(!showCommentForm)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              {showCommentForm ? 'Cancel' : 'Add a comment'}
            </button>
            
            {/* Comment form */}
            {showCommentForm && (
              <div className="mt-2">
                <CreateComment 
                  postId={post.id}
                  keyPair={keyPair}
                  onCommentCreated={(comment) => {
                    handleNewComment(comment);
                    setShowCommentForm(false);
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Comment list */}
          <div className="px-4 pb-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <Comment 
                  key={comment.id}
                  comment={comment}
                  keyPair={keyPair}
                  level={0}
                  onCommentAdded={() => {
                    post.commentCount += 1;
                    fetchComments();
                  }}
                />
              ))
            ) : (
              <div className="py-4 text-center text-sm text-whisper-500 bg-whisper-50 rounded-md">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 mx-auto mb-2 text-whisper-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                  />
                </svg>
                <p>No comments yet - be the first to share your thoughts!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;