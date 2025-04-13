// p2p-service.ts - Handles peer-to-peer data synchronization using Gun.js

import Gun from 'gun';
import 'gun/sea'; // For cryptography
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed'; // For local persistence

import { CryptoService, AuthService } from './crypto-service';
import { db, Post, Comment, Vote } from './database-service';

// P2P service for syncing data between peers
export class P2PService {
  private gun: any;
  private userPublicKey: string | null = null;
  private userPrivateKey: string | null = null;
  
  // Constructor initializes Gun.js with peer list
  constructor() {
    // Initialize Gun with minimal configuration
    // We use some known relay peers to enhance discoverability
    // These are just examples - in a real app, you'd use actual relay servers
    this.gun = Gun({
      peers: [
        'https://relay1.gun-server.glitch.me/gun',
        'https://relay2.gun-server.glitch.me/gun'
      ],
      localStorage: false, // We handle our own storage with IndexedDB
      radisk: false // We use our own storage mechanism
    });
  }
  
  // Initialize the P2P service with user's keys
  async initialize(publicKey: string, privateKey: string): Promise<void> {
    this.userPublicKey = publicKey;
    this.userPrivateKey = privateKey;
    
    // Start listening for data changes
    this.startListening();
    
    // Sync local data to the network
    await this.syncLocalDataToNetwork();
  }
  
  // Start listening for data changes from peers
  private startListening(): void {
    // Listen for new posts from peers
    this.gun.get('posts').map().on(async (data: any, key: string) => {
      if (!data) return;
      
      try {
        // Check if this post already exists locally
        const existingPost = await db.getPost(key);
        if (existingPost) return; // Skip if already exists
        
        // Verify the post signature to ensure authenticity
        const dataToVerify = JSON.stringify({
          id: data.id,
          authorPublicKey: data.authorPublicKey,
          content: data.content,
          timestamp: data.timestamp
        });
        
        const isValid = await CryptoService.verifySignature(
          dataToVerify,
          data.signature,
          data.authorPublicKey
        );
        
        if (!isValid) {
          console.warn('Received post with invalid signature, ignoring:', key);
          return;
        }
        
        // Add the post to the local database
        await db.addItem('posts', data);
        console.log('Received new post from peer:', key);
      } catch (error) {
        console.error('Error processing post from peer:', error);
      }
    });
    
    // Listen for new comments from peers
    this.gun.get('comments').map().on(async (data: any, key: string) => {
      if (!data) return;
      
      try {
        // Check if this comment already exists locally
        const existingComments = await db.getItemsByIndex<Comment>(
          'comments', 
          'byPostId', 
          data.postId
        );
        
        const exists = existingComments.some(c => c.id === key);
        if (exists) return; // Skip if already exists
        
        // Verify the comment signature to ensure authenticity
        const dataToVerify = JSON.stringify({
          id: data.id,
          postId: data.postId,
          parentCommentId: data.parentCommentId,
          authorPublicKey: data.authorPublicKey,
          content: data.content,
          timestamp: data.timestamp
        });
        
        const isValid = await CryptoService.verifySignature(
          dataToVerify,
          data.signature,
          data.authorPublicKey
        );
        
        if (!isValid) {
          console.warn('Received comment with invalid signature, ignoring:', key);
          return;
        }
        
        // Add the comment to the local database
        await db.addItem('comments', data);
        
        // Update the comment count for the related post
        const post = await db.getPost(data.postId);
        if (post) {
          post.commentCount += 1;
          await db.updateItem('posts', post);
        }
        
        console.log('Received new comment from peer:', key);
      } catch (error) {
        console.error('Error processing comment from peer:', error);
      }
    });
    
    // Listen for new votes from peers
    this.gun.get('votes').map().on(async (data: any, key: string) => {
      if (!data) return;
      
      try {
        // Check if this vote already exists locally
        const existingVotes = await db.getItemsByIndex<Vote>(
          'votes', 
          'unique_vote', 
          [data.targetId, data.targetType, data.authorPublicKey]
        );
        
        if (existingVotes.length > 0) return; // Skip if already exists
        
        // Verify the vote signature to ensure authenticity
        const dataToVerify = JSON.stringify({
          id: data.id,
          targetId: data.targetId,
          targetType: data.targetType,
          authorPublicKey: data.authorPublicKey,
          value: data.value,
          timestamp: data.timestamp
        });
        
        const isValid = await CryptoService.verifySignature(
          dataToVerify,
          data.signature,
          data.authorPublicKey
        );
        
        if (!isValid) {
          console.warn('Received vote with invalid signature, ignoring:', key);
          return;
        }
        
        // Add the vote to the local database
        await db.addItem('votes', data);
        
        // Update the vote count on the target item
        await db.updateVoteCount(data.targetId, data.targetType, data.value);
        
        console.log('Received new vote from peer:', key);
      } catch (error) {
        console.error('Error processing vote from peer:', error);
      }
    });
  }
  
  // Sync local data to the P2P network
  private async syncLocalDataToNetwork(): Promise<void> {
    try {
      // Sync posts
      const posts = await db.getLatestPosts(100); // Sync up to 100 latest posts
      for (const post of posts) {
        this.gun.get('posts').get(post.id).put(post);
      }
      
      // Sync comments
      for (const post of posts) {
        const comments = await db.getCommentsForPost(post.id);
        for (const comment of comments) {
          this.gun.get('comments').get(comment.id).put(comment);
        }
      }
      
      // Sync votes (only sync user's own votes to reduce data size)
      if (this.userPublicKey) {
        const votes = await db.getItemsByIndex<Vote>('votes', 'byAuthor', this.userPublicKey);
        for (const vote of votes) {
          this.gun.get('votes').get(vote.id).put(vote);
        }
      }
      
      console.log('Local data synced to P2P network');
    } catch (error) {
      console.error('Error syncing local data to network:', error);
    }
  }
  
  // Publish a new post to the P2P network
  async publishPost(post: Post): Promise<void> {
    try {
      this.gun.get('posts').get(post.id).put(post);
      console.log('Post published to P2P network:', post.id);
    } catch (error) {
      console.error('Error publishing post to network:', error);
      throw new Error('Failed to publish post to the network');
    }
  }
  
  // Publish a new comment to the P2P network
  async publishComment(comment: Comment): Promise<void> {
    try {
      this.gun.get('comments').get(comment.id).put(comment);
      console.log('Comment published to P2P network:', comment.id);
    } catch (error) {
      console.error('Error publishing comment to network:', error);
      throw new Error('Failed to publish comment to the network');
    }
  }
  
  // Publish a vote to the P2P network
  async publishVote(vote: Vote): Promise<void> {
    try {
      this.gun.get('votes').get(vote.id).put(vote);
      console.log('Vote published to P2P network:', vote.id);
    } catch (error) {
      console.error('Error publishing vote to network:', error);
      throw new Error('Failed to publish vote to the network');
    }
  }
  
  // Function to disconnect from the P2P network
  disconnect(): void {
    if (this.gun) {
      // Gun doesn't have a formal disconnect method, so we
      // unsubscribe from all data nodes we're watching
      this.gun.get('posts').off();
      this.gun.get('comments').off();
      this.gun.get('votes').off();
      
      console.log('Disconnected from P2P network');
    }
  }
}

// Create a singleton instance
export const p2p = new P2PService();