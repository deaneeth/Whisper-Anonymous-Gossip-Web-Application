// Key type definitions
export interface KeyPair {
    publicKey: string;  // Base64 encoded public key (user's "identity")
    privateKey: string; // Base64 encoded private key (must be kept secret)
  }
  
  export interface EncryptedData {
    ciphertext: string; // Base64 encoded encrypted data
    iv: string;        // Base64 encoded initialization vector
    key?: string;      // Optional encrypted key for data-specific encryption
  }
  
  // Interface for notification types
  export interface NotificationInfo {
    id: string;
    message: string;
    timestamp: number;
    isRead: boolean;
  }