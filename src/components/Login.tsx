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
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Handle new key generation
  const handleGenerateNewKey = async () => {
    try {
      setIsGenerating(true);
      setErrorMessage('');
      setSuccessMessage('');
      
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
      setSuccessMessage('');
      
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
      setSuccessMessage('');
      setErrorMessage('');
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
      setSuccessMessage('Private key generated and downloaded. Keep this file safe! Anyone with this key can access your account.');
    } catch (error) {
      console.error('Failed to generate and backup key:', error);
      setErrorMessage('Failed to generate and backup key. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-soft border border-whisper-200">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-md flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-primary-700">Whisper</h1>
          <p className="mt-2 text-whisper-600">Anonymous Gossip Network</p>
        </div>
        
        <div className="space-y-6">
          <div className="bg-whisper-50 p-4 rounded-lg border-l-4 border-primary-500">
            <h2 className="text-xl font-semibold text-primary-700">Anonymous Authentication</h2>
            <p className="mt-1 text-sm text-whisper-600">
              No emails, phone numbers, or personal information required. 
              Login with cryptographic keys only.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleGenerateNewKey}
              disabled={isGenerating}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-button text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
              ${isGenerating ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Generate New Key (First-time User)
                </>
              )}
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-whisper-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-whisper-500">Or</span>
              </div>
            </div>
            
            <div>
              <button
                onClick={handleBackupKey}
                className="w-full flex justify-center py-3 px-4 border border-whisper-300 rounded-lg shadow-sm text-sm font-medium text-whisper-700 bg-white hover:bg-whisper-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Generate & Download a Backup Key
              </button>
            </div>
            
            <div className="mt-4">
              <label htmlFor="privateKey" className="block text-sm font-medium text-whisper-700">
                Enter Your Private Key
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="privateKey"
                  name="privateKey"
                  type="text"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="Paste your private key here"
                  className="appearance-none block w-full px-3 py-2 border border-whisper-300 rounded-md shadow-sm placeholder-whisper-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {privateKeyInput && (
                  <button 
                    type="button"
                    onClick={() => setPrivateKeyInput('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-whisper-400 hover:text-whisper-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            <button
              onClick={handleImportKey}
              disabled={isImporting || !privateKeyInput.trim()}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-button text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500
              ${isImporting || !privateKeyInput.trim() ? 'bg-accent-300 cursor-not-allowed' : 'bg-accent-500 hover:bg-accent-600'}`}
            >
              {isImporting ? (
                <>
                  <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                  Importing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Import Existing Key
                </>
              )}
            </button>
          </div>
          
          {errorMessage && (
            <div className="p-3 bg-accent-50 text-accent-700 rounded-md text-sm border border-accent-200 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-accent-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="p-3 bg-primary-50 text-primary-700 rounded-md text-sm border border-primary-200 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}
          
          <div className="rounded-lg bg-whisper-50 p-4 border border-whisper-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-accent-800">Warning:</h3>
                <div className="mt-2 text-sm text-whisper-600 space-y-1">
                  <p>
                    Your private key is the <strong>ONLY</strong> way to access your account. 
                    There is <strong>NO</strong> password recovery option.
                  </p>
                  <p>
                    If you lose your key, you lose access to your account <strong>FOREVER</strong>.
                  </p>
                  <p>
                    Save your key securely in a password manager or encrypted file.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;