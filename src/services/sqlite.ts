import { Post, User } from '@/types';

// Mock SQLite service for development - will be replaced with real SQLite later
const mockPosts: Post[] = [];
const mockUsers: User[] = [];

export const sqliteService = {
  // Initialize database tables
  async initDatabase(): Promise<void> {
    console.log('Mock SQLite: Database initialized');
    return Promise.resolve();
  },

  // User registration
  async registerUser(email: string, password: string, displayName: string): Promise<User> {
    if (mockUsers.find(u => u.email === email)) {
      throw new Error('Email already in use');
    }
    const user: User = {
      id: (mockUsers.length + 1).toString(),
      email,
      password,
      displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsers.push(user);
    console.log('Mock SQLite: User registered', email);
    return user;
  },

  // User login
  async loginUser(email: string, password: string): Promise<User> {
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    console.log('Mock SQLite: User logged in', email);
    return user;
  },

  // Save post to local database
  async savePost(post: Post): Promise<void> {
    const existingIndex = mockPosts.findIndex(p => p.id === post.id);
    if (existingIndex >= 0) {
      mockPosts[existingIndex] = post;
    } else {
      mockPosts.push(post);
    }
    console.log('Mock SQLite: Post saved', post.title);
    return Promise.resolve();
  },

  // Get all posts for a user
  async getUserPosts(userId: string): Promise<Post[]> {
    const userPosts = mockPosts.filter(post => post.userId === userId);
    console.log('Mock SQLite: Retrieved posts for user', userId, userPosts.length);
    return Promise.resolve(userPosts);
  },

  // Update post sync status
  async updatePostSyncStatus(postId: string, isSynced: boolean): Promise<void> {
    const post = mockPosts.find(p => p.id === postId);
    if (post) {
      post.isSynced = isSynced;
    }
    console.log('Mock SQLite: Updated sync status for post', postId, isSynced);
    return Promise.resolve();
  },

  // Get unsynced posts
  async getUnsyncedPosts(): Promise<Post[]> {
    const unsyncedPosts = mockPosts.filter(post => !post.isSynced);
    console.log('Mock SQLite: Retrieved unsynced posts', unsyncedPosts.length);
    return Promise.resolve(unsyncedPosts);
  },

  // Delete post
  async deletePost(postId: string): Promise<void> {
    const index = mockPosts.findIndex(p => p.id === postId);
    if (index >= 0) {
      mockPosts.splice(index, 1);
    }
    console.log('Mock SQLite: Deleted post', postId);
    return Promise.resolve();
  },

  // Clear all data
  async clearAllData(): Promise<void> {
    mockPosts.length = 0;
    mockUsers.length = 0;
    console.log('Mock SQLite: Cleared all data');
    return Promise.resolve();
  },
}; 