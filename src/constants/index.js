export const THEATERS = [
  { id: "60853", name: "Alamo Drafthouse Downtown Brooklyn" },
  { id: "67766", name: "Alamo Drafthouse Lower Manhattan" },
  { id: "67768", name: "Alamo Drafthouse Staten Island" },
  { id: "56432", name: "Angelika Film Center & Café" },
  { id: "41518", name: "Anthology" },
  { id: "65749", name: "Brooklyn Academy of Music Rose Cinemas (BAM)" },
  { id: "41550", name: "Cinema Village" },
  { id: "60749", name: "Cinema 123 by Angelika" },
  { id: "41515", name: "Film Forum" },
  { id: "66390", name: "Film at Lincoln Center - Walter Reade Theater" },
  { id: "41517", name: "IFC" },
  { id: "65751", name: "Metrograph" },
  { id: "65753", name: "Nitehawk Williamsburg" },
  { id: "65752", name: "Nitehawk Prospect Park" },
  { id: "60750", name: "Paris Theatre New York" },
  { id: "65750", name: "Quad Cinema" },
  { id: "65747", name: "Roxy" },
  { id: "65900", name: "Syndicated" },
  { id: "41535", name: "Village East by Angelika" },
  { id: "65959", name: "Museum of the Moving Image" }
].sort((a, b) => a.name.localeCompare(b.name));

export const THEATER_LOCATIONS = {
  // Brooklyn
  "60853": "Brooklyn", // Alamo Drafthouse Downtown Brooklyn
  "65749": "Brooklyn", // BAM Rose Cinemas
  "65752": "Brooklyn", // Nitehawk Prospect Park
  "65753": "Brooklyn", // Nitehawk Williamsburg
  "65900": "Brooklyn", // Syndicated
  
  // Keep the existing theater IDs and add their locations
  "67766": "Lower Manhattan", // Alamo Drafthouse Lower Manhattan
  "67768": "Staten Island", // Alamo Drafthouse Staten Island
  "56432": "Lower Manhattan", // Angelika Film Center & Café
  "41518": "Lower Manhattan", // Anthology
  "41550": "Lower Manhattan", // Cinema Village
  "60749": "Upper Manhattan", // Cinema 123 by Angelika
  "41515": "Lower Manhattan", // Film Forum
  "66390": "Upper Manhattan", // Film at Lincoln Center
  "41517": "Lower Manhattan", // IFC
  "65751": "Lower Manhattan", // Metrograph
  "65959": "Queens", // Museum of the Moving Image
  "60750": "Midtown Manhattan", // Paris Theatre
  "65750": "Lower Manhattan", // Quad Cinema
  "65747": "Lower Manhattan", // Roxy
  "41535": "Lower Manhattan", // Village East by Angelika
};

export const LOCATIONS = [
  "The Bronx",
  "Brooklyn",
  "Queens",
  "Staten Island",
  "Lower Manhattan",
  "Midtown Manhattan",
  "Upper Manhattan"
];

// List of theater IDs that return titles in all caps
export const UPPERCASE_THEATER_IDS = [
  "56432",  // Angelika Film Center
  "41535",  // Village East by Angelika
  "41518",  // Anthology
  "41515",   // Film Forum
  "60749"   // Cinema 123 by Angelika
];

export const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const BATCH_SIZE = 25;


// export const DEBUG = false; // Set to false by default
// export const MONTHS_TO_FETCH = 3; // Reduce from 12 to 3 months
// export const INITIAL_DAYS_TO_SHOW = 30;