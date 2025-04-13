// crypto-service.ts - Handles all cryptographic operations

// Key type definitions
interface KeyPair {
    publicKey: string;  // Base64 encoded public key (user's "identity")
    privateKey: string; // Base64 encoded private key (must be kept secret)
  }
  
  interface EncryptedData {
    ciphertext: string; // Base64 encoded encrypted data
    iv: string;        // Base64 encoded initialization vector
  }
  
  // Class for handling all cryptographic operations
  export class CryptoService {
    // Generate a new Ed25519 key pair for user authentication
    static async generateKeyPair(): Promise<KeyPair> {
      try {
        // Simpler approach for compatibility
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: 'ECDSA',
            namedCurve: 'P-256', // Using P-256 instead of Ed25519 for wider browser support
          },
          true,
          ['sign', 'verify']
        );
    
        // Export the keys
        const publicKeyBuffer = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
        const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    
        // Convert to Base64
        const publicKey = this.bufferToBase64(publicKeyBuffer);
        const privateKey = this.bufferToBase64(privateKeyBuffer);
    
        return { publicKey, privateKey };
      } catch (error) {
        console.error('Failed to generate key pair:', error);
        throw new Error('Failed to generate cryptographic keys. Your browser may not support the required features.');
      }
    }
  
    // Sign data using the private key to verify authorship
    static async signData(data: string, privateKeyBase64: string): Promise<string> {
      try {
        const privateKeyBuffer = this.base64ToBuffer(privateKeyBase64);
        
        // Import the private key
        const privateKey = await window.crypto.subtle.importKey(
          'pkcs8',
          privateKeyBuffer,
          {
            name: 'Ed25519',
            namedCurve: 'Ed25519',
          },
          false, // not extractable
          ['sign'] // key usage
        );
        
        // Convert data to buffer and sign it
        const dataBuffer = new TextEncoder().encode(data);
        const signature = await window.crypto.subtle.sign(
          'Ed25519',
          privateKey,
          dataBuffer
        );
        
        // Return Base64 encoded signature
        return this.bufferToBase64(signature);
      } catch (error) {
        console.error('Failed to sign data:', error);
        throw new Error('Failed to sign data with your private key.');
      }
    }
  
    // Verify signature using the public key
    static async verifySignature(data: string, signature: string, publicKeyBase64: string): Promise<boolean> {
      try {
        const publicKeyBuffer = this.base64ToBuffer(publicKeyBase64);
        const signatureBuffer = this.base64ToBuffer(signature);
        
        // Import the public key
        const publicKey = await window.crypto.subtle.importKey(
          'raw',
          publicKeyBuffer,
          {
            name: 'Ed25519',
            namedCurve: 'Ed25519',
          },
          false, // not extractable
          ['verify'] // key usage
        );
        
        // Convert data to buffer and verify signature
        const dataBuffer = new TextEncoder().encode(data);
        return await window.crypto.subtle.verify(
          'Ed25519',
          publicKey,
          signatureBuffer,
          dataBuffer
        );
      } catch (error) {
        console.error('Failed to verify signature:', error);
        return false;
      }
    }
  
    // Encrypt data with AES-256 before storing locally
    static async encryptData(data: string): Promise<EncryptedData> {
      try {
        // Generate a random AES key for this data
        const key = await window.crypto.subtle.generateKey(
          {
            name: 'AES-GCM',
            length: 256,
          },
          true, // extractable
          ['encrypt', 'decrypt'] // key usages
        );
        
        // Generate a random IV (Initialization Vector)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // Convert data to buffer
        const dataBuffer = new TextEncoder().encode(data);
        
        // Encrypt the data
        const cipherBuffer = await window.crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: iv,
          },
          key,
          dataBuffer
        );
        
        // Export the key for storage
        const keyBuffer = await window.crypto.subtle.exportKey('raw', key);
        
        // Store the key in localStorage for this session
        localStorage.setItem('encryption_key', this.bufferToBase64(keyBuffer));
        
        // Return the encrypted data and IV
        return {
          ciphertext: this.bufferToBase64(cipherBuffer),
          iv: this.bufferToBase64(iv),
        };
      } catch (error) {
        console.error('Failed to encrypt data:', error);
        throw new Error('Failed to encrypt data.');
      }
    }
  
    // Decrypt data that was encrypted with AES-256
    static async decryptData(encryptedData: EncryptedData): Promise<string> {
      try {
        // Get the encryption key from localStorage
        const keyBase64 = localStorage.getItem('encryption_key');
        if (!keyBase64) {
          throw new Error('Encryption key not found. You may need to re-authenticate.');
        }
        
        const keyBuffer = this.base64ToBuffer(keyBase64);
        const cipherBuffer = this.base64ToBuffer(encryptedData.ciphertext);
        const ivBuffer = this.base64ToBuffer(encryptedData.iv);
        
        // Import the key
        const key = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          {
            name: 'AES-GCM',
            length: 256,
          },
          false, // not extractable
          ['decrypt'] // key usage
        );
        
        // Decrypt the data
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: ivBuffer,
          },
          key,
          cipherBuffer
        );
        
        // Convert the decrypted data back to text
        return new TextDecoder().decode(decryptedBuffer);
      } catch (error) {
        console.error('Failed to decrypt data:', error);
        throw new Error('Failed to decrypt data. The data may be corrupted or the encryption key may be invalid.');
      }
    }
  
    // Helper method to convert ArrayBuffer to Base64 string
    static bufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
  
    // Helper method to convert Base64 string to ArrayBuffer
    static base64ToBuffer(base64: string): ArrayBuffer {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }
  }
  
  // Auth service that manages user authentication using cryptographic keys
  export class AuthService {
    private static readonly KEY_STORAGE_KEY = 'user_key_pair';
    
    // Initialize auth - either load existing keys or generate new ones
    static async initialize(): Promise<KeyPair | null> {
      try {
        // Try to load existing keys from localStorage
        const savedKeyPair = this.loadKeyPair();
        if (savedKeyPair) {
          return savedKeyPair;
        }
        
        // No existing keys, generate new ones
        const newKeyPair = await CryptoService.generateKeyPair();
        this.saveKeyPair(newKeyPair);
        return newKeyPair;
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        return null;
      }
    }
    
    // Save key pair to localStorage (encrypted)
    static saveKeyPair(keyPair: KeyPair): void {
      try {
        // In a production app, we would encrypt this with a password
        // For now, we just store it directly (still a security risk)
        localStorage.setItem(this.KEY_STORAGE_KEY, JSON.stringify(keyPair));
      } catch (error) {
        console.error('Failed to save key pair:', error);
        throw new Error('Failed to save your authentication keys. Please ensure your browser supports localStorage.');
      }
    }
    
    // Load key pair from localStorage
    static loadKeyPair(): KeyPair | null {
      try {
        const storedKeyPair = localStorage.getItem(this.KEY_STORAGE_KEY);
        if (!storedKeyPair) {
          return null;
        }
        
        return JSON.parse(storedKeyPair) as KeyPair;
      } catch (error) {
        console.error('Failed to load key pair:', error);
        return null;
      }
    }
    
    // Sign out - clear keys from storage
    static signOut(): void {
      try {
        localStorage.removeItem(this.KEY_STORAGE_KEY);
        localStorage.removeItem('encryption_key');
      } catch (error) {
        console.error('Failed to sign out:', error);
      }
    }
    
    // Get a shortened version of the public key for display
    static getDisplayId(publicKey: string): string {
      if (!publicKey) return '';
      // Return first 6 chars + ... + last 4 chars
      return `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`;
    }
  }