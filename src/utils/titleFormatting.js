import { UPPERCASE_THEATER_IDS } from "../constants";

// Function to properly format movie titles
export function formatMovieTitle(title, theaterId) {
  // console.log('Formatting title:', { title, theaterId }); // Debug log
  if (!title) return "";
  
  // If it's from one of the theaters that returns all caps, convert to Title Case
  if (UPPERCASE_THEATER_IDS.includes(theaterId)) {
    return title
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // For other theaters, return the title as is
  return title;
} 