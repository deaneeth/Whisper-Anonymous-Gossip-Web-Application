// database-service.ts - Handles local data storage using IndexedDB

import { CryptoService } from './crypto-service';

// Interface definitions
export interface Post {
  id: string;            // Unique ID for the post
  authorPublicKey: string; // Public key of the author
  content: string;       // Encrypted content
  timestamp: number;     // Creation timestamp
  upvotes: number;       // Number of upvotes
  downvotes: number;     // Number of downvotes
  commentCount: number;  // Number of comments
  signature: string;     // Digital signature to verify authenticity
}

export interface Comment {
  id: string;            // Unique ID for the comment
  postId: string;        // ID of the parent post
  parentCommentId?: string; // ID of parent comment (for nested replies)
  authorPublicKey: string; // Public key of the author
  content: string;       // Encrypted content
  timestamp: number;     // Creation timestamp
  upvotes: number;       // Number of upvotes
  downvotes: number;     // Number of downvotes
  signature: string;     // Digital signature to verify authenticity
}

export interface Vote {
  id: string;            // Unique ID for the vote
  targetId: string;      // ID of post or comment being voted on
  targetType: 'post' | 'comment'; // Type of content being voted on
  authorPublicKey: string; // Public key of the voter
  value: 1 | -1;         // 1 for upvote, -1 for downvote
  timestamp: number;     // Creation timestamp
  signature: string;     // Digital signature to verify authenticity
}

export interface Notification {
  id: string;            // Unique ID for the notification
  recipientPublicKey: string; // Public key of the recipient
  sourcePublicKey: string;    // Public key of the action performer
  targetId: string;      // ID of related post/comment
  targetType: 'post' | 'comment'; // Type of content related to notification
  action: 'reply' | 'upvote'; // Action that triggered the notification
  isRead: boolean;       // Whether notification has been read
  timestamp: number;     // Creation timestamp
  expiresAt: number;     // When notification expires (7 days from creation)
}

