// LegalDisclaimer.tsx - Legal disclaimer and warnings

import React, { useState } from 'react';

interface LegalDisclaimerProps {
  onAcknowledge: () => void;
}

const LegalDisclaimer: React.FC<LegalDisclaimerProps> = ({ onAcknowledge }) => {
  const [isChecked, setIsChecked] = useState<boolean>(false);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-lg w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Important Legal Notice</h1>
          <p className="mt-2 text-red-600 font-medium">
            Please read carefully before continuing
          </p>
        </div>
        
        <div className="space-y-6 text-gray-700">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h2 className="text-lg font-semibold text-yellow-800">Content Moderation</h2>
            <p className="mt-1">
              This app does not monitor content. Users are responsible for legal compliance
              with all applicable laws in their jurisdiction.
            </p>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold">Liability Disclaimer</h2>
            <p className="mt-1">
              By using this application, you agree that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                You will not share harmful, false, defamatory, obscene, or illegal information.
              </li>
              <li>
                You take full responsibility for any content you post or share through this platform.
              </li>
              <li>
                The developers and operators of this application are not responsible for user-generated content.
              </li>
              <li>
                This application does not record IP addresses, but your network traffic may still be visible 
                to your internet service provider or network administrator.
              </li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold">Data Ownership & Privacy</h2>
            <p className="mt-1">
              Your data belongs to you and stays on your device. However:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                Content you share is encrypted but will be accessible to other users of the application.
              </li>
              <li>
                Once content is shared through the P2P network, it cannot be permanently deleted from all devices.
              </li>
              <li>
                You can delete your local data at any time, but copies may exist on other users' devices.
              </li>
              <li>
                Your cryptographic identity (public key) is visible to other users, but contains no personally
                identifiable information unless you choose to share it.
              </li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold">Technical Limitations</h2>
            <p className="mt-1">
              Please be aware that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                This application operates on a peer-to-peer basis, which may lead to inconsistent 
                availability of content.
              </li>
              <li>
                There is no central authority to recover lost keys or passwords.
              </li>
              <li>
                The application cannot guarantee complete anonymity under all circumstances, especially 
                against sophisticated network analysis.
              </li>
              <li>
                The developers of this application make no guarantees about its security, reliability,
                or availability.
              </li>
            </ul>
          </div>
          
          <div className="flex items-start mt-8">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-700">
                I have read and agree to the above terms
              </label>
              <p className="text-gray-500">
                I understand that I am solely responsible for my actions and content posted using this application.
              </p>
            </div>
          </div>
          
          <div>
            <button
              onClick={onAcknowledge}
              disabled={!isChecked}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            >
              I Understand - Continue to Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalDisclaimer;