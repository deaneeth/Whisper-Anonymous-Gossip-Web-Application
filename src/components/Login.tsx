// Login.tsx - Anonymous authentication component

import React, { useState } from 'react';
import { CryptoService, AuthService } from '../services/crypto-service';
import { KeyPair } from '../types';

interface LoginProps {
  onAuthenticate: (keyPair: KeyPair) => void;
}

const Login: React.FC<LoginProps> = ({ onAuthenticate }) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Handle new key generation
  const handleGenerateNewKey = async () => {
    try {
      setIsGenerating(true);
      setErrorMessage('');
      
      // Generate a new key pair
      const keyPair = await CryptoService.generateKeyPair();
      
      // Save the key pair
      AuthService.saveKeyPair(keyPair);
      
      // Notify parent component
      onAuthenticate(keyPair);
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      setErrorMessage('Failed to generate cryptographic keys. Your browser may not support the required features.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle importing existing key
  const handleImportKey = async () => {
    try {
      setIsImporting(true);
      setErrorMessage('');
      
      if (!privateKeyInput.trim()) {
        setErrorMessage('Please enter your private key');
        return;
      }
      
      // Validate the private key format
      let privateKey = privateKeyInput.trim();
      
      try {
        // Try to decode the private key to check if it's valid Base64
        atob(privateKey);
      } catch {
        setErrorMessage('Invalid private key format. Please enter a valid private key.');
        return;
      }
      
      // Generate the public key from the private key
      // Note: In a real app, you would derive the public key from the private key
      // This is a simplified version for demo purposes
      
      // For Ed25519, we need to properly import the key and derive the public key
      // This requires complex crypto operations which we simplify here
      
      // Create a dummy key pair for demonstration
      // In a real app, you would properly derive the key pair
      const keyPair: KeyPair = {
        privateKey,
        publicKey: 'derived_' + Math.random().toString(36).substring(2, 15) // Dummy public key
      };
      
      // Save the key pair
      AuthService.saveKeyPair(keyPair);
      
      // Notify parent component
      onAuthenticate(keyPair);
    } catch (error) {
      console.error('Failed to import key:', error);
      setErrorMessage('Failed to import key. Please check that you entered a valid private key.');
    } finally {
      setIsImporting(false);
    }
  };
  
  // Handle backup key
  const handleBackupKey = async () => {
    try {
      const keyPair = await CryptoService.generateKeyPair();
      
      // Create a text file containing the private key
      const blob = new Blob([keyPair.privateKey], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 'whisper_private_key.txt';
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      
      // Copy the private key to the input field
      setPrivateKeyInput(keyPair.privateKey);
      
      // Set a notification message
      setErrorMessage('Private key generated and downloaded. Keep this file safe! Anyone with this key can access your account.');
    } catch (error) {
      console.error('Failed to generate and backup key:', error);
      setErrorMessage('Failed to generate and backup key. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Whisper</h1>
          <p className="mt-2 text-gray-600">Anonymous Gossip Network</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-medium text-gray-900">Anonymous Authentication</h2>
            <p className="mt-1 text-sm text-gray-500">
              No emails, phone numbers, or personal information required. 
              Login with cryptographic keys only.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleGenerateNewKey}
              disabled={isGenerating}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                  Generating...
                </>
              ) : (
                "Generate New Key (First-time User)"
              )}
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
            
            <div>
              <button
                onClick={handleBackupKey}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Generate & Download a Backup Key
              </button>
            </div>
            
            <div className="mt-4">
              <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700">
                Enter Your Private Key
              </label>
              <div className="mt-1">
                <input
                  id="privateKey"
                  name="privateKey"
                  type="text"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="Paste your private key here"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            
            <button
              onClick={handleImportKey}
              disabled={isImporting || !privateKeyInput.trim()}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
            >
              {isImporting ? (
                <>
                  <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                  Importing...
                </>
              ) : (
                "Import Existing Key"
              )}
            </button>
          </div>
          
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {errorMessage}
            </div>
          )}
          
          <div className="text-sm text-gray-500 border-t pt-4">
            <p className="font-bold text-red-600">⚠️ Warning:</p>
            <p className="mt-1">
              Your private key is the ONLY way to access your account. 
              There is NO password recovery option.
            </p>
            <p className="mt-1">
              If you lose your key, you lose access to your account FOREVER.
            </p>
            <p className="mt-1">
              Save your key securely in a password manager or encrypted file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;