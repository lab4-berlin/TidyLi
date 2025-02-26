import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Trash2, UserCheck, HelpCircle, Filter, Linkedin, Download } from 'lucide-react';
import ProfileCard from './components/ProfileCard';
import { Profile, ProfileDecision, Decision, Message } from './types';

type FilterType = 'all' | 'keep' | 'remove' | 'pending';

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<ProfileDecision[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending');
  const cardRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  // Define getDecisionForProfile before it's used
  const getDecisionForProfile = (profileUrl: string): Decision => {
    const decision = decisions.find(d => d.profileUrl === profileUrl)?.decision;
    return decision === undefined ? 'pending' : decision;
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
          fetch('/data/pictures.csv').catch(() => new Response('')),
          fetch('/data/messages.csv')
        ]);

        const [profilesText, picturesText, messagesText] = await Promise.all([
          profilesResponse.text(),
          picturesResponse.text(),
          messagesResponse.text()
        ]);

        // Parse pictures
        const picturesMap = new Map();
        if (picturesText.trim()) {
          picturesText.split('\n').slice(1).forEach(row => {
            if (row.trim()) {
              const [profileUrl, pictureUrl] = row.split(',');
              picturesMap.set(profileUrl.trim(), pictureUrl.trim());
            }
          });
        }

        // Parse messages with new format
        // CONVERSATION ID,CONVERSATION TITLE,FROM,SENDER PROFILE URL,TO,RECIPIENT PROFILE URLS,DATE,SUBJECT,CONTENT,FOLDER,IS MESSAGE DRAFT,IS CONVERSATION DRAFT
        const messagesMap = new Map<string, Message[]>();
        
        if (messagesText.trim()) {
          const lines = messagesText.split('\n').slice(1);
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            // Split by comma but respect quoted values
            const parts: string[] = [];
            let currentPart = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                inQuotes = !inQuotes;
                currentPart += char;
              } else if (char === ',' && !inQuotes) {
                parts.push(currentPart.trim());
                currentPart = '';
              } else {
                currentPart += char;
              }
            }
            
            // Add the last part
            if (currentPart) {
              parts.push(currentPart.trim());
            }
            
            if (parts.length < 9) continue; // Skip invalid lines
            
            const conversationId = parts[0];
            const conversationTitle = parts[1];
            const from = parts[2];
            const senderProfileUrl = parts[3].replace(/^"|"$/g, ''); // Remove quotes if present
            const to = parts[4];
            const recipientProfileUrls = parts[5].replace(/^"|"$/g, ''); // Remove quotes if present
            const date = parts[6];
            const subject = parts[7];
            const content = parts[8].replace(/^"|"$/g, ''); // Remove quotes if present
            
            // Add message to sender's profile
            if (senderProfileUrl) {
              if (!messagesMap.has(senderProfileUrl)) {
                messagesMap.set(senderProfileUrl, []);
              }
              
              messagesMap.get(senderProfileUrl)!.push({
                text: content,
                date,
                isOutgoing: true
              });
            }
            
            // Add message to recipient's profile
            if (recipientProfileUrls) {
              // Handle multiple recipients (comma-separated URLs)
              const recipients = recipientProfileUrls.split(';');
              
              for (const recipientUrl of recipients) {
                const trimmedUrl = recipientUrl.trim();
                if (!trimmedUrl) continue;
                
                if (!messagesMap.has(trimmedUrl)) {
                  messagesMap.set(trimmedUrl, []);
                }
                
                messagesMap.get(trimmedUrl)!.push({
                  text: content,
                  date,
                  isOutgoing: false
                });
              }
            }
          }
        }

        // Parse profiles and combine with pictures and messages
        const rows = profilesText.split('\n')
          .slice(1)
          .filter(row => row.trim() && row.split(',').length >= 6);

        const parsedProfiles = rows.map(row => {
          const [firstName, lastName, url, email, company, position, connectedOn] = row.split(',').map(field => field.trim());
          
          // Sort messages by date (newest first)
          const profileMessages = messagesMap.get(url) || [];
          profileMessages.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime();
          });
          
          return {
            firstName,
            lastName,
            url,
            email,
            company,
            position,
            connectedOn,
            profilePicture: picturesMap.get(url) || undefined,
            messages: profileMessages
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

  // Filter profiles based on active filter
  const filteredProfiles = profiles.filter(profile => {
    const decision = getDecisionForProfile(profile.url);
    
    if (activeFilter === 'all') return true;
    if (activeFilter === 'keep') return decision === 'keep';
    if (activeFilter === 'remove') return decision === 'remove';
    if (activeFilter === 'pending') return decision === 'pending' || decision === undefined;
    
    return true;
  });

  // Reset current index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeFilter]);

  // Update current index when filtered profiles change
  useEffect(() => {
    // If current index is out of bounds, adjust it
    if (filteredProfiles.length > 0 && currentIndex >= filteredProfiles.length) {
      setCurrentIndex(filteredProfiles.length - 1);
    }
  }, [filteredProfiles, currentIndex]);

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
    if (filteredProfiles.length === 0 || currentIndex >= filteredProfiles.length) {
      return;
    }
    
    const currentProfile = filteredProfiles[currentIndex];
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
    if (filteredProfiles.length === 0) {
      return;
    }
    
    setSwipeDirection(direction);
    
    // Determine the new decision based on current filter and swipe direction
    let decision: Decision;
    
    if (activeFilter === 'all' || activeFilter === 'pending') {
      // In all or pending view, left = remove, right = keep
      decision = direction === 'left' ? 'remove' : 'keep';
    } else if (activeFilter === 'keep') {
      // In keep view, left swipe moves to pending
      decision = direction === 'left' ? 'pending' : 'keep';
    } else if (activeFilter === 'remove') {
      // In remove view, right swipe moves to pending
      decision = direction === 'right' ? 'pending' : 'remove';
    }
    
    saveDecision(decision);
    
    // Get the updated filtered profiles after the decision change
    const updatedFilteredProfiles = profiles.filter(profile => {
      const profileDecision = [...decisions.filter(d => d.profileUrl !== filteredProfiles[currentIndex].url), {
        profileUrl: filteredProfiles[currentIndex].url,
        decision,
        timestamp: Date.now()
      }].find(d => d.profileUrl === profile.url)?.decision;
      
      if (activeFilter === 'all') return true;
      if (activeFilter === 'keep') return profileDecision === 'keep';
      if (activeFilter === 'remove') return profileDecision === 'remove';
      if (activeFilter === 'pending') return profileDecision === 'pending' || profileDecision === undefined;
      
      return true;
    });
    
    setTimeout(() => {
      // If this was the last profile in the filtered list
      if (currentIndex === filteredProfiles.length - 1) {
        // If there are still profiles in the updated filtered list, stay at the last one
        if (updatedFilteredProfiles.length > 0) {
          setCurrentIndex(updatedFilteredProfiles.length - 1);
        }
      } else if (updatedFilteredProfiles.length > 0) {
        // If not the last profile, just stay at the current index
        // The filtered list will update and show the next profile
      }
      
      setSwipeDirection(null);
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0)';
        cardRef.current.style.transition = 'transform 0.3s ease';
      }
    }, 300);
  };

  const getDecisionStats = () => {
    const keep = decisions.filter(d => d.decision === 'keep').length;
    const remove = decisions.filter(d => d.decision === 'remove').length;
    const pending = profiles.length - keep - remove;
    return { keep, remove, pending };
  };

  // Export profiles based on current filter
  const exportProfiles = () => {
    let profilesForExport: Profile[] = [];
    let fileName = '';
    
    // Get profiles based on current filter
    if (activeFilter === 'remove') {
      profilesForExport = profiles.filter(profile => 
        getDecisionForProfile(profile.url) === 'remove'
      );
      fileName = 'linkedin_profiles_to_remove.txt';
    } else if (activeFilter === 'keep') {
      profilesForExport = profiles.filter(profile => 
        getDecisionForProfile(profile.url) === 'keep'
      );
      fileName = 'linkedin_profiles_to_keep.txt';
    } else if (activeFilter === 'pending') {
      profilesForExport = profiles.filter(profile => 
        getDecisionForProfile(profile.url) === 'pending'
      );
      fileName = 'linkedin_profiles_pending.txt';
    }
    
    if (profilesForExport.length === 0) {
      alert(`No profiles in the "${activeFilter}" category`);
      return;
    }
    
    // Create text content with only URLs, one per line
    let textContent = '';
    profilesForExport.forEach(profile => {
      textContent += `${profile.url}\n`;
    });
    
    // Create a blob and download link
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Check if left/right actions are available based on current filter
  const isLeftActionAvailable = () => {
    // In "keep" view, left action is always available (moves to pending)
    if (activeFilter === 'keep') return true;
    
    // In "remove" view, left action is not available (can't move further left)
    if (activeFilter === 'remove') return false;
    
    // In other views, left action is available (moves to remove)
    return true;
  };

  const isRightActionAvailable = () => {
    // In "remove" view, right action is always available (moves to pending)
    if (activeFilter === 'remove') return true;
    
    // In "keep" view, right action is not available (can't move further right)
    if (activeFilter === 'keep') return false;
    
    // In other views, right action is available (moves to keep)
    return true;
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
  const currentDecision = filteredProfiles.length > 0 && currentIndex < filteredProfiles.length
    ? getDecisionForProfile(filteredProfiles[currentIndex].url) 
    : undefined;

  // Get the appropriate label for the current filter
  const getFilterLabel = () => {
    switch (activeFilter) {
      case 'keep': return 'To Keep';
      case 'remove': return 'To Delete';
      case 'pending': return 'Pending';
      default: return 'All Profiles';
    }
  };

  // Get export button label based on current filter
  const getExportLabel = () => {
    switch (activeFilter) {
      case 'keep': return 'Export Keep List';
      case 'remove': return 'Export Remove List';
      case 'pending': return 'Export Pending List';
      default: return 'Export';
    }
  };

  // Check if export button should be shown
  const shouldShowExport = () => {
    if (activeFilter === 'keep' && stats.keep > 0) return true;
    if (activeFilter === 'remove' && stats.remove > 0) return true;
    if (activeFilter === 'pending' && stats.pending > 0) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800">TidyLi</h1>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {getFilterLabel()}
            </span>
          </div>
          
          {shouldShowExport() && (
            <button
              onClick={exportProfiles}
              className="flex items-center gap-1 bg-white text-blue-600 px-2 py-1 rounded-lg shadow hover:bg-blue-50 transition-colors"
              title={getExportLabel()}
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-medium">Export</span>
            </button>
          )}
          
          {filteredProfiles.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
                disabled={currentIndex === 0}
                className="p-1.5 rounded-full text-gray-500 hover:bg-white hover:shadow disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs text-gray-500 min-w-[40px] text-center">
                {currentIndex + 1}/{filteredProfiles.length}
              </span>
              
              <button
                onClick={() => setCurrentIndex(prev => Math.min(prev + 1, filteredProfiles.length - 1))}
                disabled={currentIndex === filteredProfiles.length - 1}
                className="p-1.5 rounded-full text-gray-500 hover:bg-white hover:shadow disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        {/* Filter Menu */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => setActiveFilter('remove')}
            className={`py-3 px-2 rounded-lg flex flex-col items-center ${
              activeFilter === 'remove' 
                ? 'bg-red-100 text-red-600 border-2 border-red-300' 
                : 'bg-white text-gray-600 shadow'
            }`}
          >
            <Trash2 className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">To Delete</span>
            <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeFilter === 'remove' ? 'bg-red-200 text-red-700' : 'bg-red-50 text-red-500'
            }`}>
              {stats.remove}
            </div>
          </button>
          
          <button
            onClick={() => setActiveFilter('pending')}
            className={`py-3 px-2 rounded-lg flex flex-col items-center ${
              activeFilter === 'pending' 
                ? 'bg-gray-100 text-gray-800 border-2 border-gray-300' 
                : 'bg-white text-gray-600 shadow'
            }`}
          >
            <HelpCircle className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Pending</span>
            <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeFilter === 'pending' ? 'bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-500'
            }`}>
              {stats.pending}
            </div>
          </button>
          
          <button
            onClick={() => setActiveFilter('keep')}
            className={`py-3 px-2 rounded-lg flex flex-col items-center ${
              activeFilter === 'keep' 
                ? 'bg-green-100 text-green-600 border-2 border-green-300' 
                : 'bg-white text-gray-600 shadow'
            }`}
          >
            <UserCheck className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">To Keep</span>
            <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeFilter === 'keep' ? 'bg-green-200 text-green-700' : 'bg-green-50 text-green-500'
            }`}>
              {stats.keep}
            </div>
          </button>
        </div>
        
        <div className="relative mb-4">
          {filteredProfiles.length > 0 ? (
            <div
              ref={cardRef}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <ProfileCard 
                profile={filteredProfiles[currentIndex]}
                swipeDirection={swipeDirection}
                decision={currentDecision}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
              <Filter className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center">
                No profiles found in this category.
              </p>
              {activeFilter !== 'all' && (
                <button 
                  onClick={() => setActiveFilter('all')}
                  className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  View all profiles
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        {filteredProfiles.length > 0 && (
          <div className="flex items-center justify-center gap-6 bg-white rounded-lg shadow p-2">
            <button
              onClick={() => handleSwipe('left')}
              disabled={!isLeftActionAvailable()}
              className={`p-2 rounded-full transition-colors ${
                !isLeftActionAvailable()
                  ? 'text-gray-300 cursor-not-allowed'
                  : activeFilter === 'keep'
                    ? 'hover:bg-gray-100 text-gray-500'
                    : 'hover:bg-red-50 text-red-500'
              }`}
              title={
                !isLeftActionAvailable()
                  ? 'Not available in this view'
                  : activeFilter === 'keep'
                    ? 'Mark as pending'
                    : 'Remove'
              }
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <button
              onClick={() => handleSwipe('right')}
              disabled={!isRightActionAvailable()}
              className={`p-2 rounded-full transition-colors ${
                !isRightActionAvailable()
                  ? 'text-gray-300 cursor-not-allowed'
                  : activeFilter === 'remove'
                    ? 'hover:bg-gray-100 text-gray-500'
                    : 'hover:bg-green-50 text-green-500'
              }`}
              title={
                !isRightActionAvailable()
                  ? 'Not available in this view'
                  : activeFilter === 'remove'
                    ? 'Mark as pending'
                    : 'Keep'
              }
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;