import React from 'react';
import { Profile, Decision } from '../types';
import { ExternalLink, UserCheck, Trash2, Building2, Mail, Calendar, MessageSquare, HelpCircle, Linkedin, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface ProfileCardProps {
  profile: Profile;
  swipeDirection: 'left' | 'right' | null;
  decision?: Decision;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, swipeDirection, decision }) => {
  if (!profile) {
    return null;
  }

  const cardClasses = `
    bg-white rounded-xl shadow-xl p-6 transform transition-all duration-300 relative
    ${swipeDirection === 'left' ? '-translate-x-full opacity-0' : ''}
    ${swipeDirection === 'right' ? 'translate-x-full opacity-0' : ''}
    ${decision === 'keep' ? 'ring-4 ring-green-200' : ''}
    ${decision === 'remove' ? 'ring-4 ring-red-200' : ''}
    ${decision === 'pending' ? 'ring-4 ring-gray-200' : ''}
  `;

  // Get the last 20 messages
  const recentMessages = profile.messages ? [...profile.messages].slice(0, 20) : [];

  return (
    <div className={cardClasses}>
      {decision && (
        <div className={`absolute top-4 right-4 p-2 rounded-full ${
          decision === 'keep' ? 'bg-green-100' : 
          decision === 'remove' ? 'bg-red-100' : 
          'bg-gray-100'
        }`}>
          {decision === 'keep' ? (
            <UserCheck className="w-6 h-6 text-green-600" />
          ) : decision === 'remove' ? (
            <Trash2 className="w-6 h-6 text-red-600" />
          ) : (
            <HelpCircle className="w-6 h-6 text-gray-600" />
          )}
        </div>
      )}

      <div className="text-center mb-6">
        {profile.profilePicture ? (
          <img
            src={profile.profilePicture}
            alt={`${profile.firstName} ${profile.lastName}`}
            className="w-24 h-24 rounded-full mx-auto object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling!.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mx-auto flex items-center justify-center"
          style={{ display: profile.profilePicture ? 'none' : 'flex' }}
        >
          <span className="text-3xl font-bold text-white">
            {profile.firstName?.[0]}{profile.lastName?.[0]}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-center text-gray-800">
          {profile.firstName} {profile.lastName}
        </h2>
        {profile.url && (
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
            title="View on LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </a>
        )}
      </div>

      <p className="text-gray-600 text-center mb-4">{profile.position}</p>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="font-medium text-gray-700">Company:</span>
          <span className="text-gray-600 truncate">{profile.company}</span>
        </div>

        {profile.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="font-medium text-gray-700">Email:</span>
            <span className="text-gray-600 truncate">{profile.email}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="font-medium text-gray-700">Connected:</span>
          <span className="text-gray-600">{profile.connectedOn}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Messages</span>
          </div>
          {recentMessages.length > 0 && (
            <span className="text-xs text-gray-500">Last {recentMessages.length} messages</span>
          )}
        </div>
        
        {recentMessages.length > 0 ? (
          <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
            <div className="space-y-3">
              {recentMessages.map((message, index) => (
                <div 
                  key={index} 
                  className={`pb-3 border-b border-gray-100 last:border-0 ${
                    message.isOutgoing ? 'pl-2' : 'pr-2'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.isOutgoing ? (
                      <ArrowUpRight className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                    ) : (
                      <ArrowDownLeft className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                    )}
                    <p className="text-sm text-gray-700">{message.text}</p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400 ml-5">{message.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-center">
            <p className="text-sm text-gray-400">No messages exchanged</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;