import React from 'react';
import { Profile, Decision } from '../types';
import { ExternalLink, UserCheck, Trash2, Building2, Mail, Calendar, MessageSquare, ArrowDownLeft, ArrowUpRight, MessageSquareOff } from 'lucide-react';

interface ProfileCardProps {
  profile: Profile;
  swipeDirection: 'left' | 'right' | null;
  decision?: Decision;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, swipeDirection, decision }) => {
  if (!profile) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    try {
      return dateStr.split(' ')[0];
    } catch {
      return dateStr;
    }
  };

  const cardClasses = `
    bg-white rounded-xl shadow-xl p-6 transform transition-all duration-300 relative
    ${swipeDirection === 'left' ? '-translate-x-full opacity-0' : ''}
    ${swipeDirection === 'right' ? 'translate-x-full opacity-0' : ''}
    ${decision === 'keep' ? 'ring-4 ring-green-200' : ''}
    ${decision === 'remove' ? 'ring-4 ring-red-200' : ''}
  `;

  return (
    <div className="relative">
      {/* Left swipe indicator */}
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transform transition-opacity duration-300 ${
        swipeDirection === 'left' ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="bg-red-100 rounded-full p-3">
          <Trash2 className="w-8 h-8 text-red-600" />
        </div>
      </div>

      {/* Right swipe indicator */}
      <div className={`absolute right-4 top-1/2 -translate-y-1/2 transform transition-opacity duration-300 ${
        swipeDirection === 'right' ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="bg-green-100 rounded-full p-3">
          <UserCheck className="w-8 h-8 text-green-600" />
        </div>
      </div>

      {/* Swipe hint overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-green-500/10 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
      </div>

      <div className={cardClasses}>
        {decision && (
          <div className={`absolute top-4 right-4 p-2 rounded-full ${
            decision === 'keep' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {decision === 'keep' ? (
              <UserCheck className="w-6 h-6 text-green-600" />
            ) : (
              <Trash2 className="w-6 h-6 text-red-600" />
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

        <h2 className="text-xl font-bold text-center text-gray-800 mb-1">
          {profile.firstName} {profile.lastName}
        </h2>

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

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Messages</span>
            </div>
            <span className="text-xs text-gray-500">
              {profile.messages?.length || 0} total
            </span>
          </div>

          {(!profile.messages || profile.messages.length === 0) ? (
            <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center gap-2">
              <MessageSquareOff className="w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-500">No messages exchanged</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-2 max-h-64 overflow-y-auto custom-scrollbar divide-y divide-gray-100">
              {profile.messages.slice(0, 20).map((message, index) => {
                const isOutgoing = message.senderProfileUrl === profile.url;
                return (
                  <div key={index} className="text-xs flex gap-3 py-1.5 hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0 w-20 text-gray-400 text-right">
                      {formatDate(message.date)}
                    </div>
                    <div className="flex gap-1.5 flex-grow min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        {isOutgoing ? (
                          <ArrowUpRight className="w-3 h-3 text-blue-500" />
                        ) : (
                          <ArrowDownLeft className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-gray-600 break-words line-clamp-2">{message.content}</p>
                        {message.subject && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">Re: {message.subject}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {profile.url && (
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-4 text-blue-500 hover:text-blue-600 transition-colors"
          >
            View Profile <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Swipe direction hints */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs py-2 px-4 text-gray-500">
          <div className="flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Swipe left to remove
          </div>
          <div className="flex items-center gap-1">
            Swipe right to keep <UserCheck className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;