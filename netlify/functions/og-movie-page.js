// const fetch = require('node-fetch');

// exports.handler = async (event) => {
//   const movieId = event.queryStringParameters.id;

//   if (!movieId) {
//     return {
//       statusCode: 400,
//       body: "Missing movie ID",
//     };
//   }

//   const API_KEY = process.env.REACT_APP_SHOWTIMES_API_KEY;
//   const API_BASE = process.env.REACT_APP_API_BASE;

//   try {
//     console.log(`${API_BASE}/movies/${movieId}?fields=id,title,synopsis,trailers,release_dates,trailers.trailer_files`)
//     const res = await fetch(`${API_BASE}/movies/${movieId}?fields=id,title,synopsis,trailers,release_dates,trailers.trailer_files`, {
//           headers: { 'X-API-Key': API_KEY }
//         })

//     const data = await res.json();

//     const movie = data.movie || {};
//     const title = movie.title || "Film Revival NYC";
//     const description = movie.synopsis || "See showtimes and trailers for this film in NYC.";
//     const trailer = (movie.trailers?.[0]?.trailer_files?.[0]?.url) || '';
//     const thumbnail = movie.poster || 'https://your-site.netlify.app/default-thumbnail.png';

//     const html = `
//       <!DOCTYPE html>
//       <html lang="en">
//         <head>
//           <meta charset="utf-8" />
//           <meta property="og:title" content="${title}" />
//           <meta property="og:description" content="${description}" />
//           <meta property="og:image" content="${thumbnail}" />
//           ${trailer ? `<meta property="og:video" content="${trailer}" />` : ''}
//           <meta name="twitter:card" content="${trailer ? 'player' : 'summary_large_image'}" />
//           <meta name="twitter:title" content="${title}" />
//           <meta name="twitter:description" content="${description}" />
//           <meta name="twitter:image" content="${thumbnail}" />
//           ${trailer ? `<meta name="twitter:player" content="${trailer}" />` : ''}
//           <title>${title}</title>
//         </head>
//         <body>
//           <h1>${title}</h1>
//           <p>${description}</p>
//           <script>
//             window.location.href = "/movie/${movieId}";
//           </script>
//         </body>
//       </html>
//     `;

//     return {
//       statusCode: 200,
//       headers: {
//         'Content-Type': 'text/html',
//       },
//       body: html,
//     };
//   } catch (err) {
//     return {
//       statusCode: 500,
//       body: "Failed to fetch movie data." + Object.keys(err).map(key => String(key + err[key])).join('; '),
//     };
//   }
// };
const fetch = require('node-fetch');

  const API_KEY = process.env.REACT_APP_SHOWTIMES_API_KEY;
  const API_BASE = process.env.REACT_APP_API_BASE;

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

    const title = movie.title;
    console.log({title})
    const description = movie.synopsis || "See showtimes and details for this film in NYC.";
    const trailer = movie.trailers?.[0]?.trailer_files?.[0]?.url || '';
    const image = movie.poster;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        ${trailer ? `<meta property="og:video" content="${trailer}" />` : ''}
        <meta property="og:type" content="video.other" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />
      </head>
      <body>
        <h1>${title}</h1>
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