// Database service class
export class DatabaseService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'whisper_app_db';
  private readonly DB_VERSION = 1;
  
  // Initialize the database
  async initialize(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = (event) => {
        console.error('Failed to open database:', event);
        reject(new Error('Could not open the database. Your browser may not support IndexedDB.'));
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('Database opened successfully');
        resolve(true);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('posts')) {
          const postsStore = db.createObjectStore('posts', { keyPath: 'id' });
          postsStore.createIndex('byTimestamp', 'timestamp', { unique: false });
          postsStore.createIndex('byPopularity', ['upvotes', 'downvotes'], { unique: false });
          postsStore.createIndex('byAuthor', 'authorPublicKey', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('comments')) {
          const commentsStore = db.createObjectStore('comments', { keyPath: 'id' });
          commentsStore.createIndex('byPostId', 'postId', { unique: false });
          commentsStore.createIndex('byParentCommentId', 'parentCommentId', { unique: false });
          commentsStore.createIndex('byAuthor', 'authorPublicKey', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('votes')) {
          const votesStore = db.createObjectStore('votes', { keyPath: 'id' });
          votesStore.createIndex('byTargetId', 'targetId', { unique: false });
          votesStore.createIndex('byAuthor', 'authorPublicKey', { unique: false });
          votesStore.createIndex('unique_vote', ['targetId', 'targetType', 'authorPublicKey'], { unique: true });
        }
        
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationsStore = db.createObjectStore('notifications', { keyPath: 'id' });
          notificationsStore.createIndex('byRecipient', 'recipientPublicKey', { unique: false });
          notificationsStore.createIndex('byIsRead', 'isRead', { unique: false });
          notificationsStore.createIndex('byExpiration', 'expiresAt', { unique: false });
        }
      };
    });
  }
  
  // Generic method to add an item to any store
  public async addItem<T>(storeName: string, item: T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);
      
      request.onsuccess = () => {
        resolve(item);
      };
      
      request.onerror = (event) => {
        console.error(`Failed to add item to ${storeName}:`, event);
        reject(new Error(`Failed to add item to ${storeName}`));
      };
    });
  }
  
  // Generic method to get an item from any store
  public async getItem<T>(storeName: string, id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result as T;
        resolve(result || null);
      };
      
      request.onerror = (event) => {
        console.error(`Failed to get item from ${storeName}:`, event);
        reject(new Error(`Failed to get item from ${storeName}`));
      };
    });
  }
  
  // Generic method to update an item in any store
  public async updateItem<T>(storeName: string, item: T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      
      request.onsuccess = () => {
        resolve(item);
      };
      
      request.onerror = (event) => {
        console.error(`Failed to update item in ${storeName}:`, event);
        reject(new Error(`Failed to update item in ${storeName}`));
      };
    });
  }
  
  // Generic method to delete an item from any store
  public async deleteItem(storeName: string, id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error(`Failed to delete item from ${storeName}:`, event);
        reject(new Error(`Failed to delete item from ${storeName}`));
      };
    });
  }
  
  // Generic method to get items by index
  public async getItemsByIndex<T>(
    storeName: string, 
    indexName: string, 
    value: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = (event) => {
        const results = (event.target as IDBRequest).result as T[];
        resolve(results);
      };
      
      request.onerror = (event) => {
        console.error(`Failed to get items by index from ${storeName}:`, event);
        reject(new Error(`Failed to get items by index from ${storeName}`));
      };
    });
  }
  
  // Post-specific methods
  async addPost(content: string, authorPublicKey: string, privateKey: string): Promise<Post> {
    try {
      // Encrypt the content before storing
      const encryptedData = await CryptoService.encryptData(content);
      
      // Generate a unique ID for the post
      const id = crypto.randomUUID();
      
      // Prepare the post object
      const postData = {
        id,
        authorPublicKey,
        content: JSON.stringify(encryptedData), // Store encrypted content
        timestamp: Date.now(),
        upvotes: 0,
        downvotes: 0,
        commentCount: 0,
        signature: '' // Will be set below
      };
      
      // Create a signature of the post data to verify authenticity
      const dataToSign = JSON.stringify({
        id: postData.id,
        authorPublicKey: postData.authorPublicKey,
        content: postData.content,
        timestamp: postData.timestamp
      });
      
      // Sign the data with the author's private key
      postData.signature = await CryptoService.signData(dataToSign, privateKey);
      
      // Store the post in the database
      return await this.addItem<Post>('posts', postData);
    } catch (error) {
      console.error('Failed to add post:', error);
      throw new Error('Failed to create post');
    }
  }
  
  // Get post by ID
  async getPost(id: string): Promise<Post | null> {
    return this.getItem<Post>('posts', id);
  }
  
  // Get posts sorted by timestamp (latest first)
  async getLatestPosts(limit: number = 20): Promise<Post[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction('posts', 'readonly');
      const store = transaction.objectStore('posts');
      const index = store.index('byTimestamp');
      
      // Use openCursor to get posts in descending order (newest first)
      const request = index.openCursor(null, 'prev');
      
      const posts: Post[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        
        if (cursor && posts.length < limit) {
          posts.push(cursor.value);
          cursor.continue();
        } else {
          resolve(posts);
        }
      };
      
      request.onerror = (event) => {
        console.error('Failed to get latest posts:', event);
        reject(new Error('Failed to get latest posts'));
      };
    });
  }
  
  // Get posts sorted by popularity (most upvotes)
  async getPopularPosts(limit: number = 20): Promise<Post[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction('posts', 'readonly');
      const store = transaction.objectStore('posts');
      
      // Get all posts first, then sort them by popularity score
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        const posts = (event.target as IDBRequest).result as Post[];
        
        // Sort by popularity (upvotes - downvotes)
        posts.sort((a, b) => {
          const scoreA = a.upvotes - a.downvotes;
          const scoreB = b.upvotes - b.downvotes;
          return scoreB - scoreA; // Descending order
        });
        
        // Return the top 'limit' posts
        resolve(posts.slice(0, limit));
      };
      
      request.onerror = (event) => {
        console.error('Failed to get popular posts:', event);
        reject(new Error('Failed to get popular posts'));
      };
    });
  }
  
  // Comment-specific methods
  async addComment(
    postId: string, 
    content: string, 
    authorPublicKey: string, 
    privateKey: string,
    parentCommentId?: string
  ): Promise<Comment> {
    try {
      // Encrypt the content before storing
      const encryptedData = await CryptoService.encryptData(content);
      
      // Generate a unique ID for the comment
      const id = crypto.randomUUID();
      
      // Prepare the comment object
      const commentData: Comment = {
        id,
        postId,
        parentCommentId,
        authorPublicKey,
        content: JSON.stringify(encryptedData), // Store encrypted content
        timestamp: Date.now(),
        upvotes: 0,
        downvotes: 0,
        signature: '' // Will be set below
      };
      
      // Create a signature of the comment data to verify authenticity
      const dataToSign = JSON.stringify({
        id: commentData.id,
        postId: commentData.postId,
        parentCommentId: commentData.parentCommentId,
        authorPublicKey: commentData.authorPublicKey,
        content: commentData.content,
        timestamp: commentData.timestamp
      });
      
      // Sign the data with the author's private key
      commentData.signature = await CryptoService.signData(dataToSign, privateKey);
      
      // Store the comment in the database
      const result = await this.addItem<Comment>('comments', commentData);
      
      // Update the comment count for the post
      const post = await this.getPost(postId);
      if (post) {
        post.commentCount += 1;
        await this.updateItem('posts', post);
      }
      
      // Create a notification for the post author or parent comment author
      await this.createNotificationForReply(commentData);
      
      return result;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw new Error('Failed to create comment');
    }
  }
  
  // Get comments for a post
  async getCommentsForPost(postId: string): Promise<Comment[]> {
    return this.getItemsByIndex<Comment>('comments', 'byPostId', postId);
  }
  
  // Get replies to a comment
  async getRepliesForComment(commentId: string): Promise<Comment[]> {
    return this.getItemsByIndex<Comment>('comments', 'byParentCommentId', commentId);
  }
  
  // Voting methods
  async addVote(
    targetId: string, 
    targetType: 'post' | 'comment', 
    value: 1 | -1, 
    authorPublicKey: string, 
    privateKey: string
  ): Promise<Vote> {
    try {
      // Check if user has already voted on this item
      const existingVotes = await this.getItemsByIndex<Vote>(
        'votes', 
        'unique_vote', 
        IDBKeyRange.only([targetId, targetType, authorPublicKey])
      );
      
      // If user already voted, update the existing vote
      if (existingVotes.length > 0) {
        const existingVote = existingVotes[0];
        
        // If vote value is the same, it's a toggle (remove the vote)
        if (existingVote.value === value) {
          await this.deleteItem('votes', existingVote.id);
          await this.updateVoteCount(targetId, targetType, -value); // Reverse the previous vote
          return existingVote;
        }
        
        // Otherwise, update the vote value
        existingVote.value = value;
        existingVote.timestamp = Date.now();
        
        // Update the vote count on the target item
        await this.updateVoteCount(targetId, targetType, value * 2); // Double because we're flipping from -1 to 1 or vice versa
        
        return await this.updateItem('votes', existingVote);
      }
      
      // Create a new vote
      const id = crypto.randomUUID();
      const voteData: Vote = {
        id,
        targetId,
        targetType,
        authorPublicKey,
        value,
        timestamp: Date.now(),
        signature: '' // Will be set below
      };
      
      // Create a signature of the vote data
      const dataToSign = JSON.stringify({
        id: voteData.id,
        targetId: voteData.targetId,
        targetType: voteData.targetType,
        authorPublicKey: voteData.authorPublicKey,
        value: voteData.value,
        timestamp: voteData.timestamp
      });
      
      // Sign the data with the voter's private key
      voteData.signature = await CryptoService.signData(dataToSign, privateKey);
      
      // Store the vote
      const result = await this.addItem<Vote>('votes', voteData);
      
      // Update the vote count on the target item
      await this.updateVoteCount(targetId, targetType, value);
      
      // Create a notification for upvotes (not for downvotes)
      if (value === 1) {
        await this.createNotificationForVote(voteData);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to add vote:', error);
      throw new Error('Failed to add vote');
    }
  }
  
  // Update the vote count on a post or comment
  public async updateVoteCount(targetId: string, targetType: 'post' | 'comment', value: number): Promise<void> {
    try {
      const storeName = targetType === 'post' ? 'posts' : 'comments';
      const target = await this.getItem<Post | Comment>(storeName, targetId);
      
      if (!target) {
        throw new Error(`${targetType} not found`);
      }
      
      if ('upvotes' in target && 'downvotes' in target) {
        if (value > 0) {
          target.upvotes += value;
        } else {
          target.downvotes += Math.abs(value); // Correctly decrement downvotes
        }
      } else {
        throw new Error('Target does not have upvotes or downvotes properties');
      }
      
      await this.updateItem(storeName, target);
    } catch (error) {
      console.error('Failed to update vote count:', error);
      throw new Error('Failed to update vote count');
    }
  }
  
  // Notification methods
  private async createNotificationForReply(comment: Comment): Promise<void> {
    try {
      // Determine which item the notification is for (post or parent comment)
      let recipientPublicKey = '';
      let targetId = '';
      let targetType: 'post' | 'comment' = 'post';
      
      if (comment.parentCommentId) {
        // This is a reply to another comment
        const parentComment = await this.getItem<Comment>('comments', comment.parentCommentId);
        if (parentComment && parentComment.authorPublicKey !== comment.authorPublicKey) {
          recipientPublicKey = parentComment.authorPublicKey;
          targetId = comment.parentCommentId;
          targetType = 'comment';
        }
      } else {
        // This is a comment on a post
        const post = await this.getItem<Post>('posts', comment.postId);
        if (post && post.authorPublicKey !== comment.authorPublicKey) {
          recipientPublicKey = post.authorPublicKey;
          targetId = comment.postId;
          targetType = 'post';
        }
      }
      
      // Only create notification if recipient exists and is not the commenter
      if (recipientPublicKey) {
        const notification: Notification = {
          id: crypto.randomUUID(),
          recipientPublicKey,
          sourcePublicKey: comment.authorPublicKey,
          targetId,
          targetType,
          action: 'reply',
          isRead: false,
          timestamp: Date.now(),
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
        };
        
        await this.addItem<Notification>('notifications', notification);
      }
    } catch (error) {
      console.error('Failed to create notification for reply:', error);
      // Don't throw here - notifications are non-critical
    }
  }
  
  private async createNotificationForVote(vote: Vote): Promise<void> {
    try {
      // Only create notifications for upvotes
      if (vote.value !== 1) return;
      
      // Get the target item (post or comment)
      const storeName = vote.targetType === 'post' ? 'posts' : 'comments';
      const target = await this.getItem(storeName, vote.targetId);
      
      if (!target) return;
      
      // Cast target to Post or Comment
      const targetItem = target as Post | Comment;

      // Don't notify for self-votes
      if (targetItem.authorPublicKey === vote.authorPublicKey) return;
      
      const notification: Notification = {
        id: crypto.randomUUID(),
        recipientPublicKey: targetItem.authorPublicKey,
        sourcePublicKey: vote.authorPublicKey,
        targetId: vote.targetId,
        targetType: vote.targetType,
        action: 'upvote',
        isRead: false,
        timestamp: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
      };
      
      await this.addItem<Notification>('notifications', notification);
    } catch (error) {
      console.error('Failed to create notification for vote:', error);
      // Don't throw here - notifications are non-critical
    }
  }
  
  // Get notifications for a user
  async getNotifications(userPublicKey: string, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      const notifications = await this.getItemsByIndex<Notification>(
        'notifications', 
        'byRecipient', 
        userPublicKey
      );
      
      // Filter by read status if needed
      const filtered = unreadOnly 
        ? notifications.filter(n => !n.isRead) 
        : notifications;
      
      // Sort by timestamp (newest first)
      return filtered.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw new Error('Failed to get notifications');
    }
  }
  
  // Mark a notification as read
  async markNotificationAsRead(id: string): Promise<void> {
    try {
      const notification = await this.getItem<Notification>('notifications', id);
      if (notification) {
        notification.isRead = true;
        await this.updateItem('notifications', notification);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }
  
  // Delete expired notifications
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const now = Date.now();
      const notifications = await this.getItemsByIndex<Notification>(
        'notifications',
        'byExpiration',
        IDBKeyRange.upperBound(now)
      );
      
      for (const notification of notifications) {
        await this.deleteItem('notifications', notification.id);
      }
    } catch (error) {
      console.error('Failed to cleanup expired notifications:', error);
      // Don't throw - this is a background operation
    }
  }
  
  // Delete all user data - for privacy/right to be forgotten
  async deleteAllUserData(userPublicKey: string): Promise<void> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      // Delete all posts by the user
      const userPosts = await this.getItemsByIndex<Post>('posts', 'byAuthor', userPublicKey);
      for (const post of userPosts) {
        await this.deleteItem('posts', post.id);
      }
      
      // Delete all comments by the user
      const userComments = await this.getItemsByIndex<Comment>('comments', 'byAuthor', userPublicKey);
      for (const comment of userComments) {
        await this.deleteItem('comments', comment.id);
      }
      
      // Delete all votes by the user
      const userVotes = await this.getItemsByIndex<Vote>('votes', 'byAuthor', userPublicKey);
      for (const vote of userVotes) {
        await this.deleteItem('votes', vote.id);
      }
      
      // Delete all notifications for the user
      const userNotifications = await this.getItemsByIndex<Notification>(
        'notifications', 
        'byRecipient', 
        userPublicKey
      );
      for (const notification of userNotifications) {
        await this.deleteItem('notifications', notification.id);
      }
    } catch (error) {
      console.error('Failed to delete all user data:', error);
      throw new Error('Failed to delete all user data');
    }
  }
}

// Create a singleton instance
export const db = new DatabaseService();