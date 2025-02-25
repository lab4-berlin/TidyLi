import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Trash2, UserCheck, HelpCircle } from 'lucide-react';
import ProfileCard from './components/ProfileCard';
import { Profile, ProfileDecision, Decision, Message } from './types';

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<ProfileDecision[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  // Parse CSV line considering quoted fields
  const parseCSVLine = (line: string): string[] => {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes
          currentField += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    fields.push(currentField.trim());
    return fields;
  };

  useEffect(() => {
    const savedDecisions = localStorage.getItem('profileDecisions');
    if (savedDecisions) {
      setDecisions(JSON.parse(savedDecisions));
    }
  }, []);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const [profilesResponse, picturesResponse, messagesResponse] = await Promise.all([
          fetch('/data/profiles.csv'),
          fetch('/data/pictures.csv'),
          fetch('/data/messages.csv')
        ]);

        const [profilesText, picturesText, messagesText] = await Promise.all([
          profilesResponse.text(),
          picturesResponse.text(),
          messagesResponse.text()
        ]);

        // Parse pictures
        const picturesMap = new Map();
        picturesText.split('\n').slice(1).forEach(row => {
          if (row.trim()) {
            const [profileUrl, pictureUrl] = row.split(',');
            picturesMap.set(profileUrl.trim(), pictureUrl.trim());
          }
        });

        // Parse messages with new format and proper CSV handling
        const messagesMap = new Map<string, Message[]>();
        if (messagesText.trim()) {
          const rows = messagesText.split('\n').slice(1);
          rows.forEach(row => {
            if (row.trim()) {
              const [
                conversationId,
                title,
                from,
                senderProfileUrl,
                to,
                recipientProfileUrls,
                date,
                subject,
                content,
                folder,
                isDraft,
                isConversationDraft
              ] = parseCSVLine(row);

              const message: Message = {
                conversationId,
                title,
                from,
                senderProfileUrl,
                to,
                recipientProfileUrls,
                date,
                subject,
                content,
                folder,
                isDraft: isDraft === 'true',
                isConversationDraft: isConversationDraft === 'true'
              };

              // Add message to both sender and recipient's message lists
              [senderProfileUrl, ...recipientProfileUrls.split(';')].forEach(profileUrl => {
                if (!messagesMap.has(profileUrl)) {
                  messagesMap.set(profileUrl, []);
                }
                messagesMap.get(profileUrl)!.push(message);
              });
            }
          });
        }

        // Parse profiles and combine with pictures and messages
        const rows = profilesText.split('\n')
          .slice(1)
          .filter(row => row.trim() && row.split(',').length >= 6);

        const parsedProfiles = rows.map(row => {
          const [firstName, lastName, url, email, company, position, connectedOn] = row.split(',').map(field => field.trim());
          return {
            firstName,
            lastName,
            url,
            email,
            company,
            position,
            connectedOn,
            profilePicture: picturesMap.get(url) || undefined,
            messages: messagesMap.get(url) || []
          };
        });
        
        setProfiles(parsedProfiles);
      } catch (error) {
        console.error('Error loading profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfiles();
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    const distance = touchStart - currentTouch;
    
    if (cardRef.current) {
      const translateX = -distance;
      cardRef.current.style.transform = `translateX(${translateX}px)`;
      cardRef.current.style.transition = 'none';
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const endTouch = e.changedTouches[0].clientX;
    const distance = touchStart - endTouch;

    if (Math.abs(distance) >= minSwipeDistance) {
      if (distance > 0) {
        handleSwipe('left');
      } else {
        handleSwipe('right');
      }
    } else {
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0)';
        cardRef.current.style.transition = 'transform 0.3s ease';
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const saveDecision = (decision: Decision) => {
    const currentProfile = profiles[currentIndex];
    const newDecision: ProfileDecision = {
      profileUrl: currentProfile.url,
      decision,
      timestamp: Date.now()
    };

    const updatedDecisions = [...decisions.filter(d => d.profileUrl !== currentProfile.url), newDecision];
    setDecisions(updatedDecisions);
    localStorage.setItem('profileDecisions', JSON.stringify(updatedDecisions));
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    setSwipeDirection(direction);
    const decision = direction === 'left' ? 'remove' : 'keep';
    saveDecision(decision);
    
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, profiles.length - 1));
      setSwipeDirection(null);
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0)';
        cardRef.current.style.transition = 'transform 0.3s ease';
      }
    }, 300);
  };

  const getDecisionForProfile = (profileUrl: string) => {
    return decisions.find(d => d.profileUrl === profileUrl)?.decision;
  };

  const getDecisionStats = () => {
    const keep = decisions.filter(d => d.decision === 'keep').length;
    const remove = decisions.filter(d => d.decision === 'remove').length;
    const pending = profiles.length - keep - remove;
    return { keep, remove, pending };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">No profiles found</div>
      </div>
    );
  }

  const stats = getDecisionStats();
  const currentDecision = getDecisionForProfile(profiles[currentIndex].url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">TidyLi</h1>
          <div className="flex gap-4">
            <div className="flex items-center gap-1 text-green-600">
              <UserCheck className="w-4 h-4" />
              <span className="text-sm font-semibold">{stats.keep}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-semibold">{stats.remove}</span>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <div
            ref={cardRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <ProfileCard 
              profile={profiles[currentIndex]}
              swipeDirection={swipeDirection}
              decision={currentDecision}
            />
          </div>

          <div className="mt-4 flex items-center justify-between px-2">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className="text-gray-500 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-4">
              <button
                onClick={() => handleSwipe('left')}
                className="p-2 bg-white rounded-full shadow hover:bg-red-50 transition-colors"
              >
                <X className="w-6 h-6 text-red-500" />
              </button>
              <button
                onClick={() => handleSwipe('right')}
                className="p-2 bg-white rounded-full shadow hover:bg-green-50 transition-colors"
              >
                <Check className="w-6 h-6 text-green-500" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {currentIndex + 1}/{profiles.length}
              </span>
              <button
                onClick={() => setCurrentIndex(prev => Math.min(prev + 1, profiles.length - 1))}
                disabled={currentIndex === profiles.length - 1}
                className="text-gray-500 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;