// MovieDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Helmet } from "react-helmet";

const API_KEY = process.env.REACT_APP_SHOWTIMES_API_KEY;
const API_BASE = process.env.REACT_APP_API_BASE;

// Add this helper function at the top of the file, outside the component
const createGoogleCalendarLink = (movieTitle, theater, startTime) => {
  // Create a date object from the startTime
  const eventDate = new Date(startTime);
  // Set end time to 3 hours after start (typical movie length)
  const endDate = new Date(eventDate.getTime() + (3 * 60 * 60 * 1000));
  
  // Format dates for Google Calendar URL
  const startDateTime = eventDate.toISOString().replace(/[:-]/g, '').replace('.000', 'Z');
  const endDateTime = endDate.toISOString().replace(/[:-]/g, '').replace('.000', 'Z');
  
  // Create event details
  const eventDetails = {
    action: 'TEMPLATE',
    text: `${movieTitle} at ${theater}`,
    details: `Movie showing of ${movieTitle} at ${theater}`,
    location: theater,
    dates: `${startDateTime}/${endDateTime}`
  };
  
  // Construct the URL
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const queryString = Object.entries(eventDetails)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
    
  return `${baseUrl}?${queryString}`;
};

function MovieDetail() {
  const { movieId } = useParams();
  const location = useLocation();
  
  // Try to get state from either the location or window opener
  const state = location.state || (window.opener && window.opener.movieState);
  console.log({location})
  
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);



  function updateMetaTag(property, content, attr = 'property') {
    let element = document.querySelector(`meta[${attr}="${property}"]`);

    if (element) {
      element.setAttribute("content", content);
    } else {
      element = document.createElement("meta");
      element.setAttribute(attr, property);
      element.setAttribute("content", content);
      document.head.appendChild(element);
    }
  }


  useEffect(() => {

    async function fetchMovieDetails() {
      try {
        const res = await fetch(`${API_BASE}/movies/${movieId}?fields=id,title,synopsis,trailers,release_dates,trailers.trailer_files`, {
          headers: { 'X-API-Key': API_KEY }
        })
        const data = await res.json();
        if (data.movie) {
          setMovie(data.movie);
          document.querySelector('title').innerText = data.movie.title;
          updateMetaTag("og:title", data.movie.title);
          updateMetaTag("og:description", data.movie.synopsis || "See showtimes and details for this film in NYC.");
          updateMetaTag("og:video:type", "video/mp4");
          updateMetaTag("og:video", movie.trailers && movie.trailers.length > 0 && movie.trailers[0].trailer_files && movie.trailers[0].trailer_files[0].url.replace("watch?v=", "embed/"));
        } else {
          console.error("Failed to fetch movie details");
        }
      } catch (error) {
        console.error("Failed to fetch movie details", error)
      } 
    
    }

    // Use the passed showtimes if available
    if (state?.showtimes) {
      setShowtimes(state.showtimes);
    }

    fetchMovieDetails();
  }, [movieId, state]);

  // Group showtimes by date
  const showtimesByDate = showtimes.reduce((acc, showtime) => {
    const date = new Date(showtime.start_at).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(showtime);
    return acc;
  }, {});

  if (!movie) {
    return <div>Loading movie details…</div>;
  }

  const trailerSrc = movie.trailers && movie.trailers.length > 0 && movie.trailers[0].trailer_files && movie.trailers[0].trailer_files[0].url.replace("watch?v=", "embed/");

  console.log({movie});
  return (
    <div className="movie-detail">
      {console.log('rendering Helmet for: ', movie.title)}
      
      <Helmet>
        <meta property="og:title" content={movie.title} />
        <meta property="og:description" content={movie.synopsis || "See showtimes and details for this film in NYC."} />
        {/* <meta property="og:image" content={movie.poster || "/favicon.ico"} /> */}
        <meta property="og:video:type" content="video/mp4" />
        <meta property="og:video" content={trailerSrc} />

        <meta name="twitter:card" content={'player'} />
        <meta name="twitter:title" content={movie.title} />
        <meta name="twitter:description" content={movie.synopsis || "See showtimes and details for this film in NYC."} />
        <meta name="twitter:image" content={movie?.poster || "/favicon.ico"} />
        <meta name="twitter:player" content={trailerSrc} />
      </Helmet>
      
      <h2>{movie.title}</h2>
      {movie.release_dates ? (
        <p className="release-date">
          Oldest Release Date: {new Date(
            Object.values(movie.release_dates)  // Get arrays of releases for each country
              .flat()  // Flatten into a single array of release objects
              .map(release => release.date)  // Extract just the dates
              .sort((a, b) => new Date(a) - new Date(b))[0]  // Sort and take the earliest
          ).toLocaleDateString()}
        </p>
      ) : (
        <p className="release-date">Release date not available</p>
      )}
      {movie.synopsis ? <p>{movie.synopsis}</p> : <p><em>No synopsis available.</em></p>}
      {trailerSrc && (
        <div className="trailer-container">
          <iframe 
            width="560" 
            height="315" 
            src={trailerSrc}
            title={`${movie.title} Trailer`} 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen 
          />
        </div>
      )}
      
      <h3>Upcoming Showtimes:</h3>
      {Object.entries(showtimesByDate).length > 0 ? (
        Object.entries(showtimesByDate)
          .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
          .map(([date, dateShowtimes]) => (
            <div key={date} className="date-showtimes">
              <h4>
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}, {date}
              </h4>
              <ul className="showtimes-list">
                {dateShowtimes
                  .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
                  .map(st => {
                    const time = new Date(st.start_at);
                    const timeLabel = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    const googleCalendarLink = createGoogleCalendarLink(movie.title, st.theater, st.start_at);
                    
                    return (
                      <li key={st.start_at + st.theater}>
                        <strong>{timeLabel}</strong> – {st.theater} –{" "}
                        <span className="action-buttons">
                          {st.booking_link ? (
                            <a 
                              href={st.booking_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="action-button booking-link"
                            >
                              Tickets
                            </a>
                          ) : st.theater === "Museum of the Moving Image" ? (
                            <a
                              href="https://movingimage.us/visit/tickets/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="action-button booking-link"
                            >
                              Buy at MoMI
                            </a>
                          ) : (
                            <em>No booking link</em>
                          )}
                          <a 
                            href={googleCalendarLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-button calendar-link"
                          >
                            Add to Calendar
                          </a>
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))
      ) : (
        <p><em>No upcoming showtimes available.</em></p>
      )}
    </div>
  );
}

export default MovieDetail;