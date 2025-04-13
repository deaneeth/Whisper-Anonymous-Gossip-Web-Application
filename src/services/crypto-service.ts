// crypto-service.ts - Handles all cryptographic operations

import { KeyPair, EncryptedData } from '../types';

// Class for handling all cryptographic operations
export class CryptoService {
  // Use a consistent salt for key derivation
  private static readonly SALT = new Uint8Array([
    0x5a, 0x2c, 0x8b, 0x3d, 0xf7, 0x2e, 0x61, 0x18, 
    0x9f, 0xac, 0x4d, 0x6b, 0x0e, 0x7c, 0x14, 0x9a
  ]);
  
  // Master key derived from user's private key
  private static masterKey: CryptoKey | null = null;
  
  // Generate a new key pair for user authentication
  static async generateKeyPair(): Promise<KeyPair> {
    try {
      // Use ECDSA with P-256 for wider browser compatibility
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        true, // extractable
        ['sign', 'verify']
      );
  
      // Export the keys
      const publicKeyBuffer = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
      const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  
      // Convert to Base64
      const publicKey = this.bufferToBase64(publicKeyBuffer);
      const privateKey = this.bufferToBase64(privateKeyBuffer);
  
      // Initialize master key
      await this.initializeMasterKey(privateKey);
      
      return { publicKey, privateKey };
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw new Error('Failed to generate cryptographic keys. Your browser may not support the required features.');
    }
  }
  
  // Initialize the master key from user's private key
  static async initializeMasterKey(privateKey: string): Promise<void> {
    try {
      // Convert private key string to bytes for key derivation
      const privateKeyBytes = this.base64ToBuffer(privateKey);
      
      // Use PBKDF2 to derive a stable key from the private key
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        privateKeyBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Derive the master key for encryption/decryption
      this.masterKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: this.SALT,
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false, // not extractable
        ['encrypt', 'decrypt']
      );
      
      console.log('Master encryption key initialized');
    } catch (error) {
      console.error('Failed to initialize master key:', error);
      throw new Error('Failed to initialize encryption. Your browser may not support the required cryptographic features.');
    }
  }
  
  // Sign data using the private key to verify authorship
  static async signData(data: string, privateKeyBase64: string): Promise<string> {
    try {
      const privateKeyBuffer = this.base64ToBuffer(privateKeyBase64);
      
      // Import the private key for signing
      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        false, // not extractable
        ['sign'] // key usage
      );
      
      // Convert data to buffer and sign it
      const dataBuffer = new TextEncoder().encode(data);
      const signature = await window.crypto.subtle.sign(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' },
        },
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
      
      // Import the public key for verification
      const publicKey = await window.crypto.subtle.importKey(
        'raw',
        publicKeyBuffer,
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        false, // not extractable
        ['verify'] // key usage
      );
      
      // Convert data to buffer and verify signature
      const dataBuffer = new TextEncoder().encode(data);
      return await window.crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' },
        },
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
      // Ensure master key is initialized
      if (!this.masterKey) {
        throw new Error('Encryption key not initialized. Please authenticate first.');
      }
      
      // Generate a random key for this specific data
      const dataKey = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      // Generate a random IV (Initialization Vector)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Convert data to buffer
      const dataBuffer = new TextEncoder().encode(data);
      
      // Encrypt the data with the data-specific key
      const cipherBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        dataKey,
        dataBuffer
      );
      
      // Export the data key
      const dataKeyBuffer = await window.crypto.subtle.exportKey('raw', dataKey);
      
      // Encrypt the data key with the master key
      const encryptedKeyIv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: encryptedKeyIv,
        },
        this.masterKey,
        dataKeyBuffer
      );
      
      // Return the encrypted data, IV, and encrypted key
      return {
        ciphertext: this.bufferToBase64(cipherBuffer),
        iv: this.bufferToBase64(iv),
        key: this.bufferToBase64(encryptedKeyBuffer) + '.' + this.bufferToBase64(encryptedKeyIv)
      };
    } catch (error) {
      console.error('Failed to encrypt data:', error);
      throw new Error('Failed to encrypt data. Please try authenticating again.');
    }
  }
  
  // Decrypt data that was encrypted with AES-256
  static async decryptData(encryptedData: EncryptedData): Promise<string> {
    try {
      // Ensure master key is initialized
      if (!this.masterKey) {
        throw new Error('Decryption key not initialized. Please authenticate first.');
      }
      
      // Get encrypted data components
      const cipherBuffer = this.base64ToBuffer(encryptedData.ciphertext);
      const ivBuffer = this.base64ToBuffer(encryptedData.iv);
      
      // Check if we have an encrypted data key
      if (!encryptedData.key) {
        throw new Error('Encrypted data is missing the key. Cannot decrypt.');
      }
      
      // Extract the encrypted key and its IV
      const [encryptedKeyBase64, encryptedKeyIvBase64] = encryptedData.key.split('.');
      const encryptedKeyBuffer = this.base64ToBuffer(encryptedKeyBase64);
      const encryptedKeyIv = this.base64ToBuffer(encryptedKeyIvBase64);
      
      // Decrypt the data key with the master key
      const dataKeyBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: encryptedKeyIv,
        },
        this.masterKey,
        encryptedKeyBuffer
      );
      
      // Import the data key
      const dataKey = await window.crypto.subtle.importKey(
        'raw',
        dataKeyBuffer,
        {
          name: 'AES-GCM',
          length: 256,
        },
        false, // not extractable
        ['decrypt'] // key usage
      );
      
      // Decrypt the data with the data key
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer,
        },
        dataKey,
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
        // Initialize master key for encryption/decryption
        await CryptoService.initializeMasterKey(savedKeyPair.privateKey);
        return savedKeyPair;
      }
      
      return null; // No existing keys found
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
      
      // Initialize master key for encryption/decryption
      CryptoService.initializeMasterKey(keyPair.privateKey)
        .catch(error => console.error('Failed to initialize master key during save:', error));
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
      
      const keyPair = JSON.parse(storedKeyPair) as KeyPair;
      
      // Validate that the key pair has required properties
      if (!keyPair.publicKey || !keyPair.privateKey) {
        console.error('Loaded key pair is invalid');
        return null;
      }
      
      return keyPair;
    } catch (error) {
      console.error('Failed to load key pair:', error);
      return null;
    }
  }
  
  // Sign out - clear keys from storage
  static signOut(): void {
    try {
      localStorage.removeItem(this.KEY_STORAGE_KEY);
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