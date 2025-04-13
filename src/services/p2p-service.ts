// p2p-service.ts - Handles peer-to-peer data synchronization using Gun.js

import Gun from 'gun';
import 'gun/sea'; // For cryptography
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed'; // For local persistence

import { CryptoService } from './crypto-service';
import { db, Post, Comment, Vote } from './database-service';
import { KeyPair } from '../types';

// P2P service for syncing data between peers
export class P2PService {
  private gun: any;
  private userPublicKey: string | null = null;
  private userPrivateKey: string | null = null;
  private isInitialized: boolean = false;
  
  // Constructor initializes Gun.js with peer list
  constructor() {
    // Initialize Gun with working relay servers
    // Using public Gun.js relay servers that are known to work
    this.gun = Gun({
      peers: [
        'https://gun-manhattan.herokuapp.com/gun',
        'https://gun-us.herokuapp.com/gun',
        'https://gun-eu.herokuapp.com/gun'
      ],
      localStorage: false, // We handle our own storage with IndexedDB
      radisk: true, // Enable persistent storage
      file: 'whisper-gundb', // Local storage name
      retry: 2000, // Retry interval in milliseconds
      multicast: false // Disable WebRTC to focus on reliable relay servers
    });
    
    console.log('Gun.js initialized with relay servers');
  }
  
  // Initialize the P2P service with user's keys
  async initialize(publicKey: string, privateKey: string): Promise<void> {
    try {
      if (this.isInitialized) {
        this.disconnect(); // Disconnect before reinitializing
      }
      
      this.userPublicKey = publicKey;
      this.userPrivateKey = privateKey;
      
      // Pre-set user metadata to help with peer recognition
      this.gun.user(publicKey).put({ pub: publicKey, online: true });
      
      // Start listening for data changes
      await this.startListening();
      
      // Sync local data to the network
      await this.syncLocalDataToNetwork();
      
      this.isInitialized = true;
      console.log(`P2P service initialized for user: ${publicKey.substring(0, 8)}...`);
      
      // Set up periodic sync to ensure data propagation
      setInterval(() => this.periodicSync(), 60000); // Sync every minute
    } catch (error) {
      console.error('Failed to initialize P2P service:', error);
      throw new Error('Failed to connect to the P2P network. Please try again.');
    }
  }
  
  // Start listening for data changes from peers
  private async startListening(): Promise<void> {
    // Listen for new posts from peers
    this.gun.get('posts').map().on(async (data: any, key: string) => {
      if (!data || typeof data !== 'object' || !data.id) {
        return; // Skip invalid data
      }
      
      try {
        // Check if this post already exists locally
        const existingPost = await db.getPost(data.id);
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
      if (!data || typeof data !== 'object' || !data.id) {
        return; // Skip invalid data
      }
      
      try {
        // Check if this comment already exists locally
        const existingComment = await db.getItem('comments', data.id);
        if (existingComment) return; // Skip if already exists
        
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
      if (!data || typeof data !== 'object' || !data.id) {
        return; // Skip invalid data
      }
      
      try {
        // Check if this vote already exists locally
        const existingVote = await db.getItem('votes', data.id);
        if (existingVote) return; // Skip if already exists
        
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
    
    console.log('P2P listeners initialized');
  }
  
  // Sync local data to the P2P network
  private async syncLocalDataToNetwork(): Promise<void> {
    try {
      console.log('Starting P2P data sync...');
      
      // Sync posts in batches to avoid overloading the network
      const posts = await db.getLatestPosts(100); // Sync up to 100 latest posts
      for (const post of posts) {
        await this.gun.get('posts').get(post.id).put(post);
        // Add a small delay to prevent network congestion
        await this.delay(10);
      }
      
      // Sync comments in batches for better performance
      const batchSize = 20;
      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize);
        for (const post of batch) {
          const comments = await db.getCommentsForPost(post.id);
          for (const comment of comments) {
            await this.gun.get('comments').get(comment.id).put(comment);
            await this.delay(5);
          }
        }
      }
      
      // Sync votes (only sync user's own votes to reduce data size)
      if (this.userPublicKey) {
        const votes = await db.getItemsByIndex<Vote>('votes', 'byAuthor', this.userPublicKey);
        for (const vote of votes) {
          await this.gun.get('votes').get(vote.id).put(vote);
          await this.delay(5);
        }
      }
      
      console.log(`P2P sync complete: ${posts.length} posts synced`);
    } catch (error) {
      console.error('Error syncing local data to network:', error);
    }
  }
  
  // Helper method to create a delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Periodic sync to ensure data propagation
  private async periodicSync(): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      // Get recent local posts (last 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentPosts = await db.getItemsByIndex<Post>(
        'posts',
        'byTimestamp',
        IDBKeyRange.lowerBound(oneDayAgo)
      );
      
      // Re-publish recent posts to ensure they propagate
      for (const post of recentPosts) {
        await this.gun.get('posts').get(post.id).put(post);
        await this.delay(50);
      }
      
      console.log(`Periodic sync: republished ${recentPosts.length} recent posts`);
    } catch (error) {
      console.error('Error in periodic sync:', error);
    }
  }
  
  // Publish a new post to the P2P network
  async publishPost(post: Post): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize(this.userPublicKey!, this.userPrivateKey!);
    }
    
    try {
      // Put the post on multiple nodes for redundancy
      this.gun.get('posts').get(post.id).put(post);
      this.gun.user().get('posts').get(post.id).put(post);
      
      // Also put a reference in the user's space
      if (this.userPublicKey) {
        this.gun.user(this.userPublicKey).get('posts').get(post.id).put(post);
      }
      
      console.log('Post published to P2P network:', post.id);
    } catch (error) {
      console.error('Error publishing post to network:', error);
      throw new Error('Failed to publish post to the network');
    }
  }
  
  // Publish a new comment to the P2P network
  async publishComment(comment: Comment): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize(this.userPublicKey!, this.userPrivateKey!);
    }
    
    try {
      // Put the comment on multiple nodes for redundancy
      this.gun.get('comments').get(comment.id).put(comment);
      this.gun.get('posts').get(comment.postId).get('comments').get(comment.id).put(comment);
      
      console.log('Comment published to P2P network:', comment.id);
    } catch (error) {
      console.error('Error publishing comment to network:', error);
      throw new Error('Failed to publish comment to the network');
    }
  }
  
  // Publish a vote to the P2P network
  async publishVote(vote: Vote): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize(this.userPublicKey!, this.userPrivateKey!);
    }
    
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
      
      // Set user as offline
      if (this.userPublicKey) {
        this.gun.user(this.userPublicKey).put({ online: false });
      }
      
      this.isInitialized = false;
      console.log('Disconnected from P2P network');
    }
  }
  
  // Check P2P network status
  async checkNetworkStatus(): Promise<{ connected: boolean, peers: number }> {
    return new Promise((resolve) => {
      let peers = 0;
      
      // Try to get peer information from Gun
      if (this.gun && this.gun._.opt && this.gun._.opt.peers) {
        peers = Object.keys(this.gun._.opt.peers).length;
      }
      
      resolve({
        connected: this.isInitialized && peers > 0,
        peers
      });
    });
  }
}

// Create a singleton instance
export const p2p = new P2PService();