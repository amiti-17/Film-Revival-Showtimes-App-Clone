import { useState, useEffect, useRef } from 'react';
import { THEATERS } from 'constants';
import { formatMovieTitle } from 'utils/titleFormatting';
import { THEATER_LOCATIONS } from 'constants';
import { CACHE_DURATION } from 'constants';
import { BATCH_SIZE } from 'constants';
import { LOCATIONS } from 'constants';

const API_KEY = process.env.REACT_APP_SHOWTIMES_API_KEY;
const API_BASE = process.env.REACT_APP_API_BASE;

// Update the MovieLink component to use a simpler approach
const MovieLink = ({ movieId, state, children }) => {
  return (
    <a 
      href={`/movie/${movieId}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        const win = window.open(`/movie/${movieId}`, '_blank');
        if (win) {
          win.opener.movieState = state;
        }
      }}
    >
      {children}
    </a>
  );
};

// Add this function near the top of the file with other utility functions
const createGoogleCalendarLink = ({ title, startTime, location }) => {
  const date = new Date(startTime);
  const endTime = new Date(date.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours for movie duration
  
  const formatDate = (date) => date.toISOString().replace(/-|:|\.\d+/g, '');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(date)}/${formatDate(endTime)}`,
    location: location,
    details: `Movie screening of ${title} at ${location}`
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

function CalendarView(props) {
  const {isAdminMode, setIsAdminMode, isLoading, setIsLoading} = props;
  // calendarData: { date: { movieId: { movie_id, title, showtimes: [{ start_at, theater, theaterId }] } } }
  const [calendarData, setCalendarData] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTheaters, setSelectedTheaters] = useState([]); // will hold cinema ids

  // For controlling displayed month.
  const today = new Date();
  const initialMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  // Toggle between "calendar" and "list" views.
  const [viewMode, setViewMode] = useState("calendar"); // can be "calendar", "week", or "list"

  // Add this near the top with other state declarations
  const [movieDetailsCache, setMovieDetailsCache] = useState({});

  // Add this to your existing state declarations at the top
  const [searchTerm, setSearchTerm] = useState('');

  // Add state for dropdown
  // const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  // Add near the top with other state declarations
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Add this state near the top with other state declarations
  const [showNoReleaseDateMovies, setShowNoReleaseDateMovies] = useState(false);

  // Add near the top with other state declarations
  
  const [showAdminModal, setShowAdminModal] = useState(false);
  const ADMIN_PASSWORD = 'YcVHDzYMsqhYdmhp3zPf'; // Your new password

  // Add these new state variables
  const [reviewedMovies, setReviewedMovies] = useState(() => {
    // Load previously reviewed movies from localStorage
    const saved = localStorage.getItem('filmRevivalReviewedMovies');
    return saved ? JSON.parse(saved) : {};
  });

  // Add new state for confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: null
  });

  // Add these to your state declarations
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const locationDropdownRef = useRef(null);

  // Add these to your existing state declarations

  // First, make sure we have the state for the theater dropdown
  const [isTheaterDropdownOpen, setIsTheaterDropdownOpen] = useState(false);
  const theaterDropdownRef = useRef(null);

  // Move the helper function outside of any other functions, near the top of the component
  const movieMatchesSearch = (movieTitle, search) => {
    if (!search) return true;
    if (!movieTitle) return false;
    return movieTitle.toLowerCase().includes(search.toLowerCase());
  };

  // Add this helper function near the top of the file, after the initial constants
  const getOldestReleaseDate = (releaseDates) => {
    if (!releaseDates) return null;
    return Object.values(releaseDates)
      .flat()
      .map(release => release.date)
      .sort((a, b) => new Date(a) - new Date(b))[0];
  };

  // Cache utility functions
  const getFromCache = (key) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch (err) {
      return null;
    }
  };

  const saveToCache = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('Failed to save to cache:', err);
    }
  };


  // Modified fetchShowtimesForTheater with simple debug logging
  const fetchShowtimesForTheater = async (theater, timeFrom, timeTo) => {
    // Simple debug log that should appear for all theaters
    console.log('Debug - Fetching theater:', theater.name, theater.id);
    
    try {
      const url = `${API_BASE}/showtimes?cinema_id=${theater.id}` +
        `&time_from=${encodeURIComponent(timeFrom)}` +
        `&time_to=${encodeURIComponent(timeTo)}` +
        `&fields=id,cinema_id,movie_id,start_at,booking_link,cinema_movie_title,movie`;

      // Simple MoMI check
      if (theater.id === "65959") {
        console.log('Debug - Found MoMI request');
      }

      const response = await fetch(url, {
        headers: { 
          "X-API-Key": API_KEY,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) return [];
      console.log('before', url, response);
      const data = await response.json();

      // Simple response debug
      if (theater.id === "65959") {
        console.log('Debug - MoMI response:', data);
      }

      const validShowtimes = (data.showtimes || [])
        .filter(st => st && st.start_at && st.movie_id)
        .map(st => ({
          ...st,
          theaterId: theater.id,
          theater: theater.name,
          cinema_movie_title: formatMovieTitle(st.cinema_movie_title, theater.id)
        }));

      return validShowtimes;
    } catch (err) {
      console.error("Error fetching showtimes for", theater.name, err);
      return [];
    }
  };

  // Modified fetchMovieDetailsInBatches with improved batching and caching
  const fetchMovieDetailsInBatches = async (movieIds) => {
    console.time('Movie Details Batch');
    
    // Check cache first
    const cachedMovies = {};
    const uncachedMovieIds = movieIds.filter(id => {
      const cached = getFromCache(`movie_${id}`);
      if (cached) {
        cachedMovies[id] = cached;
        return false;
      }
      return !movieDetailsCache[id];
    });

    if (uncachedMovieIds.length === 0) {
      return { ...movieDetailsCache, ...cachedMovies };
    }

    const batches = [];
    for (let i = 0; i < uncachedMovieIds.length; i += BATCH_SIZE) {
      batches.push(uncachedMovieIds.slice(i, i + BATCH_SIZE));
    }

    try {
      const results = [];
      for (const batch of batches) {
        const batchPromises = batch.map(async movieId => {
          try {
            const url = `${API_BASE}/movies/${movieId}?fields=id,title,release_dates`;
            const response = await fetch(url, {
              method: 'GET',
              headers: { 
                "X-API-Key": API_KEY,
                "Content-Type": "application/json",
              }
            });

            if (!response.ok) return [movieId, null];
            const data = await response.json();
            console.log(data)
            
            if (data.movie) {
              saveToCache(`movie_${movieId}`, data.movie);
            }
            
            return [movieId, data.movie];
          } catch (err) {
            return [movieId, null];
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const newMovieDetails = Object.fromEntries(
        results.filter(([, movie]) => movie !== null)
      );

      const combinedDetails = {
        ...movieDetailsCache,
        ...cachedMovies,
        ...newMovieDetails
      };

      setMovieDetailsCache(combinedDetails);
      console.timeEnd('Movie Details Batch');
      return combinedDetails;
    } catch (err) {
      console.error("Error fetching movie details:", err);
      return { ...movieDetailsCache, ...cachedMovies };
    }
  };

  // Add console log to useEffect
  useEffect(() => {
    console.log('CalendarView useEffect triggered');
    
    const fetchAllShowtimes = async () => {
      console.log('Starting fetchAllShowtimes');
      setIsLoading(true); // Make sure we start in loading state
      
      try {
      const now = new Date();
      const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const initialEnd = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
      
      const initialTimeFrom = firstOfCurrentMonth.toISOString();
      const initialTimeTo = initialEnd.toISOString();

        console.log('Fetching initial showtimes...');
        
        const initialShowtimes = await Promise.all(
          THEATERS.map((theater, i) => 
            !i ? fetchShowtimesForTheater(theater, initialTimeFrom, initialTimeTo)
            .catch(err => {
              console.error(`Error fetching showtimes for ${theater.name}:`, err);
              return []; // Return empty array on error for this theater
            }) : []
          )
        );

        let allShowtimes = initialShowtimes.flat();

        if (allShowtimes.length === 0) {
          console.error('No showtimes fetched from any theater');
          setIsLoading(false);
          return;
        }

        const uniqueMovieIds = [...new Set(
          allShowtimes
            .map(st => st && st.movie_id)
        )];

        const movieDetails = await fetchMovieDetailsInBatches(uniqueMovieIds)
          .catch(err => {
            console.error('Error fetching movie details:', err);
            return {};
          });

        // Process the data and update state
        const calendarMap = groupShowtimesByDate(allShowtimes, movieDetails);
        setCalendarData(calendarMap);
      } catch (error) {
        console.error('Error in fetchAllShowtimes:', error);
      } finally {
        setIsLoading(false); // Always turn off loading state
      }
    };

    fetchAllShowtimes();
  }, []); // Empty dependency array

  // Modify the groupShowtimesByDate function to filter out past showtimes
  const groupShowtimesByDate = (showtimes, movieDetails) => {
    const calendarMap = {};
    const lastYearStart = new Date(new Date().getFullYear() - 1, 0, 1);
    const now = new Date();

    showtimes.forEach(st => {
      if (!st.start_at) return;
      
      // Skip if this showtime is in the past
      if (new Date(st.start_at) < now) return;
      
      console.log(st,{})
      const date = st.start_at.split('T')[0];
      if (!calendarMap[date]) calendarMap[date] = {};
      
      const movieData = movieDetails[st.movie_id];
      const movieTitle = formatMovieTitle(st.cinema_movie_title || st.movie?.title || "(Untitled)", st.theaterId);
      
      const oldestReleaseDate = getOldestReleaseDate(movieData?.release_dates);
      if (oldestReleaseDate) {
        const releaseDate = new Date(oldestReleaseDate);
        if (releaseDate >= lastYearStart) return;
      }

      if (!calendarMap[date][st.movie_id]) {
        calendarMap[date][st.movie_id] = {
          movie_id: st.movie_id,
          title: movieTitle,
          release_dates: movieData?.release_dates || [],
          showtimes: []
        };
      }
      
      calendarMap[date][st.movie_id].showtimes.push({
        start_at: st.start_at,
        theater: st.theater,
        theaterId: st.theaterId,
        booking_link: st.booking_link
      });
    });

    // Clean up empty dates/movies and past showtimes
    Object.keys(calendarMap).forEach(date => {
      Object.keys(calendarMap[date]).forEach(movieId => {
        // Filter out past showtimes for today
        if (date === now.toISOString().split('T')[0]) {
          calendarMap[date][movieId].showtimes = calendarMap[date][movieId].showtimes
            .filter(st => new Date(st.start_at) > now);
        }
        
        // Remove movies with no remaining showtimes
        if (calendarMap[date][movieId].showtimes.length === 0) {
          delete calendarMap[date][movieId];
        }
      });
      
      // Remove dates with no movies
      if (Object.keys(calendarMap[date]).length === 0) {
        delete calendarMap[date];
      }
    });

    return calendarMap;
  };

  // Toggle a theater in selectedTheaters (using cinema id).
  const handleCheckboxChange = (cinemaId) => {
    if (selectedTheaters.includes(cinemaId)) {
      setSelectedTheaters(selectedTheaters.filter(id => id !== cinemaId));
    } else {
      setSelectedTheaters([...selectedTheaters, cinemaId]);
    }
  };

  // ===============================
  //  Month Navigation (Arrow Buttons)
  // ===============================
  const goToNextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(next);
  };

  const goToPreviousMonth = () => {
    const realCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (prev < realCurrentMonth) return;
    setCurrentMonth(prev);
  };

  // =========================
  //   Build the Calendar UI (Calendar View)
  // =========================
  const displayMonth = currentMonth;
  const year = displayMonth.getFullYear();
  const monthIndex = displayMonth.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const firstWeekday = firstDay.getDay();
  const lastWeekday = lastDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarCells = [];
  for (let i = 0; i < firstWeekday; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const moviesObj = calendarData[dateStr] || {};

    // Filter movie entries based on selected theaters AND search term
    const movieEntries = Object.values(moviesObj)
      .filter(entry => {
      const matchesTheaters = selectedTheaters.length === 0 || 
        entry.showtimes.some(st => selectedTheaters.includes(st.theaterId));
        const matchesLocations = selectedLocations.length === 0 ||
          entry.showtimes.some(st => THEATER_LOCATIONS[st.theaterId] && 
            selectedLocations.includes(THEATER_LOCATIONS[st.theaterId]));
      const matchesSearch = movieMatchesSearch(entry.title, searchTerm);
        const matchesReleaseDate = showNoReleaseDateMovies ? 
          !entry.release_dates || Object.keys(entry.release_dates).length === 0 :
          true;
        return matchesTheaters && matchesLocations && matchesSearch && matchesReleaseDate;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
    const titles = movieEntries.map(m => m.title);
    calendarCells.push({ dateStr, day, titles, movieEntries });
  }
  for (let i = 0; i < (6 - lastWeekday); i++) {
    calendarCells.push(null);
  }

  // =========================
  //   Build the List View UI
  // =========================

  const goToNextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + 7);
    setCurrentWeek(next);
  };

  const goToPreviousWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeek(prev);
  };

  const getWeekDisplay = () => {
    const weekStart = new Date(currentWeek);
    // Adjust to start from Monday instead of Sunday
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, otherwise adjust to previous Monday
    weekStart.setDate(weekStart.getDate() + diff);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Go 6 days forward to get to Sunday
    
    const formatDate = (date) => {
      return `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}`;
    };
    
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${formatDate(weekStart)} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
    } else {
      return `${formatDate(weekStart)} - ${formatDate(weekEnd)}, ${weekStart.getFullYear()}`;
    }
  };

  // Update the keyboard shortcut for Mac compatibility
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Check for Command (metaKey) + Shift + A
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault(); // Prevent default browser behavior
        setIsAdminMode(prev => {
          const newMode = !prev;
          // Save to localStorage
          localStorage.setItem('filmRevivalAdminMode', newMode.toString());
          return newMode;
        });
        setShowNoReleaseDateMovies(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Add the admin login modal component
  const AdminLoginModal = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (password === ADMIN_PASSWORD) {
        setIsAdminMode(true);
        localStorage.setItem('filmRevivalAdminMode', 'true');
        onClose();
      } else {
        setError('Incorrect password');
      }
    };

  return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h2>Admin Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={error ? 'error' : ''}
              />
              {error && <div className="error-message">{error}</div>}
            </div>
            <div className="button-group">
              <button type="submit">Login</button>
              <button type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Add this function to handle movie review decisions
  const handleMovieReview = (movieId, title, decision, note = '') => {
    const newReviewedMovies = {
      ...reviewedMovies,
      [movieId]: {
        title,
        decision,
        note,
        reviewedAt: new Date().toISOString()
      }
    };
    setReviewedMovies(newReviewedMovies);
    localStorage.setItem('filmRevivalReviewedMovies', JSON.stringify(newReviewedMovies));
  };

  // Update the renderMovieTitle function to handle years consistently
  const renderMovieTitle = (entry, dateStr) => {
    // First clean up any existing years in the title
    let cleanTitle = entry.title.replace(/\s*\(\d{4}\)/g, '').trim();
    
    // Get the release year if available
    const releaseYear = entry.release_dates ? 
      new Date(Object.values(entry.release_dates)
        .flat()
        .map(release => release.date)
        .sort((a, b) => new Date(a) - new Date(b))[0]
      ).getFullYear() : null;

    // Add the year to the clean title
    const displayTitle = releaseYear ? `${cleanTitle} (${releaseYear})` : cleanTitle;

    const needsReview = !entry.release_dates || Object.keys(entry.release_dates).length === 0;
    const reviewStatus = reviewedMovies[entry.movie_id];
    
    if (!isAdminMode && reviewStatus?.decision === 'exclude') {
      return null; // Don't show excluded movies to regular users
    }

    return (
      <li key={`${dateStr}-${entry.movie_id}`} 
          className={`movie-entry ${isAdminMode && needsReview && !reviewStatus ? 'needs-review' : ''} ${isAdminMode && reviewStatus ? `status-${reviewStatus.decision}` : ''}`}>
        <MovieLink
          movieId={entry.movie_id}
          state={{ 
            movieTitle: cleanTitle,
            // Collect all showtimes for this movie across all dates
            showtimes: Object.entries(calendarData)
              .flatMap(([dateStr, movies]) => {
                const movieData = movies[entry.movie_id];
                return movieData ? movieData.showtimes : [];
              })
              .sort((a, b) => new Date(a.start_at) - new Date(b.start_at)),
            release_dates: entry.release_dates
          }}
        >
          {displayTitle}
        </MovieLink>
        
        {isAdminMode && needsReview && (
          <div className="review-controls">
            {!reviewStatus ? (
              <>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleMovieReview(entry.movie_id, entry.title, 'include');
                  }}
                  className="review-btn include"
                >
                  ✓ Include
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    const note = prompt('Why exclude this movie?');
                    if (note !== null) {
                      handleMovieReview(entry.movie_id, entry.title, 'exclude', note);
                    }
                  }}
                  className="review-btn exclude"
                >
                  ✕ Exclude
                </button>
              </>
            ) : (
              <div className="review-status">
                Status: {reviewStatus.decision === 'exclude' ? 'Excluded' : 'Included'}
                {reviewStatus.note && <span className="review-note">Note: {reviewStatus.note}</span>}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleReset(entry.movie_id, reviewedMovies, setReviewedMovies);
                  }}
                  className="review-btn reset"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  // Add the confirmation modal component
  const ConfirmModal = ({ message, onConfirm, onCancel }) => (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <p>{message}</p>
        <div className="button-group">
          <button onClick={onConfirm}>Yes</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );

  // Replace the confirm() call with our modal
  const handleReset = (movieId, reviewedMovies, setReviewedMovies) => {
    setConfirmModal({
      isOpen: true,
      message: 'Reset review status for this movie?',
      onConfirm: () => {
        const { [movieId]: _, ...restReviews } = reviewedMovies;
        setReviewedMovies(restReviews);
        localStorage.setItem('filmRevivalReviewedMovies', JSON.stringify(restReviews));
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  // Add this effect for the location filter
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setIsLocationDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // Add the useEffect for handling clicks outside the theater dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (theaterDropdownRef.current && !theaterDropdownRef.current.contains(event.target)) {
        setIsTheaterDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add a function to check if there are any movies in the current view
  const hasMoviesInView = () => {
    if (viewMode === "calendar") {
      return calendarCells.some(cell => cell && cell.movieEntries && cell.movieEntries.length > 0);
    } else if (viewMode === "week") {
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentWeek);
        date.setDate(date.getDate() - date.getDay() + i);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      });
      return weekDates.some(dateStr => {
        const moviesForDate = calendarData[dateStr] || {};
        return Object.values(moviesForDate).length > 0;
      });
    }
    return true;
  };

  // Add these state variables at the top with other state declarations
  const [isCustomDateMode, setIsCustomDateMode] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());

  // Add these functions near the other toggle functions
  const toggleTheaterFilter = () => {
    setIsTheaterDropdownOpen(!isTheaterDropdownOpen);
    setIsLocationDropdownOpen(false); // Close other dropdown
  };

  const toggleLocationFilter = () => {
    setIsLocationDropdownOpen(!isLocationDropdownOpen);
    setIsTheaterDropdownOpen(false); // Close other dropdown
  };

  return (
    <>
      {/* Header: Grid with 3 columns (left: view toggle, middle: month nav, right: filter) */}
      <div className="calendar-header">
        <div className="left-controls">
          <div className="whats-playing-filter">
            <button 
              className="filter-button" 
              onClick={() => setViewMode("list")}
            >
              What's Playing
            </button>
          </div>
          <div className="view-selector">
          <button 
            className="toggle-button"
            onClick={() => setViewMode(viewMode === "calendar" ? "week" : "calendar")}
          >
            {viewMode === "calendar" ? "Switch to Week View" : "Switch to Month View"}
          </button>
          </div>
        </div>

        <div className="middle-controls">
          {viewMode !== "list" ? (
            <>
          <button 
            className="nav-button" 
                onClick={viewMode === "week" ? goToPreviousWeek : goToPreviousMonth}
                disabled={viewMode === "week" ? 
                  currentWeek <= today : 
                  currentMonth.getTime() === new Date(today.getFullYear(), today.getMonth(), 1).getTime()}
          >
            &#8592;
          </button>
              <h1>
                {viewMode === "week" ? 
                  getWeekDisplay() : 
                  `${firstDay.toLocaleString('default', { month: 'long' })} ${year}`}
              </h1>
              <button 
                className="nav-button" 
                onClick={viewMode === "week" ? goToNextWeek : goToNextMonth}
              >
            &#8594;
          </button>
            </>
          ) : (
            <h1 style={{ color: isCustomDateMode ? '#666' : 'inherit' }}>
              {isCustomDateMode ? (
                customStartDate.toLocaleDateString('en-US', { 
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                }) === customEndDate.toLocaleDateString('en-US', { 
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                }) ? 
                  customStartDate.toLocaleDateString('en-US', { 
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  }) :
                  `${customStartDate.toLocaleDateString('en-US', { 
                    month: 'long',
                    day: 'numeric'
                  })} - ${customEndDate.toLocaleDateString('en-US', { 
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}`
              ) : (
                `${firstDay.toLocaleString('default', { month: 'long' })} ${year}`
              )}
            </h1>
          )}
        </div>

        <div className="right-controls">
          <input
            type="text"
            placeholder="Search movies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="theater-filter" ref={theaterDropdownRef}>
            <button className="filter-button" onClick={toggleTheaterFilter}>
              Filter by Theater
            </button>
            {isTheaterDropdownOpen && (
              <div className="filter-dropdown">
                {THEATERS.map(theater => (
                    <label key={theater.id} className="dropdown-item">
                      <input
                        type="checkbox"
                      checked={selectedTheaters.includes(theater.id)}
                        onChange={() => handleCheckboxChange(theater.id)}
                      />
                      {theater.name}
                    </label>
                ))}
              </div>
            )}
          </div>
          <div className="location-filter" ref={locationDropdownRef}>
            <button className="filter-button" onClick={toggleLocationFilter}>
              Filter by Location
            </button>
            {isLocationDropdownOpen && (
              <div className="filter-dropdown">
                {LOCATIONS.map(location => (
                  <label key={location} className="dropdown-item">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(location)}
                      onChange={() => {
                        if (selectedLocations.includes(location)) {
                          setSelectedLocations(selectedLocations.filter(l => l !== location));
                        } else {
                          setSelectedLocations([...selectedLocations, location]);
                        }
                      }}
                    />
                    {location}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <>
          <div className="calendar-grid">
            {/* Header cells */}
            <div className="header-cell">Sun</div>
            <div className="header-cell">Mon</div>
            <div className="header-cell">Tue</div>
            <div className="header-cell">Wed</div>
            <div className="header-cell">Thu</div>
            <div className="header-cell">Fri</div>
            <div className="header-cell">Sat</div>
            
            {/* Calendar cells */}
            {calendarCells.map((cell, idx) => {
              if (cell === null) {
                return <div className="day-cell empty" key={`empty-${idx}`}></div>;
              }
              const { dateStr, day, movieEntries } = cell;
              return (
                <div className="day-cell" key={dateStr}>
                  <div className="date-number">{day}</div>
                  <div className="titles-container">
                    <ul className="titles-list">
                      {movieEntries.map((entry, i) => (
                        renderMovieTitle(entry, dateStr)
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : viewMode === "week" ? (
        <div className="weekly-view">
          <div className="weekly-grid">
            {/* Header row with day names and dates */}
            <div className="weekly-header">
              <div className="header-cell">Sun</div>
              <div className="header-cell">Mon</div>
              <div className="header-cell">Tue</div>
              <div className="header-cell">Wed</div>
              <div className="header-cell">Thu</div>
              <div className="header-cell">Fri</div>
              <div className="header-cell">Sat</div>
            </div>
            
            {/* Content columns */}
            <div className="weekly-content">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                // Calculate the date for this column
                const date = new Date(currentWeek);
                date.setDate(date.getDate() - date.getDay() + index); // Remove the +1 since we're starting with Sunday
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                
                // Get movies for this date (reusing list view logic)
                const moviesObj = calendarData[dateStr] || {};
                const movieEntries = Object.values(moviesObj)
                  .filter(entry => {
              const matchesTheaters = selectedTheaters.length === 0 || 
                entry.showtimes.some(st => selectedTheaters.includes(st.theaterId));
                    const matchesLocations = selectedLocations.length === 0 ||
                      entry.showtimes.some(st => THEATER_LOCATIONS[st.theaterId] && 
                        selectedLocations.includes(THEATER_LOCATIONS[st.theaterId]));
              const matchesSearch = movieMatchesSearch(entry.title, searchTerm);
                    const matchesReleaseDate = showNoReleaseDateMovies ? 
                      !entry.release_dates || Object.keys(entry.release_dates).length === 0 :
                      true;
                    return matchesTheaters && matchesLocations && matchesSearch && matchesReleaseDate;
                  })
                  .sort((a, b) => a.title.localeCompare(b.title));

            return (
                  <div key={day} className="day-column">
                    <div className="day-content">
                      <ul className="day-movies">
                  {movieEntries.map((entry, i) => (
                          renderMovieTitle(entry, dateStr)
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="list-view">
          <div className="date-selector" style={{ 
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '10px',
            paddingLeft: '20px'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: '10px'
            }}>
              <button 
                className="custom-date-button"
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  setCustomStartDate(today);
                  setCustomEndDate(today);
                  setIsCustomDateMode(true);
                }}
                style={{
                  background: 'none',
                  border: '1px solid #ccc',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
            </div>
            
            <div className="custom-date-inputs" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              height: '30px'
            }}>
              <input
                type="date"
                value={customStartDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setCustomStartDate(date);
                }}
                style={{
                  height: '100%',
                  padding: '0 5px',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ 
                lineHeight: '30px'
              }}>
                to
              </span>
              <input
                type="date"
                value={customEndDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setCustomEndDate(date);
                }}
                style={{
                  height: '100%',
                  padding: '0 5px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          <div className="movies-list">
            {(() => {
              // Use either custom dates or current month range
              const firstDay = isCustomDateMode ? customStartDate : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
              const lastDay = isCustomDateMode ? customEndDate : new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

              const showDetails = isCustomDateMode && 
                customStartDate.toISOString().split('T')[0] === customEndDate.toISOString().split('T')[0];
              
              return Object.entries(calendarData)
                .filter(([dateStr]) => {
                  const dateToCompare = dateStr.split('T')[0];
                  const startDate = firstDay.toISOString().split('T')[0];
                  const endDate = lastDay.toISOString().split('T')[0];
                  return dateToCompare >= startDate && dateToCompare <= endDate;
                })
                .flatMap(([dateStr, movies]) => Object.values(movies))
                .filter((movie, index, self) => 
                  index === self.findIndex(m => m.movie_id === movie.movie_id)
                )
                .filter(movie => {
                  const hasShowtimesInSelectedTheaters = selectedTheaters.length === 0 || 
                    movie.showtimes.some(st => selectedTheaters.includes(st.theaterId));
                  
                  const hasShowtimesInSelectedLocations = selectedLocations.length === 0 ||
                    movie.showtimes.some(st => THEATER_LOCATIONS[st.theaterId] && 
                      selectedLocations.includes(THEATER_LOCATIONS[st.theaterId]));
                  
                  const matchesSearch = movieMatchesSearch(movie.title, searchTerm);
                  
                  const matchesReleaseDate = showNoReleaseDateMovies ? 
                    !movie.release_dates || Object.keys(movie.release_dates).length === 0 :
                    true;
                  
                  return hasShowtimesInSelectedTheaters && 
                          hasShowtimesInSelectedLocations && 
                          matchesSearch && 
                          matchesReleaseDate;
                })
                .sort((a, b) => a.title.localeCompare(b.title))
                .map(movie => {
                  const releaseYear = movie.release_dates ? 
                    new Date(Object.values(movie.release_dates)
                      .flat()
                      .map(release => release.date)
                      .sort((a, b) => new Date(a) - new Date(b))[0]
                    ).getFullYear() : null;

                  let cleanTitle = movie.title.replace(/\s*\(\d{4}\)/g, '').trim();

                  return (
                    <div key={movie.movie_id} className="movie-list-item" style={{
                      marginBottom: showDetails ? '20px' : '10px'
                    }}>
                      <div>
                        <MovieLink
                          movieId={movie.movie_id}
                        state={{ 
                            movieTitle: cleanTitle,
                            // Collect all showtimes for this movie across all dates
                            showtimes: Object.entries(calendarData)
                              .flatMap(([dateStr, movies]) => {
                                const movieData = movies[movie.movie_id];
                                return movieData ? movieData.showtimes : [];
                              })
                              .sort((a, b) => new Date(a.start_at) - new Date(b.start_at)),
                            release_dates: movie.release_dates
                          }}
                        >
                          {cleanTitle}{releaseYear ? ` (${releaseYear})` : ''}
                        </MovieLink>
                      </div>
                      {showDetails && (
                        <div className="showtime-details" style={{
                          marginLeft: '20px',
                          marginTop: '5px',
                          fontSize: '0.9em',
                          color: '#666'
                        }}>
                          {movie.showtimes
                            .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
                            .map((showtime, index) => {
                              const theater = THEATERS.find(t => t.id === showtime.theaterId);
                              const time = new Date(showtime.start_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              });
                              return (
                                <div key={index} style={{ marginBottom: '5px' }}>
                                  <span>{theater ? theater.name : 'Unknown Theater'} - {time}</span>
                                  <div style={{ display: 'inline-block', marginLeft: '10px' }}>
                                    {showtime.booking_link && (
                                      <a 
                                        href={showtime.booking_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          marginRight: '10px',
                                          color: '#fff',
                                          textDecoration: 'none',
                                          background: '#28a745',  // Green background
                                          padding: '2px 8px',    
                                          borderRadius: '4px',   
                                          fontSize: '0.9em',     
                                          border: 'none',
                                          display: 'inline-block'
                                        }}
                                      >
                                        Tickets
                                      </a>
                                    )}
                                    <a 
                                      href={createGoogleCalendarLink({
                                        title: cleanTitle,
                                        startTime: showtime.start_at,
                                          location: theater ? theater.name : 'Unknown Theater'
                                        })}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: '#fff',
                                          textDecoration: 'none',
                                          background: '#007bff',  // Blue background
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontSize: '0.9em',
                                          border: 'none',
                                          display: 'inline-block'
                                        }}
                                      >
                                        Add to Calendar
                                      </a>
                                    </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
              })()}
            </div>
          </div>
        )}

        {selectedDate && viewMode === "calendar" && (
          <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>Showtimes on {selectedDate}</h2>
              <ul>
                {Object.entries(calendarData[selectedDate] || {})
                  // Apply the same filters as in the calendar view
                  .filter(([movieId, info]) => {
                    console.error('CLICK ')
                    const matchesTheaters = selectedTheaters.length === 0 || 
                      info.showtimes.some(st => selectedTheaters.includes(st.theaterId));
                    const matchesLocations = selectedLocations.length === 0 ||
                      info.showtimes.some(st => THEATER_LOCATIONS[st.theaterId] && 
                        selectedLocations.includes(THEATER_LOCATIONS[st.theaterId]));
                    const matchesSearch = movieMatchesSearch(info.title, searchTerm);
                    const matchesReleaseDate = showNoReleaseDateMovies ? 
                      !info.release_dates || Object.keys(info.release_dates).length === 0 :
                      true;
                    return matchesTheaters && matchesLocations && matchesSearch && matchesReleaseDate;
                  })
                  .map(([movieId, info], i) => (
                    renderMovieTitle(info, selectedDate)
                  ))}
              </ul>
              <button onClick={() => setSelectedDate(null)}>Close</button>
            </div>
          </div>
        )}

        {(!hasMoviesInView() && !isLoading) && (
          <div className="no-movies-overlay">
            <div className="no-movies-message">
              There's nothing to see here...
            </div>
          </div>
        )}
      <footer className="footer">
        <div>
          <span style={{ fontSize: '1rem' }}>
            Brought to you by <a href="https://aboutitfilms.com" target="_blank" rel="noopener noreferrer">About It Films</a>.
          </span>
          <br />
          <br />
          <span>Film Revival NYC is a working prototype. If you have any feature requests,</span>
          <br />
          <span>want to report a bug, or just want to say hello, please contact us at filmrevivalnyc@gmail.com!</span>
          {/* Add subtle admin button */}
          <button
            onClick={() => isAdminMode ? (
              // Logout
              setIsAdminMode(false),
              localStorage.removeItem('filmRevivalAdminMode')
            ) : (
              // Show login modal
              setShowAdminModal(true)
            )}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '12px',
              padding: '4px',
              cursor: 'pointer',
              marginLeft: '10px'
            }}
          >
            {isAdminMode ? 'Exit Admin' : '•'}
          </button>
      </div>
      </footer>

      {/* Add the modal to your JSX */}
      {showAdminModal && (
        <AdminLoginModal onClose={() => setShowAdminModal(false)} />
      )}

      {/* Add the confirmation modal to your JSX */}
      {confirmModal.isOpen && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })}
        />
      )}
    </>
  );
}

export default CalendarView;