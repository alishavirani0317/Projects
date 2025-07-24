//separate file for all api calls

const API_KEY = "41cd61d216f257268cfea8c4bdf9b80e";
const BASE_URL = "https://api.themoviedb.org/3";

//most popular movies

export const getPopularMovies = async () => {
    //request in here
    // use fetch function to send network request
    const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`);
    const data = await response.json()
    return data.results
};

export const searchMovies = async (query) => {
    const response = await fetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
        query
      )}`
    );
    const data = await response.json();
    return data.results;
  };