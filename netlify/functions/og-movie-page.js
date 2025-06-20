const fetch = require('node-fetch');

const API_KEY = process.env.REACT_APP_SHOWTIMES_API_KEY;
const API_BASE = process.env.REACT_APP_API_BASE;

function getEmbedUrl(movie) {
  const trailer = movie.trailers?.[0]?.trailer_files?.[0]?.url;
  if (!trailer) return null;

  const videoId = trailer.split("v=")[1]?.split("&")[0];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function getYouTubeThumbnail(movie) {
  const trailer = movie.trailers?.[0]?.trailer_files?.[0]?.url;
  if (!trailer) return "/fallback-poster.jpg"; // your default image

  const videoId = trailer.split("v=")[1]?.split("&")[0];
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "/fallback-poster.jpg";
}

exports.handler = async (event) => {
  const movieId = event.queryStringParameters.id;

  if (!movieId) {
    return {
      statusCode: 400,
      body: 'Missing movie ID',
    };
  }

  try {
    console.log(`${API_BASE}/movies/${movieId}?fields=id,title,synopsis,trailers,trailers.trailer_files`)
    const response = await fetch(`${API_BASE}/movies/${movieId}?fields=id,title,synopsis,trailers,trailers.trailer_files`, {
      headers: { 'X-API-Key': API_KEY }
    });

    const { movie } = await response.json();

    if (!movie) {
      return { statusCode: 404, body: 'Movie not found' };
    }

    const description = movie.synopsis || "See showtimes and details for this film in NYC.";

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">

        <meta property="og:title" content=${movie.title} />
        <meta property="og:description" content=${description} />
        <meta property="og:type" content="video.other" />
        <meta property="og:video" content=${getEmbedUrl(movie)} />
        <meta property="og:video:type" content="text/html" />
        <meta property="og:video:width" content="560" />
        <meta property="og:video:height" content="315" />
        <meta property="og:image" content=${getYouTubeThumbnail(movie)} />

        <meta name="twitter:card" content="player" />
        <meta name="twitter:title" content=${movie.title} />
        <meta name="twitter:description" content=${description} />
        <meta name="twitter:image" content=${getYouTubeThumbnail(movie)} />
        <meta name="twitter:player" content=${getEmbedUrl(movie)} />
        <meta name="twitter:player:width" content="560" />
        <meta name="twitter:player:height" content="315" />
      </head>
      <body>
        <h1>${movie.title}</h1>
        <p>${description}</p>
        <script>
          window.location = "/movie/${movieId}";
        </script>
      </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html"
      },
      body: html
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: "Server Error",
    };
  }
};