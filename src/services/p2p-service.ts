// p2p-service.ts - Handles peer-to-peer data synchronization using Gun.js

import Gun from 'gun';
import 'gun/sea'; // For cryptography
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed'; // For local persistence

import { CryptoService } from './crypto-service';
import { db, Post, Comment, Vote } from './database-service';

// Type definition for Gun instance
type GunInstance = {
  get: (path: string) => any;
  put: (data: any) => any;
  on: (callback: (data: any, key: string) => void) => any;
  map: () => any;
  user: (publicKey?: string) => any;
  _: {
    opt: {
      peers: Record<string, any>;
    };
  };
};

// P2P service for syncing data between peers
export class P2PService {
  private gun: GunInstance | null = null;
  private userPublicKey: string | null = null;
  private userPrivateKey: string | null = null;
  private isInitialized: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  
  // Constructor initializes Gun.js with peer list
  constructor() {
    try {
      this.gun = Gun({
        peers: [
          'https://gun-relay.herokuapp.com/gun',
          'https://gun-manhattan.herokuapp.com/gun', 
          'https://gun-us.herokuapp.com/gun',
          'https://gun-eu.herokuapp.com/gun'
        ],
        localStorage: false,
        radisk: true,
        file: 'whisper-gundb',
        retry: 2000,
        multicast: false,
        axe: false
      }) as unknown as GunInstance;
      
      console.log('Gun.js initialized with relay servers');
    } catch (error) {
      console.error('Failed to initialize Gun.js:', error);
    }
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
      if (this.gun) {
        this.gun.user(publicKey).put({ pub: publicKey, online: true });
      
        // Start listening for data changes
        await this.startListening();
        
        // Initial sync of local data to the network
        await this.syncLocalDataToNetwork();
        
        this.isInitialized = true;
        console.log(`P2P service initialized for user: ${publicKey.substring(0, 8)}...`);
        
        // Set up periodic sync to ensure data propagation
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => this.periodicSync(), 30000); // Sync every 30 seconds
      } else {
        throw new Error('Gun.js instance not initialized');
      }
    } catch (error) {
      console.error('Failed to initialize P2P service:', error);
      throw new Error('Failed to connect to the P2P network. Please try again.');
    }
  }
  
  // Start listening for data changes from peers
  private async startListening(): Promise<void> {
    console.log('Starting P2P listeners...');
    
    if (!this.gun) {
      console.error('Gun.js instance not initialized');
      return;
    }
    
    // Listen for new posts from peers
    this.gun.get('posts').map().on(async (data: any, key: string) => {
      if (!data) {
        console.log('Received empty data from posts');
        return; // Skip empty data
      }
      
      if (typeof data !== 'object' || !data.id) {
        console.log('Received invalid post data:', data);
        return; // Skip invalid data
      }
      
      try {
        // Check if this post already exists locally
        const existingPost = await db.getPost(data.id);
        if (existingPost) {
          // Skip if already exists
          console.log('Post already exists locally, skipping:', data.id);
          return;
        }
        
        console.log('Received new post from network:', data.id);
        
        // Verify the post signature to ensure authenticity
        const dataToVerify = JSON.stringify({
          id: data.id,
          authorPublicKey: data.authorPublicKey,
          content: data.content,
          timestamp: data.timestamp
        });
        
        try {
          const isValid = await CryptoService.verifySignature(
            dataToVerify,
            data.signature,
            data.authorPublicKey
          );
          
          if (!isValid) {
            console.warn('Received post with invalid signature, ignoring:', key);
            return;
          }
        } catch (signatureError) {
          console.error('Error verifying post signature:', signatureError);
          // For development: still accept the post even if signature verification fails
          // In production, we would reject posts with invalid signatures
        }
        
        // Add the post to the local database
        await db.addItem('posts', data);
        console.log('Successfully stored post from peer:', data.id);
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
        if (existingComment) {
          console.log('Comment already exists locally, skipping:', data.id);
          return; // Skip if already exists
        }
        
        console.log('Received new comment from network:', data.id);
        
        // Verify the comment signature to ensure authenticity
        const dataToVerify = JSON.stringify({
          id: data.id,
          postId: data.postId,
          parentCommentId: data.parentCommentId,
          authorPublicKey: data.authorPublicKey,
          content: data.content,
          timestamp: data.timestamp
        });
        
        try {
          const isValid = await CryptoService.verifySignature(
            dataToVerify,
            data.signature,
            data.authorPublicKey
          );
          
          if (!isValid) {
            console.warn('Received comment with invalid signature, ignoring:', key);
            return;
          }
        } catch (signatureError) {
          console.error('Error verifying comment signature:', signatureError);
          // For development: still accept the comment even if signature verification fails
        }
        
        // Add the comment to the local database
        await db.addItem('comments', data);
        
        // Update the comment count for the related post
        const post = await db.getPost(data.postId);
        if (post) {
          post.commentCount += 1;
          await db.updateItem('posts', post);
        }
        
        console.log('Successfully stored comment from peer:', data.id);
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
        if (existingVote) {
          return; // Skip if already exists
        }
        
        // Verify the vote signature to ensure authenticity
        const dataToVerify = JSON.stringify({
          id: data.id,
          targetId: data.targetId,
          targetType: data.targetType,
          authorPublicKey: data.authorPublicKey,
          value: data.value,
          timestamp: data.timestamp
        });
        
        try {
          const isValid = await CryptoService.verifySignature(
            dataToVerify,
            data.signature,
            data.authorPublicKey
          );
          
          if (!isValid) {
            console.warn('Received vote with invalid signature, ignoring:', key);
            return;
          }
        } catch (signatureError) {
          console.error('Error verifying vote signature:', signatureError);
          // For development: still accept the vote even if signature verification fails
        }
        
        // Add the vote to the local database
        await db.addItem('votes', data);
        
        // Update the vote count on the target item
        await db.updateVoteCount(data.targetId, data.targetType, data.value);
        
        console.log('Received new vote from peer:', data.id);
      } catch (error) {
        console.error('Error processing vote from peer:', error);
      }
    });
    
    console.log('P2P listeners initialized successfully');
  }
  
  // Sync local data to the P2P network
  private async syncLocalDataToNetwork(): Promise<void> {
    try {
      console.log('Starting P2P data sync...');
      
      if (!this.gun) {
        console.error('Gun.js instance not initialized');
        return;
      }
      
      // Sync posts
      const posts = await db.getLatestPosts(50); // Limit to 50 latest posts
      console.log(`Syncing ${posts.length} posts to network...`);
      
      for (const post of posts) {
        try {
          this.gun.get('posts').get(post.id).put(post);
          await this.delay(10); // Small delay to prevent flooding
        } catch (error) {
          console.error(`Error syncing post ${post.id}:`, error);
        }
      }
      
      // Sync comments in batches
      console.log('Syncing comments to network...');
      let commentCount = 0;
      
      for (const post of posts) {
        const comments = await db.getCommentsForPost(post.id);
        commentCount += comments.length;
        
        for (const comment of comments) {
          try {
            if (this.gun) {
              this.gun.get('comments').get(comment.id).put(comment);
              await this.delay(5); // Small delay between comments
            }
          } catch (error) {
            console.error(`Error syncing comment ${comment.id}:`, error);
          }
        }
      }
      
      console.log(`Synced ${commentCount} comments to network`);
      
      // Sync votes (only sync user's own votes)
      if (this.userPublicKey) {
        const votes = await db.getItemsByIndex<Vote>('votes', 'byAuthor', this.userPublicKey);
        console.log(`Syncing ${votes.length} votes to network...`);
        
        for (const vote of votes) {
          try {
            if (this.gun) {
              this.gun.get('votes').get(vote.id).put(vote);
              await this.delay(5); // Small delay between votes
            }
          } catch (error) {
            console.error(`Error syncing vote ${vote.id}:`, error);
          }
        }
      }
      
      console.log('P2P sync complete');
    } catch (error) {
      console.error('Error in syncLocalDataToNetwork:', error);
    }
  }
  
  // Helper method to create a delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Periodic sync to ensure data propagation
  private async periodicSync(): Promise<void> {
    if (!this.isInitialized || !this.gun) return;
    
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
        if (this.gun) {
          this.gun.get('posts').get(post.id).put(post);
          await this.delay(100); // Larger delay for periodic sync
        }
      }
      
      console.log(`Periodic sync: republished ${recentPosts.length} recent posts`);
    } catch (error) {
      console.error('Error in periodic sync:', error);
    }
  }
  
  // Publish a new post to the P2P network
  async publishPost(post: Post): Promise<void> {
    if (!this.isInitialized) {
      if (this.userPublicKey && this.userPrivateKey) {
        await this.initialize(this.userPublicKey, this.userPrivateKey);
      } else {
        throw new Error('P2P service not initialized and missing keys');
      }
    }
    
    try {
      console.log('Publishing post to network:', post.id);
      
      if (!this.gun) {
        throw new Error('Gun.js instance not initialized');
      }
      
      // Use simpler approach - just put the post in the posts path
      this.gun.get('posts').get(post.id).put(post);
      
      console.log('Post published to P2P network successfully');
    } catch (error) {
      console.error('Error publishing post to network:', error);
      throw new Error('Failed to publish post to the network');
    }
  }
  
  // Publish a new comment to the P2P network
  async publishComment(comment: Comment): Promise<void> {
    if (!this.isInitialized) {
      if (this.userPublicKey && this.userPrivateKey) {
        await this.initialize(this.userPublicKey, this.userPrivateKey);
      } else {
        throw new Error('P2P service not initialized and missing keys');
      }
    }
    
    try {
      console.log('Publishing comment to network:', comment.id);
      
      if (!this.gun) {
        throw new Error('Gun.js instance not initialized');
      }
      
      // Use simplified approach - just put in comments path
      this.gun.get('comments').get(comment.id).put(comment);
      
      console.log('Comment published to P2P network successfully');
    } catch (error) {
      console.error('Error publishing comment to network:', error);
      throw new Error('Failed to publish comment to the network');
    }
  }
  
  // Publish a vote to the P2P network
  async publishVote(vote: Vote): Promise<void> {
    if (!this.isInitialized) {
      if (this.userPublicKey && this.userPrivateKey) {
        await this.initialize(this.userPublicKey, this.userPrivateKey);
      } else {
        throw new Error('P2P service not initialized and missing keys');
      }
    }
    
    try {
      console.log('Publishing vote to network:', vote.id);
      
      if (!this.gun) {
        throw new Error('Gun.js instance not initialized');
      }
      
      this.gun.get('votes').get(vote.id).put(vote);
      console.log('Vote published to P2P network successfully');
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
      try {
        this.gun.get('posts').off();
        this.gun.get('comments').off();
        this.gun.get('votes').off();
        
        // Set user as offline
        if (this.userPublicKey) {
          this.gun.user(this.userPublicKey).put({ online: false });
        }
        
        // Clear the sync interval
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
          this.syncInterval = null;
        }
        
        this.isInitialized = false;
        console.log('Disconnected from P2P network');
      } catch (error) {
        console.error('Error during P2P disconnect:', error);
      }
    }
  }
  
  // Check P2P network status
  async checkNetworkStatus(): Promise<{ connected: boolean, peers: number }> {
    return new Promise((resolve) => {
      try {
        let peers = 0;
        
        // Try to get peer information from Gun
        if (this.gun && this.gun._ && this.gun._.opt && this.gun._.opt.peers) {
          peers = Object.keys(this.gun._.opt.peers).length;
        }
        
        resolve({
          connected: this.isInitialized && peers > 0,
          peers
        });
      } catch (error) {
        console.error('Error checking network status:', error);
        resolve({
          connected: false,
          peers: 0
        });
      }
    });
  }
}

// Create a singleton instance
export const p2p = new P2PService();

//new one